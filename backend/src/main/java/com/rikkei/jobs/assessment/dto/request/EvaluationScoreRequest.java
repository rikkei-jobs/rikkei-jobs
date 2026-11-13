package com.rikkei.jobs.assessment.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EvaluationScoreRequest {
    @NotNull(message = "Criterion ID không được để trống")
    private Long criterionId;

    @Min(value = 0, message = "Điểm tối thiểu là 0")
    @Max(value = 100, message = "Điểm tối đa là 100")
    private Integer score;

    private String comment;
}
