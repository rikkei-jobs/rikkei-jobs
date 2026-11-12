# AI Coding Agent Instructions - Rikkei Jobs (T022DB0)

## 1. Project Context & Architecture

Rikkei Jobs is an enterprise education and recruitment platform engineered as a Modular Monolith.

- Business Domains (7): identity, candidate, company/job, internship, assessment, learning, recruitment (plus stateless ai assistant).
- User Roles (5): CANDIDATE, HR, MENTOR, STAFF, ADMIN.
- Sprint / Task Code: T022DB0. Repository Root: rikkei-jobs.
- Communication Policy: Agent responses and progress reports in Vietnamese; code comments, rule/skill bodies, and commit proposals in English.

## 2. Verified Technology Stack

- Backend: Java 25 LTS (Eclipse Temurin 25.0.5_8), Spring Boot 4.1.2, Flyway 12.4.0, PostgreSQL 18.6-alpine, Testcontainers 2.0.5.
- Frontend: React 19.3.1, Vite 8.3.7, TypeScript 6.0.3 (strict), Vitest 5.1.0, ESLint 10.14.0, Prettier 3.9.10.
- Linters & Static Analysis: Spotless 3.11.0, Google Java Format 1.30.0, SpotBugs 4.10.5.0, Markdownlint 0.24.0, CSpell 10.4.1.
- External Mock Server: Express 5.3.0 on Node.js 24 Alpine, shared header X-Service-Key: dev-key (development profile only).

## 3. Invariant Operational Constraints (R0 / R1)

- Git is Strictly READ-ONLY: Never run commit, push, stage, amend, rebase, reset, stash, tag, or branch-switch commands. Leave all modifications uncommitted. Only the Team Lead commits. Proposed commit messages must be in English with prefix T022DB0:.
- File System Bounds: Write operations are restricted strictly to rikkei-jobs. Never modify files in Tai lieu du an, .agents, or .vscode. Temp files are permitted only in OS temp and must be cleaned up immediately.
- Secret Hygiene: Zero real secrets. Never read, create, log, or commit .env, *.pem, or credentials. Use .env.example with safe defaults.
- Honest Gates: Every PASS claim must provide verifiable raw command output. Never fake numbers or bypass failing checks. Report all failures honestly.
- Scope Boundary: Scope is restricted to agent configuration, rules, skills, and validation tooling. Do not alter backend, frontend, or mock application code.

## 4. Rules & Skills Architecture

- Canonical Source of Truth: agent-config/ directory inside the repository.
  - agent-config/rules/: 16 core single-topic rules (01 through 16).
  - agent-config/skills/: 28 task-triggered domain and process skills.
  - agent-config/templates/: Root entrypoints and tool-specific configuration templates.
- Active Tool Mirrors: Synchronized byte-identically to .claude/ and .gemini/ via scripts/sync-agent-config.mjs.
- Execution Guidelines: Prior to writing any code, consult applicable rules and trigger matching skills using using-rikkei-skills.
- Frontend Design Bar (Rule 09): Zero emoji in UI, custom 24px icon system (<Icon name=... />), WCAG 2.2 AA contrast (>= 4.5:1), purposeful motion tokens with mandatory prefers-reduced-motion.

## 5. Standard Quality Gates

Always verify changes locally before completing any milestone:

- Linux / macOS full gate runner: ./check.sh
- Windows PowerShell full gate runner: .\check.ps1
- Agent configuration validator: node scripts/validate-agent-config.mjs
- Agent configuration mirror check: node scripts/sync-agent-config.mjs --check
