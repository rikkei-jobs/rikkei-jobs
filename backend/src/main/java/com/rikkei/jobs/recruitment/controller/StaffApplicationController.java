package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.recruitment.dto.StaffApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.service.RecruitmentProcessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for STAFF to view and monitor all recruitment applications across companies (UT-02).
 * Strictly read-only for staff role.
 */
@RestController
@Validated
@PreAuthorize("hasRole('STAFF')")
@Tag(
        name = "Recruitment - Staff Monitoring",
        description = "Cán bộ theo dõi toàn bộ đơn ứng tuyển (UT-02)")
public class StaffApplicationController {

    private final RecruitmentProcessService recruitmentProcessService;

    public StaffApplicationController(RecruitmentProcessService recruitmentProcessService) {
        this.recruitmentProcessService = recruitmentProcessService;
    }

    @GetMapping({"/api/v1/staff/applications", "/staff/applications"})
    @Operation(
            summary =
                    "Xem danh sách toàn bộ đơn ứng tuyển kèm bộ lọc công ty, công việc, trạng thái (UT-02)")
    public ResponseEntity<PageResponse<StaffApplicationSummaryResponse>> getStaffApplications(
            @RequestParam(required = false) Long companyId,
            @RequestParam(required = false) Long jobId,
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(
                recruitmentProcessService.getStaffApplications(
                        companyId, jobId, status, page, size));
    }
}
