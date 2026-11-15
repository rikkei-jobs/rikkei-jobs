package com.rikkei.jobs.candidate.dto;

import com.rikkei.jobs.candidate.model.GapPriority;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

/** One missing skill of a gap analysis. Satisfied skills are never returned. */
@Schema(description = "Một kỹ năng còn thiếu so với mục tiêu")
public record GapItemDto(
        @Schema(description = "ID kỹ năng", example = "9") Integer skillId,
        @Schema(description = "Mã kỹ năng", example = "DOCKER") String skillCode,
        @Schema(description = "Tên kỹ năng", example = "Đóng gói ứng dụng Docker") String skillName,
        @Schema(description = "Điểm yêu cầu", example = "60") BigDecimal required,
        @Schema(description = "Điểm đã xác thực hiện tại", example = "0") BigDecimal current,
        @Schema(description = "Khoảng thiếu = required - current", example = "60") BigDecimal gap,
        @Schema(description = "Mức ưu tiên", example = "HIGH") GapPriority priority) {}
