package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.candidate.dto.ManualOverrideRequest;
import com.rikkei.jobs.candidate.dto.SyncRunResponse;
import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import com.rikkei.jobs.candidate.service.ExternalSyncService;
import com.rikkei.jobs.candidate.service.StaffDataSyncService;
import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.internship.service.InternshipSyncService;
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
import java.util.List;
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
@DisplayName("F1 Real-Flow PM Source Payload Consistency Between NT-05 and TT-01")
class PmPayloadConsistencyIntegrationTest {

    private static final Instant BASE_INSTANT = Instant.parse("2026-11-26T10:00:00Z");

    private static final String PM_WITH_EXTRA_FIELDS_AND_OFFSET =
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
                "unknownBatchField": "keep-me-verbatim",
                "tasks": [
                  {
                    "title": "API đặt phòng và kiểm trùng lịch",
                    "acceptedScore": 9,
                    "acceptedAt": "2026-09-25T17:00:00+07:00",
                    "extraTaskMeta": {
                      "reviewer": "mentor-a",
                      "approved": true
                    }
                  }
                ]
              }
            ]
            """;

    private static final HttpServer MOCK_SERVER;
    private static final int MOCK_PORT;
    private static final AtomicReference<String> PM_BODY =
            new AtomicReference<>(PM_WITH_EXTRA_FIELDS_AND_OFFSET);

    static {
        try {
            MOCK_SERVER =
                    HttpServer.create(
                            new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            MOCK_PORT = MOCK_SERVER.getAddress().getPort();
            MOCK_SERVER.createContext(
                    "/",
                    exchange -> {
                        String path = exchange.getRequestURI().getRawPath();
                        String body = "[]";
                        if (path.equals("/lms/students/lms-sv-001/results")) {
                            body =
                                    """
                                    [
                                      {"subjectCode":"JAVA01","subjectName":"Lập trình Java","score":8.5,"attendanceRate":95,"homeworkRate":90,"rpoint":120},
                                      {"subjectCode":"SQL01","subjectName":"Cơ sở dữ liệu","score":8.0,"attendanceRate":92,"homeworkRate":88,"rpoint":95},
                                      {"subjectCode":"SPRING01","subjectName":"Spring Boot","score":7.5,"attendanceRate":90,"homeworkRate":85,"rpoint":80},
                                      {"subjectCode":"WEB01","subjectName":"HTML/CSS/JavaScript","score":7.0,"attendanceRate":88,"homeworkRate":80,"rpoint":60},
                                      {"subjectCode":"GIT01","subjectName":"Git và làm việc nhóm","score":9.0,"attendanceRate":100,"homeworkRate":100,"rpoint":50}
                                    ]
                                    """;
                        } else if (path.equals("/exam/students/lms-sv-001/results")) {
                            body =
                                    """
                                    [
                                      {"examCode":"EX-JAVA-2026-10","subjectCode":"JAVA01","score":8.0,"takenAt":"2026-10-20T08:00:00+07:00"}
                                    ]
                                    """;
                        } else if (path.equals("/pm/students/lms-sv-001/internships")) {
                            body = PM_BODY.get();
                        }
                        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                        exchange.getResponseHeaders()
                                .set("Content-Type", "application/json; charset=UTF-8");
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
    @Autowired private InternshipSyncService internshipSyncService;
    @Autowired private StaffDataSyncService staffDataSyncService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private Clock clock;

    @BeforeEach
    void reset() {
        PM_BODY.set(PM_WITH_EXTRA_FIELDS_AND_OFFSET);
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        jdbcTemplate.update("DELETE FROM manual_overrides");
        jdbcTemplate.update("DELETE FROM sync_runs");
        jdbcTemplate.update("DELETE FROM internship_tasks");
        jdbcTemplate.update("DELETE FROM internships");
    }

    @Test
    @DisplayName(
            "Alternating NT-05 sync and TT-01 syncInternships preserves raw source payload, synced_at, evidences, and yields pm updated=0")
    void alternatingNt05AndTt01DoesNotFlipPayloadOrTriggerRecompute() throws Exception {
        SyncRunResponse initialRun = externalSyncService.syncUser(1L, SyncTrigger.MANUAL);
        assertEquals(SyncStatus.SUCCESS, initialRun.status());

        OffsetDateTime syncedAtAfterNt05 =
                jdbcTemplate.queryForObject(
                        "SELECT synced_at FROM external_records WHERE source = 'PM' AND source_key = '1:IOC-JB-2026-09'",
                        OffsetDateTime.class);
        String payloadAfterNt05 =
                jdbcTemplate.queryForObject(
                        "SELECT payload::text FROM external_records WHERE source = 'PM' AND source_key = '1:IOC-JB-2026-09'",
                        String.class);
        List<Long> evidenceIdsAfterNt05 =
                jdbcTemplate.queryForList(
                        "SELECT id FROM skill_evidences WHERE user_id = 1 AND source = 'INTERNSHIP' AND source_ref = 'IOC-JB-2026-09' ORDER BY id",
                        Long.class);

        JsonNode nt05Tree = objectMapper.readTree(payloadAfterNt05);
        assertEquals("keep-me-verbatim", nt05Tree.path("unknownBatchField").asText());
        assertEquals(
                "2026-09-25T17:00:00+07:00",
                nt05Tree.path("tasks").get(0).path("acceptedAt").asText());
        assertTrue(
                nt05Tree.path("tasks").get(0).path("extraTaskMeta").path("approved").asBoolean());

        // Advance clock and run TT-01 syncInternships with identical PM upstream response
        ((MutableClock) clock).fastForward(Duration.ofMinutes(5));
        int syncedBatches = internshipSyncService.syncInternships(1L, "lms-sv-001");
        assertEquals(1, syncedBatches);

        OffsetDateTime syncedAtAfterTt01 =
                jdbcTemplate.queryForObject(
                        "SELECT synced_at FROM external_records WHERE source = 'PM' AND source_key = '1:IOC-JB-2026-09'",
                        OffsetDateTime.class);
        String payloadAfterTt01 =
                jdbcTemplate.queryForObject(
                        "SELECT payload::text FROM external_records WHERE source = 'PM' AND source_key = '1:IOC-JB-2026-09'",
                        String.class);
        List<Long> evidenceIdsAfterTt01 =
                jdbcTemplate.queryForList(
                        "SELECT id FROM skill_evidences WHERE user_id = 1 AND source = 'INTERNSHIP' AND source_ref = 'IOC-JB-2026-09' ORDER BY id",
                        Long.class);

        assertEquals(syncedAtAfterNt05.toInstant(), syncedAtAfterTt01.toInstant());
        assertEquals(evidenceIdsAfterNt05, evidenceIdsAfterTt01);
        assertEquals(nt05Tree, objectMapper.readTree(payloadAfterTt01));

        // Advance clock and run NT-05 syncUser again -> pm.updated must be 0
        ((MutableClock) clock).fastForward(Duration.ofMinutes(5));
        SyncRunResponse secondRun = externalSyncService.syncUser(1L, SyncTrigger.MANUAL);
        assertEquals(SyncStatus.SUCCESS, secondRun.status());
        assertEquals(0, secondRun.counts().pm().updated());
        assertEquals(1, secondRun.counts().pm().unchanged());

        // Apply manual override and ensure alternating TT-01 <-> NT-05 keeps override & zero flip
        Long pmRecordId =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM external_records WHERE source = 'PM' AND source_key = '1:IOC-JB-2026-09'",
                        Long.class);
        staffDataSyncService.applyOverride(
                pmRecordId, new ManualOverrideRequest("finalScore", 9.0, "Phúc khảo PM"), 7L);

        OffsetDateTime syncedAtAfterOverride =
                jdbcTemplate.queryForObject(
                        "SELECT synced_at FROM external_records WHERE id = ?",
                        OffsetDateTime.class,
                        pmRecordId);
        List<Long> evidenceIdsAfterOverride =
                jdbcTemplate.queryForList(
                        "SELECT id FROM skill_evidences WHERE user_id = 1 AND source = 'INTERNSHIP' AND source_ref = 'IOC-JB-2026-09' ORDER BY id",
                        Long.class);

        ((MutableClock) clock).fastForward(Duration.ofMinutes(5));
        internshipSyncService.syncInternships(1L, "lms-sv-001");

        BigDecimal scoreAfterTt01 =
                jdbcTemplate.queryForObject(
                        "SELECT score FROM external_records WHERE id = ?",
                        BigDecimal.class,
                        pmRecordId);
        OffsetDateTime syncedAtAfterTt01WithOverride =
                jdbcTemplate.queryForObject(
                        "SELECT synced_at FROM external_records WHERE id = ?",
                        OffsetDateTime.class,
                        pmRecordId);
        List<Long> evidenceIdsAfterTt01WithOverride =
                jdbcTemplate.queryForList(
                        "SELECT id FROM skill_evidences WHERE user_id = 1 AND source = 'INTERNSHIP' AND source_ref = 'IOC-JB-2026-09' ORDER BY id",
                        Long.class);
        assertEquals(new BigDecimal("90.00"), scoreAfterTt01);
        assertEquals(syncedAtAfterOverride.toInstant(), syncedAtAfterTt01WithOverride.toInstant());
        assertEquals(evidenceIdsAfterOverride, evidenceIdsAfterTt01WithOverride);

        ((MutableClock) clock).fastForward(Duration.ofMinutes(5));
        SyncRunResponse thirdRun = externalSyncService.syncUser(1L, SyncTrigger.MANUAL);
        assertEquals(0, thirdRun.counts().pm().updated());
        assertEquals(1, thirdRun.counts().pm().unchanged());
    }
}
