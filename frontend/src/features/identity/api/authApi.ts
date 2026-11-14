import {
  AuthApiError,
  type AuthResponse,
  type ChangePasswordRequest,
  type ErrorResponse,
  type ForgotPasswordRequest,
  type LoginRequest,
  type MessageResponse,
  type ResetPasswordRequest,
  type SsoLoginRequest,
  type UserDto,
} from '../types';

export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL ?? '';
};

/**
 * Core HTTP request handler wrapping native fetch with unified ErrorResponse parsing.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = `Yêu cầu thất bại với mã trạng thái ${response.status}`;

    try {
      const errorJson = (await response.json()) as ErrorResponse;
      if (errorJson && typeof errorJson === 'object' && errorJson.code && errorJson.message) {
        errorCode = errorJson.code;
        errorMessage = errorJson.message;
      }
    } catch {
      // Non-JSON error body, use status message
    }

    throw new AuthApiError(errorCode, errorMessage, response.status);
  }

  return (await response.json()) as T;
}

export const authApi = {
  ssoLogin: (data: SsoLoginRequest): Promise<AuthResponse> =>
    request<AuthResponse>('/api/v1/auth/sso', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (credentials: LoginRequest): Promise<AuthResponse> =>
    request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  changePassword: (
    data: ChangePasswordRequest,
    token: string,
  ): Promise<MessageResponse> =>
    request<MessageResponse>(
      '/api/v1/auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token,
    ),

  forgotPassword: (data: ForgotPasswordRequest): Promise<MessageResponse> =>
    request<MessageResponse>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resetPassword: (data: ResetPasswordRequest): Promise<MessageResponse> =>
    request<MessageResponse>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: (token: string): Promise<UserDto> =>
    request<UserDto>(
      '/api/v1/auth/me',
      {
        method: 'GET',
      },
      token,
    ),
};
