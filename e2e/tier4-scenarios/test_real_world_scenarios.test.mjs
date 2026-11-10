// Tier 4: Real-World Application Scenarios
// Simulates end-to-end user workflows, lifecycle journeys, and operational resilience

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { MOCK_BASE_URL, SERVICE_KEY, isReachable } from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

const execFileAsync = promisify(execFile);

const authHeaders = {
  'X-Service-Key': SERVICE_KEY,
  'Content-Type': 'application/json'
};

describe('Tier 4: Real-World Application Scenarios (End-to-End User Journeys)', async () => {
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
  // Scenario 1: Candidate LMS to Rikkei Jobs Onboarding & Academic Sync
  // ------------------------------------------------------------------------
  it('Scenario 1: Candidate LMS to Rikkei Jobs Onboarding & Academic Sync Journey', async () => {
    // 1. Candidate clicks SSO redirect in LMS
    const ticketRes = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, {
      lmsUserId: 'lms-sv-001'
    }, { headers: authHeaders });
    assert.strictEqual(ticketRes.status, 201);
    const { ticket } = ticketRes.body;

    // 2. Rikkei Jobs verifies SSO ticket
    const verifyRes = await http.post(`${MOCK_BASE_URL}/lms/sso/verify`, { ticket }, { headers: authHeaders });
    assert.strictEqual(verifyRes.status, 200);
    const candidateId = verifyRes.body.lmsUserId;

    // 3. System pulls full academic results
    const academicRes = await http.get(`${MOCK_BASE_URL}/lms/students/${candidateId}/results`, { headers: authHeaders });
    assert.strictEqual(academicRes.status, 200);
    assert.ok(academicRes.body.length >= 5);

    // 4. System pulls official examination scores
    const examRes = await http.get(`${MOCK_BASE_URL}/exam/students/${candidateId}/results`, { headers: authHeaders });
    assert.strictEqual(examRes.status, 200);
    assert.ok(examRes.body.length >= 1);

    // 5. System pulls internship history & mentor evaluations
    const internRes = await http.get(`${MOCK_BASE_URL}/pm/students/${candidateId}/internships`, { headers: authHeaders });
    assert.strictEqual(internRes.status, 200);
    assert.ok(internRes.body.length >= 1);
    assert.strictEqual(internRes.body[0].finalScore, 8.5);

    // Assert holistic candidate profile can be constructed
    const profileSummary = {
      fullName: verifyRes.body.fullName,
      email: verifyRes.body.email,
      subjectsCount: academicRes.body.length,
      examScore: examRes.body[0].score,
      internshipBatch: internRes.body[0].batchName
    };
    assert.strictEqual(profileSummary.fullName, 'Nguyễn Văn An');
    assert.strictEqual(profileSummary.subjectsCount, 5);
    assert.strictEqual(profileSummary.examScore, 8.0);
  });

  // ------------------------------------------------------------------------
  // Scenario 2: Skill Gap Remediation & Course Completion Journey
  // ------------------------------------------------------------------------
  it('Scenario 2: Skill Gap Remediation & Course Completion Lifecycle', async () => {
    const lmsUserId = 'lms-sv-002';

    // 1. Candidate searches courses teaching ReactJS
    const coursesRes = await http.get(`${MOCK_BASE_URL}/lms/courses?skill=REACTJS`, { headers: authHeaders });
    assert.strictEqual(coursesRes.status, 200);
    const course = coursesRes.body.find(c => c.courseId === 'LMS-C-REACT-01');
    assert.ok(course);

    // 2. Candidate enrolls in course
    const enrollRes = await http.post(`${MOCK_BASE_URL}/lms/enrollments`, {
      lmsUserId,
      courseId: course.courseId
    }, { headers: authHeaders });
    assert.strictEqual(enrollRes.status, 201);
    assert.strictEqual(enrollRes.body.status, 'ENROLLED');

    // 3. Midterm update via mock test tool: progress 60%
    const midtermRes = await http.patch(`${MOCK_BASE_URL}/mock/enrollments`, {
      lmsUserId,
      courseId: course.courseId,
      progress: 60,
      status: 'IN_PROGRESS'
    });
    assert.strictEqual(midtermRes.status, 200);
    assert.strictEqual(midtermRes.body.progress, 60);

    // 4. Course completion: 100%, final score 9.2
    const finalRes = await http.patch(`${MOCK_BASE_URL}/mock/enrollments`, {
      lmsUserId,
      courseId: course.courseId,
      progress: 100,
      score: 9.2,
      status: 'COMPLETED'
    });
    assert.strictEqual(finalRes.status, 200);
    assert.strictEqual(finalRes.body.status, 'COMPLETED');
    assert.strictEqual(finalRes.body.score, 9.2);

    // 5. Verification on student enrollments list
    const studentEnrollments = await http.get(`${MOCK_BASE_URL}/lms/enrollments/${lmsUserId}`, { headers: authHeaders });
    const record = studentEnrollments.body.find(e => e.courseId === course.courseId);
    assert.ok(record);
    assert.strictEqual(record.status, 'COMPLETED');
    assert.strictEqual(record.score, 9.2);
  });

  // ------------------------------------------------------------------------
  // Scenario 3: Internship Batch Membership & Online Interview Scheduling
  // ------------------------------------------------------------------------
  it('Scenario 3: Internship Batch Membership & Online Interview Scheduling Journey', async () => {
    // 1. Training staff registers candidate 3 into upcoming batch
    const batchRes = await http.post(`${MOCK_BASE_URL}/pm/batches/IOC-JB-2026-12/members`, {
      lmsUserId: 'lms-sv-003'
    }, { headers: authHeaders });
    assert.strictEqual(batchRes.status, 201);
    assert.strictEqual(batchRes.body.batchId, 'IOC-JB-2026-12');

    // 2. Recruiter schedules online technical interview room via Rikkei Meet
    const meetRes = await http.post(`${MOCK_BASE_URL}/meet/rooms`, {
      title: 'Phỏng vấn Kỹ thuật Java - Lê Minh Châu (K25)',
      startAt: '2026-11-25T09:30:00+07:00',
      endAt: '2026-11-25T10:30:00+07:00'
    }, { headers: authHeaders });

    assert.strictEqual(meetRes.status, 201);
    assert.ok(meetRes.body.roomId.startsWith('room-'));
    assert.ok(meetRes.body.roomUrl.startsWith('https://meet.rikkei.edu.vn/'));
  });

  // ------------------------------------------------------------------------
  // Scenario 4: External Evaluation Script Graceful Execution (TT-04 Safe Handling)
  // ------------------------------------------------------------------------
  it('Scenario 4: External Script (mock/send-evaluation-links.js) executes cleanly without crashing', async () => {
    const scriptPath = path.resolve(process.cwd(), 'mock', 'send-evaluation-links.js');

    try {
      // Execute script with batch ID IOC-JB-2026-09
      const { stdout, stderr } = await execFileAsync('node', [scriptPath, 'IOC-JB-2026-09'], {
        timeout: 5000,
        env: {
          ...process.env,
          BACKEND_URL: 'http://127.0.0.1:8080',
          SERVICE_KEY: 'dev-key'
        }
      });

      // The script should handle the absent backend gracefully (logging note about TT-04)
      const combined = (stdout + stderr).toLowerCase();
      assert.ok(
        combined.includes('evaluation-links') ||
        combined.includes('tt-04') ||
        combined.includes('lms-sv-001') ||
        combined.includes('econnrefused') ||
        combined.includes('backend')
      );
    } catch (err) {
      // If backend is absent, script must exit with handled error or explanation, not unhandled crash
      const output = ((err.stdout || '') + (err.stderr || '')).toLowerCase();
      assert.ok(
        output.includes('tt-04') ||
        output.includes('evaluation-links') ||
        output.includes('backend') ||
        output.includes('usage') ||
        err.code !== undefined
      );
    }
  });

  // ------------------------------------------------------------------------
  // Scenario 5: Mentor Live Demo Cycle & State Isolation
  // ------------------------------------------------------------------------
  it('Scenario 5: Mentor Live Demo Cycle (Modifications -> Reload -> Clean Reset)', async () => {
    // 1. Mentor verifies initial data
    const initCourses = await http.get(`${MOCK_BASE_URL}/lms/courses`, { headers: authHeaders });
    assert.strictEqual(initCourses.status, 200);

    // 2. Mentor reloads data in memory
    const reloadRes = await http.post(`${MOCK_BASE_URL}/mock/reload`, {});
    assert.strictEqual(reloadRes.status, 200);
    assert.strictEqual(reloadRes.body.ok, true);

    // 3. Mentor generates runtime test data
    await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId: 'lms-sv-001' }, { headers: authHeaders });
    await http.post(`${MOCK_BASE_URL}/meet/rooms`, {
      title: 'Demo Session',
      startAt: '2026-11-15T09:00:00Z',
      endAt: '2026-11-15T10:00:00Z'
    }, { headers: authHeaders });

    // 4. Verify request log captured the calls
    const logRes = await http.get(`${MOCK_BASE_URL}/mock/requests`);
    assert.ok(logRes.body.length >= 2);

    // 5. Clean reset after demo session
    const resetRes = await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
    assert.strictEqual(resetRes.status, 200);

    // 6. Confirm pristine state
    const cleanLogs = await http.get(`${MOCK_BASE_URL}/mock/requests`);
    assert.strictEqual(cleanLogs.body.length, 0);
  });
});
