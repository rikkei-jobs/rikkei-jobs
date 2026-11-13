package com.rikkei.jobs.candidate.mapper;

import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationScore;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationMentorResponse;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationResponse;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationScoreResponse;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationsResponse;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ProfileEvaluationMapper {
    @Mapping(target = "mentor", source = "mentor")
    @Mapping(target = "context", expression = "java(evaluation.getContext().name())")
    @Mapping(target = "scores", source = "scores")
    @Mapping(target = "templateId", source = "template.id")
    ProfileEvaluationResponse toResponse(Evaluation evaluation);

    @Mapping(target = "name", source = "fullName")
    ProfileEvaluationMentorResponse toMentorResponse(com.rikkei.jobs.identity.model.User mentor);

    @Mapping(target = "criterionId", source = "criterion.id")
    @Mapping(target = "criterionDescription", source = "criterion.description")
    ProfileEvaluationScoreResponse toScoreResponse(EvaluationScore evaluationScore);

    List<ProfileEvaluationResponse> toResponseList(List<Evaluation> evaluations);

    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "evaluations", source = "evaluations")
    ProfileEvaluationsResponse toEvaluationsResponse(Long userId, List<Evaluation> evaluations);
}
