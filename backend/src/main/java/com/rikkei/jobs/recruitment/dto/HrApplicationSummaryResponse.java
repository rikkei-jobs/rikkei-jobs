package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** Summary representation of an application for HR read-only applicant listing. */
@Schema(description = "Thông tin tóm tắt hồ sơ ứng tuyển dành cho HR")
public record HrApplicationSummaryResponse(
        @Schema(description = "ID đơn ứng tuyển", example = "1") Long id,
        @Schema(description = "ID ứng viên nộp đơn", example = "1") Long candidateUserId,
        @Schema(
                        description = "URL bản PDF đóng băng tại thời điểm nộp",
                        example = "/api/v1/me/applications/1/cv-snapshot")
                String cvSnapshotUrl,
        @Schema(description = "Thư giới thiệu ứng viên") String coverLetter,
        @Schema(description = "Trạng thái ứng tuyển hiện tại", example = "SUBMITTED")
                ApplicationStatus status,
        @Schema(description = "Thời điểm nộp đơn") OffsetDateTime createdAt,
        @Schema(description = "Thời điểm cập nhật mới nhất") OffsetDateTime updatedAt) {}
