package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Controller handling job application submissions by candidates. */
@RestController
@RequestMapping("/api/v1/jobs")
@PreAuthorize("hasRole('CANDIDATE')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Recruitment - Job Applications", description = "API nộp hồ sơ ứng tuyển việc làm")
public class JobApplicationController {

    private final ApplicationService applicationService;

    public JobApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping("/{id}/apply")
    @Operation(
            summary = "Nộp hồ sơ ứng tuyển vào vị trí việc làm",
            description =
                    "Ứng viên chọn CV và gửi thư giới thiệu để ứng tuyển vào JD. "
                            + "Yêu cầu JD phải APPROVED và chưa hết hạn. "
                            + "Nếu ứng viên đang có đơn mở cho vị trí này sẽ trả về 409 DUPLICATE_APPLICATION.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "201",
                description = "Nộp hồ sơ ứng tuyển thành công",
                content =
                        @Content(
                                schema =
                                        @Schema(implementation = ApplicationDetailResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description =
                        "Dữ liệu không hợp lệ hoặc JD không đủ điều kiện / đã hết hạn: VALIDATION_ERROR, JOB_NOT_ELIGIBLE",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực danh tính: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền CANDIDATE hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy CV thuộc quyền sở hữu của ứng viên: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description =
                        "Ứng viên đã có đơn ứng tuyển đang mở cho vị trí này: DUPLICATE_APPLICATION",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "503",
                description = "Dịch vụ CV chưa khả dụng: CV_SERVICE_UNAVAILABLE",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<ApplicationDetailResponse> apply(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID của vị trí tuyển dụng (JD)", required = true)
                    @PathVariable("id")
                    Long jobId,
            @Valid @RequestBody ApplyJobRequest request) {
        ApplicationDetailResponse response =
                applicationService.apply(jobId, principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
