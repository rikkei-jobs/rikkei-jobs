import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/auth';
import {
  resetAuthSessionState,
  setAuthSessionHandlers,
  setAuthToken,
} from '../../../shared/api/httpClient';
import {
  applyToJob,
  downloadMyApplicationCvSnapshot,
  fetchCandidateCvs,
  getMyApplicationDetail,
  listMyApplications,
  mapRecruitmentError,
  withdrawApplication,
} from '../api/recruitmentApi';

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

describe('recruitmentApi', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken('cand-jwt-token');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
  });

  it('applyToJob posts JSON { cvId, coverLetter } with Bearer token and AbortSignal', async () => {
    const controller = new AbortController();
    const detail = {
      id: 101,
      jobId: 7,
      jobTitle: 'Kỹ sư Java Backend',
      companyName: 'Rikkeisoft',
      cvId: 12,
      cvSnapshotUrl: '/api/v1/me/applications/101/cv-snapshot',
      coverLetter: 'Tôi có 2 năm kinh nghiệm Java.',
      status: 'SUBMITTED',
      canWithdraw: true,
      createdAt: '2026-11-20T09:00:00Z',
      updatedAt: '2026-11-20T09:00:00Z',
      histories: [],
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk(detail, 201));
    globalThis.fetch = fetchMock;

    const result = await applyToJob(
      7,
      { cvId: 12, coverLetter: 'Tôi có 2 năm kinh nghiệm Java.' },
      controller.signal,
    );

    expect(result).toEqual(detail);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/jobs/7/apply');
    expect(init.method).toBe('POST');
    expect(init.signal).toBe(controller.signal);
    expect(init.body).toBe(JSON.stringify({ cvId: 12, coverLetter: 'Tôi có 2 năm kinh nghiệm Java.' }));
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer cand-jwt-token');
  });

  it('listMyApplications builds 1-based page/size and optional status query params', async () => {
    const pagePayload = {
      items: [],
      page: 2,
      size: 10,
      totalItems: 0,
      totalPages: 0,
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk(pagePayload));
    globalThis.fetch = fetchMock;

    const res = await listMyApplications({ status: 'INTERVIEW', page: 2, size: 10 });
    expect(res).toEqual(pagePayload);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/me/applications?page=2&size=10&status=INTERVIEW');
    expect(init.method).toBe('GET');
  });

  it('getMyApplicationDetail and withdrawApplication call exact REST endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk({ id: 5, status: 'SCREENING', histories: [] }))
      .mockResolvedValueOnce(jsonOk({ id: 5, status: 'WITHDRAWN', canWithdraw: false, histories: [] }));
    globalThis.fetch = fetchMock;

    const detail = await getMyApplicationDetail(5);
    expect(detail.id).toBe(5);
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe('/api/v1/me/applications/5');

    const withdrawn = await withdrawApplication(5, { reason: 'Đã nhận cơ hội khác' });
    expect(withdrawn.status).toBe('WITHDRAWN');
    const [withdrawUrl, withdrawInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(withdrawUrl).toBe('/api/v1/me/applications/5/withdraw');
    expect(withdrawInit.method).toBe('POST');
    expect(withdrawInit.body).toBe(JSON.stringify({ reason: 'Đã nhận cơ hội khác' }));
  });

  it('downloadMyApplicationCvSnapshot downloads PDF blob via httpClient.requestBlob', async () => {
    const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="cv-5.pdf"',
      }),
      blob: () => Promise.resolve(pdfBlob),
    } as unknown as Response);

    const result = await downloadMyApplicationCvSnapshot(5);
    expect(result.blob).toBe(pdfBlob);
    expect(result.filename).toBe('cv-5.pdf');
  });

  it('fetchCandidateCvs handles ready items, empty list, 403/404/502/503/504 unavailable without permission text, and rethrows 401/AbortError', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonOk([{ id: 1, title: 'CV React' }]))
      .mockResolvedValueOnce(jsonOk([]))
      .mockResolvedValueOnce(jsonError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'))
      .mockResolvedValueOnce(jsonError(503, 'CV_SERVICE_UNAVAILABLE', 'Unavailable'))
      .mockResolvedValueOnce(jsonError(404, 'NOT_FOUND', 'Not found'))
      .mockResolvedValueOnce(jsonError(502, 'BAD_GATEWAY', 'Bad gateway'))
      .mockResolvedValueOnce(jsonError(504, 'GATEWAY_TIMEOUT', 'Gateway timeout'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonError(401, 'UNAUTHORIZED', 'Expired'));

    expect(await fetchCandidateCvs()).toEqual({
      availability: 'ready',
      items: [{ id: 1, title: 'CV React' }],
    });
    expect(await fetchCandidateCvs()).toEqual({ availability: 'ready', items: [] });

    for (const expectedStatusCase of [403, 503, 404, 502, 504]) {
      const res = await fetchCandidateCvs();
      expect(res.availability, `status ${expectedStatusCase}`).toBe('unavailable');
      if (res.availability === 'unavailable') {
        expect(res.items).toEqual([]);
        expect(res.reason).toBe(
          'Tính năng chọn và tải lên CV đang được hoàn thiện. Bạn vui lòng thử lại sau.',
        );
        expect(res.reason).not.toMatch(/không có quyền/i);
      }
    }

    expect((await fetchCandidateCvs()).availability).toBe('unavailable');
    await expect(fetchCandidateCvs()).rejects.toMatchObject({ status: 401 });

    const abortErr = new Error('Aborted');
    abortErr.name = 'AbortError';
    globalThis.fetch = vi.fn().mockRejectedValueOnce(abortErr);
    await expect(fetchCandidateCvs()).rejects.toThrow('Aborted');

    // DOMException('Aborted', 'AbortError') is not instanceof Error in jsdom
    const domAbortErr = new DOMException('Aborted', 'AbortError');
    globalThis.fetch = vi.fn().mockRejectedValueOnce(domAbortErr);
    await expect(fetchCandidateCvs()).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('mapRecruitmentError returns clean Vietnamese copy without technical jargon', () => {
    const conflictWithdraw = mapRecruitmentError(new ApiError(409, 'Conflict', 'CONFLICT'), 'withdraw');
    expect(conflictWithdraw).toBe(
      'Trạng thái hồ sơ vừa được cập nhật. Vui lòng tải lại trang và thử lại.',
    );

    const cases = [
      mapRecruitmentError(new ApiError(409, 'dup', 'DUPLICATE_APPLICATION'), 'apply'),
      mapRecruitmentError(new ApiError(409, 'dup', 'ALREADY_APPLIED'), 'apply'),
      mapRecruitmentError(new ApiError(409, 'cannot', 'CANNOT_WITHDRAW'), 'withdraw'),
      mapRecruitmentError(new ApiError(400, 'cannot', 'INVALID_APPLICATION_STATE'), 'withdraw'),
      conflictWithdraw,
      mapRecruitmentError(new ApiError(503, 'down', 'CV_SERVICE_UNAVAILABLE'), 'apply'),
      mapRecruitmentError(new ApiError(400, 'expired', 'JOB_NOT_ELIGIBLE'), 'apply'),
      mapRecruitmentError(new ApiError(404, 'missing', 'NOT_FOUND'), 'detail'),
      mapRecruitmentError(new TypeError('Network error'), 'list'),
    ];

    cases.forEach((msg) => {
      expect(msg.length).toBeGreaterThan(10);
      expect(msg).not.toMatch(/\b(API|409|503|400|404|JWT|RBAC|backend|mock|snapshot)\b/i);
    });
  });
});
