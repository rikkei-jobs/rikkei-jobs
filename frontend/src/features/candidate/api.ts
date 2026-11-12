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

  const response = await fetch(`/api/v1/me/job-recommendations?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Lỗi tải dữ liệu gợi ý việc làm (${response.status} ${response.statusText})`);
  }

  return response.json() as Promise<JobRecommendationsResponse>;
}
