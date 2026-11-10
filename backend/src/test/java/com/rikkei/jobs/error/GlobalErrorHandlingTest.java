package com.rikkei.jobs.error;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
public class GlobalErrorHandlingTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18.6-alpine");

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
            "400 Bad Request: Validation failure must return {code: VALIDATION_ERROR, message: ...}")
    void test400ValidationError() throws Exception {
        mockMvc.perform(
                        post("/api/v1/test/validation")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName(
            "400 Bad Request: Malformed JSON body must return {code: VALIDATION_ERROR, message: ...}")
    void test400MalformedJson() throws Exception {
        mockMvc.perform(
                        post("/api/v1/test/validation")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{invalid-json-body}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName(
            "401 Unauthorized: Unauthenticated request to protected endpoint returns {code: UNAUTHORIZED, message: ...}")
    void test401Unauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/protected/candidates"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Yêu cầu xác thực tài khoản"));
    }

    @Test
    @DisplayName(
            "404 Not Found: Accessing non-existing route returns {code: NOT_FOUND, message: ...}")
    void test404NotFound() throws Exception {
        mockMvc.perform(get("/api/v1/test/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName(
            "405 Method Not Allowed: POST to GET-only endpoint returns {code: METHOD_NOT_ALLOWED, message: ...}")
    void test405MethodNotAllowed() throws Exception {
        mockMvc.perform(post("/api/v1/health"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("409 Conflict: Conflict exception returns {code: CONFLICT, message: ...}")
    void test409Conflict() throws Exception {
        mockMvc.perform(post("/api/v1/test/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName(
            "429 Too Many Requests: Rate limit exception returns {code: RATE_LIMITED, message: ...}")
    void test429RateLimited() throws Exception {
        mockMvc.perform(get("/api/v1/test/rate-limit"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName(
            "503 Service Unavailable: External service failure returns {code: EXTERNAL_UNAVAILABLE, message: ...}")
    void test503ExternalUnavailable() throws Exception {
        mockMvc.perform(get("/api/v1/test/external-unavailable"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("EXTERNAL_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }
}
