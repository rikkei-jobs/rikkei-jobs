# 06 — Database Migrations and Flyway Discipline

## 1. Core Principles

Apply all database schema and data changes strictly through Flyway migration scripts.
Never permit Hibernate or JPA to generate, modify, or drop database schema objects.
Maintain absolute isolation between production schema migrations and development seed data.

## 2. PostgreSQL 18.6 Standards

Enforce PostgreSQL 18.6-alpine standards as defined in docker-compose.yml and docs/03-version-table.md:

- Primary Keys: Always declare primary keys as BIGSERIAL or BIGINT GENERATED ALWAYS AS IDENTITY.
- Timestamps: Always use TIMESTAMPTZ with default UTC current timestamp: DEFAULT NOW().
- Identifiers: Use snake_case for all table names, column names, constraints, and indices.
- Foreign Keys: Forbid cross-module foreign key constraints. Declare physical foreign keys strictly within tables owned by the same module.
- Indexing: Explicitly create indices on foreign keys, unique columns, and search filters with the naming pattern idx_<table_name>_<column_name>.

## 3. Separation of Schema Migrations, Dev Seeds, and Unique Version Numbering

Maintain strict folder separation and version numbering discipline for Flyway scripts:

- Production Migrations: backend/src/main/resources/db/migration/
  - Contains production schema definitions (DDL only; 11 migrations total).
  - Version numbering: Strictly ODD version numbers (`V1__init_schema.sql`, `V3__skill_profile.sql`, `V5__auth_identity_evolution.sql`, `V7__evaluation.sql`, `V9__company_profile.sql`, `V11__jobs_and_recommendations.sql`, `V13__target_positions_gap_analysis.sql`, `V15__create_internships_and_internship_tasks.sql`, `V17__ai_governance.sql`, `V19__create_recruitment_applications.sql`, `V21__create_application_cv_snapshots.sql`).
  - Never place test users, mock data, or development seed accounts in this directory.
- Development Seed Data: backend/src/main/resources/db/migration-dev/
  - Contains test data, 5 system roles, 20 skills catalogue, and sample accounts/companies (DML only; 8 migrations total, 19 combined in dev).
  - Version numbering: Strictly EVEN version numbers (`V2__dev_seed.sql`, `V4__dev_skill_profile_seed.sql`, `V6__dev_seed_nt01.sql`, `V8__dev_evaluation_seed.sql`, `V10__dev_company_seed.sql`, `V12__dev_job_seed.sql`, `V14__dev_gap_analysis_seed.sql`, `V22__dev_recruitment_seed.sql`).
  - Loaded exclusively when the dev profile is active via spring.flyway.locations.
- Unique Versioning Invariant: Version numbers must be globally UNIQUE across both directories. Because the development profile loads both locations (`classpath:db/migration,classpath:db/migration-dev`), any duplicate version number triggers a fatal Flyway duplicate version exception on startup.

## 4. Spring Boot JPA and Flyway Configuration

Enforce the following immutable settings in backend/src/main/resources/application.yml:

- Disable Open-In-View: spring.jpa.open-in-view: false to prevent database connection leaks outside transaction boundaries.
- Forbid Hibernate DDL: spring.jpa.hibernate.ddl-auto: none to ensure Flyway remains the single source of database truth.
- Validate on Migrate: spring.flyway.validate-on-migrate: true to detect checksum mismatches before migrations execute.
- Profile Isolation:
  - Production (application-prod.yml): spring.flyway.locations: classpath:db/migration
  - Development (application-dev.yml): spring.flyway.locations: classpath:db/migration,classpath:db/migration-dev

## 5. Migration Authoring and Immutability Discipline

- Migrations are immutable once merged into the develop branch. Never edit, rename, or delete an existing migration file.
- Implement schema changes, table alterations, or index additions as new sequential forward migration scripts following the odd/even numbering rule.
- Write idempotent migration statements using IF NOT EXISTS or IF EXISTS where syntactically valid in PostgreSQL.
- Format all SQL scripts according to the .sqlfluff configuration file (PostgreSQL dialect, 4 spaces indentation).

## 6. Testcontainers Integration and Verification

Verify database migrations in automated integration tests using Testcontainers 2.0.5:

- Use dynamic port allocation with PostgreSQLContainer("postgres:18.6-alpine"). Never bind static database ports in tests.
- Reference verified test suites:
  - backend/src/test/java/com/rikkei/jobs/migration/FlywayMigrationIntegrationTest.java
  - backend/src/test/java/com/rikkei/jobs/migration/ProfileSeparationIntegrationTest.java

## 7. Verification Commands

Verify Flyway migrations and seed isolation using these commands:

```bash
# Verify Flyway migrations against dynamic PostgreSQL Testcontainer
./mvnw test -D "test=FlywayMigrationIntegrationTest"

# Verify seed isolation between dev and prod profiles
./mvnw test -D "test=ProfileSeparationIntegrationTest"

# Lint migration SQL syntax using SQLFluff container
docker run --rm -v "$PWD:/repo" -w /repo sqlfluff/sqlfluff:4.5.0 lint backend/src/main/resources/db/migration
```
