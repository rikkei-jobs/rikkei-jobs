# `[UT-02]` Recruitment Process: Screening, Interview Rounds & Staff Oversight - Tài Liệu Kỹ Thuật Quy Trình Tuyển Dụng (`T0235C3`)

**Task Code / Mã nhiệm vụ**: `T0235C3`
**Feature / Phân hệ**: `[UT-02]` Recruitment Process: Screening, Interview Rounds & Staff Oversight (port of PR `#21` / `9520fd5` onto `develop`)
**Branch / Nhánh**: `feature/T0235C3-recruitment-process`
**Stack / Công nghệ**: Java 25 LTS, Spring Boot 4.1.2, PostgreSQL 18.6, Flyway 12.4.0, React 19.3.1, TypeScript 6.0.3, Vite 8.3.7, Nginx 1.30.6, Mailpit v1.33.1

---

## 1. Executive Summary & Scope / Tổng Quan Tính Năng & Phạm Vi

### 1.1. English

Round `UT-02` (`T0235C3`) ports the recruitment process feature ("screening and interview rounds", commit `9520fd5`) onto the `develop` modular monolith and `UT-01` foundation. It enables owning-company `HR` users to manage application screening transitions and multi-round interviews, gives `STAFF` read-only cross-company oversight with filtering and pagination, and notifies `CANDIDATE` users asynchronously by email on every status transition.

- **In Scope**:
  - Flyway schema `V23__create_interview_rounds.sql` (`interview_rounds` + 3 staff/HR indexes on `applications`) and dev seed `V24__dev_interview_rounds_seed.sql`.
  - Additive read-only public service methods in `company` (`JobQueryService`) and `candidate` (`CandidatePublicService`) preserving Rule 14 acyclic module boundaries.
  - Single-source-of-truth UT-02 state machine (`ApplicationStatus.allowedUt02Transitions()`), `isOfferAllowed(Long applicationId)` UT-07 hook, deterministic `MatchScoreCalculator`, `RecruitmentProcessServiceImpl`, and `CandidateTransitionNotificationListener` (`AFTER_COMMIT` async mail).
  - 7 REST endpoints registered in `RoutePolicyRegistry` with `@PreAuthorize` and `OwnershipGuard`: 5 core UT-02 endpoints + **Option 1A** (`GET /api/v1/hr/jobs`) + **Option 2A** (`GET /api/v1/applications/{id}/cv-snapshot`).
  - Frontend slice additions inside `frontend/src/features/recruitment/` plus route/menu wiring in `routePolicies.ts`, `roleMenuConfig.ts`, and `App.tsx`.
  - E2E suite `e2e/tier1-features/test_recruitment_process.test.mjs`, updated OpenAPI E2E/Java assertions (`45` paths / `48` operations), and synchronized documentation/baselines.
- **Dropped from `9520fd5` (Out of Scope / Superseded by `develop`)**:
  - **8 files outside `recruitment`**:
    1. `backend/src/main/java/com/rikkei/jobs/common/exception/GlobalExceptionHandler.java` (replaced by `develop`'s unified `ApiException` handler; `InvalidTransitionException`, `InvalidApplicationStateException`, `InterviewRoundNotFoundException` extend `ApiException`).
    2. `backend/src/main/java/com/rikkei/jobs/common/security/SecurityConfig.java` (replaced by `RoutePolicyRegistry` deny-by-default).
    3. `backend/src/main/java/com/rikkei/jobs/company/repository/CompanyRepository.java` (dropped; cross-module reads go through `JobQueryService`).
    4. `backend/src/main/java/com/rikkei/jobs/identity/controller/AuthenticationController.java` (replaced by `develop`'s `AuthController`).
    5. `backend/src/main/java/com/rikkei/jobs/identity/service/AuthService.java` (replaced by `develop` identity service + `IdentityPublicService`).
    6. `backend/src/main/java/com/rikkei/jobs/identity/service/impl/AuthServiceImpl.java` (replaced by `develop` identity implementation).
    7. `frontend/src/shared/auth/authApi.ts` (replaced by `features/identity/` + `shared/api/httpClient.ts`).
    8. `frontend/src/shared/auth/session.ts` (replaced by `AuthContext` + in-memory token store).
  - **Superseded `9520fd5` recruitment-internal artifacts**:
    - `V10__create_interview_rounds_table.sql` -> replaced by odd prod `V23__create_interview_rounds.sql` + even dev `V24__dev_interview_rounds_seed.sql`.
    - `ApplicationStatusTransitionMatrix.java` -> consolidated into `ApplicationStatus.allowedUt02Transitions()` so only one transition table exists.
    - `RecruitmentAccessDeniedException.java` -> replaced by `OwnershipGuard` returning byte-identical `404 NOT_FOUND` on cross-company HR probes and `RoutePolicyRegistry`/`@PreAuthorize` returning `403 FORBIDDEN` for `STAFF`/`CANDIDATE`.
    - `HrApplicationsPage.tsx` -> replaced by `HrRecruitmentPage.tsx` + `ApplicationDetailPage.tsx`.

### 1.2. Tiếng Việt

Vòng `UT-02` (`T0235C3`) chuyển giao tính năng quy trình tuyển dụng ("sàng lọc và các vòng phỏng vấn", commit `9520fd5`) lên nền `develop` và `UT-01`. Tính năng cho phép `HR` của doanh nghiệp sở hữu tin tuyển dụng chuyển trạng thái sàng lọc và quản lý nhiều vòng phỏng vấn, cho phép `STAFF` theo dõi chỉ đọc trên toàn hệ thống với bộ lọc và phân trang, đồng thời gửi email thông báo bất đồng bộ tới `CANDIDATE` sau mỗi lần chuyển trạng thái.

- **Trong phạm vi**:
  - Migration `V23__create_interview_rounds.sql` (`interview_rounds` và 3 chỉ mục trên `applications` cho màn hình `STAFF`/`HR`) cùng seed dev `V24__dev_interview_rounds_seed.sql`.
  - Phương thức chỉ đọc bổ sung trên public service của `company` (`JobQueryService`) và `candidate` (`CandidatePublicService`), bảo đảm DAG không vòng theo Rule 14.
  - Máy trạng thái UT-02 một nguồn chân lý duy nhất (`ApplicationStatus.allowedUt02Transitions()`), hook `isOfferAllowed(Long applicationId)` cho UT-07, `MatchScoreCalculator` tất định, `RecruitmentProcessServiceImpl` và `CandidateTransitionNotificationListener` (`AFTER_COMMIT` async mail).
  - 7 endpoint REST khai báo trong `RoutePolicyRegistry` kèm `@PreAuthorize` và `OwnershipGuard`: 5 endpoint cốt lõi UT-02 + **Option 1A** (`GET /api/v1/hr/jobs`) + **Option 2A** (`GET /api/v1/applications/{id}/cv-snapshot`).
  - Mã nguồn giao diện trong `frontend/src/features/recruitment/` và nối tuyến tại `routePolicies.ts`, `roleMenuConfig.ts`, `App.tsx`.
  - Bộ kiểm thử E2E `e2e/tier1-features/test_recruitment_process.test.mjs`, cập nhật kiểm định OpenAPI (`45` paths / `48` operations) và đồng bộ tài liệu/baselines.
- **Loại bỏ từ `9520fd5` (Ngoài phạm vi / Đã thay thế trên `develop`)**:
  - **8 tệp ngoài `recruitment`**: `GlobalExceptionHandler.java`, `SecurityConfig.java`, `CompanyRepository.java`, `AuthenticationController.java`, `AuthService.java`, `AuthServiceImpl.java`, `frontend/src/shared/auth/authApi.ts`, `frontend/src/shared/auth/session.ts` (đều đã có cơ chế chuẩn hóa trên `develop` như `ApiException`, `RoutePolicyRegistry`, `JobQueryService`, `AuthContext` và `httpClient`).
  - **Thành phần cũ trong `recruitment` được chuẩn hóa lại**: `V10__create_interview_rounds_table.sql` (thay bằng `V23`/`V24`), `ApplicationStatusTransitionMatrix.java` (gộp vào `ApplicationStatus`), `RecruitmentAccessDeniedException.java` (thay bằng `OwnershipGuard` trả `404` và `RoutePolicyRegistry` trả `403`), và `HrApplicationsPage.tsx` (thay bằng `HrRecruitmentPage.tsx` + `ApplicationDetailPage.tsx`).

---

## 2. Recruitment State Machine (49-Pair Matrix), Round Rules & UT-07 Hook / Máy Trạng Thái 49 Cặp, Quy Tắc Vòng Phỏng Vấn & Hook UT-07

### 2.1. English

#### 2.1.1. All 49 Ordered Status Pairs (`ApplicationStatus.allowedUt02Transitions()`)

Single source of truth: `backend/src/main/java/com/rikkei/jobs/recruitment/model/ApplicationStatus.java` (`allowedUt02Transitions()` and `canTransitionInUt02(ApplicationStatus next)`). Backward moves, skipped steps, self-transitions, terminal mutations, and `UT-07` transitions (`INTERVIEW -> OFFER`, `OFFER -> HIRED | REJECTED`) all return HTTP `409 Conflict` with `{"code": "INVALID_TRANSITION", ...}`.

| `fromStatus` \ `toStatus` | `SUBMITTED` | `SCREENING` | `INTERVIEW` | `OFFER` | `HIRED` | `REJECTED` | `WITHDRAWN` |
|---|---|---|---|---|---|---|---|
| `SUBMITTED` | `409 INVALID_TRANSITION` | **Legal (`200`)** | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | **Legal (`200`)** | `409 INVALID_TRANSITION` |
| `SCREENING` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | **Legal (`200`)** | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | **Legal (`200`)** | `409 INVALID_TRANSITION` |
| `INTERVIEW` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` (UT-07) | `409 INVALID_TRANSITION` | **Legal (`200`)** | `409 INVALID_TRANSITION` |
| `OFFER` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` (UT-07) | `409 INVALID_TRANSITION` (UT-07) | `409 INVALID_TRANSITION` |
| `HIRED` (terminal) | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` |
| `REJECTED` (terminal) | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` |
| `WITHDRAWN` (terminal) | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` | `409 INVALID_TRANSITION` |

#### 2.1.2. Interview Round Creation & Edit Rules

- **Adding a round (`POST /api/v1/applications/{id}/rounds`)**:
  - Allowed **only** when `application.status` is `SCREENING` or `INTERVIEW`. Blocked in `SUBMITTED`, `OFFER`, `HIRED`, `REJECTED`, and `WITHDRAWN` with `409 INVALID_APPLICATION_STATE`.
  - Acquires `PESSIMISTIC_WRITE` lock (`ApplicationRepository#findByIdForUpdate`) on the parent `applications` row and computes `roundNo = findMaxRoundNoByApplicationId(applicationId) + 1`, backed by `UNIQUE (application_id, round_no)` in `V23`. Concurrent requests receive sequential unique `roundNo` values with zero `500` errors.
  - Initializes `result = PENDING`, `version = 0`.
- **Updating round result (`PUT /api/v1/applications/{id}/rounds/{roundId}`)**:
  - Allowed **only** when `application.status == INTERVIEW`. Blocked in `SCREENING` (rounds may be scheduled during screening, but results/scores cannot be finalized before `INTERVIEW` starts), `SUBMITTED`, `OFFER`, and all terminal states (`HIRED`, `REJECTED`, `WITHDRAWN`) with `409 INVALID_APPLICATION_STATE`.
  - Enforces optimistic locking via `@Version` (`InterviewRound.version`) plus explicit `request.version()` check -> stale updates return `409 CONFLICT`.

#### 2.1.3. `isOfferAllowed(Long applicationId)` — UT-07 Hook Contract

`RecruitmentProcessService#isOfferAllowed(Long applicationId)` (backed by `RecruitmentProcessServiceImpl#evaluateCanSendOffer`) is exposed as the single authoritative gate for the future `UT-07` send-offer workflow (`INTERVIEW -> OFFER` and `OFFER -> HIRED | REJECTED`, which belong strictly to `UT-07` and are rejected by `UT-02` transition endpoints):

1. `application.status == ApplicationStatus.INTERVIEW`.
2. At least one `interview_rounds` row exists (`!rounds.isEmpty()`).
3. No round has `result == null` or `result == InterviewResult.PENDING`.
4. The round with the highest `roundNo` has `result == InterviewResult.PASS`.

Frontend read-only indicator `canSendOffer` on `ApplicationProcessDetailResponse` is computed directly from `evaluateCanSendOffer(...)`. When `UT-07` introduces `POST /api/v1/applications/{id}/offer`, `UT-07` MUST inject `RecruitmentProcessService`, assert `isOfferAllowed(applicationId) == true` before moving `INTERVIEW -> OFFER`, and own `OFFER -> HIRED | REJECTED`.

### 2.2. Tiếng Việt

- **Bảng chuyển trạng thái 49 cặp (`ApplicationStatus.allowedUt02Transitions()`)**: Chỉ cho phép `SUBMITTED -> SCREENING | REJECTED`, `SCREENING -> INTERVIEW | REJECTED`, và `INTERVIEW -> REJECTED`. Mọi bước lùi, nhảy cóc, trạng thái kết thúc (`HIRED`, `REJECTED`, `WITHDRAWN`), hoặc bước của `UT-07` (`INTERVIEW -> OFFER`, `OFFER -> HIRED | REJECTED`) đều trả về `409 INVALID_TRANSITION`.
- **Quy tắc thêm & sửa vòng phỏng vấn**:
  - `POST /rounds` chỉ hợp lệ khi hồ sơ ở `SCREENING` hoặc `INTERVIEW` (các trạng thái khác trả `409 INVALID_APPLICATION_STATE`); khóa bi quan `findByIdForUpdate` kết hợp `UNIQUE (application_id, round_no)` bảo đảm cấp `round_no` đơn điệu không trùng dưới tải đồng thời.
  - `PUT /rounds/{roundId}` chỉ hợp lệ khi hồ sơ ở `INTERVIEW` (chặn ở `SCREENING` và trạng thái kết thúc bằng `409 INVALID_APPLICATION_STATE`); kiểm tra `@Version` trả `409 CONFLICT` nếu có cập nhật đồng thời cũ.
- **Điểm nối UT-07 (`isOfferAllowed`)**: Trả về `true` chỉ khi hồ sơ đang ở `INTERVIEW`, có ít nhất 1 vòng phỏng vấn, không còn vòng `PENDING`, và vòng có `roundNo` lớn nhất đạt `PASS`. Tài liệu rõ rằng `UT-07` sẽ gọi phương thức này trước khi thực hiện `INTERVIEW -> OFFER` và đảm nhiệm `OFFER -> HIRED | REJECTED`.

---

## 3. Endpoint Contracts, Option 1A, Option 2A & Sample Requests / Hợp Đồng API, Option 1A, Option 2A & Dữ Liệu Mẫu

### 3.1. English

All 7 routes are registered in `RoutePolicyRegistry` (deny-by-default) and guarded by `@PreAuthorize`:

| Endpoint | Role Policy | Success | Error Codes & Rules |
|---|---|---|---|
| `GET /api/v1/hr/jobs?page=1&size=20` (**Option 1A**) | `HR` (`@PreAuthorize("hasRole('HR')")`) | `200` (`PageResponse<HrJobSummaryDto>`) | `page >= 1`, `1 <= size <= 100`, stable order `createdAt DESC, id DESC`; `companyId` taken strictly from `principal.getCompanyId()`; `@Transactional(readOnly = true)`; `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN`/`MUST_CHANGE_PASSWORD`, `404` if HR has no company. **DN-04 Expansion Note**: `DN-04` will expand this endpoint in a future round with full JD authoring/management fields. **`jobs(company_id)` Index Note**: `V11__jobs_and_recommendations.sql` is immutable and only defines `idx_jobs_status_deadline ON jobs(status, deadline)`; `DN-04` should add an index on `jobs(company_id, created_at DESC, id DESC)` when expanding JD management. |
| `GET /api/v1/applications/{id}` | `HR` (owning company) / `STAFF` (read-only) | `200` (`ApplicationProcessDetailResponse`) | Cross-company `HR` -> byte-identical `404 NOT_FOUND` via `OwnershipGuard`; `CANDIDATE` -> `403`; anonymous -> `401`; zero N+1 via `MatchScoreCalculator` + ordered rounds & histories. |
| `GET /api/v1/applications/{id}/cv-snapshot` (**Option 2A**) | `HR` (owning company) / `STAFF` (read-only) | `200` (`application/pdf`) | Cross-company `HR` -> `404 NOT_FOUND`; `CANDIDATE` -> `403`; anonymous -> `401`; reuses `CvSnapshotDownloadSupport` emitting `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`; zero PII logged. |
| `POST /api/v1/applications/{id}/transition` | `HR` (owning company) | `200` (`ApplicationProcessDetailResponse`) | Body `{ toStatus, note }` (`@NotNull`, `@NotBlank`, max `2000`); `400 VALIDATION_ERROR`; `403` (`STAFF`/`CANDIDATE`/`MUST_CHANGE_PASSWORD`); `404` cross-company/missing; `409 INVALID_TRANSITION` / `CONFLICT`; writes `ApplicationStatusHistory` + publishes `CandidateTransitionNotificationEvent`. |
| `POST /api/v1/applications/{id}/rounds` | `HR` (owning company) | `201` (`InterviewRoundResponse`) | Body `{ name, interviewerEmail, scheduledAt }` (`name` not blank max `100`, valid `email` max `150`); `400 VALIDATION_ERROR`; `403`; `404`; `409 INVALID_APPLICATION_STATE`; server-side monotonic `roundNo`. |
| `PUT /api/v1/applications/{id}/rounds/{roundId}` | `HR` (owning company) | `200` (`InterviewRoundResponse`) | Body `{ result, score, note, version }` (`result` `@NotNull`, `version` `@NotNull >= 0` required, `score` `0.00..100.00`, `note` max `2000`); `400 VALIDATION_ERROR` (incl. omitted/`null` `version`); `403`; `404` missing/cross-app `roundId`; `409 INVALID_APPLICATION_STATE` / `CONFLICT` (`@Version`). |
| `GET /api/v1/staff/applications?companyId=&jobId=&status=&page=1&size=20` | `STAFF` (`@PreAuthorize("hasRole('STAFF')")`) | `200` (`PageResponse<StaffApplicationSummaryResponse>`) | `page >= 1`, `1 <= size <= 100`, order `createdAt DESC, id DESC`; `400 VALIDATION_ERROR`; `401`; `403`; O(1) batch hydration (`roundCounts`, `jobsById`, `jobSkillsByJobId`, `usersById`, `candidateScoresByUserId`). |

#### Sample Requests & Responses

```bash
# 1. HR lists own company jobs (Option 1A)
curl -s -H "Authorization: Bearer $HR_TOKEN" \
  "http://127.0.0.1:8080/api/v1/hr/jobs?page=1&size=20"

# 2. HR or STAFF fetches full recruitment detail
curl -s -H "Authorization: Bearer $HR_TOKEN" \
  "http://127.0.0.1:8080/api/v1/applications/1"

# 3. HR transitions application SUBMITTED -> SCREENING
curl -s -X POST -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toStatus":"SCREENING","note":"Hồ sơ đạt tiêu chí sàng lọc kỹ năng nền tảng."}' \
  "http://127.0.0.1:8080/api/v1/applications/1/transition"

# 4. HR adds interview round (SCREENING or INTERVIEW)
curl -s -X POST -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Vòng 1: Phỏng vấn Java","interviewerEmail":"techlead@fpt.example.test","scheduledAt":"2026-12-01T10:00:00+07:00"}' \
  "http://127.0.0.1:8080/api/v1/applications/1/rounds"

# 5. HR enters round result (INTERVIEW only)
curl -s -X PUT -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"result":"PASS","score":88.5,"note":"Ứng viên trả lời tốt câu hỏi Spring Boot và SQL.","version":0}' \
  "http://127.0.0.1:8080/api/v1/applications/1/rounds/1"

# 6. STAFF monitors applications across companies
curl -s -H "Authorization: Bearer $STAFF_TOKEN" \
  "http://127.0.0.1:8080/api/v1/staff/applications?companyId=2&status=INTERVIEW&page=1&size=20"
```

### 3.2. Tiếng Việt

- **Option 1A (`GET /api/v1/hr/jobs`)**: Trả danh sách JD phân trang (`page >= 1`, `1 <= size <= 100`, sắp xếp `createdAt DESC, id DESC`), lấy `companyId` tuyệt đối từ `principal.getCompanyId()`, `@Transactional(readOnly = true)`, `404` nếu HR chưa gán công ty. **Lưu ý `DN-04`**: vòng `DN-04` sẽ mở rộng endpoint này với trường quản lý JD đầy đủ và nên bổ sung chỉ mục `jobs(company_id)` (vì `V11` bất biến mới chỉ đánh chỉ mục `jobs(status, deadline)`).
- **Option 2A (`GET /api/v1/applications/{id}/cv-snapshot`)**: Cho phép `HR` đúng công ty (`200`, lệch công ty trả `404` giống hệt ID thiếu) và `STAFF` (`200`), chặn `CANDIDATE` (`403`) và ẩn danh (`401`), tái sử dụng `CvSnapshotDownloadSupport` với `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` và không ghi PII vào log.
- **5 endpoint UT-02 còn lại**: `GET /api/v1/applications/{id}`, `POST /api/v1/applications/{id}/transition`, `POST /api/v1/applications/{id}/rounds`, `PUT /api/v1/applications/{id}/rounds/{roundId}`, và `GET /api/v1/staff/applications` tuân thủ `RoutePolicyRegistry`, `@PreAuthorize`, `OwnershipGuard`, Bean Validation và trả lỗi chuẩn `{"code","message"}`.

---

## 4. MatchScoreCalculator, Async Email & Frontend Slice / Tính Điểm Phù Hợp, Email Bất Đồng Bộ & Giao Diện Frontend

### 4.1. English

- **Deterministic `MatchScoreCalculator` (`Rule 14` Compliant)**:
  - Obtains job skill requirements from `JobQueryService` (`JobVerificationClient`) and verified candidate scores from `CandidatePublicService` — zero cross-module table/entity imports.
  - Formula: `weight = mandatory ? 2.0 : 1.0`, `ratio = Math.min(1.0, candidateScore / Math.max(1, requiredLevel))`, `score = clamp(0, 100, Math.round((sum(ratio * weight) / sum(weight)) * 100.0))` (returns `0` when requirements are empty).
- **Async Candidate Transition Email (`CandidateTransitionNotificationListener`)**:
  - `RecruitmentProcessServiceImpl#transitionStatus` publishes immutable `CandidateTransitionNotificationEvent` inside the transaction.
  - `CandidateTransitionNotificationListener` runs at `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` on `@Async("notificationTaskExecutor")`.
  - Uses Vietnamese subject `"Rikkei Jobs - Cập nhật trạng thái hồ sơ #<id>: <jobTitle>"`, sanitizes headers (`HrNotificationListener.sanitizeHeader`), escapes all dynamic text (`HtmlUtils.htmlEscape`), links CTA to `<app.frontend-url>/candidate/applications`, reuses `HrNotificationListener` palette constants, isolates mail failures without rolling back the transition, and emits one PII-free log line (`applicationId`, `fromStatus`, `toStatus`).
- **Frontend Slice (`frontend/src/features/recruitment/`)**:
  - **Routes (`routePolicies.ts`, `roleMenuConfig.ts`, `App.tsx` with `lazyRoute`)**:
    - `/hr/recruitment` & `/hr/jobs/:jobId/applications` -> `HrRecruitmentPage` (`HR` only, sidebar `"Tuyển dụng"`).
    - `/hr/applications/:id` -> `ApplicationDetailPage` (`HR` only).
    - `/staff/applications` -> `StaffApplicationsPage` (`STAFF` only, sidebar `"Hồ sơ ứng tuyển"`).
    - `/staff/applications/:id` -> `ApplicationDetailPage` (`STAFF` read-only).
  - **Components & API**: `recruitmentApi.ts` (over `httpClient` with `AbortSignal`), `ApplicationTimeline.tsx`, `InterviewRoundsSection.tsx`, `AddInterviewRoundModal.tsx`, `UpdateRoundModal.tsx`, `StatusTransitionModal.tsx` (portaled outside `<main>` with `useScrollLock`, `dialogFocusUtils` focus trap, `Escape` close & focus return, `--rj-z-*` & `--rj-*` design tokens, `<Icon />`, `ApplicationStatusBadge`, Dense mode `36-38px` rows / `13-14px` body, `<= 150ms` micro-interactions with `prefers-reduced-motion`, zero optimistic UI on transitions, zero emoji).

### 4.2. Tiếng Việt

- **`MatchScoreCalculator` (Tuân thủ Rule 14)**: Lấy yêu cầu kỹ năng JD qua `JobQueryService` và điểm kỹ năng đã xác thực qua `CandidatePublicService` (không truy cập bảng/entity chéo module). Trọng số kỹ năng bắt buộc `2.0`, tùy chọn `1.0`, chuẩn hóa `[0, 100]`.
- **Email ứng viên sau commit (`CandidateTransitionNotificationListener`)**: Chạy tại `TransactionPhase.AFTER_COMMIT` trên `notificationTaskExecutor`, tiêu đề và nội dung tiếng Việt có dấu, làm sạch header, thoát HTML toàn bộ trường động, gắn liên kết `<app.frontend-url>/candidate/applications`, dùng token màu tương phản chuẩn và ghi log 1 dòng không PII.
- **Giao diện Frontend (`frontend/src/features/recruitment/`)**: Bổ sung các trang `HrRecruitmentPage`, `StaffApplicationsPage`, `ApplicationDetailPage` cùng `ApplicationTimeline`, `InterviewRoundsSection` và 3 modal portal (`AddInterviewRoundModal`, `UpdateRoundModal`, `StatusTransitionModal`) theo chế độ Dense, chỉ dùng token `--rj-*`, `<Icon />`, hỗ trợ đầy đủ bàn phím, responsive và Dark/Light mode.

---

## 5. Run Guide & Verification Baselines / Hướng Dẫn Chạy & Số Liệu Kiểm Định

### 5.1. English

1. Copy `.env.example` to `.env` (never commit `.env`), boot all 5 containers (`postgres`, `mock`, `mailpit`, `backend`, `frontend`) with `docker compose up -d --build --wait` (builds backend AppCDS archive `/app/app.jsa` during image build), execute `node e2e/run-all.mjs`, and tear down with `docker compose down -v`.
2. Local verification commands:
   - Full host quality gates: `.\check.ps1` and `./check.sh` (`26/26` active gates).
   - Backend: `cd backend && ./mvnw spotless:check spotbugs:check clean test-compile test` (`1407` tests across `91` test classes).
   - Frontend: `cd frontend && npm run lint && npm run typecheck && npm run test -- --run && npm run build` (`561` Vitest tests across `50` files).
   - E2E: `node e2e/run-all.mjs` (`30` suites, `359` test cases, `2358` assertions; `TC-T1-UT01-15` skipped awaiting HS-04).
   - Migrations: `V23__create_interview_rounds.sql` (`12` prod odd migrations `V1..V23`), `V24__dev_interview_rounds_seed.sql` (`9` even dev seeds `V2..V24`, `21` combined in `dev`).

### 5.2. Tiếng Việt

1. Tạo `.env` từ `.env.example` (không commit `.env`), chạy `docker compose up -d --build --wait` (kiểm chứng AppCDS `/app/app.jsa` lúc build image), chạy `node e2e/run-all.mjs`, và dọn sạch bằng `docker compose down -v`.
2. Các lệnh kiểm tra cục bộ: `.\check.ps1`, `./check.sh` (`26/26`), Backend `./mvnw spotless:check spotbugs:check clean test-compile test` (`1407` tests / `91` classes), Frontend `npm run lint && npm run typecheck && npm run test -- --run && npm run build` (`561` tests / `50` files), và Flyway (`12` prod `V1..V23`, `9` dev `V2..V24`, tổng `21` trong `dev`).

---

## 6. UT-02-fix (`T0235C3`) Remediation Note / Ghi Chú Sửa Lỗi Vòng UT-02-fix

- **D1 (`HrHomePage.tsx`)**: Promoted live `/hr/recruitment` (`Mở tuyển dụng`) to the hero primary action box, kept `/hr/company` solely in the company summary card, and restricted `"Tính năng sắp ra mắt"` to genuinely pending items (`Đăng tin tuyển dụng`, `Thực tập sinh IOC`).
- **D2 (`HrJobSummaryDto.java`, `JobQueryService.java`, `HrRecruitmentPage.tsx`)**: Added backend `Clock`-driven `expired` boolean and derived `EXPIRED` status using the exact UT-01 boundary (`deadline != null && !deadline.isAfter(now)`), keeping `CLOSED` as `"CLOSED"`, and rendered non-color-only icon + Vietnamese labels in the HR recruitment UI.
- **D3 (`UpdateInterviewRoundRequest.java`, `RecruitmentProcessServiceImpl.java`)**: Made `version` `@NotNull` (returning `400 VALIDATION_ERROR` when omitted or `null`), removed the null-version service bypass, updated TypeScript/OpenAPI/E2E contracts, and updated the endpoint contract row in Section 3.1 above.
- **D4 (`CandidateTransitionNotificationListener.java`)**: Replaced hard-coded `#F4F7FB` with `SURFACE_NOTE_HEX = "#F8FAFD"` mirroring `--rj-color-surface-input` (`--rj-primitive-neutral-50`), maintaining `16.76:1` contrast against `TEXT_PRIMARY_HEX` (`#0B1A2C`).

---

## 7. UT-02-fix2 (`T0235C3`) Remediation Note / Ghi Chú Sửa Lỗi Vòng UT-02-fix2

### 7.1. English

- **D1 (`HrHomePage.tsx`, `RoleHomes.test.tsx`)**: Restored `origin/develop`'s company next-step guidance box (`.rj-cand-next-box.rj-hr-next-box` with `useMemo`, `missingFieldsCount`, loading skeleton `"Đang xác định bước tiếp theo cho doanh nghiệp"`, and primary CTA `"Mở hồ sơ công ty"` -> `/hr/company`) while keeping the live recruitment entry as a separate second `.rj-cand-next-box` directly below with secondary CTA `"Mở tuyển dụng"` -> `/hr/recruitment`, the recruitment-aware subtitle, and the 2-item `"Tính năng sắp ra mắt"` aside (`identity.css` untouched, `CLS = 0`).
- **D2 (`recruitmentApi.ts`, `ApplicationDetailPage.tsx`, `StatusTransitionModal.tsx`, `AddInterviewRoundModal.tsx`, `UpdateRoundModal.tsx`, `recruitment.css`)**: Eliminated the 409 reload-page trap across all three HR actions and all three 409 codes (`CONFLICT`, `INVALID_TRANSITION`, `INVALID_APPLICATION_STATE`) by keeping the dialog open with typed inputs intact, displaying a Vietnamese explanation + `"Tải lại dữ liệu mới nhất"` (`role="alert"`), refetching in-place via `getApplicationProcessDetail` without document reload/logout/blank page, deriving `editingRound` by `editingRoundId` (guarded by `detail.status === 'INTERVIEW'`) from fresh `detail.rounds`, deriving `effectiveToStatus` in `StatusTransitionModal.tsx` against `detail.allowedTransitions` so background refreshes never leave a removed status submittable, keeping portal/scroll-lock/focus shells keyed stably by application/round ID while keying `ApplicationDetailContent` by `rawId` so route `:id` changes reset modals/banners/abort refs cleanly, sharing `refreshAbortRef`/`refreshSeqRef` across both `loadDetail` and `refreshDetailInPlace()`, reconciling open modals against fresh detail in both `handleCloseAfterConflict` and `loadDetail` to close with a focused page-level notice when actions become unavailable, deferring post-409 close focus checks until async refetch settles (with `mainHeadingRef` + `tabIndex={-1}` on the error-view `<h1>`), restoring focus inside the dialog when `handleRefreshLatest` catches `AbortError` while still mounted, clearing open modal states on error transitions and stale `editingRoundId` when rounds disappear, separating `'transition'` vs `'round'` `INVALID_APPLICATION_STATE` copy, and providing retry + `"Về danh sách"` on refresh failure (UT-01 `apply`/`withdraw` flows untouched).
- **D3 (`StaffApplicationsPage.test.tsx`, `HrRecruitmentPage.test.tsx`, `ApplicationDetailPage.test.tsx`, `RecruitmentModals.test.tsx`)**: Split multi-phase recruitment tests into focused single-purpose `it()` cases with `within(...)`-scoped queries and fixed a post-success `data-scroll-locked` `waitFor` race in `RecruitmentModals.test.tsx`, achieving `10/10` consecutive full-suite Vitest passes (`595/595` tests across `50` files, `0` `act()` warnings, every recruitment/`RoleHomes` case `<= 1186 ms`, entry JS `87.64 kB` / CSS `14.23 kB` gzip).
- **D4 (`HrRecruitmentPage.tsx`)**: Mapped `REJECTED` in `getJobStatusMeta` to `"Đã từ chối"` (`icon: 'x'`, `rec-round-badge--fail`) before `expired`, and changed the unknown-status fallback to neutral `"Không xác định"` (`icon: 'alert-circle'`, `rec-status-badge--submitted`) so unknown/rejected jobs never show raw enums or open-like badges.
- **Phase B Docker E2E & Live `/browser`**: Fresh `docker compose up -d --build --wait` + `node e2e/run-all.mjs` passed (`30/30` suites, `359` cases, `2,369` assertions, `46.60s`), `docker compose down -v` left `0` `rikkei` containers/volumes/networks, and live `/browser` verification (`16/16` PNGs in `browser_evidence/`) confirmed D1, two-tab D2 `409` recovery, and D4 with `0` console errors, `0` CSP violations, and `0` unintended HTTP `>= 400` responses (details & sandbox limits in `docs/ut02/BROWSER_OBSERVATIONS.md` Section 4).

### 7.2. Tiếng Việt

- **D1 (`HrHomePage.tsx`, `RoleHomes.test.tsx`)**: Khôi phục hộp `"Bước tiếp theo cho doanh nghiệp"` từ `origin/develop` (`.rj-cand-next-box.rj-hr-next-box`, `useMemo`, `missingFieldsCount`, skeleton tải và nút chính `"Mở hồ sơ công ty"` -> `/hr/company`), đồng thời đặt lối vào tuyển dụng live ở hộp `.rj-cand-next-box` thứ hai tách biệt ngay bên dưới với nút phụ `"Mở tuyển dụng"` -> `/hr/recruitment`, giữ nguyên subtitle và thẻ `"Tính năng sắp ra mắt"` 2 mục (`identity.css` giữ nguyên, `CLS = 0`).
- **D2 (`recruitmentApi.ts`, `ApplicationDetailPage.tsx`, 3 modal HR, `recruitment.css`)**: Xử lý triệt để bẫy 409 cho cả 3 hành động HR và cả 3 mã 409 (`CONFLICT`, `INVALID_TRANSITION`, `INVALID_APPLICATION_STATE`): giữ dialog mở và bảo toàn nội dung đã nhập, hiển thị giải thích tiếng Việt (không yêu cầu tải lại trang; tách riêng thông báo `'transition'` và `'round'` cho `INVALID_APPLICATION_STATE`) kèm nút `"Tải lại dữ liệu mới nhất"`, refetch qua API không tải lại trình duyệt/không mất JWT/không trắng trang, suy xuất `editingRound` theo `editingRoundId` (ràng buộc `detail.status === 'INTERVIEW'`) từ `detail.rounds` mới, suy xuất `effectiveToStatus` trong `StatusTransitionModal.tsx` theo `detail.allowedTransitions` để refetch nền không bao giờ gửi trạng thái cũ đã bị loại bỏ, đồng bộ `refreshAbortRef`/`refreshSeqRef` giữa `loadDetail` và `refreshDetailInPlace()`, reset sạch modal/banner/ref khi đổi `:id` trên route, đóng dialog kèm thông báo trang nếu thao tác không còn hợp lệ sau refetch ở cả `handleCloseAfterConflict` và `loadDetail`, hoãn kiểm tra focus hậu đóng dialog đến khi refetch bất đồng bộ hoàn tất (gắn `mainHeadingRef` + `tabIndex={-1}` ở `<h1>` lỗi), phục hồi focus vào trong dialog nếu `handleRefreshLatest` gặp `AbortError` khi modal vẫn mounted, reset trạng thái mở modal khi chuyển sang màn lỗi hoặc khi vòng đang sửa biến mất sau refetch, và giữ nút thử lại + `"Về danh sách"` khi refresh lỗi (giữ nguyên hoàn toàn UT-01 `apply`/`withdraw`).
- **D3 & D4 (`HrRecruitmentPage.tsx`, bộ test recruitment)**: Map `REJECTED` -> `"Đã từ chối"` và fallback lạ -> `"Không xác định"` trung tính; tách các ca test nặng bằng `within(...)` và sửa race `data-scroll-locked`, đạt `10/10` lần chạy full Vitest (`595/595` tests / `50` files, `0` `act()` warnings, mọi ca recruitment/`RoleHomes` `<= 1186 ms`, bundle JS `87.64 kB` / CSS `14.23 kB` gzip).
- **Phase B Docker E2E & `/browser` trực tiếp**: `docker compose up -d --build --wait` + `node e2e/run-all.mjs` PASS (`30/30` suites, `359` cases, `2,369` assertions, `46.60s`), `docker compose down -v` dọn sạch (`0` container/volume/network `rikkei`), và kiểm chứng `/browser` (`16/16` ảnh PNG trong `browser_evidence/`) xác nhận D1, khôi phục `409` hai tab cho D2 và nhãn trạng thái D4 với `0` console error, `0` CSP violation, `0` HTTP `>= 400` ngoài ý muốn (chi tiết & giới hạn sandbox xem tại `docs/ut02/BROWSER_OBSERVATIONS.md` Mục 4).

---

## 8. UT-02-fix3 (`T0235C3`) Remediation Note / Ghi Chú Sửa Lỗi Vòng UT-02-fix3

### 8.1. English

Following the Team Lead's re-verification of `UT-02-fix2` (where the Team Lead observed **`9/10`**, not `10/10`, consecutive full-suite Vitest passes due to a passive-effect focus race on Run 2 plus two live UX/accessibility gaps), round `UT-02-fix3` (`T0235C3`) fixed three targeted frontend/test defects (`D1–D3`) on top of the uncommitted working tree without modifying `backend/src/`, `V1..V24` migrations, `pom.xml`, `package*.json`, or out-of-scope features:

- **D1 — Eliminate Silent Lost Update & Post-Success Stale Reopen (`UpdateRoundModal.tsx`, `ApplicationDetailPage.tsx`)**:
  - Pinned `const [formVersion, setFormVersion] = useState<number>(round.version)` at form mount inside `UpdateRoundModal.tsx`, updating `setFormVersion(freshRound.version)` strictly together with `result`/`score`/`note` in `handleRefreshLatest` and sending `version: formVersion` in `handleSubmit`. Reopening before a close-after-`409` refetch resolves or receiving a background `round` prop update never silently alters the submitted version; saving stale form data sends the mounted `formVersion`, hits `409 Conflict`, and enters the recovery flow.
  - Updated `UpdateRoundModal` (`updatedRound`) and `AddInterviewRoundModal` (`createdRound`) `onSuccess` handlers in `ApplicationDetailPage.tsx` (with `computeCanSendOffer` matching backend `evaluateCanSendOffer`) to apply the returned round immediately via `setDetail(...)` before triggering `setReloadCount`, preventing instant reopen from showing pre-save values.
  - Audited the remaining two HR dialogs: `StatusTransitionModal.tsx` is safe against D1 (keyed by `detail.id`, carries no `version`, derives `effectiveToStatus` from live `detail.allowedTransitions`, and `onSuccess(updated)` applies `setDetail(updated)` immediately); `AddInterviewRoundModal.tsx` component is safe against D1 (keyed by `applicationId`, empty initial inputs, backend assigns `roundNo` under `PESSIMISTIC_WRITE`), and its `onSuccess(createdRound)` callback in `ApplicationDetailPage.tsx` now applies `createdRound` immediately before refetch.
- **D2 — Eliminate Effect-Dependent Flaky Assertions (`features/recruitment/__tests__/`)**:
  - Audited all `9` recruitment test files and moved every passive-effect assertion (`document.activeElement`, `data-scroll-locked`, `disabled`, `role="alert"`) into `await waitFor(...)` without raising `testTimeout`, retries, `skip`, or sleeps.
  - Proved stability with **`20/20`** consecutive `npx vitest run --reporter=verbose` runs (`50/50` files, `602/602` tests, `0` failures, `0` `act()` warnings) and synced `agent-config/rules/10-testing-strategy.md` (`602` tests / `50` files) across `.claude/` and `.gemini/`.
- **D3 — Preserve Accessible Focus Inside All Three Dialogs on `409` (`UpdateRoundModal.tsx`, `StatusTransitionModal.tsx`, `AddInterviewRoundModal.tsx`)**:
  - Added `setErrorFocusSeq((n) => n + 1)` inside the `isRecruitmentConflictError(err)` branch of `handleSubmit` across all three HR dialogs so `409` moves focus reliably to `"Tải lại dữ liệu mới nhất"` (`reloadBtnRef`) instead of dropping to `document.body`, keeping `role="alert"` `aria-live="assertive"` announced.
- **Verification & Evidence (`docs/ut02/pr-screenshots/`, `browser_evidence/` Removed)**:
  - Production build: entry JS `87.63 kB` gzip (`-0.01 kB` vs `87.64 kB`), entry CSS `14.23 kB` gzip (`0.00 kB` delta).
  - Fresh `docker compose up -d --build --wait` + `node e2e/run-all.mjs` passed (`30/30` suites, `359` cases, `2,369` assertions, `75.90s`; `1` baseline skip `TC-T1-UT01-15`), followed by live `/browser` verification (`0` console errors, `0` unexpected network errors; D1 `docker pause`/`unpause rikkei-backend` + `psql` proof, D3 keyboard `Tab` -> `Enter` at `1440x900` & `375x812`, R2 responsive Light/Dark; `16` moved + `7` new = `23` PNGs in `docs/ut02/pr-screenshots/`) and clean `docker compose down -v` (`0` remaining `rikkei` containers, volumes, networks).

### 8.2. Tiếng Việt

Sau khi Team Lead kiểm tra lại vòng `UT-02-fix2` (ghi nhận Team Lead quan sát được **`9/10`** lần chạy ổn định, không phải `10/10`, do race condition ở passive effect tại lần chạy thứ 2 cùng 2 lỗi UX/accessibility thực tế), vòng `UT-02-fix3` (`T0235C3`) đã sửa triệt để 3 lỗi mục tiêu (`D1–D3`) trên frontend/test và đồng bộ tài liệu mà giữ nguyên hoàn toàn `backend/src/`, các migration `V1..V24`, `pom.xml`, `package*.json` và các phần ngoài phạm vi:

- **D1 (`UpdateRoundModal.tsx`, `ApplicationDetailPage.tsx`)**: Neo `formVersion = useState(round.version)` lúc khởi tạo form, chỉ cập nhật `setFormVersion(freshRound.version)` đồng thời cùng giá trị form trong `handleRefreshLatest`, bảo đảm mở lại trước khi close-after-`409` refetch hoàn tất hay đổi prop nền đều gửi đúng `formVersion` đang hiển thị để nhận `409 Conflict` thay vì ghi đè `200`; đồng thời `onSuccess` của `UpdateRoundModal` và `AddInterviewRoundModal` áp dụng ngay round trả về qua `setDetail(...)` (`computeCanSendOffer`) trước khi gọi `setReloadCount`. Đã kiểm toán 2 dialog còn lại (`StatusTransitionModal.tsx` an toàn; `AddInterviewRoundModal.tsx` an toàn và `onSuccess` đã được nâng cấp).
- **D2 (`features/recruitment/__tests__/`)**: Kiểm toán toàn bộ `9` tệp test, đưa mọi assertion phụ thuộc passive `useEffect` vào `waitFor(...)` không dùng kỹ thuật cấm, chứng minh bằng **`20/20`** lần chạy liên tiếp `npx vitest run --reporter=verbose` (`50/50` tệp, `602/602` test, `0` lỗi, `0` cảnh báo `act()`) và đồng bộ Rule 10 (`602/50`).
- **D3 (`UpdateRoundModal.tsx`, `StatusTransitionModal.tsx`, `AddInterviewRoundModal.tsx`)**: Bổ sung `setErrorFocusSeq((n) => n + 1)` trong nhánh `409` của `handleSubmit` tại cả 3 dialog HR để focus chuyển về `"Tải lại dữ liệu mới nhất"` thay vì rơi ra `document.body`, giữ thông báo `role="alert"` `aria-live="assertive"`.
- **Kiểm chứng & Bằng chứng**: Build đạt `87.63 kB` JS / `14.23 kB` CSS gzip; Docker E2E đạt `30/30` suites (`359` cases, `2,369` assertions, `75.90s`); `/browser` trực tiếp (`docker pause`/`unpause` + `psql`, bàn phím D3 trên cả 3 modal ở `1440x900` và `375x812`, Light/Dark) đạt chuẩn với `23` ảnh PNG trong `docs/ut02/pr-screenshots/` (đã chuyển `browser_evidence/`), và `docker compose down -v` dọn sạch (`0` container/volume/network `rikkei`).
