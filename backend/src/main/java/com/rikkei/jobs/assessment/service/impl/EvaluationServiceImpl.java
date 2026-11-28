package com.rikkei.jobs.assessment.service.impl;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.request.EvaluationScoreRequest;
import com.rikkei.jobs.assessment.dto.request.UpdateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.mapper.EvaluationMapper;
import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationCriteria;
import com.rikkei.jobs.assessment.model.EvaluationScore;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import com.rikkei.jobs.assessment.model.EvaluationTemplate;
import com.rikkei.jobs.assessment.repository.EvaluationCriteriaRepository;
import com.rikkei.jobs.assessment.repository.EvaluationRepository;
import com.rikkei.jobs.assessment.repository.EvaluationTemplateRepository;
import com.rikkei.jobs.assessment.service.EvaluationService;
import com.rikkei.jobs.candidate.dto.MentorSkillEvidenceDto;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.common.exception.EvaluationAlreadySubmittedException;
import com.rikkei.jobs.common.exception.EvaluationContextMismatchException;
import com.rikkei.jobs.common.exception.EvaluationIncompleteException;
import com.rikkei.jobs.common.exception.EvaluationNotFoundException;
import com.rikkei.jobs.common.exception.InvalidCandidateException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.TemplateInactiveException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.common.security.OwnershipGuard;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Core Assessment Service implementing evaluation workflows and atomic submission (Gate G4).
 * Strictly complies with Rule 14 (Backend Module Boundaries) and Rule 05.
 */
@Service
public class EvaluationServiceImpl implements EvaluationService {

    private final EvaluationRepository evaluationRepository;
    private final EvaluationTemplateRepository templateRepository;
    private final EvaluationCriteriaRepository criteriaRepository;
    private final CandidatePublicService candidatePublicService;
    private final IdentityPublicService identityPublicService;
    private final EvaluationMapper evaluationMapper;
    private final Clock clock;

    public EvaluationServiceImpl(
            EvaluationRepository evaluationRepository,
            EvaluationTemplateRepository templateRepository,
            EvaluationCriteriaRepository criteriaRepository,
            CandidatePublicService candidatePublicService,
            IdentityPublicService identityPublicService,
            EvaluationMapper evaluationMapper,
            Clock clock) {
        this.evaluationRepository = evaluationRepository;
        this.templateRepository = templateRepository;
        this.criteriaRepository = criteriaRepository;
        this.candidatePublicService = candidatePublicService;
        this.identityPublicService = identityPublicService;
        this.evaluationMapper = evaluationMapper;
        this.clock = clock;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public EvaluationResponse createEvaluation(CreateEvaluationRequest request, Long mentorId) {
        // 1. Tìm mẫu phiếu đánh giá
        EvaluationTemplate template =
                templateRepository
                        .findById(request.templateId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Mẫu phiếu đánh giá không tồn tại"));

        // 2. Kiểm tra mẫu phiếu còn hoạt động
        if (!Boolean.TRUE.equals(template.getActive())) {
            throw new TemplateInactiveException();
        }

        // 3. Kiểm tra bối cảnh đánh giá
        if (template.getContext() != request.context()) {
            throw new EvaluationContextMismatchException();
        }

        // 4. Kiểm tra ứng viên tồn tại và có role CANDIDATE qua IdentityPublicService
        if (!identityPublicService.existsById(request.userId())) {
            throw new ResourceNotFoundException("Ứng viên không tồn tại");
        }
        if (!identityPublicService.isCandidate(request.userId())) {
            throw new InvalidCandidateException();
        }

        // 5. Kiểm tra mentor tồn tại qua IdentityPublicService
        if (!identityPublicService.existsById(mentorId)) {
            throw new ResourceNotFoundException("Người đánh giá không tồn tại");
        }

        // 6. Lấy toàn bộ tiêu chí thuộc template
        List<EvaluationCriteria> templateCriteria =
                criteriaRepository.findAllByTemplateId(template.getId());

        if (templateCriteria.isEmpty()) {
            throw new ValidationException("Mẫu phiếu đánh giá chưa có tiêu chí nào");
        }

        // 7. Lấy danh sách điểm frontend gửi lên
        List<EvaluationScoreRequest> requestScores =
                request.scores() == null ? List.of() : request.scores();

        // 8. Kiểm tra criterionId bị trùng
        List<Long> criterionIds =
                requestScores.stream().map(EvaluationScoreRequest::criterionId).toList();

        if (new HashSet<>(criterionIds).size() != criterionIds.size()) {
            throw new ValidationException("Tiêu chí đánh giá bị trùng lặp");
        }

        // 9. Tạo map điểm được gửi lên, key = criterionId
        Map<Long, EvaluationScoreRequest> scoreRequestMap =
                requestScores.stream()
                        .collect(
                                Collectors.toMap(
                                        EvaluationScoreRequest::criterionId, Function.identity()));

        // 10. Kiểm tra tất cả criterionId gửi lên có thuộc template không
        Set<Long> templateCriterionIds =
                templateCriteria.stream()
                        .map(EvaluationCriteria::getId)
                        .collect(Collectors.toSet());

        for (Long criterionId : criterionIds) {
            if (!templateCriterionIds.contains(criterionId)) {
                throw new ValidationException(
                        "Tiêu chí không thuộc mẫu phiếu đã chọn: " + criterionId);
            }
        }

        // 11. Khởi tạo Evaluation ở trạng thái DRAFT
        Evaluation evaluation = new Evaluation();
        evaluation.setTemplate(template);
        evaluation.setUserId(request.userId());
        evaluation.setMentorId(mentorId);
        evaluation.setContext(request.context());
        evaluation.setBatchId(request.batchId());
        evaluation.setInterviewRoundId(request.interviewRoundId());
        evaluation.setStatus(EvaluationStatus.DRAFT);
        evaluation.setOverallComment(request.overallComment());
        evaluation.setScores(new ArrayList<>());

        // 12. Tạo EvaluationScore cho tất cả tiêu chí của template
        List<EvaluationScore> scores =
                templateCriteria.stream()
                        .map(
                                criterion -> {
                                    EvaluationScoreRequest scoreRequest =
                                            scoreRequestMap.get(criterion.getId());

                                    EvaluationScore es = new EvaluationScore();
                                    es.setEvaluation(evaluation);
                                    es.setCriterion(criterion);
                                    es.setScore(scoreRequest != null ? scoreRequest.score() : null);
                                    es.setComment(
                                            scoreRequest != null ? scoreRequest.comment() : null);
                                    return es;
                                })
                        .toList();

        evaluation.setScores(new ArrayList<>(scores));

        // 13. Lưu Evaluation và cascade scores
        Evaluation savedEvaluation = evaluationRepository.save(evaluation);

        // 14. Chuyển Entity thành Response record
        return evaluationMapper.toResponse(savedEvaluation);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateEvaluation(
            Long evaluationId, Long mentorId, UpdateEvaluationRequest request) {

        // 1. Tìm evaluation
        Evaluation evaluation =
                evaluationRepository
                        .findById(evaluationId)
                        .orElseThrow(EvaluationNotFoundException::new);

        // 2. IDOR check: Only the owning mentor may update (404 NOT_FOUND avoids disclosure)
        OwnershipGuard.requireSelf(
                mentorId, evaluation.getMentorId(), EvaluationNotFoundException::new);

        // 3. Chỉ cho phép chỉnh sửa phiếu ở trạng thái DRAFT
        if (evaluation.getStatus() != EvaluationStatus.DRAFT) {
            throw new EvaluationAlreadySubmittedException();
        }

        // 4. Lấy danh sách điểm gửi lên
        List<UpdateEvaluationRequest.ScoreRequest> requests =
                request.scores() == null ? List.of() : request.scores();

        // 5. Kiểm tra criterionId trùng nhau
        List<Long> criterionIds =
                requests.stream().map(UpdateEvaluationRequest.ScoreRequest::criterionId).toList();

        if (new HashSet<>(criterionIds).size() != criterionIds.size()) {
            throw new ValidationException("Tiêu chí đánh giá bị trùng lặp");
        }

        // 6. Lấy toàn bộ EvaluationScore hiện tại của phiếu
        Map<Long, EvaluationScore> scoreMap =
                evaluation.getScores().stream()
                        .collect(
                                Collectors.toMap(
                                        score -> score.getCriterion().getId(),
                                        Function.identity()));

        // 7. Kiểm tra và cập nhật điểm
        for (UpdateEvaluationRequest.ScoreRequest item : requests) {
            Long criterionId = item.criterionId();

            if (criterionId == null) {
                throw new ValidationException("Mã tiêu chí không được để trống");
            }

            EvaluationScore score = scoreMap.get(criterionId);
            if (score == null) {
                throw new ValidationException(
                        "Không thể thêm tiêu chí mới vào phiếu: " + criterionId);
            }

            if (item.score() != null) {
                score.setScore(item.score());
            }

            if (item.comment() != null) {
                score.setComment(item.comment());
            }
        }

        // 8. Cập nhật nhận xét chung nếu có
        if (request.overallComment() != null) {
            evaluation.setOverallComment(request.overallComment());
        }

        // 9. Lưu vào cơ sở dữ liệu
        evaluationRepository.save(evaluation);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void submitEvaluation(Long evaluationId, Long mentorId) {
        // 1. Tìm phiếu đánh giá
        Evaluation evaluation =
                evaluationRepository
                        .findById(evaluationId)
                        .orElseThrow(EvaluationNotFoundException::new);

        // 2. IDOR check: Only the owning mentor may submit (404 NOT_FOUND avoids disclosure)
        OwnershipGuard.requireSelf(
                mentorId, evaluation.getMentorId(), EvaluationNotFoundException::new);

        // 3. Trạng thái khác DRAFT -> ném 409 CONFLICT
        if (evaluation.getStatus() != EvaluationStatus.DRAFT) {
            throw new EvaluationAlreadySubmittedException(
                    "Phiếu đánh giá đã được gửi, không thể gửi lại");
        }

        // 4. Lấy toàn bộ tiêu chí của template kèm skill để tối ưu hóa truy vấn
        List<EvaluationCriteria> criteria =
                criteriaRepository.findAllByTemplateIdWithSkill(evaluation.getTemplate().getId());
        if (criteria.isEmpty()) {
            criteria = criteriaRepository.findAllByTemplateId(evaluation.getTemplate().getId());
        }

        // 5. Kiểm tra tính đầy đủ 100% tiêu chí có điểm
        Map<Long, EvaluationScore> scoreMap =
                evaluation.getScores().stream()
                        .collect(
                                Collectors.toMap(
                                        score -> score.getCriterion().getId(),
                                        Function.identity()));

        for (EvaluationCriteria criterion : criteria) {
            EvaluationScore score = scoreMap.get(criterion.getId());

            if (score == null || score.getScore() == null) {
                throw new EvaluationIncompleteException(
                        "Chưa chấm điểm cho tiêu chí: " + criterion.getId());
            }
        }

        // 6. Chuẩn hóa trọng số tiêu chí an toàn sang khoảng (0, 1] scale 3 và xây dựng evidence
        // DTOs
        OffsetDateTime evaluatedAt = OffsetDateTime.now(clock);
        List<MentorSkillEvidenceDto> evidences = new ArrayList<>();

        for (EvaluationCriteria criterion : criteria) {
            EvaluationScore score = scoreMap.get(criterion.getId());

            BigDecimal rawWeight = criterion.getWeight();
            if (rawWeight == null) {
                throw new ValidationException("Trọng số tiêu chí không được để trống");
            }

            BigDecimal normalizedWeight;
            if (rawWeight.compareTo(BigDecimal.ONE) > 0) {
                normalizedWeight =
                        rawWeight.divide(BigDecimal.valueOf(100), 3, RoundingMode.HALF_UP);
            } else {
                normalizedWeight = rawWeight.setScale(3, RoundingMode.HALF_UP);
            }

            if (normalizedWeight.compareTo(BigDecimal.ZERO) <= 0
                    || normalizedWeight.compareTo(BigDecimal.ONE) > 0) {
                throw new ValidationException("Trọng số tiêu chí không hợp lệ: " + rawWeight);
            }

            Integer skillId = criterion.getSkill() != null ? criterion.getSkill().getId() : null;
            String skillCode = criterion.getSkill() != null ? criterion.getSkill().getCode() : null;

            evidences.add(
                    new MentorSkillEvidenceDto(
                            skillId,
                            skillCode,
                            BigDecimal.valueOf(score.getScore()),
                            normalizedWeight,
                            evaluation.getId(),
                            criterion.getDescription(),
                            evaluatedAt));
        }

        // 7. Acquire per-user skill lock, then record mentor evidences and recompute skills
        candidatePublicService.acquireCandidateSkillLock(evaluation.getUserId());
        candidatePublicService.recordMentorEvidences(evaluation.getUserId(), evidences);

        // 8. Kích hoạt tính toán lại điểm kỹ năng ứng viên
        candidatePublicService.recomputeCandidateSkills(evaluation.getUserId());

        // 9. Cập nhật trạng thái phiếu sang SUBMITTED và ghi nhận thời điểm submit qua Clock
        evaluation.setStatus(EvaluationStatus.SUBMITTED);
        evaluation.setSubmittedAt(evaluatedAt);

        // 10. Lưu và flush để Hibernate kích hoạt @Version optimistic locking check
        evaluationRepository.saveAndFlush(evaluation);
    }
}
