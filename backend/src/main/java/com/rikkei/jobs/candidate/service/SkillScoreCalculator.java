package com.rikkei.jobs.candidate.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.Optional;

/**
 * Verified score formula of HS-01: Σ(score × weight × timeFactor) / Σ(weight × timeFactor) over
 * verified evidences. timeFactor is 1 for evidence recorded within the last year and 0.5 for older
 * evidence. DG-03 will replace this with a source-weighted formula.
 */
public final class SkillScoreCalculator {

    private static final BigDecimal RECENT_FACTOR = BigDecimal.ONE;
    private static final BigDecimal OLD_FACTOR = new BigDecimal("0.5");

    /** One verified evidence reduced to the values the formula needs. */
    public record Input(BigDecimal score, BigDecimal weight, OffsetDateTime recordedAt) {}

    private SkillScoreCalculator() {}

    /** Returns the verified score rounded to 2 decimals, or empty when there is no evidence. */
    public static Optional<BigDecimal> verifiedScore(
            Collection<Input> verifiedEvidences, OffsetDateTime now) {
        BigDecimal numerator = BigDecimal.ZERO;
        BigDecimal denominator = BigDecimal.ZERO;
        for (Input input : verifiedEvidences) {
            BigDecimal effectiveWeight = input.weight().multiply(timeFactor(input, now));
            numerator = numerator.add(input.score().multiply(effectiveWeight));
            denominator = denominator.add(effectiveWeight);
        }
        if (denominator.signum() == 0) {
            return Optional.empty();
        }
        return Optional.of(numerator.divide(denominator, 2, RoundingMode.HALF_UP));
    }

    static BigDecimal timeFactor(Input input, OffsetDateTime now) {
        return input.recordedAt().isBefore(now.minusYears(1)) ? OLD_FACTOR : RECENT_FACTOR;
    }
}
