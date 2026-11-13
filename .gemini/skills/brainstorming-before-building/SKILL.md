---
name: brainstorming-before-building
description: Use when exploring requirements, designing features, evaluating architectural trade-offs, or addressing ambiguities before writing implementation plans.
---

# Brainstorming Before Building

## 1. Overview

The `brainstorming-before-building` skill guides structured, Socratic requirements exploration and architectural decision-making. Before generating implementation plans or editing source code, agents must understand the domain context, uncover latent technical constraints, evaluate alternative designs with explicit trade-offs, and clarify unresolved ambiguities.

## 2. When to Use / When NOT to Use

### When to Use

- When receiving a new feature request, technical initiative, or capability enhancement.
- When proposing structural changes to the Spring Boot Modular Monolith or React feature slices.
- When specifications contain ambiguous logic, missing corner cases, or touch open business questions.

### When NOT to Use

- When fixing a narrow, reproducible bug where the root cause has already been isolated.
- When fixing simple documentation typos or static configuration adjustments.
- When an implementation plan has already been approved and execution is underway.

## 3. Step-by-Step Process

1. **Ingest Repository Architecture Context**:
   - Review architectural foundations in `docs/01-architecture-overview.md` to identify boundaries across the 7 domain modules (`candidate`, `company`, `internship`, `assessment`, `learning`, `recruitment`, `ai`).
   - Consult `docs/03-version-table.md` to confirm pinned framework versions (Java 25, Spring Boot 4.1.2, React 19.3.1, TypeScript 6.0.3, PostgreSQL 18.6).

2. **Inspect Existing Monorepo Code**:
   - Trace real packages in `backend/src/main/java/com/rikkei/jobs/` and slices in `frontend/src/features/`.
   - Verify existing public APIs, domain events, database tables, and security authorization annotations (`@PreAuthorize`) related to the target feature.

3. **Formulate 2-3 Concrete Architecture Options**:
   - Construct at least two distinct implementation strategies (e.g., synchronous domain service call vs asynchronous Spring ApplicationEvent; client-side aggregation vs backend DTO projection).
   - Evaluate trade-offs across:
     - Performance impact (query latency, connection pool pressure, memory consumption).
     - Modular Monolith boundary purity (loose coupling, avoiding cross-module foreign keys).
     - Testability (hermetic unit tests, Testcontainers integration).
     - Operational complexity and maintenance overhead.

4. **Audit Against Open Business Questions (`docs/05`)**:
   - Cross-reference the requirements against `docs/05-open-business-questions.md`.
   - **MANDATORY INTEGRITY DIRECTIVE**: Never invent business rules (e.g., candidate scoring algorithms, recruiter approval flows, token expiration intervals).
   - If a required detail is unaddressed, flag it explicitly as an "Open Question" and recommend a safe, configurable fallback.

5. **Engage the Team Lead / User**:
   - Formulate a concise technical proposal summarizing the problem, constraints, evaluated options with trade-offs, and an opinionated Senior Developer recommendation.
   - Present the proposal in the designated communication channel and await human alignment.

6. **Transition to Planning**:
   - Once the design is approved, hand off the architecture specification to `writing-implementation-plans`.

## 4. Iron Laws

- **Law 1: Never Fabricate Business Rules**: Agents must never invent domain logic absent from project specifications. Unclear business requirements must be recorded as Open Questions.
- **Law 2: No Implementation Plan Without Architecture Consensus**: Do not begin authoring detailed execution plans or writing code until the high-level design option is agreed upon.

## 5. Red Flags

- Immediately jumping into code implementation using the very first idea without exploring alternatives.
- Inventing domain logic, scoring percentages, or state machine transitions without citing project documentation.
- Proposing tight cross-module coupling (such as direct cross-module JPA entity relationships or database table joins).

## 6. Rationalization Table

| Excuse (Agent Rationalization) | Reality (Engineering Discipline) |
|---|---|
| "This feature is standard in other job boards; I can reuse familiar patterns." | Every platform has unique domain semantics. Rikkei Jobs enforces strict 5-role RBAC and Spring Modulith boundaries that differ from generic templates. |
| "The client omitted the formula for missing assessment scores; I will default it to zero." | Violates project integrity. Open Question 4 in docs/05 mandates displaying clear warnings rather than silently nullifying scores. |
| "Exploring multiple design options delays delivery; coding immediately is faster." | Premature coding based on faulty assumptions guarantees complete rework, regressions in CI quality gates, and wasted cycles. |

## 7. Verification Checklist

- [ ] Reviewed `docs/01-architecture-overview.md`, `docs/03-version-table.md`, and `docs/05-open-business-questions.md`.
- [ ] Identified affected packages across the 7 domain modules.
- [ ] Documented at least 2 viable architectural options with explicit pros and cons.
- [ ] Confirmed zero invented business rules or unsupported assumptions.
- [ ] Secured alignment on the technical approach before initiating plan authoring.

## 8. Rikkei Jobs Specifics

- System architecture reference: `docs/01-architecture-overview.md`.
- Framework version standards: `docs/03-version-table.md`.
- Unresolved domain questions: `docs/05-open-business-questions.md`.
- Backend domain modules: `backend/src/main/java/com/rikkei/jobs/` (candidate, company, internship, assessment, learning, recruitment, ai).
- Frontend feature slices: `frontend/src/features/`.
