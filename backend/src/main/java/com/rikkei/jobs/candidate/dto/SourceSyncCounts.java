package com.rikkei.jobs.candidate.dto;

/** Per-source record processing counts recorded inside {@code sync_runs.counts}. */
public record SourceSyncCounts(
        int fetched, int inserted, int updated, int unchanged, int skipped) {}
