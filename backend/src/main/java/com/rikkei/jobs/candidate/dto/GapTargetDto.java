package com.rikkei.jobs.candidate.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Effective target of a gap analysis: a target position or one job description. */
@Schema(description = "Mục tiêu hiệu lực của phân tích khoảng thiếu hụt")
public record GapTargetDto(
        @Schema(
                        description = "Loại mục tiêu",
                        example = "POSITION",
                        allowableValues = {"POSITION", "JOB"})
                String type,
        @Schema(description = "ID mục tiêu", example = "1") Long id,
        @Schema(description = "Mã vị trí (null với JD)", example = "JAVA_BACKEND_FRESHER")
                String code,
        @Schema(description = "Tên vị trí hoặc tiêu đề JD", example = "Java Backend Fresher")
                String name,
        @Schema(description = "Mô tả vị trí hoặc JD") String description) {}
