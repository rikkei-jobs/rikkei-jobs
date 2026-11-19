# Phase 0 Acknowledgement — Round DN-01 (T0231B5)

Document Path: `docs/dn01/PHASE0_ACK.md`
Task Identifier: DN-01 (Task Code: `T0231B5`) — Company Profile and HR Accounts
Branch: `feature/T0231B5-ho-so-cong-ty` (checked out from `develop`)
Working Directory: `D:\GitHub\Rikkei\rikkei-jobs`
Timestamp: 2026-11-17T06:38:00Z
Status: Completed Prior to Any Code, Migration, Config, or Documentation Modification
Zero Emoji Compliance: Verified (0 emoji characters)

---

## Round DN-01

This Phase 0 acknowledgement is authored prior to any modification to application code, Flyway migrations, frontend components, E2E tests, agent configuration, or other repository documentation.

---

## 1. Inventory of Authoritative Files Read and Inspected

### 1.1 Files Read in Full

1. **Task & Base Specifications**:
   - `<teamwork-state>/ORIGINAL_REQUEST.md` (lines 1-62)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_EN.txt` (lines 1-116)
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (lines 1-45)
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
   - `.claude/rules/07-security-rbac.md` (lines 1-76)
   - `.claude/rules/08-frontend-engineering.md` (lines 1-79)
   - `.claude/rules/09-frontend-design-bar.md` (lines 1-73)
   - `.claude/rules/10-testing-strategy.md` (lines 1-66)
   - `.claude/rules/11-docs-and-bilingual.md` (lines 1-53)
   - `.claude/rules/12-ci-and-quality-gates.md` (lines 1-85)
   - `.claude/rules/13-backend-data-access-performance.md` (lines 1-75)
   - `.claude/rules/14-backend-module-boundaries.md` (lines 1-66)
   - `.claude/rules/15-backend-observability-ops.md` (lines 1-80)
   - `.claude/rules/16-backend-integrations.md` (lines 1-93)
4. **All 28 Skills (`.claude/skills/*/SKILL.md`)**:
   - *22 `READ FIRST` mandatory skills designated in `PROMPT_DN01_EN.txt`*:
     1. `.claude/skills/using-rikkei-skills/SKILL.md` (lines 1-86)
     2. `.claude/skills/test-driven-development/SKILL.md` (lines 1-89)
     3. `.claude/skills/systematic-debugging/SKILL.md` (lines 1-90)
     4. `.claude/skills/backend-module-feature/SKILL.md` (lines 1-148)
     5. `.claude/skills/backend-module-boundaries/SKILL.md` (lines 1-157)
     6. `.claude/skills/backend-persistence-performance/SKILL.md` (lines 1-157)
     7. `.claude/skills/flyway-migration-authoring/SKILL.md` (lines 1-142)
     8. `.claude/skills/spring-security-rbac-endpoint/SKILL.md` (lines 1-160)
     9. `.claude/skills/api-contract-and-errors/SKILL.md` (lines 1-157)
     10. `.claude/skills/external-system-integration-and-mock/SKILL.md` (lines 1-140)
     11. `.claude/skills/security-review-checklist/SKILL.md` (lines 1-138)
     12. `.claude/skills/frontend-feature-slice/SKILL.md` (lines 1-152)
     13. `.claude/skills/frontend-visual-design/SKILL.md` (lines 1-145)
     14. `.claude/skills/frontend-motion-design/SKILL.md` (lines 1-234)
     15. `.claude/skills/frontend-iconography/SKILL.md` (lines 1-156)
     16. `.claude/skills/frontend-accessibility-audit/SKILL.md` (lines 1-134)
     17. `.claude/skills/ci-local-and-debug/SKILL.md` (lines 1-178)
     18. `.claude/skills/verification-before-completion/SKILL.md` (lines 1-125)
     19. `.claude/skills/docs-bilingual-update/SKILL.md` (lines 1-137)
     20. `.claude/skills/requesting-code-review/SKILL.md` (lines 1-113)
     21. `.claude/skills/handoff-to-team-lead/SKILL.md` (lines 1-121)
     22. `.claude/skills/module-domain-knowledge/SKILL.md` (lines 1-235)
   - *6 additional skills listed in `PROMPT_BASE_RULES_EN.txt` section R1*:
     23. `.claude/skills/brainstorming-before-building/SKILL.md` (lines 1-89)
     24. `.claude/skills/writing-implementation-plans/SKILL.md` (lines 1-100)
     25. `.claude/skills/executing-plans/SKILL.md` (lines 1-95)
     26. `.claude/skills/dispatching-parallel-agents/SKILL.md` (lines 1-127)
     27. `.claude/skills/receiving-code-review/SKILL.md` (lines 1-129)
     28. `.claude/skills/writing-skills/SKILL.md` (lines 1-129)
5. **Key Repository Configuration and Source Files Read in Full**:
   - `backend/src/main/resources/application.yml` (lines 1-59)
   - `backend/src/main/resources/application-prod.yml` (lines 1-29)
   - `frontend/nginx.conf` (lines 1-89)
   - `backend/src/main/java/com/rikkei/jobs/common/security/SecurityConfig.java` (lines 1-172)
   - `backend/src/main/java/com/rikkei/jobs/common/exception/GlobalExceptionHandler.java` (lines 1-130)
   - `backend/src/main/java/com/rikkei/jobs/identity/service/IdentityPublicService.java` (lines 1-22)
   - `backend/src/main/java/com/rikkei/jobs/identity/service/MailService.java` (lines 1-75)
   - `backend/src/main/java/com/rikkei/jobs/identity/security/MustChangePasswordFilter.java` (lines 1-81)
   - `frontend/src/shared/api/httpClient.ts` (lines 1-227)
   - `cspell.json` (lines 1-242)
   - `.markdownlint-cli2.jsonc` (lines 1-11)

### 1.2 Reference Files Inspected in Specific Sections

- `docs/nt01/PHASE0_ACK.md` (lines 1-428, 1400-1798: inspected for Phase 0 structure, rule/skill constraint table formatting, and proof-plan conventions).
- `backend/src/main/java/com/rikkei/jobs/identity/service/AuthService.java` (lines 1-250: inspected password policy regex `PASSWORD_PATTERN`, `SecureRandom`, constant-time dummy hash, and non-PII logging conventions).
- `scripts/validate-agent-config.mjs` (lines 1-800: inspected Check 1 frontmatter, Check 2 LF/line caps, Check 3 recursive emoji scan on `docs/**/*.md`, and Check 4.2 undefined reference link scan on `docs/**/*.md`).
- Baseline Survey-1 handoff report (`teamwork_spec_miner_survey_1/handoff.md`: used as cross-check index for migration counts, existing `V1`-`V8` files, and open teammate PR branch inventories `#13`, `#14`, `#6`).

---

## 2. Concrete Actionable Constraints for All 16 Enterprise Rules

| Rule | Rule File | Concrete Actionable Constraint for Round DN-01 |
|---|---|---|
| Rule 01 | `01-project-context.md` | Restrict DN-01 work to the `company` module, minimal `identity` cross-module facade (`IdentityPublicService`, `MailService`), minimal `common` (`SecurityConfig`, `GlobalExceptionHandler`), `V9`/`V10`, `frontend/src/features/company/` + `httpClient.ts`, `e2e/`, OpenAPI, and bilingual docs across the 5 canonical roles (`STAFF`, `HR`, `CANDIDATE`, `MENTOR`, `ADMIN`). |
| Rule 02 | `02-git-and-delivery.md` | Keep Git strictly READ-ONLY (never run `add`, `commit`, `push`, `checkout`, `restore`, `reset`, `stash`, `switch`, `branch` mutations); stay on `feature/T0231B5-ho-so-cong-ty`; leave all changes uncommitted with `git diff --cached --name-only` empty; formulate English commit proposals with prefix `T0231B5:`. |
| Rule 03 | `03-safety-and-secrets.md` | Write only inside `D:\GitHub\Rikkei\rikkei-jobs` (and assigned teamwork state folder outside the repo); never read or print `.env`, `*.pem`, or `first-key.pem`; never modify `D:\GitHub\Rikkei\.agents`, `Tài liệu dự án`, or `.vscode`; store temporary files only in OS temp and delete them after verification. |
| Rule 04 | `04-honest-verification.md` | Report PASS only for commands executed against the final workspace state with observed raw output and exit code 0; use injectable `java.time.Clock` for all time-dependent logic; zero `Thread.sleep()`, zero `console.log`/`System.out.println`, zero `TODO`/`FIXME`, and zero hardcoded host paths. |
| Rule 05 | `05-backend-java.md` | Model all DN-01 DTOs as immutable Java 25 `record` types and `@Entity` classes as hand-written POJOs (no Lombok/MapStruct, never expose `@Entity` in controllers); return unified `ErrorResponse {code, message}` via `GlobalExceptionHandler`; pass `-Xlint:all -Werror`, `spotless:check` (AOSP), and `spotbugs:check`. |
| Rule 06 | `06-database-flyway.md` | Never edit or rename `V1`-`V8`; author new forward migrations `V9__...sql` (odd, prod DDL only in `db/migration/`) and `V10__...sql` (even, dev seed only in `db/migration-dev/`) using `BIGINT GENERATED ALWAYS AS IDENTITY`, `TIMESTAMPTZ DEFAULT NOW()`, `snake_case`, idempotent DDL/seed syntax, and SQLFluff compliance. |
| Rule 07 | `07-security-rbac.md` | Preserve deny-by-default (`anyRequest().authenticated()`), `MustChangePasswordFilter` (`403 MUST_CHANGE_PASSWORD`), and `CustomAuthenticationEntryPoint`/`CustomAccessDeniedHandler`; add minimal matcher rules for `/api/v1/staff/**` (`STAFF`) and `/api/v1/companies/me**` (`HR`) plus `@PreAuthorize` without modifying DG-01 or NT-01 rules. |
| Rule 08 | `08-frontend-engineering.md` | Implement the HR company profile UI under `frontend/src/features/company/` with public exports only in `index.ts`; enforce TypeScript strict mode (zero `any` or `@ts-ignore`); route all JSON, `FormData`, and authenticated `Blob` requests solely through `frontend/src/shared/api/httpClient.ts` with in-memory Bearer token. |
| Rule 09 | `09-frontend-design-bar.md` | Enforce zero emoji everywhere; source 100% of colors from `design-tokens.css` (Check 9 green) with Dense Mode ergonomics for HR; use self-hosted Plus Jakarta Sans / Be Vietnam Pro / JetBrains Mono (`line-height >= 1.5`); render all icons via `<Icon name=... />` (24px, 2px stroke); score `>= 11/12` on Anti-AI rubric with zero 0-point criteria. |
| Rule 10 | `10-testing-strategy.md` | Apply Red-Green-Refactor TDD; use Testcontainers `postgres:18.6-alpine` with dynamic ports (no H2, no `Thread.sleep()` or arbitrary `setTimeout()`); expand backend JUnit/Testcontainers suite (baseline 389), frontend Vitest/Testing Library/a11y suite (baseline 115), and hermetic `e2e/` suite (baseline 20 suites / 231 cases / 1139 assertions). |
| Rule 11 | `11-docs-and-bilingual.md` | Author `docs/dn01/README.md` and `docs/dn01/PR_DESCRIPTION.md` bilingually (EN + VI with full diacritics); report to Team Lead in Vietnamese; pass `markdownlint-cli2` and `cspell` (EN + VI) with 0 issues and 0 inline `cspell:` directives; verify `check-version-drift.mjs` if any version ledger changes occur. |
| Rule 12 | `12-ci-and-quality-gates.md` | Pass both `./check.sh` and `.\check.ps1` (26 active runtime gates each, identical counts, without Git Bash path-conversion overrides) and `check-gate-sync.mjs`; add no new quality gates; do NOT run `scripts/run-ci-in-docker.*` unless `docker-compose.yml` is modified. |
| Rule 13 | `13-backend-data-access-performance.md` | Keep `spring.jpa.open-in-view: false` and `ddl-auto: none`; annotate company service `@Transactional(readOnly = true)` at class level; add `@Version` on mutable `Company` entity mapped to `409`; create B-Tree indexes (`tax_code`, `created_by`, `company_id`); never send SMTP mail inside `@Transactional`. |
| Rule 14 | `14-backend-module-boundaries.md` | Assign `companies` (and `company_logos` for DB logo bytes) exclusively to `company`; forbid physical FKs or SQL JOINs to `identity.users` (`created_by` and `users.company_id` remain plain `BIGINT` scalars); provision HR users strictly via `IdentityPublicService` using immutable Java `record` DTOs. |
| Rule 15 | `15-backend-observability-ops.md` | Never log plaintext temporary passwords, BCrypt hashes, JWTs, or raw PII (email addresses, personal names, addresses) in logs or exception messages; use parameterized SLF4J logging with internal IDs only; preserve `/actuator/health` minimal `{"status":"UP"}` response. |
| Rule 16 | `16-backend-integrations.md` | Route dev/E2E emails strictly through local Mailpit (`127.0.0.1:1025` SMTP, inspected in E2E via `127.0.0.1:8025/api/v1/messages`); annotate all new endpoints for Springdoc OpenAPI 3.2.0 at dev `/api-docs` while keeping `prod` OpenAPI disabled; add no unapproved dependencies. |

---

## 3. Concrete Actionable Constraints and Applicability for All 28 Skills

### 3.1 Group A: 22 `READ FIRST` Mandatory Skills (`PROMPT_DN01_EN.txt`)

| # | Skill Name | Applicability | Concrete Actionable Constraint for Round DN-01 |
|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory (Always) | Enforce strict precedence (`PROMPT_DN01_EN.txt` > `PROMPT_BASE_RULES_EN.txt` > Rules 01-16 > Skills) and follow phase transitions across M0-M5 without skipping required skills. |
| 2 | `test-driven-development` | Mandatory (Backend, FE, E2E) | Write failing tests first (RED) for `V9`/`V10`, `tax_code`, concurrent uniqueness, HR email collision, `SecureRandom` password hygiene, logo magic bytes/2 MB limit, IDOR `404`, and frontend form states before writing production code (GREEN), then refactor with Spotless/ESLint. |
| 3 | `systematic-debugging` | Mandatory (On Any Failure) | Reproduce any failing backend, Vitest, Docker, E2E, or gate check with a deterministic test case, trace the exact stack frame, and fix the root cause without empty `catch` blocks or assertion weakening. |
| 4 | `backend-module-feature` | Mandatory (Company API) | Implement `com.rikkei.jobs.company.{controller,service,repository,model,dto,mapper}` in DG-01 style using `@Valid` Java `record` DTOs, hand-written POJO entities, `@Transactional(readOnly = true)` class defaults, and zero `@Entity` exposure in controllers. |
| 5 | `backend-module-boundaries` | Mandatory (Cross-Module HR) | Keep `company` and `identity` tables physically isolated (no cross-module FK/JOIN); extend `IdentityPublicService` with record-based HR provisioning and trigger post-commit email delivery via `AFTER_COMMIT` event or post-commit orchestration outside DB transactions. |
| 6 | `backend-persistence-performance` | Mandatory (Schema & Locking) | Add `@Version` optimistic locking on `Company` (`409` on concurrent `PUT /companies/me`), index `tax_code` and lookup keys, keep `open-in-view: false`, and keep SMTP I/O completely outside `@Transactional` boundaries. |
| 7 | `flyway-migration-authoring` | Mandatory (V9 & V10) | Author idempotent `V9__...sql` (prod DDL) and `V10__...sql` (dev seed for companies 1 and 2 + `ON CONFLICT DO NOTHING` + `setval`), never touch `V1`-`V8`, lint with SQLFluff 4.5.0, and test empty DB + `develop` upgrade + idempotency. |
| 8 | `spring-security-rbac-endpoint` | Mandatory (RBAC & Matrix) | Add minimal matchers in `SecurityConfig` (`/api/v1/staff/**` -> `STAFF`, `/api/v1/companies/me**` -> `HR`) plus `@PreAuthorize`, preserve `MustChangePasswordFilter` (`403 MUST_CHANGE_PASSWORD`), and prove the 6-caller x 5-endpoint security matrix. |
| 9 | `api-contract-and-errors` | Mandatory (REST & OpenAPI) | Expose endpoints under `/api/v1/...`, return unified `ErrorResponse {code, message}` in Vietnamese (including `MaxUploadSizeExceededException` and `404` on cross-tenant `PUT /api/v1/companies/{idB}`), and document all statuses/schemas/bearerAuth in OpenAPI without secrets. |
| 10 | `external-system-integration-and-mock` | Mandatory (Mailpit SMTP) | Route transactional HR onboarding emails exclusively to local Mailpit (`127.0.0.1:1025`, verified via `127.0.0.1:8025` in E2E) with bounded timeouts, never sending outbound internet emails or leaking `X-Service-Key` to frontend. |
| 11 | `security-review-checklist` | Mandatory (Security Audit) | Verify and capture raw proof for IDOR (`404`), mass assignment whitelist (`tax_code`/`status` immutable), upload hardening (JPG/PNG magic bytes, exact `2,097,152` vs `2,097,153` bytes, double-extension/traversal rejection, `X-Content-Type-Options` `no-sniff` header), CR/LF injection blocking in `email`/`fullName`, and zero password/PII leaks. |
| 12 | `frontend-feature-slice` | Mandatory (HR Company UI) | Build `frontend/src/features/company/{api,components,hooks,types,styles,__tests__,index.ts}` under `/hr`, handle loading, empty/404, inline validation (focus first error + announcement), saving, saved, server error, and network error states using `AbortSignal` and barrel `index.ts` exports. |
| 13 | `frontend-visual-design` | Mandatory (Visual & Tokens) | Style "Hồ sơ công ty" using `design-tokens.css` variables only (Check 9 green), Dense Mode HR ergonomics, responsive layouts at `375/768/1024/1440px` (`scrollWidth <= clientWidth`), Light and Dark modes, zero emoji, and `>= 11/12` Anti-AI rubric score. |
| 14 | `frontend-motion-design` | Mandatory (Transitions) | Restrict transitions to GPU-composited `transform`/`opacity` (`CLS = 0`), keep HR dense interactions `<= 150ms`, wrap with `@media (prefers-reduced-motion: reduce)` (`0.001ms` / `100ms` fade), and add zero external animation packages. |
| 15 | `frontend-iconography` | Mandatory (SVG Icons) | Render all UI icons exclusively via `<Icon name=... />` (`viewBox="0 0 24 24"`, `stroke-width="2"`, `currentColor`), add `upload` if missing from `iconRegistry`, ensure decorative icons have `aria-hidden="true"`, and forbid emojis or raw inline SVGs. |
| 16 | `frontend-accessibility-audit` | Mandatory (WCAG 2.2 AA) | Enforce `<label htmlFor>`, `aria-describedby` + `aria-invalid`, focus transfer to first invalid input, `aria-live="polite"`, `:focus-visible` rings, `>= 24px` (`44x44px` touch) targets, full keyboard navigation, and mathematical contrast verification. |
| 17 | `ci-local-and-debug` | Mandatory (Local Gates) | Execute `./check.sh` and `.\check.ps1` (26 active gates each), run E2E on a fresh `docker compose up -d --build --wait` stack, avoid `scripts/run-ci-in-docker.*` unless `docker-compose.yml` changes, and tear down cleanly via `docker compose down -v`. |
| 18 | `verification-before-completion` | Mandatory (Final Proof) | Verify every AC item with fresh raw terminal output and exit code 0 after final edits, and honestly report any `/browser` PNG capture limitation with exact capture instructions instead of fabricating proof. |
| 19 | `docs-bilingual-update` | Mandatory (Docs & Linters) | Author bilingual EN + VI (full diacritics) `docs/dn01/README.md` and `docs/dn01/PR_DESCRIPTION.md`, update stale rules/docs facts in `agent-config/`, run `sync-agent-config.mjs` and `validate-agent-config.mjs`, and achieve 0 errors in `markdownlint` and `cspell` with zero inline directives. |
| 20 | `requesting-code-review` | Mandatory (Self-Audit) | Inspect 100% of `git diff`, score the Anti-AI rubric, compile the file manifest, architectural decisions, follow-ups (`LOCKED`, DN-05, NT-02), and PR `#13`/`#14`/`#6` conflict table in `docs/dn01/PR_DESCRIPTION.md`. |
| 21 | `handoff-to-team-lead` | Mandatory (Clean Handoff) | Leave working tree uncommitted (`git diff --cached --name-only` empty), clean Docker (`0` `rikkei` containers/volumes/networks) and OS temp files, and deliver a Vietnamese report with raw evidence and ordered `T0231B5:` English commit proposals. |
| 22 | `module-domain-knowledge` | Mandatory (Domain Fidelity) | Implement strictly documented DN-01 scope (`STAFF` creates company + HR; `HR` reads/edits own company and uploads logo); never invent business rules for `LOCKED` companies, DN-05 staff screens, or full NT-02 guards (record them as follow-ups). |

### 3.2 Group B: 6 Additional R1 Skills (`PROMPT_BASE_RULES_EN.txt`)

| # | Skill Name | Applicability to DN-01 & Rationale | Concrete Actionable Constraint for Round DN-01 |
|---|---|---|---|
| 23 | `brainstorming-before-building` | **Applies** — Architectural decisions required for DB logo storage + authenticated blob fetch, post-commit mail failure policy, `nginx.conf` upload limits, and cross-tenant `404` handling. | Evaluate architectural options and trade-offs (DB `company_logos` vs filesystem volume; `AFTER_COMMIT` mail delivery failure keeping account vs rollback; authenticated blob fetch via `httpClient.ts`) before implementing M1-M3. |
| 24 | `writing-implementation-plans` | **Applies** — Multi-milestone full-stack delivery (M0 -> M1 -> M2/M3/E2E -> M4 -> M5) requires granular, independently verifiable steps. | Decompose implementation into verified milestones (`V9`/`V10` -> backend company/identity/mail/logo/security/OpenAPI -> frontend company slice -> E2E 4-tier -> browser/gates/docs) with explicit rollback backups in OS temp and automated verification commands per step. |
| 25 | `executing-plans` | **Applies** — Sequential milestone execution with drift-halt and liveness tracking across backend, frontend, and E2E tracks. | Execute each step sequentially, halt immediately on any failing test or plan drift, and maintain UTC timestamps in `progress.md` after each meaningful step. |
| 26 | `dispatching-parallel-agents` | **Applies** — Parallel execution of orthogonal tracks (e.g., M2 backend, M3 frontend, and E2E authoring) under Teamwork orchestration. | Partition parallel subagents with zero file-write overlap, keep teamwork metadata strictly inside the scratch `.agents/teamwork/` folder, use `send_message` reactive wakeups (no sleep polling), and verify all subagent outputs with raw evidence. |
| 27 | `receiving-code-review` | **Applies** — Handling Challenger/Reviewer/Auditor findings and any Team Lead feedback during DN-01 verification. | Triage review findings by Tier 1-4, write a reproducing failing test (RED) for any defect before fixing (GREEN), and re-run all affected quality gates after remediation. |
| 28 | `writing-skills` | **Applies (Conditional, Docs/Rules Sync)** — `PROMPT_DN01_EN.txt` B8 authorizes updating stale facts in `agent-config/rules/` (not inventing new skills unless needed). | When updating stale rule facts in `agent-config/rules/` (e.g., rule 05/06/07/10/14), preserve `<= 150` line cap, LF UTF-8 without BOM, zero emoji, inline-code `EXISTS`/`TARGET` markers, then run `node scripts/sync-agent-config.mjs` and `node scripts/validate-agent-config.mjs`. |

---

## 4. Identified Precedence, Conflicts, Ambiguities, and Resolutions

Binding Order of Authority: `D:\GitHub\Rikkei\.agents\PROMPT_DN01_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` > Enterprise Rules (`01`-`16`) > Domain & Process Skills (`28` skills).

### Conflict 1: Application Code Scope (`PROMPT_DN01_EN.txt` vs Base Rule R0 & Root Entrypoints)

- **Conflict**: `PROMPT_BASE_RULES_EN.txt` section R0 states "Application code is out of scope unless the round prompt says otherwise", and `CLAUDE.md`/`GEMINI.md`/`AGENTS.md` restrict scope to `agent-config` (`T022DB0`).
- **Resolution**: `PROMPT_DN01_EN.txt` explicitly declares Round DN-01 an application-code round limited to the `company` module, minimal `identity` and `common` touch points, new `V9`/`V10` Flyway migrations, `frontend/src/features/company/` + `httpClient.ts`, `e2e/` suites, OpenAPI annotations, bilingual docs, and stale rule/doc facts. Staff screens (DN-05), job descriptions, and full NT-02 guards remain strictly out of scope.

### Conflict 2: Task Prefix `T0231B5:` and PR Tag `` `[DN-01]` ``

- **Conflict**: Rules 01, 02, 11, root entrypoints, and skills reference `T022DB0:` (or `T022B63:` in NT-01).
- **Resolution**: Per `PROMPT_DN01_EN.txt`, all proposed commit messages in the handoff report must be in English prefixed with `T0231B5:`, and the PR title draft in `docs/dn01/PR_DESCRIPTION.md` must start with `` `[DN-01]` ``. Git remains 100% READ-ONLY.

### Conflict 3: Phase 0 Target File (`docs/dn01/PHASE0_ACK.md` vs R1 `docs/nt01/PHASE0_ACK.md`)

- **Conflict**: `PROMPT_BASE_RULES_EN.txt` R1 names `docs/nt01/PHASE0_ACK.md`.
- **Resolution**: `PROMPT_DN01_EN.txt` line 8 overrides R1: Phase 0 for DN-01 is written to the new file `docs/dn01/PHASE0_ACK.md` with a `Round DN-01` section, leaving `docs/nt01/PHASE0_ACK.md` untouched.

### Conflict 4: Real OpenAPI Path (`/api-docs` vs `/v3/api-docs`)

- **Conflict**: `PROMPT_DN01_EN.txt` B7 cites `/v3/api-docs or the project path`, and `api-contract-and-errors` / `spring-security-rbac-endpoint` cite `/v3/api-docs/**`.
- **Resolution**: Direct inspection of `backend/src/main/resources/application.yml` (lines 46-50) confirms `springdoc.api-docs.path: /api-docs` and `springdoc.swagger-ui.path: /swagger-ui.html`, while `application-prod.yml` (lines 12-16) disables both (`enabled: false`). Dev verification curls `/api-docs` on the running stack, and tests/config verify `prod` keeps both disabled.

### Conflict 5: Docker CI Harness (`scripts/run-ci-in-docker.*`) Prohibition

- **Conflict**: Rule 12 and `ci-local-and-debug` recommend running `scripts/run-ci-in-docker.ps1`/`.sh`.
- **Resolution**: `ORIGINAL_REQUEST.md` R1 and `PROMPT_DN01_EN.txt` forbid running `scripts/run-ci-in-docker.*` unless `docker-compose.yml` is proven unavoidable and modified (requiring full harness override isolation and 3-scenario proof). By storing logos in PostgreSQL, `docker-compose.yml` stays untouched, so we verify via `./check.sh`, `.\check.ps1` (26 gates each), and a fresh `docker compose up -d --build --wait` E2E stack torn down with `docker compose down -v`.

### Conflict 6: Open Teammate PRs (`#13`, `#14`, `#6`) Flyway & `companies` Schema Collisions

- **Conflict**: Open branches `origin/feature/T023552-candidate-application` (PR `#13`), `origin/feature/T023D16-phan-tich-khoang-thieu-hut` (PR `#14`), and `origin/feat/AI-recommendation` (PR `#6`) define conflicting Flyway migration versions (`V3`-`V10`) and incompatible `companies` columns/seeds.
- **Resolution**: Following `PROMPT_DN01_EN.txt` (`FACTS THE TEAM LEAD VERIFIED`), DN-01 claims `V9` (prod DDL) and `V10` (dev seed) as the next unused versions on `develop`, writes `V9` idempotently (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, guarded constraints and indexes), avoids editing or copying teammate code, and documents every column and version conflict (plus required owner actions) in `docs/dn01/PR_DESCRIPTION.md`.

### Conflict 7: Upload Limit Alignment Across Nginx, Spring Multipart, and `GlobalExceptionHandler`

- **Conflict**: `frontend/nginx.conf` (`location /api/`, lines 66-77) omits `client_max_body_size` (Nginx default `1m` = 1 MB, which rejects a valid 2 MB upload through `http://localhost:3000/api/`), `backend/src/main/resources/application.yml` omits `spring.servlet.multipart.*` (Spring Boot default `max-file-size` is `1MB`), and `GlobalExceptionHandler.java` lacks a handler for `MaxUploadSizeExceededException` (causing container rejections to return 500 instead of unified `ErrorResponse`).
- **Resolution**: Set `client_max_body_size 3m;` in `frontend/nginx.conf` (accommodating multipart boundaries around a 2 MB file), set `spring.servlet.multipart.max-file-size` / `max-request-size` in `application.yml` cleanly above 2 MB (e.g., `3MB` / `4MB`) so exact `2,097,152` vs `2,097,153` byte validation runs deterministically in the `company` upload validator, AND add `@ExceptionHandler(MaxUploadSizeExceededException.class)` in `GlobalExceptionHandler.java` returning `413` with unified `ErrorResponse {code, message}` so any container-level overflow also returns unified JSON instead of 500 or HTML.

### Conflict 8: `MailService` Post-Commit (`AFTER_COMMIT`) Delivery Failure Policy

- **Conflict**: Rule 13 forbids SMTP I/O inside `@Transactional`, while `MailService.java` (lines 71-73) currently catches `MessagingException | MailException` and returns silently without notifying callers.
- **Resolution**: In `POST /api/v1/staff/companies/{id}/hr-accounts`, persist the new `HR` user inside the transaction (using `IdentityPublicService`), commit so the DB connection is released before SMTP I/O, and send the Vietnamese Mailpit email after commit. Policy on mail delivery failure: **keep the created HR account in DB and return a clear delivery-failure error response** (e.g., `502 EMAIL_DELIVERY_FAILED` with unified `ErrorResponse {code, message}`), never returning a silent `201` and never logging or exposing the temporary password.

### Conflict 9: Logo Storage and Authenticated Display Without `docker-compose.yml` Changes

- **Conflict**: Browsers cannot attach an in-memory `Authorization: Bearer` header to `<img src="/api/...">`, while `docker-compose.yml` must remain untouched and logos must survive `docker compose up/down` (without `-v`).
- **Resolution**: Store logo bytes in a `company`-owned DB table (`company_logos` in `V9` with server-generated `storage_name`, `content_type`, `size_bytes`, binary `data` column, `updated_at`) and serve them via authenticated `GET /api/v1/companies/me/logo` with accurate `Content-Type` and `X-Content-Type-Options` (`no-sniff`). Extend `frontend/src/shared/api/httpClient.ts` to support `FormData` cleanly and fetch authenticated `Blob` responses (rendered via `URL.createObjectURL` and revoked on cleanup), preserving in-memory Bearer auth and centralized 401/403 handling.

### Conflict 10: `22 READ FIRST` Skills vs `28 R1` Skills

- **Conflict**: `PROMPT_DN01_EN.txt` names 22 `READ FIRST` skills, whereas `PROMPT_BASE_RULES_EN.txt` section R1 lists 28 repository skills and requires explaining which apply and why.
- **Resolution**: Read all 28 skills in full and document all 28 constraints explicitly in Section 3 (Group A: 22 `READ FIRST`; Group B: 6 R1 skills with DN-01 applicability rationale).

### Conflict 11: Browser Test Protocol Execution & Subagent Runtime Permission Fallback

- **Conflict**: `PROMPT_DN01_EN.txt` and `PROMPT_BASE_RULES_EN.txt` R2 mandate Antigravity's built-in `/browser` (localhost only) for all UI, interaction, responsive, Light/Dark, and session checks, yet `teamwork_*` subagents may encounter runtime permission limits invoking `/browser`.
- **Resolution**: Attempt `/browser` in M4; if subagents hit runtime permission limits, Sentinel keeps the live Docker stack running and requests the Parent session to execute `/browser` and supply host-verified `BROWSER_HOST_FACTS` (covering `375/768/1024/1440px`, Light/Dark, expired/missing session, geometry `scrollWidth <= innerWidth`, offsets, touch targets, and contrast pairs). If `/browser` cannot save PNG files, report that honestly and list the exact required captures in `ORDER.txt` and `PR_DESCRIPTION.md`.

### Conflict 12: Unified `ErrorResponse` Format & Optimistic Locking Justification

- **Conflict**: `api-contract-and-errors` mentions RFC 7807 `ProblemDetail` with a `details` array, whereas `GlobalExceptionHandler.java` (lines 24-25) and `PROMPT_DN01_EN.txt` B2 mandate unified `ErrorResponse {code, message}`. Also `PROMPT_DN01_EN.txt` B1 requires justifying `updated_at` if added, and DG-01 reference style mandates `@Version` mapped to `409`.
- **Resolution**: Use the codebase's unified `ErrorResponse {code, message}` record everywhere (`GlobalExceptionHandler`). Add `updated_at` and `version` (`@Version`) on `companies` in `V9` specifically to match the DG-01 concurrency and audit pattern (`409 CONFLICT` on concurrent `PUT /companies/me`).

---

## 5. Acceptance Proof Plan (`AC-01` through `AC-14` + `ORIGINAL_REQUEST.md`)

Every acceptance item from `PROMPT_DN01_EN.txt` (14 items) and `ORIGINAL_REQUEST.md` (R1-R5 and 9 Acceptance Criteria) is mapped below to its concrete, falsifiable proof method:

| AC ID | Acceptance Criterion (`PROMPT_DN01_EN.txt` / `ORIGINAL_REQUEST.md`) | Concrete Proof Method & Expected Raw Evidence |
|---|---|---|
| `AC-01` | `docs/dn01/PHASE0_ACK.md` section `Round DN-01` exists before any edit (`ORIGINAL_REQUEST.md` R1). | Verify `docs/dn01/PHASE0_ACK.md` contains `## Round DN-01`, all 16 rules, all 28 skills, conflicts, verbatim working-method note, and proof plan; verify `npx markdownlint-cli2`, `npx cspell`, `node scripts/validate-agent-config.mjs`, `git status --short` (`?? docs/dn01/PHASE0_ACK.md` only), and empty `git diff --cached --name-only` prior to starting M1/M2/M3/E2E. |
| `AC-02` | `staff1` creates company + HR account -> Mailpit receives email with temporary password; HR login enforces `must_change_password`; mail failure keeps HR user and reports delivery failure (`ORIGINAL_REQUEST.md` R3, AC-2). | Backend Testcontainers integration tests (`CompanyHrAccountIntegrationTest` / `MailServiceTest`) + fresh-stack E2E (`e2e/tier*`): `POST /api/v1/staff/companies` (`201`) -> `POST /api/v1/staff/companies/{id}/hr-accounts` (`201`, no password in JSON) -> read Mailpit `GET http://127.0.0.1:8025/api/v1/messages` -> login via `POST /api/v1/auth/login` (`mustChangePassword: true`) -> `GET /api/v1/companies/me` returns `403 MUST_CHANGE_PASSWORD` -> change password -> `GET /api/v1/companies/me` returns `200`; plus dedicated mail-failure integration test verifying user row remains in `users` and endpoint returns delivery-failure `ErrorResponse` without logging temporary password. |
| `AC-03` | Duplicate HR email (trimmed, case-insensitive, including existing non-HR user) -> `409` (`ORIGINAL_REQUEST.md` R3, AC-3). | Backend unit + Testcontainers integration tests + E2E test calling `POST /api/v1/staff/companies/{id}/hr-accounts` with `"  HR1@RIKKEIJOBS.TEST  "` and `candidate1@rikkeijobs.test`, asserting HTTP `409` and unified `ErrorResponse`, plus CR/LF header-injection rejection (`400`). |
| `AC-04` | `hr1` edits company A; calling API for company B -> `404` with unified `ErrorResponse`; no request shape reaches another company (`ORIGINAL_REQUEST.md` R3, AC-4). | Backend integration test + E2E test: `hr1` calls `PUT /api/v1/companies/me` (`200`), and calls `PUT /api/v1/companies/{idOfCompanyB}` / `GET /api/v1/companies/{idOfCompanyB}` receiving `404 NOT_FOUND` with `ErrorResponse {code, message}` (never `403` or `200`), plus test confirming body `id` or query params cannot override `principal.getCompanyId()`. |
| `AC-05` | Logo > 2 MB rejected; non-JPG/PNG content rejected (including renamed files); exactly 2 MB accepted; DB blob served via authenticated `httpClient.ts` with `X-Content-Type-Options` `no-sniff` (`ORIGINAL_REQUEST.md` R3, AC-4). | Backend unit + Testcontainers integration tests + E2E test through Nginx `:3000/api/` and direct `:8080/api/`: exact `2,097,152`-byte real PNG/JPG -> `200`; `2,097,153`-byte payload -> `413` unified `ErrorResponse`; SVG, GIF, WebP, PDF, renamed `.txt`, 0-byte, `a.php.jpg`, `../../x.png` -> `400 VALIDATION_ERROR`; `GET /api/v1/companies/me/logo` asserts `Content-Type` and `X-Content-Type-Options` `no-sniff` header; logo persists across `docker compose stop && docker compose start` (or `down` without `-v`). |
| `AC-06` | Invalid tax code (not 10 or 13 digits) -> error; duplicate tax code -> `409` (including concurrent requests, never `500`) (`ORIGINAL_REQUEST.md` R3, AC-3). | Backend unit + integration tests covering 9, 11, 12, 14 digits, letters, spaces, empty/`null`, invalid `size`, invalid `website` -> `400 VALIDATION_ERROR`; sequential duplicate `tax_code` -> `409`; concurrent `ExecutorService` + `CountDownLatch` dual-thread test -> one `201`, one `409` (zero `500`), verified also in E2E. |
| `AC-07` | `tax_code` and `status` immutable by HR; temporary password never appears in responses, logs, repo, or docs (`ORIGINAL_REQUEST.md` R3, AC-3). | Backend integration test sending `taxCode`, `status: "LOCKED"`, `createdBy`, `id` in `PUT /api/v1/companies/me` verifying DB columns remain unchanged; SLF4J `ListAppender` test capturing logs across HR creation and mail failure asserting temporary password and raw email PII never appear in logs; repo grep + secret scan verifying zero temporary passwords in source, OpenAPI, test names, or docs. |
| `AC-08` | 5-endpoint role matrix proven; Flyway `V9` and `V10` apply from empty and on top of `develop`, are idempotent, and enforce DB constraints (`ORIGINAL_REQUEST.md` R2, AC-4, AC-5). | Backend security matrix test (`STAFF`, `HR`, `CANDIDATE`, `MENTOR`, `ADMIN`, anonymous across all 5 endpoints); Testcontainers tests executing `V1`-`V10` from empty DB, upgrading from `V1`-`V8` (`develop`), re-running `V9`/`V10` SQL idempotently, verifying `CHECK`/`UNIQUE` constraints reject bad rows, verifying 9-user seed count unchanged, and updating `FlywayMigrationIntegrationTest` / `ProfileSeparationIntegrationTest` (prod=5, dev=10). |
| `AC-09` | OpenAPI lists new endpoints with all statuses/error codes and multipart schema without secrets; production disables OpenAPI (`ORIGINAL_REQUEST.md` R4, AC-5). | Integration test inspecting `/api-docs` JSON in `dev` and proving disabled (`404`) in `prod` (`OpenApi*Test`), PLUS live `curl -s http://127.0.0.1:8080/api-docs` on running dev Docker stack capturing raw JSON paths, `bearerAuth`, `multipart/form-data`, and all `ErrorResponse` status mappings. |
| `AC-10` | Frontend "Hồ sơ công ty" passes Browser Test Protocol on `375/768/1024/1440px` in Light and Dark modes; Vitest/a11y tests added; `httpClient.ts` only; Check 9 green (`ORIGINAL_REQUEST.md` R4, AC-6). | `npm run test --prefix frontend` (reporting new count > 115, including rendering, validation, submit, error, `FormData`/`Blob` upload, and accessibility tests); grep proving single `fetch` in `httpClient.ts` and zero token storage; `node scripts/validate-agent-config.mjs` Check 9 PASS; `/browser` execution (or Parent `BROWSER_HOST_FACTS`) covering full user journeys, keyboard-only, expired/missing session, Light/Dark, and all 4 viewports with raw `scrollWidth <= innerWidth`, offset, touch-target, and contrast numbers. |
| `AC-11` | `e2e/` 4-tier suite passes on a fresh Docker Compose stack with new totals reported (`ORIGINAL_REQUEST.md` R4, AC-7). | Fresh `docker compose up -d --build --wait`, run `node e2e/run-all.mjs` (hermetic unique emails/tax codes, Mailpit `localhost:8025`, zero sleeps), capture raw totals (exceeding baseline `20 suites / 231 cases / 1139 assertions`) and exit code 0. |
| `AC-12` | `docs/dn01/README.md` and `docs/dn01/PR_DESCRIPTION.md` (EN + VI); git-ignored screenshots/plan; PR `#13`/`#14`/`#6` conflict report; stale `agent-config/` facts updated and synced (`ORIGINAL_REQUEST.md` R5, AC-8). | Inspect `docs/dn01/README.md` & `PR_DESCRIPTION.md` (EN + VI full diacritics, `[DN-01]` title, conflict table, follow-ups `LOCKED`/DN-05/NT-02); verify `git check-ignore -v docs/dn01/pr-screenshots/` + `ORDER.txt` + captions (and zero committed PNGs); update stale rules/docs in `agent-config/`, run `node scripts/sync-agent-config.mjs` and `node scripts/validate-agent-config.mjs` (`EXISTS` paths 100% real). |
| `AC-13` | All final quality gates green with raw output; Docker clean; nothing committed/staged; no new dependencies; `docker-compose.yml` untouched (`ORIGINAL_REQUEST.md` R5, AC-9). | Raw outputs (exit 0) for `./mvnw clean test` (JDK 25), `frontend` lint/type/build/test, `./check.sh`, `.\check.ps1` (26/26 gates), `sync-agent-config.mjs --check`, `validate-agent-config.mjs`, `check-gate-sync.mjs`, `compute-contrast.mjs`, `markdownlint`, `cspell` (0 issues, 0 inline directives), secret scan; `docker compose down -v` followed by `docker ps -a`, `docker volume ls`, `docker network ls` showing 0 `rikkei` resources; OS temp cleaned; `.env`/`*.pem` untouched; `git diff --cached --name-only` empty. |
| `AC-14` | Final report in Vietnamese with raw evidence per item, ambiguities/decisions, follow-ups, and ordered `T0231B5:` English commit proposals. | Vietnamese final report structured per AC-01..AC-14 with verbatim raw terminal outputs, design decisions, follow-ups (`LOCKED`, DN-05, NT-02), and ordered `T0231B5:` commit messages. |

---

## 6. Verbatim Working Method Note

Mandatory working method (kept verbatim from `D:\GitHub\Rikkei\.agents\PROMPT_DN01_EN.txt` line 116 and `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` line 30):

> "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

---

## Round DN-01-fix

- Document Path: `docs/dn01/PHASE0_ACK.md`
- Task Identifier: DN-01-fix (Task Code: `T0231B5`) — Merge of `origin/develop` (`fb4e771`), Conflict Resolution, and Review Findings (`F1`–`F9`)
- Branch: `feature/T0231B5-ho-so-cong-ty` (HEAD `fb4e771` = `origin/develop`, with uncommitted Round DN-01 changes re-applied)
- Working Directory: `D:\GitHub\Rikkei\rikkei-jobs`
- Timestamp (UTC): `2026-11-17T12:40:15Z`
- Status: Completed Prior to Any Conflict Resolution, Code, Test, Agent-Config, or Documentation Modification in Round DN-01-fix
- Zero Emoji & Zero Inline CSpell Directive Compliance: Verified (0 emoji characters, 0 inline cspell directives)

### 1. Inventory of Authoritative Files Read in Full (Round DN-01-fix)

1. **Authoritative Prompt & Scope Files**:
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (lines 1-45)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_EN.txt` (lines 1-116)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_FIX_EN.txt` (lines 1-47)
2. **Root Agent Entrypoints**:
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
   - `.claude/rules/07-security-rbac.md` (lines 1-77)
   - `.claude/rules/08-frontend-engineering.md` (lines 1-79)
   - `.claude/rules/09-frontend-design-bar.md` (lines 1-73)
   - `.claude/rules/10-testing-strategy.md` (lines 1-66)
   - `.claude/rules/11-docs-and-bilingual.md` (lines 1-53)
   - `.claude/rules/12-ci-and-quality-gates.md` (lines 1-85)
   - `.claude/rules/13-backend-data-access-performance.md` (lines 1-77)
   - `.claude/rules/14-backend-module-boundaries.md` (lines 1-66)
   - `.claude/rules/15-backend-observability-ops.md` (lines 1-80)
   - `.claude/rules/16-backend-integrations.md` (lines 1-93)
4. **All 28 Repository Skills (`.claude/skills/*/SKILL.md`)**:
   - *22 `READ FIRST` mandatory skills designated in `PROMPT_DN01_EN.txt`*:
     1. `.claude/skills/using-rikkei-skills/SKILL.md` (lines 1-86)
     2. `.claude/skills/test-driven-development/SKILL.md` (lines 1-89)
     3. `.claude/skills/systematic-debugging/SKILL.md` (lines 1-90)
     4. `.claude/skills/backend-module-feature/SKILL.md` (lines 1-148)
     5. `.claude/skills/backend-module-boundaries/SKILL.md` (lines 1-157)
     6. `.claude/skills/backend-persistence-performance/SKILL.md` (lines 1-157)
     7. `.claude/skills/flyway-migration-authoring/SKILL.md` (lines 1-142)
     8. `.claude/skills/spring-security-rbac-endpoint/SKILL.md` (lines 1-160)
     9. `.claude/skills/api-contract-and-errors/SKILL.md` (lines 1-157)
     10. `.claude/skills/external-system-integration-and-mock/SKILL.md` (lines 1-140)
     11. `.claude/skills/security-review-checklist/SKILL.md` (lines 1-138)
     12. `.claude/skills/frontend-feature-slice/SKILL.md` (lines 1-152)
     13. `.claude/skills/frontend-visual-design/SKILL.md` (lines 1-145)
     14. `.claude/skills/frontend-motion-design/SKILL.md` (lines 1-234)
     15. `.claude/skills/frontend-iconography/SKILL.md` (lines 1-156)
     16. `.claude/skills/frontend-accessibility-audit/SKILL.md` (lines 1-134)
     17. `.claude/skills/ci-local-and-debug/SKILL.md` (lines 1-178)
     18. `.claude/skills/verification-before-completion/SKILL.md` (lines 1-125)
     19. `.claude/skills/docs-bilingual-update/SKILL.md` (lines 1-137)
     20. `.claude/skills/requesting-code-review/SKILL.md` (lines 1-113)
     21. `.claude/skills/handoff-to-team-lead/SKILL.md` (lines 1-121)
     22. `.claude/skills/module-domain-knowledge/SKILL.md` (lines 1-235)
   - *6 additional R1 skills listed in `PROMPT_BASE_RULES_EN.txt`*:
     23. `.claude/skills/brainstorming-before-building/SKILL.md` (lines 1-89)
     24. `.claude/skills/writing-implementation-plans/SKILL.md` (lines 1-100)
     25. `.claude/skills/executing-plans/SKILL.md` (lines 1-95)
     26. `.claude/skills/dispatching-parallel-agents/SKILL.md` (lines 1-127)
     27. `.claude/skills/receiving-code-review/SKILL.md` (lines 1-129)
     28. `.claude/skills/writing-skills/SKILL.md` (lines 1-129)
5. **Existing Round DN-01 Phase 0 & Target Inspection Files**:
   - `docs/dn01/PHASE0_ACK.md` (lines 1-259, `## Round DN-01` preserved intact)
   - `backend/src/main/java/com/rikkei/jobs/company/service/CompanyLogoValidator.java` (lines 1-265)

### 2. Mandatory Working Method and Hard Rules (Verbatim)

Mandatory working method (kept verbatim from `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` line 30 and `D:\GitHub\Rikkei\.agents\PROMPT_DN01_EN.txt` line 116):

> "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

Binding operational hard rules for Round DN-01-fix:

- **Git Read-Only Without Exception**: Never execute `git commit`, `git push`, `git add`, `git stage`, `git rm`, `git checkout`, `git restore`, `git reset`, `git stash`, `git mv`, `git merge`, `git rebase`, or `git switch`. Leave all changes uncommitted on `feature/T0231B5-ho-so-cong-ty`; `git diff --cached --name-only` must remain empty. Ignore the Team Lead's backup stash entry.
- **Filesystem & Secret Hygiene**: Write only inside `D:\GitHub\Rikkei\rikkei-jobs` (and the assigned external scratch teamwork state folder). Never touch `D:\GitHub\Rikkei\.agents`, `"Tài liệu dự án"`, `.vscode`, `.env`, `*.pem`, or `first-key.pem`. Never print or store secret values. Do not create deliverables inside `rikkei-jobs/.agents/`.
- **Plain Text & Formatting Discipline**: Zero emoji anywhere; zero inline cspell ignore/disable directives; register only genuinely needed valid words in `cspell.json`; UI and email text in Vietnamese with full diacritics; code, comments, and `T0231B5:` commit proposals in English; final report in Vietnamese.
- **Flyway Immutability**: Never edit or rename any existing Flyway migration (`V1`–`V14`), never renumber `V9`/`V10`, and never change `spring.flyway.out-of-order` (`outOfOrder=false`).
- **TDD & Honest Verification**: Follow Red-Green-Refactor (`test-driven-development`) for every F5/F6 change; report PASS only for checks actually executed on the final workspace state with verbatim raw command outputs and exit codes; never use `Thread.sleep()` or arbitrary `setTimeout()`. Do not alter the Maven wrapper or CI workflow for the upstream Maven download network issue.
- **Frontend `/browser` Mandate**: Verify every UI screen, interaction, responsive viewport, and light/dark state exclusively via Antigravity's built-in `/browser` (localhost only).

### 3. Concrete Constraints and Proof Plans (`F1` through `F9`)

| Finding | Concrete Actionable Constraint | How Each Finding Will Be Proved |
|---|---|---|
| `F1` | Resolve all 14 conflict blocks across `cspell.json` (1), `DefaultProfileIntegrationTest.java` (4), `ProfileSeparationIntegrationTest.java` (6), and `SecurityHardeningIntegrationTest.java` (3), plus update `CompanyMigrationIntegrationTest.java` (`7` prod / `14` dev); keep all `develop` words/assertions (`V11`–`V14`) and DN-01 words/assertions (`V9`–`V10`), keeping `cspell.json` valid sorted JSON and exactly 9 seed users. | `git grep -n -E '^(<<<<<<< \|>>>>>>> )'` returns exit 1 (0 markers); `npx cspell "**/*"` reports 0 issues; `./mvnw test -Dtest=DefaultProfileIntegrationTest,ProfileSeparationIntegrationTest,SecurityHardeningIntegrationTest,CompanyMigrationIntegrationTest` exits 0 with raw test counts and 9 seed users verified. |
| `F2` | Inspect and verify every auto-merged shared file (`SecurityConfig.java`, `application.yml`, `frontend/src/App.tsx`, `frontend/src/shared/components/Icon.tsx`, `Icon.test.tsx`, `frontend/src/features/candidate/**`, and candidate pages): ensure DN-01 and PR `#6`/`#14` rules, YAML top-level keys, routes, and icons coexist with zero shadowed matchers or dropped imports. | Capture raw `git diff origin/develop -- <file>` per shared file proving only intentional DN-01 changes; prove `SecurityConfig` role matrix (including `GET /api/v1/me/job-recommendations` for `CANDIDATE`, `/api/v1/staff/**` for `STAFF`, `/api/v1/companies/me*` for `HR`) against the live stack; run frontend unit tests/build. |
| `F3` | Keep `V9`/`V10` versions unchanged and `outOfOrder=false`; do not edit merged migrations; document the developer DB recreation step (`docker compose down -v`) bilingually in `docs/dn01/README.md` and `docs/dn01/PR_DESCRIPTION.md`. | Execute real PostgreSQL / Testcontainers proofs capturing raw output: (a) empty DB migrates cleanly to `V13` (prod) and `V14` (dev); (b) `V10` (`companies` 1..2) and `V12` (`jobs` `company_id` 1..5) coexist without SQL errors; (c) a DB already at `V14` receiving `V9`/`V10` triggers the exact Flyway out-of-order validation error. |
| `F4` | Measure (never estimate) exact backend test, frontend test, E2E suite/case/assertion, contrast pair, sync, and gate totals on the merged tree; update stale facts in `agent-config/rules/{05,06,07,10,13,14}.md` and affected skills, then run `sync-agent-config.mjs` and `validate-agent-config.mjs`; rewrite `docs/dn01/PR_DESCRIPTION.md` section 7 and metadata with base `fb4e771` and only open PR `#13` (fresh `git show origin/feature/T023552-candidate-application:<path>` verification). | Capture raw measured counts from Maven, Vitest, `e2e/run-all.mjs`, and `compute-contrast.mjs`; `node scripts/sync-agent-config.mjs --check` and `node scripts/validate-agent-config.mjs --check` exit 0 with every `EXISTS` path verified on disk; `PR_DESCRIPTION.md` lists only PR `#13` (`V15+` renumber + `companies` reuse). |
| `F5.1` | Check image width and height from the ImageIO header BEFORE `reader.read(0)` pixel allocation, rejecting `width > 4,096`, `height > 4,096`, or `width * height > MAX_IMAGE_PIXELS` with HTTP `400 VALIDATION_ERROR` (Vietnamese message) while keeping valid decoding. **TEAM LEAD CONFIRMATION REQUIRED BEFORE FINAL M2 LOCK-IN**: `PROMPT_DN01_FIX_EN.txt` F5.1 states both rejecting `width * height > 16,000,000` (`16_000_000`) and accepting a `4,096 x 4,096` valid image (`4,096 * 4,096 = 16,777,216` pixels > `16,000,000`), which conflict mathematically; confirm with the Team Lead whether `MAX_IMAGE_PIXELS` is `16_777_216` or `16_000_000` before locking M2. | TDD Red -> Green raw outputs: tiny-byte PNG claiming oversized header dimensions fails without `OutOfMemoryError` (`400 VALIDATION_ERROR`), boundary valid image passes, boundary 1 px / 1 unit above fails `400`, plus E2E coverage. |
| `F5.2` | Make `version` mandatory (`@NotNull` + OpenAPI `REQUIRED`) on `UpdateCompanyRequest` for `PUT /api/v1/companies/me`: missing/null `version` returns `400 VALIDATION_ERROR` (Vietnamese), stale `version` returns `409 CONFLICT`; update existing backend tests, frontend, OpenAPI examples, and docs. | TDD Red -> Green raw outputs for unit, integration, OpenAPI, and E2E tests proving missing `version` -> `400`, stale `version` -> `409`, and matching `version` -> `200` with incremented `version`. |
| `F5.3` | Replace `server.tomcat.max-swallow-size: -1` in `application.yml` with a bounded value (e.g., `5MB`, strictly above `max-request-size: 3MB`); do not revert to `-1`. | Live raw proof on both `:3000` (Nginx) and `:8080` (direct backend): (a) exact `2 MB` (`2,097,152` bytes) returns `200`; (b) `2 MB + 1 B` (`2,097,153` bytes) returns `413 PAYLOAD_TOO_LARGE` unified JSON `ErrorResponse`; (c) `20 MB` body behaviour (refused / connection closed without full read) recorded verbatim. |
| `F5.4` | Eliminate all string-splitting spellcheck bypasses (`"no" + "sniff"`, `"ph" + "ar"`, `"jsp" + "x"`, `"end" + "obj"`, and all string-concatenation word-split occurrences across backend, frontend, and E2E), replacing them with plain literals and registering only genuinely flagged valid terms in `cspell.json` (zero inline cspell directives). | `git grep` over DN-01 diff confirms 0 split-word literals remaining; `npx cspell "**/*"` exits 0 with 0 issues and 0 inline directives. |
| `F5.5` | Keep accepted `502 EMAIL_DELIVERY_FAILED` mail-failure behaviour (HR account retained, password never logged); document honestly in `docs/dn01/README.md` and `PR_DESCRIPTION.md` (EN + VI) that STAFF receives `409` on retry and recovery uses NT-01 forgot-password; add `"re-issue / resend HR onboarding mail (DN-05)"` to follow-ups. | Automated integration test + live Docker stack proof showing an HR account created during simulated mail failure (`502 EMAIL_DELIVERY_FAILED`) completes NT-01 forgot-password reset via Mailpit and logs in successfully (or report honestly if blocked). |
| `F6` | Update frontend `company` slice to require and refresh `version` after load, save, and logo upload; keep `RoleHomeLayout` light/dark toggle disclosed in `PR_DESCRIPTION.md`; add tests for missing-version handling, post-upload version refresh, and toggle non-persistence (`localStorage`/`sessionStorage`/`cookie`). | `npm run test --prefix frontend` exits 0 with new tests; `/browser` protocol executed on company screen (`375/768/1024/1440px` L/D) and merged candidate pages (home, gap analysis, JD detail at `375/1440px` L/D) with raw `scrollWidth <= innerWidth`, console errors `0`, contrast ratios, and updated `docs/dn01/pr-screenshots/` + `ORDER.txt`. |
| `F7` | Run and verify all quality gates on the final merged tree without altering Maven wrapper or CI workflow, confirming 9 dev seed users and identical 26/26 gate counts across `./check.sh` and `.\check.ps1`. | Raw command outputs (exit 0) for `./mvnw clean test spotless:check spotbugs:check` (JDK 25), frontend lint/typecheck/test/build, `node mock/test-runner.js`, fresh-stack `node e2e/run-all.mjs`, `sync-agent-config --check`, `validate-agent-config --check`, `check-gate-sync`, `check-version-drift`, `compute-contrast`, `markdownlint`, `cspell`, secret scan, `./check.sh`, and `.\check.ps1`. |
| `F8` | Update `docs/dn01/README.md`, `docs/dn01/PR_DESCRIPTION.md`, and `docs/dn01/BROWSER_OBSERVATIONS.md` (EN + VI, full diacritics, zero emoji, zero inline cspell directives) with measured numbers, base `fb4e771`, PR `#13`-only conflict table, F3 migration note, F5.5 recovery note, F6 toggle disclosure, and new browser runs. | Inspect rendered markdown sections; `npx markdownlint-cli2` and `npx cspell` pass with 0 errors and 0 inline directives; `node scripts/validate-agent-config.mjs` Check 3 (zero emoji) and Check 4.2 pass. |
| `F9` | Deliver clean end state: 8 ordered `T0231B5:` English commit proposals on top of `fb4e771` using verified real repository paths, zero Docker containers/volumes/networks named `rikkei`, zero temp files, zero untracked files outside DN-01 scope, empty `git diff --cached --name-only`, zero conflict markers, and Vietnamese final report. | `docker compose down -v` followed by `docker ps -a`, `docker volume ls`, `docker network ls` showing 0 `rikkei` items; `git diff --cached --name-only` empty; `git grep -n -E '^(<<<<<<< \|>>>>>>> )'` empty; `git status --short` clean of rogue files. |

---

## Round DN-01-cloud

- Document Path: `docs/dn01/PHASE0_ACK.md`
- Task Identifier: DN-01-cloud (Task Code: `T0231B5`) — Migrate Company Logo Storage from PostgreSQL to Cloudinary CDN (`C1`–`C10`)
- Branch: `feature/T0231B5-ho-so-cong-ty` (HEAD `fb4e771` = `origin/develop`, with uncommitted Round DN-01 and DN-01-fix changes)
- Working Directory: `D:\GitHub\Rikkei\rikkei-jobs`
- Timestamp (UTC): `2026-11-18T03:54:46Z`
- Status: Completed Prior to Any Code, Migration, Mock, Config, Env, Agent-Config, or Documentation Modification in Round DN-01-cloud
- Zero Emoji & Zero Inline CSpell Directive Compliance: Verified (0 emoji characters, 0 inline cspell directives)

### 1. Inventory of Authoritative Files Read in Full (Round DN-01-cloud)

1. **Authoritative Prompt & Scope Files**:
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (lines 1-45)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_EN.txt` (lines 1-116)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_FIX_EN.txt` (lines 1-47)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_CLOUD_EN.txt` (lines 1-63)
2. **Root Agent Entrypoints**:
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
   - `.claude/rules/07-security-rbac.md` (lines 1-77)
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
   - *22 `READ FIRST` mandatory skills designated in `PROMPT_DN01_EN.txt`*:
     1. `.claude/skills/using-rikkei-skills/SKILL.md` (lines 1-86)
     2. `.claude/skills/test-driven-development/SKILL.md` (lines 1-89)
     3. `.claude/skills/systematic-debugging/SKILL.md` (lines 1-90)
     4. `.claude/skills/backend-module-feature/SKILL.md` (lines 1-148)
     5. `.claude/skills/backend-module-boundaries/SKILL.md` (lines 1-157)
     6. `.claude/skills/backend-persistence-performance/SKILL.md` (lines 1-157)
     7. `.claude/skills/flyway-migration-authoring/SKILL.md` (lines 1-142)
     8. `.claude/skills/spring-security-rbac-endpoint/SKILL.md` (lines 1-160)
     9. `.claude/skills/api-contract-and-errors/SKILL.md` (lines 1-157)
     10. `.claude/skills/external-system-integration-and-mock/SKILL.md` (lines 1-140)
     11. `.claude/skills/security-review-checklist/SKILL.md` (lines 1-138)
     12. `.claude/skills/frontend-feature-slice/SKILL.md` (lines 1-152)
     13. `.claude/skills/frontend-visual-design/SKILL.md` (lines 1-145)
     14. `.claude/skills/frontend-motion-design/SKILL.md` (lines 1-234)
     15. `.claude/skills/frontend-iconography/SKILL.md` (lines 1-156)
     16. `.claude/skills/frontend-accessibility-audit/SKILL.md` (lines 1-134)
     17. `.claude/skills/ci-local-and-debug/SKILL.md` (lines 1-178)
     18. `.claude/skills/verification-before-completion/SKILL.md` (lines 1-125)
     19. `.claude/skills/docs-bilingual-update/SKILL.md` (lines 1-137)
     20. `.claude/skills/requesting-code-review/SKILL.md` (lines 1-113)
     21. `.claude/skills/handoff-to-team-lead/SKILL.md` (lines 1-121)
     22. `.claude/skills/module-domain-knowledge/SKILL.md` (lines 1-236)
   - *6 additional R1 skills listed in `PROMPT_BASE_RULES_EN.txt`*:
     23. `.claude/skills/brainstorming-before-building/SKILL.md` (lines 1-89)
     24. `.claude/skills/writing-implementation-plans/SKILL.md` (lines 1-100)
     25. `.claude/skills/executing-plans/SKILL.md` (lines 1-95)
     26. `.claude/skills/dispatching-parallel-agents/SKILL.md` (lines 1-127)
     27. `.claude/skills/receiving-code-review/SKILL.md` (lines 1-129)
     28. `.claude/skills/writing-skills/SKILL.md` (lines 1-129)
5. **Existing Phase 0, Mock, Config, and Lint Target Files Read in Full**:
   - `docs/dn01/PHASE0_ACK.md` (lines 1-366, preserving `## Round DN-01` and `## Round DN-01-fix`)
   - `mock/server.js` (lines 1-400)
   - `mock/test-runner.js` (lines 1-411)
   - `mock/README.md` (lines 1-165)
   - `docs/mock-contract.md` (lines 1-485)
   - `.env.example` (lines 1-57)
   - `docker-compose.yml` (lines 1-159)
   - `frontend/nginx.conf` (lines 1-96)
   - `.markdownlint-cli2.jsonc` (lines 1-11)
   - `cspell.json` (lines 1-256)

### 2. Mandatory Working Method and Hard Rules (Verbatim)

Mandatory working method (kept verbatim from `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` line 30 and `D:\GitHub\Rikkei\.agents\PROMPT_DN01_EN.txt` line 116):

> "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

Binding operational hard rules for Round DN-01-cloud:

- **Git Read-Only Without Exception**: Never execute `git commit`, `git push`, `git add`, `git stage`, `git rm`, `git checkout`, `git restore`, `git reset`, `git stash`, `git mv`, `git merge`, `git rebase`, or `git switch`. Leave all changes uncommitted on `feature/T0231B5-ho-so-cong-ty`; `git diff --cached --name-only` must remain empty. Ignore the Team Lead's backup stash entry.
- **Secrets & `.env` Isolation**: Real Cloudinary credentials exist only in git-ignored `.env`. Never read, open, print, copy, or ask for `.env`, `*.pem`, or `first-key.pem`. Never run bare `docker compose config` without `--quiet` or `--env-file .env.example` at the repository root. Keep `CLOUDINARY_API_BASE_URL` commented out in `.env`; execute all automated tests strictly against the local mock (never against the real Cloudinary account). Never write real credential values in any file, log, test, OpenAPI example, doc, screenshot, or report.
- **Zero New Dependencies**: Add zero new dependencies in `backend/pom.xml`, `frontend/package.json`, or `mock/package.json`.
- **Plain Text, Language & Formatting Discipline**: Zero emoji anywhere; zero inline `cspell:` ignore/disable directives (register legitimate words in `cspell.json`); zero machine-specific host paths; UI and email text in Vietnamese with full diacritics; code, comments, and `T0231B5:` commit proposals in English; final report in Vietnamese citing verified real repository paths.
- **Frontend `/browser` Mandate**: Verify every UI state, interaction, responsive viewport (`375/768/1024/1440px`), and Light/Dark mode exclusively via Antigravity's built-in `/browser` (localhost only) and satisfy Rule 09's 12-point rubric (`>= 11/12`, zero criteria at `0`).

### 3. Concrete Constraints and Proof Plans (`C1` through `C10`)

| Item | Concrete Actionable Constraint | How Each Item Will Be Proved |
|---|---|---|
| `C1` | Own `LogoStorage` port (`store(companyId, validatedLogo)` returning immutable `StoredLogo(publicId, secureUrl)`, and `delete(publicId)`) plus one implementation `CloudinaryLogoStorage` inside `com.rikkei.jobs.company`; `CompanyServiceImpl` depends only on `LogoStorage`. Add one `application/x-www-form-urlencoded` POST method for an absolute URL with caller timeout to `backend/src/main/java/com/rikkei/jobs/common/client/ExternalApiClient.java` (never send `X-Service-Key` to third parties; never log request/response bodies, URL query values, or secrets; forbid raw `HttpClient`/`RestTemplate` in business modules, multipart, or Cloudinary SDK). Send server-generated params (`api_key`, `timestamp` from injectable `java.time.Clock`, `public_id = rikkei-jobs/company-logos/company-<companyId>`, `overwrite=true`, `invalidate=true`, `unique_filename=false`, `file` data URI, and SHA-1 `signature` per official Cloudinary docs — recording docs URL and check date). Strictly parse `secure_url`, `public_id`, `version` and reject any `secure_url` not starting with configured `CLOUDINARY_DELIVERY_BASE_URL`. | Unit test proving SHA-1 `signature` against a documented official Cloudinary example vector; adapter test against JDK built-in `com.sun.net.httpserver.HttpServer` proving `application/x-www-form-urlencoded`, absence of `X-Service-Key`, and rejection of non-2xx/timeout/invalid JSON/missing fields/unexpected `secure_url` prefix; service unit tests using fake `LogoStorage`. |
| `C2` (`CHANGE`) | Because DN-01 is not yet merged into `develop`, edit `backend/src/main/resources/db/migration/V9__company_profile.sql` (and document this justification in the final report): completely remove `company_logos` (table, constraints, indexes), add `logo_public_id VARCHAR(255)` to `companies` (keep `logo_url VARCHAR(500)` and idempotent `IF NOT EXISTS` / guarded constraints), and leave `V10__dev_company_seed.sql` and all other migrations untouched. Delete dead DB-blob code and tests (`CompanyLogo`, `CompanyLogoRepository`, `CompanyLogoData`, BYTEA storage, `getMyLogo` in service/controller, and their tests); update `CompanyMigrationIntegrationTest`, migration tests, rules (`06`, `13`, `14`, `16`), and docs, then sync `agent-config`. | `V9__company_profile.sql` passes SQLFluff 4.5.0; `CompanyMigrationIntegrationTest`, `FlywayMigrationIntegrationTest`, `DefaultProfileIntegrationTest`, and `ProfileSeparationIntegrationTest` pass on Testcontainers verifying `company_logos` does not exist, `companies.logo_public_id` exists, and 9 seed users remain intact; `./mvnw clean test` confirms zero remaining DB-blob references. |
| `C3` | Keep all `CompanyLogoValidator` checks on `POST /api/v1/companies/me/logo` (`HR`) unchanged (magic bytes, `2,097,152` vs `2,097,153` byte boundary, `4,096` px caps, double extension, traversal, polyglot markup, multipart limits, `413`). Run validation and Cloudinary upload completely OUTSIDE `@Transactional`, opening only a short transaction to update `companies.logo_url` and `logo_public_id` and return `CompanyResponse` with new `logoUrl` and refreshed `version`. Remove `GET /api/v1/companies/me/logo` (OpenAPI lists 5 DN-01 operations). Map any storage failure (unreachable, timeout, non-2xx, bad credentials, invalid JSON, rejected `secure_url`) to HTTP `502` `LOGO_STORAGE_UNAVAILABLE` with unified Vietnamese `ErrorResponse {code, message}`, DB unchanged, zero provider detail/URL/key in message, log HTTP status class only, and max 1 quick network retry bounded by timeout. Document public CDN URL privacy in docs. | Controller/integration tests proving `POST /companies/me/logo` updates `logoUrl` + `version`, `GET /companies/me/logo` no longer exists, 5-operation RBAC role matrix + cross-tenant `404` hold, transaction boundary holds no DB connection during HTTP upload, `502 LOGO_STORAGE_UNAVAILABLE` leaves DB unchanged with clean message, and live `/api-docs` exposes 5 DN-01 operations. |
| `C4` | Create `@ConfigurationProperties` / record with masked `toString()` reading `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_API_BASE_URL`, `CLOUDINARY_DELIVERY_BASE_URL`, and timeout; `application.yml` uses dummy non-secret mock defaults only. Minimally update `docker-compose.yml` (`${VAR:-dummy}` defaults, zero new named volumes) and add fake placeholders + comments to `.env.example` (never reading `.env`). Extend `ProdEnvironmentValidator` to fail fast in `prod` on dummy, blank, non-`https://`, or mock URLs. Never log, serialize, or expose `api_key`, `api_secret`, or `signature`. | Unit test for masked `toString()`; unit/integration tests for `ProdEnvironmentValidator` (`prod` profile); log-capture (`ListAppender`) test covering both full upload and failing upload proving zero key/secret/signature leakage; safe `docker compose --env-file .env.example config` + `docker compose config --quiet`; and M6 proof of all 3 `scripts/run-ci-in-docker.*` scenarios per Round 2C-fix. |
| `C5` | Extend `mock/server.js` with a separate `/cloudinary/*` router exempt from `X-Service-Key` and `requestLog` (preserving 11 business endpoints and `"Mock chạy ở http://localhost:${PORT}"` startup log): `POST /cloudinary/v1_1/:cloud/image/upload` (`urlencoded` 5 MB limit, `api_key` + SHA-1 signature check returning `401` on mismatch, data URI decode, in-memory store, JSON `{public_id, secure_url, version, format, bytes}`), `GET /cloudinary/:cloud/image/upload/*rest` returning raw bytes with exact `Content-Type` or `404`, optional `POST /cloudinary/v1_1/:cloud/image/destroy`, `PUBLIC_BASE_URL` (default `http://127.0.0.1:9000`) matching `CLOUDINARY_DELIVERY_BASE_URL`, and 5th `/mock/*` testing tool (`POST /mock/cloudinary/fail-next`) plus `/mock/reset` cleanup. Keep `frontend/nginx.conf` never proxying mock. Update `mock/test-runner.js`, `docs/mock-contract.md` (EN + VI), `mock/README.md`, and rules/docs counts. | `node mock/test-runner.js` passes all 11 business endpoints, 5 testing tools, SHA-1 vector, PNG/JPEG upload & byte-exact delivery, `401` mismatch, `400` bad data URI, `404`, `destroy`, single-shot `fail-next`, `/mock/reset`, and `/mock/requests` exclusion of `/cloudinary/*`; grep confirms `frontend/nginx.conf` does not proxy `/mock` or `/cloudinary`. |
| `C6` | Follow Red-Green TDD: (a) Backend tests for signature vector, adapter vs JDK `HttpServer`, service vs fake `LogoStorage`, controller/integration (`POST /companies/me/logo`, `502 LOGO_STORAGE_UNAVAILABLE`, removed `GET /companies/me/logo`, 5-op role matrix, cross-tenant `404`, `version` refresh), `ProdEnvironmentValidator`, and 0-secret log-capture; (b) E2E opaque-box suite on fresh Compose stack testing JPG/PNG upload + direct `logoUrl` fetch byte/Content-Type match, `2 MB` vs `2 MB + 1 B`, invalid files, forced `502` + recovery on retry, zero secret in responses or `docker compose logs backend`, and updated 4 `company` suites. Report measured totals. | Raw Red -> Green outputs; `./mvnw clean test spotless:check spotbugs:check` (JDK 25) exit 0; fresh-stack `node e2e/run-all.mjs` exit 0 with measured suites/cases/assertions counts. |
| `C7` | Render company logo via `<img src={logoUrl} referrerPolicy="no-referrer">` (Vietnamese alt text, skeleton/shimmer loading, smooth fade-in, fallback tile with `<Icon>` when absent or on error); remove unused blob preview flow (`requestBlob`, `fetchCompanyLogoBlob`, object-URL) while preserving `FormData` and single `fetch` in `httpClient.ts`. Meet Rule 09 Visual Quality Bar & 4 frontend skills: all designed states (empty, loading, ready, uploading, success, inline `502` + retry, `413`/validation), drag-drop/click target, motion budgets (`<=150ms`/`<=300ms`, `transform`/`opacity`) wrapped in `@media (prefers-reduced-motion: reduce)` (`100ms` cross-fade), reserved box (`CLS = 0`), tokens only (Check 9), Vietnamese full diacritics, 0 emoji, WCAG contrast Light & Dark, responsive `375/768/1024/1440px`. Verify no `Content-Security-Policy` in `frontend/nginx.conf`. | `npm run lint/typecheck/test/build --prefix frontend` exit 0; grep on `frontend/nginx.conf` confirms 0 `Content-Security-Policy`; `/browser` execution (via Parent) captures all states + 4 viewports Light/Dark (with real mock upload & delivery), scores `>= 11/12` (zero 0s) on Rule 09 rubric, fixes any visual defects, and refreshes `docs/dn01/pr-screenshots/` + `ORDER.txt`. |
| `C8` | Never test against the real Cloudinary account; keep switching trivial and document clearly in `README` / `docs/dn01/README.md` (EN + VI, variable NAMES only): set the 3 credentials, set `CLOUDINARY_API_BASE_URL` to official `https` URL and `CLOUDINARY_DELIVERY_BASE_URL` to matching `res.cloudinary.com` prefix, and restart backend for Team Lead smoke test. | Inspection of EN + VI docs confirms complete switch instructions using only variable names/dummy placeholders; `.env` remains unread and unexposed. |
| `C9` | Update `docs/dn01/README.md`, `docs/dn01/PR_DESCRIPTION.md` (EN + VI, full diacritics, 0 emoji), and `docs/dn01/BROWSER_OBSERVATIONS.md` covering owner's decision, architecture, variable names table, `502 LOGO_STORAGE_UNAVAILABLE`, public CDN URL privacy note, why `V9` was edited, removal of `GET /companies/me/logo`, mock extension, `docker-compose.yml` change, security recommendation to rotate the Cloudinary API secret after delivery, honest note on PR `#6`'s `375px` `/` overflow (do not fix), and updated `T0231B5:` commit proposals on top of `fb4e771` (never mentioning DB blob storage in branch commit history; grouping mock changes into their own commit). Update stale facts in `agent-config/` (`06`, `07`, `10`, `13`, `14`, `16` + skills) and sync/validate. | `node scripts/sync-agent-config.mjs --check` and `node scripts/validate-agent-config.mjs` exit 0 (`EXISTS` paths real); `markdownlint` and `cspell` 0 issues; commit proposal inspection confirms zero DB blob mention and separate mock commit. |
| `C10` | Execute all final gates with raw output on final tree: `./mvnw clean test spotless:check spotbugs:check`, frontend lint/typecheck/test/build, `node mock/test-runner.js`, fresh-stack `node e2e/run-all.mjs`, `sync-agent-config --check`, `validate-agent-config`, `check-gate-sync`, `check-version-drift`, `compute-contrast`, `markdownlint`, `cspell` (0 issues, 0 inline directives), secret scan (0 real Cloudinary values), `./check.sh` and `.\check.ps1` (26/26 each), 3-scenario `scripts/run-ci-in-docker.*`, and 9 seed users in dev DB. Tear down with `docker compose down -v` (0 `rikkei` containers/volumes/networks), remove OS temp files, verify empty `git diff --cached --name-only`, 0 conflict markers, and deliver Vietnamese report with verified real paths. | Verbatim raw outputs (exit 0) for every gate; empty `docker ps -a` / `docker volume ls` / `docker network ls` for `rikkei`; empty `git diff --cached --name-only`; `git grep -n -E '^(<<<<<<< \|>>>>>>> )'` exit 1; clean `git status --short`. |

---

## Round DN-01-polish

- Document Path: `docs/dn01/PHASE0_ACK.md`
- Task Identifier: DN-01-polish (Task Code: `T0231B5`) — UI Consistency (Dropdowns and Form Controls), Measured `/browser` Evidence, Report Accuracy, and Surefire Exit Warning Investigation (`U1`–`U3`, `P1`–`P5`)
- Branch: `feature/T0231B5-ho-so-cong-ty` (HEAD `fb4e771` = `origin/develop`, with uncommitted Round DN-01, DN-01-fix, and DN-01-cloud changes)
- Working Directory: `D:\GitHub\Rikkei\rikkei-jobs`
- Timestamp (UTC): `2026-11-18T09:43:18Z`
- Integrity Mode: `development`
- Status: Completed Prior to Any Code, Test, Style, Agent-Config, or Other Documentation Modification in Round DN-01-polish
- Zero Emoji & Zero Inline CSpell Directive Compliance: Verified (0 emoji characters, 0 inline cspell directives)

### 1. Inventory of Authoritative Files Read in Full

1. **Authoritative Prompt & Scope Files**:
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (lines 1-45)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_POLISH_EN.txt` (lines 1-38)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_EN.txt` (lines 1-116)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_FIX_EN.txt` (lines 1-47)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_CLOUD_EN.txt` (lines 1-63)
2. **Root Agent Entrypoints**:
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
4. **Applicable Skills Read in Full and Why Each Applies**:
   - `.claude/skills/frontend-visual-design/SKILL.md` (lines 1-145) + `references/token-tables.md` (lines 1-113), `references/anti-ai-rubric.md` (lines 1-66), `references/screenshot-protocol.md` (lines 1-100): Governs shared `Select` token-only styling (`Check 9`), light/dark surface and `color-scheme` parity, cross-screen control consistency, zero emoji, and measured evidence for the 12-point Anti-AI rubric.
   - `.claude/skills/frontend-motion-design/SKILL.md` (lines 1-234) + `references/motion-tokens.css` (lines 1-122), `references/recipes.md` (lines 1-572), `references/spring-presets.md` (lines 1-160): Governs the `150ms ease-out` transition alignment on shared `Select` and form controls, compositor-only properties, and emulated `prefers-reduced-motion` (`0.001ms` / `100ms` cross-fade) verification.
   - `.claude/skills/frontend-iconography/SKILL.md` (lines 1-156) + `references/icon-checklist.md` (lines 1-54): Governs rendering the `Select` chevron via the existing curated `<Icon />` component (or token-colored CSS mask without raw color literals) on a strict `24x24` `2px`-stroke grid with `aria-hidden="true"`.
   - `.claude/skills/frontend-accessibility-audit/SKILL.md` (lines 1-134) + `references/a11y-checklist.md` (lines 1-54): Governs native `<select>` keyboard semantics (Tab, Space, Enter, Arrow keys), `<label htmlFor>`, `aria-describedby`, `aria-invalid`, `:focus-visible` halo parity, `>= 24px` target sizing, and computed contrast across light and dark modes.
   - `.claude/skills/docs-bilingual-update/SKILL.md` (lines 1-137): Governs the bilingual (EN + VI, full diacritics) `Select` section in `docs/design/DESIGN_SYSTEM.md`, accurate updates to `docs/dn01/{README,PR_DESCRIPTION,BROWSER_OBSERVATIONS}.md` and `ORDER.txt`, `markdownlint-cli2`, and `cspell` with zero inline directives.
   - `.claude/skills/verification-before-completion/SKILL.md` (lines 1-125): Governs empirical raw-output verification across Maven (JDK 25), Vitest, E2E, `./check.sh`, `.\check.ps1`, `sync-agent-config.mjs`, `validate-agent-config.mjs`, and honest `/browser` reporting without self-scoring.
   - *Supporting workflow skills also refreshed*: `.claude/skills/using-rikkei-skills/SKILL.md` (lines 1-86), `.claude/skills/test-driven-development/SKILL.md` (lines 1-89), `.claude/skills/systematic-debugging/SKILL.md` (lines 1-90), `.claude/skills/frontend-feature-slice/SKILL.md` (lines 1-152), `.claude/skills/ci-local-and-debug/SKILL.md` (lines 1-178), `.claude/skills/requesting-code-review/SKILL.md` (lines 1-113), and `.claude/skills/handoff-to-team-lead/SKILL.md` (lines 1-121).
5. **Existing Phase 0 & Linters Configuration Inspected**:
   - `docs/dn01/PHASE0_ACK.md` (lines 1-478, preserving `## Round DN-01`, `## Round DN-01-fix`, and `## Round DN-01-cloud` intact)
   - `.markdownlint-cli2.jsonc` (lines 1-11)
   - `cspell.json` (lines 1-257)
   - `scripts/validate-agent-config.mjs` (lines 250-450 and 600-800)

### 2. Mandatory Working Method and Hard Rules (Verbatim)

Mandatory working method (kept verbatim from `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` line 30):

> "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

Binding operational hard rules for Round DN-01-polish:

- **Git Read-Only Without Exception**: Never execute `git commit`, `git push`, `git add`, `git stage`, `git rm`, `git checkout`, `git restore`, `git reset`, `git stash`, `git mv`, `git merge`, `git rebase`, or `git switch`. Stay on `feature/T0231B5-ho-so-cong-ty` (HEAD `fb4e771`), leave all changes uncommitted, and keep `git diff --cached --name-only` empty. Never touch the Team Lead's `git stash`.
- **Secrets & `.env` Isolation**: Never read, open, print, copy, or ask for `.env`, `*.pem`, or `first-key.pem`. All automated tests run against the local mock (`CLOUDINARY_API_BASE_URL` stays commented in `.env`).
- **Zero New Dependencies**: Never add any new dependency to `backend/pom.xml`, `frontend/package.json`, or `mock/package.json`.
- **Plain Text, Language & Formatting Discipline**: Zero emoji anywhere; zero inline `cspell:` ignore/disable directives (register new valid words in `cspell.json` only if `cspell` reports them); UI copy in Vietnamese with full diacritics; code, comments, and `T0231B5:` commit proposals in English; final report in Vietnamese with full diacritics and verified real repository paths.
- **Frontend `/browser`-Only Verification**: Verify every screen, control measurement, interaction state, viewport (`375`, `768`, `1024`, `1440`), light/dark theme, and `prefers-reduced-motion` exclusively via Antigravity's built-in `/browser` (localhost only). Never self-score any rubric criterion without measured evidence or screenshots; any criterion without evidence scores `0`.

### 3. Concrete Constraints and Proof Plans (`U1`–`U3` and `P1`–`P5`)

| Item | Concrete Actionable Constraint | How Each Item Will Be Proved |
|---|---|---|
| `U1` | Re-measure all three `<select>` elements and `color-scheme` via `/browser` JavaScript first (`CompanyProfileForm.tsx` `rj-input cp-select` vs `.rj-input:focus` 3px halo; `GapAnalysisSection.tsx` `gap-select`; `.candidate-select` in `jobRecommendations.css`; `appearance: auto`, `color-scheme: normal`, and transparent `option` backgrounds in dark mode). | Verbatim `/browser` baseline JavaScript measurements recorded in `docs/dn01/BROWSER_OBSERVATIONS.md` before edits, and post-fix re-measurements showing unified metrics and themed `color-scheme`/`option` styles. |
| `U2` | Unify the duplicate logo upload status wording in the company logo panel (`"Đang lưu logo..."` in frame vs `"Đang tải logo..."` on drop zone) to a single consistent Vietnamese wording. | Inspection + Vitest assertion + `/browser` screenshot of the uploading state confirming identical wording across the panel. |
| `U3` | Re-measure every control type across screens (buttons, inputs, textarea, selects, checkboxes, file buttons, alerts, cards, badges, tables) to identify any cross-screen mismatches in height, border-radius, border, font-size/weight/family, padding, background, transition-duration, focus ring, or hover/active/disabled behaviour. | Per-control-type `/browser` computed-style tables in `docs/dn01/BROWSER_OBSERVATIONS.md` marking every mismatch, distinguishing fixed DN-01/shared/token items from untouched teammate-owned items. |
| `P1` | Create shared `frontend/src/shared/components/Select.tsx` (+ shared token-only CSS, Check 9 green, + Vitest/Testing Library tests) with typed props, `forwardRef`, `label`/`aria-describedby`/`aria-invalid`/`required`/`disabled`, native `<select>` semantics, `appearance: none` + tokenized chevron via `<Icon />` or token-colored CSS mask, and exact `.rj-input` metrics (`--rj-density-input-height`, radius, padding, font size/weight, border, background, `150ms ease-out` transition, hover, `:focus` 3px halo, `:focus-visible`, `aria-invalid`, disabled) in light and dark modes. Declare `color-scheme` in global styles (`light` for light, `dark` for `[data-theme='dark']` and `@media (prefers-color-scheme: dark)` matching `RoleHomeLayout`) plus explicit token colors/backgrounds for `option`/`optgroup`. Replace company size select (`CompanyProfileForm.tsx`) and gap analysis select (`GapAnalysisSection.tsx` — minimal diff only, disclosed in `PR_DESCRIPTION.md`) with shared `Select`; delete `.cp-select`, `.gap-select`, and dead `.candidate-select` CSS; update tests; add bilingual (EN + VI) `Select` section to `docs/design/DESIGN_SYSTEM.md`. | `npm run lint/typecheck/test/build --prefix frontend` exit 0; `node scripts/validate-agent-config.mjs` Check 9 green; `/browser` computed-style proof of `Select` matching `.rj-input`, computed `color-scheme`, and `option`/`optgroup` styles + open-list screenshots in light/dark (or honest `/browser` native-popup limitation note if native popup cannot be captured). |
| `P2` | Collect `/browser` JavaScript computed styles (`height`, `border-radius`, `border` color/width, `font-size`/`weight`/`family`, `padding`, `background`, `transition-duration`, `focus` outline/box-shadow) for every control type across all HR and CANDIDATE reachable screens (login enterprise & SSO tabs, forgot/reset/change password, HR home, company profile, candidate home, skills, gap analysis, job detail, evaluations) in light and dark at `1440` and `375`. Write one table per control type in `docs/dn01/BROWSER_OBSERVATIONS.md`; fix every mismatch in DN-01 files, shared styles, or pure token/metric alignments; list untouched teammate-owned mismatches (including known `375px` `/` jobs grid overflow). Replace self-scored Rule 09 rubric with measured evidence + score table citing supporting measurement/screenshot per criterion. | `docs/dn01/BROWSER_OBSERVATIONS.md` tables showing `0` unexplained differences for inputs, textarea, selects, and primary/secondary buttons in DN-01 and shared files, plus evidence-backed Rule 09 rubric table (`0` points if unverified). |
| `P3` | For every control on the company screen (inputs, textarea, shared `Select`, drop zone, buttons), capture `/browser` screenshots of default, hover, `focus-visible`, disabled, `aria-invalid` with message, and filled states in light and dark; verify Tab order, Space/Enter/Arrow keys on `Select`, `>= 24px` minimum targets, and emulated `prefers-reduced-motion` (`0.001ms` / `100ms` cross-fade). Fix every defect found. | Screenshots stored in git-ignored `docs/dn01/pr-screenshots/` + `ORDER.txt`, plus raw `/browser` keyboard, target-size, and reduced-motion verification logs in `docs/dn01/BROWSER_OBSERVATIONS.md`. |
| `P4` | Audit every statement in `docs/dn01/README.md`, `docs/dn01/PR_DESCRIPTION.md` (EN + VI), `docs/dn01/BROWSER_OBSERVATIONS.md`, `docs/dn01/pr-screenshots/ORDER.txt`, and final Vietnamese report against actual repository files and command outputs (e.g., `cloudinary` prefix in `CloudinaryProperties.java`/`application.yml`, `https://res.cloudinary.com/<your-cloud-name>/image/upload` in `README`/`.env.example`), removing unprovable claims. Re-measure and update all test counts and stale rule facts, then run `node scripts/sync-agent-config.mjs` and `node scripts/validate-agent-config.mjs`. | Verified file-by-file and command-by-command audit; `node scripts/sync-agent-config.mjs --check` and `node scripts/validate-agent-config.mjs --check` exit 0; `markdownlint` and `cspell` 0 errors. |
| `P5` | Run all quality gates with raw output: `./mvnw clean test spotless:check spotbugs:check` (Eclipse Temurin JDK 25, state exact JDK used), frontend lint/typecheck/test/build, `node mock/test-runner.js`, fresh-stack `node e2e/run-all.mjs`, sync/validate/gate-sync/version-drift/contrast scripts, markdownlint, `cspell` (0 issues), secret scan, `./check.sh` and `.\check.ps1` (26/26 each). Investigate the Surefire 30-second fork-kill warning after Security Hardening and Environment Isolation Integration Tests via read-only code/report inspection: fix if caused by DN-01/DN-01-cloud code or tests, else document with raw evidence. End cleanly with `docker compose down -v` (0 `rikkei` resources), OS temp files deleted, empty `git diff --cached --name-only`, 0 conflict markers, and updated ordered `T0231B5:` commit proposals on top of `fb4e771` (with shared `Select` and design-system docs as their own commit). | Verbatim raw outputs (exit 0) for all gates, raw Surefire investigation evidence, empty `docker ps -a` / `docker volume ls` / `docker network ls` for `rikkei`, empty `git diff --cached --name-only`, and clean `git status --short`. |

---

## Round DN-01-polish2

- Document Path: `docs/dn01/PHASE0_ACK.md`
- Task Identifier: DN-01-polish2 (Task Code: `T0231B5`) — Shared Enum Labels (`HR`/`Mentor`/Vietnamese Localization) and Custom Accessible `Select` Component (`R0`–`R3`, `V1`–`V5`)
- Branch: `feature/T0231B5-ho-so-cong-ty` (`HEAD = fb4e771`, uncommitted working tree)
- Working Directory: `D:\GitHub\Rikkei\rikkei-jobs`
- Timestamp (UTC): `2026-11-18T14:46:30Z`
- Integrity Mode: `development`
- Status: Completed Prior to Any Code, CSS, Test, Agent-Config, or Other Documentation Modification in Round DN-01-polish2
- Zero Emoji & Zero Inline CSpell Directive Compliance: Verified (0 emoji characters, 0 inline cspell directives)

### 1. Inventory of Authoritative Files Read in Full

1. **Authoritative Prompt & Scope Files**:
   - `<teamwork-state>/ORIGINAL_REQUEST.md` (lines 1-57)
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (lines 1-45)
   - `D:\GitHub\Rikkei\.agents\PROMPT_DN01_POLISH2_EN.txt` (lines 1-19)
   - Prior round context: `PROMPT_DN01_EN.txt`, `PROMPT_DN01_FIX_EN.txt`, `PROMPT_DN01_CLOUD_EN.txt`, `PROMPT_DN01_POLISH_EN.txt`
2. **Root Agent Entrypoints**:
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
4. **Applicable Skills Read in Full and Why Each Applies**:
   - `.claude/skills/using-rikkei-skills/SKILL.md` (lines 1-86): Enforces strict authority precedence, progressive skill loading, and Rule-over-Skill governance across `R0`–`R3`.
   - `.claude/skills/test-driven-development/SKILL.md` (lines 1-89): Governs Red-Green-Refactor TDD for `enumLabels.ts`, `RoleHomeLayout`, `CompanyStatusBadge`, `SsoCallbackPage`, and the custom WAI-ARIA `Select` combobox/listbox (`Select.test.tsx`).
   - `.claude/skills/frontend-feature-slice/SKILL.md` (lines 1-152): Governs shared vs feature-slice boundaries (`shared/i18n/`, `shared/components/Select.tsx`, `features/identity/`, `features/company/`, `features/candidate/`), barrel exports, and strict TypeScript (zero `any` or `@ts-ignore`).
   - `.claude/skills/frontend-visual-design/SKILL.md` (lines 1-145) + `references/token-tables.md` (lines 1-113), `references/anti-ai-rubric.md` (lines 1-66): Governs token-only styling (`design-tokens.css`, Check 9 green), Light/Dark parity, `375`/`768`/`1024`/`1440` responsive checks, and evidence-only C1–C6 rubric re-scoring.
   - `.claude/skills/frontend-motion-design/SKILL.md` (lines 1-234): Governs compositor-only `opacity`/`transform` open/close motion (`<= 150–200ms`) on the `Select` listbox and `@media (prefers-reduced-motion: reduce)` (`0.001ms` / `100ms` cross-fade).
   - `.claude/skills/frontend-iconography/SKILL.md` (lines 1-156) + `references/icon-checklist.md` (lines 1-54): Governs rendering `Select` chevron and selected option `"check"` via `<Icon />` (`24x24` grid, `2px` stroke, `currentColor`, `aria-hidden="true"`).
   - `.claude/skills/frontend-accessibility-audit/SKILL.md` (lines 1-134) + `references/a11y-checklist.md` (lines 1-54): Governs WAI-ARIA APG select-only combobox/listbox semantics (`role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, `role="listbox"`, `role="option"`, `aria-selected`, `aria-activedescendant`), full keyboard navigation, `>= 44px` option targets, `:focus-visible`, and `>= 4.5:1` WCAG 2.2 AA contrast.
   - `.claude/skills/docs-bilingual-update/SKILL.md` (lines 1-137): Governs bilingual (EN + VI with full diacritics) updates to `docs/design/DESIGN_SYSTEM.md` (`Select` + role-label decision), `docs/dn01/README.md`, `docs/dn01/PR_DESCRIPTION.md`, `docs/dn01/BROWSER_OBSERVATIONS.md`, `docs/dn01/pr-screenshots/ORDER.txt`, `markdownlint-cli2`, and `cspell`.
   - `.claude/skills/verification-before-completion/SKILL.md` (lines 1-125): Governs empirical raw-output verification across all `V1`–`V5` gates (`check.sh`, `check.ps1`, JDK 25 Maven, Vitest, Mock, E2E, contrast, linters) and honest reporting.
   - *Other repository skills*: Backend-only/Flyway/skill-authoring skills (`backend-module-*`, `flyway-migration-authoring`, `spring-security-rbac-endpoint`, `api-contract-and-errors`, `external-system-integration-and-mock`, `security-review-checklist`, `writing-skills`) do not trigger because Round DN-01-polish2 modifies zero backend Java or SQL files.
5. **Existing Phase 0 & Linters Configuration Inspected**:
   - `docs/dn01/PHASE0_ACK.md` (lines 1-561, preserving `## Round DN-01`, `## Round DN-01-fix`, `## Round DN-01-cloud`, and `## Round DN-01-polish` intact)
   - `.markdownlint-cli2.jsonc` (lines 1-11)
   - `cspell.json` (lines 1-261)
   - `scripts/validate-agent-config.mjs` (lines 1-1576; Checks 3, 4.2, and 9)

### 2. Mandatory Working Method, Hard Rules, and User Override Decisions

Mandatory working method (kept verbatim from `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` line 30):

> "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

Binding operational hard rules and explicit decisions for Round DN-01-polish2:

- **Explicit User Override on Role Labels (`R1` / `V1`)**: Per direct user decision overriding earlier wording in `D:\GitHub\Rikkei\.agents\PROMPT_DN01_POLISH2_EN.txt` line 9, keep `HR` -> `"HR"` and `MENTOR` -> `"Mentor"` untranslated, while translating `CANDIDATE` -> `"Ứng viên"`, `STAFF` -> `"Nhân viên"`, and `ADMIN` -> `"Quản trị viên"`. Account statuses use full Vietnamese diacritics (`ACTIVE` -> `"Đang hoạt động"`, `LOCKED` -> `"Đã khóa"`, `MUST_CHANGE_PASSWORD` -> `"Yêu cầu đổi mật khẩu"`), and any unknown/empty value falls back to `"Không xác định"` (never raw enum strings and never English `"N/A"`). Document this decision both at the module definition site and in `docs/design/DESIGN_SYSTEM.md`.
- **Git Read-Only Without Exception**: Never execute mutating git commands (`commit`, `push`, `add`, `stage`, `checkout`, `restore`, `reset`, `stash`, `switch`, `branch`). Stay on `feature/T0231B5-ho-so-cong-ty` (`HEAD = fb4e771`), leave all modifications uncommitted with `git diff --cached --name-only` empty, and produce ordered `T0231B5:` English commit proposals.
- **Secrets, Scope & Zero New Dependencies**: Never open, read, or print `.env`, `*.pem`, or `first-key.pem`. Add zero new dependencies (`backend/pom.xml`, `frontend/package.json`, `mock/package.json`).
- **Plain Text, Token-Only Colors & Formatting Discipline**: Zero emoji anywhere; 100% design-token CSS colors (`Check 9` green); zero inline `cspell:` ignore/disable directives; zero undefined `[text]` reference links outside code blocks/inline code (`Check 4.2` green); zero machine-specific host paths; Vietnamese UI text and documentation with full diacritics; code, comments, and `T0231B5:` commit proposals in English.
- **Frontend `/browser` Mandate**: Verify every UI change, open custom `Select` listbox (`1440` and `375`, Light and Dark), state screenshots, account card localized role/status, and section 7 measurements exclusively via Antigravity's built-in `/browser` (localhost only; via Parent session relay if subagents lack `/browser` permission).

### 3. Concrete Constraints and Proof Plans (`R0` and `V1`–`V5`)

| Item | Concrete Actionable Constraint | How Each Item Will Be Proved |
|---|---|---|
| `R0` | Read `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `.claude/rules/01`–`16`, and all applicable skills in full, then append `## Round DN-01-polish2` to `docs/dn01/PHASE0_ACK.md` prior to any code, CSS, test, or other documentation edit. | `docs/dn01/PHASE0_ACK.md` contains `## Round DN-01-polish2` with verbatim line 30 quote, user `HR`/`Mentor` override decision, and `R0`/`V1`–`V5` proof plan; `npx markdownlint-cli2`, `npx cspell`, and `node scripts/validate-agent-config.mjs --check` exit 0 before M1 code edits. |
| `V1` | Create one shared typed module (`frontend/src/shared/i18n/enumLabels.ts`) mapping `HR` -> `"HR"`, `MENTOR` -> `"Mentor"`, `CANDIDATE` -> `"Ứng viên"`, `STAFF` -> `"Nhân viên"`, `ADMIN` -> `"Quản trị viên"`, `ACTIVE` -> `"Đang hoạt động"`, `LOCKED` -> `"Đã khóa"`, password-change states, and unknown -> `"Không xác định"` (never raw enum or `"N/A"`); replace every raw UI display across `RoleHomeLayout`, `CompanyStatusBadge`, `SsoCallbackPage`, `ModuleCard`/`features/*/index.ts`, and any other frontend occurrences while keeping internal enum logic, test IDs, and API payloads unchanged; document decision in module and `docs/design/DESIGN_SYSTEM.md`. | Vitest unit tests (`enumLabels.test.ts` + `RoleHomes.test.tsx` covering every role x every status + `CompanyStatusBadge`/`SsoCallbackPage` tests) exit 0; frontend-wide `grep` proves zero raw enum strings or `"N/A"` rendered in UI surfaces. |
| `V2` | Replace native `<select>` popup in `frontend/src/shared/components/Select.tsx` with a custom WAI-ARIA APG select-only combobox/listbox (`role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, `role="listbox"`, `role="option"`, `aria-selected`, `aria-activedescendant`), hidden native `<select>` sync (`value`, `name`, `onChange`, `ref`, `FormData`, test IDs), full keyboard + mobile `375px` flip/scroll + `>= 44px` option targets, portal/overflow safety with `--rj-primitive-z-dropdown`, token-only CSS matching `.rj-input`, `<Icon name="check" />`, `<= 150–200ms` `opacity`/`transform` motion + `prefers-reduced-motion`, Light/Dark contrast `>= 4.5:1`, and removal of dead native `option`/`optgroup`/`::picker-icon` CSS while preserving `color-scheme`. | `Select.test.tsx` + `CompanyProfilePage.test.tsx` + `GapAnalysisSection.test.tsx` pass in Vitest; `node scripts/validate-agent-config.mjs` Check 9 passes; `node scripts/compute-contrast.mjs` passes `>= 4.5:1` for all new Select Light/Dark pairs. |
| `V3` | Capture `/browser` DOM open-list screenshots in Light and Dark at `1440` and `375` on `/hr/company` and `/candidate/gap-analysis`, state screenshots (closed, hover, focus-visible, invalid, disabled, keyboard-selected), and account card localized role/status screenshots in Light and Dark; re-run section 7 measurement script confirming trigger matches `.rj-input` metrics and `scrollWidth <= innerWidth` at `375px`. | Raw `/browser` measurement logs and PNG artifacts recorded in git-ignored `docs/dn01/pr-screenshots/`, `docs/dn01/pr-screenshots/ORDER.txt`, and `docs/dn01/BROWSER_OBSERVATIONS.md`; `docs/design/DESIGN_SYSTEM.md` ("Select" EN + VI + role-label decision), `docs/dn01/README.md`, and `docs/dn01/PR_DESCRIPTION.md` (EN + VI) updated. |
| `V4` | Re-score Anti-AI rubric `C1`–`C6` strictly from observed `/browser` and `compute-contrast.mjs` evidence, stating honestly what changed since Round DN-01-polish and correcting any prior unprovable claims (e.g., clarifying earlier OS-list popup descriptions). | Line-by-line audit of `BROWSER_OBSERVATIONS.md`, `README.md`, `PR_DESCRIPTION.md`, and `ORDER.txt` against actual repository files and raw command outputs. |
| `V5` | Execute all final gates with raw output: JDK 25 Maven (`./mvnw clean test spotless:check spotbugs:check`), frontend lint/typecheck/test/build, `node mock/test-runner.js`, fresh-stack `node e2e/run-all.mjs`, `sync-agent-config --check`, `validate-agent-config --check`, `check-gate-sync`, `check-version-drift`, `compute-contrast`, `markdownlint-cli2`, `cspell` (0 issues, 0 inline directives), secret scan, `./check.sh` and `.\check.ps1` (26/26 each); clean teardown via `docker compose down -v`. | Exit code 0 raw terminal outputs for every gate; `docker ps -a`, `docker volume ls`, `docker network ls` showing zero `rikkei` resources; `git diff --cached --name-only` empty; ordered `T0231B5:` commit proposals delivered in Vietnamese report. |
