package com.rikkei.jobs.company.controller;

import com.rikkei.jobs.company.dto.JobDescriptionResponse;
import com.rikkei.jobs.company.dto.UpdateJobStatusRequest;
import com.rikkei.jobs.company.service.CompanyJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff/job-descriptions")
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@Tag(name = "Company - Job Approval", description = "Phê duyệt hoặc đóng vị trí tuyển dụng")
public class StaffJobDescriptionController {

    private final CompanyJobService companyJobService;

    public StaffJobDescriptionController(CompanyJobService companyJobService) {
        this.companyJobService = companyJobService;
    }

    @PatchMapping("/{jobId}/status")
    @Operation(summary = "Cập nhật trạng thái phê duyệt của vị trí tuyển dụng")
    public JobDescriptionResponse updateStatus(
            @PathVariable Long jobId, @Valid @RequestBody UpdateJobStatusRequest request) {
        return companyJobService.updateJobStatus(jobId, request.status());
    }
}
