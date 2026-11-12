---
name: backend-module-boundaries
description: Use when designing inter-module interactions, defining public module APIs, or verifying modular monolith isolation boundaries.
---

# Backend Modular Monolith Boundary Enforcement

## 1. Overview

This skill governs the architectural isolation and inter-module communication patterns across the 7 domain modules (`candidate`, `company`, `internship`, `assessment`, `learning`, `recruitment`, `ai`) and foundational `identity` in the Rikkei Jobs platform.

The Modular Monolith architecture prevents architectural erosion by enforcing:

- Single-module table ownership with zero cross-module writes.
- Absolute prohibition of physical database foreign keys across module boundaries.
- Absolute prohibition of SQL or JPQL `JOIN` operations across distinct module tables.
- Synchronous communication exclusively through public Java Service Interfaces returning immutable DTO records.
- Asynchronous communication via decoupled Spring `ApplicationEventPublisher` domain events.
- Mechanical verification via ArchUnit and Spring Modulith validation suites.

## 2. When to use / When NOT to use

### When to use

- Designing interactions where one module consumes data or triggers actions in another module.
- Defining public service interfaces, API contracts, or domain events for a module.
- Refactoring tightly coupled code that violates package boundaries.
- Creating or auditing ArchUnit rules and modular boundary verification suites.
- Reviewing database schema changes to ensure no cross-module foreign key constraints exist.

### When NOT to use

- Implementing internal service logic within a single module (use `backend-module-feature`).
- Integrating with external mock partner systems such as LMS or Meet (use `external-system-integration-and-mock`).
- Tuning query indexes and performance within a single module schema (use `backend-persistence-performance`).

## 3. Step-by-step Process

### Step 1: Verify Domain Table Ownership

1. Consult `docs/01-architecture-overview.md` to identify table ownership:
   - `identity`: `roles`, `users`, `used_sso_tickets`.
   - `candidate`: `skill_profiles`, `profile_evidences`, `candidate_cvs`, `portfolios`.
   - `company`, `job`: `companies`, `company_hr_profiles`, `job_descriptions`, `job_skills`.
   - `internship`: `internship_batches`, `internship_members`, `internship_tasks`.
   - `assessment`: `skills`, `assessment_templates`, `assessment_forms`, `skill_badges`.
   - `learning`: `skill_gaps`, `learning_recommendations`, `course_enrollments`.
   - `recruitment`: `applications`, `interview_rounds`, `interview_rooms`, `job_offers`.
   - `ai`: Stateless (no persistent database tables).
2. Iron Rule: Only the owning module's repositories may issue `SELECT`, `INSERT`, `UPDATE`, or `DELETE` statements against its tables.

### Step 2: Design Synchronous In-Process Communication

1. When Module A needs data from Module B, Module B exposes a typed Public Service Interface at its package root or under `api`:
   - Example: `com.rikkei.jobs.identity.PublicUserService`
2. Interface Contract Rules:
   - Methods receive and return ONLY immutable Java Record DTOs (e.g., `UserSummaryDto`).
   - JPA entities must NEVER be exposed in public interface method signatures.
   - Module A depends strictly on `PublicUserService`, never on `UserRepository` or `User` entity.

### Step 3: Design Asynchronous Domain Events

1. For decoupled notifications (e.g., student completes course, candidate submits application), use Spring `ApplicationEventPublisher`.
2. Define the event as an immutable Java Record in the publishing module's event package:

   ```java
   public record CandidateAppliedEvent(Long applicationId, Long candidateId, Long jobId, Instant appliedAt) {}
   ```

3. Publish the event within a transactional service:

   ```java
   applicationEventPublisher.publishEvent(new CandidateAppliedEvent(app.getId(), candidateId, jobId, Instant.now()));
   ```

4. Listen in consumer modules using `@EventListener` or `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`:

   ```java
   @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
   public void onCandidateApplied(CandidateAppliedEvent event) {
       // Perform asynchronous side effects (notifications, matching recalculation)
   }
   ```

### Step 4: Enforce Physical Database Boundary Rules

1. Zero Physical Foreign Keys:
   - Foreign key constraints (`REFERENCES`) are strictly forbidden across module boundaries.
   - Reference external entities using plain `BIGINT` or `UUID` columns (e.g., `candidate_id BIGINT NOT NULL`).
2. Zero Cross-Module SQL Joins:
   - Never write SQL queries joining tables owned by different modules (e.g., do NOT join `applications` with `users`).
   - Query assembly: Module A queries its records, extracts entity IDs, calls Module B's public service to fetch DTOs by IDs, and combines data in memory.

### Step 5: Automate Boundary Verification via ArchUnit

1. Architectural test patterns are documented in `docs/agent-config/` (never modify application code in this phase).
2. ArchUnit Rule Example — Prohibit Cross-Module Repository Access:

   ```java
   @ArchTest
   static final ArchRule noCrossModuleRepositoryAccess = noClasses()
       .that().resideInAPackage("com.rikkei.jobs.recruitment..")
       .should().dependOnClassesThat()
       .resideInAnyPackage("com.rikkei.jobs.identity.repository..", "com.rikkei.jobs.identity.model..");
   ```

3. Spring Modulith Rule Example — Structural Verification:

   ```java
   @Test
   void verifyModularStructure() {
       ApplicationModules.of(RikkeiJobsApplication.class).verify();
   }
   ```

## 4. Iron Laws

1. ZERO CROSS-MODULE WRITES: A module must never perform write operations on tables owned by another module.
2. NO PHYSICAL CROSS-MODULE FOREIGN KEYS: Cross-module references must use plain logical IDs without database-level `REFERENCES`.
3. NO CROSS-MODULE SQL JOINS: SQL or JPQL queries joining tables from different modules are strictly prohibited.
4. NO JPA ENTITIES ACROSS MODULE BOUNDARIES: Public module interfaces must expose only immutable Java Record DTOs.
5. NO REPOSITORY INJECTION ACROSS MODULES: A service in Module A must never inject a Spring Data repository belonging to Module B.

## 5. Red Flags

- Seeing `import com.rikkei.jobs.identity.model.User;` inside a class in the `recruitment` package.
- Injecting `UserRepository` or `CandidateRepository` into `RecruitmentService`.
- A Flyway migration script in `db/migration/` containing `REFERENCES users(id)` from a table in another module.
- A JPQL query containing `SELECT a FROM Application a JOIN User u ON a.candidateId = u.id`.
- Circular dependency cycles detected between module packages.

## 6. Rationalization Table

| Excuse | Reality |
|---|---|
| "Joining tables in SQL is much faster than calling a service interface." | Violates modular boundaries, prevents independent schema changes, and creates a monolithic spaghetti architecture. |
| "Database foreign keys enforce cascading deletes automatically." | Cascading deletes across modules cause silent data loss and prevent consumer modules from executing necessary business cleanup. |
| "Passing JPA entities between modules saves creating DTO records." | Entities modified outside their owning module trigger unexpected dirty checks and break object encapsulation. |
| "Direct repository injection saves writing a public service interface." | Tightly couples internal data access details to external consumers, preventing refactoring. |

## 7. Verification Checklist

- [ ] No classes import models or repositories from external modules.
- [ ] Inter-module calls execute exclusively via `Public<ModuleName>Service` interfaces.
- [ ] Data exchanged across module boundaries uses immutable Java Record DTOs.
- [ ] Flyway migrations contain no cross-module `REFERENCES` constraints.
- [ ] No repository queries execute cross-module SQL/JPQL `JOIN` statements.
- [ ] Event-driven cross-module side effects use `ApplicationEventPublisher`.
- [ ] ArchUnit architectural tests verify module isolation cleanly.

## 8. Rikkei Jobs Specifics

- 7 Domain Modules: `candidate`, `company`, `internship`, `assessment`, `learning`, `recruitment`, `ai`.
- Foundational Module: `identity`.
- Source Architecture Document: `docs/01-architecture-overview.md`.
- Architectural Verification Reference: Documented in `docs/agent-config/` (strictly no changes to application source code).
- Event Mechanism: Spring Framework 6.x `ApplicationEventPublisher` and `@TransactionalEventListener`.
