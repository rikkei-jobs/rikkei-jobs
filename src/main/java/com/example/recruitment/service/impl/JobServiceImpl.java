package com.example.recruitment.service.impl;

import com.example.recruitment.dto.request.JobRequest;
import com.example.recruitment.dto.response.JobResponse;
import com.example.recruitment.dto.response.PageResponse;
import com.example.recruitment.entity.Company;
import com.example.recruitment.entity.Job;
import com.example.recruitment.entity.JobStatus;
import com.example.recruitment.exception.ResourceNotFoundException;
import com.example.recruitment.repository.CompanyRepository;
import com.example.recruitment.repository.JobRepository;
import com.example.recruitment.repository.specification.JobSpecification;
import com.example.recruitment.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class JobServiceImpl implements JobService {

    private final JobRepository jobRepository;
    private final CompanyRepository companyRepository;

    @Override
    public JobResponse createJob(JobRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty với ID: " + request.getCompanyId()));

        Job job = Job.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .salaryMin(request.getSalaryMin())
                .salaryMax(request.getSalaryMax())
                .location(request.getLocation())
                .status(request.getStatus() != null ? request.getStatus() : JobStatus.OPEN)
                .company(company)
                .build();

        Job saved = jobRepository.save(job);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public JobResponse getJobById(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công việc với ID: " + id));
        return mapToResponse(job);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<JobResponse> getJobs(String keyword, String location, JobStatus status, Pageable pageable) {
        Specification<Job> spec = JobSpecification.filterJobs(keyword, location, status);
        Page<Job> jobPage = jobRepository.findAll(spec, pageable);
        Page<JobResponse> responsePage = jobPage.map(this::mapToResponse);
        return PageResponse.from(responsePage);
    }

    @Override
    public JobResponse updateJob(Long id, JobRequest request) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công việc với ID: " + id));

        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty với ID: " + request.getCompanyId()));

        job.setTitle(request.getTitle());
        job.setDescription(request.getDescription());
        job.setSalaryMin(request.getSalaryMin());
        job.setSalaryMax(request.getSalaryMax());
        job.setLocation(request.getLocation());
        if (request.getStatus() != null) {
            job.setStatus(request.getStatus());
        }
        job.setCompany(company);

        Job updated = jobRepository.save(job);
        return mapToResponse(updated);
    }

    @Override
    public void deleteJob(Long id) {
        if (!jobRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy công việc với ID: " + id);
        }
        jobRepository.deleteById(id);
    }

    private JobResponse mapToResponse(Job job) {
        return JobResponse.builder()
                .id(job.getId())
                .title(job.getTitle())
                .description(job.getDescription())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .location(job.getLocation())
                .status(job.getStatus())
                .companyId(job.getCompany() != null ? job.getCompany().getId() : null)
                .companyName(job.getCompany() != null ? job.getCompany().getName() : null)
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }
}
