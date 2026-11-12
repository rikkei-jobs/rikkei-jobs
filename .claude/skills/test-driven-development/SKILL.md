---
name: test-driven-development
description: Use when implementing new business logic, domain services, API endpoints, bug fixes, or utility algorithms that can be validated with automated tests.
---

# Test-Driven Development

## 1. Overview

The `test-driven-development` skill operationalizes the classic Red-Green-Refactor cycle for the Rikkei Jobs monorepo. It enforces consumer-driven API design, ensures all production logic is justified by automated assertions, and mandates strict hermetic testing practices across Java 25 (Spring Boot 4.1.2) and React 19 (TypeScript 6.0.3).

## 2. When to Use / When NOT to Use

### When to Use

- When writing new domain services, business logic, state machines, or calculation algorithms.
- When creating REST controllers, input validation schemas, or custom security evaluators.
- When fixing defects: the bug must be reproduced with a failing test before applying any fix.
- When building frontend utility functions, custom React hooks, or interactive UI components.

### When NOT to Use

- When configuring CI workflows (`.github/workflows/*.yml`) or tool configuration files.
- When authoring pure documentation (`docs/`, `*.md`) or localization resource strings.
- When performing automated code formatting or dependency version upgrades without logic changes.

## 3. Step-by-Step Process

1. **Specify the Behavioral Scenario**:
   - Define the explicit behavior to be verified: input data, state prerequisites, expected output, and boundary edges (nulls, empty collections, boundary thresholds, unauthorized callers).
   - Give the test a descriptive behavioral name indicating what is broken if it fails (e.g., `shouldRejectApplicationWhenAssessmentScoreBelowThreshold`).

2. **Phase 1 — RED (Write Failing Test First)**:
   - Place backend tests under `backend/src/test/java/com/rikkei/jobs/<module>/` using JUnit 5 and AssertJ.
   - Place frontend tests co-located with features under `frontend/src/features/<feature>/` using Vitest and React Testing Library.
   - Run the test suite: `cd backend && ./mvnw test -Dtest=ClassName#methodName` or `npm --prefix frontend run test -- path/to/file.test.tsx`.
   - **CONFIRM RED**: The test must fail. Verify that the failure is caused by the *absence of the business logic*, NOT by compiler syntax errors, missing class imports, or invalid test harness setup.

3. **Phase 2 — GREEN (Write Minimal Production Code)**:
   - Implement the minimum amount of production code in the service, controller, or component required to satisfy the failing assertion.
   - Do not write speculative, unasserted feature code or anticipated future requirements.
   - Re-run the test: **CONFIRM GREEN**. All assertions must pass with exit code 0.

4. **Phase 3 — REFACTOR (Clean, Optimize, Format)**:
   - Improve code clarity, eliminate duplication (DRY), and optimize query or algorithmic efficiency.
   - Apply automated formatting: run `cd backend && ./mvnw spotless:apply` for Java code; ensure ESLint and Prettier pass for TypeScript.
   - Re-run the test suite and its broader package: confirm that all tests remain GREEN without regressions.

5. **Enforce Hermetic Test Standards**:
   - **No Hardcoded Ports**: Use `@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)`.
   - **No External Network Dependencies**: External third-party APIs must be mocked via WireMock or the local Express mock server.
   - **Real Database Semantics**: Integration tests requiring a database must use Testcontainers with PostgreSQL 18.6 (`postgres:18.6-alpine`) rather than in-memory H2, ensuring true JSON and identity column compatibility.
   - **Strict Ban on Thread.sleep()**: Never use `Thread.sleep()` to wait for asynchronous conditions. Use Awaitility on the backend (`await().atMost(...).until(...)`) and `waitFor()` in React Testing Library.

## 4. Iron Laws

- **Law 1: No Production Code Without a Failing Test**: Never write or modify production code without first observing an automated test fail due to the absence of that behavior.
- **Law 2: Never Compromise Test Assertions**: Do not weaken assertions, widen thresholds, or delete assertions to make a test pass. Fix the underlying implementation.

## 5. Red Flags

- Writing production code first and writing tests afterwards ("Test-Last").
- A test that passes on its very first execution without ever being witnessed in a RED state.
- Calling `Thread.sleep(1000)` inside test files to avoid race conditions.
- Replacing Testcontainers PostgreSQL with H2 database to make tests run faster locally.

## 6. Rationalization Table

| Excuse (Agent Rationalization) | Reality (Engineering Discipline) |
|---|---|
| "This is simple if-else logic; writing a test beforehand is unnecessary." | Security vulnerabilities and edge-case defects almost always reside in "simple" conditionals. Test-first forces boundary thinking. |
| "Writing code and tests together in one edit accomplishes the exact same goal." | Writing both together eliminates consumer-centric API design and produces tests biased toward verifying implementation details rather than contracts. |
| "Starting Testcontainers takes 15 seconds; H2 in-memory DB is faster." | H2 does not support PostgreSQL 18.6 identity syntax, JSONB queries, or row-level locking. A test passing on H2 can easily crash on production. |

## 7. Verification Checklist

- [ ] Observed the automated test fail with the expected failure diagnostic before writing production code.
- [ ] Production code contains only the minimal logic necessary to satisfy the test.
- [ ] Ran Spotless / Prettier formatting during the refactoring phase.
- [ ] Test is fully hermetic: random port, no external internet calls, and zero `Thread.sleep()` usage.
- [ ] Database tests run against real PostgreSQL 18.6 containers.

## 8. Rikkei Jobs Specifics

- Backend single-test command: `cd backend && ./mvnw test -Dtest=ClassName#methodName`.
- Java code formatting verification: `cd backend && ./mvnw spotless:check`.
- Java code formatting automatic fix: `cd backend && ./mvnw spotless:apply`.
- Frontend single-test command: `npm --prefix frontend run test -- path/to/file.test.tsx`.
- PostgreSQL test container image: `postgres:18.6-alpine`.
