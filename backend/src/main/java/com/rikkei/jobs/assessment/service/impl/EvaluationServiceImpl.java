package com.rikkei.jobs.assessment.service.impl;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.request.EvaluationScoreRequest;
import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.mapper.EvaluationMapper;
import com.rikkei.jobs.assessment.model.EvaluationTemplate;
import com.rikkei.jobs.assessment.repository.EvaluationCriteriaRepository;
import com.rikkei.jobs.assessment.repository.EvaluationRepository;
import com.rikkei.jobs.assessment.repository.EvaluationTemplateRepository;
import com.rikkei.jobs.assessment.service.EvaluationService;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@AllArgsConstructor
public class EvaluationServiceImpl implements EvaluationService {
    private final EvaluationRepository evaluationRepository;
    private final EvaluationTemplateRepository templateRepository;
    private final EvaluationCriteriaRepository criteriaRepository;
    private final UserRepository userRepository;
    private final EvaluationMapper evaluationMapper;

    @Transactional
    @Override
    public EvaluationResponse createEvaluation(CreateEvaluationRequest request, User mentor) {
        // 1. Tìm template
        EvaluationTemplate template = templateRepository.findById(request.getTemplateId())
            .orElseThrow(() -> new EntityNotFoundException("Evaluation template not found"));

        // 2. Kiểm tra template đang hoạt động
        if (!Boolean.TRUE.equals(template.getActive())) {
            throw new IllegalArgumentException("Evaluation template is inactive");
        }

        // 3. Kiểm tra context
        if (template.getContext() != request.getContext()) {
            throw new IllegalArgumentException(
                "");
        }

        // 4. Tìm ứng viên
        User user = userRepository.findById(request.getUserId())
            .orElseThrow(() -> new EntityNotFoundException("Candidate not found"));

        // 5. Kiểm tra danh sách tiêu chí
        List<EvaluationScoreRequest> requestScores = request.getScores() == null ? List.of() : request.getScores();

        List<Long> criterionIds = requestScores.stream()
            .map(EvaluationScoreRequest::getCriterionId)
            .toList();

        return
    }
}

