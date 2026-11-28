package com.rikkei.jobs.candidate.service.impl;

import com.rikkei.jobs.assessment.dto.SkillDto;
import com.rikkei.jobs.assessment.service.SkillCatalogService;
import com.rikkei.jobs.candidate.dto.CandidateSkillScoreDto;
import com.rikkei.jobs.candidate.dto.MentorSkillEvidenceDto;
import com.rikkei.jobs.candidate.dto.PmInternshipResultCommand;
import com.rikkei.jobs.candidate.model.EvidenceSource;
import com.rikkei.jobs.candidate.model.SkillEvidence;
import com.rikkei.jobs.candidate.model.SkillScore;
import com.rikkei.jobs.candidate.repository.CandidateProfileRepository;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import com.rikkei.jobs.candidate.repository.SkillScoreRepository;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.candidate.service.CandidateSkillLockService;
import com.rikkei.jobs.candidate.service.ExternalRecordNormalizer;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import com.rikkei.jobs.common.exception.ValidationException;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Implementation of CandidatePublicService for cross-module boundary compliance (Rule 14). */
@Service
public class CandidatePublicServiceImpl implements CandidatePublicService {

    private static final Logger log = LoggerFactory.getLogger(CandidatePublicServiceImpl.class);

    private final SkillEvidenceRepository skillEvidenceRepository;
    private final SkillRecomputeService skillRecomputeService;
    private final CandidateProfileRepository candidateProfileRepository;
    private final SkillScoreRepository skillScoreRepository;
    private final SkillCatalogService skillCatalogService;
    private final Clock clock;
    private final CandidateSkillLockService candidateSkillLockService;
    private final ExternalRecordNormalizer externalRecordNormalizer;

    public CandidatePublicServiceImpl(
            SkillEvidenceRepository skillEvidenceRepository,
            SkillRecomputeService skillRecomputeService,
            CandidateProfileRepository candidateProfileRepository,
            SkillScoreRepository skillScoreRepository,
            SkillCatalogService skillCatalogService,
            Clock clock,
            CandidateSkillLockService candidateSkillLockService,
            ExternalRecordNormalizer externalRecordNormalizer) {
        this.skillEvidenceRepository = skillEvidenceRepository;
        this.skillRecomputeService = skillRecomputeService;
        this.candidateProfileRepository = candidateProfileRepository;
        this.skillScoreRepository = skillScoreRepository;
        this.skillCatalogService = skillCatalogService;
        this.clock = clock;
        this.candidateSkillLockService = candidateSkillLockService;
        this.externalRecordNormalizer = externalRecordNormalizer;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void acquireCandidateSkillLock(Long candidateUserId) {
        candidateSkillLockService.acquireUserLock(candidateUserId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recordMentorEvidences(
            Long candidateUserId, List<MentorSkillEvidenceDto> evidences) {
        if (evidences == null || evidences.isEmpty()) {
            return;
        }
        candidateSkillLockService.acquireUserLock(candidateUserId);

        List<SkillEvidence> entities =
                evidences.stream()
                        .map(
                                dto ->
                                        new SkillEvidence(
                                                candidateUserId,
                                                dto.skillId(),
                                                EvidenceSource.MENTOR,
                                                dto.evaluationId() != null
                                                        ? dto.evaluationId().toString()
                                                        : null,
                                                dto.title(),
                                                dto.score(),
                                                dto.weight(),
                                                dto.recordedAt(),
                                                true))
                        .toList();

        skillEvidenceRepository.saveAll(entities);
    }

    /**
     * Records PM external records idempotently by {@code (candidateUserId, ExternalSource.PM,
     * batchId)} using the unified D3 normalizer (preserving manual overrides, computing {@code
     * recordedAt} from {@code endDate} at 00:00 {@code Asia/Ho_Chi_Minh} or preserving {@code
     * recordedAt} when {@code endDate} is absent and effective score is unchanged, and pruning
     * excess duplicate PM rows of the same {@code (userId, batchId)}) and recomputes verified
     * skills when the record is inserted, updated, or deduplicated. Previously synced batches
     * omitted from {@code results} are retained locally rather than deleted.
     *
     * <p><b>Skip invariant:</b> When a single matching canonical {@link
     * com.rikkei.jobs.candidate.model.ExternalRecord} already exists with identical effective
     * {@code title}, effective scaled {@code score}, effective {@code recordedAt}, and (when
     * provided) {@code payload}, both the {@code external_records} write and {@link
     * SkillRecomputeService#recomputeSkills} are skipped.
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recordPmInternshipResults(
            Long candidateUserId, List<PmInternshipResultCommand> results) {
        if (candidateUserId == null || candidateUserId <= 0) {
            throw new ValidationException("User ID không hợp lệ");
        }
        if (results == null || results.isEmpty()) {
            return;
        }

        candidateSkillLockService.acquireUserLock(candidateUserId);

        OffsetDateTime now = OffsetDateTime.now(clock);
        ExternalRecordNormalizer.PmUpsertOutcome outcome =
                externalRecordNormalizer.upsertPmCommands(
                        candidateUserId, results, now, true, log::warn);

        if (outcome.anyChanged()) {
            skillRecomputeService.recomputeSkills(candidateUserId);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recomputeCandidateSkills(Long candidateUserId) {
        skillRecomputeService.recomputeSkills(candidateUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isProfilePublic(Long candidateUserId) {
        return candidateProfileRepository.existsByUserIdAndPublicProfileTrue(candidateUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateSkillScoreDto> getVerifiedSkillScores(Long candidateUserId) {
        List<SkillScore> scores =
                skillScoreRepository.findByUserId(candidateUserId).stream()
                        .filter(score -> score.getVerifiedScore() != null)
                        .toList();
        if (scores.isEmpty()) {
            return List.of();
        }

        Map<Integer, SkillDto> catalogue =
                skillCatalogService.findByIds(scores.stream().map(SkillScore::getSkillId).toList());

        return scores.stream()
                .map(score -> toCandidateSkillScoreDto(score, catalogue))
                .filter(Objects::nonNull)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, List<CandidateSkillScoreDto>> getVerifiedSkillScoresByUserIds(
            Set<Long> candidateUserIds) {
        if (candidateUserIds == null || candidateUserIds.isEmpty()) {
            return Map.of();
        }
        List<SkillScore> scores =
                skillScoreRepository.findByUserIdIn(candidateUserIds).stream()
                        .filter(score -> score.getVerifiedScore() != null)
                        .toList();
        if (scores.isEmpty()) {
            return Map.of();
        }

        Map<Integer, SkillDto> catalogue =
                skillCatalogService.findByIds(
                        scores.stream().map(SkillScore::getSkillId).distinct().toList());

        return scores.stream()
                .collect(
                        Collectors.groupingBy(
                                SkillScore::getUserId,
                                Collectors.collectingAndThen(
                                        Collectors.toList(),
                                        userScores ->
                                                userScores.stream()
                                                        .map(
                                                                s ->
                                                                        toCandidateSkillScoreDto(
                                                                                s, catalogue))
                                                        .filter(Objects::nonNull)
                                                        .toList())));
    }

    private static CandidateSkillScoreDto toCandidateSkillScoreDto(
            SkillScore score, Map<Integer, SkillDto> catalogue) {
        SkillDto skill = catalogue.get(score.getSkillId());
        if (skill == null) {
            return null;
        }
        int value = score.getVerifiedScore().setScale(0, RoundingMode.HALF_UP).intValue();
        return new CandidateSkillScoreDto(skill.code(), value);
    }

    @Override
    @Transactional(readOnly = true)
    public OffsetDateTime getSkillsUpdatedAt(Long candidateUserId) {
        return skillScoreRepository.findByUserId(candidateUserId).stream()
                .map(SkillScore::getUpdatedAt)
                .filter(updatedAt -> updatedAt != null)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }
}
