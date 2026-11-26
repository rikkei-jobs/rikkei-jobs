package com.rikkei.jobs.identity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request DTO for LMS Single Sign-On ticket verification. */
@Schema(description = "Yêu cầu đăng nhập qua vé SSO LMS")
public record SsoLoginRequest(
        @NotBlank(message = "Mã vé không được để trống")
                @Size(max = 255, message = "Mã vé không được vượt quá 255 ký tự")
                @Schema(
                        description = "Mã vé SSO do LMS phát hành",
                        example = "ticket-lms-sv-001-1731234567890")
                String ticket) {

    @Override
    public String toString() {
        return "SsoLoginRequest[ticket=***]";
    }
}
