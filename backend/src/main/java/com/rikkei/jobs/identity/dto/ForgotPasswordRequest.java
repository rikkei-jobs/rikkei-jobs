package com.rikkei.jobs.identity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Request DTO for initiating password reset workflow. */
@Schema(description = "Yêu cầu cấp lại mật khẩu qua email")
public record ForgotPasswordRequest(
        @NotBlank(message = "Email không được để trống")
                @Email(message = "Email không đúng định dạng")
                @Schema(
                        description = "Email đăng ký tài khoản cần khôi phục",
                        example = "hr1@rikkeijobs.test")
                String email) {

    @Override
    public String toString() {
        return "ForgotPasswordRequest[email=***]";
    }
}
