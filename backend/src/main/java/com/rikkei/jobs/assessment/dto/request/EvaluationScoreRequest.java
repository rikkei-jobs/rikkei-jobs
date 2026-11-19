package com.rikkei.jobs.assessment.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EvaluationScoreRequest(
        @NotNull(message = "Criterion ID không được để trống") Long criterionId,
        @Min(value = 0, message = "Điểm tối thiểu là 0")
                @Max(value = 100, message = "Điểm tối đa là 100")
                Integer score,
        @Size(max = 2000, message = "Nhận xét tiêu chí không được vượt quá 2000 ký tự")
                String comment) {}
