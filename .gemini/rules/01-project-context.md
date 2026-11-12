# 01 — Project Context & Monorepo Overview

## 1. System Identity & Mission

Rikkei Jobs is an enterprise competency-verified recruitment platform connecting Rikkei Education students, tech enterprises, mentors, recruitment staff, and administrators. The platform establishes verifiable hiring pipelines based on certified skill profiles, objective assessment matrices, IOC internship tasks, and LMS course recommendations.

Sprint and Task Code: `T022DB0`. All delivery branches, pull requests, and commit proposals must prefix this identifier.

## 2. Business Domains & Module Architecture

The system operates as a single deployable Modular Monolith containing seven business modules, one core identity module, and one shared infrastructure module:

- `candidate` (MOD-01): Skill Profile, verifiable evidence, Rikkei-standard CV, and portfolio.
- `company` (MOD-02): Enterprise profile, HR accounts, Job Descriptions (JDs), and skill requirements.
- `internship` (MOD-03): IOC internship batches, trainee matching, tasks, and acceptance reports.
- `assessment` (MOD-04): Mentor evaluations, candidate self-assessments, 20-skill catalogue, and badges.
- `learning` (MOD-05): Skill gap analysis, course recommendations, and LMS enrollment tracking.
- `recruitment` (MOD-06): Job applications, screening stages, Rikkei Meet interview rooms, and offer lifecycles.
- `ai` (MOD-07): Stateless Gemini AI career assistant providing CV optimization and mock interview advice.
- `identity`: Authentication, Role-Based Access Control (RBAC), and single-use SSO ticket validation.
- `common`: Cross-cutting concerns including security filters, unified error handling, and external API client.

## 3. Role-Based Access Control (5 Roles)

Adhere strictly to the five defined authorization roles across all modules:

- `CANDIDATE`: Students and interns. Manage personal profile, upload evidence, apply to jobs, review gap analysis, and use AI career advice.
- `HR`: Enterprise recruiters. Manage company profile, post and edit company JDs, search publicly visible candidates, schedule interviews, and issue offers.
- `MENTOR`: Instructors and technical guides. Complete assessment forms across the 20 skills for assigned interns, and record technical interview scores.
- `STAFF`: Recruitment coordinators. Audit and approve candidate profiles, verify enterprise JDs, match interns to IOC batches, and unlock masked contact information.
- `ADMIN`: System administrators. Manage the 20-skill framework and weights, audit immutable system logs, and manage user accounts.

## 4. Standard 20-Skill Framework & Scoring

Evaluate competencies exclusively against the 20 standardized skill codes configured in `backend/src/main/resources/db/migration-dev/V2__dev_seed.sql`:
`JAVA`, `SPRING_BOOT`, `SQL`, `GIT`, `REST_API`, `HTML_CSS`, `JAVASCRIPT`, `REACTJS`, `DOCKER`, `ENGLISH`, `TESTING`, `LINUX`, `OOP`, `DSA`, `CLEAN_CODE`, `TEAMWORK`, `COMMUNICATION`, `AGILE`, `SECURITY`, `CLOUD`.

Enforce competency scoring on a 0-100 scale categorized into four proficiency bands:

- Basic (`0-39`): Fundamental theoretical knowledge.
- Intermediate (`40-69`): Capable of implementing standard tasks under guidance.
- Advanced (`70-84`): Independent execution with strong quality and architectural awareness.
- Expert (`85-100`): Mastery and leadership level capability.

## 5. Verified Technology Stack Versions

Never alter or drift from the pinned technology versions defined in `docs/03-version-table.md`:

- Backend Runtime: Java 25 LTS (`<java.version>25</java.version>`, `<release>25</release>` in `backend/pom.xml`).
- Backend Framework: Spring Boot 4.1.2 with modular monolith architecture principles.
- Database: PostgreSQL 18.6-alpine configured in `docker-compose.yml`.
- Database Migrations: Flyway 12.4.0 (`backend/src/main/resources/db/migration/`).
- Integration Testing: Testcontainers 2.0.5 (`testcontainers-junit-jupiter`, `testcontainers-postgresql`).
- Frontend Runtime: React 19.3.1, Vite 8.3.7, TypeScript 6.0.3 (strict mode in `frontend/package.json`).
- Frontend Testing & Linting: Vitest 5.1.0, ESLint 10.14.0, Prettier 3.9.10.
- External Systems Mock: Express 5.3.0 running on Node.js 24 Alpine (`mock/package.json`).

## 6. Monorepo Structure & Service Boundaries

Inspect and respect the designated repository layout:

- `backend/`: Java 25 and Spring Boot 4.1.2 modular monolith application.
- `frontend/`: React 19 SPA organized into feature slices (`frontend/src/features/`).
- `mock/`: Standalone simulator for external systems (LMS, Exam, PM, Meet) at port 9000.
- `docs/`: Centralized architecture, versioning, conventions, and security specifications.
- `scripts/`: Monorepo quality gate synchronization, version drift checkers, and Docker CI harnesses.
- `e2e/`: Opaque-box end-to-end multi-tier test runner (`e2e/run-all.mjs`).
- `agent-config/`: Canonical single source of truth for AI agent rules, skills, and templates.

## 7. External Systems Mock vs Backend Reality

Distinguish clearly between the mock server and production backend:

- The mock server (`mock/server.js`) simulates external partner systems (LMS Student, LMS Admin, LMS PM, Rikkei Meet) and responds to internal calls bearing `X-Service-Key: dev-key`. The mock server intentionally omits ticket reuse prevention and expiry enforcement.
- The real backend (`backend/`) MUST enforce strict single-use validation and 60-second expiration for incoming SSO tickets via the `used_sso_tickets` database table.

## 8. Documentation Index

Consult these authoritative documentation files before proposing changes:

- `docs/01-architecture-overview.md`: High-level domain boundaries and architecture topology.
- `docs/02-local-development-troubleshooting.md`: Local setup troubleshooting and port configurations.
- `docs/03-version-table.md`: Canonical version ledger for all runtimes, tools, and libraries.
- `docs/04-security-secrets-policy.md`: Zero Real Secrets rules, RBAC mappings, and PII protection.
- `docs/05-open-business-questions.md`: Log of unresolved business rules and fallback strategies.
- `docs/conventions.md`: Code style, REST naming, database schema, and test requirements.
- `docs/mock-contract.md`: External systems HTTP contracts, endpoints, and mock response schemas.

## 9. Verification Commands

Verify monorepo status and version alignment using these real repository commands:

- Check working tree status: `git status`
- Verify version table synchronization: `node scripts/check-version-drift.mjs`
