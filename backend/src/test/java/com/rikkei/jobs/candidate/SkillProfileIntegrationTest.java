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

import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
@DisplayName("HS-01 Skill Profile API (dev seed - JWT Authentication)")
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
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private JwtService jwtService;
    @Autowired private Clock clock;

    @Value("${jwt.secret}")
    private String jwtSecret;

    private MockMvc mockMvc;

    private RequestPostProcessor candidate(int n) {
        User user =
                userRepository
                        .findByEmail("candidate" + n + "@rikkeijobs.test")
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "Candidate not found: candidate" + n));
        String token = jwtService.generateToken(user);
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    // =========================================================================
    // 1. HS-01 Preservation Scenarios (8 tests with genuine JWT Bearer token)
    // =========================================================================

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

    // =========================================================================
    // 2. Negative Tests Proving Complete HTTP Basic Removal & JWT Security (7 tests)
    // =========================================================================

    @Test
    @DisplayName("Basic auth is rejected with 401 on GET /api/v1/profiles/me/skills")
    void basicAuthIsRejectedOnMeSkills() throws Exception {
        mockMvc.perform(
                        get("/api/v1/profiles/me/skills")
                                .with(httpBasic("candidate1@rikkeijobs.test", "Test@123")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Basic auth is rejected with 401 on GET /api/v1/profiles/1/skills")
    void basicAuthIsRejectedOnSkillsOf() throws Exception {
        mockMvc.perform(
                        get("/api/v1/profiles/1/skills")
                                .with(httpBasic("candidate1@rikkeijobs.test", "Test@123")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Basic auth is rejected with 401 on POST /api/v1/profiles/me/skills/recompute")
    void basicAuthIsRejectedOnRecompute() throws Exception {
        mockMvc.perform(
                        post("/api/v1/profiles/me/skills/recompute")
                                .with(httpBasic("candidate1@rikkeijobs.test", "Test@123")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Locked user with Bearer token is rejected with 401 ACCOUNT_LOCKED")
    void lockedUserCannotReadSkills() throws Exception {
        Role role = roleRepository.findByName(Role.CANDIDATE).orElseThrow();
        User lockedUser =
                new User(
                        "locked_candidate@rikkeijobs.test",
                        "hash",
                        "Locked Candidate",
                        null,
                        role,
                        null);
        lockedUser.setStatus(UserStatus.LOCKED);
        lockedUser.setLockedUntil(OffsetDateTime.now(clock).plusMinutes(15));
        lockedUser = userRepository.save(lockedUser);

        String token = jwtService.generateToken(lockedUser);

        mockMvc.perform(
                        get("/api/v1/profiles/me/skills")
                                .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("User with must_change_password=true is rejected with 403 MUST_CHANGE_PASSWORD")
    void mustChangePasswordUserIsForbidden() throws Exception {
        Role role = roleRepository.findByName(Role.CANDIDATE).orElseThrow();
        User user =
                new User(
                        "must_change_candidate@rikkeijobs.test",
                        "hash",
                        "Must Change Candidate",
                        null,
                        role,
                        null);
        user.setMustChangePassword(true);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user);

        mockMvc.perform(
                        get("/api/v1/profiles/me/skills")
                                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"))
                .andExpect(
                        jsonPath("$.message")
                                .value("Tài khoản yêu cầu đổi mật khẩu trước khi tiếp tục"));
    }

    @Test
    @DisplayName("Tampered token signature is rejected with 401 UNAUTHORIZED")
    void tamperedTokenReturns401() throws Exception {
        User user = userRepository.findByEmail("candidate1@rikkeijobs.test").orElseThrow();
        String validToken = jwtService.generateToken(user);
        String tamperedToken = validToken.substring(0, validToken.length() - 4) + "XXXX";

        mockMvc.perform(
                        get("/api/v1/profiles/me/skills")
                                .header("Authorization", "Bearer " + tamperedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Expired token is rejected with 401 UNAUTHORIZED")
    void expiredTokenReturns401() throws Exception {
        User user = userRepository.findByEmail("candidate1@rikkeijobs.test").orElseThrow();
        // Generate token using a clock 10 hours in the past so it is already expired (validity is
        // 8h)
        JwtService pastJwtService =
                new JwtService(jwtSecret, Clock.offset(clock, Duration.ofHours(-10)));
        String expiredToken = pastJwtService.generateToken(user);

        mockMvc.perform(
                        get("/api/v1/profiles/me/skills")
                                .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }
}
