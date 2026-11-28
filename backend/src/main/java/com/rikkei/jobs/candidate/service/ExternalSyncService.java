package com.rikkei.jobs.candidate.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.candidate.dto.SourceSyncCounts;
import com.rikkei.jobs.candidate.dto.SyncCounts;
import com.rikkei.jobs.candidate.dto.SyncRunResponse;
import com.rikkei.jobs.candidate.model.SyncRun;
import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import com.rikkei.jobs.candidate.repository.SyncRunRepository;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.dto.CandidateSyncTargetDto;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Orchestrates NT-05 external data synchronization for a single candidate (D3, D4, D5, D6, R4).
 *
 * <p>HTTP calls to LMS, Exam, and PM execute strictly outside any database transaction. Writes run
 * inside a single transaction serialized by {@link
 * CandidateSkillLockService#acquireUserLock(Long)}.
 */
@Service
public class ExternalSyncService {

    private static final Logger log = LoggerFactory.getLogger(ExternalSyncService.class);

    private final Clock clock;
    private final IdentityPublicService identityPublicService;
    private final ExternalApiClient externalApiClient;
    private final ExternalRecordNormalizer normalizer;
    private final CandidateSkillLockService candidateSkillLockService;
    private final SkillRecomputeService skillRecomputeService;
    private final SyncRunRepository syncRunRepository;
    private final SyncRunPersistenceService syncRunPersistenceService;
    private final TransactionTemplate writeTxTemplate;
    private final ObjectMapper objectMapper;

    public ExternalSyncService(
            Clock clock,
            IdentityPublicService identityPublicService,
            ExternalApiClient externalApiClient,
            ExternalRecordNormalizer normalizer,
            CandidateSkillLockService candidateSkillLockService,
            SkillRecomputeService skillRecomputeService,
            SyncRunRepository syncRunRepository,
            SyncRunPersistenceService syncRunPersistenceService,
            PlatformTransactionManager transactionManager,
            ObjectMapper objectMapper) {
        this.clock = clock;
        this.identityPublicService = identityPublicService;
        this.externalApiClient = externalApiClient;
        this.normalizer = normalizer;
        this.candidateSkillLockService = candidateSkillLockService;
        this.skillRecomputeService = skillRecomputeService;
        this.syncRunRepository = syncRunRepository;
        this.syncRunPersistenceService = syncRunPersistenceService;
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);
        this.writeTxTemplate = template;
        this.objectMapper = objectMapper;
    }

    public SyncRunResponse syncUser(Long userId) {
        return syncUser(userId, SyncTrigger.MANUAL);
    }

    public SyncRunResponse syncUser(Long userId, SyncTrigger trigger) {
        CandidateSyncTargetDto target =
                identityPublicService
                        .findCandidateSyncTargetByUserId(userId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Không tìm thấy ứng viên"));

        String lmsUserId = target.lmsUserId();
        if (lmsUserId == null || lmsUserId.isBlank()) {
            throw new ValidationException(
                    "Ứng viên chưa được gắn mã định danh học tập LMS (lms_user_id)");
        }

        OffsetDateTime startedAt = OffsetDateTime.now(clock);

        try {
            // R4: Fetch all 3 endpoints outside any DB transaction using 5s timeout + 2 retries.
            String lmsJson = externalApiClient.getStudentLmsResults(lmsUserId);
            String examJson = externalApiClient.getStudentExamResults(lmsUserId);
            String pmJson = externalApiClient.getStudentInternships(lmsUserId);

            int lmsFetched = normalizer.countArrayElements(lmsJson, "LMS");
            int examFetched = normalizer.countArrayElements(examJson, "EXAM");
            int pmFetched = normalizer.countArrayElements(pmJson, "PM");

            List<ExternalRecordNormalizer.ParsedLmsItem> lmsItems =
                    normalizer.parseAndValidateLmsJson(lmsJson);
            List<ExternalRecordNormalizer.ParsedExamItem> examItems =
                    normalizer.parseAndValidateExamJson(examJson);
            List<ExternalRecordNormalizer.ParsedPmItem> pmItems =
                    normalizer.parseAndValidatePmJson(pmJson);

            SyncRun savedRun =
                    writeTxTemplate.execute(
                            status -> {
                                candidateSkillLockService.acquireUserLock(userId);
                                OffsetDateTime txNow = OffsetDateTime.now(clock);

                                Optional<SyncRun> latestSuccess =
                                        syncRunRepository
                                                .findTopByUserIdAndStatusOrderByStartedAtDescIdDesc(
                                                        userId, SyncStatus.SUCCESS);
                                if (latestSuccess.isPresent()
                                        && latestSuccess.get().getStartedAt().isAfter(startedAt)) {
                                    log.info(
                                            "Skipping stale sync write for userId={} startedAt={} newerSuccess={}",
                                            userId,
                                            startedAt,
                                            latestSuccess.get().getStartedAt());
                                    SyncCounts skippedCounts =
                                            new SyncCounts(
                                                    new SourceSyncCounts(lmsFetched, 0, 0, 0, 0),
                                                    new SourceSyncCounts(examFetched, 0, 0, 0, 0),
                                                    new SourceSyncCounts(pmFetched, 0, 0, 0, 0));
                                    return syncRunRepository.save(
                                            new SyncRun(
                                                    trigger,
                                                    userId,
                                                    SyncStatus.SUCCESS,
                                                    startedAt,
                                                    txNow,
                                                    null,
                                                    serializeCounts(skippedCounts)));
                                }

                                SourceSyncCounts lmsCounts =
                                        normalizer.upsertLmsItems(
                                                userId, lmsFetched, lmsItems, txNow);
                                SourceSyncCounts examCounts =
                                        normalizer.upsertExamItems(
                                                userId, examFetched, examItems, txNow);
                                SourceSyncCounts pmCounts =
                                        normalizer
                                                .upsertPmItems(userId, pmFetched, pmItems, txNow)
                                                .counts();

                                // D4: Always recompute skills on successful sync, even if
                                // unchanged.
                                skillRecomputeService.recomputeSkills(userId);

                                SyncCounts counts = new SyncCounts(lmsCounts, examCounts, pmCounts);
                                return syncRunRepository.save(
                                        new SyncRun(
                                                trigger,
                                                userId,
                                                SyncStatus.SUCCESS,
                                                startedAt,
                                                OffsetDateTime.now(clock),
                                                null,
                                                serializeCounts(counts)));
                            });

            return toResponse(savedRun, target.fullName());
        } catch (RuntimeException ex) {
            // Log original failure before recordFailure so persistence errors never suppress it.
            if (SyncFailureLogger.isExpectedSyncFailure(ex)) {
                log.warn(
                        "External sync failed: trigger={}, userId={}, error={}",
                        trigger,
                        userId,
                        SyncRunPersistenceService.sanitizeError(ex));
            } else {
                log.error(
                        "Unexpected external sync failure: trigger={}, userId={}, exceptionType={}, rootCauseType={}",
                        trigger,
                        userId,
                        ex.getClass().getName(),
                        SyncFailureLogger.rootCauseClassName(ex),
                        SyncFailureLogger.sanitizeThrowableForLog(ex));
            }

            OffsetDateTime finishedAt = OffsetDateTime.now(clock);
            SyncRun failedRun =
                    syncRunPersistenceService.recordFailure(
                            trigger, userId, startedAt, finishedAt, ex);

            if (trigger == SyncTrigger.MANUAL) {
                throw new ExternalUnavailableException(
                        "Không thể đồng bộ dữ liệu từ hệ thống ngoài: " + failedRun.getError(), ex);
            }
            return toResponse(failedRun, target.fullName());
        }
    }

    private String serializeCounts(SyncCounts counts) {
        try {
            return objectMapper.writeValueAsString(counts);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không thể tuần tự hóa số liệu đồng bộ", ex);
        }
    }

    private SyncRunResponse toResponse(SyncRun run, String candidateName) {
        SyncCounts counts = null;
        if (run.getCounts() != null && !run.getCounts().isBlank()) {
            try {
                counts = objectMapper.readValue(run.getCounts(), SyncCounts.class);
            } catch (JsonProcessingException ex) {
                log.warn("Unable to deserialize sync_runs.counts for runId={}", run.getId());
            }
        }
        return new SyncRunResponse(
                run.getId(),
                run.getTrigger(),
                run.getUserId(),
                candidateName,
                run.getStatus(),
                run.getStartedAt(),
                run.getFinishedAt(),
                run.getError(),
                counts);
    }
}
