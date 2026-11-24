package com.rikkei.jobs.ai;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.ai.config.AiProperties;
import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.AiGenerationResult;
import com.rikkei.jobs.ai.service.*;
import com.rikkei.jobs.common.client.ExternalApiClient;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;

class AiClientTest {
    @ParameterizedTest
    @EnumSource(
            value = AiProvider.class,
            names = {"OPENAI", "GEMINI", "CLAUDE"})
    void adaptersSendLiveSettingsAndReadActualTokenCounts(AiProvider provider) throws Exception {
        AiProperties properties = new AiProperties();
        properties.getOpenai().setApiKey("synthetic-test-key");
        properties.getGemini().setApiKey("synthetic-test-key");
        properties.getClaude().setApiKey("synthetic-test-key");
        ExternalApiClient http = mock(ExternalApiClient.class);
        ObjectMapper mapper = new ObjectMapper();
        String response =
                switch (provider) {
                    case OPENAI ->
                            "{\"choices\":[{\"message\":{\"content\":\"Hello\"}}],\"usage\":{\"prompt_tokens\":12,\"completion_tokens\":7}}";
                    case GEMINI ->
                            "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"hidden\",\"thought\":true},{\"text\":\"Hello\"}]}}],\"usageMetadata\":{\"promptTokenCount\":12,\"candidatesTokenCount\":7}}";
                    case CLAUDE ->
                            "{\"content\":[{\"type\":\"thinking\",\"thinking\":\"hidden\"},{\"type\":\"text\",\"text\":\"Hello\"}],\"usage\":{\"input_tokens\":12,\"output_tokens\":7}}";
                    case MOCK -> throw new IllegalStateException("Not a remote adapter");
                };
        when(http.postJson(anyString(), any(), anyMap(), any())).thenReturn(response);
        AiClient client =
                switch (provider) {
                    case OPENAI -> new OpenAiClient(properties, mapper, http);
                    case GEMINI -> new GeminiAiClient(properties, mapper, http);
                    case CLAUDE -> new ClaudeAiClient(properties, mapper, http);
                    case MOCK -> throw new IllegalStateException("Not a remote adapter");
                };
        AiConfigDto settings =
                new AiConfigDto(
                        1,
                        provider,
                        "custom-model",
                        new BigDecimal("0.42"),
                        321,
                        2,
                        true,
                        null,
                        OffsetDateTime.parse("2026-11-22T00:00:00Z"),
                        0);
        AiGenerationResult result = client.generate("[EMAIL]", settings);
        assertEquals("Hello", result.text());
        assertEquals(12, result.tokensIn());
        assertEquals(7, result.tokensOut());
        ArgumentCaptor<Object> body = ArgumentCaptor.forClass(Object.class);
        ArgumentCaptor<String> url = ArgumentCaptor.forClass(String.class);
        verify(http).postJson(url.capture(), body.capture(), anyMap(), any());
        JsonNode json = mapper.valueToTree(body.getValue());
        if (provider == AiProvider.GEMINI) {
            assertTrue(url.getValue().contains("/models/custom-model:generateContent"));
            assertEquals(321, json.path("generationConfig").path("maxOutputTokens").asInt());
            assertEquals(0.42, json.path("generationConfig").path("temperature").asDouble());
        } else {
            assertEquals("custom-model", json.path("model").asText());
            assertEquals(321, json.path("max_tokens").asInt());
            assertEquals(0.42, json.path("temperature").asDouble());
        }
        assertTrue(json.toString().contains("[EMAIL]"));
        assertFalse(json.toString().contains("synthetic-test-key"));
    }

    @ParameterizedTest
    @EnumSource(
            value = AiProvider.class,
            names = {"OPENAI", "GEMINI", "CLAUDE"})
    void missingUsageIsUnknownRatherThanInvented(AiProvider provider) {
        AiProperties properties = new AiProperties();
        properties.getOpenai().setApiKey("synthetic-test-key");
        properties.getGemini().setApiKey("synthetic-test-key");
        properties.getClaude().setApiKey("synthetic-test-key");
        ExternalApiClient http = mock(ExternalApiClient.class);
        when(http.postJson(anyString(), any(), anyMap(), any())).thenReturn("{}");
        ObjectMapper mapper = new ObjectMapper();
        AiClient client =
                switch (provider) {
                    case OPENAI -> new OpenAiClient(properties, mapper, http);
                    case GEMINI -> new GeminiAiClient(properties, mapper, http);
                    case CLAUDE -> new ClaudeAiClient(properties, mapper, http);
                    case MOCK -> throw new IllegalStateException("Not a remote adapter");
                };
        AiGenerationResult result =
                client.generate(
                        "safe",
                        new AiConfigDto(
                                1,
                                provider,
                                "model",
                                new BigDecimal("0.30"),
                                150,
                                2,
                                true,
                                null,
                                null,
                                0));
        assertNull(result.tokensIn());
        assertNull(result.tokensOut());
    }
}
