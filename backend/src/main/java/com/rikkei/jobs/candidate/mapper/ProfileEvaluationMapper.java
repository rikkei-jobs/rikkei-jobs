package com.rikkei.jobs.candidate.mapper;

import com.rikkei.jobs.assessment.dto.ProfileEvaluationDto;
import com.rikkei.jobs.assessment.dto.ProfileEvaluationScoreDto;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationMentorResponse;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationResponse;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationScoreResponse;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationsResponse;
import com.rikkei.jobs.identity.dto.UserSummaryDto;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ProfileEvaluationMapper {

    public ProfileEvaluationResponse toResponse(
            ProfileEvaluationDto dto, Map<Long, UserSummaryDto> mentorMap) {
        if (dto == null) {
            return null;
        }

        ProfileEvaluationMentorResponse mentorResponse = null;
        if (dto.mentorId() != null) {
            String mentorName = null;
            if (mentorMap != null && mentorMap.containsKey(dto.mentorId())) {
                mentorName = mentorMap.get(dto.mentorId()).fullName();
            }
            mentorResponse = new ProfileEvaluationMentorResponse(dto.mentorId(), mentorName);
        }

        List<ProfileEvaluationScoreResponse> scoreResponses = new ArrayList<>();
        if (dto.scores() != null) {
            for (ProfileEvaluationScoreDto s : dto.scores()) {
                scoreResponses.add(toScoreResponse(s));
            }
        }

        return new ProfileEvaluationResponse(
                dto.id(),
                mentorResponse,
                dto.templateId(),
                dto.context(),
                dto.submittedAt(),
                dto.overallComment(),
                scoreResponses);
    }

    public ProfileEvaluationScoreResponse toScoreResponse(ProfileEvaluationScoreDto dto) {
        if (dto == null) {
            return null;
        }
        return new ProfileEvaluationScoreResponse(
                dto.criterionId(), dto.criteriaName(), dto.score(), dto.comment());
    }

    public List<ProfileEvaluationResponse> toResponseList(
            List<ProfileEvaluationDto> evaluations, Map<Long, UserSummaryDto> mentorMap) {
        if (evaluations == null) {
            return new ArrayList<>();
        }
        List<ProfileEvaluationResponse> list = new ArrayList<>();
        for (ProfileEvaluationDto e : evaluations) {
            list.add(toResponse(e, mentorMap));
        }
        return list;
    }

    public ProfileEvaluationsResponse toEvaluationsResponse(
            Long userId,
            List<ProfileEvaluationDto> evaluations,
            Map<Long, UserSummaryDto> mentorMap) {
        ProfileEvaluationsResponse response = new ProfileEvaluationsResponse();
        response.setUserId(userId);
        response.setEvaluations(toResponseList(evaluations, mentorMap));
        return response;
    }
}
