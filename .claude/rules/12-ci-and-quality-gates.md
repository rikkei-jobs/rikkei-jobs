# 12 — Continuous Integration and Quality Gates

Execute all quality gates locally before pushing changes. Maintain strict parity across local scripts and continuous integration pipelines.

## 1. Quality Gate Architecture and Counts

Maintain synchronization across all verification runners:

- Local verification runners `check.sh` and `check.ps1` define exactly 28 quality gate definitions.
- Active runtime gates count exactly 25 gates during standard execution.
- Fallback defensive gates count exactly 3 gates, executed only when required files are missing:
  - `Frontend Verification Gates` (triggers when `frontend/package.json` is missing)
  - `Backend Verification Gates` (triggers when `backend/pom.xml` is missing)
  - `Docker Compose Configuration` (triggers when `docker-compose.yml` is missing)
- Continuous integration maps these definitions to 21 distinct verification checks in `.github/workflows/ci.yml`.
- Verify gate synchronization using `scripts/check-gate-sync.mjs`:

```bash
node scripts/check-gate-sync.mjs
```

- Reject any gate modification that introduces drift between `check.sh`, `check.ps1`, and `.github/workflows/ci.yml`.

## 2. GitHub Actions CI Jobs

The continuous integration pipeline in `.github/workflows/ci.yml` consists of 6 parallel and sequential jobs:

1. `mock-test`: Installs Node 24 dependencies and runs `npm test` inside `mock/`.
2. `frontend-check`: Runs ESLint, TypeScript typecheck, Vitest unit tests, and Vite production build in `frontend/`.
3. `backend-check`: Runs Spotless style check, SpotBugs analysis, Maven compilation (`-Xlint:all -Werror`), and Testcontainers tests in `backend/`.
4. `docker-compose-check`: Validates `docker-compose.yml` syntax via `docker compose config` and builds container images.
5. `clean-code-and-linters`: Runs Hadolint, Yamllint, Actionlint, SQLFluff, Markdownlint, CSpell, path leak scan, TODO/FIXME scan, secret scan, version drift check, gate sync check, and agent config sync check.
6. `smoke-test`: Depends on all preceding jobs. Launches full container stack via Docker Compose, validates database migrations, verifies health endpoints, and executes end-to-end integration tests.

## 3. Pinned Tool and Linter Versions

Pin all containerized linter and tool versions in `scripts/tool-versions.env`. Do not use floating or latest tags:

- `HADOLINT_VERSION=v2.15.1`: Dockerfile linting for backend, frontend, and mock.
- `YAMLLINT_VERSION=1-0.14`: YAML validation for workflows and compose files.
- `ACTIONLINT_VERSION=1.7.12`: GitHub Actions workflow syntax validation.
- `SQLFLUFF_VERSION=4.5.0`: SQL migration linting for PostgreSQL Flyway scripts.
- `MARKDOWNLINT_VERSION=0.24.0`: Markdown documentation style enforcement.
- `CSPELL_VERSION=10.4.1`: Spelling checking across codebase and documentation.
- `CSPELL_DICT_VI_VERSION=3.0.7`: Vietnamese language dictionary extension for CSpell.

Always source versions from `scripts/tool-versions.env` when executing linters in containerized environments.

## 4. Isolated Docker CI Reproduction

Reproduce continuous integration execution in an isolated container environment before delivery:

- Run the Docker CI harness on PowerShell:

```powershell
powershell -File scripts/run-ci-in-docker.ps1
```

- Run the Docker CI harness on Bash:

```bash
./scripts/run-ci-in-docker.sh
```

- The harness builds `scripts/ci-runner.Dockerfile`, mounts the repository as read-only (`:ro`), clones it into an ephemeral Docker volume, and executes all 6 CI jobs without polluting the host environment.
- Verify that all jobs complete with exit code 0.

## 5. Local Quality Gate Execution

Run full local verification before handoff:

- On Linux/macOS:

```bash
./check.sh
```

- On Windows:

```powershell
.\check.ps1
```

- Ensure all 25 active runtime gates report `PASS`. Never fake or bypass any gate.
