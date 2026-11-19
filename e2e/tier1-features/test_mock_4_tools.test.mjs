// Tier 1: Feature Coverage — Mock 5 Testing Tools (/mock/*) & Cloudinary Mock (/cloudinary/*)
// Verifies Happy-Path behavior for /mock/reload, /mock/requests, /mock/enrollments, /mock/reset,
// /mock/cloudinary/fail-next, and the /cloudinary/* mock namespace contract

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_BASE_URL, SERVICE_KEY, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

const authHeaders = {
  'X-Service-Key': SERVICE_KEY,
  'Content-Type': 'application/json'
};

describe('Tier 1: Mock 5 Testing Tools & Cloudinary Contract (Feature Coverage)', async () => {
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
  // Tool 1: POST /mock/reload
  // ------------------------------------------------------------------------
  describe('F10.1 - Hot Reload Data (POST /mock/reload)', () => {
    it('should reload data.json successfully without X-Service-Key', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/mock/reload`, {});
      assert.strictEqual(res.status, 200);
      assert.ok(res.body && res.body.ok === true);
    });

    it('should accept reload with X-Service-Key without error', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/mock/reload`, {}, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.ok, true);
    });

    it('should not log /mock/reload calls in requestLog', async () => {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
      await http.post(`${MOCK_BASE_URL}/mock/reload`, {});
      const reqLog = await http.get(`${MOCK_BASE_URL}/mock/requests`);
      assert.strictEqual(reqLog.status, 200);
      assert.strictEqual(reqLog.body.length, 0);
    });
  });

  // ------------------------------------------------------------------------
  // Tool 2: GET /mock/requests
  // ------------------------------------------------------------------------
  describe('F10.2 - Inspect Request Log (GET /mock/requests)', () => {
    it('should return recent request log without requiring X-Service-Key', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/mock/requests`);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    it('should record business API requests with accurate hasKey: true flag', async () => {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
      await http.get(`${MOCK_BASE_URL}/lms/courses?skill=JAVA`, { headers: authHeaders });

      const res = await http.get(`${MOCK_BASE_URL}/mock/requests`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.length >= 1);
      const entry = res.body[0];
      assert.strictEqual(entry.method, 'GET');
      assert.ok(entry.path.includes('/lms/courses'));
      assert.strictEqual(entry.hasKey, true);
      assert.ok(entry.at);
    });

    it('should capture request body for POST requests', async () => {
      const payload = { lmsUserId: 'lms-sv-001' };
      await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, payload, { headers: authHeaders });

      const res = await http.get(`${MOCK_BASE_URL}/mock/requests`);
      const postEntry = res.body.find(r => r.method === 'POST' && r.path.includes('/lms/sso/tickets'));
      assert.ok(postEntry);
      assert.deepStrictEqual(postEntry.body, payload);
    });
  });

  // ------------------------------------------------------------------------
  // Tool 3: PATCH /mock/enrollments
  // ------------------------------------------------------------------------
  describe('F10.3 - Patch Runtime Enrollment (PATCH /mock/enrollments)', () => {
    it('should update enrollment progress and score successfully', async () => {
      // First, create enrollment
      await http.post(`${MOCK_BASE_URL}/lms/enrollments`, {
        lmsUserId: 'lms-sv-001',
        courseId: 'LMS-C-SQL-01'
      }, { headers: authHeaders });

      // Patch enrollment
      const patchRes = await http.patch(`${MOCK_BASE_URL}/mock/enrollments`, {
        lmsUserId: 'lms-sv-001',
        courseId: 'LMS-C-SQL-01',
        progress: 75,
        score: 8.5,
        status: 'IN_PROGRESS'
      });

      assert.strictEqual(patchRes.status, 200);
      assert.strictEqual(patchRes.body.progress, 75);
      assert.strictEqual(patchRes.body.score, 8.5);
      assert.strictEqual(patchRes.body.status, 'IN_PROGRESS');
    });

    it('should reflect patched status in GET /lms/enrollments', async () => {
      // Complete enrollment
      await http.patch(`${MOCK_BASE_URL}/mock/enrollments`, {
        lmsUserId: 'lms-sv-001',
        courseId: 'LMS-C-SQL-01',
        progress: 100,
        score: 9.5,
        status: 'COMPLETED'
      });

      const getRes = await http.get(`${MOCK_BASE_URL}/lms/enrollments/lms-sv-001`, { headers: authHeaders });
      assert.strictEqual(getRes.status, 200);
      const item = getRes.body.find(e => e.courseId === 'LMS-C-SQL-01');
      assert.ok(item);
      assert.strictEqual(item.progress, 100);
      assert.strictEqual(item.score, 9.5);
      assert.strictEqual(item.status, 'COMPLETED');
    });
  });

  // ------------------------------------------------------------------------
  // Tool 4: POST /mock/reset
  // ------------------------------------------------------------------------
  describe('F10.4 - Reset Runtime State (POST /mock/reset)', () => {
    it('should reset tickets, enrollments, and request log to pristine state', async () => {
      // Create some state
      await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-sv-002' }, { headers: authHeaders });
      await http.post(`${MOCK_BASE_URL}/pm/batches/IOC-JB-2026-09/members`, { lmsUserId: 'lms-sv-003' }, { headers: authHeaders });

      // Trigger reset
      const resetRes = await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
      assert.strictEqual(resetRes.status, 200);
      assert.strictEqual(resetRes.body.ok, true);

      // Verify request log is emptied
      const reqLog = await http.get(`${MOCK_BASE_URL}/mock/requests`);
      assert.strictEqual(reqLog.status, 200);
      assert.strictEqual(reqLog.body.length, 0);

      // Verify enrollments are emptied
      const enrRes = await http.get(`${MOCK_BASE_URL}/lms/enrollments/lms-sv-001`, { headers: authHeaders });
      assert.strictEqual(enrRes.status, 200);
      assert.strictEqual(enrRes.body.length, 0);
    });
  });

  // ------------------------------------------------------------------------
  // Tool 5: POST /mock/cloudinary/fail-next
  // ------------------------------------------------------------------------
  describe('F10.5 - Force Next Cloudinary Upload Failure (POST /mock/cloudinary/fail-next)', () => {
    it('should arm default 503 failure without X-Service-Key and without logging to /mock/requests', async () => {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});

      const failRes = await http.post(`${MOCK_BASE_URL}/mock/cloudinary/fail-next`, {});
      assert.strictEqual(failRes.status, 200);
      assert.strictEqual(failRes.body.ok, true);
      assert.strictEqual(failRes.body.failNext.status, 503);
      assert.strictEqual(failRes.body.failNext.message, 'Simulated Cloudinary outage');

      const reqLog = await http.get(`${MOCK_BASE_URL}/mock/requests`);
      assert.strictEqual(reqLog.status, 200);
      assert.strictEqual(reqLog.body.length, 0);

      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
    });

    it('should reject invalid status values with 400 VALIDATION_ERROR', async () => {
      for (const badStatus of [200, 399, 600, '503']) {
        const res = await http.post(`${MOCK_BASE_URL}/mock/cloudinary/fail-next`, { status: badStatus });
        assert.strictEqual(res.status, 400, `Expected 400 for status=${String(badStatus)}, got ${res.status}`);
        assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
      }
    });

    it('should trigger single-shot custom failure before signature verification and then revert to 401', async () => {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});

      const armRes = await http.post(`${MOCK_BASE_URL}/mock/cloudinary/fail-next`, {
        status: 500,
        message: 'Custom outage'
      });
      assert.strictEqual(armRes.status, 200);
      assert.strictEqual(armRes.body.failNext.status, 500);
      assert.strictEqual(armRes.body.failNext.message, 'Custom outage');

      const badParams = new URLSearchParams({
        api_key: 'invalid-key',
        timestamp: '1700000000',
        signature: '0000000000000000000000000000000000000000'
      });

      const firstUpload = await http.post(`${MOCK_BASE_URL}/cloudinary/v1_1/dev-cloud/image/upload`, badParams);
      assert.strictEqual(firstUpload.status, 500);
      assert.strictEqual(firstUpload.body?.error?.message, 'Custom outage');

      const secondUpload = await http.post(`${MOCK_BASE_URL}/cloudinary/v1_1/dev-cloud/image/upload`, badParams);
      assert.strictEqual(secondUpload.status, 401);
    });

    it('should clear armed failNext state when POST /mock/reset is called', async () => {
      const armRes = await http.post(`${MOCK_BASE_URL}/mock/cloudinary/fail-next`, { status: 503 });
      assert.strictEqual(armRes.status, 200);

      const resetRes = await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
      assert.strictEqual(resetRes.status, 200);
      assert.strictEqual(resetRes.body.ok, true);

      const uploadAfterReset = await http.post(
        `${MOCK_BASE_URL}/cloudinary/v1_1/dev-cloud/image/upload`,
        new URLSearchParams({
          api_key: 'invalid-key',
          timestamp: '1700000000',
          signature: '0000000000000000000000000000000000000000'
        })
      );
      assert.strictEqual(uploadAfterReset.status, 401);
    });
  });

  // ------------------------------------------------------------------------
  // Cloudinary Mock Namespace Contract (/cloudinary/*)
  // ------------------------------------------------------------------------
  describe('Cloudinary Mock Namespace Contract (/cloudinary/*)', () => {
    it('should reject invalid api_key or signature with 401 and exclude /cloudinary/* from /mock/requests', async () => {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});

      const badUploadRes = await http.post(
        `${MOCK_BASE_URL}/cloudinary/v1_1/dev-cloud/image/upload`,
        new URLSearchParams({
          api_key: 'wrong-key',
          timestamp: '1700000000',
          public_id: 'rikkei-jobs/company-logos/company-1',
          signature: 'a'.repeat(40)
        })
      );
      assert.strictEqual(badUploadRes.status, 401);
      assert.ok(badUploadRes.body?.error?.message);

      const missingAssetRes = await http.get(`${MOCK_BASE_URL}/cloudinary/dev-cloud/image/upload/v1/nonexistent.png`);
      assert.strictEqual(missingAssetRes.status, 404);

      const traversalRes = await http.get(`${MOCK_BASE_URL}/cloudinary/dev-cloud/image/upload/v1/%2e%2e/secret.png`);
      assert.strictEqual(traversalRes.status, 404);

      const reqLog = await http.get(`${MOCK_BASE_URL}/mock/requests`);
      assert.strictEqual(reqLog.status, 200);
      assert.strictEqual(reqLog.body.length, 0);
    });
  });
});
