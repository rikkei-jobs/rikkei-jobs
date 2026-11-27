package com.rikkei.jobs.company.dto;

import java.time.OffsetDateTime;

/** Immutable job summary and eligibility projection exposed across module boundaries (Rule 14). */
public record JobApplicationInfoDto(
        Long id,
        String title,
        Long companyId,
        String companyName,
        String status,
        OffsetDateTime deadline) {}
