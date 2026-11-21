# 13 — Backend Data Access Performance

Optimize database access and enforce strict JPA/Hibernate performance patterns for PostgreSQL 18.6.

## 1. JPA and Hibernate Configuration Standards

Configure JPA settings in `backend/src/main/resources/application.yml` to prevent connection exhaustion:

- Keep `spring.jpa.open-in-view: false` permanently disabled `EXISTS`. Never enable Open Session in View.
- Keep `spring.jpa.hibernate.ddl-auto: none` permanently disabled `EXISTS`. Never allow Hibernate to generate or alter schemas.
- Use Flyway migrations in `backend/src/main/resources/db/migration/` as the sole authority for database schema `EXISTS`.
- Maintain HikariCP connection pool settings `EXISTS`: `connection-timeout: 5000` (fail-fast within 5 seconds) and `maximum-pool-size: 10`.

## 2. Eliminate N+1 Query Anti-Patterns

Avoid N+1 query performance degradation across all entity access:

- Use `JOIN FETCH` or `@EntityGraph` when loading intra-module entity relationships that are required immediately `TARGET`.
- Configure `@BatchSize(size = 20)` on collection associations to prevent sequential queries when batch loading is necessary `TARGET`.
- Use DTO projections (Spring Data interface projections or Java records via `SELECT new com.rikkei.jobs...`) for read-only query operations `TARGET`. Fetch only columns required by the client.
- Avoid fetching full managed entities when constructing API responses. DTO projections avoid Hibernate Persistence Context tracking overhead `TARGET`.
- For cross-module relationships, fetch required records in bulk using `findAllById(Iterable<ID> ids)` rather than looping over individual identifiers `TARGET`.

## 3. Mandatory Pagination for Multi-Item Endpoints

Forbid unpaginated list responses across all API endpoints:

- Every query returning collections must accept pagination parameters (`page`, `size`, and `sort`) `TARGET`.
- Standardize on 1-based page query parameters for client APIs (`page >= 1`). Convert to 0-based page requests at the controller layer `TARGET`.
- Enforce default page size of 20 items and maximum page size of 100 items. Reject requests requesting `size > 100` `TARGET`.
- Return `Page<T>` when total record counts are required by client UI, or `Slice<T>` for infinite scroll and search feeds `TARGET`.
- Never call `findAll()` without pagination parameters on repository interfaces `TARGET`.

## 4. Query-Driven Indexing in PostgreSQL

Create database indexes in Flyway migrations based on actual query patterns:

- Existing indexes across Flyway production migrations:
  - Baseline in `backend/src/main/resources/db/migration/V1__init_schema.sql` `EXISTS`: `idx_users_email`, `idx_users_lms_user_id`, and `idx_skills_code`.
  - Candidate in `backend/src/main/resources/db/migration/V3__skill_profile.sql` `EXISTS`: `idx_skills_skill_group`, `idx_external_records_user_id`, `idx_skill_mappings_source_code`, and `idx_skill_evidences_user_skill`.
  - Identity in `backend/src/main/resources/db/migration/V5__auth_identity_evolution.sql` `EXISTS`: `idx_users_company_id`, `idx_password_reset_tokens_token_hash`, and `idx_password_reset_tokens_user_id`.
  - Assessment in `backend/src/main/resources/db/migration/V7__evaluation.sql` `EXISTS`: `idx_evaluations_user_status`, `idx_evaluations_mentor_id`, and `idx_evaluation_scores_evaluation_id`.
  - Company in `backend/src/main/resources/db/migration/V9__company_profile.sql` `EXISTS`: `idx_companies_status` and `idx_companies_created_by`.
  - Company & AI in `backend/src/main/resources/db/migration/V11__jobs_and_recommendations.sql` `EXISTS`: `idx_jobs_status_deadline`, `idx_job_skills_job_id`, `idx_job_skills_code`, `idx_job_recommendations_user_id`, and `idx_job_recommendations_created_at`.
  - Candidate in `backend/src/main/resources/db/migration/V13__target_positions_gap_analysis.sql` `EXISTS`: `idx_position_skills_position_id` and `idx_gap_results_user_target`.
- Add B-Tree indexes for all foreign key columns, unique lookup fields, and frequently filtered columns `TARGET`.
- Use GIN (Generalized Inverted Index) for PostgreSQL JSONB columns (e.g., `skills.level_bands`) when executing JSON path or containment queries `TARGET`.
- Validate query execution plans using `EXPLAIN (ANALYZE, BUFFERS)` in integration tests before approving index designs `TARGET`.
- Avoid redundant indexes that duplicate prefix columns of existing composite indexes `TARGET`.

## 5. Transaction Boundaries and Read-Only Optimization

Demarcate database transactions cleanly at the service layer:

- Annotate read-only service methods with `@Transactional(readOnly = true)` `TARGET`. This sets Hibernate flush mode to `FlushMode.MANUAL` and prevents dirty-checking overhead.
- Annotate write service methods with `@Transactional` with explicit rollback criteria: `@Transactional(rollbackFor = Exception.class)` `TARGET`.
- Keep transaction boundaries as short as possible. Perform data validation, payload parsing, and security checks before opening a transaction `TARGET`.
- Never perform external HTTP calls (such as `ExternalApiClient`), mail delivery, or heavy computational tasks inside a `@Transactional` boundary `TARGET`.

## 6. Optimistic Locking and Concurrent Updates

Protect entities subject to concurrent updates against lost update anomalies:

- Declare a version field on mutable business entities: `@Version private Long version;` `EXISTS` on `Evaluation` and `Company` (baseline entities `User`, `Role`, `Skill` do not declare `@Version`).
- Handle `ObjectOptimisticLockingFailureException` in `GlobalExceptionHandler.java` and map it to HTTP 409 Conflict `EXISTS`.
- Use optimistic locking on resources with concurrent user edits, including Candidate Profiles, Job Descriptions, and Assessment Forms `TARGET`.

## 7. Idempotency and Transient Error Retry

Enforce idempotency and retry semantics on critical write operations:

- Use unique idempotency keys to guard operations against network replay. For example, store redeemed tickets in `used_sso_tickets` (in `backend/src/main/resources/db/migration/V5__auth_identity_evolution.sql`) `EXISTS`.
- Implement retry mechanisms for transient database errors (such as deadlock detection or serialization failures) using exponential backoff `TARGET`.
- Verify persistence behavior with integration tests:

```bash
# Verify Flyway migration application and database baseline `EXISTS`
./mvnw test -D "test=FlywayMigrationIntegrationTest"
```
