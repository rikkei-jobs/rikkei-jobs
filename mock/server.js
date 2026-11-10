const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 9000;
const SERVICE_KEY = process.env.SERVICE_KEY || 'dev-key';
const DATA_FILE = path.join(__dirname, 'data.json');

// In-memory runtime state
let db = {
  users: [],
  lmsResults: {},
  examResults: {},
  internships: {},
  batches: [],
  courses: []
};

const tickets = new Map();
const enrollments = [];
const batchMembers = [];
const requestLog = [];

/**
 * Load or reload data from data.json into memory
 */
function loadData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  db = JSON.parse(raw);
}

// Parse JSON request bodies
app.use(express.json());

// Request logging middleware (excluding /mock/* endpoints)
app.use((req, res, next) => {
  if (req.path.startsWith('/mock/')) {
    return next();
  }

  requestLog.unshift({
    at: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    hasKey: req.get('X-Service-Key') === SERVICE_KEY,
    body: req.body
  });

  if (requestLog.length > 100) {
    requestLog.length = 100;
  }

  next();
});

// Authentication middleware using X-Service-Key (excluding /mock/* endpoints)
app.use((req, res, next) => {
  if (req.path.startsWith('/mock/')) {
    return next();
  }

  const clientKey = req.get('X-Service-Key');
  if (clientKey !== SERVICE_KEY) {
    return res.status(401).json({
      code: 'INVALID_SERVICE_KEY',
      message: 'Thiếu hoặc sai X-Service-Key'
    });
  }

  next();
});

// ==========================================
// 11 Business Endpoints
// ==========================================

/**
 * 1. POST /lms/sso/tickets
 * Issue a temporary SSO ticket for an LMS user
 */
app.post('/lms/sso/tickets', (req, res) => {
  const { lmsUserId } = req.body || {};
  const user = db.users.find(u => u.lmsUserId === lmsUserId);

  if (!user) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'lmsUserId không tồn tại'
    });
  }

  const ticket = crypto.randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();

  tickets.set(ticket, { lmsUserId, issuedAt });

  return res.status(201).json({
    ticket,
    issuedAt
  });
});

/**
 * 2. POST /lms/sso/verify
 * Verify an SSO ticket and return user information.
 * NOTE: Mock does NOT expire tickets after 60s or revoke used tickets.
 * Backend will enforce single-use and 60s rules in NT-01.
 */
app.post('/lms/sso/verify', (req, res) => {
  const { ticket } = req.body || {};
  const record = tickets.get(ticket);

  if (!record) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'ticket không tồn tại'
    });
  }

  const user = db.users.find(u => u.lmsUserId === record.lmsUserId);
  if (!user) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'user không tồn tại'
    });
  }

  return res.status(200).json({
    lmsUserId: user.lmsUserId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    issuedAt: record.issuedAt
  });
});

/**
 * 3. GET /lms/students/:lmsUserId
 * Get student details (only for CANDIDATE role)
 */
app.get('/lms/students/:lmsUserId', (req, res) => {
  const { lmsUserId } = req.params;
  const user = db.users.find(u => u.lmsUserId === lmsUserId);

  if (!user || user.role !== 'CANDIDATE') {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Sinh viên không tồn tại'
    });
  }

  return res.status(200).json({
    lmsUserId: user.lmsUserId,
    fullName: user.fullName,
    email: user.email,
    program: user.program,
    classCode: user.classCode,
    courseName: user.courseName
  });
});

/**
 * 4. GET /lms/students/:lmsUserId/results
 * Get LMS course academic results for a student
 */
app.get('/lms/students/:lmsUserId/results', (req, res) => {
  const { lmsUserId } = req.params;
  const results = (db.lmsResults && db.lmsResults[lmsUserId]) || [];
  return res.status(200).json(results);
});

/**
 * 5. GET /lms/courses
 * List LMS courses with optional filtering by skill code
 */
app.get('/lms/courses', (req, res) => {
  const { skill } = req.query;
  let courses = db.courses || [];

  if (skill) {
    courses = courses.filter(c => Array.isArray(c.skills) && c.skills.includes(skill));
  }

  return res.status(200).json(courses);
});

/**
 * 6. POST /lms/enrollments
 * Enroll a student in an LMS course
 */
app.post('/lms/enrollments', (req, res) => {
  const { lmsUserId, courseId } = req.body || {};

  const user = db.users.find(u => u.lmsUserId === lmsUserId);
  const course = (db.courses || []).find(c => c.courseId === courseId);

  if (!user || !course) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'user hoặc khoá không tồn tại'
    });
  }

  const alreadyEnrolled = enrollments.some(
    e => e.lmsUserId === lmsUserId && e.courseId === courseId
  );

  if (alreadyEnrolled) {
    return res.status(409).json({
      code: 'ALREADY_ENROLLED',
      message: 'Sinh viên đã ghi danh khoá học này'
    });
  }

  const record = {
    lmsUserId,
    courseId,
    progress: 0,
    score: null,
    status: 'ENROLLED',
    enrolledAt: new Date().toISOString()
  };

  enrollments.push(record);
  return res.status(201).json(record);
});

/**
 * 7. GET /lms/enrollments/:lmsUserId
 * Get all runtime enrollments for a student
 */
app.get('/lms/enrollments/:lmsUserId', (req, res) => {
  const { lmsUserId } = req.params;
  const list = enrollments.filter(e => e.lmsUserId === lmsUserId);
  return res.status(200).json(list);
});

/**
 * 8. GET /exam/students/:lmsUserId/results
 * Get student exam results
 */
app.get('/exam/students/:lmsUserId/results', (req, res) => {
  const { lmsUserId } = req.params;
  const results = (db.examResults && db.examResults[lmsUserId]) || [];
  return res.status(200).json(results);
});

/**
 * 9. GET /pm/students/:lmsUserId/internships
 * Get internship history and tasks from lms-pm
 */
app.get('/pm/students/:lmsUserId/internships', (req, res) => {
  const { lmsUserId } = req.params;
  const internships = (db.internships && db.internships[lmsUserId]) || [];
  return res.status(200).json(internships);
});

/**
 * 10. POST /pm/batches/:batchId/members
 * Add a student to an internship batch
 */
app.post('/pm/batches/:batchId/members', (req, res) => {
  const { batchId } = req.params;
  const { lmsUserId } = req.body || {};

  const batch = (db.batches || []).find(b => b.batchId === batchId);
  const user = db.users.find(u => u.lmsUserId === lmsUserId);

  if (!batch || !user) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'đợt hoặc user không tồn tại'
    });
  }

  const alreadyMember = batchMembers.some(
    m => m.batchId === batchId && m.lmsUserId === lmsUserId
  );

  if (alreadyMember) {
    return res.status(409).json({
      code: 'ALREADY_MEMBER',
      message: 'Thành viên đã có trong đợt'
    });
  }

  const record = {
    batchId,
    lmsUserId,
    addedAt: new Date().toISOString()
  };

  batchMembers.push(record);
  return res.status(201).json(record);
});

/**
 * 11. POST /meet/rooms
 * Create an online interview meeting room
 */
app.post('/meet/rooms', (req, res) => {
  const { title, startAt, endAt } = req.body || {};

  if (!title || !startAt || !endAt) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'thiếu trường bắt buộc (title, startAt, endAt)'
    });
  }

  const roomId = `room-${crypto.randomBytes(4).toString('hex')}`;
  const roomUrl = `https://meet.rikkei.edu.vn/${roomId}`;

  return res.status(201).json({
    roomId,
    roomUrl,
    title,
    startAt,
    endAt
  });
});

// ==========================================
// 4 Testing Tools (/mock/*)
// ==========================================

/**
 * Tool 1: POST /mock/reload
 * Hot reload data.json into memory without restarting process
 */
app.post('/mock/reload', (req, res) => {
  try {
    loadData();
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      code: 'RELOAD_ERROR',
      message: error.message
    });
  }
});

/**
 * Tool 2: GET /mock/requests
 * Get the last 100 non-mock incoming requests
 */
app.get('/mock/requests', (req, res) => {
  return res.status(200).json(requestLog);
});

/**
 * Tool 3: PATCH /mock/enrollments
 * Update progress, score, or status of an existing runtime enrollment
 */
app.patch('/mock/enrollments', (req, res) => {
  const { lmsUserId, courseId, progress, score, status } = req.body || {};

  const record = enrollments.find(
    e => e.lmsUserId === lmsUserId && e.courseId === courseId
  );

  if (!record) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'enrollment không tồn tại'
    });
  }

  if (progress !== undefined) record.progress = progress;
  if (score !== undefined) record.score = score;
  if (status !== undefined) record.status = status;

  return res.status(200).json(record);
});

/**
 * Tool 4: POST /mock/reset
 * Clear all runtime memory state (tickets, enrollments, batchMembers, requestLog)
 */
app.post('/mock/reset', (req, res) => {
  tickets.clear();
  enrollments.length = 0;
  batchMembers.length = 0;
  requestLog.length = 0;

  return res.status(200).json({
    ok: true,
    message: 'Đã đặt lại trạng thái bộ nhớ'
  });
});

// Load initial data from data.json
loadData();

// Start HTTP server
app.listen(PORT, () => {
  console.log(`Mock chạy ở http://localhost:${PORT}`);
});
