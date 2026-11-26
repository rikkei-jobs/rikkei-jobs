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

/** Persisted deficit row for one skill of one target. Only skills with gap &gt; 0 are stored. */
@Entity
@Table(name = "gap_results")
@IdClass(GapResultId.class)
public class GapResult {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "target_type", length = 10)
    @Enumerated(EnumType.STRING)
    private GapTargetType targetType;

    @Id
    @Column(name = "target_id")
    private Long targetId;

    @Id
    @Column(name = "skill_id")
    private Integer skillId;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal required;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal current;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal gap;

    @Column(name = "computed_at", nullable = false)
    private OffsetDateTime computedAt;

    public GapResult() {}

    public GapResult(
            Long userId,
            GapTargetType targetType,
            Long targetId,
            Integer skillId,
            BigDecimal required,
            BigDecimal current,
            BigDecimal gap,
            OffsetDateTime computedAt) {
        this.userId = userId;
        this.targetType = targetType;
        this.targetId = targetId;
        this.skillId = skillId;
        this.required = required;
        this.current = current;
        this.gap = gap;
        this.computedAt = computedAt;
    }

    public Long getUserId() {
        return userId;
    }

    public GapTargetType getTargetType() {
        return targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public Integer getSkillId() {
        return skillId;
    }

    public BigDecimal getRequired() {
        return required;
    }

    public BigDecimal getCurrent() {
        return current;
    }

    public BigDecimal getGap() {
        return gap;
    }

    public OffsetDateTime getComputedAt() {
        return computedAt;
    }
}
