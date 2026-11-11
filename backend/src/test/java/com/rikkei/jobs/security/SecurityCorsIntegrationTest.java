package com.rikkei.jobs.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.security.CustomAccessDeniedHandler;
import com.rikkei.jobs.common.security.CustomAuthenticationEntryPoint;
import com.rikkei.jobs.common.security.SecurityConfig;
import java.util.List;
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

/**
 * Comprehensive integration tests for CORS security enforcement, preflight handling, origin
 * validation, and configuration fail-fast policies.
 */
@DisplayName("Security CORS Integration Tests")
public class SecurityCorsIntegrationTest {

    @Nested
    @SpringBootTest(
            webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
            properties = {"CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000"})
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("CORS HTTP Requests and Preflight Origin Validation")
    class CorsHttpValidationTests {

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

        @ParameterizedTest(
                name = "Disallowed origin: {0} must be rejected 403 without CORS headers")
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
        void testDisallowedOriginsRejected(String evilOrigin) throws Exception {
            mockMvc.perform(get("/api/v1/health").header("Origin", evilOrigin))
                    .andExpect(status().isForbidden())
                    .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
        }

        @ParameterizedTest(
                name =
                        "Preflight OPTIONS from disallowed origin {0} must not receive allow origin header")
        @ValueSource(
                strings = {
                    "https://evil.com",
                    "http://localhost:3000.evil.com",
                    "null",
                    "http://attacker.com"
                })
        void testDisallowedPreflightOptionsRejected(String evilOrigin) throws Exception {
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
                    .andExpect(status().isForbidden())
                    .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
        }

        @Test
        @DisplayName(
                "Preflight with unlisted/malicious header in Access-Control-Request-Headers must be rejected")
        void testPreflightWithUnlistedHeaderRejected() throws Exception {
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
                "Preflight OPTIONS request from allowed origin returns 200 with allowed methods and headers")
        void testPreflightOptionsRequestAllowed() throws Exception {
            mockMvc.perform(
                            options("/api/v1/health")
                                    .header("Origin", "http://localhost:3000")
                                    .header("Access-Control-Request-Method", "GET")
                                    .header(
                                            "Access-Control-Request-Headers",
                                            "Authorization,Content-Type"))
                    .andExpect(status().isOk())
                    .andExpect(
                            header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                    .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                    .andExpect(header().exists("Access-Control-Allow-Methods"))
                    .andExpect(header().exists("Access-Control-Allow-Headers"));
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
    @DisplayName("CORS Configuration Source and Parsing Unit Tests")
    class CorsConfigurationParsingTests {

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
                "Origin configuration containing only commas and spaces produces empty allowed origins list")
        void testProdWithOnlyCommasAndSpaces() {
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles("prod");

            String onlyCommas = "  ,  ,  ";
            SecurityConfig config =
                    new SecurityConfig(authEntryPoint, accessDeniedHandler, env, onlyCommas);

            CorsConfigurationSource source = config.corsConfigurationSource();
            CorsConfiguration corsConfig =
                    source.getCorsConfiguration(
                            new org.springframework.mock.web.MockHttpServletRequest(
                                    "GET", "/api/v1/health"));
            assertNotNull(corsConfig);
            assertTrue(
                    corsConfig.getAllowedOrigins().isEmpty(),
                    "When only commas provided, parsed origins list is empty, effectively blocking all CORS origins");
        }

        @Test
        @DisplayName("SecurityConfig properly trims and parses comma-separated origins")
        void testCorsOriginParsingWithWhitespace() {
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles("dev");

            SecurityConfig config =
                    new SecurityConfig(
                            authEntryPoint,
                            accessDeniedHandler,
                            env,
                            "  http://foo.com  ,  https://bar.com  ,   ");
            CorsConfiguration corsConfig =
                    ((org.springframework.web.cors.UrlBasedCorsConfigurationSource)
                                    config.corsConfigurationSource())
                            .getCorsConfigurations()
                            .get("/**");

            assertEquals(
                    List.of("http://foo.com", "https://bar.com"), corsConfig.getAllowedOrigins());
        }
    }
}
