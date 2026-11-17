package com.rikkei.jobs.candidate.dto.response;

import java.util.List;

public class ProfileEvaluationsResponse {
    private Long userId;
    private List<ProfileEvaluationResponse> evaluations;

    public ProfileEvaluationsResponse() {}

    public ProfileEvaluationsResponse(Long userId, List<ProfileEvaluationResponse> evaluations) {
        this.userId = userId;
        this.evaluations = evaluations;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public List<ProfileEvaluationResponse> getEvaluations() {
        return evaluations;
    }

    public void setEvaluations(List<ProfileEvaluationResponse> evaluations) {
        this.evaluations = evaluations;
    }
}
