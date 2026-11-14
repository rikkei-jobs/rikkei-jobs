package com.rikkei.jobs.identity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request DTO for resetting password using reset token. */
@Schema(description = "Yêu cầu đặt lại mật khẩu bằng mã token")
public record ResetPasswordRequest(
        @NotBlank(message = "Mã token không được để trống")
                @Schema(
                        description = "Mã token đặt lại mật khẩu nhận qua email",
                        example = "raw-reset-token-sample")
                String token,
        @NotBlank(message = "Mật khẩu mới không được để trống")
                @Size(max = 128, message = "Mật khẩu không được vượt quá 128 ký tự")
                @Schema(description = "Mật khẩu mới", example = "SecurePass#2026")
                String newPassword) {

    @Override
    public String toString() {
        return "ResetPasswordRequest[token=***, newPassword=***]";
    }
}
