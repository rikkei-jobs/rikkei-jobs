package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.config.AiProperties;
import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.AiGenerationResult;
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
    public AiGenerationResult generate(String prompt, AiConfigDto config) {
        return new AiGenerationResult(aiProperties.getMock().getExplanation(), 0, 0);
    }
}
