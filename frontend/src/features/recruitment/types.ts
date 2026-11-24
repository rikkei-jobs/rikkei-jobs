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
