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
import com.rikkei.jobs.recruitment.model.Application;
import com.rikkei.jobs.recruitment.model.InterviewRound;
import com.rikkei.jobs.recruitment.repository.ApplicationRepository;
import com.rikkei.jobs.recruitment.repository.InterviewRoundRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.*;
import java.util.stream.Collectors;
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
    private final ApplicationRepository applicationRepository;
    private final InterviewRoundRepository interviewRoundRepository;

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
            case INTERVIEW -> getInterviewTasks(mentor, mentorEmail);
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
            User user =
                    userRepository
                            .findById(internship.getUserId())
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

    private MentorEvaluationTasksResponse getInterviewTasks(User mentor, String mentorEmail) {

        // 1. Lấy các vòng phỏng vấn mà Mentor phụ trách
        List<InterviewRound> rounds =
                interviewRoundRepository.findAllByInterviewerEmailIgnoreCase(mentorEmail);

        if (rounds.isEmpty()) {
            return new MentorEvaluationTasksResponse(
                    EvaluationContext.INTERVIEW, null, 0, List.of());
        }

        // 2. Lấy danh sách Application ID
        List<Long> applicationIds =
                rounds.stream().map(InterviewRound::getApplicationId).distinct().toList();

        // 3. Lấy Applications tương ứng
        Map<Long, Application> applicationMap = new HashMap<>();

        for (Application application : applicationRepository.findAllById(applicationIds)) {
            applicationMap.put(application.getId(), application);
        }

        // 4. Lấy danh sách Candidate ID
        Set<Long> candidateIds =
                rounds.stream()
                        .map(round -> applicationMap.get(round.getApplicationId()))
                        .filter(application -> application != null)
                        .map(Application::getUserId)
                        .collect(Collectors.toSet());

        // 5. Lấy thông tin Candidate
        Map<Long, User> candidateMap = new HashMap<>();

        for (User candidate : userRepository.findAllById(candidateIds)) {
            candidateMap.put(candidate.getId(), candidate);
        }

        // 6. Lấy Evaluation của Mentor trong context INTERVIEW
        List<Evaluation> evaluations =
                evaluationRepository.findAllByMentorIdAndContext(
                        mentor.getId(), EvaluationContext.INTERVIEW);

        // 7. Map Evaluation theo interviewRoundId
        Map<Long, Evaluation> evaluationMap = new HashMap<>();

        for (Evaluation evaluation : evaluations) {
            if (evaluation.getInterviewRoundId() != null) {
                evaluationMap.putIfAbsent(evaluation.getInterviewRoundId(), evaluation);
            }
        }

        // 8. Ghép InterviewRound với Candidate và Evaluation
        List<MentorEvaluationTaskResponse> items = new ArrayList<>();

        for (InterviewRound round : rounds) {

            Application application = applicationMap.get(round.getApplicationId());

            if (application == null) {
                continue;
            }

            User candidate = candidateMap.get(application.getUserId());

            if (candidate == null) {
                continue;
            }

            Evaluation evaluation = evaluationMap.get(round.getId());

            items.add(
                    new MentorEvaluationTaskResponse(
                            candidate.getId(),
                            candidate.getFullName(),
                            candidate.getEmail(),
                            evaluation != null ? evaluation.getId() : null,
                            mapStatus(evaluation),
                            null,
                            null,
                            round.getId()));
        }

        return new MentorEvaluationTasksResponse(
                EvaluationContext.INTERVIEW, null, items.size(), List.copyOf(items));
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
