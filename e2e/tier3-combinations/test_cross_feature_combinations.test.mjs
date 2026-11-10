// Tier 3: Pairwise Combinations & Cross-Feature Interactions
// Verifies multi-step feature interactions, state progression, and architectural contract boundaries

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_BASE_URL, SERVICE_KEY, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

const authHeaders = {
  'X-Service-Key': SERVICE_KEY,
  'Content-Type': 'application/json'
};

describe('Tier 3: Pairwise & Cross-Feature Combinations', async () => {
  let mockOnline = false;

  before(async () => {
    mockOnline = await isReachable(MOCK_BASE_URL);
    if (!mockOnline) {
      console.warn(`[WARN] Mock service at ${MOCK_BASE_URL} is currently unreachable.`);
    } else {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
    }
  });

  after(async () => {
    if (mockOnline) {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
    }
  });

  // ------------------------------------------------------------------------
  // Pair 1: Full SSO Chain (Issue Ticket -> Verify -> Profile -> Results)
  // ------------------------------------------------------------------------
  it('Pair 1: Should correlate data across SSO ticket issue, verify, student profile, and results', async () => {
    // Step 1: Issue SSO Ticket
    const ticketRes = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, {
      lmsUserId: 'lms-sv-001'
    }, { headers: authHeaders });
    assert.strictEqual(ticketRes.status, 201);
    const { ticket } = ticketRes.body;

    // Step 2: Verify SSO Ticket
    const verifyRes = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, { ticket }, { headers: authHeaders });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.lmsUserId, 'lms-sv-001');
    assert.strictEqual(verifyRes.body.role, 'CANDIDATE');

    // Step 3: Fetch Student Profile using verified userId
    const profileRes = await http.get(`${MOCK_BASE_URL}/lms/students/${verifyRes.body.lmsUserId}`, { headers: authHeaders });
    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileRes.body.email, verifyRes.body.email);
    assert.strictEqual(profileRes.body.fullName, verifyRes.body.fullName);

    // Step 4: Fetch Academic Results
    const resultsRes = await http.get(`${MOCK_BASE_URL}/lms/students/${verifyRes.body.lmsUserId}/results`, { headers: authHeaders });
    assert.strictEqual(resultsRes.status, 200);
    assert.ok(Array.isArray(resultsRes.body));
    assert.strictEqual(resultsRes.body.length, 5);
  });

  // ------------------------------------------------------------------------
  // Pair 2: Architectural Contract Boundary (Mock does NOT block ticket reuse)
  // ------------------------------------------------------------------------
  it('Pair 2: Should confirm Mock allows repeated ticket verification (Replay contract)', async () => {
    const ticketRes = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, {
      lmsUserId: 'lms-sv-002'
    }, { headers: authHeaders });
    const { ticket } = ticketRes.body;

    // First verification call
    const verify1 = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, { ticket }, { headers: authHeaders });
    assert.strictEqual(verify1.status, 200);

    // Second verification call with same ticket (Mock must NOT consume ticket)
    const verify2 = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, { ticket }, { headers: authHeaders });
    assert.strictEqual(verify2.status, 200);
    assert.strictEqual(verify2.body.lmsUserId, 'lms-sv-002');
  });

  // ------------------------------------------------------------------------
  // Pair 3: Course Lifecycle (Enroll -> Query -> Patch Progress -> Re-Query)
  // ------------------------------------------------------------------------
  it('Pair 3: Should transition course state from ENROLLED to COMPLETED and verify consistency', async () => {
    const lmsUserId = 'lms-sv-001';
    const courseId = 'LMS-C-SPRING-01';

    // Step 1: Enroll
    const enrollRes = await http.post(`${MOCK_BASE_URL}/lms/enrollments`, {
      lmsUserId,
      courseId
    }, { headers: authHeaders });
    assert.strictEqual(enrollRes.status, 201);
    assert.strictEqual(enrollRes.body.status, 'ENROLLED');
    assert.strictEqual(enrollRes.body.progress, 0);

    // Step 2: Query initial state
    const query1 = await http.get(`${MOCK_BASE_URL}/lms/enrollments/${lmsUserId}`, { headers: authHeaders });
    const item1 = query1.body.find(e => e.courseId === courseId);
    assert.ok(item1);
    assert.strictEqual(item1.progress, 0);

    // Step 3: Patch to COMPLETED via test tool
    const patchRes = await http.patch(`${MOCK_BASE_URL}/mock/enrollments`, {
      lmsUserId,
      courseId,
      progress: 100,
      score: 9.0,
      status: 'COMPLETED'
    });
    assert.strictEqual(patchRes.status, 200);

    // Step 4: Re-query and verify persistence in runtime memory
    const query2 = await http.get(`${MOCK_BASE_URL}/lms/enrollments/${lmsUserId}`, { headers: authHeaders });
    const item2 = query2.body.find(e => e.courseId === courseId);
    assert.ok(item2);
    assert.strictEqual(item2.progress, 100);
    assert.strictEqual(item2.score, 9.0);
    assert.strictEqual(item2.status, 'COMPLETED');
  });

  // ------------------------------------------------------------------------
  // Pair 4: Batch Membership & Reset Cycle (Add -> 409 -> Reset -> Re-Add 201)
  // ------------------------------------------------------------------------
  it('Pair 4: Should enforce membership conflict and restore capability after /mock/reset', async () => {
    const batchId = 'IOC-JB-2026-12';
    const lmsUserId = 'lms-sv-001';

    // Add member
    const add1 = await http.post(`${MOCK_BASE_URL}/pm/batches/${batchId}/members`, { lmsUserId }, { headers: authHeaders });
    assert.strictEqual(add1.status, 201);

    // Add duplicate -> 409 Conflict
    const add2 = await http.post(`${MOCK_BASE_URL}/pm/batches/${batchId}/members`, { lmsUserId }, { headers: authHeaders });
    assert.strictEqual(add2.status, 409);
    assert.strictEqual(add2.body.code, 'ALREADY_MEMBER');

    // Reset memory
    const resetRes = await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
    assert.strictEqual(resetRes.status, 200);

    // Re-add after reset -> 201 Created
    const add3 = await http.post(`${MOCK_BASE_URL}/pm/batches/${batchId}/members`, { lmsUserId }, { headers: authHeaders });
    assert.strictEqual(add3.status, 201);
  });

  // ------------------------------------------------------------------------
  // Pair 5: Request Log Audit Trail (Keyed vs Unkeyed Logging)
  // ------------------------------------------------------------------------
  it('Pair 5: Should accurately flag hasKey: true and hasKey: false in request audit trail', async () => {
    await http.post(`${MOCK_BASE_URL}/mock/reset`, {});

    // Request with key
    await http.get(`${MOCK_BASE_URL}/lms/courses?skill=GIT`, { headers: authHeaders });

    // Request without key
    await http.get(`${MOCK_BASE_URL}/lms/courses?skill=GIT`);

    // Inspect request log
    const logRes = await http.get(`${MOCK_BASE_URL}/mock/requests`);
    assert.strictEqual(logRes.status, 200);
    assert.ok(logRes.body.length >= 2);

    // Most recent is at index 0 (unkeyed)
    assert.strictEqual(logRes.body[0].hasKey, false);
    // Prior request is at index 1 (keyed)
    assert.strictEqual(logRes.body[1].hasKey, true);
  });

  // ------------------------------------------------------------------------
  // Pair 6: Skill Discovery & Multi-Enrollment Flow
  // ------------------------------------------------------------------------
  it('Pair 6: Should discover course by skill filter and successfully enroll candidate', async () => {
    // Discover courses teaching DOCKER
    const searchRes = await http.get(`${MOCK_BASE_URL}/lms/courses?skill=DOCKER`, { headers: authHeaders });
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.length > 0);
    const targetCourse = searchRes.body[0];

    // Enroll candidate 3
    const enrollRes = await http.post(`${MOCK_BASE_URL}/lms/enrollments`, {
      lmsUserId: 'lms-sv-003',
      courseId: targetCourse.courseId
    }, { headers: authHeaders });
    assert.strictEqual(enrollRes.status, 201);
    assert.strictEqual(enrollRes.body.courseId, targetCourse.courseId);

    // Verify enrollment list
    const listRes = await http.get(`${MOCK_BASE_URL}/lms/enrollments/lms-sv-003`, { headers: authHeaders });
    assert.ok(listRes.body.some(e => e.courseId === targetCourse.courseId));
  });
});
