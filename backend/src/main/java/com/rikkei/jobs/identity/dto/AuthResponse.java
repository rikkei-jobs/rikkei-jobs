package com.rikkei.jobs.identity.dto;

public class AuthResponse {

    private String token;
    private UserResponse user;
    private boolean mustChangePassword;

    public AuthResponse() {}

    public AuthResponse(String token, UserResponse user, boolean mustChangePassword) {
        this.token = token;
        this.user = user;
        this.mustChangePassword = mustChangePassword;
    }

    public String getToken() {
        return token;
    }

    public String getAccessToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UserResponse getUser() {
        return user;
    }

    public void setUser(UserResponse user) {
        this.user = user;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
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
