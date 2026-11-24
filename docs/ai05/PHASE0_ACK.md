# Phase 0 Acknowledgement — Round AI05-fix (T023DF5)

- **Round**: `AI05-fix`
- **Task code**: `T023DF5`
- **Branch**: `feature/t023df5-ai-safety-controls`
- **Phase 0 HEAD**: `c42afd1` (based on `origin/develop` `eb75201`)
- **Scope**: Fix PR #26 (`[AI-05] add AI privacy, quotas and administrator audit controls`) defects A1–A9, perform live `/browser` verification on Docker stack, and verify all repository and E2E gates in a single uncommitted round.

## 1. Exact List of Files Read

### Repository Entrypoints

- `CLAUDE.md`
- `GEMINI.md`
- `AGENTS.md`

### Enterprise Rules (`.claude/rules/`, 16 files)

1. `.claude/rules/01-project-context.md`
2. `.claude/rules/02-git-and-delivery.md`
3. `.claude/rules/03-safety-and-secrets.md`
4. `.claude/rules/04-honest-verification.md`
5. `.claude/rules/05-backend-java.md`
6. `.claude/rules/06-database-flyway.md`
7. `.claude/rules/07-security-rbac.md`
8. `.claude/rules/08-frontend-engineering.md`
9. `.claude/rules/09-frontend-design-bar.md`
10. `.claude/rules/10-testing-strategy.md`
11. `.claude/rules/11-docs-and-bilingual.md`
12. `.claude/rules/12-ci-and-quality-gates.md`
13. `.claude/rules/13-backend-data-access-performance.md`
14. `.claude/rules/14-backend-module-boundaries.md`
15. `.claude/rules/15-backend-observability-ops.md`
16. `.claude/rules/16-backend-integrations.md`

### Repository Skills

- `.claude/skills/using-rikkei-skills/SKILL.md` (read in full)
- All 28 skill definitions under `.claude/skills/*/SKILL.md` (YAML frontmatter `name` and `description` triggers verified directly against the repository skill tree)

### Round Specifications & Existing Artifacts (Read-Only)

- `../.agents/PROMPT_BASE_RULES_EN.txt`
- `../.agents/PROMPT_AI05_FIX_EN.txt`
- `docs/ai05/README.md`
- `docs/ai05/VERIFICATION.md`
- `docs/ai05/PR_DESCRIPTION.md`
- `docs/ai05/run-local-integration.py`
- `docs/ai05/capture-ui.mjs`
- `scripts/validate-agent-config.mjs`

## 2. Mandatory Working Method (Verbatim from `PROMPT_BASE_RULES_EN.txt` line 31)

```text
Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi. Sau khi sửa xong đồng thời phải test luôn kết quả thực tế thô trung thực thay vì dựa vào lí thuyết. Nếu vẫn chưa đạt được thì quay lại workflow trên: Hãy check thật kỹ tìm hiểu và nghiên cứu thật kỹ chuyên sâu nhất từng bước rồi search, nghiên cứu kỹ google chuyên sâu nhất song song nhiều hướng cùng lúc kiểu như GitHub uy tín hoặc diễn đàn IT uy tín, bài báo nghiên cứu uy tín trước khi tìm giải pháp tốt nhất để hoàn thiện hoàn chỉnh và chỉn chu nhất giúp tôi.
```

## 3. Enterprise Rules (01–16): Concrete Constraints and Verification Proofs

| Rule | Concrete Constraint for AI05-fix | How It Will Be Proved |
|---|---|---|
| `01-project-context` | Keep pinned stack versions unchanged (Java 25, Spring Boot 4.1.2, Flyway 12.4.0, PostgreSQL 18.6, React 19.3.1, TypeScript 6.0.3), stay within `ai` + `JobRecommendationService` + `features/ai` + `docs/ai05` + E2E scope, and preserve 5 RBAC roles. | `git diff origin/develop -- "*pom.xml" "*package*.json"` is empty; `node scripts/check-version-drift.mjs` exits 0. |
| `02-git-and-delivery` | Keep Git strictly read-only on branch `feature/t023df5-ai-safety-controls` (`c42afd1`), leave all changes unstaged/uncommitted, and use commit proposal prefix `T023DF5:` (overriding `T022DB0:` per round prompt precedence). | `git branch --show-current` is `feature/t023df5-ai-safety-controls`, `git diff --cached --name-only` is empty, and `git log -n 1 --pretty=short` remains `c42afd1`. |
| `03-safety-and-secrets` | Never open `.env` or `*.pem`; never write outside `rikkei-jobs` (except OS temp scratch/backups cleaned afterward) or into `.agents/teamwork/`; never expose secrets or unmasked PII in logs, errors, or docs. | Secret and machine-path scans in `./check.sh` / `.\check.ps1` pass; `PiiMaskerTest` (`>= 40` cases), A6 validation tests, and A9 #8 log inspection pass. |
| `04-honest-verification` | Reproduce each defect A1–A9 RED with raw output before fixing, then prove GREEN with actual command execution, exit code 0, and raw output; never fake metrics, use `Thread.sleep`, or add unrequested quality gates. | Raw RED and GREEN outputs recorded in `docs/ai05/VERIFICATION.md`; `node scripts/check-gate-sync.mjs`, `./check.sh`, and `.\check.ps1` pass with identical gate counts. |
| `05-backend-java` | Use immutable Java `record` DTOs, keep `@Entity` private to `ai`, compile cleanly with `-Xlint:all -Werror`, pass Spotless AOSP and SpotBugs (`Max`/`Medium`), keep `open-in-view: false`, and never remove existing tests. | `./mvnw clean test-compile`, `./mvnw spotless:check`, `./mvnw spotbugs:check`, and `./mvnw test` all exit 0 with raw test counts reported. |
| `06-database-flyway` | Never alter any migration present on `origin/develop`; edit only the unmerged `V17__ai_governance.sql` in place for A7 index optimization using PostgreSQL 18.6 standards and SQLFluff formatting. | SHA-256 hashes of all 15 `origin/develop` migration/seed files match byte-for-byte; SQLFluff, `FlywayMigrationIntegrationTest`, `ProfileSeparationIntegrationTest`, and `AiGovernanceIntegrationTest` pass. |
| `07-security-rbac` | Enforce deny-by-default RBAC on all 4 `/api/v1/admin/ai-*` endpoints (`401` anonymous, `403` non-`ADMIN`), validate inputs with Jakarta Validation, reject blank real-provider API keys generically (A6), and sanitize model names against path injection. | `SecurityHardeningIntegrationTest`, `AiGovernanceIntegrationTest`, E2E RBAC tests, and live A9 #1–#3 API transcripts pass. |
| `08-frontend-engineering` | Keep strict TypeScript (no `any` or `@ts-ignore`), route all calls through `shared/api/httpClient.ts` with memory-only tokens, revert unrelated formatting noise in `App.tsx` and `AdminHomePage.tsx` (A4), and keep WCAG 2.2 AA compliance. | `npm run lint --prefix frontend`, `npm run typecheck --prefix frontend`, `npm run test --prefix frontend` (zero `act()` warnings), and `npm run build --prefix frontend` (within gzip baselines) pass. |
| `09-frontend-design-bar` | Use zero emojis, tokenized colors only from `design-tokens.css`, `<Icon name=... />` icons, dense admin layout/motion budgets (`<= 150ms` micro, `prefers-reduced-motion`), and zero horizontal overflow. | `node scripts/compute-contrast.mjs` passes; live `/browser` journeys on `/admin`, `/admin/ai-config`, `/admin/ai-logs`, and candidate recommendations pass at 375/768/1024/1440 px in light and dark modes. |
| `10-testing-strategy` | Follow TDD Red-Green-Refactor, use hermetic Testcontainers `postgres:18.6-alpine` (no fixed ports or `Thread.sleep`), inject `java.time.Clock` for A5 TTL and A7 retention cleanup, and expand unit, integration, and E2E coverage. | `./mvnw test`, `npm --prefix frontend test`, and clean `docker compose up -d --build --wait` -> `node e2e/run-all.mjs` -> `docker compose down -v` pass with zero leftover containers/volumes/networks. |
| `11-docs-and-bilingual` | Write technical docs under `docs/ai05/` in English (keeping Vietnamese UI copy/reports with full diacritics), update existing docs append-only with an `AI05-fix` section, remove PNGs/local scripts (A8), and keep `markdownlint` + `cspell` clean. | `npx markdownlint-cli2`, `npx cspell`, and `node scripts/check-version-drift.mjs` exit 0. |
| `12-ci-and-quality-gates` | Add zero new quality gates, maintain parity across 29 gate definitions (26 active + 3 fallbacks) and 23 CI checks, and avoid `scripts/run-ci-in-docker.*` while executing `./check.sh` and `.\check.ps1` directly. | `node scripts/check-gate-sync.mjs`, `./check.sh`, and `.\check.ps1` pass with identical gate counts. |
| `13-backend-data-access-performance` | Keep `open-in-view: false`, `ddl-auto: none`, and `@Version` 409 handling; add thread-safe TTL config snapshot in `AiConfigService` (A5) and tune `V17` `ai_logs` indexes + evaluate `COUNT(*)` > 100 ms using `EXPLAIN (ANALYZE, BUFFERS)` on 500k–1M synthetic rows (A7). | Raw before/after `EXPLAIN (ANALYZE, BUFFERS)` plans on 500k–1M rows, A5 query-count tests, and A9 #3/#7 live API checks pass. |
| `14-backend-module-boundaries` | Preserve modular monolith isolation: `ai` owns only `job_recommendations`, `ai_config`, `ai_logs`, `ai_usage`; declare zero cross-module FKs or SQL joins; leave public APIs of other modules untouched. | `git diff origin/develop --stat` and `V17__ai_governance.sql` review confirm zero cross-module FKs, joins, or public API changes outside `ai` / `JobRecommendationService`. |
| `15-backend-observability-ops` | Never log PII, API keys, authorization headers, or raw exception messages into application logs or `ai_logs`; use parameterized SLF4J logging and preserve ECS/Actuator hardening (`health,info`, `show-details: never`). | `ActuatorHealthTest`, `HealthCheckIntegrationTest`, and A9 #8 audit-row failure inspection pass. |
| `16-backend-integrations` | Use `@EnableScheduling` in an `ai`-owned config with a bounded named executor (no `new Thread()`) and PostgreSQL advisory lock for A7 daily retention; keep `pom.xml` unchanged and OpenAPI `@Tag`/`@Operation`/`@ApiResponse` complete. | Executor/scheduler bean inspection, `Clock`-based retention tests, `test_openapi_docs.test.mjs`, and empty `pom.xml` diff pass. |

## 4. Complete Breakdown of All 28 Repository Skills

Note: `PROMPT_BASE_RULES_EN.txt` line 15 also mentions `frontend-taste-anti-slop`; that skill directory does not exist in `.claude/skills/` on this repository checkout because its visual standards reside in `.claude/rules/09-frontend-design-bar.md` and `.claude/skills/frontend-visual-design/SKILL.md`. All 28 repository skills present under `.claude/skills/` are evaluated below.

### Applicable Skills (20)

| # | Skill | Why It Applies & Concrete Constraint | Verification Proof |
|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory entry skill at Phase 0 and phase transitions; enforces Rules 01–16 precedence over skills. | `docs/ai05/PHASE0_ACK.md` created before edits and updated with `Re-read:` lines before each change group. |
| 2 | `systematic-debugging` | Required for A1–A9: reproduce every defect RED with raw output, isolate root cause, then fix without symptom patching. | Raw RED and GREEN logs documented for A1–A9 in `docs/ai05/VERIFICATION.md`. |
| 3 | `test-driven-development` | Required for A1 (`>= 40` cases + 1 MB hostile string), A2, A3, A5, A6, A7 (`Clock`), and frontend/E2E additions via Red-Green-Refactor without `Thread.sleep`. | `./mvnw test`, `npm --prefix frontend test`, and `node e2e/run-all.mjs` exit 0. |
| 4 | `backend-module-feature` | Governs changes in `PiiMasker`, `AiConfigService`, `AiService`, `JobRecommendationService`, `AiAdminController`, and retention scheduling using immutable records and clean transactions. | `./mvnw clean test-compile spotless:check spotbugs:check test` passes. |
| 5 | `backend-module-boundaries` | Keeps `ai` decoupled from `candidate`/`company`/`identity` with zero cross-module FKs or joins and no unintended cross-module API edits. | Diff review of `V17__ai_governance.sql` and `com.rikkei.jobs.ai` package imports. |
| 6 | `backend-persistence-performance` | Directly governs A5 config snapshot caching, A7 `V17` index review with `EXPLAIN (ANALYZE, BUFFERS)` on 500k–1M synthetic rows, `COUNT(*)` evaluation, and bounded batch delete. | Raw before/after `EXPLAIN (ANALYZE, BUFFERS)` plans and A5/A7 tests pass. |
| 7 | `flyway-migration-authoring` | Governs in-place editing of unmerged `V17__ai_governance.sql` while leaving all `origin/develop` migrations untouched. | Unchanged SHA-256 on 15 `origin/develop` files + SQLFluff + migration integration tests. |
| 8 | `spring-security-rbac-endpoint` | Governs A6 generic missing-key rejection, model path-character validation, and A9 #1 RBAC checks across all 4 admin endpoints. | `AiGovernanceIntegrationTest` and live A9 `401`/`403` curl/E2E transcripts pass. |
| 9 | `api-contract-and-errors` | Governs A2 graceful `200` recommendation fallback + `meta.message` (while preserving `429` in `AiService.generate`), A6 `400`/`409` JSON `{"code","message"}`, and A9 #2/#3/#9 OpenAPI accuracy. | `JobRecommendationServiceTest`, `AiGovernanceIntegrationTest`, and `test_openapi_docs.test.mjs` pass. |
| 10 | `security-review-checklist` | Governs A1 idempotency, bounded regex runtime, fail-closed masking, A6 path-injection prevention, and A9 #8 secret/exception-free `ai_logs`. | `PiiMaskerTest`, `AiConfigServiceTest`, A9 #8 live checks, and repo secret scan pass. |
| 11 | `frontend-feature-slice` | Governs A4 noise cleanup in `App.tsx` and `AdminHomePage.tsx` plus A6 error display in `features/ai/admin/` using strict TypeScript and `httpClient.ts`. | `npm run lint`, `typecheck`, `test`, and `build` in `frontend/` pass with zero `act()` warnings. |
| 12 | `frontend-visual-design` | Governs live `/browser` validation of `/admin`, `/admin/ai-config`, `/admin/ai-logs`, and candidate recommendations across 375/768/1024/1440 px, light/dark, tokens, and contrast. | `node scripts/compute-contrast.mjs` and `/browser` live verification report pass. |
| 13 | `frontend-motion-design` | Governs verification of admin micro-interaction budgets (`<= 150ms`), dialog transitions (`<= 300ms`), and `prefers-reduced-motion` during live `/browser` checks. | CSS/component inspection and live `/browser` verification pass. |
| 14 | `frontend-iconography` | Governs verification that `features/ai/` renders icons exclusively via `<Icon name=... />` on a 24px grid with zero emojis or raw icon packs. | Source inspection and live `/browser` accessibility check pass. |
| 15 | `frontend-accessibility-audit` | Governs live `/browser` checks for keyboard-only navigation, dialog focus trap, `Escape` closing and focus return, chart accessible table, and 44px touch targets. | `/browser` keyboard/a11y walkthrough and `AiAdmin.test.tsx` pass. |
| 16 | `ci-local-and-debug` | Governs full local gate execution (`./check.sh`, `.\check.ps1`) and clean Docker E2E (`docker compose up -d --build --wait` -> `node e2e/run-all.mjs` -> `docker compose down -v`). | Raw outputs of `./check.sh`, `.\check.ps1`, and Docker E2E + `docker ps/volume/network` clean check. |
| 17 | `docs-bilingual-update` | Governs A8 cleanup (removing 11 PNGs, `capture-ui.mjs`, `run-local-integration.py`, git-ignoring `docs/ai05/pr-screenshots/`), verifying `sample-data.sql`, and appending `AI05-fix` sections cleanly. | `markdownlint-cli2`, `cspell`, `validate-agent-config.mjs`, and `check-version-drift.mjs` exit 0. |
| 18 | `receiving-code-review` | Governs the entire AI05-fix workflow: verifying and fixing Team Lead findings A1–A9 from PR #26 review without scope creep. | All A1–A9 items carry verified RED -> GREEN evidence in `VERIFICATION.md`. |
| 19 | `verification-before-completion` | Governs running every gate, live API check, `/browser` journey, and clean Docker E2E before claiming completion. | Raw command transcripts and zero-failure gate summaries recorded before handoff. |
| 20 | `handoff-to-team-lead` | Governs final Vietnamese summary, file/change manifest, English commit proposals prefixed `T023DF5:`, read-only Git confirmation, and clean Docker state. | Final handoff report delivered with `git status`, `git diff --cached --name-only` empty, and `docker compose down -v` proof. |

### Non-Applicable Skills (8)

| # | Skill | Reason Not Applicable to AI05-fix |
|---|---|---|
| 1 | `brainstorming-before-building` | Requirements and architectural decisions for A1–A9 (including A2 gateway vs recommendation behavior and A7 in-place `V17` edits) are already fixed by `PROMPT_AI05_FIX_EN.txt`. |
| 2 | `writing-implementation-plans` | Execution follows the fixed A1–A9 defect list and round prompt directly without generating a separate feature design plan artifact. |
| 3 | `executing-plans` | No standalone `writing-implementation-plans` artifact exists; execution is governed by `receiving-code-review`, `systematic-debugging`, and `verification-before-completion`. |
| 4 | `dispatching-parallel-agents` | Orchestration-level coordination skill for the parent orchestrator rather than module implementation rules. |
| 5 | `external-system-integration-and-mock` | AI05-fix modifies `ai` provider/config/audit logic and `JobRecommendationService`, not `mock/server.js` or `ExternalApiClient` LMS/Exam/PM/Meet contracts. |
| 6 | `module-domain-knowledge` | Covers the 7 core recruitment/education business cards; AI governance rules are cross-cutting safety controls fully specified in `PROMPT_AI05_FIX_EN.txt`. |
| 7 | `requesting-code-review` | PR #26 is already open and under review; this round responds to existing review findings via `receiving-code-review` and `handoff-to-team-lead`. |
| 8 | `writing-skills` | AI05-fix does not author or modify repository `SKILL.md` or `agent-config/` files unless a rule/skill defect explicitly requires it. |

## 5. Phase 0 Baseline Summary

- **Git state** (verified directly on `c42afd1`):
  - Active branch: `feature/t023df5-ai-safety-controls`
  - Staged changes (`git diff --cached --name-only`): empty
  - `pom.xml` and `package*.json` diff vs `origin/develop`: empty
  - `origin/develop` migrations/seeds under `db/migration` and `db/migration-dev` (15 files): 100% SHA-256 match
- **Author / Pre-fix Suite Baselines** (from `docs/ai05/VERIFICATION.md` and Phase 0 survey; to be re-verified directly during Phase 1/Verification):
  - Backend tests (`./mvnw test`): `751` tests (`751/751` passing on CI for `c42afd1`)
  - Frontend tests (`npm --prefix frontend test`): `441` tests across `38` files (`441/441` passing)
  - Frontend bundle baseline (`npm --prefix frontend run build`): entry JS gzip `99.10 kB`, entry CSS gzip `14.04 kB`
  - E2E suite (`e2e/run-all.mjs`): `27` suites across 4 tiers, `329` cases, `2021` assertions

## 6. Re-read Log

(Append one `Re-read: <rule numbers and skill names>, before <change group>` line here before every new change group.)

- Re-read: R0, R1, Rules 01, 03, 04, 05, 06, 07, 10, 12, 13, 14, 15, 16, skills using-rikkei-skills, systematic-debugging, test-driven-development, backend-module-feature, backend-module-boundaries, backend-persistence-performance, flyway-migration-authoring, spring-security-rbac-endpoint, api-contract-and-errors, security-review-checklist, receiving-code-review, verification-before-completion, before Change Group 1 (Backend A1, A2, A3, A5, A6)
- Re-read: R0, R1, Rules 01, 04, 05, 06, 10, 12, 13, 14, 15, 16, skills using-rikkei-skills, backend-module-feature, backend-persistence-performance, flyway-migration-authoring, test-driven-development, verification-before-completion, before Change Group 2 (A7 Retention & V17 Indexes)
- Re-read: R0, R1, Rules 01, 04, 08, 09, 10, 12, skills using-rikkei-skills, frontend-feature-slice, frontend-visual-design, frontend-motion-design, frontend-iconography, frontend-accessibility-audit, test-driven-development, receiving-code-review, verification-before-completion, before Change Group 3 (Frontend A4, A2 Banner, A6 Validation, A7 totalCapped)
- Re-read: R0, R1, Rules 02, 03, 04, 10, 11, 12, skills using-rikkei-skills, docs-bilingual-update, test-driven-development, api-contract-and-errors, verification-before-completion, before Change Group 4 (A8 Docs Hygiene & E2E AI Coverage)
- Re-read: R0, R1, Rules 04, 05, 08, 09, 10, skills using-rikkei-skills, systematic-debugging, test-driven-development, frontend-feature-slice, receiving-code-review, verification-before-completion, before Change Group 5 (Iteration 2 Fixes: PiiMasker ID Boundary & AiConfigPage v-flag Pattern)
- Re-read: R0, R1, Rules 04, 05, 08, 10, 14, skills using-rikkei-skills, systematic-debugging, test-driven-development, receiving-code-review, verification-before-completion, before Change Group 6 (PiiMasker idempotency & space-grouped ID boundary, cspell, and 50-thread gateway concurrency test)
- Re-read: R0, R1, Rules 04, 05, 10, 14, skills using-rikkei-skills, systematic-debugging, test-driven-development, receiving-code-review, verification-before-completion, before Change Group 7 (PiiMasker email-adjacent boundary & 1M spaced-single-phone < 1000ms performance)
- Re-read: R0, R1, Rules 04, 05, 10, 14, skills using-rikkei-skills, systematic-debugging, test-driven-development, receiving-code-review, verification-before-completion, before Change Group 8 (PiiMasker O(N) local email convergence, multi-label TLD deferral, NFKC span claiming, and space-grouped PII before email)
- Re-read: R0, R1, Rules 04, 05, 10, 14, skills using-rikkei-skills, systematic-debugging, test-driven-development, receiving-code-review, verification-before-completion, before Change Group 9 (PiiMasker chained-email isolation, +/_/% delimiter support after spaced/paren PII, (028) 3822-1234-email boundary, and NFKC unit-symbol boundary)
- Re-read: R0, R1, Rules 04, 05, 10, 14, skills using-rikkei-skills, systematic-debugging, test-driven-development, receiving-code-review, verification-before-completion, before Change Group 10 (PiiMasker require >=1 ASCII alphanumeric char in email local-part for strict idempotency and document OTHER_NUMBER circled-digit obfuscation policy)
- Re-read: R0, R1, Rules 04, 05, 10, 14, skills using-rikkei-skills, systematic-debugging, test-driven-development, receiving-code-review, verification-before-completion, before Change Group 11 (PiiMasker exclude OTHER_NUMBER positions from email local and domain matching for Pass1/Pass2 idempotency and prefix-leak prevention)
- Re-read: R0, R1, Rules 01, 04, 05, 12, 14, skills using-rikkei-skills, docs-bilingual-update, verification-before-completion, handoff-to-team-lead, before Change Group 12 (append final Wave 8, Docker E2E, A9 9-point live API, /browser Pass 1 & Pass 2, Docker teardown, and ./check.sh / .\check.ps1 verification evidence to docs/ai05/VERIFICATION.md)
