package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Detailed representation of an application including snapshot CV URL and full transition history.
 */
@Schema(description = "Chi tiết đơn ứng tuyển kèm lịch sử xử lý")
public record ApplicationDetailResponse(
        @Schema(description = "ID đơn ứng tuyển", example = "1") Long id,
        @Schema(description = "ID vị trí tuyển dụng", example = "101") Long jobId,
        @Schema(description = "Tiêu đề công việc", example = "Backend Java Developer")
                String jobTitle,
        @Schema(description = "Tên công ty tuyển dụng", example = "Rikkei Digital")
                String companyName,
        @Schema(description = "ID CV ứng viên đã chọn nộp", example = "1") Long cvId,
        @Schema(
                        description = "URL bản PDF đóng băng tại thời điểm nộp",
                        example = "/snapshots/cv_1_snapshot_1700000000.pdf")
                String cvSnapshotUrl,
        @Schema(description = "Thư giới thiệu") String coverLetter,
        @Schema(description = "Trạng thái ứng tuyển hiện tại", example = "SUBMITTED")
                ApplicationStatus status,
        @Schema(description = "Có được phép rút đơn hay không", example = "true")
                boolean canWithdraw,
        @Schema(description = "Thời điểm nộp đơn") OffsetDateTime createdAt,
        @Schema(description = "Thời điểm cập nhật mới nhất") OffsetDateTime updatedAt,
        @Schema(description = "Danh sách mốc lịch sử thay đổi trạng thái")
                List<ApplicationStatusHistoryResponse> histories) {}
