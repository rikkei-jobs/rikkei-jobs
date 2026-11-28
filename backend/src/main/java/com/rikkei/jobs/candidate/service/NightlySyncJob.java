package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.config.SyncProperties;
import com.rikkei.jobs.candidate.model.SyncRun;
import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import com.rikkei.jobs.candidate.repository.SyncRunRepository;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.identity.dto.CandidateSyncTargetDto;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.OffsetDateTime;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Scheduled nightly synchronization job for all active candidates with an {@code lms_user_id} (D7).
 * Uses a PostgreSQL session advisory lock to prevent overlapping runs across instances.
 */
@Service
public class NightlySyncJob {

    public static final long ADVISORY_LOCK_KEY = 5643967541078671683L;
    private static final Logger log = LoggerFactory.getLogger(NightlySyncJob.class);

    private final Clock clock;
    private final DataSource dataSource;
    private final IdentityPublicService identityPublicService;
    private final ExternalSyncService externalSyncService;
    private final SyncRunRepository syncRunRepository;
    private final TransactionTemplate requiresNewTxTemplate;
    private final SyncProperties syncProperties;

    @Autowired
    public NightlySyncJob(
            Clock clock,
            DataSource dataSource,
            IdentityPublicService identityPublicService,
            ExternalSyncService externalSyncService,
            SyncRunRepository syncRunRepository,
            PlatformTransactionManager transactionManager,
            SyncProperties syncProperties) {
        this.clock = clock;
        this.dataSource = dataSource;
        this.identityPublicService = identityPublicService;
        this.externalSyncService = externalSyncService;
        this.syncRunRepository = syncRunRepository;
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.requiresNewTxTemplate = template;
        this.syncProperties = syncProperties;
    }

    @Scheduled(
            cron = "${app.sync.nightly-cron:0 0 1 * * *}",
            zone = "${app.sync.nightly-zone:Asia/Ho_Chi_Minh}")
    public void scheduledSync() {
        try {
            runNightlySync();
        } catch (RuntimeException ex) {
            log.error(
                    "Nightly external sync job failed unexpectedly: exceptionType={}, rootCauseType={}",
                    ex.getClass().getName(),
                    SyncFailureLogger.rootCauseClassName(ex),
                    SyncFailureLogger.sanitizeThrowableForLog(ex));
        }
    }

    public void runNightlySync() {
        try (Connection connection = dataSource.getConnection()) {
            if (!tryAcquireAdvisoryLock(connection)) {
                log.debug(
                        "Skipping nightly sync; advisory lock {} held by another instance",
                        ADVISORY_LOCK_KEY);
                return;
            }
            try {
                executePagedCandidateSync();
            } finally {
                releaseAdvisoryLock(connection);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException(
                    "Failed to manage PostgreSQL advisory lock for nightly sync", ex);
        }
    }

    private void executePagedCandidateSync() {
        OffsetDateTime startedAt = OffsetDateTime.now(clock);
        int pageSize = Math.max(1, Math.min(100, syncProperties.getNightlyPageSize()));
        int page = 1;
        int totalPages = 1;

        while (page <= totalPages) {
            PageResponse<CandidateSyncTargetDto> pageResult;
            try {
                pageResult = identityPublicService.findActiveSyncCandidates(page, pageSize);
            } catch (RuntimeException ex) {
                String safeError = SyncRunPersistenceService.sanitizeError(ex);
                // Log before persisting FAILED run so DB persistence failures never hide the root
                // cause.
                if (SyncFailureLogger.isExpectedSyncFailure(ex)) {
                    log.warn(
                            "Nightly sync candidate listing failed on page={}: {}",
                            page,
                            safeError);
                } else {
                    log.error(
                            "Unexpected nightly sync candidate listing failure: page={}, exceptionType={}, rootCauseType={}",
                            page,
                            ex.getClass().getName(),
                            SyncFailureLogger.rootCauseClassName(ex),
                            SyncFailureLogger.sanitizeThrowableForLog(ex));
                }
                OffsetDateTime finishedAt = OffsetDateTime.now(clock);
                requiresNewTxTemplate.execute(
                        status ->
                                syncRunRepository.save(
                                        new SyncRun(
                                                SyncTrigger.NIGHTLY,
                                                null,
                                                SyncStatus.FAILED,
                                                startedAt,
                                                finishedAt,
                                                safeError,
                                                null)));
                return;
            }

            totalPages = Math.max(0, pageResult.totalPages());
            for (CandidateSyncTargetDto candidate : pageResult.items()) {
                try {
                    externalSyncService.syncUser(candidate.userId(), SyncTrigger.NIGHTLY);
                } catch (RuntimeException ex) {
                    SyncFailureLogger.logTriggerFailure(
                            log,
                            "Nightly sync failed for candidate, continuing remaining candidates",
                            candidate.userId(),
                            ex);
                }
            }
            page++;
        }
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
                    "Failed to release PostgreSQL advisory lock {} after nightly sync",
                    ADVISORY_LOCK_KEY,
                    ex);
        }
    }
}
