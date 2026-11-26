package com.rikkei.jobs.recruitment.service;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.recruitment.dto.ApplicationProcessDetailResponse;
import com.rikkei.jobs.recruitment.dto.CreateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.InterviewRoundResponse;
import com.rikkei.jobs.recruitment.dto.StaffApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.TransitionApplicationRequest;
import com.rikkei.jobs.recruitment.dto.UpdateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;

/**
 * Service contract for the UT-02 recruitment process workflow: application detail, CV snapshot
 * download (Option 2A), strict status transitions, interview rounds, staff oversight, and UT-07
 * offer eligibility hook.
 */
public interface RecruitmentProcessService {

    /**
     * Retrieves full application details for HR of the owning company (404 otherwise) or STAFF
     * (read-only).
     */
    ApplicationProcessDetailResponse getApplicationDetail(
            Long applicationId, UserPrincipal principal);

    /**
     * Option 2A: retrieves the immutable PDF CV snapshot for HR of the owning company (404
     * otherwise) or STAFF (read-only).
     */
    CvSnapshotDownload getApplicationCvSnapshot(Long applicationId, UserPrincipal principal);

    /**
     * Executes a strict UT-02 status transition ({@code SUBMITTED -> SCREENING | REJECTED}, {@code
     * SCREENING -> INTERVIEW | REJECTED}, {@code INTERVIEW -> REJECTED}), persists history, and
     * publishes {@code CandidateTransitionNotificationEvent}.
     */
    ApplicationProcessDetailResponse transitionStatus(
            Long applicationId, UserPrincipal principal, TransitionApplicationRequest request);

    /**
     * Adds an interview round with server-assigned monotonic {@code round_no} when the application
     * is in {@code SCREENING} or {@code INTERVIEW}.
     */
    InterviewRoundResponse addInterviewRound(
            Long applicationId, UserPrincipal principal, CreateInterviewRoundRequest request);

    /**
     * Updates result, score, and note for an interview round when the application is in {@code
     * INTERVIEW} status.
     */
    InterviewRoundResponse updateInterviewRound(
            Long applicationId,
            Long roundId,
            UserPrincipal principal,
            UpdateInterviewRoundRequest request);

    /**
     * UT-07 hook point: returns {@code true} only when the application is in {@code INTERVIEW}, has
     * at least one interview round, no round is {@code PENDING}, and the final round (highest
     * {@code roundNo}) has result {@code PASS}. UT-07 must invoke this check before transitioning
     * {@code INTERVIEW -> OFFER}.
     */
    boolean isOfferAllowed(Long applicationId);

    /**
     * Retrieves paginated applications across companies for STAFF oversight with optional filters
     * and 1-based pagination ({@code page >= 1}, default 20, max 100).
     */
    PageResponse<StaffApplicationSummaryResponse> getStaffApplications(
            Long companyId, Long jobId, ApplicationStatus status, int page, int size);
}
