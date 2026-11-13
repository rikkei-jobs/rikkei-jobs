package com.rikkei.jobs.company.controller;

import com.rikkei.jobs.common.security.CurrentUserResolver;
import com.rikkei.jobs.company.dto.CreateJobRequest;
import com.rikkei.jobs.company.dto.JobDescriptionResponse;
import com.rikkei.jobs.company.dto.JobPageResponse;
import com.rikkei.jobs.company.service.CompanyJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/job-descriptions")
@Validated
@PreAuthorize("hasRole('HR')")
@Tag(
        name = "Company - HR Job Descriptions",
        description = "Quản lý vị trí tuyển dụng của doanh nghiệp")
public class HrJobDescriptionController {

    private final CompanyJobService companyJobService;
    private final CurrentUserResolver currentUserResolver;

    public HrJobDescriptionController(
            CompanyJobService companyJobService, CurrentUserResolver currentUserResolver) {
        this.companyJobService = companyJobService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách vị trí do HR tạo")
    public JobPageResponse listOwnedJobs(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return companyJobService.listJobsOwnedByHr(currentUserResolver.resolveUserId(), page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tạo vị trí tuyển dụng chờ Staff phê duyệt")
    public JobDescriptionResponse createJob(@Valid @RequestBody CreateJobRequest request) {
        return companyJobService.createJob(currentUserResolver.resolveUserId(), request);
    }
}
