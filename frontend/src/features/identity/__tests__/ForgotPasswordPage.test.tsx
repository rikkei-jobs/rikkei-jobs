import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { authApi } from '../api/authApi';

vi.mock('../api/authApi', () => ({
  authApi: {
    forgotPassword: vi.fn(),
  },
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form and displays anti-enumeration feedback upon submission', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValueOnce({
      message: 'Yêu cầu đã được ghi nhận',
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText('Quên Mật Khẩu')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Email Doanh Nghiệp/i), {
      target: { value: 'hr1@rikkei.vn' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Gửi Liên Kết Khôi Phục/i }));

    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith({ email: 'hr1@rikkei.vn' });
      expect(screen.getByText(/Yêu cầu đã được ghi nhận!/i)).toBeInTheDocument();
      expect(screen.getByText(/hiệu lực 30 phút/i)).toBeInTheDocument();
    });
  });
});
