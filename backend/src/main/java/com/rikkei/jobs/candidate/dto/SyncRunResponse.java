package com.rikkei.jobs.candidate.dto;

import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import java.time.OffsetDateTime;

/** API response DTO representing one external sync execution run. */
public record SyncRunResponse(
        Long id,
        SyncTrigger trigger,
        Long userId,
        String candidateName,
        SyncStatus status,
        OffsetDateTime startedAt,
        OffsetDateTime finishedAt,
        String error,
        SyncCounts counts) {}
