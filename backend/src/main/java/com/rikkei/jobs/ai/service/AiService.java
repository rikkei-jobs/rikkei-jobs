package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.config.AiProperties;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Unified gateway service for all AI interactions in Rikkei Jobs. Manages provider dispatching, PII
 * inspection, timeouts (<=10s), and fallback recovery. Prepares the architectural foundation for
 * AI-05 (rate limiting, masking, audit logging).
 */
@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("(\\+?[0-9]{1,3}[- ]?)?0[0-9]{8,10}");

    private final AiProperties aiProperties;
    private final Map<AiProvider, AiClient> clients;

    public AiService(AiProperties aiProperties, List<AiClient> clientList) {
        this.aiProperties = aiProperties;
        this.clients =
                clientList.stream()
                        .collect(Collectors.toMap(AiClient::getProvider, Function.identity()));
    }

    /** Resolves the active AI provider from environment or configuration. */
    public AiProvider getActiveProvider() {
        return AiProvider.fromString(aiProperties.getProvider());
    }

    /**
     * Generates a concise job recommendation explanation (<= 60 words). Dispatches request to the
     * active AI client with strict 10s timeout and PII sanitization. If AI fails or exceeds 10s,
     * seamlessly returns the provided fallback explanation.
     */
    public String generateJobExplanation(String prompt, String fallbackExplanation) {
        AiProvider provider = getActiveProvider();
        AiClient client = clients.getOrDefault(provider, clients.get(AiProvider.MOCK));

        // 1. Sanitize & verify prompt contains zero Personally Identifiable Information (PII)
        validateNoPii(prompt);

        // 2. Safe logging (without leaking PII)
        log.info(
                "[AI_CALL_START] Provider: {}, Prompt Length: {}, Sanitized: [NO_PII_VERIFIED]",
                provider,
                prompt.length());
        log.debug("[AI_PROMPT_CONTENT] {}", prompt);

        // 3. Execute with timeout guarantee (<= 10 seconds)
        int timeoutSeconds = Math.max(1, aiProperties.getTimeoutSeconds());
        try {
            String result =
                    CompletableFuture.supplyAsync(() -> client.generateExplanation(prompt))
                            .get(timeoutSeconds, TimeUnit.SECONDS);

            if (result == null || result.trim().isEmpty()) {
                log.warn(
                        "[AI_CALL_EMPTY] Provider {} returned empty content, falling back to default",
                        provider);
                return fallbackExplanation;
            }

            // 4. Word count constraint (<= 60 words)
            String trimmed = enforceWordLimit(result.trim(), 60);
            log.info(
                    "[AI_CALL_SUCCESS] Provider: {}, Word count: {}",
                    provider,
                    countWords(trimmed));
            return trimmed;
        } catch (TimeoutException e) {
            log.warn(
                    "[AI_CALL_TIMEOUT] AI call to {} exceeded {}s timeout. Using fallback explanation.",
                    provider,
                    timeoutSeconds);
            return fallbackExplanation;
        } catch (Exception e) {
            log.warn(
                    "[AI_CALL_FAILED] AI call to {} failed: {}. Using fallback explanation.",
                    provider,
                    e.getMessage());
            return fallbackExplanation;
        }
    }

    /** Ensures prompt contains no email addresses or phone numbers. */
    public void validateNoPii(String prompt) {
        if (prompt == null) {
            return;
        }
        if (EMAIL_PATTERN.matcher(prompt).find()) {
            throw new IllegalArgumentException(
                    "Privacy violation: prompt must not contain email addresses");
        }
        if (PHONE_PATTERN.matcher(prompt).find()) {
            throw new IllegalArgumentException(
                    "Privacy violation: prompt must not contain phone numbers");
        }
    }

    /** Trims explanation text to at most maxWords words without cutting words mid-token. */
    public static String enforceWordLimit(String text, int maxWords) {
        if (text == null) {
            return "";
        }
        String[] words = text.trim().split("\\s+");
        if (words.length <= maxWords) {
            return text.trim();
        }
        String truncated = String.join(" ", Arrays.copyOfRange(words, 0, maxWords));
        if (!truncated.endsWith(".")) {
            truncated += "...";
        }
        return truncated;
    }

    public static int countWords(String text) {
        if (text == null || text.trim().isEmpty()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }
}
