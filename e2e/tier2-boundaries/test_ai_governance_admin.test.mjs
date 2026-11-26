// Tier 2: Boundaries, RBAC, Validation & Gateway Behavior — AI-05 Governance & Admin API
// Verifies runtime behavior of /api/v1/admin/ai-* and /api/v1/me/job-recommendations (A2, A3, A6, A9):
// 1. 401 UNAUTHORIZED (anonymous) and 403 FORBIDDEN / MUST_CHANGE_PASSWORD (non-ADMIN) on all 4 admin endpoints
// 2. 400 VALIDATION_ERROR {"code","message"} on invalid query params for ai-logs and ai-usage/summary
// 3. 409 CONFLICT on stale version in PUT /api/v1/admin/ai-config + A6 unconfigured key & malicious model rejection
// 4. A3 disabled mode (enabled=false) returns 200 notice with 0 new ai_logs rows across multiple views
// 5. A2 quota exhaustion degrades gracefully to 200 fallback + notice (max 1 BLOCKED row) and summary matches logs

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { BACKEND_BASE_URL, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';
import {
  DEV_SEED_PASSWORD,
  authHeaders,
  loginUser,
  assertUnifiedErrorResponse
} from '../helpers/company-fixtures.mjs';

const DISABLED_NOTICE = 'AI đang tạm tắt';
const QUOTA_REACHED_NOTICE =
  'Đã đạt hạn mức giải thích AI trong ngày. Đang hiển thị gợi ý phù hợp theo kỹ năng.';
const MISSING_KEY_MESSAGE = 'Chưa cấu hình khóa API cho nhà cung cấp này';

function utcTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function getAdminConfig(adminToken) {
  const res = await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-config`, {
    headers: authHeaders(adminToken)
  });
  assert.strictEqual(res.status, 200, `GET /admin/ai-config failed: ${res.status} ${res.rawText}`);
  return res.body;
}

async function restoreAdminConfig(adminToken, initial) {
  const latest = await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-config`, {
    headers: authHeaders(adminToken)
  });
  if (latest.status !== 200 || !latest.body) return;
  await http.put(
    `${BACKEND_BASE_URL}/api/v1/admin/ai-config`,
    {
      provider: initial.provider,
      model: initial.model,
      temperature: initial.temperature,
      maxTokens: initial.maxTokens,
      dailyLimitPerUser: initial.dailyLimitPerUser,
      enabled: initial.enabled,
      version: latest.body.version
    },
    { headers: authHeaders(adminToken) }
  );
}

describe('Tier 2: AI-05 Governance, RBAC, Validation & Gateway Boundaries', () => {
  let backendOnline = false;
  let admin1 = null;
  let cand1 = null;
  let cand3 = null;
  let hr1 = null;
  let hr2 = null;
  let mentor1 = null;
  let staff1 = null;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    if (backendOnline) {
      admin1 = await loginUser(BACKEND_BASE_URL, 'admin1@rikkeijobs.test', DEV_SEED_PASSWORD);
      cand1 = await loginUser(BACKEND_BASE_URL, 'candidate1@rikkeijobs.test', DEV_SEED_PASSWORD);
      cand3 = await loginUser(BACKEND_BASE_URL, 'candidate3@rikkeijobs.test', DEV_SEED_PASSWORD);
      hr1 = await loginUser(BACKEND_BASE_URL, 'hr1@rikkeijobs.test', DEV_SEED_PASSWORD);
      hr2 = await loginUser(BACKEND_BASE_URL, 'hr2@rikkeijobs.test', DEV_SEED_PASSWORD);
      mentor1 = await loginUser(BACKEND_BASE_URL, 'mentor1@rikkeijobs.test', DEV_SEED_PASSWORD);
      staff1 = await loginUser(BACKEND_BASE_URL, 'staff1@rikkeijobs.test', DEV_SEED_PASSWORD);
    }
  });

  it('TC-T2-AI-01: Should enforce 401 anonymous and 403 non-ADMIN on all 4 /api/v1/admin/ai-* endpoints', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');

    const samplePutBody = {
      provider: 'MOCK',
      model: 'mock',
      temperature: 0.3,
      maxTokens: 150,
      dailyLimitPerUser: 100,
      enabled: true,
      version: 0
    };

    const anonCalls = [
      ['anon GET /admin/ai-config', await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-config`)],
      ['anon PUT /admin/ai-config', await http.put(`${BACKEND_BASE_URL}/api/v1/admin/ai-config`, samplePutBody)],
      ['anon GET /admin/ai-logs', await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-logs`)],
      ['anon GET /admin/ai-usage/summary', await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-usage/summary`)]
    ];
    for (const [label, res] of anonCalls) {
      assert.strictEqual(res.status, 401, `${label}: expected 401, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED', `${label}: expected UNAUTHORIZED`);
    }

    for (const [roleName, actor] of [
      ['CANDIDATE', cand1],
      ['HR', hr2],
      ['MENTOR', mentor1],
      ['STAFF', staff1]
    ]) {
      const h = authHeaders(actor.token);
      const calls = [
        [`${roleName} GET /admin/ai-config`, await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-config`, { headers: h })],
        [`${roleName} PUT /admin/ai-config`, await http.put(`${BACKEND_BASE_URL}/api/v1/admin/ai-config`, samplePutBody, { headers: h })],
        [`${roleName} GET /admin/ai-logs`, await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-logs`, { headers: h })],
        [`${roleName} GET /admin/ai-usage/summary`, await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-usage/summary`, { headers: h })]
      ];
      for (const [label, res] of calls) {
        assert.strictEqual(res.status, 403, `${label}: expected 403, got ${res.status}`);
        assertUnifiedErrorResponse(res);
        assert.strictEqual(res.body.code, 'FORBIDDEN', `${label}: expected FORBIDDEN`);
      }
    }

    const hr1H = authHeaders(hr1.token);
    for (const [label, res] of [
      ['hr1 GET /admin/ai-config', await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-config`, { headers: hr1H })],
      ['hr1 PUT /admin/ai-config', await http.put(`${BACKEND_BASE_URL}/api/v1/admin/ai-config`, samplePutBody, { headers: hr1H })],
      ['hr1 GET /admin/ai-logs', await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-logs`, { headers: hr1H })],
      ['hr1 GET /admin/ai-usage/summary', await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-usage/summary`, { headers: hr1H })]
    ]) {
      assert.strictEqual(res.status, 403, `${label}: expected 403, got ${res.status}`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'MUST_CHANGE_PASSWORD', `${label}: expected MUST_CHANGE_PASSWORD`);
    }

    const adminH = authHeaders(admin1.token);
    const cfgRes = await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-config`, { headers: adminH });
    assert.strictEqual(cfgRes.status, 200);
    const logsRes = await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-logs`, { headers: adminH });
    assert.strictEqual(logsRes.status, 200);
    assert.strictEqual(typeof logsRes.body?.totalCapped, 'boolean');
    const summaryRes = await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-usage/summary`, { headers: adminH });
    assert.strictEqual(summaryRes.status, 200);
    assert.strictEqual(summaryRes.body?.timezone, 'UTC');
  });

  it('TC-T2-AI-02: Should return 400 {"code","message"} for invalid ai-logs and ai-usage/summary query params', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    const adminH = authHeaders(admin1.token);

    const invalidLogsQueries = [
      'from=not-a-date',
      'to=2026-13-45',
      'from=2026-11-25&to=2026-11-20',
      'from=2025-01-01&to=2026-11-23',
      'page=-1',
      'page=100001',
      'size=0',
      'size=101',
      'userId=0',
      'userId=-5',
      'feature=INVALID_FEATURE',
      'status=INVALID_STATUS'
    ];
    for (const qs of invalidLogsQueries) {
      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-logs?${qs}`, { headers: adminH });
      assert.strictEqual(res.status, 400, `GET /ai-logs?${qs}: expected 400, got ${res.status} (${res.rawText})`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    }

    const invalidSummaryQueries = [
      'from=invalid',
      'to=2026-02-30',
      'from=2026-11-25&to=2026-11-20',
      'from=2025-01-01&to=2026-11-23'
    ];
    for (const qs of invalidSummaryQueries) {
      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-usage/summary?${qs}`, { headers: adminH });
      assert.strictEqual(res.status, 400, `GET /ai-usage/summary?${qs}: expected 400, got ${res.status} (${res.rawText})`);
      assertUnifiedErrorResponse(res);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    }
  });

  it('TC-T2-AI-03: Should return 409 on stale version and 400 on unconfigured provider keys or malicious model names (A6)', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    const adminH = authHeaders(admin1.token);
    const initial = await getAdminConfig(admin1.token);

    try {
      const bumpedLimit = initial.dailyLimitPerUser === 100 ? 99 : 100;
      const updateRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/admin/ai-config`,
        {
          provider: initial.provider,
          model: initial.model,
          temperature: initial.temperature,
          maxTokens: initial.maxTokens,
          dailyLimitPerUser: bumpedLimit,
          enabled: initial.enabled,
          version: initial.version
        },
        { headers: adminH }
      );
      assert.strictEqual(updateRes.status, 200, `Valid PUT failed: ${updateRes.status} ${updateRes.rawText}`);
      assert.strictEqual(updateRes.body.version, initial.version + 1);
      const currentVersion = updateRes.body.version;

      // Replay stale version -> 409 CONFLICT
      const staleRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/admin/ai-config`,
        {
          provider: initial.provider,
          model: initial.model,
          temperature: initial.temperature,
          maxTokens: initial.maxTokens,
          dailyLimitPerUser: bumpedLimit,
          enabled: initial.enabled,
          version: initial.version
        },
        { headers: adminH }
      );
      assert.strictEqual(staleRes.status, 409, `Stale PUT expected 409, got ${staleRes.status}`);
      assertUnifiedErrorResponse(staleRes);
      assert.strictEqual(staleRes.body.code, 'CONFLICT');

      // A6: Unconfigured provider API keys rejected with generic message
      for (const [provider, model] of [
        ['OPENAI', 'gpt-4o-mini'],
        ['GEMINI', 'gemini-2.5-flash'],
        ['CLAUDE', 'claude-sonnet-4-5']
      ]) {
        const missingKeyRes = await http.put(
          `${BACKEND_BASE_URL}/api/v1/admin/ai-config`,
          {
            provider,
            model,
            temperature: 0.3,
            maxTokens: 150,
            dailyLimitPerUser: 100,
            enabled: true,
            version: currentVersion
          },
          { headers: adminH }
        );
        assert.strictEqual(
          missingKeyRes.status,
          400,
          `Missing API key for ${provider} expected 400, got ${missingKeyRes.status}`
        );
        assertUnifiedErrorResponse(missingKeyRes);
        assert.strictEqual(missingKeyRes.body.code, 'VALIDATION_ERROR');
        assert.ok(
          missingKeyRes.body.message.includes(MISSING_KEY_MESSAGE),
          `Expected missing-key message for ${provider}, got "${missingKeyRes.body.message}"`
        );
      }

      // A6: Malicious model names rejected with 400 VALIDATION_ERROR
      for (const badModel of ['../x', 'a..b', 'bad/model', 'bad?q=1', 'bad#frag', 'bad model', 'mock:hack']) {
        const badModelRes = await http.put(
          `${BACKEND_BASE_URL}/api/v1/admin/ai-config`,
          {
            provider: 'MOCK',
            model: badModel,
            temperature: 0.3,
            maxTokens: 150,
            dailyLimitPerUser: 100,
            enabled: true,
            version: currentVersion
          },
          { headers: adminH }
        );
        assert.strictEqual(
          badModelRes.status,
          400,
          `Malicious model "${badModel}" expected 400, got ${badModelRes.status}`
        );
        assertUnifiedErrorResponse(badModelRes);
        assert.strictEqual(badModelRes.body.code, 'VALIDATION_ERROR');
      }
    } finally {
      await restoreAdminConfig(admin1.token, initial);
    }
  });

  it('TC-T2-AI-04: Should return 200 disabled notice with zero new ai_logs rows across repeated views (A3)', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    const adminH = authHeaders(admin1.token);
    const candH = authHeaders(cand1.token);
    const initial = await getAdminConfig(admin1.token);
    const today = utcTodayIso();

    try {
      const disableRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/admin/ai-config`,
        {
          provider: initial.provider,
          model: initial.model,
          temperature: initial.temperature,
          maxTokens: initial.maxTokens,
          dailyLimitPerUser: initial.dailyLimitPerUser,
          enabled: false,
          version: initial.version
        },
        { headers: adminH }
      );
      assert.strictEqual(disableRes.status, 200);

      const beforeLogs = await http.get(
        `${BACKEND_BASE_URL}/api/v1/admin/ai-logs?from=${today}&to=${today}&size=100`,
        { headers: adminH }
      );
      assert.strictEqual(beforeLogs.status, 200);
      const beforeTotal = beforeLogs.body.total;
      const beforeMaxId = beforeLogs.body.items.reduce((max, row) => Math.max(max, row.id), 0);

      for (let i = 0; i < 4; i++) {
        const recRes = await http.get(`${BACKEND_BASE_URL}/api/v1/me/job-recommendations`, { headers: candH });
        assert.strictEqual(recRes.status, 200, `Disabled view #${i + 1} expected 200, got ${recRes.status}`);
        assert.deepStrictEqual(recRes.body.items, []);
        assert.strictEqual(recRes.body.total, 0);
        assert.strictEqual(recRes.body.message, DISABLED_NOTICE);
      }

      const afterLogs = await http.get(
        `${BACKEND_BASE_URL}/api/v1/admin/ai-logs?from=${today}&to=${today}&size=100`,
        { headers: adminH }
      );
      assert.strictEqual(afterLogs.status, 200);
      assert.strictEqual(afterLogs.body.total, beforeTotal, 'Disabled recommendation views must write 0 ai_logs rows');
      assert.strictEqual(
        afterLogs.body.items.filter((row) => row.id > beforeMaxId).length,
        0,
        'No new log rows may be created while disabled'
      );
    } finally {
      await restoreAdminConfig(admin1.token, initial);
    }
  });

  it('TC-T2-AI-05: Should degrade gracefully on quota exhaustion (200 + notice, max 1 BLOCKED row) and match summary with logs (A2, A9)', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable');
    const adminH = authHeaders(admin1.token);
    const cand3H = authHeaders(cand3.token);
    const initial = await getAdminConfig(admin1.token);
    const today = utcTodayIso();

    try {
      const beforeCandLogsRes = await http.get(
        `${BACKEND_BASE_URL}/api/v1/admin/ai-logs?userId=${cand3.user.id}&from=${today}&to=${today}&size=100`,
        { headers: adminH }
      );
      assert.strictEqual(beforeCandLogsRes.status, 200);
      const beforeCandLogs = beforeCandLogsRes.body.items;
      const beforeNonBlocked = beforeCandLogs.filter((row) => row.status !== 'BLOCKED').length;
      const beforeBlocked = beforeCandLogs.filter((row) => row.status === 'BLOCKED').length;

      const limitRes = await http.put(
        `${BACKEND_BASE_URL}/api/v1/admin/ai-config`,
        {
          provider: 'MOCK',
          model: 'mock',
          temperature: initial.temperature,
          maxTokens: initial.maxTokens,
          dailyLimitPerUser: beforeNonBlocked + 2,
          enabled: true,
          version: initial.version
        },
        { headers: adminH }
      );
      assert.strictEqual(limitRes.status, 200);

      // First recommendation fetch for cand3 computes 10 matches and consumes 2 quota units across top 5 slots
      const recRes = await http.get(`${BACKEND_BASE_URL}/api/v1/me/job-recommendations?limit=10`, {
        headers: cand3H
      });
      assert.strictEqual(recRes.status, 200, `Quota-degraded recommendations must return 200, got ${recRes.status}`);
      assert.strictEqual(recRes.body.candidateId, cand3.user.id);
      assert.ok(Array.isArray(recRes.body.items) && recRes.body.items.length === 10, 'Expected 10 recommendations');
      assert.strictEqual(recRes.body.total, 10);
      assert.strictEqual(recRes.body.message, QUOTA_REACHED_NOTICE);
      for (const item of recRes.body.items) {
        assert.strictEqual(item.isAiGenerated, false, 'Fallback/MOCK slots after quota must report isAiGenerated=false');
      }

      const afterCandLogsRes = await http.get(
        `${BACKEND_BASE_URL}/api/v1/admin/ai-logs?userId=${cand3.user.id}&from=${today}&to=${today}&size=100`,
        { headers: adminH }
      );
      assert.strictEqual(afterCandLogsRes.status, 200);
      const afterCandLogs = afterCandLogsRes.body.items;
      const afterNonBlocked = afterCandLogs.filter((row) => row.status !== 'BLOCKED').length;
      const afterBlocked = afterCandLogs.filter((row) => row.status === 'BLOCKED').length;

      assert.strictEqual(afterNonBlocked - beforeNonBlocked, 2, 'Exactly 2 non-blocked AI slots should be recorded');
      assert.strictEqual(afterBlocked - beforeBlocked, 1, 'Loop must stop after at most 1 BLOCKED row');

      // Verify summary and logs count agreement for UTC today
      const [allLogsTodayRes, summaryTodayRes] = await Promise.all([
        http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-logs?from=${today}&to=${today}&size=100`, { headers: adminH }),
        http.get(`${BACKEND_BASE_URL}/api/v1/admin/ai-usage/summary?from=${today}&to=${today}`, { headers: adminH })
      ]);
      assert.strictEqual(allLogsTodayRes.status, 200);
      assert.strictEqual(summaryTodayRes.status, 200);

      if (!allLogsTodayRes.body.totalCapped && allLogsTodayRes.body.total <= 100) {
        const rows = allLogsTodayRes.body.items;
        const okCount = rows.filter((r) => r.status === 'OK').length;
        const errCount = rows.filter((r) => r.status === 'ERROR').length;
        const blkCount = rows.filter((r) => r.status === 'BLOCKED').length;
        const dailyBucket = summaryTodayRes.body.daily.find((b) => b.date === today);
        assert.ok(dailyBucket, `Expected daily summary bucket for ${today}`);
        assert.strictEqual(dailyBucket.ok, okCount);
        assert.strictEqual(dailyBucket.errors, errCount);
        assert.strictEqual(dailyBucket.blocked, blkCount);
        assert.strictEqual(dailyBucket.calls, okCount + errCount);
      }
    } finally {
      await restoreAdminConfig(admin1.token, initial);
    }
  });
});
