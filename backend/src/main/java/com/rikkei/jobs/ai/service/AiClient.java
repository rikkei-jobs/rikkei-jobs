package com.rikkei.jobs.ai.service;

public interface AiClient {

    AiProvider getProvider();

    String generateExplanation(String prompt);
}
