<!-- cspell:ignore Testcontainers -->
# Behavioural Test Scenario 06: External System Integration, Transaction Isolation & Mock Contract

## 1. Metadata & Target Standards

- **Scenario Code**: BEH-06 (External Integration & Resilience Scenario)
- **Execution Date**: 2026-11-11 (`2026-11-11T18:49:00Z` to `2026-11-11T19:18:05Z`)
- **Evaluator Runtime & Tool**: Antigravity `invoke_subagent(TypeName: "self")` — 2 fresh, independent subagent sessions (`inherit` parent Gemini model)
- **Test Isolation Sandboxes**: `%TEMP%\rj-b5-real\b06` (Baseline, pre-Round-2 `HEAD` snapshot without rules/skills) and `%TEMP%\rj-b5-real\g06` (Green, with rules/skills + `DESIGN_SYSTEM.md`), both deleted after verification (`0` `rj-*` items left in `%TEMP%`)
- **Empirical Verdict**: `VERIFIED-AT-RUNTIME` — Baseline `3/8` criteria passed (`5` RBAC/locking/migration-test/design/handoff failures) | Green `8/8` criteria passed (`65/65` Backend JUnit + `11/11` Frontend Vitest PASS)
- **Target Rules**:
  - `02-git-and-delivery.md` (Read-only Git, atomic `T022DB0:` commits)
  - `04-honest-verification.md` (Verbatim command outputs & exit codes)
  - `05-backend-java.md` & `06-database-flyway.md` (Java 25, PostgreSQL 18.6 migrations, existing migration-count tests kept green)
  - `07-security-rbac.md` (`@EnableMethodSecurity` + `@PreAuthorize("hasRole('HR')")` + `AccessDeniedException -> 403`)
  - `08-frontend-engineering.md` & `09-frontend-design-bar.md` (4 async states + `<Icon />` if UI slice added)
  - `13-backend-data-access-performance.md` (External HTTP strictly outside `@Transactional`; `@Version` optimistic locking + `409 CONFLICT`)
  - `16-backend-integrations.md` (Centralized `ExternalApiClient`, `X-Service-Key` backend-only, timeout + transient 5xx retry, domain error mapping)
- **Target Skills**:
  - `using-rikkei-skills`, `external-system-integration-and-mock`, `backend-module-feature`, `spring-security-rbac-endpoint`, `backend-persistence-performance`, `verification-before-completion`, `handoff-to-team-lead`
- **Reference Contract**: `docs/mock-contract.md` (`POST /meet/rooms`, `X-Service-Key`)

---

## 2. Identical Task Prompt Sent to Both Sessions

```text
Integrate our application with the external Rikkei Meet video conferencing service so that an
online interview room is automatically created when an HR recruiter schedules a Round 2 interview
for a candidate.
```

---

## 3. Real Baseline Execution (WITHOUT Agent Rules & Skills)

### 3.1. Session Telemetry

- **Conversation ID**: `43db3b2b-1e67-43a9-b8d6-2726ea32b771`
- **Timestamps**: `2026-11-11T18:49:00Z` -> `2026-11-11T19:10:45Z` (`174` trajectory steps)
- **Tool Calls Executed**: `read_file: 54`, `write_file: 35`, `edit_file: 17`, `run_command: 19`
- **Rules / Skills Read**: `0` (absent in `%TEMP%\rj-b5-real\b06`)

### 3.2. Honest Empirical Assessment of Baseline Run

Because `%TEMP%\rj-b5-real\b06` contained the `HEAD` codebase (`ExternalApiClient.java` and `docs/mock-contract.md`), the baseline session **did** pass three core architectural checks: it routed `POST /meet/rooms` through `ExternalApiClient` with `X-Service-Key`, executed the HTTP call outside the DB transaction via `TransactionTemplate`, and wrote hermetic unit/slice tests. However, without the Round 2/2B rules and skills, five concrete defects occurred:

#### Baseline Defect 1 — Omitted `@Version` Optimistic Locking & `409` Mapping (`Rule 13 Section 6`)

`JobApplication.java` and `InterviewRound.java` lacked `@Version` optimistic locking, relying on pessimistic row locking (`findByIdForUpdate`) instead, and `GlobalExceptionHandler.java` lacked `OptimisticLockingFailureException -> 409 CONFLICT` handling:

```java
@Entity
@Table(name = "interview_rounds")
public class InterviewRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;
    // Missing @Version optimistic locking field
```

#### Baseline Defects 2–5 — Missing `@PreAuthorize`, Unsynchronized Migration Tests, UI & Reporting Gaps

- **URL Matcher Only — Omitted Method-Level `@EnableMethodSecurity` / `@PreAuthorize("hasRole('HR')")` (`Rule 07 Section 6`)**: Relied solely on URL path matchers in `SecurityConfig.java` without method-level `@PreAuthorize`.
- **Broke Existing Migration-Count Integration Tests (`Rule 06` / `flyway-migration-authoring`)**: Added `V3__create_recruitment_interview_tables.sql` without updating `DefaultProfileIntegrationTest` and `ProfileSeparationIntegrationTest`, which assert exact Flyway migration counts when Docker runs.
- **Frontend UI Built Without `DESIGN_SYSTEM.md`, 4 Async States, or `<Icon />` (`Rule 08` & `Rule 09`)**: Created `InterviewSchedulerPanel.tsx` without bespoke semantic tokens or standardized `<Icon />` component.
- **Zero Verbatim Command Outputs & Zero `T022DB0:` Commit Proposals (`Rule 04` & `Rule 02`)**: Reported summary prose (`"43/43 tests PASS"`) with zero verbatim terminal logs and zero `T022DB0:` commit proposals.

---

## 4. Real Green Execution (WITH Agent Rules & Skills)

### 4.1. Session Telemetry

- **Conversation ID**: `0c5e219e-31c5-4aac-b8cb-ed7a75b44568`
- **Timestamps**: `2026-11-11T18:49:02Z` -> `2026-11-11T19:18:05Z` (`258` trajectory steps)
- **Tool Calls Executed**: `read_file: 100`, `write_file: 40`, `edit_file: 16`, `run_command: 23`, `manage_task: 1`
- **Rules & Skills Explicitly Read (`26` files verified in `transcript.jsonl`)**: `GEMINI.md`, `AGENTS.md`, `CLAUDE.md`, `.gemini/skills/using-rikkei-skills/SKILL.md`, `.gemini/rules/16-backend-integrations.md`, `.gemini/skills/external-system-integration-and-mock/SKILL.md`, `.gemini/skills/module-domain-knowledge/SKILL.md`, `.gemini/rules/02-git-and-delivery.md`, `.gemini/rules/05-backend-java.md`, `.gemini/rules/06-database-flyway.md`, `.gemini/rules/07-security-rbac.md`, `.gemini/rules/10-testing-strategy.md`, `.gemini/rules/13-backend-data-access-performance.md`, `.gemini/rules/14-backend-module-boundaries.md`, plus `DESIGN_SYSTEM.md` and frontend skills.

### 4.2. Verbatim Code & Verification Excerpts from Green Run

#### Green Evidence 1 — `@Version` Optimistic Locking (`Application.java`), `@PreAuthorize("hasRole('HR')")` & Short TXs

```java
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;

@Entity
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
```

#### Green Evidence 2 — Synchronized Migration Tests, Verbatim Gate Outputs & Atomic `T022DB0:` Commits

- **Kept Existing Migration & Integration Tests Synchronized**: Updated `DefaultProfileIntegrationTest.java`, `ProfileSeparationIntegrationTest.java`, `SecurityHardeningIntegrationTest.java`, and `ExternalApiClientIntegrationTest.java` alongside `V3__create_recruitment_interview_tables.sql`.
- **Verbatim Quality Gate Output & Atomic `T022DB0:` Commit Proposals (ASCII-Normalized Glyphs)**:

```text
=== 1. HYGIENE & SECURITY CHECKS ===
System.out/printStackTrace matches: 0
Frontend console.log/debugger matches: 0
Frontend X-Service-Key/dev-key/:9000 matches: 0
Hardcoded host path matches: 0
TODO/FIXME matches: 0

=== 2. FRONTEND QUALITY GATES ===
> rikkei-jobs-frontend@1.0.0 test
> vitest run
 [PASS] src/features/recruitment/components/InterviewSchedulePanel.test.tsx (4 tests) 206ms
 [PASS] src/App.test.tsx (7 tests) 194ms
 Test Files  2 passed (2)
      Tests  11 passed (11)

=== 3. BACKEND QUALITY GATES ===
[INFO] --- spotless:3.11.0:check (default-cli) @ rikkei-jobs-backend ---
[INFO] Spotless.Java is keeping 76 files clean - 0 needs changes to be clean
[INFO] Results:
[INFO] Tests run: 65, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

```text
T022DB0: feat(common): add Rikkei Meet room client contract with transient 5xx retry and method security handlers
T022DB0: feat(recruitment): provision Rikkei Meet online room automatically when HR schedules Round 2 interview
T022DB0: feat(frontend): add recruitment interview scheduling panel with Round 2 Rikkei Meet room view
T022DB0: test(recruitment): add unit, security slice, module boundary, and component tests for Rikkei Meet integration
```

---

## 5. Criterion-by-Criterion Comparison

| # | Evaluation Criterion | Target Rule / Skill | Baseline (`b06`) | Green (`g06`) |
|---|---|---|---|---|
| 1 | Centralized `ExternalApiClient.createMeetRoom` (`POST /meet/rooms`, backend-only `X-Service-Key`, timeout + retry) | Rule 16 / `external-system-integration-and-mock` | **PASS** (`ExternalApiClient` + `ObjectMapper` + 5s timeout + 2 retries) | **PASS** (`ExternalApiClient` + `MeetRoomCreateRequest` + linear backoff retry + `X-Service-Key` hygiene scan `0` leaks) |
| 2 | External HTTP executed strictly outside DB `@Transactional` boundary (`roundNumber == 2` only) | Rule 13 Section 5 | **PASS** (`TransactionTemplate` 3-phase split) | **PASS** (non-transactional `InterviewSchedulingServiceImpl` orchestrating short read/write TXs in `InterviewPersistenceService`) |
| 3 | Method-level `@EnableMethodSecurity` + `@PreAuthorize("hasRole('HR')")` + `AccessDeniedException -> 403` | Rule 07 / `spring-security-rbac-endpoint` | **FAIL** (URL matcher only; omitted `@EnableMethodSecurity` / `@PreAuthorize`) | **PASS** (`@EnableMethodSecurity` + `@PreAuthorize("hasRole('HR')")` + explicit `401`/`403` handlers) |
| 4 | `@Version` optimistic locking on mutable entity + `OptimisticLockingFailureException -> 409 CONFLICT` | Rule 13 Section 6 | **FAIL** (no `@Version` field; no `409` optimistic lock handler) | **PASS** (`@Version` on `Application` + `OptimisticLockingFailureException -> 409 CONFLICT`) |
| 5 | Flyway `V3` schema synchronized with existing migration-count tests | Rule 06 / `flyway-migration-authoring` | **FAIL** (left `DefaultProfileIntegrationTest` & `ProfileSeparationIntegrationTest` unsynchronized) | **PASS** (updated migration assertions cleanly across existing integration test files) |
| 6 | Frontend recruitment slice follows 4 async states, `<Icon />` & `DESIGN_SYSTEM.md` | Rule 08 & Rule 09 | **FAIL** (missing `<Icon />` & `DESIGN_SYSTEM.md` tokens) | **PASS** (`useApplicationInterviews` 4 states + `Icon.tsx` + `DESIGN_SYSTEM.md` styles; `11/11` Vitest PASS) |
| 7 | Hermetic offline tests (zero live internet dependency) | Rule 10 Section 3 | **PASS** (`43/43` JUnit + `4/4` Vitest) | **PASS** (`65/65` JUnit + `11/11` Vitest) |
| 8 | Verbatim gate outputs + atomic English `T022DB0:` commit proposals | Rule 04 & Rule 02 | **FAIL** (`0` raw command logs; `0` `T022DB0:` commits) | **PASS** (verbatim hygiene/frontend/backend logs + 4 `T022DB0:` commits) |
