import { apiFetch, readFileResponse, readJsonResponse, ApiError } from '../../../shared/api/http';
import type {
  ApplicationDetail,
  ApplicationStatus,
  ApplicationSummary,
  ApplyJobRequest,
  CandidateCvOption,
  CreateJobRequest,
  HrApplicationSummary,
  JobDescription,
  PageResponse,
  WithdrawApplicationRequest,
} from '../types';

export { ApiError };

export const applyJob = async (
  jobId: number,
  request: ApplyJobRequest,
  signal?: AbortSignal,
): Promise<ApplicationDetail> => {
  const response = await apiFetch(`/api/v1/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  return readJsonResponse<ApplicationDetail>(response);
};

export const getMyApplications = async (
  status?: ApplicationStatus,
  page = 1,
  size = 20,
  signal?: AbortSignal,
): Promise<PageResponse<ApplicationSummary>> => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set('status', status);
  const response = await apiFetch(`/api/v1/me/applications?${params}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  return readJsonResponse<PageResponse<ApplicationSummary>>(response);
};

export const getMyApplicationDetail = async (
  applicationId: number,
  signal?: AbortSignal,
): Promise<ApplicationDetail> => {
  const response = await apiFetch(`/api/v1/me/applications/${applicationId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  return readJsonResponse<ApplicationDetail>(response);
};

export const withdrawApplication = async (
  applicationId: number,
  request: WithdrawApplicationRequest,
  signal?: AbortSignal,
): Promise<ApplicationDetail> => {
  const response = await apiFetch(`/api/v1/me/applications/${applicationId}/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  return readJsonResponse<ApplicationDetail>(response);
};

export const getApprovedJobs = async (
  page = 1,
  size = 20,
  signal?: AbortSignal,
): Promise<PageResponse<JobDescription>> => {
  const response = await apiFetch(`/api/v1/jobs?page=${page}&size=${size}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  return readJsonResponse<PageResponse<JobDescription>>(response);
};

export const getCandidateCvs = async (
  page = 1,
  size = 100,
  signal?: AbortSignal,
): Promise<PageResponse<CandidateCvOption>> => {
  const response = await apiFetch(`/api/v1/me/cvs?page=${page}&size=${size}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  return readJsonResponse<PageResponse<CandidateCvOption>>(response);
};

export const uploadCandidateCv = async (
  title: string,
  file: File,
  signal?: AbortSignal,
): Promise<CandidateCvOption> => {
  const body = new FormData();
  body.set('title', title);
  body.set('file', file);
  const response = await apiFetch('/api/v1/me/cvs', { method: 'POST', body, signal });
  return readJsonResponse<CandidateCvOption>(response);
};

export const getHrJobs = async (
  page = 1,
  size = 100,
  signal?: AbortSignal,
): Promise<PageResponse<JobDescription>> => {
  const response = await apiFetch(`/api/v1/hr/job-descriptions?page=${page}&size=${size}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  return readJsonResponse<PageResponse<JobDescription>>(response);
};

export const createHrJob = async (
  request: CreateJobRequest,
  signal?: AbortSignal,
): Promise<JobDescription> => {
  const response = await apiFetch('/api/v1/hr/job-descriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(request),
    signal,
  });
  return readJsonResponse<JobDescription>(response);
};

export const getHrApplications = async (
  jobId: number,
  page = 1,
  size = 100,
  signal?: AbortSignal,
): Promise<PageResponse<HrApplicationSummary>> => {
  const response = await apiFetch(
    `/api/v1/hr/job-descriptions/${jobId}/applications?page=${page}&size=${size}`,
    { headers: { Accept: 'application/json' }, signal },
  );
  return readJsonResponse<PageResponse<HrApplicationSummary>>(response);
};

export const getHrApplicationDetail = async (
  jobId: number,
  applicationId: number,
  signal?: AbortSignal,
): Promise<ApplicationDetail> => {
  const response = await apiFetch(
    `/api/v1/hr/job-descriptions/${jobId}/applications/${applicationId}`,
    { headers: { Accept: 'application/json' }, signal },
  );
  return readJsonResponse<ApplicationDetail>(response);
};

export const updateHrApplicationStatus = async (
  jobId: number,
  applicationId: number,
  status: ApplicationStatus,
  note: string,
  signal?: AbortSignal,
): Promise<ApplicationDetail> => {
  const response = await apiFetch(
    `/api/v1/hr/job-descriptions/${jobId}/applications/${applicationId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ status, note }),
      signal,
    },
  );
  return readJsonResponse<ApplicationDetail>(response);
};

export const downloadApplicationCv = async (
  jobId: number | null,
  applicationId: number,
  signal?: AbortSignal,
): Promise<Blob> => {
  const path =
    jobId === null
      ? `/api/v1/me/applications/${applicationId}/cv-snapshot`
      : `/api/v1/hr/job-descriptions/${jobId}/applications/${applicationId}/cv-snapshot`;
  const response = await apiFetch(path, { headers: { Accept: 'application/pdf' }, signal });
  return readFileResponse(response);
};
