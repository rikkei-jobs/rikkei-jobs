package com.rikkei.jobs.candidate.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Immutable DTO transfer object for mentor evaluation evidence passed from assessment module to
 * candidate module.
 */
public record MentorSkillEvidenceDto(
        Integer skillId,
        String skillCode,
        BigDecimal score,
        BigDecimal weight,
        Long evaluationId,
        String title,
        OffsetDateTime recordedAt) {}
