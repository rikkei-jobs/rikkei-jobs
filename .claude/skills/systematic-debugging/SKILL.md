---
name: systematic-debugging
description: Use when diagnosing failing tests, runtime exceptions, unexpected system behavior, performance regressions, or quality gate errors.
---

# Systematic Debugging

## 1. Overview

The `systematic-debugging` skill enforces a 4-phase scientific debugging discipline across the Rikkei Jobs monorepo. It replaces trial-and-error guesswork ("shotgun debugging") with deterministic reproduction, stack localization, hypothesis isolation, and surgical root-cause remediation.

## 2. When to Use / When NOT to Use

### When to Use

- When confronting failing unit, integration, or slice tests.
- When diagnosing unexpected runtime exceptions, HTTP 500 errors, or HTTP 403 access denials.
- When resolving failures in project quality gates (`check.ps1` / `check.sh`).
- When investigating performance regressions, memory leaks, or N+1 query warnings.

### When NOT to Use

- When implementing new features from an approved roadmap where all baseline tests are green (use `test-driven-development` and `executing-plans`).
- When exploring architectural design options (use `brainstorming-before-building`).

## 3. Step-by-Step Process

1. **Phase 1 — REPRODUCE (Create Deterministic Test Case)**:
   - Capture the verbatim error output, complete stack trace, input parameters, and environment state.
   - Construct a minimal, automated reproduction test (a single JUnit test in `backend/src/test/` or a Vitest test in `frontend/src/`) that fails reliably (100% reproduction rate).
   - Never proceed to edit production source until the failure can be triggered on demand by running a single command.

2. **Phase 2 — LOCALIZE (Pinpoint Exact Stack Frame)**:
   - Walk backwards through the stack trace to distinguish framework internals (Spring, Hibernate, React) from application code (`com.rikkei.jobs.*` or `src/features/*`).
   - Pinpoint the exact file, class, method, and source line where the invalid state originates.
   - Inspect application logs: review structured ECS JSON output formatted according to `backend/src/main/resources/application-prod.yml` (`logging.structured.format.console: ecs`) or browser developer console errors.

3. **Phase 3 — ISOLATE HYPOTHESIS (Scientific Elimination)**:
   - Formulate 1-2 clear, falsifiable hypotheses explaining *why* the localized code produced the invalid state.
   - Design a minimal diagnostic probe or temporary assertion to test each hypothesis in isolation.
   - Confirm or disprove the hypothesis based solely on empirical log or test output.

4. **Phase 4 — ROOT CAUSE FIX (Surgical Remediation)**:
   - Apply a surgical fix that resolves the root defect at its source.
   - **STRICT PROHIBITION**: Never apply cosmetic symptom band-aids. For example:
     - Do not swallow errors using `try { ... } catch (Exception e) {}`.
     - Do not sprinkle blind `if (obj != null)` guards to hide uninitialized entity relations.
     - Do not increase query limits or timeout thresholds to mask an N+1 query defect.
   - Re-run the reproduction test: verify that it immediately transitions from RED to GREEN (exit code 0).
   - Re-run the entire module test suite and gate scripts to verify zero collateral regressions.

5. **Clean Up Diagnostic Artifacts**:
   - Remove temporary debug print statements, exploratory probes, and artificial logging lines before concluding the workflow.

## 4. Iron Laws

- **Law 1: Zero Shotgun Debugging**: Never change multiple arbitrary lines of code simultaneously hoping the bug will disappear. Every modification must be tied to a proven hypothesis.
- **Law 2: No Fix Without a Proven Root Cause**: Never patch production code until the failure mechanism is understood and reproducibly confirmed.

## 5. Red Flags

- Wrapping failing blocks in empty `catch (Exception e) {}` handlers to silence exceptions.
- Modifying test assertions to accommodate buggy behavior rather than correcting the bug.
- Re-running a failing test three times and declaring it "flaky" without investigating concurrency or state leakage.
- Leaving `System.out.println` or `console.log` statements scattered in production classes.

## 6. Rationalization Table

| Excuse (Agent Rationalization) | Reality (Engineering Discipline) |
|---|---|
| "Adding a null check here stops the error immediately." | Adding blind null checks masks why the state was uninitialized, causing silent data corruption and subtle failures in downstream services. |
| "This failure is just a flaky test; re-running CI will pass." | In a hermetic test environment, non-deterministic failures indicate race conditions, uncleaned ThreadLocals, or shared database state. |
| "Let me try changing this configuration; if it doesn't work I will change it back." | Random tweaks invalidate reproducible diagnostics and introduce latent configuration bugs that are hard to untangle. |

## 7. Verification Checklist

- [ ] Constructed a deterministic, automated reproduction test before touching production code.
- [ ] Localized the exact line and method where the defect originates.
- [ ] Proved the root-cause hypothesis before implementing the fix.
- [ ] Fix addresses the core defect rather than masking the symptom with try-catch or null checks.
- [ ] Reproduction test passes (GREEN) and full test suite suffers zero regression.
- [ ] All temporary diagnostic probes, logs, and comments removed.

## 8. Rikkei Jobs Specifics

- Backend logging configuration: `backend/src/main/resources/application-prod.yml` (structured ECS JSON logging via `logging.structured.format.console: ecs`).
- Local development troubleshooting guide: `docs/02-local-development-troubleshooting.md`.
- Gate synchronization script: `node scripts/check-gate-sync.mjs`.
- Single backend test command: `cd backend && ./mvnw test -Dtest=ClassName#methodName`.
- Single frontend test command: `npm --prefix frontend run test -- path/to/file.test.tsx`.
