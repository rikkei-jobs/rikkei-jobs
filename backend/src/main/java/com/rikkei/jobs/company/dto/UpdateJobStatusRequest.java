package com.rikkei.jobs.company.dto;

import com.rikkei.jobs.company.model.JobStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateJobStatusRequest(@NotNull JobStatus status) {}
