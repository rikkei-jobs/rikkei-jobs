package com.rikkei.jobs.candidate.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Verified competency score of one candidate skill, exposed across module boundaries. */
@Schema(description = "Điểm năng lực đã xác thực của ứng viên cho một kỹ năng")
public record CandidateSkillScoreDto(
        @Schema(description = "Mã kỹ năng", example = "JAVA") String skillCode,
        @Schema(description = "Điểm đã xác thực (0-100)", example = "79") Integer score) {}
