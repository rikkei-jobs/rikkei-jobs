// Tier 2: Boundaries, Acceptance Errors & Concurrency — DG-01 Mentor Evaluation
// Verifies DG-01 negative boundaries and concurrent submit safety:
// 1. Submit with missing criterion score -> 400 (state remains DRAFT, no new MENTOR evidence)
// 2. Score out of range (101 and -1) -> 400
// 3. mentor2 updating/submitting mentor1 evaluation -> 404 (never 403 or 200)
// 4. Update or second submit on SUBMITTED evaluation -> 409 (evidence count unchanged)
// 5. candidate2 reading candidate1 evaluations -> 404
// 6. Candidate POST /evaluations -> 403; anonymous calls across DG-01 endpoints -> 401
// 7. Simultaneous HTTP submits -> exactly one 200 and one 409, evidences created once

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

function countMentorEvidences(skillItems) {
  let count = 0;
  for (const item of skillItems) {
    if (Array.isArray(item.evidences)) {
      for (const ev of item.evidences) {
        if (ev.source === 'MENTOR') {
          count++;
        }
      }
    }
  }
  return count;
}

describe('Tier 2: DG-01 Evaluation Boundaries, IDOR & Concurrency', () => {
  let backendOnline = false;
  let mentor1Auth = null;
  let mentor2Auth = null;
  let candidate1Auth = null;
  let candidate2Auth = null;
  let internshipTemplate = null;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    if (backendOnline) {
      mentor1Auth = await loginAs('mentor1@rikkeijobs.test');
      mentor2Auth = await loginAs('mentor2@rikkeijobs.test');
      candidate1Auth = await loginAs('candidate1@rikkeijobs.test');
      candidate2Auth = await loginAs('candidate2@rikkeijobs.test');

      const templatesRes = await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates?context=INTERNSHIP`, {
        headers: authHeaders(mentor1Auth.token)
      });
      assert.strictEqual(templatesRes.status, 200);
      internshipTemplate = templatesRes.body.find((t) => t.name === 'Java Backend – Thực tập');
      assert.ok(internshipTemplate && internshipTemplate.criteria.length === 5);
    }
  });

  // --------------------------------------------------------------------------
  // TC-T2-DG01-01: Incomplete submit 400 (no state/evidence change) & score range 101/-1 -> 400
  // --------------------------------------------------------------------------
  it('TC-T2-DG01-01: Should reject incomplete submit with 400 without changing DRAFT or evidences, and reject scores 101 and -1 with 400', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const tag = crypto.randomUUID();
    const createRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations`,
      {
        templateId: internshipTemplate.id,
        userId: candidate1Auth.user.id,
        context: 'INTERNSHIP',
        overallComment: `Incomplete draft ${tag}`,
        scores: internshipTemplate.criteria.slice(0, 4).map((c) => ({
          criterionId: c.id,
          score: 75,
          comment: `Scored 4 of 5 ${tag}`
        }))
      },
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(createRes.status, 201);
    const draftId = createRes.body.id;

    const beforeSkills = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(beforeSkills.status, 200);
    const beforeEvidenceTotal = countMentorEvidences(beforeSkills.body);

    // Submit with 1 criterion missing a score -> 400
    const incompleteSubmitRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${draftId}/submit`,
      {},
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(incompleteSubmitRes.status, 400, `Expected 400, got ${incompleteSubmitRes.status}`);
    assert.strictEqual(incompleteSubmitRes.body?.code, 'VALIDATION_ERROR');

    // Confirm DRAFT did not appear in submitted profile evaluations and MENTOR evidence count did not change
    const evaluationsRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${candidate1Auth.user.id}/evaluations`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(evaluationsRes.status, 200);
    assert.ok(
      !evaluationsRes.body.evaluations.some((e) => e.id === draftId),
      'Failed submit must leave evaluation as DRAFT and invisible in submitted list'
    );

    const afterSkills = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(afterSkills.status, 200);
    assert.strictEqual(
      countMentorEvidences(afterSkills.body),
      beforeEvidenceTotal,
      'Failed incomplete submit must not create MENTOR evidences'
    );

    // Score 101 -> 400
    const highScoreRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${draftId}`,
      {
        overallComment: `High score test ${tag}`,
        scores: [{ criterionId: internshipTemplate.criteria[0].id, score: 101, comment: 'Too high' }]
      },
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(highScoreRes.status, 400, `Expected 400 for score 101, got ${highScoreRes.status}`);
    assert.strictEqual(highScoreRes.body?.code, 'VALIDATION_ERROR');

    // Score -1 -> 400
    const negativeScoreRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${draftId}`,
      {
        overallComment: `Negative score test ${tag}`,
        scores: [{ criterionId: internshipTemplate.criteria[0].id, score: -1, comment: 'Too low' }]
      },
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(negativeScoreRes.status, 400, `Expected 400 for score -1, got ${negativeScoreRes.status}`);
    assert.strictEqual(negativeScoreRes.body?.code, 'VALIDATION_ERROR');
  });

  // --------------------------------------------------------------------------
  // TC-T2-DG01-02: Cross-mentor IDOR (mentor2 -> 404) & SUBMITTED conflict (409)
  // --------------------------------------------------------------------------
  it('TC-T2-DG01-02: Should return 404 when mentor2 updates/submits mentor1 evaluation, and 409 on update/resubmit of SUBMITTED evaluation', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const tag = crypto.randomUUID();
    const createRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations`,
      {
        templateId: internshipTemplate.id,
        userId: candidate1Auth.user.id,
        context: 'INTERNSHIP',
        overallComment: `Ownership test ${tag}`,
        scores: internshipTemplate.criteria.map((c) => ({
          criterionId: c.id,
          score: 80,
          comment: `Baseline score ${tag}`
        }))
      },
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(createRes.status, 201);
    const evaluationId = createRes.body.id;

    // mentor2 attempting PUT on mentor1 evaluation -> 404 (never 403 or 200)
    const mentor2PutRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${evaluationId}`,
      {
        overallComment: 'Cross-mentor edit attempt',
        scores: [{ criterionId: internshipTemplate.criteria[0].id, score: 50, comment: 'Attempt' }]
      },
      { headers: authHeaders(mentor2Auth.token) }
    );
    assert.notStrictEqual(mentor2PutRes.status, 403, 'IDOR update must return 404, never 403');
    assert.notStrictEqual(mentor2PutRes.status, 200, 'IDOR update must never succeed with 200');
    assert.strictEqual(mentor2PutRes.status, 404, `Expected 404 for mentor2 update, got ${mentor2PutRes.status}`);
    assert.strictEqual(mentor2PutRes.body?.code, 'NOT_FOUND');

    // mentor2 attempting submit on mentor1 evaluation -> 404 (never 403 or 200)
    const mentor2SubmitRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${evaluationId}/submit`,
      {},
      { headers: authHeaders(mentor2Auth.token) }
    );
    assert.notStrictEqual(mentor2SubmitRes.status, 403, 'IDOR submit must return 404, never 403');
    assert.notStrictEqual(mentor2SubmitRes.status, 200, 'IDOR submit must never succeed with 200');
    assert.strictEqual(mentor2SubmitRes.status, 404, `Expected 404 for mentor2 submit, got ${mentor2SubmitRes.status}`);
    assert.strictEqual(mentor2SubmitRes.body?.code, 'NOT_FOUND');

    // mentor1 submits evaluation -> 200
    const submitRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${evaluationId}/submit`,
      {},
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(submitRes.status, 200);

    const skillsAfterFirst = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(skillsAfterFirst.status, 200);
    const countAfterFirst = countMentorEvidences(skillsAfterFirst.body);

    // Update on SUBMITTED evaluation -> 409
    const putSubmittedRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${evaluationId}`,
      {
        overallComment: 'Edit after submit',
        scores: [{ criterionId: internshipTemplate.criteria[0].id, score: 90, comment: 'Late edit' }]
      },
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(putSubmittedRes.status, 409, `Expected 409 on PUT after submit, got ${putSubmittedRes.status}`);
    assert.strictEqual(putSubmittedRes.body?.code, 'CONFLICT');

    // Second submit on SUBMITTED evaluation -> 409 and evidence count unchanged
    const secondSubmitRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${evaluationId}/submit`,
      {},
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(secondSubmitRes.status, 409, `Expected 409 on second submit, got ${secondSubmitRes.status}`);
    assert.strictEqual(secondSubmitRes.body?.code, 'CONFLICT');

    const skillsAfterSecond = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(skillsAfterSecond.status, 200);
    assert.strictEqual(
      countMentorEvidences(skillsAfterSecond.body),
      countAfterFirst,
      'Second submit must not grow MENTOR evidences'
    );
  });

  // --------------------------------------------------------------------------
  // TC-T2-DG01-03: Candidate IDOR (404), Candidate POST /evaluations (403), Anonymous (401)
  // --------------------------------------------------------------------------
  it('TC-T2-DG01-03: Should enforce candidate cross-profile 404, candidate POST /evaluations 403, and anonymous 401 across DG-01 endpoints', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    // candidate2 reading candidate1 evaluations -> 404
    const candidate2ReadCandidate1 = await http.get(
      `${BACKEND_BASE_URL}/api/v1/profiles/${candidate1Auth.user.id}/evaluations`,
      { headers: authHeaders(candidate2Auth.token) }
    );
    assert.strictEqual(candidate2ReadCandidate1.status, 404, `Expected 404 for cross-candidate read, got ${candidate2ReadCandidate1.status}`);
    assert.strictEqual(candidate2ReadCandidate1.body?.code, 'NOT_FOUND');

    // candidate1 calling POST /evaluations -> 403
    const candidatePostEvaluation = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations`,
      {
        templateId: internshipTemplate.id,
        userId: candidate1Auth.user.id,
        context: 'INTERNSHIP',
        scores: []
      },
      { headers: authHeaders(candidate1Auth.token) }
    );
    assert.strictEqual(candidatePostEvaluation.status, 403, `Expected 403 for candidate POST /evaluations, got ${candidatePostEvaluation.status}`);
    assert.strictEqual(candidatePostEvaluation.body?.code, 'FORBIDDEN');

    // Anonymous calls across DG-01 endpoints -> 401
    const anonymousRequests = [
      http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates`),
      http.post(`${BACKEND_BASE_URL}/api/v1/evaluations`, {
        templateId: internshipTemplate.id,
        userId: candidate1Auth.user.id,
        context: 'INTERNSHIP'
      }),
      http.put(`${BACKEND_BASE_URL}/api/v1/evaluations/1`, { scores: [] }),
      http.post(`${BACKEND_BASE_URL}/api/v1/evaluations/1/submit`, {}),
      http.get(`${BACKEND_BASE_URL}/api/v1/profiles/${candidate1Auth.user.id}/evaluations`)
    ];
    const anonymousResponses = await Promise.all(anonymousRequests);
    for (const res of anonymousResponses) {
      assert.strictEqual(res.status, 401, `Anonymous call must return 401, got ${res.status}`);
      assert.strictEqual(res.body?.code, 'UNAUTHORIZED');
    }
  });

  // --------------------------------------------------------------------------
  // TC-T2-DG01-04: HTTP-level concurrency (two simultaneous submits -> 200 + 409, single evidence batch)
  // --------------------------------------------------------------------------
  it('TC-T2-DG01-04: Should resolve simultaneous HTTP submits with exactly one 200 and one 409, creating MENTOR evidences once', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const tag = crypto.randomUUID();
    const createRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations`,
      {
        templateId: internshipTemplate.id,
        userId: candidate1Auth.user.id,
        context: 'INTERNSHIP',
        overallComment: `Concurrent submit ${tag}`,
        scores: internshipTemplate.criteria.map((c) => ({
          criterionId: c.id,
          score: 88,
          comment: `Concurrent score ${tag}`
        }))
      },
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(createRes.status, 201);
    const concurrentEvaluationId = createRes.body.id;

    const beforeSkills = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(beforeSkills.status, 200);
    const beforeEvidenceTotal = countMentorEvidences(beforeSkills.body);

    const [resA, resB] = await Promise.all([
      http.post(
        `${BACKEND_BASE_URL}/api/v1/evaluations/${concurrentEvaluationId}/submit`,
        {},
        { headers: authHeaders(mentor1Auth.token) }
      ),
      http.post(
        `${BACKEND_BASE_URL}/api/v1/evaluations/${concurrentEvaluationId}/submit`,
        {},
        { headers: authHeaders(mentor1Auth.token) }
      )
    ]);

    const sortedStatuses = [resA.status, resB.status].sort((a, b) => a - b);
    assert.deepStrictEqual(
      sortedStatuses,
      [200, 409],
      `Simultaneous submits must return [200, 409], got [${resA.status}, ${resB.status}]`
    );

    const conflictResponse = resA.status === 409 ? resA : resB;
    assert.strictEqual(conflictResponse.body?.code, 'CONFLICT');

    const afterSkills = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(afterSkills.status, 200);
    assert.strictEqual(
      countMentorEvidences(afterSkills.body),
      beforeEvidenceTotal + internshipTemplate.criteria.length,
      'Simultaneous submits must create MENTOR evidences exactly once (5 records)'
    );
  });
});
