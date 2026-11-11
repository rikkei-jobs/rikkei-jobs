# Rikkei Jobs — Opaque-Box E2E Integration Test Suite

This directory contains the automated end-to-end (E2E) integration test suite for the Rikkei Jobs platform.

## Architecture & Philosophy

- **Zero External Test Dependencies**: Built entirely using Node.js native test runner (`node:test`) and assertion engine (`node:assert/strict`). No third-party test frameworks or packages required.
- **Opaque-Box Verification**: Tests interact strictly via public HTTP network interfaces against live running services (Frontend: 3000, Backend: 8080, Mock: 9000, Mailpit: 8025).

## Test Tiers Overview

1. **Tier 1 — Feature Coverage (`tier1-features/`)**: Verifies the 11 external mock endpoints, 4 mock testing tools, backend health status, error responses, and frontend serving.
2. **Tier 2 — Boundaries & Security (`tier2-boundaries/`)**: Tests unauthorized access (401 without key), invalid payload validation (400), business conflicts (409 duplicate enrollment/batch member), and non-existent entity lookups (404).
3. **Tier 3 — Combinations (`tier3-combinations/`)**: Verifies state mutation lifecycles (enrollment -> progress updates -> mock reset).
4. **Tier 4 — Real-World Scenarios (`tier4-scenarios/`)**: End-to-end integration flows simulating candidate batch addition, course completion, and external service failure resilience (HTTP 503 `EXTERNAL_UNAVAILABLE`).

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
