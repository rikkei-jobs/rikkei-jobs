# Rikkei Jobs — AI Coding Agent Configuration & Skills Framework (T022DB0)

Welcome to the enterprise AI coding agent configuration suite for **Rikkei Jobs**. This repository implements a standardized, mechanically verified rules and skills framework designed to govern all autonomous and interactive AI coding agents (**Claude Code**, **Gemini CLI**, and **Antigravity**) working within our modular monolith codebase.

- **Task Reference**: T022DB0 (Sprint 1 Milestone 5)
- **Monorepo Architecture**: Modular Monolith (Spring Boot 4.1.2 on Java 25 LTS, React 19.3.1, PostgreSQL 18.6)
- **Quality Gates**: 25 active runtime gates (28 unique gate definitions) synchronized across `check.sh`, `check.ps1`, and GitHub Actions CI.

---

## 1. Executive Summary

Modern software development with AI agents requires strict guardrails, unambiguous operational boundaries, and verifiable engineering practices. This framework guarantees:

1. **Non-Negotiable Git Read-Only Constraint**: AI agents operate in a strict read-only mode regarding Git history. Agents must never execute `git commit`, `git push`, `git checkout -b`, or `git stash`. All proposed changes remain uncommitted on disk for human review.
2. **Deterministic Parity (Option A)**: 100% cryptographic byte-identical parity across Claude Code (`.claude/`) and Gemini CLI (`.gemini/`) without relying on brittle Windows filesystem symbolic links.
3. **Comprehensive Enterprise Rules**: 16 single-topic rules governing architecture, security, performance, data access, and testing.
4. **Task-Triggered Skills**: 28 structured workflows loaded on-demand via trigger-only descriptions starting with `"Use when ..."`.
5. **Automated Mechanical Verification**: Quality Gate 25 executes an 8-tier automated validator covering YAML frontmatter schemas, line caps and LF encoding, extended-scope forbidden patterns (zero emojis, zero hardcoded secrets, zero git mutations, zero lingering TODOs), markdown relative links and anchors, 100% SHA-256 mirror parity, repository asset and command citations, skill supporting files (`references/*`) validity, and dual-agent `settings.json` security policy enforcement.

---

## 2. Architecture Overview: Option A Canonical Single Source of Truth

Operating an enterprise monorepo across mixed operating systems (Windows workstations and Linux CI runners) creates specific challenges:

```text
               ┌────────────────────────────────────────────────────────┐
               │           Canonical Source: agent-config/              │
               │   ├── rules/ (01 to 16)                                │
               │   ├── skills/ (28 task workflows)                      │
               │   └── templates/ (entrypoints & slash commands)        │
               └───────────────────────────┬────────────────────────────┘
                                           │
                         node scripts/sync-agent-config.mjs
                                           │
                 ┌─────────────────────────┴──────────────────────────┐
                 ▼                                                    ▼
   ┌───────────────────────────┐                        ┌───────────────────────────┐
   │       .claude/            │                        │       .gemini/            │
   │  ├── rules/ (SHA-256)     │                        │  ├── rules/ (SHA-256)     │
   │  ├── skills/ (SHA-256)    │                        │  ├── skills/ (SHA-256)    │
   │  └── settings.json        │                        │  ├── commands/ (28 TOML)  │
   │                           │                        │  └── settings.json        │
   └─────────────┬─────────────┘                        └─────────────┬─────────────┘
                 │                                                    │
                 └─────────────────────────┬──────────────────────────┘
                                           │
                        node scripts/validate-agent-config.mjs
                                           │
                                           ▼
                               [Quality Gate 25: PASS]
```

### Why Option A Beats Windows Symlinks

- **The Problem with Symlinks**: On Windows filesystems, creating symbolic links requires elevated administrative rights or active Developer Mode. When cloned into Docker containers or across developer machines, symlinks frequently degrade into plaintext pointer files, causing silent drift and build failures.
- **The Option A Architecture**:
  - `agent-config/` is the **sole canonical source of truth**.
  - `scripts/sync-agent-config.mjs` generates physical byte-identical copies in `.claude/` and `.gemini/`.
  - Normalizes line endings to pure LF (`\n`), strips UTF-8 BOM markers, and deletes orphan files.
  - Generates 28 fallback slash commands (`.gemini/commands/*.toml`) for Gemini CLI.
  - CI enforces `--check` mode to reject uncommitted drift.

---

## 3. Precedence Hierarchy & The 16 Enterprise Rules

When working on Rikkei Jobs, AI agents must resolve conflicting instructions using this non-negotiable hierarchy of precedence:

1. **Top Priority**: System Prompts & Orchestrator Dispatch Invariants (Task bounds, read-only limits).
2. **Level 2**: Operational Invariants R0/R1 (Git Read-Only, write restricted to `rikkei-jobs/`, no host installations, zero emojis).
3. **Level 3**: 16 Enterprise Rules (`agent-config/rules/` and mirrors).
4. **Level 4**: Task-Triggered Skills (`agent-config/skills/` and mirrors).

### Master Table of 16 Enterprise Rules

| Rule # | Rule File | Scope & Core Directives | Primary Verification Reference |
|---|---|---|---|
| 01 | `01-project-context.md` | Product domain (7 modules, 5 roles), monorepo layout, tech stack, task code `T022DB0`. | `docs/01-architecture-overview.md` |
| 02 | `02-git-and-delivery.md` | Branch model, Conventional Commits (`T022DB0:`), Agent Strict Read-Only Git Mandate with expanded read-only inspect whitelist (`git ls-files [-s]`, `git ls-tree`, `git check-ignore -v`, `git show HEAD:<path>`, `git rev-parse`, `git diff --stat`, `gh run list/view`). | `check.sh`, `check.ps1` |
| 03 | `03-safety-and-secrets.md` | Secret hygiene, write directory bounds (`rikkei-jobs/`), strict prohibition on agent writes to `.agents/teamwork/` (created solely by the Antigravity Teamwork harness), forbidden destructive commands. | `docs/04-security-secrets-policy.md` |
| 04 | `04-honest-verification.md` | Factual evidence before claims, zero fake PASS, mandatory command execution logs. | `scripts/check-gate-sync.mjs` |
| 05 | `05-backend-java.md` | Java 25 LTS, Spring Boot 4.1.2 modular monolith, DTO records, RFC 7807/9457 ProblemDetail. | `backend/pom.xml` |
| 06 | `06-database-flyway.md` | PostgreSQL 18.6, Flyway migration discipline (`V<N>__*.sql`), Testcontainers. | `backend/src/main/resources/db/` |
| 07 | `07-security-rbac.md` | Deny-by-default, 5 roles (CANDIDATE, HR, MENTOR, STAFF, ADMIN), 60s ticket expiration. EXISTS (verified in `application.yml`, `SecurityConfig.java`). TARGET: fine-grained endpoint method security. | `SecurityConfig.java` |
| 08 | `08-frontend-engineering.md` | React 19.3.1, TypeScript 6.0.3 strict, feature-slice layout, WCAG 2.2 AA accessibility. | `frontend/package.json` |
| 09 | `09-frontend-design-bar.md` | Anti-AI aesthetic bar: distinctive non-Tailwind palette, typography pairing (Plus Jakarta Sans, Be Vietnam Pro, JetBrains Mono, self-hosted, stacked diacritics verified), 24px icon system with uniform 2px stroke width, purpose-based motion budgets (150ms/200ms/300ms/400ms/600ms) with reduced-motion alternatives, 12-point Anti-AI rubric with Hard Veto. | `docs/design/DESIGN_SYSTEM.md` |
| 10 | `10-testing-strategy.md` | Test pyramid, TDD default (Red-Green-Refactor), hermetic offline testing, zero flakiness. | `backend/src/test/` |
| 11 | `11-docs-and-bilingual.md` | Bilingual standard (EN/VI), version drift checks, markdownlint and cspell compliance. | `scripts/check-version-drift.mjs` |
| 12 | `12-ci-and-quality-gates.md` | 6 CI jobs, 25 active quality gates, pinned container tooling, local gate reproduction. | `.github/workflows/ci.yml` |
| 13 | `13-backend-data-access-performance.md` | JPA/Hibernate N+1 query prevention, DTO projections, mandatory 1-based pagination, indexing. EXISTS: datasource-proxy in `backend/pom.xml`. TARGET: query optimizations in all repositories. | `backend/pom.xml` |
| 14 | `14-backend-module-boundaries.md` | Modular monolith isolation, cross-module calls via public APIs only. EXISTS: package layout in `docs/01-architecture-overview.md`, `package-info.java`. TARGET: automated ArchUnit test suite enforcement. | `docs/01-architecture-overview.md` |
| 15 | `15-backend-observability-ops.md` | Structured ECS JSON logging, correlation IDs, zero PII leaks, minimal actuator health. EXISTS: logging config in `application.yml`. TARGET: distributed tracing and Prometheus metrics. | `application.yml` |
| 16 | `16-backend-integrations.md` | Centralized external API client, Mailpit email testing, OpenAPI contracts, new package approval. EXISTS: `ExternalApiClient.java`, `docker-compose.yml`. TARGET: circuit-breaker resilience policy. | `docker-compose.yml` |

---

## 4. Task-Triggered Skills System

Skills provide modular, step-by-step procedures that are dynamically loaded only when relevant to the agent's task. Each skill adheres to the **trigger-only frontmatter convention**:

```yaml
---
name: backend-module-feature
description: "Use when implementing or modifying a backend feature within one of the 7 modular monolith domain modules."
---
```

### Complete Inventory of 28 Task Skills

1. **Process Skills (12 Workflows Adapted from Superpowers)**:
   - `using-rikkei-skills`: Master routing skill directing agents to applicable procedures.
   - `brainstorming-before-building`: Exploratory design and requirement clarification before code.
   - `writing-implementation-plans`: Decomposing complex requirements into atomic, verifiable steps.
   - `executing-plans`: Rigorous step-by-step execution with continuous status logging.
   - `test-driven-development`: Red-Green-Refactor discipline for all business logic.
   - `systematic-debugging`: 4-phase root cause analysis for bug reproduction and fixes.
   - `verification-before-completion`: Evidence-based signoff enforcing test execution prior to claims.
   - `requesting-code-review`: Preparing clean diffs and evidence dossiers for review.
   - `receiving-code-review`: Non-defensive, evidence-based responses to code review feedback.
   - `handoff-to-team-lead`: Replacing branch finalization with uncommitted handoff dossiers and commit proposals.
   - `dispatching-parallel-agents`: Multi-agent orchestration protocols and interface contracts.
   - `writing-skills`: Methodology for authoring, testing, and refining new skill definitions.

2. **Domain Skills (13 Shared, Frontend & Backend Workflows)**:
   - `frontend-visual-design`: Enforcing design tokens, typography, and anti-AI aesthetics with supporting resources: `references/token-tables.md`, `references/anti-ai-rubric.md` (12-point rubric and Hard Veto rule), and `references/screenshot-protocol.md` (4 viewports: 375/768/1024/1440).
   - `frontend-motion-design`: Physically grounded spring animations with reduced-motion support, supported by `references/motion-tokens.css`, `references/recipes.md` (12 animation recipes), and `references/spring-presets.md`.
   - `frontend-iconography`: Single curated 24px icon system with uniform 2px stroke width, supported by `references/icon-grid-template.svg`, `references/icon-checklist.md`, and starter set of 14 core SVG icons (`references/icons/*.svg`).
   - `frontend-accessibility-audit`: WCAG 2.2 AA mechanical contrast and keyboard checks, supported by `references/a11y-checklist.md`.
   - `frontend-feature-slice`: Structuring React 19 components, state, and API hooks.
   - `backend-module-feature`: Standard workflow for implementing Spring Boot domain features.
   - `spring-security-rbac-endpoint`: Method-level security and RFC 7807 error standardization.
   - `flyway-migration-authoring`: Authoring forward-only, idempotent PostgreSQL 18.6 migrations.
   - `api-contract-and-errors`: Designing OpenAPI 3.1 contracts and error structures.
   - `external-system-integration-and-mock`: Integrating third-party APIs via WireMock/MockWebServer.
   - `security-review-checklist`: Comprehensive pre-delivery security and ASVS audit.
   - `docs-bilingual-update`: Updating technical documentation across English and Vietnamese.
   - `ci-local-and-debug`: Reproducing and resolving CI gate failures locally.

3. **Added Backend Skills (3 Deep-Monolith Workflows)**:
   - `backend-persistence-performance`: N+1 query elimination, EXPLAIN query optimization, and DTO projection.
   - `backend-module-boundaries`: Preventing cross-module leaks and verifying modular boundaries.
   - `module-domain-knowledge`: Authoritative domain cheat-sheets for the 7 core business modules (identity, candidate, company/job, internship, assessment, learning, recruitment, plus stateless ai assistant) with open business questions from `docs/05-open-business-questions.md`.

---

## 5. Dual-Agent Compatibility & Discovery

The framework is fully operational across both Claude Code and Gemini CLI / Antigravity:

- **Claude Code**: Natively reads `CLAUDE.md`, discovers rules automatically from `.claude/rules/`, and parses frontmatter triggers in `.claude/skills/*/SKILL.md`.
- **Gemini CLI / Antigravity**: Reads `GEMINI.md` and `AGENTS.md`, imports the 16 rules via explicit `@./.gemini/rules/01-...md` directives inside `GEMINI.md` (keeping the root file concise under 120 lines while ensuring deterministic rule ingestion), and supports dual skill invocation (native task discovery in `.gemini/skills/*/SKILL.md` plus 28 generated fallback slash commands in `.gemini/commands/*.toml`). Antigravity manages coordination metadata inside `.agents/teamwork/` without polluting application source code.
- Detailed parity proofs, exact official documentation quotes, and mechanics are documented in [`docs/agent-config/TOOL_COMPATIBILITY.md`](TOOL_COMPATIBILITY.md).

---

## 6. Developer & Agent Operational Workflows

To maintain repository integrity, follow these operational workflows:

```bash
# 1. When modifying or authoring rules and skills:
# Edit ONLY inside agent-config/. NEVER edit .claude/ or .gemini/ directly!

# 2. Synchronize changes to mirrors:
node scripts/sync-agent-config.mjs

# 3. Verify synchronization and check for drift:
node scripts/sync-agent-config.mjs --check

# 4. Mechanically validate all rules, skills, and citations (Quality Gate 25):
node scripts/validate-agent-config.mjs --check

# 5. Run the full repository quality gate suite:
# On Windows PowerShell:
.\check.ps1
# On Linux / macOS:
./check.sh
```

---

## 7. Operational Invariants & Constraints

- **Git Read-Only Policy**: Non-negotiable. Only human team leads may commit changes.
- **Write Scope Bounds**: Write operations are restricted strictly to `rikkei-jobs/`. External directories are read-only.
- **No Host Installations**: No npm packages, binaries, or tools may be installed on the host machine without explicit approval.
- **Zero Emojis**: Prohibited across all code, documentation, rules, and configuration files.

---

## 8. Sổ Tay Vận Hành & Hướng Dẫn Kỹ Thuật (Bản Tiếng Việt)

Phần này cung cấp hướng dẫn đầy đủ, chi tiết bằng Tiếng Việt dành cho các kỹ sư và AI Coding Agent tham gia phát triển dự án Rikkei Jobs.

### 8.1. Triết Lý Thiết Kế & Kiến Trúc Option A

Hệ thống cấu hình AI Agent của Rikkei Jobs được xây dựng theo tiêu chuẩn kỹ thuật cấp doanh nghiệp:

- **Nguồn Sự Thật Duy Nhất (Single Source of Truth)**: Toàn bộ 16 quy tắc doanh nghiệp (Rules), 28 kỹ năng tác vụ (Skills), và các mẫu điểm vào (Templates) được lưu trữ tại `agent-config/`.
- **Cơ Chế Phản Chiếu Vật Lý Byte-Identical (Option A)**: Thay vì sử dụng symlinks (vốn rất dễ lỗi và mất tính di động trên Windows và container Linux), hệ thống sử dụng script `scripts/sync-agent-config.mjs` để sinh ra hai bản sao vật lý byte-identical tại `.claude/` và `.gemini/`. Cơ chế này tự động chuẩn hóa định dạng dòng xuống chuẩn LF (`\n`), loại bỏ ký tự BOM, và xóa sạch các file mồ côi (orphans).
- **Tính Tương Thích Song Hành**: Hỗ trợ đầy đủ cả Claude Code (Anthropic) và Gemini CLI / Antigravity (Google) với 28 tệp lệnh slash `.gemini/commands/*.toml` bổ trợ.

### 8.2. Quy Định Bắt Buộc: Git Strictly Read-Only

Đây là nguyên tắc vận hành có độ ưu tiên cao nhất dành cho toàn bộ các AI Agent:

1. **Tuyệt Đối Không Ghi Git**: Agent không bao giờ được tự ý thực thi các lệnh `git commit`, `git add`, `git push`, `git checkout -b`, `git reset`, `git restore`, hay `git stash`.
2. **Bảo Toàn Trạng Thái Đĩa**: Toàn bộ thay đổi mã nguồn phải được giữ nguyên vẹn ở trạng thái uncommitted trên nhánh làm việc hiện tại (`develop`).
3. **Lập Hồ Sơ Bàn Giao (Handoff Dossier)**: Khi hoàn thành công việc, Agent phải lập báo cáo bàn giao bằng Tiếng Việt kèm bằng chứng kiểm thử thực tế và đề xuất commit message chuẩn Conventional Commits bằng Tiếng Anh có tiền tố `T022DB0:`, ví dụ:

   ```text
   T022DB0: feat(candidate): add skill matching calculation service
   ```

4. **Quyền Commit Thuộc Về Con Người**: Chỉ có Human Team Lead mới có quyền xem xét, stage, và commit mã nguồn vào kho lưu trữ.

### 8.3. Hệ Thống 8 Tầng Kiểm Tra Toàn Vẹn (Validator Script)

Script kiểm tra `scripts/validate-agent-config.mjs` (Quality Gate 25) được tích hợp trực tiếp vào quy trình CI và các bộ script `check.ps1`, `check.sh`. Script thực thi 8 tầng kiểm tra tự động:

- **Tầng 1 (YAML Frontmatter)**: Đảm bảo toàn bộ 28 skills có YAML frontmatter chuẩn, tên kỹ năng trùng tên thư mục, mô tả bắt đầu bằng `"Use when ..."`, không chứa phần tóm tắt quy trình.
- **Tầng 2 (Line Limits & Encoding)**: Rules không vượt quá 150 dòng; Skills body không vượt quá 500 dòng; Root entrypoints không vượt quá 120 dòng; định dạng LF thuần túy, không có UTF-8 BOM.
- **Tầng 3 (Forbidden Patterns)**: Loại bỏ triệt để 100% emoji trên toàn bộ 172 tệp Markdown; ngăn chặn hardcoded secrets/tokens; ngăn chặn lệnh git mutation trái phép; không để sót `TODO`/`FIXME` chưa hoàn thiện.
- **Tầng 4 (Markdown Links & Anchors)**: Kiểm tra toàn bộ đường dẫn relative markdown và anchor `#heading` trong tài liệu đảm bảo tồn tại chính xác trên đĩa.
- **Tầng 5 (Cryptographic Mirror Parity)**: So sánh mã băm SHA-256 giữa canonical source và hai bản phản chiếu `.claude/` và `.gemini/`, bảo đảm đồng nhất 100% từng byte với 0 tệp mồ côi (zero orphans).
- **Tầng 6 (Repo Asset, Command & `[EXISTS]`/`[TARGET]` Verification)**: Kiểm tra toàn bộ các đường dẫn mã nguồn (`backend/`, `frontend/`, `docs/`, `scripts/`) và lệnh công cụ được dẫn chứng trong rules/skills đều tồn tại thật trong kho lưu trữ, đồng thời phân biệt và kiểm chứng cơ học `91` chỉ báo `[EXISTS]` so với `69` chỉ báo `[TARGET]` chưa triển khai.
- **Tầng 7 (Supporting Files references/*)**: Xác minh tính hợp lệ của toàn bộ liên kết tài nguyên bổ trợ trong `references/*` của các kỹ năng, bảo đảm đối xứng mật mã SHA-256 tuyệt đối 100% giữa canonical source và các bản mirror `.claude/`, `.gemini/`.
- **Tầng 8 (Settings.json & .geminiignore Mapping & Security Enforcement)**: Xác minh tính toàn vẹn của ánh xạ bảo mật giữa mẫu nguồn `settings.template.json` với cấu hình công cụ `.claude/settings.json`, `.gemini/settings.json` (tuân thủ lược đồ `settings.schema.json`) và `.geminiignore`, thực thi nghiêm ngặt lệnh cấm truy cập file nhạy cảm (`.env*`, `*.pem`, `*.key`) và ngăn chặn triệt để các hành vi đột biến Git phá hoại.

### 8.4. Các Tài Liệu Tham Chiếu & Phụ Lục Kỹ Thuật

- **Ghi Nhận Bản Quyền Nguồn Mở**: Xem [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) ghi nhận tác quyền MIT từ `obra/superpowers` và `nextlevelbuilder/ui-ux-pro-max-skill`, giấy phép SIL Open Font License 1.1 cho các bộ phông mã nguồn mở, và các chuẩn mở W3C.
- **Danh Mục Nguồn & Tiêu Chuẩn Uy Tín**: Xem [`SOURCES.md`](SOURCES.md) liệt kê đầy đủ các URLs tài liệu chính thức của Google Gemini CLI, Claude Code, Antigravity và các tiêu chuẩn kỹ thuật quốc tế.
- **Bằng Chứng Tương Thích Song Hành**: Xem [`TOOL_COMPATIBILITY.md`](TOOL_COMPATIBILITY.md) phân tích cơ chế khám phá công cụ trên Claude Code, Gemini CLI, Antigravity và giải trình thư mục điều phối `.agents/teamwork/`.
- **Báo Cáo Kiểm Thử Phá Vỡ Thực Nghiệm**: Xem [`BREAK_TESTS.md`](BREAK_TESTS.md) ghi lại bằng chứng thực tế của 22 bài break tests (`BT-01A` đến `BT-08B`) bao phủ toàn diện 8 tầng kiểm tra với tỷ lệ vượt qua và khôi phục nguyên trạng 100%.
- **Kiểm Toán Tệp Untracked & An Toàn Dữ Liệu**: Xem [`UNTRACKED_AUDIT.md`](UNTRACKED_AUDIT.md) giám định pháp y 9 tệp tin untracked từ các vòng trước, phân tích rủi ro nghiêm trọng của hàm `withBackup` và đề xuất phương án xử lý theo nguyên tắc B8.
- **Bộ Đặc Tả Kiểm Thử Hành Vi Thực Nghiệm Red/Green**: Xem thư mục [`tests/`](tests/) với 6 kịch bản kiểm thử hành vi thực tế chạy bằng 12 subagent cô lập trong `%TEMP%` (Backend N+1 & RBAC, Verification Before Completion, TDD, Git Read-Only Handoff, Frontend Anti-AI Design, External System Integration & Mock).
