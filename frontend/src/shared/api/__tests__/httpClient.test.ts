import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  httpClient,
  request,
  setAuthToken,
  getAuthToken,
  setAuthSessionHandlers,
  resetAuthSessionState,
} from '../httpClient';
import { ApiError } from '../auth';

const okResponse = (body: unknown, status = 200): Response =>
  ({
    ok: true,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  }) as unknown as Response;

const errorResponse = (status: number, body: unknown): Response =>
  ({
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  }) as unknown as Response;

describe('Centralized HTTP Auth Client (httpClient)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
  });

  it('exports httpClient wrapper object matching functional interface', () => {
    expect(httpClient.request).toBe(request);
    expect(httpClient.setAuthToken).toBe(setAuthToken);
    expect(httpClient.getAuthToken).toBe(getAuthToken);
    expect(httpClient.setAuthSessionHandlers).toBe(setAuthSessionHandlers);
    expect(httpClient.resetAuthSessionState).toBe(resetAuthSessionState);
  });

  it('automatically attaches Authorization: Bearer <token> when in-memory token is set', async () => {
    setAuthToken('valid-candidate-jwt-token');
    expect(getAuthToken()).toBe('valid-candidate-jwt-token');

    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true }));
    globalThis.fetch = fetchMock;

    const result = await request<{ success: boolean }>('/api/v1/profiles/me/skills');
    expect(result).toEqual({ success: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer valid-candidate-jwt-token');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('sends anonymous request without Authorization header when token is null', async () => {
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();

    const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'UP' }));
    globalThis.fetch = fetchMock;

    await request('/api/v1/health');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('bypasses Authorization header when skipAuth is explicitly set to true', async () => {
    setAuthToken('some-token');

    const fetchMock = vi.fn().mockResolvedValue(okResponse({ ok: true }));
    globalThis.fetch = fetchMock;

    await request('/api/v1/public-endpoint', { skipAuth: true });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('handles 401 unauthorized: clears in-memory token and invokes onUnauthorized callback', async () => {
    setAuthToken('expired-jwt');
    const onUnauthorized = vi.fn();
    setAuthSessionHandlers({ onUnauthorized });

    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(401, {
        code: 'UNAUTHORIZED',
        message: 'Phiên đăng nhập đã hết hạn',
      }),
    );

    await expect(request('/api/v1/protected')).rejects.toThrow(ApiError);
    expect(getAuthToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does NOT clear token or trigger onUnauthorized when skipAuth is true on 401 error', async () => {
    setAuthToken('valid-existing-token');
    const onUnauthorized = vi.fn();
    setAuthSessionHandlers({ onUnauthorized });

    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(401, {
        code: 'INVALID_CREDENTIALS',
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác',
      }),
    );

    await expect(request('/api/v1/auth/login', { skipAuth: true })).rejects.toThrow(ApiError);
    expect(getAuthToken()).toBe('valid-existing-token');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('deduplicates multiple concurrent 401 responses to trigger redirect / logout only once', async () => {
    setAuthToken('stale-jwt');
    const onUnauthorized = vi.fn();
    setAuthSessionHandlers({ onUnauthorized });

    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(401, {
        code: 'UNAUTHORIZED',
        message: 'Phiên không hợp lệ',
      }),
    );

    // Fire 4 parallel requests that all encounter 401
    const results = await Promise.allSettled([
      request('/api/v1/call-1'),
      request('/api/v1/call-2'),
      request('/api/v1/call-3'),
      request('/api/v1/call-4'),
    ]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(getAuthToken()).toBeNull();
    // Deduplicated: called exactly 1 time instead of 4 times
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('handles 403 MUST_CHANGE_PASSWORD by triggering onMustChangePassword callback', async () => {
    setAuthToken('needs-pw-change-token');
    const onMustChangePassword = vi.fn();
    setAuthSessionHandlers({ onMustChangePassword });

    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(403, {
        code: 'MUST_CHANGE_PASSWORD',
        message: 'Người dùng bắt buộc phải đổi mật khẩu',
      }),
    );

    await expect(request('/api/v1/profiles/me/skills')).rejects.toThrow(ApiError);
    expect(onMustChangePassword).toHaveBeenCalledTimes(1);
  });

  it('does NOT trigger onMustChangePassword for standard 403 forbidden responses', async () => {
    setAuthToken('valid-token');
    const onMustChangePassword = vi.fn();
    setAuthSessionHandlers({ onMustChangePassword });

    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(403, {
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền truy cập tài nguyên này',
      }),
    );

    await expect(request('/api/v1/admin/users')).rejects.toThrow(ApiError);
    expect(onMustChangePassword).not.toHaveBeenCalled();
  });

  it('does NOT trigger onMustChangePassword when skipAuth is true on 403 MUST_CHANGE_PASSWORD', async () => {
    setAuthToken('valid-token');
    const onMustChangePassword = vi.fn();
    setAuthSessionHandlers({ onMustChangePassword });

    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(403, {
        code: 'MUST_CHANGE_PASSWORD',
        message: 'Người dùng bắt buộc phải đổi mật khẩu',
      }),
    );

    await expect(request('/api/v1/public-must-change', { skipAuth: true })).rejects.toThrow(ApiError);
    expect(onMustChangePassword).not.toHaveBeenCalled();
  });

  it('falls back gracefully to window.location when 401 occurs with no session handler', async () => {
    setAuthToken('some-token');

    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(401, {
        code: 'UNAUTHORIZED',
        message: 'Token expired',
      }),
    );

    await expect(request('/api/v1/test-fallback')).rejects.toThrow(ApiError);
    expect(getAuthToken()).toBeNull();
  });

  it('falls back gracefully on 403 MUST_CHANGE_PASSWORD when no handler is registered', async () => {
    setAuthToken('some-token');

    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(403, {
        code: 'MUST_CHANGE_PASSWORD',
        message: 'Must change password',
      }),
    );

    await expect(request('/api/v1/test-must-change')).rejects.toThrow(ApiError);
  });

  it('statically scans frontend/src to confirm no manual Authorization headers outside httpClient', () => {
    const modules = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    });

    const fileKeys = Object.keys(modules).filter(
      (path) => !path.includes('.test.') && !path.includes('httpClient.ts'),
    );

    expect(fileKeys.length).toBeGreaterThan(10);

    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of fileKeys) {
      const content = modules[filePath] ?? '';
      const lines = content.split('\n');
      lines.forEach((lineText: string, idx: number) => {
        if (
          (lineText.includes('Authorization:') ||
            lineText.includes("'Authorization'") ||
            lineText.includes('"Authorization"')) &&
          !lineText.trim().startsWith('//') &&
          !lineText.trim().startsWith('*')
        ) {
          violations.push({ file: filePath, line: idx + 1, match: lineText.trim() });
        }
      });
    }

    expect(
      violations,
      `Found manual Authorization header attachments in frontend source: ${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });

  it('statically scans frontend/src to confirm no direct fetch calls outside httpClient', () => {
    const modules = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    });

    const fileKeys = Object.keys(modules).filter(
      (path) =>
        !path.includes('.test.') &&
        !path.includes('__tests__') &&
        !path.includes('httpClient.ts'),
    );

    expect(fileKeys.length).toBeGreaterThan(10);

    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of fileKeys) {
      const content = modules[filePath] ?? '';
      const lines = content.split('\n');
      lines.forEach((lineText: string, idx: number) => {
        const trimmed = lineText.trim();
        if (
          (trimmed.includes('fetch(') || trimmed.startsWith('fetch(')) &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('*') &&
          !trimmed.startsWith('/*')
        ) {
          violations.push({ file: filePath, line: idx + 1, match: trimmed });
        }
      });
    }

    expect(
      violations,
      `Found direct fetch() calls in frontend source outside httpClient: ${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });
});
