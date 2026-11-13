package com.rikkei.jobs.recruitment.service.impl;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationStatusHistoryResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.HrApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.WithdrawApplicationRequest;
import com.rikkei.jobs.recruitment.exception.DuplicateApplicationException;
import com.rikkei.jobs.recruitment.exception.InvalidApplicationStateException;
import com.rikkei.jobs.recruitment.integration.ApplicationSubmittedEvent;
import com.rikkei.jobs.recruitment.integration.CvSnapshotData;
import com.rikkei.jobs.recruitment.integration.CvSnapshotService;
import com.rikkei.jobs.recruitment.integration.JobSummaryDto;
import com.rikkei.jobs.recruitment.integration.JobVerificationClient;
import com.rikkei.jobs.recruitment.model.Application;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.model.ApplicationStatusHistory;
import com.rikkei.jobs.recruitment.repository.ApplicationRepository;
import com.rikkei.jobs.recruitment.repository.ApplicationStatusHistoryRepository;
import com.rikkei.jobs.recruitment.service.ApplicationService;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Implementation of candidate application management service. */
@Service
@Transactional
public class ApplicationServiceImpl implements ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final JobVerificationClient jobVerificationClient;
    private final CvSnapshotService cvSnapshotService;
    private final ApplicationEventPublisher eventPublisher;

    public ApplicationServiceImpl(
            ApplicationRepository applicationRepository,
            ApplicationStatusHistoryRepository historyRepository,
            JobVerificationClient jobVerificationClient,
            CvSnapshotService cvSnapshotService,
            ApplicationEventPublisher eventPublisher) {
        this.applicationRepository = applicationRepository;
        this.historyRepository = historyRepository;
        this.jobVerificationClient = jobVerificationClient;
        this.cvSnapshotService = cvSnapshotService;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public ApplicationDetailResponse apply(
            Long jobId, Long candidateUserId, ApplyJobRequest request) {
        // 1. Verify JD eligibility (approved and deadline valid)
        JobSummaryDto job = jobVerificationClient.verifyJobEligible(jobId);

        // 2. Enforce the one-application-per-job rule across every status.
        if (applicationRepository.existsByJobIdAndUserId(jobId, candidateUserId)) {
            throw new DuplicateApplicationException();
        }

        // 3. Capture immutable CV snapshot at application time
        CvSnapshotData cvSnapshot =
                cvSnapshotService.captureSnapshot(request.cvId(), candidateUserId);

        // 4. Create and persist application
        Application application =
                new Application(
                        jobId,
                        candidateUserId,
                        request.cvId(),
                        "/api/v1/me/applications/pending/cv-snapshot",
                        request.coverLetter(),
                        ApplicationStatus.SUBMITTED);
        try {
            application = applicationRepository.saveAndFlush(application);
        } catch (DataIntegrityViolationException exception) {
            throw new DuplicateApplicationException();
        }
        application.setCvSnapshotUrl(
                "/api/v1/me/applications/" + application.getId() + "/cv-snapshot");
        application = applicationRepository.save(application);
        cvSnapshotService.saveSnapshot(application.getId(), cvSnapshot);

        // 5. Record initial status history entry
        ApplicationStatusHistory initialHistory =
                new ApplicationStatusHistory(
                        application.getId(),
                        null,
                        ApplicationStatus.SUBMITTED,
                        candidateUserId,
                        "Ứng viên nộp hồ sơ ứng tuyển.");
        historyRepository.save(initialHistory);

        // 6. Notify company HR via asynchronous domain event
        eventPublisher.publishEvent(
                new ApplicationSubmittedEvent(
                        application.getId(),
                        jobId,
                        job.title(),
                        job.companyName(),
                        candidateUserId,
                        job.hrEmail()));

        List<ApplicationStatusHistoryResponse> histories =
                List.of(toHistoryResponse(initialHistory));

        return toDetailResponse(application, job, histories);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ApplicationSummaryResponse> getMyApplications(
            Long candidateUserId, ApplicationStatus status, int page, int size) {
        PageRequest pageable =
                PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Application> applications =
                status != null
                        ? applicationRepository.findByUserIdAndStatusOrderByCreatedAtDesc(
                                candidateUserId, status, pageable)
                        : applicationRepository.findByUserIdOrderByCreatedAtDesc(
                                candidateUserId, pageable);

        List<ApplicationSummaryResponse> items =
                applications.getContent().stream()
                        .map(
                                app -> {
                                    JobSummaryDto job =
                                            jobVerificationClient.getJobSummary(app.getJobId());
                                    return new ApplicationSummaryResponse(
                                            app.getId(),
                                            app.getJobId(),
                                            job.title(),
                                            job.companyName(),
                                            app.getStatus(),
                                            app.getStatus().canWithdraw(),
                                            app.getCreatedAt(),
                                            app.getUpdatedAt());
                                })
                        .toList();
        return new PageResponse<>(
                items, page, size, applications.getTotalElements(), applications.getTotalPages());
    }

    @Override
    @Transactional(readOnly = true)
    public ApplicationDetailResponse getMyApplicationDetail(
            Long applicationId, Long candidateUserId) {
        Application application =
                applicationRepository
                        .findByIdAndUserId(applicationId, candidateUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy đơn ứng tuyển hoặc bạn không có quyền xem đơn này."));

        JobSummaryDto job = jobVerificationClient.getJobSummary(application.getJobId());
        List<ApplicationStatusHistoryResponse> histories =
                historyRepository.findByApplicationIdOrderByCreatedAtAsc(applicationId).stream()
                        .map(this::toHistoryResponse)
                        .toList();

        return toDetailResponse(application, job, histories);
    }

    @Override
    public ApplicationDetailResponse withdraw(
            Long applicationId, Long candidateUserId, WithdrawApplicationRequest request) {
        Application application =
                applicationRepository
                        .findByIdAndUserId(applicationId, candidateUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy đơn ứng tuyển hoặc bạn không có quyền rút đơn này."));

        // Enforce rule: cannot withdraw once status reaches OFFER or terminal state
        if (!application.getStatus().canWithdraw()) {
            throw new InvalidApplicationStateException(
                    "CANNOT_WITHDRAW",
                    String.format(
                            "Không thể rút đơn khi đang ở trạng thái '%s'. Chỉ được rút đơn trước bước OFFER.",
                            application.getStatus()));
        }

        ApplicationStatus previousStatus = application.getStatus();
        application.setStatus(ApplicationStatus.WITHDRAWN);
        application = applicationRepository.save(application);

        // Record history log with candidate's reason
        ApplicationStatusHistory withdrawHistory =
                new ApplicationStatusHistory(
                        application.getId(),
                        previousStatus,
                        ApplicationStatus.WITHDRAWN,
                        candidateUserId,
                        request.reason());
        historyRepository.save(withdrawHistory);

        JobSummaryDto job = jobVerificationClient.getJobSummary(application.getJobId());
        List<ApplicationStatusHistoryResponse> histories =
                historyRepository.findByApplicationIdOrderByCreatedAtAsc(applicationId).stream()
                        .map(this::toHistoryResponse)
                        .toList();

        return toDetailResponse(application, job, histories);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<HrApplicationSummaryResponse> getHrApplications(
            Long jobId, Long hrUserId, int page, int size) {
        ensureHrOwnsJob(jobId, hrUserId);
        Page<Application> applications =
                applicationRepository.findByJobIdOrderByCreatedAtDesc(
                        jobId,
                        PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<HrApplicationSummaryResponse> items =
                applications.getContent().stream()
                        .map(
                                application ->
                                        new HrApplicationSummaryResponse(
                                                application.getId(),
                                                application.getUserId(),
                                                application.getCvSnapshotUrl(),
                                                application.getCoverLetter(),
                                                application.getStatus(),
                                                application.getCreatedAt(),
                                                application.getUpdatedAt()))
                        .toList();
        return new PageResponse<>(
                items, page, size, applications.getTotalElements(), applications.getTotalPages());
    }

    @Override
    @Transactional(readOnly = true)
    public ApplicationDetailResponse getHrApplicationDetail(
            Long applicationId, Long jobId, Long hrUserId) {
        ensureHrOwnsJob(jobId, hrUserId);
        Application application =
                applicationRepository
                        .findByIdAndJobId(applicationId, jobId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy đơn ứng tuyển."));
        return toApplicationDetail(application);
    }

    @Override
    public ApplicationDetailResponse updateStatus(
            Long applicationId,
            Long jobId,
            Long hrUserId,
            ApplicationStatus newStatus,
            String note) {
        ensureHrOwnsJob(jobId, hrUserId);
        Application application =
                applicationRepository
                        .findByIdAndJobId(applicationId, jobId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy đơn ứng tuyển."));
        if (!application.getStatus().canTransitionTo(newStatus)) {
            throw new InvalidApplicationStateException(
                    "INVALID_STATUS_TRANSITION",
                    "Không thể chuyển trạng thái từ "
                            + application.getStatus()
                            + " sang "
                            + newStatus
                            + ".");
        }

        ApplicationStatus previousStatus = application.getStatus();
        application.setStatus(newStatus);
        application = applicationRepository.save(application);
        historyRepository.save(
                new ApplicationStatusHistory(
                        application.getId(), previousStatus, newStatus, hrUserId, note.trim()));
        return toApplicationDetail(application);
    }

    @Override
    @Transactional(readOnly = true)
    public CvSnapshotDownload getCandidateCvSnapshot(Long applicationId, Long candidateUserId) {
        applicationRepository
                .findByIdAndUserId(applicationId, candidateUserId)
                .orElseThrow(
                        () ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy đơn ứng tuyển hoặc bạn không có quyền xem tệp này."));
        return cvSnapshotService.getSnapshot(applicationId);
    }

    @Override
    @Transactional(readOnly = true)
    public CvSnapshotDownload getHrCvSnapshot(Long applicationId, Long jobId, Long hrUserId) {
        ensureHrOwnsJob(jobId, hrUserId);
        applicationRepository
                .findByIdAndJobId(applicationId, jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn ứng tuyển."));
        return cvSnapshotService.getSnapshot(applicationId);
    }

    private void ensureHrOwnsJob(Long jobId, Long hrUserId) {
        if (!jobVerificationClient.isOwnedByHr(jobId, hrUserId)) {
            throw new ResourceNotFoundException("Không tìm thấy vị trí tuyển dụng.");
        }
    }

    private ApplicationDetailResponse toApplicationDetail(Application application) {
        JobSummaryDto job = jobVerificationClient.getJobSummary(application.getJobId());
        List<ApplicationStatusHistoryResponse> histories =
                historyRepository
                        .findByApplicationIdOrderByCreatedAtAsc(application.getId())
                        .stream()
                        .map(this::toHistoryResponse)
                        .toList();
        return toDetailResponse(application, job, histories);
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

    private ApplicationDetailResponse toDetailResponse(
            Application app, JobSummaryDto job, List<ApplicationStatusHistoryResponse> histories) {
        return new ApplicationDetailResponse(
                app.getId(),
                app.getJobId(),
                job.title(),
                job.companyName(),
                app.getCvId(),
                app.getCvSnapshotUrl(),
                app.getCoverLetter(),
                app.getStatus(),
                app.getStatus().canWithdraw(),
                app.getCreatedAt(),
                app.getUpdatedAt(),
                histories);
    }
}
