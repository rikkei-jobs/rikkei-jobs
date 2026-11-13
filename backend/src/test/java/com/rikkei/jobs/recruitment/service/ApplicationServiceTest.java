package com.rikkei.jobs.recruitment.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
import com.rikkei.jobs.recruitment.dto.WithdrawApplicationRequest;
import com.rikkei.jobs.recruitment.exception.DuplicateApplicationException;
import com.rikkei.jobs.recruitment.exception.InvalidApplicationStateException;
import com.rikkei.jobs.recruitment.exception.JobNotEligibleException;
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
import com.rikkei.jobs.recruitment.service.impl.ApplicationServiceImpl;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
public class ApplicationServiceTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private ApplicationStatusHistoryRepository historyRepository;
    @Mock private JobVerificationClient jobVerificationClient;
    @Mock private CvSnapshotService cvSnapshotService;
    @Mock private ApplicationEventPublisher eventPublisher;

    private ApplicationServiceImpl applicationService;

    @BeforeEach
    void setUp() {
        applicationService =
                new ApplicationServiceImpl(
                        applicationRepository,
                        historyRepository,
                        jobVerificationClient,
                        cvSnapshotService,
                        eventPublisher);
    }

    @Test
    @DisplayName(
            "Nộp đơn lần đầu vào JD hợp lệ -> Thành công tạo đơn SUBMITTED, snapshot URL, và ghi lịch sử")
    void testApply_Success() {
        Long jobId = 101L;
        Long userId = 1L;
        Long cvId = 10L;
        ApplyJobRequest request = new ApplyJobRequest(cvId, "Thư xin việc mẫu");

        JobSummaryDto job =
                new JobSummaryDto(
                        jobId,
                        "Backend Java",
                        "Rikkei Digital",
                        "APPROVED",
                        OffsetDateTime.now().plusMonths(1),
                        "hr@company.test");
        when(jobVerificationClient.verifyJobEligible(jobId)).thenReturn(job);
        when(applicationRepository.existsByJobIdAndUserId(jobId, userId)).thenReturn(false);
        when(cvSnapshotService.captureSnapshot(cvId, userId))
                .thenReturn(new CvSnapshotData("candidate.pdf", "%PDF-1.4".getBytes()));

        Application savedApp =
                new Application(
                        jobId,
                        userId,
                        cvId,
                        "/snapshots/cv_10_snap.pdf",
                        request.coverLetter(),
                        ApplicationStatus.SUBMITTED);
        savedApp.setId(100L);
        when(applicationRepository.saveAndFlush(any(Application.class))).thenReturn(savedApp);
        when(applicationRepository.save(any(Application.class))).thenReturn(savedApp);

        ApplicationDetailResponse response = applicationService.apply(jobId, userId, request);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals(ApplicationStatus.SUBMITTED, response.status());
        assertEquals("/api/v1/me/applications/100/cv-snapshot", response.cvSnapshotUrl());
        assertTrue(response.canWithdraw());

        verify(historyRepository).save(any(ApplicationStatusHistory.class));
        verify(eventPublisher).publishEvent(any(ApplicationSubmittedEvent.class));
    }

    @Test
    @DisplayName("Ứng tuyển cùng JD 2 lần khi đang có đơn mở -> Bắn ngoại lệ 409 Conflict")
    void testApply_DuplicateActive_ThrowsConflict() {
        Long jobId = 101L;
        Long userId = 1L;
        ApplyJobRequest request = new ApplyJobRequest(10L, "Thư xin việc");

        JobSummaryDto job =
                new JobSummaryDto(
                        jobId,
                        "Backend Java",
                        "Rikkei Digital",
                        "APPROVED",
                        OffsetDateTime.now().plusMonths(1),
                        "hr@company.test");
        when(jobVerificationClient.verifyJobEligible(jobId)).thenReturn(job);
        when(applicationRepository.existsByJobIdAndUserId(jobId, userId)).thenReturn(true);

        assertThrows(
                DuplicateApplicationException.class,
                () -> applicationService.apply(jobId, userId, request));
    }

    @Test
    @DisplayName("Đơn REJECTED hoặc WITHDRAWN vẫn ngăn ứng tuyển lại cùng JD")
    void testApply_DuplicateHistoricalApplication_ThrowsConflict() {
        Long jobId = 101L;
        Long userId = 1L;
        ApplyJobRequest request = new ApplyJobRequest(10L, "Thư ứng tuyển");
        JobSummaryDto job =
                new JobSummaryDto(
                        jobId,
                        "Backend Java",
                        "Rikkei Digital",
                        "APPROVED",
                        OffsetDateTime.now().plusMonths(1),
                        "hr@company.test");
        when(jobVerificationClient.verifyJobEligible(jobId)).thenReturn(job);
        when(applicationRepository.existsByJobIdAndUserId(jobId, userId)).thenReturn(true);

        assertThrows(
                DuplicateApplicationException.class,
                () -> applicationService.apply(jobId, userId, request));
        verify(applicationRepository).existsByJobIdAndUserId(jobId, userId);
    }

    @Test
    @DisplayName("Đơn trùng phát sinh đồng thời vẫn trả về xung đột từ unique index")
    void testApply_ConcurrentDuplicateInsert_ThrowsConflict() {
        Long jobId = 101L;
        Long userId = 1L;
        JobSummaryDto job =
                new JobSummaryDto(
                        jobId,
                        "Backend Java",
                        "Rikkei Digital",
                        "APPROVED",
                        OffsetDateTime.now().plusMonths(1),
                        "hr@company.test");
        when(jobVerificationClient.verifyJobEligible(jobId)).thenReturn(job);
        when(applicationRepository.existsByJobIdAndUserId(jobId, userId)).thenReturn(false);
        when(cvSnapshotService.captureSnapshot(10L, userId))
                .thenReturn(new CvSnapshotData("candidate.pdf", "%PDF-1.4".getBytes()));
        when(applicationRepository.saveAndFlush(any(Application.class)))
                .thenThrow(new DataIntegrityViolationException("unique application constraint"));

        assertThrows(
                DuplicateApplicationException.class,
                () -> applicationService.apply(jobId, userId, new ApplyJobRequest(10L, null)));
    }

    @Test
    @DisplayName("JD hết hạn -> Ném lỗi JobNotEligibleException")
    void testApply_ExpiredJob_ThrowsException() {
        Long jobId = 999L;
        Long userId = 1L;
        ApplyJobRequest request = new ApplyJobRequest(10L, "Thư xin việc");

        when(jobVerificationClient.verifyJobEligible(jobId))
                .thenThrow(new JobNotEligibleException("JD đã hết hạn"));

        assertThrows(
                JobNotEligibleException.class,
                () -> applicationService.apply(jobId, userId, request));
    }

    @Test
    @DisplayName("Rút đơn khi đang ở SUBMITTED hoặc SCREENING -> Thành công chuyển sang WITHDRAWN")
    void testWithdraw_ValidStatus_Success() {
        Long appId = 100L;
        Long userId = 1L;
        WithdrawApplicationRequest request =
                new WithdrawApplicationRequest("Đã tìm được cơ hội khác.");

        Application app =
                new Application(
                        101L,
                        userId,
                        10L,
                        "/snapshots/cv_10.pdf",
                        "Cover letter",
                        ApplicationStatus.SCREENING);
        app.setId(appId);

        when(applicationRepository.findByIdAndUserId(appId, userId)).thenReturn(Optional.of(app));
        when(applicationRepository.save(any(Application.class))).thenAnswer(i -> i.getArgument(0));
        when(jobVerificationClient.getJobSummary(101L))
                .thenReturn(
                        new JobSummaryDto(
                                101L,
                                "Backend Java",
                                "Rikkei Digital",
                                "APPROVED",
                                OffsetDateTime.now().plusMonths(1),
                                "hr@company.test"));

        ApplicationDetailResponse response = applicationService.withdraw(appId, userId, request);

        assertEquals(ApplicationStatus.WITHDRAWN, response.status());
        assertFalse(response.canWithdraw());
        verify(historyRepository).save(any(ApplicationStatusHistory.class));
    }

    @Test
    @DisplayName("Cố tình rút đơn khi đã ở bước OFFER -> Bị chặn, ném lỗi 400 Bad Request")
    void testWithdraw_AtOffer_ThrowsBadRequest() {
        Long appId = 100L;
        Long userId = 1L;
        WithdrawApplicationRequest request = new WithdrawApplicationRequest("Muốn rút đơn");

        Application app =
                new Application(
                        101L,
                        userId,
                        10L,
                        "/snapshots/cv_10.pdf",
                        "Cover letter",
                        ApplicationStatus.OFFER);
        app.setId(appId);

        when(applicationRepository.findByIdAndUserId(appId, userId)).thenReturn(Optional.of(app));

        assertThrows(
                InvalidApplicationStateException.class,
                () -> applicationService.withdraw(appId, userId, request));
    }

    @Test
    @DisplayName("Sau khi rút đơn (WITHDRAWN), ứng viên không thể ứng tuyển lại cùng JD")
    void testReapply_AfterWithdrawn_ThrowsConflict() {
        Long jobId = 101L;
        Long userId = 1L;
        ApplyJobRequest request = new ApplyJobRequest(10L, "Ứng tuyển lại");

        JobSummaryDto job =
                new JobSummaryDto(
                        jobId,
                        "Backend Java",
                        "Rikkei Digital",
                        "APPROVED",
                        OffsetDateTime.now().plusMonths(1),
                        "hr@company.test");
        when(jobVerificationClient.verifyJobEligible(jobId)).thenReturn(job);
        when(applicationRepository.existsByJobIdAndUserId(jobId, userId)).thenReturn(true);

        assertThrows(
                DuplicateApplicationException.class,
                () -> applicationService.apply(jobId, userId, request));
    }

    @Test
    @DisplayName("HR sở hữu JD có thể chuyển đơn từ SUBMITTED sang SCREENING")
    void testHrUpdatesApplicationStatus() {
        Application application =
                new Application(
                        101L,
                        1L,
                        10L,
                        "/api/v1/me/applications/70/cv-snapshot",
                        "Cover letter",
                        ApplicationStatus.SUBMITTED);
        application.setId(70L);
        when(jobVerificationClient.isOwnedByHr(101L, 4L)).thenReturn(true);
        when(applicationRepository.findByIdAndJobId(70L, 101L))
                .thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(i -> i.getArgument(0));
        when(jobVerificationClient.getJobSummary(101L))
                .thenReturn(
                        new JobSummaryDto(
                                101L,
                                "Backend Java",
                                "Rikkei Digital",
                                "APPROVED",
                                OffsetDateTime.now().plusMonths(1),
                                "hr@company.test"));
        when(historyRepository.findByApplicationIdOrderByCreatedAtAsc(70L)).thenReturn(List.of());

        ApplicationDetailResponse response =
                applicationService.updateStatus(
                        70L, 101L, 4L, ApplicationStatus.SCREENING, "Đạt yêu cầu");

        assertEquals(ApplicationStatus.SCREENING, response.status());
        verify(historyRepository).save(any(ApplicationStatusHistory.class));
    }

    @Test
    @DisplayName("HR không sở hữu JD không thể truy cập hồ sơ ứng tuyển")
    void testHrCannotAccessApplicationForAnotherOwnersJob() {
        when(jobVerificationClient.isOwnedByHr(101L, 5L)).thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> applicationService.getHrApplicationDetail(70L, 101L, 5L));

        verify(applicationRepository, never()).findByIdAndJobId(70L, 101L);
    }
}
