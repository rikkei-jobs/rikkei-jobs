package com.rikkei.jobs.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    private String provider = "mock";
    private int timeoutSeconds = 10;
    private MockConfig mock = new MockConfig();
    private OpenAiConfig openai = new OpenAiConfig();
    private GeminiConfig gemini = new GeminiConfig();
    private ClaudeConfig claude = new ClaudeConfig();

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public MockConfig getMock() {
        return mock;
    }

    public void setMock(MockConfig mock) {
        this.mock = mock;
    }

    public OpenAiConfig getOpenai() {
        return openai;
    }

    public void setOpenai(OpenAiConfig openai) {
        this.openai = openai;
    }

    public GeminiConfig getGemini() {
        return gemini;
    }

    public void setGemini(GeminiConfig gemini) {
        this.gemini = gemini;
    }

    public ClaudeConfig getClaude() {
        return claude;
    }

    public void setClaude(ClaudeConfig claude) {
        this.claude = claude;
    }

    public static class MockConfig {
        private String explanation =
                "Hồ sơ của bạn phù hợp với vị trí này nhờ năng lực tốt về các kỹ năng trọng tâm. Bạn cần trau dồi thêm về các công cụ liên quan để gia tăng lợi thế cạnh tranh.";

        public String getExplanation() {
            return explanation;
        }

        public void setExplanation(String explanation) {
            this.explanation = explanation;
        }
    }

    public static class OpenAiConfig {
        private String apiKey = "";
        private String model = "gpt-4o-mini";
        private String baseUrl = "https://api.openai.com/v1";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }
    }

    public static class GeminiConfig {
        private String apiKey = "";
        private String model = "gemini-1.5-flash";
        private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }
    }

    public static class ClaudeConfig {
        private String apiKey = "";
        private String model = "claude-3-5-sonnet-20241022";
        private String baseUrl = "https://api.anthropic.com/v1";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }
    }
}
