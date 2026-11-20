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

      const ssoInput = screen.getByLabelText(/Mã vé đăng nhập từ LMS/i);
      expect(ssoInput).toBeInTheDocument();
      expect(ssoInput).toHaveAttribute(
        'aria-describedby',
        expect.stringContaining('sso-ticket-hint'),
      );

      const hintEl = document.getElementById('sso-ticket-hint');
      expect(hintEl).toBeInTheDocument();
      expect(hintEl).toHaveTextContent(/Vé đăng nhập chỉ dùng một lần và hết hạn sau 60 giây/i);
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
      expect(hintEl).toHaveTextContent(/Hệ thống sẽ gửi liên kết đặt lại mật khẩu/i);
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
      expect(alert).toHaveTextContent(/Không tìm thấy mã đặt lại mật khẩu/i);
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

      const switchControl = screen.getByRole('switch', { name: 'Chế độ tối' });
      expect(switchControl).toHaveAttribute('type', 'button');
      expect(switchControl).toHaveAttribute('aria-checked', 'false');
      expect(switchControl.textContent).toBe('');
      const svgs = switchControl.querySelectorAll('svg');
      expect(svgs).toHaveLength(2);
      svgs.forEach((svg) => expect(svg).toHaveAttribute('aria-hidden', 'true'));
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(screen.getByRole('button', { name: /Đăng xuất/i })).toBeInTheDocument();
    });

    it('falls back to dark mode when data-theme is unset and prefers-color-scheme: dark matches', () => {
      installMatchMediaMock(true);
      renderRoleHome();

      const switchControl = screen.getByRole('switch', { name: 'Chế độ tối' });
      expect(switchControl).toHaveAttribute('aria-checked', 'true');
      expect(switchControl.textContent).toBe('');
    });

    it('prioritizes explicit data-theme attribute over prefers-color-scheme', () => {
      installMatchMediaMock(true);
      document.documentElement.setAttribute('data-theme', 'light');
      const { unmount } = renderRoleHome();

      expect(screen.getByRole('switch', { name: 'Chế độ tối' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      unmount();

      installMatchMediaMock(false);
      document.documentElement.setAttribute('data-theme', 'dark');
      renderRoleHome();

      expect(screen.getByRole('switch', { name: 'Chế độ tối' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('toggles data-theme on documentElement and updates aria-checked while keeping static aria-label="Chế độ tối"', () => {
      installMatchMediaMock(false);
      renderRoleHome();

      const switchControl = screen.getByRole('switch', { name: 'Chế độ tối' });
      fireEvent.click(switchControl);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(switchControl).toHaveAttribute('aria-checked', 'true');
      expect(switchControl).toHaveAttribute('aria-label', 'Chế độ tối');

      fireEvent.click(switchControl);

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(switchControl).toHaveAttribute('aria-checked', 'false');
      expect(switchControl).toHaveAttribute('aria-label', 'Chế độ tối');
    });

    it('supports Space and Enter keyboard activation and Escape-dismissible tooltip on the theme switch', () => {
      installMatchMediaMock(false);
      renderRoleHome();

      const switchControl = screen.getByRole('switch', { name: 'Chế độ tối' });
      act(() => {
        switchControl.focus();
      });
      expect(screen.getByRole('tooltip')).toHaveTextContent('Chế độ tối');

      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(switchControl).toHaveFocus();

      // Native <button type="button" role="switch"> toggles via click dispatched by Space/Enter in browsers; verify keyDown+click behavior
      fireEvent.keyDown(switchControl, { key: ' ', code: 'Space' });
      fireEvent.click(switchControl);
      expect(switchControl).toHaveAttribute('aria-checked', 'true');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      fireEvent.keyDown(switchControl, { key: 'Enter', code: 'Enter' });
      fireEvent.click(switchControl);
      expect(switchControl).toHaveAttribute('aria-checked', 'false');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('follows prefers-color-scheme changes only while data-theme is unset and cleans up listener', () => {
      const mediaMock = installMatchMediaMock(false);
      const { unmount } = renderRoleHome();

      act(() => {
        mediaMock.triggerChange(true);
      });
      expect(screen.getByRole('switch', { name: 'Chế độ tối' })).toHaveAttribute(
        'aria-checked',
        'true',
      );

      fireEvent.click(screen.getByRole('switch', { name: 'Chế độ tối' }));
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      act(() => {
        mediaMock.triggerChange(true);
      });
      expect(screen.getByRole('switch', { name: 'Chế độ tối' })).toHaveAttribute(
        'aria-checked',
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

      const switchControl = screen.getByRole('switch', { name: 'Chế độ tối' });
      expect(switchControl).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(switchControl);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(switchControl).toHaveAttribute('aria-checked', 'true');
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(document.cookie).toBe('');

      fireEvent.click(switchControl);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(switchControl).toHaveAttribute('aria-checked', 'false');
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(document.cookie).toBe('');

      // Toggle back to dark, then simulate fresh page reload (unmount + DOM attribute reset)
      fireEvent.click(switchControl);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(switchControl).toHaveAttribute('aria-checked', 'true');

      unmount();
      document.documentElement.removeAttribute('data-theme');
      renderRoleHome();

      expect(screen.getByRole('switch', { name: 'Chế độ tối' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(document.cookie).toBe('');
    });

    it('handles two rapid clicks before deferred startViewTransition callbacks execute cleanly (light -> dark -> light)', async () => {
      installMatchMediaMock(false);
      const originalStartVT = (document as unknown as Record<string, unknown>).startViewTransition;
      const unhandled: unknown[] = [];
      const onWindowRejection = (event: PromiseRejectionEvent) => {
        unhandled.push(event.reason);
      };
      window.addEventListener('unhandledrejection', onWindowRejection);

      const pendingCallbacks: Array<{
        cb: () => void;
        resolveReady: () => void;
        resolveFinished: () => void;
      }> = [];

      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: vi.fn((cb: () => void) => {
          let resolveReady!: () => void;
          let resolveFinished!: () => void;
          const ready = new Promise<void>((res) => {
            resolveReady = res;
          });
          const finished = new Promise<void>((res) => {
            resolveFinished = res;
          });
          pendingCallbacks.push({ cb, resolveReady, resolveFinished });
          return {
            ready,
            updateCallbackDone: Promise.resolve(),
            finished,
          };
        }),
      });

      try {
        renderRoleHome();
        const switchControl = screen.getByRole('switch', { name: 'Chế độ tối' });
        expect(switchControl).toHaveAttribute('aria-checked', 'false');
        expect(document.documentElement.getAttribute('data-theme')).toBeNull();

        fireEvent.click(switchControl);
        fireEvent.click(switchControl);
        expect(pendingCallbacks).toHaveLength(2);

        await act(async () => {
          pendingCallbacks[0].cb();
        });
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(switchControl).toHaveAttribute('aria-checked', 'true');

        await act(async () => {
          pendingCallbacks[1].cb();
          pendingCallbacks.forEach((entry) => {
            entry.resolveReady();
            entry.resolveFinished();
          });
          await Promise.resolve();
        });

        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(switchControl).toHaveAttribute('aria-checked', 'false');
        expect(document.documentElement.classList.contains('rj-theme-transition')).toBe(false);
        expect(unhandled).toHaveLength(0);
      } finally {
        window.removeEventListener('unhandledrejection', onWindowRejection);
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          writable: true,
          value: originalStartVT,
        });
      }
    });
  });
});
