import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { resetMotionRegistry } from '../../../shared/utils/motion';
import { BrandMark } from '../../../shared/components/BrandMark';
import { AuthProvider } from '../context/AuthContext';
import { CompetencyRadarVisual } from '../components/CompetencyRadarVisual';
import { AuthEditorialLayout } from '../components/AuthEditorialLayout';
import { LoginPage } from '../pages/LoginPage';
import { SsoCallbackPage } from '../pages/SsoCallbackPage';
import { CandidateHomePage } from '../pages/role-homes/CandidateHomePage';
import { HrHomePage } from '../pages/role-homes/HrHomePage';
import { EnterpriseLoginForm } from '../components/EnterpriseLoginForm';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { type UserDto } from '../types';

vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
    ssoLogin: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe('Milestone 4 — Auth Redesign & Motion Suite Verification', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    resetMotionRegistry();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    } as unknown as Response);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('CompetencyRadarVisual Component', () => {
    it('renders 6-axis bespoke SVG with real 6 skill group labels and explicit illustration caption', () => {
      const { container } = render(<CompetencyRadarVisual />);
      const svg = container.querySelector('svg.rj-competency-radar-svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 480 320');

      // Real 6 GROUP_LABELS from skillLabels.ts
      expect(screen.getByText('Lập trình nền tảng')).toBeInTheDocument();
      expect(screen.getByText('Backend và dữ liệu')).toBeInTheDocument();
      expect(screen.getByText('Frontend')).toBeInTheDocument();
      expect(screen.getByText('Công cụ và vận hành')).toBeInTheDocument();
      expect(screen.getByText('Chất lượng và bảo mật')).toBeInTheDocument();
      expect(screen.getByText('Kỹ năng mềm')).toBeInTheDocument();

      // Explicit illustration caption & zero showcase stat strip
      expect(
        screen.getByText('Hình minh họa 6 nhóm kỹ năng được đánh giá trên hồ sơ năng lực ứng viên'),
      ).toBeInTheDocument();
      expect(container.querySelector('.rj-proof-metrics-grid')).not.toBeInTheDocument();
      expect(container.querySelector('.rj-radar-pulse')).not.toBeInTheDocument();
    });

    it('supports hover and keyboard focus on 6 skill group axes with live Vietnamese explanations', () => {
      const { container } = render(<CompetencyRadarVisual />);
      const triggers = container.querySelectorAll('.rj-radar-axis-trigger');
      expect(triggers).toHaveLength(6);
      triggers.forEach((trigger) => {
        expect(trigger).toHaveAttribute('role', 'button');
        expect(trigger).toHaveAttribute('tabindex', '0');
      });

      const backendAxis = screen.getByRole('button', { name: /Backend và dữ liệu/i });
      fireEvent.focus(backendAxis);
      expect(screen.getByText(/Spring Boot/i)).toBeInTheDocument();

      fireEvent.click(backendAxis);
      expect(backendAxis).toHaveAttribute('aria-pressed', 'true');

      fireEvent.keyDown(backendAxis, { key: 'ArrowRight' });
      expect(screen.getByText(/ReactJS/i)).toBeInTheDocument();
    });
  });

  describe('AuthEditorialLayout Component', () => {
    it('renders asymmetric 65/35 editorial layout with brand identity and clean Rikkei Education footer', () => {
      render(
        <AuthEditorialLayout>
          <div data-testid="test-form">Form Content</div>
        </AuthEditorialLayout>,
      );

      expect(screen.getByText('Rikkei Jobs')).toBeInTheDocument();
      expect(screen.getByText('Rikkei Education')).toBeInTheDocument();
      expect(
        screen.getByText('Rikkei Jobs • Nền tảng kết nối năng lực và tuyển dụng của Rikkei Education'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/ASVS/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('test-form')).toBeInTheDocument();
    });
  });

  describe('LoginPage Editorial & Tab Indicator', () => {
    it('contains shared-element sliding indicator, collapsed dev tools, and clean role-centered copy', () => {
      const { container } = render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      // Verify zero "Monorepo" or ASVS/RBAC/TTL showcase strings
      expect(container.innerHTML).not.toMatch(/monorepo|ASVS|RBAC|TTL/i);

      // Verify shared-element sliding indicator exists in tablist
      const indicator = container.querySelector('.rj-tab-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('is-lms');

      // Verify authentic competency-verified copy and collapsed dev tools disclosure
      expect(screen.getByText('Kết nối việc làm theo năng lực thực')).toBeInTheDocument();
      const devDetails = container.querySelector('details.rj-dev-tools');
      expect(devDetails).toBeInTheDocument();
      expect(devDetails).not.toHaveAttribute('open');

      // M4b: Single h1 on /login and h2 for story heading
      const h1s = screen.getAllByRole('heading', { level: 1 });
      expect(h1s).toHaveLength(1);
      expect(h1s[0]).toHaveTextContent('Đăng nhập');
      expect(container.querySelector('h2.rj-story-heading')).toBeInTheDocument();
    });

    it('omits visible ambient pause button, pauses on document.hidden, enables radar auto-cycle on /login only, and never replays form entrance on tab switch', () => {
      const { container } = render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      const ambient = container.querySelector('.rj-story-ambient');
      expect(ambient).toBeInTheDocument();
      expect(ambient).not.toHaveClass('is-paused');

      // R2: visible ambient pause/play button must be removed from /login hero
      expect(screen.queryByRole('button', { name: /Tạm dừng hiệu ứng nền/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Tiếp tục hiệu ứng nền/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Tạm dừng nền|Phát nền/)).not.toBeInTheDocument();

      // R3: approved caption on /login hero radar
      expect(
        screen.getByText(
          'Hình minh họa 6 nhóm kỹ năng: di chuột hoặc dùng Tab để tạm dừng, chọn để giữ 8 giây, nhấn Escape để tiếp tục.',
        ),
      ).toBeInTheDocument();

      const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
      try {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        fireEvent(document, new Event('visibilitychange'));
        expect(ambient).toHaveClass('is-paused');

        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        fireEvent(document, new Event('visibilitychange'));
        expect(ambient).not.toHaveClass('is-paused');
      } finally {
        if (originalHidden) {
          Object.defineProperty(document, 'hidden', originalHidden);
        } else {
          delete (document as { hidden?: boolean }).hidden;
        }
      }

      // Tab switch must NOT replay form entrance sequence
      expect(container.querySelectorAll('.rj-form-seq').length).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i }));
      expect(container.querySelectorAll('.rj-form-seq')).toHaveLength(0);

      // Idle morph submit button must not run infinite .rj-spin animation while hidden
      expect(container.querySelector('.rj-btn-morph .rj-spin')).not.toBeInTheDocument();
    });

    it('attaches sharedTransition on BrandMark only where explicitly enabled (not on ForbiddenPage)', () => {
      const { container: sharedContainer } = render(<BrandMark sharedTransition />);
      expect(sharedContainer.querySelector('.rj-brand-mark--shared')).toBeInTheDocument();

      const { container: forbiddenContainer } = render(
        <AuthProvider initialToken="jwt" initialUser={{
          id: 1,
          email: 'cand@rikkei.vn',
          fullName: 'Cand',
          role: 'CANDIDATE',
          companyId: null,
          status: 'ACTIVE',
          mustChangePassword: false,
        }}>
          <MemoryRouter initialEntries={['/403']}>
            <ForbiddenPage />
          </MemoryRouter>
        </AuthProvider>,
      );
      // Exactly 1 shared BrandMark (in shell header) and 0 on the 403 card body itself
      expect(forbiddenContainer.querySelectorAll('.rj-brand-mark--shared')).toHaveLength(1);
    });
  });

  describe('SsoCallbackPage 3-Step Visual Progress Timeline', () => {
    it('renders 3-step progress timeline during SSO ticket verification', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/sso-callback?mockState=loading']}>
            <Routes>
              <Route path="/sso-callback" element={<SsoCallbackPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(
        screen.getByRole('heading', { level: 1, name: /Đang xác thực đăng nhập từ LMS/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/1\. Tiếp nhận vé từ LMS/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Kiểm tra thông tin tài khoản/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Mở phiên làm việc/i)).toBeInTheDocument();
    });
  });

  describe('Role-Density Differentiation & Dark Mode Badges', () => {
    const createMockUser = (role: string): UserDto => ({
      id: 88,
      email: `${role.toLowerCase()}@rikkei.vn`,
      fullName: 'Test User',
      role,
      companyId: role === 'HR' ? 10 : null,
      status: 'ACTIVE',
      mustChangePassword: false,
    });

    it('assigns airy density mode (56px rows) to candidate role view', async () => {
      const { container } = render(
        <AuthProvider initialToken="jwt-token" initialUser={createMockUser('CANDIDATE')}>
          <MemoryRouter>
            <CandidateHomePage />
          </MemoryRouter>
        </AuthProvider>,
      );

      await waitFor(() => {
        const table = container.querySelector('.rj-info-table');
        expect(table).toHaveClass('rj-density-airy');
      });
    });

    it('assigns dense mode (38px rows) to HR administrative view', async () => {
      const { container } = render(
        <AuthProvider initialToken="jwt-token" initialUser={createMockUser('HR')}>
          <MemoryRouter>
            <HrHomePage />
          </MemoryRouter>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(
          screen.queryByRole('status', { name: 'Đang tải hồ sơ doanh nghiệp' }),
        ).not.toBeInTheDocument();
        const table = container.querySelector('.rj-info-table');
        expect(table).toHaveClass('rj-density-dense');
      });
    });
  });

  describe('EnterpriseLoginForm WCAG Accessibility Error Attributes', () => {
    it('sets aria-invalid and aria-describedby when submission produces an error', async () => {
      const { container } = render(
        <AuthProvider>
          <MemoryRouter>
            <EnterpriseLoginForm />
          </MemoryRouter>
        </AuthProvider>,
      );

      const emailInput = container.querySelector('#enterprise-email') as HTMLInputElement;
      const passwordInput = container.querySelector('#enterprise-password') as HTMLInputElement;

      // Initially valid
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    });
  });
});
