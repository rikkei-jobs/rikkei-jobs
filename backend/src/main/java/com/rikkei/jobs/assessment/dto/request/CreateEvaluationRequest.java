package com.rikkei.jobs.assessment.dto.request;

import com.rikkei.jobs.assessment.model.EvaluationContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CreateEvaluationRequest {
    @NotNull(message = "Template ID không được để trống")
    private Long templateId;

    @NotNull(message = "User ID không được để trống")
    private Long userId;

    @NotNull(message = "Context không được để trống")
    private EvaluationContext context;

    private Long batchId;

    private Long interviewRoundId;

    private String overallComment;

    @Valid
    private List<EvaluationScoreRequest> scores;
}
