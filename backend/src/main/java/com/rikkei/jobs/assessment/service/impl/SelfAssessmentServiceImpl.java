package com.rikkei.jobs.assessment.service.impl;

import com.rikkei.jobs.assessment.dto.response.SelfAssessmentTemplateResponse;
import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.model.EvaluationCriteria;
import com.rikkei.jobs.assessment.model.EvaluationTemplate;
import com.rikkei.jobs.assessment.repository.EvaluationTemplateRepository;
import com.rikkei.jobs.assessment.service.SelfAssessmentService;
import com.rikkei.jobs.candidate.model.CandidateTarget;
import com.rikkei.jobs.candidate.model.TargetPosition;
import com.rikkei.jobs.candidate.repository.CandidateTargetRepository;
import com.rikkei.jobs.candidate.repository.TargetPositionRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SelfAssessmentServiceImpl implements SelfAssessmentService {

    private final CandidateTargetRepository candidateTargetRepository;
    private final TargetPositionRepository targetPositionRepository;
    private final EvaluationTemplateRepository evaluationTemplateRepository;

    public SelfAssessmentServiceImpl(
        CandidateTargetRepository candidateTargetRepository,
        TargetPositionRepository targetPositionRepository,
        EvaluationTemplateRepository evaluationTemplateRepository
    ) {
        this.candidateTargetRepository = candidateTargetRepository;
        this.targetPositionRepository = targetPositionRepository;
        this.evaluationTemplateRepository = evaluationTemplateRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public SelfAssessmentTemplateResponse getTemplate(Long userId) {

        // 1. Lấy vị trí mục tiêu Candidate đã chọn (nếu có)
        CandidateTarget candidateTarget = candidateTargetRepository
            .findByUserId(userId)
            .orElse(null);

        String positionName = null;

        // 2. Nếu đã chọn vị trí thì lấy tên vị trí
        if (candidateTarget != null && candidateTarget.getPositionId() != null) {
            TargetPosition position = targetPositionRepository
                .findById(candidateTarget.getPositionId())
                .orElse(null);

            if (position != null) {
                positionName = position.getName();
            }
        }

        // 3. Nếu có vị trí, thử tìm template riêng theo vị trí
        EvaluationTemplate template = null;

        if (positionName != null && !positionName.isBlank()) {
            template = evaluationTemplateRepository
                .findActiveTemplateByPosition(
                    positionName,
                    EvaluationContext.SELF_ASSESSMENT
                )
                .orElse(null);
        }

        // 4. Nếu không có template theo vị trí hoặc không có vị trí
        // thì lấy template mặc định
        if (template == null) {
            template = evaluationTemplateRepository
                .findActiveTemplateByPosition(
                    "DEFAULT",
                    EvaluationContext.SELF_ASSESSMENT
                )
                .orElseThrow(() -> new IllegalStateException(
                    "Chưa cấu hình mẫu tự đánh giá mặc định"
                ));
        }

        // 5. Chuyển tiêu chí thành DTO
        List<SelfAssessmentTemplateResponse.SkillCriteriaResponse> criteria =
            template.getCriteria()
                .stream()
                .map(this::toSkillCriteriaResponse)
                .toList();

        // 6. Trả về kết quả
        return new SelfAssessmentTemplateResponse(
            template.getId(),
            template.getName(),
            template.getPosition(),
            criteria
        );
    }

    private SelfAssessmentTemplateResponse.SkillCriteriaResponse
    toSkillCriteriaResponse(EvaluationCriteria criteria) {

        return new SelfAssessmentTemplateResponse.SkillCriteriaResponse(
            criteria.getSkill().getId(),
            criteria.getSkill().getCode(),
            criteria.getSkill().getNameVi(),
            criteria.getDescription(),
            criteria.getWeight()
        );
    }
}
