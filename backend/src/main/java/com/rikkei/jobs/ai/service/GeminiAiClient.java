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
public class GeminiAiClient implements AiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiAiClient.class);

    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;
    private final ExternalApiClient externalApiClient;

    public GeminiAiClient(
            AiProperties aiProperties,
            ObjectMapper objectMapper,
            ExternalApiClient externalApiClient) {
        this.aiProperties = aiProperties;
        this.objectMapper = objectMapper;
        this.externalApiClient = externalApiClient;
    }

    @Override
    public AiProvider getProvider() {
        return AiProvider.GEMINI;
    }

    @Override
    public String generateExplanation(String prompt) {
        String apiKey = aiProperties.getGemini().getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured");
        }

        String url =
                aiProperties.getGemini().getBaseUrl().replaceAll("/+$", "")
                        + "/models/"
                        + aiProperties.getGemini().getModel()
                        + ":generateContent";

        Map<String, Object> body =
                Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

        String responseBody =
                externalApiClient.postJson(
                        url,
                        body,
                        Map.of("x-goog-api-key", apiKey),
                        Duration.ofSeconds(Math.max(1, aiProperties.getTimeoutSeconds())));

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidate = root.path("candidates").get(0);
            return candidate.path("content").path("parts").get(0).path("text").asText().trim();
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getClass().getSimpleName());
            throw new RuntimeException("Failed to parse Gemini response", e);
        }
    }
}
