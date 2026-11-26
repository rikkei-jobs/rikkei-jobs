package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.InterviewResult;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** DTO representing an interview round response (UT-02). */
@Schema(description = "Thông tin chi tiết một vòng phỏng vấn (UT-02)")
public record InterviewRoundResponse(
        @Schema(description = "ID vòng phỏng vấn", example = "1") Long id,
        @Schema(description = "ID đơn ứng tuyển", example = "10") Long applicationId,
        @Schema(description = "Số thứ tự vòng phỏng vấn", example = "1") Integer roundNo,
        @Schema(description = "Tên vòng phỏng vấn", example = "Phỏng vấn kỹ thuật") String name,
        @Schema(description = "Email người phỏng vấn", example = "techlead@company.com")
                String interviewerEmail,
        @Schema(description = "Thời gian lên lịch") OffsetDateTime scheduledAt,
        @Schema(description = "Kết quả đánh giá", example = "PASS") InterviewResult result,
        @Schema(description = "Điểm đánh giá", example = "85.0") BigDecimal score,
        @Schema(description = "Ghi chú / nhận xét") String note,
        @Schema(description = "Phiên bản optimistic locking", example = "0") Long version,
        @Schema(description = "Thời điểm tạo") OffsetDateTime createdAt,
        @Schema(description = "Thời điểm cập nhật mới nhất") OffsetDateTime updatedAt) {}
