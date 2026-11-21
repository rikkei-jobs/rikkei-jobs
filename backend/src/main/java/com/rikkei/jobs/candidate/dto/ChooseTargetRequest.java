package com.rikkei.jobs.candidate.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Positive;

/**
 * Chooses the single target to benchmark against. Exactly one of {@code positionId} or {@code
 * jobId} must be provided; the service validates the combination.
 */
@Schema(description = "Mục tiêu phân tích: chọn đúng một positionId hoặc jobId")
public record ChooseTargetRequest(
        @Positive(message = "positionId phải là số dương")
                @Schema(description = "ID vị trí mục tiêu", example = "1", nullable = true)
                Long positionId,
        @Positive(message = "jobId phải là số dương")
                @Schema(
                        description = "ID tin tuyển dụng (JD) mục tiêu",
                        example = "1",
                        nullable = true)
                Long jobId) {}
