package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.dto.CandidateSkillScoreDto;
import com.rikkei.jobs.candidate.dto.MentorSkillEvidenceDto;
import com.rikkei.jobs.candidate.dto.PmInternshipResultCommand;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Public service interface for candidate module, exposed to other modules according to Rule 14
 * boundaries.
 */
public interface CandidatePublicService {

    void recordMentorEvidences(Long candidateUserId, List<MentorSkillEvidenceDto> evidences);

    /**
     * Records PM internship results idempotently by {@code (candidateUserId, PM, batchId)} and
     * recomputes candidate skill scores. Previously synced records omitted from {@code results} are
     * retained locally so verified skill history is preserved.
     */
    void recordPmInternshipResults(Long candidateUserId, List<PmInternshipResultCommand> results);

    void recomputeCandidateSkills(Long candidateUserId);

    boolean isProfilePublic(Long candidateUserId);

    /** Verified skill scores (HS-01 skill_scores) keyed by skill code, 0-100 scale. */
    List<CandidateSkillScoreDto> getVerifiedSkillScores(Long candidateUserId);

    /**
     * Batch-fetches verified skill scores keyed by candidate user ID (prevents N+1 queries across
     * module boundaries).
     */
    Map<Long, List<CandidateSkillScoreDto>> getVerifiedSkillScoresByUserIds(
            Set<Long> candidateUserIds);

    /** Latest update timestamp of the candidate verified scores, or null when none exist. */
    OffsetDateTime getSkillsUpdatedAt(Long candidateUserId);
}
