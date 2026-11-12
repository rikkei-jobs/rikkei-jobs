# 14 — Backend Module Boundaries

Enforce architectural decoupling, package conventions, and data isolation within the Modular Monolith.

## 1. Modular Monolith Architecture

The backend application is structured as a Modular Monolith in `backend/src/main/java/com/rikkei/jobs/` [EXISTS].
The system consists of 7 core business modules, foundational identity, and common infrastructure:

1. `candidate` [EXISTS]: Candidate Profile, Skill Profile, CV, portfolio. Table ownership: `skill_profiles`, `profile_evidences`, `candidate_cvs`, `portfolios` [TARGET].
2. `company` [EXISTS]: Company Profile, HR accounts, Job Descriptions (JD). Table ownership: `companies`, `company_hr_profiles`, `job_descriptions`, `job_skills` [TARGET].
3. `internship` [EXISTS]: Internship IOC batches, student allocations, task scoring. Table ownership: `internship_batches`, `internship_members`, `internship_tasks` [TARGET].
4. `assessment` [EXISTS]: Mentor evaluations, self-assessments, 20-skills catalogue. Table ownership: `skills` [EXISTS], `assessment_templates`, `assessment_forms`, `skill_badges` [TARGET].
5. `learning` [EXISTS]: Skill gap analysis against JD, course recommendations, LMS enrollments. Table ownership: `skill_gaps`, `learning_recommendations`, `course_enrollments` [TARGET].
6. `recruitment` [EXISTS]: Job applications, screening, Rikkei Meet interview scheduling, job offers. Table ownership: `applications`, `interview_rounds`, `interview_rooms`, `job_offers` [TARGET].
7. `ai` [EXISTS]: AI Career Assistant, CV review, mock interview coaching. Table ownership: `ai_chat_sessions`, `ai_interactions`, `ai_usage_quotas` [TARGET] (stateless in initial sprint).
8. `identity` [EXISTS]: User authentication, roles, SSO ticket redemption. Table ownership: `roles` [EXISTS], `users` [EXISTS], `used_sso_tickets` [TARGET].
9. `common` [EXISTS]: Centralized security filter chain, global exception handling, external API client, and environment validation [EXISTS].

Consult `docs/01-architecture-overview.md` and each module's `package-info.java` [EXISTS] for domain boundaries.
Note on Database Tables: Currently, only baseline tables `roles`, `users`, and `skills` exist in `V1__init_schema.sql` [EXISTS]. All other module tables are planned targets [TARGET] to be created in subsequent Flyway migrations as module features are implemented.

## 2. Table Ownership and Data Isolation

Enforce absolute data ownership per module:

- Every database table belongs to exactly one module. No module may write to a table owned by another module [TARGET].
- Forbid cross-module SQL joins. Queries containing `JOIN` clauses across tables belonging to different modules are strictly prohibited [TARGET].
- Forbid physical Foreign Key constraints across module boundaries. Never declare database-level foreign keys referencing tables in other modules [TARGET].
- Store references to entities in other modules as plain scalar IDs (`Long` or `UUID`), not as JPA entity relationships (`@ManyToOne`, `@OneToMany`) [TARGET].
- See `backend/src/main/java/com/rikkei/jobs/identity/model/User.java` for existing implementation [EXISTS]: references `roleId` as an integer rather than an entity association.

## 3. Inter-Module Communication

Decouple cross-module interactions using well-defined communication channels:

- Synchronous communication: A module may call another module only through its public service interface located in the target module's root or `service` package [TARGET].
- Public services must accept and return immutable Data Transfer Objects (Java Records). Never pass JPA entities across module boundaries [TARGET].
- Asynchronous communication: Use Spring `ApplicationEventPublisher` to publish domain events for state transitions (e.g., student completes course, interview scheduled) [TARGET].
- Subscribe to domain events using `@EventListener` or `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` in dependent modules [TARGET].

## 4. Architectural Verification and Module Decoupling

Verify architectural integrity using mechanical assertions:

- Maintain structural module boundaries according to Spring modular monolith architecture principles [EXISTS].
- Ensure cyclic dependencies between modules are strictly forbidden. Dependency graph must form a Directed Acyclic Graph (DAG) [EXISTS].
- Place architectural verification example tests exclusively in `docs/agent-config/` [EXISTS]:
  - Do NOT modify application code or test suites in `backend/src/` during the current sprint.
  - Do NOT add external architectural verification test dependencies to `backend/pom.xml` without formal milestone approval.
- Future architectural rules [TARGET] to verify:
  - No package outside `com.rikkei.jobs.<module>` accesses internal implementation classes of `<module>`.
  - No class outside `com.rikkei.jobs.common` accesses raw HTTP or database connection pools directly.
  - No entity declares `@JoinColumn` or `@OneToMany` targeting an entity in another module.

## 5. Verification Commands

Verify compilation and existing test suite integrity:

```bash
# Verify module compilation and package isolation [EXISTS]
./mvnw clean test-compile

# Verify existing unit and integration test suite [EXISTS]
./mvnw test
```
