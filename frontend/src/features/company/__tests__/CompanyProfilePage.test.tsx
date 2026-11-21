import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../identity/context/AuthContext';
import type { UserDto } from '../../identity/types';
import {
  resetAuthSessionState,
  setAuthSessionHandlers,
  setAuthToken,
} from '../../../shared/api/httpClient';
import { CompanyProfilePage } from '../pages/CompanyProfilePage';
import type { CompanyProfile } from '../types/company.types';
import { MAX_COMPANY_LOGO_BYTES, validateLogoFile } from '../utils/companyValidation';

const HR_USER: UserDto = {
  id: 10,
  email: 'hr1@rikkeisoft.com',
  fullName: 'Trần Thị HR',
  role: 'HR',
  companyId: 1,
  status: 'ACTIVE',
  mustChangePassword: false,
};

const BASE_COMPANY: CompanyProfile = {
  id: 1,
  name: 'Công ty Cổ phần Rikkeisoft',
  taxCode: '0106026495',
  industry: 'Công nghệ thông tin',
  size: '1000+',
  address: 'Tầng 21, Tòa nhà Công nghệ, Phạm Hùng',
  city: 'Hà Nội',
  website: 'https://rikkeisoft.com',
  logoUrl: null,
  description: 'Doanh nghiệp phát triển phần mềm và giải pháp chuyển đổi số.',
  status: 'ACTIVE',
  createdBy: 7,
  createdAt: '2026-11-01T08:00:00Z',
  updatedAt: '2026-11-15T10:00:00Z',
  version: 1,
};

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

const CDN_LOGO_V1 =
  'https://res.cloudinary.com/dev-cloud/image/upload/v1/rikkei-jobs/company-logos/company-1.png';
const CDN_LOGO_V2 =
  'http://127.0.0.1:9000/cloudinary/dev-cloud/image/upload/v2/rikkei-jobs/company-logos/company-1.png';

const renderCompanyProfilePage = () =>
  render(
    <AuthProvider initialToken="hr-jwt" initialUser={HR_USER}>
      <MemoryRouter initialEntries={['/hr/company']}>
        <CompanyProfilePage />
      </MemoryRouter>
    </AuthProvider>,
  );

describe('CompanyProfilePage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken('hr-jwt');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
  });

  it('renders loading state and aborts in-flight fetch on unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveFetch: (res: Response) => void = () => {};

    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    });

    const { unmount } = renderCompanyProfilePage();

    expect(screen.getByRole('status')).toHaveTextContent(/Đang tải hồ sơ công ty/i);
    expect(capturedSignal?.aborted).toBe(false);

    unmount();
    expect(capturedSignal?.aborted).toBe(true);

    await act(async () => {
      resolveFetch(jsonOk(BASE_COMPANY));
    });
  });

  it('renders empty 404 state in Vietnamese when company is missing', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonError(404, 'NOT_FOUND', 'Không tìm thấy hồ sơ doanh nghiệp'));

    renderCompanyProfilePage();

    expect(
      await screen.findByRole('heading', { name: /Chưa có hồ sơ doanh nghiệp/i }),
    ).toBeInTheDocument();
    const statusBox = screen.getByRole('status');
    expect(statusBox).toHaveTextContent(/Không tìm thấy hồ sơ doanh nghiệp/i);
  });

  it('renders network error state with retry button and recovers on retry', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY));
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const alertBox = await screen.findByRole('alert');
    expect(alertBox).toHaveTextContent(/Không thể kết nối đến máy chủ/i);

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByDisplayValue(BASE_COMPANY.name)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('displays read-only taxCode with tabular-nums and ACTIVE/LOCKED status badge', async () => {
    const lockedCompany: CompanyProfile = {
      ...BASE_COMPANY,
      taxCode: '0106026495001',
      status: 'LOCKED',
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonOk(lockedCompany));
    renderCompanyProfilePage();

    const taxCodeNode = await screen.findByTestId('company-tax-code');
    expect(taxCodeNode).toHaveTextContent('0106026495001');
    expect(taxCodeNode).toHaveClass('rj-tabular-nums');
    expect(taxCodeNode.tagName).toBe('DD');

    const statusBadge = screen.getByTestId('company-status-badge');
    expect(statusBadge).toHaveTextContent('Đã khóa');
  });

  it('validates fields inline, blocks PUT, announces errors, and focuses first invalid input', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk(BASE_COMPANY));
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const nameInput = await screen.findByLabelText(/Tên công ty/i);
    const websiteInput = screen.getByLabelText(/Trang web/i);

    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.change(websiteInput, { target: { value: 'javascript:alert(1)' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(submitBtn);

    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(websiteInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveFocus();
    expect(screen.getByText('Vui lòng nhập tên công ty.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Địa chỉ trang web phải bắt đầu bằng http:// hoặc https:// và đúng định dạng.',
      ),
    ).toBeInTheDocument();

    // Only the initial GET call happened; PUT was blocked
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('focuses invalid website input when name is valid', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonOk(BASE_COMPANY));
    renderCompanyProfilePage();

    const websiteInput = await screen.findByLabelText(/Trang web/i);
    fireEvent.change(websiteInput, { target: { value: 'ftp://invalid.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    expect(websiteInput).toHaveAttribute('aria-invalid', 'true');
    expect(websiteInput).toHaveFocus();
  });

  it('handles saving state, PUT payload without taxCode/status, version update, and saved confirmation', async () => {
    let resolvePut: (res: Response) => void = () => {};
    const updatedCompany: CompanyProfile = {
      ...BASE_COMPANY,
      name: 'Rikkeisoft Technology',
      city: 'Đà Nẵng',
      version: 2,
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolvePut = resolve;
          }),
      );
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const nameInput = await screen.findByLabelText(/Tên công ty/i);
    const cityInput = screen.getByLabelText(/Thành phố/i);

    fireEvent.change(nameInput, { target: { value: 'Rikkeisoft Technology' } });
    fireEvent.change(cityInput, { target: { value: 'Đà Nẵng' } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    const savingBtn = screen.getByRole('button', { name: /Đang lưu/i });
    expect(savingBtn).toBeDisabled();

    await act(async () => {
      resolvePut(jsonOk(updatedCompany));
    });

    const statusBanner = await screen.findByRole('status');
    expect(statusBanner).toHaveTextContent('Đã lưu thay đổi hồ sơ công ty.');

    const [, putInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(putInit.method).toBe('PUT');
    const sentPayload = JSON.parse(putInit.body as string) as Record<string, unknown>;
    expect(sentPayload).toEqual({
      name: 'Rikkeisoft Technology',
      industry: BASE_COMPANY.industry,
      size: BASE_COMPANY.size,
      address: BASE_COMPANY.address,
      city: 'Đà Nẵng',
      website: BASE_COMPANY.website,
      description: BASE_COMPANY.description,
      version: 1,
    });
    expect(sentPayload).not.toHaveProperty('taxCode');
    expect(sentPayload).not.toHaveProperty('status');
  });

  it('displays 409 optimistic lock conflict error in Vietnamese while keeping user form edits', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockResolvedValueOnce(jsonError(409, 'CONFLICT', 'Phiên bản dữ liệu đã thay đổi'));
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const nameInput = await screen.findByLabelText(/Tên công ty/i);
    fireEvent.change(nameInput, { target: { value: 'Tên chưa kịp lưu' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    const alertBanner = await screen.findByRole('alert');
    expect(alertBanner).toHaveTextContent(/cập nhật ở phiên khác/i);
    expect(nameInput).toHaveValue('Tên chưa kịp lưu');
  });

  it('renders CDN logo directly with referrerPolicy="no-referrer", skeleton loading, fade-in ready, and upload replacement without blob calls', async () => {
    const companyWithLogo: CompanyProfile = {
      ...BASE_COMPANY,
      logoUrl: CDN_LOGO_V1,
    };

    const fetchMock = vi
      .fn()
      // 1. Initial GET company
      .mockResolvedValueOnce(jsonOk(companyWithLogo))
      // 2. POST logo upload (different CDN URL)
      .mockResolvedValueOnce(jsonOk({ ...companyWithLogo, logoUrl: CDN_LOGO_V2, version: 2 }))
      // 3. POST logo upload (same CDN URL — still refreshes cleanly)
      .mockResolvedValueOnce(jsonOk({ ...companyWithLogo, logoUrl: CDN_LOGO_V2, version: 3 }));
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const frame = await screen.findByTestId('company-logo-preview-frame');
    expect(frame).toHaveAttribute('data-logo-state', 'loading');
    expect(screen.getByTestId('company-logo-skeleton')).toBeInTheDocument();

    const logoImg = screen.getByRole('img', {
      name: `Logo công ty ${BASE_COMPANY.name}`,
    });
    expect(logoImg).toHaveAttribute('src', CDN_LOGO_V1);
    expect(logoImg).toHaveAttribute('referrerPolicy', 'no-referrer');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.load(logoImg);
    expect(frame).toHaveAttribute('data-logo-state', 'ready');
    expect(screen.queryByTestId('company-logo-skeleton')).not.toBeInTheDocument();

    const validFile = new File([new Uint8Array(1024)], 'brand.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/Chọn tệp logo công ty/i);
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Đã tải lên logo công ty thành công.');
    });

    const updatedImg = screen.getByRole('img', {
      name: `Logo công ty ${BASE_COMPANY.name}`,
    });
    expect(updatedImg).toHaveAttribute('src', CDN_LOGO_V2);
    expect(frame).toHaveAttribute('data-logo-state', 'loading');
    fireEvent.load(updatedImg);
    expect(frame).toHaveAttribute('data-logo-state', 'ready');

    // Re-uploading when backend returns the same URL still transitions to loading -> ready
    fireEvent.change(fileInput, {
      target: { files: [new File([new Uint8Array(1024)], 'brand2.jpg', { type: 'image/jpeg' })] },
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    expect(frame).toHaveAttribute('data-logo-state', 'loading');
    const reuploadedImg = screen.getByRole('img', {
      name: `Logo công ty ${BASE_COMPANY.name}`,
    });
    fireEvent.load(reuploadedImg);
    expect(frame).toHaveAttribute('data-logo-state', 'ready');

    for (const [calledUrl] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(['/api/v1/companies/me', '/api/v1/companies/me/logo']).toContain(calledUrl);
    }
  });

  it('renders empty placeholder when logoUrl is null and recovers from CDN image onError via Tải lại ảnh without mutating profile URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockResolvedValueOnce(jsonOk({ ...BASE_COMPANY, logoUrl: CDN_LOGO_V1 }));
    globalThis.fetch = fetchMock;

    const { unmount } = renderCompanyProfilePage();

    expect(await screen.findByTestId('company-logo-placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();

    renderCompanyProfilePage();

    const logoImg = await screen.findByRole('img', {
      name: `Logo công ty ${BASE_COMPANY.name}`,
    });
    fireEvent.error(logoImg);

    const errorTile = await screen.findByTestId('company-logo-image-error');
    expect(errorTile).toHaveTextContent(/Không thể tải ảnh logo/i);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tải lại ảnh/i }));

    const retriedImg = await screen.findByRole('img', {
      name: `Logo công ty ${BASE_COMPANY.name}`,
    });
    expect(retriedImg).toHaveAttribute('src', `${CDN_LOGO_V1}?retry=1`);
    fireEvent.load(retriedImg);
    expect(screen.getByTestId('company-logo-preview-frame')).toHaveAttribute(
      'data-logo-state',
      'ready',
    );
  });

  it('enforces client-side logo pre-checks (empty, invalid MIME/double ext/traversal, exact 2,097,152 vs 2,097,153 boundary)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockResolvedValueOnce(jsonOk({ ...BASE_COMPANY, logoUrl: CDN_LOGO_V1 }));
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const fileInput = await screen.findByLabelText(/Chọn tệp logo công ty/i);

    // 1. Empty 0-byte file -> rejected locally
    const emptyFile = new File([], 'empty.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/rỗng/i);

    // 2. Unsupported MIME (SVG) -> rejected locally
    const svgFile = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' });
    fireEvent.change(fileInput, { target: { files: [svgFile] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/JPG hoặc PNG/i);

    // 3. Suspicious double extension -> rejected locally
    const doubleExtFile = new File(['abc'], 'payload.svg.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [doubleExtFile] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/mở rộng kép/i);

    // 4. Path traversal filename -> rejected locally
    const traversalFile = new File(['abc'], '../evil.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [traversalFile] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Tên tệp logo không hợp lệ/i);

    // 5. Exact 2 MB + 1 byte (2,097,153 bytes) -> rejected locally
    const overLimitFile = new File([new Uint8Array(MAX_COMPANY_LOGO_BYTES + 1)], 'overlimit.png', {
      type: 'image/png',
    });
    fireEvent.change(fileInput, { target: { files: [overLimitFile] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/2\.097\.152/i);

    // Zero upload requests fired so far (only initial GET)
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 6. Exact 2 MB (2,097,152 bytes) -> accepted and uploaded via FormData
    const exactLimitFile = new File([new Uint8Array(MAX_COMPANY_LOGO_BYTES)], 'exact-2mb.png', {
      type: 'image/png',
    });
    fireEvent.change(fileInput, { target: { files: [exactLimitFile] } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const [uploadUrl, uploadInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(uploadUrl).toBe('/api/v1/companies/me/logo');
    expect(uploadInit.method).toBe('POST');
    expect((uploadInit.body as FormData).get('file')).toBe(exactLimitFile);
  });

  it('displays server 413 error without Retry button and preserves existing CDN logo preview', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonOk({ ...BASE_COMPANY, logoUrl: CDN_LOGO_V1 }))
      .mockResolvedValueOnce(jsonError(413, 'FILE_TOO_LARGE', 'Tệp quá lớn'));

    renderCompanyProfilePage();

    const logoImg = await screen.findByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` });
    fireEvent.load(logoImg);

    const fileInput = screen.getByLabelText(/Chọn tệp logo công ty/i);
    const smallFile = new File([new Uint8Array(512)], 'logo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [smallFile] } });

    const alertBox = await screen.findByRole('alert');
    expect(alertBox).toHaveTextContent(/vượt quá giới hạn tối đa 2 MB/i);
    expect(screen.queryByRole('button', { name: /Thử lại/i })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` })).toHaveAttribute(
      'src',
      CDN_LOGO_V1,
    );
  });

  it('HVG-01: syncs updated version from uploadCompanyLogo to subsequent PUT while preserving unsaved form edits', async () => {
    const companyAfterLogo: CompanyProfile = {
      ...BASE_COMPANY,
      logoUrl: CDN_LOGO_V1,
      version: 2,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockResolvedValueOnce(jsonOk(companyAfterLogo))
      .mockResolvedValueOnce(
        jsonOk({ ...companyAfterLogo, name: 'Edited After Logo', version: 3 }),
      );
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const nameInput = await screen.findByLabelText(/Tên công ty/i);
    fireEvent.change(nameInput, { target: { value: 'Edited After Logo' } });

    const fileInput = screen.getByLabelText(/Chọn tệp logo công ty/i);
    const validPng = new File([new Uint8Array(256)], 'brand.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [validPng] } });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Đã tải lên logo công ty thành công.');
      expect(
        screen.getByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` }),
      ).toHaveAttribute('src', CDN_LOGO_V1);
    });
    expect(nameInput).toHaveValue('Edited After Logo');

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    expect(await screen.findByText('Đã lưu thay đổi hồ sơ công ty.')).toBeInTheDocument();
    const [, putInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    const sentPayload = JSON.parse(putInit.body as string) as Record<string, unknown>;
    expect(sentPayload.version).toBe(2);
    expect(sentPayload.name).toBe('Edited After Logo');
  });

  it('HVG-02: clearing all 6 optional fields via UI sends null for every optional field on PUT', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockResolvedValueOnce(
        jsonOk({
          ...BASE_COMPANY,
          industry: null,
          size: null,
          website: null,
          address: null,
          city: null,
          description: null,
          version: 2,
        }),
      );
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    await screen.findByLabelText(/Tên công ty/i);
    fireEvent.change(screen.getByLabelText(/Ngành nghề/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByLabelText(/Quy mô nhân sự/i));
    fireEvent.click(screen.getByRole('option', { name: '-- Chọn quy mô --' }));
    fireEvent.change(screen.getByLabelText(/Trang web/i), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText(/Địa chỉ/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Thành phố/i), { target: { value: '  ' } });
    fireEvent.change(screen.getByLabelText(/Mô tả công ty/i), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Đã lưu thay đổi hồ sơ công ty.');
    });
    const [, putInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(putInit.body as string)).toEqual({
      name: BASE_COMPANY.name,
      industry: null,
      size: null,
      address: null,
      city: null,
      website: null,
      description: null,
      version: 1,
    });
  });

  it('HVG-03: preserves existing valid CDN logo preview and clears success banner when validation or upload fails', async () => {
    const companyWithLogo: CompanyProfile = {
      ...BASE_COMPANY,
      logoUrl: CDN_LOGO_V1,
    };
    const uploadedCompany: CompanyProfile = {
      ...companyWithLogo,
      logoUrl: CDN_LOGO_V2,
      version: 2,
    };

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(companyWithLogo))
      .mockResolvedValueOnce(jsonOk(uploadedCompany))
      .mockResolvedValueOnce(jsonError(500, 'INTERNAL_SERVER_ERROR', 'Máy chủ gặp sự cố'));

    renderCompanyProfilePage();
    const initialImg = await screen.findByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` });
    fireEvent.load(initialImg);
    const fileInput = screen.getByLabelText(/Chọn tệp logo công ty/i);

    fireEvent.change(fileInput, {
      target: { files: [new File([new Uint8Array(512)], 'first.png', { type: 'image/png' })] },
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Đã tải lên logo công ty thành công.');
      expect(screen.getByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` })).toHaveAttribute(
        'src',
        CDN_LOGO_V2,
      );
    });
    fireEvent.load(screen.getByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` }));

    // Invalid local selection preserves preview & clears success
    fireEvent.change(fileInput, {
      target: { files: [new File(['bad'], 'evil.asp.jpg', { type: 'image/jpeg' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/mở rộng kép/i);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` })).toHaveAttribute(
      'src',
      CDN_LOGO_V2,
    );

    // Server 500 upload failure also preserves preview
    fireEvent.change(fileInput, {
      target: { files: [new File([new Uint8Array(512)], 'second.png', { type: 'image/png' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ gặp sự cố');
    expect(screen.getByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` })).toHaveAttribute(
      'src',
      CDN_LOGO_V2,
    );
  });

  it('HVG-04: enforces logo validation edge cases (empty MIME, uppercase, hidden dot, multi-segment double ext) and URL IDN/underscore parity', async () => {
    expect(validateLogoFile(null)).toMatch(/chọn tệp logo/i);
    expect(validateLogoFile(new File([new Uint8Array(64)], 'logo.png', { type: '' }))).toMatch(
      /JPG hoặc PNG/i,
    );
    expect(
      validateLogoFile(new File([new Uint8Array(64)], 'LOGO.PNG', { type: 'image/png' })),
    ).toBeNull();
    expect(
      validateLogoFile(new File([new Uint8Array(64)], 'PHOTO.JPG', { type: 'image/jpeg' })),
    ).toBeNull();
    expect(
      validateLogoFile(new File([new Uint8Array(64)], '.jpg', { type: 'image/jpeg' })),
    ).toMatch(/Tên tệp logo không hợp lệ/i);
    expect(
      validateLogoFile(new File([new Uint8Array(64)], 'a.asp.jpg', { type: 'image/jpeg' })),
    ).toMatch(/mở rộng kép/i);
    expect(
      validateLogoFile(new File([new Uint8Array(64)], 'a.php.foo.jpg', { type: 'image/jpeg' })),
    ).toMatch(/mở rộng kép/i);
    expect(
      validateLogoFile(new File([new Uint8Array(64)], 'mismatch.jpg', { type: 'image/png' })),
    ).toMatch(/không khớp/i);

    const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk(BASE_COMPANY));
    globalThis.fetch = fetchMock;
    renderCompanyProfilePage();

    const websiteInput = await screen.findByLabelText(/Trang web/i);
    for (const badUrl of ['https://côngty.vn', 'https://my_company.example.com']) {
      fireEvent.change(websiteInput, { target: { value: badUrl } });
      fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));
      expect(websiteInput).toHaveAttribute('aria-invalid', 'true');
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('409 CONFLICT recovery button reloads latest version and enables subsequent PUT without page refresh', async () => {
    const latestFromServer: CompanyProfile = {
      ...BASE_COMPANY,
      name: 'Tên Mới Nhất Trên Server',
      version: 5,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockResolvedValueOnce(jsonError(409, 'CONFLICT', 'Phiên bản cũ'))
      .mockResolvedValueOnce(jsonOk(latestFromServer))
      .mockResolvedValueOnce(jsonOk({ ...latestFromServer, name: 'Tên Sau Recovery', version: 6 }));
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const nameInput = await screen.findByLabelText(/Tên công ty/i);
    fireEvent.change(nameInput, { target: { value: 'Bản nháp cũ' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    const alertBanner = await screen.findByRole('alert');
    expect(alertBanner).toHaveTextContent(/cập nhật ở phiên khác/i);
    const reloadBtn = screen.getByRole('button', { name: /Tải lại dữ liệu mới nhất/i });
    fireEvent.click(reloadBtn);

    const reloadedInput = await screen.findByDisplayValue('Tên Mới Nhất Trên Server');
    fireEvent.change(reloadedInput, { target: { value: 'Tên Sau Recovery' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Đã lưu thay đổi hồ sơ công ty.');
    });
    const [, secondPutInit] = fetchMock.mock.calls[3] as [string, RequestInit];
    expect(JSON.parse(secondPutInit.body as string).version).toBe(5);
  });

  it('HVG-05: displays server 400/500 on PUT/POST logo and triggers onMustChangePassword on dynamic 403 MUST_CHANGE_PASSWORD', async () => {
    const onMustChangePassword = vi.fn();
    setAuthSessionHandlers({ onMustChangePassword });

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockResolvedValueOnce(jsonError(400, 'VALIDATION_ERROR', 'Website không hợp lệ trên server'))
      .mockResolvedValueOnce(jsonError(400, 'VALIDATION_ERROR', 'Ảnh logo không hợp lệ'));

    const { unmount } = renderCompanyProfilePage();
    await screen.findByLabelText(/Tên công ty/i);

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Website không hợp lệ trên server');

    const fileInput = screen.getByLabelText(/Chọn tệp logo công ty/i);
    fireEvent.change(fileInput, {
      target: { files: [new File([new Uint8Array(256)], 'bad.png', { type: 'image/png' })] },
    });
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.some((el) => /Ảnh logo không hợp lệ/.test(el.textContent || ''))).toBe(true);
    });
    unmount();

    // Dynamic 403 MUST_CHANGE_PASSWORD on GET /companies/me
    resetAuthSessionState();
    setAuthSessionHandlers({ onMustChangePassword });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonError(403, 'MUST_CHANGE_PASSWORD', 'Tài khoản yêu cầu đổi mật khẩu'),
      );

    renderCompanyProfilePage();
    await waitFor(() => {
      expect(onMustChangePassword).toHaveBeenCalledTimes(1);
    });
  });

  it('HVG-06: validates length bounds for industry, address, city, website, description, announces polite count, and focuses first invalid field', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk(BASE_COMPANY));
    globalThis.fetch = fetchMock;

    const { container } = renderCompanyProfilePage();
    const industryInput = await screen.findByLabelText(/Ngành nghề/i);
    const websiteInput = screen.getByLabelText(/Trang web/i);
    const addressInput = screen.getByLabelText(/Địa chỉ/i);
    const cityInput = screen.getByLabelText(/Thành phố/i);
    const descriptionInput = screen.getByLabelText(/Mô tả công ty/i);

    fireEvent.change(industryInput, { target: { value: 'I'.repeat(101) } });
    fireEvent.change(websiteInput, { target: { value: `https://example.vn/${'a'.repeat(490)}` } });
    fireEvent.change(addressInput, { target: { value: 'A'.repeat(501) } });
    fireEvent.change(cityInput, { target: { value: 'C'.repeat(101) } });
    fireEvent.change(descriptionInput, { target: { value: 'D'.repeat(2001) } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    expect(industryInput).toHaveAttribute('aria-invalid', 'true');
    expect(websiteInput).toHaveAttribute('aria-invalid', 'true');
    expect(addressInput).toHaveAttribute('aria-invalid', 'true');
    expect(cityInput).toHaveAttribute('aria-invalid', 'true');
    expect(descriptionInput).toHaveAttribute('aria-invalid', 'true');
    expect(industryInput).toHaveFocus();

    const politeLive = container.querySelector('[aria-live="polite"]');
    expect(politeLive).toHaveTextContent(
      'Có 5 trường thông tin chưa hợp lệ. Ngành nghề không được vượt quá 100 ký tự.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks PUT when loaded profile has missing version, shows Vietnamese alert, and preserves form edits', async () => {
    const profileWithoutVersion = {
      ...BASE_COMPANY,
      version: undefined,
    } as unknown as CompanyProfile;

    const fetchMock = vi.fn().mockResolvedValueOnce(jsonOk(profileWithoutVersion));
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const nameInput = await screen.findByLabelText(/Tên công ty/i);
    fireEvent.change(nameInput, { target: { value: 'Tên đã chỉnh sửa khi thiếu version' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    const alertBox = await screen.findByRole('alert');
    expect(alertBox).toHaveTextContent(/Thiếu thông tin phiên bản hồ sơ công ty/i);
    expect(nameInput).toHaveValue('Tên đã chỉnh sửa khi thiếu version');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('displays server 400 VALIDATION_ERROR message when backend rejects missing version', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockResolvedValueOnce(
        jsonError(400, 'VALIDATION_ERROR', 'Phiên bản dữ liệu không được để trống'),
      );
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const nameInput = await screen.findByLabelText(/Tên công ty/i);
    fireEvent.change(nameInput, { target: { value: 'Tên gửi lên server' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    const alertBox = await screen.findByRole('alert');
    expect(alertBox).toHaveTextContent('Phiên bản dữ liệu không được để trống');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes version sequentially across logo upload (1 -> 2) and consecutive saves (2 -> 3 -> 4)', async () => {
    const afterLogo: CompanyProfile = {
      ...BASE_COMPANY,
      logoUrl: CDN_LOGO_V1,
      version: 2,
    };
    const afterSave1: CompanyProfile = {
      ...afterLogo,
      name: 'Tên công ty sau lưu lần 1',
      version: 3,
    };
    const afterSave2: CompanyProfile = {
      ...afterSave1,
      city: 'Đà Nẵng',
      version: 4,
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockResolvedValueOnce(jsonOk(afterLogo))
      .mockResolvedValueOnce(jsonOk(afterSave1))
      .mockResolvedValueOnce(jsonOk(afterSave2));
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const nameInput = await screen.findByLabelText(/Tên công ty/i);
    const cityInput = screen.getByLabelText(/Thành phố/i);
    const fileInput = screen.getByLabelText(/Chọn tệp logo công ty/i);

    fireEvent.change(fileInput, {
      target: { files: [new File([new Uint8Array(256)], 'brand.png', { type: 'image/png' })] },
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Đã tải lên logo công ty thành công.');
    });

    fireEvent.change(nameInput, { target: { value: 'Tên công ty sau lưu lần 1' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));
    expect(await screen.findByText('Đã lưu thay đổi hồ sơ công ty.')).toBeInTheDocument();

    const [, firstPutInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(JSON.parse(firstPutInit.body as string).version).toBe(2);

    fireEvent.change(cityInput, { target: { value: 'Đà Nẵng' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    const [, secondPutInit] = fetchMock.mock.calls[3] as [string, RequestInit];
    expect(JSON.parse(secondPutInit.body as string).version).toBe(3);
  });

  it('supports drag-and-drop logo upload, blocks invalid dropped files, and ignores concurrent drops while uploading', async () => {
    let resolveUpload: (res: Response) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk({ ...BASE_COMPANY, logoUrl: CDN_LOGO_V1 }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveUpload = resolve;
          }),
      );
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const dropZone = await screen.findByTestId('company-logo-drop-zone');

    // Invalid dropped file is rejected client-side without POST
    const badSvg = new File(['<svg></svg>'], 'vector.svg', { type: 'image/svg+xml' });
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveClass('is-drag-active');
    fireEvent.drop(dropZone, { dataTransfer: { files: [badSvg] } });
    expect(dropZone).not.toHaveClass('is-drag-active');
    expect(await screen.findByRole('alert')).toHaveTextContent(/JPG hoặc PNG/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Valid dropped PNG starts upload and blocks concurrent drops while in-flight
    const validPng = new File([new Uint8Array(512)], 'drop-logo.png', { type: 'image/png' });
    const concurrentPng = new File([new Uint8Array(512)], 'second.png', { type: 'image/png' });
    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('is-drag-active');
    fireEvent.drop(dropZone, { dataTransfer: { files: [validPng] } });

    expect(dropZone).toBeDisabled();
    expect(screen.getAllByText('Đang tải lên logo...')).toHaveLength(2);
    fireEvent.drop(dropZone, { dataTransfer: { files: [concurrentPng] } });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveUpload(jsonOk({ ...BASE_COMPANY, logoUrl: CDN_LOGO_V2, version: 2 }));
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Đã tải lên logo công ty thành công.');
    });
    expect(screen.getByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` })).toHaveAttribute(
      'src',
      CDN_LOGO_V2,
    );
  });

  it('handles 502 LOGO_STORAGE_UNAVAILABLE and non-JSON 502 with inline Vietnamese alert, preserves preview, and retries exact valid file', async () => {
    const validFile = new File([new Uint8Array(512)], 'company-logo.png', { type: 'image/png' });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk({ ...BASE_COMPANY, logoUrl: CDN_LOGO_V1 }))
      .mockResolvedValueOnce(
        jsonError(
          502,
          'LOGO_STORAGE_UNAVAILABLE',
          'Dịch vụ lưu trữ logo tạm thời không khả dụng. Vui lòng thử lại.',
        ),
      )
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        headers: new Headers({ 'content-type': 'text/html' }),
        json: () => Promise.reject(new Error('HTML gateway error')),
      } as unknown as Response)
      .mockResolvedValueOnce(jsonOk({ ...BASE_COMPANY, logoUrl: CDN_LOGO_V2, version: 2 }));
    globalThis.fetch = fetchMock;

    renderCompanyProfilePage();

    const initialImg = await screen.findByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` });
    fireEvent.load(initialImg);

    const fileInput = screen.getByLabelText(/Chọn tệp logo công ty/i);
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const firstAlert = await screen.findByRole('alert');
    expect(firstAlert).toHaveTextContent(
      'Dịch vụ lưu trữ logo tạm thời không khả dụng. Vui lòng thử lại.',
    );
    expect(firstAlert.textContent).not.toMatch(/cloudinary|https?:\/\/|api_key|api_secret/i);
    expect(screen.getByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` })).toHaveAttribute(
      'src',
      CDN_LOGO_V1,
    );

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    // Second attempt hits non-JSON 502 from gateway -> safe Vietnamese fallback + Retry still available
    const secondAlert = await screen.findByRole('alert');
    expect(secondAlert).toHaveTextContent(
      'Dịch vụ lưu trữ logo tạm thời không khả dụng. Vui lòng thử lại sau giây lát.',
    );

    fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Đã tải lên logo công ty thành công.');
    });
    expect(screen.queryByRole('button', { name: /Thử lại/i })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` })).toHaveAttribute(
      'src',
      CDN_LOGO_V2,
    );

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const callIdx of [1, 2, 3]) {
      const [url, init] = fetchMock.mock.calls[callIdx] as [string, RequestInit];
      expect(url).toBe('/api/v1/companies/me/logo');
      expect((init.body as FormData).get('file')).toBe(validFile);
    }
  });

  it('preserves hash fragment when retrying broken CDN image and clears stale success banner on image onError', async () => {
    const cdnUrlWithQueryAndHash = `${CDN_LOGO_V1}?v=2#logo-preview`;
    const validFile = new File([new Uint8Array(512)], 'logo.png', { type: 'image/png' });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(BASE_COMPANY))
      .mockResolvedValueOnce(
        jsonOk({ ...BASE_COMPANY, logoUrl: cdnUrlWithQueryAndHash, version: 2 }),
      );

    renderCompanyProfilePage();

    const fileInput = await screen.findByLabelText(/Chọn tệp logo công ty/i);
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Đã tải lên logo công ty thành công.');
    });

    const uploadedImg = screen.getByRole('img', { name: `Logo công ty ${BASE_COMPANY.name}` });
    expect(uploadedImg).toHaveAttribute('src', cdnUrlWithQueryAndHash);

    // If the newly uploaded CDN URL fails to load, stale success banner must clear
    fireEvent.error(uploadedImg);
    expect(await screen.findByTestId('company-logo-image-error')).toBeInTheDocument();
    expect(screen.queryByText('Đã tải lên logo công ty thành công.')).not.toBeInTheDocument();

    // Retry keeps #logo-preview fragment at the end after &retry=1
    fireEvent.click(screen.getByRole('button', { name: /Tải lại ảnh/i }));
    const retriedImg = await screen.findByRole('img', {
      name: `Logo công ty ${BASE_COMPANY.name}`,
    });
    expect(retriedImg).toHaveAttribute('src', `${CDN_LOGO_V1}?v=2&retry=1#logo-preview`);
  });
});
