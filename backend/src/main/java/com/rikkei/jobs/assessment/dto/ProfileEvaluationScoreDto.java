package com.rikkei.jobs.assessment.dto;

import java.math.BigDecimal;

/** Immutable DTO transfer object for score details in an evaluation for candidate profile. */
public record ProfileEvaluationScoreDto(
        Long criterionId,
        String criteriaName,
        String skillCode,
        BigDecimal score,
        String comment) {}
