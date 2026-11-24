package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.config.AiGovernanceProperties;
import com.rikkei.jobs.ai.repository.AiLogRepository;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Daily bounded retention cleanup for {@code ai_logs}. Coordinates across application instances via
 * a non-blocking PostgreSQL session-level advisory lock and deletes expired rows in small ordered
 * batches within a time budget.
 */
@Service
public class AiLogRetentionJob {

    static final long ADVISORY_LOCK_KEY = 827364519201L;
    private static final Logger log = LoggerFactory.getLogger(AiLogRetentionJob.class);

    private final Clock clock;
    private final DataSource dataSource;
    private final TransactionTemplate transactionTemplate;
    private final AiLogRepository aiLogRepository;
    private final AiGovernanceProperties properties;
    private final TaskExecutor aiRetentionExecutor;

    public AiLogRetentionJob(
            Clock clock,
            DataSource dataSource,
            TransactionTemplate transactionTemplate,
            AiLogRepository aiLogRepository,
            AiGovernanceProperties properties,
            @Qualifier("aiRetentionExecutor") TaskExecutor aiRetentionExecutor) {
        this.clock = clock;
        this.dataSource = dataSource;
        this.transactionTemplate = transactionTemplate;
        this.aiLogRepository = aiLogRepository;
        this.properties = properties;
        this.aiRetentionExecutor = aiRetentionExecutor;
    }

    @Scheduled(cron = "${app.ai.log-retention-cron:0 15 2 * * *}", zone = "UTC")
    public void scheduleCleanup() {
        aiRetentionExecutor.execute(
                () -> {
                    try {
                        runCleanup();
                    } catch (RuntimeException ex) {
                        log.error("Scheduled AI log retention cleanup failed", ex);
                    }
                });
    }

    public long runCleanup() {
        try (Connection connection = dataSource.getConnection()) {
            if (!tryAcquireAdvisoryLock(connection)) {
                log.debug(
                        "Skipping AI log retention cleanup; advisory lock {} held by another instance",
                        ADVISORY_LOCK_KEY);
                return 0L;
            }
            try {
                return deleteExpiredLogsInBatches();
            } finally {
                releaseAdvisoryLock(connection);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException(
                    "Failed to manage PostgreSQL advisory lock for AI log retention", ex);
        }
    }

    private long deleteExpiredLogsInBatches() {
        OffsetDateTime cutoff =
                OffsetDateTime.now(clock).minusDays(properties.getLogRetentionDays());
        int batchSize = properties.getLogRetentionBatchSize();
        long timeBudgetMs = properties.getLogRetentionTimeBudgetMs();
        int maxBatches = properties.getLogRetentionMaxBatches();
        Instant startedAt = clock.instant();

        long totalDeleted = 0L;
        int batches = 0;
        while (batches < maxBatches) {
            if (batches > 0
                    && Duration.between(startedAt, clock.instant()).toMillis() >= timeBudgetMs) {
                log.info(
                        "AI log retention cleanup stopped after {} ms time budget ({} batches, {} rows deleted)",
                        timeBudgetMs,
                        batches,
                        totalDeleted);
                break;
            }
            Integer deleted =
                    transactionTemplate.execute(
                            status -> aiLogRepository.deleteOldestBatch(cutoff, batchSize));
            int batchDeleted = deleted == null ? 0 : deleted;
            totalDeleted += batchDeleted;
            batches++;
            if (batchDeleted < batchSize) {
                break;
            }
        }
        if (totalDeleted > 0) {
            log.info(
                    "AI log retention cleanup deleted {} row(s) older than {} across {} batch(es)",
                    totalDeleted,
                    cutoff,
                    batches);
        }
        return totalDeleted;
    }

    private boolean tryAcquireAdvisoryLock(Connection connection) throws SQLException {
        try (PreparedStatement stmt =
                connection.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
            stmt.setLong(1, ADVISORY_LOCK_KEY);
            try (ResultSet rs = stmt.executeQuery()) {
                return rs.next() && rs.getBoolean(1);
            }
        }
    }

    private void releaseAdvisoryLock(Connection connection) {
        try (PreparedStatement stmt = connection.prepareStatement("SELECT pg_advisory_unlock(?)")) {
            stmt.setLong(1, ADVISORY_LOCK_KEY);
            stmt.execute();
        } catch (SQLException ex) {
            log.warn(
                    "Failed to release PostgreSQL advisory lock {} after AI log retention",
                    ADVISORY_LOCK_KEY,
                    ex);
        }
    }
}
