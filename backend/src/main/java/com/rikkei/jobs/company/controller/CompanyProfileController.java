package com.rikkei.jobs.company.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.company.dto.request.UpdateCompanyRequest;
import com.rikkei.jobs.company.dto.response.CompanyResponse;
import com.rikkei.jobs.company.service.CompanyService;
import com.rikkei.jobs.identity.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** REST Controller for HR company profile/logo management and scoped company lookup by ID. */
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT Bearer access token")
@RestController
@RequestMapping("/api/v1/companies")
@Tag(
        name = "Company Profile",
        description =
                "Các API dành cho HR xem/cập nhật hồ sơ công ty, tải lên logo và tra cứu doanh nghiệp theo ID")
public class CompanyProfileController {

    private final CompanyService companyService;

    public CompanyProfileController(CompanyService companyService) {
        this.companyService = companyService;
    }

    @Operation(
            summary = "Lấy hồ sơ công ty của HR hiện tại",
            description =
                    "Trả về hồ sơ doanh nghiệp gắn với tài khoản HR đang đăng nhập (không nhận ID từ URL hoặc body).",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "200",
            description = "Lấy thông tin công ty thành công",
            content = @Content(schema = @Schema(implementation = CompanyResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description =
                    "Không có quyền HR hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Không tìm thấy doanh nghiệp của tài khoản: NOT_FOUND",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/me")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<CompanyResponse> getMyCompany(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(companyService.getMyCompany(principal.getCompanyId()));
    }

    @Operation(
            summary = "Cập nhật hồ sơ công ty của HR hiện tại",
            description =
                    "Cập nhật 7 trường thông tin hồ sơ công ty với trường version bắt buộc để kiểm soát xung đột đồng thời (thiếu hoặc null trả về 400 VALIDATION_ERROR, phiên bản cũ trả về 409 CONFLICT). Các trường taxCode và status là bất biến, không nằm trong UpdateCompanyRequest và nếu gửi kèm sẽ bị bỏ qua.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "200",
            description = "Cập nhật hồ sơ công ty thành công",
            content = @Content(schema = @Schema(implementation = CompanyResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Dữ liệu không hợp lệ hoặc thiếu trường version: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description =
                    "Không có quyền HR hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Không tìm thấy doanh nghiệp của tài khoản: NOT_FOUND",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "Xung đột phiên bản cập nhật lạc quan: CONFLICT",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PutMapping("/me")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<CompanyResponse> updateMyCompany(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateCompanyRequest request) {
        return ResponseEntity.ok(companyService.updateMyCompany(principal.getCompanyId(), request));
    }

    @Operation(
            summary = "Tải lên logo công ty (JPG/PNG tối đa 2 MB)",
            description =
                    "Kiểm tra magic bytes thực tế (JPG/PNG), tên tệp an toàn không có phần mở rộng kép và giới hạn tối đa 2,097,152 bytes.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "200",
            description = "Tải lên logo thành công",
            content = @Content(schema = @Schema(implementation = CompanyResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Tệp ảnh hoặc tên tệp không hợp lệ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description =
                    "Không có quyền HR hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Không tìm thấy doanh nghiệp của tài khoản: NOT_FOUND",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "413",
            description = "Dung lượng tệp vượt quá 2 MB: PAYLOAD_TOO_LARGE",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "502",
            description = "Dịch vụ lưu trữ logo tạm thời không khả dụng: LOGO_STORAGE_UNAVAILABLE",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping(value = "/me/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<CompanyResponse> uploadMyLogo(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(
                            description = "Tệp ảnh logo định dạng JPG hoặc PNG, tối đa 2 MB",
                            required = true,
                            content =
                                    @Content(
                                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                                            schema = @Schema(type = "string", format = "binary")))
                    @RequestPart("file")
                    MultipartFile file) {
        return ResponseEntity.ok(companyService.uploadMyLogo(principal.getCompanyId(), file));
    }

    @Operation(
            summary = "Lấy hồ sơ doanh nghiệp theo ID",
            description =
                    "HR chỉ đọc được doanh nghiệp thuộc company_id của mình (truy cập công ty khác hoặc chưa gán trả về 404 NOT_FOUND giống ID không tồn tại); STAFF đọc được mọi doanh nghiệp.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "200",
            description = "Lấy thông tin công ty thành công",
            content = @Content(schema = @Schema(implementation = CompanyResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Mã doanh nghiệp không hợp lệ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description =
                    "Không có quyền HR/STAFF hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Không tìm thấy doanh nghiệp: NOT_FOUND",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR', 'STAFF')")
    public ResponseEntity<CompanyResponse> getCompanyById(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(companyService.getCompanyById(id, principal));
    }
}
