import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { EnterpriseLoginForm } from '../components/EnterpriseLoginForm';
import { authApi } from '../api/authApi';
import { AuthApiError } from '../types';

vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

describe('EnterpriseLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits credentials and navigates on successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      accessToken: 'token-abc',
      user: {
        id: 10,
        email: 'hr@test.com',
        fullName: 'HR Test',
        role: 'HR',
        companyId: 2,
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <EnterpriseLoginForm />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
      target: { value: 'hr@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
      target: { value: 'Secret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Đăng Nhập/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'hr@test.com',
        password: 'Secret123',
      });
    });
  });

  it('displays generic error alert on 401 UNAUTHORIZED', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(
      new AuthApiError('UNAUTHORIZED', 'Email hoặc mật khẩu không chính xác.', 401),
    );

    render(
      <AuthProvider>
        <MemoryRouter>
          <EnterpriseLoginForm />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
      target: { value: 'wrong@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
      target: { value: 'Wrong123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Đăng Nhập/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không chính xác.');
    });
  });

  it('displays LockoutCountdown when ACCOUNT_LOCKED error is returned', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(
      new AuthApiError(
        'ACCOUNT_LOCKED',
        'Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.',
        401,
      ),
    );

    render(
      <AuthProvider>
        <MemoryRouter>
          <EnterpriseLoginForm />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
      target: { value: 'locked@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật Khẩu$/i), {
      target: { value: 'Wrong123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Đăng Nhập/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần/i)).toBeInTheDocument();
      expect(screen.getByText('15:00')).toBeInTheDocument();
    });
  });
});
