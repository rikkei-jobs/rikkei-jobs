package com.rikkei.jobs.recruitment.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@DisplayName("ApplicationStatusTransitionMatrix Unit Tests (UT-02)")
class ApplicationStatusTransitionMatrixTest {

    @ParameterizedTest(name = "Transition from {0} to {1} should be valid")
    @CsvSource({
        "SUBMITTED, SCREENING",
        "SUBMITTED, REJECTED",
        "SCREENING, INTERVIEW",
        "SCREENING, REJECTED",
        "INTERVIEW, REJECTED",
        "OFFER, HIRED",
        "OFFER, REJECTED"
    })
    void shouldAllowValidTransitions(ApplicationStatus from, ApplicationStatus to) {
        assertThat(ApplicationStatusTransitionMatrix.isValidTransition(from, to)).isTrue();
    }

    @ParameterizedTest(name = "Transition from {0} to {1} must be rejected")
    @CsvSource({
        "SUBMITTED, INTERVIEW",
        "SUBMITTED, OFFER",
        "SUBMITTED, HIRED",
        "SCREENING, SUBMITTED",
        "SCREENING, OFFER",
        "SCREENING, HIRED",
        "INTERVIEW, SUBMITTED",
        "INTERVIEW, SCREENING",
        "INTERVIEW, OFFER",
        "INTERVIEW, HIRED",
        "OFFER, SUBMITTED",
        "OFFER, SCREENING",
        "OFFER, INTERVIEW",
        "HIRED, SUBMITTED",
        "HIRED, REJECTED",
        "REJECTED, SUBMITTED",
        "REJECTED, SCREENING",
        "WITHDRAWN, SUBMITTED",
        "WITHDRAWN, SCREENING"
    })
    void shouldRejectInvalidAndBackwardTransitions(ApplicationStatus from, ApplicationStatus to) {
        assertThat(ApplicationStatusTransitionMatrix.isValidTransition(from, to)).isFalse();
    }

    @Test
    @DisplayName("Should return empty allowed next statuses for terminal states")
    void shouldReturnEmptyForTerminalStates() {
        assertThat(
                        ApplicationStatusTransitionMatrix.getAllowedNextStatuses(
                                ApplicationStatus.HIRED))
                .isEmpty();
        assertThat(
                        ApplicationStatusTransitionMatrix.getAllowedNextStatuses(
                                ApplicationStatus.REJECTED))
                .isEmpty();
        assertThat(
                        ApplicationStatusTransitionMatrix.getAllowedNextStatuses(
                                ApplicationStatus.WITHDRAWN))
                .isEmpty();
    }

    @Test
    @DisplayName("Should return correct allowed statuses for non-terminal states")
    void shouldReturnCorrectAllowedStatuses() {
        Set<ApplicationStatus> submittedNext =
                ApplicationStatusTransitionMatrix.getAllowedNextStatuses(
                        ApplicationStatus.SUBMITTED);
        assertThat(submittedNext)
                .containsExactlyInAnyOrder(ApplicationStatus.SCREENING, ApplicationStatus.REJECTED);

        Set<ApplicationStatus> screeningNext =
                ApplicationStatusTransitionMatrix.getAllowedNextStatuses(
                        ApplicationStatus.SCREENING);
        assertThat(screeningNext)
                .containsExactlyInAnyOrder(ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED);

        Set<ApplicationStatus> interviewNext =
                ApplicationStatusTransitionMatrix.getAllowedNextStatuses(
                        ApplicationStatus.INTERVIEW);
        assertThat(interviewNext).containsExactly(ApplicationStatus.REJECTED);
    }

    @Test
    @DisplayName("Should handle null status safely")
    void shouldHandleNullSafely() {
        assertThat(
                        ApplicationStatusTransitionMatrix.isValidTransition(
                                null, ApplicationStatus.SCREENING))
                .isFalse();
        assertThat(
                        ApplicationStatusTransitionMatrix.isValidTransition(
                                ApplicationStatus.SUBMITTED, null))
                .isFalse();
        assertThat(ApplicationStatusTransitionMatrix.getAllowedNextStatuses(null)).isEmpty();
    }
}
