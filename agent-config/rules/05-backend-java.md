# 05 — Java 25 & Spring Boot 4 Modular Monolith Backend Standards

## 1. Java 25 LTS & Spring Boot 4.1.2 Runtime Baseline

Develop backend services strictly targeting Java 25 LTS and Spring Boot 4.1.2:

- Target JVM release is pinned via `<release>25</release>` and `<java.version>25</java.version>` in `backend/pom.xml`.
- Leverage Java 25 modern language constructs:
  - Use immutable `record` for all Data Transfer Objects (DTOs), API request/response payloads, and domain event objects.
  - Utilize enhanced pattern matching for `switch` and `instanceof`.
  - Apply sealed interfaces and classes to model constrained domain hierarchies.
- Maintain single deployable Modular Monolith architecture without introducing microservice distributed complexity.

## 2. Package Architecture & Module Table Ownership

Organize backend code under the root package `com.rikkei.jobs.*` divided into nine bounded modules:

- Module packages: `ai`, `assessment`, `candidate`, `common`, `company`, `identity`, `internship`, `learning`, `recruitment`.
- Each package contains a `package-info.java` defining explicit table ownership and boundary invariants:
  - Zero Cross-Module Writes: Every database table is exclusively owned, read, and written by exactly one module.
  - Zero Physical Foreign Keys: Never declare cross-module database foreign key constraints. Store cross-module references as plain scalar identifiers (`BIGINT` or `UUID`).
  - Zero Cross-Module SQL Joins: Never perform SQL `JOIN` queries across tables belonging to different modules.
  - Service Interface Contracts: Inter-module synchronous communication must pass exclusively through public Java Service Interfaces returning immutable DTO records.
  - Asynchronous Decoupling: Inter-module event communication must use Spring `ApplicationEventPublisher` and `@EventListener` with immutable event records.

## 3. Strict DTO and Entity Separation

Isolate persistence entities from presentation and inter-module contracts:

- JPA `@Entity` classes are strictly private to the internal persistence layer of their owning module.
- Never expose JPA entities in REST controller method signatures, request bodies, or response payloads.
- Map entities to immutable Java records (DTOs) before returning data from service boundaries.
- Adhere strictly to the unified error response record `com.rikkei.jobs.common.dto.ErrorResponse` returning `{"code": "...", "message": "..."}`.
- Route all controller exceptions through `com.rikkei.jobs.common.exception.GlobalExceptionHandler`.

## 4. Zero-Warning Compiler Flags

Enforce zero-warning compilation via `backend/pom.xml`:

- The Maven Compiler Plugin is configured with:
  - `-Xlint:all`: Enables all recommended compiler warnings.
  - `-Werror`: Treats every compiler warning as an error, terminating build execution.
  - `-Xlint:-processing`: Suppresses annotation processing noise.
- Fix all compiler warnings immediately at the source. Never use `@SuppressWarnings` unless demonstrably necessary and accompanied by an explanatory comment.

## 5. Code Formatting & Spotless AOSP Standards

Format all Java source code using the Spotless Maven Plugin configured in `backend/pom.xml`:

- Plugin: `spotless-maven-plugin:3.11.0` utilizing `google-java-format:1.30.0` with `<style>AOSP</style>` (4-space indentation standard).
- Check code formatting: `./mvnw spotless:check`
- Automatically reformat code: `./mvnw spotless:apply`
- Never commit Java code that fails `spotless:check`.

## 6. Static Analysis with SpotBugs

Enforce rigorous static analysis using the SpotBugs Maven Plugin configured in `backend/pom.xml`:

- Plugin: `spotbugs-maven-plugin:4.10.5.0` with `<effort>Max</effort>`, `<threshold>Medium</threshold>`, and `<failOnError>true</failOnError>`.
- Configure bug pattern exemptions exclusively in `backend/spotbugs-exclude.xml` (such as `EI_EXPOSE_REP`/`EI_EXPOSE_REP2` for Spring-managed singleton dependency injection).
- Execute static analysis check: `./mvnw spotbugs:check`
- Build fails fast if any unapproved bug pattern is detected.

## 7. Operational Constraints & Testing Discipline

Observe backend development constraints for sprint `T022DB0`:

- Zero Application Code Modifications: Do not alter backend domain logic, entities, or controllers during agent configuration tasks.
- No Unauthorized Dependencies: Do not add third-party dependencies or plugins to `backend/pom.xml` without architectural review.
- Hermetic Integration Tests: Use Testcontainers 2.0.5 (`testcontainers-junit-jupiter`, `testcontainers-postgresql`) pointing to `postgres:18.6-alpine`. Never bind tests to fixed host ports.
- Ensure Spring JPA `open-in-view` remains `false` in `backend/src/main/resources/application.yml` to prevent connection leaks.

## 8. Verification Commands

Verify backend compliance using these real Maven wrapper commands:

- Verify formatting: `./mvnw spotless:check`
- Run SpotBugs static analysis: `./mvnw spotbugs:check`
- Compile with strict warnings: `./mvnw clean test-compile`
- Run backend unit and integration test suite: `./mvnw test`
