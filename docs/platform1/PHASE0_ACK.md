# Phase 0 Acknowledgement — Round PLATFORM-1 (`T022DB0`)

- Document Path: `docs/platform1/PHASE0_ACK.md`
- Task Code: `T022DB0` (commit proposal prefix: `T022DB0: <type>(<scope>): <summary>`)
- Round: `ROUND PLATFORM-1` (Part A: Vendor, adapt, and register `frontend-taste-anti-slop`; Part B: Re-read all rules/skills and audit/fix UI/UX; Part C: Whole-system measured optimization, load capacity, and security hardening)
- Branch: `chore/T022DB0-taste-skill-and-optimization` (`HEAD = eb75201`, matching `origin/develop`)
- Working Directory: `<repo-root>` (`rikkei-jobs`)
- Timestamp: `2026-11-22T12:25:00Z`
- Status: Completed prior to ANY code, `.gitignore`, skill, rule, config, or documentation edit in `rikkei-jobs`
- Zero Emoji Compliance: Verified (0 emoji characters)

---

## 1. Mandatory Working Method (Verbatim from R1)

Mandatory working method recorded verbatim from `PROMPT_BASE_RULES_EN.txt` section R1:

> "Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi."

---

## 2. Authoritative Files Read Before Any Repository Edit

### 2.1 Prompts, Orchestrator Plan, Surveys, and Root Configurations

1. `PROMPT_BASE_RULES_EN.txt` (lines 1–54) and `PROMPT_PLATFORM_EN.txt` (lines 1–75)
2. Orchestrator `PROJECT.md`, `ORIGINAL_REQUEST.md`, Survey 1 `handoff.md`, Survey 2 `handoff.md`, and `upstream_taste_skill_notes.md`
3. `CLAUDE.md` (lines 1–47)
4. `GEMINI.md` (lines 1–61)
5. `AGENTS.md` (lines 1–44)

### 2.2 Canonical Enterprise Rules (`agent-config/rules/` and `.claude/rules/`, 01–16)

- Rules `01-project-context.md` through `16-backend-integrations.md` read in full and verified synchronized between `agent-config/rules/`, `.claude/rules/`, and `.gemini/rules/`.

### 2.3 Canonical Skills (`agent-config/skills/`, 28 Existing + 1 Vendored = 29 Skills)

- All 28 existing skills read and evaluated alongside `frontend-taste-anti-slop` (vendored from `Leonxlnx/taste-skill` `v2.5.1`, commit `f6b76575f949707b4e3c37cd86cb44b0b98643e8`, MIT license) with conflict table and provenance/license documentation.

---

## 3. Concrete Constraints and Proof Methods (Rules 01–16)

| Rule | File | Concrete Actionable Constraint | Proof Method |
|---|---|---|---|
| Rule 01 | `.claude/rules/01-project-context.md` | Preserve 9 modules, 5 roles, 20 standardized skills, pinned versions in `docs/03-version-table.md`, and `T022DB0` task prefix. | `node scripts/check-version-drift.mjs` exits `0`. |
| Rule 02 | `.claude/rules/02-git-and-delivery.md` | Keep Git strictly read-only on `chore/T022DB0-taste-skill-and-optimization`; never commit/stage/push/switch/restore; propose `T022DB0:` commits. | `git branch --show-current` and empty `git diff --cached --name-only`. |
| Rule 03 | `.claude/rules/03-safety-and-secrets.md` | Never open `.env` or `*.pem`; write only inside `<repo-root>` (plus external Teamwork scratch); keep `.env.example` secret-free; clean up Docker. | Secret scan exits `0`; `docker compose down -v` leaves `0` leftover containers. |
| Rule 04 | `.claude/rules/04-honest-verification.md` | Claim PASS only from executed commands with exit code `0` and raw output; zero `TODO`/`FIXME`/`console.log`/`System.out.println`. | Raw command transcripts and `.\check.ps1` / `./check.sh` (`26/26` PASS). |
| Rule 05 | `.claude/rules/05-backend-java.md` | Enforce Java 25 records, `ErrorResponse`, `-Xlint:all -Werror`, Spotless AOSP, SpotBugs, `open-in-view: false`, and Testcontainers PostgreSQL 18.6. | `./mvnw spotless:check spotbugs:check clean test-compile test` exits `0`. |
| Rule 06 | `.claude/rules/06-database-flyway.md` | Never edit or rename merged Flyway migrations under `db/migration/` or `db/migration-dev/`; keep `ddl-auto: none`. | `git diff origin/develop -- backend/src/main/resources/db/` is empty. |
| Rule 07 | `.claude/rules/07-security-rbac.md` | Maintain deny-by-default `RoutePolicyRegistry`, `OwnershipGuard` `404` IDOR protection, single-use 60s SSO tickets, and fail-fast `prod` validation. | `SecurityHardeningIntegrationTest` and `ProdEnvironmentValidator*` pass. |
| Rule 08 | `.claude/rules/08-frontend-engineering.md` | Preserve React 19/TypeScript 6 strict mode, single `httpClient.ts`, memory-only JWT storage, and WCAG 2.2 AA compliance. | `npm --prefix frontend run lint`, `typecheck`, `test`, and `build` exit `0`. |
| Rule 09 | `.claude/rules/09-frontend-design-bar.md` | Enforce `--rj-*` design tokens, self-hosted WOFF2 fonts, `<Icon />` + `<BrandMark />`, zero emoji, and `120/120` contrast pairs. | `node scripts/compute-contrast.mjs` (`120/120`) and `/browser` verification. |
| Rule 10 | `.claude/rules/10-testing-strategy.md` | Follow TDD Red-Green-Refactor, hermetic random-port Testcontainers, zero `Thread.sleep()`, and complete E2E coverage. | Backend, frontend, mock, and `node e2e/run-all.mjs` suites exit `0`. |
| Rule 11 | `.claude/rules/11-docs-and-bilingual.md` | Author canonical rules/skills in English; update bilingual EN+VI docs cleanly; pass `markdownlint-cli2` and `cspell` with zero inline ignores. | `markdownlint-cli2` and `cspell` exit `0` across all docs. |
| Rule 12 | `.claude/rules/12-ci-and-quality-gates.md` | Keep exact quality gate parity (`29` definitions, `26` active runtime gates, `23` CI checks) without adding new gates; never run `run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs` exits `0`. |
| Rule 13 | `.claude/rules/13-backend-data-access-performance.md` | Maintain `open-in-view: false`, Hikari bounds, `@Transactional(readOnly = true)`, N+1 avoidance, and `@Version` optimistic locking. | SQL query count measurements and backend integration tests pass. |
| Rule 14 | `.claude/rules/14-backend-module-boundaries.md` | Respect 9-module ownership and DAG isolation with zero cross-module entity/repository leakage or cross-module SQL joins. | Clean compilation and module boundary checks pass. |
| Rule 15 | `.claude/rules/15-backend-observability-ops.md` | Preserve `prod` ECS JSON logging, minimal Actuator (`health,info`, `show-details: never`), and PII/secret non-logging. | `ActuatorHealthTest` and log sanitization tests pass. |
| Rule 16 | `.claude/rules/16-backend-integrations.md` | Route external calls via `ExternalApiClient`; keep OpenAPI dev-only; add no unapproved dependencies to `pom.xml` or `package*.json`. | `git diff origin/develop -- backend/pom.xml frontend/package*.json` is empty. |

---

## 4. Concrete Constraints and Proof Methods (All 29 Skills — Why Each Applies and How Proved)

| # | Skill | Applicability & Why (`Part A` / `Part B` / `Part C`) | Concrete Actionable Constraint | Proof Method |
|---|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory always (`Part A`, `Part B`, `Part C`): establishes progressive skill discovery, strict precedence (`PROMPT_PLATFORM_EN.txt` > `PROMPT_BASE_RULES_EN.txt` > Rules `01`–`16` > `DESIGN_SYSTEM.md` > Skills), and the `29`-skill routing index. | Register `frontend-taste-anti-slop` in the canonical index and enforce Rules-over-Skills precedence across all three parts. | `agent-config/skills/using-rikkei-skills/SKILL.md` updated to `29` skills and synced to `.claude/` and `.gemini/`. |
| 2 | `writing-skills` | Applies to `Part A` (primary) and `Part B` (full re-read): governs authoring and validation of `frontend-taste-anti-slop`. | Format `frontend-taste-anti-slop/SKILL.md` with kebab-case `name`, `"Use when ..."` trigger-only `description` (no workflow summary), exact 8 sections, body `<= 500` lines, 0 emoji, LF, no BOM, and verified real repo paths. | `node scripts/validate-agent-config.mjs` Checks 1, 2, 3, 4, 5, 6, 7 exit `0`. |
| 3 | `brainstorming-before-building` | Applies to `Part A`, `Part B`, and `Part C`: evaluates trade-offs before vendoring `taste-skill`, before UI/UX edits, and before system optimization/security changes. | Document adaptation precedence, PR #13/#21/#26 collision avoidance, and optimization/security design choices before implementing changes. | Precedence/conflict table in `frontend-taste-anti-slop`, `"Proposed, not applied"` in `PR_DESCRIPTION.md`, and `BASELINE.md` before Part C edits. |
| 4 | `writing-implementation-plans` | Applies to `Part A`, `Part B`, and `Part C`: structures the single round into ordered, verifiable checkpoints without mutating git history. | Execute strictly in order (`Part A` -> `Part B` -> `Part C`) with explicit verification commands per group. | Ordered checkpoint logs in `PHASE0_ACK.md` and `PR_DESCRIPTION.md`. |
| 5 | `executing-plans` | Applies to `Part A`, `Part B`, and `Part C`: enforces step-by-step execution and verification after each checkpoint. | Verify each checkpoint command cleanly before proceeding to the next part. | Raw verification outputs per milestone. |
| 6 | `dispatching-parallel-agents` | Applies to `Part A`, `Part B`, and `Part C`: governs clean non-overlapping work streams and external scratch isolation. | Keep Teamwork state strictly outside `<repo-root>` and verify all outputs independently. | `git status --porcelain -uall` shows zero `.agents/teamwork/` paths inside `rikkei-jobs`. |
| 7 | `frontend-feature-slice` | Applies to `Part B` and `Part C`: preserves feature-slice isolation and React Query/API boundaries in `frontend/src/features/`. | Keep feature slice boundaries, single `httpClient.ts`, and TypeScript strict types intact. | `npm --prefix frontend run typecheck`, `lint`, and `test` exit `0`. |
| 8 | `frontend-visual-design` | Applies to `Part A` (precedence boundary; file untouched due to PR #13), `Part B` (UI/UX audit & fixes), and `Part C` (preserving visual fidelity during CSS/bundle optimization). | Do NOT modify `frontend-visual-design/SKILL.md`; enforce `--rj-*` tokens, `375/768/1024/1440` breakpoints, Light/Dark modes, Airy/Dense density, and self-hosted fonts. | `git diff --name-only origin/develop -- agent-config/skills/frontend-visual-design/` is empty; `compute-contrast.mjs` exits `0`. |
| 9 | `frontend-motion-design` | Applies to `Part A` (precedence boundary; file untouched due to PR #13), `Part B` (motion budgets), and `Part C` (compositor-only optimization & frame-time measurement). | Do NOT modify `frontend-motion-design/SKILL.md`; keep `<= 150ms` micro budget, Showcase Motion Tier, `/login` radar exception, and `0.001ms` reduced-motion cross-fade. | `git diff --name-only origin/develop -- agent-config/skills/frontend-motion-design/` is empty; `/browser` frame-time and `CLS = 0` evidence. |
| 10 | `frontend-iconography` | Applies to `Part A` (conflict item 13) and `Part B` (UI/UX icon audit): preserves the curated 24px monoline `<Icon />` system over external brand SVG packs. | Use `<Icon name=... />` (`stroke="currentColor"`, `stroke-width="2"`) and `<BrandMark />` only; zero emojis or external icon packs. | Conflict table item 13 documented; validator Check 3 (0 emoji) and Check 9 (`BrandMark`) exit `0`. |
| 11 | `frontend-accessibility-audit` | Applies to `Part A` (conflict items 8–9, 16) and `Part B` (live WCAG 2.2 AA audit & fixes, e.g., missing `<h1>` on `/candidate/skills` and `/candidate/gap-analysis`). | Enforce single visible `<h1>` per page, `>= 4.5:1` / `>= 3.0:1` contrast, `>= 44x44px` touch targets, `:focus-visible`, and keyboard `Tab`/`Enter`/`Space`/`Escape` support. | Live `/browser` audit and `compute-contrast.mjs` (`120/120`). |
| 12 | `frontend-taste-anti-slop` | Primary output of `Part A` and applied throughout `Part B`: adapts `taste-skill` (`v2.5.1`) under Enterprise Rules 08/09 and `DESIGN_SYSTEM.md`. | Eliminate visual slop, generic cards, and hardcoded colors while strictly honoring `--rj-*` tokens and `DESIGN_SYSTEM.md`. | `validate-agent-config.mjs` exits `0`; `/browser` observations recorded. |
| 13 | `test-driven-development` | Applies to `Part B` and `Part C`: mandates Red-Green-Refactor with deterministic `java.time.Clock` and hermetic tests. | Reproduce missing behavior with failing tests first before modifying production code. | New unit and Testcontainers integration tests pass. |
| 14 | `systematic-debugging` | Applies to `Part B` and `Part C`: isolates root causes from logs, SQL queries, and browser measurements before changing code. | Capture before/after measurements and stack traces rather than applying blind patches. | Before/after baselines in `docs/platform1/BASELINE.md`. |
| 15 | `backend-module-feature` | Applies to `Part C`: governs Java 25 records, `@Transactional` annotations, Spotless, and SpotBugs compliance. | Maintain Java 25 conventions, `-Xlint:all -Werror`, Spotless AOSP, and SpotBugs clean. | `./mvnw spotless:check spotbugs:check clean test-compile` exits `0`. |
| 16 | `backend-module-boundaries` | Applies to `Part C`: enforces 9-module ownership and zero cross-module repository/entity leakage. | Keep changes inside owning modules (`candidate`, `internship`, `identity`, `common`). | Compilation and module boundary verification pass. |
| 17 | `backend-persistence-performance` | Applies to `Part C`: drives SQL count reduction, batching, N+1 elimination, and load capacity tuning. | Measure query counts, cold start, and 1..200 VU ramp performance before and after changes. | `BASELINE.md` SQL counts, EXPLAIN plans, and load ramp outputs. |
| 18 | `flyway-migration-authoring` | Applies as an immutability boundary across `Part A`, `Part B`, and `Part C`. | Never edit or rename merged Flyway migrations in `db/migration/` or `db/migration-dev/`. | Migration SHA-256 hashes match `origin/develop`. |
| 19 | `spring-security-rbac-endpoint` | Applies to `Part C` (security hardening): protects deny-by-default routes, JWT verification, and auth rate limiting. | Preserve `RoutePolicyRegistry`, `OwnershipGuard`, and stateless JWT enforcement without loosening controls. | `SecurityHardeningIntegrationTest`, `JwtServiceTest`, and `AuthRateLimitIntegrationTest` pass. |
| 20 | `api-contract-and-errors` | Applies to `Part B` and `Part C`: maintains `ErrorResponse` and `PageResponse` contracts. | Return standardized `ErrorResponse` (`429 RATE_LIMITED` + `Retry-After`, etc.) without breaking API contracts. | Full E2E suite (`27/329/2020`) passes. |
| 21 | `external-system-integration-and-mock` | Applies to `Part C`: preserves `ExternalApiClient` timeouts, retry resilience, and log sanitization. | Never attach `X-Service-Key` to third-party URLs or log secrets/bodies/query params. | `ExternalApiClientRobustnessTest` and `MailServiceTest` pass. |
| 22 | `security-review-checklist` | Applies to `Part A`, `Part B`, and `Part C`: enforces Zero Real Secrets, supply-chain safety, and OWASP checks. | Scan for leaked secrets, audit Dockerfiles/nginx/headers, and document `"Proposed, not applied"` security items. | Secret scan exits `0`; security integration tests pass. |
| 23 | `ci-local-and-debug` | Applies to `Part A`, `Part B`, and `Part C`: governs `./check.sh`, `.\check.ps1`, and Docker Compose E2E verification. | Keep `26/26` gate parity, never run `scripts/run-ci-in-docker.*`, and tear down with `docker compose down -v`. | `./check.sh`, `.\check.ps1`, and `node e2e/run-all.mjs` exit `0`. |
| 24 | `docs-bilingual-update` | Applies to `Part A`, `Part B`, and `Part C`: keeps English and Vietnamese documentation synchronized and lint-clean. | Keep Vietnamese diacritics complete, avoid inline `cspell:ignore`, and pass `markdownlint-cli2` + `cspell`. | `markdownlint-cli2` and `cspell` exit `0`. |
| 25 | `module-domain-knowledge` | Applies to `Part B` and `Part C`: ensures changes align with domain rules across all 7 modules and 5 roles. | Respect domain semantics in skill recomputation, gap analysis, internship sync, and auth flows. | Domain unit/integration and E2E tests pass. |
| 26 | `requesting-code-review` | Applies to `Part C` / `M7`: prepares structured `PR_DESCRIPTION.md` and `T022DB0:` commit proposals verified against `git status`. | Map every modified/untracked file 1:1 to a `T022DB0:` commit proposal and document open PR collisions. | `PR_DESCRIPTION.md` verified against `git status --porcelain -uall`. |
| 27 | `receiving-code-review` | Applies to `M4`, `M5`, and review iterations: resolves challenger/reviewer findings at root cause. | Address every finding with empirical verification rather than suppressing checks. | Re-verification logs in `PHASE0_ACK.md` and reports. |
| 28 | `verification-before-completion` | Applies to `Part A`, `Part B`, and `Part C` (mandatory before every handoff): forbids unverified PASS claims. | Run every required validation, build, test, and `/browser` check on the final workspace state and record verbatim stdout/stderr + exit code `0`. | Raw terminal transcripts and live `/browser` metrics in `handoff.md` and `docs/platform1/*`. |
| 29 | `handoff-to-team-lead` | Applies to `Part A`, `Part B`, and `Part C` (round completion): enforces read-only git state, clean workspace, Vietnamese team reporting, and structured handoffs. | Keep `git diff --cached --name-only` empty, leave all changes uncommitted/unstaged on `chore/T022DB0-taste-skill-and-optimization`, and deliver 5-part `handoff.md`. | `git branch --show-current`, `git diff --cached --name-only` (empty), and complete `handoff.md`. |

---

## 5. Why Upstream Installers, Plugin Manifests, Hooks, and Gate Scripts Are Forbidden

1. **`npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`**: Executes unaudited remote code over the network and bypasses the repository's canonical `agent-config/` source-of-truth and `scripts/sync-agent-config.mjs` cryptographic mirror model.
2. **`install.sh` and `.claude-plugin/` / `.codex-plugin/` / `.agents/plugins/` manifests**: Create symlinks/junctions into global `~/.claude/skills` and `~/.codex/skills` outside `<repo-root>`, violating Rule 03 host boundary isolation and repository mirror parity (`validate-agent-config.mjs` Check 5).
3. **Upstream `hooks: Stop:` frontmatter**: Executes a shell loop on every Claude Code session end invoking `scripts/gate.mjs --hook claude` and writing `.taste-skill/gate-hook-missing.txt`, creating a supply-chain and surprise-execution risk that violates project policy against silent new tooling.
4. **Upstream `scripts/gate.mjs` and `scripts/*.mjs` (`consistency.mjs`, `copy-lint.mjs`, `start.mjs`, `perf.mjs`, `shoot.mjs`, `icons.mjs`, `photos.mjs`, `fx-map/bake.mjs`)**: Introduce unapproved Node dependencies/tooling outside `agent-config/` and conflict with synchronized repository quality gates (`check.sh`, `check.ps1`, `.github/workflows/ci.yml`).

---

## 6. Re-read Log

Re-read: 01, 02, 03, 04, 08, 09, 11, 12; using-rikkei-skills, writing-skills, docs-bilingual-update, verification-before-completion, before Part A (vendor, adapt, and register frontend-taste-anti-slop)

Re-read: 04, 11, 12; using-rikkei-skills, writing-skills, docs-bilingual-update, verification-before-completion, before M1 Iteration 2 (fix stale counts and expand PHASE0_ACK 29-skill rationale)

Re-read: 01..16 (all 16 rules); all 29 skills (including frontend-taste-anti-slop); CLAUDE.md, GEMINI.md, AGENTS.md, docs/design/DESIGN_SYSTEM.md, docs/uiux/*, before Part B (UI/UX audit and safe fixes)

Re-read: 01, 02, 03, 04, 05, 06, 07, 08, 10, 11, 12, 13, 14, 15, 16; backend-persistence-performance, ci-local-and-debug, verification-before-completion, systematic-debugging, security-review-checklist, docs-bilingual-update, test-driven-development, handoff-to-team-lead, before Part C0 (whole-system baseline and load ramp script)

Re-read: 01, 02, 03, 04, 05, 06, 07, 08, 10, 11, 12, 13, 14, 15, 16; backend-persistence-performance, backend-module-feature, backend-module-boundaries, api-contract-and-errors, frontend-feature-slice, ci-local-and-debug, test-driven-development, verification-before-completion, systematic-debugging, external-system-integration-and-mock, before Part C1/C1b performance optimization and load capacity hardening

Re-read: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16; backend-persistence-performance, backend-module-feature, backend-module-boundaries, frontend-feature-slice, ci-local-and-debug, test-driven-development, verification-before-completion, receiving-code-review, systematic-debugging, before M4 Iteration 2 (remediate challenger findings and re-verify)

Re-read: 01, 03, 04, 08, 12; frontend-feature-slice, ci-local-and-debug, test-driven-development, verification-before-completion, receiving-code-review, before M4 Iteration 3 (resolve P6 frontend/vitest.config.ts under C3/C3b)

Re-read: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16; spring-security-rbac-endpoint, security-review-checklist, api-contract-and-errors, external-system-integration-and-mock, backend-module-feature, backend-module-boundaries, frontend-feature-slice, test-driven-development, verification-before-completion, ci-local-and-debug, systematic-debugging, before Part C2 (security audit and behavior-preserving hardening)

Re-read: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16; using-rikkei-skills, spring-security-rbac-endpoint, security-review-checklist, api-contract-and-errors, external-system-integration-and-mock, test-driven-development, verification-before-completion, ci-local-and-debug, receiving-code-review, before Part C2 Iter 2 (security remediation of challenger_m5_1 findings)

Re-read: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16; using-rikkei-skills, docs-bilingual-update, requesting-code-review, verification-before-completion, handoff-to-team-lead, security-review-checklist, backend-persistence-performance, before M7 (final documentation, bilingual factual updates, and ordered commit proposals)

---

## PLATFORM-1-fix (T022DB0) — Phase 0 Acknowledgement

- **Round**: `PLATFORM-1-fix` (task code `T022DB0`, targeted fix round on top of existing uncommitted `PLATFORM-1` changes)
- **Timestamp**: `2026-11-23T08:08:00Z`
- **Status**: Completed prior to any code, configuration, Dockerfile, or other doc edit in `PLATFORM-1-fix`
- **Zero Emoji Compliance**: Verified (0 emoji characters)

### 1. Starting Git Baseline (Read-Only Snapshot)

- **`git branch --show-current`**: `chore/T022DB0-taste-skill-and-optimization`
- **`git diff --cached --name-only`**: *(empty — 0 staged files)*
- **`git status --porcelain -uall`** (91 uncommitted `PLATFORM-1` paths preserved untouched as starting baseline):

```text
 M .claude/skills/using-rikkei-skills/SKILL.md
 M .gemini/skills/using-rikkei-skills/SKILL.md
 M .gitignore
 M AGENTS.md
 M CLAUDE.md
 M CONTRIBUTING.md
 M GEMINI.md
 M README.md
 M agent-config/skills/using-rikkei-skills/SKILL.md
 M agent-config/templates/AGENTS.md
 M agent-config/templates/CLAUDE.md
 M agent-config/templates/GEMINI.md
 M backend/Dockerfile
 M backend/src/main/java/com/rikkei/jobs/candidate/repository/GapResultRepository.java
 M backend/src/main/java/com/rikkei/jobs/candidate/service/GapAnalysisService.java
 M backend/src/main/java/com/rikkei/jobs/candidate/service/SkillRecomputeService.java
 M backend/src/main/java/com/rikkei/jobs/candidate/service/impl/CandidatePublicServiceImpl.java
 M backend/src/main/java/com/rikkei/jobs/common/client/ExternalApiClient.java
 M backend/src/main/java/com/rikkei/jobs/identity/controller/AuthController.java
 M backend/src/main/java/com/rikkei/jobs/identity/security/JwtService.java
 M backend/src/main/java/com/rikkei/jobs/identity/service/MailService.java
 M backend/src/main/java/com/rikkei/jobs/internship/repository/InternshipTaskRepository.java
 M backend/src/main/java/com/rikkei/jobs/internship/service/impl/InternshipPersistenceServiceImpl.java
 M backend/src/main/resources/application-dev.yml
 M backend/src/test/java/com/rikkei/jobs/candidate/CandidatePublicServiceInternshipTest.java
 M backend/src/test/java/com/rikkei/jobs/candidate/GapAnalysisIntegrationTest.java
 M backend/src/test/java/com/rikkei/jobs/client/ExternalApiClientRobustnessTest.java
 M backend/src/test/java/com/rikkei/jobs/identity/JwtServiceTest.java
 M backend/src/test/java/com/rikkei/jobs/internship/InternshipSyncServiceTest.java
 M cspell.json
 M docs/02-local-development-troubleshooting.md
 M docs/agent-config/README.md
 M docs/agent-config/SOURCES.md
 M docs/agent-config/THIRD_PARTY_NOTICES.md
 M docs/agent-config/TOOL_COMPATIBILITY.md
 M docs/agent-config/UNTRACKED_AUDIT.md
 M docs/conventions.md
 M frontend/nginx.conf
 M frontend/src/App.css
 M frontend/src/App.test.tsx
 M frontend/src/features/candidate/__tests__/CandidateEvaluations.test.tsx
 M frontend/src/features/candidate/api/candidateEvaluations.ts
 M frontend/src/features/candidate/components/CandidateEvaluations.tsx
 M frontend/src/features/candidate/components/EvaluationCard.tsx
 M frontend/src/features/candidate/components/EvaluationScoreItem.tsx
 M frontend/src/features/candidate/components/GapAnalysisSection.test.tsx
 M frontend/src/features/candidate/components/GapAnalysisSection.tsx
 M frontend/src/features/candidate/components/SkillItem.tsx
 M frontend/src/features/candidate/components/SkillProfilePage.test.tsx
 M frontend/src/features/candidate/components/SkillProfilePage.tsx
 M frontend/src/features/candidate/gapAnalysis.css
 M frontend/src/features/candidate/index.ts
 M frontend/src/features/candidate/pages/CandidateEvaluationsPage.tsx
 M frontend/src/features/candidate/skillProfile.css
 M frontend/src/features/candidate/styles/candidateEvaluations.css
 M frontend/src/features/identity/__tests__/ResetPasswordPage.test.tsx
 M frontend/src/features/identity/__tests__/RoleHomes.test.tsx
 M frontend/src/features/identity/__tests__/postLoginRedirect.test.tsx
 M frontend/src/features/identity/pages/ResetPasswordPage.tsx
 M frontend/src/features/identity/pages/SsoCallbackPage.tsx
 M frontend/src/features/identity/pages/role-homes/CandidateGapAnalysisPage.tsx
 M frontend/src/features/identity/pages/role-homes/CandidateSkillsPage.tsx
 M frontend/src/features/identity/pages/role-homes/RoleHomeLayout.tsx
 M frontend/src/shared/components/HealthBadge.tsx
 M scripts/validate-agent-config.mjs
?? .claude/skills/frontend-taste-anti-slop/SKILL.md
?? .claude/skills/frontend-taste-anti-slop/references/conflict-table.md
?? .claude/skills/frontend-taste-anti-slop/references/provenance-and-license.md
?? .gemini/commands/frontend-taste-anti-slop.toml
?? .gemini/skills/frontend-taste-anti-slop/SKILL.md
?? .gemini/skills/frontend-taste-anti-slop/references/conflict-table.md
?? .gemini/skills/frontend-taste-anti-slop/references/provenance-and-license.md
?? agent-config/skills/frontend-taste-anti-slop/SKILL.md
?? agent-config/skills/frontend-taste-anti-slop/references/conflict-table.md
?? agent-config/skills/frontend-taste-anti-slop/references/provenance-and-license.md
?? backend/src/main/java/com/rikkei/jobs/candidate/service/GapResultPersistenceService.java
?? backend/src/main/java/com/rikkei/jobs/common/config/ServerCapacityConfig.java
?? backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimitInterceptor.java
?? backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimitProperties.java
?? backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimitWebConfig.java
?? backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimiter.java
?? backend/src/test/java/com/rikkei/jobs/config/ServerCapacityConfigTest.java
?? backend/src/test/java/com/rikkei/jobs/identity/AuthRateLimitIntegrationTest.java
?? backend/src/test/java/com/rikkei/jobs/identity/security/AuthRateLimiterTest.java
?? backend/src/test/java/com/rikkei/jobs/identity/service/MailServiceTest.java
?? docs/platform1/BASELINE.md
?? docs/platform1/BROWSER_OBSERVATIONS.md
?? docs/platform1/PHASE0_ACK.md
?? docs/platform1/PR_DESCRIPTION.md
?? docs/platform1/README.md
?? scripts/platform1-load-ramp.mjs
```

### 2. Authoritative Files Read & Mandatory Working Method (Verbatim from R1)

- Read in full: `PROMPT_BASE_RULES_EN.txt`, `PROMPT_PLATFORM_FIX_EN.txt`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, all 16 rules in `.claude/rules/01..16`, and applicable skills in `agent-config/skills/`.
- Mandatory working method from R1 remains binding for `PLATFORM-1-fix` (`"Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước..."`).

### 3. Concrete Constraints and Proof Methods (Rules 01–16)

| Rule | File | Concrete Actionable Constraint for `PLATFORM-1-fix` | Proof Method |
|---|---|---|---|
| Rule 01 | `.claude/rules/01-project-context.md` | Keep 9 modules, 5 roles, 20 skills, pinned versions (`docs/03-version-table.md`), and `T022DB0` prefix intact. | `node scripts/check-version-drift.mjs` exits 0; `pom.xml`/`package*.json` unchanged vs `origin/develop`. |
| Rule 02 | `.claude/rules/02-git-and-delivery.md` | Keep Git strictly read-only on `chore/T022DB0-taste-skill-and-optimization`; never commit, stage, push, switch, restore, or stash; leave all changes uncommitted. | `git branch --show-current` == `chore/T022DB0-taste-skill-and-optimization`; `git diff --cached --name-only` is empty. |
| Rule 03 | `.claude/rules/03-safety-and-secrets.md` | Never open/print `.env`, `*.pem`, or `first-key.pem`; write only inside `rikkei-jobs` (scratch in OS temp/agent scratch); clean up Docker (`docker compose down -v`). | Secret scan passes; `.env.example` secret-free; S7 full `docker history` has no static secret; 0 leftover `rikkei` containers/volumes. |
| Rule 04 | `.claude/rules/04-honest-verification.md` | Reproduce F1, F2, S1–S8 RED first and prove GREEN with raw outputs, exit codes, and `java.time.Clock` deterministic tests; zero `TODO`/`FIXME`/`console.log`. | Raw RED and GREEN outputs recorded in `BASELINE.md`, `PR_DESCRIPTION.md`, and handoff reports; `.\check.ps1` / `./check.sh` 26/26 PASS. |
| Rule 05 | `.claude/rules/05-backend-java.md` | Maintain Spotless AOSP, SpotBugs, `-Xlint:all -Werror`, Java 25 records, `open-in-view: false`, and update Rule 05 stale test baseline (`S6`). | `./mvnw spotless:check`, `spotbugs:check`, `clean test-compile`, and `./mvnw test` exit 0 with updated count (`>= 728`). |
| Rule 06 | `.claude/rules/06-database-flyway.md` | Never edit or rename merged Flyway migrations under `db/migration/` or `db/migration-dev/`; preserve exact `origin/develop` SHA-256 hashes. | `git diff origin/develop -- backend/src/main/resources/db/` is empty and SHA-256 hashes match `origin/develop`. |
| Rule 07 | `.claude/rules/07-security-rbac.md` | Preserve deny-by-default `RoutePolicyRegistry`, `OwnershipGuard`, fail-fast `prod` validation (`F1b`), and safe trusted-proxy rate limiting (`F1a`). | `AuthRateLimiterTest`, `AuthRateLimitIntegrationTest`, `AuthRateLimitProdValidatorTest`, and `SecurityHardeningIntegrationTest` pass. |
| Rule 08 | `.claude/rules/08-frontend-engineering.md` | Keep React 19/TypeScript 6 strict mode, single `httpClient.ts`, memory-only JWT storage, and WCAG 2.2 AA compliance intact. | Frontend `lint`, `typecheck`, `test` (`>= 440`, `0` `act()` warnings), and `build` pass. |
| Rule 09 | `.claude/rules/09-frontend-design-bar.md` | Preserve `--rj-*` design tokens, self-hosted fonts, `<Icon />`, 0 emoji, and `120/120` contrast across light/dark modes. | `compute-contrast.mjs` (`120/120`) and `/browser` light/dark checks pass. |
| Rule 10 | `.claude/rules/10-testing-strategy.md` | Follow Red-Green-Refactor TDD, hermetic random-port Testcontainers, zero `Thread.sleep()`, and sync stale Rule 10 baselines (`S6`). | Verified backend/frontend/E2E counts match `agent-config/rules/05*` and `10*`. |
| Rule 11 | `.claude/rules/11-docs-and-bilingual.md` | Update EN+VI sections (`docs/02`, S3 JWT note, S4 invariant docs), keep append-only `docs/platform1/*`, and pass `markdownlint-cli2` + `cspell`. | `markdownlint-cli2` and `cspell` exit `0` without inline ignores. |
| Rule 12 | `.claude/rules/12-ci-and-quality-gates.md` | Keep `29` definitions / `26` active runtime gates / `23` CI checks unchanged; never run `scripts/run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs` and `./check.sh` / `.\check.ps1` (`26/26`) pass. |
| Rule 13 | `.claude/rules/13-backend-data-access-performance.md` | Preserve `open-in-view: false`, `ddl-auto: none`, configurable `jakarta.persistence.query.timeout` (`S1`), and S4 skill recompute invariants. | Slowest query timings verified and S4 pinning test passes. |
| Rule 14 | `.claude/rules/14-backend-module-boundaries.md` | Keep F1 (`identity`), S1 (`common`), and S4 (`candidate`) edits strictly within module boundaries with zero cross-module repo/entity leakage. | Clean compilation and existing boundary tests pass. |
| Rule 15 | `.claude/rules/15-backend-observability-ops.md` | Revert `application-dev.yml` logging levels to `DEBUG` (`S5`) unless `BASELINE.md` proves a threshold gain; keep `prod` ECS and minimal Actuator. | `git diff origin/develop -- backend/src/main/resources/application-dev.yml` is empty (or Rule 15 updated first if kept). |
| Rule 16 | `.claude/rules/16-backend-integrations.md` | Add zero new dependencies (`pom.xml`, `package*.json` unchanged); keep OpenAPI dev-only (`prod` disabled). | `git diff origin/develop -- backend/pom.xml frontend/package*.json` is empty. |

### 4. Concrete Constraints and Proof Methods (Applicable Skills)

| # | Skill | Applicability & Concrete Actionable Constraint | Proof Method |
|---|---|---|---|
| 1 | `using-rikkei-skills` | Enforce strict authority precedence (`PROMPT_PLATFORM_FIX_EN.txt` > `PROMPT_BASE_RULES_EN.txt` > Rules `01`–`16` > Skills) and progressive loading before each change group. | Chronological `Re-read:` entries logged below before every change group. |
| 2 | `test-driven-development` | Observe RED failures before implementing fixes for F1, F2, S1, and S4; use `java.time.Clock` and hermetic tests with zero `Thread.sleep()`. | Verbatim RED and GREEN test outputs recorded in handoff reports. |
| 3 | `systematic-debugging` | Isolate root causes empirically from live probes, logs, and `origin/develop` comparisons (S8) before applying fixes. | Live RED reproductions and root-cause evidence recorded prior to edits. |
| 4 | `brainstorming-before-building` | Evaluate architectural alternatives and trade-offs for F1 and F2 (and stop with `[CAN DUYET - DOI TEAM LEAD]` when a trade-off choice requires Team Lead approval). | Alternatives and raw measurements documented prior to Team Lead approval. |
| 5 | `writing-implementation-plans` | Break `PLATFORM-1-fix` into independently verifiable change groups with OS-temp + SHA-256 rollback (never git restore/stash). | Ordered change groups verified after each step. |
| 6 | `executing-plans` | Required to execute each change group sequentially with immediate verification and progress heartbeats. | Verify every group with its targeted command before advancing; update `progress.md`. |
| 7 | `dispatching-parallel-agents` | Applies to orchestrating non-overlapping workers while keeping Teamwork state strictly outside `rikkei-jobs`. | `git status --porcelain -uall` shows zero `.agents/teamwork/` files inside `rikkei-jobs`. |
| 8 | `security-review-checklist` | Primary for F1 (trusted-proxy `X-Real-IP`, fail-fast `prod`, no fail-closed DoS), S2 (prod CSP), S3 (JWT claims), S7 (Dockerfile CDS secret). | Before/after security proofs, clean secret scan, clean full `docker history`, prod CSP free of localhost. |
| 9 | `spring-security-rbac-endpoint` | Required for F1 `prod` validator (`ProdEnvironmentValidator` pattern) and preserving deny-by-default auth endpoints. | `AuthRateLimit*` tests, `ProdEnvironmentValidator*` / F1 validator tests, and `SecurityHardeningIntegrationTest` pass. |
| 10 | `backend-module-feature` | Governs Java code style, configuration properties, and Javadoc standards for F1, S1, S3, S4. | Spotless, SpotBugs, and `-Xlint:all -Werror` pass cleanly. |
| 11 | `backend-module-boundaries` | Ensures F1 (`identity`), S1 (`common`), and S4 (`candidate`) edits preserve Modular Monolith isolation. | Zero cross-module repository/entity leakage. |
| 12 | `backend-persistence-performance` | Governs S1 JPA query timeout property + slowest query check and S4 skill recompute invariant. | Slowest query timings reported vs `jakarta.persistence.query.timeout`; S4 pinning test passes. |
| 13 | `api-contract-and-errors` | Ensures F1 rate limit `429 RATE_LIMITED` + `Retry-After` and S1 upload error handling preserve `ErrorResponse` contracts. | E2E `27/329/2020` and integration tests verify exact error shapes. |
| 14 | `external-system-integration-and-mock` | Keeps mock LMS/Cloudinary dev-only (S2 dev CSP) and validates slow upload boundaries (S1). | Throttled upload proof and dev CSP verification pass. |
| 15 | `ci-local-and-debug` | Governs `./check.sh`, `.\check.ps1`, Docker Compose E2E, and clean `docker compose down -v` teardown. | `26/26` gate parity and `0` leftover `rikkei` resources. |
| 16 | `docs-bilingual-update` | Governs bilingual EN+VI updates (`docs/02`, S3 JWT note, S4 invariant docs) and append-only `docs/platform1/*` updates. | `markdownlint-cli2` and `cspell` exit `0`. |
| 17 | `frontend-accessibility-audit` & `frontend-taste-anti-slop` | Support mandatory live `/browser` verification after S2 and F1/F2 across every route at `1440px` and `375px` (light & dark). | Zero console errors, zero CSP violations, images load, and login flow works through nginx. |
| 18 | `requesting-code-review` & `receiving-code-review` | Map all `PLATFORM-1` + `PLATFORM-1-fix` changed files 1:1 to `T022DB0:` commit proposals and fix all Team Lead review findings at root cause. | `PR_DESCRIPTION.md` commit proposals verified against `git status --porcelain -uall`. |
| 19 | `verification-before-completion` & `handoff-to-team-lead` | Require fresh full gates, live `/browser`, fresh Docker E2E, and honest Vietnamese handoffs with uncommitted git state. | All final raw command outputs and exit codes recorded. |

### 5. Open PR Collisions (#13, #21, #26) & Policy

- **Existing `PLATFORM-1` overlaps**: `.gitignore` (#13), `docs/02-local-development-troubleshooting.md` (#13), `frontend/src/App.test.tsx` (#21), `frontend/src/features/identity/__tests__/RoleHomes.test.tsx` (#13, #26), `frontend/src/features/identity/__tests__/postLoginRedirect.test.tsx` (#13).
- **`PLATFORM-1-fix` target overlaps (handle carefully / report collisions)**:
  - **PR #13 (UT-01)**: `.env.example`, `backend/src/main/java/com/rikkei/jobs/common/config/ProdEnvironmentValidator.java`, `backend/src/main/resources/application.yml`, `backend/src/main/resources/application-prod.yml`, `backend/src/test/java/com/rikkei/jobs/config/ProdEnvironmentValidatorOrderingTest.java`, `backend/src/test/java/com/rikkei/jobs/config/ProdEnvironmentValidatorTest.java`, `backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java`, `docs/02-local-development-troubleshooting.md`.
  - **PR #21 (UT-02)**: `docker-compose.yml`, `backend/src/main/java/com/rikkei/jobs/common/config/ProdEnvironmentValidator.java`, `backend/src/main/java/com/rikkei/jobs/common/security/SecurityConfig.java`, `backend/src/main/resources/application.yml`, `backend/src/test/java/com/rikkei/jobs/config/ProdEnvironmentValidatorOrderingTest.java`, `backend/src/test/java/com/rikkei/jobs/config/ProdEnvironmentValidatorTest.java`, `backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java`.
  - **PR #26 (AI-05)**: `backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java`.
- **Policy**: Avoid unnecessary edits to colliding files (for example, implement F1(b) via a dedicated `ApplicationPreparedEvent` validator class in `identity/security/` in the same style as `ProdEnvironmentValidator` rather than editing `ProdEnvironmentValidator.java`, and avoid editing `SecurityHardeningIntegrationTest.java` unless S8 proves a new defect requires it). Where `PROMPT_PLATFORM_FIX_EN.txt` explicitly authorizes `docker-compose.yml`, `.env.example`, `application*.yml`, or `docs/02-local-development-troubleshooting.md` for F1/F2, minimize diff footprint and report collisions explicitly in `PR_DESCRIPTION.md` and handoff.

### Re-read Log (PLATFORM-1-fix)

- Re-read: Rules 01, 03, 04, 12, 15, 16 and skills using-rikkei-skills, security-review-checklist, ci-local-and-debug, verification-before-completion, before Change Group 1 (S5 and S7)
- Re-read: Rules 04, 05, 10, 13, 14 and skills backend-module-feature, backend-persistence-performance, test-driven-development, verification-before-completion, before Change Group 2 (S1)
- Re-read: Rules 05, 07, 10, 11, 13, 14 and skills spring-security-rbac-endpoint, security-review-checklist, backend-persistence-performance, docs-bilingual-update, test-driven-development, before Change Group 3 (S3 and S4)
- Re-read: Rules 01, 02, 03, 04, 05, 07, 10, 12, 14, 15, 16 and skills using-rikkei-skills, test-driven-development, systematic-debugging, security-review-checklist, spring-security-rbac-endpoint, api-contract-and-errors, backend-module-feature, backend-module-boundaries, verification-before-completion, before Change Group 4 (F1 Auth Rate Limiter)
- Re-read: Rules 01, 02, 03, 04, 08, 11, 12, 13, 15, 16 and skills using-rikkei-skills, systematic-debugging, brainstorming-before-building, security-review-checklist, external-system-integration-and-mock, docs-bilingual-update, ci-local-and-debug, verification-before-completion, before Change Group 5 (F2 Nginx Dynamic Upstream, S2 Dev-Only CSP, and Compose F1 Wiring)
- Re-read: Rules 01, 02, 04, 05, 07, 10, 11, 12 and skills using-rikkei-skills, test-driven-development, spring-security-rbac-endpoint, docs-bilingual-update, verification-before-completion, before Change Group 6 (Approved Prod Test Properties, Deterministic Rate-Limit Clock, EN+VI Testing Doc, and S6 Rule Baseline Sync)
- Re-read: Rules 01, 02, 03, 04, 06, 11, 12 and skills using-rikkei-skills, docs-bilingual-update, ci-local-and-debug, requesting-code-review, verification-before-completion, handoff-to-team-lead, before Change Group 7 (Final Fresh Docker E2E, Append-Only Platform1 Docs, PR Commit Proposals, and Full 26/26 Quality Gates)
