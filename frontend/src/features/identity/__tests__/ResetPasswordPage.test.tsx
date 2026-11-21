import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { authApi } from '../api/authApi';

vi.mock('../api/authApi', () => ({
  authApi: {
    resetPassword: vi.fn(),
  },
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads token from URL params, validates password inputs and updates password', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValueOnce({
      message: 'Mật khẩu đã được cập nhật thành công',
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/reset-password/raw-token-12345']}>
          <Routes>
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByLabelText(/Mã đặt lại mật khẩu/i)).toHaveValue('raw-token-12345');
    expect(screen.getByLabelText(/^Mật khẩu mới$/i)).toHaveAttribute(
      'placeholder',
      'Nhập mật khẩu mới',
    );

    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới$/i), {
      target: { value: 'BrandNewPass123' },
    });
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/i), {
      target: { value: 'BrandNewPass123' },
    });

    const submitBtn = screen.getByRole('button', { name: /Lưu mật khẩu mới/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        token: 'raw-token-12345',
        newPassword: 'BrandNewPass123',
      });
      expect(screen.getByText('Đã cập nhật mật khẩu')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đi đến trang đăng nhập/i })).toBeInTheDocument();
    });
  });
});
