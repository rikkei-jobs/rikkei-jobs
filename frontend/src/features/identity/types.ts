import { ApiError } from '../../shared/api/auth';

/**
 * Types and DTOs for Identity and Authentication feature.
 * Exactly matches Backend Spring Boot DTOs and unified ErrorResponse contract.
 */

export type UserRole = 'CANDIDATE' | 'HR' | 'MENTOR' | 'STAFF' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface UserDto {
  id: number;
  email: string;
  fullName: string;
  role: UserRole | string;
  companyId: number | null;
  lmsUserId?: string | null;
  status: UserStatus | string;
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SsoLoginRequest {
  ticket: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
  mustChangePassword?: boolean | null;
}

export interface MessageResponse {
  message: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
}

export class AuthApiError extends ApiError {
  constructor(code: string, message: string, status: number) {
    super(status, message, code);
    this.name = 'AuthApiError';
  }
}

export interface AuthState {
  accessToken: string | null;
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
