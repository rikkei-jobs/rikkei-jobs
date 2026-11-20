package com.rikkei.jobs.recruitment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.company.repository.CompanyRepository;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.recruitment.dto.ApplicationProcessDetailResponse;
import com.rikkei.jobs.recruitment.dto.CreateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.dto.InterviewRoundResponse;
import com.rikkei.jobs.recruitment.dto.TransitionApplicationRequest;
import com.rikkei.jobs.recruitment.dto.UpdateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.exception.InvalidTransitionException;
import com.rikkei.jobs.recruitment.exception.RecruitmentAccessDeniedException;
import com.rikkei.jobs.recruitment.integration.CandidateTransitionNotificationEvent;
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
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecruitmentProcessService Unit Tests (UT-02)")
class RecruitmentProcessServiceTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private InterviewRoundRepository interviewRoundRepository;
    @Mock private ApplicationStatusHistoryRepository historyRepository;
    @Mock private UserRepository userRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private JobVerificationClient jobVerificationClient;
    @Mock private MatchScoreCalculator matchScoreCalculator;
    @Mock private ApplicationEventPublisher eventPublisher;

    private RecruitmentProcessServiceImpl service;

    private Application testApp;
    private JobSummaryDto testJob;
    private User testCandidate;

    @BeforeEach
    void setUp() {
        service =
                new RecruitmentProcessServiceImpl(
                        applicationRepository,
                        interviewRoundRepository,
                        historyRepository,
                        userRepository,
                        companyRepository,
                        jobVerificationClient,
                        matchScoreCalculator,
                        eventPublisher);

        testApp =
                new Application(
                        101L,
                        1L,
                        1L,
                        "/snapshots/cv_1.pdf",
                        "Cover letter text",
                        ApplicationStatus.SUBMITTED);
        ReflectionTestUtils.setField(testApp, "id", 10L);

        testJob =
                new JobSummaryDto(
                        101L,
                        "Backend Java Developer",
                        "Rikkei Digital",
                        "APPROVED",
                        OffsetDateTime.now().plusDays(30),
                        "hr@rikkeidigital.com");

        testCandidate = new User("candidate1@rikkeijobs.test", "hash", "Nguyễn Văn An", "lms-1", 1);
        ReflectionTestUtils.setField(testCandidate, "id", 1L);
    }

    @Test
    @DisplayName("Should successfully transition SUBMITTED to SCREENING")
    void shouldTransitionSubmittedToScreening() {
        when(applicationRepository.findById(10L)).thenReturn(Optional.of(testApp));
        when(jobVerificationClient.isOwnedByHr(101L, 4L)).thenReturn(true);
        when(applicationRepository.save(any(Application.class))).thenAnswer(i -> i.getArgument(0));
        when(jobVerificationClient.getJobSummary(101L)).thenReturn(testJob);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testCandidate));
        when(matchScoreCalculator.calculateMatchScore(101L, 1L)).thenReturn(88);
        when(interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(10L))
                .thenReturn(Collections.emptyList());
        when(historyRepository.findByApplicationIdOrderByCreatedAtAsc(10L))
                .thenReturn(Collections.emptyList());

        TransitionApplicationRequest request =
                new TransitionApplicationRequest(
                        ApplicationStatus.SCREENING, "Hồ sơ đạt yêu cầu vòng loại.");

        ApplicationProcessDetailResponse response = service.transitionStatus(10L, 4L, request);

        assertThat(response.status()).isEqualTo(ApplicationStatus.SCREENING);
        assertThat(testApp.getStatus()).isEqualTo(ApplicationStatus.SCREENING);
        verify(historyRepository).save(any(ApplicationStatusHistory.class));
        verify(eventPublisher).publishEvent(any(CandidateTransitionNotificationEvent.class));
    }

    @Test
    @DisplayName(
            "Should reject invalid transition SUBMITTED to INTERVIEW with 409 INVALID_TRANSITION")
    void shouldRejectInvalidTransition() {
        when(applicationRepository.findById(10L)).thenReturn(Optional.of(testApp));
        when(jobVerificationClient.isOwnedByHr(101L, 4L)).thenReturn(true);

        TransitionApplicationRequest request =
                new TransitionApplicationRequest(
                        ApplicationStatus.INTERVIEW, "Chuyển thẳng phỏng vấn.");

        assertThatThrownBy(() -> service.transitionStatus(10L, 4L, request))
                .isInstanceOf(InvalidTransitionException.class)
                .hasMessageContaining(
                        "Không thể chuyển trạng thái từ 'SUBMITTED' sang 'INTERVIEW'");
    }

    @Test
    @DisplayName("Should forbid direct transition to OFFER via transition API")
    void shouldForbidDirectTransitionToOffer() {
        testApp.setStatus(ApplicationStatus.INTERVIEW);
        when(applicationRepository.findById(10L)).thenReturn(Optional.of(testApp));
        when(jobVerificationClient.isOwnedByHr(101L, 4L)).thenReturn(true);

        TransitionApplicationRequest request =
                new TransitionApplicationRequest(ApplicationStatus.OFFER, "Chuyển sang Offer");

        assertThatThrownBy(() -> service.transitionStatus(10L, 4L, request))
                .isInstanceOf(InvalidTransitionException.class);
    }

    @Test
    @DisplayName("Should reject status transition if HR does not own the JD (403 FORBIDDEN)")
    void shouldRejectTransitionForNonOwnerHr() {
        when(applicationRepository.findById(10L)).thenReturn(Optional.of(testApp));
        when(jobVerificationClient.isOwnedByHr(101L, 999L)).thenReturn(false);

        TransitionApplicationRequest request =
                new TransitionApplicationRequest(ApplicationStatus.SCREENING, "Note");

        assertThatThrownBy(() -> service.transitionStatus(10L, 999L, request))
                .isInstanceOf(RecruitmentAccessDeniedException.class);
    }

    @Test
    @DisplayName("Should add new interview round with sequential round_no")
    void shouldAddInterviewRound() {
        when(applicationRepository.findById(10L)).thenReturn(Optional.of(testApp));
        when(jobVerificationClient.isOwnedByHr(101L, 4L)).thenReturn(true);
        when(interviewRoundRepository.countByApplicationId(10L)).thenReturn(1);

        InterviewRound savedRound =
                new InterviewRound(
                        10L,
                        2,
                        "Phỏng vấn vòng 2",
                        "lead@company.com",
                        OffsetDateTime.now().plusDays(2));
        ReflectionTestUtils.setField(savedRound, "id", 102L);

        when(interviewRoundRepository.save(any(InterviewRound.class))).thenReturn(savedRound);

        CreateInterviewRoundRequest request =
                new CreateInterviewRoundRequest(
                        "Phỏng vấn vòng 2", "lead@company.com", OffsetDateTime.now().plusDays(2));

        InterviewRoundResponse response = service.addInterviewRound(10L, 4L, request);

        assertThat(response.id()).isEqualTo(102L);
        assertThat(response.roundNo()).isEqualTo(2);
        assertThat(response.name()).isEqualTo("Phỏng vấn vòng 2");
        assertThat(response.result()).isEqualTo(InterviewResult.PENDING);
    }

    @Test
    @DisplayName("Should update interview round result, score, and note")
    void shouldUpdateInterviewRound() {
        when(applicationRepository.findById(10L)).thenReturn(Optional.of(testApp));
        when(jobVerificationClient.isOwnedByHr(101L, 4L)).thenReturn(true);

        InterviewRound round =
                new InterviewRound(10L, 1, "Vòng 1", "lead@company.com", OffsetDateTime.now());
        ReflectionTestUtils.setField(round, "id", 50L);

        when(interviewRoundRepository.findByIdAndApplicationId(50L, 10L))
                .thenReturn(Optional.of(round));
        when(interviewRoundRepository.save(any(InterviewRound.class)))
                .thenAnswer(i -> i.getArgument(0));

        UpdateInterviewRoundRequest request =
                new UpdateInterviewRoundRequest(
                        InterviewResult.PASS, new BigDecimal("85.50"), "Ứng viên trả lời xuất sắc");

        InterviewRoundResponse response = service.updateInterviewRound(10L, 50L, 4L, request);

        assertThat(response.result()).isEqualTo(InterviewResult.PASS);
        assertThat(response.score()).isEqualTo(new BigDecimal("85.50"));
        assertThat(response.note()).isEqualTo("Ứng viên trả lời xuất sắc");
    }

    @Test
    @DisplayName(
            "Should evaluate canSendOffer correctly when all rounds pass and last round passes")
    void shouldEvaluateCanSendOfferCorrectly() {
        testApp.setStatus(ApplicationStatus.INTERVIEW);

        InterviewRound round1 =
                new InterviewRound(10L, 1, "Vòng 1", "lead@company.com", OffsetDateTime.now());
        round1.setResult(InterviewResult.PASS);
        InterviewRound round2 =
                new InterviewRound(10L, 2, "Vòng 2", "hr@company.com", OffsetDateTime.now());
        round2.setResult(InterviewResult.PASS);

        when(applicationRepository.findById(10L)).thenReturn(Optional.of(testApp));
        when(interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(10L))
                .thenReturn(List.of(round1, round2));
        when(jobVerificationClient.getJobSummary(101L)).thenReturn(testJob);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testCandidate));
        when(matchScoreCalculator.calculateMatchScore(101L, 1L)).thenReturn(90);

        // Staff viewing
        ApplicationProcessDetailResponse response = service.getApplicationDetail(10L, 7L, true);

        assertThat(response.canSendOffer()).isTrue();
    }

    @Test
    @DisplayName("canSendOffer must be false if any round is still PENDING")
    void canSendOfferMustBeFalseIfAnyRoundPending() {
        testApp.setStatus(ApplicationStatus.INTERVIEW);

        InterviewRound round1 =
                new InterviewRound(10L, 1, "Vòng 1", "lead@company.com", OffsetDateTime.now());
        round1.setResult(InterviewResult.PASS);
        InterviewRound round2 =
                new InterviewRound(10L, 2, "Vòng 2", "hr@company.com", OffsetDateTime.now());
        round2.setResult(InterviewResult.PENDING);

        when(applicationRepository.findById(10L)).thenReturn(Optional.of(testApp));
        when(interviewRoundRepository.findByApplicationIdOrderByRoundNoAsc(10L))
                .thenReturn(List.of(round1, round2));
        when(jobVerificationClient.getJobSummary(101L)).thenReturn(testJob);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testCandidate));
        when(matchScoreCalculator.calculateMatchScore(101L, 1L)).thenReturn(90);

        ApplicationProcessDetailResponse response = service.getApplicationDetail(10L, 7L, true);

        assertThat(response.canSendOffer()).isFalse();
    }
}
