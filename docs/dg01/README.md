
# DG-01 Technical Specification & Verification Report - Tài Liệu Kỹ Thuật & Báo Cáo Nghiệm Thu Phân Hệ DG-01

**Task Code / Mã Nhiệm Vụ**: T023B91 (Pull Request #3, Round DG-01-fix & Round DG-01-e2e)  
**Feature Name / Tên Tính Năng**: Phiếu đánh giá của mentor theo khung kỹ năng (Mentor Evaluation on Candidate Skill Framework)  
**Target Milestone / Cột Mốc Mục Tiêu**: M4 (Gates G6 & G7)  
**Working Directory / Thư Mục Làm Việc**: `D:\GitHub\Rikkei\rikkei-jobs`  
**Applicable Rules / Quy Tắc Áp Dụng**: Rule 01 to 16, Anti-AI Design System Rubric, WCAG 2.2 AA, Zero Emoji Policy.

---

## 1. Executive Summary / Tổng Quan Tính Năng

### 1.1. English

Feature DG-01 provides a standardized mentor evaluation mechanism integrated directly into candidate competency profiles. Mentors evaluate candidates against structured evaluation templates ("Java Backend - Internship" and "General Technical Interview") using discrete numeric scores (scale 0-100) and qualitative commentary for each criterion. When submitted, evaluations atomically generate verified skill evidence (`source = MENTOR`, `verified = true`), trigger candidate skill score recomputation, and lock the evaluation against further modifications. The frontend experience embeds submitted evaluations seamlessly into the candidate profile with strict WCAG 2.2 AA accessibility and zero external styling dependencies.

### 1.2. Tiếng Việt

Tính năng DG-01 cung cấp cơ chế chuẩn hóa phiếu đánh giá từ mentor tích hợp trực tiếp vào hồ sơ năng lực của ứng viên. Mentor đánh giá ứng viên dựa trên các mẫu phiếu định sẵn ("Java Backend – Thực tập" và "Phỏng vấn kỹ thuật chung") thông qua thang điểm số (thang 0-100) và nhận xét định tính cho từng tiêu chí. Khi gửi phiếu (submit), hệ thống xử lý giao dịch nguyên tử: sinh bằng chứng kỹ năng đã xác thực (`source = MENTOR`, `verified = true`), kích hoạt tính toán lại chỉ số kỹ năng ứng viên, và khóa phiếu đánh giá ngăn chặn sửa đổi. Giao diện frontend nhúng khối đánh giá liền mạch trong trang hồ sơ kỹ năng ứng viên, đáp ứng chuẩn tiếp cận WCAG 2.2 AA và sử dụng 100% design token của dự án.

---

## 2. Module Architecture & Boundaries / Kiến Trúc Ranh Giới Module

### 2.1. English

The project strictly implements a Modular Monolith conforming to Java 25 (Rule 05) and Backend Module Boundaries (Rule 14):

```text
+-------------------------------------------------------------------------+
|                              API Gateway / Security                     |
+-------------------------------------------------------------------------+
       |                                              |
       v                                              v
+-----------------------------+        +----------------------------------+
|      assessment module      |        |        candidate module          |
|  - EvaluationTemplate       |        |  - CandidateProfile              |
|  - EvaluationCriteria       |        |  - SkillEvidence                 |
|  - Evaluation               |        |  - CandidateSkill                |
|  - EvaluationScore          |        |  - EvaluationProfileController   |
|  - EvaluationPublicService  |<=======| (GET /profiles/{id}/evaluations) |
+-----------------------------+        +----------------------------------+
       |                  \                      /
       | Evidence +        \ User Info          / User Info
       | Recompute          \                  /
       v                     v                v
+-------------------------------------------------------------------------+
|                             identity module                             |
|  - User, UserSummaryDto, IdentityPublicService                          |
+-------------------------------------------------------------------------+
```

#### Assessment Module

- **Owned Tables**: `evaluation_templates`, `evaluation_criteria`, `evaluations`, `evaluation_scores`.
- **Physical Decoupling**: No foreign keys to external tables. `user_id` (candidate ID) and `mentor_id` are stored as scalar `BIGINT` columns.
- **Zero Forbidden Imports**: No direct entity (`User`, `CandidateProfile`, `SkillEvidence`) or repository imports from `identity` or `candidate` modules.
- **Cross-Module Integration**: Calls `CandidatePublicService` to record skill evidences and trigger `recomputeSkills`. Calls `IdentityPublicService` to resolve mentor names and emails in batches.
- **Pure Entities & Records**: Plain POJO entities without Project Lombok; immutable Java `record` for all request/response DTOs; handwritten manual mappers (no MapStruct).

#### Candidate Module

- **Owned Tables**: `candidate_profiles`, `skill_evidences`, `candidate_skills`.
- **Profile Evaluations Endpoint**: `EvaluationProfileController` exposes `GET /api/v1/profiles/{userId}/evaluations`.
- **Cross-Module Integration**: Delegates retrieval of submitted evaluations to `EvaluationPublicService`.
- **IDOR Protection**:
  - `CANDIDATE` role may only access their own profile (`principal.id == userId`).
  - `HR` role may view evaluations only if the candidate profile is public (`is_public = true`).
  - Unauthorized or non-existent profile queries return `HTTP 404 NOT_FOUND` to prevent data enumeration.

---

### 2.2. Tiếng Việt

Dự án triển khai mô hình Modular Monolith nghiêm ngặt tuân thủ Java 25 (Rule 05) và Ranh giới Phân hệ Backend (Rule 14):

#### Phân Hệ Đánh Giá (Assessment Module)

- **Các bảng dữ liệu sở hữu**: `evaluation_templates`, `evaluation_criteria`, `evaluations`, `evaluation_scores`.
- **Phân tách vật lý**: Tuyệt đối không tạo khóa ngoại (Foreign Key) sang các bảng của module khác. Cột `user_id` (ứng viên) và `mentor_id` được lưu dưới dạng số nguyên vô hướng (`BIGINT`).
- **Không import chéo trái phép**: Không import trực tiếp thực thể (`User`, `CandidateProfile`, `SkillEvidence`) hay repository của các module `identity` và `candidate`.
- **Giao tiếp liên phân hệ**: Giao tiếp thông qua các Public Service Interface: gọi `CandidatePublicService` để ghi nhận bằng chứng kỹ năng (`SkillEvidence`) và yêu cầu tính toán lại điểm (`recomputeSkills`); gọi `IdentityPublicService` để lấy thông tin hiển thị mentor (họ tên, email) theo lô.
- **Thực thể thuần và Record**: Sử dụng Java POJO thuần (không dùng Lombok); toàn bộ DTO request/response là Java `record` bất biến; mapper viết tay thủ công (không dùng MapStruct).

#### Phân Hệ Ứng Viên (Candidate Module)

- **Các bảng dữ liệu sở hữu**: `candidate_profiles`, `skill_evidences`, `candidate_skills`.
- **Điểm vào API xem đánh giá**: `EvaluationProfileController` cung cấp endpoint `GET /api/v1/profiles/{userId}/evaluations`.
- **Giao tiếp liên phân hệ**: Ủy quyền việc truy vấn phiếu đánh giá đã gửi cho `EvaluationPublicService`.
- **Cơ chế chống IDOR (Insecure Direct Object Reference)**:
  - Tài khoản vai trò `CANDIDATE` chỉ được xem phiếu đánh giá của chính mình (`principal.id == userId`).
  - Tài khoản vai trò `HR` chỉ được xem phiếu khi hồ sơ ứng viên ở trạng thái công khai (`is_public = true`).
  - Mọi trường hợp truy cập trái phép hoặc hồ sơ không tồn tại đều trả về mã lỗi `HTTP 404 NOT_FOUND` nhằm che giấu hoàn toàn sự tồn tại của dữ liệu.

---

## 3. Database Schema & Migrations / Cơ Sở Dữ Liệu & Di Trú Flyway

### 3.1. English

#### Production DDL: `V7__evaluation.sql`

Creates 4 relational tables in `db/migration/` using strict PostgreSQL conventions:

1. `evaluation_templates`: Catalog of evaluation templates with `name` (`VARCHAR(150)`), `position` (`VARCHAR(100)`), `context` (`CHECK context IN ('INTERNSHIP', 'INTERVIEW')`), `active` (`BOOLEAN DEFAULT TRUE`), and unique constraint on `(name, context)`.
2. `evaluation_criteria`: Criteria linked via foreign key to `template_id` (cascading delete) and `skill_id` (referencing `skills(id)`), with `description` (`VARCHAR(500)`), `weight` (`NUMERIC(5,2) CHECK (weight >= 0.01 AND weight <= 100.00)`), and unique constraint on `(template_id, skill_id)`.
3. `evaluations`: Evaluation records with `template_id`, scalar `mentor_id`, scalar `user_id`, `context` (`CHECK context IN ('INTERNSHIP', 'INTERVIEW')`), `status` (`DRAFT` | `SUBMITTED`), `submitted_at TIMESTAMPTZ`, `version BIGINT NOT NULL DEFAULT 0` (Optimistic Locking), and composite index on `(user_id, status)`.
4. `evaluation_scores`: Evaluation scores with `evaluation_id`, `criterion_id`, `score INT CHECK (score IS NULL OR (score >= 0 AND score <= 100))`, optional `comment TEXT`, and unique constraint on `(evaluation_id, criterion_id)`.

#### Development Seed DML: `V8__dev_evaluation_seed.sql`

Populates idempotent development seed data in `db/migration-dev/`:

- **Template 1**: "Java Backend – Thực tập" (`position = 'Java Backend'`, `context = 'INTERNSHIP'`, `active = TRUE`) with 5 criteria:
  - `JAVA` (Weight 30.00%): Đánh giá kiến thức Java Core, OOP và Collections.
  - `SPRING_BOOT` (Weight 25.00%): Đánh giá khả năng sử dụng Spring Boot, Dependency Injection và xây dựng REST API.
  - `SQL` (Weight 20.00%): Đánh giá kiến thức cơ sở dữ liệu, thiết kế bảng và truy vấn SQL.
  - `GIT` (Weight 10.00%): Đánh giá khả năng sử dụng Git, quản lý branch và xử lý merge.
  - `TEAMWORK` (Weight 15.00%): Đánh giá khả năng làm việc nhóm và phối hợp với các thành viên.
  *(Total weight = 100.00%)*
- **Template 2**: "Phỏng vấn kỹ thuật chung" (`position = 'Software Developer'`, `context = 'INTERVIEW'`, `active = TRUE`) with 5 criteria:
  - `OOP` (Weight 20.00%): Đánh giá khả năng hiểu và áp dụng các nguyên lý lập trình hướng đối tượng.
  - `DSA` (Weight 25.00%): Đánh giá kiến thức cấu trúc dữ liệu và giải thuật.
  - `SQL` (Weight 15.00%): Đánh giá khả năng truy vấn, JOIN và xử lý dữ liệu SQL.
  - `REST_API` (Weight 20.00%): Đánh giá kiến thức thiết kế RESTful API, HTTP methods và tích hợp API.
  - `JAVA` (Weight 20.00%): Đánh giá kiến thức Java Core và khả năng áp dụng vào thực tế.
  *(Total weight = 100.00%)*

---

### 3.2. Tiếng Việt

#### Định Nghĩa CSDL Production: `V7__evaluation.sql`

Khởi tạo 4 bảng quan hệ trong `db/migration/` tuân thủ quy ước PostgreSQL nghiêm ngặt:

1. `evaluation_templates`: Danh mục mẫu phiếu đánh giá với `name` (`VARCHAR(150)`), `position` (`VARCHAR(100)`), `context` (`CHECK context IN ('INTERNSHIP', 'INTERVIEW')`), `active` (`BOOLEAN DEFAULT TRUE`), ràng buộc duy nhất trên `(name, context)`.
2. `evaluation_criteria`: Tiêu chí đánh giá gắn với `template_id` (xóa theo tầng - CASCADE) và `skill_id` (khóa ngoại sang `skills(id)`), có mô tả `description` (`VARCHAR(500)`), trọng số `weight` (`NUMERIC(5,2) CHECK (weight >= 0.01 AND weight <= 100.00)`), và ràng buộc duy nhất trên `(template_id, skill_id)`.
3. `evaluations`: Phiếu đánh giá chứa `template_id`, scalar `mentor_id`, scalar `user_id`, `context` (`CHECK context IN ('INTERNSHIP', 'INTERVIEW')`), `status` (`DRAFT` | `SUBMITTED`), `submitted_at TIMESTAMPTZ`, `version BIGINT NOT NULL DEFAULT 0` (Khóa lạc quan - Optimistic Locking), và chỉ mục tối ưu trên `(user_id, status)`.
4. `evaluation_scores`: Chi tiết điểm tiêu chí chứa `evaluation_id`, `criterion_id`, `score INT CHECK (score IS NULL OR (score >= 0 AND score <= 100))`, nhận xét `comment TEXT`, và ràng buộc duy nhất trên `(evaluation_id, criterion_id)`.

#### Dữ Liệu Khởi Tạo Môi Trường Dev: `V8__dev_evaluation_seed.sql`

Chèn dữ liệu mẫu an toàn (idempotent) vào `db/migration-dev/`:

- **Mẫu 1**: "Java Backend – Thực tập" (`position = 'Java Backend'`, `context = 'INTERNSHIP'`, `active = TRUE`) gồm 5 tiêu chí:
  - `JAVA` (Trọng số 30.00%): Đánh giá kiến thức Java Core, OOP và Collections.
  - `SPRING_BOOT` (Trọng số 25.00%): Đánh giá khả năng sử dụng Spring Boot, Dependency Injection và xây dựng REST API.
  - `SQL` (Trọng số 20.00%): Đánh giá kiến thức cơ sở dữ liệu, thiết kế bảng và truy vấn SQL.
  - `GIT` (Trọng số 10.00%): Đánh giá khả năng sử dụng Git, quản lý branch và xử lý merge.
  - `TEAMWORK` (Trọng số 15.00%): Đánh giá khả năng làm việc nhóm và phối hợp với các thành viên.
  *(Tổng trọng số = 100.00%)*
- **Mẫu 2**: "Phỏng vấn kỹ thuật chung" (`position = 'Software Developer'`, `context = 'INTERVIEW'`, `active = TRUE`) gồm 5 tiêu chí:
  - `OOP` (Trọng số 20.00%): Đánh giá khả năng hiểu và áp dụng các nguyên lý lập trình hướng đối tượng.
  - `DSA` (Trọng số 25.00%): Đánh giá kiến thức cấu trúc dữ liệu và giải thuật.
  - `SQL` (Trọng số 15.00%): Đánh giá khả năng truy vấn, JOIN và xử lý dữ liệu SQL.
  - `REST_API` (Trọng số 20.00%): Đánh giá kiến thức thiết kế RESTful API, HTTP methods và tích hợp API.
  - `JAVA` (Trọng số 20.00%): Đánh giá kiến thức Java Core và khả năng áp dụng vào thực tế.
  *(Tổng trọng số = 100.00%)*

---

## 4. Seed Accounts, Security & API Payloads / Tài Khoản Seed, Bảo Mật & Payloads

### 4.1. Development Seed Accounts / Danh Sách Tài Khoản Seed Mẫu

To facilitate integration testing and manual verification, standard seed accounts from `V2__dev_seed.sql`, `V6__dev_seed_nt01.sql`, and `V8__dev_evaluation_seed.sql` are mapped as follows (tổng hợp tài khoản seed môi trường dev từ `V2`, `V6` và `V8`):

| Role / Vai Trò | Standard Email / Email Quy Ước | Seed Database Email / Email CSDL Seed | User ID | Default Password / Mật Khẩu | Test Context & Purpose / Mục Đích Kiểm Thử |
|---|---|---|---|---|---|
| `CANDIDATE` | `candidate@rikkei.edu.vn` | `candidate1@rikkeijobs.test` | `1` | `Test@123` | Primary candidate (`is_public = false`). Can view own evaluations; blocked from other profiles. / Ứng viên chính (hồ sơ riêng tư). Xem phiếu của chính mình; không xem được hồ sơ người khác. |
| `CANDIDATE` | `candidate2@rikkei.edu.vn` | `candidate2@rikkeijobs.test` | `2` | `Test@123` | Secondary candidate (`is_public = true`). Used for public HR visibility and IDOR verification. / Ứng viên công khai (`is_public = true`). Dùng kiểm thử HR xem hồ sơ công khai và chống IDOR. |
| `MENTOR` | `mentor1@rikkei.edu.vn` | `mentor1@rikkeijobs.test` | `6` | `Test@123` | Primary mentor (`lms_user_id = lms-mt-001`, no company). Creates, updates, and submits evaluations. / Mentor chính. Tạo, cập nhật và gửi phiếu đánh giá. |
| `MENTOR` | `mentor2@rikkei.edu.vn` | `mentor2@rikkeijobs.test` | `9` | `Test@123` | Secondary mentor seeded idempotently in `V8__dev_evaluation_seed.sql` (`lms_user_id = lms-mt-002`, `company_id = NULL`, `must_change_password = false`). Used for IDOR 404 test against Mentor 1 evaluations. / Mentor thứ hai seed idempotent trong `V8` (không gắn công ty). Dùng kiểm thử chống IDOR 404 khi sửa hoặc gửi phiếu của Mentor 1. |
| `HR` | `hr1@rikkei.edu.vn` | `hr1@rikkeijobs.test` | `4` | `Test@123` | HR user with `must_change_password = true` in `V6` (blocked by `MustChangePasswordFilter` with 403). / Tài khoản HR yêu cầu đổi mật khẩu lần đầu (bị chặn 403 trước khi đổi mật khẩu). |
| `HR` | `hr2@rikkei.edu.vn` | `hr2@rikkeijobs.test` | `5` | `Test@123` | Active HR user (`must_change_password = false`, `company_id = 2`). Views public candidate evaluations (`200`); gets `404` for private profiles. / Tài khoản HR hoạt động chuẩn trong E2E. Xem hồ sơ công khai (`200`); bị trả về `404` với hồ sơ riêng tư. |

---

### 4.2. Security Access Control Matrix / Ma Trận Phân Quyền & Chống IDOR

| Endpoint | Method | Allowed Roles / Vai Trò | Business Rules & IDOR Defense (English) | Quy Tắc Nghiệp Vụ & Chống IDOR (Tiếng Việt) |
|---|---|---|---|---|
| `/api/v1/evaluation-templates` | GET | `MENTOR` | Lists active evaluation templates for mentor assessment. | Liệt kê các mẫu phiếu đánh giá đang kích hoạt cho mentor. |
| `/api/v1/evaluations` | POST | `MENTOR` | Creates a new draft evaluation for a designated candidate. | Tạo mới phiếu đánh giá nháp (DRAFT) cho ứng viên chỉ định. |
| `/api/v1/evaluations/{id}` | PUT | `MENTOR` | Updates scores and comments in DRAFT status. Returns 404 if not owned by mentor (IDOR mask); returns 409 if already SUBMITTED. | Cập nhật điểm và nhận xét khi ở trạng thái DRAFT. Trả về 404 nếu không phải mentor sở hữu phiếu (chống IDOR); trả về 409 nếu phiếu đã nộp. |
| `/api/v1/evaluations/{id}/submit` | POST | `MENTOR` | Validates all criteria scores present; atomically writes skill evidence, triggers recomputation, marks SUBMITTED. Protected by `@Version`. | Kiểm tra nhập đủ điểm tất cả tiêu chí; ghi nhận bằng chứng kỹ năng nguyên tử, tính lại điểm, chuyển SUBMITTED. Bảo vệ bởi khóa lạc quan. |
| `/api/v1/profiles/{userId}/evaluations` | GET | `CANDIDATE`, `HR` | `CANDIDATE` sees own evaluations (`userId == principal.id`). `HR` sees evaluations only if candidate profile is PUBLIC (`is_public = true`). Returns 404 otherwise. | `CANDIDATE` chỉ xem phiếu của mình. `HR` chỉ xem phiếu khi hồ sơ ứng viên là CÔNG KHAI (`is_public = true`). Trả về 404 cho mọi trường hợp vi phạm. |

---

### 4.3. API Request & Response Payloads / Ví Dụ Dữ Liệu Yêu Cầu & Phản Hồi

#### 1. `POST /api/v1/evaluations` (Tạo phiếu nháp / Create draft evaluation)

- **Role**: `MENTOR`
- **Request Body**:

```json
{
  "templateId": 1,
  "userId": 1,
  "context": "INTERNSHIP",
  "batchId": 101,
  "interviewRoundId": null,
  "overallComment": "Đánh giá quá trình thực tập đợt 1 năm 2026",
  "scores": [
    {
      "criterionId": 1,
      "score": 85,
      "comment": "Nắm vững Java Core, hiểu rõ OOP và Collections framework"
    }
  ]
}
```

- **Response (`201 CREATED`)**:

```json
{
  "id": 1,
  "templateId": 1,
  "userId": 1,
  "mentorId": 6,
  "context": "INTERNSHIP",
  "batchId": 101,
  "interviewRoundId": null,
  "status": "DRAFT",
  "overallComment": "Đánh giá quá trình thực tập đợt 1 năm 2026",
  "submittedAt": null,
  "scores": [
    {
      "id": 10,
      "criterionId": 1,
      "score": 85,
      "comment": "Nắm vững Java Core, hiểu rõ OOP và Collections framework"
    }
  ]
}
```

#### 2. `PUT /api/v1/evaluations/{id}` (Cập nhật điểm nháp / Update evaluation draft)

- **Role**: `MENTOR`
- **Request Body**:

```json
{
  "overallComment": "Cập nhật đánh giá toàn diện sau khi hoàn thành dự án mẫu",
  "scores": [
    {
      "criterionId": 1,
      "score": 85,
      "comment": "Nắm vững Java Core, hiểu rõ OOP và Collections framework"
    },
    {
      "criterionId": 2,
      "score": 90,
      "comment": "Xây dựng REST API chuẩn RESTful, xử lý exception sạch sẽ"
    },
    {
      "criterionId": 3,
      "score": 80,
      "comment": "Thiết kế schema PostgreSQL chuẩn hóa, biết dùng index"
    },
    {
      "criterionId": 4,
      "score": 88,
      "comment": "Chủ động giao tiếp, tuân thủ quy trình Git flow"
    }
  ]
}
```

- **Response (`200 OK`)**:

```json
{
  "id": 1,
  "templateId": 1,
  "userId": 1,
  "mentorId": 6,
  "context": "INTERNSHIP",
  "batchId": 101,
  "interviewRoundId": null,
  "status": "DRAFT",
  "overallComment": "Cập nhật đánh giá toàn diện sau khi hoàn thành dự án mẫu",
  "submittedAt": null,
  "scores": [
    { "id": 10, "criterionId": 1, "score": 85, "comment": "Nắm vững Java Core..." },
    { "id": 11, "criterionId": 2, "score": 90, "comment": "Xây dựng REST API..." },
    { "id": 12, "criterionId": 3, "score": 80, "comment": "Thiết kế schema PostgreSQL..." },
    { "id": 13, "criterionId": 4, "score": 88, "comment": "Chủ động giao tiếp..." }
  ]
}
```

#### 3. `POST /api/v1/evaluations/{id}/submit` (Nộp phiếu chính thức / Final submission)

- **Role**: `MENTOR`
- **Request Body**: Empty `{}` / No payload
- **Response (`200 OK`)**:

```json
{
  "id": 1,
  "templateId": 1,
  "userId": 1,
  "mentorId": 6,
  "context": "INTERNSHIP",
  "batchId": 101,
  "interviewRoundId": null,
  "status": "SUBMITTED",
  "overallComment": "Cập nhật đánh giá toàn diện sau khi hoàn thành dự án mẫu",
  "submittedAt": "2026-11-16T14:20:00+07:00",
  "scores": [
    { "id": 10, "criterionId": 1, "score": 85, "comment": "Nắm vững Java Core..." },
    { "id": 11, "criterionId": 2, "score": 90, "comment": "Xây dựng REST API..." },
    { "id": 12, "criterionId": 3, "score": 80, "comment": "Thiết kế schema PostgreSQL..." },
    { "id": 13, "criterionId": 4, "score": 88, "comment": "Chủ động giao tiếp..." }
  ]
}
```

#### 4. `GET /api/v1/evaluation-templates` (Danh mục mẫu phiếu / List templates)

- **Role**: `MENTOR`
- **Response (`200 OK`)**:

```json
[
  {
    "id": 1,
    "name": "Java Backend – Thực tập",
    "position": "INTERNSHIP",
    "context": "INTERNSHIP",
    "active": true,
    "criteria": [
      { "id": 1, "skillId": 101, "description": "Kiến thức Java Core và OOP", "weight": 25.00 },
      { "id": 2, "skillId": 102, "description": "Xây dựng REST API với Spring Boot", "weight": 30.00 },
      { "id": 3, "skillId": 103, "description": "Cơ sở dữ liệu và tối ưu hóa truy vấn", "weight": 25.00 },
      { "id": 4, "skillId": 104, "description": "Tác phong làm việc và tuân thủ quy trình", "weight": 20.00 }
    ]
  },
  {
    "id": 2,
    "name": "Phỏng vấn kỹ thuật chung",
    "position": "INTERVIEW",
    "context": "INTERVIEW",
    "active": true,
    "criteria": [
      { "id": 5, "skillId": 201, "description": "Cấu trúc dữ liệu và giải thuật", "weight": 35.00 },
      { "id": 6, "skillId": 202, "description": "Thiết kế hệ thống và tư duy kiến trúc", "weight": 35.00 },
      { "id": 7, "skillId": 203, "description": "Kỹ năng giao tiếp và giải quyết vấn đề", "weight": 30.00 }
    ]
  }
]
```

#### 5. `GET /api/v1/profiles/{userId}/evaluations` (Tra cứu đánh giá ứng viên / Query candidate evaluations)

- **Role**: `CANDIDATE` (self) hoặc `HR` (khi profile `is_public = true`)
- **Response (`200 OK`)**:

```json
{
  "userId": 1,
  "evaluations": [
    {
      "id": 1,
      "mentor": {
        "id": 6,
        "name": "Phạm Quốc Dũng"
      },
      "templateId": 1,
      "context": "INTERNSHIP",
      "submittedAt": "2026-11-16T14:20:00+07:00",
      "overallComment": "Ứng viên có tiến bộ vượt bậc trong đợt thực tập.",
      "scores": [
        {
          "criterionId": 1,
          "criterionDescription": "Kiến thức Java Core và OOP",
          "score": 85.00,
          "comment": "Nắm vững Java Core, hiểu rõ OOP và Collections framework"
        },
        {
          "criterionId": 2,
          "criterionDescription": "Xây dựng REST API với Spring Boot",
          "score": 90.00,
          "comment": "Xây dựng REST API chuẩn RESTful, xử lý exception sạch sẽ"
        }
      ]
    }
  ]
}
```

---

## 5. Concurrency, Performance & Known Limits / Quản Lý Đồng Thời, Hiệu Năng & Giới Hạn

### 5.1. Clock Injection & Timestamps / Tiêm Bean Clock & Thời Gian

- **English**: An injectable `java.time.Clock` is configured as a Spring Bean (`ClockConfig.java`). All business dates/times are acquired via `OffsetDateTime.now(clock)` and persisted as PostgreSQL `TIMESTAMPTZ`, enabling deterministic integration testing with mocked temporal boundaries.
- **Tiếng Việt**: Bean `java.time.Clock` được tiêm (inject) tập trung qua Spring context (`ClockConfig.java`). Toàn bộ mốc thời gian nghiệp vụ được tạo qua `OffsetDateTime.now(clock)` và lưu trữ dưới dạng `TIMESTAMPTZ`, cho phép kiểm thử tích hợp chính xác và tất định mà không bị phụ thuộc vào đồng hồ hệ thống.

### 5.2. Optimistic Locking & Double Submit / Khóa Lạc Quan & Chống Submit Đúp

- **English**: The `evaluations` table includes `version BIGINT NOT NULL DEFAULT 0` mapped by `@Version private Long version;`. Concurrent submit attempts trigger `ObjectOptimisticLockingFailureException`, intercepted and mapped to `HTTP 409 CONFLICT` with a localized message. Exactly one set of verified evidence is recorded atomically.
- **Tiếng Việt**: Bảng `evaluations` sở hữu cột `version BIGINT NOT NULL DEFAULT 0` gắn với annotation JPA `@Version private Long version;`. Khi có nhiều yêu cầu submit đồng thời từ một mentor, phiên bản bản ghi thay đổi khiến request thứ hai gặp lỗi `ObjectOptimisticLockingFailureException`, được ánh xạ sang mã lỗi `HTTP 409 CONFLICT` kèm thông điệp tiếng Việt. Chỉ duy nhất một bộ bằng chứng kỹ năng được sinh ra trong CSDL.

### 5.3. Anti N+1 Query Architecture / Triệt Tiêu Truy Vấn N+1

- **English**: `EvaluationRepository` uses `JOIN FETCH` queries (`LEFT JOIN FETCH e.scores s LEFT JOIN FETCH s.criterion`) to load an evaluation and all its nested criteria scores in a single SQL query. To resolve mentor names without triggering individual queries per evaluation, `CandidateEvaluationsService` aggregates unique `mentorId` values and fetches all profiles via `IdentityPublicService.getUsersByIds(Set<Long> ids)` in a single $O(1)$ batch query.
- **Tiếng Việt**: `EvaluationRepository` sử dụng câu lệnh `JOIN FETCH` (`LEFT JOIN FETCH e.scores s LEFT JOIN FETCH s.criterion`) tải toàn bộ phiếu đánh giá cùng danh sách điểm tiêu chí trong 1 câu lệnh SQL duy nhất. Để lấy thông tin hiển thị mentor mà không phát sinh truy vấn N+1 lặp lại, `CandidateEvaluationsService` gom các `mentorId` duy nhất và gọi `IdentityPublicService.getUsersByIds(Set<Long> ids)` theo lô với độ phức tạp $O(1)$.

### 5.4. Known Limits & Follow-ups / Giới Hạn Phạm Vi & Các Bước Kế Tiếp

- **English**:
  1. **Mentor Form Input UI**: The interactive mentor UI for scoring criteria and submitting evaluations is outside the scope of DG-01 and will be delivered in **task DG-04**.
  2. **Automated LMS/PMS Score Sync**: Inbound webhooks and automated event-driven sync from internal learning management systems (`lms-pm`) are designated for **task TT-04**.
  3. **HR Portal Candidate Search UI**: The recruitment portal interface for recruiters to filter and aggregate candidates by mentor ratings is scheduled for future recruitment iterations.
- **Tiếng Việt**:
  1. **Giao diện nhập phiếu cho Mentor**: Màn hình dành cho Mentor để chọn mẫu phiếu, chấm điểm từng tiêu chí và gửi phiếu nằm ngoài phạm vi DG-01 và sẽ được triển khai trong **nhiệm vụ DG-04**.
  2. **Tích hợp đồng bộ điểm từ LMS/PMS**: Cơ chế webhook nhận điểm tự động từ hệ thống quản lý học tập/dự án nội bộ (`lms-pm`) được phân định thuộc về **nhiệm vụ TT-04**.
  3. **Giao diện tìm kiếm hồ sơ phía HR**: Màn hình phía cổng thông tin Doanh nghiệp/HR để lọc và tổng hợp danh sách ứng viên theo đánh giá mentor sẽ được phát triển trong giai đoạn tiếp theo của phân hệ Tuyển dụng.

---

## 6. Frontend Mentor Evaluation Component / Giao Diện Đánh Giá Mentor

The frontend candidate evaluation block is encapsulated in `frontend/src/features/candidate/`:

```text
frontend/src/features/candidate/
├── api/
│   ├── candidateEvaluations.ts         # Central httpClient API caller
│   └── skillProfile.ts
├── components/
│   ├── CandidateEvaluations.tsx        # Container component with safe AuthContext
│   ├── EvaluationCard.tsx              # Card UI with accordion and a11y attributes
│   ├── EvaluationScoreItem.tsx         # Score display with progress bar & badges
│   ├── SkillProfilePage.tsx            # Main candidate profile page (embedded block)
│   └── SkillItem.tsx
├── styles/
│   ├── candidateEvaluations.css        # 100% design tokens, 4 breakpoints, reduced motion
│   └── skillProfile.css
├── __tests__/
│   └── CandidateEvaluations.test.tsx   # Vitest unit test suite (7 tests)
├── types.ts                            # TypeScript interfaces matching backend DTOs
└── index.ts                            # Barrel export file
```

### 6.1. Visual Hierarchy & Anti-AI Design / Phân Cấp Thị Giác & Thiết Kế Chuẩn Mực

- **English**:
  - **100% Design Tokens**: Strictly uses `--rj-*` CSS custom properties (`--rj-color-surface`, `--rj-color-border`, `--rj-color-text`, `--rj-color-action`). Zero hardcoded hex/rgb colors.
  - **Zero Emoji Policy**: Vector icons rendered via `<Icon name="..." size={24} />` (`user-check`, `calendar`, `badge-check`, `briefcase`, `chevron-down`, `refresh`, `spinner`, `alert-circle`).
  - **Interactive Accordion**: Smooth expand/collapse toggle for criteria breakdown with animated chevron (`transform: rotate(180deg)`), `aria-expanded`, and `aria-controls`.
  - **Visual Score Indicators**: Scores rendered in `JetBrains Mono` with `font-variant-numeric: tabular-nums`, a proportional progress bar, and quality badges ("Xuất sắc" $\ge 80$, "Khá" $\ge 65$, "Đạt" $\ge 50$, "Cần cải thiện" $< 50$).
- **Tiếng Việt**:
  - **100% Design Token**: Sử dụng tuyệt đối biến CSS `--rj-*` (`--rj-color-surface`, `--rj-color-border`, `--rj-color-text`, `--rj-color-action`). Không có mã màu hex/rgb hardcode.
  - **Chính sách không Emoji**: Biểu tượng vector hiển thị qua thẻ `<Icon name="..." size={24} />` chuẩn mực (`user-check`, `calendar`, `badge-check`, `briefcase`, `chevron-down`, `refresh`, `spinner`, `alert-circle`).
  - **Accordion tương tác**: Đóng/mở chi tiết tiêu chí mượt mà với chevron xoay (`transform: rotate(180deg)`), hỗ trợ thuộc tính tiếp cận `aria-expanded` và `aria-controls`.
  - **Chỉ báo điểm trực quan**: Điểm số dùng font `JetBrains Mono` với `tabular-nums`, thanh tiến độ tỷ lệ, và huy hiệu xếp loại chất lượng ("Xuất sắc" $\ge 80$, "Khá" $\ge 65$, "Đạt" $\ge 50$, "Cần cải thiện" $< 50$).

### 6.2. Accessibility & Responsive Breakpoints / Khả Năng Tiếp Cận & Điểm Ngắt

- **English**:
  - **WCAG 2.2 AA Conformance**: Text contrast ratio $\ge 4.5:1$, UI controls contrast ratio $\ge 3.0:1$, visible focus outline `3px solid var(--rj-color-focus)`.
  - **Touch Target Size**: All interactive buttons conform to minimum touch target $\ge 44 \times 44\text{px}$.
  - **Motion Budget**: Respects `@media (prefers-reduced-motion: reduce)` overriding animations and transitions to `0.001ms`.
  - **4 Responsive Breakpoints**:
    - `375px` (Mobile): Single-column stacked layout, full-width buttons, zero horizontal scroll ($scrollWidth \le innerWidth$).
    - `768px` (Tablet): Fluid header and 2-column flexibility.
    - `1024px` (Desktop): Symmetrical card layout with generous whitespace.
    - `1440px` (Wide Desktop): Contained maximum width ($1360\text{px}$) with centered alignment.
- **Tiếng Việt**:
  - **Chuẩn tiếp cận WCAG 2.2 AA**: Tỷ lệ tương phản chữ $\ge 4.5:1$, tương phản nút bấm $\ge 3.0:1$, viền focus bàn phím rõ nét `3px solid var(--rj-color-focus)`.
  - **Kích thước vùng chạm**: Toàn bộ nút bấm và vùng tương tác đạt diện tích tối thiểu $\ge 44 \times 44\text{px}$.
  - **Ngân sách chuyển động**: Hỗ trợ chuẩn `@media (prefers-reduced-motion: reduce)`, triệt tiêu hiệu ứng chuyển động xuống `0.001ms` cho người dùng nhạy cảm thị giác.
  - **4 Điểm ngắt đáp ứng**:
    - `375px` (Điện thoại): Bố cục 1 cột xếp chồng, nút bấm co giãn 100%, tuyệt đối không tràn ngang ($scrollWidth \le innerWidth$).
    - `768px` (Máy tính bảng): Tiêu đề linh hoạt, chuyển đổi 2 cột tự nhiên.
    - `1024px` (Máy tính xách tay): Dạng thẻ đối xứng, khoảng cách thoáng đãng.
    - `1440px` (Màn hình lớn): Giới hạn độ rộng tối đa $1360\text{px}$ căn giữa cân đối.

---

## 7. Reviewer Scenarios & Test Verification / 10 Kịch Bản Nghiệm Thu & Kiểm Thử

### 7.1. 10 Step-by-Step Reviewer Scenarios / 10 Kịch Bản Nghiệm Thu Từng Bước

| # | Scenario / Kịch Bản | Actor / Role | Method & Path | Request Payload / Input | Expected Status | Business Verification & Assertions |
|---|---|---|---|---|---|---|
| **1** | **Tạo phiếu nháp thành công** / Create Draft Evaluation | `mentor1@rikkei.edu.vn` (`MENTOR`) | `POST /api/v1/evaluations` | `{"templateId": 1, "userId": 1, "context": "INTERNSHIP"}` | `201 CREATED` | Phiếu tạo ở trạng thái `DRAFT`; `submittedAt` là `null`; `mentorId` khớp ID của mentor1 (`6`). |
| **2** | **Cập nhật điểm nháp** / Update Draft Scores | `mentor1@rikkei.edu.vn` (`MENTOR`) | `PUT /api/v1/evaluations/{id}` | `{"scores": [{"criterionId": 1, "score": 85, "comment": "Tốt"}]}` | `200 OK` | Cập nhật điểm tiêu chí thành công; trạng thái vẫn duy trì `DRAFT`. |
| **3** | **Submit khi thiếu điểm tiêu chí** / Submit with Missing Scores | `mentor1@rikkei.edu.vn` (`MENTOR`) | `POST /api/v1/evaluations/{id}/submit` | Empty `{}` (Mới chỉ nhập 1/4 tiêu chí của mẫu 1) | `400 BAD_REQUEST` | Báo lỗi `EvaluationIncompleteException` ("Chưa đánh giá đủ tất cả các tiêu chí"); không sinh evidence; trạng thái vẫn là `DRAFT`. |
| **4** | **Submit phiếu hợp lệ thành công** / Valid Final Submit | `mentor1@rikkei.edu.vn` (`MENTOR`) | `POST /api/v1/evaluations/{id}/submit` | Empty `{}` (Đã nhập đủ cả 4/4 tiêu chí) | `200 OK` | Trạng thái chuyển sang `SUBMITTED`; `submittedAt` được ghi nhận qua `Clock`; tạo đủ 4 `skill_evidences` (`source = MENTOR`, `verified = true`); gọi `recomputeSkills`. |
| **5** | **Chống sửa đổi phiếu đã nộp** / Prevent Modifying Submitted Evaluation | `mentor1@rikkei.edu.vn` (`MENTOR`) | `PUT /api/v1/evaluations/{id}` | `{"scores": [{"criterionId": 1, "score": 95}]}` (Phiếu đã `SUBMITTED`) | `409 CONFLICT` | Báo lỗi `EvaluationAlreadySubmittedException` ("Phiếu đánh giá đã được gửi, không thể chỉnh sửa"); dữ liệu không bị thay đổi. |
| **6** | **Chống submit đúp đồng thời** / Double Submit Concurrency Protection | `mentor1@rikkei.edu.vn` (`MENTOR`) | `POST /api/v1/evaluations/{id}/submit` (2 luồng gửi cùng mili-giây) | 2 HTTP requests đồng thời trên cùng evaluation ID | 1st `200 OK`<br>2nd `409 CONFLICT` | Khóa lạc quan `@Version` chặn request thứ hai; ném `ObjectOptimisticLockingFailureException` $\rightarrow$ ánh xạ mã lỗi 409; đúng 1 bộ evidence được tạo. |
| **7** | **Chống IDOR phía Mentor** / Mentor IDOR Protection | `mentor2@rikkei.edu.vn` (`MENTOR`) | `PUT /api/v1/evaluations/{id}` hoặc `POST .../submit` | Mentor 2 cố ý sửa/submit phiếu do Mentor 1 tạo | `404 NOT_FOUND` | Trả về mã lỗi 404 (ẩn danh dữ liệu); Mentor 2 không biết phiếu có tồn tại hay không; ngăn chặn xâm phạm dữ liệu chéo. |
| **8** | **Chống IDOR phía Candidate** / Candidate IDOR Protection | `candidate1@rikkei.edu.vn` (`CANDIDATE`) | `GET /api/v1/profiles/2/evaluations` | Candidate 1 (ID 1) cố ý xem phiếu đánh giá của Candidate 2 (ID 2) | `404 NOT_FOUND` | Trả về 404; ứng viên tuyệt đối không thể xem trộm kết quả đánh giá mentor của ứng viên khác. |
| **9** | **Chống IDOR phía HR với Profile Private** / HR IDOR on Private Profile | `hr2@rikkei.edu.vn` (`HR`) | `GET /api/v1/profiles/{privateUserId}/evaluations` | HR tra cứu đánh giá của ứng viên có `is_public = false` | `404 NOT_FOUND` | Trả về 404; HR chỉ được xem khi ứng viên chủ động công khai hồ sơ (`is_public = true`). |
| **10** | **Kiểm tra xác thực & sai vai trò** / Unauthorized & Forbidden Checks | Anonymous / Role sai | `POST /api/v1/evaluations` hoặc `GET .../evaluations` | Không gửi header Bearer Token / hoặc Candidate gọi POST `/evaluations` | Anonymous $\rightarrow$ `401`<br>Sai Role $\rightarrow$ `403` | `SecurityConfig` chặn bắt chuẩn: không token trả về 401 UNAUTHORIZED; Candidate/HR cố tạo phiếu trả về 403 FORBIDDEN. |

---

### 7.2. Independent Test Commands / Lệnh Kiểm Thử Độc Lập

#### Frontend Verification (Vitest, Typecheck, Lint, Build)

```powershell
Set-Location "D:\GitHub\Rikkei\rikkei-jobs\frontend"

# 1. Chạy toàn bộ 19 test files Vitest (115/115 tests PASS GREEN)
npm test -- --run

# 2. Kiểm tra kiểu tĩnh TypeScript nghiêm ngặt (0 errors)
npm run typecheck

# 3. Kiểm tra chuẩn code style ESLint (0 errors)
npm run lint

# 4. Kiểm tra đóng gói build production bundle
npm run build
```

#### Backend Verification on JDK 25 (Unit, Security, Concurrency, Migration)

```powershell
Set-Location "D:\GitHub\Rikkei\rikkei-jobs\backend"

# Chạy toàn bộ 389 kiểm thử backend (bao gồm baseline + DG-01 + V8 mentor2 seed tests)
.\mvnw.cmd clean test
```

#### Opaque-Box E2E Verification (`e2e/`) / Kiểm Thử E2E Hộp Đen (`e2e/`)

The DG-01 E2E coverage runs against a live Docker Compose stack across three tier-aligned suites registered in `e2e/run-all.mjs` (tổng số sau khi bổ sung DG-01: `20` suites / `231` cases / `1139` assertions, tăng từ baseline `17` suites / `221` cases / `998` assertions):

- `e2e/tier1-features/test_evaluation_features.test.mjs` (`4` cases, `58` assertions): Templates (`Java Backend – Thực tập`, `Phỏng vấn kỹ thuật chung`), 5 criteria & skill codes (`JAVA`, `SPRING_BOOT`, `SQL`, `GIT`, `TEAMWORK`), context filtering, `400`/`401`/`403` errors, full happy path (`DRAFT` -> `PUT` -> `submit` -> verified `MENTOR` evidence & `verifiedScore` change), and OpenAPI `/api-docs` 5 endpoints.
- `e2e/tier2-boundaries/test_evaluation_boundaries.test.mjs` (`4` cases, `49` assertions): Missing-score submit (`400`, no state/evidence change), boundary scores (`101`/`-1` -> `400`), `mentor2` cross-mentor IDOR (`404`), `SUBMITTED` update/resubmit (`409`, unchanged evidence count), `candidate2` cross-profile (`404`), candidate `POST /evaluations` (`403`), anonymous (`401`), and HTTP-level simultaneous submit concurrency (`[200, 409]`, single evidence creation).
- `e2e/tier4-scenarios/test_evaluation_scenarios.test.mjs` (`2` cases, `34` assertions): Candidate `SUBMITTED`-only newest-first ordering with `mentor.name`, `context`, `submittedAt`, per-criterion `score` & `comment`, zero `DRAFT` exposure, plus HR (`hr2@rikkeijobs.test`, because `hr1` has `must_change_password = true`) `200` on public `candidate2` vs `404` on private `candidate1` and `candidate3`.

```powershell
Set-Location "D:\GitHub\Rikkei\rikkei-jobs"

# Khởi động fresh stack và chạy toàn bộ 20 suites E2E hai lần liên tiếp
docker compose up -d --build --wait
node e2e/run-all.mjs
node e2e/run-all.mjs
```

#### Mathematical Contrast Verification (WCAG 2.2 AA / AAA)

```powershell
Set-Location "D:\GitHub\Rikkei\rikkei-jobs"

# Kiểm chứng tỷ lệ tương phản 66 cặp màu trong bảng token thiết kế
node scripts/compute-contrast.mjs
```
