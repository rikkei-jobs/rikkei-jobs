package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.assessment.dto.SkillDto;
import com.rikkei.jobs.assessment.service.SkillCatalogService;
import com.rikkei.jobs.candidate.dto.EvidenceDto;
import com.rikkei.jobs.candidate.dto.SkillProfileItemDto;
import com.rikkei.jobs.candidate.model.SkillEvidence;
import com.rikkei.jobs.candidate.model.SkillScore;
import com.rikkei.jobs.candidate.repository.CandidateProfileRepository;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import com.rikkei.jobs.candidate.repository.SkillScoreRepository;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.security.OwnershipGuard;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads the Skill Profile of a candidate, enforcing profile visibility and D6 role ownership. */
@Service
public class SkillProfileService {

    private static final String NOT_FOUND_MESSAGE = "Không tìm thấy hồ sơ năng lực";

    private final SkillScoreRepository skillScoreRepository;
    private final SkillEvidenceRepository skillEvidenceRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final SkillCatalogService skillCatalogService;

    public SkillProfileService(
            SkillScoreRepository skillScoreRepository,
            SkillEvidenceRepository skillEvidenceRepository,
            CandidateProfileRepository candidateProfileRepository,
            SkillCatalogService skillCatalogService) {
        this.skillScoreRepository = skillScoreRepository;
        this.skillEvidenceRepository = skillEvidenceRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.skillCatalogService = skillCatalogService;
    }

    /**
     * Returns the skills of {@code targetUserId} as seen by {@code viewerUserId} acting as a
     * candidate (owner-only).
     */
    @Transactional(readOnly = true)
    public List<SkillProfileItemDto> getSkills(Long viewerUserId, Long targetUserId) {
        return getSkills(viewerUserId, OwnershipGuard.ROLE_CANDIDATE, targetUserId);
    }

    /**
     * Returns the skills of {@code targetUserId} as seen by {@code viewerUserId} with {@code
     * viewerRole}. Under Team Lead D6: CANDIDATE sees only their own profile (other candidates ->
     * 404 even if {@code is_public = true}); HR sees only public profiles ({@code is_public = true}
     * -> 200, otherwise 404).
     */
    @Transactional(readOnly = true)
    public List<SkillProfileItemDto> getSkills(
            Long viewerUserId, String viewerRole, Long targetUserId) {
        boolean isSelf =
                OwnershipGuard.requireSelfOrRoles(
                        viewerUserId,
                        viewerRole,
                        targetUserId,
                        Set.of(OwnershipGuard.ROLE_CANDIDATE),
                        Set.of(OwnershipGuard.ROLE_HR),
                        NOT_FOUND_MESSAGE);
        if (!isSelf
                && !candidateProfileRepository.existsByUserIdAndPublicProfileTrue(targetUserId)) {
            throw new ResourceNotFoundException(NOT_FOUND_MESSAGE);
        }

        List<SkillScore> scores = skillScoreRepository.findByUserId(targetUserId);
        Map<Integer, List<SkillEvidence>> evidencesBySkill =
                skillEvidenceRepository.findByUserIdOrderByRecordedAtDesc(targetUserId).stream()
                        .collect(Collectors.groupingBy(SkillEvidence::getSkillId));
        Map<Integer, SkillDto> skills =
                skillCatalogService.findByIds(scores.stream().map(SkillScore::getSkillId).toList());

        return scores.stream()
                .filter(score -> skills.containsKey(score.getSkillId()))
                .map(score -> toItem(score, skills.get(score.getSkillId()), evidencesBySkill))
                .sorted(
                        Comparator.comparing((SkillProfileItemDto i) -> i.skill().group())
                                .thenComparing(
                                        SkillProfileItemDto::verifiedScore,
                                        Comparator.nullsLast(Comparator.reverseOrder()))
                                .thenComparing(i -> i.skill().code()))
                .toList();
    }

    private static SkillProfileItemDto toItem(
            SkillScore score, SkillDto skill, Map<Integer, List<SkillEvidence>> evidencesBySkill) {
        List<EvidenceDto> evidences =
                evidencesBySkill.getOrDefault(score.getSkillId(), List.of()).stream()
                        .map(SkillProfileService::toEvidence)
                        .toList();
        BigDecimal verified = score.getVerifiedScore();
        return new SkillProfileItemDto(
                skill,
                verified,
                score.getSelfScore(),
                score.getLevel() == null ? null : score.getLevel().name(),
                evidences);
    }

    private static EvidenceDto toEvidence(SkillEvidence evidence) {
        return new EvidenceDto(
                evidence.getSource().name(),
                evidence.getTitle(),
                evidence.getScore(),
                evidence.getRecordedAt(),
                evidence.isVerified());
    }
}
