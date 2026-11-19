package com.rikkei.jobs.company.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(description = "Thông tin tài khoản HR vừa được cấp (không bao gồm mật khẩu)")
public record HrAccountResponse(
        @Schema(description = "ID tài khoản người dùng", example = "10") Long userId,
        @Schema(description = "ID doanh nghiệp trực thuộc", example = "1") Long companyId,
        @Schema(description = "Email đăng nhập", example = "hr-contact@company.example.vn")
                String email,
        @Schema(description = "Họ và tên", example = "Nguyễn Thị Lan") String fullName,
        @Schema(description = "Vai trò hệ thống", example = "HR") String role,
        @Schema(description = "Trạng thái tài khoản", example = "ACTIVE") String status,
        @Schema(description = "Yêu cầu đổi mật khẩu lần đầu", example = "true")
                boolean mustChangePassword,
        @Schema(description = "Thời điểm khởi tạo") OffsetDateTime createdAt) {}
