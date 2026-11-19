package com.rikkei.jobs.assessment.migration;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("V7 & V8 Evaluation Migration Schema & Seed Integration Tests")
public class EvaluationMigrationIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("jwt.secret", () -> "evaluation-migration-test-secret-key-32-bytes!");
    }

    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("4 Evaluation tables must exist in database")
    void testEvaluationTablesExist() {
        List<String> tables =
                List.of(
                        "evaluation_templates",
                        "evaluation_criteria",
                        "evaluations",
                        "evaluation_scores");

        for (String table : tables) {
            Boolean exists =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ?)",
                            Boolean.class,
                            table);
            assertTrue(Boolean.TRUE.equals(exists), "Table " + table + " must exist");
        }
    }

    @Test
    @DisplayName(
            "No cross-module foreign key constraints on evaluations table (user_id and mentor_id)")
    void testNoCrossModuleForeignKey() {
        // Query foreign keys from evaluations table
        List<Map<String, Object>> foreignKeys =
                jdbcTemplate.queryForList(
                        """
                SELECT
                    tc.constraint_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_name = 'evaluations'
                """);

        // Verify that NO foreign key references 'users' or 'candidate_profiles'
        for (Map<String, Object> fk : foreignKeys) {
            String foreignTable = (String) fk.get("foreign_table_name");
            String colName = (String) fk.get("column_name");
            assertNotEquals(
                    "users", foreignTable, "evaluations." + colName + " must not have FK to users");
            assertNotEquals(
                    "candidate_profiles",
                    foreignTable,
                    "evaluations." + colName + " must not have FK to candidate_profiles");
        }

        // Verify user_id and mentor_id columns exist as BIGINT
        String userIdType =
                jdbcTemplate.queryForObject(
                        "SELECT data_type FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'user_id'",
                        String.class);
        assertEquals("bigint", userIdType, "evaluations.user_id must be bigint");

        String mentorIdType =
                jdbcTemplate.queryForObject(
                        "SELECT data_type FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'mentor_id'",
                        String.class);
        assertEquals("bigint", mentorIdType, "evaluations.mentor_id must be bigint");
    }

    @Test
    @DisplayName("Internal foreign keys within assessment module exist and enforce integrity")
    void testInternalForeignKeys() {
        List<String> fkConstraints =
                jdbcTemplate.queryForList(
                        """
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE constraint_type = 'FOREIGN KEY'
                    AND table_name IN ('evaluation_criteria', 'evaluations', 'evaluation_scores')
                """,
                        String.class);

        assertTrue(
                fkConstraints.contains("fk_evaluation_criteria_template"),
                "fk_evaluation_criteria_template must exist");
        assertTrue(
                fkConstraints.contains("fk_evaluation_criteria_skill"),
                "fk_evaluation_criteria_skill must exist");
        assertTrue(
                fkConstraints.contains("fk_evaluations_template"),
                "fk_evaluations_template must exist");
        assertTrue(
                fkConstraints.contains("fk_evaluation_scores_evaluation"),
                "fk_evaluation_scores_evaluation must exist");
        assertTrue(
                fkConstraints.contains("fk_evaluation_scores_criterion"),
                "fk_evaluation_scores_criterion must exist");
    }

    @Test
    @DisplayName("Optimistic locking version column exists on evaluations table")
    void testOptimisticLockingVersionColumn() {
        String columnDefault =
                jdbcTemplate.queryForObject(
                        "SELECT column_default FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'version'",
                        String.class);
        assertNotNull(columnDefault, "version column must have default");
        assertTrue(columnDefault.contains("0"), "version column default must be 0");

        String isNullable =
                jdbcTemplate.queryForObject(
                        "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'version'",
                        String.class);
        assertEquals("NO", isNullable, "version column must be NOT NULL");
    }

    @Test
    @DisplayName("Performance indexes exist on evaluation tables")
    void testPerformanceIndexes() {
        List<String> indexes =
                jdbcTemplate.queryForList(
                        """
                SELECT indexname
                FROM pg_indexes
                WHERE tablename IN ('evaluation_templates', 'evaluation_criteria', 'evaluations', 'evaluation_scores')
                """,
                        String.class);

        assertTrue(
                indexes.contains("idx_evaluations_user_id"), "idx_evaluations_user_id must exist");
        assertTrue(
                indexes.contains("idx_evaluations_mentor_id"),
                "idx_evaluations_mentor_id must exist");
        assertTrue(
                indexes.contains("idx_evaluations_template_id"),
                "idx_evaluations_template_id must exist");
        assertTrue(indexes.contains("idx_evaluations_status"), "idx_evaluations_status must exist");
        assertTrue(
                indexes.contains("idx_evaluations_user_status"),
                "idx_evaluations_user_status must exist");
        assertTrue(
                indexes.contains("idx_evaluation_criteria_template_id"),
                "idx_evaluation_criteria_template_id must exist");
        assertTrue(
                indexes.contains("idx_evaluation_criteria_skill_id"),
                "idx_evaluation_criteria_skill_id must exist");
        assertTrue(
                indexes.contains("idx_evaluation_scores_evaluation_id"),
                "idx_evaluation_scores_evaluation_id must exist");
        assertTrue(
                indexes.contains("idx_evaluation_scores_criterion_id"),
                "idx_evaluation_scores_criterion_id must exist");
        assertTrue(
                indexes.contains("idx_evaluation_templates_position"),
                "idx_evaluation_templates_position must exist");
        assertTrue(
                indexes.contains("idx_evaluation_templates_context"),
                "idx_evaluation_templates_context must exist");
        assertTrue(
                indexes.contains("idx_evaluation_templates_active"),
                "idx_evaluation_templates_active must exist");
    }

    @Test
    @DisplayName(
            "Dev seed V8 inserts exactly 2 templates with 5 criteria each and 100% total weight")
    void testDevSeedTemplatesAndCriteria() {
        Integer templateCount =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM evaluation_templates", Integer.class);
        assertEquals(2, templateCount, "Dev seed must contain exactly 2 templates");

        // Template 1: Java Backend – Thực tập
        Long t1Id =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM evaluation_templates WHERE name = 'Java Backend – Thực tập' AND context = 'INTERNSHIP'",
                        Long.class);
        assertNotNull(t1Id, "Template 1 must exist");

        Integer t1CriteriaCount =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM evaluation_criteria WHERE template_id = ?",
                        Integer.class,
                        t1Id);
        assertEquals(5, t1CriteriaCount, "Template 1 must have exactly 5 criteria");

        BigDecimal t1TotalWeight =
                jdbcTemplate.queryForObject(
                        "SELECT SUM(weight) FROM evaluation_criteria WHERE template_id = ?",
                        BigDecimal.class,
                        t1Id);
        assertEquals(
                0,
                new BigDecimal("100.00").compareTo(t1TotalWeight),
                "Template 1 total weight must be 100.00");

        // Template 2: Phỏng vấn kỹ thuật chung
        Long t2Id =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM evaluation_templates WHERE name = 'Phỏng vấn kỹ thuật chung' AND context = 'INTERVIEW'",
                        Long.class);
        assertNotNull(t2Id, "Template 2 must exist");

        Integer t2CriteriaCount =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM evaluation_criteria WHERE template_id = ?",
                        Integer.class,
                        t2Id);
        assertEquals(5, t2CriteriaCount, "Template 2 must have exactly 5 criteria");

        BigDecimal t2TotalWeight =
                jdbcTemplate.queryForObject(
                        "SELECT SUM(weight) FROM evaluation_criteria WHERE template_id = ?",
                        BigDecimal.class,
                        t2Id);
        assertEquals(
                0,
                new BigDecimal("100.00").compareTo(t2TotalWeight),
                "Template 2 total weight must be 100.00");
    }

    @Test
    @DisplayName("Sample evaluations and scores are correctly seeded in dev profile")
    void testSampleEvaluationsSeeded() {
        Integer evaluationCount =
                jdbcTemplate.queryForObject("SELECT count(*) FROM evaluations", Integer.class);
        assertEquals(3, evaluationCount, "Dev seed must contain 3 sample evaluations");

        // Phiếu 1: Candidate 1 - SUBMITTED
        Integer submittedCount =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM evaluations WHERE user_id = 1 AND status = 'SUBMITTED'",
                        Integer.class);
        assertEquals(1, submittedCount, "Candidate 1 must have 1 SUBMITTED evaluation");

        // Phiếu 3: Candidate 3 - DRAFT
        Integer draftCount =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM evaluations WHERE user_id = 3 AND status = 'DRAFT'",
                        Integer.class);
        assertEquals(1, draftCount, "Candidate 3 must have 1 DRAFT evaluation");

        // Candidate 1 scores: 5 criteria filled
        Long eval1Id =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM evaluations WHERE user_id = 1 AND status = 'SUBMITTED'",
                        Long.class);
        Integer eval1ScoreCount =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM evaluation_scores WHERE evaluation_id = ? AND score IS NOT NULL",
                        Integer.class,
                        eval1Id);
        assertEquals(
                5, eval1ScoreCount, "Candidate 1 submitted evaluation must have 5 scored criteria");
    }
}
