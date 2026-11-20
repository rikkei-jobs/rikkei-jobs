package com.rikkei.jobs.recruitment.service;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationProcessDetailResponse;
import com.rikkei.jobs.recruitment.dto.CreateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.dto.InterviewRoundResponse;
import com.rikkei.jobs.recruitment.dto.StaffApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.TransitionApplicationRequest;
import com.rikkei.jobs.recruitment.dto.UpdateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;

/**
 * Service contract for the recruitment process management workflow (UT-02). Handles application
 * details, strict state transitions, interview round lifecycle, and Staff/HR application
 * monitoring.
 */
public interface RecruitmentProcessService {

    /** Retrieves full application details for HR of the owning company or STAFF. */
    ApplicationProcessDetailResponse getApplicationDetail(
            Long applicationId, Long actorUserId, boolean isStaff);

    /** Executes a strict status transition according to UT-02 state transition matrix. */
    ApplicationProcessDetailResponse transitionStatus(
            Long applicationId, Long hrUserId, TransitionApplicationRequest request);

    /** Adds an interview round to the application. */
    InterviewRoundResponse addInterviewRound(
            Long applicationId, Long hrUserId, CreateInterviewRoundRequest request);

    /** Updates result, score, and note for an interview round. */
    InterviewRoundResponse updateInterviewRound(
            Long applicationId, Long roundId, Long hrUserId, UpdateInterviewRoundRequest request);

    /** Retrieves paginated applications across the system with filtering for STAFF. */
    PageResponse<StaffApplicationSummaryResponse> getStaffApplications(
            Long companyId, Long jobId, ApplicationStatus status, int page, int size);

    /** Retrieves paginated applications belonging to the HR user's company. */
    PageResponse<StaffApplicationSummaryResponse> getHrCompanyApplications(
            Long hrUserId, Long jobId, ApplicationStatus status, int page, int size);
}
