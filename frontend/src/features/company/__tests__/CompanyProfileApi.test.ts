import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from '../../../shared/api/auth';
import {
  resetAuthSessionState,
  setAuthSessionHandlers,
  setAuthToken,
} from '../../../shared/api/httpClient';
import { getMyCompany, updateMyCompany, uploadCompanyLogo } from '../api/companyProfile';
import type { CompanyProfile, UpdateCompanyRequest } from '../types/company.types';
import {
  isRetryableLogoError,
  mapCompanyApiErrorMessage,
  toCompanyFormValues,
  toUpdateCompanyRequest,
} from '../utils/companyValidation';

const MOCK_CDN_LOGO_URL =
  'https://res.cloudinary.com/dev-cloud/image/upload/v1/rikkei-jobs/company-logos/company-1.png';

const MOCK_COMPANY: CompanyProfile = {
  id: 1,
  name: 'Công ty Cổ phần Rikkeisoft',
  taxCode: '0106026495',
  industry: 'Công nghệ thông tin',
  size: '1000+',
  address: 'Tầng 21, Tòa nhà Công nghệ, Phạm Hùng',
  city: 'Hà Nội',
  website: 'https://rikkeisoft.com',
  logoUrl: MOCK_CDN_LOGO_URL,
  description: 'Doanh nghiệp công nghệ hàng đầu Việt Nam.',
  status: 'ACTIVE',
  createdBy: 7,
  createdAt: '2026-11-01T08:00:00Z',
  updatedAt: '2026-11-15T10:00:00Z',
  version: 2,
};

describe('Company Profile API Client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken('hr-test-jwt');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
  });

  it('getMyCompany sends GET /api/v1/companies/me with Bearer token and AbortSignal', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(MOCK_COMPANY),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const result = await getMyCompany(controller.signal);

    expect(result).toEqual(MOCK_COMPANY);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/companies/me');
    expect(init.method).toBe('GET');
    expect(init.signal).toBe(controller.signal);
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer hr-test-jwt');
  });

  it('updateMyCompany sends PUT /api/v1/companies/me with mutable fields only (no taxCode or status)', async () => {
    const payload: UpdateCompanyRequest = {
      name: 'Rikkeisoft Global',
      industry: 'Phần mềm & AI',
      size: '1000+',
      address: '21 Phạm Hùng',
      city: 'Hà Nội',
      website: 'https://rikkeisoft.com',
      description: 'Cập nhật giới thiệu.',
      version: 2,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ ...MOCK_COMPANY, ...payload, version: 3 }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const result = await updateMyCompany(payload);

    expect(result.version).toBe(3);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/companies/me');
    expect(init.method).toBe('PUT');
    const parsedBody = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(parsedBody).toEqual(payload);
    expect(parsedBody).not.toHaveProperty('taxCode');
    expect(parsedBody).not.toHaveProperty('status');
  });

  it('uploadCompanyLogo sends POST /api/v1/companies/me/logo with FormData field "file" and returns CDN URL + refreshed version', async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', {
      type: 'image/png',
    });
    const uploadedCompany: CompanyProfile = {
      ...MOCK_COMPANY,
      logoUrl:
        'http://127.0.0.1:9000/cloudinary/dev-cloud/image/upload/v2/rikkei-jobs/company-logos/company-1.png',
      version: 3,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(uploadedCompany),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const result = await uploadCompanyLogo(file);

    expect(result).toEqual(uploadedCompany);
    expect(result.logoUrl).toBe(uploadedCompany.logoUrl);
    expect(result.version).toBe(3);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/companies/me/logo');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBe(file);

    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer hr-test-jwt');
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('maps 502 LOGO_STORAGE_UNAVAILABLE safely and classifies retryable logo errors', () => {
    const safeServer502 = new ApiError(
      502,
      'Dịch vụ lưu trữ logo tạm thời gián đoạn. Vui lòng thử lại.',
      'LOGO_STORAGE_UNAVAILABLE',
    );
    expect(mapCompanyApiErrorMessage(safeServer502, 'logo')).toBe(
      'Dịch vụ lưu trữ logo tạm thời gián đoạn. Vui lòng thử lại.',
    );
    expect(isRetryableLogoError(safeServer502)).toBe(true);

    const unsafeProvider502 = new ApiError(
      502,
      'Cloudinary https://api.cloudinary.com failed with api_key=123',
      'LOGO_STORAGE_UNAVAILABLE',
    );
    expect(mapCompanyApiErrorMessage(unsafeProvider502, 'logo')).toBe(
      'Dịch vụ lưu trữ logo tạm thời không khả dụng. Vui lòng thử lại sau giây lát.',
    );

    const nonJsonGateway502 = new ApiError(
      502,
      'Yêu cầu thất bại với mã trạng thái 502',
      'UNKNOWN_ERROR',
    );
    expect(mapCompanyApiErrorMessage(nonJsonGateway502, 'logo')).toBe(
      'Dịch vụ lưu trữ logo tạm thời không khả dụng. Vui lòng thử lại sau giây lát.',
    );
    expect(isRetryableLogoError(nonJsonGateway502)).toBe(true);

    expect(isRetryableLogoError(new TypeError('Failed to fetch'))).toBe(true);
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    expect(isRetryableLogoError(abortError)).toBe(false);
    expect(
      isRetryableLogoError(new DOMException('The operation was aborted.', 'AbortError')),
    ).toBe(false);

    for (const status of [400, 401, 403, 404, 409, 413]) {
      expect(isRetryableLogoError(new ApiError(status, 'Client error', 'ERR'))).toBe(false);
    }
  });

  it('toUpdateCompanyRequest always includes valid version (including 0) and trims/normalizes fields', () => {
    const formValues = toCompanyFormValues({
      ...MOCK_COMPANY,
      name: '  Công ty Cổ phần Rikkeisoft  ',
      industry: '   ',
      size: '51-200',
      address: '  21 Phạm Hùng  ',
      city: '   ',
      website: '  https://rikkeisoft.com  ',
      description: '   ',
    });

    expect(toUpdateCompanyRequest(formValues, 0)).toEqual({
      name: 'Công ty Cổ phần Rikkeisoft',
      industry: null,
      size: '51-200',
      address: '21 Phạm Hùng',
      city: null,
      website: 'https://rikkeisoft.com',
      description: null,
      version: 0,
    });

    expect(toUpdateCompanyRequest(formValues, 3).version).toBe(3);
  });

  it('toUpdateCompanyRequest throws an Error when version is missing, null, NaN, Infinity, negative, or non-integer', () => {
    const formValues = toCompanyFormValues(MOCK_COMPANY);

    for (const badVersion of [
      undefined,
      null,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      1.5,
    ]) {
      expect(() =>
        toUpdateCompanyRequest(formValues, badVersion as unknown as number),
      ).toThrow(/phiên bản/i);
    }
  });
});
