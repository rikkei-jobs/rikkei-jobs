package com.rikkei.jobs.company.service;

import com.rikkei.jobs.assessment.dto.SkillDto;
import com.rikkei.jobs.assessment.service.SkillCatalogService;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.company.dto.HrJobSummaryDto;
import com.rikkei.jobs.company.dto.JobApplicationInfoDto;
import com.rikkei.jobs.company.dto.JobDetailDto;
import com.rikkei.jobs.company.dto.JobSkillRequirementDto;
import com.rikkei.jobs.company.dto.OpenJobDto;
import com.rikkei.jobs.company.model.Job;
import com.rikkei.jobs.company.model.JobSkill;
import com.rikkei.jobs.company.repository.JobRepository;
import com.rikkei.jobs.company.repository.JobSkillRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Public read contract of the company module for published job descriptions, exposed to other
 * modules according to Rule 14 boundaries. Entities never leave this module.
 */
@Service
public class JobQueryService {

    private static final String APPROVED = "APPROVED";
    private static final String EXPIRED = "EXPIRED";
    private static final String NOT_FOUND_MESSAGE = "Không tìm thấy JD đang tuyển dụng";
    private static final int MIN_PAGE = 1;
    private static final int MIN_PAGE_SIZE = 1;
    private static final int MAX_PAGE_SIZE = 100;
    private static final Sort HR_JOB_SORT =
            Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));

    private final JobRepository jobRepository;
    private final JobSkillRepository jobSkillRepository;
    private final SkillCatalogService skillCatalogService;
    private final Clock clock;

    public JobQueryService(
            JobRepository jobRepository,
            JobSkillRepository jobSkillRepository,
            SkillCatalogService skillCatalogService,
            Clock clock) {
        this.jobRepository = jobRepository;
        this.jobSkillRepository = jobSkillRepository;
        this.skillCatalogService = skillCatalogService;
        this.clock = clock;
    }

    /** Returns an APPROVED job whose deadline has not passed, or throws 404 NOT_FOUND. */
    @Transactional(readOnly = true)
    public JobDetailDto getOpenJob(Long jobId) {
        Job job =
                jobRepository
                        .findById(jobId)
                        .filter(candidate -> APPROVED.equals(candidate.getStatus()))
                        .filter(
                                candidate ->
                                        candidate.getDeadline().isAfter(OffsetDateTime.now(clock)))
                        .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));

        List<JobSkill> jobSkills = jobSkillRepository.findByJobId(job.getId());
        Map<String, SkillDto> skills =
                skillCatalogService.findByCodes(
                        jobSkills.stream().map(JobSkill::getSkillCode).distinct().toList());

        return new JobDetailDto(
                job.getId(),
                job.getTitle(),
                job.getCompanyName(),
                job.getLocation(),
                job.getSalaryRange(),
                job.getDeadline(),
                job.getDescription(),
                toRequirements(jobSkills, skills));
    }

    /** Returns every APPROVED job whose deadline has not passed, with resolved skill names. */
    @Transactional(readOnly = true)
    public List<OpenJobDto> findOpenJobs() {
        List<Job> jobs =
                jobRepository.findByStatusAndDeadlineAfter(APPROVED, OffsetDateTime.now(clock));
        if (jobs.isEmpty()) {
            return List.of();
        }

        List<Long> jobIds = jobs.stream().map(Job::getId).toList();
        Map<Long, List<JobSkill>> skillsByJobId =
                jobSkillRepository.findByJobIdIn(jobIds).stream()
                        .collect(Collectors.groupingBy(JobSkill::getJobId));

        Set<String> skillCodes =
                skillsByJobId.values().stream()
                        .flatMap(Collection::stream)
                        .map(JobSkill::getSkillCode)
                        .collect(Collectors.toSet());
        Map<String, SkillDto> catalogue = skillCatalogService.findByCodes(skillCodes);

        return jobs.stream()
                .map(
                        job ->
                                new OpenJobDto(
                                        job.getId(),
                                        job.getTitle(),
                                        job.getCompanyName(),
                                        job.getLocation(),
                                        job.getSalaryRange(),
                                        job.getDeadline(),
                                        toRequirements(
                                                skillsByJobId.getOrDefault(job.getId(), List.of()),
                                                catalogue)))
                .toList();
    }

    /** Returns the most recent update timestamp of the job catalogue, or null when empty. */
    @Transactional(readOnly = true)
    public OffsetDateTime getLatestUpdateAt() {
        return jobRepository.findLatestUpdatedAt().orElse(null);
    }

    /** Returns job summary and eligibility info for recruitment application checks. */
    @Transactional(readOnly = true)
    public Optional<JobApplicationInfoDto> findJobForApplication(Long jobId) {
        if (jobId == null || jobId <= 0) {
            return Optional.empty();
        }
        return jobRepository.findById(jobId).map(JobQueryService::toApplicationInfo);
    }

    /** Batch-fetches job summaries for a page of applications (prevents N+1 queries). */
    @Transactional(readOnly = true)
    public Map<Long, JobApplicationInfoDto> findJobSummariesByIds(Set<Long> jobIds) {
        if (jobIds == null || jobIds.isEmpty()) {
            return Map.of();
        }
        return jobRepository.findApplicationInfoByIds(jobIds).stream()
                .collect(
                        Collectors.toMap(
                                JobApplicationInfoDto::id, dto -> dto, (first, second) -> first));
    }

    /** Checks whether the given job belongs to the specified company. */
    @Transactional(readOnly = true)
    public boolean isJobOwnedByCompany(Long jobId, Long companyId) {
        if (jobId == null || jobId <= 0 || companyId == null || companyId <= 0) {
            return false;
        }
        return jobRepository
                .findById(jobId)
                .map(job -> Objects.equals(companyId, job.getCompanyId()))
                .orElse(false);
    }

    /**
     * Returns a paginated, stably sorted summary list of jobs owned by {@code companyId} (Option 1A
     * for UT-02; DN-04 will extend this endpoint later).
     */
    @Transactional(readOnly = true)
    public PageResponse<HrJobSummaryDto> findJobsByCompanyId(Long companyId, int page, int size) {
        if (page < MIN_PAGE || size < MIN_PAGE_SIZE || size > MAX_PAGE_SIZE) {
            throw new ValidationException(
                    "Tham số phân trang không hợp lệ (page >= 1, 1 <= size <= 100)");
        }
        if (companyId == null || companyId <= 0) {
            throw new ResourceNotFoundException("Tài khoản chưa được gán doanh nghiệp");
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        Page<Job> jobs =
                jobRepository.findByCompanyId(
                        companyId, PageRequest.of(page - 1, size, HR_JOB_SORT));
        List<HrJobSummaryDto> items =
                jobs.getContent().stream().map(job -> toHrJobSummary(job, now)).toList();
        return new PageResponse<>(items, page, size, jobs.getTotalElements(), jobs.getTotalPages());
    }

    /** Returns all job IDs belonging to {@code companyId}. */
    @Transactional(readOnly = true)
    public Set<Long> findJobIdsByCompanyId(Long companyId) {
        if (companyId == null || companyId <= 0) {
            return Set.of();
        }
        return jobRepository.findIdsByCompanyId(companyId);
    }

    /**
     * Returns required skills for a job regardless of open/deadline state (used for match score
     * calculation on existing applications).
     */
    @Transactional(readOnly = true)
    public List<JobSkillRequirementDto> getJobRequiredSkills(Long jobId) {
        if (jobId == null || jobId <= 0) {
            return List.of();
        }
        List<JobSkill> jobSkills = jobSkillRepository.findByJobId(jobId);
        if (jobSkills.isEmpty()) {
            return List.of();
        }
        Map<String, SkillDto> catalogue =
                skillCatalogService.findByCodes(
                        jobSkills.stream().map(JobSkill::getSkillCode).distinct().toList());
        return toRequirements(jobSkills, catalogue);
    }

    /** Batch-fetches required skills for a set of job IDs in O(1) queries (prevents N+1). */
    @Transactional(readOnly = true)
    public Map<Long, List<JobSkillRequirementDto>> getJobRequiredSkillsByJobIds(Set<Long> jobIds) {
        if (jobIds == null || jobIds.isEmpty()) {
            return Map.of();
        }
        List<JobSkill> allSkills = jobSkillRepository.findByJobIdIn(jobIds);
        if (allSkills.isEmpty()) {
            return Map.of();
        }
        Set<String> skillCodes =
                allSkills.stream().map(JobSkill::getSkillCode).collect(Collectors.toSet());
        Map<String, SkillDto> catalogue = skillCatalogService.findByCodes(skillCodes);
        return allSkills.stream()
                .collect(
                        Collectors.groupingBy(
                                JobSkill::getJobId,
                                Collectors.collectingAndThen(
                                        Collectors.toList(),
                                        list -> toRequirements(list, catalogue))));
    }

    // Use the exact UT-01 expiry boundary (!deadline.isAfter(now)) so HR listing and candidate
    // application eligibility share one authoritative Clock-driven state.
    private static HrJobSummaryDto toHrJobSummary(Job job, OffsetDateTime now) {
        String rawStatus = job.getStatus();
        boolean deadlinePassed = job.getDeadline() != null && !job.getDeadline().isAfter(now);
        boolean expired =
                EXPIRED.equalsIgnoreCase(rawStatus)
                        || (APPROVED.equalsIgnoreCase(rawStatus) && deadlinePassed);
        String effectiveStatus = expired ? EXPIRED : rawStatus;
        return new HrJobSummaryDto(
                job.getId(),
                job.getTitle(),
                job.getCompanyId(),
                job.getCompanyName(),
                effectiveStatus,
                expired,
                job.getDeadline(),
                job.getCreatedAt(),
                job.getUpdatedAt());
    }

    private static JobApplicationInfoDto toApplicationInfo(Job job) {
        return new JobApplicationInfoDto(
                job.getId(),
                job.getTitle(),
                job.getCompanyId(),
                job.getCompanyName(),
                job.getStatus(),
                job.getDeadline());
    }

    private static List<JobSkillRequirementDto> toRequirements(
            List<JobSkill> jobSkills, Map<String, SkillDto> catalogue) {
        return jobSkills.stream()
                .map(
                        jobSkill -> {
                            SkillDto skill = catalogue.get(jobSkill.getSkillCode());
                            String skillName =
                                    skill != null ? skill.name() : jobSkill.getSkillCode();
                            return new JobSkillRequirementDto(
                                    jobSkill.getSkillCode(),
                                    skillName,
                                    jobSkill.getRequiredLevel(),
                                    Boolean.TRUE.equals(jobSkill.getMandatory()));
                        })
                .toList();
    }
}
