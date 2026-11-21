package com.rikkei.jobs.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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

@DisplayName("V9 & V10 Company Profile Migration, Seed & Constraint Integration Tests")
public class CompanyMigrationIntegrationTest {

    private static final String POSTGRES_IMAGE = "postgres:18.6-alpine";

    @Nested
    @DisplayName("Clean Empty DB, Incremental V1..V8 -> V9..V15 Upgrade & Direct SQL Idempotency")
    class LifecycleAndIdempotencyTests {

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
                "Prod migrations (V1, V3, V5, V7, V9, V11, V13, V15) apply cleanly from empty DB with 0 companies and 0 users")
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
                assertEquals(Integer.valueOf(8), appliedCount);

                Boolean hasV9 =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '9' AND success = true)",
                                Boolean.class);
                assertTrue(Boolean.TRUE.equals(hasV9));

                Boolean hasV10 =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '10')",
                                Boolean.class);
                assertFalse(Boolean.TRUE.equals(hasV10));

                Boolean hasV11 =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '11' AND success = true)",
                                Boolean.class);
                assertTrue(Boolean.TRUE.equals(hasV11));

                Boolean hasV12 =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '12')",
                                Boolean.class);
                assertFalse(Boolean.TRUE.equals(hasV12));

                Boolean hasV13 =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '13' AND success = true)",
                                Boolean.class);
                assertTrue(Boolean.TRUE.equals(hasV13));

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
                        jdbc.queryForObject("SELECT count(*) FROM companies", Integer.class));
                Boolean hasCompanyLogosTable =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_logos')",
                                Boolean.class);
                assertFalse(
                        Boolean.TRUE.equals(hasCompanyLogosTable),
                        "company_logos table must be removed from V9");
                Boolean hasLogoPublicId =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'logo_public_id' AND data_type = 'character varying' AND character_maximum_length = 255)",
                                Boolean.class);
                assertTrue(
                        Boolean.TRUE.equals(hasLogoPublicId),
                        "companies.logo_public_id VARCHAR(255) must exist");
                assertEquals(
                        Integer.valueOf(0),
                        jdbc.queryForObject("SELECT count(*) FROM users", Integer.class));
            }
        }

        @Test
        @DisplayName(
                "Dev migrations V1..V15 (including V9 and V10) apply cleanly from empty DB with 2 seeded companies, sequence >= 3 and 9 users")
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
                assertEquals(Integer.valueOf(15), appliedCount);
                assertEquals(
                        Integer.valueOf(2),
                        jdbc.queryForObject("SELECT count(*) FROM companies", Integer.class));
                assertEquals(
                        Integer.valueOf(9),
                        jdbc.queryForObject("SELECT count(*) FROM users", Integer.class));

                Long nextId =
                        jdbc.queryForObject(
                                "INSERT INTO companies (name, tax_code, status, created_by) VALUES ('Công ty Kiểm thử Chuỗi', '0999888771', 'ACTIVE', 7) RETURNING id",
                                Long.class);
                assertNotNull(nextId);
                assertTrue(nextId >= 3L, "companies_id_seq must advance past seeded ID 2");
            }
        }

        @Test
        @DisplayName("V9 through V15 upgrade cleanly on top of existing baseline V1..V8")
        void testUpgradeOnTopOfDevelopBaselineV1ThroughV8() {
            try (PostgreSQLContainer db = new PostgreSQLContainer(POSTGRES_IMAGE)) {
                db.start();
                DataSource dataSource = createDataSource(db);

                Flyway baselineFlyway =
                        Flyway.configure()
                                .dataSource(dataSource)
                                .locations("classpath:db/migration", "classpath:db/migration-dev")
                                .target("8")
                                .validateOnMigrate(true)
                                .load();
                baselineFlyway.migrate();

                JdbcTemplate jdbc = new JdbcTemplate(dataSource);
                assertEquals(
                        Integer.valueOf(8),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                Boolean companiesExistsAtV8 =
                        jdbc.queryForObject(
                                "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')",
                                Boolean.class);
                assertFalse(
                        Boolean.TRUE.equals(companiesExistsAtV8),
                        "companies table must not exist at V8 baseline");
                assertEquals(
                        Integer.valueOf(9),
                        jdbc.queryForObject("SELECT count(*) FROM users", Integer.class));

                Flyway latestFlyway =
                        Flyway.configure()
                                .dataSource(dataSource)
                                .locations("classpath:db/migration", "classpath:db/migration-dev")
                                .validateOnMigrate(true)
                                .load();
                latestFlyway.migrate();

                assertEquals(
                        Integer.valueOf(15),
                        jdbc.queryForObject(
                                "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                                Integer.class));
                assertEquals(
                        Integer.valueOf(2),
                        jdbc.queryForObject("SELECT count(*) FROM companies", Integer.class));
                assertEquals(
                        Integer.valueOf(9),
                        jdbc.queryForObject("SELECT count(*) FROM users", Integer.class));
            }
        }

        @Test
        @DisplayName(
                "Re-running V9 and V10 SQL directly via JDBC on already-migrated DB is 100% idempotent")
        void testDirectSqlRerunIdempotencyPreservesDataAndSequence() throws SQLException {
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
                String originalCompany1Name =
                        jdbc.queryForObject(
                                "SELECT name FROM companies WHERE id = 1", String.class);
                Long insertedId =
                        jdbc.queryForObject(
                                "INSERT INTO companies (name, tax_code, status, created_by) VALUES ('Công ty Trước Chạy Lại', '0999888772', 'ACTIVE', 7) RETURNING id",
                                Long.class);
                assertEquals(Long.valueOf(3L), insertedId);

                executeMigrationScriptDirectly(dataSource, "db/migration/V9__company_profile.sql");
                executeMigrationScriptDirectly(
                        dataSource, "db/migration-dev/V10__dev_company_seed.sql");

                flyway.validate();
                assertEquals(0, flyway.migrate().migrationsExecuted);

                assertEquals(
                        Integer.valueOf(3),
                        jdbc.queryForObject("SELECT count(*) FROM companies", Integer.class));
                assertEquals(
                        originalCompany1Name,
                        jdbc.queryForObject(
                                "SELECT name FROM companies WHERE id = 1", String.class));
                assertEquals(
                        Integer.valueOf(9),
                        jdbc.queryForObject("SELECT count(*) FROM users", Integer.class));

                Long nextIdAfterRerun =
                        jdbc.queryForObject(
                                "INSERT INTO companies (name, tax_code, status, created_by) VALUES ('Công ty Sau Chạy Lại', '0999888773', 'ACTIVE', 7) RETURNING id",
                                Long.class);
                assertEquals(
                        Long.valueOf(4L),
                        nextIdAfterRerun,
                        "companies_id_seq must not regress after re-running V10");
            }
        }
    }

    @Nested
    @SpringBootTest(
            properties = {
                "CORS_ALLOWED_ORIGINS=http://localhost:3000",
                "EXTERNAL_BASE_URL=https://mock.example.com",
                "EXTERNAL_SERVICE_KEY=prod-secret-service-key-999",
                "JWT_SECRET=super-secure-production-jwt-secret-key-32-bytes-minimum!",
                "CLOUDINARY_CLOUD_NAME=prod-rikkei-cloud",
                "CLOUDINARY_API_KEY=prod-cloudinary-key-123",
                "CLOUDINARY_API_SECRET=prod-cloudinary-secret-xyz-987",
                "CLOUDINARY_API_BASE_URL=https://api.cloudinary.com/v1_1",
                "CLOUDINARY_DELIVERY_BASE_URL=https://res.cloudinary.com/prod-rikkei-cloud/image/upload"
            })
    @Testcontainers
    @ActiveProfiles("prod")
    @DisplayName("Prod Profile: V9 Schema Exists and V10 Dev Seed Absent")
    class ProdProfileSchemaTests {

        @Container static PostgreSQLContainer prodDb = new PostgreSQLContainer(POSTGRES_IMAGE);

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("SPRING_DATASOURCE_URL", prodDb::getJdbcUrl);
            registry.add("SPRING_DATASOURCE_USERNAME", prodDb::getUsername);
            registry.add("SPRING_DATASOURCE_PASSWORD", prodDb::getPassword);
            registry.add("spring.datasource.url", prodDb::getJdbcUrl);
            registry.add("spring.datasource.username", prodDb::getUsername);
            registry.add("spring.datasource.password", prodDb::getPassword);
        }

        @Autowired private JdbcTemplate jdbcTemplate;

        @Test
        @DisplayName(
                "Prod profile has empty companies table, no company_logos table, and V10 not applied")
        void testProdProfileHasEmptyCompanyTablesAndNoV10() {
            assertEquals(
                    Integer.valueOf(0),
                    jdbcTemplate.queryForObject("SELECT count(*) FROM companies", Integer.class));
            Boolean hasCompanyLogosTable =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_logos')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasCompanyLogosTable),
                    "company_logos table must not exist in prod schema");
            assertEquals(
                    Integer.valueOf(0),
                    jdbcTemplate.queryForObject("SELECT count(*) FROM users", Integer.class));
            assertFalse(
                    Boolean.TRUE.equals(
                            jdbcTemplate.queryForObject(
                                    "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '10')",
                                    Boolean.class)));
        }
    }

    @Nested
    @SpringBootTest
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("Dev Profile: V9 Schema Integrity, Constraints & V10 Seed Verification")
    class DevProfileSchemaAndConstraintsTests {

        @Container static PostgreSQLContainer devDb = new PostgreSQLContainer(POSTGRES_IMAGE);

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", devDb::getJdbcUrl);
            registry.add("spring.datasource.username", devDb::getUsername);
            registry.add("spring.datasource.password", devDb::getPassword);
            registry.add("jwt.secret", () -> "company-migration-test-secret-key-32-bytes!");
        }

        @Autowired private JdbcTemplate jdbcTemplate;

        private Long insertValidTestCompany(String taxCode) {
            Long id =
                    jdbcTemplate.queryForObject(
                            "INSERT INTO companies (name, tax_code, created_by) VALUES ('Công ty Hợp Lệ', ?, 7) RETURNING id",
                            Long.class,
                            taxCode);
            assertNotNull(id);
            return id;
        }

        private void deleteCompanyQuietly(Long id) {
            if (id != null) {
                jdbcTemplate.update("DELETE FROM companies WHERE id = ?", id);
            }
        }

        @Test
        @DisplayName(
                "companies has no cross-module FK to users, scalar created_by, logo_public_id, and required indexes without company_logos")
        void testModuleBoundariesAndIndexes() {
            List<Map<String, Object>> companyFks =
                    jdbcTemplate.queryForList(
                            """
                            SELECT tc.constraint_name, ccu.table_name AS foreign_table_name
                            FROM information_schema.table_constraints AS tc
                            JOIN information_schema.constraint_column_usage AS ccu
                                ON ccu.constraint_name = tc.constraint_name
                                AND ccu.table_schema = tc.table_schema
                            WHERE tc.constraint_type = 'FOREIGN KEY'
                                AND tc.table_name = 'companies'
                            """);
            assertTrue(
                    companyFks.isEmpty(),
                    "companies must have zero physical foreign keys (created_by is scalar BIGINT)");

            String createdByType =
                    jdbcTemplate.queryForObject(
                            "SELECT data_type FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'created_by'",
                            String.class);
            assertEquals("bigint", createdByType, "companies.created_by must be bigint");

            Boolean hasLogoPublicId =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'logo_public_id' AND data_type = 'character varying' AND character_maximum_length = 255)",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasLogoPublicId),
                    "companies.logo_public_id VARCHAR(255) must exist");

            Boolean hasUsersCompanyId =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasUsersCompanyId),
                    "users.company_id column from V5 must remain intact");

            Boolean hasCompanyLogosTable =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_logos')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasCompanyLogosTable),
                    "company_logos table must not exist");

            List<String> indexes =
                    jdbcTemplate.queryForList(
                            "SELECT indexname FROM pg_indexes WHERE tablename = 'companies'",
                            String.class);
            assertTrue(indexes.contains("uq_companies_tax_code"));
            assertTrue(indexes.contains("idx_companies_status"));
            assertTrue(indexes.contains("idx_companies_created_by"));
        }

        @Test
        @DisplayName(
                "V10 seeds companies 1 and 2 matching hr1, hr2 and created_by = staff1 while keeping 9 users")
        void testDevSeedCompaniesAndSequence() {
            assertEquals(
                    Integer.valueOf(9),
                    jdbcTemplate.queryForObject("SELECT count(*) FROM users", Integer.class));

            Map<String, Object> c1 =
                    jdbcTemplate.queryForMap(
                            "SELECT id, name, tax_code, status, created_by FROM companies WHERE id = 1");
            Map<String, Object> c2 =
                    jdbcTemplate.queryForMap(
                            "SELECT id, name, tax_code, status, created_by FROM companies WHERE id = 2");

            assertNotNull(c1.get("name"));
            assertNotNull(c2.get("name"));
            assertEquals("ACTIVE", c1.get("status"));
            assertEquals("ACTIVE", c2.get("status"));
            assertEquals(7L, ((Number) c1.get("created_by")).longValue());
            assertEquals(7L, ((Number) c2.get("created_by")).longValue());

            String tax1 = (String) c1.get("tax_code");
            String tax2 = (String) c2.get("tax_code");
            assertNotNull(tax1);
            assertNotNull(tax2);
            assertTrue(
                    (tax1.length() == 10 && tax2.length() == 13)
                            || (tax1.length() == 13 && tax2.length() == 10),
                    "V10 must seed one 10-digit tax_code and one 13-digit tax_code");
            assertTrue(tax1.matches("^(?:\\d{10}|\\d{13})$"));
            assertTrue(tax2.matches("^(?:\\d{10}|\\d{13})$"));

            assertEquals(
                    Long.valueOf(1L),
                    jdbcTemplate.queryForObject(
                            "SELECT company_id FROM users WHERE email = 'hr1@rikkeijobs.test'",
                            Long.class));
            assertEquals(
                    Long.valueOf(2L),
                    jdbcTemplate.queryForObject(
                            "SELECT company_id FROM users WHERE email = 'hr2@rikkeijobs.test'",
                            Long.class));
            assertEquals(
                    Long.valueOf(7L),
                    jdbcTemplate.queryForObject(
                            "SELECT id FROM users WHERE email = 'staff1@rikkeijobs.test'",
                            Long.class));

            Long nextId = insertValidTestCompany("0999888774");
            try {
                assertTrue(nextId > 2L, "companies_id_seq must advance past 2");
            } finally {
                deleteCompanyQuietly(nextId);
            }
        }

        @ParameterizedTest(name = "Invalid tax_code rejected: [{0}]")
        @ValueSource(
                strings = {
                    "",
                    "123456789",
                    "12345678901",
                    "123456789012",
                    "12345678901234",
                    "123456789x",
                    "12345-6789",
                    "          "
                })
        void testInvalidTaxCodesRejected(String invalidTaxCode) {
            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO companies (name, tax_code, created_by) VALUES ('Test', ?, 7)",
                                    invalidTaxCode));
        }

        @Test
        @DisplayName("Valid 10-digit and 13-digit tax_codes accepted, duplicate and NULL rejected")
        void testValidDuplicateAndNullTaxCode() {
            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO companies (name, tax_code, created_by) VALUES ('Test', NULL, 7)"));

            Long id10 = insertValidTestCompany("0888777661");
            Long id13 = insertValidTestCompany("0888777661001");
            try {
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "INSERT INTO companies (name, tax_code, created_by) VALUES ('Duplicate', '0888777661', 7)"));
            } finally {
                deleteCompanyQuietly(id13);
                deleteCompanyQuietly(id10);
            }
        }

        @Test
        @DisplayName("name NOT NULL, size CHECK, status CHECK and default ACTIVE are enforced")
        void testCompanyNameSizeAndStatusConstraints() {
            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO companies (name, tax_code, created_by) VALUES (NULL, '0888777662', 7)"));

            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO companies (name, tax_code, size, created_by) VALUES ('Test', '0888777663', '5-10', 7)"));

            assertThrows(
                    DataIntegrityViolationException.class,
                    () ->
                            jdbcTemplate.update(
                                    "INSERT INTO companies (name, tax_code, status, created_by) VALUES ('Test', '0888777664', 'PENDING', 7)"));

            Long id =
                    jdbcTemplate.queryForObject(
                            "INSERT INTO companies (name, tax_code, size, created_by) VALUES ('Test Default', '0888777665', '51-200', 7) RETURNING id",
                            Long.class);
            assertNotNull(id);
            try {
                assertEquals(
                        "ACTIVE",
                        jdbcTemplate.queryForObject(
                                "SELECT status FROM companies WHERE id = ?", String.class, id));
                for (String validSize : List.of("1-50", "51-200", "201-1000", "1000+")) {
                    jdbcTemplate.update(
                            "UPDATE companies SET size = ? WHERE id = ?", validSize, id);
                }
                jdbcTemplate.update("UPDATE companies SET size = NULL WHERE id = ?", id);
                jdbcTemplate.update("UPDATE companies SET status = 'LOCKED' WHERE id = ?", id);
                assertEquals(
                        "LOCKED",
                        jdbcTemplate.queryForObject(
                                "SELECT status FROM companies WHERE id = ?", String.class, id));
            } finally {
                deleteCompanyQuietly(id);
            }
        }

        @Test
        @DisplayName("companies.logo_public_id allows NULL and enforces VARCHAR(255) length")
        void testCompaniesLogoPublicIdAllowsNullAndVarchar255() {
            Long companyId = insertValidTestCompany("0888777666");
            try {
                String initialPublicId =
                        jdbcTemplate.queryForObject(
                                "SELECT logo_public_id FROM companies WHERE id = ?",
                                String.class,
                                companyId);
                assertEquals(null, initialPublicId);

                String validPublicId = "rikkei-jobs/company-logos/company-" + companyId;
                jdbcTemplate.update(
                        "UPDATE companies SET logo_public_id = ? WHERE id = ?",
                        validPublicId,
                        companyId);
                assertEquals(
                        validPublicId,
                        jdbcTemplate.queryForObject(
                                "SELECT logo_public_id FROM companies WHERE id = ?",
                                String.class,
                                companyId));

                String over255 = "a".repeat(256);
                assertThrows(
                        DataIntegrityViolationException.class,
                        () ->
                                jdbcTemplate.update(
                                        "UPDATE companies SET logo_public_id = ? WHERE id = ?",
                                        over255,
                                        companyId));
            } finally {
                deleteCompanyQuietly(companyId);
            }
        }
    }
}
