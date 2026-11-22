# `[UT-01]` Ứng tuyển bằng CV và theo dõi trạng thái ứng tuyển (`T023552`)

> **GitHub Pull Request Title (without Markdown backticks)**: `[UT-01] Ung tuyen bang CV va theo doi trang thai ung tuyen (T023552)`

## Pull Request Metadata / Thông Tin Pull Request

- **Task Code / Mã nhiệm vụ**: `T023552`
- **Feature Code / Mã tính năng**: `[UT-01]`
- **Source Branch / Nhánh nguồn**: `feature/T023552-candidate-application` (remediating PR `#13`)
- **Target Branch / Nhánh đích**: `develop` (`origin/develop @ eb75201`)

---

## 1. Executive Summary, Architecture & `F1`–`F11` Remediation / Tóm Tắt Tổng Quan, Kiến Trúc & Khắc Phục `F1`–`F11`

### 1.1. English

Round `UT-01` (`T023552`) ports and hardens the candidate CV application and application status tracking feature (with HR read-only views) onto the current `develop` baseline (`eb75201`, including `NT-02`, `DN-01`, `TT-01`, and the `UI/UX` design system) while resolving all `11` review defects (`F1`–`F11`) and cleaning up duplicate PR `#13` code:

- **PR `#13` Cleanup & Forward Migrations (`B2`, `F11`)**:
  - Removed all stale PR `#13` duplicate auth (`AuthenticationController`, `AuthServiceImpl`, `JwtConfiguration`, `CurrentUserResolver`), duplicate company/JD stack (`HrJobDescriptionController`, `StaffJobDescriptionController`, `JobDescription*`), duplicate CV stack (`CandidateCv*`), `UT-02` status update DTO (`UpdateApplicationStatusRequest`), and legacy frontend (`shared/auth/*`, `shared/api/http.ts`, `AuthenticationPanel*`, legacy `features/recruitment/*`).
  - Kept `backend/pom.xml` (`spring-boot-starter-oauth2-resource-server` stays removed, `0` Lombok, `0` new dependencies) and `docs/mock-contract.md` untouched (`0` diff vs `origin/develop`). Added `.gradle/`, `**/.gradle/`, and `docs/ut01/pr-screenshots/` to `.gitignore`.
  - Deleted colliding migrations (`V3..V9` and dev `V3.1`, `V6.1`, `V8.1`), preserved all `15/15` `origin/develop` migrations (`V1..V15`) byte-for-byte (`SHA-256` verified), and authored Option A forward migrations formatted for `sqlfluff 4.5.0`: `V17__create_recruitment_applications.sql`, `V19__create_application_cv_snapshots.sql` (prod total `8 -> 10`), and `V20__dev_recruitment_seed.sql` (dev total `15 -> 18`, ordered cleanly `15 -> 17 -> 19 -> 20`).
- **Module Boundaries & `CvPort` Contract (`B3`, `HS-04` Isolation)**:
  - `recruitment` (`MOD-06`) has `0` imports of `model` or `repository` from `identity`, `company`, or `candidate`, and `0` cross-module physical foreign keys or SQL `JOIN`s.
  - Consumes `IdentityPublicService#findActiveHrRecipientsByCompanyId(Long companyId)` -> `List<HrRecipientDto>` (no `User` entity exposed) and `JobQueryService` (`findJobForApplication`, `findJobSummariesByIds`, `isJobOwnedByCompany`) returning immutable `JobApplicationInfoDto` over `jobs` (`V11`).
  - Owns `CvPort#getOwnedCvForApplication(Long cvId, Long candidateUserId)` -> `CvSnapshotPayload`. Until `HS-04` merges in Phase 2, `RecruitmentCvPortConfig` registers a `@ConditionalOnMissingBean(CvPort.class)` placeholder returning `503 CV_SERVICE_UNAVAILABLE`; `InMemoryCvPortTestDouble` tests `404 NOT_FOUND` and snapshot immutability.
- **7-Status Machine & Apply Sequence (`F1`–`F9`)**:
  - **Statuses**: `SUBMITTED -> SCREENING -> INTERVIEW -> OFFER -> HIRED`; `REJECTED` from any step before `HIRED`; `WITHDRAWN` by candidate ONLY from `SUBMITTED`, `SCREENING`, or `INTERVIEW` (`canWithdraw() == false` from `OFFER` onward -> `409 CANNOT_WITHDRAW`). Partial unique index `uq_applications_active_job_user` enforces one open application per `(job_id, user_id)`; terminal statuses (`HIRED`, `REJECTED`, `WITHDRAWN`) allow re-applying.
  - **Apply Sequence & TX Split (`F3`, `F4`, `F9`)**: Outside `@Transactional`, `ApplicationServiceImpl` checks JD eligibility via `JobVerificationClient` using injectable `java.time.Clock` (`APPROVED` and `deadline.isAfter(now)` -> `400 JOB_NOT_ELIGIBLE` on expired/equal boundary), pre-checks open duplicate (`409 DUPLICATE_APPLICATION`), and captures/validates PDF bytes via `CvPort` (`application/pdf`, `%PDF-`, `1..5 MiB`, SHA-256). Then `ApplicationPersistenceTxService` runs one short `@Transactional(rollbackFor = Exception.class)` block: allocates `id` via `applications_id_seq` so `@PrePersist` computes `cvSnapshotUrl` in a **single INSERT** (no `"pending"` rewrite), saves `ApplicationCvSnapshot` + initial `ApplicationStatusHistory`, and publishes `ApplicationSubmittedEvent`.
  - **Post-Commit Async HR Mail (`F1`)**: `HrNotificationListener` executes at `TransactionPhase.AFTER_COMMIT` on bounded `notificationTaskExecutor` (`core=2`, `max=4`, `queue=100`, `"rikkei-async-"`), sends multipart UTF-8 HTML/text mail via Spring Mail to Mailpit (`127.0.0.1:1025`) for active company HRs (skipping with PII-free `WARN` if none; zero hard-coded fallback; zero PII in logs; mail failures never roll back the application).
  - **Pagination, Concurrency & Snapshot Integrity (`F2`, `F5`, `F6`, `F7`, `F8`)**: Batch-fetches job summaries once per page (`page >= 1`, default `20`, max `100`, unknown `?status=` -> `400`); `@Version` optimistic locking (`409 CONFLICT`); immutable `BYTEA` PDF download with `Content-Type: application/pdf`, sanitized `Content-Disposition: attachment`, `Cache-Control: no-store, no-cache, must-revalidate`, `X-Content-Type-Options: nosniff`; unified `ErrorResponse { code, message }` (zero `ResponseStatusException`); full `RoutePolicyRegistry` + `@AuthenticationPrincipal UserPrincipal` + `OwnershipGuard` cross-user/cross-tenant `404 NOT_FOUND`.
- **Frontend Feature Slice (`B5`, `B6`)**:
  - Built `frontend/src/features/recruitment` on `shared/api/httpClient.ts` (`+requestBlob`) and `AuthContext`, lazy-loaded `/candidate/applications`, enabled sidebar `"Ứng tuyển"`, and enabled `"Ứng tuyển"` on job cards and `JobDetailPanel`.
  - Styled exclusively with `DESIGN_SYSTEM.md` tokens (`0` raw colors), `<Icon />` (`0` emojis), `tabular-nums`, authentic Vietnamese copy with full diacritics, compositor-only Rule 09 motion (`prefers-reduced-motion` static fallback, non-replay after return from detail), focus traps, `Escape` focus return, `>= 44px` touch targets, and `CLS = 0`.
- **Strictly Out of Scope**: `HS-04` (CV upload/storage `/me/cvs`), `DN-04` (Staff/HR JD authoring/approval), and `UT-02` (HR status transition `PATCH .../status` — removed and verified closed with `401`/`403`).

### 1.2. Tiếng Việt

Vòng `UT-01` (`T023552`) hoàn thiện tính năng ứng tuyển việc làm bằng CV và theo dõi trạng thái ứng tuyển (cùng API xem chỉ-đọc cho HR) trên nền nhánh `develop` hiện tại (`eb75201`), xử lý toàn bộ `11` lỗi review (`F1`–`F11`) và dọn sạch mã trùng từ PR `#13`:

- **Dọn mã PR `#13` & Migration tiến (`B2`, `F11`)**: Gỡ toàn bộ stack auth, JD, CV trùng lặp, DTO `UT-02` và mã frontend cũ (`shared/auth/*`, `shared/api/http.ts`, `AuthenticationPanel*`). Giữ nguyên `backend/pom.xml` (`0` Lombok, `0` dependency mới) và `docs/mock-contract.md`. Bảo toàn `15/15` migration `V1..V15` khớp `SHA-256`, thay thế các migration trùng số bằng `V17`, `V19` (prod `8 -> 10`) và `V20` (dev `15 -> 18`, chạy sau `V17`/`V19`, sạch `sqlfluff 4.5.0`).
- **Ranh giới Module & Cổng `CvPort` (`B3`)**: `recruitment` (`MOD-06`) không import `model`/`repository` của module khác và không tạo khóa ngoại liên module. Giao tiếp qua `IdentityPublicService#findActiveHrRecipientsByCompanyId`, `JobQueryService`, và sở hữu `CvPort` (Phase 1 dùng `@ConditionalOnMissingBean` trả `503 CV_SERVICE_UNAVAILABLE`; kiểm thử dùng `InMemoryCvPortTestDouble`).
- **Máy 7 trạng thái & Khắc phục `F1`–`F9`**: Hỗ trợ `SUBMITTED -> SCREENING -> INTERVIEW -> OFFER -> HIRED`, `REJECTED` trước `HIRED`, `WITHDRAWN` chỉ trước `OFFER` (`409 CANNOT_WITHDRAW` từ `OFFER` trở đi), partial unique index chặn trùng đơn mở (`409 DUPLICATE_APPLICATION`), cho phép nộp lại sau trạng thái kết thúc. Kiểm tra JD qua `Clock` và tải PDF ngoài giao dịch; ghi đơn + snapshot + lịch sử trong một giao dịch duy nhất với một lệnh `INSERT`; gửi email HR qua Spring Mail -> Mailpit tại `TransactionPhase.AFTER_COMMIT` trên `notificationTaskExecutor` giới hạn (không fallback email giả, không log PII); batch-fetch chống N+1 (`F2`), `@Version` (`409`, `F5`), PDF `BYTEA` bất biến + header tải xuống an toàn (`F6`), ma trận `RoutePolicyRegistry` + `OwnershipGuard` `404` (`F7`) và `ErrorResponse` thống nhất (`F8`).
- **Frontend (`B5`, `B6`)**: Xây dựng `features/recruitment` trên `httpClient.ts` (`+requestBlob`) & `AuthContext`, mở `/candidate/applications`, bật `"Ứng tuyển"` ở thanh bên, thẻ việc làm và `JobDetailPanel`, tuân thủ `DESIGN_SYSTEM.md`, `<Icon />`, chuyển động GPU compositor-only chuẩn Rule 09 (`prefers-reduced-motion`, không phát lại stagger khi quay lại), focus trap và `>= 44px` vùng chạm.
- **Ngoài phạm vi**: Không cài đặt `HS-04` (lưu trữ CV), `DN-04` (tạo/duyệt JD) và `UT-02` (HR chuyển trạng thái `PATCH`).

---

## 2. How to Run, Sample Data & Endpoint Contract / Hướng Dẫn Chạy, Dữ Liệu Mẫu & Hợp Đồng Endpoint

### 2.1. English

- **How to Run**: Copy `.env.example` to `.env` (never commit `.env`), run `docker compose up -d --build --wait`, run `node e2e/run-all.mjs`, and tear down with `docker compose down -v`.
  - URLs: Frontend `http://127.0.0.1:3000` (`/candidate/applications`), Backend `http://127.0.0.1:8080/api/v1`, OpenAPI (`dev`) `http://127.0.0.1:8080/api/api-docs` & `http://127.0.0.1:3000/api/docs`, Mailpit `http://127.0.0.1:8025`.
- **Sample Data (`V2`, `V12`, `V20`)**:
  - `candidate1@rikkeijobs.test` (`lms-sv-001`, `user_id = 1`): `7` seeded applications (`id = 1..7`) covering `SUBMITTED`, `SCREENING`, `INTERVIEW`, `OFFER`, `HIRED`, `REJECTED`, `WITHDRAWN`, `20` history rows, `7` identical 594-byte `%PDF-1.4` snapshots (`sample-candidate-cv.pdf`, SHA-256 `9b71184ae956dd96864598cc8abfffb29bcf23c9bff28aff431fd779ac564782`).
  - `candidate2@rikkeijobs.test` (`lms-sv-002`, `user_id = 2`): `0` applications (empty state).
  - `hr2@rikkeijobs.test` (`company_id = 2`, `Test@123`): owns `job_id = 2, 8` (apps `1, 2`) and expired `job_id = 12` (`deadline = 2024-01-01`). `hr1@rikkeijobs.test` (`company_id = 1`, `Test@123`) has `must_change_password = true` (`403 MUST_CHANGE_PASSWORD`). `mentor1`, `staff1`, `admin1`: `403 FORBIDDEN`.
- **8 REST Endpoints (`B4`)**:
  - `POST /api/v1/jobs/{id}/apply` (`CANDIDATE`, `{ cvId, coverLetter }`) -> `201` / `400` (`VALIDATION_ERROR`, `JOB_NOT_ELIGIBLE`) / `404` / `409` (`DUPLICATE_APPLICATION`) / `503` (`CV_SERVICE_UNAVAILABLE`)
  - `GET /api/v1/me/applications?status=&page=1&size=20` (`CANDIDATE`, `size <= 100`) -> `200` / `400`
  - `GET /api/v1/me/applications/{id}` (`CANDIDATE` owner) -> `200` / `404`
  - `POST /api/v1/me/applications/{id}/withdraw` (`CANDIDATE` owner, `{ reason }`) -> `200` / `400` / `404` / `409` (`CANNOT_WITHDRAW`, `CONFLICT`)
  - `GET /api/v1/me/applications/{id}/cv-snapshot` (`CANDIDATE` owner) -> `200` (`application/pdf`) / `404`
  - `GET /api/v1/hr/jobs/{jobId}/applications?status=&page=1&size=20` (`HR` own company) -> `200` / `400` / `404`
  - `GET /api/v1/hr/jobs/{jobId}/applications/{applicationId}` (`HR` own company) -> `200` / `404`
  - `GET /api/v1/hr/jobs/{jobId}/applications/{applicationId}/cv-snapshot` (`HR` own company) -> `200` (`application/pdf`) / `404`

### 2.2. Tiếng Việt

- **Cách chạy**: Sao chép `.env.example` thành `.env`, chạy `docker compose up -d --build --wait`, kiểm thử E2E bằng `node e2e/run-all.mjs` và dọn sạch bằng `docker compose down -v`. Frontend `:3000`, Backend `:8080`, OpenAPI `:8080/api/api-docs` & `:3000/api/docs`, Mailpit `:8025`.
- **Dữ liệu mẫu**: `lms-sv-001` (`7` đơn đủ 7 trạng thái `id=1..7`, `20` mốc lịch sử, `7` PDF 594 byte), `lms-sv-002` (`0` đơn), `hr2` (công ty `2`, xem đơn `1, 2`; `404` với công ty `1`), `hr1` (`403 MUST_CHANGE_PASSWORD`), `job_id=12` (hết hạn `2024-01-01`).
- **8 Endpoint (`B4`)**: 5 endpoint ứng viên (`/jobs/{id}/apply`, `/me/applications`, `/me/applications/{id}`, `/me/applications/{id}/withdraw`, `/me/applications/{id}/cv-snapshot`) và 3 endpoint xem chỉ-đọc của HR (`/hr/jobs/{jobId}/applications*`), lỗi thống nhất `ErrorResponse { code, message }`.

---

## 3. Phase 2 Checklist (Post `HS-04` & `DN-04` Merge) / Danh Mục Phase 2

### 3.1. English

1. Implement real `CvPort` Spring adapter in `candidate` (`HS-04`), replacing the `@ConditionalOnMissingBean` `503 CV_SERVICE_UNAVAILABLE` placeholder (keep `CvPortUnavailableIntegrationTest` covering the fallback).
2. Confirm `GET /api/v1/me/cvs` returns `CandidateCvItem[]` (or `{ items }`) matching `frontend/src/features/recruitment/types.ts` (`id`, `title`, `fileName`, `updatedAt`, `isDefault`).
3. Un-skip `TC-T1-UT01-15` in `e2e/tier1-features/test_applications.test.mjs` and align `TC-T1-UT01-11` (`503` pre-Phase 2 test) with live CV adapter behavior.
4. Execute live `/browser` Phase 2 verification (Section 7 Block I: choose CV -> `201` apply -> list -> `409` duplicate -> edit/delete source CV & verify HR snapshot SHA-256 unchanged -> withdraw -> re-apply -> blocked at `OFFER`) and capture live Mailpit HR email JSON proof.
5. Re-run `.\check.ps1`, `./check.sh`, `docker compose up -d --build --wait`, `node e2e/run-all.mjs`, and `docker compose down -v`.

### 3.2. Tiếng Việt

1. Cài đặt adapter `CvPort` thật trong module `candidate` (`HS-04`) thay thế placeholder `503 CV_SERVICE_UNAVAILABLE` (giữ nguyên unit test `CvPortUnavailableIntegrationTest`).
2. Xác nhận `GET /api/v1/me/cvs` trả về danh sách khớp `CandidateCvItem` trong `recruitment/types.ts`.
3. Bỏ skip `TC-T1-UT01-15` trong `e2e/tier1-features/test_applications.test.mjs` và cập nhật `TC-T1-UT01-11` theo hành vi `CvPort` thật.
4. Chạy lại toàn trình `/browser` Phase 2 (chọn CV -> nộp đơn `201` -> trùng đơn `409` -> sửa/xóa CV đối chiếu SHA-256 snapshot HR -> rút đơn -> nộp lại -> chặn ở `OFFER`) và lấy JSON email HR từ Mailpit.
5. Chạy lại `.\check.ps1`, `./check.sh`, `node e2e/run-all.mjs` và `docker compose down -v`.

---

## 4. Verified Raw Check Results / Kết Quả Kiểm Định Thực Tế

### 4.1. English

- **Backend Maven (`./mvnw spotless:check spotbugs:check clean test-compile test` on JDK 25)**:
  - `spotless:check`: `354 / 354` Java files clean (exit `0`).
  - `clean test-compile` (`-Xlint:all -Werror -Xlint:-processing`): `277` main + `77` test files compiled with `0` warnings (exit `0`).
  - `spotbugs:check`: `0` bugs, `0` errors (exit `0`).
  - `test`: **`Tests run: 878, Failures: 0, Errors: 0, Skipped: 0`** across **`74`** Surefire report files (up `+177` tests / `+10` classes from `develop` baseline `701` / `64`).
  - `V1..V15` migration parity: **`15 / 15`** `SHA-256` identical to `origin/develop`. `git diff origin/develop -- backend/pom.xml` empty; `git diff origin/develop -- docs/mock-contract.md` empty; `git grep -i lombok backend/` empty; `0` cross-module `model`/`repository` imports in `com.rikkei.jobs.recruitment`.
- **Frontend (`frontend/`)**:
  - `npm run lint`: `0` ESLint errors; `npm run typecheck`: `0` TypeScript errors.
  - `npm run test -- --run` (Vitest `5.1.0`): **`Test Files 40 passed (40), Tests 473 passed (473)`**, **`0` `act()` warnings** (up `+44` tests / `+4` files from `develop` baseline `36` / `429`).
  - `npm run build` (`tsc -b && vite build`, `127` modules in `321ms`):
    - Entry JS (`index-B8Ssr9cy.js`): `322,278 B` raw (`322.27 kB`), `99,250 B` gz6 (`100.29 kB` Vite CLI `<= 128.81 kB` cap).
    - Entry CSS (`index-BANbuE8W.css`): `84,669 B` raw (`84.66 kB`), `14,099 B` gz6 (`14.04 kB`, `+0 B` entry CSS increase).
    - Lazy chunks: `MyApplicationsPage` JS `24.35 kB` (`5.89 kB` gz), `recruitment` JS `6.39 kB` (`2.51 kB` gz), `recruitment` CSS `13,334 B` (`2,586 B` gz6 / `2.58 kB` Vite CLI).
    - Combined CSS (`9` files): `146,725 B` raw / `22,822 B` gz6 (vs `21,140 B` alpha baseline).
- **Repo Scripts, Linters & Quality Gates**:
  - `node mock/test-runner.js`: **`8 / 8`** PASS; `node scripts/compute-contrast.mjs`: **`120 / 120`** PASS (`0` violations); `node scripts/validate-agent-config.mjs --check`: **`10 / 10`** PASS (`0` raw colors); `node scripts/sync-agent-config.mjs --check`: `168` mirror files (`0` drift); `node scripts/check-gate-sync.mjs`: PASS (`29/26/3/23/25`); `node scripts/check-version-drift.mjs`: PASS (`32 / 32`); `sqlfluff/sqlfluff:4.5.0` on `db/migration` (`10` files incl. `V17`, `V19`) & `V20__dev_recruitment_seed.sql`: `0` errors; `markdownlint-cli2` & `cspell` (`en,vi`): `0` issues (`0` inline ignores).
  - `.\check.ps1` & `./check.sh`: **`26 / 26 [PASS]`** on both PowerShell and Git Bash.
- **Fresh Docker Compose Stack, E2E, OpenAPI, Raw HTTP & Teardown**:
  - `docker compose down -v && docker compose up -d --build --wait`: **`5 / 5` containers `(healthy)`** (`postgres`, `mock`, `mailpit`, `backend`, `frontend`).
  - `node e2e/run-all.mjs`: **`28 / 28` suites, `344 / 344` cases, `2,149` assertions, `11,952` lines in `38.68s`** (exit `0`), including `test_applications.test.mjs` (`15` tests: `14` active pass + `1` named Phase 2 skip `TC-T1-UT01-15`, `111` asserts, `1429ms`) and `test_openapi_docs.test.mjs` (`6` tests, `94` asserts).
  - Live OpenAPI & Mailpit: `GET http://127.0.0.1:8080/api/api-docs` & `http://127.0.0.1:3000/api/api-docs` -> `35` paths (`37` operations); Mailpit `/api/v1/info` -> `v1.33.1`.
  - Raw HTTP & Mailpit proofs (`M4` verified): `401` (`3.99–12.04 ms`), `403` (`4.62–45.38 ms`, incl. `hr1` `MUST_CHANGE_PASSWORD`), byte-identical cross-user/cross-tenant `404` (`9.45–33.25 ms`), `400 JOB_NOT_ELIGIBLE` / `409 DUPLICATE_APPLICATION` / `409 CANNOT_WITHDRAW` / `503 CV_SERVICE_UNAVAILABLE` (`9.19–17.85 ms`), PDF snapshot headers (`10.73–15.53 ms`, `application/pdf`, `attachment`, `no-store`, `nosniff`, `594 B`, `SHA-256` verified), and Mailpit `total = 0` on failed `503` apply (`21.08 ms`, `0` spurious mails; async Spring Mail dispatch proven in `HrNotificationListenerTest` `3/3` & `ApplicationIntegrationTest` `15/15`).
  - Final `docker compose down -v`: `docker ps -a --filter "name=rikkei"`, `docker volume ls --filter "name=rikkei"`, and `docker network ls --filter "name=rikkei"` all return **`0` leftovers**.
- **Live `/browser` Verification (Passes 1–4) & Honest Sandbox Disclosure**:
  - Verified all Section 7 Blocks A–I across `375 / 768 / 1024 / 1440` Light & Dark modes, all 7 statuses (`id = 1..7`), `lms-sv-002` empty state, `lms-mt-001` sidebar isolation, keyboard focus traps & `Escape` return, double-click single-`POST` withdraw, D1–D3 & D7 Part 1 fixes, and Pass 4 **`b779bdd6` Steps 30–42** (`no defects` post-rebuild) with `0` console errors. Full tables, timed motion sequences, defect triage (`D1`–`D10`), and honest `webview_browser` sandbox replacement proofs are documented in `docs/ut01/BROWSER_OBSERVATIONS.md`.

### 4.2. Tiếng Việt

- **Backend Maven**: `spotless:check` (`354/354`), `-Xlint:all -Werror` (`277` main + `77` test), `spotbugs:check` (`0` lỗi), `./mvnw test` **`878 / 878`** trên **`74`** lớp kiểm thử (`0` lỗi/bỏ qua). `V1..V15` khớp `15/15` `SHA-256`; `pom.xml` & `docs/mock-contract.md` không đổi; `0` Lombok; `0` import chéo module.
- **Frontend**: `eslint` `0`, `tsc --noEmit` `0`, Vitest **`40` tệp / `473` test PASS** (`0` cảnh báo `act()`), Vite Entry JS **`100.29 kB` gzip** (`<= 128.81 kB`), Entry CSS **`14.04 kB` gzip** (`+0 B`), Lazy `recruitment` CSS **`2.58 kB` gzip**, Combined CSS **`22,822 B` gz6**.
- **Cổng tĩnh & Scripts**: `mock/test-runner.js` `8/8`, `compute-contrast.mjs` `120/120`, `validate-agent-config.mjs` `10/10`, `sync-agent-config.mjs` `168`, `check-gate-sync.mjs` `29/26/3/23/25`, `check-version-drift.mjs` `32/32`, `sqlfluff 4.5.0` `0`, `markdownlint-cli2` `0`, `cspell` `0`, `.\check.ps1` & `./check.sh` **`26 / 26 [PASS]`**.
- **Docker Compose, E2E & Dọn sạch**: `docker compose up -d --build --wait` (`5/5 healthy`), `node e2e/run-all.mjs` **`28 / 28` suites, `344` cases, `2,149` assertions trong `38.68s`** (`test_applications.test.mjs` `15` cases / `111` asserts), OpenAPI `35` paths trên `:8080` & `:3000`, `docker compose down -v` để lại **`0` container / volume / network**.
- **`/browser` Pass 1–4**: Xác minh đầy đủ Blocks A–I (kết thúc bằng Pass 4 `b779bdd6` Steps 30–42 **`no defects`** với `0` lỗi console) và công khai trung thực giới hạn sandbox trong `docs/ut01/BROWSER_OBSERVATIONS.md`.

---

## 5. PR Screenshots (`89` PNGs, Git-Ignored) / Ảnh Màn Hình PR (`89` Ảnh, Git-Ignored)

- **English**: All `89` verified PNG screenshots (`0` secrets, `0` real personal data, `0` corrupted files) are stored in git-ignored `docs/ut01/pr-screenshots/` (`.gitignore` line `108`) and indexed 1:1 in `docs/ut01/pr-screenshots/ORDER.txt` (including Pass 4 `b779bdd6` `ut01-apply-dialog-fixed-*.png` superseding pre-fix Pass 1 & Pass 3 captures, Pass 3 `ut01-withdraw-dialog-fixed-*` / `ut01-detail-d3-*` / `ut01-return-list-*`, and `51` timed motion frames).
- **Tiếng Việt**: Toàn bộ `89` ảnh PNG đã kiểm tra (`0` bí mật, `0` dữ liệu cá nhân thật) nằm trong thư mục git-ignore `docs/ut01/pr-screenshots/` và được lập chỉ mục 1:1 trong `docs/ut01/pr-screenshots/ORDER.txt` (xem chi tiết từng nhóm tại `docs/ut01/BROWSER_OBSERVATIONS.md`).

---

## 6. Ordered Commit Proposals / Đề Xuất Chuỗi Commit Theo Thứ Tự

- **English**: The `8` ordered commits below cover `162 / 162` UT-01 entries (`65 M`, `61 D`, `36 ??` including `docs/ut01/PR_DESCRIPTION.md`) in `git status --porcelain -uall` (`0` missing, `0` extra, `0` duplicates). Git-ignored `docs/ut01/pr-screenshots/` (`89` PNGs + `ORDER.txt`) is excluded per `.gitignore`.
- **Tiếng Việt**: `8` commit theo thứ tự dưới đây bao phủ chính xác `162 / 162` mục (`65 M`, `61 D`, `36 ??`, bao gồm `docs/ut01/PR_DESCRIPTION.md`) trong `git status --porcelain -uall` (`0` thiếu, `0` thừa, `0` trùng). Thư mục `docs/ut01/pr-screenshots/` được loại trừ theo `.gitignore`.

1. `T023552: chore(cleanup): update .gitignore and remove stale PR #13 duplicate auth, JD, CV and legacy frontend code` (`42` files: `1 M`, `41 D`)
   - `.gitignore`
   - `backend/src/main/java/com/rikkei/jobs/candidate/controller/CandidateCvController.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/dto/CandidateCvFileDto.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/dto/CandidateCvPageResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/dto/CandidateCvSummaryResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/model/CandidateCv.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/repository/CandidateCvRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/service/CandidateCvService.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/service/CandidateCvUploadService.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/service/impl/CandidateCvServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/common/security/CurrentUserResolver.java`
   - `backend/src/main/java/com/rikkei/jobs/common/security/JwtConfiguration.java`
   - `backend/src/main/java/com/rikkei/jobs/company/controller/HrJobDescriptionController.java`
   - `backend/src/main/java/com/rikkei/jobs/company/controller/JobDescriptionController.java`
   - `backend/src/main/java/com/rikkei/jobs/company/controller/StaffJobDescriptionController.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/CreateJobRequest.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/JobDescriptionResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/JobOwnershipResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/JobPageResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/UpdateJobStatusRequest.java`
   - `backend/src/main/java/com/rikkei/jobs/company/model/JobDescription.java`
   - `backend/src/main/java/com/rikkei/jobs/company/model/JobStatus.java`
   - `backend/src/main/java/com/rikkei/jobs/company/repository/JobDescriptionRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/company/service/CompanyJobService.java`
   - `backend/src/main/java/com/rikkei/jobs/company/service/impl/CompanyJobServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/controller/AuthenticationController.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/dto/AuthSessionResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/dto/CandidateSsoLoginRequest.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/dto/HrLoginRequest.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/exception/AuthenticationFailedException.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/service/impl/AuthServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/dto/UpdateApplicationStatusRequest.java`
   - `backend/src/test/java/com/rikkei/jobs/candidate/service/CandidateCvServiceTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/service/CompanyJobServiceTest.java`
   - `backend/src/test/java/com/rikkei/jobs/identity/controller/IdentityAuthenticationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/identity/service/AuthServiceImplTest.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/controller/CurrentUserResolverTest.java`
   - `frontend/src/shared/api/http.ts`
   - `frontend/src/shared/auth/AuthenticationPanel.test.tsx`
   - `frontend/src/shared/auth/AuthenticationPanel.tsx`
   - `frontend/src/shared/auth/authApi.ts`
   - `frontend/src/shared/auth/session.ts`
2. `T023552: feat(db): replace colliding migrations with forward V17, V19, V20 migrations and migration tests` (`19` files: `5 M`, `10 D`, `4 ??`)
   - `backend/src/main/resources/db/migration-dev/V3.1__seed_recruitment_dev_data.sql`
   - `backend/src/main/resources/db/migration-dev/V6.1__seed_company_jobs.sql`
   - `backend/src/main/resources/db/migration-dev/V8.1__seed_application_cv_snapshots.sql`
   - `backend/src/main/resources/db/migration/V3__create_recruitment_applications.sql`
   - `backend/src/main/resources/db/migration/V4__create_used_sso_tickets.sql`
   - `backend/src/main/resources/db/migration/V5__prevent_repeated_job_applications.sql`
   - `backend/src/main/resources/db/migration/V6__create_company_job_descriptions.sql`
   - `backend/src/main/resources/db/migration/V7__create_candidate_cv_files.sql`
   - `backend/src/main/resources/db/migration/V8__store_application_cv_snapshots.sql`
   - `backend/src/main/resources/db/migration/V9__allow_reapplication_after_withdraw.sql`
   - `backend/src/main/resources/db/migration/V17__create_recruitment_applications.sql`
   - `backend/src/main/resources/db/migration/V19__create_application_cv_snapshots.sql`
   - `backend/src/main/resources/db/migration-dev/V20__dev_recruitment_seed.sql`
   - `backend/src/test/java/com/rikkei/jobs/migration/CompanyMigrationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/DefaultProfileIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/FlywayMigrationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/InternshipMigrationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/ProfileSeparationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/RecruitmentMigrationIntegrationTest.java`
3. `T023552: feat(ports): expose identity HR recipients, company job queries, async config and CvPort boundary` (`14` files: `7 M`, `7 ??`)
   - `backend/src/main/java/com/rikkei/jobs/common/config/AsyncConfig.java`
   - `backend/src/main/java/com/rikkei/jobs/common/exception/GlobalExceptionHandler.java`
   - `backend/src/main/java/com/rikkei/jobs/common/security/RoutePolicyRegistry.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/JobApplicationInfoDto.java`
   - `backend/src/main/java/com/rikkei/jobs/company/repository/JobRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/company/service/JobQueryService.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/dto/HrRecipientDto.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/repository/UserRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/service/IdentityPublicService.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/service/impl/IdentityPublicServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/exception/CvServiceUnavailableException.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/CvPort.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/CvSnapshotPayload.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/RecruitmentCvPortConfig.java`
4. `T023552: feat(recruitment): implement UT-01 application flows, F1-F11 hardening and OpenAPI contracts` (`25` files: `23 M`, `2 ??`)
   - `backend/src/main/java/com/rikkei/jobs/recruitment/controller/CandidateApplicationController.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/controller/CvSnapshotDownloadSupport.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/controller/HrApplicationController.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/controller/JobApplicationController.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/dto/ApplicationDetailResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/dto/CvSnapshotDownload.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/dto/HrApplicationSummaryResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/exception/DuplicateApplicationException.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/exception/InvalidApplicationStateException.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/ApplicationSubmittedEvent.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/CvSnapshotData.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/CvSnapshotService.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/HrNotificationListener.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/JobSummaryDto.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/JobVerificationClient.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/model/Application.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/model/ApplicationCvSnapshot.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/model/ApplicationStatus.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/model/ApplicationStatusHistory.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/package-info.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/repository/ApplicationRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/repository/ApplicationStatusHistoryRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/service/ApplicationService.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/service/impl/ApplicationPersistenceTxService.java`
   - `backend/src/main/java/com/rikkei/jobs/recruitment/service/impl/ApplicationServiceImpl.java`
5. `T023552: test(recruitment): add backend unit, integration, concurrency, anti-N+1, RBAC and OpenAPI tests` (`15` files: `7 M`, `8 ??`)
   - `backend/src/test/java/com/rikkei/jobs/common/security/RoutePolicyRegistryTest.java`
   - `backend/src/test/java/com/rikkei/jobs/identity/service/IdentityPublicServiceImplTest.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/controller/ApplicationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/controller/CvSnapshotDownloadSupportTest.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/integration/CvPortUnavailableIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/integration/CvSnapshotServiceTest.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/integration/HrNotificationListenerTest.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/integration/InMemoryCvPortTestDouble.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/integration/JobVerificationClientTest.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/model/ApplicationStatusTest.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/service/ApplicationPersistenceAndAntiNPlusOneIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/service/ApplicationServiceTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/OpenApiCoverageIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/RbacPermissionMatrixIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java`
6. `T023552: feat(frontend): rebuild recruitment slice, wire candidate apply/tracking routes and add Vitest suite` (`39` files: `19 M`, `10 D`, `10 ??`)
   - `frontend/src/App.tsx`
   - `frontend/src/features/candidate/JobRecommendationsSection.test.tsx`
   - `frontend/src/features/candidate/JobRecommendationsSection.tsx`
   - `frontend/src/features/candidate/components/JobDetailPanel.test.tsx`
   - `frontend/src/features/candidate/components/JobDetailPanel.tsx`
   - `frontend/src/features/identity/__tests__/SharedAppLayout.test.tsx`
   - `frontend/src/features/identity/__tests__/roleUtils.test.ts`
   - `frontend/src/features/identity/config/roleMenuConfig.ts`
   - `frontend/src/features/identity/config/routePolicies.ts`
   - `frontend/src/features/recruitment/__tests__/ApplicationProgressStepper.test.tsx`
   - `frontend/src/features/recruitment/__tests__/ApplicationRouting.test.tsx`
   - `frontend/src/features/recruitment/__tests__/ApplyDialog.test.tsx`
   - `frontend/src/features/recruitment/__tests__/ApplyModal.test.tsx`
   - `frontend/src/features/recruitment/__tests__/CandidateJobsPage.test.tsx`
   - `frontend/src/features/recruitment/__tests__/HrApplicationsPage.test.tsx`
   - `frontend/src/features/recruitment/__tests__/MyApplicationsPage.test.tsx`
   - `frontend/src/features/recruitment/__tests__/recruitmentApi.test.ts`
   - `frontend/src/features/recruitment/api/applicationApi.ts`
   - `frontend/src/features/recruitment/api/recruitmentApi.ts`
   - `frontend/src/features/recruitment/components/ApplicationCard.tsx`
   - `frontend/src/features/recruitment/components/ApplicationDetailDrawer.tsx`
   - `frontend/src/features/recruitment/components/ApplicationDetailView.tsx`
   - `frontend/src/features/recruitment/components/ApplicationProgressStepper.tsx`
   - `frontend/src/features/recruitment/components/ApplicationStatusBadge.tsx`
   - `frontend/src/features/recruitment/components/ApplyDialog.tsx`
   - `frontend/src/features/recruitment/components/ApplyModal.tsx`
   - `frontend/src/features/recruitment/components/WithdrawDialog.tsx`
   - `frontend/src/features/recruitment/components/WithdrawModal.tsx`
   - `frontend/src/features/recruitment/components/dialogFocusUtils.ts`
   - `frontend/src/features/recruitment/index.ts`
   - `frontend/src/features/recruitment/pages/CandidateJobsPage.tsx`
   - `frontend/src/features/recruitment/pages/HrApplicationsPage.tsx`
   - `frontend/src/features/recruitment/pages/MyApplicationsPage.tsx`
   - `frontend/src/features/recruitment/styles/recruitment.css`
   - `frontend/src/features/recruitment/types.ts`
   - `frontend/src/shared/api/__tests__/httpClient.test.ts`
   - `frontend/src/shared/api/httpClient.ts`
   - `frontend/src/shared/components/Icon.test.tsx`
   - `frontend/src/shared/components/Icon.tsx`
7. `T023552: test(e2e): add opaque-box applications E2E suite and OpenAPI route assertions` (`3` files: `2 M`, `1 ??`)
   - `e2e/run-all.mjs`
   - `e2e/tier1-features/test_applications.test.mjs`
   - `e2e/tier1-features/test_openapi_docs.test.mjs`
8. `T023552: docs(ut01): add bilingual UT-01 documentation, browser observations, architecture update and PR description` (`5` files: `1 M`, `4 ??`)
   - `docs/01-architecture-overview.md`
   - `docs/ut01/BROWSER_OBSERVATIONS.md`
   - `docs/ut01/PHASE0_ACK.md`
   - `docs/ut01/PR_DESCRIPTION.md`
   - `docs/ut01/README.md`

---

## 7. Round UT-01-fix (`T023552`) — Defect Fixes M1 & D5

### 7.1. English

Round `UT-01-fix` (`T023552`) resolves review defects **M1** and **D5** on top of the `UT-01` baseline while keeping all `UT-01` work intact and uncommitted on `feature/T023552-candidate-application`:

- **M1 Changes, Config Variables & Corrected HR Link Contract**:
  - **Corrected HR Link Contract (`HrNotificationListener.java`)**: Replaced the dead `{frontendUrl}/hr/jobs/{jobId}/applications/{applicationId}` URL with `HR_HOME_PATH = "/hr"` built in `buildHrTargetUrl()`, matching `PROTECTED_ROUTE_POLICIES.hrHome.path` in `frontend/src/features/identity/config/routePolicies.ts` so `UT-02` can swap it in one line. Updated email body copy honestly (reporting new application with job title, company, and `#id` and inviting HR to sign in to follow recruitment without promising a detail page), while keeping `@TransactionalEventListener(AFTER_COMMIT)`, bounded `notificationTaskExecutor`, single PII-free error log, CR/LF subject sanitation, HTML escaping, and per-recipient error isolation.
  - **Config Variables (`APP_FRONTEND_URL`, `APP_MAIL_FROM`)**: Added dev defaults in `backend/src/main/resources/application.yml` (`app.frontend-url: ${APP_FRONTEND_URL:http://localhost:3000}`, `app.mail.from: ${APP_MAIL_FROM:no-reply@rikkeijobs.local}`), empty overrides in `application-prod.yml` so `prod` never falls back to dev defaults, fail-fast validation in `ProdEnvironmentValidator.java` (requiring `https://`, non-loopback/non-mock/non-`.local` host for `APP_FRONTEND_URL`, and valid plain email excluding `no-reply@rikkeijobs.local` for `APP_MAIL_FROM`), safe placeholders in `.env.example`, bilingual docs updates in `docs/04-security-secrets-policy.md` & `docs/02-local-development-troubleshooting.md`, and prod test fixtures across `ProdEnvironmentValidatorTest`, `ProdEnvironmentValidatorOrderingTest`, `Milestone2AdversarialStressTest`, `CompanyMigrationIntegrationTest`, `ProfileSeparationIntegrationTest`, `CompanyOpenApiProfileIntegrationTest`, `OpenApiCoverageIntegrationTest`, and `SecurityHardeningIntegrationTest`.
  - **Email Palette & Contrast**: Replaced `#1a56db` and non-palette colors in `HrNotificationListener.java` with constants mirroring `design-tokens.css` (`#0D55B8`, `#FFFFFF`, `#0B1A2C`, `#475B70`), keeping plain-text alternative and zero `<img>` tags.
  - **Real `MimeMessage` Proof & E2E Skip Alignment**: Extended `HrNotificationListenerTest` (`5/5`) using real Jakarta `MimeMessage` + stubbed `JavaMailSender` (`saveChanges()` before multipart inspection) to verify `From`, `To`, `Subject`, `/hr` target URL, zero `localhost` with prod URL, `<script>` HTML escaping, and per-recipient failure isolation. Updated `TC-T1-UT01-15` in `e2e/tier1-features/test_applications.test.mjs` (still skipped for Phase 2) to expect `/hr`.
- **`MailService.java` Unchanged Note (Team Lead Option 1, Item 3)**:
  - `backend/src/main/java/com/rikkei/jobs/identity/service/MailService.java` was kept **UNCHANGED** (`0` diff vs `origin/develop`). Because it reads `${app.frontend-url:http://localhost:3000}`, its covering backend suites were re-run and confirmed unchanged (`48/48` PASS across `IdentityPublicServiceImplTest` `6/6`, `AuthControllerIntegrationTest` `16/16`, `AdversarialSmtpResilienceStressTest` `2/2`, `PasswordResetTransactionHygieneTest` `1/1`, `AuthLoggingSanitizationTest` `2/2`, `CompanyControllerIntegrationTest` `9/9`, `CompanyServiceImplTest` `12/12`). Its pre-existing hard-coded colors (`#1a56db`, `#6b7280`) remain recorded as a future follow-up outside `UT-01-fix`.
- **D5 Candidate Home Copy Fix**:
  - Updated lines `830` and `832` in `frontend/src/features/identity/pages/role-homes/CandidateHomePage.tsx` (`"Hồ sơ ứng tuyển"` -> `"Trợ lý AI"`, `"Góp ý cải thiện CV và luyện phỏng vấn thử theo yêu cầu tin tuyển dụng."`) with zero style/layout/motion edits, and updated `RoleHomes.test.tsx` and `postLoginRedirect.test.tsx`.
- **Verification Summary (Raw Numbers)**:
  - **Backend**: `./mvnw spotless:check` (`354` files clean), `spotbugs:check` (`0` bugs), `clean test-compile` (`-Xlint:all -Werror`, `277` main + `77` test), and `./mvnw test` **`902/902`** PASS across `74` top-level classes (`+24` tests vs `878/74` baseline).
  - **Frontend**: `lint` (`0`), `typecheck` (`0`), Vitest **`40/473`** PASS (`0` `act()` warnings), Entry JS **`100.29 kB`** gzip (`<= 128.81 kB`), Entry CSS **`14.04 kB`** gzip (`+0 B`).
  - **Email & Token Contrast**: Email pairs WCAG 2.2 `>= 6.98:1` (`#0D55B8`/`#FFFFFF` = `6.98:1`, `#FFFFFF`/`#0D55B8` = `6.98:1`, `#0B1A2C`/`#FFFFFF` = `17.52:1`, `#475B70`/`#FFFFFF` = `7.00:1`); `node scripts/compute-contrast.mjs` **`120/120` PASS**; `.\check.ps1` **`26/26` PASS**; `./check.sh` **`26/26` PASS**.
  - **Docker E2E & Live `/browser`**: `docker compose up -d --build --wait` (`5/5` healthy) -> `node e2e/run-all.mjs` **`28/28`** suites, **`344`** cases, **`2153`** assertions (`+4` asserts from `/hr` assertions in `TC-T1-UT01-15`), **`1`** named skip (`TC-T1-UT01-15`) -> `docker compose down -v` (`0` leftovers); live `/browser` on `/candidate` (`1440` & `375` Light/Dark, `10` PNGs in `docs/ut01/pr-screenshots/`, indexed in `ORDER.txt`) **PASS** (`0` defects, `0` console errors, `0` HTTP `>= 400`).

#### File Inventory: UT-01 Baseline vs UT-01-fix Round

Verified 1:1 against `starting_git_status.txt` (`162` baseline entries) and `git status --porcelain -uall` (`175` total entries, excluding git-ignored `docs/ut01/pr-screenshots/`):

- **UT-01 Baseline (`162` starting paths)**:
  - **`151` UT-01 paths untouched in UT-01-fix**: All other paths from `UT-01` commits `1`–`8` above (`42` cleanup + `17` of `19` db/migration + `14` ports + `24` of `25` recruitment + `14` of `15` backend tests + `39` frontend recruitment + `2` of `3` E2E + `1` `docs/01-architecture-overview.md` minus the `11` UT-01 files updated further below = `151` untouched paths).
  - **`11` UT-01 paths updated further in UT-01-fix**: `HrNotificationListener.java`, `HrNotificationListenerTest.java`, `CompanyMigrationIntegrationTest.java`, `ProfileSeparationIntegrationTest.java`, `OpenApiCoverageIntegrationTest.java`, `SecurityHardeningIntegrationTest.java`, `e2e/tier1-features/test_applications.test.mjs`, `docs/ut01/PHASE0_ACK.md`, `docs/ut01/README.md`, `docs/ut01/BROWSER_OBSERVATIONS.md`, `docs/ut01/PR_DESCRIPTION.md`.
- **UT-01-fix Round (`24` files total = `13` new paths in `git status` + `11` UT-01 paths updated in UT-01-fix)**:
  - **`13` new paths not in starting `git status`**: `.env.example`, `ProdEnvironmentValidator.java`, `application.yml`, `application-prod.yml`, `ProdEnvironmentValidatorTest.java`, `ProdEnvironmentValidatorOrderingTest.java`, `Milestone2AdversarialStressTest.java`, `CompanyOpenApiProfileIntegrationTest.java`, `docs/02-local-development-troubleshooting.md`, `docs/04-security-secrets-policy.md`, `CandidateHomePage.tsx`, `RoleHomes.test.tsx`, `postLoginRedirect.test.tsx`.
  - **`11` UT-01 paths updated in UT-01-fix**: Listed above (`151 + 24 = 175` total entries in `git status --porcelain -uall`).

#### Ordered `T023552:` Commit Proposals (UT-01-fix Round Only — `24` Files)

1. `T023552: fix(recruitment): point HR notification email to /hr, align palette tokens and prove MimeMessage` (`2` files)
   - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/HrNotificationListener.java`
   - `backend/src/test/java/com/rikkei/jobs/recruitment/integration/HrNotificationListenerTest.java`
2. `T023552: feat(config): externalize APP_FRONTEND_URL and APP_MAIL_FROM with strict prod validation and tests` (`13` files)
   - `.env.example`
   - `backend/src/main/java/com/rikkei/jobs/common/config/ProdEnvironmentValidator.java`
   - `backend/src/main/resources/application-prod.yml`
   - `backend/src/main/resources/application.yml`
   - `backend/src/test/java/com/rikkei/jobs/challenger/Milestone2AdversarialStressTest.java`
   - `backend/src/test/java/com/rikkei/jobs/config/ProdEnvironmentValidatorOrderingTest.java`
   - `backend/src/test/java/com/rikkei/jobs/config/ProdEnvironmentValidatorTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/CompanyMigrationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/ProfileSeparationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/CompanyOpenApiProfileIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/OpenApiCoverageIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java`
   - `e2e/tier1-features/test_applications.test.mjs`
3. `T023552: fix(frontend): replace stale candidate coming-soon application entry with AI assistant copy` (`3` files)
   - `frontend/src/features/identity/pages/role-homes/CandidateHomePage.tsx`
   - `frontend/src/features/identity/__tests__/RoleHomes.test.tsx`
   - `frontend/src/features/identity/__tests__/postLoginRedirect.test.tsx`
4. `T023552: docs(ut01): document APP_FRONTEND_URL and APP_MAIL_FROM and append UT-01-fix closeout evidence` (`6` files)
   - `docs/02-local-development-troubleshooting.md`
   - `docs/04-security-secrets-policy.md`
   - `docs/ut01/BROWSER_OBSERVATIONS.md`
   - `docs/ut01/PHASE0_ACK.md`
   - `docs/ut01/PR_DESCRIPTION.md`
   - `docs/ut01/README.md`

### 7.2. Tiếng Việt

Vòng `UT-01-fix` (`T023552`) xử lý trọn vẹn hai lỗi review **M1** và **D5** trên nền `UT-01` (vẫn giữ nguyên trạng thái uncommitted/unstaged trên `feature/T023552-candidate-application`):

- **M1**: Đổi liên kết email HR sang `HR_HOME_PATH = "/hr"` (`buildHrTargetUrl()` khớp `PROTECTED_ROUTE_POLICIES.hrHome.path`), cập nhật nội dung trung thực, thay bảng màu bằng token từ `design-tokens.css` (tương phản WCAG `>= 6.98:1`), thêm `APP_FRONTEND_URL` & `APP_MAIL_FROM` trong `application.yml`, override rỗng ở `application-prod.yml`, kiểm tra chặt trong `ProdEnvironmentValidator` (bắt buộc `https://`, cấm loopback/mock/`.local` và placeholder dev), cập nhật `.env.example`, tài liệu `docs/04` & `docs/02`, `7` bộ test `prod`, `HrNotificationListenerTest` (`5/5` dùng `MimeMessage` thật với `JavaMailSender` stubbed) và assertion `/hr` trong `TC-T1-UT01-15` (vẫn skip Phase 2).
- **Ghi chú `MailService.java`**: Giữ nguyên `identity/service/MailService.java` theo Option 1 (3); `48/48` test thuộc 7 suite liên quan xác nhận không đổi hành vi với `app.frontend-url` trong YAML; màu hard-code `#1a56db`, `#6b7280` được ghi nhận làm follow-up sau vòng `UT-01-fix`.
- **D5**: Cập nhật mục `"Hồ sơ ứng tuyển"` thành `"Trợ lý AI"` tại `CandidateHomePage.tsx` (`830`, `832`) và cập nhật `RoleHomes.test.tsx`, `postLoginRedirect.test.tsx`.
- **Kiểm định thực tế & Danh mục tệp**: Backend `902/902` (`74` lớp), Frontend `40/473` (`0` `act()`, `100.29 kB` JS, `14.04 kB` CSS), `compute-contrast` `120/120`, `.\check.ps1` `26/26`, `./check.sh` `26/26`, Docker E2E `28/28` (`344` cases, `2153` assertions, `1` skip `TC-T1-UT01-15`), `/browser` `/candidate` (`1440`/`375` Sáng/Tối, `10` PNG trong `docs/ut01/pr-screenshots/` + `ORDER.txt`) PASS (`0` lỗi). Tách bạch rõ `151` tệp nền `UT-01` không chạm + `24` tệp vòng `UT-01-fix` (`13` mới + `11` tệp `UT-01` cập nhật thêm = `175` mục trong `git status --porcelain -uall`) cùng `4` đề xuất commit `T023552:` cho riêng `24` tệp này.

---

## 8. Round UT-01-modal (`T023552`) — Overlay Layering & Root Scroll Lock

### 8.1. English

Round `UT-01-modal` (`T023552`) resolves the Owner-reported scrolled Light-mode modal defect at the architectural source on `feature/T023552-candidate-application` (preserving all `175` uncommitted `UT-01` + `UT-01-fix` baseline items, `0` staged files, `0` backend/migration/dependency changes):

#### Problem & Measured Root Causes (Block A BEFORE vs Block B Pass 2 AFTER)

- **Root Cause 1 (Stacking Context Trap)**: `.rec-dialog-backdrop` (`position: fixed; z-index: 1300`) rendered inside `<main className="rj-dashboard-content">`, which declares `view-transition-name: rj-main-content` (`design-tokens.css`). Because `view-transition-name` establishes a stacking context, modal `z-index` competed only inside `<main>` while sticky `.rj-dashboard-nav` (`1100`) and `.rj-sidebar` (`1100`, `#FFFFFF` in Light mode) painted above `<main>`, drawing an undimmed white rectangle over the top-left backdrop.
- **Root Cause 2 (`body.style.overflow` Breaks Sticky & Shifts Layout)**: `ApplyDialog.tsx`, `WithdrawDialog.tsx`, and `SharedAppLayout.tsx` (mobile drawer) locked scroll via `document.body.style.overflow = 'hidden'`. Because `index.css` sets `html, body { overflow-x: clip; }`, `<body>` became an independent scroll container instead of propagating to the viewport, snapping sticky header/sidebar off-screen when scrolled and shifting page width by ~15 px on scrollbar removal.

| Measured Metric (`http://127.0.0.1:3000`, `lms-sv-001`) | Block A BEFORE (`1440x900` Light) | Block B Pass 2 AFTER (`1440` / `1024` / `768` / `375` Light & Dark) |
|---|---|---|
| `<header>` `y` (`scrollY >= 800`, `1440`) | `0 -> -900.00 px` (`deltaY = -900.00 px`) | `0 -> 0 px` (`deltaY = 0 px`, identical closed/open/after-close) |
| `<aside>` `y` (`scrollY >= 800`, `1440`) | `56 -> -843.20 px` (`deltaY = -899.20 px`; Team Lead at `797`: `56 -> -740 px`) | `56.8 -> 56.8 px` (`deltaY = 0 px`, identical closed/open/after-close) |
| `main.locator('[role="dialog"]').count()` | `1` (trapped inside `<main>`) | `0` (`ApplyDialog` and `WithdrawDialog` portaled to `document.body`) |
| 10-point hit-test (`5` header + `5` aside) | `HIT_THROUGH_TO_HEADER` / `HIT_THROUGH_TO_SIDEBAR` | **`10/10` intercepted by `div.rec-dialog-backdrop`** (both dialogs) |
| `documentElement.clientWidth` / `html.w` | `1425 -> 1440 px` (Team Lead `+15 px` shift) | `1424.8 -> 1424.8 px` (`deltaW = 0 px`), `1008.8`, `752.8`, `360 px` (`body.style = null`) |
| `mouse.wheel` & `PageDown`/`ArrowDown` locked | Body scrolled independently (`scrollTop = 0`) | **`delta html.y = 0`** in `+`/`-` over backdrop & dialog (`ApplyDialog`, `WithdrawDialog`, `375px` drawer); `Escape` restores wheel scroll |

#### Layering (`--rj-z-*`) & Reference-Counted Root Scroll-Lock Contract

- **Portal Choice (`T1a`)**: `ApplyDialog` and `WithdrawDialog` render via `ReactDOM.createPortal(..., document.body)` (SSR-guarded with `typeof document !== 'undefined'`). Native `<dialog>.showModal()` was rejected because `jsdom@31.0.0` lacks `HTMLDialogElement.prototype.showModal` (`undefined`) and native Top Layer would bury `<Select />` (which portals to `document.body`). All `view-transition-name` rules remain intact; route and circular theme transitions remain verified.
- **Tier-2 Semantic Z-Index Scale (`design-tokens.css`)**: `--rj-z-dropdown: 1000` -> `--rj-z-sticky: 1100` (`.rj-dashboard-nav`, desktop `.rj-sidebar`) -> `--rj-z-drawer-backdrop: 1200` (`.rj-sidebar-backdrop`) -> `--rj-z-drawer: 1250` (mobile `.rj-sidebar`) -> `--rj-z-modal-backdrop: 1300` (`.rec-dialog-backdrop`) -> `--rj-z-modal: 1400` (`.rec-dialog`) -> `--rj-z-popover: 1500` (`.rj-select-listbox`, `.rj-sidebar-tooltip`, `.rj-control-tooltip`) -> `--rj-z-toast: 1600` -> `--rj-z-skip-link: 1601` (`.rj-skip-link`).
- **Root Scroll Lock (`T2`)**: `frontend/src/shared/utils/scrollLock.ts` (`acquireScrollLock`, `getScrollLockCount`, `resetScrollLockForTests`) and `frontend/src/shared/hooks/useScrollLock.ts` (`useScrollLock(locked)`) set `data-scroll-locked="true"` on `<html>`, reference-counted for nested overlays, idempotent per release (React 19 `StrictMode` and SSR safe), restoring prior attribute values on `1 -> 0`. `design-tokens.css` defines `html { scrollbar-gutter: stable; }` and `html[data-scroll-locked="true"] { overflow: hidden; overscroll-behavior: none; }` (without `overflow-x: clip`, avoiding `overflow: clip hidden` in Vite LightningCSS). Non-passive (`{ passive: false }`) wheel and touch listeners block background scroll while allowing internal overlay scrolling away from 1px boundaries and preserving multi-touch pinch-zoom; `.rj-sidebar-backdrop` and `.rec-dialog-backdrop` set `overscroll-behavior: contain; touch-action: none;`.

#### T3 Overlay Defect-Class Audit (`frontend/src`)

| Component | File & Line Evidence | Status & Action |
|---|---|---|
| `ApplyDialog` | `ApplyDialog.tsx:62`, `recruitment.css:483-505` | **Fixed**: Portaled to `document.body`, `useScrollLock(true)`, `--rj-z-modal-backdrop`/`--rj-z-modal`, `event.defaultPrevented` guard |
| `WithdrawDialog` | `WithdrawDialog.tsx:48`, `recruitment.css:483-505` | **Fixed**: Portaled to `document.body`, `useScrollLock(true)`, `--rj-z-modal-backdrop`/`--rj-z-modal`, imported `recruitment.css` |
| `SharedAppLayout` mobile drawer/backdrop | `SharedAppLayout.tsx:210-245`, `identity.css:2159-2188` | **Fixed**: `useScrollLock(isMobileMenuOpen)`, `--rj-z-drawer-backdrop` (`1200`) / `--rj-z-drawer` (`1250`), `touch-action: none`, Option 1A guard |
| `Select` popover (`.rj-select-listbox`) | `Select.tsx:854`, `Select.css:171` | **Fixed**: Raised from `--rj-primitive-z-dropdown` (`1000`) to `--rj-z-popover` (`1500` > `--rj-z-modal` `1400`) |
| `.rj-sidebar-tooltip`, `.rj-control-tooltip` | `SharedAppLayout.tsx:557-688`, `ThemeSwitch.tsx:131`, `identity.css:1728` | **Verified OK**: Scoped inside sticky sidebar/header (`1100`), cleanly below modals (`1300+`); updated to `--rj-z-popover` |
| `.rj-skip-link` | `SharedAppLayout.tsx:423`, `identity.css:1342` | **Verified OK**: Direct child of `.rj-dashboard`, highest layer; tokenized to `var(--rj-z-skip-link)` |
| `.rj-dashboard-nav` & desktop `.rj-sidebar` | `identity.css:1373, 1463`, `design-tokens.css:774-780` | **Verified OK**: Sticky shell in root stacking context; tokenized to `var(--rj-z-sticky)` |
| `JobDetailPanel`, `CompetencyRadarVisual`, `.sp-aside`, inline alerts | `JobDetailPanel.tsx:73`, `CompetencyRadarVisual.tsx:542`, `SkillProfilePage.tsx:162` | **Verified OK**: Inline document flow (`<section>`, `<div>`, sticky `<aside>` without z-index); zero floating toasts in `frontend/src` |

#### Approved Option 1A Scope Extension, Option 2B Follow-ups & Out-of-Scope Observations

- **Approved Option 1A (`SharedAppLayout.tsx`)**: `handleDrawerKeyDown` checks `event.defaultPrevented` and `hasExternalModalDialog` (any `[role="dialog"][aria-modal="true"]` outside `sidebarRef.current`) so a portaled modal opened over the `375px` drawer retains its `Tab` trap and receives `Escape` first (`SharedAppLayout.test.tsx` regression test added).
- **Approved Option 2B Follow-ups (`Select.tsx` left untouched)**:
  1. Clicking empty space, group label, or padding inside `<ul className="rj-select-listbox" tabIndex={-1}>` moves focus off the `<button role="combobox">` trigger, so a subsequent `Escape` bypasses `Select`'s trigger handler and would dismiss a parent modal instead of the listbox first.
  2. Pre-existing `D9`: pressing `Enter` on a closed `<Select>` combobox does not open the listbox in live `/browser` interaction (`Space`, `ArrowDown`, and click open it normally).
- **Out-of-Scope `origin/develop` Observations (Reported Only)**:
  1. `@keyframes rj-drawer-slide-in` (`identity.css:2136-2145`, unchanged vs `origin/develop`) animates `opacity: 0 -> 1` with `translateX(-100%) -> 0` over `280ms`, causing slight transparency on mid-slide frames prior to settling (`asideBox.x === 0` after `> 280ms` is opaque `#FFFFFF` / dark).
  2. `ApplyDialog` initial focus lands on the first focusable element inside the dialog (`×` close button via `getFocusableElements`).

#### Files Changed in Round `UT-01-modal` (Mapped to Existing UT-01 Commit Groups)

*(Existing UT-01 commits `1`–`8` are NOT re-split; the `21` code/test/doc files + `2` canonical skills touched in `UT-01-modal` map cleanly into these existing groups.)*

- **Shared Design Tokens & Shared Utilities (new shared slice + existing shared assets)**:
  - `frontend/src/shared/styles/design-tokens.css` (modified — `--rj-z-*` scale, `html { scrollbar-gutter: stable; }`, `html[data-scroll-locked="true"]`)
  - `frontend/src/shared/components/Select.css` (modified — `var(--rj-z-popover)`)
  - `frontend/src/shared/utils/scrollLock.ts` (new — ref-counted root lock + `{ passive: false }` wheel/touch boundary guards)
  - `frontend/src/shared/hooks/useScrollLock.ts` (new — React hook wrapper)
  - `frontend/src/shared/utils/__tests__/scrollLock.test.ts` (new — `9` tests)
  - `frontend/src/shared/hooks/__tests__/useScrollLock.test.tsx` (new — `3` tests)
  - `frontend/src/shared/styles/__tests__/overlayLayeringContract.test.ts` (new — `8` CSS/source contract tests)
- **Shell (integrates with UT-01 Commit 6 `feat(frontend): ...`)**:
  - `frontend/src/features/identity/components/SharedAppLayout.tsx` (modified — `useScrollLock(isMobileMenuOpen)` + Option 1A guard)
  - `frontend/src/features/identity/styles/identity.css` (modified — `--rj-z-*` tokens + mobile `overscroll-behavior`/`touch-action`)
  - `frontend/src/features/identity/__tests__/SharedAppLayout.test.tsx` (modified — `36` tests, `html[data-scroll-locked]` + simultaneous drawer/modal test)
- **Recruitment Frontend (integrates into UT-01 Commit 6 `feat(frontend): ...`)**:
  - `frontend/src/features/recruitment/components/ApplyDialog.tsx` (modified — `createPortal`, `useScrollLock(true)`, `event.defaultPrevented` guard)
  - `frontend/src/features/recruitment/components/WithdrawDialog.tsx` (modified — `createPortal`, `useScrollLock(true)`, `event.defaultPrevented` guard, `recruitment.css` import)
  - `frontend/src/features/recruitment/styles/recruitment.css` (modified — `--rj-z-modal-backdrop`/`--rj-z-modal`, `overscroll-behavior`/`touch-action`)
  - `frontend/src/features/recruitment/__tests__/ApplyDialog.test.tsx` (modified — `11` tests)
  - `frontend/src/features/recruitment/__tests__/MyApplicationsPage.test.tsx` (modified — `17` tests)
  - `frontend/src/features/recruitment/__tests__/WithdrawDialog.test.tsx` (new — `1` test)
- **Docs & Agent Skills (integrates into UT-01 Commit 8 `docs(ut01): ...` + design/skills)**:
  - `docs/design/DESIGN_SYSTEM.md` (modified — Sections `3.2`, `12`, `14.2`, `14.3`, `14.6`)
  - `docs/ut01/PHASE0_ACK.md`, `docs/ut01/README.md`, `docs/ut01/BROWSER_OBSERVATIONS.md`, `docs/ut01/PR_DESCRIPTION.md` (appended only)
  - `agent-config/skills/frontend-visual-design/SKILL.md`, `agent-config/skills/frontend-motion-design/SKILL.md` (+ `4` synced mirrors under `.claude/skills/` and `.gemini/skills/`)
  - *(Git-ignored per `.gitignore`: `docs/ut01/pr-screenshots/ORDER.txt` Group 8 + `15` PNGs `100`, `100b`, `101`..`113`.)*

#### Verified Gate Summary (Round `UT-01-modal`)

- **Git & Baseline**: Branch `feature/T023552-candidate-application`, `git diff --cached --name-only` empty (`0`), `backend/pom.xml`, `docker-compose.yml`, `frontend/package.json`, `mock/package.json` `0` diff vs `origin/develop`, `15/15` `origin/develop` Flyway migrations SHA-256 identical.
- **Frontend**: `eslint` `0`, `tsc --noEmit` `0`, Vitest **`44 passed (44)` files / `497 passed (497)` tests** (`0` `act()` warnings), Vite build (`129` modules) Entry CSS **`14.17 kB`** gzip (`+0.13 kB` vs `14.04 kB`, cap `14.34 kB`), Entry JS + shared chunk **`102.12 kB`** gzip (`86.98 + 15.14`, cap `<= 128.81 kB`).
- **Repo Gates, Docker E2E & Live `/browser`**: `compute-contrast` **`120/120`**, `sync-agent-config --check` (`168` files), `validate-agent-config` **`10/10`**, `check-gate-sync` (`29/26/3/23/25`), `check-version-drift` (`32/32`), `markdownlint-cli2` `0`, `cspell` `0` (all `693` repo files), secret scan `0`, `.\check.ps1` **`26/26`**, `./check.sh` **`26/26`**, fresh Docker `node e2e/run-all.mjs` **`28/28` suites, `344` cases, `2153` assertions** (`1` skip `TC-T1-UT01-15`), `docker compose down -v` (`0` `rikkei` containers/volumes/networks), and live `/browser` Pass 2 **`0` defects**.

### 8.2. Tiếng Việt

Vòng `UT-01-modal` (`T023552`) khắc phục tận gốc hai nguyên nhân lỗi chồng lớp modal và tụt sticky header/sidebar ở Light mode trên nhánh `feature/T023552-candidate-application` (giữ nguyên toàn bộ baseline `UT-01` + `UT-01-fix` uncommitted, `0` tệp staged, `0` thay đổi backend/migration/dependency):

- **Hai nguyên nhân gốc & Số liệu Block A -> Block B Pass 2**: (1) `ApplyDialog`/`WithdrawDialog` render trong `<main>` có `view-transition-name: rj-main-content` nên bị giam stacking context dưới header/sidebar (`1100`), làm header nhảy `0 -> -900 px`, sidebar nhảy `56 -> -843.20 px` (`797`: `56 -> -740 px`), và hit-test bấm xuyên vào sidebar/header (`HIT_THROUGH_TO_SIDEBAR` / `HIT_THROUGH_TO_HEADER`); (2) `document.body.style.overflow = 'hidden'` dưới `overflow-x: clip` biến `body` thành scroll container riêng và làm lệch bề rộng `1425 -> 1440 px`. Sau khi sửa, `main.locator('[role="dialog"]').count() === 0`, **`10/10` điểm** header/aside bị `div.rec-dialog-backdrop` chặn đúng trên cả hai dialog, tọa độ đóng/mở/sau-đóng đồng nhất 100% (`delta = 0`), `mouse.wheel` +/- bị khóa (`delta html.y = 0`) trên `1440/1024/768/375` Sáng/Tối & mobile drawer `375px`, `clientWidth` bất biến (`1424.8 px`, `deltaW = 0`), `Escape` trả tiêu điểm chính xác về nút mở bằng bàn phím thật và khôi phục cuộn, Back/Forward/Reload không rò rỉ khóa.
- **Giải pháp kỹ thuật (`T1`–`T3`), Option 1A/2B & Tệp thay đổi**: Portal hai dialog ra `document.body` (từ chối `<dialog>.showModal()` vì `jsdom@31.0.0` thiếu `showModal` và Top Layer che mất `Select`), chuẩn hóa thang `--rj-z-*` (`1000..1601`) nâng `Select` lên `--rj-z-popover` (`1500`), tạo `scrollLock.ts` + `useScrollLock.ts` đếm tham chiếu trên `html[data-scroll-locked="true"]` kèm `scrollbar-gutter: stable` và listener `{ passive: false }`, kiểm toán toàn bộ overlay `frontend/src`, bổ sung guard Option 1A ở `SharedAppLayout.tsx`, ghi nhận follow-up Option 2B của `Select.tsx` và quan sát ngoài phạm vi (`origin/develop` `@keyframes rj-drawer-slide-in` `opacity: 0 -> 1` và focus nút `×`), phân bổ rõ danh mục tệp vào các nhóm commit `UT-01` hiện có (`shared design tokens`, `shell`, `recruitment frontend`, `docs/skills`).
- **Tổng hợp Gate**: Vitest **`44/44` file / `497/497` test** (`0` `act()`), Entry CSS `14.17 kB` (`+0.13 kB`), Entry JS + chunk `102.12 kB`, `compute-contrast` `120/120`, `validate-agent-config` `10/10`, `.\check.ps1` & `./check.sh` **`26/26`**, Docker E2E **`28/28` suites / `344` cases / `2153` assertions** (`1` skip), `docker compose down -v` sạch `0` tài nguyên, live `/browser` Pass 2 **`0` lỗi**.
