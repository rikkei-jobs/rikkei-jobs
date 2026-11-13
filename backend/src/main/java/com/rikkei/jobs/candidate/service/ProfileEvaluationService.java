package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationsResponse;

public interface ProfileEvaluationService {
    ProfileEvaluationsResponse getProfileEvaluations(Long userId, String currentUserEmail);
}
