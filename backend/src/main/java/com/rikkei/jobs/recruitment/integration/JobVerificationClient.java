package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.company.dto.JobApplicationInfoDto;
import com.rikkei.jobs.company.service.JobQueryService;
import com.rikkei.jobs.recruitment.exception.JobNotEligibleException;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Client for validating JD status and deadline across module boundaries (Rule 14). Enforces rule:
 * "JD phải APPROVED và chưa hết hạn."
 */
@Component
public class JobVerificationClient {

    private final JobQueryService jobQueryService;
    private final Clock clock;

    public JobVerificationClient(JobQueryService jobQueryService, Clock clock) {
        this.jobQueryService = jobQueryService;
        this.clock = clock;
    }

    /** Verifies that the JD exists, is in APPROVED status, and has not passed its deadline. */
    public JobSummaryDto verifyJobEligible(Long jobId) {
        JobSummaryDto job =
                jobQueryService
                        .findJobForApplication(jobId)
                        .map(JobVerificationClient::toSummary)
                        .orElseThrow(
                                () ->
                                        new JobNotEligibleException(
                                                "Vị trí tuyển dụng không tồn tại hoặc không khả dụng."));

        if (!"APPROVED".equalsIgnoreCase(job.status())) {
            throw new JobNotEligibleException(
                    "Vị trí tuyển dụng chưa được phê duyệt (Trạng thái: " + job.status() + ")");
        }

        if (job.deadline() != null && !job.deadline().isAfter(OffsetDateTime.now(clock))) {
            throw new JobNotEligibleException("Vị trí tuyển dụng đã hết hạn nộp hồ sơ ứng tuyển.");
        }

        return job;
    }

    public JobSummaryDto getJobSummary(Long jobId) {
        return jobQueryService
                .findJobForApplication(jobId)
                .map(JobVerificationClient::toSummary)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Không tìm thấy vị trí tuyển dụng."));
    }

    public Map<Long, JobSummaryDto> getJobSummaries(Set<Long> jobIds) {
        if (jobIds == null || jobIds.isEmpty()) {
            return Map.of();
        }
        return jobQueryService.findJobSummariesByIds(jobIds).entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> toSummary(e.getValue())));
    }

    public boolean isOwnedByCompany(Long jobId, Long companyId) {
        return jobQueryService.isJobOwnedByCompany(jobId, companyId);
    }

    private static JobSummaryDto toSummary(JobApplicationInfoDto info) {
        return new JobSummaryDto(
                info.id(),
                info.title(),
                info.companyId(),
                info.companyName(),
                info.status(),
                info.deadline());
    }
}
