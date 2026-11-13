package com.rikkei.jobs.candidate.dto;

import java.time.OffsetDateTime;

public record CandidateCvSummaryResponse(
        Long id, String title, String originalFilename, long fileSize, OffsetDateTime updatedAt) {}
