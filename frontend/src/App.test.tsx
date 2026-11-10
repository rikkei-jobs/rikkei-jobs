import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App, { APP_NAME } from './App';

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
});
