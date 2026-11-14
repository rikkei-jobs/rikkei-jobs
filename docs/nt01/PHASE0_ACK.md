# Phase 0 Acknowledgement — Task NT-01 (T022B63)

Document Path: docs/nt01/PHASE0_ACK.md
Task Identifier: NT-01 (Business Code: T022B63) — LOGIN
Branch: feature/T022863-dang-nhap (rebased on develop 85ad066)
Working Directory: D:\GitHub\Rikkei\rikkei-jobs
Timestamp: 2026-11-12T02:00:00Z
Status: Completed & Binding Prior to Any Code Modification
Zero Emoji Compliance: Verified (0 emoji characters across entire document)

---

## 1. Inventory of Authoritative Files Read

Prior to editing, creating, or deleting any file in the workspace, the engineering team has read and verified the following files in their entirety:

### 1.1 Root Repository Agent Configurations

1. CLAUDE.md (Root Claude Code agent configuration, architecture boundaries, stack versions)
2. GEMINI.md (Gemini CLI and Antigravity directive imports, skill mirrors, and tool configuration)
3. AGENTS.md (Canonical instructions for AI coding agents, rules and skills architecture)

### 1.2 Enterprise Rules (.claude/rules/)

1. .claude/rules/01-project-context.md (System identity, 7 modules, 5 roles, 20 skills framework)
2. .claude/rules/02-git-and-delivery.md (Git flow, agent strict read-only mandate, commit conventions)
3. .claude/rules/03-safety-and-secrets.md (Zero real secrets, writable filesystem bounds, host safety)
4. .claude/rules/04-honest-verification.md (Evidence before claims, raw command outputs, gate sync)
5. .claude/rules/05-backend-java.md (Java 25 LTS, Spring Boot 4.1.2, modular monolith, zero warnings)
6. .claude/rules/06-database-flyway.md (Flyway migrations immutability, PostgreSQL 18.6 standards)
7. .claude/rules/07-security-rbac.md (Deny-by-default, 5 roles, stateless JWT, fail-fast validation)
8. .claude/rules/08-frontend-engineering.md (React 19, TypeScript strict, feature slices, WCAG 2.2 AA)
9. .claude/rules/09-frontend-design-bar.md (Bespoke palette, self-hosted fonts, custom Icon, zero emoji)
10. .claude/rules/10-testing-strategy.md (Test pyramid, Red-Green-Refactor TDD, hermetic tests, zero sleep)
11. .claude/rules/11-docs-and-bilingual.md (Bilingual documentation, zero version drift in docs/03)
12. .claude/rules/12-ci-and-quality-gates.md (25 active runtime gates, 28 definitions, check.sh / check.ps1)
13. .claude/rules/13-backend-data-access-performance.md (open-in-view=false, N+1 prevention, indexing)
14. .claude/rules/14-backend-module-boundaries.md (Identity module boundaries, no cross-module FKs/joins)
15. .claude/rules/15-backend-observability-ops.md (ECS structured logging, secret masking, minimal actuator)
16. .claude/rules/16-backend-integrations.md (Mailpit port 1025/8025, OpenAPI 3.2.0, ExternalApiClient)

### 1.3 Task Skills (SKILL.md and references/ in .claude/skills/)

1. .claude/skills/using-rikkei-skills/SKILL.md (Skills invocation order, trigger matching)
2. .claude/skills/brainstorming-before-building/SKILL.md (Pre-implementation architectural evaluation)
3. .claude/skills/writing-implementation-plans/SKILL.md (Granular step-by-step verified plans)
4. .claude/skills/executing-plans/SKILL.md (Disciplined plan execution and progress logging)
5. .claude/skills/test-driven-development/SKILL.md (Red-Green-Refactor testing discipline)
6. .claude/skills/systematic-debugging/SKILL.md (Root cause analysis and minimal reproductions)
7. .claude/skills/verification-before-completion/SKILL.md (Raw terminal execution evidence before claims)
8. .claude/skills/requesting-code-review/SKILL.md (Self-audit, diff inspection, Anti-AI rubric check)
9. .claude/skills/receiving-code-review/SKILL.md (Objective feedback classification and test-driven fixes)
10. .claude/skills/handoff-to-team-lead/SKILL.md (Clean uncommitted working tree and commit proposals)
11. .claude/skills/backend-module-feature/SKILL.md (Controller-Service-Repository pattern, Java records)
12. .claude/skills/backend-persistence-performance/SKILL.md (Indexing, connection timeouts, short transactions)
13. .claude/skills/backend-module-boundaries/SKILL.md (Data isolation, scalar cross-module identifiers)
14. .claude/skills/module-domain-knowledge/SKILL.md (Identity module domain capabilities and constraints)
15. .claude/skills/flyway-migration-authoring/SKILL.md (Forward migration scripting, BIGINT identity, TIMESTAMPTZ)
16. .claude/skills/spring-security-rbac-endpoint/SKILL.md (Stateless SecurityFilterChain, role whitelisting)
17. .claude/skills/api-contract-and-errors/SKILL.md (REST URI standards, ErrorResponse JSON format)
18. .claude/skills/external-system-integration-and-mock/SKILL.md (ExternalApiClient call conventions)
19. .claude/skills/security-review-checklist/SKILL.md (OWASP ASVS alignment, anti-enumeration, brute-force)
20. .claude/skills/frontend-feature-slice/SKILL.md (Feature slice directory layout and async state handling)
21. .claude/skills/frontend-visual-design/SKILL.md (Technical Iron Cobalt and Cyber Persimmon styling)
22. .claude/skills/frontend-motion-design/SKILL.md (Spring physics, <=150ms budgets, prefers-reduced-motion)
23. .claude/skills/frontend-iconography/SKILL.md (Custom 24px Icon component, stroke-width=2, zero emoji)
24. .claude/skills/frontend-accessibility-audit/SKILL.md (WCAG 2.2 AA form labels, aria-live, focus rings)
25. .claude/skills/docs-bilingual-update/SKILL.md (Synchronous update of docs/03 EN and VI tables)
26. .claude/skills/ci-local-and-debug/SKILL.md (Local gate execution and container cleanup)

### 1.4 Architecture and Design Specifications

1. docs/design/DESIGN_SYSTEM.md (Anti-AI standards, design tokens, typography, motion budgets)
2. docs/conventions.md (REST naming, unified ErrorResponse, coding conventions)
3. docs/mock-contract.md (LMS SSO verification contract, HTTP endpoints, mock behavior)
4. docs/03-version-table.md (Canonical technology version registry across EN and VI sections)
5. docs/05-open-business-questions.md (Open questions log, Question 3 HR password change policy)

### 1.5 Task Specification and Reference Prompts

1. ORIGINAL_REQUEST.md (Task NT-01 mandate, constraints, and acceptance criteria)
2. D:\GitHub\Rikkei\.agents\PROMPT_NT01_EN.txt (Comprehensive authoritative task specification)
3. D:\GitHub\Rikkei\.agents\PROMPT_NT01_VI.txt (Vietnamese translation summary reference)

---

## 2. Applicable Constraints for 16 Enterprise Rules

| Rule | Rule Name | Concrete Applicable Constraint for Task NT-01 |
|---|---|---|
| Rule 01 | Project Context & Monorepo Overview | "The real backend (backend/) MUST enforce strict single-use validation and 60-second expiration for incoming SSO tickets via the used_sso_tickets database table." (Mock server does not enforce this). |
| Rule 02 | Git Workflow & Agent Read-Only Mandate | "AI coding agents are strictly READ-ONLY regarding Git state modifications: never run commit, push, stage, amend, rebase, reset, stash, tag, or branch checkout. Proposed commit messages must be in English with prefix T022B63:." |
| Rule 03 | Safety, Host Boundaries & Secret Hygiene | "Strictly forbid opening, reading, copying, viewing, or dumping .env, *.pem, or credentials (specifically never touch D:\GitHub\Rikkei\first-key.pem). Zero real secrets in code or git diff; never reuse teammate committed secrets from c339555." |
| Rule 04 | Honest Verification & Quality Gates | "Every PASS claim must provide verifiable raw command output. Never fake numbers or bypass failing checks. No sleeps in time-dependent tests; use an injectable java.time.Clock for deterministic verification." |
| Rule 05 | Java 25 & Spring Boot 4 Backend Standards | "JPA @Entity classes are strictly private to internal persistence layer; never expose entities in REST controller method signatures. Use immutable Java records for DTOs and adhere strictly to ErrorResponse {code, message} with zero compiler warnings (-Xlint:all -Werror)." |
| Rule 06 | Database Migrations and Flyway Discipline | "Never edit, rename, or delete existing V1 or V2 migrations. Implement schema changes as forward migration scripts (V3 in db/migration for DDL, V4 in db/migration-dev for dev seed) using BIGINT GENERATED ALWAYS AS IDENTITY and TIMESTAMPTZ DEFAULT NOW()." |
| Rule 07 | Security Architecture and RBAC | "Enforce deny-by-default in SecurityConfig; fail fast in production via ProdEnvironmentValidator if JWT_SECRET or CORS are insecure/missing; hash passwords with BCrypt; enforce must_change_password 403 filter on non-whitelisted endpoints." |
| Rule 08 | Frontend Engineering Standards | "Organize frontend code under frontend/src/features/identity; strict TypeScript without any or @ts-ignore; ensure WCAG 2.2 AA accessibility with proper semantic HTML, labels, and aria-describedby for form validations." |
| Rule 09 | Frontend Design Bar & Anti-AI Standards | "Zero emoji anywhere in UI or documentation; custom 24px icon system via <Icon name=... />; proprietary Technical Iron Cobalt (#132F52) & Cyber Persimmon (#D9480F) palette; WCAG 2.2 AA contrast >= 4.5:1; purposeful motion with mandatory prefers-reduced-motion." |
| Rule 10 | Testing Strategy and Quality Assurance | "Follow Red-Green-Refactor TDD; hermetic tests with dynamic port allocation in Testcontainers (postgres:18.6-alpine); zero Thread.sleep(); time-dependent logic verified deterministically via Clock; keep all 124 existing backend tests green." |
| Rule 11 | Documentation, Bilingual Standards & Linters | "Maintain bilingual documentation in docs/ where required; zero version drift in docs/03-version-table.md verified by check-version-drift.mjs; clean markdownlint and cspell with raw 0 issues and zero inline ignore comments." |
| Rule 12 | Continuous Integration and Quality Gates | "All local verification runners (check.sh, check.ps1) and CI workflows must pass with identical gate counts (25 active runtime gates, 28 definitions)." |
| Rule 13 | Backend Data Access Performance | "Keep spring.jpa.open-in-view=false; avoid N+1 queries; use DTO projections; index lookup columns (used_sso_tickets, password_reset_tokens) in PostgreSQL; never execute external HTTP calls or email delivery inside @Transactional boundaries." |
| Rule 14 | Backend Module Boundaries | "Module identity owns users, roles, used_sso_tickets, password_reset_tokens; no cross-module SQL joins or physical foreign keys (company_id is a plain scalar Long, not a JPA relationship)." |
| Rule 15 | Backend Observability and Operations | "Never log passwords, password hashes, JWT tokens, or PII; structured ECS JSON logging in production; health endpoint /api/v1/health returns UP without leaking internal database hosts or versions." |
| Rule 16 | Backend Integrations | "Route all external HTTP interactions through ExternalApiClient with X-Service-Key; local email testing via Mailpit on port 1025/8025; OpenAPI 3 (springdoc 3.2.0) visible in dev profile only; pre-approved dependencies only." |

---

## 3. Applicable Constraints for 26 Domain & Process Skills

| Skill | Skill Name | Concrete Applicable Constraint for Task NT-01 |
|---|---|---|
| Skill 01 | using-rikkei-skills | Apply strict order of authority: User/Team Lead Prompt > Rules 01-16 > Skills; trigger skills according to explicit workflow phases. |
| Skill 02 | brainstorming-before-building | Analyze architectural trade-offs prior to coding (in-memory React state vs sessionStorage for JWT tokens; BCrypt vs Argon2); never invent unconfirmed business logic. |
| Skill 03 | writing-implementation-plans | Structure implementation into granular, independently verifiable steps (each step <= 200 lines of code) with explicit test commands and OS temporary rollback procedures. |
| Skill 04 | executing-plans | Execute steps sequentially without skipping when previous steps are red; maintain liveness heartbeat in progress.md. |
| Skill 05 | test-driven-development | Author failing unit/integration tests first (RED) for password policy, lockout counter, SSO ticket TTL, and observe failures before writing production code (GREEN). |
| Skill 06 | systematic-debugging | When encountering test failures or runtime exceptions, reproduce with minimal test cases, pinpoint root cause via stack traces, and avoid empty catch blocks. |
| Skill 07 | verification-before-completion | Never claim completion without executing .\check.ps1 and ./check.sh and verifying that all 25 active gates pass with raw output. |
| Skill 08 | requesting-code-review | Self-audit 100% of the working tree diff, calculate Anti-AI rubric scores, and package verifiable terminal outputs prior to review request. |
| Skill 09 | receiving-code-review | Classify review feedback into 4 priority tiers and create reproducing tests for verified defects before modifying code. |
| Skill 10 | handoff-to-team-lead | Deliver uncommitted working tree; formulate proposed English commit messages prefixed with T022B63: and PR title starting with [NT-01]. |
| Skill 11 | backend-module-feature | Implement layered Controller-Service-Repository architecture in package com.rikkei.jobs.identity; use Java records for DTOs; never leak JPA entities to REST APIs. |
| Skill 12 | backend-persistence-performance | Create B-Tree indexes on used_sso_tickets.ticket and password_reset_tokens.token_hash; keep transactions minimal and short. |
| Skill 13 | backend-module-boundaries | Treat company_id on users table as a plain scalar Long; forbid physical Foreign Key referencing company module tables. |
| Skill 14 | module-domain-knowledge | Enforce identity module domain rules across 5 roles; resolve HR forced password change in accordance with Question 3 of docs/05-open-business-questions.md. |
| Skill 15 | flyway-migration-authoring | Author forward migrations V3 (DDL) and V4 (dev seed) adhering to PostgreSQL 18.6 standards; prove both prod and dev profiles migrate cleanly from empty databases. |
| Skill 16 | spring-security-rbac-endpoint | Configure Spring Security deny-by-default; protect endpoints via @PreAuthorize; whitelist public auth paths (/api/v1/auth/sso, /login, /forgot-password, /reset-password). |
| Skill 17 | api-contract-and-errors | Map auth endpoints under /api/v1/auth/...; return standardized ErrorResponse {code, message} with user-facing Vietnamese messages. |
| Skill 18 | external-system-integration-and-mock | Execute LMS SSO verification via ExternalApiClient.post("/lms/sso/verify") with header X-Service-Key: dev-key and 5000ms timeout. |
| Skill 19 | security-review-checklist | Align implementation with OWASP ASVS V4; prevent user enumeration at /forgot-password; enforce account lockout (5 failed attempts / 15 minutes). |
| Skill 20 | frontend-feature-slice | Build identity slice under frontend/src/features/identity/ handling 4 async states (Loading, Error, Empty, Data) exported via public index.ts. |
| Skill 21 | frontend-visual-design | Implement login UI following docs/design/DESIGN_SYSTEM.md using Technical Iron Cobalt (#132F52) and Cyber Persimmon (#D9480F) with >= 4.5:1 contrast. |
| Skill 22 | frontend-motion-design | Calibrate tab transitions and form micro-interactions to <= 150ms; support prefers-reduced-motion via 100ms cross-fade and 0.001ms duration. |
| Skill 23 | frontend-iconography | Use exclusively custom 24px <Icon name=... /> component with 2px stroke and round caps; enforce ZERO EMOJI across all screens. |
| Skill 24 | frontend-accessibility-audit | Audit login, forgot password, and change password forms against WCAG 2.2 AA (semantic labels, aria-describedby, aria-live, 2px focus rings, Tab navigation). |
| Skill 25 | docs-bilingual-update | Register pre-authorized dependencies (react-router-dom, spring-boot-starter-mail, jjwt) in docs/03-version-table.md (EN+VI) and sync scripts/check-version-drift.mjs. |
| Skill 26 | ci-local-and-debug | Run full local gate runner before completion; clean up ephemeral containers and volumes created during test execution (docker compose down -v). |

---

## 4. Identified Conflicts, Ambiguities & Authoritative Resolution

In accordance with the binding Order of Authority:
User / Team Lead Prompt (PROMPT_NT01_EN.txt) > Enterprise Rules (.claude/rules/ 01-16) > Domain Skills

The following 6 conflicts and ambiguities have been identified and definitively resolved:

### Conflict 1: Execution of Isolated Docker CI Script (`scripts/run-ci-in-docker.*`)

- Ambiguity: Rule 12 and skill `ci-local-and-debug` suggest running `scripts/run-ci-in-docker.ps1` or `.sh` to reproduce CI locally.
- Direct Spec Instruction: `PROMPT_NT01_EN.txt` (Section 1) and `ORIGINAL_REQUEST.md` (R1) explicitly forbid: "DO NOT run scripts/run-ci-in-docker.* : it currently runs docker compose down -v on the host and would delete the developer's local stack/data (known defect, fixed later)".
- Resolution: Prompt has highest authority. Agents MUST NOT execute `scripts/run-ci-in-docker.*`. Verification is conducted strictly using local runners (`.\check.ps1` and `./check.sh`) plus a dedicated, standalone `docker compose up -d --build --wait` E2E execution that the agent explicitly tears down (`docker compose down -v`) at conclusion.

### Conflict 2: Task Code and Proposed Commit Message Prefix

- Ambiguity: CLAUDE.md and Rule 02 reference sprint skeleton code `T022DB0`.
- Direct Spec Instruction: `PROMPT_NT01_EN.txt` defines task code as `NT-01 (code T022B63)` and mandates: "T022B63: prefix for proposed commits; the PR title for GitHub must start with [NT-01]".
- Resolution: Prompt wins. All proposed commit messages in handoff documentation must strictly use prefix `T022B63:` and pull request title must begin with `[NT-01]`.

### Conflict 3: Scalar Role vs Relational `roles` Table in Monorepo

- Ambiguity: Task specification writes `users(..., role, ...)`. Existing monorepo already defines normalized `roles(id, name, description)` and `users.role_id REFERENCES roles(id)` in Flyway V1.
- Direct Spec Instruction: `PROMPT_NT01_EN.txt` (Section 3) specifies: "The spec lists role but the repo models roles via roles(id): keep the existing roles table and expose role names in API/JWT; justify."
- Resolution: Retain existing `roles` relational table and `role_id` foreign key within the identity module schema to preserve data integrity and seed compatibility. At the DTO, REST API, and JWT claim boundaries, expose string role names (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`) as required by the specification.

### Conflict 4: SSO Mock Role Mapping for LMS Identities

- Ambiguity: External mock server `/lms/sso/verify` returns variable role identifiers. How are non-standard or unexpected roles handled?
- Direct Spec Instruction: `PROMPT_NT01_EN.txt` specifies: "Map lms roles to the 5 system roles; unknown role -> reject with a clear error; record the open question in docs/05-open-business-questions.md."
- Resolution: Map student profiles to `CANDIDATE`, instructors to `MENTOR`, coordinators to `STAFF`, and admins to `ADMIN`. Any unmapped or invalid role returns HTTP 401 `INVALID_TICKET` (or 400), and the business ambiguity is formally documented in `docs/05-open-business-questions.md`.

### Conflict 5: API Endpoint URI Conventions (`/auth/...` vs `/api/v1/auth/...`)

- Ambiguity: Course task specification outlines endpoints as `/auth/login`, `/auth/sso`, `/auth/me`.
- Direct Spec Instruction: Monorepo standard in `docs/conventions.md` and Rule 05 mandate that all business REST endpoints must be prefixed with `/api/v1/`.
- Resolution: Endpoints are implemented strictly as `/api/v1/auth/...` (`/api/v1/auth/sso`, `/api/v1/auth/login`, `/api/v1/auth/change-password`, `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password`, `/api/v1/auth/me`). The mapping to course specification URIs is explicitly documented in SpringDoc OpenAPI schemas and `docs/nt01/PR_DESCRIPTION.md`.

### Conflict 6: First-Time Password Change Policy for Dev Seed HR1 (Question 3)

- Ambiguity: Open Question 3 in `docs/05-open-business-questions.md` noted that `hr1@rikkeijobs.test` was seeded with a default password, whereas business rules require HR accounts to change password on first login.
- Direct Spec Instruction: `PROMPT_NT01_EN.txt` (Section 3) dictates: "Add a NEW dev-only migration that makes hr1 start with must_change_password = true and any other seed fixes... prove both profiles migrate from empty DBs."
- Resolution: Keep `V1` and `V2` untouched. Add dev-only migration `V4__dev_seed_nt01.sql` updating `hr1@rikkeijobs.test` to `must_change_password = true`. In production (`prod`), accounts created by staff will default to `must_change_password = true`.

---

## 5. Step-by-Step TDD Implementation Plan (Red-Green-Refactor)

The engineering implementation is structured into 6 sequential phases following `writing-implementation-plans` and `test-driven-development`. Each step is verifiable independently:

### Phase 1: Working Tree Hygiene & Dependency Registration

- Step 1.1: Inventory 71 root files from teammate commit `c339555`. Extract reusable concepts (2-tab layout, dev mock ticket helper, lockout countdown logic). Perform clean uncommitted deletion of authorized paths only: `build.gradle`, `settings.gradle`, `gradlew`, `gradlew.bat`, `gradle/`, and root `src/`. Verify with `git status` that only these paths are removed.
- Step 1.2: Register pre-authorized dependencies:
  - Backend: `spring-boot-starter-mail` (BOM-managed) and JJWT (`jjwt-api`, `jjwt-impl`, `jjwt-jackson` @ `0.12.6`) in `backend/pom.xml`.
  - Frontend: `react-router-dom@7.18.5` in `frontend/package.json`.
- Step 1.3: Update `docs/03-version-table.md` in both English (Part 1) and Vietnamese (Part 2) sections. Synchronize `scripts/check-version-drift.mjs`. Verify `node scripts/check-version-drift.mjs` exits 0.

### Phase 2: Database Schema & Migration TDD (V3 & V4)

- Step 2.1 [RED]: Author `FlywayMigrationIntegrationTest` asserting presence of new columns on `users` (`company_id`, `must_change_password`, `failed_login_count`, `locked_until`, `status`) and tables `used_sso_tickets`, `password_reset_tokens`. Run `./mvnw test -D "test=FlywayMigrationIntegrationTest"`. Verify test fails (RED).
- Step 2.2 [GREEN]: Author `backend/src/main/resources/db/migration/V3__auth_identity_evolution.sql` with PostgreSQL 18.6 DDL, proper constraints, and B-Tree indexes. Re-run test and verify it passes (GREEN).
- Step 2.3 [RED]: Author `ProfileSeparationIntegrationTest` asserting `hr1` has `must_change_password = true` in dev profile and zero dev rows in prod profile. Verify test fails (RED).
- Step 2.4 [GREEN]: Author `backend/src/main/resources/db/migration-dev/V4__dev_seed_nt01.sql` updating `hr1` flags. Update migration count assertions (prod=2, dev=4). Verify tests pass (GREEN).
- Step 2.5 [REFACTOR]: Format SQL files with SQLFluff (`docker run --rm -v ${PWD}:/workspace sqlfluff/sqlfluff:4.5.0 lint ...`).

### Phase 3: Core Security, Deterministic Clock & Fail-Fast Validation

- Step 3.1: Define `@Bean public Clock clock() { return Clock.systemUTC(); }` in backend configuration.
- Step 3.2: Create immutable Java Record DTOs under `com.rikkei.jobs.identity.dto` (`SsoLoginRequest`, `LoginRequest`, `ChangePasswordRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`, `AuthResponse`, `UserResponse`).
- Step 3.3 [RED]: Author `ProdEnvironmentValidatorTest` asserting that running prod profile with missing or weak `JWT_SECRET` (< 32 chars or default insecure string) throws `IllegalStateException`. Verify test fails (RED).
- Step 3.4 [GREEN]: Extend `ProdEnvironmentValidator` to validate `JWT_SECRET` during `ApplicationPreparedEvent`. Verify test passes (GREEN).

### Phase 4: Backend Auth APIs & Domain Services TDD

- Step 4.1 (Password Policy & Hashing):
  - [RED]: Author unit test asserting password validation (>= 8 chars, letters and digits) and BCrypt encoding.
  - [GREEN]: Implement `PasswordValidator` and integrate with `BCryptPasswordEncoder`.
- Step 4.2 (SSO Ticket Verification):
  - [RED]: Author integration tests for `POST /api/v1/auth/sso`: valid ticket -> returns JWT + user; expired ticket (> 60s via fixed Clock) -> 401 `TICKET_EXPIRED`; reused ticket -> 401 `TICKET_ALREADY_USED`; concurrent replay -> exactly one succeeds.
  - [GREEN]: Implement `AuthService.ssoLogin()` executing atomic insert-then-verify in `used_sso_tickets` and `ExternalApiClient` call.
- Step 4.3 (HR Login & Lockout State Machine):
  - [RED]: Author integration tests for `POST /api/v1/auth/login`: valid credentials -> returns JWT + `mustChangePassword`; 5 consecutive failed attempts -> locks account for 15 minutes reporting remaining minutes; correct password during active lock rejected with 401 `ACCOUNT_LOCKED`; auto-unlock when Clock advances past 15 minutes.
  - [GREEN]: Implement `AuthService.login()` with lockout counter and Clock-driven state transitions.
- Step 4.4 (Forced Password Change Guard):
  - [RED]: Author security test asserting authenticated requests from users with `must_change_password = true` to non-whitelisted endpoints return 403 `MUST_CHANGE_PASSWORD`.
  - [GREEN]: Implement `MustChangePasswordFilter` in Spring Security filter chain with explicit allow-list (`/api/v1/auth/change-password`, `/api/v1/auth/me`).
- Step 4.5 (Change Password Endpoint):
  - [RED]: Author tests for `POST /api/v1/auth/change-password`: incorrect old password -> 400; weak new password -> 400; valid payload -> updates password hash, sets `must_change_password = false`.
  - [GREEN]: Implement `AuthService.changePassword()`.
- Step 4.6 (Forgot & Reset Password with Mailpit):
  - [RED]: Author tests for `POST /api/v1/auth/forgot-password` (anti-enumeration 200 OK, 256-bit secure token generated, SHA-256 hash stored in DB, email sent to Mailpit SMTP 1025) and `POST /api/v1/auth/reset-password` (valid token resets password, token > 30 mins -> 400 `RESET_TOKEN_EXPIRED`, reused token -> 400).
  - [GREEN]: Implement `AuthService.forgotPassword()` and `resetPassword()` integrating Spring Mail with Mailpit.
- Step 4.7 (Me Endpoint & Status Reload):
  - [RED]: Author test for `GET /api/v1/auth/me`: returns authenticated profile; if user is marked `LOCKED` in database, request rejected with 401 `ACCOUNT_LOCKED`.
  - [GREEN]: Implement `AuthController.getMe()` and finalize stateless `JwtAuthenticationFilter`.
- Step 4.8: Run full backend regression pass (`./mvnw test`). Verify all 124 existing backend tests remain green alongside new tests. Verify Spotless, SpotBugs, and zero compiler warnings (`-Xlint:all -Werror`).

### Phase 5: Frontend Identity Feature Slice & UI/UX TDD

- Step 5.1: Create `frontend/src/features/identity/` directory structure with components, pages, context, and hooks.
- Step 5.2: Implement `LoginView` with 2 tabs: "Qua LMS" (with developer mock ticket selector in dev mode only) and "Doanh nghiệp" (email + password form).
- Step 5.3: Implement `SsoCallbackView`, `ChangePasswordView`, `ForgotPasswordView`, `ResetPasswordView`, and role home placeholders (`/candidate/home`, `/hr/home`, `/mentor/home`, `/staff/home`, `/admin/home`).
- Step 5.4: Implement route guards (`RequireAuth` redirecting to `/login`, `RequireMustChangePassword` redirecting to `/change-password`).
- Step 5.5: Integrate custom 24px `<Icon />` component, bespoke palette tokens, and motion tokens supporting `prefers-reduced-motion`. Verify ZERO EMOJI across all frontend files.
- Step 5.6 [TDD]: Author Vitest component tests covering forms, validations, lockout timers, and route transitions. Verify `npm run test --prefix frontend` passes cleanly.

### Phase 6: E2E Integration, Visual Verification & Final Quality Gates

- Step 6.1: Extend `e2e/` test harness covering Acceptance Criteria 1 through 6 against a fresh Docker Compose stack (`docker compose up -d --build --wait`).
- Step 6.2: Launch application locally and perform visual verification across 4 viewports (375px, 768px, 1024px, 1440px) using Antigravity built-in browser (or containerized Playwright fallback). Capture and store screenshots under `docs/nt01/screenshots/`.
- Step 6.3: Audit UI against 12-point Anti-AI Rubric ensuring score >= 11/12 with zero vetoes.
- Step 6.4: Execute `./check.sh` and `.\check.ps1` ensuring all 25 active runtime gates exit 0 cleanly.
- Step 6.5: Author `docs/nt01/PR_DESCRIPTION.md` and package handoff report. Tear down test containers cleanly (`docker compose down -v`).

---

## 6. Invariant Operational & Engineering Checklist

- [x] Git is strictly READ-ONLY: No commit, push, stage, amend, rebase, or checkout executed by agent.
- [x] Zero Real Secrets: No secrets read, touched, or committed; `first-key.pem` untouched; teammate secrets isolated.
- [x] Mandatory Injectable Clock: All time-dependent checks driven by `java.time.Clock` with zero `Thread.sleep()`.
- [x] Zero Emoji Invariant: Zero emoji in UI, code, comments, and documentation.
- [x] Quality Gates Parity: Local runners (`check.ps1`, `check.sh`) pass with 25 active runtime gates.
- [x] Bilingual Standards: Documentation maintained bilingually where required, report in Vietnamese, proposed commit messages in English prefixed with `T022B63:`.

---

## 7. Phase 0 Again: Round B Acknowledgement & Defect Analysis

### 7.1 Context and Mandatory Re-Acknowledgement

Following the Team Lead code review on branch `feature/T022863-dang-nhap`, 8 defects and scope enhancements (designated B1 through B8) were identified. While Round A established foundational functional passes across 25 active runtime gates and 13 E2E test suites, critical discrepancies emerged between the commitments in this acknowledgement document and the resulting implementation (notably concerning production JWT secret fail-fast behavior and logging hygiene).

In accordance with `PROMPT_NT01B_EN.txt` and enterprise Rule 04, the engineering team re-reads in full:

- Enterprise Rules: `.claude/rules/03`, `07`, `09`, `13`, `15`, `16`.
- Domain & Process Skills: `security-review-checklist`, `spring-security-rbac-endpoint`, `flyway-migration-authoring`, `frontend-visual-design`, `frontend-motion-design`, `frontend-iconography`, `frontend-accessibility-audit`, `verification-before-completion`.

The team formally acknowledges and commits to the following rigorous defect analysis, architectural root causes, and verifiable remediation plans before executing any code modifications.

### 7.2 Defect B1: Production Starts Without JWT_SECRET and Uses a Public Default Secret

#### 7.2.1 Round A Defect Status

In Round A, `backend/src/main/resources/application.yml` defined `jwt.secret` with a default placeholder resolution, and `JwtService` injected `@Value("${jwt.secret:dev-secret-key-minimum-32-characters-rikkei-2026}")`. Consequently, `ProdEnvironmentValidator` evaluated the resolved property rather than the raw environment variable, considering the secret "set" even when `JWT_SECRET` was absent from the host environment.
When running with `SPRING_PROFILES_ACTIVE=prod` without `JWT_SECRET`, the application logged a false-positive pass message and continued starting. Because the repository is public, an attacker could forge administrative JWT tokens using this publicly known dev secret to gain unauthorized access on misconfigured production deployments.

#### 7.2.2 Rules and Skills Violated

- **Rule 03 (Safety, Host Boundaries & Secret Hygiene)**: Violation of "Zero real secrets in code or git diff... Production rejects any default dev credentials".
- **Rule 07 Section 4 (Security Architecture and RBAC - Fail-fast prod validation)**: Mandates that production configuration must fail fast before establishing any database connection if secrets are missing or weak.
- **Rule 15 Section 7 (Backend Observability and Operations - Config env)**: Forbids placeholder fallback defaults for sensitive cryptographic secrets in production profiles.
- **Skill `spring-security-rbac-endpoint`**: Proper configuration of cryptographic key lifecycle and JWT signing.
- **Skill `security-review-checklist`**: Violation of OWASP ASVS V2 / V14 requirements prohibiting hardcoded cryptographic keys and default credentials.
- **Skill `verification-before-completion`**: Failure to execute and document raw reproduction proof under realistic production environment isolation.

#### 7.2.3 Remediation Plan and Independent Verification

1. **Remove Fallback Defaults**:
   - Completely eliminate default secret values from `application.yml`, `JwtService`, and production compose files.
   - Development convenience secrets are restricted exclusively to `application-dev.yml` (active under profile `dev` only) and `.env.example`.
2. **Harden `ProdEnvironmentValidator`**:
   - Evaluate the actual external origin (the system environment variable `JWT_SECRET` or explicitly set property from non-default sources).
   - Reject null, empty, blank, or whitespace-only values.
   - Reject all known development/default secrets committed to repository history and known insecure lists.
   - Enforce a strict minimum length of 32 bytes (256 bits).
   - Reject low-entropy values (such as repetitive characters).
   - Guarantee fail-fast exception throwing (`IllegalStateException`) prior to any database network connection attempt (preserving the `ProdEnvironmentValidatorOrderingTest` invariant).
3. **Automated TDD Suites (Red-Green-Refactor)**:
   - Validator unit tests covering: missing variable, blank string, short string (< 32 bytes), each known default secret, low-entropy input, and cryptographically valid input.
   - Production startup integration test with missing `JWT_SECRET`: verify that Spring Context initialization fails with `IllegalStateException` and 0 socket connections are opened to the mock database port.
   - Unit test for `JwtService`: assert constructor throws `IllegalStateException` or `IllegalArgumentException` when instantiated without a secret.
4. **Independent Reproduction and Raw Output Verification**:
   - Case 1 (`JWT_SECRET` unset, prod profile): Process terminates immediately with exit code 1 and structured JSON error log describing missing mandatory secret.
   - Case 2 (`JWT_SECRET` set to known dev default, prod profile): Process terminates immediately with exit code 1 and structured JSON error log rejecting insecure secret.
   - Case 3 (`JWT_SECRET` set to valid random 32+ byte string, prod profile): Application context starts normally.
   - Grep verification command: execute `git grep -i "dev-secret" src/main` and verify 0 matching occurrences across all production backend source files.

### 7.3 Defect B2: SSO Security and Account Linking Hygiene (AuthService.ssoLogin)

#### 7.3.1 Round A Defect Status

In Round A, `AuthService.ssoLogin()` exhibited several critical architectural flaws:

- `resolveRole()` silently defaulted any unmapped or unexpected role string from the LMS verify response to `CANDIDATE`, concealing configuration errors and risking privilege anomalies.
- TTL validation failed open: if the verification payload lacked an `issuedAt` timestamp, was blank, or failed timestamp parsing, the ticket was accepted.
- Account linking was improperly governed: an SSO identity was linked to an existing local user solely based on matching email address. This enabled Account Takeover, where an LMS student could adopt and overwrite an existing enterprise HR account created with a password.
- Lack of explicit rollback behavior when an unexpected failure occurred after the ticket was recorded into `used_sso_tickets`.

#### 7.3.2 Rules and Skills Violated

- **Rule 07 (Security Architecture and RBAC)**: Strict deny-by-default, rigid 5-role enforcement, single-use ticket invariant, 60-second TTL enforcement.
- **Rule 13 Section 7 (Backend Data Access Performance - Idempotency & Concurrency)**: Data consistency and concurrency guarantees in transactional authentication operations.
- **Skill `spring-security-rbac-endpoint`**: Proper mapping and strict rejection of unauthorized or unmapped role claims.
- **Skill `security-review-checklist`**: Alignment with OWASP ASVS V2 (Authentication Architecture) and V4 (Access Control) regarding secure federated identity linking and anti-takeover hygiene.
- **Skill `external-system-integration-and-mock`**: Resilient verification of third-party identity provider payloads.

#### 7.3.3 Remediation Plan and Independent Verification

1. **Strict LMS Role Mapping**:
   - Unknown or unmapped LMS roles must be explicitly rejected with HTTP 401 or 403 and a dedicated machine-readable error code (`UNMAPPED_LMS_ROLE` / `INVALID_TICKET`).
   - Formally document the authoritative mapping table in `docs/nt01/` and `docs/05-open-business-questions.md`:
     - Student roles -> `CANDIDATE`
     - Instructor / Trainer roles -> `MENTOR`
     - Coordinator roles -> `STAFF`
     - System Administrator roles -> `ADMIN`
     - Enterprise HR roles -> Never provisioned via LMS SSO; managed exclusively via enterprise portal.
2. **Fail-Closed TTL Verification**:
   - Reject any verification response that lacks `issuedAt`, contains blank text, or cannot be parsed into an instant. A ticket without a verifiable timestamp cannot prove freshness.
3. **Secure Account Linking Policy**:
   - Link an SSO identity to a local user record strictly and exclusively by `lms_user_id`.
   - Never adopt an existing local account (such as an HR account with password credentials) merely because email strings match.
   - Never overwrite role, credentials, or profile attributes of an existing user during SSO login.
   - If an email collision occurs between an incoming LMS SSO user and a pre-existing local user with a different identity origin, reject the login attempt with an explicit error code and emit a structured, non-PII security audit log.
4. **Single-Use Guarantee and Rollback Protocol**:
   - Maintain atomic insert-then-verify in `used_sso_tickets` to eliminate race conditions.
   - If an external call or downstream processing fails after ticket insertion, the ticket remains consumed in the database to prevent replay attacks against faulty or tampered attempts.
5. **Independent Automated Test Evidence**:
   - Unit and integration tests covering every valid mock LMS role and asserting failure for unrecognized roles.
   - Test verifying rejection when `issuedAt` is missing, blank, or malformed.
   - Integration test asserting that an SSO login matching an HR account's email is rejected, preserving the HR account's role and password credentials intact.
   - Test confirming repeated SSO logins for an existing user preserve the assigned role without drift.
   - Concurrency tests confirming that concurrent requests with the identical ticket result in exactly one success and all others rejected with HTTP 401.

### 7.4 Defect B3: Logging PII/Secrets and Transaction Boundary Hygiene

#### 7.4.1 Round A Defect Status

In Round A:

- `AuthService` and `MailService` logged user email addresses, raw SSO ticket strings, and token identifiers in plaintext.
- Email dispatch (`MailService.sendPasswordResetEmail`) executed synchronously inside the `@Transactional` boundary of `forgotPassword()`. A slow or unreachable SMTP server held database connection pool resources throughout the network call, and SMTP failures caused database transaction rollbacks, leaking user account existence through varying HTTP status codes.
- A timing oracle existed in `/api/v1/auth/login` and `/api/v1/auth/forgot-password`: when an email was not found, the service returned immediately without performing cryptographic hashing, producing measurably faster response times compared to valid emails with incorrect passwords (enabling automated user enumeration).

#### 7.4.2 Rules and Skills Violated

- **Rule 15 Section 3 (Backend Observability and Operations - Secret & PII Sanitization)**: "Never log passwords, password hashes, JWT tokens, SSO tickets, or PII (emails, full names, phone numbers)".
- **Rule 13 Section 5 (Backend Data Access Performance - Transaction Boundaries)**: "Never execute external HTTP calls or email delivery inside @Transactional boundaries; use AFTER_COMMIT events".
- **Skill `security-review-checklist`**: Violation of OWASP ASVS V13 (API & Logging) and V2 (Anti-Enumeration and Timing Attack Defenses).
- **Skill `backend-persistence-performance`**: Minimizing database transaction duration and preventing connection pool exhaustion from network I/O.

#### 7.4.3 Remediation Plan and Independent Verification

1. **PII and Secret Sanitization in Logs**:
   - Replace all log occurrences of email addresses, raw tickets, and tokens with internal user IDs or cryptographic hashes/truncated identifiers (e.g. `user_id=123`, `ticket_prefix=tk_...`).
2. **Automated Log Capture Verification Suite**:
   - Construct an automated test using an in-memory `ListAppender` capturing all log output across the full authentication suite: login success, login bad password, login lockout, SSO success, SSO replay, SSO expired, forgot password, and reset password.
   - Assert with zero tolerance that no email address, ticket string, raw token, password, or BCrypt hash appears anywhere in logged events.
3. **Decouple Mail Delivery from Database Transactions**:
   - Move email dispatch out of the database transaction using Spring's `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`.
   - Ensure the database commit completes and releases the connection before initiating SMTP network communication.
   - Verify that SMTP transmission failure leaves the HTTP response at 200 OK and retains the generated reset token record validly committed in the database.
4. **Eliminate Timing Oracles via Constant-Time Dummy Hashing**:
   - When an email address is not found in `AuthService.login()`, execute a dummy BCrypt comparison against a pre-computed constant hash, ensuring CPU execution duration matches the password verification path.
   - Measure and record median execution timings across N test iterations demonstrating statistical uniformity between existing and non-existing email lookups.
5. **Document Password Length Boundaries**:
   - Enforce maximum password input length of 128 characters and explicitly document the 72-byte truncation boundary inherent to the BCrypt algorithm.

### 7.5 Defect B4: Frontend Typography Self-Hosting and JetBrains Mono

#### 7.5.1 Round A Defect Status

In Round A:

- On the `/login` view, `document.fonts` in the browser returned an empty collection.
- CSS files specified font families (`Be Vietnam Pro`, `Plus Jakarta Sans`) without hosting any `.woff2` files or declaring `@font-face` rules, resulting in the user interface rendering system fallback fonts.
- Documentation in `docs/nt01/PR_DESCRIPTION.md` contained conflicting claims of embedded fonts and misidentified the monospace font as "Fira Code" instead of the required "JetBrains Mono".

#### 7.5.2 Rules and Skills Violated

- **Rule 09 Section 3 (Frontend Design Bar - Tripartite Typography)**: Mandatory self-hosted tripartite font system: Plus Jakarta Sans (Display), Be Vietnam Pro (Text), JetBrains Mono (Code/Tabular). Absolute prohibition of runtime Google Fonts / external CDN dependencies.
- **Rule 11 (Documentation, Bilingual Standards & Linters)**: Accuracy, truthfulness, and zero discrepancies in technical documentation.
- **Skill `frontend-visual-design`**: Professional font loading architecture, layout stability, and glyph rendering.
- **Skill `frontend-accessibility-audit`**: Legibility, support for Vietnamese stacked diacritics without clipping, and tabular figures for numbers.

#### 7.5.3 Remediation Plan and Independent Verification

1. **Acquire and Self-Host OFL WOFF2 Fonts**:
   - Download official SIL Open Font License (OFL) WOFF2 font files from verified upstream repositories into OS temporary storage.
   - Store font files directly under `frontend/public/fonts/`:
     - Display: Plus Jakarta Sans
     - Text: Be Vietnam Pro
     - Monospace: JetBrains Mono
   - Declare `@font-face` definitions in CSS with `font-display: swap` and precise `unicode-range` configurations. Configure `<link rel="preload">` in `index.html` for primary body and display weights.
2. **Verify Glyph Completeness via Throwaway Docker Container**:
   - Execute an isolated verification script in a throwaway Python Docker container using Python font inspection utilities:
     - Assert that the font character map table contains every Vietnamese character (all 134 pre-composed uppercase/lowercase letters plus 5 combining diacritical marks: U+0300, U+0301, U+0303, U+0309, U+0323).
     - Assert that JetBrains Mono contains tabular figure glyphs.
     - Print raw container terminal output and record results. Clean up temporary files immediately.
3. **License Attribution and Checksum Registration**:
   - Record upstream source URLs, versions, license texts, and SHA-256 checksums in `docs/` (bilingual English and Vietnamese) and `THIRD_PARTY_NOTICES`.
   - Ensure the attribution for Be Vietnam Pro strictly matches upstream requirements: "The Be Vietnam Pro Project Authors".
4. **Real Browser Font Verification**:
   - Using the Antigravity built-in browser, verify via console execution that `document.fonts.check()` returns `true` and `document.fonts` contains all 3 families loaded.
   - Verify that complex Vietnamese test strings containing stacked accents (e.g. "Tuyển dụng kỹ sư công nghệ chất lượng cao") render cleanly without clipping or baseline shifts.
5. **Documentation Reconciliation**:
   - Replace all occurrences of "Fira Code" in `PR_DESCRIPTION.md` with "JetBrains Mono".

### 7.6 Defect B5: Frontend Auth Redesign, Motion Suite and Anti-AI Standards

#### 7.6.1 Round A Defect Status

In Round A:

- Screenshots revealed a generic centered white card with rounded corners floating on an empty light background (the canonical "AI template").
- The interface displayed a developer pill badge labeled "RIKKEI JOBS MONOREPO", leaking internal repository jargon into end-user UI.
- The screens lacked asymmetric editorial balance, signature brand visuals, purposeful motion, and authentic Vietnamese recruitment copy.
- This triggered Rule 09's Hard Veto clause (any Anti-AI rubric criterion scoring 0 rejects the entire delivery).

#### 7.6.2 Rules and Skills Violated

- **Rule 09 (Frontend Design Bar & Anti-AI Standards)**: 65/35 asymmetric editorial layout, bespoke SVG/CSS signature visuals, role-specific information density, authentic Vietnamese copy, zero emoji, zero stock illustrations.
- **Rule 08 (Frontend Engineering Standards)**: Full compliance with WCAG 2.2 AA accessibility, keyboard navigation, and `aria-live` announcements.
- **Skills**: `frontend-visual-design`, `frontend-motion-design`, `frontend-iconography`, `frontend-accessibility-audit`.

#### 7.6.3 Remediation Plan and Independent Verification

1. **Asymmetric Editorial Redesign**:
   - Redesign `/login`, `/sso-callback`, `/change-password`, `/forgot-password`, `/reset-password/:token`, and role-home shells.
   - **Desktop**: 65/35 grid with a signature brand storytelling panel featuring an interactive SVG/CSS verification visual (e.g. Hexagonal Competency Radar / Verification Seal; zero stock packs or AI vector assets), paired with an authentic recruitment form. Eliminate "MONOREPO", placeholder filler, and emoji.
   - **Mobile**: Purposefully designed single-column flow with minimum 44px touch targets; not a shrunken desktop card.
   - **Dark Mode**: Purposefully crafted dark palette following `prefers-color-scheme`.
2. **Purposeful Motion Suite**:
   - Implement orchestrated entrance choreography, shared-element tab transition indicator, stateful micro-interactions on inputs (focus, loading spinner, success; shake-free error states), SSO callback progress indicator, lockout countdown timer, View Transitions API route transitions, and skeleton loaders.
   - Strictly honor `prefers-reduced-motion` with 100ms subtle opacity cross-fades or 0.001ms duration.
   - Animate compositor-only properties (`transform`, `opacity`) keeping Cumulative Layout Shift (CLS) at 0, within Rule 09 budgets (<= 150ms micro, <= 300ms layout).
3. **Custom Iconography**:
   - Exclusively use the custom `<Icon />` registry built on a 24px grid with 2px stroke width. Zero emoji across all views.
4. **Independent Rubric and WCAG Scoring**:
   - Score the implementation against the 6-criterion Anti-AI rubric in `frontend-visual-design`, targeting >= 11/12 points with zero vetoes.
   - Execute automated accessibility tests verifying contrast ratios, keyboard focus rings (3:1 minimum contrast), and `aria-live` announcements for dynamic errors and lockout countdowns.

### 7.7 Defect B6: Screenshots Recapture with scrollWidth <= innerWidth Assertion

#### 7.7.1 Round A Defect Status

In Round A:

- The screenshot `docs/nt01/screenshots/login_enterprise_375.png` showed the login container clipped at the right viewport boundary.
- When measured by the Team Lead on a real 375px viewport, `scrollWidth` equaled 375px (no horizontal overflow), demonstrating that the screenshot capture harness used flawed viewport emulation, yielding misleading PR evidence.

#### 7.7.2 Rules and Skills Violated

- **Rule 04 (Honest Verification & Quality Gates)**: Absolute mandate for truthful, verifiable, reproducible evidence before making claims.
- **Rule 09 (Frontend Design Bar)**: Viewport integrity without unintended horizontal scrolling (`scrollWidth <= innerWidth`).
- **Skills**: `frontend-visual-design`, `verification-before-completion`.

#### 7.7.3 Remediation Plan and Independent Verification

1. **Browser Harness with Viewport Assertions**:
   - Utilize Antigravity's built-in browser with verified device emulation.
   - For EVERY captured screenshot, execute an in-page JavaScript assertion:
     `document.documentElement.scrollWidth <= window.innerWidth`
     and log the evaluated dimensions (e.g. `scrollWidth: 375, innerWidth: 375, overflow: false`).
2. **Comprehensive Viewport Matrix**:
   - Recapture all views across 4 standard viewports: 375px (Mobile), 768px (Tablet), 1024px (Laptop), 1440px (Desktop).
   - Cover all functional states: LMS login tab, Enterprise login tab, lockout countdown, validation error, loading spinner, change-password, forgot-password, reset-password, SSO callback progress, and role-home shells.
   - Capture each state in both Light Mode and Dark Mode under the new Brand Red palette (B8).
3. **Screenshot Gallery Index**:
   - Delete obsolete Round A screenshots.
   - Establish a standardized naming convention and author `docs/nt01/screenshots/README.md` cataloging each image file, viewport dimensions, evaluated `scrollWidth`, and verification proof.
4. **Runtime Observation Log**:
   - Record console error count (must be 0), failed network requests (0), CLS metric (0), and keyboard navigation flow during walkthrough.

### 7.8 Defect B7: Safety, Cleanup, Consistency, and Zero Lint Defects

#### 7.8.1 Round A Defect Status

In Round A:

- The execution left the Docker Compose container stack and persistent volumes running in the background.
- Discrepancies existed between document references and actual file paths (e.g. referencing `V4__dev_seed_auth_update.sql` instead of `V4__dev_seed_nt01.sql`, and `V3__evolve_users_and_add_auth_tables.sql` instead of `V3__auth_identity_evolution.sql`).
- Potential risk of storing credential or secret strings in internal agent notes.

#### 7.8.2 Rules and Skills Violated

- **Rule 03 (Safety, Host Boundaries & Secret Hygiene)**: Ephemeral container teardown, strict prohibition of `scripts/run-ci-in-docker.*`, Git read-only discipline, zero real secrets in documentation or notes.
- **Rule 11 (Documentation, Bilingual Standards & Linters)**: Document-code synchronization, zero version drift, clean markdownlint, zero cspell issues with no inline ignores.
- **Rule 12 (Continuous Integration and Quality Gates)**: Absolute parity between local runners and CI quality gates.
- **Skills**: `ci-local-and-debug`, `docs-bilingual-update`, `handoff-to-team-lead`.

#### 7.8.3 Remediation Plan and Independent Verification

1. **Clean Host Teardown**:
   - Conclude verification by running `docker compose down -v`.
   - Execute `docker ps -a` proving that zero `rikkei*` containers or dangling volumes remain.
   - Maintain strict prohibition against executing `scripts/run-ci-in-docker.*`.
2. **Credential and Secret Sanitization**:
   - Zero secrets or credentials written to notes, briefing, or handoff files.
3. **Documentation File Path Reconciliation**:
   - Synchronize all occurrences of migration file names across documentation:
     - `V4__dev_seed_nt01.sql` (verified on disk in `backend/src/main/resources/db/migration-dev/`).
     - `V3__auth_identity_evolution.sql` (verified on disk in `backend/src/main/resources/db/migration/`).
4. **Honest PR Description**:
   - Update `docs/nt01/PR_DESCRIPTION.md` with accurate claims, verified acceptance matrix results, documented limitations (e.g. in-memory token storage causing logout on page refresh, justified by OWASP ASVS XSS mitigation), and open business questions.
5. **Zero-Defect Linter Verification**:
   - Verify that all linters pass cleanly with 0 issues without loosening any rules:
     - `npx --yes "markdownlint-cli2@0.24.0"`
     - `npx --yes --package "cspell@10.4.1" --package "@cspell/dict-vi-vn@3.0.7" cspell` (no inline ignores)
     - `node scripts/check-version-drift.mjs`
     - `node scripts/check-gate-sync.mjs`
     - `node scripts/sync-agent-config.mjs --check`
     - `node scripts/validate-agent-config.mjs`

### 7.9 Defect B8: Brand Red UI Palette and Semantic Collision Resolution

#### 7.9.1 Round A Defect Status

In Round A:

- The frontend UI utilized the "Technical Iron Cobalt" (#132F52) navy and "Cyber Persimmon" (#D9480F) palette.
- User requirements mandate transitioning the entire user interface to a **Brand Red** color scheme as the dominant theme across all pages.
- Risk of semantic collision: red is universally associated with danger and error states; using red as the primary brand color risks severe user confusion if brand accents and error alerts are not distinctly differentiated.

#### 7.9.2 Rules and Skills Violated

- **Rule 09 (Frontend Design Bar)**: Definition of an ownable, proprietary brand palette that is not a generic framework default red (e.g. Tailwind `red-500` / Material red).
- **Rule 08 (Frontend Engineering Standards)**: Strict WCAG 2.2 AA contrast compliance (minimum 4.5:1 for normal text, 3:1 for large text / UI components / focus rings).
- **Skills**: `frontend-visual-design`, `frontend-accessibility-audit`.

#### 7.9.3 Remediation Plan and Independent Verification

1. **Proprietary Brand Red Palette Architecture**:
   - Ground the red identity in Rikkei Education brand heritage, reflecting energy, academic rigor, and recruitment trust.
   - Avoid generic gaming or emergency banner aesthetics.
   - Architect a multi-tonal red family: Deep Red, Core Red, Bright Red, Red Tint, paired with warm neutrals, off-white card backgrounds, and deep ink typography.
2. **Semantic Collision Resolution**:
   - Establish chromatic differentiation: brand red is warm (slight orange/amber undertone), whereas error red is cool/vibrant (shifted toward crimson/magenta).
   - Enforce mandatory non-color cues for all error states:
     - Every error must include an error icon, explicit explanatory text, and distinctive border styling.
     - Brand red is NEVER used as an indicator of failure.
     - Distinct visual styles for warning (amber), success (emerald), and informational (sapphire) states.
   - Verify distinction via color-blindness simulation (Protanopia and Deuteranopia) and delta-E chromatic distance calculations.
3. **Mathematical Contrast Verification**:
   - Execute an automated script evaluating every foreground/background pair in Light Mode and Dark Mode against WCAG 2.2 AA standards (normal text >= 4.5:1, buttons and interactive controls >= 3:1). Print raw contrast ratios.
4. **Canonical Configuration Synchronization**:
   - Update canonical sources under `agent-config/` (Rule 09, visual-design, iconography, accessibility skills, rubric text).
   - Execute `node scripts/sync-agent-config.mjs` to synchronize `.claude` and `.gemini` mirrors.
   - Verify `node scripts/sync-agent-config.mjs --check` and `node scripts/validate-agent-config.mjs` exit 0.
5. **Implementation in Design Tokens and Components**:
   - Apply CSS tokens in `frontend/src/shared/styles/design-tokens.css` for light and dark modes.
   - Update `docs/design/DESIGN_SYSTEM.md` in both English and Vietnamese with token definitions, contrast matrices, and rationale.
   - Verify visual harmony across role-home shells, Header, ModuleCard, and HealthBadge components.
   - Recapture all screenshots (B6) reflecting the new Brand Red aesthetic.

---

## 8. Phase 0 Again: Round C Acknowledgement & Defect Analysis (Defects C0–C6)

### 8.1 Context and Mandatory Re-Acknowledgement

Following the Team Lead review of Round B on branch `feature/T022863-dang-nhap`, 7 specific defects and scope adjustments (designated C0 through C6) were identified. While Round B successfully validated all core functional tests (prod fail-fast for 5 bad JWT_SECRET cases, 266 backend tests, e2e 17/17, check.sh and check.ps1 25/25, acceptance criteria 1-6, timing ratio 1.07, fonts loaded, 100 screenshots with `scrollWidth <= innerWidth`), the user issued a definitive design change overriding the Round B red palette in favor of a blue-led interface, alongside requirements for authentic UI copy, contrast formula reproducibility, documentation hygiene, and backend code clean-up.

In strict compliance with `PROMPT_NT01C_EN.txt` and enterprise Rule 04, the engineering team has re-opened and re-read in full:

1. Root Agent Configurations: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`.
2. Enterprise Rules (`.claude/rules/`): All 16 rules (`01-project-context` through `16-backend-integrations`).
3. Domain & Process Skills (`.claude/skills/`): All 26 skills listed in Phase 0 of `PROMPT_NT01_EN.txt`, particularly `frontend-visual-design`, `frontend-motion-design`, `frontend-iconography`, `frontend-accessibility-audit`, `security-review-checklist`, `verification-before-completion`, `test-driven-development`, `spring-security-rbac-endpoint`, `docs-bilingual-update`, `ci-local-and-debug`.
4. Architectural & Specification Documents:
   - `docs/design/DESIGN_SYSTEM.md` (Design tokens, contrast tables, typography, anti-AI standards)
   - `docs/conventions.md` (REST API conventions, RBAC roles, 20 skills catalogue, error format)
   - `docs/mock-contract.md` (LMS SSO verification contract, mock endpoints, ticket TTL)
   - `docs/05-open-business-questions.md` (Business questions log, role mapping, ticket lifecycle)
   - `docs/nt01/PHASE0_ACK.md` (Authoritative acknowledgement document, Round A and Round B records)
   - `PROMPT_NT01C_EN.txt` and `PROMPT_NT01C_VI.txt` (Authoritative task specifications for Round C)

The engineering team commits to the following concrete constraints, conflict resolutions, and defect remediation plans prior to executing any file modification.

### 8.2 Concrete Applicable Constraints for 16 Enterprise Rules (Round C)

| Rule | Rule Name | Concrete Applicable Constraint for Round C |
|---|---|---|
| Rule 01 | Project Context & Monorepo Overview | Giao diện frontend quay lại chủ đạo màu xanh (Blue-dominant); giữ nguyên kiến trúc 5 vai trò (CANDIDATE, HR, MENTOR, STAFF, ADMIN), 20 kỹ năng chuẩn và 4 bậc năng lực; mọi số liệu và tuyên bố trên giao diện đăng nhập (`AuthEditorialLayout.tsx`, `CompetencyRadarVisual.tsx`) phải xuất phát tuyệt đối từ tài liệu chuẩn của dự án (5 roles, 20 skills, 4 competency bands, SSO ticket TTL 60s theo Rule 01); nghiêm cấm sử dụng các con số marketing không kiểm chứng được ("500+ doanh nghiệp", "100% đồ án thực chiến") nhằm thoả mãn lỗi C2. |
| Rule 02 | Git Workflow & Agent Read-Only Mandate | Agent tuyệt đối không chạy lệnh Git làm thay đổi trạng thái (không commit, push, stage, rebase, reset, stash, checkout); mọi thay đổi để ở trạng thái uncommitted; mọi kiểm tra deliberate break test cho C1 (validator scan emoji) và C3 (contrast calculation script) phải thực hiện sao lưu vào OS temp, so sánh mã băm SHA-256 trước/sau đột biến; và các đề xuất commit phải bằng tiếng Anh với tiền tố `T022B63:`. |
| Rule 03 | Safety, Host Boundaries & Secret Hygiene | Không đọc, ghi, copy file bí mật (`.env`, `*.pem`, `first-key.pem`), không ghi chuỗi secret trong log hay ghi chú hay `.agents/teamwork`; sau khi hoàn tất phải chạy `docker compose down -v` và kiểm tra `docker ps -a`, `docker volume ls` sạch sẽ 100%; cấm chạy `scripts/run-ci-in-docker.*`. |
| Rule 04 | Honest Verification & Quality Gates | Mọi khẳng định PASS phải có output thô từ terminal; các bài break-test cho C1 (emoji) và C3 (tương phản) phải chứng minh thực tế việc FAIL trước khi PASS; không fake số liệu contrast hay screenshot; đo lường `scrollWidth <= innerWidth` trên trình duyệt thật; mọi kết quả chạy 25+ quality gates tại C6 phải được ghi nhận nguyên văn. |
| Rule 05 | Java 25 & Spring Boot 4 Backend Standards | `AuthService` phải dùng tiêm phụ thuộc bắt buộc qua constructor (mandatory dependencies), loại bỏ hoàn toàn các null-guard fallbacks (`if (eventPublisher != null)` hoặc `if (ssoTicketService != null)`); biên dịch không cảnh báo (`-Xlint:all -Werror`), tuân thủ Spotless AOSP và pass SpotBugs. |
| Rule 06 | Database Migrations and Flyway Discipline | Không sửa đổi hay xóa các migration Flyway V1, V2, V3, V4 hiện có; bảo đảm tính bất biến của schema CSDL PostgreSQL 18.6 và tính tương thích giữa prod và dev profiles; thực hiện chính sách tiêu thụ vé SSO (ticket burning ở C5) dựa trên schema bảng `used_sso_tickets` sẵn có trong một transaction tách biệt. |
| Rule 07 | Security Architecture and RBAC | Vé SSO phải bị tiêu thụ (burn-on-attempt) trong giao dịch độc lập trước khi gọi xác thực LMS, bảo đảm fail-secure khi xảy ra lỗi (404, hết hạn, unmapped role, email collision); thông báo lỗi `UnmappedRoleException` phải được làm sạch, loại bỏ ký tự điều khiển và giới hạn độ dài <= 64 ký tự để ngăn chặn log injection. |
| Rule 08 | Frontend Engineering Standards | Triển khai toàn bộ màu sắc thông qua design tokens ngữ nghĩa trong `design-tokens.css`, không dùng mã hex cứng ngoài file token; tuân thủ strict TypeScript (zero `any`, zero `@ts-ignore`); không chứa ký tự emoji nào trong `frontend/src` (kể cả test); vượt qua `npm run typecheck` và `npm run test` tuyệt đối. |
| Rule 09 | Frontend Design Bar & Anti-AI Standards | Palette chủ đạo màu xanh bespoke (không dùng xanh mặc định của Tailwind/Material như #3B82F6, #0B57D0); thay thế triệt để hệ màu đỏ Round B (legacy); màu lỗi đỏ/magenta tách biệt rõ với màu thương hiệu kèm tín hiệu phi màu sắc (icon, viền, chữ); tuyệt đối zero emoji; đạt điểm Anti-AI Rubric >= 11/12 không điểm 0. |
| Rule 10 | Testing Strategy and Quality Assurance | Áp dụng TDD Red-Green-Refactor cho các thay đổi backend (ticket burn on error, role sanitization, mandatory beans) và frontend (authentic copy); giữ toàn bộ 266+ backend tests và 17 e2e suites xanh; không dùng `Thread.sleep()`; thời gian phụ thuộc vào `Clock` được tiêm. |
| Rule 11 | Documentation, Bilingual Standards & Linters | Cập nhật tài liệu song ngữ chuẩn xác trong `docs/design/DESIGN_SYSTEM.md` (sửa bảng tương phản và ví dụ navy #132F52 ở cả 2 ngôn ngữ); xóa sạch emoji trong `docs/nt01/PR_DESCRIPTION.md`; ghi nhận minh bạch nguồn gốc thương hiệu theo C4; bảo đảm markdownlint và cspell đạt 0 lỗi mà không dùng inline ignore. |
| Rule 12 | Continuous Integration and Quality Gates | Nối `scripts/compute-contrast.mjs` vào `check.sh`, `check.ps1`, `ci.yml` và văn bản harness docker như một gate độc lập; cập nhật `scripts/check-gate-sync.mjs` để số lượng gate đồng nhất 100% trên mọi runner (26 active gates). |
| Rule 13 | Backend Data Access Performance | Email khôi phục mật khẩu chỉ được gửi qua listener `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`, tuyệt đối không gửi mail hay gọi HTTP bên trong giao dịch CSDL; tiêu thụ vé SSO trong transaction riêng ngắn gọn trước khi gọi HTTP sang hệ thống LMS. |
| Rule 14 | Backend Module Boundaries | Giữ ranh giới module identity, không tạo quan hệ khoá ngoại vật lý hay join trực tiếp với bảng của các module khác; giao tiếp liên module qua Java record sự kiện bất biến và `ApplicationEventPublisher`. |
| Rule 15 | Backend Observability and Operations | Không log PII hay chuỗi đầu vào không tin cậy; dữ liệu role từ LMS trong `UnmappedRoleException` phải được strip ký tự điều khiển và giới hạn độ dài trước khi log hoặc trả về exception message; Actuator health endpoint không làm rò rỉ thông tin nội bộ. |
| Rule 16 | Backend Integrations | Xây dựng script `scripts/compute-contrast.mjs` ở C3 hoàn toàn bằng thư viện chuẩn của Node.js với zero external npm dependencies; gọi mock LMS qua `ExternalApiClient` với header `X-Service-Key`; xử lý kiểm thử email qua Mailpit SMTP trên cổng 1025/8025 via AFTER_COMMIT. |

### 8.3 Concrete Applicable Constraints for Domain & Process Skills (Round C)

#### 8.3.1 Core Phase 0 Skills Constraints

| STT | Kỹ năng (Skill) | Ràng buộc cụ thể áp dụng cho Round C | Khuyết tật liên quan | Phương pháp kiểm chứng |
|---|---|---|---|---|
| 1 | `frontend-visual-design` | Phải thay thế hoàn toàn bộ token màu đỏ Round B bằng họ màu xanh chủ đạo (Blue-dominant) có bản sắc riêng (không dùng màu mặc định Tailwind/Material như #3B82F6), giữ nguyên bố cục editorial bất đối xứng 60/40, cập nhật các tệp skill/rule tương ứng dưới `agent-config/`, giữ trạng thái ERROR nghiêng đỏ/magenta kèm tín hiệu phi màu sắc, và chụp lại 100% ảnh màn hình trên 4 viewport (375/768/1024/1440) chứng minh `scrollWidth <= innerWidth` và đạt điểm Anti-AI rubric >= 11/12 (không có điểm 0). | C0, C2, C4 | Chạy `node scripts/sync-agent-config.mjs --check`, `node scripts/validate-agent-config.mjs`, grep xác nhận không còn từ khóa cũ trên toàn bộ repo, và kiểm tra thư mục ảnh màn hình kèm bảng điểm rubric. |
| 2 | `frontend-motion-design` | Khi áp dụng hệ token màu xanh mới và tinh chỉnh các tương tác giao diện (tab LMS/Doanh nghiệp, micro-interaction form, radar visual), toàn bộ chuyển động phải duy trì tuyệt đối tiêu chuẩn Compositor-Only (`transform`, `opacity`, `CLS = 0`), tuân thủ ngân sách thời gian (micro-interaction <= 150ms, dialog <= 300ms, route <= 400ms), và bắt buộc hỗ trợ `@media (prefers-reduced-motion: reduce)` với 100ms cross-fade kèm thời lượng `0.001ms` (không dùng `0s`). | C0 | Kiểm tra các file CSS và component React (Vite build, Vitest) xác nhận không có reflow properties được animate và CSS media query đúng chuẩn `0.001ms`. |
| 3 | `frontend-iconography` | 100% biểu tượng trên UI (đặc biệt là các tín hiệu phi màu sắc để phân biệt trạng thái Info/Brand Blue và Error/Magenta tại C0, và các icon điều hướng sạch emoji tại C1/C2) bắt buộc phải render qua component `<Icon name=... />` với canvas chuẩn `viewBox="0 0 24 24"`, `stroke-width="2"`, `stroke="currentColor"`, kế thừa màu từ design tokens (tuyệt đối không chứa mã màu hex cứng trong SVG), và tuyệt đối cấm dùng emoji hoặc thẻ `<svg>` nhúng trực tiếp trong các slice. | C0, C1, C2 | Chạy `npm --prefix frontend run test` cho `Icon.test.tsx`, grep kiểm tra không có thẻ `<svg>` inline ngoài thư mục Icon component, và scan không có emoji trong `frontend/src`. |
| 4 | `frontend-accessibility-audit` | Toàn bộ các cặp tương phản giữa màu chữ và màu nền theo hệ màu xanh mới (C0) và trong các bảng token tại `docs/design/DESIGN_SYSTEM.md` (C3) phải được tính toán cơ học theo chuẩn WCAG 2.2 Relative Luminance đạt ngưỡng tối thiểu 4.5:1 (text thường) và 3.0:1 (text lớn/UI) ở cả hai chế độ Light và Dark, xác thực tự động bởi script `scripts/compute-contrast.mjs`, đồng thời duy trì touch target >= 44x44px trên mobile và viền focus `:focus-visible` tương phản >= 3.0:1. | C0, C3 | Chạy lệnh `node scripts/compute-contrast.mjs` đạt exit code 0 với số thực tế in ra không lệch quá 0.01 so với bảng đặc tả, kèm break-test chứng minh script thoát 1 khi sửa lệch 1 mã hex. |
| 5 | `security-review-checklist` | Tại C5, cơ chế xác thực SSO và quản lý tài khoản phải tuân thủ tuyệt đối nguyên tắc Fail-Secure và OWASP ASVS: vé SSO phải được tiêu thụ và ghi vào bảng `used_sso_tickets` trong một transaction riêng biệt TRƯỚC KHI tiến hành xác thực từ xa (đảm bảo vé bị cháy ngay cả khi LMS trả về 404, lỗi mạng, role không hợp lệ, hoặc hết hạn để chống replay attack); chuỗi vai trò (`role`) không tin cậy từ payload LMS phải được làm sạch (strip ký tự điều khiển và giới hạn độ dài an toàn) trước khi truyền vào `UnmappedRoleException` và ghi log; đồng thời email quên mật khẩu chỉ được gửi qua `@TransactionalEventListener(phase = AFTER_COMMIT)`. | C5, C6 | Chạy test tích hợp backend kiểm chứng cả vé bị đốt khi LMS mock gặp lỗi, kiểm tra test sanitization cho chuỗi LMS role xấu, và grep chứng minh không có secret bị ghi trong ghi chú hay repo. |
| 6 | `verification-before-completion` | Tuyệt đối cấm công bố hoàn thành mà không có bằng chứng thực thi thực tế với exit code 0 trong phiên hiện tại; bắt buộc phải thực thi và trích xuất output thô của cả `powershell -File .\check.ps1` và `./check.sh` với số lượng gate đồng nhất (sau khi nối thêm gate `compute-contrast.mjs`), chứng minh bằng break-test có backup temp cho C1 (emoji scanner) và C3 (contrast script), kiểm tra toàn bộ 266+ backend test và e2e test xanh trên stack mới, và chạy `docker compose down -v` chứng minh `docker ps -a` và `docker volume ls` sạch hoàn toàn không còn container/volume rikkei. | C1, C3, C6 | Chạy đầy đủ `check.ps1` / `check.sh`, ghi lại console log thô, và thực thi `docker ps -a`, `docker volume ls` để kiểm tra tính sạch sẽ của môi trường. |
| 7 | `test-driven-development` | Mọi thay đổi logic mã nguồn tại C5 (loại bỏ constructor phụ truyền null, loại bỏ nhánh `else if (mailService != null)` trong `forgotPassword`, đốt vé SSO trong transaction riêng, và làm sạch dữ liệu role LMS) cũng như cập nhật số liệu copy tại C2 phải viết test trước (RED) để tái hiện khuyết tật, quan sát test fail đúng lý do thiếu logic, sau đó mới viết mã sản phẩm tối thiểu (GREEN), sử dụng `Clock` tiêm vào cho logic thời gian và cấm dùng `Thread.sleep()` hay làm yếu assertion. | C2, C5 | Chạy các test case đơn vị JUnit 5 / Vitest tương ứng ở trạng thái RED trước khi sửa mã, sau đó chạy lại ở trạng thái GREEN và kiểm tra formatting Spotless/Prettier. |
| 8 | `spring-security-rbac-endpoint` | Bảo vệ nghiêm ngặt kiến trúc Deny-by-Default và ma trận phân quyền 5 vai trò hệ thống (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`); tại C5, `AuthService` phải xử lý danh tính từ token/SSO an toàn, từ chối mọi vai trò LMS ngoài ma trận 5 vai trò sau khi đã sanitize chuỗi đầu vào, yêu cầu xác thực qua `SecurityFilterChain`, và bộ lọc `MUST_CHANGE_PASSWORD` trả về HTTP 403 cho mọi route ngoại trừ các route được phép (change-password, me) theo đúng đặc tả. | C5 | Chạy `@WebMvcTest` và test tích hợp bảo mật cho endpoint auth và SSO, kiểm tra các ca ma trận vai trò và trạng thái 403 khi chưa đổi mật khẩu. |
| 9 | `docs-bilingual-update` | Toàn bộ các sửa đổi tài liệu tại Round C (cập nhật bảng token hệ màu xanh trong `docs/design/DESIGN_SYSTEM.md` cho C0, các tỷ lệ tương phản chuẩn cho cả phần tiếng Anh và bản dịch tiếng Việt tại C3 kèm sửa ví dụ navy cũ `#132F52`, bổ sung nghiên cứu nhận diện Rikkei Education tại C4, và tài liệu hóa chính sách cháy vé SSO tại C5) phải đảm bảo tính đối xứng 1:1 tuyệt đối giữa Part 1 và Part 2, không gây version drift qua `check-version-drift.mjs`, không có emoji, và sạch 0 lỗi khi kiểm tra bởi `markdownlint-cli2` và `cspell`. | C0, C1, C3, C4, C5 | Chạy `node scripts/check-version-drift.mjs`, `npx markdownlint-cli2 "**/*.md"`, và `npx cspell "**/*.md"`, xác nhận tất cả đều đạt exit code 0 với 0 lỗi và không dùng ignore nội tuyến. |

#### 8.3.2 Full 26 Domain & Process Skills Inventory

| Skill | Skill Name | Concrete Applicable Constraint for Round C |
|---|---|---|
| Skill 01 | using-rikkei-skills | Áp dụng thứ tự ưu tiên tối cao: User/Team Lead Prompt > Rules 01-16 > Skills; kích hoạt skills theo đúng quy trình workflow. |
| Skill 02 | brainstorming-before-building | Phân tích kiến trúc họ màu xanh bespoke (navy, core cobalt, bright, tint) và giải pháp làm sạch đầu vào LMS trước khi can thiệp code. |
| Skill 03 | writing-implementation-plans | Lập kế hoạch chi tiết cho các defect C0-C6 theo thứ tự milestone rõ ràng, có lệnh kiểm thử và phương án rollback an toàn. |
| Skill 04 | executing-plans | Thực hiện tuần tự từng bước trong kế hoạch, duy trì liveness heartbeat trong `progress.md` mỗi 5 phút. |
| Skill 05 | test-driven-development | Viết test trước (RED) cho cơ chế cháy vé SSO khi LMS lỗi và làm sạch role input trong `UnmappedRoleException` trước khi sửa code sản phẩm (GREEN). |
| Skill 06 | systematic-debugging | Điều tra chính xác nguyên nhân sai lệch tương phản trong `DESIGN_SYSTEM.md` và vị trí emoji vi phạm bằng regex và thuật toán toán học chuẩn. |
| Skill 07 | verification-before-completion | Chạy toàn bộ các gate và test suites (`check.ps1`, `check.sh`, `mvnw test`, vitest, e2e) và xuất output thô trước khi báo cáo hoàn thành. |
| Skill 08 | requesting-code-review | Tự rà soát toàn bộ diff uncommitted, kiểm tra thang Anti-AI Rubric >= 11/12 và chuẩn bị bằng chứng xác minh. |
| Skill 09 | receiving-code-review | Tiếp thu phản hồi review của Team Lead về các lỗi C0-C6 và chuyển hóa thành các test case kiểm chứng cụ thể. |
| Skill 10 | handoff-to-team-lead | Cung cấp báo cáo handoff chi tiết bằng tiếng Việt, liệt kê danh sách file thay đổi và các đề xuất commit tiếng Anh có tiền tố `T022B63:`. |
| Skill 11 | backend-module-feature | Tuân thủ mô hình Controller-Service-Repository trong module identity, sử dụng Java records cho DTO và xóa bỏ null-guard fallbacks. |
| Skill 12 | backend-persistence-performance | Giữ transaction ngắn, tiêu thụ vé SSO trong transaction độc lập và gửi email sau khi transaction commit. |
| Skill 13 | backend-module-boundaries | Duy trì tính đóng gói dữ liệu của identity, không tạo foreign key vật lý hay cross-module join. |
| Skill 14 | module-domain-knowledge | Khai thác đúng các giá trị nghiệp vụ chuẩn (5 vai trò, 20 kỹ năng, 4 bậc năng lực, TTL vé SSO 60s) cho copy giao diện và tài liệu. |
| Skill 15 | flyway-migration-authoring | Bảo toàn các script migration hiện hữu (V1-V4), không sửa đổi lịch sử migration CSDL. |
| Skill 16 | spring-security-rbac-endpoint | Cấu hình phân quyền endpoint xác thực và xử lý ngoại lệ bảo mật chuẩn xác với mã lỗi thống nhất. |
| Skill 17 | api-contract-and-errors | Trả về `ErrorResponse` chuẩn `{code, message}` tiếng Việt, không làm lộ stack trace hay dữ liệu thô chưa lọc. |
| Skill 18 | external-system-integration-and-mock | Gọi mock LMS qua `ExternalApiClient` với timeout 5000ms và xử lý ngoại lệ 404/503 một cách an toàn (fail-secure). |
| Skill 19 | security-review-checklist | Tuân thủ OWASP ASVS về quản lý định danh liên kết, cơ chế chống replay vé SSO và chống log injection / CRLF injection. |
| Skill 20 | frontend-feature-slice | Quản lý các view và component trong `frontend/src/features/identity` theo cấu trúc feature slice chuẩn. |
| Skill 21 | frontend-visual-design | Thiết kế họ màu xanh bespoke độc quyền (navy, core cobalt, bright, tint), giữ nguyên bố cục biên tập 65/35 và đồ họa radar. |
| Skill 22 | frontend-motion-design | Duy trì hệ thống chuyển động compositor-only trong ngân sách <= 150ms và hỗ trợ hoàn hảo `prefers-reduced-motion`. |
| Skill 23 | frontend-iconography | Sử dụng 100% component `<Icon />` chuẩn 24px nét 2px, tuyệt đối không dùng emoji trên giao diện và tài liệu. |
| Skill 24 | frontend-accessibility-audit | Kiểm toán độ tương phản WCAG 2.2 AA, đảm bảo tỷ lệ >= 4.5:1 cho text và >= 3.0:1 cho UI/viền, duy trì non-color cues cho trạng thái lỗi. |
| Skill 25 | docs-bilingual-update | Cập nhật đồng bộ các bảng tương phản và tài liệu thiết kế song ngữ trong `DESIGN_SYSTEM.md` và `docs/nt01/`. |
| Skill 26 | ci-local-and-debug | Tích hợp script kiểm tra tương phản vào gate runners, dọn dẹp sạch sẽ tài nguyên docker compose khi kết thúc. |

### 8.4 Defect Analysis & Action Plan (Defects C0–C6)

#### 8.4.1 Defect C0: Palette Direction Change (Blue-Led Frontend)

- Defect Status: Người dùng quyết định giao diện quay lại chủ đạo màu xanh thay thế hệ màu đỏ của Round B.
- Rules & Skills Touched:
  - Rules: Rule 09 (Frontend Design Bar), Rule 08 (Frontend Engineering), Rule 04 (Honest Verification), Rule 11 (Docs Bilingual), Rule 12 (CI Gates).
  - Skills: `frontend-visual-design`, `frontend-accessibility-audit`, `frontend-iconography`, `verification-before-completion`, `docs-bilingual-update`.
- Remediation Plan:
  1. Sử dụng hướng Technical Iron Cobalt (từ `git show HEAD:docs/design/DESIGN_SYSTEM.md`) làm điểm xuất phát, tinh chỉnh thành họ màu xanh bespoke (Deep Navy, Core Cobalt, Bright Blue, Blue Tint, Cool/Neutral Surfaces và Ink) có cá tính riêng cho sản phẩm giáo dục + tuyển dụng.
  2. Màu ngữ nghĩa: Trạng thái lỗi (ERROR) giữ nguyên sắc đỏ/magenta tách biệt rõ với màu xanh thương hiệu, bắt buộc có non-color cues (icon alert-circle, text giải thích, kiểu viền); info phân biệt rõ với brand blue bằng icon và hình dạng; kiểm tra bằng browser color-blindness simulation.
  3. Cập nhật tokens: `design-tokens.css` (light và dark, không hardcode hex), identity feature styles, role-home shells, App shell, Header/ModuleCard/HealthBadge, SVG radar, `DESIGN_SYSTEM.md` (bilingual), `docs/nt01/*.md`, và `agent-config` (rule 09, visual-design, iconography, accessibility, rubric).
  4. Đồng bộ `agent-config`: chạy `node scripts/sync-agent-config.mjs`, kiểm tra `--check` và `validate-agent-config.mjs` pass.
  5. Xóa sạch mọi vết tích palette cũ và red brand tokens (grep proof).
  6. Tính lại toàn bộ cặp tương phản bằng script C3 cho light và dark (in số thô).
  7. Chụp lại toàn bộ ảnh (375, 768, 1024, 1440, light + dark) với `scrollWidth <= innerWidth` proof, cập nhật README index, xóa ảnh cũ, chấm lại Anti-AI rubric >= 11/12 (không điểm 0).
- Independent Verification Method:
  - Grep proof: `git grep -i "crimson"` và `git grep -i "sovereign"` trả về 0 kết quả trên toàn bộ repo.
  - `node scripts/sync-agent-config.mjs --check` và `node scripts/validate-agent-config.mjs` exit 0.
  - `node scripts/compute-contrast.mjs` in ra toàn bộ số thô đạt chuẩn WCAG 2.2 AA (text >= 4.5:1, UI >= 3.0:1).
  - Assertion `scrollWidth <= innerWidth` trên 100% ảnh chụp màn hình trình duyệt thật.

#### 8.4.2 Defect C1: Emoji in Documentation and Code

- Defect Status: `docs/nt01/PR_DESCRIPTION.md` còn chứa 2 emoji biểu tượng bàn tay chỉ ngón (dòng 191-192). Script `validate-agent-config.mjs` chưa quét `docs/nt01` và các file markdown dưới `docs/`.
- Rules & Skills Touched:
  - Rules: Rule 09 (Zero Emoji Invariant), Rule 04 (Honest Verification), Rule 11 (Documentation Hygiene).
  - Skills: `ci-local-and-debug`, `verification-before-completion`, `systematic-debugging`.
- Remediation Plan:
  1. Xóa 2 emoji pointing-hand tại `docs/nt01/PR_DESCRIPTION.md:191-192`.
  2. Mở rộng Check 3 trong `scripts/validate-agent-config.mjs` để quét đệ quy `docs/nt01/**` và toàn bộ markdown trong `docs/`, ghi rõ phạm vi trong console output.
  3. Thực hiện break-test: sao lưu tạm ra OS temp, tính sha256, chèn emoji vào `docs/nt01`, chứng minh validator FAIL (exit 1), hoàn tác từ bản sao lưu và chứng minh validator PASS (exit 0).
  4. Quét toàn bộ `frontend/src` (kể cả test) tìm emoji và lập báo cáo.
- Independent Verification Method:
  - `node scripts/validate-agent-config.mjs` exit 0 với báo cáo không chứa emoji trên toàn bộ `docs/nt01` và `docs/`.
  - Break-test raw terminal output: hiển thị rõ file vi phạm, dòng, cột khi chèn emoji và exit 0 khi hoàn tác.
  - Regex scan `frontend/src`: `git grep -P "[\\x{1F300}-\\x{1F9FF}]" frontend/src` trả về 0 kết quả.

#### 8.4.3 Defect C2: Authentic Login UI Copy

- Defect Status: Màn hình đăng nhập hiển thị các số liệu marketing không có nguồn kiểm chứng ("500+ doanh nghiệp", "100% đồ án thực chiến", "mạng lưới hơn 500 doanh nghiệp đối tác") trong `AuthEditorialLayout.tsx` và `CompetencyRadarVisual.tsx`.
- Rules & Skills Touched:
  - Rules: Rule 01 (Project Context), Rule 04 (Honest Verification), Rule 08 (Frontend Engineering), Rule 09 (Prohibition P-AI-08), Rule 10 (Testing Strategy).
  - Skills: `frontend-visual-design`, `module-domain-knowledge`, `test-driven-development`, `verification-before-completion`.
- Remediation Plan:
  1. Thay thế các số liệu chưa kiểm chứng bằng các dữ kiện kỹ thuật có nguồn gốc từ tài liệu đặc tả miền: thời hạn vé SSO 60 giây (`docs/mock-contract.md` §1.3), 5 vai trò hệ thống (`docs/conventions.md` §2), 20 kỹ năng chuẩn (`docs/conventions.md` §5.1), 4 bậc năng lực chuẩn (`docs/conventions.md` §5.2), hoặc copy quy trình trung tính không số liệu.
  2. Mỗi con số hiển thị phải có chú thích code dẫn nguồn file trong `docs/` hoặc ghi nhận trong `docs/nt01/README.md`.
  3. Rà soát tất cả các trang vai trò (role homes) tìm các tuyên bố chưa kiểm chứng và hiệu chỉnh.
  4. Cập nhật các bài test Vitest frontend liên quan và chụp lại các ảnh bị ảnh hưởng.
- Independent Verification Method:
  - Grep kiểm tra `frontend/src` không còn "500+" hay "100% đồ án thực chiến".
  - Bảng đối soát nguồn (Traceability Matrix) trong `docs/nt01/README.md` dẫn chứng chính xác từng con số tới `docs/conventions.md` và `docs/mock-contract.md`.
  - `npm run test --prefix frontend` pass 100% với các assertion mới.

#### 8.4.4 Defect C3: Contrast Table Verification Script (docs/design/DESIGN_SYSTEM.md)

- Defect Status: 7 hàng trong bảng tương phản `DESIGN_SYSTEM.md` lệch quá 0.02 so với tỷ lệ tính toán thực tế; ví dụ navy cũ (#132F52) vẫn còn sót lại quanh dòng 93-100; thiếu script tự động hóa kiểm tra tính tái tạo của bảng.
- Rules & Skills Touched:
  - Rules: Rule 04 (Honest Verification), Rule 08 (Frontend Standards), Rule 09 (Design Bar), Rule 11 (Bilingual Docs), Rule 12 (CI & Quality Gates).
  - Skills: `ci-local-and-debug`, `frontend-accessibility-audit`, `verification-before-completion`, `docs-bilingual-update`.
- Remediation Plan:
  1. Xây dựng script `scripts/compute-contrast.mjs` (Node.js thuần, zero dependencies) bóc tách các bảng trong `DESIGN_SYSTEM.md` (cặp hex, tỷ lệ in, ngưỡng), tính toán độ chói tương đối theo chuẩn WCAG 2.2 sRGB, exit 1 nếu bất kỳ cặp nào dưới ngưỡng hoặc lệch quá 0.01 so với tỷ lệ in; in toàn bộ số thô ra terminal.
  2. Sửa các số liệu tỷ lệ tương phản và chữ PASS/FAIL trong bảng `DESIGN_SYSTEM.md` ở cả hai ngôn ngữ; sửa ví dụ navy cũ #132F52 quanh dòng 93-100.
  3. Nối `scripts/compute-contrast.mjs` vào `check.sh`, `check.ps1`, `.github/workflows/ci.yml` và `scripts/run-ci-in-docker.*` như một gate kiểm định chất lượng; cập nhật `scripts/check-gate-sync.mjs` bảo đảm số lượng gate khớp tuyệt đối trên mọi môi trường.
  4. Thực hiện break-test: thay đổi 1 mã hex trong bảng `DESIGN_SYSTEM.md`, chứng minh script FAIL, hoàn tác và chứng minh script PASS.
- Independent Verification Method:
  - `node scripts/compute-contrast.mjs` exit 0, in toàn bộ các cặp tương phản với độ lệch <= 0.01 và 100% đạt chuẩn WCAG 2.2 AA.
  - `node scripts/check-gate-sync.mjs` exit 0, xác nhận 100% gate đồng bộ.
  - Break-test raw terminal output: hiển thị lỗi sai lệch tỷ lệ khi đổi hex và exit 0 khi hoàn tác.

#### 8.4.5 Defect C4: Brand Identity Documentation

- Defect Status: `DESIGN_SYSTEM.md` khẳng định bảng màu "lấy cảm hứng từ nhận diện thương hiệu Rikkei Education" nhưng thiếu nguồn trích dẫn; cần làm rõ mối quan hệ giữa nhận diện thực tế và quyết định dùng màu xanh của người dùng.
- Rules & Skills Touched:
  - Rules: Rule 04 (Honest Verification), Rule 09 (Brand Persona), Rule 11 (Documentation Integrity).
  - Skills: `frontend-visual-design`, `docs-bilingual-update`, `verification-before-completion`.
- Remediation Plan:
  1. Nghiên cứu (web search chỉ đọc) màu sắc và logo công khai của Rikkei Education (trang web chính thức, press kit, mạng xã hội); ghi lại URL, ngày truy cập và kết quả quan sát vào `DESIGN_SYSTEM.md` và `docs/nt01/README.md`.
  2. Tuân thủ quyết định của người dùng là chủ đạo XANH (C0) và là quyết định tối cao; không chuyển UI về lại đỏ.
  3. Ghi một đoạn trung thực phân tích độ lệch: nếu nhận diện công khai của Rikkei Education là đỏ/cam, ghi nhận rõ ràng đây là quyết định kiến trúc có chủ đích của người dùng nhằm phục vụ đặc thù sản phẩm đào tạo + tuyển dụng công nghệ cao; nếu không xác minh được, loại bỏ tuyên bố "lấy cảm hứng từ".
  4. Bảo đảm tính phân tách giữa màu xanh thương hiệu và màu đỏ lỗi (kiểm tra lại bằng script C3).
- Independent Verification Method:
  - Đoạn văn trung thực trong `docs/design/DESIGN_SYSTEM.md` và `docs/nt01/README.md` có đầy đủ URL, ngày tháng, và phân tích độ lệch hợp lý.
  - `node scripts/compute-contrast.mjs` pass 100%.

#### 8.4.6 Defect C5: Code Clean-Up in AuthService

- Defect Status: `forgotPassword` còn chứa nhánh rẽ null-guard (`if (eventPublisher != null) ... else if (mailService != null)`) gửi mail trực tiếp trong transaction; `ssoTicketService` còn dùng null-guard; chính sách cháy vé SSO chưa được tài liệu hóa và test đầy đủ; `UnmappedRoleException` phản chiếu nguyên văn dữ liệu LMS chưa lọc.
- Rules & Skills Touched:
  - Rules: Rule 05 (Java Backend Standards), Rule 07 (Security & RBAC), Rule 10 (Testing Strategy), Rule 13 (Transaction Boundaries), Rule 15 (Observability & Logging Sanitization), Rule 16 (Backend Integrations).
  - Skills: `spring-security-rbac-endpoint`, `backend-module-feature`, `security-review-checklist`, `test-driven-development`.
- Remediation Plan:
  1. Loại bỏ toàn bộ null-guard fallbacks trong `AuthService` (cả `eventPublisher`, `mailService`, `ssoTicketService`); bắt buộc tiêm phụ thuộc qua constructor; cập nhật các bài test để tiêm test double phù hợp. Bảo đảm email chỉ được phát đi qua listener `AFTER_COMMIT`.
  2. Tài liệu hóa chính sách cháy vé SSO trong `docs/nt01` và Javadoc của `ssoLogin`: vé được tiêu thụ trong transaction riêng trước khi gọi xác thực LMS, do đó các lần thử thất bại hoặc bị từ chối (LMS 404, hết hạn, unmapped role, trùng email, LMS sự cố) đều làm cháy vé (fail-secure); bổ sung bài test xác nhận vé bị cháy khi LMS 404 hoặc lỗi.
  3. Làm sạch dữ liệu đầu vào trong `UnmappedRoleException`: loại bỏ ký tự điều khiển (CRLF, tab, ký tự non-printable) và giới hạn độ dài tối đa (ví dụ 64 ký tự) trước khi gắn vào thông báo ngoại lệ hoặc ghi log; viết bài test kiểm chứng.
- Independent Verification Method:
  - Code review inspection: không còn bất kỳ dòng `if (... != null)` mang tính fallback trong `AuthService.java`.
  - Unit/Integration test `AuthServiceTest`: kiểm chứng email chỉ dispatch qua `eventPublisher`, vé SSO bị tiêu thụ ngay cả khi LMS trả về 404.
  - `UnmappedRoleExceptionTest`: kiểm chứng chuỗi role chứa `\r\n` và độ dài > 100 ký tự được làm sạch và cắt ngắn an toàn.
  - `./mvnw test` pass 100% với 266+ tests.

#### 8.4.7 Defect C6: Clean-Up, Verification, and Reporting

- Defect Status: Cần bảo đảm môi trường host sạch sẽ sau khi kiểm thử (`docker compose down -v`), không sót container hay volume; không lưu trữ secret trong ghi chú; tái kiểm tra toàn bộ chất lượng với số liệu thô.
- Rules & Skills Touched:
  - Rules: Rule 02 (Git Read-Only & Commit Prefix), Rule 03 (Host Boundaries & Clean Teardown), Rule 04 (Honest Verification), Rule 10 (Testing), Rule 11 (Linters), Rule 12 (Gate Parity).
  - Skills: `ci-local-and-debug`, `verification-before-completion`, `handoff-to-team-lead`.
- Remediation Plan:
  1. Chạy `docker compose down -v` khi hoàn tất kiểm thử, kiểm tra `docker ps -a` và `docker volume ls` xác nhận không còn tài nguyên rikkei.
  2. Tuyệt đối không chạy `scripts/run-ci-in-docker.*`.
  3. Không ghi giá trị secret hoặc credential vào ghi chú hoặc tài liệu.
  4. Chạy lại toàn bộ kiểm định chất lượng với output thô: markdownlint, cspell (0 lỗi, không inline ignores), yamllint, actionlint, check-version-drift, check-gate-sync, sync-agent-config --check, validate-agent-config, `./check.sh` và `.\check.ps1` (số gate giống hệt nhau), backend tests (266+), frontend tests, và e2e suite trên stack mới.
  5. Lập báo cáo cuối cùng bằng tiếng Việt theo các mục C0-C6 kèm bằng chứng thô, danh sách file thay đổi, và các đề xuất commit nhỏ bằng tiếng Anh có tiền tố `T022B63:`. Để toàn bộ thay đổi ở trạng thái uncommitted.
- Independent Verification Method:
  - `docker ps -a` và `docker volume ls` trả về rỗng đối với tài nguyên rikkei.
  - `check.ps1` và `check.sh` hoàn thành 100% gates với exit code 0.
  - `git status` xác nhận nhánh sạch và toàn bộ thay đổi chưa commit.

### 8.5 Identified Conflicts, Ambiguities & Authoritative Resolution (Round C)

Thực hiện nghiêm ngặt thứ tự quyền hạn:
User / Team Lead Prompt (`PROMPT_NT01C_EN.txt`) > Enterprise Rules (`.claude/rules/`) > Domain Skills

| # | Xung đột / Điểm Mơ hồ | Nguồn Xung đột | Hướng Giải quyết Theo Thứ tự Quyền hạn |
|---|---|---|---|
| 1 | Định hướng màu sắc giao diện (Đỏ vs Xanh) | Round B và Rule 09 quy định hệ màu đỏ Round B. Prompt NT-01C chỉ định người dùng quyết định đổi sang giao diện chủ đạo MÀU XANH. | Prompt của User/Team Lead có quyền hạn tối cao: Giao diện chuyển sang chủ đạo màu xanh bespoke (không dùng xanh mặc định của framework); Rule 09 và các skill visual design được đồng bộ lại qua `sync-agent-config.mjs`. |
| 2 | Nhận diện thương hiệu công khai vs Quyết định Palette của Người dùng | Nhận diện công khai của Rikkei Education có thể thiên về đỏ/cam, trong khi người dùng quyết định màu xanh. | Prompt có quyền hạn tối cao: Quyết định màu xanh của người dùng là quyết định kiến trúc cuối cùng. Tài liệu ghi nhận trung thực độ lệch này mà không nguỵ tạo nhận diện, đồng thời giữ nguyên màu xanh. |
| 3 | Chạy script kiểm thử Docker CI (`scripts/run-ci-in-docker.*`) | Rule 12 và skill `ci-local-and-debug` nhắc tới việc chạy script harness Docker. | Prompt quy định rõ: CẤM chạy `scripts/run-ci-in-docker.*` vì script này xóa mất stack dev cục bộ. Tiến hành kiểm tra bằng `check.ps1` / `check.sh` và e2e trên compose stack riêng. |
| 4 | Bổ sung script tương phản C3 và số lượng Quality Gates | Hiện tại `check.sh` / `check.ps1` có 25 active gates. Script `compute-contrast.mjs` tạo thêm 1 gate mới. | Cập nhật đồng bộ `check.sh`, `check.ps1`, `ci.yml`, `scripts/run-ci-in-docker.sh` và `scripts/check-gate-sync.mjs` để toàn bộ các bộ chạy đều thống nhất một số lượng gate mới (26 active gates). |
| 5 | Thời điểm tiêu thụ vé SSO khi LMS gặp lỗi | `docs/mock-contract.md` quy định mock không chặn vé; thông thường vé có thể chỉ được ghi nhận khi xác thực thành công. | Prompt C5 quy định: Vé SSO phải được tiêu thụ trong giao dịch riêng TRƯỚC KHI gọi LMS xác thực, nhằm bảo đảm fail-secure (cháy vé ngay cả khi LMS 404, unmapped role, email collision). |
| 6 | Chi tiết thông báo lỗi vs Làm sạch đầu vào không tin cậy | `ErrorResponse` yêu cầu thông báo lỗi chi tiết, nhưng đầu vào role từ LMS có thể chứa ký tự điều khiển hoặc payload độc hại. | Prompt C5 quy định: Thông báo lỗi `UnmappedRoleException` bắt buộc phải làm sạch (loại bỏ ký tự điều khiển, giới hạn độ dài) trước khi xuất ra thông báo hoặc log. |

### 8.6 Invariant Operational & Engineering Checklist (Round C)

- [ ] Giai đoạn 0 hoàn tất trước: Đã đọc lại 16 rules, 26 skills, các file đặc tả; mục Round C trong `PHASE0_ACK.md` đã được cập nhật trước khi can thiệp code.
- [ ] Git ở trạng thái READ-ONLY: Không chạy commit, push, stage, rebase, reset, stash, checkout; mọi thay đổi để uncommitted.
- [ ] Không có Secret: Không đọc, ghi hoặc commit file bí mật; `first-key.pem` không bị chạm tới; zero secret trong ghi chú.
- [ ] Palette chủ đạo Xanh (C0): Thay thế hoàn toàn hệ màu đỏ cũ; màu lỗi đỏ/magenta có non-color cues; `sync-agent-config` đồng bộ 100%; rubric >= 11/12 không điểm 0.
- [ ] Zero Emoji Invariant (C1): Không còn emoji trong `PR_DESCRIPTION.md` và `frontend/src`; validator quét `docs/nt01`; break-test được chứng minh.
- [ ] Copy Chân thực (C2): Không còn số liệu marketing bịa đặt; 100% con số hiển thị truy vết được về tài liệu `docs/conventions.md` và `mock-contract.md`.
- [ ] Script Tương phản C3: `scripts/compute-contrast.mjs` hoạt động chuẩn xác, sai lệch <= 0.01; nối vào 26 gates đồng bộ; break-test được chứng minh; sửa ví dụ navy cũ.
- [ ] Nguồn Thương hiệu C4: Trích dẫn URL + ngày kiểm tra nhận diện công khai; đoạn phân tích độ lệch trung thực; contrast duy trì hợp lệ.
- [ ] Vệ sinh AuthService C5: Không còn null-guards; mail chỉ gửi `AFTER_COMMIT`; chính sách cháy vé được tài liệu hóa và có test; role input được làm sạch và có test.
- [ ] Dọn dẹp & Xác minh Toàn diện C6: `docker compose down -v` sạch sẽ; toàn bộ test backend (266+), frontend, e2e và 26 quality gates xanh 100%; báo cáo cuối cùng bằng tiếng Việt với commit prefix `T022B63:`.

---

## 9. Phase 0 Again: Round D Acknowledgement & Defect Analysis (Defects D1–D3)

### 9.1 Context and Mandatory Re-Acknowledgement

Following the Team Lead review of Round C on branch `feature/T022863-dang-nhap`, 3 specific clean-up items and regression verifications (designated D1 through D3) were identified prior to final commit:

1. Complete removal of a teammate's leaked JWT secret string from all 4 codebase locations (which is publicly visible) and verification across tracked and untracked files.
2. Tidying `cspell.json` by removing the secret whitelist, concatenated meaningless syllable fragments, and unneeded alphabet entries while maintaining HEAD `ignorePaths`.
3. Complete regression execution across all quality gates, suites, and Docker environment teardown with zero regressions.

In strict compliance with `PROMPT_NT01D_EN.txt`, `ORIGINAL_REQUEST.md`, and enterprise Rule 04, the engineering team has re-opened and re-read in full:

1. Root Agent Configuration: `CLAUDE.md`.
2. Enterprise Rules (`.claude/rules/`):
   - `03-safety-and-secrets.md` (Zero real secrets policy, filesystem bounds, host protection)
   - `07-security-rbac.md` (Deny-by-default, 5 system roles, fail-fast production environment validation)
   - `11-docs-and-bilingual.md` (Bilingual standards, zero version drift in docs/03, markdownlint, cspell)
   - `15-backend-observability-ops.md` (ECS structured JSON logging, secret sanitization, minimal actuator)
   - `16-backend-integrations.md` (Mailpit 1025/8025, OpenAPI 3, ExternalApiClient, dependency governance)
3. Domain & Verification Skills (`.claude/skills/`):
   - `security-review-checklist/SKILL.md` (OWASP ASVS alignment, secret leak audits, fail-fast CORS/JWT checks)
   - `verification-before-completion/SKILL.md` (Empirical verification, full gate execution, raw output evidence)
4. Reference Specifications: `PROMPT_NT01D_EN.txt`, `ORIGINAL_REQUEST.md`, and binding sections R0/1 of `PROMPT_NT01_EN.txt`.

### 9.2 Concrete Applicable Constraints for Round D Rules & Skills

| Document / Skill | Exact Applicable Constraint for Round D |
|---|---|
| Rule 03 (Safety & Secrets) | "Never write, print, quote, or reference the teammate's leaked secret string in notes, reports, logs, commit proposals, or handoffs (not even partially); strictly preserve the 7 untracked helper files; never run scripts/run-ci-in-docker.*; and execute clean teardown via docker compose down -v." |
| Rule 07 (Security & RBAC) | "ProdEnvironmentValidator must maintain strict fail-fast validation in production for missing, blank, short (< 32 bytes), low entropy, and repo-shipped default values, but must NOT blocklist rotated third-party secrets; secrets leaked externally must be rotated by their owner rather than hardcoded in source." |
| Rule 11 (Docs & Linters) | "Maintain zero documentation defects: cspell.json must be tidied with 0 issues without inline cspell:ignore comments; HEAD ignorePaths must remain strictly unchanged; all reports and explanations must be documented in clear Vietnamese with zero emoji." |
| Rule 15 (Observability & Ops) | "In production startup validation (including the 3 packaged jar verification scenarios), error outputs must conform to structured ECS JSON logging and fail-fast with exit code 1 without leaking internal stack traces or connecting to database sockets." |
| Rule 16 (Integrations) | "No new third-party dependencies may be added to backend, frontend, or mock manifests; local email delivery remains hermetically bound to Mailpit (1025/8025) and mock LMS calls via ExternalApiClient." |
| Skill `security-review-checklist` | "Prove zero occurrences of the teammate's secret across 100% of the repository tree (tracked AND untracked files, excluding .agents/) using a split regex pattern so the inspection command itself does not contain the leaked secret." |
| Skill `verification-before-completion` | "Execute and present raw terminal evidence for all project test suites and quality gates in the current session: check.ps1 and check.sh (identical 26/26 count without path conversion override), backend tests, frontend tests (76/76), contrast script (48/48), e2e suites (17/17), and verified Docker teardown." |

### 9.3 Defect Remediation & Proof Methodology for Round D

#### 9.3.1 Defect D1: Remove Teammate Leaked JWT Secret

- Remediation Plan:
  1. Remove the leaked secret entry from `ProdEnvironmentValidator.java` line 65 (within `INSECURE_DEFAULT_VALUES`).
  2. Remove both entries (PascalCase and lowercase) from `Milestone2AdversarialStressTest.java` lines 231 and 236.
  3. Remove the entry from `ProdEnvironmentValidatorTest.java` line 75.
  4. Remove the whitelisted secret word from `cspell.json` line 153.
  5. Remove any leftover probe files containing the string (`temp_cspell_probe.json`).
  6. Adjust test cases to verify rejection of committed dev defaults using only values that this repository itself ships (such as in `application-dev.yml` and `.env.example`), and test synthetic values for short/low-entropy checks.
- Independent Verification Method:
  - Repository-wide split regex scan: verify zero occurrences of the removed secret across all files returning exit code 1 (0 results).
  - Packaged JAR Prod Verification:
    - Case 1 (JWT_SECRET unset): `java -Dspring.profiles.active=prod -jar backend/target/rikkei-jobs-backend-1.0.0-SNAPSHOT.jar` -> Exit code 1 with JSON error log.
    - Case 2 (JWT_SECRET set to repo dev default): Exit code 1 with JSON error log indicating insecure default.
    - Case 3 (JWT_SECRET set to valid 32+ byte string): Validator PASSED and proceeds with application initialization.

#### 9.3.2 Defect D2: Tidy cspell.json

- Remediation Plan:
  1. Remove the secret entry (D1).
  2. Remove meaningless concatenated syllable fragments.
  3. Audit the two Vietnamese alphabet strings (lines 187-188) against `M1SanitizationAdversarialTest.java:385-386`: verify whether raw cspell without them flags an error; keep them only if strictly required.
  4. Verify that `ignorePaths` matches `HEAD:cspell.json` exactly.
  5. Ensure zero inline `cspell:ignore` comments in modified files.
- Independent Verification Method:
  - Run `npx --yes --package "cspell@10.4.1" --package "@cspell/dict-vi-vn@3.0.7" cspell "**/*.{md,java,ts,tsx,js,mjs,sql,yml,json,jsonc}"` -> Returns exit code 0 with 0 errors across all checked files.
  - Present the minimal diff of `cspell.json` against HEAD in the final report.

#### 9.3.3 Defect D3: Quality Gates, Regressions & Docker Teardown

- Remediation Plan:
  1. Re-run all backend tests (`./mvnw clean test`), frontend tests (`npm test` in frontend), markdownlint, cspell, version drift, gate sync, agent config checks, contrast verification (48/48), and local runners (`./check.sh` and `.\check.ps1` with 26/26 gates).
  2. Launch clean Docker stack via `docker compose up -d --build --wait` and execute `node e2e/run-all.mjs` verifying all 17/17 opaque-box test suites pass across 4 tiers.
  3. Execute `docker compose down -v` and verify with `docker ps -a` and `docker volume ls` that no container or volume with prefix `rikkei-*` remains.
  4. Strictly preserve the 7 untracked helper files: `scripts/capture-nt01-screenshots.mjs`, `scripts/run-e2e-tests.mjs`, `scripts/verify-probe8-fonts.py`, `scripts/verify-probes-5-6-7.mjs`, `scripts/verify-responsive-empirical.mjs`, `scripts/verify-responsive-results.json`, `docs/nt01/FINAL_REPORT_ROUND_C.md`.
  5. Leave all changes uncommitted with zero state-changing git commands.
- Independent Verification Method:
  - `check.ps1` and `check.sh` both output 26/26 PASS.
  - `docker ps -a` and `docker volume ls` show zero rikkei resources.
  - Raw terminal output captured for all suites.

---

## 10. Phase 0 Again: Round D2 Acknowledgement (Leaked Database Password Removal)

### 10.1 Inventory of Authoritative Files Re-Read

1. Root Agent Configuration: CLAUDE.md
2. Enterprise Rules (.claude/rules/):
   - 03-safety-and-secrets.md (Zero real secrets policy, writable filesystem bounds, host protection)
   - 07-security-rbac.md (Deny-by-default, 5 roles, fail-fast production environment validation)
   - 11-docs-and-bilingual.md (Bilingual documentation, zero version drift in docs/03, markdownlint, cspell)
3. Domain & Verification Skills (.claude/skills/):
   - security-review-checklist/SKILL.md (OWASP ASVS alignment, secret leak audits, fail-fast validation)
   - verification-before-completion/SKILL.md (Empirical verification, full gate execution, raw output evidence)

### 10.2 Concrete Applicable Constraints (One per Rule / Skill)

- Rule 03 (Safety, Host Boundaries & Secret Hygiene): Never commit, stage, print, log, or reference real database passwords or secrets in notes, reports, commit proposals, or test names (not even partially); all secret pattern scans must use split fragments to prevent the search command itself from containing the leaked string.
- Rule 07 (Security Architecture and RBAC): ProdEnvironmentValidator must fail fast in production for missing, blank, short, low-entropy, and repo-shipped default values without keeping leaked third-party or teammate personal credentials in the codebase blocklist.
- Rule 11 (Documentation, Bilingual Standards, and Linters): Maintain zero documentation defects, ensure clean markdownlint and cspell with 0 issues and zero inline ignore comments, and write all reports and explanations in clear Vietnamese without emoji.
- Skill security-review-checklist: Prove zero occurrences of the teammate's leaked database password and JWT secret across the whole tree (tracked and untracked, excluding .agents/) using split fragment search patterns.
- Skill verification-before-completion: Run all quality gates and tests in the current session and provide raw command outputs: check.ps1 and check.sh (26/26 gates identical without path conversion overrides), backend tests, contrast checks (48/48), e2e tests (17 suites / 213 cases), and verify clean Docker teardown (docker compose down -v).

### 10.3 Defect Remediation and Proof Methodology

#### 10.3.1 Defect Remediation Plan

1. Remove the teammate's leaked database password entry from INSECURE_DEFAULT_VALUES (line 62) in backend/src/main/java/com/rikkei/jobs/common/config/ProdEnvironmentValidator.java without replacing it with another real credential.
2. Keep every other entry and all validator behaviour intact.
3. Scan the whole tree (tracked and untracked, excluding .agents/) to prove zero occurrences of the password string in any case.
4. Confirm zero occurrences of the teammate's JWT secret from Round D across the entire tree.
5. Re-run the 3 production validation cases with the packaged jar: missing JWT_SECRET exits 1 with JSON error, repo-shipped default exits 1 with JSON error, and valid secret shows validator PASSED.
6. Re-run all validation gates and suites (check.ps1, check.sh, backend tests, markdownlint, cspell, contrast, e2e) and tear down Docker stack completely.

#### 10.3.2 Proof Methodology

- Repository-wide split regex scan showing 0 matches across tracked and untracked files.
- Raw terminal output of packaged jar prod execution for all 3 scenarios.
- Raw terminal output of check.sh / check.ps1 (26/26), backend tests, cspell, and e2e run.
- Verification that docker compose down -v leaves no rikkei containers or volumes.

---

## 11. Phase 0 Again: Round E Acknowledgement (Colour and Comfort Redesign of the Login/Identity UI)

### 11.1 Inventory of Authoritative Files Re-Read

Prior to making any edits in Round E, the engineering team has re-read and audited the following authoritative project files:

1. User Request and Mandate:
   - D:\GitHub\Rikkei\.agents\teamwork\ORIGINAL_REQUEST.md (User feedback: pale/washed out UI, eye strain in light and dark mode, 60/40 separation failure, official brand mark handover).
   - D:\GitHub\Rikkei\.agents\PROMPT_NT01_EN.txt (Sections R0/1 binding rules, precedence order, bans, delivery gates).
2. Root Entrypoints and Agent Configurations:
   - CLAUDE.md (Root Claude Code configuration, architectural bounds, zero uncommitted states, forbidden git operations).
   - GEMINI.md (Root Gemini CLI and Antigravity directive imports, tool configurations, skill mirrors).
   - AGENTS.md (Canonical agent instructions, architectural rules, skills invocation discipline).
3. All 16 Enterprise Rules (.claude/rules/):
   - 01-project-context.md (System identity, 5 roles, 20 skills framework, Blue-dominant product decision).
   - 02-git-and-delivery.md (Strict uncommitted working tree, no state-changing git commands, T022B63: prefix commit proposals).
   - 03-safety-and-secrets.md (Zero secrets policy, read-only bounds for .agents, project-documents, .vscode, first-key.pem).
   - 04-honest-verification.md (Empirical verification, raw command outputs, gate synchronization).
   - 05-backend-java.md (Java 25 LTS, Spring Boot 4.1.2, modular monolith preservation, zero compiler warnings).
   - 06-database-flyway.md (PostgreSQL 18.6 Flyway migrations immutability, immutable V1-V4 scripts).
   - 07-security-rbac.md (Deny-by-default, stateless JWT, single-use SSO TTL 60s, lockout, CSRF protection).
   - 08-frontend-engineering.md (React 19, strict TypeScript, design-tokens.css single source of truth, zero hardcoded hex).
   - 09-frontend-design-bar.md (Bespoke palette, self-hosted typography, custom Icon component, Anti-AI rubric >= 11/12, zero emoji).
   - 10-testing-strategy.md (Hermetic testing, Red-Green-Refactor, BrandMark unit tests, zero sleep calls).
   - 11-docs-and-bilingual.md (Bilingual documentation, zero version drift, zero inline cspell ignores, zero emoji).
   - 12-ci-and-quality-gates.md (26 active runtime gates parity across check.sh, check.ps1, and CI workflows).
   - 13-backend-data-access-performance.md (open-in-view=false, N+1 query prevention, indexing invariants).
   - 14-backend-module-boundaries.md (Identity module domain isolation, scalar cross-boundary identifiers).
   - 15-backend-observability-ops.md (ECS JSON structured logging, credential masking, production startup validation).
   - 16-backend-integrations.md (Mailpit port 1025/8025, OpenAPI 3.2.0, ExternalApiClient mock LMS integration).
4. Task Skills and References (.claude/skills/):
   - frontend-visual-design/SKILL.md (Surface ladder design, APCA contrast, Anti-AI rubric, screenshot protocol).
   - frontend-motion-design/SKILL.md (Compositor-only transforms/opacity, prefers-reduced-motion 0.001ms duration).
   - frontend-iconography/SKILL.md (Monoline SVG icons, zero emoji, custom BrandMark vector rendering).
   - frontend-accessibility-audit/SKILL.md (WCAG 2.2 AA / APCA Lc compliance, color blindness simulation, focus indicators).
   - security-review-checklist/SKILL.md (Authentic asset SHA-256 verification, CSP compliance, secret hygiene).
   - verification-before-completion/SKILL.md (26 runtime quality gates execution, raw terminal logs, Docker clean teardown).
   - docs-bilingual-update/SKILL.md (Parallel English and Vietnamese documentation synchronization).
5. Project Specifications and System Documentation:
   - docs/design/DESIGN_SYSTEM.md (Comprehensive design token specification, contrast matrices, typography, layout geometry).
   - docs/nt01/README.md (Task documentation, architecture overview, comfort checklist, brand mark notes).
   - docs/nt01/PR_DESCRIPTION.md (Verified claims, test execution logs, uncommitted change manifest).
   - docs/nt01/PHASE0_ACK.md (Phase 0 acknowledgement history and binding commitments).
6. Implementation Source Files:
   - frontend/src/shared/styles/design-tokens.css (Primitive, semantic, and component tokens for light and dark modes).
   - frontend/src/features/identity/components/AuthEditorialLayout.tsx & identity.css (60/40 asymmetric layout, panel styling).
   - frontend/src/features/identity/components/CompetencyRadarVisual.tsx (Radar SVG geometry, strokes, fills, and labels).
   - frontend/src/shared/components/Header.tsx (Header branding and logo integration).
   - frontend/src/features/identity/pages/role-homes/RoleHomeLayout.tsx (Role portal shell layouts).
   - scripts/compute-contrast.mjs (Automated WCAG 2.2 luminance and contrast ratio calculation engine).
7. Specialized Explorer Investigation Reports:
   - .agents/teamwork/teamwork_explorer_survey_e1/handoff.md (Comprehensive Color, Surface Ladder & Visual Ergonomics Research).
   - .agents/teamwork/teamwork_explorer_survey_e3/handoff.md (Governance QA, Measurement & Synchronization Exploration).
8. Official Brand Assets (Read-Only Source):
   - Tài liệu dự án/favicon.svg (333 bytes, SHA-256: 3FDE006C20CE49E8D28B78DC0ED4AA9DD4921F7E157185E43DC64F27D855ED20).
   - Tài liệu dự án/favicon.png (2,031 bytes, 100x100 px, SHA-256: 0D19BBB20F40CA8C4681D329D3FFA79DEE8CCEFFB32AE25197FCF73818C2E453).

### 11.2 Concrete Applicable Constraints for Round E Rules and Skills

#### 11.2.1 Enterprise Rules Constraints (R01 to R16)

| Rule Identifier | Exact Applicable Constraint for Round E |
|---|---|
| Rule 01 (Project Context) | "Preserve the Blue-dominant product UI decision while incorporating the official red (#c8161d) mark exclusively as the authentic brand signature; maintain 5 roles, 20 skills, 4 competency bands, and single-use SSO TTL 60s without functional regression." |
| Rule 02 (Git and Delivery) | "Never execute state-changing git commands (no commit, push, stage, amend, rebase, reset, stash, tag, or branch checkout); maintain all modifications strictly uncommitted; structure the final delivery report with ordered commit proposals prefixed T022B63: in English." |
| Rule 03 (Safety and Secrets) | "Never open, read, print, or leak .env, *.pem, or first-key.pem; confine all write operations strictly within D:\GitHub\Rikkei\rikkei-jobs; store temporary browser captures exclusively in the OS temp directory and delete them upon completion; never execute scripts/run-ci-in-docker.*; perform clean Docker teardown via docker compose down -v." |
| Rule 04 (Honest Verification) | "Report only genuine, un-fabricated command outputs with raw terminal evidence; verify contrast ratios via node scripts/compute-contrast.mjs; execute a break-test showing verifiable FAIL and restored PASS; empirically prove scrollWidth <= innerWidth across 100% of browser captures across 4 viewports." |
| Rule 05 (Backend Java Standards) | "Keep all backend Java code, controllers, services, and tests completely intact; maintain 325 JUnit and Testcontainers test suites passing with zero compiler warnings (-Xlint:all -Werror)." |
| Rule 06 (Database and Flyway) | "Preserve PostgreSQL 18.6 database schema and migrations V1-V4 immutability; do not add, alter, or remove database migration scripts." |
| Rule 07 (Security and RBAC) | "Maintain all identity security mechanisms unchanged (stateless JWT, constant-time comparison, lockout countdown, CSRF protection, secure cookie flags); confine modifications strictly to presentation and styling layers." |
| Rule 08 (Frontend Engineering) | "Enforce 100% color and surface ladder tokenization in design-tokens.css with zero hardcoded hex codes in component files; maintain strict TypeScript compliance (noImplicitAny, zero @ts-ignore); preserve zero emoji compliance across all components." |
| Rule 09 (Frontend Design Bar) | "Establish a distinct 5-level surface ladder in light and dark modes resolving the washed-out pale-on-pale defect; ensure immediate visual separation of the 60/40 asymmetric panels; elevate brand blue chroma; score Anti-AI rubric >= 11/12 with zero individual zero scores." |
| Rule 10 (Testing Strategy) | "Author comprehensive unit tests for the reusable BrandMark component verifying accessible name and aria-hidden attributes; add e2e verification for /favicon.svg and /favicon.png HTTP 200 and MIME types; maintain zero sleep calls in tests; preserve all 17 e2e test suites passing." |
| Rule 11 (Docs and Bilingual) | "Provide comprehensive, parallel bilingual documentation in docs/design/DESIGN_SYSTEM.md, docs/nt01/README.md, and docs/nt01/PR_DESCRIPTION.md; explicitly document the red brand mark vs blue UI vs error red architecture; maintain zero emoji and zero inline cspell:ignore comments." |
| Rule 12 (CI and Quality Gates) | "Ensure all 26 active runtime quality gates remain synchronized and passing across check.sh, check.ps1, and GitHub Actions CI; verify gate count parity via node scripts/check-gate-sync.mjs." |
| Rule 13 (Backend Data Access) | "Preserve existing transactional boundaries and read-only query optimizations without modifying backend persistence layer." |
| Rule 14 (Backend Module Boundaries) | "Ensure complete architectural isolation of the identity module; prevent cross-module foreign keys or direct dependencies." |
| Rule 15 (Backend Observability and Ops) | "Maintain structured ECS JSON logging on authentication events; mask all sensitive parameters; do not log token secrets." |
| Rule 16 (Backend Integrations) | "Use only native Node.js standard libraries for contrast and measurement scripts with zero new external npm dependencies; maintain hermetic Mailpit port 1025/8025 bindings." |

#### 11.2.2 Process and Domain Skills Constraints (S01 to S07)

| Skill Identifier | Exact Applicable Constraint for Round E |
|---|---|
| frontend-visual-design | "Construct a 5-tier surface ladder (canvas, panel, card, field, elevated) with visible luminance separation (Delta L* >= 4.0); upgrade brand blue to Confident Royal Cobalt (#0D55B8 Light, #508CEE Dark); ensure crisp 1px hairline borders; achieve Anti-AI rubric score >= 11/12 with zero zero-scores." |
| frontend-motion-design | "Restrict all transitions strictly to compositor-driven transform and opacity properties; ensure CLS = 0; support prefers-reduced-motion with instant 0.001ms duration and 100ms cross-fade fallback." |
| frontend-iconography | "Render the official brand mark authentically via a reusable BrandMark vector component supporting 20, 24, 32, 48px with 1:1 aspect ratio and zero distortion; enforce zero emoji across all components and documentation." |
| frontend-accessibility-audit | "Verify WCAG 2.2 AA compliance for 100% of color pairs (normal text >= 4.5:1, UI components >= 3.0:1) and evaluate APCA Lc values (body >= 60, headings >= 45); verify focus indicators >= 3.0:1 on all backgrounds; perform browser color-blindness simulation across 4 deficiencies." |
| security-review-checklist | "Verify byte-for-byte fidelity of copied favicon.svg and favicon.png via SHA-256 hashes; audit frontend Docker nginx configuration ensuring 200 OK and correct Content-Type (image/svg+xml and image/png) without CSP violations; verify zero credential leaks." |
| verification-before-completion | "Execute and present raw terminal execution evidence for all 26 quality gates in check.ps1 and check.sh; verify 325 backend tests, 82 frontend tests, 17 e2e suites; execute a break-test on design tokens; verify clean Docker teardown leaving zero containers or volumes." |
| docs-bilingual-update | "Synchronize all architectural statements, research findings, and contrast verification tables in docs/design/DESIGN_SYSTEM.md and docs/nt01/ in English and Vietnamese; preserve zero version drift in docs/03-version-table.md." |

### 11.3 Conflicts Analysis and Precedence Order

#### 11.3.1 Order of Precedence

The resolution order for all architectural and implementation decisions in Round E is strictly defined as follows:

1. User and Team Lead Prompt (Mandatory instructions in ORIGINAL_REQUEST.md and PROMPT_NT01_EN.txt - wins where more specific).
2. Enterprise Rules (16 rules in .claude/rules/).
3. Process and Domain Skills (28 skills in .claude/skills/).

#### 11.3.2 Deep Analysis of Core Architectural Conflicts

##### Conflict 1: Official Red Brand Mark (#c8161d) vs Blue-Dominant UI vs Semantic Error Red (#9B1C2A)

- Nature of Conflict: The project owner supplied official brand assets (`Tài liệu dự án\favicon.svg` and `favicon.png`) featuring an authentic red background (`#c8161d`) with three white bars. Concurrently, the binding mandate from the User / Team Lead requires the product UI to be strictly Blue-dominant (Confident Cobalt / Navy), while semantic danger/error states also utilize red hues. Unrestrained usage of red would cause cognitive confusion, leading users to perceive brand headers as error alerts or diluting error affordances.
- Precedence Resolution: The User Prompt explicitly dictates: "The logo keeps its authentic red and is the only place where brand red appears as a deliberate brand signature... Make sure the red logo does not look like an error state: it sits in the header/brand area, has no error icon or error text next to it, and error messages keep their non-colour cues."
- Engineering Solution:
  1. Logo Containment & Neutral Isolation: The red mark is encapsulated inside a dedicated `<BrandMark />` component. It appears solely in the Header, the Auth layout brand lockup, and the browser tab favicon. It is never used for interactive buttons, links, focus rings, navigation tabs, or card backgrounds. In dark mode, a subtle neutral surface ring (`rgba(255, 255, 255, 0.12)`) provides optical definition against the dark canvas without modifying the SVG asset.
  2. Semantic Error Quarantine: Error states use an independent Cold Crimson / Maroon palette (`--rj-primitive-danger-700: #9B1C2A` in light, `--rj-primitive-danger-light: #F1707A` in dark), distinct in hue and saturation from brand red (`#c8161d`). Crucially, error alerts mandate non-color cues: an alert octagon icon, distinct 1px border, and explicit descriptive text.
  3. Formal Token Integration: The brand mark red is isolated as a named token `--rj-brand-mark: #C8161D;` and audited in `scripts/compute-contrast.mjs` against white, dark canvas, and header surfaces.

##### Conflict 2: WCAG 2.2 AAA Mathematical Ratios vs Dark Mode Visual Comfort (Halation, Glare & Astigmatism)

- Nature of Conflict: Extreme mathematical contrast (e.g. pure white `#FFFFFF` text on pure black `#000000` canvas yielding $21.0:1$) passes WCAG 2.2 AAA with maximum marks. However, empirical vision research demonstrates that in dark mode, pupil dilation causes optical scattering across imperfect corneal surfaces (affecting 30% to 50% of people with astigmatism). High-frequency light rays bloom outward, producing optical halation, blurry letterforms, and severe eye strain. Furthermore, 100% saturated neon accents cause chromatic aberration on dark backgrounds.
- Precedence Resolution: The User Prompt mandates: "Passing contrast ratios is NOT enough: the redesign must feel comfortable and confident... no pure black, no pure white text (soft off-white), desaturated lighter blue for accents so it glows without vibrating... APCA Lc targets in addition to WCAG 2.2 ratios."
- Engineering Solution:
  1. Rejection of Extreme Values: The dark canvas is calibrated to deep obsidian navy `--rj-color-surface-page: #0B1019;` ($L = 0.007$), and card containers are elevated to `--rj-color-surface-card: #162030;` ($L = 0.021$). Pure black `#000000` is banned.
  2. Anti-Halation Typography: Primary text is softened to off-white `--rj-color-text-primary: #EDF2F7;` ($L = 0.882$, $CR \approx 14.5:1$ on card), eliminating harsh glare while maintaining crisp legibility.
  3. Perceptual Contrast Measurement (APCA): Integrate APCA $L_c$ calculations into `scripts/compute-contrast.mjs`, targeting $|L_c| \ge 75$ (exceeding minimum 60) for fluent body reading and $|L_c| \ge 45$ for headings.
  4. Luminous Glowing Blue: Dark mode accent blue is calibrated to `--rj-brand-electric: #508CEE;` (HSL $217^\circ, 82\%, 62\%$), achieving $CR = 5.60:1$ and $APCA\ Lc = 64.2$ without neon vibration.

##### Conflict 3: Zero Hardcoded Values / Token Abstraction vs Brand and Surface Specificity

- Nature of Conflict: Strict enterprise rules prohibit hardcoded hex codes across all components. However, resolving the washed-out defect requires precise lightness differentiation across 5 surface tiers, distinct 60/40 panel backgrounds, radar styling, and specific brand mark geometry.
- Precedence Resolution: Prompt mandates: "Implement only through design tokens (frontend/src/shared/styles/design-tokens.css, light and dark), no hard-coded hex outside token files."
- Engineering Solution:
  1. Two-Tier CSS Custom Properties Architecture: Define all physical color stops as immutable Tier 1 Primitive Tokens (`--rj-primitive-neutral-*`, `--rj-primitive-brand-*`, `--rj-brand-mark`), and map them to contextual Tier 2 Semantic Tokens (`--rj-color-surface-page`, `--rj-color-surface-panel`, `--rj-color-surface-card`, `--rj-color-surface-input`, `--rj-color-brand-primary`).
  2. Surface Ladder Formalization: Formally establish 5 surface levels: Page Canvas (`#EEF2F8` / `#0B1019`), Hero Panel (`#E1E8F2` / `#101724`), Card Container (`#FFFFFF` / `#162030`), Input Field (`#F8FAFD` / `#0D1420`), and Elevated Surface (`#FFFFFF` / `#1E2C42`).
  3. Automated Surface-Separation Check: Introduce an automated CIELAB $\Delta L^* \ge 4.0$ mathematical check in `scripts/compute-contrast.mjs` between Canvas and Card, guaranteeing that the washed-out pale-on-pale defect cannot return mechanically.

### 11.4 Detailed Proof Methods for Items E1 through E7

#### E1. Research First

- Objective: Establish an evidence-based foundation covering 8 mature design systems and visual ergonomics research.
- Proof Method & Evidence:
  - Document all findings, rejected ideas, and architectural decisions in `docs/design/DESIGN_SYSTEM.md` and `docs/nt01/README.md`.
  - Include verified, accessible URLs and access dates (2026-11-13) for Radix Colors, Material Design 3, GitHub Primer, IBM Carbon, Linear, APCA, and Astigmatism ergonomics studies.
  - Zero emoji and clean markdownlint/cspell verification.

#### E2. Redesign the Palette and Surfaces

- Objective: Replace washed-out surfaces with a confident 5-level surface ladder, Confident Royal Cobalt blue, distinct 60/40 asymmetry, readable radar visual, and robust form styling.
- Proof Method & Evidence:
  - Inspect `frontend/src/shared/styles/design-tokens.css` showing complete token definitions for light and dark modes with zero hardcoded hex codes in JSX/TSX.
  - Inspect `identity.css` and `AuthEditorialLayout.tsx` showing distinct surface tokens for `.rj-auth-story-panel` and `.rj-auth-card` with crisp hairline border separation.
  - Verify `CompetencyRadarVisual.tsx` upgraded polygon stroke (3px), fill opacity (0.32/0.14), grid lines (`#879BB0`), and labels (12px bold primary text).

#### E3. Measure, Do Not Guess

- Objective: Mathematically prove all color pairs, APCA $L_c$ metrics, surface-separation invariants, and execute a break-test.
- Proof Method & Evidence:
  - Run `node scripts/compute-contrast.mjs` verifying 100% PASS on all expanded color pairs across light and dark modes.
  - Verify APCA $L_c$ computation output: body text $|L_c| \ge 60$ (target $\ge 75$), headings $|L_c| \ge 45$.
  - Verify Surface-Separation Check output confirming $\Delta L^* \ge 4.0$ between Canvas and Card, and UI border $CR \ge 3.0:1$.
  - Break-test: temporarily mutate `--rj-primitive-neutral-100` to `#FFFFFF` in `design-tokens.css`, execute `compute-contrast.mjs` demonstrating FAIL (surface separation violated), restore original file, verify SHA-256 match and demonstrate PASS.
  - Verify gate count synchronization across `check.sh`, `check.ps1`, and CI via `node scripts/check-gate-sync.mjs`.

#### E4. Real Browser Verification (Before and After)

- Objective: Validate visual hierarchy, eye comfort, mobile geometry, and accessibility in a real browser.
- Proof Method & Evidence:
  - Capture 12 authentication and role-home screens across 4 viewports (375px, 768px, 1024px, 1440px) in light and dark modes (96 captures before, 96 captures after) stored strictly in the operating system temp directory (%TEMP%) and never committed.
  - Empirically verify $scrollWidth \le innerWidth$ across 100% of captures and report raw numeric values.
  - Re-score Anti-AI review rubric achieving $\ge 11/12$ with zero zero-scores.
  - Compile comfort checklist with PASS per screen in `docs/nt01/README.md`.
  - Execute browser color-blindness simulation (Protanopia, Deuteranopia, Tritanopia, Achromatopsia) confirming non-color cues.
  - Delete all temporary capture files upon completion.

#### E5. Keep Everything in Sync

- Objective: Maintain complete parity across canonical agent configurations, tests, and documentation.
- Proof Method & Evidence:
  - Run `node scripts/sync-agent-config.mjs --check` and `node scripts/validate-agent-config.mjs` verifying all 9 checks PASS.
  - Run `npx markdownlint-cli2` verifying 0 issues across all Markdown files.
  - Run `npx cspell` verifying 0 spelling issues across all 309 codebase files with zero inline `cspell:ignore` comments.
  - Synchronize bilingual documentation in `docs/design/`, `docs/nt01/README.md`, and `docs/nt01/PR_DESCRIPTION.md`.

#### E6. Regression and Clean-Up

- Objective: Ensure zero functional regression across all test suites and perform complete environment clean-up.
- Proof Method & Evidence:
  - Execute backend test suite `./mvnw clean test` verifying 325 tests pass.
  - Execute frontend test suite `npm run test -- --run` in `frontend/` verifying 82 tests pass.
  - Execute full opaque-box e2e suite `node e2e/run-all.mjs` verifying 17 suites / 216 test cases pass on a fresh Docker stack.
  - Execute `./check.sh` and `.\check.ps1` demonstrating identical 26/26 quality gates PASS.
  - Execute `docker compose down -v` and demonstrate with `docker ps -a` and `docker volume ls` that zero rikkei resources remain.
  - Confirm working tree status remains completely uncommitted with zero state-changing git commands executed.

#### E7. Official Brand Mark and Browser-Tab Icon Integration

- Objective: Authentically integrate official project brand mark assets across HTML and UI components.
- Proof Method & Evidence:
  - Verify byte-for-byte SHA-256 copy: `frontend/public/favicon.svg` matches `3FDE006C...ED20`, `frontend/public/favicon.png` matches `0D19BBB2...E453`.
  - Verify `frontend/index.html` references `/favicon.svg` and `/favicon.png` with complete removal of `/vite.svg`.
  - Curl verification against running stack confirming HTTP 200 OK and valid MIME types (`image/svg+xml`, `image/png`).
  - Unit tests for `<BrandMark />` component verifying accessibility attributes (`aria-hidden="true"` when decorative, proper accessible name when standalone).
  - E2E tests verifying favicon HTTP responses and absence of Vite icon references.

---

## 12. Round E2 Acknowledgement (Post-Review Targeted Refinements)

### 12.1 Mandatory Working Method (Verbatim Binding Principle)

"Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

### 12.2 Authoritative Reference Documents & Rules Read

Prior to undertaking any edits in Round E2, the engineering team has re-read the following core specifications in full:

1. Root Agent Directives: CLAUDE.md, GEMINI.md, AGENTS.md.
2. Enterprise Rules:
   - .claude/rules/03-safety-and-secrets.md (Safety, Host Boundaries and Secret Hygiene).
   - .claude/rules/04-honest-verification.md (Honest Verification, Evidence Before Claims and Quality Gates).
   - .claude/rules/08-frontend-engineering.md (Frontend Engineering Standards and Architecture).
   - .claude/rules/09-frontend-design-bar.md (Frontend Design Bar and Anti-AI Visual Standards).
   - .claude/rules/11-docs-and-bilingual.md (Documentation, Bilingual Standards, and Linters).
3. Task Skills:
   - .claude/skills/frontend-visual-design/SKILL.md (Bespoke palette tokens, 5-level surface ladder, and contrast compliance).
   - .claude/skills/frontend-accessibility-audit/SKILL.md (WCAG 2.2 AA contrast >= 4.5:1 text and >= 3.0:1 UI boundaries).
   - .claude/skills/verification-before-completion/SKILL.md (Empirical terminal evidence before declarations of completion).
   - .claude/skills/docs-bilingual-update/SKILL.md (Synchronized bilingual updates and zero version drift).
4. Task Mandate: D:\GitHub\Rikkei\.agents\PROMPT_NT01E2_EN.txt (Defects E2-1 through E2-5).

### 12.3 Concrete Applicable Constraints per Re-Read Rule and Skill

| Rule / Skill Identifier | Exact Applicable Constraint for Round E2 |
|---|---|
| CLAUDE.md | "Git is strictly READ-ONLY: never run commit, push, stage, amend, rebase, reset, stash, tag, or branch checkout; leave all modifications uncommitted. Proposed commit messages in English prefixed T022B63:." |
| Rule 03 (Safety and Secrets) | "Never open, read, copy, or dump .env, *.pem, or credentials (specifically never touch D:\GitHub\Rikkei\first-key.pem); store temporary browser captures exclusively in OS temp folder and delete them immediately; do not run scripts/run-ci-in-docker.*." |
| Rule 04 (Honest Verification) | "Never claim a check passed without executing the command and observing exit code 0; state test results and compiler outputs with absolute fidelity; report real measured counts (325 backend tests, 82 frontend tests, 17 e2e suites / 216 test cases, 26 active runtime gates)." |
| Rule 08 (Frontend Engineering) | "Enforce 100% tokenization across frontend/src; eliminate raw color literals outside design-tokens.css and documented fallback tokens; maintain strict TypeScript without any or @ts-ignore." |
| Rule 09 (Frontend Design Bar) | "Zero emoji across all files, components, and documentation; replace hard-coded colors in App.css and BrandMark with design tokens; preserve official logo geometry while sourcing fills from tokens; keep contrast pairs documented and passing." |
| Rule 11 (Docs and Bilingual) | "Rewrite docs/nt01/PR_DESCRIPTION.md in Vietnamese with full diacritics reflecting current state only (no round history, commit lists, or screenshot galleries); maintain clean markdownlint and cspell with zero issues." |
| frontend-visual-design | "Replace module badge and version badge hard-coded colors with palette tokens (brand surface tint and brand text) in light and dark modes, ensuring contrast pairs remain documented and >= 4.5:1." |
| frontend-accessibility-audit | "Verify WCAG 2.2 AA contrast for replaced tokens and audit UI boundary invariants across light and dark modes." |
| verification-before-completion | "Execute all 26 quality gates in check.ps1 and check.sh with identical pass counts (26/26); run break-test proving the color literal guard fails on violation and passes when pristine; verify clean Docker teardown (docker compose down -v)." |
| docs-bilingual-update | "Synchronize all metric counts (325 backend tests, 66 contrast pairs, 216 e2e cases, 26 active gates) across docs/nt01/README.md, docs/design/DESIGN_SYSTEM.md, and Round E section of PHASE0_ACK.md." |

### 12.4 Defect Resolution and Proof Methods for Items E2-1 through E2-5

#### E2-1. Hard-coded Colors Cleanup and Automated Guard

- Objective: Eliminate hard-coded colors in frontend/src/App.css (lines 47-48 #e0e7ff, #3730a3, line 53 #c7d2fe, lines 188-189 #4338ca, #eef2ff, etc.) and BrandMark.tsx, replacing them with design tokens in light and dark modes while keeping contrast pairs documented and passing. Retain byte-identical favicon.svg and favicon.png files. Add a guard preventing color literals from re-entering frontend/src outside design-tokens.css and documented allow-list, proven with a break-test.
- Proof Method & Evidence:
  1. Automated sweep of frontend/src (excluding design-tokens.css and tests) confirming zero undocumented color literals.
  2. BrandMark component verified using token fills (var(--rj-brand-mark) and var(--rj-brand-mark-contrast, #ffffff)) with preserved geometry.
  3. SHA-256 hash check confirming frontend/public/favicon.svg matches 3FDE006C...ED20 and favicon.png matches 0D19BBB2...E453.
  4. Break-test: introduce an intentional raw hex literal into a frontend component, execute the automated guard showing non-zero FAIL, revert the edit, and re-execute showing clean PASS.

#### E2-2. PR Description Modernization (docs/nt01/PR_DESCRIPTION.md)

- Objective: Rewrite docs/nt01/PR_DESCRIPTION.md reflecting solely the current state of branch feature/T022863-dang-nhap in Vietnamese with full diacritics. Include delivered features (SSO, enterprise login, change/forgot/reset password, lockout, ticket policy, JWT, role homes, V3 and V4 migrations), security decisions (tickets burn on failure, constant-time and dummy-hash for unknown users, hashed single-use reset token, fail-fast prod validator for JWT_SECRET), UI decisions (blue-led palette, surface ladder, official red brand mark, self-hosted fonts), test/run instructions, known limitations, open business questions, and reviewer checklist. Remove old round history, commit lists, and screenshot references.
- Proof Method & Evidence:
  1. Inspect docs/nt01/PR_DESCRIPTION.md verifying 100% full Vietnamese diacritics, zero raw credentials, and absence of outdated round histories or broken screenshot references.
  2. Propose PR title as first line of final report.
  3. Markdownlint and cspell verification passing with 0 issues.

#### E2-3. Documentation Metric Synchronization

- Objective: Harmonize all conflicting metric counts across docs/nt01/PHASE0_ACK.md (Round E section: fix backend test count with real measured value 325), docs/nt01/README.md, and docs/design/DESIGN_SYSTEM.md to match verified current numbers (325 backend tests, 82 frontend tests, 66 contrast pairs, 17 e2e suites / 216 test cases, 26 active runtime gates).
- Proof Method & Evidence:
  1. Grep verification confirming zero stale counts remain across target documents.
  2. scripts/compute-contrast.mjs running 66 pairs with 0 violations.
  3. Real test runs matching all stated metrics.

#### E2-4. Honest Visual Evaluation and Limitations

- Objective: Re-inspect running UI in browser across login (LMS and Enterprise tabs), forgot password, change password, and one role home in light and dark modes at 375px and 1440px viewports. Document honest review notes and any hierarchy/contrast limitations with measured numbers in docs/nt01/README.md without starting a new palette redesign.
- Proof Method & Evidence:
  1. Record honest per-screen observations and measured lightness/contrast metrics in docs/nt01/README.md.
  2. Store any temporary screenshots exclusively in OS temp folder and delete them immediately; verify zero image files added to git repository.

#### E2-5. Untracked Helper Scripts Preservation

- Objective: Do not modify or delete untracked helper scripts created in earlier rounds (scripts/capture-round-e-before.mjs, scripts/capture-round-e-after.mjs, etc.). Do not create unnecessary scripts in the repository.
- Proof Method & Evidence:
  1. Git status check verifying untracked helper scripts remain untouched.
  2. No new untracked files in repository root or helper directories unless strictly required by E2-1 guard.
