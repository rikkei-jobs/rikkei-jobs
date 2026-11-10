export type BackendHealthStatus = 'UP' | 'DOWN' | 'CONNECTING...';

export interface HealthResponse {
  status: string;
  [key: string]: unknown;
}

export const getApiBaseUrl = (): string => {
  // Use VITE_API_BASE_URL if explicitly configured, otherwise empty string (relative to current domain/reverse proxy)
  return import.meta.env.VITE_API_BASE_URL ?? '';
};

export const fetchBackendHealth = async (
  signal?: AbortSignal,
): Promise<{ status: BackendHealthStatus; details?: string }> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/health`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      return {
        status: 'DOWN',
        details: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as HealthResponse;
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
    const message = err instanceof Error ? err.message : 'Không thể kết nối Backend';
    return { status: 'DOWN', details: message };
  }
};
