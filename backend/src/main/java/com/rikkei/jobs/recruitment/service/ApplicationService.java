package com.rikkei.jobs.recruitment.service;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.HrApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.WithdrawApplicationRequest;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;

/**
 * Service interface for candidate job applications and read-only HR views.
 *
 * <p>Re-apply rule: candidates cannot hold more than one open application ({@code SUBMITTED},
 * {@code SCREENING}, {@code INTERVIEW}, {@code OFFER}) for the same JD, but may re-apply after any
 * terminal decision ({@code WITHDRAWN}, {@code REJECTED}, or {@code HIRED}).
 */
public interface ApplicationService {

    ApplicationDetailResponse apply(Long jobId, Long candidateUserId, ApplyJobRequest request);

    PageResponse<ApplicationSummaryResponse> getMyApplications(
            Long candidateUserId, ApplicationStatus status, int page, int size);

    ApplicationDetailResponse getMyApplicationDetail(Long applicationId, Long candidateUserId);

    ApplicationDetailResponse withdraw(
            Long applicationId, Long candidateUserId, WithdrawApplicationRequest request);

    PageResponse<HrApplicationSummaryResponse> getHrApplications(
            Long jobId, Long hrCompanyId, ApplicationStatus status, int page, int size);

    ApplicationDetailResponse getHrApplicationDetail(
            Long applicationId, Long jobId, Long hrCompanyId);

    CvSnapshotDownload getCandidateCvSnapshot(Long applicationId, Long candidateUserId);

    CvSnapshotDownload getHrCvSnapshot(Long applicationId, Long jobId, Long hrCompanyId);
}
