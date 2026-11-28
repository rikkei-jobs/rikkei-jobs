// Tier 2: Boundaries & Security — NT-02 5-Role RBAC Matrix (Opaque-Box)
// Verifies declarative route policies and ownership guards across CANDIDATE, HR, MENTOR, STAFF, ADMIN, and Anonymous
// via HTTP/Nginx/Mock/Mailpit only (never mutates hr1 password so must_change_password remains true)
// Also verifies 401/403 RBAC matrix and Nginx :3000 parity across all 5 NT-05 D10 data-sync endpoints (TC-T2-RBAC-14)

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { BACKEND_BASE_URL, FRONTEND_BASE_URL, MAILPIT_BASE_URL, MOCK_BASE_URL, SERVICE_KEY, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';
import {
  DEV_SEED_PASSWORD,
  VIETNAMESE_DIACRITIC_REGEX,
  EMOJI_REGEX,
  authHeaders,
  loginUser,
  assertUnifiedErrorResponse,
  provisionCompanyAndHr
} from '../helpers/company-fixtures.mjs';

async function loginCandidateViaMockSso(lmsUserId) {
  const ticketRes = await http.post(
    `${MOCK_BASE_URL}/lms/sso/tickets`,
    { lmsUserId },
    { headers: { 'X-Service-Key': SERVICE_KEY } }
  );
  assert.strictEqual(ticketRes.status, 201, `Mock SSO ticket failed for ${lmsUserId}: ${ticketRes.status}`);
  assert.ok(ticketRes.body?.ticket, 'Mock SSO response must include ticket');

  const ssoRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket: ticketRes.body.ticket });
  assert.strictEqual(ssoRes.status, 200, `Backend SSO login failed for ${lmsUserId}: ${ssoRes.status}`);
  assert.ok(ssoRes.body?.accessToken, `Missing SSO accessToken for ${lmsUserId}`);
  return {
    token: ssoRes.body.accessToken,
    mustChangePassword: Boolean(ssoRes.body.mustChangePassword),
    user: ssoRes.body.user
  };
}

function assertErrorStatusAndCode(res, expectedStatus, expectedCode, label) {
  assert.strictEqual(res.status, expectedStatus, `${label}: expected ${expectedStatus}, got ${res.status} (${res.rawText})`);
  assertUnifiedErrorResponse(res);
  assert.strictEqual(res.body.code, expectedCode, `${label}: expected code ${expectedCode}, got ${res.body.code}`);
  assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(res.body.message), `${label}: expected Vietnamese diacritics in message`);
  assert.strictEqual(EMOJI_REGEX.test(res.body.message), false, `${label}: message must contain zero emoji`);
}

describe('Tier 2: NT-02 5-Role RBAC Matrix & Ownership Boundaries', () => {
  let backendOnline = false;
  let frontendOnline = false;
  let mockOnline = false;
  let mailpitOnline = false;

  let cand1 = null;
  let cand2 = null;
  let hr1 = null;
  let hr2 = null;
  let mentor1 = null;
  let staff1 = null;
  let admin1 = null;
  let ephemeralHr = null;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    frontendOnline = await isReachable(FRONTEND_BASE_URL);
    mockOnline = await isReachable(`${MOCK_BASE_URL}/mock/requests`);
    mailpitOnline = await isReachable(MAILPIT_BASE_URL);

    if (backendOnline && mockOnline && mailpitOnline) {
      cand1 = await loginCandidateViaMockSso('lms-sv-001');
      cand2 = await loginCandidateViaMockSso('lms-sv-002');
      // Never change hr1's password: must_change_password=true is required for MUST_CHANGE_PASSWORD & DN-01 audits
      hr1 = await loginUser(BACKEND_BASE_URL, 'hr1@rikkeijobs.test', DEV_SEED_PASSWORD);
      hr2 = await loginUser(BACKEND_BASE_URL, 'hr2@rikkeijobs.test', DEV_SEED_PASSWORD);
      mentor1 = await loginUser(BACKEND_BASE_URL, 'mentor1@rikkeijobs.test', DEV_SEED_PASSWORD);
      staff1 = await loginUser(BACKEND_BASE_URL, 'staff1@rikkeijobs.test', DEV_SEED_PASSWORD);
      admin1 = await loginUser(BACKEND_BASE_URL, 'admin1@rikkeijobs.test', DEV_SEED_PASSWORD);

      assert.strictEqual(hr1.mustChangePassword, true, 'Seeded hr1 must remain in mustChangePassword=true state');
      assert.strictEqual(hr2.mustChangePassword, false, 'Seeded hr2 must be active');

      ephemeralHr = await provisionCompanyAndHr(BACKEND_BASE_URL, MAILPIT_BASE_URL, staff1.token, {
        activateHr: true
      });
    }
  });

  it('TC-T2-RBAC-01: Should return 401 UNAUTHORIZED for anonymous callers across all protected NT-02 endpoints', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const anonymousCalls = [
      ['GET /companies/1', await http.get(`${BACKEND_BASE_URL}/api/v1/companies/1`)],
      ['PUT /companies/1', await http.put(`${BACKEND_BASE_URL}/api/v1/companies/1`, { name: 'Anon' })],
      ['GET /companies/me', await http.get(`${BACKEND_BASE_URL}/api/v1/companies/me`)],
      ['GET /profiles/me/skills', await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`)],
      ['POST /profiles/me/skills/recompute', await http.post(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills/recompute`, {})],
      ['GET /profiles/1/skills', await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/1/skills`)],
      ['GET /profiles/1/evaluations', await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/1/evaluations`)],
      ['GET /me/target', await http.get(`${BACKEND_BASE_URL}/api/v1/me/target`)],
      ['PUT /me/target', await http.put(`${BACKEND_BASE_URL}/api/v1/me/target`, { positionId: 1 })],
      ['GET /me/gap-analysis', await http.get(`${BACKEND_BASE_URL}/api/v1/me/gap-analysis`)],
      ['GET /me/job-recommendations', await http.get(`${BACKEND_BASE_URL}/api/v1/me/job-recommendations`)],
      ['GET /target-positions', await http.get(`${BACKEND_BASE_URL}/api/v1/target-positions`)],
      ['GET /jobs/1', await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/1`)],
      ['GET /evaluation-templates', await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates`)],
      ['POST /evaluations', await http.post(`${BACKEND_BASE_URL}/api/v1/evaluations`, {
        templateId: 1,
        userId: 1,
        context: 'INTERNSHIP',
        scores: []
      })],
      ['PUT /evaluations/1', await http.put(`${BACKEND_BASE_URL}/api/v1/evaluations/1`, {
        overallComment: 'Anon probe',
        scores: []
      })],
      ['POST /evaluations/1/submit', await http.post(`${BACKEND_BASE_URL}/api/v1/evaluations/1/submit`, {})],
      ['POST /staff/companies', await http.post(`${BACKEND_BASE_URL}/api/v1/staff/companies`, { name: 'Anon', taxCode: '0123456789' })]
    ];

    for (const [label, res] of anonymousCalls) {
      assertErrorStatusAndCode(res, 401, 'UNAUTHORIZED', label);
    }
  });

  it('TC-T2-RBAC-02: Should enforce 5-role RBAC & byte-identical 404 anti-IDOR on GET /api/v1/companies/{id}', async () => {
    assert.ok(backendOnline && mockOnline && mailpitOnline, 'All services must be reachable');

    const dynamicCompanyId = ephemeralHr.company.id;

    // hr2 (company 2): own 200, other (1, dynamic) and missing (999999) byte-identical 404
    const hr2Own = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/2`, { headers: authHeaders(hr2.token) });
    assert.strictEqual(hr2Own.status, 200);
    assert.strictEqual(hr2Own.body?.id, 2);

    const hr2Other1 = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/1`, { headers: authHeaders(hr2.token) });
    const hr2OtherDyn = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/${dynamicCompanyId}`, { headers: authHeaders(hr2.token) });
    const hr2Missing = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/999999`, { headers: authHeaders(hr2.token) });
    for (const [label, res] of [['hr2->1', hr2Other1], ['hr2->dyn', hr2OtherDyn], ['hr2->999999', hr2Missing]]) {
      assertErrorStatusAndCode(res, 404, 'NOT_FOUND', label);
    }
    assert.strictEqual(hr2Other1.rawText, hr2Missing.rawText, 'hr2 cross-company 404 must be byte-identical to missing id');
    assert.strictEqual(hr2OtherDyn.rawText, hr2Missing.rawText, 'hr2 cross-company dynamic 404 must be byte-identical to missing id');

    // Dynamic active HR: own 200, seeded 1 & 2 & 999999 byte-identical 404
    const dynOwn = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/${dynamicCompanyId}`, {
      headers: authHeaders(ephemeralHr.hrToken)
    });
    assert.strictEqual(dynOwn.status, 200);
    assert.strictEqual(dynOwn.body?.id, dynamicCompanyId);

    const dynOther1 = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/1`, { headers: authHeaders(ephemeralHr.hrToken) });
    const dynOther2 = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/2`, { headers: authHeaders(ephemeralHr.hrToken) });
    const dynMissing = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/999999`, { headers: authHeaders(ephemeralHr.hrToken) });
    for (const [label, res] of [['dyn->1', dynOther1], ['dyn->2', dynOther2], ['dyn->999999', dynMissing]]) {
      assertErrorStatusAndCode(res, 404, 'NOT_FOUND', label);
    }
    assert.strictEqual(dynOther1.rawText, dynMissing.rawText);
    assert.strictEqual(dynOther2.rawText, dynMissing.rawText);

    // STAFF: can read any existing company, 404 on missing 999999
    for (const validId of [1, 2, dynamicCompanyId]) {
      const staffRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/${validId}`, {
        headers: authHeaders(staff1.token)
      });
      assert.strictEqual(staffRes.status, 200, `STAFF must read company ${validId}, got ${staffRes.status}`);
      assert.strictEqual(staffRes.body?.id, validId);
    }
    const staffMissing = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/999999`, {
      headers: authHeaders(staff1.token)
    });
    assertErrorStatusAndCode(staffMissing, 404, 'NOT_FOUND', 'staff->999999');

    // CANDIDATE, MENTOR, ADMIN -> 403 FORBIDDEN
    for (const [roleName, actor] of [['CANDIDATE', cand1], ['MENTOR', mentor1], ['ADMIN', admin1]]) {
      for (const companyId of [1, 2]) {
        const res = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/${companyId}`, {
          headers: authHeaders(actor.token)
        });
        assertErrorStatusAndCode(res, 403, 'FORBIDDEN', `${roleName} GET /companies/${companyId}`);
      }
    }

    // hr1 (mustChangePassword=true) -> 403 MUST_CHANGE_PASSWORD
    const hr1Res = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/1`, { headers: authHeaders(hr1.token) });
    assertErrorStatusAndCode(hr1Res, 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /companies/1');
  });

  it('TC-T2-RBAC-03: Should return uniform 405 METHOD_NOT_ALLOWED on PUT /api/v1/companies/{id} without DB mutation or ID leakage', async () => {
    assert.ok(backendOnline && mockOnline && mailpitOnline, 'All services must be reachable');

    const beforeCo2 = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/2`, { headers: authHeaders(hr2.token) });
    assert.strictEqual(beforeCo2.status, 200);

    // hr2 on own (2), other (1), missing (999999) -> identical 405 METHOD_NOT_ALLOWED
    const hr2OwnPut = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/2`, { name: 'Mutated Co 2' }, { headers: authHeaders(hr2.token) });
    const hr2OtherPut = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/1`, { name: 'Mutated Co 1' }, { headers: authHeaders(hr2.token) });
    const hr2MissingPut = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/999999`, { name: 'Mutated 999999' }, { headers: authHeaders(hr2.token) });
    for (const [label, res] of [['hr2 PUT 2', hr2OwnPut], ['hr2 PUT 1', hr2OtherPut], ['hr2 PUT 999999', hr2MissingPut]]) {
      assertErrorStatusAndCode(res, 405, 'METHOD_NOT_ALLOWED', label);
    }
    assert.strictEqual(hr2OwnPut.rawText, hr2OtherPut.rawText);
    assert.strictEqual(hr2MissingPut.rawText, hr2OtherPut.rawText);
    assert.deepStrictEqual(hr2OwnPut.body, hr2OtherPut.body);
    assert.deepStrictEqual(hr2MissingPut.body, hr2OtherPut.body);

    // STAFF on 1, 2, 999999 -> identical 405 METHOD_NOT_ALLOWED
    const staffPut1 = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/1`, { name: 'Staff Put 1' }, { headers: authHeaders(staff1.token) });
    const staffPut2 = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/2`, { name: 'Staff Put 2' }, { headers: authHeaders(staff1.token) });
    const staffPutMissing = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/999999`, { name: 'Staff Put 999999' }, { headers: authHeaders(staff1.token) });
    for (const [label, res] of [['staff PUT 1', staffPut1], ['staff PUT 2', staffPut2], ['staff PUT 999999', staffPutMissing]]) {
      assertErrorStatusAndCode(res, 405, 'METHOD_NOT_ALLOWED', label);
    }
    assert.strictEqual(staffPut1.rawText, staffPutMissing.rawText);
    assert.strictEqual(staffPut2.rawText, staffPutMissing.rawText);

    // CANDIDATE, MENTOR, ADMIN -> 403 FORBIDDEN; hr1 -> 403 MUST_CHANGE_PASSWORD; anonymous -> 401 UNAUTHORIZED
    for (const [roleName, actor] of [['CANDIDATE', cand1], ['MENTOR', mentor1], ['ADMIN', admin1]]) {
      const res = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/1`, { name: 'Forbidden' }, { headers: authHeaders(actor.token) });
      assertErrorStatusAndCode(res, 403, 'FORBIDDEN', `${roleName} PUT /companies/1`);
    }
    const hr1Put = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/1`, { name: 'Blocked' }, { headers: authHeaders(hr1.token) });
    assertErrorStatusAndCode(hr1Put, 403, 'MUST_CHANGE_PASSWORD', 'hr1 PUT /companies/1');

    const anonPut = await http.put(`${BACKEND_BASE_URL}/api/v1/companies/2`, { name: 'Anon' });
    assertErrorStatusAndCode(anonPut, 401, 'UNAUTHORIZED', 'anon PUT /companies/2');

    // Verify Company 2 unchanged
    const afterCo2 = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/2`, { headers: authHeaders(hr2.token) });
    assert.strictEqual(afterCo2.status, 200);
    assert.strictEqual(afterCo2.body?.name, beforeCo2.body?.name);
    assert.strictEqual(afterCo2.body?.version, beforeCo2.body?.version);
  });

  it('TC-T2-RBAC-04: Should lock all 5 /me self-service endpoints to CANDIDATE only (403 FORBIDDEN for HR/MENTOR/STAFF/ADMIN, 403 MUST_CHANGE_PASSWORD for hr1)', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and Mock must be reachable');

    // Discover valid target position ID dynamically
    const positionsRes = await http.get(`${BACKEND_BASE_URL}/api/v1/target-positions`, { headers: authHeaders(cand1.token) });
    assert.strictEqual(positionsRes.status, 200);
    assert.ok(Array.isArray(positionsRes.body) && positionsRes.body.length >= 4, 'Expected seeded target positions');
    const targetPositionId = positionsRes.body[0].id;

    // CANDIDATE succeeds on all 5 /me endpoints
    const candHeaders = authHeaders(cand1.token);
    const getSkills = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, { headers: candHeaders });
    assert.strictEqual(getSkills.status, 200);
    assert.ok(Array.isArray(getSkills.body));

    const recomputeSkills = await http.post(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills/recompute`, {}, { headers: candHeaders });
    assert.strictEqual(recomputeSkills.status, 200);
    assert.ok(Array.isArray(recomputeSkills.body));

    const putTarget = await http.put(`${BACKEND_BASE_URL}/api/v1/me/target`, { positionId: targetPositionId }, { headers: candHeaders });
    assert.strictEqual(putTarget.status, 200);
    assert.strictEqual(putTarget.body?.type, 'POSITION');
    assert.strictEqual(putTarget.body?.id, targetPositionId);

    const getTarget = await http.get(`${BACKEND_BASE_URL}/api/v1/me/target`, { headers: candHeaders });
    assert.strictEqual(getTarget.status, 200);
    assert.strictEqual(getTarget.body?.type, 'POSITION');
    assert.strictEqual(getTarget.body?.id, targetPositionId);

    const getGap = await http.get(`${BACKEND_BASE_URL}/api/v1/me/gap-analysis`, { headers: candHeaders });
    assert.strictEqual(getGap.status, 200);
    assert.strictEqual(typeof getGap.body?.readiness, 'number');
    assert.ok(getGap.body?.target && Array.isArray(getGap.body?.items));

    const getGapByJob = await http.get(`${BACKEND_BASE_URL}/api/v1/me/gap-analysis?jobId=1`, { headers: candHeaders });
    assert.strictEqual(getGapByJob.status, 200);
    assert.ok(Array.isArray(getGapByJob.body?.items));

    // HR (hr2), MENTOR, STAFF, ADMIN receive 403 FORBIDDEN on all 5 /me endpoints
    for (const [roleName, actor] of [['HR', hr2], ['MENTOR', mentor1], ['STAFF', staff1], ['ADMIN', admin1]]) {
      const h = authHeaders(actor.token);
      assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, { headers: h }), 403, 'FORBIDDEN', `${roleName} GET /profiles/me/skills`);
      assertErrorStatusAndCode(await http.post(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills/recompute`, {}, { headers: h }), 403, 'FORBIDDEN', `${roleName} POST /profiles/me/skills/recompute`);
      assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/me/target`, { headers: h }), 403, 'FORBIDDEN', `${roleName} GET /me/target`);
      assertErrorStatusAndCode(await http.put(`${BACKEND_BASE_URL}/api/v1/me/target`, { positionId: targetPositionId }, { headers: h }), 403, 'FORBIDDEN', `${roleName} PUT /me/target`);
      assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/me/gap-analysis`, { headers: h }), 403, 'FORBIDDEN', `${roleName} GET /me/gap-analysis`);
    }

    // hr1 receives 403 MUST_CHANGE_PASSWORD on all 5 /me endpoints
    const hr1Headers = authHeaders(hr1.token);
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, { headers: hr1Headers }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /profiles/me/skills');
    assertErrorStatusAndCode(await http.post(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills/recompute`, {}, { headers: hr1Headers }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 POST /profiles/me/skills/recompute');
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/me/target`, { headers: hr1Headers }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /me/target');
    assertErrorStatusAndCode(await http.put(`${BACKEND_BASE_URL}/api/v1/me/target`, { positionId: targetPositionId }, { headers: hr1Headers }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 PUT /me/target');
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/me/gap-analysis`, { headers: hr1Headers }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /me/gap-analysis');
  });

  it('TC-T2-RBAC-05: Should enforce D6 Group C 5-role ownership matrix on GET /api/v1/profiles/{userId}/skills', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and Mock must be reachable');

    // cand1 (id=1): own 200; other candidate (2 even public, 3 private) and 999999 -> byte-identical 404
    const cand1Own = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand1.user.id}/skills`, { headers: authHeaders(cand1.token) });
    assert.strictEqual(cand1Own.status, 200);
    assert.ok(Array.isArray(cand1Own.body));

    const cand1PublicOther = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand2.user.id}/skills`, { headers: authHeaders(cand1.token) });
    const cand1PrivateOther = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/3/skills`, { headers: authHeaders(cand1.token) });
    const cand1Missing = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/999999/skills`, { headers: authHeaders(cand1.token) });
    for (const [label, res] of [['cand1->2', cand1PublicOther], ['cand1->3', cand1PrivateOther], ['cand1->999999', cand1Missing]]) {
      assertErrorStatusAndCode(res, 404, 'NOT_FOUND', label);
    }
    assert.strictEqual(cand1PublicOther.rawText, cand1Missing.rawText, 'Cross-candidate public profile 404 must be byte-identical to missing');
    assert.strictEqual(cand1PrivateOther.rawText, cand1Missing.rawText, 'Cross-candidate private profile 404 must be byte-identical to missing');

    // hr2: public cand2 (id=2) -> 200; private cand1 (1), private 3, hr2 own id, missing 999999 -> byte-identical 404
    const hr2Public = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand2.user.id}/skills`, { headers: authHeaders(hr2.token) });
    assert.strictEqual(hr2Public.status, 200);
    assert.ok(Array.isArray(hr2Public.body));

    const hr2Priv1 = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/1/skills`, { headers: authHeaders(hr2.token) });
    const hr2Priv3 = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/3/skills`, { headers: authHeaders(hr2.token) });
    const hr2Self = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${hr2.user.id}/skills`, { headers: authHeaders(hr2.token) });
    const hr2Missing = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/999999/skills`, { headers: authHeaders(hr2.token) });
    for (const [label, res] of [['hr2->1', hr2Priv1], ['hr2->3', hr2Priv3], ['hr2->self', hr2Self], ['hr2->999999', hr2Missing]]) {
      assertErrorStatusAndCode(res, 404, 'NOT_FOUND', label);
    }
    assert.strictEqual(hr2Priv1.rawText, hr2Missing.rawText);
    assert.strictEqual(hr2Priv3.rawText, hr2Missing.rawText);
    assert.strictEqual(hr2Self.rawText, hr2Missing.rawText);

    // MENTOR, STAFF, ADMIN -> 403 FORBIDDEN
    for (const [roleName, actor] of [['MENTOR', mentor1], ['STAFF', staff1], ['ADMIN', admin1]]) {
      for (const targetUserId of [1, cand2.user.id]) {
        const res = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${targetUserId}/skills`, {
          headers: authHeaders(actor.token)
        });
        assertErrorStatusAndCode(res, 403, 'FORBIDDEN', `${roleName} GET /profiles/${targetUserId}/skills`);
      }
    }

    // hr1 -> 403 MUST_CHANGE_PASSWORD
    const hr1Skills = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand2.user.id}/skills`, { headers: authHeaders(hr1.token) });
    assertErrorStatusAndCode(hr1Skills, 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /profiles/2/skills');
  });

  it('TC-T2-RBAC-06: Should enforce authenticated-any policy on /api/v1/target-positions and /api/v1/jobs/{jobId} across all 5 roles + 404 on DRAFT/EXPIRED/missing', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and Mock must be reachable');

    for (const [roleName, actor] of [
      ['CANDIDATE', cand1],
      ['HR', hr2],
      ['MENTOR', mentor1],
      ['STAFF', staff1],
      ['ADMIN', admin1]
    ]) {
      const h = authHeaders(actor.token);
      const posRes = await http.get(`${BACKEND_BASE_URL}/api/v1/target-positions`, { headers: h });
      assert.strictEqual(posRes.status, 200, `${roleName} GET /target-positions expected 200, got ${posRes.status}`);
      assert.ok(Array.isArray(posRes.body) && posRes.body.length >= 4, `${roleName} expected >= 4 target positions`);

      const approvedJob = await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/1`, { headers: h });
      assert.strictEqual(approvedJob.status, 200, `${roleName} GET /jobs/1 expected 200, got ${approvedJob.status}`);
      assert.strictEqual(approvedJob.body?.id, 1);

      const draftJob = await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/11`, { headers: h });
      const expiredJob = await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/12`, { headers: h });
      const missingJob = await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/999999`, { headers: h });
      for (const [label, res] of [
        [`${roleName} DRAFT /jobs/11`, draftJob],
        [`${roleName} EXPIRED /jobs/12`, expiredJob],
        [`${roleName} MISSING /jobs/999999`, missingJob]
      ]) {
        assertErrorStatusAndCode(res, 404, 'NOT_FOUND', label);
      }
      assert.strictEqual(draftJob.rawText, missingJob.rawText, `${roleName} DRAFT job 404 must match missing job 404`);
      assert.strictEqual(expiredJob.rawText, missingJob.rawText, `${roleName} EXPIRED job 404 must match missing job 404`);
    }

    // hr1 -> 403 MUST_CHANGE_PASSWORD
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/target-positions`, { headers: authHeaders(hr1.token) }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /target-positions');
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/1`, { headers: authHeaders(hr1.token) }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /jobs/1');

    // Anonymous -> 401 UNAUTHORIZED
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/target-positions`), 401, 'UNAUTHORIZED', 'anon GET /target-positions');
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/1`), 401, 'UNAUTHORIZED', 'anon GET /jobs/1');
  });

  it('TC-T2-RBAC-07: Should preserve 401/403/404/405/200 RBAC status codes and unified JSON error bodies through Nginx :3000/api/v1/', async () => {
    assert.ok(backendOnline && frontendOnline && mockOnline, 'Backend, Frontend Nginx, and Mock must be reachable');

    assertErrorStatusAndCode(
      await http.get(`${FRONTEND_BASE_URL}/api/v1/companies/1`),
      401,
      'UNAUTHORIZED',
      'Nginx :3000 anon GET /companies/1'
    );
    assertErrorStatusAndCode(
      await http.get(`${FRONTEND_BASE_URL}/api/v1/companies/1`, { headers: authHeaders(cand1.token) }),
      403,
      'FORBIDDEN',
      'Nginx :3000 cand1 GET /companies/1'
    );
    assertErrorStatusAndCode(
      await http.get(`${FRONTEND_BASE_URL}/api/v1/me/target`, { headers: authHeaders(mentor1.token) }),
      403,
      'FORBIDDEN',
      'Nginx :3000 mentor1 GET /me/target'
    );
    assertErrorStatusAndCode(
      await http.get(`${FRONTEND_BASE_URL}/api/v1/jobs/1`, { headers: authHeaders(hr1.token) }),
      403,
      'MUST_CHANGE_PASSWORD',
      'Nginx :3000 hr1 GET /jobs/1'
    );
    assertErrorStatusAndCode(
      await http.get(`${FRONTEND_BASE_URL}/api/v1/companies/1`, { headers: authHeaders(hr2.token) }),
      404,
      'NOT_FOUND',
      'Nginx :3000 hr2 GET /companies/1'
    );
    assertErrorStatusAndCode(
      await http.get(`${FRONTEND_BASE_URL}/api/v1/profiles/${cand2.user.id}/skills`, { headers: authHeaders(cand1.token) }),
      404,
      'NOT_FOUND',
      'Nginx :3000 cand1 GET /profiles/2/skills'
    );
    assertErrorStatusAndCode(
      await http.put(`${FRONTEND_BASE_URL}/api/v1/companies/2`, { name: 'Proxy Put' }, { headers: authHeaders(hr2.token) }),
      405,
      'METHOD_NOT_ALLOWED',
      'Nginx :3000 hr2 PUT /companies/2'
    );

    const staffCompanyRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/companies/1`, { headers: authHeaders(staff1.token) });
    assert.strictEqual(staffCompanyRes.status, 200);
    assert.strictEqual(staffCompanyRes.body?.id, 1);

    const adminJobRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/jobs/1`, { headers: authHeaders(admin1.token) });
    assert.strictEqual(adminJobRes.status, 200);
    assert.strictEqual(adminJobRes.body?.id, 1);
  });

  it('TC-T2-RBAC-08: Should lock GET /api/v1/me/job-recommendations to CANDIDATE only without triggering refresh rate limit', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and Mock must be reachable');

    // Default refresh=false never triggers the 2-minute refresh cooldown
    const candRecRes = await http.get(`${BACKEND_BASE_URL}/api/v1/me/job-recommendations`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(candRecRes.status, 200, `CANDIDATE GET /me/job-recommendations expected 200, got ${candRecRes.status}`);
    assert.strictEqual(candRecRes.body?.candidateId, cand1.user.id);
    assert.ok(Array.isArray(candRecRes.body?.items) && candRecRes.body.items.length >= 1, 'Expected non-empty job recommendations');
    assert.strictEqual(candRecRes.body?.total, candRecRes.body.items.length);
    assert.ok(
      candRecRes.body.items.every((item) => item.jobId !== 11 && item.jobId !== 12),
      'DRAFT (11) and EXPIRED (12) jobs must never appear in recommendations'
    );

    // Query param ?userId=cand2 must be ignored and still return cand1 recommendations
    const candSpoofRes = await http.get(`${BACKEND_BASE_URL}/api/v1/me/job-recommendations?userId=${cand2.user.id}`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(candSpoofRes.status, 200);
    assert.strictEqual(candSpoofRes.body?.candidateId, cand1.user.id, 'userId query param must never switch candidate');

    for (const [roleName, actor] of [['HR', hr2], ['MENTOR', mentor1], ['STAFF', staff1], ['ADMIN', admin1]]) {
      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/me/job-recommendations`, {
        headers: authHeaders(actor.token)
      });
      assertErrorStatusAndCode(res, 403, 'FORBIDDEN', `${roleName} GET /me/job-recommendations`);
    }

    const hr1RecRes = await http.get(`${BACKEND_BASE_URL}/api/v1/me/job-recommendations`, {
      headers: authHeaders(hr1.token)
    });
    assertErrorStatusAndCode(hr1RecRes, 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /me/job-recommendations');
  });

  it('TC-T2-RBAC-09: Should enforce 5-role ownership & privacy matrix on GET /api/v1/profiles/{userId}/evaluations', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and Mock must be reachable');

    // CANDIDATE (cand1): own 200; other candidates (2 public, 3 private) and 999999 -> byte-identical 404
    const cand1Own = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand1.user.id}/evaluations`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(cand1Own.status, 200);
    assert.strictEqual(cand1Own.body?.userId, cand1.user.id);
    assert.ok(Array.isArray(cand1Own.body?.evaluations));

    const cand1OtherPub = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand2.user.id}/evaluations`, {
      headers: authHeaders(cand1.token)
    });
    const cand1OtherPriv = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/3/evaluations`, {
      headers: authHeaders(cand1.token)
    });
    const cand1Missing = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/999999/evaluations`, {
      headers: authHeaders(cand1.token)
    });
    for (const [label, res] of [
      ['cand1->2 evaluations', cand1OtherPub],
      ['cand1->3 evaluations', cand1OtherPriv],
      ['cand1->999999 evaluations', cand1Missing]
    ]) {
      assertErrorStatusAndCode(res, 404, 'NOT_FOUND', label);
    }
    assert.strictEqual(cand1OtherPub.rawText, cand1Missing.rawText, 'Cross-candidate public profile 404 must be byte-identical to missing');
    assert.strictEqual(cand1OtherPriv.rawText, cand1Missing.rawText, 'Cross-candidate private profile 404 must be byte-identical to missing');

    // HR (hr2): public cand2 (200); private cand1, private 3, hr2 own ID, missing 999999 -> byte-identical 404
    const hr2Pub = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand2.user.id}/evaluations`, {
      headers: authHeaders(hr2.token)
    });
    assert.strictEqual(hr2Pub.status, 200);
    assert.strictEqual(hr2Pub.body?.userId, cand2.user.id);
    assert.ok(Array.isArray(hr2Pub.body?.evaluations) && hr2Pub.body.evaluations.length >= 1);

    const hr2Priv1 = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand1.user.id}/evaluations`, {
      headers: authHeaders(hr2.token)
    });
    const hr2Priv3 = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/3/evaluations`, {
      headers: authHeaders(hr2.token)
    });
    const hr2Self = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${hr2.user.id}/evaluations`, {
      headers: authHeaders(hr2.token)
    });
    const hr2Missing = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/999999/evaluations`, {
      headers: authHeaders(hr2.token)
    });
    for (const [label, res] of [
      ['hr2->1 evaluations', hr2Priv1],
      ['hr2->3 evaluations', hr2Priv3],
      ['hr2->self evaluations', hr2Self],
      ['hr2->999999 evaluations', hr2Missing]
    ]) {
      assertErrorStatusAndCode(res, 404, 'NOT_FOUND', label);
    }
    assert.strictEqual(hr2Priv1.rawText, hr2Missing.rawText);
    assert.strictEqual(hr2Priv3.rawText, hr2Missing.rawText);
    assert.strictEqual(hr2Self.rawText, hr2Missing.rawText, 'HR calling own userId must return byte-identical 404');

    for (const [roleName, actor] of [['MENTOR', mentor1], ['STAFF', staff1], ['ADMIN', admin1]]) {
      for (const targetUserId of [cand1.user.id, cand2.user.id]) {
        const res = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${targetUserId}/evaluations`, {
          headers: authHeaders(actor.token)
        });
        assertErrorStatusAndCode(res, 403, 'FORBIDDEN', `${roleName} GET /profiles/${targetUserId}/evaluations`);
      }
    }

    const hr1EvalRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand2.user.id}/evaluations`, {
      headers: authHeaders(hr1.token)
    });
    assertErrorStatusAndCode(hr1EvalRes, 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /profiles/2/evaluations');
  });

  it('TC-T2-RBAC-10: Should lock /api/v1/evaluation-templates and /api/v1/evaluations* to MENTOR only (403 FORBIDDEN for CANDIDATE/HR/STAFF/ADMIN, 403 MUST_CHANGE_PASSWORD for hr1)', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and Mock must be reachable');

    const createBody = { templateId: 1, userId: cand1.user.id, context: 'INTERNSHIP', scores: [] };
    const updateBody = { overallComment: 'RBAC probe', scores: [] };

    // MENTOR (mentor1): GET templates -> 200; PUT/submit on missing 999999 -> 404 NOT_FOUND (zero DB mutation, never touches DRAFT #3)
    const mentorTemplates = await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates`, {
      headers: authHeaders(mentor1.token)
    });
    assert.strictEqual(mentorTemplates.status, 200);
    assert.ok(Array.isArray(mentorTemplates.body) && mentorTemplates.body.length >= 2);

    const mentorMissingPut = await http.put(`${BACKEND_BASE_URL}/api/v1/evaluations/999999`, updateBody, {
      headers: authHeaders(mentor1.token)
    });
    assertErrorStatusAndCode(mentorMissingPut, 404, 'NOT_FOUND', 'MENTOR PUT /evaluations/999999');

    const mentorMissingSubmit = await http.post(`${BACKEND_BASE_URL}/api/v1/evaluations/999999/submit`, {}, {
      headers: authHeaders(mentor1.token)
    });
    assertErrorStatusAndCode(mentorMissingSubmit, 404, 'NOT_FOUND', 'MENTOR POST /evaluations/999999/submit');

    for (const [roleName, actor] of [['CANDIDATE', cand1], ['HR', hr2], ['STAFF', staff1], ['ADMIN', admin1]]) {
      const h = authHeaders(actor.token);
      assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates`, { headers: h }), 403, 'FORBIDDEN', `${roleName} GET /evaluation-templates`);
      assertErrorStatusAndCode(await http.post(`${BACKEND_BASE_URL}/api/v1/evaluations`, createBody, { headers: h }), 403, 'FORBIDDEN', `${roleName} POST /evaluations`);
      assertErrorStatusAndCode(await http.put(`${BACKEND_BASE_URL}/api/v1/evaluations/1`, updateBody, { headers: h }), 403, 'FORBIDDEN', `${roleName} PUT /evaluations/1`);
      assertErrorStatusAndCode(await http.post(`${BACKEND_BASE_URL}/api/v1/evaluations/1/submit`, {}, { headers: h }), 403, 'FORBIDDEN', `${roleName} POST /evaluations/1/submit`);
    }

    const hr1H = authHeaders(hr1.token);
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates`, { headers: hr1H }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /evaluation-templates');
    assertErrorStatusAndCode(await http.post(`${BACKEND_BASE_URL}/api/v1/evaluations`, createBody, { headers: hr1H }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 POST /evaluations');
    assertErrorStatusAndCode(await http.put(`${BACKEND_BASE_URL}/api/v1/evaluations/1`, updateBody, { headers: hr1H }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 PUT /evaluations/1');
    assertErrorStatusAndCode(await http.post(`${BACKEND_BASE_URL}/api/v1/evaluations/1/submit`, {}, { headers: hr1H }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 POST /evaluations/1/submit');
  });

  it('TC-T2-RBAC-11: Should enforce uniform 404 on <=0 IDs and 403/401 on unsupported HTTP methods for /target-positions & /jobs/{jobId}', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and Mock must be reachable');

    // /api/v1/companies/{0, -1}: HR (hr2) & STAFF -> byte-identical 404 to 999999; others -> 403; hr1 -> 403 MCP; anon -> 401
    for (const [roleName, actor] of [['HR', hr2], ['STAFF', staff1]]) {
      const missingRes = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/999999`, { headers: authHeaders(actor.token) });
      assertErrorStatusAndCode(missingRes, 404, 'NOT_FOUND', `${roleName} GET /companies/999999`);
      for (const badId of [0, -1]) {
        const res = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/${badId}`, { headers: authHeaders(actor.token) });
        assertErrorStatusAndCode(res, 404, 'NOT_FOUND', `${roleName} GET /companies/${badId}`);
        assert.strictEqual(res.rawText, missingRes.rawText, `${roleName} GET /companies/${badId} must be byte-identical to 999999`);
      }
    }
    for (const [roleName, actor] of [['CANDIDATE', cand1], ['MENTOR', mentor1], ['ADMIN', admin1]]) {
      for (const badId of [0, -1]) {
        const res = await http.get(`${BACKEND_BASE_URL}/api/v1/companies/${badId}`, { headers: authHeaders(actor.token) });
        assertErrorStatusAndCode(res, 403, 'FORBIDDEN', `${roleName} GET /companies/${badId}`);
      }
    }
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/companies/0`, { headers: authHeaders(hr1.token) }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /companies/0');
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/companies/0`), 401, 'UNAUTHORIZED', 'anon GET /companies/0');

    // /api/v1/profiles/{0, -1}/skills: CANDIDATE & HR -> byte-identical 404 to 999999; others -> 403; hr1 -> 403 MCP; anon -> 401
    for (const [roleName, actor] of [['CANDIDATE', cand1], ['HR', hr2]]) {
      const missingRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/999999/skills`, { headers: authHeaders(actor.token) });
      assertErrorStatusAndCode(missingRes, 404, 'NOT_FOUND', `${roleName} GET /profiles/999999/skills`);
      for (const badId of [0, -1]) {
        const res = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${badId}/skills`, { headers: authHeaders(actor.token) });
        assertErrorStatusAndCode(res, 404, 'NOT_FOUND', `${roleName} GET /profiles/${badId}/skills`);
        assert.strictEqual(res.rawText, missingRes.rawText, `${roleName} GET /profiles/${badId}/skills must be byte-identical to 999999`);
      }
    }
    for (const [roleName, actor] of [['MENTOR', mentor1], ['STAFF', staff1], ['ADMIN', admin1]]) {
      for (const badId of [0, -1]) {
        const res = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${badId}/skills`, { headers: authHeaders(actor.token) });
        assertErrorStatusAndCode(res, 403, 'FORBIDDEN', `${roleName} GET /profiles/${badId}/skills`);
      }
    }
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/0/skills`, { headers: authHeaders(hr1.token) }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /profiles/0/skills');
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/0/skills`), 401, 'UNAUTHORIZED', 'anon GET /profiles/0/skills');

    // /api/v1/jobs/{0, -1}: all 5 active roles -> byte-identical 404 to 999999; hr1 -> 403 MCP; anon -> 401
    for (const [roleName, actor] of [
      ['CANDIDATE', cand1],
      ['HR', hr2],
      ['MENTOR', mentor1],
      ['STAFF', staff1],
      ['ADMIN', admin1]
    ]) {
      const h = authHeaders(actor.token);
      const missingRes = await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/999999`, { headers: h });
      assertErrorStatusAndCode(missingRes, 404, 'NOT_FOUND', `${roleName} GET /jobs/999999`);
      for (const badId of [0, -1]) {
        const res = await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/${badId}`, { headers: h });
        assertErrorStatusAndCode(res, 404, 'NOT_FOUND', `${roleName} GET /jobs/${badId}`);
        assert.strictEqual(res.rawText, missingRes.rawText, `${roleName} GET /jobs/${badId} must be byte-identical to 999999`);
      }
    }
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/0`, { headers: authHeaders(hr1.token) }), 403, 'MUST_CHANGE_PASSWORD', 'hr1 GET /jobs/0');
    assertErrorStatusAndCode(await http.get(`${BACKEND_BASE_URL}/api/v1/jobs/0`), 401, 'UNAUTHORIZED', 'anon GET /jobs/0');

    // Unsupported HTTP methods on /target-positions & /jobs/{jobId}:
    // RoutePolicy.authenticatedAny sets methodScoped=true, so non-GET falls through to .anyRequest().denyAll() (403 FORBIDDEN / 401 UNAUTHORIZED, NOT 405)
    const unsupportedCalls = [
      (base, opts) => http.post(`${base}/api/v1/target-positions`, {}, opts),
      (base, opts) => http.put(`${base}/api/v1/target-positions`, {}, opts),
      (base, opts) => http.delete(`${base}/api/v1/target-positions`, opts),
      (base, opts) => http.post(`${base}/api/v1/jobs/1`, {}, opts),
      (base, opts) => http.put(`${base}/api/v1/jobs/1`, {}, opts),
      (base, opts) => http.delete(`${base}/api/v1/jobs/1`, opts)
    ];
    for (let i = 0; i < unsupportedCalls.length; i++) {
      const callFn = unsupportedCalls[i];
      assertErrorStatusAndCode(await callFn(BACKEND_BASE_URL, {}), 401, 'UNAUTHORIZED', `anon unsupported#${i}`);
      assertErrorStatusAndCode(await callFn(BACKEND_BASE_URL, { headers: authHeaders(hr1.token) }), 403, 'MUST_CHANGE_PASSWORD', `hr1 unsupported#${i}`);
      for (const [roleName, actor] of [
        ['CANDIDATE', cand1],
        ['HR', hr2],
        ['MENTOR', mentor1],
        ['STAFF', staff1],
        ['ADMIN', admin1]
      ]) {
        assertErrorStatusAndCode(
          await callFn(BACKEND_BASE_URL, { headers: authHeaders(actor.token) }),
          403,
          'FORBIDDEN',
          `${roleName} unsupported#${i}`
        );
      }
    }
  });

  it('TC-T2-RBAC-12: Should enforce .anyRequest().denyAll() on unmapped /api/v1/unmapped-nt02-probe across :8080 and :3000', async () => {
    assert.ok(backendOnline && frontendOnline && mockOnline, 'Backend, Frontend Nginx, and Mock must be reachable');

    const unmappedPath = '/api/v1/unmapped-nt02-probe';
    for (const [methodLabel, callFn] of [
      ['GET', (base, opts) => http.get(`${base}${unmappedPath}`, opts)],
      ['POST', (base, opts) => http.post(`${base}${unmappedPath}`, { probe: true }, opts)]
    ]) {
      const anonBackendRes = await callFn(BACKEND_BASE_URL, {});
      const anonFrontendRes = await callFn(FRONTEND_BASE_URL, {});
      assertErrorStatusAndCode(anonBackendRes, 401, 'UNAUTHORIZED', `8080 anon ${methodLabel} unmapped`);
      assertErrorStatusAndCode(anonFrontendRes, 401, 'UNAUTHORIZED', `3000 anon ${methodLabel} unmapped`);
      assert.strictEqual(anonFrontendRes.rawText, anonBackendRes.rawText, `Nginx :3000 anon ${methodLabel} unmapped must match :8080`);

      const hr1BackendRes = await callFn(BACKEND_BASE_URL, { headers: authHeaders(hr1.token) });
      const hr1FrontendRes = await callFn(FRONTEND_BASE_URL, { headers: authHeaders(hr1.token) });
      assertErrorStatusAndCode(hr1BackendRes, 403, 'MUST_CHANGE_PASSWORD', `8080 hr1 ${methodLabel} unmapped`);
      assertErrorStatusAndCode(hr1FrontendRes, 403, 'MUST_CHANGE_PASSWORD', `3000 hr1 ${methodLabel} unmapped`);
      assert.strictEqual(hr1FrontendRes.rawText, hr1BackendRes.rawText, `Nginx :3000 hr1 ${methodLabel} unmapped must match :8080`);

      for (const [roleName, actor] of [
        ['CANDIDATE', cand1],
        ['HR', hr2],
        ['MENTOR', mentor1],
        ['STAFF', staff1],
        ['ADMIN', admin1]
      ]) {
        const opts = { headers: authHeaders(actor.token) };
        const res8080 = await callFn(BACKEND_BASE_URL, opts);
        const res3000 = await callFn(FRONTEND_BASE_URL, opts);
        assertErrorStatusAndCode(res8080, 403, 'FORBIDDEN', `8080 ${roleName} ${methodLabel} unmapped`);
        assertErrorStatusAndCode(res3000, 403, 'FORBIDDEN', `3000 ${roleName} ${methodLabel} unmapped`);
        assert.strictEqual(res3000.rawText, res8080.rawText, `Nginx :3000 ${roleName} ${methodLabel} unmapped must match :8080`);
      }
    }
  });

  it('TC-T2-RBAC-13: Should preserve Nginx :3000 parity for GET /api/v1/target-positions and GET /api/v1/auth/me across all 5 roles + hr1 + anonymous', async () => {
    assert.ok(backendOnline && frontendOnline && mockOnline, 'Backend, Frontend Nginx, and Mock must be reachable');

    // Anonymous -> 401 UNAUTHORIZED on both via :3000
    assertErrorStatusAndCode(
      await http.get(`${FRONTEND_BASE_URL}/api/v1/target-positions`),
      401,
      'UNAUTHORIZED',
      'Nginx :3000 anon GET /target-positions'
    );
    assertErrorStatusAndCode(
      await http.get(`${FRONTEND_BASE_URL}/api/v1/auth/me`),
      401,
      'UNAUTHORIZED',
      'Nginx :3000 anon GET /auth/me'
    );

    // hr1 (mustChangePassword=true): /target-positions -> 403 MUST_CHANGE_PASSWORD; /auth/me -> 200 (ALLOW_LIST)
    assertErrorStatusAndCode(
      await http.get(`${FRONTEND_BASE_URL}/api/v1/target-positions`, { headers: authHeaders(hr1.token) }),
      403,
      'MUST_CHANGE_PASSWORD',
      'Nginx :3000 hr1 GET /target-positions'
    );
    const hr1MeRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/auth/me`, { headers: authHeaders(hr1.token) });
    assert.strictEqual(hr1MeRes.status, 200, `Nginx :3000 hr1 GET /auth/me expected 200, got ${hr1MeRes.status}`);
    assert.strictEqual(hr1MeRes.body?.role, 'HR');
    assert.strictEqual(hr1MeRes.body?.companyId, 1);
    assert.strictEqual(hr1MeRes.body?.mustChangePassword, true);
    assert.strictEqual(hr1MeRes.body?.email, 'hr1@rikkeijobs.test');

    // All 5 active roles -> 200 on both via :3000
    for (const [roleName, actor] of [
      ['CANDIDATE', cand1],
      ['HR', hr2],
      ['MENTOR', mentor1],
      ['STAFF', staff1],
      ['ADMIN', admin1]
    ]) {
      const h = authHeaders(actor.token);
      const posRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/target-positions`, { headers: h });
      assert.strictEqual(posRes.status, 200, `Nginx :3000 ${roleName} GET /target-positions expected 200, got ${posRes.status}`);
      assert.ok(Array.isArray(posRes.body) && posRes.body.length >= 4, `Nginx :3000 ${roleName} expected >= 4 target positions`);

      const meRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/auth/me`, { headers: h });
      assert.strictEqual(meRes.status, 200, `Nginx :3000 ${roleName} GET /auth/me expected 200, got ${meRes.status}`);
      assert.strictEqual(meRes.body?.role, roleName);
      assert.strictEqual(meRes.body?.email, actor.user.email);
      assert.strictEqual(meRes.body?.mustChangePassword, false);
    }
  });

  it('TC-T2-RBAC-14: Should enforce 401/403 RBAC matrix and Nginx :3000 parity across all 5 NT-05 D10 endpoints', async () => {
    assert.ok(backendOnline && frontendOnline, 'Backend and frontend proxy must be reachable');

    const endpoints = [
      { label: 'POST /staff/sync/1', method: 'post', path: '/api/v1/staff/sync/1', body: {} },
      { label: 'GET /staff/sync-runs', method: 'get', path: '/api/v1/staff/sync-runs?page=1&size=20' },
      {
        label: 'PUT /staff/external-records/1/override',
        method: 'put',
        path: '/api/v1/staff/external-records/1/override',
        body: { field: 'rpoint', value: 120, reason: 'Kiểm tra phân quyền' }
      },
      { label: 'GET /staff/external-records', method: 'get', path: '/api/v1/staff/external-records?page=1&size=20' },
      { label: 'GET /staff/sync/candidates', method: 'get', path: '/api/v1/staff/sync/candidates?page=1&size=20' }
    ];

    const callEndpoint = (baseUrl, endpoint, headers = {}) => {
      const url = `${baseUrl}${endpoint.path}`;
      if (endpoint.method === 'get') {
        return http.get(url, { headers });
      }
      if (endpoint.method === 'post') {
        return http.post(url, endpoint.body, { headers });
      }
      return http.put(url, endpoint.body, { headers });
    };

    for (const [originLabel, baseUrl] of [
      [':8080', BACKEND_BASE_URL],
      [':3000', FRONTEND_BASE_URL]
    ]) {
      for (const ep of endpoints) {
        const anonRes = await callEndpoint(baseUrl, ep);
        assertErrorStatusAndCode(anonRes, 401, 'UNAUTHORIZED', `${originLabel} ${ep.label} (anonymous)`);

        for (const [roleLabel, actor] of [
          ['CANDIDATE', cand1],
          ['HR', hr2],
          ['MENTOR', mentor1],
          ['ADMIN', admin1]
        ]) {
          const forbiddenRes = await callEndpoint(baseUrl, ep, authHeaders(actor.token));
          assertErrorStatusAndCode(forbiddenRes, 403, 'FORBIDDEN', `${originLabel} ${ep.label} (${roleLabel})`);
        }

        const mustChangeRes = await callEndpoint(baseUrl, ep, authHeaders(hr1.token));
        assertErrorStatusAndCode(
          mustChangeRes,
          403,
          'MUST_CHANGE_PASSWORD',
          `${originLabel} ${ep.label} (hr1 mustChangePassword)`
        );
      }
    }
  });
});
