package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.WithdrawApplicationRequest;
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
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Controller handling candidate's own applications list, details, and withdrawal. */
@RestController
@RequestMapping("/api/v1/me/applications")
@Validated
@PreAuthorize("hasRole('CANDIDATE')")
@SecurityRequirement(name = "bearerAuth")
@Tag(
        name = "Recruitment - Candidate Applications",
        description = "API quản lý đơn ứng tuyển cá nhân của ứng viên")
public class CandidateApplicationController {

    private final ApplicationService applicationService;

    public CandidateApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @GetMapping
    @Operation(
            summary = "Lấy danh sách đơn ứng tuyển của tôi",
            description =
                    "Trả về danh sách phân trang các đơn ứng tuyển của ứng viên, có thể lọc theo trạng thái.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Lấy danh sách thành công"),
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
                        "Không có quyền CANDIDATE hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<PageResponse<ApplicationSummaryResponse>> getMyApplications(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(
                            description =
                                    "Lọc theo trạng thái (SUBMITTED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN)")
                    @RequestParam(name = "status", required = false)
                    ApplicationStatus status,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(
                applicationService.getMyApplications(principal.getId(), status, page, size));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết một đơn ứng tuyển và lịch sử các bước",
            description =
                    "Trả về thông tin chi tiết đơn, URL tải bản PDF snapshot đã nộp và dòng thời gian lịch sử trạng thái.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Lấy chi tiết thành công",
                content =
                        @Content(
                                schema =
                                        @Schema(implementation = ApplicationDetailResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "ID đơn ứng tuyển không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền CANDIDATE hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy đơn ứng tuyển: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<ApplicationDetailResponse> getMyApplicationDetail(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đơn ứng tuyển", required = true) @PathVariable("id")
                    Long applicationId) {
        ApplicationDetailResponse detail =
                applicationService.getMyApplicationDetail(applicationId, principal.getId());
        return ResponseEntity.ok(detail);
    }

    @PostMapping("/{id}/withdraw")
    @Operation(
            summary = "Rút đơn ứng tuyển",
            description =
                    "Cho phép ứng viên rút đơn ứng tuyển khi chưa tới bước OFFER. "
                            + "Yêu cầu cung cấp lý do rút đơn.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Rút đơn thành công, trạng thái chuyển sang WITHDRAWN",
                content =
                        @Content(
                                schema =
                                        @Schema(implementation = ApplicationDetailResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "Dữ liệu rút đơn không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền CANDIDATE hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy đơn ứng tuyển: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description =
                        "Không thể rút đơn khi đã ở bước OFFER/trạng thái đóng hoặc xung đột cập nhật: CANNOT_WITHDRAW, CONFLICT",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<ApplicationDetailResponse> withdrawApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đơn ứng tuyển", required = true) @PathVariable("id")
                    Long applicationId,
            @Valid @RequestBody WithdrawApplicationRequest request) {
        ApplicationDetailResponse response =
                applicationService.withdraw(applicationId, principal.getId(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/cv-snapshot")
    @Operation(
            summary = "Tải bản PDF đã nộp trong đơn ứng tuyển",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Tải bản PDF CV snapshot thành công",
                content = @Content(mediaType = MediaType.APPLICATION_PDF_VALUE)),
        @ApiResponse(
                responseCode = "400",
                description = "ID đơn ứng tuyển không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền CANDIDATE hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy đơn ứng tuyển hoặc tệp CV: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<ByteArrayResource> downloadCvSnapshot(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") Long applicationId) {
        CvSnapshotDownload snapshot =
                applicationService.getCandidateCvSnapshot(applicationId, principal.getId());
        return CvSnapshotDownloadSupport.toPdfResponse(snapshot);
    }
}
