package com.rikkei.jobs.ai.dto;

import com.rikkei.jobs.ai.service.AiProvider;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AiConfigDto(
        long id,
        AiProvider provider,
        String model,
        BigDecimal temperature,
        int maxTokens,
        int dailyLimitPerUser,
        boolean enabled,
        Long updatedBy,
        OffsetDateTime updatedAt,
        long version) {}
