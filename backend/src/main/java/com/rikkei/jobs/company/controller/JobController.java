package com.rikkei.jobs.company.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.company.dto.JobDetailDto;
import com.rikkei.jobs.company.service.JobQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Candidate-facing read endpoints for published job descriptions. */
@Tag(name = "Job Description", description = "Chi tiết JD đang tuyển dụng và kỹ năng yêu cầu")
@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {

    private final JobQueryService jobQueryService;

    public JobController(JobQueryService jobQueryService) {
        this.jobQueryService = jobQueryService;
    }

    @Operation(
            summary = "Chi tiết một JD đang tuyển dụng",
            description =
                    "Chỉ trả về JD có trạng thái APPROVED và còn hạn. Dùng cho màn chi tiết JD và"
                            + " nút \"Phân tích so với JD này\" (DT-01).",
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Chi tiết JD và kỹ năng yêu cầu",
                        content = @Content(schema = @Schema(implementation = JobDetailDto.class))),
                @ApiResponse(
                        responseCode = "401",
                        description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "403",
                        description =
                                "Yêu cầu đổi mật khẩu trước khi tiếp tục: MUST_CHANGE_PASSWORD",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "404",
                        description = "JD không tồn tại, chưa duyệt hoặc đã hết hạn: NOT_FOUND",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
            })
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/{jobId}")
    public JobDetailDto jobDetail(@PathVariable Long jobId) {
        return jobQueryService.getOpenJob(jobId);
    }
}
