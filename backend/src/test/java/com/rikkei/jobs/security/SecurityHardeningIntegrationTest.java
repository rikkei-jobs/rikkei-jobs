package com.rikkei.jobs.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rikkei.jobs.identity.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
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
 * Comprehensive integration tests for application security hardening across environments: profile
 * isolation, Actuator information leakage resistance, test controller protection, and production
 * fail-fast enforcement.
 */
@DisplayName("Security Hardening and Environment Isolation Integration Tests")
public class SecurityHardeningIntegrationTest {

    @Nested
    @SpringBootTest(
            webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
            properties = {
                "CORS_ALLOWED_ORIGINS=http://localhost:3000",
                "EXTERNAL_BASE_URL=https://mock.example.com",
                "EXTERNAL_SERVICE_KEY=prod-secret-service-key-999",
                "JWT_SECRET=super-secure-production-jwt-secret-key-32-bytes-minimum!"
            })
    @Testcontainers
    @ActiveProfiles("prod")
    @DisplayName("Production Profile Security, Seed Isolation & Actuator Leakage Protection")
    class ProdProfileHardeningTests {

        @Container
        static PostgreSQLContainer prodPostgres = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("SPRING_DATASOURCE_URL", prodPostgres::getJdbcUrl);
            registry.add("SPRING_DATASOURCE_USERNAME", prodPostgres::getUsername);
            registry.add("SPRING_DATASOURCE_PASSWORD", prodPostgres::getPassword);
            registry.add("spring.datasource.url", prodPostgres::getJdbcUrl);
            registry.add("spring.datasource.username", prodPostgres::getUsername);
            registry.add("spring.datasource.password", prodPostgres::getPassword);
        }

        @Autowired private WebApplicationContext context;
        @Autowired private UserRepository userRepository;
        @Autowired private JdbcTemplate jdbcTemplate;
        private MockMvc mockMvc;

        @BeforeEach
        void setUp() {
            mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        }

        @Test
        @DisplayName("Prod profile has strictly 0 users and no V2 migration in database")
        void testProdDatabaseIsolation() {
            assertEquals(0L, userRepository.count(), "Prod profile must have 0 users");

            Integer v2Count =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE version = '2'",
                            Integer.class);
            assertEquals(0, v2Count, "V2 migration must not exist in prod");

            Integer v4Count =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE version = '4'",
                            Integer.class);
            assertEquals(0, v4Count, "V4 dev seed migration must not exist in prod");

            Integer seedUsers =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM users WHERE email LIKE '%@rikkeijobs.test'",
                            Integer.class);
            assertEquals(0, seedUsers, "No seed user accounts should exist in prod");
        }

        @Test
        @DisplayName("Actuator /actuator/health in prod returns minimal UP and leaks no internals")
        void testActuatorHealthDoesNotLeakInProd() throws Exception {
            mockMvc.perform(get("/actuator/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"))
                    .andExpect(jsonPath("$.components").doesNotExist())
                    .andExpect(jsonPath("$.details").doesNotExist())
                    .andExpect(jsonPath("$.db").doesNotExist())
                    .andExpect(jsonPath("$.diskSpace").doesNotExist())
                    .andExpect(jsonPath("$.ping").doesNotExist());
        }

        @ParameterizedTest(name = "Actuator sensitive endpoint: {0} must be blocked 401")
        @ValueSource(
                strings = {
                    "/actuator",
                    "/actuator/env",
                    "/actuator/beans",
                    "/actuator/mappings",
                    "/actuator/configprops",
                    "/actuator/info"
                })
        void testActuatorSensitiveEndpointsBlocked(String endpoint) throws Exception {
            mockMvc.perform(get(endpoint))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        }

        @ParameterizedTest(name = "Test endpoint {0} in prod must be blocked 401 Unauthorized")
        @ValueSource(
                strings = {
                    "/api/v1/test/not-found",
                    "/api/v1/test/rate-limit",
                    "/api/v1/test/external-unavailable",
                    "/api/v1/test/external/courses"
                })
        void testGetEndpointsBlockedInProd(String endpoint) throws Exception {
            mockMvc.perform(get(endpoint))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                    .andExpect(jsonPath("$.message").value("Yêu cầu xác thực tài khoản"));
        }

        @ParameterizedTest(name = "POST test endpoint {0} in prod must be blocked 401 Unauthorized")
        @ValueSource(
                strings = {
                    "/api/v1/test/validation",
                    "/api/v1/test/conflict",
                    "/api/v1/test/external/verify-ticket"
                })
        void testPostEndpointsBlockedInProd(String endpoint) throws Exception {
            mockMvc.perform(
                            post(endpoint)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"name\":\"test\",\"ticket\":\"test\"}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                    .andExpect(jsonPath("$.message").value("Yêu cầu xác thực tài khoản"));
        }

        @Test
        @DisplayName("Test endpoint with forged bearer token in prod is rejected 401")
        void testEndpointWithForgedTokenRejected() throws Exception {
            mockMvc.perform(
                            get("/api/v1/test/external/courses")
                                    .header("Authorization", "Bearer invalid.fake.token.here"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        }

        @Test
        @DisplayName(
                "Full application bootstrap in prod fails fast when CORS_ALLOWED_ORIGINS is missing")
        void testProdBootstrapFailsFastOnMissingCors() {
            org.springframework.boot.builder.SpringApplicationBuilder builder =
                    new org.springframework.boot.builder.SpringApplicationBuilder(
                                    com.rikkei.jobs.RikkeiJobsApplication.class)
                            .profiles("prod");

            Exception exception =
                    assertThrows(
                            Exception.class,
                            () ->
                                    builder.run(
                                            "--spring.datasource.url=" + prodPostgres.getJdbcUrl(),
                                            "--spring.datasource.username="
                                                    + prodPostgres.getUsername(),
                                            "--spring.datasource.password="
                                                    + prodPostgres.getPassword(),
                                            "--external.api.base-url=https://mock.example.com",
                                            "--external.api.service-key=prod-secret-service-key-999",
                                            "--spring.flyway.enabled=true"));

            Throwable cause = exception;
            boolean foundCorsMessage = false;
            while (cause != null) {
                if (cause.getMessage() != null
                        && cause.getMessage().contains("CORS_ALLOWED_ORIGINS")) {
                    foundCorsMessage = true;
                    break;
                }
                cause = cause.getCause();
            }
            assertTrue(
                    foundCorsMessage,
                    "Bootstrap must fail fast with CORS_ALLOWED_ORIGINS error in prod");
        }
    }

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("Dev Profile Actuator Information Leakage Resistance")
    class ActuatorLeakageTests {

        @Container
        static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }

        @Autowired private WebApplicationContext context;
        private MockMvc mockMvc;

        @BeforeEach
        void setUp() {
            mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        }

        @Test
        @DisplayName("Query param ?showDetails=always must NOT override show-details: never")
        void testActuatorHealthQueryParamDoesNotLeakDetails() throws Exception {
            mockMvc.perform(get("/actuator/health?showDetails=always"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"))
                    .andExpect(jsonPath("$.components").doesNotExist())
                    .andExpect(jsonPath("$.details").doesNotExist())
                    .andExpect(jsonPath("$.db").doesNotExist())
                    .andExpect(jsonPath("$.diskSpace").doesNotExist())
                    .andExpect(jsonPath("$.ping").doesNotExist());
        }

        @Test
        @DisplayName("Subpath /actuator/health/db must NOT leak database component details")
        void testActuatorHealthDbSubpath() throws Exception {
            var result = mockMvc.perform(get("/actuator/health/db")).andReturn();
            int statusCode = result.getResponse().getStatus();
            String content = result.getResponse().getContentAsString();

            assertEquals(
                    401,
                    statusCode,
                    "Subpaths like /actuator/health/db are not permitted and return 401");
            assertTrue(
                    content.contains("UNAUTHORIZED"),
                    "Must return standard UNAUTHORIZED json error");

            assertFalse(
                    content.contains("validationQuery"), "Must not leak database validationQuery");
            assertFalse(
                    content.contains("PostgreSQL"), "Must not leak database dialect/product name");
            assertFalse(content.contains("jdbc:"), "Must not leak database JDBC connection string");
        }

        @Test
        @DisplayName("Subpath /actuator/health/diskSpace must NOT leak disk path or volume sizes")
        void testActuatorHealthDiskSpaceSubpath() throws Exception {
            var result = mockMvc.perform(get("/actuator/health/diskSpace")).andReturn();
            int statusCode = result.getResponse().getStatus();
            String content = result.getResponse().getContentAsString();
            assertEquals(
                    401,
                    statusCode,
                    "Subpaths like /actuator/health/diskSpace require authentication and return 401");
            assertTrue(
                    content.contains("UNAUTHORIZED"),
                    "Must return standard UNAUTHORIZED json error");
            assertFalse(content.contains("total"), "Must not leak total disk space");
            assertFalse(content.contains("free"), "Must not leak free disk space");
            assertFalse(content.contains("threshold"), "Must not leak disk threshold");
            assertFalse(content.contains("path"), "Must not leak server directory paths");
        }

        @Test
        @DisplayName(
                "Sensitive actuator endpoints (/actuator/env, /actuator/beans) must NOT be exposed publicly")
        void testSensitiveActuatorEndpointsNotExposed() throws Exception {
            mockMvc.perform(get("/actuator/env"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

            mockMvc.perform(get("/actuator/beans"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        }
    }

    @Nested
    @SpringBootTest(properties = {"CORS_ALLOWED_ORIGINS=http://localhost:3000"})
    @Testcontainers
    @ActiveProfiles("staging")
    @DisplayName("Arbitrary Non-Dev Profile (e.g. 'staging') Seed Isolation")
    class ArbitraryProfileIsolationTests {

        @Container
        static PostgreSQLContainer stagingDb = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", stagingDb::getJdbcUrl);
            registry.add("spring.datasource.username", stagingDb::getUsername);
            registry.add("spring.datasource.password", stagingDb::getPassword);
            registry.add("jwt.secret", () -> "arbitrary-profile-test-secret-min-32-chars-long!");
        }

        @Autowired private UserRepository userRepository;
        @Autowired private JdbcTemplate jdbcTemplate;

        @Test
        @DisplayName(
                "Any non-dev profile (e.g., 'staging') must NEVER load dev seed migrations or users")
        void testNonDevProfileNeverSeedsUsers() {
            long userCount = userRepository.count();
            assertEquals(0L, userCount, "Non-dev profile 'staging' must have strictly 0 users");

            Integer migrationCount =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                            Integer.class);
            assertEquals(3, migrationCount, "Only schema migrations V1, V3 and V5 must be applied");

            Boolean hasV2 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '2')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasV2),
                    "V2 seed migration must NOT exist in staging profile");

            Boolean hasV4 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '4')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasV4),
                    "V4 dev seed migration must NOT exist in staging profile");
        }
    }

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @Testcontainers
    @DisplayName("Default Profile (No @ActiveProfiles) Isolation")
    class DefaultProfileIsolationTests {

        @Container
        static PostgreSQLContainer defaultPostgres =
                new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", defaultPostgres::getJdbcUrl);
            registry.add("spring.datasource.username", defaultPostgres::getUsername);
            registry.add("spring.datasource.password", defaultPostgres::getPassword);
            registry.add("jwt.secret", () -> "default-profile-test-secret-min-32-chars-long!");
        }

        @Autowired private WebApplicationContext context;
        @Autowired private UserRepository userRepository;
        @Autowired private JdbcTemplate jdbcTemplate;
        private MockMvc mockMvc;

        @BeforeEach
        void setUp() {
            mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        }

        @Test
        @DisplayName(
                "Default profile strictly isolates seed data (0 users, only V1 and V3 migrations)")
        void testDefaultProfileDatabaseState() {
            assertEquals(0L, userRepository.count(), "Default profile must have 0 users");

            Integer totalMigrations =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                            Integer.class);
            assertEquals(
                    3,
                    totalMigrations,
                    "Default profile must have exactly 3 schema migrations (V1, V3, V5)");

            Integer v2Count =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE version = '2'",
                            Integer.class);
            assertEquals(0, v2Count, "V2 seed migration must not exist in default profile");

            Integer v4Count =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE version = '4'",
                            Integer.class);
            assertEquals(0, v4Count, "V4 seed migration must not exist in default profile");
        }

        @Test
        @DisplayName("Default profile blocks /api/v1/test/** endpoints with 401 Unauthorized")
        void testDefaultProfileBlocksTestEndpoints() throws Exception {
            mockMvc.perform(get("/api/v1/test/external/courses"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                    .andExpect(jsonPath("$.message").value("Yêu cầu xác thực tài khoản"));
        }

        @Test
        @DisplayName("Default profile /actuator/health is minimal UP and does not leak internals")
        void testDefaultProfileActuatorHealthMinimal() throws Exception {
            mockMvc.perform(get("/actuator/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"))
                    .andExpect(jsonPath("$.components").doesNotExist())
                    .andExpect(jsonPath("$.db").doesNotExist())
                    .andExpect(jsonPath("$.diskSpace").doesNotExist());
        }
    }
}
