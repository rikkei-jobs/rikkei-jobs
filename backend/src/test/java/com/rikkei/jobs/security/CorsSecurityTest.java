package com.rikkei.jobs.security;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.security.CustomAccessDeniedHandler;
import com.rikkei.jobs.common.security.CustomAuthenticationEntryPoint;
import com.rikkei.jobs.common.security.SecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000"})
@Testcontainers
@ActiveProfiles("dev")
public class CorsSecurityTest {

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
            "Allowed origin receives Access-Control-Allow-Origin and Access-Control-Allow-Credentials: true")
    void testAllowedOriginReceivesCorsHeaders() throws Exception {
        mockMvc.perform(get("/api/v1/health").header("Origin", "http://localhost:3000"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test
    @DisplayName("Evil origin is rejected and does NOT receive Access-Control-Allow-Origin header")
    void testEvilOriginDoesNotReceiveCorsHeader() throws Exception {
        mockMvc.perform(get("/api/v1/health").header("Origin", "https://evil.example"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
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
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(header().exists("Access-Control-Allow-Methods"))
                .andExpect(header().exists("Access-Control-Allow-Headers"));
    }

    @Test
    @DisplayName("Preflight OPTIONS request from evil origin does NOT receive allow origin header")
    void testPreflightOptionsRequestFromEvilOrigin() throws Exception {
        mockMvc.perform(
                        options("/api/v1/health")
                                .header("Origin", "https://evil.example")
                                .header("Access-Control-Request-Method", "GET"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    @DisplayName(
            "Fail-fast: Prod profile with empty CORS_ALLOWED_ORIGINS throws IllegalStateException")
    void testProdFailFastOnMissingCorsAllowedOrigins() {
        MockEnvironment mockEnv = new MockEnvironment();
        mockEnv.setActiveProfiles("prod");
        CustomAuthenticationEntryPoint authEntryPoint =
                new CustomAuthenticationEntryPoint(new ObjectMapper());
        CustomAccessDeniedHandler accessDeniedHandler =
                new CustomAccessDeniedHandler(new ObjectMapper());

        SecurityConfig prodConfig =
                new SecurityConfig(authEntryPoint, accessDeniedHandler, mockEnv, "");
        assertThrows(
                IllegalStateException.class,
                prodConfig::corsConfigurationSource,
                "Must throw IllegalStateException when CORS_ALLOWED_ORIGINS is empty in prod");
    }
}
