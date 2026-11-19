package com.rikkei.jobs.identity.dto;

import java.time.Instant;

public record AuthSessionResponse(
        String accessToken,
        String tokenType,
        Instant expiresAt,
        Long userId,
        String fullName,
        String role) {}
