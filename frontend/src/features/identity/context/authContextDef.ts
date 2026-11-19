import React, { createContext } from 'react';
import {
  type AuthResponse,
  type ChangePasswordRequest,
  type ForgotPasswordRequest,
  type LoginRequest,
  type MessageResponse,
  type ResetPasswordRequest,
  type UserDto,
} from '../types';

export interface AuthContextValue {
  accessToken: string | null;
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  ssoLogin: (ticket: string) => Promise<AuthResponse>;
  logout: () => void;
  changePassword: (request: ChangePasswordRequest) => Promise<MessageResponse>;
  forgotPassword: (request: ForgotPasswordRequest) => Promise<MessageResponse>;
  resetPassword: (request: ResetPasswordRequest) => Promise<MessageResponse>;
  fetchCurrentUser: () => Promise<UserDto>;
  clearError: () => void;
  getRoleHomePath: (role?: string) => string;
  setUser: React.Dispatch<React.SetStateAction<UserDto | null>>;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
