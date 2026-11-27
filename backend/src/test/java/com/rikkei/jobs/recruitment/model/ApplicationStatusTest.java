package com.rikkei.jobs.recruitment.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

@DisplayName("ApplicationStatus State Machine Unit Tests")
class ApplicationStatusTest {

    static Stream<Arguments> allTransitionPairs() {
        return Stream.of(ApplicationStatus.values())
                .flatMap(
                        from ->
                                Stream.of(ApplicationStatus.values())
                                        .map(
                                                to ->
                                                        Arguments.of(
                                                                from,
                                                                to,
                                                                expectedTransition(from, to))));
    }

    private static boolean expectedTransition(ApplicationStatus from, ApplicationStatus to) {
        return switch (from) {
            case SUBMITTED -> to == ApplicationStatus.SCREENING || to == ApplicationStatus.REJECTED;
            case SCREENING -> to == ApplicationStatus.INTERVIEW || to == ApplicationStatus.REJECTED;
            case INTERVIEW -> to == ApplicationStatus.OFFER || to == ApplicationStatus.REJECTED;
            case OFFER -> to == ApplicationStatus.HIRED || to == ApplicationStatus.REJECTED;
            case HIRED, REJECTED, WITHDRAWN -> false;
        };
    }

    @ParameterizedTest(name = "{0} -> {1} allowed={2}")
    @MethodSource("allTransitionPairs")
    @DisplayName("All 49 status transition pairs follow the UT-01/UT-07 full domain state machine")
    void shouldVerifyAllFortyNineTransitions(
            ApplicationStatus from, ApplicationStatus to, boolean expectedAllowed) {
        assertEquals(expectedAllowed, from.canTransitionTo(to));
    }

    static Stream<Arguments> allUt02TransitionPairs() {
        return Stream.of(ApplicationStatus.values())
                .flatMap(
                        from ->
                                Stream.of(ApplicationStatus.values())
                                        .map(
                                                to ->
                                                        Arguments.of(
                                                                from,
                                                                to,
                                                                expectedUt02Transition(from, to))));
    }

    private static boolean expectedUt02Transition(ApplicationStatus from, ApplicationStatus to) {
        return switch (from) {
            case SUBMITTED -> to == ApplicationStatus.SCREENING || to == ApplicationStatus.REJECTED;
            case SCREENING -> to == ApplicationStatus.INTERVIEW || to == ApplicationStatus.REJECTED;
            case INTERVIEW -> to == ApplicationStatus.REJECTED;
            case OFFER, HIRED, REJECTED, WITHDRAWN -> false;
        };
    }

    @ParameterizedTest(name = "UT-02: {0} -> {1} allowed={2}")
    @MethodSource("allUt02TransitionPairs")
    @DisplayName("All 49 status transition pairs follow the strict UT-02 API state machine")
    void shouldVerifyAllFortyNineUt02Transitions(
            ApplicationStatus from, ApplicationStatus to, boolean expectedAllowed) {
        assertEquals(expectedAllowed, from.canTransitionInUt02(to));
        assertEquals(expectedAllowed, from.allowedUt02Transitions().contains(to));
    }

    @ParameterizedTest(name = "canWithdraw({0})")
    @EnumSource(ApplicationStatus.class)
    @DisplayName("canWithdraw is true only for SUBMITTED, SCREENING, and INTERVIEW")
    void shouldAllowWithdrawOnlyBeforeOffer(ApplicationStatus status) {
        Set<ApplicationStatus> withdrawable =
                EnumSet.of(
                        ApplicationStatus.SUBMITTED,
                        ApplicationStatus.SCREENING,
                        ApplicationStatus.INTERVIEW);
        if (withdrawable.contains(status)) {
            assertTrue(status.canWithdraw(), status + " should be withdrawable");
        } else {
            assertFalse(status.canWithdraw(), status + " must NOT be withdrawable");
        }
    }

    @ParameterizedTest(name = "isOpen/isTerminal({0})")
    @EnumSource(ApplicationStatus.class)
    @DisplayName("isOpen and isTerminal partition the 7 application statuses")
    void shouldPartitionOpenAndTerminalStatuses(ApplicationStatus status) {
        Set<ApplicationStatus> terminal =
                EnumSet.of(
                        ApplicationStatus.HIRED,
                        ApplicationStatus.REJECTED,
                        ApplicationStatus.WITHDRAWN);
        if (terminal.contains(status)) {
            assertTrue(status.isTerminal());
            assertFalse(status.isOpen());
        } else {
            assertFalse(status.isTerminal());
            assertTrue(status.isOpen());
        }
    }
}
