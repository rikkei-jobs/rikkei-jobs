# PR Description — `[NT-05]` External Data Sync (`LMS`, `Exam`, `lms-pm`) & HS-01 Fixes (`T022C02`)

**Task Code**: `T022C02` (`NT-05`)
**Branch**: `feature/t022c02-ket-noi-du-lieu` (base `develop` `17b1ae8`)
**Proposed PR Title**: `[NT-05] T022C02: sync LMS, exam and lms-pm data as skill evidence`

---

## 1. Summary

Round `NT-05` (`T022C02`) delivers the end-to-end external data synchronization pipeline from the mock service (`LMS`, `Exam`, and `lms-pm`) into `candidate.external_records` as the verified evidence source for `HS-01`, introduces STAFF data-sync oversight and manual override workflows (`/staff/data-sync` and 5 REST endpoints), and resolves confirmed defects `H1`, `H2`, and `H3`:

- **H1 Fix (Per-User Serialization & DB Uniqueness Safety Net)**: Added `CandidateSkillLockService` (2-arg `pg_advisory_xact_lock` using constant namespace `0x524B534B` `"RKSK"` and folded 64-bit `userId` via `(int) (userId ^ (userId >>> 32))`), acquired inside the transaction before the first read/delete across all 5 skill write paths (`SkillRecomputeService#recomputeSkills`, `ExternalSyncService#syncUser`, `CandidatePublicServiceImpl#recordPmInternshipResults`, `StaffDataSyncService#applyOverride`, and `EvaluationServiceImpl#submitEvaluation`), with zero nested `REQUIRES_NEW` under lock. Flyway `V25` adds `skill_evidences.external_record_id` and partial unique index `uq_skill_evidences_external_record_skill` (`WHERE external_record_id IS NOT NULL`) without constraining `MENTOR` or `SELF` rows.
- **H2 Fix (Concurrent First-Time TT-01 PM Sync)**: Eliminated `409 CONFLICT` (`uq_internships_user_batch`) on concurrent first-time `GET /api/v1/profiles/me/internships` via per-user serialization in `InternshipPersistenceServiceImpl` + `CandidatePublicServiceImpl` and unified PM normalization/upsert.
- **H3 Fix (`SkillProfilePage.tsx`)**: Isolated recompute errors from initial-load errors so loaded 13 skills remain intact, rendering an inline `role="alert"` banner with a retry button that re-runs `recomputeMySkills()`, sensible focus movement, and preserved initial-load error behavior.
- **D1–D11**: Flyway `V25__nt05_external_sync.sql` (`external_records` evolution + `manual_overrides` + `sync_runs`), unified `ExternalRecordNormalizer`, `ExternalApiClient` LMS/Exam/PM calls (`5s` timeout + `2` network retries for all 3 NT-05 endpoints vs `2.5s` fast-fail `0` retries kept for TT-01 read flow), `ExternalSyncService` (fetch outside tx, single locked tx, freshness guard, `FAILED` run persisted after rollback, `503 EXTERNAL_UNAVAILABLE`), `NightlySyncJob` (`APP_SYNC_NIGHTLY_CRON`, `APP_SYNC_NIGHTLY_ZONE`, cross-instance lock, injectable `Clock`), bounded non-blocking `OnOpenSyncService` (`rikkei-sync-`, > 1 hour staleness, `APP_SYNC_ON_OPEN_ENABLED`), append-only `manual_overrides` (override wins), 5 STAFF D10 endpoints, and `/staff/data-sync` UI.

---

## 2. Hand Calculation Before & After Mock Score Change (`candidate1`, `JAVA` & `OOP`)

Source weights (`V4__dev_skill_profile_seed.sql`): `LMS JAVA01 -> JAVA (0.7), OOP (0.3)`; `EXAM EX-JAVA-2026-10 -> JAVA (0.8)`; `PM IOC-JB-2026-09 -> JAVA (0.3)`. Cutoff: `timeFactor = 1.0` within 1 year, `0.5` older (`1:JAVA01#h2` at 500 days).

### 2.1 Before Mock Change (`JAVA01 = 8.5` -> `85.00`)

| Evidence | Raw Score | Weight | Time Factor | `score * weight * factor` | `weight * factor` |
|---|---|---|---|---|---|
| `LMS JAVA01` (`1:JAVA01`, current) | `85.00` | `0.7` | `1.0` | `59.50` | `0.70` |
| `LMS JAVA01` (`1:JAVA01#h2`, 500 days ago) | `60.00` | `0.7` | `0.5` | `21.00` | `0.35` |
| `EXAM EX-JAVA-2026-10` (`1:EX-JAVA-2026-10`) | `80.00` | `0.8` | `1.0` | `64.00` | `0.80` |
| `PM IOC-JB-2026-09` (`1:IOC-JB-2026-09`) | `85.00` | `0.3` | `1.0` | `25.50` | `0.30` |
| **JAVA Total** | | | | **`170.00`** | **`2.15`** |

- **`JAVA` Score**: `170.00 / 2.15 = 79.069767...` -> **`79.07`** (`ADVANCED`)
- **`OOP` Score**: `(85.00 * 0.3 * 1.0 + 60.00 * 0.3 * 0.5) / (0.30 + 0.15) = 34.50 / 0.45 = 76.67` (`ADVANCED`)

### 2.2 After Mock Change (`JAVA01 = 10.0` -> `100.00` via OS Temp Copy + `docker compose cp` + `POST /mock/reload` + Sync)

- `1:JAVA01` updates to `100.00`; historical row `1:JAVA01#h2` (`60.00`) remains untouched.
- **New `JAVA` Numerator**: `100.00 * 0.7 * 1.0 + 21.00 + 64.00 + 25.50 = 180.50`; denominator unchanged `2.15`.
- **New `JAVA` Score**: `180.50 / 2.15 = 83.953488...` -> **`83.95`** (`ADVANCED`, `+4.88`)
- **New `OOP` Score**: `(100.00 * 0.3 * 1.0 + 60.00 * 0.3 * 0.5) / 0.45 = 39.00 / 0.45 = 86.67` (`EXPERT`, `+10.00`)
- Verified live in PostgreSQL (`skill_scores`): `JAVA = 83.95 ADVANCED`, `OOP = 86.67 EXPERT`; restored original mock afterwards -> `JAVA = 79.07`, `OOP = 76.67` (`mock/data.json` `git diff` empty).

---

## 3. Acceptance Criteria & Verification Evidence

| # | Acceptance Criterion | Status | Raw Evidence |
|---|---|---|---|
| 1 | Mock score change (`candidate1` `JAVA01` `8.5 -> 10.0`) + re-sync updates `external_records` & HS-01 scores | PASS | `docker compose cp <temp> mock:/app/data.json` + `POST /mock/reload` (`{"ok":true}`) + `POST /api/v1/staff/sync/1` -> `200 SUCCESS`; `psql`: `1:JAVA01 = 100.00`, `1:JAVA01#h2 = 60.00`, `JAVA = 83.95`, `OOP = 86.67`; restored cleanly. |
| 2 | Mock stopped + sync -> `503 EXTERNAL_UNAVAILABLE`, `FAILED` `sync_runs` row, existing DB unchanged | PASS | `docker compose stop mock` -> `POST /api/v1/staff/sync/1` returned `503 {"code":"EXTERNAL_UNAVAILABLE","message":"Không thể đồng bộ dữ liệu từ hệ thống ngoài: Không thể kết nối tới hệ thống ngoài sau 3 lần thử"}`; `sync_runs` row `id=16` `FAILED`; DB snapshot before/after identical (`SNAPSHOT_IDENTICAL: True`). |
| 3 | Manual override survives both NT-05 and TT-01 re-syncs | PASS | `PUT /api/v1/staff/external-records/{id}/override` (`1:JAVA01` `score=9.2` -> `92.00`; `1:IOC-JB-2026-09` `finalScore=9.5` -> `95.00`); followed by `POST /api/v1/staff/sync/1` (`200 SUCCESS`) and `GET /api/v1/profiles/me/internships` (`200`, `batches: 1`) -> `psql` confirmed `92.00` and `95.00` preserved. |
| 4 | Two consecutive syncs produce no duplicate `external_records` or `skill_evidences` | PASS | Run 1 & Run 2 (`POST /api/v1/staff/sync/1`) -> `200 SUCCESS` (`inserted=0, updated=0, unchanged=5/1/1`); `psql` before/after: `8` `external_records`, `21` `skill_evidences`. |
| 5 | Nightly job executes via `APP_SYNC_NIGHTLY_CRON`; on-open non-blocking with paused mock & 1h cooldown | PASS | `APP_SYNC_NIGHTLY_CRON="0 * * * * *"` -> `psql` recorded 3 `NIGHTLY` `SUCCESS` rows (`user_id=1,2,3`); `docker pause rikkei-mock` -> `GET /api/v1/profiles/me/skills` returned `200` in `29.98 ms`, `ON_OPEN` `FAILED` row `id=19` recorded after ~15.5s retries, 2nd open within 1h (`24.34 ms`) created 0 new rows. |
| 6 | PR docs, sample data, mapping table, OpenAPI updated (`50` paths / `53` ops), screenshots | PASS | `docs/nt05/{PHASE0_ACK,README,PR_DESCRIPTION,BROWSER_OBSERVATIONS}.md` authored; `test_openapi_docs.test.mjs` (`50/53`) PASS; `/browser` verified on live Docker stack with 9 gitignored PNGs in `docs/nt05/pr-screenshots/`. |
| 7 | H1, H2, H3 live & Testcontainers concurrency proofs | PASS | Live 12x parallel recompute (`60.32 INTERMEDIATE` matching sequential, `22` total / `18` verified with MENTOR; `21/17` baseline), 10x first-time `GET /me/internships` (`10/10` `200`, `1` internship, `3` tasks, `1` PM record), 10x parallel `POST /staff/sync/1` (`10/10` `200`, 0 duplicates); `SkillProfilePage.test.tsx` + `/browser` H3 `504` retry recovery PASS (`13` meters preserved, focus on `"Thử lại"`). |
| 8 | Unchanged mock HS-01 baselines preserved | PASS | Before & after `POST /api/v1/staff/sync/1`: `13` skills, `JAVA = 79.07 ADVANCED`, `OOP = 76.67 ADVANCED`, `COMMUNICATION`/`ENGLISH` self-only (`verifiedScore = null`), `cand2 -> /profiles/1/skills` -> `404 NOT_FOUND`, `84.21` test PASS. |
| 9 | Quality gates & clean teardown | PASS | Clean Maven `1441/101` PASS; FE `lint`/`typecheck`/`build` (`87.78 kB` JS / `14.23 kB` CSS gzip) + `20/20` Vitest (`51/51` files, `612/612` tests, 0 `act()`) PASS; E2E `31/31` suites (`363` cases, `2444` assertions) PASS; `.\check.ps1` & `./check.sh` `26/26` PASS; `docker compose down -v` leaves 0 `rikkei` resources. |

---

## 4. Screenshots & Browser Observations (`docs/nt05/pr-screenshots/`, gitignored)

- **`/browser` Verification Summary (`docs/nt05/BROWSER_OBSERVATIONS.md`)**: Executed live on `http://localhost:3000` (`5/5` containers healthy, `0` console errors, `0` unexpected HTTP `>= 400`, zero script injection). Verified `/staff/data-sync` (debounced search incl. `"%_"`, Criterion 1 mock reload `8.5 -> 10.0` with button busy disable, Criterion 2 `docker compose stop mock` `503` `[role="alert"]` + `FAILED` run + intact DB, Criterion 3 `"Sửa tay"` focus trap / `html[data-scroll-locked="true"]` / `Escape` focus restore / D9 validation / override survival across re-sync), H3 on `/candidate/skills` (`504` keeps `13` meters and moves focus to `"Thử lại"`, recovery clears alert, initial-load `504` preserves full-card alert), `375/768/1024/1440px` Light & Dark (`0` overflow via `boundingBox()`), `goBack`/`goForward`/`reload` -> `/login`, and Role Guard inline 403 at `/staff/data-sync` for `CANDIDATE`/`HR`/`MENTOR`/`ADMIN` with `0` unauthorized `/api/v1/staff/*` calls.
- **Sandbox Notes**: `webview_browser` blocks `page.evaluate`/`locator.evaluate` and redacts `"code"` in `responseBodyPreview`; layout bounds used Playwright `boundingBox()` and DB persistence was corroborated via `psql`.
- **Captured Screenshots (9 PNGs in `docs/nt05/pr-screenshots/`, ignored by `.gitignore`)**:
  1. `nt05_candidate_h3_recompute_error_kept.png` (`138,221` bytes)
  2. `nt05_non_staff_redirect_403.png` (`64,119` bytes)
  3. `nt05_staff_data_sync_1440_dark.png` (`139,837` bytes)
  4. `nt05_staff_data_sync_1440_light.png` (`142,833` bytes)
  5. `nt05_staff_data_sync_375_dark.png` (`67,874` bytes)
  6. `nt05_staff_override_dialog_select.png` (`113,544` bytes)
  7. `nt05_staff_sync_c1_updated.png` (`143,882` bytes)
  8. `nt05_staff_sync_c2_mock_down_alert.png` (`144,393` bytes)
  9. `nt05_staff_sync_c3_override_survived.png` (`115,349` bytes)

---

## 5. Coordination Notes for HS-01 and TT-01 Owners

### 5.1 For the HS-01 Owner

- **H1 Per-User Lock & Order**: All 5 skill mutation paths (`SkillRecomputeService#recomputeSkills`, `ExternalSyncService#syncUser`, `CandidatePublicServiceImpl#recordPmInternshipResults`, `StaffDataSyncService#applyOverride`, and `EvaluationServiceImpl#submitEvaluation`) acquire `CandidateSkillLockService#acquireUserLock(userId)` (`pg_advisory_xact_lock`) at the start of the write transaction before any read or delete, with zero nested `REQUIRES_NEW` calls while holding the lock.
- **`V25` Uniqueness Safety Net**: `skill_evidences.external_record_id` (`ON DELETE SET NULL`) + partial unique index `uq_skill_evidences_external_record_skill (external_record_id, skill_id) WHERE external_record_id IS NOT NULL` prevents duplicated external-derived verified rows without constraining `MENTOR` or `SELF` rows.
- **H3 & D8**: `SkillProfilePage.tsx` separates `recomputeError` from initial `error` so loaded skills stay rendered behind an inline `role="alert"` + retry button; `GET /api/v1/profiles/me/skills` triggers bounded non-blocking `ON_OPEN` sync (`rikkei-sync-`) only when the candidate has a non-blank `lms_user_id` and either has no `sync_runs` row or the latest run started > 1 hour ago.

### 5.2 For the TT-01 Owner

- **H2 Fix & Unified PM Upsert**: `InternshipSyncServiceImpl` preserves raw PM source JSON batch objects (`sourcePayloadsByBatchId`), and `InternshipPersistenceServiceImpl` + `CandidatePublicServiceImpl#recordPmInternshipResults` share the per-user advisory lock and `ExternalRecordNormalizer` with NT-05, eliminating first-time concurrent `409 CONFLICT` and payload flipping.
- **`recorded_at` & Historical `#h` Rule**: For PM records, `recorded_at` is set to `endDate` at `00:00` `Asia/Ho_Chi_Minh` when `endDate` is present; when `endDate` is absent, the LMS rule applies (new row = `now`, unchanged effective score preserves `recorded_at`, score change = `now`). Legacy duplicate PM rows (`#h<id>`) continue to be deleted per `(user, batchId)` on PM sync, and manual override on non-canonical `#h` PM rows is rejected with `400 VALIDATION_ERROR`.
- **Timeout & Source Data Split**: TT-01 reads keep `ExternalApiClient#getStudentInternshipsFastFail` (`2.5s`, `0` retries) and continue rendering the `internship` module's `internships`/`internship_tasks` source data independently of candidate `manual_overrides`, whereas NT-05 `syncUser` calls all 3 endpoints (`LMS`, `EXAM`, `PM`) via `5s` + `2` network retries.

---

## 6. Approved Stop Gate Assertion Changes (`(A)`–`(G)`)

All existing-test assertion adjustments strictly follow Team Lead Stop Gate Decisions `(A)`–`(G)`; zero unapproved assertions were altered or weakened:

| Gate | File | Location / Method | Before | After |
|---|---|---|---|---|
| `(A)` | `CandidatePublicServiceInternshipTest.java` | `titleOnlyChangeTriggersSaveAndRecompute` | `@DisplayName("... updates recordedAt ...")`; `assertEquals(OffsetDateTime.now(clock), existing.getRecordedAt())` | `@DisplayName("... (same score, no endDate) ... preserves recordedAt ...")`; `assertEquals(originalRecordedAt, existing.getRecordedAt())` (+ `endDateSetsRecordedAtToStartOfDayHoChiMinh`, kept `deleteAll(staleDuplicate)`, added pre-V25 PM deduplication test) |
| `(B)` | `InternshipSyncServiceTest.java` | `newBatchPersistsTasksAndInvokesCandidateService` | Asserted 3-arg `PmInternshipResultCommand("IOC-JB-2026-09", ..., 8.5)` | Kept 3-arg ctor for old callers; asserted full 5-arg command incl. `LocalDate.of(2026, 10, 30)` and exact JSON tree `payload` (no `any()`) |
| `(C)` | `SharedAppLayout.test.tsx` | `ROLE_MENU_CONFIG` & STAFF nav item lists | STAFF menu had 1 enabled item (`Hồ sơ ứng tuyển`) | Added `'Đồng bộ dữ liệu'` (`/staff/data-sync`, `disabled: false`) to STAFF lists only |
| `(D)` | `e2e/tier1-features/test_openapi_docs.test.mjs` | `EXPECTED_OPERATIONS` & `TC-T1-DOCS-03` | `45` paths / `48` operations | `50` paths / `53` operations (added exact 5 D10 operations + schema/403 assertions) |
| `(E)` | `DefaultProfileIntegrationTest.java` | `testDefaultProfileAppliesOnlyV1Schema` | Count `12` (`V1..V23`), DisplayName/message `V1..V23` | Count `13` (`V1..V25`), DisplayName/message updated with `V25` |
| `(E)` | `ProfileSeparationIntegrationTest.java` | `testProdProfileAppliesOnlyV1Schema`, `testDevProfileHasNineUsers`, `testDevProfileAppliesV1AndV2` | Prod `12` (`V1..V23`), Dev `21` (`V1..V24`) | Prod `13` (`V1..V25`), Dev `22` (`V1..V25`) |
| `(E)` | `CompanyMigrationIntegrationTest.java` | `LifecycleAndIdempotencyTests` (latest runs only) | Prod `12`, Dev `21`, `V9..V24` | Prod `13`, Dev `22`, `V9..V25` (fixed-target tests unchanged) |
| `(E)` | `InternshipMigrationIntegrationTest.java` | `testProdMigrations...`, `testDevMigrations...` | Prod `12`, Dev `21` | Prod `13`, Dev `22` (fixed-target tests unchanged) |
| `(E)` | `RecruitmentMigrationIntegrationTest.java` | `testProd...`, `testDev...`, `testUpgrades...`, `testV23AndV24...` | Prod `12` (`3` / `1` exec), Dev `21` (`5` / `2` exec) | Prod `13` (`4` / `2` exec), Dev `22` (`6` / `3` exec) |
| `(F)` | `frontend/src/features/identity/__tests__/roleUtils.test.ts` | `routePolicies (SSOT)` | `22` protected routes | `23` protected routes (added `['/staff/data-sync', ['STAFF']]`) |
| `(F)` | `e2e/run-all.mjs` | Tier 1 `files` array | 12 Tier 1 suites (`30` total) | Registered `'test_data_sync.test.mjs'` at end of Tier 1 (`31` total) |
| `(G)` | `SecurityHardeningIntegrationTest.java` | `testDefaultProfile...` (2 assertions) | `12` (`V1..V23`) | `13` (`V1..V25`) + DisplayName/message |
| `(G)` | `AiGovernanceIntegrationTest.java` | `flyway_schema_history` dev/prod latest & `openApiContainsNewAdminContracts` | Dev `21` (`"1".."24"`), Prod latest `12` (`"1".."23"`), `$.paths.length() = 45` | Dev `22` (`+ "25"`), Prod latest `13` (`+ "25"`), `$.paths.length() = 50` + 5 D10 paths (target `15` unchanged) |

*(Note: `SkillProfileIntegrationTest.java` added `source_key`, `payload`, and `synced_at` columns to direct SQL `INSERT INTO external_records` per D2 without changing any assertions.)*

---

## 7. Proposed Atomic Commit Sequence (`T022C02:`)

```text
T022C02: feat(db): add V25 external sync schema, H1 uniqueness safety net, and upgrade migration test
T022C02: fix(candidate,internship): serialize per-user skill writes to resolve H1 and H2 concurrency defects
T022C02: feat(candidate): implement NT-05 unified external sync, nightly/on-open jobs, manual overrides, and STAFF APIs
T022C02: feat(frontend): fix SkillProfilePage H3 error retention and add STAFF /staff/data-sync workflow
T022C02: test(e2e): add NT-05 opaque-box E2E suite and update OpenAPI 50-path / 53-operation coverage
T022C02: docs(nt05): add bilingual NT-05 docs, Q6/H1 updates, ERD/architecture updates, and sync agent-config baselines
```

---

## NT-05-fix (T022C02) — Defect Remediation & Evidence

Round `NT-05-fix` (`T022C02`) resolved all 12 defects (`F1`–`F12`) reproduced during Team Lead review while keeping Flyway `V1..V25` and `mock/data.json` byte-identical to the Phase 0 baseline.

### 1. Defect Remediation Summary (`F1`–`F12`)

| Defect | Root Fix | Verification Evidence |
|---|---|---|
| `F1` | `InternshipSyncServiceImpl` preserves raw PM source batch JSON objects (`sourcePayloadsByBatchId`); `InternshipPersistenceServiceImpl` passes raw JSON directly via `PmInternshipResultCommand` (Gate `(H)`). | `PmPayloadConsistencyIntegrationTest` + `InternshipSyncServiceTest` (RED->GREEN), E2E `TC-T1-NT05-05` PASS, live `psql` alternation (`synced_at` & `+07:00` unchanged, `0` TT-01 recompute logs, `pm.updated=0`). |
| `F2` | `StaffDataSyncPage.tsx` keeps existing rows with `aria-busy` during reload/paging, mounts error/retry next to kept rows, prevents spurious empty-state flash on candidate switch, and preserves pagination/filter focus across clamp & `skip*FetchKeyRef` resets. | Vitest `StaffDataSyncPage.test.tsx` (`F2a`–`F2l` RED->GREEN), `/browser` 25-run keyboard paging + `docker stop rikkei-backend` recovery (`nt05_fix_f2_runs_paging_and_backend_stop_kept_rows.png`). |
| `F3` | Replaced shared sync lock with per-candidate `syncBusyByCandidate` state map and `syncInFlightIdsRef` tracking in `StaffDataSyncPage.tsx` so syncing candidate A leaves candidate B usable while blocking double-submit on A and announcing A by name. | Vitest `F3` (RED->GREEN), `/browser` with `docker pause rikkei-mock` (`nt05_fix_f3_per_candidate_sync_busy_isolated.png`). |
| `F4` | `ManualOverrideDialog.tsx` moves focus to `[role="alert"]` inside the dialog on any server/network error while keeping focus trap, `Escape`, and trigger focus restore intact. | Vitest `F4` (RED->GREEN), `/browser` `502` with `rikkei-backend` stopped (`nt05_fix_f4_override_dialog_error_focus_inside.png`). |
| `F5` | Enforced `min-width: 0` and `overflow-wrap: anywhere` across user/upstream text containers, history entries, error alerts, and dialog subtitle in `staffDataSync.css`. | Vitest `F5` (RED->GREEN), `/browser` `200`-char `subjectName` + `480`-char `reason` across `375`/`768`/`1024`/`1440` Light & Dark (`0` page overflow; 3 PNGs). |
| `F6` | Replaced undefined `.rj-section-title` with a new `.ds-section-title` heading class created in `staffDataSync.css` (using design-system `--rj-font-display` tokens, not a pre-existing class) and added a static + DOM CSS class definition audit test in `StaffDataSyncPage.test.tsx`. | Vitest `F6` (`0` undefined classes), `/browser` `1440x900` Light (`nt05_fix_f6_headings_1440_light.png`). |
| `F7` | Added keyboard & touch accessible `"Chi tiết"` / `"Thu gọn"` disclosure (`aria-expanded`, `role="region"`) for failed run error text while keeping dense `38px` main row height. | Vitest `F7` (RED->GREEN), `/browser` keyboard (`Enter`/`Space`) at `1440x900` (`nt05_fix_f7_run_error_expanded_keyboard.png`) & touch at `375x812`. |
| `F8` | Added `SyncFailureLogger` across `ExternalSyncService`, `NightlySyncJob`, `OnOpenSyncService`, and `SkillProfileController` to log unexpected failures once at `ERROR` with redacted stack trace while keeping expected failures `WARN` without stack and HTTP `503`. | `SyncFailureLoggingTest` + `StaffDataSyncIntegrationTest` (RED->GREEN, zero DB detail/PII/key/payload leak). |
| `F9` | Restricted `attendanceRate`/`homeworkRate` overrides to max `2` decimals and rejected ISO control chars (`Character.isISOControl`) in text values and `reason` with `400 VALIDATION_ERROR` (Vietnamese message, zero DB write). | `StaffDataSyncIntegrationTest` (RED->GREEN), E2E `TC-T1-NT05-06`, live 6-case `curl`/`psql` (`0` rows written). |
| `F10` | `OnOpenSyncService.triggerIfStale` injects `IdentityPublicService` and returns immediately without submitting a background task or logging a warning when `lms_user_id` is absent/blank. | `OnOpenSyncServiceTest` + `OnOpenSyncNoLmsUserIdIntegrationTest` (RED->GREEN), live 5x `GET /me/skills` (`0` runs, `0` warnings). |
| `F11` | Removed test-only constructors, null-lock fallbacks, local `ObjectMapper` creation (`InternshipPersistenceServiceImpl`, `ExternalRecordNormalizer`), and dead 3-arg `ExternalRecord.updateResult`; wired single constructors (Gate `(I)`). | Before/after constructor & method audit + clean Maven compile (`-Xlint:all -Werror`, Spotless, SpotBugs `0`). |
| `F12` | Fixed method signatures in `docs/01-architecture-overview.md` (EN/VI), lock key description in `PR_DESCRIPTION.md`, proposed mapping status in `docs/nt05/README.md` (EN/VI), and exact `33`-table / `13`-FK catalog in `docs/erd/README.md` (EN/VI). | Fresh PostgreSQL `information_schema` catalog query (`33` tables, `13` FKs), `markdownlint-cli2` & `cspell` exit `0`. |

### 2. Updated Verification Metrics (`NT-05-fix`)

- **Backend**: `1449` tests across `104` test classes (`0` failures, `0` errors, `0` skipped), Spotless `455/455` clean, SpotBugs `0` bugs/errors.
- **Frontend**: ESLint `0` errors, TypeScript `0` errors, Vite build (`87.77 kB` JS / `14.23 kB` CSS entry gzip), `20/20` consecutive full Vitest runs (`51/51` files, `629/629` tests, `0` failures, `0` `act()` warnings).
- **E2E**: `31/31` suites, `365` test cases, `2470` assertions (`0` failures; `TC-T1-UT01-15` skipped awaiting `HS-04`).
- **Quality Gates**: `./check.sh` and `.\check.ps1` `26/26` PASS (identical parity), `sync-agent-config.mjs --check` & `validate-agent-config.mjs` exit `0`, `docker compose down -v` leaves `0` `rikkei` resources.

### 3. `NT-05-fix` Screenshots (`docs/nt05/pr-screenshots/`, gitignored)

1. `nt05_fix_f2_runs_paging_and_backend_stop_kept_rows.png` (`128,923` bytes)
2. `nt05_fix_f3_per_candidate_sync_busy_isolated.png` (`158,166` bytes)
3. `nt05_fix_f4_override_dialog_error_focus_inside.png` (`115,952` bytes)
4. `nt05_fix_f5_long_text_wrap_375_dark.png` (`58,161` bytes)
5. `nt05_fix_f5_responsive_1024_light.png` (`177,304` bytes)
6. `nt05_fix_f5_responsive_768_dark.png` (`233,698` bytes)
7. `nt05_fix_f6_headings_1440_light.png` (`134,007` bytes)
8. `nt05_fix_f7_run_error_expanded_keyboard.png` (`112,973` bytes)

---

## NT-05-fix2 (`T022C02`) — Defect Remediation & Final Verification

Round `NT-05-fix2` (`T022C02`) resolved all 8 defects (`G1`–`G8`) reproduced during Team Lead review while keeping Flyway `V1..V25` (`22` files) and `mock/data.json` byte-identical to the Phase 0 baseline.

### 1. Explicit Corrections to Earlier Claims (`G8`)

- **Correction to earlier `"no DB detail leaks"` / `"zero DB detail leak"` claim**: Earlier `F8` tests attached Logback appenders only to `com.rikkei.jobs.candidate`, missing `org.hibernate.orm.jdbc.error`, which still logged PostgreSQL `Detail: Failing row contains (...)` containing `external_records` payload/title PII at `WARN` directly to the ROOT logger on `MANUAL`, `ON_OPEN`, and `NIGHTLY` (`G2`). Fixed by setting `logging.level.org.hibernate.orm.jdbc.error: OFF` in `backend/src/main/resources/application.yml` across all profiles and proved via ROOT-logger Testcontainers tests (`G2RootLoggerLeakIntegrationTest`) plus live temporary `CHECK` constraint verification (`0` occurrences of marker or `Detail:` in full backend logs).
- **Correction to earlier `"no overflow"` / `"0 page overflow"` claims**: While top-level `document.documentElement` showed no horizontal overflow in `NT-05-fix`, two inner layout defects broke usability (`G1` & `G4`): (1) `.ds-runs-header > div { min-width: 0; flex: 1 1 220px; }` in `staffDataSync.css` also matched `.ds-runs-filters`, squeezing filter buttons to multi-line boxes overflowing the card at `1440`/`1920` px and past the viewport at `1024` px while truncating select labels at `768` px; (2) `.ds-run-error-detail-box` at `375` px rendered `571` px wide off-screen (`x = -654`) outside the visible `294` px `.ds-table-scroll` viewport. Both are fixed and re-verified across all required widths (`375/768/1024/1280/1440/1920`) with sidebar expanded & collapsed in Light & Dark modes.

### 2. Defect Remediation Table (`G1`–`G8`)

| Defect | Root Fix | RED -> GREEN / Before -> After / Live & `/browser` Evidence |
|---|---|---|
| `G1` | Removed `.ds-runs-header > div` regression; added `.ds-runs-heading-group`, flex-wrap `.ds-runs-filters`, `.ds-runs-filter-field`, and `white-space: nowrap` on `.ds-filter-actions .rj-btn` in `staffDataSync.css` & `StaffDataSyncPage.tsx`. | RED `StaffDataSyncPage.test.tsx:1820` -> GREEN (`635/51`); `/browser` `12/12` PASS (`375/768/1024/1280/1440/1920` px x sidebar expanded & collapsed x Light & Dark; all buttons `44px` single-line inside card; `0` truncated selects). |
| `G2` | Disabled `org.hibernate.orm.jdbc.error: OFF` in `backend/src/main/resources/application.yml` across all profiles while keeping `ExternalSyncService` redacted `ERROR` logs. | RED `G2RootLoggerLeakIntegrationTest:213` (ROOT logger leaked `Detail:` on `MANUAL`, `ON_OPEN`, `NIGHTLY`) -> GREEN (`0` marker/`Detail:` events in ROOT logger, `1` redacted `ERROR` per trigger); Live `tmp_chk_g2_live` constraint + marker `subjectName` -> `503` + `FAILED` `sync_runs` id=14 + `0` marker/`Detail:` in full backend log -> constraint dropped & `200 SUCCESS`. |
| `G3` | Classified `NightlySyncJob` candidate-listing errors via `SyncFailureLogger` (`ERROR` once with redacted stack for unexpected, `WARN` without stack for expected) before `SyncRun` insert; moved `ExternalSyncService` error logging before `recordFailure(...)`. | RED `SyncFailureLoggingTest:405,510` (`expected: <1> but was: <0>`) -> GREEN (`1453/105`); Live temporary `users.lms_user_id -> lms_user_id_tmp_g3` + `APP_SYNC_NIGHTLY_CRON="0/10 * * * * *"` -> `NIGHTLY` `user_id=NULL` `FAILED` rows + `ERROR` `NightlySyncJob` log (`0` `Detail:`) -> column & cron restored & `200 SUCCESS`. |
| `G4` | Added `container-type: inline-size` on `.ds-table-scroll`, `border-collapse: separate` on `.ds-dense-table`, and `position: sticky; left: ...; width: calc(100cqi - ...)` on `.ds-run-error-detail-box`. | RED `StaffDataSyncPage.test.tsx:1849` -> GREEN (`635/51`); `/browser` `3/3` PASS via `boundingBox()` at `1024` (`detailBox [340.80..912.01]`), `768` (`detailBox [332.80..699.99]`), and `375` (`scrollBox [40.80..319.20] w=278.40`, `detailBox [52.80..307.19] w=254.39, h=56.60`). |
| `G5` | Implemented guarded `armed -> anchored -> restore` `useLayoutEffect` focus retention across `"Đồng bộ lại"` (`syncBtnRef`) and all 6 `"Thử lại"` buttons (`candidatesRetryBtnRef`, `recordsRetryBtnRef`, `runsRetryBtnRef`) without stealing user-moved focus; kept `syncBusyByCandidate` & `syncInFlightIdsRef`. | RED `StaffDataSyncPage.test.tsx:1912,1996` (`document.activeElement` became `BODY`) -> GREEN (`20/20` Vitest runs, `0` `act()`); `/browser` with `docker pause rikkei-mock` & `docker stop rikkei-backend` (`body:focus=0` across busy/502/recovery; `Tab` to `"Sửa tay"` not stolen). |
| `G6` | Added `scopedCandidateName` to `RunsSnapshot` and separated `isRunsFilterStale`/`isRunsPageStale` and `isCandidatesQueryStale`/`isCandidatesPageStale` so banners, alerts, totals, and pagers name shown vs requested filters/queries. | RED `StaffDataSyncPage.test.tsx:2177` -> GREEN (`635/51`); `/browser` (`"Thất bại"` while backend stopped kept `"Tất cả trạng thái • Tất cả ứng viên"`, `30 lần chạy`, `Trang 1 / 2 (bộ lọc trước: Tất cả trạng thái • Tất cả ứng viên)`; `"binh"` kept 3 rows with `"tất cả ứng viên"` in alert). |
| `G7` | Split `containsDisallowedReasonControl` (BE) & `containsInvalidReasonControl` (FE) allowing `\n`, `\r\n`, `\t` in `reason` (keeping NUL/lone `\r`/other controls blocked and `subjectName`/`topicName` strict); added `ManualOverrideValueDeserializer` (`tools.jackson.databind.ValueDeserializer` for Jackson 3.1.7) on `ManualOverrideRequest.value` to reject `1e-100000` with `400`; added `.ds-history-reason` (`white-space: pre-wrap; overflow-wrap: anywhere`) and E2E `TC-T1-NT05-07`. | RED `StaffDataSyncIntegrationTest:455,522` & `StaffDataSyncPage.test.tsx:2295` -> GREEN (`1453/105`, `635/51`, E2E `TC-T1-NT05-07` `7/7` cases); Live `PUT /override` (`\n\t` -> `200`, `psql` `lf_pos=26, tab_pos=27, cr_pos=0`; `1e-100000` / lone `\r` / `\u0000` -> `400`, `0` DB rows); `/browser` `1e-100000` blocked (`0 PUT`), real `Enter` multiline saved & wrapped at `1440` and `375` px. |
| `G8` | Removed dead 4-arg `ExternalRecordNormalizer.upsertPmCommands`; fixed `syncingUserIds`, `.ds-section-title`, `docs/hs-01-skill-profile.md` item 7 (EN/VI `hasRecordChanged`), `docs/nt05/README.md` (G7 EN/VI), and `NT-05-fix2` accuracy corrections. | Before: 4-arg `upsertPmCommands` at `ExternalRecordNormalizer.java:325-331` -> After: removed, only 5-arg overload + `CandidatePublicServiceImpl.java:134` caller remain; `markdownlint-cli2`, `cspell`, `sync-agent-config.mjs --check`, `validate-agent-config.mjs` exit `0`. |

### 3. Authorized Test Adjustments & Added Coverage (`NT-05-fix2`)

Zero assertions existing on `develop` were altered. Only tests created in `NT-05` / `NT-05-fix` were adjusted or extended where `G1`–`G8` changed behavior:

| File | Location | Before | After |
|---|---|---|---|
| `StaffDataSyncIntegrationTest.java` | Line `442` -> `447` (`invalidLmsBodies`) | `"{\"field\":\"score\",\"value\":9.0,\"reason\":\"Lý do\\nXuống dòng\"}"` expected `400` | Replaced `400` case with lone CR `"{\"field\":\"score\",\"value\":9.0,\"reason\":\"Lý do\\rLoneCR\"}"`, added raw JSON `1e-100000`/`1e-9999999999` and `subjectName`/`topicName` control-char rejections, plus `manualOverrideAcceptsNewlinesAndTabsInReason` (`\n` and `\r\n` + `\t` -> `200`). |
| `SyncFailureLoggingTest.java` | Line `290` (`onOpenAndSkillProfileControllerClassifyAndRedact`) | `executor.setQueueCapacity(1)` (flaked once on full run when worker had not exited queue slot before 2nd submit) | `executor.setQueueCapacity(4)` (setup adjustment only; zero assertions changed) + 2 new G3 tests (`nightlySyncJobCandidateListingClassifiesUnexpectedAndExpected`, `externalSyncServiceLogsOriginalFailureWhenRecordFailureThrows`). |
| `G2RootLoggerLeakIntegrationTest.java` | New class (`+1` class, `+1` test) | N/A | Asserts `0` marker / `Detail:` events across entire ROOT logger on PostgreSQL constraint violations across `MANUAL`, `ON_OPEN`, and `NIGHTLY`. |
| `StaffDataSyncPage.test.tsx` | `+6` new tests (`G1`, `G4`, `G5a`, `G5b`, `G6`, `G7-FE`) | `629` tests / `51` files | `635` tests / `51` files (all prior assertions preserved). |
| `e2e/tier1-features/test_data_sync.test.mjs` | `+1` new case (`TC-T1-NT05-07`, `+10` assertions) | `31` suites / `365` cases / `2470` assertions | `31` suites / `366` cases / `2480` assertions. |

### 4. Updated Gate Summary (`NT-05-fix2`)

- **Backend**: `1453` tests across `105` test classes (`0` failures, `0` errors, `0` skipped; clean Maven build `.\mvnw.cmd clean test spotless:check spotbugs:check` PASS, Spotless `457/457` clean, SpotBugs `0` bugs).
- **Frontend**: ESLint `0` errors, TypeScript `0` errors, Vite build (`87.77 kB` JS / `14.23 kB` CSS entry gzip), `20/20` consecutive full Vitest runs (`51/51` files, `635/635` tests, `0` failures, `0` `act()` warnings).
- **E2E**: `31/31` suites, `366` test cases, `2480` assertions (`0` failures; `TC-T1-UT01-15` skipped awaiting `HS-04`).
- **Quality Gates & Hygiene**: `./check.sh` and `.\check.ps1` `26/26` PASS (identical parity), `sync-agent-config.mjs --check` & `validate-agent-config.mjs` exit `0`, `V1..V25` (`22` files) & `mock/data.json` SHA-256 unchanged, scoped `docker compose down -v` leaves `0` `rikkei` / Testcontainers artifacts.

### 5. `NT-05-fix2` Screenshots (`18` PNGs in `docs/nt05/pr-screenshots/`, gitignored)

1. `nt05_fix2_g1_runs_1920_expanded_light.png` (`142,885` bytes)
2. `nt05_fix2_g1_runs_1440_expanded_light.png` (`192,486` bytes)
3. `nt05_fix2_g1_runs_1440_collapsed_dark.png` (`152,510` bytes)
4. `nt05_fix2_g1_runs_1280_expanded_light.png` (`187,647` bytes)
5. `nt05_fix2_g1_runs_1024_expanded_light.png` (`199,256` bytes)
6. `nt05_fix2_g1_runs_1024_collapsed_dark.png` (`124,898` bytes)
7. `nt05_fix2_g1_runs_768_expanded_light.png` (`163,095` bytes)
8. `nt05_fix2_g1_runs_768_collapsed_dark.png` (`193,670` bytes)
9. `nt05_fix2_g1_runs_375_light.png` (`67,784` bytes)
10. `nt05_fix2_g4_error_box_1024.png` (`188,586` bytes)
11. `nt05_fix2_g4_error_box_768.png` (`170,335` bytes)
12. `nt05_fix2_g4_error_box_375.png` (`59,537` bytes)
13. `nt05_fix2_g5_sync_focus_preserved.png` (`161,827` bytes)
14. `nt05_fix2_g5_retry_focus_preserved.png` (`177,391` bytes)
15. `nt05_fix2_g6_runs_stale_filter_message.png` (`148,126` bytes)
16. `nt05_fix2_g6_candidates_stale_query_message.png` (`169,525` bytes)
17. `nt05_fix2_g7_multiline_reason_saved_history.png` (`130,290` bytes)
18. `nt05_fix2_g7_multiline_history_375_wrap.png` (`64,097` bytes)

---

## NT-05-fix3 (`T022C02`) — Defect Remediation & Final Verification

Round `NT-05-fix3` (`T022C02`) resolved the three remaining defects (`I1`, `I2`, `I3`) identified during Team Lead review of uncommitted `NT-05-fix2` work while keeping `backend/`, `mock/`, `e2e/`, all package manifests, Flyway `V1..V25`, and `mock/data.json` untouched.

### 1. Defect Remediation Table (`I1`–`I3`)

| Defect | Root Fix | RED -> GREEN / Before -> After Evidence |
|---|---|---|
| `I1` | Updated all three pagers (candidates, records, runs) in `StaffDataSyncPage.tsx` so `(đang tải trang N)` appears only while a request is in flight; after a failure, pagers display the kept page with `(chưa tải được trang N)` while `"Thử lại"` still requests page `N`. Also prevented `"Tổng cộng 0 lần chạy"` from rendering before `runsSnapshot` loads (and labeled stale refreshes `"lần tải trước"` on runs total and records count). | RED `StaffDataSyncPage.test.tsx` (`I1`) -> GREEN (`637/51`, `20/20` consecutive Vitest runs, `0` `act()` warnings); `/browser` live verification PASS at `1440x900` & `375x812` (`docker stop/start rikkei-backend`, `22` real sync runs + temporary DB paging rows): all 3 pagers showed `Trang 1 / 2 (chưa tải được trang 2)` with `"đang tải"` absent, and `"Thử lại"` recovered cleanly to `Trang 2 / 2` (`nt05_fix3_i1_*.png`). |
| `I2` | Gated normal empty-state messages in `StaffDataSyncPage.tsx` behind `isCandidatesCurrentLoaded`, `isRunsCurrentLoaded`, and `isRecordsCurrentLoaded` (plus `hasPendingCandidatesSearch` for the 300ms debounce window). When a snapshot belongs to a previous query, filter, scope, page, or stale refresh (loading or failed), empty states explicitly state that the empty result belongs to the previous query/filter/load and name it. Added `runsEmptyResetBtnRef` and `!activeEl.isConnected` handling in `useLayoutEffect` so keyboard activation of the empty-state `"Đặt lại bộ lọc"` button moves focus to the status combobox and never drops to `BODY`. Audited records list: candidate switching already clears `recordsSnapshot`, and stale post-sync refresh/page empty states now also distinguish `"lần tải trước"`. | RED `StaffDataSyncPage.test.tsx` (`I2`) -> GREEN (`637/51`, `20/20` consecutive Vitest runs, `0` `act()` warnings); `/browser` live verification PASS at `1440x900` & `375x812` (`docker stop rikkei-backend`): candidates (`"zzzz"` -> `"Bình"`) named previous query `"zzzz"`; runs (`"Thất bại"` -> keyboard `Tab` + `Enter` on `"Đặt lại bộ lọc"`) named `"Thất bại • Tất cả ứng viên"` with focus on `"Tất cả trạng thái"` (`BODY` focus `0`); records empty state stayed truthful on failed sync (`nt05_fix3_i2_*.png`). |
| `I3` | Updated `README.md` `"Individual checks and verified baselines"` (`1453` backend tests / `105` classes, `637` frontend tests / `51` files, `31` E2E suites / `366` cases / `2480` assertions), synced `agent-config/rules/10-testing-strategy.md` (`635 -> 637` frontend tests) to `.claude/` and `.gemini/`, and appended `NT-05-fix3` sections to `PHASE0_ACK.md`, `PR_DESCRIPTION.md`, and `BROWSER_OBSERVATIONS.md` while keeping historical sections intact. | Before/after grep & diff across `README.md`, `agent-config/rules/10-testing-strategy.md`, `sync-agent-config.mjs --check`, `validate-agent-config.mjs`, `markdownlint-cli2`, and `cspell` exit `0`. |

### 2. Authorized Test Additions (`NT-05-fix3`)

Zero assertions existing on `develop` or in prior `NT-05` tests were weakened or altered. Two new tests were added to `frontend/src/features/candidate/__tests__/StaffDataSyncPage.test.tsx` (`635 -> 637` tests / `51` files):

1. `I1`: Verifies initial `runsSnapshot === null` does not render `"Tổng cộng 0 lần chạy"`, verifies all 3 pagers (`candidates`, `records`, `runs`) clear `"đang tải"` after page 2 fails, show `"chưa tải được trang 2"`, and retry page `2`.
2. `I2`: Verifies previous empty results are never presented as current during loading or failure across candidates (`"zzzz"` -> `"binh"`), runs (`"Thất bại"` -> reset, and `"Tất cả trạng thái"` -> `"Thành công"`), and records (`0` records -> `"Đồng bộ lại"` refresh), and verifies keyboard focus moves off `BODY` on empty-state `"Đặt lại bộ lọc"`.

### 3. Gate Summary (`NT-05-fix3`)

- **Backend**: `1453` tests across `105` test classes (`0` failures, `0` errors, `0` skipped; clean Maven build `.\mvnw.cmd clean test spotless:check spotbugs:check` PASS, Spotless `457/457` clean, SpotBugs `0` bugs).
- **Frontend**: ESLint `0` errors, TypeScript `0` errors, Vite build (`87.78 kB` JS / `14.23 kB` CSS entry gzip), `20/20` consecutive full Vitest runs (`51/51` files, `637/637` tests, `0` failures, `0` `act()` warnings).
- **E2E**: Fresh `docker compose up -d --build --wait` -> `node e2e/run-all.mjs` (`31/31` suites, `366` cases, `2480` assertions, `0` failures; `TC-T1-UT01-15` skipped awaiting `HS-04`) -> `docker compose down -v` (`0` `rikkei` containers, volumes, or networks left).
- **Quality Gates**: `./check.sh` and `.\check.ps1` `26/26` PASS (identical parity), `sync-agent-config.mjs --check` & `validate-agent-config.mjs` exit `0`.
- **`/browser` (`I1`/`I2` at `375x812` & `1440x900`)**: PASS on fresh Docker stack (`http://127.0.0.1:3000`, `0` console errors, `22` real sync runs + temporary paging rows, `docker stop/start rikkei-backend`, keyboard navigation verified, scoped `docker compose down -v` completed).

### 4. `NT-05-fix3` Screenshots (`6` PNGs in `docs/nt05/pr-screenshots/`, gitignored)

1. `nt05_fix3_i1_3pagers_failed_1440.png` (`173,048` bytes)
2. `nt05_fix3_i1_pagers_failed_375.png` (`66,849` bytes)
3. `nt05_fix3_i1_3pagers_retry_page2_1440.png` (`124,045` bytes)
4. `nt05_fix3_i2_candidates_prev_empty_failed_1440.png` (`169,447` bytes)
5. `nt05_fix3_i2_runs_prev_empty_reset_kbd_1440.png` (`111,454` bytes)
6. `nt05_fix3_i2_empty_and_records_375.png` (`67,590` bytes)

---

## NT-05-fix4 (`T022C02`) — E2E Password-Login Rate-Limit Budget Fix (`J1`)

Round `NT-05-fix4` (`T022C02`) resolves blocker `J1` (the uncommitted `NT-05` E2E suite pushing a single-window E2E run over the `160`/min per-IP `POST /api/v1/auth/login` rate limit) while keeping `backend/`, `frontend/`, `mock/`, all other `e2e/` files (including `e2e/run-all.mjs` and `e2e/helpers/`), `docker-compose.yml`, `.env.example`, `.github/`, `check.sh`, `check.ps1`, all package manifests, and Flyway `V1..V25` byte-identical to the `NT-05-fix4` Phase 0 baseline.

### 1. Root Cause & Surgical Remediation (`J1`)

- **Cause**: `e2e/tier1-features/test_data_sync.test.mjs` previously signed in 8 accounts (`staff1`, `candidate1`, `candidate2`, `candidate3`, `hr1`, `hr2`, `mentor1`, `admin1`) via `POST /api/v1/auth/login`, bringing a complete 31-suite run to `166` password logins (`> 160` limit per 60s epoch-aligned window). Inside a single `:00`-aligned window, `test_company_scenarios.test.mjs` hit `3` HTTP `429` responses after `163` total password logins (`30/31` suites, FAIL).
- **Changes (2 E2E files only)**:
  1. `e2e/tier2-boundaries/test_rbac_matrix_boundaries.test.mjs`: Extended the header comment and added `TC-T2-RBAC-14`, moving all `60` RBAC matrix checks (`5` D10 endpoints x `2` origins `:8080` & `:3000` x `6` callers: anonymous `401 UNAUTHORIZED`, `CANDIDATE`/`HR`/`MENTOR`/`ADMIN` `403 FORBIDDEN`, `hr1` `403 MUST_CHANGE_PASSWORD`) using the actors already signed in by `before()`, adding `0` login calls and leaving every existing case and `before()` untouched.
  2. `e2e/tier1-features/test_data_sync.test.mjs`: Removed `TC-T1-NT05-01`, removed unused `candidate3` and role-denial actors (`hr1`, `hr2`, `mentor1`, `admin1`) and unused `DEV_SEED_PASSWORD`/`loginUser` imports, defined `loginViaMockSso(lmsUserId)` directly in the suite, signed in `staff1` (`lms-st-001`), `cand1` (`lms-sv-001`), and `cand2` (`lms-sv-002`) via mock SSO (`0` password logins), asserted `staff1.user.email === 'staff1@rikkeijobs.test'` and `role === 'STAFF'`, added the required English comment explaining the SSO budget rationale, and preserved every assertion of `TC-T1-NT05-02` through `TC-T1-NT05-07` without renumbering.

### 2. E2E Authentication Budget & Margin Warning

- **Measured Budget per Full E2E Run**:
  - `POST /api/v1/auth/login` (password logins): **`158 / 160`** (limit `160` per 60s fixed window)
  - `POST /api/v1/auth/sso` (mock SSO logins): **`56 / 60`** (limit `60` per 60s fixed window)
- **Small Margin Note**: Only **`2` password-login requests** and **`4` SSO requests** of headroom remain within a single 60-second rate-limit window. Any future E2E suite that adds more than `2` password logins (or `> 4` SSO logins) in a single-window run will hit the same per-IP rate limit unless it reuses existing actors or authenticates within the remaining budget.

### 3. Fresh-Stack Empirical Evidence (`J1` + Deliberate Break + Baselines)

- **RED (pre-edit, `:00`-aligned fresh stack)**: Started `2026-11-28T03:27:00.048Z` -> ended `2026-11-28T03:27:51.093Z` (`50.88s`, all calls in minute `03:27`; first log `03:27:01.003Z`, last log `03:27:51.051Z`): `216` auth calls (`163` password logins, `53` SSO), **`3` x HTTP `429`** in `test_company_scenarios.test.mjs`, `30/31` suites (`1` failed).
- **GREEN Aligned Run 1 (`:00`, fresh stack)**: `2026-11-28T03:30:00.789Z` -> `2026-11-28T03:30:48.264Z` (`47.36s`; first log `03:30:01.743Z`, last log `03:30:47.905Z`, inside minute `03:30`): `31/31` PASS (`366` cases, `2486` assertions), **`0` x `429`**, **`158` password / `56` SSO**.
- **GREEN Aligned Run 2 (`:00`, fresh stack)**: `2026-11-28T03:32:00.034Z` -> `2026-11-28T03:32:46.361Z` (`46.18s`; first log `03:32:00.977Z`, last log `03:32:45.988Z`, inside minute `03:32`): `31/31` PASS, **`0` x `429`**, **`158` password / `56` SSO**.
- **GREEN Aligned Run 3 (`:00`, fresh stack)**: `2026-11-28T03:34:00.074Z` -> `2026-11-28T03:34:49.297Z` (`49.06s`; first log `03:34:01.091Z`, last log `03:34:48.897Z`, inside minute `03:34`): `31/31` PASS, **`0` x `429`**, **`158` password / `56` SSO**.
- **Arbitrary-Second Run 4 (fresh stack)**: `2026-11-28T03:35:35.511Z` -> `2026-11-28T03:36:24.138Z` (`48.50s`; first log `03:35:36.472Z`, last log `03:36:23.776Z`): `31/31` PASS, **`0` x `429`**, **`158` password / `56` SSO**.
- **`run-all.mjs` Count Delta (`31 / 366 / 2480` -> `31 / 366 / 2486`)**:
  - `test_data_sync.test.mjs`: `7 -> 6` cases (`-1` moved `TC-T1-NT05-01`), `105 -> 110` assertions (`-1` from `TC-T1-NT05-01`, `+4` in `loginViaMockSso`, `+2` verifying `staff1.user.email` and `staff1.user.role`).
  - `test_rbac_matrix_boundaries.test.mjs`: `13 -> 14` cases (`+1` `TC-T2-RBAC-14`), `116 -> 117` assertions (`+1` `assert.ok(backendOnline && frontendOnline, ...)`).
  - Updated `README.md` baseline line and `agent-config/rules/10-testing-strategy.md` (`2480 -> 2486`), synced mirrors via `node scripts/sync-agent-config.mjs` (`--check` PASS).
- **Deliberate Break & Restore (`TC-T2-RBAC-14`, Rule 04 §4)**: Mutating `:8080 POST /staff/sync/1 (anonymous)` expected code to `'FORBIDDEN_DELIBERATE_BREAK'` caused `node --test e2e/tier2-boundaries/test_rbac_matrix_boundaries.test.mjs` to FAIL (`13/14` pass, `1` fail, exit `1`); restoring from OS temp backup matched pre-mutation SHA-256 (`5d27a52eb12f8af9e73c6d775677a8e42b1b831a963b9a54d8c42f3d7253abb2`) and passed `14/14` (exit `0`).
- **Quality Gates & Immutability**: `./check.sh` and `.\check.ps1` `26/26` PASS (identical); SHA-256 comparison against `NT-05-fix4` Phase 0 confirms `backend/`, `frontend/`, `mock/`, all other `e2e/` files, `docker-compose.yml`, `.env.example`, `.github/`, `check.sh`, `check.ps1`, and manifests are byte-identical; `docker compose down -v` left `0` `rikkei` containers, volumes, or networks.
