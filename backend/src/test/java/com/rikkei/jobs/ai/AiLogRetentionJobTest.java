package com.rikkei.jobs.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.ai.config.AiGovernanceProperties;
import com.rikkei.jobs.ai.config.AiSchedulingConfig;
import com.rikkei.jobs.ai.repository.AiLogRepository;
import com.rikkei.jobs.ai.service.AiLogRetentionJob;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class AiLogRetentionJobTest {

    private static final long ADVISORY_LOCK_KEY = 827364519201L;

    private MutableClock clock;
    private DataSource dataSource;
    private Connection connection;
    private PreparedStatement lockStmt;
    private PreparedStatement unlockStmt;
    private ResultSet lockRs;
    private AiLogRepository aiLogRepository;
    private AiGovernanceProperties properties;
    private TransactionTemplate transactionTemplate;
    private TaskExecutor taskExecutor;

    @BeforeEach
    void setUp() throws Exception {
        clock = new MutableClock(Instant.parse("2026-11-23T02:15:00Z"));
        dataSource = mock(DataSource.class);
        connection = mock(Connection.class);
        lockStmt = mock(PreparedStatement.class);
        unlockStmt = mock(PreparedStatement.class);
        lockRs = mock(ResultSet.class);

        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement("SELECT pg_try_advisory_lock(?)")).thenReturn(lockStmt);
        when(connection.prepareStatement("SELECT pg_advisory_unlock(?)")).thenReturn(unlockStmt);
        when(lockStmt.executeQuery()).thenReturn(lockRs);

        aiLogRepository = mock(AiLogRepository.class);
        properties = new AiGovernanceProperties();
        properties.setLogRetentionDays(90);
        properties.setLogRetentionBatchSize(2);
        properties.setLogRetentionTimeBudgetMs(10_000L);
        transactionTemplate = new TransactionTemplate(mock(PlatformTransactionManager.class));
        taskExecutor = new SyncTaskExecutor();
    }

    @Test
    void runCleanupDeletesInBatchesUntilRemainderAndReleasesLock() throws Exception {
        when(lockRs.next()).thenReturn(true);
        when(lockRs.getBoolean(1)).thenReturn(true);
        OffsetDateTime expectedCutoff = OffsetDateTime.now(clock).minusDays(90);
        when(aiLogRepository.deleteOldestBatch(expectedCutoff, 2)).thenReturn(2, 2, 1);

        AiLogRetentionJob job =
                new AiLogRetentionJob(
                        clock,
                        dataSource,
                        transactionTemplate,
                        aiLogRepository,
                        properties,
                        taskExecutor);

        long deleted = job.runCleanup();

        assertEquals(5L, deleted);
        verify(aiLogRepository, times(3)).deleteOldestBatch(expectedCutoff, 2);
        verify(lockStmt).setLong(1, ADVISORY_LOCK_KEY);
        verify(unlockStmt).setLong(1, ADVISORY_LOCK_KEY);
        verify(unlockStmt).execute();
        verify(connection).close();
    }

    @Test
    void runCleanupStopsWhenTimeBudgetIsReached() throws Exception {
        when(lockRs.next()).thenReturn(true);
        when(lockRs.getBoolean(1)).thenReturn(true);
        properties.setLogRetentionBatchSize(2);
        properties.setLogRetentionTimeBudgetMs(100L);
        when(aiLogRepository.deleteOldestBatch(any(), eq(2)))
                .thenAnswer(
                        inv -> {
                            clock.advanceMillis(60L);
                            return 2;
                        });

        AiLogRetentionJob job =
                new AiLogRetentionJob(
                        clock,
                        dataSource,
                        transactionTemplate,
                        aiLogRepository,
                        properties,
                        taskExecutor);

        long deleted = job.runCleanup();

        assertEquals(4L, deleted);
        verify(aiLogRepository, times(2)).deleteOldestBatch(any(), eq(2));
        verify(unlockStmt).execute();
    }

    @Test
    void runCleanupSkipsImmediatelyWhenAdvisoryLockIsHeldElsewhere() throws Exception {
        when(lockRs.next()).thenReturn(true);
        when(lockRs.getBoolean(1)).thenReturn(false);

        AiLogRetentionJob job =
                new AiLogRetentionJob(
                        clock,
                        dataSource,
                        transactionTemplate,
                        aiLogRepository,
                        properties,
                        taskExecutor);

        long deleted = job.runCleanup();

        assertEquals(0L, deleted);
        verify(aiLogRepository, never()).deleteOldestBatch(any(), anyInt());
        verify(connection, never()).prepareStatement(eq("SELECT pg_advisory_unlock(?)"));
        verify(connection).close();
    }

    @Test
    void scheduleCleanupDispatchesToNamedBoundedExecutor() throws Exception {
        when(lockRs.next()).thenReturn(true);
        when(lockRs.getBoolean(1)).thenReturn(true);
        CountDownLatch executed = new CountDownLatch(1);
        AtomicReference<String> threadName = new AtomicReference<>();
        when(aiLogRepository.deleteOldestBatch(any(), anyInt()))
                .thenAnswer(
                        inv -> {
                            threadName.set(Thread.currentThread().getName());
                            executed.countDown();
                            return 0;
                        });

        AiSchedulingConfig schedulingConfig = new AiSchedulingConfig();
        ThreadPoolTaskExecutor executor = schedulingConfig.aiRetentionExecutor();
        executor.initialize();
        try {
            assertEquals(1, executor.getCorePoolSize());
            assertEquals(1, executor.getMaxPoolSize());
            assertEquals(1, executor.getQueueCapacity());
            assertEquals("ai-retention-", executor.getThreadNamePrefix());
            assertInstanceOf(
                    ThreadPoolExecutor.DiscardPolicy.class,
                    executor.getThreadPoolExecutor().getRejectedExecutionHandler());

            AiLogRetentionJob job =
                    new AiLogRetentionJob(
                            clock,
                            dataSource,
                            transactionTemplate,
                            aiLogRepository,
                            properties,
                            executor);
            job.scheduleCleanup();

            assertTrue(executed.await(5, TimeUnit.SECONDS));
            assertTrue(threadName.get().startsWith("ai-retention-"));
        } finally {
            executor.shutdown();
        }
    }

    @Test
    void propertiesRejectInvalidRetentionParameters() {
        AiGovernanceProperties props = new AiGovernanceProperties();
        assertEquals(90, props.getLogRetentionDays());
        assertThrows(IllegalArgumentException.class, () -> props.setLogRetentionDays(0));
        assertThrows(IllegalArgumentException.class, () -> props.setLogRetentionDays(-5));
        assertThrows(IllegalArgumentException.class, () -> props.setLogRetentionBatchSize(0));
        assertThrows(IllegalArgumentException.class, () -> props.setLogRetentionTimeBudgetMs(0));
        assertThrows(IllegalArgumentException.class, () -> props.setLogRetentionMaxBatches(0));
        verifyNoUnexpectedPrepare(connection);
    }

    private static void verifyNoUnexpectedPrepare(Connection conn) {
        try {
            verify(conn, never()).prepareStatement(anyString());
        } catch (Exception ignored) {
            // unreachable on mock
        }
    }

    private static final class MutableClock extends Clock {
        private Instant current;

        private MutableClock(Instant initial) {
            this.current = initial;
        }

        private void advanceMillis(long millis) {
            current = current.plusMillis(millis);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return current;
        }
    }
}
