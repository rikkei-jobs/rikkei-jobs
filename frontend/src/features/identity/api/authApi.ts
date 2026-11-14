import {
  type AuthResponse,
  type ChangePasswordRequest,
  type ForgotPasswordRequest,
  type LoginRequest,
  type MessageResponse,
  type ResetPasswordRequest,
  type SsoLoginRequest,
  type UserDto,
} from '../types';
import {
  request,
  setAuthToken,
  getApiBaseUrl as getSharedApiBaseUrl,
} from '../../../shared/api/httpClient';

export const getApiBaseUrl = getSharedApiBaseUrl;

export const authApi = {
  ssoLogin: (data: SsoLoginRequest): Promise<AuthResponse> =>
    request<AuthResponse>('/api/v1/auth/sso', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    }),

  login: (credentials: LoginRequest): Promise<AuthResponse> =>
    request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
    }),

  changePassword: (
    data: ChangePasswordRequest,
    token?: string,
  ): Promise<MessageResponse> => {
    if (token) {
      setAuthToken(token);
    }
    return request<MessageResponse>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  forgotPassword: (data: ForgotPasswordRequest): Promise<MessageResponse> =>
    request<MessageResponse>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    }),

  resetPassword: (data: ResetPasswordRequest): Promise<MessageResponse> =>
    request<MessageResponse>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    }),

  getMe: (token?: string): Promise<UserDto> => {
    if (token) {
      setAuthToken(token);
    }
    return request<UserDto>('/api/v1/auth/me', {
      method: 'GET',
    });
  },
};
