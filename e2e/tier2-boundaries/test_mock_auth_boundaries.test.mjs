// Tier 2: Boundary & Corner Cases — Authentication Middleware (X-Service-Key)
// Verifies security perimeter and 401 INVALID_SERVICE_KEY responses

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_BASE_URL, SERVICE_KEY, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

describe('Tier 2: Mock Authentication Boundaries (Security Perimeter)', async () => {
  let mockOnline = false;

  before(async () => {
    mockOnline = await isReachable(MOCK_BASE_URL);
    if (!mockOnline) {
      console.warn(`[WARN] Mock service at ${MOCK_BASE_URL} is currently unreachable.`);
    }
  });

  const endpointsToTest = [
    { method: 'POST', path: '/lms/sso/tickets', body: { lmsUserId: 'lms-sv-001' } },
    { method: 'POST', path: '/lms/sso/verify', body: { ticket: 'some-ticket' } },
    { method: 'GET', path: '/lms/students/lms-sv-001' },
    { method: 'GET', path: '/lms/students/lms-sv-001/results' },
    { method: 'GET', path: '/lms/courses' },
    { method: 'POST', path: '/lms/enrollments', body: { lmsUserId: 'lms-sv-001', courseId: 'LMS-C-JAVA-02' } },
    { method: 'GET', path: '/lms/enrollments/lms-sv-001' },
    { method: 'GET', path: '/exam/students/lms-sv-001/results' },
    { method: 'GET', path: '/pm/students/lms-sv-001/internships' },
    { method: 'POST', path: '/pm/batches/IOC-JB-2026-09/members', body: { lmsUserId: 'lms-sv-001' } },
    { method: 'POST', path: '/meet/rooms', body: { title: 'Test', startAt: '2026-11-15T09:00:00Z', endAt: '2026-11-15T10:00:00Z' } }
  ];

  for (const ep of endpointsToTest) {
    it(`should reject ${ep.method} ${ep.path} with 401 when X-Service-Key is missing`, async () => {
      const res = await (ep.method === 'GET'
        ? http.get(`${MOCK_BASE_URL}${ep.path}`)
        : http.post(`${MOCK_BASE_URL}${ep.path}`, ep.body));

      assert.strictEqual(res.status, 401);
      assert.ok(res.body && typeof res.body === 'object');
      assert.strictEqual(res.body.code, 'INVALID_SERVICE_KEY');
      assert.strictEqual(res.body.message, 'Thiếu hoặc sai X-Service-Key');
    });

    it(`should reject ${ep.method} ${ep.path} with 401 when X-Service-Key is invalid`, async () => {
      const headers = { 'X-Service-Key': 'completely-wrong-key' };
      const res = await (ep.method === 'GET'
        ? http.get(`${MOCK_BASE_URL}${ep.path}`, { headers })
        : http.post(`${MOCK_BASE_URL}${ep.path}`, ep.body, { headers }));

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, 'INVALID_SERVICE_KEY');
    });
  }

  it('should reject when X-Service-Key is empty string', async () => {
    const res = await http.get(`${MOCK_BASE_URL}/lms/courses`, {
      headers: { 'X-Service-Key': '' }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_SERVICE_KEY');
  });

  it('should reject when X-Service-Key has wrong casing (DEV-KEY)', async () => {
    const res = await http.get(`${MOCK_BASE_URL}/lms/courses`, {
      headers: { 'X-Service-Key': 'DEV-KEY' }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_SERVICE_KEY');
  });

  it('should NEVER reject /mock/* utility tools even when key is missing', async () => {
    const reloadRes = await http.post(`${MOCK_BASE_URL}/mock/reload`, {});
    assert.strictEqual(reloadRes.status, 200);

    const requestsRes = await http.get(`${MOCK_BASE_URL}/mock/requests`);
    assert.strictEqual(requestsRes.status, 200);

    const resetRes = await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
    assert.strictEqual(resetRes.status, 200);
  });
});
