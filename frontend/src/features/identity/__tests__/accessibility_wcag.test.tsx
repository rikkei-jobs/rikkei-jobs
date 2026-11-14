import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { SsoCallbackPage } from '../pages/SsoCallbackPage';
import { PasswordField } from '../components/PasswordField';
import { RoleHomeLayout } from '../pages/role-homes/RoleHomeLayout';
import type { UserDto } from '../types';

describe('WCAG 2.2 AA & Responsive Remediations (Iteration 2)', () => {
  describe('Touch Targets and Accessible Names', () => {
    it('ensures PasswordField associates label with input and supports labelAction', () => {
      render(
        <PasswordField
          id="custom-password"
          label="Mật Khẩu Tùy Chọn"
          labelAction={<a href="#help">Trợ giúp?</a>}
        />,
      );

      const input = screen.getByLabelText('Mật Khẩu Tùy Chọn');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'custom-password');
      expect(screen.getByRole('link', { name: 'Trợ giúp?' })).toBeInTheDocument();

      const toggleBtn = screen.getByRole('button', { name: 'Hiện mật khẩu' });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveClass('rj-input-toggle');
    });

    it('ensures enterprise password field in LoginPage has accessible name "Mật Khẩu"', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login?tab=enterprise']}>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      const emailInput = screen.getByLabelText(/Email Doanh Nghiệp/i);
      const passwordInput = screen.getByLabelText(/^Mật Khẩu$/i);
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('id', 'enterprise-password');
      expect(screen.getByRole('link', { name: /Quên mật khẩu\?/i })).toBeInTheDocument();
    });
  });

  describe('ARIA Describedby Associations', () => {
    it('associates aria-describedby for helper hint on sso-ticket input in LMS login form', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login?tab=lms']}>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      const ssoInput = screen.getByLabelText(/Mã vé SSO/i);
      expect(ssoInput).toBeInTheDocument();
      expect(ssoInput).toHaveAttribute('aria-describedby', expect.stringContaining('sso-ticket-hint'));

      const hintEl = document.getElementById('sso-ticket-hint');
      expect(hintEl).toBeInTheDocument();
      expect(hintEl).toHaveTextContent(/Vé SSO có thời hạn sử dụng 60 giây/i);
    });

    it('associates aria-describedby for helper hint on forgot-email input', () => {
      render(
        <AuthProvider>
          <MemoryRouter>
            <ForgotPasswordPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      const emailInput = screen.getByLabelText(/Email Doanh Nghiệp/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('aria-describedby', expect.stringContaining('forgot-email-hint'));

      const hintEl = document.getElementById('forgot-email-hint');
      expect(hintEl).toBeInTheDocument();
      expect(hintEl).toHaveTextContent(/Hệ thống sẽ gửi mã xác thực an toàn/i);
    });

    it('associates aria-describedby for password checklist on ChangePasswordPage', () => {
      const mockUser: UserDto = {
        id: 1,
        email: 'hr@example.com',
        fullName: 'HR Test',
        role: 'HR',
        companyId: 10,
        status: 'ACTIVE',
        mustChangePassword: true,
      };

      render(
        <AuthProvider initialToken="fake-jwt" initialUser={mockUser}>
          <MemoryRouter>
            <ChangePasswordPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      const newPassInput = screen.getByLabelText(/^Mật Khẩu Mới$/i);
      expect(newPassInput).toBeInTheDocument();
      expect(newPassInput).toHaveAttribute('aria-describedby', expect.stringContaining('change-password-rules'));

      const rulesEl = document.getElementById('change-password-rules');
      expect(rulesEl).toBeInTheDocument();
      expect(rulesEl).toHaveAttribute('role', 'region');
    });

    it('associates aria-describedby for password checklist on ResetPasswordPage', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/reset-password/valid-test-token']}>
            <Routes>
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      const newPassInput = screen.getByLabelText(/^Mật Khẩu Mới$/i);
      expect(newPassInput).toBeInTheDocument();
      expect(newPassInput).toHaveAttribute('aria-describedby', expect.stringContaining('reset-password-rules'));

      const rulesEl = document.getElementById('reset-password-rules');
      expect(rulesEl).toBeInTheDocument();
    });
  });

  describe('Live Regions and Alert Semantics', () => {
    it('ensures missing token alert in ResetPasswordPage has role="alert" and aria-live="assertive"', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/reset-password/']}>
            <Routes>
              <Route path="/reset-password/" element={<ResetPasswordPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveTextContent(/Mã token xác thực không tìm thấy/i);
    });

    it('ensures error alert in SsoCallbackPage has role="alert" and aria-live="assertive"', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/sso-callback']}>
            <SsoCallbackPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('Dashboard Navigation Structure for Mobile Viewports', () => {
    it('renders RoleHomeLayout with .rj-user-profile and .rj-user-name classes', () => {
      const mockCandidate: UserDto = {
        id: 99,
        email: 'candidate@example.com',
        fullName: 'Nguyễn Văn Sinh Viên Rất Dài',
        role: 'CANDIDATE',
        companyId: null,
        status: 'ACTIVE',
        mustChangePassword: false,
      };

      render(
        <AuthProvider initialToken="fake-jwt" initialUser={mockCandidate}>
          <MemoryRouter>
            <RoleHomeLayout
              roleTitle="Cổng Ứng Viên"
              roleBadgeClass="rj-role-candidate"
              roleIcon="user"
              description="Dành cho ứng viên tra cứu việc làm"
            >
              <div>Dashboard Body</div>
            </RoleHomeLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const userProfile = document.querySelector('.rj-user-profile');
      expect(userProfile).toBeInTheDocument();

      const userName = document.querySelector('.rj-user-name');
      expect(userName).toBeInTheDocument();
      expect(userName).toHaveTextContent('Nguyễn Văn Sinh Viên Rất Dài');
    });
  });
});
