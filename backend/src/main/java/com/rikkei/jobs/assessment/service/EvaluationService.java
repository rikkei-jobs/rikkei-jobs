package com.rikkei.jobs.assessment.service;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;

public interface EvaluationService {
    EvaluationResponse createEvaluation(CreateEvaluationRequest request, Long mentorId);
}
