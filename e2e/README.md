# Rikkei Jobs — Opaque-Box E2E Integration Test Suite

This directory contains the automated end-to-end (E2E) integration test suite for the Rikkei Jobs platform.

## Architecture & Philosophy

- **Zero External Test Dependencies**: Built entirely using Node.js native test runner (`node:test`) and assertion engine (`node:assert/strict`). No third-party test frameworks or packages required.
- **Opaque-Box Verification**: Tests interact strictly via public HTTP network interfaces against live running services (Frontend: 3000, Backend: 8080, Mock: 9000, Mailpit: 8025).

## Test Tiers Overview

1. **Tier 1 — Feature Coverage (`tier1-features/`)**: Verifies the 11 external mock endpoints, 4 mock testing tools, backend health status, error responses, frontend serving, authentication features, and DG-01 Mentor Evaluation templates, happy-path submission (`DRAFT` -> `PUT` -> `submit` -> verified `MENTOR` evidence & `verifiedScore` delta), and OpenAPI `/api-docs` exposure (`test_evaluation_features.test.mjs`).
2. **Tier 2 — Boundaries & Security (`tier2-boundaries/`)**: Tests unauthorized access (401), forbidden role calls (403), invalid payload validation (400), business conflicts (409 duplicate enrollment/batch member/submitted evaluation), IDOR protections (404 across mentors and candidates), and HTTP-level simultaneous submit concurrency (`test_evaluation_boundaries.test.mjs`).
3. **Tier 3 — Combinations (`tier3-combinations/`)**: Verifies state mutation lifecycles (enrollment -> progress updates -> mock reset).
4. **Tier 4 — Real-World Scenarios (`tier4-scenarios/`)**: End-to-end integration flows simulating candidate batch addition, course completion, external service failure resilience (HTTP 503 `EXTERNAL_UNAVAILABLE`), and DG-01 evaluation profile visibility (`SUBMITTED` newest-first ordering, no `DRAFT` leakage, and HR `200`/`404` access across public/private profiles in `test_evaluation_scenarios.test.mjs`).

## Suite Totals

- **Current Baseline (with DG-01)**: `20` suites across 4 tiers, `231` test cases, `1139` assertions (up from prior `17` suites / `221` cases / `998` assertions).

## Running the Suite

### Prerequisites

The application stack must be running and healthy:

```bash
cp .env.example .env
docker compose up -d --build --wait
```

### Execute All Tests

From the repository root:

```bash
node e2e/run-all.mjs
```

### Execute Specific Tier or Test

You can execute individual test files using Node's native test runner:

```bash
node --test e2e/tier1-features/test_mock_11_endpoints.test.mjs
```
