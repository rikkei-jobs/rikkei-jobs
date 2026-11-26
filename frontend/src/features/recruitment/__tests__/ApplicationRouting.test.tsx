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
      await screen.findByRole('heading', { level: 1, name: 'Ứng tuyển của tôi' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('link', { name: 'Ứng tuyển' })).toHaveAttribute(
      'aria-current',
      'page',
    );
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
    expect(screen.getByRole('link', { name: 'Ứng tuyển' })).toHaveAttribute(
      'aria-current',
      'page',
    );
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
});
