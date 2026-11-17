package com.rikkei.jobs.assessment.security;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.assessment.dto.request.UpdateEvaluationRequest;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import java.util.List;
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
@DisplayName("Evaluation Security & IDOR Protection Integration Tests")
public class EvaluationSecurityIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("jwt.secret", () -> "evaluation-security-test-secret-min-32-chars-long!");
    }

    @Autowired private WebApplicationContext context;

    @Autowired private UserRepository userRepository;

    @Autowired private RoleRepository roleRepository;

    @Autowired private JwtService jwtService;

    @Autowired private ObjectMapper objectMapper;

    @Autowired private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    private User mentor1;
    private User mentor2;
    private User candidate1;
    private User candidate2;
    private User hr;

    private RequestPostProcessor asUser(User user) {
        String token = jwtService.generateToken(user);
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();

        mentor1 = userRepository.findByEmail("mentor1@rikkeijobs.test").orElseThrow();
        candidate1 = userRepository.findByEmail("candidate1@rikkeijobs.test").orElseThrow();
        candidate2 = userRepository.findByEmail("candidate2@rikkeijobs.test").orElseThrow();
        // hr2 has must_change_password = false (hr1 has must_change_password = true)
        hr = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();

        // Ensure mentor2 exists in test db for IDOR tests
        mentor2 =
                userRepository
                        .findByEmail("mentor2@rikkeijobs.test")
                        .orElseGet(
                                () -> {
                                    Role mentorRole =
                                            roleRepository.findByName(Role.MENTOR).orElseThrow();
                                    User m2 = new User();
                                    m2.setEmail("mentor2@rikkeijobs.test");
                                    m2.setPasswordHash(mentor1.getPasswordHash());
                                    m2.setFullName("Mentor Hai");
                                    m2.setRole(mentorRole);
                                    return userRepository.save(m2);
                                });
    }

    // =========================================================================
    // 1. Anonymous Access Tests (Must return 401 UNAUTHORIZED)
    // =========================================================================

    @Test
    @DisplayName("Anonymous access to POST /api/v1/evaluations returns 401 UNAUTHORIZED")
    void testAnonymousPostEvaluations() throws Exception {
        mockMvc.perform(
                        post("/api/v1/evaluations")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Anonymous access to PUT /api/v1/evaluations/{id} returns 401 UNAUTHORIZED")
    void testAnonymousPutEvaluation() throws Exception {
        mockMvc.perform(
                        put("/api/v1/evaluations/1")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName(
            "Anonymous access to POST /api/v1/evaluations/{id}/submit returns 401 UNAUTHORIZED")
    void testAnonymousSubmitEvaluation() throws Exception {
        mockMvc.perform(post("/api/v1/evaluations/1/submit"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Anonymous access to GET /api/v1/evaluation-templates returns 401 UNAUTHORIZED")
    void testAnonymousGetTemplates() throws Exception {
        mockMvc.perform(get("/api/v1/evaluation-templates"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName(
            "Anonymous access to GET /api/v1/profiles/{userId}/evaluations returns 401 UNAUTHORIZED")
    void testAnonymousGetProfileEvaluations() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/1/evaluations"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    // =========================================================================
    // 2. Role-Based Access Control (RBAC) Tests (Must return 403 FORBIDDEN)
    // =========================================================================

    @Test
    @DisplayName("CANDIDATE accessing POST /api/v1/evaluations returns 403 FORBIDDEN")
    void testCandidatePostEvaluationsForbidden() throws Exception {
        mockMvc.perform(
                        post("/api/v1/evaluations")
                                .with(asUser(candidate1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("CANDIDATE accessing PUT /api/v1/evaluations/{id} returns 403 FORBIDDEN")
    void testCandidatePutEvaluationForbidden() throws Exception {
        mockMvc.perform(
                        put("/api/v1/evaluations/1")
                                .with(asUser(candidate1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("CANDIDATE accessing POST /api/v1/evaluations/{id}/submit returns 403 FORBIDDEN")
    void testCandidateSubmitEvaluationForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/evaluations/1/submit").with(asUser(candidate1)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("CANDIDATE accessing GET /api/v1/evaluation-templates returns 403 FORBIDDEN")
    void testCandidateGetTemplatesForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/evaluation-templates").with(asUser(candidate1)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("MENTOR accessing GET /api/v1/profiles/{userId}/evaluations returns 403 FORBIDDEN")
    void testMentorGetProfileEvaluationsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/1/evaluations").with(asUser(mentor1)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("HR accessing POST /api/v1/evaluations returns 403 FORBIDDEN")
    void testHrPostEvaluationsForbidden() throws Exception {
        mockMvc.perform(
                        post("/api/v1/evaluations")
                                .with(asUser(hr))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("HR accessing GET /api/v1/evaluation-templates returns 403 FORBIDDEN")
    void testHrGetTemplatesForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/evaluation-templates").with(asUser(hr)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("MENTOR can access GET /api/v1/evaluation-templates and gets 200 OK")
    void testMentorCanGetTemplates() throws Exception {
        mockMvc.perform(get("/api/v1/evaluation-templates").with(asUser(mentor1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    // =========================================================================
    // 3. IDOR & Business Protection Tests (Must return 404 NOT_FOUND)
    // =========================================================================

    @Test
    @DisplayName("IDOR Protection: Mentor2 updating Mentor1's evaluation returns 404 NOT_FOUND")
    void testIdorMentorCannotUpdateOthersEvaluation() throws Exception {
        Long evalId =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM evaluations WHERE mentor_id = ? AND status = 'DRAFT' LIMIT 1",
                        Long.class,
                        mentor1.getId());
        assertNotNull(evalId, "Draft evaluation for mentor 1 must exist");

        UpdateEvaluationRequest request =
                new UpdateEvaluationRequest("Đang sửa trái phép", List.of());

        mockMvc.perform(
                        put("/api/v1/evaluations/" + evalId)
                                .with(asUser(mentor2))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("IDOR Protection: Mentor2 submitting Mentor1's evaluation returns 404 NOT_FOUND")
    void testIdorMentorCannotSubmitOthersEvaluation() throws Exception {
        Long evalId =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM evaluations WHERE mentor_id = ? AND status = 'DRAFT' LIMIT 1",
                        Long.class,
                        mentor1.getId());
        assertNotNull(evalId, "Draft evaluation for mentor 1 must exist");

        mockMvc.perform(post("/api/v1/evaluations/" + evalId + "/submit").with(asUser(mentor2)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName(
            "IDOR Protection: Candidate1 viewing Candidate2's profile evaluations returns 404 NOT_FOUND")
    void testIdorCandidateCannotViewOtherCandidateEvaluations() throws Exception {
        // Candidate 1 trying to access candidate 2's evaluations
        mockMvc.perform(
                        get("/api/v1/profiles/" + candidate2.getId() + "/evaluations")
                                .with(asUser(candidate1)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("Candidate1 can view own profile evaluations even when private")
    void testCandidateCanViewOwnEvaluations() throws Exception {
        // Candidate 1's profile is private (is_public = false), but can see own
        mockMvc.perform(
                        get("/api/v1/profiles/" + candidate1.getId() + "/evaluations")
                                .with(asUser(candidate1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(candidate1.getId()));
    }

    @Test
    @DisplayName(
            "IDOR Protection: HR viewing private candidate profile evaluations returns 404 NOT_FOUND")
    void testIdorHrCannotViewPrivateProfileEvaluations() throws Exception {
        // Candidate 1 has is_public = false
        mockMvc.perform(
                        get("/api/v1/profiles/" + candidate1.getId() + "/evaluations")
                                .with(asUser(hr)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("HR can view public candidate profile evaluations and gets 200 OK")
    void testHrCanViewPublicProfileEvaluations() throws Exception {
        // Candidate 2 has is_public = true
        mockMvc.perform(
                        get("/api/v1/profiles/" + candidate2.getId() + "/evaluations")
                                .with(asUser(hr)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(candidate2.getId()))
                .andExpect(jsonPath("$.evaluations", hasSize(1)));
    }

    @Test
    @DisplayName("HR viewing non-existent candidate profile returns 404 NOT_FOUND")
    void testHrViewingNonExistentCandidate() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/999999/evaluations").with(asUser(hr)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
