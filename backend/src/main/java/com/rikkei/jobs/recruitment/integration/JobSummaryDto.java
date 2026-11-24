package com.rikkei.jobs.recruitment.integration;

import java.time.OffsetDateTime;

/** Immutable DTO representing essential job details queried across module boundary. */
public record JobSummaryDto(
        Long id,
        String title,
        Long companyId,
        String companyName,
        String status,
        OffsetDateTime deadline) {}
