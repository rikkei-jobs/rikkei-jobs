package com.rikkei.jobs.candidate.model;

import java.io.Serializable;
import java.util.Objects;

/** Composite key (user_id, target_type, target_id, skill_id) of gap_results. */
public class GapResultId implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long userId;
    private GapTargetType targetType;
    private Long targetId;
    private Integer skillId;

    public GapResultId() {}

    public GapResultId(Long userId, GapTargetType targetType, Long targetId, Integer skillId) {
        this.userId = userId;
        this.targetType = targetType;
        this.targetId = targetId;
        this.skillId = skillId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof GapResultId that)) {
            return false;
        }
        return Objects.equals(userId, that.userId)
                && targetType == that.targetType
                && Objects.equals(targetId, that.targetId)
                && Objects.equals(skillId, that.skillId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, targetType, targetId, skillId);
    }
}
