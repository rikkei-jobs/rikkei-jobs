package com.rikkei.jobs.candidate.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Selectable target position shown to the candidate. */
@Schema(description = "Vị trí mục tiêu dùng để phân tích khoảng thiếu hụt năng lực")
public record TargetPositionDto(
        @Schema(description = "Mã vị trí", example = "1") Long id,
        @Schema(description = "Mã nghiệp vụ", example = "JAVA_BACKEND_FRESHER") String code,
        @Schema(description = "Tên vị trí", example = "Java Backend Fresher") String name,
        @Schema(description = "Mô tả vị trí") String description) {}
