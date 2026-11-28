package com.rikkei.jobs.candidate.model;

/** Trigger source of an external sync run. Stored in sync_runs.trigger. */
public enum SyncTrigger {
    NIGHTLY,
    ON_OPEN,
    MANUAL
}
