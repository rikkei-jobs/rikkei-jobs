package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.model.GapPriority;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Pure calculator of DT-01 gap analysis. Compares verified scores (HS-01) with target requirements
 * and classifies each deficit.
 */
public final class GapAnalysisCalculator {

    public static final BigDecimal HIGH_GAP_THRESHOLD = new BigDecimal("20");
    public static final BigDecimal MEDIUM_GAP_THRESHOLD = new BigDecimal("10");
    private static final int SCORE_SCALE = 2;

    private GapAnalysisCalculator() {}

    /** One required skill of the effective target. */
    public record Requirement(
            Integer skillId,
            String skillCode,
            String skillName,
            BigDecimal required,
            boolean mandatory) {}

    /** One deficit. Skills whose current score meets the requirement are never produced. */
    public record MissingSkill(
            Integer skillId,
            String skillCode,
            String skillName,
            BigDecimal required,
            BigDecimal current,
            BigDecimal gap,
            GapPriority priority) {}

    /** Readiness (0-100) and deficits sorted by descending gap, then skill code. */
    public record Outcome(int readiness, List<MissingSkill> missingSkills) {}

    public static Outcome analyze(
            Collection<Requirement> requirements, Map<Integer, BigDecimal> verifiedScores) {
        int satisfied = 0;
        List<MissingSkill> missingSkills = new ArrayList<>();
        for (Requirement requirement : requirements) {
            BigDecimal required = normalize(requirement.required());
            BigDecimal current = normalize(verifiedScores.get(requirement.skillId()));
            BigDecimal gap = required.subtract(current);
            if (gap.signum() <= 0) {
                satisfied++;
                continue;
            }
            missingSkills.add(
                    new MissingSkill(
                            requirement.skillId(),
                            requirement.skillCode(),
                            requirement.skillName(),
                            required,
                            current,
                            gap,
                            priority(gap, requirement.mandatory())));
        }
        missingSkills.sort(
                Comparator.comparing(MissingSkill::gap)
                        .reversed()
                        .thenComparing(MissingSkill::skillCode));
        int readiness =
                requirements.isEmpty()
                        ? 100
                        : (int) Math.round(100.0 * satisfied / requirements.size());
        return new Outcome(readiness, List.copyOf(missingSkills));
    }

    /**
     * HIGH when a mandatory skill is more than 20 points short; MEDIUM when any skill is more than
     * 10 points short; LOW otherwise.
     */
    public static GapPriority priority(BigDecimal gap, boolean mandatory) {
        if (mandatory && gap.compareTo(HIGH_GAP_THRESHOLD) > 0) {
            return GapPriority.HIGH;
        }
        if (gap.compareTo(MEDIUM_GAP_THRESHOLD) > 0) {
            return GapPriority.MEDIUM;
        }
        return GapPriority.LOW;
    }

    private static BigDecimal normalize(BigDecimal score) {
        return score == null
                ? BigDecimal.ZERO.setScale(SCORE_SCALE, RoundingMode.HALF_UP)
                : score.setScale(SCORE_SCALE, RoundingMode.HALF_UP);
    }
}
