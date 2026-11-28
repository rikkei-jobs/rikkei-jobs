package com.rikkei.jobs.internship;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import com.rikkei.jobs.internship.service.impl.InternshipServiceImpl;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
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
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.sync.on-open-enabled=false", "app.sync.nightly-cron=-"})
@Testcontainers
@ActiveProfiles("dev")
@DisplayName(
        "TT-01 Internship Controller, D5 RBAC/IDOR, D6 Fast-Fail/Fallback & D7 Integration Tests")
class InternshipControllerIntegrationTest {

    private static final Instant BASE_INSTANT = Instant.now().truncatedTo(ChronoUnit.SECONDS);

    private enum PmMode {
        DEFAULT,
        UPDATED_SCORE,
        HTTP_500,
        HTTP_404,
        CLOSE_CONNECTION,
        INVALID_JSON,
        HANG
    }

    private static final HttpServer PM_SERVER;
    private static final ExecutorService PM_EXECUTOR;
    private static final int PM_PORT;
    private static final AtomicReference<PmMode> PM_MODE = new AtomicReference<>(PmMode.DEFAULT);
    private static final AtomicInteger PM_REQUEST_COUNT = new AtomicInteger(0);
    private static final AtomicReference<String> LAST_SERVICE_KEY = new AtomicReference<>(null);
    private static final AtomicReference<CountDownLatch> HANG_LATCH_REF =
            new AtomicReference<>(null);

    private static final String DEFAULT_LMS_SV_001_JSON =
            """
            [
              {
                "batchId": "IOC-JB-2026-09",
                "batchName": "IOC Java Backend 09/2026",
                "groupName": "Nhóm 2",
                "topicName": "Hệ thống đặt lịch phòng họp",
                "mentorEmail": "mentor1@rikkeijobs.test",
                "startDate": "2026-09-07",
                "endDate": "2026-10-30",
                "finalScore": 8.5,
                "tasks": [
                  {
                    "title": "API đặt phòng và kiểm trùng lịch",
                    "acceptedScore": 9,
                    "acceptedAt": "2026-09-25T17:00:00+07:00"
                  },
                  {
                    "title": "Phân quyền quản trị phòng",
                    "acceptedScore": 8,
                    "acceptedAt": "2026-10-09T17:00:00+07:00"
                  },
                  {
                    "title": "Báo cáo tần suất sử dụng phòng",
                    "acceptedScore": 8.5,
                    "acceptedAt": "2026-10-23T17:00:00+07:00"
                  }
                ]
              }
            ]
            """;

    private static final String UPDATED_LMS_SV_001_JSON =
            DEFAULT_LMS_SV_001_JSON.replace("\"finalScore\": 8.5", "\"finalScore\": 9.5");

    static {
        try {
            PM_SERVER =
                    HttpServer.create(
                            new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            PM_PORT = PM_SERVER.getAddress().getPort();
            PM_EXECUTOR = Executors.newCachedThreadPool();
            PM_SERVER.setExecutor(PM_EXECUTOR);

            PM_SERVER.createContext(
                    "/pm/students/",
                    exchange -> {
                        exchange.getRequestBody().readAllBytes();
                        PM_REQUEST_COUNT.incrementAndGet();
                        LAST_SERVICE_KEY.set(
                                exchange.getRequestHeaders().getFirst("X-Service-Key"));

                        PmMode mode = PM_MODE.get();
                        switch (mode) {
                            case HANG -> {
                                CountDownLatch latch = HANG_LATCH_REF.get();
                                if (latch != null) {
                                    try {
                                        latch.await(10, TimeUnit.SECONDS);
                                    } catch (InterruptedException ex) {
                                        Thread.currentThread().interrupt();
                                    }
                                }
                            }
                            case CLOSE_CONNECTION -> exchange.close();
                            case HTTP_500 ->
                                    writeJson(
                                            exchange,
                                            500,
                                            "{\"error\":\"secret=upstream-secret-token-xyz\"}");
                            case HTTP_404 -> writeJson(exchange, 404, "{\"error\":\"not found\"}");
                            case INVALID_JSON -> writeJson(exchange, 200, "{broken-json");
                            case UPDATED_SCORE -> {
                                String path = exchange.getRequestURI().getPath();
                                if (path.endsWith("/lms-sv-001/internships")) {
                                    writeJson(exchange, 200, UPDATED_LMS_SV_001_JSON);
                                } else {
                                    writeJson(exchange, 200, "[]");
                                }
                            }
                            case DEFAULT -> {
                                String path = exchange.getRequestURI().getPath();
                                if (path.endsWith("/lms-sv-001/internships")) {
                                    writeJson(exchange, 200, DEFAULT_LMS_SV_001_JSON);
                                } else {
                                    writeJson(exchange, 200, "[]");
                                }
                            }
                        }
                    });
            PM_SERVER.start();
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to start embedded PM test server", ex);
        }
    }

    private static void writeJson(
            com.sun.net.httpserver.HttpExchange exchange, int status, String body)
            throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    @AfterAll
    static void stopPmServer() {
        CountDownLatch latch = HANG_LATCH_REF.getAndSet(null);
        if (latch != null) {
            latch.countDown();
        }
        PM_SERVER.stop(0);
        PM_EXECUTOR.shutdownNow();
    }

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("external.api.base-url", () -> "http://127.0.0.1:" + PM_PORT);
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
    @Autowired private CandidatePublicService candidatePublicService;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private Clock clock;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        PM_MODE.set(PmMode.DEFAULT);
        PM_REQUEST_COUNT.set(0);
        LAST_SERVICE_KEY.set(null);
        HANG_LATCH_REF.set(null);
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        jdbcTemplate.update("DELETE FROM internship_tasks");
        jdbcTemplate.update("DELETE FROM internships");
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
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

    private User createTempCandidate(String lmsUserId, boolean mustChangePassword) {
        Role candidateRole = roleRepository.findByName("CANDIDATE").orElseThrow();
        User user =
                new User(
                        "temp-" + UUID.randomUUID() + "@rikkeijobs.test",
                        "hash",
                        "Temp Candidate",
                        lmsUserId,
                        candidateRole,
                        null);
        user.setStatus(UserStatus.ACTIVE);
        user.setMustChangePassword(mustChangePassword);
        return userRepository.save(user);
    }

    private void restoreUser1V4Seed() {
        jdbcTemplate.update(
                "DELETE FROM external_records WHERE user_id = 1 AND source = 'PM' AND source_code"
                        + " <> 'IOC-JB-2026-09'");
        jdbcTemplate.update(
                "UPDATE external_records SET title = 'IOC Java Backend 09/2026', score = 85.00,"
                        + " recorded_at = NOW() - INTERVAL '14 days' WHERE user_id = 1 AND source ="
                        + " 'PM' AND source_code = 'IOC-JB-2026-09'");
        candidatePublicService.recomputeCandidateSkills(1L);
    }

    @Test
    @DisplayName(
            "D5: Unauthenticated requests return 401 UNAUTHORIZED on both internship endpoints")
    void unauthenticatedRequestsReturn401() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/me/internships"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        mockMvc.perform(get("/api/v1/profiles/1/internships"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        assertEquals(0, PM_REQUEST_COUNT.get());
    }

    @Test
    @DisplayName(
            "D5: MENTOR, STAFF, ADMIN receive 403 FORBIDDEN on both endpoints; HR gets 403 on /me")
    void disallowedRolesReceive403Forbidden() throws Exception {
        for (String roleEmail :
                new String[] {
                    "mentor1@rikkeijobs.test", "staff1@rikkeijobs.test", "admin1@rikkeijobs.test"
                }) {
            mockMvc.perform(get("/api/v1/profiles/me/internships").with(asEmail(roleEmail)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));

            mockMvc.perform(get("/api/v1/profiles/2/internships").with(asEmail(roleEmail)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));

            mockMvc.perform(get("/api/v1/profiles/1/internships").with(asEmail(roleEmail)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        mockMvc.perform(get("/api/v1/profiles/me/internships").with(asEmail("hr2@rikkeijobs.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        assertEquals(0, PM_REQUEST_COUNT.get());
    }

    @Test
    @DisplayName(
            "D5: must_change_password=true users (hr1 & temp CANDIDATE) receive 403 MUST_CHANGE_PASSWORD")
    void mustChangePasswordUsersReceive403MustChangePassword() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/me/internships").with(asEmail("hr1@rikkeijobs.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));

        mockMvc.perform(get("/api/v1/profiles/2/internships").with(asEmail("hr1@rikkeijobs.test")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));

        User tempCandidate = createTempCandidate(null, true);
        try {
            mockMvc.perform(get("/api/v1/profiles/me/internships").with(asUser(tempCandidate)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));

            mockMvc.perform(
                            get("/api/v1/profiles/" + tempCandidate.getId() + "/internships")
                                    .with(asUser(tempCandidate)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));
        } finally {
            userRepository.deleteById(tempCandidate.getId());
        }
    }

    @Test
    @DisplayName(
            "D5: Invalid path userId (0, -5, abc) returns 400 VALIDATION_ERROR for CANDIDATE and HR")
    void invalidPathUserIdReturns400ValidationError() throws Exception {
        for (String actor : new String[] {"candidate1@rikkeijobs.test", "hr2@rikkeijobs.test"}) {
            mockMvc.perform(get("/api/v1/profiles/0/internships").with(asEmail(actor)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

            mockMvc.perform(get("/api/v1/profiles/-5/internships").with(asEmail(actor)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

            mockMvc.perform(get("/api/v1/profiles/abc/internships").with(asEmail(actor)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }
        assertEquals(0, PM_REQUEST_COUNT.get());
    }

    @Test
    @DisplayName(
            "D5: Uniform 404 NOT_FOUND for cross-user CANDIDATE and HR private/missing/own profile")
    void uniform404ForIdorAndPrivateOrMissingProfiles() throws Exception {
        String candidateCrossBody =
                mockMvc.perform(
                                get("/api/v1/profiles/2/internships")
                                        .with(asEmail("candidate1@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString(StandardCharsets.UTF_8);

        String candidateMissingBody =
                mockMvc.perform(
                                get("/api/v1/profiles/999999/internships")
                                        .with(asEmail("candidate1@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString(StandardCharsets.UTF_8);

        assertEquals(candidateMissingBody, candidateCrossBody);

        User hr2 = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();
        String hrPrivateBody =
                mockMvc.perform(
                                get("/api/v1/profiles/1/internships")
                                        .with(asEmail("hr2@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString(StandardCharsets.UTF_8);

        String hrMissingBody =
                mockMvc.perform(
                                get("/api/v1/profiles/999999/internships")
                                        .with(asEmail("hr2@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString(StandardCharsets.UTF_8);

        String hrOwnIdBody =
                mockMvc.perform(
                                get("/api/v1/profiles/" + hr2.getId() + "/internships")
                                        .with(asEmail("hr2@rikkeijobs.test")))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString(StandardCharsets.UTF_8);

        assertEquals(hrMissingBody, hrPrivateBody);
        assertEquals(hrMissingBody, hrOwnIdBody);
        assertEquals(0, PM_REQUEST_COUNT.get());
    }

    @Test
    @DisplayName(
            "D5 & D6: CANDIDATE /me syncs, own /{id} and HR public /{id} are stored-only, empty/null lmsUserId returns []")
    void happyPathSyncAndStoredOnlyReads() throws Exception {
        try {
            String happyJson =
                    mockMvc.perform(
                                    get("/api/v1/profiles/me/internships")
                                            .with(asEmail("candidate1@rikkeijobs.test")))
                            .andExpect(status().isOk())
                            .andExpect(jsonPath("$", hasSize(1)))
                            .andExpect(jsonPath("$[0].batchId").value("IOC-JB-2026-09"))
                            .andExpect(jsonPath("$[0].batchName").value("IOC Java Backend 09/2026"))
                            .andExpect(jsonPath("$[0].groupName").value("Nhóm 2"))
                            .andExpect(
                                    jsonPath("$[0].topicName").value("Hệ thống đặt lịch phòng họp"))
                            .andExpect(
                                    jsonPath("$[0].mentorEmail").value("mentor1@rikkeijobs.test"))
                            .andExpect(jsonPath("$[0].finalScore").value(8.5))
                            .andExpect(jsonPath("$[0].tasks", hasSize(3)))
                            .andExpect(
                                    jsonPath(
                                                    "$[0].tasks[?(@.title == 'API đặt phòng và kiểm trùng"
                                                            + " lịch')].acceptedScore")
                                            .value(hasItem(9.0)))
                            .andExpect(
                                    jsonPath(
                                                    "$[0].tasks[?(@.title == 'Phân quyền quản trị"
                                                            + " phòng')].acceptedScore")
                                            .value(hasItem(8.0)))
                            .andExpect(
                                    jsonPath(
                                                    "$[0].tasks[?(@.title == 'Báo cáo tần suất sử dụng"
                                                            + " phòng')].acceptedScore")
                                            .value(hasItem(8.5)))
                            .andReturn()
                            .getResponse()
                            .getContentAsString(StandardCharsets.UTF_8);

            JsonNode happyTree = objectMapper.readTree(happyJson);
            assertEquals(
                    BASE_INSTANT,
                    OffsetDateTime.parse(happyTree.get(0).path("syncedAt").asText()).toInstant());

            assertEquals(1, PM_REQUEST_COUNT.get());
            assertEquals("dev-key", LAST_SERVICE_KEY.get());

            PM_REQUEST_COUNT.set(0);
            mockMvc.perform(
                            get("/api/v1/profiles/1/internships")
                                    .with(asEmail("candidate1@rikkeijobs.test")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].batchId").value("IOC-JB-2026-09"));
            assertEquals(0, PM_REQUEST_COUNT.get());

            mockMvc.perform(
                            get("/api/v1/profiles/me/internships")
                                    .with(asEmail("candidate2@rikkeijobs.test")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
            assertEquals(1, PM_REQUEST_COUNT.get());

            PM_REQUEST_COUNT.set(0);
            User noLmsCandidate = createTempCandidate(null, false);
            try {
                mockMvc.perform(get("/api/v1/profiles/me/internships").with(asUser(noLmsCandidate)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(0)));
                assertEquals(0, PM_REQUEST_COUNT.get());
            } finally {
                userRepository.deleteById(noLmsCandidate.getId());
            }

            jdbcTemplate.update(
                    "INSERT INTO internships (user_id, batch_id, batch_name, group_name,"
                            + " topic_name, mentor_email, final_score, synced_at) VALUES (2,"
                            + " 'IOC-FE-2026-10', 'IOC React', 'Nhóm 1', 'Cổng tuyển dụng',"
                            + " 'mentor2@rikkeijobs.test', 9.00, NOW())");
            PM_REQUEST_COUNT.set(0);
            mockMvc.perform(
                            get("/api/v1/profiles/2/internships")
                                    .with(asEmail("hr2@rikkeijobs.test")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].batchId").value("IOC-FE-2026-10"));
            assertEquals(0, PM_REQUEST_COUNT.get());
        } finally {
            restoreUser1V4Seed();
        }
    }

    @Test
    @DisplayName(
            "D6: Empty DB returns 503 EXTERNAL_UNAVAILABLE within <=3500 ms with 0 retries on HANG/500/close")
    void emptyDbReturns503FastFailWhenPmUnavailable() throws Exception {
        CountDownLatch hangLatch = new CountDownLatch(1);
        HANG_LATCH_REF.set(hangLatch);
        PM_MODE.set(PmMode.HANG);
        try {
            long startNanos = System.nanoTime();
            mockMvc.perform(
                            get("/api/v1/profiles/me/internships")
                                    .with(asEmail("candidate1@rikkeijobs.test")))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.code").value("EXTERNAL_UNAVAILABLE"));
            long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            assertTrue(elapsedMs <= 3500L, "Expected fast-fail <= 3500 ms, took " + elapsedMs);
            assertEquals(1, PM_REQUEST_COUNT.get());
        } finally {
            hangLatch.countDown();
            HANG_LATCH_REF.set(null);
        }

        for (PmMode failMode : new PmMode[] {PmMode.HTTP_500, PmMode.CLOSE_CONNECTION}) {
            PM_REQUEST_COUNT.set(0);
            PM_MODE.set(failMode);
            long startNanos = System.nanoTime();
            mockMvc.perform(
                            get("/api/v1/profiles/me/internships")
                                    .with(asEmail("candidate1@rikkeijobs.test")))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.code").value("EXTERNAL_UNAVAILABLE"));
            long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            assertTrue(elapsedMs <= 3500L, "Expected fast-fail <= 3500 ms, took " + elapsedMs);
            if (failMode == PmMode.CLOSE_CONNECTION) {
                int count = PM_REQUEST_COUNT.get();
                assertTrue(count >= 1 && count <= 2, "Expected 1-2 requests on EOF, got " + count);
            } else {
                assertEquals(1, PM_REQUEST_COUNT.get());
            }
        }
    }

    @Test
    @DisplayName(
            "D6: Stored DB falls back to 200 within <=3500 ms on HANG/500/close/invalid JSON and logs 1 PII-free WARN")
    void storedDbFallsBackTo200WithPiiFreeWarnAcrossPmFailures() throws Exception {
        Logger serviceLogger = (Logger) LoggerFactory.getLogger(InternshipServiceImpl.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        serviceLogger.addAppender(appender);

        try {
            mockMvc.perform(
                            get("/api/v1/profiles/me/internships")
                                    .with(asEmail("candidate1@rikkeijobs.test")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            for (PmMode failMode :
                    new PmMode[] {
                        PmMode.HANG, PmMode.HTTP_500, PmMode.CLOSE_CONNECTION, PmMode.INVALID_JSON
                    }) {
                appender.list.clear();
                PM_REQUEST_COUNT.set(0);
                CountDownLatch hangLatch = failMode == PmMode.HANG ? new CountDownLatch(1) : null;
                HANG_LATCH_REF.set(hangLatch);
                PM_MODE.set(failMode);

                try {
                    long startNanos = System.nanoTime();
                    mockMvc.perform(
                                    get("/api/v1/profiles/me/internships")
                                            .with(asEmail("candidate1@rikkeijobs.test")))
                            .andExpect(status().isOk())
                            .andExpect(jsonPath("$", hasSize(1)))
                            .andExpect(jsonPath("$[0].batchId").value("IOC-JB-2026-09"))
                            .andExpect(jsonPath("$[0].tasks", hasSize(3)));
                    long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
                    assertTrue(
                            elapsedMs <= 3500L,
                            "Expected fast-fail <= 3500 ms for "
                                    + failMode
                                    + ", took "
                                    + elapsedMs);
                    if (failMode == PmMode.CLOSE_CONNECTION) {
                        int count = PM_REQUEST_COUNT.get();
                        assertTrue(
                                count >= 1 && count <= 2,
                                "Expected 1-2 requests on EOF, got " + count);
                    } else {
                        assertEquals(1, PM_REQUEST_COUNT.get());
                    }
                } finally {
                    if (hangLatch != null) {
                        hangLatch.countDown();
                        HANG_LATCH_REF.set(null);
                    }
                }

                List<ILoggingEvent> warns =
                        appender.list.stream().filter(e -> e.getLevel() == Level.WARN).toList();
                assertEquals(1, warns.size(), "Expected 1 WARN for " + failMode);
                String warnMsg = warns.getFirst().getFormattedMessage();
                assertTrue(warnMsg.contains("returning 1 cached record(s)"));
                assertFalse(warnMsg.contains("candidate1@rikkeijobs.test"));
                assertFalse(warnMsg.contains("lms-sv-001"));
                assertFalse(warnMsg.contains("dev-key"));
                assertFalse(warnMsg.contains("upstream-secret-token-xyz"));
            }
        } finally {
            serviceLogger.detachAppender(appender);
            appender.stop();
            restoreUser1V4Seed();
        }
    }

    @Test
    @DisplayName(
            "D7: Repeated syncs remain idempotent across DB tables and score update propagates to /me/skills")
    void repeatedSyncsAreIdempotentAndScoreUpdatePropagatesToSkills() throws Exception {
        try {
            mockMvc.perform(
                            get("/api/v1/profiles/me/internships")
                                    .with(asEmail("candidate1@rikkeijobs.test")))
                    .andExpect(status().isOk());

            ((MutableClock) clock).fastForward(Duration.ofMinutes(5));
            String secondSyncJson =
                    mockMvc.perform(
                                    get("/api/v1/profiles/me/internships")
                                            .with(asEmail("candidate1@rikkeijobs.test")))
                            .andExpect(status().isOk())
                            .andReturn()
                            .getResponse()
                            .getContentAsString(StandardCharsets.UTF_8);

            JsonNode secondTree = objectMapper.readTree(secondSyncJson);
            assertEquals(
                    BASE_INSTANT.plus(Duration.ofMinutes(5)),
                    OffsetDateTime.parse(secondTree.get(0).path("syncedAt").asText()).toInstant());

            assertEquals(
                    1,
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM internships WHERE user_id = 1", Integer.class));
            assertEquals(
                    3,
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM internship_tasks t JOIN internships i ON"
                                    + " t.internship_id = i.id WHERE i.user_id = 1",
                            Integer.class));
            assertEquals(
                    1,
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM external_records WHERE user_id = 1 AND source ="
                                    + " 'PM' AND source_code = 'IOC-JB-2026-09'",
                            Integer.class));
            assertEquals(
                    4,
                    jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM skill_evidences WHERE user_id = 1 AND source ="
                                    + " 'INTERNSHIP' AND source_ref = 'IOC-JB-2026-09'",
                            Integer.class));

            PM_MODE.set(PmMode.UPDATED_SCORE);
            ((MutableClock) clock).fastForward(Duration.ofMinutes(10));

            mockMvc.perform(
                            get("/api/v1/profiles/me/internships")
                                    .with(asEmail("candidate1@rikkeijobs.test")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].finalScore").value(9.5));

            BigDecimal updatedExternalScore =
                    jdbcTemplate.queryForObject(
                            "SELECT score FROM external_records WHERE user_id = 1 AND source ="
                                    + " 'PM' AND source_code = 'IOC-JB-2026-09'",
                            BigDecimal.class);
            assertEquals(new BigDecimal("95.00"), updatedExternalScore);

            mockMvc.perform(
                            get("/api/v1/profiles/me/skills")
                                    .with(asEmail("candidate1@rikkeijobs.test")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.skill.code == 'JAVA')].verifiedScore").value(80.47))
                    .andExpect(jsonPath("$[?(@.skill.code == 'AGILE')].verifiedScore").value(95.0));
        } finally {
            restoreUser1V4Seed();
        }
    }
}
