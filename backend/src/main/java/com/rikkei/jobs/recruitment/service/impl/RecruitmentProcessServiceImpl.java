package com.rikkei.jobs.recruitment.service.impl;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.company.model.Company;
import com.rikkei.jobs.company.repository.CompanyRepository;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.recruitment.dto.ApplicationProcessDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationStatusHistoryResponse;
import com.rikkei.jobs.recruitment.dto.CreateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.dto.InterviewRoundResponse;
import com.rikkei.jobs.recruitment.dto.StaffApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.TransitionApplicationRequest;
import com.rikkei.jobs.recruitment.dto.UpdateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.exception.InterviewRoundNotFoundException;
import com.rikkei.jobs.recruitment.exception.InvalidTransitionException;
import com.rikkei.jobs.recruitment.exception.RecruitmentAccessDeniedException;
import com.rikkei.jobs.recruitment.integration.CandidateTransitionNotificationEvent;
import com.rikkei.jobs.recruitment.integration.JobSummaryDto;
import com.rikkei.jobs.recruitment.integration.JobVerificationClient;
import com.rikkei.jobs.recruitment.integration.MatchScoreCalculator;
import com.rikkei.jobs.recruitment.model.Application;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.model.ApplicationStatusHistory;
import com.rikkei.jobs.recruitment.model.ApplicationStatusTransitionMatrix;
import com.rikkei.jobs.recruitment.model.InterviewResult;
import com.rikkei.jobs.recruitment.model.InterviewRound;
import com.rikkei.jobs.recruitment.repository.ApplicationRepository;
import com.rikkei.jobs.recruitment.repository.ApplicationStatusHistoryRepository;
import com.rikkei.jobs.recruitment.repository.InterviewRoundRepository;
import com.rikkei.jobs.recruitment.service.RecruitmentProcessService;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Implementation of RecruitmentProcessService for managing recruitment workflows (UT-02). */
@Service
@Transactional
public class RecruitmentProcessServiceImpl implements RecruitmentProcessService {

    private final ApplicationRepository applicationRepository;
    private final InterviewRoundRepository interviewRoundRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final JobVerificationClient jobVerificationClient;
    private final MatchScoreCalculator matchScoreCalculator;
    private final ApplicationEventPublisher eventPublisher;

    public RecruitmentProcessServiceImpl(
            ApplicationRepository applicationRepository,
            InterviewRoundRepository interviewRoundRepository,
            ApplicationStatusHistoryRepository historyRepository,
            UserRepository userRepository,
            CompanyRepository companyRepository,
            JobVerificationClient jobVerificationClient,
            MatchScoreCalculator matchScoreCalculator,
            ApplicationEventPublisher eventPublisher) {
        this.applicationRepository = applicationRepository;
        this.interviewRoundRepository = interviewRoundRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.jobVerificationClient = jobVerificationClient;
        this.matchScoreCalculator = matchScoreCalculator;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional(readOnly = true)
    public ApplicationProcessDetailResponse getApplicationDetail(
            Long applicationId, Long actorUserId, boolean isStaff) {
        Application app = findApplication(applicationId);

        if (!isStaff) {
            verifyHrOwnership(app.getJobId(), actorUserId);
        }

        return buildDetailResponse(app);
    }

    @Override
    public ApplicationProcessDetailResponse transitionStatus(
            Long applicationId, Long hrUserId, TransitionApplicationRequest request) {
        Application app = findApplication(applicationId);
        verifyHrOwnership(app.getJobId(), hrUserId);

        ApplicationStatus fromStatus = app.getStatus();
        ApplicationStatus toStatus = request.toStatus();

        if (!ApplicationStatusTransitionMatrix.isValidTransition(fromStatus, toStatus)) {
            throw new InvalidTransitionException(fromStatus, toStatus);
        }

        app.setStatus(toStatus);
        Application saved = applicationRepository.save(app);

        ApplicationStatusHistory history =
                new ApplicationStatusHistory(
                        saved.getId(), fromStatus, toStatus, hrUserId, request.note());
        historyRepository.save(history);

        JobSummaryDto job = jobVerificationClient.getJobSummary(saved.getJobId());
        User candidate = userRepository.findById(saved.getUserId()).orElse(null);
        String candidateEmail = candidate != null ? candidate.getEmail() : null;
        String candidateName = candidate != null ? candidate.getFullName() : null;

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
                        request.note()));

        return buildDetailResponse(saved);
    }

    @Override
    public InterviewRoundResponse addInterviewRound(
            Long applicationId, Long hrUserId, CreateInterviewRoundRequest request) {
        Application app = findApplication(applicationId);
        verifyHrOwnership(app.getJobId(), hrUserId);

        int currentCount = interviewRoundRepository.countByApplicationId(applicationId);
        int nextRoundNo = currentCount + 1;

        InterviewRound round =
                new InterviewRound(
                        applicationId,
                        nextRoundNo,
                        request.name().trim(),
                        request.interviewerEmail().trim(),
                        request.scheduledAt());

        InterviewRound saved = interviewRoundRepository.save(round);
        return toRoundResponse(saved);
    }

    @Override
    public InterviewRoundResponse updateInterviewRound(
            Long applicationId, Long roundId, Long hrUserId, UpdateInterviewRoundRequest request) {
        Application app = findApplication(applicationId);
        verifyHrOwnership(app.getJobId(), hrUserId);

        InterviewRound round =
                interviewRoundRepository
                        .findByIdAndApplicationId(roundId, applicationId)
                        .orElseThrow(
                                () -> new InterviewRoundNotFoundException(roundId, applicationId));

        round.setResult(request.result());
        round.setScore(request.score());
        round.setNote(request.note() != null ? request.note().trim() : null);

        InterviewRound saved = interviewRoundRepository.save(round);
        return toRoundResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StaffApplicationSummaryResponse> getStaffApplications(
            Long companyId, Long jobId, ApplicationStatus status, int page, int size) {
        String statusStr = status != null ? status.name() : null;
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Application> applications =
                applicationRepository.findForStaff(companyId, jobId, statusStr, pageRequest);

        List<StaffApplicationSummaryResponse> items =
                applications.getContent().stream().map(this::toSummaryResponse).toList();

        return new PageResponse<>(
                items, page, size, applications.getTotalElements(), applications.getTotalPages());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StaffApplicationSummaryResponse> getHrCompanyApplications(
            Long hrUserId, Long jobId, ApplicationStatus status, int page, int size) {
        Company company =
                companyRepository
                        .findByHrOwnerUserId(hrUserId)
                        .orElseThrow(
                                () ->
                                        new RecruitmentAccessDeniedException(
                                                "Không tìm thấy công ty do tài khoản HR này quản lý."));

        String statusStr = status != null ? status.name() : null;
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Application> applications =
                applicationRepository.findForHrCompany(
                        company.getId(), jobId, statusStr, pageRequest);

        List<StaffApplicationSummaryResponse> items =
                applications.getContent().stream().map(this::toSummaryResponse).toList();

        return new PageResponse<>(
                items, page, size, applications.getTotalElements(), applications.getTotalPages());
    }

    private Application findApplication(Long applicationId) {
        return applicationRepository
                .findById(applicationId)
                .orElseThrow(
                        () ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy đơn ứng tuyển với ID: " + applicationId));
    }

    private void verifyHrOwnership(Long jobId, Long hrUserId) {
        if (!jobVerificationClient.isOwnedByHr(jobId, hrUserId)) {
            throw new RecruitmentAccessDeniedException(
                    "Bạn chỉ có quyền thao tác trên đơn ứng tuyển thuộc các tin tuyển dụng của công ty bạn.");
        }
    }

    private ApplicationProcessDetailResponse buildDetailResponse(Application app) {
        JobSummaryDto job = jobVerificationClient.getJobSummary(app.getJobId());
        User candidate = userRepository.findById(app.getUserId()).orElse(null);
        String candidateEmail = candidate != null ? candidate.getEmail() : "";
        String candidateName = candidate != null ? candidate.getFullName() : "";

        List<InterviewRound> roundEntities =
                interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(app.getId());
        List<InterviewRoundResponse> rounds =
                roundEntities.stream().map(this::toRoundResponse).toList();

        List<ApplicationStatusHistoryResponse> histories =
                historyRepository.findByApplicationIdOrderByCreatedAtAsc(app.getId()).stream()
                        .map(this::toHistoryResponse)
                        .toList();

        boolean canSendOffer = evaluateCanSendOffer(app.getStatus(), roundEntities);
        Set<ApplicationStatus> allowedTransitions =
                ApplicationStatusTransitionMatrix.getAllowedNextStatuses(app.getStatus());
        int matchScore = matchScoreCalculator.calculateMatchScore(app.getJobId(), app.getUserId());

        Long companyId = null;
        try {
            var jobDetails = jobVerificationClient.getJobSummary(app.getJobId());
            var comp = companyRepository.findByName(jobDetails.companyName());
            if (comp.isPresent()) {
                companyId = comp.get().getId();
            }
        } catch (Exception ignored) {
        }

        return new ApplicationProcessDetailResponse(
                app.getId(),
                app.getJobId(),
                job.title(),
                companyId,
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

    private boolean evaluateCanSendOffer(ApplicationStatus status, List<InterviewRound> rounds) {
        if (status != ApplicationStatus.INTERVIEW) {
            return false;
        }
        if (rounds == null || rounds.isEmpty()) {
            return false;
        }
        boolean anyPending =
                rounds.stream().anyMatch(r -> r.getResult() == InterviewResult.PENDING);
        if (anyPending) {
            return false;
        }
        InterviewRound lastRound =
                rounds.stream()
                        .max(Comparator.comparingInt(InterviewRound::getRoundNo))
                        .orElse(null);
        return lastRound != null && lastRound.getResult() == InterviewResult.PASS;
    }

    private StaffApplicationSummaryResponse toSummaryResponse(Application app) {
        JobSummaryDto job = jobVerificationClient.getJobSummary(app.getJobId());
        User candidate = userRepository.findById(app.getUserId()).orElse(null);
        String candidateEmail = candidate != null ? candidate.getEmail() : "";
        String candidateName = candidate != null ? candidate.getFullName() : "";

        int roundCount = interviewRoundRepository.countByApplicationId(app.getId());
        int matchScore = matchScoreCalculator.calculateMatchScore(app.getJobId(), app.getUserId());

        Long companyId = null;
        try {
            var comp = companyRepository.findByName(job.companyName());
            if (comp.isPresent()) {
                companyId = comp.get().getId();
            }
        } catch (Exception ignored) {
        }

        return new StaffApplicationSummaryResponse(
                app.getId(),
                app.getJobId(),
                job.title(),
                companyId,
                job.companyName(),
                app.getUserId(),
                candidateName,
                candidateEmail,
                app.getStatus(),
                roundCount,
                matchScore,
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
