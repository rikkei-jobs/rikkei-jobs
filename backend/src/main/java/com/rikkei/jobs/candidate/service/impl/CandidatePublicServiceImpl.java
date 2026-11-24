package com.rikkei.jobs.candidate.service.impl;

import com.rikkei.jobs.assessment.dto.SkillDto;
import com.rikkei.jobs.assessment.service.SkillCatalogService;
import com.rikkei.jobs.candidate.dto.CandidateSkillScoreDto;
import com.rikkei.jobs.candidate.dto.MentorSkillEvidenceDto;
import com.rikkei.jobs.candidate.dto.PmInternshipResultCommand;
import com.rikkei.jobs.candidate.model.EvidenceSource;
import com.rikkei.jobs.candidate.model.ExternalRecord;
import com.rikkei.jobs.candidate.model.ExternalSource;
import com.rikkei.jobs.candidate.model.SkillEvidence;
import com.rikkei.jobs.candidate.model.SkillScore;
import com.rikkei.jobs.candidate.repository.CandidateProfileRepository;
import com.rikkei.jobs.candidate.repository.ExternalRecordRepository;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import com.rikkei.jobs.candidate.repository.SkillScoreRepository;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import com.rikkei.jobs.common.exception.ValidationException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Implementation of CandidatePublicService for cross-module boundary compliance (Rule 14). */
@Service
public class CandidatePublicServiceImpl implements CandidatePublicService {

    private static final Logger log = LoggerFactory.getLogger(CandidatePublicServiceImpl.class);

    private static final int MAX_SOURCE_CODE_LENGTH = 100;
    private static final int MAX_TITLE_LENGTH = 255;
    private static final BigDecimal MIN_SCORE = new BigDecimal("0.00");
    private static final BigDecimal MAX_SCORE = new BigDecimal("100.00");

    private final SkillEvidenceRepository skillEvidenceRepository;
    private final SkillRecomputeService skillRecomputeService;
    private final CandidateProfileRepository candidateProfileRepository;
    private final SkillScoreRepository skillScoreRepository;
    private final SkillCatalogService skillCatalogService;
    private final ExternalRecordRepository externalRecordRepository;
    private final Clock clock;

    public CandidatePublicServiceImpl(
            SkillEvidenceRepository skillEvidenceRepository,
            SkillRecomputeService skillRecomputeService,
            CandidateProfileRepository candidateProfileRepository,
            SkillScoreRepository skillScoreRepository,
            SkillCatalogService skillCatalogService,
            ExternalRecordRepository externalRecordRepository,
            Clock clock) {
        this.skillEvidenceRepository = skillEvidenceRepository;
        this.skillRecomputeService = skillRecomputeService;
        this.candidateProfileRepository = candidateProfileRepository;
        this.skillScoreRepository = skillScoreRepository;
        this.skillCatalogService = skillCatalogService;
        this.externalRecordRepository = externalRecordRepository;
        this.clock = clock;
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

    /**
     * Records PM external records idempotently by {@code (candidateUserId, ExternalSource.PM,
     * batchId)} and recomputes verified skills when the record is inserted, updated, or
     * deduplicated. Previously synced batches omitted from {@code results} are retained locally
     * rather than deleted.
     *
     * <p><b>Skip invariant:</b> When a single matching {@link ExternalRecord} already exists with
     * identical normalized {@code title} and scaled {@code score}, both the {@code
     * external_records} write and {@link SkillRecomputeService#recomputeSkills} are skipped. This
     * is safe because: (1) {@code skill_mappings} has no runtime mutation path (Flyway dev seed
     * only), (2) {@code SkillScoreCalculator} is pure and immutable, (3) mentor evaluations trigger
     * {@link #recomputeCandidateSkills} directly upon submission, and (4) preserving {@code
     * recordedAt} avoids resetting evidence age relative to the 1-year {@code timeFactor}
     * threshold; {@code POST /api/v1/profiles/me/skills/recompute} remains available for explicit
     * recalculation across the 1-year boundary.
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recordPmInternshipResults(
            Long candidateUserId, List<PmInternshipResultCommand> results) {
        if (candidateUserId == null || candidateUserId <= 0) {
            throw new ValidationException("User ID không hợp lệ");
        }
        if (results == null || results.isEmpty()) {
            return;
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        boolean changed = false;

        for (PmInternshipResultCommand command : results) {
            if (command == null) {
                throw new ValidationException("Dữ liệu kết quả thực tập không hợp lệ");
            }
            if (command.batchId() == null || command.batchId().isBlank()) {
                throw new ValidationException("Mã đợt thực tập không được để trống");
            }
            String normalizedBatchId = command.batchId().trim();
            if (normalizedBatchId.length() > MAX_SOURCE_CODE_LENGTH) {
                throw new ValidationException("Mã đợt thực tập vượt quá 100 ký tự");
            }

            if (command.topicName() == null
                    || command.topicName().isBlank()
                    || command.finalScore() == null) {
                continue;
            }

            String normalizedTitle = command.topicName().trim();
            if (normalizedTitle.length() > MAX_TITLE_LENGTH) {
                throw new ValidationException("Tên đề tài thực tập vượt quá 255 ký tự");
            }

            BigDecimal scaledScore =
                    command.finalScore().multiply(BigDecimal.TEN).setScale(2, RoundingMode.HALF_UP);
            if (scaledScore.compareTo(MIN_SCORE) < 0) {
                log.warn(
                        "Clamping negative PM internship score for candidateUserId={} to 0.00",
                        candidateUserId);
                scaledScore = MIN_SCORE;
            } else if (scaledScore.compareTo(MAX_SCORE) > 0) {
                log.warn(
                        "Clamping excessive PM internship score for candidateUserId={} to 100.00",
                        candidateUserId);
                scaledScore = MAX_SCORE;
            }

            List<ExternalRecord> matches =
                    externalRecordRepository
                            .findByUserIdAndSourceAndSourceCodeOrderByRecordedAtDesc(
                                    candidateUserId, ExternalSource.PM, normalizedBatchId);

            if (matches.isEmpty()) {
                externalRecordRepository.save(
                        new ExternalRecord(
                                ExternalSource.PM,
                                normalizedBatchId,
                                normalizedTitle,
                                scaledScore,
                                now,
                                candidateUserId));
                changed = true;
            } else {
                ExternalRecord primary = matches.getFirst();
                boolean titleChanged = !Objects.equals(primary.getTitle(), normalizedTitle);
                boolean scoreChanged =
                        primary.getScore() == null
                                || primary.getScore().compareTo(scaledScore) != 0;
                // Skip write and full skill recompute when PM result is unchanged and single.
                if (titleChanged || scoreChanged) {
                    primary.updateResult(normalizedTitle, scaledScore, now);
                    externalRecordRepository.save(primary);
                    changed = true;
                }
                if (matches.size() > 1) {
                    externalRecordRepository.deleteAll(matches.subList(1, matches.size()));
                    changed = true;
                }
            }
        }

        if (changed) {
            skillRecomputeService.recomputeSkills(candidateUserId);
        }
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
