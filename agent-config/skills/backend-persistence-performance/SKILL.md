---
name: backend-persistence-performance
description: Use when optimizing database queries, resolving JPA N+1 issues, running EXPLAIN ANALYZE on PostgreSQL 18.6, or designing database indexes.
---

# Backend Persistence Performance and Query Optimization

## 1. Overview

This skill guides the performance optimization of database access patterns, JPA/Hibernate mappings, and PostgreSQL 18.6 query execution in the Rikkei Jobs platform.

High-throughput enterprise applications require rigorous persistence discipline:

- Eliminating JPA N+1 query patterns using `JOIN FETCH`, `@EntityGraph`, and batch fetching.
- Utilizing immutable Java Record DTO projections for read-heavy operations.
- Enforcing read-only transaction boundaries to disable Hibernate dirty checking.
- Profiling execution plans using `EXPLAIN (ANALYZE, BUFFERS)` in Testcontainers environments.
- Applying index design rules including composite leftmost prefixes and partial indexes.
- Managing concurrent state modifications via `@Version` optimistic locking with retry policies.

## 2. When to use / When NOT to use

### When to use

- Investigating slow database queries, connection pool exhaustion, or high CPU loads.
- Auditing repository methods and entity relationships for N+1 query antipatterns.
- Designing new database indexes or refining composite indexes for high-volume tables.
- Running and interpreting PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` execution plans.
- Implementing optimistic locking and concurrency retry logic for mutable state.
- Replacing full entity graph queries with lightweight DTO projections.

### When NOT to use

- Authoring initial DDL schema migrations for new tables (use `flyway-migration-authoring`).
- Designing inter-module boundaries or events (use `backend-module-boundaries`).
- Building standard REST endpoints and CRUD controllers (use `backend-module-feature`).

## 3. Step-by-step Process

### Step 1: Audit and Eliminate JPA N+1 Queries

1. Recognize the N+1 Antipattern: A query fetches N parent records, and subsequent iterations over child associations trigger N secondary queries.
2. Strategy 1 (`JOIN FETCH`): Use in JPQL queries to load parents and children in a single SQL operation:

   ```java
   @Query("SELECT j FROM JobDescription j JOIN FETCH j.jobSkills WHERE j.id = :id")
   Optional<JobDescription> findByIdWithSkills(@Param("id") Long id);
   ```

3. Strategy 2 (`@EntityGraph`): Declare attribute paths on repository query methods:

   ```java
   @EntityGraph(attributePaths = {"jobSkills"})
   List<JobDescription> findByCompanyId(Long companyId);
   ```

4. Secondary Safety Net: Ensure `hibernate.default_batch_fetch_size: 25` is active in `application.yml`, allowing Hibernate to batch child queries using `WHERE id IN (?, ?, ...)`.

### Step 2: Use Immutable Java Record DTO Projections

1. For read-only list views and dashboards, never fetch managed JPA entities.
2. Define projection queries returning constructor expressions directly:

   ```java
   @Query("SELECT new com.rikkei.jobs.company.dto.JobSummaryResponse(j.id, j.title, j.salaryRange, j.status) "
        + "FROM JobDescription j WHERE j.companyId = :companyId")
   Page<JobSummaryResponse> findSummariesByCompany(@Param("companyId") Long companyId, Pageable pageable);
   ```

3. Benefits: Reduces memory footprint by avoiding persistence context tracking, eliminates dirty checking overhead, and prevents accidental lazy loading outside transactions.

### Step 3: Optimize Transaction Boundaries

1. Mark all service classes with `@Transactional(readOnly = true)` at class level.
2. Override only mutating methods (create, update, delete) with `@Transactional`.
3. Verify that `spring.jpa.open-in-view: false` is configured to prevent lazy loading during HTTP serialization.

### Step 4: Execute `EXPLAIN (ANALYZE, BUFFERS)` via Testcontainers

1. Create an integration test extending `PostgreSQLContainer("postgres:18.6-alpine")`.
2. Seed representative test data (e.g., 5,000–50,000 records).
3. Execute `EXPLAIN (ANALYZE, BUFFERS, COSTS, FORMAT JSON)` via `JdbcTemplate`:

   ```java
   String plan = jdbcTemplate.queryForObject(
       "EXPLAIN (ANALYZE, BUFFERS, COSTS, FORMAT JSON) "
       + "SELECT * FROM job_descriptions WHERE company_id = ? AND status = ?",
       String.class, companyId, status);
   ```

4. Analyze Execution Plan Criteria:
   - Scan Type: Must achieve `Index Scan` or `Index Only Scan` on filtered tables. Eliminate unexpected `Seq Scan` (sequential scans).
   - Buffer Efficiency: High `shared hit` count and low `shared read` count indicate queries are served from RAM buffers.
   - Execution Time: Query execution time must stay under 10ms for single-record or filtered queries in test conditions.

### Step 5: Apply Index Decision Checklist

1. Query Frequency: Index columns appearing frequently in `WHERE`, `ORDER BY`, or intra-module `JOIN` clauses.
2. Selectivity (Cardinality): Place high-selectivity columns (unique or many distinct values) at the leftmost position in composite indexes:
   - Composite Index `idx_jobs_company_status` on `(company_id, status)` supports filters on `(company_id)` and `(company_id, status)`, but NOT on `(status)` alone.
3. Partial Indexes: For queries filtering on specific status subsets in large tables:

   ```sql
   CREATE INDEX idx_jobs_published ON job_descriptions(created_at) WHERE status = 'PUBLISHED';
   ```

4. Write Penalty Evaluation: Every additional index adds write latency to `INSERT`, `UPDATE`, and `DELETE`. Avoid redundant indexes.

### Step 6: Implement Optimistic Locking & Retry

1. Add `@Version private Long version;` to transactional entities (`Application`, `JobDescription`, `AssessmentForm`).
2. When concurrent updates clash, Spring Data throws `OptimisticLockingFailureException`.
3. For idempotent operations, implement a retry policy with linear backoff (max 3 attempts).

## 4. Iron Laws

1. LAZY FETCH DEFAULT: All `@ManyToOne`, `@OneToMany`, and `@ManyToMany` mappings must explicitly specify `FetchType.LAZY`.
2. NO UNBOUNDED QUERIES: Never execute `findAll()` without `Pageable` or an explicit `LIMIT`.
3. READ-ONLY TRANSACTIONS FOR READS: Every query path must execute within `@Transactional(readOnly = true)`.
4. EVIDENCE-BASED INDEXING: Every index must be justified by query access patterns and verified with `EXPLAIN (ANALYZE, BUFFERS)`.
5. OPEN-IN-VIEW DISABLED: `spring.jpa.open-in-view` must always remain `false`.

## 5. Red Flags

- Calling `repository.findById()` inside a `for` loop over another collection.
- Using `FetchType.EAGER` in any JPA entity mapping.
- Sequential scans (`Seq Scan`) appearing in `EXPLAIN ANALYZE` on tables with more than 1,000 rows.
- Entities without `@Version` fields undergoing concurrent status transitions.
- Read operations running without `@Transactional(readOnly = true)`.

## 6. Rationalization Table

| Excuse | Reality |
|---|---|
| "EAGER fetching is convenient because it prevents LazyInitializationException." | EAGER loading fetches massive entity graphs into memory unconditionally, multiplying queries and exhausting JVM heap. |
| "Modern PostgreSQL handles sequential scans quickly, so indexes are optional." | Table growth transforms fast sequential scans into heavy disk I/O bottlenecks that saturate connection pools. |
| "Optimistic locking is unnecessary because concurrent user collisions are rare." | High-volume recruitment and application deadlines trigger race conditions that cause silent lost updates without optimistic locks. |
| "Writing DTO projections takes extra code; fetching full entities is faster to write." | Entities pollute the Hibernate persistence context, trigger dirty checking, and increase serialization overhead significantly. |

## 7. Verification Checklist

- [ ] All entity relationships use `FetchType.LAZY`.
- [ ] Multi-record listing queries use Java Record DTO projections.
- [ ] `application.yml` contains `hibernate.default_batch_fetch_size: 25`.
- [ ] `spring.jpa.open-in-view` is set to `false`.
- [ ] Service classes have `@Transactional(readOnly = true)` at class level.
- [ ] High-volume query plans verified via `EXPLAIN (ANALYZE, BUFFERS)` without unindexed `Seq Scan`.
- [ ] Composite indexes adhere to the leftmost prefix rule.
- [ ] Critical mutable entities include `@Version` fields.

## 8. Rikkei Jobs Specifics

- Database: PostgreSQL 18.6-alpine running in Testcontainers 2.0.5.
- Connection Pool: HikariCP (maximum-pool-size: 10, connection-timeout: 5000ms).
- Batch Fetch Configuration: `spring.jpa.properties.hibernate.default_batch_fetch_size: 25`.
- Open Session In View: `spring.jpa.open-in-view: false`.
- Target Optimistic Lock Entities: `Application`, `JobDescription`, `AssessmentForm`, `ProfileEvidence`.
