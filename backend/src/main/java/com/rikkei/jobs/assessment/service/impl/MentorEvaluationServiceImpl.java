package com.rikkei.jobs.assessment.service.impl;

import com.rikkei.jobs.assessment.dto.response.MentorEvaluationTaskResponse;
import com.rikkei.jobs.assessment.dto.response.MentorEvaluationTaskStatus;
import com.rikkei.jobs.assessment.dto.response.MentorEvaluationTasksResponse;
import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.repository.EvaluationRepository;
import com.rikkei.jobs.assessment.service.MentorEvaluationService;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.internship.model.Internship;
import com.rikkei.jobs.internship.repository.InternshipRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MentorEvaluationServiceImpl implements MentorEvaluationService {

    private final InternshipRepository internshipRepository;
    private final UserRepository userRepository;
    private final EvaluationRepository evaluationRepository;

    @Override
    public MentorEvaluationTasksResponse getEvaluationTasks(
        EvaluationContext context, String batchId) {

        String mentorEmail = SecurityContextHolder.getContext().getAuthentication().getName();

        User mentor =
            userRepository
                .findByEmail(mentorEmail)
                .orElseThrow(() -> new IllegalArgumentException("Mentor not found"));

        return switch (context) {
            case INTERNSHIP -> getInternshipTasks(mentor, mentorEmail, batchId);
            case INTERVIEW -> getInterviewTasks(mentor);
        };
    }

    private MentorEvaluationTasksResponse getInternshipTasks(
        User mentor, String mentorEmail, String batchId) {

        // 1. Lấy danh sách Internship Mentor phụ trách
        List<Internship> internships =
            (batchId == null || batchId.isBlank())
                ? internshipRepository.findAllByMentorEmailIgnoreCase(mentorEmail)
                : internshipRepository.findAllByMentorEmailIgnoreCaseAndBatchId(
                mentorEmail, batchId);

        // 2. Lấy Evaluation của Mentor trong context INTERNSHIP
        List<Evaluation> evaluations =
            evaluationRepository.findAllByMentorIdAndContext(
                mentor.getId(), EvaluationContext.INTERNSHIP);

        // 3. Map Evaluation theo userId + batchId
        Map<String, Evaluation> evaluationMap = new LinkedHashMap<>();

        for (Evaluation evaluation : evaluations) {
            String key = buildKey(evaluation.getUserId(), evaluation.getBatchId());

            evaluationMap.putIfAbsent(key, evaluation);
        }

        // 4. Ghép Internship với Evaluation
        Map<String, MentorEvaluationTaskResponse> taskMap = new LinkedHashMap<>();

        for (Internship internship : internships) {
            User user = userRepository.findById(internship.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

            if (user == null) {
                continue;
            }

            String key = buildKey(user.getId(), internship.getBatchId());
            Evaluation evaluation = evaluationMap.get(key);

            MentorEvaluationTaskResponse task =
                new MentorEvaluationTaskResponse(
                    user.getId(),
                    user.getFullName(),
                    user.getEmail(),
                    evaluation != null ? evaluation.getId() : null,
                    mapStatus(evaluation),
                    internship.getBatchId(),
                    internship.getBatchName(),
                    null);

            taskMap.putIfAbsent(key, task);
        }

        List<MentorEvaluationTaskResponse> items = List.copyOf(taskMap.values());

        return new MentorEvaluationTasksResponse(
            EvaluationContext.INTERNSHIP, batchId, items.size(), items);
    }

    private MentorEvaluationTasksResponse getInterviewTasks(User mentor) {

        // TODO UT-02:
        // 1. Lấy interview_rounds theo interviewer_email của Mentor.
        // 2. Lấy Candidate tương ứng mỗi interview round.
        // 3. Đối chiếu Evaluation với context INTERVIEW.
        // 4. Mapping NOT_STARTED / DRAFT / SUBMITTED.
        // 5. Trả MentorEvaluationTasksResponse.

        throw new UnsupportedOperationException(
            "Interview evaluation tasks are not implemented yet");
    }

    private String mapStatus(Evaluation evaluation) {
        if (evaluation == null) {
            return MentorEvaluationTaskStatus.NOT_STARTED.name();
        }

        return evaluation.getStatus().name();
    }

    private String buildKey(Long userId, String batchId) {
        return userId + ":" + batchId;
    }
}
