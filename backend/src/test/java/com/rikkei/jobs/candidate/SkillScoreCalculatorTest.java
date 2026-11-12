package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.candidate.model.SkillLevel;
import com.rikkei.jobs.candidate.service.SkillScoreCalculator;
import com.rikkei.jobs.candidate.service.SkillScoreCalculator.Input;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("HS-01 verified score formula and level bands")
class SkillScoreCalculatorTest {

    private static final OffsetDateTime NOW =
            OffsetDateTime.of(2026, 11, 12, 0, 0, 0, 0, ZoneOffset.UTC);

    private static Input input(String score, String weight, OffsetDateTime recordedAt) {
        return new Input(new BigDecimal(score), new BigDecimal(weight), recordedAt);
    }

    @Test
    @DisplayName("Hand-calculated JAVA example of candidate1 = 79.07")
    void handCalculatedExample() {
        // LMS JAVA01 85 (w 0.7, recent) + LMS JAVA01 60 (w 0.7, 500 days old => factor 0.5)
        // + EXAM 80 (w 0.8, recent) + PM 85 (w 0.3, recent)
        // numerator   = 85*0.7 + 60*0.7*0.5 + 80*0.8 + 85*0.3 = 59.5 + 21 + 64 + 25.5 = 170
        // denominator = 0.7 + 0.7*0.5 + 0.8 + 0.3 = 2.15
        // 170 / 2.15 = 79.0697... => 79.07
        List<Input> inputs =
                List.of(
                        input("85", "0.7", NOW.minusDays(30)),
                        input("60", "0.7", NOW.minusDays(500)),
                        input("80", "0.8", NOW.minusDays(10)),
                        input("85", "0.3", NOW.minusDays(14)));

        Optional<BigDecimal> result = SkillScoreCalculator.verifiedScore(inputs, NOW);

        assertEquals(new BigDecimal("79.07"), result.orElseThrow());
    }

    @Test
    @DisplayName("Evidence exactly one year old still counts with factor 1")
    void exactlyOneYearIsRecent() {
        List<Input> inputs =
                List.of(input("100", "1", NOW.minusYears(1)), input("0", "1", NOW.minusDays(1)));

        assertEquals(
                new BigDecimal("50.00"),
                SkillScoreCalculator.verifiedScore(inputs, NOW).orElseThrow());
    }

    @Test
    @DisplayName("Evidence older than one year counts with factor 0.5")
    void olderThanOneYearIsHalved() {
        List<Input> inputs =
                List.of(input("90", "1", NOW.minusYears(1).minusDays(1)), input("60", "1", NOW));

        // (90*0.5 + 60*1) / (0.5 + 1) = 105 / 1.5 = 70.00
        assertEquals(
                new BigDecimal("70.00"),
                SkillScoreCalculator.verifiedScore(inputs, NOW).orElseThrow());
    }

    @Test
    @DisplayName("No verified evidence yields no verified score")
    void noEvidence() {
        assertTrue(SkillScoreCalculator.verifiedScore(List.of(), NOW).isEmpty());
    }

    @Test
    @DisplayName("Level bands follow 0-39 / 40-69 / 70-84 / 85-100")
    void levelBands() {
        assertEquals(SkillLevel.BASIC, SkillLevel.fromScore(new BigDecimal("0")));
        assertEquals(SkillLevel.BASIC, SkillLevel.fromScore(new BigDecimal("39.99")));
        assertEquals(SkillLevel.INTERMEDIATE, SkillLevel.fromScore(new BigDecimal("40")));
        assertEquals(SkillLevel.INTERMEDIATE, SkillLevel.fromScore(new BigDecimal("69.99")));
        assertEquals(SkillLevel.ADVANCED, SkillLevel.fromScore(new BigDecimal("70")));
        assertEquals(SkillLevel.ADVANCED, SkillLevel.fromScore(new BigDecimal("84.99")));
        assertEquals(SkillLevel.EXPERT, SkillLevel.fromScore(new BigDecimal("85")));
        assertEquals(SkillLevel.EXPERT, SkillLevel.fromScore(new BigDecimal("100")));
    }
}
