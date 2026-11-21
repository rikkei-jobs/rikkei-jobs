// Tier 1: Feature Coverage — TT-01 IOC Internship Sync & Profile Endpoints (Opaque-Box)
// Verifies SSO sync-on-read idempotency, V4 skill evidence deduplication, empty state,
// IDOR/RBAC matrix across all 5 roles + anonymous, and Nginx :3000 proxy parity.
//
// Note on mock PM score-mutation omission:
// Per docs/mock-contract.md Section 5 and mock/server.js, the mock service provides only
// 5 administrative /mock/* testing tools (reload, requests, enrollments, reset, cloudinary/fail-next)
// and has no runtime PM internship score-mutation endpoint. Score-update idempotency and
// HALF_UP x10 clamping are verified hermetically in backend tests:
// InternshipSyncServiceTest, CandidatePublicServiceInternshipTest, and InternshipControllerIntegrationTest.

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKEND_BASE_URL,
  FRONTEND_BASE_URL,
  MOCK_BASE_URL,
  SERVICE_KEY,
  isReachable
} from '../config.mjs';
import { http } from '../helpers/http-client.mjs';
import {
  DEV_SEED_PASSWORD,
  VIETNAMESE_DIACRITIC_REGEX,
  EMOJI_REGEX,
  authHeaders,
  loginUser,
  assertUnifiedErrorResponse
} from '../helpers/company-fixtures.mjs';

const EXPECTED_BATCH_ID = 'IOC-JB-2026-09';
const EXPECTED_BATCH_NAME = 'IOC Java Backend 09/2026';
const EXPECTED_GROUP_NAME = 'Nhóm 2';
const EXPECTED_TOPIC_NAME = 'Hệ thống đặt lịch phòng họp';
const EXPECTED_MENTOR_EMAIL = 'mentor1@rikkeijobs.test';
const EXPECTED_START_DATE = '2026-09-07';
const EXPECTED_END_DATE = '2026-10-30';
const EXPECTED_FINAL_SCORE = 8.5;

const EXPECTED_TASKS = [
  { title: 'API đặt phòng và kiểm trùng lịch', acceptedScore: 9 },
  { title: 'Phân quyền quản trị phòng', acceptedScore: 8 },
  { title: 'Báo cáo tần suất sử dụng phòng', acceptedScore: 8.5 }
];

const EXPECTED_MAPPED_SKILLS = ['JAVA', 'SPRING_BOOT', 'TEAMWORK', 'AGILE'];

async function loginCandidateViaMockSso(lmsUserId) {
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
  assert.strictEqual(meRes.body?.id, ssoRes.body.user?.id, `/auth/me id must match SSO user for ${lmsUserId}`);
  assert.strictEqual(meRes.body?.lmsUserId, lmsUserId, `/auth/me lmsUserId must match ${lmsUserId}`);

  return {
    token: ssoRes.body.accessToken,
    user: meRes.body
  };
}

function assertErrorStatus(res, expectedStatus, label) {
  assert.strictEqual(
    res.status,
    expectedStatus,
    `${label}: expected HTTP ${expectedStatus}, got ${res.status} (${res.rawText})`
  );
  assertUnifiedErrorResponse(res);
  assert.ok(VIETNAMESE_DIACRITIC_REGEX.test(res.body.message), `${label}: error message must have Vietnamese diacritics`);
  assert.strictEqual(EMOJI_REGEX.test(res.body.message), false, `${label}: error message must contain zero emoji`);
}

function assertCandidate1BatchPayload(batches, label) {
  assert.ok(Array.isArray(batches), `${label}: response body must be an array`);
  assert.strictEqual(batches.length, 1, `${label}: expected exactly 1 internship batch, got ${batches.length}`);

  const batch = batches[0];
  assert.strictEqual(typeof batch.id, 'number', `${label}: batch.id must be a number`);
  assert.strictEqual(batch.batchId, EXPECTED_BATCH_ID);
  assert.strictEqual(batch.batchName, EXPECTED_BATCH_NAME);
  assert.strictEqual(batch.groupName, EXPECTED_GROUP_NAME);
  assert.strictEqual(batch.topicName, EXPECTED_TOPIC_NAME);
  assert.strictEqual(batch.mentorEmail, EXPECTED_MENTOR_EMAIL);
  assert.strictEqual(batch.startDate, EXPECTED_START_DATE);
  assert.strictEqual(batch.endDate, EXPECTED_END_DATE);
  assert.strictEqual(Number(batch.finalScore), EXPECTED_FINAL_SCORE);
  assert.strictEqual(typeof batch.syncedAt, 'string', `${label}: syncedAt must be an ISO-8601 string`);
  assert.ok(!Number.isNaN(Date.parse(batch.syncedAt)), `${label}: syncedAt must parse as valid ISO-8601 date`);

  assert.ok(Array.isArray(batch.tasks), `${label}: tasks must be an array`);
  assert.strictEqual(batch.tasks.length, 3, `${label}: expected exactly 3 tasks, got ${batch.tasks.length}`);

  const byTitle = new Map(batch.tasks.map((task) => [task.title, task]));
  assert.strictEqual(byTitle.size, 3, `${label}: task titles must be unique`);
  for (const expectedTask of EXPECTED_TASKS) {
    const actualTask = byTitle.get(expectedTask.title);
    assert.ok(actualTask, `${label}: missing expected task "${expectedTask.title}"`);
    assert.strictEqual(typeof actualTask.id, 'number', `${label}: task.id must be a number`);
    assert.strictEqual(Number(actualTask.acceptedScore), expectedTask.acceptedScore);
    assert.strictEqual(typeof actualTask.acceptedAt, 'string', `${label}: task.acceptedAt must be an ISO-8601 string`);
    assert.ok(!Number.isNaN(Date.parse(actualTask.acceptedAt)), `${label}: task.acceptedAt must be valid ISO-8601`);
  }
  return batch;
}

describe('Tier 1: TT-01 IOC Internship Sync & Profile Endpoints', () => {
  let backendOnline = false;
  let mockOnline = false;
  let frontendOnline = false;

  let cand1 = null;
  let cand2 = null;
  let hr1 = null;
  let hr2 = null;
  let mentor1 = null;
  let staff1 = null;
  let admin1 = null;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    mockOnline = await isReachable(`${MOCK_BASE_URL}/mock/requests`);
    frontendOnline = await isReachable(FRONTEND_BASE_URL);

    if (backendOnline && mockOnline) {
      cand1 = await loginCandidateViaMockSso('lms-sv-001');
      cand2 = await loginCandidateViaMockSso('lms-sv-002');
      assert.strictEqual(cand1.user.id, 1, 'Seeded lms-sv-001 must resolve to user id 1');
      assert.strictEqual(cand2.user.id, 2, 'Seeded lms-sv-002 must resolve to user id 2');

      // Preserve hr1 must_change_password=true state (never mutate hr1 password)
      hr1 = await loginUser(BACKEND_BASE_URL, 'hr1@rikkeijobs.test', DEV_SEED_PASSWORD);
      hr2 = await loginUser(BACKEND_BASE_URL, 'hr2@rikkeijobs.test', DEV_SEED_PASSWORD);
      mentor1 = await loginUser(BACKEND_BASE_URL, 'mentor1@rikkeijobs.test', DEV_SEED_PASSWORD);
      staff1 = await loginUser(BACKEND_BASE_URL, 'staff1@rikkeijobs.test', DEV_SEED_PASSWORD);
      admin1 = await loginUser(BACKEND_BASE_URL, 'admin1@rikkeijobs.test', DEV_SEED_PASSWORD);
    }
  });

  it('TC-T1-TT01-01: Should sync lms-sv-001 internships idempotently across repeated GET /profiles/me/internships calls', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and mock services must be reachable');

    const firstRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/internships`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(firstRes.status, 200, `First /me/internships failed: ${firstRes.status} (${firstRes.rawText})`);
    const firstBatch = assertCandidate1BatchPayload(firstRes.body, 'First /me/internships');

    const secondRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/internships`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(secondRes.status, 200, `Second /me/internships failed: ${secondRes.status} (${secondRes.rawText})`);
    const secondBatch = assertCandidate1BatchPayload(secondRes.body, 'Second /me/internships');

    assert.strictEqual(secondBatch.id, firstBatch.id, 'Repeated sync must update the existing internship row in place');
    const firstTaskIds = firstBatch.tasks.map((t) => `${t.title}:${t.id}:${t.acceptedScore}:${t.acceptedAt}`).sort();
    const secondTaskIds = secondBatch.tasks.map((t) => `${t.title}:${t.id}:${t.acceptedScore}:${t.acceptedAt}`).sort();
    assert.deepStrictEqual(secondTaskIds, firstTaskIds, 'Repeated sync must not duplicate or change task rows');
  });

  it('TC-T1-TT01-02: Should merge V4 seed without duplicating INTERNSHIP evidence on GET /profiles/me/skills', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and mock services must be reachable');

    const syncRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/internships`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(syncRes.status, 200);

    const skillsRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(skillsRes.status, 200, `GET /profiles/me/skills failed: ${skillsRes.status} (${skillsRes.rawText})`);
    assert.ok(Array.isArray(skillsRes.body), '/profiles/me/skills must return an array');

    const skillsByCode = new Map(skillsRes.body.map((item) => [item.skill?.code, item]));
    for (const skillCode of EXPECTED_MAPPED_SKILLS) {
      const skillItem = skillsByCode.get(skillCode);
      assert.ok(skillItem, `Expected mapped skill ${skillCode} in /profiles/me/skills`);
      const evidences = Array.isArray(skillItem.evidences) ? skillItem.evidences : [];
      const internshipEvidences = evidences.filter((ev) => ev.source === 'INTERNSHIP');
      assert.strictEqual(
        internshipEvidences.length,
        1,
        `${skillCode}: expected exactly 1 INTERNSHIP evidence after V4 merge, got ${internshipEvidences.length}`
      );
      assert.strictEqual(internshipEvidences[0].verified, true, `${skillCode}: INTERNSHIP evidence must be verified`);
      assert.strictEqual(Number(internshipEvidences[0].score), 85, `${skillCode}: INTERNSHIP evidence score must be 85`);
      assert.strictEqual(
        internshipEvidences[0].title,
        EXPECTED_TOPIC_NAME,
        `${skillCode}: INTERNSHIP evidence title must be updated from V4 seed`
      );

      const legacySeedRows = evidences.filter((ev) => ev.title === EXPECTED_BATCH_NAME);
      assert.strictEqual(
        legacySeedRows.length,
        0,
        `${skillCode}: old V4 seed title "${EXPECTED_BATCH_NAME}" must not remain as a duplicate evidence`
      );
    }
  });

  it('TC-T1-TT01-03: Should return 200 empty array on GET /profiles/me/internships for lms-sv-002', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and mock services must be reachable');

    const res = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/internships`, {
      headers: authHeaders(cand2.token)
    });
    assert.strictEqual(res.status, 200, `lms-sv-002 /me/internships failed: ${res.status} (${res.rawText})`);
    assert.deepStrictEqual(res.body, [], 'Candidate without internships must receive []');
  });

  it('TC-T1-TT01-04: Should enforce self read 200, cross-user IDOR 404, and invalid userId 400 on GET /profiles/{userId}/internships', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and mock services must be reachable');

    const selfRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand1.user.id}/internships`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(selfRes.status, 200, `Self /{userId}/internships failed: ${selfRes.status} (${selfRes.rawText})`);
    assertCandidate1BatchPayload(selfRes.body, 'Self /{userId}/internships');

    const crossCand2 = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand2.user.id}/internships`, {
      headers: authHeaders(cand1.token)
    });
    const crossCand3 = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/3/internships`, {
      headers: authHeaders(cand1.token)
    });
    const crossMissing = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/999999/internships`, {
      headers: authHeaders(cand1.token)
    });
    for (const [label, res] of [
      ['cand1 -> cand2', crossCand2],
      ['cand1 -> user 3', crossCand3],
      ['cand1 -> 999999', crossMissing]
    ]) {
      assertErrorStatus(res, 404, label);
      assert.strictEqual(res.body.code, 'NOT_FOUND', `${label}: expected code NOT_FOUND`);
    }
    assert.strictEqual(crossCand2.rawText, crossMissing.rawText, 'Cross-user 404 body must be byte-identical to missing user 404');
    assert.strictEqual(crossCand3.rawText, crossMissing.rawText, 'Cross-user 404 body for user 3 must be byte-identical');

    for (const invalidId of ['0', '-1', 'abc']) {
      const badRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${invalidId}/internships`, {
        headers: authHeaders(cand1.token)
      });
      assertErrorStatus(badRes, 400, `Invalid userId "${invalidId}"`);
      assert.strictEqual(badRes.body.code, 'VALIDATION_ERROR');
    }
  });

  it('TC-T1-TT01-05: Should enforce full 5-role RBAC + anonymous + MUST_CHANGE_PASSWORD matrix on internship endpoints', async () => {
    assert.ok(backendOnline && mockOnline, 'Backend and mock services must be reachable');

    // Anonymous -> 401
    for (const path of ['/api/v1/profiles/me/internships', `/api/v1/profiles/${cand1.user.id}/internships`]) {
      const anonRes = await http.get(`${BACKEND_BASE_URL}${path}`);
      assertErrorStatus(anonRes, 401, `Anonymous ${path}`);
      assert.strictEqual(anonRes.body.code, 'UNAUTHORIZED');
    }

    // MENTOR, STAFF, ADMIN -> 403 on both /me/internships and /{userId}/internships
    for (const [roleName, session] of [
      ['MENTOR', mentor1],
      ['STAFF', staff1],
      ['ADMIN', admin1]
    ]) {
      const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/internships`, {
        headers: authHeaders(session.token)
      });
      assertErrorStatus(meRes, 403, `${roleName} /me/internships`);
      assert.strictEqual(meRes.body.code, 'FORBIDDEN');

      const byIdRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand1.user.id}/internships`, {
        headers: authHeaders(session.token)
      });
      assertErrorStatus(byIdRes, 403, `${roleName} /${cand1.user.id}/internships`);
      assert.strictEqual(byIdRes.body.code, 'FORBIDDEN');
    }

    // HR (hr2 active): /me/internships -> 403; public cand2 -> 200 []; private cand1 & missing -> 404 byte-identical
    const hr2MeRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/internships`, {
      headers: authHeaders(hr2.token)
    });
    assertErrorStatus(hr2MeRes, 403, 'hr2 /me/internships');
    assert.strictEqual(hr2MeRes.body.code, 'FORBIDDEN');

    const hr2PublicRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand2.user.id}/internships`, {
      headers: authHeaders(hr2.token)
    });
    assert.strictEqual(hr2PublicRes.status, 200, `hr2 public cand2 failed: ${hr2PublicRes.status} (${hr2PublicRes.rawText})`);
    assert.deepStrictEqual(hr2PublicRes.body, [], 'hr2 reading public cand2 with no internships must get []');

    const hr2PrivateRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${cand1.user.id}/internships`, {
      headers: authHeaders(hr2.token)
    });
    const hr2MissingRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/999999/internships`, {
      headers: authHeaders(hr2.token)
    });
    assertErrorStatus(hr2PrivateRes, 404, 'hr2 private cand1');
    assertErrorStatus(hr2MissingRes, 404, 'hr2 missing 999999');
    assert.strictEqual(hr2PrivateRes.body.code, 'NOT_FOUND');
    assert.strictEqual(hr2PrivateRes.rawText, hr2MissingRes.rawText, 'HR private profile 404 must match missing profile 404 byte-for-byte');

    // hr1 (mustChangePassword=true) -> 403 MUST_CHANGE_PASSWORD
    for (const path of ['/api/v1/profiles/me/internships', `/api/v1/profiles/${cand2.user.id}/internships`]) {
      const hr1Res = await http.get(`${BACKEND_BASE_URL}${path}`, {
        headers: authHeaders(hr1.token)
      });
      assertErrorStatus(hr1Res, 403, `hr1 ${path}`);
      assert.strictEqual(hr1Res.body.code, 'MUST_CHANGE_PASSWORD');
    }
  });

  it('TC-T1-TT01-06: Should preserve :3000 Nginx proxy parity for 200, 401, and 403 on internship endpoints', async () => {
    assert.ok(backendOnline && mockOnline && frontendOnline, 'Backend, mock, and frontend proxy must be reachable');

    const proxyCandRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/profiles/me/internships`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(proxyCandRes.status, 200, `Proxy cand1 /me/internships failed: ${proxyCandRes.status}`);
    assertCandidate1BatchPayload(proxyCandRes.body, 'Proxy :3000 cand1 /me/internships');

    const proxyAnonRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/profiles/me/internships`);
    assertErrorStatus(proxyAnonRes, 401, 'Proxy :3000 anonymous /me/internships');
    assert.strictEqual(proxyAnonRes.body.code, 'UNAUTHORIZED');

    const proxyMentorRes = await http.get(`${FRONTEND_BASE_URL}/api/v1/profiles/${cand1.user.id}/internships`, {
      headers: authHeaders(mentor1.token)
    });
    assertErrorStatus(proxyMentorRes, 403, 'Proxy :3000 mentor1 /{userId}/internships');
    assert.strictEqual(proxyMentorRes.body.code, 'FORBIDDEN');
  });
});
