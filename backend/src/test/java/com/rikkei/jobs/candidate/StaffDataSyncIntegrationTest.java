package com.rikkei.jobs.candidate;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.core.read.ListAppender;
import com.rikkei.jobs.candidate.dto.PmInternshipResultCommand;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import com.sun.net.httpserver.HttpServer;
import jakarta.persistence.EntityManagerFactory;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
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

@SpringBootTest(
        properties = {
            "app.sync.on-open-enabled=false",
            "app.sync.nightly-cron=-",
            "spring.jpa.properties.hibernate.generate_statistics=true"
        })
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("D9/D10 STAFF Data Sync Endpoints, RBAC 401/403 & Manual Override Integration Tests")
class StaffDataSyncIntegrationTest {

    private static final HttpServer MOCK_SERVER;
    private static final int MOCK_PORT;
    private static final AtomicBoolean MOCK_DOWN = new AtomicBoolean(false);
    private static final AtomicBoolean INJECT_NUL_TITLE = new AtomicBoolean(false);

    static {
        try {
            MOCK_SERVER =
                    HttpServer.create(
                            new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            MOCK_PORT = MOCK_SERVER.getAddress().getPort();
            MOCK_SERVER.createContext(
                    "/",
                    exchange -> {
                        if (MOCK_DOWN.get()) {
                            exchange.close();
                            return;
                        }
                        String path = exchange.getRequestURI().getRawPath();
                        String body = "[]";
                        if (path.equals("/lms/students/lms-sv-001/results")) {
                            if (INJECT_NUL_TITLE.get()) {
                                body =
                                        """
                                        [
                                          {"subjectCode":"JAVA01","subjectName":"Lập trình\\u0000Java secret-payload-marker","score":7.0,"attendanceRate":80,"homeworkRate":85,"rpoint":100}
                                        ]
                                        """;
                            } else {
                                body =
                                        """
                                        [
                                          {"subjectCode":"JAVA01","subjectName":"Lập trình Java Updated","score":7.0,"attendanceRate":80,"homeworkRate":85,"rpoint":100}
                                        ]
                                        """;
                            }
                        } else if (path.equals("/pm/students/lms-sv-001/internships")) {
                            body =
                                    """
                                    [
                                      {"batchId":"IOC-JB-2026-09","topicName":"Hệ thống đặt lịch phòng họp","endDate":"2026-10-30","finalScore":7.5,"tasks":[]}
                                    ]
                                    """;
                        }
                        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                        exchange.getResponseHeaders().add("Content-Type", "application/json");
                        exchange.sendResponseHeaders(200, bytes.length);
                        try (OutputStream os = exchange.getResponseBody()) {
                            os.write(bytes);
                        }
                    });
            MOCK_SERVER.start();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    @AfterAll
    static void stopServer() {
        MOCK_SERVER.stop(0);
    }

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("external.api.base-url", () -> "http://127.0.0.1:" + MOCK_PORT);
        registry.add("external.api.service-key", () -> "dev-key");
        registry.add("external.api.timeout-seconds", () -> "1");
        registry.add("external.api.max-retries", () -> "0");
    }

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private CandidatePublicService candidatePublicService;
    @Autowired private EntityManagerFactory entityManagerFactory;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MOCK_DOWN.set(false);
        INJECT_NUL_TITLE.set(false);
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        jdbcTemplate.update("DELETE FROM manual_overrides");
        jdbcTemplate.update("DELETE FROM sync_runs");
    }

    private RequestPostProcessor asEmail(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        String token = jwtService.generateToken(user);
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    @Test
    @DisplayName(
            "RBAC: 401 without token; 403 for CANDIDATE, HR, MENTOR, ADMIN on all 5 STAFF endpoints")
    void rbac401And403AcrossAllFiveStaffEndpoints() throws Exception {
        mockMvc.perform(post("/api/v1/staff/sync/1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mockMvc.perform(get("/api/v1/staff/sync-runs")).andExpect(status().isUnauthorized());
        mockMvc.perform(
                        put("/api/v1/staff/external-records/1/override")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"field\":\"score\",\"value\":9,\"reason\":\"fix\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/staff/external-records")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/staff/sync/candidates")).andExpect(status().isUnauthorized());

        for (String email :
                List.of(
                        "candidate1@rikkeijobs.test",
                        "hr2@rikkeijobs.test",
                        "mentor1@rikkeijobs.test",
                        "admin1@rikkeijobs.test")) {
            RequestPostProcessor actor = asEmail(email);
            mockMvc.perform(post("/api/v1/staff/sync/1").with(actor))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
            mockMvc.perform(get("/api/v1/staff/sync-runs").with(actor))
                    .andExpect(status().isForbidden());
            mockMvc.perform(
                            put("/api/v1/staff/external-records/1/override")
                                    .with(actor)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"field\":\"score\",\"value\":9,\"reason\":\"fix\"}"))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/v1/staff/external-records").with(actor))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/v1/staff/sync/candidates").with(actor))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    @DisplayName(
            "D9 manual override validation, PM #h rejection (400), immediate recompute, and survival across NT-05 & TT-01 syncs")
    void manualOverrideValidationPmHistoryRejectionAndSyncSurvival() throws Exception {
        RequestPostProcessor staff = asEmail("staff1@rikkeijobs.test");
        Long lmsJavaId =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM external_records WHERE source = 'LMS' AND source_key = '1:JAVA01'",
                        Long.class);
        Long pmId =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM external_records WHERE source = 'PM' AND source_key = '1:IOC-JB-2026-09'",
                        Long.class);

        // Non-canonical PM row (#h suffix) MUST be rejected with 400 VALIDATION_ERROR (Stop Gate
        // (A))
        Long pmHistId =
                jdbcTemplate.queryForObject(
                        "INSERT INTO external_records (user_id, source, source_code, source_key, title, score, recorded_at, payload, synced_at)"
                                + " VALUES (1, 'PM', 'IOC-JB-2026-09', '1:IOC-JB-2026-09#h999', 'Hist PM', 70.00, NOW() - INTERVAL '30 days', '{}'::jsonb, NOW()) RETURNING id",
                        Long.class);
        try {
            mockMvc.perform(
                            put("/api/v1/staff/external-records/" + pmHistId + "/override")
                                    .with(staff)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"field\":\"finalScore\",\"value\":9.0,\"reason\":\"Try override history\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        } finally {
            jdbcTemplate.update("DELETE FROM external_records WHERE id = ?", pmHistId);
        }

        // Invalid fields/values -> 400 VALIDATION_ERROR
        mockMvc.perform(
                        put("/api/v1/staff/external-records/" + lmsJavaId + "/override")
                                .with(staff)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"field\":\"unknownField\",\"value\":9,\"reason\":\"bad\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(
                        put("/api/v1/staff/external-records/" + lmsJavaId + "/override")
                                .with(staff)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"field\":\"score\",\"value\":8.123,\"reason\":\"too many decimals\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(
                        put("/api/v1/staff/external-records/" + lmsJavaId + "/override")
                                .with(staff)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"field\":\"rpoint\",\"value\":12.5,\"reason\":\"must be integer\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Unknown record -> 404
        mockMvc.perform(
                        put("/api/v1/staff/external-records/999999/override")
                                .with(staff)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"field\":\"score\",\"value\":9.0,\"reason\":\"missing\"}"))
                .andExpect(status().isNotFound());

        // Valid LMS score override (9.5 -> 95.00) and PM finalScore override (9.0 -> 90.00)
        mockMvc.perform(
                        put("/api/v1/staff/external-records/" + lmsJavaId + "/override")
                                .with(staff)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"field\":\"score\",\"value\":9.5,\"reason\":\"Điều chỉnh điểm phúc khảo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(95.00))
                .andExpect(jsonPath("$.payload.score").value(9.5))
                .andExpect(jsonPath("$.overrides", hasSize(1)))
                .andExpect(jsonPath("$.overrides[0].staffName").value("Hoàng Thu Hà"))
                .andExpect(jsonPath("$.overrides[0].reason").value("Điều chỉnh điểm phúc khảo"));

        mockMvc.perform(
                        put("/api/v1/staff/external-records/" + pmId + "/override")
                                .with(staff)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"field\":\"finalScore\",\"value\":9.0,\"reason\":\"Điểm PM phúc khảo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(90.00));

        // Trigger NT-05 manual sync (mock returns LMS JAVA01 score=7.0 & subjectName="Lập trình
        // Java Updated", PM finalScore=7.5)
        mockMvc.perform(post("/api/v1/staff/sync/1").with(staff))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.candidateName").value("Nguyễn Văn An"));

        // Overridden LMS score MUST stay 95.00 while non-overridden title updated to "Lập trình
        // Java Updated"
        BigDecimal lmsScoreAfterSync =
                jdbcTemplate.queryForObject(
                        "SELECT score FROM external_records WHERE id = ?",
                        BigDecimal.class,
                        lmsJavaId);
        String lmsTitleAfterSync =
                jdbcTemplate.queryForObject(
                        "SELECT title FROM external_records WHERE id = ?", String.class, lmsJavaId);
        assertEquals(new BigDecimal("95.00"), lmsScoreAfterSync);
        assertEquals("Lập trình Java Updated", lmsTitleAfterSync);

        // Overridden PM finalScore MUST stay 90.00 even after TT-01 write with 6.0!
        candidatePublicService.recordPmInternshipResults(
                1L,
                List.of(
                        new PmInternshipResultCommand(
                                "IOC-JB-2026-09",
                                "Hệ thống đặt lịch phòng họp v2",
                                new BigDecimal("6.0"))));
        BigDecimal pmScoreAfterTt01 =
                jdbcTemplate.queryForObject(
                        "SELECT score FROM external_records WHERE id = ?", BigDecimal.class, pmId);
        String pmTitleAfterTt01 =
                jdbcTemplate.queryForObject(
                        "SELECT title FROM external_records WHERE id = ?", String.class, pmId);
        assertEquals(new BigDecimal("90.00"), pmScoreAfterTt01);
        assertEquals("Hệ thống đặt lịch phòng họp v2", pmTitleAfterTt01);

        // Restore seed for candidate1
        jdbcTemplate.update("DELETE FROM manual_overrides");
        jdbcTemplate.update(
                "UPDATE external_records SET title = 'Lập trình Java', score = 85.00 WHERE id = ?",
                lmsJavaId);
        jdbcTemplate.update(
                "UPDATE external_records SET title = 'IOC Java Backend 09/2026', score = 85.00 WHERE id = ?",
                pmId);
        candidatePublicService.recomputeCandidateSkills(1L);
    }

    @Test
    @DisplayName(
            "D10 GET sync-runs, external-records, candidates, pagination bounds, and 503 on mock down")
    void staffQueryEndpointsPaginationAnd503OnDownMock() throws Exception {
        RequestPostProcessor staff = asEmail("staff1@rikkeijobs.test");

        mockMvc.perform(post("/api/v1/staff/sync/1").with(staff)).andExpect(status().isOk());

        MOCK_DOWN.set(true);
        mockMvc.perform(post("/api/v1/staff/sync/1").with(staff))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("EXTERNAL_UNAVAILABLE"));

        // GET /staff/sync-runs (newest first, status filter, userId filter)
        mockMvc.perform(
                        get("/api/v1/staff/sync-runs?status=FAILED&userId=1&page=1&size=20")
                                .with(staff))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].status").value("FAILED"))
                .andExpect(jsonPath("$.items[0].candidateName").value("Nguyễn Văn An"));

        // size > 100 -> 400
        mockMvc.perform(get("/api/v1/staff/sync-runs?page=1&size=101").with(staff))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // GET /staff/external-records?userId=1 (verify bounded query count — no N+1)
        Statistics stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        mockMvc.perform(get("/api/v1/staff/external-records?userId=1&page=1&size=20").with(staff))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.items[0].payload").isMap());
        assertTrue(
                stats.getPrepareStatementCount() <= 6,
                "Expected batched queries without N+1, got " + stats.getPrepareStatementCount());

        // GET /staff/sync/candidates?q=Nguyễn Văn An
        mockMvc.perform(
                        get("/api/v1/staff/sync/candidates?q=Nguyễn Văn An&page=1&size=20")
                                .with(staff))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].lmsUserId").value("lms-sv-001"));
    }

    @Test
    @DisplayName(
            "F9: attendanceRate/homeworkRate >2 decimals, extreme scientific notation, and ISO control chars return 400 VALIDATION_ERROR in Vietnamese and store nothing")
    void manualOverrideRejectsExcessiveDecimalsScientificNotationAndControlCharacters()
            throws Exception {
        RequestPostProcessor staff = asEmail("staff1@rikkeijobs.test");
        Long lmsJavaId =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM external_records WHERE source = 'LMS' AND source_key = '1:JAVA01'",
                        Long.class);
        Long pmId =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM external_records WHERE source = 'PM' AND source_key = '1:IOC-JB-2026-09'",
                        Long.class);

        String titleBeforeLms =
                jdbcTemplate.queryForObject(
                        "SELECT title FROM external_records WHERE id = ?", String.class, lmsJavaId);
        String payloadBeforeLms =
                jdbcTemplate.queryForObject(
                        "SELECT payload::text FROM external_records WHERE id = ?",
                        String.class,
                        lmsJavaId);
        String titleBeforePm =
                jdbcTemplate.queryForObject(
                        "SELECT title FROM external_records WHERE id = ?", String.class, pmId);

        List<String> invalidLmsBodies =
                List.of(
                        "{\"field\":\"attendanceRate\",\"value\":95.123,\"reason\":\"Quá nhiều thập phân\"}",
                        "{\"field\":\"attendanceRate\",\"value\":1e-100000,\"reason\":\"Underflow raw number\"}",
                        "{\"field\":\"attendanceRate\",\"value\":1e-9999999999,\"reason\":\"Extreme exponent raw number\"}",
                        "{\"field\":\"attendanceRate\",\"value\":\"1e-1000\",\"reason\":\"Số khoa học nhỏ\"}",
                        "{\"field\":\"attendanceRate\",\"value\":\"1e-100000\",\"reason\":\"Số khoa học cực nhỏ\"}",
                        "{\"field\":\"homeworkRate\",\"value\":88.123,\"reason\":\"Quá nhiều thập phân\"}",
                        "{\"field\":\"homeworkRate\",\"value\":1e-100000,\"reason\":\"Underflow raw number\"}",
                        "{\"field\":\"homeworkRate\",\"value\":\"1e-1000\",\"reason\":\"Số khoa học nhỏ\"}",
                        "{\"field\":\"homeworkRate\",\"value\":\"1e-100000\",\"reason\":\"Số khoa học cực nhỏ\"}",
                        "{\"field\":\"subjectName\",\"value\":\"Java\\u0000Core\",\"reason\":\"Chứa NUL\"}",
                        "{\"field\":\"subjectName\",\"value\":\"Java\\u0007Bell\",\"reason\":\"Chứa BEL\"}",
                        "{\"field\":\"subjectName\",\"value\":\"Java\\nLine\",\"reason\":\"Chứa xuống dòng\"}",
                        "{\"field\":\"subjectName\",\"value\":\"Java\\tTab\",\"reason\":\"Chứa tab\"}",
                        "{\"field\":\"subjectName\",\"value\":\"Java\\rCR\",\"reason\":\"Chứa CR\"}",
                        "{\"field\":\"score\",\"value\":9.0,\"reason\":\"Lý do\\u0000NUL\"}",
                        "{\"field\":\"score\",\"value\":9.0,\"reason\":\"Lý do\\u0007BEL\"}",
                        "{\"field\":\"score\",\"value\":9.0,\"reason\":\"Lý do\\rLoneCR\"}");

        for (String body : invalidLmsBodies) {
            mockMvc.perform(
                            put("/api/v1/staff/external-records/" + lmsJavaId + "/override")
                                    .with(staff)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }

        List<String> invalidPmBodies =
                List.of(
                        "{\"field\":\"topicName\",\"value\":\"Đề tài\\u0000NUL\",\"reason\":\"Chứa NUL\"}",
                        "{\"field\":\"topicName\",\"value\":\"Đề tài\\u0007BEL\",\"reason\":\"Chứa BEL\"}",
                        "{\"field\":\"topicName\",\"value\":\"Đề tài\\nLine\",\"reason\":\"Chứa xuống dòng\"}",
                        "{\"field\":\"topicName\",\"value\":\"Đề tài\\tTab\",\"reason\":\"Chứa tab\"}",
                        "{\"field\":\"topicName\",\"value\":\"Đề tài\\rCR\",\"reason\":\"Chứa CR\"}");

        for (String body : invalidPmBodies) {
            mockMvc.perform(
                            put("/api/v1/staff/external-records/" + pmId + "/override")
                                    .with(staff)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }

        Integer overrideCount =
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM manual_overrides", Integer.class);
        assertEquals(0, overrideCount);
        assertEquals(
                titleBeforeLms,
                jdbcTemplate.queryForObject(
                        "SELECT title FROM external_records WHERE id = ?",
                        String.class,
                        lmsJavaId));
        assertEquals(
                payloadBeforeLms,
                jdbcTemplate.queryForObject(
                        "SELECT payload::text FROM external_records WHERE id = ?",
                        String.class,
                        lmsJavaId));
        assertEquals(
                titleBeforePm,
                jdbcTemplate.queryForObject(
                        "SELECT title FROM external_records WHERE id = ?", String.class, pmId));
    }

    @Test
    @DisplayName(
            "G7: manual override accepts LF, CRLF, and TAB in reason and preserves them in DB/response")
    void manualOverrideAcceptsNewlinesAndTabsInReason() throws Exception {
        RequestPostProcessor staff = asEmail("staff1@rikkeijobs.test");
        Long lmsJavaId =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM external_records WHERE source = 'LMS' AND source_key = '1:JAVA01'",
                        Long.class);
        String payloadBefore =
                jdbcTemplate.queryForObject(
                        "SELECT payload::text FROM external_records WHERE id = ?",
                        String.class,
                        lmsJavaId);

        try {
            mockMvc.perform(
                            put("/api/v1/staff/external-records/" + lmsJavaId + "/override")
                                    .with(staff)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"field\":\"attendanceRate\",\"value\":92.5,\"reason\":\"Lý do\\nXuống dòng\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.overrides[0].reason").value("Lý do\nXuống dòng"));

            mockMvc.perform(
                            put("/api/v1/staff/external-records/" + lmsJavaId + "/override")
                                    .with(staff)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"field\":\"homeworkRate\",\"value\":88.5,\"reason\":\"Dòng 1\\r\\nDòng 2\\tChi tiết\"}"))
                    .andExpect(status().isOk())
                    .andExpect(
                            jsonPath("$.overrides[0].reason").value("Dòng 1\r\nDòng 2\tChi tiết"));

            String storedReason =
                    jdbcTemplate.queryForObject(
                            "SELECT reason FROM manual_overrides WHERE record_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
                            String.class,
                            lmsJavaId);
            assertEquals("Dòng 1\r\nDòng 2\tChi tiết", storedReason);
        } finally {
            jdbcTemplate.update("DELETE FROM manual_overrides");
            jdbcTemplate.update(
                    "UPDATE external_records SET title = 'Lập trình Java', score = 85.00, payload = ?::jsonb WHERE id = ?",
                    payloadBefore,
                    lmsJavaId);
            candidatePublicService.recomputeCandidateSkills(1L);
        }
    }

    @Test
    @DisplayName(
            "F8: Upstream NUL byte causing PostgreSQL rejection logs ERROR once with redacted stack and returns 503 EXTERNAL_UNAVAILABLE")
    void upstreamNulTitleDbFailureLogsErrorOnceWithRedactedStackAndReturns503() throws Exception {
        Logger candidateLogger = (Logger) LoggerFactory.getLogger("com.rikkei.jobs.candidate");
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        candidateLogger.addAppender(appender);

        INJECT_NUL_TITLE.set(true);
        try {
            RequestPostProcessor staff = asEmail("staff1@rikkeijobs.test");
            mockMvc.perform(post("/api/v1/staff/sync/1").with(staff))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.code").value("EXTERNAL_UNAVAILABLE"));

            List<ILoggingEvent> errors =
                    appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList();
            assertEquals(1, errors.size(), "Expected exactly 1 ERROR log for DB NUL failure");
            IThrowableProxy proxy = errors.getFirst().getThrowableProxy();
            assertTrue(proxy != null && proxy.getStackTraceElementProxyArray().length > 0);
            String msg = errors.getFirst().getFormattedMessage();
            assertTrue(!msg.contains("secret-payload-marker"), "Leaked payload: " + msg);
            assertTrue(!msg.contains("dev-key"), "Leaked service key: " + msg);
            assertTrue(!msg.contains("candidate1@rikkeijobs.test"), "Leaked PII: " + msg);
            for (IThrowableProxy cur = proxy; cur != null; cur = cur.getCause()) {
                String tMsg = cur.getMessage() == null ? "" : cur.getMessage();
                assertTrue(
                        !tMsg.contains("secret-payload-marker"),
                        "Throwable leaked payload: " + tMsg);
                assertTrue(!tMsg.contains("dev-key"), "Throwable leaked key: " + tMsg);
                assertTrue(
                        !tMsg.contains("candidate1@rikkeijobs.test"),
                        "Throwable leaked PII: " + tMsg);
                assertTrue(!tMsg.contains("JSON data"), "Throwable leaked DB detail: " + tMsg);
                assertTrue(tMsg.contains("[redacted]"), "Expected [redacted] in: " + tMsg);
            }
        } finally {
            INJECT_NUL_TITLE.set(false);
            candidateLogger.detachAppender(appender);
            appender.stop();
        }
    }
}
