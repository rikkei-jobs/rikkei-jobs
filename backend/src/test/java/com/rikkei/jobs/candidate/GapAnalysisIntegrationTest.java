package com.rikkei.jobs.candidate;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rikkei.jobs.candidate.repository.TargetPositionRepository;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("DT-01 Skill Gap Analysis API (dev seed - JWT Authentication)")
class GapAnalysisIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private WebApplicationContext context;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private TargetPositionRepository targetPositionRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        jdbcTemplate.update("DELETE FROM candidate_targets WHERE user_id = 1");
        jdbcTemplate.update("DELETE FROM gap_results WHERE user_id = 1");
    }

    private RequestPostProcessor candidate(int n) {
        return bearer("candidate" + n + "@rikkeijobs.test");
    }

    private RequestPostProcessor bearer(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        String token = jwtService.generateToken(user);
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    private Long positionId(String code) {
        return targetPositionRepository.findByCode(code).orElseThrow().getId();
    }

    private void choosePosition(int candidateNumber, String code) throws Exception {
        mockMvc.perform(
                        put("/api/v1/me/target")
                                .with(candidate(candidateNumber))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"positionId\":" + positionId(code) + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("POSITION"))
                .andExpect(jsonPath("$.code").value(code));
    }

    // =========================================================================
    // 1. Target position catalogue
    // =========================================================================

    @Test
    @DisplayName("GET /target-positions returns the 4 seeded positions in name order")
    void targetPositionsAreListed() throws Exception {
        mockMvc.perform(get("/api/v1/target-positions").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(
                        jsonPath("$[?(@.code == 'JAVA_BACKEND_FRESHER')].name")
                                .value(hasItem("Java Backend Fresher")))
                .andExpect(jsonPath("$[?(@.code == 'FRONTEND_REACTJS_FRESHER')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.code == 'TESTER')].name").value(hasItem("Tester")))
                .andExpect(
                        jsonPath("$[?(@.code == 'FULLSTACK')].name").value(hasItem("Fullstack")));
    }

    @Test
    @DisplayName("GET /target-positions without a JWT returns 401 UNAUTHORIZED")
    void targetPositionsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/target-positions"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    // =========================================================================
    // 2. Position targets: choose, analyze, switch, persist
    // =========================================================================

    @Test
    @DisplayName("Position target returns exactly the missing skills with HIGH priority and 71%")
    void positionGapAnalysis() throws Exception {
        long position = positionId("JAVA_BACKEND_FRESHER");
        choosePosition(1, "JAVA_BACKEND_FRESHER");

        mockMvc.perform(get("/api/v1/me/gap-analysis").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.target.type").value("POSITION"))
                .andExpect(jsonPath("$.target.code").value("JAVA_BACKEND_FRESHER"))
                .andExpect(jsonPath("$.target.id").value(position))
                .andExpect(jsonPath("$.readiness").value(71))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].skillCode").value("CLEAN_CODE"))
                .andExpect(jsonPath("$.items[0].required").value(60.0))
                .andExpect(jsonPath("$.items[0].current").value(0.0))
                .andExpect(jsonPath("$.items[0].gap").value(60.0))
                .andExpect(jsonPath("$.items[0].priority").value("HIGH"))
                .andExpect(jsonPath("$.items[1].skillCode").value("DOCKER"))
                .andExpect(jsonPath("$.items[1].gap").value(60.0))
                .andExpect(jsonPath("$.items[1].priority").value("HIGH"))
                .andExpect(jsonPath("$.items[?(@.skillCode == 'JAVA')]").isEmpty())
                .andExpect(jsonPath("$.items[?(@.skillCode == 'SPRING_BOOT')]").isEmpty())
                .andExpect(jsonPath("$.items[?(@.skillCode == 'SQL')]").isEmpty());

        Integer persisted =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM gap_results WHERE user_id = 1 AND target_type ="
                                + " 'POSITION' AND target_id = ?",
                        Integer.class,
                        position);
        assertEquals(2, persisted, "Only the two deficits must be persisted");
        assertEquals(
                2,
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM gap_results WHERE user_id = 1 AND gap = 60.00",
                        Integer.class));
    }

    @Test
    @DisplayName("Switching the target position changes the gap result")
    void switchingTargetChangesResult() throws Exception {
        choosePosition(1, "JAVA_BACKEND_FRESHER");
        mockMvc.perform(get("/api/v1/me/gap-analysis").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].skillCode").value("CLEAN_CODE"));

        choosePosition(1, "FRONTEND_REACTJS_FRESHER");
        mockMvc.perform(get("/api/v1/me/gap-analysis").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.target.code").value("FRONTEND_REACTJS_FRESHER"))
                .andExpect(jsonPath("$.readiness").value(60))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].skillCode").value("REACTJS"))
                .andExpect(jsonPath("$.items[0].gap").value(70.0))
                .andExpect(jsonPath("$.items[0].priority").value("HIGH"))
                .andExpect(jsonPath("$.items[1].skillCode").value("JAVASCRIPT"))
                .andExpect(jsonPath("$.items[1].required").value(75.0))
                .andExpect(jsonPath("$.items[1].current").value(70.0))
                .andExpect(jsonPath("$.items[1].gap").value(5.0))
                .andExpect(jsonPath("$.items[1].priority").value("LOW"))
                .andExpect(jsonPath("$.items[?(@.skillCode == 'HTML_CSS')]").isEmpty());
    }

    @Test
    @DisplayName("A candidate without a target gets 404 for target and gap analysis")
    void missingTargetReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/me/target").with(candidate(3)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(get("/api/v1/me/gap-analysis").with(candidate(3)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    // =========================================================================
    // 3. JD targets: min_score from job_skills, ad-hoc override
    // =========================================================================

    @Test
    @DisplayName(
            "JD analysis uses job_skills min_score and ad-hoc jobId does not change the target")
    void jdAnalysisUsesJobSkillRequirements() throws Exception {
        choosePosition(1, "JAVA_BACKEND_FRESHER");

        mockMvc.perform(get("/api/v1/me/gap-analysis").param("jobId", "1").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.target.type").value("JOB"))
                .andExpect(jsonPath("$.target.id").value(1))
                .andExpect(
                        jsonPath("$.target.name")
                                .value("Kỹ sư Lập trình Java Backend (Junior/Middle)"))
                .andExpect(jsonPath("$.readiness").value(80))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].skillCode").value("DOCKER"))
                .andExpect(jsonPath("$.items[0].required").value(60.0))
                .andExpect(jsonPath("$.items[0].gap").value(60.0))
                .andExpect(jsonPath("$.items[0].priority").value("MEDIUM"))
                .andExpect(jsonPath("$.items[?(@.skillCode == 'REST_API')]").isEmpty())
                .andExpect(jsonPath("$.items[?(@.skillCode == 'JAVA')]").isEmpty());

        mockMvc.perform(get("/api/v1/me/target").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("POSITION"))
                .andExpect(jsonPath("$.code").value("JAVA_BACKEND_FRESHER"));

        assertEquals(
                1,
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM gap_results WHERE user_id = 1 AND target_type = 'JOB'"
                                + " AND target_id = 1",
                        Integer.class));
    }

    @Test
    @DisplayName("JD 3 uses its own JAVA min_score of 80, yielding the 0.93 fractional gap LOW")
    void jdMinScoreComesFromTheSelectedJob() throws Exception {
        mockMvc.perform(get("/api/v1/me/gap-analysis").param("jobId", "3").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.target.id").value(3))
                .andExpect(jsonPath("$.readiness").value(75))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].skillCode").value("JAVA"))
                .andExpect(jsonPath("$.items[0].required").value(80.0))
                .andExpect(jsonPath("$.items[0].current").value(79.07))
                .andExpect(jsonPath("$.items[0].gap").value(0.93))
                .andExpect(jsonPath("$.items[0].priority").value("LOW"));
    }

    @Test
    @DisplayName("JD 8 mixes a mandatory HIGH deficit and an optional MEDIUM deficit")
    void jdPriorityForMandatoryAndOptionalSkills() throws Exception {
        mockMvc.perform(get("/api/v1/me/gap-analysis").param("jobId", "8").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readiness").value(50))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].skillCode").value("TESTING"))
                .andExpect(jsonPath("$.items[0].gap").value(75.0))
                .andExpect(jsonPath("$.items[0].priority").value("HIGH"))
                .andExpect(jsonPath("$.items[1].skillCode").value("COMMUNICATION"))
                .andExpect(jsonPath("$.items[1].gap").value(65.0))
                .andExpect(jsonPath("$.items[1].priority").value("MEDIUM"));
    }

    @Test
    @DisplayName("Saving a JD as target is used by the next gap analysis")
    void savedJobTargetIsAnalyzed() throws Exception {
        mockMvc.perform(
                        put("/api/v1/me/target")
                                .with(candidate(1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"jobId\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("JOB"))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.code").value(nullValue()));

        mockMvc.perform(get("/api/v1/me/gap-analysis").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.target.type").value("JOB"))
                .andExpect(jsonPath("$.items[0].skillCode").value("DOCKER"))
                .andExpect(jsonPath("$.items[0].priority").value("MEDIUM"));
    }

    // =========================================================================
    // 4. Job detail endpoint
    // =========================================================================

    @Test
    @DisplayName("GET /jobs/{id} returns the JD body and skill requirements")
    void jobDetailIsReturned() throws Exception {
        mockMvc.perform(get("/api/v1/jobs/1").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(
                        jsonPath("$.title").value("Kỹ sư Lập trình Java Backend (Junior/Middle)"))
                .andExpect(jsonPath("$.companyName").value("Rikkeisoft"))
                .andExpect(jsonPath("$.description").isNotEmpty())
                .andExpect(jsonPath("$.requiredSkills", hasSize(5)))
                .andExpect(
                        jsonPath("$.requiredSkills[?(@.skillCode == 'DOCKER')].requiredLevel")
                                .value(hasItem(60)))
                .andExpect(
                        jsonPath("$.requiredSkills[?(@.skillCode == 'DOCKER')].mandatory")
                                .value(hasItem(false)));
    }

    @Test
    @DisplayName("Draft, expired and unknown JDs return 404 NOT_FOUND")
    void unpublishedJobsAreNotFound() throws Exception {
        for (int jobId : new int[] {11, 12, 999999}) {
            mockMvc.perform(get("/api/v1/jobs/" + jobId).with(candidate(1)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        }
    }

    // =========================================================================
    // 5. Validation and security
    // =========================================================================

    @Test
    @DisplayName("PUT /target rejects both ids, no id, unknown position, draft and expired job")
    void chooseTargetValidation() throws Exception {
        mockMvc.perform(
                        put("/api/v1/me/target")
                                .with(candidate(1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"positionId\":1,\"jobId\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(
                        put("/api/v1/me/target")
                                .with(candidate(1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(
                        put("/api/v1/me/target")
                                .with(candidate(1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"positionId\":999999}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(
                        put("/api/v1/me/target")
                                .with(candidate(1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"jobId\":11}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        put("/api/v1/me/target")
                                .with(candidate(1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"jobId\":12}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("An invalid jobId query param returns 400 VALIDATION_ERROR")
    void invalidJobIdQueryParam() throws Exception {
        mockMvc.perform(get("/api/v1/me/gap-analysis").param("jobId", "0").with(candidate(1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("All DT-01 endpoints require authentication")
    void endpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/me/target"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mockMvc.perform(get("/api/v1/me/gap-analysis"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mockMvc.perform(get("/api/v1/jobs/1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("A user forced to change password is blocked with 403 MUST_CHANGE_PASSWORD")
    void mustChangePasswordIsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/me/target").with(bearer("hr1@rikkeijobs.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));
    }
}
