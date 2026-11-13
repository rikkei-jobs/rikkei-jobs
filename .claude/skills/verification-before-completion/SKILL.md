---
name: verification-before-completion
description: Use when completing any task, feature, refactoring, or bug fix before declaring completion or handing off to the Team Lead.
---

# Verification Before Completion

## 1. Overview

The Verification Before Completion skill establishes an uncompromising, evidence-based quality gatekeeper for all AI coding agents working on the Rikkei Jobs monorepo. It enforces the foundational principle of empirical verification: an agent must never claim completion, declare success, or hand off work without executing the actual automated verification gates, capturing raw output evidence, and confirming zero regressions.

Assumptions, theoretical correctness, or past test runs do not constitute evidence. Every deliverable must be mechanically proven in the current workspace state against the repository's strict quality standards.

## 2. When to Use and When NOT to Use

### When to Use

- Immediately upon finishing the code modifications for any assigned task, subtask, feature, refactoring, or bug fix.
- Before transitioning to `requesting-code-review` or `handoff-to-team-lead`.
- Whenever declaring a phase complete within an execution plan.
- After resolving code review feedback to verify that fixes resolved the issue without causing collateral regressions.

### When NOT to Use

- In the middle of an active Red-Green TDD development cycle where tests are intentionally failing.
- While actively writing an implementation plan before any code has been altered.
- During exploratory codebase inspection where no modifications to files have occurred.

## 3. Step-by-Step Process

### Step 1: Inspect Working Tree Cleanliness

1. Execute `git status --short` to inspect modified, added, and untracked files.
2. Confirm that only files within the authorized scope of work were touched.
3. Detect and remove any temporary files, scratch scripts, OS artifacts, or misplaced debug logs.
4. Verify that no application source files (`backend/`, `frontend/`, `mock/`) were modified if the task scope was restricted to tooling or documentation.

### Step 2: Execute Targeted Unit and Slice Tests

1. For backend modifications:
   - Run affected JUnit 5 tests via `cd backend && ./mvnw test -Dtest=TargetTestClass`.
   - Confirm hermetic test execution with Testcontainers PostgreSQL (`postgres:18.6-alpine`) without hardcoded ports.
   - Verify that all assertion blocks execute cleanly and exit code is 0.
2. For frontend modifications:
   - Run Vitest component tests via `npm --prefix frontend run test -- path/to/target.test.tsx`.
   - Run TypeScript typechecking via `npm --prefix frontend run typecheck`.
   - Ensure zero TypeScript compiler errors under strict mode.

### Step 3: Execute the Full Project Quality Gate Suite

1. Run the project quality gate script appropriate for the current host environment:
   - Windows PowerShell: `powershell -File .\check.ps1`
   - Unix/Linux/macOS Bash: `./check.sh`
2. Monitor all 25 active runtime quality gates across backend compilation, Spotless formatting check, static analysis, frontend linting, Vitest suites, and documentation integrity.
3. Observe raw console streams and verify that the gate runner outputs a clean exit code 0.

### Step 4: Verify Agent Configuration Parity and Gate Synchronization

1. If agent rules, skills, or tooling were authored or modified:
   - Run `node scripts/sync-agent-config.mjs --check` to verify byte-identical parity across canonical sources, `.claude/`, and `.gemini/`.
   - Run `node scripts/validate-agent-config.mjs` to mechanically validate YAML frontmatter, line limits (<=500 for skills, <=150 for rules), forbidden patterns (zero emoji, zero hardcoded secrets, zero commit commands), and path references.
   - Run `node scripts/check-gate-sync.mjs` to ensure total gate count consistency (25 active runtime gates, 28 definitions) across local runners and `.github/workflows/ci.yml`.

### Step 5: Capture and Triage Raw Evidence

1. Extract exact command strings, execution timestamps, duration, and terminal output excerpts.
2. If any gate fails:
   - Halt handoff immediately. The task is NOT complete.
   - Transition to `systematic-debugging` to diagnose the root cause.
   - Never suppress, bypass, or comment out a failing test or linter rule.
3. If all gates pass:
   - Package the raw evidence into the completion summary or handoff dossier.

## 4. Iron Laws

- **Iron Law 1 (Zero Fake Pass)**: An agent must NEVER claim a test or check passed without executing the command in the current session and observing exit code 0. Fabricating verification output, reporting numbers not observed, or claiming "verified by inspection" is an immediate integrity violation.
- **Iron Law 2 (Complete Suite Execution)**: Passing a localized unit test is necessary but never sufficient. The full automated quality suite (`check.ps1` / `check.sh`) must be executed prior to completion.
- **Iron Law 3 (Honest Non-Execution Reporting)**: If a specific gate cannot run due to an uninstalled host dependency or blocked environment, the agent must explicitly report "NOT VERIFIED: [Gate Name] - [Precise Reason]" rather than assuming or asserting success.

## 5. Red Flags

- Declaring "All tests pass successfully" without providing the command output and exit code.
- Running tests against an earlier commit or state, then modifying code and skipping re-verification.
- Bypassing `check.ps1` or `check.sh` because "the change was only documentation or markdown".
- Disabling, modifying, or commenting out assertions in tests to force a green result.
- Rationalizing a gate failure as "pre-existing flaky behavior" without empirical proof.

## 6. Rationalization Table

| Agent Rationalization | Engineering Reality |
|---|---|
| "I only changed one line of CSS / markdown, so running the full check script is unnecessary." | Documentation edits frequently trigger markdownlint, cspell, or validator failures. CSS edits frequently cause layout regression or fail automated type/lint checks. Running the suite is non-negotiable. |
| "I ran the test 5 minutes ago before adding comments, so it is definitely still green." | Last-minute additions often introduce syntax errors, unexpected characters, or broken imports. Re-verification on the exact final state is mandatory. |
| "This test failure is unrelated to my task; it must be an existing bug." | Unless you ran a baseline check prior to modifications proving the pre-existing failure, any failing test in your workspace is your responsibility to isolate and resolve. |
| "The gate output is too long to include; stating 'PASS' is cleaner." | Verification requires auditability. Reviewers and parent orchestrators require raw evidence (command, exit code, key output lines) to trust the handoff. |

## 7. Verification Checklist

- [ ] `git status --short` executed; working tree contains only expected files.
- [ ] Targeted tests for modified components pass with exit code 0.
- [ ] `powershell -File .\check.ps1` (or `./check.sh`) executed to completion with exit code 0.
- [ ] Agent configuration sync verified via `node scripts/sync-agent-config.mjs --check` if config was touched.
- [ ] Agent config validation verified via `node scripts/validate-agent-config.mjs` if config was touched.
- [ ] Gate synchronization verified via `node scripts/check-gate-sync.mjs` if gates were touched.
- [ ] Raw command invocations, exit codes, and output summaries documented in the handoff report.
- [ ] Zero lint, formatting, or compiler warnings left unresolved.

## 8. Rikkei Jobs Specifics

- Local verification runners:
  - Windows: `powershell -File .\check.ps1`
  - Linux/CI: `./check.sh`
- Agent configuration validation:
  - Synchronization check: `node scripts/sync-agent-config.mjs --check`
  - Structural validator: `node scripts/validate-agent-config.mjs`
  - Gate parity check: `node scripts/check-gate-sync.mjs`
- Backend testing command:
  - Full suite: `cd backend && ./mvnw clean test`
  - Single test: `cd backend && ./mvnw test -Dtest=PackageName.ClassName#methodName`
  - Code formatting: `cd backend && ./mvnw spotless:check`
- Frontend verification command:
  - Type checking: `npm --prefix frontend run typecheck`
  - Vitest test suite: `npm --prefix frontend run test`
  - Code linting: `npm --prefix frontend run lint`
- Quality gate count: Exactly 25 active runtime gates mapping to 21 CI jobs.
