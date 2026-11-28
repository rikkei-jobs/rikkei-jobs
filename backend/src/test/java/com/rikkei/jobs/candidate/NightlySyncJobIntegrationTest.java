package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.candidate.config.SyncProperties;
import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import com.rikkei.jobs.candidate.repository.SyncRunRepository;
import com.rikkei.jobs.candidate.service.ExternalSyncService;
import com.rikkei.jobs.candidate.service.NightlySyncJob;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(
        properties = {
            "app.sync.on-open-enabled=false",
            "app.sync.nightly-cron=-",
            "app.sync.nightly-page-size=2"
        })
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("D7 NightlySyncJob Advisory Lock, Paging & Listing Failure Integration Tests")
class NightlySyncJobIntegrationTest {

    private static final HttpServer MOCK_SERVER;
    private static final int MOCK_PORT;
    private static final AtomicBoolean FAIL_CANDIDATE_2 = new AtomicBoolean(false);

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
                        if (FAIL_CANDIDATE_2.get() && path.contains("lms-sv-002")) {
                            byte[] err = "{\"error\":\"boom\"}".getBytes(StandardCharsets.UTF_8);
                            exchange.sendResponseHeaders(500, err.length);
                            try (OutputStream os = exchange.getResponseBody()) {
                                os.write(err);
                            }
                            return;
                        }
                        byte[] body = "[]".getBytes(StandardCharsets.UTF_8);
                        exchange.sendResponseHeaders(200, body.length);
                        try (OutputStream os = exchange.getResponseBody()) {
                            os.write(body);
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

    @Autowired private NightlySyncJob nightlySyncJob;
    @Autowired private DataSource dataSource;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private SyncRunRepository syncRunRepository;
    @Autowired private ExternalSyncService externalSyncService;
    @Autowired private PlatformTransactionManager transactionManager;

    @BeforeEach
    void reset() {
        FAIL_CANDIDATE_2.set(false);
        jdbcTemplate.update("DELETE FROM sync_runs");
    }

    @Test
    @DisplayName("Paged nightly sync continues when one candidate fails and records NIGHTLY runs")
    void nightlySyncContinuesAfterSingleCandidateFailure() {
        FAIL_CANDIDATE_2.set(true);
        nightlySyncJob.runNightlySync();

        Integer successCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM sync_runs WHERE trigger = 'NIGHTLY' AND status = 'SUCCESS'",
                        Integer.class);
        Integer failedCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM sync_runs WHERE trigger = 'NIGHTLY' AND status = 'FAILED' AND user_id = 2",
                        Integer.class);
        assertEquals(2, successCount);
        assertEquals(1, failedCount);
    }

    @Test
    @DisplayName("Nightly job skips execution when PostgreSQL session advisory lock is held")
    void nightlyJobSkipsWhenAdvisoryLockAlreadyHeld() throws Exception {
        try (Connection holder = dataSource.getConnection();
                PreparedStatement lockStmt =
                        holder.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
            lockStmt.setLong(1, NightlySyncJob.ADVISORY_LOCK_KEY);
            try (ResultSet rs = lockStmt.executeQuery()) {
                assertTrue(rs.next() && rs.getBoolean(1));
            }

            nightlySyncJob.runNightlySync();

            Integer runCount =
                    jdbcTemplate.queryForObject("SELECT COUNT(*) FROM sync_runs", Integer.class);
            assertEquals(0, runCount);

            try (PreparedStatement unlockStmt =
                    holder.prepareStatement("SELECT pg_advisory_unlock(?)")) {
                unlockStmt.setLong(1, NightlySyncJob.ADVISORY_LOCK_KEY);
                unlockStmt.execute();
            }
        }
    }

    @Test
    @DisplayName("Listing failure persists a FAILED NIGHTLY sync_runs row with user_id = NULL")
    void listingFailurePersistsNullUserIdFailedRun() {
        IdentityPublicService failingIdentity = mock(IdentityPublicService.class);
        when(failingIdentity.findActiveSyncCandidates(anyInt(), anyInt()))
                .thenThrow(new IllegalStateException("DB listing error"));

        NightlySyncJob jobWithFailingIdentity =
                new NightlySyncJob(
                        Clock.fixed(Instant.parse("2026-11-26T01:00:00Z"), ZoneOffset.UTC),
                        dataSource,
                        failingIdentity,
                        externalSyncService,
                        syncRunRepository,
                        transactionManager,
                        new SyncProperties());

        jobWithFailingIdentity.runNightlySync();

        Integer nullUserFailures =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM sync_runs WHERE trigger = 'NIGHTLY' AND status = 'FAILED' AND user_id IS NULL",
                        Integer.class);
        assertEquals(1, nullUserFailures);
        var failedRun = syncRunRepository.findAll().getFirst();
        assertNull(failedRun.getUserId());
        assertEquals(SyncTrigger.NIGHTLY, failedRun.getTrigger());
        assertEquals(SyncStatus.FAILED, failedRun.getStatus());
    }
}
