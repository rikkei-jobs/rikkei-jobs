package com.rikkei.jobs.assessment.dto.response;

import com.rikkei.jobs.assessment.model.EvaluationContext;
import java.math.BigDecimal;
import java.util.List;

public record EvaluationTemplateResponse(
        Long id,
        String name,
        String position,
        EvaluationContext context,
        Boolean active,
        List<CriteriaResponse> criteria) {
    public record CriteriaResponse(Long id, Long skillId, String description, BigDecimal weight) {}
}
