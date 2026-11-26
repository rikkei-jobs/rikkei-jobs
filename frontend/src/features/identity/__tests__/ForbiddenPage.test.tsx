import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { AppRoutes } from '../../../App';
import { type UserDto } from '../types';

const LocationProbe = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="forbidden-location">{location.pathname}</div>
      <div data-testid="forbidden-state">{JSON.stringify(location.state)}</div>
    </div>
  );
};

const createUser = (role: string, overrides: Partial<UserDto> = {}): UserDto => ({
  id: 50,
  email: `${role.toLowerCase()}@rikkei.vn`,
  fullName: 'Nguyễn Văn Kiểm Thử',
  role,
  companyId: role === 'HR' ? 1 : null,
  status: 'ACTIVE',
  mustChangePassword: false,
  ...overrides,
});

describe('ForbiddenPage & Route Guard 403 Behavior (F2 + D8)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const roleMatrix = [
    { role: 'CANDIDATE', label: 'Ứng viên', homePath: '/candidate', forbiddenRaw: /\bCANDIDATE\b/ },
    { role: 'HR', label: 'HR', homePath: '/hr', forbiddenRaw: null },
    { role: 'MENTOR', label: 'Mentor', homePath: '/mentor', forbiddenRaw: /\bMENTOR\b/ },
    { role: 'STAFF', label: 'Nhân viên', homePath: '/staff', forbiddenRaw: /\bSTAFF\b/ },
    { role: 'ADMIN', label: 'Quản trị viên', homePath: '/admin', forbiddenRaw: /\bADMIN\b/ },
  ];

  it.each(roleMatrix)(
    'renders localized role "$label" and back-to-home link "$homePath" for $role without raw enum or N/A',
    ({ role, label, homePath, forbiddenRaw }) => {
      const { container } = render(
        <AuthProvider initialToken="jwt" initialUser={createUser(role)}>
          <MemoryRouter initialEntries={['/403']}>
            <ForbiddenPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      const mains = screen.getAllByRole('main');
      expect(mains).toHaveLength(1);
      const main = mains[0];
      const headings = screen.getAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent('Bạn không có quyền truy cập trang này');

      expect(within(main).getByText('403')).toBeInTheDocument();
      expect(within(main).getByText(label)).toBeInTheDocument();

      const nav = screen.getByRole('navigation', { name: /Điều hướng theo vai trò/i });
      const navLinks = within(nav).getAllByRole('link');
      expect(navLinks[0]).toHaveTextContent('Trang chủ');
      expect(navLinks[0]).toHaveAttribute('href', homePath);

      const backLink = screen.getByRole('link', { name: /Quay lại trang chủ/i });
      expect(backLink).toHaveClass('rj-btn', 'rj-btn-primary');
      expect(backLink).toHaveAttribute('href', homePath);

      const svgs = container.querySelectorAll('svg.rj-icon');
      expect(svgs.length).toBeGreaterThanOrEqual(2);
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
        expect(svg).toHaveAttribute('stroke-width', '2');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });

      const domText = container.textContent ?? '';
      expect(domText).not.toContain('N/A');
      if (forbiddenRaw) {
        expect(domText).not.toMatch(forbiddenRaw);
      }
    },
  );

  it('falls back to "Không xác định" and /login when user role is unknown or null', () => {
    const unknownUser = createUser('SUPER_UNKNOWN');
    const { unmount } = render(
      <AuthProvider initialToken="jwt" initialUser={unknownUser}>
        <MemoryRouter>
          <ForbiddenPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(within(screen.getByRole('main')).getByText('Không xác định')).toBeInTheDocument();
    expect(screen.queryByText('SUPER_UNKNOWN')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quay lại trang chủ/i })).toHaveAttribute(
      'href',
      '/login',
    );
    unmount();

    render(
      <AuthProvider initialToken={null} initialUser={null}>
        <MemoryRouter>
          <ForbiddenPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(within(screen.getByRole('main')).getByText('Không xác định')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quay lại trang chủ/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('prevents protected API fetches and renders 403 in-place when wrong role accesses /hr/company or /candidate/skills', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const { unmount } = render(
      <AuthProvider initialToken="cand-jwt" initialUser={createUser('CANDIDATE')}>
        <MemoryRouter initialEntries={['/hr/company']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /Bạn không có quyền truy cập trang này/i }),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText('Ứng viên')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quay lại trang chủ/i })).toHaveAttribute(
      'href',
      '/candidate',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    unmount();

    render(
      <AuthProvider initialToken="hr-jwt" initialUser={createUser('HR')}>
        <MemoryRouter initialEntries={['/candidate/skills']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /Bạn không có quyền truy cập trang này/i }),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText('HR')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quay lại trang chủ/i })).toHaveAttribute(
      'href',
      '/hr',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('supports direct /403 route for authenticated users and redirects unauthenticated visitors to /login', async () => {
    const { unmount } = render(
      <AuthProvider initialToken="mentor-jwt" initialUser={createUser('MENTOR')}>
        <MemoryRouter initialEntries={['/403']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /Bạn không có quyền truy cập trang này/i }),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText('Mentor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quay lại trang chủ/i })).toHaveAttribute(
      'href',
      '/mentor',
    );
    unmount();

    render(
      <AuthProvider initialToken={null} initialUser={null}>
        <MemoryRouter initialEntries={['/403']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: /^Đăng nhập$/i })).toBeInTheDocument();
  });

  it('renders 403 inside SharedAppLayout with user sidebar and clears state.from on explicit logout', () => {
    render(
      <AuthProvider initialToken="staff-jwt" initialUser={createUser('STAFF')}>
        <MemoryRouter initialEntries={['/hr/company']}>
          <LocationProbe />
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getAllByRole('main')).toHaveLength(1);
    const nav = screen.getByRole('navigation', { name: /Điều hướng theo vai trò/i });
    expect(within(nav).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/staff');
    expect(nav).toHaveTextContent('Duyệt hồ sơ');
    expect(nav).not.toHaveTextContent('Công ty');

    fireEvent.click(screen.getByRole('button', { name: /Đăng Xuất/i }));
    expect(screen.getByTestId('forbidden-location')).toHaveTextContent('/login');
    expect(screen.getByTestId('forbidden-state')).toHaveTextContent('null');
  });
});
