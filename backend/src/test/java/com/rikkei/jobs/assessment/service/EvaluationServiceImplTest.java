package com.rikkei.jobs.assessment.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.request.UpdateEvaluationRequest;
import com.rikkei.jobs.assessment.mapper.EvaluationMapper;
import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.model.EvaluationCriteria;
import com.rikkei.jobs.assessment.model.EvaluationScore;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import com.rikkei.jobs.assessment.model.EvaluationTemplate;
import com.rikkei.jobs.assessment.model.Skill;
import com.rikkei.jobs.assessment.repository.EvaluationCriteriaRepository;
import com.rikkei.jobs.assessment.repository.EvaluationRepository;
import com.rikkei.jobs.assessment.repository.EvaluationTemplateRepository;
import com.rikkei.jobs.assessment.service.impl.EvaluationServiceImpl;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.common.exception.EvaluationAlreadySubmittedException;
import com.rikkei.jobs.common.exception.EvaluationContextMismatchException;
import com.rikkei.jobs.common.exception.EvaluationIncompleteException;
import com.rikkei.jobs.common.exception.EvaluationNotFoundException;
import com.rikkei.jobs.common.exception.InvalidCandidateException;
import com.rikkei.jobs.common.exception.TemplateInactiveException;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("EvaluationServiceImpl Unit Tests (Atomic Submit, Weight Normalization & Concurrency)")
class EvaluationServiceImplTest {

    @Mock private EvaluationRepository evaluationRepository;

    @Mock private EvaluationTemplateRepository templateRepository;

    @Mock private EvaluationCriteriaRepository criteriaRepository;

    @Mock private CandidatePublicService candidatePublicService;

    @Mock private IdentityPublicService identityPublicService;

    @Mock private EvaluationMapper evaluationMapper;

    private Clock fixedClock;
    private EvaluationServiceImpl evaluationService;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-11-16T12:00:00Z"), ZoneOffset.UTC);
        evaluationService =
                new EvaluationServiceImpl(
                        evaluationRepository,
                        templateRepository,
                        criteriaRepository,
                        candidatePublicService,
                        identityPublicService,
                        evaluationMapper,
                        fixedClock);
    }

    @Test
    @DisplayName("Create evaluation fails if template is inactive")
    void testCreateEvaluation_inactiveTemplate_throwsException() {
        Long templateId = 1L;
        Long candidateId = 2L;
        Long mentorId = 3L;

        EvaluationTemplate template = new EvaluationTemplate();
        template.setId(templateId);
        template.setActive(false);
        template.setContext(EvaluationContext.INTERNSHIP);

        when(templateRepository.findById(templateId)).thenReturn(Optional.of(template));

        CreateEvaluationRequest request =
                new CreateEvaluationRequest(
                        templateId,
                        candidateId,
                        EvaluationContext.INTERNSHIP,
                        null,
                        null,
                        null,
                        null);

        assertThrows(
                TemplateInactiveException.class,
                () -> evaluationService.createEvaluation(request, mentorId));
    }

    @Test
    @DisplayName("Create evaluation fails if context does not match template")
    void testCreateEvaluation_contextMismatch_throwsException() {
        Long templateId = 1L;
        Long candidateId = 2L;
        Long mentorId = 3L;

        EvaluationTemplate template = new EvaluationTemplate();
        template.setId(templateId);
        template.setActive(true);
        template.setContext(EvaluationContext.INTERNSHIP);

        when(templateRepository.findById(templateId)).thenReturn(Optional.of(template));

        CreateEvaluationRequest request =
                new CreateEvaluationRequest(
                        templateId,
                        candidateId,
                        EvaluationContext.INTERVIEW,
                        null,
                        null,
                        null,
                        null);

        assertThrows(
                EvaluationContextMismatchException.class,
                () -> evaluationService.createEvaluation(request, mentorId));
    }

    @Test
    @DisplayName("Create evaluation fails if target user is not a candidate")
    void testCreateEvaluation_notCandidate_throwsException() {
        Long templateId = 1L;
        Long candidateId = 2L;
        Long mentorId = 3L;

        EvaluationTemplate template = new EvaluationTemplate();
        template.setId(templateId);
        template.setActive(true);
        template.setContext(EvaluationContext.INTERNSHIP);

        when(templateRepository.findById(templateId)).thenReturn(Optional.of(template));
        when(identityPublicService.existsById(candidateId)).thenReturn(true);
        when(identityPublicService.isCandidate(candidateId)).thenReturn(false);

        CreateEvaluationRequest request =
                new CreateEvaluationRequest(
                        templateId,
                        candidateId,
                        EvaluationContext.INTERNSHIP,
                        null,
                        null,
                        null,
                        null);

        assertThrows(
                InvalidCandidateException.class,
                () -> evaluationService.createEvaluation(request, mentorId));
    }

    @Test
    @DisplayName("IDOR check: Mentor updating other mentor's evaluation throws 404 NOT_FOUND")
    void testUpdateEvaluation_idorCheck_throwsNotFound() {
        Long evalId = 100L;
        Long ownerMentorId = 10L;
        Long attackingMentorId = 20L;

        Evaluation evaluation = new Evaluation();
        evaluation.setId(evalId);
        evaluation.setMentorId(ownerMentorId);
        evaluation.setStatus(EvaluationStatus.DRAFT);

        when(evaluationRepository.findById(evalId)).thenReturn(Optional.of(evaluation));

        UpdateEvaluationRequest request = new UpdateEvaluationRequest("Comment", List.of());

        EvaluationNotFoundException ex =
                assertThrows(
                        EvaluationNotFoundException.class,
                        () ->
                                evaluationService.updateEvaluation(
                                        evalId, attackingMentorId, request));
        assertEquals("Phiếu đánh giá không tồn tại", ex.getMessage());

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Update evaluation already SUBMITTED throws 409 CONFLICT")
    void testUpdateEvaluation_alreadySubmitted_throwsConflict() {
        Long evalId = 100L;
        Long mentorId = 10L;

        Evaluation evaluation = new Evaluation();
        evaluation.setId(evalId);
        evaluation.setMentorId(mentorId);
        evaluation.setStatus(EvaluationStatus.SUBMITTED);

        when(evaluationRepository.findById(evalId)).thenReturn(Optional.of(evaluation));

        UpdateEvaluationRequest request = new UpdateEvaluationRequest("Comment", List.of());

        assertThrows(
                EvaluationAlreadySubmittedException.class,
                () -> evaluationService.updateEvaluation(evalId, mentorId, request));

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    @DisplayName("IDOR check: Mentor submitting other mentor's evaluation throws 404 NOT_FOUND")
    void testSubmitEvaluation_idorCheck_throwsNotFound() {
        Long evalId = 100L;
        Long ownerMentorId = 10L;
        Long attackingMentorId = 20L;

        Evaluation evaluation = new Evaluation();
        evaluation.setId(evalId);
        evaluation.setMentorId(ownerMentorId);
        evaluation.setStatus(EvaluationStatus.DRAFT);

        when(evaluationRepository.findById(evalId)).thenReturn(Optional.of(evaluation));

        EvaluationNotFoundException ex =
                assertThrows(
                        EvaluationNotFoundException.class,
                        () -> evaluationService.submitEvaluation(evalId, attackingMentorId));
        assertEquals("Phiếu đánh giá không tồn tại", ex.getMessage());

        verify(candidatePublicService, never()).recordMentorEvidences(any(), any());
        verify(candidatePublicService, never()).recomputeCandidateSkills(any());
    }

    @Test
    @DisplayName("Submit evaluation already SUBMITTED throws 409 CONFLICT")
    void testSubmitEvaluation_alreadySubmitted_throwsConflict() {
        Long evalId = 100L;
        Long mentorId = 10L;

        Evaluation evaluation = new Evaluation();
        evaluation.setId(evalId);
        evaluation.setMentorId(mentorId);
        evaluation.setStatus(EvaluationStatus.SUBMITTED);

        when(evaluationRepository.findById(evalId)).thenReturn(Optional.of(evaluation));

        assertThrows(
                EvaluationAlreadySubmittedException.class,
                () -> evaluationService.submitEvaluation(evalId, mentorId));

        verify(candidatePublicService, never()).recordMentorEvidences(any(), any());
        verify(candidatePublicService, never()).recomputeCandidateSkills(any());
    }

    @Test
    @DisplayName("Submit evaluation fails with 400 if even 1 criterion is missing score")
    void testSubmitEvaluation_incompleteScores_throwsIncompleteException() {
        Long evalId = 100L;
        Long mentorId = 10L;
        Long templateId = 1L;

        EvaluationTemplate template = new EvaluationTemplate();
        template.setId(templateId);

        EvaluationCriteria c1 = new EvaluationCriteria();
        c1.setId(11L);
        c1.setWeight(BigDecimal.valueOf(50.00));
        EvaluationCriteria c2 = new EvaluationCriteria();
        c2.setId(12L);
        c2.setWeight(BigDecimal.valueOf(50.00));

        Evaluation evaluation = new Evaluation();
        evaluation.setId(evalId);
        evaluation.setMentorId(mentorId);
        evaluation.setTemplate(template);
        evaluation.setStatus(EvaluationStatus.DRAFT);

        EvaluationScore s1 = new EvaluationScore();
        s1.setCriterion(c1);
        s1.setScore(80);

        EvaluationScore s2 = new EvaluationScore();
        s2.setCriterion(c2);
        s2.setScore(null); // Missing score

        evaluation.setScores(List.of(s1, s2));

        when(evaluationRepository.findById(evalId)).thenReturn(Optional.of(evaluation));
        when(criteriaRepository.findAllByTemplateIdWithSkill(templateId))
                .thenReturn(List.of(c1, c2));

        assertThrows(
                EvaluationIncompleteException.class,
                () -> evaluationService.submitEvaluation(evalId, mentorId));

        // Ensures rollback behavior: no evidences saved, no recompute, status stays DRAFT
        verify(candidatePublicService, never()).recordMentorEvidences(any(), any());
        verify(candidatePublicService, never()).recomputeCandidateSkills(any());
        verify(evaluationRepository, never()).saveAndFlush(any());
        assertEquals(EvaluationStatus.DRAFT, evaluation.getStatus());
    }

    @Test
    @DisplayName(
            "Submit evaluation successfully normalizes weights, records evidences, recomputes skills, and updates status")
    void testSubmitEvaluation_success_normalizesWeightAndRecordsEvidences() {
        Long evalId = 100L;
        Long mentorId = 10L;
        Long candidateId = 5L;
        Long templateId = 1L;

        EvaluationTemplate template = new EvaluationTemplate();
        template.setId(templateId);

        Skill skill1 = new Skill();
        skill1.setId(101);
        skill1.setCode("JAVA_CORE");

        Skill skill2 = new Skill();
        skill2.setId(102);
        skill2.setCode("SPRING_BOOT");

        EvaluationCriteria c1 = new EvaluationCriteria();
        c1.setId(11L);
        c1.setDescription("Java fundamentals");
        c1.setWeight(BigDecimal.valueOf(40.00)); // raw weight on 100-scale
        c1.setSkill(skill1);

        EvaluationCriteria c2 = new EvaluationCriteria();
        c2.setId(12L);
        c2.setDescription("Spring Boot REST");
        c2.setWeight(BigDecimal.valueOf(0.60)); // raw weight <= 1.0
        c2.setSkill(skill2);

        Evaluation evaluation = new Evaluation();
        evaluation.setId(evalId);
        evaluation.setMentorId(mentorId);
        evaluation.setUserId(candidateId);
        evaluation.setTemplate(template);
        evaluation.setStatus(EvaluationStatus.DRAFT);

        EvaluationScore s1 = new EvaluationScore();
        s1.setCriterion(c1);
        s1.setScore(85);

        EvaluationScore s2 = new EvaluationScore();
        s2.setCriterion(c2);
        s2.setScore(90);

        evaluation.setScores(List.of(s1, s2));

        when(evaluationRepository.findById(evalId)).thenReturn(Optional.of(evaluation));
        when(criteriaRepository.findAllByTemplateIdWithSkill(templateId))
                .thenReturn(List.of(c1, c2));

        evaluationService.submitEvaluation(evalId, mentorId);

        // Verify evidence recording with normalized weight
        verify(candidatePublicService, times(1))
                .recordMentorEvidences(
                        eq(candidateId),
                        argThat(
                                list -> {
                                    if (list.size() != 2) return false;
                                    // 40.00 / 100 = 0.400
                                    boolean check1 =
                                            list.get(0).weight().compareTo(new BigDecimal("0.400"))
                                                            == 0
                                                    && list.get(0)
                                                                    .score()
                                                                    .compareTo(
                                                                            BigDecimal.valueOf(85))
                                                            == 0
                                                    && "JAVA_CORE".equals(list.get(0).skillCode());
                                    // 0.60 setScale(3) = 0.600
                                    boolean check2 =
                                            list.get(1).weight().compareTo(new BigDecimal("0.600"))
                                                            == 0
                                                    && list.get(1)
                                                                    .score()
                                                                    .compareTo(
                                                                            BigDecimal.valueOf(90))
                                                            == 0
                                                    && "SPRING_BOOT"
                                                            .equals(list.get(1).skillCode());
                                    return check1 && check2;
                                }));

        // Verify skill recomputation triggered
        verify(candidatePublicService, times(1)).recomputeCandidateSkills(candidateId);

        // Verify status and submittedAt updated with injected clock
        assertEquals(EvaluationStatus.SUBMITTED, evaluation.getStatus());
        assertEquals(
                OffsetDateTime.ofInstant(fixedClock.instant(), ZoneOffset.UTC),
                evaluation.getSubmittedAt());

        // Verify entity persisted with saveAndFlush
        verify(evaluationRepository, times(1)).saveAndFlush(evaluation);
    }
}
