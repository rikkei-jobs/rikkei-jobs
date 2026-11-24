package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.HrApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.service.ApplicationService;
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
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only controller for HR to view applications and CV snapshots of own company jobs. */
@RestController
@RequestMapping("/api/v1/hr/jobs/{jobId}/applications")
@Validated
@PreAuthorize("hasRole('HR')")
@SecurityRequirement(name = "bearerAuth")
@Tag(
        name = "Recruitment - HR Applications",
        description = "API chỉ đọc dành cho HR xem hồ sơ ứng tuyển thuộc JD của doanh nghiệp mình")
public class HrApplicationController {

    private final ApplicationService applicationService;

    public HrApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @GetMapping
    @Operation(
            summary = "Lấy danh sách ứng viên đã nộp CV cho vị trí",
            description =
                    "Trả về danh sách phân trang các đơn ứng tuyển thuộc JD của doanh nghiệp mình, có thể lọc theo trạng thái.",
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
                        "Không có quyền HR hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy JD thuộc doanh nghiệp của HR: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public PageResponse<HrApplicationSummaryResponse> listApplications(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long jobId,
            @Parameter(
                            description =
                                    "Lọc theo trạng thái (SUBMITTED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN)")
                    @RequestParam(name = "status", required = false)
                    ApplicationStatus status,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return applicationService.getHrApplications(
                jobId, principal.getCompanyId(), status, page, size);
    }

    @GetMapping("/{applicationId}")
    @Operation(
            summary = "Xem chi tiết đơn ứng tuyển và lịch sử trạng thái",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Lấy chi tiết đơn ứng tuyển thành công",
                content =
                        @Content(
                                schema =
                                        @Schema(implementation = ApplicationDetailResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "Tham số đường dẫn không hợp lệ: VALIDATION_ERROR",
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
                description =
                        "Không tìm thấy đơn ứng tuyển hoặc JD không thuộc doanh nghiệp của HR: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ApplicationDetailResponse getApplicationDetail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long jobId,
            @PathVariable Long applicationId) {
        return applicationService.getHrApplicationDetail(
                applicationId, jobId, principal.getCompanyId());
    }

    @GetMapping("/{applicationId}/cv-snapshot")
    @Operation(
            summary = "Tải bản PDF CV đã nộp cho vị trí thuộc HR",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Tải bản PDF CV snapshot thành công",
                content = @Content(mediaType = MediaType.APPLICATION_PDF_VALUE)),
        @ApiResponse(
                responseCode = "400",
                description = "Tham số đường dẫn không hợp lệ: VALIDATION_ERROR",
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
                description = "Không tìm thấy đơn ứng tuyển hoặc tệp CV: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<ByteArrayResource> downloadCvSnapshot(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long jobId,
            @PathVariable Long applicationId) {
        CvSnapshotDownload snapshot =
                applicationService.getHrCvSnapshot(applicationId, jobId, principal.getCompanyId());
        return CvSnapshotDownloadSupport.toPdfResponse(snapshot);
    }
}
