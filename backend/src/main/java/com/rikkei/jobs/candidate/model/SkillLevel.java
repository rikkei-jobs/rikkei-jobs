package com.rikkei.jobs.candidate.model;

import java.math.BigDecimal;

/** Common proficiency bands: 0-39 Basic, 40-69 Intermediate, 70-84 Advanced, 85-100 Expert. */
public enum SkillLevel {
    BASIC,
    INTERMEDIATE,
    ADVANCED,
    EXPERT;

    private static final BigDecimal INTERMEDIATE_MIN = BigDecimal.valueOf(40);
    private static final BigDecimal ADVANCED_MIN = BigDecimal.valueOf(70);
    private static final BigDecimal EXPERT_MIN = BigDecimal.valueOf(85);

    public static SkillLevel fromScore(BigDecimal score) {
        if (score.compareTo(EXPERT_MIN) >= 0) {
            return EXPERT;
        }
        if (score.compareTo(ADVANCED_MIN) >= 0) {
            return ADVANCED;
        }
        if (score.compareTo(INTERMEDIATE_MIN) >= 0) {
            return INTERMEDIATE;
        }
        return BASIC;
    }
}
