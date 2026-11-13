---
name: api-contract-and-errors
description: Use when designing or updating REST API endpoints, DTO contracts, pagination parameters, or error representations.
---

# API Contract and Error Handling Standards

## 1. Overview

This skill establishes the contract design, URL routing rules, pagination standards, and structured error representation for all REST APIs in the Rikkei Jobs platform.

The API design guarantees strict predictability across Backend (Spring Boot 4.1.2), Frontend (React 19), and External Mock Services:

- Resource-oriented RESTful URIs with semantic HTTP methods.
- Mandatory 1-based pagination with bounded page sizes.
- Uniform RFC 7807/9457 `ProblemDetail` error responses.
- Accurate HTTP status codes reflecting semantic outcomes.
- OpenAPI 3.1 contract documentation with dev-only Swagger UI.

## 2. When to use / When NOT to use

### When to use

- Designing new REST endpoints or updating existing API URI paths.
- Defining request and response DTO schemas, parameters, and serialization rules.
- Implementing collection pagination, filtering, and sorting parameters.
- Mapping domain and infrastructure exceptions to standardized HTTP error responses.
- Adding or maintaining Springdoc OpenAPI annotations on controllers.

### When NOT to use

- Implementing internal service business logic (use `backend-module-feature`).
- Configuring role-based access control or Spring Security filters (use `spring-security-rbac-endpoint`).
- Designing database indexes or optimizing SQL query execution (use `backend-persistence-performance`).
- Calling external mock APIs from backend clients (use `external-system-integration-and-mock`).

## 3. Step-by-step Process

### Step 1: Design RESTful Resource URIs

1. Prefix all domain routes with `/api/v1/`.
2. Use plural nouns in lowercase kebab-case (e.g., `/api/v1/job-descriptions`, `/api/v1/internship-batches`).
3. Model nested resources hierarchically: `/api/v1/job-descriptions/{jobId}/applications`.
4. Strictly avoid verbs in URI paths (e.g., do NOT use `/api/v1/createJob`, `/api/v1/getApplications`).

### Step 2: Apply Semantic HTTP Methods

1. `GET`: Retrieve resource or collection (idempotent, safe). Returns `200 OK`.
2. `POST`: Create a new resource or execute a non-idempotent action. Returns `201 Created` with resource payload and optional `Location` header.
3. `PUT`: Replace or update an entire resource idempotently. Returns `200 OK`.
4. `PATCH`: Apply partial updates to an existing resource. Returns `200 OK`.
5. `DELETE`: Remove a resource idempotently. Returns `204 No Content`.

### Step 3: Implement 1-Based Pagination

1. Standardize query parameters:
   - `page`: 1-based integer, default `1`, minimum value `1`.
   - `size`: integer, default `20`, maximum allowed value `100`.
   - `sort`: string format `property,direction` (e.g., `createdAt,desc`).
2. Map 1-based request parameters to Spring Data 0-based Pageable in controller:

   ```java
   Pageable pageable = PageRequest.of(page - 1, size, Sort.by(direction, property));
   ```

3. Wrap paginated responses in `PageResponse<T>`:

   ```json
   {
     "items": [...],
     "page": 1,
     "size": 20,
     "totalItems": 150,
     "totalPages": 8
   }
   ```

4. Strictly forbid returning unbounded arrays or collections.

### Step 4: Implement Structured RFC 7807/9457 Error Representation

1. All error responses return Content-Type `application/problem+json` or `application/json`.
2. Standard error structure using `com.rikkei.jobs.common.dto.ErrorResponse`:

   ```json
   {
     "code": "RESOURCE_NOT_FOUND",
     "message": "Không tìm thấy hồ sơ ứng viên yêu cầu",
     "details": []
   }
   ```

3. Standard HTTP status to error code mappings:
   - `400 Bad Request` (`VALIDATION_ERROR`): Invalid request payload or parameter format.
   - `401 Unauthorized` (`UNAUTHORIZED`): Missing or invalid authentication token.
   - `403 Forbidden` (`FORBIDDEN`): Insufficient role permissions.
   - `404 Not Found` (`NOT_FOUND`): Target resource does not exist.
   - `409 Conflict` (`CONFLICT`): State conflict (e.g., duplicate application, email already exists).
   - `429 Too Many Requests` (`RATE_LIMITED`): Rate limit exceeded.
   - `500 Internal Server Error` (`INTERNAL_ERROR`): Unexpected unhandled error (sanitized message, no stack trace).
   - `503 Service Unavailable` (`EXTERNAL_UNAVAILABLE`): External service dependency (LMS, Meet) unreachable.

### Step 5: Document Endpoints with Springdoc OpenAPI 3.2.0

1. Annotate controller class with `@Tag(name = "...", description = "...")`.
2. Annotate methods with `@Operation(summary = "...", description = "...")`.
3. Declare `@ApiResponse` annotations for successful outcomes and expected domain errors.
4. Verify Swagger UI accessibility at `/swagger-ui.html` under `dev` profile and ensure it is disabled in `prod`.

### Step 6: Verify Endpoint Contracts with Tests

1. Author `@WebMvcTest` controller tests verifying JSON schema response for success states.
2. Verify invalid inputs trigger HTTP 400 with populated `details` list containing field validation errors.

## 4. Iron Laws

1. NO HTTP 200 WITH ERROR BODY: Never return HTTP 200 containing `{"success": false, "message": "error"}`. Failures must use appropriate 4xx/5xx status codes.
2. MANDATORY 1-BASED PAGINATION: The `page` parameter must start from 1. 0-based paging is forbidden at the API boundary.
3. NO UNBOUNDED LISTS: Every listing endpoint must enforce a maximum page size (max 100).
4. NO INFRASTRUCTURE LEAKS: Never return stack traces, database table names, SQL queries, or internal file paths in error responses.

## 5. Red Flags

- Returning HTTP 200 with an error object inside the body.
- Using 0-based page numbers in API parameters or response bodies.
- Endpoints formatted with verbs like `/api/v1/updateJob` or `/api/v1/deleteCandidate`.
- An error response returning raw PostgreSQL error messages or Hibernate exception classes.
- A list endpoint lacking `page` and `size` parameters.

## 6. Rationalization Table

| Excuse | Reality |
|---|---|
| "Returning HTTP 200 for errors simplifies client try-catch logic." | Breaks HTTP semantics, breaks client caching, disables API gateway monitoring, and misleads libraries like React Query. |
| "Spring Data defaults to 0-based indexing, so exposing 0-based is simpler." | End users and frontend pagination controls are 1-based; exposing 0-based indexing causes off-by-one synchronization bugs. |
| "The dataset is small today, so pagination can be added later." | Data volumes expand over time; omitting pagination leads to memory exhaustion and production denial of service. |
| "Returning full stack traces in errors helps frontend developers debug." | Exposes internal system architecture and software versions, creating critical security reconnaissance vulnerabilities. |

## 7. Verification Checklist

- [ ] URI uses lowercase plural nouns in kebab-case prefixed with `/api/v1/`.
- [ ] Appropriate HTTP methods are used (GET, POST, PUT, PATCH, DELETE).
- [ ] Pagination parameters are 1-based with maximum size limit of 100.
- [ ] Paginated responses return standard `PageResponse<T>` schema.
- [ ] Error responses conform to `ErrorResponse` structure with appropriate HTTP status codes.
- [ ] No internal stack traces or database errors are exposed.
- [ ] Springdoc OpenAPI annotations are present and accurate.
- [ ] `@WebMvcTest` assertions verify both success and error response schemas.

## 8. Rikkei Jobs Specifics

- Error DTO: `com.rikkei.jobs.common.dto.ErrorResponse`.
- Paged Response DTO: `com.rikkei.jobs.common.dto.PageResponse`.
- Global Exception Handler: `com.rikkei.jobs.common.exception.GlobalExceptionHandler`.
- OpenAPI Dependency: `springdoc-openapi-starter-webmvc-ui:3.2.0`.
- Pagination Defaults: `page = 1`, `size = 20`, max `size = 100`.
- Profile Isolation: Swagger UI accessible in `dev`, disabled in `prod`.
