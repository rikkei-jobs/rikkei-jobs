// Tier 1: Feature Coverage — DG-01 Mentor Evaluation on Candidate Skill Framework
// Verifies DG-01 core capabilities through opaque-box HTTP calls:
// 1. Evaluation templates listing, exact names, criteria count, skill codes, context filters, and RBAC errors
// 2. End-to-end happy path (create DRAFT -> update scores -> submit -> verified MENTOR skill evidence and score delta)
// 3. OpenAPI /api-docs exposure of all five DG-01 endpoints in dev profile

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

describe('Tier 1: DG-01 Evaluation Features (Templates, Happy Path, OpenAPI)', () => {
  let backendOnline = false;
  let mentor1Auth = null;
  let candidate1Auth = null;
  let internshipTemplate = null;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    if (backendOnline) {
      mentor1Auth = await loginAs('mentor1@rikkeijobs.test');
      candidate1Auth = await loginAs('candidate1@rikkeijobs.test');
    }
  });

  // --------------------------------------------------------------------------
  // TC-T1-DG01-01: List seeded evaluation templates and verify exact names & skill codes
  // --------------------------------------------------------------------------
  it('TC-T1-DG01-01: Should list seeded templates with exact names, 5 criteria, and expected skill codes for first template', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const res = await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates`, {
      headers: authHeaders(mentor1Auth.token)
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(Array.isArray(res.body), 'Templates response must be an array');

    const firstTemplate = res.body.find((t) => t.name === 'Java Backend – Thực tập');
    const secondTemplate = res.body.find((t) => t.name === 'Phỏng vấn kỹ thuật chung');

    assert.ok(firstTemplate, 'Template "Java Backend – Thực tập" must exist');
    assert.ok(secondTemplate, 'Template "Phỏng vấn kỹ thuật chung" must exist');
    assert.strictEqual(firstTemplate.context, 'INTERNSHIP');
    assert.strictEqual(secondTemplate.context, 'INTERVIEW');
    assert.strictEqual(firstTemplate.active, true);
    assert.strictEqual(secondTemplate.active, true);

    assert.ok(Array.isArray(firstTemplate.criteria), 'First template must contain criteria array');
    assert.strictEqual(firstTemplate.criteria.length, 5, 'First template must have exactly 5 criteria');

    // Resolve skillId -> skill metadata from candidate skill profile endpoint
    const skillsRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(skillsRes.status, 200, 'Candidate skill profile must return 200 OK');
    const skillById = new Map();
    for (const item of skillsRes.body) {
      if (item.skill && item.skill.id !== undefined) {
        skillById.set(item.skill.id, item.skill);
      }
    }

    const mappedSkills = firstTemplate.criteria.map((c) => skillById.get(c.skillId));
    assert.ok(mappedSkills.every(Boolean), 'Every criterion skillId must resolve to a known skill');

    const codes = mappedSkills.map((s) => s.code);
    const names = mappedSkills.map((s) => s.name);

    assert.deepStrictEqual(
      codes.slice().sort(),
      ['GIT', 'JAVA', 'SPRING_BOOT', 'SQL', 'TEAMWORK'].sort(),
      'First template skill codes must match Java, Spring Boot, SQL, Git, Teamwork'
    );
    assert.ok(names.includes('Lập trình Java'), 'Resolved skills must include "Lập trình Java"');
    assert.ok(names.includes('Kỹ năng làm việc nhóm'), 'Resolved skills must include "Kỹ năng làm việc nhóm"');

    internshipTemplate = firstTemplate;
  });

  // --------------------------------------------------------------------------
  // TC-T1-DG01-02: Filter evaluation templates by context and enforce query/RBAC errors
  // --------------------------------------------------------------------------
  it('TC-T1-DG01-02: Should filter templates by INTERNSHIP/INTERVIEW and reject invalid context (400), anonymous (401), and candidate (403)', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const internshipRes = await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates?context=INTERNSHIP`, {
      headers: authHeaders(mentor1Auth.token)
    });
    assert.strictEqual(internshipRes.status, 200);
    assert.ok(internshipRes.body.length >= 1, 'INTERNSHIP filter must return at least 1 template');
    assert.ok(
      internshipRes.body.every((t) => t.context === 'INTERNSHIP'),
      'All filtered templates must have context INTERNSHIP'
    );
    assert.ok(
      internshipRes.body.some((t) => t.name === 'Java Backend – Thực tập'),
      'INTERNSHIP filter must include "Java Backend – Thực tập"'
    );

    const interviewRes = await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates?context=INTERVIEW`, {
      headers: authHeaders(mentor1Auth.token)
    });
    assert.strictEqual(interviewRes.status, 200);
    assert.ok(interviewRes.body.length >= 1, 'INTERVIEW filter must return at least 1 template');
    assert.ok(
      interviewRes.body.every((t) => t.context === 'INTERVIEW'),
      'All filtered templates must have context INTERVIEW'
    );
    assert.ok(
      interviewRes.body.some((t) => t.name === 'Phỏng vấn kỹ thuật chung'),
      'INTERVIEW filter must include "Phỏng vấn kỹ thuật chung"'
    );

    // Unknown context -> 400 with unified error body { code, message }
    const badContextRes = await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates?context=UNKNOWN`, {
      headers: authHeaders(mentor1Auth.token)
    });
    assert.strictEqual(badContextRes.status, 400, `Expected 400 for unknown context, got ${badContextRes.status}`);
    assert.ok(badContextRes.body && typeof badContextRes.body.code === 'string', 'Error body must contain code');
    assert.ok(
      badContextRes.body && typeof badContextRes.body.message === 'string' && badContextRes.body.message.length > 0,
      'Error body must contain non-empty message'
    );
    assert.strictEqual(badContextRes.body.code, 'VALIDATION_ERROR');

    // Anonymous -> 401
    const anonymousRes = await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates`);
    assert.strictEqual(anonymousRes.status, 401, `Expected 401 for anonymous request, got ${anonymousRes.status}`);
    assert.strictEqual(anonymousRes.body?.code, 'UNAUTHORIZED');

    // Candidate -> 403
    const candidateRes = await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(candidateRes.status, 403, `Expected 403 for candidate role, got ${candidateRes.status}`);
    assert.strictEqual(candidateRes.body?.code, 'FORBIDDEN');
  });

  // --------------------------------------------------------------------------
  // TC-T1-DG01-03: Happy path (DRAFT -> PUT -> SUBMIT -> verified MENTOR evidence & score delta)
  // --------------------------------------------------------------------------
  it('TC-T1-DG01-03: Should create DRAFT, update scores, submit to 200, record verified MENTOR evidence, and update verifiedScore', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    if (!internshipTemplate) {
      const templatesRes = await http.get(`${BACKEND_BASE_URL}/api/v1/evaluation-templates?context=INTERNSHIP`, {
        headers: authHeaders(mentor1Auth.token)
      });
      assert.strictEqual(templatesRes.status, 200);
      internshipTemplate = templatesRes.body.find((t) => t.name === 'Java Backend – Thực tập');
    }
    assert.ok(internshipTemplate && internshipTemplate.criteria.length === 5, 'Internship template with 5 criteria required');

    // 1. Read candidate1 skill profile BEFORE submit
    const beforeProfileRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(beforeProfileRes.status, 200);
    const beforeSkillMap = new Map(beforeProfileRes.body.map((item) => [item.skill.id, item]));
    const beforeTotalMentorEvidences = countMentorEvidences(beforeProfileRes.body);

    // Compute dynamic scores distant from current verifiedScore so score always changes across repeated runs
    const targetScoreByCriterion = new Map();
    for (const criterion of internshipTemplate.criteria) {
      const skillItem = beforeSkillMap.get(criterion.skillId);
      const currentVerified = skillItem && skillItem.verifiedScore !== null ? Number(skillItem.verifiedScore) : 0;
      const chosenScore = currentVerified >= 50 ? 10 : 98;
      targetScoreByCriterion.set(criterion.id, chosenScore);
    }

    // 2. Create partial DRAFT (first 2 criteria)
    const runTag = crypto.randomUUID();
    const createRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations`,
      {
        templateId: internshipTemplate.id,
        userId: candidate1Auth.user.id,
        context: 'INTERNSHIP',
        batchId: 1,
        overallComment: `Draft happy path ${runTag}`,
        scores: internshipTemplate.criteria.slice(0, 2).map((c) => ({
          criterionId: c.id,
          score: targetScoreByCriterion.get(c.id),
          comment: `Partial score ${runTag}`
        }))
      },
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(createRes.status, 201, `Expected 201 Created, got ${createRes.status}: ${createRes.rawText}`);
    assert.strictEqual(createRes.body.status, 'DRAFT');
    assert.strictEqual(createRes.body.submittedAt, null);
    const evaluationId = createRes.body.id;
    assert.ok(evaluationId, 'Created evaluation must have an id');

    // 3. Update all 5 criteria via PUT
    const updateRes = await http.put(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${evaluationId}`,
      {
        overallComment: `Complete happy path ${runTag}`,
        scores: internshipTemplate.criteria.map((c) => ({
          criterionId: c.id,
          score: targetScoreByCriterion.get(c.id),
          comment: `Full score ${c.skillId} ${runTag}`
        }))
      },
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(updateRes.status, 200, `Expected 200 OK on PUT, got ${updateRes.status}: ${updateRes.rawText}`);

    // 4. Submit evaluation
    const submitRes = await http.post(
      `${BACKEND_BASE_URL}/api/v1/evaluations/${evaluationId}/submit`,
      {},
      { headers: authHeaders(mentor1Auth.token) }
    );
    assert.strictEqual(submitRes.status, 200, `Expected 200 OK on submit, got ${submitRes.status}: ${submitRes.rawText}`);

    // 5. Read candidate1 skill profile AFTER submit and verify MENTOR evidences & verifiedScore delta
    const afterProfileRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/me/skills`, {
      headers: authHeaders(candidate1Auth.token)
    });
    assert.strictEqual(afterProfileRes.status, 200);
    const afterSkillMap = new Map(afterProfileRes.body.map((item) => [item.skill.id, item]));
    const afterTotalMentorEvidences = countMentorEvidences(afterProfileRes.body);

    assert.strictEqual(
      afterTotalMentorEvidences,
      beforeTotalMentorEvidences + internshipTemplate.criteria.length,
      'Submitting evaluation must add exactly 5 MENTOR evidences'
    );

    let changedVerifiedScoreCount = 0;
    for (const criterion of internshipTemplate.criteria) {
      const beforeItem = beforeSkillMap.get(criterion.skillId);
      const afterItem = afterSkillMap.get(criterion.skillId);
      assert.ok(afterItem, `Skill ${criterion.skillId} must exist in candidate profile`);

      const expectedScore = targetScoreByCriterion.get(criterion.id);
      const beforeMatchingCount = (beforeItem?.evidences || []).filter(
        (e) =>
          e.source === 'MENTOR' &&
          e.verified === true &&
          e.title === criterion.description &&
          Number(e.score) === expectedScore
      ).length;
      const afterMatchingCount = (afterItem.evidences || []).filter(
        (e) =>
          e.source === 'MENTOR' &&
          e.verified === true &&
          e.title === criterion.description &&
          Number(e.score) === expectedScore
      ).length;

      assert.strictEqual(
        afterMatchingCount,
        beforeMatchingCount + 1,
        `Skill ${afterItem.skill.code} must gain a verified MENTOR evidence with score ${expectedScore}`
      );

      const beforeScoreVal = beforeItem && beforeItem.verifiedScore !== null ? Number(beforeItem.verifiedScore) : null;
      const afterScoreVal = afterItem.verifiedScore !== null ? Number(afterItem.verifiedScore) : null;
      if (afterScoreVal !== beforeScoreVal) {
        changedVerifiedScoreCount++;
      }
    }

    assert.ok(
      changedVerifiedScoreCount >= 1,
      'At least one evaluated skill must change verifiedScore after submit'
    );
  });

  // --------------------------------------------------------------------------
  // TC-T1-DG01-04: OpenAPI /api-docs contains all 5 DG-01 endpoints
  // --------------------------------------------------------------------------
  it('TC-T1-DG01-04: Should expose all five DG-01 endpoints in OpenAPI /api-docs in dev profile', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const res = await http.get(`${BACKEND_BASE_URL}/api-docs`);
    assert.strictEqual(res.status, 200, `Expected 200 OK from /api-docs, got ${res.status}`);
    assert.ok(res.body && res.body.paths, 'OpenAPI response must contain paths object');

    const paths = res.body.paths;
    assert.ok(paths['/api/v1/evaluation-templates']?.get, 'Missing GET /api/v1/evaluation-templates in /api-docs');
    assert.ok(paths['/api/v1/evaluations']?.post, 'Missing POST /api/v1/evaluations in /api-docs');
    assert.ok(paths['/api/v1/evaluations/{id}']?.put, 'Missing PUT /api/v1/evaluations/{id} in /api-docs');
    assert.ok(paths['/api/v1/evaluations/{id}/submit']?.post, 'Missing POST /api/v1/evaluations/{id}/submit in /api-docs');
    assert.ok(
      paths['/api/v1/profiles/{userId}/evaluations']?.get,
      'Missing GET /api/v1/profiles/{userId}/evaluations in /api-docs'
    );
  });
});
