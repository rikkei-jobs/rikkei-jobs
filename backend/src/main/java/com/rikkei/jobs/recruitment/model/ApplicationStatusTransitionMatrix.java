package com.rikkei.jobs.recruitment.model;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Encapsulates the strict business rules for recruitment application status transitions (UT-02).
 * Rules: - SUBMITTED -> SCREENING | REJECTED - SCREENING -> INTERVIEW | REJECTED - INTERVIEW ->
 * REJECTED (Offer transition is strictly reserved for UT-07 offer flow when all rounds pass) -
 * OFFER -> HIRED | REJECTED (Handled by UT-07) - HIRED, REJECTED, WITHDRAWN -> Terminal, no
 * transitions allowed.
 */
public final class ApplicationStatusTransitionMatrix {

    private static final Map<ApplicationStatus, Set<ApplicationStatus>> VALID_TRANSITIONS;

    static {
        Map<ApplicationStatus, Set<ApplicationStatus>> map = new EnumMap<>(ApplicationStatus.class);
        map.put(
                ApplicationStatus.SUBMITTED,
                EnumSet.of(ApplicationStatus.SCREENING, ApplicationStatus.REJECTED));
        map.put(
                ApplicationStatus.SCREENING,
                EnumSet.of(ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED));
        map.put(ApplicationStatus.INTERVIEW, EnumSet.of(ApplicationStatus.REJECTED));
        map.put(
                ApplicationStatus.OFFER,
                EnumSet.of(ApplicationStatus.HIRED, ApplicationStatus.REJECTED));
        map.put(ApplicationStatus.HIRED, Collections.emptySet());
        map.put(ApplicationStatus.REJECTED, Collections.emptySet());
        map.put(ApplicationStatus.WITHDRAWN, Collections.emptySet());
        VALID_TRANSITIONS = Collections.unmodifiableMap(map);
    }

    private ApplicationStatusTransitionMatrix() {}

    public static boolean isValidTransition(ApplicationStatus from, ApplicationStatus to) {
        if (from == null || to == null) {
            return false;
        }
        Set<ApplicationStatus> allowed = VALID_TRANSITIONS.get(from);
        return allowed != null && allowed.contains(to);
    }

    public static Set<ApplicationStatus> getAllowedNextStatuses(ApplicationStatus from) {
        if (from == null) {
            return Collections.emptySet();
        }
        return VALID_TRANSITIONS.getOrDefault(from, Collections.emptySet());
    }
}
