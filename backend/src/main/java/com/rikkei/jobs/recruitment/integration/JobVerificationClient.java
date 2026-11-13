package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.company.dto.JobDescriptionResponse;
import com.rikkei.jobs.company.service.CompanyJobService;
import com.rikkei.jobs.recruitment.exception.JobNotEligibleException;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Component;

/**
 * Client for validating JD status and deadline across module boundaries (Rule 14). Enforces rule:
 * "JD phải APPROVED và chưa hết hạn."
 */
@Component
public class JobVerificationClient {

    private final CompanyJobService companyJobService;

    public JobVerificationClient(CompanyJobService companyJobService) {
        this.companyJobService = companyJobService;
    }

    /** Verifies that the JD exists, is in APPROVED status, and has not passed its deadline. */
    public JobSummaryDto verifyJobEligible(Long jobId) {
        JobSummaryDto job = getJobSummary(jobId);

        if (!"APPROVED".equalsIgnoreCase(job.status())) {
            throw new JobNotEligibleException(
                    "Vị trí tuyển dụng chưa được phê duyệt (Trạng thái: " + job.status() + ")");
        }

        if (job.deadline() != null && job.deadline().isBefore(OffsetDateTime.now())) {
            throw new JobNotEligibleException("Vị trí tuyển dụng đã hết hạn nộp hồ sơ ứng tuyển.");
        }

        return job;
    }

    public JobSummaryDto getJobSummary(Long jobId) {
        JobDescriptionResponse job = companyJobService.findJobById(jobId);
        return new JobSummaryDto(
                job.id(),
                job.title(),
                job.companyName(),
                job.status().name(),
                job.deadline(),
                null);
    }

    public boolean isOwnedByHr(Long jobId, Long hrUserId) {
        return companyJobService.verifyJobOwnership(jobId, hrUserId).ownedByHr();
    }
}
