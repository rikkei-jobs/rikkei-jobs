# 11 — Documentation, Bilingual Standards, and Linters

## 1. Core Principles

Maintain authoritative, synchronized, and error-free project documentation.
Apply clear separation between English and Vietnamese linguistic contexts.
Enforce automated verification to eliminate version drift and documentation defects.

## 2. Bilingual Documentation Policy

Enforce specific languages based on the target audience and document classification:

- Core Technical Architecture (docs/): Maintain English as the primary authoritative text. Bilingual files must provide structured English and Vietnamese sections (e.g. docs/03-version-table.md Part 1 English, Part 2 Vietnamese).
- Agent Rules and Skills (agent-config/): Author rules and skills in clear, unambiguous English to ensure optimal LLM instruction comprehension.
- Team Coordination and Progress Reports: Communicate, plan, explain code, and draft handoff reports entirely in Vietnamese, adhering to project global communication standards.
- Git Commit Messages and PRs: Write commit messages strictly in English prefixed with the task code: T022DB0: <description>.

## 3. Version Drift Verification (docs/03)

Treat docs/03-version-table.md as the Single Source of Truth for all technology versions:

- Automated Verification Script: Execute scripts/check-version-drift.mjs to perform exact token matching across both English and Vietnamese sections against real manifests:
  - backend/pom.xml (Java 25, Spring Boot 4.1.2, Flyway 12.4.0, PostgreSQL JDBC 42.7.14, Spotless 3.11.0, SpotBugs 4.10.5.0, Testcontainers 2.0.5, Springdoc 3.2.0).
  - frontend/package.json (React 19.3.1, TypeScript 6.0.3, Vite 8.3.7, Vitest 5.1.0, ESLint 10.14.0, Prettier 3.9.10).
  - mock/package.json (Express 5.3.0).
  - scripts/tool-versions.env (Hadolint v2.15.1, Yamllint 1-0.14, Actionlint 1.7.12, SQLFluff 4.5.0, Markdownlint 0.24.0, CSpell 10.4.1, Dict Vi 3.0.7).
  - docker-compose.yml (Postgres 18.6-alpine, Node 24.22.2-alpine3.23, Mailpit v1.33.1).
- Quality Gate Enforcement: Any version discrepancy triggers a fail-fast exit code 1 in check.sh, check.ps1, and CI workflows.

## 4. Documentation Linters and Quality Compliance

Enforce continuous documentation linting via Markdownlint and CSpell:

- Markdownlint: Enforce formatting standards configured in .markdownlint-cli2.jsonc (proper heading hierarchy, no trailing spaces).
- CSpell Spelling Checker: Enforce bilingual spelling validation configured in cspell.json:
  - Enabled languages: language: "en,vi" importing @cspell/dict-vi-vn/cspell-ext.json.
  - Adding Domain Terms: When introducing legitimate technical terms, acronyms, or proper nouns, register them in cspell.json under the words array.
  - Never bypass spelling checks with inline ignore comments when words can be properly added to the project dictionary.

## 5. Verification Commands

Verify documentation integrity and linter compliance locally:

```bash
# Verify version table synchronization against project manifests
node scripts/check-version-drift.mjs

# Verify markdown syntax and formatting
npx markdownlint-cli2 "**/*.md"

# Verify English and Vietnamese spelling across documentation
npx cspell "**/*.md"
```
