package com.rikkei.jobs.candidate;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
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
@DisplayName("HS-01 Skill Profile API (dev seed)")
class SkillProfileIntegrationTest {

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

    private MockMvc mockMvc;

    private static final String PASSWORD = "Test@123";

    private static RequestPostProcessor candidate(int n) {
        return httpBasic("candidate" + n + "@rikkeijobs.test", PASSWORD);
    }

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    @DisplayName("candidate1 sees at least 5 skills and every verified skill lists source and date")
    void candidateSeesSkillsWithEvidences() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/me/skills").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$[?(@.skill.code == 'JAVA')].verifiedScore").value(79.07))
                .andExpect(jsonPath("$[?(@.skill.code == 'JAVA')].level").value("ADVANCED"))
                .andExpect(
                        jsonPath("$[?(@.skill.code == 'JAVA')].evidences[?(@.verified == true)]")
                                .isNotEmpty())
                .andExpect(jsonPath("$[*].evidences[*].source").isNotEmpty())
                .andExpect(jsonPath("$[*].evidences[*].recordedAt").isNotEmpty())
                .andExpect(jsonPath("$[*].skill.group").isNotEmpty());
    }

    @Test
    @DisplayName("Self-declared-only skill has no verified score and no level")
    void selfOnlySkill() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/me/skills").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$[?(@.skill.code == 'COMMUNICATION')].verifiedScore")
                                .value(hasItem(nullValue())))
                .andExpect(jsonPath("$[?(@.skill.code == 'COMMUNICATION')].selfScore").value(70.0))
                .andExpect(
                        jsonPath("$[?(@.skill.code == 'COMMUNICATION')].level")
                                .value(hasItem(nullValue())))
                .andExpect(
                        jsonPath("$[?(@.skill.code == 'COMMUNICATION')].evidences[0].verified")
                                .value(false));
    }

    @Test
    @DisplayName("Unauthenticated request is rejected with 401")
    void unauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/me/skills"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Another user gets 404 for a non-public profile (candidate1)")
    void privateProfileIsNotFoundForOthers() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/1/skills").with(candidate(2)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("Unknown user id returns the same 404 as a private profile")
    void unknownUser() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/99999/skills").with(candidate(1)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Owner can read own profile by id and others can read a public profile")
    void ownerAndPublicAccess() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/1/skills").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(hasSize(0))));
        mockMvc.perform(get("/api/v1/profiles/2/skills").with(candidate(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.skill.code == 'REACTJS')]").isNotEmpty());
    }

    @Test
    @DisplayName("Adding a course result and recomputing changes JAVA to the hand-calculated 84.21")
    void recomputeChangesScore() throws Exception {
        jdbcTemplate.update(
                "INSERT INTO external_records (user_id, source, source_code, title, score,"
                        + " recorded_at) VALUES (1, 'LMS', 'JAVA01', 'Lập trình Java (bổ sung)',"
                        + " 100, NOW() - INTERVAL '1 day')");
        try {
            // numerator = 170 + 100*0.7 = 240; denominator = 2.15 + 0.7 = 2.85; 240/2.85 = 84.21
            mockMvc.perform(post("/api/v1/profiles/me/skills/recompute").with(candidate(1)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.skill.code == 'JAVA')].verifiedScore").value(84.21))
                    .andExpect(jsonPath("$[?(@.skill.code == 'JAVA')].level").value("ADVANCED"));
        } finally {
            jdbcTemplate.update(
                    "DELETE FROM external_records WHERE user_id = 1 AND title = 'Lập trình Java"
                            + " (bổ sung)'");
            mockMvc.perform(post("/api/v1/profiles/me/skills/recompute").with(candidate(1)))
                    .andExpect(jsonPath("$[?(@.skill.code == 'JAVA')].verifiedScore").value(79.07));
        }
    }

    @Test
    @DisplayName("Course-to-skill mapping is data: a new mapping row creates a new skill")
    void mappingLivesInTable() throws Exception {
        jdbcTemplate.update(
                "INSERT INTO skill_mappings (source, source_code, skill_id, weight) SELECT 'LMS',"
                        + " 'DOCKER01', id, 1.0 FROM skills WHERE code = 'DOCKER'");
        jdbcTemplate.update(
                "INSERT INTO external_records (user_id, source, source_code, title, score,"
                        + " recorded_at) VALUES (1, 'LMS', 'DOCKER01', 'Docker căn bản', 60, NOW()"
                        + " - INTERVAL '2 days')");
        try {
            mockMvc.perform(post("/api/v1/profiles/me/skills/recompute").with(candidate(1)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.skill.code == 'DOCKER')].verifiedScore").value(60.0))
                    .andExpect(
                            jsonPath("$[?(@.skill.code == 'DOCKER')].level").value("INTERMEDIATE"));
        } finally {
            jdbcTemplate.update("DELETE FROM external_records WHERE source_code = 'DOCKER01'");
            jdbcTemplate.update("DELETE FROM skill_mappings WHERE source_code = 'DOCKER01'");
            mockMvc.perform(post("/api/v1/profiles/me/skills/recompute").with(candidate(1)))
                    .andExpect(jsonPath("$[?(@.skill.code == 'DOCKER')]").isEmpty());
        }
    }
}
