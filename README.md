# Rikkei Jobs — Competency-Verified Hiring Platform

**Rikkei Jobs** is a modern modular monolith platform engineered by **Rikkei Education** to connect technology students and interns with hiring enterprises based on **verifiable competency data** (collected from LMS, Examination Systems, IOC Internship Projects, and Mentors).

This repository represents the initial foundation (Sprint 1 — Task T022DB0): Monorepo project skeleton, shared engineering conventions, and verified external system mocks.

---

## 🏗️ Architecture & Technology Stack

The project is structured as a **Modular Monolith** to deliver high developer velocity, transactional consistency, and clean domain boundaries without the network overhead of premature microservices.

- **Backend**: Java 25 LTS, Spring Boot 4.1.2, Maven Wrapper, Flyway Database Migrations (`spring-boot-starter-flyway`), Testcontainers.
- **Frontend**: React 19.3.1, TypeScript 6.0.3, Vite 8.3.7, Vanilla CSS (Design Tokens & CSS Variables), Vitest, Nginx 1.30.6 (Production container).
- **External Systems Mock**: Node.js 24 LTS, Express 5.3.0 (Simulates LMS, Exam System, Project Management IOC, Rikkei Meet).
- **Database & Services**: PostgreSQL 18.6 (bigint identity primary keys), Mailpit (Mock SMTP & Webmail UI).

---

## 📂 Repository Layout

```text
rikkei-jobs/
├── backend/            # Java 25 + Spring Boot 4 modular monolith
│   ├── src/main/java/  # 7 business modules + identity & shared infrastructure
│   ├── src/test/java/  # Testcontainers integration tests & mutation verification
│   └── pom.xml         # Maven configuration
├── frontend/           # React 19 + TypeScript + Vite 8 application
│   ├── src/features/   # Feature modules mirroring backend domains
│   ├── src/shared/     # Reusable components and API client
│   └── nginx.conf      # Production non-root reverse proxy configuration
├── mock/               # External systems mock service (Node.js 24 + Express)
│   ├── server.js       # 11 business endpoints + 4 testing tools
│   ├── data.json       # In-memory test fixtures (students, batches, courses)
│   └── api-test.http   # Executable HTTP contract verification requests
├── docs/               # Technical architecture, conventions, and bilingual specifications
│   ├── conventions.md  # Shared API, role, error code, and skill conventions
│   ├── mock-contract.md# Complete specification of external mock endpoints
│   ├── 01-architecture-overview.md
│   ├── 02-local-development-troubleshooting.md
│   ├── 03-version-table.md
│   ├── 04-security-secrets-policy.md
│   └── 05-open-business-questions.md
├── docker-compose.yml  # Complete 5-service local orchestration
├── .env.example        # Environment variable template with safe defaults
├── .editorconfig       # Code editor formatting rules
├── .gitignore          # Version control ignore definitions
├── CONTRIBUTING.md     # Git workflow, PR templates, and coding standards
├── check.sh            # Complete quality verification script (Linux / macOS)
└── check.ps1           # Complete quality verification script (Windows PowerShell)
```

---

## ⚡ Quick Start with Docker (Recommended)

To spin up the entire application stack on a clean machine with a single command:

### Prerequisites

- **Docker Engine** 26.0+ & **Docker Compose** v2.26+
- Port availability on `127.0.0.1`: `3000`, `8080`, `9000`, `5433`, `8025`.

### Setup & Run

```bash
# 1. Clone repository (or navigate to working directory)
cd rikkei-jobs

# 2. Initialize environment configuration from safe defaults
cp .env.example .env

# 3. Spin up all 5 containers with health checking
docker compose up -d --build --wait
```

### Access Points

| Service | URL | Description | Default Credentials |
|---|---|---|---|
| **Frontend Web** | [http://127.0.0.1:3000](http://127.0.0.1:3000) | React Home Page showing Backend Health | None |
| **Backend API** | [http://127.0.0.1:8080/api/v1/health](http://127.0.0.1:8080/api/v1/health) | REST API Health Endpoint (`{"status":"UP"}`) | None |
| **API Swagger UI** | [http://127.0.0.1:8080/swagger-ui.html](http://127.0.0.1:8080/swagger-ui.html) | Springdoc OpenAPI UI (dev profile only) | None |
| **External Mock** | [http://127.0.0.1:9000](http://127.0.0.1:9000) | Mock external LMS/Exam/PM/Meet APIs | `X-Service-Key: dev-key` |
| **Mailpit Web UI**| [http://127.0.0.1:8025](http://127.0.0.1:8025) | Email inspection & fake inbox | None |
| **PostgreSQL DB** | `127.0.0.1:5433` | Database (Database: `rikkeijobs`) | User: `rikkei_app` / Pass: `rikkei_secret` |

### Stopping & Cleaning Up

```bash
# Stop all services and remove containers, networks, and named volumes
docker compose down -v
```

---

## 💻 Running Components Standalone (Without Full Docker)

You can run each component directly on your host machine for active development:

### 1. Prerequisites on Host

- **JDK 25** (OpenJDK / Eclipse Temurin)
- **Node.js 24 LTS** & **npm 10+**
- PostgreSQL 18 instance running (or spin up support services via Docker: `docker compose up -d postgres mailpit`)

### 2. Supporting Infrastructure (Docker)

Start the PostgreSQL and Mailpit containers:

```bash
docker compose up -d postgres mailpit
# PostgreSQL is ready on 127.0.0.1:5433 (DB: rikkeijobs, User: rikkei_app, Pass: rikkei_secret)
# Mailpit Web UI is ready on http://127.0.0.1:8025
```

### 3. External Mock Service

```bash
cd mock
npm install
npm start
# Output: "Mock chạy ở http://localhost:9000"
```

### 4. Backend (Spring Boot)

Ensure PostgreSQL is running on port 5433 with database `rikkeijobs`.

If your machine's `JAVA_HOME` environment variable points to another JDK version (e.g., JDK 21 or JDK 17) while JDK 25 is on `PATH`, override `JAVA_HOME` before executing the Maven Wrapper (as `mvnw` prioritizes `JAVA_HOME` over `PATH`):

- **Linux / macOS**:

  ```bash
  export JAVA_HOME=/path/to/jdk-25
  ```

- **Windows PowerShell**:

  ```powershell
  $env:JAVA_HOME = "C:\path\to\jdk-25"
  ```

Run the backend with the `dev` profile:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# API available at http://localhost:8080
```

### 5. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
# Vite dev server running at http://localhost:3000
```

### 6. Full Project Verification Scripts

You can run automated quality checks (linting, tests, static analysis, formatting) across all services:

```bash
# On Linux / macOS
./check.sh

# On Windows PowerShell
.\check.ps1
```

---

## 👥 Default Sample Accounts (Dev Profile)

The database seed migration automatically provisions 8 sample testing accounts when running in the `dev` profile. All accounts share the password: **`Test@123`**.

| Email | Full Name | Role | LMS User ID | Description |
|---|---|---|---|---|
| `candidate1@rikkeijobs.test` | Nguyễn Văn An | `CANDIDATE` | `lms-sv-001` | Strong Java & Spring Boot, IOC internship completed |
| `candidate2@rikkeijobs.test` | Trần Thị Bình | `CANDIDATE` | `lms-sv-002` | Strong ReactJS & JS, no internship yet |
| `candidate3@rikkeijobs.test` | Lê Minh Châu | `CANDIDATE` | `lms-sv-003` | Basic skill profile, needs improvement |
| `hr1@rikkeijobs.test` | Đại diện Doanh nghiệp A | `HR` | *(None)* | Corporate recruiter for Company A |
| `hr2@rikkeijobs.test` | Đại diện Doanh nghiệp B | `HR` | *(None)* | Corporate recruiter for Company B |
| `mentor1@rikkeijobs.test` | Phạm Quốc Dũng | `MENTOR` | `lms-mt-001` | Project mentor for IOC batch `IOC-JB-2026-09` |
| `staff1@rikkeijobs.test` | Hoàng Thu Hà | `STAFF` | `lms-st-001` | University placement coordinator |
| `admin1@rikkeijobs.test` | Đỗ Thanh Hải | `ADMIN` | `lms-ad-001` | Full system administrator |

*Note: In the `prod` profile or default profile without dev configuration, zero seed accounts are loaded.*

---

## 🔍 Quality Verification & Automated Gates

Run all linting, static analysis, unit tests, and security path checks using the master script:

```bash
# On Linux / macOS
./check.sh

# On Windows PowerShell
.\check.ps1
```

Individual checks:

- **Backend Lint & Format**: `cd backend && ./mvnw spotless:check`
- **Frontend Lint & Test**: `cd frontend && npm run lint && npm run test`
- **End-to-End Integration Suite**: `node e2e/run-all.mjs` (Requires running stack via `docker compose up -d --build --wait`)
- **Forbidden Path Verification**: Clean grep check ensuring zero machine-specific paths or local user folders are committed (Must return zero matches).

---

## 🐳 Clean Isolated CI Runner in Docker (Defect D8 Verification)

To execute the entire GitHub Actions workflow (`.github/workflows/ci.yml` — all 6 jobs) inside a clean, hermetic Ubuntu 22.04 container completely isolated from host state:

```bash
# On Linux / macOS
./scripts/run-ci-in-docker.sh

# On Windows PowerShell
.\scripts\run-ci-in-docker.ps1
```

This harness:

- Builds a hermetic Ubuntu 22.04 runner image (`scripts/ci-runner.Dockerfile`) equipped with Node.js 24 LTS, Temurin Java 25 LTS, and Docker CLI/Compose.
- Mounts the repository read-only (`:ro`) and synchronizes it into an ephemeral workspace volume, strictly excluding host `node_modules`, `backend/target`, and `.m2` caches.
- Runs all 6 quality gate jobs in sequence: `mock-test`, `frontend-check`, `backend-check` (Spotless, SpotBugs, Testcontainers), `docker-compose-check`, `clean-code-and-linters` (11 hygiene checks), and `smoke-test` (multi-container stack, Flyway assertions, seed data, health, mock security gates, and 9/9 E2E test suites).
- Automatically tears down compose services and cleans up ephemeral volumes upon completion.

---

## 📚 Documentation Index

For detailed architectural decisions and operational guides, consult the `docs/` directory:

- [Shared Conventions](docs/conventions.md) — API standards, error codes, 20 skills catalogue, and roles.
- [External Mock Contract](docs/mock-contract.md) — Specification of the 11 external endpoints and 4 testing tools.
- [01 — Architecture Overview](docs/01-architecture-overview.md) *(Bilingual)* — Modular monolith rationale and domain boundaries.
- [02 — Local Development & Troubleshooting](docs/02-local-development-troubleshooting.md) *(Bilingual)* — Developer guide and issue fixes.
- [03 — Version Table](docs/03-version-table.md) *(Bilingual)* — Verified toolchain versions and official source registries.
- [04 — Security & Secrets Policy](docs/04-security-secrets-policy.md) *(Bilingual)* — Zero real secrets rules and RBAC matrix.
- [05 — Open Business Questions](docs/05-open-business-questions.md) *(Bilingual)* — Critical questions with citations from project PDFs.
- [Contributing Guidelines](CONTRIBUTING.md) — Git workflow and pull request process.
