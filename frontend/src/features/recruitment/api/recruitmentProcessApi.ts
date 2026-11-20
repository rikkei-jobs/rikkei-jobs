import { apiFetch, readJsonResponse, ApiError } from '../../../shared/api/http';
import type {
  ApplicationProcessDetail,
  ApplicationStatus,
  CreateInterviewRoundRequest,
  InterviewRound,
  PageResponse,
  StaffApplicationSummary,
  TransitionApplicationRequest,
  UpdateInterviewRoundRequest,
} from '../types';

export { ApiError };

export const getApplicationProcessDetail = async (
  applicationId: number,
  signal?: AbortSignal,
): Promise<ApplicationProcessDetail> => {
  const response = await apiFetch(`/api/v1/applications/${applicationId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  return readJsonResponse<ApplicationProcessDetail>(response);
};

export const transitionApplicationStatus = async (
  applicationId: number,
  request: TransitionApplicationRequest,
  signal?: AbortSignal,
): Promise<ApplicationProcessDetail> => {
  const response = await apiFetch(`/api/v1/applications/${applicationId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  return readJsonResponse<ApplicationProcessDetail>(response);
};

export const addInterviewRound = async (
  applicationId: number,
  request: CreateInterviewRoundRequest,
  signal?: AbortSignal,
): Promise<InterviewRound> => {
  const response = await apiFetch(`/api/v1/applications/${applicationId}/rounds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  return readJsonResponse<InterviewRound>(response);
};

export const updateInterviewRound = async (
  applicationId: number,
  roundId: number,
  request: UpdateInterviewRoundRequest,
  signal?: AbortSignal,
): Promise<InterviewRound> => {
  const response = await apiFetch(`/api/v1/applications/${applicationId}/rounds/${roundId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  return readJsonResponse<InterviewRound>(response);
};

export const getHrCompanyApplications = async (
  params?: {
    jobId?: number;
    status?: ApplicationStatus;
    page?: number;
    size?: number;
  },
  signal?: AbortSignal,
): Promise<PageResponse<StaffApplicationSummary>> => {
  const query = new URLSearchParams();
  if (params?.jobId) query.set('jobId', String(params.jobId));
  if (params?.status) query.set('status', params.status);
  query.set('page', String(params?.page ?? 0));
  query.set('size', String(params?.size ?? 20));

  const response = await apiFetch(`/api/v1/hr/applications?${query.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  return readJsonResponse<PageResponse<StaffApplicationSummary>>(response);
};

export const getStaffApplications = async (
  params?: {
    companyId?: number;
    jobId?: number;
    status?: ApplicationStatus;
    page?: number;
    size?: number;
  },
  signal?: AbortSignal,
): Promise<PageResponse<StaffApplicationSummary>> => {
  const query = new URLSearchParams();
  if (params?.companyId) query.set('companyId', String(params.companyId));
  if (params?.jobId) query.set('jobId', String(params.jobId));
  if (params?.status) query.set('status', params.status);
  query.set('page', String(params?.page ?? 0));
  query.set('size', String(params?.size ?? 20));

  const response = await apiFetch(`/api/v1/staff/applications?${query.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  return readJsonResponse<PageResponse<StaffApplicationSummary>>(response);
};
