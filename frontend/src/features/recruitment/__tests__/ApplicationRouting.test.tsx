import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../../../App';
import {
  resetAuthSessionState,
  setAuthSessionHandlers,
  setAuthToken,
} from '../../../shared/api/httpClient';
import { resetMotionRegistry } from '../../../shared/utils/motion';
import { AuthProvider } from '../../identity/context/AuthContext';
import type { UserDto } from '../../identity/types';
import { recruitmentApi } from '../api/recruitmentApi';

const createUser = (role: UserDto['role']): UserDto => ({
  id: role === 'CANDIDATE' ? 1 : 20,
  email: `${role.toLowerCase()}@rikkeijobs.test`,
  fullName: `Người dùng ${role}`,
  role,
  companyId: role === 'HR' ? 1 : null,
  status: 'ACTIVE',
  mustChangePassword: false,
});

describe('Recruitment Application Routing & RBAC', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetMotionRegistry();
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken('jwt-token');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    const actWarnings = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => args.map(String).join(' '))
      .filter((msg: string) => /act\(/i.test(msg) || /not wrapped in act/i.test(msg));
    expect(actWarnings).toEqual([]);
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
  });

  it('allows CANDIDATE on /candidate/applications and keeps sidebar link active', async () => {
    const listSpy = vi.spyOn(recruitmentApi, 'listMyApplications').mockResolvedValueOnce({
      items: [],
      page: 1,
      size: 10,
      totalItems: 0,
      totalPages: 0,
    });

    render(
      <AuthProvider initialToken="jwt-token" initialUser={createUser('CANDIDATE')}>
        <MemoryRouter initialEntries={['/candidate/applications']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Ứng tuyển của tôi' },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('link', { name: 'Ứng tuyển' })).toHaveAttribute('aria-current', 'page');
  });

  it('redirects CANDIDATE deep-link /candidate/applications/42 to /candidate/applications?id=42 with active sidebar link', async () => {
    const detailSpy = vi.spyOn(recruitmentApi, 'getMyApplicationDetail').mockResolvedValueOnce({
      id: 42,
      jobId: 7,
      jobTitle: 'Kỹ sư Java Backend',
      companyName: 'Rikkeisoft',
      cvId: 5,
      cvSnapshotUrl: '/api/v1/me/applications/42/cv-snapshot',
      coverLetter: null,
      status: 'SUBMITTED',
      canWithdraw: true,
      createdAt: '2026-11-15T08:00:00Z',
      updatedAt: '2026-11-15T08:00:00Z',
      histories: [],
    });

    render(
      <AuthProvider initialToken="jwt-token" initialUser={createUser('CANDIDATE')}>
        <MemoryRouter initialEntries={['/candidate/applications/42']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kỹ sư Java Backend' }),
    ).toBeInTheDocument();
    expect(detailSpy).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    expect(screen.getByRole('link', { name: 'Ứng tuyển' })).toHaveAttribute('aria-current', 'page');
  });

  it.each(['HR', 'MENTOR', 'STAFF', 'ADMIN'] as const)(
    'denies %s access to /candidate/applications and /candidate/applications/42 with 403 and zero API calls',
    async (role) => {
      const listSpy = vi.spyOn(recruitmentApi, 'listMyApplications');
      const detailSpy = vi.spyOn(recruitmentApi, 'getMyApplicationDetail');

      const { unmount } = render(
        <AuthProvider initialToken="jwt-token" initialUser={createUser(role)}>
          <MemoryRouter initialEntries={['/candidate/applications']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(await screen.findByText(/Bạn không có quyền truy cập trang này/i)).toBeInTheDocument();
      unmount();

      render(
        <AuthProvider initialToken="jwt-token" initialUser={createUser(role)}>
          <MemoryRouter initialEntries={['/candidate/applications/42']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(await screen.findByText(/Bạn không có quyền truy cập trang này/i)).toBeInTheDocument();
      expect(listSpy).not.toHaveBeenCalled();
      expect(detailSpy).not.toHaveBeenCalled();
    },
  );

  it('redirects unauthenticated users to /login without calling recruitment APIs', async () => {
    setAuthToken(null);
    const listSpy = vi.spyOn(recruitmentApi, 'listMyApplications');

    render(
      <AuthProvider initialToken={null} initialUser={null}>
        <MemoryRouter initialEntries={['/candidate/applications']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByRole('heading', { name: /Đăng nhập/i })).toBeInTheDocument();
    expect(listSpy).not.toHaveBeenCalled();
  });

  it('allows HR on /hr/recruitment, /hr/jobs/2/applications, and /hr/applications/10 with active Tuyển dụng sidebar link', async () => {
    const jobsSpy = vi.spyOn(recruitmentApi, 'listHrJobs').mockResolvedValue({
      items: [
        {
          id: 2,
          title: 'Fresher Java Developer',
          companyId: 1,
          companyName: 'Rikkei Digital',
          status: 'APPROVED',
          expired: false,
          deadline: '2026-12-31T00:00:00Z',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        },
      ],
      page: 1,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    });
    const appsSpy = vi.spyOn(recruitmentApi, 'listHrJobApplications').mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      totalItems: 0,
      totalPages: 0,
    });
    const detailSpy = vi.spyOn(recruitmentApi, 'getApplicationProcessDetail').mockResolvedValue({
      id: 10,
      jobId: 2,
      jobTitle: 'Fresher Java Developer',
      companyId: 1,
      companyName: 'Rikkei Digital',
      candidateUserId: 5,
      candidateName: 'Nguyễn Văn An',
      candidateEmail: 'an@rikkeijobs.test',
      cvId: 3,
      cvSnapshotUrl: '/api/v1/applications/10/cv-snapshot',
      coverLetter: null,
      status: 'SCREENING',
      matchScore: 84,
      canWithdraw: true,
      canSendOffer: false,
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
      histories: [],
      createdAt: '2026-11-15T08:00:00Z',
      updatedAt: '2026-11-16T08:00:00Z',
    });

    const { unmount: unmountHrList } = render(
      <AuthProvider initialToken="jwt-token" initialUser={createUser('HR')}>
        <MemoryRouter initialEntries={['/hr/recruitment']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Quản lý quy trình tuyển dụng' },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(jobsSpy).toHaveBeenCalledTimes(1);
      expect(appsSpy).toHaveBeenCalledWith(
        2,
        { status: '', page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });
    expect(screen.getByRole('link', { name: 'Tuyển dụng' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    unmountHrList();

    const { unmount: unmountHrJobApps } = render(
      <AuthProvider initialToken="jwt-token" initialUser={createUser('HR')}>
        <MemoryRouter initialEntries={['/hr/jobs/2/applications']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Quản lý quy trình tuyển dụng' },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tuyển dụng' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    unmountHrJobApps();

    render(
      <AuthProvider initialToken="jwt-token" initialUser={createUser('HR')}>
        <MemoryRouter initialEntries={['/hr/applications/10']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' }),
    ).toBeInTheDocument();
    expect(detailSpy).toHaveBeenCalledWith(10, expect.any(AbortSignal));
    expect(screen.getByRole('link', { name: 'Tuyển dụng' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('allows STAFF on /staff/applications and /staff/applications/10 with active Hồ sơ ứng tuyển sidebar link', async () => {
    const staffSpy = vi.spyOn(recruitmentApi, 'listStaffApplications').mockResolvedValueOnce({
      items: [],
      page: 1,
      size: 20,
      totalItems: 0,
      totalPages: 0,
    });
    const detailSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce({
        id: 10,
        jobId: 2,
        jobTitle: 'Fresher Java Developer',
        companyId: 1,
        companyName: 'Rikkei Digital',
        candidateUserId: 5,
        candidateName: 'Trần Thị Bình',
        candidateEmail: 'binh@rikkeijobs.test',
        cvId: 3,
        cvSnapshotUrl: '/api/v1/applications/10/cv-snapshot',
        coverLetter: null,
        status: 'INTERVIEW',
        matchScore: 90,
        canWithdraw: true,
        canSendOffer: true,
        allowedTransitions: ['REJECTED'],
        rounds: [],
        histories: [],
        createdAt: '2026-11-15T08:00:00Z',
        updatedAt: '2026-11-16T08:00:00Z',
      });

    const { unmount } = render(
      <AuthProvider initialToken="jwt-token" initialUser={createUser('STAFF')}>
        <MemoryRouter initialEntries={['/staff/applications']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Theo dõi hồ sơ ứng tuyển' },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(staffSpy).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('link', { name: 'Hồ sơ ứng tuyển' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    unmount();

    render(
      <AuthProvider initialToken="jwt-token" initialUser={createUser('STAFF')}>
        <MemoryRouter initialEntries={['/staff/applications/10']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Trần Thị Bình' }),
    ).toBeInTheDocument();
    expect(detailSpy).toHaveBeenCalledWith(10, expect.any(AbortSignal));
    expect(screen.getByRole('link', { name: 'Hồ sơ ứng tuyển' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it.each(['CANDIDATE', 'STAFF', 'MENTOR', 'ADMIN'] as const)(
    'denies %s access to /hr/recruitment and /hr/applications/10 with 403 and zero API calls',
    async (role) => {
      const jobsSpy = vi.spyOn(recruitmentApi, 'listHrJobs');
      const detailSpy = vi.spyOn(recruitmentApi, 'getApplicationProcessDetail');

      const { unmount } = render(
        <AuthProvider initialToken="jwt-token" initialUser={createUser(role)}>
          <MemoryRouter initialEntries={['/hr/recruitment']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(await screen.findByText(/Bạn không có quyền truy cập trang này/i)).toBeInTheDocument();
      unmount();

      render(
        <AuthProvider initialToken="jwt-token" initialUser={createUser(role)}>
          <MemoryRouter initialEntries={['/hr/applications/10']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(await screen.findByText(/Bạn không có quyền truy cập trang này/i)).toBeInTheDocument();
      expect(jobsSpy).not.toHaveBeenCalled();
      expect(detailSpy).not.toHaveBeenCalled();
    },
  );

  it.each(['CANDIDATE', 'HR', 'MENTOR', 'ADMIN'] as const)(
    'denies %s access to /staff/applications and /staff/applications/10 with 403 and zero API calls',
    async (role) => {
      const staffSpy = vi.spyOn(recruitmentApi, 'listStaffApplications');
      const detailSpy = vi.spyOn(recruitmentApi, 'getApplicationProcessDetail');

      const { unmount } = render(
        <AuthProvider initialToken="jwt-token" initialUser={createUser(role)}>
          <MemoryRouter initialEntries={['/staff/applications']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(await screen.findByText(/Bạn không có quyền truy cập trang này/i)).toBeInTheDocument();
      unmount();

      render(
        <AuthProvider initialToken="jwt-token" initialUser={createUser(role)}>
          <MemoryRouter initialEntries={['/staff/applications/10']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(await screen.findByText(/Bạn không có quyền truy cập trang này/i)).toBeInTheDocument();
      expect(staffSpy).not.toHaveBeenCalled();
      expect(detailSpy).not.toHaveBeenCalled();
    },
  );
});
