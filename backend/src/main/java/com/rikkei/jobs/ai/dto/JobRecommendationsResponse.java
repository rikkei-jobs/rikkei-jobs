package com.rikkei.jobs.ai.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record JobRecommendationsResponse(
        List<JobRecommendationDto> items,
        Integer total,
        Long candidateId,
        Boolean isCached,
        OffsetDateTime cachedAt,
        String activeProvider) {}
