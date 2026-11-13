package com.rikkei.jobs.company.controller;

import com.rikkei.jobs.company.dto.JobPageResponse;
import com.rikkei.jobs.company.service.CompanyJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/jobs")
@Validated
@PreAuthorize("hasRole('CANDIDATE')")
@Tag(name = "Company - Job Descriptions", description = "Các vị trí tuyển dụng đã được phê duyệt")
public class JobDescriptionController {

    private final CompanyJobService companyJobService;

    public JobDescriptionController(CompanyJobService companyJobService) {
        this.companyJobService = companyJobService;
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách vị trí đang tuyển")
    public JobPageResponse listApprovedJobs(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return companyJobService.listApprovedJobs(page, size);
    }
}
