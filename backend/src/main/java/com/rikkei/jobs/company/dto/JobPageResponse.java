package com.rikkei.jobs.company.dto;

import java.util.List;

public record JobPageResponse(
        List<JobDescriptionResponse> items, int page, int size, long totalItems, int totalPages) {}
