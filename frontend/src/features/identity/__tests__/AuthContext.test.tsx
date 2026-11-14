import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/useAuth';
import { authApi } from '../api/authApi';
import { getRoleHomePath } from '../utils/roleUtils';
import { AuthApiError, type AuthResponse, type UserDto } from '../types';
import { getAuthSessionHandlers, setAuthSessionHandlers } from '../../../shared/api/httpClient';

vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
    ssoLogin: vi.fn(),
    changePassword: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe('AuthContext & useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthSessionHandlers({});
  });

  const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  const mockUser: UserDto = {
    id: 1,
    email: 'hr1@rikkeisoft.com',
    fullName: 'Nguyen Van HR',
    role: 'HR',
    companyId: 10,
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  const mockAuthResponse: AuthResponse = {
    accessToken: 'mock-jwt-token-xyz',
    user: mockUser,
    mustChangePassword: false,
  };

  it('initializes with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('logs in successfully and stores token and profile in memory', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const res = await result.current.login({
        email: 'hr1@rikkeisoft.com',
        password: 'Password123',
      });
      expect(res.accessToken).toBe('mock-jwt-token-xyz');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe('mock-jwt-token-xyz');
    expect(result.current.user?.email).toBe('hr1@rikkeisoft.com');
  });

  it('performs SSO login successfully', async () => {
    const ssoUser: UserDto = {
      id: 2,
      email: 'student1@lms.rikkei.edu.vn',
      fullName: 'Le Thi Sinh Vien',
      role: 'CANDIDATE',
      companyId: null,
      lmsUserId: 'lms-sv-001',
      status: 'ACTIVE',
      mustChangePassword: false,
    };
    vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
      accessToken: 'sso-jwt-token',
      user: ssoUser,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.ssoLogin('ticket-123456');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.role).toBe('CANDIDATE');
    expect(result.current.user?.lmsUserId).toBe('lms-sv-001');
  });

  it('clears credentials on logout', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'hr1@rikkeisoft.com', password: 'Password123' });
    });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('clears mustChangePassword in memory after successful password change', async () => {
    const mustChangeUser: UserDto = {
      ...mockUser,
      mustChangePassword: true,
    };
    vi.mocked(authApi.login).mockResolvedValueOnce({
      accessToken: 'mock-token',
      user: mustChangeUser,
      mustChangePassword: true,
    });
    vi.mocked(authApi.changePassword).mockResolvedValueOnce({
      message: 'Mật khẩu đã được thay đổi thành công',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'hr1@rikkeisoft.com', password: 'Password123' });
    });
    expect(result.current.user?.mustChangePassword).toBe(true);

    await act(async () => {
      await result.current.changePassword({
        oldPassword: 'Password123',
        newPassword: 'NewPassword999',
      });
    });

    expect(result.current.user?.mustChangePassword).toBe(false);
  });

  it('resolves getRoleHomePath accurately for all roles', () => {
    expect(getRoleHomePath('CANDIDATE')).toBe('/candidate');
    expect(getRoleHomePath('HR')).toBe('/hr');
    expect(getRoleHomePath('MENTOR')).toBe('/mentor');
    expect(getRoleHomePath('STAFF')).toBe('/staff');
    expect(getRoleHomePath('ADMIN')).toBe('/admin');
    expect(getRoleHomePath('UNKNOWN')).toBe('/login');
    expect(getRoleHomePath()).toBe('/login');
  });

  it('automatically logs out and clears state when fetchCurrentUser encounters 401', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce(mockAuthResponse);
    vi.mocked(authApi.getMe).mockImplementationOnce(() => {
      // In centralized architecture, httpClient triggers sessionHandlers.onUnauthorized on 401
      getAuthSessionHandlers().onUnauthorized?.();
      return Promise.reject(new AuthApiError('UNAUTHORIZED', 'Hết phiên đăng nhập', 401));
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'hr1@rikkeisoft.com', password: 'Password123' });
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await expect(result.current.fetchCurrentUser()).rejects.toThrow('Hết phiên đăng nhập');
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
