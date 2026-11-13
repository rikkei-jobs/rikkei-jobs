---
name: executing-plans
description: Use when executing an approved implementation plan step-by-step with continuous verification and progress logging.
---

# Executing Plans

## 1. Overview

The `executing-plans` skill enforces disciplined, incremental implementation of an approved roadmap. It ensures tasks are executed strictly in order, verifies every step with automated test commands immediately upon completion, maintains a continuous liveness heartbeat via `progress.md`, and invokes an emergency halt condition whenever unexpected drift or failures arise.

## 2. When to Use / When NOT to Use

### When to Use

- When carrying out tasks defined in an approved implementation plan authored under `writing-implementation-plans`.
- When tracking progress through multi-phase engineering tasks across the monorepo.

### When NOT to Use

- During initial requirements exploration or technical debates (use `brainstorming-before-building`).
- While authoring the roadmap itself (use `writing-implementation-plans`).
- When diagnosing an unexpected regression or obscure bug (use `systematic-debugging`).

## 3. Step-by-Step Process

1. **Verify Starting State and Preconditions**:
   - Check the working tree status via `git status --short` to ensure no dirty state or stray unmanaged files exist.
   - Confirm baseline health: verify that current unit tests and lint checks in the target module pass cleanly before applying edits.

2. **Execute Defensive Backup for High-Risk Files**:
   - If the upcoming step modifies critical existing files, create a backup copy in the OS temp directory (`$env:TEMP` on Windows, `/tmp` on Linux).
   - Compute and log the SHA-256 hash of the baseline file to enable instant, zero-git restoration if needed.

3. **Apply Minimal, Surgical Code Changes**:
   - Make only the exact changes scheduled for the current task.
   - Adhere strictly to the minimal change principle: no "while I am here" refactorings, no reformatting of untouched methods, and no deletion of unrelated comments.

4. **Run Immediate Step Verification**:
   - Execute the specific automated verification command assigned to the active task (e.g., `cd backend && ./mvnw test -Dtest=...` or `npm --prefix frontend run test -- ...`).
   - Inspect raw stdout and stderr; confirm that the command terminates with exit code 0 and passes all assertions.

5. **Enforce the Drift Halt Condition**:
   - If the verification command fails, or if code inspection reveals that the codebase differs fundamentally from the plan assumptions: **STOP IMMEDIATELY**.
   - Do not attempt to gloss over the issue or jump ahead to the next task in the hope that later steps will fix it.
   - Diagnose the root cause using `systematic-debugging` or request an explicit plan amendment from the Team Lead.

6. **Log Progress and Maintain Liveness Heartbeat**:
   - Update `progress.md` in the agent state folder after completing each step.
   - Record the finished task description and a fresh UTC timestamp: `Last visited: [YYYY-MM-DDTHH:MM:SSZ]`.
   - Maintaining this heartbeat prevents multi-agent orchestrators from assuming the agent has hung or timed out.

7. **Iterate Sequentially**:
   - Advance to step N+1 only after step N is green and documented.
   - Continue sequentially until 100% of the plan tasks are fulfilled.

8. **Execute Full Quality Gate Suite**:
   - Run the full project gate runner (`powershell -File .\check.ps1` on Windows or `./check.sh` on Linux).
   - Ensure all 25 active runtime gates exit with status 0 before initiating handoff.

## 4. Iron Laws

- **Law 1: Never Advance Past a Failing Step**: Never proceed to task N+1 while task N fails verification. Red builds must be resolved immediately at the point of origin.
- **Law 2: Halt Immediately on Plan Drift**: Any significant discrepancy between the codebase and the plan requires an immediate work halt and architectural re-alignment.

## 5. Red Flags

- Batching three or four plan tasks together before running compiler or test verification.
- Ignoring compiler deprecation warnings or linter alerts under the assumption they will be cleaned up later.
- Failing to update `progress.md` across extended execution periods.
- Attempting to bypass a failing test step by modifying the test to expect incorrect output.

## 6. Rationalization Table

| Excuse (Agent Rationalization) | Reality (Engineering Discipline) |
|---|---|
| "This test failure is unrelated to my task; I will proceed to the next step." | "Unrelated" test breaks often reveal unintended coupling or broken shared test containers. Proceeding compounds errors. |
| "Updating progress.md after every step slows down execution." | `progress.md` is the heartbeat of autonomous multi-agent coordination. Omitting updates triggers supervisor watchdog kills. |
| "I am confident this change compiles; running the Maven daemon takes too long." | Unchecked changes frequently contain missing imports, syntax oversights, or type mismatches. Empirical execution is mandatory. |

## 7. Verification Checklist

- [ ] Automated verification command executed immediately after each task.
- [ ] Raw command output recorded and verified with exit code 0.
- [ ] Updated `progress.md` with UTC timestamp after each meaningful task.
- [ ] Work halted immediately upon any unexpected test failure or plan deviation.
- [ ] Full quality gate runner (`check.ps1` / `check.sh`) executed cleanly at plan completion.

## 8. Rikkei Jobs Specifics

- Agent liveness heartbeat: `.agents/teamwork/.../progress.md`.
- Operating system temp directory: `$env:TEMP` (Windows PowerShell), `/tmp` (Linux bash).
- Project gate scripts: `powershell -File .\check.ps1` or `./check.sh`.
- Backend single-test runner: `cd backend && ./mvnw test -Dtest=ClassName#methodName`.
- Frontend single-test runner: `npm --prefix frontend run test -- path/to/file.test.tsx`.
