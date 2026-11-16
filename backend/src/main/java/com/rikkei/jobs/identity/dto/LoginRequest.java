package com.rikkei.jobs.identity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request DTO for enterprise user authentication via email and password. */
@Schema(description = "Yêu cầu đăng nhập tài khoản doanh nghiệp")
public record LoginRequest(
        @NotBlank(message = "Email không được để trống")
                @Email(message = "Email không đúng định dạng")
                @Schema(description = "Email đăng nhập", example = "hr1@rikkeijobs.test")
                String email,
        @NotBlank(message = "Mật khẩu không được để trống")
                @Size(max = 128, message = "Mật khẩu không được vượt quá 128 ký tự")
                @Schema(description = "Mật khẩu tài khoản", example = "SecretPass123")
                String password) {

    @Override
    public String toString() {
        return "LoginRequest[email=***, password=***]";
    }
}
