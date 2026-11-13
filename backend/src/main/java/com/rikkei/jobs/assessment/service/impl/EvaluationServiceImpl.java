package com.rikkei.jobs.assessment.service.impl;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.request.EvaluationScoreRequest;
import com.rikkei.jobs.assessment.dto.request.UpdateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.mapper.EvaluationMapper;
import com.rikkei.jobs.assessment.model.*;
import com.rikkei.jobs.assessment.repository.EvaluationCriteriaRepository;
import com.rikkei.jobs.assessment.repository.EvaluationRepository;
import com.rikkei.jobs.assessment.repository.EvaluationTemplateRepository;
import com.rikkei.jobs.assessment.service.EvaluationService;
import com.rikkei.jobs.candidate.model.EvidenceSource;
import com.rikkei.jobs.candidate.model.SkillEvidence;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@AllArgsConstructor
public class EvaluationServiceImpl implements EvaluationService {
    private final EvaluationRepository evaluationRepository;
    private final EvaluationTemplateRepository templateRepository;
    private final EvaluationCriteriaRepository criteriaRepository;
    private final UserRepository userRepository;
    private final SkillEvidenceRepository skillEvidenceRepository;
    private final SkillRecomputeService skillRecomputeService;
    private final EvaluationMapper evaluationMapper;

    @Transactional
    @Override
    public EvaluationResponse createEvaluation(
        CreateEvaluationRequest request,
        Long mentorId) {

        // 1. Tìm template
        EvaluationTemplate template =
            templateRepository
                .findById(request.getTemplateId())
                .orElseThrow(
                    () -> new EntityNotFoundException(
                        "Evaluation template not found"));

        // 2. Kiểm tra template đang hoạt động
        if (!Boolean.TRUE.equals(template.getActive())) {
            throw new IllegalArgumentException(
                "Evaluation template is inactive");
        }

        // 3. Kiểm tra context
        if (template.getContext() != request.getContext()) {
            throw new IllegalArgumentException(
                "Evaluation template context does not match request context");
        }

        // 4. Tìm ứng viên
        User user =
            userRepository
                .findById(request.getUserId())
                .orElseThrow(
                    () -> new EntityNotFoundException(
                        "Candidate not found"));

        // 5. Tìm mentor
        User mentor =
            userRepository
                .findById(mentorId)
                .orElseThrow(
                    () -> new EntityNotFoundException(
                        "Mentor not found"));

        // 6. Lấy TOÀN BỘ tiêu chí thuộc template
        List<EvaluationCriteria> templateCriteria =
            criteriaRepository.findAllByTemplateId(template.getId());

        if (templateCriteria.isEmpty()) {
            throw new IllegalArgumentException(
                "Evaluation template has no criteria");
        }

        // 7. Lấy danh sách điểm frontend gửi lên
        List<EvaluationScoreRequest> requestScores =
            request.getScores() == null
                ? List.of()
                : request.getScores();

        // 8. Kiểm tra criterionId bị trùng
        List<Long> criterionIds =
            requestScores.stream()
                .map(EvaluationScoreRequest::getCriterionId)
                .toList();

        if (new HashSet<>(criterionIds).size() != criterionIds.size()) {
            throw new IllegalArgumentException(
                "Duplicate criterion ID");
        }

        // 9. Tạo map điểm được gửi lên, key = criterionId
        Map<Long, EvaluationScoreRequest> scoreRequestMap =
            requestScores.stream()
                .collect(
                    Collectors.toMap(
                        EvaluationScoreRequest::getCriterionId,
                        Function.identity()));

        // 10. Kiểm tra tất cả criterionId gửi lên có thuộc template không
        Set<Long> templateCriterionIds =
            templateCriteria.stream()
                .map(EvaluationCriteria::getId)
                .collect(Collectors.toSet());

        for (Long criterionId : criterionIds) {
            if (!templateCriterionIds.contains(criterionId)) {
                throw new IllegalArgumentException(
                    "Criterion does not belong to the selected template: "
                        + criterionId);
            }
        }

        // 11. Tạo Evaluation
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

        // 12. Tạo EvaluationScore cho TẤT CẢ tiêu chí của template
        List<EvaluationScore> scores =
            templateCriteria.stream()
                .map(
                    criterion -> {
                        EvaluationScoreRequest scoreRequest =
                            scoreRequestMap.get(criterion.getId());

                        return EvaluationScore.builder()
                            .evaluation(evaluation)
                            .criterion(criterion)
                            .score(
                                scoreRequest != null
                                    ? scoreRequest.getScore()
                                    : null)
                            .comment(
                                scoreRequest != null
                                    ? scoreRequest.getComment()
                                    : null)
                            .build();
                    })
                .toList();

        evaluation.setScores(new ArrayList<>(scores));

        // 13. Lưu Evaluation và các EvaluationScore bằng cascade
        Evaluation savedEvaluation =
            evaluationRepository.save(evaluation);

        // 14. Chuyển Entity thành Response
        return evaluationMapper.toResponse(savedEvaluation);
    }

    @Override
    @Transactional
    public void updateEvaluation(
        Long evaluationId,
        Long mentorId,
        UpdateEvaluationRequest request) {

        // 1. Tìm evaluation
        Evaluation evaluation = evaluationRepository.findById(evaluationId)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Evaluation not found"
                )
            );

        // 2. Kiểm tra mentor trước status
        // Không tiết lộ phiếu của mentor khác
        if (!evaluation.getMentor().getId().equals(mentorId)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Evaluation not found"
            );
        }

        // 3. Chỉ cho phép chỉnh sửa DRAFT
        if (evaluation.getStatus() != EvaluationStatus.DRAFT) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Cannot update a submitted evaluation"
            );
        }

        // 4. Lấy danh sách điểm gửi lên
        List<UpdateEvaluationRequest.ScoreRequest> requests =
            request.getScores() == null
                ? List.of()
                : request.getScores();

        // 5. Kiểm tra criterionId trùng nhau
        List<Long> criterionIds = requests.stream()
            .map(UpdateEvaluationRequest.ScoreRequest::getCriterionId)
            .toList();

        if (new HashSet<>(criterionIds).size() != criterionIds.size()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Duplicate criterion ID"
            );
        }

        // 6. Lấy toàn bộ EvaluationScore hiện tại của phiếu
        Map<Long, EvaluationScore> scoreMap =
            evaluation.getScores().stream()
                .collect(Collectors.toMap(
                    score -> score.getCriterion().getId(),
                    Function.identity()
                ));

        // 7. Kiểm tra và cập nhật điểm
        for (UpdateEvaluationRequest.ScoreRequest item : requests) {

            Long criterionId = item.getCriterionId();

            // Không cho phép criterionId null
            if (criterionId == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Criterion ID is required"
                );
            }

            // Chỉ được cập nhật tiêu chí đã tồn tại trong phiếu
            EvaluationScore score = scoreMap.get(criterionId);

            if (score == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot add or replace criterion: " + criterionId
                );
            }

            // Chỉ cập nhật score nếu request có gửi giá trị
            if (item.getScore() != null) {
                score.setScore(item.getScore());
            }

            // Chỉ cập nhật comment nếu request có gửi giá trị
            if (item.getComment() != null) {
                score.setComment(item.getComment());
            }
        }

        // 8. Cập nhật nhận xét chung
        if (request.getOverallComment() != null) {
            evaluation.setOverallComment(request.getOverallComment());
        }

        // 9. Lưu
        evaluationRepository.save(evaluation);
    }

    @Transactional
    @Override
    public void submitEvaluation(Long evaluationId, Long mentorId) {
        Evaluation evaluation = evaluationRepository.findById(evaluationId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Evaluation not found"
            ));

        // Chỉ mentor tạo phiếu mới được submit
        if (!evaluation.getMentor().getId().equals(mentorId)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Evaluation not found"
            );
        }

        // Không cho submit lại
        if (evaluation.getStatus() != EvaluationStatus.DRAFT) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Evaluation already submitted"
            );
        }

        // Lấy toàn bộ tiêu chí của template từ database
        List<EvaluationCriteria> criteria =
            criteriaRepository.findAllByTemplateId(
                evaluation.getTemplate().getId()
            );

        // Lấy điểm đã nhập
        Map<Long, EvaluationScore> scoreMap = evaluation.getScores().stream()
            .collect(Collectors.toMap(
                score -> score.getCriterion().getId(),
                Function.identity()
            ));

        // Kiểm tra tất cả tiêu chí đều có điểm
        for (EvaluationCriteria criterion : criteria) {
            EvaluationScore score = scoreMap.get(criterion.getId());

            if (score == null || score.getScore() == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Missing score for criterion: " + criterion.getId()
                );
            }
        }

        // Tạo SkillEvidence
        List<SkillEvidence> evidences = criteria.stream()
            .map(criterion -> {
                EvaluationScore score = scoreMap.get(criterion.getId());

                BigDecimal normalizedWeight = criterion.getWeight()
                    .divide(BigDecimal.valueOf(100), 3, RoundingMode.HALF_UP);

                return new SkillEvidence(
                    evaluation.getUser().getId(),
                    Math.toIntExact(criterion.getSkill().getId()),
                    EvidenceSource.MENTOR,
                    evaluation.getId().toString(),
                    criterion.getDescription(),
                    BigDecimal.valueOf(score.getScore()),
                    normalizedWeight,
                    OffsetDateTime.now(),
                    true
                );
            })
            .toList();

        skillEvidenceRepository.saveAll(evidences);

        // Tính toán lại điểm kỹ năng HS-01
        skillRecomputeService.recomputeSkills(evaluation.getUser().getId());

        // Đánh dấu phiếu đã submit
        evaluation.setStatus(EvaluationStatus.SUBMITTED);
        evaluation.setSubmittedAt(LocalDateTime.now());

        evaluationRepository.save(evaluation);
    }
}
