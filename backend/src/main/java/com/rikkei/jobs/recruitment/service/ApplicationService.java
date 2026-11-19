package com.rikkei.jobs.recruitment.service;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.HrApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.WithdrawApplicationRequest;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;

/** Service interface for candidate job applications and status tracking. */
public interface ApplicationService {

    /**
     * Applies for a job posting using candidate CV. Enforces rules: - JD must be APPROVED and not
     * expired. - Candidate cannot have any existing application for the same job, including
     * terminal states. - Captures immutable PDF snapshot of candidate CV. - Records initial history
     * entry with status SUBMITTED. - Notifies company HR via domain event.
     */
    ApplicationDetailResponse apply(Long jobId, Long candidateUserId, ApplyJobRequest request);

    /** Retrieves all applications submitted by the candidate, optionally filtered by status. */
    PageResponse<ApplicationSummaryResponse> getMyApplications(
            Long candidateUserId, ApplicationStatus status, int page, int size);

    /**
     * Retrieves application details along with full status history. Verifies candidate ownership to
     * prevent IDOR vulnerabilities.
     */
    ApplicationDetailResponse getMyApplicationDetail(Long applicationId, Long candidateUserId);

    /**
     * Withdraws an active application before it reaches OFFER stage. Enforces rules: - Only
     * permissible when status is SUBMITTED, SCREENING, or INTERVIEW. - Blocked if status is OFFER,
     * HIRED, or terminal. - Updates status to WITHDRAWN and logs reason into history.
     */
    ApplicationDetailResponse withdraw(
            Long applicationId, Long candidateUserId, WithdrawApplicationRequest request);

    PageResponse<HrApplicationSummaryResponse> getHrApplications(
            Long jobId, Long hrUserId, int page, int size);

    ApplicationDetailResponse getHrApplicationDetail(Long applicationId, Long jobId, Long hrUserId);

    ApplicationDetailResponse updateStatus(
            Long applicationId,
            Long jobId,
            Long hrUserId,
            ApplicationStatus newStatus,
            String note);

    CvSnapshotDownload getCandidateCvSnapshot(Long applicationId, Long candidateUserId);

    CvSnapshotDownload getHrCvSnapshot(Long applicationId, Long jobId, Long hrUserId);
}
