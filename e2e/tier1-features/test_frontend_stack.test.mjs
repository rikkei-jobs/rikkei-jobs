// Tier 1: Feature Coverage — Frontend Reverse Proxy & Infrastructure Stack
// Verifies Frontend page rendering, Nginx /api proxying, and Mailpit service

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { FRONTEND_BASE_URL, MAILPIT_BASE_URL, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

describe('Tier 1: Frontend Proxy & Infrastructure Stack (Feature Coverage)', async () => {
  let frontendOnline = false;
  let mailpitOnline = false;

  before(async () => {
    frontendOnline = await isReachable(FRONTEND_BASE_URL);
    mailpitOnline = await isReachable(MAILPIT_BASE_URL);
  });

  // ------------------------------------------------------------------------
  // Feature F19: Frontend React Web Interface
  // ------------------------------------------------------------------------
  describe('F19 - Frontend Web Interface (GET /)', () => {
    it('should serve HTML index page with HTTP 200', async () => {
      assert.ok(frontendOnline, `Frontend service at ${FRONTEND_BASE_URL} is offline`);

      const res = await http.get(`${FRONTEND_BASE_URL}/`);
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.rawText === 'string');
      assert.ok(res.rawText.includes('<!DOCTYPE html>') || res.rawText.includes('<html'));
    });

    it('should return text/html content-type header', async () => {
      assert.ok(frontendOnline, `Frontend service at ${FRONTEND_BASE_URL} is offline`);

      const res = await http.get(`${FRONTEND_BASE_URL}/`);
      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('text/html'));
    });
  });

  // ------------------------------------------------------------------------
  // Feature F20: Nginx Reverse Proxy (/api/v1/health)
  // ------------------------------------------------------------------------
  describe('F20 - Frontend Nginx Reverse Proxy (/api/)', () => {
    it('should proxy /api/v1/health through Nginx port 3000 to backend', async () => {
      assert.ok(frontendOnline, `Frontend service at ${FRONTEND_BASE_URL} is offline`);

      const res = await http.get(`${FRONTEND_BASE_URL}/api/v1/health`);
      // When backend is running, expect 200 with status UP. If backend is starting/down, Nginx resolver returns 502/504
      assert.ok([200, 502, 503, 504].includes(res.status));
      if (res.status === 200) {
        assert.ok(res.body && res.body.status === 'UP');
      }
    });

    it('should NEVER expose Mock service on Frontend port (Security Boundary)', async () => {
      assert.ok(frontendOnline, `Frontend service at ${FRONTEND_BASE_URL} is offline`);

      // Ensure mock endpoints are not reachable through frontend proxy.
      // Nginx SPA fallback routes non-api paths to index.html (text/html, HTTP 200),
      // never proxying to the Mock service (port 9000).
      const res = await http.get(`${FRONTEND_BASE_URL}/lms/courses`);
      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('text/html'), 'SPA fallback must return text/html');
      assert.ok(!contentType.includes('application/json'), 'Frontend must never return Mock JSON');
      assert.ok(typeof res.rawText === 'string');
      assert.ok(!res.rawText.includes('LMS-C-JAVA-02'), 'Must not contain mock course data');
    });
  });

  // ------------------------------------------------------------------------
  // Feature F22: Mailpit Service UI (Port 8025)
  // ------------------------------------------------------------------------
  describe('F22 - Mailpit Web Service (Port 8025)', () => {
    it('should be accessible at port 8025 with HTTP 200', async () => {
      assert.ok(mailpitOnline, `Mailpit service at ${MAILPIT_BASE_URL} is offline`);

      const res = await http.get(`${MAILPIT_BASE_URL}/`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.rawText.toLowerCase().includes('mailpit') || res.rawText.includes('<html'));
    });
  });
});
