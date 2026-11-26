package com.rikkei.jobs.recruitment.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
import com.rikkei.jobs.recruitment.dto.HrApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.WithdrawApplicationRequest;
import com.rikkei.jobs.recruitment.exception.CvServiceUnavailableException;
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
import com.rikkei.jobs.recruitment.service.impl.ApplicationPersistenceTxService;
import com.rikkei.jobs.recruitment.service.impl.ApplicationServiceImpl;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
public class ApplicationServiceTest {

    private static final Instant FIXED_INSTANT = Instant.parse("2026-11-21T06:00:00Z");
    private static final OffsetDateTime FIXED_NOW =
            OffsetDateTime.ofInstant(FIXED_INSTANT, ZoneOffset.UTC);

    @Mock private ApplicationRepository applicationRepository;
    @Mock private ApplicationStatusHistoryRepository historyRepository;
    @Mock private JobVerificationClient jobVerificationClient;
    @Mock private CvSnapshotService cvSnapshotService;
    @Mock private ApplicationEventPublisher eventPublisher;

    private MutableClock clock;
    private ApplicationPersistenceTxService persistenceTxService;
    private ApplicationServiceImpl applicationService;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(FIXED_INSTANT, ZoneOffset.UTC);
        persistenceTxService =
                new ApplicationPersistenceTxService(
                        applicationRepository,
                        historyRepository,
                        cvSnapshotService,
                        eventPublisher,
                        clock);
        applicationService =
                new ApplicationServiceImpl(
                        applicationRepository,
                        historyRepository,
                        jobVerificationClient,
                        cvSnapshotService,
                        persistenceTxService,
                        clock);
    }

    @Test
    @DisplayName(
            "Nộp đơn lần đầu vào JD hợp lệ -> Thành công tạo đơn SUBMITTED, snapshot URL, Clock timestamp và ghi lịch sử")
    void testApply_Success() {
        Long jobId = 101L;
        Long userId = 1L;
        Long cvId = 10L;
        ApplyJobRequest request = new ApplyJobRequest(cvId, "Thư xin việc mẫu");

        JobSummaryDto job =
                new JobSummaryDto(
                        jobId,
                        "Backend Java",
                        1L,
                        "Rikkei Digital",
                        "APPROVED",
                        FIXED_NOW.plusMonths(1));
        when(jobVerificationClient.verifyJobEligible(jobId)).thenReturn(job);
        when(applicationRepository.existsByJobIdAndUserIdAndStatusIn(eq(jobId), eq(userId), any()))
                .thenReturn(false);
        when(cvSnapshotService.captureSnapshot(cvId, userId))
                .thenReturn(
                        new CvSnapshotData(
                                "candidate.pdf", "%PDF-1.4".getBytes(StandardCharsets.UTF_8)));

        when(applicationRepository.saveAndFlush(any(Application.class)))
                .thenAnswer(
                        inv -> {
                            Application app = inv.getArgument(0);
                            app.setId(100L);
                            app.prePersist();
                            return app;
                        });
        when(historyRepository.save(any(ApplicationStatusHistory.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApplicationDetailResponse response = applicationService.apply(jobId, userId, request);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals(ApplicationStatus.SUBMITTED, response.status());
        assertEquals("/api/v1/me/applications/100/cv-snapshot", response.cvSnapshotUrl());
        assertEquals(FIXED_NOW, response.createdAt());
        assertEquals(FIXED_NOW, response.updatedAt());
        assertTrue(response.canWithdraw());

        InOrder order =
                inOrder(
                        jobVerificationClient,
                        cvSnapshotService,
                        applicationRepository,
                        historyRepository,
                        eventPublisher);
        order.verify(jobVerificationClient).verifyJobEligible(jobId);
        order.verify(cvSnapshotService).captureSnapshot(cvId, userId);
        order.verify(applicationRepository).saveAndFlush(any(Application.class));
        order.verify(cvSnapshotService)
                .saveSnapshot(eq(100L), any(CvSnapshotData.class), eq(FIXED_NOW));
        order.verify(historyRepository).save(any(ApplicationStatusHistory.class));
        order.verify(eventPublisher).publishEvent(any(ApplicationSubmittedEvent.class));
    }

    @Test
    @DisplayName(
            "Ứng tuyển cùng JD 2 lần khi đang có đơn mở -> Bắn ngoại lệ 409 DUPLICATE_APPLICATION")
    void testApply_DuplicateActive_ThrowsConflict() {
        Long jobId = 101L;
        Long userId = 1L;
        ApplyJobRequest request = new ApplyJobRequest(10L, "Thư xin việc");

        JobSummaryDto job =
                new JobSummaryDto(
                        jobId,
                        "Backend Java",
                        1L,
                        "Rikkei Digital",
                        "APPROVED",
                        FIXED_NOW.plusMonths(1));
        when(jobVerificationClient.verifyJobEligible(jobId)).thenReturn(job);
        when(applicationRepository.existsByJobIdAndUserIdAndStatusIn(eq(jobId), eq(userId), any()))
                .thenReturn(true);

        DuplicateApplicationException ex =
                assertThrows(
                        DuplicateApplicationException.class,
                        () -> applicationService.apply(jobId, userId, request));
        assertEquals("DUPLICATE_APPLICATION", ex.getCode());
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verifyNoInteractions(cvSnapshotService);
    }

    @Test
    @DisplayName(
            "Đơn trùng phát sinh đồng thời vẫn trả về 409 DUPLICATE_APPLICATION từ unique index")
    void testApply_ConcurrentDuplicateInsert_ThrowsConflict() {
        Long jobId = 101L;
        Long userId = 1L;
        JobSummaryDto job =
                new JobSummaryDto(
                        jobId,
                        "Backend Java",
                        1L,
                        "Rikkei Digital",
                        "APPROVED",
                        FIXED_NOW.plusMonths(1));
        when(jobVerificationClient.verifyJobEligible(jobId)).thenReturn(job);
        when(applicationRepository.existsByJobIdAndUserIdAndStatusIn(eq(jobId), eq(userId), any()))
                .thenReturn(false);
        when(cvSnapshotService.captureSnapshot(10L, userId))
                .thenReturn(
                        new CvSnapshotData(
                                "candidate.pdf", "%PDF-1.4".getBytes(StandardCharsets.UTF_8)));
        when(applicationRepository.saveAndFlush(any(Application.class)))
                .thenThrow(new DataIntegrityViolationException("unique application constraint"));

        DuplicateApplicationException ex =
                assertThrows(
                        DuplicateApplicationException.class,
                        () ->
                                applicationService.apply(
                                        jobId, userId, new ApplyJobRequest(10L, null)));
        assertEquals("DUPLICATE_APPLICATION", ex.getCode());
    }

    @Test
    @DisplayName(
            "JD hết hạn hoặc không hợp lệ -> Ném lỗi JobNotEligibleException (400 JOB_NOT_ELIGIBLE)")
    void testApply_ExpiredJob_ThrowsException() {
        Long jobId = 999L;
        Long userId = 1L;
        ApplyJobRequest request = new ApplyJobRequest(10L, "Thư xin việc");

        when(jobVerificationClient.verifyJobEligible(jobId))
                .thenThrow(new JobNotEligibleException("JD đã hết hạn"));

        JobNotEligibleException ex =
                assertThrows(
                        JobNotEligibleException.class,
                        () -> applicationService.apply(jobId, userId, request));
        assertEquals("JOB_NOT_ELIGIBLE", ex.getCode());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName(
            "CV không thuộc ứng viên -> 404; CV port unavailable -> 503 CV_SERVICE_UNAVAILABLE")
    void testApply_CvNotOwnedAndUnavailable() {
        JobSummaryDto job =
                new JobSummaryDto(
                        101L,
                        "Backend Java",
                        1L,
                        "Rikkei Digital",
                        "APPROVED",
                        FIXED_NOW.plusMonths(1));
        when(jobVerificationClient.verifyJobEligible(101L)).thenReturn(job);
        when(applicationRepository.existsByJobIdAndUserIdAndStatusIn(eq(101L), eq(1L), any()))
                .thenReturn(false);

        when(cvSnapshotService.captureSnapshot(99L, 1L))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy CV"));
        assertThrows(
                ResourceNotFoundException.class,
                () -> applicationService.apply(101L, 1L, new ApplyJobRequest(99L, null)));

        when(cvSnapshotService.captureSnapshot(10L, 1L))
                .thenThrow(new CvServiceUnavailableException());
        CvServiceUnavailableException unavailable =
                assertThrows(
                        CvServiceUnavailableException.class,
                        () -> applicationService.apply(101L, 1L, new ApplyJobRequest(10L, null)));
        assertEquals("CV_SERVICE_UNAVAILABLE", unavailable.getCode());
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, unavailable.getStatus());
        verify(applicationRepository, never()).saveAndFlush(any());
    }

    @ParameterizedTest(name = "Rút đơn hợp lệ ở trạng thái {0}")
    @EnumSource(
            value = ApplicationStatus.class,
            names = {"SUBMITTED", "SCREENING", "INTERVIEW"})
    @DisplayName(
            "Rút đơn khi đang ở SUBMITTED, SCREENING, hoặc INTERVIEW -> Thành công chuyển sang WITHDRAWN")
    void testWithdraw_ValidStatuses_Success(ApplicationStatus initialStatus) {
        Long appId = 100L;
        Long userId = 1L;
        WithdrawApplicationRequest request =
                new WithdrawApplicationRequest("Đã tìm được cơ hội khác.");

        Application app =
                new Application(
                        101L,
                        userId,
                        10L,
                        "/api/v1/me/applications/100/cv-snapshot",
                        "Cover letter",
                        initialStatus,
                        FIXED_NOW.minusDays(1),
                        FIXED_NOW.minusDays(1));
        app.setId(appId);

        when(applicationRepository.findByIdAndUserId(appId, userId)).thenReturn(Optional.of(app));
        when(applicationRepository.saveAndFlush(any(Application.class)))
                .thenAnswer(i -> i.getArgument(0));
        when(jobVerificationClient.getJobSummary(101L))
                .thenReturn(
                        new JobSummaryDto(
                                101L,
                                "Backend Java",
                                1L,
                                "Rikkei Digital",
                                "APPROVED",
                                FIXED_NOW.plusMonths(1)));

        ApplicationDetailResponse response = applicationService.withdraw(appId, userId, request);

        assertEquals(ApplicationStatus.WITHDRAWN, response.status());
        assertFalse(response.canWithdraw());
        assertEquals(FIXED_NOW, response.updatedAt());
        verify(historyRepository).save(any(ApplicationStatusHistory.class));
    }

    @ParameterizedTest(name = "Rút đơn bị chặn ở trạng thái {0}")
    @EnumSource(
            value = ApplicationStatus.class,
            names = {"OFFER", "HIRED", "REJECTED", "WITHDRAWN"})
    @DisplayName(
            "Cố tình rút đơn khi đã ở OFFER, HIRED, REJECTED, WITHDRAWN -> Bị chặn với 409 CANNOT_WITHDRAW")
    void testWithdraw_BlockedStatuses_ThrowsConflict(ApplicationStatus blockedStatus) {
        Long appId = 100L;
        Long userId = 1L;
        WithdrawApplicationRequest request = new WithdrawApplicationRequest("Muốn rút đơn");

        Application app =
                new Application(
                        101L,
                        userId,
                        10L,
                        "/api/v1/me/applications/100/cv-snapshot",
                        "Cover letter",
                        blockedStatus);
        app.setId(appId);

        when(applicationRepository.findByIdAndUserId(appId, userId)).thenReturn(Optional.of(app));

        InvalidApplicationStateException ex =
                assertThrows(
                        InvalidApplicationStateException.class,
                        () -> applicationService.withdraw(appId, userId, request));
        assertEquals("CANNOT_WITHDRAW", ex.getCode());
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(applicationRepository, never()).saveAndFlush(any());
    }

    @ParameterizedTest(name = "Ứng tuyển lại sau trạng thái kết thúc {0}")
    @EnumSource(
            value = ApplicationStatus.class,
            names = {"WITHDRAWN", "REJECTED", "HIRED"})
    @DisplayName(
            "Sau khi kết thúc (WITHDRAWN/REJECTED/HIRED), ứng viên có thể ứng tuyển lại cùng JD")
    void testReapply_AfterTerminalStatuses_Succeeds(ApplicationStatus priorTerminalStatus) {
        assertTrue(priorTerminalStatus.isTerminal());
        assertFalse(priorTerminalStatus.isOpen());

        Long jobId = 101L;
        Long userId = 1L;
        ApplyJobRequest request = new ApplyJobRequest(10L, "Ứng tuyển lại");

        JobSummaryDto job =
                new JobSummaryDto(
                        jobId,
                        "Backend Java",
                        1L,
                        "Rikkei Digital",
                        "APPROVED",
                        FIXED_NOW.plusMonths(1));
        when(jobVerificationClient.verifyJobEligible(jobId)).thenReturn(job);
        when(applicationRepository.existsByJobIdAndUserIdAndStatusIn(eq(jobId), eq(userId), any()))
                .thenReturn(false);
        when(cvSnapshotService.captureSnapshot(10L, userId))
                .thenReturn(
                        new CvSnapshotData(
                                "candidate.pdf", "%PDF-1.4".getBytes(StandardCharsets.UTF_8)));

        when(applicationRepository.saveAndFlush(any(Application.class)))
                .thenAnswer(
                        inv -> {
                            Application app = inv.getArgument(0);
                            app.setId(102L);
                            app.prePersist();
                            return app;
                        });
        when(historyRepository.save(any(ApplicationStatusHistory.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApplicationDetailResponse response = applicationService.apply(jobId, userId, request);

        assertEquals(102L, response.id());
        assertEquals(ApplicationStatus.SUBMITTED, response.status());
    }

    @Test
    @DisplayName("Kiểm tra phân trang hợp lệ và lọc trạng thái cho ứng viên & HR")
    void testPaginationValidationAndHrStatusFiltering() {
        assertThrows(
                ValidationException.class,
                () -> applicationService.getMyApplications(1L, null, 0, 20));
        assertThrows(
                ValidationException.class,
                () -> applicationService.getMyApplications(1L, null, 1, 0));
        assertThrows(
                ValidationException.class,
                () -> applicationService.getMyApplications(1L, null, 1, 101));
        assertThrows(
                ValidationException.class,
                () -> applicationService.getHrApplications(2L, 2L, null, 1, 101));

        Application app =
                new Application(
                        2L,
                        1L,
                        1L,
                        "/api/v1/me/applications/2/cv-snapshot",
                        "Cover",
                        ApplicationStatus.SCREENING,
                        FIXED_NOW,
                        FIXED_NOW);
        app.setId(2L);
        when(jobVerificationClient.isOwnedByCompany(2L, 2L)).thenReturn(true);
        when(applicationRepository.findByJobIdAndStatus(
                        eq(2L), eq(ApplicationStatus.SCREENING), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(app)));

        PageResponse<HrApplicationSummaryResponse> hrPage =
                applicationService.getHrApplications(2L, 2L, ApplicationStatus.SCREENING, 1, 20);
        assertEquals(1, hrPage.items().size());
        assertEquals(ApplicationStatus.SCREENING, hrPage.items().get(0).status());
    }

    @Test
    @DisplayName("HR không sở hữu JD không thể truy cập hồ sơ ứng tuyển")
    void testHrCannotAccessApplicationForAnotherOwnersJob() {
        when(jobVerificationClient.isOwnedByCompany(101L, 2L)).thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> applicationService.getHrApplicationDetail(70L, 101L, 2L));

        verify(applicationRepository, never()).findByIdAndJobId(70L, 101L);
    }
}
