// Tier 4: Real-World Scenarios — DG-01 Profile Visibility & HR Privacy Isolation
// Verifies end-to-end visibility rules for candidate evaluations:
// 1. Candidate views only own SUBMITTED evaluations ordered newest-first, never DRAFT
// 2. Each evaluation includes mentor name, context, submitted date, and per-criterion score and comment
// 3. HR (hr2@rikkeijobs.test, must_change_password = false) reads PUBLIC candidate2 (200) and gets 404 on PRIVATE candidate1 and candidate3

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { BACKEND_BASE_URL, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

const DEV_SEED_PASSWORD = ['Test', '@', '123'].join('');

async function loginAs(email) {
  const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
    email,
    password: DEV_SEED_PASSWORD
  });
  assert.strictEqual(res.status, 200, `Login failed for ${email}: status ${res.status}`);
  assert.ok(res.body && res.body.accessToken, `Missing accessToken for ${email}`);
  return {
    token: res.body.accessToken,
    user: res.body.user
  };
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('Tier 4: DG-01 Profile Visibility & HR Access Scenarios', () => {
  let backendOnline = false;
  let mentor1Auth = null;
  let candidate1Auth = null;
  let candidate2Auth = null;
  let candidate3Auth = null;
  let hr2Auth = null;
  let internshipTemplate = null;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    if (backendOnline) {
      mentor1Auth = await loginAs('mentor1@rikkeijobs.test');
      candidate1Auth = await loginAs('candidate1@rikkeijobs.test');
      candidate2Auth = await loginAs('candidate2@rikkeijobs.test');
      candidate3Auth = await loginAs('candidate3@rikkeijobs.test');
      // hr1 has must_change_password = true in V6 (blocked by MustChangePasswordFilter with 403),
      // so E2E HR checks use hr2@rikkeijobs.test matching existing e2e HR conventions.
      hr2Auth = await loginAs('hr2@rikkeijobs.test');

      const templatesRes = await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates?context=INTERNSHIP`, {
        headers: authHeaders(mentor1Auth.token)
      });
      assert.strictEqual(templatesRes.status, 200);
      internshipTemplate = templatesRes.body.find((t) => t.name === 'Java Backend – Thực tập');
      assert.ok(internshipTemplate && internshipTemplate.criteria.length === 5);
    }
  });

  // --------------------------------------------------------------------------
  // TC-T4-DG01-01: Candidate sees only SUBMITTED evaluations newest-first with full fields, never DRAFT
  // --------------------------------------------------------------------------
  it('TC-T4-DG01-01: Should show only SUBMITTED evaluations newest-first with mentor name, context, submittedAt, and per-criterion score/comment', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const draftTag = `DRAFT-${crypto.randomUUID()}`;
    const submittedTag = `SUBMITTED-${crypto.randomUUID()}`;

    // Create a DRAFT evaluation that must remain hidden
    const draftRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations`,
      {
        templateId: internshipTemplate.id,
        userId: candidate1Auth.user.id,
        context: 'INTERNSHIP',
        overallComment: draftTag,
        scores: [
          {
            criterionId: internshipTemplate.criteria[0].id,
            score: 60,
            comment: `Hidden draft comment ${draftTag}`
          }
        ]
      },
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(draftRes.status, 201);
    const draftId = draftRes.body.id;

    // Create and submit a new evaluation with distinct per-criterion comments
    const submittedInputs = internshipTemplate.criteria.map((c, idx) => ({
      criterionId: c.id,
      score: 70 + idx * 5,
      comment: `Criterion ${idx + 1} note ${submittedTag}`
    }));

    const createSubRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations`,
      {
        templateId: internshipTemplate.id,
        userId: candidate1Auth.user.id,
        context: 'INTERNSHIP',
        overallComment: submittedTag,
        scores: submittedInputs
      },
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(createSubRes.status, 201);
    const submittedId = createSubRes.body.id;

    const submitRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${submittedId}/submit`,
      {},
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(submitRes.status, 200);

    // Candidate fetches own evaluations
    const profileRes = await http.get(
      `${BACKEND_BASE_URL}/api/v1/profiles/${candidate1Auth.user.id}/evaluations`,
      { headers: authHeaders(candidate1Auth.token) }
    );
    assert.strictEqual(profileRes.status, 200, `Expected 200 OK, got ${profileRes.status}`);
    assert.strictEqual(profileRes.body.userId, candidate1Auth.user.id);
    assert.ok(Array.isArray(profileRes.body.evaluations) && profileRes.body.evaluations.length >= 2);

    const evaluations = profileRes.body.evaluations;

    // DRAFT never appears
    assert.ok(
      !evaluations.some((e) => e.id === draftId || e.overallComment === draftTag),
      'DRAFT evaluation must never appear in candidate profile evaluations'
    );

    // Newest submitted evaluation appears first
    assert.strictEqual(evaluations[0].id, submittedId, 'Newly submitted evaluation must appear first (newest first)');
    assert.strictEqual(evaluations[0].overallComment, submittedTag);
    assert.strictEqual(evaluations[0].mentor?.name, 'Phạm Quốc Dũng');

    // Verify descending submittedAt ordering and required fields across all returned evaluations
    for (let i = 0; i < evaluations.length; i++) {
      const ev = evaluations[i];
      assert.ok(ev.mentor && typeof ev.mentor.name === 'string' && ev.mentor.name.length > 0, 'Evaluation must include mentor.name');
      assert.ok(ev.context === 'INTERNSHIP' || ev.context === 'INTERVIEW', 'Evaluation must include valid context');
      assert.ok(ev.submittedAt && !Number.isNaN(Date.parse(ev.submittedAt)), 'Evaluation must include valid submittedAt date');
      assert.ok(Array.isArray(ev.scores) && ev.scores.length > 0, 'Evaluation must include criterion scores');

      for (const sc of ev.scores) {
        assert.ok(typeof sc.score === 'number', 'Each criterion must include numeric score');
        assert.ok(typeof sc.criterionDescription === 'string' && sc.criterionDescription.length > 0, 'Each criterion must include description');
        assert.ok(sc.comment === null || typeof sc.comment === 'string', 'Each criterion must include comment field');
      }

      if (i > 0) {
        const prevMs = Date.parse(evaluations[i - 1].submittedAt);
        const currMs = Date.parse(ev.submittedAt);
        assert.ok(prevMs >= currMs, `Evaluations must be ordered newest-first (${prevMs} >= ${currMs})`);
      }
    }

    // Verify exact per-criterion scores and comments on newly submitted evaluation
    const scoreMap = new Map(evaluations[0].scores.map((s) => [s.criterionId, s]));
    for (const input of submittedInputs) {
      const returnedScore = scoreMap.get(input.criterionId);
      assert.ok(returnedScore, `Returned evaluation must contain criterion ${input.criterionId}`);
      assert.strictEqual(returnedScore.score, input.score);
      assert.strictEqual(returnedScore.comment, input.comment);
    }
  });

  // --------------------------------------------------------------------------
  // TC-T4-DG01-02: HR visibility (PUBLIC candidate2 -> 200; PRIVATE candidate1 & candidate3 -> 404)
  // --------------------------------------------------------------------------
  it('TC-T4-DG01-02: Should allow HR (hr2) to view PUBLIC candidate2 evaluations (200) and return 404 for PRIVATE candidate1 and candidate3', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    // candidate2 is seeded with is_public = TRUE in V4__dev_skill_profile_seed.sql
    const publicRes = await http.get(
      `${BACKEND_BASE_URL}/api/v1/profiles/${candidate2Auth.user.id}/evaluations`,
      { headers: authHeaders(hr2Auth.token) }
    );
    assert.strictEqual(publicRes.status, 200, `HR must read PUBLIC candidate2 evaluations, got ${publicRes.status}`);
    assert.strictEqual(publicRes.body.userId, candidate2Auth.user.id);
    assert.ok(Array.isArray(publicRes.body.evaluations) && publicRes.body.evaluations.length >= 1);

    // candidate1 is seeded with is_public = FALSE in V4__dev_skill_profile_seed.sql
    const privateRes1 = await http.get(
      `${BACKEND_BASE_URL}/api/v1/profiles/${candidate1Auth.user.id}/evaluations`,
      { headers: authHeaders(hr2Auth.token) }
    );
    assert.strictEqual(privateRes1.status, 404, `HR must get 404 for PRIVATE candidate1, got ${privateRes1.status}`);
    assert.strictEqual(privateRes1.body?.code, 'NOT_FOUND');

    // candidate3 is seeded with is_public = FALSE in V4__dev_skill_profile_seed.sql
    const privateRes3 = await http.get(
      `${BACKEND_BASE_URL}/api/v1/profiles/${candidate3Auth.user.id}/evaluations`,
      { headers: authHeaders(hr2Auth.token) }
    );
    assert.strictEqual(privateRes3.status, 404, `HR must get 404 for PRIVATE candidate3, got ${privateRes3.status}`);
    assert.strictEqual(privateRes3.body?.code, 'NOT_FOUND');
  });
});
