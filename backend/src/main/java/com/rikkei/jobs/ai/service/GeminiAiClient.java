package com.rikkei.jobs.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.ai.config.AiProperties;
import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.AiGenerationResult;
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
    public AiGenerationResult generate(String prompt, AiConfigDto config) {
        String apiKey = aiProperties.getGemini().getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured");
        }

        String url =
                aiProperties.getGemini().getBaseUrl().replaceAll("/+$", "")
                        + "/models/"
                        + config.model()
                        + ":generateContent";

        Map<String, Object> body =
                Map.of(
                        "contents",
                        List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                        "generationConfig",
                        Map.of(
                                "temperature",
                                config.temperature(),
                                "maxOutputTokens",
                                config.maxTokens()));

        String responseBody =
                externalApiClient.postJson(
                        url,
                        body,
                        Map.of("x-goog-api-key", apiKey),
                        Duration.ofSeconds(Math.max(1, aiProperties.getTimeoutSeconds())));

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            StringBuilder text = new StringBuilder();
            for (JsonNode part : root.path("candidates").path(0).path("content").path("parts")) {
                if (!part.path("thought").asBoolean(false)) {
                    text.append(part.path("text").asText(""));
                }
            }
            return new AiGenerationResult(
                    text.toString().trim(),
                    tokenCount(root.path("usageMetadata").path("promptTokenCount")),
                    tokenCount(root.path("usageMetadata").path("candidatesTokenCount")));
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getClass().getSimpleName());
            throw new RuntimeException("Failed to parse Gemini response", e);
        }
    }

    private static Integer tokenCount(JsonNode node) {
        return node.canConvertToInt() && node.asInt() >= 0 ? node.asInt() : null;
    }
}
