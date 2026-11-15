package com.rikkei.jobs.identity.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

/** Authentication response DTO containing JWT access token and user identity. */
@Schema(description = "Phản hồi xác thực đăng nhập")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthResponse(
        @Schema(description = "JWT Bearer access token") String accessToken,
        @Schema(description = "Thông tin tài khoản đăng nhập") UserDto user,
        @Schema(
                        description = "Cờ yêu cầu đổi mật khẩu (chỉ có trong đăng nhập mật khẩu)",
                        example = "false")
                Boolean mustChangePassword) {

    public AuthResponse(String accessToken, UserDto user) {
        this(accessToken, user, null);
    }
}
