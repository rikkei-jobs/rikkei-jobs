# 10 — Testing Strategy and Quality Assurance

## 1. Core Principles

Maintain comprehensive automated test coverage across all application tiers.
Adopt Test-Driven Development (TDD) as the default engineering workflow.
Ensure all tests are hermetic, deterministic, and isolated from external dependencies.

## 2. Test Pyramid Distribution

Structure automated testing across three distinct pyramid tiers:

- Unit Tests (~70% of total test suite):
  - Scope: Test pure business logic, domain models, validations, state transitions, and utility functions in complete isolation.
  - Backend: JUnit 5 with Mockito for service and domain layer tests.
  - Frontend: Vitest 5.1.0 with @testing-library/react for component and hook testing (e.g. frontend/src/App.test.tsx).
- Integration Tests (~20% of total test suite):
  - Scope: Verify component interactions, database operations, security filters, and HTTP error boundaries.
  - Backend: Spring Boot @SpringBootTest combined with Testcontainers 2.0.5 for PostgreSQL integration tests.
  - Mock Server: Standalone integration suite in mock/test-runner.js verifying all 11 endpoints and 4 testing tools.
- End-to-End Tests (~10% of total test suite):
  - Scope: Validate full-stack user journeys and contracts using opaque-box testing across 4 Tiers via e2e/run-all.mjs.

## 3. Test-Driven Development (TDD) Default

Follow the Red-Green-Refactor discipline when writing code:

1. Red: Write a focused, automated test that reproduces the defect or specifies the new requirement. Confirm that the test fails as expected.
2. Green: Implement the minimal production code necessary to satisfy the test assertions.
3. Refactor: Optimize code structure, remove duplication, and enhance readability while keeping all tests passing.
4. Never complete a development task or submit a pull request without accompanying automated test coverage.

## 4. Hermetic and Isolated Test Discipline

Enforce hermetic test environments across all test suites:

- Dynamic Port Allocation: Never bind fixed host ports (e.g. 5432 or 8080) in integration tests. Testcontainers must allocate ephemeral random ports via postgres.getJdbcUrl().
- No External Network Calls: Disallow external internet or third-party service communication during test runs. Direct external calls through the local mock server.
- Database State Isolation: Maintain clean database state between tests. Never permit development seed data from V2__dev_seed.sql to pollute production integration test suites.

## 5. Flaky Test Zero-Tolerance Policy

Treat any intermittent or non-deterministic test failure as a critical severity defect:

- Prohibition of Static Delays: Never use Thread.sleep() in Java or arbitrary setTimeout() in TypeScript. Use dynamic polling utilities such as await waitFor(...) or explicit polling assertions.
- No Retries for Passing CI: Prohibit retrying failed test jobs to achieve a passing CI run.
- Quarantine Policy: When a test is identified as flaky, diagnose its root cause immediately or quarantine the test behind an explicit issue ticket.

## 6. Verification Commands

Execute the verified testing commands locally:

```bash
# Run backend unit and Testcontainers integration tests
./mvnw test

# Run frontend Vitest unit test suite
npm run test --prefix frontend

# Run external mock server integration test suite
node mock/test-runner.js

# Execute complete opaque-box 4-tier E2E test suite
node e2e/run-all.mjs
```
