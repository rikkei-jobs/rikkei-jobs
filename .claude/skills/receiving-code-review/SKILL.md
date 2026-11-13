---
name: receiving-code-review
description: Use when receiving, evaluating, and addressing code review feedback, critique, or change requests from the Team Lead or automated reviewers.
---

# Receiving Code Review

## 1. Overview

The Receiving Code Review skill establishes a disciplined, objective, and professional protocol for processing code review feedback from the Team Lead, peer reviewers, or automated evaluation agents within the Rikkei Jobs monorepo. It replaces defensive rationalization with empirical analysis, structured triage, and verified remediation.

Code review feedback is an essential collaborative mechanism for maintaining high architectural standards, preventing modular boundary erosion, and enforcing code hygiene. An agent receiving feedback must engage constructively, address underlying root causes rather than superficial symptoms, and verify every fix with automated regression checks before responding.

## 2. When to Use and When NOT to Use

### When to Use

- Upon receiving comments, change requests, or critique on a proposed pull request, branch review, or task submission.
- When an automated review or audit gate (e.g., CodeRabbit, Sonar, GitHub Actions PR checks) flags potential defects, security risks, or code smell violations.
- When addressing feedback during collaborative pair-programming or subagent handoff reviews.

### When NOT to Use

- When preparing an initial submission for review (use `requesting-code-review` instead).
- Before receiving any review feedback.
- During initial task exploration or implementation planning prior to code submission.

## 3. Step-by-Step Process

### Step 1: Read and Synthesize Feedback Completely

1. Read through all review comments thoroughly before modifying any code.
2. Maintain emotional detachment: treat feedback as technical data points focused on code quality, security, and maintainability.
3. Clarify any ambiguous points immediately rather than making assumptions about reviewer intent.

### Step 2: Categorize and Triage Review Items

Group each feedback item into one of four technical priority tiers:

1. **Tier 1 (Blockers / Security / Invariant Violations)**:
   - Security vulnerabilities (e.g., missing `@PreAuthorize`, SQL injection risk, secret exposure).
   - Core rule breaches (e.g., direct cross-module database foreign keys, unauthorized host tool usage, git write operations).
   - Critical bugs, data loss hazards, or broken automated quality gates.
   - *Action*: Mandatory immediate resolution before any other work.
2. **Tier 2 (Architectural & Design Drift)**:
   - Modular Monolith boundary violations (Rule 14).
   - Persistence performance hazards: N+1 query patterns, unpaginated collections, missing database indexes (Rule 13).
   - Frontend Anti-AI Look non-compliance: generic animations, missing design tokens, uncurated icons (Rule 09).
   - *Action*: Redesign the affected component or discuss technical trade-offs with the reviewer.
3. **Tier 3 (Testing & Hermeticity Deficiencies)**:
   - Missing unit or integration test coverage for edge cases.
   - Non-hermetic test behavior (e.g., hardcoded ports, reliance on external network, `Thread.sleep()`).
   - *Action*: Add rigorous JUnit 5 / Vitest tests following the Red-Green TDD pattern.
4. **Tier 4 (Style, Documentation & Naming Conventions)**:
   - Spotless formatting issues, cspell spelling errors, markdownlint warnings, comment clarity improvements.
   - *Action*: Apply minimal, clean updates.

### Step 3: Implement Remediation with TDD

1. For logic defects, bug reports, or unhandled edge cases, write a failing automated test that reproduces the reviewer's finding.
2. Apply the minimal necessary production code changes to turn the failing test green.
3. Ensure no unrelated code or "while-I-am-here" refactoring is introduced.
4. Re-format affected files using the project formatter (`cd backend && ./mvnw spotless:apply` for Java, Prettier for TypeScript).

### Step 4: Re-run Full Verification Gate Suite

1. Never assume a small fix is safe without running the full verification suite.
2. Execute `powershell -File .\check.ps1` (or `./check.sh`).
3. Verify that all 25 active runtime quality gates pass with exit code 0.
4. Confirm zero regressions across all other modules.

### Step 5: Formulate Professional, Traceable Responses

1. Formulate a clear, respectful, point-by-point response to each review comment:
   - State clearly what was changed, citing the exact file path and line numbers.
   - Explain the technical rationale if a non-obvious approach was chosen.
   - Include test command results proving that the remediation works.
2. In cases of technical disagreement:
   - Explain the counter-perspective objectively using verifiable evidence (benchmarks, official documentation citations, architectural rules).
   - Avoid emotional or defensive rhetoric.
   - Acknowledge that the human Team Lead has the final architectural decision authority.

## 4. Iron Laws

- **Iron Law 1 (No Unverified "Fixed" Claims)**: An agent must NEVER mark a review comment resolved or claim "Fixed" without having executed the corresponding test and the full quality gate suite (`check.ps1` / `check.sh`) to prove resolution.
- **Iron Law 2 (Zero Defensive Retaliation)**: All feedback must be received with professional objectivity. Defending flawed code with excuses or dismissing reviewer suggestions without empirical proof is strictly forbidden.
- **Iron Law 3 (Full Scope Preservation)**: Review remediation must strictly address the reviewer's findings. Do not introduce unauthorized scope expansions, unrelated dependency updates, or unapproved architectural refactorings.

## 5. Red Flags

- Marking comments as resolved without altering code or providing technical justification.
- Replying "Fixed!" within seconds without having run the test suite.
- Applying superficial band-aids (such as adding `try/catch` to swallow exceptions or `// @ts-ignore` to suppress type errors).
- Arguing emotionally with the reviewer instead of presenting objective technical evidence.
- Silently ignoring complex feedback comments while only addressing trivial typos.

## 6. Rationalization Table

| Agent Rationalization | Engineering Reality |
|---|---|
| "The reviewer's suggestion is minor; I will just reply 'Done' and fix it later." | Unverified promises cause defect leakage into production. Every change must be in place and verified before reporting resolution. |
| "The reviewer is wrong about this N+1 query; the dataset in development is small anyway." | Small development datasets mask query traps. On production PostgreSQL databases, an unindexed N+1 query brings down database connection pools. The reviewer is enforcing Rule 13. |
| "I can fix this type error faster by casting to `any` or using `@ts-ignore`." | Type-safety escapes degrade maintainability and violate TypeScript strict-mode standards (Rule 08). Define proper types and DTO contracts. |
| "The reviewer questioned my architecture, so I should defend my original code at all costs." | Code review is not a contest of egos. Code is a shared asset of Rikkei Jobs. Welcome critique that strengthens robustness. |

## 7. Verification Checklist

- [ ] All review comments reviewed, triaged, and addressed without omission.
- [ ] Logic bug fixes validated with reproducing automated tests.
- [ ] Code formatting verified with `cd backend && ./mvnw spotless:check` and frontend linters.
- [ ] Full quality gate runner (`check.ps1` or `check.sh`) passed with exit code 0.
- [ ] Point-by-point response authored with exact file and line references.
- [ ] Zero unapproved scope expansions or unrelated refactorings included.

## 8. Rikkei Jobs Specifics

- Core rules governing review compliance:
  - Enterprise rules: `agent-config/rules/` (Rules 01 through 16).
  - Rule 04 (Honest Verification): zero fake pass.
  - Rule 07 (Security RBAC): mandatory `@PreAuthorize` on all endpoints.
  - Rule 13 (Persistence Performance): strict query efficiency and pagination.
  - Rule 14 (Module Boundaries): no direct cross-module JPA joins or repository calls.
- Quality gate scripts:
  - Windows: `powershell -File .\check.ps1`
  - Linux/CI: `./check.sh`
- Code formatting tools:
  - Java: `cd backend && ./mvnw spotless:apply`
  - TypeScript/JSON: `npm --prefix frontend run lint`
- Ultimate decision maker: Human Team Lead.
