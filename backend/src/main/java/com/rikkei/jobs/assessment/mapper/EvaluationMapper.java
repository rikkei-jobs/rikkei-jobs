package com.rikkei.jobs.assessment.mapper;

import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.model.Evaluation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EvaluationMapper {
    @Mapping(source = "template.id", target = "templateId")
    @Mapping(source = "template.name", target = "templateName")
    EvaluationResponse toResponse(Evaluation evaluation);
}
