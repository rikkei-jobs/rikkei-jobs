// Tier 1: Feature Coverage — UT-02 Recruitment Process: Screening, Interview Rounds & Staff Oversight (Opaque-Box)
// Verifies Option 1A GET /api/v1/hr/jobs, Option 2A GET /api/v1/applications/{id}/cv-snapshot,
// GET /api/v1/applications/{id}, POST /transition, POST /rounds, PUT /rounds/{roundId},
// GET /api/v1/staff/applications, full RBAC/IDOR (401/403/404), transition matrix, terminal states,
// round rules, canSendOffer eligibility, Mailpit Vietnamese candidate email + escaping, and concurrency.
// Preserves hr1 (must_change_password=true) and UT-01 seeded applications 1..7 via temp cand3 fixtures cleaned in after().

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  BACKEND_BASE_URL,
  FRONTEND_BASE_URL,
  MOCK_BASE_URL,
  MAILPIT_BASE_URL,
  SERVICE_KEY,
  isReachable
} from '../config.mjs';
import { http, fetchMailpitMessagesWithRetry } from '../helpers/http-client.mjs';
import {
  DEV_SEED_PASSWORD,
  VIETNAMESE_DIACRITIC_REGEX,
  EMOJI_REGEX,
  authHeaders,
  loginUser,
  provisionCompanyAndHr,
  assertNoSniffHeader,
  assertUnifiedErrorResponse
} from '../helpers/company-fixtures.mjs';

const execFileAsync = promisify(execFile);

const EXPECTED_SEEDED_PDF_SIZE = 594;
const EXPECTED_SEEDED_PDF_SHA256 = '9b71184ae956dd96864598cc8abfffb29bcf23c9bff28aff431fd779ac564782';
const CANDIDATE3_USER_ID = 3;
const CANDIDATE3_EMAIL = 'candidate3@rikkeijobs.test';
const COMPANY2_OPEN_JOB_ID = 2;
const COMPANY2_SECOND_JOB_ID = 8;

async function loginViaMockSso(lmsUserId) {
  const ticketRes = await http.post(
    `${MOCK_BASE_URL}/lms/sso/tickets`,
    { lmsUserId },
    { headers: { 'X-Service-Key': SERVICE_KEY } }
  );
  assert.strictEqual(ticketRes.status, 201, `Mock SSO ticket failed for ${lmsUserId}: ${ticketRes.status}`);
  assert.ok(ticketRes.body?.ticket, `Mock SSO response must include ticket for ${lmsUserId}`);

  const ssoRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket: ticketRes.body.ticket });
  assert.strictEqual(ssoRes.status, 200, `Backend SSO login failed for ${lmsUserId}: ${ssoRes.status}`);
  assert.ok(ssoRes.body?.accessToken, `Missing SSO accessToken for ${lmsUserId}`);

  const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
    headers: authHeaders(ssoRes.body.accessToken)
  });
  assert.strictEqual(meRes.status, 200, `GET /api/v1/auth/me failed for ${lmsUserId}: ${meRes.status}`);

  return {
    token: ssoRes.body.accessToken,
    user: meRes.body
  };
}

function assertErrorResponse(res, expectedStatus, expectedCode, label, requireVietnamese = true) {
  assert.strictEqual(
    res.status,
    expectedStatus,
    `${label}: expected HTTP ${expectedStatus}, got ${res.status} (${res.rawText})`
  );
  assertUnifiedErrorResponse(res);
  if (expectedCode) {
    assert.strictEqual(res.body.code, expectedCode, `${label}: expected code "${expectedCode}", got "${res.body.code}"`);
  }
  if (requireVietnamese) {
    assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(res.body.message), `${label}: error message must have Vietnamese diacritics`);
  }
  assert.strictEqual(EMOJI_REGEX.test(res.body.message), false, `${label}: error message must contain zero emoji`);
}

function assertValidPdfSnapshot(res, label) {
  assert.strictEqual(res.status, 200, `${label}: expected HTTP 200, got ${res.status}`);
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  assert.ok(contentType.includes('application/pdf'), `${label}: expected application/pdf, got "${contentType}"`);
  const contentDisposition = res.headers.get('content-disposition') || '';
  assert.ok(contentDisposition.includes('attachment'), `${label}: Content-Disposition must be attachment, got "${contentDisposition}"`);
  assert.ok(contentDisposition.includes('sample-candidate-cv.pdf'), `${label}: Content-Disposition must include safe filename, got "${contentDisposition}"`);
  const cacheControl = (res.headers.get('cache-control') || '').toLowerCase();
  assert.ok(cacheControl.includes('no-store'), `${label}: Cache-Control must include no-store, got "${cacheControl}"`);
  assertNoSniffHeader(res.headers);
  assert.strictEqual(res.rawBuffer.byteLength, EXPECTED_SEEDED_PDF_SIZE, `${label}: PDF size mismatch`);
  assert.strictEqual(res.rawBuffer.subarray(0, 5).toString('ascii'), '%PDF-', `${label}: PDF magic header mismatch`);
  const sha256 = crypto.createHash('sha256').update(res.rawBuffer).digest('hex');
  assert.strictEqual(sha256, EXPECTED_SEEDED_PDF_SHA256, `${label}: PDF SHA-256 mismatch`);
}

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

describe('Tier 1: UT-02 Recruitment Process (Screening, Interview Rounds & Staff Oversight)', () => {
  let backendOnline = false;
  let frontendOnline = false;
  let mockOnline = false;
  let mailpitOnline = false;
  let postgresAvailable = false;

  let cand1;
  let cand3;
  let hr1;
  let hr2;
  let hrB;
  let mentor1;
  let staff1;
  let admin1;

  const createdAppIds = [];
  let provisionedCompanyId = null;
  let provisionedHrUserId = null;

  async function createTempApplication({
    jobId = COMPANY2_OPEN_JOB_ID,
    userId = CANDIDATE3_USER_ID,
    status = 'SUBMITTED',
    coverLetter = 'Hồ sơ kiểm thử E2E UT-02'
  } = {}) {
    assert.ok(postgresAvailable, 'Postgres container must be reachable for pre-HS-04 UT-02 fixture setup');
    const escapedCover = coverLetter.replace(/'/g, "''");
    const sql = `
      WITH next_id AS (
        SELECT nextval('applications_id_seq') AS id
      ),
      inserted AS (
        INSERT INTO applications (id, job_id, user_id, cv_id, cv_snapshot_url, cover_letter, status, version, created_at, updated_at)
        SELECT next_id.id, ${jobId}, ${userId}, 1, '/api/v1/me/applications/' || next_id.id || '/cv-snapshot', '${escapedCover}', '${status}', 0, NOW(), NOW()
        FROM next_id
        RETURNING id, status, user_id, created_at
      ),
      hist AS (
        INSERT INTO application_status_history (application_id, from_status, to_status, actor_id, note, created_at)
        SELECT id, NULL, status, user_id, 'Ứng viên nộp hồ sơ ứng tuyển.', created_at
        FROM inserted
      ),
      snap AS (
        INSERT INTO application_cv_snapshots (application_id, original_filename, content_type, file_data, file_size, sha256)
        SELECT inserted.id, s.original_filename, s.content_type, s.file_data, s.file_size, s.sha256
        FROM inserted
        CROSS JOIN application_cv_snapshots s
        WHERE s.application_id = 1
      )
      SELECT id FROM inserted;
    `;
    const rawId = await execPostgres(sql);
    const idLine = rawId.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop();
    const appId = Number(idLine);
    assert.ok(Number.isInteger(appId) && appId > 7, `Expected created appId > 7, got "${rawId}"`);
    createdAppIds.push(appId);
    return appId;
  }

  async function deleteTempApplications(appIds) {
    if (!postgresAvailable || appIds.length === 0) return;
    const idList = appIds.join(',');
    await execPostgres(
      `DELETE FROM interview_rounds WHERE application_id IN (${idList}); ` +
        `DELETE FROM application_status_history WHERE application_id IN (${idList}); ` +
        `DELETE FROM application_cv_snapshots WHERE application_id IN (${idList}); ` +
        `DELETE FROM applications WHERE id IN (${idList});`
    );
  }

  before(async () => {
    [backendOnline, frontendOnline, mockOnline, mailpitOnline] = await Promise.all([
      isReachable(`${BACKEND_BASE_URL}/api/v1/health`),
      isReachable(FRONTEND_BASE_URL),
      isReachable(`${MOCK_BASE_URL}/mock/requests`),
      isReachable(`${MAILPIT_BASE_URL}/api/v1/info`)
    ]);

    assert.ok(backendOnline, 'Backend service must be reachable');
    assert.ok(frontendOnline, 'Frontend Nginx proxy must be reachable');
    assert.ok(mockOnline, 'Mock LMS service must be reachable');
    assert.ok(mailpitOnline, 'Mailpit service must be reachable');

    const probe = await execPostgres('SELECT 1;');
    postgresAvailable = probe === '1';
    assert.ok(postgresAvailable, 'rikkei-postgres must be reachable');

    [cand1, mentor1, staff1, admin1, hr1, hr2, cand3] = await Promise.all([
      loginViaMockSso('lms-sv-001'),
      loginViaMockSso('lms-mt-001'),
      loginViaMockSso('lms-st-001'),
      loginViaMockSso('lms-ad-001'),
      // Never mutate hr1's password so subsequent suites keep must_change_password=true
      loginUser(BACKEND_BASE_URL, 'hr1@rikkeijobs.test', DEV_SEED_PASSWORD),
      loginUser(BACKEND_BASE_URL, 'hr2@rikkeijobs.test', DEV_SEED_PASSWORD),
      loginUser(BACKEND_BASE_URL, CANDIDATE3_EMAIL, DEV_SEED_PASSWORD)
    ]);

    assert.strictEqual(hr1.mustChangePassword, true, 'hr1 must retain mustChangePassword=true');
    assert.strictEqual(hr2.mustChangePassword, false, 'hr2 must have mustChangePassword=false');
    assert.strictEqual(cand3.user.id, CANDIDATE3_USER_ID, 'candidate3 must resolve to user_id=3');

    const provisioned = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staff1.token, {
      companyName: 'Công ty Đối Tác UT02 E2E',
      hrFullName: 'Nguyễn Thị Thu Hương'
    });
    provisionedCompanyId = provisioned.company.id;
    provisionedHrUserId = provisioned.hrAccount.userId;
    hrB = { token: provisioned.hrToken, user: provisioned.hrUser };
  });

  after(async () => {
    if (!postgresAvailable) return;
    try {
      await deleteTempApplications(createdAppIds);
      if (provisionedHrUserId) {
        await execPostgres(`DELETE FROM users WHERE id = ${provisionedHrUserId};`);
      }
      if (provisionedCompanyId) {
        await execPostgres(`DELETE FROM companies WHERE id = ${provisionedCompanyId};`);
      }
    } catch {
      // Best-effort cleanup when postgres container is reachable
    }
  });

  it('TC-T1-UT02-01: Should list paginated own-company jobs on GET /api/v1/hr/jobs (Option 1A) and enforce 400 bounds', async () => {
    const res = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs`, {
      headers: authHeaders(hr2.token)
    });
    assert.strictEqual(res.status, 200, `GET /api/v1/hr/jobs failed: ${res.rawText}`);
    assert.strictEqual(res.body.page, 1);
    assert.strictEqual(res.body.size, 20);
    assert.strictEqual(res.body.totalItems, 3);
    assert.strictEqual(res.body.totalPages, 1);
    assert.deepStrictEqual(
      res.body.items.map((j) => j.id).sort((a, b) => a - b),
      [2, 8, 12]
    );
    for (const item of res.body.items) {
      assert.strictEqual(item.companyId, 2);
      assert.strictEqual(typeof item.title, 'string');
      assert.strictEqual(typeof item.status, 'string');
      assert.strictEqual(typeof item.expired, 'boolean');
    }
    const job12 = res.body.items.find((j) => j.id === 12);
    const job2 = res.body.items.find((j) => j.id === 2);
    const job8 = res.body.items.find((j) => j.id === 8);
    assert.ok(job12 && job2 && job8, 'Expected seeded jobs 2, 8, 12 in GET /api/v1/hr/jobs');
    assert.strictEqual(job12.expired, true, 'Job #12 with deadline 2024-01-01 must be expired=true');
    assert.strictEqual(job12.status, 'EXPIRED', 'Job #12 with deadline 2024-01-01 must have status=EXPIRED');
    assert.strictEqual(job2.expired, false, 'Open job #2 must be expired=false');
    assert.strictEqual(job2.status, 'APPROVED', 'Open job #2 must have status=APPROVED');
    assert.strictEqual(job8.expired, false, 'Open job #8 must be expired=false');
    assert.strictEqual(job8.status, 'APPROVED', 'Open job #8 must have status=APPROVED');

    const page1 = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs?page=1&size=2`, {
      headers: authHeaders(hr2.token)
    });
    const page2 = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs?page=2&size=2`, {
      headers: authHeaders(hr2.token)
    });
    assert.strictEqual(page1.status, 200);
    assert.strictEqual(page2.status, 200);
    assert.strictEqual(page1.body.totalPages, 2);
    assert.strictEqual(page1.body.items.length, 2);
    assert.strictEqual(page2.body.items.length, 1);
    const pagedIds = new Set([...page1.body.items.map((j) => j.id), ...page2.body.items.map((j) => j.id)]);
    assert.strictEqual(pagedIds.size, 3);

    // Company B HR must see empty list even if ?companyId=2 is injected
    const hrBRes = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs?companyId=2`, {
      headers: authHeaders(hrB.token)
    });
    assert.strictEqual(hrBRes.status, 200);
    assert.strictEqual(hrBRes.body.totalItems, 0);
    assert.deepStrictEqual(hrBRes.body.items, []);

    for (const invalidQuery of ['?page=0', '?size=0', '?size=101']) {
      const badRes = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs${invalidQuery}`, {
        headers: authHeaders(hr2.token)
      });
      assertErrorResponse(badRes, 400, 'VALIDATION_ERROR', `GET /api/v1/hr/jobs${invalidQuery}`, false);
    }
  });

  it('TC-T1-UT02-02: Should return full process detail and PDF snapshot (Option 2A) for owning HR and STAFF across :8080 and :3000', async () => {
    const appId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'SUBMITTED' });
    try {
      for (const [label, actor] of [['hr2', hr2], ['staff1', staff1]]) {
        const detailRes = await http.get(`${BACKEND_BASE_URL}/api/v1/applications/${appId}`, {
          headers: authHeaders(actor.token)
        });
        assert.strictEqual(detailRes.status, 200, `${label} GET /applications/${appId} failed: ${detailRes.rawText}`);
        assert.strictEqual(detailRes.body.id, appId);
        assert.strictEqual(detailRes.body.jobId, COMPANY2_OPEN_JOB_ID);
        assert.strictEqual(detailRes.body.companyId, 2);
        assert.strictEqual(detailRes.body.candidateUserId, CANDIDATE3_USER_ID);
        assert.strictEqual(detailRes.body.candidateEmail, CANDIDATE3_EMAIL);
        assert.strictEqual(detailRes.body.status, 'SUBMITTED');
        assert.strictEqual(typeof detailRes.body.matchScore, 'number');
        assert.ok(detailRes.body.matchScore >= 0 && detailRes.body.matchScore <= 100);
        assert.strictEqual(detailRes.body.canSendOffer, false);
        assert.deepStrictEqual([...detailRes.body.allowedTransitions].sort(), ['REJECTED', 'SCREENING']);
        assert.deepStrictEqual(detailRes.body.rounds, []);
        assert.strictEqual(detailRes.body.histories.length, 1);

        const pdfRes = await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/applications/${appId}/cv-snapshot`, {
          headers: authHeaders(actor.token)
        });
        assertValidPdfSnapshot(pdfRes, `${label} GET /applications/${appId}/cv-snapshot`);
      }

      const proxyDetail = await http.get(`${FRONTEND_BASE_URL}/api/v1/applications/${appId}`, {
        headers: authHeaders(hr2.token)
      });
      assert.strictEqual(proxyDetail.status, 200);
      assert.strictEqual(proxyDetail.body.id, appId);

      const proxyPdf = await http.getBuffer(`${FRONTEND_BASE_URL}/api/v1/applications/${appId}/cv-snapshot`, {
        headers: authHeaders(staff1.token)
      });
      assertValidPdfSnapshot(proxyPdf, `Nginx :3000 staff1 GET /applications/${appId}/cv-snapshot`);
    } finally {
      await deleteTempApplications([appId]);
    }
  });

  it('TC-T1-UT02-03: Should enforce complete RBAC matrix (401/403 incl. hr1 MUST_CHANGE_PASSWORD) and byte-identical 404 cross-company IDOR', async () => {
    const appId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'INTERVIEW' });
    try {
      const roundCreateRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
        {
          name: 'Vòng kỹ thuật RBAC',
          interviewerEmail: 'interviewer@fpt.example.test',
          scheduledAt: '2026-12-01T10:00:00+07:00'
        },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(roundCreateRes.status, 201);
      const roundId = roundCreateRes.body.id;

      const hrOnlyEndpoints = [
        { name: 'GET /hr/jobs', send: (h) => http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs`, { headers: h }) },
        {
          name: 'POST /applications/{id}/transition',
          send: (h) =>
            http.post(
              `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
              { toStatus: 'REJECTED', note: 'Kiểm tra phân quyền' },
              { headers: h }
            )
        },
        {
          name: 'POST /applications/{id}/rounds',
          send: (h) =>
            http.post(
              `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
              {
                name: 'Vòng kiểm tra quyền',
                interviewerEmail: 'qa@fpt.example.test',
                scheduledAt: '2026-12-02T10:00:00+07:00'
              },
              { headers: h }
            )
        },
        {
          name: 'PUT /applications/{id}/rounds/{roundId}',
          send: (h) =>
            http.put(
              `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${roundId}`,
              { result: 'PASS', score: 80, note: 'Đạt', version: 0 },
              { headers: h }
            )
        }
      ];

      const hrAndStaffEndpoints = [
        { name: 'GET /applications/{id}', send: (h) => http.get(`${BACKEND_BASE_URL}/api/v1/applications/${appId}`, { headers: h }) },
        { name: 'GET /applications/{id}/cv-snapshot', send: (h) => http.getBuffer(`${BACKEND_BASE_URL}/api/v1/applications/${appId}/cv-snapshot`, { headers: h }) }
      ];

      const staffOnlyEndpoints = [
        { name: 'GET /staff/applications', send: (h) => http.get(`${BACKEND_BASE_URL}/api/v1/staff/applications`, { headers: h }) }
      ];

      const allEndpoints = [...hrOnlyEndpoints, ...hrAndStaffEndpoints, ...staffOnlyEndpoints];

      for (const ep of allEndpoints) {
        const anonRes = await ep.send({});
        assertErrorResponse(anonRes, 401, 'UNAUTHORIZED', `Anonymous ${ep.name}`);

        const hr1Res = await ep.send(authHeaders(hr1.token));
        assertErrorResponse(hr1Res, 403, 'MUST_CHANGE_PASSWORD', `hr1 MUST_CHANGE_PASSWORD ${ep.name}`);
      }

      for (const [roleName, actor] of [['CANDIDATE(cand1)', cand1], ['CANDIDATE(cand3)', cand3], ['MENTOR', mentor1], ['ADMIN', admin1]]) {
        for (const ep of allEndpoints) {
          const res = await ep.send(authHeaders(actor.token));
          assertErrorResponse(res, 403, 'FORBIDDEN', `${roleName} on ${ep.name}`);
        }
      }

      // STAFF cannot mutate or list HR jobs
      for (const ep of hrOnlyEndpoints) {
        const res = await ep.send(authHeaders(staff1.token));
        assertErrorResponse(res, 403, 'FORBIDDEN', `STAFF on ${ep.name}`);
      }

      // HR cannot access STAFF endpoint
      const hrOnStaff = await staffOnlyEndpoints[0].send(authHeaders(hr2.token));
      assertErrorResponse(hrOnStaff, 403, 'FORBIDDEN', 'HR on GET /staff/applications');

      // Cross-company HR (hrB) must receive 404 NOT_FOUND byte-identical to missing ID 999999
      const crossCompanyProbes = [
        [
          'GET /applications/{id}',
          () => http.get(`${BACKEND_BASE_URL}/api/v1/applications/${appId}`, { headers: authHeaders(hrB.token) }),
          () => http.get(`${BACKEND_BASE_URL}/api/v1/applications/999999`, { headers: authHeaders(hrB.token) })
        ],
        [
          'GET /applications/{id}/cv-snapshot',
          () => http.getBuffer(`${BACKEND_BASE_URL}/api/v1/applications/${appId}/cv-snapshot`, { headers: authHeaders(hrB.token) }),
          () => http.getBuffer(`${BACKEND_BASE_URL}/api/v1/applications/999999/cv-snapshot`, { headers: authHeaders(hrB.token) })
        ],
        [
          'POST /applications/{id}/transition',
          () =>
            http.post(
              `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
              { toStatus: 'REJECTED', note: 'IDOR probe' },
              { headers: authHeaders(hrB.token) }
            ),
          () =>
            http.post(
              `${BACKEND_BASE_URL}/api/v1/applications/999999/transition`,
              { toStatus: 'REJECTED', note: 'Missing probe' },
              { headers: authHeaders(hrB.token) }
            )
        ],
        [
          'POST /applications/{id}/rounds',
          () =>
            http.post(
              `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
              { name: 'IDOR round', interviewerEmail: 'idor@company-b.test', scheduledAt: '2026-12-03T09:00:00+07:00' },
              { headers: authHeaders(hrB.token) }
            ),
          () =>
            http.post(
              `${BACKEND_BASE_URL}/api/v1/applications/999999/rounds`,
              { name: 'Missing round', interviewerEmail: 'missing@company-b.test', scheduledAt: '2026-12-03T09:00:00+07:00' },
              { headers: authHeaders(hrB.token) }
            )
        ],
        [
          'PUT /applications/{id}/rounds/{roundId}',
          () =>
            http.put(
              `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${roundId}`,
              { result: 'PASS', score: 90, note: 'IDOR probe', version: 0 },
              { headers: authHeaders(hrB.token) }
            ),
          () =>
            http.put(
              `${BACKEND_BASE_URL}/api/v1/applications/999999/rounds/${roundId}`,
              { result: 'PASS', score: 90, note: 'Missing probe', version: 0 },
              { headers: authHeaders(hrB.token) }
            )
        ]
      ];

      for (const [label, sendCross, sendMissing] of crossCompanyProbes) {
        const [crossRes, missingRes] = await Promise.all([sendCross(), sendMissing()]);
        assertErrorResponse(crossRes, 404, 'NOT_FOUND', `hrB cross-company ${label}`);
        assertErrorResponse(missingRes, 404, 'NOT_FOUND', `hrB missing ${label}`);
        assert.strictEqual(crossRes.rawText, missingRes.rawText, `Cross-company 404 body for ${label} must be byte-identical to missing ID`);
      }
    } finally {
      await deleteTempApplications([appId]);
    }
  });

  it('TC-T1-UT02-04: Should enforce UT-02 transition matrix (no skips, no backward moves, INTERVIEW->OFFER=409)', async () => {
    const appId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'SUBMITTED' });
    try {
      for (const illegalTarget of ['INTERVIEW', 'OFFER', 'HIRED', 'SUBMITTED', 'WITHDRAWN']) {
        const res = await http.post(
          `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
          { toStatus: illegalTarget, note: `Thử chuyển từ SUBMITTED sang ${illegalTarget}` },
          { headers: authHeaders(hr2.token) }
        );
        assertErrorResponse(res, 409, 'INVALID_TRANSITION', `SUBMITTED -> ${illegalTarget}`);
      }

      const blankNote = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
        { toStatus: 'SCREENING', note: '   ' },
        { headers: authHeaders(hr2.token) }
      );
      assertErrorResponse(blankNote, 400, 'VALIDATION_ERROR', 'Blank transition note');

      const toScreening = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
        { toStatus: 'SCREENING', note: 'Hồ sơ đạt tiêu chí sàng lọc.' },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(toScreening.status, 200);
      assert.strictEqual(toScreening.body.status, 'SCREENING');
      assert.deepStrictEqual([...toScreening.body.allowedTransitions].sort(), ['INTERVIEW', 'REJECTED']);

      for (const illegalTarget of ['SUBMITTED', 'OFFER', 'HIRED', 'SCREENING', 'WITHDRAWN']) {
        const res = await http.post(
          `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
          { toStatus: illegalTarget, note: `Thử chuyển từ SCREENING sang ${illegalTarget}` },
          { headers: authHeaders(hr2.token) }
        );
        assertErrorResponse(res, 409, 'INVALID_TRANSITION', `SCREENING -> ${illegalTarget}`);
      }

      const toInterview = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
        { toStatus: 'INTERVIEW', note: 'Mời ứng viên tham gia phỏng vấn.' },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(toInterview.status, 200);
      assert.strictEqual(toInterview.body.status, 'INTERVIEW');
      assert.deepStrictEqual(toInterview.body.allowedTransitions, ['REJECTED']);

      for (const illegalTarget of ['OFFER', 'HIRED', 'SCREENING', 'SUBMITTED', 'WITHDRAWN']) {
        const res = await http.post(
          `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
          { toStatus: illegalTarget, note: `Thử chuyển từ INTERVIEW sang ${illegalTarget}` },
          { headers: authHeaders(hr2.token) }
        );
        assertErrorResponse(res, 409, 'INVALID_TRANSITION', `INTERVIEW -> ${illegalTarget}`);
      }

      const toRejected = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
        { toStatus: 'REJECTED', note: 'Ứng viên chưa đáp ứng yêu cầu chuyên môn.' },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(toRejected.status, 200);
      assert.strictEqual(toRejected.body.status, 'REJECTED');
      assert.deepStrictEqual(toRejected.body.allowedTransitions, []);
    } finally {
      await deleteTempApplications([appId]);
    }
  });

  it('TC-T1-UT02-05: Should block transitions (409 INVALID_TRANSITION) and round additions (409 INVALID_APPLICATION_STATE) on OFFER and terminal states', async () => {
    const rejectedId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'REJECTED' });
    const hiredId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'HIRED' });
    const withdrawnId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'WITHDRAWN' });
    const offerId = await createTempApplication({ jobId: COMPANY2_SECOND_JOB_ID, status: 'OFFER' });

    try {
      for (const [label, appId] of [
        ['REJECTED', rejectedId],
        ['HIRED', hiredId],
        ['WITHDRAWN', withdrawnId],
        ['OFFER', offerId]
      ]) {
        for (const target of ['SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']) {
          const tRes = await http.post(
            `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
            { toStatus: target, note: `Thử chuyển từ ${label} sang ${target}` },
            { headers: authHeaders(hr2.token) }
          );
          assertErrorResponse(tRes, 409, 'INVALID_TRANSITION', `${label} -> ${target}`);
        }

        const rRes = await http.post(
          `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
          {
            name: 'Vòng không hợp lệ',
            interviewerEmail: 'hr@fpt.example.test',
            scheduledAt: '2026-12-05T10:00:00+07:00'
          },
          { headers: authHeaders(hr2.token) }
        );
        assertErrorResponse(rRes, 409, 'INVALID_APPLICATION_STATE', `POST /rounds on ${label}`);
      }
    } finally {
      await deleteTempApplications([rejectedId, hiredId, withdrawnId, offerId]);
    }
  });

  it('TC-T1-UT02-06: Should enforce interview round creation/update rules, monotonic roundNo, @Version conflict (409), and 400 validation', async () => {
    const appId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'SUBMITTED' });
    const otherAppId = await createTempApplication({ jobId: COMPANY2_SECOND_JOB_ID, status: 'INTERVIEW' });

    try {
      // 1. SUBMITTED blocks POST /rounds
      const submittedRoundRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
        {
          name: 'Vòng 1 sớm',
          interviewerEmail: 'lead@fpt.example.test',
          scheduledAt: '2026-12-06T09:00:00+07:00'
        },
        { headers: authHeaders(hr2.token) }
      );
      assertErrorResponse(submittedRoundRes, 409, 'INVALID_APPLICATION_STATE', 'POST /rounds in SUBMITTED');

      // 2. SCREENING allows POST /rounds (roundNo=1) but blocks PUT /rounds/{roundId}
      const screenRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
        { toStatus: 'SCREENING', note: 'Bắt đầu sàng lọc' },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(screenRes.status, 200);

      const round1Res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
        {
          name: 'Vòng 1: Phỏng vấn kỹ thuật',
          interviewerEmail: 'lead@fpt.example.test',
          scheduledAt: '2026-12-06T09:00:00+07:00'
        },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(round1Res.status, 201);
      assert.strictEqual(round1Res.body.roundNo, 1);
      assert.strictEqual(round1Res.body.result, 'PENDING');
      assert.strictEqual(round1Res.body.version, 0);
      const round1Id = round1Res.body.id;

      const updateInScreening = await http.put(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${round1Id}`,
        { result: 'PASS', score: 85, note: 'Thử chấm điểm ở SCREENING', version: 0 },
        { headers: authHeaders(hr2.token) }
      );
      assertErrorResponse(updateInScreening, 409, 'INVALID_APPLICATION_STATE', 'PUT /rounds in SCREENING');

      // 3. INTERVIEW allows adding round 2 and updating results
      const interviewRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
        { toStatus: 'INTERVIEW', note: 'Mời phỏng vấn chính thức' },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(interviewRes.status, 200);

      const round2Res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
        {
          name: 'Vòng 2: Phỏng vấn kiến trúc',
          interviewerEmail: 'architect@fpt.example.test',
          scheduledAt: '2026-12-08T14:00:00+07:00'
        },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(round2Res.status, 201);
      assert.strictEqual(round2Res.body.roundNo, 2);

      const updatePassRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${round1Id}`,
        { result: 'PASS', score: 88.5, note: 'Nắm vững OOP và SQL.', version: 0 },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(updatePassRes.status, 200);
      assert.strictEqual(updatePassRes.body.result, 'PASS');
      assert.strictEqual(updatePassRes.body.score, 88.5);
      assert.strictEqual(updatePassRes.body.version, 1);

      // Stale version -> 409 CONFLICT
      const staleRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${round1Id}`,
        { result: 'FAIL', score: 40, note: 'Ghi đè phiên bản cũ', version: 0 },
        { headers: authHeaders(hr2.token) }
      );
      assertErrorResponse(staleRes, 409, 'CONFLICT', 'Stale @Version PUT /rounds');

      // Cross-application roundId -> 404 NOT_FOUND
      const crossAppRoundRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/applications/${otherAppId}/rounds/${round1Id}`,
        { result: 'PASS', score: 90, note: 'Chéo đơn', version: 1 },
        { headers: authHeaders(hr2.token) }
      );
      assertErrorResponse(crossAppRoundRes, 404, 'NOT_FOUND', 'Cross-application roundId');

      // Validation errors -> 400 VALIDATION_ERROR
      const badEmailRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
        { name: 'Vòng 3', interviewerEmail: 'not-an-email', scheduledAt: '2026-12-09T10:00:00+07:00' },
        { headers: authHeaders(hr2.token) }
      );
      assertErrorResponse(badEmailRes, 400, 'VALIDATION_ERROR', 'Invalid interviewerEmail');

      const badScoreRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${round1Id}`,
        { result: 'PASS', score: 105.0, note: 'Điểm vượt khung', version: 1 },
        { headers: authHeaders(hr2.token) }
      );
      assertErrorResponse(badScoreRes, 400, 'VALIDATION_ERROR', 'Score > 100');

      const missingVersionRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${round1Id}`,
        { result: 'PASS', score: 90.0, note: 'Thiếu version' },
        { headers: authHeaders(hr2.token) }
      );
      assertErrorResponse(missingVersionRes, 400, 'VALIDATION_ERROR', 'Omitted version PUT /rounds');
      assert.ok(
        missingVersionRes.body.message.includes('Phiên bản vòng phỏng vấn không được để trống'),
        `Expected Vietnamese @NotNull version error message, got: ${missingVersionRes.rawText}`
      );

      const nullVersionRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${round1Id}`,
        { result: 'PASS', score: 90.0, note: 'Version null', version: null },
        { headers: authHeaders(hr2.token) }
      );
      assertErrorResponse(nullVersionRes, 400, 'VALIDATION_ERROR', 'Null version PUT /rounds');
    } finally {
      await deleteTempApplications([appId, otherAppId]);
    }
  });

  it('TC-T1-UT02-07: Should compute canSendOffer accurately across empty, PENDING, last-FAIL, and all-PASS rounds', async () => {
    const appId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'INTERVIEW' });
    try {
      const noRounds = await http.get(`${BACKEND_BASE_URL}/api/v1/applications/${appId}`, {
        headers: authHeaders(hr2.token)
      });
      assert.strictEqual(noRounds.status, 200);
      assert.strictEqual(noRounds.body.canSendOffer, false);

      const r1 = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
        { name: 'Vòng 1', interviewerEmail: 'r1@fpt.example.test', scheduledAt: '2026-12-07T09:00:00+07:00' },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(r1.status, 201);

      const onePending = await http.get(`${BACKEND_BASE_URL}/api/v1/applications/${appId}`, {
        headers: authHeaders(hr2.token)
      });
      assert.strictEqual(onePending.body.canSendOffer, false);

      const r1Pass = await http.put(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${r1.body.id}`,
        { result: 'PASS', score: 85, note: 'Đạt vòng 1', version: 0 },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(r1Pass.status, 200);

      const onePass = await http.get(`${BACKEND_BASE_URL}/api/v1/applications/${appId}`, {
        headers: authHeaders(hr2.token)
      });
      assert.strictEqual(onePass.body.canSendOffer, true);

      const r2 = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
        { name: 'Vòng 2', interviewerEmail: 'r2@fpt.example.test', scheduledAt: '2026-12-08T09:00:00+07:00' },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(r2.status, 201);

      const r1PassR2Pending = await http.get(`${BACKEND_BASE_URL}/api/v1/applications/${appId}`, {
        headers: authHeaders(hr2.token)
      });
      assert.strictEqual(r1PassR2Pending.body.canSendOffer, false);

      const r2Fail = await http.put(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${r2.body.id}`,
        { result: 'FAIL', score: 45, note: 'Chưa đạt vòng 2', version: 0 },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(r2Fail.status, 200);

      const lastFail = await http.get(`${BACKEND_BASE_URL}/api/v1/applications/${appId}`, {
        headers: authHeaders(hr2.token)
      });
      assert.strictEqual(lastFail.body.canSendOffer, false);

      const r2Pass = await http.put(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds/${r2.body.id}`,
        { result: 'PASS', score: 92, note: 'Đạt sau khi cập nhật lại', version: 1 },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(r2Pass.status, 200);

      const allPass = await http.get(`${BACKEND_BASE_URL}/api/v1/applications/${appId}`, {
        headers: authHeaders(hr2.token)
      });
      assert.strictEqual(allPass.body.canSendOffer, true);
    } finally {
      await deleteTempApplications([appId]);
    }
  });

  it('TC-T1-UT02-08: Should send Vietnamese candidate transition email via Mailpit with escaped HTML and write history row', async () => {
    const appId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'SUBMITTED' });
    try {
      await http.delete(`${MAILPIT_BASE_URL}/api/v1/messages`);

      const hostileNote = 'Đạt vòng sàng lọc <script>alert("xss")</script> & <b>tốt</b>';
      const tRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
        { toStatus: 'SCREENING', note: hostileNote },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(tRes.status, 200, `Transition failed: ${tRes.rawText}`);
      assert.strictEqual(tRes.body.histories.length, 2);
      const lastHistory = tRes.body.histories[1];
      assert.strictEqual(lastHistory.fromStatus, 'SUBMITTED');
      assert.strictEqual(lastHistory.toStatus, 'SCREENING');
      assert.strictEqual(lastHistory.actorId, hr2.user.id);
      assert.strictEqual(lastHistory.note, hostileNote);

      const mailList = await fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, CANDIDATE3_EMAIL, {
        minCount: 1,
        maxRetries: 20,
        intervalMs: 250
      });
      assert.ok(mailList.messages.length >= 1, 'Expected candidate notification email in Mailpit');
      const mailDetail = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${mailList.messages[0].ID}`);
      assert.strictEqual(mailDetail.status, 200);

      const subject = mailDetail.body?.Subject || '';
      assert.ok(subject.includes(`#${appId}`), `Subject must reference application #${appId}, got "${subject}"`);
      assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(subject), 'Email subject must use Vietnamese diacritics');
      assert.strictEqual(EMOJI_REGEX.test(subject), false, 'Email subject must contain zero emoji');

      const emailText = typeof mailDetail.body?.Text === 'string' ? mailDetail.body.Text : '';
      const emailHtml = typeof mailDetail.body?.HTML === 'string' ? mailDetail.body.HTML : '';
      assert.match(emailText, /https?:\/\/[^\s"']+\/candidate\/applications(?:\s|$)/, 'Plain-text email must link to /candidate/applications');
      assert.match(emailHtml, /href="https?:\/\/[^"']+\/candidate\/applications"/, 'HTML email CTA must link to /candidate/applications');
      assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(emailText), 'Email body must use Vietnamese diacritics');
      assert.strictEqual(EMOJI_REGEX.test(emailText), false, 'Email text must contain zero emoji');
      assert.strictEqual(EMOJI_REGEX.test(emailHtml), false, 'Email HTML must contain zero emoji');

      assert.strictEqual(emailHtml.includes('<script>'), false, 'HTML email must escape <script> tag');
      assert.ok(emailHtml.includes('&lt;script&gt;'), 'HTML email must contain escaped &lt;script&gt;');
    } finally {
      await deleteTempApplications([appId]);
    }
  });

  it('TC-T1-UT02-09: Should filter, paginate, and compute matchScore/roundCount on GET /api/v1/staff/applications across :8080 and :3000', async () => {
    const appId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'INTERVIEW' });
    try {
      const roundRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
        { name: 'Vòng STAFF check', interviewerEmail: 'staff-check@fpt.example.test', scheduledAt: '2026-12-10T10:00:00+07:00' },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(roundRes.status, 201);

      const staffRes = await http.get(
        `${BACKEND_BASE_URL}/api/v1/staff/applications?companyId=2&jobId=${COMPANY2_OPEN_JOB_ID}&status=INTERVIEW&page=1&size=20`,
        { headers: authHeaders(staff1.token) }
      );
      assert.strictEqual(staffRes.status, 200, `GET /staff/applications failed: ${staffRes.rawText}`);
      assert.strictEqual(staffRes.body.page, 1);
      assert.strictEqual(staffRes.body.size, 20);
      assert.ok(staffRes.body.totalItems >= 1);

      const found = staffRes.body.items.find((item) => item.id === appId);
      assert.ok(found, `Expected created appId=${appId} in staff list`);
      assert.strictEqual(found.companyId, 2);
      assert.strictEqual(found.jobId, COMPANY2_OPEN_JOB_ID);
      assert.strictEqual(found.status, 'INTERVIEW');
      assert.strictEqual(found.roundCount, 1);
      assert.strictEqual(typeof found.matchScore, 'number');
      assert.ok(found.matchScore >= 0 && found.matchScore <= 100);

      const proxyRes = await http.get(
        `${FRONTEND_BASE_URL}/api/v1/staff/applications?companyId=2&status=INTERVIEW&page=1&size=5`,
        { headers: authHeaders(staff1.token) }
      );
      assert.strictEqual(proxyRes.status, 200);
      assert.strictEqual(proxyRes.body.size, 5);

      for (const [invalidQuery, requireVi] of [['?page=0', false], ['?size=0', false], ['?size=101', false], ['?status=BOGUS', true]]) {
        const badRes = await http.get(`${BACKEND_BASE_URL}/api/v1/staff/applications${invalidQuery}`, {
          headers: authHeaders(staff1.token)
        });
        assertErrorResponse(badRes, 400, 'VALIDATION_ERROR', `GET /staff/applications${invalidQuery}`, requireVi);
      }
    } finally {
      await deleteTempApplications([appId]);
    }
  });

  it('TC-T1-UT02-10: Should allow exactly 1 winner under concurrent transitions and assign unique monotonic roundNo under concurrent round creation', async () => {
    const appId = await createTempApplication({ jobId: COMPANY2_OPEN_JOB_ID, status: 'SUBMITTED' });
    try {
      const transitionResults = await Promise.all(
        Array.from({ length: 10 }, (_, idx) =>
          http.post(
            `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
            { toStatus: 'SCREENING', note: `Chuyển song song #${idx + 1}` },
            { headers: authHeaders(hr2.token) }
          )
        )
      );

      const okCount = transitionResults.filter((r) => r.status === 200).length;
      const conflictCount = transitionResults.filter((r) => r.status === 409).length;
      const serverErrorCount = transitionResults.filter((r) => r.status >= 500).length;
      assert.strictEqual(okCount, 1, `Expected exactly 1 winning transition (200), got ${okCount}`);
      assert.strictEqual(conflictCount, 9, `Expected 9 conflicting transitions (409), got ${conflictCount}`);
      assert.strictEqual(serverErrorCount, 0, 'Concurrent transitions must produce 0 HTTP 500 errors');

      const toInterview = await http.post(
        `${BACKEND_BASE_URL}/api/v1/applications/${appId}/transition`,
        { toStatus: 'INTERVIEW', note: 'Chuyển sang phỏng vấn để test đồng thời' },
        { headers: authHeaders(hr2.token) }
      );
      assert.strictEqual(toInterview.status, 200);

      const roundResults = await Promise.all(
        Array.from({ length: 5 }, (_, idx) =>
          http.post(
            `${BACKEND_BASE_URL}/api/v1/applications/${appId}/rounds`,
            {
              name: `Vòng song song ${idx + 1}`,
              interviewerEmail: `panel${idx + 1}@fpt.example.test`,
              scheduledAt: '2026-12-12T10:00:00+07:00'
            },
            { headers: authHeaders(hr2.token) }
          )
        )
      );

      assert.strictEqual(roundResults.filter((r) => r.status === 201).length, 5, 'All 5 concurrent round additions must return 201');
      assert.strictEqual(roundResults.filter((r) => r.status >= 500).length, 0, 'Concurrent round creation must produce 0 HTTP 500 errors');
      const roundNumbers = roundResults.map((r) => r.body.roundNo).sort((a, b) => a - b);
      assert.deepStrictEqual(roundNumbers, [1, 2, 3, 4, 5], 'Concurrent round creation must assign unique monotonic roundNo 1..5');
    } finally {
      await deleteTempApplications([appId]);
    }
  });
});
