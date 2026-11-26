package com.rikkei.jobs.company.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.company.dto.request.CreateCompanyRequest;
import com.rikkei.jobs.company.dto.request.CreateHrAccountRequest;
import com.rikkei.jobs.company.dto.response.CompanyResponse;
import com.rikkei.jobs.company.dto.response.HrAccountResponse;
import com.rikkei.jobs.company.service.CompanyService;
import com.rikkei.jobs.identity.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST Controller for Staff company management and HR account provisioning. */
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT Bearer access token")
@RestController
@RequestMapping("/api/v1/staff/companies")
@Tag(
        name = "Staff Company Management",
        description = "Các API dành cho cán bộ tạo doanh nghiệp và cấp tài khoản HR")
@PreAuthorize("hasRole('STAFF')")
public class StaffCompanyController {

    private final CompanyService companyService;

    public StaffCompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }

    @Operation(
            summary = "Tạo doanh nghiệp mới",
            description =
                    "Cán bộ (STAFF) tạo mới doanh nghiệp với mã số thuế 10 hoặc 13 chữ số. Trạng thái mặc định là ACTIVE.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "201",
            description = "Tạo doanh nghiệp thành công",
            content = @Content(schema = @Schema(implementation = CompanyResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Dữ liệu không hợp lệ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "Không có quyền cán bộ: FORBIDDEN",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "Mã số thuế đã tồn tại: CONFLICT",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping
    public ResponseEntity<CompanyResponse> createCompany(
            @Valid @RequestBody CreateCompanyRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        CompanyResponse response = companyService.createCompany(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(
            summary = "Cấp tài khoản HR cho doanh nghiệp",
            description =
                    "Cán bộ (STAFF) cấp tài khoản HR cho doanh nghiệp và gửi email thông tin đăng nhập kèm mật khẩu tạm thời.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "201",
            description = "Cấp tài khoản HR thành công",
            content = @Content(schema = @Schema(implementation = HrAccountResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Dữ liệu không hợp lệ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "Không có quyền cán bộ: FORBIDDEN",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Doanh nghiệp không tồn tại: NOT_FOUND",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "Email đã được sử dụng trong hệ thống: CONFLICT",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "502",
            description =
                    "Tài khoản đã được tạo nhưng gửi email thông báo thất bại: EMAIL_DELIVERY_FAILED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/{id}/hr-accounts")
    public ResponseEntity<HrAccountResponse> createHrAccount(
            @PathVariable Long id, @Valid @RequestBody CreateHrAccountRequest request) {
        HrAccountResponse response = companyService.createHrAccount(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
