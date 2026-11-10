# External Systems Mock Contract Specification

This document provides the authoritative interface specification and contract for the **Rikkei Jobs External Systems Mock** service. It defines the communication protocols, authentication rules, endpoints, and data payloads between the Rikkei Jobs Backend and external mocked systems (LMS, Examination System, Project Management IOC, and Rikkei Meet).

---

## 1. Overview & Operational Principles

### 1.1 Architecture & Process Separation

- The mock service runs as an independent Node.js + Express process listening on port `9000` (`http://localhost:9000` or `http://mock:9000` inside Docker).
- **In-Memory State**: Runtime data (generated SSO tickets, dynamic course enrollments, batch members, request logs) is held entirely in memory. It initializes from `data.json` on startup. No persistent database is used.
- **Frontend Isolation**: The frontend client MUST NEVER call the mock service directly. The `X-Service-Key` must never be exposed to browser environments. The Nginx reverse proxy configuration strictly prevents routing `/mock` or external endpoints to the public internet.

### 1.2 Authentication & Security Header

All functional endpoints under `/lms`, `/exam`, `/pm`, and `/meet` require authentication via a secret pre-shared service key header:

```http
X-Service-Key: dev-key
```

- **Missing or Invalid Key Response**:
  - HTTP Status: `401 Unauthorized`
  - Response Body:

    ```json
    {
      "code": "INVALID_SERVICE_KEY",
      "message": "Thiếu hoặc sai header X-Service-Key"
    }
    ```

- **Public Testing Tools**: Endpoints under the `/mock/*` path are administrative testing utilities and DO NOT require the `X-Service-Key` header.

### 1.3 SSO Ticket Expiration & Single-Use Enforcement Rule

- **Mock Behavior**: The mock server deliberately DOES NOT block expired or already-used SSO tickets, and does NOT enforce the 60-second expiration window. Repeated calls to `POST /lms/sso/verify` with the same ticket will return `200 OK`.
- **Backend Responsibility (Task NT-01)**: The Rikkei Jobs **Backend** is strictly responsible for enforcing single-use and the 60-second TTL window during user login in task `NT-01`:
  1. The backend stores verified ticket IDs in a `used_sso_tickets` table; duplicate submissions return HTTP `401 UNAUTHORIZED`.
  2. The backend compares `now - issuedAt > 60 seconds`; expired tickets return HTTP `401 UNAUTHORIZED`.
- **Sprint 1 Boundary**: Neither the mock server nor the backend skeleton implements ticket invalidation logic in this sprint.

---

## 2. Table of 11 Business Endpoints

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

## 3. Business Endpoints Specification & Examples

### 3.1 `POST /lms/sso/tickets`

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
    "ticket": "ticket-lms-sv-001-1731234567890",
    "issuedAt": "2026-11-10T09:00:00+07:00"
  }
  ```

- **Response `404 Not Found`** (user does not exist):

  ```json
  {
    "code": "NOT_FOUND",
    "message": "Không tìm thấy người dùng với mã lmsUserId yêu cầu"
  }
  ```

---

### 3.2 `POST /lms/sso/verify`

Verifies an SSO ticket and resolves the authenticated user profile.

- **Request Headers**: `X-Service-Key: dev-key`, `Content-Type: application/json`
- **Request Body**:

  ```json
  {
    "ticket": "ticket-lms-sv-001-1731234567890"
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
    "message": "Vé ticket không tồn tại hoặc không hợp lệ"
  }
  ```

---

### 3.3 `GET /lms/students/{lmsUserId}`

Retrieves candidate profile information.

- **Request Headers**: `X-Service-Key: dev-key`
- **Response `200 OK`**:

  ```json
  {
    "lmsUserId": "lms-sv-001",
    "email": "candidate1@rikkeijobs.test",
    "fullName": "Nguyễn Văn An",
    "major": "Công nghệ thông tin",
    "cohort": "K2024",
    "role": "CANDIDATE"
  }
  ```

- **Response `404 Not Found`** (absent or user role is not `CANDIDATE`):

  ```json
  {
    "code": "NOT_FOUND",
    "message": "Không tìm thấy sinh viên hoặc người dùng không phải ứng viên"
  }
  ```

---

### 3.4 `GET /lms/students/{lmsUserId}/results`

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

---

### 3.5 `GET /lms/courses?skill={skill}`

Retrieves courses covering a specific skill code (e.g., `?skill=JAVA`). If the `skill` parameter is omitted, returns all available courses.

- **Request Headers**: `X-Service-Key: dev-key`
- **Response `200 OK`**:

  ```json
  [
    {
      "id": "LMS-C-JAVA-02",
      "name": "Java nâng cao",
      "skills": ["JAVA", "OOP"],
      "durationHours": 60,
      "level": "Khá"
    }
  ]
  ```

---

### 3.6 `POST /lms/enrollments`

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

---

### 3.7 `GET /lms/enrollments/{lmsUserId}`

Retrieves all current course enrollments for a given student.

- **Request Headers**: `X-Service-Key: dev-key`
- **Response `200 OK`**:

  ```json
  [
    {
      "courseId": "LMS-C-JAVA-02",
      "progress": 0,
      "score": null,
      "status": "ENROLLED",
      "enrolledAt": "2026-11-10T10:00:00+07:00"
    }
  ]
  ```

---

### 3.8 `GET /exam/students/{lmsUserId}/results`

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

---

### 3.9 `GET /pm/students/{lmsUserId}/internships`

Retrieves internship project history, completed tasks, and evaluation scores from the IOC project management tool (`lms-pm`).

- **Request Headers**: `X-Service-Key: dev-key`
- **Response `200 OK`**:

  ```json
  [
    {
      "batchId": "IOC-JB-2026-09",
      "projectName": "Hệ thống Quản lý Bán lẻ",
      "role": "Backend Intern",
      "mentorId": "lms-mt-001",
      "tasksCompleted": 12,
      "finalScore": 8.7,
      "startDate": "2026-09-01",
      "endDate": "2026-10-31"
    }
  ]
  ```

---

### 3.10 `POST /pm/batches/{batchId}/members`

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
    "message": "Sinh viên đã thuộc đợt thực tập này"
  }
  ```

---

### 3.11 `POST /meet/rooms`

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
    "roomId": "meet-room-uuid-001",
    "roomUrl": "https://meet.rikkeijobs.test/room/meet-room-uuid-001",
    "title": "Phỏng vấn Vòng 1 - Ứng viên Nguyễn Văn An",
    "startAt": "2026-11-15T09:00:00+07:00",
    "endAt": "2026-11-15T10:00:00+07:00"
  }
  ```

- **Response `400 Bad Request`** (missing required fields):

  ```json
  {
    "code": "BAD_REQUEST",
    "message": "Thiếu trường bắt buộc (title, startAt, hoặc endAt)"
  }
  ```

---

## 4. Administrative Testing Tools (`/mock/*`)

These endpoints are strictly for automated integration testing and development diagnostics. They require NO `X-Service-Key`. The backend never calls them in production.

### 4.1 `POST /mock/reload`

Re-reads `data.json` from disk into memory without requiring a server process restart.

- **Response `200 OK`**:

  ```json
  {
    "status": "RELOADED",
    "message": "Đã nạp lại dữ liệu từ data.json thành công"
  }
  ```

### 4.2 `GET /mock/requests`

Returns an array of the last 100 HTTP requests received by the mock server (excluding calls to `/mock/*`).

- **Response `200 OK`**:

  ```json
  [
    {
      "timestamp": "2026-11-10T10:20:00.123Z",
      "method": "POST",
      "path": "/lms/sso/verify",
      "body": { "ticket": "ticket-lms-sv-001-..." },
      "keyValid": true
    }
  ]
  ```

### 4.3 `PATCH /mock/enrollments`

Dynamically mutates an existing course enrollment in memory (progress, score, status).

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

- **Response `200 OK`**:

  ```json
  {
    "lmsUserId": "lms-sv-002",
    "courseId": "LMS-C-JAVA-02",
    "progress": 100,
    "score": 9.2,
    "status": "COMPLETED",
    "updatedAt": "2026-11-10T10:25:00+07:00"
  }
  ```

### 4.4 `POST /mock/reset`

Resets runtime in-memory state: clears generated tickets, runtime enrollments, batch members, and the request log, restoring state to the original `data.json`.

- **Response `200 OK`**:

  ```json
  {
    "status": "RESET",
    "message": "Đã khôi phục toàn bộ trạng thái ban đầu"
  }
  ```

---

## 5. Evaluation Notification Script (`send-evaluation-links.js`)

- **Script Path**: `mock/send-evaluation-links.js <batchId>`
- **Purpose**: Simulates the external Project Management tool (`lms-pm`) sending intern evaluation requests back to Rikkei Jobs.
- **Workflow**:
  1. Reads interns belonging to `<batchId>` from `mock/data.json`.
  2. For each intern, calls backend endpoint:

     ```http
     POST http://localhost:8080/api/v1/integrations/pm/evaluation-links
     X-Service-Key: dev-key
     Content-Type: application/json

     {
       "mentorEmail": "mentor1@rikkeijobs.test",
       "lmsUserId": "lms-sv-001",
       "batchId": "IOC-JB-2026-09"
     }
     ```

  3. Gracefully handles scenarios where the backend is unreachable or returns `404 Not Found` (as this endpoint is implemented in task `TT-04`).
