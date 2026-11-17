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

    expect(screen.getByText(/Không tìm thấy tham số vé SSO/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quay lại Trang Đăng Nhập/i })).toBeInTheDocument();
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
      expect(screen.getByText('Đăng Nhập Thành Công!')).toBeInTheDocument();
      expect(screen.getByText(/Nguyen Thi Sinh Vien/i)).toBeInTheDocument();
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
      expect(screen.getByText('Xác Thực Thất Bại')).toBeInTheDocument();
      expect(screen.getByText(/Vé SSO đã hết hạn/i)).toBeInTheDocument();
    });
  });
});
