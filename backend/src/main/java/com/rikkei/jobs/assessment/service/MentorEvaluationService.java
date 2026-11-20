package com.rikkei.jobs.assessment.service;

import com.rikkei.jobs.assessment.dto.response.MentorEvaluationTasksResponse;
import com.rikkei.jobs.assessment.model.EvaluationContext;

public interface MentorEvaluationService {
    MentorEvaluationTasksResponse getEvaluationTasks(EvaluationContext context, String batchId);
}
