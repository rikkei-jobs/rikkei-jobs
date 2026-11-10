# Contributing to Rikkei Jobs

Thank you for contributing to **Rikkei Jobs** — the competency-verified hiring platform connecting students with tech enterprises.

To maintain code quality, architecture integrity, and team velocity across our modular monolith, all contributors must strictly adhere to the guidelines set forth below.

---

## 1. Git Workflow & Branching Strategy

Our branching model is based on Git Flow optimized for task-driven sprints:

- **`main`**: Production-ready branch. Only release tags and approved merges from `develop` land here.
- **`develop`**: Active integration branch. All feature branches merge into `develop`.
- **`feature/<task-code>-<short-name>`**: Working feature branches created from `develop`.
  - *Example*: `feature/t022db0-project-skeleton`, `feature/nt01-sso-login`.
  - *Rule*: Never push directly to `main` or `develop`.

### Pull Requests (PR) Conventions
- **Target Branch**: Every PR MUST target `develop`. Merging directly to `main` is strictly forbidden.
- **PR Title Format**: Must begin with the uppercase Task ID:
  ```text
  [TASK_ID]: <Concise description of the change>
  Example: T022DB0: Set up project skeleton, conventions and external mocks
  ```
- **PR Description**: Fill out all sections in `.github/pull_request_template.md`.

### Commit Message Conventions
Every commit message must be written in English and begin with the Task ID:
```text
<TASK_ID>: <type>(<scope>): <short summary>

[Optional detailed body explaining WHY the change was made]

[Optional footer: issue reference or breaking changes]
```

**Allowed Types**:
- `feat`: A new user-facing or technical capability.
- `fix`: A bug fix.
- `docs`: Documentation updates only.
- `style`: Changes that do not affect code logic (formatting, white-space).
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Build process, dependency updates, tooling configuration.

*Examples*:
- `T022DB0: feat(backend): initialize modular monolith skeleton with Spring Boot 4`
- `T022DB0: docs(conventions): specify API error formats and 20 skills catalogue`
- `T022DB0: test(backend): add Testcontainers migration mutation check`

---

## 2. Naming Conventions

Consistency across code, data, and APIs is essential:

| Layer | Target | Convention | Example |
|---|---|---|---|
| **Database** | Table names | `snake_case` (plural) | `users`, `roles`, `internship_batches` |
| **Database** | Column names | `snake_case` | `full_name`, `lms_user_id`, `created_at` |
| **Database** | Primary Keys | `id` (UUIDv7 or BIGINT) | `id` |
| **Backend (Java)** | Package names | lowercase dot-separated | `com.rikkei.jobs.identity.domain` |
| **Backend (Java)** | Class / Interface | `PascalCase` | `ExternalApiClient`, `SkillProfileService` |
| **Backend (Java)** | Method / Variable | `camelCase` | `verifyTicket()`, `assessmentScore` |
| **Backend (Java)** | Constants | `UPPER_SNAKE_CASE` | `DEFAULT_PAGE_SIZE`, `MAX_RETRY_COUNT` |
| **API (JSON)** | Keys / Payload fields | `camelCase` | `lmsUserId`, `issuedAt`, `errorCode` |
| **Frontend (React)** | Components / Files | `PascalCase` | `CandidateProfile.tsx`, `HealthStatus.tsx` |
| **Frontend (TS)** | Hooks / Functions | `camelCase` | `useAuth()`, `fetchBackendHealth()` |
| **Frontend (TS)** | Constants | `UPPER_SNAKE_CASE` | `API_BASE_URL`, `TOKEN_KEY` |

---

## 3. Modular Monolith Architecture Rules

Rikkei Jobs is built as a single deployable Modular Monolith. To prevent architectural decay, the following boundaries are non-negotiable:

1. **Module Table Ownership**:
   - Each database table is exclusively owned by exactly one module.
   - Cross-module direct writes (`INSERT`, `UPDATE`, `DELETE`) are strictly prohibited.
2. **No Cross-Module Foreign Keys & Joins**:
   - Physical `FOREIGN KEY` constraints must NEVER cross module boundaries.
   - Raw SQL `JOIN` across tables of different modules is prohibited. Store plain IDs (UUID/Long) for cross-module references.
3. **Communication via Interfaces and Events**:
   - Modules interact exclusively through clean Java Service Interfaces (exposing immutable DTOs/Records) or Spring `ApplicationEventPublisher`.
   - Never expose internal JPA Entities across module boundaries.
4. **Centralized External Integrations**:
   - All outbound network calls to external systems (LMS, Exam, PM, Meet) must be routed through `ExternalApiClient` in the shared infrastructure module. Direct HTTP calls from domain modules are forbidden.

---

## 4. Code Style & Quality Gates per Component

Before opening a pull request, run local quality checks for each affected component:

### Backend (`backend/`)
- **Formatting**: Spotless with Google Java Format.
  ```bash
  # Check formatting
  ./mvnw spotless:check
  # Auto-format
  ./mvnw spotless:apply
  ```
- **Compilation & Static Analysis**: Zero compiler warnings (`-Xlint:all -Werror`).
  ```bash
  ./mvnw clean compile
  ```
- **Automated Tests**:
  ```bash
  ./mvnw test
  ```

### Frontend (`frontend/`)
- **Linting & Code Style**:
  ```bash
  npm run lint
  ```
- **Type Checking**:
  ```bash
  npm run typecheck
  ```
- **Unit Testing**:
  ```bash
  npm run test
  ```
- **Production Build**:
  ```bash
  npm run build
  ```

### External Systems Mock (`mock/`)
- **Syntax & Execution**:
  ```bash
  cd mock
  npm install
  npm test
  ```

### Full Repository Quality Script
You can verify the entire repository with a single command:
```bash
# On Linux / macOS
./check.sh

# On Windows (PowerShell)
.\check.ps1
```

---

## 5. Security & Confidentiality Policies

- **Zero Real Secrets**: Never commit real API keys, passwords, private keys, or certificates.
- **Environment Files**: Commit `.env.example` with safe placeholder defaults. Keep `.env` strictly ignored by git.
- **Clean Grep Rule**: The repository must be completely free of developer-specific machine paths or personal home directories. Ensure no absolute host paths are hardcoded across any repository file.
- **No Leftover Debugging**: Ensure no `console.log`, `System.out.println`, or lingering `TODO` / `FIXME` comments remain.

---

## 6. Definition of Done (DoD)

A task or pull request is considered complete ONLY when:
1. All functional requirements specified in the task description are implemented.
2. Code strictly adheres to the Modular Monolith rules and naming conventions.
3. Automated unit and integration tests are written and pass with 100% green status on real test environments (no facade mocks).
4. Code passes all linters, type checks, and formatters with zero warnings.
5. All public documentation (numbered bilingual docs, conventions, contracts) is updated and verified.
6. Local Docker Compose spins up cleanly via `docker compose up -d --build --wait`.
7. CI pipeline passes completely on GitHub Actions.
