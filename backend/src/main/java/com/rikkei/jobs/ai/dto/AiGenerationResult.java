package com.rikkei.jobs.ai.dto;

/** Provider-reported counts remain null when the provider did not return usage metadata. */
public record AiGenerationResult(String text, Integer tokensIn, Integer tokensOut) {}
