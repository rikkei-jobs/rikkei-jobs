package com.rikkei.jobs.company.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.security.OwnershipGuard;
import com.rikkei.jobs.company.dto.HrJobSummaryDto;
import com.rikkei.jobs.company.service.JobQueryService;
import com.rikkei.jobs.identity.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only controller for HR to list jobs belonging to their own company (Option 1A for UT-02).
 *
 * <p>Note: DN-04 will expand this endpoint in a future round with full JD management capabilities.
 */
@RestController
@RequestMapping("/api/v1/hr/jobs")
@Validated
@PreAuthorize("hasRole('HR')")
@SecurityRequirement(name = "bearerAuth")
@Tag(
        name = "Company - HR Jobs",
        description =
                "API chỉ đọc danh sách JD thuộc doanh nghiệp của HR (Option 1A cho UT-02; DN-04 sẽ mở rộng sau)")
public class HrJobController {

    private final JobQueryService jobQueryService;

    public HrJobController(JobQueryService jobQueryService) {
        this.jobQueryService = jobQueryService;
    }

    @GetMapping
    @Operation(
            summary = "Lấy danh sách JD thuộc doanh nghiệp của HR đang đăng nhập (Option 1A)",
            description =
                    "Option 1A (UT-02): trả về danh sách phân trang tối giản các JD thuộc doanh nghiệp"
                            + " của tài khoản HR đang đăng nhập (companyId lấy hoàn toàn từ"
                            + " principal). Lưu ý: DN-04 sẽ mở rộng endpoint này sau.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Lấy danh sách JD của doanh nghiệp thành công"),
        @ApiResponse(
                responseCode = "400",
                description = "Tham số phân trang không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực danh tính: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền HR hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Tài khoản HR chưa được gán doanh nghiệp: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public PageResponse<HrJobSummaryDto> listMyCompanyJobs(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        if (principal == null
                || !OwnershipGuard.hasRole(principal, OwnershipGuard.ROLE_HR)
                || principal.getCompanyId() == null) {
            throw new ResourceNotFoundException("Tài khoản chưa được gán doanh nghiệp");
        }
        return jobQueryService.findJobsByCompanyId(principal.getCompanyId(), page, size);
    }
}
