# `[UT-01]` Candidate CV Application & Status Tracking Technical Guide - Tài Liệu Kỹ Thuật Ứng Tuyển & Theo Dõi Trạng Thái (`T023552`)

**Task Code / Mã nhiệm vụ**: `T023552`
**Feature / Phân hệ**: `[UT-01]` Candidate CV Application & Application Status Tracking (with HR Read-Only Views)
**Branch / Nhánh**: `feature/T023552-candidate-application` (base: `origin/develop @ eb75201`)
**Stack / Công nghệ**: Java 25 LTS, Spring Boot 4.1.2, PostgreSQL 18.6, Flyway 12.4.0, React 19.3.1, TypeScript 6.0.3, Vite 8.3.7, Nginx 1.30.6, Mailpit v1.33.1

---

## 1. Executive Summary & Scope / Tổng Quan Tính Năng & Phạm Vi

### 1.1. English

Round `UT-01` (`T023552`) delivers candidate job application submission (with immutable CV PDF snapshot capture), candidate application tracking (`"Ứng tuyển của tôi"`), candidate withdrawal before `OFFER`, post-commit asynchronous HR email notification via Spring Mail + Mailpit, and HR read-only application/snapshot views on top of the `develop` modular monolith and `NT-02` shell.

- **Strictly In Scope**: `recruitment` module (`MOD-06`), minimal public service additions in `identity` (`IdentityPublicService#findActiveHrRecipientsByCompanyId`) and `company` (`JobQueryService`), `RoutePolicyRegistry` + `AsyncConfig`, forward migrations (`V17`, `V19`, `V20`), `frontend/src/features/recruitment` + `httpClient.requestBlob` + candidate/shell wiring, and `e2e/tier1-features/test_applications.test.mjs`.
- **Strictly Out of Scope**:
  - `HS-04` (CV upload/storage/management `/api/v1/me/cvs`): Isolated behind `recruitment`-owned `CvPort` (`@ConditionalOnMissingBean` placeholder returning `503 CV_SERVICE_UNAVAILABLE` until `HS-04` merges in Phase 2).
  - `DN-04` (Staff/HR JD authoring & approval): Uses existing `jobs` (`V11`) via `JobQueryService`; PR #13 duplicate JD endpoints/entities removed.
  - `UT-02` (HR status transitions): Removed `PATCH /api/v1/hr/jobs/{jobId}/applications/{applicationId}/status`; `UT-01` keeps the 7-status state machine and HR read-only endpoints.

### 1.2. Tiếng Việt

Vòng `UT-01` (`T023552`) hoàn thiện tính năng ứng tuyển việc làm bằng CV (kèm đóng băng bản PDF snapshot bất biến), theo dõi đơn ứng tuyển (`"Ứng tuyển của tôi"`), rút hồ sơ trước bước `OFFER`, gửi email thông báo bất đồng bộ tới HR qua Spring Mail + Mailpit sau khi commit, và các API xem chỉ-đọc cho HR trên nền tảng Modular Monolith `develop` cùng shell `NT-02`.

- **Trong phạm vi**: Module `recruitment` (`MOD-06`), phần mở rộng tối thiểu ở public service của `identity` (`IdentityPublicService#findActiveHrRecipientsByCompanyId`) và `company` (`JobQueryService`), `RoutePolicyRegistry` + `AsyncConfig`, migration tiến `V17`, `V19`, `V20`, `frontend/src/features/recruitment` + `httpClient.requestBlob` + nối tuyến ứng viên/shell, và `e2e/tier1-features/test_applications.test.mjs`.
- **Ngoài phạm vi (loại trừ nghiêm ngặt)**:
  - `HS-04` (lưu trữ/tải lên/quản lý CV `/api/v1/me/cvs`): Cô lập sau cổng `CvPort` thuộc `recruitment` (bean `@ConditionalOnMissingBean` trả `503 CV_SERVICE_UNAVAILABLE` cho tới Phase 2).
  - `DN-04` (tạo/duyệt JD): Đọc trực tiếp bảng `jobs` (`V11`) qua `JobQueryService`; đã gỡ bỏ mã JD trùng lặp từ PR `#13`.
  - `UT-02` (HR chuyển trạng thái đơn): Gỡ bỏ `PATCH .../status`; `UT-01` giữ máy trạng thái 7 bước và các endpoint xem chỉ-đọc cho HR.

---

## 2. Architecture, Status Machine & Apply Sequence / Kiến Trúc, Máy Trạng Thái & Luồng Nộp Đơn

### 2.1. English

- **7-Status Lifecycle (`ApplicationStatus.java`)**:
  - Linear progression: `SUBMITTED` (`Đã gửi`) -> `SCREENING` (`Sàng lọc`) -> `INTERVIEW` (`Phỏng vấn`) -> `OFFER` (`Đề nghị nhận việc`) -> `HIRED` (`Nhận việc`).
  - `REJECTED` (`Không đạt`): Allowed from any pre-`HIRED` state (`SUBMITTED`, `SCREENING`, `INTERVIEW`, `OFFER`).
  - `WITHDRAWN` (`Đã rút`): Candidate self-withdrawal allowed ONLY from `SUBMITTED`, `SCREENING`, `INTERVIEW` (`canWithdraw() == true`). Blocked from `OFFER` onward (`409 CANNOT_WITHDRAW`).
  - **Open vs Terminal**: `OPEN_STATUSES = { SUBMITTED, SCREENING, INTERVIEW, OFFER }` (enforced by DB partial unique index `uq_applications_active_job_user`). Terminal statuses (`HIRED`, `REJECTED`, `WITHDRAWN`) allow re-applying to the same JD.
- **Apply Sequence (`F1`–`F9`)**:
  1. **Non-TX Eligibility (`JobVerificationClient`)**: Calls `JobQueryService#findJobForApplication(jobId)`, requires `status = "APPROVED"` and `deadline.isAfter(OffsetDateTime.now(clock))` (`400 JOB_NOT_ELIGIBLE` on missing, non-`APPROVED`, expired, or exact `deadline == now` boundary).
  2. **Non-TX Duplicate Pre-Check**: Rejects an existing open application (`409 DUPLICATE_APPLICATION`) before touching `CvPort`.
  3. **Non-TX Snapshot Capture (`CvSnapshotService`)**: Invokes `CvPort#getOwnedCvForApplication(cvId, candidateUserId)` outside any DB transaction, validates `application/pdf`, `%PDF-` header, size `1..5,242,880` bytes (5 MiB), and computes SHA-256 hex.
  4. **Single Short Atomic Transaction (`ApplicationPersistenceTxService`)**: Annotated `@Transactional(rollbackFor = Exception.class)`. Re-checks open duplicate + translates SQL state `23505` to `409 DUPLICATE_APPLICATION`; allocates `id` from `applications_id_seq` (`GenerationType.SEQUENCE`, `allocationSize = 1`) so `@PrePersist` sets `cvSnapshotUrl = "/api/v1/me/applications/" + id + "/cv-snapshot"` in a **single INSERT** (no `"pending"` placeholder rewrite); persists `ApplicationCvSnapshot`, initial `ApplicationStatusHistory` (`null -> SUBMITTED`), and publishes `ApplicationSubmittedEvent`.
  5. **Post-Commit Async HR Mail (`HrNotificationListener`)**: Runs at `TransactionPhase.AFTER_COMMIT` on bounded `notificationTaskExecutor` (`corePoolSize=2`, `maxPoolSize=4`, `queueCapacity=100`, `threadNamePrefix="rikkei-async-"`, discard rejection with PII-free `WARN`). Queries `IdentityPublicService#findActiveHrRecipientsByCompanyId(companyId)`, skips with PII-free `WARN` if empty (zero hard-coded fallback), strips CR/LF from subject, escapes HTML, and never rolls back the committed application on mail failure (errors logged once without PII).
- **Concurrency & Snapshot Immutability (`F5`, `F6`)**:
  - `@Version` optimistic locking on `Application` mapped to `409 CONFLICT` by `GlobalExceptionHandler`.
  - `application_cv_snapshots` stores immutable `BYTEA` PDF with DB `CHECK` constraints (`content_type = 'application/pdf'`, `file_size` 1..5 MiB, `sha256` 64-hex, `octet_length(file_data) = file_size`), served with `Content-Type: application/pdf`, sanitized `Content-Disposition: attachment`, `Cache-Control: no-store, no-cache, must-revalidate`, and `X-Content-Type-Options: nosniff`.

### 2.2. Tiếng Việt

- **Máy 7 trạng thái (`ApplicationStatus.java`)**:
  - Chuỗi chính: `SUBMITTED` (`Đã gửi`) -> `SCREENING` (`Sàng lọc`) -> `INTERVIEW` (`Phỏng vấn`) -> `OFFER` (`Đề nghị nhận việc`) -> `HIRED` (`Nhận việc`).
  - `REJECTED` (`Không đạt`): Cho phép từ mọi bước trước `HIRED` (`SUBMITTED`, `SCREENING`, `INTERVIEW`, `OFFER`).
  - `WITHDRAWN` (`Đã rút`): Ứng viên chỉ được tự rút khi ở `SUBMITTED`, `SCREENING`, `INTERVIEW` (`canWithdraw() == true`); từ `OFFER` trở đi bị chặn (`409 CANNOT_WITHDRAW`).
  - **Đơn mở vs Kết thúc**: `OPEN_STATUSES = { SUBMITTED, SCREENING, INTERVIEW, OFFER }` (bảo vệ bởi partial unique index `uq_applications_active_job_user`). Sau các trạng thái kết thúc (`HIRED`, `REJECTED`, `WITHDRAWN`), ứng viên có thể nộp lại vào cùng JD.
- **Trình tự nộp đơn (`F1`–`F9`)**:
  1. **Kiểm tra JD ngoài giao dịch (`JobVerificationClient`)**: Gọi `JobQueryService#findJobForApplication(jobId)`, bắt buộc `APPROVED` và `deadline > now(clock)` (`400 JOB_NOT_ELIGIBLE` nếu thiếu, chưa duyệt, hết hạn hoặc đúng thời điểm `deadline == now`).
  2. **Kiểm tra trùng đơn mở ngoài giao dịch**: Nếu đã có đơn mở -> `409 DUPLICATE_APPLICATION` trước khi gọi `CvPort`.
  3. **Chụp PDF snapshot ngoài giao dịch (`CvSnapshotService`)**: Gọi `CvPort#getOwnedCvForApplication(cvId, candidateUserId)`, kiểm tra `application/pdf`, header `%PDF-`, dung lượng `1..5,242,880` byte (5 MiB) và tính SHA-256.
  4. **Một giao dịch nguyên tử ngắn (`ApplicationPersistenceTxService`)**: `@Transactional(rollbackFor = Exception.class)` kiểm tra lại trùng đơn + bắt SQL state `23505` -> `409`; cấp `id` từ `applications_id_seq` (`GenerationType.SEQUENCE`, `allocationSize = 1`) để `@PrePersist` tạo `cvSnapshotUrl` ngay trong **một lệnh `INSERT` duy nhất**; lưu `ApplicationCvSnapshot`, ghi mốc `ApplicationStatusHistory` đầu tiên (`null -> SUBMITTED`) và phát `ApplicationSubmittedEvent`.
  5. **Gửi email HR bất đồng bộ sau commit (`HrNotificationListener`)**: Chạy tại `TransactionPhase.AFTER_COMMIT` trên `notificationTaskExecutor` giới hạn (`core=2`, `max=4`, `queue=100`, tiền tố `"rikkei-async-"`). Lấy danh sách HR từ `IdentityPublicService#findActiveHrRecipientsByCompanyId(companyId)`, cảnh báo không PII và bỏ qua nếu công ty chưa có HR, làm sạch CR/LF tiêu đề, thoát HTML và tuyệt đối không làm hỏng giao dịch đơn đã lưu khi mail lỗi.
- **Đồng thời & Bất biến Snapshot (`F5`, `F6`)**: Khóa lạc quan `@Version` trên `Application` (`409 CONFLICT`); bảng `application_cv_snapshots` bảo toàn PDF `BYTEA` kèm ràng buộc `CHECK` mức DB và header tải xuống an toàn.

---

## 3. REST Endpoint Contract & RBAC Matrix / Hợp Đồng Endpoint & Ma Trận Phân Quyền

### 3.1. English

| Endpoint | Caller / Role | Status & Behavior |
|---|---|---|
| `POST /api/v1/jobs/{id}/apply` | `CANDIDATE` | `201 Created` (`ApplicationDetailResponse`); `400 VALIDATION_ERROR` / `JOB_NOT_ELIGIBLE`; `404 NOT_FOUND` (unowned/missing CV); `409 DUPLICATE_APPLICATION`; `503 CV_SERVICE_UNAVAILABLE` |
| `GET /api/v1/me/applications?status=&page=1&size=20` | `CANDIDATE` | `200 OK` (`PageResponse<ApplicationSummaryResponse>`, `page>=1`, `size 1..100`, batch-fetched job summaries — zero N+1); `400` on unknown `status` or `size>100` |
| `GET /api/v1/me/applications/{id}` | `CANDIDATE` | `200 OK` (`ApplicationDetailResponse` with chronological history) if owner; `404 NOT_FOUND` on other candidate or missing ID (`OwnershipGuard`) |
| `POST /api/v1/me/applications/{id}/withdraw` | `CANDIDATE` | `200 OK` (`ApplicationDetailResponse`, `WITHDRAWN`, new history row); `400` blank/`>500` reason; `404` non-owner; `409 CANNOT_WITHDRAW` / `CONFLICT` |
| `GET /api/v1/me/applications/{id}/cv-snapshot` | `CANDIDATE` | `200 OK` (`application/pdf` stream + `attachment` + `no-store` + `nosniff`) if owner; `404 NOT_FOUND` otherwise |
| `GET /api/v1/hr/jobs/{jobId}/applications?status=&page=1&size=20` | `HR` (own company) | `200 OK` (`PageResponse<HrApplicationSummaryResponse>`); `404 NOT_FOUND` if job belongs to another company or is missing |
| `GET /api/v1/hr/jobs/{jobId}/applications/{applicationId}` | `HR` (own company) | `200 OK` (`ApplicationDetailResponse`); `404 NOT_FOUND` on cross-company or job/application mismatch |
| `GET /api/v1/hr/jobs/{jobId}/applications/{applicationId}/cv-snapshot` | `HR` (own company) | `200 OK` (`application/pdf` stream); `404 NOT_FOUND` on cross-company or mismatch |
| All 8 endpoints above | Anonymous / Cross-role (`HR` on candidate, `CANDIDATE` on HR, `MENTOR`/`STAFF`/`ADMIN`) / `hr1` (`mustChangePassword`) | `401 UNAUTHORIZED` / `403 FORBIDDEN` / `403 MUST_CHANGE_PASSWORD` (strictly enforced by `RoutePolicyRegistry` + `@PreAuthorize`) |

### 3.2. Tiếng Việt

- **5 endpoint cho `CANDIDATE`**: `POST /api/v1/jobs/{id}/apply` (`201`/`400`/`404`/`409`/`503`), `GET /api/v1/me/applications` (phân trang `page>=1`, mặc định `20`, tối đa `100`, nạp batch tiêu đề JD chống N+1), `GET /api/v1/me/applications/{id}`, `POST /api/v1/me/applications/{id}/withdraw` (lý do bắt buộc `<= 500` ký tự, chặn từ `OFFER` -> `409 CANNOT_WITHDRAW`), và `GET /api/v1/me/applications/{id}/cv-snapshot` (`application/pdf`).
- **3 endpoint xem chỉ-đọc cho `HR`**: `GET /api/v1/hr/jobs/{jobId}/applications`, `/{applicationId}`, `/{applicationId}/cv-snapshot` — chỉ trả dữ liệu khi JD thuộc `principal.getCompanyId()`, trả `404 NOT_FOUND` giống hệt từng byte nếu khác công ty (IDOR).
- **Ma trận bảo mật**: Ẩn danh -> `401 UNAUTHORIZED`; sai vai trò -> `403 FORBIDDEN`; `hr1` chưa đổi mật khẩu -> `403 MUST_CHANGE_PASSWORD`; lỗi chuẩn `ErrorResponse { "code", "message" }`.

---

## 4. Migrations (`V17`, `V19`, `V20`) & Sample Data / Migration & Dữ Liệu Mẫu

### 4.1. English

- **Immutable Baseline (`V1..V15`)**: All `8` odd production DDL files (`V1, 3, 5, 7, 9, 11, 13, 15`) and `7` even dev seeds (`V2, 4, 6, 8, 10, 12, 14`) are **15/15 SHA-256 identical** to `origin/develop`. PR #13 colliding files (`V3..V9` and `V3.1, V6.1, V8.1`) were deleted.
- **Forward Migrations (Option A, `sqlfluff 4.5.0` clean)**:
  - `db/migration/V17__create_recruitment_applications.sql` (prod): `applications` (`version BIGINT DEFAULT 0`, `TIMESTAMPTZ`, partial unique index `uq_applications_active_job_user`, 3 composite B-Tree indexes) + `application_status_history` (`ON DELETE CASCADE`).
  - `db/migration/V19__create_application_cv_snapshots.sql` (prod): `application_cv_snapshots` (`BYTEA`, `CHECK` on `application/pdf`, `1..5 MiB`, 64-hex `sha256`, `octet_length(file_data) = file_size`).
  - `db/migration-dev/V20__dev_recruitment_seed.sql` (dev): Uses `V20` (rather than `V16`) because Flyway sorts `db/migration` + `db/migration-dev` together (`15 -> 17 -> 19 -> 20`). Totals: `10` prod migrations, `18` dev migrations.
- **Seeded Accounts & Data (`V2`, `V12`, `V20`)**:
  - `candidate1@rikkeijobs.test` (`lms-sv-001`, `user_id = 1`): `7` applications (`id = 1..7`) covering all 7 statuses (`SUBMITTED`..`WITHDRAWN`), `20` history entries, and `7` 594-byte `%PDF-1.4` snapshots (`sample-candidate-cv.pdf`, SHA-256 `9b71184ae956dd96864598cc8abfffb29bcf23c9bff28aff431fd779ac564782`).
  - `candidate2@rikkeijobs.test` (`lms-sv-002`, `user_id = 2`): `0` applications (empty state).
  - `hr2@rikkeijobs.test` (`company_id = 2`, `Test@123`): Owns `job_id = 2, 8` (and expired `job_id = 12`, `deadline = 2024-01-01`). `hr1@rikkeijobs.test` (`company_id = 1`, `Test@123`) has `must_change_password = true`. `mentor1`, `staff1`, `admin1` receive `403`.

### 4.2. Tiếng Việt

- **Bảo toàn nền `V1..V15`**: Toàn bộ `15/15` tệp migration trên `origin/develop` giữ nguyên `SHA-256` 100%; xóa toàn bộ các migration trùng số từ PR `#13`.
- **Migration tiến (`sqlfluff 4.5.0` sạch 0 lỗi)**: `V17` (tạo `applications` và `application_status_history`), `V19` (tạo `application_cv_snapshots`), và `V20` (dữ liệu seed dev chạy sau `V17`/`V19`, tổng `10` file prod và `18` file dev).
- **Dữ liệu mẫu**: `candidate1` (`lms-sv-001`) có `7` đơn (`id=1..7`) đủ cả 7 trạng thái, `20` mốc lịch sử và `7` bản PDF snapshot 594 byte; `candidate2` (`lms-sv-002`) có `0` đơn; `hr2` (`company_id=2`) xem được đơn `1` & `2` và bị `404` với công ty `1`; `job_id=12` hết hạn từ `2024-01-01`.

---

## 5. Frontend Slice & Phase 1 `CvPort` Contract / Giao Diện Frontend & Hợp Đồng `CvPort`

### 5.1. English

- **Feature Slice (`frontend/src/features/recruitment`)**: Rebuilt on `develop`'s `shared/api/httpClient.ts` (extended with `requestBlob` for authenticated PDF snapshot download) and `AuthContext`. Deleted legacy `shared/auth/*`, `shared/api/http.ts`, and `AuthenticationPanel*`.
- **Routes & Wiring**: Lazy-loaded `/candidate/applications` (`CANDIDATE` only) in `App.tsx` and `routePolicies.ts`; enabled sidebar item `"Ứng tuyển"` in `roleMenuConfig.ts`; enabled `"Ứng tuyển"` buttons on job cards (`JobRecommendationsSection.tsx`) and `JobDetailPanel.tsx`.
- **HS-04 `CvPort` & Frontend Contract**:
  - Backend: `CvPort#getOwnedCvForApplication(Long cvId, Long candidateUserId)` -> `CvSnapshotPayload`. Phase 1 `@ConditionalOnMissingBean` throws `503 CV_SERVICE_UNAVAILABLE`; `InMemoryCvPortTestDouble` covers `404` and snapshot immutability in unit/integration tests.
  - Frontend: `recruitmentApi.fetchCandidateCvs` calls `GET /api/v1/me/cvs`, mapping `403`/`404`/`501`–`504`/`CV_SERVICE_UNAVAILABLE`/network unavailability to `'unavailable'` UI banner (`"Dịch vụ quản lý CV hiện chưa sẵn sàng"` + `"Tính năng chọn và tải lên CV đang được hoàn thiện. Bạn vui lòng thử lại sau."` + `"Thử lại"`), distinct from `[]` (`"Bạn chưa có CV nào"`) and `401` session expiration.
- **UI/UX, Motion & A11y**: Uses `DESIGN_SYSTEM.md` tokens (`0` raw colors), `<Icon />` (`0` emojis), `tabular-nums`, authentic Vietnamese with full diacritics, compositor-only animations within Rule 09 budgets (`<= 150ms` hover, `<= 300ms` dialog, `<= 800ms` stagger/stepper once per navigation, `prefers-reduced-motion` static fallback), focus trap, `Escape` focus return, `>= 44px` targets, and `CLS = 0`.

### 5.2. Tiếng Việt

- **Kiến trúc Slice**: Xây dựng lại `frontend/src/features/recruitment` trên `httpClient.ts` (bổ sung `requestBlob` tải PDF) và `AuthContext`; xóa mã cũ `shared/auth/*`, `shared/api/http.ts`. Mở tuyến `/candidate/applications` (lazy-load), kích hoạt mục `"Ứng tuyển"` trên sidebar và nút `"Ứng tuyển"` trên thẻ việc làm / `JobDetailPanel`.
- **Hợp đồng `CvPort` Phase 1 -> Phase 2**: Backend cô lập sau `CvPort` (`503 CV_SERVICE_UNAVAILABLE` khi chưa có `HS-04`); Frontend ánh xạ `GET /api/v1/me/cvs` phân biệt rõ trạng thái `'unavailable'` (hiển thị thông báo thân thiện + nút `"Thử lại"`) với `'empty'` (`[]`) và lỗi `401`.
- **UI/UX, Chuyển động & Trợ năng**: Tuân thủ hoàn toàn token `DESIGN_SYSTEM.md`, `<Icon />`, chuyển động GPU compositor-only chuẩn Rule 09, không lặp lại stagger/count-up khi quay lại từ trang chi tiết, hỗ trợ `prefers-reduced-motion`, focus trap, phím `Escape` trả tiêu điểm, vùng chạm `>= 44px` và `CLS = 0`.

---

## 6. How to Run & Verify / Hướng Dẫn Chạy & Kiểm Định

### 6.1. English

1. Prepare `.env` from `.env.example` (never commit `.env`), boot all 5 services (`postgres`, `mock`, `mailpit`, `backend`, `frontend`) with `docker compose up -d --build --wait`, run `node e2e/run-all.mjs`, and tear down with `docker compose down -v`.
2. Service URLs: Frontend `http://127.0.0.1:3000` (`/candidate/applications`), Backend `http://127.0.0.1:8080/api/v1`, OpenAPI (`dev`) `http://127.0.0.1:8080/api/api-docs` & `http://127.0.0.1:3000/api/docs`, Mailpit Web/API `http://127.0.0.1:8025`.
3. Local verification commands:
   - Full Windows / Bash CI gates: `.\check.ps1` and `./check.sh`
   - Backend: `cd backend && ./mvnw spotless:check spotbugs:check clean test-compile test`
   - Frontend: `cd frontend && npm run lint && npm run typecheck && npm run test -- --run && npm run build`
   - SQLFluff: `docker run --rm -v "${PWD}:/repo" -w /repo sqlfluff/sqlfluff:4.5.0 lint backend/src/main/resources/db/migration backend/src/main/resources/db/migration-dev/V20__dev_recruitment_seed.sql`

### 6.2. Tiếng Việt

1. Sao chép `.env.example` thành `.env` cục bộ (không commit `.env`), khởi động 5 dịch vụ bằng `docker compose up -d --build --wait`, chạy `node e2e/run-all.mjs`, và dọn sạch bằng `docker compose down -v`.
2. Địa chỉ dịch vụ: Frontend `http://127.0.0.1:3000` (`/candidate/applications`), Backend `http://127.0.0.1:8080/api/v1`, OpenAPI (`dev`) `http://127.0.0.1:8080/api/api-docs` & `http://127.0.0.1:3000/api/docs`, Mailpit `http://127.0.0.1:8025`.
3. Lệnh kiểm tra cục bộ: `.\check.ps1`, `./check.sh`, `./mvnw spotless:check spotbugs:check clean test-compile test` (trong `backend`), `npm run lint && npm run typecheck && npm run test -- --run && npm run build` (trong `frontend`), và `sqlfluff 4.5.0`.

---

## 7. Round UT-01-fix (`T023552`)

### 7.1. English

Round `UT-01-fix` (`T023552`) resolves review defects **M1** and **D5** on top of the `UT-01` baseline on branch `feature/T023552-candidate-application`:

- **M1 (HR Notification Email Link, Environment Configuration & Palette/A11y)**:
  - Replaced the dead `{frontendUrl}/hr/jobs/{jobId}/applications/{applicationId}` link in `HrNotificationListener.java` with `HR_HOME_PATH = "/hr"` (matching `PROTECTED_ROUTE_POLICIES.hrHome.path` in `frontend/src/features/identity/config/routePolicies.ts`) built in `buildHrTargetUrl()`. Updated plain-text and HTML copy honestly without promising an application detail screen, preserving `AFTER_COMMIT`, bounded `notificationTaskExecutor`, single PII-free error logging, CR/LF header sanitation, and HTML escaping.
  - Added env-driven `app.frontend-url` (`APP_FRONTEND_URL`) and `app.mail.from` (`APP_MAIL_FROM`) in `backend/src/main/resources/application.yml` (dev defaults `http://localhost:3000` and `no-reply@rikkeijobs.local`), empty overrides in `application-prod.yml`, fail-fast validation in `ProdEnvironmentValidator.java` (requiring `https://`, non-loopback/non-mock/non-`.local` host for `APP_FRONTEND_URL`, and valid non-placeholder email for `APP_MAIL_FROM`), safe placeholders in `.env.example`, and bilingual docs in `docs/04-security-secrets-policy.md` and `docs/02-local-development-troubleshooting.md`.
  - Replaced `#1a56db` and non-palette inline hex colors in `HrNotificationListener.java` with constants mirroring `frontend/src/shared/styles/design-tokens.css` (`#0D55B8`, `#FFFFFF`, `#0B1A2C`, `#475B70`), achieving WCAG 2.2 AA contrast `>= 6.98:1` (`#0D55B8`/`#FFFFFF` = `6.98:1`, `#0B1A2C`/`#FFFFFF` = `17.52:1`, `#475B70`/`#FFFFFF` = `7.00:1`).
  - Kept `backend/src/main/java/com/rikkei/jobs/identity/service/MailService.java` unchanged per Team Lead Option 1 (3); re-ran its covering tests (`48/48` across 7 suites) confirming behavior is unchanged with `app.frontend-url` in YAML.
  - Updated `e2e/tier1-features/test_applications.test.mjs` `TC-T1-UT01-15` (still Phase 2 skipped) to assert the corrected `/hr` link.
- **D5 (Candidate Home Coming-Soon Copy)**:
  - Updated lines `830` and `832` in `frontend/src/features/identity/pages/role-homes/CandidateHomePage.tsx` to replace the stale `"Hồ sơ ứng tuyển"` upcoming entry with `"Trợ lý AI"` (`"Góp ý cải thiện CV và luyện phỏng vấn thử theo yêu cầu tin tuyển dụng."`), leaving layout, styles, and motion untouched, and updated `RoleHomes.test.tsx` and `postLoginRedirect.test.tsx`.
- **Verified Raw Metrics**:
  - **Backend**: `spotless:check` (`354` files), `spotbugs:check` (`0` bugs), `clean test-compile` (`-Xlint:all -Werror`, `277` main + `77` test), and `./mvnw test` **`902/902`** PASS across `74` top-level classes (`+24` tests vs `878/74` baseline).
  - **Frontend**: `lint` (`0`), `typecheck` (`0`), Vitest **`40/473`** PASS (`0` `act()` warnings), build Entry JS **`100.29 kB`** gzip (`<= 128.81 kB`) & Entry CSS **`14.04 kB`** gzip (`+0 B`).
  - **Contrast & Repo Gates**: Email color pairs `>= 6.98:1`, `compute-contrast.mjs` **`120/120`**, `.\check.ps1` **`26/26`**, `./check.sh` **`26/26`**.
  - **Docker E2E & Live `/browser`**: `node e2e/run-all.mjs` **`28/28`** suites, **`344`** cases, **`2153`** assertions, **`1`** named skip (`TC-T1-UT01-15`), clean `docker compose down -v` (`0` leftovers); live `/browser` on `/candidate` (`1440` & `375` Light/Dark) PASS (`0` defects).

### 7.2. Tiếng Việt

Vòng `UT-01-fix` (`T023552`) khắc phục dứt điểm hai lỗi review **M1** và **D5** trên nền `UT-01` tại nhánh `feature/T023552-candidate-application`:

- **M1 (Liên kết email thông báo HR, cấu hình môi trường & bảng màu/trợ năng)**:
  - Thay liên kết chết `{frontendUrl}/hr/jobs/{jobId}/applications/{applicationId}` trong `HrNotificationListener.java` bằng `HR_HOME_PATH = "/hr"` (khớp `PROTECTED_ROUTE_POLICIES.hrHome.path` trong `routePolicies.ts`) qua `buildHrTargetUrl()`, sửa nội dung email trung thực, giữ nguyên `AFTER_COMMIT`, `notificationTaskExecutor`, log lỗi không PII, làm sạch tiêu đề và thoát HTML.
  - Bổ sung `APP_FRONTEND_URL` (`app.frontend-url`) và `APP_MAIL_FROM` (`app.mail.from`) trong `application.yml`, override rỗng tại `application-prod.yml`, kiểm tra fail-fast trong `ProdEnvironmentValidator.java` (bắt buộc `https://`, không trỏ loopback/mock/`.local` và email hợp lệ khác placeholder dev), cập nhật `.env.example`, `docs/04-security-secrets-policy.md` và `docs/02-local-development-troubleshooting.md`.
  - Chuẩn hóa màu email theo `design-tokens.css` (`#0D55B8`, `#FFFFFF`, `#0B1A2C`, `#475B70`) đạt tương phản `>= 6.98:1`; giữ nguyên `MailService.java` theo Option 1 (3) và xác nhận các bộ test liên quan giữ nguyên hành vi; cập nhật assertion đường dẫn `/hr` trong `TC-T1-UT01-15` (vẫn skip Phase 2).
- **D5 (Nội dung "Tính năng sắp ra mắt" ở trang chủ ứng viên)**:
  - Thay mục lỗi thời `"Hồ sơ ứng tuyển"` tại `CandidateHomePage.tsx` (`830`, `832`) bằng `"Trợ lý AI"` (`"Góp ý cải thiện CV và luyện phỏng vấn thử theo yêu cầu tin tuyển dụng."`), không đổi bố cục/style/motion; cập nhật `RoleHomes.test.tsx` và `postLoginRedirect.test.tsx`.
- **Số liệu kiểm định thực tế**: Backend **`902/902`** (`74` lớp), Frontend **`40/473`** (`0` cảnh báo `act()`, `100.29 kB` JS, `14.04 kB` CSS), tương phản email `>= 6.98:1` và `compute-contrast` **`120/120`**, `.\check.ps1` **`26/26`**, `./check.sh` **`26/26`**, Docker E2E **`28/28`** suites / **`344`** cases / **`2153`** assertions / **`1`** skip (`TC-T1-UT01-15`), `/browser` `/candidate` PASS (`0` lỗi).

---

## 8. Round UT-01-modal (`T023552`)

### 8.1. English

Round `UT-01-modal` (`T023552`) fixes the two root causes of the scrolled Light-mode modal stacking and sticky-shell jump defects on `feature/T023552-candidate-application` without changing backend code, API routes, migrations, or dependencies:

- **Overlay Layering & Portal Architecture (`T1`, `docs/design/DESIGN_SYSTEM.md` §14.6)**:
  - Rendered `ApplyDialog` and `WithdrawDialog` via `ReactDOM.createPortal(..., document.body)` (SSR-guarded with `typeof document !== 'undefined'`), escaping `<main className="rj-dashboard-content">` (`view-transition-name: rj-main-content`) while keeping all `view-transition-name` rules intact for route and circular theme transitions. Native `<dialog>.showModal()` was rejected because `jsdom@31.0.0` lacks `HTMLDialogElement.prototype.showModal` and native Top Layer would cover portaled `<Select />` listboxes.
  - Defined ordered Tier-2 semantic `--rj-z-*` tokens in `frontend/src/shared/styles/design-tokens.css` (`--rj-z-dropdown: 1000`, `--rj-z-sticky: 1100`, `--rj-z-drawer-backdrop: 1200`, `--rj-z-drawer: 1250`, `--rj-z-modal-backdrop: 1300`, `--rj-z-modal: 1400`, `--rj-z-popover: 1500`, `--rj-z-toast: 1600`, `--rj-z-skip-link: 1601`) and applied them across `identity.css`, `recruitment.css`, and `Select.css` (`.rj-select-listbox` raised from `1000` to `--rj-z-popover`).
- **Shared Reference-Counted Root Scroll Lock (`T2`)**:
  - Added `frontend/src/shared/utils/scrollLock.ts` (`acquireScrollLock`, `getScrollLockCount`, `resetScrollLockForTests`) and `frontend/src/shared/hooks/useScrollLock.ts` (`useScrollLock(locked)`), wired into `ApplyDialog`, `WithdrawDialog`, and `SharedAppLayout` (mobile drawer).
  - Sets `data-scroll-locked="true"` on `<html>` (`document.documentElement`) instead of mutating `document.body.style.overflow` (which turned `<body>` into an independent scroll container under `html, body { overflow-x: clip; }`), pairs `html { scrollbar-gutter: stable; }` with `html[data-scroll-locked="true"] { overflow: hidden; overscroll-behavior: none; }`, attaches reference-counted `{ passive: false }` wheel and touch boundary listeners (preserving internal overlay scroll away from 1px boundaries and multi-touch pinch-zoom), and hardens mobile backdrops with `overscroll-behavior: contain; touch-action: none;`.
- **T3 Audit & Approved Option 1A / Option 2B**:
  - Audited all overlays in `frontend/src`: fixed the 4 defective overlays (`ApplyDialog`, `WithdrawDialog`, `SharedAppLayout` drawer/backdrop, `Select` popover) and verified all remaining components (`JobDetailPanel`, `CompetencyRadarVisual`, `.sp-aside`, inline `.rj-alert`, tooltips, `.rj-skip-link`) as OK.
  - Added Option 1A `handleDrawerKeyDown` guard (`event.defaultPrevented` + external `[role="dialog"][aria-modal="true"]` check) in `SharedAppLayout.tsx` so simultaneous drawer + modal `Tab`/`Escape` stays isolated, and documented Option 2B `Select.tsx` follow-ups in `docs/ut01/PR_DESCRIPTION.md`.
- **Skills & Verification**:
  - Recorded the overlay portal and root scroll-lock rules in `agent-config/skills/frontend-visual-design/SKILL.md` and `agent-config/skills/frontend-motion-design/SKILL.md` (`node scripts/sync-agent-config.mjs`: `28` skills / `168` mirrored files, `validate-agent-config.mjs`: `10/10` PASS).
  - **Frontend**: `npm run lint` (`0`), `npm run typecheck` (`0`), Vitest **`44/44` files / `497/497` tests** (`0` `act()` warnings, including CSS/source scan `overlayLayeringContract.test.ts`), Vite build Entry CSS **`14.17 kB`** gzip (`+0.13 kB` vs `14.04 kB`, limit `<= 14.34 kB`), Entry JS + shared chunk **`102.12 kB`** gzip (`<= 128.81 kB`).
  - **Repo, Docker E2E & Live `/browser`**: `compute-contrast` **`120/120`**, `.\check.ps1` **`26/26`**, `./check.sh` **`26/26`**, fresh Docker E2E `node e2e/run-all.mjs` **`28/28` suites, `344` cases, `2153` assertions** (`1` skip `TC-T1-UT01-15`), clean `docker compose down -v` (`0` leftovers), and live `/browser` Pass 2 **`0` defects** (`15` PNGs in `docs/ut01/pr-screenshots/`, `ORDER.txt` Group 8).

### 8.2. Tiếng Việt

Vòng `UT-01-modal` (`T023552`) xử lý tận gốc hai nguyên nhân gây lỗi phân tầng modal và nhảy sticky header/sidebar ở Light mode trên nhánh `feature/T023552-candidate-application` mà không thay đổi backend, API, migration hay dependency:

- **Kiến trúc Portal & Thang Token Z-Index (`T1`, `DESIGN_SYSTEM.md` mục 14.6)**: Chuyển `ApplyDialog` và `WithdrawDialog` sang `ReactDOM.createPortal(..., document.body)` (có kiểm tra SSR) để thoát khỏi stacking context `<main className="rj-dashboard-content">` (`view-transition-name: rj-main-content`) mà vẫn giữ nguyên `view-transition-name` cho chuyển cảnh route và đổi theme tròn; chuẩn hóa thang semantic `--rj-z-*` (`1000..1601`) trong `design-tokens.css` và áp dụng cho `identity.css`, `recruitment.css`, `Select.css` (nâng `.rj-select-listbox` lên `--rj-z-popover: 1500`).
- **Hook Khóa Cuộn Gốc Đếm Tham Chiếu (`T2`)**: Tạo `scrollLock.ts` và `useScrollLock.ts` gắn `data-scroll-locked="true"` lên `<html>` (cấm sửa `document.body.style.overflow`), kết hợp `html { scrollbar-gutter: stable; }`, `html[data-scroll-locked="true"] { overflow: hidden; overscroll-behavior: none; }`, listener `{ passive: false }` cho `wheel`/`touch` theo ranh giới cuộn, và `overscroll-behavior: contain; touch-action: none;` cho backdrop di động.
- **Kiểm toán T3, Option 1A/2B & Kỹ năng**: Sửa `4` overlay lỗi (`ApplyDialog`, `WithdrawDialog`, drawer/backdrop của `SharedAppLayout`, `Select` popover), xác nhận các thành phần khác đạt chuẩn; bổ sung guard Option 1A tại `handleDrawerKeyDown` trong `SharedAppLayout.tsx`, ghi nhận follow-up Option 2B của `Select.tsx` trong `PR_DESCRIPTION.md`, và đồng bộ quy tắc mới vào `agent-config/skills/frontend-{visual,motion}-design/SKILL.md` (`28` skills / `168` tệp).
- **Kết quả kiểm định thực tế**: Frontend `44/44` file / `497/497` test (`0` `act()`), Entry CSS `14.17 kB` (`+0.13 kB`), Entry JS + chunk `102.12 kB`, `compute-contrast` `120/120`, `validate-agent-config` `10/10`, `.\check.ps1` & `./check.sh` **`26/26`**, Docker E2E **`28/28` suites / `344` cases / `2153` assertions** (`1` skip `TC-T1-UT01-15`), `docker compose down -v` sạch `0` tài nguyên, và live `/browser` Pass 2 đạt **`0` lỗi** (`15` PNG trong `docs/ut01/pr-screenshots/`).

---

## 9. Round UT-01-merge (`T023552`)

### 9.1. English

Round `UT-01-merge` (`T023552`) merges `origin/develop` (`a9fde1f`, containing PR #26 `AI-05` and PR #27 `PLATFORM`) into `feature/T023552-candidate-application` (`ecdd7d4`), resolving all **11 textual conflicts** and all **5 silent semantic conflicts** while keeping both sides' features, tests, and security controls intact:

- **Renumbered UT-01 Flyway Migrations (Byte-for-Byte SHA-256 Preserved)**:
  - `origin/develop`'s `V17__ai_governance.sql` (SHA-256 `CE7FB28FD9477359094651952E79D1F58629236B0F778BB5C4C9B063700CE3EF`) remains untouched.
  - UT-01's colliding migrations were renamed via filesystem moves in dependency order with identical SQL SHA-256 checksums (`11` odd prod migrations `V1..V21` + `8` even dev migrations `V2..V14, V22` = `19` dev migrations):
    - `V17__create_recruitment_applications.sql` -> `V19__create_recruitment_applications.sql` (`5D0B35638D6EA3D9284E973613ED418F006D6E923D0D6F742B3C87003E9F9F62`)
    - `V19__create_application_cv_snapshots.sql` -> `V21__create_application_cv_snapshots.sql` (`24F1774F59A713E19F7CEE9F1F7BD61F6B4E40DA0B7D6E4E96C264F09FEA9654`)
    - `V20__dev_recruitment_seed.sql` -> `V22__dev_recruitment_seed.sql` (`2E3DE765E9D6AAC4E7F489EAF38688940E68B22BD4CA895BBAABFD10C020C7FB`)
- **Merged Configuration, Prod Validators & Guard Tests**:
  - Merged the two top-level `app:` blocks in `backend/src/main/resources/application.yml` into a single `app:` block (`frontend-url`, `mail.from`, `ai.*`, `server.*`), protected permanently by `YamlDuplicateKeyGuardTest` (proven RED on the broken YAML and GREEN after merging) and verified by the Docker AppCDS training build.
  - Enforced both `ProdEnvironmentValidator` (`APP_FRONTEND_URL`, `APP_MAIL_FROM`) and `AuthRateLimitProdValidator` (`APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=true`, `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES`) across all `@ActiveProfiles("prod")` tests, preserving `META-INF/spring.factories` ordering and verifying all `RoutePolicyRegistry` routes (UT-01 + 4 AI admin routes).
- **Merged Frontend & OpenAPI E2E Contract**:
  - Merged `frontend/src/features/candidate/JobRecommendationsSection.tsx` to preserve AI-05's quota notice banner (`role="status"`, `.recommendations-notice`) alongside UT-01's enabled `"Ứng tuyển"` button and portaled `<ApplyDialog />`, verified fine-pointer hover guards in `jobRecommendations.css`, synced `roleUtils.test.ts` (`17` protected routes) and `SharedAppLayout.test.tsx`, and aligned `e2e/tier1-features/test_openapi_docs.test.mjs` with the live `/api/api-docs` inventory (`38` paths / `41` operations).
- **Honest Apply-Unavailable Behaviour & Explicit HS-04 Release Warning**:
  - With the Phase 1 placeholder in `backend/src/main/java/com/rikkei/jobs/recruitment/integration/RecruitmentCvPortConfig.java` returning `503 CV_SERVICE_UNAVAILABLE`, clicking `"Ứng tuyển"` opens `ApplyDialog` with the calm Vietnamese notice `"Dịch vụ quản lý CV hiện chưa sẵn sàng"` (zero raw error codes, zero HTTP 500s, disabled submit, focus trap/return and scroll lock intact), and `/candidate/applications` renders its empty state cleanly for candidates without applications.
  - **RELEASE WARNING (CRITICAL)**: `develop` **MUST NOT** be released to `main` until **HS-04** merges a real `CvPort` adapter replacing the placeholder in `backend/src/main/java/com/rikkei/jobs/recruitment/integration/RecruitmentCvPortConfig.java`.
- **Verified Final Metrics**:
  - **Backend**: `spotless:check` (`393` files), `spotbugs:check` (`0` bugs), `clean test-compile` (`-Xlint:all -Werror`), `sqlfluff 4.5.0` (`exit 0`), and `./mvnw -B test` **`87 classes / 1279 tests`** (`0` failures, `0` errors, `0` skipped) against real PostgreSQL `18.6-alpine`.
  - **Frontend**: `lint` (`0`), `typecheck` (`0`), Vitest **`46 files / 527 tests`** (`0` `act()` warnings), Vite gzip Entry JS **`87.22 kB`** (`-11.86 kB` vs `99.08 kB` on `develop`, plus `15.14 kB` shared chunk) & Entry CSS **`14.23 kB`** (`+0.13 kB` vs `14.10 kB`).
  - **Mock, E2E & Live `/browser`**: `mock/test-runner.js` **`8/8`**, `node e2e/run-all.mjs` **`29/29` suites / `349` cases / `2211` assertions** (`TC-T1-UT01-15` skipped awaiting HS-04), `docker compose down -v` (`0` remaining `rikkei` containers/volumes/networks), live `/browser` Pass 1 & Pass 2 **`0` defects / `0` console errors / `0` CSP violations**, and `.\check.ps1` / `./check.sh` **`26/26` PASS**.

### 9.2. Tiếng Việt

Vòng `UT-01-merge` (`T023552`) hợp nhất `origin/develop` (`a9fde1f`, gồm PR #26 `AI-05` và PR #27 `PLATFORM`) vào `feature/T023552-candidate-application` (`ecdd7d4`), giải quyết toàn bộ **11 xung đột văn bản** và **5 xung đột ngữ nghĩa thầm lặng** mà vẫn bảo toàn nguyên vẹn tính năng, kiểm thử và chốt chặn bảo mật của cả hai nhánh:

- **Đổi tên Migration UT-01 (Giữ nguyên 100% SHA-256 từng byte SQL)**: Giữ nguyên `V17__ai_governance.sql` của `origin/develop`; đổi tên `V17__create_recruitment_applications.sql` -> `V19__create_recruitment_applications.sql`, `V19__create_application_cv_snapshots.sql` -> `V21__create_application_cv_snapshots.sql`, và `V20__dev_recruitment_seed.sql` -> `V22__dev_recruitment_seed.sql` đúng thứ tự phụ thuộc (`11` prod lẻ + `8` dev chẵn = `19` tổng dev).
- **Hợp nhất `application.yml`, Validator `prod` & Kiểm thử Bảo vệ**: Gộp hai khối `app:` trong `application.yml` thành một khối duy nhất được bảo vệ bởi `YamlDuplicateKeyGuardTest` (đã chứng minh RED -> GREEN) và build Docker AppCDS; đồng bộ đủ 4 biến bắt buộc (`APP_FRONTEND_URL`, `APP_MAIL_FROM`, `APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=true`, `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES`) trên mọi test `@ActiveProfiles("prod")`; kiểm chứng `RoutePolicyRegistry` đầy đủ route UT-01 + AI admin.
- **Hợp nhất Frontend & Hợp đồng OpenAPI E2E**: Hợp nhất `JobRecommendationsSection.tsx` giữ đồng thời banner quota AI-05 (`role="status"`) và nút `"Ứng tuyển"` + `<ApplyDialog />` portaled của UT-01, cập nhật `roleUtils.test.ts` (`17` route), `SharedAppLayout.test.tsx`, `jobRecommendations.css` và `test_openapi_docs.test.mjs` (`38` paths / `41` operations khớp `/api/api-docs` thực tế).
- **Hành vi "Ứng tuyển chưa sẵn sàng" trung thực & Cảnh báo Phát hành HS-04**: Với placeholder tại `backend/src/main/java/com/rikkei/jobs/recruitment/integration/RecruitmentCvPortConfig.java` trả `503 CV_SERVICE_UNAVAILABLE`, bấm `"Ứng tuyển"` hiển thị thông báo tiếng Việt bình tĩnh `"Dịch vụ quản lý CV hiện chưa sẵn sàng"` (không lộ mã lỗi thô hay HTTP 500, giữ nguyên focus trap/return và khóa cuộn gốc), `/candidate/applications` hiển thị empty state bình thường. **CẢNH BÁO PHÁT HÀNH**: **KHÔNG ĐƯỢC** phát hành `develop` lên `main` trước khi **HS-04** hợp nhất adapter `CvPort` thật thay cho placeholder trong `RecruitmentCvPortConfig.java`.
- **Số liệu kiểm chứng cuối cùng**: Backend **`87 lớp / 1279 tests`** (`0` fail, `spotless:check` `393`, `spotbugs:check` `0`, `sqlfluff` `0`), Frontend **`46 file / 527 tests`** (`0` `act()`, Entry JS **`87.22 kB`** `-11.86 kB`, Entry CSS **`14.23 kB`** `+0.13 kB`), Mock **`8/8`**, E2E **`29/29` suites / `349` cases / `2211` assertions** (`TC-T1-UT01-15` skip chờ HS-04), `docker compose down -v` sạch `0` tài nguyên `rikkei`, live `/browser` Pass 1 & Pass 2 **`0` lỗi console / `0` vi phạm CSP**, và `.\check.ps1` / `./check.sh` **`26/26` PASS**.
