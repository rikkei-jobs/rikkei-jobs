package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.candidate.dto.CandidateSkillScoreDto;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.company.dto.JobSkillRequirementDto;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Deterministic candidate-to-job match score calculator matching the DN-06 {@code
 * JobRecommendationService} weighting formula using public module interfaces (Rule 14).
 */
@Component
public class MatchScoreCalculator {

    private final JobVerificationClient jobVerificationClient;
    private final CandidatePublicService candidatePublicService;

    public MatchScoreCalculator(
            JobVerificationClient jobVerificationClient,
            CandidatePublicService candidatePublicService) {
        this.jobVerificationClient = jobVerificationClient;
        this.candidatePublicService = candidatePublicService;
    }

    /** Computes match score (0-100) by querying job requirements and candidate verified skills. */
    public int calculateMatchScore(Long jobId, Long candidateUserId) {
        if (jobId == null || jobId <= 0 || candidateUserId == null || candidateUserId <= 0) {
            return 0;
        }
        List<JobSkillRequirementDto> requirements =
                jobVerificationClient.getJobRequiredSkills(jobId);
        List<CandidateSkillScoreDto> candidateScores =
                candidatePublicService.getVerifiedSkillScores(candidateUserId);
        return calculateMatchScore(requirements, candidateScores);
    }

    /**
     * Pure deterministic calculation (mandatory weight 2.0, optional weight 1.0, ratio = min(1.0,
     * candidateScore / max(1, requiredLevel)), clamped to [0, 100]).
     */
    public int calculateMatchScore(
            List<JobSkillRequirementDto> requirements,
            List<CandidateSkillScoreDto> candidateScores) {
        if (requirements == null || requirements.isEmpty()) {
            return 0;
        }

        Map<String, Integer> candidateSkillMap =
                candidateScores == null || candidateScores.isEmpty()
                        ? Map.of()
                        : candidateScores.stream()
                                .filter(
                                        s ->
                                                s != null
                                                        && s.skillCode() != null
                                                        && s.score() != null)
                                .collect(
                                        Collectors.toMap(
                                                CandidateSkillScoreDto::skillCode,
                                                CandidateSkillScoreDto::score,
                                                Math::max));

        double totalWeightedRatio = 0.0;
        double totalWeight = 0.0;

        for (JobSkillRequirementDto requirement : requirements) {
            if (requirement == null || requirement.skillCode() == null) {
                continue;
            }
            double weight = Boolean.TRUE.equals(requirement.mandatory()) ? 2.0 : 1.0;
            totalWeight += weight;

            int candidateScore =
                    Math.max(0, candidateSkillMap.getOrDefault(requirement.skillCode(), 0));
            int requiredLevel =
                    requirement.requiredLevel() != null
                            ? Math.max(1, requirement.requiredLevel())
                            : 1;
            double ratio = Math.min(1.0, (double) candidateScore / (double) requiredLevel);
            totalWeightedRatio += ratio * weight;
        }

        if (totalWeight <= 0.0) {
            return 0;
        }
        int score = (int) Math.round((totalWeightedRatio / totalWeight) * 100.0);
        return Math.max(0, Math.min(100, score));
    }
}
