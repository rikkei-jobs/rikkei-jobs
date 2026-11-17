package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.assessment.dto.SkillDto;
import com.rikkei.jobs.assessment.service.SkillCatalogService;
import com.rikkei.jobs.candidate.dto.ChooseTargetRequest;
import com.rikkei.jobs.candidate.dto.GapAnalysisResponse;
import com.rikkei.jobs.candidate.dto.GapItemDto;
import com.rikkei.jobs.candidate.dto.GapTargetDto;
import com.rikkei.jobs.candidate.dto.TargetPositionDto;
import com.rikkei.jobs.candidate.model.CandidateTarget;
import com.rikkei.jobs.candidate.model.GapResult;
import com.rikkei.jobs.candidate.model.GapTargetType;
import com.rikkei.jobs.candidate.model.PositionSkill;
import com.rikkei.jobs.candidate.model.SkillScore;
import com.rikkei.jobs.candidate.model.TargetPosition;
import com.rikkei.jobs.candidate.repository.CandidateTargetRepository;
import com.rikkei.jobs.candidate.repository.GapResultRepository;
import com.rikkei.jobs.candidate.repository.PositionSkillRepository;
import com.rikkei.jobs.candidate.repository.SkillScoreRepository;
import com.rikkei.jobs.candidate.repository.TargetPositionRepository;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.company.dto.JobDetailDto;
import com.rikkei.jobs.company.dto.JobSkillRequirementDto;
import com.rikkei.jobs.company.service.JobQueryService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * DT-01: selects the candidate target and computes the verified-skill gap against a target position
 * or a job description.
 */
@Service
public class GapAnalysisService {

    private static final String TARGET_NOT_SELECTED = "Chưa chọn vị trí hoặc JD mục tiêu";
    private static final String POSITION_NOT_FOUND = "Không tìm thấy vị trí mục tiêu";
    private static final String INVALID_TARGET =
            "Chỉ được chọn một mục tiêu: positionId hoặc jobId";

    private final TargetPositionRepository targetPositionRepository;
    private final PositionSkillRepository positionSkillRepository;
    private final CandidateTargetRepository candidateTargetRepository;
    private final GapResultRepository gapResultRepository;
    private final SkillScoreRepository skillScoreRepository;
    private final SkillCatalogService skillCatalogService;
    private final JobQueryService jobQueryService;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    public GapAnalysisService(
            TargetPositionRepository targetPositionRepository,
            PositionSkillRepository positionSkillRepository,
            CandidateTargetRepository candidateTargetRepository,
            GapResultRepository gapResultRepository,
            SkillScoreRepository skillScoreRepository,
            SkillCatalogService skillCatalogService,
            JobQueryService jobQueryService,
            JdbcTemplate jdbcTemplate,
            Clock clock) {
        this.targetPositionRepository = targetPositionRepository;
        this.positionSkillRepository = positionSkillRepository;
        this.candidateTargetRepository = candidateTargetRepository;
        this.gapResultRepository = gapResultRepository;
        this.skillScoreRepository = skillScoreRepository;
        this.skillCatalogService = skillCatalogService;
        this.jobQueryService = jobQueryService;
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    /** All positions a candidate can pick as a target. */
    @Transactional(readOnly = true)
    public List<TargetPositionDto> listTargetPositions() {
        return targetPositionRepository.findAllByOrderByNameAsc().stream()
                .map(
                        position ->
                                new TargetPositionDto(
                                        position.getId(),
                                        position.getCode(),
                                        position.getName(),
                                        position.getDescription()))
                .toList();
    }

    /** Stores exactly one target (position or job) for the candidate. */
    @Transactional
    public GapTargetDto chooseTarget(Long userId, ChooseTargetRequest request) {
        boolean hasPosition = request.positionId() != null;
        boolean hasJob = request.jobId() != null;
        if (hasPosition == hasJob) {
            throw new ValidationException(INVALID_TARGET);
        }

        lockCandidate(userId);
        OffsetDateTime now = OffsetDateTime.now(clock);
        CandidateTarget target =
                candidateTargetRepository
                        .findById(userId)
                        .orElseGet(() -> new CandidateTarget(userId));

        if (hasPosition) {
            TargetPosition position = requirePosition(request.positionId());
            target.choosePosition(position.getId(), now);
        } else {
            JobDetailDto job = jobQueryService.getOpenJob(request.jobId());
            target.chooseJob(job.id(), now);
        }

        candidateTargetRepository.save(target);
        return toTargetDto(target);
    }

    /** Returns the saved target or 404 when the candidate has not chosen one yet. */
    @Transactional(readOnly = true)
    public GapTargetDto getTarget(Long userId) {
        return toTargetDto(requireTarget(userId));
    }

    /**
     * Computes the gap against {@code jobIdOverride} when present, otherwise against the saved
     * target. Deficits are persisted in gap_results; satisfied skills are omitted from the items.
     */
    @Transactional
    public GapAnalysisResponse analyze(Long userId, Long jobIdOverride) {
        lockCandidate(userId);
        ResolvedTarget target =
                jobIdOverride != null
                        ? jobTarget(jobQueryService.getOpenJob(jobIdOverride))
                        : resolveSavedTarget(userId);

        Map<Integer, BigDecimal> verifiedScores =
                skillScoreRepository.findByUserId(userId).stream()
                        .filter(score -> score.getVerifiedScore() != null)
                        .collect(
                                Collectors.toMap(
                                        SkillScore::getSkillId,
                                        SkillScore::getVerifiedScore,
                                        (first, second) -> first));

        GapAnalysisCalculator.Outcome outcome =
                GapAnalysisCalculator.analyze(target.requirements(), verifiedScores);

        OffsetDateTime now = OffsetDateTime.now(clock);
        gapResultRepository.deleteByTarget(userId, target.type(), target.id());
        if (!outcome.missingSkills().isEmpty()) {
            gapResultRepository.saveAll(
                    outcome.missingSkills().stream()
                            .map(
                                    missing ->
                                            new GapResult(
                                                    userId,
                                                    target.type(),
                                                    target.id(),
                                                    missing.skillId(),
                                                    missing.required(),
                                                    missing.current(),
                                                    missing.gap(),
                                                    now))
                            .toList());
        }

        List<GapItemDto> items =
                outcome.missingSkills().stream().map(GapAnalysisService::toItemDto).toList();
        return new GapAnalysisResponse(target.dto(), outcome.readiness(), items);
    }

    private ResolvedTarget resolveSavedTarget(Long userId) {
        CandidateTarget target = requireTarget(userId);
        if (target.getPositionId() != null) {
            return positionTarget(requirePosition(target.getPositionId()));
        }
        return jobTarget(jobQueryService.getOpenJob(target.getJobId()));
    }

    private ResolvedTarget positionTarget(TargetPosition position) {
        List<PositionSkill> positionSkills =
                positionSkillRepository.findByPositionId(position.getId());
        Map<Integer, SkillDto> catalogue =
                skillCatalogService.findByIds(
                        positionSkills.stream().map(PositionSkill::getSkillId).distinct().toList());

        List<GapAnalysisCalculator.Requirement> requirements =
                positionSkills.stream()
                        .map(
                                positionSkill ->
                                        toPositionRequirement(
                                                positionSkill,
                                                catalogue.get(positionSkill.getSkillId())))
                        .sorted(Comparator.comparing(GapAnalysisCalculator.Requirement::skillCode))
                        .toList();

        GapTargetDto dto =
                new GapTargetDto(
                        GapTargetType.POSITION.name(),
                        position.getId(),
                        position.getCode(),
                        position.getName(),
                        position.getDescription());
        return new ResolvedTarget(dto, GapTargetType.POSITION, position.getId(), requirements);
    }

    private ResolvedTarget jobTarget(JobDetailDto job) {
        Map<String, SkillDto> catalogue =
                skillCatalogService.findByCodes(
                        job.requiredSkills().stream()
                                .map(JobSkillRequirementDto::skillCode)
                                .distinct()
                                .toList());

        Map<Integer, GapAnalysisCalculator.Requirement> bySkillId = new LinkedHashMap<>();
        for (JobSkillRequirementDto required : job.requiredSkills()) {
            SkillDto skill = catalogue.get(required.skillCode());
            if (skill == null) {
                continue;
            }
            GapAnalysisCalculator.Requirement requirement =
                    new GapAnalysisCalculator.Requirement(
                            skill.id(),
                            skill.code(),
                            skill.name(),
                            BigDecimal.valueOf(required.requiredLevel()),
                            Boolean.TRUE.equals(required.mandatory()));
            bySkillId.merge(skill.id(), requirement, GapAnalysisService::mergeRequirements);
        }

        List<GapAnalysisCalculator.Requirement> requirements =
                bySkillId.values().stream()
                        .sorted(Comparator.comparing(GapAnalysisCalculator.Requirement::skillCode))
                        .toList();
        GapTargetDto dto =
                new GapTargetDto(
                        GapTargetType.JOB.name(), job.id(), null, job.title(), job.description());
        return new ResolvedTarget(dto, GapTargetType.JOB, job.id(), requirements);
    }

    private static GapAnalysisCalculator.Requirement toPositionRequirement(
            PositionSkill positionSkill, SkillDto skill) {
        String code = skill != null ? skill.code() : "SKILL_" + positionSkill.getSkillId();
        String name = skill != null ? skill.name() : code;
        return new GapAnalysisCalculator.Requirement(
                positionSkill.getSkillId(),
                code,
                name,
                BigDecimal.valueOf(positionSkill.getMinScore()),
                true);
    }

    private static GapAnalysisCalculator.Requirement mergeRequirements(
            GapAnalysisCalculator.Requirement first, GapAnalysisCalculator.Requirement second) {
        return new GapAnalysisCalculator.Requirement(
                first.skillId(),
                first.skillCode(),
                first.skillName(),
                first.required().max(second.required()),
                first.mandatory() || second.mandatory());
    }

    private static GapItemDto toItemDto(GapAnalysisCalculator.MissingSkill missing) {
        return new GapItemDto(
                missing.skillId(),
                missing.skillCode(),
                missing.skillName(),
                missing.required(),
                missing.current(),
                missing.gap(),
                missing.priority());
    }

    /**
     * Serializes target selection and gap recomputation per candidate with a transaction-scoped
     * advisory lock, so concurrent requests cannot race on the gap_results primary key.
     */
    private void lockCandidate(Long userId) {
        jdbcTemplate.query(
                "SELECT pg_advisory_xact_lock(?)",
                statement -> statement.setLong(1, userId),
                (ResultSetExtractor<Void>) resultSet -> null);
    }

    private CandidateTarget requireTarget(Long userId) {
        CandidateTarget target =
                candidateTargetRepository
                        .findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException(TARGET_NOT_SELECTED));
        if (target.getPositionId() == null && target.getJobId() == null) {
            throw new ResourceNotFoundException(TARGET_NOT_SELECTED);
        }
        return target;
    }

    private TargetPosition requirePosition(Long positionId) {
        return targetPositionRepository
                .findById(positionId)
                .orElseThrow(() -> new ResourceNotFoundException(POSITION_NOT_FOUND));
    }

    private GapTargetDto toTargetDto(CandidateTarget target) {
        if (target.getPositionId() != null) {
            return positionTarget(requirePosition(target.getPositionId())).dto();
        }
        return jobTarget(jobQueryService.getOpenJob(target.getJobId())).dto();
    }

    private record ResolvedTarget(
            GapTargetDto dto,
            GapTargetType type,
            Long id,
            List<GapAnalysisCalculator.Requirement> requirements) {}
}
