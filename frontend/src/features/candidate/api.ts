import { request } from '../../shared/api/httpClient';
import type {
  GapAnalysisResponse,
  GapTarget,
  JobDetail,
  JobRecommendationsResponse,
  TargetPosition,
} from './types';

export async function fetchJobRecommendations(
  limit = 10,
  refresh = false,
  userId?: number,
  signal?: AbortSignal,
): Promise<JobRecommendationsResponse> {
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (refresh) {
    params.set('refresh', 'true');
  }
  if (userId && userId > 0) {
    params.set('userId', userId.toString());
  }

  return request<JobRecommendationsResponse>(
    `/api/v1/me/job-recommendations?${params.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
}

export const fetchTargetPositions = (signal?: AbortSignal): Promise<TargetPosition[]> =>
  request<TargetPosition[]>('/api/v1/target-positions', { method: 'GET', signal });

export const fetchMyTarget = (signal?: AbortSignal): Promise<GapTarget> =>
  request<GapTarget>('/api/v1/me/target', { method: 'GET', signal });

export const setMyTarget = (
  target: { positionId: number } | { jobId: number },
): Promise<GapTarget> =>
  request<GapTarget>('/api/v1/me/target', {
    method: 'PUT',
    body: JSON.stringify(target),
  });

export const fetchGapAnalysis = (
  jobId?: number,
  signal?: AbortSignal,
): Promise<GapAnalysisResponse> => {
  const query = jobId && jobId > 0 ? `?jobId=${jobId}` : '';
  return request<GapAnalysisResponse>(`/api/v1/me/gap-analysis${query}`, {
    method: 'GET',
    signal,
  });
};

export const fetchJobDetail = (jobId: number, signal?: AbortSignal): Promise<JobDetail> =>
  request<JobDetail>(`/api/v1/jobs/${jobId}`, { method: 'GET', signal });
