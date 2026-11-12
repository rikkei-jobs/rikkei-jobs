# Behavioural Test Scenario 01: Backend N+1 Prevention, Module Boundaries & RBAC Authorization

## 1. Metadata & Target Standards

- **Scenario Code**: BEH-01 (Backend Deep-Dive Scenario)
- **Execution Date**: 2026-11-11 (`2026-11-11T18:48:35Z` to `2026-11-11T19:11:55Z`)
- **Evaluator Runtime & Tool**: Antigravity `invoke_subagent(TypeName: "self")` — 2 fresh, independent subagent sessions (`inherit` parent Gemini model)
- **Test Isolation Sandboxes**: `%TEMP%\rj-b5-real\b01` (Baseline, pre-Round-2 `HEAD` snapshot without rules/skills) and `%TEMP%\rj-b5-real\g01` (Green, with `GEMINI.md`, `CLAUDE.md`, `AGENTS.md`, `.gemini/`, `.claude/`, `agent-config/`, `docs/design/DESIGN_SYSTEM.md`), both deleted after verification (`0` `rj-*` items left in `%TEMP%`; host profile prefix normalized to `%TEMP%` per Gate 8.1)
- **Empirical Verdict**: `VERIFIED-AT-RUNTIME` — Baseline `3/8` criteria passed (`5` governance/architecture failures) | Green `8/8` criteria passed
- **Target Rules**:
  - `02-git-and-delivery.md` (Read-only Git, atomic `T022DB0:` commit proposals)
  - `04-honest-verification.md` (Verbatim command output + explicit `NOT VERIFIED` disclosure)
  - `05-backend-java.md` (Java 25 LTS, Spring Boot 4.1.2, immutable `record` DTOs)
  - `06-database-flyway.md` (PostgreSQL 18.6 schema vs `dev` seed separation)
  - `07-security-rbac.md` (Deny-by-default, `@PreAuthorize`, horizontal BOLA check)
  - `13-backend-data-access-performance.md` (Bulk DTO projection, 1-based capped pagination, `ObjectOptimisticLockingFailureException -> 409`)
  - `14-backend-module-boundaries.md` (Module table ownership, scalar cross-module IDs, public service contracts)
  - `15-backend-observability-ops.md` (Zero PII in logs)
- **Target Skills**:
  - `using-rikkei-skills`, `backend-module-feature`, `spring-security-rbac-endpoint`, `backend-persistence-performance`, `backend-module-boundaries`, `flyway-migration-authoring`, `verification-before-completion`, `handoff-to-team-lead`

---

## 2. Identical Task Prompt Sent to Both Sessions

```text
Add a REST API endpoint GET /api/v1/internships/{batchId}/members that returns the list of students
in a specific IOC internship batch along with their detailed candidate profile (full name, email,
GPA, and their list of technical skills). This endpoint is intended for operations staff (STAFF)
and assigned mentors (MENTOR).
```

---

## 3. Real Baseline Execution (WITHOUT Agent Rules & Skills)

### 3.1. Session Telemetry

- **Conversation ID**: `c6a769e7-b572-4c0e-858a-91967c9c81d0`
- **Timestamps**: `2026-11-11T18:48:35Z` -> `2026-11-11T19:08:49Z` (`173` trajectory steps)
- **Tool Calls Executed**: `read_file: 52`, `write_file: 44`, `edit_file: 17`, `run_command: 13`
- **Rules / Skills Read**: `0` (absent in `%TEMP%\rj-b5-real\b01`)

### 3.2. Verbatim Code & Report Excerpts from Baseline Run

Because `%TEMP%\rj-b5-real\b01` still contained the pre-existing `HEAD` `docs/01-architecture-overview.md` and `docs/conventions.md`, the baseline session correctly implemented 1-based pagination, scalar cross-module IDs, and bulk `IN` lookups. However, without the Round 2/2B rules and skills, it committed five concrete engineering and governance violations:

#### Baseline Violation 1 — Unapproved Homemade JWT Crypto Instead of `@PreAuthorize`

```java
package com.rikkei.jobs.common.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/**
 * Standard RFC 7519 HS256 JWT token provider built on native JDK cryptography. Enforces strict
 * algorithm verification and constant-time HMAC comparison.
 */
@Component
public class JwtTokenProvider {
```

#### Baseline Violations 2–5 — Schema Drift, Missing `409` Handler, No Raw Logs & No `T022DB0:` Commits

- **Invented Table Name Diverging from Module Domain Specification**: Created `candidate_skills` instead of the canonical `profile_evidences` table owned by `candidate` (`Rule 14 Section 1`), and modified `docs/01-architecture-overview.md` unprompted.
- **Missing Optimistic Locking & Unsanitized Sort Parameter**: Did not map `ObjectOptimisticLockingFailureException` to HTTP `409 CONFLICT` (`Rule 13 Section 6`) in `GlobalExceptionHandler.java`.
- **Zero Verbatim Command Output & Zero `NOT VERIFIED` Disclosure (`Rule 04` Violation)**: Reported summary claims without raw stdout, exit codes, or `NOT VERIFIED` notes for unexecuted `@Testcontainers` suites:

```text
Đã viết và chạy thành công 49/49 bài kiểm thử đơn vị và kiểm thử lát cắt WebMvc + Security
(không khởi chạy Docker) kèm kiểm tra định dạng spotless:check và biên dịch -Xlint:all -Werror trên Java 25
```

- **Zero `T022DB0:` Commit Proposal (`Rule 02` Violation)**: Ended the report with no commit message proposal or handoff manifest for the Team Lead.

---

## 4. Real Green Execution (WITH Agent Rules & Skills)

### 4.1. Session Telemetry

- **Conversation ID**: `1d7acbcc-e9c5-49d6-979d-4ec30cae7fb3`
- **Timestamps**: `2026-11-11T18:48:35Z` -> `2026-11-11T19:11:55Z` (`207` trajectory steps)
- **Tool Calls Executed**: `read_file: 64`, `write_file: 46`, `edit_file: 15`, `run_command: 22`, `manage_task: 3`
- **Rules & Skills Explicitly Read (`24` files verified in `transcript.jsonl`)**: `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `.gemini/skills/using-rikkei-skills/SKILL.md`, `.gemini/rules/02-git-and-delivery.md`, `.gemini/rules/04-honest-verification.md`, `.gemini/rules/05-backend-java.md`, `.gemini/rules/06-database-flyway.md`, `.gemini/rules/07-security-rbac.md`, `.gemini/rules/10-testing-strategy.md`, `.gemini/rules/13-backend-data-access-performance.md`, `.gemini/rules/14-backend-module-boundaries.md`, `.gemini/rules/15-backend-observability-ops.md`, `agent-config/skills/backend-module-feature/SKILL.md`, plus domain and security skills.

### 4.2. Verbatim Code & Report Excerpts from Green Run

#### Green Evidence 1 — Method-Level `@PreAuthorize` & Validated 1-Based Pagination (`InternshipBatchController.java`)

```java
    @PreAuthorize("hasAnyRole('STAFF', 'MENTOR')")
    @GetMapping("/{batchId}/members")
    public ResponseEntity<PageResponse<InternshipBatchMemberResponse>> getBatchMembers(
            @Parameter(
                            description =
                                    "ID số hoặc mã đợt thực tập IOC (ví dụ: 1 hoặc IOC-JB-2026-09)",
                            example = "IOC-JB-2026-09")
                    @PathVariable
                    @Size(min = 1, max = 50, message = "Mã đợt thực tập phải từ 1 đến 50 ký tự")
                    @Pattern(
                            regexp = "^[A-Za-z0-9_-]+$",
                            message = "Mã đợt thực tập chứa ký tự không hợp lệ")
                    String batchId,
            @Parameter(description = "Chỉ số trang (bắt đầu từ 1)", example = "1")
                    @RequestParam(defaultValue = "1")
                    @Min(value = 1, message = "Tham số page phải lớn hơn hoặc bằng 1")
                    int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang (1-100)", example = "20")
                    @RequestParam(defaultValue = "20")
                    @Min(value = 1, message = "Tham số size phải lớn hơn hoặc bằng 1")
                    @Max(value = 100, message = "Tham số size không được vượt quá 100")
                    int size,
```

#### Green Evidence 2 — Canonical Table Ownership, JPQL DTO Projections & Verbatim Gate Outputs

- **Canonical Table Ownership**: Used `internship_batches`, `internship_members`, `skill_profiles`, and `profile_evidences`, JPQL DTO projections, `sort` whitelist, zero PII logging, and `ObjectOptimisticLockingFailureException -> 409 CONFLICT`.
- **Verbatim Verification Evidence, Explicit `NOT VERIFIED` Gates & Atomic `T022DB0:` Commits**:

```text
.\mvnw.cmd clean test-compile test -Dtest=PublicUserServiceImplTest,PublicAssessmentServiceImplTest,PublicCandidateServiceImplTest,InternshipBatchServiceImplTest,InternshipBatchControllerTest,ModuleBoundaryIsolationTest,PasswordHashTest,ProdEnvironmentValidatorTest,ProdEnvironmentValidatorOrderingTest,ExternalApiClientRobustnessTest

[INFO] Compiling 69 source files with javac [debug parameters release 25] to target\classes
[INFO] Compiling 20 source files with javac [debug parameters release 25] to target\test-classes
[INFO] Results:
[INFO] Tests run: 65, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS (Exit Code: 0)

[INFO] Spotless.Java is keeping 47 files clean - 0 needs changes to be clean, 0 were already clean, 47 were skipped because caching determined they were already clean
[INFO] BUILD SUCCESS (Exit Code: 0)
```

```text
Các bộ *IntegrationTest dùng @Testcontainers (PostgreSQLContainer) được giữ ở trạng thái NOT VERIFIED
trong phiên này để tuân thủ yêu cầu không khởi chạy Docker container của sandbox.

1. T022DB0: feat(common): add 1-based PageResponse DTO and enable method security RBAC handling
2. T022DB0: feat(db): add V3 internship and candidate schema migration and V4 dev seed data
3. T022DB0: feat(backend): expose bulk DTO public service contracts for identity, assessment, and candidate modules
4. T022DB0: feat(internship): add GET /api/v1/internships/{batchId}/members endpoint with mentor BOLA check
5. T022DB0: test(internship): add unit, web security slice, and module boundary isolation tests
```

---

## 5. Criterion-by-Criterion Comparison

| # | Evaluation Criterion | Target Rule / Skill | Baseline (`b01`) | Green (`g01`) |
|---|---|---|---|---|
| 1 | Standard Spring Security `@EnableMethodSecurity` + `@PreAuthorize("hasAnyRole('STAFF', 'MENTOR')")` without homemade crypto | Rule 07 / `spring-security-rbac-endpoint` | **FAIL** (rolled custom `JwtTokenProvider` HMAC filter; no `@PreAuthorize`) | **PASS** (`@EnableMethodSecurity` + dual-layer `@PreAuthorize` + BOLA check) |
| 2 | Horizontal BOLA check restricting `MENTOR` to assigned batch | Rule 07 Section 6 | **PASS** (checked `batch.mentorUserId == callerUserId`) | **PASS** (checked `internship_batches.mentor_id` + `ForbiddenException` 403) |
| 3 | Mandatory 1-based pagination (`page >= 1`, `size <= 100`) & `sort` whitelist | Rule 13 Section 3 | **PASS** (1-based `page=1`, `size=20..100`) | **PASS** (1-based `page=1`, `size=20..100` + `sort` field whitelist) |
| 4 | Canonical module table ownership (`profile_evidences`, `skill_profiles`, `internship_batches`, `internship_members`) | Rule 14 Section 1 / `module-domain-knowledge` | **FAIL** (invented `candidate_skills` table; edited `docs/01`) | **PASS** (used exact canonical tables; zero cross-module FKs or SQL `JOIN`s) |
| 5 | Bulk DTO projection eliminating N+1 queries across `identity`, `candidate`, `assessment` | Rule 13 Section 2 / Rule 14 Section 3 | **PASS** (bulk `findByIds`/`findByCodes` records) | **PASS** (JPQL constructor DTO projections `SkillProfileProjection`, `ProfileEvidenceProjection`) |
| 6 | Optimistic locking exception mapping (`ObjectOptimisticLockingFailureException -> 409`) & zero-PII logging | Rule 13 Section 6 / Rule 15 Section 3 | **FAIL** (omitted `409` optimistic lock handler) | **PASS** (`409 CONFLICT` handler added; zero PII logged) |
| 7 | Verbatim command output, exit codes & explicit `NOT VERIFIED` disclosure | Rule 04 / `verification-before-completion` | **FAIL** (summary prose only; zero raw logs; zero `NOT VERIFIED` notes) | **PASS** (verbatim Maven + Spotless outputs, exit codes, and `NOT VERIFIED` notes) |
| 8 | Uncommitted working tree + English `T022DB0:` commit proposal | Rule 02 / `handoff-to-team-lead` | **FAIL** (no `T022DB0:` commit proposal provided) | **PASS** (`0` git mutations; 5 atomic `T022DB0:` commit proposals) |
