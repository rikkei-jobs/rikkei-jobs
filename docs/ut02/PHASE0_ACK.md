# UT-02 Port (T0235C3) — Phase 0 Acknowledgment

## 1. Starting Git State and Immutable Migration Checksums

### 1.1 Starting Git State (`D:\GitHub\Rikkei\rikkei-jobs`)

- `git branch --show-current`: `feature/T0235C3-recruitment-process`
- `HEAD`: `9520fd558bf5c3a3db5c44574e455938437392ba`
- `MERGE_HEAD`: `8088872273b52cecb46304f94a7598bfc113e290` (`origin/develop`)
- `git diff --stat origin/develop`: empty (exit code `0`)
- `git diff --cached --stat origin/develop`: empty (exit code `0`)
- `git status --porcelain -uall`: `917` staged lines reflecting the uncommitted merge-in-progress where both the index and working tree match `origin/develop` (`8088872`) cleanly, with `0` unstaged modifications and `0` untracked files.

### 1.2 Baseline SHA-256 Checksums of Existing Migrations (19 Files)

All 11 production migrations (`backend/src/main/resources/db/migration/`) and 8 development seed migrations (`backend/src/main/resources/db/migration-dev/`) are immutable:

| Relative Path | SHA-256 |
|---|---|
| `backend/src/main/resources/db/migration/V1__init_schema.sql` | `133A7A886B687E0F6C3DA396B6721D471581961F0ABB8575CCCAA61530F1642F` |
| `backend/src/main/resources/db/migration/V3__skill_profile.sql` | `3708AE4C9CAB0609612D618C44873F94632A8DD04AE37FC9D2BC64CF7B952639` |
| `backend/src/main/resources/db/migration/V5__auth_identity_evolution.sql` | `7131B9CBD0130DF759F6783E338884F7043A6A9D3FD20D6A24631A5399802C22` |
| `backend/src/main/resources/db/migration/V7__evaluation.sql` | `B79AE86EB418CDA387AEE091790F1A51CBF75D7C9062C5D8A90C036D2012EB51` |
| `backend/src/main/resources/db/migration/V9__company_profile.sql` | `6BC0E8589A97175750B7A9C057A81169F8AD8F08B51B16BEF351652C72568FA2` |
| `backend/src/main/resources/db/migration/V11__jobs_and_recommendations.sql` | `27A3A7A048CA72CCD87EF9E4C275EE63B461A901C8057F334434D9B0B1F5D10D` |
| `backend/src/main/resources/db/migration/V13__target_positions_gap_analysis.sql` | `1787236AEAB516C8A381F46B464347747F2D5138081614FD2FD30855CA10745B` |
| `backend/src/main/resources/db/migration/V15__create_internships_and_internship_tasks.sql` | `A18032E5C6EA1B49D3CDA2D6490A548EFA504511637341E85C79E5484B1711F4` |
| `backend/src/main/resources/db/migration/V17__ai_governance.sql` | `CE7FB28FD9477359094651952E79D1F58629236B0F778BB5C4C9B063700CE3EF` |
| `backend/src/main/resources/db/migration/V19__create_recruitment_applications.sql` | `5D0B35638D6EA3D9284E973613ED418F006D6E923D0D6F742B3C87003E9F9F62` |
| `backend/src/main/resources/db/migration/V21__create_application_cv_snapshots.sql` | `24F1774F59A713E19F7CEE9F1F7BD61F6B4E40DA0B7D6E4E96C264F09FEA9654` |
| `backend/src/main/resources/db/migration-dev/V2__dev_seed.sql` | `488D6A5F142584119BAC83075B108DD1E021B1F54D6EBA87D65F0E9F7DBA22E2` |
| `backend/src/main/resources/db/migration-dev/V4__dev_skill_profile_seed.sql` | `5F73A354E322BE5057163DBD6572BB0A8433A95A6D149A6AE3BCDE8543C2A59F` |
| `backend/src/main/resources/db/migration-dev/V6__dev_seed_nt01.sql` | `F2A800B089F1B46AEEF58B19747911A75461DDB74830FF669F5B969061D4B079` |
| `backend/src/main/resources/db/migration-dev/V8__dev_evaluation_seed.sql` | `4C04EBB6B0B0B607118B12161F6FF1FB5A7A4CCFF50F71D30F9371D5AB41B98B` |
| `backend/src/main/resources/db/migration-dev/V10__dev_company_seed.sql` | `BCEAD7DDA7BEDB5D67EC8F85470F4D4311DD7090024CBBCD469B2A1C76CC174F` |
| `backend/src/main/resources/db/migration-dev/V12__dev_job_seed.sql` | `187F64EE33B9989D54BD5A9441DCB855C537CAB9F44AFE0B69FE87D95DAE100F` |
| `backend/src/main/resources/db/migration-dev/V14__dev_gap_analysis_seed.sql` | `F93697BE4EB4012ED96A07A37698CA7FBA7D1DF2D4169353BC50E627BA162B5E` |
| `backend/src/main/resources/db/migration-dev/V22__dev_recruitment_seed.sql` | `2E3DE765E9D6AAC4E7F489EAF38688940E68B22BD4CA895BBAABFD10C020C7FB` |

---

## 2. Files Read Before Any Edit

- Entrypoints: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`
- Base and round prompts: `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt`, `D:\GitHub\Rikkei\.agents\PROMPT_UT02_PORT_EN.txt`
- All 16 rules in `.claude/rules/`:
  - `01-project-context.md`
  - `02-git-and-delivery.md`
  - `03-safety-and-secrets.md`
  - `04-honest-verification.md`
  - `05-backend-java.md`
  - `06-database-flyway.md`
  - `07-security-rbac.md`
  - `08-frontend-engineering.md`
  - `09-frontend-design-bar.md`
  - `10-testing-strategy.md`
  - `11-docs-and-bilingual.md`
  - `12-ci-and-quality-gates.md`
  - `13-backend-data-access-performance.md`
  - `14-backend-module-boundaries.md`
  - `15-backend-observability-ops.md`
  - `16-backend-integrations.md`
- All 29 skills in `.claude/skills/<skill-name>/SKILL.md`

---

## 3. Rules Compliance Matrix (Rules 01 to 16)

| Rule | Concrete Constraint for UT-02 Port | Verification / Proof Method |
|---|---|---|
| `01-project-context` | Keep `recruitment` (`MOD-06`) bounded, use canonical 5 roles and 20 skill codes, and preserve pinned stack versions in `docs/03-version-table.md` without adding dependencies. | `node scripts/check-version-drift.mjs` exit 0; `git diff --stat origin/develop -- backend/pom.xml frontend/package*.json` empty. |
| `02-git-and-delivery` | Git is strictly read-only (`git status`, `git diff`, `git show`, `git log` only); never run `git add/commit/merge/reset/checkout/stash`; propose `T0235C3:` English commit messages. | Final `git branch --show-current` stays `feature/T0235C3-recruitment-process`; `MERGE_HEAD` untouched; uncommitted working tree. |
| `03-safety-and-secrets` | Never open `.env` or `*.pem`; never write outside `rikkei-jobs`; never log PII (`interviewerEmail`, candidate email/name) or secrets; treat user notes/names as untrusted input. | Secret scan gate PASS; code audit and log inspection on `CandidateTransitionNotificationListener` and controllers. |
| `04-honest-verification` | Only claim PASS for checks actually run with captured exit code 0 and raw stdout/stderr; zero `console.log`/`System.out.println`/`TODO`/`FIXME`/machine paths; `docker compose down -v` at end. | Raw command transcripts in handoff and `PR_DESCRIPTION.md`; `check.ps1` / `check.sh` 26/26 PASS. |
| `05-backend-java` | Java 25 (`-Xlint:all -Werror -Xlint:-processing`), immutable `record` DTOs/events, zero JPA `@Entity` in controllers, `ErrorResponse(code, message)` via `GlobalExceptionHandler`, Spotless AOSP, SpotBugs. | `./mvnw spotless:check`, `./mvnw spotbugs:check`, `./mvnw clean test-compile`, `./mvnw test` exit 0. |
| `06-database-flyway` | Add `V23__create_interview_rounds.sql` (odd prod DDL-only) and `V24__dev_interview_rounds_seed.sql` (even dev DML-only); never touch `V1..V22`; intra-module FK only; `TIMESTAMPTZ DEFAULT NOW()`; idempotent; SQLFluff clean; update Rule 06 doc baselines. | SHA-256 unchanged for all 19 pre-existing migrations; SQLFluff exit 0; 6 migration tests + `FlywayMigrationIntegrationTest` PASS. |
| `07-security-rbac` | Register every new route in `RoutePolicyRegistry` (deny-by-default) + `@PreAuthorize`; use `OwnershipGuard` + `principal.getCompanyId()` (`404` on cross-company HR); STAFF read-only (`403` on mutations); reject CANDIDATE/anonymous. | `RbacEndpointPolicyCoverageIntegrationTest`, `RbacPermissionMatrixIntegrationTest`, and UT-02 IDOR integration matrix PASS. |
| `08-frontend-engineering` | Keep UT-02 UI inside `features/recruitment/` exported via `index.ts`; TypeScript strict (zero `any`); all requests via `httpClient` (no raw `fetch`); tokens in memory only; WCAG 2.2 AA semantics. | `npm run lint --prefix frontend`, `npm run typecheck --prefix frontend`, `npm run test --prefix frontend`, `npm run build --prefix frontend` exit 0. |
| `09-frontend-design-bar` | Dense mode (`36-38px` rows, `13-14px` body, micro `<= 150ms`) for HR/STAFF; `--rj-*` tokens only (no raw colors); zero emoji; `<Icon />` 24px; reduced-motion `0.001ms`; `CLS = 0`; Anti-AI rubric `>= 11/12`. | `node scripts/compute-contrast.mjs` PASS; CSS/token audit; live `/browser` inspection at 375/768/1024/1440 px in light and dark modes. |
| `10-testing-strategy` | TDD workflow; hermetic Testcontainers `postgres:18.6-alpine`; zero `Thread.sleep`/`setTimeout`; cover all 49 status pairs, `isOfferAllowed`, endpoints, concurrency, email, migrations, Vitest (0 `act()` warnings), E2E; update `agent-config/rules/10` with real final counts. | `./mvnw test`, `npm run test --prefix frontend`, `node e2e/run-all.mjs` all PASS with reproduced final totals. |
| `11-docs-and-bilingual` | Write `docs/ut02/*` in clean English (Vietnamese copy in UI/emails with full diacritics); register new technical terms in `cspell.json`; preserve `docs/03-version-table.md` parity. | `markdownlint-cli2`, `cspell`, and `node scripts/check-version-drift.mjs` exit 0. |
| `12-ci-and-quality-gates` | Do not add quality gates; maintain exact 26 active / 29 total gate parity across `check.sh`, `check.ps1`, and `.github/workflows/ci.yml`; never run `scripts/run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs`, `./check.sh`, and `.\check.ps1` (26/26 PASS). |
| `13-backend-data-access-performance` | `open-in-view: false`, `ddl-auto: none`; `@Transactional(readOnly = true)` for reads; no mail/external calls inside `@Transactional`; 1-based pagination (`page >= 1`, default 20, max 100); `@Version` -> 409; zero N+1; justified indexes + `EXPLAIN`. | SQL statement count test, concurrency `409` test, and `EXPLAIN (ANALYZE, BUFFERS)` transcript on realistic volume. |
| `14-backend-module-boundaries` | `recruitment` never imports other modules' entities/repositories or joins their tables; synchronous cross-module reads only via `IdentityPublicService`, `JobQueryService`, `CandidatePublicService` returning immutable records; async email via `AFTER_COMMIT` event; acyclic DAG. | Package dependency scan (`com.rikkei.jobs.recruitment` outside module = 0); `V23` has only intra-module FK `applications(id)`. |
| `15-backend-observability-ops` | Parameterized SLF4J only; single-line PII-free logs (never log `interviewerEmail`, candidate email/name, or `note`); keep `logging.structured.format.console: ecs` and minimal Actuator (`health,info`, `show-details: never`). | Log capture assertions in email listener tests; `ActuatorHealthTest` and `SecurityHardeningIntegrationTest` PASS. |
| `16-backend-integrations` | Candidate transition email via `@TransactionalEventListener(AFTER_COMMIT)` + `@Async("notificationTaskExecutor")` + `JavaMailSender` (Mailpit in dev); `@Tag`/`@Operation`/`@ApiResponses` on all new controllers (Springdoc dev-only). | Listener unit/integration test with `JavaMailSender` stub; live Mailpit verification; `OpenApiCoverageIntegrationTest` & `test_openapi_docs.test.mjs` PASS. |

---

## 4. Applicable Skills (27 Applicable, 2 Non-Applicable)

### 4.1 Applicable Skills (27)

| # | Skill | Why It Applies | Concrete Constraint | Verification / Proof Method |
|---|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory bootstrap for task discovery and precedence. | Enterprise Rules 01-16 supersede skills; load skills progressively per phase. | `PHASE0_ACK.md` created before edits + `Re-read:` lines before each change group. |
| 2 | `brainstorming-before-building` | Architecture alignment and evaluating 9520fd5 vs `develop` options. | Never invent business rules; present trade-offs for ambiguous API paths before coding. | Options 1A and 2A approved by Team Lead; UT-07 hook documented without inventing `OFFER` flow. |
| 3 | `writing-implementation-plans` | Structuring 1-round UT-02 port into verifiable milestones. | Every step names exact file paths, verification command, and git-free rollback discipline. | Milestones M1-M4 defined in `PROJECT.md` with per-step verification commands. |
| 4 | `executing-plans` | Sequential execution across milestones M1-M4. | Do not advance past a failing verification gate; maintain `progress.md` UTC timestamps. | `progress.md` heartbeats and sequential green gate outputs per milestone. |
| 5 | `dispatching-parallel-agents` | Coordinating parallel survey and implementation workers cleanly. | Zero overlapping file writes across parallel workers; keep code out of `.agents/teamwork/`. | `git status` confirms code only in `rikkei-jobs`; disjoint worker file ownership. |
| 6 | `test-driven-development` | Implementing migrations, state machine, match score, services, controllers, and UI. | Write/observe failing tests before production logic; hermetic Testcontainers `postgres:18.6-alpine`; zero `Thread.sleep`. | JUnit 5, Testcontainers, and Vitest suites green with zero static sleeps. |
| 7 | `systematic-debugging` | Diagnosing test, SpotBugs, SQLFluff, OpenAPI, or browser issues. | Reproduce deterministically and fix root causes rather than suppressing errors or swallowing exceptions. | Zero `@SuppressWarnings` abuse or disabled tests; root causes documented if any arise. |
| 8 | `verification-before-completion` | Mandatory gate verification before closing any milestone or round. | Never report PASS without executing commands on final tree and recording raw exit codes/outputs. | Raw output logs for `check.ps1`, `check.sh`, `./mvnw test`, Vitest, E2E, and Docker. |
| 9 | `requesting-code-review` | Preparing `PR_DESCRIPTION.md` and handoff package for Team Lead. | Self-audit full diff, zero debug prints, and summarize architectural decisions/trade-offs. | `docs/ut02/PR_DESCRIPTION.md` with file manifest, dropped files list, and reproduced proof. |
| 10 | `receiving-code-review` | Handling review feedback or challenger/auditor findings during the round. | Triage Tier 1-4 objectively, verify fixes with tests, and avoid unapproved scope drift. | All challenger/auditor findings resolved and re-verified with raw command outputs. |
| 11 | `handoff-to-team-lead` | Delivering uncommitted working tree and English commit proposals. | Leave all changes uncommitted on `feature/T0235C3-recruitment-process`; propose `T0235C3:` commits in English. | `git diff` uncommitted; commit proposals included in final Vietnamese report and `PR_DESCRIPTION.md`. |
| 12 | `module-domain-knowledge` | Porting UT-02 recruitment lifecycle faithfully against existing UT-01 domain. | Enforce `SUBMITTED -> SCREENING\|REJECTED`, `SCREENING -> INTERVIEW\|REJECTED`, `INTERVIEW -> REJECTED` only; no backward moves. | 49-pair unit test on `ApplicationStatus` + service tests on `isOfferAllowed`. |
| 13 | `flyway-migration-authoring` | Creating `V23__create_interview_rounds.sql` and `V24__dev_interview_rounds_seed.sql`. | Odd prod DDL-only (`V23`) and even dev DML-only (`V24`), `BIGSERIAL`, `TIMESTAMPTZ DEFAULT NOW()`, idempotent, sequence `setval`, SQLFluff clean. | SQLFluff exit 0; 6 migration inventory tests + `FlywayMigrationIntegrationTest` PASS. |
| 14 | `backend-persistence-performance` | Indexing, N+1 prevention, `@Version` concurrency, and `EXPLAIN`. | `@Transactional(readOnly = true)` for reads, batch fetching, 1-based pagination, `@Version` 409, `EXPLAIN (ANALYZE, BUFFERS)` on `/staff/applications`. | Query count assertion test, 50-thread concurrency live proof, and `EXPLAIN` output. |
| 15 | `backend-module-feature` | Implementing `InterviewRound`, repositories, services, DTO records, and controllers. | Immutable Java `record` DTOs, Bean Validation (`@Valid`), zero JPA entities in controllers, injected `java.time.Clock`. | `./mvnw clean test-compile` (`-Xlint:all -Werror`), SpotBugs, and unit/WebMvc tests PASS. |
| 16 | `backend-module-boundaries` | Replacing `9520fd5` cross-module violations (`UserRepository`, `CompanyRepository`, SQL joins). | Access `identity`, `company`, and `candidate` data exclusively via public service interfaces returning immutable records; publish `AFTER_COMMIT` event. | Zero cross-module imports or SQL joins; `CandidateTransitionNotificationListener` uses `AFTER_COMMIT`. |
| 17 | `spring-security-rbac-endpoint` | Securing all UT-02 endpoints plus Option 1A (`GET /api/v1/hr/jobs`) and Option 2A (`cv-snapshot`). | Register all routes in `RoutePolicyRegistry`, keep `@PreAuthorize`, enforce `OwnershipGuard` (`404` cross-company HR), `403` STAFF mutations, `401`/`403` candidate/anon. | `RbacEndpointPolicyCoverageIntegrationTest`, `RbacPermissionMatrixIntegrationTest`, and IDOR matrix tests PASS. |
| 18 | `api-contract-and-errors` | Exposing clean `/api/v1` REST contracts, 1-based pagination, `ErrorResponse`, and OpenAPI. | Remove unprefixed duplicates and `/api/v1/hr/applications`; `page >= 1` (default 20, max 100); `{"code","message"}` errors; full Springdoc annotations. | `OpenApiCoverageIntegrationTest` and `e2e/tier1-features/test_openapi_docs.test.mjs` PASS. |
| 19 | `security-review-checklist` | Auditing PII protection, mass-assignment prevention, and HTML escaping. | Plain-text `name`/`note` escaped via `HtmlUtils.htmlEscape` in emails, header sanitation, no PII in logs, `nosniff` + `no-store` on `cv-snapshot`. | Email escaping test, CV snapshot header tests, and secret scan gate PASS. |
| 20 | `frontend-feature-slice` | Building `features/recruitment/` HR and STAFF pages, API clients, and Vitest tests. | All requests via `httpClient` with `AbortSignal`, all 4 async states (Loading/Error/Empty/Data), barrel exports via `index.ts`, zero `any`. | `npm run typecheck`, `npm run lint`, and Vitest suite (0 `act()` warnings) PASS. |
| 21 | `frontend-visual-design` | Styling HR/STAFF screens, timelines, and modals in Dense mode. | `--rj-*` tokens only, Dense `36-38px` rows / `13-14px` body, `tabular-nums`, portal modals outside `main`, `useScrollLock`, `--rj-z-*`, light/dark parity. | `node scripts/compute-contrast.mjs` PASS; `/browser` inspection at 375/768/1024/1440 px. |
| 22 | `frontend-motion-design` | Modal, timeline, and interactive state transitions on recruitment pages. | Compositor-only (`transform`, `opacity`), micro `<= 150ms` in Dense mode, `@media (prefers-reduced-motion: reduce)` with `0.001ms` fallback, `CLS = 0`. | CSS review and `/browser` verification confirming smooth non-blocking motion. |
| 23 | `frontend-iconography` | Rendering icons across timeline, interview rounds, filters, and modals. | Use `<Icon name=... />` (24px grid, `strokeWidth=2`, `currentColor`) exclusively; zero raw `<svg>` in feature slices; `aria-label` on icon-only buttons. | Static check of `features/recruitment/` + Vitest/DOM assertions PASS. |
| 24 | `frontend-accessibility-audit` | Ensuring keyboard operability and modal accessibility on HR/STAFF UI. | One `<h1>` per page, sequential headings, `<label htmlFor>`, `aria-invalid`/`aria-describedby`, modal focus-trap + Escape close + focus return to trigger. | Vitest keyboard/focus tests + live `/browser` keyboard-only walkthrough PASS. |
| 25 | `frontend-taste-anti-slop` | Writing authentic Vietnamese copy and keeping clean layout restraint. | Full Vietnamese diacritics per `docs/uiux/CONTENT.md`, zero AI buzzwords/emoji, `<= 2` box nesting levels, zero overflow at `375px`. | Copy audit against `CONTENT.md` + `/browser` `scrollWidth <= innerWidth` at `375px`. |
| 26 | `docs-bilingual-update` | Creating `docs/ut02/*`, updating Rule 06/10 baselines, and updating `cspell.json`. | Update `agent-config/rules/` first then run `node scripts/sync-agent-config.mjs`; keep markdownlint and cspell green. | `sync-agent-config.mjs --check`, `validate-agent-config.mjs`, `markdownlint`, `cspell` exit 0. |
| 27 | `ci-local-and-debug` | Running all 26 host quality gates and Docker live stack verification. | Run `./check.sh` and `.\check.ps1` (26/26 PASS), `docker compose up -d --build --wait` (AppCDS), `node e2e/run-all.mjs`, then `docker compose down -v`. | Raw output transcripts from both runners, E2E suite, and clean `docker ps -a`/volume checks. |

### 4.2 Non-Applicable Skills (2)

- `writing-skills`: Does not apply directly because the UT-02 port does not create, edit, or pressure-test any `SKILL.md` file under `agent-config/skills/`.
- `external-system-integration-and-mock`: Does not apply directly because UT-02 does not call any external partner HTTP endpoint on `mock/server.js` (`:9000` LMS/Exam/PM/Meet/Cloudinary) via `ExternalApiClient`; candidate notifications use Spring `JavaMailSender` to Mailpit (`:1025`), and existing mock tests remain untouched and green.

---

## 5. Approved Team Lead Decisions (Option 1A and Option 2A)

### 5.1 Option 1A: `GET /api/v1/hr/jobs` (Paginated HR Job List)

- Paginated with 1-based indexing (`page >= 1`, default `size = 20`, max `size = 100`) and deterministic stable ordering (`createdAt DESC, id DESC`).
- Derives `companyId` strictly from the authenticated HR principal (`principal.getCompanyId()` / `OwnershipGuard`), never trusting any request query or path parameter.
- Read-only (`@Transactional(readOnly = true)`), returning only the minimal job summary fields required by the UT-02 HR recruitment selector (`id`, `title`, `status`, `deadline`, `createdAt` or equivalent minimal record).
- Registered explicitly in `RoutePolicyRegistry` for `HR` and protected with `@PreAuthorize("hasRole('HR')")`.
- Covered by cross-company IDOR integration tests verifying Company A HR sees only Company A jobs and Company B HR sees only Company B jobs.
- Explicitly documented in `docs/ut02/README.md` and `docs/ut02/PR_DESCRIPTION.md` that `DN-04` will extend this endpoint in a future round.

### 5.2 Option 2A: `GET /api/v1/applications/{id}/cv-snapshot` (HR and STAFF CV Snapshot Download)

- Grants read-only download access to `HR` owning the target job's company (`404 NOT_FOUND` on cross-company HR access without leaking resource existence) and `STAFF` (`200 OK` read-only across companies).
- Rejects `CANDIDATE` (`403 FORBIDDEN`) and unauthenticated callers (`401 UNAUTHORIZED`) via `RoutePolicyRegistry` and `@PreAuthorize`.
- Reuses `CvSnapshotDownloadSupport` to emit `Content-Disposition`, `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store` response headers consistently.
- Logs zero PII (no candidate email, name, or file name PII in application logs).
- Covered by full access matrix integration tests across HR owning company (`200`), HR other company (`404`), STAFF (`200`), CANDIDATE (`403`), and anonymous (`401`).

---

## 6. Mandatory R1 Working Method (Verbatim)

"Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi."

---

## 7. Re-Read Log

Re-read: 06-database-flyway, 10-testing-strategy, 13-backend-data-access-performance, flyway-migration-authoring, backend-persistence-performance, before Change Group 1 (Flyway V23/V24 migrations and migration inventory tests)
Re-read: 03-safety-and-secrets, 04-honest-verification, 05-backend-java, 07-security-rbac, 10-testing-strategy, 13-backend-data-access-performance, 14-backend-module-boundaries, 15-backend-observability-ops, 16-backend-integrations, backend-module-feature, backend-module-boundaries, backend-persistence-performance, spring-security-rbac-endpoint, api-contract-and-errors, security-review-checklist, test-driven-development, verification-before-completion, before Change Group 2 (Backend UT-02, Option 1A, Option 2A, and backend tests)
Re-read: 05-backend-java, 07-security-rbac, 10-testing-strategy, 13-backend-data-access-performance, api-contract-and-errors, before Change Group 2b (Challenger M2 remediation)
Re-read: 08-frontend-engineering, 09-frontend-design-bar, 10-testing-strategy, frontend-feature-slice, frontend-visual-design, frontend-motion-design, frontend-iconography, frontend-accessibility-audit, frontend-taste-anti-slop, test-driven-development, verification-before-completion, before Change Group 3 (Frontend UT-02 and Vitest suite)
Re-read: 02-git-and-delivery, 04-honest-verification, 06-database-flyway, 10-testing-strategy, 11-docs-and-bilingual, 12-ci-and-quality-gates, docs-bilingual-update, ci-local-and-debug, verification-before-completion, requesting-code-review, handoff-to-team-lead, before Change Group 4 (E2E, OpenAPI, Docs, Baselines & Docker Live Proof)
Re-read: 04-honest-verification, 08-frontend-engineering, 09-frontend-design-bar, 10-testing-strategy, 11-docs-and-bilingual, 12-ci-and-quality-gates, frontend-visual-design, frontend-accessibility-audit, docs-bilingual-update, ci-local-and-debug, verification-before-completion, before Change Group 4b (Browser findings remediation, final docs, 26/26 gates & clean Docker teardown)

---

## UT-02 Fix (T0235C3) — Phase 0 Acknowledgment

### 1. Starting Git State and Immutable Migration Checksums (UT-02-fix)

#### 1.1 Starting Git State (`D:\GitHub\Rikkei\rikkei-jobs`)

- `git branch --show-current`: `feature/T0235C3-recruitment-process`
- `HEAD`: `9520fd558bf5c3a3db5c44574e455938437392ba`
- `MERGE_HEAD`: `8088872273b52cecb46304f94a7598bfc113e290` (`origin/develop`, preserved uncommitted)
- `git status --porcelain -uall` at start: `960` entries (`"M "`: `221`, `"MM"`: `24`, `"A "`: `536`, `"D "`: `106`, `"AM"`: `30`, `"??"`: `43`), representing the completed uncommitted UT-02-port work prior to any UT-02-fix edit.
- Manifests vs `origin/develop`: `backend/pom.xml`, `frontend/package.json`, and `frontend/package-lock.json` have `0` byte diff (`git diff origin/develop -- ...` empty); root `pom.xml` does not exist.

#### 1.2 Baseline SHA-256 Checksums of Migrations (19 `origin/develop` + 2 UT-02-port)

- All `19` `origin/develop` migrations (`11` prod `V1..V21` under `backend/src/main/resources/db/migration/` and `8` dev `V2..V22` under `backend/src/main/resources/db/migration-dev/`) match `origin/develop` SHA-256 checksums byte-for-byte.
- `V23__create_interview_rounds.sql` (`sha256=a854c37aaa1621755d856f6c1dd87ac9fe20343785402c14dbea4da0004fe29d`) and `V24__dev_interview_rounds_seed.sql` (`sha256=ff73d63335cb637a1bfb10c2c2c474ae596b39072754d82844d23efa1e715458`) remain untouched (`??` from UT-02-port).

---

### 2. Files Read Before Any UT-02-fix Edit

- Entrypoints: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`
- Base and round prompts: `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt`, `D:\GitHub\Rikkei\.agents\PROMPT_UT02_FIX_EN.txt`
- All 16 rules in `.claude/rules/`: `01-project-context.md` through `16-backend-integrations.md`
- Applicable skills in `.claude/skills/<skill-name>/SKILL.md` (canonical `agent-config/skills/`): 25 direct + 1 conditional (`brainstorming-before-building`); 3 non-applicable (`flyway-migration-authoring`, `external-system-integration-and-mock`, `writing-skills`) out of 29 total skills
- Round docs & governance specs: `docs/ut02/PHASE0_ACK.md`, `docs/ut02/README.md`, `docs/uiux/CONTENT.md`, `cspell.json`, `check.ps1`

---

### 3. Rules Compliance Matrix for UT-02-fix (Rules 01 to 16)

| Rule | Concrete Binding Constraint for UT-02-fix | Verification / Proof Method |
|---|---|---|
| `01-project-context` | Keep `company`, `identity`, and `recruitment` bounded with canonical 5 roles and 20 skills; preserve pinned versions in `docs/03-version-table.md` with zero new dependencies. | `node scripts/check-version-drift.mjs` exit 0; `git diff origin/develop -- backend/pom.xml frontend/package*.json` empty. |
| `02-git-and-delivery` | Git is strictly read-only (`status`/`diff`/`log`/`show` only); stay on `feature/T0235C3-recruitment-process`; preserve uncommitted merge and UT-02-port changes; propose `T0235C3: <type>(<scope>): <summary>` English commits. | Final `git branch --show-current` == `feature/T0235C3-recruitment-process`; `MERGE_HEAD` intact; zero commits/staging; commit proposals in `handoff.md`. |
| `03-safety-and-secrets` | Write only inside `rikkei-jobs`; never open `.env` or `*.pem`; zero real secrets/PII in code, logs, screenshots, or reports; temp backups only in OS temp and deleted after use. | Secret scan gate PASS; machine-path scan PASS; code/log audit on `CandidateTransitionNotificationListener` and tests. |
| `04-honest-verification` | Reproduce D1-D4 RED first, fix at root, prove GREEN with raw command outputs/exit codes/numbers; zero `console.log`/`System.out.println`/`TODO`/`FIXME`; clean `docker compose down -v`. | Raw RED->GREEN transcripts in `handoff.md`, `.\check.ps1` and `./check.sh` 26/26 PASS. |
| `05-backend-java` | Java 25 (`-Xlint:all -Werror -Xlint:-processing`), immutable `record` DTOs (`HrJobSummaryDto`, `UpdateInterviewRoundRequest`), `@NotNull` + `ErrorResponse(code, message)` via `GlobalExceptionHandler`, injected `Clock`, Spotless AOSP, SpotBugs. | `./mvnw spotless:check spotbugs:check clean test-compile test` exit 0. |
| `06-database-flyway` | Migrations `V1..V24` remain immutable; no schema edits needed for D1-D4. | Post-fix SHA-256 match for all 19 `origin/develop` migrations + `V23`/`V24` unchanged; `FlywayMigrationIntegrationTest` PASS. |
| `07-security-rbac` | Preserve `RoutePolicyRegistry` (deny-by-default), `@PreAuthorize`, `OwnershipGuard` (`404` cross-company HR), `STAFF` read-only (`403`), and `401` anonymous across D2/D3 changes. | `RbacEndpointPolicyCoverageIntegrationTest`, `RbacPermissionMatrixIntegrationTest`, and `RecruitmentProcessIntegrationTest` PASS. |
| `08-frontend-engineering` | TypeScript strict (zero `any`), requests only via `httpClient`, in-memory auth tokens, slice isolation inside `features/identity` (D1) and `features/recruitment` (D2/D3), WCAG 2.2 AA semantics. | `npm run lint --prefix frontend`, `npm run typecheck --prefix frontend`, `npm run test --prefix frontend -- --run`, `npm run build --prefix frontend` exit 0. |
| `09-frontend-design-bar` | Zero emoji; `<Icon name=... />` 24px/2px stroke; `--rj-*` tokens only (D4 background constant mirrored from `design-tokens.css` with contrast `>= 4.5:1`); keep role-home motion/layout & Dense mode on HR/STAFF; status not conveyed by color alone. | `node scripts/compute-contrast.mjs` PASS; D4 math contrast proof (`>= 4.5:1`); Vitest DOM assertions. |
| `10-testing-strategy` | TDD Red->Green; deterministic fixed `Clock` tests (yesterday/today/tomorrow/closed); `@NotNull` `version` unit/integration/E2E (`400`/`409`/`200`); listener contrast/HTML-escape test; Vitest (0 `act()` warnings). | `./mvnw test` (`>= 1407`), Vitest (`>= 561`, 0 `act()`), E2E suite updated cleanly. |
| `11-docs-and-bilingual` | Append-only to `docs/ut02/PHASE0_ACK.md` (plus explicit exception: in-place `version` contract update in `docs/ut02/README.md` with exact modified lines logged); do not edit root `README.md`; Vietnamese UI/emails with full diacritics; register new terms in `cspell.json`. | `markdownlint-cli2`, `cspell`, `node scripts/check-version-drift.mjs`, and `node scripts/validate-agent-config.mjs` exit 0. |
| `12-ci-and-quality-gates` | Do not add new quality gates; keep 26 active / 29 total gate parity across `check.sh`, `check.ps1`, `ci.yml`, and `run-ci-in-docker.sh`; never run `scripts/run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs` and host gates PASS. |
| `13-backend-data-access-performance` | Preserve `open-in-view: false`, `ddl-auto: none`, `@Transactional(readOnly = true)` on HR jobs query (D2), no null-version bypass of `@Version` optimistic locking on `InterviewRound` (D3 -> 400 on null, 409 on stale), no N+1 or unpaginated lists. | `RecruitmentProcessServiceTest` + `RecruitmentProcessIntegrationTest` PASS. |
| `14-backend-module-boundaries` | Keep `company` (`HrJobSummaryDto`, UT-01 expiry rule) and `recruitment` cleanly decoupled via public service interfaces and immutable records; no cross-module entity/repo imports or SQL joins; D4 stays async `AFTER_COMMIT`. | Compilation + boundary audit (`recruitment` has 0 imports of `company` repositories/entities). |
| `15-backend-observability-ops` | Parameterized SLF4J only; zero PII in logs on D2/D3/D4 (`CandidateTransitionNotificationListener` keeps single PII-free log line); preserve ECS prod logging and minimal Actuator exposure. | `CandidateTransitionNotificationListenerTest` log capture + `SecurityHardeningIntegrationTest` PASS. |
| `16-backend-integrations` | Update OpenAPI annotations/schema for D2 (`HrJobSummaryDto`) and D3 (`UpdateInterviewRoundRequest.version` required); preserve `CandidateTransitionNotificationListener` `AFTER_COMMIT` `@Async` Mailpit delivery and plain-text alternative. | `OpenApiCoverageIntegrationTest`, `e2e/tier1-features/test_openapi_docs.test.mjs`, and `CandidateTransitionNotificationListenerTest` PASS. |

---

### 4. Applicable Skills for UT-02-fix (25 Direct, 1 Conditional, 3 Non-Applicable)

#### 4.1 Directly Applicable Skills (25)

| # | Skill | Why It Applies to UT-02-fix | Concrete Constraint | Verification / Proof Method |
|---|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory bootstrap & precedence governor (`PROMPT_BASE_RULES_EN.txt` R1). | Rules 01-16 supersede skills; load per phase; append `Re-read:` lines to `PHASE0_ACK.md` before every change group. | `PHASE0_ACK.md` updated before any edit + `Re-read:` log entries per change group. |
| 2 | `test-driven-development` | Reproduce D1-D4 RED first, implement minimal fix, prove GREEN without `Thread.sleep`. | Write/run failing JUnit 5, Testcontainers (`postgres:18.6-alpine`), Vitest, and E2E cases before each fix. | Captured RED failures followed by GREEN test outputs and `spotless:check`. |
| 3 | `systematic-debugging` | Diagnose exact root causes for D1-D4 (UT-01 expiry rule, `HrRecruitmentPage`, null `version` branch, `#F4F7FB`). | Localize source lines and fix root cause; never suppress errors or add symptom band-aids. | Exact source citations and root-cause explanations in `handoff.md`. |
| 4 | `writing-implementation-plans` | Sequence multi-stack fixes (D1, D2, D3, D4, OpenAPI, E2E, docs) safely. | Specify exact files, verification commands per step, and OS-temp + SHA-256 rollback (no git write commands). | Change groups executed in dependency order with per-step verification. |
| 5 | `executing-plans` | Execute change groups sequentially without advancing past red gates. | Minimal surgical edits; update `progress.md` UTC heartbeats; halt on unexpected drift. | `progress.md` heartbeats and sequential green outputs per change group. |
| 6 | `dispatching-parallel-agents` | Coordinate Teamwork worker boundaries cleanly. | Zero overlapping writes; keep all Teamwork metadata in `<appDataDir>/scratch/teamwork/`, never in repo `.agents/teamwork/`. | `git status` shows only approved repo changes; no `.agents/teamwork/` in repo. |
| 7 | `receiving-code-review` | UT-02-fix addresses Team Lead's 4 review defects (D1-D4) on PR #21. | Triage and fix all 4 defects surgically without touching out-of-scope items (R6) or refactoring unrelated code. | Point-by-point D1-D4 resolution + out-of-scope items untouched. |
| 8 | `backend-module-feature` | D2 (`HrJobSummaryDto`, `HrJobController`/service with injected `Clock`), D3 (`UpdateInterviewRoundRequest`, `RecruitmentProcessServiceImpl`), D4 (`CandidateTransitionNotificationListener`). | Immutable Java `record` DTOs, Jakarta `@NotNull` with Vietnamese message, `-Xlint:all -Werror`, Spotless, SpotBugs. | `./mvnw spotless:check spotbugs:check clean test-compile test` exit 0. |
| 9 | `backend-module-boundaries` | D2 aligns `company` expiry logic with UT-01 without breaking Rule 14 DAG. | Share UT-01 expiry rule cleanly inside owning `company` module without breaking other modules' public contracts. | Package dependency check + `RecruitmentProcessIntegrationTest` & UT-01 tests PASS. |
| 10 | `backend-persistence-performance` | D2 `@Transactional(readOnly = true)` query/projection; D3 `@Version` optimistic lock enforcement. | Remove null-version fallback in `RecruitmentProcessServiceImpl`; keep read-only HR jobs query and pagination intact. | Fixed-Clock service/integration tests + `400`/`409`/`200` concurrency/version proofs. |
| 11 | `spring-security-rbac-endpoint` | Guardrail on D2/D3 endpoints (`GET /api/v1/hr/jobs`, `PUT /api/v1/applications/{id}/rounds/{roundId}`). | Preserve `@PreAuthorize`, `RoutePolicyRegistry`, `OwnershipGuard` `404` on cross-company HR, and `403` on `STAFF`/`CANDIDATE`. | `RbacPermissionMatrixIntegrationTest` and `RecruitmentProcessIntegrationTest` PASS. |
| 12 | `api-contract-and-errors` | D2 `HrJobSummaryDto` schema change; D3 `@NotNull version` -> `400 VALIDATION_ERROR` + OpenAPI required field. | Unified `ErrorResponse(code, message)` on `400`; update Springdoc/OpenAPI assertions in Java and E2E tests. | `OpenApiCoverageIntegrationTest` and `e2e/tier1-features/test_openapi_docs.test.mjs` PASS. |
| 13 | `security-review-checklist` | D3 prevents silent lost-update overwrites; D4 keeps HTML escaping (`HtmlUtils.htmlEscape`) and header sanitization; secret scan. | No unescaped template data, no PII in logs, no hardcoded secrets/tokens. | `CandidateTransitionNotificationListenerTest` XSS test + secret scan gate PASS. |
| 14 | `frontend-feature-slice` | D1 (`HrHomePage.tsx` + all 5 role homes), D2 (`HrRecruitmentPage.tsx` + all UT-02 job status/deadline views + types), D3 (prove frontend types/modal send `version`). | Zero `any`, `httpClient` + `AbortSignal`, barrel exports intact, Vitest coverage updated with 0 `act()` warnings. | `npm run lint`, `typecheck`, `test -- --run`, and `build` in `frontend/` exit 0. |
| 15 | `frontend-visual-design` | D1 primary action matching `StaffHomePage` next-step box; D2 non-color-only expired/open/closed labels; D4 `design-tokens.css` mirror constant (`>= 4.5:1`). | Only `--rj-*` tokens; Dense mode on HR/STAFF; light/dark parity; `CLS = 0`; Anti-AI rubric `>= 11/12`. | `node scripts/compute-contrast.mjs` PASS; D4 contrast numbers. |
| 16 | `frontend-motion-design` | D1 explicitly mandates keeping existing role-home motion and layout rules. | Preserve compositor-only transitions, budgets (`<= 150ms` micro), `prefers-reduced-motion` `0.001ms`, `CLS = 0`. | CSS/component diff audit + Vitest check. |
| 17 | `frontend-iconography` | D1/D2 UI elements on role homes and HR recruitment views. | Render icons exclusively via `<Icon name=... />` (24px grid, 2px stroke, `currentColor`), zero emoji, `aria-label` on icon-only buttons. | Static check of modified `.tsx` files + Vitest DOM assertions. |
| 18 | `frontend-accessibility-audit` | D1 role homes heading/keyboard/touch targets; D2 status not conveyed by color alone; D3 `UpdateRoundModal` focus trap & calm `409`; D4 `>= 4.5:1` contrast. | One `<h1>`, `>= 44x44px` mobile touch targets, `aria-invalid`/`aria-describedby`, keyboard-only operability. | Vitest a11y assertions. |
| 19 | `frontend-taste-anti-slop` | D1 removes contradicting `"Tính năng sắp ra mắt"` copy on `HrHomePage` and audits all 5 role homes against `docs/uiux/CONTENT.md`. | Full Vietnamese diacritics, honest pending features only (e.g., DN-04, IOC), single primary action without duplicate entry, `<= 2` nesting, zero overflow at `375px`. | Role-home copy audit table in `handoff.md`. |
| 20 | `module-domain-knowledge` | D2 requires exact parity with UT-01 job expiry rule (deadline-day boundary & timezone) and consistent labels (`"Hết hạn"`, `"Đang mở tuyển"`, `"Đã đóng"`). | Do not invent a second expiry rule; escalate via `[CAN DUYET - DOI TEAM LEAD]` if UT-01 rule is ambiguous. | UT-01 vs UT-02 expiry parity verified by fixed-Clock unit/integration tests. |
| 21 | `docs-bilingual-update` | Update `docs/ut02/PHASE0_ACK.md` and `docs/ut02/README.md` (D3 contract/sample). | Apply exact in-place D3 contract/sample edit in `docs/ut02/README.md` (log exact modified lines in `handoff.md`); do not edit root `README.md`. | `markdownlint-cli2`, `cspell`, `check-version-drift`, and `validate-agent-config` exit 0. |
| 22 | `ci-local-and-debug` | Run host quality gates cleanly without `scripts/run-ci-in-docker.*`. | Run `compute-contrast`, `sync-agent-config --check`, `validate-agent-config`, `check-gate-sync`, `check-version-drift`, `markdownlint`, `cspell`. | Raw transcripts in `handoff.md`. |
| 23 | `requesting-code-review` | Self-audit full diff and prepare file/evidence manifest in `handoff.md`. | Self-audit full diff (`git diff`), document what/why/proofs/new counts/changed files/bundle sizes. | Complete evidence manifest in `handoff.md`. |
| 24 | `verification-before-completion` | Mandatory gate verification on exact final working tree before reporting completion. | Capture raw outputs for all backend, frontend, and repo gate checks. | All acceptance criteria backed by raw captured evidence in `handoff.md`. |
| 25 | `handoff-to-team-lead` | Deliver uncommitted working tree on `feature/T0235C3-recruitment-process` with Vietnamese report and English commit proposals. | Zero git write commands; propose atomic `T0235C3: <type>(<scope>): <summary>` commits in English; report in Vietnamese. | Clean `git status` diff, zero commits made, English commit proposals in `handoff.md`. |

#### 4.2 Conditionally Applicable Skill (1)

- `brainstorming-before-building`: Per `SKILL.md:22`, does **not** apply to narrow, reproducible bug fixes with clear specs (D1–D4); **activates only** if investigating D2 reveals ambiguity in the UT-01 expiry rule or a DTO/contract trade-off requiring Team Lead decision under R3.

#### 4.3 Non-Applicable Skills (3)

- `flyway-migration-authoring`: D1–D4 require no database schema or dev seed changes (`V1..V24` stay immutable).
- `external-system-integration-and-mock`: D1–D4 do not call `mock/server.js` (`:9000`) or modify `ExternalApiClient`; D4 uses Spring `JavaMailSender` -> Mailpit (`:1025`).
- `writing-skills`: UT-02-fix does not create, modify, or pressure-test any `SKILL.md` file under `agent-config/skills/`.

---

### 5. Mandatory R1 Working Method (Verbatim)

"Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi."

---

### 6. UT-02-fix Re-Read Log

Re-read: 08-frontend-engineering, 09-frontend-design-bar, 10-testing-strategy, frontend-feature-slice, frontend-visual-design, frontend-motion-design, frontend-iconography, frontend-accessibility-audit, frontend-taste-anti-slop, test-driven-development, before Change Group 1 (D1: HrHomePage.tsx + 5 role homes audit + RoleHomes.test.tsx)
Re-read: 05-backend-java, 08-frontend-engineering, 09-frontend-design-bar, 10-testing-strategy, 13-backend-data-access-performance, 14-backend-module-boundaries, 16-backend-integrations, backend-module-feature, backend-module-boundaries, api-contract-and-errors, module-domain-knowledge, frontend-feature-slice, frontend-visual-design, frontend-iconography, frontend-accessibility-audit, test-driven-development, before Change Group 2 (D2: Expired jobs backend Clock single source of truth + FE + OpenAPI + E2E)
Re-read: 05-backend-java, 07-security-rbac, 08-frontend-engineering, 10-testing-strategy, 11-docs-and-bilingual, 13-backend-data-access-performance, 16-backend-integrations, backend-module-feature, backend-persistence-performance, api-contract-and-errors, security-review-checklist, docs-bilingual-update, test-driven-development, before Change Group 3 (D3: Required version on interview round updates + OpenAPI + E2E + docs/ut02/README.md)
Re-read: 03-safety-and-secrets, 05-backend-java, 09-frontend-design-bar, 15-backend-observability-ops, 16-backend-integrations, backend-module-feature, security-review-checklist, frontend-visual-design, before Change Group 4 (D4: CandidateTransitionNotificationListener design-token background constant)
Re-read: 01, 02, 03, 04, 05, 10, 11, 12; using-rikkei-skills, docs-bilingual-update, requesting-code-review, verification-before-completion, ci-local-and-debug, handoff-to-team-lead, before UT-02-fix documentation and Rule 05/10 baseline sync
Re-read: 01, 02, 03, 04, 11, 12; using-rikkei-skills, docs-bilingual-update, requesting-code-review, verification-before-completion, before fixing role-home audit table in docs/ut02/PR_DESCRIPTION.md

---

## UT-02-fix2 (T0235C3) — Phase 0 Acknowledgment

### 1. Starting Git State and Immutable Baseline (`UT-02-fix2`)

#### 1.1 Starting Git State (`D:\GitHub\Rikkei\rikkei-jobs`)

- `git branch --show-current`: `feature/T0235C3-recruitment-process`
- `HEAD`: `9520fd558bf5c3a3db5c44574e455938437392ba`
- `MERGE_HEAD`: `8088872273b52cecb46304f94a7598bfc113e290` (`origin/develop`, preserved uncommitted)
- `git status --porcelain -uall` at start: `961` entries, representing the completed uncommitted `UT-02-port` + `UT-02-fix` work prior to any `UT-02-fix2` edit.
- Manifests vs `origin/develop`: `backend/pom.xml`, `frontend/package.json`, `frontend/package-lock.json`, `mock/package.json`, and `mock/package-lock.json` have `0` byte diff (`git diff --stat origin/develop -- ...` empty); root `pom.xml` and `package*.json` do not exist.

#### 1.2 Immutable `backend/src/` and Migrations Baseline (`443` Files)

- All `443` files under `backend/src/` (including `19` `origin/develop` migrations `V1..V22` and `UT-02-port` migrations `V23__create_interview_rounds.sql` `sha256=a854c37aaa1621755d856f6c1dd87ac9fe20343785402c14dbea4da0004fe29d` and `V24__dev_interview_rounds_seed.sql` `sha256=ff73d63335cb637a1bfb10c2c2c474ae596b39072754d82844d23efa1e715458`) remain strictly untouched relative to the starting state of `UT-02-fix2`.

---

### 2. Files Read Before Any `UT-02-fix2` Edit

- Entrypoints: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`
- Base and round prompts: `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt`, `D:\GitHub\Rikkei\.agents\PROMPT_UT02_FIX2_EN.txt`
- All 16 rules in `.claude/rules/`: `01-project-context.md` through `16-backend-integrations.md`
- Applicable skills in `.claude/skills/<skill-name>/SKILL.md` (canonical `agent-config/skills/`)
- Round docs: `docs/ut02/PHASE0_ACK.md`, `docs/ut02/README.md`, `docs/ut02/PR_DESCRIPTION.md`, `docs/ut02/BROWSER_OBSERVATIONS.md`

---

### 3. Rules Compliance Matrix for `UT-02-fix2` (Rules 01 to 16)

| Rule | Concrete Binding Constraint for `UT-02-fix2` | Verification / Proof Method |
|---|---|---|
| `01-project-context` | Keep `identity` and `recruitment` feature slices bounded, preserve canonical 5 roles and 20 skills, and add zero new dependencies. | `node scripts/check-version-drift.mjs` exit 0; `git diff --stat origin/develop -- backend/pom.xml frontend/package*.json mock/package*.json` empty. |
| `02-git-and-delivery` | Git is strictly read-only (`status`/`diff`/`log`/`show`/`branch --show-current` only); stay on `feature/T0235C3-recruitment-process`; preserve uncommitted merge; propose `T0235C3: <type>(<scope>): <summary>` English commits. | `git branch --show-current` == `feature/T0235C3-recruitment-process`; `MERGE_HEAD` intact; zero git mutations; commit proposals in `handoff.md` and `PR_DESCRIPTION.md`. |
| `03-safety-and-secrets` | Write only inside `rikkei-jobs`; keep `Tai lieu du an`, `.agents`, `.vscode` read-only; never open `.env`/`*.pem`; never place `.agents/teamwork/` inside `rikkei-jobs`; zero secrets/PII/machine paths. | Secret scan + path-leak gates PASS; `git status` shows changes only in approved paths. |
| `04-honest-verification` | Reproduce D1-D4 RED first, fix at root, prove GREEN with raw outputs and screenshots; zero `console.log`/`TODO`/`FIXME`; clean `docker compose down -v`. | Raw RED->GREEN logs, 10x Vitest logs, `.\check.ps1` and `./check.sh` 26/26 PASS. |
| `05-backend-java` | Backend Java source and `backend/pom.xml` remain strictly unchanged (`1410` tests / `92` classes preserved). | SHA-256 verification of all `443` `backend/src/` files against baseline `baseline_sha256.txt`. |
| `06-database-flyway` | All Flyway migrations (`V1..V24`) remain immutable; no schema or seed changes. | SHA-256 unchanged for `V1..V24` in `backend/src/` baseline check. |
| `07-security-rbac` | Keep existing `CANDIDATE`/`HR`/`STAFF` route guards, fail-closed `STAFF` read-only mode on `ApplicationDetailPage`, and memory-only JWT auth (no reload/logout on 409 recovery). | `ApplicationRouting.test.tsx` & `ApplicationDetailPage.test.tsx` PASS; D2 recovery uses API refetch without document reload. |
| `08-frontend-engineering` | TypeScript strict (zero `any`), requests only via `httpClient` with `AbortSignal`, slice boundaries in `features/identity` and `features/recruitment`, WCAG 2.2 AA semantics. | `npm run lint --prefix frontend`, `npm run typecheck --prefix frontend`, `npm run test --prefix frontend -- --run`, `npm run build --prefix frontend` exit 0. |
| `09-frontend-design-bar` | Keep `identity.css` untouched (D1), `CLS = 0`, existing motion rules unchanged, `--rj-*` tokens only (zero raw hex/z-index), zero emoji, `<Icon />` 24px/2px stroke, D4 non-color-only neutral fallback. | `node scripts/compute-contrast.mjs` PASS; CSS token audit; live `/browser` checks at 375/768/1024/1440 px Light/Dark. |
| `10-testing-strategy` | TDD Red->Green for D1/D4/D2; split slow D3 test cases (`StaffApplicationsPage.test.tsx`, `HrRecruitmentPage.test.tsx`, `ApplicationDetailPage.test.tsx`) without raising timeouts/retries/skipping; 10 consecutive clean Vitest runs (`< 2500 ms` UT-02/D2, `0` `act()` warnings); update Rule 10 baseline. | 10x `npx vitest run --reporter=verbose` logs, `agent-config/rules/10-testing-strategy.md` updated & synced. |
| `11-docs-and-bilingual` | Append `UT-02-fix2` sections to `docs/ut02/{PHASE0_ACK,README,PR_DESCRIPTION,BROWSER_OBSERVATIONS}.md`; correct Section 8 D1 lines in-place in `PR_DESCRIPTION.md`; keep root `README.md` untouched; Vietnamese UI copy with full diacritics; update `cspell.json` only for valid terms if needed. | `markdownlint-cli2`, `cspell`, `node scripts/check-version-drift.mjs`, and `node scripts/validate-agent-config.mjs` exit 0. |
| `12-ci-and-quality-gates` | Add zero new quality gates; keep `26` active / `29` total gate parity across `check.sh`, `check.ps1`, and `.github/workflows/ci.yml`; never run `scripts/run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs`, `.\check.ps1`, and `./check.sh` 26/26 PASS. |
| `13-backend-data-access-performance` | Respect backend `@Version` optimistic locking (`409 CONFLICT`) and state machine (`409 INVALID_TRANSITION` / `INVALID_APPLICATION_STATE`) by deriving `editingRound` from fresh detail and sending latest `version` on retry. | D2 `UpdateRoundModal` retry test verifies new `version` sent and `200` achieved without backend change. |
| `14-backend-module-boundaries` | Keep backend module boundaries and API contract unchanged; keep frontend slices cleanly isolated under `features/identity` and `features/recruitment`. | `backend/src/` SHA-256 unchanged; frontend `typecheck` & `lint` PASS. |
| `15-backend-observability-ops` | Zero PII or sensitive tokens in frontend error banners, logs, or saved screenshots; zero `console.log` in production frontend code. | Code audit + secret scan gate + live `/browser` console check (`0` console errors). |
| `16-backend-integrations` | Preserve existing API contracts and UT-01 candidate flows (`apply`, `withdraw`) unchanged while adapting HR 409 recovery in `recruitmentApi.ts`. | `recruitmentApi.test.ts` confirms UT-01 `apply`/`withdraw` unchanged; E2E `node e2e/run-all.mjs` PASS in Phase B. |

---

### 4. Applicable Skills for `UT-02-fix2`

#### 4.1 Directly Applicable Skills (19)

| # | Skill | Why It Applies to `UT-02-fix2` | Concrete Constraint | Verification / Proof Method |
|---|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory bootstrap & precedence governor (`PROMPT_BASE_RULES_EN.txt` R1). | Rules 01-16 supersede skills; load per phase; append `Re-read:` before each change group. | `PHASE0_ACK.md` section + `Re-read:` entries logged before every change group. |
| 2 | `test-driven-development` | Reproduce D1, D4, D2 RED before fixing, implement minimal fix, prove GREEN with 0 `act()` warnings. | Write/run failing Vitest cases before each production fix; zero `setTimeout` sleeps. | Saved RED and GREEN Vitest outputs in scratch folder. |
| 3 | `systematic-debugging` | Diagnose root causes for D1 (`HrHomePage`), D2 (409 trap + modal keys + snapshot `editingRound`), D3 (multi-phase test >2500ms), D4 (`getJobStatusMeta`). | Fix root cause cleanly without raising `testTimeout` or suppressing errors. | Root-cause chain documented in `handoff.md` and verified via tests. |
| 4 | `writing-implementation-plans` | Sequence D1 -> D4 -> D2 -> D3 -> Docs/Gates cleanly. | Define exact files and verification commands per group. | Ordered execution across change groups 1-5. |
| 5 | `executing-plans` | Execute change groups sequentially without advancing past red gates. | Maintain `progress.md` UTC timestamps before/after long runs. | `progress.md` heartbeats and sequential green gate outputs. |
| 6 | `dispatching-parallel-agents` | Respect worker boundaries in Teamwork execution. | Write only inside `rikkei-jobs` and own conversation scratch folder; no `.agents/teamwork/` in repo. | `git status` confirms clean scope. |
| 7 | `receiving-code-review` | Remediate Team Lead's 4 defects (`D1-D4`) on PR `#21` without scope creep. | Keep all out-of-scope items (R5) untouched. | Diff audit confirms only D1-D4, D3 splits, docs, and Rule 10 touched. |
| 8 | `frontend-feature-slice` | Modify `features/identity` (D1) and `features/recruitment` (D2, D3, D4). | Strict TS (zero `any`), `httpClient` + `AbortSignal`, barrel exports intact, loading/error/empty/data handled. | `npm run lint`, `typecheck`, `test`, `build` PASS. |
| 9 | `frontend-visual-design` | D1 two-box hero layout without `identity.css` changes; D2 `--rj-*` alert actions; D4 non-color-only badge. | `--rj-*` tokens only, `CLS = 0`, light/dark parity, `>= 44px` mobile touch targets. | `node scripts/compute-contrast.mjs` PASS; CSS audit. |
| 10 | `frontend-motion-design` | Preserve existing role-home motion & `CLS = 0` on `HrHomePage` (D1) and portal modal transitions (D2). | Compositor-only (`transform`, `opacity`), no scroll-lock thrash on modal refresh. | CSS/component review; `CLS = 0` check. |
| 11 | `frontend-iconography` | Use `<Icon name=... />` (24px grid, 2px stroke, `currentColor`), zero emoji; D4 non-check icons (`'x'`, `'alert-circle'`). | Zero raw `<svg>` in feature slices; accessible labels on icon-only controls. | Static check + Vitest DOM assertions. |
| 12 | `frontend-accessibility-audit` | D2 focus move on refresh/close/unavailable-notice, `role="alert"` / live region, keyboard-only path, `>= 44px` targets; D4 non-color-only status. | Logical focus restoration; no focus lost to `document.body`. | Vitest keyboard/focus assertions across all 3 modals. |
| 13 | `frontend-taste-anti-slop` | Authentic Vietnamese copy with full diacritics, D1 subtitle + 2-item coming-soon card, D4 `'Đã từ chối'` / `'Không xác định'`. | No `"tải lại trang"` in HR 409 flows; no raw enums shown to users. | Copy assertions in Vitest & code review. |
| 14 | `module-domain-knowledge` | Enforce `SUBMITTED -> SCREENING \| REJECTED`, `SCREENING -> INTERVIEW \| REJECTED`, `INTERVIEW -> REJECTED`, 409 codes, and JD statuses. | Keep backend state machine & UT-01 candidate flows unchanged. | D2 & D4 Vitest suites PASS. |
| 15 | `docs-bilingual-update` | Update `docs/ut02/*` and `agent-config/rules/10-testing-strategy.md`, run `sync-agent-config.mjs`. | Verify `sync-agent-config --check`, `validate-agent-config`, `markdownlint-cli2`, `cspell`. | All 4 checks exit 0. |
| 16 | `ci-local-and-debug` | Run host quality gates cleanly without `scripts/run-ci-in-docker.*`. | Verify `./check.sh` and `.\check.ps1` (`26/26` identical counts). | Both gate runners PASS `26/26`. |
| 17 | `requesting-code-review` | Self-audit full diff and document metrics/proofs in `docs/ut02/PR_DESCRIPTION.md`. | Record raw RED/GREEN, 10x Vitest durations, bundle sizes, and corrected Section 8 lines. | `PR_DESCRIPTION.md` updated and linted. |
| 18 | `verification-before-completion` | Verify exact final working tree before handoff. | Capture raw outputs for 10x Vitest, lint/typecheck/build, gates, and SHA-256 checks. | Raw logs recorded in scratch & `handoff.md`. |
| 19 | `handoff-to-team-lead` | Deliver uncommitted changes on `feature/T0235C3-recruitment-process` with Vietnamese report & `T0235C3:` commit proposals. | Zero git write commands executed. | `git branch --show-current` and `MERGE_HEAD` intact. |

#### 4.2 Conditionally Applicable Skill (1)

- `brainstorming-before-building`: Activates only if D1-D4 reveal a requirement conflict or design trade-off requiring Team Lead approval under R3 (`[CAN DUYET - DOI TEAM LEAD]`).

#### 4.3 Non-Applicable Skills (9)

- `backend-module-feature`, `backend-module-boundaries`, `backend-persistence-performance`, `flyway-migration-authoring`, `spring-security-rbac-endpoint`, `api-contract-and-errors`, `security-review-checklist`, `external-system-integration-and-mock`, `writing-skills`: `UT-02-fix2` strictly forbids modifying backend source code, Flyway migrations, API contracts, mock calls, or `SKILL.md` files (existing security hygiene on frontend — memory-only tokens, no raw enum leakage, no XSS — remains preserved).

---

### 5. Mandatory R1 Working Method (Verbatim)

"Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi."

---

### 6. `UT-02-fix2` Re-Read Log

Re-read: 01, 02, 06, 07, 10, 14; skills using-rikkei-skills, test-driven-development, frontend-feature-slice, frontend-visual-design, frontend-motion-design, frontend-accessibility-audit, frontend-taste-anti-slop, before D1 HrHomePage restore
Re-read: 01, 02, 08, 09, 10; skills using-rikkei-skills, test-driven-development, systematic-debugging, frontend-feature-slice, frontend-visual-design, frontend-iconography, frontend-accessibility-audit, frontend-taste-anti-slop, module-domain-knowledge, before D4 HrRecruitmentPage job status mapping
Re-read: 01, 02, 04, 08, 09, 10, 13, 15, 16; skills using-rikkei-skills, test-driven-development, systematic-debugging, frontend-feature-slice, frontend-visual-design, frontend-motion-design, frontend-iconography, frontend-accessibility-audit, frontend-taste-anti-slop, module-domain-knowledge, before D2 409 conflict recovery
Re-read: 01, 02, 04, 08, 10; skills using-rikkei-skills, test-driven-development, systematic-debugging, frontend-feature-slice, verification-before-completion, before D3 test splitting and query optimization
Re-read: 01, 02, 10, 11, 12, 13; skills docs-bilingual-update, ci-local-and-debug, verification-before-completion, before docs and Rule 10 baseline update
Re-read: 01, 02, 06, 07, 10, 14; skills test-driven-development, systematic-debugging, frontend-accessibility-audit, frontend-feature-slice, verification-before-completion, before Iteration 2 Challenger D2 focus and error-copy fixes
Re-read: 01, 02, 06, 07, 10, 14; skills test-driven-development, systematic-debugging, frontend-accessibility-audit, frontend-feature-slice, verification-before-completion, before Iteration 3 Challenger D2 concurrency and abort-guard fixes
Re-read: 01, 02, 06, 07, 10, 14; skills test-driven-development, systematic-debugging, frontend-accessibility-audit, frontend-feature-slice, verification-before-completion, before Iteration 4 Challenger Wave 3 concurrency, route-reset, and modal abort-focus fixes
Re-read: 01, 02, 06, 07, 10, 14; skills test-driven-development, frontend-feature-slice, frontend-accessibility-audit, verification-before-completion, before Iteration 5 StatusTransitionModal derived effectiveToStatus fix
Re-read: 01, 02, 10, 12, 13; skills docs-bilingual-update, ci-local-and-debug, verification-before-completion, handoff-to-team-lead, before Phase B cleanup, BROWSER_OBSERVATIONS.md, and final gate verification

---

## UT-02-fix3 (T0235C3) — Phase 0 Acknowledgment

### 1. Starting Git State and Immutable Baseline (`UT-02-fix3`)

#### 1.1 Starting Git State (`D:\GitHub\Rikkei\rikkei-jobs`)

- `git branch --show-current`: `feature/T0235C3-recruitment-process`
- `HEAD`: `9520fd558bf5c3a3db5c44574e455938437392ba`
- `MERGE_HEAD`: `8088872273b52cecb46304f94a7598bfc113e290` (`origin/develop`, preserved uncommitted)
- `git status --porcelain -uall` at start: `977` entries, representing the completed uncommitted `UT-02-port` + `UT-02-fix` + `UT-02-fix2` work prior to any `UT-02-fix3` edit.
- Manifests vs `origin/develop`: `backend/pom.xml`, `frontend/package.json`, `frontend/package-lock.json`, `mock/package.json`, and `mock/package-lock.json` have `0` byte diff (`git diff --stat origin/develop -- ...` empty); root `pom.xml` and `package*.json` do not exist.

#### 1.2 Immutable `backend/src/` and Migrations Baseline (`443` Files)

- All `443` files under `backend/src/` (including `19` `origin/develop` migrations `V1..V22` and `UT-02-port` migrations `V23__create_interview_rounds.sql` `sha256=a854c37aaa1621755d856f6c1dd87ac9fe20343785402c14dbea4da0004fe29d` and `V24__dev_interview_rounds_seed.sql` `sha256=ff73d63335cb637a1bfb10c2c2c474ae596b39072754d82844d23efa1e715458`) remain strictly untouched relative to the starting state of `UT-02-fix3` (recorded in `starting_backend_sha256.txt`).

---

### 2. Files Read Before Any `UT-02-fix3` Edit

- Entrypoints: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`
- Base and round prompts: `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt`, `D:\GitHub\Rikkei\.agents\PROMPT_UT02_FIX3_EN.txt`
- All 16 rules in `.claude/rules/`: `01-project-context.md` through `16-backend-integrations.md`
- Applicable repository skills in `agent-config/skills/<skill-name>/SKILL.md` (`19` directly applicable + `1` conditional)
- Round docs: `docs/ut02/PHASE0_ACK.md`, `docs/ut02/README.md`, `docs/ut02/PR_DESCRIPTION.md`, `docs/ut02/BROWSER_OBSERVATIONS.md`

---

### 3. Rules Compliance Matrix for `UT-02-fix3` (Rules 01 to 16)

| Rule | Concrete Binding Constraint for `UT-02-fix3` | Verification / Proof Method |
|---|---|---|
| `01-project-context` | Keep `recruitment` feature slice bounded, preserve canonical 5 roles and 20 skills, and add zero new dependencies. | `node scripts/check-version-drift.mjs` exit 0; `git diff --stat origin/develop -- backend/pom.xml frontend/package*.json mock/package*.json` empty. |
| `02-git-and-delivery` | Git is strictly read-only (`status`/`diff`/`log`/`show`/`branch --show-current` only); stay on `feature/T0235C3-recruitment-process`; preserve uncommitted merge; propose `T0235C3: <type>(<scope>): <summary>` English commits. | `git branch --show-current` == `feature/T0235C3-recruitment-process`; `MERGE_HEAD` intact; zero git mutations; commit proposals in `handoff.md` and `PR_DESCRIPTION.md`. |
| `03-safety-and-secrets` | Write only inside `rikkei-jobs`; keep `Tai lieu du an`, `.agents`, `.vscode` read-only; never open `.env`/`*.pem`; never place `.agents/teamwork/` inside `rikkei-jobs`; zero secrets/PII/machine paths. | Secret scan + path-leak gates PASS; `git status` shows changes only in approved paths. |
| `04-honest-verification` | Reproduce D1 and D3 RED first, fix D1/D2/D3 at root, prove GREEN with raw outputs and 20x Vitest logs; zero `console.log`/`TODO`/`FIXME`; clean `docker compose down -v`. | Raw RED->GREEN logs, 20x Vitest logs, `.\check.ps1` and `./check.sh` 26/26 PASS. |
| `05-backend-java` | Backend Java source and `backend/pom.xml` remain strictly unchanged (`1410` tests / `92` classes preserved). | SHA-256 verification of all `443` `backend/src/` files against `starting_backend_sha256.txt`. |
| `06-database-flyway` | All Flyway migrations (`V1..V24`) remain immutable; no schema or seed changes. | SHA-256 unchanged for `V1..V24` in `backend/src/` baseline check. |
| `07-security-rbac` | Keep existing `CANDIDATE`/`HR`/`STAFF` route guards, fail-closed `STAFF` read-only mode on `ApplicationDetailPage`, and memory-only JWT auth (no reload/logout on 409 recovery). | `ApplicationRouting.test.tsx` & `ApplicationDetailPage.test.tsx` PASS; D1/D3 fixes keep API refetch without document reload. |
| `08-frontend-engineering` | TypeScript strict (zero `any`), requests only via `httpClient` with `AbortSignal`, slice boundaries in `features/recruitment`, WCAG 2.2 AA semantics (`reloadBtnRef` focus on 409 + `role="alert"` `aria-live="assertive"`). | `npm run lint --prefix frontend`, `npm run typecheck --prefix frontend`, `npm run test --prefix frontend`, `npm run build --prefix frontend` exit 0. |
| `09-frontend-design-bar` | Keep `--rj-*` tokens only, `CLS = 0`, existing motion rules unchanged, zero emoji, `<Icon />` 24px/2px stroke, and `useScrollLock` portal integrity across all 3 modals. | `node scripts/compute-contrast.mjs` PASS; `npm run build` bundle size check; CSS audit. |
| `10-testing-strategy` | TDD Red->Green for D1/D3; audit all effect-dependent assertions in `features/recruitment/__tests__/` into `waitFor(...)` without raising `testTimeout`/retries/skip/sleeps; prove 20 consecutive clean Vitest runs (`0` `act()` warnings); update Rule 10 baseline and sync. | 20x `npx vitest run --reporter=verbose` logs, `agent-config/rules/10-testing-strategy.md` updated & synced. |
| `11-docs-and-bilingual` | Append `UT-02-fix3` sections to `docs/ut02/{PHASE0_ACK,README,PR_DESCRIPTION,BROWSER_OBSERVATIONS}.md` (only screenshot paths in `BROWSER_OBSERVATIONS.md` edited in-place after moving `browser_evidence/` to `docs/ut02/pr-screenshots/`); keep root `README.md` untouched; append Team Lead `9/10` note for `UT-02-fix2`. | `markdownlint-cli2`, `cspell`, `node scripts/check-version-drift.mjs`, and `node scripts/validate-agent-config.mjs` exit 0. |
| `12-ci-and-quality-gates` | Add zero new quality gates; keep `26` active / `29` total gate parity across `check.sh`, `check.ps1`, and `.github/workflows/ci.yml`; never run `scripts/run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs`, `.\check.ps1`, and `./check.sh` 26/26 PASS. |
| `13-backend-data-access-performance` | Respect backend `@Version` optimistic locking (`409 CONFLICT`) by pinning `formVersion` to displayed form data in `UpdateRoundModal.tsx` and applying returned round immediately in `ApplicationDetailPage.tsx` `onSuccess`. | D1 unit tests (deferred promise) verify old `formVersion` sent -> 409 recovery, and immediate post-success round update. |
| `14-backend-module-boundaries` | Keep backend module boundaries and API contract unchanged; keep frontend `recruitment` slice cleanly isolated. | `backend/src/` SHA-256 unchanged; frontend `typecheck` & `lint` PASS. |
| `15-backend-observability-ops` | Zero PII or sensitive tokens in frontend error banners, logs, or saved screenshots; zero `console.log` in production frontend code. | Code audit + secret scan gate + clean Vitest/lint output. |
| `16-backend-integrations` | Preserve existing API contracts and UT-01 candidate flows (`apply`, `withdraw`) unchanged; preserve optimistic locking for interview round updates without altering transition locking. | `recruitmentApi.test.ts`, `ApplyDialog.test.tsx`, `WithdrawDialog.test.tsx`, `MyApplicationsPage.test.tsx` PASS. |

---

### 4. Applicable Skills for `UT-02-fix3`

#### 4.1 Directly Applicable Skills (19)

| # | Skill | Why It Applies to `UT-02-fix3` | Concrete Constraint | Verification / Proof Method |
|---|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory bootstrap & precedence governor (`PROMPT_BASE_RULES_EN.txt` R1). | Rules 01-16 supersede skills; load per phase; append `Re-read:` before each change group. | `PHASE0_ACK.md` section + `Re-read:` entries logged before every change group. |
| 2 | `receiving-code-review` | Address Team Lead's `UT-02-fix3` defects (`D1`, `D2`, `D3`) on PR `#21` without scope creep. | Keep all out-of-scope items unchanged; record Team Lead `9/10` observation for `UT-02-fix2`. | Diff audit confirms only D1, D2, D3, docs, evidence, and Rule 10 touched. |
| 3 | `systematic-debugging` | Diagnose root causes for D1 (`effectiveVersion` reading live `round.version` & `onSuccess` ignoring returned round), D2 (passive `useEffect` race after `waitFor`), D3 (missing `setErrorFocusSeq` on 409). | Fix root cause cleanly without raising `testTimeout`, skipping, or suppressing errors. | Root-cause chain documented in `handoff.md` and verified via tests. |
| 4 | `test-driven-development` | Reproduce D1 and D3 RED first using deferred promises & `submitBtn.blur()`, then implement minimal fix to GREEN. | Write/run failing Vitest cases before each production fix; zero `setTimeout` sleeps. | Saved RED and GREEN Vitest outputs in `handoff.md`. |
| 5 | `writing-implementation-plans` | Sequence Phase 0 -> Change Group 1 (RED) -> Change Group 2 (Root Fixes) -> Change Group 3 (20x Proof/Build/Sync/Gates). | Define exact files and verification commands per group. | Ordered execution across Change Groups 0-3. |
| 6 | `executing-plans` | Execute change groups sequentially without advancing past red gates. | Maintain `progress.md` UTC timestamps before/after long runs (`20x vitest`, `check.ps1`, `check.sh`, `npm run build`). | `progress.md` heartbeats and sequential green gate outputs. |
| 7 | `dispatching-parallel-agents` | Respect worker boundaries in Teamwork execution. | Write only inside `rikkei-jobs` and own conversation scratch folder; no `.agents/teamwork/` in repo. | `git status` confirms clean scope. |
| 8 | `frontend-feature-slice` | Modify `UpdateRoundModal.tsx`, `StatusTransitionModal.tsx`, `AddInterviewRoundModal.tsx`, `ApplicationDetailPage.tsx`, and `features/recruitment/__tests__/`. | Strict TS (zero `any`), `httpClient` + `AbortSignal`, barrel exports intact, loading/error/empty/data handled. | `npm run lint`, `typecheck`, `test`, `build` PASS. |
| 9 | `frontend-accessibility-audit` | Core for D3 & D2: move focus to `"Tải lại dữ liệu mới nhất"` inside all 3 dialogs on 409, keep `role="alert"` `aria-live="assertive"` announced, wrap effect-dependent focus assertions in `waitFor`. | No focus lost to `document.body`; keyboard Tab/Escape/Enter preserved. | Vitest D3 focus tests across all 3 modals & D2 `waitFor` audit PASS. |
| 10 | `frontend-visual-design` | Preserve `--rj-*` tokens, `useScrollLock`, portal shell, `CLS = 0`, light/dark parity, `>= 44px` mobile targets. | Do not alter modal visual styling or weaken UT-02-fix2 recovery UI. | `node scripts/compute-contrast.mjs` PASS; CSS untouched. |
| 11 | `frontend-motion-design` | Preserve motion budgets (`<= 300ms` dialogs / `0.001ms` reduced motion) and stable `key` shells. | Keep `key={round.id}` / `key={detail.id}` / `key={applicationId}` without scroll-lock thrash. | Component review + `data-scroll-locked` tests PASS. |
| 12 | `frontend-iconography` | Keep curated `<Icon />` (24px grid, 2px stroke, `currentColor`), zero emoji. | Do not introduce raw `<svg>` or emojis in modal recovery alerts/buttons. | Lint & code audit PASS. |
| 13 | `frontend-taste-anti-slop` | Preserve authentic Vietnamese copy with full diacritics; no `"tải lại trang"` or AI slop. | Keep all existing Vietnamese UI strings intact. | Test assertions & code review PASS. |
| 14 | `module-domain-knowledge` | Preserve UT-02 state machine, round rules, `computeCanSendOffer` matching `evaluateCanSendOffer`, and `@Version` optimistic locking. | `computeCanSendOffer` mirrors backend `INTERVIEW` + non-empty + no `PENDING` + last round `PASS`. | D1 unit tests & code alignment verified. |
| 15 | `docs-bilingual-update` | Update `agent-config/rules/10-testing-strategy.md`, run `sync-agent-config.mjs`, move `browser_evidence/` -> `docs/ut02/pr-screenshots/`, update `BROWSER_OBSERVATIONS.md` paths. | Verify `sync-agent-config --check`, `validate-agent-config`, `markdownlint-cli2`, `cspell`. | All checks exit 0. |
| 16 | `ci-local-and-debug` | Run host quality gates cleanly without `scripts/run-ci-in-docker.*`. | Verify `.\check.ps1` and `./check.sh` (`26/26` identical counts) and `check-gate-sync.mjs`. | Both gate runners PASS `26/26`. |
| 17 | `verification-before-completion` | Verify exact final working tree before handoff. | Capture raw outputs for 20x Vitest, lint/typecheck/build gzip, gates, and SHA-256 checks. | Raw logs recorded in scratch & `handoff.md`. |
| 18 | `requesting-code-review` | Prepare self-audited change summary and evidence metrics for Parent & Team Lead review. | Record exact file diffs, 2-dialog audit, and test counts. | Documented in `handoff.md`. |
| 19 | `handoff-to-team-lead` | Deliver uncommitted changes on `feature/T0235C3-recruitment-process` with Vietnamese explanation & `T0235C3:` commit guidance. | Zero git write commands executed. | `git branch --show-current` and `MERGE_HEAD` intact. |

#### 4.2 Conditionally Applicable Skill (1)

- `brainstorming-before-building`: Activates only if D1-D3 reveal a requirement conflict or design trade-off requiring Team Lead approval under R3 (`` `[CAN DUYET - DOI TEAM LEAD]` ``).

#### 4.3 Non-Applicable Skills (9)

- `backend-module-feature`, `backend-module-boundaries`, `backend-persistence-performance`, `flyway-migration-authoring`, `spring-security-rbac-endpoint`, `api-contract-and-errors`, `security-review-checklist`, `external-system-integration-and-mock`, `writing-skills`: `UT-02-fix3` strictly forbids modifying backend source code, Flyway migrations, API contracts, mock calls, or `SKILL.md` files (existing security hygiene on frontend — memory-only tokens, no raw enum leakage, no XSS — remains preserved).

---

### 5. Mandatory R1 Working Method (Verbatim)

"Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi."

---

### 6. `UT-02-fix3` Re-Read Log

Re-read: Rules 08, 10; Skills using-rikkei-skills, test-driven-development, systematic-debugging, frontend-feature-slice, frontend-accessibility-audit, before D1 and D3 RED tests
Re-read: Rules 08, 09, 10; Skills using-rikkei-skills, systematic-debugging, test-driven-development, frontend-feature-slice, frontend-accessibility-audit, frontend-visual-design, frontend-motion-design, frontend-iconography, frontend-taste-anti-slop, module-domain-knowledge, before D1, D2, and D3 implementation fixes
Re-read: Rules 05, 10, 11, 12; Skills using-rikkei-skills, docs-bilingual-update, ci-local-and-debug, verification-before-completion, before 20-run D2 proof, lint/typecheck/build, Rule 10 sync, and quality gates
Re-read: Rules 02, 03, 04, 11, 12; Skills using-rikkei-skills, docs-bilingual-update, verification-before-completion, requesting-code-review, handoff-to-team-lead, before Docker teardown and final docs/ut02 appends
