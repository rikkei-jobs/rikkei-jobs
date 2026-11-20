import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
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
      expect(ssoInput).toHaveAttribute(
        'aria-describedby',
        expect.stringContaining('sso-ticket-hint'),
      );

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
      expect(emailInput).toHaveAttribute(
        'aria-describedby',
        expect.stringContaining('forgot-email-hint'),
      );

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
      expect(newPassInput).toHaveAttribute(
        'aria-describedby',
        expect.stringContaining('change-password-rules'),
      );

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
      expect(newPassInput).toHaveAttribute(
        'aria-describedby',
        expect.stringContaining('reset-password-rules'),
      );

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

  describe('RoleHomeLayout Theme Toggle & Accessibility', () => {
    const originalMatchMedia = window.matchMedia;

    const mockHrUser: UserDto = {
      id: 42,
      email: 'hr.theme@rikkeisoft.com',
      fullName: 'Nguyễn Thị Minh',
      role: 'HR',
      companyId: 2,
      status: 'ACTIVE',
      mustChangePassword: false,
    };

    const installMatchMediaMock = (initialMatches: boolean) => {
      let currentMatches = initialMatches;
      const listeners = new Set<(event: MediaQueryListEvent) => void>();
      const addEventListener = vi.fn(
        (_type: string, listener: EventListenerOrEventListenerObject) => {
          if (typeof listener === 'function') {
            listeners.add(listener as (event: MediaQueryListEvent) => void);
          }
        },
      );
      const removeEventListener = vi.fn(
        (_type: string, listener: EventListenerOrEventListenerObject) => {
          if (typeof listener === 'function') {
            listeners.delete(listener as (event: MediaQueryListEvent) => void);
          }
        },
      );

      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          get matches() {
            return query === '(prefers-color-scheme: dark)' ? currentMatches : false;
          },
          media: query,
          onchange: null,
          addEventListener,
          removeEventListener,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      return {
        addEventListener,
        removeEventListener,
        triggerChange(nextMatches: boolean) {
          currentMatches = nextMatches;
          const event = { matches: nextMatches } as MediaQueryListEvent;
          listeners.forEach((listener) => listener(event));
        },
      };
    };

    const renderRoleHome = () =>
      render(
        <AuthProvider initialToken="fake-jwt" initialUser={mockHrUser}>
          <MemoryRouter>
            <RoleHomeLayout
              roleTitle="Cổng Doanh Nghiệp (HR)"
              roleBadgeClass="rj-role-hr"
              roleIcon="building"
              description="Quản lý hồ sơ doanh nghiệp"
            >
              <div>Nội dung trang</div>
            </RoleHomeLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.documentElement.removeAttribute('data-theme');
    });

    afterEach(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.documentElement.removeAttribute('data-theme');
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    });

    it('defaults to light mode when data-theme is unset and prefers-color-scheme is not dark', () => {
      installMatchMediaMock(false);
      renderRoleHome();

      const toggleButton = screen.getByRole('button', { name: 'Chuyển sang chế độ tối' });
      expect(toggleButton).toHaveAttribute('type', 'button');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
      expect(toggleButton).toHaveTextContent('Chế độ tối');
      expect(toggleButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(screen.getByRole('button', { name: /Đăng Xuất/i })).toBeInTheDocument();
    });

    it('falls back to dark mode when data-theme is unset and prefers-color-scheme: dark matches', () => {
      installMatchMediaMock(true);
      renderRoleHome();

      const toggleButton = screen.getByRole('button', { name: 'Chuyển sang chế độ sáng' });
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
      expect(toggleButton).toHaveTextContent('Chế độ sáng');
    });

    it('prioritizes explicit data-theme attribute over prefers-color-scheme', () => {
      installMatchMediaMock(true);
      document.documentElement.setAttribute('data-theme', 'light');
      const { unmount } = renderRoleHome();

      expect(screen.getByRole('button', { name: 'Chuyển sang chế độ tối' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      unmount();

      installMatchMediaMock(false);
      document.documentElement.setAttribute('data-theme', 'dark');
      renderRoleHome();

      expect(screen.getByRole('button', { name: 'Chuyển sang chế độ sáng' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('toggles data-theme on documentElement and updates aria-pressed and aria-label on click', () => {
      installMatchMediaMock(false);
      renderRoleHome();

      const toDarkButton = screen.getByRole('button', { name: 'Chuyển sang chế độ tối' });
      fireEvent.click(toDarkButton);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      const toLightButton = screen.getByRole('button', { name: 'Chuyển sang chế độ sáng' });
      expect(toLightButton).toHaveAttribute('aria-pressed', 'true');
      expect(toLightButton).toHaveTextContent('Chế độ sáng');

      fireEvent.click(toLightButton);

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      const backToDarkButton = screen.getByRole('button', { name: 'Chuyển sang chế độ tối' });
      expect(backToDarkButton).toHaveAttribute('aria-pressed', 'false');
      expect(backToDarkButton).toHaveTextContent('Chế độ tối');
    });

    it('follows prefers-color-scheme changes only while data-theme is unset and cleans up listener', () => {
      const mediaMock = installMatchMediaMock(false);
      const { unmount } = renderRoleHome();

      act(() => {
        mediaMock.triggerChange(true);
      });
      expect(screen.getByRole('button', { name: 'Chuyển sang chế độ sáng' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang chế độ sáng' }));
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      act(() => {
        mediaMock.triggerChange(true);
      });
      expect(screen.getByRole('button', { name: 'Chuyển sang chế độ tối' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );

      unmount();
      expect(mediaMock.removeEventListener).toHaveBeenCalledTimes(1);
    });

    it('toggles theme cleanly without persisting preference to localStorage, sessionStorage, or cookies', () => {
      installMatchMediaMock(false);
      const { unmount } = renderRoleHome();

      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(document.cookie).toBe('');

      const toDarkButton = screen.getByRole('button', { name: 'Chuyển sang chế độ tối' });
      expect(toDarkButton).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(toDarkButton);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      const toLightButton = screen.getByRole('button', { name: 'Chuyển sang chế độ sáng' });
      expect(toLightButton).toHaveAttribute('aria-pressed', 'true');
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(document.cookie).toBe('');

      fireEvent.click(toLightButton);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(screen.getByRole('button', { name: 'Chuyển sang chế độ tối' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(document.cookie).toBe('');

      // Toggle back to dark, then simulate fresh page reload (unmount + DOM attribute reset)
      fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang chế độ tối' }));
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(screen.getByRole('button', { name: 'Chuyển sang chế độ sáng' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      unmount();
      document.documentElement.removeAttribute('data-theme');
      renderRoleHome();

      expect(screen.getByRole('button', { name: 'Chuyển sang chế độ tối' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(document.cookie).toBe('');
    });
  });
});
