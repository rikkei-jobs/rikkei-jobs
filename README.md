
# Mini API Tuyển Dụng (Spring Boot 3 + Gradle)

Dự án RESTful API quản lý tuyển dụng ứng viên theo yêu cầu thực hành:
- **Công nghệ**: Java 17, Spring Boot 3.3.5, Gradle, Spring Data JPA, MySQL / PostgreSQL, Lombok, JUnit 5, Mockito.
- **Kiến trúc**: Layered Architecture (Controller - Service - Repository - Entity/DTO).

---

## 1. Cấu trúc dự án

```text
recruitment-api/
├── build.gradle
├── settings.gradle
├── README.md
├── src/
│   ├── main/
│   │   ├── java/com/example/recruitment/
│   │   │   ├── RecruitmentApiApplication.java
│   │   │   ├── controller/
│   │   │   │   ├── CompanyController.java
│   │   │   │   └── JobController.java
│   │   │   ├── dto/
│   │   │   │   ├── request/
│   │   │   │   │   ├── CompanyRequest.java
│   │   │   │   │   ├── JobRequest.java
│   │   │   │   │   └── ApplicationRequest.java
│   │   │   │   └── response/
│   │   │   │       ├── CompanyResponse.java
│   │   │   │       ├── JobResponse.java
│   │   │   │       ├── ApplicationResponse.java
│   │   │   │       ├── ErrorResponse.java
│   │   │   │       └── PageResponse.java
│   │   │   ├── entity/
│   │   │   │   ├── Company.java
│   │   │   │   ├── Job.java
│   │   │   │   ├── Application.java
│   │   │   │   └── JobStatus.java
│   │   │   ├── exception/
│   │   │   │   ├── BadRequestException.java
│   │   │   │   ├── DuplicateResourceException.java
│   │   │   │   ├── ResourceNotFoundException.java
│   │   │   │   └── GlobalExceptionHandler.java
│   │   │   ├── repository/
│   │   │   │   ├── CompanyRepository.java
│   │   │   │   ├── JobRepository.java
│   │   │   │   ├── ApplicationRepository.java
│   │   │   │   └── specification/
│   │   │   │       └── JobSpecification.java
│   │   │   └── service/
│   │   │       ├── CompanyService.java
│   │   │       ├── JobService.java
│   │   │       ├── ApplicationService.java
│   │   │       └── impl/
│   │   │           ├── CompanyServiceImpl.java
│   │   │           ├── JobServiceImpl.java
│   │   │           └── ApplicationServiceImpl.java
│   │   └── resources/
│   │       ├── application.yml
│   │       └── schema.sql
│   └── test/java/com/example/recruitment/service/
│       ├── ApplicationServiceImplTest.java
│       └── JobServiceImplTest.java

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
 ab2d61d335da2a1bd496dc14a7c5eefae568bcc8
```

---

## 2. Thiết kế bảng cơ sở dữ liệu (`schema.sql`)

Dự án hỗ trợ MySQL hoặc PostgreSQL. Script chi tiết có trong file `src/main/resources/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS companies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    salary_min DECIMAL(15, 2),
    salary_max DECIMAL(15, 2),
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    company_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_jobs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    cv_url VARCHAR(500) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_applications_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT uq_job_email UNIQUE (job_id, email)
);

CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_applications_job_id ON applications(job_id);
```

---

## 3. Cách chạy ứng dụng

### 3.1. Cấu hình cơ sở dữ liệu
Chỉnh sửa thông số kết nối trong `src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/recruitment_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
    username: root
    password: password
```

### 3.2. Khởi chạy với Gradle
```bash
# Trên Windows
./gradlew bootRun

# Trên Linux / macOS
./gradlew bootRun
```

### 3.3. Chạy Unit Test
```bash
./gradlew test

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
ab2d61d335da2a1bd496dc14a7c5eefae568bcc8
```

---
## 4. Tài liệu và ví dụ Request API

### 4.1. Quản lý Company (CRUD)
- **Tạo công ty**: `POST /companies`
  ```json
  // Request Body
  {
    "name": "Rikkeisoft",
    "address": "Toa nha Handico, Me Tri, Ha Noi",
    "website": "https://rikkeisoft.com"
  }
  ```
- **Lấy danh sách**: `GET /companies`
- **Lấy chi tiết**: `GET /companies/1`
- **Cập nhật**: `PUT /companies/1`
- **Xóa**: `DELETE /companies/1`

### 4.2. Quản lý Job (CRUD, Lọc & Phân trang)
- **Tạo Job**: `POST /jobs`
  ```json
  // Request Body
  {
    "title": "Backend Java Developer",
    "description": "Thành thạo Spring Boot, JPA, MySQL",
    "salaryMin": 1000,
    "salaryMax": 2000,
    "location": "Ha Noi",
    "status": "OPEN",
    "companyId": 1
  }
  ```
- **Lấy danh sách Job có lọc, tìm kiếm, phân trang và sắp xếp**:
  - Endpoint: `GET /jobs?keyword=java&location=Ha Noi&status=OPEN&page=0&size=10&sortBy=id&sortDir=desc`
  - Response (200 OK):
  ```json
  {
    "content": [
      {
        "id": 1,
        "title": "Backend Java Developer",
        "description": "Thành thạo Spring Boot, JPA, MySQL",
        "salaryMin": 1000.00,
        "salaryMax": 2000.00,
        "location": "Ha Noi",
        "status": "OPEN",
        "companyId": 1,
        "companyName": "Rikkeisoft"
      }
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 1,
    "totalPages": 1,
    "last": true
  }
  ```

### 4.3. Nộp hồ sơ ứng tuyển (Application)
- **Nộp đơn**: `POST /jobs/1/applications`
  ```json
  // Request Body
  {
    "fullName": "Nguyen Van Binh",
    "email": "binh.nv@example.com",
    "cvUrl": "https://mycv.site/binhnv.pdf"
  }
  ```
  - Response thành công (**201 Created**):
  ```json
  {
    "id": 1,
    "jobId": 1,
    "jobTitle": "Backend Java Developer",
    "fullName": "Nguyen Van Binh",
    "email": "binh.nv@example.com",
    "cvUrl": "https://mycv.site/binhnv.pdf",
    "appliedAt": "2026-11-05T10:00:00"
  }
  ```

---

## 5. Định dạng lỗi thống nhất (Unified JSON Error Response)

Tất cả các lỗi đều được xử lý qua `@RestControllerAdvice` trả về JSON đồng nhất:

1. **Lỗi 400 Bad Request (Validation hoặc Job CLOSED)**:
   - Khi Job `CLOSED`:
     ```json
     {
       "timestamp": "2026-11-05T10:00:00",
       "status": 400,
       "error": "Bad Request",
       "message": "Công việc hiện đã đóng (CLOSED), không nhận thêm hồ sơ ứng tuyển"
     }
     ```
   - Khi thiếu hoặc sai định dạng dữ liệu đầu vào:
     ```json
     {
       "timestamp": "2026-11-05T10:00:00",
       "status": 400,
       "error": "Bad Request",
       "message": "Dữ liệu đầu vào không hợp lệ",
       "details": {
         "email": "Email không đúng định dạng",
         "fullName": "Họ tên ứng viên không được để trống"
       }
     }
     ```

2. **Lỗi 404 Not Found (Không tìm thấy Job hoặc Company)**:
   ```json
   {
     "timestamp": "2026-11-05T10:00:00",
     "status": 404,
     "error": "Not Found",
     "message": "Không tìm thấy công việc với ID: 999"
   }
   ```

3. **Lỗi 409 Conflict (Trùng email trong cùng một Job)**:
   ```json
   {
     "timestamp": "2026-11-05T10:00:00",
     "status": 409,
     "error": "Conflict",
     "message": "Email 'binh.nv@example.com' đã ứng tuyển vào công việc này trước đó"
   }
   ```

---

## 6. Gợi ý lịch sử Commit Git

Để đạt điểm tối đa cho tiêu chí "Git commit nhỏ, message rõ", bạn có thể commit theo các bước sau:
1. `chore: initialize Spring Boot 3 Gradle project with dependencies`
2. `feat: add Company, Job, Application entities and schema.sql`
3. `feat: add custom exceptions and GlobalExceptionHandler with unified error format`
4. `feat: implement Company CRUD service and controller`
5. `feat: implement Job search, filter by location & status, pagination and sort`
6. `feat: implement apply job API with closed status check and duplicate email validation`
7. `test: add 7 unit tests for ApplicationService and JobService`
8. `docs: add comprehensive README with API examples and setup instruction

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

- **Agent Configuration Validation**: `node scripts/validate-agent-config.mjs` and `node scripts/sync-agent-config.mjs --check` (Quality Gate 25: validates frontmatter schema, line caps, forbidden patterns, mirror parity, and real repository citations).
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
 feature/T022863-dang-nhap
 ab2d61d335da2a1bd496dc14a7c5eefae568bcc8

- [AI Agent Configuration & Skills](docs/agent-config/README.md) *(Bilingual)* — Architecture, 16 enterprise rules, 28 task-triggered skills, validation tooling, and open-source attribution.
 develop
