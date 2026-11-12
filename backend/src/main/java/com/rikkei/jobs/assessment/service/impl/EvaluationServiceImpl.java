package com.rikkei.jobs.assessment.service.impl;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.request.EvaluationScoreRequest;
import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.mapper.EvaluationMapper;
import com.rikkei.jobs.assessment.model.*;
import com.rikkei.jobs.assessment.repository.EvaluationCriteriaRepository;
import com.rikkei.jobs.assessment.repository.EvaluationRepository;
import com.rikkei.jobs.assessment.repository.EvaluationTemplateRepository;
import com.rikkei.jobs.assessment.service.EvaluationService;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public EvaluationResponse createEvaluation(CreateEvaluationRequest request, Long mentorId) {
        // 1. Tìm template
        EvaluationTemplate template =
                templateRepository
                        .findById(request.getTemplateId())
                        .orElseThrow(
                                () -> new EntityNotFoundException("Evaluation template not found"));

        // 2. Kiểm tra template đang hoạt động
        if (!Boolean.TRUE.equals(template.getActive())) {
            throw new IllegalArgumentException("Evaluation template is inactive");
        }

        // 3. Kiểm tra context
        if (template.getContext() != request.getContext()) {
            throw new IllegalArgumentException("");
        }

        // 4. Tìm ứng viên
        User user =
                userRepository
                        .findById(request.getUserId())
                        .orElseThrow(() -> new EntityNotFoundException("Candidate not found"));

        User mentor =
                userRepository
                        .findById(mentorId)
                        .orElseThrow(() -> new EntityNotFoundException("Mentor not found"));

        // 5. Kiểm tra danh sách tiêu chí
        List<EvaluationScoreRequest> requestScores =
                request.getScores() == null ? List.of() : request.getScores();

        List<Long> criterionIds =
                requestScores.stream().map(EvaluationScoreRequest::getCriterionId).toList();

        // Không cho phép trùng criterionId
        if (new HashSet<>(criterionIds).size() != criterionIds.size()) {
            throw new IllegalArgumentException("Duplicate criterion ID");
        }

        // Lấy các tiêu chí được gửi lên
        Map<Long, EvaluationCriteria> criteriaMap =
                criteriaRepository.findAllByIdIn(criterionIds).stream()
                        .collect(Collectors.toMap(EvaluationCriteria::getId, Function.identity()));

        // Kiểm tra tiêu chí tồn tại và thuộc template
        for (Long criterionId : criterionIds) {
            EvaluationCriteria criterion = criteriaMap.get(criterionId);

            if (criterion == null) {
                throw new EntityNotFoundException("Evaluation criterion not found: " + criterionId);
            }

            if (!criterion.getTemplate().getId().equals(template.getId())) {
                throw new IllegalArgumentException(
                        "Criterion does not belong to the selected template: " + criterionId);
            }
        }

        // 6. Tạo Evaluation
        Evaluation evaluation =
                Evaluation.builder()
                        .template(template)
                        .user(user)
                        .mentor(mentor)
                        .context(request.getContext())
                        .batchId(request.getBatchId())
                        .interviewRoundId(request.getInterviewRoundId())
                        .status(EvaluationStatus.DRAFT)
                        .overallComment(request.getOverallComment())
                        .scores(new ArrayList<>())
                        .build();

        // 7. Tạo các EvaluationScore
        List<EvaluationScore> scores =
                requestScores.stream()
                        .map(
                                scoreRequest ->
                                        EvaluationScore.builder()
                                                .evaluation(evaluation)
                                                .criterion(
                                                        criteriaMap.get(
                                                                scoreRequest.getCriterionId()))
                                                .score(scoreRequest.getScore())
                                                .comment(scoreRequest.getComment())
                                                .build())
                        .toList();

        evaluation.setScores(new ArrayList<>(scores));

        // 8. Lưu Evaluation và các EvaluationScore bằng cascade
        Evaluation savedEvaluation = evaluationRepository.save(evaluation);

        // 9. Chuyển Entity thành Response
        return evaluationMapper.toResponse(savedEvaluation);
    }
}
