package com.rikkei.jobs.ai.service;

public enum AiProvider {
    OPENAI,
    GEMINI,
    CLAUDE,
    MOCK;

    public static AiProvider fromString(String providerStr) {
        if (providerStr == null || providerStr.trim().isEmpty()) {
            return MOCK;
        }
        try {
            return AiProvider.valueOf(providerStr.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return MOCK;
        }
    }
}
