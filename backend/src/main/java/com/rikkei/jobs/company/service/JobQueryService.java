package com.rikkei.jobs.company.service;

import com.rikkei.jobs.assessment.dto.SkillDto;
import com.rikkei.jobs.assessment.service.SkillCatalogService;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.company.dto.JobDetailDto;
import com.rikkei.jobs.company.dto.JobSkillRequirementDto;
import com.rikkei.jobs.company.model.Job;
import com.rikkei.jobs.company.model.JobSkill;
import com.rikkei.jobs.company.repository.JobRepository;
import com.rikkei.jobs.company.repository.JobSkillRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Candidate-facing reads of published job descriptions. */
@Service
public class JobQueryService {

    private static final String APPROVED = "APPROVED";
    private static final String NOT_FOUND_MESSAGE = "Không tìm thấy JD đang tuyển dụng";

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

        List<JobSkillRequirementDto> requirements =
                jobSkills.stream()
                        .map(
                                jobSkill -> {
                                    SkillDto skill = skills.get(jobSkill.getSkillCode());
                                    String skillName =
                                            skill != null ? skill.name() : jobSkill.getSkillCode();
                                    return new JobSkillRequirementDto(
                                            jobSkill.getSkillCode(),
                                            skillName,
                                            jobSkill.getRequiredLevel(),
                                            Boolean.TRUE.equals(jobSkill.getMandatory()));
                                })
                        .toList();

        return new JobDetailDto(
                job.getId(),
                job.getTitle(),
                job.getCompanyName(),
                job.getLocation(),
                job.getSalaryRange(),
                job.getDeadline(),
                job.getDescription(),
                requirements);
    }
}
