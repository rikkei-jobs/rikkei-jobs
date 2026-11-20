package com.rikkei.jobs.assessment.dto.response;

import com.rikkei.jobs.assessment.model.EvaluationContext;

import java.util.List;

public record MentorEvaluationTasksResponse(EvaluationContext context,
                                            String batchId,
                                            int total,
                                            List<MentorEvaluationTaskResponse> items) {
}
