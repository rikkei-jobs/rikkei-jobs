package com.rikkei.jobs.adversarial;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.security.CustomAccessDeniedHandler;
import com.rikkei.jobs.common.security.CustomAuthenticationEntryPoint;
import com.rikkei.jobs.common.security.SecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@DisplayName("Adversarial Edge-Case Tests (Milestone 2 - Challenger 2)")
public class AdversarialSecurityEdgeCaseTest {

    @Nested
    @DisplayName("1. CORS Boundary and Parsing Edge Cases")
    class CorsEdgeCaseTests {

        private final CustomAuthenticationEntryPoint authEntryPoint =
                new CustomAuthenticationEntryPoint(new ObjectMapper());
        private final CustomAccessDeniedHandler accessDeniedHandler =
                new CustomAccessDeniedHandler(new ObjectMapper());

        @Test
        @DisplayName(
                "Whitespace trimming: Origins with spaces and empty segments are parsed and trimmed correctly")
        void testCorsAllowedOriginsWhitespaceTrimming() {
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles("dev");

            String rawOrigins =
                    "  http://localhost:3000   ,   https://app.example.com  ,   ,  http://127.0.0.1:3000   ";
            SecurityConfig config =
                    new SecurityConfig(authEntryPoint, accessDeniedHandler, env, rawOrigins);

            CorsConfigurationSource source = config.corsConfigurationSource();
            assertNotNull(source);

            // Verify internal configuration
            CorsConfiguration corsConfig =
                    source.getCorsConfiguration(
                            new org.springframework.mock.web.MockHttpServletRequest(
                                    "GET", "/api/v1/health"));
            assertNotNull(corsConfig);

            var allowedOrigins = corsConfig.getAllowedOrigins();
            assertNotNull(allowedOrigins);
            assertEquals(
                    3,
                    allowedOrigins.size(),
                    "Should have exactly 3 parsed origins without empty elements");
            assertTrue(
                    allowedOrigins.contains("http://localhost:3000"),
                    "Must contain trimmed http://localhost:3000");
            assertTrue(
                    allowedOrigins.contains("https://app.example.com"),
                    "Must contain trimmed https://app.example.com");
            assertTrue(
                    allowedOrigins.contains("http://127.0.0.1:3000"),
                    "Must contain trimmed http://127.0.0.1:3000");
            assertFalse(allowedOrigins.contains(""), "Must not contain empty string");
            assertFalse(allowedOrigins.contains("   "), "Must not contain whitespace string");
        }

        @ParameterizedTest
        @ValueSource(strings = {"", "   ", "\t", "\n"})
        @DisplayName(
                "Fail-fast prod: Blank or whitespace-only CORS_ALLOWED_ORIGINS throws IllegalStateException")
        void testProdFailFastOnBlankCorsOrigins(String blankOrigin) {
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles("prod");

            SecurityConfig config =
                    new SecurityConfig(authEntryPoint, accessDeniedHandler, env, blankOrigin);
            IllegalStateException ex =
                    assertThrows(
                            IllegalStateException.class,
                            config::corsConfigurationSource,
                            "Must fail fast when CORS_ALLOWED_ORIGINS is blank in prod");
            assertTrue(
                    ex.getMessage()
                            .contains(
                                    "CORS_ALLOWED_ORIGINS must be set and non-empty in prod profile"));
        }

        @Test
        @DisplayName("Fail-fast prod: Null CORS_ALLOWED_ORIGINS throws IllegalStateException")
        void testProdFailFastOnNullCorsOrigins() {
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles("prod");

            SecurityConfig config =
                    new SecurityConfig(authEntryPoint, accessDeniedHandler, env, null);
            IllegalStateException ex =
                    assertThrows(
                            IllegalStateException.class,
                            config::corsConfigurationSource,
                            "Must fail fast when CORS_ALLOWED_ORIGINS is null in prod");
            assertTrue(
                    ex.getMessage()
                            .contains(
                                    "CORS_ALLOWED_ORIGINS must be set and non-empty in prod profile"));
        }

        @Test
        @DisplayName(
                "Adversarial check: What if CORS_ALLOWED_ORIGINS contains only commas and spaces (e.g. ' , , ') in prod?")
        void testProdWithOnlyCommasAndSpaces() {
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles("prod");

            String onlyCommas = "  ,  ,  ";
            SecurityConfig config =
                    new SecurityConfig(authEntryPoint, accessDeniedHandler, env, onlyCommas);

            // Let's observe the behavior: does origins list become empty?
            CorsConfigurationSource source = config.corsConfigurationSource();
            CorsConfiguration corsConfig =
                    source.getCorsConfiguration(
                            new org.springframework.mock.web.MockHttpServletRequest(
                                    "GET", "/api/v1/health"));
            assertNotNull(corsConfig);
            // Notice: allowedOrigins is empty list
            assertTrue(
                    corsConfig.getAllowedOrigins().isEmpty(),
                    "When only commas provided, parsed origins list is empty, effectively blocking all CORS origins");
        }
    }

    @Nested
    @SpringBootTest(
            webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
            properties = {"CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000"})
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("2. Preflight and Header Hardening Tests")
    class PreflightAndHeaderTests {

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
        @DisplayName(
                "Preflight with unlisted/malicious header in Access-Control-Request-Headers must be rejected")
        void testPreflightWithUnlistedHeaderRejected() throws Exception {
            // Testing unlisted header: "X-Malicious-Exploit"
            mockMvc.perform(
                            options("/api/v1/health")
                                    .header("Origin", "http://localhost:3000")
                                    .header("Access-Control-Request-Method", "GET")
                                    .header(
                                            "Access-Control-Request-Headers",
                                            "X-Malicious-Exploit"))
                    .andExpect(status().isForbidden())
                    .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
        }

        @Test
        @DisplayName("Preflight with disallowed HTTP method (e.g. TRACE, CONNECT) must be rejected")
        void testPreflightWithDisallowedMethodRejected() throws Exception {
            mockMvc.perform(
                            options("/api/v1/health")
                                    .header("Origin", "http://localhost:3000")
                                    .header("Access-Control-Request-Method", "TRACE"))
                    .andExpect(status().isForbidden())
                    .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
        }

        @Test
        @DisplayName("Preflight with allowed methods and allowed headers succeeds with 200")
        void testPreflightWithAllowedMethodAndHeadersSucceeds() throws Exception {
            mockMvc.perform(
                            options("/api/v1/health")
                                    .header("Origin", "http://localhost:3000")
                                    .header("Access-Control-Request-Method", "POST")
                                    .header(
                                            "Access-Control-Request-Headers",
                                            "Authorization, Content-Type, X-Service-Key"))
                    .andExpect(status().isOk())
                    .andExpect(
                            header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                    .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
        }
    }

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("3. Actuator Health Leakage Resistance Tests")
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
            // Because only /actuator/health is permitAll, /actuator/health/db requires
            // authentication -> 401
            var result = mockMvc.perform(get("/actuator/health/db")).andReturn();
            int statusCode = result.getResponse().getStatus();
            String content = result.getResponse().getContentAsString();
            System.out.println(
                    "DEBUG /actuator/health/db status: " + statusCode + ", content: " + content);

            // In SecurityConfig, only /actuator/health is permitAll. /actuator/health/db returns
            // 401 Unauthorized
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
            // /actuator/env must return 401 Unauthorized (because not permitAll and not exposed)
            mockMvc.perform(get("/actuator/env"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

            // /actuator/beans must return 401 Unauthorized
            mockMvc.perform(get("/actuator/beans"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        }
    }

    @Nested
    @SpringBootTest(properties = {"CORS_ALLOWED_ORIGINS=http://localhost:3000"})
    @Testcontainers
    @ActiveProfiles("staging")
    @DisplayName("4. Arbitrary Non-Dev Profile Isolation (e.g. 'staging')")
    class ArbitraryProfileIsolationTests {

        @Container
        static PostgreSQLContainer stagingDb = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", stagingDb::getJdbcUrl);
            registry.add("spring.datasource.username", stagingDb::getUsername);
            registry.add("spring.datasource.password", stagingDb::getPassword);
        }

        @Autowired private com.rikkei.jobs.identity.repository.UserRepository userRepository;
        @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

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
            assertEquals(1, migrationCount, "Only V1 schema migration must be applied");

            Boolean hasV2 =
                    jdbcTemplate.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '2')",
                            Boolean.class);
            assertFalse(
                    Boolean.TRUE.equals(hasV2),
                    "V2 seed migration must NOT exist in staging profile");
        }
    }

    @Nested
    @Testcontainers
    @DisplayName("5. Server Fail-Fast Bootstrap in Production Profile")
    class ProdServerFailFastBootstrapTests {

        @Container
        static PostgreSQLContainer prodDb = new PostgreSQLContainer("postgres:18.6-alpine");

        @Test
        @DisplayName(
                "Prod profile fails to bootstrap when CORS_ALLOWED_ORIGINS environment variable is missing")
        void testProdServerFailsToStartWithoutCorsAllowedOrigins() {
            org.springframework.boot.builder.SpringApplicationBuilder builder =
                    new org.springframework.boot.builder.SpringApplicationBuilder(
                                    com.rikkei.jobs.RikkeiJobsApplication.class)
                            .profiles("prod");

            Exception exception =
                    assertThrows(
                            Exception.class,
                            () ->
                                    builder.run(
                                            "--server.port=0",
                                            "--spring.datasource.url=" + prodDb.getJdbcUrl(),
                                            "--spring.datasource.username=" + prodDb.getUsername(),
                                            "--spring.datasource.password=" + prodDb.getPassword(),
                                            "--spring.flyway.enabled=true"));

            System.out.println(
                    "DEBUG BOOTSTRAP EXCEPTION: "
                            + exception.getClass().getName()
                            + ": "
                            + exception.getMessage());
            Throwable cause = exception;
            while (cause != null) {
                System.out.println(
                        "  CAUSE: " + cause.getClass().getName() + ": " + cause.getMessage());
                cause = cause.getCause();
            }

            cause = exception;
            boolean foundCorsMessage = false;
            while (cause != null) {
                if (cause.getMessage() != null
                        && cause.getMessage()
                                .contains(
                                        "CORS_ALLOWED_ORIGINS must be set and non-empty in prod profile")) {
                    foundCorsMessage = true;
                    break;
                }
                cause = cause.getCause();
            }
            assertTrue(
                    foundCorsMessage,
                    "Bootstrap must fail with CORS_ALLOWED_ORIGINS error in prod");
        }
    }
}
