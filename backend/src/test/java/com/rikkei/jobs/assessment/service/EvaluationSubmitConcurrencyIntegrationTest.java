package com.rikkei.jobs.assessment.service;

import static org.junit.jupiter.api.Assertions.*;

import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationCriteria;
import com.rikkei.jobs.assessment.model.EvaluationScore;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import com.rikkei.jobs.assessment.model.EvaluationTemplate;
import com.rikkei.jobs.assessment.repository.EvaluationCriteriaRepository;
import com.rikkei.jobs.assessment.repository.EvaluationRepository;
import com.rikkei.jobs.assessment.repository.EvaluationTemplateRepository;
import com.rikkei.jobs.candidate.model.SkillEvidence;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.EvaluationAlreadySubmittedException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("Evaluation Submit Concurrency & Optimistic Locking Integration Tests")
public class EvaluationSubmitConcurrencyIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("jwt.secret", () -> "evaluation-concurrency-test-secret-key-32-bytes!");
    }

    @Autowired private EvaluationService evaluationService;

    @Autowired private EvaluationRepository evaluationRepository;

    @Autowired private EvaluationTemplateRepository templateRepository;

    @Autowired private EvaluationCriteriaRepository criteriaRepository;

    @Autowired private SkillEvidenceRepository skillEvidenceRepository;

    @Test
    @DisplayName(
            "Concurrent double submit is safely protected: exactly 1 succeeds, 1 returns 409, 1 evidence set created")
    void testConcurrentSubmit_optimisticLockingProtection() throws Exception {
        // 1. Setup a clean DRAFT evaluation with all criteria scored
        EvaluationTemplate template =
                templateRepository.findAll().stream()
                        .filter(t -> Boolean.TRUE.equals(t.getActive()))
                        .findFirst()
                        .orElseThrow();

        List<EvaluationCriteria> criteriaList =
                criteriaRepository.findAllByTemplateId(template.getId());
        assertFalse(criteriaList.isEmpty());

        Long candidateUserId = 1L;
        Long mentorId = 6L;

        Evaluation evaluation = new Evaluation();
        evaluation.setTemplate(template);
        evaluation.setUserId(candidateUserId);
        evaluation.setMentorId(mentorId);
        evaluation.setContext(template.getContext());
        evaluation.setStatus(EvaluationStatus.DRAFT);
        evaluation.setOverallComment("Concurrent test evaluation");

        List<EvaluationScore> scores = new ArrayList<>();
        for (EvaluationCriteria criterion : criteriaList) {
            EvaluationScore score = new EvaluationScore();
            score.setEvaluation(evaluation);
            score.setCriterion(criterion);
            score.setScore(85);
            score.setComment("Good");
            scores.add(score);
        }
        evaluation.setScores(scores);

        Evaluation savedEvaluation = evaluationRepository.saveAndFlush(evaluation);
        Long evalId = savedEvaluation.getId();

        int initialEvidencesCount =
                skillEvidenceRepository.findByUserIdOrderByRecordedAtDesc(candidateUserId).size();

        // 2. Launch 2 concurrent threads to submit the same evaluation
        int threadsCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadsCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadsCount);

        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger conflictCount = new AtomicInteger();

        for (int i = 0; i < threadsCount; i++) {
            executor.submit(
                    () -> {
                        try {
                            startLatch.await();
                            evaluationService.submitEvaluation(evalId, mentorId);
                            successCount.incrementAndGet();
                        } catch (ConflictException
                                | EvaluationAlreadySubmittedException
                                | ObjectOptimisticLockingFailureException ex) {
                            conflictCount.incrementAndGet();
                        } catch (Exception ex) {
                            // unexpected exception
                        } finally {
                            doneLatch.countDown();
                        }
                    });
        }

        // Fire both threads simultaneously
        startLatch.countDown();
        boolean finished = doneLatch.await(10, TimeUnit.SECONDS);
        assertTrue(finished);
        executor.shutdown();

        // 3. Verify exactly 1 success and 1 conflict
        assertEquals(1, successCount.get());
        assertEquals(1, conflictCount.get());

        // 4. Verify evaluation status is SUBMITTED and version incremented
        Evaluation finalEvaluation = evaluationRepository.findById(evalId).orElseThrow();
        assertEquals(EvaluationStatus.SUBMITTED, finalEvaluation.getStatus());
        assertTrue(finalEvaluation.getVersion() > 0L);

        // 5. Verify only ONE set of skill_evidences was generated (no duplication)
        List<SkillEvidence> finalEvidences =
                skillEvidenceRepository.findByUserIdOrderByRecordedAtDesc(candidateUserId);
        int newEvidencesCreated = finalEvidences.size() - initialEvidencesCount;
        assertEquals(criteriaList.size(), newEvidencesCreated);
    }
}
