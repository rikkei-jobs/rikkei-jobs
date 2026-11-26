# Rikkei Jobs — Opaque-Box E2E Integration Test Suite

This directory contains the automated end-to-end (E2E) integration test suite for the Rikkei Jobs platform.

## Architecture & Philosophy

- **Zero External Test Dependencies**: Built entirely using Node.js native test runner (`node:test`) and assertion engine (`node:assert/strict`). No third-party test frameworks or packages required.
- **Opaque-Box Verification**: Tests interact strictly via public HTTP network interfaces against live running services (Frontend: 3000, Backend: 8080, Mock: 9000, Mailpit: 8025).

## Test Tiers Overview

1. **Tier 1 — Feature Coverage (`tier1-features/`)**: Verifies the 11 external mock endpoints, 5 mock testing tools (including `POST /mock/cloudinary/fail-next`) and `/cloudinary/*` contract, backend health status, error responses, frontend serving, authentication features, DG-01 Mentor Evaluation templates, happy-path submission, OpenAPI `/api-docs` exposure (`test_evaluation_features.test.mjs`), DN-01 Company Profile & HR Accounts happy paths, Mailpit Vietnamese onboarding email, forced password change, PNG/JPEG logo upload to Cloudinary CDN with direct lossless delivery verification, removal of `GET /api/v1/companies/me/logo` (`405`), OpenAPI 5 DN-01 operations, and 6-caller RBAC matrix (`test_company_features.test.mjs`), plus NT-02 OpenAPI `/api/docs` & `/api/api-docs` rendering, Swagger UI assets on `:8080` and `:3000`, 30-path / 33-operation contract, `@Hidden` exclusion of `TestErrorController`, legacy redirects, and `hr1` allow-list (`test_openapi_docs.test.mjs`).
2. **Tier 2 — Boundaries & Security (`tier2-boundaries/`)**: Tests unauthorized access (401), forbidden role calls (403), invalid payload validation (400), business conflicts (409), IDOR protections (404), simultaneous submit concurrency (`test_evaluation_boundaries.test.mjs`), DN-01 `taxCode` format/concurrency boundaries, duplicate HR email across roles, CR/LF injection, `taxCode`/`status` immutability, required `@Version` optimistic locking (400 missing / 409 stale), uniform `405 METHOD_NOT_ALLOWED` on `PUT /api/v1/companies/{id}` (own/other/missing) + cross-tenant `GET /api/v1/companies/{id}` 404, exact `2,097,152` vs `2,097,153` byte logo limits and bounded `max-swallow-size: 5MB` (`413 PAYLOAD_TOO_LARGE` / 20 MB rejection) on `:8080` and `:3000/api/`, header-first `4,096x4,096` image bounds without OOM, invalid/traversal file payloads, `405` on removed `GET /api/v1/companies/me/logo`, and forced `502 LOGO_STORAGE_UNAVAILABLE` boundary + recovery (`test_company_boundaries.test.mjs`), NT-02 5-role RBAC matrix & ownership guards across `GET/PUT /companies/{id}`, 5 `/me` endpoints, `/me/job-recommendations`, `/profiles/{userId}/skills`, `/profiles/{userId}/evaluations`, `/evaluation-templates`, `/evaluations*`, `/target-positions`, `/jobs/{jobId}`, `<= 0` ID boundaries, unsupported HTTP methods, `.anyRequest().denyAll()` unmapped-route parity, `hr1` `403 MUST_CHANGE_PASSWORD`, and Nginx `:3000/api/v1/` parity (`test_rbac_matrix_boundaries.test.mjs`), plus AI-05 governance RBAC (401/403 on all 4 `/api/v1/admin/ai-*` endpoints), 400 query parameter validation, 409 optimistic locking conflict, A6 blank API key & model path-injection rejection, A3 zero-log disabled recommendations, A2 quota-exhaustion graceful degradation, and UTC summary/logs count agreement (`test_ai_governance_admin.test.mjs`).
3. **Tier 3 — Combinations (`tier3-combinations/`)**: Verifies state mutation lifecycles (enrollment -> progress updates -> mock reset), auth lifecycles, and DN-01 `must_change_password` filtering across company endpoints, multi-HR company sharing, PNG-to-JPEG Cloudinary logo replacement (including `@Version` increment, stale CDN version `404`, and stale-version `409` vs refreshed-version `200` on subsequent `PUT`), `hr1`/`hr2` & Company A/B tenant isolation, and Nginx `:3000/api/` proxy parity without `/cloudinary/` proxying (`test_company_combinations.test.mjs`).
4. **Tier 4 — Real-World Scenarios (`tier4-scenarios/`)**: End-to-end integration flows simulating candidate batch addition, course completion, external service failure resilience (HTTP 503 `EXTERNAL_UNAVAILABLE`), DG-01 evaluation profile visibility (`test_evaluation_scenarios.test.mjs`), and DN-01 enterprise onboarding via Mailpit & Nginx, cross-tenant attack audit, two-HR `@Version` recovery, forced `502 LOGO_STORAGE_UNAVAILABLE` DB invariance + recovery, OpenAPI & optional PostgreSQL security/storage audit (`companies.logo_url`, `companies.logo_public_id`, absence of `company_logos`, 9 seed users) (`test_company_scenarios.test.mjs`).

## Suite Totals

- **Current Baseline (with AI05-fix)**: `28` suites across 4 tiers, `334` test cases, `2078` assertions (`11637` lines; up from prior `27` suites / `329` cases / `2021` assertions).

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
