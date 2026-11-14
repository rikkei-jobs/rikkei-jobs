import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  type AuthResponse,
  type ChangePasswordRequest,
  type ForgotPasswordRequest,
  type LoginRequest,
  type MessageResponse,
  type ResetPasswordRequest,
  type UserDto,
} from '../types';
import { authApi } from '../api/authApi';
import { getRoleHomePath } from '../utils/roleUtils';
import { AuthContext, type AuthContextValue } from './authContextDef';
import { setAuthToken, setAuthSessionHandlers, getAuthSessionHandlers } from '../../../shared/api/httpClient';

export interface AuthProviderProps {
  children: React.ReactNode;
  initialToken?: string | null;
  initialUser?: UserDto | null;
}

const getInitialAuthState = (
  initialToken: string | null,
  initialUser: UserDto | null,
): { token: string | null; user: UserDto | null } => {
  if (initialToken !== null || initialUser !== null) {
    return { token: initialToken, user: initialUser };
  }

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const mockRole = params.get('mockRole');
    if (mockRole) {
      const mustChange = params.get('mustChange') === 'true';
      return {
        token: 'dev-preview-token',
        user: {
          id: 101,
          email: `${mockRole.toLowerCase()}@rikkei.vn`,
          fullName:
            mockRole === 'HR'
              ? 'Tran Thi HR'
              : mockRole === 'CANDIDATE'
                ? 'Nguyen Van Sinh Vien'
                : 'Nguoi Dung He Thong',
          role: mockRole,
          companyId: mockRole === 'HR' ? 42 : null,
          lmsUserId: mockRole === 'CANDIDATE' ? 'lms-sv-001' : null,
          status: 'ACTIVE',
          mustChangePassword: mustChange,
        },
      };
    }
  }

  return { token: null, user: null };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialToken = null,
  initialUser = null,
}) => {
  const initialState = getInitialAuthState(initialToken, initialUser);

  // In-Memory Token Storage (OWASP ASVS: NEVER use localStorage or sessionStorage for tokens)
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    setAuthToken(initialState.token);
    return initialState.token;
  });
  const [user, setUser] = useState<UserDto | null>(initialState.user);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setAccessToken(null);
    setUser(null);
    setError(null);
  }, []);

  useEffect(() => {
    setAuthToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    const current = getAuthSessionHandlers();
    if (!current.onUnauthorized) {
      setAuthSessionHandlers({
        onUnauthorized: logout,
      });
      return () => {
        setAuthSessionHandlers({});
      };
    }
  }, [logout]);

  const login = useCallback(async (credentials: LoginRequest): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(credentials);
      setAuthToken(response.accessToken);
      setAccessToken(response.accessToken);
      const userProfile: UserDto = {
        ...response.user,
        mustChangePassword:
          response.mustChangePassword !== undefined && response.mustChangePassword !== null
            ? Boolean(response.mustChangePassword)
            : Boolean(response.user.mustChangePassword),
      };
      setUser(userProfile);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đăng nhập không thành công';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ssoLogin = useCallback(async (ticket: string): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.ssoLogin({ ticket });
      setAuthToken(response.accessToken);
      setAccessToken(response.accessToken);
      setUser(response.user);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xác thực vé SSO thất bại';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(
    async (req: ChangePasswordRequest): Promise<MessageResponse> => {
      if (!accessToken) {
        throw new Error('Chưa đăng nhập');
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await authApi.changePassword(req, accessToken);
        if (user) {
          setUser({ ...user, mustChangePassword: false });
        }
        return res;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, user],
  );

  const forgotPassword = useCallback(
    async (req: ForgotPasswordRequest): Promise<MessageResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        return await authApi.forgotPassword(req);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gửi yêu cầu thất bại';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const resetPassword = useCallback(
    async (req: ResetPasswordRequest): Promise<MessageResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        return await authApi.resetPassword(req);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const fetchCurrentUser = useCallback(async (): Promise<UserDto> => {
    if (!accessToken) {
      throw new Error('Chưa đăng nhập');
    }
    const profile = await authApi.getMe(accessToken);
    setUser(profile);
    return profile;
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      user,
      isAuthenticated: Boolean(accessToken && user),
      isLoading,
      error,
      login,
      ssoLogin,
      logout,
      changePassword,
      forgotPassword,
      resetPassword,
      fetchCurrentUser,
      clearError,
      getRoleHomePath,
      setUser,
      setAccessToken,
    }),
    [
      accessToken,
      user,
      isLoading,
      error,
      login,
      ssoLogin,
      logout,
      changePassword,
      forgotPassword,
      resetPassword,
      fetchCurrentUser,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
