package com.example.recruitment.service;

import com.example.recruitment.dto.request.JobRequest;
import com.example.recruitment.dto.response.JobResponse;
import com.example.recruitment.dto.response.PageResponse;
import com.example.recruitment.entity.JobStatus;
import org.springframework.data.domain.Pageable;

public interface JobService {
    JobResponse createJob(JobRequest request);
    JobResponse getJobById(Long id);
    PageResponse<JobResponse> getJobs(String keyword, String location, JobStatus status, Pageable pageable);
    JobResponse updateJob(Long id, JobRequest request);
    void deleteJob(Long id);
}
