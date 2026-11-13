package com.rikkei.jobs.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.ai.config.AiProperties;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class OpenAiClient implements AiClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiClient.class);

    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;

    public OpenAiClient(AiProperties aiProperties, ObjectMapper objectMapper) {
        this.aiProperties = aiProperties;
        this.objectMapper = objectMapper;
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

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        int timeoutMs = Math.max(1, aiProperties.getTimeoutSeconds()) * 1000;
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        RestClient restClient =
                RestClient.builder()
                        .baseUrl(aiProperties.getOpenai().getBaseUrl())
                        .requestFactory(requestFactory)
                        .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                        .build();

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
                restClient
                        .post()
                        .uri("/chat/completions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            return root.path("choices").get(0).path("message").path("content").asText().trim();
        } catch (Exception e) {
            log.error("Failed to parse OpenAI response: {}", e.getMessage());
            throw new RuntimeException("Failed to parse OpenAI response", e);
        }
    }
}
