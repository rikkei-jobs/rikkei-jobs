package com.rikkei.jobs.candidate.dto;

/** Aggregated per-source counts recorded inside {@code sync_runs.counts}. */
public record SyncCounts(SourceSyncCounts lms, SourceSyncCounts exam, SourceSyncCounts pm) {}
