package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.config.AiGovernanceProperties;
import com.rikkei.jobs.ai.config.AiProperties;
import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.UpdateAiConfigRequest;
import com.rikkei.jobs.ai.repository.AiConfigRepository;
import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ValidationException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Manages the singleton AI governance configuration with a short-lived in-memory snapshot.
 *
 * <p>Reads via {@link #get()} serve from an in-memory snapshot within {@code
 * app.ai.config-cache-ttl-ms} (default 5000 ms) using the injected {@link Clock}, issuing zero DB
 * queries and zero transactions on cache hits. {@link #update(UpdateAiConfigRequest, long)}
 * invalidates the snapshot immediately on the current instance (and on transaction completion when
 * active); across multiple application instances, staleness is bounded by {@code <= TTL}.
 */
@Service
public class AiConfigService {
    private static final Pattern SAFE_MODEL_BASE =
            Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$");
    private static final Pattern SAFE_MODEL_WITH_COLON =
            Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$");

    private final AiConfigRepository repository;
    private final AiProperties properties;
    private final AiGovernanceProperties governanceProperties;
    private final Clock clock;
    private final TransactionTemplate requiresNewTx;
    private final Object refreshLock = new Object();
    private final AtomicLong invalidationGeneration = new AtomicLong();
    private volatile CachedConfig snapshot;

    @Autowired
    public AiConfigService(
            AiConfigRepository repository,
            AiProperties properties,
            AiGovernanceProperties governanceProperties,
            Clock clock,
            PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.properties = properties;
        this.governanceProperties = governanceProperties;
        this.clock = clock;
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.requiresNewTx = template;
    }

    public AiConfigDto get() {
        Instant now = clock.instant();
        CachedConfig current = snapshot;
        if (current != null && now.isBefore(current.expiresAt())) {
            return current.value();
        }
        long ttlMs = Math.max(0L, governanceProperties.getConfigCacheTtlMs());
        synchronized (refreshLock) {
            now = clock.instant();
            current = snapshot;
            if (current != null && now.isBefore(current.expiresAt())) {
                return current.value();
            }
            long genBefore = invalidationGeneration.get();
            AiConfigDto loaded =
                    requiresNewTx.execute(
                            status -> repository.find().orElseGet(this::initializeAndFetch));
            if (ttlMs > 0 && loaded != null && invalidationGeneration.get() == genBefore) {
                snapshot = new CachedConfig(loaded, now.plusMillis(ttlMs));
            } else if (ttlMs == 0) {
                snapshot = null;
            }
            return loaded;
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public AiConfigDto update(UpdateAiConfigRequest input, long adminId) {
        validateProviderKey(input.provider());
        validateModel(input.provider(), input.model());

        if (repository.find().isEmpty()) {
            // Initialization is also needed for a PUT before the first GET.
            initializeAndFetch();
        }
        if (!repository.update(input, adminId, OffsetDateTime.now(clock))) {
            throw new ConflictException("Cấu hình đã thay đổi. Vui lòng tải lại trước khi lưu.");
        }
        AiConfigDto updated = repository.find().orElseThrow();
        invalidateSnapshot();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCompletion(int status) {
                            invalidateSnapshot();
                        }
                    });
        }
        return updated;
    }

    public void evictCache() {
        invalidateSnapshot();
    }

    private void invalidateSnapshot() {
        invalidationGeneration.incrementAndGet();
        snapshot = null;
    }

    private AiConfigDto initializeAndFetch() {
        AiProvider provider = AiProvider.fromString(properties.getProvider());
        repository.initialize(
                new AiConfigDto(
                        1,
                        provider,
                        defaultModelFor(provider),
                        new BigDecimal("0.30"),
                        150,
                        100,
                        true,
                        null,
                        OffsetDateTime.now(clock),
                        0));
        return repository.find().orElseThrow();
    }

    private String defaultModelFor(AiProvider provider) {
        return switch (provider) {
            case OPENAI -> properties.getOpenai().getModel();
            case GEMINI -> properties.getGemini().getModel();
            case CLAUDE -> properties.getClaude().getModel();
            case MOCK -> "mock";
        };
    }

    private void validateProviderKey(AiProvider provider) {
        if (provider == AiProvider.MOCK) {
            return;
        }
        String apiKey =
                switch (provider) {
                    case OPENAI -> properties.getOpenai().getApiKey();
                    case GEMINI -> properties.getGemini().getApiKey();
                    case CLAUDE -> properties.getClaude().getApiKey();
                    case MOCK -> "";
                };
        if (apiKey == null || apiKey.isBlank()) {
            throw new ValidationException("Chưa cấu hình khóa API cho nhà cung cấp này");
        }
    }

    private static void validateModel(AiProvider provider, String model) {
        if (model == null || model.isBlank() || model.length() > 120) {
            throw new ValidationException("Tên mô hình không hợp lệ cho nhà cung cấp đã chọn");
        }
        if (model.contains("..")
                || model.indexOf('/') >= 0
                || model.indexOf('\\') >= 0
                || model.indexOf('?') >= 0
                || model.indexOf('#') >= 0) {
            throw new ValidationException("Tên mô hình không hợp lệ cho nhà cung cấp đã chọn");
        }
        for (int i = 0; i < model.length(); i++) {
            char c = model.charAt(i);
            if (Character.isWhitespace(c) || Character.isISOControl(c)) {
                throw new ValidationException("Tên mô hình không hợp lệ cho nhà cung cấp đã chọn");
            }
        }
        Pattern allowed =
                (provider == AiProvider.OPENAI || provider == AiProvider.CLAUDE)
                        ? SAFE_MODEL_WITH_COLON
                        : SAFE_MODEL_BASE;
        if (!allowed.matcher(model).matches()) {
            throw new ValidationException("Tên mô hình không hợp lệ cho nhà cung cấp đã chọn");
        }
    }

    private record CachedConfig(AiConfigDto value, Instant expiresAt) {}
}
