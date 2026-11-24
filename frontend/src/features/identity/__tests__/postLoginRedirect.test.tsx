import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from '../../../App';
import { AuthProvider } from '../context/AuthContext';
import { SsoCallbackPage } from '../pages/SsoCallbackPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { authApi } from '../api/authApi';
import { requestDevLmsTicket } from '../api/mockLmsApi';
import { AuthApiError, type UserDto } from '../types';
import {
  resetAuthSessionState,
  setAuthSessionHandlers,
  setAuthToken,
} from '../../../shared/api/httpClient';

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

vi.mock('../api/mockLmsApi', () => ({
  requestDevLmsTicket: vi.fn(),
}));

const LocationProbe: React.FC = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="current-pathname">{location.pathname}</div>
      <div data-testid="current-href">{`${location.pathname}${location.search}${location.hash}`}</div>
      <div data-testid="location-state">{JSON.stringify(location.state)}</div>
    </div>
  );
};

const RouteNavHelper: React.FC = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/hr')}>
      Navigate Protected HR
    </button>
  );
};

const createJsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  }) as unknown as Response;

describe('Post-Login state.from Redirect Integration (F1)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.login).mockReset();
    vi.mocked(authApi.ssoLogin).mockReset();
    vi.mocked(authApi.changePassword).mockReset();
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
  });

  const hrActiveUser: UserDto = {
    id: 10,
    email: 'hr2@rikkei.vn',
    fullName: 'Trần Thị HR',
    role: 'HR',
    companyId: 1,
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  const hrMustChangeUser: UserDto = {
    ...hrActiveUser,
    email: 'hr1@rikkei.vn',
    mustChangePassword: true,
  };

  const candidateUser: UserDto = {
    id: 20,
    email: 'candidate1@lms.rikkei.edu.vn',
    fullName: 'Nguyễn Văn Ứng Viên',
    role: 'CANDIDATE',
    companyId: null,
    lmsUserId: 'lms-sv-001',
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  const staffUser: UserDto = {
    id: 30,
    email: 'staff1@rikkei.vn',
    fullName: 'Lê Văn Staff',
    role: 'STAFF',
    companyId: null,
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  const mentorUser: UserDto = {
    id: 40,
    email: 'mentor1@rikkei.vn',
    fullName: 'Phạm Văn Mentor',
    role: 'MENTOR',
    companyId: null,
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  const adminUser: UserDto = {
    id: 50,
    email: 'admin1@rikkei.vn',
    fullName: 'Hoàng Quản Trị',
    role: 'ADMIN',
    companyId: null,
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  const stubCompanySuccess = () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/companies/me')) {
        return Promise.resolve(
          createJsonResponse(200, {
            id: 1,
            name: 'Rikkei Partner Co',
            taxCode: '0101234567',
            industry: 'IT',
            description: 'Mô tả doanh nghiệp',
            logoUrl: null,
            status: 'ACTIVE',
            version: 1,
          }),
        );
      }
      return Promise.resolve(createJsonResponse(200, {}));
    });
  };

  const stubSkillsSuccess = () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/profiles/me/skills')) {
        return Promise.resolve(createJsonResponse(200, []));
      }
      if (String(url).includes('/evaluations')) {
        return Promise.resolve(createJsonResponse(200, { evaluations: [] }));
      }
      return Promise.resolve(createJsonResponse(200, {}));
    });
  };

  describe('Cross-role from filtering (no accidental 403)', () => {
    it('ignores disallowed /hr/company from when logged-out user logs in as CANDIDATE via LMS SSO and lands on /candidate', async () => {
      vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
        accessToken: 'sso-candidate-jwt',
        user: candidateUser,
      });

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/hr/company']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
      expect(screen.getByRole('heading', { level: 1, name: /^Đăng nhập$/i })).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
        target: { value: 'ticket-sv-001' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập qua LMS$/i }));

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/sso-callback');
        expect(authApi.ssoLogin).toHaveBeenCalledWith({ ticket: 'ticket-sv-001' });
      });

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/candidate');
          expect(screen.queryByText('Hồ sơ ứng tuyển')).not.toBeInTheDocument();
          expect(
            screen.getByText(
              'Góp ý cải thiện CV và luyện phỏng vấn thử theo yêu cầu tin tuyển dụng.',
            ),
          ).toBeInTheDocument();
        },
        { timeout: 8000 },
      );

      expect(screen.queryByText('403')).not.toBeInTheDocument();
    }, 15000);

    it('ignores disallowed /candidate/skills from when logged-out user logs in as HR (mustChangePassword: false) and lands on /hr', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce({
        accessToken: 'hr-jwt-token',
        user: hrActiveUser,
        mustChangePassword: false,
      });

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/candidate/skills']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');

      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'hr2@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr');
          expect(screen.getByText('Đăng tin tuyển dụng')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );

      expect(screen.queryByText('403')).not.toBeInTheDocument();
    }, 15000);

    it('ignores disallowed /candidate/skills from after mustChangePassword flow for HR and lands on /hr', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce({
        accessToken: 'hr-temp-jwt',
        user: hrMustChangeUser,
        mustChangePassword: true,
      });
      vi.mocked(authApi.changePassword).mockResolvedValueOnce({
        message: 'Đổi mật khẩu thành công!',
      });

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/candidate/skills']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');

      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'hr1@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'OldPass123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/change-password');
          expect(screen.getByRole('heading', { level: 1, name: /Đổi Mật Khẩu/i })).toBeInTheDocument();
        },
        { timeout: 8000 },
      );

      fireEvent.change(screen.getByLabelText(/Mật Khẩu Hiện Tại/i), {
        target: { value: 'OldPass123' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu Mới$/i), {
        target: { value: 'NewSecurePass99' },
      });
      fireEvent.change(screen.getByLabelText(/Xác Nhận Mật Khẩu Mới/i), {
        target: { value: 'NewSecurePass99' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Cập Nhật Mật Khẩu/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr');
          expect(screen.getByText('Đăng tin tuyển dụng')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );

      expect(screen.queryByText('403')).not.toBeInTheDocument();
    }, 15000);

    it('falls back to /hr when already-authenticated hrMustChangeUser visits disallowed /candidate/skills and completes password change', async () => {
      vi.mocked(authApi.changePassword).mockResolvedValueOnce({
        message: 'Đổi mật khẩu thành công!',
      });

      render(
        <AuthProvider initialToken="hr-temp-jwt" initialUser={hrMustChangeUser}>
          <MemoryRouter initialEntries={['/candidate/skills']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/change-password');

      fireEvent.change(screen.getByLabelText(/Mật Khẩu Hiện Tại/i), {
        target: { value: 'OldPass123' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu Mới$/i), {
        target: { value: 'NewSecurePass99' },
      });
      fireEvent.change(screen.getByLabelText(/Xác Nhận Mật Khẩu Mới/i), {
        target: { value: 'NewSecurePass99' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Cập Nhật Mật Khẩu/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr');
          expect(screen.getByText('Đăng tin tuyển dụng')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
    }, 15000);

    it('preserves allowed /hr/company and rejects disallowed /admin on standalone ChangePasswordPage after 1200ms', async () => {
      vi.mocked(authApi.changePassword)
        .mockResolvedValueOnce({ message: 'Đổi mật khẩu thành công!' })
        .mockResolvedValueOnce({ message: 'Đổi mật khẩu thành công!' });

      const { unmount } = render(
        <AuthProvider initialToken="hr-temp-jwt" initialUser={hrMustChangeUser}>
          <MemoryRouter
            initialEntries={[
              {
                pathname: '/change-password',
                state: { from: { pathname: '/hr/company' } },
              },
            ]}
          >
            <LocationProbe />
            <Routes>
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/hr/company" element={<div>HR Company Target Route</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.change(screen.getByLabelText(/Mật Khẩu Hiện Tại/i), {
        target: { value: 'OldPass123' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu Mới$/i), {
        target: { value: 'NewSecurePass99' },
      });
      fireEvent.change(screen.getByLabelText(/Xác Nhận Mật Khẩu Mới/i), {
        target: { value: 'NewSecurePass99' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Cập Nhật Mật Khẩu/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr/company');
          expect(screen.getByText('HR Company Target Route')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      unmount();

      render(
        <AuthProvider initialToken="hr-temp-jwt" initialUser={hrMustChangeUser}>
          <MemoryRouter
            initialEntries={[
              {
                pathname: '/change-password',
                state: { from: { pathname: '/admin' } },
              },
            ]}
          >
            <LocationProbe />
            <Routes>
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/hr" element={<div>HR Home Fallback</div>} />
              <Route path="/admin" element={<div>Admin Target Route</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.change(screen.getByLabelText(/Mật Khẩu Hiện Tại/i), {
        target: { value: 'OldPass123' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu Mới$/i), {
        target: { value: 'NewSecurePass99' },
      });
      fireEvent.change(screen.getByLabelText(/Xác Nhận Mật Khẩu Mới/i), {
        target: { value: 'NewSecurePass99' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Cập Nhật Mật Khẩu/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr');
          expect(screen.getByText('HR Home Fallback')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
    }, 15000);

    it('redirects SsoCallbackPage cleanly under React.StrictMode to allowed /candidate/skills and falls back for disallowed /hr/company', async () => {
      vi.mocked(authApi.ssoLogin)
        .mockResolvedValueOnce({
          accessToken: 'sso-candidate-jwt',
          user: candidateUser,
        })
        .mockResolvedValueOnce({
          accessToken: 'sso-candidate-jwt-2',
          user: candidateUser,
        });

      const { unmount } = render(
        <React.StrictMode>
          <AuthProvider>
            <MemoryRouter
              initialEntries={[
                {
                  pathname: '/sso-callback',
                  search: '?ticket=strict-ticket-123',
                  state: { from: { pathname: '/candidate/skills' } },
                },
              ]}
            >
              <LocationProbe />
              <Routes>
                <Route path="/sso-callback" element={<SsoCallbackPage />} />
                <Route path="/candidate/skills" element={<div>Candidate Skills Target</div>} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </React.StrictMode>,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/candidate/skills');
          expect(screen.getByText('Candidate Skills Target')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      expect(authApi.ssoLogin).toHaveBeenCalledTimes(1);
      unmount();

      render(
        <React.StrictMode>
          <AuthProvider>
            <MemoryRouter
              initialEntries={[
                {
                  pathname: '/sso-callback',
                  search: '?ticket=strict-ticket-456',
                  state: { from: { pathname: '/hr/company' } },
                },
              ]}
            >
              <LocationProbe />
              <Routes>
                <Route path="/sso-callback" element={<SsoCallbackPage />} />
                <Route path="/candidate" element={<div>Candidate Home Fallback</div>} />
                <Route path="/hr/company" element={<div>HR Company Target</div>} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </React.StrictMode>,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/candidate');
          expect(screen.getByText('Candidate Home Fallback')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      expect(authApi.ssoLogin).toHaveBeenCalledTimes(2);
    }, 15000);

    it('falls back to /candidate for disallowed /hr/company and preserves /candidate/skills via LmsLoginForm quick dev ticket', async () => {
      stubSkillsSuccess();
      vi.mocked(requestDevLmsTicket)
        .mockResolvedValueOnce('quick-dev-ticket-001')
        .mockResolvedValueOnce('quick-dev-ticket-002');
      vi.mocked(authApi.ssoLogin)
        .mockResolvedValueOnce({
          accessToken: 'sso-candidate-jwt',
          user: candidateUser,
        })
        .mockResolvedValueOnce({
          accessToken: 'sso-candidate-jwt-2',
          user: candidateUser,
        });

      const { unmount } = render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/hr/company']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
      fireEvent.click(screen.getByText(/Công cụ kiểm thử nhanh/i));
      fireEvent.click(screen.getByRole('button', { name: /Lấy vé cho candidate1/i }));

      await waitFor(() => {
        expect(requestDevLmsTicket).toHaveBeenCalledWith('lms-sv-001');
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/sso-callback');
      });

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/candidate');
          expect(screen.queryByText('Hồ sơ ứng tuyển')).not.toBeInTheDocument();
          expect(
            screen.getByText(
              'Góp ý cải thiện CV và luyện phỏng vấn thử theo yêu cầu tin tuyển dụng.',
            ),
          ).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      unmount();

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/candidate/skills']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.click(screen.getByText(/Công cụ kiểm thử nhanh/i));
      fireEvent.click(screen.getByRole('button', { name: /Lấy vé cho candidate1/i }));
      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/candidate/skills');
          expect(screen.getByRole('heading', { level: 1, name: /Hồ sơ năng lực/i })).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
    }, 15000);

    it('preserves state.from across SsoCallbackPage error link back to /login and filters by new Enterprise HR role', async () => {
      stubCompanySuccess();
      vi.mocked(authApi.ssoLogin)
        .mockRejectedValueOnce(new AuthApiError('TICKET_EXPIRED', 'Vé SSO đã hết hạn.', 401))
        .mockRejectedValueOnce(new AuthApiError('TICKET_EXPIRED', 'Vé SSO đã hết hạn.', 401));
      vi.mocked(authApi.login)
        .mockResolvedValueOnce({
          accessToken: 'hr-jwt-token',
          user: hrActiveUser,
          mustChangePassword: false,
        })
        .mockResolvedValueOnce({
          accessToken: 'hr-jwt-token-2',
          user: hrActiveUser,
          mustChangePassword: false,
        });

      const { unmount } = render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/candidate/skills']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
        target: { value: 'expired-ticket-123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập qua LMS$/i }));

      await waitFor(() => {
        expect(screen.getByText('Xác thực không thành công')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('link', { name: /Quay lại trang đăng nhập/i }));
      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');

      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'hr2@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr');
          expect(screen.getByText('Đăng tin tuyển dụng')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      unmount();

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/hr/company']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
        target: { value: 'expired-ticket-456' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập qua LMS$/i }));

      await waitFor(() => {
        expect(screen.getByText('Xác thực không thành công')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('link', { name: /Quay lại trang đăng nhập/i }));
      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'hr2@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr/company');
          expect(screen.getByRole('heading', { level: 1, name: /Hồ sơ công ty/i })).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
    }, 15000);
  });

  describe('Explicit Logout -> Re-login as Different Role (F1a + F1b)', () => {
    it('STAFF -> logout -> HR logs in and lands on /hr with no leaked state.from', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce({
        accessToken: 'hr-jwt-token',
        user: hrActiveUser,
        mustChangePassword: false,
      });

      render(
        <AuthProvider initialToken="staff-jwt" initialUser={staffUser}>
          <MemoryRouter initialEntries={['/staff']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/staff');
      fireEvent.click(await screen.findByRole('button', { name: /Đăng Xuất/i }));

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(screen.getByTestId('location-state')).toHaveTextContent('null');
      });

      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'hr2@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr');
          expect(screen.getByText('Đăng tin tuyển dụng')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      expect(screen.queryByText('403')).not.toBeInTheDocument();
    }, 15000);

    it('HR -> logout -> ADMIN logs in and lands on /admin with no leaked state.from', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce({
        accessToken: 'admin-jwt-token',
        user: adminUser,
        mustChangePassword: false,
      });

      render(
        <AuthProvider initialToken="hr-jwt" initialUser={hrActiveUser}>
          <MemoryRouter initialEntries={['/hr']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr');
      fireEvent.click(await screen.findByRole('button', { name: /Đăng Xuất/i }));

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(screen.getByTestId('location-state')).toHaveTextContent('null');
      });

      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'admin1@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/admin');
          expect(screen.getByText('Danh mục kỹ năng & trọng số')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      expect(screen.queryByText('403')).not.toBeInTheDocument();
    }, 15000);

    it('ADMIN -> logout -> CANDIDATE logs in via SSO callback and lands on /candidate with no leaked state.from', async () => {
      vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
        accessToken: 'sso-candidate-jwt',
        user: candidateUser,
      });

      render(
        <AuthProvider initialToken="admin-jwt" initialUser={adminUser}>
          <MemoryRouter initialEntries={['/admin']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/admin');
      fireEvent.click(await screen.findByRole('button', { name: /Đăng Xuất/i }));

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(screen.getByTestId('location-state')).toHaveTextContent('null');
      });

      fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
        target: { value: 'ticket-admin-to-cand' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập qua LMS$/i }));

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/sso-callback');
      });

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/candidate');
          expect(screen.queryByText('Hồ sơ ứng tuyển')).not.toBeInTheDocument();
          expect(
            screen.getByText(
              'Góp ý cải thiện CV và luyện phỏng vấn thử theo yêu cầu tin tuyển dụng.',
            ),
          ).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      expect(screen.queryByText('403')).not.toBeInTheDocument();
    }, 15000);

    it('MENTOR -> logout -> STAFF logs in and lands on /staff with no leaked state.from', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce({
        accessToken: 'staff-jwt-token',
        user: staffUser,
        mustChangePassword: false,
      });

      render(
        <AuthProvider initialToken="mentor-jwt" initialUser={mentorUser}>
          <MemoryRouter initialEntries={['/mentor']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/mentor');
      fireEvent.click(await screen.findByRole('button', { name: /Đăng Xuất/i }));

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(screen.getByTestId('location-state')).toHaveTextContent('null');
      });

      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'staff1@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/staff');
          expect(screen.getByText('Duyệt hồ sơ & doanh nghiệp')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      expect(screen.queryByText('403')).not.toBeInTheDocument();
    }, 15000);

    it('clears isExplicitLogout after settling on /login so a subsequent logged-out visit to /hr still records state.from', async () => {
      render(
        <AuthProvider initialToken="staff-jwt" initialUser={staffUser}>
          <MemoryRouter initialEntries={['/staff']}>
            <LocationProbe />
            <RouteNavHelper />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: /Đăng Xuất/i }));

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(screen.getByTestId('location-state')).toHaveTextContent('null');
      });

      fireEvent.click(screen.getByRole('button', { name: 'Navigate Protected HR' }));

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(JSON.parse(screen.getByTestId('location-state').textContent || 'null')).toMatchObject({
          from: { pathname: '/hr' },
        });
      });
    });
  });

  describe('401 Session Expiry (onUnauthorized)', () => {
    it('returns same HR user to /hr/company after 401 session expiry', async () => {
      let companyCalls = 0;
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('/api/v1/companies/me')) {
          companyCalls += 1;
          if (companyCalls === 1) {
            return Promise.resolve(
              createJsonResponse(401, { code: 'UNAUTHORIZED', message: 'Hết phiên đăng nhập' }),
            );
          }
          return Promise.resolve(
            createJsonResponse(200, {
              id: 1,
              name: 'Rikkei Partner Co',
              taxCode: '0101234567',
              industry: 'IT',
              description: 'Mô tả doanh nghiệp',
              logoUrl: null,
              status: 'ACTIVE',
              version: 1,
            }),
          );
        }
        return Promise.resolve(createJsonResponse(200, {}));
      });

      vi.mocked(authApi.login).mockResolvedValueOnce({
        accessToken: 'fresh-hr-jwt',
        user: hrActiveUser,
        mustChangePassword: false,
      });

      render(
        <AuthProvider initialToken="expired-hr-jwt" initialUser={hrActiveUser}>
          <MemoryRouter initialEntries={['/hr/company']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(JSON.parse(screen.getByTestId('location-state').textContent || 'null')).toMatchObject({
          from: { pathname: '/hr/company' },
        });
      });

      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'hr2@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr/company');
          expect(screen.getByRole('heading', { level: 1, name: /Hồ sơ công ty/i })).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
    }, 15000);

    it('returns same CANDIDATE user to /candidate/skills after 401 session expiry', async () => {
      let skillsCalls = 0;
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('/api/v1/profiles/me/skills')) {
          skillsCalls += 1;
          if (skillsCalls === 1) {
            return Promise.resolve(
              createJsonResponse(401, { code: 'UNAUTHORIZED', message: 'Hết phiên đăng nhập' }),
            );
          }
          return Promise.resolve(createJsonResponse(200, []));
        }
        if (String(url).includes('/evaluations')) {
          return Promise.resolve(createJsonResponse(200, { evaluations: [] }));
        }
        return Promise.resolve(createJsonResponse(200, {}));
      });

      vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
        accessToken: 'fresh-cand-jwt',
        user: candidateUser,
      });

      render(
        <AuthProvider initialToken="expired-cand-jwt" initialUser={candidateUser}>
          <MemoryRouter initialEntries={['/candidate/skills']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(JSON.parse(screen.getByTestId('location-state').textContent || 'null')).toMatchObject({
          from: { pathname: '/candidate/skills' },
        });
      });

      fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
        target: { value: 'ticket-re-login-skills' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập qua LMS$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/candidate/skills');
          expect(screen.getByRole('heading', { level: 1, name: /Hồ sơ năng lực/i })).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
    }, 15000);

    it('returns same CANDIDATE user to /candidate/jobs/42 after 401 session expiry', async () => {
      let jobCalls = 0;
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('/api/v1/jobs/42')) {
          jobCalls += 1;
          if (jobCalls === 1) {
            return Promise.resolve(
              createJsonResponse(401, { code: 'UNAUTHORIZED', message: 'Hết phiên đăng nhập' }),
            );
          }
          return Promise.resolve(
            createJsonResponse(200, {
              id: 42,
              title: 'Thực tập sinh ReactJS #42',
              companyName: 'Rikkei Tech',
              location: 'Hà Nội',
              salaryRange: '8-12 triệu',
              deadline: '2026-12-31',
              description: 'Mô tả JD 42',
              requiredSkills: [],
            }),
          );
        }
        return Promise.resolve(createJsonResponse(200, {}));
      });

      vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
        accessToken: 'fresh-cand-jwt',
        user: candidateUser,
      });

      render(
        <AuthProvider initialToken="expired-cand-jwt" initialUser={candidateUser}>
          <MemoryRouter initialEntries={['/candidate/jobs/42']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(JSON.parse(screen.getByTestId('location-state').textContent || 'null')).toMatchObject({
          from: { pathname: '/candidate/jobs/42' },
        });
      });

      fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
        target: { value: 'ticket-re-login-job42' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập qua LMS$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/candidate/jobs/42');
          expect(screen.getByText('Thực tập sinh ReactJS #42')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
    }, 15000);

    it('preserves query string and returns same CANDIDATE user to /candidate/jobs/42?tab=details after 401 session expiry', async () => {
      let jobCalls = 0;
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('/api/v1/jobs/42')) {
          jobCalls += 1;
          if (jobCalls === 1) {
            return Promise.resolve(
              createJsonResponse(401, { code: 'UNAUTHORIZED', message: 'Hết phiên đăng nhập' }),
            );
          }
          return Promise.resolve(
            createJsonResponse(200, {
              id: 42,
              title: 'Thực tập sinh ReactJS #42',
              companyName: 'Rikkei Tech',
              location: 'Hà Nội',
              salaryRange: '8-12 triệu',
              deadline: '2026-12-31',
              description: 'Mô tả JD 42',
              requiredSkills: [],
            }),
          );
        }
        return Promise.resolve(createJsonResponse(200, {}));
      });

      vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
        accessToken: 'fresh-cand-jwt',
        user: candidateUser,
      });

      render(
        <AuthProvider initialToken="expired-cand-jwt" initialUser={candidateUser}>
          <MemoryRouter initialEntries={['/candidate/jobs/42?tab=details']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(JSON.parse(screen.getByTestId('location-state').textContent || 'null')).toMatchObject({
          from: { pathname: '/candidate/jobs/42', search: '?tab=details' },
        });
      });

      fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
        target: { value: 'ticket-re-login-job42-query' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập qua LMS$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-href')).toHaveTextContent(
            '/candidate/jobs/42?tab=details',
          );
          expect(screen.getByText('Thực tập sinh ReactJS #42')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
    }, 15000);

    it('ignores /hr/company from preserved by 401 when a CANDIDATE logs in afterward', async () => {
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('/api/v1/companies/me')) {
          return Promise.resolve(
            createJsonResponse(401, { code: 'UNAUTHORIZED', message: 'Hết phiên đăng nhập' }),
          );
        }
        return Promise.resolve(createJsonResponse(200, {}));
      });

      vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
        accessToken: 'sso-candidate-jwt',
        user: candidateUser,
      });

      render(
        <AuthProvider initialToken="expired-hr-jwt" initialUser={hrActiveUser}>
          <MemoryRouter initialEntries={['/hr/company']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(JSON.parse(screen.getByTestId('location-state').textContent || 'null')).toMatchObject({
          from: { pathname: '/hr/company' },
        });
      });

      fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
        target: { value: 'ticket-cand-after-401' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập qua LMS$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/candidate');
          expect(screen.queryByText('Hồ sơ ứng tuyển')).not.toBeInTheDocument();
          expect(
            screen.getByText(
              'Góp ý cải thiện CV và luyện phỏng vấn thử theo yêu cầu tin tuyển dụng.',
            ),
          ).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      expect(screen.queryByText('403')).not.toBeInTheDocument();
    }, 15000);
  });

  describe('mustChangePassword & Security Rejection Cases', () => {
    it('preserves allowed /hr/company from across /change-password for hr1 (mustChangePassword: true)', async () => {
      stubCompanySuccess();
      vi.mocked(authApi.login).mockResolvedValueOnce({
        accessToken: 'hr1-temp-jwt',
        user: hrMustChangeUser,
        mustChangePassword: true,
      });
      vi.mocked(authApi.changePassword).mockResolvedValueOnce({
        message: 'Đổi mật khẩu thành công!',
      });

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/hr/company']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'hr1@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'OldPass123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/change-password');
        },
        { timeout: 8000 },
      );

      fireEvent.change(screen.getByLabelText(/Mật Khẩu Hiện Tại/i), {
        target: { value: 'OldPass123' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu Mới$/i), {
        target: { value: 'NewSecurePass99' },
      });
      fireEvent.change(screen.getByLabelText(/Xác Nhận Mật Khẩu Mới/i), {
        target: { value: 'NewSecurePass99' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Cập Nhật Mật Khẩu/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr/company');
          expect(screen.getByRole('heading', { level: 1, name: /Hồ sơ công ty/i })).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
    }, 15000);

    it('falls back to role home when state.from contains malicious open-redirect or auth loop path', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce({
        accessToken: 'hr-jwt-token',
        user: hrActiveUser,
        mustChangePassword: false,
      });

      const { unmount } = render(
        <AuthProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: '/login',
                search: '?tab=enterprise',
                state: { from: { pathname: '//evil.com' } },
              },
            ]}
          >
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'hr2@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr');
        },
        { timeout: 8000 },
      );
      unmount();

      vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
        accessToken: 'sso-candidate-jwt',
        user: candidateUser,
      });

      render(
        <AuthProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: '/login',
                state: { from: { pathname: '/login' } },
              },
            ]}
          >
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
        target: { value: 'ticket-loop-check' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập qua LMS$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/candidate');
        },
        { timeout: 8000 },
      );
    }, 15000);

    it('allows /403 as explicit from for all 5 authenticated roles', async () => {
      const enterpriseRoles = [
        { role: 'HR', user: hrActiveUser, email: 'hr2@rikkei.vn', label: 'HR' },
        { role: 'MENTOR', user: mentorUser, email: 'mentor1@rikkei.vn', label: 'Mentor' },
        { role: 'STAFF', user: staffUser, email: 'staff1@rikkei.vn', label: 'Nhân viên' },
        { role: 'ADMIN', user: adminUser, email: 'admin1@rikkei.vn', label: 'Quản trị viên' },
      ];

      for (const scenario of enterpriseRoles) {
        vi.mocked(authApi.login).mockResolvedValueOnce({
          accessToken: `${scenario.role.toLowerCase()}-jwt-token`,
          user: scenario.user,
          mustChangePassword: false,
        });

        const { unmount } = render(
          <AuthProvider>
            <MemoryRouter initialEntries={['/403']}>
              <LocationProbe />
              <AppRoutes />
            </MemoryRouter>
          </AuthProvider>,
        );

        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
        fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
          target: { value: scenario.email },
        });
        fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
          target: { value: 'Password123!' },
        });
        fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

        await waitFor(
          () => {
            expect(screen.getByTestId('current-pathname')).toHaveTextContent('/403');
            expect(
              screen.getByRole('heading', { level: 1, name: /Bạn không có quyền truy cập trang này/i }),
            ).toBeInTheDocument();
          },
          { timeout: 8000 },
        );
        unmount();
      }

      // CANDIDATE via LMS SSO
      vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
        accessToken: 'sso-candidate-jwt',
        user: candidateUser,
      });

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/403']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
      fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
        target: { value: 'ticket-cand-403' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập qua LMS$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/403');
          expect(
            screen.getByRole('heading', { level: 1, name: /Bạn không có quyền truy cập trang này/i }),
          ).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
    }, 15000);

    it('explicit logout from /403 clears state.from and subsequent login as another role lands on new role home', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce({
        accessToken: 'hr-jwt-token',
        user: hrActiveUser,
        mustChangePassword: false,
      });

      render(
        <AuthProvider initialToken="cand-jwt" initialUser={candidateUser}>
          <MemoryRouter initialEntries={['/403']}>
            <LocationProbe />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-pathname')).toHaveTextContent('/403');
      fireEvent.click(await screen.findByRole('button', { name: /Đăng Xuất/i }));

      await waitFor(() => {
        expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
        expect(screen.getByTestId('location-state')).toHaveTextContent('null');
      });

      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
        target: { value: 'hr2@rikkei.vn' },
      });
      fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

      await waitFor(
        () => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr');
          expect(screen.getByText('Đăng tin tuyển dụng')).toBeInTheDocument();
        },
        { timeout: 8000 },
      );
      expect(screen.queryByText('403')).not.toBeInTheDocument();
    }, 15000);

    it.each(['/forgot-password', '/candidate/%2e%2e/hr', '/hr//company', '/hr\n/company'])(
      'rejects unsafe or excluded state.from (%s) during Enterprise HR login and lands on /hr',
      async (unsafeFrom) => {
        vi.mocked(authApi.login).mockResolvedValueOnce({
          accessToken: 'hr-jwt-token',
          user: hrActiveUser,
          mustChangePassword: false,
        });

        render(
          <AuthProvider>
            <MemoryRouter
              initialEntries={[
                {
                  pathname: '/login',
                  search: '?tab=enterprise',
                  state: { from: { pathname: unsafeFrom } },
                },
              ]}
            >
              <LocationProbe />
              <AppRoutes />
            </MemoryRouter>
          </AuthProvider>,
        );

        fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
          target: { value: 'hr2@rikkei.vn' },
        });
        fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
          target: { value: 'Password123!' },
        });
        fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

        await waitFor(() => {
          expect(screen.getByTestId('current-pathname')).toHaveTextContent('/hr');
        });
      },
    );
  });
});
