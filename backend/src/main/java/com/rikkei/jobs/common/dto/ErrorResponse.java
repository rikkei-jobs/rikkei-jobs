package com.rikkei.jobs.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Unified API Error Response shape. Format strictly conforms to: {"code":"...", "message":"..."}
 */
@Schema(description = "Chuẩn phản hồi lỗi của hệ thống Rikkei Jobs")
public record ErrorResponse(
        @Schema(description = "Mã lỗi định danh duy nhất", example = "VALIDATION_ERROR")
                String code,
        @Schema(
                        description = "Thông điệp mô tả chi tiết lỗi",
                        example = "Dữ liệu yêu cầu không hợp lệ")
                String message) {}
