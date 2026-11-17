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
public class OpenAiClient implements AiClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiClient.class);

    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;
    private final ExternalApiClient externalApiClient;

    public OpenAiClient(
            AiProperties aiProperties,
            ObjectMapper objectMapper,
            ExternalApiClient externalApiClient) {
        this.aiProperties = aiProperties;
        this.objectMapper = objectMapper;
        this.externalApiClient = externalApiClient;
    }

    @Override
    public AiProvider getProvider() {
        return AiProvider.OPENAI;
    }

    @Override
    public String generateExplanation(String prompt) {
        String apiKey = aiProperties.getOpenai().getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("OpenAI API key is not configured");
        }

        String url =
                aiProperties.getOpenai().getBaseUrl().replaceAll("/+$", "") + "/chat/completions";

        Map<String, Object> body =
                Map.of(
                        "model", aiProperties.getOpenai().getModel(),
                        "messages",
                                List.of(
                                        Map.of(
                                                "role",
                                                "system",
                                                "content",
                                                "Bạn là chuyên gia tư vấn tuyển dụng. Viết nhận xét ngắn gọn, súc tích (dưới 60 từ) bằng tiếng Việt."),
                                        Map.of("role", "user", "content", prompt)),
                        "max_tokens", 150);

        String responseBody =
                externalApiClient.postJson(
                        url,
                        body,
                        Map.of("Authorization", "Bearer " + apiKey),
                        Duration.ofSeconds(Math.max(1, aiProperties.getTimeoutSeconds())));

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            return root.path("choices").get(0).path("message").path("content").asText().trim();
        } catch (Exception e) {
            log.error("Failed to parse OpenAI response: {}", e.getClass().getSimpleName());
            throw new RuntimeException("Failed to parse OpenAI response", e);
        }
    }
}
