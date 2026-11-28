package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.candidate.dto.SyncRunResponse;
import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import com.rikkei.jobs.candidate.service.ExternalSyncService;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(properties = {"app.sync.on-open-enabled=false", "app.sync.nightly-cron=-"})
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("NT-05 ExternalSyncService D3-D6 Integration, Freshness, Concurrency & Rollback Tests")
class ExternalSyncServiceIntegrationTest {

    private static final Instant BASE_INSTANT = Instant.parse("2026-11-26T10:00:00Z");

    private enum Mode {
        NORMAL,
        UPDATED_SCORE,
        DUPLICATE_AND_NULLS,
        MALFORMED_CODE,
        INVALID_JSON,
        HTTP_401,
        HTTP_404,
        HTTP_500,
        FRESHNESS_RACE,
        NETWORK_RETRY_TWICE
    }

    private static final HttpServer MOCK_SERVER;
    private static final ExecutorService MOCK_EXECUTOR;
    private static final int MOCK_PORT;
    private static final AtomicReference<Mode> MODE = new AtomicReference<>(Mode.NORMAL);
    private static final AtomicReference<CountDownLatch> RACE_FETCH_ENTERED =
            new AtomicReference<>(null);
    private static final AtomicReference<CountDownLatch> RACE_FETCH_RELEASE =
            new AtomicReference<>(null);
    private static final AtomicInteger LMS_ATTEMPTS = new AtomicInteger(0);
    private static final AtomicInteger EXAM_ATTEMPTS = new AtomicInteger(0);
    private static final AtomicInteger PM_ATTEMPTS = new AtomicInteger(0);

    static {
        try {
            MOCK_EXECUTOR = Executors.newCachedThreadPool();
            MOCK_SERVER =
                    HttpServer.create(
                            new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            MOCK_SERVER.setExecutor(MOCK_EXECUTOR);
            MOCK_PORT = MOCK_SERVER.getAddress().getPort();
            MOCK_SERVER.createContext(
                    "/",
                    exchange -> {
                        String path = exchange.getRequestURI().getRawPath();
                        Mode mode = MODE.get();
                        if (mode == Mode.HTTP_401) {
                            send(exchange, 401, "{\"code\":\"INVALID_SERVICE_KEY\"}");
                            return;
                        }
                        if (mode == Mode.HTTP_404) {
                            send(exchange, 404, "{\"code\":\"NOT_FOUND\"}");
                            return;
                        }
                        if (mode == Mode.HTTP_500) {
                            send(exchange, 500, "{\"code\":\"INTERNAL_ERROR\"}");
                            return;
                        }
                        if (mode == Mode.INVALID_JSON) {
                            send(exchange, 200, "{broken-json");
                            return;
                        }
                        if (mode == Mode.NETWORK_RETRY_TWICE) {
                            if (path.startsWith("/lms/") && LMS_ATTEMPTS.incrementAndGet() <= 2) {
                                exchange.close();
                                return;
                            }
                            if (path.startsWith("/exam/") && EXAM_ATTEMPTS.incrementAndGet() <= 2) {
                                exchange.close();
                                return;
                            }
                            if (path.startsWith("/pm/") && PM_ATTEMPTS.incrementAndGet() <= 2) {
                                exchange.close();
                                return;
                            }
                        }
                        if (mode == Mode.FRESHNESS_RACE && path.contains("lms-race")) {
                            CountDownLatch entered = RACE_FETCH_ENTERED.get();
                            CountDownLatch release = RACE_FETCH_RELEASE.get();
                            if (entered != null && release != null) {
                                entered.countDown();
                                try {
                                    release.await(15, TimeUnit.SECONDS);
                                } catch (InterruptedException ie) {
                                    Thread.currentThread().interrupt();
                                }
                                send(
                                        exchange,
                                        200,
                                        path.startsWith("/lms/")
                                                ? "[{\"subjectCode\":\"JAVA01\",\"subjectName\":\"Stale Java\",\"score\":4.0}]"
                                                : "[]");
                                return;
                            }
                        }

                        if (path.equals("/lms/students/lms-sv-001/results")) {
                            if (mode == Mode.UPDATED_SCORE) {
                                send(
                                        exchange,
                                        200,
                                        """
                                        [
                                          {"subjectCode":"JAVA01","subjectName":"Lập trình Java","score":9.5,"attendanceRate":98,"homeworkRate":95,"rpoint":140},
                                          {"subjectCode":"SQL01","subjectName":"Cơ sở dữ liệu","score":8.0,"attendanceRate":92,"homeworkRate":88,"rpoint":95},
                                          {"subjectCode":"SPRING01","subjectName":"Spring Boot","score":7.5,"attendanceRate":90,"homeworkRate":85,"rpoint":80},
                                          {"subjectCode":"WEB01","subjectName":"HTML/CSS/JavaScript","score":7.0,"attendanceRate":88,"homeworkRate":80,"rpoint":60},
                                          {"subjectCode":"GIT01","subjectName":"Git và làm việc nhóm","score":9.0,"attendanceRate":100,"homeworkRate":100,"rpoint":50}
                                        ]
                                        """);
                                return;
                            }
                            if (mode == Mode.DUPLICATE_AND_NULLS) {
                                send(
                                        exchange,
                                        200,
                                        """
                                        [
                                          {"subjectCode":"JAVA01","subjectName":"First","score":5.0},
                                          {"subjectCode":"JAVA01","subjectName":"Last Wins","score":9.255},
                                          {"subjectCode":"NULL01","subjectName":"No Score","score":null},
                                          {"subjectCode":"CLAMP01","subjectName":"","score":12.5}
                                        ]
                                        """);
                                return;
                            }
                            if (mode == Mode.MALFORMED_CODE) {
                                send(
                                        exchange,
                                        200,
                                        "[{\"subjectCode\":\"   \",\"subjectName\":\"Bad\",\"score\":8.0}]");
                                return;
                            }
                            send(
                                    exchange,
                                    200,
                                    """
                                    [
                                      {"subjectCode":"JAVA01","subjectName":"Lập trình Java","score":8.5,"attendanceRate":95,"homeworkRate":90,"rpoint":120},
                                      {"subjectCode":"SQL01","subjectName":"Cơ sở dữ liệu","score":8.0,"attendanceRate":92,"homeworkRate":88,"rpoint":95},
                                      {"subjectCode":"SPRING01","subjectName":"Spring Boot","score":7.5,"attendanceRate":90,"homeworkRate":85,"rpoint":80},
                                      {"subjectCode":"WEB01","subjectName":"HTML/CSS/JavaScript","score":7.0,"attendanceRate":88,"homeworkRate":80,"rpoint":60},
                                      {"subjectCode":"GIT01","subjectName":"Git và làm việc nhóm","score":9.0,"attendanceRate":100,"homeworkRate":100,"rpoint":50}
                                    ]
                                    """);
                            return;
                        }
                        if (path.equals("/exam/students/lms-sv-001/results")) {
                            send(
                                    exchange,
                                    200,
                                    """
                                    [
                                      {"examCode":"EX-JAVA-2026-10","subjectCode":"JAVA01","score":8.0,"takenAt":"2026-10-20T08:00:00+07:00"}
                                    ]
                                    """);
                            return;
                        }
                        if (path.equals("/pm/students/lms-sv-001/internships")) {
                            send(
                                    exchange,
                                    200,
                                    """
                                    [
                                      {
                                        "batchId":"IOC-JB-2026-09",
                                        "batchName":"IOC Java Backend 09/2026",
                                        "groupName":"Nhóm 2",
                                        "topicName":"Hệ thống đặt lịch phòng họp",
                                        "mentorEmail":"mentor1@rikkeijobs.test",
                                        "startDate":"2026-09-07",
                                        "endDate":"2026-10-30",
                                        "finalScore":8.5,
                                        "tasks":[]
                                      }
                                    ]
                                    """);
                            return;
                        }
                        send(exchange, 200, "[]");
                    });
            MOCK_SERVER.start();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static void send(com.sun.net.httpserver.HttpExchange exchange, int status, String body)
            throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    @AfterAll
    static void stopServer() {
        MOCK_SERVER.stop(0);
        MOCK_EXECUTOR.shutdownNow();
    }

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("external.api.base-url", () -> "http://127.0.0.1:" + MOCK_PORT);
        registry.add("external.api.service-key", () -> "secret-key-never-leak");
        registry.add("external.api.timeout-seconds", () -> "5");
        registry.add("external.api.max-retries", () -> "2");
    }

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(BASE_INSTANT, ZoneOffset.UTC);
        }
    }

    @Autowired private ExternalSyncService externalSyncService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private Clock clock;

    @BeforeEach
    void reset() {
        MODE.set(Mode.NORMAL);
        LMS_ATTEMPTS.set(0);
        EXAM_ATTEMPTS.set(0);
        PM_ATTEMPTS.set(0);
        RACE_FETCH_ENTERED.set(null);
        RACE_FETCH_RELEASE.set(null);
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        jdbcTemplate.update("DELETE FROM manual_overrides");
        jdbcTemplate.update("DELETE FROM sync_runs");
    }

    @Test
    @DisplayName("Eligibility: unknown or non-candidate -> 404; candidate without lmsUserId -> 400")
    void eligibilityRejectsUnknownNonCandidateAndMissingLmsUserId() {
        assertThrows(
                ResourceNotFoundException.class,
                () -> externalSyncService.syncUser(999999L, SyncTrigger.MANUAL));
        // user 7 = staff1
        assertThrows(
                ResourceNotFoundException.class,
                () -> externalSyncService.syncUser(7L, SyncTrigger.MANUAL));

        Role candRole = roleRepository.findByName(Role.CANDIDATE).orElseThrow();
        User noLms =
                userRepository.save(
                        new User(
                                "nolms@rikkeijobs.test",
                                "hash",
                                "No LMS User",
                                null,
                                candRole,
                                null));
        try {
            ValidationException ex =
                    assertThrows(
                            ValidationException.class,
                            () -> externalSyncService.syncUser(noLms.getId(), SyncTrigger.MANUAL));
            assertTrue(ex.getMessage().contains("lms_user_id") || ex.getMessage().contains("LMS"));
        } finally {
            userRepository.deleteById(noLms.getId());
        }
    }

    @Test
    @DisplayName("Unchanged mock sync preserves candidate1 HS-01 baselines and #h historical row")
    void unchangedMockSyncPreservesCandidate1BaselinesAndHistory() {
        SyncRunResponse run = externalSyncService.syncUser(1L, SyncTrigger.MANUAL);
        assertEquals(SyncStatus.SUCCESS, run.status());
        assertEquals(SyncTrigger.MANUAL, run.trigger());
        assertEquals(1L, run.userId());
        assertEquals(5, run.counts().lms().fetched());
        assertEquals(1, run.counts().exam().fetched());
        assertEquals(1, run.counts().pm().fetched());

        Integer skillCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM skill_scores WHERE user_id = 1", Integer.class);
        assertEquals(13, skillCount);

        BigDecimal javaScore =
                jdbcTemplate.queryForObject(
                        "SELECT ss.verified_score FROM skill_scores ss JOIN skills s ON s.id = ss.skill_id WHERE ss.user_id = 1 AND s.code = 'JAVA'",
                        BigDecimal.class);
        assertEquals(new BigDecimal("79.07"), javaScore);

        // Historical 500-day-old LMS JAVA01#h row must still exist!
        Integer lmsJavaCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM external_records WHERE user_id = 1 AND source = 'LMS' AND source_code = 'JAVA01'",
                        Integer.class);
        assertEquals(2, lmsJavaCount);

        // PM recordedAt is set from endDate 2026-10-30 at 00:00 Asia/Ho_Chi_Minh
        OffsetDateTime pmRecordedAt =
                jdbcTemplate.queryForObject(
                        "SELECT recorded_at FROM external_records WHERE user_id = 1 AND source = 'PM' AND source_code = 'IOC-JB-2026-09'",
                        OffsetDateTime.class);
        assertNotNull(pmRecordedAt);
        assertEquals(
                OffsetDateTime.parse("2026-10-30T00:00:00+07:00").toInstant(),
                pmRecordedAt.toInstant());
    }

    @Test
    @DisplayName("R4: NT-05 sync calls LMS, Exam, and PM with 5s + 2 network retries")
    void r4AllThreeEndpointsRetryTwiceOnNetworkErrors() {
        MODE.set(Mode.NETWORK_RETRY_TWICE);
        SyncRunResponse run = externalSyncService.syncUser(1L, SyncTrigger.MANUAL);
        assertEquals(SyncStatus.SUCCESS, run.status());
        assertEquals(3, LMS_ATTEMPTS.get());
        assertEquals(3, EXAM_ATTEMPTS.get());
        assertEquals(3, PM_ATTEMPTS.get());
    }

    @Test
    @DisplayName(
            "D3 normalization: duplicate codes last-wins, HALF_UP rounding, clamp, fallback title, skip null")
    void normalizationHandlesDuplicatesRoundingClampFallbackAndNullSkip() throws Exception {
        MODE.set(Mode.DUPLICATE_AND_NULLS);
        SyncRunResponse run = externalSyncService.syncUser(1L, SyncTrigger.MANUAL);
        assertEquals(SyncStatus.SUCCESS, run.status());
        assertEquals(4, run.counts().lms().fetched());
        assertEquals(1, run.counts().lms().skipped());

        BigDecimal javaScore =
                jdbcTemplate.queryForObject(
                        "SELECT score FROM external_records WHERE source = 'LMS' AND source_key = '1:JAVA01'",
                        BigDecimal.class);
        assertEquals(new BigDecimal("92.55"), javaScore);

        String clampTitle =
                jdbcTemplate.queryForObject(
                        "SELECT title FROM external_records WHERE source = 'LMS' AND source_key = '1:CLAMP01'",
                        String.class);
        BigDecimal clampScore =
                jdbcTemplate.queryForObject(
                        "SELECT score FROM external_records WHERE source = 'LMS' AND source_key = '1:CLAMP01'",
                        BigDecimal.class);
        assertEquals("CLAMP01", clampTitle);
        assertEquals(new BigDecimal("100.00"), clampScore);

        String payloadStr =
                jdbcTemplate.queryForObject(
                        "SELECT payload::text FROM external_records WHERE source = 'LMS' AND source_key = '1:JAVA01'",
                        String.class);
        JsonNode payload = objectMapper.readTree(payloadStr);
        assertEquals("Last Wins", payload.get("subjectName").asText());

        // Cleanup synthetic records and restore seed
        jdbcTemplate.update(
                "DELETE FROM external_records WHERE user_id = 1 AND source_code IN ('CLAMP01')");
        MODE.set(Mode.NORMAL);
        externalSyncService.syncUser(1L, SyncTrigger.MANUAL);
    }

    @Test
    @DisplayName(
            "D4/D6: 401/404/500/malformed JSON roll back DB, persist sanitized FAILED run, and throw 503 for MANUAL")
    void failuresRollbackPersistFailedRunWithSanitizedErrorAndThrow503() {
        externalSyncService.syncUser(1L, SyncTrigger.MANUAL);
        BigDecimal scoreBefore =
                jdbcTemplate.queryForObject(
                        "SELECT score FROM external_records WHERE source = 'LMS' AND source_key = '1:JAVA01'",
                        BigDecimal.class);

        for (Mode failMode :
                List.of(
                        Mode.HTTP_401,
                        Mode.HTTP_404,
                        Mode.HTTP_500,
                        Mode.INVALID_JSON,
                        Mode.MALFORMED_CODE)) {
            MODE.set(failMode);
            ExternalUnavailableException ex =
                    assertThrows(
                            ExternalUnavailableException.class,
                            () -> externalSyncService.syncUser(1L, SyncTrigger.MANUAL));
            assertEquals("EXTERNAL_UNAVAILABLE", ex.getCode());
        }

        BigDecimal scoreAfter =
                jdbcTemplate.queryForObject(
                        "SELECT score FROM external_records WHERE source = 'LMS' AND source_key = '1:JAVA01'",
                        BigDecimal.class);
        assertEquals(0, scoreBefore.compareTo(scoreAfter));

        List<String> failedErrors =
                jdbcTemplate.queryForList(
                        "SELECT error FROM sync_runs WHERE user_id = 1 AND status = 'FAILED' ORDER BY id DESC",
                        String.class);
        assertEquals(5, failedErrors.size());
        for (String err : failedErrors) {
            assertNotNull(err);
            assertFalse(err.isBlank());
            assertTrue(err.length() <= 500);
            assertFalse(err.contains("secret-key-never-leak"));
            assertFalse(err.contains("candidate1@rikkeijobs.test"));
            assertFalse(err.contains("Exception"));
        }
    }

    @Test
    @DisplayName(
            "D4 freshness invariant: older fetch finishing later never overwrites newer committed sync")
    void freshnessInvariantPreventsOlderFetchFromOverwritingNewerData() throws Exception {
        Role candRole = roleRepository.findByName(Role.CANDIDATE).orElseThrow();
        User raceUser =
                userRepository.save(
                        new User(
                                "race.fresh@rikkeijobs.test",
                                "hash",
                                "Race User",
                                "lms-race",
                                candRole,
                                null));
        try {
            CountDownLatch entered = new CountDownLatch(1);
            CountDownLatch release = new CountDownLatch(1);
            RACE_FETCH_ENTERED.set(entered);
            RACE_FETCH_RELEASE.set(release);
            MODE.set(Mode.FRESHNESS_RACE);

            try (ExecutorService exec = Executors.newSingleThreadExecutor()) {
                // Thread 1 starts fetch at BASE_INSTANT (older) and pauses during HTTP fetch
                Future<SyncRunResponse> olderFuture =
                        exec.submit(
                                () ->
                                        externalSyncService.syncUser(
                                                raceUser.getId(), SyncTrigger.MANUAL));
                assertTrue(entered.await(10, TimeUnit.SECONDS));

                // Advance clock by 10 seconds for newer fetch, temporarily bypass latch
                RACE_FETCH_ENTERED.set(null);
                ((MutableClock) clock).setInstant(BASE_INSTANT.plusSeconds(10));
                MODE.set(Mode.NORMAL);

                // Seed newer data directly via a second sync (mock returns [] for lms-race, or
                // insert canonical row via newer sync)
                jdbcTemplate.update(
                        "INSERT INTO external_records (user_id, source, source_code, source_key, title, score, recorded_at, payload, synced_at)"
                                + " VALUES (?, 'LMS', 'JAVA01', ?, 'Newer Java', 95.00, NOW(), '{}'::jsonb, NOW())",
                        raceUser.getId(),
                        raceUser.getId() + ":JAVA01");
                SyncRunResponse newerRun =
                        externalSyncService.syncUser(raceUser.getId(), SyncTrigger.MANUAL);
                assertEquals(SyncStatus.SUCCESS, newerRun.status());

                // Release older fetch (which fetched score 4.0 -> 40.00 at BASE_INSTANT)
                MODE.set(Mode.FRESHNESS_RACE);
                release.countDown();
                SyncRunResponse olderRun = olderFuture.get(15, TimeUnit.SECONDS);
                assertEquals(SyncStatus.SUCCESS, olderRun.status());
                assertNull(olderRun.error());

                // Newer score 95.00 MUST NOT be overwritten by older fetch's 40.00
                BigDecimal currentScore =
                        jdbcTemplate.queryForObject(
                                "SELECT score FROM external_records WHERE source = 'LMS' AND source_key = ?",
                                BigDecimal.class,
                                raceUser.getId() + ":JAVA01");
                assertEquals(new BigDecimal("95.00"), currentScore);
            }
        } finally {
            jdbcTemplate.update("DELETE FROM skill_scores WHERE user_id = ?", raceUser.getId());
            jdbcTemplate.update("DELETE FROM skill_evidences WHERE user_id = ?", raceUser.getId());
            jdbcTemplate.update("DELETE FROM external_records WHERE user_id = ?", raceUser.getId());
            jdbcTemplate.update("DELETE FROM sync_runs WHERE user_id = ?", raceUser.getId());
            userRepository.deleteById(raceUser.getId());
        }
    }

    @Test
    @DisplayName("10 parallel manual syncs on one user produce zero errors and zero duplicates")
    void tenParallelManualSyncsProduceNoErrorsOrDuplicates() throws Exception {
        int threads = 10;
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        List<Future<SyncRunResponse>> futures = new ArrayList<>(threads);
        try (ExecutorService exec = Executors.newFixedThreadPool(threads)) {
            for (int i = 0; i < threads; i++) {
                futures.add(
                        exec.submit(
                                () -> {
                                    ready.countDown();
                                    start.await();
                                    try {
                                        return externalSyncService.syncUser(1L, SyncTrigger.MANUAL);
                                    } finally {
                                        done.countDown();
                                    }
                                }));
            }
            assertTrue(ready.await(15, TimeUnit.SECONDS));
            start.countDown();
            assertTrue(done.await(30, TimeUnit.SECONDS));
            for (Future<SyncRunResponse> f : futures) {
                SyncRunResponse resp = f.get();
                assertEquals(SyncStatus.SUCCESS, resp.status());
            }
        }

        Integer recordCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM external_records WHERE user_id = 1", Integer.class);
        assertEquals(8, recordCount);

        Integer verifiedCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM skill_evidences WHERE user_id = 1 AND verified = TRUE",
                        Integer.class);
        assertEquals(17, verifiedCount);
    }
}
