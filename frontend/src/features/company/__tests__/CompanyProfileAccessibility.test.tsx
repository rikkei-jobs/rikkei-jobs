import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../../App';
import { Icon } from '../../../shared/components/Icon';
import {
  resetAuthSessionState,
  setAuthSessionHandlers,
  setAuthToken,
} from '../../../shared/api/httpClient';
import { AuthProvider } from '../../identity/context/AuthContext';
import { HrHomePage } from '../../identity/pages/role-homes/HrHomePage';
import type { UserDto } from '../../identity/types';
import * as companyExports from '../index';
import {
  CompanyProfilePage,
  companyModuleConfig,
  isRetryableLogoError,
  uploadCompanyLogo,
  type CompanyProfile,
  type JobPostingSummary,
} from '../index';

const createUser = (role: UserDto['role'], overrides: Partial<UserDto> = {}): UserDto => ({
  id: 10,
  email: `${role.toLowerCase()}@rikkeisoft.com`,
  fullName: `Người dùng ${role}`,
  role,
  companyId: role === 'HR' ? 1 : null,
  status: 'ACTIVE',
  mustChangePassword: false,
  ...overrides,
});

const MOCK_COMPANY: CompanyProfile = {
  id: 1,
  name: 'Công ty Cổ phần Rikkeisoft',
  taxCode: '0106026495',
  industry: 'Công nghệ thông tin',
  size: '201-1000',
  address: 'Tầng 21, Tòa nhà Công nghệ, Phạm Hùng',
  city: 'Hà Nội',
  website: 'https://rikkeisoft.com',
  logoUrl: null,
  description: 'Giới thiệu doanh nghiệp.',
  status: 'ACTIVE',
  createdBy: 7,
  createdAt: '2026-11-01T08:00:00Z',
  updatedAt: null,
  version: 1,
};

const jsonOk = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  }) as unknown as Response;

describe('Company Profile WCAG 2.2 AA, Routing, RBAC & Exports', () => {
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

  it('preserves existing JobPostingSummary and companyModuleConfig exports and excludes blob helper in company/index.ts', () => {
    const summary: JobPostingSummary = {
      id: 'jd-1',
      title: 'Kỹ sư Java',
      companyName: 'Rikkeisoft',
      status: 'PUBLISHED',
    };

    expect(summary.status).toBe('PUBLISHED');
    expect(companyModuleConfig.id).toBe('company');
    expect(companyModuleConfig.code).toBe('MOD-02');
    expect(CompanyProfilePage).toBeDefined();
    expect(uploadCompanyLogo).toBeTypeOf('function');
    expect(isRetryableLogoError).toBeTypeOf('function');
    expect(`${'fetchCompanyLogo'}Blob` in companyExports).toBe(false);
  });

  it('renders upload, building, and refresh Icon SVGs with standard 24x24 stroke attributes and decorative aria-hidden', () => {
    const { container } = render(
      <div>
        <Icon name="upload" size={18} />
        <Icon name="building" size={32} />
        <Icon name="refresh" size={16} />
      </div>,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(3);

    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('stroke-width', '2');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
    expect(svgs[0]?.querySelector('path')).toBeInTheDocument();
    expect(svgs[0]?.querySelector('polyline')).toBeInTheDocument();
    expect(svgs[0]?.querySelector('line')).toBeInTheDocument();
  });

  it('verifies semantic landmarks, single h1, label associations, and aria-describedby error linkage', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonOk(MOCK_COMPANY));

    render(
      <AuthProvider initialToken="hr-jwt" initialUser={createUser('HR')}>
        <MemoryRouter initialEntries={['/hr/company']}>
          <CompanyProfilePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const heading = await screen.findByRole('heading', { level: 1, name: 'Hồ sơ công ty' });
    expect(heading).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('main')).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: /Quay lại trang chủ HR/i });
    expect(backLink).toHaveAttribute('href', '/hr');

    const nameInput = screen.getByLabelText(/Tên công ty/i);
    const industryInput = screen.getByLabelText(/Ngành nghề/i);
    const sizeSelect = screen.getByLabelText(/Quy mô nhân sự/i);
    const websiteInput = screen.getByLabelText(/Trang web/i);
    const addressInput = screen.getByLabelText(/Địa chỉ/i);
    const cityInput = screen.getByLabelText(/Thành phố/i);
    const descriptionTextarea = screen.getByLabelText(/Mô tả công ty/i);
    const logoInput = screen.getByLabelText(/Chọn tệp logo công ty/i);

    expect(nameInput).toHaveAttribute('id', 'company-name');
    expect(industryInput).toHaveAttribute('id', 'company-industry');
    expect(sizeSelect).toHaveAttribute('id', 'company-size');
    expect(sizeSelect).toHaveClass('rj-select');
    expect(websiteInput).toHaveAttribute('id', 'company-website');
    expect(addressInput).toHaveAttribute('id', 'company-address');
    expect(cityInput).toHaveAttribute('id', 'company-city');
    expect(descriptionTextarea).toHaveAttribute('id', 'company-description');
    expect(logoInput).toHaveAttribute('id', 'company-logo-input');

    // Verify invalid state links aria-describedby to existing error DOM element
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    const describedById = nameInput.getAttribute('aria-describedby');
    expect(describedById).toBe('company-name-error');
    expect(document.getElementById(describedById!)).toHaveTextContent('Vui lòng nhập tên công ty.');

    const uploadButton = screen.getByRole('button', { name: /Tải lên logo/i });
    expect(uploadButton).toHaveAttribute('aria-describedby', 'company-logo-hint');

    fireEvent.change(logoInput, {
      target: { files: [new File(['bad'], 'evil.svg', { type: 'image/svg+xml' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/JPG hoặc PNG/i);
    expect(uploadButton).toHaveAttribute(
      'aria-describedby',
      'company-logo-hint company-logo-error',
    );
  });

  it('HrHomePage includes navigation link to /hr/company', () => {
    render(
      <AuthProvider initialToken="hr-jwt" initialUser={createUser('HR')}>
        <MemoryRouter initialEntries={['/hr']}>
          <HrHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const companyLink = screen.getByRole('link', { name: /Hồ sơ công ty/i });
    expect(companyLink).toBeInTheDocument();
    expect(companyLink).toHaveAttribute('href', '/hr/company');
  });

  it('enforces RBAC on /hr/company route via RequireRole', async () => {
    // 1. Unauthenticated -> /login
    const { unmount: unmountAnon } = render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/hr/company']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByRole('heading', { name: /Cổng Đăng Nhập/i })).toBeInTheDocument();
    unmountAnon();

    // 2. Wrong role (CANDIDATE) -> /candidate
    const { unmount: unmountCandidate } = render(
      <AuthProvider initialToken="cand-jwt" initialUser={createUser('CANDIDATE')}>
        <MemoryRouter initialEntries={['/hr/company']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findAllByText('Ứng viên')).not.toHaveLength(0);
    expect(screen.queryByText(/\(Candidate\)/i)).not.toBeInTheDocument();
    unmountCandidate();

    // 2b. Wrong role (STAFF) -> /staff
    const { unmount: unmountStaff } = render(
      <AuthProvider initialToken="staff-jwt" initialUser={createUser('STAFF')}>
        <MemoryRouter initialEntries={['/hr/company']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByText(/Tiếp Nhận & Điều Phối/i)).toBeInTheDocument();
    unmountStaff();

    // 3. HR with mustChangePassword: true -> /change-password
    const { unmount: unmountMustChange } = render(
      <AuthProvider
        initialToken="hr-temp-jwt"
        initialUser={createUser('HR', { mustChangePassword: true })}
      >
        <MemoryRouter initialEntries={['/hr/company']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByRole('heading', { name: /Đổi Mật Khẩu/i })).toBeInTheDocument();
    unmountMustChange();

    // 4. HR with mustChangePassword: false -> renders CompanyProfilePage
    globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonOk(MOCK_COMPANY));
    render(
      <AuthProvider initialToken="hr-valid-jwt" initialUser={createUser('HR')}>
        <MemoryRouter initialEntries={['/hr/company']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hồ sơ công ty' }),
    ).toBeInTheDocument();
  });

  it('adds aria-live="polite" to all 7 inline field errors, preserves focus-first-error and summary live-region without duplicate role="alert"', async () => {
    const profileWithInvalidSize: CompanyProfile = {
      ...MOCK_COMPANY,
      size: 'invalid-size' as CompanyProfile['size'],
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonOk(profileWithInvalidSize));

    const { container } = render(
      <AuthProvider initialToken="hr-jwt" initialUser={createUser('HR')}>
        <MemoryRouter initialEntries={['/hr/company']}>
          <CompanyProfilePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const nameInput = await screen.findByLabelText(/Tên công ty/i);
    const industryInput = screen.getByLabelText(/Ngành nghề/i);
    const sizeSelect = screen.getByLabelText(/Quy mô nhân sự/i);
    const websiteInput = screen.getByLabelText(/Trang web/i);
    const addressInput = screen.getByLabelText(/Địa chỉ/i);
    const cityInput = screen.getByLabelText(/Thành phố/i);
    const descriptionTextarea = screen.getByLabelText(/Mô tả công ty/i);

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.change(industryInput, { target: { value: 'A'.repeat(101) } });
    fireEvent.change(websiteInput, { target: { value: 'ftp://invalid.test' } });
    fireEvent.change(addressInput, { target: { value: 'B'.repeat(501) } });
    fireEvent.change(cityInput, { target: { value: 'C'.repeat(101) } });
    fireEvent.change(descriptionTextarea, { target: { value: 'D'.repeat(2001) } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    expect(nameInput).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveAttribute('aria-describedby', 'company-name-error');
    expect(industryInput).toHaveAttribute('aria-invalid', 'true');
    expect(industryInput).toHaveAttribute('aria-describedby', 'company-industry-error');
    expect(sizeSelect).toHaveAttribute('aria-invalid', 'true');
    expect(sizeSelect).toHaveAttribute('aria-describedby', 'company-size-error');
    expect(websiteInput).toHaveAttribute('aria-invalid', 'true');
    expect(websiteInput).toHaveAttribute(
      'aria-describedby',
      'company-website-hint company-website-error',
    );
    expect(addressInput).toHaveAttribute('aria-invalid', 'true');
    expect(addressInput).toHaveAttribute('aria-describedby', 'company-address-error');
    expect(cityInput).toHaveAttribute('aria-invalid', 'true');
    expect(cityInput).toHaveAttribute('aria-describedby', 'company-city-error');
    expect(descriptionTextarea).toHaveAttribute('aria-invalid', 'true');
    expect(descriptionTextarea).toHaveAttribute(
      'aria-describedby',
      'company-description-hint company-description-error',
    );

    const errorIds = [
      'company-name-error',
      'company-industry-error',
      'company-size-error',
      'company-website-error',
      'company-address-error',
      'company-city-error',
      'company-description-error',
    ];
    for (const id of errorIds) {
      const errorEl = document.getElementById(id);
      expect(errorEl).toBeInTheDocument();
      expect(errorEl).toHaveAttribute('aria-live', 'polite');
      expect(errorEl).not.toHaveAttribute('role', 'alert');
    }

    const summaryLiveRegion = container.querySelector(
      '.rj-sr-only[aria-live="polite"][aria-atomic="true"]',
    );
    expect(summaryLiveRegion).toHaveTextContent(
      'Có 7 trường thông tin chưa hợp lệ. Vui lòng nhập tên công ty.',
    );
  });

  it('transitions cleanly from inline aria-live="polite" field error to server saveError role="alert"', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(MOCK_COMPANY))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            code: 'INTERNAL_ERROR',
            message: 'Máy chủ gặp sự cố khi lưu hồ sơ.',
          }),
      } as unknown as Response);
    globalThis.fetch = fetchMock;

    render(
      <AuthProvider initialToken="hr-jwt" initialUser={createUser('HR')}>
        <MemoryRouter initialEntries={['/hr/company']}>
          <CompanyProfilePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const nameInput = await screen.findByLabelText(/Tên công ty/i);
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    expect(document.getElementById('company-name-error')).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'Công ty Cổ phần Rikkeisoft Mới' } });
    expect(document.getElementById('company-name-error')).not.toBeInTheDocument();
    expect(nameInput).toHaveAttribute('aria-invalid', 'false');

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    const serverAlert = await screen.findByRole('alert');
    expect(serverAlert).toHaveAttribute('aria-live', 'assertive');
    expect(serverAlert).toHaveTextContent('Máy chủ gặp sự cố khi lưu hồ sơ.');
  });

  it('ensures C7 drop-zone keyboard semantics, live regions, no nested interactive controls, and focusable 502 retry button', async () => {
    const cdnCompany: CompanyProfile = {
      ...MOCK_COMPANY,
      logoUrl:
        'https://res.cloudinary.com/dev-cloud/image/upload/v1/rikkei-jobs/company-logos/company-1.png',
    };

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(cdnCompany))
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            code: 'LOGO_STORAGE_UNAVAILABLE',
            message: 'Dịch vụ lưu trữ logo tạm thời không khả dụng.',
          }),
      } as unknown as Response);

    const { container } = render(
      <AuthProvider initialToken="hr-jwt" initialUser={createUser('HR')}>
        <MemoryRouter initialEntries={['/hr/company']}>
          <CompanyProfilePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const skeleton = await screen.findByTestId('company-logo-skeleton');
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-live', 'polite');

    const img = screen.getByRole('img', { name: `Logo công ty ${MOCK_COMPANY.name}` });
    fireEvent.load(img);

    const dropZone = screen.getByTestId('company-logo-drop-zone');
    expect(dropZone.tagName).toBe('BUTTON');
    expect(dropZone).toHaveAttribute('type', 'button');
    expect(dropZone.querySelector('button, a, input, select, textarea')).toBeNull();

    const logoInput = screen.getByLabelText(/Chọn tệp logo công ty/i);
    expect(logoInput.tabIndex).toBe(-1);

    const positiveTabIndexElements = Array.from(container.querySelectorAll('*')).filter(
      (el) => el instanceof HTMLElement && el.tabIndex > 0,
    );
    expect(positiveTabIndexElements).toHaveLength(0);

    fireEvent.change(logoInput, {
      target: { files: [new File([new Uint8Array(256)], 'logo.png', { type: 'image/png' })] },
    });

    const logoAlert = await screen.findByRole('alert');
    expect(logoAlert).toHaveAttribute('aria-live', 'assertive');
    expect(logoAlert).toHaveTextContent('Dịch vụ lưu trữ logo tạm thời không khả dụng.');

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    expect(retryBtn.tagName).toBe('BUTTON');
    expect(retryBtn).toHaveAttribute('type', 'button');
    expect(retryBtn.tabIndex).toBe(0);
    retryBtn.focus();
    expect(retryBtn).toHaveFocus();
  });
});
