---
name: ci-local-and-debug
description: Use when running quality gates locally, reproducing GitHub Actions CI failures in Docker, or investigating build, test, and lint issues.
---

# Local Quality Gates & Docker CI Debugging

## 1. Overview

The Rikkei Jobs Continuous Integration (CI) infrastructure guarantees that all code entering the repository satisfies enterprise quality, safety, and performance standards before merge. The CI pipeline defined in `.github/workflows/ci.yml` consists of six distinct, parallelized and staged jobs.

The 6 CI Jobs:

- `mock-test`: Validates the standalone Express.js 5.3.0 external mock service under Node 24 LTS via `npm test`.
- `frontend-check`: Executes ESLint 10.14.0, TypeScript 6.0.3 strict typecheck, Vitest 5.1.0 unit tests, and Vite 8.3.7 production build.
- `backend-check`: Executes Spotless 3.11.0 format check, SpotBugs 4.10.5.0 static analysis, Maven compiler validation under Java 25 (`-Xlint:all -Werror`), and JUnit 5 tests with Testcontainers 2.0.5.
- `docker-compose-check`: Verifies `docker compose config` syntax and builds all service container images.
- `clean-code-and-linters`: Enforces hygiene scans (machine-specific path leaks, lingering TODO comments, private keys), Markdownlint 0.24.0, CSpell 10.4.1 (with Vietnamese dictionary), Version drift, Gate synchronization, Yamllint, Hadolint, Actionlint, and SQLFluff.
- `smoke-test`: Boots the complete container stack (`docker compose up -d --build --wait`), verifies Flyway V1+V2 migrations, verifies PostgreSQL seed data (8 users, 20 skills), verifies `/api/v1/health`, verifies frontend HTTP 200, and executes multi-tier E2E tests (`node e2e/run-all.mjs`).

Local tooling provides two tiers of execution:

- Host-level quick verification via `check.ps1` (Windows) and `check.sh` (Linux) covering 25 active gates.
- Clean containerized replication via `scripts/run-ci-in-docker.ps1` and `scripts/run-ci-in-docker.sh` using `scripts/ci-runner.Dockerfile` with Docker-out-of-Docker socket mapping.

## 2. When to Use / When NOT to Use

### When to Use

- Running pre-handoff quality gates locally before submitting work to the Team Lead.
- Reproducing and debugging failures observed in GitHub Actions CI runs within an identical Linux container environment.
- Running Docker-based linters (Hadolint, Yamllint, Actionlint, SQLFluff) without installing toolchains directly on the host machine.
- Resolving cross-platform divergence between Windows host execution and Linux CI runners (case sensitivity, line endings, script execution permissions).

### When NOT to Use

- Running a single targeted unit test during local development (use `cd backend && ./mvnw test` or `npm test` in the respective submodule).
- Performing in-depth security audits of API endpoints or permissions -> Use `security-review-checklist`.
- Authoring feature slice components or hooks -> Use `frontend-feature-slice`.

## 3. Step-by-Step Process

### Step 1: Run Host-Level Quality Gates

- On Windows PowerShell:

```powershell
.\check.ps1
```

- On Linux or Git Bash:

```bash
./check.sh
```

- Observe terminal gate indicators to identify which of the 25 active gates failed.

### Step 2: Triage Failures by Subsystem

- **Frontend Failures**:

```bash
cd frontend
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

- **Backend Failures**:

```bash
cd backend
./mvnw spotless:check
./mvnw spotbugs:check
./mvnw clean test-compile
./mvnw test
```

- If Spotless fails: format code using `cd backend && ./mvnw spotless:apply`.
- **Mock Service Failures**:

```bash
cd mock
npm test
```

- **Code Hygiene & Linter Failures**:
  - Machine path leak: scan for forbidden personal user profile paths (such as host home directories).
  - Lingering comments: search for unresolved comments in production code.
  - Secret leak: scan for private key header blocks (such as RSA private keys) and personal tokens.
  - Gate sync: verify gate parity via `node scripts/check-gate-sync.mjs`.

### Step 3: Reproduce in Clean Docker CI Harness

When failures occur only on GitHub Actions or require Docker-hosted linters:

- Execute the Docker harness script on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-ci-in-docker.ps1
```

- Or on Linux / Git Bash:

```bash
./scripts/run-ci-in-docker.sh
```

- The harness automatically:
  - Builds `scripts/ci-runner.Dockerfile` into `rikkei-ci-runner`.
  - Allocates an isolated Docker volume for clean execution.
  - Replicates clean source code excluding host artifacts (`node_modules`, `target`, `dist`, `.m2`).
  - Maps the Docker socket (`/var/run/docker.sock`) with containerized Testcontainers support.
  - Executes all 6 CI jobs sequentially in a native Ubuntu container.

### Step 4: Inspect Remote GitHub Actions Logs (Read-Only)

- Use GitHub CLI in read-only inspection mode:

```bash
gh run list --workflow=ci.yml -L 3
gh run view <RUN_ID> --log-failed
```

- Never trigger workflows or alter remote settings from automated agent sessions.

### Step 5: Root-Cause Remediation

- Address the root cause in source or configuration files.
- Never disable tests or suppress compiler warnings (do NOT skip tests or remove `-Werror`).

### Step 6: Full Verification Pass

- Re-run `.\check.ps1` or `./check.sh` and ensure all 25 active gates PASS with Exit Code 0.

## 4. Iron Laws

- **Law 1: Zero Suppression of Quality Gates.** Bypassing compiler checks, removing `-Werror`, disabling SpotBugs, skipping tests via flags, or commenting out failing assertions to pass CI is strictly forbidden. All defects must be resolved at their root cause.
- **Law 2: Docker CI Harness as the Gold Standard.** The containerized Docker CI harness (`scripts/run-ci-in-docker.ps1` / `scripts/run-ci-in-docker.sh`) is the definitive proof of CI parity. "It runs on my machine" claims are invalid unless proven through `check.ps1` or the Docker harness.
- **Law 3: Read-Only Remote Inspection.** When using `gh` CLI, only read-only queries (`gh run list`, `gh run view`) are permitted. Triggering remote runs or mutating repository settings from agent sessions is strictly prohibited.

## 5. Red Flags

- Claiming task completion without executing `check.ps1` or `check.sh`.
- Machine-specific paths leaking into committed files.
- Lingering `TODO` or `FIXME` comments in production code (`backend/src/main`, `frontend/src`, `mock`).
- Weakening Maven compiler flags by deleting `-Werror` to ignore Java compiler warnings.
- Leaving orphaned containers or dangling Docker volumes after running the CI harness.

## 6. Rationalization Table

| Excuse | Technical Reality |
|---|---|
| "The compiler warning is harmless, removing `-Werror` allows us to ship faster." | The `-Werror` flag prevents unchecked conversions, deprecation hazards, and subtle type bugs in Java 25. Warnings in production code are treated as errors. |
| "Running the full Docker CI harness takes too long; running unit tests locally is enough." | Many issues only manifest in Linux environments (case-sensitive filenames, script execution bits, Testcontainers volume mounting). The harness prevents broken pipelines. |
| "A quick TODO comment is useful for remembering future enhancements." | CI Gate 26 strictly fails builds when TODO/FIXME comments exist in production source. Tasks must be tracked in issue trackers, not scattered across code. |

## 7. Verification Checklist

- [ ] `.\check.ps1` or `./check.sh` exits with code 0 and reports all 25 active gates PASS.
- [ ] No machine-specific paths leaked across repository files.
- [ ] No lingering TODO/FIXME comments in `backend/src/main`, `frontend/src`, or `mock`.
- [ ] No private keys or secret patterns detected across the repository.
- [ ] Clean Docker CI harness executes all 6 jobs cleanly without orphan volumes.

## 8. Rikkei Jobs Specifics

- Verification scripts: `check.ps1`, `check.sh`, `scripts/check-gate-sync.mjs`.
- Docker harness files: `scripts/run-ci-in-docker.ps1`, `scripts/run-ci-in-docker.sh`, `scripts/ci-runner.Dockerfile`.
- Workflow specification: `.github/workflows/ci.yml`.
- Pinned tool version catalog: `scripts/tool-versions.env`.
- Standard verification command:

```powershell
.\check.ps1
```
