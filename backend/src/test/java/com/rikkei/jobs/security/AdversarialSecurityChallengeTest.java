package com.rikkei.jobs.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.security.CustomAccessDeniedHandler;
import com.rikkei.jobs.common.security.CustomAuthenticationEntryPoint;
import com.rikkei.jobs.common.security.SecurityConfig;
import com.rikkei.jobs.identity.repository.UserRepository;
import java.util.List;
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
import org.springframework.mock.env.MockEnvironment;
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
 * Empirical Adversarial Challenge Test Suite for Milestone 2. Actively stress-tests CORS attacks,
 * profile data leakage, Actuator exposure, and test controller restrictions across dev, prod, and
 * default profiles.
 */
public class AdversarialSecurityChallengeTest {

    @Nested
    @SpringBootTest(
            webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
            properties = {"CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000"})
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("CORS Adversarial Attack Suite")
    class CorsAdversarialTests {

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

        @ParameterizedTest(name = "Evil origin: {0} must be rejected 403 without CORS headers")
        @ValueSource(
                strings = {
                    "https://evil.com",
                    "http://evil.example.org",
                    "http://malicious.attacker.io",
                    "null",
                    "http://localhost:3000.evil.com",
                    "http://evil-localhost:3000",
                    "http://localhost:30000",
                    "http://localhost:3001",
                    "https://localhost:3000",
                    "file://",
                    "http://127.0.0.1:8080"
                })
        void testAdversarialOriginsRejected(String evilOrigin) throws Exception {
            mockMvc.perform(get("/api/v1/health").header("Origin", evilOrigin))
                    .andExpect(status().isForbidden())
                    .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
        }

        @ParameterizedTest(
                name =
                        "Preflight OPTIONS from evil origin {0} must not receive allow origin header")
        @ValueSource(
                strings = {
                    "https://evil.com",
                    "http://localhost:3000.evil.com",
                    "null",
                    "http://attacker.com"
                })
        void testAdversarialPreflightOptionsRejected(String evilOrigin) throws Exception {
            mockMvc.perform(
                            options("/api/v1/health")
                                    .header("Origin", evilOrigin)
                                    .header("Access-Control-Request-Method", "GET"))
                    .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
        }

        @Test
        @DisplayName(
                "Preflight with disallowed HTTP method (e.g. TRACE) must not allow that method")
        void testPreflightDisallowedMethod() throws Exception {
            mockMvc.perform(
                            options("/api/v1/health")
                                    .header("Origin", "http://localhost:3000")
                                    .header("Access-Control-Request-Method", "TRACE"))
                    .andExpect(
                            header().string(
                                            "Access-Control-Allow-Methods",
                                            org.hamcrest.Matchers.not(
                                                    org.hamcrest.Matchers.containsString(
                                                            "TRACE"))));
        }

        @Test
        @DisplayName(
                "Allowed origin http://localhost:3000 correctly receives explicit CORS headers")
        void testAllowedOriginReceivesCorrectHeaders() throws Exception {
            mockMvc.perform(get("/api/v1/health").header("Origin", "http://localhost:3000"))
                    .andExpect(status().isOk())
                    .andExpect(
                            header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                    .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
        }

        @Test
        @DisplayName(
                "SecurityConfig fail-fast in prod with null/empty/whitespace CORS_ALLOWED_ORIGINS")
        void testFailFastInProdWithEmptyOrigins() {
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles("prod");
            CustomAuthenticationEntryPoint authEntryPoint =
                    new CustomAuthenticationEntryPoint(new ObjectMapper());
            CustomAccessDeniedHandler accessDeniedHandler =
                    new CustomAccessDeniedHandler(new ObjectMapper());

            assertThrows(
                    IllegalStateException.class,
                    () ->
                            new SecurityConfig(authEntryPoint, accessDeniedHandler, env, null)
                                    .corsConfigurationSource());
            assertThrows(
                    IllegalStateException.class,
                    () ->
                            new SecurityConfig(authEntryPoint, accessDeniedHandler, env, "")
                                    .corsConfigurationSource());
            assertThrows(
                    IllegalStateException.class,
                    () ->
                            new SecurityConfig(authEntryPoint, accessDeniedHandler, env, "   ")
                                    .corsConfigurationSource());
        }

        @Test
        @DisplayName("SecurityConfig properly trims and parses comma-separated origins")
        void testCorsOriginParsingWithWhitespace() {
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles("dev");
            CustomAuthenticationEntryPoint authEntryPoint =
                    new CustomAuthenticationEntryPoint(new ObjectMapper());
            CustomAccessDeniedHandler accessDeniedHandler =
                    new CustomAccessDeniedHandler(new ObjectMapper());

            SecurityConfig config =
                    new SecurityConfig(
                            authEntryPoint,
                            accessDeniedHandler,
                            env,
                            "  http://foo.com  ,  https://bar.com  ,   ");
            org.springframework.web.cors.CorsConfiguration corsConfig =
                    ((org.springframework.web.cors.UrlBasedCorsConfigurationSource)
                                    config.corsConfigurationSource())
                            .getCorsConfigurations()
                            .get("/**");

            assertEquals(
                    List.of("http://foo.com", "https://bar.com"), corsConfig.getAllowedOrigins());
        }
    }

    @Nested
    @SpringBootTest(
            webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
            properties = {
                "CORS_ALLOWED_ORIGINS=http://localhost:3000",
                "EXTERNAL_BASE_URL=https://mock.example.com",
                "EXTERNAL_SERVICE_KEY=prod-secret-service-key-999"
            })
    @Testcontainers
    @ActiveProfiles("prod")
    @DisplayName("Prod Profile Adversarial Security & Actuator Leakage Suite")
    class ProdProfileAdversarialTests {

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
                                            "--spring.flyway.enabled=true"));

            Throwable cause = exception;
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
                    "Bootstrap must fail fast with CORS_ALLOWED_ORIGINS error in prod");
        }
    }

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @Testcontainers
    @DisplayName("Default Profile (No @ActiveProfiles) Adversarial Isolation Suite")
    class DefaultProfileAdversarialTests {

        @Container
        static PostgreSQLContainer defaultPostgres =
                new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", defaultPostgres::getJdbcUrl);
            registry.add("spring.datasource.username", defaultPostgres::getUsername);
            registry.add("spring.datasource.password", defaultPostgres::getPassword);
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
        @DisplayName("Default profile strictly isolates seed data (0 users, only V1 migration)")
        void testDefaultProfileDatabaseState() {
            assertEquals(0L, userRepository.count(), "Default profile must have 0 users");

            Integer totalMigrations =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                            Integer.class);
            assertEquals(1, totalMigrations, "Default profile must have exactly 1 migration (V1)");

            Integer v2Count =
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM flyway_schema_history WHERE version = '2'",
                            Integer.class);
            assertEquals(0, v2Count, "V2 seed migration must not exist in default profile");
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
