---
name: requesting-code-review
description: Use when preparing changes for code review, summarizing modifications, architectural decisions, and verification evidence.
---

# Requesting Code Review

## 1. Overview

The Requesting Code Review skill defines the professional standard for packaging, documenting, and presenting code modifications to human reviewers and Team Leads within the Rikkei Jobs monorepo. It ensures that every review request is preceded by rigorous self-auditing, is accompanied by indisputable empirical verification evidence, respects module boundaries, and adheres to design standards such as the Anti-AI Look rubric.

A code review request is not a dump of raw diffs. It is an engineering dossier that respects the reviewer's cognitive bandwidth, articulates technical rationale, highlights edge cases, and provides verifiable proof that all automated quality gates pass.

## 2. When to Use and When NOT to Use

### When to Use

- When all code modifications for an assigned task or feature are complete, and all 25 active quality gates pass with exit code 0.
- When preparing a pull request description or handoff review dossier for the Team Lead.
- When an intermediate architectural milestone requires peer review before proceeding to subsequent implementation phases.

### When NOT to Use

- When tests are failing or quality gates have not yet been executed (invoke `verification-before-completion` first).
- While still actively implementing or refactoring code.
- When addressing review comments received from a previous review round (invoke `receiving-code-review` instead).

## 3. Step-by-Step Process

### Step 1: Self-Audit the Full Workspace Diff

1. Run `git diff` against the base target branch (`develop`) to inspect every single modified, added, or deleted line.
2. Conduct a thorough code hygiene check:
   - Eliminate debugging artifacts: remove `console.log`, `System.out.println`, `debugger`, and temporary logging statements.
   - Remove dead code, commented-out code blocks, and unused import statements.
   - Check that variable names, method signatures, and class names adhere to project naming conventions.
   - Ensure all added comments explain *why* non-obvious logic was used, never *what* self-explanatory code does.

### Step 2: Validate Domain and Architecture Compliance

1. Backend Compliance (Rules 05, 06, 07, 13, 14, 15, 16):
   - Verify strict package-by-module boundaries across the 7 modules (`candidate`, `company`, `internship`, `assessment`, `learning`, `recruitment`, `ai`) and `identity`.
   - Ensure zero cross-module database entity joins or foreign key annotations; communicate via public API services or application events.
   - Verify JPA query safety: ensure no unconstrained `findAll()` queries, enforce 1-based pagination, and verify that JOIN FETCH or `@EntityGraph` is used to prevent N+1 query traps.
   - Verify RBAC authorization: confirm all REST endpoints are protected with `@PreAuthorize` matching the 5 project roles (`ADMIN`, `EMPLOYER`, `CANDIDATE`, `UNIVERSITY`, `STUDENT`).
2. Frontend Compliance (Rules 08, 09):
   - Evaluate the user interface against the Anti-AI Look Rubric in `docs/design/DESIGN_SYSTEM.md`.
   - Score each criterion on a 0-2 scale: zero emoji in UI, zero purple-blue gradient clichés, zero uncurated icon soup, purposeful motion with `prefers-reduced-motion` compliance, and calculated WCAG 2.2 AA contrast ratios.

### Step 3: Assemble Empirical Verification Evidence

1. Run the project verification gate: `powershell -File .\check.ps1` (or `./check.sh`).
2. Collect the raw console output showing that all 25 active runtime quality gates passed.
3. Record the exact test counts (e.g., number of unit, integration, and contract tests executed) and execution time.

### Step 4: Author the Code Review Dossier

1. Structure the review request using the standard enterprise template:
   - **Header / Proposed Commit Title**: Prefix with task identifier `T022DB0: <concise English summary>`.
   - **Context and Intent**: One-paragraph explanation of the problem solved and the business value delivered.
   - **Architectural Decisions & Trade-offs**: Technical justification for design patterns, database choices, or algorithm selections.
   - **File Manifest**: Categorized list of modified files with role summaries (e.g., Migration, Domain Model, Service, REST Controller, UI Slice).
   - **Anti-AI Rubric Scorecard**: Self-audit score table if frontend files were touched.
   - **Verification Evidence**: Raw gate command outputs and test execution summaries.
   - **Reviewer Focus Areas & Edge Cases**: Explicit pointers to high-risk areas, concurrency considerations, or boundary conditions requiring meticulous scrutiny.

## 4. Iron Laws

- **Iron Law 1 (No Review on Red Gates)**: Never request a code review while any test, linter, or quality gate is failing or unverified. Submitting broken code for review shifts the debugging burden to reviewers and violates professional discipline.
- **Iron Law 2 (Mandatory Self-Audit)**: The author must review 100% of the diff before requesting an external review. Zero debugging cruft (`console.log`, commented-out blocks) may appear in a submitted diff.
- **Iron Law 3 (Strict Conventional Prefix)**: All proposed pull request titles and commit proposals must be prefixed with `T022DB0:` and written in English.

## 5. Red Flags

- Submitting a diff exceeding 500 lines without breaking it down into logical phases or modules.
- Writing PR descriptions like "Updated code" or "Fixed bugs" without architectural rationale or file manifests.
- Requesting review on frontend changes without the completed Anti-AI Look scorecard.
- Submitting code that crosses backend module boundaries via direct repository access instead of module public interfaces.
- Leaving `TODO` or `FIXME` comments in the code under review without an associated tracking issue.

## 6. Rationalization Table

| Agent Rationalization | Engineering Reality |
|---|---|
| "The reviewer can see all changes directly in git diff, so an architectural summary is redundant." | Diffs show *what* changed, but fail to explain *why* choices were made. Reviewers need architectural rationale to identify deep structural risks. |
| "The Anti-AI look rubric is subjective; my UI looks good enough." | Anti-AI look criteria are objective (zero emoji, WCAG 2.2 contrast numbers, motion curve tokens, dense vs airy role ergonomics). Skipping the rubric risks regression into generic AI templates. |
| "I left console.log statements so the reviewer can trace execution during testing." | Production-ready code does not contain debug logging. Rikkei Jobs uses structured SLF4J logging backend and clean state inspection frontend. Debug cruft signals unready work. |
| "Running the entire check suite takes too long; unit tests are enough for this review." | Unit tests cannot catch broken Flyway migrations, cyclic module dependencies, or documentation version drift. Reviewers rely on gate certification. |

## 7. Verification Checklist

- [ ] Complete `git diff` reviewed line-by-line; zero debug prints, dead code, or unformatted lines.
- [ ] Backend module isolation verified (zero direct cross-module entity/repo dependencies).
- [ ] Database queries audited for N+1 hazards and mandatory pagination.
- [ ] Endpoints verified for `@PreAuthorize` role access control.
- [ ] Frontend Anti-AI Look scorecard completed with passing scores (if UI modified).
- [ ] `check.ps1` or `check.sh` executed cleanly with exit code 0.
- [ ] Proposed PR/commit title formatted as `T022DB0: <description>`.
- [ ] File manifest and review focus areas clearly articulated in the dossier.

## 8. Rikkei Jobs Specifics

- Task prefix convention: `T022DB0:` (mandatory for all commit and PR titles).
- Target delivery branch: `develop`.
- Anti-AI Look specification and rubric: `docs/design/DESIGN_SYSTEM.md`.
- Backend architecture guidelines:
  - Architecture overview: `docs/01-architecture-overview.md`.
  - Rule 13 (Data access performance): `agent-config/rules/13-backend-data-access-performance.md`.
  - Rule 14 (Module boundaries): `agent-config/rules/14-backend-module-boundaries.md`.
- Quality gate execution:
  - PowerShell runner: `powershell -File .\check.ps1`
  - Shell runner: `./check.sh`
- Required verification passes: 25 active runtime gates.
