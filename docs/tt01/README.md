# `[TT-01]` IOC Internship Sync Technical Guide - Tài Liệu Kỹ Thuật Đồng Bộ Thực Tập IOC (`T0239F9`)

**Task Code / Mã nhiệm vụ**: `T0239F9`
**Feature / Phân hệ**: `[TT-01]` IOC Internship Sync to Profile (Đồng bộ kết quả thực tập IOC từ `lms-pm` vào hồ sơ ứng viên)
**Branch / Nhánh**: `feature/t0239f9-thuc-tap` (base: `origin/develop`)
**Stack / Công nghệ**: Java 25 LTS, Spring Boot 4.1.2, PostgreSQL 18.6, Flyway 12.4.0, React 19.3.1, TypeScript 6.0.3, Nginx 1.30.6

---

## 1. Executive Summary / Tổng Quan Tính Năng

### 1.1. English

Task `TT-01` (`T0239F9`) synchronizes IOC internship batches and accepted tasks from `lms-pm` (served by the `mock` service until `NT-05` integrates the live PM system) into Rikkei Jobs (`internships` and `internship_tasks`), updates verified `INTERNSHIP` skill evidence idempotently in `candidate`, exposes candidate/HR read APIs, and renders the `/candidate/internships` page inside the `NT-02` shell.

- **Resilient Sync-on-Read (`D6`)**: `GET /api/v1/profiles/me/internships` fetches PM data outside `@Transactional` with fast-fail bounds (`<= 2.5 s`, `0` retries), persists in a separate transactional bean (`InternshipPersistenceService`), falls back to `200 OK` stale stored rows (with a single PII-free `WARN` log) on PM outage, or returns `503 EXTERNAL_UNAVAILABLE` when no stored batches exist.
- **Stored-Only Profile Read & RBAC/IDOR (`D5`)**: `GET /api/v1/profiles/{userId}/internships` never calls PM or writes to DB, validates `userId > 0`, and enforces `OwnershipGuard` across all 5 roles (`200`, `400`, `401`, `403`, `404`).
- **Idempotent Skill Evidence (`D7`)**: `CandidatePublicService#recordPmInternshipResults` performs an idempotent upsert on `external_records` by `(user_id, ExternalSource.PM, batchId)`, merging cleanly with the `V4` seed row, scaling `finalScore * 10` (`HALF_UP` to 2 decimals, clamped `[0.00, 100.00]`), and calling `SkillRecomputeService#recomputeSkills`.

### 1.2. Tiếng Việt

Nhiệm vụ `TT-01` (`T0239F9`) thực hiện đồng bộ đợt thực tập IOC và các task đã nghiệm thu từ `lms-pm` (hiện qua dịch vụ `mock` trong khi chờ `NT-05`) vào Rikkei Jobs (`internships` và `internship_tasks`), cập nhật bất biến bằng chứng kỹ năng nguồn `INTERNSHIP` trong module `candidate`, cung cấp các endpoint cho ứng viên/HR và hiển thị trang `/candidate/internships` trong khung giao diện `NT-02`.

- **Đồng bộ bền vững khi đọc (`D6`)**: `GET /api/v1/profiles/me/internships` gọi PM bên ngoài `@Transactional` với cấu hình fast-fail (`<= 2.5 giây`, `0` retry), ghi DB qua bean giao dịch riêng (`InternshipPersistenceService`), trả `200 OK` với dữ liệu cũ (kèm 1 dòng log `WARN` không PII/bí mật) khi PM gián đoạn, hoặc trả `503 EXTERNAL_UNAVAILABLE` nếu chưa có dữ liệu lưu.
- **Đọc dữ liệu đã lưu & Phân quyền/Chống IDOR (`D5`)**: `GET /api/v1/profiles/{userId}/internships` chỉ đọc DB (không gọi PM, không ghi), kiểm tra `userId > 0` và áp dụng `OwnershipGuard` cho cả 5 vai trò (`200`, `400`, `401`, `403`, `404`).
- **Tính bất biến của bằng chứng kỹ năng (`D7`)**: `CandidatePublicService#recordPmInternshipResults` thực hiện upsert `external_records` theo khóa `(user_id, ExternalSource.PM, batchId)`, gộp sạch với dữ liệu seed `V4`, quy đổi `finalScore * 10` (`HALF_UP` 2 chữ số thập phân, kẹp `[0.00, 100.00]`) và kích hoạt `SkillRecomputeService#recomputeSkills`.

---

## 2. How to Run & Sample Data / Hướng Dẫn Chạy & Dữ Liệu Mẫu

### 2.1. English

1. Prepare `.env` from `.env.example` (never commit `.env`), boot the full 5-service stack with `docker compose up -d --build --wait`, and tear down with `docker compose down -v` after verification.
2. Log in via LMS SSO through the mock service:
   - Issue a ticket for `lms-sv-001` (`candidate1@rikkeijobs.test`, user `id = 1`, `is_public = false`) or `lms-sv-002` (`candidate2@rikkeijobs.test`, user `id = 2`, `is_public = true`) via `POST http://127.0.0.1:9000/lms/sso/tickets` with header `X-Service-Key` matching the `EXTERNAL_SERVICE_KEY` value configured in your local `.env` (initialized from `.env.example`).
   - Exchange the ticket via `POST http://127.0.0.1:8080/api/v1/auth/sso` (or click LMS SSO in the frontend login screen at `http://127.0.0.1:3000/login`).
   - Other seeded roles (`hr1@rikkeijobs.test`, `hr2@rikkeijobs.test`, `mentor1@rikkeijobs.test`, `staff1@rikkeijobs.test`, `admin1@rikkeijobs.test`) are seeded in `V2__dev_seed.sql` (refer to `README.md` and `docs/nt02/README.md` for dev seed details).
3. Service URLs:
   - Frontend (Nginx): `http://127.0.0.1:3000` (Candidate route: `/candidate/internships`)
   - Backend API: `http://127.0.0.1:8080/api/v1`
   - OpenAPI Spec & Swagger UI (`dev` only): `http://127.0.0.1:8080/api/api-docs` and `http://127.0.0.1:3000/api/docs`
   - Mock LMS/PM Service: `http://127.0.0.1:9000`
4. Sample Data (`mock/data.json` & `V4__dev_skill_profile_seed.sql`):
   - `lms-sv-001`: 1 batch `IOC-JB-2026-09` (`IOC Java Backend 09/2026`, `Nhóm 2`, topic `Hệ thống đặt lịch phòng họp`, mentor `mentor1@rikkeijobs.test`, `2026-09-07` to `2026-10-30`, `finalScore: 8.5`) and 3 accepted tasks (`API đặt phòng và kiểm trùng lịch` `9`, `Phân quyền quản trị phòng` `8`, `Báo cáo tần suất sử dụng phòng` `8.5`).
   - `V4` skill mapping for `('PM', 'IOC-JB-2026-09')`: `JAVA` (`0.3`), `SPRING_BOOT` (`0.3`), `TEAMWORK` (`0.2`), `AGILE` (`0.2`), plus one pre-seeded `external_records` row `(1, 'PM', 'IOC-JB-2026-09', 'IOC Java Backend 09/2026', 85)` that merges into `'Hệ thống đặt lịch phòng họp'` on sync without duplication.
   - `lms-sv-002` and `lms-sv-003`: `[]` (empty state).

### 2.2. Tiếng Việt

1. Chuẩn bị `.env` từ `.env.example` (tuyệt đối không commit `.env`), khởi động đủ 5 dịch vụ bằng `docker compose up -d --build --wait`, và dọn sạch sau kiểm thử bằng `docker compose down -v`.
2. Đăng nhập qua LMS SSO thông qua dịch vụ mock:
   - Cấp vé cho `lms-sv-001` (`candidate1@rikkeijobs.test`, user `id = 1`, `is_public = false`) hoặc `lms-sv-002` (`candidate2@rikkeijobs.test`, user `id = 2`, `is_public = true`) qua `POST http://127.0.0.1:9000/lms/sso/tickets` kèm header `X-Service-Key` khớp giá trị `EXTERNAL_SERVICE_KEY` đã cấu hình trong `.env` cục bộ (khởi tạo từ `.env.example`).
   - Đổi vé qua `POST http://127.0.0.1:8080/api/v1/auth/sso` (hoặc đăng nhập trên giao diện tại `http://127.0.0.1:3000/login`).
   - Các tài khoản vai trò khác (`hr1`, `hr2`, `mentor1`, `staff1`, `admin1`) được khởi tạo trong `V2__dev_seed.sql` (xem `README.md` và `docs/nt02/README.md`).
3. Danh sách URL:
   - Giao diện Frontend (Nginx): `http://127.0.0.1:3000` (Tuyến ứng viên: `/candidate/internships`)
   - Backend API: `http://127.0.0.1:8080/api/v1`
   - OpenAPI Spec & Swagger UI (chỉ bật ở `dev`): `http://127.0.0.1:8080/api/api-docs` và `http://127.0.0.1:3000/api/docs`
   - Dịch vụ giả lập Mock LMS/PM: `http://127.0.0.1:9000`
4. Dữ liệu mẫu (`mock/data.json` & `V4__dev_skill_profile_seed.sql`):
   - `lms-sv-001`: 1 đợt `IOC-JB-2026-09` (`IOC Java Backend 09/2026`, `Nhóm 2`, đề tài `Hệ thống đặt lịch phòng họp`, mentor `mentor1@rikkeijobs.test`, `2026-09-07` đến `2026-10-30`, `finalScore: 8.5`) và 3 task đã nghiệm thu (`API đặt phòng và kiểm trùng lịch` `9`, `Phân quyền quản trị phòng` `8`, `Báo cáo tần suất sử dụng phòng` `8.5`).
   - Ánh xạ kỹ năng `V4` cho `('PM', 'IOC-JB-2026-09')`: `JAVA` (`0.3`), `SPRING_BOOT` (`0.3`), `TEAMWORK` (`0.2`), `AGILE` (`0.2`), cùng 1 bản ghi `external_records` khởi tạo sẵn `(1, 'PM', 'IOC-JB-2026-09', 'IOC Java Backend 09/2026', 85)` sẽ được cập nhật gộp thành `'Hệ thống đặt lịch phòng họp'` khi đồng bộ mà không tạo bản sao.
   - `lms-sv-002` và `lms-sv-003`: `[]` (trạng thái rỗng).

---

## 3. Endpoint Contract & RBAC Matrix / Hợp Đồng Endpoint & Ma Trận Phân Quyền

### 3.1. English

| Endpoint | Role / Caller | Response | Behavior |
|---|---|---|---|
| `GET /api/v1/profiles/me/internships` | `CANDIDATE` (active) | `200 OK` | Triggers fast-fail PM sync and returns `List<InternshipResponse>`; returns stale DB rows (`200`) on PM outage or `503` if empty |
| `GET /api/v1/profiles/me/internships` | `HR` / `MENTOR` / `STAFF` / `ADMIN` | `403 FORBIDDEN` | Unified `ErrorResponse` (`MUST_CHANGE_PASSWORD` if `hr1` password unchanged) |
| `GET /api/v1/profiles/me/internships` | Anonymous | `401 UNAUTHORIZED` | Unified `ErrorResponse` |
| `GET /api/v1/profiles/{userId}/internships` | `CANDIDATE` (self) | `200 OK` | Stored DB read only (no PM call, no DB writes) |
| `GET /api/v1/profiles/{userId}/internships` | `CANDIDATE` (other or missing) | `404 NOT_FOUND` | Byte-identical `ErrorResponse` (`OwnershipGuard`) |
| `GET /api/v1/profiles/{userId}/internships` | `HR` (`is_public = true`) | `200 OK` | Stored DB read only |
| `GET /api/v1/profiles/{userId}/internships` | `HR` (`is_public = false` or missing) | `404 NOT_FOUND` | Byte-identical `ErrorResponse` |
| `GET /api/v1/profiles/{userId}/internships` | `CANDIDATE` / `HR` (`userId <= 0` or non-numeric) | `400 VALIDATION_ERROR` | Unified `ErrorResponse` |
| `GET /api/v1/profiles/{userId}/internships` | `MENTOR` / `STAFF` / `ADMIN` | `403 FORBIDDEN` | Unified `ErrorResponse` |
| `GET /api/v1/profiles/{userId}/internships` | Anonymous | `401 UNAUTHORIZED` | Unified `ErrorResponse` |

**DTO Schema & Nullability (`InternshipResponse` & `InternshipTaskResponse`)**:

- `InternshipResponse`: `id` (`number`), `batchId` (`string`), `batchName` (`string | null`), `groupName` (`string | null`), `topicName` (`string | null`), `mentorEmail` (`string | null`), `startDate` (`YYYY-MM-DD | null`), `endDate` (`YYYY-MM-DD | null`), `finalScore` (`number | null`), `syncedAt` (ISO-8601 `OffsetDateTime`), `tasks` (`InternshipTaskResponse[]`).
- `InternshipTaskResponse`: `id` (`number`), `title` (`string`), `acceptedScore` (`number | null`), `acceptedAt` (ISO-8601 `OffsetDateTime | null`).
- Error body: `ErrorResponse` `{ "code": "<ERROR_CODE>", "message": "<Vietnamese message>" }`.

### 3.2. Tiếng Việt

| Endpoint | Vai trò / Người gọi | Mã phản hồi | Hành vi |
|---|---|---|---|
| `GET /api/v1/profiles/me/internships` | `CANDIDATE` (hoạt động) | `200 OK` | Đồng bộ PM fast-fail và trả `List<InternshipResponse>`; trả dữ liệu cũ (`200`) khi PM lỗi hoặc `503` nếu rỗng |
| `GET /api/v1/profiles/me/internships` | `HR` / `MENTOR` / `STAFF` / `ADMIN` | `403 FORBIDDEN` | `ErrorResponse` thống nhất (`MUST_CHANGE_PASSWORD` nếu `hr1` chưa đổi mật khẩu) |
| `GET /api/v1/profiles/me/internships` | Ẩn danh | `401 UNAUTHORIZED` | `ErrorResponse` thống nhất |
| `GET /api/v1/profiles/{userId}/internships` | `CANDIDATE` (chính mình) | `200 OK` | Chỉ đọc DB đã lưu (không gọi PM, không ghi DB) |
| `GET /api/v1/profiles/{userId}/internships` | `CANDIDATE` (ID khác hoặc không tồn tại) | `404 NOT_FOUND` | `ErrorResponse` giống hệt từng byte (`OwnershipGuard`) |
| `GET /api/v1/profiles/{userId}/internships` | `HR` (`is_public = true`) | `200 OK` | Chỉ đọc DB đã lưu |
| `GET /api/v1/profiles/{userId}/internships` | `HR` (`is_public = false` hoặc không tồn tại) | `404 NOT_FOUND` | `ErrorResponse` giống hệt từng byte |
| `GET /api/v1/profiles/{userId}/internships` | `CANDIDATE` / `HR` (`userId <= 0` hoặc sai kiểu) | `400 VALIDATION_ERROR` | `ErrorResponse` thống nhất |
| `GET /api/v1/profiles/{userId}/internships` | `MENTOR` / `STAFF` / `ADMIN` | `403 FORBIDDEN` | `ErrorResponse` thống nhất |
| `GET /api/v1/profiles/{userId}/internships` | Ẩn danh | `401 UNAUTHORIZED` | `ErrorResponse` thống nhất |

**Cấu trúc DTO & Khả năng Null (`InternshipResponse` & `InternshipTaskResponse`)**:

- `InternshipResponse`: `id` (`number`), `batchId` (`string`), `batchName` (`string | null`), `groupName` (`string | null`), `topicName` (`string | null`), `mentorEmail` (`string | null`), `startDate` (`YYYY-MM-DD | null`), `endDate` (`YYYY-MM-DD | null`), `finalScore` (`number | null`), `syncedAt` (ISO-8601 `OffsetDateTime`), `tasks` (`InternshipTaskResponse[]`).
- `InternshipTaskResponse`: `id` (`number`), `title` (`string`), `acceptedScore` (`number | null`), `acceptedAt` (ISO-8601 `OffsetDateTime | null`).
- Thân lỗi chuẩn: `ErrorResponse` `{ "code": "<ERROR_CODE>", "message": "<Thông báo tiếng Việt>" }`.

---

## 4. Sync Semantics, Resilience & Idempotency / Cơ Chế Đồng Bộ, Chịu Lỗi & Bất Biến

### 4.1. English

- **Fast-Fail Outside `@Transactional` (`D6`)**: `InternshipSyncServiceImpl` executes `ExternalApiClient#getStudentInternshipsFastFail(lmsUserId)` with timeout `min(2500 ms, external.api.timeout-seconds * 1000 ms)` (`<= 2.5 s`) and `0` retries outside any database transaction (existing callers keep their default `5 s` timeout and `2` retries).
- **Bean Split & No N+1**: Transactional persistence runs in a separate Spring bean (`InternshipPersistenceServiceImpl#saveSyncedInternships`, `@Transactional(rollbackFor = Exception.class)`). Reads use `@Transactional(readOnly = true)` with `@EntityGraph(attributePaths = "tasks")` so `open-in-view: false` never hits `LazyInitializationException` or N+1 queries.
- **Graceful Degradation**: On `ExternalUnavailableException`, `ExternalResourceNotFoundException`, or `InvalidServiceKeyException` during `/me/internships`, if stored batches exist, `InternshipServiceImpl` logs exactly 1 PII-free `WARN` line (`userId` and cached count) and returns `200 OK` with stored data; if empty, it throws `503 EXTERNAL_UNAVAILABLE`.
- **Idempotency, Score Normalization & Local Retention (`D7`)**:
  - `internships` deduplicates on `(user_id, batch_id)`; `internship_tasks` deduplicates on `(internship_id, title)` (blank task titles skipped).
  - `CandidatePublicServiceImpl#recordPmInternshipResults` performs an idempotent upsert on `external_records` strictly by `(candidateUserId, ExternalSource.PM, batchId)`, seamlessly updating the `V4` seed row without duplicates.
  - Null `finalScore` or blank `topicName` entries are skipped for `external_records` (while `finalScore = 0` is valid). Non-null scores compute `finalScore * 10` with `RoundingMode.HALF_UP` (2 decimals), clamped to `[0.00, 100.00]`, followed by `SkillRecomputeService#recomputeSkills`.
  - **Local Retention Policy**: Previously synced batches and tasks omitted from a later PM response are retained locally so historical internship records and verified skill evidence are never silently deleted.

### 4.2. Tiếng Việt

- **Fast-Fail ngoài `@Transactional` (`D6`)**: `InternshipSyncServiceImpl` gọi `ExternalApiClient#getStudentInternshipsFastFail(lmsUserId)` với timeout `min(2500 ms, external.api.timeout-seconds * 1000 ms)` (`<= 2.5 giây`) và `0` retry bên ngoài mọi giao dịch CSDL (các caller hiện hữu khác vẫn giữ `5 giây` và `2` retry).
- **Tách Bean & Tránh N+1**: Việc ghi CSDL chạy trong bean riêng (`InternshipPersistenceServiceImpl#saveSyncedInternships`, `@Transactional(rollbackFor = Exception.class)`). Lệnh đọc dùng `@Transactional(readOnly = true)` kèm `@EntityGraph(attributePaths = "tasks")` để tránh `LazyInitializationException` và truy vấn N+1 khi `open-in-view: false`.
- **Xử lý suy giảm khi PM lỗi**: Khi `/me/internships` gặp `ExternalUnavailableException`, `ExternalResourceNotFoundException` hoặc `InvalidServiceKeyException`, nếu đã có dữ liệu lưu, `InternshipServiceImpl` ghi đúng 1 dòng `WARN` không chứa PII/bí mật (`userId` và số lượng bản ghi) rồi trả `200 OK`; nếu chưa có dữ liệu, trả `503 EXTERNAL_UNAVAILABLE`.
- **Tính bất biến, Chuẩn hóa điểm & Chính sách giữ lịch sử (`D7`)**:
  - `internships` chống trùng theo `(user_id, batch_id)`; `internship_tasks` chống trùng theo `(internship_id, title)` (bỏ qua task có `title` rỗng).
  - `CandidatePublicServiceImpl#recordPmInternshipResults` upsert `external_records` theo đúng khóa `(candidateUserId, ExternalSource.PM, batchId)`, cập nhật đè lên dòng seed `V4` mà không tạo bản sao.
  - Bỏ qua ghi `external_records` nếu `finalScore` null hoặc `topicName` rỗng (`finalScore = 0` vẫn hợp lệ). Điểm hợp lệ được nhân `10`, làm tròn `RoundingMode.HALF_UP` (2 chữ số) và kẹp trong `[0.00, 100.00]`, sau đó gọi `SkillRecomputeService#recomputeSkills`.
  - **Chính sách giữ dữ liệu cục bộ**: Các đợt hoặc task đã đồng bộ trước đó nhưng bị lược bỏ trong phản hồi PM về sau vẫn được giữ nguyên trong CSDL để không làm mất lịch sử thực tập và bằng chứng kỹ năng đã xác thực.

---

## 5. Cross-Module Contract & Flyway Migration V15 / Hợp Đồng Liên Module & Migration V15

### 5.1. English

- **Cross-Module Interfaces (`D4`)**:
  - `IdentityPublicService`: `existsById(Long userId)` and `findLmsUserIdByUserId(Long userId)` returning `Optional<String>`.
  - `CandidatePublicService`: `isProfilePublic(Long candidateUserId)` and `recordPmInternshipResults(Long candidateUserId, List<PmInternshipResultCommand> results)` using `PmInternshipResultCommand(String batchId, String topicName, BigDecimal finalScore)`.
  - Zero imports from other modules' `model` or `repository` packages inside `com.rikkei.jobs.internship`.
- **Migration `V15__create_internships_and_internship_tasks.sql` (`D8`)**:
  - `internships`: scalar `user_id BIGINT NOT NULL` (no FK to `users`), `synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `CONSTRAINT uq_internships_user_batch UNIQUE (user_id, batch_id)`, index `idx_internships_user_id`.
  - `internship_tasks`: `accepted_at TIMESTAMPTZ`, `CONSTRAINT fk_internship_tasks_internship FOREIGN KEY (internship_id) REFERENCES internships (id) ON DELETE CASCADE`, `CONSTRAINT uq_internship_tasks_internship_title UNIQUE (internship_id, title)`, index `idx_internship_tasks_internship_id`.
  - **Migration Numbering**: `8` odd production DDL migrations (`V1, V3, V5, V7, V9, V11, V13, V15`), `7` even dev seed migrations (`V2, V4, V6, V8, V10, V12, V14`), `15` total (`V3`, `V4`, `V7`, `V8` restored byte-for-byte to `origin/develop`).

### 5.2. Tiếng Việt

- **Hợp đồng liên module (`D4`)**:
  - `IdentityPublicService`: `existsById(Long userId)` và `findLmsUserIdByUserId(Long userId)` trả về `Optional<String>`.
  - `CandidatePublicService`: `isProfilePublic(Long candidateUserId)` và `recordPmInternshipResults(Long candidateUserId, List<PmInternshipResultCommand> results)` qua bản ghi `PmInternshipResultCommand(String batchId, String topicName, BigDecimal finalScore)`.
  - Tuyệt đối không import package `model` hoặc `repository` của module khác bên trong `com.rikkei.jobs.internship`.
- **Migration `V15__create_internships_and_internship_tasks.sql` (`D8`)**:
  - `internships`: cột `user_id BIGINT NOT NULL` vô hướng (không khóa ngoại tới `users`), `synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `CONSTRAINT uq_internships_user_batch UNIQUE (user_id, batch_id)`, chỉ mục `idx_internships_user_id`.
  - `internship_tasks`: `accepted_at TIMESTAMPTZ`, `CONSTRAINT fk_internship_tasks_internship FOREIGN KEY (internship_id) REFERENCES internships (id) ON DELETE CASCADE`, `CONSTRAINT uq_internship_tasks_internship_title UNIQUE (internship_id, title)`, chỉ mục `idx_internship_tasks_internship_id`.
  - **Đánh số Migration**: `8` file DDL production số lẻ (`V1, V3, V5, V7, V9, V11, V13, V15`), `7` file seed dev số chẵn (`V2, V4, V6, V8, V10, V12, V14`), tổng cộng `15` file (`V3`, `V4`, `V7`, `V8` được khôi phục khớp từng byte với `origin/develop`).

---

## 6. Frontend Integration, Blocked Items & Verification / Tích Hợp Frontend, Hạng Mục Bị Chặn & Kiểm Định

### 6.1. English

- **Frontend (`D10`)**:
  - Registered `/candidate/internships` (`CANDIDATE` only) in `frontend/src/features/identity/config/routePolicies.ts` and added sidebar item `"Thực tập IOC"` (icon `graduation-cap`) in `roleMenuConfig.ts`.
  - `CandidateHomePage.tsx` remains identical to `origin/develop`; `CandidateInternshipsPage.tsx` renders inside `RoleHomeLayout` (`roleTitle="Ứng viên"`) with a single `<h1>`, `tabular-nums` score cells, `vi-VN` date formatting, `"Chưa có điểm"` for null `finalScore`/`acceptedScore`, and token-based CSS (`0` raw colors, `0` emoji).
- **Blocked Items**:
  - **Portfolio `source=IOC` (`HS-03`)**: No `portfolios` table, entity, or service exists in `origin/develop`; creating a `Portfolio` project per internship batch is documented as blocked by `HS-03`.
  - **External PM Integration (`NT-05`)**: Production `lms-pm` integration is pending `NT-05`; `TT-01` calls the `mock` service through `ExternalApiClient#getStudentInternshipsFastFail`.
  - **Runtime PM Score-Mutation Mock Tool**: `mock/server.js` exposes only the 5 `/mock/*` administrative tools documented in `docs/mock-contract.md` Section 5 and has no PM internship score-mutation endpoint; score-update idempotency is verified hermetically in backend unit/integration tests (`InternshipSyncServiceTest`, `CandidatePublicServiceInternshipTest`, `InternshipControllerIntegrationTest`).
- **E2E & Quality Gates**:
  - `e2e/tier1-features/test_internships.test.mjs` is registered in `e2e/run-all.mjs` under Tier 1, bringing total E2E suites to `27`.

### 6.2. Tiếng Việt

- **Frontend (`D10`)**:
  - Đã đăng ký tuyến `/candidate/internships` (chỉ `CANDIDATE`) trong `frontend/src/features/identity/config/routePolicies.ts` và thêm mục thanh bên `"Thực tập IOC"` (biểu tượng `graduation-cap`) trong `roleMenuConfig.ts`.
  - `CandidateHomePage.tsx` giữ nguyên giống `origin/develop`; `CandidateInternshipsPage.tsx` hiển thị trong `RoleHomeLayout` (`roleTitle="Ứng viên"`) với đúng 1 thẻ `<h1>`, chữ số dạng bảng `tabular-nums`, định dạng ngày `vi-VN`, hiển thị `"Chưa có điểm"` khi điểm `null` và CSS dùng hoàn toàn design token (`0` mã màu thô, `0` emoji).
- **Các hạng mục bị chặn / phụ thuộc**:
  - **Portfolio `source=IOC` (`HS-03`)**: Nhánh `origin/develop` chưa có bảng, entity hay service `portfolios`; yêu cầu tạo bản ghi Portfolio cho mỗi đợt thực tập được ghi nhận là bị chặn bởi `HS-03`.
  - **Tích hợp `lms-pm` thật (`NT-05`)**: Phụ thuộc `NT-05`; `TT-01` gọi dịch vụ `mock` thông qua `ExternalApiClient#getStudentInternshipsFastFail`.
  - **Công cụ Mock sửa điểm PM runtime**: `mock/server.js` chỉ có 5 công cụ `/mock/*` trong Mục 5 của `docs/mock-contract.md`, không có endpoint đổi điểm thực tập PM trên RAM; tính bất biến khi đổi điểm được kiểm chứng cô lập trong test backend (`InternshipSyncServiceTest`, `CandidatePublicServiceInternshipTest`, `InternshipControllerIntegrationTest`).
- **E2E & Cổng chất lượng**:
  - Đã đăng ký `e2e/tier1-features/test_internships.test.mjs` vào Tier 1 trong `e2e/run-all.mjs`, nâng tổng số suite E2E lên `27`.
