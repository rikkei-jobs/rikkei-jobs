package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.candidate.config.SyncProperties;
import com.rikkei.jobs.candidate.controller.SkillProfileController;
import com.rikkei.jobs.candidate.model.SyncRun;
import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import com.rikkei.jobs.candidate.repository.SyncRunRepository;
import com.rikkei.jobs.candidate.service.CandidateSkillLockService;
import com.rikkei.jobs.candidate.service.ExternalRecordNormalizer;
import com.rikkei.jobs.candidate.service.ExternalSyncService;
import com.rikkei.jobs.candidate.service.NightlySyncJob;
import com.rikkei.jobs.candidate.service.OnOpenSyncService;
import com.rikkei.jobs.candidate.service.SkillProfileService;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import com.rikkei.jobs.candidate.service.SyncRunPersistenceService;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.config.JacksonConfig;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.identity.dto.CandidateSyncTargetDto;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

@DisplayName("F8 Sync Failure Classification & Log Redaction Unit Tests Across All Triggers")
class SyncFailureLoggingTest {

    private static final Instant BASE_INSTANT = Instant.parse("2026-11-26T10:00:00Z");
    private static final Clock FIXED_CLOCK = Clock.fixed(BASE_INSTANT, ZoneOffset.UTC);
    private static final String SECRET_DB_DETAIL =
            "Detail: Failing row contains (secret-value-leak, secret@pii.test)";
    private static final String SECRET_QUERY =
            "https://internal.mock/lms?X-Service-Key=secret-key-leak&token=abc";

    private Logger candidateLogger;
    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void attachLogAppender() {
        candidateLogger = (Logger) LoggerFactory.getLogger("com.rikkei.jobs.candidate");
        appender = new ListAppender<>();
        appender.start();
        candidateLogger.addAppender(appender);
    }

    @AfterEach
    void detachLogAppender() {
        candidateLogger.detachAppender(appender);
        appender.stop();
    }

    @Test
    @DisplayName(
            "ExternalSyncService: unexpected DB/runtime error logs once at ERROR with stack trace and redacted message; expected logs WARN without stack")
    void externalSyncServiceClassifiesAndRedactsLogs() {
        IdentityPublicService identity = mock(IdentityPublicService.class);
        ExternalApiClient client = mock(ExternalApiClient.class);
        ExternalRecordNormalizer normalizer = mock(ExternalRecordNormalizer.class);
        CandidateSkillLockService lockService = mock(CandidateSkillLockService.class);
        SkillRecomputeService recomputeService = mock(SkillRecomputeService.class);
        SyncRunRepository syncRunRepository = mock(SyncRunRepository.class);
        SyncRunPersistenceService persistenceService = mock(SyncRunPersistenceService.class);
        PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
        when(txManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        ObjectMapper mapper = new JacksonConfig().objectMapper();

        ExternalSyncService service =
                new ExternalSyncService(
                        FIXED_CLOCK,
                        identity,
                        client,
                        normalizer,
                        lockService,
                        recomputeService,
                        syncRunRepository,
                        persistenceService,
                        txManager,
                        mapper);

        when(identity.findCandidateSyncTargetByUserId(1L))
                .thenReturn(
                        Optional.of(
                                new CandidateSyncTargetDto(
                                        1L,
                                        "Nguyễn Văn An",
                                        "secret@pii.test",
                                        "lms-sv-001",
                                        true)));
        when(client.getStudentLmsResults("lms-sv-001")).thenReturn("[]");
        when(client.getStudentExamResults("lms-sv-001")).thenReturn("[]");
        when(client.getStudentInternships("lms-sv-001")).thenReturn("[]");
        when(normalizer.countArrayElements(any(), any())).thenReturn(0);
        when(normalizer.parseAndValidateLmsJson(any())).thenReturn(List.of());
        when(normalizer.parseAndValidateExamJson(any())).thenReturn(List.of());
        when(normalizer.parseAndValidatePmJson(any())).thenReturn(List.of());

        NullPointerException rootNpe = new NullPointerException("payload=" + SECRET_QUERY);
        DataIntegrityViolationException dbEx =
                new DataIntegrityViolationException(SECRET_DB_DETAIL, rootNpe);
        when(normalizer.upsertLmsItems(eq(1L), eq(0), any(), any())).thenThrow(dbEx);
        when(persistenceService.recordFailure(
                        eq(SyncTrigger.MANUAL), eq(1L), any(), any(), eq(dbEx)))
                .thenReturn(
                        new SyncRun(
                                SyncTrigger.MANUAL,
                                1L,
                                SyncStatus.FAILED,
                                OffsetDateTime.now(FIXED_CLOCK),
                                OffsetDateTime.now(FIXED_CLOCK),
                                "Lỗi hệ thống trong quá trình đồng bộ dữ liệu",
                                null));

        assertThrows(
                ExternalUnavailableException.class, () -> service.syncUser(1L, SyncTrigger.MANUAL));

        List<ILoggingEvent> errors =
                appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList();
        assertEquals(1, errors.size(), "Expected exactly 1 ERROR log for unexpected failure");
        assertNotNull(errors.getFirst().getThrowableProxy(), "ERROR log must include stack trace");
        assertNoSecretLeak(errors.getFirst());
        assertTrue(
                throwableChainContains(
                        errors.getFirst().getThrowableProxy(), "DataIntegrityViolationException"));
        assertTrue(
                throwableChainContains(
                        errors.getFirst().getThrowableProxy(), "NullPointerException"));

        // Expected upstream failure -> WARN without stack trace, 0 ERROR logs
        appender.list.clear();
        InvalidServiceKeyException keyEx = new InvalidServiceKeyException("bad key");
        when(client.getStudentLmsResults("lms-sv-001")).thenThrow(keyEx);
        when(persistenceService.recordFailure(
                        eq(SyncTrigger.MANUAL), eq(1L), any(), any(), eq(keyEx)))
                .thenReturn(
                        new SyncRun(
                                SyncTrigger.MANUAL,
                                1L,
                                SyncStatus.FAILED,
                                OffsetDateTime.now(FIXED_CLOCK),
                                OffsetDateTime.now(FIXED_CLOCK),
                                "Lỗi xác thực khóa dịch vụ hệ thống ngoài",
                                null));

        assertThrows(
                ExternalUnavailableException.class, () -> service.syncUser(1L, SyncTrigger.MANUAL));

        assertEquals(0, appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).count());
        List<ILoggingEvent> warns =
                appender.list.stream().filter(e -> e.getLevel() == Level.WARN).toList();
        assertEquals(1, warns.size());
        assertNull(warns.getFirst().getThrowableProxy());
    }

    @Test
    @DisplayName(
            "NightlySyncJob per-candidate catch: unexpected logs ERROR with redacted stack; expected logs WARN without stack")
    void nightlySyncJobPerCandidateCatchClassifiesAndRedacts() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection conn = mock(Connection.class);
        PreparedStatement lockStmt = mock(PreparedStatement.class);
        PreparedStatement unlockStmt = mock(PreparedStatement.class);
        ResultSet rs = mock(ResultSet.class);
        when(dataSource.getConnection()).thenReturn(conn);
        when(conn.prepareStatement("SELECT pg_try_advisory_lock(?)")).thenReturn(lockStmt);
        when(conn.prepareStatement("SELECT pg_advisory_unlock(?)")).thenReturn(unlockStmt);
        when(lockStmt.executeQuery()).thenReturn(rs);
        when(rs.next()).thenReturn(true);
        when(rs.getBoolean(1)).thenReturn(true);

        IdentityPublicService identity = mock(IdentityPublicService.class);
        when(identity.findActiveSyncCandidates(anyInt(), anyInt()))
                .thenReturn(
                        new PageResponse<>(
                                List.of(
                                        new CandidateSyncTargetDto(
                                                1L,
                                                "Nguyễn Văn An",
                                                "secret@pii.test",
                                                "lms-sv-001",
                                                true)),
                                1,
                                20,
                                1,
                                1));
        ExternalSyncService externalSyncService = mock(ExternalSyncService.class);
        SyncRunRepository syncRunRepository = mock(SyncRunRepository.class);
        PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
        SyncProperties props = new SyncProperties();

        NightlySyncJob job =
                new NightlySyncJob(
                        FIXED_CLOCK,
                        dataSource,
                        identity,
                        externalSyncService,
                        syncRunRepository,
                        txManager,
                        props);

        RuntimeException unexpected =
                new RuntimeException(
                        SECRET_DB_DETAIL + " " + SECRET_QUERY, new NullPointerException("leak"));
        doThrow(unexpected).when(externalSyncService).syncUser(1L, SyncTrigger.NIGHTLY);

        job.runNightlySync();

        List<ILoggingEvent> errors =
                appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList();
        assertEquals(1, errors.size());
        assertNotNull(errors.getFirst().getThrowableProxy());
        assertNoSecretLeak(errors.getFirst());
        assertTrue(
                throwableChainContains(
                        errors.getFirst().getThrowableProxy(), "NullPointerException"));

        appender.list.clear();
        doThrow(new ValidationException("missing lms"))
                .when(externalSyncService)
                .syncUser(1L, SyncTrigger.NIGHTLY);
        job.runNightlySync();

        assertEquals(0, appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).count());
        List<ILoggingEvent> warns =
                appender.list.stream().filter(e -> e.getLevel() == Level.WARN).toList();
        assertEquals(1, warns.size());
        assertNull(warns.getFirst().getThrowableProxy());
    }

    @Test
    @DisplayName(
            "OnOpenSyncService & SkillProfileController: unexpected logs ERROR with redacted stack; expected logs WARN without stack")
    void onOpenAndSkillProfileControllerClassifyAndRedact() throws Exception {
        SyncProperties props = new SyncProperties();
        props.setOnOpenEnabled(true);
        props.setOnOpenStalenessMinutes(60L);
        SyncRunRepository syncRunRepository = mock(SyncRunRepository.class);
        when(syncRunRepository.findTopByUserIdOrderByStartedAtDescIdDesc(1L))
                .thenReturn(Optional.empty());
        ExternalSyncService externalSyncService = mock(ExternalSyncService.class);
        IdentityPublicService identity = mock(IdentityPublicService.class);
        when(identity.findLmsUserIdByUserId(1L)).thenReturn(Optional.of("lms-sv-001"));

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(4);
        executor.setThreadNamePrefix("rikkei-sync-");
        executor.initialize();

        try {
            OnOpenSyncService onOpenSyncService =
                    new OnOpenSyncService(
                            FIXED_CLOCK,
                            props,
                            identity,
                            syncRunRepository,
                            externalSyncService,
                            executor);

            CountDownLatch done1 = new CountDownLatch(1);
            doThrow(new IllegalStateException(SECRET_DB_DETAIL + " " + SECRET_QUERY))
                    .when(externalSyncService)
                    .syncUser(1L, SyncTrigger.ON_OPEN);

            onOpenSyncService.triggerIfStale(1L);
            executor.submit(done1::countDown);
            assertTrue(done1.await(5, TimeUnit.SECONDS));

            List<ILoggingEvent> errors =
                    appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList();
            assertEquals(1, errors.size());
            assertNotNull(errors.getFirst().getThrowableProxy());
            assertNoSecretLeak(errors.getFirst());

            appender.list.clear();
            CountDownLatch done2 = new CountDownLatch(1);
            doThrow(new ExternalUnavailableException("mock down"))
                    .when(externalSyncService)
                    .syncUser(1L, SyncTrigger.ON_OPEN);

            onOpenSyncService.triggerIfStale(1L);
            executor.submit(done2::countDown);
            assertTrue(done2.await(5, TimeUnit.SECONDS));

            assertEquals(
                    0, appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).count());
            List<ILoggingEvent> warns =
                    appender.list.stream().filter(e -> e.getLevel() == Level.WARN).toList();
            assertEquals(1, warns.size());
            assertNull(warns.getFirst().getThrowableProxy());
        } finally {
            executor.shutdown();
        }

        // SkillProfileController catch around onOpenSyncService.triggerIfStale
        appender.list.clear();
        SkillProfileService profileService = mock(SkillProfileService.class);
        SkillRecomputeService recomputeService = mock(SkillRecomputeService.class);
        OnOpenSyncService mockOnOpen = mock(OnOpenSyncService.class);
        when(profileService.getSkills(1L, "CANDIDATE", 1L)).thenReturn(List.of());
        doThrow(new NullPointerException(SECRET_DB_DETAIL + " " + SECRET_QUERY))
                .when(mockOnOpen)
                .triggerIfStale(1L);

        SkillProfileController controller =
                new SkillProfileController(profileService, recomputeService, mockOnOpen);
        controller.mySkills(new UserPrincipal(1L, "c1@rikkeijobs.test", "CANDIDATE", null, false));

        List<ILoggingEvent> ctrlErrors =
                appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList();
        assertEquals(1, ctrlErrors.size());
        assertNotNull(ctrlErrors.getFirst().getThrowableProxy());
        assertNoSecretLeak(ctrlErrors.getFirst());
    }

    @Test
    @DisplayName(
            "G3 NightlySyncJob candidate-listing failure: unexpected logs ERROR once with stack even if FAILED row save fails; expected logs WARN without stack")
    void nightlySyncJobCandidateListingClassifiesUnexpectedAndExpected() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection conn = mock(Connection.class);
        PreparedStatement lockStmt = mock(PreparedStatement.class);
        PreparedStatement unlockStmt = mock(PreparedStatement.class);
        ResultSet rs = mock(ResultSet.class);
        when(dataSource.getConnection()).thenReturn(conn);
        when(conn.prepareStatement("SELECT pg_try_advisory_lock(?)")).thenReturn(lockStmt);
        when(conn.prepareStatement("SELECT pg_advisory_unlock(?)")).thenReturn(unlockStmt);
        when(lockStmt.executeQuery()).thenReturn(rs);
        when(rs.next()).thenReturn(true);
        when(rs.getBoolean(1)).thenReturn(true);

        IdentityPublicService identity = mock(IdentityPublicService.class);
        ExternalSyncService externalSyncService = mock(ExternalSyncService.class);
        SyncRunRepository syncRunRepository = mock(SyncRunRepository.class);
        PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
        when(txManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        SyncProperties props = new SyncProperties();

        NightlySyncJob job =
                new NightlySyncJob(
                        FIXED_CLOCK,
                        dataSource,
                        identity,
                        externalSyncService,
                        syncRunRepository,
                        txManager,
                        props);

        // 1) Unexpected exception -> 1 ERROR with redacted stack + FAILED SyncRun saved
        when(identity.findActiveSyncCandidates(anyInt(), anyInt()))
                .thenThrow(
                        new IllegalStateException(
                                SECRET_DB_DETAIL + " " + SECRET_QUERY,
                                new NullPointerException("root")));
        when(syncRunRepository.save(any(SyncRun.class))).thenAnswer(inv -> inv.getArgument(0));

        job.runNightlySync();

        List<ILoggingEvent> errors =
                appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList();
        assertEquals(1, errors.size(), "Unexpected listing failure must emit exactly 1 ERROR log");
        assertNotNull(errors.getFirst().getThrowableProxy());
        assertNoSecretLeak(errors.getFirst());
        assertTrue(
                throwableChainContains(
                        errors.getFirst().getThrowableProxy(), "IllegalStateException"));
        assertTrue(
                throwableChainContains(
                        errors.getFirst().getThrowableProxy(), "NullPointerException"));
        verify(syncRunRepository, times(1)).save(any(SyncRun.class));

        // 2) Expected failure -> 0 ERROR logs, 1 WARN without stack + FAILED SyncRun saved
        appender.list.clear();
        doThrow(new ValidationException("bad page parameter"))
                .when(identity)
                .findActiveSyncCandidates(anyInt(), anyInt());

        job.runNightlySync();

        assertEquals(0, appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).count());
        List<ILoggingEvent> warns =
                appender.list.stream().filter(e -> e.getLevel() == Level.WARN).toList();
        assertEquals(1, warns.size());
        assertNull(warns.getFirst().getThrowableProxy());
        verify(syncRunRepository, times(2)).save(any(SyncRun.class));

        // 3) Unexpected exception when persisting FAILED SyncRun also throws -> listing error STILL
        // logged once
        appender.list.clear();
        doThrow(new IllegalStateException(SECRET_DB_DETAIL + " " + SECRET_QUERY))
                .when(identity)
                .findActiveSyncCandidates(anyInt(), anyInt());
        doThrow(new RuntimeException("cannot save failed run"))
                .when(syncRunRepository)
                .save(any(SyncRun.class));

        assertThrows(RuntimeException.class, job::runNightlySync);

        List<ILoggingEvent> errorsWhenSaveFails =
                appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList();
        assertEquals(
                1,
                errorsWhenSaveFails.size(),
                "Listing error must still be logged once even if FAILED run persistence throws");
        assertNotNull(errorsWhenSaveFails.getFirst().getThrowableProxy());
        assertNoSecretLeak(errorsWhenSaveFails.getFirst());
    }

    @Test
    @DisplayName(
            "G3 ExternalSyncService logs original failure once even when syncRunPersistenceService.recordFailure throws")
    void externalSyncServiceLogsOriginalFailureWhenRecordFailureThrows() {
        IdentityPublicService identity = mock(IdentityPublicService.class);
        ExternalApiClient client = mock(ExternalApiClient.class);
        ExternalRecordNormalizer normalizer = mock(ExternalRecordNormalizer.class);
        CandidateSkillLockService lockService = mock(CandidateSkillLockService.class);
        SkillRecomputeService recomputeService = mock(SkillRecomputeService.class);
        SyncRunRepository syncRunRepository = mock(SyncRunRepository.class);
        SyncRunPersistenceService persistenceService = mock(SyncRunPersistenceService.class);
        PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
        when(txManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        ObjectMapper mapper = new JacksonConfig().objectMapper();

        ExternalSyncService service =
                new ExternalSyncService(
                        FIXED_CLOCK,
                        identity,
                        client,
                        normalizer,
                        lockService,
                        recomputeService,
                        syncRunRepository,
                        persistenceService,
                        txManager,
                        mapper);

        when(identity.findCandidateSyncTargetByUserId(1L))
                .thenReturn(
                        Optional.of(
                                new CandidateSyncTargetDto(
                                        1L,
                                        "Nguyễn Văn An",
                                        "secret@pii.test",
                                        "lms-sv-001",
                                        true)));
        when(client.getStudentLmsResults("lms-sv-001")).thenReturn("[]");
        when(client.getStudentExamResults("lms-sv-001")).thenReturn("[]");
        when(client.getStudentInternships("lms-sv-001")).thenReturn("[]");
        when(normalizer.countArrayElements(any(), any())).thenReturn(0);
        when(normalizer.parseAndValidateLmsJson(any())).thenReturn(List.of());
        when(normalizer.parseAndValidateExamJson(any())).thenReturn(List.of());
        when(normalizer.parseAndValidatePmJson(any())).thenReturn(List.of());

        NullPointerException rootNpe = new NullPointerException("payload=" + SECRET_QUERY);
        DataIntegrityViolationException dbEx =
                new DataIntegrityViolationException(SECRET_DB_DETAIL, rootNpe);
        when(normalizer.upsertLmsItems(eq(1L), eq(0), any(), any())).thenThrow(dbEx);
        when(persistenceService.recordFailure(
                        eq(SyncTrigger.NIGHTLY), eq(1L), any(), any(), eq(dbEx)))
                .thenThrow(new RuntimeException("recordFailure DB down"));

        assertThrows(RuntimeException.class, () -> service.syncUser(1L, SyncTrigger.NIGHTLY));

        List<ILoggingEvent> errors =
                appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList();
        assertEquals(
                1,
                errors.size(),
                "Original exception must be logged once at ERROR even when recordFailure throws");
        assertNotNull(errors.getFirst().getThrowableProxy());
        assertNoSecretLeak(errors.getFirst());
        assertTrue(
                throwableChainContains(
                        errors.getFirst().getThrowableProxy(), "DataIntegrityViolationException"));

        // Expected failure when recordFailure throws -> 0 ERROR, 1 WARN without stack
        appender.list.clear();
        InvalidServiceKeyException keyEx = new InvalidServiceKeyException("bad key");
        when(client.getStudentLmsResults("lms-sv-001")).thenThrow(keyEx);
        when(persistenceService.recordFailure(
                        eq(SyncTrigger.ON_OPEN), eq(1L), any(), any(), eq(keyEx)))
                .thenThrow(new RuntimeException("recordFailure DB down"));

        assertThrows(RuntimeException.class, () -> service.syncUser(1L, SyncTrigger.ON_OPEN));

        assertEquals(0, appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).count());
        List<ILoggingEvent> warns =
                appender.list.stream().filter(e -> e.getLevel() == Level.WARN).toList();
        assertEquals(1, warns.size());
        assertNull(warns.getFirst().getThrowableProxy());
    }

    private static void assertNoSecretLeak(ILoggingEvent event) {
        String msg = event.getFormattedMessage();
        assertFalse(msg.contains("secret-value-leak"), "Message leaked DB detail: " + msg);
        assertFalse(msg.contains("secret@pii.test"), "Message leaked PII: " + msg);
        assertFalse(msg.contains("secret-key-leak"), "Message leaked service key: " + msg);
        assertFalse(msg.contains("token=abc"), "Message leaked URL query: " + msg);
        IThrowableProxy proxy = event.getThrowableProxy();
        while (proxy != null) {
            String tMsg = proxy.getMessage() == null ? "" : proxy.getMessage();
            assertFalse(tMsg.contains("secret-value-leak"), "Throwable leaked DB detail: " + tMsg);
            assertFalse(tMsg.contains("secret@pii.test"), "Throwable leaked PII: " + tMsg);
            assertFalse(tMsg.contains("secret-key-leak"), "Throwable leaked key: " + tMsg);
            assertFalse(tMsg.contains("token=abc"), "Throwable leaked query: " + tMsg);
            proxy = proxy.getCause();
        }
    }

    private static boolean throwableChainContains(IThrowableProxy proxy, String token) {
        IThrowableProxy cur = proxy;
        while (cur != null) {
            String combined =
                    (cur.getClassName() == null ? "" : cur.getClassName())
                            + " "
                            + (cur.getMessage() == null ? "" : cur.getMessage());
            if (combined.contains(token)) {
                return true;
            }
            cur = cur.getCause();
        }
        return false;
    }
}
