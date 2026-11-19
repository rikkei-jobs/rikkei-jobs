package com.rikkei.jobs.recruitment.integration;

/** Domain event dispatched when a candidate successfully submits a new job application. */
public record ApplicationSubmittedEvent(
        Long applicationId,
        Long jobId,
        String jobTitle,
        String companyName,
        Long candidateUserId,
        String hrEmail) {}
