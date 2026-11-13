---
name: docs-bilingual-update
description: Use when authoring, translating, or maintaining bilingual documentation across docs/ and verifying synchronization scripts and linters.
---

# Bilingual Documentation Maintenance & Verification

## 1. Overview

Documentation in the Rikkei Jobs repository serves as the Single Source of Truth guiding both human software engineers and autonomous AI coding agents (Claude Code and Gemini CLI / Antigravity). Technical documentation under `docs/` is authored and maintained under a strict bilingual English / Vietnamese standard.

Core documentation disciplines:

- Symmetrical two-part bilingual architecture: `## Part 1: English Section` followed by `## Part 2: Vietnamese Section / Bản dịch Tiếng Việt`, applied systematically to foundation policies such as `docs/03-version-table.md` and `docs/04-security-secrets-policy.md`.
- Automated version drift prevention: programmatic verification via `node scripts/check-version-drift.mjs`, ensuring zero divergence between documentation tables and build manifests.
- Multi-engine linting and orthographic compliance: Markdown formatting enforced via `markdownlint-cli2@0.24.0`, alongside dual-language spellchecking via `cspell@10.4.1` with the official Vietnamese dictionary extension `@cspell/dict-vi-vn@3.0.7`.
- Atomic documentation updates: documentation modifications must be authored, validated, and packaged concurrently with the corresponding code changes.

## 2. When to Use / When NOT to Use

### When to Use

- Authoring new technical specifications, architecture records, or guides under `docs/`.
- Updating existing documentation files (`docs/01-architecture-overview.md` through `05-open-business-questions.md`, `docs/conventions.md`, `docs/mock-contract.md`).
- Upgrading software dependencies and synchronizing the canonical matrix in `docs/03-version-table.md`.
- Diagnosing and resolving markdownlint structural errors or cspell spelling violations.

### When NOT to Use

- Implementing application source code in Java, TypeScript, or Express mock services.
- Modifying GitHub Actions workflow definitions in `.github/workflows/ci.yml` -> Use `ci-local-and-debug`.
- Authoring or refining agent operational rules or skills under `agent-config/` -> Use `writing-skills`.

## 3. Step-by-Step Process

### Step 1: Identify Document Structure & Bilingual Pattern

- For technology matrices and security policies (`docs/03-version-table.md`, `docs/04-security-secrets-policy.md`), adhere to the exact symmetrical two-part structure:
  - Root Header: `# <NN> — <English Title> / <Vietnamese Title>`
  - Separator: `---`
  - Section 1: `## Part 1: English Section`
  - Separator: `---`
  - Section 2: `## Part 2: Vietnamese Section / Bản dịch Tiếng Việt`
- For narrative architecture guides (`docs/01-architecture-overview.md`, `docs/02-local-development-troubleshooting.md`, `docs/05-open-business-questions.md`, `docs/conventions.md`), author clear English technical copy with precise Vietnamese annotations for core business entities.

### Step 2: Synchronize Technology Version Matrices (`docs/03-version-table.md`)

- Whenever modifying versions in project manifests (`backend/pom.xml`, `frontend/package.json`, `mock/package.json`, `docker-compose.yml`, `scripts/tool-versions.env`), update the corresponding version cells in BOTH Part 1 and Part 2 of `docs/03-version-table.md`.
- Confirm that version strings, component names, and official vendor registry URLs match verbatim between the English and Vietnamese tables.

### Step 3: Run the Mechanical Version Drift Checker

- Execute the drift detection script from the repository root:

```bash
node scripts/check-version-drift.mjs
```

- The script parses every version token from `docs/03-version-table.md` and compares it against actual disk manifests.
- Verify that the output prints all PASS confirmations and terminates with Exit Code 0.

### Step 4: Validate Markdown Style with `markdownlint-cli2`

- Execute the markdown style validator:

```bash
npx --yes markdownlint-cli2@0.24.0 "**/*.md" "#**/node_modules/**" "#**/target/**" "#**/dist/**" "#**/.agents/**"
```

- Adhere to `.markdownlint-cli2.jsonc`: 2-space list indentation, no raw HTML, no trailing spaces, and proper fenced code block language tags.

### Step 5: Validate Spelling with `cspell` (Including Vietnamese Dictionary)

- Execute the bilingual spellchecker:

```bash
npx --yes --package cspell@10.4.1 --package @cspell/dict-vi-vn@3.0.7 cspell "**/*.md"
```

- If legitimate domain terminology or tool names (e.g., `Rikkei`, `Testcontainers`, `Flyway`, `SpotBugs`) trigger warnings, add the words to the `"words"` array in `cspell.json`.
- NEVER add misspelled words to `cspell.json` to bypass linter errors.

### Step 6: Maintain Standard Bilingual Domain Lexicon

Consistently apply canonical translations across documentation:

- Modular Monolith -> Kiến trúc Modular Monolith
- Candidate -> Ứng viên (Sinh viên / Học viên)
- HR -> Doanh nghiệp tuyển dụng
- Mentor -> Giảng viên / Người hướng dẫn
- Staff -> Cán bộ tuyển dụng / Điều phối
- Admin -> Quản trị viên hệ thống
- Skill Profile -> Hồ sơ năng lực
- Skill Gap -> Khoảng thiếu hụt kỹ năng
- Assessment Form -> Phiếu đánh giá năng lực

## 4. Iron Laws

- **Law 1: Zero Version Drift.** Discrepancies between `docs/03-version-table.md` and repository manifests (`pom.xml`, `package.json`, `docker-compose.yml`, `tool-versions.env`) are strictly forbidden. `node scripts/check-version-drift.mjs` must always exit with code 0.
- **Law 2: Symmetrical Two-Part Parity.** In bilingual documents (`docs/03-version-table.md`, `docs/04-security-secrets-policy.md`), technical versions, tables, and architectural guarantees in Part 1 (English) and Part 2 (Vietnamese) must remain strictly 1:1 synchronized.
- **Law 3: Honest Spellcheck Additions.** Adding intentionally misspelled words or malformed tokens to `cspell.json` to silence warnings is strictly prohibited. Only verified proper nouns, library identifiers, or technical terms may be added.

## 5. Red Flags

- `node scripts/check-version-drift.mjs` throwing version mismatch errors during quality gates.
- Updating the English section of `docs/03-version-table.md` or `docs/04-security-secrets-policy.md` while leaving the Vietnamese translation outdated.
- Markdown documents containing UTF-8 Byte Order Marks (BOM) or CRLF line endings instead of standard LF.
- Adding arbitrary unverified strings to `cspell.json` instead of correcting spelling mistakes in markdown text.

## 6. Rationalization Table

| Excuse | Technical Reality |
|---|---|
| "The documentation is just descriptive text; real code in `pom.xml` is what counts." | Documentation is the Single Source of Truth for human reviewers and agents. Drift between docs and manifests causes confusion and breaks Quality Gate 23 in CI. |
| "Translating the version table to Vietnamese is redundant since version numbers are universal." | Symmetrical bilingual parity is a core contract of the Rikkei Jobs repository. Neglecting the Vietnamese section creates incomplete documentation for domestic stakeholders. |
| "Adding the red word to `cspell.json` is faster than researching the correct spelling." | Subverting cspell allows typos to enter production documentation, undermining enterprise quality standards. |

## 7. Verification Checklist

- [ ] `node scripts/check-version-drift.mjs` exits with code 0 and confirms all manifest tokens match.
- [ ] `npx markdownlint-cli2` runs cleanly with zero lint diagnostics.
- [ ] `npx cspell` runs cleanly with zero spelling errors across all markdown files.
- [ ] Version matrices in Part 1 (English) and Part 2 (Vietnamese) of `docs/03-version-table.md` match identically.
- [ ] All markdown files are encoded in UTF-8 without BOM and use standard LF line endings.

## 8. Rikkei Jobs Specifics

- Documentation directory: `docs/01-architecture-overview.md` through `docs/05-open-business-questions.md`, `docs/conventions.md`, `docs/mock-contract.md`.
- Tooling scripts: `scripts/check-version-drift.mjs`, `scripts/tool-versions.env`.
- Linter configurations: `cspell.json`, `.markdownlint-cli2.jsonc`.
- Execution commands:

```bash
node scripts/check-version-drift.mjs
npx markdownlint-cli2 "**/*.md"
npx cspell "**/*.md"
```
