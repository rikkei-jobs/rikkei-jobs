package com.rikkei.jobs.identity.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** DTO representing authenticated user profile. */
@Schema(description = "Thông tin hồ sơ người dùng")
public record UserDto(
        @Schema(description = "ID người dùng", example = "1") Long id,
        @Schema(description = "Email người dùng", example = "candidate1@rikkeijobs.test")
                String email,
        @Schema(description = "Họ và tên đầy đủ", example = "Nguyễn Văn An") String fullName,
        @Schema(description = "Tên vai trò hệ thống", example = "CANDIDATE") String role,
        @Schema(description = "ID công ty đối với tài khoản HR", example = "1") Long companyId,
        @Schema(description = "Mã người dùng LMS nếu đăng nhập SSO", example = "lms-sv-001")
                String lmsUserId,
        @Schema(description = "Trạng thái tài khoản", example = "ACTIVE") String status,
        @Schema(description = "Cờ bắt buộc đổi mật khẩu", example = "false")
                boolean mustChangePassword) {}
