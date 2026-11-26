# PR Description — `[UT-02]` Recruitment Process: Screening, Interview Rounds & Staff Oversight (`T0235C3`)

**Task Code**: `T0235C3`
**Target Base**: `origin/develop` (`8088872`)
**Source Port**: PR `#21` (`9520fd5`) on branch `feature/T0235C3-recruitment-process`

---

## 1. Summary

This PR ports and production-hardens `[UT-02]` ("Recruitment process: screening and interview rounds", commit `9520fd5`) onto the `develop` modular monolith and `UT-01` foundation. It enables owning-company `HR` users to manage candidate screening transitions and multi-round interviews, grants `STAFF` users read-only cross-company application oversight with filtering and pagination, and notifies `CANDIDATE` users asynchronously by email on every status transition.

---

## 2. Architecture & Hardening Checklist

- **Rule 14 Acyclic Module Boundaries**: `recruitment` never imports repositories/entities or queries tables belonging to `identity`, `company`, or `candidate`. Cross-module data is retrieved strictly via additive read-only public service methods on `JobQueryService` (`findJobIdsByCompanyId`, `getJobRequiredSkills`, `getJobRequiredSkillsByJobIds`, `findJobsByCompanyId`) and `CandidatePublicService` (`getVerifiedSkillScoresByUserIds`).
- **Single-Source-of-Truth State Machine & UT-07 Hook**:
  - `ApplicationStatus.allowedUt02Transitions()` enforces `SUBMITTED -> SCREENING | REJECTED`, `SCREENING -> INTERVIEW | REJECTED`, and `INTERVIEW -> REJECTED`.
  - Backward steps, skipped steps, self-transitions, terminal states (`HIRED`, `REJECTED`, `WITHDRAWN`), and UT-07 transitions (`INTERVIEW -> OFFER`, `OFFER -> HIRED | REJECTED`) return `409 INVALID_TRANSITION`.
  - `RecruitmentProcessService#isOfferAllowed(Long applicationId)` enforces: `INTERVIEW` status, `>= 1` round, zero `PENDING` rounds, and latest round (`max roundNo`) == `PASS`.
- **RBAC, IDOR & Concurrency Hardening**:
  - All 7 endpoints are registered in `RoutePolicyRegistry` (deny-by-default) and guarded by `@PreAuthorize`.
  - `OwnershipGuard` returns byte-identical `404 NOT_FOUND` on cross-company HR probes; `STAFF` is read-only (`403` on mutations); `CANDIDATE` (`403`) and anonymous callers (`401`) are rejected.
  - `addInterviewRound` and `updateInterviewRound` acquire `PESSIMISTIC_WRITE` (`findByIdForUpdate`) on the parent `applications` row; `interview_rounds` enforces `UNIQUE (application_id, round_no)`, `@Version` optimistic locking (`409 CONFLICT`), `BigDecimal` `@Digits(integer = 3, fraction = 2)`, and injected `java.time.Clock`.
  - `GET /api/v1/staff/applications` validates `page >= 1`, `1 <= size <= 100` (default `20`), uses stable `createdAt DESC, id DESC` ordering backed by `V23` composite indexes, and hydrates in O(1) SQL queries (zero N+1).
- **Async Candidate Notification**: `CandidateTransitionNotificationListener` listens at `@TransactionalEventListener(AFTER_COMMIT)` on `@Async("notificationTaskExecutor")`, escapes dynamic HTML (`HtmlUtils.htmlEscape`), sanitizes headers, links to `<app.frontend-url>/candidate/applications`, isolates mail failures, and emits one PII-free log line.
- **Frontend UI & WCAG 2.2 AA**:
  - Implemented inside `frontend/src/features/recruitment/` using `httpClient` (`AbortSignal`), `RoleHomeLayout` (`density="dense"`), `--rj-*` design tokens (zero raw hex/z-index), `<Icon />`, `ApplicationStatusBadge`, and `lazyRoute` wiring.
  - 3 portal modals (`StatusTransitionModal`, `AddInterviewRoundModal`, `UpdateRoundModal`) use `createPortal(..., document.body)`, `useScrollLock`, `dialogFocusUtils` focus traps, `Escape` focus return, `CLS = 0`, and zero optimistic UI on transitions.

---

## 3. Option 1A & Option 2A Details

- **Option 1A — `GET /api/v1/hr/jobs?page=1&size=20`**:
  - `@PreAuthorize("hasRole('HR')")`, `@Transactional(readOnly = true)`, `page >= 1` (`size` default `20`, max `100`), deterministic ordering `createdAt DESC, id DESC`.
  - Derives `companyId` exclusively from `principal.getCompanyId()` (`OwnershipGuard`) — never trusts request parameters.
  - **DN-04 Expansion Note**: `DN-04` will expand this endpoint in a future round for full JD management and should add an index on `jobs(company_id, created_at DESC, id DESC)` (since `V11__jobs_and_recommendations.sql` is immutable and only indexes `jobs(status, deadline)`).
- **Option 2A — `GET /api/v1/applications/{id}/cv-snapshot`**:
  - Permits owning-company `HR` (`200 OK`; cross-company `HR` -> byte-identical `404 NOT_FOUND`) and `STAFF` (`200 OK` read-only across companies); rejects `CANDIDATE` (`403`) and anonymous (`401`).
  - Reuses `CvSnapshotDownloadSupport` emitting `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store` with zero PII in logs.

---

## 4. Dropped Files from `9520fd5` & Defects Fixed

### 4.1. Dropped Out-of-Scope Files (8 Files Outside `recruitment`)

1. `backend/src/main/java/com/rikkei/jobs/common/exception/GlobalExceptionHandler.java` — superseded by `develop`'s unified `ApiException` error handler (`{"code","message"}`).
2. `backend/src/main/java/com/rikkei/jobs/common/security/SecurityConfig.java` — superseded by `develop`'s deny-by-default `RoutePolicyRegistry`.
3. `backend/src/main/java/com/rikkei/jobs/company/repository/CompanyRepository.java` — dropped to obey Rule 14 module boundaries; reads route through `JobQueryService`.
4. `backend/src/main/java/com/rikkei/jobs/identity/controller/AuthenticationController.java` — superseded by `develop`'s `AuthController`.
5. `backend/src/main/java/com/rikkei/jobs/identity/service/AuthService.java` — superseded by `develop` identity service + `IdentityPublicService`.
6. `backend/src/main/java/com/rikkei/jobs/identity/service/impl/AuthServiceImpl.java` — superseded by `develop` identity implementation.
7. `frontend/src/shared/auth/authApi.ts` — superseded by `features/identity/` + `shared/api/httpClient.ts`.
8. `frontend/src/shared/auth/session.ts` — superseded by memory-only `AuthContext` token storage.

*(Within `recruitment`, legacy `V10__create_interview_rounds_table.sql`, `ApplicationStatusTransitionMatrix.java`, `RecruitmentAccessDeniedException.java`, and `HrApplicationsPage.tsx` were also replaced by `V23`/`V24`, `ApplicationStatus`, `OwnershipGuard` + `RoutePolicyRegistry`, and `HrRecruitmentPage.tsx` + `ApplicationDetailPage.tsx`.)*

### 4.2. Key Defects Fixed During Port & Verification

- **Schema Parity & Indexes**: Replaced conflicting `V10` with odd prod `V23__create_interview_rounds.sql` (+3 `applications` composite indexes) and even dev `V24__dev_interview_rounds_seed.sql` while keeping `V1..V22` SHA-256 checksums untouched.
- **Route & Security Cleanup**: Removed unprefixed `/applications/{id}` and stray `/api/v1/hr/applications` endpoints; aligned all 7 endpoints with `RoutePolicyRegistry`, `@PreAuthorize`, and OpenAPI `bearerAuth` + `MUST_CHANGE_PASSWORD` documentation.
- **Score Precision & Locking**: Added `@Digits(integer = 3, fraction = 2)` on `UpdateInterviewRoundRequest.score`, `PESSIMISTIC_WRITE` (`findByIdForUpdate`) on `updateInterviewRound`, and null/non-positive `applicationId` fail-closed `404` guards.
- **Deterministic Match Score**: Replaced placeholder scoring with `MatchScoreCalculator` consuming real verified candidate skills and job skill requirements via public interfaces.
- **Frontend Navigation & Responsive Remediation (Change Group 4b)**:
  - Fixed React Router v7 `startTransition` spurious fetch when switching `:jobId` routes in `HrRecruitmentPage.tsx`.
  - Enforced fail-closed `STAFF` read-only default in `ApplicationDetailPage.tsx` when `user?.role !== 'HR'`.
  - Fixed dense table row stretching (`135-156px` -> compact single-line ellipsis with `title` attributes) and set `@media (max-width: 767px)` `min-height: 44px; min-width: 44px` on table action buttons/links for WCAG 2.2 AA mobile touch targets.

---

## 5. Complete File Manifest

- **Migrations & Governance**:
  - `backend/src/main/resources/db/migration/V23__create_interview_rounds.sql`
  - `backend/src/main/resources/db/migration-dev/V24__dev_interview_rounds_seed.sql`
  - `.gitignore` (`docs/ut02/pr-screenshots/`), `cspell.json`
- **Backend Main**:
  - `company`: `HrJobController.java`, `HrJobSummaryDto.java`, `JobRepository.java`, `JobQueryService.java`
  - `candidate`: `SkillScoreRepository.java`, `CandidatePublicService.java`, `CandidatePublicServiceImpl.java`
  - `common`: `RoutePolicyRegistry.java`
  - `recruitment`: `ApplicationStatus.java`, `InterviewResult.java`, `InterviewRound.java`, `InterviewRoundRepository.java`, `ApplicationRepository.java`, `InvalidTransitionException.java`, `InterviewRoundNotFoundException.java`, `CreateInterviewRoundRequest.java`, `UpdateInterviewRoundRequest.java`, `TransitionApplicationRequest.java`, `InterviewRoundResponse.java`, `ApplicationProcessDetailResponse.java`, `StaffApplicationSummaryResponse.java`, `JobVerificationClient.java`, `MatchScoreCalculator.java`, `HrNotificationListener.java`, `CandidateTransitionNotificationEvent.java`, `CandidateTransitionNotificationListener.java`, `RecruitmentProcessService.java`, `RecruitmentProcessServiceImpl.java`, `RecruitmentProcessController.java`, `StaffApplicationController.java`
- **Backend Tests**:
  - New: `RecruitmentProcessIntegrationTest.java`, `RecruitmentProcessServiceTest.java`, `MatchScoreCalculatorTest.java`, `CandidateTransitionNotificationListenerTest.java`
  - Updated: `ApplicationStatusTest.java`, `JobVerificationClientTest.java`, `RoutePolicyRegistryTest.java`, `RbacPermissionMatrixIntegrationTest.java`, `OpenApiCoverageIntegrationTest.java`, `AiGovernanceIntegrationTest.java`, `CompanyMigrationIntegrationTest.java`, `DefaultProfileIntegrationTest.java`, `InternshipMigrationIntegrationTest.java`, `ProfileSeparationIntegrationTest.java`, `RecruitmentMigrationIntegrationTest.java`, `SecurityHardeningIntegrationTest.java`
- **Frontend Main & Tests**:
  - Shared/Identity wiring: `App.tsx`, `routePolicies.ts`, `roleMenuConfig.ts`, `SharedAppLayout.tsx`, `HrHomePage.tsx`, `StaffHomePage.tsx`
  - Feature slice `frontend/src/features/recruitment/`: `index.ts`, `types.ts`, `api/recruitmentApi.ts`, `styles/recruitment.css`, `pages/{HrRecruitmentPage,StaffApplicationsPage,ApplicationDetailPage}.tsx`, `components/{ApplicationTimeline,InterviewRoundsSection,AddInterviewRoundModal,UpdateRoundModal,StatusTransitionModal}.tsx`
  - Vitest tests: `HrRecruitmentPage.test.tsx`, `StaffApplicationsPage.test.tsx`, `ApplicationDetailPage.test.tsx`, `RecruitmentModals.test.tsx`, `ApplicationRouting.test.tsx`, `recruitmentApi.test.ts`, `RoleHomes.test.tsx`, `SharedAppLayout.test.tsx`, `roleUtils.test.ts`
- **E2E & Documentation**:
  - `e2e/run-all.mjs`, `e2e/tier1-features/test_recruitment_process.test.mjs`, `e2e/tier1-features/test_openapi_docs.test.mjs`
  - `docs/ut02/{PHASE0_ACK,README,BROWSER_OBSERVATIONS,PR_DESCRIPTION}.md`
  - `docs/{01-architecture-overview,conventions}.md`, `docs/nt02/permission-matrix.md`, `docs/erd/README.md`
  - `agent-config/rules/{05-backend-java,06-database-flyway,10-testing-strategy}.md` (synced to `.claude/rules/` and `.gemini/rules/`)

---

## 6. Final Verification Metrics

- **Backend (JDK 25)**:
  - `.\backend\mvnw.cmd -f backend\pom.xml spotless:check clean test-compile spotbugs:check test`: **PASS** (`417` Spotless files clean, `323` main + `94` test files compiled with `-Xlint:all -Werror`, `0` SpotBugs issues, **1,407 / 1,407** tests PASS across **91** classes, `0` skipped, vs `1,279` baseline).
- **Frontend (Vite 8.3.7 / Vitest 5.1.0)**:
  - `npm run lint --prefix frontend`: **PASS** (`0` errors, `0` warnings).
  - `npm run typecheck --prefix frontend`: **PASS** (`0` errors).
  - `npm run test --prefix frontend -- --run`: **PASS** (**50 / 50** files, **561 / 561** tests, `0` `act()` warnings, vs `527 / 46` baseline).
  - `npm run build --prefix frontend`: **PASS** — entry JS `87.63 kB` gzip (`+0.41 kB` vs `87.22 kB` baseline), entry CSS `14.23 kB` gzip (`0.00 kB` delta vs `14.23 kB` baseline).
  - `node scripts/compute-contrast.mjs`: **PASS** (`120` color pairs audited, `0` violations).
- **Docker AppCDS & Opaque-Box E2E**:
  - Fresh `docker compose up -d --build --wait`: AppCDS `/app/app.jsa` archive and all `5/5` services healthy (`postgres`, `mock`, `mailpit`, `backend`, `frontend`).
  - `node e2e/run-all.mjs`: **PASS** (**30 / 30** suites, **359** test cases, **2,358** assertions; `TC-T1-UT01-15` remains intentionally skipped awaiting HS-04).
  - Clean teardown `docker compose down -v`: **0** remaining `rikkei` containers, **0** volumes, **0** networks.
- **5 Live API Proofs (on Docker Stack)**:
  - Full transition matrix (`SUBMITTED -> INTERVIEW = 409`, `SUBMITTED -> SCREENING -> INTERVIEW = 200`, `INTERVIEW -> OFFER = 409`, `REJECTED` terminal `409`), round add/edit, `canSendOffer` (`true`/`false`), cross-company HR `404`, STAFF `403`, CANDIDATE `403`, anonymous `401`.
  - `50` parallel transitions on 1 application -> `1` winner (`200`), `49` conflicts (`409`), `0` HTTP `500`s, `1` history row.
  - `10` parallel round creations -> `10/10` HTTP `201`, unique sequential `round_no` `1..10`, `0` HTTP `500`s.
  - Mailpit Vietnamese email delivery + HTML `<script>` escaping + DB history + single-line PII-free log.
  - `3,010` applications / `6,018` rounds `GET /api/v1/staff/applications` (`22.9-31.3 ms`) with `EXPLAIN (ANALYZE, BUFFERS)` confirming `V23` index scans (`0.125-0.508 ms`).
- **Live `/browser` Verification**:
  - `3` sequential sessions covering `hr1`, `hr2`, `staff1`, `candidate1`, Option 1A/2A, all `3` portal modals (`CLS = 0`, focus traps `11/11` & `8/8`, `data-scroll-locked`, `Escape`), 2-tab `409` conflict, `85.126` client validation, `16` responsive Light/Dark viewports (`375/768/1024/1440px`, `0` overflow), `0` console errors, `0` CSP violations; Mailpit Finding #1 diagnosed and live re-verified, Finding #2 fixed in `Change Group 4b` (details in `docs/ut02/BROWSER_OBSERVATIONS.md`).
- **Immutability & Cross-Platform Gates**:
  - `backend/pom.xml`, `frontend/package*.json`, `mock/package*.json`, and SHA-256 checksums of all `19` pre-existing `V1..V22` migrations unchanged vs `origin/develop`.
  - `.\check.ps1` and `./check.sh`: **26 / 26** active runtime gates PASS identically on final working tree.

---

## 7. Proposed Commit Messages

```text
T0235C3: feat(db): add V23 interview_rounds schema, V24 dev seed, and migration tests
T0235C3: feat(recruitment): port UT-02 backend state machine, interview rounds, Option 1A/2A, and async candidate email
T0235C3: feat(frontend): add UT-02 HR recruitment workflow, STAFF oversight views, and Vitest suite
T0235C3: test(e2e): add UT-02 opaque-box suite, update OpenAPI coverage, and sync bilingual docs and baselines
```

---

## 8. UT-02-fix (`T0235C3`) Remediation Summary (D1–D4)

Following the Team Lead's review of the uncommitted `UT-02-port` working tree, round `UT-02-fix` (`T0235C3`) reproduced and resolved four defects (`D1–D4`) without touching out-of-scope R6 items, dependencies, or Flyway migrations.

### 8.1. What & Why (D1–D4)

- **D1 — HR Home & Role Homes Copy Alignment (`HrHomePage.tsx`)**:
  - *Why*: `HrHomePage.tsx` still advertised `"Quản lý ứng viên"` with a `"Mở tuyển dụng"` button inside `"Tính năng sắp ra mắt"`, contradicting the live UT-02 recruitment workflow. *(Corrected in `UT-02-fix2`: keeping both `/hr/company` links from `origin/develop` is intentional.)*
  - *What*: Removed `"Quản lý ứng viên"` from `"Tính năng sắp ra mắt"` so it lists strictly pending roadmap features (`Đăng tin tuyển dụng`, `Thực tập sinh IOC`), updated the subtitle to reference live recruitment, and *(updated in `UT-02-fix2` D1)* restored `origin/develop`'s `.rj-cand-next-box.rj-hr-next-box` (`Mở hồ sơ công ty` primary CTA -> `/hr/company`) paired with a separate second `.rj-cand-next-box` hero block (`Mở tuyển dụng` secondary CTA -> `/hr/recruitment`) while keeping `/hr/company` in the company summary card + sidebar. Preserved existing motion/layout rules (`CLS = 0`) and updated `RoleHomes.test.tsx`.
  - *5-Role-Home Audit*:

| Role Home | Live Next-Step / Primary CTAs | `"Tính năng sắp ra mắt"` Scope | Status |
|---|---|---|---|
| `CandidateHomePage.tsx` | Live links `/candidate/skills`, `/candidate/jobs`, `/candidate/gap-analysis`, `/candidate/evaluations` (no `/candidate/applications`) | `Trợ lý AI`, `Khóa học bổ sung trên LMS` (`Sắp ra mắt`) | Verified OK |
| `HrHomePage.tsx` | Primary hero CTA `/hr/company` (`Mở hồ sơ công ty` in `.rj-hr-next-box`) + secondary hero CTA `/hr/recruitment` (`Mở tuyển dụng`) + company summary `/hr/company` (`2` `/hr/company` links and `1` `/hr/recruitment` link in `main`) | `Đăng tin tuyển dụng` (DN-04), `Thực tập sinh IOC` (`Sắp ra mắt`) | Fixed (D1, updated in UT-02-fix2) |
| `MentorHomePage.tsx` | Live evaluation templates (`Mẫu phiếu đánh giá đang áp dụng`), `"Chấm điểm trực tiếp: Sắp ra mắt"` (no `/mentor/evaluations` route) | `Đánh giá ứng viên`, `Theo dõi thực tập IOC` (`Sắp ra mắt`) | Verified OK |
| `StaffHomePage.tsx` | Primary hero CTA `/staff/applications` (`Theo dõi hồ sơ ứng tuyển`) + target positions table | `Duyệt hồ sơ & doanh nghiệp`, `Duyệt tin tuyển dụng & ghép IOC`, `Báo cáo tuyển dụng` (`Sắp ra mắt`) | Verified OK |
| `AdminHomePage.tsx` | Primary hero CTA `/admin/ai-config` (`Mở cấu hình AI`) | `Danh mục kỹ năng & trọng số`, `Xử lý báo sai bằng chứng & nhật ký thao tác`, `Cấu hình mẫu đánh giá`, `Giám sát vận hành & phân quyền` (`Sắp ra mắt`) | Verified OK |

- **D2 — Expired Jobs Single Source of Truth (`HrJobSummaryDto.java`, `JobQueryService.java`, `HrRecruitmentPage.tsx`)**:
  - *Why*: `HrRecruitmentPage.tsx` derived labels from raw `job.status` alone, displaying expired job `"Java Developer 2024"` (deadline `01/01/2024`) as `"Đang mở tuyển"`.
  - *What*: Added `boolean expired` to `HrJobSummaryDto` and computed derived expiry in `JobQueryService` using injected `java.time.Clock` (`OffsetDateTime.now(clock)`) and the exact UT-01 expiry boundary (`deadline != null && !deadline.isAfter(now)`): `APPROVED` jobs past/at deadline return `status = "EXPIRED"` and `expired = true`, while `CLOSED` jobs stay `status = "CLOSED"` and `expired = false`. Updated `HrRecruitmentPage.tsx` (`getJobStatusMeta`) to render backend state only (`"Hết hạn"` / `"Đang mở tuyển"` / `"Đã đóng"`) with `<Icon />` + text (non-color-only) across both job list and detail header. Added `JobQueryServiceTest.java` (`MutableClock`: yesterday, exact boundary, 1s before, tomorrow, closed) and updated `HrRecruitmentPage.test.tsx`, `ApplicationRouting.test.tsx`, `RecruitmentProcessIntegrationTest.java`, `OpenApiCoverageIntegrationTest.java`, `test_openapi_docs.test.mjs`, and `test_recruitment_process.test.mjs`.

- **D3 — Required `version` on Interview Round Updates (`UpdateInterviewRoundRequest.java`, `RecruitmentProcessServiceImpl.java`)**:
  - *Why*: `PUT /api/v1/applications/{id}/rounds/{roundId}` silently allowed omitted `version` (`null`) to bypass `@Version` optimistic locking and overwrite (`200`).
  - *What*: Added `@NotNull(message = "Phiên bản vòng phỏng vấn không được để trống")` and `Schema.RequiredMode.REQUIRED` on `UpdateInterviewRoundRequest.version`, removed the `request.version() != null` bypass in `RecruitmentProcessServiceImpl`, changed `UpdateInterviewRoundRequest.version` in `frontend/src/features/recruitment/types.ts` to required `readonly version: number` (verified `UpdateRoundModal.tsx` and `recruitmentApi.ts` already send it), and updated unit, integration, OpenAPI, E2E (`TC-T1-UT02-06`), and `docs/ut02/README.md` contracts.

- **D4 — Candidate Transition Email Design-Token Background (`CandidateTransitionNotificationListener.java`)**:
  - *Why*: The email note block used a hard-coded `#F4F7FB` hex value not mirrored from `frontend/src/shared/styles/design-tokens.css`.
  - *What*: Replaced `#F4F7FB` with `static final String SURFACE_NOTE_HEX = "#F8FAFD"; // --rj-color-surface-input (--rj-primitive-neutral-50)`, preserving `HtmlUtils.htmlEscape`, header sanitization, and the plain-text alternative.
  - *WCAG 2.2 / APCA Contrast Measurement*: `TEXT_PRIMARY_HEX` (`#0B1A2C`, `L1 = 0.0099`) on `SURFACE_NOTE_HEX` (`#F8FAFD`, `L2 = 0.9542`) = **16.76:1** (`Calc CR: 16.7595 >= 4.5:1`, `APCA Lc: +101.2`, `PASS`).

### 8.2. RED to GREEN Proofs, Live Probes, AppCDS & `/browser` Summary

- **Raw RED Reproductions (Pre-Fix)**:
  - **D1 RED** *(superseded by `UT-02-fix2` D1 in Section 9)* (`npx vitest run src/features/identity/__tests__/RoleHomes.test.tsx`, exit `1`): `AssertionError: expected ...(3) to have a length of 1 but got 3` at `RoleHomes.test.tsx:291:65` (`a[href="/hr/company"]` count was `3` and `/hr/recruitment` sat inside `<aside aria-labelledby="hr-roadmap-heading">`).
  - **D2 Frontend RED** (`npx vitest run src/features/recruitment/__tests__/HrRecruitmentPage.test.tsx`, exit `1`): `TestingLibraryElementError: Unable to find an element with the text: Hết hạn.` at `HrRecruitmentPage.test.tsx:357:19` (rendered `Đang mở tuyển` for deadline `2024-01-01T00:00:00Z`).
  - **D2 & D3 Backend RED** (`./mvnw test -Dtest="RecruitmentProcessIntegrationTest#testOption1aHrJobsEndpointAndIdorIsolation+testCrossApplicationRoundValidationBoundariesAndTerminalRoundCreation"`, exit `1`):
    - `testOption1aHrJobsEndpointAndIdorIsolation:286 expected: <EXPIRED> but was: <APPROVED>` (expired job `#12`).
    - `testCrossApplicationRoundValidationBoundariesAndTerminalRoundCreation:857 Status expected:<400> but was:<200>` (omitted `version` returned `200`).
  - **D4 Backend RED** (`./mvnw test -Dtest=CandidateTransitionNotificationListenerTest`, exit `1`): `shouldSendVietnameseNotificationWithoutLoggingPii:123 expected: <true> but was: <false>` (`#F4F7FB` present instead of `#F8FAFD`).

- **Live API Probes (`http://127.0.0.1:8080` on Fresh Docker Stack)**:
  - **D2 Probe 1 (`GET /api/v1/hr/jobs`, `hr2@rikkeijobs.test`)**: HTTP `200` returning job `#12` (`"Java Developer 2024 (EXPIRED - Không gợi ý)"`) with `"status":"EXPIRED","expired":true`, and jobs `#8` and `#2` with `"status":"APPROVED","expired":false`.
  - **D2 Probe 2 (`POST /api/v1/jobs/12/apply`, `candidate2` via Mock SSO)**: HTTP `400` `{"code":"JOB_NOT_ELIGIBLE","message":"Vị trí tuyển dụng đã hết hạn nộp hồ sơ ứng tuyển."}`.
  - **D3 Probes (`PUT /api/v1/applications/8/rounds/7`, temporary app cleaned up afterward)**:
    - `version` omitted -> HTTP `400` `{"code":"VALIDATION_ERROR","message":"Phiên bản vòng phỏng vấn không được để trống"}`.
    - current `version: 0` -> HTTP `200` (`"version":1`).
    - stale `version: 0` (against DB `1`) -> HTTP `409` `{"code":"CONFLICT","message":"Dữ liệu vòng phỏng vấn đã được cập nhật bởi một phiên thao tác khác, vui lòng tải lại trang"}`.

- **AppCDS Proof (`rikkei-backend` container)**:
  - `/app/app.jsa` (`109M`) built cleanly (`step #46`), mapped in PID 1 `/proc/1/maps` (`33c93000-365b4000` and `365b4000-3a7c7000`), and verified via `-Xlog:cds=info` (`Opened shared archive file /app/app.jsa`, static/dynamic `ReadWrite`/`ReadOnly` regions mapped; CDS heap Bitmap region `#2` unmapped under ZGC as expected without `-XX:+UseCompressedOops`).

- **Live `/browser` Summary (`86cb32d5-f925-4e04-ac62-298905a97dd2`, details in `docs/ut02/BROWSER_OBSERVATIONS.md`)**:
  - D1 `/hr` *(superseded by `UT-02-fix2` D1 in Section 9)*: `"Tính năng sắp ra mắt"` shows only `"Đăng tin tuyển dụng"` & `"Thực tập sinh IOC"`, hero CTA `"Mở tuyển dụng"` -> `/hr/recruitment`, `0` overflow across `1440x900` and `375x812` Light/Dark (`7/7` mobile touch targets `44px`), full interactions verified.
  - D2 `/hr/recruitment`: Expired job `#12` displays `"Hết hạn"` + `<svg>` (`svgCount = 1`); open jobs `#8`/`#2` display `"Đang mở tuyển"` + `<svg>` (`svgCount = 1`); `0` overflow across all 4 viewport/theme pairs.
  - D3 `/hr/applications/2`: `UpdateRoundModal` updates cleanly (`200`), and 2-tab stale submission returns HTTP `409` with calm `[role="alert"]` (`"Dữ liệu hồ sơ vừa được cập nhật. Vui lòng tải lại trang và thử lại."`).
  - `0` console errors, `0` CSP violations, `0` unintended HTTP `>= 400` responses; sandbox limits disclosed.

### 8.3. Updated Verification Metrics vs UT-02-port Baseline

| Metric | UT-02-port Baseline | UT-02-fix Final | Notes |
|---|---|---|---|
| Backend Tests / Classes | `1,407` / `91` | **`1,410` / `92`** | Added `JobQueryServiceTest.java` (`3` fixed-Clock tests); `spotless:check`, `spotbugs:check`, `clean test-compile` (`-Xlint:all -Werror`) PASS |
| Frontend Tests / Files | `561` / `50` | **`562` / `50`** | `0` `act()` warnings; ESLint & TypeScript strict PASS |
| Frontend Build (Gzip) | JS `87.63 kB` / CSS `14.23 kB` | **JS `87.64 kB` (`285.63 kB`) / CSS `14.23 kB` (`85.40 kB`)** | `+0.01 kB` JS gzip (`expired` prop rendering); `0.00 kB` CSS delta |
| E2E (`node e2e/run-all.mjs`) | `30` suites / `359` cases / `2,358` assertions | **`30` suites / `359` cases / `2,369` assertions** | `+11` assertions; `1` known skip (`TC-T1-UT01-15` awaiting HS-04); fresh `docker compose down -v` leaves `0` `rikkei*` containers/volumes/networks |
| Contrast Audit | `120` pairs PASS | **`120` pairs PASS + D4 `16.76:1`** | `#0B1A2C` on `#F8FAFD` (`APCA Lc +101.2`) |
| Host Quality Gates | `26/26` PASS | **`26/26` PASS** | Both `.\check.ps1` and `./check.sh` identical PASS; `sync-agent-config --check` (`175` files) & `validate-agent-config` (`10/10` checks) PASS |

### 8.4. Exact Modified Lines in `docs/ut02/README.md`

- **Line `118` (Before)**:
  ``| `PUT /api/v1/applications/{id}/rounds/{roundId}` | `HR` (owning company) | `200` (`InterviewRoundResponse`) | Body `{ result, score, note, version }` (`result` `@NotNull`, `score` `0.00..100.00`, `note` max `2000`); `400`; `403`; `404` missing/cross-app `roundId`; `409 INVALID_APPLICATION_STATE` / `CONFLICT` (`@Version`). |``
- **Line `118` (After)**:
  ``| `PUT /api/v1/applications/{id}/rounds/{roundId}` | `HR` (owning company) | `200` (`InterviewRoundResponse`) | Body `{ result, score, note, version }` (`result` `@NotNull`, `version` `@NotNull >= 0` required, `score` `0.00..100.00`, `note` max `2000`); `400 VALIDATION_ERROR` (incl. omitted/`null` `version`); `403`; `404` missing/cross-app `roundId`; `409 INVALID_APPLICATION_STATE` / `CONFLICT` (`@Version`). |``
- **Lines `209–214` (Added)**: Section `6. UT-02-fix (T0235C3) Remediation Note / Ghi Chú Sửa Lỗi Vòng UT-02-fix` summarizing D1–D4.

### 8.5. UT-02-fix Changed Files & Preserved Invariants

- **Backend Main**:
  - `backend/src/main/java/com/rikkei/jobs/company/dto/HrJobSummaryDto.java`
  - `backend/src/main/java/com/rikkei/jobs/company/service/JobQueryService.java`
  - `backend/src/main/java/com/rikkei/jobs/recruitment/dto/UpdateInterviewRoundRequest.java`
  - `backend/src/main/java/com/rikkei/jobs/recruitment/service/impl/RecruitmentProcessServiceImpl.java`
  - `backend/src/main/java/com/rikkei/jobs/recruitment/integration/CandidateTransitionNotificationListener.java`
- **Backend Tests**:
  - `backend/src/test/java/com/rikkei/jobs/company/service/JobQueryServiceTest.java` (new)
  - `backend/src/test/java/com/rikkei/jobs/recruitment/service/RecruitmentProcessServiceTest.java`
  - `backend/src/test/java/com/rikkei/jobs/recruitment/controller/RecruitmentProcessIntegrationTest.java`
  - `backend/src/test/java/com/rikkei/jobs/security/OpenApiCoverageIntegrationTest.java`
  - `backend/src/test/java/com/rikkei/jobs/recruitment/integration/CandidateTransitionNotificationListenerTest.java`
- **Frontend Main & Tests**:
  - `frontend/src/features/identity/pages/role-homes/HrHomePage.tsx`
  - `frontend/src/features/identity/__tests__/RoleHomes.test.tsx`
  - `frontend/src/features/recruitment/types.ts`
  - `frontend/src/features/recruitment/pages/HrRecruitmentPage.tsx`
  - `frontend/src/features/recruitment/__tests__/HrRecruitmentPage.test.tsx`
  - `frontend/src/features/recruitment/__tests__/ApplicationRouting.test.tsx`
- **E2E, Agent Baselines & Docs**:
  - `e2e/tier1-features/test_openapi_docs.test.mjs`
  - `e2e/tier1-features/test_recruitment_process.test.mjs`
  - `agent-config/rules/{05-backend-java,10-testing-strategy}.md` (synced to `.claude/rules/` & `.gemini/rules/`)
  - `docs/ut02/{PHASE0_ACK,README,BROWSER_OBSERVATIONS,PR_DESCRIPTION}.md`
- **Preserved Invariants**:
  - Branch remains `feature/T0235C3-recruitment-process` with uncommitted `MERGE_HEAD` (`8088872`) preserved and zero git state mutations.
  - `backend/pom.xml`, `frontend/package.json`, `frontend/package-lock.json`, and `mock/package.json` unchanged vs `origin/develop`.
  - All `19` `origin/develop` migrations (`V1..V22`) and UT-02-port `V23`/`V24` SHA-256 checksums untouched.
  - Root `README.md` untouched; out-of-scope R6 items (HR list `"Ứng viên #id"`, mandatory transition note, dev seed company-name mismatch, HS-04/DN-04/UT-07) untouched.

### 8.6. Atomic Commit Proposals (`UT-02-fix`)

```text
T0235C3: fix(identity): promote live HR recruitment CTA and prune stale coming-soon copy
T0235C3: fix(company): derive expired HR job status via injected Clock matching UT-01 rule
T0235C3: fix(recruitment): require @NotNull version on interview round updates and align email token
T0235C3: docs(ut02): record UT-02-fix proofs, browser observations, PR dossier, and Rule 05/10 baselines
```

*(Note: The `UT-02-fix` D1 commit proposal above is superseded by `UT-02-fix2` Section 9 below.)*

---

## 9. UT-02-fix2 (`T0235C3`) Remediation Summary (D1–D4)

Following the Team Lead's live re-verification of `UT-02-fix`, round `UT-02-fix2` (`T0235C3`) reproduced and resolved four defects (`D1–D4`) strictly on the frontend, tests, Rule 10 baselines, and `docs/ut02/` while leaving `backend/src/` (`443` files), `V1..V24` migrations, `pom.xml`, `package*.json`, `identity.css`, UT-01 candidate flows, and root `README.md` untouched.

### 9.1. What & Why (D1–D4)

- **D1 — Restore HR Home Company Next-Step Guidance (`HrHomePage.tsx`, `RoleHomes.test.tsx`)**:
  - *Why*: `UT-02-fix` replaced `origin/develop`'s `"Bước tiếp theo cho doanh nghiệp"` box (company-driven logo prompt, N missing fields, ready state, loading skeleton, and primary CTA `"Mở hồ sơ công ty"`), leaving HR users without a logo upload prompt.
  - *What*: Restored `useMemo`, `missingFieldsCount`, `nextAction`, and `.rj-cand-next-box.rj-hr-next-box` verbatim from `origin/develop`, placed the live recruitment entry as a separate second `.rj-cand-next-box` directly below inside `.rj-stack-md` with secondary CTA `"Mở tuyển dụng"` -> `/hr/recruitment`, kept the recruitment-aware subtitle and 2-item `"Tính năng sắp ra mắt"` aside, kept `identity.css` untouched (`CLS = 0`), and restored/added `RoleHomes.test.tsx` coverage (`2` `/hr/company` links + `1` `/hr/recruitment` link in `main`, `1` primary CTA in hero).
- **D2 — Fix 409 Conflict Trap on Application Detail (`recruitmentApi.ts`, `ApplicationDetailPage.tsx`, `StatusTransitionModal.tsx`, `AddInterviewRoundModal.tsx`, `UpdateRoundModal.tsx`, `recruitment.css`)**:
  - *Why*: HR 409 responses (`CONFLICT`, `INVALID_TRANSITION`, `INVALID_APPLICATION_STATE`) displayed `"Vui lòng tải lại trang"` (which clears memory-only JWT auth and redirects to `/login`), `ApplicationDetailPage` never reloaded detail on 409 or modal close, `editingRound` stored a stale snapshot object, and modal `key` props unmounted scroll-lock/focus shells on detail refresh. Wave 1 adversarial verification uncovered an async close-after-409 focus race (`pendingFocusCheckRef` cleared before `refreshDetailInPlace()` settled, plus missing `ref={mainHeadingRef}` / `tabIndex={-1}` on the error-view `<h1>`) and `INVALID_APPLICATION_STATE` returning round wording for `'transition'`. Wave 2 (`teamwork_challenger_2`) found open modal flags (`transitionOpen`, `addRoundOpen`, `editingRoundId`) not cleared on error view or disappeared round (`PROBE-2c`, `PROBE-2c-reopen`, `PROBE-6`) and aborted refetch requests rejecting with non-`AbortError` (`PROBE-4b`). Wave 3 (`teamwork_challenger_3`) uncovered 4 remaining concurrency/route/focus edge cases: `loadDetail` not sharing `refreshAbortRef`/`refreshSeqRef` with `refreshDetailInPlace` (`PROBE-W3-2a`, `PROBE-W3-2b`), `UpdateRoundModal`/`AddInterviewRoundModal` staying open with enabled submit when a pending close-refetch resolved to `REJECTED` with retained `rounds` (`PROBE-W3-4a`, `PROBE-W3-4b`), open modal/banner state leaking across route `:id` changes (`PROBE-W3-6`), and `AbortError` during `handleRefreshLatest` stranding focus on `document.body` while the modal remained mounted (`PROBE-W3-3b`). Wave 4 (`teamwork_challenger_4`) uncovered 1 remaining UI/payload mismatch (`PROBE-W4-4` / `PROBE-W4-4b`): if a background `loadDetail` removed the previously selected `toStatus` from `detail.allowedTransitions` while `StatusTransitionModal` remained open, no radio appeared checked in the DOM yet `handleSubmit` still sent the stale `toStatus` value.
  - *What*: Added `isRecruitmentConflictError`, removed `"tải lại trang"` from HR `'transition'`/`'round'` messages (with dedicated `'transition'` copy for `INVALID_APPLICATION_STATE`, keeping UT-01 `'apply'`/`'withdraw'` untouched), derived `editingRound` from `detail.rounds` via `editingRoundId` guarded by `detail.status === 'INTERVIEW'`, derived `effectiveToStatus` in `StatusTransitionModal.tsx` (`toStatus && orderedTransitions.includes(toStatus) ? toStatus : ''`) for radio selection, validation (`'Vui lòng chọn trạng thái tiếp theo.'`), and payload submission without `setState` in `useEffect` (`PROBE-W4-4b`), keyed modal contents strictly by `detail.id` / `applicationId` / `round.id` and `ApplicationDetailContent` by `rawId` so route `:id` changes reset modals/banners/abort refs cleanly (`PROBE-W3-6`), preserved user input until `"Tải lại dữ liệu mới nhất"` or close, reloaded detail in-place via API without page reload/logout/blank page, unified `refreshAbortRef` and `refreshSeqRef` across both `loadDetail` and `refreshDetailInPlace` (`PROBE-W3-2a`, `PROBE-W3-2b`), reconciled open modals (`transitionOpen`, `addRoundOpen`, `editingRoundId`) against fresh detail in both `handleCloseAfterConflict` and `loadDetail` to close cleanly with a focused `role="alert"` notice when actions become unavailable (`PROBE-W3-4a`, `PROBE-W3-4b`), deferred post-close focus verification until async `refreshDetailInPlace()` settles (with `ref={mainHeadingRef}` + `tabIndex={-1}` on the error `<h1>`), cleared open modal states via `clearOpenModals()` on error transitions, restored focus inside the dialog when `handleRefreshLatest` catches `AbortError` while still mounted (`PROBE-W3-3b`), handled refresh failure with retry + `"Về danh sách"`, and enforced `>= 44px` mobile targets.
- **D3 — Eliminate Flaky Recruitment Tests (`StaffApplicationsPage.test.tsx`, `HrRecruitmentPage.test.tsx`, `ApplicationDetailPage.test.tsx`, `RecruitmentModals.test.tsx`)**:
  - *Why*: `StaffApplicationsPage.test.tsx:63` combined 4 sequential phases and unscoped `SharedAppLayout` DOM queries (`5112 ms` timeout in 1/6 Team Lead runs), and `RecruitmentModals.test.tsx:279` asserted `data-scroll-locked` outside `waitFor`.
  - *What*: Split multi-phase tests into focused single-purpose `it()` cases retaining 100% of assertions with `within(...)`-scoped queries, and moved post-success `data-scroll-locked` assertions inside `waitFor` (zero timeout increases, zero retries, zero skipped tests).
- **D4 — Safe Job Status Mapping (`HrRecruitmentPage.tsx`, `HrRecruitmentPage.test.tsx`)**:
  - *Why*: `getJobStatusMeta` had no `REJECTED` branch and fell back to `{ label: 'Đang hoạt động', icon: 'check-circle', toneClass: 'rec-round-badge--pass' }`.
  - *What*: Mapped `REJECTED` to `{ label: 'Đã từ chối', icon: 'x', toneClass: 'rec-round-badge--fail' }` (before `expired`), and updated fallback to neutral `{ label: 'Không xác định', icon: 'alert-circle', toneClass: 'rec-status-badge--submitted' }`.

### 9.2. RED to GREEN Proofs & 10x Vitest Stability

- **Raw RED Reproductions (Pre-Fix)**:
  - **D1 RED** (`npx vitest run src/features/identity/__tests__/RoleHomes.test.tsx`, exit `1`): `3 failed | 36 passed (39)` — missing `"Tải lên logo cho Công ty Cổ phần Công nghệ Nam Phương"`, missing `"Đang xác định bước tiếp theo cho doanh nghiệp"` / `"Mở hồ sơ công ty"`, and missing second `.rj-cand-next-box` recruitment entry.
  - **D4 RED** (`npx vitest run src/features/recruitment/__tests__/HrRecruitmentPage.test.tsx`, exit `1`): `1 failed | 5 passed (6)` — `Unable to find an element with the text: Đã từ chối` (`REJECTED` and `'ARCHIVED'` rendered `'Đang hoạt động'`).
  - **D2 RED** (`npx vitest run src/features/recruitment/__tests__/recruitmentApi.test.ts src/features/recruitment/__tests__/RecruitmentModals.test.tsx src/features/recruitment/__tests__/ApplicationDetailPage.test.tsx`, exit `1`): `11 failed | 21 passed (32)` — missing `isRecruitmentConflictError`, `"tải lại trang"` present, missing `"Tải lại dữ liệu mới nhất"` recovery & close-after-409 refetch across all 3 modals; Iteration 2 regression RED (`ApplicationDetailPage.test.tsx` + `recruitmentApi.test.ts`, exit `1`): `5 failed | 31 passed (36)` — async close-after-409 deferred refetch to `REJECTED`/`OFFER`/`500` left focus on `document.body`/disabled trigger, and `INVALID_APPLICATION_STATE` (`'transition'`) mentioned `"vòng phỏng vấn"`; Iteration 3 regression RED (`ApplicationDetailPage.test.tsx`, exit `1`): `3 failed | 27 passed (30)` — `PROBE-2c`/`PROBE-2c-reopen`, `PROBE-6`, and `PROBE-4b`; Iteration 4 regression RED (`ApplicationDetailPage.test.tsx` + `RecruitmentModals.test.tsx`, exit `1`): `7 failed | 33 passed (40)` — `PROBE-W3-2a`, `PROBE-W3-2b`, `PROBE-W3-3b` (across all 3 modals), `PROBE-W3-4a`, `PROBE-W3-4b`, and `PROBE-W3-6`; Iteration 5 regression RED (`ApplicationDetailPage.test.tsx`, exit `1`): `1 failed | 35 passed (36)` — `PROBE-W4-4b` (`Unable to find an element with the text: Vui lòng chọn trạng thái tiếp theo.` when `StatusTransitionModal` submitted stale `'INTERVIEW'`).
- **GREEN Verification & 10x Consecutive Full-Suite Runs (`npx vitest run --reporter=verbose`)**:
  - **Frontend Lint / Typecheck / Build**: `npm run lint` (`0` errors, `0` warnings), `npm run typecheck` (`0` errors), `npm run build` (`387 ms`, entry JS `87.64 kB` gzip / `285.63 kB` raw vs `87.64 kB` baseline; entry CSS `14.23 kB` gzip / `85.40 kB` raw vs `14.23 kB` baseline).
  - **10x Consecutive Full Vitest Runs**: **10 / 10 PASS** (`50 / 50` files, `595 / 595` tests, `0` `act()` warnings, total duration `26.81s–30.18s` per run):
    - *All UT-02 / D2 Recruitment Test Min–Max Across 10 Runs (`109` cases/run, `0` cases `>= 2500 ms`; `RoleHomes.test.tsx` `39` cases `13–890 ms`)*:
      - `ApplicationDetailPage.test.tsx` (`36` cases, incl. `PROBE-W4-4b` `237–363 ms`): `53–867 ms`
      - `ApplicationRouting.test.tsx` (`17` cases): `56–1119 ms` (peak `1119 ms`)
      - `ApplyDialog.test.tsx` (`11` cases): `31–421 ms`
      - `HrRecruitmentPage.test.tsx` (`7` cases): `63–978 ms`
      - `MyApplicationsPage.test.tsx` (`17` cases): `58–1186 ms` (peak `1186 ms`)
      - `recruitmentApi.test.ts` (`9` cases): `1–28 ms`
      - `RecruitmentModals.test.tsx` (`5` cases): `150–713 ms`
      - `StaffApplicationsPage.test.tsx` (`6` cases): `33–729 ms` (resolved from `5112 ms` timeout)
      - `WithdrawDialog.test.tsx` (`1` case): `253–365 ms`
    - *Pre-Existing Slow `origin/develop` Tests (Out of Scope)*: `postLoginRedirect.test.tsx > ... > preserves allowed /hr/company and rejects disallowed /admin on standalone ChangePasswordPage after 1200ms` (`2667–2766 ms` across Runs 1–10) and `... > falls back to /candidate for disallowed /hr/company and preserves /candidate/skills via LmsLoginForm quick dev ticket` (`2606 ms` in Run 3).
- **Docker E2E & Clean Teardown**:
  - Fresh `docker compose up -d --build --wait` (`5/5` services healthy: `rikkei-frontend`, `rikkei-backend`, `rikkei-postgres`, `rikkei-mock`, `rikkei-mailpit`).
  - `node e2e/run-all.mjs`: **PASS** (`30/30` suites, `359` test cases, `2,369` assertions, `46.60s`, exit `0`; `TC-T1-UT01-15` remains intentionally skipped awaiting HS-04).
  - Temporary Phase B DB verification rows (`jobs` `13, 14` and `applications` `24, 25, 26` + child rows) deleted cleanly (`0` remaining) and `docker compose down -v` verified **0** remaining `rikkei` containers, volumes, and networks.
- **Live `/browser` Verification (`16/16` Screenshots in `browser_evidence/`, details in `docs/ut02/BROWSER_OBSERVATIONS.md` Section 4)**:
  - **D1 (`/hr`)**: Verified `1440x900` Light/Dark, `1024x768` Light, `768x1024` Light, and `375x812` Light/Dark (`6` PNGs) — `2` stacked `.rj-cand-next-box` hero blocks with `16.00px` gap, `2` `/hr/company` + `1` `/hr/recruitment` links in `<main>`, `2`-item `<aside>`, `44px` mobile touch targets, and `0` horizontal overflow via `locator.boundingBox()`.
  - **D2 (`ApplicationDetailPage` Real 2-Tab `409`s)**: Verified `StatusTransitionModal` (`app #25`, `SUBMITTED -> SCREENING -> INTERVIEW`), `UpdateRoundModal` (`app #24`, `round #18` `v0->v1->v2`, `375x812` mobile `63px`/`44px`/`44px` targets with `0` overflow, and `Escape` close refetch `v2->v3`), and `AddInterviewRoundModal` (`app #26`, `SCREENING -> REJECTED` closing dialog with page `role="alert"` + disabled trigger) across `8` PNGs — zero `"tải lại trang"` copy, zero `/login` redirects.
  - **D4 (`/hr/recruitment`)**: Verified `REJECTED` -> `"Đã từ chối"` (`x` icon) and `ARCHIVED` -> `"Không xác định"` (`alert-circle` icon) in both list and detail header (`2` PNGs), `0` raw enums, `0` open-like badges.
  - **Telemetry & Sandbox Disclosure**: `Console errors: 0`, `CSP violations: 0`, `Unintended HTTP >= 400: 0` (excluding the `4` deliberately provoked `409`s). `PerformanceObserver CLS` JS numeric readout is `NOT VERIFIED via JS eval (sandboxed)` due to `webview_browser` blocking `page.evaluate`; layout stability and non-overflow were verified via `locator.boundingBox()`, fixed-height `.rj-hr-next-content` CSS, and visual inspection of all `16` PNGs.

### 9.3. Lines Corrected In-Place in Section 8

- **Line `146` (`D1 *Why*`)**: Removed `"and duplicated /hr/company links"`, clarifying that keeping `origin/develop`'s two `/hr/company` links is intentional under `UT-02-fix2`.
- **Line `147` (`D1 *What*`)**: Replaced the single-recruitment-CTA hero description with the `UT-02-fix2` two-block hero design (`.rj-hr-next-box` primary CTA `/hr/company` + separate `.rj-cand-next-box` secondary CTA `/hr/recruitment`).
- **Line `153` (`5-Role-Home Audit` table, `HrHomePage.tsx` row)**: Updated `Live Next-Step / Primary CTAs` from `1 link each, 0 in hero` to primary `/hr/company` + secondary `/hr/recruitment` + summary `/hr/company` (`2` `/hr/company` + `1` `/hr/recruitment` in `main`), status `Fixed (D1, updated in UT-02-fix2)`.
- **Lines `174`, `193`, `252`**: Marked `UT-02-fix` D1 RED log, `/browser` summary, and commit proposal as superseded by `UT-02-fix2` Section 9.

### 9.4. `UT-02-fix2` Changed Files & Atomic Commit Proposals

- **Frontend Main**: `HrHomePage.tsx`, `HrRecruitmentPage.tsx`, `recruitmentApi.ts`, `index.ts`, `recruitment.css`, `ApplicationDetailPage.tsx`, `StatusTransitionModal.tsx`, `AddInterviewRoundModal.tsx`, `UpdateRoundModal.tsx`.
- **Frontend Tests**: `RoleHomes.test.tsx`, `HrRecruitmentPage.test.tsx`, `StaffApplicationsPage.test.tsx`, `ApplicationDetailPage.test.tsx`, `RecruitmentModals.test.tsx`, `recruitmentApi.test.ts`.
- **Rules, Docs & Evidence**: `agent-config/rules/10-testing-strategy.md` (synced to `.claude/rules/` & `.gemini/rules/`), `docs/ut02/{PHASE0_ACK,README,BROWSER_OBSERVATIONS,PR_DESCRIPTION}.md`, `browser_evidence/*.png` (`16` screenshots).

```text
T0235C3: fix(identity): restore HR home company next-step box alongside live recruitment entry
T0235C3: fix(recruitment): recover cleanly from 409 conflicts in HR modals and map REJECTED/unknown job statuses
T0235C3: test(recruitment): split slow recruitment tests and prove 10x Vitest stability
T0235C3: docs(ut02): update Rule 10 frontend baseline and record UT-02-fix2 verification dossier
```

---

## 10. UT-02-fix3 (`T0235C3`) Remediation Summary (D1–D3)

Following the Team Lead's re-verification of `UT-02-fix2` — explicitly noting that the Team Lead observed **`9/10`** (not `10/10`) consecutive full-suite Vitest passes because Run 2 failed `594/595` on a passive-effect focus race in `ApplicationDetailPage.test.tsx`, alongside two live UX/accessibility defects — round `UT-02-fix3` (`T0235C3`) reproduced (`RED`) and fixed `D1`, `D2`, and `D3` at the root as one single round without touching `backend/src/` (`443` files), `V1..V24` migrations, `pom.xml`, `package*.json`, or any out-of-scope R6/UT-01 item.

### 10.1. What & Why (D1–D3 & Two-Dialog Audit)

- **D1 — Silent Lost Update & Post-Success Stale Reopen (`UpdateRoundModal.tsx`, `ApplicationDetailPage.tsx`)**:
  - *Why*: `UpdateRoundModal.tsx` was keyed by `round.id` (`UT-02-fix2`), so form state (`result`, `score`, `note`) initialized once on mount while `handleSubmit` derived `version` from the live `round` prop (`effectiveVersion`). Reopening before a pending close-after-`409` refetch resolved (or any background `round` prop update) sent the newer server `version` alongside stale form values (`200 OK` silent overwrite). Additionally, `UpdateRoundModal` and `AddInterviewRoundModal` `onSuccess` callbacks only incremented `reloadCount` and ignored the returned round, leaving instant reopen showing stale pre-save values.
  - *What*: Pinned `const [formVersion, setFormVersion] = useState<number>(round.version)` at form initialization (`UpdateRoundModal.tsx:80`), updated `setFormVersion(freshRound.version)` strictly alongside `setResult`/`setScore`/`setNote` in `handleRefreshLatest` (`line 227`), and submitted `version: formVersion` (`line 310`). Added `computeCanSendOffer` (`ApplicationDetailPage.tsx:29-41`, matching backend `evaluateCanSendOffer`) and updated `UpdateRoundModal` (`lines 760-780`) and `AddInterviewRoundModal` (`lines 722-743`) `onSuccess` handlers to apply the returned round immediately via `setDetail(...)` before triggering `setReloadCount`.
  - *Two-Dialog Audit*:
    - `StatusTransitionModal.tsx`: **Verified safe** against D1 — keyed by `detail.id`, uses no `version` field, derives `orderedTransitions` and `effectiveToStatus` directly from live `detail.allowedTransitions` (blocking stale selections on background changes with `'Vui lòng chọn trạng thái tiếp theo.'`), and `ApplicationDetailPage.tsx:700` already applies `setDetail(updated)` immediately in `onSuccess`.
    - `AddInterviewRoundModal.tsx`: **Modal component verified safe** against D1 — keyed by `applicationId`, initializes empty fields `''` on mount, carries no `round`/`version` prop, and backend allocates `roundNo` under `PESSIMISTIC_WRITE`; its `onSuccess(createdRound)` handler in `ApplicationDetailPage.tsx:722-743` was upgraded to apply `createdRound` and recompute `canSendOffer` immediately before refetch.
- **D2 — Eliminate Passive-Effect Test Flakiness (`features/recruitment/__tests__/`)**:
  - *Why*: Focus, `data-scroll-locked`, `disabled`, and `role="alert"` transitions run in passive `useEffect` hooks after `waitFor` resolved only on dialog unmount or state transition (`ApplicationDetailPage.test.tsx` lines around `577`, `595`, `769`, `925`, `1711`, `1776`).
  - *What*: Audited all `9` test files under `frontend/src/features/recruitment/__tests__/` and wrapped all effect-dependent assertions in `await waitFor(...)` across `ApplicationDetailPage.test.tsx`, `RecruitmentModals.test.tsx`, `ApplyDialog.test.tsx`, `WithdrawDialog.test.tsx`, and `MyApplicationsPage.test.tsx` (the remaining `4` files had none) without raising `testTimeout`, retries, `skip`, deleting/loosening assertions, or fixed sleeps.
- **D3 — Preserve Accessible Focus on `409` Across All Three Dialogs (`UpdateRoundModal.tsx`, `StatusTransitionModal.tsx`, `AddInterviewRoundModal.tsx`)**:
  - *Why*: Receiving `409` while the disabled submit button held focus caused browsers to drop `document.activeElement` to `document.body` while the dialog stayed open.
  - *What*: Added `setErrorFocusSeq((n) => n + 1)` inside the `isRecruitmentConflictError(err)` branch of `handleSubmit` in all three dialogs (`UpdateRoundModal.tsx:324`, `StatusTransitionModal.tsx:294`, `AddInterviewRoundModal.tsx:309`), firing the existing `reloadBtnRef` focus effect (`"Tải lại dữ liệu mới nhất"`) and keeping `role="alert"` `aria-live="assertive"` announced.

### 10.2. RED -> GREEN Proofs, 20x Vitest Stability, Build, E2E & Live `/browser`

- **Raw RED Reproduction (Pre-Fix)**:
  - `npx vitest run src/features/recruitment/__tests__/ApplicationDetailPage.test.tsx src/features/recruitment/__tests__/RecruitmentModals.test.tsx` (exit `1`, `6.11s`): **`2 failed (2) | 6 failed | 42 passed (48)`** — `D1(a)` (`expected version: 2, received 3`), `D1(b)` (`Unable to find text: Vòng 1 Kiến trúc` before reload), `D1(c)` (`expected version: 2, received 3`), and `D3` x3 (`UpdateRoundModal`, `StatusTransitionModal`, `AddInterviewRoundModal` focused `<body>` instead of `"Tải lại dữ liệu mới nhất"`).
- **GREEN & 20x Consecutive Full-Suite Vitest Stability (`npx vitest run --reporter=verbose`)**:
  - **`20 / 20` consecutive runs PASS** (`0` failures, `0` `act()` warnings, `50 / 50` files, `602 / 602` tests per run; durations `26.17s–51.10s`).
  - Updated `agent-config/rules/10-testing-strategy.md` (`602` tests across `50` files) and synced across `.claude/rules/` & `.gemini/rules/` (`node scripts/sync-agent-config.mjs --check`: `175/175` PASS).
- **Frontend Lint / Typecheck / Production Build (`frontend/`)**:
  - `npm run lint`: **PASS** (`0` errors, `0` warnings).
  - `npm run typecheck`: **PASS** (`0` errors).
  - `npm run build`: **PASS** (`325ms`) — entry JS `87.63 kB` gzip (`285.63 kB` raw, `-0.01 kB` vs `87.64 kB` baseline), entry CSS `14.23 kB` gzip (`85.40 kB` raw, `0.00 kB` delta vs `14.23 kB` baseline).
- **Fresh Docker E2E & Clean Teardown**:
  - `docker compose up -d --build --wait` (`5/5` services healthy) -> `node e2e/run-all.mjs`: **PASS** (`30 / 30` suites, `359` test cases, `2,369` assertions, `75.90s`, exit `0`; `TC-T1-UT01-15` remains skipped from baseline awaiting HS-04).
  - Final `docker compose down -v`: **0** `rikkei` containers, **0** `rikkei` volumes, **0** `rikkei` networks remaining.
- **Live `/browser` + `psql` Verification (Details in `docs/ut02/BROWSER_OBSERVATIONS.md` Section 5)**:
  - Verified on `http://localhost:3000` (`hr2@rikkeijobs.test` / `Test@123`, `/hr/applications/2` & `/hr/applications/1`, `0` console errors, `0` unexpected network errors):
    - **D1 Post-Success Immediate Apply**: Created Round 1 (`id=7`, `version=0`, `201 Created`), updated to `PASS`, `score=91`, `"Initial HR score 91"` (`200 OK`, `version=1`); table showed `91 / 100` immediately and instant reopen showed `PASS`, `91`, `"Initial HR score 91"`.
    - **D1 Reopen-Before-Refetch `409` Protection (`docker pause`/`unpause rikkei-backend` + `psql`)**: Starting from `id=7` (`score=91.00, version=3`), Tab 1 captured `version=3`; Tab 2 saved `score=40` (`200 OK`, DB `score=40.00, version=4`); Tab 1 keyboard save hit `409 Conflict` focusing `"Tải lại dữ liệu mới nhất"`; paused `rikkei-backend` (`paused=true`), pressed `"Hủy bỏ"`, reopened dialog before unpause (showed `91` / `"Initial HR score 91"`), unpaused (`paused=false`, table updated to `40 / 100` while open dialog kept `91`), clicked `"Lưu kết quả"` -> **`409 Conflict`** (`psql` confirmed DB remained `score=40.00, version=4`, `1 row`), then `"Tải lại dữ liệu mới nhất"` synced and saved `88` (`200 OK`, DB `score=88.00, version=8`).
    - **D3 Keyboard (`Tab` -> `Enter`) on All 3 Dialogs at `1440x900` & `375x812`**: All 3 dialogs (`UpdateRoundModal`, `StatusTransitionModal`, `AddInterviewRoundModal`) received `409`, moved focus to `"Tải lại dữ liệu mới nhất"` (`body:focus=0`), kept `role="alert"` `aria-live="assertive"` announced, and rendered cleanly at `dialogBox.width=328px` on `375x812`.
    - **R2 Responsive & Evidence**: Verified `1440x900`, `1024x768`, `768x1024`, `375x812` (Light & Dark) with zero horizontal overflow (`html=1424.8/1008.8/752.8/360px`); moved all `16` `UT-02-fix2` PNGs from `browser_evidence/` to `docs/ut02/pr-screenshots/` (removing `browser_evidence/`) + saved `7` new `ut02_fix3_*.png` screenshots (`23` PNGs total). Honest sandbox caveat documented in `docs/ut02/BROWSER_OBSERVATIONS.md` Section 5.4.
- **Immutability & Final Repository Gates**:
  - `git branch --show-current`: `feature/T0235C3-recruitment-process` (uncommitted `MERGE_HEAD=8088872` preserved; zero git mutations).
  - `backend/src/` SHA-256 (`443 / 443` files, `DIFF_COUNT=0`) and `pom.xml`/`package*.json` vs `origin/develop` (`0` diff) verified unchanged.
  - `node scripts/validate-agent-config.mjs` (`10/10` PASS), `node scripts/sync-agent-config.mjs --check` (`175/175` PASS), `node scripts/check-gate-sync.mjs` (PASS), `.\check.ps1` (`26/26` PASS), and `./check.sh` (`26/26` PASS).

### 10.3. `UT-02-fix3` Changed Files (Separate from Prior Uncommitted Work) & Proposed Commits

- **Frontend Code (`UT-02-fix3` only)**:
  - `frontend/src/features/recruitment/components/UpdateRoundModal.tsx`
  - `frontend/src/features/recruitment/components/StatusTransitionModal.tsx`
  - `frontend/src/features/recruitment/components/AddInterviewRoundModal.tsx`
  - `frontend/src/features/recruitment/pages/ApplicationDetailPage.tsx`
- **Frontend Tests (`UT-02-fix3` only)**:
  - `frontend/src/features/recruitment/__tests__/ApplicationDetailPage.test.tsx`
  - `frontend/src/features/recruitment/__tests__/RecruitmentModals.test.tsx`
  - `frontend/src/features/recruitment/__tests__/ApplyDialog.test.tsx`
  - `frontend/src/features/recruitment/__tests__/WithdrawDialog.test.tsx`
  - `frontend/src/features/recruitment/__tests__/MyApplicationsPage.test.tsx`
- **Rules, Docs & Screenshots (`UT-02-fix3` only)**:
  - `agent-config/rules/10-testing-strategy.md` (synced to `.claude/rules/10-testing-strategy.md` and `.gemini/rules/10-testing-strategy.md`)
  - `docs/ut02/PHASE0_ACK.md`, `docs/ut02/README.md`, `docs/ut02/PR_DESCRIPTION.md`, `docs/ut02/BROWSER_OBSERVATIONS.md`
  - `docs/ut02/pr-screenshots/` (`16` PNGs moved from deleted `browser_evidence/` + `7` new `ut02_fix3_*.png` screenshots = `23` PNGs, git-ignored)

```text
T0235C3: fix(recruitment): pin formVersion in UpdateRoundModal, apply saved rounds immediately, and restore 409 dialog focus
T0235C3: test(recruitment): wrap effect-dependent assertions in waitFor and add D1/D3 regression tests
T0235C3: docs(ut02): record UT-02-fix3 proofs, live browser verification, moved screenshots, and Rule 10 baseline
```
