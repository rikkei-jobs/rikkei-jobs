package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.security.CurrentUserResolver;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.WithdrawApplicationRequest;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.service.ApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
@Tag(
        name = "Recruitment - Candidate Applications",
        description = "API quản lý đơn ứng tuyển cá nhân của ứng viên")
public class CandidateApplicationController {

    private final ApplicationService applicationService;
    private final CurrentUserResolver currentUserResolver;

    public CandidateApplicationController(
            ApplicationService applicationService, CurrentUserResolver currentUserResolver) {
        this.applicationService = applicationService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping
    @Operation(
            summary = "Lấy danh sách đơn ứng tuyển của tôi",
            description =
                    "Trả về danh sách tất cả các đơn ứng tuyển của ứng viên, có thể lọc theo trạng thái.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Lấy danh sách thành công"),
        @ApiResponse(responseCode = "401", description = "Chưa xác thực danh tính")
    })
    public ResponseEntity<PageResponse<ApplicationSummaryResponse>> getMyApplications(
            @Parameter(
                            description =
                                    "Lọc theo trạng thái (SUBMITTED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN)")
                    @RequestParam(name = "status", required = false)
                    ApplicationStatus status,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {

        Long candidateUserId = currentUserResolver.resolveUserId();
        return ResponseEntity.ok(
                applicationService.getMyApplications(candidateUserId, status, page, size));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết một đơn ứng tuyển và lịch sử các bước",
            description =
                    "Trả về thông tin chi tiết đơn, bản PDF snapshot đã nộp và dòng thời gian lịch sử trạng thái.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Lấy chi tiết thành công"),
        @ApiResponse(responseCode = "401", description = "Chưa xác thực"),
        @ApiResponse(
                responseCode = "403",
                description = "Không có quyền xem đơn của ứng viên khác"),
        @ApiResponse(responseCode = "404", description = "Không tìm thấy đơn ứng tuyển")
    })
    public ResponseEntity<ApplicationDetailResponse> getMyApplicationDetail(
            @Parameter(description = "ID đơn ứng tuyển", required = true) @PathVariable("id")
                    Long applicationId) {

        Long candidateUserId = currentUserResolver.resolveUserId();
        ApplicationDetailResponse detail =
                applicationService.getMyApplicationDetail(applicationId, candidateUserId);
        return ResponseEntity.ok(detail);
    }

    @PostMapping("/{id}/withdraw")
    @Operation(
            summary = "Rút đơn ứng tuyển",
            description =
                    "Cho phép ứng viên rút đơn ứng tuyển khi chưa tới bước OFFER. "
                            + "Yêu cầu cung cấp lý do rút đơn. "
                            + "Nếu đơn đã ở bước OFFER, HIRED hoặc đã đóng sẽ trả về 400 BAD_REQUEST.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Rút đơn thành công, trạng thái chuyển sang WITHDRAWN"),
        @ApiResponse(
                responseCode = "400",
                description = "Không thể rút đơn khi đã ở bước OFFER hoặc đơn đã đóng"),
        @ApiResponse(responseCode = "401", description = "Chưa xác thực"),
        @ApiResponse(responseCode = "404", description = "Không tìm thấy đơn ứng tuyển")
    })
    public ResponseEntity<ApplicationDetailResponse> withdrawApplication(
            @Parameter(description = "ID đơn ứng tuyển", required = true) @PathVariable("id")
                    Long applicationId,
            @Valid @RequestBody WithdrawApplicationRequest request) {

        Long candidateUserId = currentUserResolver.resolveUserId();
        ApplicationDetailResponse response =
                applicationService.withdraw(applicationId, candidateUserId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/cv-snapshot")
    @Operation(summary = "Tải bản PDF đã nộp trong đơn ứng tuyển")
    public ResponseEntity<ByteArrayResource> downloadCvSnapshot(
            @PathVariable("id") Long applicationId) {
        CvSnapshotDownload snapshot =
                applicationService.getCandidateCvSnapshot(
                        applicationId, currentUserResolver.resolveUserId());
        byte[] content = snapshot.content();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(snapshot.originalFilename(), StandardCharsets.UTF_8)
                                .build()
                                .toString())
                .contentLength(content.length)
                .body(new ByteArrayResource(content));
    }
}
