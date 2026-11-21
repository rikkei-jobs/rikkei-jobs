package com.rikkei.jobs.ai.dto;

import java.util.List;

public record AiLogPage(List<AiLogDto> items, long total, int page, int size) {
    public AiLogPage {
        items = List.copyOf(items);
    }
}
