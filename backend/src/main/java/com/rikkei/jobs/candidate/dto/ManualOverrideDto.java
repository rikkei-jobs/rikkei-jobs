package com.rikkei.jobs.candidate.dto;

import java.time.OffsetDateTime;

/** Immutable audit entry DTO for a staff manual override. */
public record ManualOverrideDto(
        Long id,
        String field,
        String value,
        String reason,
        Long staffId,
        String staffName,
        OffsetDateTime createdAt) {}
