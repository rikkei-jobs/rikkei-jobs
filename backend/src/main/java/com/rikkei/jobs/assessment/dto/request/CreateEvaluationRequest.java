package com.rikkei.jobs.assessment.dto.request;

import com.rikkei.jobs.assessment.model.EvaluationContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateEvaluationRequest(
        @NotNull(message = "Template ID không được để trống") Long templateId,
        @NotNull(message = "User ID không được để trống") Long userId,
        @NotNull(message = "Context không được để trống") EvaluationContext context,
        String batchId,
        Long interviewRoundId,
        @Size(max = 5000, message = "Nhận xét chung không được vượt quá 5000 ký tự")
                String overallComment,
        @Valid List<EvaluationScoreRequest> scores) {}
