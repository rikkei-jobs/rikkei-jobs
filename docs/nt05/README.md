# NT-05 — External Data Sync (`LMS`, `Exam`, `lms-pm`) & HS-01 Reliability Fixes (`T022C02`) / Đồng Bộ Dữ Liệu Ngoài & Sửa Lỗi HS-01

**Task Code / Mã nhiệm vụ**: `T022C02`
**Branch / Nhánh**: `feature/t022c02-ket-noi-du-lieu`
**Proposed PR Title / Tiêu đề PR đề xuất**: `[NT-05] T022C02: sync LMS, exam and lms-pm data as skill evidence`

---

## Part 1: English Section

### 1. Overview & Delivered Scope

Round `NT-05` (`T022C02`) connects the mock external systems (`LMS`, `Exam`, and `lms-pm`) into `candidate.external_records` as the verified evidence pipeline feeding HS-01 (`SkillRecomputeService#recomputeSkills`), adds STAFF operational oversight and manual override workflows (`/staff/data-sync`), and resolves three confirmed defects:

- **H1 (Critical)**: Per-user PostgreSQL transaction-scoped advisory locking (`pg_advisory_xact_lock` via `CandidateSkillLockService`) before the first read/delete across all 5 skill write paths, plus Flyway `V25` partial unique index `uq_skill_evidences_external_record_skill` without constraining `MENTOR` or `SELF` rows.
- **H2 (Concurrency)**: Eliminated `409 CONFLICT` on concurrent first-time `GET /api/v1/profiles/me/internships` via per-user serialization and unified PM upsert (`ExternalRecordNormalizer`).
- **H3 (Frontend)**: `SkillProfilePage.tsx` preserves loaded skills/evidences when recompute fails, displays an inline `role="alert"` banner with a retry button that re-runs recompute, and preserves initial-load error behavior.
- **D1–D11**: Flyway `V25__nt05_external_sync.sql`, unified normalizer/upsert (`LMS`, `EXAM`, `PM`), `syncUser(userId)` (`5s` timeout + `2` network retries on all 3 NT-05 endpoints vs `2.5s` fast-fail preserved for TT-01 reads), `NIGHTLY` scheduled job, bounded non-blocking `ON_OPEN` sync (`rikkei-sync-`), append-only `manual_overrides`, 5 STAFF APIs (`/api/v1/staff/**`), and `/staff/data-sync` UI.

### 2. How to Run

#### 2.1 Full Docker Compose Stack

```bash
cp .env.example .env
docker compose up -d --build --wait
```

- Frontend (Nginx proxy): `http://127.0.0.1:3000` (STAFF Data Sync route: `/staff/data-sync`)
- Backend API & Swagger UI (dev): `http://127.0.0.1:8080/api/docs`
- External Mock: `http://127.0.0.1:9000` (`X-Service-Key: dev-key`)
- PostgreSQL 18.6: `127.0.0.1:5433` (`rikkeijobs`, user `rikkei_app`)

#### 2.2 Standalone Mode

```bash
docker compose up -d postgres mailpit
cd mock && npm install && npm start
cd backend && SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
cd frontend && npm ci && npm run dev
```

### 3. Sample Data (`V2`, `V4`, `mock/data.json`)

All seeded accounts share the development password defined in `V2__dev_seed.sql`.

| Account | Role | `lms_user_id` | Mock Records (`mock/data.json`) | Notes |
|---|---|---|---|---|
| `staff1@rikkeijobs.test` | `STAFF` | `lms-st-001` | N/A | Accesses `/staff/data-sync` and all 5 D10 endpoints |
| `candidate1@rikkeijobs.test` | `CANDIDATE` (`user_id=1`) | `lms-sv-001` | 5 LMS (`JAVA01=8.5`, `SQL01=8.0`, `SPRING01=7.5`, `WEB01=7.0`, `GIT01=9.0`), 1 Exam (`EX-JAVA-2026-10=8.0`), 1 PM (`IOC-JB-2026-09=8.5`, `endDate=2026-10-30`) | Also retains historical `V4` row `1:JAVA01#h2` (`score=60.00`, 500 days old) -> `JAVA=79.07` (`ADVANCED`) |
| `candidate2@rikkeijobs.test` | `CANDIDATE` (`user_id=2`) | `lms-sv-002` | 4 LMS, 1 Exam (`EX-REACT-2026-10`), 0 PM (`[]`) | Public profile (`is_public=true`) |
| `candidate3@rikkeijobs.test` | `CANDIDATE` (`user_id=3`) | `lms-sv-003` | 3 LMS (`JAVA01=5.5`, `SQL01=6.0`, `WEB01=5.0`), 1 Exam (`EX-JAVA-2026-10=4.5`), 0 PM (`[]`) | Private profile (`is_public=false`) |

### 4. Proposed Record to Evidence Mapping (`external_records` -> `skill_evidences`, Pending HS-01 Owner Confirmation)

This table reflects the current development seed (`V4__dev_skill_profile_seed.sql`) and `SkillRecomputeService` behavior as a **proposed mapping awaiting confirmation from the HS-01 owner**. Source scores on `0..10` are normalized (`* 10`, `RoundingMode.HALF_UP` to 2 decimals, clamped `[0.00, 100.00]`).

| Source (`external_records`) | `source_code` | `source_key` Pattern | `skill_evidences.source` | Mapped `skills.code` (Weight) | `recorded_at` Rule |
|---|---|---|---|---|---|
| `LMS` | `JAVA01` | `<userId>:JAVA01` (`#h<id>` for history) | `LMS` | `JAVA` (`0.7`), `OOP` (`0.3`) | New row: `now`; keep while effective score unchanged; `now` on score change |
| `LMS` | `SQL01` | `<userId>:SQL01` | `LMS` | `SQL` (`1.0`) | Same as above |
| `LMS` | `SPRING01` | `<userId>:SPRING01` | `LMS` | `SPRING_BOOT` (`0.7`), `REST_API` (`0.3`) | Same as above |
| `LMS` | `WEB01` | `<userId>:WEB01` | `LMS` | `HTML_CSS` (`0.5`), `JAVASCRIPT` (`0.5`) | Same as above |
| `LMS` | `GIT01` | `<userId>:GIT01` | `LMS` | `GIT` (`0.8`), `TEAMWORK` (`0.2`) | Same as above |
| `LMS` | `REACT01` | `<userId>:REACT01` | `LMS` | `REACTJS` (`0.7`), `JAVASCRIPT` (`0.3`) | Same as above |
| `EXAM` | `EX-JAVA-2026-10` | `<userId>:EX-JAVA-2026-10` | `EXAM` | `JAVA` (`0.8`), `DSA` (`0.2`) | `takenAt` if present; otherwise LMS rule |
| `EXAM` | `EX-REACT-2026-10` | `<userId>:EX-REACT-2026-10` | `EXAM` | `REACTJS` (`1.0`) | `takenAt` if present; otherwise LMS rule |
| `PM` | `IOC-JB-2026-09` | `<userId>:IOC-JB-2026-09` | `INTERNSHIP` | `JAVA` (`0.3`), `SPRING_BOOT` (`0.3`), `TEAMWORK` (`0.2`), `AGILE` (`0.2`) | `endDate` at `00:00` `Asia/Ho_Chi_Minh`; if absent, LMS rule |

### 5. Manual Override, On-Open & TT-01 Source Data Semantics

- **Override Wins (Q6 Resolution / D9)**: `PUT /api/v1/staff/external-records/{id}/override` appends an immutable row to `manual_overrides` (`record_id`, `field`, `value`, `reason`, `staff_id`, `created_at`). The latest override per `(record_id, field)` immediately updates `external_records.payload` (and `title`/`score` when affected) and triggers `recomputeSkills(userId)` under the per-user lock.
- **Preservation Across Re-Sync**: Both NT-05 (`ExternalSyncService#syncUser`) and TT-01 (`InternshipSyncServiceImpl` -> `CandidatePublicServiceImpl#recordPmInternshipResults`) store the raw upstream source JSON object (`payload`), read all overrides for the record, and preserve every overridden field while updating only non-overridden fields.
- **Source-Scale Validation**: Allowed fields are `LMS` (`score` `0..10` max 2 decimals, `attendanceRate` `0..100` max 2 decimals, `homeworkRate` `0..100` max 2 decimals, `rpoint` integer `>= 0`, `subjectName` non-blank `<= 255`), `EXAM` (`score` `0..10` max 2 decimals), and `PM` (`finalScore` `0..10` max 2 decimals, `topicName` non-blank `<= 255`). `reason` is required, non-blank, and `<= 500` characters; `reason` permits line breaks (`\n`, `\r\n`) and tabs (`\t`) while rejecting NUL (`\u0000`), lone `\r`, and all other ISO control characters, whereas `subjectName` and `topicName` continue to reject all ISO control characters. Excess decimals, extreme scientific notation (both string values and raw JSON numbers such as `{"value":1e-100000}` via `ManualOverrideValueDeserializer`), and non-canonical historical PM rows (`source_key` containing `#h`) are rejected with `400 VALIDATION_ERROR` and a Vietnamese message without storing anything.
- **TT-01 Internship Page Note**: The TT-01 internship page (`GET /api/v1/profiles/me/internships`) continues to read and display the `internship` module's own `internships` and `internship_tasks` tables; candidate `manual_overrides` affect HS-01 `external_records` / `skill_evidences` / `skill_scores`, not `internship` module tables.
- **On-Open Sync (D8)**: `GET /api/v1/profiles/me/skills` triggers an asynchronous background sync on bounded executor `rikkei-sync-` only when the candidate has a non-blank `lms_user_id` and either has no `sync_runs` row or the latest run (any status, any trigger) started more than 1 hour ago. Candidates lacking `lms_user_id` return immediately without submitting a background task or logging a warning, and the HTTP response never blocks on the mock.

### 6. Verification Demos for Reviewers & Mentors

#### 6.1 Manual Nightly Job Trigger (`APP_SYNC_NIGHTLY_CRON`)

Recreate only the `backend` container with a near-future cron expression (for example every minute at `:00`):

```bash
APP_SYNC_NIGHTLY_CRON="0 * * * * *" docker compose up -d --no-deps --force-recreate backend
# Wait for the next :00 boundary, then inspect NIGHTLY runs:
docker exec rikkei-postgres psql -U rikkei_app -d rikkeijobs -c \
  "SELECT id, trigger, user_id, status, started_at, finished_at FROM sync_runs WHERE trigger = 'NIGHTLY' ORDER BY id DESC LIMIT 10;"
# Restore default 01:00 Asia/Ho_Chi_Minh schedule:
docker compose up -d --no-deps --force-recreate backend
```

#### 6.2 Safe Mock Score Change (Keeping `mock/data.json` Clean)

Never edit `mock/data.json` in the repository directly. Edit an OS temp copy, copy it into the `mock` container (`node` user), and call `POST /mock/reload`:

```bash
cp mock/data.json /tmp/mock-data-demo.json
# Update lmsResults["lms-sv-001"][0].score (JAVA01) from 8.5 to 10.0 in /tmp/mock-data-demo.json
docker compose cp /tmp/mock-data-demo.json mock:/app/data.json
curl -s -X POST http://127.0.0.1:9000/mock/reload -H "X-Service-Key: dev-key"
# Trigger "Đồng bộ lại" in /staff/data-sync or POST /api/v1/staff/sync/1 -> JAVA 79.07 -> 83.95, OOP 76.67 -> 86.67
# Restore original mock data and remove temp file:
docker compose cp mock/data.json mock:/app/data.json
curl -s -X POST http://127.0.0.1:9000/mock/reload -H "X-Service-Key: dev-key"
rm -f /tmp/mock-data-demo.json
```

#### 6.3 Mock-Down Failure Isolation Demo

```bash
docker compose stop mock
# Trigger sync for candidate1 (UI "Đồng bộ lại" or POST /api/v1/staff/sync/1):
# -> HTTP 503 {"code":"EXTERNAL_UNAVAILABLE","message":"..."}
# -> sync_runs records a FAILED row with sanitized error (<= 500 chars, no secrets/PII)
# -> external_records, skill_evidences, and skill_scores remain identical to pre-sync state
docker compose start mock
```

### 7. Out of Scope & Production Caveat (§7)

- Real external partner systems, `DG-03` configurable weighting, candidate "report wrong evidence" workflow, removing manual overrides, and `sync_runs` retention policies are out of scope for `NT-05`.
- **Production `skill_mappings` Note**: `skill_mappings` is seeded only in `V4__dev_skill_profile_seed.sql` (`dev` profile). Production migrations (`V1..V25`) intentionally contain no `skill_mappings` seed; therefore, production environments will sync `external_records` cleanly but will not produce verified skills until skill mapping administration or a production mapping seed is delivered.

---

## Part 2: Vietnamese Section / Bản dịch Tiếng Việt

### 1. Tổng Quan & Phạm Vi Bàn Giao

Vòng `NT-05` (`T022C02`) kết nối các hệ thống giả lập ngoài (`LMS`, `Exam`, `lms-pm`) vào bảng `candidate.external_records` làm nguồn bằng chứng xác thực cho HS-01 (`SkillRecomputeService#recomputeSkills`), bổ sung luồng vận hành và sửa tay cho `STAFF` (`/staff/data-sync`), đồng thời khắc phục triệt để 3 lỗi đã xác nhận:

- **H1 (Nghiêm trọng)**: Khóa tư vấn PostgreSQL theo từng ứng viên ở phạm vi giao dịch (`pg_advisory_xact_lock` qua `CandidateSkillLockService`) trước thao tác đọc/xóa đầu tiên trên cả 5 luồng ghi kỹ năng, kết hợp chỉ mục duy nhất bán phần `uq_skill_evidences_external_record_skill` trong `V25` mà không ràng buộc bằng chứng `MENTOR` hay `SELF`.
- **H2 (Đồng thời)**: Chấm dứt lỗi `409 CONFLICT` khi gọi song song lần đầu `GET /api/v1/profiles/me/internships` nhờ tuần tự hóa theo ứng viên và bộ chuẩn hóa/upsert PM thống nhất (`ExternalRecordNormalizer`).
- **H3 (Frontend)**: `SkillProfilePage.tsx` giữ nguyên danh sách kỹ năng và bằng chứng đã tải khi tính lại điểm thất bại, hiển thị thông báo nội tuyến `role="alert"` kèm nút thử lại gọi trực tiếp `recomputeMySkills()`, và giữ nguyên hành vi lỗi khi tải trang lần đầu.
- **D1–D11**: Flyway `V25__nt05_external_sync.sql`, bộ chuẩn hóa/upsert dùng chung (`LMS`, `EXAM`, `PM`), `syncUser(userId)` (timeout `5 giây` + `2` lần thử lại lỗi mạng trên cả 3 endpoint NT-05, giữ `2.5 giây` fast-fail riêng cho luồng đọc TT-01), job đêm `NIGHTLY`, đồng bộ nền khi mở hồ sơ `ON_OPEN` (`rikkei-sync-`), lịch sử sửa tay nối tiếp `manual_overrides`, 5 API `STAFF` (`/api/v1/staff/**`) và màn hình `/staff/data-sync`.

### 2. Hướng Dẫn Khởi Chạy

#### 2.1 Chạy Đầy Đủ Với Docker Compose

```bash
cp .env.example .env
docker compose up -d --build --wait
```

- Frontend (Nginx proxy): `http://127.0.0.1:3000` (Màn hình STAFF Đồng bộ dữ liệu: `/staff/data-sync`)
- Backend API & Swagger UI (`dev`): `http://127.0.0.1:8080/api/docs`
- External Mock: `http://127.0.0.1:9000` (`X-Service-Key: dev-key`)
- PostgreSQL 18.6: `127.0.0.1:5433` (`rikkeijobs`, user `rikkei_app`)

#### 2.2 Chạy Độc Lập Từng Thành Phần

```bash
docker compose up -d postgres mailpit
cd mock && npm install && npm start
cd backend && SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
cd frontend && npm ci && npm run dev
```

### 3. Dữ Liệu Mẫu (`V2`, `V4`, `mock/data.json`)

Tất cả tài khoản mẫu dùng chung mật khẩu môi trường phát triển khai báo tại `V2__dev_seed.sql`.

| Tài khoản | Vai trò | `lms_user_id` | Dữ liệu Mock (`mock/data.json`) | Ghi chú |
|---|---|---|---|---|
| `staff1@rikkeijobs.test` | `STAFF` | `lms-st-001` | Không áp dụng | Truy cập `/staff/data-sync` và cả 5 API D10 |
| `candidate1@rikkeijobs.test` | `CANDIDATE` (`user_id=1`) | `lms-sv-001` | 5 LMS (`JAVA01=8.5`, `SQL01=8.0`, `SPRING01=7.5`, `WEB01=7.0`, `GIT01=9.0`), 1 Exam (`EX-JAVA-2026-10=8.0`), 1 PM (`IOC-JB-2026-09=8.5`, `endDate=2026-10-30`) | Giữ bản ghi lịch sử `V4` `1:JAVA01#h2` (`60.00`, 500 ngày trước) -> `JAVA=79.07` (Tốt) |
| `candidate2@rikkeijobs.test` | `CANDIDATE` (`user_id=2`) | `lms-sv-002` | 4 LMS, 1 Exam (`EX-REACT-2026-10`), 0 PM (`[]`) | Hồ sơ công khai (`is_public=true`) |
| `candidate3@rikkeijobs.test` | `CANDIDATE` (`user_id=3`) | `lms-sv-003` | 3 LMS (`JAVA01=5.5`, `SQL01=6.0`, `WEB01=5.0`), 1 Exam (`EX-JAVA-2026-10=4.5`), 0 PM (`[]`) | Hồ sơ riêng tư (`is_public=false`) |

### 4. Bảng Ánh Xạ Đề Xuất `external_records` -> `skill_evidences` (Chờ Chủ HS-01 Xác Nhận)

Bảng ánh xạ dưới đây phản ánh dữ liệu seed dev hiện tại (`V4__dev_skill_profile_seed.sql`) và logic của `SkillRecomputeService`, hiện là **phương án đề xuất đang chờ chủ sở hữu HS-01 xác nhận chính thức**. Thang điểm nguồn `0..10` được chuẩn hóa (`* 10`, làm tròn `RoundingMode.HALF_UP` 2 chữ số thập phân, kẹp `[0.00, 100.00]`).

| Nguồn (`external_records`) | `source_code` | Mẫu `source_key` | `skill_evidences.source` | Kỹ năng ánh xạ `skills.code` (Trọng số) | Quy tắc `recorded_at` |
|---|---|---|---|---|---|
| `LMS` | `JAVA01` | `<userId>:JAVA01` (`#h<id>` cho lịch sử) | `LMS` | `JAVA` (`0.7`), `OOP` (`0.3`) | Bản ghi mới: `now`; điểm hiệu lực không đổi: giữ nguyên; đổi điểm: `now` |
| `LMS` | `SQL01` | `<userId>:SQL01` | `LMS` | `SQL` (`1.0`) | Như trên |
| `LMS` | `SPRING01` | `<userId>:SPRING01` | `LMS` | `SPRING_BOOT` (`0.7`), `REST_API` (`0.3`) | Như trên |
| `LMS` | `WEB01` | `<userId>:WEB01` | `LMS` | `HTML_CSS` (`0.5`), `JAVASCRIPT` (`0.5`) | Như trên |
| `LMS` | `GIT01` | `<userId>:GIT01` | `LMS` | `GIT` (`0.8`), `TEAMWORK` (`0.2`) | Như trên |
| `LMS` | `REACT01` | `<userId>:REACT01` | `LMS` | `REACTJS` (`0.7`), `JAVASCRIPT` (`0.3`) | Như trên |
| `EXAM` | `EX-JAVA-2026-10` | `<userId>:EX-JAVA-2026-10` | `EXAM` | `JAVA` (`0.8`), `DSA` (`0.2`) | Dùng `takenAt` nếu có; nếu thiếu dùng quy tắc LMS |
| `EXAM` | `EX-REACT-2026-10` | `<userId>:EX-REACT-2026-10` | `EXAM` | `REACTJS` (`1.0`) | Dùng `takenAt` nếu có; nếu thiếu dùng quy tắc LMS |
| `PM` | `IOC-JB-2026-09` | `<userId>:IOC-JB-2026-09` | `INTERNSHIP` | `JAVA` (`0.3`), `SPRING_BOOT` (`0.3`), `TEAMWORK` (`0.2`), `AGILE` (`0.2`) | `00:00` ngày `endDate` theo `Asia/Ho_Chi_Minh`; nếu thiếu dùng quy tắc LMS |

### 5. Ngữ Nghĩa Sửa Tay (`manual_overrides`), `ON_OPEN` & Dữ Liệu Thực Tập TT-01

- **Sửa tay thắng khi đồng bộ (Chốt Câu hỏi Mở số 6 / D9)**: `PUT /api/v1/staff/external-records/{id}/override` chèn một dòng bất biến vào `manual_overrides` (`record_id`, `field`, `value`, `reason`, `staff_id`, `created_at`). Giá trị hiệu lực là bản ghi mới nhất theo `(record_id, field)`, được ghi ngay vào `external_records.payload` (và `title`/`score` khi liên quan) rồi chạy `recomputeSkills(userId)` dưới khóa theo ứng viên.
- **Bảo toàn qua các lần đồng bộ sau**: Cả NT-05 (`ExternalSyncService#syncUser`) và TT-01 (`InternshipSyncServiceImpl` -> `CandidatePublicServiceImpl#recordPmInternshipResults`) đều lưu nguyên vẹn object JSON nguồn (`payload`), đọc lịch sử sửa tay, giữ nguyên mọi trường đã sửa tay và chỉ cập nhật các trường chưa sửa tay.
- **Kiểm tra hợp lệ theo thang nguồn**: Các trường hợp lệ gồm `LMS` (`score` `0..10` tối đa 2 chữ số thập phân, `attendanceRate` `0..100` tối đa 2 chữ số thập phân, `homeworkRate` `0..100` tối đa 2 chữ số thập phân, `rpoint` số nguyên `>= 0`, `subjectName` khác rỗng `<= 255`), `EXAM` (`score` `0..10` tối đa 2 chữ số thập phân), và `PM` (`finalScore` `0..10` tối đa 2 chữ số thập phân, `topicName` khác rỗng `<= 255`). Trường `reason` bắt buộc khác rỗng và `<= 500` ký tự; `reason` cho phép xuống dòng (`\n`, `\r\n`) và tab (`\t`), đồng thời từ chối NUL (`\u0000`), `\r` đơn lẻ và mọi ký tự điều khiển ISO khác, trong khi `subjectName` và `topicName` tiếp tục từ chối toàn bộ ký tự điều khiển ISO. Số thập phân quá 2 chữ số, ký hiệu khoa học vượt ngưỡng (kể cả số JSON thô như `{"value":1e-100000}` thông qua `ManualOverrideValueDeserializer`), và bản ghi PM lịch sử không chính tắc (`source_key` chứa `#h`) đều bị từ chối với `400 VALIDATION_ERROR` kèm thông báo tiếng Việt mà không lưu dữ liệu (trên UI đồng thời khóa nút sửa bản ghi `#h`).
- **Lưu ý màn hình thực tập TT-01**: Màn hình thực tập TT-01 (`GET /api/v1/profiles/me/internships`) vẫn đọc và hiển thị dữ liệu từ hai bảng nguồn của module `internship` (`internships` và `internship_tasks`), không bị thay đổi bởi `manual_overrides`.
- **Đồng bộ khi mở hồ sơ (D8)**: `GET /api/v1/profiles/me/skills` gửi tác vụ nền trên executor giới hạn `rikkei-sync-` chỉ khi ứng viên đã gắn `lms_user_id` hợp lệ và chưa có dòng `sync_runs` nào hoặc lần chạy gần nhất (bất kể trạng thái/trigger) bắt đầu quá 1 giờ trước, bảo đảm không chặn phản hồi HTTP. Ứng viên chưa có `lms_user_id` sẽ bỏ qua ngay mà không tạo tác vụ nền hay ghi log cảnh báo.

### 6. Hướng Dẫn Thử Nghiệm Cho Reviewer & Mentor

#### 6.1 Chạy Tay Job Đêm (`APP_SYNC_NIGHTLY_CRON`)

Khởi tạo lại riêng container `backend` với lịch cron gần (ví dụ mỗi phút tại giây `:00`):

```bash
APP_SYNC_NIGHTLY_CRON="0 * * * * *" docker compose up -d --no-deps --force-recreate backend
# Chờ qua mốc :00 kế tiếp rồi kiểm tra bảng sync_runs:
docker exec rikkei-postgres psql -U rikkei_app -d rikkeijobs -c \
  "SELECT id, trigger, user_id, status, started_at, finished_at FROM sync_runs WHERE trigger = 'NIGHTLY' ORDER BY id DESC LIMIT 10;"
# Khôi phục lịch mặc định 01:00 Asia/Ho_Chi_Minh:
docker compose up -d --no-deps --force-recreate backend
```

#### 6.2 Đổi Điểm Mock An Toàn (Không Sửa `mock/data.json` Trong Repo)

Sao chép `mock/data.json` ra thư mục tạm của hệ điều hành, chỉnh sửa bản tạm, chép vào container `mock` (đang chạy dưới user `node`) và gọi `POST /mock/reload`:

```bash
cp mock/data.json /tmp/mock-data-demo.json
# Sửa lmsResults["lms-sv-001"][0].score (JAVA01) từ 8.5 thành 10.0 trong /tmp/mock-data-demo.json
docker compose cp /tmp/mock-data-demo.json mock:/app/data.json
curl -s -X POST http://127.0.0.1:9000/mock/reload -H "X-Service-Key: dev-key"
# Bấm "Đồng bộ lại" trên /staff/data-sync hoặc gọi POST /api/v1/staff/sync/1 -> JAVA 79.07 -> 83.95, OOP 76.67 -> 86.67
# Khôi phục dữ liệu mock gốc và xóa tệp tạm:
docker compose cp mock/data.json mock:/app/data.json
curl -s -X POST http://127.0.0.1:9000/mock/reload -H "X-Service-Key: dev-key"
rm -f /tmp/mock-data-demo.json
```

#### 6.3 Demo Tắt Mock (`503 EXTERNAL_UNAVAILABLE` & Dữ Liệu Cũ Còn Nguyên)

```bash
docker compose stop mock
# Kích hoạt đồng bộ cho candidate1 (nút "Đồng bộ lại" hoặc POST /api/v1/staff/sync/1):
# -> HTTP 503 {"code":"EXTERNAL_UNAVAILABLE","message":"..."}
# -> sync_runs ghi 1 dòng FAILED kèm thông báo lỗi đã làm sạch (<= 500 ký tự, không lộ khóa/PII)
# -> Dữ liệu cũ trong external_records, skill_evidences, skill_scores giữ nguyên hoàn toàn
docker compose start mock
```

### 7. Ngoài Phạm Vi & Lưu Ý Môi Trường Production (§7)

- Hệ thống ngoài thật, trọng số `DG-03`, luồng ứng viên báo sai bằng chứng, chức năng xóa sửa tay và chính sách dọn dẹp `sync_runs` nằm ngoài phạm vi vòng `NT-05`.
- **Lưu ý bảng `skill_mappings` trên production**: Bảng `skill_mappings` hiện chỉ có dữ liệu seed trong `V4__dev_skill_profile_seed.sql` (profile `dev`). Các migration production (`V1..V25`) chủ đích không seed `skill_mappings`; vì vậy ở môi trường production, đồng bộ vẫn lưu `external_records` đầy đủ nhưng chưa tạo ra kỹ năng đã xác thực cho tới khi có màn quản trị mapping hoặc migration seed mapping production được phê duyệt.
