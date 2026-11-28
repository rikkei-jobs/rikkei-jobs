package com.rikkei.jobs.candidate.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Normalized result from LMS / Exam / PM (0-100). Table: external_records. */
@Entity
@Table(name = "external_records")
public class ExternalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ExternalSource source;

    @Column(name = "source_code", nullable = false, length = 100)
    private String sourceCode;

    @Column(name = "source_key", nullable = false, length = 160)
    private String sourceKey;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(name = "synced_at", nullable = false)
    private OffsetDateTime syncedAt;

    protected ExternalRecord() {}

    public ExternalRecord(
            ExternalSource externalSource,
            String sourceCode,
            String title,
            BigDecimal score,
            OffsetDateTime recordedAt,
            Long userId) {
        this(
                externalSource,
                sourceCode,
                userId + ":" + sourceCode,
                title,
                score,
                recordedAt,
                "{}",
                recordedAt,
                userId);
    }

    public ExternalRecord(
            ExternalSource externalSource,
            String sourceCode,
            String sourceKey,
            String title,
            BigDecimal score,
            OffsetDateTime recordedAt,
            String payload,
            OffsetDateTime syncedAt,
            Long userId) {
        this.source = externalSource;
        this.sourceCode = sourceCode;
        this.sourceKey = sourceKey;
        this.title = title;
        this.score = score;
        this.recordedAt = recordedAt;
        this.payload = payload;
        this.syncedAt = syncedAt;
        this.userId = userId;
    }

    public void updateResult(
            String title,
            BigDecimal score,
            OffsetDateTime recordedAt,
            String payload,
            OffsetDateTime syncedAt) {
        this.title = title;
        this.score = score;
        this.recordedAt = recordedAt;
        this.payload = payload;
        this.syncedAt = syncedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public ExternalSource getSource() {
        return source;
    }

    public String getSourceCode() {
        return sourceCode;
    }

    public String getSourceKey() {
        return sourceKey;
    }

    public String getTitle() {
        return title;
    }

    public BigDecimal getScore() {
        return score;
    }

    public OffsetDateTime getRecordedAt() {
        return recordedAt;
    }

    public String getPayload() {
        return payload;
    }

    public OffsetDateTime getSyncedAt() {
        return syncedAt;
    }
}
