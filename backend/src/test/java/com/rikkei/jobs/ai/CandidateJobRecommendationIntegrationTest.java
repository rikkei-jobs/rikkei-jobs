package com.rikkei.jobs.ai;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("AI Job Recommendation REST API Integration Tests")
public class CandidateJobRecommendationIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("ai.provider", () -> "mock");
    }

    @Autowired private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        this.mockMvc =
                MockMvcBuilders.webAppContextSetup(context)
                        .apply(SecurityMockMvcConfigurers.springSecurity())
                        .build();
    }

    @Test
    @DisplayName(
            "GET /api/v1/me/job-recommendations: returns top 10 recommended jobs sorted by score DESC")
    void testGetJobRecommendationsSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/me/job-recommendations?limit=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(10)))
                .andExpect(jsonPath("$.total").value(10))
                .andExpect(jsonPath("$.candidateId").value(1))
                .andExpect(jsonPath("$.items[0].score", greaterThanOrEqualTo(80)))
                .andExpect(jsonPath("$.items[0].isAiGenerated").value(true))
                .andExpect(jsonPath("$.items[0].explanation").isString())
                .andExpect(jsonPath("$.items[0].rank").value(1))
                .andExpect(jsonPath("$.items[0].requiredSkills").isArray());
    }

    @Test
    @DisplayName("GET /me/job-recommendations: short URL alias functions identically")
    void testShortUrlAlias() throws Exception {
        mockMvc.perform(get("/me/job-recommendations?limit=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(5)))
                .andExpect(jsonPath("$.items[0].isAiGenerated").value(true));
    }

    @Test
    @DisplayName("Candidate 2 (React Frontend) receives Frontend jobs ranked highest")
    void testCandidate2FrontendProfile() throws Exception {
        mockMvc.perform(get("/api/v1/me/job-recommendations?userId=2&limit=5&refresh=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(5)))
                .andExpect(jsonPath("$.candidateId").value(2))
                // Candidate 2's top matches should be React / Frontend jobs
                .andExpect(
                        jsonPath("$.items[0].title")
                                .value(org.hamcrest.Matchers.containsString("Frontend")))
                .andExpect(jsonPath("$.items[0].score", greaterThanOrEqualTo(80)));
    }

    @Test
    @DisplayName(
            "GET /api/v1/me/job-recommendations: invalid limit (<=0 or >100) returns 400 VALIDATION_ERROR")
    void testValidationFailure() throws Exception {
        mockMvc.perform(get("/api/v1/me/job-recommendations?limit=0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(
                        jsonPath("$.message").value(org.hamcrest.Matchers.containsString("limit")));

        mockMvc.perform(get("/api/v1/me/job-recommendations?limit=101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
