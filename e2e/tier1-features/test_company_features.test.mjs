// Tier 1: Feature Coverage — DN-01 Company Profile & HR Accounts
// Verifies happy-path capabilities across all 5 DN-01 features:
// 1. POST /api/v1/staff/companies (10/13-digit taxCode, ACTIVE status, createdBy)
// 2. POST /api/v1/staff/companies/{id}/hr-accounts + Mailpit Vietnamese email + forced password change
// 3. GET & PUT /api/v1/companies/me (all 7 editable fields)
// 4. POST /api/v1/companies/me/logo -> Cloudinary CDN logoUrl + direct lossless delivery (Content-Type, Cache-Control: no-store), GET /me/logo removed (405)
// 5. OpenAPI /api-docs (5 DN-01 operations) & full 6-caller RBAC matrix

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { BACKEND_BASE_URL, MAILPIT_BASE_URL, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';
import {
  DEV_SEED_PASSWORD,
  HR_NEW_PASSWORD,
  VIETNAMESE_DIACRITIC_REGEX,
  EMOJI_REGEX,
  buildExactPngBuffer,
  buildExactJpegBuffer,
  buildLogoFormData,
  nextTaxCode,
  nextEmail,
  authHeaders,
  loginUser,
  assertUnifiedErrorResponse,
  assertCloudinaryLogoUrl,
  fetchAndVerifyMockLogo,
  assertNoCloudinarySecrets,
  provisionCompanyAndHr
} from '../helpers/company-fixtures.mjs';

describe('Tier 1: DN-01 Company Profile & HR Accounts (Feature Coverage)', () => {
  let backendOnline = false;
  let mailpitOnline = false;

  let staffAuth = null;
  let hr1Auth = null;
  let hr2Auth = null;
  let candidateAuth = null;
  let mentorAuth = null;
  let adminAuth = null;

  let sharedCompany = null;
  let provisionedBundle = null;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    mailpitOnline = await isReachable(MAILPIT_BASE_URL);

    if (backendOnline) {
      staffAuth = await loginUser(BACKEND_BASE_URL, 'staff1@rikkeijobs.test', DEV_SEED_PASSWORD);
      hr1Auth = await loginUser(BACKEND_BASE_URL, 'hr1@rikkeijobs.test', DEV_SEED_PASSWORD);
      hr2Auth = await loginUser(BACKEND_BASE_URL, 'hr2@rikkeijobs.test', DEV_SEED_PASSWORD);
      candidateAuth = await loginUser(BACKEND_BASE_URL, 'candidate1@rikkeijobs.test', DEV_SEED_PASSWORD);
      mentorAuth = await loginUser(BACKEND_BASE_URL, 'mentor1@rikkeijobs.test', DEV_SEED_PASSWORD);
      adminAuth = await loginUser(BACKEND_BASE_URL, 'admin1@rikkeijobs.test', DEV_SEED_PASSWORD);
    }
  });

  // --------------------------------------------------------------------------
  // Feature 1: POST /api/v1/staff/companies
  // --------------------------------------------------------------------------
  it('TC-T1-DN01-01: Should create a company with 10-digit taxCode, ACTIVE status, and STAFF createdBy', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const taxCode = nextTaxCode(10);
    const res = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies`,
      {
        name: `Công ty Phần mềm Rikkei ${taxCode}`,
        taxCode,
        industry: 'Công nghệ thông tin',
        size: '51-200',
        address: 'Tầng 21, Tòa nhà Phạm Hùng',
        city: 'Hà Nội',
        website: 'https://rikkei-t1.example.vn',
        description: 'Doanh nghiệp phần mềm đối tác tuyển dụng kỹ sư.'
      },
      { headers: authHeaders(staffAuth.token) }
    );

    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    assert.ok(res.body && typeof res.body.id === 'number', 'Response must contain numeric id');
    assert.strictEqual(res.body.taxCode, taxCode);
    assert.strictEqual(res.body.status, 'ACTIVE');
    assert.strictEqual(res.body.createdBy, staffAuth.user.id);
    assert.strictEqual(res.body.logoUrl, null);
    assert.ok(res.body.createdAt, 'Response must contain createdAt');

    sharedCompany = res.body;
  });

  it('TC-T1-DN01-02: Should create a company with valid 13-digit branch taxCode', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const taxCode = nextTaxCode(13);
    const res = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies`,
      {
        name: `Chi nhánh Giải pháp Số ${taxCode}`,
        taxCode,
        industry: 'Trí tuệ nhân tạo',
        size: '201-1000',
        address: 'Lô E2a-7, Đường D1, Khu Công nghệ cao',
        city: 'TP. Hồ Chí Minh',
        website: 'https://branch-t1.example.vn',
        description: 'Chi nhánh phát triển sản phẩm AI và dữ liệu lớn.'
      },
      { headers: authHeaders(staffAuth.token) }
    );

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.taxCode, taxCode);
    assert.strictEqual(res.body.taxCode.length, 13);
    assert.strictEqual(res.body.status, 'ACTIVE');
    assert.strictEqual(res.body.city, 'TP. Hồ Chí Minh');
  });

  it('TC-T1-DN01-03: Should create a company with only required fields (name and taxCode)', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const taxCode = nextTaxCode(10);
    const res = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies`,
      {
        name: `Công ty Khởi nghiệp ${taxCode}`,
        taxCode
      },
      { headers: authHeaders(staffAuth.token) }
    );

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.name, `Công ty Khởi nghiệp ${taxCode}`);
    assert.strictEqual(res.body.taxCode, taxCode);
    assert.strictEqual(res.body.status, 'ACTIVE');
  });

  it('TC-T1-DN01-04: Should accept all documented company size enum values (1-50, 51-200, 201-1000, 1000+)', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    for (const size of ['1-50', '51-200', '201-1000', '1000+']) {
      const taxCode = nextTaxCode(10);
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies`,
        {
          name: `Doanh nghiệp Quy mô ${size} ${taxCode}`,
          taxCode,
          size
        },
        { headers: authHeaders(staffAuth.token) }
      );
      assert.strictEqual(res.status, 201, `Expected 201 for size ${size}`);
      assert.strictEqual(res.body.size, size);
    }
  });

  it('TC-T1-DN01-05: Should accept http:// and https:// website URLs with Vietnamese diacritics', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const taxCode = nextTaxCode(10);
    const res = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies`,
      {
        name: `Công ty Thương mại Điện tử Việt Nam ${taxCode}`,
        taxCode,
        website: 'http://portal.tmdt-vn.example.vn/tuyen-dung',
        description: 'Tuyển dụng thực tập sinh và kỹ sư Java, React.'
      },
      { headers: authHeaders(staffAuth.token) }
    );

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.website, 'http://portal.tmdt-vn.example.vn/tuyen-dung');
    assert.ok(res.body.description.includes('Tuyển dụng'));
  });

  // --------------------------------------------------------------------------
  // Feature 2: POST /api/v1/staff/companies/{id}/hr-accounts + Mailpit + Forced Password Change
  // --------------------------------------------------------------------------
  it('TC-T1-DN01-06: Should provision HR account with mustChangePassword=true and never return password in HTTP response', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    provisionedBundle = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token, {
      activateHr: false
    });

    const hr = provisionedBundle.hrAccount;
    assert.strictEqual(typeof hr.userId, 'number');
    assert.strictEqual(hr.companyId, provisionedBundle.company.id);
    assert.strictEqual(hr.email, provisionedBundle.hrEmail);
    assert.strictEqual(hr.role, 'HR');
    assert.strictEqual(hr.status, 'ACTIVE');
    assert.strictEqual(hr.mustChangePassword, true);
    assert.ok(hr.createdAt, 'HrAccountResponse must include createdAt');
    assert.strictEqual(hr.password, undefined);
    assert.strictEqual(hr.temporaryPassword, undefined);
    assert.strictEqual(hr.passwordHash, undefined);
  });

  it('TC-T1-DN01-07: Should send Vietnamese full-diacritic onboarding email without emoji via Mailpit', async () => {
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');
    assert.ok(provisionedBundle, 'Provisioned HR bundle must exist');

    const text = provisionedBundle.emailPlainText;
    assert.ok(text.length > 0, 'Onboarding email must have non-empty body');
    assert.ok(text.includes(provisionedBundle.hrEmail), 'Onboarding email must include recipient email');
    assert.ok(text.includes(provisionedBundle.tempPassword), 'Onboarding email must contain temporary password');
    assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(text), 'Email must contain Vietnamese diacritics');
    assert.strictEqual(EMOJI_REGEX.test(text), false, 'Onboarding email must contain zero emoji');
    assert.ok(/đăng nhập/i.test(text), 'Onboarding email must include login guidance');
    assert.ok(/đổi mật khẩu/i.test(text), 'Onboarding email must include change-password instruction');
  });

  it('TC-T1-DN01-08: Should enforce mustChangePassword=true on first login and block GET /companies/me with 403 MUST_CHANGE_PASSWORD', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(provisionedBundle, 'Provisioned HR bundle must exist');

    const firstLogin = await loginUser(BACKEND_BASE_URL, provisionedBundle.hrEmail, provisionedBundle.tempPassword);
    assert.strictEqual(firstLogin.mustChangePassword, true);
    assert.strictEqual(firstLogin.user.role, 'HR');
    assert.strictEqual(firstLogin.user.companyId, provisionedBundle.company.id);

    const blockedRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(firstLogin.token)
    });
    assert.strictEqual(blockedRes.status, 403);
    assertUnifiedErrorResponse(blockedRes, provisionedBundle.tempPassword);
    assert.strictEqual(blockedRes.body.code, 'MUST_CHANGE_PASSWORD');

    provisionedBundle.firstToken = firstLogin.token;
  });

  it('TC-T1-DN01-09: Should preserve seeded hr1 mustChangePassword=true and reject GET /companies/me with 403 MUST_CHANGE_PASSWORD', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    assert.strictEqual(hr1Auth.mustChangePassword, true, 'Seeded hr1 must remain in mustChangePassword=true state');
    const res = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(hr1Auth.token)
    });
    assert.strictEqual(res.status, 403);
    assertUnifiedErrorResponse(res);
    assert.strictEqual(res.body.code, 'MUST_CHANGE_PASSWORD');
  });

  it('TC-T1-DN01-10: Should allow HR to change password via { oldPassword, newPassword } and unlock GET /companies/me', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(provisionedBundle && provisionedBundle.firstToken, 'First login token must exist');

    const changeRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/auth/change-password`,
      {
        oldPassword: provisionedBundle.tempPassword,
        newPassword: HR_NEW_PASSWORD
      },
      { headers: authHeaders(provisionedBundle.firstToken) }
    );
    assert.strictEqual(changeRes.status, 200);

    const activeLogin = await loginUser(BACKEND_BASE_URL, provisionedBundle.hrEmail, HR_NEW_PASSWORD);
    assert.strictEqual(activeLogin.mustChangePassword, false);
    provisionedBundle.hrToken = activeLogin.token;

    const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(provisionedBundle.hrToken)
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.id, provisionedBundle.company.id);
  });

  // --------------------------------------------------------------------------
  // Feature 3: GET & PUT /api/v1/companies/me
  // --------------------------------------------------------------------------
  it('TC-T1-DN01-11: Should read own company profile via GET /api/v1/companies/me with full CompanyResponse fields', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const res = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(provisionedBundle.hrToken)
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, provisionedBundle.company.id);
    assert.strictEqual(res.body.taxCode, provisionedBundle.company.taxCode);
    assert.strictEqual(res.body.status, 'ACTIVE');
    assert.strictEqual(res.body.createdBy, staffAuth.user.id);
  });

  it('TC-T1-DN01-12: Should update all 7 editable fields via PUT /api/v1/companies/me', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const currentRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(provisionedBundle.hrToken)
    });
    assert.strictEqual(currentRes.status, 200);

    const updatedPayload = {
      name: `Công ty Công nghệ Rikkei Cập nhật ${provisionedBundle.company.taxCode}`,
      industry: 'Phần mềm & Trí tuệ nhân tạo',
      size: '201-1000',
      address: 'Số 1 Duy Tân, Cầu Giấy',
      city: 'Đà Nẵng',
      website: 'https://updated-t1.example.vn',
      description: 'Hồ sơ doanh nghiệp đã được cập nhật đầy đủ cả 7 trường.',
      version: currentRes.body.version
    };

    const putRes = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/me`, updatedPayload, {
      headers: authHeaders(provisionedBundle.hrToken)
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.name, updatedPayload.name);
    assert.strictEqual(putRes.body.industry, updatedPayload.industry);
    assert.strictEqual(putRes.body.size, updatedPayload.size);
    assert.strictEqual(putRes.body.address, updatedPayload.address);
    assert.strictEqual(putRes.body.city, updatedPayload.city);
    assert.strictEqual(putRes.body.website, updatedPayload.website);
    assert.strictEqual(putRes.body.description, updatedPayload.description);
  });

  it('TC-T1-DN01-13: Should persist updated fields on subsequent GET /api/v1/companies/me while keeping taxCode and status', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const res = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(provisionedBundle.hrToken)
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.industry, 'Phần mềm & Trí tuệ nhân tạo');
    assert.strictEqual(res.body.size, '201-1000');
    assert.strictEqual(res.body.city, 'Đà Nẵng');
    assert.strictEqual(res.body.taxCode, provisionedBundle.company.taxCode);
    assert.strictEqual(res.body.status, 'ACTIVE');
  });

  it('TC-T1-DN01-14: Should allow clearing optional profile fields on PUT /api/v1/companies/me', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const currentRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(provisionedBundle.hrToken)
    });
    assert.strictEqual(currentRes.status, 200);

    const putRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      {
        name: currentRes.body.name,
        industry: null,
        size: '51-200',
        address: null,
        city: null,
        website: null,
        description: null,
        version: currentRes.body.version
      },
      { headers: authHeaders(provisionedBundle.hrToken) }
    );
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.size, '51-200');
    assert.strictEqual(putRes.body.industry, null);
    assert.strictEqual(putRes.body.address, null);
    assert.strictEqual(putRes.body.city, null);
    assert.strictEqual(putRes.body.website, null);
    assert.strictEqual(putRes.body.description, null);
  });

  it('TC-T1-DN01-15: Should allow seeded hr2 (mustChangePassword=false) to read seeded Company 2 via GET /api/v1/companies/me', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    assert.strictEqual(hr2Auth.mustChangePassword, false);
    const res = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(hr2Auth.token)
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, hr2Auth.user.companyId);
    assert.strictEqual(res.body.status, 'ACTIVE');
  });

  // --------------------------------------------------------------------------
  // Feature 4: POST /api/v1/companies/me/logo & Cloudinary CDN Delivery
  // --------------------------------------------------------------------------
  it('TC-T1-DN01-16: Should expose logoUrl=null before upload and return 405 METHOD_NOT_ALLOWED on removed GET /api/v1/companies/me/logo', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const meBefore = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(provisionedBundle.hrToken)
    });
    assert.strictEqual(meBefore.status, 200);
    assert.strictEqual(meBefore.body.logoUrl, null, 'logoUrl must be null before first logo upload');

    const res = await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, {
      headers: authHeaders(provisionedBundle.hrToken)
    });
    assert.strictEqual(res.status, 405, `Expected 405 METHOD_NOT_ALLOWED for removed GET /me/logo, got ${res.status}`);
    assertUnifiedErrorResponse(res);
    assert.strictEqual(res.body.code, 'METHOD_NOT_ALLOWED');
    assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(res.body.message), '405 message must be Vietnamese with diacritics');
  });

  it('TC-T1-DN01-17: Should upload valid PNG logo via FormData, advance version, and return Cloudinary CDN logoUrl', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const beforeMe = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(provisionedBundle.hrToken)
    });
    assert.strictEqual(beforeMe.status, 200);

    const pngBuf = buildExactPngBuffer(512);
    const formData = buildLogoFormData(pngBuf, 'company-logo.png', 'image/png');
    provisionedBundle.lastPng = pngBuf;

    const uploadRes = await http.post(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, formData, {
      headers: authHeaders(provisionedBundle.hrToken),
      timeoutMs: 8000
    });
    assert.strictEqual(uploadRes.status, 200, `Expected 200 OK, got ${uploadRes.status}: ${uploadRes.rawText}`);
    assertCloudinaryLogoUrl(uploadRes.body.logoUrl, provisionedBundle.company.id, 'png');
    assertNoCloudinarySecrets(uploadRes.rawText);
    assert.ok(uploadRes.body.version > beforeMe.body.version, 'Logo upload must increment company version');

    provisionedBundle.lastPngLogoUrl = uploadRes.body.logoUrl;
    provisionedBundle.lastPngVersion = uploadRes.body.version;
  });

  it('TC-T1-DN01-18: Should serve lossless PNG bytes directly from CDN logoUrl with image/png and Cache-Control: no-store', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(provisionedBundle.lastPngLogoUrl, 'PNG logoUrl must exist from TC-T1-DN01-17');

    await fetchAndVerifyMockLogo(provisionedBundle.lastPngLogoUrl, provisionedBundle.lastPng, 'image/png');
  });

  it('TC-T1-DN01-19: Should upload valid JPEG logo, increment version, and serve lossless JPEG bytes directly from CDN logoUrl', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const jpgBuf = buildExactJpegBuffer(1024);
    const formData = buildLogoFormData(jpgBuf, 'brand-logo.jpg', 'image/jpeg');

    const uploadRes = await http.post(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, formData, {
      headers: authHeaders(provisionedBundle.hrToken),
      timeoutMs: 8000
    });
    assert.strictEqual(uploadRes.status, 200, `Expected 200 OK, got ${uploadRes.status}: ${uploadRes.rawText}`);
    assertCloudinaryLogoUrl(uploadRes.body.logoUrl, provisionedBundle.company.id, 'jpg');
    assertNoCloudinarySecrets(uploadRes.rawText);
    assert.ok(uploadRes.body.version > provisionedBundle.lastPngVersion, 'Second upload must increment version again');
    assert.notStrictEqual(uploadRes.body.logoUrl, provisionedBundle.lastPngLogoUrl, 'Overwriting logo must produce new versioned CDN URL');

    await fetchAndVerifyMockLogo(uploadRes.body.logoUrl, jpgBuf, 'image/jpeg');
    provisionedBundle.lastJpg = jpgBuf;
    provisionedBundle.lastJpgLogoUrl = uploadRes.body.logoUrl;
  });

  it('TC-T1-DN01-20: Should expose updated CDN logoUrl on GET /api/v1/companies/me and serve bytes directly without auth header', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(provisionedBundle.hrToken)
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.logoUrl, provisionedBundle.lastJpgLogoUrl);

    const logoRes = await fetchAndVerifyMockLogo(meRes.body.logoUrl, provisionedBundle.lastJpg, 'image/jpeg');
    assert.strictEqual(logoRes.rawBuffer.byteLength, 1024);
  });

  // --------------------------------------------------------------------------
  // Feature 5: OpenAPI /api-docs (5 DN-01 ops) & 6-Caller RBAC Matrix
  // --------------------------------------------------------------------------
  it('TC-T1-DN01-21: Should expose exact 5 DN-01 operations, bearerAuth, 502 response, and omit GET /me/logo on OpenAPI /api-docs', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const res = await http.get(`${BACKEND_BASE_URL}/api-docs`);
    assert.strictEqual(res.status, 200, `Expected 200 from /api-docs, got ${res.status}`);
    assert.ok(res.body && res.body.paths, 'OpenAPI spec must include paths');

    const paths = res.body.paths;
    assert.ok(paths['/api/v1/staff/companies']?.post, 'OpenAPI must document POST /api/v1/staff/companies');
    assert.ok(paths['/api/v1/staff/companies/{id}/hr-accounts']?.post, 'OpenAPI must document POST /api/v1/staff/companies/{id}/hr-accounts');
    assert.ok(paths['/api/v1/companies/me']?.get, 'OpenAPI must document GET /api/v1/companies/me');
    assert.ok(paths['/api/v1/companies/me']?.put, 'OpenAPI must document PUT /api/v1/companies/me');
    assert.ok(paths['/api/v1/companies/me/logo']?.post, 'OpenAPI must document POST /api/v1/companies/me/logo');
    assert.strictEqual(paths['/api/v1/companies/me/logo']?.get, undefined, 'OpenAPI must NOT document removed GET /api/v1/companies/me/logo');

    const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];
    const dn01OpCount =
      Object.keys(paths['/api/v1/staff/companies'] || {}).filter((m) => httpMethods.includes(m)).length +
      Object.keys(paths['/api/v1/staff/companies/{id}/hr-accounts'] || {}).filter((m) => httpMethods.includes(m)).length +
      Object.keys(paths['/api/v1/companies/me'] || {}).filter((m) => httpMethods.includes(m)).length +
      Object.keys(paths['/api/v1/companies/me/logo'] || {}).filter((m) => httpMethods.includes(m)).length;
    assert.strictEqual(dn01OpCount, 5, `Expected exact 5 DN-01 operations in OpenAPI, got ${dn01OpCount}`);

    const securitySchemes = res.body.components?.securitySchemes || {};
    assert.ok(securitySchemes.bearerAuth, 'OpenAPI must define bearerAuth security scheme');

    const logoPostContent = paths['/api/v1/companies/me/logo'].post.requestBody?.content || {};
    assert.ok(logoPostContent['multipart/form-data'], 'Logo upload operation must document multipart/form-data');

    const createCompanyResponses = paths['/api/v1/staff/companies'].post.responses || {};
    for (const statusCode of ['201', '400', '401', '403', '409']) {
      assert.ok(createCompanyResponses[statusCode], `POST /api/v1/staff/companies must document ${statusCode} response`);
    }
    const logoPostResponses = paths['/api/v1/companies/me/logo'].post.responses || {};
    assert.ok(logoPostResponses['413'], 'POST /api/v1/companies/me/logo must document 413 response');
    assert.ok(logoPostResponses['502'], 'POST /api/v1/companies/me/logo must document 502 response');

    assert.ok(!res.rawText.includes(provisionedBundle.tempPassword), 'OpenAPI spec must never contain temporary password');
    assertNoCloudinarySecrets(res.rawText);
  });

  it('TC-T1-DN01-22: RBAC Matrix Caller 1 (Anonymous) -> 401 UNAUTHORIZED across all 5 DN-01 endpoints and removed GET /me/logo', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const pngForm = () => buildLogoFormData(buildExactPngBuffer(256), 'anon.png', 'image/png');
    const calls = [
      await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies`, { name: 'Anon', taxCode: nextTaxCode(10) }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies/${sharedCompany.id}/hr-accounts`, { email: nextEmail('anon'), fullName: 'Anon HR' }),
      await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`),
      await http.put(`${BACKEND_BASE_URL}/api/v1/companies/me`, { name: 'Anon Update' }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, pngForm()),
      await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`)
    ];

    for (const res of calls) {
      assert.strictEqual(res.status, 401, `Anonymous expected 401, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    }
  });

  it('TC-T1-DN01-23: RBAC Matrix Caller 2 (CANDIDATE) -> 403 FORBIDDEN across all 5 DN-01 endpoints and removed GET /me/logo', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const headers = authHeaders(candidateAuth.token);
    const calls = [
      await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies`, { name: 'Cand', taxCode: nextTaxCode(10) }, { headers }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies/${sharedCompany.id}/hr-accounts`, { email: nextEmail('cand'), fullName: 'Cand HR' }, { headers }),
      await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers }),
      await http.put(`${BACKEND_BASE_URL}/api/v1/companies/me`, { name: 'Cand Update' }, { headers }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, buildLogoFormData(buildExactPngBuffer(256), 'cand.png', 'image/png'), { headers }),
      await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, { headers })
    ];

    for (const res of calls) {
      assert.strictEqual(res.status, 403, `CANDIDATE expected 403, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'FORBIDDEN');
    }
  });

  it('TC-T1-DN01-24: RBAC Matrix Caller 3 (MENTOR) -> 403 FORBIDDEN across all 5 DN-01 endpoints and removed GET /me/logo', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const headers = authHeaders(mentorAuth.token);
    const calls = [
      await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies`, { name: 'Mentor', taxCode: nextTaxCode(10) }, { headers }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies/${sharedCompany.id}/hr-accounts`, { email: nextEmail('mentor'), fullName: 'Mentor HR' }, { headers }),
      await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers }),
      await http.put(`${BACKEND_BASE_URL}/api/v1/companies/me`, { name: 'Mentor Update' }, { headers }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, buildLogoFormData(buildExactPngBuffer(256), 'mentor.png', 'image/png'), { headers }),
      await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, { headers })
    ];

    for (const res of calls) {
      assert.strictEqual(res.status, 403, `MENTOR expected 403, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'FORBIDDEN');
    }
  });

  it('TC-T1-DN01-25: RBAC Matrix Caller 4 (ADMIN) -> 403 FORBIDDEN across all 5 DN-01 endpoints and removed GET /me/logo', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const headers = authHeaders(adminAuth.token);
    const calls = [
      await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies`, { name: 'Admin', taxCode: nextTaxCode(10) }, { headers }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies/${sharedCompany.id}/hr-accounts`, { email: nextEmail('admin'), fullName: 'Admin HR' }, { headers }),
      await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers }),
      await http.put(`${BACKEND_BASE_URL}/api/v1/companies/me`, { name: 'Admin Update' }, { headers }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, buildLogoFormData(buildExactPngBuffer(256), 'admin.png', 'image/png'), { headers }),
      await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, { headers })
    ];

    for (const res of calls) {
      assert.strictEqual(res.status, 403, `ADMIN expected 403, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'FORBIDDEN');
    }
  });

  it('TC-T1-DN01-26: RBAC Matrix Caller 5 (STAFF) -> 201 on /staff/** and 403 FORBIDDEN on all /companies/me* endpoints', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const headers = authHeaders(staffAuth.token);
    const createRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies`,
      { name: `Matrix Staff Co ${nextTaxCode(10)}`, taxCode: nextTaxCode(10) },
      { headers }
    );
    assert.strictEqual(createRes.status, 201);

    const hrCreateRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies/${createRes.body.id}/hr-accounts`,
      { email: nextEmail('matrix-staff'), fullName: 'Trần Văn An' },
      { headers, timeoutMs: 8000 }
    );
    assert.strictEqual(hrCreateRes.status, 201);

    const forbiddenCalls = [
      await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers }),
      await http.put(`${BACKEND_BASE_URL}/api/v1/companies/me`, { name: 'Staff Forbidden' }, { headers }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, buildLogoFormData(buildExactPngBuffer(256), 'staff.png', 'image/png'), { headers }),
      await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, { headers })
    ];

    for (const res of forbiddenCalls) {
      assert.strictEqual(res.status, 403, `STAFF on /companies/me* expected 403, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'FORBIDDEN');
    }
  });

  it('TC-T1-DN01-27: RBAC Matrix Caller 6 (HR with mustChangePassword=false) -> 403 on /staff/**, 200 on active /companies/me*, and 405 on removed GET /me/logo', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const headers = authHeaders(provisionedBundle.hrToken);
    const staffCalls = [
      await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies`, { name: 'HR Forbidden', taxCode: nextTaxCode(10) }, { headers }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies/${sharedCompany.id}/hr-accounts`, { email: nextEmail('hr-forbid'), fullName: 'HR Forbidden' }, { headers })
    ];

    for (const res of staffCalls) {
      assert.strictEqual(res.status, 403, `HR on /staff/** expected 403, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'FORBIDDEN');
    }

    const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers });
    assert.strictEqual(meRes.status, 200);

    const putRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: meRes.body.name, size: meRes.body.size, version: meRes.body.version },
      { headers }
    );
    assert.strictEqual(putRes.status, 200);

    const postLogoRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(buildExactPngBuffer(256), 'matrix.png', 'image/png'),
      { headers, timeoutMs: 8000 }
    );
    assert.strictEqual(postLogoRes.status, 200);
    assertCloudinaryLogoUrl(postLogoRes.body.logoUrl, provisionedBundle.company.id, 'png');

    const getLogoRes = await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, { headers });
    assert.strictEqual(getLogoRes.status, 405, `Expected 405 METHOD_NOT_ALLOWED for active HR GET /me/logo, got ${getLogoRes.status}`);
    assertUnifiedErrorResponse(getLogoRes);
    assert.strictEqual(getLogoRes.body.code, 'METHOD_NOT_ALLOWED');
  });
});
