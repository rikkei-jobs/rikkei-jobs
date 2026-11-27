package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.recruitment.dto.StaffApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.service.RecruitmentProcessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only controller for STAFF to monitor recruitment applications across companies (UT-02). */
@RestController
@RequestMapping("/api/v1/staff/applications")
@Validated
@PreAuthorize("hasRole('STAFF')")
@SecurityRequirement(name = "bearerAuth")
@Tag(
        name = "Recruitment - Staff Monitoring",
        description = "API chỉ đọc dành cho STAFF theo dõi toàn bộ đơn ứng tuyển (UT-02)")
public class StaffApplicationController {

    private final RecruitmentProcessService recruitmentProcessService;

    public StaffApplicationController(RecruitmentProcessService recruitmentProcessService) {
        this.recruitmentProcessService = recruitmentProcessService;
    }

    @GetMapping
    @Operation(
            summary =
                    "Xem danh sách toàn bộ đơn ứng tuyển kèm bộ lọc công ty, vị trí, trạng thái (UT-02)",
            description =
                    "STAFF tra cứu toàn bộ hồ sơ ứng tuyển với bộ lọc companyId, jobId, status và phân trang 1-based (page >= 1, mặc định 20, tối đa 100).",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Lấy danh sách hồ sơ thành công"),
        @ApiResponse(
                responseCode = "400",
                description = "Tham số lọc hoặc phân trang không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực danh tính: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền STAFF hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public PageResponse<StaffApplicationSummaryResponse> getStaffApplications(
            @Parameter(description = "Lọc theo ID công ty") @RequestParam(required = false)
                    Long companyId,
            @Parameter(description = "Lọc theo ID vị trí tuyển dụng")
                    @RequestParam(required = false)
                    Long jobId,
            @Parameter(
                            description =
                                    "Lọc theo trạng thái (SUBMITTED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN)")
                    @RequestParam(required = false)
                    ApplicationStatus status,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return recruitmentProcessService.getStaffApplications(companyId, jobId, status, page, size);
    }
}
