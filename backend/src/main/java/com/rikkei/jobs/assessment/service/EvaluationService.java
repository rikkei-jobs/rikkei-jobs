package com.rikkei.jobs.assessment.service;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.identity.model.User;

public interface EvaluationService {
    EvaluationResponse createEvaluation(CreateEvaluationRequest request, User mentor);
}
