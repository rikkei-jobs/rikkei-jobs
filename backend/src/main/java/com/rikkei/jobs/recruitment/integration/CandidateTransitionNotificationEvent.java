package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;

/** Domain event dispatched when an application's recruitment status transitions (UT-02). */
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
