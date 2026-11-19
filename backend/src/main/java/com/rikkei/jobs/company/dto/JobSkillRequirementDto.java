package com.rikkei.jobs.company.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** One skill requirement of a published job description. */
@Schema(description = "Kỹ năng yêu cầu của một JD")
public record JobSkillRequirementDto(
        @Schema(description = "Mã kỹ năng", example = "JAVA") String skillCode,
        @Schema(description = "Tên kỹ năng", example = "Lập trình Java") String skillName,
        @Schema(description = "Điểm tối thiểu", example = "75") Integer requiredLevel,
        @Schema(description = "Bắt buộc hay không", example = "true") Boolean mandatory) {}
