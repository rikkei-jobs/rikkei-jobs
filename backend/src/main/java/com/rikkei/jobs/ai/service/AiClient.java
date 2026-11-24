package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.AiGenerationResult;

/** Provider adapter; application features must use AiService rather than calling adapters. */
public interface AiClient {
    AiProvider getProvider();

    AiGenerationResult generate(String maskedPrompt, AiConfigDto config);
}
