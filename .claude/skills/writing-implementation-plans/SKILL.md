---
name: writing-implementation-plans
description: Use when authoring a structured, step-by-step, verifiable implementation plan for an approved design or feature request.
---

# Writing Implementation Plans

## 1. Overview

The `writing-implementation-plans` skill formalizes the authoring of comprehensive, step-by-step implementation roadmaps following an approved design. Plans translate high-level architecture into bite-sized, independently verifiable tasks (<= 200 lines of code change per task), establish concrete automated verification gates for every increment, and enforce a strict git-free rollback mechanism.

## 2. When to Use / When NOT to Use

### When to Use

- After completing `brainstorming-before-building` and achieving architectural consensus with the user or Team Lead.
- Before introducing or modifying production source files in `backend/`, `frontend/`, or `mock/`.
- When refactoring cross-module contracts, schema migrations, or security configurations.

### When NOT to Use

- For trivial, single-line documentation corrections or spelling fixes.
- When an approved implementation plan is already active and currently being executed (use `executing-plans`).

## 3. Step-by-Step Process

1. **Define Explicit Scope Boundaries**:
   - Write a crisp statement of the technical objective.
   - List explicit "In-Scope" items and explicit "Out-of-Scope" non-goals to prevent scope creep.

2. **Enumerate Affected Files and Monorepo Paths**:
   - Specify real, verified file paths across the repository:
     - Database migrations: `backend/src/main/resources/db/migration/V<N>__<description>.sql`.
     - Backend packages: `backend/src/main/java/com/rikkei/jobs/<module>/`.
     - Backend tests: `backend/src/test/java/com/rikkei/jobs/<module>/`.
     - Frontend features: `frontend/src/features/<feature>/`.
     - Mock server endpoints: `mock/server.js`.
     - Documentation: `docs/`.

3. **Structure Work into Logical Phases**:
   - Organize tasks chronologically to respect system dependency order:
     - **Phase 1: Contracts and Schema**: Database migrations (Flyway), API OpenAPI specifications, and Express mock endpoints.
     - **Phase 2: Domain and Data Access**: Entity mappings, DTO records, Spring Data repositories, and domain service business logic.
     - **Phase 3: Web and Security Layer**: REST controllers, ProblemDetail RFC 7807 error handling, and `@PreAuthorize` role enforcement.
     - **Phase 4: Frontend Slice**: API client bindings, TanStack Query hooks, UI components adhering to anti-AI design guidelines, and Vitest specs.
     - **Phase 5: Full Regression and Gate Verification**: Comprehensive execution of all project quality gates.

4. **Specify Individual Tasks with Precision**:
   - Keep each task small (maximum <= 200 lines of code modifications).
   - For every task, include:
     - **Files Affected**: Exact relative paths.
     - **Implementation Details**: Summary of methods, interfaces, or styling added.
     - **Automated Verification Command**: Single machine-executable command testing that specific step.
     - **Expected Outcome**: Exit code 0 and concrete success assertions.

5. **Establish a Safe Rollback Strategy**:
   - Define file backup procedures using the operating system temporary directory (`$env:TEMP` on Windows, `/tmp` on Linux).
   - Calculate and record SHA-256 hashes of original files before modification.
   - State the rollback recovery procedure: restore by copying files back from the temp directory and verifying matching hashes.
   - **STRICT PROHIBITION**: Never use `git checkout`, `git restore`, `git reset`, or `git stash` for rollback.

6. **Integrate Final Quality Gates**:
   - Mandate running `powershell -File .\check.ps1` (or `./check.sh`) at the end of Phase 5 to ensure all 25 active quality gates pass without regression.

## 4. Iron Laws

- **Law 1: Every Task Must Have an Executable Verification Command**: No task in an implementation plan may conclude with manual inspection or assumption. Each step must specify an automated test command.
- **Law 2: Git-Free Rollback Only**: Rollback strategies must rely strictly on external file backups (OS temp + SHA-256) and never execute destructive or write-oriented Git commands.

## 5. Red Flags

- Tasks with vague titles such as "Build backend service" without exact class names and file paths.
- Altering database tables without an accompanying Flyway migration file.
- Writing plans where single tasks exceed 200 lines of modified code.
- Including git-modifying commands (`git stash`, `git checkout`) in rollback instructions.

## 6. Rationalization Table

| Excuse (Agent Rationalization) | Reality (Engineering Discipline) |
|---|---|
| "Breaking work into 200-line tasks produces an excessively long plan." | Large tasks blur error boundaries. Small tasks isolate regressions instantly, making diagnosis fast and deterministic. |
| "I will run the compiler and tests once after all phases are finished." | Deferred verification compounds defects. A compiler error in Phase 1 invalidates subsequent code written in Phases 2, 3, and 4. |
| "Using git restore is much faster than copying files from OS temp." | Agents operate under strict read-only Git rules (Rule 02 & C-GIT-01). Executing git restore or checkout is an integrity violation that aborts the session. |

## 7. Verification Checklist

- [ ] Clear in-scope and out-of-scope boundaries defined.
- [ ] Monorepo file paths validated against actual directory structures.
- [ ] Tasks capped at <= 200 lines of code change per step.
- [ ] Every individual task possesses an automated verification command.
- [ ] Rollback strategy documents OS temp backup and SHA-256 checksum validation.
- [ ] Plan concludes with full quality gate execution (`check.ps1` / `check.sh`).

## 8. Rikkei Jobs Specifics

- Backend strict compilation: `cd backend && ./mvnw clean test-compile` (enforces `-Xlint:all -Werror`).
- Frontend strict type checking: `npm --prefix frontend run typecheck`.
- Flyway migration directory: `backend/src/main/resources/db/migration/`.
- Monorepo gate scripts: `powershell -File .\check.ps1` or `./check.sh`.
- Temp backup environment variables: `$env:TEMP` (Windows PowerShell), `/tmp` (Linux bash).
