package com.rikkei.jobs.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.ai.config.AiGovernanceProperties;
import com.rikkei.jobs.ai.config.AiProperties;
import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.UpdateAiConfigRequest;
import com.rikkei.jobs.ai.repository.AiConfigRepository;
import com.rikkei.jobs.ai.service.AiConfigService;
import com.rikkei.jobs.ai.service.AiProvider;
import com.rikkei.jobs.common.exception.ValidationException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.transaction.PlatformTransactionManager;

class AiConfigServiceTest {

    private AiConfigRepository repository;
    private AiProperties properties;
    private AiGovernanceProperties governanceProperties;
    private MutableClock clock;
    private PlatformTransactionManager transactionManager;
    private AiConfigService service;

    @BeforeEach
    void setUp() {
        repository = mock(AiConfigRepository.class);
        properties = new AiProperties();
        properties.setProvider("mock");
        governanceProperties = new AiGovernanceProperties();
        governanceProperties.setConfigCacheTtlMs(5000L);
        clock = new MutableClock(Instant.parse("2026-11-22T00:00:00Z"));
        transactionManager = mock(PlatformTransactionManager.class);
        service =
                new AiConfigService(
                        repository, properties, governanceProperties, clock, transactionManager);
    }

    @Test
    void multipleCallsWithinTtlIssueOnlyOneDatabaseQuery() {
        AiConfigDto stored = config(AiProvider.MOCK, "mock", 100, 0L);
        when(repository.find()).thenReturn(Optional.of(stored));

        for (int i = 0; i < 10; i++) {
            assertEquals(stored, service.get());
        }

        verify(repository, times(1)).find();
    }

    @Test
    void updateInvalidatesSnapshotImmediatelyOnSameInstance() {
        AiConfigDto initial = config(AiProvider.MOCK, "mock", 100, 0L);
        AiConfigDto updated = config(AiProvider.MOCK, "mock", 25, 1L);
        when(repository.find())
                .thenReturn(Optional.of(initial))
                .thenReturn(Optional.of(initial))
                .thenReturn(Optional.of(updated));
        when(repository.update(any(), anyLong(), any())).thenReturn(true);

        assertEquals(100, service.get().dailyLimitPerUser());

        AiConfigDto result =
                service.update(
                        new UpdateAiConfigRequest(
                                AiProvider.MOCK, "mock", new BigDecimal("0.30"), 150, 25, true, 0L),
                        9L);

        assertEquals(25, result.dailyLimitPerUser());
        assertEquals(25, service.get().dailyLimitPerUser());
    }

    @Test
    void externalDatabaseChangeIsPickedUpAfterTtlExpires() {
        AiConfigDto initial = config(AiProvider.MOCK, "mock", 100, 0L);
        AiConfigDto externalUpdate = config(AiProvider.MOCK, "mock", 42, 1L);
        when(repository.find())
                .thenReturn(Optional.of(initial))
                .thenReturn(Optional.of(externalUpdate));

        assertEquals(100, service.get().dailyLimitPerUser());

        clock.advanceMillis(4999L);
        assertEquals(100, service.get().dailyLimitPerUser());
        verify(repository, times(1)).find();

        clock.advanceMillis(1L);
        assertEquals(42, service.get().dailyLimitPerUser());
        verify(repository, times(2)).find();
    }

    @Test
    void concurrentReadsOnEmptyTableInitializeOnceAndSucceed() throws Exception {
        AtomicReference<AiConfigDto> row = new AtomicReference<>();
        when(repository.find()).thenAnswer(invocation -> Optional.ofNullable(row.get()));
        org.mockito.Mockito.doAnswer(
                        invocation -> {
                            row.compareAndSet(null, invocation.getArgument(0));
                            return null;
                        })
                .when(repository)
                .initialize(any());

        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(16)) {
            List<Future<AiConfigDto>> futures = new ArrayList<>();
            for (int i = 0; i < 16; i++) {
                futures.add(
                        executor.submit(
                                () -> {
                                    start.await();
                                    return service.get();
                                }));
            }
            start.countDown();
            for (Future<AiConfigDto> future : futures) {
                assertEquals(AiProvider.MOCK, future.get().provider());
            }
        }

        verify(repository, times(1)).initialize(any());
    }

    @ParameterizedTest
    @EnumSource(
            value = AiProvider.class,
            names = {"OPENAI", "GEMINI", "CLAUDE"})
    void updateRejectsRealProviderWhenApiKeyIsBlank(AiProvider provider) {
        ValidationException ex =
                assertThrows(
                        ValidationException.class,
                        () ->
                                service.update(
                                        new UpdateAiConfigRequest(
                                                provider,
                                                "valid-model",
                                                new BigDecimal("0.30"),
                                                150,
                                                10,
                                                true,
                                                0L),
                                        9L));

        assertEquals("Chưa cấu hình khóa API cho nhà cung cấp này", ex.getMessage());
        verify(repository, times(0)).update(any(), anyLong(), any());
    }

    @Test
    void updateAllowsMockProviderWithoutApiKeys() {
        AiConfigDto initial = config(AiProvider.MOCK, "mock", 100, 0L);
        AiConfigDto updated = config(AiProvider.MOCK, "mock", 10, 1L);
        when(repository.find()).thenReturn(Optional.of(initial)).thenReturn(Optional.of(updated));
        when(repository.update(any(), anyLong(), any())).thenReturn(true);

        AiConfigDto result =
                service.update(
                        new UpdateAiConfigRequest(
                                AiProvider.MOCK, "mock", new BigDecimal("0.30"), 150, 10, true, 0L),
                        9L);
        assertEquals(AiProvider.MOCK, result.provider());
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "../evil",
                "models/gemini-pro",
                "gemini\\pro",
                "gemini?key=x",
                "gemini#frag",
                "gemini..pro",
                "gemini pro",
                "gemini\npro",
                "gemini-1.5-flash:batchGenerateContent",
                "-leading-dash"
            })
    void updateRejectsUnsafeModelNamesForGemini(String unsafeModel) {
        properties.getGemini().setApiKey("synthetic-key");
        assertThrows(
                ValidationException.class,
                () ->
                        service.update(
                                new UpdateAiConfigRequest(
                                        AiProvider.GEMINI,
                                        unsafeModel,
                                        new BigDecimal("0.30"),
                                        150,
                                        10,
                                        true,
                                        0L),
                                9L));
    }

    @Test
    void updateAllowsFineTunedColonModelForOpenAiButRejectsPathChars() {
        properties.getOpenai().setApiKey("synthetic-key");
        AiConfigDto initial = config(AiProvider.OPENAI, "gpt-4o-mini", 100, 0L);
        AiConfigDto updated = config(AiProvider.OPENAI, "ft:gpt-4o-mini:org:v1", 100, 1L);
        when(repository.find()).thenReturn(Optional.of(initial)).thenReturn(Optional.of(updated));
        when(repository.update(any(), anyLong(), any())).thenReturn(true);

        AiConfigDto result =
                service.update(
                        new UpdateAiConfigRequest(
                                AiProvider.OPENAI,
                                "ft:gpt-4o-mini:org:v1",
                                new BigDecimal("0.30"),
                                150,
                                100,
                                true,
                                0L),
                        9L);
        assertEquals("ft:gpt-4o-mini:org:v1", result.model());

        assertThrows(
                ValidationException.class,
                () ->
                        service.update(
                                new UpdateAiConfigRequest(
                                        AiProvider.OPENAI,
                                        "gpt..4o",
                                        new BigDecimal("0.30"),
                                        150,
                                        100,
                                        true,
                                        1L),
                                9L));
    }

    private AiConfigDto config(AiProvider provider, String model, int limit, long version) {
        return new AiConfigDto(
                1L,
                provider,
                model,
                new BigDecimal("0.30"),
                150,
                limit,
                true,
                null,
                OffsetDateTime.now(clock),
                version);
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
