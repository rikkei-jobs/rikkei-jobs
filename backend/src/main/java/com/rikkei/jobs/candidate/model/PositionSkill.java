package com.rikkei.jobs.candidate.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Minimum verified score a target position expects for one catalogue skill. */
@Entity
@Table(name = "position_skills")
public class PositionSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "position_id", nullable = false)
    private Long positionId;

    @Column(name = "skill_id", nullable = false)
    private Integer skillId;

    @Column(name = "min_score", nullable = false)
    private Integer minScore;

    public PositionSkill() {}

    public Long getId() {
        return id;
    }

    public Long getPositionId() {
        return positionId;
    }

    public Integer getSkillId() {
        return skillId;
    }

    public Integer getMinScore() {
        return minScore;
    }
}
