package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import java.time.OffsetDateTime;

public record HrApplicationSummaryResponse(
        Long id,
        Long candidateUserId,
        String cvSnapshotUrl,
        String coverLetter,
        ApplicationStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
