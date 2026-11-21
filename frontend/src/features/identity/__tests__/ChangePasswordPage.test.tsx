import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppRoutes } from '../../../App';
import { AuthProvider } from '../context/AuthContext';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { authApi } from '../api/authApi';
import { type UserDto } from '../types';

const LoginStateProbe = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="login-pathname">{location.pathname}</div>
      <div data-testid="login-state">{JSON.stringify(location.state)}</div>
    </div>
  );
};

vi.mock('../api/authApi', () => ({
  authApi: {
    changePassword: vi.fn(),
  },
}));

describe('ChangePasswordPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as unknown as Response);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mustChangeUser: UserDto = {
    id: 1,
    email: 'hr1@rikkei.vn',
    fullName: 'HR Must Change',
    role: 'HR',
    companyId: 2,
    status: 'ACTIVE',
    mustChangePassword: true,
  };

  const voluntaryHrUser: UserDto = {
    id: 2,
    email: 'hr2@rikkeijobs.test',
    fullName: 'HR Voluntary',
    role: 'HR',
    companyId: 2,
    lmsUserId: null,
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  const lmsCandidateUser: UserDto = {
    id: 3,
    email: 'sv1@lms.rikkei.vn',
    fullName: 'LMS Candidate',
    role: 'CANDIDATE',
    companyId: null,
    lmsUserId: 'lms-sv-001',
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  it('renders forced warning banner and validates password criteria', async () => {
    render(
      <AuthProvider initialToken="test-token" initialUser={mustChangeUser}>
        <MemoryRouter>
          <ChangePasswordPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Yêu Cầu Đổi Mật Khẩu:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật Khẩu Mới$/i)).toHaveAttribute(
      'placeholder',
      'Nhập mật khẩu mới',
    );
    expect(screen.queryByRole('link', { name: /Quay lại trang chủ/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đăng Xuất/i })).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Cập Nhật Mật Khẩu/i });
    expect(submitBtn).toBeDisabled();

    // Fill current password
    fireEvent.change(screen.getByLabelText(/Mật Khẩu Hiện Tại/i), {
      target: { value: 'OldPass123' },
    });

    // Fill new password (< 8 chars)
    fireEvent.change(screen.getByLabelText(/^Mật Khẩu Mới$/i), {
      target: { value: 'Short1' },
    });
    expect(submitBtn).toBeDisabled();

    // Fill valid new password (>= 8 chars with letter and number)
    fireEvent.change(screen.getByLabelText(/^Mật Khẩu Mới$/i), {
      target: { value: 'NewSecurePass99' },
    });
    // Confirm password mismatch
    fireEvent.change(screen.getByLabelText(/Xác Nhận Mật Khẩu Mới/i), {
      target: { value: 'Mismatch99' },
    });
    expect(submitBtn).toBeDisabled();

    // Confirm password match
    fireEvent.change(screen.getByLabelText(/Xác Nhận Mật Khẩu Mới/i), {
      target: { value: 'NewSecurePass99' },
    });
    expect(submitBtn).not.toBeDisabled();

    vi.mocked(authApi.changePassword).mockResolvedValueOnce({
      message: 'Mật khẩu đã được thay đổi thành công',
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith(
        { oldPassword: 'OldPass123', newPassword: 'NewSecurePass99' },
        'test-token',
      );
      expect(screen.getByText(/Mật khẩu đã được thay đổi thành công/i)).toBeInTheDocument();
    });
  });

  it('mutually clears success and error banners to prevent conflicting UI', async () => {
    vi.mocked(authApi.changePassword).mockRejectedValueOnce(
      new Error('Mật khẩu hiện tại không chính xác'),
    );

    render(
      <AuthProvider initialToken="test-token" initialUser={mustChangeUser}>
        <MemoryRouter>
          <ChangePasswordPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    // Fill valid form
    fireEvent.change(screen.getByLabelText(/Mật Khẩu Hiện Tại/i), {
      target: { value: 'WrongPass123' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật Khẩu Mới$/i), {
      target: { value: 'NewSecurePass99' },
    });
    fireEvent.change(screen.getByLabelText(/Xác Nhận Mật Khẩu Mới/i), {
      target: { value: 'NewSecurePass99' },
    });

    const submitBtn = screen.getByRole('button', { name: /Cập Nhật Mật Khẩu/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Mật khẩu hiện tại không chính xác/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Đổi mật khẩu thành công/i)).not.toBeInTheDocument();

    // Now mock success on retry
    vi.mocked(authApi.changePassword).mockResolvedValueOnce({
      message: 'Đổi mật khẩu thành công!',
    });

    fireEvent.change(screen.getByLabelText(/Mật Khẩu Hiện Tại/i), {
      target: { value: 'OldPass123' },
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đổi mật khẩu thành công!/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Mật khẩu hiện tại không chính xác/i)).not.toBeInTheDocument();
  });

  it('clears session and navigates to /login with state=null when clicking Đăng Xuất on /change-password', () => {
    render(
      <AuthProvider initialToken="test-token" initialUser={mustChangeUser}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/change-password',
              state: { from: { pathname: '/hr/company' } },
            },
          ]}
        >
          <Routes>
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/login" element={<LoginStateProbe />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Đăng Xuất/i }));

    expect(screen.getByTestId('login-pathname')).toHaveTextContent('/login');
    expect(screen.getByTestId('login-state')).toHaveTextContent('null');
  });

  it('renders voluntary mode for enterprise hr2 without forced warning banner and with Quay lại trang chủ link', () => {
    render(
      <AuthProvider initialToken="test-token" initialUser={voluntaryHrUser}>
        <MemoryRouter initialEntries={['/change-password']}>
          <ChangePasswordPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.queryByText(/Yêu Cầu Đổi Mật Khẩu:/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đăng Xuất/i })).not.toBeInTheDocument();
    const backLink = screen.getByRole('link', { name: /Quay lại trang chủ/i });
    expect(backLink).toHaveAttribute('href', '/hr');
    expect(screen.getByLabelText(/^Mật Khẩu Mới$/i)).toHaveAttribute(
      'placeholder',
      'Nhập mật khẩu mới',
    );
  });

  it('navigates from /hr to /change-password in voluntary mode and back to /hr via AppRoutes, while redirecting LMS SSO users home', async () => {
    const { unmount } = render(
      <AuthProvider initialToken="hr2-jwt" initialUser={voluntaryHrUser}>
        <MemoryRouter initialEntries={['/hr']}>
          <LoginStateProbe />
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    const changePwdLink = await screen.findByRole(
      'link',
      { name: /Đổi mật khẩu/i },
      { timeout: 8000 },
    );
    fireEvent.click(changePwdLink);

    await waitFor(
      () => {
        expect(screen.getByTestId('login-pathname')).toHaveTextContent('/change-password');
      },
      { timeout: 8000 },
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: /^Đổi mật khẩu$/i }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Yêu Cầu Đổi Mật Khẩu:/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Quay lại trang chủ/i }));
    await waitFor(
      () => {
        expect(screen.getByTestId('login-pathname')).toHaveTextContent('/hr');
      },
      { timeout: 8000 },
    );
    unmount();

    render(
      <AuthProvider initialToken="cand-jwt" initialUser={lmsCandidateUser}>
        <MemoryRouter initialEntries={['/change-password']}>
          <LoginStateProbe />
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId('login-pathname')).toHaveTextContent('/candidate');
      },
      { timeout: 8000 },
    );
  }, 15000);
});
