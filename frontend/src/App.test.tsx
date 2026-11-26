import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import App, { APP_NAME } from './App';
import {
  getAuthSessionHandlers,
  getAuthToken,
  request,
  resetAuthSessionState,
  setAuthSessionHandlers,
  setAuthToken,
} from './shared/api/httpClient';
import { navigateWithTransition } from './shared/utils/motion';
import { preloadRouteForPath } from './shared/utils/routeLazy';

vi.mock('./shared/utils/routeLazy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./shared/utils/routeLazy')>();
  return {
    ...actual,
    preloadRouteForPath: vi.fn((rawPath: string) => actual.preloadRouteForPath(rawPath)),
  };
});

function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

vi.mock('./features/candidate/api/jobRecommendations', () => ({
  fetchJobRecommendations: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    candidateId: 1,
    isCached: false,
    cachedAt: '2026-11-11T00:00:00Z',
    activeProvider: 'MOCK',
  }),
}));

describe('App Component', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
    window.history.pushState({}, '', '/');
  });

  it('renders application title and header branding', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'UP' }),
      } as unknown as Response),
    );

    render(<App />);

    expect(screen.getByTestId('app-title')).toHaveTextContent(APP_NAME);
    expect(screen.queryByTestId('app-version')).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Chế độ tối' })).toBeInTheDocument();

    const devDetails = document.querySelector('details.rj-dev-tools');
    expect(devDetails).toBeInTheDocument();
    expect(devDetails).not.toHaveAttribute('open');
    expect(screen.getByText('Trạng thái kết nối hệ thống:')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('backend-status-badge')).toHaveTextContent('UP');
    });
  });

  it('displays UP status when backend health check succeeds with UP payload', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'UP' }),
      } as unknown as Response),
    );

    render(<App />);

    const badge = screen.getByTestId('backend-status-badge');
    expect(badge).toBeInTheDocument();

    await waitFor(() => {
      expect(badge).toHaveTextContent('UP');
    });
    expect(badge).toHaveClass('status-up');
    expect(screen.getByText('Backend đang hoạt động bình thường')).toBeInTheDocument();
  });

  it('displays DOWN status when backend returns non-200 HTTP error', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({ code: 'EXTERNAL_UNAVAILABLE', message: 'Service down' }),
      } as unknown as Response),
    );

    render(<App />);

    await waitFor(() => {
      const badge = screen.getByTestId('backend-status-badge');
      expect(badge).toHaveTextContent('DOWN');
      expect(badge).toHaveClass('status-down');
    });

    expect(screen.getByText('HTTP 503 Service Unavailable')).toBeInTheDocument();
  });

  it('displays DOWN status when network connection fails or throws error', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => Promise.reject(new Error('Failed to fetch (connection refused)')));

    render(<App />);

    await waitFor(() => {
      const badge = screen.getByTestId('backend-status-badge');
      expect(badge).toHaveTextContent('DOWN');
      expect(badge).toHaveClass('status-down');
    });

    expect(screen.getByText('Failed to fetch (connection refused)')).toBeInTheDocument();
  });

  it('triggers manual refresh when clicking "Kiểm tra lại" button', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({}),
        } as unknown as Response),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'UP' }),
        } as unknown as Response),
      );

    globalThis.fetch = fetchMock;

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('backend-status-badge')).toHaveTextContent('DOWN');
    });

    const refreshButton = screen.getByRole('button', { name: /Kiểm tra lại/i });
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByTestId('backend-status-badge')).toHaveTextContent('UP');
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('displays initial CONNECTING... status before response arrives', async () => {
    let resolveFetch: (value: Response) => void;
    const pendingPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    globalThis.fetch = vi.fn().mockImplementation(() => pendingPromise);

    render(<App />);

    const badge = screen.getByTestId('backend-status-badge');
    expect(badge).toHaveTextContent('CONNECTING...');
    expect(badge).toHaveClass('status-connecting');

    // Clean up pending promise
    resolveFetch!({
      ok: true,
      json: () => Promise.resolve({ status: 'UP' }),
    } as unknown as Response);

    await waitFor(() => {
      expect(badge).toHaveTextContent('UP');
    });
  });

  it('renders role-centered landing content without technical showcase or MOD codes', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'UP' }),
      } as unknown as Response),
    );

    const { container } = render(<App />);

    expect(screen.getByRole('heading', { level: 2, name: /Rikkei Jobs giúp bạn làm gì/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Đăng nhập vào Rikkei Jobs/i })).toHaveAttribute('href', '/login');
    expect(screen.getAllByText('Sắp ra mắt').length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).not.toMatch(/MOD-01|MOD-07|Modular Monolith|Thông tin kỹ thuật Skeleton|T022DB0/i);

    await waitFor(() => {
      expect(screen.getByTestId('backend-status-badge')).toHaveTextContent('UP');
    });
  });

  it('uses Vietnamese fallback Không xác định instead of N/A when health payload has missing status', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as unknown as Response),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('backend-status-badge')).toHaveTextContent('DOWN');
    });
    expect(screen.getByText(/Trạng thái không xác định: Không xác định/)).toBeInTheDocument();
    expect(screen.queryByText(/N\/A/)).not.toBeInTheDocument();
  });

  it('displays login CTA linking to /login when unauthenticated visitor navigates to skill profile tab', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'UP' }),
      } as unknown as Response),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('backend-status-badge')).toHaveTextContent('UP');
    });

    const skillsTab = screen.getByRole('button', { name: 'Hồ sơ năng lực' });
    expect(skillsTab).toBeInTheDocument();

    fireEvent.click(skillsTab);

    expect(
      screen.getByText(/Vui lòng đăng nhập bằng tài khoản học viên \(LMS\) hoặc tài khoản doanh nghiệp/i),
    ).toBeInTheDocument();

    const ctaLink = screen.getByRole('link', { name: /Đăng nhập để xem hồ sơ năng lực/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute('href', '/login');
  });

  it('confirms interim LoginForm has been completely removed from application and DOM', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'UP' }),
      } as unknown as Response),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('backend-status-badge')).toHaveTextContent('UP');
    });

    const skillsTab = screen.getByRole('button', { name: 'Hồ sơ năng lực' });
    fireEvent.click(skillsTab);

    // Assert no password input or inline form exists
    expect(screen.queryByLabelText(/Mật khẩu/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Đăng nhập$/i })).not.toBeInTheDocument();
    expect(document.querySelector('.sp-login')).toBeNull();
  });

  it('redirects to /login and renders LoginPage when mounted <App /> encounters 401 on protected request without handler overwrite', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'UP' }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ code: 'UNAUTHORIZED', message: 'Phiên hết hạn' }),
      } as unknown as Response);
    });

    render(<App />);
    setAuthToken('stale-jwt-token');

    // Trigger protected request that encounters 401
    await act(async () => {
      await expect(request('/api/v1/profiles/me/skills')).rejects.toThrow();
    });

    // Assert router successfully navigated to /login and rendered LoginPage
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Đăng nhập$/i })).toBeInTheDocument();
    });
  });

  it('redirects to /change-password and renders ChangePasswordPage when mounted <App /> encounters 403 MUST_CHANGE_PASSWORD', async () => {
    // Set URL search params to initialize with candidate user needing password change
    window.history.pushState({}, '', '/?mockRole=CANDIDATE&mustChange=true');

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'UP' }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ code: 'MUST_CHANGE_PASSWORD', message: 'Cần đổi mật khẩu' }),
      } as unknown as Response);
    });

    render(<App />);

    // Trigger request that encounters 403 MUST_CHANGE_PASSWORD
    await act(async () => {
      await expect(request('/api/v1/profiles/me/skills')).rejects.toThrow();
    });

    // Assert router successfully navigated to /change-password and rendered ChangePasswordPage
    expect(
      await screen.findByRole('heading', { level: 1, name: /Đổi mật khẩu/i }, { timeout: 8000 }),
    ).toBeInTheDocument();
  }, 15000);

  it('attaches Bearer token from AuthProvider session on mounted <App /> requests', async () => {
    window.history.pushState({}, '', '/candidate?mockRole=CANDIDATE');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ skills: [] }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    render(<App />);

    await act(async () => {
      await request('/api/v1/profiles/me/skills');
    });

    const skillsCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/v1/profiles/me/skills'),
    );
    expect(skillsCall).toBeDefined();
    const [, init] = skillsCall as [string, RequestInit];
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer dev-preview-token');
  });

  it('clears session and navigates to /login with replace: true on 401 when mounted on protected route', async () => {
    window.history.pushState({}, '', '/candidate?mockRole=CANDIDATE');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ code: 'UNAUTHORIZED', message: 'Phiên hết hạn' }),
    } as unknown as Response);

    render(<App />);
    expect(getAuthToken()).toBe('dev-preview-token');

    await act(async () => {
      await expect(request('/api/v1/profiles/me/skills')).rejects.toThrow();
    });

    expect(getAuthToken()).toBeNull();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Đăng nhập$/i })).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe('/login');
    expect(replaceStateSpy).toHaveBeenCalled();
  });

  it('preserves session and stays on current protected route when mounted <App /> encounters 403 FORBIDDEN', async () => {
    window.history.pushState({}, '', '/candidate?mockRole=CANDIDATE');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ code: 'FORBIDDEN', message: 'Không có quyền truy cập' }),
    } as unknown as Response);

    render(<App />);
    expect(getAuthToken()).toBe('dev-preview-token');

    await act(async () => {
      await expect(request('/api/v1/admin/users')).rejects.toThrow();
    });

    expect(getAuthToken()).toBe('dev-preview-token');
    expect(window.location.pathname).toBe('/candidate');
    expect(
      await screen.findByText(/Chào mừng, Nguyen Van Sinh Vien!/i, {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: /^Đăng nhập$/i })).not.toBeInTheDocument();
  }, 15000);

  it('invokes session handler once under React.StrictMode and cleans up handlers on unmount', async () => {
    window.history.pushState({}, '', '/?mockRole=CANDIDATE');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'UP' }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ code: 'UNAUTHORIZED', message: 'Phiên hết hạn' }),
      } as unknown as Response);
    });

    const { unmount } = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );

    const replaceCallsBefore = replaceStateSpy.mock.calls.length;
    const pushCallsBefore = pushStateSpy.mock.calls.length;

    await act(async () => {
      await expect(request('/api/v1/profiles/me/skills')).rejects.toThrow();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Đăng nhập$/i })).toBeInTheDocument();
    });

    const loginReplaceCalls = replaceStateSpy.mock.calls
      .slice(replaceCallsBefore)
      .filter((args) => String(args[2] ?? '').includes('/login'));
    const loginPushCalls = pushStateSpy.mock.calls
      .slice(pushCallsBefore)
      .filter((args) => String(args[2] ?? '').includes('/login'));
    expect(loginReplaceCalls).toHaveLength(1);
    expect(loginPushCalls).toHaveLength(0);

    unmount();
    expect(getAuthSessionHandlers()).toEqual({});
  });

  it('preserves from: /403 on 401 under React.StrictMode and uses null state on excluded routes', async () => {
    window.history.pushState({}, '', '/403?mockRole=HR');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ code: 'UNAUTHORIZED', message: 'Phiên hết hạn' }),
    } as unknown as Response);

    const { unmount } = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );

    await act(async () => {
      await expect(request('/api/v1/companies/me')).rejects.toThrow();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Đăng nhập$/i })).toBeInTheDocument();
    });

    expect(window.location.pathname).toBe('/login');
    expect((window.history.state as { usr?: unknown } | null)?.usr).toMatchObject({
      from: { pathname: '/403', search: '?mockRole=HR' },
    });
    unmount();

    window.history.pushState({}, '', '/forgot-password');
    setAuthToken('stale-token');

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );

    await act(async () => {
      await expect(request('/api/v1/companies/me')).rejects.toThrow();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Đăng nhập$/i })).toBeInTheDocument();
    });

    expect(window.location.pathname).toBe('/login');
    expect((window.history.state as { usr?: unknown } | null)?.usr ?? null).toBeNull();
  });

  it('cancels a pending navigateWithTransition when onUnauthorized fires on 401 and preserves /login state.from', async () => {
    window.history.pushState({}, '', '/hr?mockRole=HR');

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/profiles/me/skills')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ code: 'UNAUTHORIZED', message: 'Phiên hết hạn' }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      } as unknown as Response);
    });

    render(<App />);
    expect(await screen.findByText('Đăng tin tuyển dụng', {}, { timeout: 8000 })).toBeInTheDocument();

    const deferredPreload = createDeferred<void>();
    const staleUpdateDOM = vi.fn();
    const navPromise = navigateWithTransition(staleUpdateDOM, () => deferredPreload.promise);

    await act(async () => {
      await expect(request('/api/v1/profiles/me/skills')).rejects.toThrow();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Đăng nhập$/i })).toBeInTheDocument();
    });

    await act(async () => {
      deferredPreload.resolve();
      await navPromise;
    });

    expect(staleUpdateDOM).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/login');
    expect((window.history.state as { usr?: unknown } | null)?.usr).toMatchObject({
      from: { pathname: '/hr', search: '?mockRole=HR' },
    });
  }, 15000);

  it('supersedes a pending onMustChangePassword preload when 401 onUnauthorized fires before preload resolves', async () => {
    window.history.pushState({}, '', '/hr?mockRole=HR');

    const deferredPreload = createDeferred<void>();
    vi.mocked(preloadRouteForPath).mockImplementationOnce((rawPath: string) =>
      rawPath === '/change-password' ? deferredPreload.promise : undefined,
    );

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/v1/profiles/me/skills')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ code: 'MUST_CHANGE_PASSWORD', message: 'Cần đổi mật khẩu' }),
        } as unknown as Response);
      }
      if (String(url).includes('/api/v1/companies/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ code: 'UNAUTHORIZED', message: 'Phiên hết hạn' }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      } as unknown as Response);
    });

    render(<App />);
    expect(await screen.findByText('Đăng tin tuyển dụng', {}, { timeout: 8000 })).toBeInTheDocument();

    await act(async () => {
      await expect(request('/api/v1/profiles/me/skills')).rejects.toThrow();
    });

    expect(window.location.pathname).toBe('/hr');

    await act(async () => {
      await expect(request('/api/v1/companies/me')).rejects.toThrow();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Đăng nhập$/i })).toBeInTheDocument();
    });
    expect(getAuthToken()).toBeNull();

    await act(async () => {
      deferredPreload.resolve();
      await Promise.resolve();
    });

    expect(window.location.pathname).toBe('/login');
    expect(getAuthToken()).toBeNull();
    expect(screen.queryByRole('heading', { level: 1, name: /^Đổi mật khẩu$/i })).not.toBeInTheDocument();
    expect((window.history.state as { usr?: unknown } | null)?.usr).toMatchObject({
      from: { pathname: '/hr', search: '?mockRole=HR' },
    });
  }, 15000);
});
