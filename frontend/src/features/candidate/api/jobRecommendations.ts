import { request } from '../../../shared/api/httpClient';
import type { JobRecommendationsResponse } from '../types';

/** Fetches recommendations for the authenticated candidate (identity comes from the JWT). */
export async function fetchJobRecommendations(
  limit = 10,
  refresh = false,
  signal?: AbortSignal,
): Promise<JobRecommendationsResponse> {
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (refresh) {
    params.set('refresh', 'true');
  }

  return request<JobRecommendationsResponse>(
    `/api/v1/me/job-recommendations?${params.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
}
