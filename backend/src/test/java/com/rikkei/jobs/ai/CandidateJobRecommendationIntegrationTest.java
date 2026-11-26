package com.rikkei.jobs.ai;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rikkei.jobs.ai.dto.UpdateAiConfigRequest;
import com.rikkei.jobs.ai.service.AiConfigService;
import com.rikkei.jobs.ai.service.AiProvider;
import com.rikkei.jobs.ai.service.JobRecommendationService;
import com.rikkei.jobs.identity.UserPrincipal;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
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

    private static final UserPrincipal CANDIDATE_ONE =
            new UserPrincipal(1L, "candidate1@rikkeijobs.test", "CANDIDATE", null, false);
    private static final UserPrincipal CANDIDATE_TWO =
            new UserPrincipal(2L, "candidate2@rikkeijobs.test", "CANDIDATE", null, false);
    private static final UserPrincipal HR_ONE =
            new UserPrincipal(4L, "hr1@rikkeijobs.test", "HR", 1L, false);
    private static final UserPrincipal ADMIN_ONE =
            new UserPrincipal(9L, "admin1@rikkeijobs.test", "ADMIN", null, false);

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
    @Autowired private JdbcTemplate jdbc;
    @Autowired private AiConfigService aiConfigService;

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
            "GET /api/v1/me/job-recommendations: authenticated candidate gets the top 10 jobs sorted by score")
    void testGetJobRecommendationsSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/me/job-recommendations?limit=10").with(user(CANDIDATE_ONE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(10)))
                .andExpect(jsonPath("$.total").value(10))
                .andExpect(jsonPath("$.candidateId").value(1))
                .andExpect(jsonPath("$.items[0].score", greaterThanOrEqualTo(80)))
                .andExpect(jsonPath("$.items[0].isAiGenerated").value(false))
                .andExpect(jsonPath("$.items[0].explanation").isString())
                .andExpect(jsonPath("$.items[0].rank").value(1))
                .andExpect(jsonPath("$.items[0].requiredSkills").isArray());
    }

    @Test
    @DisplayName("Anonymous callers must receive 401 Unauthorized")
    void testAnonymousRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/me/job-recommendations"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Non-candidate roles must receive 403 Forbidden")
    void testNonCandidateRoleIsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/me/job-recommendations").with(user(HR_ONE)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("A candidate cannot read another candidate via a userId query parameter")
    void testUserIdParameterCannotSelectAnotherCandidate() throws Exception {
        mockMvc.perform(get("/api/v1/me/job-recommendations?userId=2").with(user(CANDIDATE_ONE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidateId").value(1));
    }

    @Test
    @DisplayName("Candidate 2 (React Frontend) receives Frontend jobs ranked highest")
    void testCandidate2FrontendProfile() throws Exception {
        mockMvc.perform(
                        get("/api/v1/me/job-recommendations?limit=5&refresh=true")
                                .with(user(CANDIDATE_TWO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(5)))
                .andExpect(jsonPath("$.candidateId").value(2))
                .andExpect(jsonPath("$.items[0].title").value(containsString("Frontend")))
                .andExpect(jsonPath("$.items[0].score", greaterThanOrEqualTo(80)));
    }

    @Test
    @DisplayName(
            "GET /api/v1/me/job-recommendations: invalid limit (<=0 or >100) returns 400 VALIDATION_ERROR")
    void testValidationFailure() throws Exception {
        mockMvc.perform(get("/api/v1/me/job-recommendations?limit=0").with(user(CANDIDATE_ONE)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value(containsString("limit")));

        mockMvc.perform(get("/api/v1/me/job-recommendations?limit=101").with(user(CANDIDATE_ONE)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName(
            "A2: quota-degraded cache serves cached fallback without new BLOCKED rows and recomputes once quota resets")
    void testQuotaDegradedCacheServesFallbackAndRecoversAfterQuotaIncrease() throws Exception {
        jdbc.update("DELETE FROM ai_logs");
        jdbc.update("DELETE FROM ai_usage");
        jdbc.update("DELETE FROM ai_config");
        jdbc.update("DELETE FROM job_recommendations WHERE user_id = 3");
        aiConfigService.evictCache();

        UserPrincipal candidateThree =
                new UserPrincipal(3L, "candidate3@rikkeijobs.test", "CANDIDATE", null, false);
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                ADMIN_ONE, null, ADMIN_ONE.getAuthorities()));
        try {
            var initial = aiConfigService.get();
            aiConfigService.update(
                    new UpdateAiConfigRequest(
                            AiProvider.MOCK,
                            "mock",
                            new BigDecimal("0.30"),
                            150,
                            2,
                            true,
                            initial.version()),
                    ADMIN_ONE.getId());

            mockMvc.perform(
                            get("/api/v1/me/job-recommendations?limit=10")
                                    .with(user(candidateThree)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isCached").value(false))
                    .andExpect(jsonPath("$.items", hasSize(10)))
                    .andExpect(
                            jsonPath("$.message")
                                    .value(JobRecommendationService.QUOTA_REACHED_MESSAGE));
            assertEquals(
                    1,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM ai_logs WHERE user_id = 3 AND status = 'BLOCKED'",
                            Integer.class));

            // Subsequent view while still over quota hits degraded cache with 0 new BLOCKED rows.
            mockMvc.perform(
                            get("/api/v1/me/job-recommendations?limit=10")
                                    .with(user(candidateThree)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isCached").value(true))
                    .andExpect(
                            jsonPath("$.message")
                                    .value(JobRecommendationService.QUOTA_REACHED_MESSAGE));
            assertEquals(
                    1,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM ai_logs WHERE user_id = 3 AND status = 'BLOCKED'",
                            Integer.class));

            // Raising limit resets quota availability -> degraded cache is bypassed and refreshed.
            SecurityContextHolder.getContext()
                    .setAuthentication(
                            new UsernamePasswordAuthenticationToken(
                                    ADMIN_ONE, null, ADMIN_ONE.getAuthorities()));
            var current = aiConfigService.get();
            aiConfigService.update(
                    new UpdateAiConfigRequest(
                            AiProvider.MOCK,
                            "mock",
                            new BigDecimal("0.30"),
                            150,
                            100,
                            true,
                            current.version()),
                    ADMIN_ONE.getId());

            mockMvc.perform(
                            get("/api/v1/me/job-recommendations?limit=10")
                                    .with(user(candidateThree)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isCached").value(false))
                    .andExpect(jsonPath("$.message").doesNotExist());
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM job_recommendations WHERE user_id = 3 AND quota_degraded = true",
                            Integer.class));
        } finally {
            SecurityContextHolder.clearContext();
            jdbc.update("DELETE FROM ai_logs");
            jdbc.update("DELETE FROM ai_usage");
            jdbc.update("DELETE FROM ai_config");
            jdbc.update("DELETE FROM job_recommendations WHERE user_id = 3");
            aiConfigService.evictCache();
        }
    }
}
