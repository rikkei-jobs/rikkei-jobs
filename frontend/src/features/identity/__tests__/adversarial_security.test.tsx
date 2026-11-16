import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { RequireRole } from '../guards/RequireRole';
import { RequireMustChangePassword } from '../guards/RequireMustChangePassword';
import { RequireAuth } from '../guards/RequireAuth';
import { useAuth } from '../context/useAuth';
import { authApi } from '../api/authApi';
import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import { type UserDto } from '../types';

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

describe('Empirical Adversarial Challenge - Route Security & Token Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  const candidateUser: UserDto = {
    id: 10,
    email: 'candidate@test.vn',
    fullName: 'Nguyen Van Sinh Vien',
    role: 'CANDIDATE',
    companyId: null,
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  const hrUser: UserDto = {
    id: 20,
    email: 'hr@test.vn',
    fullName: 'Tran Thi HR',
    role: 'HR',
    companyId: 99,
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  const hrMustChangeUser: UserDto = {
    ...hrUser,
    mustChangePassword: true,
  };

  describe('Focus 2.1: Unauthenticated Requests Redirect to /login', () => {
    const protectedRoutes = [
      { path: '/candidate', roles: ['CANDIDATE'], label: 'Candidate Dashboard' },
      { path: '/hr', roles: ['HR'], label: 'HR Dashboard' },
      { path: '/mentor', roles: ['MENTOR'], label: 'Mentor Dashboard' },
      { path: '/staff', roles: ['STAFF'], label: 'Staff Dashboard' },
      { path: '/admin', roles: ['ADMIN'], label: 'Admin Dashboard' },
    ];

    for (const route of protectedRoutes) {
      it(`unauthenticated visitor to ${route.path} is blocked and redirected to /login`, () => {
        render(
          <AuthProvider initialToken={null} initialUser={null}>
            <MemoryRouter initialEntries={[route.path]}>
              <Routes>
                <Route path="/login" element={<div>Màn hình Đăng Nhập</div>} />
                <Route
                  path={route.path}
                  element={
                    <RequireRole allowedRoles={route.roles}>
                      <div>{route.label}</div>
                    </RequireRole>
                  }
                />
              </Routes>
            </MemoryRouter>
          </AuthProvider>,
        );

        expect(screen.getByText('Màn hình Đăng Nhập')).toBeInTheDocument();
        expect(screen.queryByText(route.label)).not.toBeInTheDocument();
      });
    }

    it('unauthenticated visitor to /change-password is redirected to /login', () => {
      render(
        <AuthProvider initialToken={null} initialUser={null}>
          <MemoryRouter initialEntries={['/change-password']}>
            <Routes>
              <Route path="/login" element={<div>Màn hình Đăng Nhập</div>} />
              <Route
                path="/change-password"
                element={
                  <RequireMustChangePassword>
                    <div>Màn hình Đổi Mật Khẩu</div>
                  </RequireMustChangePassword>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Màn hình Đăng Nhập')).toBeInTheDocument();
      expect(screen.queryByText('Màn hình Đổi Mật Khẩu')).not.toBeInTheDocument();
    });
  });

  describe('Focus 2.2: mustChangePassword === true Blocks Role Homes', () => {
    it('user with mustChangePassword=true accessing /hr is forcefully redirected to /change-password', () => {
      render(
        <AuthProvider initialToken="mock-token-xyz" initialUser={hrMustChangeUser}>
          <MemoryRouter initialEntries={['/hr']}>
            <Routes>
              <Route path="/change-password" element={<div>Màn hình Đổi Mật Khẩu Bắt Buộc</div>} />
              <Route
                path="/hr"
                element={
                  <RequireRole allowedRoles={['HR']}>
                    <div>HR Secret Portal</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Màn hình Đổi Mật Khẩu Bắt Buộc')).toBeInTheDocument();
      expect(screen.queryByText('HR Secret Portal')).not.toBeInTheDocument();
    });

    it('user with mustChangePassword=true accessing generic protected route via RequireAuth is redirected to /change-password', () => {
      render(
        <AuthProvider initialToken="mock-token-xyz" initialUser={hrMustChangeUser}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/change-password" element={<div>Màn hình Đổi Mật Khẩu Bắt Buộc</div>} />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <div>Dashboard Nội Dung Bảo Vệ</div>
                  </RequireAuth>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Màn hình Đổi Mật Khẩu Bắt Buộc')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Nội Dung Bảo Vệ')).not.toBeInTheDocument();
    });

    it('user with mustChangePassword=false accessing /change-password is bounced back to their role home', () => {
      render(
        <AuthProvider initialToken="mock-token-xyz" initialUser={hrUser}>
          <MemoryRouter initialEntries={['/change-password']}>
            <Routes>
              <Route path="/hr" element={<div>Trang Chủ Doanh Nghiệp HR</div>} />
              <Route
                path="/change-password"
                element={
                  <RequireMustChangePassword>
                    <div>Form Đổi Mật Khẩu</div>
                  </RequireMustChangePassword>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Chủ Doanh Nghiệp HR')).toBeInTheDocument();
      expect(screen.queryByText('Form Đổi Mật Khẩu')).not.toBeInTheDocument();
    });
  });

  describe('Focus 2.3: In-Memory Token Safety & Zero LocalStorage/SessionStorage Leak', () => {
    const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    it('ensures localStorage and sessionStorage have exactly 0 sensitive tokens after login and logout', async () => {
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);

      vi.mocked(authApi.login).mockResolvedValueOnce({
        accessToken: 'super-secret-jwt-token-12345',
        user: hrUser,
        mustChangePassword: false,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({
          email: 'hr@test.vn',
          password: 'Password123',
        });
      });

      // Assert in-memory state has token
      expect(result.current.accessToken).toBe('super-secret-jwt-token-12345');
      expect(result.current.isAuthenticated).toBe(true);

      // CRITICAL ASSERTION: LocalStorage and SessionStorage MUST BE ZERO
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('jwt')).toBeNull();
      expect(localStorage.length).toBe(0);

      expect(sessionStorage.getItem('token')).toBeNull();
      expect(sessionStorage.getItem('accessToken')).toBeNull();
      expect(sessionStorage.getItem('jwt')).toBeNull();
      expect(sessionStorage.length).toBe(0);

      // Perform logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.accessToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    });

    it('ensures SSO login also keeps token strictly in memory with zero storage pollution', async () => {
      vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
        accessToken: 'sso-secret-jwt-token-999',
        user: candidateUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.ssoLogin('ticket-sample-abc');
      });

      expect(result.current.accessToken).toBe('sso-secret-jwt-token-999');
      expect(result.current.user?.role).toBe('CANDIDATE');

      // Zero storage check
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    });
  });

  describe('Focus 2.4: Cross-Role Isolation', () => {
    it('prevents CANDIDATE from viewing HR portal', () => {
      render(
        <AuthProvider initialToken="token" initialUser={candidateUser}>
          <MemoryRouter initialEntries={['/hr']}>
            <Routes>
              <Route path="/candidate" element={<div>Cổng Sinh Viên</div>} />
              <Route
                path="/hr"
                element={
                  <RequireRole allowedRoles={['HR']}>
                    <div>Cổng Quản Trị Tuyển Dụng</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Cổng Sinh Viên')).toBeInTheDocument();
      expect(screen.queryByText('Cổng Quản Trị Tuyển Dụng')).not.toBeInTheDocument();
    });

    it('prevents HR from viewing CANDIDATE portal', () => {
      render(
        <AuthProvider initialToken="token" initialUser={hrUser}>
          <MemoryRouter initialEntries={['/candidate']}>
            <Routes>
              <Route path="/hr" element={<div>Cổng Doanh Nghiệp</div>} />
              <Route
                path="/candidate"
                element={
                  <RequireRole allowedRoles={['CANDIDATE']}>
                    <div>Cổng Ứng Viên</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Cổng Doanh Nghiệp')).toBeInTheDocument();
      expect(screen.queryByText('Cổng Ứng Viên')).not.toBeInTheDocument();
    });
  });
});
