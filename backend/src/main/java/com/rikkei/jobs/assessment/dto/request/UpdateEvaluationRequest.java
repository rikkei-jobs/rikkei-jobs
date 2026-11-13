package com.rikkei.jobs.assessment.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateEvaluationRequest {
    @Size(max = 5000)
    private String overallComment;

    @NotNull @Valid private List<ScoreRequest> scores;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScoreRequest {

        @NotNull private Long criterionId;

        @Min(0)
        @Max(100)
        private Integer score;

        @Size(max = 2000)
        private String comment;
    }
}
