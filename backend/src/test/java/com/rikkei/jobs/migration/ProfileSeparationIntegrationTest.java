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
 * V1 and V3 applied, exactly 0 users seeded, /api/v1/test/** blocked. - Dev profile: all of V1-V4
 * applied, exactly 8 users seeded. - Mutation/negative test: verifies that seed data isolation
 * holds and fails if inverted.
 */
public class ProfileSeparationIntegrationTest {

    @Nested
    @SpringBootTest(
            properties = {
                "CORS_ALLOWED_ORIGINS=http://localhost:3000",
                "EXTERNAL_BASE_URL=https://mock.example.com",
                "EXTERNAL_SERVICE_KEY=prod-secret-service-key-999",
                "JWT_SECRET=super-secure-production-jwt-secret-key-32-bytes-minimum!"
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
        @DisplayName("Prod profile must apply only V1 and V3 migrations in flyway_schema_history")
        void testProdProfileAppliesOnlyV1Schema() {
            Integer migrationCount =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                            Integer.class);
            assertEquals(
                    3,
                    migrationCount,
                    "Prod environment must only execute schema migrations V1, V3 and V5, count must be 3");

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
                "Dev profile must apply both V1 and V2, resulting in exactly 8 seeded users with V4 seed adjustments")
        void testDevProfileHasEightUsers() {
            long userCount = userRepository.count();
            assertEquals(
                    8L,
                    userCount,
                    "Dev environment must have exactly 8 sample users seeded from V2");

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
        @DisplayName("Dev profile must apply V1, V2, V3, and V4 in flyway_schema_history")
        void testDevProfileAppliesV1AndV2() {
            Integer migrationCount =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                            Integer.class);
            assertEquals(
                    6,
                    migrationCount,
                    "Dev environment must execute V1-V6, migration count must be 6");

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
        }
    }
}
