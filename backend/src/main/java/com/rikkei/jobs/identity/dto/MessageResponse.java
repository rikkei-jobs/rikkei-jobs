package com.rikkei.jobs.identity.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Generic message response DTO. */
@Schema(description = "Phản hồi thông báo chung")
public record MessageResponse(
        @Schema(description = "Thông điệp thông báo", example = "Đổi mật khẩu thành công")
                String message) {}
