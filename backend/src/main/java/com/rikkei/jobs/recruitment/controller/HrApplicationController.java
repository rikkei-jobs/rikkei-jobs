package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.security.CurrentUserResolver;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.HrApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.UpdateApplicationStatusRequest;
import com.rikkei.jobs.recruitment.service.ApplicationService;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/job-descriptions/{jobId}/applications")
@Validated
@PreAuthorize("hasRole('HR')")
@Tag(
        name = "Recruitment - HR Applications",
        description = "Quản lý hồ sơ ứng tuyển thuộc JD của HR")
public class HrApplicationController {

    private final ApplicationService applicationService;
    private final CurrentUserResolver currentUserResolver;

    public HrApplicationController(
            ApplicationService applicationService, CurrentUserResolver currentUserResolver) {
        this.applicationService = applicationService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách ứng viên đã nộp CV cho vị trí")
    public PageResponse<HrApplicationSummaryResponse> listApplications(
            @PathVariable Long jobId,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return applicationService.getHrApplications(
                jobId, currentUserResolver.resolveUserId(), page, size);
    }

    @GetMapping("/{applicationId}")
    @Operation(summary = "Xem chi tiết đơn ứng tuyển và lịch sử trạng thái")
    public ApplicationDetailResponse getApplicationDetail(
            @PathVariable Long jobId, @PathVariable Long applicationId) {
        return applicationService.getHrApplicationDetail(
                applicationId, jobId, currentUserResolver.resolveUserId());
    }

    @PatchMapping("/{applicationId}/status")
    @Operation(summary = "Cập nhật trạng thái ứng tuyển")
    public ApplicationDetailResponse updateStatus(
            @PathVariable Long jobId,
            @PathVariable Long applicationId,
            @Valid @RequestBody UpdateApplicationStatusRequest request) {
        return applicationService.updateStatus(
                applicationId,
                jobId,
                currentUserResolver.resolveUserId(),
                request.status(),
                request.note());
    }

    @GetMapping("/{applicationId}/cv-snapshot")
    @Operation(summary = "Tải bản PDF CV đã nộp cho vị trí thuộc HR")
    public ResponseEntity<ByteArrayResource> downloadCvSnapshot(
            @PathVariable Long jobId, @PathVariable Long applicationId) {
        CvSnapshotDownload snapshot =
                applicationService.getHrCvSnapshot(
                        applicationId, jobId, currentUserResolver.resolveUserId());
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
