package com.rikkei.jobs.company.service;

import com.rikkei.jobs.company.dto.CreateJobRequest;
import com.rikkei.jobs.company.dto.JobDescriptionResponse;
import com.rikkei.jobs.company.dto.JobOwnershipResponse;
import com.rikkei.jobs.company.dto.JobPageResponse;
import com.rikkei.jobs.company.model.JobStatus;

public interface CompanyJobService {

    JobPageResponse listApprovedJobs(int page, int size);

    JobPageResponse listJobsOwnedByHr(Long hrUserId, int page, int size);

    JobDescriptionResponse createJob(Long hrUserId, CreateJobRequest request);

    JobDescriptionResponse findJobById(Long jobId);

    JobOwnershipResponse verifyJobOwnership(Long jobId, Long hrUserId);

    JobDescriptionResponse updateJobStatus(Long jobId, JobStatus status);
}
