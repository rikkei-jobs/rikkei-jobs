package com.rikkei.jobs.ai.dto;

import com.rikkei.jobs.ai.model.AiFeature;
import java.time.LocalDate;
import java.util.List;

public record AiUsageSummary(
        String timezone,
        LocalDate from,
        LocalDate to,
        List<UsageBucket> daily,
        List<UsageBucket> byFeature) {
    public AiUsageSummary {
        daily = List.copyOf(daily);
        byFeature = List.copyOf(byFeature);
    }

    public record UsageBucket(
            LocalDate date,
            AiFeature feature,
            long calls,
            long ok,
            long errors,
            long blocked,
            long tokensIn,
            long tokensOut,
            long unknownTokenCalls) {}
}
