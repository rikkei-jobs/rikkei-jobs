// Tier 3: Pairwise Combinations & Cross-Feature Lifecycles — DN-01 Company Profile & HR Accounts
// Verifies combined state transitions across auth/mustChangePassword, multi-HR company binding,
// profile update + PNG->JPG logo replacement, seeded hr1/hr2 & Company A/B isolation, and Nginx proxy parity

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { BACKEND_BASE_URL, FRONTEND_BASE_URL, MAILPIT_BASE_URL, CLOUDINARY_PUBLIC_URL, isReachable } from '../config.mjs';
import { http, fetchMailpitMessagesWithRetry } from '../helpers/http-client.mjs';
import {
  DEV_SEED_PASSWORD,
  HR_NEW_PASSWORD,
  HR_ALT_PASSWORD,
  VIETNAMESE_DIACRITIC_REGEX,
  EMOJI_REGEX,
  buildExactPngBuffer,
  buildExactJpegBuffer,
  buildLogoFormData,
  buildInvalidLogoPayloads,
  nextTaxCode,
  nextEmail,
  authHeaders,
  loginUser,
  stripHtml,
  extractTempPasswordFromEmail,
  assertUnifiedErrorResponse,
  assertCloudinaryLogoUrl,
  fetchAndVerifyMockLogo,
  assertNoCloudinarySecrets,
  provisionCompanyAndHr
} from '../helpers/company-fixtures.mjs';

describe('Tier 3: DN-01 Company Profile & HR Account Combinations', () => {
  let backendOnline = false;
  let frontendOnline = false;
  let mailpitOnline = false;

  let staffAuth = null;
  let hr1Auth = null;
  let hr2Auth = null;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    frontendOnline = await isReachable(FRONTEND_BASE_URL);
    mailpitOnline = await isReachable(MAILPIT_BASE_URL);

    if (backendOnline) {
      staffAuth = await loginUser(BACKEND_BASE_URL, 'staff1@rikkeijobs.test', DEV_SEED_PASSWORD);
      hr1Auth = await loginUser(BACKEND_BASE_URL, 'hr1@rikkeijobs.test', DEV_SEED_PASSWORD);
      hr2Auth = await loginUser(BACKEND_BASE_URL, 'hr2@rikkeijobs.test', DEV_SEED_PASSWORD);
    }
  });

  // --------------------------------------------------------------------------
  // TC-T3-DN01-01: must_change_password filter blocks company endpoints until change-password
  // --------------------------------------------------------------------------
  it('TC-T3-DN01-01: Should block /companies/me* with 403 MUST_CHANGE_PASSWORD until password change, then unlock active endpoints (and 405 on removed GET /me/logo)', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const bundle = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token, {
      activateHr: false
    });
    const firstLogin = await loginUser(BACKEND_BASE_URL, bundle.hrEmail, bundle.tempPassword);
    assert.strictEqual(firstLogin.mustChangePassword, true);

    const lockedHeaders = authHeaders(firstLogin.token);
    const pngSample = buildExactPngBuffer(320);

    const blockedCalls = [
      await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers: lockedHeaders }),
      await http.put(`${BACKEND_BASE_URL}/api/v1/companies/me`, { name: 'Blocked Update' }, { headers: lockedHeaders }),
      await http.post(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, buildLogoFormData(pngSample, 'blocked.png', 'image/png'), { headers: lockedHeaders }),
      await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, { headers: lockedHeaders })
    ];

    for (const res of blockedCalls) {
      assert.strictEqual(res.status, 403, `Expected 403 MUST_CHANGE_PASSWORD, got ${res.status}`);
      assertUnifiedErrorResponse(res, bundle.tempPassword);
      assert.strictEqual(res.body.code, 'MUST_CHANGE_PASSWORD');
    }

    // /api/v1/auth/me remains accessible while must_change_password = true
    const authMeRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, { headers: lockedHeaders });
    assert.strictEqual(authMeRes.status, 200);
    assert.strictEqual(authMeRes.body.mustChangePassword, true);

    const changeRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/auth/change-password`,
      { oldPassword: bundle.tempPassword, newPassword: HR_NEW_PASSWORD },
      { headers: lockedHeaders }
    );
    assert.strictEqual(changeRes.status, 200);

    // Token reload via JwtAuthFilter immediately sees must_change_password = false
    const getAfter = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers: lockedHeaders });
    assert.strictEqual(getAfter.status, 200);

    const putAfter = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: `Unlocked Co ${bundle.company.taxCode}`, size: '201-1000', version: getAfter.body.version },
      { headers: lockedHeaders }
    );
    assert.strictEqual(putAfter.status, 200);

    const postLogoAfter = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(pngSample, 'unlocked.png', 'image/png'),
      { headers: lockedHeaders, timeoutMs: 8000 }
    );
    assert.strictEqual(postLogoAfter.status, 200);
    assertCloudinaryLogoUrl(postLogoAfter.body.logoUrl, bundle.company.id, 'png');
    await fetchAndVerifyMockLogo(postLogoAfter.body.logoUrl, pngSample, 'image/png');

    const getLogoAfter = await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, { headers: lockedHeaders });
    assert.strictEqual(getLogoAfter.status, 405, `Expected 405 METHOD_NOT_ALLOWED after password change, got ${getLogoAfter.status}`);
    assertUnifiedErrorResponse(getLogoAfter);
    assert.strictEqual(getLogoAfter.body.code, 'METHOD_NOT_ALLOWED');
  });

  // --------------------------------------------------------------------------
  // TC-T3-DN01-02: Multi-HR same company + cross-company email collision
  // --------------------------------------------------------------------------
  it('TC-T3-DN01-02: Should support multiple HR accounts on one company while blocking cross-company email reuse', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const bundleA = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token, {
      activateHr: true,
      newPassword: HR_NEW_PASSWORD
    });

    // Provision a second HR account for the same company A
    const secondHrEmail = nextEmail('hr-co-a2');
    const secondHrRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies/${bundleA.company.id}/hr-accounts`,
      { email: secondHrEmail, fullName: 'Đỗ Hoàng Nam' },
      { headers: authHeaders(staffAuth.token), timeoutMs: 8000 }
    );
    assert.strictEqual(secondHrRes.status, 201);
    assert.strictEqual(secondHrRes.body.companyId, bundleA.company.id);

    const listBody = await fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, secondHrEmail, {
      maxRetries: 25,
      intervalMs: 150
    });
    assert.ok(listBody && listBody.messages && listBody.messages.length >= 1);
    const detailRes = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${listBody.messages[0].ID}`);
    assert.strictEqual(detailRes.status, 200);
    const secondTempPass = extractTempPasswordFromEmail(detailRes.body);
    assert.notStrictEqual(secondTempPass, bundleA.tempPassword, 'Each HR must receive a fresh SecureRandom temporary password');

    const secondFirstLogin = await loginUser(BACKEND_BASE_URL, secondHrEmail, secondTempPass);
    const secondChange = await http.post(
      `${BACKEND_BASE_URL}/api/v1/auth/change-password`,
      { oldPassword: secondTempPass, newPassword: HR_ALT_PASSWORD },
      { headers: authHeaders(secondFirstLogin.token) }
    );
    assert.strictEqual(secondChange.status, 200);

    const secondActive = await loginUser(BACKEND_BASE_URL, secondHrEmail, HR_ALT_PASSWORD);

    // HR1 updates Company A, HR2 reads the updated profile and updates again
    const readByHr1 = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(readByHr1.status, 200);

    const updateByHr1 = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: `Shared Co By HR1 ${bundleA.company.taxCode}`, city: 'Hà Nội', version: readByHr1.body.version },
      { headers: authHeaders(bundleA.hrToken) }
    );
    assert.strictEqual(updateByHr1.status, 200);

    const readByHr2 = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(secondActive.token)
    });
    assert.strictEqual(readByHr2.status, 200);
    assert.strictEqual(readByHr2.body.name, `Shared Co By HR1 ${bundleA.company.taxCode}`);

    // Create Company B and verify hrA1 email cannot be reused on Company B
    const companyBRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies`,
      { name: `Collision Co B ${nextTaxCode(10)}`, taxCode: nextTaxCode(10) },
      { headers: authHeaders(staffAuth.token) }
    );
    assert.strictEqual(companyBRes.status, 201);

    const collisionRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies/${companyBRes.body.id}/hr-accounts`,
      { email: `  ${bundleA.hrEmail.toUpperCase()}  `, fullName: 'Duplicate Cross Co' },
      { headers: authHeaders(staffAuth.token) }
    );
    assert.strictEqual(collisionRes.status, 409);
    assertUnifiedErrorResponse(collisionRes);
    assert.strictEqual(collisionRes.body.code, 'CONFLICT');
  });

  // --------------------------------------------------------------------------
  // TC-T3-DN01-03: Profile update + PNG logo -> JPG logo replacement + reload verification
  // --------------------------------------------------------------------------
  it('TC-T3-DN01-03: Should update profile, upload PNG logo, replace with JPG logo, and serve updated JPEG bytes on reload', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const bundle = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);
    const headers = authHeaders(bundle.hrToken);

    const meBefore = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers });
    assert.strictEqual(meBefore.status, 200);

    const putRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      {
        name: `Logo Replace Corp ${bundle.company.taxCode}`,
        industry: 'Thương mại điện tử',
        size: '1000+',
        address: 'Số 8 Tôn Thất Thuyết',
        city: 'Hà Nội',
        website: 'https://replace-logo.example.vn',
        description: 'Kiểm thử thay thế logo từ PNG sang JPG.',
        version: meBefore.body.version
      },
      { headers }
    );
    assert.strictEqual(putRes.status, 200);

    const pngLogo = buildExactPngBuffer(600);
    const uploadPng = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(pngLogo, 'first.png', 'image/png'),
      { headers, timeoutMs: 8000 }
    );
    assert.strictEqual(uploadPng.status, 200);
    assertCloudinaryLogoUrl(uploadPng.body.logoUrl, bundle.company.id, 'png');
    assertNoCloudinarySecrets(uploadPng.rawText);
    await fetchAndVerifyMockLogo(uploadPng.body.logoUrl, pngLogo, 'image/png');

    const jpgLogo = buildExactJpegBuffer(900);
    const uploadJpg = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(jpgLogo, 'replacement.jpg', 'image/jpeg'),
      { headers, timeoutMs: 8000 }
    );
    assert.strictEqual(uploadJpg.status, 200);
    assertCloudinaryLogoUrl(uploadJpg.body.logoUrl, bundle.company.id, 'jpg');
    assertNoCloudinarySecrets(uploadJpg.rawText);
    assert.notStrictEqual(uploadJpg.body.logoUrl, uploadPng.body.logoUrl);
    assert.ok(uploadJpg.body.version > uploadPng.body.version, 'Overwriting logo must increment company version');

    const reloadedMe = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers });
    assert.strictEqual(reloadedMe.status, 200);
    assert.strictEqual(reloadedMe.body.name, `Logo Replace Corp ${bundle.company.taxCode}`);
    assert.strictEqual(reloadedMe.body.logoUrl, uploadJpg.body.logoUrl);

    await fetchAndVerifyMockLogo(reloadedMe.body.logoUrl, jpgLogo, 'image/jpeg');

    const staleVersionRes = await http.getBuffer(uploadPng.body.logoUrl);
    assert.strictEqual(staleVersionRes.status, 404, 'Old versioned mock CDN URL must return 404 after overwrite');
  });

  // --------------------------------------------------------------------------
  // TC-T3-DN01-04: hr1 vs hr2 & Company A vs Company B tenant isolation across GET/PUT/logo
  // --------------------------------------------------------------------------
  it('TC-T3-DN01-04: Should strictly isolate hr1, hr2, Company A, and Company B across GET, PUT, and logo operations', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    // hr1 remains blocked (without changing hr1's password)
    const hr1Blocked = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(hr1Auth.token)
    });
    assert.strictEqual(hr1Blocked.status, 403);
    assert.strictEqual(hr1Blocked.body.code, 'MUST_CHANGE_PASSWORD');

    // hr2 reads seeded Company 2 cleanly
    const hr2Company = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(hr2Auth.token)
    });
    assert.strictEqual(hr2Company.status, 200);
    assert.strictEqual(hr2Company.body.id, hr2Auth.user.companyId);

    // Company A and Company B remain completely isolated across profiles and logos
    const bundleA = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);
    const bundleB = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);

    const pngA = buildExactPngBuffer(400);
    const jpgB = buildExactJpegBuffer(700);

    const upA = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(pngA, 'alpha.png', 'image/png'),
      { headers: authHeaders(bundleA.hrToken), timeoutMs: 8000 }
    );
    assert.strictEqual(upA.status, 200);

    const upB = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(jpgB, 'beta.jpg', 'image/jpeg'),
      { headers: authHeaders(bundleB.hrToken), timeoutMs: 8000 }
    );
    assert.strictEqual(upB.status, 200);

    // Company A HR sees Company A and PNG logo; Company B HR sees Company B and JPG logo
    const getMeA = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers: authHeaders(bundleA.hrToken) });
    const getMeB = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers: authHeaders(bundleB.hrToken) });
    assert.strictEqual(getMeA.status, 200);
    assert.strictEqual(getMeB.status, 200);
    assert.notStrictEqual(getMeA.body.id, getMeB.body.id);
    assert.notStrictEqual(getMeA.body.id, hr2Company.body.id);
    assert.strictEqual(getMeA.body.logoUrl, upA.body.logoUrl);
    assert.strictEqual(getMeB.body.logoUrl, upB.body.logoUrl);
    assert.notStrictEqual(getMeA.body.logoUrl, getMeB.body.logoUrl);
    assertCloudinaryLogoUrl(getMeA.body.logoUrl, bundleA.company.id, 'png');
    assertCloudinaryLogoUrl(getMeB.body.logoUrl, bundleB.company.id, 'jpg');

    await fetchAndVerifyMockLogo(getMeA.body.logoUrl, pngA, 'image/png');
    await fetchAndVerifyMockLogo(getMeB.body.logoUrl, jpgB, 'image/jpeg');

    // Anonymous PUT returns 401 UNAUTHORIZED
    const anonPutTo2 = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/${hr2Company.body.id}`,
      { name: 'Anon Attempt Seeded Co2' }
    );
    assert.strictEqual(anonPutTo2.status, 401);
    assertUnifiedErrorResponse(anonPutTo2);
    assert.strictEqual(anonPutTo2.body.code, 'UNAUTHORIZED');

    // PUT /api/v1/companies/{id} returns uniform 405 METHOD_NOT_ALLOWED across own, other (Company 2), and missing id
    const ownPutA = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/${bundleA.company.id}`,
      { name: 'Attempt Own CoA' },
      { headers: authHeaders(bundleA.hrToken) }
    );
    const crossTo2 = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/${hr2Company.body.id}`,
      { name: 'Attempt Seeded Co2' },
      { headers: authHeaders(bundleA.hrToken) }
    );
    const missingPut = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/999999`,
      { name: 'Attempt Missing Co' },
      { headers: authHeaders(bundleA.hrToken) }
    );
    for (const res of [ownPutA, crossTo2, missingPut]) {
      assert.strictEqual(res.status, 405);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'METHOD_NOT_ALLOWED');
      assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(res.body.message));
      assert.strictEqual(EMOJI_REGEX.test(res.body.message), false);
    }
    assert.strictEqual(ownPutA.rawText, crossTo2.rawText);
    assert.strictEqual(missingPut.rawText, crossTo2.rawText);
    assert.deepStrictEqual(ownPutA.body, crossTo2.body);
    assert.deepStrictEqual(missingPut.body, crossTo2.body);

    // Cross-tenant GET on Company 2 still returns 404 NOT_FOUND
    const crossGetTo2 = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/${hr2Company.body.id}`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(crossGetTo2.status, 404);
    assertUnifiedErrorResponse(crossGetTo2);
    assert.strictEqual(crossGetTo2.body.code, 'NOT_FOUND');

    // Confirm Company 2 and Company A remain unchanged in DB
    const hr2CompanyAfter = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(hr2Auth.token)
    });
    assert.strictEqual(hr2CompanyAfter.status, 200);
    assert.strictEqual(hr2CompanyAfter.body.name, hr2Company.body.name);
    assert.strictEqual(hr2CompanyAfter.body.version, hr2Company.body.version);

    const getMeAAfter = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(getMeAAfter.status, 200);
    assert.strictEqual(getMeAAfter.body.name, getMeA.body.name);
    assert.strictEqual(getMeAAfter.body.version, getMeA.body.version);
  });

  // --------------------------------------------------------------------------
  // TC-T3-DN01-05: Full workflow via Nginx FRONTEND_BASE_URL/api/v1/... parity
  // --------------------------------------------------------------------------
  it('TC-T3-DN01-05: Should execute full STAFF->Mailpit->HR->Profile->Logo workflow via Nginx :3000/api/v1/ with backend parity', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(frontendOnline, `Frontend Nginx proxy at ${FRONTEND_BASE_URL} must be reachable`);
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const proxyStaff = await loginUser(FRONTEND_BASE_URL, 'staff1@rikkeijobs.test', DEV_SEED_PASSWORD);

    const taxCode = nextTaxCode(13);
    const companyRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/staff/companies`,
      {
        name: `Nginx Parity Enterprise ${taxCode}`,
        taxCode,
        industry: 'Công nghệ tài chính',
        size: '51-200',
        city: 'TP. Hồ Chí Minh',
        website: 'https://nginx-parity.example.vn'
      },
      { headers: authHeaders(proxyStaff.token) }
    );
    assert.strictEqual(companyRes.status, 201);

    const hrEmail = nextEmail('hr-proxy');
    const hrRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/staff/companies/${companyRes.body.id}/hr-accounts`,
      { email: hrEmail, fullName: 'Vũ Ngọc Ánh' },
      { headers: authHeaders(proxyStaff.token), timeoutMs: 8000 }
    );
    assert.strictEqual(hrRes.status, 201);

    const mailList = await fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, hrEmail, { maxRetries: 25, intervalMs: 150 });
    assert.ok(mailList && mailList.messages && mailList.messages.length >= 1);
    const mailDetail = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${mailList.messages[0].ID}`);
    assert.strictEqual(mailDetail.status, 200);
    const tempPass = extractTempPasswordFromEmail(mailDetail.body);
    assert.ok(stripHtml(mailDetail.body?.HTML || mailDetail.body?.Text || '').includes(hrEmail));

    const hrFirstRes = await http.post(`${FRONTEND_BASE_URL}/api/v1/auth/login`, {
      email: hrEmail,
      password: tempPass
    });
    assert.strictEqual(hrFirstRes.status, 200);
    assert.strictEqual(hrFirstRes.body.mustChangePassword, true);

    const chPassRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/auth/change-password`,
      { oldPassword: tempPass, newPassword: HR_NEW_PASSWORD },
      { headers: authHeaders(hrFirstRes.body.accessToken) }
    );
    assert.strictEqual(chPassRes.status, 200);

    const hrActiveRes = await http.post(`${FRONTEND_BASE_URL}/api/v1/auth/login`, {
      email: hrEmail,
      password: HR_NEW_PASSWORD
    });
    assert.strictEqual(hrActiveRes.status, 200);
    assert.strictEqual(hrActiveRes.body.mustChangePassword, false);
    const hrToken = hrActiveRes.body.accessToken;

    const meProxy = await http.get(`${FRONTEND_BASE_URL}/api/v1/companies/me`, { headers: authHeaders(hrToken) });
    assert.strictEqual(meProxy.status, 200);

    const putProxy = await http.put(
      `${FRONTEND_BASE_URL}/api/v1/companies/me`,
      {
        name: `Nginx Parity Updated ${taxCode}`,
        industry: 'Ngân hàng số',
        size: '201-1000',
        address: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
        website: 'https://nginx-updated.example.vn',
        description: 'Kiểm thử toàn trình qua Nginx.',
        version: meProxy.body.version
      },
      { headers: authHeaders(hrToken) }
    );
    assert.strictEqual(putProxy.status, 200);

    const pngBytes = buildExactPngBuffer(1200);
    const logoUpProxy = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(pngBytes, 'proxy-logo.png', 'image/png'),
      { headers: authHeaders(hrToken), timeoutMs: 8000 }
    );
    assert.strictEqual(logoUpProxy.status, 200);
    assertCloudinaryLogoUrl(logoUpProxy.body.logoUrl, companyRes.body.id, 'png');
    assertNoCloudinarySecrets(logoUpProxy.rawText);

    await fetchAndVerifyMockLogo(logoUpProxy.body.logoUrl, pngBytes, 'image/png');

    // Verify Nginx :3000 does NOT proxy /cloudinary/* to mock (returns SPA text/html on /cloudinary/ and 404 on uploaded image path)
    const nginxCloudinaryRoot = await http.get(`${FRONTEND_BASE_URL}/cloudinary/`);
    assert.strictEqual(nginxCloudinaryRoot.status, 200);
    assert.ok(
      (nginxCloudinaryRoot.headers.get('content-type') || '').toLowerCase().includes('text/html'),
      'Nginx must serve SPA text/html rather than proxying /cloudinary/*'
    );

    const nginxCloudinaryImage = await http.getBuffer(
      `${FRONTEND_BASE_URL}/cloudinary${logoUpProxy.body.logoUrl.slice(CLOUDINARY_PUBLIC_URL.length)}`
    );
    assert.strictEqual(nginxCloudinaryImage.status, 404, 'Nginx must not proxy uploaded mock logo path under /cloudinary/*');
    assert.ok(
      !(nginxCloudinaryImage.headers.get('content-type') || '').toLowerCase().includes('image/png'),
      'Nginx /cloudinary/* must never return mock image/png'
    );

    // Verify backend :8080 observes exact same company and logoUrl
    const directMe = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers: authHeaders(hrToken) });
    assert.strictEqual(directMe.status, 200);
    assert.strictEqual(directMe.body.name, `Nginx Parity Updated ${taxCode}`);
    assert.strictEqual(directMe.body.logoUrl, logoUpProxy.body.logoUrl);
  });

  // --------------------------------------------------------------------------
  // TC-T3-DN01-06: Failed validation/logo mutations do not corrupt valid persisted company or logo
  // --------------------------------------------------------------------------
  it('TC-T3-DN01-06: Should preserve valid company state and logo after rejected PUT and rejected logo uploads', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const bundle = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);
    const headers = authHeaders(bundle.hrToken);

    const validPng = buildExactPngBuffer(450);
    const validUp = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(validPng, 'good.png', 'image/png'),
      { headers, timeoutMs: 8000 }
    );
    assert.strictEqual(validUp.status, 200);

    const baselineMe = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers });
    assert.strictEqual(baselineMe.status, 200);

    const invalidPut = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: '', website: 'ftp://bad.example', version: baselineMe.body.version },
      { headers }
    );
    assert.strictEqual(invalidPut.status, 400);

    const invalidPayloads = buildInvalidLogoPayloads();
    const invalidLogo = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(invalidPayloads.svgAsPng.buffer, invalidPayloads.svgAsPng.filename, invalidPayloads.svgAsPng.mimeType),
      { headers }
    );
    assert.strictEqual(invalidLogo.status, 400);

    const afterMe = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers });
    assert.strictEqual(afterMe.status, 200);
    assert.strictEqual(afterMe.body.name, baselineMe.body.name);
    assert.strictEqual(afterMe.body.version, baselineMe.body.version);
    assert.strictEqual(afterMe.body.logoUrl, validUp.body.logoUrl);

    await fetchAndVerifyMockLogo(afterMe.body.logoUrl, validPng, 'image/png');
  });

  // --------------------------------------------------------------------------
  // TC-T3-DN01-07: Logo upload advances @Version; stale pre-upload version returns 409; post-upload version succeeds
  // --------------------------------------------------------------------------
  it('TC-T3-DN01-07: Should increment version on logo upload, reject pre-upload version with 409 CONFLICT, and accept post-upload version', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const bundle = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);
    const headers = authHeaders(bundle.hrToken);

    const beforeMe = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers });
    assert.strictEqual(beforeMe.status, 200);
    const preUploadVersion = beforeMe.body.version;
    assert.strictEqual(typeof preUploadVersion, 'number');

    const uploadRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(buildExactPngBuffer(512), 'version-bump.png', 'image/png'),
      { headers, timeoutMs: 8000 }
    );
    assert.strictEqual(uploadRes.status, 200);
    assertCloudinaryLogoUrl(uploadRes.body.logoUrl, bundle.company.id, 'png');
    const postUploadVersion = uploadRes.body.version;
    assert.strictEqual(typeof postUploadVersion, 'number');
    assert.ok(
      postUploadVersion > preUploadVersion,
      `Expected logo upload to advance version (${preUploadVersion} -> ${postUploadVersion})`
    );

    const stalePut = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: 'Stale Pre-Upload Write', version: preUploadVersion },
      { headers }
    );
    assert.strictEqual(stalePut.status, 409, `Expected 409 CONFLICT with pre-upload version, got ${stalePut.status}`);
    assertUnifiedErrorResponse(stalePut);
    assert.strictEqual(stalePut.body.code, 'CONFLICT');

    const freshName = `Post-Upload Updated Co ${bundle.company.taxCode}`;
    const freshPut = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: freshName, version: postUploadVersion },
      { headers }
    );
    assert.strictEqual(freshPut.status, 200, `Expected 200 OK with post-upload version, got ${freshPut.status}`);
    assert.ok(freshPut.body.version > postUploadVersion);
    assert.strictEqual(freshPut.body.name, freshName);
  });
});
