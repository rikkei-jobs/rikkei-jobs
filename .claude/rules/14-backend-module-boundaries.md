# 14 — Backend Module Boundaries

Enforce architectural decoupling, package conventions, and data isolation within the Modular Monolith.

## 1. Modular Monolith Architecture

The backend application is structured as a Modular Monolith in `backend/src/main/java/com/rikkei/jobs/` `EXISTS`.
The system consists of 7 core business modules, foundational identity, and common infrastructure:

1. `candidate` `EXISTS`: Candidate Profile, Skill Profile, target positions, skill gap analysis, CV, portfolio. Table ownership: `candidate_profiles` `EXISTS`, `external_records` `EXISTS`, `skill_mappings` `EXISTS`, `skill_evidences` `EXISTS`, `skill_scores` `EXISTS` (in `V3__skill_profile.sql`), `target_positions` `EXISTS`, `position_skills` `EXISTS`, `candidate_targets` `EXISTS`, `gap_results` `EXISTS` (in `V13__target_positions_gap_analysis.sql`), `candidate_cvs` `TARGET`, `portfolios` `TARGET`.
2. `company` `EXISTS`: Company Profile, company logo metadata, HR accounts, Job Descriptions (JD). Table ownership: `companies` `EXISTS` (in `V9__company_profile.sql`), `jobs` `EXISTS`, `job_skills` `EXISTS` (in `V11__jobs_and_recommendations.sql`), `company_hr_profiles`, `job_descriptions` `TARGET`.
3. `internship` `EXISTS`: Internship IOC batches, student allocations, task scoring. Table ownership: `internship_batches`, `internship_members`, `internship_tasks` `TARGET`.
4. `assessment` `EXISTS`: Mentor evaluations, self-assessments, 20-skills catalogue. Table ownership: `skills` `EXISTS` (in `V1__init_schema.sql`), `evaluation_templates` `EXISTS`, `evaluation_criteria` `EXISTS`, `evaluations` `EXISTS`, `evaluation_scores` `EXISTS` (in `V7__evaluation.sql`), `skill_badges` `TARGET`.
5. `learning` `EXISTS`: Skill gap analysis against JD, course recommendations, LMS enrollments. Table ownership: `skill_gaps`, `learning_recommendations`, `course_enrollments` `TARGET`.
6. `recruitment` `EXISTS`: Job applications, screening, Rikkei Meet interview scheduling, job offers. Table ownership: `applications`, `interview_rounds`, `interview_rooms`, `job_offers` `TARGET`.
7. `ai` `EXISTS`: AI Career Assistant, job recommendations, CV review, mock interview coaching. Table ownership: `job_recommendations` `EXISTS` (in `V11__jobs_and_recommendations.sql`), `ai_chat_sessions`, `ai_interactions`, `ai_usage_quotas` `TARGET`.
8. `identity` `EXISTS`: User authentication, roles, SSO ticket redemption, password reset. Table ownership: `roles` `EXISTS`, `users` `EXISTS` (in `V1__init_schema.sql`), `used_sso_tickets` `EXISTS`, `password_reset_tokens` `EXISTS` (in `V5__auth_identity_evolution.sql`).
9. `common` `EXISTS`: Centralized security filter chain (`RoutePolicyRegistry`, `SecurityConfig`), stateless horizontal `OwnershipGuard` (`com.rikkei.jobs.common.security.OwnershipGuard` depending only on `UserPrincipal`, `ResourceNotFoundException`, and canonical role constants), global exception handling, external API client, and environment validation `EXISTS`.

Consult `docs/01-architecture-overview.md` and each module's `package-info.java` `EXISTS` for domain boundaries.
Note on Database Tables: Currently, production tables exist across seven Flyway DDL migrations: `V1__init_schema.sql` (`roles`, `users`, `skills`), `V3__skill_profile.sql` (`candidate_profiles`, `external_records`, `skill_mappings`, `skill_evidences`, `skill_scores`), `V5__auth_identity_evolution.sql` (`used_sso_tickets`, `password_reset_tokens`), `V7__evaluation.sql` (`evaluation_templates`, `evaluation_criteria`, `evaluations`, `evaluation_scores`), `V9__company_profile.sql` (`companies`), `V11__jobs_and_recommendations.sql` (`jobs`, `job_skills`, `job_recommendations`), and `V13__target_positions_gap_analysis.sql` (`target_positions`, `position_skills`, `candidate_targets`, `gap_results`) `EXISTS`. All other module tables are planned targets `TARGET` to be created in subsequent Flyway migrations as module features are implemented.

## 2. Table Ownership and Data Isolation

Enforce absolute data ownership per module:

- Every database table belongs to exactly one module. No module may write to a table owned by another module `TARGET`.
- Forbid cross-module SQL joins. Queries containing `JOIN` clauses across tables belonging to different modules are strictly prohibited `TARGET`.
- Forbid physical Foreign Key constraints across module boundaries. Never declare database-level foreign keys referencing tables in other modules `TARGET`.
- Store references to entities in other modules as plain scalar IDs (`Long` or `UUID`), not as JPA entity relationships (`@ManyToOne`, `@OneToMany`) `TARGET`.
- See `backend/src/main/java/com/rikkei/jobs/identity/model/User.java` for existing implementation `EXISTS`: references `roleId` as an integer rather than an entity association.

## 3. Inter-Module Communication

Decouple cross-module interactions using well-defined communication channels:

- Synchronous communication: A module may call another module only through its public service interface located in the target module's root or `service` package `EXISTS` (`IdentityPublicService`, `EvaluationPublicService`, `CandidatePublicService`).
- Public services must accept and return immutable Data Transfer Objects (Java Records) `EXISTS` (e.g., `CreateHrUserCommand`, `CreatedHrUserResult`). Never pass JPA entities across module boundaries `EXISTS`.
- Asynchronous communication: Use Spring `ApplicationEventPublisher` to publish domain events for state transitions (e.g., student completes course, interview scheduled) `TARGET`.
- Subscribe to domain events using `@EventListener` or `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` in dependent modules `TARGET`.

## 4. Architectural Verification and Module Decoupling

Verify architectural integrity using mechanical assertions:

- Maintain structural module boundaries according to Spring modular monolith architecture principles `EXISTS`.
- Ensure cyclic dependencies between modules are strictly forbidden. Dependency graph must form a Directed Acyclic Graph (DAG) `EXISTS`.
- Place architectural verification example tests exclusively in `docs/agent-config/` `EXISTS`:
  - Do NOT modify application code or test suites in `backend/src/` during the current sprint.
  - Do NOT add external architectural verification test dependencies to `backend/pom.xml` without formal milestone approval.
- Future architectural rules `TARGET` to verify:
  - No package outside `com.rikkei.jobs.<module>` accesses internal implementation classes of `<module>`.
  - No class outside `com.rikkei.jobs.common` accesses raw HTTP or database connection pools directly.
  - No entity declares `@JoinColumn` or `@OneToMany` targeting an entity in another module.

## 5. Verification Commands

Verify compilation and existing test suite integrity:

```bash
# Verify module compilation and package isolation `EXISTS`
./mvnw clean test-compile

# Verify existing unit and integration test suite `EXISTS`
./mvnw test
```
