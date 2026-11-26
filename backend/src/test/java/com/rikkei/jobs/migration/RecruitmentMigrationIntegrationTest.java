package com.rikkei.jobs.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.OffsetDateTime;
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

@DisplayName(
        "V19..V24 Recruitment Applications & Interview Rounds Migration, Constraints & Seed Tests")
public class RecruitmentMigrationIntegrationTest {

    private static final String POSTGRES_IMAGE = "postgres:18.6-alpine";
    private static final String SAMPLE_PDF_SHA256 =
            "9b71184ae956dd96864598cc8abfffb29bcf23c9bff28aff431fd779ac564782";

    @Nested
    @DisplayName("Clean Empty DB, V1..V17 Baseline Upgrade & Direct SQL Idempotency")
    class LifecycleAndUpgradeTests {

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
        @DisplayName("Prod migrations V19, V21 and V23 apply cleanly from empty DB with 0 rows")
        void testProdMigrationsApplyCleanlyFromEmptyDatabase() {
            try (PostgreSQLContainer db = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                db.start();
                DataSource dataSource = createDataSource(db);
                Flyway.configure()
                        .dataSource(dataSource)
                        .locations("classpath:db/migration")
                        .validateOnMigrate(true)
                        .load()
                        .migrate();

                JdbcTemplate jdbc = new JdbcTemplate(dataSource);
                assertEquals(
                        Integer.valueOf(12),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                assertEquals(
                        Integer.valueOf(0),
                        jdbc.queryForObject("SELECT count(*) FROM applications", Integer.class));
                assertEquals(
                        Integer.valueOf(0),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM application_status_history", Integer.class));
                assertEquals(
                        Integer.valueOf(0),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM application_cv_snapshots", Integer.class));
                assertEquals(
                        Integer.valueOf(0),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM interview_rounds", Integer.class));
            }
        }

        @Test
        @DisplayName(
                "Dev migrations apply 21 scripts, 7 applications, 6 interview rounds, and advance sequences")
        void testDevMigrationsApplyCleanlyFromEmptyDatabase() {
            try (PostgreSQLContainer db = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                db.start();
                DataSource dataSource = createDataSource(db);
                Flyway.configure()
                        .dataSource(dataSource)
                        .locations("classpath:db/migration", "classpath:db/migration-dev")
                        .validateOnMigrate(true)
                        .load()
                        .migrate();

                JdbcTemplate jdbc = new JdbcTemplate(dataSource);
                assertEquals(
                        Integer.valueOf(21),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                assertEquals(
                        Integer.valueOf(7),
                        jdbc.queryForObject("SELECT count(*) FROM applications", Integer.class));
                assertEquals(
                        Integer.valueOf(7),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM application_cv_snapshots", Integer.class));
                assertEquals(
                        Integer.valueOf(6),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM interview_rounds", Integer.class));

                Long nextAppId =
                        jdbc.queryForObject(
                                "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                        + "VALUES (7, 2, 1, '/api/v1/me/applications/8/cv-snapshot', 'SUBMITTED') RETURNING id",
                                Long.class);
                assertNotNull(nextAppId);
                assertTrue(nextAppId >= 8L, "applications_id_seq must advance past 7");

                Long nextRoundId =
                        jdbc.queryForObject(
                                "INSERT INTO interview_rounds (application_id, round_no, name, interviewer_email) "
                                        + "VALUES (3, 3, 'Vòng 3: Phỏng vấn văn hóa', 'hr-lead@rikkeisoft.test') RETURNING id",
                                Long.class);
                assertNotNull(nextRoundId);
                assertTrue(nextRoundId >= 7L, "interview_rounds_id_seq must advance past 6");
            }
        }

        @Test
        @DisplayName("V19..V24 upgrade cleanly on top of V1..V17 baseline")
        void testUpgradesCleanlyOnTopOfOriginDevelopBaseline() {
            try (PostgreSQLContainer prodDb = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                prodDb.start();
                DataSource prodDataSource = createDataSource(prodDb);
                Flyway.configure()
                        .dataSource(prodDataSource)
                        .locations("classpath:db/migration")
                        .target("17")
                        .validateOnMigrate(true)
                        .load()
                        .migrate();

                int prodExecuted =
                        Flyway.configure()
                                .dataSource(prodDataSource)
                                .locations("classpath:db/migration")
                                .validateOnMigrate(true)
                                .load()
                                .migrate()
                                .migrationsExecuted;
                assertEquals(3, prodExecuted);

                JdbcTemplate prodJdbc = new JdbcTemplate(prodDataSource);
                assertEquals(
                        Integer.valueOf(12),
                        prodJdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
            }

            try (PostgreSQLContainer devDb = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                devDb.start();
                DataSource devDataSource = createDataSource(devDb);
                Flyway.configure()
                        .dataSource(devDataSource)
                        .locations("classpath:db/migration", "classpath:db/migration-dev")
                        .target("17")
                        .validateOnMigrate(true)
                        .load()
                        .migrate();

                int devExecuted =
                        Flyway.configure()
                                .dataSource(devDataSource)
                                .locations("classpath:db/migration", "classpath:db/migration-dev")
                                .validateOnMigrate(true)
                                .load()
                                .migrate()
                                .migrationsExecuted;
                assertEquals(5, devExecuted);

                JdbcTemplate devJdbc = new JdbcTemplate(devDataSource);
                assertEquals(
                        Integer.valueOf(21),
                        devJdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                assertEquals(
                        Integer.valueOf(7),
                        devJdbc.queryForObject("SELECT count(*) FROM applications", Integer.class));
                assertEquals(
                        Integer.valueOf(6),
                        devJdbc.queryForObject(
                                "SELECT count(*) FROM interview_rounds", Integer.class));
            }
        }

        @Test
        @DisplayName("V23 and V24 upgrade cleanly on top of current develop V1..V22 baseline")
        void testV23AndV24UpgradeCleanlyOnTopOfDevelopV22Baseline() {
            try (PostgreSQLContainer prodDb = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                prodDb.start();
                DataSource prodDataSource = createDataSource(prodDb);
                Flyway.configure()
                        .dataSource(prodDataSource)
                        .locations("classpath:db/migration")
                        .target("21")
                        .validateOnMigrate(true)
                        .load()
                        .migrate();

                JdbcTemplate prodJdbc = new JdbcTemplate(prodDataSource);
                assertEquals(
                        Integer.valueOf(11),
                        prodJdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                assertFalse(
                        Boolean.TRUE.equals(
                                prodJdbc.queryForObject(
                                        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interview_rounds')",
                                        Boolean.class)));

                int prodExecuted =
                        Flyway.configure()
                                .dataSource(prodDataSource)
                                .locations("classpath:db/migration")
                                .validateOnMigrate(true)
                                .load()
                                .migrate()
                                .migrationsExecuted;
                assertEquals(1, prodExecuted);
                assertEquals(
                        Integer.valueOf(12),
                        prodJdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                assertEquals(
                        Integer.valueOf(0),
                        prodJdbc.queryForObject(
                                "SELECT count(*) FROM interview_rounds", Integer.class));
            }

            try (PostgreSQLContainer devDb = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                devDb.start();
                DataSource devDataSource = createDataSource(devDb);
                Flyway.configure()
                        .dataSource(devDataSource)
                        .locations("classpath:db/migration", "classpath:db/migration-dev")
                        .target("22")
                        .validateOnMigrate(true)
                        .load()
                        .migrate();

                JdbcTemplate devJdbc = new JdbcTemplate(devDataSource);
                assertEquals(
                        Integer.valueOf(19),
                        devJdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                assertFalse(
                        Boolean.TRUE.equals(
                                devJdbc.queryForObject(
                                        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interview_rounds')",
                                        Boolean.class)));

                int devExecuted =
                        Flyway.configure()
                                .dataSource(devDataSource)
                                .locations("classpath:db/migration", "classpath:db/migration-dev")
                                .validateOnMigrate(true)
                                .load()
                                .migrate()
                                .migrationsExecuted;
                assertEquals(2, devExecuted);
                assertEquals(
                        Integer.valueOf(21),
                        devJdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                assertEquals(
                        Integer.valueOf(6),
                        devJdbc.queryForObject(
                                "SELECT count(*) FROM interview_rounds", Integer.class));
            }
        }

        @Test
        @DisplayName("Re-running V19..V24 SQL directly is idempotent and keeps sequences")
        void testDirectSqlRerunIdempotency() throws SQLException {
            try (PostgreSQLContainer db = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                db.start();
                DataSource dataSource = createDataSource(db);
                Flyway flyway =
                        Flyway.configure()
                                .dataSource(dataSource)
                                .locations("classpath:db/migration", "classpath:db/migration-dev")
                                .validateOnMigrate(true)
                                .load();
                flyway.migrate();

                JdbcTemplate jdbc = new JdbcTemplate(dataSource);
                Long beforeRerunId =
                        jdbc.queryForObject(
                                "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                        + "VALUES (7, 2, 1, '/api/v1/me/applications/8/cv-snapshot', 'SUBMITTED') RETURNING id",
                                Long.class);
                assertEquals(Long.valueOf(8L), beforeRerunId);

                Long beforeRerunRoundId =
                        jdbc.queryForObject(
                                "INSERT INTO interview_rounds (application_id, round_no, name, interviewer_email) "
                                        + "VALUES (3, 3, 'Vòng 3: Trước chạy lại', 'round3@rikkeisoft.test') RETURNING id",
                                Long.class);
                assertEquals(Long.valueOf(7L), beforeRerunRoundId);

                executeMigrationScriptDirectly(
                        dataSource, "db/migration/V19__create_recruitment_applications.sql");
                executeMigrationScriptDirectly(
                        dataSource, "db/migration/V21__create_application_cv_snapshots.sql");
                executeMigrationScriptDirectly(
                        dataSource, "db/migration-dev/V22__dev_recruitment_seed.sql");
                executeMigrationScriptDirectly(
                        dataSource, "db/migration/V23__create_interview_rounds.sql");
                executeMigrationScriptDirectly(
                        dataSource, "db/migration-dev/V24__dev_interview_rounds_seed.sql");

                flyway.validate();
                assertEquals(0, flyway.migrate().migrationsExecuted);
                assertEquals(
                        Integer.valueOf(8),
                        jdbc.queryForObject("SELECT count(*) FROM applications", Integer.class));
                assertEquals(
                        Integer.valueOf(7),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM interview_rounds", Integer.class));

                Long afterRerunId =
                        jdbc.queryForObject(
                                "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                        + "VALUES (9, 2, 1, '/api/v1/me/applications/9/cv-snapshot', 'SUBMITTED') RETURNING id",
                                Long.class);
                assertEquals(Long.valueOf(9L), afterRerunId);

                Long afterRerunRoundId =
                        jdbc.queryForObject(
                                "INSERT INTO interview_rounds (application_id, round_no, name, interviewer_email) "
                                        + "VALUES (3, 4, 'Vòng 4: Sau chạy lại', 'round4@rikkeisoft.test') RETURNING id",
                                Long.class);
                assertEquals(Long.valueOf(8L), afterRerunRoundId);
            }
        }
    }

    @Nested
    @SpringBootTest
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName(
            "Dev Profile: V19/V21/V22/V23/V24 Schema Boundaries, Constraints & Seed Verification")
    class SchemaConstraintsAndSeedTests {

        @Container
        static PostgreSQLContainer devDb = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", devDb::getJdbcUrl);
            registry.add("spring.datasource.username", devDb::getUsername);
            registry.add("spring.datasource.password", devDb::getPassword);
            registry.add("jwt.secret", () -> "recruitment-migration-test-secret-key-32-bytes!");
        }

        @Autowired private JdbcTemplate jdbcTemplate;

        @Test
        @DisplayName("Zero cross-module FKs, intra-module CASCADE FKs, column types, and indexes")
        void testModuleBoundariesColumnsAndIndexes() {
            List<Map<String, Object>> applicationFks =
                    jdbcTemplate.queryForList(
                            """
                            SELECT tc.constraint_name
                            FROM information_schema.table_constraints AS tc
                            WHERE tc.constraint_type = 'FOREIGN KEY'
                              AND tc.table_schema = 'public'
                              AND tc.table_name = 'applications'
                            """);
            assertTrue(
                    applicationFks.isEmpty(),
                    "applications must have zero physical cross-module foreign keys");

            List<Map<String, Object>> historyFks =
                    jdbcTemplate.queryForList(
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
                              AND tc.table_name = 'application_status_history'
                            """);
            assertEquals(1, historyFks.size());
            assertEquals("applications", historyFks.get(0).get("foreign_table_name"));
            assertEquals("CASCADE", historyFks.get(0).get("delete_rule"));

            List<Map<String, Object>> snapshotFks =
                    jdbcTemplate.queryForList(
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
                              AND tc.table_name = 'application_cv_snapshots'
                            """);
            assertEquals(1, snapshotFks.size());
            assertEquals("applications", snapshotFks.get(0).get("foreign_table_name"));
            assertEquals("CASCADE", snapshotFks.get(0).get("delete_rule"));

            String versionType =
                    jdbcTemplate.queryForObject(
                            "SELECT data_type FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'version'",
                            String.class);
            assertEquals("bigint", versionType);

            String createdAtType =
                    jdbcTemplate.queryForObject(
                            "SELECT data_type FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'created_at'",
                            String.class);
            assertEquals("timestamp with time zone", createdAtType);

            String shaType =
                    jdbcTemplate.queryForObject(
                            "SELECT data_type FROM information_schema.columns WHERE table_name = 'application_cv_snapshots' AND column_name = 'sha256'",
                            String.class);
            assertEquals("character", shaType);

            List<String> appIndexes =
                    jdbcTemplate.queryForList(
                            "SELECT indexname FROM pg_indexes WHERE tablename = 'applications'",
                            String.class);
            assertTrue(appIndexes.contains("uq_applications_active_job_user"));
            assertTrue(appIndexes.contains("idx_applications_user_id_created_at"));
            assertTrue(appIndexes.contains("idx_applications_user_id_status_created_at"));
            assertTrue(appIndexes.contains("idx_applications_job_id_created_at"));

            List<String> historyIndexes =
                    jdbcTemplate.queryForList(
                            "SELECT indexname FROM pg_indexes WHERE tablename = 'application_status_history'",
                            String.class);
            assertTrue(
                    historyIndexes.contains(
                            "idx_application_status_history_application_id_created_at"));
        }

        @Test
        @DisplayName(
                "Partial unique index blocks open duplicates and allows reapply after terminal")
        void testPartialUniqueIndexAllowsReapplyAfterTerminalAndBlocksOpenDuplicates() {
            Long id1 =
                    jdbcTemplate.queryForObject(
                            "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                    + "VALUES (9, 2, 1, '/api/v1/me/applications/test1/cv-snapshot', 'SUBMITTED') RETURNING id",
                            Long.class);
            try {
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                                + "VALUES (9, 2, 1, '/api/v1/me/applications/test2/cv-snapshot', 'OFFER')"));

                jdbcTemplate.update(
                        "UPDATE applications SET status = 'WITHDRAWN' WHERE id = ?", id1);

                Long id2 =
                        jdbcTemplate.queryForObject(
                                "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                        + "VALUES (9, 2, 1, '/api/v1/me/applications/test3/cv-snapshot', 'SUBMITTED') RETURNING id",
                                Long.class);
                assertNotNull(id2);

                jdbcTemplate.update(
                        "UPDATE applications SET status = 'REJECTED' WHERE id = ?", id2);
                Long id3 =
                        jdbcTemplate.queryForObject(
                                "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                        + "VALUES (9, 2, 1, '/api/v1/me/applications/test4/cv-snapshot', 'SUBMITTED') RETURNING id",
                                Long.class);
                assertNotNull(id3);

                jdbcTemplate.update("UPDATE applications SET status = 'HIRED' WHERE id = ?", id3);
                Long id4 =
                        jdbcTemplate.queryForObject(
                                "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                        + "VALUES (9, 2, 1, '/api/v1/me/applications/test5/cv-snapshot', 'SUBMITTED') RETURNING id",
                                Long.class);
                assertNotNull(id4);

                jdbcTemplate.update(
                        "DELETE FROM applications WHERE id IN (?, ?, ?)", id2, id3, id4);
            } finally {
                jdbcTemplate.update("DELETE FROM applications WHERE id = ?", id1);
            }
        }

        @Test
        @DisplayName("CHECK constraints enforce status, file_size, content_type, and sha256")
        void testCheckConstraintsEnforced() {
            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                            + "VALUES (10, 2, 1, '/api/v1/me/applications/bad/cv-snapshot', 'INVALID')"));

            Long appId =
                    jdbcTemplate.queryForObject(
                            "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                    + "VALUES (10, 2, 1, '/api/v1/me/applications/chk/cv-snapshot', 'SUBMITTED') RETURNING id",
                            Long.class);
            try {
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO application_status_history (application_id, from_status, to_status, actor_id) "
                                                + "VALUES (?, 'BAD', 'SUBMITTED', 2)",
                                        appId));
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO application_status_history (application_id, from_status, to_status, actor_id) "
                                                + "VALUES (?, NULL, 'BAD', 2)",
                                        appId));
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO application_cv_snapshots (application_id, original_filename, content_type, file_data, file_size, sha256) "
                                                + "VALUES (?, 'cv.pdf', 'application/pdf', '\\x255044462d', 0, ?)",
                                        appId,
                                        SAMPLE_PDF_SHA256));
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO application_cv_snapshots (application_id, original_filename, content_type, file_data, file_size, sha256) "
                                                + "VALUES (?, 'cv.pdf', 'application/pdf', '\\x255044462d', 5242881, ?)",
                                        appId,
                                        SAMPLE_PDF_SHA256));
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO application_cv_snapshots (application_id, original_filename, content_type, file_data, file_size, sha256) "
                                                + "VALUES (?, 'cv.txt', 'text/plain', '\\x255044462d', 5, ?)",
                                        appId,
                                        SAMPLE_PDF_SHA256));
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO application_cv_snapshots (application_id, original_filename, content_type, file_data, file_size, sha256) "
                                                + "VALUES (?, 'cv.pdf', 'application/pdf', '\\x255044462d', 5, 'not-a-sha256')",
                                        appId));
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO application_cv_snapshots (application_id, original_filename, content_type, file_data, file_size, sha256) "
                                                + "VALUES (?, 'cv.pdf', 'application/pdf', '\\x255044462d', 100, ?)",
                                        appId,
                                        SAMPLE_PDF_SHA256));
            } finally {
                jdbcTemplate.update("DELETE FROM applications WHERE id = ?", appId);
            }
        }

        @Test
        @DisplayName(
                "Dev seed covers all 7 statuses, company 2 jobs, 0 for candidate2, and expired JD")
        void testDevSeedCoversAllSevenStatusesCandidate2EmptyAndExpiredJob() {
            List<String> statuses =
                    jdbcTemplate.queryForList(
                            "SELECT status FROM applications WHERE user_id = 1", String.class);
            assertEquals(7, statuses.size());
            assertTrue(
                    statuses.containsAll(
                            List.of(
                                    "SUBMITTED",
                                    "SCREENING",
                                    "INTERVIEW",
                                    "OFFER",
                                    "HIRED",
                                    "REJECTED",
                                    "WITHDRAWN")));

            Integer company2AppCount =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM applications WHERE job_id IN (2, 8) AND user_id = 1",
                            Integer.class);
            assertEquals(Integer.valueOf(2), company2AppCount);

            Integer candidate2Count =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM applications WHERE user_id = 2", Integer.class);
            assertEquals(Integer.valueOf(0), candidate2Count);

            OffsetDateTime expiredJobDeadline =
                    jdbcTemplate.queryForObject(
                            "SELECT deadline FROM jobs WHERE id = 12", OffsetDateTime.class);
            assertNotNull(expiredJobDeadline);
            assertFalse(expiredJobDeadline.isAfter(OffsetDateTime.now()));
        }

        @Test
        @DisplayName(
                "V23 interview_rounds schema, constraints, staff indexes, and V24 dev seed verified")
        void testInterviewRoundsSchemaConstraintsIndexesAndSeed() {
            List<Map<String, Object>> roundFks =
                    jdbcTemplate.queryForList(
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
                              AND tc.table_name = 'interview_rounds'
                            """);
            assertEquals(1, roundFks.size());
            assertEquals("fk_interview_rounds_application", roundFks.get(0).get("constraint_name"));
            assertEquals("applications", roundFks.get(0).get("foreign_table_name"));
            assertEquals("CASCADE", roundFks.get(0).get("delete_rule"));

            assertEquals(
                    "numeric",
                    jdbcTemplate.queryForObject(
                            "SELECT data_type FROM information_schema.columns WHERE table_name = 'interview_rounds' AND column_name = 'score'",
                            String.class));
            assertEquals(
                    "NO",
                    jdbcTemplate.queryForObject(
                            "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'interview_rounds' AND column_name = 'interviewer_email'",
                            String.class));
            assertEquals(
                    "bigint",
                    jdbcTemplate.queryForObject(
                            "SELECT data_type FROM information_schema.columns WHERE table_name = 'interview_rounds' AND column_name = 'version'",
                            String.class));
            assertEquals(
                    "timestamp with time zone",
                    jdbcTemplate.queryForObject(
                            "SELECT data_type FROM information_schema.columns WHERE table_name = 'interview_rounds' AND column_name = 'created_at'",
                            String.class));

            List<String> roundIndexes =
                    jdbcTemplate.queryForList(
                            "SELECT indexname FROM pg_indexes WHERE tablename = 'interview_rounds'",
                            String.class);
            assertTrue(roundIndexes.contains("uq_interview_rounds_app_round"));
            assertTrue(roundIndexes.contains("idx_interview_rounds_application_id"));

            List<String> appIndexes =
                    jdbcTemplate.queryForList(
                            "SELECT indexname FROM pg_indexes WHERE tablename = 'applications'",
                            String.class);
            assertTrue(appIndexes.contains("idx_applications_created_at_id"));
            assertTrue(appIndexes.contains("idx_applications_status_created_at_id"));
            assertTrue(appIndexes.contains("idx_applications_job_id_status_created_at_id"));

            assertEquals(
                    Integer.valueOf(2),
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM interview_rounds WHERE application_id = 3",
                            Integer.class));
            assertEquals(
                    Integer.valueOf(2),
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM interview_rounds WHERE application_id = 4",
                            Integer.class));
            assertEquals(
                    Integer.valueOf(1),
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM interview_rounds WHERE application_id = 5",
                            Integer.class));
            assertEquals(
                    Integer.valueOf(1),
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM interview_rounds WHERE application_id = 6",
                            Integer.class));
            assertEquals(
                    Integer.valueOf(0),
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM interview_rounds WHERE application_id IN (1, 2, 7)",
                            Integer.class));

            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO interview_rounds (application_id, round_no, name, interviewer_email) "
                                            + "VALUES (3, 1, 'Trùng vòng', 'dup@rikkeisoft.test')"));
            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO interview_rounds (application_id, round_no, name, interviewer_email) "
                                            + "VALUES (3, 0, 'Vòng 0 không hợp lệ', 'bad@rikkeisoft.test')"));
            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO interview_rounds (application_id, round_no, name, interviewer_email, result) "
                                            + "VALUES (3, 99, 'Kết quả sai', 'bad@rikkeisoft.test', 'MAYBE')"));
            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO interview_rounds (application_id, round_no, name, interviewer_email, score) "
                                            + "VALUES (3, 98, 'Điểm âm', 'bad@rikkeisoft.test', -0.01)"));
            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO interview_rounds (application_id, round_no, name, interviewer_email, score) "
                                            + "VALUES (3, 97, 'Điểm quá 100', 'bad@rikkeisoft.test', 100.01)"));
            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO interview_rounds (application_id, round_no, name, interviewer_email) "
                                            + "VALUES (3, 96, 'Thiếu email', NULL)"));
        }
    }
}
