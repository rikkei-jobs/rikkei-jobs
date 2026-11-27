import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/profiles/me/skills')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
        } as unknown as Response);
      }
      if (String(url).includes('/api/v1/me/job-recommendations')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: [], total: 0 }),
        } as unknown as Response);
      }
      if (String(url).includes('/api/v1/me/target')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ code: 'NOT_FOUND', message: 'Chưa chọn mục tiêu' }),
        } as unknown as Response);
      }
      if (String(url).includes('/evaluations')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ userId: 100, evaluations: [] }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as unknown as Response);
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const createUser = (role: string, fullName: string): UserDto => ({
    id: 100,
    email: `${role.toLowerCase()}@rikkei.vn`,
    fullName,
    role,
    companyId: role === 'HR' ? 42 : null,
    status: 'ACTIVE',
    mustChangePassword: false,
  });

  it('renders CandidateHomePage with real empty state, secondary account block, and route links', async () => {
    const user = createUser('CANDIDATE', 'Nguyen Candidate');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <CandidateHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Chào mừng, Nguyen Candidate!/i })).toBeInTheDocument();
    expect(screen.getAllByText('Ứng viên').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('CANDIDATE')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Chưa có điểm kỹ năng xác thực để vẽ biểu đồ/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Hồ sơ ứng tuyển')).not.toBeInTheDocument();
    expect(screen.getAllByText('Trợ lý AI').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Góp ý cải thiện CV và luyện phỏng vấn thử theo yêu cầu tin tuyển dụng.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Hồ sơ năng lực').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sắp ra mắt').length).toBeGreaterThanOrEqual(2);
    const skillsLinks = screen.getAllByRole('link', { name: /Xem hồ sơ năng lực/i });
    expect(skillsLinks.length).toBeGreaterThanOrEqual(1);
    expect(skillsLinks[0]).toHaveAttribute('href', '/candidate/skills');
    expect(screen.getByRole('link', { name: /Xem việc làm gợi ý/i })).toHaveAttribute(
      'href',
      '/candidate/jobs',
    );
    expect(screen.getByRole('link', { name: /Phân tích khoảng thiếu/i })).toHaveAttribute(
      'href',
      '/candidate/gap-analysis',
    );
    expect(screen.getByRole('link', { name: /Xem đánh giá/i })).toHaveAttribute(
      'href',
      '/candidate/evaluations',
    );
  });

  it('renders CandidateHomePage with real verified skills, job recommendations, gap analysis, and mentor evaluation', async () => {
    const user = createUser('CANDIDATE', 'Nguyễn Văn An');
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/profiles/me/skills')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              {
                skill: { id: 1, code: 'JAVA', name: 'Lập trình Java', group: 'PROGRAMMING' },
                verifiedScore: 86,
                selfScore: 80,
                level: 'EXPERT',
                evidences: [],
              },
              {
                skill: { id: 2, code: 'SPRING_BOOT', name: 'Spring Boot', group: 'BACKEND' },
                verifiedScore: 82,
                selfScore: null,
                level: 'ADVANCED',
                evidences: [],
              },
            ]),
        } as unknown as Response);
      }
      if (String(url).includes('/api/v1/me/job-recommendations')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              items: [
                {
                  id: 11,
                  jobId: 11,
                  title: 'Java Backend Fresher',
                  companyName: 'Rikkeisoft',
                  location: 'Hà Nội',
                  salaryRange: '12 - 15 triệu',
                  deadline: '2026-12-31',
                  score: 88,
                  explanation: 'Phù hợp',
                  isAiGenerated: false,
                  rank: 1,
                  matchingSkills: ['JAVA', 'SPRING_BOOT'],
                  missingSkills: [],
                  requiredSkills: [],
                },
              ],
              total: 1,
            }),
        } as unknown as Response);
      }
      if (String(url).includes('/api/v1/me/target')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              type: 'POSITION',
              id: 1,
              code: 'JAVA_BACKEND_FRESHER',
              name: 'Java Backend Fresher',
              description: null,
            }),
        } as unknown as Response);
      }
      if (String(url).includes('/api/v1/me/gap-analysis')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              target: {
                type: 'POSITION',
                id: 1,
                code: 'JAVA_BACKEND_FRESHER',
                name: 'Java Backend Fresher',
                description: null,
              },
              readiness: 76,
              items: [
                {
                  skillId: 3,
                  skillCode: 'DOCKER',
                  skillName: 'Docker',
                  required: 70,
                  current: 40,
                  gap: 30,
                  priority: 'HIGH',
                },
              ],
            }),
        } as unknown as Response);
      }
      if (String(url).includes('/evaluations')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              userId: 100,
              evaluations: [
                {
                  id: 5,
                  mentor: { id: 6, name: 'Phạm Quốc Dũng' },
                  templateId: 1,
                  context: 'INTERNSHIP',
                  submittedAt: '2026-11-10T10:00:00Z',
                  overallComment: 'Nắm chắc Spring Boot và SQL.',
                  scores: [{ criterionId: 1, criterionDescription: 'Java Core', score: 90, comment: null }],
                },
              ],
            }),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as unknown as Response);
    });

    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <CandidateHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Java Backend Fresher').length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText(/Bổ sung 1 kỹ năng ưu tiên/i)).toBeInTheDocument();
    expect(screen.getByText(/Nắm chắc Spring Boot và SQL\./i)).toBeInTheDocument();
    expect(screen.getByText(/Mentor: Phạm Quốc Dũng/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Điểm trung bình 6 nhóm kỹ năng từ dữ liệu đã xác thực của bạn/i })).toBeInTheDocument();
  });

  it('renders HrHomePage without internal database IDs and with real company summary', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/companies/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: 1,
              name: 'Công ty Cổ phần Công nghệ Nam Phương',
              taxCode: '0106026495',
              industry: 'Công nghệ thông tin',
              size: '51-200',
              address: 'Hà Nội',
              city: 'Hà Nội',
              website: 'https://namphuong.example.vn',
              logoUrl: null,
              description: 'Đối tác tuyển dụng kỹ sư.',
              status: 'ACTIVE',
              version: 1,
            }),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as unknown as Response);
    });

    const user = createUser('HR', 'Tran Thi HR');
    const { container } = render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <HrHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Tran Thi HR!/i)).toBeInTheDocument();
    expect(screen.getByText('hr@rikkei.vn')).toBeInTheDocument();
    expect(screen.queryByText(/Company ID/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/User ID/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Công ty Cổ phần Công nghệ Nam Phương')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Tải lên logo cho Công ty Cổ phần Công nghệ Nam Phương'),
    ).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(main.querySelectorAll('a[href="/hr/company"]')).toHaveLength(2);
    expect(main.querySelectorAll('a[href="/hr/recruitment"]')).toHaveLength(1);
    const hero = main.querySelector('.rj-cand-hero') as HTMLElement;
    expect(hero.querySelectorAll('.rj-btn-primary')).toHaveLength(1);
    const companyNextCta = screen.getByRole('link', { name: /Mở hồ sơ công ty/i });
    expect(companyNextCta).toHaveAttribute('href', '/hr/company');
    expect(companyNextCta).toHaveClass('rj-btn-primary');
    const roadmapAside = container.querySelector('aside[aria-labelledby="hr-roadmap-heading"]');
    expect(roadmapAside).not.toBeNull();
    expect(within(roadmapAside as HTMLElement).queryByText('Quản lý ứng viên')).not.toBeInTheDocument();
    expect(
      within(roadmapAside as HTMLElement).queryByRole('link', { name: /Mở tuyển dụng/i }),
    ).not.toBeInTheDocument();
    expect(within(roadmapAside as HTMLElement).getByText('Đăng tin tuyển dụng')).toBeInTheDocument();
    expect(within(roadmapAside as HTMLElement).getByText('Thực tập sinh IOC')).toBeInTheDocument();
    expect(within(roadmapAside as HTMLElement).getAllByText('Sắp ra mắt')).toHaveLength(2);
    const recruitmentCta = screen.getByRole('link', { name: /Mở tuyển dụng/i });
    expect(recruitmentCta).toHaveAttribute('href', '/hr/recruitment');
    expect(recruitmentCta).toHaveClass('rj-btn-secondary');
  });

  it('shows both company logo prompt and live recruitment entry when company logo is missing', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/companies/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: 2,
              name: 'Công ty Cổ phần Công nghệ Phương Đông',
              taxCode: '0109998888',
              industry: 'Phần mềm',
              size: '51-200',
              address: 'Hà Nội',
              city: 'Hà Nội',
              website: 'https://phuongdong.example.vn',
              logoUrl: null,
              description: 'Đối tác tuyển dụng kỹ sư.',
              status: 'ACTIVE',
              version: 1,
            }),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as unknown as Response);
    });

    const user = createUser('HR', 'HR Missing Logo');
    const { container } = render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <HrHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Tải lên logo cho Công ty Cổ phần Công nghệ Phương Đông'),
      ).toBeInTheDocument();
    });

    const nextBoxes = container.querySelectorAll('.rj-cand-hero .rj-stack-md > .rj-cand-next-box');
    expect(nextBoxes).toHaveLength(2);

    expect(
      within(nextBoxes[0] as HTMLElement).getByText('Bước tiếp theo cho doanh nghiệp'),
    ).toBeInTheDocument();
    const companyLink = within(nextBoxes[0] as HTMLElement).getByRole('link', {
      name: /Mở hồ sơ công ty/i,
    });
    expect(companyLink).toHaveAttribute('href', '/hr/company');
    expect(companyLink).toHaveClass('rj-btn-primary');

    expect(
      within(nextBoxes[1] as HTMLElement).getByText('Hoạt động tuyển dụng'),
    ).toBeInTheDocument();
    const recruitLink = within(nextBoxes[1] as HTMLElement).getByRole('link', {
      name: /Mở tuyển dụng/i,
    });
    expect(recruitLink).toHaveAttribute('href', '/hr/recruitment');
    expect(recruitLink).toHaveClass('rj-btn-secondary');
  });

  it('renders MentorHomePage with real evaluation templates and airy layout', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/evaluation-templates')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              {
                id: 1,
                name: 'Java Backend – Thực tập',
                position: 'Java Backend Fresher',
                context: 'INTERNSHIP',
                active: true,
                criteria: [
                  { id: 10, skillId: 1, description: 'Java Core', weight: 30 },
                  { id: 11, skillId: 2, description: 'Spring Boot', weight: 25 },
                  { id: 12, skillId: 3, description: 'SQL', weight: 20 },
                  { id: 13, skillId: 4, description: 'Git', weight: 10 },
                  { id: 14, skillId: 5, description: 'Teamwork', weight: 15 },
                ],
              },
              {
                id: 2,
                name: 'Đánh giá chuyên sâu',
                position: 'Backend Engineer',
                context: 'INTERVIEW',
                active: true,
                criteria: [
                  { id: 20, skillId: 1, description: 'Architecture', weight: 12.5 },
                ],
              },
            ]),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as unknown as Response);
    });

    const user = createUser('MENTOR', 'Thay Giao Mentor');
    const { container } = render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <MentorHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(container.querySelector('.rj-dashboard')).toHaveAttribute('data-density', 'airy');
    expect(screen.getByText(/Chào mừng, Thay Giao Mentor!/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Java Backend – Thực tập')).toBeInTheDocument();
      expect(screen.getByText(/Hiện có 2 mẫu phiếu đánh giá đang áp dụng/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Java Core (30%)')).toBeInTheDocument();
    expect(screen.getByText('Spring Boot (25%)')).toBeInTheDocument();
    expect(screen.getByText('SQL (20%)')).toBeInTheDocument();
    expect(screen.getByText('Git (10%)')).toBeInTheDocument();
    expect(screen.getByText('Teamwork (15%)')).toBeInTheDocument();
    expect(screen.getByText('Architecture (12.5%)')).toBeInTheDocument();
    expect(screen.queryByText(/3000%|2500%|2000%|1000%|1500%|1250%/)).not.toBeInTheDocument();
    expect(screen.getByText('Đánh giá ứng viên')).toBeInTheDocument();
  });

  it('renders StaffHomePage with real target positions and operational copy', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/target-positions')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              { id: 1, code: 'JAVA_BACKEND_FRESHER', name: 'Java Backend Fresher', description: 'Lập trình Java & Spring Boot' },
            ]),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as unknown as Response);
    });

    const user = createUser('STAFF', 'Co Giao Staff');
    const { container } = render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <StaffHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Co Giao Staff!/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Cán bộ tuyển sinh|đối soát hợp đồng/i);
    await waitFor(() => {
      expect(screen.getByText('Java Backend Fresher')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Theo dõi hồ sơ ứng tuyển/i })).toHaveAttribute(
      'href',
      '/staff/applications',
    );
    expect(screen.getByText('Duyệt hồ sơ & doanh nghiệp')).toBeInTheDocument();
  });

  it('renders AdminHomePage with honest Sắp ra mắt scope, zero technical showcase, and no duplicate change-password CTAs', () => {
    const ssoAdminUser: UserDto = {
      ...createUser('ADMIN', 'Admin User'),
      lmsUserId: 'lms-ad-001',
    };
    const { container, unmount } = render(
      <AuthProvider initialToken="token" initialUser={ssoAdminUser}>
        <MemoryRouter>
          <AdminHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Admin User!/i)).toBeInTheDocument();
    expect(screen.getByText('Danh mục kỹ năng & trọng số')).toBeInTheDocument();
    expect(screen.getByText('Kiểm soát trợ lý AI')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở cấu hình AI' })).toHaveAttribute('href', '/admin/ai-config');
    expect(container.textContent).not.toMatch(/trạng thái kết nối backend|LMS SSO/i);
    expect(container.querySelectorAll('a[href="/change-password"]')).toHaveLength(0);
    expect(screen.queryByRole('link', { name: /Đổi mật khẩu/i })).not.toBeInTheDocument();
    unmount();

    const enterpriseAdminUser = createUser('ADMIN', 'Enterprise Admin');
    const { container: enterpriseContainer } = render(
      <AuthProvider initialToken="token" initialUser={enterpriseAdminUser}>
        <MemoryRouter>
          <AdminHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(enterpriseContainer.querySelectorAll('a[href="/change-password"]')).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: /Đổi mật khẩu/i })).toHaveLength(1);
  });

  it('hides /change-password link for LMS SSO Candidate and renders exactly 1 link for Enterprise HR', async () => {
    const lmsCandidate: UserDto = {
      ...createUser('CANDIDATE', 'LMS Candidate'),
      lmsUserId: 'lms-sv-001',
    };
    const { container: candContainer, unmount } = render(
      <AuthProvider initialToken="token" initialUser={lmsCandidate}>
        <MemoryRouter>
          <CandidateHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Chào mừng, LMS Candidate!/i)).toBeInTheDocument();
    });
    expect(candContainer.querySelectorAll('a[href="/change-password"]')).toHaveLength(0);
    unmount();

    const hr2: UserDto = {
      ...createUser('HR', 'HR Two'),
      email: 'hr2@rikkeijobs.test',
      lmsUserId: null,
      mustChangePassword: false,
    };
    const { container: hrContainer } = render(
      <AuthProvider initialToken="token" initialUser={hr2}>
        <MemoryRouter>
          <HrHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Chào mừng, HR Two!/i)).toBeInTheDocument();
    });
    expect(hrContainer.querySelectorAll('a[href="/change-password"]')).toHaveLength(1);
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

      // Verify outer layout shell and left sidebar navigation matching other role pages
      expect(container.querySelector('.rj-dashboard')).toBeInTheDocument();
      expect(container.querySelector('.rj-dashboard-nav')).toBeInTheDocument();
      expect(container.querySelector('aside.rj-sidebar')).toBeInTheDocument();
      const nav = screen.getByRole('navigation', { name: /Điều hướng theo vai trò/i });
      const navLinks = within(nav).getAllByRole('link');
      expect(navLinks[0]).toHaveTextContent('Trang chủ');
      expect(navLinks[0]).toHaveAttribute('href', '/candidate');
      expect(screen.getByText('Rikkei Jobs')).toBeInTheDocument();
      expect(screen.getAllByText('Ứng viên').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('CANDIDATE')).not.toBeInTheDocument();
      expect(screen.getByText('Nguyen Candidate')).toBeInTheDocument();

      // Verify shared main content container
      const main = screen.getByRole('main');
      expect(main).toHaveClass('rj-dashboard-content');

      // Verify Candidate Skills content inside the container with single h1
      const h1s = await screen.findAllByRole('heading', { level: 1 });
      expect(h1s).toHaveLength(1);
      expect(h1s[0]).toHaveTextContent('Hồ sơ năng lực');
      expect(screen.getByText(/Chỉ số 0 - 100 theo từng kỹ năng/i)).toBeInTheDocument();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('renders "Mã học viên LMS" for CANDIDATE and "Mã tài khoản LMS" for non-candidate LMS roles', () => {
    const candidateLms: UserDto = {
      ...createUser('CANDIDATE', 'Ứng viên LMS'),
      lmsUserId: 'lms-sv-001',
    };
    const { unmount } = render(
      <AuthProvider initialToken="token" initialUser={candidateLms}>
        <MemoryRouter>
          <RoleHomeLayout
            roleBadgeClass="rj-role-candidate"
            roleIcon="user"
          />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(screen.getByText('Mã học viên LMS')).toBeInTheDocument();
    expect(screen.queryByText('Mã tài khoản LMS')).not.toBeInTheDocument();
    unmount();

    for (const role of ['MENTOR', 'STAFF', 'ADMIN'] as const) {
      const nonCandidateLms: UserDto = {
        ...createUser(role, `${role} LMS`),
        lmsUserId: `lms-${role.toLowerCase()}-001`,
      };
      const { unmount: unmountRole } = render(
        <AuthProvider initialToken="token" initialUser={nonCandidateLms}>
          <MemoryRouter>
            <RoleHomeLayout
              roleBadgeClass={`rj-role-${role.toLowerCase()}`}
              roleIcon="shield"
            />
          </MemoryRouter>
        </AuthProvider>,
      );
      expect(screen.getByText('Mã tài khoản LMS')).toBeInTheDocument();
      expect(screen.queryByText('Mã học viên LMS')).not.toBeInTheDocument();
      unmountRole();
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
      async ({ role, expectedLabel, fullName, Component, status, mustChangePassword, expectedStatusLabel }) => {
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

        await waitFor(() => {
          expect(screen.getByText(expectedStatusLabel)).toBeInTheDocument();
        });
        expect(screen.getAllByText(expectedLabel).length).toBeGreaterThanOrEqual(1);

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

      expect(screen.getAllByText('Không xác định').length).toBeGreaterThanOrEqual(4);
      const domText = container.textContent ?? '';
      expect(domText).not.toContain('N/A');
      expect(domText).not.toContain('SUPER_GUEST');
      expect(domText).not.toContain('SUSPENDED');
      expect(domText).not.toContain('ACTIVE');
    });
  });

  it('preserves DOM node identity and keyboard focus on the /change-password link across isLoading transitions', () => {
    const enterpriseHr: UserDto = {
      ...createUser('HR', 'HR Focus'),
      lmsUserId: null,
      mustChangePassword: false,
    };

    const { rerender } = render(
      <AuthProvider initialToken="token" initialUser={enterpriseHr}>
        <MemoryRouter>
          <RoleHomeLayout
            roleBadgeClass="rj-role-hr"
            roleIcon="building"
            isLoading={true}
          />
        </MemoryRouter>
      </AuthProvider>,
    );

    const linkBefore = screen.getByRole('link', { name: /Đổi mật khẩu/i });
    linkBefore.focus();
    expect(linkBefore).toHaveFocus();

    rerender(
      <AuthProvider initialToken="token" initialUser={enterpriseHr}>
        <MemoryRouter>
          <RoleHomeLayout
            roleBadgeClass="rj-role-hr"
            roleIcon="building"
            isLoading={false}
          />
        </MemoryRouter>
      </AuthProvider>,
    );

    const linkAfter = screen.getByRole('link', { name: /Đổi mật khẩu/i });
    expect(linkAfter).toBe(linkBefore);
    expect(linkBefore).toHaveFocus();
  });

  it('preserves MentorHomePage grid, reserved slot, and account card DOM references across loading -> ready and loading -> error', async () => {
    let resolveFetch!: (value: Response) => void;
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const mentor = createUser('MENTOR', 'Mentor Stability');
    const { container, unmount } = render(
      <AuthProvider initialToken="token" initialUser={mentor}>
        <MemoryRouter>
          <MentorHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const gridBefore = container.querySelector('.rj-cand-grid');
    const slotBefore = container.querySelector('.rj-role-async-slot.rj-mentor-templates-slot');
    const asideBefore = container.querySelector('.rj-cand-grid > aside');
    const accountBefore = container.querySelector('.rj-account-card-secondary');
    expect(gridBefore).not.toBeNull();
    expect(slotBefore).not.toBeNull();
    expect(asideBefore).not.toBeNull();
    expect(accountBefore).not.toBeNull();
    expect(screen.getByRole('status', { name: /Đang tải mẫu phiếu đánh giá/i })).toBeInTheDocument();

    resolveFetch({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: 1,
            name: 'Java Backend – Thực tập',
            position: 'Java Backend Fresher',
            context: 'INTERNSHIP',
            active: true,
            criteria: [{ id: 10, skillId: 1, description: 'Java Core', weight: 100 }],
          },
        ]),
    } as unknown as Response);

    await waitFor(() => {
      expect(screen.getByText('Java Backend – Thực tập')).toBeInTheDocument();
    });

    expect(container.querySelector('.rj-cand-grid')).toBe(gridBefore);
    expect(container.querySelector('.rj-role-async-slot.rj-mentor-templates-slot')).toBe(slotBefore);
    expect(container.querySelector('.rj-cand-grid > aside')).toBe(asideBefore);
    expect(container.querySelector('.rj-account-card-secondary')).toBe(accountBefore);
    unmount();

    let rejectFetch!: (reason?: unknown) => void;
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((_resolve, reject) => {
          rejectFetch = reject;
        }),
    );

    const { container: errContainer } = render(
      <AuthProvider initialToken="token" initialUser={mentor}>
        <MemoryRouter>
          <MentorHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const errSlotBefore = errContainer.querySelector('.rj-role-async-slot.rj-mentor-templates-slot');
    const errAccountBefore = errContainer.querySelector('.rj-account-card-secondary');
    rejectFetch(new Error('Network down'));

    await waitFor(() => {
      expect(screen.getByText(/Chưa thể tải danh sách mẫu phiếu đánh giá lúc này/i)).toBeInTheDocument();
    });
    expect(errContainer.querySelector('.rj-role-async-slot.rj-mentor-templates-slot')).toBe(errSlotBefore);
    expect(errContainer.querySelector('.rj-account-card-secondary')).toBe(errAccountBefore);
  });

  it('preserves StaffHomePage and HrHomePage grid and reserved async slot DOM references across loading transitions', async () => {
    let resolveStaff!: (value: Response) => void;
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveStaff = resolve;
        }),
    );

    const staff = createUser('STAFF', 'Staff Stability');
    const { container: staffContainer, unmount } = render(
      <AuthProvider initialToken="token" initialUser={staff}>
        <MemoryRouter>
          <StaffHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const staffGridBefore = staffContainer.querySelector('.rj-cand-grid');
    const staffSlotBefore = staffContainer.querySelector('.rj-role-async-slot.rj-staff-positions-slot');
    resolveStaff({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([{ id: 1, code: 'JAVA', name: 'Java Backend', description: 'Backend' }]),
    } as unknown as Response);

    await waitFor(() => {
      expect(screen.getByText('Java Backend')).toBeInTheDocument();
    });
    expect(staffContainer.querySelector('.rj-cand-grid')).toBe(staffGridBefore);
    expect(staffContainer.querySelector('.rj-role-async-slot.rj-staff-positions-slot')).toBe(staffSlotBefore);
    unmount();

    let resolveHr!: (value: Response) => void;
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveHr = resolve;
        }),
    );

    const hr = createUser('HR', 'HR Stability');
    const { container: hrContainer } = render(
      <AuthProvider initialToken="token" initialUser={hr}>
        <MemoryRouter>
          <HrHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const hrGridBefore = hrContainer.querySelector('.rj-cand-grid');
    const hrSlotBefore = hrContainer.querySelector('.rj-role-async-slot.rj-hr-company-slot');
    const hrNextBoxBefore = hrContainer.querySelector('.rj-cand-next-box.rj-hr-next-box');
    const hrNextLinkBefore = screen.getByRole('link', { name: /Mở hồ sơ công ty/i });
    expect(
      screen.getByRole('status', { name: 'Đang xác định bước tiếp theo cho doanh nghiệp' }),
    ).toBeInTheDocument();

    resolveHr({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: 2,
          name: 'Công ty Cổ phần Giải pháp Số',
          taxCode: '0312345678',
          industry: 'Phần mềm',
          size: '51-200',
          address: 'TP.HCM',
          city: 'TP.HCM',
          website: 'https://example.vn',
          logoUrl: null,
          description: 'Mô tả',
          status: 'ACTIVE',
          version: 1,
        }),
    } as unknown as Response);

    await waitFor(() => {
      expect(screen.getByText('Công ty Cổ phần Giải pháp Số')).toBeInTheDocument();
    });
    expect(hrContainer.querySelector('.rj-cand-grid')).toBe(hrGridBefore);
    expect(hrContainer.querySelector('.rj-role-async-slot.rj-hr-company-slot')).toBe(hrSlotBefore);
    expect(hrContainer.querySelector('.rj-cand-next-box.rj-hr-next-box')).toBe(hrNextBoxBefore);
    const hrNextLinkAfter = screen.getByRole('link', { name: /Mở hồ sơ công ty/i });
    expect(hrNextLinkAfter).toBe(hrNextLinkBefore);
    expect(hrNextLinkAfter).toHaveTextContent('Mở hồ sơ công ty');
    expect(
      screen.queryByRole('status', { name: 'Đang xác định bước tiếp theo cho doanh nghiệp' }),
    ).not.toBeInTheDocument();
  });
});
