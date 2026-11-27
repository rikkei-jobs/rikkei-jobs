package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;

/**
 * Immutable domain event published when an application status transitions in UT-02, consumed after
 * commit to email the candidate.
 */
public record CandidateTransitionNotificationEvent(
        Long applicationId,
        Long candidateUserId,
        String candidateEmail,
        String candidateName,
        String jobTitle,
        String companyName,
        ApplicationStatus fromStatus,
        ApplicationStatus toStatus,
        String note) {}
