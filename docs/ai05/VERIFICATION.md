# AI-05 verification

This file is updated from actual command outputs. Full raw logs are local verification artifacts
under this directory; generated build outputs and log files follow the repository ignore rules.
The implementation is not certified as passing all repository gates; Docker-dependent checks
remain explicitly unverified in this environment.

## Confirmed focused test results

`npm --prefix frontend test`:

```text
 Test Files  38 passed (38)
      Tests  441 passed (441)
```

`backend/mvnw -f backend/pom.xml -Dtest=PiiMaskerTest,AiServiceTest,AiClientTest,JobRecommendationServiceTest test`:

```text
[INFO] Tests run: 47, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

`AiGovernanceIntegrationTest` with an explicit disposable host PostgreSQL 18.4 database:

```text
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

The host PostgreSQL evidence does not replace the pinned 18.6 Testcontainers suite.

## Environment limitation

The full gate runner reaches its summary and reports failure. Docker CLI/Compose are installed,
but the daemon is unavailable. Testcontainers and Hadolint/Yamllint/Actionlint/SQLFluff container
commands cannot execute:

```text
failed to connect to the docker API at unix:///var/run/docker.sock
connect: no such file or directory
```

The first run also found two existing frontend route/menu inventory assertions needing the new
ADMIN pages, and five spelling findings. Those were corrected; final results are recorded below.
No tests or quality gates were disabled.

## UI preview evidence

[Browser observations](browser-observations.json) contain actual viewport and text contrast
measurements on the rendered pages. All screenshots use clearly identified synthetic API fixtures.
They are browser/UI evidence rather than end-to-end backend evidence. Peer review and mentor
approval remain pending. The user has now explicitly authorized publishing the task branch
and opening a PR into develop; that authorization does not include merging the PR.

## Final checks and remaining blockers

The final full runner exited **1**. Its raw summary included these lines:

```text
[PASS] Node.js Environment                           : Detected v26.5.1 (>= v20 LTS required)
[PASS] Java 25 LTS Toolchain                         : Configured JAVA_HOME: /usr/lib/jvm/java-25-openjdk (openjdk version "25.0.4" 2026-07-21)
[PASS] Docker & Compose Engine                       : Docker version 29.7.1, build e9452d6e78 | Docker Compose version 5.4.0
[PASS] Mock External Systems Test Suite              : Passed all 8 self-check criteria
[PASS] Frontend ESLint                               : Zero ESLint errors
[PASS] Frontend TypeScript Typecheck                 : Zero type errors
[PASS] Frontend Vitest Unit Tests                    : All unit tests passed
[PASS] Frontend Production Build                     : Vite bundle build succeeded
[PASS] Backend Java Compiler (-Xlint:all -Werror)    : Zero warnings, compiled cleanly
[PASS] Backend Spotless Code Style                   : Spotless AOSP formatting clean
[PASS] Backend SpotBugs Static Analysis              : Zero SpotBugs violations detected
[FAIL] Backend JUnit & Testcontainers Tests          : Maven test failed
[PASS] Docker Compose Syntax & Port Bindings         : 5 services valid, loopback ports bound
[FAIL] Hadolint Dockerfile Linter                    : Hadolint found Dockerfile issues
[FAIL] Yamllint YAML Validation                      : Yamllint found YAML issues
[FAIL] Actionlint Workflow Validation                : Actionlint found workflow issues
[FAIL] SQLFluff Database Migration Linter            : SQLFluff found SQL migration issues
[PASS] Markdownlint Documentation Style              : Documentation matches style rules (0 errors)
[PASS] CSpell Documentation Spelling                 : Spelling check passed with Vietnamese dictionary support (0 errors)
[PASS] Version Table Drift Check (docs/03)           : All 29 table versions match manifest files exactly across both languages
[PASS] Contrast Table Verification (docs/design)     : All WCAG 2.2 contrast pairs verified with exact printed ratios
[PASS] Quality Gate Synchronization Check            : All gates synchronized across check.sh, check.ps1, and CI
[FAIL] Agent Configuration Sync & Parity Check       : Agent configuration drift or validation failure detected
[PASS] Machine-Specific Paths Scan                   : Zero machine-specific paths detected
[PASS] Lingering TODO / FIXME Comments Scan          : Clean production source code
[PASS] Secret Leak & Private Key Scan                : Zero real secrets or keys leaked
```

The agent configuration finding was an unescaped bracketed PR title in Markdown. It was
corrected without changing the validator. The direct reruns then exited 0:

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Checks 1 through 10: ALL GREEN.
[PASS] Agent configuration is 100% synchronized!
Verified 168 files across .claude, .gemini, and root entrypoints.
Zero missing, zero drift, zero orphans.
```

The remaining full-run blockers are the unavailable Docker daemon: backend Testcontainers,
Hadolint, Yamllint, Actionlint and SQLFluff. No all-gates-pass claim is made.

After the full runner's frontend phase, browser testing found and fixed dialog focus restoration.
The **entire frontend test suite**, lint and production build were rerun on that final source,
all with exit 0. Raw excerpts:

```text
Test Files  38 passed (38)
Tests  441 passed (441)
✓ built in 374ms
```

The final browser capture run exited 0 and asserted that Escape closes the dialog and returns
focus to its triggering row button. It also tested saving limit 2 with AI disabled. Eight viewport
checks found `scrollWidth == clientWidth`. Minimum measured body-text contrast was 6.65:1 in
light mode and 5.74:1 in dark mode. There were no browser page errors. These measurements use
synthetic API fixtures, with results in `browser-observations.json`.

The disposable PostgreSQL cluster was stopped and its temporary directory deleted. The frontend
preview server was stopped. The initial verification preceded publication. A teammate review,
mentor approval and pinned-container verification remain outstanding. Publication was subsequently
authorized explicitly by the user and is tracked in the PR.

## Pre-publication recheck

The task branch was checked against a fresh fetch of origin/develop: both were at
`eb75201` before the task commit (zero commits ahead/behind). The user explicitly authorized
commit/push of the feature branch and creation of a PR into develop. No merge is authorized.

The full runner was executed again and exited 1. Its latest summary follows:

```text
[PASS] Node.js Environment                           : Detected v26.5.1 (>= v20 LTS required)
[PASS] Java 25 LTS Toolchain                         : Configured JAVA_HOME: /usr/lib/jvm/java-25-openjdk (openjdk version "25.0.4" 2026-07-21)
[PASS] Docker & Compose Engine                       : Docker version 29.7.1, build e9452d6e78 | Docker Compose version 5.4.0
[PASS] Mock External Systems Test Suite              : Passed all 8 self-check criteria
[PASS] Frontend ESLint                               : Zero ESLint errors
[PASS] Frontend TypeScript Typecheck                 : Zero type errors
[PASS] Frontend Vitest Unit Tests                    : All unit tests passed
[PASS] Frontend Production Build                     : Vite bundle build succeeded
[PASS] Backend Java Compiler (-Xlint:all -Werror)    : Zero warnings, compiled cleanly
[PASS] Backend Spotless Code Style                   : Spotless AOSP formatting clean
[PASS] Backend SpotBugs Static Analysis              : Zero SpotBugs violations detected
[FAIL] Backend JUnit & Testcontainers Tests          : Maven test failed
[PASS] Docker Compose Syntax & Port Bindings         : 5 services valid, loopback ports bound
[FAIL] Hadolint Dockerfile Linter                    : Hadolint found Dockerfile issues
[FAIL] Yamllint YAML Validation                      : Yamllint found YAML issues
[FAIL] Actionlint Workflow Validation                : Actionlint found workflow issues
[FAIL] SQLFluff Database Migration Linter            : SQLFluff found SQL migration issues
[PASS] Markdownlint Documentation Style              : Documentation matches style rules (0 errors)
[PASS] CSpell Documentation Spelling                 : Spelling check passed with Vietnamese dictionary support (0 errors)
[PASS] Version Table Drift Check (docs/03)           : All 29 table versions match manifest files exactly across both languages
[PASS] Contrast Table Verification (docs/design)     : All WCAG 2.2 contrast pairs verified with exact printed ratios
[PASS] Quality Gate Synchronization Check            : All gates synchronized across check.sh, check.ps1, and CI
[PASS] Agent Configuration Sync & Parity Check       : All rules, skills, and entrypoints in sync with canonical source and validated
[PASS] Machine-Specific Paths Scan                   : Zero machine-specific paths detected
[PASS] Lingering TODO / FIXME Comments Scan          : Clean production source code
[PASS] Secret Leak & Private Key Scan                : Zero real secrets or keys leaked
```

The agent configuration finding from the earlier run is resolved; the latest full runner
passed that gate. Only Docker-dependent checks remain unverified. After the full runner,
the focused backend suite and the disposable local integration suite were rerun, both exit 0:

```text
[INFO] Tests run: 47, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

Review found no additional application changes needed before publication. The PostgreSQL
18.4 cluster and its unique OS temporary directory were cleaned after the recheck. Peer review,
mentor approval and verification with the pinned PostgreSQL 18.6 image remain pending.

## CI migration inventory regression

The initial [backend CI run](https://github.com/rikkei-jobs/rikkei-jobs/actions/runs/44950241450/job/136986344523)
executed 750 tests and failed 11 assertions. All 11 were stale migration counts after adding V17:
production/default/staging expected 8 instead of 9, dev expected 15 instead of 16, and the
V15-only upgrade test unintentionally ran newer migrations.

The fix updates the five affected test classes for the latest inventory and pins the V15-only
upgrade to target 15. It preserves all no-seed, zero-user, data preservation and idempotency
assertions. A new real PostgreSQL regression checks exact version lists for current schema,
current dev seed and frozen V15 targets, including AI-table presence and empty production users.

The supplemental local PostgreSQL 18.4 integration command exited 0:

```text
[INFO] Tests run: 13, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

The pinned PostgreSQL 18.6 suites remain authoritative on GitHub Actions. Production application
code and migration SQL were not changed by this regression fix.

## OpenAPI E2E inventory

The migration fix passed [Backend Quality Gates](https://github.com/rikkei-jobs/rikkei-jobs/actions/runs/44951214916/job/136989322552)
with the pinned PostgreSQL 18.6 image:

```text
[INFO] Tests run: 751, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

The subsequent E2E run exposed one stale exact OpenAPI inventory. It expected 27 paths and
29 operations, omitting the three AI administration paths and four operations. The inventory
now explicitly includes GET/PUT configuration, GET logs and GET usage: 30 paths / 33 operations.
Exact path/method matching, Bearer security and 401 assertions remain; ADMIN AI operations also
require a documented 403. The real-database OpenAPI integration test additionally checks the
30-path total. No application routes or migration SQL were changed to accommodate these tests.

## AI05-fix

This section records empirical RED -> GREEN verification outputs collected during round `AI05-fix` (`T023DF5`) on branch `feature/t023df5-ai-safety-controls`. Existing sections above are preserved verbatim. Live Docker A9 concurrency/UTC checks, `/browser` journeys, full `./mvnw test`, `./check.sh` / `.\check.ps1`, and full `docker compose up -d --build --wait` -> `node e2e/run-all.mjs` -> `docker compose down -v` runs are appended in the final live verification step.

### M1 — Backend Fixes (A1, A2, A3, A5, A6)

- **RED (A1)**: Running `PiiMaskerTest` against the pre-fix masker failed 24 of 57 cases (separated 12-digit IDs, bare `84` phones, digit-by-digit spaced phones, zero-width/bidi characters, and full-width digits/`@`), and `"0".repeat(1_000_000)` stalled `> 60 s` due to `O(N^2)` email regex backtracking.
- **GREEN (A1–A3, A5–A6)**:
  - `.\mvnw.cmd clean test-compile spotless:apply spotless:check spotbugs:check`: `256` main + `71` test files compiled with `-Xlint:all -Werror` (`0` warnings), `327` files Spotless clean, `0` SpotBugs bugs (`BUILD SUCCESS`).
  - Targeted AI suite (`PiiMaskerTest` 64, `AiServiceTest` 16, `AiClientTest` 6, `JobRecommendationServiceTest` 13, `AiConfigServiceTest` 19, `AiGovernanceIntegrationTest` 16, `CandidateJobRecommendationIntegrationTest` 7): **141/141 PASS**, including 5 hostile 1 MB inputs in `PiiMaskerTest` completing in `85 ms`, `127 ms`, `122 ms`, `84 ms`, and `52 ms` (all `< 1000 ms`).
  - `FlywayMigrationIntegrationTest` + `ProfileSeparationIntegrationTest`: **10/10 PASS**.
  - `sqlfluff/sqlfluff:4.5.0 lint backend/src/main/resources/db/migration/V17__ai_governance.sql`: exit `0` (`All Finished!`).

### M2 — Backend A7 (Retention Job, V17 Indexes, Bounded Count)

- **RED (A7)**: `AiLogRetentionJobTest` failed compilation prior to implementing `AiSchedulingConfig`, `AiLogRetentionJob`, and `AiLogPage.totalCapped` (exit `1`).
- **GREEN (A7)**:
  - `.\mvnw.cmd clean test-compile spotless:apply spotless:check spotbugs:check`: `258` main + `73` test files compiled (`0` warnings), `331` files Spotless clean, `0` SpotBugs bugs (`BUILD SUCCESS`, `32.760 s`).
  - Targeted tests (`AiLogRetentionJobTest` 5, `AiLogRetentionIntegrationTest` 4, `AiGovernanceIntegrationTest` 16, `FlywayMigrationIntegrationTest` 3, `ProfileSeparationIntegrationTest` 7, `DefaultProfileIntegrationTest` 3, `OpenApiCoverageIntegrationTest` 3): **41/41 PASS** (`BUILD SUCCESS`).
  - `sqlfluff/sqlfluff:4.5.0 lint backend/src/main/resources/db/migration/V17__ai_governance.sql`: exit `0`.

### M2 Benchmark — 800k-Row `EXPLAIN (ANALYZE, BUFFERS)` (PostgreSQL `18.6-alpine`)

Measured on a disposable `postgres:18.6-alpine` container populated with `800,000` synthetic `ai_logs` rows (180 UTC days, 2,000 users; `RECOMMEND` 60.02%, `CHAT` 15.00%, `CV` 14.95%, `PRACTICE` 10.04%; `OK` 84.96%, `BLOCKED` 10.04%, `ERROR` 4.99%) and `200,000` `ai_usage` rows, then deleted cleanly.

| Metric / Query | BEFORE (`V17` original) | AFTER (`Candidate 1B` + bounded count) | Delta / Plan Impact |
|---|---|---|---|
| `ai_logs` total index size | `189 MB` (4 secondary + PK) | `97 MB` (3 secondary + PK) | `-48.7%` index footprint; `idx_ai_usage_date` (`1616 kB`) removed |
| 10,000-row `INSERT` batch | `139.447 ms` | `60.635 ms` | `2.30x` faster writes |
| `Q1a_180d_dirty` (`COUNT(*)`, 10k un-vacuumed) | `51.854 ms` / `7,401` buffers | `149.126 ms` / `123,228` buffers (`Heap Fetches: 119,873`) | Exceeds `100 ms`; bounded `LIMIT 10001` drops to `3.480 ms` (`4,938` buffers) |
| `Q1b_30d` (`COUNT(*)` `RECOMMEND` 30d) | `11.970 ms` / `701` buffers | `14.301 ms` / `911` buffers (`Index Only Scan`) | Drops 52 MB `feature` index while staying index-only |
| `Q2b_p0` (list `user_id=42` `OFFSET 0`) | `0.154 ms` / `33` buffers (`Incremental Sort`) | `0.085 ms` / `23` buffers (`Index Scan`, 0 sort) | Eliminates `Incremental Sort` via `id DESC` |
| `Q2d_p0` (list `status='ERROR'` `OFFSET 0`) | `0.054 ms` / `17` buffers (`Incremental Sort`) | `0.048 ms` / `18` buffers (`idx_ai_logs_non_ok_status`) | 5 MB partial index (`WHERE status <> 'OK'`) replaces 43 MB index |
| `Q3a_90d` (daily UTC summary 90d) | `281.616 ms` / `31,461` buffers (`Seq Scan` 246 MB) | `202.626 ms` / `2,757` buffers (`Index Only Scan`) | `11.4x` fewer buffers via `INCLUDE`; 30d window `64.068 ms` (`914` buffers) |
| `Q3b_30d` (feature summary 30d) | `55.683 ms` / `31,477` buffers (`Parallel Seq Scan`) | `18.329 ms` / `929` buffers (`Parallel Index Only Scan`) | `3.0x` faster, `33.9x` fewer buffers |
| `Q4` (retention `DELETE` 5,000 rows) | `12.444 ms` (unordered) | `16.714 ms` (`ORDER BY created_at ASC, id ASC`) | Sequential backward index scan vs `60.769 ms` scattered delete |

### M3 — Frontend Fixes (A4, A2 Banner, A6 Validation, A7 `totalCapped`)

- **RED**: `npx vitest run` on `JobRecommendationsSection.test.tsx` and `AiAdmin.test.tsx` failed 4 new tests covering the A2 notice banner (`recommendations.length > 0`), A6 model path/colon rejection, `"Hủy thay đổi"` error clearing, and A7 `totalCapped` count indicator.
- **GREEN**:
  - `git diff origin/develop -- frontend/src/App.tsx frontend/src/features/identity/pages/role-homes/AdminHomePage.tsx`: all 7 hunks in `App.tsx` and 2 hunks in `AdminHomePage.tsx` reverted to `origin/develop` formatting, leaving only AI route/card additions.
  - `npm run lint --prefix frontend`: exit `0`.
  - `npm run typecheck --prefix frontend`: exit `0`.
  - `npm test --prefix frontend`: **38 files / 447 tests PASS**, `0` `act()` warnings.
  - `npm run build --prefix frontend`: exit `0`; entry JS `317.71 kB` / `99.09 kB` gzip (`-0.01 kB` vs `99.10 kB` baseline), entry CSS `84.66 kB` / `14.04 kB` gzip (`0.00 kB` delta vs `14.04 kB` baseline).
  - `node scripts/compute-contrast.mjs`: `120` color pairs audited, `0` violations (`ALL GREEN`).

### M4 — Docs Hygiene, Sample Data & E2E Extension (A8)

- Removed 11 PNG files from `docs/ai05/screenshots/` (and the empty directory), `docs/ai05/capture-ui.mjs`, and `docs/ai05/run-local-integration.py`; added `docs/ai05/pr-screenshots/` to `.gitignore`.
- Verified `docs/ai05/sample-data.sql` on a throwaway `postgres:18.6-alpine` container (`rikkei-sample-check`) after `V1`, `V2`, `V11`, `V17`: `COMMIT` with `ai_config=1`, `ai_logs=3`, `ai_usage=1` (100% synthetic), followed by `docker rm -f -v rikkei-sample-check`.
- Added `e2e/tier2-boundaries/test_ai_governance_admin.test.mjs` and registered it in `e2e/run-all.mjs` (updated total: `28` suites, `334` cases, `2078` assertions).
- Verified `node --check`, `markdownlint-cli2`, `cspell`, `validate-agent-config.mjs`, `sync-agent-config.mjs --check`, `check-gate-sync.mjs`, and `check-version-drift.mjs` exit `0`.

### M5 — Wave 8 Final Code, Adversarial Probe, Test & Static Gate Results

- **Backend full suite (`./mvnw test-compile spotless:check spotbugs:check` & `./mvnw test`)**:
  - `test-compile` (`-Xlint:all -Werror`): `0` warnings; Spotless AOSP: `331` files clean; SpotBugs: `0` bugs / `0` errors (`BUILD SUCCESS`).
  - `./mvnw test`: **1015/1015 PASS** (`Failures: 0, Errors: 0, Skipped: 0`), including `PiiMaskerTest` **243/243 PASS** (`7.658 s` in full gate run; covers all old, new, Unicode `OTHER_NUMBER`, non-PII, null/empty, and 15 hostile 1 MB cases).
- **Frontend full suite (`frontend/`)**:
  - `npm run lint`: exit `0`; `npm run typecheck`: exit `0`.
  - `npm test`: **38 files / 448 tests PASS**, `0` `act()` or React warnings.
  - `npm run build`: exit `0` (`dist/assets/index-_DypOoAH.js` `317.71 kB` / `99.10 kB` gzip; `dist/assets/index-BANbuE8W.css` `84.66 kB` / `14.04 kB` gzip — matching baseline ceilings).
- **Independent Wave 8 adversarial challenge (`challenger_iter8_1`)**:
  - Exhaustive scan of all `915` Unicode `Character.OTHER_NUMBER` code points (`U+0000`..`U+10FFFF`) across 10 templates (`9,150` checks): `0` idempotency failures, `0` unpaired UTF-16 surrogates, `0` prefix leaks.
  - Randomized adversarial fuzzer (`2,000` combinations of email, `ID`, `PHONE`, BMP/supplementary `OTHER_NUMBER`, `OTHER_SYMBOL`, control characters, and delimiters): `0` failures.
  - Regression probes (`86/86 PASS` across delimiter, boundary, non-PII, and chained-email sets) and `14/14` warm 1 MB benchmarks completing in linear `O(N)` time with all `max <= 687 ms` (`< 1000 ms`).
- **Forensic integrity audit (`auditor_iter8_1`)**: Verdict **CLEAN** — verified authentic `O(N)` implementation and fail-closed gateway calls, `243/243` `PiiMaskerTest`, `21/21` independent temp-dir probes, `11/11` `Re-read:` entries in `docs/ai05/PHASE0_ACK.md`, empty staging area, unchanged `pom.xml`/`package*.json`, and `15/15` byte-identical SHA-256 matches on `origin/develop` migrations/seeds.

### M6 — Clean Docker Stack E2E (`node e2e/run-all.mjs` Executed First)

Launched a clean 5-service stack (`docker compose up -d --build --wait` from `0` containers/volumes/networks; all 5 services `healthy`: `rikkei-backend`, `rikkei-frontend`, `rikkei-postgres`, `rikkei-mock`, `rikkei-mailpit`) and executed `node e2e/run-all.mjs` **before** any manual API requests:

```text
  Expected Suites : 28
  Executed Suites : 28
  Passed Suites   : 28
  Failed Suites   : 0
  Total Cases     : 334
  Total Asserts   : 2078
  Total Lines     : 11637
  Duration        : 43.28s
```

Includes `test_ai_governance_admin.test.mjs` (`5 tests, 57 asserts`) passing cleanly alongside all 4 tiers.

### M7 — A9 9-Point Live API Verification (Raw Transcripts)

Executed directly against the live Docker stack (`127.0.0.1:8080` + `postgres:18.6-alpine`):

1. **401 / 403 RBAC across all 4 `/api/v1/admin/ai-*` endpoints**:
   - Anonymous -> `HTTP 401 {"code":"UNAUTHORIZED","message":"Yêu cầu xác thực tài khoản"}` (4/4 endpoints).
   - `CANDIDATE` (`cand1`) & `HR` (`hr2`) -> `HTTP 403 {"code":"FORBIDDEN","message":"Không có quyền truy cập"}` (8/8 checks); `HR` pending password reset (`hr1`) -> `HTTP 403 {"code":"MUST_CHANGE_PASSWORD",...}` (4/4 checks).
2. **400 unified `{"code","message"}` on invalid parameters and payloads**:

   ```text
   GET /api/v1/admin/ai-logs?from=2026-11-25&to=2026-11-20 -> HTTP 400 {"code":"VALIDATION_ERROR","message":"Khoảng ngày phải theo thứ tự và không vượt quá 366 ngày."}
   GET /api/v1/admin/ai-logs?page=-1 -> HTTP 400 {"code":"VALIDATION_ERROR","message":"Trang, kích thước trang hoặc mã tài khoản không hợp lệ."}
   GET /api/v1/admin/ai-logs?feature=UNKNOWN_FEAT -> HTTP 400 {"code":"VALIDATION_ERROR","message":"Tham số yêu cầu không hợp lệ"}
   PUT /api/v1/admin/ai-config [non-MOCK blank apiKey (OPENAI)] -> HTTP 400 {"code":"VALIDATION_ERROR","message":"Chưa cấu hình khóa API cho nhà cung cấp này"}
   PUT /api/v1/admin/ai-config [path-traversal model (../etc)] -> HTTP 400 {"code":"VALIDATION_ERROR","message":"must match \"^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._:-]*$\""}
   PUT /api/v1/admin/ai-config [slash model (a/b)] -> HTTP 400 {"code":"VALIDATION_ERROR","message":"must match \"^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._:-]*$\""}
   ```

3. **409 Conflict on stale `PUT /api/v1/admin/ai-config` version**:

   ```text
   Valid PUT (version=6) -> HTTP 200 {"id":1,"provider":"MOCK","model":"mock",...,"dailyLimitPerUser":25,"enabled":true,"version":7}
   Stale PUT (old version=6) -> HTTP 409 {"code":"CONFLICT","message":"Cấu hình đã thay đổi. Vui lòng tải lại trước khi lưu."}
   ```

4. **50 parallel live HTTP requests at `dailyLimitPerUser = 10` (`candidate2`, initial usage `0`)**:

   ```text
   50 parallel HTTP requests completed in 277.4ms
   HTTP status counts: {"200":50}
   Response message counts: {"Đã đạt hạn mức giải thích AI trong ngày. Đang hiển thị gợi ý phù hợp theo kỹ năng.":50}
   GET /ai-logs?userId=2 -> total=41, byStatus={"BLOCKED":31,"OK":10}
   PostgreSQL ai_usage (user_id=2): count=10 (0 quota overshoot; 19 requests served from degraded cache)
   ```

5. **Immediate blocking after lowering `dailyLimitPerUser` below current usage**:
   - Lowered `dailyLimitPerUser` to `3` while `cand1` usage was `5`; after the 2-minute refresh cooldown expired, `GET /api/v1/me/job-recommendations?limit=10&refresh=true` returned `HTTP 200` with the A2 quota notice, `allAiGeneratedFalse=true`, and exactly `1` new `BLOCKED` row (`id=50`); immediate repeat within 2 minutes returned `HTTP 429` (`RATE_LIMITED`).
6. **UTC day-boundary agreement (`23:59:59Z` vs `00:00:00Z`) + cleanup**:

   ```text
   -- UTC Day 2026-11-21 (contains 2026-11-21T23:59:59Z, id=51 CHAT OK 11/22) --
     summary: calls=1, ok=1, errors=0, blocked=0, tokensIn=11, tokensOut=22
     logs   : total=1, ids=[{id:51, feature:"CHAT", status:"OK", createdAt:"2026-11-21T23:59:59Z"}]
   -- UTC Day 2026-11-22 (contains 2026-11-22T00:00:00Z, id=52 CV ERROR 33/44) --
     summary: calls=1, ok=0, errors=1, blocked=0, tokensIn=33, tokensOut=44
     logs   : total=1, ids=[{id:52, feature:"CV", status:"ERROR", createdAt:"2026-11-22T00:00:00Z"}]
   Cleanup: DELETE 2 (remaining_utc_test_rows = 0)
   ```

7. **Live query latency & A7 800k-row reference**:
   - `GET /api/v1/admin/ai-logs` (10 samples): `min 5.65 ms`, `median 8.28 ms`, `max 14 ms`.
   - `GET /api/v1/admin/ai-usage/summary` (10 samples): `min 5.34 ms`, `median 8.83 ms`, `max 10.51 ms`.
   - Large-volume `800k`-row `EXPLAIN (ANALYZE, BUFFERS)` benchmarks recorded in `M2` above (`bounded count 3.480 ms`, `user_id` lookup `0.085 ms`, partial `ERROR` lookup `0.048 ms`).
8. **Audit log leakage inspection**:
   - Inspected `52` live `ai_logs` rows via `GET /api/v1/admin/ai-logs`: `leakedRows=0` (zero API keys, stack traces, raw exception names, or unmasked PII). Provider `ERROR` exception sanitization is proven in `AiGovernanceIntegrationTest.providerErrorIsPersistedWithoutLeakingTheException` because Docker Compose intentionally carries no real external provider key (A6 rejects switching off `MOCK`).
9. **OpenAPI coverage**:
   - `GET /api/api-docs` -> `HTTP 200` (`55594 bytes`; `/v3/api-docs` returns `404` as `springdoc.api-docs.path` is `/api/api-docs`). Covers `GET`/`PUT /api/v1/admin/ai-config`, `GET /api/v1/admin/ai-logs`, `GET /api/v1/admin/ai-usage/summary`, and `GET /api/v1/me/job-recommendations` with `bearerAuth` and `400`/`401`/`403`/`409`/`429` error responses.

### M8 — Live `/browser` Verification (Pass 1 & Pass 2 on Live Docker Stack)

Executed via the Antigravity built-in `/browser` command against `http://127.0.0.1:3000` using fresh 60-second SSO tickets and real mock-provider backend data (restoring `ai_config` afterward):

- **Pass 1 (`/admin`, `/admin/ai-config`, `/admin/ai-logs` as `admin1`)**:
  - Verified across `375`, `768`, `1024`, and `1440 px` viewports in light and dark modes with `0` horizontal overflow (`scrollWidth <= innerWidth`), pointer/keyboard interactions, valid configuration saves, invalid form inputs + `"Hủy thay đổi"` reset, blank-key `400` (`"Chưa cấu hình khóa API cho nhà cung cấp này"`), 2-tab `409` optimistic-lock conflict, log filters, pagination, empty states, focus-trapped detail dialog with `Escape` closing and focus restoration to the triggering row button, usage bar chart plus 2 accessible fallback tables, expired session redirect, and `hr2` `403` access denial.
  - Observed `0` console errors and `0` unintended HTTP `>= 400` responses.
- **Pass 2 (`/candidate/jobs` with `candidate3` real mock data)**:
  - **State A (AI on, `MOCK`, `dailyLimitPerUser = 20`)**: rendered `10` recommendation cards and persisted `5` `OK` `ai_logs` rows.
  - **State B (quota exhausted A2, `dailyLimitPerUser = 1`)**: returned `HTTP 200`, deterministic fallback explanations, visible Vietnamese quota notice banner, and `1` `BLOCKED` `ai_logs` row (`60 -> 61`).
  - **State C (AI off A3, `enabled = false`)**: `4` views all returned `HTTP 200` with `"AI đang tạm tắt"` and `0` `ai_logs` writes (`61 -> 61`).
  - Restored `ai_config` to clean default state afterward.
- **Honest sandbox disclosure**: The `webview` browser environment blocks `page.evaluate`, `eval`, `emulateMedia`, `page.request`, and `page.route`; all layout, overflow, keyboard, focus, and network checks were performed using native Playwright-style locators, `boundingBox()`, real keyboard/mouse input, network/console HUD, and visual inspection. Visual screenshot captures were kept outside the repository in the session artifact directory.
- **Follow-up code investigation of 3 minor `/browser` observations**:
  1. `isAiGenerated: false` when `provider = MOCK`: verified against `origin/develop` (`AiService.java` `provider != AiProvider.MOCK` and `JobRecommendationServiceTest.testAiProviderMockFlow`) as intentional AI-01 behavior, while AI-05 records `5` `OK` rows in `ai_logs` for slots `#1`–`#5`.
  2. `model` length `120` returning `HTTP 200`: verified consistent `max = 120` inclusive across all 4 layers (`V17__ai_governance.sql` `VARCHAR(120)`, `UpdateAiConfigRequest` `@Size(max = 120)`, `AiConfigService`, and `AiConfigPage.tsx` `maxLength={120}`).
  3. Non-blocking UI/i18n notes documented without breaking existing PR #26 contracts: `UpdateAiConfigRequest` omits custom Vietnamese `message` attributes on Bean Validation annotations (so `dailyLimitPerUser = -1` returns Hibernate default `"must be greater than or equal to 0"` inside `400 VALIDATION_ERROR`), the `enabled` checkbox measures `24x24px` inside its wider clickable label, and `aria-invalid` is unset (`null`) on inline client validation.

### M9 — Docker Teardown & Final Full Quality Gate Verification

- **Docker teardown (`docker compose down -v`)**:

  ```text
  $ docker ps -a --filter "name=rikkei"
  CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
  $ docker volume ls --filter "name=rikkei"
  DRIVER    VOLUME NAME
  $ docker network ls --filter "name=rikkei"
  NETWORK ID   NAME      DRIVER    SCOPE
  ```

- **Full local quality gate runners (`./check.sh` via Git Bash and `.\check.ps1` via PowerShell)**:
  - Pre-final-doc-edit gate run (followed immediately by mandatory post-edit re-verification after this final documentation edit, with zero further edits afterward): both `./check.sh` and `.\check.ps1` exited **`0`** with identical **`26/26 [PASS]`** active runtime gates (`29` synchronized definitions, `0` failures):
    - Mock suite (`8/8`), Frontend ESLint/TypeScript/Vitest (`38` files, `448` tests, `0` `act()` warnings)/Vite build (`99.10 kB` JS gzip, `14.04 kB` CSS gzip), Backend (`-Xlint:all -Werror`, Spotless `331` files, SpotBugs `0` bugs, Maven `1015/1015` tests with `PiiMaskerTest` `243/243`), Docker Compose (`5` services, loopback ports), Hadolint/Yamllint/Actionlint/SQLFluff, Markdownlint (`218` files, `0` errors), CSpell (`659` files, `0` errors), Version Drift (`29`/`32` tokens), Contrast (`120` pairs, `0` violations), Gate Sync (`29` definitions / `23` CI / `25` Docker CI), Agent Config Sync & Validation (`215` artifacts, `10/10` checks), and Gate 8 security scans (`0` path leaks, `0` TODOs, `0` secrets).
