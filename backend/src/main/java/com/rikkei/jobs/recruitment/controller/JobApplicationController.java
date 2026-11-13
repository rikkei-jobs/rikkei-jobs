package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.common.security.CurrentUserResolver;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
import com.rikkei.jobs.recruitment.service.ApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Controller handling job application submissions by candidates. */
@RestController
@RequestMapping("/api/v1/jobs")
@PreAuthorize("hasRole('CANDIDATE')")
@Tag(name = "Recruitment - Job Applications", description = "API nộp hồ sơ ứng tuyển việc làm")
public class JobApplicationController {

    private final ApplicationService applicationService;
    private final CurrentUserResolver currentUserResolver;

    public JobApplicationController(
            ApplicationService applicationService, CurrentUserResolver currentUserResolver) {
        this.applicationService = applicationService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping("/{id}/apply")
    @Operation(
            summary = "Nộp hồ sơ ứng tuyển vào vị trí việc làm",
            description =
                    "Ứng viên chọn CV và gửi thư giới thiệu để ứng tuyển vào JD. "
                            + "Yêu cầu JD phải APPROVED và chưa hết hạn. "
                            + "Nếu ứng viên đã từng ứng tuyển vào vị trí này sẽ trả về 409 CONFLICT.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Nộp hồ sơ ứng tuyển thành công"),
        @ApiResponse(
                responseCode = "400",
                description = "Dữ liệu không hợp lệ hoặc JD đã hết hạn / chưa duyệt"),
        @ApiResponse(responseCode = "401", description = "Chưa xác thực danh tính"),
        @ApiResponse(
                responseCode = "409",
                description = "Ứng viên đã từng ứng tuyển vào vị trí này")
    })
    public ResponseEntity<ApplicationDetailResponse> apply(
            @Parameter(description = "ID của vị trí tuyển dụng (JD)", required = true)
                    @PathVariable("id")
                    Long jobId,
            @Valid @RequestBody ApplyJobRequest request) {

        Long candidateUserId = currentUserResolver.resolveUserId();
        ApplicationDetailResponse response =
                applicationService.apply(jobId, candidateUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
