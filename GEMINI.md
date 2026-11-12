# Gemini CLI & Antigravity Configuration - Rikkei Jobs (T022DB0)

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

## 4. Rules & Skills System

### Enterprise Rules Ingestion (Import Processor Directives)

@./.gemini/rules/01-project-context.md
@./.gemini/rules/02-git-and-delivery.md
@./.gemini/rules/03-safety-and-secrets.md
@./.gemini/rules/04-honest-verification.md
@./.gemini/rules/05-backend-java.md
@./.gemini/rules/06-database-flyway.md
@./.gemini/rules/07-security-rbac.md
@./.gemini/rules/08-frontend-engineering.md
@./.gemini/rules/09-frontend-design-bar.md
@./.gemini/rules/10-testing-strategy.md
@./.gemini/rules/11-docs-and-bilingual.md
@./.gemini/rules/12-ci-and-quality-gates.md
@./.gemini/rules/13-backend-data-access-performance.md
@./.gemini/rules/14-backend-module-boundaries.md
@./.gemini/rules/15-backend-observability-ops.md
@./.gemini/rules/16-backend-integrations.md

- Skills Location: .gemini/skills/<skill-name>/SKILL.md (28 task-triggered skills).
  - Trigger Pattern: Every skill description starts with an explicit trigger phrase ("Use when ...").
  - Mandatory Workflow: Always review using-rikkei-skills before undertaking complex or multi-step tasks.
- Command Fallbacks: .gemini/commands/*.toml provide direct command definitions for environments without automatic skill indexing.
- Frontend Design Bar (Rule 09): Zero emoji in UI, custom 24px icon system (<Icon name=... />), WCAG 2.2 AA contrast (>= 4.5:1), purposeful motion tokens with mandatory prefers-reduced-motion.

## 5. Standard Quality Gates

Always verify changes locally before completing any milestone:

- Linux / macOS full gate runner: ./check.sh
- Windows PowerShell full gate runner: .\check.ps1
- Agent configuration validator: node scripts/validate-agent-config.mjs
- Agent configuration mirror check: node scripts/sync-agent-config.mjs --check
