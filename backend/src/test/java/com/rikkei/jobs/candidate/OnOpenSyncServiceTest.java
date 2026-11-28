package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.rikkei.jobs.candidate.config.SyncProperties;
import com.rikkei.jobs.candidate.controller.SkillProfileController;
import com.rikkei.jobs.candidate.model.SyncRun;
import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import com.rikkei.jobs.candidate.repository.SyncRunRepository;
import com.rikkei.jobs.candidate.service.ExternalSyncService;
import com.rikkei.jobs.candidate.service.OnOpenSyncService;
import com.rikkei.jobs.candidate.service.SkillProfileService;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@DisplayName("D8 OnOpenSyncService & SkillProfileController Non-Blocking Sync Unit Tests")
class OnOpenSyncServiceTest {

    private static final Instant BASE_INSTANT = Instant.parse("2026-11-26T10:00:00Z");

    private MutableClock clock;
    private SyncProperties properties;
    private IdentityPublicService identityPublicService;
    private SyncRunRepository syncRunRepository;
    private ExternalSyncService externalSyncService;
    private ThreadPoolTaskExecutor executor;
    private OnOpenSyncService onOpenSyncService;
    private Logger logger;
    private ListAppender<ILoggingEvent> logAppender;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(BASE_INSTANT, ZoneOffset.UTC);
        properties = new SyncProperties();
        properties.setOnOpenEnabled(true);
        properties.setOnOpenStalenessMinutes(60L);
        identityPublicService = mock(IdentityPublicService.class);
        when(identityPublicService.findLmsUserIdByUserId(any()))
                .thenReturn(Optional.of("lms-sv-001"));
        syncRunRepository = mock(SyncRunRepository.class);
        externalSyncService = mock(ExternalSyncService.class);
        executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(1);
        executor.setThreadNamePrefix("rikkei-sync-");
        executor.initialize();

        onOpenSyncService =
                new OnOpenSyncService(
                        clock,
                        properties,
                        identityPublicService,
                        syncRunRepository,
                        externalSyncService,
                        executor);

        logger = (Logger) LoggerFactory.getLogger(OnOpenSyncService.class);
        logAppender = new ListAppender<>();
        logAppender.start();
        logger.addAppender(logAppender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(logAppender);
        logAppender.stop();
        executor.shutdown();
    }

    @Test
    @DisplayName(
            "SkillProfileController triggers OnOpenSyncService ONLY on mySkills, never skillsOf")
    void controllerTriggersOnlyOnMySkills() {
        SkillProfileService profileService = mock(SkillProfileService.class);
        SkillRecomputeService recomputeService = mock(SkillRecomputeService.class);
        OnOpenSyncService mockOnOpen = mock(OnOpenSyncService.class);
        when(profileService.getSkills(1L, "CANDIDATE", 1L)).thenReturn(List.of());
        when(profileService.getSkills(4L, "HR", 2L)).thenReturn(List.of());

        SkillProfileController controller =
                new SkillProfileController(profileService, recomputeService, mockOnOpen);

        controller.mySkills(new UserPrincipal(1L, "c1@rikkeijobs.test", "CANDIDATE", null, false));
        verify(mockOnOpen, times(1)).triggerIfStale(1L);

        controller.skillsOf(new UserPrincipal(4L, "hr@rikkeijobs.test", "HR", 1L, false), 2L);
        verify(mockOnOpen, never()).triggerIfStale(2L);
        verify(mockOnOpen, never()).triggerIfStale(4L);
    }

    @Test
    @DisplayName("onOpenEnabled=false skips checking DB or submitting sync")
    void disabledOnOpenSkipsSync() {
        properties.setOnOpenEnabled(false);
        onOpenSyncService.triggerIfStale(1L);
        verifyNoInteractions(syncRunRepository, externalSyncService);
    }

    @Test
    @DisplayName(
            "Skips when latest run (any status/trigger) started <= 1 hour ago; triggers when > 1 hour ago")
    void respectsOneHourStalenessAcrossAllStatusesAndTriggers() throws Exception {
        OffsetDateTime thirtyMinsAgo = OffsetDateTime.now(clock).minusMinutes(30);
        SyncRun recentFailedNightly =
                new SyncRun(
                        SyncTrigger.NIGHTLY,
                        1L,
                        SyncStatus.FAILED,
                        thirtyMinsAgo,
                        thirtyMinsAgo.plusSeconds(1),
                        "down",
                        null);
        when(syncRunRepository.findTopByUserIdOrderByStartedAtDescIdDesc(1L))
                .thenReturn(Optional.of(recentFailedNightly));

        onOpenSyncService.triggerIfStale(1L);
        verify(externalSyncService, never()).syncUser(any(), any());

        // Advance clock so run is 61 minutes old (> 1h)
        clock.setInstant(BASE_INSTANT.plusSeconds(31 * 60L + 1L));
        CountDownLatch executed = new CountDownLatch(1);
        doAnswer(
                        inv -> {
                            assertTrue(Thread.currentThread().getName().startsWith("rikkei-sync-"));
                            executed.countDown();
                            return null;
                        })
                .when(externalSyncService)
                .syncUser(1L, SyncTrigger.ON_OPEN);

        onOpenSyncService.triggerIfStale(1L);
        assertTrue(executed.await(5, TimeUnit.SECONDS));
        verify(externalSyncService, times(1)).syncUser(1L, SyncTrigger.ON_OPEN);
    }

    @Test
    @DisplayName("Deduplicates per-user in-flight syncs and cleans up on executor saturation")
    void deduplicatesInFlightAndCleansUpOnSaturation() throws Exception {
        when(syncRunRepository.findTopByUserIdOrderByStartedAtDescIdDesc(any()))
                .thenReturn(Optional.empty());

        CountDownLatch taskStarted = new CountDownLatch(1);
        CountDownLatch releaseTask = new CountDownLatch(1);
        CountDownLatch task2Done = new CountDownLatch(1);
        doAnswer(
                        inv -> {
                            taskStarted.countDown();
                            releaseTask.await(5, TimeUnit.SECONDS);
                            return null;
                        })
                .when(externalSyncService)
                .syncUser(1L, SyncTrigger.ON_OPEN);
        doAnswer(
                        inv -> {
                            releaseTask.await(5, TimeUnit.SECONDS);
                            task2Done.countDown();
                            return null;
                        })
                .when(externalSyncService)
                .syncUser(2L, SyncTrigger.ON_OPEN);

        // User 1 takes the single active worker thread
        onOpenSyncService.triggerIfStale(1L);
        assertTrue(taskStarted.await(5, TimeUnit.SECONDS));

        // Second open for User 1 while in-flight is deduplicated (even before touching executor)
        onOpenSyncService.triggerIfStale(1L);

        // User 2 fills the 1-slot queue
        onOpenSyncService.triggerIfStale(2L);

        // User 3 saturates the bounded executor -> warn + drop + clean removal from inFlightUsers
        onOpenSyncService.triggerIfStale(3L);
        assertTrue(logAppender.list.stream().anyMatch(e -> e.getLevel() == Level.WARN));

        // Release active/queued tasks
        releaseTask.countDown();
        assertTrue(task2Done.await(5, TimeUnit.SECONDS));
        verify(externalSyncService, times(1)).syncUser(eq(1L), eq(SyncTrigger.ON_OPEN));
        verify(externalSyncService, times(1)).syncUser(eq(2L), eq(SyncTrigger.ON_OPEN));
        verify(externalSyncService, never()).syncUser(eq(3L), eq(SyncTrigger.ON_OPEN));

        // Wait briefly for worker thread to exit finally block and verify User 3 can submit later
        CountDownLatch user3Done = new CountDownLatch(1);
        doAnswer(
                        inv -> {
                            user3Done.countDown();
                            return null;
                        })
                .when(externalSyncService)
                .syncUser(3L, SyncTrigger.ON_OPEN);
        onOpenSyncService.triggerIfStale(3L);
        assertTrue(user3Done.await(5, TimeUnit.SECONDS));
        assertEquals(1, logAppender.list.stream().filter(e -> e.getLevel() == Level.WARN).count());
    }

    @Test
    @DisplayName(
            "F10: Candidate without lms_user_id skips DB run query, task submission, and warnings")
    void skipsSyncAndWarningWhenLmsUserIdMissing() {
        when(identityPublicService.findLmsUserIdByUserId(99L)).thenReturn(Optional.empty());
        for (int i = 0; i < 5; i++) {
            onOpenSyncService.triggerIfStale(99L);
        }
        verifyNoInteractions(syncRunRepository, externalSyncService);
        assertEquals(0, executor.getThreadPoolExecutor().getTaskCount());
        assertEquals(0, logAppender.list.stream().filter(e -> e.getLevel() == Level.WARN).count());
    }
}
