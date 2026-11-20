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

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;

    public ExternalRecord() {}

    public ExternalRecord(
            Long id,
            ExternalSource externalSource,
            String sourceCode,
            String title,
            BigDecimal score,
            OffsetDateTime recordedAt) {
        this.id = id;
        this.source = externalSource;
        this.sourceCode = sourceCode;
        this.title = title;
        this.score = score;
        this.recordedAt = recordedAt;
    }

    public ExternalRecord(
        ExternalSource externalSource,
        String sourceCode,
        String title,
        BigDecimal score,
        OffsetDateTime recordedAt,
        Long userId) {
        this.source = externalSource;
        this.sourceCode = sourceCode;
        this.title = title;
        this.score = score;
        this.recordedAt = recordedAt;
        this.userId = userId;
    }

    public void updateResult(String title, BigDecimal score, OffsetDateTime recordedAt) {
        this.title = title;
        this.score = score;
        this.recordedAt = recordedAt;
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

    public String getTitle() {
        return title;
    }

    public BigDecimal getScore() {
        return score;
    }

    public OffsetDateTime getRecordedAt() {
        return recordedAt;
    }
}
