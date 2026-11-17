package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.config.AiProperties;
import org.springframework.stereotype.Component;

@Component
public class MockAiClient implements AiClient {

    private final AiProperties aiProperties;

    public MockAiClient(AiProperties aiProperties) {
        this.aiProperties = aiProperties;
    }

    @Override
    public AiProvider getProvider() {
        return AiProvider.MOCK;
    }

    @Override
    public String generateExplanation(String prompt) {
        return aiProperties.getMock().getExplanation();
    }
}
