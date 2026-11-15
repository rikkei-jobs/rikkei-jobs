import { request } from '../../shared/api/httpClient';
import type { JobRecommendationsResponse } from './types';

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
