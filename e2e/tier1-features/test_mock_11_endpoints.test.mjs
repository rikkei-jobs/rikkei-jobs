// Tier 1: Feature Coverage — Mock 11 Business Endpoints
// Verifies Happy-Path behavior for all 11 business endpoints of Rikkei Jobs Mock Service

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_BASE_URL, SERVICE_KEY, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

const authHeaders = {
  'X-Service-Key': SERVICE_KEY,
  'Content-Type': 'application/json'
};

describe('Tier 1: Mock 11 Business Endpoints (Feature Coverage)', async () => {
  let mockOnline = false;

  before(async () => {
    mockOnline = await isReachable(MOCK_BASE_URL);
    if (!mockOnline) {
      console.warn(`[WARN] Mock service at ${MOCK_BASE_URL} is currently unreachable. Tests will report live failure.`);
    } else {
      // Clean slate before running test suite
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
    }
  });

  after(async () => {
    if (mockOnline) {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
    }
  });

  // ------------------------------------------------------------------------
  // Feature 1: Issue SSO Ticket (POST /lms/sso/tickets)
  // ------------------------------------------------------------------------
  describe('F09.1 - Issue SSO Ticket (POST /lms/sso/tickets)', () => {
    it('should issue a valid 32-hex ticket for candidate 1 (lms-sv-001)', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-sv-001' }, { headers: authHeaders });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body && typeof res.body.ticket === 'string');
      assert.strictEqual(res.body.ticket.length, 32);
      assert.ok(/^[0-9a-f]{32}$/.test(res.body.ticket));
      assert.ok(res.body.issuedAt);
      assert.ok(!isNaN(Date.parse(res.body.issuedAt)));
    });

    it('should issue a valid ticket for candidate 2 (lms-sv-002)', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-sv-002' }, { headers: authHeaders });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.ticket.length, 32);
    });

    it('should issue a valid ticket for candidate 3 (lms-sv-003)', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-sv-003' }, { headers: authHeaders });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.ticket.length, 32);
    });

    it('should issue a valid ticket for mentor (lms-mt-001)', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-mt-001' }, { headers: authHeaders });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.ticket.length, 32);
    });

    it('should issue a valid ticket for staff (lms-st-001)', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-st-001' }, { headers: authHeaders });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.ticket.length, 32);
    });
  });

  // ------------------------------------------------------------------------
  // Feature 2: Verify SSO Ticket (POST /lms/sso/verify)
  // ------------------------------------------------------------------------
  describe('F09.2 - Verify SSO Ticket (POST /lms/sso/verify)', () => {
    it('should verify candidate 1 ticket and return accurate profile with role CANDIDATE', async () => {
      const issueRes = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-sv-001' }, { headers: authHeaders });
      const ticket = issueRes.body.ticket;

      const verifyRes = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, { ticket }, { headers: authHeaders });
      assert.strictEqual(verifyRes.status, 200);
      assert.strictEqual(verifyRes.body.lmsUserId, 'lms-sv-001');
      assert.strictEqual(verifyRes.body.email, 'candidate1@rikkeijobs.test');
      assert.strictEqual(verifyRes.body.fullName, 'Nguyễn Văn An');
      assert.strictEqual(verifyRes.body.role, 'CANDIDATE');
      assert.ok(verifyRes.body.issuedAt);
    });

    it('should verify mentor ticket and return accurate profile with role MENTOR', async () => {
      const issueRes = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-mt-001' }, { headers: authHeaders });
      const verifyRes = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, { ticket: issueRes.body.ticket }, { headers: authHeaders });
      assert.strictEqual(verifyRes.status, 200);
      assert.strictEqual(verifyRes.body.lmsUserId, 'lms-mt-001');
      assert.strictEqual(verifyRes.body.role, 'MENTOR');
    });

    it('should verify staff ticket and return accurate profile with role STAFF', async () => {
      const issueRes = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-st-001' }, { headers: authHeaders });
      const verifyRes = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, { ticket: issueRes.body.ticket }, { headers: authHeaders });
      assert.strictEqual(verifyRes.status, 200);
      assert.strictEqual(verifyRes.body.lmsUserId, 'lms-st-001');
      assert.strictEqual(verifyRes.body.role, 'STAFF');
    });

    it('should verify admin ticket and return accurate profile with role ADMIN', async () => {
      const issueRes = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-ad-001' }, { headers: authHeaders });
      const verifyRes = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, { ticket: issueRes.body.ticket }, { headers: authHeaders });
      assert.strictEqual(verifyRes.status, 200);
      assert.strictEqual(verifyRes.body.lmsUserId, 'lms-ad-001');
      assert.strictEqual(verifyRes.body.role, 'ADMIN');
    });

    it('should return 200 on second verification (Mock does not consume ticket)', async () => {
      const issueRes = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-sv-002' }, { headers: authHeaders });
      const ticket = issueRes.body.ticket;

      const firstVerify = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, { ticket }, { headers: authHeaders });
      assert.strictEqual(firstVerify.status, 200);

      const secondVerify = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, { ticket }, { headers: authHeaders });
      assert.strictEqual(secondVerify.status, 200);
      assert.strictEqual(secondVerify.body.lmsUserId, 'lms-sv-002');
    });
  });

  // ------------------------------------------------------------------------
  // Feature 3: Get Student Profile (GET /lms/students/:lmsUserId)
  // ------------------------------------------------------------------------
  describe('F09.3 - Get Student Profile (GET /lms/students/:lmsUserId)', () => {
    it('should return complete student profile for candidate 1', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-001`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.lmsUserId, 'lms-sv-001');
      assert.strictEqual(res.body.fullName, 'Nguyễn Văn An');
      assert.strictEqual(res.body.email, 'candidate1@rikkeijobs.test');
      assert.strictEqual(res.body.program, 'Kỹ sư phần mềm');
      assert.strictEqual(res.body.classCode, 'KS25-CNTT1');
      assert.strictEqual(res.body.courseName, 'K25');
    });

    it('should return complete student profile for candidate 2', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-002`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.fullName, 'Trần Thị Bình');
      assert.strictEqual(res.body.classCode, 'KS25-CNTT2');
    });

    it('should return complete student profile for candidate 3', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-003`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.fullName, 'Lê Minh Châu');
      assert.strictEqual(res.body.classCode, 'KS25-CNTT1');
    });

    it('should return JSON content-type header', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-001`, { headers: authHeaders });
      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('application/json'));
    });

    it('should have all 6 documented profile properties', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-001`, { headers: authHeaders });
      const expectedKeys = ['lmsUserId', 'fullName', 'email', 'program', 'classCode', 'courseName'];
      for (const key of expectedKeys) {
        assert.ok(key in res.body, `Missing key in student profile: ${key}`);
      }
    });
  });

  // ------------------------------------------------------------------------
  // Feature 4: Get Academic Results (GET /lms/students/:lmsUserId/results)
  // ------------------------------------------------------------------------
  describe('F09.4 - Get Academic Results (GET /lms/students/:lmsUserId/results)', () => {
    it('should return 5 subjects for candidate 1 with accurate score scale 10 and attendance rate', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-001/results`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 5);

      const javaSub = res.body.find(s => s.subjectCode === 'JAVA01');
      assert.ok(javaSub);
      assert.strictEqual(javaSub.score, 8.5);
      assert.strictEqual(javaSub.attendanceRate, 95);
      assert.strictEqual(javaSub.homeworkRate, 90);
      assert.strictEqual(javaSub.rpoint, 120);
    });

    it('should return 4 subjects for candidate 2', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-002/results`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 4);
      const reactSub = res.body.find(s => s.subjectCode === 'REACT01');
      assert.ok(reactSub);
      assert.strictEqual(reactSub.score, 8.5);
    });

    it('should return 3 subjects for candidate 3', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-003/results`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 3);
    });

    it('should ensure all scores are in 0..10 and rates in 0..100', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-sv-001/results`, { headers: authHeaders });
      for (const item of res.body) {
        assert.ok(item.score >= 0 && item.score <= 10, `Score out of bounds: ${item.score}`);
        assert.ok(item.attendanceRate >= 0 && item.attendanceRate <= 100);
        assert.ok(item.homeworkRate >= 0 && item.homeworkRate <= 100);
        assert.ok(typeof item.rpoint === 'number');
      }
    });

    it('should return empty array for non-candidate without 404 error', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/students/lms-mt-001/results`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 0);
    });
  });

  // ------------------------------------------------------------------------
  // Feature 5: Get Courses List (GET /lms/courses)
  // ------------------------------------------------------------------------
  describe('F09.5 - Get Courses List (GET /lms/courses)', () => {
    it('should return all 6 available courses without query param', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/courses`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 6);
    });

    it('should filter courses by skill=JAVA', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/courses?skill=JAVA`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.some(c => c.courseId === 'LMS-C-JAVA-02'));
      assert.ok(res.body.every(c => c.skills.includes('JAVA')));
    });

    it('should filter courses by skill=SPRING_BOOT', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/courses?skill=SPRING_BOOT`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.some(c => c.courseId === 'LMS-C-SPRING-01'));
      assert.ok(res.body.every(c => c.skills.includes('SPRING_BOOT')));
    });

    it('should filter courses by skill=REACTJS', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/courses?skill=REACTJS`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.some(c => c.courseId === 'LMS-C-REACT-01'));
    });

    it('should verify all course skills belong to 20 official skills catalogue', async () => {
      const officialSkills = new Set([
        'JAVA', 'SPRING_BOOT', 'SQL', 'GIT', 'REST_API', 'HTML_CSS',
        'JAVASCRIPT', 'REACTJS', 'DOCKER', 'ENGLISH', 'TESTING', 'LINUX',
        'OOP', 'DSA', 'CLEAN_CODE', 'TEAMWORK', 'COMMUNICATION', 'AGILE',
        'SECURITY', 'CLOUD'
      ]);
      const res = await http.get(`${MOCK_BASE_URL}/lms/courses`, { headers: authHeaders });
      for (const course of res.body) {
        for (const skill of course.skills) {
          assert.ok(officialSkills.has(skill), `Unrecognized skill in course ${course.courseId}: ${skill}`);
        }
      }
    });
  });

  // ------------------------------------------------------------------------
  // Feature 6 & 7: Enrollments (POST & GET /lms/enrollments)
  // ------------------------------------------------------------------------
  describe('F09.6 & F09.7 - Course Enrollments (POST & GET /lms/enrollments)', () => {
    it('should enroll candidate 1 into course LMS-C-JAVA-02 successfully with initial status ENROLLED', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/enrollments`, {
        lmsUserId: 'lms-sv-001',
        courseId: 'LMS-C-JAVA-02'
      }, { headers: authHeaders });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.lmsUserId, 'lms-sv-001');
      assert.strictEqual(res.body.courseId, 'LMS-C-JAVA-02');
      assert.strictEqual(res.body.progress, 0);
      assert.strictEqual(res.body.score, null);
      assert.strictEqual(res.body.status, 'ENROLLED');
      assert.ok(res.body.enrolledAt);
    });

    it('should enroll candidate 2 into course LMS-C-REACT-01', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/lms/enrollments`, {
        lmsUserId: 'lms-sv-002',
        courseId: 'LMS-C-REACT-01'
      }, { headers: authHeaders });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.courseId, 'LMS-C-REACT-01');
    });

    it('should retrieve candidate 1 enrollments matching the registered course', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/enrollments/lms-sv-001`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.some(e => e.courseId === 'LMS-C-JAVA-02'));
    });

    it('should retrieve candidate 2 enrollments matching registered course', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/enrollments/lms-sv-002`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.some(e => e.courseId === 'LMS-C-REACT-01'));
    });

    it('should return empty array for candidate with no enrollments', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/lms/enrollments/lms-sv-003`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 0);
    });
  });

  // ------------------------------------------------------------------------
  // Feature 8: Exam Results (GET /exam/students/:lmsUserId/results)
  // ------------------------------------------------------------------------
  describe('F09.8 - Exam Results (GET /exam/students/:lmsUserId/results)', () => {
    it('should return exam record for candidate 1 with score 8.0', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/exam/students/lms-sv-001/results`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 1);
      assert.strictEqual(res.body[0].examCode, 'EX-JAVA-2026-10');
      assert.strictEqual(res.body[0].subjectCode, 'JAVA01');
      assert.strictEqual(res.body[0].score, 8.0);
      assert.ok(res.body[0].takenAt);
    });

    it('should return exam record for candidate 2 with REACT01 subject', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/exam/students/lms-sv-002/results`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body[0].examCode, 'EX-REACT-2026-10');
      assert.strictEqual(res.body[0].score, 8.0);
    });

    it('should return exam record for candidate 3 with score 4.5', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/exam/students/lms-sv-003/results`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body[0].score, 4.5);
    });

    it('should return valid ISO 8601 timestamps in takenAt', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/exam/students/lms-sv-001/results`, { headers: authHeaders });
      const takenAt = res.body[0].takenAt;
      assert.ok(!isNaN(Date.parse(takenAt)), 'Invalid ISO date string');
    });

    it('should return empty array for non-candidate or candidate with no exams', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/exam/students/lms-mt-001/results`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 0);
    });
  });

  // ------------------------------------------------------------------------
  // Feature 9 & 10: Internships & Batches (GET & POST /pm/*)
  // ------------------------------------------------------------------------
  describe('F09.9 & F09.10 - Internships & Batches (GET /pm/students & POST /pm/batches)', () => {
    it('should return internship history with tasks for candidate 1', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/pm/students/lms-sv-001/internships`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 1);
      const batch = res.body[0];
      assert.strictEqual(batch.batchId, 'IOC-JB-2026-09');
      assert.strictEqual(batch.batchName, 'IOC Java Backend 09/2026');
      assert.strictEqual(batch.finalScore, 8.5);
      assert.ok(Array.isArray(batch.tasks));
      assert.strictEqual(batch.tasks.length, 3);
    });

    it('should return empty array for candidate 2 who has not interned', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/pm/students/lms-sv-002/internships`, { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 0);
    });

    it('should add candidate 2 to batch IOC-JB-2026-09 runtime membership', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/pm/batches/IOC-JB-2026-09/members`, {
        lmsUserId: 'lms-sv-002'
      }, { headers: authHeaders });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.batchId, 'IOC-JB-2026-09');
      assert.strictEqual(res.body.lmsUserId, 'lms-sv-002');
      assert.ok(res.body.addedAt);
    });

    it('should add candidate 3 to batch IOC-JB-2026-12 runtime membership', async () => {
      const res = await http.post(`${MOCK_BASE_URL}/pm/batches/IOC-JB-2026-12/members`, {
        lmsUserId: 'lms-sv-003'
      }, { headers: authHeaders });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.batchId, 'IOC-JB-2026-12');
      assert.strictEqual(res.body.lmsUserId, 'lms-sv-003');
    });

    it('should verify tasks acceptedScore in internship record are between 0 and 10', async () => {
      const res = await http.get(`${MOCK_BASE_URL}/pm/students/lms-sv-001/internships`, { headers: authHeaders });
      for (const task of res.body[0].tasks) {
        assert.ok(task.acceptedScore >= 0 && task.acceptedScore <= 10);
        assert.ok(!isNaN(Date.parse(task.acceptedAt)));
      }
    });
  });

  // ------------------------------------------------------------------------
  // Feature 11: Rikkei Meet Room Creation (POST /meet/rooms)
  // ------------------------------------------------------------------------
  describe('F09.11 - Rikkei Meet Room Creation (POST /meet/rooms)', () => {
    it('should create interview room successfully with valid payload', async () => {
      const payload = {
        title: 'Phỏng vấn Java Backend - candidate1',
        startAt: '2026-11-15T09:00:00+07:00',
        endAt: '2026-11-15T10:00:00+07:00'
      };
      const res = await http.post(`${MOCK_BASE_URL}/meet/rooms`, payload, { headers: authHeaders });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body && res.body.roomId);
      assert.ok(res.body.roomId.startsWith('room-'));
      assert.strictEqual(res.body.roomUrl, `https://meet.rikkei.edu.vn/${res.body.roomId}`);
      assert.strictEqual(res.body.title, payload.title);
      assert.strictEqual(res.body.startAt, payload.startAt);
      assert.strictEqual(res.body.endAt, payload.endAt);
    });

    it('should generate distinct roomIds on successive calls', async () => {
      const payload1 = { title: 'Room 1', startAt: '2026-11-16T09:00:00Z', endAt: '2026-11-16T10:00:00Z' };
      const payload2 = { title: 'Room 2', startAt: '2026-11-16T10:00:00Z', endAt: '2026-11-16T11:00:00Z' };

      const res1 = await http.post(`${MOCK_BASE_URL}/meet/rooms`, payload1, { headers: authHeaders });
      const res2 = await http.post(`${MOCK_BASE_URL}/meet/rooms`, payload2, { headers: authHeaders });

      assert.strictEqual(res1.status, 201);
      assert.strictEqual(res2.status, 201);
      assert.notStrictEqual(res1.body.roomId, res2.body.roomId);
    });

    it('should support rooms with diacritics in Vietnamese title', async () => {
      const payload = {
        title: 'Phỏng vấn Thực tập sinh Lập trình Web - Trần Thị Bình',
        startAt: '2026-11-20T14:00:00+07:00',
        endAt: '2026-11-20T15:00:00+07:00'
      };
      const res = await http.post(`${MOCK_BASE_URL}/meet/rooms`, payload, { headers: authHeaders });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.title, payload.title);
    });

    it('should return valid JSON content-type', async () => {
      const payload = { title: 'Quick Sync', startAt: '2026-11-15T09:00:00Z', endAt: '2026-11-15T09:30:00Z' };
      const res = await http.post(`${MOCK_BASE_URL}/meet/rooms`, payload, { headers: authHeaders });
      assert.ok((res.headers.get('content-type') || '').includes('application/json'));
    });

    it('should return 201 Created and exact 5 fields in response body', async () => {
      const payload = { title: 'Schema Check', startAt: '2026-11-15T09:00:00Z', endAt: '2026-11-15T09:30:00Z' };
      const res = await http.post(`${MOCK_BASE_URL}/meet/rooms`, payload, { headers: authHeaders });
      const keys = Object.keys(res.body).sort();
      assert.deepStrictEqual(keys, ['endAt', 'roomId', 'roomUrl', 'startAt', 'title']);
    });
  });
});
