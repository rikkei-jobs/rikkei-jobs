package com.rikkei.jobs.ai.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public record AiLogPage(
        List<AiLogDto> items,
        @Schema(description = "Total matching records, capped at 10,000 when totalCapped is true")
                long total,
        int page,
        int size,
        @Schema(description = "True when matching records exceed 10,000 and total is capped")
                boolean totalCapped) {
    public AiLogPage {
        items = List.copyOf(items);
    }
}
