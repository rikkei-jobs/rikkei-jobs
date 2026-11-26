package com.rikkei.jobs.recruitment.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.candidate.dto.CandidateSkillScoreDto;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.company.dto.JobSkillRequirementDto;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("MatchScoreCalculator Unit Tests (Deterministic DN-06 Skill Formula)")
class MatchScoreCalculatorTest {

    @Mock private JobVerificationClient jobVerificationClient;
    @Mock private CandidatePublicService candidatePublicService;

    private MatchScoreCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new MatchScoreCalculator(jobVerificationClient, candidatePublicService);
    }

    @Test
    @DisplayName(
            "Weighted mandatory (2.0) vs optional (1.0) calculation is deterministic and exact")
    void shouldComputeWeightedMatchScoreDeterministically() {
        List<JobSkillRequirementDto> requirements =
                List.of(
                        new JobSkillRequirementDto("JAVA", "Java", 80, true),
                        new JobSkillRequirementDto("GIT", "Git", 50, false));
        List<CandidateSkillScoreDto> candidateScores =
                List.of(
                        new CandidateSkillScoreDto("JAVA", 80),
                        new CandidateSkillScoreDto("GIT", 25));

        int first = calculator.calculateMatchScore(requirements, candidateScores);
        int second = calculator.calculateMatchScore(requirements, candidateScores);

        // (1.0 * 2.0 + 0.5 * 1.0) / (2.0 + 1.0) = 2.5 / 3.0 = 83.33% -> 83
        assertEquals(83, first);
        assertEquals(first, second);
    }

    @Test
    @DisplayName("Caps per-skill ratio at 1.0 and clamps result within [0, 100]")
    void shouldCapSkillRatioAndClampResult() {
        List<JobSkillRequirementDto> requirements =
                List.of(
                        new JobSkillRequirementDto("JAVA", "Java", 60, true),
                        new JobSkillRequirementDto("SQL", "SQL", 50, false));
        List<CandidateSkillScoreDto> candidateScores =
                List.of(
                        new CandidateSkillScoreDto("JAVA", 100),
                        new CandidateSkillScoreDto("SQL", 100));

        assertEquals(100, calculator.calculateMatchScore(requirements, candidateScores));
    }

    @Test
    @DisplayName("Returns 0 when requirements are null or empty, or candidate scores are empty")
    void shouldReturnZeroForMissingRequirementsOrScores() {
        assertEquals(0, calculator.calculateMatchScore(null, List.of()));
        assertEquals(0, calculator.calculateMatchScore(List.of(), List.of()));

        List<JobSkillRequirementDto> requirements =
                List.of(new JobSkillRequirementDto("JAVA", "Java", 75, true));
        assertEquals(0, calculator.calculateMatchScore(requirements, null));
        assertEquals(0, calculator.calculateMatchScore(requirements, List.of()));
    }

    @Test
    @DisplayName(
            "Handles requiredLevel <= 0 without division by zero and takes max duplicate skill")
    void shouldHandleZeroRequiredLevelAndDuplicateScores() {
        List<JobSkillRequirementDto> requirements =
                List.of(new JobSkillRequirementDto("JAVA", "Java", 0, true));
        List<CandidateSkillScoreDto> candidateScores =
                List.of(
                        new CandidateSkillScoreDto("JAVA", 1),
                        new CandidateSkillScoreDto("JAVA", 0));

        assertEquals(100, calculator.calculateMatchScore(requirements, candidateScores));
    }

    @Test
    @DisplayName("Delegates by jobId and candidateUserId and returns 0 for invalid IDs")
    void shouldDelegateViaPublicServicesAndGuardInvalidIds() {
        assertEquals(0, calculator.calculateMatchScore(null, 1L));
        assertEquals(0, calculator.calculateMatchScore(1L, null));
        assertEquals(0, calculator.calculateMatchScore(0L, 1L));
        verifyNoInteractions(jobVerificationClient, candidatePublicService);

        when(jobVerificationClient.getJobRequiredSkills(1L))
                .thenReturn(
                        List.of(
                                new JobSkillRequirementDto("JAVA", "Java", 80, true),
                                new JobSkillRequirementDto("SQL", "SQL", 60, false)));
        when(candidatePublicService.getVerifiedSkillScores(1L))
                .thenReturn(
                        List.of(
                                new CandidateSkillScoreDto("JAVA", 40),
                                new CandidateSkillScoreDto("SQL", 60)));

        // (0.5 * 2.0 + 1.0 * 1.0) / 3.0 = 2.0 / 3.0 = 67
        assertEquals(67, calculator.calculateMatchScore(1L, 1L));
    }
}
