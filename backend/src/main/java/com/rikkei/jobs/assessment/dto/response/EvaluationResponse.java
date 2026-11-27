package com.rikkei.jobs.assessment.dto.response;

import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import java.time.OffsetDateTime;
import java.util.List;

public record EvaluationResponse(
        Long id,
        Long templateId,
        Long userId,
        Long mentorId,
        EvaluationContext context,
        String batchId,
        Long interviewRoundId,
        EvaluationStatus status,
        String overallComment,
        OffsetDateTime submittedAt,
        List<EvaluationScoreResponse> scores) {}
