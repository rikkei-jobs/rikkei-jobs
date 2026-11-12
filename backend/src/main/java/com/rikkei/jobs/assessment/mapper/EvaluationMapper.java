package com.rikkei.jobs.assessment.mapper;

import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.dto.response.EvaluationScoreResponse;
import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationScore;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EvaluationMapper {
    @Mapping(source = "template.id", target = "templateId")
    @Mapping(source = "template.name", target = "templateName")
    @Mapping(source = "mentor.id", target = "mentorId")
    EvaluationResponse toResponse(Evaluation evaluation);

    @Mapping(source = "criterion.id", target = "criterionId")
    EvaluationScoreResponse toScoreResponse(EvaluationScore score);
}
