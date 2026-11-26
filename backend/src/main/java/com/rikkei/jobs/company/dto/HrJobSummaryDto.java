package com.rikkei.jobs.company.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/**
 * Minimal job summary DTO for HR company-scoped job listing (Option 1A for UT-02).
 *
 * <p>Note: DN-04 will extend {@code GET /api/v1/hr/jobs} with full JD management fields in a future
 * round.
 */
@Schema(
        description =
                "Thông tin tóm tắt JD thuộc doanh nghiệp của HR (Option 1A cho UT-02; DN-04 sẽ mở rộng sau)")
public record HrJobSummaryDto(
        @Schema(description = "ID JD", example = "2") Long id,
        @Schema(description = "Tiêu đề JD", example = "Fresher Java Developer") String title,
        @Schema(description = "ID doanh nghiệp", example = "2") Long companyId,
        @Schema(description = "Tên doanh nghiệp", example = "FPT Software") String companyName,
        @Schema(
                        description =
                                "Trạng thái hiệu lực JD (EXPIRED khi JD APPROVED đã quá hoặc đúng thời điểm hết hạn theo Clock hệ thống)",
                        example = "APPROVED")
                String status,
        @Schema(description = "JD đã hết hạn nộp hồ sơ hay chưa", example = "false")
                boolean expired,
        @Schema(description = "Hạn nộp hồ sơ") OffsetDateTime deadline,
        @Schema(description = "Thời điểm tạo") OffsetDateTime createdAt,
        @Schema(description = "Thời điểm cập nhật") OffsetDateTime updatedAt) {}
