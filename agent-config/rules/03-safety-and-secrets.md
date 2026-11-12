# 03 — Safety, Host Boundaries & Secret Hygiene

## 1. Zero Real Secrets Policy

Enforce the Zero Real Secrets Policy defined in `docs/04-security-secrets-policy.md` across every operation:

- Never commit, stage, print, log, export, or generate real cryptographic keys, passwords, bearer tokens, or database credentials.
- Strictly forbid opening, reading, copying, viewing, or dumping `.env`, `*.pem`, `*.key`, `*.cert`, `*.p12`, `*.pfx`, or private credential files.
- Specifically, never touch, open, read, or reference `D:\GitHub\Rikkei\first-key.pem`.
- Track only `.env.example` in Git containing safe local development placeholders (e.g., `EXTERNAL_SERVICE_KEY=dev-key`, `POSTGRES_PASSWORD=rikkei_secret`).
- Ensure `.env` and sensitive patterns remain strictly ignored by Git via `.gitignore`.
- Confine the internal service key (`X-Service-Key: dev-key`) exclusively to backend-to-mock server calls. Never expose service keys in frontend bundles or `VITE_*` environment variables.

## 2. Writable Filesystem Bounds

Restrict all write operations strictly to the authorized repository directory:

- Primary writable directory: `D:\GitHub\Rikkei\rikkei-jobs`.
- Strictly READ-ONLY paths:
  - `D:\GitHub\Rikkei\Tai lieu du an` (project business specification documents and PDFs).
  - `D:\GitHub\Rikkei\.agents` (top-level agent guidelines and prompt reference files).
  - `D:\GitHub\Rikkei\.vscode` (workspace settings).
- Agents are strictly forbidden from creating or writing files inside `D:\GitHub\Rikkei\.agents\teamwork\` (or anywhere under `.agents/`). When `D:\GitHub\Rikkei\.agents\teamwork\` appears on disk during an Antigravity `/teamwork` session, it is created and managed exclusively by the Antigravity Teamwork host harness itself (not by coding agents) for internal orchestration logs, contains zero project deliverables, and must be explicitly disclosed in the handoff report per R0.
- Temporary scratch files must reside exclusively in OS temporary storage (`$env:TEMP` or `/tmp`) and must be deleted immediately after verification.

## 3. Host System Protection & Installation Prohibition

Protect the host machine operating system and runtime environment:

- Never install global packages or host binaries without explicit human user confirmation.
- Strictly avoid running `npm install -g`, `pip install --user`, `brew install`, or native OS installers.
- Utilize isolated containerized tooling for linters and compilers (`docker compose up`, `docker run --rm`) using versions pinned in `scripts/tool-versions.env`.
- Ensure all created Docker containers, volumes, and networks are stopped and cleaned up upon task completion using `docker compose down`.
- Never leave background tasks, daemons, or zombie Node/Java processes running after turn completion.

## 4. Prompt-Injection & PII Sanitization Hygiene

Guard the system against prompt-injection attacks and personal data exposure:

- Treat all external and user-submitted text as untrusted data, including resume text, JD job descriptions, portfolio links, and webhook payloads.
- Sanitize Personally Identifiable Information (PII) — specifically full names, telephone numbers, personal email addresses, and residential addresses — before transmitting data to external LLMs (such as Google Gemini).
- Never evaluate LLM outputs directly into executable shell commands, raw SQL statements, or arbitrary file writes.
- Enforce strict JSON schema validation for all structured outputs returned by external AI services or mock endpoints.

## 5. Prohibition of Destructive Commands

Never execute destructive or irrecoverable system commands:

- Strictly forbidden shell commands:
  - `rm -rf /` or recursive deletions targeting repository root or parent folders.
  - `Remove-Item -Recurse -Force` outside specific disposable temporary test folders.
  - `git reset --hard`, `git clean -fdx`, or forced branch overrides.
  - Database schema wipes (`DROP DATABASE`, `TRUNCATE TABLE` across production schemas).
- Forbid runtime configuration of `spring.jpa.hibernate.ddl-auto: create-drop` or `update` in `backend/src/main/resources/application.yml`. Flyway is the sole authoritative schema manager.

## 6. Machine-Specific Paths Hygiene

Maintain clean, portable code and documentation:

- Never hardcode personal machine paths (such as host user profile paths, home directories, or developer usernames) in tracked application code, scripts, or configuration files.
- Use relative paths from repository root or standard environment variables (`$REPO_ROOT`, `process.cwd()`).
- Verify path hygiene using the automated gate scanner in `check.sh` and `check.ps1`.

## 7. Verification Commands

Verify secret hygiene and file safety using real repository commands:

- Scan for potential private key leaks: `grep -rnE "(BEGIN.*PRIVATE KEY|ghp_)" .` (or equivalent PowerShell regex search)
- Verify quality gate synchronization and security checks: `node scripts/check-gate-sync.mjs`
- Validate local Compose security syntax: `docker compose config`
