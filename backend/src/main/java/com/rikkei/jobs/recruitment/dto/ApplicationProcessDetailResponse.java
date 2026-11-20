package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

/**
 * Detailed representation of an application process including candidate info, CV snapshot, matching
 * score, interview rounds, and audit timeline (UT-02).
 */
@Schema(description = "Chi tiết toàn diện tiến trình xử lý đơn ứng tuyển (UT-02)")
public record ApplicationProcessDetailResponse(
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
        @Schema(description = "ID bản ghi CV", example = "1") Long cvId,
        @Schema(description = "URL bản PDF CV đóng băng tại thời điểm nộp") String cvSnapshotUrl,
        @Schema(description = "Thư giới thiệu") String coverLetter,
        @Schema(description = "Trạng thái ứng tuyển hiện tại", example = "INTERVIEW")
                ApplicationStatus status,
        @Schema(description = "Điểm matching hồ sơ (%)", example = "88") Integer matchScore,
        @Schema(description = "Ứng viên có được rút đơn hay không", example = "false")
                boolean canWithdraw,
        @Schema(
                        description =
                                "Đã đủ điều kiện gửi Offer qua UT-07 hay chưa (Mọi vòng có kết quả và vòng cuối PASS)",
                        example = "true")
                boolean canSendOffer,
        @Schema(description = "Tập trạng thái tiếp theo hợp lệ theo ma trận chuyển bước")
                Set<ApplicationStatus> allowedTransitions,
        @Schema(description = "Danh sách các vòng phỏng vấn theo thứ tự")
                List<InterviewRoundResponse> rounds,
        @Schema(description = "Dòng thời gian các lần chuyển bước và ghi chú")
                List<ApplicationStatusHistoryResponse> histories,
        @Schema(description = "Thời điểm nộp đơn") OffsetDateTime createdAt,
        @Schema(description = "Thời điểm cập nhật mới nhất") OffsetDateTime updatedAt) {}
