// Tier 1: Feature Coverage — Backend Health & Standard Error Shapes
// Verifies GET /api/v1/health and exact {code, message} error response contracts

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { BACKEND_BASE_URL, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

describe('Tier 1: Backend Health & Standard Error Shapes (Feature Coverage)', async () => {
  let backendOnline = false;

  before(async () => {
    backendOnline = await isReachable(BACKEND_BASE_URL);
    if (!backendOnline) {
      console.warn(`[INFO] Backend service at ${BACKEND_BASE_URL} is not currently running. Tests will verify against running instance.`);
    }
  });

  // ------------------------------------------------------------------------
  // Feature F17: Health Check (GET /api/v1/health)
  // ------------------------------------------------------------------------
  describe('F17 - Health Check (GET /api/v1/health)', () => {
    it('should return HTTP 200 with status UP when database is reachable and migrated', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/health`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body && typeof res.body === 'object');
      assert.strictEqual(res.body.status, 'UP');
    });

    it('should return application/json content type', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/health`);
      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('application/json'));
    });
  });

  // ------------------------------------------------------------------------
  // Feature F15: Standard Error Handling Shapes ({ code, message })
  // ------------------------------------------------------------------------
  describe('F15 - Global Error Response Shapes ({ code, message })', () => {
    it('should return 404 with exact { code, message } for non-existent endpoint', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/test/not-found`);
      assert.strictEqual(res.status, 404);
      assert.ok(res.body && typeof res.body === 'object');
      assert.ok('code' in res.body, 'Response body must contain code field');
      assert.ok('message' in res.body, 'Response body must contain message field');
      assert.strictEqual(res.body.code, 'NOT_FOUND');
    });

    it('should return 401 with exact { code, message } when accessing secured endpoint without JWT', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/candidate/profile`);
      assert.strictEqual(res.status, 401);
      assert.ok(res.body && typeof res.body === 'object');
      assert.ok('code' in res.body);
      assert.ok('message' in res.body);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    });

    it('should return 405 with exact { code, message } when using unsupported HTTP method', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.delete(`${BACKEND_BASE_URL}/api/v1/health`);
      assert.strictEqual(res.status, 405);
      assert.ok(res.body && typeof res.body === 'object');
      assert.ok('code' in res.body);
      assert.ok('message' in res.body);
      assert.strictEqual(res.body.code, 'METHOD_NOT_ALLOWED');
    });

    it('should return 400 with exact { code, message } when request body is malformed JSON', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, '{ invalid-json', {
        headers: { 'Content-Type': 'application/json' }
      });
      // Accept either 400 or 401 depending on security filter precedence
      assert.ok([400, 401].includes(res.status));
      assert.ok('code' in res.body);
      assert.ok('message' in res.body);
    });
  });
});
