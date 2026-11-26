# `[TT-01]` Đồng bộ thực tập IOC vào hồ sơ (`T0239F9`)

> **GitHub Pull Request Title (without Markdown backticks)**: `[TT-01] Dong bo thuc tap IOC vao ho so (T0239F9)`

## Pull Request Metadata / Thông Tin Pull Request

- **Task Code / Mã nhiệm vụ**: `T0239F9`
- **Feature Code / Mã tính năng**: `[TT-01]`
- **Source Branch / Nhánh nguồn**: `feature/t0239f9-thuc-tap` (remediating PR `#17`)
- **Target Branch / Nhánh đích**: `develop` (`origin/develop @ da89a1e`)

---

## 1. Executive Summary & D1–D11 Remediation / Tóm Tắt Tổng Quan & Khắc Phục D1–D11

### 1.1. English

Round `TT-01-fix` (`T0239F9`) delivers the `[TT-01]` IOC internship synchronization feature into candidate profiles while resolving all `11` blocking defects (`D1`–`D11`) identified during the review of PR `#17`:

- **`D1` (Immutable Migrations & Evaluation API)**: Restored `V3__skill_profile.sql`, `V7__evaluation.sql`, `V4__dev_skill_profile_seed.sql`, `V8__dev_evaluation_seed.sql`, `Evaluation.java`, `CreateEvaluationRequest.java`, and `EvaluationResponse.java` byte-for-byte from `origin/develop` (`SHA-256` verified). Kept `evaluations.batch_id` (`BIGINT`) completely independent from `internships.batch_id` (`VARCHAR(255)` in `V15`).
- **`D2` (IDE Churn & Config Reverts)**: Restored `backend/pom.xml`, `backend/src/main/resources/application.yml` (PostgreSQL port `5433`), and `cspell.json` byte-for-byte from `origin/develop`; restored `e2e/tier1-features/test_openapi_docs.test.mjs` single-quote formatting with only the minimal path/schema additions for the two internship endpoints; restored barrel imports (`./features/company`, `./features/internship`) and removed trailing spaces in `frontend/src/App.tsx`.
- **`D3` (Remove Lombok & Adopt Immutable Records)**: Removed `lombok` and annotation processor entries from `backend/pom.xml` (`0` occurrences remain). Rewrote `PMInternshipResponse`, `PMInternshipTaskResponse`, `InternshipResponse`, and `InternshipTaskResponse` as immutable Java `record`s (`@JsonIgnoreProperties(ignoreUnknown = true)`), and rewrote `Internship` and `InternshipTask` as plain Java JPA entities without `@Data`/`@Builder`.
- **`D4` (Module Boundaries)**: Removed all cross-module `model` and `repository` imports from `com.rikkei.jobs.internship`. Converted `Internship.userId` to a scalar `Long userId` (no JPA relation to `User`, no cross-module FK in `V15`). Added `IdentityPublicService#findLmsUserIdByUserId(Long)` and `CandidatePublicService#recordPmInternshipResults(Long, List<PmInternshipResultCommand>)` (`PmInternshipResultCommand` record), reverted unneeded `candidate` openings (`ExternalRecord`, `SkillMappingRepository`), and documented contracts in `package-info.java` and `docs/01-architecture-overview.md`.
- **`D5` (Error Contract & Authorization Matrix)**: Replaced `ResponseStatusException` and raw `Illegal*Exception` throws with domain exceptions (`ValidationException`, `ResourceNotFoundException`, `ExternalUnavailableException`) mapped by `GlobalExceptionHandler` to unified `ErrorResponse { code, message }`. Validated `userId <= 0` (`400 VALIDATION_ERROR`) before `OwnershipGuard.requireSelfOrRoles` (`404 NOT_FOUND` byte-identical on cross-user IDOR and missing profiles) and aligned `RoutePolicyRegistry` + `@PreAuthorize` across all 5 roles (`401`, `403`, `404`, `400`, `200`).
- **`D6` (Fast-Fail Resilience & Transaction Split)**: Moved `ExternalApiClient#getStudentInternshipsFastFail(lmsUserId)` (`min(2500 ms, external.api.timeout-seconds * 1000 ms)`, `0` retries; other callers unchanged) strictly outside `@Transactional`. Split persistence into `InternshipPersistenceService` (`@Transactional(rollbackFor = Exception.class)` writes; `@Transactional(readOnly = true)` `@EntityGraph` reads, zero self-invocation). Restricted sync-on-read to `GET /api/v1/profiles/me/internships` (`200 OK` stale fallback with 1 PII-free `WARN` log on PM outage, `503 EXTERNAL_UNAVAILABLE` if empty); `GET /api/v1/profiles/{userId}/internships` performs stored-only DB reads and never calls PM.
- **`D7` (Idempotent Skill Evidence & Score Clamping)**: Keyed `external_records` upsert inside `CandidatePublicServiceImpl` strictly by `(candidateUserId, ExternalSource.PM, batchId)` (merging seamlessly with the `V4` seed row for `(1, 'PM', 'IOC-JB-2026-09')` without duplication). Skips `null` `finalScore` or blank `topicName`; computes `finalScore * 10` (`RoundingMode.HALF_UP`, 2 decimals, clamped `[0.00, 100.00]`); invokes `SkillRecomputeService#recomputeSkills` once; retains previously synced batches/tasks locally if omitted from later PM responses.
- **`D8` (`V15` Migration Quality & Numbering)**: Formatted `V15__create_internships_and_internship_tasks.sql` to `.sqlfluff` (`4`-space indent, PostgreSQL dialect), changed `synced_at` to `TIMESTAMPTZ NOT NULL DEFAULT NOW()` (`OffsetDateTime` in Java), aligned constraint/index names (`uq_internships_user_batch`, `uq_internship_tasks_internship_title`, `idx_internships_user_id`, `idx_internship_tasks_internship_id`), preserved odd production (`V1, V3, V5, V7, V9, V11, V13, V15` = `8`) and even dev (`15` total) numbering, and fixed all `4` migration-count integration test assertions and messages.
- **`D9` (Hermetic Tests)**: Added `InternshipSyncServiceTest` (`13`), `InternshipServiceImplTest` (`18`), `CandidatePublicServiceInternshipTest` (`11`), `InternshipControllerIntegrationTest` (`9`), `InternshipMigrationIntegrationTest` (`8`), and updated `RoutePolicyRegistryTest` + `OpenApiCoverageIntegrationTest`; added `CandidateInternships.test.tsx` (`17` tests, `0` `act()` warnings) and updated `roleUtils.test.ts` + `SharedAppLayout.test.tsx`; added and registered `e2e/tier1-features/test_internships.test.mjs` (`6` cases, `71` assertions).
- **`D10` (Frontend & `NT-02` Shell Integration)**: Registered `/candidate/internships` (`CANDIDATE` only) in `routePolicies.ts` and `"Thực tập IOC"` (`graduation-cap` icon) in `roleMenuConfig.ts`. Reverted `CandidateHomePage.tsx` byte-for-byte to `origin/develop` and kept `/candidate/skills` untouched. Fixed `fetchMyInternships(signal)` vs `fetchCandidateInternships(userId, signal)`, removed `getProfileInternships`, ensured a single `<h1>` across all states, set `roleTitle="Ứng viên"`, formatted `vi-VN` dates and `"Chưa có điểm"` for null scores, used authentic Vietnamese copy, and cleaned `candidateInternships.css` (`0` raw colors, `0` emojis, `tabular-nums`, design tokens only).
- **`D11` (Docs, OpenAPI & Blocked Items)**: Authored `docs/tt01/{PHASE0_ACK.md,README.md,PR_DESCRIPTION.md,pr-screenshots/ORDER.txt}`, updated `.gitignore`, `docs/mock-contract.md` Section 3.9, `docs/01-architecture-overview.md`, and OpenAPI annotations (`/api/api-docs` & `/api/docs`). Explicitly documented blocked scope:
  - **Portfolio `source=IOC` (`HS-03`)**: Blocked because no `portfolios` table, entity, or service exists in `origin/develop` (`0` DDL/entities invented).
  - **External PM System (`NT-05`)**: Production `lms-pm` integration is pending `NT-05`; `TT-01` calls the `mock` service via `ExternalApiClient#getStudentInternshipsFastFail`.

### 1.2. Tiếng Việt

Đợt hoàn thiện `TT-01-fix` (`T0239F9`) cung cấp tính năng đồng bộ thực tập IOC (`[TT-01]`) vào hồ sơ ứng viên đồng thời xử lý triệt để toàn bộ `11` lỗi chặn (`D1`–`D11`) từ PR `#17`:

- **`D1` (Migration bất biến & API Đánh giá)**: Khôi phục khớp từng byte từ `origin/develop` cho `V3__skill_profile.sql`, `V7__evaluation.sql`, `V4__dev_skill_profile_seed.sql`, `V8__dev_evaluation_seed.sql`, `Evaluation.java`, `CreateEvaluationRequest.java` và `EvaluationResponse.java` (đã đối chiếu `SHA-256`). Giữ `evaluations.batch_id` (`BIGINT`) tách biệt hoàn toàn với `internships.batch_id` (`VARCHAR(255)` trong `V15`).
- **`D2` (Dọn rác định dạng IDE & Cấu hình)**: Khôi phục khớp từng byte từ `origin/develop` cho `backend/pom.xml`, `application.yml` (cổng PostgreSQL `5433`) và `cspell.json`; khôi phục kiểu dấu nháy đơn trong `e2e/tier1-features/test_openapi_docs.test.mjs` chỉ giữ phần bổ sung tối thiểu cho `2` endpoint thực tập; khôi phục barrel import (`./features/company`, `./features/internship`) và xóa khoảng trắng thừa trong `frontend/src/App.tsx`.
- **`D3` (Gỡ Lombok & Dùng Java Record bất biến)**: Gỡ hoàn toàn `lombok` và annotation processor khỏi `backend/pom.xml` (còn `0` vết). Chuyển `PMInternshipResponse`, `PMInternshipTaskResponse`, `InternshipResponse` và `InternshipTaskResponse` sang Java `record` bất biến (`@JsonIgnoreProperties(ignoreUnknown = true)`), và viết `Internship` / `InternshipTask` thành entity JPA thuần không dùng `@Data`/`@Builder`.
- **`D4` (Ranh giới Module)**: Xóa toàn bộ import `model` và `repository` của module khác trong `com.rikkei.jobs.internship`. Lưu `Long userId` vô hướng trong `Internship` (không quan hệ JPA tới `User`, không khóa ngoại liên module trong `V15`). Bổ sung `IdentityPublicService#findLmsUserIdByUserId(Long)` và `CandidatePublicService#recordPmInternshipResults(Long, List<PmInternshipResultCommand>)` (`record` `PmInternshipResultCommand`), thu hồi các hàm/constructor mở rộng không cần thiết ở `ExternalRecord` và `SkillMappingRepository`, đồng thời cập nhật tài liệu hợp đồng trong `package-info.java` và `docs/01-architecture-overview.md`.
- **`D5` (Chuẩn lỗi & Ma trận Phân quyền/IDOR)**: Thay thế `ResponseStatusException` và `Illegal*Exception` bằng ngoại lệ miền (`ValidationException`, `ResourceNotFoundException`, `ExternalUnavailableException`) để `GlobalExceptionHandler` trả về `ErrorResponse { code, message }` thống nhất. Kiểm tra `userId <= 0` (`400 VALIDATION_ERROR`) trước `OwnershipGuard.requireSelfOrRoles` (`404 NOT_FOUND` giống hệt từng byte cho IDOR chéo người dùng và hồ sơ thiếu), đồng bộ `RoutePolicyRegistry` và `@PreAuthorize` cho cả 5 vai trò (`401`, `403`, `404`, `400`, `200`).
- **`D6` (Chịu lỗi Fast-Fail & Tách ranh giới giao dịch)**: Tách lệnh gọi `ExternalApiClient#getStudentInternshipsFastFail(lmsUserId)` (`min(2500 ms, external.api.timeout-seconds * 1000 ms)`, `0` retry; giữ nguyên hành vi các caller khác) ra ngoài `@Transactional`. Tách ghi/đọc sang bean `InternshipPersistenceService` (`@Transactional(rollbackFor = Exception.class)` khi ghi; `@Transactional(readOnly = true)` kèm `@EntityGraph` khi đọc, không tự gọi `this`). Chỉ đồng bộ khi đọc ở `GET /api/v1/profiles/me/internships` (trả `200 OK` dữ liệu cũ kèm đúng 1 log `WARN` không PII/bí mật khi PM lỗi, hoặc `503 EXTERNAL_UNAVAILABLE` nếu chưa có dữ liệu); `GET /api/v1/profiles/{userId}/internships` chỉ đọc DB và không gọi PM.
- **`D7` (Tính lũy đẳng bằng chứng kỹ năng & Kẹp điểm)**: Upsert `external_records` trong `CandidatePublicServiceImpl` theo đúng khóa `(candidateUserId, ExternalSource.PM, batchId)` (gộp sạch vào dòng seed `V4` `(1, 'PM', 'IOC-JB-2026-09')` không tạo bản sao). Bỏ qua nếu `finalScore` null hoặc `topicName` rỗng; quy đổi `finalScore * 10` (`RoundingMode.HALF_UP` 2 chữ số, kẹp `[0.00, 100.00]`), gọi `SkillRecomputeService#recomputeSkills` 1 lần và giữ nguyên dữ liệu lịch sử cục bộ nếu PM bỏ bớt đợt/hạng mục về sau.
- **`D8` (Chất lượng Migration `V15` & Đánh số)**: Định dạng `V15__create_internships_and_internship_tasks.sql` chuẩn `.sqlfluff` (4 dấu cách, PostgreSQL), đổi `synced_at` sang `TIMESTAMPTZ NOT NULL DEFAULT NOW()` (`OffsetDateTime` ở Java), đồng bộ tên ràng buộc/chỉ mục (`uq_internships_user_batch`, `uq_internship_tasks_internship_title`, `idx_internships_user_id`, `idx_internship_tasks_internship_id`), giữ nguyên quy ước migration production lẻ (`8` file `V1,3,5,7,9,11,13,15`) / dev (`15` file) và sửa cả `4` test đếm migration.
- **`D9` (Kiểm thử cô lập)**: Bổ sung `InternshipSyncServiceTest` (`13`), `InternshipServiceImplTest` (`18`), `CandidatePublicServiceInternshipTest` (`11`), `InternshipControllerIntegrationTest` (`9`), `InternshipMigrationIntegrationTest` (`8`), cập nhật `RoutePolicyRegistryTest` và `OpenApiCoverageIntegrationTest`; thêm `CandidateInternships.test.tsx` (`17` test, `0` cảnh báo `act()`) và cập nhật `roleUtils.test.ts` + `SharedAppLayout.test.tsx`; thêm và đăng ký `e2e/tier1-features/test_internships.test.mjs` (`6` case, `71` assertion).
- **`D10` (Chất lượng Frontend & Tích hợp Shell `NT-02`)**: Đăng ký tuyến `/candidate/internships` (`CANDIDATE`) trong `routePolicies.ts` và mục sidebar `"Thực tập IOC"` (biểu tượng `graduation-cap`) trong `roleMenuConfig.ts`. Hoàn nguyên `CandidateHomePage.tsx` khớp từng byte với `origin/develop` và giữ nguyên `/candidate/skills`. Tách `fetchMyInternships(signal)` và `fetchCandidateInternships(userId, signal)`, xóa `getProfileInternships`, bảo đảm duy nhất 1 thẻ `<h1>` trong mọi trạng thái, đặt `roleTitle="Ứng viên"`, định dạng ngày `vi-VN`, hiển thị `"Chưa có điểm"` khi điểm `null`, dùng tiếng Việt tự nhiên có dấu đầy đủ và dọn sạch `candidateInternships.css` (`0` mã màu thô, `0` emoji, `tabular-nums`, chỉ dùng design token).
- **`D11` (Tài liệu, OpenAPI & Hạng mục bị chặn)**: Hoàn thiện `docs/tt01/{PHASE0_ACK.md,README.md,PR_DESCRIPTION.md,pr-screenshots/ORDER.txt}`, `.gitignore`, `docs/mock-contract.md` Mục 3.9, `docs/01-architecture-overview.md` và chú thích OpenAPI (`/api/api-docs` & `/api/docs`). Công khai rõ phạm vi bị chặn:
  - **Portfolio `source=IOC` (`HS-03`)**: Bị chặn do nhánh `origin/develop` chưa có bảng, entity hay service `portfolios` (không tự ý tạo bảng).
  - **Tích hợp `lms-pm` thật (`NT-05`)**: Phụ thuộc `NT-05`; `TT-01` gọi dịch vụ `mock` qua `ExternalApiClient#getStudentInternshipsFastFail`.

---

## 2. How to Run & Sample Data / Hướng Dẫn Chạy & Dữ Liệu Mẫu

### 2.1. English

1. Copy `.env.example` to `.env` locally (never commit `.env`), boot the full 5-service stack with `docker compose up -d --build --wait`, run `node e2e/run-all.mjs`, and tear down cleanly with `docker compose down -v`.
2. Sign in via LMS SSO through the mock service (`http://127.0.0.1:9000`) or the frontend login page (`http://127.0.0.1:3000/login`):
   - `lms-sv-001` (`candidate1@rikkeijobs.test`, `user_id = 1`, `is_public = false`): has 1 synced internship batch `IOC-JB-2026-09` (`IOC Java Backend 09/2026`, `Nhóm 2`, topic `Hệ thống đặt lịch phòng họp`, mentor `mentor1@rikkeijobs.test`, `2026-09-07` to `2026-10-30`, `finalScore: 8.5`) and `3` accepted tasks (`API đặt phòng và kiểm trùng lịch` `9`, `Phân quyền quản trị phòng` `8`, `Báo cáo tần suất sử dụng phòng` `8.5`), mapped in `V4__dev_skill_profile_seed.sql` to `JAVA` (`0.3`), `SPRING_BOOT` (`0.3`), `TEAMWORK` (`0.2`), and `AGILE` (`0.2`).
   - `lms-sv-002` (`candidate2@rikkeijobs.test`, `user_id = 2`, `is_public = true`): returns `[]` (renders empty state `"Chưa có thông tin thực tập IOC"`).
   - Issue a 60-second SSO ticket via `POST http://127.0.0.1:9000/lms/sso/tickets` using the `X-Service-Key` header matching `EXTERNAL_SERVICE_KEY` from local `.env`, then exchange it at `POST http://127.0.0.1:8080/api/v1/auth/sso`.
3. OpenAPI (`dev` only): `http://127.0.0.1:8080/api/api-docs`, `http://127.0.0.1:8080/api/docs`, and `http://127.0.0.1:3000/api/docs`.

### 2.2. Tiếng Việt

1. Sao chép `.env.example` thành `.env` cục bộ (không commit `.env`), khởi động stack 5 dịch vụ bằng `docker compose up -d --build --wait`, chạy `node e2e/run-all.mjs` và dọn sạch bằng `docker compose down -v`.
2. Đăng nhập qua LMS SSO thông qua dịch vụ mock (`http://127.0.0.1:9000`) hoặc trang đăng nhập frontend (`http://127.0.0.1:3000/login`):
   - `lms-sv-001` (`candidate1@rikkeijobs.test`, `user_id = 1`, `is_public = false`): có 1 đợt thực tập `IOC-JB-2026-09` (`IOC Java Backend 09/2026`, `Nhóm 2`, đề tài `Hệ thống đặt lịch phòng họp`, mentor `mentor1@rikkeijobs.test`, `2026-09-07` đến `2026-10-30`, `finalScore: 8.5`) và `3` hạng mục nghiệm thu (`API đặt phòng và kiểm trùng lịch` `9`, `Phân quyền quản trị phòng` `8`, `Báo cáo tần suất sử dụng phòng` `8.5`), ánh xạ trong `V4__dev_skill_profile_seed.sql` tới `JAVA` (`0.3`), `SPRING_BOOT` (`0.3`), `TEAMWORK` (`0.2`), `AGILE` (`0.2`).
   - `lms-sv-002` (`candidate2@rikkeijobs.test`, `user_id = 2`, `is_public = true`): trả về `[]` (hiển thị trạng thái rỗng `"Chưa có thông tin thực tập IOC"`).
   - Cấp vé SSO 60 giây qua `POST http://127.0.0.1:9000/lms/sso/tickets` với header `X-Service-Key` khớp `EXTERNAL_SERVICE_KEY` trong `.env` cục bộ, rồi đổi vé tại `POST http://127.0.0.1:8080/api/v1/auth/sso`.
3. OpenAPI (chỉ bật ở `dev`): `http://127.0.0.1:8080/api/api-docs`, `http://127.0.0.1:8080/api/docs` và `http://127.0.0.1:3000/api/docs`.

---

## 3. Verified Raw Check Results / Kết Quả Kiểm Định Thực Tế

### 3.1. English

- **Backend Maven (`.\mvnw.cmd spotless:check spotbugs:check clean test-compile test` on JDK 25)**:
  - `spotless:check`: `305 / 305` Java files clean (`0` changes needed, exit `0`).
  - `spotbugs:check`: `BugInstance size is 0`, `Error size is 0` (exit `0`).
  - `clean test-compile` (`-Xlint:all -Werror -Xlint:-processing`): `239` main + `66` test source files compiled with `0` warnings (exit `0`).
  - `test`: **`Tests run: 701, Failures: 0, Errors: 0, Skipped: 0`** across `64` Surefire report sets (`BUILD SUCCESS`, up `+60` tests from baseline `641`).
  - Protected `origin/develop` `SHA-256` parity (`10/10` backend files + `cspell.json` + `CandidateHomePage.tsx`): verified equal; `git grep -i "lombok" backend/` empty; `git grep` boundary check in `com.rikkei.jobs.internship` for external `model`/`repository` empty.
- **SQLFluff & Flyway Upgrade Proof (`postgres:18.6-alpine`, Flyway `12.4.0`)**:
  - `sqlfluff/sqlfluff:4.5.0 lint backend/src/main/resources/db/migration`: `All Finished!` (`0` errors, exit `0`).
  - **PROD Upgrade (`origin/develop` `V1..V13` -> branch `V15` on same DB volume)**: `7` executed -> `Successfully validated 8 migrations`, `Migrating schema "public" to version "15 - create internships and internship tasks"`, `VALIDATED_COUNT=8 INVALID_COUNT=0` (`0` checksum errors).
  - **DEV Upgrade (`origin/develop` `V1..V14` -> branch `V15` on same DB volume)**: `14` executed -> `Successfully validated 15 migrations`, `Migrating schema "public" to version "15 - create internships and internship tasks"`, `VALIDATED_COUNT=15 INVALID_COUNT=0` (`0` checksum errors).
- **Frontend (`npm run lint`, `typecheck`, `test`, `build` in `frontend/`)**:
  - `eslint .`: `0` errors (exit `0`).
  - `tsc --noEmit`: `0` errors (exit `0`).
  - `vitest run --run`: **`Test Files 33 passed (33), Tests 359 passed (359)`**, **`0` React `act(...)` warnings** (up `+17` tests from baseline `342`).
  - `vite build`: `118` modules transformed (`dist/assets/index-*.js`), exit `0`.
- **Mock, Repo Scripts, Linters & Quality Gates**:
  - `node mock/test-runner.js`: **`8 / 8`** self-checks + Cloudinary mock extension PASS (exit `0`).
  - `node scripts/compute-contrast.mjs`: **`120 / 120`** color pairs PASS (`0` violations).
  - `node scripts/sync-agent-config.mjs --check`: `168` mirror files, `0` drift (exit `0`).
  - `node scripts/validate-agent-config.mjs`: `10 / 10` checks PASS (`215` artifacts, `0` issues).
  - `node scripts/check-gate-sync.mjs`: PASS (`29` definitions: `26` active + `3` fallbacks, matching `23` CI & `25` Docker CI gates).
  - `node scripts/check-version-drift.mjs`: PASS (`32` manifest versions aligned).
  - `markdownlint-cli2` & `cspell` (`cspell@10.4.1` + `@cspell/dict-vi-vn@3.0.7`): `0` issues on `docs/tt01/PR_DESCRIPTION.md` and full repo scan (`600` files, `0` issues).
  - `.\check.ps1` & `./check.sh`: **`26 / 26 [PASS]`** on both PowerShell and Git Bash (exit `0`).
- **Fresh Docker Compose Stack, E2E, OpenAPI & Teardown**:
  - `docker compose up -d --build --wait`: **`5 / 5` containers `(healthy)`** (`postgres`, `mock`, `mailpit`, `backend`, `frontend`).
  - `node e2e/run-all.mjs`: **`27 / 27` suites, `329 / 329` cases, `2020` assertions** (`11205` lines, `42.58s`, exit `0`), including `test_internships.test.mjs` (`6` tests, `71` asserts) and `test_openapi_docs.test.mjs` (`6` tests, `76` asserts).
  - Live OpenAPI: `GET http://127.0.0.1:8080/api/api-docs` -> `HTTP 200` (OpenAPI `3.1.0`, `27` paths), `GET http://127.0.0.1:3000/api/api-docs` -> `HTTP 200`, `GET http://127.0.0.1:3000/api/docs` -> `HTTP 200` (Swagger UI listing both endpoints with `200/400/401/403/404/503` and `ErrorResponse`).
  - Final cleanup `docker compose down -v`: `docker ps -a --filter "name=rikkei"`, `docker volume ls --filter "name=rikkei"`, and `docker network ls --filter "name=rikkei"` all return `0` resources.
- **Live HTTP & PostgreSQL Proofs (`D5`, `D6`, `D7`)**:
  - **D5 RBAC/IDOR**: Anonymous -> `401 UNAUTHORIZED`; `sv1 -> /me/internships` & `/1/internships` -> `200`; `sv1 -> /2/internships` (cross-user IDOR) & `/99999/internships` -> byte-identical `404 NOT_FOUND`; `sv1 -> /0/internships` & `/abc/internships` -> `400 VALIDATION_ERROR`; `mentor1`/`staff1`/`admin1` -> `403 FORBIDDEN`; `hr1` (`mustChangePassword=true`) -> `403 MUST_CHANGE_PASSWORD`; `hr2 -> /me/internships` -> `403 FORBIDDEN`; `hr2 -> /2/internships` (`is_public=true`) -> `200 []`; `hr2 -> /1/internships` (`is_public=false`) & `/99999/internships` -> byte-identical `404 NOT_FOUND`.
  - **D6 Fast-Fail & Stale Degradation (`docker compose stop mock`)**: `sv1` (synced) `GET /api/v1/profiles/me/internships` returned **`HTTP 200` in `2542.51 ms`** (`attempt 1/1`, `1` PII-free `WARN` log: `PM internship sync failed for userId=1, returning 1 cached record(s)`); `sv3` (unsynced) returned **`HTTP 503 EXTERNAL_UNAVAILABLE`** (`attempt 1/1`, `3980.84 ms` wall-clock due to ~1.4 s Docker internal DNS resolution before `connectTimeout(2500 ms)`); `hr2 -> /2/internships` (`10.42 ms`) and `sv1 -> /1/internships` (`10.32 ms`) returned `200` from DB without calling PM.
  - **D7 Idempotency & DB State**: After repeated `/me/internships` calls, PostgreSQL holds `1` row in `internships`, `3` rows in `internship_tasks`, and **`1` row** in `external_records` for `(user_id=1, source='PM', source_code='IOC-JB-2026-09')` (`title='Hệ thống đặt lịch phòng họp'`, `score=85.00`), yielding `1` `INTERNSHIP` evidence per skill (`JAVA`, `SPRING_BOOT`, `AGILE`, `TEAMWORK`) in `GET /api/v1/profiles/me/skills`.
- **Live `/browser` Verification & Honest Sandbox Disclosure**:
  - Live `/browser` journeys passed with `0` defects across `lms-sv-001` (batch `IOC-JB-2026-09` + 3 tasks), `lms-sv-002` (empty state), sidebar navigation (`"Thực tập IOC"` active), `375 / 768 / 1024 / 1440` Light & Dark modes, and Swagger UI `/api/docs` (documented by the `8` screenshots in `docs/tt01/pr-screenshots/`).
  - **Honest Sandbox Disclosure (`webview_browser`)**: Antigravity `webview_browser` blocks `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, `page.request`, and `page.route`. Therefore, programmatic DOM `scrollWidth` / `CLS` JS probes and `emulateMedia` dark-mode checks could not be executed inside `webview_browser`; responsive layouts, zero visual horizontal clipping/overflow, and theme switching were verified visually via the `8` captured screenshots and live UI interaction, while `prefers-reduced-motion` and color contrast pairs (`120/120`) were verified statically.

### 3.2. Tiếng Việt

- **Backend Maven (`.\mvnw.cmd spotless:check spotbugs:check clean test-compile test` trên JDK 25)**:
  - `spotless:check`: `305 / 305` tệp Java sạch (`0` lỗi, exit `0`).
  - `spotbugs:check`: `0` cảnh báo/lỗi (exit `0`).
  - `clean test-compile` (`-Xlint:all -Werror -Xlint:-processing`): biên dịch sạch `239` tệp nguồn chính + `66` tệp test với `0` cảnh báo (exit `0`).
  - `test`: **`Tests run: 701, Failures: 0, Errors: 0, Skipped: 0`** trên `64` bộ báo cáo Surefire (`BUILD SUCCESS`, tăng `+60` test so với nền `641`).
  - Đối khớp `SHA-256` với `origin/develop` (`10/10` tệp backend bảo vệ + `cspell.json` + `CandidateHomePage.tsx`): trùng khớp 100%; không còn `lombok` và không còn import `model`/`repository` liên module trong `com.rikkei.jobs.internship`.
- **SQLFluff & Bằng chứng nâng cấp Flyway (`postgres:18.6-alpine`, Flyway `12.4.0`)**:
  - `sqlfluff/sqlfluff:4.5.0 lint backend/src/main/resources/db/migration`: `All Finished!` (`0` lỗi, exit `0`).
  - **Nâng cấp PROD (`origin/develop` `V1..V13` -> nhánh `V15` trên cùng volume CSDL)**: `7` -> `8` migration xác thực hợp lệ, chạy `V15`, `VALIDATED_COUNT=8 INVALID_COUNT=0` (`0` lỗi checksum).
  - **Nâng cấp DEV (`origin/develop` `V1..V14` -> nhánh `V15` trên cùng volume CSDL)**: `14` -> `15` migration xác thực hợp lệ, chạy `V15`, `VALIDATED_COUNT=15 INVALID_COUNT=0` (`0` lỗi checksum).
- **Frontend (`npm run lint`, `typecheck`, `test`, `build` trong `frontend/`)**:
  - `eslint .`: `0` lỗi; `tsc --noEmit`: `0` lỗi; `vite build`: `118` module (exit `0`).
  - `vitest run --run`: **`33` tệp / `359` test PASS**, **`0` cảnh báo React `act(...)`** (tăng `+17` test so với nền `342`).
- **Mock, Script kiểm tra, Linter & Cổng chất lượng**:
  - `node mock/test-runner.js`: **`8 / 8`** PASS; `node scripts/compute-contrast.mjs`: **`120 / 120`** cặp màu PASS; `sync-agent-config.mjs --check`: `168` tệp khớp 100%; `validate-agent-config.mjs`: `10 / 10` PASS; `check-gate-sync.mjs`: PASS (`29/26/3/23/25`); `check-version-drift.mjs`: PASS (`32` phiên bản); `markdownlint-cli2` & `cspell`: `0` lỗi; `.\check.ps1` & `./check.sh`: **`26 / 26 [PASS]`**.
- **Stack Docker Compose sạch, E2E, OpenAPI & Dọn dẹp**:
  - `docker compose up -d --build --wait`: **`5 / 5` container `(healthy)`**; `node e2e/run-all.mjs`: **`27 / 27` suite, `329 / 329` case, `2020` assertion** (`42.58s`, exit `0`).
  - OpenAPI trực tiếp: `GET http://127.0.0.1:8080/api/api-docs` (`200 OK`, OpenAPI `3.1.0`, `27` paths), `http://127.0.0.1:3000/api/api-docs` (`200 OK`), `http://127.0.0.1:3000/api/docs` (`200 OK`, Swagger UI đủ `200/400/401/403/404/503` và `ErrorResponse`).
  - Dọn sạch `docker compose down -v`: `docker ps -a`, `docker volume ls`, `docker network ls` lọc `rikkei` đều còn `0` tài nguyên.
- **Bằng chứng HTTP & PostgreSQL trực tiếp (`D5`, `D6`, `D7`)**:
  - **D5 RBAC/IDOR**: Ẩn danh `401`; `sv1` xem chính chủ `200`; `sv1` xem `2` hoặc `99999` -> `404` giống hệt từng byte; `userId` `0`/`abc` -> `400`; `mentor1`/`staff1`/`admin1` -> `403 FORBIDDEN`; `hr1` -> `403 MUST_CHANGE_PASSWORD`; `hr2` xem `/me` `403`, xem `/2` (`is_public=true`) `200 []`, xem `/1` (`is_public=false`) & `/99999` -> `404` giống hệt từng byte.
  - **D6 Fast-Fail & Suy giảm khi dừng `mock`**: `sv1` (đã có dữ liệu) trả **`200 OK` trong `2542.51 ms`** (`attempt 1/1`, đúng `1` dòng log `WARN` không PII/bí mật); `sv3` (chưa có dữ liệu) trả **`503 EXTERNAL_UNAVAILABLE`** (`attempt 1/1`, tổng thời gian `3980.84 ms` gồm ~1.4 giây DNS nội bộ Docker trước `connectTimeout(2500 ms)`); `hr2 -> /2` (`10.42 ms`) và `sv1 -> /1` (`10.32 ms`) đọc DB trực tiếp không gọi PM.
  - **D7 Tính lũy đẳng & CSDL**: Sau nhiều lần gọi `/me/internships`, PostgreSQL chỉ có `1` dòng `internships`, `3` dòng `internship_tasks`, và **`1` dòng** `external_records` cho `(user_id=1, source='PM', source_code='IOC-JB-2026-09')` (`score=85.00`), hiển thị `1` bằng chứng `INTERNSHIP` cho mỗi kỹ năng (`JAVA`, `SPRING_BOOT`, `AGILE`, `TEAMWORK`).
- **Kiểm tra `/browser` thực tế & Công khai giới hạn sandbox**:
  - Đã kiểm tra `/browser` thực tế đạt `0` lỗi qua các hành trình `lms-sv-001` (đợt `IOC-JB-2026-09` + 3 hạng mục), `lms-sv-002` (trạng thái rỗng), điều hướng sidebar (`"Thực tập IOC"`), độ phân giải `375 / 768 / 1024 / 1440` Sáng & Tối, và Swagger UI `/api/docs` (lưu `8` ảnh trong `docs/tt01/pr-screenshots/`).
  - **Công khai trung thực giới hạn `webview_browser`**: Công cụ `webview_browser` chặn `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, `page.request` và `page.route`. Do đó các phép đo DOM qua JS (`scrollWidth`, `CLS`) và `emulateMedia` không thể chạy bên trong `webview_browser`; bố cục đáp ứng, không tràn ngang trực quan và chuyển đổi Sáng/Tối được kiểm chứng trực tiếp qua `8` ảnh chụp và tương tác UI, trong khi `prefers-reduced-motion` và tương phản màu (`120/120`) được kiểm chứng tĩnh.

---

## 4. PR Screenshots (`8` PNGs, Git-Ignored) / Ảnh Màn Hình PR (`8` Ảnh, Git-Ignored)

- **English**: All `8` curated screenshots are stored in git-ignored `docs/tt01/pr-screenshots/` (verified via `git check-ignore -v docs/tt01/pr-screenshots/` matching `.gitignore` line 102) and indexed 1:1 in `docs/tt01/pr-screenshots/ORDER.txt`:
- **Tiếng Việt**: Toàn bộ `8` ảnh màn hình được lưu trong thư mục bị git-ignore `docs/tt01/pr-screenshots/` (đã xác minh qua `git check-ignore -v docs/tt01/pr-screenshots/` khớp dòng 102 `.gitignore`) và lập chỉ mục 1:1 trong `docs/tt01/pr-screenshots/ORDER.txt`:

1. `01-sv001-internships-1440-light.png` — `CANDIDATE` `lms-sv-001` `/candidate/internships` (`IOC-JB-2026-09`, `8.50/10`, `3` tasks) at `1440px` Light / Giao diện `1440px` Sáng (`lms-sv-001`, 1 đợt, `8.50/10`, 3 hạng mục)
2. `02-sv001-internships-1440-dark.png` — `CANDIDATE` `lms-sv-001` `/candidate/internships` at `1440px` Dark / Giao diện `1440px` Tối
3. `03-sv001-internships-1024-light.png` — `CANDIDATE` `lms-sv-001` `/candidate/internships` at `1024px` Light (`0` overflow) / Giao diện `1024px` Sáng (`0` tràn ngang)
4. `04-sv001-internships-768-light.png` — `CANDIDATE` `lms-sv-001` `/candidate/internships` at `768px` Light (`0` overflow) / Giao diện `768px` Sáng (`0` tràn ngang)
5. `05-sv001-internships-375-light.png` — `CANDIDATE` `lms-sv-001` `/candidate/internships` at `375px` Light (mobile drawer + stacked stats) / Giao diện mobile `375px` Sáng
6. `06-sv001-internships-375-dark.png` — `CANDIDATE` `lms-sv-001` `/candidate/internships` at `375px` Dark / Giao diện mobile `375px` Tối
7. `07-sv002-empty-state-1440-light.png` — `CANDIDATE` `lms-sv-002` `/candidate/internships` empty state (`"Chưa có thông tin thực tập IOC"`) at `1440px` Light / Trạng thái rỗng (`lms-sv-002`)
8. `08-swagger-api-docs-1440-light.png` — Swagger UI `/api/docs` showing `Candidate Profile - Internships` & `GET /api/v1/profiles/{userId}/internships` at `1440px` Light / Giao diện Swagger UI `/api/docs`

---

## 5. Ordered Commit Proposals / Đề Xuất Chuỗi Commit Theo Thứ Tự

- **English**: The `7` ordered commits below cover `71 / 71` TT-01 modified (`58`) and untracked (`13`, including `docs/tt01/PR_DESCRIPTION.md`) files in `git status --porcelain -uall` (`0` missing, `0` extra, `0` duplicates). `docs/tt01/pr-screenshots/` (`8` PNGs + `ORDER.txt`) is git-ignored per `.gitignore`.
- **Tiếng Việt**: `7` commit theo thứ tự dưới đây bao phủ đầy đủ `71 / 71` tệp thuộc phạm vi TT-01 (`58` tệp sửa và `13` tệp mới chưa theo dõi, bao gồm `docs/tt01/PR_DESCRIPTION.md`) trong `git status --porcelain -uall` (`0` thiếu, `0` thừa, `0` trùng). Thư mục `docs/tt01/pr-screenshots/` (`8` PNG + `ORDER.txt`) được bỏ qua bởi `.gitignore`.

1. `T0239F9: fix(hygiene): restore immutable migrations, evaluation API, pom.xml, configs and CandidateHomePage to origin/develop`
   - `backend/pom.xml`
   - `backend/src/main/java/com/rikkei/jobs/assessment/dto/request/CreateEvaluationRequest.java`
   - `backend/src/main/java/com/rikkei/jobs/assessment/dto/response/EvaluationResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/assessment/model/Evaluation.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/repository/SkillMappingRepository.java`
   - `backend/src/main/resources/application.yml`
   - `backend/src/main/resources/db/migration/V3__skill_profile.sql`
   - `backend/src/main/resources/db/migration/V7__evaluation.sql`
   - `backend/src/main/resources/db/migration-dev/V4__dev_skill_profile_seed.sql`
   - `backend/src/main/resources/db/migration-dev/V8__dev_evaluation_seed.sql`
   - `cspell.json`
   - `frontend/src/features/identity/pages/role-homes/CandidateHomePage.tsx`
2. `T0239F9: feat(db): format V15 internship migration with TIMESTAMPTZ, aligned constraints and migration-count tests`
   - `backend/src/main/resources/db/migration/V15__create_internships_and_internship_tasks.sql`
   - `backend/src/test/java/com/rikkei/jobs/migration/CompanyMigrationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/DefaultProfileIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/InternshipMigrationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/ProfileSeparationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java`
3. `T0239F9: feat(internship): remove Lombok, enforce module boundaries, D5/D6/D7 resilience and OpenAPI contracts`
   - `backend/src/main/java/com/rikkei/jobs/candidate/dto/PmInternshipResultCommand.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/model/ExternalRecord.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/package-info.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/repository/ExternalRecordRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/service/CandidatePublicService.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/service/impl/CandidatePublicServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/common/client/ExternalApiClient.java`
   - `backend/src/main/java/com/rikkei/jobs/common/security/RoutePolicyRegistry.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/package-info.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/service/IdentityPublicService.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/service/impl/IdentityPublicServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/controller/InternshipProfileController.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/dto/InternshipResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/dto/PMInternshipResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/dto/PMInternshipTaskResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/model/Internship.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/model/InternshipTask.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/package-info.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/repository/InternshipRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/repository/InternshipTaskRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/service/InternshipPersistenceService.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/service/InternshipSyncService.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/service/impl/InternshipPersistenceServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/service/impl/InternshipServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/internship/service/impl/InternshipSyncServiceImpl.java`
4. `T0239F9: test(internship): add hermetic backend unit, integration, RBAC and OpenAPI tests`
   - `backend/src/test/java/com/rikkei/jobs/candidate/CandidatePublicServiceInternshipTest.java`
   - `backend/src/test/java/com/rikkei/jobs/common/security/RoutePolicyRegistryTest.java`
   - `backend/src/test/java/com/rikkei/jobs/internship/InternshipControllerIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/internship/InternshipServiceImplTest.java`
   - `backend/src/test/java/com/rikkei/jobs/internship/InternshipSyncServiceTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/OpenApiCoverageIntegrationTest.java`
5. `T0239F9: feat(frontend): integrate /candidate/internships into NT-02 shell, fix semantics/CSS and add Vitest coverage`
   - `frontend/src/App.tsx`
   - `frontend/src/features/identity/__tests__/SharedAppLayout.test.tsx`
   - `frontend/src/features/identity/__tests__/roleUtils.test.ts`
   - `frontend/src/features/identity/config/roleMenuConfig.ts`
   - `frontend/src/features/identity/config/routePolicies.ts`
   - `frontend/src/features/internship/__tests__/CandidateInternships.test.tsx`
   - `frontend/src/features/internship/api/candidateInternships.ts`
   - `frontend/src/features/internship/components/CandidateInternships.tsx`
   - `frontend/src/features/internship/components/InternshipCard.tsx`
   - `frontend/src/features/internship/index.ts`
   - `frontend/src/features/internship/pages/CandidateInternshipsPage.tsx`
   - `frontend/src/features/internship/styles/candidateInternships.css`
   - `frontend/src/features/internship/types.ts`
6. `T0239F9: test(e2e): add opaque-box internships E2E suite and minimal OpenAPI path assertions`
   - `e2e/run-all.mjs`
   - `e2e/tier1-features/test_internships.test.mjs`
   - `e2e/tier1-features/test_openapi_docs.test.mjs`
7. `T0239F9: docs(tt01): add bilingual TT-01 docs, architecture/mock contract updates, .gitignore and PR description`
   - `.gitignore`
   - `docs/01-architecture-overview.md`
   - `docs/mock-contract.md`
   - `docs/tt01/PHASE0_ACK.md`
   - `docs/tt01/PR_DESCRIPTION.md`
   - `docs/tt01/README.md`

### Out-of-Scope Pre-Existing Untracked Files Note / Ghi Chú Tệp Ngoài Phạm Vi Có Sẵn

- **English**: `git status --porcelain -uall` also reports `90` untracked files inside the `UI/UX` `pr-screenshots` subfolder under `docs/` (`ORDER.txt` plus `89` PNG screenshots: `m4-01..15`, `m4b-01..12`, `m4b-seq-*`, `m7-01..28`, `owner-report-login-left-clipped.png`, `radar-01..09`, `radar-11..22`). These `90` files are leftovers from the `UI/UX` round (showing as untracked only because this branch's `.gitignore` does not list that subfolder). Per Team Lead decision, they are kept completely untouched, not added to `.gitignore`, and explicitly excluded as out-of-scope from all `T0239F9` commits.
- **Tiếng Việt**: `git status --porcelain -uall` còn liệt kê `90` tệp chưa theo dõi trong thư mục con `pr-screenshots` của đợt `UI/UX` thuộc `docs/` (`ORDER.txt` cùng `89` ảnh PNG: `m4-01..15`, `m4b-01..12`, `m4b-seq-*`, `m7-01..28`, `owner-report-login-left-clipped.png`, `radar-01..09`, `radar-11..22`). Toàn bộ `90` tệp này là tệp tồn lưu từ đợt `UI/UX` (chỉ hiển thị chưa theo dõi vì `.gitignore` của nhánh hiện tại không liệt kê thư mục con đó). Theo quyết định của Team Lead, các tệp này được giữ nguyên hoàn toàn không chạm tới, không thêm vào `.gitignore` và được loại trừ rõ ràng ngoài phạm vi khỏi toàn bộ các commit `T0239F9`.
