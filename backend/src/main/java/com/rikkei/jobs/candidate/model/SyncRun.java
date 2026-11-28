package com.rikkei.jobs.candidate.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Execution log entry for an external data sync attempt. Table: sync_runs. */
@Entity
@Table(name = "sync_runs")
public class SyncRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger", nullable = false, length = 20)
    private SyncTrigger trigger;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SyncStatus status;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "finished_at", nullable = false)
    private OffsetDateTime finishedAt;

    @Column(name = "error", length = 500)
    private String error;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "counts", columnDefinition = "jsonb")
    private String counts;

    protected SyncRun() {}

    public SyncRun(
            SyncTrigger trigger,
            Long userId,
            SyncStatus status,
            OffsetDateTime startedAt,
            OffsetDateTime finishedAt,
            String error,
            String counts) {
        this.trigger = trigger;
        this.userId = userId;
        this.status = status;
        this.startedAt = startedAt;
        this.finishedAt = finishedAt;
        this.error = error;
        this.counts = counts;
    }

    public Long getId() {
        return id;
    }

    public SyncTrigger getTrigger() {
        return trigger;
    }

    public Long getUserId() {
        return userId;
    }

    public SyncStatus getStatus() {
        return status;
    }

    public OffsetDateTime getStartedAt() {
        return startedAt;
    }

    public OffsetDateTime getFinishedAt() {
        return finishedAt;
    }

    public String getError() {
        return error;
    }

    public String getCounts() {
        return counts;
    }
}
