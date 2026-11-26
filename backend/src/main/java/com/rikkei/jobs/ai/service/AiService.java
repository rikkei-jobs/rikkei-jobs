package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.AiGenerationResult;
import com.rikkei.jobs.ai.dto.AiLogDto;
import com.rikkei.jobs.ai.model.AiFeature;
import com.rikkei.jobs.ai.model.AiLogStatus;
import com.rikkei.jobs.common.exception.RateLimitException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Single governed gateway for RECOMMEND, CV, PRACTICE and CHAT. No DB transaction spans HTTP. */
@Service
@Transactional(propagation = Propagation.NOT_SUPPORTED)
public class AiService {
    public static final String DISABLED_MESSAGE = "AI đang tạm tắt";
    private static final Logger log = LoggerFactory.getLogger(AiService.class);
    private final AiConfigService configService;
    private final AiAuditService audit;
    private final PiiMasker masker;
    private final Clock clock;
    private final Map<AiProvider, AiClient> clients;

    public AiService(
            AiConfigService configService,
            AiAuditService audit,
            PiiMasker masker,
            Clock clock,
            List<AiClient> clientList) {
        this.configService = configService;
        this.audit = audit;
        this.masker = masker;
        this.clock = clock;
        this.clients =
                clientList.stream()
                        .collect(Collectors.toMap(AiClient::getProvider, Function.identity()));
    }

    public AiProvider getActiveProvider() {
        return configService.get().provider();
    }

    public boolean isEnabled() {
        return configService.get().enabled();
    }

    public boolean hasQuotaAvailable(long userId) {
        if (userId <= 0) {
            return false;
        }
        AiConfigDto config = configService.get();
        return config.dailyLimitPerUser() > 0
                && audit.hasQuotaAvailable(
                        userId,
                        LocalDate.now(clock.withZone(ZoneOffset.UTC)),
                        config.dailyLimitPerUser());
    }

    public AiExplanation generateJobExplanation(long userId, String prompt, String fallback) {
        AiExplanation result = generate(userId, AiFeature.RECOMMEND, prompt, fallback);
        return new AiExplanation(enforceWordLimit(result.text(), 60), result.aiGenerated());
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public AiExplanation generate(long userId, AiFeature feature, String prompt, String fallback) {
        if (userId <= 0) {
            throw new IllegalArgumentException("An authenticated user ID is required");
        }
        Objects.requireNonNull(feature, "AI feature is required");
        Objects.requireNonNull(prompt, "AI prompt is required");
        AiConfigDto config = configService.get();
        String masked = masker.mask(prompt);
        if (!config.enabled()) {
            record(userId, feature, config, masked, DISABLED_MESSAGE, 0, 0, 0, AiLogStatus.BLOCKED);
            return new AiExplanation(DISABLED_MESSAGE, false);
        }
        if (!audit.reserve(
                userId,
                LocalDate.now(clock.withZone(ZoneOffset.UTC)),
                config.dailyLimitPerUser())) {
            record(
                    userId,
                    feature,
                    config,
                    masked,
                    "Đã đạt hạn mức AI trong ngày.",
                    0,
                    0,
                    0,
                    AiLogStatus.BLOCKED);
            throw new RateLimitException(
                    "Bạn đã đạt hạn mức AI trong ngày. Vui lòng thử lại ngày mai.");
        }

        long started = System.nanoTime();
        AiGenerationResult result = null;
        try {
            AiClient client = clients.get(config.provider());
            if (client == null) {
                throw new IllegalStateException("Configured AI provider is unavailable");
            }
            result = client.generate(masked, config);
            if (result == null || result.text() == null || result.text().isBlank()) {
                throw new IllegalStateException("AI provider returned empty content");
            }
        } catch (RuntimeException exception) {
            // Never copy exception messages: upstream failures may contain prompts or keys.
            log.warn(
                    "AI provider {} failed ({})",
                    config.provider(),
                    exception.getClass().getSimpleName());
            record(
                    userId,
                    feature,
                    config,
                    masked,
                    "Không thể nhận phản hồi từ dịch vụ AI.",
                    result == null ? null : result.tokensIn(),
                    result == null ? null : result.tokensOut(),
                    elapsed(started),
                    AiLogStatus.ERROR);
            return new AiExplanation(masker.mask(fallback), false);
        }
        String response = masker.mask(result.text().trim());
        // Persist outside the provider catch: an audit failure must not become a fake provider
        // error.
        record(
                userId,
                feature,
                config,
                masked,
                response,
                result.tokensIn(),
                result.tokensOut(),
                elapsed(started),
                AiLogStatus.OK);
        return new AiExplanation(response, config.provider() != AiProvider.MOCK);
    }

    private void record(
            long userId,
            AiFeature feature,
            AiConfigDto config,
            String prompt,
            String response,
            Integer input,
            Integer output,
            long latency,
            AiLogStatus status) {
        audit.record(
                new AiLogDto(
                        0,
                        userId,
                        feature,
                        config.provider(),
                        config.model(),
                        prompt,
                        response,
                        input,
                        output,
                        latency,
                        status,
                        OffsetDateTime.now(clock)));
    }

    private static long elapsed(long started) {
        return Math.max(0, (System.nanoTime() - started) / 1_000_000);
    }

    /**
     * Kept as a preflight validator for callers; generation always masks instead of rejecting PII.
     */
    public void validateNoPii(String prompt) {
        if (prompt != null && !prompt.equals(masker.mask(prompt))) {
            throw new IllegalArgumentException("Privacy violation: prompt contains personal data");
        }
    }

    public static String enforceWordLimit(String text, int maxWords) {
        if (text == null) {
            return "";
        }
        String[] words = text.trim().split("\\s+");
        if (words.length <= maxWords) {
            return text.trim();
        }
        String truncated = String.join(" ", Arrays.copyOfRange(words, 0, maxWords));
        return truncated.endsWith(".") ? truncated : truncated + "...";
    }

    public static int countWords(String text) {
        return text == null || text.isBlank() ? 0 : text.trim().split("\\s+").length;
    }

    public record AiExplanation(String text, boolean aiGenerated) {}
}
