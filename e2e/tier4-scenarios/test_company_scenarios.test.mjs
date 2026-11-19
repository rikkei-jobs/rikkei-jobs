// Tier 4: Real-World Application Scenarios & Security Audit — DN-01 Company Profile & HR Accounts
// Verifies end-to-end enterprise journeys:
// 1. Realistic enterprise onboarding (staff1 -> Vietnamese Mailpit email -> HR forced password change -> profile -> logo -> zero temp password leakage)
// 2. Cross-tenant attack audit & multi-company isolation
// 3. Two-HR concurrent optimistic-lock @Version conflict & recovery
// 4. OpenAPI & optional PostgreSQL security/storage invariant audit

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BACKEND_BASE_URL, FRONTEND_BASE_URL, MAILPIT_BASE_URL, MOCK_BASE_URL, isReachable } from '../config.mjs';
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
  nextTaxCode,
  nextEmail,
  authHeaders,
  loginUser,
  extractTempPasswordFromEmail,
  assertUnifiedErrorResponse,
  assertCloudinaryLogoUrl,
  fetchAndVerifyMockLogo,
  assertNoCloudinarySecrets,
  assertCleanStorageUnavailableError,
  provisionCompanyAndHr
} from '../helpers/company-fixtures.mjs';

const execFileAsync = promisify(execFile);
const BCRYPT_REGEX = /^\$2[aby]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/;

async function execPostgres(sql) {
  const { stdout } = await execFileAsync('docker', [
    'exec',
    'rikkei-postgres',
    'psql',
    '-U',
    'rikkei_app',
    '-d',
    'rikkeijobs',
    '-t',
    '-A',
    '-c',
    sql
  ]);
  return stdout.trim();
}

describe('Tier 4: DN-01 Enterprise Scenarios & Security Audit', () => {
  let backendOnline = false;
  let frontendOnline = false;
  let mailpitOnline = false;
  let postgresAvailable = false;

  let staffAuth = null;
  let auditedBundle = null;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    frontendOnline = await isReachable(FRONTEND_BASE_URL);
    mailpitOnline = await isReachable(MAILPIT_BASE_URL);

    try {
      await execPostgres('SELECT 1;');
      postgresAvailable = true;
    } catch {
      postgresAvailable = false;
    }

    if (backendOnline) {
      staffAuth = await loginUser(BACKEND_BASE_URL, 'staff1@rikkeijobs.test', DEV_SEED_PASSWORD);
    }
  });

  // --------------------------------------------------------------------------
  // TC-T4-DN01-01: Realistic enterprise onboarding & zero temp-password leakage
  // --------------------------------------------------------------------------
  it('TC-T4-DN01-01: Should complete enterprise onboarding end-to-end via Mailpit and Nginx without leaking temporary password', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(frontendOnline, `Frontend Nginx proxy at ${FRONTEND_BASE_URL} must be reachable`);
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const taxCode = nextTaxCode(13);
    const createCompanyRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies`,
      {
        name: `Tập đoàn Công nghệ Việt Nam ${taxCode}`,
        taxCode,
        industry: 'Công nghệ thông tin',
        size: '201-1000',
        address: 'Tòa nhà Phạm Hùng, Nam Từ Liêm',
        city: 'Hà Nội',
        website: 'https://tapdoan-vn.example.vn',
        description: 'Đối tác chiến lược tiếp nhận sinh viên thực tập và kỹ sư mới.'
      },
      { headers: authHeaders(staffAuth.token) }
    );
    assert.strictEqual(createCompanyRes.status, 201);
    const company = createCompanyRes.body;

    const hrEmail = nextEmail('onboarding-hr');
    const hrCreateRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies/${company.id}/hr-accounts`,
      { email: hrEmail, fullName: 'Nguyễn Hoàng Bảo Châu' },
      { headers: authHeaders(staffAuth.token), timeoutMs: 8000 }
    );
    assert.strictEqual(hrCreateRes.status, 201);

    const listBody = await fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, hrEmail, {
      maxRetries: 25,
      intervalMs: 150
    });
    assert.ok(listBody && listBody.messages && listBody.messages.length >= 1);
    const detailRes = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${listBody.messages[0].ID}`);
    assert.strictEqual(detailRes.status, 200);

    const tempPassword = extractTempPasswordFromEmail(detailRes.body);
    assert.ok(!hrCreateRes.rawText.includes(tempPassword), 'HR creation HTTP response must never leak temp password');

    const emailText = `${detailRes.body?.Text || ''} ${detailRes.body?.HTML || ''}`;
    assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(emailText));
    assert.strictEqual(EMOJI_REGEX.test(emailText), false, 'Onboarding email must contain zero emoji');

    // First login & forced password change
    const firstLogin = await loginUser(BACKEND_BASE_URL, hrEmail, tempPassword);
    assert.strictEqual(firstLogin.mustChangePassword, true);

    const blockedMe = await http.get(`${FRONTEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(firstLogin.token)
    });
    assert.strictEqual(blockedMe.status, 403);
    assert.strictEqual(blockedMe.body.code, 'MUST_CHANGE_PASSWORD');
    assert.ok(!blockedMe.rawText.includes(tempPassword));

    const changeRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/auth/change-password`,
      { oldPassword: tempPassword, newPassword: HR_NEW_PASSWORD },
      { headers: authHeaders(firstLogin.token) }
    );
    assert.strictEqual(changeRes.status, 200);
    assert.ok(!changeRes.rawText.includes(tempPassword));

    const activeLogin = await loginUser(BACKEND_BASE_URL, hrEmail, HR_NEW_PASSWORD);
    assert.strictEqual(activeLogin.mustChangePassword, false);

    // Complete profile & upload PNG logo through Nginx :3000/api/
    const meBefore = await http.get(`${FRONTEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(activeLogin.token)
    });
    assert.strictEqual(meBefore.status, 200);

    const putRes = await http.put(
      `${FRONTEND_BASE_URL}/api/v1/companies/me`,
      {
        name: `Tập đoàn Công nghệ Việt Nam (Chính thức) ${taxCode}`,
        industry: 'Kỹ thuật phần mềm & Cloud',
        size: '1000+',
        address: 'Tầng 15, Tòa nhà Phạm Hùng',
        city: 'Hà Nội',
        website: 'https://official-vn.example.vn',
        description: 'Hồ sơ doanh nghiệp đã hoàn tất xác minh thông tin và thương hiệu.',
        version: meBefore.body.version
      },
      { headers: authHeaders(activeLogin.token) }
    );
    assert.strictEqual(putRes.status, 200);
    assert.ok(!putRes.rawText.includes(tempPassword));

    const pngLogo = buildExactPngBuffer(1536);
    const upRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(pngLogo, 'audit-original-logo.png', 'image/png'),
      { headers: authHeaders(activeLogin.token), timeoutMs: 8000 }
    );
    assert.strictEqual(upRes.status, 200);
    assertCloudinaryLogoUrl(upRes.body.logoUrl, company.id, 'png');
    assertNoCloudinarySecrets(upRes.rawText);
    assert.ok(!upRes.rawText.includes(tempPassword));

    const verifiedMe = await http.get(`${FRONTEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(activeLogin.token)
    });
    assert.strictEqual(verifiedMe.status, 200);
    assert.strictEqual(verifiedMe.body.taxCode, taxCode);
    assert.strictEqual(verifiedMe.body.status, 'ACTIVE');
    assert.strictEqual(verifiedMe.body.size, '1000+');
    assert.strictEqual(verifiedMe.body.logoUrl, upRes.body.logoUrl);

    await fetchAndVerifyMockLogo(verifiedMe.body.logoUrl, pngLogo, 'image/png');

    const apiDocsRes = await http.get(`${BACKEND_BASE_URL}/api-docs`);
    assert.strictEqual(apiDocsRes.status, 200);
    assert.ok(!apiDocsRes.rawText.includes(tempPassword), 'OpenAPI /api-docs must never expose temporary password');
    assertNoCloudinarySecrets(apiDocsRes.rawText);

    auditedBundle = {
      company,
      hrEmail,
      hrUserId: hrCreateRes.body.userId,
      tempPassword,
      logoUrl: upRes.body.logoUrl
    };
  });

  // --------------------------------------------------------------------------
  // TC-T4-DN01-02: Cross-tenant attack audit & multi-company isolation
  // --------------------------------------------------------------------------
  it('TC-T4-DN01-02: Should thwart cross-tenant PUT/GET and body ID injection across Company Alpha and Company Beta', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const alpha = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);
    const beta = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);

    const alphaPng = buildExactPngBuffer(350);
    const betaJpg = buildExactJpegBuffer(650);

    const upAlpha = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(alphaPng, 'alpha.png', 'image/png'),
      { headers: authHeaders(alpha.hrToken), timeoutMs: 8000 }
    );
    assert.strictEqual(upAlpha.status, 200);
    assertCloudinaryLogoUrl(upAlpha.body.logoUrl, alpha.company.id, 'png');
    assertNoCloudinarySecrets(upAlpha.rawText);

    const upBeta = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(betaJpg, 'beta.jpg', 'image/jpeg'),
      { headers: authHeaders(beta.hrToken), timeoutMs: 8000 }
    );
    assert.strictEqual(upBeta.status, 200);
    assertCloudinaryLogoUrl(upBeta.body.logoUrl, beta.company.id, 'jpg');
    assertNoCloudinarySecrets(upBeta.rawText);

    const betaBaseline = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(beta.hrToken)
    });
    assert.strictEqual(betaBaseline.status, 200);

    // Alpha attempts cross-tenant PUT and GET targeting Beta's numeric id
    const attackPut = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/${beta.company.id}`,
      { name: 'Compromised Beta', size: '1-50' },
      { headers: authHeaders(alpha.hrToken) }
    );
    assert.strictEqual(attackPut.status, 404);
    assert.notStrictEqual(attackPut.status, 403);
    assert.notStrictEqual(attackPut.status, 200);
    assertUnifiedErrorResponse(attackPut);
    assert.strictEqual(attackPut.body.code, 'NOT_FOUND');

    const attackGet = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/${beta.company.id}`, {
      headers: authHeaders(alpha.hrToken)
    });
    assert.strictEqual(attackGet.status, 404);
    assertUnifiedErrorResponse(attackGet);

    // Alpha attempts injecting Beta's id/companyId in PUT /companies/me JSON payload
    const alphaMe = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(alpha.hrToken)
    });
    const injectionPut = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      {
        id: beta.company.id,
        companyId: beta.company.id,
        name: `Alpha Legit Update ${alpha.company.taxCode}`,
        version: alphaMe.body.version
      },
      { headers: authHeaders(alpha.hrToken) }
    );
    assert.strictEqual(injectionPut.status, 200);
    assert.strictEqual(injectionPut.body.id, alpha.company.id, 'Server must derive target company solely from principal');

    // Confirm Beta profile and JPG logo remain completely untouched
    const betaAfter = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(beta.hrToken)
    });
    assert.strictEqual(betaAfter.status, 200);
    assert.strictEqual(betaAfter.body.name, betaBaseline.body.name);
    assert.strictEqual(betaAfter.body.version, betaBaseline.body.version);
    assert.strictEqual(betaAfter.body.logoUrl, upBeta.body.logoUrl);

    await fetchAndVerifyMockLogo(betaAfter.body.logoUrl, betaJpg, 'image/jpeg');
  });

  // --------------------------------------------------------------------------
  // TC-T4-DN01-03: Two-HR concurrent optimistic-lock @Version conflict & recovery
  // --------------------------------------------------------------------------
  it('TC-T4-DN01-03: Should detect @Version conflict when two HRs edit concurrently and allow clean reload recovery', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const bundle = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token, {
      activateHr: true,
      newPassword: HR_NEW_PASSWORD
    });

    const secondEmail = nextEmail('hr-lock-2');
    const secondHrRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies/${bundle.company.id}/hr-accounts`,
      { email: secondEmail, fullName: 'Phạm Gia Huy' },
      { headers: authHeaders(staffAuth.token), timeoutMs: 8000 }
    );
    assert.strictEqual(secondHrRes.status, 201);

    const listBody = await fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, secondEmail, { maxRetries: 25, intervalMs: 150 });
    const detailRes = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${listBody.messages[0].ID}`);
    assert.strictEqual(detailRes.status, 200);
    const secondTemp = extractTempPasswordFromEmail(detailRes.body);

    const secondFirstLogin = await loginUser(BACKEND_BASE_URL, secondEmail, secondTemp);
    const secondChg = await http.post(
      `${BACKEND_BASE_URL}/api/v1/auth/change-password`,
      { oldPassword: secondTemp, newPassword: HR_ALT_PASSWORD },
      { headers: authHeaders(secondFirstLogin.token) }
    );
    assert.strictEqual(secondChg.status, 200);
    const secondActive = await loginUser(BACKEND_BASE_URL, secondEmail, HR_ALT_PASSWORD);

    // Both HRs read the same version v
    const read1 = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers: authHeaders(bundle.hrToken) });
    const read2 = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers: authHeaders(secondActive.token) });
    assert.strictEqual(read1.body.version, read2.body.version);
    const initialVersion = read1.body.version;

    // HR1 saves first -> succeeds and advances version
    const save1 = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: `HR1 Saved ${bundle.company.taxCode}`, city: 'Hà Nội', version: initialVersion },
      { headers: authHeaders(bundle.hrToken) }
    );
    assert.strictEqual(save1.status, 200);
    assert.ok(save1.body.version > initialVersion);

    // HR2 submits with stale initialVersion -> 409 CONFLICT
    const staleSave2 = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: `HR2 Stale ${bundle.company.taxCode}`, city: 'Đà Nẵng', version: initialVersion },
      { headers: authHeaders(secondActive.token) }
    );
    assert.strictEqual(staleSave2.status, 409);
    assertUnifiedErrorResponse(staleSave2);
    assert.strictEqual(staleSave2.body.code, 'CONFLICT');

    // HR2 reloads latest version and retries -> 200 OK
    const reloaded = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers: authHeaders(secondActive.token) });
    assert.strictEqual(reloaded.status, 200);
    assert.strictEqual(reloaded.body.version, save1.body.version);

    const recoveredSave2 = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: `HR2 Recovered ${bundle.company.taxCode}`, city: 'Đà Nẵng', version: reloaded.body.version },
      { headers: authHeaders(secondActive.token) }
    );
    assert.strictEqual(recoveredSave2.status, 200);
    assert.ok(recoveredSave2.body.version > reloaded.body.version);
  });

  // --------------------------------------------------------------------------
  // TC-T4-DN01-04: Security, OpenAPI & optional DB storage invariant audit
  // --------------------------------------------------------------------------
  it('TC-T4-DN01-04: Should verify OpenAPI security definitions and DB password/created_by/logo storage invariants when Postgres is available', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    let targetBundle = auditedBundle;
    if (!targetBundle) {
      // Self-provision so TC-T4-DN01-04 stays hermetic even when run standalone
      assert.ok(mailpitOnline, 'Mailpit service must be reachable for standalone audit provisioning');
      const provisioned = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token, {
        taxCodeLength: 13,
        activateHr: true,
        newPassword: HR_NEW_PASSWORD
      });
      const pngLogo = buildExactPngBuffer(1536);
      const uploadRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
        buildLogoFormData(pngLogo, 'audit-original-logo.png', 'image/png'),
        { headers: authHeaders(provisioned.hrToken), timeoutMs: 8000 }
      );
      assert.strictEqual(uploadRes.status, 200);
      targetBundle = {
        company: provisioned.company,
        hrEmail: provisioned.hrEmail,
        hrUserId: provisioned.hrAccount.userId,
        tempPassword: provisioned.tempPassword,
        logoUrl: uploadRes.body.logoUrl
      };
    }

    const docsRes = await http.get(`${BACKEND_BASE_URL}/api-docs`);
    assert.strictEqual(docsRes.status, 200);
    assert.ok(docsRes.body.components?.securitySchemes?.bearerAuth, 'OpenAPI must declare bearerAuth');
    assert.ok(docsRes.body.paths?.['/api/v1/staff/companies']?.post);
    assert.ok(docsRes.body.paths?.['/api/v1/staff/companies/{id}/hr-accounts']?.post);
    assert.ok(docsRes.body.paths?.['/api/v1/companies/me']?.get);
    assert.ok(docsRes.body.paths?.['/api/v1/companies/me']?.put);
    assert.ok(docsRes.body.paths?.['/api/v1/companies/me/logo']?.post);
    assert.strictEqual(docsRes.body.paths?.['/api/v1/companies/me/logo']?.get, undefined, 'OpenAPI must omit removed GET /companies/me/logo');
    assert.ok(docsRes.body.paths?.['/api/v1/companies/me/logo']?.post?.responses?.['502'], 'OpenAPI POST /me/logo must document 502');
    const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];
    const dn01OpCount =
      Object.keys(docsRes.body.paths?.['/api/v1/staff/companies'] || {}).filter((m) => httpMethods.includes(m)).length +
      Object.keys(docsRes.body.paths?.['/api/v1/staff/companies/{id}/hr-accounts'] || {}).filter((m) => httpMethods.includes(m)).length +
      Object.keys(docsRes.body.paths?.['/api/v1/companies/me'] || {}).filter((m) => httpMethods.includes(m)).length +
      Object.keys(docsRes.body.paths?.['/api/v1/companies/me/logo'] || {}).filter((m) => httpMethods.includes(m)).length;
    assert.strictEqual(dn01OpCount, 5, `OpenAPI must expose exactly 5 DN-01 operations, got ${dn01OpCount}`);
    assert.ok(!docsRes.rawText.includes(targetBundle.tempPassword));
    assertNoCloudinarySecrets(docsRes.rawText);

    const hrReqRequired = docsRes.body.components?.schemas?.CreateHrAccountRequest?.required || [];
    assert.ok(hrReqRequired.includes('email'), 'OpenAPI CreateHrAccountRequest.required must include email');
    assert.ok(hrReqRequired.includes('fullName'), 'OpenAPI CreateHrAccountRequest.required must include fullName');

    if (!postgresAvailable) {
      console.log('[INFO] rikkei-postgres container unavailable; skipping optional DB security audit queries cleanly.');
      return;
    }

    // Verify BCrypt hash and zero plaintext in users table
    const pwdHash = await execPostgres(
      `SELECT password_hash FROM users WHERE id = ${Number(targetBundle.hrUserId)};`
    );
    assert.match(pwdHash, BCRYPT_REGEX, 'HR password_hash must be a valid BCrypt hash');
    assert.notStrictEqual(pwdHash, targetBundle.tempPassword);
    assert.notStrictEqual(pwdHash, HR_NEW_PASSWORD);

    // Verify companies.created_by matches staff1.id
    const dbCreatedBy = await execPostgres(
      `SELECT created_by FROM companies WHERE id = ${Number(targetBundle.company.id)};`
    );
    assert.strictEqual(Number(dbCreatedBy), staffAuth.user.id);

    // Verify legacy company_logos table does NOT exist after V9 cleanup
    const legacyTableCount = await execPostgres(
      `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_logos';`
    );
    assert.strictEqual(Number(legacyTableCount), 0, 'Legacy company_logos table must not exist');

    // Verify companies.logo_url & logo_public_id use server-generated Cloudinary path without client filename or traversal
    const companyLogoRow = await execPostgres(
      `SELECT coalesce(logo_url, '') || '|' || coalesce(logo_public_id, '') FROM companies WHERE id = ${Number(targetBundle.company.id)};`
    );
    const [dbLogoUrl, dbPublicId] = companyLogoRow.split('|');
    assertCloudinaryLogoUrl(dbLogoUrl, targetBundle.company.id, 'png');
    assert.strictEqual(dbLogoUrl, targetBundle.logoUrl);
    assert.strictEqual(dbPublicId, `rikkei-jobs/company-logos/company-${targetBundle.company.id}`);
    assert.ok(!companyLogoRow.includes('audit-original-logo.png'), 'companies metadata must not expose client filename');
    assert.ok(!companyLogoRow.includes('..'), 'companies metadata must never contain path traversal');

    // Verify all 9 dev seed users exist and seeded hr1/hr2 states remain untouched
    const seedEmailsCount = await execPostgres(
      `SELECT count(*) FROM users WHERE email IN ('candidate1@rikkeijobs.test','candidate2@rikkeijobs.test','candidate3@rikkeijobs.test','hr1@rikkeijobs.test','hr2@rikkeijobs.test','mentor1@rikkeijobs.test','mentor2@rikkeijobs.test','staff1@rikkeijobs.test','admin1@rikkeijobs.test');`
    );
    assert.strictEqual(Number(seedEmailsCount), 9, 'All 9 seeded dev users must exist');

    const seedCheck = await execPostgres(
      `SELECT email || ':' || must_change_password FROM users WHERE email IN ('hr1@rikkeijobs.test', 'hr2@rikkeijobs.test') ORDER BY email;`
    );
    assert.strictEqual(seedCheck.replace(/\r\n/g, '\n'), 'hr1@rikkeijobs.test:true\nhr2@rikkeijobs.test:false');
  });

  it('TC-T4-DN01-05: Should handle concurrent 2x POST /hr-accounts same-email race and concurrent PUT /me + POST /me/logo without 500', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const bundle = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);
    const raceEmail = nextEmail('race-hr');

    const [hr1, hr2] = await Promise.all([
      http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies/${bundle.company.id}/hr-accounts`,
        { email: raceEmail, fullName: 'Race HR One' },
        { headers: authHeaders(staffAuth.token), timeoutMs: 8000 }
      ),
      http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies/${bundle.company.id}/hr-accounts`,
        { email: raceEmail.toUpperCase(), fullName: 'Race HR Two' },
        { headers: authHeaders(staffAuth.token), timeoutMs: 8000 }
      )
    ]);
    const hrStatuses = [hr1.status, hr2.status].sort((a, b) => a - b);
    assert.deepStrictEqual(hrStatuses, [201, 409], `Expected [201, 409] on concurrent HR email race, got ${JSON.stringify(hrStatuses)}`);

    const currentMe = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundle.hrToken)
    });
    assert.strictEqual(currentMe.status, 200);

    const pngBuf = buildExactPngBuffer(320);
    const [putRes, logoRes] = await Promise.all([
      http.put(
        `${BACKEND_BASE_URL}/api/v1/companies/me`,
        { name: `Concurrent Race Co ${bundle.company.taxCode}`, version: currentMe.body.version },
        { headers: authHeaders(bundle.hrToken) }
      ),
      http.post(
        `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
        buildLogoFormData(pngBuf, 'race.png', 'image/png'),
        { headers: authHeaders(bundle.hrToken), timeoutMs: 8000 }
      )
    ]);
    assert.ok(putRes.status === 200 || putRes.status === 409, `Unexpected PUT race status: ${putRes.status}`);
    assert.ok(logoRes.status === 200 || logoRes.status === 409, `Unexpected logo race status: ${logoRes.status}`);
    assert.ok(putRes.status === 200 || logoRes.status === 200, 'At least one concurrent update must succeed');
    if (logoRes.status === 200) {
      assertCloudinaryLogoUrl(logoRes.body.logoUrl, bundle.company.id, 'png');
    }
  });

  it('TC-T4-DN01-06: Should preserve API and DB logo state during forced 502 LOGO_STORAGE_UNAVAILABLE and recover cleanly on retry', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');
    const mockOnline = await isReachable(MOCK_BASE_URL);
    assert.ok(mockOnline, 'Mock service must be reachable for outage scenario');

    const bundle = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);
    const headers = authHeaders(bundle.hrToken);

    const pngLogo = buildExactPngBuffer(480);
    const baselineUp = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(pngLogo, 'baseline.png', 'image/png'),
      { headers, timeoutMs: 8000 }
    );
    assert.strictEqual(baselineUp.status, 200);
    assertCloudinaryLogoUrl(baselineUp.body.logoUrl, bundle.company.id, 'png');
    const baselineLogoUrl = baselineUp.body.logoUrl;
    const baselineVersion = baselineUp.body.version;

    let baselineDbRow = null;
    if (postgresAvailable) {
      baselineDbRow = await execPostgres(
        `SELECT coalesce(logo_url, '') || '|' || coalesce(logo_public_id, '') || '|' || version FROM companies WHERE id = ${Number(bundle.company.id)};`
      );
      assert.strictEqual(
        baselineDbRow,
        `${baselineLogoUrl}|rikkei-jobs/company-logos/company-${bundle.company.id}|${baselineVersion}`
      );
    }

    let failNextArmed = false;
    try {
      const armRes = await http.post(`${MOCK_BASE_URL}/mock/cloudinary/fail-next`, {
        status: 503,
        message: 'Simulated Cloudinary outage'
      });
      assert.strictEqual(armRes.status, 200);
      failNextArmed = true;

      const jpgLogo = buildExactJpegBuffer(640);
      const failRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
        buildLogoFormData(jpgLogo, 'failed-outage.jpg', 'image/jpeg'),
        { headers, timeoutMs: 8000 }
      );
      failNextArmed = false;
      assertCleanStorageUnavailableError(failRes);

      const meAfterFail = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, { headers });
      assert.strictEqual(meAfterFail.status, 200);
      assert.strictEqual(meAfterFail.body.logoUrl, baselineLogoUrl);
      assert.strictEqual(meAfterFail.body.version, baselineVersion);

      if (postgresAvailable) {
        const dbAfterFail = await execPostgres(
          `SELECT coalesce(logo_url, '') || '|' || coalesce(logo_public_id, '') || '|' || version FROM companies WHERE id = ${Number(bundle.company.id)};`
        );
        assert.strictEqual(dbAfterFail, baselineDbRow, 'DB row must remain unchanged when Cloudinary returns 502');
      }

      // Previous logo URL continues serving 200 cleanly
      await fetchAndVerifyMockLogo(baselineLogoUrl, pngLogo, 'image/png');

      // Next upload recovers cleanly and updates DB
      const recoveryUp = await http.post(
        `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
        buildLogoFormData(jpgLogo, 'recovered.jpg', 'image/jpeg'),
        { headers, timeoutMs: 8000 }
      );
      assert.strictEqual(recoveryUp.status, 200);
      assertCloudinaryLogoUrl(recoveryUp.body.logoUrl, bundle.company.id, 'jpg');
      assert.ok(recoveryUp.body.version > baselineVersion);
      assert.notStrictEqual(recoveryUp.body.logoUrl, baselineLogoUrl);
      await fetchAndVerifyMockLogo(recoveryUp.body.logoUrl, jpgLogo, 'image/jpeg');

      if (postgresAvailable) {
        const dbAfterRecovery = await execPostgres(
          `SELECT coalesce(logo_url, '') || '|' || coalesce(logo_public_id, '') || '|' || version FROM companies WHERE id = ${Number(bundle.company.id)};`
        );
        assert.strictEqual(
          dbAfterRecovery,
          `${recoveryUp.body.logoUrl}|rikkei-jobs/company-logos/company-${bundle.company.id}|${recoveryUp.body.version}`
        );
      }
    } finally {
      if (failNextArmed) {
        await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
      }
    }
  });
});
