package com.rikkei.jobs.assessment.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record SelfAssessmentTemplateResponse(
    Long templateId,
    String templateName,
    String position,
    List<SkillCriteriaResponse> criteria
) {
    public record SkillCriteriaResponse(
        Integer skillId,
        String skillCode,
        String skillName,
        String description,
        BigDecimal weight
    ) {
    }
}
