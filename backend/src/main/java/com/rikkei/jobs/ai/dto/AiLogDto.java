package com.rikkei.jobs.ai.dto;

import com.rikkei.jobs.ai.model.AiFeature;
import com.rikkei.jobs.ai.model.AiLogStatus;
import com.rikkei.jobs.ai.service.AiProvider;
import java.time.OffsetDateTime;

public record AiLogDto(
        long id,
        long userId,
        AiFeature feature,
        AiProvider provider,
        String model,
        String promptMasked,
        String response,
        Integer tokensIn,
        Integer tokensOut,
        long latencyMs,
        AiLogStatus status,
        OffsetDateTime createdAt) {}
