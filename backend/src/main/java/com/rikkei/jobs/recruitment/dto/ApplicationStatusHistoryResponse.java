package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** Audit log entry response for application status transition. */
@Schema(description = "Mốc lịch sử thay đổi trạng thái đơn ứng tuyển")
public record ApplicationStatusHistoryResponse(
        @Schema(description = "ID mốc lịch sử", example = "1") Long id,
        @Schema(description = "Trạng thái trước", example = "SUBMITTED")
                ApplicationStatus fromStatus,
        @Schema(description = "Trạng thái sau", example = "SCREENING") ApplicationStatus toStatus,
        @Schema(description = "ID người thực hiện chuyển bước", example = "2") Long actorId,
        @Schema(description = "Ghi chú hoặc lý do thay đổi", example = "HR bắt đầu xem xét hồ sơ")
                String note,
        @Schema(description = "Thời điểm thay đổi") OffsetDateTime createdAt) {}
