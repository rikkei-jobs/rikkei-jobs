package com.rikkei.jobs.challenger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.identity.dto.SsoLoginRequest;
import com.rikkei.jobs.identity.exception.TicketAlreadyUsedException;
import com.rikkei.jobs.identity.service.AuthService;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Empirical Challenger Test: Verifies that SSO ticket burn CANNOT be rolled back even if the
 * calling application layer wraps ssoLogin in an outer transaction that experiences an unhandled
 * application exception and initiates a rollback.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("Challenger M1: Outer Transaction Rollback Adversarial Test")
public class M1TicketBurnRollbackAdversarialTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockitoBean private ExternalApiClient externalApiClient;

    @Autowired private AuthService authService;

    @Autowired private PlatformTransactionManager transactionManager;

    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName(
            "Fail-Secure Proof: Outer transaction rollback DOES NOT rollback ticket burn in used_sso_tickets")
    void testOuterTransactionRollbackDoesNotRollbackBurnedTicket() {
        String attackTicket = "rollback-attack-ticket-" + UUID.randomUUID();
        String validLmsJson =
                """
            {
              "lmsUserId": "lms-rollback-user-1",
              "email": "rollback_%s@rikkeijobs.test",
              "fullName": "Rollback Test User",
              "role": "CANDIDATE",
              "issuedAt": "%s"
            }
            """
                        .formatted(UUID.randomUUID(), OffsetDateTime.now().minusSeconds(5));

        when(externalApiClient.verifySsoTicket(attackTicket)).thenReturn(validLmsJson);

        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);

        // Attempt 1: Call ssoLogin inside an outer transaction that throws RuntimeException and
        // rolls back
        assertThrows(
                RuntimeException.class,
                () -> {
                    txTemplate.execute(
                            status -> {
                                authService.ssoLogin(new SsoLoginRequest(attackTicket));
                                throw new RuntimeException(
                                        "SIMULATED DOWNSTREAM APPLICATION CRASH AFTER SSO LOGIN");
                            });
                });

        // Verify with direct SQL query: Ticket MUST remain in used_sso_tickets table despite outer
        // rollback
        Integer countInDb =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM used_sso_tickets WHERE ticket = ?",
                        Integer.class,
                        attackTicket);
        assertEquals(
                1,
                countInDb,
                "Ticket MUST remain burned in used_sso_tickets even if outer transaction rolls back!");

        // Attempt 2: Replay attack with the same ticket MUST be rejected with
        // TicketAlreadyUsedException (HTTP 401)
        TicketAlreadyUsedException ex =
                assertThrows(
                        TicketAlreadyUsedException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(attackTicket)));
        assertEquals("TICKET_ALREADY_USED", ex.getCode());
    }

    @Test
    @DisplayName(
            "Two-thread Concurrency Race: Exactly one thread burns ticket, second thread immediately rejected")
    void testTwoThreadsRaceCondition() throws Exception {
        String sharedTicket = "race-2-threads-" + UUID.randomUUID();
        String lmsJson =
                """
            {
              "lmsUserId": "lms-race-user",
              "email": "race_%s@rikkeijobs.test",
              "fullName": "Race User",
              "role": "CANDIDATE",
              "issuedAt": "%s"
            }
            """
                        .formatted(UUID.randomUUID(), OffsetDateTime.now().minusSeconds(5));

        when(externalApiClient.verifySsoTicket(sharedTicket)).thenReturn(lmsJson);

        java.util.concurrent.CountDownLatch ready = new java.util.concurrent.CountDownLatch(2);
        java.util.concurrent.CountDownLatch start = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.CountDownLatch done = new java.util.concurrent.CountDownLatch(2);

        java.util.concurrent.atomic.AtomicInteger successCount =
                new java.util.concurrent.atomic.AtomicInteger(0);
        java.util.concurrent.atomic.AtomicInteger usedCount =
                new java.util.concurrent.atomic.AtomicInteger(0);
        java.util.concurrent.atomic.AtomicInteger otherErrorCount =
                new java.util.concurrent.atomic.AtomicInteger(0);

        Runnable task =
                () -> {
                    ready.countDown();
                    try {
                        start.await();
                        authService.ssoLogin(new SsoLoginRequest(sharedTicket));
                        successCount.incrementAndGet();
                    } catch (TicketAlreadyUsedException e) {
                        usedCount.incrementAndGet();
                    } catch (Throwable t) {
                        otherErrorCount.incrementAndGet();
                    } finally {
                        done.countDown();
                    }
                };

        Thread t1 = new Thread(task);
        Thread t2 = new Thread(task);
        t1.start();
        t2.start();

        ready.await();
        start.countDown(); // Release both threads simultaneously
        done.await();

        assertEquals(1, successCount.get(), "EXACTLY one thread must succeed");
        assertEquals(
                1, usedCount.get(), "EXACTLY one thread must receive TicketAlreadyUsedException");
        assertEquals(0, otherErrorCount.get(), "No unexpected errors or race condition leaks");

        Integer countInDb =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM used_sso_tickets WHERE ticket = ?",
                        Integer.class,
                        sharedTicket);
        assertEquals(1, countInDb, "Table used_sso_tickets must contain exactly 1 record");
    }
}
