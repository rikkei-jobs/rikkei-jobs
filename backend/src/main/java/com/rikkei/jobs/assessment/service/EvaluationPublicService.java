package com.rikkei.jobs.assessment.service;

import com.rikkei.jobs.assessment.dto.ProfileEvaluationDto;
import java.util.List;

/**
 * Public service interface for assessment module, exposed to candidate module according to Rule 14
 * boundaries.
 */
public interface EvaluationPublicService {

    List<ProfileEvaluationDto> getSubmittedEvaluationsForProfile(Long candidateUserId);
}
