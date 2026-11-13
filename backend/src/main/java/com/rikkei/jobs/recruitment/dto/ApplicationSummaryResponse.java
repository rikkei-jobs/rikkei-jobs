package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** Summary representation of an application for candidate list view. */
@Schema(description = "Thông tin tóm tắt đơn ứng tuyển")
public record ApplicationSummaryResponse(
        @Schema(description = "ID đơn ứng tuyển", example = "1") Long id,
        @Schema(description = "ID vị trí tuyển dụng", example = "101") Long jobId,
        @Schema(description = "Tiêu đề công việc", example = "Backend Java Developer (Spring Boot)")
                String jobTitle,
        @Schema(description = "Tên công ty tuyển dụng", example = "Rikkei Digital")
                String companyName,
        @Schema(description = "Trạng thái ứng tuyển hiện tại", example = "SUBMITTED")
                ApplicationStatus status,
        @Schema(description = "Có được phép rút đơn hay không", example = "true")
                boolean canWithdraw,
        @Schema(description = "Thời điểm nộp đơn") OffsetDateTime createdAt,
        @Schema(description = "Thời điểm cập nhật mới nhất") OffsetDateTime updatedAt) {}
