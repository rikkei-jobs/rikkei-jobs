package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.dto.CandidateSkillScoreDto;
import com.rikkei.jobs.candidate.dto.MentorSkillEvidenceDto;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Public service interface for candidate module, exposed to other modules according to Rule 14
 * boundaries.
 */
public interface CandidatePublicService {

    void recordMentorEvidences(Long candidateUserId, List<MentorSkillEvidenceDto> evidences);

    void recomputeCandidateSkills(Long candidateUserId);

    boolean isProfilePublic(Long candidateUserId);

    /** Verified skill scores (HS-01 skill_scores) keyed by skill code, 0-100 scale. */
    List<CandidateSkillScoreDto> getVerifiedSkillScores(Long candidateUserId);

    /** Latest update timestamp of the candidate verified scores, or null when none exist. */
    OffsetDateTime getSkillsUpdatedAt(Long candidateUserId);
}
