package com.rikkei.jobs.company.service.impl;

import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.company.dto.CreateJobRequest;
import com.rikkei.jobs.company.dto.JobDescriptionResponse;
import com.rikkei.jobs.company.dto.JobOwnershipResponse;
import com.rikkei.jobs.company.dto.JobPageResponse;
import com.rikkei.jobs.company.model.Company;
import com.rikkei.jobs.company.model.JobDescription;
import com.rikkei.jobs.company.model.JobStatus;
import com.rikkei.jobs.company.repository.CompanyRepository;
import com.rikkei.jobs.company.repository.JobDescriptionRepository;
import com.rikkei.jobs.company.service.CompanyJobService;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CompanyJobServiceImpl implements CompanyJobService {

    private final CompanyRepository companyRepository;
    private final JobDescriptionRepository jobDescriptionRepository;

    public CompanyJobServiceImpl(
            CompanyRepository companyRepository,
            JobDescriptionRepository jobDescriptionRepository) {
        this.companyRepository = companyRepository;
        this.jobDescriptionRepository = jobDescriptionRepository;
    }

    @Override
    public JobPageResponse listApprovedJobs(int page, int size) {
        PageRequest pageable = pageRequest(page, size);
        Page<JobDescription> jobs =
                jobDescriptionRepository.findByStatusAndDeadlineAfterOrderByCreatedAtDesc(
                        JobStatus.APPROVED, OffsetDateTime.now(), pageable);
        return toPageResponse(jobs, page, size);
    }

    @Override
    public JobPageResponse listJobsOwnedByHr(Long hrUserId, int page, int size) {
        PageRequest pageable = pageRequest(page, size);
        return companyRepository
                .findByHrOwnerUserId(hrUserId)
                .map(
                        company ->
                                toPageResponse(
                                        jobDescriptionRepository
                                                .findByCompanyIdOrderByCreatedAtDesc(
                                                        company.getId(), pageable),
                                        page,
                                        size))
                .orElseGet(() -> new JobPageResponse(java.util.List.of(), page, size, 0, 0));
    }

    @Override
    @Transactional
    public JobDescriptionResponse createJob(Long hrUserId, CreateJobRequest request) {
        Company company =
                companyRepository
                        .findByHrOwnerUserId(hrUserId)
                        .orElseGet(
                                () ->
                                        companyRepository.save(
                                                new Company(
                                                        request.companyName().trim(), hrUserId)));

        if (!company.getName().equalsIgnoreCase(request.companyName().trim())) {
            throw new ConflictException(
                    "COMPANY_NAME_MISMATCH",
                    "Tên doanh nghiệp không khớp với hồ sơ doanh nghiệp của tài khoản HR.");
        }

        JobDescription job =
                new JobDescription(
                        company.getId(),
                        request.title().trim(),
                        request.description().trim(),
                        request.location().trim(),
                        request.employmentType().trim(),
                        request.salaryRange() == null ? null : request.salaryRange().trim(),
                        JobStatus.PENDING_APPROVAL,
                        request.deadline());
        JobDescription saved = jobDescriptionRepository.save(job);
        return toResponse(saved, company);
    }

    @Override
    public JobDescriptionResponse findJobById(Long jobId) {
        JobDescription job =
                jobDescriptionRepository
                        .findById(jobId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy vị trí tuyển dụng."));
        Company company =
                companyRepository
                        .findById(job.getCompanyId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy doanh nghiệp của vị trí tuyển dụng."));
        return toResponse(job, company);
    }

    @Override
    public JobOwnershipResponse verifyJobOwnership(Long jobId, Long hrUserId) {
        JobDescription job =
                jobDescriptionRepository
                        .findById(jobId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy vị trí tuyển dụng."));
        Company company =
                companyRepository
                        .findById(job.getCompanyId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy doanh nghiệp của vị trí tuyển dụng."));
        return new JobOwnershipResponse(company.getHrOwnerUserId().equals(hrUserId));
    }

    @Override
    @Transactional
    public JobDescriptionResponse updateJobStatus(Long jobId, JobStatus status) {
        JobDescription job =
                jobDescriptionRepository
                        .findById(jobId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy vị trí tuyển dụng."));

        boolean validTransition =
                (job.getStatus() == JobStatus.PENDING_APPROVAL && status == JobStatus.APPROVED)
                        || (job.getStatus() == JobStatus.APPROVED && status == JobStatus.CLOSED);
        if (!validTransition) {
            throw new ConflictException(
                    "INVALID_JOB_STATUS_TRANSITION",
                    "Không thể chuyển trạng thái vị trí tuyển dụng theo yêu cầu.");
        }

        job.setStatus(status);
        Company company =
                companyRepository
                        .findById(job.getCompanyId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy doanh nghiệp của vị trí tuyển dụng."));
        return toResponse(jobDescriptionRepository.save(job), company);
    }

    private PageRequest pageRequest(int page, int size) {
        return PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private JobPageResponse toPageResponse(Page<JobDescription> jobs, int page, int size) {
        Map<Long, Company> companies =
                companyRepository
                        .findAllById(
                                jobs.getContent().stream()
                                        .map(JobDescription::getCompanyId)
                                        .distinct()
                                        .toList())
                        .stream()
                        .collect(Collectors.toMap(Company::getId, Function.identity()));
        return new JobPageResponse(
                jobs.getContent().stream()
                        .map(job -> toResponse(job, companies.get(job.getCompanyId())))
                        .toList(),
                page,
                size,
                jobs.getTotalElements(),
                jobs.getTotalPages());
    }

    private JobDescriptionResponse toResponse(JobDescription job, Company company) {
        return new JobDescriptionResponse(
                job.getId(),
                job.getTitle(),
                job.getDescription(),
                company.getName(),
                job.getLocation(),
                job.getEmploymentType(),
                job.getSalaryRange(),
                job.getStatus(),
                job.getDeadline(),
                job.getCreatedAt(),
                job.getUpdatedAt());
    }
}
