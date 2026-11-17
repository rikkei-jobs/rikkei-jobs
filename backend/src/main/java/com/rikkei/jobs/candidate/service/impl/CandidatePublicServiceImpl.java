package com.rikkei.jobs.candidate.service.impl;

import com.rikkei.jobs.candidate.dto.MentorSkillEvidenceDto;
import com.rikkei.jobs.candidate.model.EvidenceSource;
import com.rikkei.jobs.candidate.model.SkillEvidence;
import com.rikkei.jobs.candidate.repository.CandidateProfileRepository;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Implementation of CandidatePublicService for cross-module boundary compliance (Rule 14). */
@Service
public class CandidatePublicServiceImpl implements CandidatePublicService {

    private final SkillEvidenceRepository skillEvidenceRepository;
    private final SkillRecomputeService skillRecomputeService;
    private final CandidateProfileRepository candidateProfileRepository;

    public CandidatePublicServiceImpl(
            SkillEvidenceRepository skillEvidenceRepository,
            SkillRecomputeService skillRecomputeService,
            CandidateProfileRepository candidateProfileRepository) {
        this.skillEvidenceRepository = skillEvidenceRepository;
        this.skillRecomputeService = skillRecomputeService;
        this.candidateProfileRepository = candidateProfileRepository;
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
}
