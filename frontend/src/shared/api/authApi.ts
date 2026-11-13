import { ApiError } from './auth';
import { getApiBaseUrl } from './health';

export interface CurrentUser {
  readonly id: number;
  readonly email: string;
  readonly fullName: string;
  readonly role: string;
}

interface CurrentUserResponse {
  readonly id?: number;
  readonly email?: string;
  readonly fullName?: string;
  readonly role?: string;
  readonly data?: CurrentUser;
}

const request = async (
  path: string,
  method: 'GET',
  authHeader: string,
  signal?: AbortSignal,
): Promise<CurrentUser> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: authHeader,
    },
    signal,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }

  const result = (await response.json()) as CurrentUserResponse;
  const user = result.data ?? result;

  if (
    typeof user.id !== 'number' ||
    typeof user.email !== 'string' ||
    typeof user.fullName !== 'string' ||
    typeof user.role !== 'string'
  ) {
    throw new Error('Dữ liệu người dùng từ /auth/me không hợp lệ');
  }

  return user as CurrentUser;
};

export const fetchCurrentUser = (authHeader: string, signal?: AbortSignal) =>
  request('/api/v1/auth/me', 'GET', authHeader, signal);
