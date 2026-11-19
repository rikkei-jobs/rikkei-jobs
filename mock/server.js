const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 9000;
const SERVICE_KEY = process.env.SERVICE_KEY || 'dev-key';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/+$/, '');
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'dev-key';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'dev-secret';
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
const cloudinaryAssets = new Map();
let cloudinaryFailNext = null;
let cloudinaryVersionCounter = 0;

/**
 * Constant-time string comparison to avoid timing leaks on key/signature checks.
 */
function safeEqual(expected, actual) {
  if (typeof expected !== 'string' || typeof actual !== 'string') {
    return false;
  }
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(actual, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

const CLOUDINARY_SIGNATURE_EXCLUDED_KEYS = new Set([
  'file',
  'cloud_name',
  'resource_type',
  'api_key',
  'signature'
]);

/**
 * Compute official Cloudinary SHA-1 signature over signed form parameters.
 */
function computeCloudinarySignature(params, apiSecret) {
  const keys = Object.keys(params)
    .filter(
      k =>
        !CLOUDINARY_SIGNATURE_EXCLUDED_KEYS.has(k) &&
        params[k] !== undefined &&
        params[k] !== null &&
        String(params[k]) !== ''
    )
    .sort();
  const payload = keys.map(k => `${k}=${String(params[k])}`).join('&');
  return crypto
    .createHash('sha1')
    .update(payload + apiSecret, 'utf8')
    .digest('hex');
}

/**
 * Validate and normalize a Cloudinary public_id without allowing path traversal.
 */
function normalizePublicId(rawPublicId) {
  const trimmed = String(rawPublicId).replace(/^\/+|\/+$/g, '');
  if (!trimmed) {
    return null;
  }
  const segments = trimmed.split('/');
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..' || !/^[A-Za-z0-9._-]+$/.test(seg)) {
      return null;
    }
  }
  return trimmed;
}

/**
 * Validate :cloud path param, form parameter types, api_key, and SHA-1 signature.
 */
function verifyCloudinaryRequest(req, res) {
  const { cloud } = req.params;
  if (!cloud || !/^[A-Za-z0-9_-]+$/.test(cloud)) {
    res.status(400).json({ error: { message: 'Invalid cloud name' } });
    return false;
  }

  const body = req.body || {};
  if (Object.values(body).some(v => Array.isArray(v))) {
    res.status(400).json({ error: { message: 'Duplicate form parameters are not allowed' } });
    return false;
  }

  if (!safeEqual(CLOUDINARY_API_KEY, body.api_key)) {
    res.status(401).json({ error: { message: 'Invalid api_key' } });
    return false;
  }

  if (typeof body.signature !== 'string' || !/^[0-9a-f]{40}$/i.test(body.signature)) {
    res.status(401).json({ error: { message: 'Invalid Signature' } });
    return false;
  }

  const expectedSig = computeCloudinarySignature(body, CLOUDINARY_API_SECRET);
  if (!safeEqual(expectedSig, body.signature.toLowerCase())) {
    res.status(401).json({ error: { message: 'Invalid Signature' } });
    return false;
  }

  return true;
}

/**
 * Load or reload data from data.json into memory
 */
function loadData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  db = JSON.parse(raw);
}

// ==========================================
// Cloudinary Mock Router (/cloudinary/*)
// Mounted before requestLog and X-Service-Key so uploads never require
// X-Service-Key and never log base64 payloads, api_key, or signature.
// ==========================================
const cloudinaryRouter = express.Router();
cloudinaryRouter.use(express.urlencoded({ extended: false, limit: '5mb' }));

cloudinaryRouter.post('/v1_1/:cloud/image/upload', (req, res) => {
  if (cloudinaryFailNext !== null) {
    const { status, message } = cloudinaryFailNext;
    cloudinaryFailNext = null;
    return res.status(status).json({ error: { message } });
  }

  if (!verifyCloudinaryRequest(req, res)) {
    return;
  }

  const { cloud } = req.params;
  const body = req.body || {};

  if (typeof body.file !== 'string') {
    return res.status(400).json({ error: { message: 'Invalid file data URI' } });
  }

  const dataUriMatch = body.file.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!dataUriMatch || dataUriMatch[2].length % 4 !== 0) {
    return res.status(400).json({ error: { message: 'Invalid file data URI' } });
  }

  const buffer = Buffer.from(dataUriMatch[2], 'base64');
  if (buffer.length === 0) {
    return res.status(400).json({ error: { message: 'Empty image payload' } });
  }

  const subtype = dataUriMatch[1];
  const format = subtype === 'png' ? 'png' : 'jpg';
  const contentType = subtype === 'png' ? 'image/png' : 'image/jpeg';

  let publicId;
  if (body.public_id === undefined || body.public_id === null || String(body.public_id).trim() === '') {
    publicId = `mock-${crypto.randomBytes(6).toString('hex')}`;
  } else {
    publicId = normalizePublicId(body.public_id);
    if (!publicId) {
      return res.status(400).json({ error: { message: 'Invalid public_id' } });
    }
  }

  cloudinaryVersionCounter = Math.max(Math.floor(Date.now() / 1000), cloudinaryVersionCounter + 1);
  const version = cloudinaryVersionCounter;

  cloudinaryAssets.set(`${cloud}:${publicId}`, {
    cloud,
    publicId,
    version,
    format,
    contentType,
    buffer,
    bytes: buffer.length
  });

  const secureUrl = `${PUBLIC_BASE_URL}/cloudinary/${cloud}/image/upload/v${version}/${publicId}.${format}`;

  return res.status(200).json({
    public_id: publicId,
    secure_url: secureUrl,
    version,
    format,
    bytes: buffer.length
  });
});

cloudinaryRouter.get('/:cloud/image/upload/*rest', (req, res) => {
  const { cloud } = req.params;
  if (!cloud || !/^[A-Za-z0-9_-]+$/.test(cloud)) {
    return res.status(404).json({ error: { message: 'Resource not found' } });
  }

  const rawRest = req.params.rest;
  const segments = Array.isArray(rawRest) ? rawRest : [rawRest];
  if (
    segments.length === 0 ||
    segments.some(s => !s || s === '.' || s === '..' || !/^[A-Za-z0-9._-]+$/.test(s))
  ) {
    return res.status(404).json({ error: { message: 'Resource not found' } });
  }

  let requestedVersion = null;
  let assetSegments = segments;
  if (segments.length >= 2 && /^v(\d+)$/.test(segments[0])) {
    requestedVersion = Number(segments[0].slice(1));
    assetSegments = segments.slice(1);
  }

  const rawPath = assetSegments.join('/');
  const extMatch = rawPath.match(/^(.*)\.(png|jpg|jpeg)$/i);
  let publicId = rawPath;
  let reqExt = null;
  if (extMatch && extMatch[1].length > 0) {
    publicId = extMatch[1];
    reqExt = extMatch[2].toLowerCase();
  }

  const entry = cloudinaryAssets.get(`${cloud}:${publicId}`);
  if (!entry) {
    return res.status(404).json({ error: { message: 'Resource not found' } });
  }

  if (requestedVersion !== null && requestedVersion !== entry.version) {
    return res.status(404).json({ error: { message: 'Resource not found' } });
  }

  if (reqExt !== null && !(reqExt === entry.format || (reqExt === 'jpeg' && entry.format === 'jpg'))) {
    return res.status(404).json({ error: { message: 'Resource not found' } });
  }

  res.setHeader('Content-Type', entry.contentType);
  res.setHeader('Content-Length', String(entry.buffer.length));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(entry.buffer);
});

cloudinaryRouter.post('/v1_1/:cloud/image/destroy', (req, res) => {
  if (!verifyCloudinaryRequest(req, res)) {
    return;
  }

  const { cloud } = req.params;
  const body = req.body || {};
  if (body.public_id === undefined || body.public_id === null || String(body.public_id).trim() === '') {
    return res.status(400).json({ error: { message: 'Missing public_id' } });
  }

  const publicId = normalizePublicId(body.public_id);
  if (!publicId) {
    return res.status(400).json({ error: { message: 'Invalid public_id' } });
  }

  const existed = cloudinaryAssets.delete(`${cloud}:${publicId}`);
  return res.status(200).json({ result: existed ? 'ok' : 'not found' });
});

cloudinaryRouter.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Payload too large' } });
  }
  if (err) {
    return res.status(err.status || 400).json({ error: { message: err.message || 'Bad request' } });
  }
  return next();
});

cloudinaryRouter.use((req, res) => {
  return res.status(404).json({ error: { message: 'Cloudinary mock route not found' } });
});

app.use('/cloudinary', cloudinaryRouter);

// Parse JSON request bodies
app.use(express.json());

// Request logging middleware (excluding /mock/* and /cloudinary/* endpoints)
app.use((req, res, next) => {
  if (req.path.startsWith('/mock/') || req.path.startsWith('/cloudinary/')) {
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

// Authentication middleware using X-Service-Key (excluding /mock/* and /cloudinary/* endpoints)
app.use((req, res, next) => {
  if (req.path.startsWith('/mock/') || req.path.startsWith('/cloudinary/')) {
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
  const issuedAt = (req.body && req.body.issuedAt) || new Date().toISOString();

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
// 5 Testing Tools (/mock/*)
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
 * Clear all runtime memory state (tickets, enrollments, batchMembers, requestLog, cloudinaryAssets, cloudinaryFailNext)
 */
app.post('/mock/reset', (req, res) => {
  tickets.clear();
  enrollments.length = 0;
  batchMembers.length = 0;
  requestLog.length = 0;
  cloudinaryAssets.clear();
  cloudinaryFailNext = null;
  cloudinaryVersionCounter = 0;

  return res.status(200).json({
    ok: true,
    message: 'Đã đặt lại trạng thái bộ nhớ'
  });
});

/**
 * Tool 5: POST /mock/cloudinary/fail-next
 * Force the next Cloudinary upload to fail once (single-shot)
 */
app.post('/mock/cloudinary/fail-next', (req, res) => {
  const body = req.body || {};
  const status = body.status !== undefined ? body.status : 503;

  if (!Number.isInteger(status) || status < 400 || status > 599) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'status phải là số nguyên trong khoảng 400..599'
    });
  }

  const message =
    typeof body.message === 'string' && body.message.trim().length > 0
      ? body.message.trim()
      : 'Simulated Cloudinary outage';

  cloudinaryFailNext = { status, message };

  return res.status(200).json({
    ok: true,
    failNext: cloudinaryFailNext
  });
});

// Load initial data from data.json
loadData();

// Start HTTP server
app.listen(PORT, () => {
  console.log(`Mock chạy ở http://localhost:${PORT}`);
});
