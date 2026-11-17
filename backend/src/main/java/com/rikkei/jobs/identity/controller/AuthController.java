package com.rikkei.jobs.identity.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.identity.dto.AuthResponse;
import com.rikkei.jobs.identity.dto.ChangePasswordRequest;
import com.rikkei.jobs.identity.dto.ForgotPasswordRequest;
import com.rikkei.jobs.identity.dto.LoginRequest;
import com.rikkei.jobs.identity.dto.MessageResponse;
import com.rikkei.jobs.identity.dto.ResetPasswordRequest;
import com.rikkei.jobs.identity.dto.SsoLoginRequest;
import com.rikkei.jobs.identity.dto.UserDto;
import com.rikkei.jobs.identity.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller exposing public and authenticated authentication endpoints under /api/v1/auth.
 * Includes Springdoc OpenAPI 3.0 annotations for dev profile documentation.
 */
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT Bearer access token")
@RestController
@RequestMapping("/api/v1/auth")
@Tag(
        name = "Authentication",
        description = "Các API xác thực, đăng nhập và quản lý thông tin phiên làm việc")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(
            summary = "Đăng nhập qua vé SSO LMS",
            description =
                    "Xác thực vé SSO từ hệ thống LMS, kiểm tra TTL 60s và tính duy nhất, cấp access token JWT.")
    @ApiResponse(
            responseCode = "200",
            description = "Đăng nhập thành công",
            content = @Content(schema = @Schema(implementation = AuthResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Dữ liệu vé không hợp lệ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description =
                    "Vé không hợp lệ, đã hết hạn hoặc đã được sử dụng: TICKET_EXPIRED, TICKET_ALREADY_USED, INVALID_TICKET, UNMAPPED_LMS_ROLE",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "Xung đột định danh: EMAIL_COLLISION",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/sso")
    public ResponseEntity<AuthResponse> sso(@Valid @RequestBody SsoLoginRequest request) {
        AuthResponse response = authService.ssoLogin(request);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Đăng nhập tài khoản doanh nghiệp",
            description =
                    "Đăng nhập bằng email và mật khẩu, hỗ trợ khóa tài khoản 15 phút sau 5 lần nhập sai liên tiếp.")
    @ApiResponse(
            responseCode = "200",
            description = "Đăng nhập thành công",
            content = @Content(schema = @Schema(implementation = AuthResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Dữ liệu không hợp lệ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description =
                    "Sai thông tin đăng nhập hoặc tài khoản đang bị khóa: UNAUTHORIZED, ACCOUNT_LOCKED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate")
                .body(response);
    }

    @Operation(
            summary = "Đổi mật khẩu người dùng",
            description =
                    "Đổi mật khẩu tài khoản đang đăng nhập, kiểm tra chính sách mật khẩu và xóa cờ mustChangePassword.")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponse(
            responseCode = "200",
            description = "Đổi mật khẩu thành công",
            content = @Content(schema = @Schema(implementation = MessageResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Mật khẩu không đạt chính sách hoặc sai mật khẩu cũ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực tài khoản: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        MessageResponse response = authService.changePassword(principal.getId(), request);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Yêu cầu đặt lại mật khẩu",
            description =
                    "Gửi email chứa liên kết đặt lại mật khẩu có hiệu lực 30 phút đến hòm thư người dùng (chống dò quét tài khoản anti-enumeration luôn trả về 200).")
    @ApiResponse(
            responseCode = "200",
            description = "Tiếp nhận yêu cầu",
            content = @Content(schema = @Schema(implementation = MessageResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Email không hợp lệ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        MessageResponse response = authService.forgotPassword(request);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Đặt lại mật khẩu bằng token",
            description =
                    "Sử dụng token đặt lại mật khẩu nhận qua email để thiết lập mật khẩu mới.")
    @ApiResponse(
            responseCode = "200",
            description = "Đặt lại mật khẩu thành công",
            content = @Content(schema = @Schema(implementation = MessageResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description =
                    "Token không hợp lệ, hết hạn, hoặc mật khẩu yếu: RESET_TOKEN_EXPIRED, VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        MessageResponse response = authService.resetPassword(request);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Lấy thông tin tài khoản hiện tại",
            description =
                    "Trả về hồ sơ định danh của người dùng đang đăng nhập dựa trên access token.")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponse(
            responseCode = "200",
            description = "Thành công",
            content = @Content(schema = @Schema(implementation = UserDto.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực hoặc tài khoản bị khóa: UNAUTHORIZED, ACCOUNT_LOCKED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal UserPrincipal principal) {
        UserDto profile = authService.getMe(principal.getId());
        return ResponseEntity.ok(profile);
    }
}
