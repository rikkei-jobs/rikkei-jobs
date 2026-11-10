# Rikkei Jobs — Shared Engineering Conventions

This document establishes the mandatory engineering standards, API design contracts, role definitions, mock integration guidelines, and skills catalogue for the **Rikkei Jobs** platform. All engineering team members must strictly comply with these conventions.

---

## 1. REST API Conventions

All application programming interfaces developed for Rikkei Jobs must adhere to the standardized REST specifications outlined below.

### 1.1 Base URI & Transport
- **Base URI Prefix**: All business endpoints MUST start with `/api/v1` (e.g., `https://api.rikkeijobs.vn/api/v1/...` or `http://localhost:8080/api/v1/...`).
- **Data Format**: Payload requests and responses must use `application/json; charset=utf-8`.
- **Security & Authentication Header**:
  - Client-to-Backend: Requests requiring user authentication MUST include the standard HTTP header:
    ```http
    Authorization: Bearer <JWT_TOKEN>
    ```
  - Backend-to-Mock / External Integrations: System-to-system requests MUST include:
    ```http
    X-Service-Key: dev-key
    ```

### 1.2 Unified Error Response Format
All HTTP error responses (HTTP status codes 4xx and 5xx) must return a consistent JSON body with exactly two fields: `code` (an uppercase machine-readable string) and `message` (a human-readable description). Stack traces or internal exceptions must NEVER leak to callers.

```json
{
  "code": "STRING_ERROR_CODE",
  "message": "Human-readable explanation of the error."
}
```

#### Allowed Status Codes & Permitted Error Codes
| HTTP Status | Trigger Condition | Allowed Error Codes | Example Message |
|---|---|---|---|
| **400 Bad Request** | Invalid payload syntax, missing required fields, boundary validation failures. | `VALIDATION_ERROR`, `BAD_REQUEST` | `"Trường email không đúng định dạng"` |
| **401 Unauthorized** | Missing, malformed, expired, or invalid JWT token; missing or invalid service key. | `UNAUTHORIZED`, `INVALID_SERVICE_KEY` | `"Yêu cầu xác thực tài khoản"` |
| **403 Forbidden** | Authenticated user lacks permission or required role for the resource. | `FORBIDDEN` | `"Bạn không có quyền thực hiện thao tác này"` |
| **404 Not Found** | Target resource ID, student ID, course ID, or batch ID does not exist. | `NOT_FOUND` | `"Không tìm thấy tài nguyên yêu cầu"` |
| **405 Method Not Allowed** | HTTP method is not supported on the target URI path (e.g., POST to a GET-only route). | `METHOD_NOT_ALLOWED` | `"Phương thức HTTP không được hỗ trợ"` |
| **409 Conflict** | Business rule conflict, e.g., duplicate enrollment, user already exists in batch. | `CONFLICT`, `ALREADY_ENROLLED`, `ALREADY_MEMBER` | `"Sinh viên đã ghi danh khoá học này"` |
| **429 Too Many Requests** | Rate limit exceeded (e.g., AI queries or password reset requests). | `RATE_LIMITED` | `"Bạn đã vượt quá giới hạn yêu cầu trong ngày"` |
| **503 Service Unavailable** | Downstream dependency (LMS, Exam, PM, Meet mock) is down, unreachable, or times out (>5s). | `EXTERNAL_UNAVAILABLE` | `"Hệ thống bên ngoài tạm thời không khả dụng"` |

#### Concrete JSON Error Examples

##### 400 Bad Request Example:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu đầu vào không hợp lệ: 'email' không được để trống"
}
```

##### 401 Unauthorized Example:
```json
{
  "code": "UNAUTHORIZED",
  "message": "Yêu cầu xác thực tài khoản hoặc token đã hết hạn"
}
```

##### 401 Invalid Service Key Example (External Mock):
```json
{
  "code": "INVALID_SERVICE_KEY",
  "message": "Thiếu hoặc sai header X-Service-Key"
}
```

##### 403 Forbidden Example:
```json
{
  "code": "FORBIDDEN",
  "message": "Ứng viên không có quyền truy cập thông tin của ứng viên khác"
}
```

##### 404 Not Found Example:
```json
{
  "code": "NOT_FOUND",
  "message": "Không tìm thấy sinh viên với mã lms-sv-999"
}
```

##### 405 Method Not Allowed Example:
```json
{
  "code": "METHOD_NOT_ALLOWED",
  "message": "Phương thức HTTP POST không được hỗ trợ cho đường dẫn này"
}
```

##### 409 Conflict Example:
```json
{
  "code": "ALREADY_ENROLLED",
  "message": "Sinh viên đã ghi danh khoá học LMS-C-JAVA-02 trước đó"
}
```

##### 429 Too Many Requests Example:
```json
{
  "code": "RATE_LIMITED",
  "message": "Đã đạt giới hạn tối đa 20 lượt hỏi AI trong ngày cho tài khoản này"
}
```

##### 503 Service Unavailable Example:
```json
{
  "code": "EXTERNAL_UNAVAILABLE",
  "message": "Hệ thống LMS bên ngoài tạm thời không phản hồi. Vui lòng thử lại sau"
}
```

### 1.3 Pagination Format (1-Based)
List endpoints returning multiple records must support 1-based pagination via query parameters:
- **Query Parameters**:
  - `page`: Page index starting from `1` (Default: `1`). If `page < 1`, return `400 VALIDATION_ERROR`.
  - `size`: Number of items per page (Default: `20`, Maximum permitted: `100`). If `size <= 0` or `size > 100`, return `400 VALIDATION_ERROR`.
- **Response Structure**:
  ```json
  {
    "items": [
      {
        "id": "018e3a2b-8a71-7000-8000-000000000001",
        "title": "Kỹ sư Java Backend",
        "companyName": "Công ty Cổ phần Rikkeisoft"
      }
    ],
    "total": 125,
    "page": 1,
    "size": 20
  }
  ```

### 1.4 Timestamps & Timezone Conventions
- **Format**: All timestamps exposed in JSON APIs MUST follow **ISO 8601** format with explicit timezone offsets.
  - *Standard representation*: `YYYY-MM-DDTHH:mm:ssXXX` (e.g., `2026-10-20T08:00:00+07:00` or `2026-11-10T09:15:02.311Z`).
- **Database Storage**: In PostgreSQL, all datetime columns MUST be stored as `TIMESTAMPTZ` (Timestamp with Time Zone in UTC).
- **Serialization**: The Spring Boot backend uses `java.time.Instant` or `java.time.OffsetDateTime` serialized via Jackson `JavaTimeModule` without timestamps as raw numeric epoch milliseconds.

---

## 2. System Roles (RBAC)

The Rikkei Jobs access control system comprises five distinct user roles:

| Role Name | Tên hiển thị Tiếng Việt | One-line Meaning & Domain Responsibilities |
|---|---|---|
| **`CANDIDATE`** | Ứng viên | Học viên/sinh viên sở hữu hồ sơ năng lực (Skill Profile), nộp CV ứng tuyển, nhận gợi ý học tập và sử dụng trợ lý AI. |
| **`HR`** | Doanh nghiệp tuyển dụng | Đại diện doanh nghiệp quản lý hồ sơ công ty, đăng tải & quản lý tin tuyển dụng (JD), tìm kiếm ứng viên công khai và gửi thư mời tuyển dụng (offer). |
| **`MENTOR`** | Giảng viên / Hướng dẫn | Giảng viên hoặc chuyên gia hướng dẫn thực tập dự án IOC; thực hiện đánh giá năng lực ứng viên và ghi nhận kết quả chuyên môn. |
| **`STAFF`** | Cán bộ tuyển dụng | Cán bộ điều phối Rikkei Education phụ trách duyệt hồ sơ năng lực, duyệt JD doanh nghiệp, mở thông tin liên hệ và ghép đợt thực tập IOC. |
| **`ADMIN`** | Quản trị viên hệ thống | Quản trị viên hệ thống toàn quyền cấu hình danh mục 20 kỹ năng, quản trị người dùng, thiết lập trọng số đánh giá và kiểm tra nhật ký kiểm toán (audit log). |

---

## 3. Sample Accounts for Development (Dev Profile)

For local development and continuous integration testing, exactly 8 fictitious accounts are provisioned via the dev database seed.

- **Universal Password**: `Test@123` (Stored as BCrypt hash: `$2a$10$...`)
- **Email Domain**: `@rikkeijobs.test`

| Email | Full Name | Role | LMS User ID (`lms_user_id`) | Testing Purpose |
|---|---|---|---|---|
| `candidate1@rikkeijobs.test` | Nguyễn Văn An | `CANDIDATE` | `lms-sv-001` | Candidate with strong Java/Spring skills, completed IOC internship |
| `candidate2@rikkeijobs.test` | Trần Thị Bình | `CANDIDATE` | `lms-sv-002` | Candidate with strong ReactJS/Frontend skills, no internship yet |
| `candidate3@rikkeijobs.test` | Lê Minh Châu | `CANDIDATE` | `lms-sv-003` | Candidate with basic skills, multiple gaps, no internship |
| `hr1@rikkeijobs.test` | Đại diện Doanh nghiệp A | `HR` | *(None / NULL)* | Enterprise recruiter for Company A |
| `hr2@rikkeijobs.test` | Đại diện Doanh nghiệp B | `HR` | *(None / NULL)* | Enterprise recruiter for Company B |
| `mentor1@rikkeijobs.test` | Phạm Quốc Dũng | `MENTOR` | `lms-mt-001` | Mentor for internship batch `IOC-JB-2026-09` |
| `staff1@rikkeijobs.test` | Hoàng Thu Hà | `STAFF` | `lms-st-001` | Placement coordinator reviewing candidates and JDs |
| `admin1@rikkeijobs.test` | Đỗ Thanh Hải | `ADMIN` | `lms-ad-001` | System administrator with full permissions |

*Note: In production (`prod`) or default environment without the `dev` profile, zero seed users are inserted.*

---

## 4. Mock External Systems Contract Summary

Full details and schema examples are documented in [`docs/mock-contract.md`](mock-contract.md).

- **Mock Process**: Standalone Node.js Express server running on port `9000`.
- **Authentication**: Requires HTTP header `X-Service-Key: dev-key` for all `/lms`, `/exam`, `/pm`, and `/meet` routes.
- **11 Business Endpoints**: Covers LMS SSO authentication, student results, course recommendations, course enrollment, exam scores, PM internships, batch member addition, and Rikkei Meet room generation.
- **4 Testing Tools**: Non-authenticated testing tools at `/mock/reload`, `/mock/requests`, `/mock/enrollments`, and `/mock/reset`.
- **SSO Single-Use & Expiration Rule**: The mock server deliberately does NOT enforce single-use or 60-second expiration (it returns 200 on repeated calls). The **Backend** is strictly responsible for enforcing single-use and the 60s TTL window in subsequent task `NT-01` via the `used_sso_tickets` table. Neither mock nor backend implements this rejection logic in Sprint 1.

---

## 5. Fixed Skills Catalogue (20 Standard Codes)

The Rikkei Jobs competency framework defines exactly 20 standardized skill codes. The `assessment` module owns the `skills` table in the database.

### 5.1 Complete 20 Skills Table
| # | Skill Code | English Display Name | Tên hiển thị Tiếng Việt | Category |
|:---:|:---|:---|:---|:---|
| 1 | `JAVA` | Java Programming | Lập trình Java | Backend / Core |
| 2 | `SPRING_BOOT` | Spring Boot Framework | Framework Spring Boot | Backend / Framework |
| 3 | `SQL` | SQL & Relational Databases | Cơ sở dữ liệu & SQL | Database |
| 4 | `GIT` | Git Version Control | Quản lý phiên bản Git | DevOps / Tools |
| 5 | `REST_API` | RESTful API Design | Thiết kế API RESTful | Architecture |
| 6 | `HTML_CSS` | HTML5 & CSS3 | Giao diện web HTML5 & CSS3 | Frontend / Web |
| 7 | `JAVASCRIPT` | JavaScript Programming | Lập trình JavaScript | Frontend / Core |
| 8 | `REACTJS` | ReactJS Frontend Library | Thư viện ReactJS | Frontend / Framework |
| 9 | `DOCKER` | Docker & Containerization | Đóng gói ứng dụng Docker | DevOps / Infrastructure |
| 10 | `ENGLISH` | English Proficiency | Trình độ Tiếng Anh | Soft Skill / Language |
| 11 | `TESTING` | Software Testing & QA | Kiểm thử phần mềm & QA | Engineering Practice |
| 12 | `LINUX` | Linux Administration | Quản trị hệ điều hành Linux | DevOps / OS |
| 13 | `OOP` | Object-Oriented Programming | Lập trình hướng đối tượng | Software Engineering |
| 14 | `DSA` | Data Structures & Algorithms | Cấu trúc dữ liệu & Giải thuật | Computer Science |
| 15 | `CLEAN_CODE` | Clean Code & Refactoring | Viết mã sạch & Tái cấu trúc | Engineering Practice |
| 16 | `TEAMWORK` | Teamwork & Collaboration | Kỹ năng làm việc nhóm | Soft Skill |
| 17 | `COMMUNICATION`| Communication Skills | Kỹ năng giao tiếp | Soft Skill |
| 18 | `AGILE` | Agile & Scrum Methodology | Phương pháp Agile & Scrum | Process |
| 19 | `SECURITY` | Application Security | Bảo mật ứng dụng | Architecture / Security |
| 20 | `CLOUD` | Cloud Computing | Điện toán đám mây | Infrastructure |

### 5.2 Skill Level Bands (0–100 Scale)
Every evaluated skill produces an index score from `0` to `100`, mapped to 4 standardized proficiency bands:

- **`0 – 39`**: **Cơ bản** (*Basic / Elementary*) — Has foundational knowledge, requires continuous guidance.
- **`40 – 69`**: **Khá** (*Intermediate*) — Can independently complete standard tasks with occasional review.
- **`70 – 84`**: **Tốt** (*Advanced / Good*) — Highly proficient, writes clean code, solves complex domain problems.
- **`85 – 100`**: **Xuất sắc** (*Expert / Excellent*) — Deep architectural insight, mentors others, exemplary performance.

### 5.3 Data Source Scale & Conversion Rules
- **LMS & Exam Scores**: Raw scores from LMS and Exam modules are reported on a **0–10 scale** (e.g., `score: 8.5`). To convert to the Rikkei Jobs 0–100 skill index, multiply by **10**:
  $$\text{Skill Index} = \text{score} \times 10$$
- **Percentages**: Attendance rate (`attendanceRate`), homework rate (`homeworkRate`), and study progress (`progress`) are recorded as integer percentages on a **0–100 scale**.
- **Mock Data Verification**: All courses in `mock/data.json` reference valid skills within this 20-skill catalogue:
  - `LMS-C-JAVA-02`: `["JAVA", "OOP"]`
  - `LMS-C-SQL-01`: `["SQL"]`
  - `LMS-C-SPRING-01`: `["SPRING_BOOT", "REST_API"]`
  - `LMS-C-REACT-01`: `["REACTJS", "JAVASCRIPT"]`
  - `LMS-C-GIT-01`: `["GIT"]`
  - `LMS-C-DOCKER-01`: `["DOCKER", "LINUX"]`

---

## 6. Architecture & Code Boundaries (Modular Monolith)

To preserve architectural integrity across sprints, the following rules are non-negotiable:

### 6.1 Module Table Ownership
1. Each database table is strictly and exclusively owned by exactly **one domain module**.
2. **Table Ownership Mapping**:
   - `identity`: `roles`, `users`, `used_sso_tickets`
   - `candidate`: `candidates`, `candidate_skills`, `cv_templates`
   - `company` & `job`: `companies`, `job_postings`, `hr_profiles`
   - `internship`: `internship_batches`, `internship_members`, `internship_tasks`
   - `assessment`: `skills` (the 20 catalogue codes), `assessments`, `evaluation_sheets`
   - `learning`: `course_recommendations`, `study_progress`
   - `recruitment`: `applications`, `interviews`, `offers`
   - `ai`: Stateless assistant sessions, no persistent domain tables.

### 6.2 No Cross-Module Foreign Keys or SQL Joins
- **No Physical Foreign Keys**: Never declare a `FOREIGN KEY` between a table in Module A and a table in Module B. Store only raw identifiers (e.g., `UUID candidate_id` in recruitment tables).
- **No Cross-Module Joins**: Never execute SQL queries containing `JOIN` clauses across module boundaries.
- **Inter-Module Communication**: Modules must communicate exclusively via typed Java Service Interfaces (returning immutable Java Records/DTOs) or asynchronous Spring Application Events (`ApplicationEventPublisher`).

### 6.3 Centralized External API Client
- Domain modules must never construct raw HTTP clients (such as `RestClient`, `HttpClient`, or `WebClient`) to call external services directly.
- All external interactions with LMS, Exam, PM, and Meet must be dispatched through the unified `ExternalApiClient` located in the shared infrastructure package.

---

## 7. Definition of Done (DoD)

A task, feature, or pull request achieves "Done" status when:
1. All functional criteria from the issue specification are fully satisfied.
2. Code follows naming conventions: database `snake_case`, Java `PascalCase`/`camelCase`, API JSON `camelCase`.
3. Unit and integration tests pass with 100% green status on real running dependencies (using Testcontainers; zero facade tests).
4. Automated linters pass with zero warnings (`spotless:check`, `npm run lint`, `markdownlint`).
5. Security requirements are validated: zero hardcoded secrets, no machine-specific paths or personal home directories, no lingering `TODO` markers.
6. Local Docker Compose verification completes successfully via `docker compose up -d --build --wait`.
