package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** Summary DTO of an application for platform staff monitoring and oversight (UT-02). */
@Schema(description = "Thông tin tóm tắt đơn ứng tuyển cho cán bộ theo dõi (UT-02)")
public record StaffApplicationSummaryResponse(
        @Schema(description = "ID đơn ứng tuyển", example = "1") Long id,
        @Schema(description = "ID vị trí tuyển dụng", example = "101") Long jobId,
        @Schema(description = "Tiêu đề vị trí tuyển dụng", example = "Backend Java Developer")
                String jobTitle,
        @Schema(description = "ID công ty tuyển dụng", example = "1") Long companyId,
        @Schema(description = "Tên công ty tuyển dụng", example = "Rikkei Digital")
                String companyName,
        @Schema(description = "ID ứng viên", example = "1") Long candidateUserId,
        @Schema(description = "Họ tên ứng viên", example = "Nguyễn Văn An") String candidateName,
        @Schema(description = "Email ứng viên", example = "candidate1@rikkeijobs.test")
                String candidateEmail,
        @Schema(description = "Trạng thái ứng tuyển hiện tại", example = "INTERVIEW")
                ApplicationStatus status,
        @Schema(description = "Số vòng phỏng vấn đã thiết lập", example = "2") Integer roundCount,
        @Schema(description = "Điểm matching (%)", example = "85") Integer matchScore,
        @Schema(description = "Thời điểm nộp đơn") OffsetDateTime createdAt,
        @Schema(description = "Thời điểm cập nhật mới nhất") OffsetDateTime updatedAt) {}
