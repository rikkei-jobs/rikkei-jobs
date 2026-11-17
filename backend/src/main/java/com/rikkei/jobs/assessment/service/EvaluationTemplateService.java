package com.rikkei.jobs.assessment.service;

import com.rikkei.jobs.assessment.dto.response.EvaluationTemplateResponse;
import com.rikkei.jobs.assessment.model.EvaluationContext;
import java.util.List;

public interface EvaluationTemplateService {
    List<EvaluationTemplateResponse> getTemplates(String position, EvaluationContext context);
}
