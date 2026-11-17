package com.rikkei.jobs.assessment.mapper;

import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.dto.response.EvaluationScoreResponse;
import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationScore;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class EvaluationMapper {

    public EvaluationResponse toResponse(Evaluation evaluation) {
        if (evaluation == null) {
            return null;
        }

        List<EvaluationScoreResponse> scoreResponses = null;
        if (evaluation.getScores() != null) {
            scoreResponses = new ArrayList<>();
            for (EvaluationScore score : evaluation.getScores()) {
                scoreResponses.add(toScoreResponse(score));
            }
        }

        Long templateId =
                evaluation.getTemplate() != null ? evaluation.getTemplate().getId() : null;

        return new EvaluationResponse(
                evaluation.getId(),
                templateId,
                evaluation.getUserId(),
                evaluation.getMentorId(),
                evaluation.getContext(),
                evaluation.getBatchId(),
                evaluation.getInterviewRoundId(),
                evaluation.getStatus(),
                evaluation.getOverallComment(),
                evaluation.getSubmittedAt(),
                scoreResponses);
    }

    public EvaluationScoreResponse toScoreResponse(EvaluationScore score) {
        if (score == null) {
            return null;
        }

        Long criterionId = score.getCriterion() != null ? score.getCriterion().getId() : null;

        return new EvaluationScoreResponse(
                score.getId(), criterionId, score.getScore(), score.getComment());
    }
}
