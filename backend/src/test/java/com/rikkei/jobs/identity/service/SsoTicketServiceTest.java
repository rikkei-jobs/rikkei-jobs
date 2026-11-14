package com.rikkei.jobs.identity.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.identity.repository.UsedSsoTicketRepository;
import java.lang.reflect.Method;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@ExtendWith(MockitoExtension.class)
class SsoTicketServiceTest {

    @Mock private UsedSsoTicketRepository usedSsoTicketRepository;

    private SsoTicketService ssoTicketService;

    @BeforeEach
    void setUp() {
        ssoTicketService = new SsoTicketService(usedSsoTicketRepository);
    }

    @Test
    @DisplayName(
            "consumeTicket must be annotated with @Transactional(propagation = Propagation.REQUIRES_NEW)")
    void testConsumeTicketTransactionalAnnotation() throws NoSuchMethodException {
        Method method =
                SsoTicketService.class.getMethod(
                        "consumeTicket", String.class, OffsetDateTime.class);

        Transactional transactional = method.getAnnotation(Transactional.class);
        assertNotNull(
                transactional,
                "consumeTicket must be annotated with org.springframework.transaction.annotation.Transactional");
        assertEquals(
                Propagation.REQUIRES_NEW,
                transactional.propagation(),
                "Transactional propagation MUST be REQUIRES_NEW for fail-secure autonomous commit");
    }

    @Test
    @DisplayName("consumeTicket returns true when repository inserts ticket successfully (1 row)")
    void testConsumeTicketSuccess() {
        String ticket = "sso-ticket-success-12345";
        OffsetDateTime usedAt = OffsetDateTime.of(2026, 11, 12, 10, 0, 0, 0, ZoneOffset.UTC);

        when(usedSsoTicketRepository.insertIfUnused(ticket, usedAt)).thenReturn(1);

        boolean result = ssoTicketService.consumeTicket(ticket, usedAt);

        assertTrue(result, "consumeTicket must return true when insertIfUnused returns 1");
        verify(usedSsoTicketRepository).insertIfUnused(eq(ticket), eq(usedAt));
    }

    @Test
    @DisplayName(
            "consumeTicket returns false when repository detects conflict/replay (0 rows affected)")
    void testConsumeTicketReplayDetected() {
        String ticket = "sso-ticket-replayed-67890";
        OffsetDateTime usedAt = OffsetDateTime.of(2026, 11, 12, 10, 5, 0, 0, ZoneOffset.UTC);

        when(usedSsoTicketRepository.insertIfUnused(ticket, usedAt)).thenReturn(0);

        boolean result = ssoTicketService.consumeTicket(ticket, usedAt);

        assertFalse(result, "consumeTicket must return false when insertIfUnused returns 0");
        verify(usedSsoTicketRepository).insertIfUnused(eq(ticket), eq(usedAt));
    }
}
