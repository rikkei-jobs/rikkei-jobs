package com.rikkei.jobs.assessment.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Immutable DTO transfer object for evaluation summary passed from assessment module to candidate
 * module.
 */
public record ProfileEvaluationDto(
        Long id,
        Long mentorId,
        Long templateId,
        String context,
        String overallComment,
        OffsetDateTime submittedAt,
        List<ProfileEvaluationScoreDto> scores) {}
