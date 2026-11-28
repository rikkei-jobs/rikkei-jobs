package com.rikkei.jobs.candidate.dto;

import com.rikkei.jobs.candidate.model.ExternalSource;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/** API response DTO representing a synced external record and its manual override history. */
public record ExternalRecordResponse(
        Long id,
        Long userId,
        ExternalSource source,
        String sourceCode,
        String sourceKey,
        String title,
        BigDecimal score,
        OffsetDateTime recordedAt,
        Map<String, Object> payload,
        OffsetDateTime syncedAt,
        List<ManualOverrideDto> overrides) {}
