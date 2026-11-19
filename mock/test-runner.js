/**
 * Test Runner toàn diện cho Mock External Systems & Testing Tools
 * Kiểm tra 8/8 tiêu chí tự kiểm của Mục 8 PDF Hướng dẫn dựng mock.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 9000;
const BASE_URL = `http://localhost:${PORT}`;
const SERVICE_KEY = 'dev-key';
const CLOUDINARY_CLOUD = 'dev-cloud';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'dev-key';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'dev-secret';
const DATA_FILE = path.join(__dirname, 'data.json');

// Helper to make raw HTTP requests (supports form-urlencoded and binary responses)
function requestRaw(method, pathUrl, headers = {}, rawBody = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    if (rawBody !== null && options.headers['Content-Length'] === undefined) {
      options.headers['Content-Length'] = Buffer.byteLength(rawBody);
    }

    const req = http.request(options, res => {
      const chunks = [];
      res.on('data', chunk => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        let data = null;
        const text = bodyBuffer.toString('utf8');
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          bodyBuffer,
          data
        });
      });
    });

    req.on('error', reject);

    if (rawBody !== null) {
      req.write(rawBody);
    }
    req.end();
  });
}

function computeCloudinarySignature(params, apiSecret) {
  const excluded = new Set(['file', 'cloud_name', 'resource_type', 'api_key', 'signature']);
  const keys = Object.keys(params)
    .filter(k => !excluded.has(k) && params[k] !== undefined && params[k] !== null && String(params[k]) !== '')
    .sort();
  const payload = keys.map(k => `${k}=${String(params[k])}`).join('&');
  return crypto
    .createHash('sha1')
    .update(payload + apiSecret, 'utf8')
    .digest('hex');
}

function requestForm(pathUrl, params, headers = {}) {
  const encoded = new URLSearchParams(params).toString();
  return requestRaw(
    'POST',
    pathUrl,
    {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers
    },
    encoded
  );
}

// Helper to make HTTP requests
function request(method, pathUrl, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let payload = null;
    if (body !== null) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN MOCK SERVICE ===\n');

  // Khởi động server.js
  console.log('1. Khởi chạy tiến trình server.js...');
  const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(PORT) }
  });

  let serverStarted = false;
  let startOutput = '';

  serverProcess.stdout.on('data', chunk => {
    const msg = chunk.toString();
    startOutput += msg;
    if (msg.includes(`Mock chạy ở http://localhost:${PORT}`)) {
      serverStarted = true;
    }
  });

  serverProcess.stderr.on('data', chunk => {
    console.error('Server Stderr:', chunk.toString());
  });

  // Chờ server khởi động
  for (let i = 0; i < 20; i++) {
    if (serverStarted) break;
    await sleep(200);
  }

  if (!serverStarted) {
    console.error('LỖI: Server không in đúng thông điệp khởi động. Output:', startOutput);
    serverProcess.kill();
    process.exit(1);
  }

  console.log(`[PASS] Tiêu chí 1: Server khởi chạy thành công. Log: "${startOutput.trim()}"\n`);

  try {
    // -------------------------------------------------------------
    // Tiêu chí 2: Bảo mật Service Key
    // -------------------------------------------------------------
    console.log('--- Kiểm tra Tiêu chí 2: Xác thực X-Service-Key ---');
    const resNoKey = await request('GET', '/lms/courses');
    console.log('GET /lms/courses không có key -> Status:', resNoKey.status, 'Body:', JSON.stringify(resNoKey.data));
    if (resNoKey.status !== 401 || resNoKey.data.code !== 'INVALID_SERVICE_KEY') {
      throw new Error('Thất bại: Không chặn request thiếu X-Service-Key');
    }

    const resWrongKey = await request('GET', '/lms/courses', { 'X-Service-Key': 'wrong-key' });
    console.log('GET /lms/courses với key sai -> Status:', resWrongKey.status, 'Body:', JSON.stringify(resWrongKey.data));
    if (resWrongKey.status !== 401 || resWrongKey.data.code !== 'INVALID_SERVICE_KEY') {
      throw new Error('Thất bại: Không chặn request có X-Service-Key sai');
    }
    console.log('[PASS] Tiêu chí 2: Chặn 401 chính xác khi thiếu hoặc sai key.\n');

    // -------------------------------------------------------------
    // Tiêu chí 3: Đầy đủ 11 endpoints nghiệp vụ
    // -------------------------------------------------------------
    console.log('--- Kiểm tra Tiêu chí 3: 11 Endpoint Nghiệp Vụ ---');

    // 1. POST /lms/sso/tickets
    console.log('Test 1: POST /lms/sso/tickets');
    const resTicket = await request('POST', '/lms/sso/tickets', { 'X-Service-Key': SERVICE_KEY }, { lmsUserId: 'lms-sv-001' });
    console.log('  Status:', resTicket.status, 'Data:', resTicket.data);
    if (resTicket.status !== 201 || !resTicket.data.ticket || !resTicket.data.issuedAt) {
      throw new Error('Thất bại: Cấp vé SSO không đúng định dạng');
    }
    const ticketId = resTicket.data.ticket;

    const resTicket404 = await request('POST', '/lms/sso/tickets', { 'X-Service-Key': SERVICE_KEY }, { lmsUserId: 'lms-sv-999' });
    console.log('  lmsUserId sai -> Status:', resTicket404.status, 'Data:', resTicket404.data);
    if (resTicket404.status !== 404 || resTicket404.data.code !== 'NOT_FOUND') {
      throw new Error('Thất bại: Cấp vé cho user không tồn tại không trả 404');
    }

    // 2. POST /lms/sso/verify
    console.log('Test 2: POST /lms/sso/verify');
    const resVerify = await request('POST', '/lms/sso/verify', { 'X-Service-Key': SERVICE_KEY }, { ticket: ticketId });
    console.log('  Status:', resVerify.status, 'Data:', resVerify.data);
    if (resVerify.status !== 200 || resVerify.data.lmsUserId !== 'lms-sv-001' || resVerify.data.role !== 'CANDIDATE') {
      throw new Error('Thất bại: Verify vé SSO trả thông tin sai');
    }

    // Tiêu chí 4: Verify lại vé cũ lần 2 vẫn trả 200 (không chặn ở mock)
    console.log('Test 2b (Tiêu chí 4): Verify lại vé cũ lần 2');
    const resVerifyAgain = await request('POST', '/lms/sso/verify', { 'X-Service-Key': SERVICE_KEY }, { ticket: ticketId });
    console.log('  Verify lần 2 -> Status:', resVerifyAgain.status, 'Data:', resVerifyAgain.data);
    if (resVerifyAgain.status !== 200) {
      throw new Error('Thất bại: Mock không được tự ý chặn vé cũ (phải trả 200, backend mới là nơi chặn)');
    }

    const resVerifyFake = await request('POST', '/lms/sso/verify', { 'X-Service-Key': SERVICE_KEY }, { ticket: 'fake-ticket-123' });
    console.log('  Verify vé bịa -> Status:', resVerifyFake.status, 'Data:', resVerifyFake.data);
    if (resVerifyFake.status !== 404 || resVerifyFake.data.code !== 'NOT_FOUND') {
      throw new Error('Thất bại: Vé bịa không trả về 404');
    }
    console.log('[PASS] Tiêu chí 4: Cấp vé, verify đúng candidate1, verify lại trả 200, vé bịa trả 404.');

    // 3. GET /lms/students/:lmsUserId
    console.log('Test 3: GET /lms/students/:lmsUserId');
    const resStudent = await request('GET', '/lms/students/lms-sv-001', { 'X-Service-Key': SERVICE_KEY });
    console.log('  lms-sv-001 -> Status:', resStudent.status, 'Data:', resStudent.data);
    if (resStudent.status !== 200 || resStudent.data.fullName !== 'Nguyễn Văn An') {
      throw new Error('Thất bại: Lấy thông tin sinh viên lms-sv-001 sai');
    }

    const resMentorStudent = await request('GET', '/lms/students/lms-mt-001', { 'X-Service-Key': SERVICE_KEY });
    console.log('  lms-mt-001 (role MENTOR) -> Status:', resMentorStudent.status, 'Data:', resMentorStudent.data);
    if (resMentorStudent.status !== 404) {
      throw new Error('Thất bại: User không phải CANDIDATE phải trả về 404');
    }

    // 4. GET /lms/students/:lmsUserId/results
    console.log('Test 4: GET /lms/students/:lmsUserId/results');
    const resResults = await request('GET', '/lms/students/lms-sv-001/results', { 'X-Service-Key': SERVICE_KEY });
    console.log('  lms-sv-001 results -> Status:', resResults.status, 'Length:', resResults.data.length);
    if (resResults.status !== 200 || !Array.isArray(resResults.data) || resResults.data.length !== 5) {
      throw new Error('Thất bại: Kết quả học tập lms-sv-001 không đủ 5 môn');
    }

    const resResultsEmpty = await request('GET', '/lms/students/lms-sv-999/results', { 'X-Service-Key': SERVICE_KEY });
    console.log('  user không tồn tại -> Status:', resResultsEmpty.status, 'Data:', resResultsEmpty.data);
    if (resResultsEmpty.status !== 200 || !Array.isArray(resResultsEmpty.data) || resResultsEmpty.data.length !== 0) {
      throw new Error('Thất bại: User không có điểm phải trả mảng rỗng [] thay vì 404');
    }

    // 5. GET /lms/courses
    console.log('Test 5: GET /lms/courses');
    const resCourses = await request('GET', '/lms/courses', { 'X-Service-Key': SERVICE_KEY });
    console.log('  All courses -> Status:', resCourses.status, 'Total:', resCourses.data.length);
    if (resCourses.status !== 200 || resCourses.data.length !== 6) {
      throw new Error('Thất bại: Danh sách khóa học phải có đúng 6 khóa');
    }

    const resCoursesFilter = await request('GET', '/lms/courses?skill=JAVA', { 'X-Service-Key': SERVICE_KEY });
    console.log('  Courses skill=JAVA -> Status:', resCoursesFilter.status, 'Count:', resCoursesFilter.data.length);
    if (resCoursesFilter.status !== 200 || resCoursesFilter.data.length !== 1 || resCoursesFilter.data[0].courseId !== 'LMS-C-JAVA-02') {
      throw new Error('Thất bại: Lọc khóa học theo skill=JAVA sai');
    }

    const resCoursesEmpty = await request('GET', '/lms/courses?skill=NON_EXISTENT', { 'X-Service-Key': SERVICE_KEY });
    console.log('  Courses skill không có -> Status:', resCoursesEmpty.status, 'Data:', resCoursesEmpty.data);
    if (resCoursesEmpty.status !== 200 || !Array.isArray(resCoursesEmpty.data) || resCoursesEmpty.data.length !== 0) {
      throw new Error('Thất bại: Lọc không có kết quả phải trả []');
    }

    // 6. POST /lms/enrollments
    console.log('Test 6: POST /lms/enrollments');
    const resEnroll = await request('POST', '/lms/enrollments', { 'X-Service-Key': SERVICE_KEY }, {
      lmsUserId: 'lms-sv-001',
      courseId: 'LMS-C-JAVA-02'
    });
    console.log('  Ghi danh lần 1 -> Status:', resEnroll.status, 'Data:', resEnroll.data);
    if (resEnroll.status !== 201 || resEnroll.data.status !== 'ENROLLED') {
      throw new Error('Thất bại: Ghi danh khóa học lần đầu không trả 201');
    }

    // Tiêu chí 5: Ghi danh lần 2 trả 409 ALREADY_ENROLLED
    const resEnrollDup = await request('POST', '/lms/enrollments', { 'X-Service-Key': SERVICE_KEY }, {
      lmsUserId: 'lms-sv-001',
      courseId: 'LMS-C-JAVA-02'
    });
    console.log('  Ghi danh lần 2 (Tiêu chí 5) -> Status:', resEnrollDup.status, 'Data:', resEnrollDup.data);
    if (resEnrollDup.status !== 409 || resEnrollDup.data.code !== 'ALREADY_ENROLLED') {
      throw new Error('Thất bại: Ghi danh trùng không trả về 409 ALREADY_ENROLLED');
    }

    // 7. GET /lms/enrollments/:lmsUserId
    console.log('Test 7: GET /lms/enrollments/:lmsUserId');
    const resListEnroll = await request('GET', '/lms/enrollments/lms-sv-001', { 'X-Service-Key': SERVICE_KEY });
    console.log('  Danh sách ghi danh lms-sv-001 -> Status:', resListEnroll.status, 'Count:', resListEnroll.data.length);
    if (resListEnroll.status !== 200 || resListEnroll.data.length !== 1) {
      throw new Error('Thất bại: Lấy danh sách ghi danh không đúng');
    }

    // 8. GET /exam/students/:lmsUserId/results
    console.log('Test 8: GET /exam/students/:lmsUserId/results');
    const resExam = await request('GET', '/exam/students/lms-sv-001/results', { 'X-Service-Key': SERVICE_KEY });
    console.log('  Điểm thi lms-sv-001 -> Status:', resExam.status, 'Count:', resExam.data.length);
    if (resExam.status !== 200 || resExam.data[0].score !== 8.0) {
      throw new Error('Thất bại: Điểm thi khảo thí sai');
    }

    // 9. GET /pm/students/:lmsUserId/internships
    console.log('Test 9: GET /pm/students/:lmsUserId/internships');
    const resIntern = await request('GET', '/pm/students/lms-sv-001/internships', { 'X-Service-Key': SERVICE_KEY });
    console.log('  Thực tập lms-sv-001 -> Status:', resIntern.status, 'FinalScore:', resIntern.data[0].finalScore);
    if (resIntern.status !== 200 || resIntern.data[0].finalScore !== 8.5) {
      throw new Error('Thất bại: Điểm thực tập sai');
    }

    // 10. POST /pm/batches/:batchId/members
    console.log('Test 10: POST /pm/batches/:batchId/members');
    const resMember = await request('POST', '/pm/batches/IOC-JB-2026-09/members', { 'X-Service-Key': SERVICE_KEY }, {
      lmsUserId: 'lms-sv-001'
    });
    console.log('  Thêm member lần 1 -> Status:', resMember.status, 'Data:', resMember.data);
    if (resMember.status !== 201 || resMember.data.lmsUserId !== 'lms-sv-001') {
      throw new Error('Thất bại: Thêm thành viên đợt thực tập không trả 201');
    }

    // Tiêu chí 5: Thêm lại cùng bạn vào cùng đợt trả 409 ALREADY_MEMBER
    const resMemberDup = await request('POST', '/pm/batches/IOC-JB-2026-09/members', { 'X-Service-Key': SERVICE_KEY }, {
      lmsUserId: 'lms-sv-001'
    });
    console.log('  Thêm member lần 2 (Tiêu chí 5) -> Status:', resMemberDup.status, 'Data:', resMemberDup.data);
    if (resMemberDup.status !== 409 || resMemberDup.data.code !== 'ALREADY_MEMBER') {
      throw new Error('Thất bại: Thêm thành viên trùng không trả về 409 ALREADY_MEMBER');
    }
    console.log('[PASS] Tiêu chí 5: Ghi danh trùng trả 409, thêm thành viên trùng trả 409.');

    // 11. POST /meet/rooms
    console.log('Test 11: POST /meet/rooms');
    const resMeet = await request('POST', '/meet/rooms', { 'X-Service-Key': SERVICE_KEY }, {
      title: 'Phỏng vấn Java Backend',
      startAt: '2026-11-15T09:00:00+07:00',
      endAt: '2026-11-15T10:00:00+07:00'
    });
    console.log('  Tạo phòng hợp lệ -> Status:', resMeet.status, 'RoomUrl:', resMeet.data.roomUrl);
    if (resMeet.status !== 201 || !resMeet.data.roomId.startsWith('room-')) {
      throw new Error('Thất bại: Tạo phòng phỏng vấn trả về dữ liệu sai');
    }

    const resMeetMissing = await request('POST', '/meet/rooms', { 'X-Service-Key': SERVICE_KEY }, {
      title: 'Thiếu thời gian'
    });
    console.log('  Thiếu trường -> Status:', resMeetMissing.status, 'Data:', resMeetMissing.data);
    if (resMeetMissing.status !== 400 || resMeetMissing.data.code !== 'VALIDATION_ERROR') {
      throw new Error('Thất bại: Tạo phòng thiếu trường không trả 400 VALIDATION_ERROR');
    }

    console.log('[PASS] Tiêu chí 3: Đầy đủ 11 endpoints nghiệp vụ, đúng tên trường và mã lỗi.\n');

    // -------------------------------------------------------------
    // Tiêu chí 6: Sửa điểm trong data.json, gọi /mock/reload
    // -------------------------------------------------------------
    console.log('--- Kiểm tra Tiêu chí 6: Hot Reload dữ liệu ---');
    const originalContent = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsedData = JSON.parse(originalContent);

    // Tạm sửa điểm môn JAVA01 của lms-sv-001 từ 8.5 thành 9.9
    parsedData.lmsResults['lms-sv-001'][0].score = 9.9;
    fs.writeFileSync(DATA_FILE, JSON.stringify(parsedData, null, 2), 'utf-8');

    // Gọi /mock/reload
    const resReload = await request('POST', '/mock/reload');
    console.log('POST /mock/reload -> Status:', resReload.status, 'Data:', resReload.data);
    if (resReload.status !== 200 || !resReload.data.ok) {
      throw new Error('Thất bại: /mock/reload không trả ok: true');
    }

    // Gọi lại API kết quả kiểm tra điểm mới
    const resCheckScore = await request('GET', '/lms/students/lms-sv-001/results', { 'X-Service-Key': SERVICE_KEY });
    const newScore = resCheckScore.data[0].score;
    console.log('Điểm JAVA01 sau reload ->', newScore);
    if (newScore !== 9.9) {
      throw new Error(`Thất bại: Điểm mới không phản ánh sau reload (kỳ vọng 9.9, thực tế: ${newScore})`);
    }

    // Khôi phục lại file ban đầu và reload lại
    fs.writeFileSync(DATA_FILE, originalContent, 'utf-8');
    await request('POST', '/mock/reload');
    const resRestored = await request('GET', '/lms/students/lms-sv-001/results', { 'X-Service-Key': SERVICE_KEY });
    console.log('Điểm JAVA01 sau khi khôi phục ->', resRestored.data[0].score);
    if (resRestored.data[0].score !== 8.5) {
      throw new Error('Thất bại: Không khôi phục được điểm ban đầu');
    }
    console.log('[PASS] Tiêu chí 6: Hot reload dữ liệu thành công không cần restart server.\n');

    // -------------------------------------------------------------
    // Tiêu chí 7: /mock/requests hiển thị đúng log
    // -------------------------------------------------------------
    console.log('--- Kiểm tra Tiêu chí 7: Request Log & cờ hasKey ---');
    const resLog = await request('GET', '/mock/requests');
    console.log('GET /mock/requests -> Status:', resLog.status, 'Log count:', resLog.data.length);
    if (resLog.status !== 200 || !Array.isArray(resLog.data) || resLog.data.length === 0) {
      throw new Error('Thất bại: /mock/requests không ghi nhận request log');
    }

    // Kiểm tra cờ hasKey trong log
    const hasKeyTrue = resLog.data.some(r => r.hasKey === true);
    const hasKeyFalse = resLog.data.some(r => r.hasKey === false);
    const containsMock = resLog.data.some(r => r.path && r.path.startsWith('/mock/'));

    console.log('  Log có request hasKey=true:', hasKeyTrue);
    console.log('  Log có request hasKey=false:', hasKeyFalse);
    console.log('  Log có chứa request /mock/*:', containsMock);

    if (!hasKeyTrue || !hasKeyFalse) {
      throw new Error('Thất bại: Log không phân biệt đúng cờ hasKey');
    }
    if (containsMock) {
      throw new Error('Thất bại: Log không được chứa các request /mock/*');
    }
    console.log('[PASS] Tiêu chí 7: /mock/requests ghi nhận đúng request và cờ hasKey, loại trừ /mock/*.\n');

    // -------------------------------------------------------------
    // Kiểm tra các công cụ /mock/enrollments và /mock/reset
    // -------------------------------------------------------------
    console.log('--- Kiểm tra PATCH /mock/enrollments & POST /mock/reset ---');
    const resPatch = await request('PATCH', '/mock/enrollments', {}, {
      lmsUserId: 'lms-sv-001',
      courseId: 'LMS-C-JAVA-02',
      progress: 100,
      score: 9.5,
      status: 'COMPLETED'
    });
    console.log('PATCH /mock/enrollments -> Status:', resPatch.status, 'Data:', resPatch.data);
    if (resPatch.status !== 200 || resPatch.data.status !== 'COMPLETED' || resPatch.data.progress !== 100) {
      throw new Error('Thất bại: PATCH /mock/enrollments không cập nhật đúng');
    }

    const resReset = await request('POST', '/mock/reset');
    console.log('POST /mock/reset -> Status:', resReset.status, 'Data:', resReset.data);
    if (resReset.status !== 200 || !resReset.data.ok) {
      throw new Error('Thất bại: POST /mock/reset không trả về ok');
    }

    // Sau reset, requestLog phải rỗng, enrollments rỗng
    const resLogAfterReset = await request('GET', '/mock/requests');
    const resEnrollAfterReset = await request('GET', '/lms/enrollments/lms-sv-001', { 'X-Service-Key': SERVICE_KEY });
    console.log('Log count sau reset:', resLogAfterReset.data.length, 'Enrollments sau reset:', resEnrollAfterReset.data.length);
    if (resLogAfterReset.data.length !== 0 || resEnrollAfterReset.data.length !== 0) {
      throw new Error('Thất bại: Sau reset bộ nhớ vẫn còn dữ liệu');
    }
    console.log('[PASS] Hoàn thành kiểm tra PATCH /mock/enrollments và POST /mock/reset.\n');

    // -------------------------------------------------------------
    // Tiêu chí 9: Cloudinary Mock Router & Tool #5 (/mock/cloudinary/fail-next)
    // -------------------------------------------------------------
    console.log('--- Kiểm tra Cloudinary Mock Router (/cloudinary/*) & fail-next ---');

    // 1. Official Cloudinary signature vector
    const docVectorSig = computeCloudinarySignature(
      {
        eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
        public_id: 'sample_image',
        timestamp: '1315060510'
      },
      'abcd'
    );
    if (docVectorSig !== 'bfd09f95f331f558cbd1320e67aa8d488770583e') {
      throw new Error(`Thất bại: Vector chữ ký Cloudinary không khớp (${docVectorSig})`);
    }

    // Minimal valid 1x1 PNG & minimal JPEG bytes
    const pngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex'
    );
    const jpegBytes = Buffer.from(
      'ffd8ffe000104a46494600010101004800480000ffdb0043000302020302020303030304030304050805050404050a070706080c0a0c0c0b0a0b0b0d0e12100d0e110e0b0b1016101113141515150c0f171816141812141514ffc0000b080001000101011100ffc40014000100000000000000000000000000000009ffc40014100100000000000000000000000000000000ffda0008010100003f00d2cf20ffd9',
      'hex'
    );

    // 2. Upload PNG without X-Service-Key
    const pngPublicId = 'rikkei-jobs/company-logos/company-1';
    const pngParams = {
      api_key: CLOUDINARY_API_KEY,
      timestamp: '1763437800',
      public_id: pngPublicId,
      overwrite: 'true',
      invalidate: 'true',
      unique_filename: 'false',
      file: `data:image/png;base64,${pngBytes.toString('base64')}`
    };
    pngParams.signature = computeCloudinarySignature(pngParams, CLOUDINARY_API_SECRET);

    const resPngUpload = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/upload`, pngParams);
    console.log('  PNG upload -> Status:', resPngUpload.status, 'Data:', resPngUpload.data);
    const expectedPrefix = `http://127.0.0.1:${PORT}/cloudinary/${CLOUDINARY_CLOUD}/image/upload/v`;
    if (
      resPngUpload.status !== 200 ||
      resPngUpload.data.public_id !== pngPublicId ||
      resPngUpload.data.format !== 'png' ||
      resPngUpload.data.bytes !== pngBytes.length ||
      typeof resPngUpload.data.version !== 'number' ||
      !String(resPngUpload.data.secure_url).startsWith(expectedPrefix)
    ) {
      throw new Error('Thất bại: Upload PNG tới Cloudinary mock không hợp lệ');
    }

    // 3. Deliver PNG bytes & Content-Type without X-Service-Key
    const pngDeliveryUrl = new URL(resPngUpload.data.secure_url);
    const resPngGet = await requestRaw('GET', pngDeliveryUrl.pathname);
    if (
      resPngGet.status !== 200 ||
      resPngGet.headers['content-type'] !== 'image/png' ||
      resPngGet.headers['cache-control'] !== 'no-store' ||
      !resPngGet.bodyBuffer.equals(pngBytes)
    ) {
      throw new Error('Thất bại: Delivery PNG không trả về đúng bytes hoặc Content-Type');
    }

    // 4. Upload JPEG & verify Content-Type + monotonic version
    const jpegPublicId = 'rikkei-jobs/company-logos/company-2';
    const jpegParams = {
      api_key: CLOUDINARY_API_KEY,
      timestamp: '1763437801',
      public_id: jpegPublicId,
      overwrite: 'true',
      invalidate: 'true',
      unique_filename: 'false',
      file: `data:image/jpeg;base64,${jpegBytes.toString('base64')}`
    };
    jpegParams.signature = computeCloudinarySignature(jpegParams, CLOUDINARY_API_SECRET);

    const resJpegUpload = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/upload`, jpegParams);
    if (resJpegUpload.status !== 200 || resJpegUpload.data.format !== 'jpg') {
      throw new Error('Thất bại: Upload JPEG tới Cloudinary mock không trả về format jpg');
    }
    const resJpegGet = await requestRaw('GET', new URL(resJpegUpload.data.secure_url).pathname);
    if (
      resJpegGet.status !== 200 ||
      resJpegGet.headers['content-type'] !== 'image/jpeg' ||
      !resJpegGet.bodyBuffer.equals(jpegBytes)
    ) {
      throw new Error('Thất bại: Delivery JPEG không trả về đúng bytes hoặc Content-Type');
    }

    // Re-upload PNG same public_id -> monotonic version bump, old version 404
    const resPngReupload = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/upload`, pngParams);
    if (resPngReupload.status !== 200 || resPngReupload.data.version <= resPngUpload.data.version) {
      throw new Error('Thất bại: Re-upload cùng public_id không tăng version đơn điệu');
    }
    const resOldVersion = await requestRaw('GET', pngDeliveryUrl.pathname);
    if (resOldVersion.status !== 404) {
      throw new Error('Thất bại: Version cũ sau khi overwrite phải trả 404');
    }

    // 5. 401 on bad signature or bad api_key
    const resBadSig = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      ...pngParams,
      signature: '0000000000000000000000000000000000000000'
    });
    if (resBadSig.status !== 401) {
      throw new Error(`Thất bại: Sai signature phải trả 401 (thực tế: ${resBadSig.status})`);
    }

    const resBadKey = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      ...pngParams,
      api_key: 'wrong-api-key'
    });
    if (resBadKey.status !== 401) {
      throw new Error(`Thất bại: Sai api_key phải trả 401 (thực tế: ${resBadKey.status})`);
    }

    // 6. 400 on invalid data URI or traversal public_id
    const badUriParams = {
      api_key: CLOUDINARY_API_KEY,
      timestamp: '1763437802',
      public_id: pngPublicId,
      file: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
    };
    badUriParams.signature = computeCloudinarySignature(badUriParams, CLOUDINARY_API_SECRET);
    const resBadUri = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/upload`, badUriParams);
    if (resBadUri.status !== 400) {
      throw new Error(`Thất bại: Data URI SVG phải trả 400 (thực tế: ${resBadUri.status})`);
    }

    const traversalParams = {
      api_key: CLOUDINARY_API_KEY,
      timestamp: '1763437803',
      public_id: '../escape',
      file: pngParams.file
    };
    traversalParams.signature = computeCloudinarySignature(traversalParams, CLOUDINARY_API_SECRET);
    const resTraversal = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/upload`, traversalParams);
    if (resTraversal.status !== 400) {
      throw new Error(`Thất bại: public_id traversal phải trả 400 (thực tế: ${resTraversal.status})`);
    }

    // 7. 404 on missing asset & unknown /cloudinary/* route (never 401 INVALID_SERVICE_KEY)
    const resMissingAsset = await requestRaw('GET', `/cloudinary/${CLOUDINARY_CLOUD}/image/upload/v1/missing.png`);
    if (resMissingAsset.status !== 404) {
      throw new Error(`Thất bại: Ảnh không tồn tại phải trả 404 (thực tế: ${resMissingAsset.status})`);
    }
    const resUnknownCloudRoute = await requestRaw('GET', '/cloudinary/unknown-route');
    if (resUnknownCloudRoute.status !== 404) {
      throw new Error(`Thất bại: Route lạ trong /cloudinary/* phải trả 404 (thực tế: ${resUnknownCloudRoute.status})`);
    }

    // 8. Destroy endpoint
    const destroyParams = {
      api_key: CLOUDINARY_API_KEY,
      timestamp: '1763437804',
      public_id: jpegPublicId
    };
    destroyParams.signature = computeCloudinarySignature(destroyParams, CLOUDINARY_API_SECRET);
    const resDestroyBadSig = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/destroy`, {
      ...destroyParams,
      signature: 'ffffffffffffffffffffffffffffffffffffffff'
    });
    if (resDestroyBadSig.status !== 401) {
      throw new Error('Thất bại: Destroy sai signature phải trả 401');
    }
    const resDestroyOk = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/destroy`, destroyParams);
    if (resDestroyOk.status !== 200 || resDestroyOk.data.result !== 'ok') {
      throw new Error('Thất bại: Destroy hợp lệ phải trả 200 { result: "ok" }');
    }
    const resAfterDestroy = await requestRaw('GET', new URL(resJpegUpload.data.secure_url).pathname);
    if (resAfterDestroy.status !== 404) {
      throw new Error('Thất bại: GET sau khi destroy phải trả 404');
    }
    const resDestroyAgain = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/destroy`, destroyParams);
    if (resDestroyAgain.status !== 200 || resDestroyAgain.data.result !== 'not found') {
      throw new Error('Thất bại: Destroy lần 2 phải trả 200 { result: "not found" }');
    }

    // 9. Tool #5: POST /mock/cloudinary/fail-next (single-shot)
    const resFailNextBad = await request('POST', '/mock/cloudinary/fail-next', {}, { status: 200 });
    if (resFailNextBad.status !== 400) {
      throw new Error('Thất bại: fail-next với status ngoài 400..599 phải trả 400');
    }
    const resFailNextSet = await request(
      'POST',
      '/mock/cloudinary/fail-next',
      {},
      { status: 503, message: 'Simulated outage' }
    );
    if (resFailNextSet.status !== 200 || !resFailNextSet.data.ok || resFailNextSet.data.failNext.status !== 503) {
      throw new Error('Thất bại: POST /mock/cloudinary/fail-next không thiết lập được cờ lỗi');
    }
    const resUploadFailed = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/upload`, pngParams);
    if (resUploadFailed.status !== 503 || !resUploadFailed.data.error) {
      throw new Error(`Thất bại: Upload sau fail-next phải trả 503 (thực tế: ${resUploadFailed.status})`);
    }
    const resUploadRecovered = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/upload`, pngParams);
    if (resUploadRecovered.status !== 200) {
      throw new Error(`Thất bại: Upload tiếp theo sau single-shot fail-next phải phục hồi 200 (thực tế: ${resUploadRecovered.status})`);
    }

    // 10. Reset clears failNext, cloudinaryAssets, and requestLog excludes /cloudinary/*
    await request('POST', '/mock/cloudinary/fail-next', {}, { status: 500 });
    const resReset2 = await request('POST', '/mock/reset');
    if (resReset2.status !== 200 || !resReset2.data.ok) {
      throw new Error('Thất bại: POST /mock/reset lần 2 không trả ok');
    }
    const resAfterResetGet = await requestRaw('GET', new URL(resUploadRecovered.data.secure_url).pathname);
    if (resAfterResetGet.status !== 404) {
      throw new Error('Thất bại: /mock/reset phải xóa sạch cloudinaryAssets');
    }
    const resUploadAfterReset = await requestForm(`/cloudinary/v1_1/${CLOUDINARY_CLOUD}/image/upload`, pngParams);
    if (resUploadAfterReset.status !== 200) {
      throw new Error('Thất bại: /mock/reset phải xóa cả cờ failNext đang chờ');
    }
    const resLogCheck = await request('GET', '/mock/requests');
    if (
      resLogCheck.status !== 200 ||
      resLogCheck.data.some(r => r.path && (r.path.startsWith('/cloudinary/') || r.path.startsWith('/mock/')))
    ) {
      throw new Error('Thất bại: /mock/requests không được ghi log /cloudinary/* hoặc /mock/*');
    }
    await request('POST', '/mock/reset');
    console.log('[PASS] Hoàn thành kiểm tra Cloudinary Mock Router (/cloudinary/*) và Tool #5 fail-next.\n');

    console.log('================================================================');
    console.log('TẤT CẢ CÁC BÀI TEST ĐÃ VƯỢT QUA 100% THÀNH CÔNG RỰC RỠ!');
    console.log('ĐẠT TOÀN DIỆN 8/8 TIÊU CHÍ TỰ KIỂM + CLOUDINARY MOCK EXTENSION');
    console.log('================================================================');
  } finally {
    console.log('\nDừng tiến trình server.js...');
    serverProcess.kill();
  }
}

runTests().catch(err => {
  console.error('\n[LỖI TEST]:', err);
  process.exit(1);
});
