package com.rikkei.jobs.recruitment.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import com.rikkei.jobs.recruitment.integration.CvPort;
import com.rikkei.jobs.recruitment.integration.CvSnapshotService;
import com.rikkei.jobs.recruitment.integration.InMemoryCvPortTestDouble;
import com.rikkei.jobs.recruitment.model.Application;
import com.rikkei.jobs.recruitment.model.ApplicationCvSnapshot;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.model.ApplicationStatusHistory;
import com.rikkei.jobs.recruitment.repository.ApplicationCvSnapshotRepository;
import com.rikkei.jobs.recruitment.repository.ApplicationRepository;
import com.rikkei.jobs.recruitment.repository.ApplicationStatusHistoryRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Properties;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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
        "Recruitment Application Full-Stack Integration Tests (Non-Mocked DB, Security, Clock)")
public class ApplicationIntegrationTest {

    private static final Instant BASE_INSTANT = Instant.parse("2026-11-19T05:00:00Z");
    private static final byte[] PDF_V1 =
            ("%PDF-1.4\n1 0 obj\n<< /Title (CV V1) >>\nendobj\n%%EOF\n")
                    .getBytes(StandardCharsets.UTF_8);
    private static final byte[] PDF_V2 =
            ("%PDF-1.4\n1 0 obj\n<< /Title (CV V2 Updated) >>\nendobj\n%%EOF\n")
                    .getBytes(StandardCharsets.UTF_8);

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @TestConfiguration
    static class TestBeansConfig {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(BASE_INSTANT, ZoneOffset.UTC);
        }

        @Bean
        @Primary
        CvPort testCvPort() {
            return new InMemoryCvPortTestDouble();
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
    @Autowired private Clock clock;
    @Autowired private CvPort cvPort;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private ApplicationStatusHistoryRepository historyRepository;
    @Autowired private ApplicationCvSnapshotRepository snapshotRepository;

    private MockMvc mockMvc;
    private InMemoryCvPortTestDouble cvPortDouble;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        cvPortDouble = (InMemoryCvPortTestDouble) cvPort;
        cvPortDouble.clear();
        when(javaMailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
    }

    @AfterEach
    void tearDown() {
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        cvPortDouble.clear();
        jdbcTemplate.update("DELETE FROM applications WHERE id > 7");
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

    @Test
    @DisplayName(
            "Apply happy path persists single-insert URL, Clock timestamps, initial history, and immutable snapshot")
    void testApplyHappyPathPersistsApplicationHistoryAndSnapshot() throws Exception {
        cvPortDouble.registerCv(50L, 2L, "nguyen-van-b-cv.pdf", "application/pdf", PDF_V1);

        MvcResult result =
                mockMvc.perform(
                                post("/api/v1/jobs/7/apply")
                                        .with(asEmail("candidate2@rikkeijobs.test"))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"cvId\":50,\"coverLetter\":\"Rất mong được hợp tác\"}"))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.jobId").value(7))
                        .andExpect(jsonPath("$.cvId").value(50))
                        .andExpect(jsonPath("$.status").value("SUBMITTED"))
                        .andExpect(jsonPath("$.canWithdraw").value(true))
                        .andExpect(jsonPath("$.histories", hasSize(1)))
                        .andExpect(jsonPath("$.histories[0].toStatus").value("SUBMITTED"))
                        .andExpect(jsonPath("$.histories[0].actorId").value(2))
                        .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        long appId = json.path("id").asLong();
        String expectedUrl = "/api/v1/me/applications/" + appId + "/cv-snapshot";
        assertEquals(expectedUrl, json.path("cvSnapshotUrl").asText());

        Application saved = applicationRepository.findById(appId).orElseThrow();
        assertEquals(expectedUrl, saved.getCvSnapshotUrl());
        assertEquals(OffsetDateTime.ofInstant(BASE_INSTANT, ZoneOffset.UTC), saved.getCreatedAt());
        assertEquals(OffsetDateTime.ofInstant(BASE_INSTANT, ZoneOffset.UTC), saved.getUpdatedAt());

        ApplicationCvSnapshot snapshot = snapshotRepository.findById(appId).orElseThrow();
        assertArrayEquals(PDF_V1, snapshot.getFileData());
        assertEquals(PDF_V1.length, snapshot.getFileSize());
        assertEquals("application/pdf", snapshot.getContentType());
        assertEquals(CvSnapshotService.computeSha256Hex(PDF_V1), snapshot.getSha256());

        List<ApplicationStatusHistory> history =
                historyRepository.findByApplicationIdOrderByCreatedAtAscIdAsc(appId);
        assertEquals(1, history.size());
        assertEquals(2L, history.get(0).getActorId());
    }

    @Test
    @DisplayName("Duplicate open apply -> 409 DUPLICATE_APPLICATION and preserves 1 row in DB")
    void testDuplicateOpenApplyReturns409DuplicateApplication() throws Exception {
        cvPortDouble.registerCv(51L, 2L, "cv.pdf", "application/pdf", PDF_V1);

        mockMvc.perform(
                        post("/api/v1/jobs/7/apply")
                                .with(asEmail("candidate2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"cvId\":51,\"coverLetter\":\"Lần 1\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(
                        post("/api/v1/jobs/7/apply")
                                .with(asEmail("candidate2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"cvId\":51,\"coverLetter\":\"Lần 2\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_APPLICATION"));

        Integer count =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM applications WHERE job_id = 7 AND user_id = 2",
                        Integer.class);
        assertEquals(Integer.valueOf(1), count);
    }

    @Test
    @DisplayName("Re-apply succeeds after WITHDRAWN, REJECTED, and HIRED")
    void testReapplySucceedsAfterWithdrawnRejectedAndHired() throws Exception {
        cvPortDouble.registerCv(52L, 2L, "cv.pdf", "application/pdf", PDF_V1);

        // 1. Apply -> withdraw -> re-apply
        MvcResult first =
                mockMvc.perform(
                                post("/api/v1/jobs/7/apply")
                                        .with(asEmail("candidate2@rikkeijobs.test"))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"cvId\":52,\"coverLetter\":\"Đợt 1\"}"))
                        .andExpect(status().isCreated())
                        .andReturn();
        long firstId =
                objectMapper.readTree(first.getResponse().getContentAsString()).path("id").asLong();

        mockMvc.perform(
                        post("/api/v1/me/applications/" + firstId + "/withdraw")
                                .with(asEmail("candidate2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\"Cập nhật lại hồ sơ tốt hơn\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WITHDRAWN"));

        mockMvc.perform(
                        post("/api/v1/jobs/7/apply")
                                .with(asEmail("candidate2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"cvId\":52,\"coverLetter\":\"Đợt 2 sau WITHDRAWN\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));

        // 2. Re-apply after REJECTED (candidate1 job 5 is REJECTED in V20) and HIRED (job 4 in V20)
        cvPortDouble.registerCv(53L, 1L, "c1.pdf", "application/pdf", PDF_V1);
        mockMvc.perform(
                        post("/api/v1/jobs/5/apply")
                                .with(asEmail("candidate1@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"cvId\":53,\"coverLetter\":\"Nộp lại sau REJECTED\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));

        mockMvc.perform(
                        post("/api/v1/jobs/4/apply")
                                .with(asEmail("candidate1@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"cvId\":53,\"coverLetter\":\"Nộp lại sau HIRED\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));
    }

    @Test
    @DisplayName(
            "Ineligible jobs (DRAFT, expired, missing) and Clock deadline boundaries (-1s, ==, +1s) enforce 400 JOB_NOT_ELIGIBLE")
    void testJobEligibilityAndClockDeadlineBoundary() throws Exception {
        cvPortDouble.registerCv(54L, 2L, "cv.pdf", "application/pdf", PDF_V1);

        // DRAFT job 11, expired job 12, missing job 999999
        for (long badJobId : new long[] {11L, 12L, 999999L}) {
            mockMvc.perform(
                            post("/api/v1/jobs/" + badJobId + "/apply")
                                    .with(asEmail("candidate2@rikkeijobs.test"))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"cvId\":54}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("JOB_NOT_ELIGIBLE"));
        }

        // Exact deadline boundary using temporary APPROVED job + MutableClock
        OffsetDateTime exactDeadline =
                OffsetDateTime.ofInstant(BASE_INSTANT.plusSeconds(10), ZoneOffset.UTC);
        Long boundaryJobId =
                jdbcTemplate.queryForObject(
                        "INSERT INTO jobs (title, company_id, company_name, status, deadline) "
                                + "VALUES ('Boundary Job', 2, 'FPT Software', 'APPROVED', ?) RETURNING id",
                        Long.class,
                        exactDeadline);
        try {
            ((MutableClock) clock).setInstant(exactDeadline.toInstant());
            mockMvc.perform(
                            post("/api/v1/jobs/" + boundaryJobId + "/apply")
                                    .with(asEmail("candidate2@rikkeijobs.test"))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"cvId\":54}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("JOB_NOT_ELIGIBLE"));

            ((MutableClock) clock).setInstant(exactDeadline.toInstant().plusSeconds(1));
            mockMvc.perform(
                            post("/api/v1/jobs/" + boundaryJobId + "/apply")
                                    .with(asEmail("candidate2@rikkeijobs.test"))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"cvId\":54}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("JOB_NOT_ELIGIBLE"));

            ((MutableClock) clock).setInstant(exactDeadline.toInstant().minusSeconds(1));
            mockMvc.perform(
                            post("/api/v1/jobs/" + boundaryJobId + "/apply")
                                    .with(asEmail("candidate2@rikkeijobs.test"))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"cvId\":54}"))
                    .andExpect(status().isCreated());
        } finally {
            jdbcTemplate.update("DELETE FROM applications WHERE job_id = ?", boundaryJobId);
            jdbcTemplate.update("DELETE FROM jobs WHERE id = ?", boundaryJobId);
        }
    }

    @Test
    @DisplayName("Applying with another user's CV returns 404 NOT_FOUND and writes zero rows")
    void testOtherUsersCvReturns404() throws Exception {
        cvPortDouble.registerCv(55L, 1L, "c1-private.pdf", "application/pdf", PDF_V1);

        mockMvc.perform(
                        post("/api/v1/jobs/7/apply")
                                .with(asEmail("candidate2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"cvId\":55}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        Integer count =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM applications WHERE user_id = 2", Integer.class);
        assertEquals(Integer.valueOf(0), count);
    }

    @Test
    @DisplayName(
            "Snapshot remains byte-identical after source CV edit/delete and sets safe download headers for candidate & HR")
    void testSnapshotImmutabilityAndDownloadHeaders() throws Exception {
        cvPortDouble.registerCv(56L, 2L, "../secret\r\n\"my-cv\";.pdf", "application/pdf", PDF_V1);

        // Apply to job 2 (company_id = 2, owned by hr2)
        MvcResult applied =
                mockMvc.perform(
                                post("/api/v1/jobs/2/apply")
                                        .with(asEmail("candidate2@rikkeijobs.test"))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"cvId\":56}"))
                        .andExpect(status().isCreated())
                        .andReturn();
        long appId =
                objectMapper
                        .readTree(applied.getResponse().getContentAsString())
                        .path("id")
                        .asLong();

        // Update source CV bytes in port double, then delete it
        cvPortDouble.updateCv(56L, 2L, "new-cv-v2.pdf", "application/pdf", PDF_V2);
        byte[] candidateBytesAfterEdit =
                mockMvc.perform(
                                get("/api/v1/me/applications/" + appId + "/cv-snapshot")
                                        .with(asEmail("candidate2@rikkeijobs.test")))
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
                        .andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, PDF_V1.length))
                        .andExpect(
                                header().string(
                                                HttpHeaders.CONTENT_DISPOSITION,
                                                containsString("attachment;")))
                        .andReturn()
                        .getResponse()
                        .getContentAsByteArray();
        assertArrayEquals(PDF_V1, candidateBytesAfterEdit);

        cvPortDouble.deleteCv(56L);
        MvcResult hrDownload =
                mockMvc.perform(
                                get("/api/v1/hr/jobs/2/applications/" + appId + "/cv-snapshot")
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
                        .andReturn();

        assertArrayEquals(PDF_V1, hrDownload.getResponse().getContentAsByteArray());
        String disposition = hrDownload.getResponse().getHeader(HttpHeaders.CONTENT_DISPOSITION);
        assertNotNull(disposition);
        assertFalse(disposition.contains(".."));
        assertFalse(disposition.contains("\r"));
        assertFalse(disposition.contains("\n"));
    }

    @ParameterizedTest(name = "Withdraw allowed from {0}")
    @EnumSource(
            value = ApplicationStatus.class,
            names = {"SUBMITTED", "SCREENING", "INTERVIEW"})
    @DisplayName(
            "Withdraw succeeds from SUBMITTED, SCREENING, and INTERVIEW with chronological history")
    void testWithdrawAllowedBeforeOffer(ApplicationStatus initialStatus) throws Exception {
        Long appId =
                jdbcTemplate.queryForObject(
                        "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                + "VALUES (9, 2, 1, '/api/v1/me/applications/tmp/cv-snapshot', ?) RETURNING id",
                        Long.class,
                        initialStatus.name());
        OffsetDateTime seedTime = OffsetDateTime.ofInstant(BASE_INSTANT, ZoneOffset.UTC);
        jdbcTemplate.update(
                "INSERT INTO application_status_history (application_id, from_status, to_status, actor_id, note, created_at) "
                        + "VALUES (?, NULL, ?, 2, 'Initial seed', ?)",
                appId,
                initialStatus.name(),
                seedTime);

        ((MutableClock) clock).setInstant(BASE_INSTANT.plusSeconds(30));

        mockMvc.perform(
                        post("/api/v1/me/applications/" + appId + "/withdraw")
                                .with(asEmail("candidate2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\"Thay đổi kế hoạch cá nhân\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WITHDRAWN"))
                .andExpect(jsonPath("$.canWithdraw").value(false))
                .andExpect(jsonPath("$.histories", hasSize(2)))
                .andExpect(jsonPath("$.histories[1].fromStatus").value(initialStatus.name()))
                .andExpect(jsonPath("$.histories[1].toStatus").value("WITHDRAWN"))
                .andExpect(jsonPath("$.histories[1].actorId").value(2))
                .andExpect(jsonPath("$.histories[1].note").value("Thay đổi kế hoạch cá nhân"));
    }

    @ParameterizedTest(name = "Withdraw blocked with 409 CANNOT_WITHDRAW at {0}")
    @EnumSource(
            value = ApplicationStatus.class,
            names = {"OFFER", "HIRED", "REJECTED", "WITHDRAWN"})
    @DisplayName(
            "Withdraw blocked with 409 CANNOT_WITHDRAW at OFFER, HIRED, REJECTED, and WITHDRAWN")
    void testWithdrawBlockedAtOfferAndTerminal(ApplicationStatus blockedStatus) throws Exception {
        Long appId =
                jdbcTemplate.queryForObject(
                        "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                + "VALUES (9, 2, 1, '/api/v1/me/applications/tmp/cv-snapshot', ?) RETURNING id",
                        Long.class,
                        blockedStatus.name());

        mockMvc.perform(
                        post("/api/v1/me/applications/" + appId + "/withdraw")
                                .with(asEmail("candidate2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\"Muốn rút đơn\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CANNOT_WITHDRAW"));

        String dbStatus =
                jdbcTemplate.queryForObject(
                        "SELECT status FROM applications WHERE id = ?", String.class, appId);
        assertEquals(blockedStatus.name(), dbStatus);
    }

    @Test
    @DisplayName(
            "Pagination bounds, ?status= filter, unknown status, and @Valid payloads enforce 400 VALIDATION_ERROR")
    void testPaginationStatusFilterAndJakartaValidation() throws Exception {
        // Candidate list: default 20, size=100 OK, status filter, invalid params -> 400
        mockMvc.perform(get("/api/v1/me/applications").with(asEmail("candidate1@rikkeijobs.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalItems").value(7));

        mockMvc.perform(
                        get("/api/v1/me/applications?status=OFFER&page=1&size=100")
                                .with(asEmail("candidate1@rikkeijobs.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].status").value("OFFER"));

        mockMvc.perform(
                        get("/api/v1/hr/jobs/8/applications?status=SCREENING&page=1&size=100")
                                .with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].status").value("SCREENING"));

        for (String badQuery :
                List.of(
                        "/api/v1/me/applications?page=0",
                        "/api/v1/me/applications?size=0",
                        "/api/v1/me/applications?size=101",
                        "/api/v1/me/applications?status=BOGUS",
                        "/api/v1/hr/jobs/2/applications?page=0",
                        "/api/v1/hr/jobs/2/applications?size=101",
                        "/api/v1/hr/jobs/2/applications?status=BOGUS")) {
            mockMvc.perform(
                            get(badQuery)
                                    .with(
                                            badQuery.contains("/hr/")
                                                    ? asEmail("hr2@rikkeijobs.test")
                                                    : asEmail("candidate1@rikkeijobs.test")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        // Request body validation
        mockMvc.perform(
                        post("/api/v1/jobs/7/apply")
                                .with(asEmail("candidate2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"coverLetter\":\"Missing cvId\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        String tooLongCover = "a".repeat(2001);
        mockMvc.perform(
                        post("/api/v1/jobs/7/apply")
                                .with(asEmail("candidate2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"cvId\":1,\"coverLetter\":\"" + tooLongCover + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(
                        post("/api/v1/me/applications/1/withdraw")
                                .with(asEmail("candidate1@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName(
            "IDOR protection returns identical 404 body for cross-candidate, cross-company HR, mismatched job/app, and unassigned HR")
    void testCrossUserAndCrossCompany404MatchesMissingBodyIdentically() throws Exception {
        String missingCandidateBody =
                mockMvc.perform(
                                get("/api/v1/me/applications/999999")
                                        .with(asEmail("candidate2@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();

        String crossUserDetail =
                mockMvc.perform(
                                get("/api/v1/me/applications/1")
                                        .with(asEmail("candidate2@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertEquals(missingCandidateBody, crossUserDetail);

        mockMvc.perform(
                        post("/api/v1/me/applications/1/withdraw")
                                .with(asEmail("candidate2@rikkeijobs.test"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\"Rút hộ\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(
                        get("/api/v1/me/applications/1/cv-snapshot")
                                .with(asEmail("candidate2@rikkeijobs.test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // HR cross-company and job/app mismatch
        String hrMissingJobBody =
                mockMvc.perform(
                                get("/api/v1/hr/jobs/999999/applications")
                                        .with(asEmail("hr2@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();

        String hrCrossCompanyBody =
                mockMvc.perform(
                                get("/api/v1/hr/jobs/1/applications")
                                        .with(asEmail("hr2@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertEquals(hrMissingJobBody, hrCrossCompanyBody);

        // Application 1 belongs to job 2, not job 8 (even though hr2 owns both job 2 and job 8)
        mockMvc.perform(
                        get("/api/v1/hr/jobs/8/applications/1")
                                .with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // HR with companyId == null -> identical 404
        User hr2 = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User unassignedHr =
                new User(
                        "unassigned-hr-" + UUID.randomUUID() + "@rikkeijobs.test",
                        passwordEncoder.encode("TempPass#123"),
                        "Unassigned HR",
                        null,
                        hrRole,
                        null);
        unassignedHr.setMustChangePassword(false);
        unassignedHr.setStatus(UserStatus.ACTIVE);
        OffsetDateTime now = OffsetDateTime.now(clock);
        unassignedHr.setCreatedAt(now);
        unassignedHr.setUpdatedAt(now);
        unassignedHr = userRepository.saveAndFlush(unassignedHr);
        try {
            String unassignedBody =
                    mockMvc.perform(
                                    get("/api/v1/hr/jobs/2/applications")
                                            .with(asUser(unassignedHr)))
                            .andExpect(status().isNotFound())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            assertEquals(hrMissingJobBody, unassignedBody);
            assertTrue(hr2.getCompanyId() != null);
        } finally {
            userRepository.delete(unassignedHr);
        }
    }
}
