package com.rikkei.jobs.internship.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record InternshipTaskResponse(
    Long id,
    String title,
    BigDecimal acceptedScore,
    OffsetDateTime acceptedAt
) {
}
