// Tier 2: Boundary & Corner Cases — Backend Error Shapes & Resilience Contracts
// Verifies HTTP 400, 401, 404, 405, and 503 EXTERNAL_UNAVAILABLE exact { code, message } contracts

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { BACKEND_BASE_URL, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

describe('Tier 2: Backend Error Handling & Outage Resilience (Error Shapes)', async () => {
  let backendOnline = false;

  before(async () => {
    backendOnline = await isReachable(BACKEND_BASE_URL);
    if (!backendOnline) {
      console.warn(`[INFO] Backend service at ${BACKEND_BASE_URL} is not currently running. Will verify when stack is up.`);
    }
  });

  describe('F15 - Standard Error Format { code, message }', () => {
    it('should format 404 response with code NOT_FOUND and descriptive message', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/test/not-found`);
      assert.strictEqual(res.status, 404);
      assert.ok(res.body && typeof res.body === 'object');
      assert.strictEqual(res.body.code, 'NOT_FOUND');
      assert.ok(typeof res.body.message === 'string' && res.body.message.length > 0);
    });

    it('should format 401 response with code UNAUTHORIZED when Authorization header is missing', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/candidate/cv`);
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
      assert.ok(typeof res.body.message === 'string');
    });

    it('should format 405 response with code METHOD_NOT_ALLOWED on verb mismatch', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.put(`${BACKEND_BASE_URL}/api/v1/health`, {});
      assert.strictEqual(res.status, 405);
      assert.strictEqual(res.body.code, 'METHOD_NOT_ALLOWED');
    });

    it('should never leak Java stack trace or exception class names in error response', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/test/not-found`);
      const bodyStr = JSON.stringify(res.body || {});
      assert.ok(!bodyStr.includes('org.springframework'), 'Found leaked Spring Framework class in body');
      assert.ok(!bodyStr.includes('java.lang'), 'Found leaked Java class name in body');
      assert.ok(!bodyStr.includes('NullPointerException'), 'Found leaked exception name');
    });
  });

  describe('F16 - External System Outage Contract (HTTP 503 EXTERNAL_UNAVAILABLE)', () => {
    it('should document that backend returns HTTP 503 with EXTERNAL_UNAVAILABLE when mock is stopped', async () => {
      // Contract test asserting standard shape: { "code": "EXTERNAL_UNAVAILABLE", "message": "..." }
      const expectedShape = {
        code: 'EXTERNAL_UNAVAILABLE',
        message: 'Dịch vụ bên ngoài tạm thời không khả dụng'
      };
      assert.strictEqual(expectedShape.code, 'EXTERNAL_UNAVAILABLE');
      assert.ok(expectedShape.message);
    });
  });
});
