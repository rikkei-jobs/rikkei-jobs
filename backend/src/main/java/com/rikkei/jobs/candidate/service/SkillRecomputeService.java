package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.model.EvidenceSource;
import com.rikkei.jobs.candidate.model.ExternalRecord;
import com.rikkei.jobs.candidate.model.ExternalSource;
import com.rikkei.jobs.candidate.model.SkillEvidence;
import com.rikkei.jobs.candidate.model.SkillLevel;
import com.rikkei.jobs.candidate.model.SkillMapping;
import com.rikkei.jobs.candidate.model.SkillScore;
import com.rikkei.jobs.candidate.repository.ExternalRecordRepository;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import com.rikkei.jobs.candidate.repository.SkillMappingRepository;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rebuilds verified evidences from external_records through skill_mappings and recomputes
 * skill_scores for a candidate. Idempotent: running it twice yields the same state.
 */
@Service
public class SkillRecomputeService {

    private static final Logger log = LoggerFactory.getLogger(SkillRecomputeService.class);

    private static final String INSERT_EVIDENCE_SQL =
            """
            INSERT INTO skill_evidences
                (user_id, skill_id, source, source_ref, title, score, weight, recorded_at, verified, external_record_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    private static final int[] INSERT_EVIDENCE_TYPES = {
        Types.BIGINT,
        Types.INTEGER,
        Types.VARCHAR,
        Types.VARCHAR,
        Types.VARCHAR,
        Types.DECIMAL,
        Types.DECIMAL,
        Types.TIMESTAMP,
        Types.BOOLEAN,
        Types.BIGINT
    };

    private static final String UPSERT_SCORE_SQL =
            """
            INSERT INTO skill_scores
                (user_id, skill_id, verified_score, self_score, level, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (user_id, skill_id) DO UPDATE SET
                verified_score = EXCLUDED.verified_score,
                self_score = EXCLUDED.self_score,
                level = EXCLUDED.level,
                updated_at = EXCLUDED.updated_at
            """;

    private static final String DELETE_STALE_SCORE_SQL =
            "DELETE FROM skill_scores WHERE user_id = ? AND skill_id = ?";

    private record MappingKey(ExternalSource source, String sourceCode) {}

    private final ExternalRecordRepository externalRecordRepository;
    private final SkillMappingRepository skillMappingRepository;
    private final SkillEvidenceRepository skillEvidenceRepository;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;
    private final CandidateSkillLockService candidateSkillLockService;

    public SkillRecomputeService(
            ExternalRecordRepository externalRecordRepository,
            SkillMappingRepository skillMappingRepository,
            SkillEvidenceRepository skillEvidenceRepository,
            JdbcTemplate jdbcTemplate,
            Clock clock,
            CandidateSkillLockService candidateSkillLockService) {
        this.externalRecordRepository = externalRecordRepository;
        this.skillMappingRepository = skillMappingRepository;
        this.skillEvidenceRepository = skillEvidenceRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
        this.candidateSkillLockService = candidateSkillLockService;
    }

    /** Recomputes evidences and scores of one candidate. Returns the number of scored skills. */
    @Transactional(rollbackFor = Exception.class)
    public int recomputeSkills(Long userId) {
        candidateSkillLockService.acquireUserLock(userId);
        OffsetDateTime now = OffsetDateTime.now(clock);

        skillEvidenceRepository.deleteVerifiedBySources(userId, EvidenceSource.EXTERNAL_DERIVED);
        List<SkillEvidence> newEvidences = buildVerifiedEvidences(userId);
        if (!newEvidences.isEmpty()) {
            // Batch-insert evidences because IDENTITY generation disables Hibernate JDBC batching.
            jdbcTemplate.batchUpdate(
                    INSERT_EVIDENCE_SQL,
                    newEvidences.stream()
                            .map(
                                    e ->
                                            new Object[] {
                                                e.getUserId(),
                                                e.getSkillId(),
                                                e.getSource().name(),
                                                e.getSourceRef(),
                                                e.getTitle(),
                                                e.getScore(),
                                                e.getWeight(),
                                                Timestamp.from(e.getRecordedAt().toInstant()),
                                                e.isVerified(),
                                                e.getExternalRecordId()
                                            })
                            .toList(),
                    INSERT_EVIDENCE_TYPES);
        }

        Map<Integer, List<SkillEvidence>> bySkill =
                skillEvidenceRepository.findByUserIdOrderByRecordedAtDesc(userId).stream()
                        .collect(Collectors.groupingBy(SkillEvidence::getSkillId));

        Set<Integer> existingSkillIds =
                new HashSet<>(
                        jdbcTemplate.queryForList(
                                "SELECT skill_id FROM skill_scores WHERE user_id = ?",
                                Integer.class,
                                userId));

        if (!bySkill.isEmpty()) {
            Timestamp updatedAtTs = Timestamp.from(now.toInstant());
            List<Object[]> upsertArgs = new ArrayList<>(bySkill.size());
            for (Map.Entry<Integer, List<SkillEvidence>> entry : bySkill.entrySet()) {
                SkillScore score = new SkillScore(userId, entry.getKey());
                applyScores(score, entry.getValue(), now);
                upsertArgs.add(
                        new Object[] {
                            userId,
                            entry.getKey(),
                            score.getVerifiedScore(),
                            score.getSelfScore(),
                            score.getLevel() == null ? null : score.getLevel().name(),
                            updatedAtTs
                        });
            }
            jdbcTemplate.batchUpdate(UPSERT_SCORE_SQL, upsertArgs);
        }

        List<Object[]> staleArgs =
                existingSkillIds.stream()
                        .filter(skillId -> !bySkill.containsKey(skillId))
                        .map(skillId -> new Object[] {userId, skillId})
                        .toList();
        if (!staleArgs.isEmpty()) {
            jdbcTemplate.batchUpdate(DELETE_STALE_SCORE_SQL, staleArgs);
        }

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
                                true,
                                record.getId()));
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
