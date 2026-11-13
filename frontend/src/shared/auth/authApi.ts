import { apiFetch, readJsonResponse } from '../api/http';
import type { AuthSession, UserRole } from './session';

interface AuthSessionResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  userId: number;
  fullName: string;
  role: UserRole;
}

export const loginHr = async (
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<AuthSession> => {
  const response = await apiFetch('/api/v1/auth/hr/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
    signal,
  });
  return readJsonResponse<AuthSessionResponse>(response);
};

export const loginCandidate = async (
  ticket: string,
  signal?: AbortSignal,
): Promise<AuthSession> => {
  const response = await apiFetch('/api/v1/auth/candidate/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ticket }),
    signal,
  });
  return readJsonResponse<AuthSessionResponse>(response);
};
