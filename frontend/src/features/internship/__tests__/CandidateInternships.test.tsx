import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../identity/context/AuthContext';
import type { UserDto } from '../../identity/types';
import {
  resetAuthSessionState,
  setAuthSessionHandlers,
  setAuthToken,
} from '../../../shared/api/httpClient';
import { AppRoutes } from '../../../App';
import * as internshipApi from '../api/candidateInternships';
import { fetchCandidateInternships, fetchMyInternships } from '../api/candidateInternships';
import { CandidateInternships } from '../components/CandidateInternships';
import { CandidateInternshipsPage } from '../pages/CandidateInternshipsPage';
import type { CandidateInternship } from '../types';

const CANDIDATE_USER: UserDto = {
  id: 1,
  email: 'candidate1@rikkeijobs.test',
  fullName: 'Nguyễn Văn An',
  role: 'CANDIDATE',
  companyId: null,
  status: 'ACTIVE',
  mustChangePassword: false,
};

const createUser = (role: UserDto['role'], overrides: Partial<UserDto> = {}): UserDto => ({
  id: role === 'CANDIDATE' ? 1 : 20,
  email: `${role.toLowerCase()}@rikkeijobs.test`,
  fullName: `Người dùng ${role}`,
  role,
  companyId: role === 'HR' ? 1 : null,
  status: 'ACTIVE',
  mustChangePassword: false,
  ...overrides,
});

const SAMPLE_INTERNSHIP: CandidateInternship = {
  id: 10,
  batchId: 'IOC-JB-2026-09',
  batchName: 'Thực tập Java Backend Tháng 09/2026',
  groupName: 'Nhóm Java Backend 01',
  topicName: 'Hệ thống đặt lịch phòng họp',
  mentorEmail: 'mentor1@rikkeisoft.com',
  startDate: '2026-09-07',
  endDate: '2026-10-30',
  finalScore: 8.5,
  syncedAt: '2026-11-20T08:30:00+07:00',
  tasks: [
    {
      id: 101,
      title: 'Phân tích nghiệp vụ & thiết kế CSDL',
      acceptedScore: 8.5,
      acceptedAt: '2026-09-25T17:00:00+07:00',
    },
    {
      id: 102,
      title: 'Xây dựng REST API Spring Boot',
      acceptedScore: 9.0,
      acceptedAt: '2026-10-10T17:00:00+07:00',
    },
    {
      id: 103,
      title: 'Kiểm thử tích hợp & hoàn thiện tài liệu',
      acceptedScore: 8.0,
      acceptedAt: '2026-10-28T17:00:00+07:00',
    },
  ],
};

const NULLABLE_INTERNSHIP = {
  id: 11,
  batchId: 'IOC-FE-2026-10',
  batchName: null,
  groupName: null,
  topicName: null,
  mentorEmail: null,
  startDate: null,
  endDate: null,
  finalScore: null,
  syncedAt: null,
  tasks: [
    {
      id: 201,
      title: 'Khởi tạo dự án React',
      acceptedScore: null,
      acceptedAt: null,
    },
  ],
} as unknown as CandidateInternship;

const jsonOk = (body: unknown, status = 200): Response =>
  ({
    ok: true,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  }) as unknown as Response;

const jsonError = (status: number, code: string, message: string): Response =>
  ({
    ok: false,
    status,
    statusText: code,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve({ code, message }),
  }) as unknown as Response;

describe('CandidateInternships (API, UI States, Semantics & Route Guard)', () => {
  const originalFetch = globalThis.fetch;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken('cand-jwt');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    const actWarnings = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => args.map(String).join(' '))
      .filter((msg: string) => /act\(/i.test(msg) || /not wrapped in act/i.test(msg));
    expect(actWarnings).toEqual([]);
    consoleErrorSpy.mockRestore();

    globalThis.fetch = originalFetch;
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
  });

  describe('A. API client (candidateInternships.ts)', () => {
    it('fetchMyInternships sends GET /api/v1/profiles/me/internships with Bearer token and AbortSignal', async () => {
      const controller = new AbortController();
      const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk([SAMPLE_INTERNSHIP]));
      globalThis.fetch = fetchMock;

      const result = await fetchMyInternships(controller.signal);

      expect(result).toEqual([SAMPLE_INTERNSHIP]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/profiles/me/internships');
      expect(init.method).toBe('GET');
      expect(init.signal).toBe(controller.signal);
      const headers = new Headers(init.headers);
      expect(headers.get('Authorization')).toBe('Bearer cand-jwt');
    });

    it('fetchCandidateInternships sends GET /api/v1/profiles/42/internships with Bearer token and AbortSignal', async () => {
      const controller = new AbortController();
      const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk([SAMPLE_INTERNSHIP]));
      globalThis.fetch = fetchMock;

      const result = await fetchCandidateInternships(42, controller.signal);

      expect(result).toEqual([SAMPLE_INTERNSHIP]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/profiles/42/internships');
      expect(init.method).toBe('GET');
      expect(init.signal).toBe(controller.signal);
      const headers = new Headers(init.headers);
      expect(headers.get('Authorization')).toBe('Bearer cand-jwt');
    });

    it('removes unused getProfileInternships alias', () => {
      expect('getProfileInternships' in internshipApi).toBe(false);
    });
  });

  describe('B. CandidateInternships component states & formatting', () => {
    it('renders loading state with 1 h1 and aborts in-flight fetch on unmount', async () => {
      let capturedSignal: AbortSignal | undefined;
      let resolveFetch: (res: Response) => void = () => {};

      globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        capturedSignal = init?.signal ?? undefined;
        return new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        });
      });

      const { unmount } = render(
        <AuthProvider initialToken="cand-jwt" initialUser={CANDIDATE_USER}>
          <CandidateInternships />
        </AuthProvider>,
      );

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1, name: 'Thực tập IOC' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/Đang tải thông tin thực tập/i);
      expect(capturedSignal?.aborted).toBe(false);

      unmount();
      expect(capturedSignal?.aborted).toBe(true);

      await act(async () => {
        resolveFetch(jsonOk([]));
      });
    });

    it('renders no-user state with 1 h1 and h2.ci-status-title when userId and auth user are absent', () => {
      render(<CandidateInternships />);

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1, name: 'Thực tập IOC' })).toBeInTheDocument();

      const statusHeading = screen.getByRole('heading', {
        level: 2,
        name: /Không tìm thấy tài khoản/i,
      });
      expect(statusHeading).toHaveClass('ci-status-title');
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('calls /api/v1/profiles/me/internships by default and renders formatted internship data', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk([SAMPLE_INTERNSHIP]));
      globalThis.fetch = fetchMock;

      render(
        <AuthProvider initialToken="cand-jwt" initialUser={CANDIDATE_USER}>
          <CandidateInternships />
        </AuthProvider>,
      );

      expect(await screen.findByText(SAMPLE_INTERNSHIP.batchName!)).toBeInTheDocument();
      const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toBe('/api/v1/profiles/me/internships');

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1, name: 'Thực tập IOC' })).toBeInTheDocument();
      expect(screen.getByText('IOC-JB-2026-09')).toBeInTheDocument();
      expect(screen.getByText('Nhóm Java Backend 01')).toBeInTheDocument();
      expect(screen.getByText('Hệ thống đặt lịch phòng họp')).toBeInTheDocument();
      expect(screen.getByText('mentor1@rikkeisoft.com')).toBeInTheDocument();
      expect(screen.getByText('07/09/2026 – 30/10/2026')).toBeInTheDocument();

      const scoreValue = screen.getByText('8.50').closest('.ci-stat-value');
      expect(scoreValue).not.toBeNull();
      expect(scoreValue).toHaveTextContent('8.50/10');
      expect(scoreValue).toHaveClass('rj-tabular-nums');

      const tasksBox = screen.getByText('hạng mục').closest('.ci-stat-value');
      expect(tasksBox).not.toBeNull();
      expect(tasksBox).toHaveTextContent('3 hạng mục');

      const overview = screen.getByLabelText('Thống kê thực tập');
      expect(overview).toHaveTextContent('1');
      expect(overview).toHaveTextContent('3');
      expect(overview).toHaveTextContent('Hạng mục nghiệm thu');
    });

    it('calls /api/v1/profiles/77/internships when explicit userId={77} is passed', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk([SAMPLE_INTERNSHIP]));
      globalThis.fetch = fetchMock;

      render(<CandidateInternships userId={77} candidateName="Trần Văn B" />);

      expect(await screen.findByText(SAMPLE_INTERNSHIP.batchName!)).toBeInTheDocument();
      const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toBe('/api/v1/profiles/77/internships');
      expect(screen.getByText(/Trần Văn B/)).toBeInTheDocument();
    });

    it('renders clean Vietnamese fallbacks for nullable score, dates, group, topic, and mentor', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonOk([NULLABLE_INTERNSHIP]));

      render(
        <AuthProvider initialToken="cand-jwt" initialUser={CANDIDATE_USER}>
          <CandidateInternships />
        </AuthProvider>,
      );

      expect(await screen.findByText('Chưa có điểm')).toBeInTheDocument();
      expect(screen.queryByText(/\/10/)).not.toBeInTheDocument();
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
      expect(screen.queryByText(/--\/10/)).not.toBeInTheDocument();
      expect(screen.getByText('Chưa cập nhật thời gian')).toBeInTheDocument();
      expect(screen.getByText('Chưa cập nhật đề tài')).toBeInTheDocument();
      expect(screen.getByText('Chưa phân nhóm')).toBeInTheDocument();
      expect(screen.getByText('Chưa có mentor')).toBeInTheDocument();
    });

    it('renders empty state with 1 h1 and authentic Vietnamese copy without PM/batchId/task jargon', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonOk([]));

      const { container } = render(
        <AuthProvider initialToken="cand-jwt" initialUser={CANDIDATE_USER}>
          <CandidateInternships />
        </AuthProvider>,
      );

      expect(
        await screen.findByRole('heading', { level: 2, name: 'Chưa có thông tin thực tập IOC' }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

      const textContent = container.textContent ?? '';
      expect(textContent).not.toMatch(/\bPM\b/);
      expect(textContent).not.toMatch(/\bbatchId\b/i);
      expect(textContent).not.toMatch(/\btask\b/i);
    });

    it('renders retryable error on 503 EXTERNAL_UNAVAILABLE and recovers on retry click', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonError(503, 'EXTERNAL_UNAVAILABLE', 'Hệ thống quản lý thực tập IOC tạm thời không phản hồi.'),
        )
        .mockResolvedValueOnce(jsonOk([SAMPLE_INTERNSHIP]));
      globalThis.fetch = fetchMock;

      render(
        <AuthProvider initialToken="cand-jwt" initialUser={CANDIDATE_USER}>
          <CandidateInternships />
        </AuthProvider>,
      );

      const alert = await screen.findByRole('alert');
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(alert).not.toHaveTextContent(/\bPM\b/);

      const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
      fireEvent.click(retryBtn);

      expect(await screen.findByText(SAMPLE_INTERNSHIP.batchName!)).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('renders retryable error on network failure and recovers on retry click', async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(jsonOk([SAMPLE_INTERNSHIP]));
      globalThis.fetch = fetchMock;

      render(
        <AuthProvider initialToken="cand-jwt" initialUser={CANDIDATE_USER}>
          <CandidateInternships />
        </AuthProvider>,
      );

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Không thể kết nối đến máy chủ/i);
      fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

      expect(await screen.findByText(SAMPLE_INTERNSHIP.batchName!)).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('renders non-retryable error on 403 and 404 without "Thử lại" button', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(jsonError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập'));

      const { unmount } = render(<CandidateInternships userId={99} />);

      const alert403 = await screen.findByRole('alert');
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(alert403).toHaveTextContent(/Không có quyền truy cập/i);
      expect(screen.queryByRole('button', { name: /Thử lại/i })).not.toBeInTheDocument();
      unmount();

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(jsonError(404, 'NOT_FOUND', 'Không tìm thấy hồ sơ thực tập'));

      render(<CandidateInternships userId={99999} />);

      const alert404 = await screen.findByRole('alert');
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(alert404).toHaveTextContent(/Không tìm thấy thông tin thực tập/i);
      expect(screen.queryByRole('button', { name: /Thử lại/i })).not.toBeInTheDocument();
    });
  });

  describe('C. CandidateInternshipsPage & RoleHomeLayout', () => {
    it('renders role badge "Ứng viên", exactly 1 h1, and main landmark', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonOk([SAMPLE_INTERNSHIP]));

      render(
        <AuthProvider initialToken="cand-jwt" initialUser={CANDIDATE_USER}>
          <MemoryRouter initialEntries={['/candidate/internships']}>
            <CandidateInternshipsPage />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(await screen.findByText(SAMPLE_INTERNSHIP.batchName!)).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1, name: 'Thực tập IOC' })).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByText('Ứng viên')).toBeInTheDocument();
      expect(screen.queryByText(/Ứng Viên \(Candidate\)/i)).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Thực tập IOC' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });
  });

  describe('D. Route guard RequireRole via AppRoutes', () => {
    it('allows CANDIDATE on /candidate/internships and calls /api/v1/profiles/me/internships', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk([SAMPLE_INTERNSHIP]));
      globalThis.fetch = fetchMock;

      render(
        <AuthProvider initialToken="cand-jwt" initialUser={createUser('CANDIDATE')}>
          <MemoryRouter initialEntries={['/candidate/internships']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Thực tập IOC' }),
      ).toBeInTheDocument();
      expect(await screen.findByText(SAMPLE_INTERNSHIP.batchName!)).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/profiles/me/internships');
    });

    it.each(['HR', 'MENTOR'] as const)(
      'blocks %s on /candidate/internships with 403 ForbiddenPage without calling fetch',
      async (role) => {
        const fetchMock = vi.fn();
        globalThis.fetch = fetchMock;

        render(
          <AuthProvider initialToken="role-jwt" initialUser={createUser(role)}>
            <MemoryRouter initialEntries={['/candidate/internships']}>
              <AppRoutes />
            </MemoryRouter>
          </AuthProvider>,
        );

        expect(
          await screen.findByRole('heading', {
            level: 1,
            name: /Bạn không có quyền truy cập trang này/i,
          }),
        ).toBeInTheDocument();
        expect(screen.getByText('403')).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it('redirects unauthenticated users from /candidate/internships to /login without calling fetch', async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/candidate/internships']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(await screen.findByRole('heading', { name: /Cổng Đăng Nhập/i })).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
