---
name: external-system-integration-and-mock
description: Use when integrating backend services with external mock systems (LMS, Exam, PM, Meet) or implementing ExternalApiClient calls.
---

# External System Integration and Mock Client Standards

## 1. Overview

This skill governs the integration between the Rikkei Jobs backend and external partner systems simulated by the Node.js/Express mock service:

- LMS: Learning Management System (student identities, course transcripts, enrollments).
- Exam: Examination System (standardized assessment scores).
- PM: Project Management IOC (internship batches, project assignments, task deliverables).
- Meet: Rikkei Meet (virtual interview room creation).

All external communications route through a centralized, resilient client (`ExternalApiClient`) with strict service key protection, fail-fast timeouts, retry policies, and hermetic integration test coverage.

## 2. When to use / When NOT to use

### When to use

- Integrating backend services with LMS, Exam, PM, or Rikkei Meet APIs.
- Invoking or extending `com.rikkei.jobs.common.client.ExternalApiClient`.
- Handling external HTTP timeouts, connection failures, or partner error payloads.
- Adding or modifying mock endpoints or seed datasets in `mock/`.
- Authoring integration tests simulating external partner interactions.

### When NOT to use

- Communicating between internal backend domain modules (use `backend-module-boundaries`).
- Calling backend REST APIs from frontend components (use `frontend-feature-slice`).
- Managing internal PostgreSQL database access (use `backend-persistence-performance`).

## 3. Step-by-step Process

### Step 1: Consult the Authoritative Mock Contract

1. Review `docs/mock-contract.md` for endpoint paths, methods, query parameters, and payload schemas.
2. The 11 business endpoints:
   - `POST /lms/sso/tickets`: Issue temporary SSO ticket.
   - `POST /lms/sso/verify`: Verify SSO ticket and return identity.
   - `GET /lms/students/{id}`: Retrieve student profile.
   - `GET /lms/students/{id}/results`: Retrieve course grades and attendance.
   - `GET /lms/courses?skill={skill}`: Filter courses by skill code.
   - `POST /lms/enrollments`: Enroll student in a course.
   - `GET /lms/enrollments/{id}`: Retrieve student course enrollments.
   - `GET /exam/students/{id}/results`: Retrieve standardized exam results.
   - `GET /pm/students/{id}/internships`: Retrieve internship project history.
   - `POST /pm/batches/{id}/members`: Allocate student to an IOC batch.
   - `POST /meet/rooms`: Create virtual interview room.
3. Empty List Law: List endpoints (results, courses, enrollments, internships) return `[]` with status `200 OK` when no records exist. Never expect 404 for empty collections.

### Step 2: Route Calls Exclusively via `ExternalApiClient`

1. Inject `com.rikkei.jobs.common.client.ExternalApiClient` into the domain service.
2. Strictly avoid instantiating ad-hoc `RestTemplate`, `WebClient`, or `HttpClient` instances.
3. External client methods must return typed immutable Java Records or throw domain exceptions.

### Step 3: Configure Service Key Authentication

1. Inject the secret header `X-Service-Key: dev-key` automatically through `ExternalApiClient`.
2. Configure credentials in `application.yml` via `external.api.service-key`.
3. Never expose this key to frontend code, browser environments, or public repositories.
4. Ensure Nginx blocks public routing to `/mock` and `/lms` paths.

### Step 4: Configure Resilience, Timeouts & Retries

1. Timeout Budget: Set connection and read timeouts to maximum 5000ms (fail-fast).
2. Retry Policy:
   - Allow up to 2 retry attempts for transient I/O exceptions and HTTP 5xx responses.
   - Apply linear backoff delay: `150ms * attempt`.
   - Never retry HTTP 4xx client errors (400, 401, 404, 409).
3. Circuit Breaking: Prevent cascading resource exhaustion when partner systems are down.

### Step 5: Map External Exceptions to Domain Hierarchy

1. Map HTTP 404 from external API -> `ExternalResourceNotFoundException`.
2. Map HTTP 401 (invalid service key) -> `InvalidServiceKeyException`.
3. Map HTTP 409 (conflict) -> `ConflictException`.
4. Map HTTP 400 (validation failure) -> `ValidationException`.
5. Map connection timeout, refusal, or HTTP 5xx -> `ExternalUnavailableException`.
6. Ensure `ExternalUnavailableException` is translated by `GlobalExceptionHandler` to HTTP 503 `EXTERNAL_UNAVAILABLE`.

### Step 6: Extend or Update the Mock Server (If Needed)

1. Routes: Define routes in `mock/server.js`.
2. Data: Maintain base JSON data in `mock/data.json`.
3. Verification: Execute `npm test` inside `mock/` to confirm all mock tests pass.

### Step 7: Author Hermetic Integration Tests

1. Author tests using WireMock or containerized mock server in `backend/src/test/`.
2. Verify positive scenarios: valid payloads return expected DTOs.
3. Verify negative scenarios: simulated network timeouts trigger HTTP 503.

## 4. Iron Laws

1. CENTRALIZED CLIENT ONLY: All external partner communication must route through `ExternalApiClient`. Ad-hoc HTTP clients are forbidden.
2. CONFIDENTIAL SERVICE KEY: `X-Service-Key` is strictly confidential between Backend and Mock; never expose it in frontend configs (`VITE_*`).
3. FAIL-FAST TIMEOUT: Never allow external calls without a strict timeout (<= 5000ms).
4. MAP TO 503 ON OUTAGE: External service failures must be mapped to HTTP 503 `EXTERNAL_UNAVAILABLE` rather than unhandled 500 errors.
5. EMPTY LIST IS 200 OK: Never treat empty list responses `[]` as 404 errors.

## 5. Red Flags

- Instantiating `new RestTemplate()` directly inside a domain service class.
- Hardcoding `http://localhost:9000` inside Java business logic.
- Leaking `EXTERNAL_SERVICE_KEY` into frontend environment files.
- Catching external timeout exceptions and returning HTTP 500 with raw socket exception messages.
- Retrying HTTP 404 or 409 requests.

## 6. Rationalization Table

| Excuse | Reality |
|---|---|
| "Creating a quick RestTemplate saves modifying ExternalApiClient." | Bypasses centralized timeout, retry, logging, and metrics, creating unmonitored failure points. |
| "Calling the mock directly from React reduces backend boilerplate." | Exposes `X-Service-Key` to the public browser, violating the core security boundary. |
| "If the mock server is down, throwing a generic RuntimeException is sufficient." | Returns confusing HTTP 500 internal errors, preventing clients from distinguishing internal bugs from external partner downtime. |
| "Retrying 404 errors might work if the resource appears." | 404 indicates resource non-existence; retrying wastes connection pool resources and adds latency. |

## 7. Verification Checklist

- [ ] External call is routed via `ExternalApiClient`.
- [ ] `X-Service-Key` is attached automatically via configuration.
- [ ] Timeout is configured to <= 5000ms.
- [ ] Retry is limited to max 2 attempts for transient 5xx/network errors.
- [ ] Network failures map to HTTP 503 `EXTERNAL_UNAVAILABLE`.
- [ ] Mock list endpoints return empty arrays with HTTP 200.
- [ ] `npm test` in `mock/` passes cleanly.
- [ ] `ExternalApiClientIntegrationTest` passes against the mock server.

## 8. Rikkei Jobs Specifics

- External Systems: LMS, Exam, PM (IOC), Meet.
- Mock Server Stack: Node.js 24 Alpine, Express 5.3.0, port 9000.
- Central Client Class: `com.rikkei.jobs.common.client.ExternalApiClient`.
- Configuration Namespace: `external.api` in `application.yml`.
- Default Service Key: `dev-key`.
- Key Test Suite: `backend/src/test/java/com/rikkei/jobs/client/ExternalApiClientIntegrationTest.java`.
