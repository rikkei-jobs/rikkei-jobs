package com.rikkei.jobs.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.candidate.dto.PmInternshipResultCommand;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@DisplayName("V24 -> V25 Upgrade Migration, H1 Safety Net & Pre-V25 Duplicate PM Sync Tests")
public class V25UpgradeMigrationIntegrationTest {

    private static final String POSTGRES_IMAGE = "postgres:18.6-alpine";

    @Nested
    @DisplayName("Pure Flyway V24 -> V25 SQL Upgrade & Idempotency Tests")
    class SqlUpgradeTests {

        private DataSource createDataSource(PostgreSQLContainer db) {
            return new DriverManagerDataSource(db.getJdbcUrl(), db.getUsername(), db.getPassword());
        }

        private void executeMigrationScriptDirectly(DataSource dataSource, String classpath)
                throws SQLException {
            EncodedResource resource =
                    new EncodedResource(new ClassPathResource(classpath), StandardCharsets.UTF_8);
            try (Connection connection = dataSource.getConnection()) {
                ScriptUtils.executeSqlScript(
                        connection,
                        resource,
                        false,
                        false,
                        ScriptUtils.DEFAULT_COMMENT_PREFIX,
                        ScriptUtils.EOF_STATEMENT_SEPARATOR,
                        ScriptUtils.DEFAULT_BLOCK_COMMENT_START_DELIMITER,
                        ScriptUtils.DEFAULT_BLOCK_COMMENT_END_DELIMITER);
            }
        }

        @Test
        @DisplayName(
                "V25 preserves all external_records, assigns #h<id>, deduplicates external verified evidences, preserves MENTOR/SELF, and enforces partial unique index")
        void v24ToV25UpgradePreservesExternalRecordsAndDeduplicatesExternalEvidences()
                throws SQLException {
            try (PostgreSQLContainer db = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                db.start();
                DataSource dataSource = createDataSource(db);

                Flyway.configure()
                        .dataSource(dataSource)
                        .locations("classpath:db/migration", "classpath:db/migration-dev")
                        .target("24")
                        .validateOnMigrate(true)
                        .load()
                        .migrate();

                JdbcTemplate jdbc = new JdbcTemplate(dataSource);
                Integer preV25TotalExternal =
                        jdbc.queryForObject("SELECT count(*) FROM external_records", Integer.class);
                assertNotNull(preV25TotalExternal);

                Long canonicalPmId =
                        jdbc.queryForObject(
                                "SELECT id FROM external_records WHERE user_id = 1 AND source = 'PM' AND source_code = 'IOC-JB-2026-09'",
                                Long.class);
                assertNotNull(canonicalPmId);

                Long stalePmId =
                        jdbc.queryForObject(
                                """
                                INSERT INTO external_records (user_id, source, source_code, title, score, recorded_at)
                                VALUES (1, 'PM', 'IOC-JB-2026-09', 'IOC Java Backend 09/2026 (cũ)', 70.00, NOW() - INTERVAL '40 days')
                                RETURNING id
                                """,
                                Long.class);
                assertNotNull(stalePmId);

                Long canonicalLmsJavaId =
                        jdbc.queryForObject(
                                """
                                SELECT id FROM external_records
                                WHERE user_id = 1 AND source = 'LMS' AND source_code = 'JAVA01'
                                ORDER BY recorded_at DESC, id DESC
                                LIMIT 1
                                """,
                                Long.class);
                Long historicalLmsJavaId =
                        jdbc.queryForObject(
                                """
                                SELECT id FROM external_records
                                WHERE user_id = 1 AND source = 'LMS' AND source_code = 'JAVA01'
                                ORDER BY recorded_at ASC, id ASC
                                LIMIT 1
                                """,
                                Long.class);
                assertNotNull(canonicalLmsJavaId);
                assertNotNull(historicalLmsJavaId);

                // Seed duplicated external verified evidences (LMS, EXAM, INTERNSHIP) plus MENTOR
                // and SELF
                for (int i = 0; i < 3; i++) {
                    jdbc.update(
                            """
                            INSERT INTO skill_evidences (user_id, skill_id, source, source_ref, title, score, weight, recorded_at, verified)
                            SELECT 1, s.id, 'LMS', 'JAVA01', 'Lập trình Java', 85.00, 0.700, er.recorded_at, TRUE
                            FROM skills s, external_records er
                            WHERE s.code = 'JAVA' AND er.id = ?
                            """,
                            canonicalLmsJavaId);
                    jdbc.update(
                            """
                            INSERT INTO skill_evidences (user_id, skill_id, source, source_ref, title, score, weight, recorded_at, verified)
                            SELECT 1, s.id, 'EXAM', 'EX-JAVA-2026-10', 'Bài thi Java 10/2026', 80.00, 0.800, er.recorded_at, TRUE
                            FROM skills s, external_records er
                            WHERE s.code = 'JAVA' AND er.user_id = 1 AND er.source = 'EXAM' AND er.source_code = 'EX-JAVA-2026-10'
                            """);
                    jdbc.update(
                            """
                            INSERT INTO skill_evidences (user_id, skill_id, source, source_ref, title, score, weight, recorded_at, verified)
                            SELECT 1, s.id, 'INTERNSHIP', 'IOC-JB-2026-09', 'IOC Java Backend 09/2026', 85.00, 0.300, er.recorded_at, TRUE
                            FROM skills s, external_records er
                            WHERE s.code = 'JAVA' AND er.id = ?
                            """,
                            canonicalPmId);
                }

                // Also insert 2 MENTOR evidences for JAVA (same user, skill, source) to prove
                // MENTOR is never deduplicated or constrained
                jdbc.update(
                        """
                        INSERT INTO skill_evidences (user_id, skill_id, source, source_ref, title, score, weight, recorded_at, verified)
                        SELECT 1, s.id, 'MENTOR', 'eval-1', 'Mentor A', 80.00, 0.500, NOW() - INTERVAL '2 days', TRUE
                        FROM skills s WHERE s.code = 'JAVA'
                        """);
                jdbc.update(
                        """
                        INSERT INTO skill_evidences (user_id, skill_id, source, source_ref, title, score, weight, recorded_at, verified)
                        SELECT 1, s.id, 'MENTOR', 'eval-2', 'Mentor B', 90.00, 0.500, NOW() - INTERVAL '1 day', TRUE
                        FROM skills s WHERE s.code = 'JAVA'
                        """);

                Integer selfCountBefore =
                        jdbc.queryForObject(
                                "SELECT count(*) FROM skill_evidences WHERE user_id = 1 AND source = 'SELF'",
                                Integer.class);
                assertEquals(4, selfCountBefore);

                int executed =
                        Flyway.configure()
                                .dataSource(dataSource)
                                .locations("classpath:db/migration", "classpath:db/migration-dev")
                                .validateOnMigrate(true)
                                .load()
                                .migrate()
                                .migrationsExecuted;
                assertEquals(1, executed);

                // 1. Zero external_records rows deleted
                Integer postV25TotalExternal =
                        jdbc.queryForObject("SELECT count(*) FROM external_records", Integer.class);
                assertEquals(preV25TotalExternal + 1, postV25TotalExternal);

                // 2. Deterministic source_key backfill
                assertEquals(
                        "1:IOC-JB-2026-09",
                        jdbc.queryForObject(
                                "SELECT source_key FROM external_records WHERE id = ?",
                                String.class,
                                canonicalPmId));
                assertEquals(
                        "1:IOC-JB-2026-09#h" + stalePmId,
                        jdbc.queryForObject(
                                "SELECT source_key FROM external_records WHERE id = ?",
                                String.class,
                                stalePmId));
                assertEquals(
                        "1:JAVA01",
                        jdbc.queryForObject(
                                "SELECT source_key FROM external_records WHERE id = ?",
                                String.class,
                                canonicalLmsJavaId));
                assertEquals(
                        "1:JAVA01#h" + historicalLmsJavaId,
                        jdbc.queryForObject(
                                "SELECT source_key FROM external_records WHERE id = ?",
                                String.class,
                                historicalLmsJavaId));

                // 3. Duplicate external verified evidences collapsed to 1 per (external_record_id,
                // skill_id)
                assertEquals(
                        1,
                        jdbc.queryForObject(
                                """
                                SELECT count(*) FROM skill_evidences se
                                INNER JOIN skills s ON s.id = se.skill_id
                                WHERE se.user_id = 1 AND se.source = 'LMS' AND se.source_ref = 'JAVA01' AND s.code = 'JAVA'
                                """,
                                Integer.class));
                assertEquals(
                        1,
                        jdbc.queryForObject(
                                """
                                SELECT count(*) FROM skill_evidences se
                                INNER JOIN skills s ON s.id = se.skill_id
                                WHERE se.user_id = 1 AND se.source = 'EXAM' AND se.source_ref = 'EX-JAVA-2026-10' AND s.code = 'JAVA'
                                """,
                                Integer.class));
                assertEquals(
                        1,
                        jdbc.queryForObject(
                                """
                                SELECT count(*) FROM skill_evidences se
                                INNER JOIN skills s ON s.id = se.skill_id
                                WHERE se.user_id = 1 AND se.source = 'INTERNSHIP' AND se.source_ref = 'IOC-JB-2026-09' AND s.code = 'JAVA'
                                """,
                                Integer.class));

                // 4. MENTOR and SELF evidences preserved completely with NULL external_record_id
                assertEquals(
                        2,
                        jdbc.queryForObject(
                                "SELECT count(*) FROM skill_evidences WHERE user_id = 1 AND source = 'MENTOR' AND external_record_id IS NULL",
                                Integer.class));
                assertEquals(
                        4,
                        jdbc.queryForObject(
                                "SELECT count(*) FROM skill_evidences WHERE user_id = 1 AND source = 'SELF' AND external_record_id IS NULL",
                                Integer.class));

                // 5. Partial unique index blocks duplicate (external_record_id, skill_id) while
                // allowing another MENTOR/SELF or another external_record_id
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbc.update(
                                        """
                                        INSERT INTO skill_evidences (user_id, skill_id, source, source_ref, title, score, weight, recorded_at, verified, external_record_id)
                                        SELECT 1, s.id, 'LMS', 'JAVA01', 'Duplicate', 85.00, 0.700, NOW(), TRUE, ?
                                        FROM skills s WHERE s.code = 'JAVA'
                                        """,
                                        canonicalLmsJavaId));

                // Historical LMS JAVA01 record can store its own JAVA evidence without colliding
                // with canonical JAVA01
                jdbc.update(
                        """
                        INSERT INTO skill_evidences (user_id, skill_id, source, source_ref, title, score, weight, recorded_at, verified, external_record_id)
                        SELECT 1, s.id, 'LMS', 'JAVA01', 'Lập trình Java (kỳ trước)', 60.00, 0.700, NOW(), TRUE, ?
                        FROM skills s WHERE s.code = 'JAVA'
                        """,
                        historicalLmsJavaId);

                // 6. Verify module boundary (zero FKs to users; manual_overrides ->
                // external_records with NO ACTION)
                List<Map<String, Object>> overrideFks =
                        jdbc.queryForList(
                                """
                                SELECT tc.constraint_name, ccu.table_name AS foreign_table_name, rc.delete_rule
                                FROM information_schema.table_constraints AS tc
                                JOIN information_schema.constraint_column_usage AS ccu
                                  ON ccu.constraint_name = tc.constraint_name
                                  AND ccu.table_schema = tc.table_schema
                                JOIN information_schema.referential_constraints AS rc
                                  ON rc.constraint_name = tc.constraint_name
                                  AND rc.constraint_schema = tc.table_schema
                                WHERE tc.constraint_type = 'FOREIGN KEY'
                                  AND tc.table_schema = 'public'
                                  AND tc.table_name = 'manual_overrides'
                                """);
                assertEquals(1, overrideFks.size());
                assertEquals("external_records", overrideFks.getFirst().get("foreign_table_name"));
                assertEquals("NO ACTION", overrideFks.getFirst().get("delete_rule"));

                List<Map<String, Object>> syncRunFks =
                        jdbc.queryForList(
                                """
                                SELECT tc.constraint_name
                                FROM information_schema.table_constraints AS tc
                                WHERE tc.constraint_type = 'FOREIGN KEY'
                                  AND tc.table_schema = 'public'
                                  AND tc.table_name = 'sync_runs'
                                """);
                assertTrue(syncRunFks.isEmpty(), "sync_runs must have zero physical FKs");

                // 7. Direct SQL rerun idempotency
                executeMigrationScriptDirectly(
                        dataSource, "db/migration/V25__nt05_external_sync.sql");
                assertEquals(
                        postV25TotalExternal,
                        jdbc.queryForObject(
                                "SELECT count(*) FROM external_records", Integer.class));
            }
        }
    }

    @Nested
    @SpringBootTest
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("Pre-V25 Duplicate PM Sync After Upgrade (Stop Gate (A))")
    class PreV25DuplicatePmSyncTests {

        @Container
        static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

        private static volatile boolean preSeededAtV24 = false;

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            if (!preSeededAtV24) {
                DriverManagerDataSource ds =
                        new DriverManagerDataSource(
                                postgres.getJdbcUrl(),
                                postgres.getUsername(),
                                postgres.getPassword());
                Flyway.configure()
                        .dataSource(ds)
                        .locations("classpath:db/migration", "classpath:db/migration-dev")
                        .target("24")
                        .validateOnMigrate(true)
                        .load()
                        .migrate();
                JdbcTemplate jdbc = new JdbcTemplate(ds);
                jdbc.update(
                        """
                        INSERT INTO external_records (user_id, source, source_code, title, score, recorded_at)
                        VALUES (1, 'PM', 'IOC-JB-2026-09', 'IOC Java Backend 09/2026 (trùng trước V25)', 72.00, NOW() - INTERVAL '45 days')
                        """);
                preSeededAtV24 = true;
            }
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }

        @Autowired private CandidatePublicService candidatePublicService;
        @Autowired private JdbcTemplate jdbcTemplate;

        @Test
        @DisplayName(
                "Pre-V25 duplicate PM rows survive V25 untouched, and PM sync cleans excess rows leaving 1 canonical row with no FK error")
        void preV25DuplicatePmRowsCleanedBySyncWithoutFkError() {
            Integer beforeSyncPmCount =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM external_records WHERE user_id = 1 AND source = 'PM' AND source_code = 'IOC-JB-2026-09'",
                            Integer.class);
            assertEquals(
                    2,
                    beforeSyncPmCount,
                    "V25 must preserve both pre-V25 PM rows (canonical + #h)");

            Boolean hasHistoricalSuffix =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM external_records WHERE user_id = 1 AND source = 'PM' AND source_code = 'IOC-JB-2026-09' AND source_key LIKE '1:IOC-JB-2026-09#h%')",
                            Boolean.class);
            assertTrue(Boolean.TRUE.equals(hasHistoricalSuffix));

            candidatePublicService.recordPmInternshipResults(
                    1L,
                    List.of(
                            new PmInternshipResultCommand(
                                    "IOC-JB-2026-09",
                                    "Hệ thống đặt lịch phòng họp",
                                    new BigDecimal("8.5"))));

            Integer afterSyncPmCount =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM external_records WHERE user_id = 1 AND source = 'PM' AND source_code = 'IOC-JB-2026-09'",
                            Integer.class);
            assertEquals(1, afterSyncPmCount, "PM sync must collapse duplicate PM rows to 1 row");

            String remainingKey =
                    jdbcTemplate.queryForObject(
                            "SELECT source_key FROM external_records WHERE user_id = 1 AND source = 'PM' AND source_code = 'IOC-JB-2026-09'",
                            String.class);
            assertEquals("1:IOC-JB-2026-09", remainingKey);

            Integer internshipEvidences =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM skill_evidences WHERE user_id = 1 AND source = 'INTERNSHIP' AND source_ref = 'IOC-JB-2026-09'",
                            Integer.class);
            assertEquals(4, internshipEvidences);
        }
    }
}
