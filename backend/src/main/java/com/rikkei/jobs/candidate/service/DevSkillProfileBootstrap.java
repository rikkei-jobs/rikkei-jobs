package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.repository.ExternalRecordRepository;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Dev profile only: computes the skill scores of the seeded candidates at startup so the sample
 * accounts have a Skill Profile without calling the recompute endpoint first.
 */
@Component
@Profile("dev")
@ConditionalOnProperty(name = "spring.flyway.enabled", havingValue = "true", matchIfMissing = true)
public class DevSkillProfileBootstrap implements ApplicationRunner {

    private final ExternalRecordRepository externalRecordRepository;
    private final SkillEvidenceRepository skillEvidenceRepository;
    private final SkillRecomputeService skillRecomputeService;

    public DevSkillProfileBootstrap(
            ExternalRecordRepository externalRecordRepository,
            SkillEvidenceRepository skillEvidenceRepository,
            SkillRecomputeService skillRecomputeService) {
        this.externalRecordRepository = externalRecordRepository;
        this.skillEvidenceRepository = skillEvidenceRepository;
        this.skillRecomputeService = skillRecomputeService;
    }

    @Override
    public void run(ApplicationArguments args) {
        Set<Long> userIds = new TreeSet<>(externalRecordRepository.findDistinctUserIds());
        userIds.addAll(skillEvidenceRepository.findDistinctUserIds());
        userIds.forEach(skillRecomputeService::recomputeSkills);
    }
}
