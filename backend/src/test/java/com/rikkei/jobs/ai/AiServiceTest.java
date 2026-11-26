package com.rikkei.jobs.ai;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.AiGenerationResult;
import com.rikkei.jobs.ai.dto.AiLogDto;
import com.rikkei.jobs.ai.model.AiFeature;
import com.rikkei.jobs.ai.model.AiLogStatus;
import com.rikkei.jobs.ai.service.*;
import com.rikkei.jobs.common.exception.RateLimitException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;

class AiServiceTest {
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-22T00:00:00Z"), ZoneOffset.UTC);
    private final AiConfigService configs = mock(AiConfigService.class);
    private final AiAuditService audit = mock(AiAuditService.class);
    private final AiClient client = mock(AiClient.class);
    private AiService service;

    @BeforeEach
    void setUp() {
        when(client.getProvider()).thenReturn(AiProvider.OPENAI);
        when(configs.get()).thenReturn(settings(true));
        service = new AiService(configs, audit, new PiiMasker(), clock, List.of(client));
    }

    @ParameterizedTest
    @EnumSource(AiFeature.class)
    void everyFeatureUsesMaskQuotaAndAudit(AiFeature feature) {
        when(audit.reserve(anyLong(), any(), eq(2))).thenReturn(true);
        when(client.generate(anyString(), any()))
                .thenReturn(new AiGenerationResult("Email: c@d.vn", 15, 9));
        var result = service.generate(1, feature, "a@b.com, 0912345678, 001203004567", "fallback");
        verify(client).generate(eq("[EMAIL], [PHONE], [ID]"), eq(settings(true)));
        AiLogDto log = recorded();
        assertEquals("[EMAIL], [PHONE], [ID]", log.promptMasked());
        assertEquals("Email: [EMAIL]", log.response());
        assertEquals("Email: [EMAIL]", result.text());
        assertEquals(feature, log.feature());
        assertEquals(AiLogStatus.OK, log.status());
        assertEquals(15, log.tokensIn());
        assertEquals(9, log.tokensOut());
        assertTrue(result.aiGenerated());
    }

    @Test
    void thirdCallIs429AndBlockedWithoutCallingProvider() {
        when(audit.reserve(anyLong(), any(), eq(2))).thenReturn(true, true, false);
        when(client.generate(anyString(), any())).thenReturn(new AiGenerationResult("ok", 3, 2));
        service.generate(1, AiFeature.CHAT, "one", "fallback");
        service.generate(1, AiFeature.CV, "two", "fallback");
        RateLimitException rejected =
                assertThrows(
                        RateLimitException.class,
                        () ->
                                service.generate(
                                        1, AiFeature.PRACTICE, "a@b.com, 0912345678", "fallback"));
        assertEquals(429, rejected.getStatus().value());
        verify(client, times(2)).generate(anyString(), any());
        ArgumentCaptor<AiLogDto> logs = ArgumentCaptor.forClass(AiLogDto.class);
        verify(audit, times(3)).record(logs.capture());
        assertEquals(AiLogStatus.BLOCKED, logs.getAllValues().getLast().status());
        assertEquals("[EMAIL], [PHONE]", logs.getAllValues().getLast().promptMasked());
    }

    @ParameterizedTest
    @EnumSource(AiFeature.class)
    void disabledDoesNotReserveOrCallProvider(AiFeature feature) {
        when(configs.get()).thenReturn(settings(false));
        assertEquals(
                "AI đang tạm tắt", service.generate(1, feature, "0912345678", "fallback").text());
        verify(audit, never()).reserve(anyLong(), any(), anyInt());
        verify(client, never()).generate(anyString(), any());
        assertEquals(AiLogStatus.BLOCKED, recorded().status());
    }

    @Test
    void providerFailureLogsGenericErrorAndReturnsMaskedFallback() {
        when(audit.reserve(anyLong(), any(), anyInt())).thenReturn(true);
        when(client.generate(anyString(), any()))
                .thenThrow(new IllegalStateException("private upstream body"));
        assertEquals("[EMAIL]", service.generate(1, AiFeature.CHAT, "a@b.com", "c@d.vn").text());
        AiLogDto log = recorded();
        assertEquals(AiLogStatus.ERROR, log.status());
        assertFalse(log.response().contains("private upstream body"));
        assertNull(log.tokensIn());
        assertNull(log.tokensOut());
    }

    @Test
    void emptyResponseIsAuditedAsError() {
        when(audit.reserve(anyLong(), any(), anyInt())).thenReturn(true);
        when(client.generate(anyString(), any()))
                .thenReturn(new AiGenerationResult(" ", null, null));
        assertEquals("fallback", service.generate(1, AiFeature.CHAT, "safe", "fallback").text());
        assertEquals(AiLogStatus.ERROR, recorded().status());
    }

    @Test
    void emptyResultPreservesReportedTokenUsageInTheErrorLog() {
        when(audit.reserve(anyLong(), any(), anyInt())).thenReturn(true);
        when(client.generate(anyString(), any())).thenReturn(new AiGenerationResult("", 15, 4));
        service.generate(1, AiFeature.CHAT, "safe", "fallback");
        AiLogDto log = recorded();
        assertEquals(AiLogStatus.ERROR, log.status());
        assertEquals(15, log.tokensIn());
        assertEquals(4, log.tokensOut());
    }

    @Test
    void configChangesTakeEffectOnTheNextCall() {
        when(audit.reserve(anyLong(), any(), anyInt())).thenReturn(true);
        when(client.generate(anyString(), any())).thenReturn(new AiGenerationResult("ok", 1, 1));
        service.generate(1, AiFeature.CHAT, "one", "fallback");
        when(configs.get()).thenReturn(settings(false));
        assertEquals(
                AiService.DISABLED_MESSAGE,
                service.generate(1, AiFeature.CHAT, "two", "fallback").text());
        verify(client, times(1)).generate(anyString(), any());
    }

    @Test
    void auditFailureIsNotSwallowedOrLoggedTwice() {
        when(audit.reserve(anyLong(), any(), anyInt())).thenReturn(true);
        when(client.generate(anyString(), any())).thenReturn(new AiGenerationResult("ok", 1, 1));
        doThrow(new IllegalStateException("audit unavailable")).when(audit).record(any());
        assertThrows(
                IllegalStateException.class,
                () -> service.generate(1, AiFeature.CHAT, "safe", "fallback"));
        verify(audit, times(1)).record(any());
    }

    @Test
    void maskerFailureFailsClosedBeforeProviderCallOrAuditWrite() {
        PiiMasker failingMasker = mock(PiiMasker.class);
        when(failingMasker.mask(anyString()))
                .thenThrow(new IllegalStateException("masker failure"));
        AiService guarded = new AiService(configs, audit, failingMasker, clock, List.of(client));
        assertThrows(
                IllegalStateException.class,
                () -> guarded.generate(1, AiFeature.CHAT, "a@b.com", "fallback"));
        verify(audit, never()).reserve(anyLong(), any(), anyInt());
        verify(client, never()).generate(anyString(), any());
        verify(audit, never()).record(any());
    }

    @Test
    void maskerFailureOnResponseFailsClosedBeforeAuditWrite() {
        PiiMasker partialMasker = mock(PiiMasker.class);
        when(partialMasker.mask("safe")).thenReturn("safe");
        when(partialMasker.mask("raw-response"))
                .thenThrow(new IllegalStateException("masker response failure"));
        when(audit.reserve(anyLong(), any(), anyInt())).thenReturn(true);
        when(client.generate(anyString(), any()))
                .thenReturn(new AiGenerationResult("raw-response", 1, 1));
        AiService guarded = new AiService(configs, audit, partialMasker, clock, List.of(client));
        assertThrows(
                IllegalStateException.class,
                () -> guarded.generate(1, AiFeature.CHAT, "safe", "fallback"));
        verify(audit, never()).record(any());
    }

    private AiLogDto recorded() {
        ArgumentCaptor<AiLogDto> log = ArgumentCaptor.forClass(AiLogDto.class);
        verify(audit).record(log.capture());
        return log.getValue();
    }

    private AiConfigDto settings(boolean enabled) {
        return new AiConfigDto(
                1,
                AiProvider.OPENAI,
                "test-model",
                new BigDecimal("0.30"),
                150,
                2,
                enabled,
                null,
                OffsetDateTime.now(clock),
                0);
    }
}
