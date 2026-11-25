package com.rikkei.jobs.assessment.service;

import com.rikkei.jobs.assessment.dto.response.SelfAssessmentTemplateResponse;

public interface SelfAssessmentService {
    SelfAssessmentTemplateResponse getTemplate(Long userId);
}
