package com.rikkei.jobs.ai.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@Validated
@ConfigurationProperties(prefix = "app.ai")
public class AiGovernanceProperties {

    private long configCacheTtlMs = 5000L;

    @Min(1)
    private int logRetentionDays = 90;

    @Min(1)
    private int logRetentionBatchSize = 5000;

    @Min(1)
    private long logRetentionTimeBudgetMs = 10000L;

    @NotBlank private String logRetentionCron = "0 15 2 * * *";

    @Min(1)
    private int logRetentionMaxBatches = 1000;

    public long getConfigCacheTtlMs() {
        return configCacheTtlMs;
    }

    public void setConfigCacheTtlMs(long configCacheTtlMs) {
        this.configCacheTtlMs = configCacheTtlMs;
    }

    public int getLogRetentionDays() {
        return logRetentionDays;
    }

    public void setLogRetentionDays(int logRetentionDays) {
        if (logRetentionDays < 1) {
            throw new IllegalArgumentException("logRetentionDays must be >= 1");
        }
        this.logRetentionDays = logRetentionDays;
    }

    public int getLogRetentionBatchSize() {
        return logRetentionBatchSize;
    }

    public void setLogRetentionBatchSize(int logRetentionBatchSize) {
        if (logRetentionBatchSize < 1) {
            throw new IllegalArgumentException("logRetentionBatchSize must be >= 1");
        }
        this.logRetentionBatchSize = logRetentionBatchSize;
    }

    public long getLogRetentionTimeBudgetMs() {
        return logRetentionTimeBudgetMs;
    }

    public void setLogRetentionTimeBudgetMs(long logRetentionTimeBudgetMs) {
        if (logRetentionTimeBudgetMs < 1) {
            throw new IllegalArgumentException("logRetentionTimeBudgetMs must be >= 1");
        }
        this.logRetentionTimeBudgetMs = logRetentionTimeBudgetMs;
    }

    public String getLogRetentionCron() {
        return logRetentionCron;
    }

    public void setLogRetentionCron(String logRetentionCron) {
        this.logRetentionCron = logRetentionCron;
    }

    public int getLogRetentionMaxBatches() {
        return logRetentionMaxBatches;
    }

    public void setLogRetentionMaxBatches(int logRetentionMaxBatches) {
        if (logRetentionMaxBatches < 1) {
            throw new IllegalArgumentException("logRetentionMaxBatches must be >= 1");
        }
        this.logRetentionMaxBatches = logRetentionMaxBatches;
    }
}
