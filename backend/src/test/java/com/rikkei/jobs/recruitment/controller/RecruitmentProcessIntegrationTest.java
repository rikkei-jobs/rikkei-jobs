package com.rikkei.jobs.recruitment.controller;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import com.rikkei.jobs.recruitment.dto.StaffApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.service.RecruitmentProcessService;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import jakarta.persistence.EntityManagerFactory;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName(
        "UT-02 Recruitment Process, Option 1A, Option 2A, Concurrency & Anti-N+1 Integration Tests")
class RecruitmentProcessIntegrationTest {

    private static final Instant BASE_INSTANT = Instant.parse("2026-11-20T08:00:00Z");
    private static final byte[] SAMPLE_PDF =
            ("%PDF-1.4\n1 0 obj\n<< /Title (UT02 CV) >>\nendobj\n%%EOF\n")
                    .getBytes(StandardCharsets.UTF_8);
    private static final String SAMPLE_SHA256 =
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(BASE_INSTANT, ZoneOffset.UTC);
        }
    }

    @MockitoBean private JavaMailSender javaMailSender;

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManagerFactory entityManagerFactory;
    @Autowired private RecruitmentProcessService recruitmentProcessService;
    @Autowired private Clock clock;

    private MockMvc mockMvc;
    private User activeHrCo1;
    private Logger recruitmentLogger;
    private ListAppender<ILoggingEvent> listAppender;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        reset(javaMailSender);
        when(javaMailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));

        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        OffsetDateTime now = OffsetDateTime.ofInstant(BASE_INSTANT, ZoneOffset.UTC);
        activeHrCo1 =
                new User(
                        "ut02-hr-co1-" + UUID.randomUUID() + "@rikkeijobs.test",
                        passwordEncoder.encode("Pass#123"),
                        "HR Company 1",
                        null,
                        hrRole,
                        1L);
        activeHrCo1.setMustChangePassword(false);
        activeHrCo1.setStatus(UserStatus.ACTIVE);
        activeHrCo1.setCreatedAt(now);
        activeHrCo1.setUpdatedAt(now);
        activeHrCo1 = userRepository.saveAndFlush(activeHrCo1);

        recruitmentLogger = (Logger) LoggerFactory.getLogger("com.rikkei.jobs.recruitment");
        listAppender = new ListAppender<>();
        listAppender.start();
        recruitmentLogger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        if (recruitmentLogger != null && listAppender != null) {
            recruitmentLogger.detachAppender(listAppender);
            listAppender.stop();
        }
        reset(javaMailSender);
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        jdbcTemplate.update("DELETE FROM interview_rounds WHERE application_id > 7");
        jdbcTemplate.update("DELETE FROM applications WHERE id > 7");
        if (activeHrCo1 != null && activeHrCo1.getId() != null) {
            userRepository.deleteById(activeHrCo1.getId());
        }
    }

    private RequestPostProcessor asEmail(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return asUser(user);
    }

    private RequestPostProcessor asUser(User user) {
        String token = jwtService.generateToken(user);
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    private Long insertTempApplication(long jobId, long userId, String status) {
        Long appId =
                jdbcTemplate.queryForObject(
                        "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, cover_letter, status) "
                                + "VALUES (?, ?, 1, '/api/v1/me/applications/tmp/cv-snapshot', 'Temp UT02 test', ?) RETURNING id",
                        Long.class,
                        jobId,
                        userId,
                        status);
        assertNotNull(appId);
        jdbcTemplate.update(
                "INSERT INTO application_status_history (application_id, from_status, to_status, actor_id, note, created_at) "
                        + "VALUES (?, NULL, ?, ?, 'Khởi tạo hồ sơ test', ?)",
                appId,
                status,
                userId,
                OffsetDateTime.ofInstant(BASE_INSTANT, ZoneOffset.UTC));
        jdbcTemplate.update(
                "INSERT INTO application_cv_snapshots (application_id, original_filename, content_type, file_data, file_size, sha256) "
                        + "VALUES (?, 'temp-cv.pdf', 'application/pdf', ?, ?, ?)",
                appId,
                SAMPLE_PDF,
                SAMPLE_PDF.length,
                SAMPLE_SHA256);
        return appId;
    }

    @Test
    @DisplayName(
            "Option 1A: GET /api/v1/hr/jobs is strictly scoped to principal companyId, paginated, stably sorted, and blocks other roles")
    void testOption1aHrJobsEndpointAndIdorIsolation() throws Exception {
        // hr Co1 sees ONLY companyId=1 jobs (1, 6, 11), even if ?companyId=2 is passed
        MvcResult co1Result =
                mockMvc.perform(get("/api/v1/hr/jobs?companyId=2").with(asUser(activeHrCo1)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.page").value(1))
                        .andExpect(jsonPath("$.size").value(20))
                        .andExpect(jsonPath("$.totalItems").value(3))
                        .andExpect(jsonPath("$.items", hasSize(3)))
                        .andReturn();
        JsonNode co1Items =
                objectMapper.readTree(co1Result.getResponse().getContentAsString()).path("items");
        for (JsonNode item : co1Items) {
            assertEquals(1L, item.path("companyId").asLong());
            assertFalse(item.has("description"), "Option 1A must return minimal UT-02 fields only");
        }

        // hr2 sees ONLY companyId=2 jobs (2, 8, 12)
        MvcResult co2Result =
                mockMvc.perform(
                                get("/api/v1/hr/jobs?page=1&size=2")
                                        .with(asEmail("hr2@rikkeijobs.test")))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.page").value(1))
                        .andExpect(jsonPath("$.size").value(2))
                        .andExpect(jsonPath("$.totalItems").value(3))
                        .andExpect(jsonPath("$.totalPages").value(2))
                        .andExpect(jsonPath("$.items", hasSize(2)))
                        .andReturn();
        JsonNode co2Items =
                objectMapper.readTree(co2Result.getResponse().getContentAsString()).path("items");
        for (JsonNode item : co2Items) {
            assertEquals(2L, item.path("companyId").asLong());
        }

        // Verify expired job #12 (Java Developer 2024, deadline 2024-01-01) is EXPIRED +
        // expired=true
        MvcResult co2AllResult =
                mockMvc.perform(
                                get("/api/v1/hr/jobs?page=1&size=20")
                                        .with(asEmail("hr2@rikkeijobs.test")))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.items", hasSize(3)))
                        .andReturn();
        JsonNode co2AllItems =
                objectMapper
                        .readTree(co2AllResult.getResponse().getContentAsString())
                        .path("items");
        JsonNode job12 = null;
        JsonNode job2 = null;
        for (JsonNode item : co2AllItems) {
            if (item.path("id").asLong() == 12L) {
                job12 = item;
            } else if (item.path("id").asLong() == 2L) {
                job2 = item;
            }
        }
        assertNotNull(job12, "Expected seeded job #12 for companyId=2");
        assertNotNull(job2, "Expected seeded job #2 for companyId=2");
        assertEquals("EXPIRED", job12.path("status").asText());
        assertTrue(job12.path("expired").asBoolean());
        assertEquals("APPROVED", job2.path("status").asText());
        assertFalse(job2.path("expired").asBoolean());

        // Unassigned HR -> 404
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User unassignedHr =
                new User(
                        "ut02-unassigned-" + UUID.randomUUID() + "@rikkeijobs.test",
                        passwordEncoder.encode("Pass#123"),
                        "Unassigned HR",
                        null,
                        hrRole,
                        null);
        unassignedHr.setMustChangePassword(false);
        unassignedHr.setStatus(UserStatus.ACTIVE);
        OffsetDateTime now = OffsetDateTime.ofInstant(BASE_INSTANT, ZoneOffset.UTC);
        unassignedHr.setCreatedAt(now);
        unassignedHr.setUpdatedAt(now);
        unassignedHr = userRepository.saveAndFlush(unassignedHr);
        try {
            mockMvc.perform(get("/api/v1/hr/jobs").with(asUser(unassignedHr)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        } finally {
            userRepository.delete(unassignedHr);
        }

        // Invalid pagination -> 400
        mockMvc.perform(get("/api/v1/hr/jobs?page=0").with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(get("/api/v1/hr/jobs?size=101").with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // STAFF/CANDIDATE -> 403, anonymous -> 401
        mockMvc.perform(get("/api/v1/hr/jobs").with(asEmail("staff1@rikkeijobs.test")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/hr/jobs").with(asEmail("candidate1@rikkeijobs.test")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/hr/jobs")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName(
            "Option 2A: GET /api/v1/applications/{id}/cv-snapshot enforces headers and full access matrix")
    void testOption2aCvSnapshotHeadersAndAccessMatrix() throws Exception {
        Long co2AppId = insertTempApplication(2L, 2L, "SUBMITTED");

        // Owning HR -> 200 with safe PDF headers
        MvcResult hrDownload =
                mockMvc.perform(
                                get("/api/v1/applications/" + co2AppId + "/cv-snapshot")
                                        .with(asEmail("hr2@rikkeijobs.test")))
                        .andExpect(status().isOk())
                        .andExpect(
                                header().string(
                                                HttpHeaders.CONTENT_TYPE,
                                                MediaType.APPLICATION_PDF_VALUE))
                        .andExpect(
                                header().string(
                                                HttpHeaders.CACHE_CONTROL,
                                                "no-store, no-cache, must-revalidate"))
                        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                        .andExpect(
                                header().string(
                                                HttpHeaders.CONTENT_DISPOSITION,
                                                containsString("attachment;")))
                        .andReturn();
        assertArrayEquals(SAMPLE_PDF, hrDownload.getResponse().getContentAsByteArray());

        // STAFF -> 200
        MvcResult staffDownload =
                mockMvc.perform(
                                get("/api/v1/applications/" + co2AppId + "/cv-snapshot")
                                        .with(asEmail("staff1@rikkeijobs.test")))
                        .andExpect(status().isOk())
                        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                        .andExpect(
                                header().string(
                                                HttpHeaders.CACHE_CONTROL,
                                                "no-store, no-cache, must-revalidate"))
                        .andReturn();
        assertArrayEquals(SAMPLE_PDF, staffDownload.getResponse().getContentAsByteArray());

        // Cross-company HR -> identical 404 body to missing ID
        String missingBody =
                mockMvc.perform(
                                get("/api/v1/applications/999999/cv-snapshot")
                                        .with(asUser(activeHrCo1)))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        String crossCompanyBody =
                mockMvc.perform(
                                get("/api/v1/applications/" + co2AppId + "/cv-snapshot")
                                        .with(asUser(activeHrCo1)))
                        .andExpect(status().isNotFound())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertEquals(missingBody, crossCompanyBody);

        // CANDIDATE -> 403, anonymous -> 401
        mockMvc.perform(
                        get("/api/v1/applications/" + co2AppId + "/cv-snapshot")
                                .with(asEmail("candidate2@rikkeijobs.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mockMvc.perform(get("/api/v1/applications/" + co2AppId + "/cv-snapshot"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName(
            "UT-02 full workflow: transitions, rounds, isOfferAllowed, stale version 409, cross-company 404, async email & zero PII logs")
    void testFullUt02WorkflowValidationAndRbac() throws Exception {
        Long appId = insertTempApplication(2L, 2L, "SUBMITTED");

        // 1. Detail view as owning HR & STAFF
        mockMvc.perform(get("/api/v1/applications/" + appId).with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(appId))
                .andExpect(jsonPath("$.companyId").value(2))
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.canSendOffer").value(false))
                .andExpect(jsonPath("$.allowedTransitions", hasSize(2)));

        mockMvc.perform(
                        get("/api/v1/applications/" + appId)
                                .with(asEmail("staff1@rikkeijobs.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(appId));

        // 2. Illegal direct skip SUBMITTED -> INTERVIEW = 409 INVALID_TRANSITION
        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/transition")
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"toStatus\":\"INTERVIEW\",\"note\":\"Nhảy cóc\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));

        // 3. Cannot add round in SUBMITTED -> 409 INVALID_APPLICATION_STATE
        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/rounds")
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\"Vòng 1\",\"interviewerEmail\":\"lead-secret@fpt.test\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_APPLICATION_STATE"));

        // 4. SUBMITTED -> SCREENING works, writes history, sends async email
        ((MutableClock) clock).setInstant(BASE_INSTANT.plusSeconds(60));
        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/transition")
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"toStatus\":\"SCREENING\",\"note\":\"Đạt vòng hồ sơ\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCREENING"))
                .andExpect(jsonPath("$.histories", hasSize(2)));

        await().atMost(Duration.ofSeconds(5))
                .untilAsserted(() -> verify(javaMailSender, times(1)).send(any(MimeMessage.class)));

        // 5. Add round 1 in SCREENING -> 201, roundNo = 1
        MvcResult round1Res =
                mockMvc.perform(
                                post("/api/v1/applications/" + appId + "/rounds")
                                        .with(asEmail("hr2@rikkeijobs.test"))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"name\":\"Vòng 1: Chuyên môn\",\"interviewerEmail\":\"lead-secret@fpt.test\"}"))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.roundNo").value(1))
                        .andExpect(jsonPath("$.result").value("PENDING"))
                        .andExpect(jsonPath("$.version").value(0))
                        .andReturn();
        long round1Id =
                objectMapper
                        .readTree(round1Res.getResponse().getContentAsString())
                        .path("id")
                        .asLong();

        // 6. Cannot update round result while still in SCREENING -> 409 INVALID_APPLICATION_STATE
        mockMvc.perform(
                        put("/api/v1/applications/" + appId + "/rounds/" + round1Id)
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"result\":\"PASS\",\"score\":85.0,\"note\":\"Tốt\",\"version\":0}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_APPLICATION_STATE"));

        // 7. SCREENING -> INTERVIEW works
        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/transition")
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"toStatus\":\"INTERVIEW\",\"note\":\"Mời phỏng vấn\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INTERVIEW"))
                .andExpect(jsonPath("$.canSendOffer").value(false));

        // 8. Add round 2 in INTERVIEW -> roundNo = 2
        MvcResult round2Res =
                mockMvc.perform(
                                post("/api/v1/applications/" + appId + "/rounds")
                                        .with(asEmail("hr2@rikkeijobs.test"))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"name\":\"Vòng 2: Quản lý\",\"interviewerEmail\":\"em-secret@fpt.test\"}"))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.roundNo").value(2))
                        .andReturn();
        long round2Id =
                objectMapper
                        .readTree(round2Res.getResponse().getContentAsString())
                        .path("id")
                        .asLong();

        // 9. Update round 1 PASS, round 2 FAIL -> isOfferAllowed false; then round 2 PASS -> true
        mockMvc.perform(
                        put("/api/v1/applications/" + appId + "/rounds/" + round1Id)
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"result\":\"PASS\",\"score\":88.5,\"note\":\"Nắm vững Java\",\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));
        assertFalse(recruitmentProcessService.isOfferAllowed(appId));

        mockMvc.perform(
                        put("/api/v1/applications/" + appId + "/rounds/" + round2Id)
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"result\":\"FAIL\",\"score\":40.0,\"note\":\"Chưa đạt\",\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));
        assertFalse(recruitmentProcessService.isOfferAllowed(appId));

        // Stale version 0 -> 409 CONFLICT
        mockMvc.perform(
                        put("/api/v1/applications/" + appId + "/rounds/" + round2Id)
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"result\":\"PASS\",\"score\":90.0,\"note\":\"Stale\",\"version\":0}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));

        // Correct version 1 -> PASS -> isOfferAllowed true
        mockMvc.perform(
                        put("/api/v1/applications/" + appId + "/rounds/" + round2Id)
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"result\":\"PASS\",\"score\":92.0,\"note\":\"Đạt\",\"version\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));
        assertTrue(recruitmentProcessService.isOfferAllowed(appId));

        // 10. INTERVIEW -> OFFER rejected with 409 INVALID_TRANSITION (belongs to UT-07)
        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/transition")
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"toStatus\":\"OFFER\",\"note\":\"Gửi offer\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));

        // 11. INTERVIEW -> REJECTED works, and REJECTED is terminal
        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/transition")
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"toStatus\":\"REJECTED\",\"note\":\"Không phù hợp\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.allowedTransitions", hasSize(0)));

        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/transition")
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"toStatus\":\"SCREENING\",\"note\":\"Quay lại\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));
        mockMvc.perform(
                        put("/api/v1/applications/" + appId + "/rounds/" + round1Id)
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"result\":\"FAIL\",\"version\":0}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_APPLICATION_STATE"));

        // 12. Validation errors -> 400 VALIDATION_ERROR
        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/transition")
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"toStatus\":\"SCREENING\",\"note\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/rounds")
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"\",\"interviewerEmail\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // 13. Cross-company HR IDOR -> 404 identical body on every endpoint
        String missingDetail =
                mockMvc.perform(get("/api/v1/applications/999999").with(asUser(activeHrCo1)))
                        .andExpect(status().isNotFound())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        String crossDetail =
                mockMvc.perform(get("/api/v1/applications/" + appId).with(asUser(activeHrCo1)))
                        .andExpect(status().isNotFound())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertEquals(missingDetail, crossDetail);

        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/transition")
                                .with(asUser(activeHrCo1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"toStatus\":\"SCREENING\",\"note\":\"IDOR\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(
                        post("/api/v1/applications/" + appId + "/rounds")
                                .with(asUser(activeHrCo1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"IDOR\",\"interviewerEmail\":\"a@b.com\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(
                        put("/api/v1/applications/" + appId + "/rounds/" + round1Id)
                                .with(asUser(activeHrCo1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"result\":\"PASS\",\"version\":0}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // 14. Zero PII in logs
        for (ILoggingEvent logEvent : listAppender.list) {
            String msg = logEvent.getFormattedMessage();
            assertFalse(msg.contains("lead-secret@fpt.test"));
            assertFalse(msg.contains("em-secret@fpt.test"));
            assertFalse(msg.contains("candidate2@rikkeijobs.test"));
            assertFalse(msg.contains("Đạt vòng hồ sơ"));
        }
    }

    @Test
    @DisplayName(
            "Concurrency: parallel transitions yield exactly 1 winner (rest 409, zero 500) and parallel round adds yield monotonic unique round_no")
    void testConcurrentTransitionsAndRoundCreation() throws Exception {
        Long transAppId = insertTempApplication(2L, 2L, "SUBMITTED");
        int transitionThreads = 12;
        ExecutorService transPool = Executors.newFixedThreadPool(transitionThreads);
        CountDownLatch transStart = new CountDownLatch(1);
        CountDownLatch transDone = new CountDownLatch(transitionThreads);
        AtomicInteger trans200 = new AtomicInteger();
        AtomicInteger trans409 = new AtomicInteger();
        AtomicInteger transOther = new AtomicInteger();

        for (int i = 0; i < transitionThreads; i++) {
            transPool.submit(
                    () -> {
                        try {
                            transStart.await();
                            int status =
                                    mockMvc.perform(
                                                    post("/api/v1/applications/"
                                                                    + transAppId
                                                                    + "/transition")
                                                            .with(asEmail("hr2@rikkeijobs.test"))
                                                            .contentType(MediaType.APPLICATION_JSON)
                                                            .content(
                                                                    "{\"toStatus\":\"SCREENING\",\"note\":\"Concurrent transition\"}"))
                                            .andReturn()
                                            .getResponse()
                                            .getStatus();
                            if (status == 200) {
                                trans200.incrementAndGet();
                            } else if (status == 409) {
                                trans409.incrementAndGet();
                            } else {
                                transOther.incrementAndGet();
                            }
                        } catch (Exception ex) {
                            transOther.incrementAndGet();
                        } finally {
                            transDone.countDown();
                        }
                    });
        }
        transStart.countDown();
        assertTrue(transDone.await(20, TimeUnit.SECONDS));
        transPool.shutdown();

        assertEquals(1, trans200.get(), "Exactly 1 parallel transition must succeed");
        assertEquals(
                transitionThreads - 1, trans409.get(), "Remaining transitions must return 409");
        assertEquals(0, transOther.get(), "Zero 500 or unexpected responses allowed");

        // Concurrent round creation
        Long roundAppId = insertTempApplication(8L, 2L, "SCREENING");
        int roundThreads = 8;
        ExecutorService roundPool = Executors.newFixedThreadPool(roundThreads);
        CountDownLatch roundStart = new CountDownLatch(1);
        CountDownLatch roundDone = new CountDownLatch(roundThreads);
        AtomicInteger round201 = new AtomicInteger();
        AtomicInteger roundOther = new AtomicInteger();
        List<Integer> roundNos = java.util.Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < roundThreads; i++) {
            final int idx = i + 1;
            roundPool.submit(
                    () -> {
                        try {
                            roundStart.await();
                            MvcResult res =
                                    mockMvc.perform(
                                                    post("/api/v1/applications/"
                                                                    + roundAppId
                                                                    + "/rounds")
                                                            .with(asEmail("hr2@rikkeijobs.test"))
                                                            .contentType(MediaType.APPLICATION_JSON)
                                                            .content(
                                                                    "{\"name\":\"Round "
                                                                            + idx
                                                                            + "\",\"interviewerEmail\":\"panel"
                                                                            + idx
                                                                            + "@fpt.test\"}"))
                                            .andReturn();
                            if (res.getResponse().getStatus() == 201) {
                                round201.incrementAndGet();
                                roundNos.add(
                                        objectMapper
                                                .readTree(res.getResponse().getContentAsString())
                                                .path("roundNo")
                                                .asInt());
                            } else {
                                roundOther.incrementAndGet();
                            }
                        } catch (Exception ex) {
                            roundOther.incrementAndGet();
                        } finally {
                            roundDone.countDown();
                        }
                    });
        }
        roundStart.countDown();
        assertTrue(roundDone.await(20, TimeUnit.SECONDS));
        roundPool.shutdown();

        assertEquals(roundThreads, round201.get());
        assertEquals(0, roundOther.get());
        Set<Integer> uniqueRoundNos = new HashSet<>(roundNos);
        assertEquals(roundThreads, uniqueRoundNos.size(), "All round_no values must be unique");
        for (int n = 1; n <= roundThreads; n++) {
            assertTrue(uniqueRoundNos.contains(n), "Missing monotonic round_no " + n);
        }
    }

    @Test
    @DisplayName(
            "Anti-N+1 & Filters: GET /api/v1/staff/applications executes O(1) SQL statements and filters accurately")
    void testStaffApplicationsAntiNPlusOneAndFilters() throws Exception {
        SessionFactory sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
        Statistics stats = sessionFactory.getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();

        long start = stats.getPrepareStatementCount();
        PageResponse<StaffApplicationSummaryResponse> staffPage =
                recruitmentProcessService.getStaffApplications(null, null, null, 1, 20);
        long queryCount = stats.getPrepareStatementCount() - start;

        assertEquals(7, staffPage.items().size());
        assertTrue(
                queryCount <= 10L,
                "Expected O(1) <= 10 SQL statements for staff applications list, actual="
                        + queryCount);

        // Verify HTTP endpoint filtering by companyId=2, status=SUBMITTED
        mockMvc.perform(
                        get("/api/v1/staff/applications?companyId=2&status=SUBMITTED&page=1&size=20")
                                .with(asEmail("staff1@rikkeijobs.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].companyId").value(2))
                .andExpect(jsonPath("$.items[0].status").value("SUBMITTED"));

        // Verify pagination validation on staff list
        mockMvc.perform(
                        get("/api/v1/staff/applications?page=0")
                                .with(asEmail("staff1@rikkeijobs.test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(
                        get("/api/v1/staff/applications?size=101")
                                .with(asEmail("staff1@rikkeijobs.test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName(
            "Edge cases: cross-application roundId -> 404, UpdateInterviewRoundRequest boundary validation -> 400, and POST /rounds blocked with 409 in terminal states")
    void testCrossApplicationRoundValidationBoundariesAndTerminalRoundCreation() throws Exception {
        Long app1Id = insertTempApplication(2L, 2L, "INTERVIEW");
        Long app2Id = insertTempApplication(8L, 2L, "INTERVIEW");

        MvcResult roundRes =
                mockMvc.perform(
                                post("/api/v1/applications/" + app1Id + "/rounds")
                                        .with(asEmail("hr2@rikkeijobs.test"))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"name\":\"Vòng 1\",\"interviewerEmail\":\"panel@fpt.test\"}"))
                        .andExpect(status().isCreated())
                        .andReturn();
        long round1Id =
                objectMapper
                        .readTree(roundRes.getResponse().getContentAsString())
                        .path("id")
                        .asLong();

        // Cross-application roundId (belongs to app1Id, requested under app2Id in same company) ->
        // 404 NOT_FOUND
        mockMvc.perform(
                        put("/api/v1/applications/" + app2Id + "/rounds/" + round1Id)
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"result\":\"PASS\",\"score\":85.00,\"note\":\"OK\",\"version\":0}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // UpdateInterviewRoundRequest boundary validations -> 400 VALIDATION_ERROR
        for (String invalidPayload :
                List.of(
                        "{\"result\":\"PASS\",\"score\":85.126,\"note\":\"3 decimal places\",\"version\":0}",
                        "{\"result\":\"PASS\",\"score\":-0.01,\"note\":\"Below min\",\"version\":0}",
                        "{\"result\":\"PASS\",\"score\":100.01,\"note\":\"Above max\",\"version\":0}",
                        "{\"result\":null,\"score\":85.0,\"note\":\"Missing result\",\"version\":0}",
                        "{\"result\":\"PASS\",\"score\":85.0,\"note\":\"Missing version\"}",
                        "{\"result\":\"PASS\",\"score\":85.0,\"note\":\"Null version\",\"version\":null}",
                        "{\"result\":\"PASS\",\"score\":85.0,\"note\":\""
                                + "a".repeat(2001)
                                + "\",\"version\":0}")) {
            mockMvc.perform(
                            put("/api/v1/applications/" + app1Id + "/rounds/" + round1Id)
                                    .with(asEmail("hr2@rikkeijobs.test"))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(invalidPayload))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        // Omitted and null version specifically return unified Vietnamese validation message
        for (String missingVersionPayload :
                List.of(
                        "{\"result\":\"PASS\",\"score\":85.0,\"note\":\"Missing version\"}",
                        "{\"result\":\"PASS\",\"score\":85.0,\"note\":\"Null version\",\"version\":null}")) {
            mockMvc.perform(
                            put("/api/v1/applications/" + app1Id + "/rounds/" + round1Id)
                                    .with(asEmail("hr2@rikkeijobs.test"))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(missingVersionPayload))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(
                            jsonPath("$.message")
                                    .value(
                                            containsString(
                                                    "Phiên bản vòng phỏng vấn không được để trống")));
        }

        // Valid 2-decimal boundary score (e.g., 100.00) succeeds
        mockMvc.perform(
                        put("/api/v1/applications/" + app1Id + "/rounds/" + round1Id)
                                .with(asEmail("hr2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"result\":\"PASS\",\"score\":100.00,\"note\":\"Boundary pass\",\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(100.0));

        // POST /rounds blocked with 409 INVALID_APPLICATION_STATE in terminal states and OFFER
        for (String blockedStatus : List.of("REJECTED", "HIRED", "WITHDRAWN", "OFFER")) {
            Long blockedAppId = insertTempApplication(12L, 2L, blockedStatus);
            mockMvc.perform(
                            post("/api/v1/applications/" + blockedAppId + "/rounds")
                                    .with(asEmail("hr2@rikkeijobs.test"))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"name\":\"Blocked Round\",\"interviewerEmail\":\"panel@fpt.test\"}"))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("INVALID_APPLICATION_STATE"));
        }
    }
}
