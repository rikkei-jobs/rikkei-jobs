package com.rikkei.jobs.company.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record CreateJobRequest(
        @NotBlank @Size(max = 150) String companyName,
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 12000) String description,
        @NotBlank @Size(max = 180) String location,
        @NotBlank @Size(max = 40) String employmentType,
        @Size(max = 100) String salaryRange,
        @NotNull @Future OffsetDateTime deadline) {}
