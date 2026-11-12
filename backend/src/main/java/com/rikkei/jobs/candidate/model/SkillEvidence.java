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

/** One piece of evidence behind a skill score. Table: skill_evidences. */
@Entity
@Table(name = "skill_evidences")
public class SkillEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "skill_id", nullable = false)
    private Integer skillId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EvidenceSource source;

    @Column(name = "source_ref", length = 100)
    private String sourceRef;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal score;

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal weight;

    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;

    @Column(nullable = false)
    private boolean verified;

    protected SkillEvidence() {}

    public SkillEvidence(
            Long userId,
            Integer skillId,
            EvidenceSource source,
            String sourceRef,
            String title,
            BigDecimal score,
            BigDecimal weight,
            OffsetDateTime recordedAt,
            boolean verified) {
        this.userId = userId;
        this.skillId = skillId;
        this.source = source;
        this.sourceRef = sourceRef;
        this.title = title;
        this.score = score;
        this.weight = weight;
        this.recordedAt = recordedAt;
        this.verified = verified;
    }

    public Long getUserId() {
        return userId;
    }

    public Integer getSkillId() {
        return skillId;
    }

    public EvidenceSource getSource() {
        return source;
    }

    public String getSourceRef() {
        return sourceRef;
    }

    public String getTitle() {
        return title;
    }

    public BigDecimal getScore() {
        return score;
    }

    public BigDecimal getWeight() {
        return weight;
    }

    public OffsetDateTime getRecordedAt() {
        return recordedAt;
    }

    public boolean isVerified() {
        return verified;
    }
}
