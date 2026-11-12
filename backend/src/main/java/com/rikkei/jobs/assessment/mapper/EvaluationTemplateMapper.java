package com.rikkei.jobs.assessment.mapper;

import com.rikkei.jobs.assessment.dto.response.EvaluationTemplateResponse;
import com.rikkei.jobs.assessment.model.EvaluationCriteria;
import com.rikkei.jobs.assessment.model.EvaluationTemplate;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EvaluationTemplateMapper {
    EvaluationTemplateResponse toResponse(EvaluationTemplate template);

    @Mapping(target = "skillId", source = "skill.id")
    EvaluationTemplateResponse.CriteriaResponse toCriteriaResponse(EvaluationCriteria criteria);

    List<EvaluationTemplateResponse> toResponseList(List<EvaluationTemplate> templates);
}
