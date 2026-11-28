import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';
import { resetMotionRegistry } from '../../../shared/utils/motion';
import { resetScrollLockForTests } from '../../../shared/utils/scrollLock';
import { AuthProvider } from '../context/AuthContext';
import { ROLE_MENU_CONFIG, getRoleMenuItems } from '../config/roleMenuConfig';
import {
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  SharedAppLayout,
} from '../components/SharedAppLayout';
import { CandidateJobsPage } from '../pages/role-homes/CandidateJobsPage';
import { AppRoutes } from '../../../App';
import { type UserDto } from '../types';

vi.mock('../../candidate/api/jobRecommendations', () => ({
  fetchJobRecommendations: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    candidateId: 1,
    isCached: false,
    cachedAt: '2026-11-11T00:00:00Z',
    activeProvider: 'MOCK',
  }),
}));

const createUser = (role: string, overrides: Partial<UserDto> = {}): UserDto => ({
  id: 101,
  email: `${role.toLowerCase()}@rikkei.vn`,
  fullName: `Người dùng ${role}`,
  role,
  companyId: role === 'HR' ? 1 : null,
  status: 'ACTIVE',
  mustChangePassword: false,
  ...overrides,
});

const LocationDisplay = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="current-location">{`${location.pathname}${location.search}${location.hash}`}</div>
      <div data-testid="current-location-state">{JSON.stringify(location.state)}</div>
    </div>
  );
};

const HistoryNavigationControls = () => {
  const navigate = useNavigate();
  return (
    <div>
      <button type="button" onClick={() => navigate(-1)}>
        Quay lại
      </button>
      <button type="button" onClick={() => navigate(1)}>
        Tiến tới
      </button>
    </div>
  );
};

const PortaledModalHost = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    cancelBtnRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const first = cancelBtnRef.current;
        const last = confirmBtnRef.current;
        if (!first || !last) {
          return;
        }
        const active = document.activeElement as HTMLElement | null;
        const inside = active !== null && dialogRef.current.contains(active);
        if (event.shiftKey) {
          if (!inside || active === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (!inside || active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Mở hộp thoại
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Hộp thoại xác nhận"
          >
            <button ref={cancelBtnRef} type="button" onClick={() => setIsOpen(false)}>
              Hủy bỏ
            </button>
            <button ref={confirmBtnRef} type="button" onClick={() => setIsOpen(false)}>
              Xác nhận
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
};

describe('roleMenuConfig & SharedAppLayout (F1 + D5)', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    resetMotionRegistry();
    resetScrollLockForTests();
    localStorage.clear();
    document.body.style.overflow = '';
    document.documentElement.removeAttribute('data-scroll-locked');
    document.documentElement.removeAttribute('data-theme');
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetScrollLockForTests();
    localStorage.clear();
    document.body.style.overflow = '';
    document.documentElement.removeAttribute('data-scroll-locked');
    document.documentElement.removeAttribute('data-theme');
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
  });

  describe('ROLE_MENU_CONFIG exact role definitions', () => {
    it('defines exact menu items for all 5 roles and returns empty array for unknown role', () => {
      expect(Object.keys(ROLE_MENU_CONFIG).sort()).toEqual([
        'ADMIN',
        'CANDIDATE',
        'HR',
        'MENTOR',
        'STAFF',
      ]);

      expect(getRoleMenuItems('CANDIDATE').map((i) => ({ label: i.label, path: i.path, disabled: Boolean(i.disabled) }))).toEqual([
        { label: 'Hồ sơ', path: '/candidate/skills', disabled: false },
        { label: 'Việc làm', path: '/candidate/jobs', disabled: false },
        { label: 'Ứng tuyển', path: '/candidate/applications', disabled: false },
        { label: 'Lộ trình', path: '/candidate/gap-analysis', disabled: false },
        { label: 'Thực tập IOC', path: '/candidate/internships', disabled: false },
        { label: 'Trợ lý AI', path: undefined, disabled: true },
      ]);

      expect(getRoleMenuItems('HR').map((i) => ({ label: i.label, path: i.path, disabled: Boolean(i.disabled) }))).toEqual([
        { label: 'Công ty', path: '/hr/company', disabled: false },
        { label: 'JD', path: undefined, disabled: true },
        { label: 'Tuyển dụng', path: '/hr/recruitment', disabled: false },
        { label: 'Thực tập sinh', path: undefined, disabled: true },
      ]);

      expect(getRoleMenuItems('MENTOR').map((i) => ({ label: i.label, disabled: Boolean(i.disabled) }))).toEqual([
        { label: 'Cần đánh giá', disabled: true },
      ]);

      expect(getRoleMenuItems('STAFF').map((i) => ({ label: i.label, path: i.path, disabled: Boolean(i.disabled) }))).toEqual([
        { label: 'Hồ sơ ứng tuyển', path: '/staff/applications', disabled: false },
        { label: 'Đồng bộ dữ liệu', path: '/staff/data-sync', disabled: false },
        { label: 'Duyệt hồ sơ', path: undefined, disabled: true },
        { label: 'Duyệt JD', path: undefined, disabled: true },
        { label: 'Doanh nghiệp', path: undefined, disabled: true },
        { label: 'Ghép thực tập', path: undefined, disabled: true },
        { label: 'Báo cáo', path: undefined, disabled: true },
      ]);

      expect(getRoleMenuItems('ADMIN').map((i) => ({ label: i.label, disabled: Boolean(i.disabled) }))).toEqual([
        { label: 'Cấu hình AI', disabled: false },
        { label: 'Nhật ký AI', disabled: false },
        { label: 'Quản trị', disabled: true },
      ]);

      expect(getRoleMenuItems('UNKNOWN')).toEqual([]);
      expect(getRoleMenuItems(null)).toEqual([]);
    });
  });

  describe('Role isolation, brand link, density, and disabled coming-soon behavior', () => {
    const roleScenarios = [
      {
        role: 'CANDIDATE',
        homePath: '/candidate',
        density: 'airy',
        badgeClass: 'rj-role-candidate',
        icon: 'user' as const,
        expectedItems: ['Hồ sơ', 'Việc làm', 'Ứng tuyển', 'Lộ trình', 'Thực tập IOC', 'Trợ lý AI'],
        forbiddenItems: ['Công ty', 'Duyệt hồ sơ', 'Quản trị', 'Cần đánh giá'],
      },
      {
        role: 'HR',
        homePath: '/hr',
        density: 'dense',
        badgeClass: 'rj-role-hr',
        icon: 'building' as const,
        expectedItems: ['Công ty', 'JD', 'Tuyển dụng', 'Thực tập sinh'],
        forbiddenItems: ['Hồ sơ', 'Việc làm', 'Thực tập IOC', 'Duyệt hồ sơ', 'Quản trị', 'Cần đánh giá'],
      },
      {
        role: 'MENTOR',
        homePath: '/mentor',
        density: 'airy',
        badgeClass: 'rj-role-mentor',
        icon: 'graduation-cap' as const,
        expectedItems: ['Cần đánh giá'],
        forbiddenItems: ['Hồ sơ', 'Thực tập IOC', 'Công ty', 'Duyệt hồ sơ', 'Quản trị'],
      },
      {
        role: 'STAFF',
        homePath: '/staff',
        density: 'dense',
        badgeClass: 'rj-role-staff',
        icon: 'briefcase' as const,
        expectedItems: [
          'Hồ sơ ứng tuyển',
          'Đồng bộ dữ liệu',
          'Duyệt hồ sơ',
          'Duyệt JD',
          'Doanh nghiệp',
          'Ghép thực tập',
          'Báo cáo',
        ],
        forbiddenItems: ['Việc làm', 'Thực tập IOC', 'Công ty', 'Quản trị', 'Cần đánh giá'],
      },
      {
        role: 'ADMIN',
        homePath: '/admin',
        density: 'dense',
        badgeClass: 'rj-role-admin',
        icon: 'shield' as const,
        expectedItems: ['Cấu hình AI', 'Nhật ký AI', 'Quản trị'],
        forbiddenItems: ['Hồ sơ', 'Thực tập IOC', 'Công ty', 'Duyệt hồ sơ', 'Cần đánh giá'],
      },
    ];

    it.each(roleScenarios)(
      'renders only $role menu items, brand home link $homePath, and data-density="$density"',
      ({ role, homePath, density, badgeClass, icon, expectedItems, forbiddenItems }) => {
        const { container } = render(
          <AuthProvider initialToken="jwt" initialUser={createUser(role)}>
            <MemoryRouter initialEntries={[homePath]}>
              <SharedAppLayout roleBadgeClass={badgeClass} roleIcon={icon}>
                <div>Nội dung</div>
              </SharedAppLayout>
            </MemoryRouter>
          </AuthProvider>,
        );

        const dashboard = container.querySelector('.rj-dashboard');
        expect(dashboard).toHaveAttribute('data-density', density);

        const brandLink = screen.getByRole('link', { name: /^Rikkei Jobs$/i });
        expect(brandLink).toHaveAttribute('href', homePath);
        expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0);

        const nav = screen.getByRole('navigation', { name: /Điều hướng theo vai trò/i });
        const navLinks = within(nav).getAllByRole('link');
        expect(navLinks[0]).toHaveTextContent('Trang chủ');
        expect(navLinks[0]).toHaveAttribute('href', homePath);

        expectedItems.forEach((label) => {
          expect(nav).toHaveTextContent(label);
        });
        forbiddenItems.forEach((label) => {
          expect(nav).not.toHaveTextContent(label);
        });
      },
    );

    it.each([1280, 1024])(
      'renders disabled "Sắp ra mắt" items as non-focusable aria-disabled elements that do not navigate at %dpx',
      (viewportWidth) => {
        Object.defineProperty(window, 'innerWidth', {
          configurable: true,
          writable: true,
          value: viewportWidth,
        });

        render(
          <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
            <MemoryRouter initialEntries={['/candidate']}>
              <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
                <LocationDisplay />
              </SharedAppLayout>
            </MemoryRouter>
          </AuthProvider>,
        );

        const disabledItem = screen.getByText('Trợ lý AI').closest('[aria-disabled="true"]');
        expect(disabledItem).toBeInTheDocument();
        expect(disabledItem).toHaveAttribute('tabindex', '-1');
        expect(disabledItem?.tagName).not.toBe('A');
        expect(disabledItem).not.toHaveAttribute('href');
        expect(disabledItem).toHaveTextContent('Sắp ra mắt');

        fireEvent.click(disabledItem!);
        fireEvent.keyDown(disabledItem!, { key: 'Enter' });
        fireEvent.keyDown(disabledItem!, { key: ' ' });
        expect(screen.getByTestId('current-location')).toHaveTextContent('/candidate');
      },
    );

    it('marks active route link with aria-current="page" across home, sub-routes, detail routes, and /403', () => {
      const { unmount: unmountHome } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Trang chủ</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Việc làm' })).not.toHaveAttribute('aria-current');
      unmountHome();

      const { unmount: unmountJobs } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/jobs']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Việc làm</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const jobsLink = screen.getByRole('link', { name: 'Việc làm' });
      expect(jobsLink).toHaveAttribute('aria-current', 'page');
      expect(jobsLink).toHaveAttribute('href', '/candidate/jobs');
      expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current');
      expect(screen.getByRole('link', { name: 'Hồ sơ' })).not.toHaveAttribute('aria-current');
      unmountJobs();

      const { unmount: unmountJobDetail } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/jobs/42']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Chi tiết JD</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByRole('link', { name: 'Việc làm' })).toHaveAttribute('aria-current', 'page');
      unmountJobDetail();

      const { unmount: unmountInternships } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/internships']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Thực tập IOC</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const internshipsLink = screen.getByRole('link', { name: 'Thực tập IOC' });
      expect(internshipsLink).toHaveAttribute('aria-current', 'page');
      expect(internshipsLink).toHaveAttribute('href', '/candidate/internships');
      expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current');
      unmountInternships();

      const { unmount: unmountApplications } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/applications']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Ứng tuyển</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const applicationsLink = screen.getByRole('link', { name: 'Ứng tuyển' });
      expect(applicationsLink).toHaveAttribute('aria-current', 'page');
      expect(applicationsLink).toHaveAttribute('href', '/candidate/applications');
      expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current');
      unmountApplications();

      const { unmount: unmountApplicationDetailQuery } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/applications?id=42']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Chi tiết đơn ứng tuyển</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByRole('link', { name: 'Ứng tuyển' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      unmountApplicationDetailQuery();

      const { unmount: unmountHrCompany } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('HR')}>
          <MemoryRouter initialEntries={['/hr/company']}>
            <SharedAppLayout roleBadgeClass="rj-role-hr" roleIcon="building">
              <div>Hồ sơ công ty</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByRole('link', { name: 'Công ty' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current');
      unmountHrCompany();

      for (const hrRecPath of ['/hr/recruitment', '/hr/jobs/2/applications', '/hr/applications/10']) {
        const { unmount: unmountHrRec } = render(
          <AuthProvider initialToken="jwt" initialUser={createUser('HR')}>
            <MemoryRouter initialEntries={[hrRecPath]}>
              <SharedAppLayout roleBadgeClass="rj-role-hr" roleIcon="building">
                <div>Tuyển dụng HR</div>
              </SharedAppLayout>
            </MemoryRouter>
          </AuthProvider>,
        );
        expect(screen.getByRole('link', { name: 'Tuyển dụng' })).toHaveAttribute(
          'aria-current',
          'page',
        );
        expect(screen.getByRole('link', { name: 'Công ty' })).not.toHaveAttribute('aria-current');
        unmountHrRec();
      }

      for (const staffAppPath of ['/staff/applications', '/staff/applications/10']) {
        const { unmount: unmountStaffApp } = render(
          <AuthProvider initialToken="jwt" initialUser={createUser('STAFF')}>
            <MemoryRouter initialEntries={[staffAppPath]}>
              <SharedAppLayout roleBadgeClass="rj-role-staff" roleIcon="briefcase">
                <div>Hồ sơ ứng tuyển STAFF</div>
              </SharedAppLayout>
            </MemoryRouter>
          </AuthProvider>,
        );
        expect(screen.getByRole('link', { name: 'Hồ sơ ứng tuyển' })).toHaveAttribute(
          'aria-current',
          'page',
        );
        expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute(
          'aria-current',
        );
        unmountStaffApp();
      }

      render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/403']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>403</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const nav = screen.getByRole('navigation', { name: /Điều hướng theo vai trò/i });
      within(nav)
        .getAllByRole('link')
        .forEach((link) => {
          expect(link).not.toHaveAttribute('aria-current');
        });
    });
  });

  describe('F4 Responsive Breakpoints, Collapse/Expand, Persistence & Tooltips', () => {
    it.each([
      { width: 1440, expectedExpanded: 'true', expectedLabel: 'Thu gọn thanh điều hướng', className: 'is-expanded' },
      { width: 1024, expectedExpanded: 'false', expectedLabel: 'Mở rộng thanh điều hướng', className: 'is-collapsed' },
      { width: 768, expectedExpanded: 'false', expectedLabel: 'Mở rộng thanh điều hướng', className: 'is-collapsed' },
    ])(
      'sets default sidebar state at %dpx (aria-expanded=$expectedExpanded)',
      ({ width, expectedExpanded, expectedLabel, className }) => {
        Object.defineProperty(window, 'innerWidth', {
          configurable: true,
          writable: true,
          value: width,
        });

        const { container } = render(
          <AuthProvider initialToken="jwt" initialUser={createUser('HR')}>
            <MemoryRouter initialEntries={['/hr']}>
              <SharedAppLayout roleBadgeClass="rj-role-hr" roleIcon="building">
                <div>HR Home</div>
              </SharedAppLayout>
            </MemoryRouter>
          </AuthProvider>,
        );

        const sidebarToggle = screen.getByRole('button', { name: expectedLabel });
        expect(sidebarToggle).toHaveAttribute('type', 'button');
        expect(sidebarToggle).toHaveAttribute('aria-expanded', expectedExpanded);
        expect(screen.queryByRole('button', { name: /Mở menu điều hướng/i })).not.toBeInTheDocument();

        const aside = container.querySelector('aside.rj-sidebar');
        expect(aside).toBeInTheDocument();
        expect(aside).toHaveClass(className);
        expect(aside).toHaveAttribute('id', sidebarToggle.getAttribute('aria-controls')!);
      },
    );

    it('toggles desktop sidebar collapse/expand with aria-expanded, aria-controls, and Vietnamese labels', () => {
      const { container } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Nội dung</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const aside = container.querySelector('aside.rj-sidebar');
      const collapseBtn = screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' });
      expect(collapseBtn).toHaveAttribute('type', 'button');
      expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
      expect(collapseBtn.getAttribute('aria-controls')).toBe(aside?.getAttribute('id'));
      expect(aside).toHaveClass('is-expanded');

      fireEvent.click(collapseBtn);

      const expandBtn = screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' });
      expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
      expect(aside).toHaveClass('is-collapsed');

      fireEvent.click(expandBtn);

      expect(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(aside).toHaveClass('is-expanded');
    });

    it('persists desktop sidebar preference in localStorage only on user toggle and never on mount or theme toggle', () => {
      const { unmount } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Nội dung</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(localStorage.length).toBe(0);

      fireEvent.click(screen.getByRole('switch', { name: 'Chế độ tối' }));
      expect(localStorage.length).toBe(0);

      fireEvent.click(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' }));
      expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true');
      unmount();

      // Remounting at >= 1280px restores the persisted collapsed preference synchronously
      const { container } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Nội dung</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(container.querySelector('aside.rj-sidebar')).toHaveClass('is-collapsed');
    });

    it('honors stored expanded preference at 1024px tablet width on initial load', () => {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'false');
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 1024,
      });

      const { container } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('HR')}>
          <MemoryRouter initialEntries={['/hr']}>
            <SharedAppLayout roleBadgeClass="rj-role-hr" roleIcon="building">
              <div>HR</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(container.querySelector('aside.rj-sidebar')).toHaveClass('is-expanded');
    });

    it('falls back cleanly to viewport defaults when localStorage throws SecurityError/QuotaExceededError', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 1024,
      });

      const { container } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Fallback</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const expandBtn = screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' });
      expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
      expect(container.querySelector('aside.rj-sidebar')).toHaveClass('is-collapsed');

      fireEvent.click(expandBtn);
      expect(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(container.querySelector('aside.rj-sidebar')).toHaveClass('is-expanded');
    });

    it('renders M1a sidebar toggle as icon-only button with hover/focus tooltip and Escape dismiss in both expanded and collapsed states', () => {
      const { container } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Nội dung</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      // Expanded state (1280px default): icon-only DOM, zero visible text, no duplicate aria-describedby
      const toggleBtn = screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' });
      expect(toggleBtn.textContent).toBe('');
      expect(container.querySelector('.rj-sidebar-toggle-text')).not.toBeInTheDocument();
      expect(toggleBtn).not.toHaveAttribute('aria-describedby');
      const iconSvg = toggleBtn.querySelector('svg.rj-icon');
      expect(iconSvg).toBeInTheDocument();
      expect(iconSvg).toHaveAttribute('aria-hidden', 'true');

      // Keyboard focus opens tooltip in expanded state; Escape dismisses without moving focus
      act(() => {
        toggleBtn.focus();
      });
      expect(screen.getByRole('tooltip')).toHaveTextContent('Thu gọn thanh điều hướng');
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(toggleBtn).toHaveFocus();

      // Blur & hover in expanded state
      act(() => {
        toggleBtn.blur();
      });
      const toggleWrap = container.querySelector('.rj-sidebar-toggle-wrap')!;
      fireEvent.mouseEnter(toggleWrap);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Thu gọn thanh điều hướng');
      fireEvent.mouseLeave(toggleWrap);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Collapse sidebar -> same button keeps single icon element (transformed via CSS), updates aria-label
      fireEvent.click(toggleBtn);
      const collapsedBtn = screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' });
      expect(collapsedBtn).toBe(toggleBtn);
      expect(collapsedBtn).toHaveAttribute('aria-expanded', 'false');
      expect(collapsedBtn.querySelector('svg.rj-icon')).toBe(iconSvg);

      // Focus & hover tooltip in collapsed state + Escape dismiss
      act(() => {
        collapsedBtn.focus();
      });
      expect(screen.getByRole('tooltip')).toHaveTextContent('Mở rộng thanh điều hướng');
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(collapsedBtn).toHaveFocus();

      fireEvent.mouseEnter(toggleWrap);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Mở rộng thanh điều hướng');
      fireEvent.mouseLeave(toggleWrap);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('shows collapsed tooltip on hover and keyboard focus, dismisses on Escape without trapping focus, and shows Sắp ra mắt tooltip on disabled hover', () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 1024,
      });

      render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Nội dung</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const profileLink = screen.getByRole('link', { name: 'Hồ sơ' });
      expect(profileLink).not.toHaveAttribute('title');

      // Keyboard focus opens tooltip with accessible aria-describedby
      act(() => {
        profileLink.focus();
      });
      const focusTooltip = screen.getByRole('tooltip');
      expect(focusTooltip).toHaveTextContent('Hồ sơ');
      expect(profileLink).toHaveAttribute('aria-describedby', focusTooltip.getAttribute('id')!);

      // Escape closes tooltip without losing focus on the link
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(profileLink).toHaveFocus();

      // Blur dismisses tooltip as well
      fireEvent.focus(profileLink);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Hồ sơ');
      fireEvent.blur(profileLink);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Hover opens and leaves closes tooltip on enabled and disabled items
      fireEvent.mouseEnter(profileLink);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Hồ sơ');
      fireEvent.mouseLeave(profileLink);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      const disabledItem = screen.getByText('Trợ lý AI').closest('[aria-disabled="true"]')!;
      fireEvent.mouseEnter(disabledItem);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Trợ lý AI — Sắp ra mắt');
      fireEvent.mouseLeave(disabledItem);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('clears collapsed tooltip on programmatic Back/Forward navigation and keeps it closed when returning', () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 1024,
      });

      render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/jobs/2', '/candidate/jobs/1']} initialIndex={1}>
            <Routes>
              <Route
                path="/candidate/jobs/:jobId"
                element={
                  <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
                    <LocationDisplay />
                    <HistoryNavigationControls />
                  </SharedAppLayout>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-location')).toHaveTextContent('/candidate/jobs/1');
      const profileLink = screen.getByRole('link', { name: 'Hồ sơ' });
      fireEvent.mouseEnter(profileLink);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Hồ sơ');

      fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
      expect(screen.getByTestId('current-location')).toHaveTextContent('/candidate/jobs/2');
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Tiến tới' }));
      expect(screen.getByTestId('current-location')).toHaveTextContent('/candidate/jobs/1');
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('clears collapsed tooltip on Back/Forward navigation with search and hash changes on the same pathname', () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 1024,
      });

      render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter
            initialEntries={[
              '/candidate/jobs/1?tab=overview#top',
              '/candidate/jobs/1?tab=skills#details',
            ]}
            initialIndex={1}
          >
            <Routes>
              <Route
                path="/candidate/jobs/:jobId"
                element={
                  <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
                    <LocationDisplay />
                    <HistoryNavigationControls />
                  </SharedAppLayout>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-location')).toHaveTextContent(
        '/candidate/jobs/1?tab=skills#details',
      );
      expect(screen.getByRole('link', { name: 'Việc làm' })).toHaveAttribute('aria-current', 'page');

      const profileLink = screen.getByRole('link', { name: 'Hồ sơ' });
      fireEvent.mouseEnter(profileLink);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Hồ sơ');

      fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
      expect(screen.getByTestId('current-location')).toHaveTextContent(
        '/candidate/jobs/1?tab=overview#top',
      );
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Việc làm' })).toHaveAttribute('aria-current', 'page');

      fireEvent.click(screen.getByRole('button', { name: 'Tiến tới' }));
      expect(screen.getByTestId('current-location')).toHaveTextContent(
        '/candidate/jobs/1?tab=skills#details',
      );
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      act(() => {
        profileLink.focus();
      });
      expect(screen.getByRole('tooltip')).toHaveTextContent('Hồ sơ');

      fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
      expect(screen.getByTestId('current-location')).toHaveTextContent(
        '/candidate/jobs/1?tab=overview#top',
      );
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Tiến tới' }));
      expect(screen.getByTestId('current-location')).toHaveTextContent(
        '/candidate/jobs/1?tab=skills#details',
      );
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('clears collapsed tooltip on viewport resize across 1024px -> 1440px -> 1024px', () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 1024,
      });

      render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Nội dung</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const profileLink = screen.getByRole('link', { name: 'Hồ sơ' });
      fireEvent.mouseEnter(profileLink);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Hồ sơ');

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          configurable: true,
          writable: true,
          value: 1440,
        });
        window.dispatchEvent(new Event('resize'));
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          configurable: true,
          writable: true,
          value: 1024,
        });
        window.dispatchEvent(new Event('resize'));
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('375px Mobile Off-Canvas Drawer, Focus Trap, Scroll Lock & Return Focus', () => {
    it('opens drawer from header trigger, traps Tab/Shift+Tab, locks body scroll, closes on Escape/backdrop/navigation, and returns focus', async () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 375,
      });

      const { container } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <LocationDisplay />
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const toggleBtn = screen.getByRole('button', { name: /Mở menu điều hướng/i });
      expect(toggleBtn).toHaveAttribute('type', 'button');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      const controlsId = toggleBtn.getAttribute('aria-controls');
      expect(controlsId).toBeTruthy();

      const sidebar = document.getElementById(controlsId!);
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(document.body.style.overflow).toBe('');

      // Open drawer
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(toggleBtn).toHaveAttribute('aria-label', 'Đóng menu điều hướng');
      expect(sidebar).not.toHaveAttribute('hidden');
      expect(sidebar).toHaveAttribute('role', 'dialog');
      expect(sidebar).toHaveAttribute('aria-modal', 'true');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
      expect(document.body.style.overflow).toBe('');
      expect(container.querySelector('.rj-sidebar-backdrop.is-open')).toBeInTheDocument();

      // Focus moves inside drawer (close button)
      const closeBtn = screen.getByRole('button', { name: 'Đóng bảng điều hướng' });
      expect(closeBtn).toHaveFocus();

      // Focus trap: Shift+Tab from first element wraps to last link; Tab from last wraps to first
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      const lastNavLink = screen.getByRole('link', { name: 'Thực tập IOC' });
      expect(lastNavLink).toHaveFocus();

      fireEvent.keyDown(document, { key: 'Tab' });
      expect(closeBtn).toHaveFocus();

      // Escape closes drawer, restores scroll, returns focus to header trigger
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar).toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(document.body.style.overflow).toBe('');
      expect(toggleBtn).toHaveFocus();

      // Re-open and close via backdrop click
      fireEvent.click(toggleBtn);
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
      expect(document.body.style.overflow).toBe('');
      const backdrop = container.querySelector('.rj-sidebar-backdrop')!;
      fireEvent.click(backdrop);
      expect(sidebar).toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(document.body.style.overflow).toBe('');
      expect(toggleBtn).toHaveFocus();

      // Re-open and navigate via link -> auto-closes drawer and unlocks scroll
      fireEvent.click(toggleBtn);
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
      expect(document.body.style.overflow).toBe('');
      const profileLink = screen.getByRole('link', { name: 'Hồ sơ' });
      fireEvent.click(profileLink);
      await waitFor(() => {
        expect(screen.getByTestId('current-location')).toHaveTextContent('/candidate/skills');
      });
      expect(sidebar).toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });

    it('keeps mobile drawer closed across Back/Forward navigation on shared parameterized routes (/candidate/jobs/1 <-> /candidate/jobs/2)', () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 375,
      });

      render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/jobs/2', '/candidate/jobs/1']} initialIndex={1}>
            <Routes>
              <Route
                path="/candidate/jobs/:jobId"
                element={
                  <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
                    <LocationDisplay />
                    <HistoryNavigationControls />
                  </SharedAppLayout>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-location')).toHaveTextContent('/candidate/jobs/1');
      const toggleBtn = screen.getByRole('button', { name: /Mở menu điều hướng/i });
      const sidebar = document.getElementById(toggleBtn.getAttribute('aria-controls')!);
      expect(sidebar).toHaveAttribute('hidden');

      // Open mobile drawer at /candidate/jobs/1
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(sidebar).not.toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
      expect(document.body.style.overflow).toBe('');

      // Navigate back (navigate(-1)) to /candidate/jobs/2 -> drawer closes & unlocks scroll
      fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
      expect(screen.getByTestId('current-location')).toHaveTextContent('/candidate/jobs/2');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar).toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(document.body.style.overflow).toBe('');

      // Navigate forward (navigate(1)) back to /candidate/jobs/1 -> drawer MUST remain closed
      fireEvent.click(screen.getByRole('button', { name: 'Tiến tới' }));
      expect(screen.getByTestId('current-location')).toHaveTextContent('/candidate/jobs/1');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar).toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });

    it('closes mobile drawer and keeps it closed across Back/Forward navigation with search and hash changes on the same pathname', () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 375,
      });

      render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter
            initialEntries={[
              '/candidate/jobs/1?tab=overview#top',
              '/candidate/jobs/1?tab=skills#details',
            ]}
            initialIndex={1}
          >
            <Routes>
              <Route
                path="/candidate/jobs/:jobId"
                element={
                  <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
                    <LocationDisplay />
                    <HistoryNavigationControls />
                  </SharedAppLayout>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-location')).toHaveTextContent(
        '/candidate/jobs/1?tab=skills#details',
      );
      const toggleBtn = screen.getByRole('button', { name: /Mở menu điều hướng/i });
      const sidebar = document.getElementById(toggleBtn.getAttribute('aria-controls')!);
      expect(sidebar).toHaveAttribute('hidden');

      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(sidebar).not.toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
      expect(document.body.style.overflow).toBe('');

      fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
      expect(screen.getByTestId('current-location')).toHaveTextContent(
        '/candidate/jobs/1?tab=overview#top',
      );
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar).toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(document.body.style.overflow).toBe('');

      fireEvent.click(screen.getByRole('button', { name: 'Tiến tới' }));
      expect(screen.getByTestId('current-location')).toHaveTextContent(
        '/candidate/jobs/1?tab=skills#details',
      );
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar).toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });

    it('yields Tab trap and Escape to a portaled aria-modal dialog when mobile drawer and dialog are open simultaneously', () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 375,
      });

      render(
        <AuthProvider initialToken="jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <PortaledModalHost />
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const toggleBtn = screen.getByRole('button', { name: /Mở menu điều hướng/i });
      const sidebar = document.getElementById(toggleBtn.getAttribute('aria-controls')!)!;

      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

      const drawerCloseBtn = screen.getByRole('button', { name: 'Đóng bảng điều hướng' });
      expect(drawerCloseBtn).toHaveFocus();

      // Open a portaled aria-modal="true" dialog on top of the open drawer
      fireEvent.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));

      const modalDialog = screen.getByRole('dialog', { name: 'Hộp thoại xác nhận' });
      expect(modalDialog.parentElement).toBe(document.body);
      expect(sidebar.contains(modalDialog)).toBe(false);
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

      const cancelBtn = within(modalDialog).getByRole('button', { name: 'Hủy bỏ' });
      const confirmBtn = within(modalDialog).getByRole('button', { name: 'Xác nhận' });
      expect(cancelBtn).toHaveFocus();

      // Pressing Tab inside the portaled dialog must NOT steal focus back to the drawer
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(drawerCloseBtn).not.toHaveFocus();
      expect(modalDialog.contains(document.activeElement)).toBe(true);

      // Tab at last element of dialog wraps inside dialog rather than jumping to drawer
      confirmBtn.focus();
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(cancelBtn).toHaveFocus();
      expect(drawerCloseBtn).not.toHaveFocus();

      // First Escape closes ONLY the top-most portaled dialog; drawer and scroll lock remain active
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      expect(screen.queryByRole('dialog', { name: 'Hộp thoại xác nhận' })).not.toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(sidebar).not.toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

      // Second Escape closes the drawer, removes scroll lock, and returns focus to the mobile toggle
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar).toHaveAttribute('hidden');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(toggleBtn).toHaveFocus();
    });
  });

  describe('Skip Link, Landmark Tab Order & Public Pages Without Sidebar', () => {
    it('renders skip link as first focusable element in tab order skip-link -> header -> sidebar -> main', () => {
      const { container } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser('ADMIN')}>
          <MemoryRouter initialEntries={['/admin']}>
            <SharedAppLayout roleBadgeClass="rj-role-admin" roleIcon="shield">
              <div>Admin Dashboard</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      const dashboard = container.querySelector('.rj-dashboard')!;
      const skipLink = screen.getByRole('link', { name: 'Bỏ qua tới nội dung chính' });
      expect(skipLink).toHaveAttribute('href', '#main-content');

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
      expect(main).toHaveAttribute('tabindex', '-1');

      const header = container.querySelector('header.rj-dashboard-nav')!;
      const aside = container.querySelector('aside.rj-sidebar')!;
      const childrenOrder = Array.from(dashboard.children);
      expect(childrenOrder[0]).toBe(skipLink);
      expect(childrenOrder[1]).toBe(header);

      expect(
        skipLink.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        header.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        aside.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it.each(['/login', '/forgot-password', '/reset-password/test-token'])(
      'does not render sidebar navigation on public route %s',
      (publicRoute) => {
        render(
          <AuthProvider initialToken={null} initialUser={null}>
            <MemoryRouter initialEntries={[publicRoute]}>
              <AppRoutes />
            </MemoryRouter>
          </AuthProvider>,
        );

        expect(
          screen.queryByRole('navigation', { name: /Điều hướng theo vai trò/i }),
        ).not.toBeInTheDocument();
        expect(document.querySelector('aside.rj-sidebar')).not.toBeInTheDocument();
      },
    );

    it('does not render sidebar navigation on /change-password when mustChangePassword is true', async () => {
      render(
        <AuthProvider
          initialToken="temp-jwt"
          initialUser={createUser('HR', { mustChangePassword: true })}
        >
          <MemoryRouter initialEntries={['/change-password']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(
        await screen.findByRole('heading', { level: 1, name: /Đổi mật khẩu/i }, { timeout: 8000 }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('navigation', { name: /Điều hướng theo vai trò/i }),
      ).not.toBeInTheDocument();
      expect(document.querySelector('aside.rj-sidebar')).not.toBeInTheDocument();
    }, 15000);
  });

  describe('/candidate/jobs route & CandidateJobsPage', () => {
    it('renders CandidateJobsPage inside AppRoutes at /candidate/jobs for CANDIDATE', async () => {
      render(
        <AuthProvider initialToken="cand-jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/jobs']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(
        await screen.findByRole('heading', { level: 1, name: /Việc làm gợi ý/i }, { timeout: 5000 }),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole(
          'heading',
          { level: 2, name: /Việc làm phù hợp với bạn/i },
          { timeout: 5000 },
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Việc làm' })).toHaveAttribute('aria-current', 'page');
    }, 15000);

    it('renders CandidateJobsPage directly with RoleHomeLayout and JobRecommendationsSection', async () => {
      render(
        <AuthProvider initialToken="cand-jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/jobs']}>
            <Routes>
              <Route path="/candidate/jobs" element={<CandidateJobsPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(
        await screen.findByRole('heading', { level: 1, name: /Việc làm gợi ý/i }, { timeout: 5000 }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^Rikkei Jobs$/i })).toHaveAttribute(
        'href',
        '/candidate',
      );
    });
  });

  describe('Explicit Logout Clearing', () => {
    it('clears session and navigates to /login with state=null (no from) when clicking Đăng Xuất', async () => {
      render(
        <AuthProvider initialToken="staff-jwt" initialUser={createUser('STAFF')}>
          <MemoryRouter initialEntries={['/staff']}>
            <LocationDisplay />
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByTestId('current-location')).toHaveTextContent('/staff');

      fireEvent.click(await screen.findByRole('button', { name: /Đăng xuất/i }));

      expect(screen.getByTestId('current-location')).toHaveTextContent('/login');
      expect(screen.getByTestId('current-location-state')).toHaveTextContent('null');
    });

    it('bypasses startViewTransition and unmounts PersistentShell immediately on logout so header/sidebar never flash over /login', async () => {
      const originalStartVT = (document as unknown as Record<string, unknown>).startViewTransition;
      const startViewTransitionSpy = vi.fn((cb: () => void) => {
        cb();
        return {
          ready: Promise.resolve(),
          updateCallbackDone: Promise.resolve(),
          finished: Promise.resolve(),
        };
      });
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: startViewTransitionSpy,
      });

      const unhandledRejections: unknown[] = [];
      const onRejection = (event: PromiseRejectionEvent) => {
        unhandledRejections.push(event.reason);
      };
      window.addEventListener('unhandledrejection', onRejection);

      try {
        render(
          <AuthProvider initialToken="cand-jwt" initialUser={createUser('CANDIDATE')}>
            <MemoryRouter initialEntries={['/candidate']}>
              <LocationDisplay />
              <AppRoutes />
            </MemoryRouter>
          </AuthProvider>,
        );

        await waitFor(
          () => {
            expect(screen.getByRole('heading', { level: 1, name: /Chào mừng/i })).toBeInTheDocument();
          },
          { timeout: 8000 },
        );
        expect(document.querySelector('header.rj-dashboard-nav')).toBeInTheDocument();
        expect(document.querySelector('aside.rj-sidebar')).toBeInTheDocument();
        expect(document.querySelector('.rj-user-profile')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/i }));

        expect(startViewTransitionSpy).not.toHaveBeenCalled();
        expect(document.querySelector('header.rj-dashboard-nav')).not.toBeInTheDocument();
        expect(document.querySelector('aside.rj-sidebar')).not.toBeInTheDocument();
        expect(document.querySelector('.rj-user-profile')).not.toBeInTheDocument();
        expect(screen.getByTestId('current-location')).toHaveTextContent('/login');
        expect(screen.getByTestId('current-location-state')).toHaveTextContent('null');
        expect(
          screen.getByRole('heading', { level: 1, name: /^Đăng nhập$/i }),
        ).toBeInTheDocument();
        await Promise.resolve();
        expect(unhandledRejections).toHaveLength(0);
      } finally {
        window.removeEventListener('unhandledrejection', onRejection);
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          writable: true,
          value: originalStartVT,
        });
      }
    }, 15000);

    it('cascades sidebar items only on initial mount, renders sliding active indicator, and enables shared BrandMark transition', () => {
      const { container, unmount } = render(
        <AuthProvider initialToken="cand-jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Trang chủ</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(container.querySelectorAll('.rj-role-nav-item.is-cascading').length).toBeGreaterThan(0);
      expect(container.querySelector('.rj-sidebar-active-indicator')).toBeInTheDocument();
      expect(container.querySelector('.rj-brand-mark--shared')).toBeInTheDocument();
      unmount();

      // Second mount simulates navigation to a sub-route — cascade must NOT replay
      const { container: secondContainer } = render(
        <AuthProvider initialToken="cand-jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/skills']}>
            <SharedAppLayout roleBadgeClass="rj-role-candidate" roleIcon="user">
              <div>Kỹ năng</div>
            </SharedAppLayout>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(secondContainer.querySelectorAll('.rj-role-nav-item.is-cascading')).toHaveLength(0);
      expect(secondContainer.querySelector('.rj-sidebar-active-indicator')).toBeInTheDocument();
    });

    it('keeps header, sidebar, and sidebar link focus mounted across protected route navigation in AppRoutes', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      } as unknown as Response);

      try {
        const { container } = render(
          <AuthProvider initialToken="cand-jwt" initialUser={createUser('CANDIDATE')}>
            <MemoryRouter initialEntries={['/candidate']}>
              <LocationDisplay />
              <AppRoutes />
            </MemoryRouter>
          </AuthProvider>,
        );

        await waitFor(
          () => {
            expect(screen.getByRole('heading', { level: 1, name: /Chào mừng/i })).toBeInTheDocument();
          },
          { timeout: 8000 },
        );

        const initialHeader = container.querySelector('header.rj-dashboard-nav');
        const initialSidebar = container.querySelector('aside.rj-sidebar');
        const profileLink = screen.getByRole('link', { name: 'Hồ sơ' });
        profileLink.focus();
        expect(profileLink).toHaveFocus();

        fireEvent.click(profileLink);

        await waitFor(
          () => {
            expect(screen.getByTestId('current-location')).toHaveTextContent('/candidate/skills');
            expect(screen.getByRole('heading', { name: 'Hồ sơ năng lực' })).toBeInTheDocument();
          },
          { timeout: 8000 },
        );

        expect(container.querySelector('header.rj-dashboard-nav')).toBe(initialHeader);
        expect(container.querySelector('aside.rj-sidebar')).toBe(initialSidebar);
        expect(screen.getByRole('link', { name: 'Hồ sơ' })).toBe(profileLink);
        expect(profileLink).toHaveFocus();
        expect(profileLink).toHaveAttribute('aria-current', 'page');
      } finally {
        globalThis.fetch = originalFetch;
      }
    }, 15000);
  });
});
