package com.rikkei.jobs.recruitment.service.impl;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationStatusHistoryResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.HrApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.WithdrawApplicationRequest;
import com.rikkei.jobs.recruitment.exception.DuplicateApplicationException;
import com.rikkei.jobs.recruitment.exception.InvalidApplicationStateException;
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
import com.rikkei.jobs.recruitment.service.impl.ApplicationPersistenceTxService.PersistedApplication;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of candidate application management and HR read-only views. Intentionally omits a
 * class-level {@code @Transactional} annotation so {@link #apply(Long, Long, ApplyJobRequest)} can
 * verify JD eligibility and capture CV snapshot bytes outside database transactions (F3).
 */
@Service
public class ApplicationServiceImpl implements ApplicationService {

    private static final int MIN_PAGE = 1;
    private static final int MIN_PAGE_SIZE = 1;
    private static final int MAX_PAGE_SIZE = 100;
    private static final Sort DEFAULT_APPLICATION_SORT =
            Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));

    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final JobVerificationClient jobVerificationClient;
    private final CvSnapshotService cvSnapshotService;
    private final ApplicationPersistenceTxService persistenceTxService;
    private final Clock clock;

    public ApplicationServiceImpl(
            ApplicationRepository applicationRepository,
            ApplicationStatusHistoryRepository historyRepository,
            JobVerificationClient jobVerificationClient,
            CvSnapshotService cvSnapshotService,
            ApplicationPersistenceTxService persistenceTxService,
            Clock clock) {
        this.applicationRepository = applicationRepository;
        this.historyRepository = historyRepository;
        this.jobVerificationClient = jobVerificationClient;
        this.cvSnapshotService = cvSnapshotService;
        this.persistenceTxService = persistenceTxService;
        this.clock = clock;
    }

    /**
     * Submits a candidate application. Re-applying is permitted after terminal states ({@code
     * WITHDRAWN}, {@code REJECTED}, {@code HIRED}) and rejected with 409 {@code
     * DUPLICATE_APPLICATION} if an open application exists for the same JD.
     */
    @Override
    public ApplicationDetailResponse apply(
            Long jobId, Long candidateUserId, ApplyJobRequest request) {
        JobSummaryDto job = jobVerificationClient.verifyJobEligible(jobId);

        if (applicationRepository.existsByJobIdAndUserIdAndStatusIn(
                jobId, candidateUserId, ApplicationPersistenceTxService.OPEN_STATUSES)) {
            throw new DuplicateApplicationException(
                    "Ứng viên đã có đơn ứng tuyển đang mở cho vị trí này.");
        }

        CvSnapshotData cvSnapshot =
                cvSnapshotService.captureSnapshot(request.cvId(), candidateUserId);

        PersistedApplication persisted =
                persistenceTxService.persistApplication(
                        jobId, candidateUserId, request, job, cvSnapshot);

        List<ApplicationStatusHistoryResponse> histories =
                List.of(toHistoryResponse(persisted.initialHistory()));

        return toDetailResponse(persisted.application(), job, histories);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ApplicationSummaryResponse> getMyApplications(
            Long candidateUserId, ApplicationStatus status, int page, int size) {
        validatePagination(page, size);
        PageRequest pageable = PageRequest.of(page - 1, size, DEFAULT_APPLICATION_SORT);
        Page<Application> applications =
                status != null
                        ? applicationRepository.findByUserIdAndStatus(
                                candidateUserId, status, pageable)
                        : applicationRepository.findByUserId(candidateUserId, pageable);

        Set<Long> jobIds =
                applications.getContent().stream()
                        .map(Application::getJobId)
                        .collect(Collectors.toSet());
        Map<Long, JobSummaryDto> jobsById = jobVerificationClient.getJobSummaries(jobIds);

        List<ApplicationSummaryResponse> items =
                applications.getContent().stream()
                        .map(
                                app -> {
                                    JobSummaryDto job = jobsById.get(app.getJobId());
                                    String title = job != null ? job.title() : "Vị trí tuyển dụng";
                                    String companyName = job != null ? job.companyName() : "";
                                    return new ApplicationSummaryResponse(
                                            app.getId(),
                                            app.getJobId(),
                                            title,
                                            companyName,
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

        return toApplicationDetail(application);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApplicationDetailResponse withdraw(
            Long applicationId, Long candidateUserId, WithdrawApplicationRequest request) {
        Application application =
                applicationRepository
                        .findByIdAndUserId(applicationId, candidateUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy đơn ứng tuyển hoặc bạn không có quyền rút đơn này."));

        if (!application.getStatus().canWithdraw()) {
            throw new InvalidApplicationStateException(
                    "CANNOT_WITHDRAW",
                    String.format(
                            "Không thể rút đơn khi đang ở trạng thái '%s'. Chỉ được rút đơn trước bước OFFER.",
                            application.getStatus()));
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        ApplicationStatus previousStatus = application.getStatus();
        application.markWithdrawn(now);
        application = applicationRepository.saveAndFlush(application);

        ApplicationStatusHistory withdrawHistory =
                new ApplicationStatusHistory(
                        application.getId(),
                        previousStatus,
                        ApplicationStatus.WITHDRAWN,
                        candidateUserId,
                        request.reason(),
                        now);
        historyRepository.save(withdrawHistory);

        return toApplicationDetail(application);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<HrApplicationSummaryResponse> getHrApplications(
            Long jobId, Long hrCompanyId, ApplicationStatus status, int page, int size) {
        validatePagination(page, size);
        ensureHrOwnsJob(jobId, hrCompanyId);
        PageRequest pageable = PageRequest.of(page - 1, size, DEFAULT_APPLICATION_SORT);
        Page<Application> applications =
                status != null
                        ? applicationRepository.findByJobIdAndStatus(jobId, status, pageable)
                        : applicationRepository.findByJobId(jobId, pageable);
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
            Long applicationId, Long jobId, Long hrCompanyId) {
        ensureHrOwnsJob(jobId, hrCompanyId);
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
    public CvSnapshotDownload getHrCvSnapshot(Long applicationId, Long jobId, Long hrCompanyId) {
        ensureHrOwnsJob(jobId, hrCompanyId);
        applicationRepository
                .findByIdAndJobId(applicationId, jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn ứng tuyển."));
        return cvSnapshotService.getSnapshot(applicationId);
    }

    private static void validatePagination(int page, int size) {
        if (page < MIN_PAGE || size < MIN_PAGE_SIZE || size > MAX_PAGE_SIZE) {
            throw new ValidationException(
                    "Tham số phân trang không hợp lệ (page >= 1, 1 <= size <= 100)");
        }
    }

    private void ensureHrOwnsJob(Long jobId, Long hrCompanyId) {
        if (hrCompanyId == null || !jobVerificationClient.isOwnedByCompany(jobId, hrCompanyId)) {
            throw new ResourceNotFoundException("Không tìm thấy vị trí tuyển dụng.");
        }
    }

    private ApplicationDetailResponse toApplicationDetail(Application application) {
        JobSummaryDto job = jobVerificationClient.getJobSummary(application.getJobId());
        List<ApplicationStatusHistoryResponse> histories =
                historyRepository
                        .findByApplicationIdOrderByCreatedAtAscIdAsc(application.getId())
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
