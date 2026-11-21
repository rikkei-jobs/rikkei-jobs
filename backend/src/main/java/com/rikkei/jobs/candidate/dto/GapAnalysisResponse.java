package com.rikkei.jobs.candidate.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Result of comparing verified skills against a target position or job description. */
@Schema(description = "Kết quả phân tích khoảng thiếu hụt năng lực")
public record GapAnalysisResponse(
        @Schema(description = "Mục tiêu đã phân tích") GapTargetDto target,
        @Schema(description = "Tỷ lệ kỹ năng đạt yêu cầu (0-100)", example = "71")
                Integer readiness,
        @Schema(description = "Danh sách kỹ năng còn thiếu, sắp theo gap giảm dần")
                List<GapItemDto> items) {}
