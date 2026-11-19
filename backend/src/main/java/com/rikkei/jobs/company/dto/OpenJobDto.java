package com.rikkei.jobs.company.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

/** Public view of an open job description used by other modules (Rule 14 contract). */
@Schema(description = "JD đang tuyển dụng kèm yêu cầu kỹ năng")
public record OpenJobDto(
        @Schema(description = "ID JD", example = "1") Long id,
        @Schema(description = "Tiêu đề", example = "Kỹ sư Lập trình Java Backend") String title,
        @Schema(description = "Doanh nghiệp", example = "Rikkeisoft") String companyName,
        @Schema(description = "Địa điểm", example = "Hà Nội") String location,
        @Schema(description = "Khoảng lương", example = "15 - 25 triệu") String salaryRange,
        @Schema(description = "Hạn ứng tuyển") OffsetDateTime deadline,
        @Schema(description = "Danh sách kỹ năng yêu cầu")
                List<JobSkillRequirementDto> requiredSkills) {}
