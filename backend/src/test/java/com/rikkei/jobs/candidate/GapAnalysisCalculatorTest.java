package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.candidate.model.GapPriority;
import com.rikkei.jobs.candidate.service.GapAnalysisCalculator;
import com.rikkei.jobs.candidate.service.GapAnalysisCalculator.MissingSkill;
import com.rikkei.jobs.candidate.service.GapAnalysisCalculator.Outcome;
import com.rikkei.jobs.candidate.service.GapAnalysisCalculator.Requirement;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("DT-01 Gap Analysis Calculator")
class GapAnalysisCalculatorTest {

    private static Requirement requirement(
            int skillId, String code, String required, boolean mandatory) {
        return new Requirement(skillId, code, "Skill " + code, new BigDecimal(required), mandatory);
    }

    @Test
    @DisplayName("Satisfied skills are excluded and missing skills are sorted by gap descending")
    void satisfiedSkillsAreExcludedAndOrdered() {
        List<Requirement> requirements =
                List.of(
                        requirement(1, "JAVA", "75", true),
                        requirement(2, "DOCKER", "60", false),
                        requirement(3, "CLEAN_CODE", "60", true),
                        requirement(4, "GIT", "50", true));
        Map<Integer, BigDecimal> scores =
                Map.of(1, new BigDecimal("79.07"), 4, new BigDecimal("90.00"));

        Outcome outcome = GapAnalysisCalculator.analyze(requirements, scores);

        assertEquals(50, outcome.readiness());
        assertEquals(List.of("CLEAN_CODE", "DOCKER"), missingCodes(outcome));
        assertEquals(new BigDecimal("60.00"), outcome.missingSkills().get(0).gap());
        assertEquals(new BigDecimal("0.00"), outcome.missingSkills().get(0).current());
    }

    @Test
    @DisplayName("Priority thresholds are strict: 20 is MEDIUM, 21 is HIGH, 10 is LOW, 11 MEDIUM")
    void priorityThresholds() {
        assertEquals(GapPriority.LOW, GapAnalysisCalculator.priority(new BigDecimal("10"), true));
        assertEquals(
                GapPriority.MEDIUM, GapAnalysisCalculator.priority(new BigDecimal("11"), true));
        assertEquals(
                GapPriority.MEDIUM, GapAnalysisCalculator.priority(new BigDecimal("20"), true));
        assertEquals(GapPriority.HIGH, GapAnalysisCalculator.priority(new BigDecimal("21"), true));
        assertEquals(
                GapPriority.MEDIUM,
                GapAnalysisCalculator.priority(new BigDecimal("60"), false),
                "A large gap in an optional skill is never HIGH");
    }

    @Test
    @DisplayName("Missing verified score counts as current = 0 and gap = required")
    void missingScoreIsZero() {
        Outcome outcome =
                GapAnalysisCalculator.analyze(
                        List.of(requirement(9, "REACTJS", "70", true)), Map.of());

        MissingSkill missing = outcome.missingSkills().get(0);
        assertEquals(new BigDecimal("0.00"), missing.current());
        assertEquals(new BigDecimal("70.00"), missing.gap());
        assertEquals(GapPriority.HIGH, missing.priority());
        assertEquals(0, outcome.readiness());
    }

    @Test
    @DisplayName("Readiness rounds to nearest integer and empty target is 100")
    void readinessRounding() {
        List<Requirement> requirements =
                List.of(
                        requirement(1, "JAVA", "50", true),
                        requirement(2, "SQL", "50", true),
                        requirement(3, "GIT", "50", true));
        Map<Integer, BigDecimal> scores = Map.of(1, new BigDecimal("50"), 2, new BigDecimal("50"));

        Outcome outcome = GapAnalysisCalculator.analyze(requirements, scores);
        assertEquals(67, outcome.readiness());

        assertEquals(100, GapAnalysisCalculator.analyze(List.of(), Map.of()).readiness());
    }

    @Test
    @DisplayName("Fractional gap uses required minus current on the 0-100 scale")
    void fractionalGap() {
        Outcome outcome =
                GapAnalysisCalculator.analyze(
                        List.of(requirement(1, "JAVA", "80", true)),
                        Map.of(1, new BigDecimal("79.07")));

        MissingSkill missing = outcome.missingSkills().get(0);
        assertEquals(new BigDecimal("0.93"), missing.gap());
        assertEquals(GapPriority.LOW, missing.priority());
    }

    @Test
    @DisplayName("Equal gaps are tie-broken by skill code ascending")
    void tiesAreSortedBySkillCode() {
        List<Requirement> requirements =
                List.of(
                        requirement(1, "DOCKER", "60", true),
                        requirement(2, "CLEAN_CODE", "60", true),
                        requirement(3, "AGILE", "60", true));

        Outcome outcome = GapAnalysisCalculator.analyze(requirements, Map.of());

        assertEquals(List.of("AGILE", "CLEAN_CODE", "DOCKER"), missingCodes(outcome));
        assertTrue(
                outcome.missingSkills().stream()
                        .allMatch(skill -> skill.priority() == GapPriority.HIGH));
    }

    private static List<String> missingCodes(Outcome outcome) {
        return outcome.missingSkills().stream().map(MissingSkill::skillCode).toList();
    }
}
