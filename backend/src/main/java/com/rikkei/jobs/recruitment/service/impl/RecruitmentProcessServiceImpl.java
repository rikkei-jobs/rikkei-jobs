package com.rikkei.jobs.recruitment.service.impl;

import com.rikkei.jobs.candidate.dto.CandidateSkillScoreDto;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.common.security.OwnershipGuard;
import com.rikkei.jobs.company.dto.JobSkillRequirementDto;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.identity.dto.UserSummaryDto;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import com.rikkei.jobs.recruitment.dto.ApplicationProcessDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationStatusHistoryResponse;
import com.rikkei.jobs.recruitment.dto.CreateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.InterviewRoundResponse;
import com.rikkei.jobs.recruitment.dto.StaffApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.TransitionApplicationRequest;
import com.rikkei.jobs.recruitment.dto.UpdateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.exception.InterviewRoundNotFoundException;
import com.rikkei.jobs.recruitment.exception.InvalidApplicationStateException;
import com.rikkei.jobs.recruitment.exception.InvalidTransitionException;
import com.rikkei.jobs.recruitment.integration.CandidateTransitionNotificationEvent;
import com.rikkei.jobs.recruitment.integration.CvSnapshotService;
import com.rikkei.jobs.recruitment.integration.JobSummaryDto;
import com.rikkei.jobs.recruitment.integration.JobVerificationClient;
import com.rikkei.jobs.recruitment.integration.MatchScoreCalculator;
import com.rikkei.jobs.recruitment.model.Application;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.model.ApplicationStatusHistory;
import com.rikkei.jobs.recruitment.model.InterviewResult;
import com.rikkei.jobs.recruitment.model.InterviewRound;
import com.rikkei.jobs.recruitment.repository.ApplicationRepository;
import com.rikkei.jobs.recruitment.repository.ApplicationStatusHistoryRepository;
import com.rikkei.jobs.recruitment.repository.InterviewRoundRepository;
import com.rikkei.jobs.recruitment.repository.InterviewRoundRepository.RoundCountProjection;
import com.rikkei.jobs.recruitment.service.RecruitmentProcessService;
import jakarta.persistence.criteria.Predicate;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of {@link RecruitmentProcessService} enforcing Rule 14 module boundaries, {@link
 * OwnershipGuard} 404 anti-IDOR protection, pessimistic locking for monotonic round numbers,
 * optimistic locking for concurrent updates, O(1) batch hydration, and post-commit candidate mail
 * events.
 */
@Service
@Transactional(readOnly = true)
public class RecruitmentProcessServiceImpl implements RecruitmentProcessService {

    private static final String APPLICATION_NOT_FOUND_MESSAGE = "Không tìm thấy đơn ứng tuyển.";
    private static final int MIN_PAGE = 1;
    private static final int MIN_PAGE_SIZE = 1;
    private static final int MAX_PAGE_SIZE = 100;
    private static final Sort DEFAULT_APPLICATION_SORT =
            Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));

    private final ApplicationRepository applicationRepository;
    private final InterviewRoundRepository interviewRoundRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final JobVerificationClient jobVerificationClient;
    private final IdentityPublicService identityPublicService;
    private final CandidatePublicService candidatePublicService;
    private final CvSnapshotService cvSnapshotService;
    private final MatchScoreCalculator matchScoreCalculator;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    public RecruitmentProcessServiceImpl(
            ApplicationRepository applicationRepository,
            InterviewRoundRepository interviewRoundRepository,
            ApplicationStatusHistoryRepository historyRepository,
            JobVerificationClient jobVerificationClient,
            IdentityPublicService identityPublicService,
            CandidatePublicService candidatePublicService,
            CvSnapshotService cvSnapshotService,
            MatchScoreCalculator matchScoreCalculator,
            ApplicationEventPublisher eventPublisher,
            Clock clock) {
        this.applicationRepository = applicationRepository;
        this.interviewRoundRepository = interviewRoundRepository;
        this.historyRepository = historyRepository;
        this.jobVerificationClient = jobVerificationClient;
        this.identityPublicService = identityPublicService;
        this.candidatePublicService = candidatePublicService;
        this.cvSnapshotService = cvSnapshotService;
        this.matchScoreCalculator = matchScoreCalculator;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
    }

    @Override
    public ApplicationProcessDetailResponse getApplicationDetail(
            Long applicationId, UserPrincipal principal) {
        Application app = findApplicationOrThrow(applicationId);
        JobSummaryDto job = jobVerificationClient.getJobSummary(app.getJobId());
        OwnershipGuard.requireCompanyAccess(
                principal, job.companyId(), APPLICATION_NOT_FOUND_MESSAGE);
        return buildDetailResponse(app, job);
    }

    @Override
    public CvSnapshotDownload getApplicationCvSnapshot(
            Long applicationId, UserPrincipal principal) {
        Application app = findApplicationOrThrow(applicationId);
        JobSummaryDto job = jobVerificationClient.getJobSummary(app.getJobId());
        OwnershipGuard.requireCompanyAccess(
                principal, job.companyId(), APPLICATION_NOT_FOUND_MESSAGE);
        return cvSnapshotService.getSnapshot(applicationId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApplicationProcessDetailResponse transitionStatus(
            Long applicationId, UserPrincipal principal, TransitionApplicationRequest request) {
        Application app = findApplicationOrThrow(applicationId);
        JobSummaryDto job = jobVerificationClient.getJobSummary(app.getJobId());
        requireHrCompanyAccess(principal, job.companyId());

        ApplicationStatus fromStatus = app.getStatus();
        ApplicationStatus toStatus = request.toStatus();

        if (!fromStatus.canTransitionInUt02(toStatus)) {
            throw new InvalidTransitionException(fromStatus, toStatus);
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        app.setStatus(toStatus);
        app.setUpdatedAt(now);
        Application saved = applicationRepository.saveAndFlush(app);

        String trimmedNote = request.note().trim();
        ApplicationStatusHistory history =
                new ApplicationStatusHistory(
                        saved.getId(), fromStatus, toStatus, principal.getId(), trimmedNote, now);
        historyRepository.save(history);

        UserSummaryDto candidate = identityPublicService.getUserById(saved.getUserId());
        String candidateEmail = candidate != null ? candidate.email() : null;
        String candidateName = candidate != null ? candidate.fullName() : null;

        eventPublisher.publishEvent(
                new CandidateTransitionNotificationEvent(
                        saved.getId(),
                        saved.getUserId(),
                        candidateEmail,
                        candidateName,
                        job.title(),
                        job.companyName(),
                        fromStatus,
                        toStatus,
                        trimmedNote));

        return buildDetailResponse(saved, job);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public InterviewRoundResponse addInterviewRound(
            Long applicationId, UserPrincipal principal, CreateInterviewRoundRequest request) {
        Application app = findApplicationForUpdateOrThrow(applicationId);
        JobSummaryDto job = jobVerificationClient.getJobSummary(app.getJobId());
        requireHrCompanyAccess(principal, job.companyId());

        if (app.getStatus() != ApplicationStatus.SCREENING
                && app.getStatus() != ApplicationStatus.INTERVIEW) {
            throw new InvalidApplicationStateException(
                    "INVALID_APPLICATION_STATE",
                    String.format(
                            "Chỉ có thể thêm vòng phỏng vấn khi hồ sơ đang ở trạng thái SCREENING hoặc INTERVIEW (hiện tại: %s).",
                            app.getStatus()));
        }

        int nextRoundNo = interviewRoundRepository.findMaxRoundNoByApplicationId(applicationId) + 1;
        OffsetDateTime now = OffsetDateTime.now(clock);
        InterviewRound round =
                new InterviewRound(
                        applicationId,
                        nextRoundNo,
                        request.name().trim(),
                        request.interviewerEmail().trim(),
                        request.scheduledAt(),
                        now,
                        now);

        InterviewRound saved = interviewRoundRepository.saveAndFlush(round);
        return toRoundResponse(saved);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public InterviewRoundResponse updateInterviewRound(
            Long applicationId,
            Long roundId,
            UserPrincipal principal,
            UpdateInterviewRoundRequest request) {
        Application app = findApplicationForUpdateOrThrow(applicationId);
        JobSummaryDto job = jobVerificationClient.getJobSummary(app.getJobId());
        requireHrCompanyAccess(principal, job.companyId());

        if (app.getStatus() != ApplicationStatus.INTERVIEW) {
            throw new InvalidApplicationStateException(
                    "INVALID_APPLICATION_STATE",
                    String.format(
                            "Chỉ có thể cập nhật kết quả vòng phỏng vấn khi hồ sơ đang ở trạng thái INTERVIEW (hiện tại: %s).",
                            app.getStatus()));
        }

        InterviewRound round =
                interviewRoundRepository
                        .findByIdAndApplicationId(roundId, applicationId)
                        .orElseThrow(
                                () -> new InterviewRoundNotFoundException(roundId, applicationId));

        if (!Objects.equals(request.version(), round.getVersion())) {
            throw new ConflictException(
                    "CONFLICT",
                    "Dữ liệu vòng phỏng vấn đã được cập nhật bởi một phiên thao tác khác, vui lòng tải lại trang");
        }

        round.setResult(request.result());
        round.setScore(request.score());
        round.setNote(request.note() != null ? request.note().trim() : null);
        round.setUpdatedAt(OffsetDateTime.now(clock));

        InterviewRound saved = interviewRoundRepository.saveAndFlush(round);
        return toRoundResponse(saved);
    }

    @Override
    public boolean isOfferAllowed(Long applicationId) {
        Application app = findApplicationOrThrow(applicationId);
        List<InterviewRound> rounds =
                interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(applicationId);
        return evaluateCanSendOffer(app.getStatus(), rounds);
    }

    @Override
    public PageResponse<StaffApplicationSummaryResponse> getStaffApplications(
            Long companyId, Long jobId, ApplicationStatus status, int page, int size) {
        validatePagination(page, size);

        Set<Long> companyJobIds = null;
        if (companyId != null) {
            if (jobId != null) {
                if (!jobVerificationClient.isOwnedByCompany(jobId, companyId)) {
                    return new PageResponse<>(List.of(), page, size, 0L, 0);
                }
            } else {
                companyJobIds = jobVerificationClient.findJobIdsByCompanyId(companyId);
                if (companyJobIds.isEmpty()) {
                    return new PageResponse<>(List.of(), page, size, 0L, 0);
                }
            }
        }

        Specification<Application> spec = buildStaffFilterSpec(jobId, companyJobIds, status);
        PageRequest pageable = PageRequest.of(page - 1, size, DEFAULT_APPLICATION_SORT);
        Page<Application> applications = applicationRepository.findAll(spec, pageable);

        List<Application> content = applications.getContent();
        if (content.isEmpty()) {
            return new PageResponse<>(
                    List.of(),
                    page,
                    size,
                    applications.getTotalElements(),
                    applications.getTotalPages());
        }

        Set<Long> appIds = content.stream().map(Application::getId).collect(Collectors.toSet());
        Set<Long> jobIds = content.stream().map(Application::getJobId).collect(Collectors.toSet());
        Set<Long> userIds =
                content.stream().map(Application::getUserId).collect(Collectors.toSet());

        Map<Long, Integer> roundCounts =
                interviewRoundRepository.countByApplicationIds(appIds).stream()
                        .collect(
                                Collectors.toMap(
                                        RoundCountProjection::getApplicationId,
                                        proj -> Math.toIntExact(proj.getRoundCount()),
                                        Integer::sum));
        Map<Long, JobSummaryDto> jobsById = jobVerificationClient.getJobSummaries(jobIds);
        Map<Long, List<JobSkillRequirementDto>> jobSkillsByJobId =
                jobVerificationClient.getJobRequiredSkillsByJobIds(jobIds);
        Map<Long, UserSummaryDto> usersById = identityPublicService.getUsersByIds(userIds);
        Map<Long, List<CandidateSkillScoreDto>> candidateScoresByUserId =
                candidatePublicService.getVerifiedSkillScoresByUserIds(userIds);

        List<StaffApplicationSummaryResponse> items =
                content.stream()
                        .map(
                                app -> {
                                    JobSummaryDto job = jobsById.get(app.getJobId());
                                    UserSummaryDto candidate = usersById.get(app.getUserId());
                                    String jobTitle =
                                            job != null ? job.title() : "Vị trí tuyển dụng";
                                    Long resolvedCompanyId = job != null ? job.companyId() : null;
                                    String companyName = job != null ? job.companyName() : "";
                                    String candidateName =
                                            candidate != null && candidate.fullName() != null
                                                    ? candidate.fullName()
                                                    : "";
                                    String candidateEmail =
                                            candidate != null && candidate.email() != null
                                                    ? candidate.email()
                                                    : "";
                                    int roundCount = roundCounts.getOrDefault(app.getId(), 0);
                                    int matchScore =
                                            matchScoreCalculator.calculateMatchScore(
                                                    jobSkillsByJobId.getOrDefault(
                                                            app.getJobId(), List.of()),
                                                    candidateScoresByUserId.getOrDefault(
                                                            app.getUserId(), List.of()));
                                    return new StaffApplicationSummaryResponse(
                                            app.getId(),
                                            app.getJobId(),
                                            jobTitle,
                                            resolvedCompanyId,
                                            companyName,
                                            app.getUserId(),
                                            candidateName,
                                            candidateEmail,
                                            app.getStatus(),
                                            roundCount,
                                            matchScore,
                                            app.getCreatedAt(),
                                            app.getUpdatedAt());
                                })
                        .toList();

        return new PageResponse<>(
                items, page, size, applications.getTotalElements(), applications.getTotalPages());
    }

    static boolean evaluateCanSendOffer(ApplicationStatus status, List<InterviewRound> rounds) {
        if (status != ApplicationStatus.INTERVIEW) {
            return false;
        }
        if (rounds == null || rounds.isEmpty()) {
            return false;
        }
        boolean anyPending =
                rounds.stream()
                        .anyMatch(
                                r ->
                                        r.getResult() == null
                                                || r.getResult() == InterviewResult.PENDING);
        if (anyPending) {
            return false;
        }
        InterviewRound lastRound =
                rounds.stream()
                        .max(Comparator.comparingInt(InterviewRound::getRoundNo))
                        .orElse(null);
        return lastRound != null && lastRound.getResult() == InterviewResult.PASS;
    }

    private Application findApplicationOrThrow(Long applicationId) {
        if (applicationId == null || applicationId <= 0) {
            throw new ResourceNotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
        }
        return applicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException(APPLICATION_NOT_FOUND_MESSAGE));
    }

    private Application findApplicationForUpdateOrThrow(Long applicationId) {
        if (applicationId == null || applicationId <= 0) {
            throw new ResourceNotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
        }
        return applicationRepository
                .findByIdForUpdate(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException(APPLICATION_NOT_FOUND_MESSAGE));
    }

    private void requireHrCompanyAccess(UserPrincipal principal, Long targetCompanyId) {
        if (principal == null || !OwnershipGuard.hasRole(principal, OwnershipGuard.ROLE_HR)) {
            throw new ResourceNotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
        }
        OwnershipGuard.requireCompanyAccess(
                principal, targetCompanyId, APPLICATION_NOT_FOUND_MESSAGE);
    }

    private static void validatePagination(int page, int size) {
        if (page < MIN_PAGE || size < MIN_PAGE_SIZE || size > MAX_PAGE_SIZE) {
            throw new ValidationException(
                    "Tham số phân trang không hợp lệ (page >= 1, 1 <= size <= 100)");
        }
    }

    private static Specification<Application> buildStaffFilterSpec(
            Long jobId, Set<Long> companyJobIds, ApplicationStatus status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (jobId != null) {
                predicates.add(cb.equal(root.get("jobId"), jobId));
            } else if (companyJobIds != null) {
                predicates.add(root.get("jobId").in(companyJobIds));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private ApplicationProcessDetailResponse buildDetailResponse(
            Application app, JobSummaryDto job) {
        UserSummaryDto candidate = identityPublicService.getUserById(app.getUserId());
        String candidateName =
                candidate != null && candidate.fullName() != null ? candidate.fullName() : "";
        String candidateEmail =
                candidate != null && candidate.email() != null ? candidate.email() : "";

        List<InterviewRound> roundEntities =
                interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(app.getId());
        List<InterviewRoundResponse> rounds =
                roundEntities.stream().map(this::toRoundResponse).toList();

        List<ApplicationStatusHistoryResponse> histories =
                historyRepository.findByApplicationIdOrderByCreatedAtAscIdAsc(app.getId()).stream()
                        .map(this::toHistoryResponse)
                        .toList();

        boolean canSendOffer = evaluateCanSendOffer(app.getStatus(), roundEntities);
        Set<ApplicationStatus> allowedTransitions = app.getStatus().allowedUt02Transitions();
        int matchScore = matchScoreCalculator.calculateMatchScore(app.getJobId(), app.getUserId());

        return new ApplicationProcessDetailResponse(
                app.getId(),
                app.getJobId(),
                job.title(),
                job.companyId(),
                job.companyName(),
                app.getUserId(),
                candidateName,
                candidateEmail,
                app.getCvId(),
                app.getCvSnapshotUrl(),
                app.getCoverLetter(),
                app.getStatus(),
                matchScore,
                app.getStatus().canWithdraw(),
                canSendOffer,
                allowedTransitions,
                rounds,
                histories,
                app.getCreatedAt(),
                app.getUpdatedAt());
    }

    private InterviewRoundResponse toRoundResponse(InterviewRound round) {
        return new InterviewRoundResponse(
                round.getId(),
                round.getApplicationId(),
                round.getRoundNo(),
                round.getName(),
                round.getInterviewerEmail(),
                round.getScheduledAt(),
                round.getResult(),
                round.getScore(),
                round.getNote(),
                round.getVersion(),
                round.getCreatedAt(),
                round.getUpdatedAt());
    }

    private ApplicationStatusHistoryResponse toHistoryResponse(ApplicationStatusHistory h) {
        return new ApplicationStatusHistoryResponse(
                h.getId(),
                h.getFromStatus(),
                h.getToStatus(),
                h.getActorId(),
                h.getNote(),
                h.getCreatedAt());
    }
}
