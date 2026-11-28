package com.rikkei.jobs.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.sync.on-open-enabled=false", "app.sync.nightly-cron=-"})
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("B4 5-Role RBAC Permission Matrix, Ownership & Clock Expiry Integration Tests")
class RbacPermissionMatrixIntegrationTest {

    private static final Instant BASE_INSTANT = Instant.parse("2026-11-19T05:00:00Z");
    private static final AtomicLong TAX_SEQ = new AtomicLong(8000000000L);

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @TestConfiguration
    static class MutableClockConfig {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(BASE_INSTANT, ZoneOffset.UTC);
        }
    }

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private Clock clock;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        jdbcTemplate.update(
                "INSERT INTO candidate_targets (user_id, position_id, chosen_at) VALUES (1, 1, NOW())"
                        + " ON CONFLICT (user_id) DO UPDATE SET position_id = 1, job_id = NULL");
    }

    @AfterEach
    void tearDown() {
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        jdbcTemplate.update("DELETE FROM gap_results WHERE user_id = 1");
        jdbcTemplate.update("DELETE FROM candidate_targets WHERE user_id = 1");
    }

    private RequestPostProcessor asEmail(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        String token = jwtService.generateToken(user);
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    record RoleAccessCase(
            String roleEmail,
            HttpMethod method,
            String path,
            String body,
            int expectedStatus,
            String expectedErrorCode) {}

    static Stream<Arguments> roleAccessCases() {
        return Stream.of(
                        // CANDIDATE allowed
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/auth/me",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/me/skills",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/profiles/me/skills/recompute",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/1/skills",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/1/evaluations",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.PUT,
                                "/api/v1/me/target",
                                "{\"positionId\":1}",
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/target",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/gap-analysis",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/job-recommendations",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/target-positions",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/jobs/1",
                                null,
                                200,
                                null),
                        // UT-01 CANDIDATE allowed
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/jobs/7/apply",
                                "{\"cvId\":1,\"coverLetter\":\"UT-01 RBAC check\"}",
                                503,
                                "CV_SERVICE_UNAVAILABLE"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications/1",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/me/applications/4/withdraw",
                                "{\"reason\":\"RBAC test at OFFER\"}",
                                409,
                                "CANNOT_WITHDRAW"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications/1/cv-snapshot",
                                null,
                                200,
                                null),
                        // CANDIDATE blocked
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),
                        // UT-02 + Option 1A + Option 2A blocked for CANDIDATE
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/applications/1/transition",
                                "{\"toStatus\":\"SCREENING\",\"note\":\"Blocked\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/applications/2/rounds",
                                "{\"name\":\"Blocked\",\"interviewerEmail\":\"a@b.com\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.PUT,
                                "/api/v1/applications/3/rounds/1",
                                "{\"result\":\"PASS\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/staff/applications",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/me",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/staff/companies",
                                "{\"name\":\"Blocked\",\"taxCode\":\"9999999999\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/evaluation-templates",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "candidate1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/evaluations",
                                "{}",
                                403,
                                "FORBIDDEN"),

                        // HR allowed
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/auth/me",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/me",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/2",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/2/skills",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/2/evaluations",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/target-positions",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/jobs/1",
                                null,
                                200,
                                null),
                        // UT-01 HR read-only allowed
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications/1",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications/1/cv-snapshot",
                                null,
                                200,
                                null),
                        // UT-02 + Option 1A + Option 2A HR allowed (own company 2)
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/applications/1",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/applications/1/cv-snapshot",
                                null,
                                200,
                                null),
                        // HR blocked from staff applications
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/staff/applications",
                                null,
                                403,
                                "FORBIDDEN"),
                        // HR blocked
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/jobs/7/apply",
                                "{\"cvId\":1}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/me/applications/1/withdraw",
                                "{\"reason\":\"Blocked\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/staff/companies",
                                "{\"name\":\"Blocked\",\"taxCode\":\"9999999999\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/evaluation-templates",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/me/skills",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/target",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/gap-analysis",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "hr2@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/job-recommendations",
                                null,
                                403,
                                "FORBIDDEN"),

                        // MENTOR allowed
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/auth/me",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/evaluation-templates",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/target-positions",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/jobs/1",
                                null,
                                200,
                                null),
                        // MENTOR blocked
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/me",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/staff/companies",
                                "{\"name\":\"Blocked\",\"taxCode\":\"9999999999\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/me/skills",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/2/skills",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/2/evaluations",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/target",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/job-recommendations",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/jobs/7/apply",
                                "{\"cvId\":1}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/me/applications/1/withdraw",
                                "{\"reason\":\"Blocked\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),
                        // UT-02 + Option 1A + Option 2A blocked for MENTOR
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/applications/1/transition",
                                "{\"toStatus\":\"SCREENING\",\"note\":\"Blocked\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/applications/2/rounds",
                                "{\"name\":\"Blocked\",\"interviewerEmail\":\"a@b.com\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.PUT,
                                "/api/v1/applications/3/rounds/1",
                                "{\"result\":\"PASS\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "mentor1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/staff/applications",
                                null,
                                403,
                                "FORBIDDEN"),

                        // STAFF allowed
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/auth/me",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/1",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/2",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/staff/companies",
                                "DYNAMIC_COMPANY",
                                201,
                                null),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/target-positions",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/jobs/1",
                                null,
                                200,
                                null),
                        // UT-02 + Option 2A STAFF read-only allowed
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/staff/applications",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/applications/1",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/applications/1/cv-snapshot",
                                null,
                                200,
                                null),
                        // STAFF blocked from HR routes & mutations
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/applications/1/transition",
                                "{\"toStatus\":\"SCREENING\",\"note\":\"Blocked\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/applications/2/rounds",
                                "{\"name\":\"Blocked\",\"interviewerEmail\":\"a@b.com\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.PUT,
                                "/api/v1/applications/3/rounds/1",
                                "{\"result\":\"PASS\"}",
                                403,
                                "FORBIDDEN"),
                        // STAFF blocked
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/me",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.PUT,
                                "/api/v1/companies/me",
                                "{\"name\":\"Blocked\",\"version\":0}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/evaluation-templates",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/me/skills",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/2/skills",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/2/evaluations",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/target",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/job-recommendations",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/jobs/7/apply",
                                "{\"cvId\":1}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/me/applications/1/withdraw",
                                "{\"reason\":\"Blocked\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "staff1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),

                        // ADMIN allowed
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/auth/me",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/target-positions",
                                null,
                                200,
                                null),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/jobs/1",
                                null,
                                200,
                                null),
                        // ADMIN blocked
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/me",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/companies/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/staff/companies",
                                "{\"name\":\"Blocked\",\"taxCode\":\"9999999999\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/evaluation-templates",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/me/skills",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/2/skills",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/profiles/2/evaluations",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/target",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/job-recommendations",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/jobs/7/apply",
                                "{\"cvId\":1}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/me/applications/1/withdraw",
                                "{\"reason\":\"Blocked\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/me/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs/2/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),
                        // UT-02 + Option 1A + Option 2A blocked for ADMIN
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/hr/jobs",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/applications/1",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/applications/1/cv-snapshot",
                                null,
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/applications/1/transition",
                                "{\"toStatus\":\"SCREENING\",\"note\":\"Blocked\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.POST,
                                "/api/v1/applications/2/rounds",
                                "{\"name\":\"Blocked\",\"interviewerEmail\":\"a@b.com\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.PUT,
                                "/api/v1/applications/3/rounds/1",
                                "{\"result\":\"PASS\"}",
                                403,
                                "FORBIDDEN"),
                        new RoleAccessCase(
                                "admin1@rikkeijobs.test",
                                HttpMethod.GET,
                                "/api/v1/staff/applications",
                                null,
                                403,
                                "FORBIDDEN"))
                .map(Arguments::of);
    }

    @ParameterizedTest(name = "{0} -> {1} {2} => {4}")
    @MethodSource("roleAccessCases")
    @DisplayName("Data-driven 5-role RBAC permission matrix enforces allowed and blocked cases")
    void shouldEnforceFiveRoleMatrix(RoleAccessCase testCase) throws Exception {
        MockHttpServletRequestBuilder req =
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(
                                testCase.method(), testCase.path())
                        .with(asEmail(testCase.roleEmail()));

        if (testCase.body() != null) {
            String payload =
                    "DYNAMIC_COMPANY".equals(testCase.body())
                            ? "{\"name\":\"RBAC Matrix Co\",\"taxCode\":\""
                                    + TAX_SEQ.incrementAndGet()
                                    + "\"}"
                            : testCase.body();
            req.contentType(MediaType.APPLICATION_JSON).content(payload);
        }

        var actions = mockMvc.perform(req).andExpect(status().is(testCase.expectedStatus()));
        if (testCase.expectedErrorCode() != null) {
            actions.andExpect(jsonPath("$.code").value(testCase.expectedErrorCode()));
        }
    }

    static Stream<Arguments> protectedEndpoints() {
        return Stream.of(
                Arguments.of(HttpMethod.GET, "/api/v1/auth/me"),
                Arguments.of(HttpMethod.POST, "/api/v1/auth/change-password"),
                Arguments.of(HttpMethod.GET, "/api/v1/profiles/me/skills"),
                Arguments.of(HttpMethod.POST, "/api/v1/profiles/me/skills/recompute"),
                Arguments.of(HttpMethod.GET, "/api/v1/profiles/1/skills"),
                Arguments.of(HttpMethod.GET, "/api/v1/profiles/1/evaluations"),
                Arguments.of(HttpMethod.PUT, "/api/v1/me/target"),
                Arguments.of(HttpMethod.GET, "/api/v1/me/target"),
                Arguments.of(HttpMethod.GET, "/api/v1/me/gap-analysis"),
                Arguments.of(HttpMethod.GET, "/api/v1/me/job-recommendations"),
                Arguments.of(HttpMethod.GET, "/api/v1/target-positions"),
                Arguments.of(HttpMethod.GET, "/api/v1/jobs/1"),
                Arguments.of(HttpMethod.GET, "/api/v1/companies/me"),
                Arguments.of(HttpMethod.PUT, "/api/v1/companies/me"),
                Arguments.of(HttpMethod.POST, "/api/v1/companies/me/logo"),
                Arguments.of(HttpMethod.GET, "/api/v1/companies/1"),
                Arguments.of(HttpMethod.POST, "/api/v1/staff/companies"),
                Arguments.of(HttpMethod.POST, "/api/v1/staff/companies/1/hr-accounts"),
                Arguments.of(HttpMethod.GET, "/api/v1/evaluation-templates"),
                Arguments.of(HttpMethod.POST, "/api/v1/evaluations"),
                Arguments.of(HttpMethod.PUT, "/api/v1/evaluations/1"),
                Arguments.of(HttpMethod.POST, "/api/v1/evaluations/1/submit"),
                Arguments.of(HttpMethod.POST, "/api/v1/jobs/7/apply"),
                Arguments.of(HttpMethod.GET, "/api/v1/me/applications"),
                Arguments.of(HttpMethod.GET, "/api/v1/me/applications/1"),
                Arguments.of(HttpMethod.POST, "/api/v1/me/applications/1/withdraw"),
                Arguments.of(HttpMethod.GET, "/api/v1/me/applications/1/cv-snapshot"),
                Arguments.of(HttpMethod.GET, "/api/v1/hr/jobs"),
                Arguments.of(HttpMethod.GET, "/api/v1/hr/jobs/2/applications"),
                Arguments.of(HttpMethod.GET, "/api/v1/hr/jobs/2/applications/1"),
                Arguments.of(HttpMethod.GET, "/api/v1/hr/jobs/2/applications/1/cv-snapshot"),
                Arguments.of(HttpMethod.GET, "/api/v1/applications/1"),
                Arguments.of(HttpMethod.GET, "/api/v1/applications/1/cv-snapshot"),
                Arguments.of(HttpMethod.POST, "/api/v1/applications/1/transition"),
                Arguments.of(HttpMethod.POST, "/api/v1/applications/2/rounds"),
                Arguments.of(HttpMethod.PUT, "/api/v1/applications/3/rounds/1"),
                Arguments.of(HttpMethod.GET, "/api/v1/staff/applications"),
                Arguments.of(HttpMethod.GET, "/api/v1/unknown-deny-all-route"));
    }

    @ParameterizedTest(name = "Anonymous {0} {1} => 401 UNAUTHORIZED")
    @MethodSource("protectedEndpoints")
    @DisplayName("Anonymous callers receive 401 UNAUTHORIZED across all protected endpoints")
    void shouldRejectAnonymousWith401(HttpMethod method, String path) throws Exception {
        mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(
                                method, path))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName(
            "Cross-company 404 for hr1 (after temp password change) & hr2 matches missing 999999 body identically; hr null -> 404; staff -> 200/404")
    void shouldEnforceCompanyOwnershipWithIdentical404Body() throws Exception {
        String missingCompanyBody =
                mockMvc.perform(
                                get("/api/v1/companies/999999")
                                        .with(asEmail("hr2@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();

        // hr2 -> own company 2 (200), company 1 (identical 404)
        mockMvc.perform(get("/api/v1/companies/2").with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2));
        String hr2CrossBody =
                mockMvc.perform(get("/api/v1/companies/1").with(asEmail("hr2@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertEquals(missingCompanyBody, hr2CrossBody);

        // hr1 -> temporarily change password via /auth/change-password + /auth/login, verify
        // company 1 (200) and company 2 (identical 404), then restore in finally.
        User hr1 = userRepository.findByEmail("hr1@rikkeijobs.test").orElseThrow();
        String originalHash = hr1.getPasswordHash();
        boolean originalMustChange = hr1.isMustChangePassword();
        try {
            mockMvc.perform(
                            post("/api/v1/auth/change-password")
                                    .with(asEmail("hr1@rikkeijobs.test"))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"oldPassword\":\"Test@123\",\"newPassword\":\"RbacTemp@123\"}"))
                    .andExpect(status().isOk());

            MvcResult loginResult =
                    mockMvc.perform(
                                    post("/api/v1/auth/login")
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    "{\"email\":\"hr1@rikkeijobs.test\",\"password\":\"RbacTemp@123\"}"))
                            .andExpect(status().isOk())
                            .andExpect(jsonPath("$.mustChangePassword").value(false))
                            .andReturn();

            String freshToken =
                    com.fasterxml.jackson.databind.json.JsonMapper.builder()
                            .build()
                            .readTree(loginResult.getResponse().getContentAsString())
                            .path("accessToken")
                            .asText();

            mockMvc.perform(
                            get("/api/v1/companies/1")
                                    .header("Authorization", "Bearer " + freshToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1));

            String hr1CrossBody =
                    mockMvc.perform(
                                    get("/api/v1/companies/2")
                                            .header("Authorization", "Bearer " + freshToken))
                            .andExpect(status().isNotFound())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            assertEquals(missingCompanyBody, hr1CrossBody);
        } finally {
            User hr1ToRestore = userRepository.findByEmail("hr1@rikkeijobs.test").orElseThrow();
            hr1ToRestore.setPasswordHash(originalHash);
            hr1ToRestore.setMustChangePassword(originalMustChange);
            userRepository.saveAndFlush(hr1ToRestore);
        }

        // HR with companyId = null -> identical 404
        OffsetDateTime now = OffsetDateTime.now(clock);
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User unassignedHr =
                new User(
                        "rbac-unassigned-hr-" + UUID.randomUUID() + "@rikkeijobs.test",
                        originalHash,
                        "Unassigned HR",
                        null,
                        hrRole,
                        null);
        unassignedHr.setMustChangePassword(false);
        unassignedHr.setStatus(UserStatus.ACTIVE);
        unassignedHr.setCreatedAt(now);
        unassignedHr.setUpdatedAt(now);
        unassignedHr = userRepository.saveAndFlush(unassignedHr);
        try {
            String unassignedBody =
                    mockMvc.perform(
                                    get("/api/v1/companies/1")
                                            .header(
                                                    "Authorization",
                                                    "Bearer "
                                                            + jwtService.generateToken(
                                                                    unassignedHr)))
                            .andExpect(status().isNotFound())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            assertEquals(missingCompanyBody, unassignedBody);
        } finally {
            userRepository.delete(unassignedHr);
        }

        // STAFF -> reads both company 1 and company 2 (200) and missing 999999 (404)
        mockMvc.perform(get("/api/v1/companies/1").with(asEmail("staff1@rikkeijobs.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
        mockMvc.perform(get("/api/v1/companies/2").with(asEmail("staff1@rikkeijobs.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2));
        String staffMissingBody =
                mockMvc.perform(
                                get("/api/v1/companies/999999")
                                        .with(asEmail("staff1@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertEquals(missingCompanyBody, staffMissingBody);
    }

    @Test
    @DisplayName(
            "Cross-candidate 404 on /skills (even if is_public=true) & /evaluations; HR sees public only and 404 on own id")
    void shouldEnforceCrossCandidateAndHrProfileBoundaries() throws Exception {
        // candidate1 -> candidate2 (is_public=true) must be 404 on both /skills and /evaluations
        String missingSkillsBody =
                mockMvc.perform(
                                get("/api/v1/profiles/999999/skills")
                                        .with(asEmail("candidate1@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        String crossCandidateSkillsBody =
                mockMvc.perform(
                                get("/api/v1/profiles/2/skills")
                                        .with(asEmail("candidate1@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertEquals(missingSkillsBody, crossCandidateSkillsBody);

        String missingEvalBody =
                mockMvc.perform(
                                get("/api/v1/profiles/999999/evaluations")
                                        .with(asEmail("candidate1@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        String crossCandidateEvalBody =
                mockMvc.perform(
                                get("/api/v1/profiles/2/evaluations")
                                        .with(asEmail("candidate1@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertEquals(missingEvalBody, crossCandidateEvalBody);

        // hr2 -> public candidate 2 (200), private candidate 1 (404), hr2 own id (404)
        User hr2 = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();
        mockMvc.perform(get("/api/v1/profiles/2/skills").with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/profiles/1/skills").with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(
                        get("/api/v1/profiles/" + hr2.getId() + "/skills")
                                .with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(get("/api/v1/profiles/2/evaluations").with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/profiles/1/evaluations").with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(
                        get("/api/v1/profiles/" + hr2.getId() + "/evaluations")
                                .with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @ParameterizedTest(name = "GET /api/v1/jobs for {0}")
    @ValueSource(
            strings = {
                "candidate1@rikkeijobs.test",
                "hr2@rikkeijobs.test",
                "mentor1@rikkeijobs.test",
                "staff1@rikkeijobs.test",
                "admin1@rikkeijobs.test"
            })
    @DisplayName(
            "GET /api/v1/jobs/{jobId} allows all 5 roles on approved open JD (1) and returns 404 on draft (11), expired (12), missing (999999)")
    void shouldAllowAllFiveRolesOnOpenJobsAndHideDraftOrExpired(String email) throws Exception {
        mockMvc.perform(get("/api/v1/jobs/1").with(asEmail(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));

        for (int hiddenId : new int[] {11, 12, 999999}) {
            mockMvc.perform(get("/api/v1/jobs/" + hiddenId).with(asEmail(email)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        }
    }

    @Test
    @DisplayName(
            "hr1 (must_change_password=true) receives 403 MUST_CHANGE_PASSWORD before role checks, and MutableClock expires JWT cleanly")
    void shouldEnforceMustChangePasswordBeforeRolesAndExpireJwtViaMutableClock() throws Exception {
        for (String path :
                new String[] {
                    "/api/v1/me/target",
                    "/api/v1/profiles/me/skills",
                    "/api/v1/companies/1",
                    "/api/v1/jobs/1",
                    "/api/v1/target-positions",
                    "/api/v1/hr/jobs/2/applications"
                }) {
            mockMvc.perform(get(path).with(asEmail("hr1@rikkeijobs.test")))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));
        }

        mockMvc.perform(get("/api/v1/auth/me").with(asEmail("hr1@rikkeijobs.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        // Deterministic JWT expiry via MutableClock (no Thread.sleep)
        User candidate1 = userRepository.findByEmail("candidate1@rikkeijobs.test").orElseThrow();
        String token = jwtService.generateToken(candidate1);
        mockMvc.perform(
                        get("/api/v1/profiles/me/skills")
                                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        ((MutableClock) clock).fastForward(Duration.ofHours(8).plusMinutes(1));
        mockMvc.perform(
                        get("/api/v1/profiles/me/skills")
                                .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }
}
