import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { CandidateHomePage } from '../pages/role-homes/CandidateHomePage';
import { HrHomePage } from '../pages/role-homes/HrHomePage';
import { MentorHomePage } from '../pages/role-homes/MentorHomePage';
import { StaffHomePage } from '../pages/role-homes/StaffHomePage';
import { AdminHomePage } from '../pages/role-homes/AdminHomePage';
import { CandidateSkillsPage } from '../pages/role-homes/CandidateSkillsPage';
import { RoleHomeLayout } from '../pages/role-homes/RoleHomeLayout';
import { type UserDto } from '../types';

describe('Role Home Pages', () => {
  const createUser = (role: string, fullName: string): UserDto => ({
    id: 100,
    email: `${role.toLowerCase()}@rikkei.vn`,
    fullName,
    role,
    companyId: role === 'HR' ? 42 : null,
    status: 'ACTIVE',
    mustChangePassword: false,
  });

  it('renders CandidateHomePage with user information', () => {
    const user = createUser('CANDIDATE', 'Nguyen Candidate');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <CandidateHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Nguyen Candidate!/i)).toBeInTheDocument();
    expect(screen.getAllByText('Ứng viên').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('CANDIDATE')).not.toBeInTheDocument();
    expect(screen.getByText('Hồ Sơ Tuyển Dụng')).toBeInTheDocument();
    expect(screen.getByText('Hồ Sơ Năng Lực')).toBeInTheDocument();
    const skillsLink = screen.getByRole('link', { name: /Xem Hồ Sơ Năng Lực/i });
    expect(skillsLink).toBeInTheDocument();
    expect(skillsLink).toHaveAttribute('href', '/candidate/skills');
  });

  it('renders HrHomePage with company ID', () => {
    const user = createUser('HR', 'Tran Thi HR');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <HrHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Tran Thi HR!/i)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Đăng Tin Tuyển Dụng')).toBeInTheDocument();
  });

  it('renders MentorHomePage', () => {
    const user = createUser('MENTOR', 'Thay Giao Mentor');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <MentorHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Thay Giao Mentor!/i)).toBeInTheDocument();
    expect(screen.getByText('Đánh Giá Ứng Viên')).toBeInTheDocument();
  });

  it('renders StaffHomePage', () => {
    const user = createUser('STAFF', 'Co Giao Staff');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <StaffHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Co Giao Staff!/i)).toBeInTheDocument();
    expect(screen.getByText('Tiếp Nhận & Điều Phối')).toBeInTheDocument();
  });

  it('renders AdminHomePage', () => {
    const user = createUser('ADMIN', 'Super Admin');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <AdminHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Super Admin!/i)).toBeInTheDocument();
    expect(screen.getByText('Quản Trị Người Dùng & Phân Quyền')).toBeInTheDocument();
  });

  it('renders CandidateSkillsPage wrapped in RoleHomeLayout with shared page container', async () => {
    const user = createUser('CANDIDATE', 'Nguyen Candidate');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    } as unknown as Response);

    try {
      const { container } = render(
        <AuthProvider initialToken="token" initialUser={user}>
          <MemoryRouter>
            <CandidateSkillsPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      // Verify outer layout shell and navigation matching other role pages
      expect(container.querySelector('.rj-dashboard')).toBeInTheDocument();
      expect(container.querySelector('.rj-dashboard-nav')).toBeInTheDocument();
      expect(screen.getByText('Rikkei Jobs Cổng Quản Trị')).toBeInTheDocument();
      expect(screen.getAllByText('Ứng viên').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('CANDIDATE')).not.toBeInTheDocument();
      expect(screen.getByText('Nguyen Candidate')).toBeInTheDocument();

      // Verify shared main content container
      const main = screen.getByRole('main');
      expect(main).toHaveClass('rj-dashboard-content');

      // Verify Candidate Skills content inside the container
      expect(await screen.findByRole('heading', { name: 'Hồ sơ năng lực' })).toBeInTheDocument();
      expect(screen.getByText(/Chỉ số 0 - 100 theo từng kỹ năng/i)).toBeInTheDocument();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  describe('Role x Status Vietnamese Localization Matrix', () => {
    const roleCases = [
      {
        role: 'CANDIDATE',
        expectedLabel: 'Ứng viên',
        fullName: 'Nguyễn Văn An',
        Component: CandidateHomePage,
      },
      {
        role: 'HR',
        expectedLabel: 'HR',
        fullName: 'Trần Thị Lan',
        Component: HrHomePage,
      },
      {
        role: 'MENTOR',
        expectedLabel: 'Mentor',
        fullName: 'Lê Minh Tuấn',
        Component: MentorHomePage,
      },
      {
        role: 'STAFF',
        expectedLabel: 'Nhân viên',
        fullName: 'Phạm Thu Hà',
        Component: StaffHomePage,
      },
      {
        role: 'ADMIN',
        expectedLabel: 'Quản trị viên',
        fullName: 'Hoàng Quốc Bảo',
        Component: AdminHomePage,
      },
    ] as const;

    const statusCases = [
      {
        label: 'ACTIVE',
        status: 'ACTIVE',
        mustChangePassword: false,
        expectedStatusLabel: 'Đang hoạt động',
      },
      {
        label: 'LOCKED',
        status: 'LOCKED',
        mustChangePassword: false,
        expectedStatusLabel: 'Đã khóa',
      },
      {
        label: 'ACTIVE + mustChangePassword: true',
        status: 'ACTIVE',
        mustChangePassword: true,
        expectedStatusLabel: 'Yêu cầu đổi mật khẩu',
      },
      {
        label: 'MUST_CHANGE_PASSWORD',
        status: 'MUST_CHANGE_PASSWORD',
        mustChangePassword: false,
        expectedStatusLabel: 'Yêu cầu đổi mật khẩu',
      },
      {
        label: 'LOCKED + mustChangePassword: true',
        status: 'LOCKED',
        mustChangePassword: true,
        expectedStatusLabel: 'Đã khóa',
      },
    ] as const;

    const matrix = roleCases.flatMap((roleCase) =>
      statusCases.map((statusCase) => ({
        ...roleCase,
        ...statusCase,
      })),
    );

    it.each(matrix)(
      'renders localized role "$expectedLabel" and status "$expectedStatusLabel" for $role ($label) without raw enums or N/A',
      ({ role, expectedLabel, fullName, Component, status, mustChangePassword, expectedStatusLabel }) => {
        const user: UserDto = {
          id: 200,
          email: `nguoi.dung.${role.toLowerCase()}@rikkei.vn`,
          fullName,
          role,
          companyId: role === 'HR' ? 7 : null,
          status,
          mustChangePassword,
        };

        const { container } = render(
          <AuthProvider initialToken="token" initialUser={user}>
            <MemoryRouter>
              <Component />
            </MemoryRouter>
          </AuthProvider>,
        );

        expect(screen.getAllByText(expectedLabel).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(expectedStatusLabel)).toBeInTheDocument();

        const domText = container.textContent ?? '';
        expect(domText).not.toMatch(
          /\b(CANDIDATE|MENTOR|STAFF|ADMIN|ACTIVE|LOCKED|MUST_CHANGE_PASSWORD)\b/,
        );
        expect(domText).not.toContain('N/A');
        expect(domText).not.toMatch(/\((Candidate|Staff|Admin)\)/i);

        if (role === 'MENTOR') {
          expect(screen.getAllByText('Mentor').length).toBeGreaterThanOrEqual(1);
        }
      },
    );

    it('falls back to Không xác định for unknown role, unknown status, and null user fields', () => {
      const unknownUser = {
        id: null,
        email: '   ',
        fullName: undefined,
        role: 'SUPER_GUEST',
        companyId: null,
        status: 'SUSPENDED',
        mustChangePassword: false,
      } as unknown as UserDto;

      const { container } = render(
        <AuthProvider initialToken="token" initialUser={unknownUser}>
          <MemoryRouter>
            <RoleHomeLayout
              roleTitle="Vai trò tùy chỉnh"
              roleBadgeClass="rj-role-candidate"
              roleIcon="user"
              description="Kiểm tra fallback không xác định"
            />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getAllByText('Không xác định').length).toBeGreaterThanOrEqual(5);
      const domText = container.textContent ?? '';
      expect(domText).not.toContain('N/A');
      expect(domText).not.toContain('SUPER_GUEST');
      expect(domText).not.toContain('SUSPENDED');
      expect(domText).not.toContain('ACTIVE');
    });
  });
});
