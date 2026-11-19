package com.rikkei.jobs.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.ai.config.AiProperties;
import com.rikkei.jobs.common.client.ExternalApiClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ClaudeAiClient implements AiClient {

    private static final Logger log = LoggerFactory.getLogger(ClaudeAiClient.class);

    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;
    private final ExternalApiClient externalApiClient;

    public ClaudeAiClient(
            AiProperties aiProperties,
            ObjectMapper objectMapper,
            ExternalApiClient externalApiClient) {
        this.aiProperties = aiProperties;
        this.objectMapper = objectMapper;
        this.externalApiClient = externalApiClient;
    }

    @Override
    public AiProvider getProvider() {
        return AiProvider.CLAUDE;
    }

    @Override
    public String generateExplanation(String prompt) {
        String apiKey = aiProperties.getClaude().getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("Claude API key is not configured");
        }

        String url = aiProperties.getClaude().getBaseUrl().replaceAll("/+$", "") + "/messages";

        Map<String, Object> body =
                Map.of(
                        "model", aiProperties.getClaude().getModel(),
                        "max_tokens", 150,
                        "messages", List.of(Map.of("role", "user", "content", prompt)));

        String responseBody =
                externalApiClient.postJson(
                        url,
                        body,
                        Map.of("x-api-key", apiKey, "anthropic-version", "2023-06-01"),
                        Duration.ofSeconds(Math.max(1, aiProperties.getTimeoutSeconds())));

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            return root.path("content").get(0).path("text").asText().trim();
        } catch (Exception e) {
            log.error("Failed to parse Claude response: {}", e.getClass().getSimpleName());
            throw new RuntimeException("Failed to parse Claude response", e);
        }
    }
}
