// Tier 1: Feature Coverage — NT-05 External Data Sync & Manual Override (Opaque-Box)
// Verifies candidate search, pagination bounds, LIKE wildcard escaping, consecutive manual sync
// idempotency + HS-01 preservation, unknown/non-candidate 404, manual override validation (incl.
// F9/G7 decimal/control-char/underflow rules) + persistence across re-sync, and F1 alternating
// NT-05/TT-01 PM raw payload preservation (D10 401/403 RBAC matrix is covered in TC-T2-RBAC-14).

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { BACKEND_BASE_URL, FRONTEND_BASE_URL, MOCK_BASE_URL, SERVICE_KEY, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';
import {
  VIETNAMESE_DIACRITIC_REGEX,
  EMOJI_REGEX,
  authHeaders,
  assertUnifiedErrorResponse
} from '../helpers/company-fixtures.mjs';

async function loginViaMockSso(lmsUserId) {
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
    assert.ok(
      VIETNAMESE_DIACRITIC_REGEX.test(res.body.message),
      `${label}: error message must contain Vietnamese diacritics, got "${res.body.message}"`
    );
  }
  assert.strictEqual(EMOJI_REGEX.test(res.body.message), false, `${label}: error message must contain zero emoji`);
}

describe('Tier 1: NT-05 External Data Sync & Manual Override (Opaque-Box)', () => {
  let backendOnline = false;
  let frontendOnline = false;
  let mockOnline = false;

  let staff1;
  let cand1;
  let cand2;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    frontendOnline = await isReachable(FRONTEND_BASE_URL);
    mockOnline = await isReachable(`${MOCK_BASE_URL}/health`);

    if (!backendOnline || !frontendOnline || !mockOnline) {
      return;
    }

    // Uses mock SSO instead of password login to stay within the 160/min per-IP password-login rate-limit budget.
    [staff1, cand1, cand2] = await Promise.all([
      loginViaMockSso('lms-st-001'),
      loginViaMockSso('lms-sv-001'),
      loginViaMockSso('lms-sv-002')
    ]);
    assert.strictEqual(staff1.user?.email, 'staff1@rikkeijobs.test', 'Staff SSO must sign in staff1');
    assert.strictEqual(staff1.user?.role, 'STAFF', 'Staff SSO user must have STAFF role');
  });

  it('TC-T1-NT05-02: Should search candidates with pagination bounds and SQL LIKE wildcard escaping', async () => {
    assert.ok(backendOnline && frontendOnline, 'Backend and frontend proxy must be reachable');

    const [searchDirect, searchProxy] = await Promise.all([
      http.get(`${BACKEND_BASE_URL}/api/v1/staff/sync/candidates?q=lms-sv&page=1&size=20`, {
        headers: authHeaders(staff1.token)
      }),
      http.get(`${FRONTEND_BASE_URL}/api/v1/staff/sync/candidates?q=lms-sv&page=1&size=20`, {
        headers: authHeaders(staff1.token)
      })
    ]);

    assert.strictEqual(searchDirect.status, 200, `Expected 200 on :8080, got ${searchDirect.status}`);
    assert.strictEqual(searchProxy.status, 200, `Expected 200 on :3000, got ${searchProxy.status}`);
    assert.deepStrictEqual(searchDirect.body, searchProxy.body, 'Candidate search payload must match across :8080 and :3000');

    const items = searchDirect.body?.items || [];
    assert.ok(items.length >= 3, `Expected at least 3 seeded candidates matching lms-sv, got ${items.length}`);
    const lmsIds = items.map((c) => c.lmsUserId);
    assert.ok(lmsIds.includes('lms-sv-001'), 'Must include lms-sv-001');
    assert.ok(lmsIds.includes('lms-sv-002'), 'Must include lms-sv-002');
    assert.ok(lmsIds.includes('lms-sv-003'), 'Must include lms-sv-003');

    for (const wildcard of ['%', '_']) {
      const wildcardRes = await http.get(
        `${BACKEND_BASE_URL}/api/v1/staff/sync/candidates?q=${encodeURIComponent(wildcard)}&page=1&size=20`,
        { headers: authHeaders(staff1.token) }
      );
      assert.strictEqual(wildcardRes.status, 200);
      assert.strictEqual(
        wildcardRes.body?.totalItems,
        0,
        `LIKE wildcard "${wildcard}" must be escaped and return 0 totalItems`
      );
    }

    const longQuery = 'a'.repeat(101);
    for (const [label, query, requireVi] of [
      ['page=0', 'page=0&size=20', false],
      ['size=101', 'page=1&size=101', false],
      ['q>100', `q=${longQuery}&page=1&size=20`, true]
    ]) {
      const invalidRes = await http.get(`${BACKEND_BASE_URL}/api/v1/staff/sync/candidates?${query}`, {
        headers: authHeaders(staff1.token)
      });
      assertErrorResponse(invalidRes, 400, 'VALIDATION_ERROR', `Candidate search ${label}`, requireVi);
    }
  });

  it('TC-T1-NT05-03: Should sync candidate1 idempotently across two runs while preserving history, MENTOR evidences, and HS-01 scores', async () => {
    assert.ok(backendOnline && frontendOnline && mockOnline, 'Backend, frontend proxy, and mock must be reachable');

    const beforeSkillsRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(beforeSkillsRes.status, 200);
    assert.strictEqual(beforeSkillsRes.body?.length, 13, 'candidate1 must have 13 skills before sync');

    const beforeByCode = new Map(beforeSkillsRes.body.map((item) => [item.skill?.code, item]));
    const beforeJavaScore = Number(beforeByCode.get('JAVA')?.verifiedScore);
    const beforeJavaMentorEvidences = (beforeByCode.get('JAVA')?.evidences || []).filter(
      (ev) => ev.source === 'MENTOR'
    );

    const firstSyncRes = await http.post(
      `${FRONTEND_BASE_URL}/api/v1/staff/sync/1`,
      {},
      { headers: authHeaders(staff1.token), timeoutMs: 8000 }
    );
    assert.strictEqual(firstSyncRes.status, 200, `First sync failed: ${firstSyncRes.status} (${firstSyncRes.rawText})`);
    assert.strictEqual(firstSyncRes.body?.trigger, 'MANUAL');
    assert.strictEqual(firstSyncRes.body?.status, 'SUCCESS');
    assert.strictEqual(firstSyncRes.body?.userId, 1);
    assert.strictEqual(firstSyncRes.body?.counts?.lms?.fetched, 5);
    assert.strictEqual(firstSyncRes.body?.counts?.exam?.fetched, 1);
    assert.strictEqual(firstSyncRes.body?.counts?.pm?.fetched, 1);

    const recordsAfterFirstRes = await http.get(
      `${BACKEND_BASE_URL}/api/v1/staff/external-records?userId=1&page=1&size=100`,
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(recordsAfterFirstRes.status, 200);
    const recordsAfterFirst = recordsAfterFirstRes.body?.items || [];
    const hasHistoricalJavaRow = recordsAfterFirst.some(
      (r) => r.source === 'LMS' && r.sourceCode === 'JAVA01' && typeof r.sourceKey === 'string' && r.sourceKey.includes('#h')
    );
    assert.ok(hasHistoricalJavaRow, 'Historical 1:JAVA01#h<id> row must be preserved after sync');

    const secondSyncRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/sync/1`,
      {},
      { headers: authHeaders(staff1.token), timeoutMs: 8000 }
    );
    assert.strictEqual(secondSyncRes.status, 200, `Second sync failed: ${secondSyncRes.status}`);
    assert.strictEqual(secondSyncRes.body?.status, 'SUCCESS');
    assert.strictEqual(secondSyncRes.body?.counts?.lms?.inserted, 0, '2nd sync LMS inserted must be 0');
    assert.strictEqual(secondSyncRes.body?.counts?.lms?.updated, 0, '2nd sync LMS updated must be 0');
    assert.strictEqual(secondSyncRes.body?.counts?.exam?.inserted, 0, '2nd sync EXAM inserted must be 0');
    assert.strictEqual(secondSyncRes.body?.counts?.exam?.updated, 0, '2nd sync EXAM updated must be 0');
    assert.strictEqual(secondSyncRes.body?.counts?.pm?.inserted, 0, '2nd sync PM inserted must be 0');
    assert.strictEqual(secondSyncRes.body?.counts?.pm?.updated, 0, '2nd sync PM updated must be 0');

    const recordsAfterSecondRes = await http.get(
      `${BACKEND_BASE_URL}/api/v1/staff/external-records?userId=1&page=1&size=100`,
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(recordsAfterSecondRes.status, 200);
    assert.strictEqual(
      recordsAfterSecondRes.body?.totalItems,
      recordsAfterFirstRes.body?.totalItems,
      'external_records count must remain unchanged after consecutive sync'
    );

    const afterSkillsRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(cand1.token)
    });
    assert.strictEqual(afterSkillsRes.status, 200);
    assert.strictEqual(afterSkillsRes.body?.length, 13, 'candidate1 must still have 13 skills after sync');

    const afterByCode = new Map(afterSkillsRes.body.map((item) => [item.skill?.code, item]));
    assert.strictEqual(
      Number(afterByCode.get('JAVA')?.verifiedScore),
      beforeJavaScore,
      'JAVA verifiedScore must match before and after unchanged-mock sync'
    );
    const afterJavaMentorEvidences = (afterByCode.get('JAVA')?.evidences || []).filter(
      (ev) => ev.source === 'MENTOR'
    );
    assert.strictEqual(
      afterJavaMentorEvidences.length,
      beforeJavaMentorEvidences.length,
      'MENTOR evidences must be preserved across sync'
    );

    for (const selfOnlyCode of ['COMMUNICATION', 'ENGLISH']) {
      const skill = afterByCode.get(selfOnlyCode);
      assert.ok(skill, `${selfOnlyCode} must exist in candidate1 skills`);
      assert.strictEqual(skill.verifiedScore, null, `${selfOnlyCode} must remain self-only (verifiedScore=null)`);
      assert.ok(skill.selfScore !== null, `${selfOnlyCode} must keep selfScore`);
    }

    const privateProbeRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/1/skills`, {
      headers: authHeaders(cand2.token)
    });
    assertErrorResponse(privateProbeRes, 404, 'NOT_FOUND', 'cand2 reading private candidate1 skills');

    const runsRes = await http.get(`${BACKEND_BASE_URL}/api/v1/staff/sync-runs?status=SUCCESS&userId=1&page=1&size=20`, {
      headers: authHeaders(staff1.token)
    });
    assert.strictEqual(runsRes.status, 200);
    const runItems = runsRes.body?.items || [];
    assert.ok(runItems.length >= 2, 'Expected at least 2 SUCCESS sync runs for candidate1');
    assert.strictEqual(runItems[0].id, secondSyncRes.body.id, 'Sync runs must be ordered newest first');
    assert.ok(runItems[0].candidateName && runItems[0].candidateName.length > 0, 'Sync run must include candidateName');

    for (const [label, targetUserId] of [
      ['unknown user 999999', 999999],
      ['non-candidate user 4 (HR)', 4]
    ]) {
      const notFoundRes = await http.post(
        `${BACKEND_BASE_URL}/api/v1/staff/sync/${targetUserId}`,
        {},
        { headers: authHeaders(staff1.token) }
      );
      assertErrorResponse(notFoundRes, 404, 'NOT_FOUND', `POST /staff/sync/${targetUserId} (${label})`);
    }
  });

  it('TC-T1-NT05-04: Should validate manual override boundaries on candidate3 and preserve override across re-sync', async () => {
    assert.ok(backendOnline && frontendOnline && mockOnline, 'Backend, frontend proxy, and mock must be reachable');

    const syncCand3Res = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/sync/3`,
      {},
      { headers: authHeaders(staff1.token), timeoutMs: 8000 }
    );
    assert.strictEqual(syncCand3Res.status, 200, `candidate3 sync failed: ${syncCand3Res.status}`);
    assert.strictEqual(syncCand3Res.body?.status, 'SUCCESS');
    assert.strictEqual(syncCand3Res.body?.counts?.lms?.fetched, 3);
    assert.strictEqual(syncCand3Res.body?.counts?.exam?.fetched, 1);
    assert.strictEqual(syncCand3Res.body?.counts?.pm?.fetched, 0);

    const recordsRes = await http.get(`${BACKEND_BASE_URL}/api/v1/staff/external-records?userId=3&page=1&size=100`, {
      headers: authHeaders(staff1.token)
    });
    assert.strictEqual(recordsRes.status, 200);
    const sqlRecord = (recordsRes.body?.items || []).find(
      (r) => r.source === 'LMS' && r.sourceCode === 'SQL01' && r.sourceKey === '3:SQL01'
    );
    assert.ok(sqlRecord, 'Expected canonical LMS SQL01 record for candidate3');

    const unknownOverrideRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/staff/external-records/999999/override`,
      { field: 'rpoint', value: 100, reason: 'Kiểm tra bản ghi không tồn tại' },
      { headers: authHeaders(staff1.token) }
    );
    assertErrorResponse(unknownOverrideRes, 404, 'NOT_FOUND', 'Override unknown recordId');

    for (const [label, payload] of [
      ['wrong source field finalScore', { field: 'finalScore', value: 8.0, reason: 'Sai nguồn dữ liệu' }],
      ['score > 10', { field: 'score', value: 10.5, reason: 'Điểm vượt thang 10' }],
      ['score > 2 decimals', { field: 'score', value: 8.123, reason: 'Quá 2 chữ số thập phân' }],
      ['negative rpoint', { field: 'rpoint', value: -1, reason: 'R-Point âm' }],
      ['blank reason', { field: 'rpoint', value: 200, reason: '   ' }]
    ]) {
      const invalidRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/staff/external-records/${sqlRecord.id}/override`,
        payload,
        { headers: authHeaders(staff1.token) }
      );
      assertErrorResponse(invalidRes, 400, 'VALIDATION_ERROR', `Manual override ${label}`);
    }

    const overrideReason = 'Cập nhật R-Point theo xác nhận LMS';
    const overrideRes = await http.put(
      `${FRONTEND_BASE_URL}/api/v1/staff/external-records/${sqlRecord.id}/override`,
      { field: 'rpoint', value: 250, reason: overrideReason },
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(overrideRes.status, 200, `Valid override failed: ${overrideRes.status} (${overrideRes.rawText})`);
    assert.strictEqual(Number(overrideRes.body?.payload?.rpoint), 250, 'payload.rpoint must reflect manual override 250');
    assert.ok(Array.isArray(overrideRes.body?.overrides) && overrideRes.body.overrides.length >= 1, 'overrides history must be returned');
    const latestOverride = overrideRes.body.overrides[0];
    assert.strictEqual(latestOverride.field, 'rpoint');
    assert.strictEqual(latestOverride.value, '250');
    assert.strictEqual(latestOverride.reason, overrideReason);
    assert.strictEqual(latestOverride.staffId, staff1.user.id);
    assert.strictEqual(latestOverride.staffName, staff1.user.fullName);

    const resyncCand3Res = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/sync/3`,
      {},
      { headers: authHeaders(staff1.token), timeoutMs: 8000 }
    );
    assert.strictEqual(resyncCand3Res.status, 200);
    assert.strictEqual(resyncCand3Res.body?.status, 'SUCCESS');

    const recordsAfterResyncRes = await http.get(
      `${BACKEND_BASE_URL}/api/v1/staff/external-records?userId=3&page=1&size=100`,
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(recordsAfterResyncRes.status, 200);
    const sqlAfterResync = (recordsAfterResyncRes.body?.items || []).find((r) => r.id === sqlRecord.id);
    assert.ok(sqlAfterResync, 'SQL01 record must still exist after re-sync');
    assert.strictEqual(
      Number(sqlAfterResync.payload?.rpoint),
      250,
      'Overridden rpoint=250 must survive subsequent NT-05 sync without being overwritten by mock 25'
    );
  });

  it('TC-T1-NT05-05: Should preserve raw PM source JSON payload and syncedAt across alternating NT-05 sync and TT-01 read (F1)', async () => {
    assert.ok(backendOnline && frontendOnline && mockOnline, 'Backend, frontend proxy, and mock must be reachable');

    const syncBeforeRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/sync/1`,
      {},
      { headers: authHeaders(staff1.token), timeoutMs: 8000 }
    );
    assert.strictEqual(syncBeforeRes.status, 200, `Initial sync failed: ${syncBeforeRes.status}`);
    assert.strictEqual(syncBeforeRes.body?.status, 'SUCCESS');

    const recordsBeforeRes = await http.get(
      `${BACKEND_BASE_URL}/api/v1/staff/external-records?userId=1&page=1&size=100`,
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(recordsBeforeRes.status, 200);
    const pmBefore = (recordsBeforeRes.body?.items || []).find(
      (r) => r.source === 'PM' && r.sourceCode === 'IOC-JB-2026-09' && r.sourceKey === '1:IOC-JB-2026-09'
    );
    assert.ok(pmBefore, 'Expected canonical PM IOC-JB-2026-09 record for candidate1');
    const initialSyncedAt = pmBefore.syncedAt;
    assert.ok(initialSyncedAt, 'PM record must include syncedAt');
    assert.ok(Array.isArray(pmBefore.payload?.tasks) && pmBefore.payload.tasks.length === 3, 'PM payload must include 3 tasks');
    assert.strictEqual(
      pmBefore.payload.tasks[0]?.acceptedAt,
      '2026-09-25T17:00:00+07:00',
      'PM payload must preserve original +07:00 offset before TT-01 read'
    );

    const tt01ReadRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/internships`, {
      headers: authHeaders(cand1.token),
      timeoutMs: 8000
    });
    assert.strictEqual(tt01ReadRes.status, 200, `TT-01 internships read failed: ${tt01ReadRes.status}`);
    assert.ok(
      Array.isArray(tt01ReadRes.body) && tt01ReadRes.body.some((b) => b.batchId === 'IOC-JB-2026-09'),
      'TT-01 read must return IOC-JB-2026-09 batch'
    );

    const recordsAfterTt01Res = await http.get(
      `${BACKEND_BASE_URL}/api/v1/staff/external-records?userId=1&page=1&size=100`,
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(recordsAfterTt01Res.status, 200);
    const pmAfterTt01 = (recordsAfterTt01Res.body?.items || []).find((r) => r.id === pmBefore.id);
    assert.ok(pmAfterTt01, 'PM record must remain present after TT-01 read');
    assert.strictEqual(
      pmAfterTt01.payload?.tasks?.[0]?.acceptedAt,
      '2026-09-25T17:00:00+07:00',
      'TT-01 read must not rewrite +07:00 offset to UTC Z'
    );
    assert.strictEqual(
      pmAfterTt01.syncedAt,
      initialSyncedAt,
      'TT-01 read with unchanged PM source must not update external_records.syncedAt'
    );

    const syncAfterRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/staff/sync/1`,
      {},
      { headers: authHeaders(staff1.token), timeoutMs: 8000 }
    );
    assert.strictEqual(syncAfterRes.status, 200, `Follow-up sync failed: ${syncAfterRes.status}`);
    assert.strictEqual(syncAfterRes.body?.status, 'SUCCESS');
    assert.strictEqual(syncAfterRes.body?.counts?.pm?.inserted, 0, 'Follow-up NT-05 sync pm.inserted must be 0');
    assert.strictEqual(syncAfterRes.body?.counts?.pm?.updated, 0, 'Follow-up NT-05 sync pm.updated must be 0');
  });

  it('TC-T1-NT05-06: Should reject >2 decimal rates, extreme scientific notation, and ISO control characters with 400 VALIDATION_ERROR (F9)', async () => {
    assert.ok(backendOnline && frontendOnline && mockOnline, 'Backend, frontend proxy, and mock must be reachable');

    const recordsBeforeRes = await http.get(
      `${BACKEND_BASE_URL}/api/v1/staff/external-records?userId=3&page=1&size=100`,
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(recordsBeforeRes.status, 200);
    const sqlRecord = (recordsBeforeRes.body?.items || []).find(
      (r) => r.source === 'LMS' && r.sourceCode === 'SQL01' && r.sourceKey === '3:SQL01'
    );
    assert.ok(sqlRecord, 'Expected canonical LMS SQL01 record for candidate3');

    const invalidCases = [
      ['attendanceRate 3 decimals', { field: 'attendanceRate', value: 95.123, reason: 'Kiểm tra tối đa 2 chữ số thập phân' }],
      ['attendanceRate 1e-1000', { field: 'attendanceRate', value: '1e-1000', reason: 'Kiểm tra ký hiệu khoa học 1e-1000' }],
      ['attendanceRate 1e-100000', { field: 'attendanceRate', value: '1e-100000', reason: 'Kiểm tra ký hiệu khoa học 1e-100000' }],
      ['homeworkRate 3 decimals', { field: 'homeworkRate', value: 88.123, reason: 'Kiểm tra bài tập quá 2 chữ số thập phân' }],
      ['subjectName with NUL', { field: 'subjectName', value: 'Cơ sở\u0000dữ liệu', reason: 'Kiểm tra ký tự điều khiển trong tên môn' }],
      ['reason with NUL', { field: 'rpoint', value: 260, reason: 'Lý do chứa\u0000ký tự điều khiển' }]
    ];

    for (const [label, payload] of invalidCases) {
      const invalidRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/staff/external-records/${sqlRecord.id}/override`,
        payload,
        { headers: authHeaders(staff1.token) }
      );
      assertErrorResponse(invalidRes, 400, 'VALIDATION_ERROR', `F9 override ${label}`);
      assert.ok(invalidRes.body.message && invalidRes.body.message.trim().length > 0, `${label}: message must be non-empty`);
    }

    const recordsAfterRes = await http.get(
      `${BACKEND_BASE_URL}/api/v1/staff/external-records?userId=3&page=1&size=100`,
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(recordsAfterRes.status, 200);
    const sqlRecordAfter = (recordsAfterRes.body?.items || []).find((r) => r.id === sqlRecord.id);
    assert.ok(sqlRecordAfter, 'SQL01 record must remain present after rejected F9 requests');
    assert.deepStrictEqual(
      sqlRecordAfter.payload,
      sqlRecord.payload,
      'Rejected F9 overrides must leave external_records.payload unchanged'
    );
    assert.deepStrictEqual(
      sqlRecordAfter.overrides,
      sqlRecord.overrides,
      'Rejected F9 overrides must leave manual_overrides history unchanged'
    );
  });

  it('TC-T1-NT05-07: Should allow LF/CRLF/tab in override reason while rejecting lone CR, NUL, and raw JSON 1e-100000 underflow (G7)', async () => {
    assert.ok(backendOnline && frontendOnline && mockOnline, 'Backend, frontend proxy, and mock must be reachable');

    const recordsBeforeRes = await http.get(
      `${BACKEND_BASE_URL}/api/v1/staff/external-records?userId=3&page=1&size=100`,
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(recordsBeforeRes.status, 200);
    const sqlRecord = (recordsBeforeRes.body?.items || []).find(
      (r) => r.source === 'LMS' && r.sourceCode === 'SQL01' && r.sourceKey === '3:SQL01'
    );
    assert.ok(sqlRecord, 'Expected canonical LMS SQL01 record for candidate3');

    // 1. Accepted: reason containing LF (\n) and tab (\t)
    const multilineReason = 'Dòng 1: cập nhật chuyên cần\n\tDòng 2: theo biên bản đào tạo';
    const acceptedRes = await http.put(
      `${FRONTEND_BASE_URL}/api/v1/staff/external-records/${sqlRecord.id}/override`,
      { field: 'attendanceRate', value: 94.25, reason: multilineReason },
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(
      acceptedRes.status,
      200,
      `Multiline/tab reason must return 200, got ${acceptedRes.status} (${acceptedRes.rawText})`
    );
    assert.strictEqual(Number(acceptedRes.body?.payload?.attendanceRate), 94.25);
    assert.strictEqual(acceptedRes.body?.overrides?.[0]?.reason, multilineReason);

    const snapshotAfterAccepted = acceptedRes.body;

    // 2. Rejected: lone CR (\r), NUL (\u0000), and raw JSON numeric underflow 1e-100000
    for (const [label, rawJson] of [
      [
        'lone CR in reason',
        JSON.stringify({ field: 'attendanceRate', value: 91, reason: 'Lý do\rlẻ' })
      ],
      [
        'NUL in reason',
        JSON.stringify({ field: 'attendanceRate', value: 91, reason: 'Lý do\u0000lỗi' })
      ],
      [
        'raw JSON 1e-100000 underflow',
        '{"field":"attendanceRate","value":1e-100000,"reason":"E2E underflow"}'
      ]
    ]) {
      const rejectedRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/staff/external-records/${sqlRecord.id}/override`,
        rawJson,
        {
          headers: {
            ...authHeaders(staff1.token),
            'Content-Type': 'application/json'
          }
        }
      );
      assertErrorResponse(rejectedRes, 400, 'VALIDATION_ERROR', `G7 override ${label}`);
    }

    const recordsAfterRes = await http.get(
      `${BACKEND_BASE_URL}/api/v1/staff/external-records?userId=3&page=1&size=100`,
      { headers: authHeaders(staff1.token) }
    );
    assert.strictEqual(recordsAfterRes.status, 200);
    const sqlRecordAfter = (recordsAfterRes.body?.items || []).find((r) => r.id === sqlRecord.id);
    assert.ok(sqlRecordAfter, 'SQL01 record must remain present after rejected G7 requests');
    assert.deepStrictEqual(
      sqlRecordAfter.payload,
      snapshotAfterAccepted.payload,
      'Rejected G7 requests must leave external_records.payload unchanged'
    );
    assert.deepStrictEqual(
      sqlRecordAfter.overrides,
      snapshotAfterAccepted.overrides,
      'Rejected G7 requests must leave manual_overrides history unchanged'
    );
  });
});
