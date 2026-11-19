// Tier 2: Boundaries, Corner Cases, Concurrency & Security — DN-01 Company Profile & HR Accounts
// Verifies negative inputs, duplicate constraints, CR/LF rejection, @Version conflicts,
// cross-tenant PUT 404, exact 2,097,152 vs 2,097,153 logo boundary (:8080 & :3000/api/), and invalid/traversal files

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { BACKEND_BASE_URL, FRONTEND_BASE_URL, MAILPIT_BASE_URL, MOCK_BASE_URL, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';
import {
  DEV_SEED_PASSWORD,
  PNG_MAGIC,
  JPEG_MAGIC_PREFIX,
  TWO_MB_BYTES,
  VIETNAMESE_DIACRITIC_REGEX,
  EMOJI_REGEX,
  buildExactPngBuffer,
  buildExactJpegBuffer,
  buildPngWithDimensions,
  buildCompressedGrayscalePng,
  buildMultipartBody,
  buildLogoFormData,
  buildInvalidLogoPayloads,
  nextTaxCode,
  nextEmail,
  authHeaders,
  loginUser,
  assertUnifiedErrorResponse,
  assertCloudinaryLogoUrl,
  fetchAndVerifyMockLogo,
  assertNoCloudinarySecrets,
  assertCleanStorageUnavailableError,
  provisionCompanyAndHr
} from '../helpers/company-fixtures.mjs';

describe('Tier 2: DN-01 Company Profile & HR Account Boundaries', () => {
  let backendOnline = false;
  let frontendOnline = false;
  let mailpitOnline = false;

  let staffAuth = null;
  let bundleA = null;
  let bundleB = null;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    frontendOnline = await isReachable(FRONTEND_BASE_URL);
    mailpitOnline = await isReachable(MAILPIT_BASE_URL);

    if (backendOnline && mailpitOnline) {
      staffAuth = await loginUser(BACKEND_BASE_URL, 'staff1@rikkeijobs.test', DEV_SEED_PASSWORD);
      bundleA = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token, {
        taxCodeLength: 10
      });
      bundleB = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token, {
        taxCodeLength: 13
      });
    }
  });

  // --------------------------------------------------------------------------
  // Feature 1 Boundaries: POST /api/v1/staff/companies
  // --------------------------------------------------------------------------
  it('TC-T2-DN01-01: Should reject taxCode with invalid digit lengths (9, 11, 12, 14 digits) with 400', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    for (const badTaxCode of ['123456789', '12345678901', '123456789012', '12345678901234']) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies`,
        { name: `Invalid Tax Length ${badTaxCode}`, taxCode: badTaxCode },
        { headers: authHeaders(staffAuth.token) }
      );
      assert.strictEqual(res.status, 400, `Expected 400 for taxCode length ${badTaxCode.length}, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    }
  });

  it('TC-T2-DN01-02: Should reject taxCode containing letters, spaces, empty string, or null with 400', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    for (const badTaxCode of ['012345678A', '01234 56789', '01234-5678', '', '   ', null]) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies`,
        { name: 'Invalid Tax Format Co', taxCode: badTaxCode },
        { headers: authHeaders(staffAuth.token) }
      );
      assert.strictEqual(res.status, 400, `Expected 400 for invalid taxCode "${badTaxCode}", got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    }
  });

  it('TC-T2-DN01-03: Should reject invalid company size enum values with 400', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    for (const badSize of ['1-10', '500+', 'LARGE', 'invalid']) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies`,
        { name: 'Invalid Size Co', taxCode: nextTaxCode(10), size: badSize },
        { headers: authHeaders(staffAuth.token) }
      );
      assert.strictEqual(res.status, 400, `Expected 400 for size "${badSize}", got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    }
  });

  it('TC-T2-DN01-04: Should reject non-http(s) or overlength website URLs with 400', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const badWebsites = [
      'ftp://files.example.vn',
      'javascript:alert(1)',
      'not-a-valid-url',
      `https://example.vn/${'a'.repeat(500)}`
    ];

    for (const website of badWebsites) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies`,
        { name: 'Invalid Website Co', taxCode: nextTaxCode(10), website },
        { headers: authHeaders(staffAuth.token) }
      );
      assert.strictEqual(res.status, 400, `Expected 400 for website "${website.slice(0, 30)}", got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    }
  });

  it('TC-T2-DN01-05: Should reject blank/too-long name with 400 and ignore client-supplied status/createdBy overrides on POST', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    for (const badName of ['', '   ', 'A'.repeat(256)]) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies`,
        { name: badName, taxCode: nextTaxCode(10) },
        { headers: authHeaders(staffAuth.token) }
      );
      assert.strictEqual(res.status, 400, `Expected 400 for invalid name, got ${res.status}`);
      assertUnifiedErrorResponse(res);
    }

    const taxCode = nextTaxCode(10);
    const overrideAttemptRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies`,
      {
        name: `Override Guard Co ${taxCode}`,
        taxCode,
        status: 'LOCKED',
        createdBy: 999999
      },
      { headers: authHeaders(staffAuth.token) }
    );
    assert.strictEqual(overrideAttemptRes.status, 201);
    assert.strictEqual(overrideAttemptRes.body.status, 'ACTIVE', 'Server must enforce default status ACTIVE');
    assert.strictEqual(overrideAttemptRes.body.createdBy, staffAuth.user.id, 'Server must bind createdBy to authenticated STAFF id');
  });

  it('TC-T2-DN01-06: Should return 409 CONFLICT for duplicate taxCode sequentially and [201, 409] concurrently (never 500)', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const seqDupRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies`,
      { name: 'Duplicate Tax Seq', taxCode: bundleA.company.taxCode },
      { headers: authHeaders(staffAuth.token) }
    );
    assert.strictEqual(seqDupRes.status, 409);
    assertUnifiedErrorResponse(seqDupRes);
    assert.strictEqual(seqDupRes.body.code, 'CONFLICT');

    const raceTaxCode = nextTaxCode(10);
    const [res1, res2] = await Promise.all([
      http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies`,
        { name: `Race Co 1 ${raceTaxCode}`, taxCode: raceTaxCode },
        { headers: authHeaders(staffAuth.token) }
      ),
      http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies`,
        { name: `Race Co 2 ${raceTaxCode}`, taxCode: raceTaxCode },
        { headers: authHeaders(staffAuth.token) }
      )
    ]);

    const sortedStatuses = [res1.status, res2.status].sort((a, b) => a - b);
    assert.deepStrictEqual(sortedStatuses, [201, 409], `Expected [201, 409] on concurrent duplicate taxCode, got ${JSON.stringify(sortedStatuses)}`);
    const conflictRes = res1.status === 409 ? res1 : res2;
    assertUnifiedErrorResponse(conflictRes);
    assert.strictEqual(conflictRes.body.code, 'CONFLICT');
  });

  // --------------------------------------------------------------------------
  // Feature 2 Boundaries: POST /api/v1/staff/companies/{id}/hr-accounts
  // --------------------------------------------------------------------------
  it('TC-T2-DN01-07: Should return 404 NOT_FOUND when provisioning HR account for missing companyId', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const res = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies/99999999/hr-accounts`,
      { email: nextEmail('missing-co'), fullName: 'Trần Thị Mai' },
      { headers: authHeaders(staffAuth.token) }
    );
    assert.strictEqual(res.status, 404);
    assertUnifiedErrorResponse(res);
    assert.strictEqual(res.body.code, 'NOT_FOUND');
  });

  it('TC-T2-DN01-08: Should return 409 CONFLICT for exact, uppercase, and whitespace-padded duplicate HR email', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const variants = [
      bundleA.hrEmail,
      bundleA.hrEmail.toUpperCase(),
      `  ${bundleA.hrEmail.toUpperCase()}  `
    ];

    for (const email of variants) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies/${bundleB.company.id}/hr-accounts`,
        { email, fullName: 'Lê Minh Khôi' },
        { headers: authHeaders(staffAuth.token) }
      );
      assert.strictEqual(res.status, 409, `Expected 409 for duplicate email variant, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'CONFLICT');
    }
  });

  it('TC-T2-DN01-09: Should return 409 CONFLICT when HR email collides with existing non-HR accounts across roles', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const collidingEmails = [
      'candidate1@rikkeijobs.test',
      '  STAFF1@RIKKEIJOBS.TEST  ',
      'Mentor1@rikkeijobs.test'
    ];

    for (const email of collidingEmails) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies/${bundleA.company.id}/hr-accounts`,
        { email, fullName: 'Phạm Quốc Bảo' },
        { headers: authHeaders(staffAuth.token) }
      );
      assert.strictEqual(res.status, 409, `Expected 409 for cross-role collision "${email}", got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'CONFLICT');
    }
  });

  it('TC-T2-DN01-10: Should reject CR/LF header injection characters in email and fullName with 400', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const crlfPayloads = [
      { email: `evil\r\nBcc:victim@example.test@rikkeijobs.test`, fullName: 'Valid Name' },
      { email: `evil\n@rikkeijobs.test`, fullName: 'Valid Name' },
      { email: nextEmail('crlf-name'), fullName: 'Bad\r\nName' },
      { email: nextEmail('lf-name'), fullName: 'Bad\nName' }
    ];

    for (const payload of crlfPayloads) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies/${bundleA.company.id}/hr-accounts`,
        payload,
        { headers: authHeaders(staffAuth.token) }
      );
      assert.strictEqual(res.status, 400, `Expected 400 for CR/LF payload, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    }
  });

  it('TC-T2-DN01-11: Should enforce exact 100/101 boundaries on email and fullName and reject NBSP/ZWS/DEL/mixed-script with 400', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const badPayloads = [
      { email: 'not-an-email', fullName: 'Nguyễn Văn A' },
      { email: '', fullName: 'Nguyễn Văn A' },
      { email: nextEmail('blank-name'), fullName: '   ' },
      { email: nextEmail('long-name'), fullName: 'N'.repeat(101) },
      { email: `${'e'.repeat(85)}@rikkeijobs.test`, fullName: 'Exact 101 Email' },
      { email: `orphan\u00A0${nextEmail('nbsp')}`, fullName: 'NBSP Email' },
      { email: `zws\u200B${nextEmail('zws')}`, fullName: 'ZWS Email' },
      { email: `del\u007F${nextEmail('del')}`, fullName: 'DEL Email' },
      { email: `\u0430admin-${nextEmail('homoglyph')}`, fullName: 'Homoglyph Email' },
      { email: nextEmail('del-name'), fullName: 'Bad\u007FName' }
    ];

    for (const payload of badPayloads) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/companies/${bundleA.company.id}/hr-accounts`,
        payload,
        { headers: authHeaders(staffAuth.token) }
      );
      assert.strictEqual(res.status, 400, `Expected 400 for invalid HR payload, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    }

    // Valid exact 100-char email and 100-char fullName -> 201 Created
    const exactSuffix = '@rikkeijobs.test';
    const exact100Email = `${nextEmail('b100').split('@')[0].padEnd(100 - exactSuffix.length, 'x').slice(0, 100 - exactSuffix.length)}${exactSuffix}`;
    assert.strictEqual(exact100Email.length, 100);
    const ok100Res = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies/${bundleA.company.id}/hr-accounts`,
      { email: exact100Email, fullName: 'N'.repeat(100) },
      { headers: authHeaders(staffAuth.token), timeoutMs: 8000 }
    );
    assert.strictEqual(ok100Res.status, 201, `Expected 201 for exact 100-char email/fullName, got ${ok100Res.status}`);
  });

  // --------------------------------------------------------------------------
  // Feature 3 Boundaries: GET & PUT /api/v1/companies/me, Cross-tenant 404, @Version
  // --------------------------------------------------------------------------
  it('TC-T2-DN01-12: Should keep taxCode and status immutable even when supplied in PUT /api/v1/companies/me', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const beforeRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(beforeRes.status, 200);

    const putRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      {
        name: `Công ty Bất biến ${bundleA.company.taxCode}`,
        industry: 'Công nghệ thông tin',
        size: '51-200',
        taxCode: '9999999999',
        status: 'LOCKED',
        version: beforeRes.body.version
      },
      { headers: authHeaders(bundleA.hrToken) }
    );
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.taxCode, bundleA.company.taxCode, 'taxCode must remain immutable');
    assert.strictEqual(putRes.body.status, 'ACTIVE', 'status must remain immutable');

    const afterRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(afterRes.status, 200);
    assert.strictEqual(afterRes.body.taxCode, bundleA.company.taxCode);
    assert.strictEqual(afterRes.body.status, 'ACTIVE');
  });

  it('TC-T2-DN01-13: Should reject invalid fields on PUT /api/v1/companies/me with 400 VALIDATION_ERROR', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const beforeRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(beforeRes.status, 200);

    const invalidUpdates = [
      { name: '   ', version: beforeRes.body.version },
      { name: 'Valid Name', size: 'INVALID_ENUM', version: beforeRes.body.version },
      { name: 'Valid Name', website: 'javascript:alert(1)', version: beforeRes.body.version },
      { name: 'Valid Name', description: 'D'.repeat(2001), version: beforeRes.body.version }
    ];

    for (const payload of invalidUpdates) {
      const res = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/me`, payload, {
        headers: authHeaders(bundleA.hrToken)
      });
      assert.strictEqual(res.status, 400, `Expected 400 for invalid PUT payload, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    }
  });

  it('TC-T2-DN01-14: Should return 404 unified ErrorResponse on cross-tenant PUT/GET /api/v1/companies/{idOfCompanyB}', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const beforeB = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleB.hrToken)
    });
    assert.strictEqual(beforeB.status, 200);

    const crossPut = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/${bundleB.company.id}`,
      { name: 'Hijacked Company B', size: '1000+' },
      { headers: authHeaders(bundleA.hrToken) }
    );
    assert.strictEqual(crossPut.status, 404, `Cross-tenant PUT must return 404, got ${crossPut.status}`);
    assert.notStrictEqual(crossPut.status, 403);
    assert.notStrictEqual(crossPut.status, 200);
    assertUnifiedErrorResponse(crossPut);
    assert.strictEqual(crossPut.body.code, 'NOT_FOUND');

    const crossGet = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/${bundleB.company.id}`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(crossGet.status, 404);
    assertUnifiedErrorResponse(crossGet);
    assert.strictEqual(crossGet.body.code, 'NOT_FOUND');

    const afterB = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleB.hrToken)
    });
    assert.strictEqual(afterB.status, 200);
    assert.strictEqual(afterB.body.name, beforeB.body.name, 'Company B must remain completely unmodified');
  });

  it('TC-T2-DN01-15: Should return 409 CONFLICT when PUT /api/v1/companies/me sends stale @Version', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const vRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(vRes.status, 200);
    const staleVersion = vRes.body.version;

    const firstPut = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: `Version Advance ${bundleA.company.taxCode}`, version: staleVersion },
      { headers: authHeaders(bundleA.hrToken) }
    );
    assert.strictEqual(firstPut.status, 200);
    assert.ok(firstPut.body.version > staleVersion, 'Version must increment after update');

    const stalePut = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: 'Stale Version Write', version: staleVersion },
      { headers: authHeaders(bundleA.hrToken) }
    );
    assert.strictEqual(stalePut.status, 409, `Expected 409 CONFLICT on stale version, got ${stalePut.status}`);
    assertUnifiedErrorResponse(stalePut);
    assert.strictEqual(stalePut.body.code, 'CONFLICT');
  });

  it('TC-T2-DN01-16: Should handle concurrent PUT /api/v1/companies/me with same @Version cleanly as [200, 409]', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const currentRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(currentRes.status, 200);
    const sharedVersion = currentRes.body.version;

    const [put1, put2] = await Promise.all([
      http.put(
        `${BACKEND_BASE_URL}/api/v1/companies/me`,
        { name: `Concurrent Update A1 ${bundleA.company.taxCode}`, version: sharedVersion },
        { headers: authHeaders(bundleA.hrToken) }
      ),
      http.put(
        `${BACKEND_BASE_URL}/api/v1/companies/me`,
        { name: `Concurrent Update A2 ${bundleA.company.taxCode}`, version: sharedVersion },
        { headers: authHeaders(bundleA.hrToken) }
      )
    ]);

    const sortedStatuses = [put1.status, put2.status].sort((a, b) => a - b);
    assert.deepStrictEqual(sortedStatuses, [200, 409], `Expected [200, 409] for concurrent optimistic lock, got ${JSON.stringify(sortedStatuses)}`);
    const conflict = put1.status === 409 ? put1 : put2;
    assertUnifiedErrorResponse(conflict);
    assert.strictEqual(conflict.body.code, 'CONFLICT');
  });

  // --------------------------------------------------------------------------
  // Feature 4 Boundaries: Logo 2,097,152 vs 2,097,153 (:8080 & :3000/api/) + Invalid Types
  // --------------------------------------------------------------------------
  it('TC-T2-DN01-17: Should accept exact 2,097,152-byte PNG and JPG logos directly on BACKEND_BASE_URL (:8080) and serve exact bytes from CDN', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const exactPng = buildExactPngBuffer(TWO_MB_BYTES);
    assert.strictEqual(exactPng.byteLength, 2097152);
    const pngRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(exactPng, 'exact-2mb.png', 'image/png'),
      { headers: authHeaders(bundleA.hrToken), timeoutMs: 12000 }
    );
    assert.strictEqual(pngRes.status, 200, `Expected 200 for 2,097,152B PNG on :8080, got ${pngRes.status}`);
    assertCloudinaryLogoUrl(pngRes.body.logoUrl, bundleA.company.id, 'png');
    await fetchAndVerifyMockLogo(pngRes.body.logoUrl, exactPng, 'image/png', 12000);

    const exactJpg = buildExactJpegBuffer(TWO_MB_BYTES);
    assert.strictEqual(exactJpg.byteLength, 2097152);
    const jpgRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(exactJpg, 'exact-2mb.jpg', 'image/jpeg'),
      { headers: authHeaders(bundleA.hrToken), timeoutMs: 12000 }
    );
    assert.strictEqual(jpgRes.status, 200, `Expected 200 for 2,097,152B JPG on :8080, got ${jpgRes.status}`);
    assertCloudinaryLogoUrl(jpgRes.body.logoUrl, bundleA.company.id, 'jpg');
    await fetchAndVerifyMockLogo(jpgRes.body.logoUrl, exactJpg, 'image/jpeg', 12000);

    bundleA.lastLogoUrl = jpgRes.body.logoUrl;
    bundleA.lastLogoBuffer = exactJpg;
  });

  it('TC-T2-DN01-18: Should reject 2,097,153-byte PNG and JPG logos with 413 unified ErrorResponse on BACKEND_BASE_URL (:8080)', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const overPng = buildExactPngBuffer(TWO_MB_BYTES + 1);
    assert.strictEqual(overPng.byteLength, 2097153);
    const pngRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(overPng, 'over-2mb.png', 'image/png'),
      { headers: authHeaders(bundleA.hrToken), timeoutMs: 12000 }
    );
    assert.strictEqual(pngRes.status, 413, `Expected 413 for 2,097,153B PNG on :8080, got ${pngRes.status}`);
    assertUnifiedErrorResponse(pngRes);
    assertNoCloudinarySecrets(pngRes.rawText);
    assert.strictEqual(pngRes.body.code, 'PAYLOAD_TOO_LARGE');

    const overJpg = buildExactJpegBuffer(TWO_MB_BYTES + 1);
    assert.strictEqual(overJpg.byteLength, 2097153);
    const jpgRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(overJpg, 'over-2mb.jpg', 'image/jpeg'),
      { headers: authHeaders(bundleA.hrToken), timeoutMs: 12000 }
    );
    assert.strictEqual(jpgRes.status, 413, `Expected 413 for 2,097,153B JPG on :8080, got ${jpgRes.status}`);
    assertUnifiedErrorResponse(jpgRes);
    assertNoCloudinarySecrets(jpgRes.rawText);
    assert.strictEqual(jpgRes.body.code, 'PAYLOAD_TOO_LARGE');
  });

  it('TC-T2-DN01-19: Should accept exact 2,097,152-byte PNG and JPG logos via Nginx FRONTEND_BASE_URL (:3000/api/) and serve exact bytes from CDN', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(frontendOnline, `Frontend Nginx proxy at ${FRONTEND_BASE_URL} must be reachable`);

    const exactPng = buildExactPngBuffer(TWO_MB_BYTES);
    const pngRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(exactPng, 'nginx-2mb.png', 'image/png'),
      { headers: authHeaders(bundleB.hrToken), timeoutMs: 12000 }
    );
    assert.strictEqual(pngRes.status, 200, `Expected 200 for 2,097,152B PNG via :3000/api/, got ${pngRes.status}`);
    assertCloudinaryLogoUrl(pngRes.body.logoUrl, bundleB.company.id, 'png');
    await fetchAndVerifyMockLogo(pngRes.body.logoUrl, exactPng, 'image/png', 12000);

    const exactJpg = buildExactJpegBuffer(TWO_MB_BYTES);
    const jpgRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(exactJpg, 'nginx-2mb.jpg', 'image/jpeg'),
      { headers: authHeaders(bundleB.hrToken), timeoutMs: 12000 }
    );
    assert.strictEqual(jpgRes.status, 200, `Expected 200 for 2,097,152B JPG via :3000/api/, got ${jpgRes.status}`);
    assertCloudinaryLogoUrl(jpgRes.body.logoUrl, bundleB.company.id, 'jpg');
    await fetchAndVerifyMockLogo(jpgRes.body.logoUrl, exactJpg, 'image/jpeg', 12000);
  });

  it('TC-T2-DN01-20: Should reject 2,097,153-byte PNG and JPG logos with 413 unified JSON ErrorResponse via :3000/api/', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(frontendOnline, `Frontend Nginx proxy at ${FRONTEND_BASE_URL} must be reachable`);

    const overPng = buildExactPngBuffer(TWO_MB_BYTES + 1);
    const pngRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(overPng, 'nginx-over.png', 'image/png'),
      { headers: authHeaders(bundleB.hrToken), timeoutMs: 12000 }
    );
    assert.strictEqual(pngRes.status, 413, `Expected 413 for 2,097,153B PNG via :3000/api/, got ${pngRes.status}`);
    assertUnifiedErrorResponse(pngRes);
    assertNoCloudinarySecrets(pngRes.rawText);
    assert.strictEqual(pngRes.body.code, 'PAYLOAD_TOO_LARGE');

    const overJpg = buildExactJpegBuffer(TWO_MB_BYTES + 1);
    const jpgRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(overJpg, 'nginx-over.jpg', 'image/jpeg'),
      { headers: authHeaders(bundleB.hrToken), timeoutMs: 12000 }
    );
    assert.strictEqual(jpgRes.status, 413, `Expected 413 for 2,097,153B JPG via :3000/api/, got ${jpgRes.status}`);
    assertUnifiedErrorResponse(jpgRes);
    assertNoCloudinarySecrets(jpgRes.rawText);
    assert.strictEqual(jpgRes.body.code, 'PAYLOAD_TOO_LARGE');
  });

  it('TC-T2-DN01-21: Should reject 0-byte, SVG, GIF, WebP, PDF, and renamed .txt files with 400 unified Vietnamese ErrorResponse', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const payloads = buildInvalidLogoPayloads();
    for (const [label, spec] of Object.entries(payloads)) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
        buildLogoFormData(spec.buffer, spec.filename, spec.mimeType),
        { headers: authHeaders(bundleA.hrToken), timeoutMs: 8000 }
      );
      assert.strictEqual(res.status, 400, `Expected 400 for invalid payload "${label}", got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(res.body.message), `Expected Vietnamese diacritics for "${label}" error`);
      assert.strictEqual(EMOJI_REGEX.test(res.body.message), false);
    }
  });

  it('TC-T2-DN01-22: Should reject double-extension a.php.jpg and raw multipart path traversal ../../x.png with 400 Vietnamese ErrorResponse', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const validJpg = buildExactJpegBuffer(512);
    const doubleExtMultipart = buildMultipartBody('file', 'a.php.jpg', 'image/jpeg', validJpg);
    const doubleExtRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      doubleExtMultipart.body,
      {
        headers: {
          ...authHeaders(bundleA.hrToken),
          'Content-Type': doubleExtMultipart.contentType
        },
        timeoutMs: 8000
      }
    );
    assert.strictEqual(doubleExtRes.status, 400, `Expected 400 for double extension a.php.jpg, got ${doubleExtRes.status}`);
    assertUnifiedErrorResponse(doubleExtRes);
    assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(doubleExtRes.body.message));

    const validPng = buildExactPngBuffer(512);
    for (const unsafeName of ['../../x.png', '..\\x.png']) {
      const traversalMultipart = buildMultipartBody('file', unsafeName, 'image/png', validPng);
      const traversalRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
        traversalMultipart.body,
        {
          headers: {
            ...authHeaders(bundleA.hrToken),
            'Content-Type': traversalMultipart.contentType
          },
          timeoutMs: 8000
        }
      );
      assert.strictEqual(traversalRes.status, 400, `Expected 400 for traversal filename "${unsafeName}", got ${traversalRes.status}`);
      assertUnifiedErrorResponse(traversalRes);
      assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(traversalRes.body.message));
    }
  });

  it('TC-T2-DN01-23: Should keep previously valid logo intact via GET /me and direct CDN fetch after rejected uploads', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(bundleA.lastLogoUrl && bundleA.lastLogoBuffer, 'Previous 2MB logo must exist from TC-T2-DN01-17');

    const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.logoUrl, bundleA.lastLogoUrl);

    await fetchAndVerifyMockLogo(meRes.body.logoUrl, bundleA.lastLogoBuffer, 'image/jpeg', 12000);
  });

  it('TC-T2-DN01-24: Should return JSON 413 for >3MB via :3000/api/, 415 on unsupported Content-Type, 405 on removed GET /me/logo, and reject NUL/polyglot payloads', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(frontendOnline, `Frontend Nginx proxy at ${FRONTEND_BASE_URL} must be reachable`);

    // 1. > 3 MB via Nginx :3000/api/ -> unified JSON 413 PAYLOAD_TOO_LARGE (never Nginx HTML)
    const overThreeMbPng = buildExactPngBuffer(3_145_729);
    const overThreeMbRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(overThreeMbPng, 'over-3mb.png', 'image/png'),
      { headers: authHeaders(bundleB.hrToken), timeoutMs: 15000 }
    );
    assert.strictEqual(overThreeMbRes.status, 413, `Expected 413 for >3MB via :3000/api/, got ${overThreeMbRes.status}`);
    assert.ok(
      (overThreeMbRes.headers.get('content-type') || '').includes('application/json'),
      'Nginx >3MB 413 must return application/json'
    );
    assertUnifiedErrorResponse(overThreeMbRes);
    assert.strictEqual(overThreeMbRes.body.code, 'PAYLOAD_TOO_LARGE');

    // 2. 415 Unsupported Media Type on POST /staff/companies and POST /companies/me/logo
    const raw415Create = await fetch(`${BACKEND_BASE_URL}/api/v1/staff/companies`, {
      method: 'POST',
      headers: { ...authHeaders(staffAuth.token), 'Content-Type': 'text/plain' },
      body: 'plain text'
    });
    assert.strictEqual(raw415Create.status, 415);
    const body415Create = await raw415Create.json();
    assert.strictEqual(body415Create.code, 'UNSUPPORTED_MEDIA_TYPE');

    const raw415Logo = await fetch(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, {
      method: 'POST',
      headers: { ...authHeaders(bundleA.hrToken), 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.strictEqual(raw415Logo.status, 415);
    const body415Logo = await raw415Logo.json();
    assert.strictEqual(body415Logo.code, 'UNSUPPORTED_MEDIA_TYPE');

    // 3. Removed GET /api/v1/companies/me/logo returns 405 METHOD_NOT_ALLOWED regardless of Accept header
    const freshNoLogo = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);
    const getRemovedImgAccept = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, {
      headers: { ...authHeaders(freshNoLogo.hrToken), Accept: 'image/png, image/jpeg' }
    });
    assert.strictEqual(getRemovedImgAccept.status, 405);
    assertUnifiedErrorResponse(getRemovedImgAccept);
    assert.strictEqual(getRemovedImgAccept.body.code, 'METHOD_NOT_ALLOWED');
    assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(getRemovedImgAccept.body.message));

    const getRemovedJsonAccept = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, {
      headers: { ...authHeaders(bundleA.hrToken), Accept: 'application/json' }
    });
    assert.strictEqual(getRemovedJsonAccept.status, 405);
    assertUnifiedErrorResponse(getRemovedJsonAccept);
    assert.strictEqual(getRemovedJsonAccept.body.code, 'METHOD_NOT_ALLOWED');
    assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(getRemovedJsonAccept.body.message));

    // 4. NUL byte in company name/description -> 400 VALIDATION_ERROR (never 409)
    const nulRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/companies`,
      { name: 'Nul\u0000Co', taxCode: nextTaxCode(10) },
      { headers: authHeaders(staffAuth.token) }
    );
    assert.strictEqual(nulRes.status, 400);
    assertUnifiedErrorResponse(nulRes);
    assert.strictEqual(nulRes.body.code, 'VALIDATION_ERROR');

    // 5. Bare magic-only bytes, polyglot, and spaced intermediate extension a.php .jpg -> 400
    const polyglotBuf = Buffer.concat([
      buildExactPngBuffer(256),
      Buffer.from('<svg onload=alert(1)><script>alert(1)</script></svg>', 'utf8')
    ]);
    const spacedMultipart = buildMultipartBody('file', 'a.php .jpg', 'image/jpeg', buildExactJpegBuffer(256));
    const spacedRes = await http.post(`${BACKEND_BASE_URL}/api/v1/companies/me/logo`, spacedMultipart.body, {
      headers: { ...authHeaders(bundleA.hrToken), 'Content-Type': spacedMultipart.contentType }
    });
    assert.strictEqual(spacedRes.status, 400);
    assertUnifiedErrorResponse(spacedRes);
    assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(spacedRes.body.message));

    for (const [name, buf, mime] of [
      ['bare.png', PNG_MAGIC, 'image/png'],
      ['bare.jpg', JPEG_MAGIC_PREFIX, 'image/jpeg'],
      ['polyglot.png', polyglotBuf, 'image/png']
    ]) {
      const badRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
        buildLogoFormData(buf, name, mime),
        { headers: authHeaders(bundleA.hrToken) }
      );
      assert.strictEqual(badRes.status, 400, `Expected 400 for ${name}, got ${badRes.status}`);
      assertUnifiedErrorResponse(badRes);
      assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(badRes.body.message));
    }
  });

  it('TC-T2-DN01-25: Should reject PUT /api/v1/companies/me with missing or null version (400 VALIDATION_ERROR) and leave profile unchanged', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const beforeRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(beforeRes.status, 200);

    const missingRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: 'Missing Version Co' },
      { headers: authHeaders(bundleA.hrToken) }
    );
    assert.strictEqual(missingRes.status, 400, `Expected 400 when version is missing, got ${missingRes.status}`);
    assertUnifiedErrorResponse(missingRes);
    assert.strictEqual(missingRes.body.code, 'VALIDATION_ERROR');

    const nullRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { name: 'Null Version Co', version: null },
      { headers: authHeaders(bundleA.hrToken) }
    );
    assert.strictEqual(nullRes.status, 400, `Expected 400 when version is null, got ${nullRes.status}`);
    assertUnifiedErrorResponse(nullRes);
    assert.strictEqual(nullRes.body.code, 'VALIDATION_ERROR');

    const afterRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(afterRes.status, 200);
    assert.strictEqual(afterRes.body.name, beforeRes.body.name);
    assert.strictEqual(afterRes.body.version, beforeRes.body.version);
  });

  it('TC-T2-DN01-26: Should reject PNG bomb and >4,096 dimension boundaries from header while accepting 4,096 x 4,096 PNG', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const freshDimBundle = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staffAuth.token);
    const headers = authHeaders(freshDimBundle.hrToken);

    const bombPng = buildPngWithDimensions(100_000, 100_000);
    assert.ok(bombPng.byteLength < 1024);
    const bombRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(bombPng, 'bomb.png', 'image/png'),
      { headers, timeoutMs: 8000 }
    );
    assert.strictEqual(bombRes.status, 400, `Expected 400 for 100k x 100k PNG header bomb, got ${bombRes.status}`);
    assertUnifiedErrorResponse(bombRes);
    assert.strictEqual(bombRes.body.code, 'VALIDATION_ERROR');

    for (const [w, h] of [
      [4_097, 1],
      [1, 4_097],
      [4_096, 4_097]
    ]) {
      const overDimPng = buildCompressedGrayscalePng(w, h);
      const overRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
        buildLogoFormData(overDimPng, `dim-${w}x${h}.png`, 'image/png'),
        { headers, timeoutMs: 8000 }
      );
      assert.strictEqual(overRes.status, 400, `Expected 400 for ${w}x${h} PNG, got ${overRes.status}`);
      assertUnifiedErrorResponse(overRes);
      assert.strictEqual(overRes.body.code, 'VALIDATION_ERROR');
    }

    const maxValidPng = buildCompressedGrayscalePng(4_096, 4_096);
    assert.ok(maxValidPng.byteLength < TWO_MB_BYTES, `Expected 4096x4096 compressed PNG < 2MB, got ${maxValidPng.byteLength}`);
    const validRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(maxValidPng, 'max-4096x4096.png', 'image/png'),
      { headers, timeoutMs: 15000 }
    );
    assert.strictEqual(validRes.status, 200, `Expected 200 for valid 4,096x4,096 PNG, got ${validRes.status}`);
    assertCloudinaryLogoUrl(validRes.body.logoUrl, freshDimBundle.company.id, 'png');
    await fetchAndVerifyMockLogo(validRes.body.logoUrl, maxValidPng, 'image/png', 12000);
  });

  it('TC-T2-DN01-27: Should return JSON 413 for >3MB directly on :8080 and reject/close 20MB payload on both :8080 and :3000 while keeping health UP', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(frontendOnline, `Frontend Nginx proxy at ${FRONTEND_BASE_URL} must be reachable`);

    const overThreeMbPng = buildExactPngBuffer(3_145_729);
    const directOver3MbRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
      buildLogoFormData(overThreeMbPng, 'direct-over-3mb.png', 'image/png'),
      { headers: authHeaders(bundleB.hrToken), timeoutMs: 15000 }
    );
    assert.strictEqual(
      directOver3MbRes.status,
      413,
      `Expected 413 for >3MB directly on :8080, got ${directOver3MbRes.status}`
    );
    assert.ok(
      (directOver3MbRes.headers.get('content-type') || '').includes('application/json'),
      'Direct :8080 >3MB 413 must return application/json'
    );
    assertUnifiedErrorResponse(directOver3MbRes);
    assert.strictEqual(directOver3MbRes.body.code, 'PAYLOAD_TOO_LARGE');

    const huge20MbPng = buildExactPngBuffer(20 * 1024 * 1024);
    const hugeMultipart = buildMultipartBody('file', 'huge-20mb.png', 'image/png', huge20MbPng);

    for (const [label, targetBase] of [
      ['backend', BACKEND_BASE_URL],
      ['nginx', FRONTEND_BASE_URL]
    ]) {
      let res = null;
      let networkClosed = false;
      try {
        res = await http.post(
          `${targetBase}/api/v1/companies/me/logo`,
          hugeMultipart.body,
          {
            headers: {
              ...authHeaders(bundleB.hrToken),
              'Content-Type': hugeMultipart.contentType
            },
            timeoutMs: 20000
          }
        );
      } catch (err) {
        if (err instanceof assert.AssertionError || err?.name === 'AssertionError') {
          throw err;
        }
        const errCode = err?.cause?.code || err?.code || '';
        const errMsg = `${err?.cause?.message || ''} ${err?.message || ''}`;
        assert.ok(!/timed out/i.test(errMsg), `20MB payload on ${label} must not time out: ${errMsg}`);
        assert.ok(
          ['ECONNRESET', 'EPIPE', 'ECONNABORTED', 'UND_ERR_SOCKET'].includes(errCode) ||
            /closed|reset|EPIPE|ECONNRESET|socket|other side/i.test(errMsg),
          `Expected HTTP 413 or socket close/reset for 20MB payload on ${label}, got code="${errCode}" msg="${errMsg}"`
        );
        networkClosed = true;
      }

      if (!networkClosed) {
        assert.ok(res !== null, `Expected HTTP response object for 20MB payload on ${label}`);
        assert.strictEqual(
          res.status,
          413,
          `Expected 413 for 20MB payload on ${label}, got ${res.status}`
        );
        if ((res.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
          assertUnifiedErrorResponse(res);
          assert.strictEqual(res.body.code, 'PAYLOAD_TOO_LARGE');
        }
      }
    }

    const backendHealth = await http.get(`${BACKEND_BASE_URL}/api/v1/health`);
    assert.strictEqual(backendHealth.status, 200);
    assert.strictEqual(backendHealth.body?.status, 'UP');

    const frontendHealth = await http.get(`${FRONTEND_BASE_URL}/api/v1/health`);
    assert.strictEqual(frontendHealth.status, 200);
    assert.strictEqual(frontendHealth.body?.status, 'UP');
  });

  it('TC-T2-DN01-28: Should return clean 502 LOGO_STORAGE_UNAVAILABLE on forced Cloudinary outage, preserve profile, and recover on retry', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    const mockOnline = await isReachable(MOCK_BASE_URL);
    assert.ok(mockOnline, 'Mock service must be reachable for fail-next boundary test');

    const beforeMe = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
      headers: authHeaders(bundleA.hrToken)
    });
    assert.strictEqual(beforeMe.status, 200);

    let failNextArmed = false;
    try {
      const armRes = await http.post(`${MOCK_BASE_URL}/mock/cloudinary/fail-next`, {
        status: 503,
        message: 'Simulated Cloudinary outage'
      });
      assert.strictEqual(armRes.status, 200);
      failNextArmed = true;

      const failedPng = buildExactPngBuffer(400);
      const failRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
        buildLogoFormData(failedPng, 'outage.png', 'image/png'),
        { headers: authHeaders(bundleA.hrToken), timeoutMs: 8000 }
      );
      failNextArmed = false;
      assertCleanStorageUnavailableError(failRes);

      const afterFailureMe = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`, {
        headers: authHeaders(bundleA.hrToken)
      });
      assert.strictEqual(afterFailureMe.status, 200);
      assert.strictEqual(afterFailureMe.body.logoUrl, beforeMe.body.logoUrl);
      assert.strictEqual(afterFailureMe.body.version, beforeMe.body.version);

      const recoveryPng = buildExactPngBuffer(640);
      const recoveryRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/companies/me/logo`,
        buildLogoFormData(recoveryPng, 'recovered.png', 'image/png'),
        { headers: authHeaders(bundleA.hrToken), timeoutMs: 8000 }
      );
      assert.strictEqual(recoveryRes.status, 200, `Expected recovery upload to succeed, got ${recoveryRes.status}`);
      assertCloudinaryLogoUrl(recoveryRes.body.logoUrl, bundleA.company.id, 'png');
      assert.ok(recoveryRes.body.version > beforeMe.body.version);
      await fetchAndVerifyMockLogo(recoveryRes.body.logoUrl, recoveryPng, 'image/png');
    } finally {
      if (failNextArmed) {
        await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
      }
    }
  });
});
