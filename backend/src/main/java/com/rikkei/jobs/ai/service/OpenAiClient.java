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
    public AiGenerationResult generate(String prompt, AiConfigDto config) {
        String apiKey = aiProperties.getOpenai().getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("OpenAI API key is not configured");
        }

        String url =
                aiProperties.getOpenai().getBaseUrl().replaceAll("/+$", "") + "/chat/completions";

        Map<String, Object> body =
                Map.of(
                        "model", config.model(),
                        "messages",
                                List.of(
                                        Map.of(
                                                "role",
                                                "system",
                                                "content",
                                                "Bạn là trợ lý nghề nghiệp. Trả lời bằng tiếng Việt và tuân theo yêu cầu trong prompt."),
                                        Map.of("role", "user", "content", prompt)),
                        "max_tokens", config.maxTokens(),
                        "temperature", config.temperature());

        String responseBody =
                externalApiClient.postJson(
                        url,
                        body,
                        Map.of("Authorization", "Bearer " + apiKey),
                        Duration.ofSeconds(Math.max(1, aiProperties.getTimeoutSeconds())));

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            return new AiGenerationResult(
                    root.path("choices").path(0).path("message").path("content").asText().trim(),
                    tokenCount(root.path("usage").path("prompt_tokens")),
                    tokenCount(root.path("usage").path("completion_tokens")));
        } catch (Exception e) {
            log.error("Failed to parse OpenAI response: {}", e.getClass().getSimpleName());
            throw new RuntimeException("Failed to parse OpenAI response", e);
        }
    }

    private static Integer tokenCount(JsonNode node) {
        return node.canConvertToInt() && node.asInt() >= 0 ? node.asInt() : null;
    }
}
