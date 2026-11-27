package com.rikkei.jobs.ai.dto;

import com.rikkei.jobs.ai.service.AiProvider;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateAiConfigRequest(
        @NotNull AiProvider provider,
        @NotBlank @Size(max = 120) @Pattern(regexp = "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._:-]*$")
                String model,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") BigDecimal temperature,
        @NotNull @Min(1) @Max(8192) Integer maxTokens,
        @NotNull @Min(0) @Max(100000) Integer dailyLimitPerUser,
        @NotNull Boolean enabled,
        @NotNull @Min(0) Long version) {}
