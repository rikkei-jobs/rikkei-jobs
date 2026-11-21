import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { SsoCallbackPage } from '../pages/SsoCallbackPage';
import { authApi } from '../api/authApi';
import { AuthApiError } from '../types';

vi.mock('../api/authApi', () => ({
  authApi: {
    ssoLogin: vi.fn(),
  },
}));

describe('SsoCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error immediately when ticket query param is missing', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/sso-callback']}>
          <Routes>
            <Route path="/sso-callback" element={<SsoCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Không tìm thấy mã vé đăng nhập từ LMS/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quay lại trang đăng nhập/i })).toBeInTheDocument();
  });

  it('calls ssoLogin and displays success when ticket is valid', async () => {
    vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
      accessToken: 'valid-sso-jwt',
      user: {
        id: 5,
        email: 'student@lms.rikkei.edu.vn',
        fullName: 'Nguyen Thi Sinh Vien',
        role: 'CANDIDATE',
        companyId: null,
        lmsUserId: 'lms-sv-001',
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/sso-callback?ticket=valid-ticket-123']}>
          <Routes>
            <Route path="/sso-callback" element={<SsoCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(authApi.ssoLogin).toHaveBeenCalledWith({ ticket: 'valid-ticket-123' });
      expect(screen.getByText('Đăng nhập thành công')).toBeInTheDocument();
      expect(screen.getByText(/Nguyen Thi Sinh Vien/i)).toBeInTheDocument();
      expect(screen.getByText(/\(Ứng viên\)/)).toBeInTheDocument();
      expect(screen.queryByText(/CANDIDATE/)).not.toBeInTheDocument();
    });
  });

  it('displays localized Vietnamese role label for STAFF SSO login', async () => {
    vi.mocked(authApi.ssoLogin).mockResolvedValueOnce({
      accessToken: 'valid-sso-jwt-staff',
      user: {
        id: 12,
        email: 'staff@rikkei.edu.vn',
        fullName: 'Trần Thị Minh',
        role: 'STAFF',
        companyId: null,
        lmsUserId: 'lms-staff-001',
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/sso-callback?ticket=valid-staff-ticket']}>
          <Routes>
            <Route path="/sso-callback" element={<SsoCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Đăng nhập thành công')).toBeInTheDocument();
      expect(screen.getByText(/Trần Thị Minh/i)).toBeInTheDocument();
      expect(screen.getByText(/\(Nhân viên\)/)).toBeInTheDocument();
      expect(screen.queryByText(/STAFF/)).not.toBeInTheDocument();
    });
  });

  it('displays error message when ticket is expired or invalid', async () => {
    vi.mocked(authApi.ssoLogin).mockRejectedValueOnce(
      new AuthApiError('TICKET_EXPIRED', 'Vé SSO đã hết hạn (quá 60 giây). Vui lòng đăng nhập lại từ LMS.', 401),
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/sso-callback?ticket=expired-ticket']}>
          <Routes>
            <Route path="/sso-callback" element={<SsoCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Xác thực không thành công')).toBeInTheDocument();
      expect(screen.getByText(/Vé SSO đã hết hạn/i)).toBeInTheDocument();
    });
  });

  it('preserves .rj-sso-card DOM identity across loading -> success and loading -> error transitions', async () => {
    let resolveLogin!: (value: Awaited<ReturnType<typeof authApi.ssoLogin>>) => void;
    vi.mocked(authApi.ssoLogin).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    const { container, unmount } = render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/sso-callback?ticket=deferred-success']}>
          <Routes>
            <Route path="/sso-callback" element={<SsoCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    const cardLoading = container.querySelector('.rj-auth-card.rj-sso-card');
    expect(cardLoading).not.toBeNull();
    expect(screen.getByText(/Đang xác thực đăng nhập từ LMS/i)).toBeInTheDocument();

    resolveLogin({
      accessToken: 'valid-sso-jwt',
      user: {
        id: 5,
        email: 'mentor@lms.rikkei.edu.vn',
        fullName: 'Le Mentor',
        role: 'MENTOR',
        companyId: null,
        lmsUserId: 'lms-mt-001',
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Đăng nhập thành công')).toBeInTheDocument();
    });
    expect(container.querySelector('.rj-auth-card.rj-sso-card')).toBe(cardLoading);
    unmount();

    let rejectLogin!: (reason?: unknown) => void;
    vi.mocked(authApi.ssoLogin).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectLogin = reject;
        }),
    );

    const { container: errorContainer } = render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/sso-callback?ticket=deferred-error']}>
          <Routes>
            <Route path="/sso-callback" element={<SsoCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    const errorCardLoading = errorContainer.querySelector('.rj-auth-card.rj-sso-card');
    expect(errorCardLoading).not.toBeNull();

    rejectLogin(new AuthApiError('TICKET_EXPIRED', 'Vé đã hết hạn', 401));

    await waitFor(() => {
      expect(screen.getByText('Xác thực không thành công')).toBeInTheDocument();
    });
    expect(errorContainer.querySelector('.rj-auth-card.rj-sso-card')).toBe(errorCardLoading);
  });
});
