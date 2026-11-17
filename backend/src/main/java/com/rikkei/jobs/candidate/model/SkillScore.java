package com.rikkei.jobs.candidate.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Aggregated score of one candidate for one skill. Table: skill_scores. */
@Entity
@Table(name = "skill_scores")
@IdClass(SkillScoreId.class)
public class SkillScore {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "skill_id")
    private Integer skillId;

    @Column(name = "verified_score", precision = 5, scale = 2)
    private BigDecimal verifiedScore;

    @Column(name = "self_score", precision = 5, scale = 2)
    private BigDecimal selfScore;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private SkillLevel level;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected SkillScore() {}

    public SkillScore(Long userId, Integer skillId) {
        this.userId = userId;
        this.skillId = skillId;
    }

    public void update(
            BigDecimal verifiedScore,
            BigDecimal selfScore,
            SkillLevel level,
            OffsetDateTime updatedAt) {
        this.verifiedScore = verifiedScore;
        this.selfScore = selfScore;
        this.level = level;
        this.updatedAt = updatedAt;
    }

    public Long getUserId() {
        return userId;
    }

    public Integer getSkillId() {
        return skillId;
    }

    public BigDecimal getVerifiedScore() {
        return verifiedScore;
    }

    public BigDecimal getSelfScore() {
        return selfScore;
    }

    public SkillLevel getLevel() {
        return level;
    }
}
