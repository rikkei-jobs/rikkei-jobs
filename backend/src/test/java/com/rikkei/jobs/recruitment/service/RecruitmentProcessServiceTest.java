package com.rikkei.jobs.recruitment.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.identity.dto.UserSummaryDto;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import com.rikkei.jobs.recruitment.dto.ApplicationProcessDetailResponse;
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
import com.rikkei.jobs.recruitment.service.impl.RecruitmentProcessServiceImpl;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecruitmentProcessService Unit Tests (UT-02 Rules, Offer Hook, Ownership, Clock)")
class RecruitmentProcessServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-20T08:00:00Z");

    @Mock private ApplicationRepository applicationRepository;
    @Mock private InterviewRoundRepository interviewRoundRepository;
    @Mock private ApplicationStatusHistoryRepository historyRepository;
    @Mock private JobVerificationClient jobVerificationClient;
    @Mock private IdentityPublicService identityPublicService;
    @Mock private CandidatePublicService candidatePublicService;
    @Mock private CvSnapshotService cvSnapshotService;
    @Mock private MatchScoreCalculator matchScoreCalculator;
    @Mock private ApplicationEventPublisher eventPublisher;

    private MutableClock clock;
    private RecruitmentProcessServiceImpl service;

    private UserPrincipal hrCompany1;
    private UserPrincipal hrCompany2;
    private UserPrincipal staffUser;
    private Application app;
    private JobSummaryDto jobCo1;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(NOW, ZoneOffset.UTC);
        service =
                new RecruitmentProcessServiceImpl(
                        applicationRepository,
                        interviewRoundRepository,
                        historyRepository,
                        jobVerificationClient,
                        identityPublicService,
                        candidatePublicService,
                        cvSnapshotService,
                        matchScoreCalculator,
                        eventPublisher,
                        clock);

        hrCompany1 = new UserPrincipal(4L, "hr1@rikkeijobs.test", "HR", 1L, false);
        hrCompany2 = new UserPrincipal(5L, "hr2@rikkeijobs.test", "HR", 2L, false);
        staffUser = new UserPrincipal(8L, "staff1@rikkeijobs.test", "STAFF", null, false);

        app =
                new Application(
                        1L,
                        1L,
                        2L,
                        "/api/v1/me/applications/3/cv-snapshot",
                        "Cover",
                        ApplicationStatus.SUBMITTED);
        ReflectionTestUtils.setField(app, "id", 3L);

        jobCo1 =
                new JobSummaryDto(
                        1L,
                        "Java Backend",
                        1L,
                        "Rikkeisoft",
                        "APPROVED",
                        OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC).plusDays(30));
    }

    @Test
    @DisplayName(
            "isOfferAllowed returns false when 0 rounds, any PENDING round, last round FAIL, or status != INTERVIEW")
    void shouldEnforceAllIsOfferAllowedEdgeCases() {
        app.setStatus(ApplicationStatus.INTERVIEW);
        when(applicationRepository.findById(3L)).thenReturn(Optional.of(app));

        // 0 rounds -> false
        when(interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(3L))
                .thenReturn(List.of());
        assertFalse(service.isOfferAllowed(3L));

        // 1 PASS + 1 PENDING -> false
        InterviewRound r1Pass = round(1, InterviewResult.PASS);
        InterviewRound r2Pending = round(2, InterviewResult.PENDING);
        when(interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(3L))
                .thenReturn(List.of(r1Pass, r2Pending));
        assertFalse(service.isOfferAllowed(3L));

        // 1 PASS + 1 FAIL -> false
        InterviewRound r2Fail = round(2, InterviewResult.FAIL);
        when(interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(3L))
                .thenReturn(List.of(r1Pass, r2Fail));
        assertFalse(service.isOfferAllowed(3L));

        // 1 PASS + 2 PASS -> true
        InterviewRound r2Pass = round(2, InterviewResult.PASS);
        when(interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(3L))
                .thenReturn(List.of(r1Pass, r2Pass));
        assertTrue(service.isOfferAllowed(3L));

        // Non-INTERVIEW statuses -> false even when rounds are PASS
        for (ApplicationStatus nonInterview :
                List.of(
                        ApplicationStatus.SUBMITTED,
                        ApplicationStatus.SCREENING,
                        ApplicationStatus.OFFER,
                        ApplicationStatus.HIRED,
                        ApplicationStatus.REJECTED,
                        ApplicationStatus.WITHDRAWN)) {
            app.setStatus(nonInterview);
            assertFalse(
                    service.isOfferAllowed(3L),
                    "isOfferAllowed must be false in status " + nonInterview);
        }
    }

    @Test
    @DisplayName(
            "isOfferAllowed returns true when earlier round failed and latest round passed ([FAIL, PASS])")
    void shouldAllowOfferWhenEarlierRoundFailedAndLatestRoundPassed() {
        app.setStatus(ApplicationStatus.INTERVIEW);
        when(applicationRepository.findById(3L)).thenReturn(Optional.of(app));
        InterviewRound r1Fail = round(1, InterviewResult.FAIL);
        InterviewRound r2Pass = round(2, InterviewResult.PASS);
        when(interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(3L))
                .thenReturn(List.of(r1Fail, r2Pass));

        assertTrue(service.isOfferAllowed(3L));
    }

    @Test
    @DisplayName(
            "isOfferAllowed throws ResourceNotFoundException when applicationId is null or non-positive")
    void shouldThrowResourceNotFoundForNullOrNonPositiveApplicationId() {
        assertThrows(ResourceNotFoundException.class, () -> service.isOfferAllowed(null));
        assertThrows(ResourceNotFoundException.class, () -> service.isOfferAllowed(0L));
        assertThrows(ResourceNotFoundException.class, () -> service.isOfferAllowed(-5L));
        verifyNoInteractions(applicationRepository, interviewRoundRepository);
    }

    @Test
    @DisplayName("transitionStatus persists Clock timestamps, history, and publishes mail event")
    void shouldTransitionStatusRecordHistoryAndPublishEvent() {
        when(applicationRepository.findById(3L)).thenReturn(Optional.of(app));
        when(jobVerificationClient.getJobSummary(1L)).thenReturn(jobCo1);
        when(applicationRepository.saveAndFlush(any(Application.class)))
                .thenAnswer(i -> i.getArgument(0));
        when(identityPublicService.getUserById(1L))
                .thenReturn(new UserSummaryDto(1L, "Nguyễn Văn An", "candidate1@rikkeijobs.test"));
        when(interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(3L))
                .thenReturn(List.of());
        when(historyRepository.findByApplicationIdOrderByCreatedAtAscIdAsc(3L))
                .thenReturn(List.of());
        when(matchScoreCalculator.calculateMatchScore(1L, 1L)).thenReturn(88);

        ApplicationProcessDetailResponse response =
                service.transitionStatus(
                        3L,
                        hrCompany1,
                        new TransitionApplicationRequest(
                                ApplicationStatus.SCREENING, "  Đạt vòng hồ sơ  "));

        assertEquals(ApplicationStatus.SCREENING, response.status());
        assertEquals(
                Set.of(ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED),
                response.allowedTransitions());
        assertEquals(88, response.matchScore());
        assertEquals(OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC), response.updatedAt());

        ArgumentCaptor<ApplicationStatusHistory> historyCaptor =
                ArgumentCaptor.forClass(ApplicationStatusHistory.class);
        verify(historyRepository).save(historyCaptor.capture());
        assertEquals(ApplicationStatus.SUBMITTED, historyCaptor.getValue().getFromStatus());
        assertEquals(ApplicationStatus.SCREENING, historyCaptor.getValue().getToStatus());
        assertEquals(4L, historyCaptor.getValue().getActorId());
        assertEquals("Đạt vòng hồ sơ", historyCaptor.getValue().getNote());
        assertEquals(
                OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC),
                historyCaptor.getValue().getCreatedAt());

        ArgumentCaptor<CandidateTransitionNotificationEvent> eventCaptor =
                ArgumentCaptor.forClass(CandidateTransitionNotificationEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals(3L, eventCaptor.getValue().applicationId());
        assertEquals("candidate1@rikkeijobs.test", eventCaptor.getValue().candidateEmail());
        assertEquals(ApplicationStatus.SCREENING, eventCaptor.getValue().toStatus());
    }

    @Test
    @DisplayName(
            "transitionStatus rejects illegal UT-02 transitions including INTERVIEW -> OFFER with 409")
    void shouldRejectIllegalTransitionsWith409() {
        when(applicationRepository.findById(3L)).thenReturn(Optional.of(app));
        when(jobVerificationClient.getJobSummary(1L)).thenReturn(jobCo1);

        // SUBMITTED -> INTERVIEW (skip step)
        assertThrows(
                InvalidTransitionException.class,
                () ->
                        service.transitionStatus(
                                3L,
                                hrCompany1,
                                new TransitionApplicationRequest(
                                        ApplicationStatus.INTERVIEW, "Skip")));

        // INTERVIEW -> OFFER (belongs to UT-07)
        app.setStatus(ApplicationStatus.INTERVIEW);
        assertThrows(
                InvalidTransitionException.class,
                () ->
                        service.transitionStatus(
                                3L,
                                hrCompany1,
                                new TransitionApplicationRequest(
                                        ApplicationStatus.OFFER, "UT-07")));

        verifyNoInteractions(historyRepository, eventPublisher);
    }

    @Test
    @DisplayName(
            "Cross-company HR receives 404 ResourceNotFoundException on detail, snapshot, transition, and rounds")
    void shouldThrow404ForCrossCompanyHr() {
        when(applicationRepository.findById(3L)).thenReturn(Optional.of(app));
        when(applicationRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(app));
        when(jobVerificationClient.getJobSummary(1L)).thenReturn(jobCo1);

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.getApplicationDetail(3L, hrCompany2));
        assertThrows(
                ResourceNotFoundException.class,
                () -> service.getApplicationCvSnapshot(3L, hrCompany2));
        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        service.transitionStatus(
                                3L,
                                hrCompany2,
                                new TransitionApplicationRequest(
                                        ApplicationStatus.SCREENING, "IDOR")));
        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        service.addInterviewRound(
                                3L,
                                hrCompany2,
                                new CreateInterviewRoundRequest(
                                        "Round", "a@b.com", OffsetDateTime.now(clock))));
        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        service.updateInterviewRound(
                                3L,
                                1L,
                                hrCompany2,
                                new UpdateInterviewRoundRequest(
                                        InterviewResult.PASS, BigDecimal.TEN, "ok", 0L)));
    }

    @Test
    @DisplayName("STAFF can read detail and CV snapshot (Option 2A)")
    void shouldAllowStaffReadOnlyDetailAndCvSnapshot() {
        when(applicationRepository.findById(3L)).thenReturn(Optional.of(app));
        when(jobVerificationClient.getJobSummary(1L)).thenReturn(jobCo1);
        when(identityPublicService.getUserById(1L))
                .thenReturn(new UserSummaryDto(1L, "Nguyễn Văn An", "candidate1@rikkeijobs.test"));
        when(interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(3L))
                .thenReturn(List.of());
        when(historyRepository.findByApplicationIdOrderByCreatedAtAscIdAsc(3L))
                .thenReturn(List.of());
        when(matchScoreCalculator.calculateMatchScore(1L, 1L)).thenReturn(75);
        when(cvSnapshotService.getSnapshot(3L))
                .thenReturn(new CvSnapshotDownload("cv.pdf", new byte[] {1, 2, 3}));

        ApplicationProcessDetailResponse detail = service.getApplicationDetail(3L, staffUser);
        assertEquals(3L, detail.id());
        assertEquals(75, detail.matchScore());

        CvSnapshotDownload snap = service.getApplicationCvSnapshot(3L, staffUser);
        assertEquals("cv.pdf", snap.originalFilename());
    }

    @ParameterizedTest
    @EnumSource(
            value = ApplicationStatus.class,
            names = {"SUBMITTED", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"})
    @DisplayName(
            "addInterviewRound throws 409 INVALID_APPLICATION_STATE outside SCREENING and INTERVIEW")
    void shouldRejectAddRoundOutsideScreeningAndInterview(ApplicationStatus status) {
        app.setStatus(status);
        when(applicationRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(app));
        when(jobVerificationClient.getJobSummary(1L)).thenReturn(jobCo1);

        InvalidApplicationStateException ex =
                assertThrows(
                        InvalidApplicationStateException.class,
                        () ->
                                service.addInterviewRound(
                                        3L,
                                        hrCompany1,
                                        new CreateInterviewRoundRequest(
                                                "Vòng 1",
                                                "lead@rikkeisoft.test",
                                                OffsetDateTime.now(clock).plusDays(1))));
        assertEquals("INVALID_APPLICATION_STATE", ex.getCode());
    }

    @Test
    @DisplayName(
            "addInterviewRound succeeds in SCREENING using pessimistic lock + maxRoundNo + 1 + Clock")
    void shouldAddRoundWithMonotonicRoundNoAndClock() {
        app.setStatus(ApplicationStatus.SCREENING);
        when(applicationRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(app));
        when(jobVerificationClient.getJobSummary(1L)).thenReturn(jobCo1);
        when(interviewRoundRepository.findMaxRoundNoByApplicationId(3L)).thenReturn(2);
        when(interviewRoundRepository.saveAndFlush(any(InterviewRound.class)))
                .thenAnswer(
                        inv -> {
                            InterviewRound r = inv.getArgument(0);
                            ReflectionTestUtils.setField(r, "id", 10L);
                            return r;
                        });

        InterviewRoundResponse response =
                service.addInterviewRound(
                        3L,
                        hrCompany1,
                        new CreateInterviewRoundRequest(
                                "  Vòng 3  ",
                                "  lead@rikkeisoft.test  ",
                                OffsetDateTime.now(clock).plusDays(2)));

        assertEquals(10L, response.id());
        assertEquals(3, response.roundNo());
        assertEquals("Vòng 3", response.name());
        assertEquals("lead@rikkeisoft.test", response.interviewerEmail());
        assertEquals(InterviewResult.PENDING, response.result());
        assertEquals(OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC), response.createdAt());
    }

    @ParameterizedTest
    @EnumSource(
            value = ApplicationStatus.class,
            names = {"SUBMITTED", "SCREENING", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"})
    @DisplayName("updateInterviewRound throws 409 INVALID_APPLICATION_STATE outside INTERVIEW")
    void shouldRejectUpdateRoundOutsideInterview(ApplicationStatus status) {
        app.setStatus(status);
        when(applicationRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(app));
        when(jobVerificationClient.getJobSummary(1L)).thenReturn(jobCo1);

        InvalidApplicationStateException ex =
                assertThrows(
                        InvalidApplicationStateException.class,
                        () ->
                                service.updateInterviewRound(
                                        3L,
                                        1L,
                                        hrCompany1,
                                        new UpdateInterviewRoundRequest(
                                                InterviewResult.PASS,
                                                new BigDecimal("90.00"),
                                                "Good",
                                                0L)));
        assertEquals("INVALID_APPLICATION_STATE", ex.getCode());
    }

    @Test
    @DisplayName("updateInterviewRound throws 404 when round missing and 409 when version is stale")
    void shouldEnforceRoundNotFoundAndStaleVersionConflict() {
        app.setStatus(ApplicationStatus.INTERVIEW);
        when(applicationRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(app));
        when(jobVerificationClient.getJobSummary(1L)).thenReturn(jobCo1);
        when(interviewRoundRepository.findByIdAndApplicationId(99L, 3L))
                .thenReturn(Optional.empty());

        assertThrows(
                InterviewRoundNotFoundException.class,
                () ->
                        service.updateInterviewRound(
                                3L,
                                99L,
                                hrCompany1,
                                new UpdateInterviewRoundRequest(
                                        InterviewResult.PASS, BigDecimal.TEN, "ok", 0L)));

        InterviewRound existing = round(1, InterviewResult.PENDING);
        existing.setVersion(2L);
        when(interviewRoundRepository.findByIdAndApplicationId(1L, 3L))
                .thenReturn(Optional.of(existing));

        assertThrows(
                ConflictException.class,
                () ->
                        service.updateInterviewRound(
                                3L,
                                1L,
                                hrCompany1,
                                new UpdateInterviewRoundRequest(
                                        InterviewResult.PASS, BigDecimal.TEN, "stale", 1L)));

        assertThrows(
                ConflictException.class,
                () ->
                        service.updateInterviewRound(
                                3L,
                                1L,
                                hrCompany1,
                                new UpdateInterviewRoundRequest(
                                        InterviewResult.PASS,
                                        BigDecimal.TEN,
                                        "null version",
                                        null)));
    }

    @Test
    @DisplayName(
            "getStaffApplications validates pagination bounds and skips query on company/job mismatch")
    void shouldValidatePaginationAndShortCircuitCompanyJobMismatch() {
        assertThrows(
                ValidationException.class,
                () -> service.getStaffApplications(null, null, null, 0, 20));
        assertThrows(
                ValidationException.class,
                () -> service.getStaffApplications(null, null, null, 1, 101));

        when(jobVerificationClient.isOwnedByCompany(2L, 1L)).thenReturn(false);
        PageResponse<StaffApplicationSummaryResponse> empty =
                service.getStaffApplications(1L, 2L, null, 1, 20);
        assertTrue(empty.items().isEmpty());
        assertEquals(0L, empty.totalItems());
        verifyNoInteractions(applicationRepository);
    }

    private InterviewRound round(int roundNo, InterviewResult result) {
        InterviewRound r =
                new InterviewRound(
                        3L,
                        roundNo,
                        "Vòng " + roundNo,
                        "interviewer@rikkeisoft.test",
                        OffsetDateTime.now(clock));
        r.setResult(result);
        return r;
    }
}
