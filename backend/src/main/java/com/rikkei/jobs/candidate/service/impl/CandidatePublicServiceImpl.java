package com.rikkei.jobs.candidate.service.impl;

import com.rikkei.jobs.assessment.dto.SkillDto;
import com.rikkei.jobs.assessment.service.SkillCatalogService;
import com.rikkei.jobs.candidate.dto.CandidateSkillScoreDto;
import com.rikkei.jobs.candidate.dto.MentorSkillEvidenceDto;
import com.rikkei.jobs.candidate.model.EvidenceSource;
import com.rikkei.jobs.candidate.model.SkillEvidence;
import com.rikkei.jobs.candidate.model.SkillScore;
import com.rikkei.jobs.candidate.repository.CandidateProfileRepository;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import com.rikkei.jobs.candidate.repository.SkillScoreRepository;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Implementation of CandidatePublicService for cross-module boundary compliance (Rule 14). */
@Service
public class CandidatePublicServiceImpl implements CandidatePublicService {

    private final SkillEvidenceRepository skillEvidenceRepository;
    private final SkillRecomputeService skillRecomputeService;
    private final CandidateProfileRepository candidateProfileRepository;
    private final SkillScoreRepository skillScoreRepository;
    private final SkillCatalogService skillCatalogService;

    public CandidatePublicServiceImpl(
            SkillEvidenceRepository skillEvidenceRepository,
            SkillRecomputeService skillRecomputeService,
            CandidateProfileRepository candidateProfileRepository,
            SkillScoreRepository skillScoreRepository,
            SkillCatalogService skillCatalogService) {
        this.skillEvidenceRepository = skillEvidenceRepository;
        this.skillRecomputeService = skillRecomputeService;
        this.candidateProfileRepository = candidateProfileRepository;
        this.skillScoreRepository = skillScoreRepository;
        this.skillCatalogService = skillCatalogService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recordMentorEvidences(
            Long candidateUserId, List<MentorSkillEvidenceDto> evidences) {
        if (evidences == null || evidences.isEmpty()) {
            return;
        }

        List<SkillEvidence> entities =
                evidences.stream()
                        .map(
                                dto ->
                                        new SkillEvidence(
                                                candidateUserId,
                                                dto.skillId(),
                                                EvidenceSource.MENTOR,
                                                dto.evaluationId() != null
                                                        ? dto.evaluationId().toString()
                                                        : null,
                                                dto.title(),
                                                dto.score(),
                                                dto.weight(),
                                                dto.recordedAt(),
                                                true))
                        .toList();

        skillEvidenceRepository.saveAll(entities);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recomputeCandidateSkills(Long candidateUserId) {
        skillRecomputeService.recomputeSkills(candidateUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isProfilePublic(Long candidateUserId) {
        return candidateProfileRepository.existsByUserIdAndPublicProfileTrue(candidateUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateSkillScoreDto> getVerifiedSkillScores(Long candidateUserId) {
        List<SkillScore> scores =
                skillScoreRepository.findByUserId(candidateUserId).stream()
                        .filter(score -> score.getVerifiedScore() != null)
                        .toList();
        if (scores.isEmpty()) {
            return List.of();
        }

        Map<Integer, SkillDto> catalogue =
                skillCatalogService.findByIds(scores.stream().map(SkillScore::getSkillId).toList());

        return scores.stream()
                .map(
                        score -> {
                            SkillDto skill = catalogue.get(score.getSkillId());
                            if (skill == null) {
                                return null;
                            }
                            int value =
                                    score.getVerifiedScore()
                                            .setScale(0, RoundingMode.HALF_UP)
                                            .intValue();
                            return new CandidateSkillScoreDto(skill.code(), value);
                        })
                .filter(dto -> dto != null)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OffsetDateTime getSkillsUpdatedAt(Long candidateUserId) {
        return skillScoreRepository.findByUserId(candidateUserId).stream()
                .map(SkillScore::getUpdatedAt)
                .filter(updatedAt -> updatedAt != null)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }
}
