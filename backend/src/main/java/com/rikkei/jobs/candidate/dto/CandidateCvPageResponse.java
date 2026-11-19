package com.rikkei.jobs.candidate.dto;

import java.util.List;

public record CandidateCvPageResponse(
        List<CandidateCvSummaryResponse> items,
        int page,
        int size,
        long totalItems,
        int totalPages) {}
