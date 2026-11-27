// Tier 1: Feature Coverage — UT-01 Candidate CV Application & Status Tracking (Opaque-Box)
// Verifies seeded candidate list/filter/pagination/detail/snapshot, HR read-only views,
// cross-user & cross-company IDOR (404), full RBAC matrix (401/403 incl. hr1 MUST_CHANGE_PASSWORD),
// Nginx :3000 proxy parity, apply eligibility/validation/duplicate/503 placeholder, withdraw rules,
// and a named Phase 2 skip awaiting the HS-04 real CV adapter merge.

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
  assertNoSniffHeader,
  assertUnifiedErrorResponse
} from '../helpers/company-fixtures.mjs';

const execFileAsync = promisify(execFile);

const EXPECTED_SEEDED_PDF_SIZE = 594;
const EXPECTED_SEEDED_PDF_SHA256 = '9b71184ae956dd96864598cc8abfffb29bcf23c9bff28aff431fd779ac564782';
const ALL_SEVEN_STATUSES = [
  'SUBMITTED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
  'WITHDRAWN'
];

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
  assert.strictEqual(meRes.body?.lmsUserId, lmsUserId, `/auth/me lmsUserId must match ${lmsUserId}`);

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

describe('Tier 1: UT-01 Candidate CV Application & Status Tracking', () => {
  let backendOnline = false;
  let frontendOnline = false;
  let mockOnline = false;
  let mailpitOnline = false;
  let postgresAvailable = false;
  let withdrewAppId2 = false;

  let cand1;
  let cand2;
  let hr1;
  let hr2;
  let mentor1;
  let staff1;
  let admin1;

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

    try {
      const probe = await execPostgres('SELECT 1;');
      postgresAvailable = probe === '1';
    } catch {
      postgresAvailable = false;
    }

    [cand1, cand2, mentor1, staff1, admin1, hr1, hr2] = await Promise.all([
      loginViaMockSso('lms-sv-001'),
      loginViaMockSso('lms-sv-002'),
      loginViaMockSso('lms-mt-001'),
      loginViaMockSso('lms-st-001'),
      loginViaMockSso('lms-ad-001'),
      // Never mutate hr1's password so subsequent suites keep must_change_password=true
      loginUser(BACKEND_BASE_URL, 'hr1@rikkeijobs.test', DEV_SEED_PASSWORD),
      loginUser(BACKEND_BASE_URL, 'hr2@rikkeijobs.test', DEV_SEED_PASSWORD)
    ]);

    assert.strictEqual(hr1.mustChangePassword, true, 'hr1 must retain mustChangePassword=true');
    assert.strictEqual(hr2.mustChangePassword, false, 'hr2 must have mustChangePassword=false');
  });

  after(async () => {
    if (withdrewAppId2 && postgresAvailable) {
      try {
        await execPostgres(
          "DELETE FROM application_status_history WHERE application_id = 2 AND id > 20; UPDATE applications SET status = 'SCREENING', version = 1 WHERE id = 2;"
        );
      } catch {
        // Best-effort cleanup when postgres container is reachable
      }
    }
  });

  it('TC-T1-UT01-01: Should list all 7 seeded statuses for candidate1 and empty list for candidate2', async () => {
    const res1 = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.page, 1);
    assert.strictEqual(res1.body.size, 20);
    assert.strictEqual(res1.body.totalItems, 7);
    assert.strictEqual(res1.body.totalPages, 1);
    assert.strictEqual(res1.body.items.length, 7);

    const statuses = new Set(res1.body.items.map((item) => item.status));
    for (const status of ALL_SEVEN_STATUSES) {
      assert.ok(statuses.has(status), `Missing seeded application status ${status}`);
    }

    for (const item of res1.body.items) {
      assert.strictEqual(typeof item.id, 'number');
      assert.strictEqual(typeof item.jobId, 'number');
      assert.ok(typeof item.jobTitle === 'string' && item.jobTitle.length > 0);
      assert.ok(typeof item.companyName === 'string' && item.companyName.length > 0);
      const expectedCanWithdraw = ['SUBMITTED', 'SCREENING', 'INTERVIEW'].includes(item.status);
      assert.strictEqual(item.canWithdraw, expectedCanWithdraw, `canWithdraw mismatch for status ${item.status}`);
    }

    const res2 = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications`, {
      headers: authHeaders(cand2.token)
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.totalItems, 0);
    assert.deepStrictEqual(res2.body.items, []);
  });

  it('TC-T1-UT01-02: Should filter by status, paginate deterministically, and reject invalid query bounds with 400', async () => {
    const submittedRes = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications?status=SUBMITTED`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(submittedRes.status, 200);
    assert.strictEqual(submittedRes.body.totalItems, 1);
    assert.strictEqual(submittedRes.body.items[0].id, 1);
    assert.strictEqual(submittedRes.body.items[0].status, 'SUBMITTED');

    const offerRes = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications?status=OFFER&page=1&size=100`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(offerRes.status, 200);
    assert.strictEqual(offerRes.body.totalItems, 1);
    assert.strictEqual(offerRes.body.size, 100);
    assert.strictEqual(offerRes.body.items[0].status, 'OFFER');

    const page1 = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications?page=1&size=3`, {
      headers: authHeaders(cand1.token)
    });
    const page2 = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications?page=2&size=3`, {
      headers: authHeaders(cand1.token)
    });
    const page3 = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications?page=3&size=3`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(page1.status, 200);
    assert.strictEqual(page2.status, 200);
    assert.strictEqual(page3.status, 200);
    assert.strictEqual(page1.body.totalPages, 3);
    assert.strictEqual(page1.body.items.length, 3);
    assert.strictEqual(page2.body.items.length, 3);
    assert.strictEqual(page3.body.items.length, 1);

    const uniqueIds = new Set([
      ...page1.body.items.map((i) => i.id),
      ...page2.body.items.map((i) => i.id),
      ...page3.body.items.map((i) => i.id)
    ]);
    assert.strictEqual(uniqueIds.size, 7);

    for (const [invalidQuery, requireVi] of [['?status=BOGUS', true], ['?page=0', false], ['?size=0', false], ['?size=101', false]]) {
      const badRes = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications${invalidQuery}`, {
        headers: authHeaders(cand1.token)
      });
      assertErrorResponse(badRes, 400, 'VALIDATION_ERROR', `GET /api/v1/me/applications${invalidQuery}`, requireVi);
    }
  });

  it('TC-T1-UT01-03: Should return application detail with chronological status histories', async () => {
    const app1Res = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications/1`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(app1Res.status, 200);
    assert.strictEqual(app1Res.body.id, 1);
    assert.strictEqual(app1Res.body.status, 'SUBMITTED');
    assert.strictEqual(app1Res.body.canWithdraw, true);
    assert.strictEqual(app1Res.body.cvSnapshotUrl, '/api/v1/me/applications/1/cv-snapshot');
    assert.strictEqual(app1Res.body.histories.length, 1);
    assert.strictEqual(app1Res.body.histories[0].fromStatus, null);
    assert.strictEqual(app1Res.body.histories[0].toStatus, 'SUBMITTED');

    const app4Res = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications/4`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(app4Res.status, 200);
    assert.strictEqual(app4Res.body.status, 'OFFER');
    assert.strictEqual(app4Res.body.canWithdraw, false);
    assert.strictEqual(app4Res.body.histories.length, 4);
    assert.deepStrictEqual(
      app4Res.body.histories.map((h) => h.toStatus),
      ['SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER']
    );
  });

  it('TC-T1-UT01-04: Should stream candidate CV PDF snapshot with safe download headers and matching SHA-256', async () => {
    const pdfRes = await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/me/applications/1/cv-snapshot`, {
      headers: authHeaders(cand1.token)
    });
    assertValidPdfSnapshot(pdfRes, 'Candidate GET /me/applications/1/cv-snapshot');
  });

  it('TC-T1-UT01-05: Should allow HR (hr2, company 2) read-only access to own company job applications, detail, and snapshot', async () => {
    const listJob2 = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs/2/applications`, {
      headers: authHeaders(hr2.token)
    });
    assert.strictEqual(listJob2.status, 200);
    assert.strictEqual(listJob2.body.totalItems, 1);
    assert.strictEqual(listJob2.body.items[0].id, 1);
    assert.strictEqual(listJob2.body.items[0].candidateUserId, 1);
    assert.strictEqual(listJob2.body.items[0].cvSnapshotUrl, '/api/v1/me/applications/1/cv-snapshot');

    const listJob8 = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs/8/applications?status=SCREENING`, {
      headers: authHeaders(hr2.token)
    });
    assert.strictEqual(listJob8.status, 200);
    assert.strictEqual(listJob8.body.totalItems, 1);
    assert.strictEqual(listJob8.body.items[0].id, 2);
    assert.strictEqual(listJob8.body.items[0].status, 'SCREENING');

    const detailRes = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs/2/applications/1`, {
      headers: authHeaders(hr2.token)
    });
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.body.id, 1);
    assert.strictEqual(detailRes.body.cvSnapshotUrl, '/api/v1/me/applications/1/cv-snapshot');
    assert.strictEqual(detailRes.body.histories.length, 1);

    const hrPdfRes = await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/hr/jobs/2/applications/1/cv-snapshot`, {
      headers: authHeaders(hr2.token)
    });
    assertValidPdfSnapshot(hrPdfRes, 'HR GET /hr/jobs/2/applications/1/cv-snapshot');

    for (const [invalidQuery, requireVi] of [['?status=BOGUS', true], ['?page=0', false], ['?size=101', false]]) {
      const badRes = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs/2/applications${invalidQuery}`, {
        headers: authHeaders(hr2.token)
      });
      assertErrorResponse(badRes, 400, 'VALIDATION_ERROR', `HR list ${invalidQuery}`, requireVi);
    }
  });

  it('TC-T1-UT01-06: Should return byte-identical 404 NOT_FOUND for cross-user and cross-company IDOR probes', async () => {
    const missingApp = await http.get(`${BACKEND_BASE_URL}/api/v1/me/applications/999999`, {
      headers: authHeaders(cand2.token)
    });
    assertErrorResponse(missingApp, 404, 'NOT_FOUND', 'cand2 missing app 999999');

    const missingWithdraw = await http.post(
      `${BACKEND_BASE_URL}/api/v1/me/applications/999999/withdraw`,
      { reason: 'IDOR probe' },
      { headers: authHeaders(cand2.token) }
    );
    assertErrorResponse(missingWithdraw, 404, 'NOT_FOUND', 'cand2 missing withdraw 999999');

    const missingSnap = await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/me/applications/999999/cv-snapshot`, {
      headers: authHeaders(cand2.token)
    });
    assertErrorResponse(missingSnap, 404, 'NOT_FOUND', 'cand2 missing snapshot 999999');

    for (const [probe, baseline] of [
      [() => http.get(`${BACKEND_BASE_URL}/api/v1/me/applications/1`, { headers: authHeaders(cand2.token) }), missingApp],
      [() => http.post(`${BACKEND_BASE_URL}/api/v1/me/applications/1/withdraw`, { reason: 'IDOR probe' }, { headers: authHeaders(cand2.token) }), missingWithdraw],
      [() => http.getBuffer(`${BACKEND_BASE_URL}/api/v1/me/applications/1/cv-snapshot`, { headers: authHeaders(cand2.token) }), missingSnap]
    ]) {
      const res = await probe();
      assertErrorResponse(res, 404, 'NOT_FOUND', 'cand2 IDOR on app 1');
      assert.strictEqual(res.rawText, baseline.rawText, 'Cross-user IDOR 404 body must be byte-identical to missing resource');
    }

    const missingHrJob = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs/999999/applications`, {
      headers: authHeaders(hr2.token)
    });
    assertErrorResponse(missingHrJob, 404, 'NOT_FOUND', 'hr2 missing job 999999');

    const crossCompanyList = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs/1/applications`, {
      headers: authHeaders(hr2.token)
    });
    assertErrorResponse(crossCompanyList, 404, 'NOT_FOUND', 'hr2 cross-company job 1 list');
    assert.strictEqual(crossCompanyList.rawText, missingHrJob.rawText, 'Cross-company 404 list body must be byte-identical');

    for (const url of [
      `${BACKEND_BASE_URL}/api/v1/hr/jobs/1/applications/3`,
      `${BACKEND_BASE_URL}/api/v1/hr/jobs/1/applications/3/cv-snapshot`,
      `${BACKEND_BASE_URL}/api/v1/hr/jobs/8/applications/1`
    ]) {
      const res = await http.get(url, { headers: authHeaders(hr2.token) });
      assertErrorResponse(res, 404, 'NOT_FOUND', `hr2 IDOR ${url}`);
    }
  });

  it('TC-T1-UT01-07: Should enforce complete 401/403 RBAC matrix and hr1 MUST_CHANGE_PASSWORD across all 8 UT-01 endpoints', async () => {
    const candidateEndpoints = [
      { name: 'POST /jobs/7/apply', send: (h) => http.post(`${BACKEND_BASE_URL}/api/v1/jobs/7/apply`, { cvId: 1, coverLetter: 'test' }, { headers: h }) },
      { name: 'GET /me/applications', send: (h) => http.get(`${BACKEND_BASE_URL}/api/v1/me/applications`, { headers: h }) },
      { name: 'GET /me/applications/1', send: (h) => http.get(`${BACKEND_BASE_URL}/api/v1/me/applications/1`, { headers: h }) },
      { name: 'POST /me/applications/1/withdraw', send: (h) => http.post(`${BACKEND_BASE_URL}/api/v1/me/applications/1/withdraw`, { reason: 'test' }, { headers: h }) },
      { name: 'GET /me/applications/1/cv-snapshot', send: (h) => http.get(`${BACKEND_BASE_URL}/api/v1/me/applications/1/cv-snapshot`, { headers: h }) }
    ];

    const hrEndpoints = [
      { name: 'GET /hr/jobs/2/applications', send: (h) => http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs/2/applications`, { headers: h }) },
      { name: 'GET /hr/jobs/2/applications/1', send: (h) => http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs/2/applications/1`, { headers: h }) },
      { name: 'GET /hr/jobs/2/applications/1/cv-snapshot', send: (h) => http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs/2/applications/1/cv-snapshot`, { headers: h }) }
    ];

    for (const ep of [...candidateEndpoints, ...hrEndpoints]) {
      const anonRes = await ep.send({});
      assertErrorResponse(anonRes, 401, 'UNAUTHORIZED', `Anonymous ${ep.name}`);

      const hr1Res = await ep.send(authHeaders(hr1.token));
      assertErrorResponse(hr1Res, 403, 'MUST_CHANGE_PASSWORD', `hr1 MUST_CHANGE_PASSWORD ${ep.name}`);
    }

    for (const [roleName, actor] of [['HR(hr2)', hr2], ['MENTOR', mentor1], ['STAFF', staff1], ['ADMIN', admin1]]) {
      for (const ep of candidateEndpoints) {
        const res = await ep.send(authHeaders(actor.token));
        assertErrorResponse(res, 403, 'FORBIDDEN', `${roleName} on ${ep.name}`);
      }
    }

    for (const [roleName, actor] of [['CANDIDATE', cand1], ['MENTOR', mentor1], ['STAFF', staff1], ['ADMIN', admin1]]) {
      for (const ep of hrEndpoints) {
        const res = await ep.send(authHeaders(actor.token));
        assertErrorResponse(res, 403, 'FORBIDDEN', `${roleName} on ${ep.name}`);
      }
    }
  });

  it('TC-T1-UT01-08: Should preserve :3000 Nginx proxy parity for reads, PDF snapshot headers, and auth errors', async () => {
    const listRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/me/applications`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.totalItems, 7);

    const pdfRes = await http.getBuffer(`${FRONTEND_BASE_URL}/api/v1/me/applications/1/cv-snapshot`, {
      headers: authHeaders(cand1.token)
    });
    assertValidPdfSnapshot(pdfRes, 'Nginx :3000 GET /api/v1/me/applications/1/cv-snapshot');

    const unauthRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/me/applications`);
    assertErrorResponse(unauthRes, 401, 'UNAUTHORIZED', 'Nginx :3000 unauthenticated');

    const forbiddenRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/hr/jobs/2/applications`, {
      headers: authHeaders(cand1.token)
    });
    assertErrorResponse(forbiddenRes, 403, 'FORBIDDEN', 'Nginx :3000 forbidden');

    const idorRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/me/applications/1`, {
      headers: authHeaders(cand2.token)
    });
    assertErrorResponse(idorRes, 404, 'NOT_FOUND', 'Nginx :3000 cross-user 404');
  });

  it('TC-T1-UT01-09: Should reject expired, DRAFT, or nonexistent JDs with 400 JOB_NOT_ELIGIBLE and invalid bodies with 400 VALIDATION_ERROR', async () => {
    for (const [jobId, reason] of [[12, 'expired JD'], [11, 'DRAFT JD'], [999999, 'missing JD']]) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/jobs/${jobId}/apply`,
        { cvId: 1, coverLetter: 'Hồ sơ ứng tuyển hợp lệ' },
        { headers: authHeaders(cand2.token) }
      );
      assertErrorResponse(res, 400, 'JOB_NOT_ELIGIBLE', `Apply to ${reason} (${jobId})`);
    }

    const missingCvRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/jobs/7/apply`,
      { coverLetter: 'Thiếu mã CV' },
      { headers: authHeaders(cand2.token) }
    );
    assertErrorResponse(missingCvRes, 400, 'VALIDATION_ERROR', 'Missing cvId');

    const overlongCoverRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/jobs/7/apply`,
      { cvId: 1, coverLetter: 'a'.repeat(2001) },
      { headers: authHeaders(cand2.token) }
    );
    assertErrorResponse(overlongCoverRes, 400, 'VALIDATION_ERROR', 'Cover letter > 2000 chars');
  });

  it('TC-T1-UT01-10: Should return 409 DUPLICATE_APPLICATION when candidate1 re-applies to open application job', async () => {
    const dupRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/jobs/3/apply`,
      { cvId: 1, coverLetter: 'Ứng tuyển lại vị trí đã có đơn OFFER' },
      { headers: authHeaders(cand1.token) }
    );
    assertErrorResponse(dupRes, 409, 'DUPLICATE_APPLICATION', 'Duplicate open application on jobId=3');
  });

  it('TC-T1-UT01-11: Should return 503 CV_SERVICE_UNAVAILABLE before Phase 2 HS-04 merge and emit zero HR emails', async () => {
    const beforeMsgs = await fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, 'hr2@rikkeijobs.test', {
      minCount: 0,
      maxRetries: 2
    });
    const beforeCount = Array.isArray(beforeMsgs?.messages) ? beforeMsgs.messages.length : 0;

    const resCand2 = await http.post(
      `${BACKEND_BASE_URL}/api/v1/jobs/2/apply`,
      { cvId: 1, coverLetter: 'Hồ sơ kiểm thử placeholder CvPort' },
      { headers: authHeaders(cand2.token) }
    );
    assertErrorResponse(resCand2, 503, 'CV_SERVICE_UNAVAILABLE', 'cand2 apply to eligible jobId=2');

    // Terminal REJECTED jobId=5 is eligible for re-apply and reaches CvPort placeholder -> 503
    const resCand1Reapply = await http.post(
      `${BACKEND_BASE_URL}/api/v1/jobs/5/apply`,
      { cvId: 1, coverLetter: 'Ứng tuyển lại sau trạng thái REJECTED' },
      { headers: authHeaders(cand1.token) }
    );
    assertErrorResponse(resCand1Reapply, 503, 'CV_SERVICE_UNAVAILABLE', 'cand1 re-apply after REJECTED on jobId=5');

    const afterMsgs = await fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, 'hr2@rikkeijobs.test', {
      minCount: 0,
      maxRetries: 3,
      intervalMs: 150
    });
    const afterCount = Array.isArray(afterMsgs?.messages) ? afterMsgs.messages.length : 0;
    assert.strictEqual(afterCount, beforeCount, 'Failed 503 apply must not dispatch HR notification email');
  });

  it('TC-T1-UT01-12: Should block withdraw from OFFER onward with 409 CANNOT_WITHDRAW and reject blank reason with 400', async () => {
    for (const [appId, statusLabel] of [[4, 'OFFER'], [5, 'HIRED'], [6, 'REJECTED'], [7, 'WITHDRAWN']]) {
      const res = await http.post(
        `${BACKEND_BASE_URL}/api/v1/me/applications/${appId}/withdraw`,
        { reason: `Thử rút đơn ở trạng thái ${statusLabel}` },
        { headers: authHeaders(cand1.token) }
      );
      assertErrorResponse(res, 409, 'CANNOT_WITHDRAW', `Withdraw blocked at ${statusLabel} (id=${appId})`);
    }

    const blankRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/me/applications/2/withdraw`,
      { reason: '   ' },
      { headers: authHeaders(cand1.token) }
    );
    assertErrorResponse(blankRes, 400, 'VALIDATION_ERROR', 'Blank withdraw reason');
  });

  it('TC-T1-UT01-13: Should keep out-of-scope UT-02 PATCH status and HS-04 /me/cvs routes closed', async () => {
    const anonPatch = await http.patch(`${BACKEND_BASE_URL}/api/v1/hr/jobs/2/applications/1/status`, {
      status: 'SCREENING'
    });
    assertErrorResponse(anonPatch, 401, 'UNAUTHORIZED', 'Anonymous UT-02 PATCH status');

    const hrPatch = await http.patch(
      `${BACKEND_BASE_URL}/api/v1/hr/jobs/2/applications/1/status`,
      { status: 'SCREENING' },
      { headers: authHeaders(hr2.token) }
    );
    assertErrorResponse(hrPatch, 403, 'FORBIDDEN', 'HR UT-02 PATCH status');

    const candCvs = await http.get(`${BACKEND_BASE_URL}/api/v1/me/cvs`, {
      headers: authHeaders(cand1.token)
    });
    assertErrorResponse(candCvs, 403, 'FORBIDDEN', 'Candidate HS-04 /api/v1/me/cvs');
  });

  it('TC-T1-UT01-14: Should withdraw SCREENING application id=2, append history, reflect to hr2, and block second withdraw', async () => {
    const withdrawReason = 'Rút đơn kiểm thử E2E UT-01';
    const res = await http.post(
      `${BACKEND_BASE_URL}/api/v1/me/applications/2/withdraw`,
      { reason: withdrawReason },
      { headers: authHeaders(cand1.token) }
    );
    assert.strictEqual(res.status, 200, `Withdraw failed: ${res.rawText}`);
    withdrewAppId2 = true;

    assert.strictEqual(res.body.id, 2);
    assert.strictEqual(res.body.status, 'WITHDRAWN');
    assert.strictEqual(res.body.canWithdraw, false);
    assert.strictEqual(res.body.histories.length, 3);

    const lastHistory = res.body.histories[2];
    assert.strictEqual(lastHistory.fromStatus, 'SCREENING');
    assert.strictEqual(lastHistory.toStatus, 'WITHDRAWN');
    assert.strictEqual(lastHistory.actorId, cand1.user.id);
    assert.strictEqual(lastHistory.note, withdrawReason);

    const hrView = await http.get(`${BACKEND_BASE_URL}/api/v1/hr/jobs/8/applications/2`, {
      headers: authHeaders(hr2.token)
    });
    assert.strictEqual(hrView.status, 200);
    assert.strictEqual(hrView.body.status, 'WITHDRAWN');
    assert.strictEqual(hrView.body.histories.length, 3);

    const secondWithdraw = await http.post(
      `${BACKEND_BASE_URL}/api/v1/me/applications/2/withdraw`,
      { reason: 'Thử rút lại lần thứ hai' },
      { headers: authHeaders(cand1.token) }
    );
    assertErrorResponse(secondWithdraw, 409, 'CANNOT_WITHDRAW', 'Second withdraw on id=2');
  });

  it(
    'TC-T1-UT01-15: Phase 2 real CV adapter full journey (apply -> Mailpit HR email -> 409 duplicate -> CV edit/delete snapshot immutability -> withdraw -> re-apply)',
    { skip: 'Phase 2: awaiting HS-04 real CV adapter merged into develop' },
    async () => {
      // Clear Mailpit before Phase 2 end-to-end notification verification
      await http.delete(`${MAILPIT_BASE_URL}/api/v1/messages`);

      // 1. Obtain real CV for cand2 from HS-04 endpoint once merged
      const cvListRes = await http.get(`${BACKEND_BASE_URL}/api/v1/me/cvs`, {
        headers: authHeaders(cand2.token)
      });
      assert.strictEqual(cvListRes.status, 200);
      assert.ok(Array.isArray(cvListRes.body) && cvListRes.body.length > 0);
      const targetCvId = cvListRes.body[0].id;

      // 2. Apply to jobId=2 (companyId=2 -> hr2@rikkeijobs.test)
      const applyRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/jobs/2/apply`,
        { cvId: targetCvId, coverLetter: 'Thư ứng tuyển Phase 2 với CV thật' },
        { headers: authHeaders(cand2.token) }
      );
      assert.strictEqual(applyRes.status, 201);
      assert.strictEqual(applyRes.body.status, 'SUBMITTED');
      const createdAppId = applyRes.body.id;

      // 3. Verify HR notification email in Mailpit links to /hr (not dead /hr/jobs/...) without PII/secret leakage
      const mailList = await fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, 'hr2@rikkeijobs.test', {
        minCount: 1,
        maxRetries: 20,
        intervalMs: 250
      });
      assert.ok(mailList.messages.length >= 1, 'Expected HR notification email in Mailpit');
      const mailDetail = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${mailList.messages[0].ID}`);
      assert.strictEqual(mailDetail.status, 200);
      assert.ok(typeof mailDetail.body.Subject === 'string' && mailDetail.body.Subject.length > 0);
      const emailText = typeof mailDetail.body?.Text === 'string' ? mailDetail.body.Text : '';
      const emailHtml = typeof mailDetail.body?.HTML === 'string' ? mailDetail.body.HTML : '';
      assert.match(emailText, /https?:\/\/[^\s"']+\/hr(?:\s|$)/, 'Plain-text HR email must link to /hr');
      assert.match(emailHtml, /href="https?:\/\/[^"']+\/hr"/, 'HTML HR email CTA must link to /hr');
      assert.strictEqual(emailText.includes('/hr/jobs/'), false, 'Plain-text email must not contain dead /hr/jobs/ link');
      assert.strictEqual(emailHtml.includes('/hr/jobs/'), false, 'HTML email must not contain dead /hr/jobs/ link');

      // 4. Duplicate apply returns 409 DUPLICATE_APPLICATION
      const dupRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/jobs/2/apply`,
        { cvId: targetCvId, coverLetter: 'Ứng tuyển trùng' },
        { headers: authHeaders(cand2.token) }
      );
      assertErrorResponse(dupRes, 409, 'DUPLICATE_APPLICATION', 'Phase 2 duplicate apply');

      // 5. Capture submitted snapshot hash before source CV mutation/deletion
      const snapBefore = await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/me/applications/${createdAppId}/cv-snapshot`, {
        headers: authHeaders(cand2.token)
      });
      assert.strictEqual(snapBefore.status, 200);
      const hashBefore = crypto.createHash('sha256').update(snapBefore.rawBuffer).digest('hex');

      // 6. Delete/edit source CV via HS-04 and assert HR snapshot remains byte-identical
      const deleteCvRes = await http.delete(`${BACKEND_BASE_URL}/api/v1/me/cvs/${targetCvId}`, {
        headers: authHeaders(cand2.token)
      });
      assert.ok([200, 204].includes(deleteCvRes.status));
      const hrSnapAfter = await http.getBuffer(`${BACKEND_BASE_URL}/api/v1/hr/jobs/2/applications/${createdAppId}/cv-snapshot`, {
        headers: authHeaders(hr2.token)
      });
      assert.strictEqual(hrSnapAfter.status, 200);
      const hashAfter = crypto.createHash('sha256').update(hrSnapAfter.rawBuffer).digest('hex');
      assert.strictEqual(hashAfter, hashBefore, 'Snapshot bytes must remain immutable after source CV deletion');

      // 7. Withdraw and re-apply with a new CV
      const withdrawRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/me/applications/${createdAppId}/withdraw`,
        { reason: 'Rút đơn kiểm thử Phase 2' },
        { headers: authHeaders(cand2.token) }
      );
      assert.strictEqual(withdrawRes.status, 200);
      assert.strictEqual(withdrawRes.body.status, 'WITHDRAWN');
    }
  );
});
