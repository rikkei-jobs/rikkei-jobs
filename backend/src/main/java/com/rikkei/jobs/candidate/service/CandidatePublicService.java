package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.dto.MentorSkillEvidenceDto;
import java.util.List;

/**
 * Public service interface for candidate module, exposed to other modules according to Rule 14
 * boundaries.
 */
public interface CandidatePublicService {

    void recordMentorEvidences(Long candidateUserId, List<MentorSkillEvidenceDto> evidences);

    void recomputeCandidateSkills(Long candidateUserId);

    boolean isProfilePublic(Long candidateUserId);
}
