# Phase 0 Acknowledgement — Round NT-02 (`T022BB1`)

Document Path: `docs/nt02/PHASE0_ACK.md`
Task Code: `T022BB1`
Round: `NT-02` — 5-Role Data Model, Permission Framework, and API Contract
Branch: `feature/T022BB1-phan-quyen-5-vai-tro`
Base: `develop @ 348aadf` (`Merge pull request #18 from rikkei-jobs/feature/T0231B5-ho-so-cong-ty`)
Working Directory: `D:\GitHub\Rikkei\rikkei-jobs`
Timestamp: `2026-11-19T04:25:00Z`
Status: Completed Prior to Any Code, Migration, Test, Config, or Other Documentation Modification
Zero Emoji Compliance: Verified (0 emoji characters)

---

## Round NT-02

This Phase 0 acknowledgement is authored prior to any modification to backend Java code, Flyway migrations, frontend TypeScript/CSS/React components, E2E suites, agent configuration, or other repository documentation.

---

## 1. Inventory of Authoritative Files Read and Inspected

### 1.1 Prompts, Root Configurations, and Survey Reports Read

1. **Task and Base Specifications**:
   - `<teamwork-state>/ORIGINAL_REQUEST.md` (lines 1-61)
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (lines 1-45)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT02_EN.txt` (lines 1-61)
2. **Root Agent Configurations**:
   - `CLAUDE.md` (lines 1-47)
   - `GEMINI.md` (lines 1-61)
   - `AGENTS.md` (lines 1-44)
3. **All 16 Enterprise Rules (`.claude/rules/`)**:
   - `.claude/rules/01-project-context.md` (lines 1-94)
   - `.claude/rules/02-git-and-delivery.md` (lines 1-90)
   - `.claude/rules/03-safety-and-secrets.md` (lines 1-70)
   - `.claude/rules/04-honest-verification.md` (lines 1-59)
   - `.claude/rules/05-backend-java.md` (lines 1-83)
   - `.claude/rules/06-database-flyway.md` (lines 1-73)
   - `.claude/rules/07-security-rbac.md` (lines 1-78)
   - `.claude/rules/08-frontend-engineering.md` (lines 1-79)
   - `.claude/rules/09-frontend-design-bar.md` (lines 1-73)
   - `.claude/rules/10-testing-strategy.md` (lines 1-66)
   - `.claude/rules/11-docs-and-bilingual.md` (lines 1-53)
   - `.claude/rules/12-ci-and-quality-gates.md` (lines 1-85)
   - `.claude/rules/13-backend-data-access-performance.md` (lines 1-79)
   - `.claude/rules/14-backend-module-boundaries.md` (lines 1-66)
   - `.claude/rules/15-backend-observability-ops.md` (lines 1-80)
   - `.claude/rules/16-backend-integrations.md` (lines 1-93)
4. **All 28 Repository Skills (`.claude/skills/*/SKILL.md`)**:
   - `.claude/skills/using-rikkei-skills/SKILL.md` (lines 1-86)
   - `.claude/skills/brainstorming-before-building/SKILL.md` (lines 1-89)
   - `.claude/skills/writing-implementation-plans/SKILL.md` (lines 1-100)
   - `.claude/skills/executing-plans/SKILL.md` (lines 1-95)
   - `.claude/skills/dispatching-parallel-agents/SKILL.md` (lines 1-127)
   - `.claude/skills/test-driven-development/SKILL.md` (lines 1-89)
   - `.claude/skills/systematic-debugging/SKILL.md` (lines 1-90)
   - `.claude/skills/spring-security-rbac-endpoint/SKILL.md` (lines 1-160)
   - `.claude/skills/api-contract-and-errors/SKILL.md` (lines 1-157)
   - `.claude/skills/security-review-checklist/SKILL.md` (lines 1-138)
   - `.claude/skills/backend-module-feature/SKILL.md` (lines 1-148)
   - `.claude/skills/backend-module-boundaries/SKILL.md` (lines 1-157)
   - `.claude/skills/flyway-migration-authoring/SKILL.md` (lines 1-142)
   - `.claude/skills/module-domain-knowledge/SKILL.md` (lines 1-236)
   - `.claude/skills/backend-persistence-performance/SKILL.md` (lines 1-157)
   - `.claude/skills/frontend-feature-slice/SKILL.md` (lines 1-152)
   - `.claude/skills/frontend-visual-design/SKILL.md` (lines 1-145)
   - `.claude/skills/frontend-motion-design/SKILL.md` (lines 1-234)
   - `.claude/skills/frontend-iconography/SKILL.md` (lines 1-156)
   - `.claude/skills/frontend-accessibility-audit/SKILL.md` (lines 1-134)
   - `.claude/skills/docs-bilingual-update/SKILL.md` (lines 1-137)
   - `.claude/skills/ci-local-and-debug/SKILL.md` (lines 1-178)
   - `.claude/skills/verification-before-completion/SKILL.md` (lines 1-125)
   - `.claude/skills/requesting-code-review/SKILL.md` (lines 1-113)
   - `.claude/skills/receiving-code-review/SKILL.md` (lines 1-129)
   - `.claude/skills/handoff-to-team-lead/SKILL.md` (lines 1-121)
   - `.claude/skills/external-system-integration-and-mock/SKILL.md` (lines 1-147)
   - `.claude/skills/writing-skills/SKILL.md` (lines 1-129)
5. **Reference Phase 0 Docs, Linters, and Step 0 Survey Handoffs**:
   - `docs/dn01/PHASE0_ACK.md` (lines 1-644) and `docs/nt01/PHASE0_ACK.md` (lines 1-120)
   - `.markdownlint-cli2.jsonc` (lines 1-11) and `cspell.json` (lines 1-264)
   - Step 0 Survey Reports (Rules/Skills/Baseline, Backend/DB/OpenAPI/E2E, and Frontend/Routing/Menu/Design System)

---

## 2. Concrete Actionable Constraints for All 16 Enterprise Rules

| Rule | Rule File | Concrete Actionable Constraint for Round NT-02 (`T022BB1`) | Marker (`EXISTS` vs `TARGET`) |
|---|---|---|---|
| Rule 01 | `01-project-context.md` | Operate within the 9-package Modular Monolith (`candidate`, `company`, `internship`, `assessment`, `learning`, `recruitment`, `ai`, `identity`, `common`), the 5 canonical roles (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`), the 20 standard skills, and pinned stack versions (`Java 25`, `Spring Boot 4.1.2`, `PostgreSQL 18.6`, `Flyway 12.4.0`, `React 19.3.1`, `Vite 8.3.7`, `TypeScript 6.0.3`). Use prefix `T022BB1:` for NT-02 commits/PRs instead of `T022DB0`. | No inline `EXISTS`/`TARGET` markers. |
| Rule 02 | `02-git-and-delivery.md` | Keep Git strictly READ-ONLY (never run `commit`, `push`, `add`, `stage`, `commit --amend`, `rebase`, `reset`, `stash`, `tag`, `branch -d`, `checkout -b`, `switch`, `restore`). Stay on `feature/T022BB1-phan-quyen-5-vai-tro` targeting `develop`; leave all edits uncommitted with `git diff --cached --name-only` empty; use OS temp + SHA-256 backups for any deliberate-break test; propose ordered `T022BB1:` English commits. | No inline `EXISTS`/`TARGET` markers. |
| Rule 03 | `03-safety-and-secrets.md` | Write only inside `D:\GitHub\Rikkei\rikkei-jobs` (and assigned scratch state folder outside the repo). Never read, open, print, or reference `.env`, `*.pem`, `*.key`, or `D:\GitHub\Rikkei\first-key.pem`. Keep `D:\GitHub\Rikkei\.agents`, `.vscode`, and `Tai lieu du an` read-only. Never add `.agents/teamwork/` inside the repo, never write passwords beyond existing dev seed docs, never leak `X-Service-Key` to `VITE_*`, and clean up all Docker containers/volumes and OS temp files. | No inline `EXISTS`/`TARGET` markers. |
| Rule 04 | `04-honest-verification.md` | Report PASS only for commands executed against the final workspace state with raw stdout/stderr and exit code `0`. Execute the 7-step deliberate-break falsifiability protocol (OS temp backup + SHA-256 -> mutate -> RED -> restore -> SHA-256 verify -> GREEN -> cleanup) for the endpoint policy coverage test (`B2`). Keep zero `console.log`/`System.out.println`, zero `TODO`/`FIXME`, and zero hardcoded host paths. | No inline `EXISTS`/`TARGET` markers. |
| Rule 05 | `05-backend-java.md` | Keep Java 25 LTS immutable `record` DTOs, hand-written JPA `@Entity` classes private to owning modules (never exposed in controllers), unified `ErrorResponse` (`{"code","message"}`) via `GlobalExceptionHandler`, `open-in-view: false`, zero HTTP Basic auth, zero compiler warnings (`-Xlint:all -Werror`), Spotless AOSP (`./mvnw spotless:check`), and SpotBugs (`./mvnw spotbugs:check`). | No inline `EXISTS`/`TARGET` markers. |
| Rule 06 | `06-database-flyway.md` | Keep `V1..V14` immutable (never edit, rename, or delete). Follow odd production DDL (`db/migration/`, next free `V15`) and even dev seed DML (`db/migration-dev/`, next free `V16`), globally unique across both folders, `validate-on-migrate: true`, `ddl-auto: none`, `snake_case`, and zero cross-module physical FKs. Create `V15`/`V16` only if a real gap is proven with evidence. | No inline `EXISTS`/`TARGET` markers. |
| Rule 07 | `07-security-rbac.md` | Maintain `STATELESS` JWT security, deny-by-default (`anyRequest().authenticated()` or stricter), `MustChangePasswordFilter` (`403 MUST_CHANGE_PASSWORD`), `CustomAuthenticationEntryPoint` (`401 UNAUTHORIZED`), `CustomAccessDeniedHandler` (`403 FORBIDDEN`), `ProdEnvironmentValidator`, single-use 60s SSO tickets, and `@EnableMethodSecurity`. In NT-02, centralize one declarative route policy source, add the `common.security` ownership helper + `GET /api/v1/companies/{id}`, add `/api/docs` to dev permit-all, and update Rule 07 (`agent-config/rules/07-security-rbac.md`) accordingly. | Explicit markers: `EXISTS` for `Role.java`, `V2__dev_seed.sql`, `SecurityConfig.java`, current whitelist, `ProdEnvironmentValidator`, SSO/JWT/BCrypt, `@EnableMethodSecurity`, and active workflows; `TARGET` for unimplemented capabilities (CANDIDATE CVs/applications, HR JDs/searches/interviews, MENTOR interview scores, STAFF moderation/JD approval/IOC batches, ADMIN catalog/weights/audit logs). |
| Rule 08 | `08-frontend-engineering.md` | Enforce React 19.3.1 + TypeScript 6.0.3 strict mode (`noUnusedLocals`, `noUnusedParameters`, zero `any`, zero `@ts-ignore`). Route 100% of HTTP calls through `frontend/src/shared/api/httpClient.ts` (zero direct `fetch()`), store JWT strictly in memory (`AuthContext`), export feature APIs only through `index.ts`, and satisfy WCAG 2.2 AA (`>= 4.5:1` text / `>= 3.0:1` UI contrast, semantic HTML, ARIA attributes, full keyboard Tab/Enter/Space/Escape navigation). | No inline `EXISTS`/`TARGET` markers. |
| Rule 09 | `09-frontend-design-bar.md` | Enforce zero emoji everywhere, zero raw stock icon packs, and zero raw color literals outside `design-tokens.css` (Check 9 green). Render all icons via `<Icon name=... />` (24px, 2px stroke, `currentColor`), use self-hosted Plus Jakarta Sans / Be Vietnam Pro / JetBrains Mono (`line-height >= 1.5`, `tabular-nums`), preserve Airy (Candidate) vs Dense (HR/Staff/Admin) density, enforce motion budgets (`<= 150ms` micro, `<= 300ms` drawer, `prefers-reduced-motion`), and achieve `>= 11/12` on the Anti-AI rubric with zero 0-point criteria based strictly on `/browser` evidence. | No inline `EXISTS`/`TARGET` markers. |
| Rule 10 | `10-testing-strategy.md` | Follow Red-Green-Refactor TDD, Testcontainers 2.0.5 (`postgres:18.6-alpine`, dynamic ports, no H2), zero `Thread.sleep()` / arbitrary `setTimeout()`, injectable `java.time.Clock`, real JWTs (no mocked security in backend RBAC tests), dev-only OpenAPI, and zero CI retries. Re-measure and update BE/FE/E2E test counts in `agent-config/rules/10-testing-strategy.md` at round end. | No inline `EXISTS`/`TARGET` markers. |
| Rule 11 | `11-docs-and-bilingual.md` | Write `docs/` in English with symmetrical EN + VI sections (full Vietnamese diacritics) for bilingual deliverables (`docs/erd/`, `docs/nt02/permission-matrix.md`, `docs/nt02/PR_DESCRIPTION.md`). Keep `agent-config/` in English; write reports/handoffs in Vietnamese; keep `markdownlint-cli2` and `cspell` (`en,vi`) at 0 issues with zero inline ignore directives; verify `check-version-drift.mjs`. | No inline `EXISTS`/`TARGET` markers. |
| Rule 12 | `12-ci-and-quality-gates.md` | Maintain exact gate parity (`29` definitions, `26` active runtime gates, `3` fallbacks, `23` CI checks, `25` Docker harness gates via `check-gate-sync.mjs`). Add zero new quality gates. Verify with `./check.sh` and `.\check.ps1` (without Git Bash path-conversion overrides), and do NOT execute `scripts/run-ci-in-docker.*` per `PROMPT_BASE_RULES_EN.txt:24`. | No inline `EXISTS`/`TARGET` markers. |
| Rule 13 | `13-backend-data-access-performance.md` | Keep `open-in-view: false`, `ddl-auto: none`, Hikari `connection-timeout: 5000` / `maximum-pool-size: 10`, `@Transactional(readOnly = true)` on new read methods (`GET /api/v1/companies/{id}`), zero N+1 queries, and zero SMTP/HTTP inside `@Transactional`. | Explicit markers: `EXISTS` for JPA/Hikari/Flyway settings, all `V1..V13` indexes, `@Version` on `Evaluation` & `Company`, `GlobalExceptionHandler` 409, `used_sso_tickets`, and `FlywayMigrationIntegrationTest`; `TARGET` for `JOIN FETCH`/`@EntityGraph`/`@BatchSize`, mandatory 1-based pagination on multi-item queries, GIN/new B-Tree indexes/`EXPLAIN ANALYZE`, `@Transactional` conventions, additional `@Version` targets, and exponential-backoff retry. |
| Rule 14 | `14-backend-module-boundaries.md` | Respect the 9 module packages and table ownership (`V1..V13`). Forbid cross-module physical FKs, SQL `JOIN`s, or direct writes; keep `users.company_id` and `companies.created_by` as plain scalar `BIGINT` values. Keep any new helper in `com.rikkei.jobs.common.security` free of cyclic module dependencies or cross-module internal repository coupling. | Explicit markers: `EXISTS` for the 9 packages, `V1..V13` owned tables, `User.roleId` scalar, 3 public service interfaces with `record` DTOs, DAG structure, and Maven verification; `TARGET` for unimplemented module tables, mechanical ArchUnit rules, and `ApplicationEventPublisher` / `@TransactionalEventListener`. |
| Rule 15 | `15-backend-observability-ops.md` | Never log passwords, hashes, `X-Service-Key`, JWTs, or PII. Keep parameterized SLF4J, `prod` ECS JSON logging, `/actuator/health` minimal exposure (`health,info`, `show-details: never`), `/api/v1/health` JDBC probe, and `ProdEnvironmentValidator` non-wildcard CORS enforcement. | Explicit markers: `EXISTS` for ECS logging, SLF4J, secret/PII non-logging, Actuator config & `ActuatorHealthTest`, `HealthController` & `HealthCheckIntegrationTest`, and env injection/`ProdEnvironmentValidator`; `TARGET` for `X-Request-ID` MDC filter, log sanitization filters, and Micrometer `rikkeijobs.*` metrics. |
| Rule 16 | `16-backend-integrations.md` | Keep Mailpit (`127.0.0.1:1025` / `8025`), `ExternalApiClient` outbound isolation, and SpringDoc OpenAPI `3.2.0` enabled only in `dev` (`prod` disabled). Add `/api/docs` in `dev`, annotate all merged controllers/endpoints with `@Tag`/`@Operation` and `401`/`403`/`404` responses, add zero unapproved dependencies, and update Rule 16 (`agent-config/rules/16-backend-integrations.md`) for `/api/docs`. | Explicit markers: `EXISTS` for Mailpit, Springdoc `3.2.0` dev/prod config, `HealthController` annotations, `ExternalApiClient` + mock endpoints + `ExternalApiClientIntegrationTest`, and dependency governance; `TARGET` for `@EnableScheduling`/`@EnableAsync`/`ThreadPoolTaskExecutor`, hiding admin/test endpoints in public OpenAPI schemas, and dependency vulnerability audit workflow. |

---

## 3. Concrete Actionable Constraints and Applicability for All 28 Skills

### 3.1 Applicable Skills for Round NT-02 (26 Skills)

| # | Skill Name | Applicability | Concrete Actionable Constraint for Round NT-02 (`T022BB1`) |
|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory (Always) | Enforce strict precedence (`PROMPT_NT02_EN.txt` > `PROMPT_BASE_RULES_EN.txt` > Rules `01`-`16` > Skills) and progressive skill loading across `M0`-`M5` without skipping applicable skills. |
| 2 | `brainstorming-before-building` | Applies (`M0`, `M2`, `M3`) | Evaluate design trade-offs before implementation: single route-policy table vs `@PreAuthorize` parity, `common.security` ownership helper API, `/api/docs` mapping (`dev` only across `:8080` and Nginx `:3000`), `/403` route vs in-place rendering, and flag D5/D6 ambiguities instead of guessing. |
| 3 | `writing-implementation-plans` | Applies (`M0`-`M5`) | Decompose work into verifiable, `<= 200`-line increments with automated verification commands per step and OS temp + SHA-256 rollback (no `git checkout`/`restore`/`stash`). |
| 4 | `executing-plans` | Applies (`M1`-`M5`) | Execute milestones sequentially (`B1` -> `B2`-`B5` / `F1`-`F3` -> `E2E` / `F4` -> `D1x`), halting on any failing test or code/assumption drift, while updating `progress.md`. |
| 5 | `dispatching-parallel-agents` | Applies (Orchestration) | Partition orthogonal backend, frontend, and documentation tasks with zero overlapping file writes, keep teamwork metadata out of `D:\GitHub\Rikkei\rikkei-jobs`, and verify every subagent claim directly. |
| 6 | `test-driven-development` | Applies (`B2`-`B5`, `F1`-`F3`) | Write failing tests first (RED) for endpoint policy completeness, `GET /api/v1/companies/{id}`, ownership `404`, data-driven 5-role integration matrix, OpenAPI coverage, `RequireRole` 403 page, role menu, and `httpClient` `Bearer`/`401`/`403` before production edits (GREEN). |
| 7 | `systematic-debugging` | Applies (On Failure) | Use Reproduce -> Localize -> Isolate -> Root Cause Fix if any gate, Testcontainers run, OpenAPI check, Nginx `/api/docs` proxy, or StrictMode `httpClient` handler issue fails. |
| 8 | `spring-security-rbac-endpoint` | Applies (Core `B2`-`B4`) | Maintain single-source declarative `route -> roles` deny-by-default policy, `@PreAuthorize` consistency, `CustomAuthenticationEntryPoint` (`401`), `CustomAccessDeniedHandler` (`403`), and real-JWT integration tests (never mock Spring Security in `B4`). |
| 9 | `api-contract-and-errors` | Applies (Core `B3`, `B5`) | Keep `/api/v1/` prefix, unified Vietnamese `ErrorResponse {code, message}` (`401`/`403`/`404`), `@Tag`/`@Operation`/`@ApiResponse` across all merged controllers (`HealthController` and `JobRecommendationController` gaps included), `/api/docs` + `/api-docs` + `/swagger-ui.html` in `dev`, and disabled OpenAPI in `prod`. |
| 10 | `security-review-checklist` | Applies (Core `B3`) | Audit every id/user-scoped endpoint for IDOR (`404` for cross-tenant/cross-user access so IDs cannot be probed), verify no secret or PII leaks, and document every endpoint in `docs/nt02/permission-matrix.md`. |
| 11 | `backend-module-feature` | Applies (`B3`) | Implement `GET /api/v1/companies/{id}` using Controller -> `@Transactional(readOnly = true)` Service -> Repository -> immutable `CompanyResponse` record, avoiding `@Entity` exposure and passing `-Xlint:all -Werror`, Spotless, and SpotBugs. |
| 12 | `backend-module-boundaries` | Applies (`B1`, `B3`) | Document single-module ownership and scalar cross-module IDs (zero cross-module physical FKs or SQL `JOIN`s) in `docs/erd/`, and keep `com.rikkei.jobs.common.security` ownership helper decoupled from module internals. |
| 13 | `flyway-migration-authoring` | Applies (`B1`, `A3`) | Keep `V1..V14` untouched, add `V15`/`V16` only if a real gap is proven, run empty-DB `dev` migration proof for `A3`, and verify `FlywayMigrationIntegrationTest` and `ProfileSeparationIntegrationTest`. |
| 14 | `module-domain-knowledge` | Applies (`B3`, `D5`, `D6`) | Ground role permissions, endpoint audits, and menu labels in the documented module domain cards without fabricating unapproved business workflows. |
| 15 | `backend-persistence-performance` | Applies (`B3`) | Keep `open-in-view: false`, use `@Transactional(readOnly = true)` for `GET /api/v1/companies/{id}`, and avoid N+1 queries. |
| 16 | `frontend-feature-slice` | Applies (`F1`-`F3`) | Keep shared layout, typed role menu config, and Vietnamese 403 page aligned with `features/identity/` guards (`RequireAuth`, `RequireMustChangePassword`, `RequireRole`), barrel `index.ts` exports, strict TypeScript (0 `any`), minimal diff to `CandidateEvaluationsPage.tsx` and `CompanyProfilePage.tsx`, and Vitest coverage. |
| 17 | `frontend-visual-design` | Applies (`F1`-`F4`) | Follow `docs/design/DESIGN_SYSTEM.md` and `design-tokens.css` (Check 9 green, zero raw color literals), Dual-Density (Airy vs Dense), `375/768/1024/1440px` layouts, Light/Dark modes, zero emoji, and evidence-backed Anti-AI rubric (`>= 11/12`, zero 0-point criteria). |
| 18 | `frontend-motion-design` | Applies (`F1`) | Use GPU-composited `transform`/`opacity` only (`CLS = 0`), `<= 150ms` micro-interactions and admin dense controls, `<= 300ms` 375px drawer/disclosure, and `@media (prefers-reduced-motion: reduce)` (`0.001ms` / `100ms` cross-fade). |
| 19 | `frontend-iconography` | Applies (`F1`, `F2`) | Render all menu, 375px disclosure toggle, and 403 icons solely through `<Icon name=... />` (`24x24`, `2px` stroke, `currentColor`), add `'menu'` icon cleanly with Vitest coverage, use `aria-hidden="true"` on decorative icons, and use zero emoji. |
| 20 | `frontend-accessibility-audit` | Applies (`F1`-`F4`) | Enforce semantic `<header>`, `<nav>`, `<main>`, disabled menu items (`aria-disabled="true"`, non-focusable, non-navigable, `"Sắp ra mắt"`), 375px disclosure (`aria-expanded`, `Escape` closes and returns focus, `>= 44x44px` targets), `:focus-visible`, and `>= 4.5:1` / `>= 3.0:1` contrast. |
| 21 | `docs-bilingual-update` | Applies (`B1`, `B3`, `D1x`) | Author `docs/erd/` (EN + VI), `docs/nt02/permission-matrix.md` (EN + VI), `docs/nt02/PR_DESCRIPTION.md` (EN + VI), `docs/nt02/README.md`, `docs/nt02/BROWSER_OBSERVATIONS.md`, update root `README.md` and `docs/conventions.md`, and pass `markdownlint-cli2` and `cspell` with zero inline directives. |
| 22 | `ci-local-and-debug` | Applies (Gates) | Run `./check.sh` and `.\check.ps1` (`26/26` active gates, zero gate drift via `check-gate-sync.mjs`), run `node e2e/run-all.mjs` on fresh `docker compose up -d --build --wait`, tear down with `docker compose down -v`, and never run `scripts/run-ci-in-docker.*`. |
| 23 | `verification-before-completion` | Applies (Mandatory) | Verify every AC and gate with raw output and exit code `0` on the final workspace state, run `sync-agent-config.mjs --check`, `validate-agent-config.mjs`, `check-gate-sync.mjs`, `check-version-drift.mjs`, and `compute-contrast.mjs`, and never fabricate unmeasured scores or outputs. |
| 24 | `requesting-code-review` | Applies (`D1x`, `A6`-`A7`) | Inspect 100% of `git diff`, record evidence-based Anti-AI scores, document all touched teammate files and open items, and deliver reviewer-ready `docs/nt02/PR_DESCRIPTION.md`. |
| 25 | `receiving-code-review` | Applies (On Review) | Classify any auditor/challenger or Team Lead findings by Tier 1-4, reproduce with a failing test before fixing, and re-run all affected quality gates. |
| 26 | `handoff-to-team-lead` | Applies (Completion) | Leave all changes uncommitted and unstaged (`git diff --cached --name-only` empty), clean Docker (`0` rikkei containers/volumes/networks) and OS temp files, and propose ordered English commits prefixed with `"T022BB1: "`. |

### 3.2 Skills Not Directly Applicable to Round NT-02 (2 Skills)

| # | Skill Name | Applicability | Rationale |
|---|---|---|---|
| 27 | `external-system-integration-and-mock` | Not directly applicable (Reference only) | NT-02 does not add or modify `ExternalApiClient` integrations or `mock/server.js` endpoints. Referenced read-only only to preserve the existing LMS SSO mock contract (`POST /lms/sso/tickets`, `POST /lms/sso/verify`, `X-Service-Key: dev-key`) during backend tests, E2E, and `/browser` candidate login journeys. |
| 28 | `writing-skills` | Not applicable | NT-02 updates affected repository rules (`agent-config/rules/07`, `10`, `16`, and `14` if module facts change) per `PROMPT_NT02_EN.txt`, and does not create or modify any files under `agent-config/skills/`. |

---

## 4. Team Lead Decisions (`D1`–`D8`), Conflicts/Precedence, and Open Questions

### 4.1 Precedence Hierarchy and Conflict Resolutions

Binding Order of Authority: `D:\GitHub\Rikkei\.agents\PROMPT_NT02_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` > Enterprise Rules (`01`–`16`) > Repository Skills (`28`).

1. **Migration Numbering (`D1`: `V15`/`V16` vs Generic `V001__`/`V002__`)**: Generic task text mentioning `V001__`, `V002__` is overridden by `D1` and Rule 06: production migrations use odd numbers (`V1..V13`, next `V15`) in `db/migration/`, dev seeds use even numbers (`V2..V14`, next `V16`) in `db/migration-dev/`, globally unique. Existing `V1..V14` are immutable; Step 0 backend inspection confirmed all 22 tables and 9 dev accounts already exist with no schema/seed gap, so no `V15`/`V16` will be created unless a verified gap emerges.
2. **Task Prefix and PR Title (`PROMPT_NT02_EN.txt:6` vs `T022DB0:`/`T022B63:`)**: Rules `01`, `02`, `11`, root entrypoints, `PROMPT_BASE_RULES_EN.txt:31`, and skills mention `T022DB0:` or `T022B63:`. For Round NT-02, all commit proposals use `"T022BB1: "` and the PR title starts with `` `[NT-02]` ``.
3. **Phase 0 Target Path (`docs/nt02/PHASE0_ACK.md` vs `docs/nt01/PHASE0_ACK.md`)**: `PROMPT_BASE_RULES_EN.txt:34` mentions `docs/nt01/PHASE0_ACK.md` as the first task example; `PROMPT_NT02_EN.txt:6` sets `docs/nt02/PHASE0_ACK.md` for NT-02.
4. **OpenAPI Paths (`D4`: `/api/docs` + `/api-docs` + `/swagger-ui.html` vs `/v3/api-docs` or single path)**: Keep `/api-docs` and `/swagger-ui.html` in `dev` (`application.yml` + legacy controllers), add `/api/docs` in `dev` (served under `/api/*` via `springdoc.swagger-ui.path: /api/docs`, `springdoc.api-docs.path: /api/api-docs`, `SecurityConfig` / `RoutePolicyRegistry` `PUBLIC`, `MustChangePasswordFilter` `ALLOW_LIST`, and minimal 2-character `frontend/nginx.conf` update `location ^~ /api/` so both `:8080/api/docs` and `:3000/api/docs` work), and keep springdoc completely disabled in `prod` (`application-prod.yml`). See Section 4.4 (`[RESOLVED BY TEAM LEAD]`).
5. **Docker CI Harness Prohibition (`PROMPT_BASE_RULES_EN.txt:24` vs Rule 12)**: Do NOT run `scripts/run-ci-in-docker.*`. Verify with `./check.sh`, `.\check.ps1` (without Git Bash path-conversion overrides), and a fresh `docker compose up -d --build --wait` E2E run torn down with `docker compose down -v`.
6. **Frontend 403 Behavior (`D8` vs current `RequireRole.tsx`)**: Replace `RequireRole`'s silent redirect to `getRoleHomePath(user.role)` with the Vietnamese 403 page (`D8`), and update the 3 affected test files (`guards.test.tsx`, `adversarial_security.test.tsx`, `CompanyProfileAccessibility.test.tsx`).
7. **Frontend Role Labels (`D8` & `enumLabels.ts` vs `docs/conventions.md`)**: UI surfaces must use `frontend/src/shared/i18n/enumLabels.ts` (`CANDIDATE` -> `"Ứng viên"`, `HR` -> `"HR"`, `MENTOR` -> `"Mentor"`, `STAFF` -> `"Nhân viên"`, `ADMIN` -> `"Quản trị viên"`), never raw enums and never replacing `"HR"` / `"Mentor"` with long descriptions in UI badges/403 screens.
8. **CSS Design Token Naming (`design-tokens.css` vs `DESIGN_SYSTEM.md`)**: `DESIGN_SYSTEM.md:294-303` refers to `--rj-color-action-primary-bg`, whereas `frontend/src/shared/styles/design-tokens.css:277-279` defines `--rj-color-brand-primary`, `--rj-color-brand-primary-hover`, `--rj-color-brand-surface`, etc. All NT-02 CSS must reference actual tokens in `design-tokens.css` so Check 9 and runtime styles stay valid.

### 4.2 Authoritative Team Lead Decisions (`D1`–`D8`)

- **`D1` (Migration Numbers)**: Production = odd (`V1..V13`, next `V15`), dev seed = even (`V2..V14`, next `V16`), globally unique; never edit or rename `V1..V14`; add `V15`/`V16` only if a real gap is proven with evidence.
- **`D2` (`companies` Table)**: Already exists in full (`V9`, DN-01) with seeded companies `1` and `2` (`V10`). Do not recreate it; verify `users.company_id <-> companies` relation and document it in `docs/erd/`.
- **`D3` (Seed Accounts)**: Dev seed already provisions 9 users (`V2`: 8 users `candidate1..3`, `hr1`, `hr2`, `mentor1`, `staff1`, `admin1`; `V8`: `mentor2`). `A3` is satisfied by having all 5 roles, `>= 8` accounts, and `hr1` (`company_id = 1`, `must_change_password = true`) + `hr2` (`company_id = 2`). Do not edit seeds or write undocumented passwords.
- **`D4` (OpenAPI Path)**: Add Swagger UI at `/api/docs` in `dev` while keeping `/api-docs` and `/swagger-ui.html`; keep `prod` disabled (`application-prod.yml`); update `SecurityConfig`, `MustChangePasswordFilter` allow-list, rule 16, docs, and E2E; prove `/api/docs` via HTTP 200 and `/browser`.
- **`D5` (Menu Mapping & Unimplemented Items)**: Unimplemented menu items render disabled (`aria-disabled`, non-focusable link, no navigation) with `"Sắp ra mắt"`. Built items link to verified routes (`App.tsx`, headings); uncertain mappings are flagged to the Team Lead instead of guessing; no extra menu items beyond the D5 list; existing authenticated pages stay reachable.
- **`D6` (Ownership Sample & Audit)**: Add `GET /api/v1/companies/{id}` (`HR` reads own `principal.getCompanyId()`, any other id -> `404 NOT_FOUND` with unified `ErrorResponse` identical to missing id; `STAFF` reads any company; other roles -> `403`). Create ONE reusable ownership helper in `com.rikkei.jobs.common.security` (documented in `docs/nt02/`). Audit every id/user-scoped endpoint in `docs/nt02/permission-matrix.md`; fix small safe gaps; STOP and report gaps needing a design decision.
- **`D7` (Status Codes & Body)**: Wrong role -> `403 FORBIDDEN`; unauthenticated -> `401 UNAUTHORIZED`; someone else's data -> `404 NOT_FOUND`; unified JSON `{"code","message"}` in Vietnamese.
- **`D8` (Vietnamese 403 Page)**: Show a Vietnamese 403 page (`/403` route or rendered in place, consistent with `A4`) displaying a clear message, the user's role via `enumLabels.ts`, and a button back to their role home. Logged-out users redirect to `/login` with zero protected-content flash. Replaces `RequireRole`'s silent redirect to role home.

### 4.3 Menu Route Mapping Table (`D5`) and Reachability

| Role | Menu Label | Target / State | Verified Code Evidence (`App.tsx`, Component, Heading) | Status |
|---|---|---|---|---|
| `CANDIDATE` | `Hồ sơ` | `/candidate/skills` | `App.tsx:248-254` -> `CandidateSkillsPage` -> `SkillProfilePage.tsx:104-106` (`<h2 id="sp-heading">Hồ sơ năng lực</h2>`). Matches D5 example. | Mapped |
| `CANDIDATE` | `Việc làm` | `/candidate/jobs` (`[RESOLVED BY TEAM LEAD]`) | `CandidateJobsPage.tsx` thin wrapper at `/candidate/jobs` inside `RoleHomeLayout` (`SharedAppLayout`) + `RequireRole(['CANDIDATE'])` rendering untouched `JobRecommendationsSection.tsx` (`<h2>Việc làm phù hợp với bạn</h2>`, links to `/candidate/jobs/${job.jobId}`). Public `/` and PR `#6` tests remain intact; known `375px` overflow reproduces on `/candidate/jobs` and is reported only. | Mapped (`[RESOLVED BY TEAM LEAD]`) |
| `CANDIDATE` | `Ứng tuyển` | Disabled (`"Sắp ra mắt"`) | `frontend/src/features/recruitment/index.ts` exports stub interface `ApplicationSummary` only; no page or route in `App.tsx`. | Mapped (`Sắp ra mắt`) |
| `CANDIDATE` | `Lộ trình` | `/candidate/gap-analysis` | `App.tsx:258-264` -> `CandidateGapAnalysisPage` -> `GapAnalysisSection.tsx:103-105` (`<h2 id="gap-heading">Phân tích khoảng thiếu hụt năng lực</h2>`). Matches D5 example. | Mapped |
| `CANDIDATE` | `Trợ lý AI` | Disabled (`"Sắp ra mắt"`) | `frontend/src/features/ai/index.ts` exports stub interface `AiRecommendationSummary` only; no AI assistant page or route in `App.tsx`. | Mapped (`Sắp ra mắt`) |
| `HR` | `Công ty` | `/hr/company` | `App.tsx:301-307` -> `CompanyProfilePage.tsx:61` (`<h1 className="cp-heading">Hồ sơ công ty</h1>`); linked from `HrHomePage.tsx:45-57`. | Mapped |
| `HR` | `JD` | Disabled (`"Sắp ra mắt"`) | `frontend/src/features/company/index.ts` exports interface `JobPostingSummary` only; no HR JD management page or route in `App.tsx`. | Mapped (`Sắp ra mắt`) |
| `HR` | `Tuyển dụng` | Disabled (`"Sắp ra mắt"`) | `frontend/src/features/recruitment/index.ts` has no page/component or route in `App.tsx`. | Mapped (`Sắp ra mắt`) |
| `HR` | `Thực tập sinh` | Disabled (`"Sắp ra mắt"`) | `frontend/src/features/internship/index.ts` has no page/component or route in `App.tsx`. | Mapped (`Sắp ra mắt`) |
| `MENTOR` | `Cần đánh giá` | Disabled (`"Sắp ra mắt"`) (`[RESOLVED BY TEAM LEAD]`) | No mentor evaluation queue/list page or sub-route exists (`MentorHomePage.tsx` at `/mentor` is a static overview role home). Disabled (`aria-disabled="true"`, `tabIndex={-1}`, non-navigating); `/mentor` remains reachable via the shared header Brand link. | Mapped (`Sắp ra mắt`, `[RESOLVED BY TEAM LEAD]`) |
| `STAFF` | `Duyệt hồ sơ` | Disabled (`"Sắp ra mắt"`) | `StaffHomePage.tsx` (`App.tsx:317-323`, `/staff`) renders static cards only; no `/staff/*` sub-routes exist. | Mapped (`Sắp ra mắt`) |
| `STAFF` | `Duyệt JD` | Disabled (`"Sắp ra mắt"`) | No staff JD approval page or route exists in `App.tsx`. | Mapped (`Sắp ra mắt`) |
| `STAFF` | `Doanh nghiệp` | Disabled (`"Sắp ra mắt"`) | No staff company management page or route exists in `App.tsx`. | Mapped (`Sắp ra mắt`) |
| `STAFF` | `Ghép thực tập` | Disabled (`"Sắp ra mắt"`) | `frontend/src/features/internship/index.ts` contains stub interfaces only; no page or route exists. | Mapped (`Sắp ra mắt`) |
| `STAFF` | `Báo cáo` | Disabled (`"Sắp ra mắt"`) | No staff reporting page or route exists in `App.tsx`. | Mapped (`Sắp ra mắt`) |
| `ADMIN` | `Quản trị` | Disabled (`"Sắp ra mắt"`) (`[RESOLVED BY TEAM LEAD]`) | `AdminHomePage.tsx` (`/admin`) is a static overview role home without admin sub-pages. Disabled (`aria-disabled="true"`, `tabIndex={-1}`, non-navigating); `/admin` remains reachable via the shared header Brand link. | Mapped (`Sắp ra mắt`, `[RESOLVED BY TEAM LEAD]`) |

**How Existing Authenticated Pages Stay Reachable (Without Adding Extra Menu Items)**:

- **5 Role Homes (`/candidate`, `/hr`, `/mentor`, `/staff`, `/admin`)**: Reachable via the shared header Brand link (`getRoleHomePath(user.role)`), via the `"Về trang chủ"` button on the 403 page (`D8`), and via existing back links (`JobDetailPanel.tsx:72`, `CompanyProfilePage.tsx:53`).
- **`/candidate/evaluations`**: Reachable via the `"Đánh Giá Từ Mentor"` card on `/candidate` (`CandidateHomePage.tsx:137-149`); additionally `<CandidateEvaluations>` is embedded inside `SkillProfilePage` (`SkillProfilePage.tsx:154-159`, accessible from `/candidate/skills`).
- **`/candidate/jobs/:jobId`**: Reachable via the `"Chi tiết JD"` link (`JobRecommendationsSection.tsx:251`) on each recommended job card on `/` and `/candidate/jobs` (mapped from `CANDIDATE: Việc làm` per Team Lead `D5`).
- **`/candidate/skills`, `/candidate/gap-analysis`, `/hr/company`**: Directly reachable via role menu items and via their respective role home cards (`/candidate`, `/hr`).
- **`/change-password`**: Enforced automatically by `RequireRole` / `RequireMustChangePassword` when `user.mustChangePassword === true`.

### 4.4 Team Lead Resolutions for Flagged Questions (`[RESOLVED BY TEAM LEAD]`)

1. **`D5` Menu Mapping (3 Flagged Items)**:
   - **`CANDIDATE: Việc làm`** `[RESOLVED BY TEAM LEAD]`: Added protected route `/candidate/jobs` wrapping `JobRecommendationsSection` in `CandidateJobsPage.tsx` (using `RoleHomeLayout` / `SharedAppLayout` + `RequireRole(['CANDIDATE'])`) and pointed `Việc làm` to `/candidate/jobs`. `JobRecommendationsSection.tsx`, public `/`, and PR `#6` tests/E2E remain untouched; `JobDetailPanel.tsx` back link to `/candidate` is preserved; the pre-existing `375px` horizontal overflow on `/` (`PR #6`) reproduces on `/candidate/jobs` and is reported honestly without modifying PR `#6` CSS.
   - **`MENTOR: Cần đánh giá` & `ADMIN: Quản trị`** `[RESOLVED BY TEAM LEAD]`: Both render disabled (`aria-disabled="true"`, non-focusable `tabIndex={-1}`, non-navigating) with the `"Sắp ra mắt"` label because `/mentor` and `/admin` are static overview role homes. All 5 role homes (`/candidate`, `/hr`, `/mentor`, `/staff`, `/admin`) stay reachable via the shared layout Brand link (`getRoleHomePath(user.role)`), and `docs/nt02/` documents how future tasks re-enable disabled menu items.
2. **`D4` OpenAPI `/api/docs` Routing Across Nginx `:3000` vs Backend `:8080`**:
   - `[RESOLVED BY TEAM LEAD]`: `/api/docs` is served on **both** `http://127.0.0.1:8080/api/docs` and `http://127.0.0.1:3000/api/docs` in `dev` profile (with full Swagger UI assets, Bearer `Authorize` flow, and all merged module endpoints). Implemented via `springdoc.swagger-ui.path: /api/docs` and `springdoc.api-docs.path: /api/api-docs` + `OpenApiConfig` (`@Server(url = "/")`) + `LegacyOpenApiController` / `LegacySwaggerUiRedirectController` (keeping `/api-docs` and `/swagger-ui.html` working on `:8080`) + a minimal 2-character `frontend/nginx.conf` update (`location /api/ {` -> `location ^~ /api/ {` so regex static-asset rules do not intercept `/api/swagger-ui/*`). Production (`prod`) keeps Springdoc disabled (`404 NOT_FOUND`).
3. **`D6` Policy & Ownership Audit for 8 HS-01 / DT-01 Endpoints**:
   - **Group A — Self-service `/me` endpoints (5 endpoints)** `[RESOLVED BY TEAM LEAD]`: `GET /api/v1/profiles/me/skills`, `POST /api/v1/profiles/me/skills/recompute`, `PUT /api/v1/me/target`, `GET /api/v1/me/target`, and `GET /api/v1/me/gap-analysis` are restricted strictly to `CANDIDATE` (`HR`, `MENTOR`, `STAFF`, `ADMIN` -> `403 FORBIDDEN`; `MustChangePasswordFilter` runs earlier -> `403 MUST_CHANGE_PASSWORD`).
   - **Group B — Catalog & open-JD read endpoints (2 endpoints)** `[RESOLVED BY TEAM LEAD]`: `GET /api/v1/target-positions` and `GET /api/v1/jobs/{jobId}` use `"authenticated-any"` (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN` receive `200` on `APPROVED` non-expired JDs, and `404` on draft/expired/missing JDs). Architectural invariant: any future endpoint exposing draft JDs or company-scoped JDs MUST enforce `com.rikkei.jobs.common.security.OwnershipGuard`.
   - **Group C — Cross-candidate skill profile read (`GET /api/v1/profiles/{userId}/skills`)** `[RESOLVED BY TEAM LEAD]`: Locked symmetrically with `/profiles/{userId}/evaluations`: `CANDIDATE` reads only own `userId == callerId` (`200`), while any other candidate returns `404 NOT_FOUND` even when `is_public = true`; `HR` reads only public profiles (`is_public = true` -> `200`, private/own/missing -> `404 NOT_FOUND`); `MENTOR`, `STAFF`, and `ADMIN` receive `403 FORBIDDEN`. `SkillProfileIntegrationTest.java`, `TC-T2-SKILL-02` (`e2e/tier2-boundaries/test_auth_boundaries.test.mjs`), and `docs/hs-01-skill-profile.md` are updated and the HS-01 contract change is disclosed in `docs/nt02/PR_DESCRIPTION.md`.
4. **Follow-Up Decision — `PUT /api/v1/companies/{id}` Behavior (`404` -> `405 METHOD_NOT_ALLOWED`)**:
   - `[RESOLVED BY TEAM LEAD]`: Once `GET /api/v1/companies/{id}` is mapped by `D6`, Spring MVC matches path `/api/v1/companies/{id}`, so `PUT /api/v1/companies/{id}` returns **`405 METHOD_NOT_ALLOWED`** with unified Vietnamese `ErrorResponse {"code","message"}` via `GlobalExceptionHandler` identically across own company (`company 1`), cross-company (`company 2`), and nonexistent ID (`999999`) with DB unchanged (preventing ID enumeration), while anonymous callers still receive `401 UNAUTHORIZED` (`RoutePolicy.methodScoped = false`). `CompanySecurityIntegrationTest.java`, the 3 DN-01 E2E company suites (`test_company_boundaries.test.mjs`, `test_company_combinations.test.mjs`, `test_company_scenarios.test.mjs`), and `docs/dn01/*.md` are updated and disclosed in `docs/nt02/PR_DESCRIPTION.md`.

---

## 5. Verified Baseline Facts

| Category | Verified Baseline Fact (`develop @ 348aadf` / `feature/T022BB1-phan-quyen-5-vai-tro`) |
|---|---|
| Git State | Branch `feature/T022BB1-phan-quyen-5-vai-tro`, HEAD `348aadf`, clean working tree (`git status --short` empty). |
| Flyway Migrations | 14 immutable migrations: 7 production (`V1, V3, V5, V7, V9, V11, V13` in `db/migration/`) and 7 dev seed (`V2, V4, V6, V8, V10, V12, V14` in `db/migration-dev/`). |
| Production Tables | **22 tables** across 5 active DB modules (`identity`: 4, `assessment`: 5, `candidate`: 9, `company`: 3, `ai`: 1; `internship`, `learning`, `recruitment` have `package-info.java` only). Zero cross-module physical FKs (`users.company_id` is scalar `BIGINT` indexed by `idx_users_company_id`). |
| Dev Seed Accounts | **9 accounts** across all 5 roles (`V2`: `candidate1..3`, `hr1`, `hr2`, `mentor1`, `staff1`, `admin1`; `V8`: `mentor2`). `V6` + `V10` place `hr1` in company `1` (`must_change_password = true`) and `hr2` in company `2` (`must_change_password = false`). |
| HTTP Endpoints | **24 mapped endpoints** across 13 `@RestController` classes + `/actuator/health`: 16 endpoints with explicit policies/whitelists + **8 unguarded HS-01/DT-01 endpoints** falling through to `anyRequest().authenticated()`. `CompanyProfileController` currently places `@PreAuthorize("hasRole('HR')")` at class level. |
| OpenAPI Baseline | Springdoc `3.2.0` enabled in `dev` at `/api-docs` and `/swagger-ui.html`, disabled in `prod`. `/api/docs` does not exist yet. |
| Frontend Guards & Layout | `App.tsx` routes use `RequireRole` (`silent redirect` to role home on wrong role) and `RequireMustChangePassword`; 10 pages wrap `RoleHomeLayout` (including teammates' `CandidateEvaluationsPage.tsx` and `CompanyProfilePage.tsx`). No shared menu config, no `/403` page, no `'menu'` icon in `Icon.tsx`. `httpClient.ts` injects Bearer and clears session on `401`, but `App.tsx:212-222` lacks cleanup for `setAuthSessionHandlers` and `httpClient.test.ts` lacks explicit `403` session-retention assertions. |
| Quality Gates | **26 active runtime gates** / **29 unique definitions** (`3` fallbacks), **23 CI checks**, **25 Docker CI harness gates** (`node scripts/check-gate-sync.mjs` PASS). |
| Contrast Pairs | **88 color pairs** (`46` Light + `42` Dark) + 9 CIELAB surface pairs (`node scripts/compute-contrast.mjs` PASS, 0 violations). |
| Test & Mock Baselines | Backend: **526 runtime tests** (`56` files / `417` methods on disk); Frontend: **242 tests across 28 files** (verified via Vitest); E2E: **24 suites / 304 cases / 1702 assertions**; Mock: **11 business endpoints + Cloudinary mock namespace (`/cloudinary/*`) + 5 testing tools (`/mock/*`)**. |
| Docs & `.gitignore` Gaps | `docs/nt02/` and `docs/erd/` do not exist; `.gitignore` does not yet ignore `docs/nt02/pr-screenshots/`. |
| Pre-Existing Reported Items | Known `375px` horizontal overflow on `/` (`PR #6`, `409px`) and `/candidate/skills` (`HS-01`, `411px`) — report only, do not fix. Known Surefire 30s self-fork kill message after `SecurityHardeningIntegrationTest` (`docs/dn01/README.md:409`) — report honestly if observed. |

---

## 6. High-Level TDD Implementation Plan (`M1`–`M5` + `E2E-NT02`)

### M1: Data Model Verification & Bilingual ERD (`B1`, `D1`–`D3`)

- Verify `V1..V14` on a fresh empty PostgreSQL `dev` profile database (`FlywayMigrationIntegrationTest`, `ProfileSeparationIntegrationTest`, `CompanyMigrationIntegrationTest`) and capture real DB output listing all 9 users, roles, and `company_id` values (`A3`). Confirm zero schema/seed gaps requiring `V15`/`V16`.
- Author `docs/erd/` (e.g., `docs/erd/README.md`) with Mermaid `erDiagram` covering all 22 production tables (`V1..V13`), module ownership labels, scalar cross-module references (`users.company_id -> companies.id`, zero physical cross-module FKs), and symmetrical EN + VI sections.

### M2: Backend Declarative Policy, Ownership Helper, Tests & OpenAPI (`B2`–`B5`, `D4`, `D6`–`D7`)

- **RED -> GREEN (`B2`)**: Centralize one typed `route -> allowed roles` source of truth consumed by `SecurityConfig` with deny-by-default. Apply Team Lead D6 decisions to the 8 HS-01/DT-01 endpoints. Add an automated integration test inspecting `RequestMappingHandlerMapping` that fails if any mapped endpoint lacks an explicit policy (`public`, `authenticated-any`, or role list), and prove falsifiability using the 7-step Rule 04 deliberate-break protocol (OS temp + SHA-256).
- **RED -> GREEN (`B3`, `D6`–`D7`)**: Create one reusable ownership helper in `com.rikkei.jobs.common.security` (documented in `docs/nt02/`) and implement `GET /api/v1/companies/{id}` (`HR` own `company_id` -> `200`, other company or missing id -> identical `404 NOT_FOUND` `{"code","message"}`; `STAFF` -> `200` / `404` missing; other roles -> `403`). Refactor `CompanyProfileController`'s class-level `@PreAuthorize` down to method level (or dedicated method) so `STAFF` is not blocked. Complete the endpoint ownership audit for `docs/nt02/permission-matrix.md`.
- **RED -> GREEN (`B4`)**: Add data-driven integration tests covering every one of the 5 roles (`>= 1` allowed and `>= 1` blocked call per role), anonymous `401`, wrong role `403`, cross-company `404` (`hr1` -> company 2, `hr2` -> company 1), and cross-candidate `404`, using real JWTs and injectable `java.time.Clock` (zero `Thread.sleep()`, zero mocked security).
- **RED -> GREEN (`B5`, `D4`)**: Expose Swagger UI at `/api/docs` in `dev` while keeping `/api-docs` and `/swagger-ui.html` active and keeping springdoc disabled in `prod`. Update `SecurityConfig` permit-all, `MustChangePasswordFilter` `ALLOW_LIST`, and complete `@Tag`/`@Operation`/`@ApiResponse` (`401`/`403`/`404`, `ErrorResponse` schema) across all merged controllers (including `HealthController`, `JobRecommendationController`, and hiding `TestErrorController` if needed per Rule 16). Add an automated test verifying `/api-docs` covers every mapped controller endpoint and `prod` still returns `404`.
- **Gate**: Run `./mvnw clean test spotless:check spotbugs:check` on Eclipse Temurin JDK 25.

### M3: Frontend Shared Layout, Role Menu, Route Guard, 403 Page & API Wrapper (`F1`–`F3`, `D5`, `D8`)

- **RED -> GREEN (`F1`, `D5`)**: Create one typed `roleMenuConfig` applying Team Lead D5 resolutions (`Hồ sơ`, `Việc làm`, `Ứng tuyển`, `Lộ trình`, `Trợ lý AI` / `Công ty`, `JD`, `Tuyển dụng`, `Thực tập sinh` / `Cần đánh giá` / `Duyệt hồ sơ`, `Duyệt JD`, `Doanh nghiệp`, `Ghép thực tập`, `Báo cáo` / `Quản trị`), rendering unimplemented items disabled (`aria-disabled="true"`, non-focusable, `"Sắp ra mắt"`), and never leaking other roles' items. Add `'menu'` icon to `Icon.tsx` (`24x24`, `2px` stroke) + `Icon.test.tsx`. Build `SharedAppLayout` and delegate `RoleHomeLayout` through it so teammates' `CandidateEvaluationsPage.tsx` and `CompanyProfilePage.tsx` require minimal diff. Style strictly with `design-tokens.css` (Check 9 green), Airy/Dense role density, active/hover/focus-visible/disabled states, `375px` accessible disclosure (`aria-expanded`, `Escape` closes & returns focus, `>= 44px` targets, no layout overflow), Light/Dark modes, and `prefers-reduced-motion`.
- **RED -> GREEN (`F2`, `D8`)**: Implement the Vietnamese 403 page (message, user role via `enumLabels.ts`, back-to-role-home button), update `RequireRole` (logged-out -> `/login` with zero content flash, must-change-password -> `/change-password`, wrong role -> 403 page, right role -> outlet/children), and update `guards.test.tsx`, `adversarial_security.test.tsx`, and `CompanyProfileAccessibility.test.tsx`.
- **RED -> GREEN (`F3`)**: Add Vitest tests for `httpClient` proving Bearer header injection, `401` clearing session and navigating to `/login`, and `403` preserving the session; fix `App.tsx` `setAuthSessionHandlers` StrictMode cleanup / `{ replace: true }` if confirmed as a defect.
- **Gate**: Run `npm run lint`, `typecheck`, `test`, and `build` in `frontend/` plus `node scripts/validate-agent-config.mjs` (Check 9).

### M4 / `E2E-NT02`: Opaque-Box E2E Matrix & `/browser` Verification (`R2`, `F4`)

- Extend `e2e/` opaque-box suites to cover the 5-role RBAC permission matrix (including `GET /api/v1/companies/{id}` `404` cross-company, `401`, `403`) and `/api/docs` + `/api-docs` availability. Execute `node mock/test-runner.js` and `node e2e/run-all.mjs` against a fresh `docker compose up -d --build --wait` stack.
- Execute `/browser` verification (`R2`, `F4`) across all 5 real role logins (candidates via mock LMS SSO 60s ticket; `hr1` password-change flow), recording exact menu labels/states, allowed page, manual forbidden URL -> Vietnamese 403 page, logout, expired/deleted session (`401 -> /login`), `/api/docs` HTTP 200 rendering, and raw measurements (`height`, `radius`, `font`, `transition`, contrast pairs, `scrollWidth` vs `375/768/1024/1440px` in Light and Dark). Save screenshots to git-ignored `docs/nt02/pr-screenshots/` with `ORDER.txt` and record raw measurements in `docs/nt02/BROWSER_OBSERVATIONS.md`.

### M5: Bilingual Docs, Agent-Config Sync & Full Quality Gates (`D1x`, `A1`–`A7`)

- Author `docs/nt02/README.md`, `docs/nt02/permission-matrix.md` (EN + VI), `docs/nt02/PR_DESCRIPTION.md` (EN + VI, disclosing all touched teammate files, `D1`–`D8`, scope exclusions, and known `375px` overflows on `/` and `/candidate/skills`), and update root `README.md` test section + `docs/conventions.md` + `.gitignore` (`docs/nt02/pr-screenshots/`).
- Update `agent-config/rules/{07,10,16}` (and `14` if module facts change), run `node scripts/sync-agent-config.mjs`, and run all 26 gates: `./check.sh`, `.\check.ps1`, `sync-agent-config --check`, `validate-agent-config`, `check-gate-sync`, `check-version-drift`, `compute-contrast`, `markdownlint-cli2`, `cspell` (0 issues), secret scan, `docker compose down -v` (0 rikkei containers/volumes/networks), empty `git diff --cached --name-only`, and ordered `"T022BB1: "` commit proposals.

---

## 7. Operational Checklist & Verbatim Working Method Note

Mandatory working method (kept verbatim from `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` line 30):

> "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

Binding operational invariants for Round NT-02 (`T022BB1`):

- **Git Read-Only**: Never execute mutating Git commands; leave all changes uncommitted and `git diff --cached --name-only` empty; propose English commits prefixed with `"T022BB1: "`.
- **Secrets & Write Bounds**: Never open, read, or print `.env`, `*.pem`, or `D:\GitHub\Rikkei\first-key.pem`; never write undocumented passwords; write only inside `D:\GitHub\Rikkei\rikkei-jobs` (and assigned external Teamwork state scratch folder).
- **Zero New Dependencies & Zero New Gates**: Never add packages to `backend/pom.xml`, `frontend/package.json`, or `mock/package.json`, and keep `check.sh` / `check.ps1` at exactly 26 active runtime gates / 29 definitions.
- **Formatter & Zero-Emoji Compliance**: Zero emoji anywhere; zero inline `cspell:` ignore/disable directives; zero undefined `[text]` brackets outside inline code or fenced blocks (`validate-agent-config.mjs` Check 4.2); 100% design tokens in frontend code (`Check 9`).
- **Locked Team Lead Resolutions**: Decisions `D1`–`D8` (including `D4`, `D5`, `D6` Groups A/B/C, and `PUT /api/v1/companies/{id} -> 405 METHOD_NOT_ALLOWED`) are recorded in Section 4 and implemented across `M1`–`M4`.

---

## Round NT-02-fix

This Phase 0 acknowledgement for Round `NT-02-fix` (`T022BB1`) is authored prior to any edit in the workspace (`agent-config/`, `frontend/`, `docs/`, or tests). All rules and baseline decisions from `## Round NT-02` remain binding except where `PROMPT_NT02_FIX_EN.txt` adds stricter requirements or resolves specific fixes (`F1`–`F4`).

### 1. Authoritative Files Read in Full (Round NT-02-fix)

1. **Task Prompts & Orchestration Briefs**:
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT02_FIX_EN.txt` (lines 1–35)
   - `D:\GitHub\Rikkei\.agents\PROMPT_NT02_EN.txt` (lines 1–61)
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (lines 1–45)
   - `<teamwork-state>/ORIGINAL_REQUEST.md` (lines 1–65)
   - `<teamwork-state>/PROJECT.md` (lines 1–63)
   - `<teamwork-state>/sub_orch_m1/SCOPE.md` (lines 1–23)
2. **Root Agent Configurations**:
   - `CLAUDE.md` (lines 1–47)
   - `GEMINI.md` (lines 1–61)
   - `AGENTS.md` (lines 1–44)
3. **All 16 Enterprise Rules (`.claude/rules/`)**:
   - `.claude/rules/01-project-context.md` (lines 1–94)
   - `.claude/rules/02-git-and-delivery.md` (lines 1–90)
   - `.claude/rules/03-safety-and-secrets.md` (lines 1–70)
   - `.claude/rules/04-honest-verification.md` (lines 1–59)
   - `.claude/rules/05-backend-java.md` (lines 1–83)
   - `.claude/rules/06-database-flyway.md` (lines 1–73)
   - `.claude/rules/07-security-rbac.md` (lines 1–78)
   - `.claude/rules/08-frontend-engineering.md` (lines 1–79)
   - `.claude/rules/09-frontend-design-bar.md` (lines 1–73)
   - `.claude/rules/10-testing-strategy.md` (lines 1–66)
   - `.claude/rules/11-docs-and-bilingual.md` (lines 1–53)
   - `.claude/rules/12-ci-and-quality-gates.md` (lines 1–85)
   - `.claude/rules/13-backend-data-access-performance.md` (lines 1–79)
   - `.claude/rules/14-backend-module-boundaries.md` (lines 1–66)
   - `.claude/rules/15-backend-observability-ops.md` (lines 1–80)
   - `.claude/rules/16-backend-integrations.md` (lines 1–93)
4. **Applicable Repository Skills (16 Skills in `.claude/skills/*/SKILL.md`)**:
   - `.claude/skills/using-rikkei-skills/SKILL.md` (lines 1–86)
   - `.claude/skills/systematic-debugging/SKILL.md` (lines 1–90)
   - `.claude/skills/test-driven-development/SKILL.md` (lines 1–89)
   - `.claude/skills/frontend-feature-slice/SKILL.md` (lines 1–152)
   - `.claude/skills/frontend-visual-design/SKILL.md` (lines 1–145)
   - `.claude/skills/frontend-motion-design/SKILL.md` (lines 1–234)
   - `.claude/skills/frontend-iconography/SKILL.md` (lines 1–156)
   - `.claude/skills/frontend-accessibility-audit/SKILL.md` (lines 1–134)
   - `.claude/skills/docs-bilingual-update/SKILL.md` (lines 1–137)
   - `.claude/skills/ci-local-and-debug/SKILL.md` (lines 1–178)
   - `.claude/skills/verification-before-completion/SKILL.md` (lines 1–125)
   - `.claude/skills/handoff-to-team-lead/SKILL.md` (lines 1–121)
   - `.claude/skills/security-review-checklist/SKILL.md` (lines 1–138)
   - `.claude/skills/spring-security-rbac-endpoint/SKILL.md` (lines 1–160)
   - `.claude/skills/requesting-code-review/SKILL.md` (lines 1–113)
   - `.claude/skills/receiving-code-review/SKILL.md` (lines 1–129)
5. **Existing Phase 0 Acknowledgement & Validator Configs**:
   - `docs/nt02/PHASE0_ACK.md` (lines 1–287)
   - `.markdownlint-cli2.jsonc` (lines 1–11) and `cspell.json` (lines 1–273)

### 2. Concrete Actionable Constraints for All 16 Enterprise Rules (`NT-02-fix`)

| Rule | Rule File | Concrete Constraint for Round `NT-02-fix` (`T022BB1`) |
|---|---|---|
| Rule 01 | `01-project-context.md` | Keep all 9 modules and 5 canonical roles (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`) intact; use prefix `T022BB1:` for commit proposals and touch only `identity` frontend slice, `shared` tokens/icons, `agent-config`, and scoped `docs/` without modifying teammates' business logic. |
| Rule 02 | `02-git-and-delivery.md` | Keep Git strictly READ-ONLY on branch `feature/T022BB1-phan-quyen-5-vai-tro`; leave all changes uncommitted with `git diff --cached --name-only` empty; propose ordered English `T022BB1:` commits verified against actual disk paths (`F2`). |
| Rule 03 | `03-safety-and-secrets.md` | Write only inside `D:\GitHub\Rikkei\rikkei-jobs` (and assigned scratch state folders); never open or print `.env`, `*.pem`, or `first-key.pem`; keep `.agents`, `.vscode`, and `Tai lieu du an` read-only; never leak personal machine paths (`Gate 8.1`); clean up Docker volumes/networks via `docker compose down -v`. |
| Rule 04 | `04-honest-verification.md` | Report PASS only with raw terminal output and exit code `0` on the final workspace state; cite only repository paths verified by directory listing (`F2`); keep zero `console.log`/`System.out.println`, zero `TODO`/`FIXME`, and zero unmeasured self-scores. |
| Rule 05 | `05-backend-java.md` | Do not modify backend production code or the `403` JSON message `"Không có quyền truy cập"` (`F3`); if any backend file is touched, preserve Java 25 immutable records, `ErrorResponse`, `-Xlint:all -Werror`, Spotless AOSP, and SpotBugs on Eclipse Temurin JDK 25. |
| Rule 06 | `06-database-flyway.md` | Keep Flyway migrations `V1..V14` immutable and add no new migrations (`V15`/`V16`) since `NT-02-fix` requires no schema or seed changes. |
| Rule 07 | `07-security-rbac.md` | Fix `F3` by updating `agent-config/rules/07-security-rbac.md:33` (and syncing mirrors) from the legacy Rule 07 403 message to `"Không có quyền truy cập"` matching `CustomAccessDeniedHandler.java:33` and `GlobalExceptionHandler.java:213` without altering backend code; keep `GET /api/v1/companies/{id}` ownership and `/api/docs` behavior unchanged. |
| Rule 08 | `08-frontend-engineering.md` | Keep TypeScript 6.0.3 strict mode (0 `any`, 0 `@ts-ignore`, `noUnusedLocals/Parameters`), 100% HTTP calls via `httpClient.ts`, JWT strictly in memory (`AuthContext`), `localStorage` used strictly for non-auth sidebar collapse UI state (`try/catch` guarded), single `route -> role` policy source (`F1`), and WCAG 2.2 AA (`<nav aria-label>`, `aria-expanded`, `aria-controls`, `aria-current="page"`, `aria-disabled`, skip link, keyboard `Tab`/`Escape`, focus trap/return). |
| Rule 09 | `09-frontend-design-bar.md` | Enforce 0 emoji, 0 external icon packs, and 100% CSS custom properties in `design-tokens.css` (Check 9 green); add sidebar/overlay/tooltip tokens and register Light/Dark contrast pairs in `docs/design/DESIGN_SYSTEM.md` (`>= 4.5:1` text, `>= 3.0:1` UI via `compute-contrast.mjs`); render all icons via `<Icon />` (24px, 2px stroke); preserve Candidate Airy (`44px` items) vs other 4 roles Dense (`36px` at `>= 768px`, `44px` in drawer); enforce motion budgets (`<= 150ms` sidebar width ease-out, `<= 200ms` tooltip, `<= 300ms` drawer `transform`/`opacity`, `prefers-reduced-motion`, `CLS = 0` on load); score Anti-AI rubric strictly from `/browser` measurements. |
| Rule 10 | `10-testing-strategy.md` | Follow Red-Green-Refactor TDD for `F1` and `F4` Vitest + Testing Library suites (no arbitrary `setTimeout`, use `waitFor`); add zero new E2E tests for `F1`; re-measure exact final Frontend test/file counts and update `agent-config/rules/10-testing-strategy.md` (and `README.md`, `docs/nt02/PR_DESCRIPTION.md`) before syncing. |
| Rule 11 | `11-docs-and-bilingual.md` | Update `docs/design/DESIGN_SYSTEM.md` (bilingual `"App shell and sidebar navigation"` + contrast table), `docs/nt02/README.md`, `docs/nt02/BROWSER_OBSERVATIONS.md`, and `docs/nt02/PR_DESCRIPTION.md` (EN + VI with full Vietnamese diacritics); do not rewrite `docs/erd/` or unrelated `docs/nt02/` sections for `F2`; pass `markdownlint-cli2`, `cspell` (`en,vi` with 0 inline ignores), and `check-version-drift.mjs`. |
| Rule 12 | `12-ci-and-quality-gates.md` | Keep exact gate parity (`29` definitions, `26` active runtime gates, `3` fallbacks, `23` CI checks, `25` Docker harness gates via `check-gate-sync.mjs`); add zero new quality gates; run both `./check.sh` and `.\check.ps1` (`26/26`), and never execute `scripts/run-ci-in-docker.*`. |
| Rule 13 | `13-backend-data-access-performance.md` | No backend persistence changes planned; preserve `open-in-view: false`, `ddl-auto: none`, `@Transactional(readOnly = true)`, and `@Version` behavior untouched. |
| Rule 14 | `14-backend-module-boundaries.md` | Keep all 9 backend modules and `OwnershipGuard` boundaries untouched; keep frontend layout/guard refactor isolated inside `features/identity/` and `shared/` without altering teammates' feature slice business logic. |
| Rule 15 | `15-backend-observability-ops.md` | Never log tokens, passwords, or PII in UI, tests, docs, or `/browser` evidence; keep `/actuator/health` and `/api/v1/health` untouched. |
| Rule 16 | `16-backend-integrations.md` | Keep Mailpit, `ExternalApiClient`, and Springdoc `/api/docs` dev-only configuration untouched; add zero new dependencies to `backend/pom.xml`, `frontend/package.json`, or `mock/package.json`. |

### 3. Applicable Skills and Rationale (`NT-02-fix`)

#### 3.1 Directly Applicable Skills (16 Skills)

| # | Skill Name | Why It Applies to `NT-02-fix` | Concrete Constraint for `NT-02-fix` |
|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory governance entrypoint for every round and milestone transition. | Enforce strict precedence (`PROMPT_NT02_FIX_EN.txt` > `PROMPT_NT02_EN.txt` > `PROMPT_BASE_RULES_EN.txt` > Rules `01`–`16` > Skills) and load skills progressively per milestone. |
| 2 | `systematic-debugging` | Required for `F1` stale post-logout redirect and any failing gate or layout overflow during `F4`. | Follow Reproduce (failing Vitest case for `logout` + guard race) -> Localize (`AuthContext`/`RequireAuth`/`RequireRole` + `resolvePostLoginPath`) -> Isolate Hypothesis -> Root Cause Fix with both fixes `(a)` and `(b)`, zero band-aids. |
| 3 | `test-driven-development` | Required for all `F1` and `F4` logic, guard, icon, and layout component changes. | Write failing Vitest tests first (RED) for `F1` role-pair redirects/401 resume/unsafe rejection and `F4` sidebar/tooltip/drawer/skip-link/403-in-layout before production edits (GREEN), using `waitFor` instead of `setTimeout`. |
| 4 | `frontend-feature-slice` | `F1` and `F4` modify `features/identity/` (`AuthContext`, guards, `routePolicies`, `roleUtils`, `SharedAppLayout`, `ForbiddenPage`) and `shared/`. | Maintain slice isolation, barrel exports, strict TypeScript (`0` `any`), and minimal wrapper integration on teammates' pages without breaking their 4 async states. |
| 5 | `frontend-visual-design` | `F4` introduces a new collapsible left sidebar shell, tokens, role density, and Light/Dark contrast pairs. | Use 100% `design-tokens.css` variables (Check 9 green), 0 emoji, `256px`/`72px` tokens, `44px` Candidate vs `36px` administrative density (`44px` in drawer), `>= 4.5:1` text / `>= 3.0:1` UI contrast, `scrollWidth` vs requested `375`/`768`/`1024`/`1440` px (reporting pre-existing `/` and `/candidate/skills` `375px` overflow without fixing), and evidence-only Anti-AI scoring. |
| 6 | `frontend-motion-design` | `F4` specifies timed transitions for sidebar width, tooltips, mobile drawer, and `prefers-reduced-motion`. | Cap sidebar width transition `<= 150ms` ease-out, tooltips `<= 200ms`, mobile drawer `<= 300ms` using `transform`/`opacity`, provide `prefers-reduced-motion` instant/`100ms` cross-fade, enforce `CLS = 0` on load, and document width-change reflow handling. |
| 7 | `frontend-iconography` | `F4` requires home and sidebar collapse/expand icons in `SharedAppLayout` without external icon libraries. | Add curated `24x24` (`strokeWidth="2"`, `currentColor`) icons to `frontend/src/shared/components/Icon.tsx` with `Icon.test.tsx` coverage, `aria-hidden="true"` alongside labels, and `aria-label` on icon-only buttons. |
| 8 | `frontend-accessibility-audit` | `F4` mandates full keyboard, landmark, ARIA, focus-trap, and target-size accessibility for sidebar and drawer. | Implement skip link `"Bỏ qua tới nội dung chính"` first in Tab order (`skip -> header -> sidebar -> main`), `<nav aria-label>`, `<button type="button" aria-expanded aria-controls>` with Vietnamese state labels (`"Thu gọn thanh điều hướng"` / `"Mở rộng thanh điều hướng"`), `>= 44px` targets, hover+focus tooltip (`Escape` closes), `aria-disabled` `"Sắp ra mắt"` excluded from the tab order, `aria-current="page"`, and mobile drawer focus trap/return + body scroll lock. |
| 9 | `docs-bilingual-update` | `R4` and `F3` require bilingual updates to `DESIGN_SYSTEM.md`, `docs/nt02/*`, and rule/doc sync. | Update `docs/design/DESIGN_SYSTEM.md` (`"App shell and sidebar navigation"` EN+VI + contrast tables), `docs/nt02/{README,BROWSER_OBSERVATIONS,PR_DESCRIPTION}.md` (EN+VI with full diacritics), `agent-config/rules/{07,10}`, `docs/conventions.md`, and `README.md`; pass `markdownlint-cli2`, `cspell` (`0` issues), and `check-version-drift.mjs`. |
| 10 | `ci-local-and-debug` | `R5` requires running frontend/mock/E2E on fresh Docker Compose plus `./check.sh` and `.\check.ps1`. | Run `node mock/test-runner.js`, `node e2e/run-all.mjs` on fresh `docker compose up -d --build --wait`, both `./check.sh` and `.\check.ps1` (`26/26` gates), never run `scripts/run-ci-in-docker.*`, and clean up with `docker compose down -v`. |
| 11 | `verification-before-completion` | Mandatory before declaring M1–M4 or Round `NT-02-fix` complete. | Require real execution, exit code `0`, and raw output for Vitest, `sync-agent-config --check`, `validate-agent-config`, `check-gate-sync`, `check-version-drift`, `compute-contrast`, `markdownlint-cli2`, `cspell`, secret scan, `./check.sh`, `.\check.ps1`, and `/browser` evidence. |
| 12 | `handoff-to-team-lead` | Governs final uncommitted delivery, path accuracy (`F2`), and `T022BB1:` commit proposals. | Verify every cited repo path via directory listing (`F2`), keep `feature/T022BB1-phan-quyen-5-vai-tro` uncommitted (`git diff --cached --name-only` empty), confirm 0 Docker containers/volumes/networks, and propose ordered English `T022BB1:` commits. |
| 13 | `security-review-checklist` | Applies to `F1` redirect validation, `F4` `localStorage` usage, and `F3` error parity. | Verify `resolvePostLoginPath` keeps blocking open-redirects, control chars, double slashes, and encoded traversal; verify `localStorage` stores UI preference only (zero auth/JWT); run secret scan. |
| 14 | `spring-security-rbac-endpoint` | `F3` corrects the 403 message documented in Rule 07 and this skill (`SKILL.md:79`). | Align Rule 07 (`07-security-rbac.md:33`) and `spring-security-rbac-endpoint/SKILL.md:79` to `{"code":"FORBIDDEN","message":"Không có quyền truy cập"}` matching backend handlers, then run `sync-agent-config.mjs` and `validate-agent-config.mjs`. |
| 15 | `requesting-code-review` | Applies when preparing updated `docs/nt02/PR_DESCRIPTION.md` and final self-audit. | Inspect full `git diff`, record updated test/contrast/gate numbers, disclose any minimal teammate wrapper adjustments, and include evidence-only Anti-AI scores. |
| 16 | `receiving-code-review` | Applies when acting on Team Lead `NT-02-fix` findings (`F1`–`F4`) and any `/browser` or review feedback. | Treat `F1`–`F4` as verified review defects, reproduce each with tests or `/browser` checks before fixing, and re-run all affected gates after every remediation. |

#### 3.2 Remaining Repository Skills (12 Skills — Reference / Not Directly Triggered)

- `brainstorming-before-building`, `writing-implementation-plans`, `executing-plans`, `dispatching-parallel-agents`: governed by the Teamwork orchestrator/milestone workflow during round planning and execution.
- `backend-module-feature`, `backend-module-boundaries`, `backend-persistence-performance`, `flyway-migration-authoring`, `api-contract-and-errors`, `external-system-integration-and-mock`, `module-domain-knowledge`, `writing-skills`: not triggered directly because `NT-02-fix` adds no backend endpoints, Flyway migrations, mock endpoints, or new skills (mock contract is referenced read-only for `E2E` and SSO `/browser` verification).

### 4. Verification and Proof Plan (`NT-02-fix`)

1. **F1 (Post-Logout Stale Redirect Fix)**:
   - **Vitest + Testing Library**: Add/update tests in `frontend/src/features/identity/` proving:
     - Explicit `logout()` clears/suppresses `state.from` so guards cannot re-populate it during redirect;
     - Cross-role logout -> login (`STAFF -> HR`, `HR -> ADMIN`, `ADMIN -> CANDIDATE` via `/sso-callback`, `MENTOR -> STAFF`) lands on the new role's home path;
     - Same-user `401` session expiration -> re-login returns to the previous allowed route;
     - Disallowed `from` for the new role (and `/403`) is ignored in favor of role home via the single shared `PROTECTED_ROUTE_POLICIES` source of truth;
     - Open-redirect, control characters, backslashes, double slashes, and dot-segment traversal remain rejected, and `mustChangePassword` flow remains intact.
   - **No New E2E Test for F1**: Keep existing E2E suites without adding a new F1 E2E test (`PROMPT_NT02_FIX_EN.txt:23,28`).
   - **Live `/browser` Proof via `[BROWSER_VERIFICATION_REQUEST]`**: Repeat all 3 Team Lead reproductions on localhost Docker Compose (`staff1 -> hr2`, `hr2 -> admin1`, `admin1 -> candidate1` via SSO), verifying URL path + `h1` + `enumLabels` role badge, plus manual forbidden URL -> `403` and expired/401 -> `/login`, with screenshots in `docs/nt02/pr-screenshots/` and `ORDER.txt`.
2. **F4 (Collapsible Left Sidebar & Unified `SharedAppLayout`)**:
   - **Vitest + Testing Library**: Update existing layout/guard/role-home/accessibility tests and add tests covering: collapse/expand toggle + `aria-expanded`/`aria-controls`/Vietnamese labels, `localStorage` (`rj_sidebar_collapsed`) persistence + storage-error fallback, collapsed hover/focus tooltip + `Escape` dismissal, disabled `"Sắp ra mắt"` (`aria-disabled`, excluded from the tab order, non-navigating), `aria-current="page"`, mobile drawer (`< 768px` open, backdrop, `Escape` close + focus return, focus containment, body scroll lock, auto-close on navigation), skip link `"Bỏ qua tới nội dung chính"`, logged-in `403` rendered inside `SharedAppLayout` (preserving current role sidebar, no nested `<main>`), public routes without sidebar, and strict per-role menu item isolation.
   - **Live `/browser` Proof via `[BROWSER_VERIFICATION_REQUEST]`**: Inspect all 5 roles in Light and Dark modes (expanded, collapsed, mobile drawer open, hover, focus-visible, active, disabled, tooltip, `403` inside layout), recording raw measurements (item heights `44px`/`36px`, sidebar widths `~256px`/`~72px`, radius, fonts, transitions `<= 150ms`/`200ms`/`300ms`, contrast pairs, `scrollWidth` vs requested `375`/`768`/`1024`/`1440` px) confirming 0 new sidebar-caused horizontal overflow while honestly reporting pre-existing `375px` overflow on `/` and `/candidate/skills`.
3. **F3, Design Contrast, Docs & Path Discipline (`F2`)**:
   - Update `agent-config/rules/07-security-rbac.md:33` (and `agent-config/skills/spring-security-rbac-endpoint/SKILL.md:79`, `docs/conventions.md:45`) -> run `node scripts/sync-agent-config.mjs`, `node scripts/sync-agent-config.mjs --check`, and `node scripts/validate-agent-config.mjs` (Checks 1–10 ALL GREEN).
   - Add sidebar/overlay/tooltip CSS tokens in `design-tokens.css` and bilingual `"App shell and sidebar navigation"` + contrast pairs in `docs/design/DESIGN_SYSTEM.md` -> run `node scripts/compute-contrast.mjs` (all pairs `>= 4.5:1` text, `>= 3.0:1` UI).
   - Re-measure final Frontend test counts and contrast pair counts -> update `agent-config/rules/10-testing-strategy.md`, `README.md`, `docs/nt02/README.md`, `docs/nt02/BROWSER_OBSERVATIONS.md`, and `docs/nt02/PR_DESCRIPTION.md` (EN + VI), keeping `docs/erd/` untouched and verifying every cited path on disk (`F2`).
4. **Full Stack, Quality Gates & Clean Teardown**:
   - Frontend: `npm run lint --prefix frontend`, `npm run typecheck --prefix frontend`, `npm run test --prefix frontend`, `npm run build --prefix frontend`.
   - Backend (only if backend files are modified): `./mvnw clean test spotless:check spotbugs:check` under Eclipse Temurin JDK 25.
   - Mock & E2E: `node mock/test-runner.js`, `node e2e/run-all.mjs` against a fresh `docker compose up -d --build --wait`.
   - Sync, Lint & Gates: `node scripts/sync-agent-config.mjs --check`, `node scripts/validate-agent-config.mjs`, `node scripts/check-gate-sync.mjs`, `node scripts/check-version-drift.mjs`, `node scripts/compute-contrast.mjs`, `markdownlint-cli2`, `cspell` (`0` issues), secret scan, `./check.sh` and `.\check.ps1` (`26/26` each).
   - Cleanup & Git State: `docker compose down -v` (`0` rikkei containers/volumes/networks), `git branch --show-current` = `feature/T022BB1-phan-quyen-5-vai-tro`, `git diff --cached --name-only` empty, uncommitted working tree with English `"T022BB1: "` commit proposals.
