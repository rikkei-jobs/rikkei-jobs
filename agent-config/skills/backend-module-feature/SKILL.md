---
name: backend-module-feature
description: Use when implementing or modifying a backend domain feature, REST controller, service, or repository in a Spring Boot module.
---

# Backend Module Feature Development

## 1. Overview

This skill defines the engineering discipline and standards for implementing or modifying backend domain features in the Rikkei Jobs platform. The architecture follows a Modular Monolith paradigm built on Java 25 LTS and Spring Boot 4.1.2.

Features are structured using a strict layered architecture:

- Controller Layer: Handles HTTP protocol concerns, input validation, and DTO serialization.
- Service Layer: Encapsulates domain business logic, state transitions, and transactional boundaries.
- Repository Layer: Manages database interactions via Spring Data JPA and PostgreSQL 18.6.

All layer communications enforce immutable Java Records for DTOs and complete isolation of JPA Entities from external API contracts.

## 2. When to use / When NOT to use

### When to use

- Implementing a new REST endpoint, service method, or Spring Data repository within a domain module.
- Modifying business rules, validation logic, or database query semantics for an existing feature.
- Creating request/response DTOs and mapping logic between HTTP payloads and internal domain models.
- Writing unit, slice, or integration tests for domain features.

### When NOT to use

- Authoring or modifying Flyway database schema migrations (use `flyway-migration-authoring`).
- Investigating database query execution plans, resolving N+1 queries, or configuring indexes (use `backend-persistence-performance`).
- Designing cross-module service interfaces or event-driven boundaries (use `backend-module-boundaries`).
- Calling external services or mock endpoints such as LMS, Exam, PM, or Meet (use `external-system-integration-and-mock`).

## 3. Step-by-step Process

### Step 1: Identify Module Ownership & Package Structure

1. Consult `docs/01-architecture-overview.md` to verify which of the 7 domain modules owns the feature.
2. Locate or create the target package under `com.rikkei.jobs.<module>`:
   - `com.rikkei.jobs.<module>.controller`
   - `com.rikkei.jobs.<module>.service`
   - `com.rikkei.jobs.<module>.repository`
   - `com.rikkei.jobs.<module>.model`
   - `com.rikkei.jobs.<module>.dto`

### Step 2: Define Request and Response DTOs

1. Define all DTOs as immutable Java Records in `com.rikkei.jobs.<module>.dto`.
2. Apply Jakarta Validation annotations on request DTO fields:
   - `@NotNull`, `@NotBlank`, `@Size(min = ..., max = ...)`, `@Min`, `@Max`, `@Email`.
3. Separate command/input DTOs (e.g., `CreateJobRequest`) from query/output DTOs (e.g., `JobResponse`).
4. Never expose JPA entity classes or internal table foreign keys directly in DTO definitions.

### Step 3: Implement or Extend JPA Entity

1. Define the entity under `com.rikkei.jobs.<module>.model` annotated with `@Entity` and `@Table`.
2. Configure primary keys using `BIGINT` with `@GeneratedValue(strategy = GenerationType.IDENTITY)`.
3. Use `OffsetDateTime` or `Instant` for timestamp columns mapped to PostgreSQL `TIMESTAMPTZ`.
4. Enforce `FetchType.LAZY` on all `@ManyToOne`, `@OneToMany`, and `@ManyToMany` relationships.
5. Include an optimistic locking version field `@Version private Long version;` for entities subject to concurrent updates.

### Step 4: Create Spring Data Repository

1. Define repository interfaces in `com.rikkei.jobs.<module>.repository` extending `JpaRepository<Entity, Long>`.
2. Use Spring Data derived query methods or explicit JPQL with `@Query`.
3. Enforce pagination on multi-record queries by accepting a `Pageable` parameter and returning `Page<T>` or `Slice<T>`.
4. Use DTO projection queries (`SELECT new com.rikkei.jobs...Dto(...)`) for read-heavy listing views.

### Step 5: Implement Service Layer

1. Place service interfaces and implementations in `com.rikkei.jobs.<module>.service`.
2. Annotate the service implementation class with `@Service` and `@Transactional(readOnly = true)`.
3. Override mutating methods (create, update, delete) with `@Transactional`.
4. Enforce domain invariants and state validation before invoking repository mutations.
5. Throw typed domain exceptions extending `ApiException` (e.g., `ResourceNotFoundException`, `ConflictException`, `ValidationException`).

### Step 6: Implement REST Controller

1. Place controllers under `com.rikkei.jobs.<module>.controller` annotated with `@RestController` and `@RequestMapping("/api/v1/<resources>")`.
2. Enforce input validation using `@Valid @RequestBody` on mutation endpoints.
3. Apply method-level security with `@PreAuthorize("hasRole('...')")`.
4. Return typed `ResponseEntity<T>` wrapping the DTO record or standard `PageResponse<T>` for paginated collections.
5. Add Springdoc OpenAPI annotations (`@Tag`, `@Operation`, `@ApiResponse`).

### Step 7: Verify Error Handling & Validation

1. Ensure all business exceptions map to RFC 7807/9457 `ProblemDetail` via `GlobalExceptionHandler`.
2. Verify that field validation errors return HTTP 400 with structured field error lists.

### Step 8: Author Automated Tests

1. Unit Tests: Test service business logic and state transitions using JUnit 5 and Mockito.
2. Slice Tests: Test controller routing, validation, and serialization using `@WebMvcTest`.
3. Integration Tests: Verify database queries and transaction boundaries against PostgreSQL 18.6-alpine via Testcontainers.

## 4. Iron Laws

1. NO JPA ENTITY IN CONTROLLER: JPA entities must never appear in controller method signatures (parameters or return types).
2. MANDATORY DTO VALIDATION: Every incoming request payload must be annotated with `@Valid`.
3. NO UNBOUNDED COLLECTIONS: All endpoints returning collections must accept pagination parameters (`page`, `size`) with hard upper limits.
4. READ-ONLY TRANSACTION BY DEFAULT: Every service class must be annotated with `@Transactional(readOnly = true)` at class level.
5. NO LOGGING SENSITIVE DATA: Never log passwords, tokens, SSO tickets, or candidate PII.

## 5. Red Flags

- A controller returning `ResponseEntity<JobDescription>` directly instead of `ResponseEntity<JobResponse>`.
- Catching generic `Exception` inside a controller and returning HTTP 200 with `success: false`.
- Service methods lacking `@Transactional` when modifying database state.
- Calling `System.out.println` or omitting structured SLF4J logging.
- Missing `@Valid` on a `@RequestBody` parameter.
- Calling `repository.findAll()` without `Pageable`.

## 6. Rationalization Table

| Excuse | Reality |
|---|---|
| "The entity is small, returning it directly saves writing a DTO record." | Leaks database schema details, risks Jackson circular reference serialization errors, and causes lazy initialization exceptions outside transactions. |
| "This table will only ever have 50 rows, so pagination is unnecessary." | Production data grows unpredictably; unpaginated endpoints will eventually trigger out-of-memory errors and server crashes. |
| "Spring manages transactions automatically, so explicit readOnly is optional." | `readOnly = true` allows Hibernate to disable dirty checking and optimizes PostgreSQL connection pool allocation. |
| "I will add tests after the feature is approved." | Unverified code introduces undetected regressions. Tests must be delivered concurrently with implementation. |

## 7. Verification Checklist

- [ ] Package path matches `com.rikkei.jobs.<module>`.
- [ ] Request and response models are immutable Java Records.
- [ ] Controller methods receive `@Valid @RequestBody`.
- [ ] No JPA entities are exposed through the controller layer.
- [ ] Service class is annotated with `@Transactional(readOnly = true)`.
- [ ] Mutating service methods are explicitly annotated with `@Transactional`.
- [ ] Code compiles cleanly with `-Xlint:all -Werror`.
- [ ] Spotless formatting check passes: `cd backend && ./mvnw spotless:check`.
- [ ] SpotBugs static analysis check passes: `cd backend && ./mvnw spotbugs:check`.
- [ ] Unit and integration tests pass with zero failures.

## 8. Rikkei Jobs Specifics

- Runtime and Framework: Java 25 LTS, Spring Boot 4.1.2.
- Base Package: `com.rikkei.jobs`.
- Database: PostgreSQL 18.6-alpine accessed via HikariCP.
- Base Exception Class: `com.rikkei.jobs.common.exception.ApiException`.
- Error Response Model: `com.rikkei.jobs.common.dto.ErrorResponse`.
- Global Exception Handler: `com.rikkei.jobs.common.exception.GlobalExceptionHandler`.
- Build Verification Commands:
  - Format check: `cd backend && ./mvnw spotless:check`
  - Static analysis: `cd backend && ./mvnw spotbugs:check`
  - Compilation & tests: `cd backend && ./mvnw clean test-compile test`
