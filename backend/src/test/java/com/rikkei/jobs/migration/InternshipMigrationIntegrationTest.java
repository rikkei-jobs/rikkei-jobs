package com.rikkei.jobs.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
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

@DisplayName("V15 Internship & Internship Tasks Migration, Constraints & Upgrade Integration Tests")
public class InternshipMigrationIntegrationTest {

    private static final String POSTGRES_IMAGE = "postgres:18.6-alpine";

    @Nested
    @DisplayName("Clean Empty DB, Baseline -> V15 Upgrade & Direct SQL Idempotency")
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
        @DisplayName(
                "Prod migrations (V1, V3, V5, V7, V9, V11, V13, V15, V17, V19, V21) apply cleanly from empty DB")
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
                Integer appliedCount =
                        jdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class);
                assertEquals(Integer.valueOf(11), appliedCount);

                Boolean hasV14 =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '14')",
                                Boolean.class);
                assertFalse(Boolean.TRUE.equals(hasV14));

                Boolean hasV15 =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '15' AND success = true)",
                                Boolean.class);
                assertTrue(Boolean.TRUE.equals(hasV15));

                assertEquals(
                        Integer.valueOf(0),
                        jdbc.queryForObject("SELECT count(*) FROM internships", Integer.class));
                assertEquals(
                        Integer.valueOf(0),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM internship_tasks", Integer.class));
            }
        }

        @Test
        @DisplayName(
                "Dev migrations V1..V15, V17, V19, V21, V22 apply cleanly from empty DB with 0 internship rows")
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
                Integer appliedCount =
                        jdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class);
                assertEquals(Integer.valueOf(19), appliedCount);

                Boolean hasV15 =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '15' AND success = true)",
                                Boolean.class);
                assertTrue(Boolean.TRUE.equals(hasV15));

                assertEquals(
                        Integer.valueOf(9),
                        jdbc.queryForObject("SELECT count(*) FROM users", Integer.class));
                assertEquals(
                        Integer.valueOf(0),
                        jdbc.queryForObject("SELECT count(*) FROM internships", Integer.class));
                assertEquals(
                        Integer.valueOf(0),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM internship_tasks", Integer.class));
            }
        }

        @Test
        @DisplayName("V15 upgrades cleanly on top of V1..V13 prod and V1..V14 dev baselines")
        void testV15UpgradesCleanlyOnTopOfBaselines() {
            try (PostgreSQLContainer prodDb = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                prodDb.start();
                DataSource prodDataSource = createDataSource(prodDb);
                Flyway.configure()
                        .dataSource(prodDataSource)
                        .locations("classpath:db/migration")
                        .target("13")
                        .validateOnMigrate(true)
                        .load()
                        .migrate();

                JdbcTemplate prodJdbc = new JdbcTemplate(prodDataSource);
                assertEquals(
                        Integer.valueOf(7),
                        prodJdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                Boolean internshipsBeforeProd =
                        prodJdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internships')",
                                Boolean.class);
                assertFalse(Boolean.TRUE.equals(internshipsBeforeProd));

                int prodExecuted =
                        Flyway.configure()
                                .dataSource(prodDataSource)
                                .locations("classpath:db/migration")
                                .target("15")
                                .validateOnMigrate(true)
                                .load()
                                .migrate()
                                .migrationsExecuted;
                assertEquals(1, prodExecuted);
                assertEquals(
                        Integer.valueOf(8),
                        prodJdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                Boolean tasksAfterProd =
                        prodJdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internship_tasks')",
                                Boolean.class);
                assertTrue(Boolean.TRUE.equals(tasksAfterProd));
            }

            try (PostgreSQLContainer devDb = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                devDb.start();
                DataSource devDataSource = createDataSource(devDb);
                Flyway.configure()
                        .dataSource(devDataSource)
                        .locations("classpath:db/migration", "classpath:db/migration-dev")
                        .target("14")
                        .validateOnMigrate(true)
                        .load()
                        .migrate();

                JdbcTemplate devJdbc = new JdbcTemplate(devDataSource);
                assertEquals(
                        Integer.valueOf(14),
                        devJdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                Boolean internshipsBeforeDev =
                        devJdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internships')",
                                Boolean.class);
                assertFalse(Boolean.TRUE.equals(internshipsBeforeDev));

                int devExecuted =
                        Flyway.configure()
                                .dataSource(devDataSource)
                                .locations("classpath:db/migration", "classpath:db/migration-dev")
                                .target("15")
                                .validateOnMigrate(true)
                                .load()
                                .migrate()
                                .migrationsExecuted;
                assertEquals(1, devExecuted);
                assertEquals(
                        Integer.valueOf(15),
                        devJdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                assertEquals(
                        Integer.valueOf(9),
                        devJdbc.queryForObject("SELECT count(*) FROM users", Integer.class));
                Boolean tasksAfterDev =
                        devJdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internship_tasks')",
                                Boolean.class);
                assertTrue(Boolean.TRUE.equals(tasksAfterDev));
            }
        }

        @Test
        @DisplayName("Re-running V15 SQL directly via JDBC on migrated DB is 100% idempotent")
        void testV15DirectSqlRerunIdempotency() throws SQLException {
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
                Long internshipId =
                        jdbc.queryForObject(
                                "INSERT INTO internships (user_id, batch_id, batch_name) VALUES (1, 'IOC-RERUN-01', 'Batch Rerun') RETURNING id",
                                Long.class);
                assertNotNull(internshipId);
                jdbc.update(
                        "INSERT INTO internship_tasks (internship_id, title, accepted_score) VALUES (?, 'Task Rerun', 8.50)",
                        internshipId);

                executeMigrationScriptDirectly(
                        dataSource,
                        "db/migration/V15__create_internships_and_internship_tasks.sql");

                flyway.validate();
                assertEquals(0, flyway.migrate().migrationsExecuted);
                assertEquals(
                        Integer.valueOf(1),
                        jdbc.queryForObject("SELECT count(*) FROM internships", Integer.class));
                assertEquals(
                        Integer.valueOf(1),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM internship_tasks", Integer.class));
            }
        }
    }

    @Nested
    @SpringBootTest
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("Dev Profile: V15 Schema Types, Module Boundaries, Constraints & Indexes")
    class SchemaConstraintsAndIndexesTests {

        @Container static PostgreSQLContainer devDb = new PostgreSQLContainer(POSTGRES_IMAGE);

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", devDb::getJdbcUrl);
            registry.add("spring.datasource.username", devDb::getUsername);
            registry.add("spring.datasource.password", devDb::getPassword);
            registry.add("jwt.secret", () -> "internship-migration-test-secret-key-32-bytes!");
        }

        @Autowired private JdbcTemplate jdbcTemplate;

        private Map<String, Object> findColumn(String tableName, String columnName) {
            return jdbcTemplate.queryForMap(
                    """
                    SELECT data_type, is_nullable, character_maximum_length,
                           numeric_precision, numeric_scale, column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = ?
                      AND column_name = ?
                    """,
                    tableName,
                    columnName);
        }

        @Test
        @DisplayName("internships and internship_tasks exist with exact column types and defaults")
        void testTablesAndExactColumnTypes() {
            for (String table : List.of("internships", "internship_tasks")) {
                Boolean exists =
                        jdbcTemplate.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?)",
                                Boolean.class,
                                table);
                assertTrue(Boolean.TRUE.equals(exists), "Table " + table + " must exist");
            }

            Map<String, Object> internshipsId = findColumn("internships", "id");
            assertEquals("bigint", internshipsId.get("data_type"));
            assertEquals("NO", internshipsId.get("is_nullable"));

            Map<String, Object> userId = findColumn("internships", "user_id");
            assertEquals("bigint", userId.get("data_type"));
            assertEquals("NO", userId.get("is_nullable"));

            Map<String, Object> batchId = findColumn("internships", "batch_id");
            assertEquals("character varying", batchId.get("data_type"));
            assertEquals(255, ((Number) batchId.get("character_maximum_length")).intValue());
            assertEquals("NO", batchId.get("is_nullable"));

            for (String nullableVarchar :
                    List.of("batch_name", "group_name", "topic_name", "mentor_email")) {
                Map<String, Object> col = findColumn("internships", nullableVarchar);
                assertEquals("character varying", col.get("data_type"));
                assertEquals(255, ((Number) col.get("character_maximum_length")).intValue());
                assertEquals("YES", col.get("is_nullable"));
            }

            for (String dateCol : List.of("start_date", "end_date")) {
                Map<String, Object> col = findColumn("internships", dateCol);
                assertEquals("date", col.get("data_type"));
                assertEquals("YES", col.get("is_nullable"));
            }

            Map<String, Object> finalScore = findColumn("internships", "final_score");
            assertEquals("numeric", finalScore.get("data_type"));
            assertEquals(5, ((Number) finalScore.get("numeric_precision")).intValue());
            assertEquals(2, ((Number) finalScore.get("numeric_scale")).intValue());
            assertEquals("YES", finalScore.get("is_nullable"));

            Map<String, Object> syncedAt = findColumn("internships", "synced_at");
            assertEquals("timestamp with time zone", syncedAt.get("data_type"));
            assertEquals("NO", syncedAt.get("is_nullable"));
            String syncedAtDefault = (String) syncedAt.get("column_default");
            assertNotNull(syncedAtDefault);
            assertTrue(
                    syncedAtDefault.toLowerCase().contains("now()"),
                    "synced_at default must use NOW()");

            Map<String, Object> taskId = findColumn("internship_tasks", "id");
            assertEquals("bigint", taskId.get("data_type"));
            assertEquals("NO", taskId.get("is_nullable"));

            Map<String, Object> internshipId = findColumn("internship_tasks", "internship_id");
            assertEquals("bigint", internshipId.get("data_type"));
            assertEquals("NO", internshipId.get("is_nullable"));

            Map<String, Object> title = findColumn("internship_tasks", "title");
            assertEquals("character varying", title.get("data_type"));
            assertEquals(255, ((Number) title.get("character_maximum_length")).intValue());
            assertEquals("NO", title.get("is_nullable"));

            Map<String, Object> acceptedScore = findColumn("internship_tasks", "accepted_score");
            assertEquals("numeric", acceptedScore.get("data_type"));
            assertEquals(5, ((Number) acceptedScore.get("numeric_precision")).intValue());
            assertEquals(2, ((Number) acceptedScore.get("numeric_scale")).intValue());
            assertEquals("YES", acceptedScore.get("is_nullable"));

            Map<String, Object> acceptedAt = findColumn("internship_tasks", "accepted_at");
            assertEquals("timestamp with time zone", acceptedAt.get("data_type"));
            assertEquals("YES", acceptedAt.get("is_nullable"));
        }

        @Test
        @DisplayName(
                "No physical FK from internships to users; intra-module FK cascades delete from internships")
        void testModuleBoundariesAndForeignKeyConstraints() {
            List<Map<String, Object>> internshipFks =
                    jdbcTemplate.queryForList(
                            """
                            SELECT tc.constraint_name, ccu.table_name AS foreign_table_name
                            FROM information_schema.table_constraints AS tc
                            JOIN information_schema.constraint_column_usage AS ccu
                                ON ccu.constraint_name = tc.constraint_name
                                AND ccu.table_schema = tc.table_schema
                            WHERE tc.constraint_type = 'FOREIGN KEY'
                                AND tc.table_schema = 'public'
                                AND tc.table_name = 'internships'
                            """);
            assertTrue(
                    internshipFks.isEmpty(),
                    "internships must have zero physical foreign keys (user_id is scalar BIGINT)");

            List<Map<String, Object>> taskFks =
                    jdbcTemplate.queryForList(
                            """
                            SELECT tc.constraint_name,
                                   ccu.table_name AS foreign_table_name,
                                   rc.delete_rule
                            FROM information_schema.table_constraints AS tc
                            JOIN information_schema.constraint_column_usage AS ccu
                                ON ccu.constraint_name = tc.constraint_name
                                AND ccu.table_schema = tc.table_schema
                            JOIN information_schema.referential_constraints AS rc
                                ON rc.constraint_name = tc.constraint_name
                                AND rc.constraint_schema = tc.table_schema
                            WHERE tc.constraint_type = 'FOREIGN KEY'
                                AND tc.table_schema = 'public'
                                AND tc.table_name = 'internship_tasks'
                            """);
            assertEquals(1, taskFks.size());
            assertEquals("fk_internship_tasks_internship", taskFks.get(0).get("constraint_name"));
            assertEquals("internships", taskFks.get(0).get("foreign_table_name"));
            assertEquals("CASCADE", taskFks.get(0).get("delete_rule"));
        }

        @Test
        @DisplayName("Required unique constraints and performance indexes exist")
        void testUniqueConstraintsAndIndexesExist() {
            List<String> internshipIndexes =
                    jdbcTemplate.queryForList(
                            "SELECT indexname FROM pg_indexes WHERE tablename = 'internships'",
                            String.class);
            assertTrue(internshipIndexes.contains("uq_internships_user_batch"));
            assertTrue(internshipIndexes.contains("idx_internships_user_id"));

            List<String> taskIndexes =
                    jdbcTemplate.queryForList(
                            "SELECT indexname FROM pg_indexes WHERE tablename = 'internship_tasks'",
                            String.class);
            assertTrue(taskIndexes.contains("idx_internship_tasks_internship_id"));
            assertTrue(taskIndexes.contains("uq_internship_tasks_internship_title"));

            List<String> internshipUniqueConstraints =
                    jdbcTemplate.queryForList(
                            """
                            SELECT constraint_name
                            FROM information_schema.table_constraints
                            WHERE table_schema = 'public'
                              AND constraint_type = 'UNIQUE'
                              AND table_name = 'internships'
                            """,
                            String.class);
            assertTrue(internshipUniqueConstraints.contains("uq_internships_user_batch"));

            List<String> taskUniqueConstraints =
                    jdbcTemplate.queryForList(
                            """
                            SELECT constraint_name
                            FROM information_schema.table_constraints
                            WHERE table_schema = 'public'
                              AND constraint_type = 'UNIQUE'
                              AND table_name = 'internship_tasks'
                            """,
                            String.class);
            assertTrue(taskUniqueConstraints.contains("uq_internship_tasks_internship_title"));
        }

        @Test
        @DisplayName(
                "Enforces default synced_at TIMESTAMPTZ, unique constraints and ON DELETE CASCADE")
        void testUniqueConstraintsDefaultTimestampAndCascadeDeleteBehavior() {
            Map<String, Object> inserted =
                    jdbcTemplate.queryForMap(
                            """
                            INSERT INTO internships (user_id, batch_id, batch_name, final_score)
                            VALUES (1, 'IOC-MIG-TEST-01', 'Migration Test Batch', 8.75)
                            RETURNING id, synced_at
                            """);
            Long internshipId = ((Number) inserted.get("id")).longValue();
            try {
                assertNotNull(inserted.get("synced_at"));
                OffsetDateTime persistedSyncedAt =
                        jdbcTemplate.queryForObject(
                                "SELECT synced_at FROM internships WHERE id = ?",
                                OffsetDateTime.class,
                                internshipId);
                assertNotNull(persistedSyncedAt);

                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO internships (user_id, batch_id) VALUES (1, 'IOC-MIG-TEST-01')"));

                jdbcTemplate.update(
                        "INSERT INTO internship_tasks (internship_id, title, accepted_score) VALUES (?, 'Task One', ?)",
                        internshipId,
                        new BigDecimal("9.00"));

                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO internship_tasks (internship_id, title) VALUES (?, 'Task One')",
                                        internshipId));

                jdbcTemplate.update("DELETE FROM internships WHERE id = ?", internshipId);
                Integer remainingTasks =
                        jdbcTemplate.queryForObject(
                                "SELECT count(*) FROM internship_tasks WHERE internship_id = ?",
                                Integer.class,
                                internshipId);
                assertEquals(Integer.valueOf(0), remainingTasks);
            } finally {
                jdbcTemplate.update("DELETE FROM internships WHERE id = ?", internshipId);
            }
        }
    }
}
