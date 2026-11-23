package com.rikkei.jobs.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Validates strict separation between prod and dev profiles. - Prod profile: ONLY schema migrations
 * V1, V3, V5, V7, V9, V11, V13 and V15 applied, exactly 0 users seeded, /api/v1/test/** blocked. -
 * Dev profile: all of V1-V15 applied, exactly 9 users seeded. - Mutation/negative test: verifies
 * that seed data isolation holds and fails if inverted.
 */
public class ProfileSeparationIntegrationTest {

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
                "CLOUDINARY_DELIVERY_BASE_URL=https://res.cloudinary.com/prod-rikkei-cloud/image/upload",
                "APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=true",
                "APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES=127.0.0.1"
            })
    @Testcontainers
    @ActiveProfiles("prod")
    @DisplayName("Prod Profile Verification (Seed Isolation & Security)")
    class ProdProfileTests {

        @Container
        static PostgreSQLContainer prodDb = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("SPRING_DATASOURCE_URL", prodDb::getJdbcUrl);
            registry.add("SPRING_DATASOURCE_USERNAME", prodDb::getUsername);
            registry.add("SPRING_DATASOURCE_PASSWORD", prodDb::getPassword);
            registry.add("spring.datasource.url", prodDb::getJdbcUrl);
            registry.add("spring.datasource.username", prodDb::getUsername);
            registry.add("spring.datasource.password", prodDb::getPassword);
        }

        @Autowired private UserRepository userRepository;
        @Autowired private JdbcTemplate jdbcTemplate;
        @Autowired private WebApplicationContext context;

        @Test
        @DisplayName("Prod profile must apply only V1 schema and have 0 seeded users")
        void testProdProfileHasZeroUsers() {
            long userCount = userRepository.count();
            assertEquals(
                    0L,
                    userCount,
                    "Prod environment must have exactly 0 users (seed data prohibited)");
        }

        @Test
        @DisplayName("Prod profile schema must contain V3 evolved tables and columns")
        void testProdProfileV3SchemaEvolution() {
            Integer usedSsoTicketsCount =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM used_sso_tickets", Integer.class);
            assertEquals(
                    0,
                    usedSsoTicketsCount,
                    "used_sso_tickets table must exist in prod and be empty");

            Integer passwordResetTokensCount =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM password_reset_tokens", Integer.class);
            assertEquals(
                    0,
                    passwordResetTokensCount,
                    "password_reset_tokens table must exist in prod and be empty");

            Boolean hasCompanyId =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasCompanyId),
                    "users table must have company_id column in prod");
        }

        @Test
        @DisplayName(
                "Prod profile must apply only V1, V3, V5, V7, V9, V11, V13 and V15 migrations in flyway_schema_history")
        void testProdProfileAppliesOnlyV1Schema() {
            Integer migrationCount =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                            Integer.class);
            assertEquals(
                    8,
                    migrationCount,
                    "Prod environment must only execute schema migrations V1, V3, V5, V7, V9, V11,"
                            + " V13 and V15, count must be 8");

            Boolean hasV2 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '2')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasV2),
                    "V2 seed migration must NOT be applied in prod profile");

            Boolean hasV3 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '3')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV3),
                    "V3 schema migration must be applied in prod profile");

            Boolean hasV4 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '4')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasV4),
                    "V4 dev seed migration must NOT be applied in prod profile");

            Boolean hasV7 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '7')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV7),
                    "V7 schema migration must be applied in prod profile");

            Boolean hasV8 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '8')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasV8),
                    "V8 dev seed migration must NOT be applied in prod profile");

            Boolean hasV9 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '9')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV9),
                    "V9 schema migration must be applied in prod profile");

            Boolean hasV10 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '10')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasV10),
                    "V10 dev seed migration must NOT be applied in prod profile");

            Boolean hasV11 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '11')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV11),
                    "V11 schema migration must be applied in prod profile");

            Boolean hasV12 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '12')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasV12),
                    "V12 dev seed migration must NOT be applied in prod profile");

            Boolean hasV13 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '13')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV13),
                    "V13 schema migration must be applied in prod profile");

            Boolean hasV14 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '14')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasV14),
                    "V14 dev seed migration must NOT be applied in prod profile");

            Boolean hasV15 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '15')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV15),
                    "V15 schema migration must be applied in prod profile");
        }

        @Test
        @DisplayName("Prod profile must block /api/v1/test/** endpoints with 401 Unauthorized")
        void testProdProfileBlocksTestErrorEndpoints() throws Exception {
            MockMvc mockMvc =
                    MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            mockMvc.perform(get("/api/v1/test/external/courses"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                    .andExpect(jsonPath("$.message").value("Yêu cầu xác thực tài khoản"));
        }

        @Test
        @DisplayName(
                "Mutation/Negative proof: Prod profile fails assertion if inverted to dev seed expectation")
        void testMutationProofProdProfileIsNotDev() {
            long userCount = userRepository.count();
            // In prod, count must never be >= 8 (which is dev count)
            assertFalse(
                    userCount >= 8L,
                    "Mutation detection: prod profile must not contain dev seed accounts");
            assertEquals(0L, userCount, "Prod profile must strictly have 0 users");
        }
    }

    @Nested
    @SpringBootTest
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("Dev Profile Verification (Seed Inclusion)")
    class DevProfileTests {

        @Container
        static PostgreSQLContainer devDb = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", devDb::getJdbcUrl);
            registry.add("spring.datasource.username", devDb::getUsername);
            registry.add("spring.datasource.password", devDb::getPassword);
        }

        @Autowired private UserRepository userRepository;
        @Autowired private JdbcTemplate jdbcTemplate;

        @Test
        @DisplayName(
                "Dev profile must apply V1 through V15, resulting in exactly 9 seeded users with V6, V8, V10, V12 and V14 seed adjustments")
        void testDevProfileHasNineUsers() {
            long userCount = userRepository.count();
            assertEquals(
                    9L,
                    userCount,
                    "Dev environment must have exactly 9 sample users seeded from V2 and V8");

            User hr1 = userRepository.findByEmail("hr1@rikkeijobs.test").orElseThrow();
            assertTrue(
                    hr1.isMustChangePassword(),
                    "hr1 must have must_change_password = true from V4 dev seed");
            assertEquals(1L, hr1.getCompanyId(), "hr1 must have company_id = 1 from V4 dev seed");

            User hr2 = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();
            assertFalse(
                    hr2.isMustChangePassword(),
                    "hr2 must have must_change_password = false by default");
            assertEquals(2L, hr2.getCompanyId(), "hr2 must have company_id = 2 from V4 dev seed");
        }

        @Test
        @DisplayName("Dev profile must apply V1 through V15 in flyway_schema_history")
        void testDevProfileAppliesV1AndV2() {
            Integer migrationCount =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                            Integer.class);
            assertEquals(
                    15,
                    migrationCount,
                    "Dev environment must execute V1-V15, migration count must be 15");

            Boolean hasV2 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '2')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV2), "V2 seed migration must be applied in dev profile");

            Boolean hasV3 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '3')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV3),
                    "V3 schema migration must be applied in dev profile");

            Boolean hasV4 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '4')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV4),
                    "V4 dev seed migration must be applied in dev profile");

            Boolean hasV7 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '7')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV7),
                    "V7 schema migration must be applied in dev profile");

            Boolean hasV8 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '8')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV8),
                    "V8 dev seed migration must be applied in dev profile");

            Boolean hasV9 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '9')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV9),
                    "V9 schema migration must be applied in dev profile");

            Boolean hasV10 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '10')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV10),
                    "V10 dev seed migration must be applied in dev profile");

            Boolean hasV11 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '11')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV11),
                    "V11 schema migration must be applied in dev profile");

            Boolean hasV12 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '12')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV12),
                    "V12 dev seed migration must be applied in dev profile");

            Boolean hasV13 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '13')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV13),
                    "V13 schema migration must be applied in dev profile");

            Boolean hasV14 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '14')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV14),
                    "V14 dev seed migration must be applied in dev profile");

            Boolean hasV15 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '15')",
                            Boolean.class);
            assertTrue(
                    Boolean.TRUE.equals(hasV15),
                    "V15 schema migration must be applied in dev profile");
        }
    }
}
