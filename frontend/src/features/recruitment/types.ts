/**
 * Shared Recruitment Domain Types (Task UT-01)
 * Compliance: TypeScript 6.0.3 strict, no 'any', zero emoji.
 */

export type ApplicationStatus =
  'SUBMITTED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';

export interface ApplyJobRequest {
  cvId: number;
  coverLetter?: string;
}

export interface WithdrawApplicationRequest {
  reason: string;
}

export interface ApplicationStatusHistoryItem {
  id: number;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  actorId: number;
  note: string | null;
  createdAt: string;
}

export interface ApplicationSummary {
  id: number;
  jobId: number;
  jobTitle: string;
  companyName: string;
  status: ApplicationStatus;
  canWithdraw: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDetail {
  id: number;
  jobId: number;
  jobTitle: string;
  companyName: string;
  cvId: number;
  cvSnapshotUrl: string;
  coverLetter: string | null;
  status: ApplicationStatus;
  canWithdraw: boolean;
  createdAt: string;
  updatedAt: string;
  histories: ApplicationStatusHistoryItem[];
}

export interface CandidateCvOption {
  id: number;
  title: string;
  originalFilename: string;
  fileSize: number;
  updatedAt: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface JobDescription {
  id: number;
  title: string;
  description: string;
  companyName: string;
  location: string;
  employmentType: string;
  salaryRange: string | null;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'CLOSED';
  deadline: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrApplicationSummary {
  id: number;
  candidateUserId: number;
  cvSnapshotUrl: string;
  coverLetter: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobRequest {
  companyName: string;
  title: string;
  description: string;
  location: string;
  employmentType: string;
  salaryRange?: string;
  deadline: string;
}
