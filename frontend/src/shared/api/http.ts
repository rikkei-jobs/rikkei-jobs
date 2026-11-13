import { getApiBaseUrl } from './health';
import { getAuthSession } from '../auth/session';

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.status = status;
  }
}

export const apiFetch = (path: string, init: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(init.headers);
  const session = getAuthSession();
  if (session) headers.set('Authorization', `Bearer ${session.accessToken}`);

  return fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
};

export const readJsonResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let payload: ApiErrorPayload = {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'Yêu cầu không thành công.',
    };
    try {
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null) {
        const errorBody = body as Record<string, unknown>;
        if (typeof errorBody.code === 'string' && typeof errorBody.message === 'string') {
          payload = { code: errorBody.code, message: errorBody.message };
        }
      }
    } catch {
      // Use the HTTP status when the server does not return a JSON error body.
    }
    throw new ApiError(response.status, payload);
  }
  return (await response.json()) as T;
};

export const readFileResponse = async (response: Response): Promise<Blob> => {
  if (response.ok) return response.blob();
  await readJsonResponse<never>(response);
  throw new Error('Unreachable response state');
};
