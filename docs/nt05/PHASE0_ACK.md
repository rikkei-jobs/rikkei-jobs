# Phase 0 Acknowledgement — Round NT-05 (`T022C02`)

- Document Path: `docs/nt05/PHASE0_ACK.md`
- Round: `NT-05` — External Data Sync (`LMS`, `Exam`, `lms-pm`) as HS-01 Evidence Source + Confirmed Defect Fixes (`H1`, `H2`, `H3`)
- Task Code: `T022C02`
- Branch: `feature/t022c02-ket-noi-du-lieu`
- Base Commit: `17b1ae8` (`Merge pull request #21 from rikkei-jobs/feature/T0235C3-recruitment-process`)
- Proposed PR Title: `[NT-05] T022C02: sync LMS, exam and lms-pm data as skill evidence`
- Encoding & Line Endings: UTF-8 without BOM, LF (`\n`), zero emoji
- Status: Completed prior to any code, migration, test, config, or other documentation modification

---

## 1. Mandatory Working Method (Verbatim from `PROMPT_BASE_RULES_EN.txt` R1, line 31)

> "Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi."

---

## 2. Verbatim Team Lead Execution Notes and Stop Gate Decision

### 2.1 Mandatory Team Lead Execution Notes (Verbatim)

1. **Working directory**: `D:\GitHub\Rikkei\rikkei-jobs` (NOT `D:\GitHub\Rikkei`). Run ALL git, Maven, npm, and docker commands from `D:\GitHub\Rikkei\rikkei-jobs` and write files ONLY inside `D:\GitHub\Rikkei\rikkei-jobs` (temp files only in OS temp folder, deleted afterwards).
2. **R4 correction (timeout & retries for NT-05 vs TT-01)**: NT-05 sync MUST call ALL THREE endpoints — LMS, Exam, AND PM (`getStudentInternships`) — via the 5-second timeout + 2 retries on network errors path. The 2.5-second fast-fail with no retries is kept ONLY for TT-01's internship page read flow, NOT for NT-05.
3. **Full spec precedence**: `D:\GitHub\Rikkei\.agents\PROMPT_NT05_EN.txt` (sections 0-10, including all D1-D11 and all baselines) and `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (R0-R3) remain binding word-for-word.

### 2.2 Verbatim Team Lead Stop Gate Decision (`(A)`-`(G)`)

```text
Approved Option 1, kèm điều kiện bắt buộc:

(A) CandidatePublicServiceInternshipTest: giữ D3. Chỉ đổi title, không đổi điểm, không có endDate thì giữ nguyên recordedAt; sửa assertion đó và DisplayName tương ứng. Được đổi stub, mock, wiring theo source_key. Thêm test: có endDate thì recordedAt = 00:00 ngày endDate theo Asia/Ho_Chi_Minh.
GIỮ assertion deleteAll(staleDuplicate). Làm rõ D2/D3: riêng PM, mỗi lần đồng bộ (cả TT-01 và NT-05) vẫn xóa các dòng thừa cùng (user, batchId) như hiện nay; dòng lịch sử LMS/EXAM được giữ. Override trên dòng PM không chính tắc (source_key có hậu tố #h) bị từ chối 400 VALIDATION_ERROR và UI không cho sửa. V25 không xóa dòng external_records nào. Thêm test: dữ liệu PM trùng từ trước V25, đồng bộ xong còn 1 dòng, không lỗi khóa ngoại.

(B) PmInternshipResultCommand: giữ constructor 3 tham số (endDate và payload = null) để chỗ gọi cũ không phải sửa. InternshipSyncServiceTest assert đầy đủ command mới, gồm endDate 2026-10-30 và payload đúng object nguồn; không dùng any() và không bỏ trường nào.

(C) SharedAppLayout.test.tsx: chỉ thêm đúng 1 mục "Đồng bộ dữ liệu" (/staff/data-sync, không disabled) vào các danh sách STAFF.

(D) test_openapi_docs.test.mjs: chỉ thêm đúng 5 operation của D10; 45 -> 50 paths, 48 -> 53 operations (cả tên test và thông báo).

(E) Cho phép sẵn, chỉ tăng số đúng bằng số migration mới, không nới lỏng gì khác: DefaultProfileIntegrationTest, ProfileSeparationIntegrationTest, CompanyMigrationIntegrationTest, InternshipMigrationIntegrationTest, RecruitmentMigrationIntegrationTest (chỉ các assertion chạy tới version mới nhất; assertion có target() cố định giữ nguyên), kể cả DisplayName liên quan.

(F) roleUtils.test.ts: 22 -> 23 route, thêm ['/staff/data-sync', ['STAFF']] và sửa tên test. e2e/run-all.mjs được đăng ký suite mới.

(G) Approved (G), đúng phạm vi sau:
- SecurityHardeningIntegrationTest: hai assertion đếm migration 12 -> 13, cập nhật DisplayName và message thêm V25.
- AiGovernanceIntegrationTest: thêm "25" vào cuối danh sách dev (22 bản ghi) và danh sách prod latest (13 bản ghi); nhánh target 15 giữ nguyên; openApiContainsNewAdminContracts 45 -> 50 paths, đúng 5 path của D10.
- Nếu có thêm V26 dev (chỉ khi giải trình được theo D2) thì các assertion dev ở (E) và (G) tăng đúng theo số migration thật.
Không nới lỏng hay bỏ assertion nào khác. Ghi (G) vào PHASE0_ACK.md, truyền nguyên văn cho mọi sub-agent, liệt kê trước/sau trong báo cáo cuối, rồi triển khai tiếp từ M1.

Ngoài (A)-(F) [và (G)], mọi thay đổi assertion khác vẫn là Stop Gate. Báo cáo cuối liệt kê từng assertion đã đổi, giá trị trước và sau. Đưa nguyên văn điều kiện này cho mọi sub-agent, ghi vào PHASE0_ACK.md, rồi triển khai.
```

---

## 3. Complete Inventory of Files Read Before Any Edit

1. **Authoritative Specifications and Request**:
   - `.agents/PROMPT_BASE_RULES_EN.txt` (R0-R3, lines 1-54)
   - `.agents/PROMPT_NT05_EN.txt` (sections 0-10, D1-D11, lines 1-199)
   - `<teamwork-state>/ORIGINAL_REQUEST.md` (lines 1-89)
2. **Root Agent Entrypoints**:
   - `CLAUDE.md` (lines 1-47)
   - `GEMINI.md` (lines 1-61)
   - `AGENTS.md` (lines 1-44)
3. **All 16 Enterprise Rules (`.claude/rules/`)**:
   - `.claude/rules/01-project-context.md` (94 lines)
   - `.claude/rules/02-git-and-delivery.md` (90 lines)
   - `.claude/rules/03-safety-and-secrets.md` (70 lines)
   - `.claude/rules/04-honest-verification.md` (59 lines)
   - `.claude/rules/05-backend-java.md` (83 lines)
   - `.claude/rules/06-database-flyway.md` (73 lines)
   - `.claude/rules/07-security-rbac.md` (78 lines)
   - `.claude/rules/08-frontend-engineering.md` (79 lines)
   - `.claude/rules/09-frontend-design-bar.md` (79 lines)
   - `.claude/rules/10-testing-strategy.md` (66 lines)
   - `.claude/rules/11-docs-and-bilingual.md` (53 lines)
   - `.claude/rules/12-ci-and-quality-gates.md` (85 lines)
   - `.claude/rules/13-backend-data-access-performance.md` (79 lines)
   - `.claude/rules/14-backend-module-boundaries.md` (66 lines)
   - `.claude/rules/15-backend-observability-ops.md` (80 lines)
   - `.claude/rules/16-backend-integrations.md` (93 lines)
4. **All 29 Repository Skills (`.claude/skills/<skill-name>/SKILL.md`)**:
   - `.claude/skills/api-contract-and-errors/SKILL.md`
   - `.claude/skills/backend-module-boundaries/SKILL.md`
   - `.claude/skills/backend-module-feature/SKILL.md`
   - `.claude/skills/backend-persistence-performance/SKILL.md`
   - `.claude/skills/brainstorming-before-building/SKILL.md`
   - `.claude/skills/ci-local-and-debug/SKILL.md`
   - `.claude/skills/dispatching-parallel-agents/SKILL.md`
   - `.claude/skills/docs-bilingual-update/SKILL.md`
   - `.claude/skills/executing-plans/SKILL.md`
   - `.claude/skills/external-system-integration-and-mock/SKILL.md`
   - `.claude/skills/flyway-migration-authoring/SKILL.md`
   - `.claude/skills/frontend-accessibility-audit/SKILL.md`
   - `.claude/skills/frontend-feature-slice/SKILL.md`
   - `.claude/skills/frontend-iconography/SKILL.md`
   - `.claude/skills/frontend-motion-design/SKILL.md`
   - `.claude/skills/frontend-taste-anti-slop/SKILL.md`
   - `.claude/skills/frontend-visual-design/SKILL.md`
   - `.claude/skills/handoff-to-team-lead/SKILL.md`
   - `.claude/skills/module-domain-knowledge/SKILL.md`
   - `.claude/skills/receiving-code-review/SKILL.md`
   - `.claude/skills/requesting-code-review/SKILL.md`
   - `.claude/skills/security-review-checklist/SKILL.md`
   - `.claude/skills/spring-security-rbac-endpoint/SKILL.md`
   - `.claude/skills/systematic-debugging/SKILL.md`
   - `.claude/skills/test-driven-development/SKILL.md`
   - `.claude/skills/using-rikkei-skills/SKILL.md`
   - `.claude/skills/verification-before-completion/SKILL.md`
   - `.claude/skills/writing-implementation-plans/SKILL.md`
   - `.claude/skills/writing-skills/SKILL.md`
5. **Survey Reports & Tool Configs**:
   - `<teamwork-state>/teamwork_explorer_survey_1/handoff.md` (Backend, DB/Flyway, Rules 01-16, 12 backend/process skills, H1/H2 root causes, agent-config baselines)
   - `<teamwork-state>/teamwork_explorer_survey_2/handoff.md` (Frontend, H3 root cause, Mock, Infra, E2E, CI, Docs, 17 FE/docs/process skills)
   - `.markdownlint-cli2.jsonc`, `cspell.json`, `scripts/tool-versions.env`, `check.ps1`, `docs/tt01/PHASE0_ACK.md`, `docs/ut02/PHASE0_ACK.md`

---

## 4. Why Mandatory Round Skills Apply (`PROMPT_NT05_EN.txt` §0 & `PROMPT_BASE_RULES_EN.txt` R1)

Precedence order: `PROMPT_NT05_EN.txt` (plus Team Lead Execution Notes & Stop Gate Decision `(A)`-`(F)`) > `PROMPT_BASE_RULES_EN.txt` > Enterprise Rules `01`-`16` > Repository Skills (`29`).

- **Always-Mandatory Bootstrap (`R1`)**:
  - `using-rikkei-skills`: Governs precedence resolution, on-demand skill loading per phase, and mandatory `Re-read:` logging before each change group.
- **18 Explicitly Mandatory Round Skills (`PROMPT_NT05_EN.txt` §0)**:
  - `external-system-integration-and-mock`: NT-05 calls `/lms/students/{id}/results`, `/exam/students/{id}/results`, and `/pm/students/{id}/internships` exclusively through `ExternalApiClient` (`X-Service-Key`, 5s timeout, 2 retries on network errors for NT-05 vs 2.5s fast-fail 0 retries preserved for TT-01), mapping all staff sync upstream errors to `503 EXTERNAL_UNAVAILABLE` and leaving `mock/data.json` untouched.
  - `flyway-migration-authoring`: Production migration `V25` evolves `external_records` (`source_key`, `payload` JSONB, `synced_at`, `UNIQUE(source, source_key)`, `#h<id>` backfill, no row deletion), adds H1 uniqueness safety net on `skill_evidences`, creates `manual_overrides` and `sync_runs` with indexes, keeps `V1..V24` immutable, and passes SQLFluff and V24->V25 upgrade tests.
  - `backend-module-feature`: Implements immutable Java `record` DTOs/commands, Jakarta `@Valid`, `Clock`-injected services, and REST controllers under `-Xlint:all -Werror`, Spotless AOSP, and SpotBugs.
  - `backend-module-boundaries`: Keeps `external_records`, `manual_overrides`, `sync_runs` inside `candidate` (D1), reads `users.lms_user_id` and candidate profiles strictly via `IdentityPublicService` immutable records, preserves DAG (`internship` -> `candidate`, never reverse), and updates Rule 14 / skill ownership docs.
  - `backend-persistence-performance`: Ensures HTTP calls stay outside `@Transactional`, enforces DB-level per-user serialization (`pg_advisory_xact_lock`) before reads/writes across all 5 write paths without nested `REQUIRES_NEW` under lock (Hikari max pool 10), avoids N+1 on overrides/staff names, and enforces 1-based pagination (`size` default 20, max 100).
  - `spring-security-rbac-endpoint`: Registers all 5 D10 endpoints in `RoutePolicyRegistry` (STAFF only) plus `@PreAuthorize("hasRole('STAFF')")` and verifies `401` and `403` across `CANDIDATE`, `HR`, `MENTOR`, `ADMIN`.
  - `api-contract-and-errors`: Enforces `/api/v1` paths, `PageResponse<T>`, unified `ErrorResponse(code, message)` (`400`/`404`/`503`), and complete OpenAPI annotations matching `test_openapi_docs.test.mjs` (`50` paths / `53` operations).
  - `module-domain-knowledge`: Preserves HS-01/TT-01 domain invariants, applies D3 normalization/upsert operations and D9 override-wins rules, records Open Business Question 6 resolution in `docs/05-open-business-questions.md` (EN + VI), and never invents unapproved rules.
  - `systematic-debugging`: Required for H1 (concurrent recompute duplication), H2 (concurrent first-time PM sync 409), and H3 (failed recompute wiping `SkillProfilePage`): reproduce RED first, localize root cause, fix without global exception swallowing.
  - `test-driven-development`: Enforces RED-first -> GREEN -> Refactor across H1/H2/H3, D2-D10 backend/frontend suites, deterministic `Clock` tests, latches/barriers concurrency tests on Testcontainers `postgres:18.6-alpine` (no `Thread.sleep`), and E2E suites.
  - `security-review-checklist`: Enforces `q` LIKE wildcard escaping (`GET /staff/sync/candidates`), override field/value/reason whitelist (D9), `staff_id` from `@AuthenticationPrincipal`, non-canonical `#h` PM override rejection (`400 VALIDATION_ERROR`), and PII/secret sanitization (`sync_runs.error` <= 500 chars, logs).
  - `frontend-feature-slice`: Structures `/staff/data-sync` under `frontend/src/features/` via `httpClient`, `AbortSignal`, lazy route + preloader, `PROTECTED_ROUTE_POLICIES`, 4 async states, and H3 state separation in `SkillProfilePage.tsx`.
  - `frontend-visual-design`: Enforces `--rj-*` design tokens only (zero raw hex/rgb, zero emoji), STAFF Dense mode (`36-38px` rows), `tabular-nums`, portal modal + `useScrollLock` (`--rj-z-*`), Light/Dark contrast parity, and Anti-AI rubric `>= 11/12`.
  - `frontend-accessibility-audit`: Enforces WCAG 2.2 AA on H3 (`role="alert"` + inline retry + focus handling) and `/staff/data-sync` (1 `<h1>`, `<label htmlFor>`, `aria-invalid`/`aria-describedby`, `role="dialog"` focus trap + `Escape` + focus restore, keyboard navigation, non-color-only status).
  - `frontend-taste-anti-slop`: Ensures authentic Vietnamese UI copy with full diacritics, `Động từ + Đối tượng` button labels, no internal jargon, `<= 2` nesting levels, and `scrollWidth <= innerWidth` at `375px`..`1440px`.
  - `docs-bilingual-update`: Delivers `docs/nt05/*`, `docs/05-open-business-questions.md` (Q6 EN+VI), `docs/hs-01-skill-profile.md` (H1 note EN+VI), ERD/architecture updates, `.gitignore`, `cspell.json`, Rule 05/10/14 baselines, and `sync-agent-config.mjs --check`.
  - `verification-before-completion`: Requires raw command outputs for every gate: clean Maven build, `./check.sh` & `.\check.ps1` (`26/26`), 20 consecutive Vitest runs (0 fail / 0 `act()`), live Docker Compose stack + `e2e/run-all.mjs` + `docker compose down -v`, and `/browser` verification.
  - `handoff-to-team-lead`: Keeps Git strictly READ-ONLY on `feature/t022c02-ket-noi-du-lieu`, leaves all changes uncommitted, cleans containers/volumes/temp files, and delivers Vietnamese final report with `T022C02:` English commit proposals.
- **Additional Repository Skills Applicable to NT-05 (`11` skills)**:
  - `brainstorming-before-building`, `writing-implementation-plans`, `executing-plans`, `dispatching-parallel-agents`, `frontend-motion-design`, `frontend-iconography`, `ci-local-and-debug`, `requesting-code-review`, `receiving-code-review`, and `writing-skills` (specifically for updating `agent-config/skills/backend-module-boundaries/SKILL.md` and `agent-config/skills/module-domain-knowledge/SKILL.md` per D1/D9 within the `<= 500`-line limit and syncing via `sync-agent-config.mjs`).

---

## 5. Table 1 — Concrete Constraints and Proof Methods for All 16 Rules

| Rule | Rule File | Concrete Constraint for Round `NT-05` (`T022C02`) | Proof Method |
|---|---|---|---|
| Rule 01 | `01-project-context.md` | Keep 9-package Modular Monolith, 5 roles, 20 standard skills, and pinned versions in `docs/03-version-table.md` without adding dependencies; use `T022C02:` prefix (overriding `T022DB0:`). | `node scripts/check-version-drift.mjs` exit 0; `git diff -- backend/pom.xml frontend/package.json mock/package.json` empty. |
| Rule 02 | `02-git-and-delivery.md` | Git strictly READ-ONLY (`status`, `diff`, `log`, `show` only); stay on `feature/t022c02-ket-noi-du-lieu` with `HEAD` at `17b1ae8`; leave all edits uncommitted; propose English `T022C02:` commits. | `git branch --show-current`, `git log -n 1 --pretty=short`, `git diff --cached --name-only` empty, `git status --short`. |
| Rule 03 | `03-safety-and-secrets.md` | Write only inside `rikkei-jobs` (temp files only in OS temp and deleted); keep `Tai lieu du an`, `.agents`, `.vscode`, `.env`, `*.pem`, `mock/data.json` untouched; never leak `X-Service-Key` or machine paths; keep `ddl-auto: none`. | Gate 8.1/8.3 PASS (`check.ps1` / `check.sh`), `git status` clean of `.env`/temp files, `docker compose down -v` leaves 0 `rikkei` containers/volumes. |
| Rule 04 | `04-honest-verification.md` | Report PASS only after real execution with exit code 0 and raw stdout/stderr; mark anything unexecuted `NOT VERIFIED`; zero `console.log`/`System.out.println`/`TODO`/`FIXME`/static sleeps. | Raw outputs in handoff & `docs/nt05/PR_DESCRIPTION.md`; `./check.sh` and `.\check.ps1` 26/26 PASS. |
| Rule 05 | `05-backend-java.md` | Application code is in scope per `PROMPT_NT05_EN.txt` §0; Java 25 LTS (`-Xlint:all -Werror`), immutable `record` DTOs/commands, zero `@Entity` in controllers, `ErrorResponse`, Spotless AOSP, SpotBugs, `open-in-view: false`; update baseline in `agent-config/rules/05-backend-java.md` from `1410/92`. | `./mvnw spotless:check spotbugs:check clean test-compile test` exit 0; `sync-agent-config.mjs --check` PASS. |
| Rule 06 | `06-database-flyway.md` | Keep `V1..V24` immutable; add odd production migration `V25__*.sql` (`TIMESTAMPTZ`, `BIGSERIAL`/`BIGINT IDENTITY`, `snake_case`, intra-module FK only, `.sqlfluff` clean, zero row deletion in `external_records`, zero dev seed in `V25`). | SHA-256 unchanged on `V1..V24`; SQLFluff exit 0; V24->V25 upgrade test + `FlywayMigrationIntegrationTest` + migration tests (Stop Gate `(E)`) PASS. |
| Rule 07 | `07-security-rbac.md` | Register all 5 D10 routes in `RoutePolicyRegistry` (`STAFF` only) + `@PreAuthorize("hasRole('STAFF')")` (`EXISTS`: deny-by-default filter chain, `OwnershipGuard`, `401`/`403` `ErrorResponse`, `ProdEnvironmentValidator`). | Integration/WebMvc tests verifying `401` (no token) and `403` (`CANDIDATE`, `HR`, `MENTOR`, `ADMIN`) across all 5 D10 endpoints. |
| Rule 08 | `08-frontend-engineering.md` | TypeScript strict (zero `any`/`@ts-ignore`), vertical slice under `frontend/src/features/`, all calls via `httpClient` + `AbortSignal`, tokens in memory only, lazy route in `App.tsx`, WCAG 2.2 AA. | `npm --prefix frontend run lint`, `typecheck`, `build`, and Vitest tests PASS. |
| Rule 09 | `09-frontend-design-bar.md` | Zero emoji, 100% `<Icon name=... />` (24px, stroke 2), `--rj-*` tokens only, STAFF Dense mode (`36-38px` rows, micro `<= 150ms`), `prefers-reduced-motion`, `CLS = 0`, WCAG 2.2 AA Light/Dark, Anti-AI rubric `>= 11/12`. | `node scripts/compute-contrast.mjs` PASS; zero emoji/hex scan; `/browser` measurements at `375/768/1024/1440` Light & Dark. |
| Rule 10 | `10-testing-strategy.md` | TDD RED->GREEN for H1/H2/H3 and D3-D10; Testcontainers `postgres:18.6-alpine` + injectable `Clock` + latches/barriers (no `Thread.sleep`/`setTimeout`); no unapproved assertion changes outside Stop Gate `(A)`-`(F)`; update Rule 10 baselines (`1410/92`, `602/50`, `30/359/2369`). | Raw RED & GREEN logs; 20 consecutive Vitest runs (`--reporter=verbose`, 0 fail, 0 `act()`); `node e2e/run-all.mjs` PASS. |
| Rule 11 | `11-docs-and-bilingual.md` | Author `docs/nt05/*` (`PHASE0_ACK.md`, `README.md`, `PR_DESCRIPTION.md`, `BROWSER_OBSERVATIONS.md`), update `docs/05-open-business-questions.md` (Q6 EN+VI), `docs/hs-01-skill-profile.md` (H1 EN+VI), ERD/architecture docs, full Vietnamese diacritics, `cspell.json`. | `markdownlint-cli2`, `cspell`, and `node scripts/check-version-drift.mjs` exit 0. |
| Rule 12 | `12-ci-and-quality-gates.md` | Add zero new quality gates; keep exact parity (`29` definitions, `26` active runtime gates, `3` fallbacks, `23` CI checks, `25` Docker CI gates); never run `scripts/run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs`, `./check.sh`, and `.\check.ps1` all 26/26 PASS. |
| Rule 13 | `13-backend-data-access-performance.md` | Keep `open-in-view: false`, `ddl-auto: none`, Hikari `maximum-pool-size: 10`; never call `ExternalApiClient` inside `@Transactional`; acquire per-user advisory lock at start of tx without nested `REQUIRES_NEW`; `@Transactional(readOnly = true)` for reads; batch-load overrides/staff (no N+1); 1-based pagination (`size` <= 100). | Concurrency tests (12 parallel recompute, 10 parallel `GET /me/internships`, 10 parallel manual syncs) + pagination/query-count checks PASS. |
| Rule 14 | `14-backend-module-boundaries.md` | Keep `external_records`, `manual_overrides`, `sync_runs` in `candidate`; zero cross-module FKs or SQL `JOIN`s; read `identity` data strictly via `IdentityPublicService` immutable records; keep `internship` -> `candidate` DAG; update Rule 14 (`EXISTS`) + sync. | `V25` has zero FKs to `users`/`skills`; compile & package audit clean; `sync-agent-config.mjs --check` PASS. |
| Rule 15 | `15-backend-observability-ops.md` | Parameterized SLF4J only; never log PII, `X-Service-Key`, JWT, or payloads; sanitize `sync_runs.error` (`<= 500` chars, no secrets/URL queries/stack traces/PII); preserve ECS JSON prod logs & minimal Actuator (`health,info`, `show-details: never`). | Unit/integration assertions on `sync_runs.error` sanitization & logs; `ActuatorHealthTest` PASS. |
| Rule 16 | `16-backend-integrations.md` | Route LMS, Exam, and PM calls via `ExternalApiClient` (`X-Service-Key`, 5s timeout + 2 network retries for all 3 NT-05 endpoints; keep 2.5s fast-fail 0 retries for TT-01 read flow only); bounded `rikkei-sync-` executor (D8); cross-instance lock on nightly job (D7); OpenAPI `@Tag`/`@Operation`/`@ApiResponses`. | `ExternalApiClientIntegrationTest`, `OpenApiCoverageIntegrationTest`, `test_openapi_docs.test.mjs`, and live mock-down/pause proofs. |

---

## 6. Table 2 — Concrete Constraints and Proof Methods for All 29 Skills

| # | Skill Name | Applicability | Concrete Constraint for Round `NT-05` (`T022C02`) | Proof Method |
|---|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory (`R1`) | Enforce precedence (`PROMPT_NT05_EN.txt` + Team Lead notes > `PROMPT_BASE_RULES_EN.txt` > Rules `01`-`16` > Skills); load per phase and append `Re-read:` entries before every change group. | `docs/nt05/PHASE0_ACK.md` created pre-edit + `Re-read:` lines before each change group. |
| 2 | `external-system-integration-and-mock` | Mandatory (`§0`) | Call `/lms/students/{id}/results`, `/exam/students/{id}/results`, `/pm/students/{id}/internships` via `ExternalApiClient` (`5s` + `2` retries for NT-05; `2.5s` fast-fail for TT-01 read); `[]` is `200`; translate all staff sync upstream failures (including `401`) to `503 EXTERNAL_UNAVAILABLE`; keep `mock/data.json` untouched. | `ExternalApiClientIntegrationTest`, staff sync mock-down/401/500/timeout tests, `node mock/test-runner.js`, live `docker compose cp` + `/mock/reload` proof. |
| 3 | `flyway-migration-authoring` | Mandatory (`§0`) | Author odd production `V25` (no `V1..V24` edits, no dev seed in `V25`, `TIMESTAMPTZ`, `BIGSERIAL`/`IDENTITY`, intra-module FKs only, SQLFluff clean, no `external_records` row deletions). | SHA-256 unchanged on `V1..V24`; SQLFluff exit 0; V24->V25 upgrade test with duplicate PM & evidences PASS. |
| 4 | `backend-module-feature` | Mandatory (`§0`) | Use immutable Java `record` DTOs/commands (preserve 3-arg `PmInternshipResultCommand` constructor per Stop Gate `(B)`), `@Valid`, injected `Clock`, zero `@Entity` in controllers, `-Xlint:all -Werror`, Spotless, SpotBugs. | `./mvnw spotless:check spotbugs:check clean test-compile test` exit 0. |
| 5 | `backend-module-boundaries` | Mandatory (`§0`) | Keep `external_records`, `manual_overrides`, `sync_runs` in `candidate`; extend `IdentityPublicService` with immutable records; zero cross-module repo/entity imports; preserve `internship` -> `candidate` DAG; update `agent-config/skills/backend-module-boundaries/SKILL.md`. | `V25` & `candidate` import audit clean; `sync-agent-config.mjs --check` PASS. |
| 6 | `backend-persistence-performance` | Mandatory (`§0`) | Fetch HTTP outside `@Transactional`; acquire per-user advisory lock before reads/writes across all 5 write paths (no nested `REQUIRES_NEW` under lock); batch-load overrides + staff names; B-Tree indexes on `manual_overrides` and `sync_runs`; 1-based pagination (`max 100`). | Concurrency stress tests (12/10/10 threads on Hikari max 10), query/pagination tests, and V25 index inspection PASS. |
| 7 | `spring-security-rbac-endpoint` | Mandatory (`§0`) | Register all 5 D10 endpoints in `RoutePolicyRegistry` (`STAFF` only) and `@PreAuthorize("hasRole('STAFF')")`. | Integration/WebMvc security tests verifying `401` (anon) and `403` (`CANDIDATE`, `HR`, `MENTOR`, `ADMIN`) for all 5 endpoints. |
| 8 | `api-contract-and-errors` | Mandatory (`§0`) | Expose `/api/v1` endpoints, `PageResponse<T>`, `ErrorResponse(code, message)` (`400`/`404`/`503`), and full OpenAPI `@Operation`/`@ApiResponses` (`50` paths / `53` operations per Stop Gate `(D)`). | `OpenApiCoverageIntegrationTest` and `e2e/tier1-features/test_openapi_docs.test.mjs` PASS. |
| 9 | `module-domain-knowledge` | Mandatory (`§0`) | Implement D3 normalization, D4 freshness invariant, D9 source-scale override rules, non-canonical `#h` PM `400 VALIDATION_ERROR`, and Q6 resolution in `docs/05-open-business-questions.md` + `agent-config/skills/module-domain-knowledge/SKILL.md`. | Unit/integration tests for D3/D4/D9 (including Stop Gate `(A)`/`(B)`) + unchanged `candidate1` HS-01 baselines (`13` skills, `JAVA 79.07`, `84.21`). |
| 10 | `systematic-debugging` | Mandatory (`§0`) | Diagnose and fix H1, H2, H3 at root cause (DB advisory lock + partial unique index safety net; separated recompute error state in `SkillProfilePage`) without swallowing exceptions or guessing. | Raw RED reproduction outputs + root-cause notes + raw GREEN verification outputs. |
| 11 | `test-driven-development` | Mandatory (`§0`) | Write failing tests first (RED) for H1, H2, H3 and D2-D10 behaviors before production fixes; use Testcontainers `postgres:18.6-alpine`, `Clock`, latches/barriers (zero `Thread.sleep`/`setTimeout`); obey Stop Gate `(A)`-`(F)`. | Raw RED -> GREEN logs; backend, frontend, and E2E suites all green. |
| 12 | `security-review-checklist` | Mandatory (`§0`) | Escape SQL LIKE wildcards in `q`; validate override field whitelist, scale, and `reason`; derive `staff_id` from `@AuthenticationPrincipal`; reject `#h` PM override (`400`); sanitize `sync_runs.error` and logs (zero PII/keys). | Security/validation unit & integration tests (`%`/`_`, invalid field, `#h`, log sanitization) + secret scan gate PASS. |
| 13 | `frontend-feature-slice` | Mandatory (`§0`) | Build `/staff/data-sync` under `frontend/src/features/` via `httpClient` + `AbortSignal`, lazy route + preloader, `PROTECTED_ROUTE_POLICIES`, strict TypeScript (zero `any`), race-safe state, and fix H3 in `SkillProfilePage.tsx`. | `npm --prefix frontend run lint`, `typecheck`, `build`, and 20 consecutive Vitest runs (0 fail, 0 `act()`). |
| 14 | `frontend-visual-design` | Mandatory (`§0`) | Use `--rj-*` tokens only (zero raw hex/rgb, zero emoji), STAFF Dense mode (`36-38px` rows), `tabular-nums`, `"Sửa tay"` dialog via `createPortal` + `useScrollLock(true)` + `--rj-z-*`, Light/Dark parity, Anti-AI rubric `>= 11/12`. | `compute-contrast.mjs`, `overlayLayeringContract.test.ts`, and `/browser` measurements at `375/768/1024/1440` Light & Dark. |
| 15 | `frontend-accessibility-audit` | Mandatory (`§0`) | Enforce WCAG 2.2 AA: H3 `role="alert"` inline retry + focus handling; `/staff/data-sync` 1 `<h1>`, `<label htmlFor>`, `aria-invalid`/`aria-describedby`, dialog Tab trap + `Escape` + focus restore, non-color-only status (`icon + text`). | Vitest a11y/focus assertions + `/browser` keyboard-only (`Tab`/`Shift+Tab`/`Enter`/`Space`/`Escape`) walkthrough PASS. |
| 16 | `frontend-taste-anti-slop` | Mandatory (`§0`) | Use authentic Vietnamese diacritics, `Động từ + Đối tượng` CTAs, source-scale hints, `<= 2` nesting levels, `.rec-table-scroll` (`scrollWidth <= innerWidth` at `375px`), and no candidate UI changes beyond H3. | Vietnamese UI copy audit + `/browser` responsive overflow check (`375/768/1024/1440`) PASS. |
| 17 | `docs-bilingual-update` | Mandatory (`§0`) | Deliver `docs/nt05/*`, `docs/05-open-business-questions.md` (Q6 EN+VI), `docs/hs-01-skill-profile.md` (H1 EN+VI), ERD/architecture docs, `.gitignore` (`docs/nt05/pr-screenshots/`), `cspell.json`, Rule 05/10/14 + skill sync. | `markdownlint-cli2`, `cspell`, `check-version-drift.mjs`, `sync-agent-config.mjs --check`, `validate-agent-config.mjs` exit 0. |
| 18 | `verification-before-completion` | Mandatory (`§0`) | Run every check on final workspace state: clean Maven build, `./check.sh` & `.\check.ps1` (`26/26`), 20 consecutive Vitest runs, fresh `docker compose up -d --build --wait` + `e2e/run-all.mjs` + live criteria 1-5 & concurrency/on-open + `docker compose down -v`, and `/browser`. | Verbatim raw outputs, exit codes, psql row counts, screenshots, and explicit `NOT VERIFIED` if any check could not run. |
| 19 | `handoff-to-team-lead` | Mandatory (`§0`) | Keep Git strictly READ-ONLY on `feature/t022c02-ket-noi-du-lieu`; leave changes uncommitted; tear down all containers/volumes/temp files; write Vietnamese report with `T022C02:` English commit proposals and Stop Gate assertion diff list. | `git status --short`, `git diff --cached --name-only` empty, `docker ps -a`/`volume ls`/`network ls` clean, complete final report. |
| 20 | `brainstorming-before-building` | Applies (`R1`) | Evaluate D1-D11 & H1-H3 design choices (e.g., per-user `pg_advisory_xact_lock` namespace, freshness timestamp/version guard, frontend slice placement) without inventing business rules. | Design decisions documented in survey handoffs, implementation plan, and `docs/nt05/README.md`. |
| 21 | `writing-implementation-plans` | Applies (`R1`) | Break Round NT-05 into verifiable milestones (`M0` ACK -> `M1` H1/H2/V25 -> `M2` Sync/Jobs/APIs -> `M3` H3 + FE -> `M4` E2E/Docs/Baselines -> `M5` Gates/Live/Browser). | Milestone plan with exact file paths, Stop Gate `(A)`-`(F)` guardrails, and per-step verification commands. |
| 22 | `executing-plans` | Applies (`R1`) | Execute milestones in dependency order, append `Re-read:` lines before every change group, halt immediately on any stop gate outside `(A)`-`(F)`, and track `progress.md` UTC heartbeats. | Step-by-step milestone handoffs with raw outputs and `## Re-read Log` entries in `docs/nt05/PHASE0_ACK.md`. |
| 23 | `dispatching-parallel-agents` | Applies (`R1`) | Keep parallel workers disjoint in file write ownership, isolate Teamwork metadata strictly in external scratch state folders (zero Teamwork files in `rikkei-jobs`), and verify every worker claim independently. | `git status` shows zero `.agents/teamwork/` artifacts in repo; audited worker outputs match raw command runs. |
| 24 | `frontend-motion-design` | Applies (`R1`) | Keep Dense mode micro-interactions `<= 150ms`, `"Sửa tay"` dialog `<= 300ms`, compositor-only (`transform`, `opacity`), `@media (prefers-reduced-motion: reduce)` (`0.001ms` / `100ms`), and `CLS = 0`. | CSS inspection + `/browser` visual/layout stability check PASS. |
| 25 | `frontend-iconography` | Applies (`R1`) | Render 100% of icons via `<Icon name=... />` (`24x24`, `strokeWidth="2"`, `currentColor`), adding `'search'` (and any needed icon) cleanly to `Icon.tsx` + `Icon.test.tsx`, with zero raw `<svg>` in features and `aria-label` on icon-only buttons. | `Icon.test.tsx` + JSX audit showing zero inline `<svg>` or emojis in feature slices. |
| 26 | `ci-local-and-debug` | Applies (`R1`) | Run `./check.sh` and `.\check.ps1` (`26/26`, identical), `sqlfluff`, and fresh Docker Compose stack E2E (`docker compose down -v` afterwards), while never running `scripts/run-ci-in-docker.*`. | Raw `26/26` PASS transcripts from both `./check.sh` and `.\check.ps1` + clean `docker ps -a` / `volume ls`. |
| 27 | `requesting-code-review` | Applies (`R1`) | Self-audit full `git diff` against D1-D11, H1-H3, Anti-AI rubric, and Stop Gate `(A)`-`(F)` before authoring `docs/nt05/PR_DESCRIPTION.md`. | `docs/nt05/PR_DESCRIPTION.md` complete with hand calculation, acceptance table, screenshots, and assertion-change log. |
| 28 | `receiving-code-review` | Applies (`R1`) | Apply Team Lead Stop Gate Decision `(A)`-`(F)` and mandatory R4 correction literally without altering any unapproved assertions or out-of-scope behavior. | Final assertion diff list matches `(A)`-`(F)` exclusively; zero unapproved changes. |
| 29 | `writing-skills` | Applies (`D1`/`D9`) | Update `agent-config/skills/backend-module-boundaries/SKILL.md` and `agent-config/skills/module-domain-knowledge/SKILL.md` (`<= 500` lines, zero emoji, LF UTF-8, valid paths) for D1/D9 and sync via `scripts/sync-agent-config.mjs`. | `node scripts/sync-agent-config.mjs --check` and `node scripts/validate-agent-config.mjs` exit 0. |

---

## 7. Re-read Log

<!-- Append one line before every new change group: Re-read: <rule numbers and skill names>, before <change group> -->
Re-read: 01, 02, 03, 04, 05, 06, 10, 12, 13, 14, flyway-migration-authoring, backend-module-boundaries, backend-persistence-performance, systematic-debugging, test-driven-development, writing-skills, before M1 (V25 migration, D1 agent-config, H1 and H2 fixes)
Re-read: 01, 02, 03, 04, 05, 07, 10, 11, 13, 14, 15, 16, external-system-integration-and-mock, backend-module-feature, backend-module-boundaries, backend-persistence-performance, spring-security-rbac-endpoint, api-contract-and-errors, module-domain-knowledge, test-driven-development, security-review-checklist, before M2 (backend sync engine, unified normalizer, jobs, overrides, STAFF APIs)
Re-read: 01, 02, 03, 04, 08, 09, 10, 11, frontend-feature-slice, frontend-visual-design, frontend-motion-design, frontend-iconography, frontend-accessibility-audit, frontend-taste-anti-slop, systematic-debugging, test-driven-development, before M3 (frontend H3 fix and /staff/data-sync)
Re-read: 01, 02, 03, 04, 05, 06, 10, 11, 12, docs-bilingual-update, ci-local-and-debug, verification-before-completion, requesting-code-review, handoff-to-team-lead, before M4 (E2E suites, documentation, agent-config baselines, full verification gates)
Re-read: 01, 02, 03, 04, 11, 12, docs-bilingual-update, verification-before-completion, handoff-to-team-lead, before M4-final (BROWSER_OBSERVATIONS, PR_DESCRIPTION, docker teardown, final gates)

---

## NT-05-fix — Phase 0 Acknowledgement

- Round: `NT-05-fix` (`T022C02`) — Fix defects `F1`-`F12` reproduced during Team Lead review of uncommitted `NT-05` work
- Precedence: `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_NT05_EN.txt` (`D1`-`D11`) > `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (`R0`-`R3`) > `.claude/rules/01..16` > Repository Skills
- Encoding & Line Endings: UTF-8 without BOM, LF (`\n`), zero emoji

### 1. Starting Git State & SHA-256 Immutability Anchors

- Active branch: `feature/t022c02-ket-noi-du-lieu`
- Base `HEAD`: `17b1ae8` (`17b1ae8704d3e0a2cb36053d533c8616b326d5c8`)
- Uncommitted working tree baseline (`git status --porcelain -uall`): `117` entries (`73` modified `M`, `44` untracked `??`), all preserved untouched prior to `NT-05-fix` edits.
- Complete SHA-256 baseline manifest: `139` unique files (`117` from `git status --porcelain -uall`, `22` files under `backend/src/main/resources/db/` across `migration/` and `migration-dev/`, plus `mock/data.json`) captured in `<teamwork-scratch>/teamwork_worker_phase0/phase0_sha256_baseline.md` before any edit.
- Key immutability SHA-256 anchors (must remain byte-identical through completion):
  - `backend/src/main/resources/db/migration/V25__nt05_external_sync.sql`: `70909848963f872d0efaf5c59e4af1ab8d7275d7f7a133ecc81d9552fa35f650` (`6664` bytes)
  - `mock/data.json`: `36ea41fba86b3e062235b4badeca72a2ddeb0ebdc731a43f176bc7379e80b188` (`6819` bytes)
  - All older Flyway migrations `V1..V24` (`12` files in `migration/`, `9` files in `migration-dev/`): hashed in `phase0_sha256_baseline.md` and locked immutable.

### 2. Mandatory Working Method (Verbatim from `PROMPT_BASE_RULES_EN.txt` R1)

> "Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi."

### 3. Files Read Before Any `NT-05-fix` Edit

1. **Binding Prompts & Request**:
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (`R0`-`R3`, lines `1`-`54`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_EN.txt` (`D1`-`D11`, sections `0`-`10`, lines `1`-`199`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX_EN.txt` (`F1`-`F12`, gates `(H)`-`(I)`, lines `1`-`100`)
   - `<teamwork-state>/ORIGINAL_REQUEST.md` (lines `1`-`60`)
2. **Root Agent Entrypoints**:
   - `CLAUDE.md` (`47` lines), `GEMINI.md` (`61` lines), `AGENTS.md` (`44` lines)
3. **All 16 Enterprise Rules (`.claude/rules/`)**:
   - `01-project-context.md` (`94` lines), `02-git-and-delivery.md` (`90` lines), `03-safety-and-secrets.md` (`70` lines), `04-honest-verification.md` (`59` lines)
   - `05-backend-java.md` (`83` lines), `06-database-flyway.md` (`73` lines), `07-security-rbac.md` (`78` lines), `08-frontend-engineering.md` (`79` lines)
   - `09-frontend-design-bar.md` (`79` lines), `10-testing-strategy.md` (`66` lines), `11-docs-and-bilingual.md` (`53` lines), `12-ci-and-quality-gates.md` (`85` lines)
   - `13-backend-data-access-performance.md` (`79` lines), `14-backend-module-boundaries.md` (`66` lines), `15-backend-observability-ops.md` (`80` lines), `16-backend-integrations.md` (`93` lines)
4. **Applicable Skills Read in Full (`.claude/skills/<name>/SKILL.md`)**:
   - `using-rikkei-skills`, `test-driven-development`, `systematic-debugging`, `backend-module-feature`, `backend-module-boundaries`, `backend-persistence-performance`, `spring-security-rbac-endpoint`, `api-contract-and-errors`, `external-system-integration-and-mock`, `security-review-checklist`, `frontend-feature-slice`, `frontend-visual-design`, `frontend-accessibility-audit`, `frontend-taste-anti-slop`, `ci-local-and-debug`, `docs-bilingual-update`, `verification-before-completion`, `handoff-to-team-lead`, `module-domain-knowledge`, `flyway-migration-authoring`, `frontend-motion-design`, `frontend-iconography`, `requesting-code-review`, `receiving-code-review`.

### 4. Concrete Constraints for Rules `01`-`16` (`NT-05-fix`)

| Rule | Concrete Constraint for `NT-05-fix` |
|---|---|
| `01-project-context.md` | Keep 9-package Modular Monolith, 5 roles, pinned versions in `docs/03-version-table.md`, zero new dependencies, and `T022C02:` prefix. |
| `02-git-and-delivery.md` | Git strictly READ-ONLY on `feature/t022c02-ket-noi-du-lieu` (`HEAD` `17b1ae8`); keep all existing `NT-05` edits intact; propose `T022C02:` commits in English. |
| `03-safety-and-secrets.md` | Never read or print `.env` or `*.pem`; write only inside `rikkei-jobs`; keep `mock/data.json` unchanged; clean all temp files and Docker resources. |
| `04-honest-verification.md` | Report PASS only from real commands exiting `0` with raw stdout/stderr; mark any unexecuted item `NOT VERIFIED`; zero `console.log`/`System.out.println`/`TODO`. |
| `05-backend-java.md` | Java 25 (`-Xlint:all -Werror`), Spotless AOSP, SpotBugs clean; single constructor per bean (`F11`); update `05-backend-java.md` test count baseline from `1441/101`. |
| `06-database-flyway.md` | Zero edits to `V1..V25` (verified by SHA-256); verify `F12` foreign key catalog count against a fresh PostgreSQL `18.6-alpine` instance. |
| `07-security-rbac.md` | Preserve `STAFF`-only RBAC on all 5 D10 routes and `CANDIDATE` auth on `GET /me/skills` and `GET /me/internships`; keep `401`/`403` contracts intact. |
| `08-frontend-engineering.md` | TypeScript strict (zero `any`/`@ts-ignore`); `httpClient` + `AbortSignal`; preserve loaded data on reload/error (`F2`), per-candidate sync (`F3`), dialog focus (`F4`). |
| `09-frontend-design-bar.md` | Zero emoji, `--rj-*` tokens only, STAFF Dense mode (`36-38px` rows), replace undefined `rj-section-title` (`F6`), wrap long values (`F5`), non-hover run error access (`F7`). |
| `10-testing-strategy.md` | RED then GREEN for `F1`-`F5` and `F7`-`F10`; only gate `(H)`/`(I)` or new `NT-05` test adaptations allowed; 20 consecutive Vitest runs (`0` fail, `0` `act()`); update baselines in Rule 10. |
| `11-docs-and-bilingual.md` | Fix `F12` inaccuracies in place (`docs/01-architecture-overview.md`, `docs/nt05/README.md`, `docs/nt05/PR_DESCRIPTION.md`, `docs/erd/README.md`); append `NT-05-fix` sections cleanly; `markdownlint-cli2` + `cspell` exit `0`. |
| `12-ci-and-quality-gates.md` | Add zero new quality gates; pass clean Maven build, `./check.sh` and `.\check.ps1` identically (`26/26`); never invoke `scripts/run-ci-in-docker.*`. |
| `13-backend-data-access-performance.md` | Remove null-lock fallbacks (`F11`) so per-user DB advisory lock always executes inside transaction; keep HTTP outside `@Transactional` and Hikari pool `10`. |
| `14-backend-module-boundaries.md` | Keep `ExternalRecordNormalizer` and `CandidatePublicServiceImpl` boundary contracts intact; pass raw PM source JSON through `PmInternshipResultCommand` without cross-module repo/entity leaks (`F1`). |
| `15-backend-observability-ops.md` | Log unexpected errors once at `ERROR` with stack trace and expected upstream/validation errors at `WARN` without stack across all triggers (`F8`), proving zero PII/key/payload/DB-detail leak; eliminate spurious `F10` warnings. |
| `16-backend-integrations.md` | Keep `ExternalApiClient` `5s` + `2` retries for `NT-05` and `2.5s` fast-fail for `TT-01` (`F1`); keep staff sync upstream errors mapped to `503 EXTERNAL_UNAVAILABLE` (`F8`). |

### 5. Applicable Skills for `NT-05-fix` and Why

- **Process & Verification (`R1`)**:
  - `using-rikkei-skills`: Governs precedence, per-change-group `Re-read:` logging, and skill routing.
  - `test-driven-development`: Mandates RED-first failing tests before production fixes for `F1`-`F5` and `F7`-`F10`.
  - `systematic-debugging`: Guides root-cause isolation for payload flipping (`F1`), focus loss (`F2`, `F4`), shared busy state (`F3`), swallowed exceptions (`F8`), and `BigDecimal`/control-char validation (`F9`).
  - `receiving-code-review`: Governs disciplined triage and literal resolution of Team Lead review defects `F1`-`F12` within authorized gates `(H)` and `(I)`.
  - `requesting-code-review` & `verification-before-completion`: Require self-audit of diffs and raw output evidence across Maven, `check.sh`, `check.ps1`, 20 Vitest runs, Docker E2E, live `psql`, and `/browser`.
  - `ci-local-and-debug`: Governs clean Maven build and `26/26` local parity checks without using `scripts/run-ci-in-docker.*`.
  - `handoff-to-team-lead`: Enforces Git read-only state, teardown (`docker compose down -v`), and Vietnamese final dossier with `T022C02:` commit proposals.
- **Backend & Integration (`F1`, `F8`, `F9`, `F10`, `F11`)**:
  - `external-system-integration-and-mock`: Governs preserving raw PM source JSON (`F1`), TT-01 fast-fail/fallback/retention, and `mock/data.json` immutability.
  - `backend-module-feature` & `backend-module-boundaries`: Govern single-constructor DI (`F11`), `ObjectMapper` bean injection, removing dead `ExternalRecord.updateResult`, and extending `PmInternshipResultCommand` cleanly (`F1`).
  - `backend-persistence-performance`: Ensures mandatory per-user advisory lock (`F11`) and zero redundant `TT-01` writes/recomputes when PM source JSON is unchanged (`F1`).
  - `api-contract-and-errors` & `security-review-checklist`: Govern `400 VALIDATION_ERROR` with Vietnamese messages on `F9` (`attendanceRate`/`homeworkRate` scale `<= 2`, control chars, extreme scientific notation), preserving `503` on `F8`, and preventing PII/DB-detail log leaks (`F8`).
  - `spring-security-rbac-endpoint`: Ensures `RBAC` and error handlers remain unchanged while fixing `F8` and `F9`.
  - `module-domain-knowledge`: Preserves `D3` normalization, `D8` on-open eligibility (`F10`), and `D9` override semantics (`F9`).
  - `flyway-migration-authoring`: Verifies `V1..V25` remain byte-identical and provides fresh catalog verification for `F12` FK counts.
- **Frontend & Accessibility (`F2`-`F7`)**:
  - `frontend-feature-slice`: Fixes `F2` (stale/busy row retention without discarding data or flashing empty state) and `F3` (per-candidate busy state and targeted announcements).
  - `frontend-visual-design` & `frontend-taste-anti-slop`: Fix `F5` (clean wrapping at `375`/`768`/`1024`/`1440` px) and `F6` (replace undefined `rj-section-title` with a new `.ds-section-title` heading class created in `staffDataSync.css` using design-system tokens).
  - `frontend-accessibility-audit`: Fixes `F2` (focus preservation on pagination/filter controls), `F4` (focus inside dialog + `role="alert"` announcement on errors), and `F7` (keyboard & touch access to full run error text without hover).
  - `frontend-motion-design` & `frontend-iconography`: Ensure Dense mode transitions and `<Icon />` usage remain compliant while fixing `F2`-`F7`.
- **Documentation (`F12`)**:
  - `docs-bilingual-update`: Fixes inaccurate method names, lock key description, mapping status, and ERD FK catalog counts across EN/VI docs (`F12`), plus `PHASE0_ACK.md`, `PR_DESCRIPTION.md`, and `BROWSER_OBSERVATIONS.md` updates.

### 6. Proof Plan for Defects `F1`-`F12`

| Defect | Proof Type | Concrete Verification Method |
|---|---|---|
| `F1` | RED -> GREEN + Live `psql` + E2E | Failing stubbed integration test showing PM payload timestamp flip & extra unknown field drop -> fix `InternshipPersistenceServiceImpl` + `ExternalRecordNormalizer` + `PmInternshipResultCommand` (Gate `(H)`) -> alternating `NT-05` sync and `TT-01` read produces `0` payload/title/score/`recorded_at`/`synced_at` changes, `0` recompute, `pm updated=0`; verify live with `psql` and new E2E test. |
| `F2` | RED -> GREEN + `/browser` | Failing Vitest assertions on `StaffDataSyncPage` losing rows on error, dropping focus to `BODY` on pagination, and flashing empty state -> fix state separation & focus retention -> GREEN across 20 Vitest runs + `/browser` with `docker stop rikkei-backend` and `> 20` real sync runs. |
| `F3` | RED -> GREEN + `/browser` | Failing Vitest test syncing candidate A while selecting candidate B -> per-candidate `syncBusyByCandidate` state map and `syncInFlightIdsRef` ref -> GREEN across 20 Vitest runs + `/browser` with `docker pause rikkei-mock`. |
| `F4` | RED -> GREEN + `/browser` | Failing Vitest test saving override with 504/400/404/409/503/network error losing focus to `BODY` -> move focus inside dialog & announce `role="alert"` while preserving focus trap/Escape/restore -> GREEN + `/browser` (`docker stop rikkei-backend`). |
| `F5` | RED -> GREEN + `/browser` | Failing Vitest/CSS layout assertion + `/browser` overflow check with 200-char title & 480-char spaceless reason -> apply CSS wrapping rules (`overflow-wrap: anywhere` / `word-break: break-word` where needed) -> `scrollWidth <= clientWidth` at `375`/`768`/`1024`/`1440` px in Light & Dark modes. |
| `F6` | Before -> After + Test | Capture DOM computed heading style & undefined class before -> replace `rj-section-title` with new `.ds-section-title` heading class created in `staffDataSync.css` (using design-system tokens, not a pre-existing class) + add Vitest CSS class definition check -> capture after + `/browser` visual check. |
| `F7` | RED -> GREEN + `/browser` | Failing Vitest a11y test for truncated error readable only via `title` -> add keyboard & touch expandable/readable error control preserving dense row height -> GREEN + `/browser` keyboard/touch walkthrough at `375`-`1440` px. |
| `F8` | RED -> GREEN + Log Capture | Failing tests proving unexpected non-upstream exception lacks `ERROR` + stack trace across `ExternalSyncService`, `OnOpenSyncService`, `NightlySyncJob`, `SkillProfileController`, and DB error detail leakage check -> fix logging levels & sanitization -> GREEN proving `ERROR` + stack once, `WARN` without stack for expected failures, zero PII/key/payload/DB-detail leak, HTTP `503` preserved. |
| `F9` | RED -> GREEN + Live + E2E | Failing integration tests for `attendanceRate`/`homeworkRate` > 2 decimals, `"1e-100000"`, `"1e-1000"`, NUL/control chars returning `409`/`200` -> enforce validation returning `400 VALIDATION_ERROR` with Vietnamese message & zero DB write -> GREEN + live requests + E2E coverage. |
| `F10` | RED -> GREEN + Live Log Count | Failing `OnOpenSyncServiceTest` / controller test showing background task submitted & warning logged when `lmsUserId` is null/blank -> short-circuit before executor submission & warning -> GREEN + live 5x `GET /me/skills` log count `= 0`. |
| `F11` | Before -> After + Gate `(I)` | Before: list test-only constructors, null-lock fallbacks, local `ObjectMapper`, dead 3-arg `ExternalRecord.updateResult` -> remove all and wire single constructors (test wiring per Gate `(I)`) -> `./mvnw clean test` passes (`-Xlint:all -Werror`, SpotBugs, Spotless). |
| `F12` | Before -> After + Fresh DB Catalog | Query `pg_constraint` on a fresh PostgreSQL container for exact FK list; verify real Java method signatures & lock key logic -> update `docs/01-architecture-overview.md` (EN/VI), `docs/nt05/README.md` (EN/VI), `docs/nt05/PR_DESCRIPTION.md`, `docs/erd/README.md` (EN/VI), and all `NT-05` doc statements -> `markdownlint-cli2` + `cspell` exit `0`. |

### 7. `NT-05-fix` Re-read Log

<!-- Append one line before each NT-05-fix change group: Re-read: <rule numbers and skill names>, before <change group> -->
Re-read: 01, 02, 03, 04, 11, 12, using-rikkei-skills, docs-bilingual-update, receiving-code-review, before M1 (NT-05-fix Phase 0 baseline and PHASE0_ACK.md)
Re-read: 04, 05, 06, 07, 10, 13, 14, 15, 16; skills test-driven-development, systematic-debugging, backend-module-feature, backend-module-boundaries, backend-persistence-performance, api-contract-and-errors, external-system-integration-and-mock, security-review-checklist, before backend fixes (F1, F8, F9, F10, F11)
Re-read: 04, 08, 09, 10, 12; skills test-driven-development, systematic-debugging, frontend-feature-slice, frontend-visual-design, frontend-accessibility-audit, frontend-taste-anti-slop, before frontend fixes (F2, F3, F4, F5, F6, F7)
Re-read: 04, 10, 11, 12; skills docs-bilingual-update, test-driven-development, verification-before-completion, before docs F12 and E2E F1/F9
Re-read: 04, 08, 09, 10, 12; skills test-driven-development, systematic-debugging, frontend-feature-slice, frontend-visual-design, frontend-accessibility-audit, frontend-taste-anti-slop, before frontend F2 totalPages-narrowing focus fix
Re-read: 04, 08, 09, 10, 12; skills test-driven-development, systematic-debugging, frontend-feature-slice, frontend-visual-design, frontend-accessibility-audit, frontend-taste-anti-slop, before frontend F2 stale-skipKey and focus-steal fix
Re-read: 02, 04, 05, 10, 11, 12; skills docs-bilingual-update, verification-before-completion, handoff-to-team-lead, ci-local-and-debug, before final docs, agent-config baselines, and final gates

---

## NT-05-fix — Final Gate Sign-Off

- **Scope & Immutability**: `V1..V25` (incl. `V25__nt05_external_sync.sql` SHA-256 `70909848963f872d0efaf5c59e4af1ab8d7275d7f7a133ecc81d9552fa35f650`) and `mock/data.json` (`36ea41fba86b3e062235b4badeca72a2ddeb0ebdc731a43f176bc7379e80b188`) remain byte-identical to Phase 0; Git remains strictly READ-ONLY on `feature/t022c02-ket-noi-du-lieu` (`HEAD` `17b1ae8`).
- **Defects Resolved**: `F1`–`F12` verified RED -> GREEN / Before -> After across Backend, Frontend, E2E, Live Docker (`psql`), `/browser` (`8` new PNGs in `docs/nt05/pr-screenshots/`), and Documentation (`F12`).
- **Rule 05 / Rule 10 Baselines Synced**: Backend `1449` tests / `104` classes, Frontend `629` tests / `51` files (`20/20` consecutive Vitest runs, `0` `act()` warnings, `87.77 kB` JS / `14.23 kB` CSS entry gzip), E2E `31` suites / `365` cases / `2470` assertions (`sync-agent-config.mjs --check` & `validate-agent-config.mjs` exit `0`).
- **Clean Final Gates & Teardown**: `docker compose down -v` leaves `0` `rikkei` containers/volumes/networks; `./mvnw.cmd clean test spotless:check spotbugs:check` (`1449/104`, Spotless clean, SpotBugs `0`), `.\check.ps1` (`26/26` PASS), and `./check.sh` (`26/26` PASS) all complete cleanly on the final working tree.

---

## NT-05-fix2 — Phase 0 Acknowledgement

- Round: `NT-05-fix2` (`T022C02`) — Fix defects `G1`-`G8` reproduced during Team Lead review of uncommitted `NT-05` and `NT-05-fix` work
- Precedence: `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX2_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_NT05_EN.txt` (`D1`-`D11`) > `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (`R0`-`R3`) > `.claude/rules/01..16` > Repository Skills
- Encoding & Line Endings: UTF-8 without BOM, LF (`\n`), zero emoji

### 1. Starting Git State & SHA-256 Immutability Anchors

- Active branch: `feature/t022c02-ket-noi-du-lieu`
- Base `HEAD`: `17b1ae8` (`17b1ae8704d3e0a2cb36053d533c8616b326d5c8`)
- Uncommitted working tree baseline (`git status --porcelain -uall`): `123` entries (`72` modified `M`, `51` untracked `??`), all preserved untouched prior to `NT-05-fix2` edits.
- All files under `backend/src/main/resources/db/`: `22` files (`13` production migrations `V1..V25` under `migration/`, `9` dev seed migrations `V2..V24` under `migration-dev/`).
- Key immutability SHA-256 anchors (must remain byte-identical through completion):
  - `backend/src/main/resources/db/migration/V25__nt05_external_sync.sql`: `70909848963f872d0efaf5c59e4af1ab8d7275d7f7a133ecc81d9552fa35f650` (`6664` bytes)
  - `mock/data.json`: `36ea41fba86b3e062235b4badeca72a2ddeb0ebdc731a43f176bc7379e80b188` (`6819` bytes)
  - All older Flyway migrations `V1..V24` (`12` files in `migration/`, `9` files in `migration-dev/`): recorded in Table B below and locked immutable.
- **G8 Pre-Edit Accuracy Note (Prior Sections Preserved Until M4)**: Prior `NT-05` and `NT-05-fix` sections above are left unaltered in M0; per `G8`, the following earlier inaccuracies are scheduled for in-place correction in M4 and superseded here: `syncingUserIds` (actual code: `syncBusyByCandidate` and `syncInFlightIdsRef`), `ds-section-title` described as an existing design-system class (actually created in `staffDataSync.css` in this task), `docs/hs-01-skill-profile.md` item 7 omitting `recorded_at` and `payload` from PM skip comparison, and prior claims of `"no DB detail leaks"` and `"no overflow"` / `"0 page overflow"`.

#### Table A — Complete `git status --porcelain -uall` SHA-256 Baseline (`123` entries)

| # | Git Status | Path | Size (bytes) | SHA-256 |
|---|---|---|---|---|
| 1 | `M` | `.claude/rules/05-backend-java.md` | 5563 | `c91230dc39d5a24d2456b47672f7a0ad0a9b84c0287ae7b8f09e206869bd858c` |
| 2 | `M` | `.claude/rules/06-database-flyway.md` | 5111 | `ee32a1cf995d8a2de5737884753592c642712e3a5a304eaa98158654abb298a7` |
| 3 | `M` | `.claude/rules/10-testing-strategy.md` | 4016 | `34470124d5b527cd939942b5060b87a0d3add11ca39cc47aba98f7f7dcd68198` |
| 4 | `M` | `.claude/rules/14-backend-module-boundaries.md` | 7190 | `88fdd75423c4e1bf81badae863e07ef054a9ec1d4265fbfc74654d568b1d1a37` |
| 5 | `M` | `.claude/skills/backend-module-boundaries/SKILL.md` | 8922 | `e0f873864ce5676e5572902475e61cbd85624cc5a08be34b6419cc29dee157df` |
| 6 | `M` | `.claude/skills/module-domain-knowledge/SKILL.md` | 15760 | `13192f8635ea240216ee17543a6ff11a68b9cde5dba69e9ce9d6b28360e3ec52` |
| 7 | `M` | `.env.example` | 5024 | `ee980d76f275754dc44e7e3ee31fa5ae8c27cc3109840efdf049d48861d94930` |
| 8 | `M` | `.gemini/rules/05-backend-java.md` | 5563 | `c91230dc39d5a24d2456b47672f7a0ad0a9b84c0287ae7b8f09e206869bd858c` |
| 9 | `M` | `.gemini/rules/06-database-flyway.md` | 5111 | `ee32a1cf995d8a2de5737884753592c642712e3a5a304eaa98158654abb298a7` |
| 10 | `M` | `.gemini/rules/10-testing-strategy.md` | 4016 | `34470124d5b527cd939942b5060b87a0d3add11ca39cc47aba98f7f7dcd68198` |
| 11 | `M` | `.gemini/rules/14-backend-module-boundaries.md` | 7190 | `88fdd75423c4e1bf81badae863e07ef054a9ec1d4265fbfc74654d568b1d1a37` |
| 12 | `M` | `.gemini/skills/backend-module-boundaries/SKILL.md` | 8922 | `e0f873864ce5676e5572902475e61cbd85624cc5a08be34b6419cc29dee157df` |
| 13 | `M` | `.gemini/skills/module-domain-knowledge/SKILL.md` | 15760 | `13192f8635ea240216ee17543a6ff11a68b9cde5dba69e9ce9d6b28360e3ec52` |
| 14 | `M` | `.gitignore` | 2269 | `61a0e7201d5b75e42985b7a3427e93e4e860bf5f0cc1354024d79557ecb37571` |
| 15 | `M` | `README.md` | 19677 | `0f86b560dc2a524ba2fd2f97635b28a51717dedd8c318fe13e3c2146d557acb2` |
| 16 | `M` | `agent-config/rules/05-backend-java.md` | 5563 | `c91230dc39d5a24d2456b47672f7a0ad0a9b84c0287ae7b8f09e206869bd858c` |
| 17 | `M` | `agent-config/rules/06-database-flyway.md` | 5111 | `ee32a1cf995d8a2de5737884753592c642712e3a5a304eaa98158654abb298a7` |
| 18 | `M` | `agent-config/rules/10-testing-strategy.md` | 4016 | `34470124d5b527cd939942b5060b87a0d3add11ca39cc47aba98f7f7dcd68198` |
| 19 | `M` | `agent-config/rules/14-backend-module-boundaries.md` | 7190 | `88fdd75423c4e1bf81badae863e07ef054a9ec1d4265fbfc74654d568b1d1a37` |
| 20 | `M` | `agent-config/skills/backend-module-boundaries/SKILL.md` | 8922 | `e0f873864ce5676e5572902475e61cbd85624cc5a08be34b6419cc29dee157df` |
| 21 | `M` | `agent-config/skills/module-domain-knowledge/SKILL.md` | 15760 | `13192f8635ea240216ee17543a6ff11a68b9cde5dba69e9ce9d6b28360e3ec52` |
| 22 | `M` | `backend/src/main/java/com/rikkei/jobs/assessment/service/impl/EvaluationServiceImpl.java` | 16269 | `9ad6eb19840680996ba483ec0c4985f42132231242347cee9d3a5f88d70ec9cd` |
| 23 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/controller/SkillProfileController.java` | 9091 | `92fcaf2a61b2486476879a05a6e58dfd24d3aee288353d419c82489305c956b7` |
| 24 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/PmInternshipResultCommand.java` | 677 | `2be6991bba5ac0fafbd6770bac63038b694f13f53247a085fe4012523bd12c58` |
| 25 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/model/ExternalRecord.java` | 3744 | `fec8c661aca23ff876bd44f1619902b9e3cab3af54ba39057ae85bf01130fa1e` |
| 26 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/model/SkillEvidence.java` | 3294 | `b8aec86318b18a099ccdc625ae80961035cf76d9752789f2ecfb6eef057284ee` |
| 27 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/package-info.java` | 762 | `52a2ce10e0a4b520055e98edc9d1e77afdca993c57eef8f37f95cbd9929f03e0` |
| 28 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/repository/ExternalRecordRepository.java` | 1438 | `8720eec1c313d3729b4c5c39a52f98c94b55f4a6041a5daadab323acc27c0fc4` |
| 29 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/service/CandidatePublicService.java` | 1720 | `5787396e92dff240a155d0b515ff896af97e926a5ffd6e4486672f1507268d06` |
| 30 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/service/SkillRecomputeService.java` | 10000 | `15e949191bc5c9e93b2625203c480822d9c7359af26b0029c31085dbbde98994` |
| 31 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/service/impl/CandidatePublicServiceImpl.java` | 10376 | `6d9f50d7cc1862ce9d24848f251d97fe395174275c3b5d0f9041b1741c83417f` |
| 32 | `M` | `backend/src/main/java/com/rikkei/jobs/common/client/ExternalApiClient.java` | 19888 | `61c8ea3f450eb75df279249f6e560f8c628135b44cb240c7e5f121cf2d95c451` |
| 33 | `M` | `backend/src/main/java/com/rikkei/jobs/common/security/RoutePolicyRegistry.java` | 25979 | `28bb6b40076fb0876d26242ee31d7dc92f80691941f40d2a3fd642eafcc81f49` |
| 34 | `M` | `backend/src/main/java/com/rikkei/jobs/identity/repository/UserRepository.java` | 2638 | `ea53796f3459a7d307172e92a0024fd38e550a24f594438f6f908bf7ae106809` |
| 35 | `M` | `backend/src/main/java/com/rikkei/jobs/identity/service/IdentityPublicService.java` | 1523 | `c1cd087bbcf0ecd120cb41c660bd8e9db2de061fa626e34f44537da62e100352` |
| 36 | `M` | `backend/src/main/java/com/rikkei/jobs/identity/service/impl/IdentityPublicServiceImpl.java` | 19684 | `34f3e04d0921b0dbb33901f948e639eb2f0de322d847f1afd64df598913257c9` |
| 37 | `M` | `backend/src/main/java/com/rikkei/jobs/internship/service/InternshipPersistenceService.java` | 727 | `d21efbb26a56f53f727bb4e8f6a89cdd7df345c199038c7f242b51f16069e701` |
| 38 | `M` | `backend/src/main/java/com/rikkei/jobs/internship/service/impl/InternshipPersistenceServiceImpl.java` | 9509 | `6118203d0f6317c3c87f3ba50bcf4872d8717858d5ff2b72d5396411724ca8a0` |
| 39 | `M` | `backend/src/main/java/com/rikkei/jobs/internship/service/impl/InternshipSyncServiceImpl.java` | 4445 | `103bb150e61998eab3bac53a899402e1c1dc42b1246274fcf9c9d754439f304d` |
| 40 | `M` | `backend/src/main/resources/application.yml` | 4099 | `e91aef100963be27e6fda37c0b5cf564af577a560953fd870a9fc34167733793` |
| 41 | `M` | `backend/src/test/java/com/rikkei/jobs/ai/AiGovernanceIntegrationTest.java` | 28262 | `91bf87c6cbaa8733f6ace2b9ce6d3a05710fbb13bbcfd14e6bcddba0d5e71b50` |
| 42 | `M` | `backend/src/test/java/com/rikkei/jobs/candidate/CandidatePublicServiceInternshipTest.java` | 38305 | `713ac9478a81bc1f1e3791ee86637c5d747a2bf7e68b771ec2d8beff75ae8470` |
| 43 | `M` | `backend/src/test/java/com/rikkei/jobs/candidate/SkillProfileIntegrationTest.java` | 17811 | `122442b2e465e21f771b44a3993cae91eba5f80010c59287c02c86bca360f897` |
| 44 | `M` | `backend/src/test/java/com/rikkei/jobs/common/security/RoutePolicyRegistryTest.java` | 13520 | `89309ca3caff7b2fa80b2546df56981ab6c65ed0e7a53bbffe0c4dd28177707a` |
| 45 | `M` | `backend/src/test/java/com/rikkei/jobs/internship/InternshipControllerIntegrationTest.java` | 34858 | `79f4af0ac8bc365e828cd54d3658dbf625718ccd2346e13fc9bbc45e31945052` |
| 46 | `M` | `backend/src/test/java/com/rikkei/jobs/internship/InternshipSyncServiceTest.java` | 30135 | `3bb3ec4cf418ec86c0a005743dcc42c096a6fc00698a843419834aea91a6c983` |
| 47 | `M` | `backend/src/test/java/com/rikkei/jobs/migration/CompanyMigrationIntegrationTest.java` | 31156 | `ca209b6510427d5023af5a471cd2b30dab12543c44cdabc11d6b0160822108af` |
| 48 | `M` | `backend/src/test/java/com/rikkei/jobs/migration/DefaultProfileIntegrationTest.java` | 9695 | `431c0266c4c0876b7e87b6b39b6a7d93defd1dd256ef4b45dec8c9800a1760cc` |
| 49 | `M` | `backend/src/test/java/com/rikkei/jobs/migration/InternshipMigrationIntegrationTest.java` | 27013 | `970eda919aa8f1dda732245966e9f92ba16842fed66ec843fa719933a3f09a15` |
| 50 | `M` | `backend/src/test/java/com/rikkei/jobs/migration/ProfileSeparationIntegrationTest.java` | 23738 | `e8f5a964ed29cc5b5d31f6a51da672deb052850468ad483acc7cfc4032035b48` |
| 51 | `M` | `backend/src/test/java/com/rikkei/jobs/migration/RecruitmentMigrationIntegrationTest.java` | 41562 | `c23584631987bead4f83eb7f310c88f98572ff7d9410b1bf2be70cb41d97bbf7` |
| 52 | `M` | `backend/src/test/java/com/rikkei/jobs/security/RbacPermissionMatrixIntegrationTest.java` | 71666 | `78322b19cedb5b9d5052f4dc1900723a02d78be4820938f5b4df9ed09764a84c` |
| 53 | `M` | `backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java` | 22681 | `0cbc466ebf632e859bd9c5130ee6d62c85bbef29c78dfe387567cd09a815d909` |
| 54 | `M` | `cspell.json` | 5232 | `ee3ac8e9aa2e57562015e1661cbd05b739280c8e24dff3e8862f5d4d83ac085d` |
| 55 | `M` | `docker-compose.yml` | 7099 | `e220100d535ea0a40b82cebf9ccf5e2d1eea84cfdc4f30ac77ddc2604b5ba376` |
| 56 | `M` | `docs/01-architecture-overview.md` | 29184 | `a4e2f228feb8f69e84b864c76a4bbf525fa391cd0f74ca1e8e5e0320044dc721` |
| 57 | `M` | `docs/05-open-business-questions.md` | 43294 | `3742217f6d228430d4073c16e9d691279413515091c15163ec4605dfde06b0bb` |
| 58 | `M` | `docs/erd/README.md` | 81637 | `cd5250f8dfc94f202ff99606dd6a297084a5736407724346974782efd1a4504e` |
| 59 | `M` | `docs/hs-01-skill-profile.md` | 33172 | `8899a8e227f7eeba3e6bb019804103555bb2e6affcf65457dae0c6a3ef1baaf3` |
| 60 | `M` | `e2e/run-all.mjs` | 7715 | `c903b0d148a0feb785b3647e0c55d640708149a4938e223a9870f67b38960c78` |
| 61 | `M` | `e2e/tier1-features/test_openapi_docs.test.mjs` | 32510 | `83b83ba22f0758686988fdd381adb97b583d8f12c2047268d46fee5d2e2ee8df` |
| 62 | `M` | `frontend/src/App.tsx` | 29461 | `9de0bcabd8fd1fee3d05fe617245e111cfd03f77bfcbfee2713409fee0948841` |
| 63 | `M` | `frontend/src/features/candidate/components/SkillProfilePage.test.tsx` | 13758 | `2565e48b455f68e5489c902ba5f363d5b31aa1ad34de5bb515e016860db8bca3` |
| 64 | `M` | `frontend/src/features/candidate/components/SkillProfilePage.tsx` | 13504 | `897111d910a94fff91b1eb6d9a5ca7a7f223c1e6e923f5d740a07eacbe31b5ac` |
| 65 | `M` | `frontend/src/features/candidate/index.ts` | 2423 | `fe46475960180a3b3ccec406a6bf5658938663c7569f3fb4cf8cc24ecf1f3a5d` |
| 66 | `M` | `frontend/src/features/candidate/skillProfile.css` | 10244 | `0c2c10a3c533978b25d9024084415be18ed320406d75f2b2edd65df66ef6c841` |
| 67 | `M` | `frontend/src/features/identity/__tests__/SharedAppLayout.test.tsx` | 62570 | `089918b7a87358fef4253f82ce49d3fbd9f11760962ce5d834b107db433df22c` |
| 68 | `M` | `frontend/src/features/identity/__tests__/roleUtils.test.ts` | 18901 | `0dc0c485bd7964f8123d6c3b7b7ce8b34a38a7efdb16f65046ca97d8fc536298` |
| 69 | `M` | `frontend/src/features/identity/config/roleMenuConfig.ts` | 3749 | `3fe24e580dabf58d6787a2feb6f6e0ac466c9e5ff1304522d824e2ba7f66ff6e` |
| 70 | `M` | `frontend/src/features/identity/config/routePolicies.ts` | 3553 | `b17c46110637bbd99f4758b3a88c86f721cbc77fcc5b5102b0b146d06aa5cd7d` |
| 71 | `M` | `frontend/src/shared/components/Icon.test.tsx` | 2616 | `580f0ad30ff342cd65e724d78b9f6bdcc23aa3a9bf919704fe508c9326ba177b` |
| 72 | `M` | `frontend/src/shared/components/Icon.tsx` | 8678 | `f51afbf659fb47f48c9c80ab177783f758438f4f80da0a8d2002b831258f7b9c` |
| 73 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/config/SyncExecutorConfig.java` | 1239 | `558260824aeafcc62ad2f7af12c16d3aa1179309fc6cd48797384342a4fff663` |
| 74 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/config/SyncProperties.java` | 1518 | `314badfb26930847ad722780a04a30c3b21e66b3425bcdf007b8d429b4b03fba` |
| 75 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/controller/StaffDataSyncController.java` | 12062 | `d8c694c3f4e7de3c692f75806bbad15d4f5069f4869515e907fd41641c55e7fe` |
| 76 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/ExternalRecordResponse.java` | 657 | `ae65692b0a39f972ff008d0a9881720d06f29aa5e4940982f11bd97601ad3f15` |
| 77 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/ManualOverrideDto.java` | 338 | `f10e52b6acfa075882bc9d7865a0acd735889b1e5912544dc1a4f1c84ce98a69` |
| 78 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/ManualOverrideRequest.java` | 810 | `faa380c51d59cbb726991b193a2eff90e951e6cf0c25080efc2cf4e6257bb38f` |
| 79 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/SourceSyncCounts.java` | 236 | `8474c296029f8280f0728fa2ffe76fd2645c79d6f10e3808afa46df6c5fcd431` |
| 80 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/SyncCounts.java` | 212 | `0ff5cb7998cbe57257e95c5b785fbc92468ba44b8e701946d13642b6ff989b72` |
| 81 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/SyncRunResponse.java` | 523 | `1252bdb3eb94594a5f9562a22cc3d0251e46a06c4213a1b5304c8fabc4a32be1` |
| 82 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/model/ManualOverride.java` | 1923 | `3e8cba5000dca2d44a105013175c8c9693e958a8794980637ffd0eb2b233259c` |
| 83 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/model/SyncRun.java` | 2383 | `55004382b5ca8fa3204cfd2e0f350161491a8324fdf9ce81b25d72479e0bc990` |
| 84 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/model/SyncStatus.java` | 169 | `6d6dd80f7e5a0bf54c7d9746bfc71c106019c782af6d3d37c9a381ea1131b6fb` |
| 85 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/model/SyncTrigger.java` | 183 | `b2b5a220812979a073bee2e3201f48e459df6f7a6c6f902c741de3da379fe25e` |
| 86 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/repository/ManualOverrideRepository.java` | 548 | `68aaf27c8c1e953d843dc1dd0a80d15d59106ad4d9ca5f95dc86a528dd83ebf2` |
| 87 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/repository/SyncRunRepository.java` | 1136 | `7571a87a0ea6cf82f4d46dbe9dbdb2d35b985dea71397417d7abbb9e0829dba0` |
| 88 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/CandidateSkillLockService.java` | 1258 | `d1fb3d8a5cf34232306f1da62ce166cde6f875240c89028a6e4490a652dfa45a` |
| 89 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/ExternalRecordNormalizer.java` | 33531 | `f47bde1efacc30bae01e5faebdbea99b22bf5e0aa5096b882f6caf2e69f63151` |
| 90 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/ExternalSyncService.java` | 11540 | `113fd8ad4a2aadee82b7f155f99026e62cb2180ec6e030ff2da2f282d3d7e44f` |
| 91 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/NightlySyncJob.java` | 6916 | `341172eef24926232b8fecc02c772f65be25911878ca18e3770fae2ea55197ce` |
| 92 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/OnOpenSyncService.java` | 3875 | `a75d2cb0f78b8bdd8e6f6987a31862dd7cb6fb1c07a7da4f95e8badfd92545bf` |
| 93 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/StaffDataSyncService.java` | 23620 | `a456feaacce98e4d884976cac553497a0b1763b1b9e58b34c3c61b785d26acd1` |
| 94 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/SyncFailureLogger.java` | 4035 | `041ab5e709ffa8e348bb3530369bc62ad06b719ddaa7b5734275451f0590eebd` |
| 95 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/SyncRunPersistenceService.java` | 4553 | `d5381f6527d077e75316beda7ffaee142bc550674627ed7218d686b1c019d63c` |
| 96 | `??` | `backend/src/main/java/com/rikkei/jobs/identity/dto/CandidateSyncSummaryDto.java` | 432 | `37affd585f0ee683921dc5b8b51678302f33cdacb919ce590352fc11c39b7859` |
| 97 | `??` | `backend/src/main/java/com/rikkei/jobs/identity/dto/CandidateSyncTargetDto.java` | 560 | `a6da85b20bb41b429394ddada75e58074b90b8bc9dde495d5ab734326e6a0e32` |
| 98 | `??` | `backend/src/main/resources/db/migration/V25__nt05_external_sync.sql` | 6664 | `70909848963f872d0efaf5c59e4af1ab8d7275d7f7a133ecc81d9552fa35f650` |
| 99 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/ExternalSyncServiceIntegrationTest.java` | 28862 | `08c430d2141a19fd09d8b49d2c56b583217d101697a22f72855ed616e180669d` |
| 100 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/NightlySyncJobIntegrationTest.java` | 8264 | `73d2320599c480b50e866170453dbf9bd2675b624cc4d979547f78ca407c4830` |
| 101 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/OnOpenSyncNoLmsUserIdIntegrationTest.java` | 5779 | `8f01acabe1ee499c08631662ed4217e6c88e244c106d50c9f9d1205a19628edf` |
| 102 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/OnOpenSyncServiceTest.java` | 10446 | `fb44565e22875420a8acb3828405ac03e961be43736b7b55eb6f74a33b85a04a` |
| 103 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/PmPayloadConsistencyIntegrationTest.java` | 13682 | `2e1d270906ad23b0c912ecea70d705d48c7456c078ccf3ae04ec188c073b62f2` |
| 104 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/SkillRecomputeConcurrencyIntegrationTest.java` | 11589 | `d303c68e3bc382ae3354e54db78f1560d5b34e66a6552bb7c26335c932cb2d9e` |
| 105 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/StaffDataSyncIntegrationTest.java` | 28377 | `d01ef0857a9d95fd7193a720921133daf720a551c8f5f98206a4a4e2d58dc6a3` |
| 106 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/SyncFailureLoggingTest.java` | 18990 | `c1c76063c2d5dcefdbd614e888f7cecb9f4d00333e99d8cee5477e4e50a4e145` |
| 107 | `??` | `backend/src/test/java/com/rikkei/jobs/client/ExternalApiClientSyncTest.java` | 9093 | `d581e7277ec25631a555f8dab9fd7ae5312680a477a6042542d2204bf214be78` |
| 108 | `??` | `backend/src/test/java/com/rikkei/jobs/identity/IdentitySyncQueryIntegrationTest.java` | 8455 | `0a46c9ac6e5ced57f5f20a1155f17af6c6246aed0d9099a3eef58f2566428a59` |
| 109 | `??` | `backend/src/test/java/com/rikkei/jobs/internship/InternshipConcurrencyIntegrationTest.java` | 10386 | `b8a595619d2cf1a29bbcd4bb1b5911e06611cc5760a245987a8ae7f0a19d417e` |
| 110 | `??` | `backend/src/test/java/com/rikkei/jobs/migration/V25UpgradeMigrationIntegrationTest.java` | 21737 | `732aca4a9b7c9aee7cc4793389d7c98567bffefd9a453927d47a6fbae477fbc8` |
| 111 | `??` | `docs/nt05/BROWSER_OBSERVATIONS.md` | 18966 | `c2fec1441528ff54543893270b2a58d95850b4679ceb36c70fd3d31f2ce4f669` |
| 112 | `??` | `docs/nt05/PHASE0_ACK.md` | 53679 | `ca6929bf820833e9139a468bb5489332b2a88d4b159db39f5a372f1bf679772a` |
| 113 | `??` | `docs/nt05/PR_DESCRIPTION.md` | 23160 | `734e2e580206d0abfb70ced30a5b67a014a509aa624b1cc141a35de2ba410d67` |
| 114 | `??` | `docs/nt05/README.md` | 21916 | `1135dffbcb541465af6c7ce9462f1ac6abf7ef90aa71532121b8c40dd29f1904` |
| 115 | `??` | `e2e/tier1-features/test_data_sync.test.mjs` | 24262 | `50176ba00d96c64223c0bfb5f8743e3700ee33a0ad39e5a65614a057e61851c5` |
| 116 | `??` | `frontend/src/features/candidate/__tests__/StaffDataSyncPage.test.tsx` | 77840 | `67f84acd3960553e0cf3835d14838813cbe35e28718019ed3d3c46780b34204a` |
| 117 | `??` | `frontend/src/features/candidate/api/staffDataSyncApi.ts` | 7140 | `4c55b6ae499e5deb5f89b1439644f1b224bb4121cd2a8c55963200632bfcaee1` |
| 118 | `??` | `frontend/src/features/candidate/components/ManualOverrideDialog.tsx` | 16607 | `a2d4fcb3e37ca02f782f9676c3afd212c3786a747b363a4f48392df42e8d6465` |
| 119 | `??` | `frontend/src/features/candidate/components/SyncStatusBadge.tsx` | 595 | `237ade48147a25ff9a147c8918c2c3a0a2affa020a368a340e61206285c9370e` |
| 120 | `??` | `frontend/src/features/candidate/pages/StaffDataSyncPage.tsx` | 69367 | `935ba28ad72c2ece34440bd7ea6f09dd8a354c65fca679c74f850ca3b05f45a8` |
| 121 | `??` | `frontend/src/features/candidate/styles/staffDataSync.css` | 15441 | `36fa4c6520dd5b0fdfe70ddd2584221161ac5e4598b099a07aff8b73e502bd07` |
| 122 | `??` | `frontend/src/features/candidate/types/dataSync.types.ts` | 2343 | `5286283c68e0eac14618788eec5d6fcdbeed30f05200afd8af4d1403a6bcf3c5` |
| 123 | `??` | `frontend/src/shared/utils/dialogFocusUtils.ts` | 1287 | `84edf292eaa21f3602bc7634089a7f38886e98ba65e2ae461f2e16e56e95bf82` |

#### Table B — Complete `backend/src/main/resources/db` SHA-256 Baseline (`22` files)

| # | Path | Size (bytes) | SHA-256 |
|---|---|---|---|
| 1 | `backend/src/main/resources/db/migration/V1__init_schema.sql` | 1031 | `133a7a886b687e0f6c3da396b6721d471581961f0abb8575cccaa61530f1642f` |
| 2 | `backend/src/main/resources/db/migration/V11__jobs_and_recommendations.sql` | 2004 | `27a3a7a048ca72ccd87ef9e4c275ee63b461a901c8057f334434d9b0b1f5d10d` |
| 3 | `backend/src/main/resources/db/migration/V13__target_positions_gap_analysis.sql` | 1979 | `1787236aeab516c8a381f46b464347747f2d5138081614fd2fd30855ca10745b` |
| 4 | `backend/src/main/resources/db/migration/V15__create_internships_and_internship_tasks.sql` | 1339 | `a18032e5c6ea1b49d3cda2d6490a548efa504511637341e85c79e5484b1711f4` |
| 5 | `backend/src/main/resources/db/migration/V17__ai_governance.sql` | 1939 | `ce7fb28fd9477359094651952e79d1f58629236b0f778bb5c4c9b063700ce3ef` |
| 6 | `backend/src/main/resources/db/migration/V19__create_recruitment_applications.sql` | 2387 | `5d0b35638d6ea3d9284e973613ed418f006d6e923d0d6f742b3c87003e9f9f62` |
| 7 | `backend/src/main/resources/db/migration/V21__create_application_cv_snapshots.sql` | 1126 | `24f1774f59a713e19f7cee9f1f7bd61f6b4e40da0b7d6e4e96c264f09fea9654` |
| 8 | `backend/src/main/resources/db/migration/V23__create_interview_rounds.sql` | 1775 | `a854c37aaa1621755d856f6c1dd87ac9fe20343785402c14dbea4da0004fe29d` |
| 9 | `backend/src/main/resources/db/migration/V25__nt05_external_sync.sql` | 6664 | `70909848963f872d0efaf5c59e4af1ab8d7275d7f7a133ecc81d9552fa35f650` |
| 10 | `backend/src/main/resources/db/migration/V3__skill_profile.sql` | 3390 | `3708ae4c9cab0609612d618c44873f94632a8dd04ae37fc9d2bc64cf7b952639` |
| 11 | `backend/src/main/resources/db/migration/V5__auth_identity_evolution.sql` | 1920 | `7131b9cbd0130df759f6783e338884f7043a6a9d3fd20d6a24631a5399802c22` |
| 12 | `backend/src/main/resources/db/migration/V7__evaluation.sql` | 4449 | `b79ae86eb418cda387aee091790f1a51cbf75d7c9062c5d8a90c036d2012eb51` |
| 13 | `backend/src/main/resources/db/migration/V9__company_profile.sql` | 3549 | `6bc0e8589a97175750b7a9c057a81169f8ad8f08b51b16bef351652c72568fa2` |
| 14 | `backend/src/main/resources/db/migration-dev/V10__dev_company_seed.sql` | 1661 | `bcead7dda7bedb5d67ec8f85470f4d4311dd7090024cbbcd469b2a1c76cc174f` |
| 15 | `backend/src/main/resources/db/migration-dev/V12__dev_job_seed.sql` | 5282 | `187f64ee33b9989d54bd5a9441dcb855c537cab9f44afe0b69fe87d95dae100f` |
| 16 | `backend/src/main/resources/db/migration-dev/V14__dev_gap_analysis_seed.sql` | 2376 | `f93697be4eb4012ed96a07a37698ca7fba7d1df2d4169353bc50e627ba162b5e` |
| 17 | `backend/src/main/resources/db/migration-dev/V2__dev_seed.sql` | 11051 | `488d6a5f142584119bac83075b108dd1e021b1f54d6eba87d65f0e9f7dba22e2` |
| 18 | `backend/src/main/resources/db/migration-dev/V22__dev_recruitment_seed.sql` | 6545 | `2e3de765e9d6aac4e7f489eaf38688940e68b22bd4ca895bbaabfd10c020c7fb` |
| 19 | `backend/src/main/resources/db/migration-dev/V24__dev_interview_rounds_seed.sql` | 2226 | `ff73d63335cb637a1bfb10c2c2c474ae596b39072754d82844d23efa1e715458` |
| 20 | `backend/src/main/resources/db/migration-dev/V4__dev_skill_profile_seed.sql` | 4724 | `5f73a354e322be5057163dbd6572bb0a8433a95a6d149a6ae3bcde8543c2a59f` |
| 21 | `backend/src/main/resources/db/migration-dev/V6__dev_seed_nt01.sql` | 445 | `f2a800b089f1b46aeef58b19747911a75461ddb74830ff669f5b969061d4b079` |
| 22 | `backend/src/main/resources/db/migration-dev/V8__dev_evaluation_seed.sql` | 8382 | `4c04ebb6b0b0b607118b12161f6ff1fb5a7a4ccff50f71d30f9371d5ab41b98b` |

### 2. Mandatory Working Method (Verbatim from `PROMPT_BASE_RULES_EN.txt` R1)

> "Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi."

### 3. Files Read Before Any `NT-05-fix2` Edit

1. **Binding Prompts & Original Request**:
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (`R0`-`R3`, lines `1`-`54`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_EN.txt` (`D1`-`D11`, sections `0`-`10`, lines `1`-`199`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX_EN.txt` (`F1`-`F12`, gates `(H)`-`(I)`, lines `1`-`100`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX2_EN.txt` (`G1`-`G8`, sections `0`-`6`, lines `1`-`87`)
   - `<teamwork-state>/ORIGINAL_REQUEST.md` (lines `1`-`52`)
2. **Root Agent Entrypoints & Linter Configs**:
   - `CLAUDE.md` (`47` lines), `GEMINI.md` (`61` lines), `AGENTS.md` (`44` lines)
   - `.markdownlint-cli2.jsonc` (`11` lines), `cspell.json` (`331` lines)
3. **All 16 Enterprise Rules (`.claude/rules/`)**:
   - `01-project-context.md` (`94` lines), `02-git-and-delivery.md` (`90` lines), `03-safety-and-secrets.md` (`70` lines), `04-honest-verification.md` (`59` lines)
   - `05-backend-java.md` (`83` lines), `06-database-flyway.md` (`73` lines), `07-security-rbac.md` (`78` lines), `08-frontend-engineering.md` (`79` lines)
   - `09-frontend-design-bar.md` (`79` lines), `10-testing-strategy.md` (`66` lines), `11-docs-and-bilingual.md` (`53` lines), `12-ci-and-quality-gates.md` (`85` lines)
   - `13-backend-data-access-performance.md` (`79` lines), `14-backend-module-boundaries.md` (`66` lines), `15-backend-observability-ops.md` (`80` lines), `16-backend-integrations.md` (`93` lines)
4. **Applicable Skills Read in Full (`.claude/skills/<name>/SKILL.md`)**:
   - `using-rikkei-skills`, `docs-bilingual-update`, `receiving-code-review`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `handoff-to-team-lead`
5. **Survey Reports & Prior ACK**:
   - `<teamwork-state>/teamwork_explorer_survey_1/baseline_sha256.md` (`165` lines)
   - `<teamwork-state>/teamwork_explorer_survey_1/handoff.md` (`189` lines)
   - `<teamwork-state>/teamwork_explorer_survey_2/handoff.md` (`311` lines)
   - `docs/nt05/PHASE0_ACK.md` (`341` lines prior to M0 append)

### 4. Concrete Constraints for Rules `01`-`16` (`NT-05-fix2`)

| Rule | Concrete Constraint for `NT-05-fix2` |
|---|---|
| `01-project-context.md` | Keep 9-package Modular Monolith, 5 roles, pinned versions in `docs/03-version-table.md`, zero new dependencies, and `T022C02:` prefix. |
| `02-git-and-delivery.md` | Git strictly READ-ONLY on `feature/t022c02-ket-noi-du-lieu` (`HEAD` `17b1ae8`); preserve all prior `NT-05` and `NT-05-fix` edits; propose `T022C02:` commits in English. |
| `03-safety-and-secrets.md` | Never read or print `.env` or `*.pem`; write only inside `rikkei-jobs`; keep `mock/data.json` unchanged; tear down only containers/volumes/networks created by this run (`docker compose down -v`). |
| `04-honest-verification.md` | Report PASS only from real commands exiting `0` with raw stdout/stderr; mark any unexecuted item `NOT VERIFIED`; zero `console.log`/`System.out.println`/`TODO`. |
| `05-backend-java.md` | Java 25 (`-Xlint:all -Werror`), Spotless AOSP, SpotBugs clean; use field-level `@JsonDeserialize` on `ManualOverrideRequest.value` without altering global `ObjectMapper` (`G7`); remove dead 4-arg `ExternalRecordNormalizer.upsertPmCommands` (`G8`); update Rule 05 test baseline from `1449/104`. |
| `06-database-flyway.md` | Zero edits to `V1..V25` (verified by SHA-256); any temporary CHECK constraint or column rename used for live `G2`/`G3` verification must be reverted cleanly and proved. |
| `07-security-rbac.md` | Preserve `STAFF`-only RBAC on all 5 D10 routes and `CANDIDATE` auth on `GET /me/skills` and `GET /me/internships`; keep `401`/`403` contracts intact. |
| `08-frontend-engineering.md` | TypeScript strict (zero `any`/`@ts-ignore`); `httpClient` + `AbortSignal`; preserve focus across `"Đồng bộ lại"` and all retry buttons without stealing user-moved focus (`G5`); clear stale filter/query messaging and accurate totals/pager (`G6`); allow `\n`/`\r\n`/`\t` in override reason (`G7`). |
| `09-frontend-design-bar.md` | Zero emoji, `--rj-*` tokens only, STAFF Dense mode (`36-38px` rows), fix `.ds-runs-header` filter bar across `375/768/1024/1280/1440/1920` px with sidebar expanded & collapsed (`G1`), contain expanded run error inside visible table viewport at `375/768/1024` px (`G4`), render multiline wrapped reason history (`G7`). |
| `10-testing-strategy.md` | RED then GREEN for `G1`-`G7`; only `NT-05`-created tests may adapt where `G1`-`G8` change behavior (any change to a `develop` assertion is a Stop Gate); 20 consecutive `--reporter=verbose` Vitest runs (`0` fail, `0` `act()`); update Rule 10 baselines (`1449/104`, `629/51`, `31/365/2470`). |
| `11-docs-and-bilingual.md` | Correct `G8` doc errors in place (`docs/hs-01-skill-profile.md` item 7 EN/VI, `docs/nt05/PR_DESCRIPTION.md`, `docs/nt05/PHASE0_ACK.md`, `docs/nt05/README.md` if affected); append `NT-05-fix2` sections cleanly; `markdownlint-cli2` + `cspell` exit `0`. |
| `12-ci-and-quality-gates.md` | Add zero new quality gates; pass clean Maven build, `./check.sh` and `.\check.ps1` identically (`26/26`); never invoke `scripts/run-ci-in-docker.*`; run `sync-agent-config.mjs --check` and `validate-agent-config.mjs`. |
| `13-backend-data-access-performance.md` | Keep `open-in-view: false`, `ddl-auto: none`, Hikari max `10`, HTTP outside `@Transactional`, and per-user advisory lock invariant unchanged. |
| `14-backend-module-boundaries.md` | Keep `candidate` table ownership and `IdentityPublicService` immutable DTO boundary intact while classifying `NightlySyncJob` listing failures (`G3`) and removing dead 4-arg `upsertPmCommands` (`G8`). |
| `15-backend-observability-ops.md` | Disable `org.hibernate.orm.jdbc.error` in `application.yml` across all profiles so PostgreSQL `Detail:` PII never reaches logs (`G2`); classify `NightlySyncJob` candidate-listing failure and log original exception once even if `recordFailure` throws (`G3`). |
| `16-backend-integrations.md` | Keep `ExternalApiClient` timeouts/retries and staff sync `503 EXTERNAL_UNAVAILABLE` contract intact while enforcing `G2`/`G3` logging and `G7` validation. |

### 5. Applicable Skills for `NT-05-fix2` and Why

- **Process, Review & Verification (`R1`)**:
  - `using-rikkei-skills`: Governs precedence (`PROMPT_NT05_FIX2_EN.txt` > `PROMPT_NT05_FIX_EN.txt` > `PROMPT_NT05_EN.txt` > `PROMPT_BASE_RULES_EN.txt` > Rules `01`-`16` > Skills), per-change-group `Re-read:` logging, and phase skill routing.
  - `receiving-code-review`: Governs disciplined triage and literal remediation of Team Lead review defects `G1`-`G8` within authorized test rules (no unapproved changes to `develop` assertions).
  - `systematic-debugging`: Guides root-cause fixes for `.ds-runs-header > div` flex layout regression (`G1`), ROOT logger `Detail:` leak (`G2`), lost `NightlySyncJob` / `recordFailure` error logs (`G3`), narrow-viewport off-screen run error box (`G4`), focus drop on disabled/unmounted buttons (`G5`), ambiguous stale filter/query copy (`G6`), and `1e-100000` double underflow / reason control char rejection (`G7`).
  - `test-driven-development`: Mandates RED -> GREEN automated tests for `G1`-`G7` before production edits, using Testcontainers PostgreSQL `18.6-alpine` and RTL/Vitest focus/state tests without sleeps.
  - `verification-before-completion`: Requires raw outputs for clean Maven build, `./check.sh` and `.\check.ps1` (`26/26`), 20 consecutive Vitest runs, fresh Docker `e2e/run-all.mjs`, live `G2`/`G3`/`G7` (`psql`) proofs, and `/browser` visual PNG inspection.
  - `handoff-to-team-lead`: Enforces Git read-only state, scoped Docker cleanup (`docker compose down -v`), and Vietnamese final report with `G1`-`G8` table, `T022C02:` commit proposals, and `NOT VERIFIED` list if applicable.
- **Backend (`G2`, `G3`, `G7-BE`, `G8-BE`)**:
  - `backend-module-feature`, `backend-persistence-performance`, `api-contract-and-errors`, `external-system-integration-and-mock`, `security-review-checklist`, `flyway-migration-authoring`: Govern `ManualOverrideValueDeserializer` (`G7`), `NightlySyncJob`/`ExternalSyncService` logging (`G2`, `G3`), `ExternalRecordNormalizer` cleanup (`G8`), and `V1..V25` immutability.
- **Frontend & Accessibility (`G1`, `G4`, `G5`, `G6`, `G7-FE`)**:
  - `frontend-feature-slice`, `frontend-visual-design`, `frontend-accessibility-audit`, `frontend-taste-anti-slop`: Govern responsive filter bar layout across sidebar expanded/collapsed (`G1`), sticky/contained run error detail box (`G4`), non-stealing keyboard focus recovery (`G5`), explicit stale filter/query UI messaging (`G6`), and multiline reason entry/display (`G7`).
- **Documentation & CI (`G8-docs`, Gates)**:
  - `docs-bilingual-update` & `ci-local-and-debug`: Govern `PHASE0_ACK.md`, `PR_DESCRIPTION.md`, `BROWSER_OBSERVATIONS.md`, in-place `G8` fixes (`docs/hs-01-skill-profile.md` EN/VI, `docs/nt05/*`), Rule 05/10 baseline sync (`sync-agent-config.mjs --check`), `markdownlint-cli2`, `cspell`, and `26/26` gate parity.

### 6. Proof Plan for Defects `G1`-`G8`

| Defect | Proof Type | Concrete Verification Method |
|---|---|---|
| `G1` | RED -> GREEN + `/browser` | Failing CSS/DOM test on `.ds-runs-header > div` regression -> fix `.ds-runs-header` / `.ds-runs-filters` flex layout -> GREEN + `/browser` `boundingBox()` and inspected PNGs at `375`, `768`, `1024`, `1280`, `1440`, `1920` px (sidebar expanded & collapsed, Light & Dark). |
| `G2` | RED -> GREEN + Live Stack | Failing Testcontainers ROOT-logger test triggering a PostgreSQL constraint violation across `MANUAL`, `ON_OPEN`, `NIGHTLY` -> disable `org.hibernate.orm.jdbc.error` in `application.yml` -> GREEN (`0` marker/`Detail:` events in ROOT logger, `1` redacted `ERROR` per trigger) + live stack proof with temporary `CHECK` constraint (reverted & proved) and full backend log search. |
| `G3` | RED -> GREEN + Live Stack | Failing tests for (a) `NightlySyncJob` unexpected candidate-listing exception logged only at `WARN` and (b) `ExternalSyncService` losing original exception log when `recordFailure` throws -> fix `NightlySyncJob` via `SyncFailureLogger` and log before `recordFailure` in `ExternalSyncService` -> GREEN + live stack proof with temporary `users.lms_user_id` rename (reverted & proved). |
| `G4` | RED -> GREEN + `/browser` | Failing CSS/layout test for `.ds-run-error-detail-box` escaping visible `.ds-table-scroll` viewport -> add `container-type: inline-size` + sticky container-bound sizing -> GREEN + `/browser` touch and keyboard verification with `boundingBox()` and inspected PNGs at `375`, `768`, `1024` px. |
| `G5` | RED -> GREEN + `/browser` | Failing Vitest focus tests simulating blur-on-disable (`"Đồng bộ lại"`) and unmount-on-retry (`6` retry buttons across candidates, records, runs) -> implement guarded anchor-and-restore `useLayoutEffect` without stealing moved focus -> GREEN across 20 Vitest runs + `/browser` keyboard walkthrough (`document.activeElement !== BODY`). |
| `G6` | RED -> GREEN + `/browser` | Failing Vitest tests for stale Runs filter (`"Thất bại"` while down/loading) and stale Candidates search (`"binh"` while down/loading) -> update stale banner/total/pager copy naming shown filter/query vs requested filter/query -> GREEN + `/browser` (`docker stop rikkei-backend`, `docker pause rikkei-mock`). |
| `G7` | RED -> GREEN + Live `psql` + E2E | Failing backend & frontend tests for `\n`/`\r\n`/`\t` in `reason` and raw JSON `{"value":1e-100000}` -> update reason control-char validator (keep NUL/other controls and `subjectName`/`topicName` strict), add `ManualOverrideValueDeserializer`, update `.ds-history-reason` (`pre-wrap`) -> GREEN + live requests with `psql` rows + E2E check. |
| `G8` | Before -> After | Before/after grep & code inspection removing 4-arg `ExternalRecordNormalizer.upsertPmCommands`, fixing `syncingUserIds` / `ds-section-title` / `docs/hs-01-skill-profile.md` item 7 (EN/VI) in place, and correcting `"no DB detail leaks"` / `"no overflow"` claims in `NT-05-fix2` docs (`markdownlint-cli2` + `cspell` exit `0`). |

### 7. `NT-05-fix2` Re-read Log

<!-- Append one line before each NT-05-fix2 change group: Re-read: <rule numbers and skill names>, before <change group> -->
Re-read: 01, 02, 03, 04, 11, 12, using-rikkei-skills, docs-bilingual-update, receiving-code-review, before M0 (NT-05-fix2 Phase 0 baseline and PHASE0_ACK.md)
Re-read: 04, 05, 06, 07, 10, 13, 14, 15, 16, test-driven-development, systematic-debugging, backend-module-feature, backend-module-boundaries, backend-persistence-performance, api-contract-and-errors, external-system-integration-and-mock, security-review-checklist, verification-before-completion, before M1 (backend fixes G2, G3, G7-BE, G8-BE)
Re-read: 04, 08, 09, 10, 12, test-driven-development, systematic-debugging, frontend-feature-slice, frontend-visual-design, frontend-accessibility-audit, frontend-taste-anti-slop, verification-before-completion, before M2 (frontend fixes G1, G4, G5, G6, G7-FE and E2E G7)
Re-read: 02, 04, 05, 10, 11, 12, docs-bilingual-update, ci-local-and-debug, verification-before-completion, handoff-to-team-lead, before M4 (G8 doc corrections, NT-05-fix2 doc updates, agent-config baseline sync, scoped Docker teardown, and final gates)

---

## NT-05-fix2 — Final Gate Sign-Off

- **Scope & Immutability**: `V1..V25` (`22` files under `backend/src/main/resources/db/`, incl. `V25__nt05_external_sync.sql` SHA-256 `70909848963f872d0efaf5c59e4af1ab8d7275d7f7a133ecc81d9552fa35f650`) and `mock/data.json` (`36ea41fba86b3e062235b4badeca72a2ddeb0ebdc731a43f176bc7379e80b188`) remain byte-identical to Phase 0; Git remains strictly READ-ONLY on `feature/t022c02-ket-noi-du-lieu` (`HEAD` `17b1ae8`) with zero `.agents/teamwork/` artifacts inside the repository.
- **Defects Resolved & G8 Corrections**: `G1`–`G8` verified RED -> GREEN / Before -> After across Backend, Frontend, E2E, Live Docker (`psql`, temporary constraint & column rename reverted and proved), `/browser` (`18` new `nt05_fix2_*.png` screenshots visually inspected in `docs/nt05/pr-screenshots/`), and Documentation (`syncingUserIds` -> `syncBusyByCandidate` / `syncInFlightIdsRef`, `.ds-section-title` clarified as a new class created in `staffDataSync.css`, `docs/hs-01-skill-profile.md` item 7 EN/VI updated for `ExternalRecordNormalizer#hasRecordChanged`, `docs/nt05/README.md` EN/VI updated for G7 `reason` & `1e-100000`, and prior `"no DB detail leaks"` / `"no overflow"` claims corrected in `PR_DESCRIPTION.md` and `BROWSER_OBSERVATIONS.md`).
- **Rule 05 / Rule 10 Baselines Synced**: Backend `1453` tests / `105` classes, Frontend `635` tests / `51` files (`20/20` consecutive Vitest runs, `0` `act()` warnings, `87.77 kB` JS / `14.23 kB` CSS entry gzip), E2E `31` suites / `366` cases / `2480` assertions (`sync-agent-config.mjs --check` & `validate-agent-config.mjs` exit `0`).
- **Clean Final Gates & Teardown**: Scoped `docker compose down -v` leaves `0` `rikkei` or Testcontainers containers/volumes/networks from this run; `.\mvnw.cmd clean test spotless:check spotbugs:check` (`1453/105`, Spotless clean, SpotBugs `0`), `.\check.ps1` (`26/26` PASS), and `./check.sh` (`26/26` PASS) complete cleanly on the final working tree.

---

## NT-05-fix3 — Phase 0 Acknowledgement

- Round: `NT-05-fix3` (`T022C02`) — Fix the three remaining defects (`I1`, `I2`, `I3`) found during Team Lead review of uncommitted `NT-05-fix2` work
- Precedence: `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX3_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX2_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_NT05_EN.txt` (`D1`-`D11`) > `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (`R0`-`R3`) > `.claude/rules/01..16` > Repository Skills
- Encoding & Line Endings: UTF-8 without BOM, LF (`\n`), zero emoji

### 1. Starting Git State & SHA-256 Baseline (`125` entries)

- Active branch: `feature/t022c02-ket-noi-du-lieu`
- Base `HEAD`: `17b1ae8` (`17b1ae8704d3e0a2cb36053d533c8616b326d5c8`)
- Uncommitted working tree baseline (`git status --porcelain -uall`): `125` entries (`72` modified `M`, `53` untracked `??`), all preserved untouched prior to `NT-05-fix3` edits.
- Strictly unchanged against starting state: everything under `backend/`, `mock/`, `e2e/`, all package manifests (`backend/pom.xml`, `frontend/package.json`, `mock/package.json`), and `V1..V25`.

| # | Git Status | Path | Size (bytes) | SHA-256 |
|---|---|---|---|---|
| 1 | `M` | `.claude/rules/05-backend-java.md` | 5563 | `31d7adde09d087f1dbb76bedffdaffa2493fea9871535da39901334252cf7014` |
| 2 | `M` | `.claude/rules/06-database-flyway.md` | 5111 | `ee32a1cf995d8a2de5737884753592c642712e3a5a304eaa98158654abb298a7` |
| 3 | `M` | `.claude/rules/10-testing-strategy.md` | 4016 | `137c79133d3660d60cf7095931bdeea4501cd9374775002df0d12947071c24b0` |
| 4 | `M` | `.claude/rules/14-backend-module-boundaries.md` | 7190 | `88fdd75423c4e1bf81badae863e07ef054a9ec1d4265fbfc74654d568b1d1a37` |
| 5 | `M` | `.claude/skills/backend-module-boundaries/SKILL.md` | 8922 | `e0f873864ce5676e5572902475e61cbd85624cc5a08be34b6419cc29dee157df` |
| 6 | `M` | `.claude/skills/module-domain-knowledge/SKILL.md` | 15760 | `13192f8635ea240216ee17543a6ff11a68b9cde5dba69e9ce9d6b28360e3ec52` |
| 7 | `M` | `.env.example` | 5024 | `ee980d76f275754dc44e7e3ee31fa5ae8c27cc3109840efdf049d48861d94930` |
| 8 | `M` | `.gemini/rules/05-backend-java.md` | 5563 | `31d7adde09d087f1dbb76bedffdaffa2493fea9871535da39901334252cf7014` |
| 9 | `M` | `.gemini/rules/06-database-flyway.md` | 5111 | `ee32a1cf995d8a2de5737884753592c642712e3a5a304eaa98158654abb298a7` |
| 10 | `M` | `.gemini/rules/10-testing-strategy.md` | 4016 | `137c79133d3660d60cf7095931bdeea4501cd9374775002df0d12947071c24b0` |
| 11 | `M` | `.gemini/rules/14-backend-module-boundaries.md` | 7190 | `88fdd75423c4e1bf81badae863e07ef054a9ec1d4265fbfc74654d568b1d1a37` |
| 12 | `M` | `.gemini/skills/backend-module-boundaries/SKILL.md` | 8922 | `e0f873864ce5676e5572902475e61cbd85624cc5a08be34b6419cc29dee157df` |
| 13 | `M` | `.gemini/skills/module-domain-knowledge/SKILL.md` | 15760 | `13192f8635ea240216ee17543a6ff11a68b9cde5dba69e9ce9d6b28360e3ec52` |
| 14 | `M` | `.gitignore` | 2269 | `61a0e7201d5b75e42985b7a3427e93e4e860bf5f0cc1354024d79557ecb37571` |
| 15 | `M` | `README.md` | 19677 | `0f86b560dc2a524ba2fd2f97635b28a51717dedd8c318fe13e3c2146d557acb2` |
| 16 | `M` | `agent-config/rules/05-backend-java.md` | 5563 | `31d7adde09d087f1dbb76bedffdaffa2493fea9871535da39901334252cf7014` |
| 17 | `M` | `agent-config/rules/06-database-flyway.md` | 5111 | `ee32a1cf995d8a2de5737884753592c642712e3a5a304eaa98158654abb298a7` |
| 18 | `M` | `agent-config/rules/10-testing-strategy.md` | 4016 | `137c79133d3660d60cf7095931bdeea4501cd9374775002df0d12947071c24b0` |
| 19 | `M` | `agent-config/rules/14-backend-module-boundaries.md` | 7190 | `88fdd75423c4e1bf81badae863e07ef054a9ec1d4265fbfc74654d568b1d1a37` |
| 20 | `M` | `agent-config/skills/backend-module-boundaries/SKILL.md` | 8922 | `e0f873864ce5676e5572902475e61cbd85624cc5a08be34b6419cc29dee157df` |
| 21 | `M` | `agent-config/skills/module-domain-knowledge/SKILL.md` | 15760 | `13192f8635ea240216ee17543a6ff11a68b9cde5dba69e9ce9d6b28360e3ec52` |
| 22 | `M` | `backend/src/main/java/com/rikkei/jobs/assessment/service/impl/EvaluationServiceImpl.java` | 16269 | `9ad6eb19840680996ba483ec0c4985f42132231242347cee9d3a5f88d70ec9cd` |
| 23 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/controller/SkillProfileController.java` | 9091 | `92fcaf2a61b2486476879a05a6e58dfd24d3aee288353d419c82489305c956b7` |
| 24 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/PmInternshipResultCommand.java` | 677 | `2be6991bba5ac0fafbd6770bac63038b694f13f53247a085fe4012523bd12c58` |
| 25 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/model/ExternalRecord.java` | 3744 | `fec8c661aca23ff876bd44f1619902b9e3cab3af54ba39057ae85bf01130fa1e` |
| 26 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/model/SkillEvidence.java` | 3294 | `b8aec86318b18a099ccdc625ae80961035cf76d9752789f2ecfb6eef057284ee` |
| 27 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/package-info.java` | 762 | `52a2ce10e0a4b520055e98edc9d1e77afdca993c57eef8f37f95cbd9929f03e0` |
| 28 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/repository/ExternalRecordRepository.java` | 1438 | `8720eec1c313d3729b4c5c39a52f98c94b55f4a6041a5daadab323acc27c0fc4` |
| 29 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/service/CandidatePublicService.java` | 1720 | `5787396e92dff240a155d0b515ff896af97e926a5ffd6e4486672f1507268d06` |
| 30 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/service/SkillRecomputeService.java` | 10000 | `15e949191bc5c9e93b2625203c480822d9c7359af26b0029c31085dbbde98994` |
| 31 | `M` | `backend/src/main/java/com/rikkei/jobs/candidate/service/impl/CandidatePublicServiceImpl.java` | 10376 | `6d9f50d7cc1862ce9d24848f251d97fe395174275c3b5d0f9041b1741c83417f` |
| 32 | `M` | `backend/src/main/java/com/rikkei/jobs/common/client/ExternalApiClient.java` | 19888 | `61c8ea3f450eb75df279249f6e560f8c628135b44cb240c7e5f121cf2d95c451` |
| 33 | `M` | `backend/src/main/java/com/rikkei/jobs/common/security/RoutePolicyRegistry.java` | 25979 | `28bb6b40076fb0876d26242ee31d7dc92f80691941f40d2a3fd642eafcc81f49` |
| 34 | `M` | `backend/src/main/java/com/rikkei/jobs/identity/repository/UserRepository.java` | 2638 | `ea53796f3459a7d307172e92a0024fd38e550a24f594438f6f908bf7ae106809` |
| 35 | `M` | `backend/src/main/java/com/rikkei/jobs/identity/service/IdentityPublicService.java` | 1523 | `c1cd087bbcf0ecd120cb41c660bd8e9db2de061fa626e34f44537da62e100352` |
| 36 | `M` | `backend/src/main/java/com/rikkei/jobs/identity/service/impl/IdentityPublicServiceImpl.java` | 19684 | `34f3e04d0921b0dbb33901f948e639eb2f0de322d847f1afd64df598913257c9` |
| 37 | `M` | `backend/src/main/java/com/rikkei/jobs/internship/service/InternshipPersistenceService.java` | 727 | `d21efbb26a56f53f727bb4e8f6a89cdd7df345c199038c7f242b51f16069e701` |
| 38 | `M` | `backend/src/main/java/com/rikkei/jobs/internship/service/impl/InternshipPersistenceServiceImpl.java` | 9509 | `6118203d0f6317c3c87f3ba50bcf4872d8717858d5ff2b72d5396411724ca8a0` |
| 39 | `M` | `backend/src/main/java/com/rikkei/jobs/internship/service/impl/InternshipSyncServiceImpl.java` | 4445 | `103bb150e61998eab3bac53a899402e1c1dc42b1246274fcf9c9d754439f304d` |
| 40 | `M` | `backend/src/main/resources/application.yml` | 4253 | `092fe8758b984a2d002e6bd2323c9ffe769a0abea1ee89c37dae0188677c166a` |
| 41 | `M` | `backend/src/test/java/com/rikkei/jobs/ai/AiGovernanceIntegrationTest.java` | 28262 | `91bf87c6cbaa8733f6ace2b9ce6d3a05710fbb13bbcfd14e6bcddba0d5e71b50` |
| 42 | `M` | `backend/src/test/java/com/rikkei/jobs/candidate/CandidatePublicServiceInternshipTest.java` | 38305 | `713ac9478a81bc1f1e3791ee86637c5d747a2bf7e68b771ec2d8beff75ae8470` |
| 43 | `M` | `backend/src/test/java/com/rikkei/jobs/candidate/SkillProfileIntegrationTest.java` | 17811 | `122442b2e465e21f771b44a3993cae91eba5f80010c59287c02c86bca360f897` |
| 44 | `M` | `backend/src/test/java/com/rikkei/jobs/common/security/RoutePolicyRegistryTest.java` | 13520 | `89309ca3caff7b2fa80b2546df56981ab6c65ed0e7a53bbffe0c4dd28177707a` |
| 45 | `M` | `backend/src/test/java/com/rikkei/jobs/internship/InternshipControllerIntegrationTest.java` | 34858 | `79f4af0ac8bc365e828cd54d3658dbf625718ccd2346e13fc9bbc45e31945052` |
| 46 | `M` | `backend/src/test/java/com/rikkei/jobs/internship/InternshipSyncServiceTest.java` | 30135 | `3bb3ec4cf418ec86c0a005743dcc42c096a6fc00698a843419834aea91a6c983` |
| 47 | `M` | `backend/src/test/java/com/rikkei/jobs/migration/CompanyMigrationIntegrationTest.java` | 31156 | `ca209b6510427d5023af5a471cd2b30dab12543c44cdabc11d6b0160822108af` |
| 48 | `M` | `backend/src/test/java/com/rikkei/jobs/migration/DefaultProfileIntegrationTest.java` | 9695 | `431c0266c4c0876b7e87b6b39b6a7d93defd1dd256ef4b45dec8c9800a1760cc` |
| 49 | `M` | `backend/src/test/java/com/rikkei/jobs/migration/InternshipMigrationIntegrationTest.java` | 27013 | `970eda919aa8f1dda732245966e9f92ba16842fed66ec843fa719933a3f09a15` |
| 50 | `M` | `backend/src/test/java/com/rikkei/jobs/migration/ProfileSeparationIntegrationTest.java` | 23738 | `e8f5a964ed29cc5b5d31f6a51da672deb052850468ad483acc7cfc4032035b48` |
| 51 | `M` | `backend/src/test/java/com/rikkei/jobs/migration/RecruitmentMigrationIntegrationTest.java` | 41562 | `c23584631987bead4f83eb7f310c88f98572ff7d9410b1bf2be70cb41d97bbf7` |
| 52 | `M` | `backend/src/test/java/com/rikkei/jobs/security/RbacPermissionMatrixIntegrationTest.java` | 71666 | `78322b19cedb5b9d5052f4dc1900723a02d78be4820938f5b4df9ed09764a84c` |
| 53 | `M` | `backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java` | 22681 | `0cbc466ebf632e859bd9c5130ee6d62c85bbef29c78dfe387567cd09a815d909` |
| 54 | `M` | `cspell.json` | 5275 | `b3b3a74d590f09b78a0bfd15f993ce1e8e95cee95ff1a596dbade97562b6f6c2` |
| 55 | `M` | `docker-compose.yml` | 7099 | `e220100d535ea0a40b82cebf9ccf5e2d1eea84cfdc4f30ac77ddc2604b5ba376` |
| 56 | `M` | `docs/01-architecture-overview.md` | 29184 | `a4e2f228feb8f69e84b864c76a4bbf525fa391cd0f74ca1e8e5e0320044dc721` |
| 57 | `M` | `docs/05-open-business-questions.md` | 43294 | `3742217f6d228430d4073c16e9d691279413515091c15163ec4605dfde06b0bb` |
| 58 | `M` | `docs/erd/README.md` | 81637 | `cd5250f8dfc94f202ff99606dd6a297084a5736407724346974782efd1a4504e` |
| 59 | `M` | `docs/hs-01-skill-profile.md` | 33522 | `76d029d7ff96580b26561812b488f33563f8144d893131bbf1d51886e22a1d33` |
| 60 | `M` | `e2e/run-all.mjs` | 7715 | `c903b0d148a0feb785b3647e0c55d640708149a4938e223a9870f67b38960c78` |
| 61 | `M` | `e2e/tier1-features/test_openapi_docs.test.mjs` | 32510 | `83b83ba22f0758686988fdd381adb97b583d8f12c2047268d46fee5d2e2ee8df` |
| 62 | `M` | `frontend/src/App.tsx` | 29461 | `9de0bcabd8fd1fee3d05fe617245e111cfd03f77bfcbfee2713409fee0948841` |
| 63 | `M` | `frontend/src/features/candidate/components/SkillProfilePage.test.tsx` | 13758 | `2565e48b455f68e5489c902ba5f363d5b31aa1ad34de5bb515e016860db8bca3` |
| 64 | `M` | `frontend/src/features/candidate/components/SkillProfilePage.tsx` | 13504 | `897111d910a94fff91b1eb6d9a5ca7a7f223c1e6e923f5d740a07eacbe31b5ac` |
| 65 | `M` | `frontend/src/features/candidate/index.ts` | 2423 | `fe46475960180a3b3ccec406a6bf5658938663c7569f3fb4cf8cc24ecf1f3a5d` |
| 66 | `M` | `frontend/src/features/candidate/skillProfile.css` | 10244 | `0c2c10a3c533978b25d9024084415be18ed320406d75f2b2edd65df66ef6c841` |
| 67 | `M` | `frontend/src/features/identity/__tests__/SharedAppLayout.test.tsx` | 62570 | `089918b7a87358fef4253f82ce49d3fbd9f11760962ce5d834b107db433df22c` |
| 68 | `M` | `frontend/src/features/identity/__tests__/roleUtils.test.ts` | 18901 | `0dc0c485bd7964f8123d6c3b7b7ce8b34a38a7efdb16f65046ca97d8fc536298` |
| 69 | `M` | `frontend/src/features/identity/config/roleMenuConfig.ts` | 3749 | `3fe24e580dabf58d6787a2feb6f6e0ac466c9e5ff1304522d824e2ba7f66ff6e` |
| 70 | `M` | `frontend/src/features/identity/config/routePolicies.ts` | 3553 | `b17c46110637bbd99f4758b3a88c86f721cbc77fcc5b5102b0b146d06aa5cd7d` |
| 71 | `M` | `frontend/src/shared/components/Icon.test.tsx` | 2616 | `580f0ad30ff342cd65e724d78b9f6bdcc23aa3a9bf919704fe508c9326ba177b` |
| 72 | `M` | `frontend/src/shared/components/Icon.tsx` | 8678 | `f51afbf659fb47f48c9c80ab177783f758438f4f80da0a8d2002b831258f7b9c` |
| 73 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/config/SyncExecutorConfig.java` | 1239 | `558260824aeafcc62ad2f7af12c16d3aa1179309fc6cd48797384342a4fff663` |
| 74 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/config/SyncProperties.java` | 1518 | `314badfb26930847ad722780a04a30c3b21e66b3425bcdf007b8d429b4b03fba` |
| 75 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/controller/StaffDataSyncController.java` | 12062 | `d8c694c3f4e7de3c692f75806bbad15d4f5069f4869515e907fd41641c55e7fe` |
| 76 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/ExternalRecordResponse.java` | 657 | `ae65692b0a39f972ff008d0a9881720d06f29aa5e4940982f11bd97601ad3f15` |
| 77 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/ManualOverrideDto.java` | 338 | `f10e52b6acfa075882bc9d7865a0acd735889b1e5912544dc1a4f1c84ce98a69` |
| 78 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/ManualOverrideRequest.java` | 964 | `fb61be53f3fdbcaa00a26ddea93ca66748a9f912b10dc44877870c6eb98725c2` |
| 79 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/ManualOverrideValueDeserializer.java` | 1670 | `599c16be15a93efa151468fd2fd0ae2eeb10177d12b638d7a77dd0f7d1b7116a` |
| 80 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/SourceSyncCounts.java` | 236 | `8474c296029f8280f0728fa2ffe76fd2645c79d6f10e3808afa46df6c5fcd431` |
| 81 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/SyncCounts.java` | 212 | `0ff5cb7998cbe57257e95c5b785fbc92468ba44b8e701946d13642b6ff989b72` |
| 82 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/dto/SyncRunResponse.java` | 523 | `1252bdb3eb94594a5f9562a22cc3d0251e46a06c4213a1b5304c8fabc4a32be1` |
| 83 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/model/ManualOverride.java` | 1923 | `3e8cba5000dca2d44a105013175c8c9693e958a8794980637ffd0eb2b233259c` |
| 84 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/model/SyncRun.java` | 2383 | `55004382b5ca8fa3204cfd2e0f350161491a8324fdf9ce81b25d72479e0bc990` |
| 85 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/model/SyncStatus.java` | 169 | `6d6dd80f7e5a0bf54c7d9746bfc71c106019c782af6d3d37c9a381ea1131b6fb` |
| 86 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/model/SyncTrigger.java` | 183 | `b2b5a220812979a073bee2e3201f48e459df6f7a6c6f902c741de3da379fe25e` |
| 87 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/repository/ManualOverrideRepository.java` | 548 | `68aaf27c8c1e953d843dc1dd0a80d15d59106ad4d9ca5f95dc86a528dd83ebf2` |
| 88 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/repository/SyncRunRepository.java` | 1136 | `7571a87a0ea6cf82f4d46dbe9dbdb2d35b985dea71397417d7abbb9e0829dba0` |
| 89 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/CandidateSkillLockService.java` | 1258 | `d1fb3d8a5cf34232306f1da62ce166cde6f875240c89028a6e4490a652dfa45a` |
| 90 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/ExternalRecordNormalizer.java` | 33242 | `553c2a4b7706478cbcf4517d1326454d377e65f5f3f4130bd007991e0c7786e1` |
| 91 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/ExternalSyncService.java` | 11662 | `1610f5352e84744a43c8330332a94e962fdeb8176e4459918a1824bcccd7fb9a` |
| 92 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/NightlySyncJob.java` | 7630 | `b1e7d95fec5fe79d1b521be491581caa64ca56c7184ec9771a1d0ce3a332111c` |
| 93 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/OnOpenSyncService.java` | 3875 | `a75d2cb0f78b8bdd8e6f6987a31862dd7cb6fb1c07a7da4f95e8badfd92545bf` |
| 94 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/StaffDataSyncService.java` | 24306 | `03d6076efdfb0fa9022133abdcc5fdaa41e6ca79adcefb762dec4ec20ea8362d` |
| 95 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/SyncFailureLogger.java` | 4035 | `041ab5e709ffa8e348bb3530369bc62ad06b719ddaa7b5734275451f0590eebd` |
| 96 | `??` | `backend/src/main/java/com/rikkei/jobs/candidate/service/SyncRunPersistenceService.java` | 4553 | `d5381f6527d077e75316beda7ffaee142bc550674627ed7218d686b1c019d63c` |
| 97 | `??` | `backend/src/main/java/com/rikkei/jobs/identity/dto/CandidateSyncSummaryDto.java` | 432 | `37affd585f0ee683921dc5b8b51678302f33cdacb919ce590352fc11c39b7859` |
| 98 | `??` | `backend/src/main/java/com/rikkei/jobs/identity/dto/CandidateSyncTargetDto.java` | 560 | `a6da85b20bb41b429394ddada75e58074b90b8bc9dde495d5ab734326e6a0e32` |
| 99 | `??` | `backend/src/main/resources/db/migration/V25__nt05_external_sync.sql` | 6664 | `70909848963f872d0efaf5c59e4af1ab8d7275d7f7a133ecc81d9552fa35f650` |
| 100 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/ExternalSyncServiceIntegrationTest.java` | 28862 | `08c430d2141a19fd09d8b49d2c56b583217d101697a22f72855ed616e180669d` |
| 101 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/G2RootLoggerLeakIntegrationTest.java` | 11524 | `35401109ed3498fa112689d24b33a84e36699ca86bd9d50d9a55eb8d03c040b9` |
| 102 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/NightlySyncJobIntegrationTest.java` | 8264 | `73d2320599c480b50e866170453dbf9bd2675b624cc4d979547f78ca407c4830` |
| 103 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/OnOpenSyncNoLmsUserIdIntegrationTest.java` | 5779 | `8f01acabe1ee499c08631662ed4217e6c88e244c106d50c9f9d1205a19628edf` |
| 104 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/OnOpenSyncServiceTest.java` | 10446 | `fb44565e22875420a8acb3828405ac03e961be43736b7b55eb6f74a33b85a04a` |
| 105 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/PmPayloadConsistencyIntegrationTest.java` | 13682 | `2e1d270906ad23b0c912ecea70d705d48c7456c078ccf3ae04ec188c073b62f2` |
| 106 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/SkillRecomputeConcurrencyIntegrationTest.java` | 11589 | `d303c68e3bc382ae3354e54db78f1560d5b34e66a6552bb7c26335c932cb2d9e` |
| 107 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/StaffDataSyncIntegrationTest.java` | 31847 | `530cdc9844b5e6e13818176bbc0be996dbd837919846e9e3af2475abfee016ff` |
| 108 | `??` | `backend/src/test/java/com/rikkei/jobs/candidate/SyncFailureLoggingTest.java` | 28311 | `6cebaa3f8419bd35c5ad95628341f884a243816b7b9570f79f7c7354d731ac91` |
| 109 | `??` | `backend/src/test/java/com/rikkei/jobs/client/ExternalApiClientSyncTest.java` | 9093 | `d581e7277ec25631a555f8dab9fd7ae5312680a477a6042542d2204bf214be78` |
| 110 | `??` | `backend/src/test/java/com/rikkei/jobs/identity/IdentitySyncQueryIntegrationTest.java` | 8455 | `0a46c9ac6e5ced57f5f20a1155f17af6c6246aed0d9099a3eef58f2566428a59` |
| 111 | `??` | `backend/src/test/java/com/rikkei/jobs/internship/InternshipConcurrencyIntegrationTest.java` | 10386 | `b8a595619d2cf1a29bbcd4bb1b5911e06611cc5760a245987a8ae7f0a19d417e` |
| 112 | `??` | `backend/src/test/java/com/rikkei/jobs/migration/V25UpgradeMigrationIntegrationTest.java` | 21737 | `732aca4a9b7c9aee7cc4793389d7c98567bffefd9a453927d47a6fbae477fbc8` |
| 113 | `??` | `docs/nt05/BROWSER_OBSERVATIONS.md` | 27821 | `14708a6ff8acf309a11efe168ef08c4b7f2f65c66e24504f06303171c1d6a6f8` |
| 114 | `??` | `docs/nt05/PHASE0_ACK.md` | 95641 | `4ac8eef687cf1e65f5e27ac25cf3d92377d87a00e6f1cd7c76ae6c201a3f3da2` |
| 115 | `??` | `docs/nt05/PR_DESCRIPTION.md` | 34006 | `2526d9bf230a6650d2573734797588eee27b285110687401d053209d523563f1` |
| 116 | `??` | `docs/nt05/README.md` | 22377 | `0355c86a82f107be753a770828201f606b3978d96fcf4b7595ba79af69c7a2c1` |
| 117 | `??` | `e2e/tier1-features/test_data_sync.test.mjs` | 27529 | `2ad5b9a51af8c619851ab7b43364ffc5295b9c6e9d45572cce33707a42b3d372` |
| 118 | `??` | `frontend/src/features/candidate/__tests__/StaffDataSyncPage.test.tsx` | 102582 | `054ff76312b49b53375fb378d4fe5e405a819141db0f99e47d75de354db99b77` |
| 119 | `??` | `frontend/src/features/candidate/api/staffDataSyncApi.ts` | 7140 | `4c55b6ae499e5deb5f89b1439644f1b224bb4121cd2a8c55963200632bfcaee1` |
| 120 | `??` | `frontend/src/features/candidate/components/ManualOverrideDialog.tsx` | 17156 | `ee8ebc00b263fa60e4736a75ae46c0c6dbaabf8a8332271aea11789c10db2131` |
| 121 | `??` | `frontend/src/features/candidate/components/SyncStatusBadge.tsx` | 595 | `237ade48147a25ff9a147c8918c2c3a0a2affa020a368a340e61206285c9370e` |
| 122 | `??` | `frontend/src/features/candidate/pages/StaffDataSyncPage.tsx` | 83857 | `66ce936f376c095bb72888450df161170d91693573e690523392e486adc6fd7b` |
| 123 | `??` | `frontend/src/features/candidate/styles/staffDataSync.css` | 15762 | `a8ba723bc344bce38371029b81eb9f4098cb15a20cdb233c4a5fa346ec19804c` |
| 124 | `??` | `frontend/src/features/candidate/types/dataSync.types.ts` | 2343 | `5286283c68e0eac14618788eec5d6fcdbeed30f05200afd8af4d1403a6bcf3c5` |
| 125 | `??` | `frontend/src/shared/utils/dialogFocusUtils.ts` | 1287 | `84edf292eaa21f3602bc7634089a7f38886e98ba65e2ae461f2e16e56e95bf82` |

### 2. Mandatory Working Method (Verbatim from `PROMPT_BASE_RULES_EN.txt` R1)

> "Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi."

### 3. Files Read Before Any `NT-05-fix3` Edit

1. **Binding Prompts**:
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (`R0`-`R3`, lines `1`-`54`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_EN.txt` (`D1`-`D11`, sections `0`-`10`, lines `1`-`199`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX_EN.txt` (`F1`-`F12`, gates `(H)`-`(I)`, lines `1`-`100`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX2_EN.txt` (`G1`-`G8`, sections `0`-`6`, lines `1`-`87`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX3_EN.txt` (`I1`-`I3`, sections `0`-`6`, lines `1`-`63`)
2. **Root Agent Entrypoints & Linter Configs**:
   - `CLAUDE.md` (`47` lines), `GEMINI.md` (`61` lines), `AGENTS.md` (`44` lines)
   - `.markdownlint-cli2.jsonc` (`11` lines), `cspell.json` (`334` lines)
3. **All 16 Enterprise Rules (`.claude/rules/`)**:
   - `01-project-context.md` (`94` lines), `02-git-and-delivery.md` (`90` lines), `03-safety-and-secrets.md` (`70` lines), `04-honest-verification.md` (`59` lines)
   - `05-backend-java.md` (`83` lines), `06-database-flyway.md` (`73` lines), `07-security-rbac.md` (`78` lines), `08-frontend-engineering.md` (`79` lines)
   - `09-frontend-design-bar.md` (`79` lines), `10-testing-strategy.md` (`66` lines), `11-docs-and-bilingual.md` (`53` lines), `12-ci-and-quality-gates.md` (`85` lines)
   - `13-backend-data-access-performance.md` (`79` lines), `14-backend-module-boundaries.md` (`66` lines), `15-backend-observability-ops.md` (`80` lines), `16-backend-integrations.md` (`93` lines)
4. **Applicable Skills Read in Full (`.claude/skills/<name>/SKILL.md`)**:
   - `using-rikkei-skills`, `systematic-debugging`, `test-driven-development`, `frontend-feature-slice`, `frontend-visual-design`, `frontend-accessibility-audit`, `frontend-taste-anti-slop`, `docs-bilingual-update`, `verification-before-completion`, `handoff-to-team-lead`, `ci-local-and-debug`, `receiving-code-review`.
5. **Prior ACK**:
   - `docs/nt05/PHASE0_ACK.md` (`611` lines prior to `NT-05-fix3` append).

### 4. Concrete Constraints for Rules `01`-`16` (`NT-05-fix3`)

| Rule | Concrete Constraint for `NT-05-fix3` |
|---|---|
| `01-project-context.md` | Keep 9-package Modular Monolith, 5 roles, pinned versions in `docs/03-version-table.md`, zero new dependencies, and `T022C02:` prefix. |
| `02-git-and-delivery.md` | Git strictly READ-ONLY on `feature/t022c02-ket-noi-du-lieu` (`HEAD` `17b1ae8`); preserve all prior `NT-05`, `NT-05-fix`, and `NT-05-fix2` edits; propose `T022C02:` commits in English. |
| `03-safety-and-secrets.md` | Never read or print `.env` or `*.pem`; write only inside `rikkei-jobs`; keep `backend/`, `mock/`, `e2e/`, and package manifests untouched; clean up temp files and Docker resources (`docker compose down -v`). |
| `04-honest-verification.md` | Report PASS only from real commands exiting `0` with raw stdout/stderr; mark any unexecuted item `NOT VERIFIED`; zero `console.log`/`System.out.println`/`TODO`. |
| `05-backend-java.md` | Zero edits under `backend/` (verified by SHA-256); run clean Maven build + backend suite (`1453`/`105`) as regression gate. |
| `06-database-flyway.md` | Zero edits to `V1..V25` or any DB file; any temporary `external_records` rows inserted in local dev DB for records paging `/browser` test stay strictly inside ephemeral Docker stack destroyed via `docker compose down -v`. |
| `07-security-rbac.md` | Preserve `STAFF` route protection (`PROTECTED_ROUTE_POLICIES`) and session handling unchanged. |
| `08-frontend-engineering.md` | TypeScript strict (zero `any`/`@ts-ignore`); `httpClient` + `AbortSignal`; fix `I1` (no stale loading wording on any pager/filter/total after failure) and `I2` (explicit previous-query empty snapshot vs current query/filter + keyboard-accessible reset button without focus drop to `BODY`). |
| `09-frontend-design-bar.md` | Zero emoji, `--rj-*` tokens only, keep existing Dense mode layout/styling intact except minimal changes strictly needed for `I1`/`I2` (avoid unrelated restyling). |
| `10-testing-strategy.md` | RED then GREEN for `I1` (all 3 pagers) and `I2` (candidates and runs, loading and failed; plus check records list); no changes to `develop` assertions; 20 consecutive `--reporter=verbose` Vitest runs (`0` fail, `0` `act()`); update Rule 10 baselines with final real counts (`I3`). |
| `11-docs-and-bilingual.md` | Fix `README.md` `"Individual checks and verified baselines"` and any other stale counts introduced by `NT-05` (`I3`), preserving historical round sections; append `NT-05-fix3` sections to `PHASE0_ACK.md`, `PR_DESCRIPTION.md`, `BROWSER_OBSERVATIONS.md`; `markdownlint-cli2` + `cspell` exit `0`. |
| `12-ci-and-quality-gates.md` | Add zero new quality gates; pass clean Maven build, `./check.sh` and `.\check.ps1` identically (`26/26`); never invoke `scripts/run-ci-in-docker.*`; run `sync-agent-config.mjs --check` and `validate-agent-config.mjs`. |
| `13-backend-data-access-performance.md` | Unchanged (`backend/` untouched). |
| `14-backend-module-boundaries.md` | Unchanged (`backend/` untouched). |
| `15-backend-observability-ops.md` | Unchanged (`backend/` untouched). |
| `16-backend-integrations.md` | Unchanged (`backend/` untouched). |

### 5. Applicable Skills for `NT-05-fix3` and Why

- `using-rikkei-skills`: Governs precedence (`PROMPT_NT05_FIX3_EN.txt` > earlier round prompts > `PROMPT_BASE_RULES_EN.txt` > Rules `01`-`16` > Skills) and mandatory `Re-read:` logging before each change group.
- `receiving-code-review`: Governs disciplined remediation of Team Lead findings `I1`-`I3` within strict scope (no backend/mock/e2e/manifest edits, no unrelated restyling).
- `systematic-debugging`: Guides root-cause isolation of `I1` (pager loading/filter/total wording persisting after request failure) and `I2` (previous-query empty snapshot rendered under new loading/failed query across candidates, runs, and audit of records list).
- `test-driven-development`: Mandates RED -> GREEN automated tests for `I1` (3 pagers) and `I2` (candidates & runs, loading & failed) before editing `StaffDataSyncPage.tsx`.
- `frontend-feature-slice`, `frontend-visual-design`, `frontend-accessibility-audit`, `frontend-taste-anti-slop`: Govern async snapshot state clarity, authentic Vietnamese copy with full diacritics, keyboard focus safety on `"Đặt lại bộ lọc"` (`document.activeElement !== BODY`), and WCAG 2.2 AA compliance.
- `docs-bilingual-update`, `ci-local-and-debug`, `verification-before-completion`, `handoff-to-team-lead`: Govern `I3` baseline synchronization (`README.md`, repo docs audit, Rule 10 + `sync-agent-config.mjs --check`), `NT-05-fix3` doc sections, `26/26` gates, 20 consecutive Vitest runs, Docker E2E, `/browser` verification, and final Vietnamese handoff report.

### 6. Proof Plan for Defects `I1`-`I3`

| Defect | Proof Type | Concrete Verification Method |
|---|---|---|
| `I1` | RED -> GREEN + `/browser` | Failing Vitest assertions across all 3 pagers (candidates, records, runs) when paging fails (`Trang 1 / 2 (đang tải trang 2)` persists after failure, or stale filter/query/total wording) -> fix `StaffDataSyncPage.tsx` -> GREEN across 20 runs + `/browser` (`docker stop rikkei-backend`) at `375px` and `1440px` with inspected PNGs. |
| `I2` | RED -> GREEN + Records audit + `/browser` | Failing Vitest assertions for candidates & runs when previous query/filter returned empty and new query/filter is loading or failed -> fix `StaffDataSyncPage.tsx` (plus explicit audit & test if needed for records list) and verify keyboard-only `"Đặt lại bộ lọc"` focus never drops to `BODY` -> GREEN + `/browser` at `375px` and `1440px` with inspected PNGs. |
| `I3` | Before -> After | Before/after grep & diff of `README.md` (`Individual checks and verified baselines`), any other stale `NT-05` doc counts (preserving historical sections), Rule 10 baselines (`sync-agent-config.mjs --check`), and `NT-05-fix3` sections in `PHASE0_ACK.md`, `PR_DESCRIPTION.md`, `BROWSER_OBSERVATIONS.md`. |

### 7. `NT-05-fix3` Re-read Log

<!-- Append one line before each NT-05-fix3 change group: Re-read: <rule numbers and skill names>, before <change group> -->
Re-read: 01, 02, 03, 04, 11, 12, using-rikkei-skills, docs-bilingual-update, receiving-code-review, before M0 (NT-05-fix3 Phase 0 baseline and PHASE0_ACK.md)
Re-read: 01, 02, 03, 04, 08, 09, 10, 12, systematic-debugging, test-driven-development, frontend-feature-slice, frontend-visual-design, frontend-accessibility-audit, frontend-taste-anti-slop, receiving-code-review, before M1 (I1 and I2 RED tests and StaffDataSyncPage.tsx fixes)
Re-read: 01, 02, 03, 04, 10, 11, 12, docs-bilingual-update, ci-local-and-debug, verification-before-completion, handoff-to-team-lead, before M2 (I3 baseline updates, agent-config Rule 10 sync, and NT-05-fix3 doc sections)
Re-read: 01, 02, 03, 04, 11, 12, using-rikkei-skills, docs-bilingual-update, ci-local-and-debug, verification-before-completion, handoff-to-team-lead, before M3 (NT-05-fix3 live /browser verification results in BROWSER_OBSERVATIONS.md, PR_DESCRIPTION.md, and PHASE0_ACK.md)

---

## NT-05-fix3 — Final Gate Sign-Off

- **Scope & Immutability**: Zero files under `backend/`, `mock/`, `e2e/`, `package.json`/`pom.xml`, `V1..V25`, or `mock/data.json` were modified (SHA-256 byte-identical to `NT-05-fix3` Phase 0 baseline); Git remains strictly READ-ONLY on `feature/t022c02-ket-noi-du-lieu` (`HEAD` `17b1ae8`) with zero `.agents/teamwork/` artifacts inside the repository.
- **Defects Resolved (`I1`–`I3`)**:
  - `I1`: Verified RED -> GREEN across all 3 pagers (`candidates`, `records`, `runs`) plus runs total line (`runsSnapshot === null` and stale refreshes).
  - `I2`: Verified RED -> GREEN across candidates, runs, and records empty states during loading and failure, plus keyboard focus preservation on empty-state `"Đặt lại bộ lọc"`.
  - `I3`: Updated `README.md` (`1453/105`, `637/51`, `31/366/2480`), synced `agent-config/rules/10-testing-strategy.md` (`635 -> 637`) to `.claude/` and `.gemini/`, and appended `NT-05-fix3` sections to `PHASE0_ACK.md`, `PR_DESCRIPTION.md`, and `BROWSER_OBSERVATIONS.md`.
- **Verification**: Clean Maven build (`1453/105`, Spotless `457/457`, SpotBugs `0`), Frontend (`lint`, `typecheck`, `build` `87.78 kB` JS / `14.23 kB` CSS gzip, `20/20` Vitest `637/51` with `0` `act()`), E2E (`31/366/2480` + scoped `docker compose down -v`), `.\check.ps1` (`26/26`), `./check.sh` (`26/26`), and live `/browser` (`I1`/`I2` at `1440x900` & `375x812`, `22` real runs + temporary DB paging rows, `docker stop/start rikkei-backend`, keyboard focus check, `6/6` inspected PNGs in `docs/nt05/pr-screenshots/`, `0` console errors) followed by final scoped `docker compose down -v`.

---

## NT-05-fix4 — Phase 0 Acknowledgement

- Round: `NT-05-fix4` (`T022C02`) — Resolve `J1` (stop the uncommitted `NT-05` E2E suite from exceeding the per-IP password-login rate limit `160` requests/60s window)
- Precedence: `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX4_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX3_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX2_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_NT05_EN.txt` (`D1`-`D11`) > `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (`R0`-`R3`) > `.claude/rules/01..16` > Repository Skills
- Encoding & Line Endings: UTF-8 without BOM, LF (`\n`), zero emoji

### 1. Starting Git State & SHA-256 Immutability Anchors

- Active branch: `feature/t022c02-ket-noi-du-lieu`
- Base `HEAD`: `17b1ae8` (`17b1ae8704d3e0a2cb36053d533c8616b326d5c8`)
- Uncommitted working tree baseline (`git status --porcelain -uall`): `125` entries (`72` modified `M`, `53` untracked `??`), `0` staged, all preserved intact prior to `NT-05-fix4` edits.
- Complete SHA-256 baseline manifest: `790` files (all `125` status entries plus all files under `backend/`, `frontend/`, `mock/`, `e2e/`, `.github/`, `docker-compose.yml`, `.env.example`, `check.sh`, `check.ps1`, and manifests excluding `node_modules`/`target`/`dist`/`.m2`) recorded in the Teamwork scratch baseline before any edit.
- Key immutability SHA-256 anchors verified at Phase 0:
  - `e2e/tier1-features/test_data_sync.test.mjs`: `2ad5b9a51af8c619851ab7b43364ffc5295b9c6e9d45572cce33707a42b3d372` (`27529` bytes) — authorized to change per `J1`
  - `e2e/tier2-boundaries/test_rbac_matrix_boundaries.test.mjs`: `bc1ea84512839c587f7a3173204038f7af0a781a04b95df4ce13007ba8c14953` (`46088` bytes) — authorized only to extend header comment and add `TC-T2-RBAC-14` per `J1`
  - `e2e/run-all.mjs`: `c903b0d148a0feb785b3647e0c55d640708149a4938e223a9870f67b38960c78` (`7715` bytes) — immutable
  - `backend/src/main/resources/db/migration/V25__nt05_external_sync.sql`: `70909848963f872d0efaf5c59e4af1ab8d7275d7f7a133ecc81d9552fa35f650` (`6664` bytes) — immutable
  - `mock/data.json`: `36ea41fba86b3e062235b4badeca72a2ddeb0ebdc731a43f176bc7379e80b188` (`6819` bytes) — immutable
  - `docker-compose.yml`: `e220100d535ea0a40b82cebf9ccf5e2d1eea84cfdc4f30ac77ddc2604b5ba376` (`7099` bytes) — immutable
  - `.env.example`: `ee980d76f275754dc44e7e3ee31fa5ae8c27cc3109840efdf049d48861d94930` (`5024` bytes) — immutable
  - `check.sh`: `5189ef7875972e54ebaf5b68c66775eca643cdb208a5617b318ef41f52dd8807` (`19880` bytes) — immutable
  - `check.ps1`: `063049674a14c382c7c58a4a3f8af09b18dc2c71fd60a32235a6e31ab001dab8` (`24220` bytes) — immutable
  - `backend/pom.xml`, `frontend/package.json`, `mock/package.json`, `.github/`, and all files under `backend/`, `frontend/`, `mock/`, and other `e2e/` files — immutable

### 2. Mandatory Working Method (Verbatim from `PROMPT_BASE_RULES_EN.txt` R1)

> "Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi."

### 3. Files Read Before Any `NT-05-fix4` Edit

1. **Binding Prompts**:
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (`R0`-`R3`, lines `1`-`54`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_EN.txt` (`D1`-`D11`, lines `1`-`199`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX_EN.txt` (`F1`-`F12`, lines `1`-`100`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX2_EN.txt` (`G1`-`G8`, lines `1`-`87`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX3_EN.txt` (`I1`-`I3`, lines `1`-`63`)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT05_FIX4_EN.txt` (`J1`, lines `1`-`75`)
2. **Root Agent Entrypoints & Docs**:
   - `CLAUDE.md` (`47` lines), `GEMINI.md` (`61` lines), `AGENTS.md` (`44` lines)
   - `docs/nt05/PHASE0_ACK.md`, `docs/nt05/PR_DESCRIPTION.md`, `README.md`, `cspell.json`
3. **All 16 Enterprise Rules (`.claude/rules/`)**:
   - `01-project-context.md` through `16-backend-integrations.md` (all 16 files read in full)
4. **Applicable Skills Read in Full (`.claude/skills/<name>/SKILL.md`)**:
   - `using-rikkei-skills`, `systematic-debugging`, `test-driven-development`, `spring-security-rbac-endpoint`, `api-contract-and-errors`, `ci-local-and-debug`, `docs-bilingual-update`, `verification-before-completion`, `handoff-to-team-lead`
5. **Target E2E Files**:
   - `e2e/tier1-features/test_data_sync.test.mjs`, `e2e/tier2-boundaries/test_rbac_matrix_boundaries.test.mjs`, `e2e/run-all.mjs`, `e2e/config.mjs`, `e2e/helpers/company-fixtures.mjs`, `e2e/helpers/http-client.mjs`

### 4. Concrete Constraints for Rules `01`-`16` (`NT-05-fix4`)

| Rule | Concrete Constraint for `NT-05-fix4` |
|---|---|
| `01-project-context.md` | Keep 9-package Modular Monolith, 5 roles, pinned versions, zero new dependencies, and `T022C02:` prefix. |
| `02-git-and-delivery.md` | Git strictly READ-ONLY on `feature/t022c02-ket-noi-du-lieu` (`HEAD` `17b1ae8`, `0` staged); preserve all `125` uncommitted entries; propose `T022C02:` commits in English; follow Rule 04 §4 backup/SHA-256 restore for deliberate break test. |
| `03-safety-and-secrets.md` | Never read `.env` or `*.pem`; write only inside `rikkei-jobs` (temp preload/logs/backup only in OS temp and deleted afterwards); keep `backend/`, `frontend/`, `mock/`, other `e2e/` files, `docker-compose.yml`, `.env.example`, `.github/`, `check.sh`, `check.ps1`, and manifests untouched; tear down only project containers/volumes (`docker compose down -v`). |
| `04-honest-verification.md` | Report PASS only from real runs with raw stdout/stderr; capture RED aligned run, 3 consecutive GREEN aligned runs inside 1 clock minute, 1 arbitrary-second run, deliberate break + SHA-256 restore, and `26/26` gate parity; mark anything unexecuted `NOT VERIFIED`. |
| `05-backend-java.md` | Zero edits under `backend/` (proven by SHA-256); no rate-limit or security config edits. |
| `06-database-flyway.md` | Zero edits to `V1..V25` or any DB file (proven by SHA-256). |
| `07-security-rbac.md` | Move `TC-T1-NT05-01` intact to `TC-T2-RBAC-14` (`5` endpoints x `2` origins x `6` callers = `60` requests, verifying status, unified error body, `code`, Vietnamese diacritics, zero emoji, never mutating `hr1` password). |
| `08-frontend-engineering.md` | Zero edits under `frontend/` (proven by SHA-256). |
| `09-frontend-design-bar.md` | No UI change; `R2` (`/browser` and screenshots) does not apply (`NOT VERIFIED` / not applicable per prompt §0). |
| `10-testing-strategy.md` | Do not alter any existing case or `before()` in `test_rbac_matrix_boundaries.test.mjs`; keep all assertions of `TC-T1-NT05-02`..`07` intact without renumbering; zero password logins in `test_data_sync.test.mjs` via local SSO helper; no sleeps/waits/retries/skips or suite reordering; verify `158` password / `56` SSO per full run; update `README.md` & Rule 10 only if `run-all.mjs` counts change. |
| `11-docs-and-bilingual.md` | Append `NT-05-fix4` sections to `docs/nt05/PHASE0_ACK.md` and `docs/nt05/PR_DESCRIPTION.md` (stating `158/160` password and `56/60` SSO budget and small margin); update `README.md`/`cspell.json` only if needed; `markdownlint-cli2` and `cspell` exit `0`. |
| `12-ci-and-quality-gates.md` | Add zero new quality gates; pass `./check.sh` and `.\check.ps1` identically (`26/26`); never invoke `scripts/run-ci-in-docker.*`; run `sync-agent-config.mjs --check` if Rule 10 changes. |
| `13-backend-data-access-performance.md` | Unchanged (`backend/` untouched). |
| `14-backend-module-boundaries.md` | Unchanged (`backend/` untouched). |
| `15-backend-observability-ops.md` | Unchanged (`backend/` untouched). |
| `16-backend-integrations.md` | Unchanged (`backend/` and `mock/` untouched). |

### 5. Applicable Skills for `NT-05-fix4` and Why

- `using-rikkei-skills`: Governs prompt precedence (`PROMPT_NT05_FIX4_EN.txt` > prior round prompts > `PROMPT_BASE_RULES_EN.txt` > Rules `01`-`16` > Skills) and `Re-read:` logging before each change group.
- `systematic-debugging`: Guides empirical RED reproduction of the 60s fixed-window HTTP `429` failure (`163` password logins stopping early in `test_company_scenarios.test.mjs`) and verification of `158` password / `56` SSO after remediation.
- `test-driven-development`: Enforces RED aligned run before edits, lossless migration of `TC-T1-NT05-01` -> `TC-T2-RBAC-14`, local SSO helper in `test_data_sync.test.mjs` with zero password logins, and deliberate-break falsifiability on `TC-T2-RBAC-14`.
- `spring-security-rbac-endpoint` & `api-contract-and-errors`: Govern exact preservation of all `60` RBAC matrix checks across `:8080` and Nginx `:3000` (`401 UNAUTHORIZED`, `403 FORBIDDEN`, `403 MUST_CHANGE_PASSWORD`, Vietnamese diacritics, zero emoji).
- `docs-bilingual-update`, `ci-local-and-debug`, `verification-before-completion`, `handoff-to-team-lead`: Govern `NT-05-fix4` doc sections, conditional `README.md`/Rule 10 baseline updates, `./check.sh` & `.\check.ps1` (`26/26`), SHA-256 immutability proofs, clean Docker/temp teardown, and final Vietnamese report.

### 6. Proof Plan for `J1`

| Item | Proof Type | Concrete Verification Method |
|---|---|---|
| `RED` | Fresh stack aligned run (`:00`) | Pre-edit fresh stack + OS temp `NODE_OPTIONS=--import=...` preload log showing non-empty log, `429` lines in `test_company_scenarios.test.mjs`, and request counts (`163` password / `53` SSO, `30/31` suites) inside 1 clock minute. |
| `GREEN` (x3) | Fresh stack aligned runs (`:00`) | Three consecutive post-edit fresh stack runs starting at `:00`, each finishing within 1 clock minute (first & last timestamp reported), `31/31` suites PASS, `0` `429`, `158` password logins, `56` SSO calls. |
| `Arbitrary` | Fresh stack unaligned run | One post-edit fresh stack run at an arbitrary second: `31/31` PASS, `0` `429`, `158` password / `56` SSO. |
| `Counts` | `run-all.mjs` diff + deliberate break | Compare `31 / 366 / 2480` line by line; map all `60` requests `TC-T1-NT05-01` -> `TC-T2-RBAC-14`; run 1 deliberate break on `TC-T2-RBAC-14` (RBAC suite only) proving FAIL, restore, and verify SHA-256 match. |
| `Gates & Integrity` | `check.sh` / `check.ps1` + SHA-256 | Both gates `26/26` identical; SHA-256 comparison vs Phase 0 proving `backend/`, `frontend/`, `mock/`, other `e2e/` files, and immutable root/CI files unchanged; `git diff` of both E2E files; `git status` `0` staged; clean Docker & OS temp teardown. |

### 7. `NT-05-fix4` Re-read Log

<!-- Append one line before each NT-05-fix4 change group: Re-read: <rule numbers and skill names>, before <change group> -->
Re-read: 01, 02, 03, 04, 07, 10, 11, 12, using-rikkei-skills, systematic-debugging, test-driven-development, spring-security-rbac-endpoint, api-contract-and-errors, docs-bilingual-update, ci-local-and-debug, verification-before-completion, handoff-to-team-lead, before M0 (NT-05-fix4 Phase 0 ACK)
Re-read: 01, 02, 03, 04, 07, 10, using-rikkei-skills, systematic-debugging, test-driven-development, spring-security-rbac-endpoint, api-contract-and-errors, before M1 (move TC-T1-NT05-01 to TC-T2-RBAC-14 and switch test_data_sync.test.mjs to SSO)
Re-read: 01, 02, 03, 04, 10, 11, 12, docs-bilingual-update, ci-local-and-debug, verification-before-completion, handoff-to-team-lead, before M2 (update E2E assertion baseline 2480 -> 2486 in README.md and Rule 10, sync agent-config, append NT-05-fix4 docs)
Re-read: 01, 02, 03, 04, 11, 12, using-rikkei-skills, docs-bilingual-update, ci-local-and-debug, verification-before-completion, before M3 (fix truncated pre-edit SHA-256 of test_rbac_matrix_boundaries.test.mjs in NT-05-fix4 Phase 0 ACK)
