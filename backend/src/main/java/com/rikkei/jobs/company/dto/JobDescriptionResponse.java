package com.rikkei.jobs.company.dto;

import com.rikkei.jobs.company.model.JobStatus;
import java.time.OffsetDateTime;

public record JobDescriptionResponse(
        Long id,
        String title,
        String description,
        String companyName,
        String location,
        String employmentType,
        String salaryRange,
        JobStatus status,
        OffsetDateTime deadline,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
