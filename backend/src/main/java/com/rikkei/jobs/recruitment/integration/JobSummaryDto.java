package com.rikkei.jobs.recruitment.integration;

import java.time.OffsetDateTime;

/** Immutable DTO representing essential job details queried across module boundary. */
public record JobSummaryDto(
        Long id,
        String title,
        String companyName,
        String status, // e.g., "APPROVED", "DRAFT", "CLOSED"
        OffsetDateTime deadline,
        String hrEmail) {

    public boolean isApprovedAndNotExpired() {
        boolean isApproved = "APPROVED".equalsIgnoreCase(status);
        boolean notExpired = deadline == null || deadline.isAfter(OffsetDateTime.now());
        return isApproved && notExpired;
    }
}
