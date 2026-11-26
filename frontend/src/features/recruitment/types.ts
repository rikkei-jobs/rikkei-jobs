export type ApplicationStatus =
  | 'SUBMITTED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface ApplicationSummaryResponse {
  readonly id: number;
  readonly jobId: number;
  readonly jobTitle: string;
  readonly companyName: string;
  readonly status: ApplicationStatus;
  readonly canWithdraw: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApplicationStatusHistoryResponse {
  readonly id: number;
  readonly fromStatus: ApplicationStatus | null;
  readonly toStatus: ApplicationStatus;
  readonly actorId: number;
  readonly note: string | null;
  readonly createdAt: string;
}

export interface ApplicationDetailResponse {
  readonly id: number;
  readonly jobId: number;
  readonly jobTitle: string;
  readonly companyName: string;
  readonly cvId: number;
  readonly cvSnapshotUrl: string;
  readonly coverLetter: string | null;
  readonly status: ApplicationStatus;
  readonly canWithdraw: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly histories: readonly ApplicationStatusHistoryResponse[];
}

export interface PageResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface ApplyJobRequest {
  readonly cvId: number;
  readonly coverLetter?: string | null;
}

export interface WithdrawApplicationRequest {
  readonly reason: string;
}

export interface CandidateCvItem {
  readonly id: number;
  readonly title: string;
  readonly fileName?: string | null;
  readonly updatedAt?: string | null;
  readonly isDefault?: boolean;
}

export type CandidateCvListResult =
  | {
      readonly availability: 'ready';
      readonly items: readonly CandidateCvItem[];
    }
  | {
      readonly availability: 'unavailable';
      readonly items: readonly [];
      readonly reason: string;
    };

export interface JobApplyTarget {
  readonly jobId: number;
  readonly title: string;
  readonly companyName: string;
}

export interface ListMyApplicationsParams {
  readonly status?: ApplicationStatus | '';
  readonly page?: number;
  readonly size?: number;
}

export type InterviewResult = 'PENDING' | 'PASS' | 'FAIL';

export interface InterviewRoundResponse {
  readonly id: number;
  readonly applicationId: number;
  readonly roundNo: number;
  readonly name: string;
  readonly interviewerEmail: string;
  readonly scheduledAt: string | null;
  readonly result: InterviewResult;
  readonly score: number | null;
  readonly note: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateInterviewRoundRequest {
  readonly name: string;
  readonly interviewerEmail: string;
  readonly scheduledAt?: string | null;
}

export interface UpdateInterviewRoundRequest {
  readonly result: InterviewResult;
  readonly score?: number | null;
  readonly note?: string | null;
  readonly version: number;
}

export interface TransitionApplicationRequest {
  readonly toStatus: ApplicationStatus;
  readonly note: string;
}

export interface ApplicationProcessDetailResponse {
  readonly id: number;
  readonly jobId: number;
  readonly jobTitle: string;
  readonly companyId: number | null;
  readonly companyName: string;
  readonly candidateUserId: number;
  readonly candidateName: string;
  readonly candidateEmail: string;
  readonly cvId: number;
  readonly cvSnapshotUrl: string;
  readonly coverLetter: string | null;
  readonly status: ApplicationStatus;
  readonly matchScore: number;
  readonly canWithdraw: boolean;
  readonly canSendOffer: boolean;
  readonly allowedTransitions: readonly ApplicationStatus[];
  readonly rounds: readonly InterviewRoundResponse[];
  readonly histories: readonly ApplicationStatusHistoryResponse[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface HrJobSummaryResponse {
  readonly id: number;
  readonly title: string;
  readonly companyId: number | null;
  readonly companyName: string;
  readonly status: string;
  readonly expired: boolean;
  readonly deadline: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface HrApplicationSummaryResponse {
  readonly id: number;
  readonly candidateUserId: number;
  readonly cvSnapshotUrl: string;
  readonly coverLetter: string | null;
  readonly status: ApplicationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StaffApplicationSummaryResponse {
  readonly id: number;
  readonly jobId: number;
  readonly jobTitle: string;
  readonly companyId: number | null;
  readonly companyName: string;
  readonly candidateUserId: number;
  readonly candidateName: string;
  readonly candidateEmail: string;
  readonly status: ApplicationStatus;
  readonly roundCount: number;
  readonly matchScore: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListHrJobsParams {
  readonly page?: number;
  readonly size?: number;
}

export interface ListHrJobApplicationsParams {
  readonly status?: ApplicationStatus | '';
  readonly page?: number;
  readonly size?: number;
}

export interface ListStaffApplicationsParams {
  readonly companyId?: number;
  readonly jobId?: number;
  readonly status?: ApplicationStatus | '';
  readonly page?: number;
  readonly size?: number;
}
