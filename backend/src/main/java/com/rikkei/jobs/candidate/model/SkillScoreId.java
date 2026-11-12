package com.rikkei.jobs.candidate.model;

import java.io.Serializable;
import java.util.Objects;

/** Composite key (user_id, skill_id) of skill_scores. */
public class SkillScoreId implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long userId;
    private Integer skillId;

    public SkillScoreId() {}

    public SkillScoreId(Long userId, Integer skillId) {
        this.userId = userId;
        this.skillId = skillId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof SkillScoreId that)) {
            return false;
        }
        return Objects.equals(userId, that.userId) && Objects.equals(skillId, that.skillId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, skillId);
    }
}
