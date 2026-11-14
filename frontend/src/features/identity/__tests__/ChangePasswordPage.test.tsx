import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { authApi } from '../api/authApi';
import { type UserDto } from '../types';

vi.mock('../api/authApi', () => ({
  authApi: {
    changePassword: vi.fn(),
  },
}));

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders forced warning banner and validates password criteria', async () => {
    render(
      <AuthProvider initialToken="test-token" initialUser={mustChangeUser}>
        <MemoryRouter>
          <ChangePasswordPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Yêu Cầu Đổi Mật Khẩu:/i)).toBeInTheDocument();
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
});
