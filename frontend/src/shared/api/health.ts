import { request, getApiBaseUrl } from './httpClient';
import { ApiError } from './auth';

export type BackendHealthStatus = 'UP' | 'DOWN' | 'CONNECTING...';

export interface HealthResponse {
  status: string;
  [key: string]: unknown;
}

export { getApiBaseUrl };

export const fetchBackendHealth = async (
  signal?: AbortSignal,
): Promise<{ status: BackendHealthStatus; details?: string }> => {
  try {
    const data = await request<HealthResponse>('/api/v1/health', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
      skipAuth: true,
    });

    if (data && data.status === 'UP') {
      return { status: 'UP', details: 'Backend đang hoạt động bình thường' };
    }

    return {
      status: 'DOWN',
      details: `Trạng thái không xác định: ${data?.status || 'N/A'}`,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    if (err instanceof ApiError) {
      const statusText = err.statusText || '';
      return {
        status: 'DOWN',
        details: statusText ? `HTTP ${err.status} ${statusText}` : `HTTP ${err.status} ${err.message}`,
      };
    }
    const message = err instanceof Error ? err.message : 'Không thể kết nối Backend';
    return { status: 'DOWN', details: message };
  }
};
