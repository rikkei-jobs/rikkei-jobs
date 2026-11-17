package com.rikkei.jobs.assessment.service.impl;

import com.rikkei.jobs.assessment.dto.ProfileEvaluationDto;
import com.rikkei.jobs.assessment.dto.ProfileEvaluationScoreDto;
import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationScore;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import com.rikkei.jobs.assessment.repository.EvaluationRepository;
import com.rikkei.jobs.assessment.service.EvaluationPublicService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Implementation of EvaluationPublicService for cross-module boundary compliance (Rule 14). */
@Service
public class EvaluationPublicServiceImpl implements EvaluationPublicService {

    private final EvaluationRepository evaluationRepository;

    public EvaluationPublicServiceImpl(EvaluationRepository evaluationRepository) {
        this.evaluationRepository = evaluationRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProfileEvaluationDto> getSubmittedEvaluationsForProfile(Long candidateUserId) {
        if (candidateUserId == null) {
            return List.of();
        }

        List<Evaluation> evaluations =
                evaluationRepository.findSubmittedWithDetails(
                        candidateUserId, EvaluationStatus.SUBMITTED);

        return evaluations.stream().map(this::toProfileDto).toList();
    }

    private ProfileEvaluationDto toProfileDto(Evaluation evaluation) {
        List<ProfileEvaluationScoreDto> scores = new ArrayList<>();
        if (evaluation.getScores() != null) {
            for (EvaluationScore es : evaluation.getScores()) {
                String criteriaName = null;
                String skillCode = null;
                Long criterionId = null;
                if (es.getCriterion() != null) {
                    criterionId = es.getCriterion().getId();
                    criteriaName = es.getCriterion().getDescription();
                    if (es.getCriterion().getSkill() != null) {
                        skillCode = es.getCriterion().getSkill().getCode();
                    }
                }
                BigDecimal scoreVal =
                        es.getScore() != null ? BigDecimal.valueOf(es.getScore()) : null;
                scores.add(
                        new ProfileEvaluationScoreDto(
                                criterionId, criteriaName, skillCode, scoreVal, es.getComment()));
            }
        }

        return new ProfileEvaluationDto(
                evaluation.getId(),
                evaluation.getMentorId(),
                evaluation.getTemplate() != null ? evaluation.getTemplate().getId() : null,
                evaluation.getContext() != null ? evaluation.getContext().name() : null,
                evaluation.getOverallComment(),
                evaluation.getSubmittedAt(),
                scores);
    }
}
