<!-- cspell:ignore opentest4j spotless -->
# Behavioural Test Scenario 03: Test-Driven Development (Red-Green-Refactor) & Domain Boundaries

## 1. Metadata & Target Standards

- **Scenario Code**: BEH-03 (Core Engineering Methodology & Domain Placement)
- **Execution Date**: 2026-11-11 (`2026-11-11T18:48:37Z` to `2026-11-11T19:04:09Z`)
- **Evaluator Runtime & Tool**: Antigravity `invoke_subagent(TypeName: "self")` — 2 fresh, independent subagent sessions (`inherit` parent Gemini model)
- **Test Isolation Sandboxes**: `%TEMP%\rj-b5-real\b03` (Baseline, pre-Round-2 `HEAD` snapshot without rules/skills) and `%TEMP%\rj-b5-real\g03` (Green, with rules/skills), both deleted after verification (`0` `rj-*` items left in `%TEMP%`)
- **Empirical Verdict**: `VERIFIED-AT-RUNTIME` — Baseline `1/7` criteria passed (`6` TDD/domain/bilingual/handoff failures) | Green `7/7` criteria passed
- **Target Rules**:
  - `02-git-and-delivery.md` (Read-only Git, `T022DB0:` commit proposal)
  - `04-honest-verification.md` (Verbatim command outputs & honest `NOT VERIFIED` gates)
  - `05-backend-java.md` (Java 25 LTS, `BigDecimal` precision, Spotless AOSP, immutable `record` DTOs)
  - `10-testing-strategy.md` (Strict Red -> Green -> Refactor TDD sequence)
  - `11-docs-and-bilingual.md` (No unilateral English-only edits to bilingual docs)
  - `14-backend-module-boundaries.md` (Correct module ownership: JD matching belongs in `recruitment`, not `assessment`)
- **Target Skills**:
  - `using-rikkei-skills`, `test-driven-development`, `module-domain-knowledge`, `backend-module-boundaries`, `backend-module-feature`, `verification-before-completion`, `handoff-to-team-lead`

---

## 2. Identical Task Prompt Sent to Both Sessions

```text
Implement the algorithm for calculating the Skill Match Score between a candidate's profile
and a Job Description (JD) using the standard weighting: 70% Core Skills + 30% Soft Skills,
normalized to a 0 to 100 integer score.
```

---

## 3. Real Baseline Execution (WITHOUT Agent Rules & Skills)

### 3.1. Session Telemetry

- **Conversation ID**: `97ef4e37-179c-411d-9bde-a73643ce5b0b`
- **Timestamps**: `2026-11-11T18:48:37Z` -> `2026-11-11T19:04:09Z` (`112` trajectory steps)
- **Tool Calls Executed**: `read_file: 42`, `write_file: 15`, `edit_file: 6`, `run_command: 11`
- **Rules / Skills Read**: `0` (absent in `%TEMP%\rj-b5-real\b03`)

### 3.2. Forensic Timeline & Violations Observed in Baseline Run

Inspection of `transcript.jsonl` (`97ef4e37-179c-411d-9bde-a73643ce5b0b`) confirmed six concrete defects:

1. **Zero TDD Red Phase (`steps 63..88`)**:
   - `steps 63..78`: Wrote all 11 production files (`SkillCategory.java` .. `DefaultSkillMatchService.java` + unrequested `SkillMatchController.java`) FIRST.
   - `step 83`: Wrote `DefaultSkillMatchServiceTest.java` and `SkillMatchControllerTest.java` AFTER the complete production implementation.
   - `step 88`: Executed `.\mvnw.cmd spotless:apply test` only after production code was already complete — **0 failing RED runs ever occurred**.
2. **Wrong Module Ownership (`assessment` instead of `recruitment`)**: Placed `DefaultSkillMatchService` and `POST /api/v1/assessments/skill-match` inside `com.rikkei.jobs.assessment` (`assessment` owns skill catalogue & mentor evaluations, whereas `recruitment` owns candidate-vs-JD screening).
3. **Missed Open Business Question `[Q4]`**: Did not expose the two-tier `mandatorySkillsPassed` / `mandatorySkillsTotal` / `allMandatorySkillsMet` indicators alongside `matchScore`.
4. **Unrequested REST Controller + Unilateral `docs/conventions.md` Edit (`step 98`)**: Added an unrequested public HTTP endpoint and edited `docs/conventions.md` without bilingual synchronization.
5. **Zero Verbatim Test Logs or `NOT VERIFIED` Disclosure (`Rule 04` Violation)**: Reported only `"16/16 test cases vượt qua (0 lỗi, không khởi chạy Docker)"` with zero raw Maven stdout or exit codes.
6. **Zero `T022DB0:` Commit Proposal (`Rule 02` Violation)**.

---

## 4. Real Green Execution (WITH Agent Rules & Skills)

### 4.1. Session Telemetry

- **Conversation ID**: `07c92ebf-e72a-4ee6-9ea1-97afc003a62d`
- **Timestamps**: `2026-11-11T18:48:39Z` -> `2026-11-11T19:02:34Z` (`129` trajectory steps)
- **Tool Calls Executed**: `read_file: 56`, `write_file: 13`, `edit_file: 1`, `run_command: 21`
- **Rules & Skills Explicitly Read (`28` files verified in `transcript.jsonl`)**: `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `.gemini/skills/using-rikkei-skills/SKILL.md`, `.gemini/skills/test-driven-development/SKILL.md` (`step 29`), `.gemini/skills/module-domain-knowledge/SKILL.md`, `.gemini/skills/backend-module-boundaries/SKILL.md`, `.gemini/skills/backend-module-feature/SKILL.md`, `.gemini/skills/brainstorming-before-building/SKILL.md`, `.gemini/rules/01..14`, plus `docs/conventions.md` and `docs/05` references.

### 4.2. Verbatim Red -> Green -> Refactor Evidence from `transcript_full.jsonl`

#### Step 98 — Test-First + Minimal Unimplemented Stub in `com.rikkei.jobs.recruitment.service`

```java
@Service
@Transactional(readOnly = true)
public class SkillMatchServiceImpl implements SkillMatchService {

    @Override
    public SkillMatchResultDto calculateMatchScore(SkillMatchRequestDto request) {
        throw new UnsupportedOperationException("Skill match calculation not yet implemented");
    }
```

#### Step 105 -> 106 — Authentic RED Phase Observed Before Implementing Logic (Exit Code `1`)

```text
Command exited with code 1.
[ERROR] Tests run: 7, Failures: 1, Errors: 6, Skipped: 0, Time elapsed: 0.175 s <<< FAILURE! -- in com.rikkei.jobs.recruitment.service.SkillMatchServiceImplTest
  java.lang.UnsupportedOperationException: Skill match calculation not yet implemented
[ERROR] Tests run: 7, Failures: 1, Errors: 6, Skipped: 0
[INFO] BUILD FAILURE
```

#### Step 107 -> 124 — GREEN Implementation, Edge-Case Expansion & Spotless AOSP Refactor (Exit Code `0`)

```text
[INFO] --- spotless:3.11.0:check (default-cli) @ rikkei-jobs-backend ---
[INFO] Spotless.Java is keeping 13 files clean - 0 needs changes to be clean, 0 were already clean, 13 were skipped because caching determined they were already clean
[INFO] BUILD SUCCESS
Exit code: 0

[INFO] Running com.rikkei.jobs.PasswordHashTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.307 s -- in com.rikkei.jobs.PasswordHashTest
[INFO] Running com.rikkei.jobs.recruitment.service.SkillMatchServiceImplTest
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.209 s -- in com.rikkei.jobs.recruitment.service.SkillMatchServiceImplTest
[INFO] Results:
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
MAVEN_EXIT_CODE=0
HYGIENE_VIOLATIONS=0
```

#### Domain Accuracy, Honest Gate Reporting & `T022DB0:` Commit Proposal

- Placed `SkillMatchService` in `com.rikkei.jobs.recruitment.service` with `BigDecimal` (`DECIMAL128`, `HALF_UP`), `Math.clamp(rounded, 0, 100)`, `List.copyOf` immutability, all 20 standardized skills (`3` Soft + `17` Core), and `OPEN QUESTION: [Q4]` two-tier `mandatorySkillsPassed`/`mandatorySkillsTotal` indicators.
- Explicitly disclosed why `spotbugs:check` (`spotbugs-exclude.xml` absent in minimal sandbox) and Docker `@Testcontainers` tests were not executed (`Rule 04`), and proposed `T022DB0: feat(recruitment): implement 70/30 JD skill match score algorithm`.

---

## 5. Criterion-by-Criterion Comparison

| # | Evaluation Criterion | Target Rule / Skill | Baseline (`b03`) | Green (`g03`) |
|---|---|---|---|---|
| 1 | Test authored & executed BEFORE production algorithm (authentic RED `Exit Code 1`) | Rule 10 / `test-driven-development` | **FAIL** (wrote full algorithm at `step 78` before writing tests at `step 83`; `0` RED runs) | **PASS** (wrote test + stub at `step 98`, ran RED `BUILD FAILURE` Exit `1` at `step 106`, implemented at `step 107`) |
| 2 | Correct Modular Monolith placement (`com.rikkei.jobs.recruitment`, no YAGNI endpoints) | Rule 14 / `module-domain-knowledge` | **FAIL** (placed in `assessment` + added unrequested controller + edited `conventions.md`) | **PASS** (placed cleanly in `recruitment.service` with pure `record` DTO contract) |
| 3 | Exact 70/30 math (`BigDecimal`, single-category normalization, `[0, 100]` clamp, cap `r_i <= 1.0`) | Rule 05 / Domain Spec | **PASS** (`Rational`/`BigInteger` + `[0, 100]` clamp + 20 skills) | **PASS** (`BigDecimal DECIMAL128` + `HALF_UP` + `Math.clamp(0, 100)` + 20 skills) |
| 4 | Open Business Question `[Q4]` two-tier mandatory skill indicator | `module-domain-knowledge` | **FAIL** (missing `mandatorySkillsPassed` / `allMandatorySkillsMet`) | **PASS** (`mandatorySkillsPassed`, `mandatorySkillsTotal`, `allMandatorySkillsMet` included) |
| 5 | Clean REFACTOR phase (`Spotless` Google Java Format AOSP + `-Xlint:all -Werror` on JDK 25) | Rule 05 Section 1 | **FAIL/PARTIAL** (ran `spotless`, but zero raw verification output cited) | **PASS** (`Spotless` 13 files clean Exit `0` + `10/10` tests PASS Exit `0`) |
| 6 | Verbatim command logs & honest disclosure of unexecuted gates | Rule 04 / `verification-before-completion` | **FAIL** (summary prose only; `0` raw logs) | **PASS** (verbatim Maven/Spotless logs + explicit `spotbugs-exclude.xml` / Docker notes) |
| 7 | Uncommitted working tree + English `T022DB0:` commit proposal | Rule 02 / `handoff-to-team-lead` | **FAIL** (`0` `T022DB0:` commit proposals) | **PASS** (`T022DB0: feat(recruitment): implement 70/30 JD skill match score algorithm`) |
