package com.rikkei.jobs.identity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request DTO for changing password. */
@Schema(description = "Yêu cầu đổi mật khẩu")
public record ChangePasswordRequest(
        @NotBlank(message = "Mật khẩu hiện tại không được để trống")
                @Size(max = 128, message = "Mật khẩu không được vượt quá 128 ký tự")
                @Schema(description = "Mật khẩu cũ", example = "OldPass123")
                String oldPassword,
        @NotBlank(message = "Mật khẩu mới không được để trống")
                @Size(max = 128, message = "Mật khẩu không được vượt quá 128 ký tự")
                @Schema(description = "Mật khẩu mới", example = "NewPass123")
                String newPassword) {

    @Override
    public String toString() {
        return "ChangePasswordRequest[oldPassword=***, newPassword=***]";
    }
}
