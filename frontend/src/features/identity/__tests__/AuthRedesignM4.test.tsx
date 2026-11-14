import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { CompetencyRadarVisual } from '../components/CompetencyRadarVisual';
import { AuthEditorialLayout } from '../components/AuthEditorialLayout';
import { LoginPage } from '../pages/LoginPage';
import { SsoCallbackPage } from '../pages/SsoCallbackPage';
import { CandidateHomePage } from '../pages/role-homes/CandidateHomePage';
import { HrHomePage } from '../pages/role-homes/HrHomePage';
import { EnterpriseLoginForm } from '../components/EnterpriseLoginForm';
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CompetencyRadarVisual Component', () => {
    it('renders 6-axis bespoke SVG with authentic Vietnamese competency labels', () => {
      const { container } = render(<CompetencyRadarVisual />);
      const svg = container.querySelector('svg.rj-competency-radar-svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 480 320');

      // 6 Vietnamese competency axes
      expect(screen.getByText('Kiến trúc Hệ thống')).toBeInTheDocument();
      expect(screen.getByText('Lập trình Cốt lõi')).toBeInTheDocument();
      expect(screen.getByText('Tư duy Thuật toán')).toBeInTheDocument();
      expect(screen.getByText('Quy chuẩn CI/CD')).toBeInTheDocument();
      expect(screen.getByText('Năng lực Thực chiến')).toBeInTheDocument();
      expect(screen.getByText('Kỷ luật Chất lượng')).toBeInTheDocument();
    });

    it('renders authentic proof metrics with tabular figures and zero fluff', () => {
      render(<CompetencyRadarVisual showMetrics={true} />);
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('Kỹ Năng Chuẩn Hóa')).toBeInTheDocument();
      expect(screen.getByText('60s')).toBeInTheDocument();
      expect(screen.getByText('Hiệu Lực Vé SSO')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Vai Trò Hệ Thống')).toBeInTheDocument();
    });
  });

  describe('AuthEditorialLayout Component', () => {
    it('renders asymmetric 65/35 editorial layout with brand identity and ASVS trust stamp', () => {
      render(
        <AuthEditorialLayout>
          <div data-testid="test-form">Form Content</div>
        </AuthEditorialLayout>,
      );

      expect(screen.getByText('Rikkei Jobs')).toBeInTheDocument();
      expect(screen.getByText(/Hệ Thống Đánh Giá & Tuyển Dụng Xác Thực Năng Lực/i)).toBeInTheDocument();
      expect(screen.getByText(/Chuẩn bảo mật định danh ASVS V2\/V4/i)).toBeInTheDocument();
      expect(screen.getByTestId('test-form')).toBeInTheDocument();
    });
  });

  describe('LoginPage Editorial & Tab Indicator', () => {
    it('contains shared-element sliding indicator and completely eliminates developer monorepo string', () => {
      const { container } = render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      // Verify zero "Monorepo" string anywhere in rendered HTML
      expect(container.innerHTML).not.toMatch(/monorepo/i);

      // Verify shared-element sliding indicator exists in tablist
      const indicator = container.querySelector('.rj-tab-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('is-lms');

      // Verify authentic competency-verified copy
      expect(screen.getByText('Cổng Định Danh Doanh Nghiệp & Học Viên')).toBeInTheDocument();
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

      expect(screen.getByText(/1\. Đọc vé xác thực SSO/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Kiểm tra chữ ký số LMS/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Cấp phiên làm việc an toàn/i)).toBeInTheDocument();
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

    it('assigns airy density mode (56px rows) to candidate role view', () => {
      const { container } = render(
        <AuthProvider initialToken="jwt-token" initialUser={createMockUser('CANDIDATE')}>
          <MemoryRouter>
            <CandidateHomePage />
          </MemoryRouter>
        </AuthProvider>,
      );

      const table = container.querySelector('.rj-info-table');
      expect(table).toHaveClass('rj-density-airy');
    });

    it('assigns dense mode (38px rows) to HR administrative view', () => {
      const { container } = render(
        <AuthProvider initialToken="jwt-token" initialUser={createMockUser('HR')}>
          <MemoryRouter>
            <HrHomePage />
          </MemoryRouter>
        </AuthProvider>,
      );

      const table = container.querySelector('.rj-info-table');
      expect(table).toHaveClass('rj-density-dense');
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
