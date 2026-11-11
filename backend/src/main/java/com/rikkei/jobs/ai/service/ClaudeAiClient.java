package com.rikkei.jobs.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.ai.config.AiProperties;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class ClaudeAiClient implements AiClient {

    private static final Logger log = LoggerFactory.getLogger(ClaudeAiClient.class);

    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;

    public ClaudeAiClient(AiProperties aiProperties, ObjectMapper objectMapper) {
        this.aiProperties = aiProperties;
        this.objectMapper = objectMapper;
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

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        int timeoutMs = Math.max(1, aiProperties.getTimeoutSeconds()) * 1000;
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        RestClient restClient =
                RestClient.builder()
                        .baseUrl(aiProperties.getClaude().getBaseUrl())
                        .requestFactory(requestFactory)
                        .defaultHeader("x-api-key", apiKey)
                        .defaultHeader("anthropic-version", "2023-06-01")
                        .build();

        Map<String, Object> body =
                Map.of(
                        "model", aiProperties.getClaude().getModel(),
                        "max_tokens", 150,
                        "messages", List.of(Map.of("role", "user", "content", prompt)));

        String responseBody =
                restClient
                        .post()
                        .uri("/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            return root.path("content").get(0).path("text").asText().trim();
        } catch (Exception e) {
            log.error("Failed to parse Claude response: {}", e.getMessage());
            throw new RuntimeException("Failed to parse Claude response", e);
        }
    }
}
