---
name: flyway-migration-authoring
description: Use when authoring, reviewing, or testing Flyway database migrations and development seed scripts in Rikkei Jobs.
---

# Flyway Database Migration Authoring

## 1. Overview

This skill governs the authoring, validation, and execution of Flyway database migrations and development seed data scripts in the Rikkei Jobs platform. The database runtime is PostgreSQL 18.6-alpine managed via Flyway 12.4.0 (Spring Boot 4.1.2 BOM).

The platform maintains strict separation between production schema definitions and development seed data:

- Production DDL: Contains purely deterministic, repeatable schema evolution scripts.
- Development Seeds: Contains mock and sample data for local development and integration tests.

Immutability of merged migrations and modular isolation without cross-module physical foreign keys are absolute requirements.

## 2. When to use / When NOT to use

### When to use

- Creating new database tables, columns, indexes, or constraints for a domain module.
- Modifying column data types, nullability, or default values through forward migrations.
- Adding or updating development seed datasets in `db/migration-dev/`.
- Verifying database migration scripts using SQLFluff or Testcontainers.

### When NOT to use

- Modifying Java JPA entity mappings without schema alterations.
- Running performance analysis or query tuning on existing indexes (use `backend-persistence-performance`).
- Authoring business logic or repository queries (use `backend-module-feature`).
- Implementing inter-module service communication (use `backend-module-boundaries`).

## 3. Step-by-step Process

### Step 1: Select Migration Target Directory

1. Production Schema Migrations: Store strictly in `backend/src/main/resources/db/migration/`.
2. Development Seed Data: Store strictly in `backend/src/main/resources/db/migration-dev/`.
3. Never mix development seed inserts into production schema files.

### Step 2: Determine Migration Version & File Naming

1. Inspect existing files in `backend/src/main/resources/db/migration/` to find the highest version number `V<N>`.
2. Assign the next sequential integer `V<N+1>` (e.g., `V3__add_internship_tables.sql`).
3. Follow the strict naming format: `V<N>__<snake_case_description>.sql` with exactly two underscores separating the version and description.

### Step 3: Author Schema DDL with PostgreSQL 18.6 Standards

1. Primary Keys: Use `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` or `BIGSERIAL PRIMARY KEY`.
2. Timestamp Columns: Use `TIMESTAMPTZ DEFAULT NOW()` for all temporal fields (`created_at`, `updated_at`). Forbid timezone-naive `TIMESTAMP`.
3. Text Columns: Use explicit `VARCHAR(n)` for bounded strings (e.g., status codes, names) or `TEXT` for unbounded content (e.g., job descriptions, comments).
4. Nullability: Explicitly specify `NOT NULL` on required fields.
5. Idempotent DDL: Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

### Step 4: Enforce Modular Foreign Key Isolation

1. Intra-Module Foreign Keys: Foreign key constraints (`REFERENCES`) are permitted ONLY between tables within the same domain module.
2. Cross-Module Foreign Keys: STRICTLY FORBIDDEN. Cross-module references must be stored as plain `BIGINT` or `UUID` columns without database-level `REFERENCES` constraints.
3. Cascading Deletes: Never configure `ON DELETE CASCADE` across module boundaries.

### Step 5: Author Index Definitions

1. Follow the standard index naming convention: `idx_<table_name>_<column_name>`.
2. Composite indexes follow the leftmost prefix rule: `idx_<table_name>_<col1>_<col2>`.
3. Create indexes only for columns actively queried in `WHERE`, `JOIN`, or `ORDER BY` clauses.

### Step 6: Author Development Seed Scripts (If Applicable)

1. Place seed scripts in `backend/src/main/resources/db/migration-dev/`.
2. Use idempotent insertion syntax: `INSERT INTO <table> (...) VALUES (...) ON CONFLICT (...) DO NOTHING;`.
3. When specifying manual numeric IDs, always synchronize the PostgreSQL sequence at the end of the script:

   ```sql
   SELECT setval('<table_name>_id_seq', COALESCE((SELECT MAX(id) FROM <table_name>), 1));
   ```

### Step 7: Lint Migration Scripts with SQLFluff

1. Run SQLFluff against the migration directory using the PostgreSQL dialect:

   ```bash
   sqlfluff lint backend/src/main/resources/db/migration
   ```

2. Correct syntax errors, unquoted reserved keywords, or formatting issues.

### Step 8: Verify Migration Execution with Testcontainers

1. Run the integration test against an isolated PostgreSQL 18.6-alpine container:

   ```bash
   cd backend && ./mvnw test -Dtest=FlywayMigrationIntegrationTest
   ```

2. Verify clean execution without checksum mismatch or syntax failure.

## 4. Iron Laws

1. IMMUTABILITY OF MERGED MIGRATIONS: Never modify, rename, or delete a migration file that has been merged into `develop`.
2. FORWARD-FIX ONLY: To correct or revert a migration, create a new forward migration file `V<N+1>__<fix_description>.sql`.
3. NO PHYSICAL CROSS-MODULE FOREIGN KEYS: Never create a `REFERENCES` constraint pointing to a table owned by another module.
4. TIMESTAMPTZ MANDATORY: All temporal columns must use `TIMESTAMPTZ`. Never use `TIMESTAMP` or MySQL `DATETIME`.
5. STRICT SEED SEPARATION: Never place test or seed data inserts into `db/migration/`.

## 5. Red Flags

- Modifying `V1__init_schema.sql` to add a column instead of creating `V2__add_column.sql`.
- A table definition in `recruitment` containing `FOREIGN KEY (candidate_id) REFERENCES candidates(id)`.
- Using `SERIAL` (32-bit integer) instead of `BIGSERIAL` or `BIGINT GENERATED ALWAYS AS IDENTITY`.
- Hardcoded insert statements in `db/migration/` containing sample student or company data.
- Omission of `setval` after inserting explicit IDs in dev seed scripts.

## 6. Rationalization Table

| Excuse | Reality |
|---|---|
| "Editing the existing migration file is cleaner than creating a new version." | Triggers checksum verification failures across developer environments and CI, breaking deployment pipelines. |
| "Foreign keys between modules maintain data integrity automatically." | Violates modular monolith boundaries, creates tight coupling, and prevents decomposing modules into microservices. |
| "Adding seed data to production migrations ensures every environment has data." | Pollutes production databases with test records and risks data privacy violations. |
| "PostgreSQL TIMESTAMP without timezone works fine for local testing." | Causes timezone conversion bugs and calculation errors when servers and clients operate in different timezones. |

## 7. Verification Checklist

- [ ] Migration file is placed in `backend/src/main/resources/db/migration/` (or `db/migration-dev/` for seed data).
- [ ] File name strictly matches `V<N>__<description>.sql` with double underscore.
- [ ] No foreign keys reference tables belonging to external modules.
- [ ] Primary keys use `BIGINT` identity or `BIGSERIAL`.
- [ ] Timestamp columns use `TIMESTAMPTZ DEFAULT NOW()`.
- [ ] Seed scripts include sequence reset (`setval`) and `ON CONFLICT DO NOTHING`.
- [ ] SQLFluff lint passes without errors.
- [ ] `FlywayMigrationIntegrationTest` passes against PostgreSQL 18.6-alpine container.

## 8. Rikkei Jobs Specifics

- Flyway Version: `12.4.0` (managed via Spring Boot 4.1.2 BOM).
- Database Engine: PostgreSQL `18.6-alpine`.
- Production Migration Directory: `backend/src/main/resources/db/migration/`.
- Development Seed Directory: `backend/src/main/resources/db/migration-dev/`.
- Test Suite: `backend/src/test/java/com/rikkei/jobs/migration/FlywayMigrationIntegrationTest.java`.
- Verification Command: `cd backend && ./mvnw test -Dtest=FlywayMigrationIntegrationTest`.
