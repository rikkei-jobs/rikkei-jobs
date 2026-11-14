package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.model.EvidenceSource;
import com.rikkei.jobs.candidate.model.ExternalRecord;
import com.rikkei.jobs.candidate.model.ExternalSource;
import com.rikkei.jobs.candidate.model.SkillEvidence;
import com.rikkei.jobs.candidate.model.SkillLevel;
import com.rikkei.jobs.candidate.model.SkillMapping;
import com.rikkei.jobs.candidate.model.SkillScore;
import com.rikkei.jobs.candidate.model.SkillScoreId;
import com.rikkei.jobs.candidate.repository.ExternalRecordRepository;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import com.rikkei.jobs.candidate.repository.SkillMappingRepository;
import com.rikkei.jobs.candidate.repository.SkillScoreRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rebuilds verified evidences from external_records through skill_mappings and recomputes
 * skill_scores for a candidate. Idempotent: running it twice yields the same state.
 */
@Service
public class SkillRecomputeService {

    private static final Logger log = LoggerFactory.getLogger(SkillRecomputeService.class);

    private record MappingKey(ExternalSource source, String sourceCode) {}

    private final ExternalRecordRepository externalRecordRepository;
    private final SkillMappingRepository skillMappingRepository;
    private final SkillEvidenceRepository skillEvidenceRepository;
    private final SkillScoreRepository skillScoreRepository;
    private final Clock clock;

    public SkillRecomputeService(
            ExternalRecordRepository externalRecordRepository,
            SkillMappingRepository skillMappingRepository,
            SkillEvidenceRepository skillEvidenceRepository,
            SkillScoreRepository skillScoreRepository,
            Clock clock) {
        this.externalRecordRepository = externalRecordRepository;
        this.skillMappingRepository = skillMappingRepository;
        this.skillEvidenceRepository = skillEvidenceRepository;
        this.skillScoreRepository = skillScoreRepository;
        this.clock = clock;
    }

    /** Recomputes evidences and scores of one candidate. Returns the number of scored skills. */
    @Transactional(rollbackFor = Exception.class)
    public int recomputeSkills(Long userId) {
        OffsetDateTime now = OffsetDateTime.now(clock);

        skillEvidenceRepository.deleteVerifiedBySources(userId, EvidenceSource.EXTERNAL_DERIVED);
        skillEvidenceRepository.saveAll(buildVerifiedEvidences(userId));

        Map<Integer, List<SkillEvidence>> bySkill =
                skillEvidenceRepository.findByUserIdOrderByRecordedAtDesc(userId).stream()
                        .collect(Collectors.groupingBy(SkillEvidence::getSkillId));

        Map<Integer, SkillScore> existing =
                skillScoreRepository.findByUserId(userId).stream()
                        .collect(Collectors.toMap(SkillScore::getSkillId, s -> s));

        List<SkillScore> toSave = new ArrayList<>();
        for (Map.Entry<Integer, List<SkillEvidence>> entry : bySkill.entrySet()) {
            SkillScore score =
                    existing.getOrDefault(entry.getKey(), new SkillScore(userId, entry.getKey()));
            applyScores(score, entry.getValue(), now);
            toSave.add(score);
        }
        skillScoreRepository.saveAll(toSave);

        List<SkillScoreId> stale =
                existing.keySet().stream()
                        .filter(skillId -> !bySkill.containsKey(skillId))
                        .map(skillId -> new SkillScoreId(userId, skillId))
                        .toList();
        skillScoreRepository.deleteAllById(stale);

        log.info("Recomputed skill scores: userId={}, skills={}", userId, bySkill.size());
        return bySkill.size();
    }

    private List<SkillEvidence> buildVerifiedEvidences(Long userId) {
        Map<MappingKey, List<SkillMapping>> mappings =
                skillMappingRepository.findAll().stream()
                        .collect(
                                Collectors.groupingBy(
                                        m -> new MappingKey(m.getSource(), m.getSourceCode())));

        List<SkillEvidence> evidences = new ArrayList<>();
        for (ExternalRecord record : externalRecordRepository.findByUserId(userId)) {
            List<SkillMapping> matches =
                    mappings.getOrDefault(
                            new MappingKey(record.getSource(), record.getSourceCode()), List.of());
            for (SkillMapping mapping : matches) {
                evidences.add(
                        new SkillEvidence(
                                userId,
                                mapping.getSkillId(),
                                record.getSource().toEvidenceSource(),
                                record.getSourceCode(),
                                record.getTitle(),
                                record.getScore(),
                                mapping.getWeight(),
                                record.getRecordedAt(),
                                true));
            }
        }
        return evidences;
    }

    private static void applyScores(
            SkillScore score, List<SkillEvidence> evidences, OffsetDateTime now) {
        List<SkillScoreCalculator.Input> verified =
                evidences.stream()
                        .filter(SkillEvidence::isVerified)
                        .map(
                                e ->
                                        new SkillScoreCalculator.Input(
                                                e.getScore(), e.getWeight(), e.getRecordedAt()))
                        .toList();
        Optional<BigDecimal> verifiedScore = SkillScoreCalculator.verifiedScore(verified, now);

        BigDecimal selfScore =
                evidences.stream()
                        .filter(e -> e.getSource() == EvidenceSource.SELF)
                        .max(Comparator.comparing(SkillEvidence::getRecordedAt))
                        .map(SkillEvidence::getScore)
                        .orElse(null);

        SkillLevel level = verifiedScore.map(SkillLevel::fromScore).orElse(null);
        score.update(verifiedScore.orElse(null), selfScore, level, now);
    }
}
