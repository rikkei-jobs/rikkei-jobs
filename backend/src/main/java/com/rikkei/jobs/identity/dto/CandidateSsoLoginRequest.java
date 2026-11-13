package com.rikkei.jobs.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CandidateSsoLoginRequest(@NotBlank @Size(max = 512) String ticket) {}
