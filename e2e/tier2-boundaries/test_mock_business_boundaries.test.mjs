// Tier 2: Boundary & Corner Cases — Business Logic Validation & Edge Errors
// Verifies 400 VALIDATION_ERROR, 404 NOT_FOUND, 409 Conflict, and empty array guarantees

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_BASE_URL, SERVICE_KEY, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

const authHeaders = {
  'X-Service-Key': SERVICE_KEY,
  'Content-Type': 'application/json'
};

describe('Tier 2: Mock Business Logic Boundaries (Corner & Edge Cases)', async () => {
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
  // Boundary 1: SSO Issue & Verify 404 Edge Cases
  // ------------------------------------------------------------------------
  describe('SSO Ticket Boundaries (404 NOT_FOUND)', () => {
    it('should return 404 when issuing ticket for non-existent lmsUserId', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, {
        lmsUserId: 'lms-sv-9999'
      }, { headers: authHeaders });

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
      assert.strictEqual(res.body.message, 'lmsUserId không tồn tại');
    });

    it('should return 404 when verifying non-existent ticket', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, {
        ticket: 'non-existent-fake-ticket-12345678'
      }, { headers: authHeaders });

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
      assert.strictEqual(res.body.message, 'ticket không tồn tại');
    });

    it('should return 404 when verifying empty ticket string', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, {
        ticket: ''
      }, { headers: authHeaders });
      assert.strictEqual(res.status, 404);
    });
  });

  // ------------------------------------------------------------------------
  // Boundary 2: Student Profile 404 & Role Check
  // ------------------------------------------------------------------------
  describe('Student Profile Boundaries (Role Restriction & 404)', () => {
    it('should return 404 when querying non-existent student', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-non-existent`, { headers: authHeaders });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
      assert.strictEqual(res.body.message, 'Sinh viên không tồn tại');
    });

    it('should return 404 when querying user who is MENTOR (lms-mt-001)', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-mt-001`, { headers: authHeaders });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
    });

    it('should return 404 when querying user who is STAFF (lms-st-001)', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-st-001`, { headers: authHeaders });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
    });

    it('should return 404 when querying user who is ADMIN (lms-ad-001)', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-ad-001`, { headers: authHeaders });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
    });
  });

  // ------------------------------------------------------------------------
  // Boundary 3: Empty List Responses (Must Return [] Never 404)
  // ------------------------------------------------------------------------
  describe('List Endpoint Boundaries (Must Return [] Never 404)', () => {
    it('GET /lms/students/:lmsUserId/results returns [] for unknown user', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-unknown/results`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 0);
    });

    it('GET /lms/courses?skill=UNKNOWN returns [] when skill has no matching courses', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/courses?skill=KOTLIN`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 0);
    });

    it('GET /exam/students/:lmsUserId/results returns [] for user with no exam records', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/exam/students/lms-sv-unknown/results`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 0);
    });

    it('GET /pm/students/:lmsUserId/internships returns [] for user with no internships', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/pm/students/lms-sv-unknown/internships`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 0);
    });

    it('GET /lms/enrollments/:lmsUserId returns [] when user has zero enrollments', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/enrollments/lms-sv-unknown`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 0);
    });
  });

  // ------------------------------------------------------------------------
  // Boundary 4: Course Enrollment Conflicts & 404
  // ------------------------------------------------------------------------
  describe('Enrollment Boundaries (404 NOT_FOUND & 409 ALREADY_ENROLLED)', () => {
    it('should return 404 when enrolling non-existent user', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/enrollments`, {
        lmsUserId: 'lms-sv-9999',
        courseId: 'LMS-C-JAVA-02'
      }, { headers: authHeaders });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
    });

    it('should return 404 when enrolling in non-existent course', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/enrollments`, {
        lmsUserId: 'lms-sv-001',
        courseId: 'LMS-C-UNKNOWN-99'
      }, { headers: authHeaders });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
    });

    it('should return 409 ALREADY_ENROLLED on duplicate course registration', async () => {
      // First enrollment
      const res1 = await http.post(`${MOCK_BASE_URL}/lms/enrollments`, {
        lmsUserId: 'lms-sv-003',
        courseId: 'LMS-C-GIT-01'
      }, { headers: authHeaders });
      assert.strictEqual(res1.status, 201);

      // Duplicate enrollment
      const res2 = await http.post(`${MOCK_BASE_URL}/lms/enrollments`, {
        lmsUserId: 'lms-sv-003',
        courseId: 'LMS-C-GIT-01'
      }, { headers: authHeaders });

      assert.strictEqual(res2.status, 409);
      assert.strictEqual(res2.body.code, 'ALREADY_ENROLLED');
      assert.strictEqual(res2.body.message, 'Sinh viên đã ghi danh khoá học này');
    });
  });

  // ------------------------------------------------------------------------
  // Boundary 5: Batch Membership Conflicts & 404
  // ------------------------------------------------------------------------
  describe('Batch Member Boundaries (404 NOT_FOUND & 409 ALREADY_MEMBER)', () => {
    it('should return 404 when adding user to non-existent batch', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/pm/batches/IOC-JB-UNKNOWN/members`, {
        lmsUserId: 'lms-sv-001'
      }, { headers: authHeaders });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
    });

    it('should return 404 when adding non-existent user to valid batch', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/pm/batches/IOC-JB-2026-09/members`, {
        lmsUserId: 'lms-sv-9999'
      }, { headers: authHeaders });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
    });

    it('should return 409 ALREADY_MEMBER when adding duplicate batch member', async () => {
      // Add first time
      const res1 = await http.post(`${MOCK_BASE_URL}/pm/batches/IOC-JB-2026-09/members`, {
        lmsUserId: 'lms-sv-001'
      }, { headers: authHeaders });
      assert.strictEqual(res1.status, 201);

      // Add second time
      const res2 = await http.post(`${MOCK_BASE_URL}/pm/batches/IOC-JB-2026-09/members`, {
        lmsUserId: 'lms-sv-001'
      }, { headers: authHeaders });

      assert.strictEqual(res2.status, 409);
      assert.strictEqual(res2.body.code, 'ALREADY_MEMBER');
      assert.strictEqual(res2.body.message, 'Thành viên đã có trong đợt');
    });
  });

  // ------------------------------------------------------------------------
  // Boundary 6: Meet Room Validation (400 VALIDATION_ERROR)
  // ------------------------------------------------------------------------
  describe('Meet Room Boundaries (400 VALIDATION_ERROR)', () => {
    it('should return 400 when title is missing', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/meet/rooms`, {
        startAt: '2026-11-15T09:00:00Z',
        endAt: '2026-11-15T10:00:00Z'
      }, { headers: authHeaders });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
      assert.ok(res.body.message.includes('thiếu trường bắt buộc'));
    });

    it('should return 400 when startAt is missing', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/meet/rooms`, {
        title: 'Meeting without start time',
        endAt: '2026-11-15T10:00:00Z'
      }, { headers: authHeaders });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });

    it('should return 400 when endAt is missing', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/meet/rooms`, {
        title: 'Meeting without end time',
        startAt: '2026-11-15T09:00:00Z'
      }, { headers: authHeaders });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });

    it('should return 400 when request body is empty object', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/meet/rooms`, {}, { headers: authHeaders });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });
  });

  // ------------------------------------------------------------------------
  // Boundary 7: Patch Enrollment 404 Edge Case
  // ------------------------------------------------------------------------
  describe('Patch Enrollment Boundary (404 NOT_FOUND)', () => {
    it('should return 404 when patching an enrollment that does not exist', async () => {
      const res = await http.patch(`${MOCK_BASE_URL}/mock/enrollments`, {
        lmsUserId: 'lms-sv-002',
        courseId: 'LMS-C-DOCKER-01',
        progress: 100
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NOT_FOUND');
      assert.strictEqual(res.body.message, 'enrollment không tồn tại');
    });
  });
});
