package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.config.SyncProperties;
import com.rikkei.jobs.candidate.model.SyncRun;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import com.rikkei.jobs.candidate.repository.SyncRunRepository;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.RejectedExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;

/**
 * Triggers non-blocking background synchronization when a candidate opens their own skill profile
 * and their latest sync run (any status, any trigger) started more than the configured staleness
 * window ago (D8).
 */
@Service
public class OnOpenSyncService {

    private static final Logger log = LoggerFactory.getLogger(OnOpenSyncService.class);

    private final Clock clock;
    private final SyncProperties syncProperties;
    private final IdentityPublicService identityPublicService;
    private final SyncRunRepository syncRunRepository;
    private final ExternalSyncService externalSyncService;
    private final TaskExecutor externalSyncExecutor;
    private final Set<Long> inFlightUsers = ConcurrentHashMap.newKeySet();

    public OnOpenSyncService(
            Clock clock,
            SyncProperties syncProperties,
            IdentityPublicService identityPublicService,
            SyncRunRepository syncRunRepository,
            ExternalSyncService externalSyncService,
            @Qualifier("externalSyncExecutor") TaskExecutor externalSyncExecutor) {
        this.clock = clock;
        this.syncProperties = syncProperties;
        this.identityPublicService = identityPublicService;
        this.syncRunRepository = syncRunRepository;
        this.externalSyncService = externalSyncService;
        this.externalSyncExecutor = externalSyncExecutor;
    }

    public void triggerIfStale(Long userId) {
        if (userId == null || userId <= 0 || !syncProperties.isOnOpenEnabled()) {
            return;
        }
        if (inFlightUsers.contains(userId)) {
            return;
        }
        Optional<String> lmsUserId = identityPublicService.findLmsUserIdByUserId(userId);
        if (lmsUserId.isEmpty() || lmsUserId.get().isBlank()) {
            return;
        }

        Optional<SyncRun> latestRun =
                syncRunRepository.findTopByUserIdOrderByStartedAtDescIdDesc(userId);
        long stalenessMinutes = Math.max(1L, syncProperties.getOnOpenStalenessMinutes());
        OffsetDateTime cutoff = OffsetDateTime.now(clock).minusMinutes(stalenessMinutes);
        if (latestRun.isPresent() && !latestRun.get().getStartedAt().isBefore(cutoff)) {
            return;
        }

        if (!inFlightUsers.add(userId)) {
            return;
        }

        try {
            externalSyncExecutor.execute(
                    () -> {
                        try {
                            externalSyncService.syncUser(userId, SyncTrigger.ON_OPEN);
                        } catch (RuntimeException ex) {
                            SyncFailureLogger.logTriggerFailure(
                                    log, "Background on-open sync failed", userId, ex);
                        } finally {
                            inFlightUsers.remove(userId);
                        }
                    });
        } catch (RejectedExecutionException ex) {
            inFlightUsers.remove(userId);
            log.warn(
                    "Dropped on-open sync for userId={} because externalSyncExecutor is saturated",
                    userId);
        }
    }
}
