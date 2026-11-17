import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import App, { APP_NAME } from './App';
import { request, setAuthToken } from './shared/api/httpClient';

describe('App Component', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
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
    expect(screen.getByTestId('app-version')).toHaveTextContent('v1.0.0-sprint1');

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

  it('renders all 7 business modules cards with expected codes and metadata', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'UP' }),
      } as unknown as Response),
    );

    render(<App />);

    const moduleKeys = [
      'candidate',
      'company',
      'internship',
      'assessment',
      'learning',
      'recruitment',
      'ai',
    ];

    for (const key of moduleKeys) {
      expect(screen.getByTestId(`module-${key}`)).toBeInTheDocument();
    }

    expect(screen.getByText('MOD-01')).toBeInTheDocument();
    expect(screen.getByText('MOD-07')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('backend-status-badge')).toHaveTextContent('UP');
    });
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
      screen.getByText(/Vui lòng đăng nhập bằng tài khoản học viên \(LMS SSO\) hoặc tài khoản doanh nghiệp/i),
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
      expect(screen.getByRole('heading', { level: 1, name: /Cổng Đăng Nhập/i })).toBeInTheDocument();
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
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Đổi Mật Khẩu/i })).toBeInTheDocument();
    });
  });
});
