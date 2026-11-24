package com.rikkei.jobs.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.ai.config.AiGovernanceProperties;
import com.rikkei.jobs.ai.dto.AiLogPage;
import com.rikkei.jobs.ai.repository.AiLogRepository;
import com.rikkei.jobs.ai.service.AiLogRetentionJob;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@ActiveProfiles("dev")
@Import(AiLogRetentionIntegrationTest.FixedClock.class)
class AiLogRetentionIntegrationTest {

    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18.6-alpine");
    private static final long ADVISORY_LOCK_KEY = 827364519201L;

    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private AiLogRetentionJob retentionJob;
    @Autowired private AiLogRepository aiLogRepository;
    @Autowired private AiGovernanceProperties governanceProperties;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        POSTGRES.start();
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @AfterAll
    static void shutdown() {
        if (POSTGRES.isRunning()) {
            POSTGRES.stop();
        }
    }

    @BeforeEach
    void setUp() {
        jdbc.update("DELETE FROM ai_logs");
        governanceProperties.setLogRetentionDays(90);
        governanceProperties.setLogRetentionBatchSize(5000);
        governanceProperties.setLogRetentionTimeBudgetMs(10_000L);
    }

    @Test
    void deletesRowsOlderThanRetentionDaysInBatchesAndPreservesBoundaryRows() {
        OffsetDateTime now = OffsetDateTime.parse("2026-11-23T02:15:00Z");
        OffsetDateTime exactBoundary = now.minusDays(90);
        // 5 expired rows (should be deleted across 3 batches when batchSize=2)
        insertLog(1L, exactBoundary.minusSeconds(1));
        insertLog(1L, exactBoundary.minusDays(1));
        insertLog(2L, exactBoundary.minusDays(5));
        insertLog(2L, exactBoundary.minusDays(30));
        insertLog(3L, exactBoundary.minusDays(120));
        // 3 non-expired rows (at exact 90-day boundary, 89 days ago, and now)
        insertLog(4L, exactBoundary);
        insertLog(4L, now.minusDays(89));
        insertLog(4L, now);

        governanceProperties.setLogRetentionBatchSize(2);
        long deleted = retentionJob.runCleanup();

        assertEquals(5L, deleted);
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM ai_logs", Integer.class));
        assertEquals(
                0,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM ai_logs WHERE created_at < ?",
                        Integer.class,
                        exactBoundary));
    }

    @Test
    void skipsWhenAnotherConnectionHoldsPostgresAdvisoryLock() throws Exception {
        OffsetDateTime expired = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        insertLog(1L, expired);
        insertLog(2L, expired);

        try (Connection contender = dataSource.getConnection()) {
            try (PreparedStatement lockStmt =
                    contender.prepareStatement("SELECT pg_advisory_lock(?)")) {
                lockStmt.setLong(1, ADVISORY_LOCK_KEY);
                lockStmt.execute();
            }

            long skipped = retentionJob.runCleanup();
            assertEquals(0L, skipped);
            assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM ai_logs", Integer.class));

            try (PreparedStatement unlockStmt =
                    contender.prepareStatement("SELECT pg_advisory_unlock(?)")) {
                unlockStmt.setLong(1, ADVISORY_LOCK_KEY);
                unlockStmt.execute();
            }
        }

        long deletedAfterRelease = retentionJob.runCleanup();
        assertEquals(2L, deletedAfterRelease);
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM ai_logs", Integer.class));
    }

    @Test
    void v17AppliesOptimizedCandidate1bIndexesAndRemovesUnusedOnes() {
        List<String> aiLogsIndexes =
                jdbc.queryForList(
                        "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'ai_logs' ORDER BY indexname",
                        String.class);
        assertEquals(
                List.of(
                        "ai_logs_pkey",
                        "idx_ai_logs_created_at_id",
                        "idx_ai_logs_non_ok_status",
                        "idx_ai_logs_user_id_created_at_id"),
                aiLogsIndexes);

        String coveringDef =
                jdbc.queryForObject(
                        "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_ai_logs_created_at_id'",
                        String.class);
        assertTrue(coveringDef != null && coveringDef.contains("INCLUDE"));

        String partialDef =
                jdbc.queryForObject(
                        "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_ai_logs_non_ok_status'",
                        String.class);
        assertTrue(partialDef != null && partialDef.contains("WHERE"));

        List<String> aiUsageIndexes =
                jdbc.queryForList(
                        "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'ai_usage' ORDER BY indexname",
                        String.class);
        assertEquals(List.of("ai_usage_pkey"), aiUsageIndexes);
    }

    @Test
    void searchCapsTotalCountAt10000AndSetsTotalCappedFlag() {
        jdbc.update(
                """
                INSERT INTO ai_logs (user_id, feature, provider, model, prompt_masked, response,
                    tokens_in, tokens_out, latency_ms, status, created_at)
                SELECT
                    1 + (g % 5),
                    'CHAT',
                    'MOCK',
                    'mock',
                    'prompt',
                    'response',
                    1,
                    1,
                    1,
                    CASE WHEN g <= 5 THEN 'ERROR' ELSE 'OK' END,
                    TIMESTAMPTZ '2026-11-22T12:00:00Z' - (g * INTERVAL '1 second')
                FROM generate_series(1, 10005) AS g
                """);

        AiLogPage capped =
                aiLogRepository.search(
                        null,
                        null,
                        null,
                        LocalDate.of(2026, 11, 20),
                        LocalDate.of(2026, 11, 23),
                        0,
                        20);
        assertEquals(10_000L, capped.total());
        assertTrue(capped.totalCapped());
        assertEquals(20, capped.items().size());

        AiLogPage uncapped =
                aiLogRepository.search(
                        null,
                        null,
                        com.rikkei.jobs.ai.model.AiLogStatus.ERROR,
                        LocalDate.of(2026, 11, 20),
                        LocalDate.of(2026, 11, 23),
                        0,
                        20);
        assertEquals(5L, uncapped.total());
        assertFalse(uncapped.totalCapped());
        assertEquals(5, uncapped.items().size());
    }

    private void insertLog(long userId, OffsetDateTime createdAt) {
        jdbc.update(
                """
                INSERT INTO ai_logs (user_id, feature, provider, model, prompt_masked, response,
                    tokens_in, tokens_out, latency_ms, status, created_at)
                VALUES (?, 'CHAT', 'MOCK', 'mock', 'prompt', 'response', 1, 1, 1, 'OK', ?)
                """,
                userId,
                createdAt);
    }

    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(Instant.parse("2026-11-23T02:15:00Z"), ZoneOffset.UTC);
        }
    }
}
