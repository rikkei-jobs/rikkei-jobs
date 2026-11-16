package com.rikkei.jobs.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;

    public LoginRequest() {}

    public LoginRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
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
