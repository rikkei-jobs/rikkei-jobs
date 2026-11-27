package com.rikkei.jobs.recruitment.service;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.GlobalExceptionHandler;
import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
import com.rikkei.jobs.recruitment.dto.HrApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.WithdrawApplicationRequest;
import com.rikkei.jobs.recruitment.integration.CvSnapshotPayload;
import com.rikkei.jobs.recruitment.integration.InMemoryCvPortTestDouble;
import com.rikkei.jobs.recruitment.model.Application;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.repository.ApplicationCvSnapshotRepository;
import com.rikkei.jobs.recruitment.repository.ApplicationRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import jakarta.persistence.EntityManagerFactory;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.hibernate.SessionFactory;
import org.hibernate.stat.EntityStatistics;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
@DisplayName(
        "Recruitment Persistence, Anti-N+1, TX Boundary, Optimistic Lock & Async Mail Integration Tests")
class ApplicationPersistenceAndAntiNPlusOneIntegrationTest {

    private static final Instant BASE_INSTANT = Instant.parse("2026-11-19T05:00:00Z");
    private static final byte[] SAMPLE_PDF =
            ("%PDF-1.4\n1 0 obj\n<< /Title (Integration CV) >>\nendobj\n%%EOF\n")
                    .getBytes(StandardCharsets.UTF_8);

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @TestConfiguration
    static class RecordingCvPortConfig {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(BASE_INSTANT, ZoneOffset.UTC);
        }

        @Bean
        @Primary
        RecordingCvPort recordingCvPort() {
            return new RecordingCvPort();
        }
    }

    static class RecordingCvPort extends InMemoryCvPortTestDouble {
        final AtomicBoolean txActiveDuringFetch = new AtomicBoolean(true);

        @Override
        public CvSnapshotPayload getOwnedCvForApplication(Long cvId, Long candidateUserId) {
            txActiveDuringFetch.set(TransactionSynchronizationManager.isActualTransactionActive());
            return super.getOwnedCvForApplication(cvId, candidateUserId);
        }
    }

    @MockitoBean private JavaMailSender javaMailSender;
    @MockitoSpyBean private ApplicationCvSnapshotRepository snapshotRepository;

    @Autowired private ApplicationService applicationService;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private EntityManagerFactory entityManagerFactory;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private Clock clock;
    @Autowired private RecordingCvPort recordingCvPort;
    @Autowired private GlobalExceptionHandler globalExceptionHandler;

    private Logger recruitmentLogger;
    private ListAppender<ILoggingEvent> listAppender;

    @BeforeEach
    void setUp() {
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        recordingCvPort.clear();
        recordingCvPort.txActiveDuringFetch.set(true);
        reset(snapshotRepository, javaMailSender);
        when(javaMailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));

        recruitmentLogger = (Logger) LoggerFactory.getLogger("com.rikkei.jobs.recruitment");
        listAppender = new ListAppender<>();
        listAppender.start();
        recruitmentLogger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        if (recruitmentLogger != null && listAppender != null) {
            recruitmentLogger.detachAppender(listAppender);
            listAppender.stop();
        }
        reset(snapshotRepository, javaMailSender);
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        recordingCvPort.clear();
        jdbcTemplate.update("DELETE FROM applications WHERE id > 7");
    }

    @Test
    @DisplayName(
            "F2 Anti-N+1: getMyApplications (7 seeded items) & getHrApplications execute O(1) SQL statements")
    void testBatchJobSummariesPreventsNPlusOneQueries() {
        SessionFactory sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
        Statistics stats = sessionFactory.getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();

        long startCount = stats.getPrepareStatementCount();
        PageResponse<ApplicationSummaryResponse> candidatePage =
                applicationService.getMyApplications(1L, null, 1, 20);
        long candidateQueries = stats.getPrepareStatementCount() - startCount;

        assertEquals(7, candidatePage.items().size());
        assertTrue(
                candidateQueries <= 3L,
                "Expected <= 3 SQL statements for 7 applications across 7 jobs, actual="
                        + candidateQueries);

        stats.clear();
        long hrStartCount = stats.getPrepareStatementCount();
        PageResponse<HrApplicationSummaryResponse> hrPage =
                applicationService.getHrApplications(2L, 2L, null, 1, 20);
        long hrQueries = stats.getPrepareStatementCount() - hrStartCount;

        assertEquals(1, hrPage.items().size());
        assertTrue(
                hrQueries <= 3L,
                "Expected <= 3 SQL statements for HR list page, actual=" + hrQueries);
    }

    @Test
    @DisplayName(
            "F3 & F4: CvPort executes outside TX; single INSERT writes final cv_snapshot_url with 0 UPDATEs")
    void testTxBoundaryAndSingleInsertWithoutDoubleWrite() {
        recordingCvPort.registerCv(70L, 2L, "cv.pdf", "application/pdf", SAMPLE_PDF);

        SessionFactory sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
        Statistics stats = sessionFactory.getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();

        ApplicationDetailResponse response =
                applicationService.apply(7L, 2L, new ApplyJobRequest(70L, "Single insert test"));

        assertFalse(
                recordingCvPort.txActiveDuringFetch.get(),
                "CvPort.getOwnedCvForApplication must run OUTSIDE any database transaction");

        EntityStatistics appStats = stats.getEntityStatistics(Application.class.getName());
        assertEquals(1L, appStats.getInsertCount(), "Application must execute exactly 1 INSERT");
        assertEquals(0L, appStats.getUpdateCount(), "Application must execute 0 UPDATEs");
        assertEquals(
                "/api/v1/me/applications/" + response.id() + "/cv-snapshot",
                response.cvSnapshotUrl());
    }

    @Test
    @DisplayName(
            "F3 Atomicity: Snapshot write failure rolls back application, history, and suppresses mail event")
    void testSnapshotFailureRollsBackEntireApplicationAndSuppressesMail() {
        recordingCvPort.registerCv(71L, 2L, "cv.pdf", "application/pdf", SAMPLE_PDF);
        doThrow(new DataIntegrityViolationException("Simulated snapshot persistence error"))
                .when(snapshotRepository)
                .saveAndFlush(any());

        Integer beforeApps =
                jdbcTemplate.queryForObject("SELECT count(*) FROM applications", Integer.class);
        Integer beforeHistory =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM application_status_history", Integer.class);
        Integer beforeSnapshots =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM application_cv_snapshots", Integer.class);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> applicationService.apply(7L, 2L, new ApplyJobRequest(71L, "Rollback test")));

        assertEquals(
                beforeApps,
                jdbcTemplate.queryForObject("SELECT count(*) FROM applications", Integer.class));
        assertEquals(
                beforeHistory,
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM application_status_history", Integer.class));
        assertEquals(
                beforeSnapshots,
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM application_cv_snapshots", Integer.class));
        verify(javaMailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName(
            "F5 Optimistic Locking: Concurrent withdraws result in 1 success and 1 conflict (409)")
    void testConcurrentWithdrawTriggersOptimisticLocking() throws Exception {
        Long appId =
                jdbcTemplate.queryForObject(
                        "INSERT INTO applications (job_id, user_id, cv_id, cv_snapshot_url, status) "
                                + "VALUES (9, 2, 1, '/api/v1/me/applications/tmp/cv-snapshot', 'SUBMITTED') RETURNING id",
                        Long.class);
        assertNotNull(appId);

        int threads = 2;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger conflictCount = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(
                    () -> {
                        try {
                            startLatch.await();
                            applicationService.withdraw(
                                    appId, 2L, new WithdrawApplicationRequest("Concurrent test"));
                            successCount.incrementAndGet();
                        } catch (OptimisticLockingFailureException
                                | com.rikkei.jobs.recruitment.exception
                                                .InvalidApplicationStateException
                                        ex) {
                            conflictCount.incrementAndGet();
                        } catch (InterruptedException ex) {
                            Thread.currentThread().interrupt();
                        } finally {
                            doneLatch.countDown();
                        }
                    });
        }

        startLatch.countDown();
        assertTrue(doneLatch.await(10, TimeUnit.SECONDS));
        pool.shutdown();

        assertEquals(1, successCount.get());
        assertEquals(1, conflictCount.get());

        Application reloaded = applicationRepository.findById(appId).orElseThrow();
        assertEquals(ApplicationStatus.WITHDRAWN, reloaded.getStatus());
        assertTrue(reloaded.getVersion() >= 1L);

        ResponseEntity<ErrorResponse> mapped =
                globalExceptionHandler.handleOptimisticLocking(
                        new OptimisticLockingFailureException("Simulated version conflict"));
        assertEquals(HttpStatus.CONFLICT, mapped.getStatusCode());
        assertEquals("CONFLICT", mapped.getBody().code());
    }

    @Test
    @DisplayName(
            "F1 Async Mail: Sends 1 email per active HR on bounded executor; 0 HRs warns; SMTP failure never rolls back or leaks PII")
    void testPostCommitAsyncMailDeliveryAndZeroPiiLogging() {
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        OffsetDateTime now = OffsetDateTime.ofInstant(BASE_INSTANT, ZoneOffset.UTC);

        String activeHr2Email = "second-hr-co2-" + UUID.randomUUID() + "@rikkeijobs.test";
        User secondActiveHr =
                new User(
                        activeHr2Email,
                        passwordEncoder.encode("Pass#123"),
                        "Second Active HR",
                        null,
                        hrRole,
                        2L);
        secondActiveHr.setMustChangePassword(false);
        secondActiveHr.setStatus(UserStatus.ACTIVE);
        secondActiveHr.setCreatedAt(now);
        secondActiveHr.setUpdatedAt(now);
        secondActiveHr = userRepository.saveAndFlush(secondActiveHr);

        String lockedHrEmail = "locked-hr-co2-" + UUID.randomUUID() + "@rikkeijobs.test";
        User lockedHr =
                new User(
                        lockedHrEmail,
                        passwordEncoder.encode("Pass#123"),
                        "Locked HR",
                        null,
                        hrRole,
                        2L);
        lockedHr.setMustChangePassword(false);
        lockedHr.setStatus(UserStatus.LOCKED);
        lockedHr.setCreatedAt(now);
        lockedHr.setUpdatedAt(now);
        lockedHr = userRepository.saveAndFlush(lockedHr);

        try {
            // 1. Company 2 has 2 ACTIVE HRs -> expects 2 emails on rikkei-async-* thread
            AtomicReference<String> mailThreadName = new AtomicReference<>();
            doAnswer(
                            inv -> {
                                mailThreadName.set(Thread.currentThread().getName());
                                return null;
                            })
                    .when(javaMailSender)
                    .send(any(MimeMessage.class));

            recordingCvPort.registerCv(80L, 2L, "cv.pdf", "application/pdf", SAMPLE_PDF);
            applicationService.apply(
                    2L, 2L, new ApplyJobRequest(80L, "SECRET_COVER_LETTER_NEVER_IN_LOGS"));

            await().atMost(Duration.ofSeconds(5))
                    .untilAsserted(
                            () -> verify(javaMailSender, times(2)).send(any(MimeMessage.class)));
            assertNotNull(mailThreadName.get());
            assertTrue(
                    mailThreadName.get().startsWith("rikkei-async-"),
                    "Expected async executor thread prefix 'rikkei-async-', got: "
                            + mailThreadName.get());

            // 2. Company with 0 active HR -> logs WARN and sends 0 emails
            Long zeroHrCompanyId =
                    jdbcTemplate.queryForObject(
                            "INSERT INTO companies (name, tax_code, status) VALUES ('Zero HR Co', ?, 'ACTIVE') RETURNING id",
                            Long.class,
                            String.format(
                                    "%010d", 9_000_000_000L + (System.nanoTime() % 999_999_999L)));
            Long zeroHrJobId =
                    jdbcTemplate.queryForObject(
                            "INSERT INTO jobs (title, company_id, company_name, status, deadline) "
                                    + "VALUES ('Zero HR Job', ?, 'Zero HR Co', 'APPROVED', ?) RETURNING id",
                            Long.class,
                            zeroHrCompanyId,
                            now.plusDays(30));
            try {
                reset(javaMailSender);
                when(javaMailSender.createMimeMessage())
                        .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));

                ApplicationDetailResponse zeroHrApp =
                        applicationService.apply(
                                zeroHrJobId, 2L, new ApplyJobRequest(80L, "No HR test"));

                await().atMost(Duration.ofSeconds(5))
                        .untilAsserted(
                                () ->
                                        assertTrue(
                                                listAppender.list.stream()
                                                        .anyMatch(
                                                                e ->
                                                                        e.getLevel() == Level.WARN
                                                                                && e.getFormattedMessage()
                                                                                        .contains(
                                                                                                "companyId="
                                                                                                        + zeroHrCompanyId)
                                                                                && e.getFormattedMessage()
                                                                                        .contains(
                                                                                                "applicationId="
                                                                                                        + zeroHrApp
                                                                                                                .id()))));
                verify(javaMailSender, never()).send(any(MimeMessage.class));
            } finally {
                jdbcTemplate.update("DELETE FROM applications WHERE job_id = ?", zeroHrJobId);
                jdbcTemplate.update("DELETE FROM jobs WHERE id = ?", zeroHrJobId);
                jdbcTemplate.update("DELETE FROM companies WHERE id = ?", zeroHrCompanyId);
            }

            // 3. SMTP failure does not fail apply or rollback DB, logs once without PII
            reset(javaMailSender);
            when(javaMailSender.createMimeMessage())
                    .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
            doThrow(new MailSendException("SMTP failure for " + activeHr2Email))
                    .when(javaMailSender)
                    .send(any(MimeMessage.class));

            ApplicationDetailResponse smtpFailApp =
                    applicationService.apply(
                            8L, 2L, new ApplyJobRequest(80L, "SMTP_FAILURE_SECRET_COVER"));
            assertTrue(applicationRepository.findById(smtpFailApp.id()).isPresent());

            await().atMost(Duration.ofSeconds(5))
                    .untilAsserted(
                            () ->
                                    assertTrue(
                                            listAppender.list.stream()
                                                    .anyMatch(
                                                            e ->
                                                                    e.getLevel() == Level.ERROR
                                                                            && e.getFormattedMessage()
                                                                                    .contains(
                                                                                            "applicationId="
                                                                                                    + smtpFailApp
                                                                                                            .id()))));

            for (ILoggingEvent event : listAppender.list) {
                String msg = event.getFormattedMessage();
                assertFalse(msg.contains("hr2@rikkeijobs.test"));
                assertFalse(msg.contains(activeHr2Email));
                assertFalse(msg.contains(lockedHrEmail));
                assertFalse(msg.contains("candidate2@rikkeijobs.test"));
                assertFalse(msg.contains("Second Active HR"));
                assertFalse(msg.contains("SECRET_COVER_LETTER_NEVER_IN_LOGS"));
                assertFalse(msg.contains("SMTP_FAILURE_SECRET_COVER"));
            }
        } finally {
            userRepository.delete(secondActiveHr);
            userRepository.delete(lockedHr);
        }
    }
}
