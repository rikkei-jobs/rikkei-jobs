package com.rikkei.jobs.assessment.repository;

import static org.junit.jupiter.api.Assertions.*;

import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationScore;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import jakarta.persistence.EntityManagerFactory;
import java.util.List;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("Evaluation Anti N+1 Queries Integration Tests")
public class EvaluationAntiNPlusOneIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("jwt.secret", () -> "evaluation-anti-n1-test-secret-key-32-bytes!");
    }

    @Autowired private EvaluationRepository evaluationRepository;

    @Autowired private EntityManagerFactory entityManagerFactory;

    @Test
    @Transactional(readOnly = true)
    @DisplayName(
            "findSubmittedWithDetails executes exactly ONE SQL query and fetches all related entities")
    void testFindSubmittedWithDetails_executesExactlyOneQuery() {
        Long candidateUserId =
                1L; // Seeded candidate 1 has 1 SUBMITTED evaluation with 5 scores and criteria

        SessionFactory sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
        Statistics statistics = sessionFactory.getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();

        long initialQueryCount = statistics.getPrepareStatementCount();

        List<Evaluation> results =
                evaluationRepository.findSubmittedWithDetails(
                        candidateUserId, EvaluationStatus.SUBMITTED);

        assertFalse(results.isEmpty());

        // Exactly 1 SQL query statement executed
        long queryCountAfterFetch = statistics.getPrepareStatementCount() - initialQueryCount;
        assertEquals(1L, queryCountAfterFetch);

        // Traverse all lazy associations (template, scores, criterion, skill)
        for (Evaluation evaluation : results) {
            assertNotNull(evaluation.getTemplate());
            assertNotNull(evaluation.getTemplate().getName());
            assertFalse(evaluation.getScores().isEmpty());
            for (EvaluationScore score : evaluation.getScores()) {
                assertNotNull(score.getCriterion());
                assertNotNull(score.getCriterion().getDescription());
                assertNotNull(score.getCriterion().getSkill());
                assertNotNull(score.getCriterion().getSkill().getCode());
            }
        }

        // Verify that NO additional queries were generated when accessing lazy associations
        long totalQueryCount = statistics.getPrepareStatementCount() - initialQueryCount;
        assertEquals(1L, totalQueryCount);
    }
}
