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
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads the Skill Profile of a candidate, enforcing profile visibility. */
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
     * Returns the skills of {@code targetUserId} as seen by {@code viewerUserId}. A viewer other
     * than the owner only sees public profiles; otherwise the profile is reported as not found so
     * its existence is not disclosed.
     */
    @Transactional(readOnly = true)
    public List<SkillProfileItemDto> getSkills(Long viewerUserId, Long targetUserId) {
        boolean owner = Objects.equals(viewerUserId, targetUserId);
        if (!owner
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
