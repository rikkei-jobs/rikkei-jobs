package com.rikkei.jobs.assessment.mapper;

import com.rikkei.jobs.assessment.dto.response.EvaluationTemplateResponse;
import com.rikkei.jobs.assessment.model.EvaluationCriteria;
import com.rikkei.jobs.assessment.model.EvaluationTemplate;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface EvaluationTemplateMapper {
    EvaluationTemplateResponse toResponse(EvaluationTemplate template);

    EvaluationTemplateResponse.CriteriaResponse toCriteriaResponse(EvaluationCriteria criteria);

    List<EvaluationTemplateResponse> toResponseList(List<EvaluationTemplate> templates);
}
