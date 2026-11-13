package com.rikkei.jobs.candidate.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** One evidence behind a skill: where it came from, its score and when it was recorded. */
public record EvidenceDto(
        String source,
        String title,
        BigDecimal score,
        OffsetDateTime recordedAt,
        boolean verified) {}
