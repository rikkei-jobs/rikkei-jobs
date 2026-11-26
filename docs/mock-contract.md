# External Systems Mock Contract Specification / Đặc Tả Hợp Đồng Dịch Vụ Giả Lập Hệ Thống Ngoài

This document provides the authoritative interface specification and contract for the **Rikkei Jobs External Systems Mock** service in both English and Vietnamese. It defines the communication protocols, authentication rules, endpoints, and data payloads between the Rikkei Jobs Backend/Frontend and external mocked systems (LMS, Examination System, Project Management IOC, Rikkei Meet, and Cloudinary Logo Storage).

Tài liệu này cung cấp đặc tả giao diện và hợp đồng chuẩn cho dịch vụ **Rikkei Jobs External Systems Mock** bằng cả tiếng Anh và tiếng Việt, quy định giao thức, quy tắc xác thực, endpoint và dữ liệu trao đổi giữa Backend/Frontend Rikkei Jobs với các hệ thống giả lập bên ngoài (LMS, Khảo thí, Quản lý dự án IOC, Rikkei Meet và Lưu trữ logo Cloudinary).

---

## Part 1: English Section

### 1. Overview & Operational Principles

#### 1.1 Architecture & Process Separation

- The mock service runs as an independent Node.js + Express process listening on port `9000` (`http://localhost:9000`, `http://127.0.0.1:9000`, or `http://mock:9000` inside Docker Compose).
- **In-Memory State**: Runtime data (generated SSO tickets, dynamic course enrollments, batch members, request logs, uploaded Cloudinary mock assets, and the single-shot failure flag) is held entirely in memory. Structured seed data initializes from `data.json` on startup. No persistent database is used.
- **Frontend Isolation**: The frontend client MUST NEVER call the `X-Service-Key` business endpoints (`/lms/*`, `/exam/*`, `/pm/*`, `/meet/*`). The `X-Service-Key` must never be exposed to browser environments. The frontend Nginx reverse proxy strictly never proxies `/mock` or `/cloudinary`.
- **Direct Browser Asset Delivery (`/cloudinary/*`)**: For company logo images, the mock returns `secure_url` prefixed with `PUBLIC_BASE_URL` (default `http://127.0.0.1:9000`, matching `CLOUDINARY_DELIVERY_BASE_URL=http://127.0.0.1:9000/cloudinary`) so browsers can load logo images directly via `<img src={logoUrl}>` without going through Nginx or requiring `X-Service-Key`.

#### 1.2 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `9000` | HTTP listening port for the mock server |
| `SERVICE_KEY` | `dev-key` | Shared key checked on `X-Service-Key` for the 11 business endpoints |
| `PUBLIC_BASE_URL` | `http://127.0.0.1:${PORT}` | Browser-reachable public base URL used to construct Cloudinary `secure_url` responses |
| `CLOUDINARY_API_KEY` | `dev-key` | Dummy API key expected in Cloudinary upload/destroy form requests |
| `CLOUDINARY_API_SECRET` | `dev-secret` | Dummy API secret used to recompute and verify Cloudinary SHA-1 signatures |

#### 1.3 Authentication & Security Header

All 11 functional endpoints under `/lms`, `/exam`, `/pm`, and `/meet` require authentication via a secret pre-shared service key header:

```http
X-Service-Key: dev-key
```

- **Missing or Invalid Key Response**:
  - HTTP Status: `401 Unauthorized`
  - Response Body:

    ```json
    {
      "code": "INVALID_SERVICE_KEY",
      "message": "Thiếu hoặc sai X-Service-Key"
    }
    ```

- **Cloudinary Mock Namespace (`/cloudinary/*`)**: Uses a separate router mounted before `requestLog` and `X-Service-Key` middlewares. It DOES NOT require `X-Service-Key` and is NEVER recorded in `GET /mock/requests` (preventing base64 payloads, `api_key`, or `signature` values from sitting in memory logs). Upload and destroy calls authenticate using `api_key` and Cloudinary SHA-1 `signature`.
- **Public Testing Tools (`/mock/*`)**: Endpoints under `/mock/*` are administrative testing utilities, DO NOT require `X-Service-Key`, and are NOT recorded in `GET /mock/requests`.

#### 1.4 SSO Ticket Expiration & Single-Use Enforcement Rule

- **Mock Behavior**: The mock server deliberately DOES NOT block expired or already-used SSO tickets, and DOES NOT enforce the 60-second expiration window. Repeated calls to `POST /lms/sso/verify` with the same ticket will return `200 OK`.
- **Backend Responsibility (Task NT-01)**: The Rikkei Jobs **Backend** is strictly responsible for enforcing single-use and the 60-second TTL window during user login:
  1. The backend stores verified ticket IDs in a `used_sso_tickets` table; duplicate submissions return HTTP `401 UNAUTHORIZED`.
  2. The backend compares `now - issuedAt > 60 seconds`; expired tickets return HTTP `401 UNAUTHORIZED`.

---

### 2. Table of 11 Business Endpoints

| # | Method | Path | Auth Header | Success Status | Error Statuses | Description |
|---|---|---|---|---|---|---|
| 1 | `POST` | `/lms/sso/tickets` | `X-Service-Key` | `201 Created` | `401`, `404` | Issue temporary SSO ticket for a student/staff |
| 2 | `POST` | `/lms/sso/verify` | `X-Service-Key` | `200 OK` | `401`, `404` | Verify an SSO ticket and return user identity |
| 3 | `GET` | `/lms/students/{lmsUserId}` | `X-Service-Key` | `200 OK` | `401`, `404` | Retrieve candidate profile info |
| 4 | `GET` | `/lms/students/{lmsUserId}/results` | `X-Service-Key` | `200 OK` | `401`, `200 []` | Retrieve LMS course results for candidate |
| 5 | `GET` | `/lms/courses?skill={skill}` | `X-Service-Key` | `200 OK` | `401`, `200 []` | Filter recommended courses by skill code |
| 6 | `POST` | `/lms/enrollments` | `X-Service-Key` | `201 Created` | `400`, `401`, `404`, `409` | Enroll student into an LMS course |
| 7 | `GET` | `/lms/enrollments/{lmsUserId}` | `X-Service-Key` | `200 OK` | `401`, `200 []` | Retrieve current enrollments for student |
| 8 | `GET` | `/exam/students/{lmsUserId}/results` | `X-Service-Key` | `200 OK` | `401`, `200 []` | Retrieve standardized exam scores |
| 9 | `GET` | `/pm/students/{lmsUserId}/internships` | `X-Service-Key` | `200 OK` | `401`, `200 []` | Retrieve IOC internship project history |
| 10 | `POST` | `/pm/batches/{batchId}/members` | `X-Service-Key` | `201 Created` | `401`, `404`, `409` | Add candidate to an IOC internship batch |
| 11 | `POST` | `/meet/rooms` | `X-Service-Key` | `201 Created` | `400`, `401` | Create a virtual Rikkei Meet room |

*Rule for List Endpoints*: When a student has no records, list endpoints (4, 5, 7, 8, 9) return an empty JSON array `[]` with status `200 OK`, never `404`.

---

### 3. Business Endpoints Specification & Examples

#### 3.1 `POST /lms/sso/tickets`

Generates an SSO ticket for a valid user in `data.json`.

- **Request Headers**: `X-Service-Key: dev-key`, `Content-Type: application/json`
- **Request Body**:

  ```json
  {
    "lmsUserId": "lms-sv-001"
  }
  ```

- **Response `201 Created`**:

  ```json
  {
    "ticket": "f862c62230a2b33722fda6987a7775be",
    "issuedAt": "2026-11-10T09:00:00+07:00"
  }
  ```

- **Response `404 Not Found`** (user does not exist):

  ```json
  {
    "code": "NOT_FOUND",
    "message": "lmsUserId không tồn tại"
  }
  ```

#### 3.2 `POST /lms/sso/verify`

Verifies an SSO ticket and resolves the authenticated user profile.

- **Request Headers**: `X-Service-Key: dev-key`, `Content-Type: application/json`
- **Request Body**:

  ```json
  {
    "ticket": "f862c62230a2b33722fda6987a7775be"
  }
  ```

- **Response `200 OK`**:

  ```json
  {
    "lmsUserId": "lms-sv-001",
    "email": "candidate1@rikkeijobs.test",
    "fullName": "Nguyễn Văn An",
    "role": "CANDIDATE",
    "issuedAt": "2026-11-10T09:00:00+07:00"
  }
  ```

- **Response `404 Not Found`** (invalid or unissued ticket):

  ```json
  {
    "code": "NOT_FOUND",
    "message": "ticket không tồn tại"
  }
  ```

#### 3.3 `GET /lms/students/{lmsUserId}`

Retrieves candidate profile information.

- **Request Headers**: `X-Service-Key: dev-key`
- **Response `200 OK`**:

  ```json
  {
    "lmsUserId": "lms-sv-001",
    "fullName": "Nguyễn Văn An",
    "email": "candidate1@rikkeijobs.test",
    "program": "Kỹ sư phần mềm",
    "classCode": "KS25-CNTT1",
    "courseName": "K25"
  }
  ```

- **Response `404 Not Found`** (absent or user role is not `CANDIDATE`):

  ```json
  {
    "code": "NOT_FOUND",
    "message": "Sinh viên không tồn tại"
  }
  ```

#### 3.4 `GET /lms/students/{lmsUserId}/results`

Retrieves academic course results and attendance metrics from the LMS.

- **Request Headers**: `X-Service-Key: dev-key`
- **Response `200 OK`**:

  ```json
  [
    {
      "courseId": "LMS-C-JAVA-02",
      "courseName": "Java nâng cao",
      "score": 8.5,
      "attendanceRate": 95,
      "homeworkRate": 90,
      "completedAt": "2026-08-15T17:00:00+07:00",
      "skills": ["JAVA", "OOP"]
    }
  ]
  ```

#### 3.5 `GET /lms/courses?skill={skill}`

Retrieves courses covering a specific skill code (e.g., `?skill=JAVA`). If the `skill` parameter is omitted, returns all available courses.

- **Request Headers**: `X-Service-Key: dev-key`
- **Response `200 OK`**:

  ```json
  [
    {
      "courseId": "LMS-C-JAVA-02",
      "name": "Java nâng cao",
      "skills": ["JAVA", "OOP"],
      "durationHours": 60,
      "level": "Khá"
    }
  ]
  ```

#### 3.6 `POST /lms/enrollments`

Enrolls a student in a supplementary training course.

- **Request Headers**: `X-Service-Key: dev-key`, `Content-Type: application/json`
- **Request Body**:

  ```json
  {
    "lmsUserId": "lms-sv-002",
    "courseId": "LMS-C-JAVA-02"
  }
  ```

- **Response `201 Created`**:

  ```json
  {
    "lmsUserId": "lms-sv-002",
    "courseId": "LMS-C-JAVA-02",
    "progress": 0,
    "score": null,
    "status": "ENROLLED",
    "enrolledAt": "2026-11-10T10:00:00+07:00"
  }
  ```

- **Response `409 Conflict`** (already enrolled):

  ```json
  {
    "code": "ALREADY_ENROLLED",
    "message": "Sinh viên đã ghi danh khoá học này"
  }
  ```

#### 3.7 `GET /lms/enrollments/{lmsUserId}`

Retrieves all current course enrollments for a given student.

- **Request Headers**: `X-Service-Key: dev-key`
- **Response `200 OK`**:

  ```json
  [
    {
      "lmsUserId": "lms-sv-002",
      "courseId": "LMS-C-JAVA-02",
      "progress": 0,
      "score": null,
      "status": "ENROLLED",
      "enrolledAt": "2026-11-10T10:00:00+07:00"
    }
  ]
  ```

#### 3.8 `GET /exam/students/{lmsUserId}/results`

Retrieves standardized certification or placement examination results.

- **Request Headers**: `X-Service-Key: dev-key`
- **Response `200 OK`**:

  ```json
  [
    {
      "examId": "EXAM-2026-JAVA",
      "examName": "Kỳ thi đánh giá năng lực Java",
      "score": 8.0,
      "takenAt": "2026-08-20T10:30:00+07:00",
      "skill": "JAVA"
    }
  ]
  ```

#### 3.9 `GET /pm/students/{lmsUserId}/internships`

Retrieves internship project history, accepted tasks, and evaluation scores from the IOC project management tool (`lms-pm`).

- **Request Headers**: `X-Service-Key: dev-key`
- **Response `200 OK`** (`lms-sv-001` sample):

  ```json
  [
    {
      "batchId": "IOC-JB-2026-09",
      "batchName": "IOC Java Backend 09/2026",
      "groupName": "Nhóm 2",
      "topicName": "Hệ thống đặt lịch phòng họp",
      "mentorEmail": "mentor1@rikkeijobs.test",
      "startDate": "2026-09-07",
      "endDate": "2026-10-30",
      "finalScore": 8.5,
      "tasks": [
        {
          "title": "API đặt phòng và kiểm trùng lịch",
          "acceptedScore": 9,
          "acceptedAt": "2026-09-25T17:00:00+07:00"
        },
        {
          "title": "Phân quyền quản trị phòng",
          "acceptedScore": 8,
          "acceptedAt": "2026-10-09T17:00:00+07:00"
        },
        {
          "title": "Báo cáo tần suất sử dụng phòng",
          "acceptedScore": 8.5,
          "acceptedAt": "2026-10-23T17:00:00+07:00"
        }
      ]
    }
  ]
  ```

- **Field Notes (`PMInternshipResponse`)**:
  - `batchId` (`string`, required for backend sync), `batchName` (`string | null`), `groupName` (`string | null`), `topicName` (`string | null`), `mentorEmail` (`string | null`), `startDate` (`string | null`, `YYYY-MM-DD`), `endDate` (`string | null`, `YYYY-MM-DD`), `finalScore` (`number | null`, `0..10` scale).
  - `tasks` (`array` of `{ title, acceptedScore, acceptedAt }`, where `acceptedScore` is `number | null` and `acceptedAt` is ISO-8601 `OffsetDateTime | null`).
- **Empty State**: `lms-sv-002`, `lms-sv-003`, and unknown `lmsUserId` values return `200 OK` with `[]`.

#### 3.10 `POST /pm/batches/{batchId}/members`

Adds a student to an IOC internship batch.

- **Request Headers**: `X-Service-Key: dev-key`, `Content-Type: application/json`
- **Request Body**:

  ```json
  {
    "lmsUserId": "lms-sv-002"
  }
  ```

- **Response `201 Created`**:

  ```json
  {
    "batchId": "IOC-JB-2026-09",
    "lmsUserId": "lms-sv-002",
    "addedAt": "2026-11-10T10:15:00+07:00"
  }
  ```

- **Response `409 Conflict`** (already in batch):

  ```json
  {
    "code": "ALREADY_MEMBER",
    "message": "Thành viên đã có trong đợt"
  }
  ```

#### 3.11 `POST /meet/rooms`

Provisions a virtual meeting room for interview schedules via Rikkei Meet.

- **Request Headers**: `X-Service-Key: dev-key`, `Content-Type: application/json`
- **Request Body**:

  ```json
  {
    "title": "Phỏng vấn Vòng 1 - Ứng viên Nguyễn Văn An",
    "startAt": "2026-11-15T09:00:00+07:00",
    "endAt": "2026-11-15T10:00:00+07:00"
  }
  ```

- **Response `201 Created`**:

  ```json
  {
    "roomId": "room-9747978e",
    "roomUrl": "https://meet.rikkei.edu.vn/room-9747978e",
    "title": "Phỏng vấn Vòng 1 - Ứng viên Nguyễn Văn An",
    "startAt": "2026-11-15T09:00:00+07:00",
    "endAt": "2026-11-15T10:00:00+07:00"
  }
  ```

- **Response `400 Bad Request`** (missing required fields):

  ```json
  {
    "code": "VALIDATION_ERROR",
    "message": "thiếu trường bắt buộc (title, startAt, endAt)"
  }
  ```

---

### 4. Cloudinary Mock Namespace (`/cloudinary/*`)

The `/cloudinary/*` router simulates Cloudinary's signed REST Upload, Delivery, and Destroy endpoints without requiring `X-Service-Key` and without logging payloads to `/mock/requests`.

#### 4.1 Signature Verification Rule

1. Collect all non-empty form parameters excluding `file`, `cloud_name`, `resource_type`, `api_key`, and `signature`.
2. Sort parameter keys alphabetically.
3. Join as `key=value` pairs separated by `&`, append `CLOUDINARY_API_SECRET` (default `dev-secret`) directly without a separator, and compute lowercase hex SHA-1.
4. Compare `api_key` against `CLOUDINARY_API_KEY` (default `dev-key`) and `signature` against the computed SHA-1 digest in constant time. Return `401 Unauthorized` on mismatch.

#### 4.2 `POST /cloudinary/v1_1/{cloud}/image/upload`

Accepts `application/x-www-form-urlencoded` (max payload `5mb`).

- **Pre-check (`fail-next`)**: If `POST /mock/cloudinary/fail-next` set a pending failure, consumes it (single-shot) and immediately returns the configured status (default `503`) with `{ "error": { "message": "..." } }`.
- **Form Parameters**:
  - `api_key`: Dummy API key (e.g., `dev-key`)
  - `timestamp`: Epoch seconds string
  - `public_id`: Optional asset path (e.g., `rikkei-jobs/company-logos/company-1`; traversal segments `.`/`..` rejected with `400`)
  - `overwrite`, `invalidate`, `unique_filename`: Standard Cloudinary upload flags included in signature
  - `file`: Data URI (`data:image/png;base64,...` or `data:image/jpeg;base64,...`)
  - `signature`: 40-char lowercase hex SHA-1 digest
- **Response `200 OK`**:

  ```json
  {
    "public_id": "rikkei-jobs/company-logos/company-1",
    "secure_url": "http://127.0.0.1:9000/cloudinary/dev-cloud/image/upload/v1763437800/rikkei-jobs/company-logos/company-1.png",
    "version": 1763437800,
    "format": "png",
    "bytes": 67
  }
  ```

- **Error Responses**:
  - `401 Unauthorized`: `{ "error": { "message": "Invalid api_key" } }` or `{ "error": { "message": "Invalid Signature" } }`
  - `400 Bad Request`: Invalid `cloud`, array parameters, invalid `file` data URI, or invalid `public_id`
  - `413 Payload Too Large`: Form body exceeds `5mb`
  - `503 Service Unavailable` (or configured `400..599` status): When triggered once by `POST /mock/cloudinary/fail-next`

#### 4.3 `GET /cloudinary/{cloud}/image/upload/*`

Delivers stored image bytes directly to browsers or E2E assertions (e.g., `GET /cloudinary/dev-cloud/image/upload/v1763437800/rikkei-jobs/company-logos/company-1.png`).

- **Response `200 OK`**:
  - `Content-Type`: `image/png` or `image/jpeg`
  - `Cache-Control`: `no-store`
  - Body: Raw binary image bytes
- **Response `404 Not Found`**: Missing asset, version mismatch, extension mismatch, or invalid traversal path.

#### 4.4 `POST /cloudinary/v1_1/{cloud}/image/destroy`

Deletes a stored asset from in-memory storage after verifying `api_key` and SHA-1 `signature`.

- **Form Parameters**: `api_key`, `timestamp`, `public_id`, `signature`
- **Response `200 OK`**: `{ "result": "ok" }` if deleted, or `{ "result": "not found" }`
- **Error Responses**: `401 Unauthorized` on invalid key/signature; `400 Bad Request` on missing/invalid `public_id`.

---

### 5. Administrative Testing Tools (`/mock/*` — 5 Tools)

These endpoints are strictly for automated integration testing and development diagnostics. They require NO `X-Service-Key` and are NOT logged in `requestLog`. The backend never calls them in production. Note: There is no `/mock/*` endpoint to mutate PM internship scores at runtime; score-update idempotency is verified in backend unit/integration tests or by editing `data.json` and calling `POST /mock/reload`.

#### 5.1 `POST /mock/reload`

Re-reads `data.json` from disk into memory without requiring a server process restart.

- **Response `200 OK`**: `{ "ok": true }`

#### 5.2 `GET /mock/requests`

Returns an array of the last 100 HTTP requests received by the 11 business endpoints (excluding `/mock/*` and `/cloudinary/*`).

- **Response `200 OK`**:

  ```json
  [
    {
      "at": "2026-11-10T10:20:00.123Z",
      "method": "POST",
      "path": "/lms/sso/verify",
      "hasKey": true,
      "body": { "ticket": "f862c62230a2b33722fda6987a7775be" }
    }
  ]
  ```

#### 5.3 `PATCH /mock/enrollments`

Dynamically mutates an existing course enrollment in memory (`progress`, `score`, `status`).

- **Request Body**:

  ```json
  {
    "lmsUserId": "lms-sv-002",
    "courseId": "LMS-C-JAVA-02",
    "progress": 100,
    "score": 9.2,
    "status": "COMPLETED"
  }
  ```

- **Response `200 OK`**: Updated enrollment JSON object (`404 NOT_FOUND` if missing).

#### 5.4 `POST /mock/reset`

Resets runtime in-memory state: clears generated SSO tickets, runtime enrollments, batch members, the request log, stored Cloudinary assets, the Cloudinary version counter, and any pending `cloudinaryFailNext` flag.

- **Response `200 OK`**:

  ```json
  {
    "ok": true,
    "message": "Đã đặt lại trạng thái bộ nhớ"
  }
  ```

#### 5.5 `POST /mock/cloudinary/fail-next`

Forces the next `POST /cloudinary/v1_1/{cloud}/image/upload` request to fail once (single-shot) so backend and E2E tests can deterministically exercise the `502 LOGO_STORAGE_UNAVAILABLE` error path.

- **Request Body** (optional JSON):

  ```json
  {
    "status": 503,
    "message": "Simulated Cloudinary outage"
  }
  ```

  - `status`: Optional integer in `400..599` (default `503`; invalid values return `400 VALIDATION_ERROR`).
  - `message`: Optional non-empty string (default `"Simulated Cloudinary outage"`).

- **Response `200 OK`**:

  ```json
  {
    "ok": true,
    "failNext": {
      "status": 503,
      "message": "Simulated Cloudinary outage"
    }
  }
  ```

---

### 6. Evaluation Notification Script (`send-evaluation-links.js`)

- **Script Path**: `mock/send-evaluation-links.js <batchId>`
- **Purpose**: Simulates the external Project Management tool (`lms-pm`) sending intern evaluation requests back to Rikkei Jobs.
- **Workflow**:
  1. Reads interns belonging to `<batchId>` from `mock/data.json`.
  2. For each intern, calls `POST http://localhost:8080/api/v1/integrations/pm/evaluation-links` with `X-Service-Key: dev-key`.
  3. Gracefully handles scenarios where the backend is unreachable or returns `404 Not Found`.

---

## Part 2: Vietnamese Section / Bản dịch Tiếng Việt

### 1. Tổng Quan & Nguyên Tắc Vận Hành

#### 1.1 Kiến Trúc & Tách Biệt Tiến Trình

- Dịch vụ giả lập chạy dưới dạng tiến trình Node.js + Express độc lập ở cổng `9000` (`http://localhost:9000`, `http://127.0.0.1:9000`, hoặc `http://mock:9000` bên trong Docker Compose).
- **Trạng thái trên bộ nhớ (In-Memory State)**: Toàn bộ dữ liệu runtime (vé SSO đã cấp, lượt ghi danh khóa học, thành viên đợt thực tập, nhật ký request, ảnh logo Cloudinary đã tải lên và cờ giả lập lỗi một lần) được lưu hoàn toàn trên RAM. Dữ liệu nền được nạp từ `data.json` khi khởi động và không dùng cơ sở dữ liệu bền vững.
- **Cô lập Frontend**: Mã nguồn Frontend tuyệt đối KHÔNG được gọi các endpoint nghiệp vụ dùng `X-Service-Key` (`/lms/*`, `/exam/*`, `/pm/*`, `/meet/*`). Khóa `X-Service-Key` không bao giờ được lộ ra trình duyệt. Nginx của Frontend tuyệt đối không proxy `/mock` hay `/cloudinary`.
- **Phân phối ảnh trực tiếp cho trình duyệt (`/cloudinary/*`)**: Với logo doanh nghiệp, mock trả về `secure_url` bắt đầu bằng `PUBLIC_BASE_URL` (mặc định `http://127.0.0.1:9000`, khớp `CLOUDINARY_DELIVERY_BASE_URL=http://127.0.0.1:9000/cloudinary`) để trình duyệt tải trực tiếp qua `<img src={logoUrl}>` mà không đi qua Nginx và không cần `X-Service-Key`.

#### 1.2 Biến Môi Trường

| Biến | Mặc Định | Mô Tả |
|---|---|---|
| `PORT` | `9000` | Cổng HTTP mà máy chủ giả lập lắng nghe |
| `SERVICE_KEY` | `dev-key` | Khóa dùng chung kiểm tra qua header `X-Service-Key` cho 11 endpoint nghiệp vụ |
| `PUBLIC_BASE_URL` | `http://127.0.0.1:${PORT}` | URL công khai trình duyệt truy cập được, dùng để tạo `secure_url` trả về từ Cloudinary mock |
| `CLOUDINARY_API_KEY` | `dev-key` | API key giả lập mong đợi trong form upload/destroy Cloudinary |
| `CLOUDINARY_API_SECRET` | `dev-secret` | API secret giả lập dùng để tính lại và xác thực chữ ký SHA-1 Cloudinary |

#### 1.3 Xác Thực & Header Bảo Mật

Tất cả 11 endpoint nghiệp vụ dưới `/lms`, `/exam`, `/pm` và `/meet` đều yêu cầu header khóa dịch vụ dùng chung:

```http
X-Service-Key: dev-key
```

- **Phản hồi khi thiếu hoặc sai khóa**: HTTP `401 Unauthorized` với JSON `{"code": "INVALID_SERVICE_KEY", "message": "Thiếu hoặc sai X-Service-Key"}`.
- **Không gian tên Cloudinary Mock (`/cloudinary/*`)**: Sử dụng router tách biệt gắn trước middleware `requestLog` và `X-Service-Key`. Router này KHÔNG yêu cầu `X-Service-Key` và KHÔNG ghi log vào `GET /mock/requests` (tránh lưu chuỗi base64, `api_key` hoặc `signature` vào nhật ký bộ nhớ). Các lệnh upload và destroy xác thực bằng `api_key` cùng chữ ký SHA-1 chuẩn Cloudinary.
- **Công cụ kiểm thử (`/mock/*`)**: Không yêu cầu `X-Service-Key` và không ghi vào `GET /mock/requests`.

#### 1.4 Quy Tắc Hết Hạn & Dùng Một Lần Của Vé SSO

- **Hành vi của Mock**: Máy chủ giả lập cố tình KHÔNG chặn vé SSO đã dùng hoặc quá hạn 60 giây; gọi `POST /lms/sso/verify` lặp lại với cùng vé vẫn trả `200 OK`.
- **Trách nhiệm của Backend (NT-01)**: Backend Rikkei Jobs chịu trách nhiệm hoàn toàn về kiểm tra dùng một lần (`used_sso_tickets`) và thời hạn 60 giây (`now - issuedAt > 60s`), trả `401 UNAUTHORIZED` nếu vi phạm.

---

### 2. Bảng Tổng Hợp 11 Endpoint Nghiệp Vụ

| STT | Phương Thức | Đường Dẫn | Xác Thực | Status Thành Công | Status Lỗi | Mô Tả Nghiệp Vụ |
|---|---|---|---|---|---|---|
| 1 | `POST` | `/lms/sso/tickets` | `X-Service-Key` | `201 Created` | `401`, `404` | Cấp vé SSO tạm thời cho sinh viên/cán bộ |
| 2 | `POST` | `/lms/sso/verify` | `X-Service-Key` | `200 OK` | `401`, `404` | Xác thực vé SSO và trả về thông tin người dùng |
| 3 | `GET` | `/lms/students/{lmsUserId}` | `X-Service-Key` | `200 OK` | `401`, `404` | Lấy hồ sơ ứng viên (`CANDIDATE`) |
| 4 | `GET` | `/lms/students/{lmsUserId}/results` | `X-Service-Key` | `200 OK` | `401`, `200 []` | Lấy điểm quá trình các môn LMS |
| 5 | `GET` | `/lms/courses?skill={skill}` | `X-Service-Key` | `200 OK` | `401`, `200 []` | Lọc khóa học khuyến nghị theo mã kỹ năng |
| 6 | `POST` | `/lms/enrollments` | `X-Service-Key` | `201 Created` | `400`, `401`, `404`, `409` | Ghi danh sinh viên vào khóa học LMS |
| 7 | `GET` | `/lms/enrollments/{lmsUserId}` | `X-Service-Key` | `200 OK` | `401`, `200 []` | Lấy danh sách khóa học đã ghi danh |
| 8 | `GET` | `/exam/students/{lmsUserId}/results` | `X-Service-Key` | `200 OK` | `401`, `200 []` | Lấy kết quả thi khảo thí chuẩn hóa |
| 9 | `GET` | `/pm/students/{lmsUserId}/internships` | `X-Service-Key` | `200 OK` | `401`, `200 []` | Lấy lịch sử dự án thực tập IOC |
| 10 | `POST` | `/pm/batches/{batchId}/members` | `X-Service-Key` | `201 Created` | `401`, `404`, `409` | Thêm sinh viên vào đợt thực tập IOC |
| 11 | `POST` | `/meet/rooms` | `X-Service-Key` | `201 Created` | `400`, `401` | Tạo phòng phỏng vấn trực tuyến Rikkei Meet |

*Quy tắc cho các endpoint danh sách*: Khi chưa có bản ghi, các endpoint danh sách (4, 5, 7, 8, 9) luôn trả về mảng JSON rỗng `[]` kèm `200 OK`, không bao giờ trả `404`.

---

### 3. Chi Tiết Hợp Đồng 11 Endpoint Nghiệp Vụ

#### 3.1 `POST /lms/sso/tickets`

Tạo vé SSO ngẫu nhiên cho người dùng hợp lệ trong `data.json`. Yêu cầu `X-Service-Key: dev-key` và body `{"lmsUserId": "lms-sv-001"}`. Thành công trả `201 Created` với `{"ticket": "...", "issuedAt": "..."}`; không tìm thấy user trả `404 NOT_FOUND`.

#### 3.2 `POST /lms/sso/verify`

Xác thực vé SSO với body `{"ticket": "..."}`. Thành công trả `200 OK` chứa `lmsUserId`, `email`, `fullName`, `role`, `issuedAt`; vé không tồn tại trả `404 NOT_FOUND`.

#### 3.3 `GET /lms/students/{lmsUserId}`

Lấy thông tin sinh viên có vai trò `CANDIDATE`. Nếu không tồn tại hoặc không phải `CANDIDATE`, trả `404 NOT_FOUND`.

#### 3.4 `GET /lms/students/{lmsUserId}/results`

Trả về danh sách kết quả học tập LMS của sinh viên (`200 OK`, mảng rỗng `[]` nếu chưa có).

#### 3.5 `GET /lms/courses?skill={skill}`

Trả về danh sách khóa học LMS (lọc theo tham số `skill` nếu có).

#### 3.6 `POST /lms/enrollments`

Ghi danh sinh viên vào khóa học (`lmsUserId`, `courseId`). Thành công trả `201 Created`; ghi danh trùng trả `409 ALREADY_ENROLLED`; không tìm thấy trả `404 NOT_FOUND`.

#### 3.7 `GET /lms/enrollments/{lmsUserId}`

Trả về danh sách các lượt ghi danh runtime của sinh viên (`200 OK`).

#### 3.8 `GET /exam/students/{lmsUserId}/results`

Trả về danh sách điểm thi khảo thí của sinh viên (`200 OK`).

#### 3.9 `GET /pm/students/{lmsUserId}/internships`

Trả về lịch sử dự án thực tập IOC, các task đã nghiệm thu và điểm đánh giá của sinh viên từ `lms-pm` (`200 OK`).

- **Mẫu `lms-sv-001`**: Mỗi phần tử gồm `batchId` (`string`, bắt buộc khi đồng bộ), `batchName`, `groupName`, `topicName`, `mentorEmail`, `startDate` (`YYYY-MM-DD | null`), `endDate` (`YYYY-MM-DD | null`), `finalScore` (`number | null`, thang `0..10`), và mảng `tasks` gồm `{ title, acceptedScore, acceptedAt }` (`acceptedScore` là `number | null`, `acceptedAt` là ISO-8601 `OffsetDateTime | null`).
- **Trạng thái rỗng**: `lms-sv-002`, `lms-sv-003` và `lmsUserId` chưa có đợt thực tập trả về `200 OK` với mảng rỗng `[]`.

#### 3.10 `POST /pm/batches/{batchId}/members`

Thêm sinh viên vào đợt thực tập `batchId` với body `{"lmsUserId": "..."}`. Thành công trả `201 Created`; trùng thành viên trả `409 ALREADY_MEMBER`.

#### 3.11 `POST /meet/rooms`

Tạo phòng phỏng vấn trực tuyến với `title`, `startAt`, `endAt`. Thành công trả `201 Created` gồm `roomId`, `roomUrl`; thiếu trường bắt buộc trả `400 VALIDATION_ERROR`.

---

### 4. Không Gian Tên Cloudinary Mock (`/cloudinary/*`)

Router `/cloudinary/*` giả lập các API Upload, Delivery và Destroy có chữ ký của Cloudinary, không yêu cầu `X-Service-Key` và không ghi log vào `/mock/requests`.

#### 4.1 Quy Tắc Kiểm Tra Chữ Ký SHA-1

1. Thu thập toàn bộ tham số form không rỗng ngoại trừ `file`, `cloud_name`, `resource_type`, `api_key` và `signature`.
2. Sắp xếp tên tham số theo thứ tự chữ cái tăng dần.
3. Ghép thành chuỗi `key=value` nối nhau bằng `&`, nối trực tiếp `CLOUDINARY_API_SECRET` (mặc định `dev-secret`) vào cuối (không có ký tự ngăn cách) và băm SHA-1 chữ thường dạng hex.
4. So sánh `api_key` với `CLOUDINARY_API_KEY` (mặc định `dev-key`) và `signature` với chuỗi SHA-1 vừa tính bằng so sánh thời gian hằng số (`timingSafeEqual`). Sai khóa hoặc sai chữ ký trả ngay `401 Unauthorized`.

#### 4.2 `POST /cloudinary/v1_1/{cloud}/image/upload`

Nhận `application/x-www-form-urlencoded` (giới hạn kích thước `5mb`).

- **Kiểm tra `fail-next` đầu tiên**: Nếu `POST /mock/cloudinary/fail-next` đã đặt cờ lỗi, tiêu thụ cờ (single-shot) và trả ngay mã lỗi cấu hình (mặc định `503`) cùng body `{ "error": { "message": "..." } }`.
- **Tham số form**: `api_key`, `timestamp`, `public_id` (tùy chọn; chặn traversal `.`/`..`), `overwrite`, `invalidate`, `unique_filename`, `file` (data URI `data:image/png;base64,...` hoặc `data:image/jpeg;base64,...`), `signature`.
- **Phản hồi `200 OK`**: Trả JSON `{ "public_id", "secure_url", "version", "format", "bytes" }`, trong đó `secure_url` có tiền tố `${PUBLIC_BASE_URL}/cloudinary/${cloud}/image/upload/v${version}/...` khớp `CLOUDINARY_DELIVERY_BASE_URL` để trình duyệt tải trực tiếp.
- **Phản hồi lỗi**: `401` khi sai `api_key` hoặc `signature`; `400` khi sai tên cloud, tham số mảng trùng lặp, sai data URI hoặc `public_id` chứa traversal; `413` khi vượt quá `5mb`; `503` (hoặc status `400..599` cấu hình) khi kích hoạt `fail-next`.

#### 4.3 `GET /cloudinary/{cloud}/image/upload/*`

Phục vụ byte ảnh gốc cho trình duyệt và kiểm thử E2E (`200 OK` kèm `Content-Type: image/png` hoặc `image/jpeg` và `Cache-Control: no-store`; trả `404 Not Found` nếu không tồn tại, lệch phiên bản, lệch phần mở rộng hoặc đường dẫn chứa traversal).

#### 4.4 `POST /cloudinary/v1_1/{cloud}/image/destroy`

Xóa ảnh khỏi bộ nhớ tạm sau khi xác thực `api_key` và chữ ký SHA-1 (`200 OK` `{ "result": "ok" }` hoặc `{ "result": "not found" }`; `401` nếu sai xác thực; `400` nếu thiếu/sai `public_id`).

---

### 5. Bảng 5 Công Cụ Kiểm Thử (`/mock/*`)

Các endpoint `/mock/*` không yêu cầu `X-Service-Key` và không bị ghi vào `requestLog`. Lưu ý: chỉ có đúng 5 công cụ dưới đây và không có endpoint `/mock/*` để chỉnh sửa điểm thực tập PM trực tiếp trên RAM (kiểm thử đổi điểm được chứng minh qua unit/integration test backend hoặc nạp lại `data.json` qua `POST /mock/reload`).

#### 5.1 `POST /mock/reload`

Đọc lại `data.json` từ đĩa vào bộ nhớ không cần khởi động lại tiến trình (`200 OK` `{ "ok": true }`).

#### 5.2 `GET /mock/requests`

Trả về tối đa 100 request gần nhất gửi tới 11 endpoint nghiệp vụ (loại trừ `/mock/*` và `/cloudinary/*`).

#### 5.3 `PATCH /mock/enrollments`

Cập nhật trực tiếp trạng thái, tiến độ, điểm số của lượt ghi danh trên RAM (`200 OK` hoặc `404 NOT_FOUND`).

#### 5.4 `POST /mock/reset`

Đặt lại toàn bộ trạng thái bộ nhớ: xóa vé SSO, lượt ghi danh, thành viên đợt thực tập, nhật ký request, ảnh Cloudinary đã lưu, bộ đếm version Cloudinary và cờ `cloudinaryFailNext` đang chờ (`200 OK` `{ "ok": true, "message": "Đã đặt lại trạng thái bộ nhớ" }`).

#### 5.5 `POST /mock/cloudinary/fail-next`

Ép lần gọi `POST /cloudinary/v1_1/{cloud}/image/upload` kế tiếp thất bại một lần (single-shot) để kiểm thử luồng lỗi `502 LOGO_STORAGE_UNAVAILABLE`.

- **Body JSON tùy chọn**: `{ "status": 503, "message": "Simulated Cloudinary outage" }` (`status` phải là số nguyên `400..599`, mặc định `503`).
- **Phản hồi `200 OK`**: `{ "ok": true, "failNext": { "status": 503, "message": "..." } }`.

---

### 6. Script Giả Lập Thông Báo Đánh Giá (`send-evaluation-links.js`)

- **Đường dẫn**: `mock/send-evaluation-links.js <batchId>`
- **Mục đích**: Giả lập hệ thống `lms-pm` đọc danh sách sinh viên của `<batchId>` từ `mock/data.json` và gọi `POST http://localhost:8080/api/v1/integrations/pm/evaluation-links` kèm `X-Service-Key: dev-key`, xử lý êm khi backend chưa sẵn sàng hoặc trả `404`.
