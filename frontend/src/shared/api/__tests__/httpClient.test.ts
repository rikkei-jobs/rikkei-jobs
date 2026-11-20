import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  httpClient,
  request,
  postFormData,
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
    expect(`${'request'}Blob` in httpClient).toBe(false);
    expect(httpClient.postFormData).toBe(postFormData);
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
    const onUnauthorized = vi.fn();
    const onMustChangePassword = vi.fn();
    setAuthSessionHandlers({ onUnauthorized, onMustChangePassword });

    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(403, {
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền truy cập tài nguyên này',
      }),
    );

    await expect(request('/api/v1/admin/users')).rejects.toThrow(ApiError);
    expect(getAuthToken()).toBe('valid-token');
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onMustChangePassword).not.toHaveBeenCalled();
  });

  it('preserves in-memory token and does NOT call onUnauthorized on 403 MUST_CHANGE_PASSWORD', async () => {
    setAuthToken('needs-pw-change-token');
    const onUnauthorized = vi.fn();
    const onMustChangePassword = vi.fn();
    setAuthSessionHandlers({ onUnauthorized, onMustChangePassword });

    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(403, {
        code: 'MUST_CHANGE_PASSWORD',
        message: 'Người dùng bắt buộc phải đổi mật khẩu',
      }),
    );

    await expect(request('/api/v1/profiles/me/skills')).rejects.toThrow(ApiError);
    expect(getAuthToken()).toBe('needs-pw-change-token');
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onMustChangePassword).toHaveBeenCalledTimes(1);
  });

  it('resets 401 redirect deduplication flag after re-login sets a fresh token', async () => {
    const onUnauthorized = vi.fn();
    setAuthSessionHandlers({ onUnauthorized });

    setAuthToken('expired-token-1');
    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(401, {
        code: 'UNAUTHORIZED',
        message: 'Token 1 expired',
      }),
    );

    await expect(request('/api/v1/protected')).rejects.toThrow(ApiError);
    expect(getAuthToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    setAuthToken('fresh-jwt-token-2');
    await expect(request('/api/v1/protected')).rejects.toThrow(ApiError);
    expect(getAuthToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });

  it('replaces handlers cleanly without chaining and cleans up only its own registration', async () => {
    const firstUnauthorized = vi.fn();
    const secondUnauthorized = vi.fn();

    const cleanupFirst = setAuthSessionHandlers({ onUnauthorized: firstUnauthorized });
    const cleanupSecond = setAuthSessionHandlers({ onUnauthorized: secondUnauthorized });

    // Calling stale cleanupFirst must NOT erase secondUnauthorized
    cleanupFirst();

    setAuthToken('token-xyz');
    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(401, {
        code: 'UNAUTHORIZED',
        message: 'Phiên hết hạn',
      }),
    );

    await expect(request('/api/v1/protected')).rejects.toThrow(ApiError);
    expect(firstUnauthorized).not.toHaveBeenCalled();
    expect(secondUnauthorized).toHaveBeenCalledTimes(1);

    // Calling cleanupSecond removes secondUnauthorized cleanly
    cleanupSecond();
    resetAuthSessionState();
    setAuthToken('token-xyz-2');
    await expect(request('/api/v1/protected')).rejects.toThrow(ApiError);
    expect(secondUnauthorized).toHaveBeenCalledTimes(1);
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

    await expect(request('/api/v1/public-must-change', { skipAuth: true })).rejects.toThrow(
      ApiError,
    );
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

  it('omits Content-Type for FormData even when caller provides one, attaches Bearer, and parses JSON', async () => {
    setAuthToken('hr-jwt-token');
    const formData = new FormData();
    formData.append('file', new Blob(['png-bytes'], { type: 'image/png' }), 'logo.png');

    const cdnLogoUrl =
      'https://res.cloudinary.com/dev-cloud/image/upload/v1/rikkei-jobs/company-logos/company-1.png';
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        id: 1,
        logoUrl: cdnLogoUrl,
      }),
    );
    globalThis.fetch = fetchMock;

    const result = await postFormData<{ id: number; logoUrl: string }>(
      '/api/v1/companies/me/logo',
      formData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    expect(result).toEqual({ id: 1, logoUrl: cdnLogoUrl });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/companies/me/logo');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(formData);

    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer hr-jwt-token');
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('maps 413, 400, and 502 (JSON & non-JSON) FormData upload error responses to ApiError', async () => {
    setAuthToken('hr-jwt-token');
    const formData = new FormData();
    formData.append('file', new Blob(['oversize'], { type: 'image/png' }), 'huge.png');

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      errorResponse(413, {
        code: 'FILE_TOO_LARGE',
        message: 'Tệp vượt quá giới hạn 2 MB',
      }),
    );

    await expect(postFormData('/api/v1/companies/me/logo', formData)).rejects.toMatchObject({
      name: 'ApiError',
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: 'Tệp vượt quá giới hạn 2 MB',
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      errorResponse(400, {
        code: 'VALIDATION_ERROR',
        message: 'Định dạng tệp không hợp lệ',
      }),
    );

    await expect(
      request('/api/v1/companies/me/logo', { method: 'POST', body: formData }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Định dạng tệp không hợp lệ',
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      errorResponse(502, {
        code: 'LOGO_STORAGE_UNAVAILABLE',
        message: 'Dịch vụ lưu trữ logo tạm thời không khả dụng',
      }),
    );

    await expect(postFormData('/api/v1/companies/me/logo', formData)).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      code: 'LOGO_STORAGE_UNAVAILABLE',
      message: 'Dịch vụ lưu trữ logo tạm thời không khả dụng',
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: new Headers({ 'content-type': 'text/html' }),
      json: () => Promise.reject(new Error('Invalid JSON')),
    } as unknown as Response);

    await expect(postFormData('/api/v1/companies/me/logo', formData)).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      code: 'UNKNOWN_ERROR',
      message: 'Yêu cầu thất bại với mã trạng thái 502',
    });
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
        !path.includes('.test.') && !path.includes('__tests__') && !path.includes('httpClient.ts'),
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
