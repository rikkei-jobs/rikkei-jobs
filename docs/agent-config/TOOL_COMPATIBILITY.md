<!-- cspell:ignore Tokotype Rahayu memport geminiignore claudeignore -->

# Dual-Agent Tool Compatibility & Parity Architecture (T022DB0)

This document establishes the empirical and architectural proof of cross-compatibility for the Rikkei Jobs agent configuration suite across **Claude Code** (Anthropic), **Gemini CLI** (Google), and **Google Antigravity**.

- **Task Reference**: T022DB0 (Round 2B Review Remediation — Item B6)
- **Audit Date**: 2026-11-12
- **Architecture**: Option A (Physical Byte-Identical Mirrors via Canonical Source `agent-config/`)
- **Zero Windows Symlinks**: 100% portable across Windows, Linux, and macOS without administrative privileges.

---

## 1. Architectural Philosophy: Option A Single Source of Truth

Operating across Windows developer workstations and Linux CI containers introduces severe filesystem constraints:

1. **The Fragility of Windows Symlinks**: On Windows NTFS, creating symbolic links requires Administrator privileges or Developer Mode. Git checkouts without `core.symlinks=true` degrade symlinks into plaintext stub files, breaking rule and skill discovery inside Linux CI containers.
2. **The Option A Solution**:
   - Canonical single source of truth maintained exclusively in `agent-config/` (`16` rules in `agent-config/rules/`, `28` skills + `23` `references/*` assets in `agent-config/skills/`, and entrypoint/settings templates in `agent-config/templates/`).
   - Zero-dependency Node synchronizer (`scripts/sync-agent-config.mjs`) generates `168` managed files: `67` byte-identical portable files in `.claude/`, `67` byte-identical portable files in `.gemini/`, `28` `.gemini/commands/*.toml` wrappers, `.claude/settings.json`, `.gemini/settings.json`, root `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, and root `.geminiignore`.
   - Enforces pure LF (`\n`), strips UTF-8 BOM, purges orphan files, and verifies SHA-256 parity via `node scripts/sync-agent-config.mjs --check` and `node scripts/validate-agent-config.mjs` (Quality Gate 25).

---

## 2. Official Documentation Citations, Verbatim Quotes & Verification Levels

Every format and discovery claim below is marked with one of three strict verification levels:

- `VERIFIED-BY-DOC`: Syntax, path discovery, and schema keys confirmed directly against official vendor documentation read in this session.
- `VERIFIED-AT-RUNTIME`: Behavior directly observed and executed in the active runtime environment during this session.
- `NOT VERIFIED AT RUNTIME`: Documented by the vendor, but the standalone CLI binary is not installed on the workstation (Rule R0 prohibits installing host software without explicit approval).

### 2.1. Google Gemini CLI (`GEMINI.md`, `@file.md` Imports, Skills, Commands, `.geminiignore`, `settings.json`)

- **Official Sources Read (2026-11-12)**:
  1. `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/gemini-md.md`
  2. `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/reference/memport.md`
  3. `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/skills.md`
  4. `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/custom-commands.md`
  5. `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/gemini-ignore.md`
  6. `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/settings.md`
  7. `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/tools/shell.md`
  8. `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/reference/policy-engine.md`
  9. `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/schemas/settings.schema.json`
- **Documentation Verification**: `VERIFIED-BY-DOC`.
- **CLI `/memory show` Runtime Check**: `NOT VERIFIED AT RUNTIME` (`gemini` CLI binary is not installed on this Windows host; per R0, no host installation was performed).
- **Exact Verbatim Quotes from Official Google Gemini CLI Documentation**:
  - **Workspace `GEMINI.md` & `/memory show` (`docs/cli/gemini-md.md`)**:
    > "The CLI searches for `GEMINI.md` files in your configured workspace directories and their parent directories."
    > "`/memory show`: Displays the full, concatenated content of the current hierarchical memory. This lets you inspect the exact instructional context being provided to the model."
    > "You can break down large `GEMINI.md` files into smaller, more manageable components by importing content from other files using the `@file.md` syntax. This feature supports both relative and absolute paths."
  - **Memory Import Processor (`docs/reference/memport.md`)**:
    > "The Memory Import Processor is a feature that lets you modularize your GEMINI.md files by importing content from other files using the `@file.md` syntax."
    > "`@./components/file.md` - Import from subdirectory"
  - **Workspace Skills Discovery (`docs/cli/skills.md`)**:
    > "**Discovery**: At the start of a session, Gemini CLI scans the discovery tiers and injects the name and description of all enabled skills into the system prompt."
    > "**Workspace skills**: Located in `.gemini/skills/` or the `.agents/skills/` alias. Workspace skills are shared with your team via version control."
  - **Custom Slash Commands (`docs/cli/custom-commands.md`)**:
    > "**Project commands (local):** Located in `<your-project-root>/.gemini/commands/`. These commands are specific to the current project and can be checked into version control to be shared with your team."
    > "Your command definition files must be written in the TOML format and use the `.toml` file extension. Required fields: `prompt` (String)... Optional fields: `description` (String)."
  - **Workspace File Exclusion via `.geminiignore` (`docs/cli/gemini-ignore.md`)**:
    > "When you add a path to your `.geminiignore` file, tools that respect this file will exclude matching files and directories from their operations. For example, when you use the `@` command to share files, any paths in your `.geminiignore` file will be automatically excluded."
  - **Shell Command Prefix Restrictions (`docs/tools/shell.md` & `schemas/settings.schema.json`)**:
    > "**Prefix matching**: The tool uses prefix matching. For example, if you allow `git`, you can run `git status` or `git log`."
    > "**Blocklist precedence**: The `tools.exclude` list is always checked first. If a command matches a blocked prefix, it will be denied, even if it also matches an allowed prefix in `tools.core`."
    > "`tools.confirmationRequired`: Tool names that always require user confirmation. Takes precedence over allowed tools and core tool allowlists."
  - **Workspace Policy Engine Limitation (`docs/reference/policy-engine.md`)**:
    > "The **Workspace** tier (project-level policies) is currently non-functional. Defining policies in a workspace's `.gemini/policies` directory will not have any effect. See issue #18186. Use User or Admin policies instead."

### 2.2. Anthropic Claude Code (`CLAUDE.md`, `.claude/rules/`, `.claude/skills/`, `.claude/settings.json`)

- **Official Sources Read (2026-11-12)**:
  1. `https://code.claude.com/docs/en/memory.md`
  2. `https://code.claude.com/docs/en/skills.md`
  3. `https://code.claude.com/docs/en/settings.md`
  4. `https://code.claude.com/docs/en/permissions.md`
  5. `https://code.claude.com/docs/en/settings-reference.md`
- **Documentation Verification**: `VERIFIED-BY-DOC`.
- **CLI Runtime Check**: `NOT VERIFIED AT RUNTIME` (`claude` CLI binary is not invoked on this host per R0).
- **Exact Verbatim Quotes from Official Anthropic Claude Code Documentation**:
  - **Project `CLAUDE.md` & `.claude/rules/` Discovery (`docs/en/memory.md`)**:
    > "A project CLAUDE.md can be stored in either `./CLAUDE.md` or `./.claude/CLAUDE.md`."
    > "Place markdown files in your project's `.claude/rules/` directory. Each file should cover one topic, with a descriptive filename like `testing.md` or `api-design.md`. All `.md` files are discovered recursively, so you can organize rules into subdirectories like `frontend/` or `backend/`."
    > "Rules without `paths` frontmatter are loaded at launch with the same priority as `.claude/CLAUDE.md`."
  - **Skills & Progressive Loading (`docs/en/skills.md`)**:
    > "Skills extend what Claude can do. Create a `SKILL.md` file with instructions, and Claude adds it to its toolkit. Claude uses skills when relevant, or you can invoke one directly with `/skill-name`."
    > "Unlike CLAUDE.md content, a skill's body loads only when it's used, so long reference material costs almost nothing until you need it."
  - **Shared Project Settings & Hard Permission Enforcement (`docs/en/settings.md`, `docs/en/permissions.md`, `docs/en/settings-reference.md`)**:
    > "Shared project | `.claude/settings.json` | Everyone working in the folder that contains it. In a git repository, commit it so teammates get it | Team permissions, hooks, plugins, and the environment variables the project needs"
    > "Rules are evaluated in order: **deny -> ask -> allow**. The first matching rule wins, so `deny` rules always take precedence."
    > "List the tool uses Claude Code blocks. Use it for files that hold API keys, secrets, or environment values: Claude Code excludes matching files from file discovery and search results, denies reads of them, and blocks the Edit and Write tools on the matching paths."
    > "A `*` at the end, with a space before it, also matches the bare command. `Bash(ls *)` matches `ls`, and `Bash(git log *)` matches `git log`."

### 2.3. Google Antigravity (`GEMINI.md`, `AGENTS.md`, `.agents/` Discovery & `.agents/teamwork/`)

- **Official Sources Read (2026-11-12)**:
  1. `https://antigravity.google/docs` and `https://antigravity.google/docs/rules` (`VERIFIED-BY-DOC`)
  2. `https://antigravity.google/docs/skills` (`VERIFIED-BY-DOC`)
  3. Antigravity Built-in Reference `agy-customizations` (`SKILL.md`, `docs/rules.md`, `docs/skills.md`) (`VERIFIED-BY-DOC` & `VERIFIED-AT-RUNTIME` in the active Antigravity session)
- **Exact Verbatim Quotes from Official Antigravity Documentation (`agy-customizations`)**:
  - **Workspace Customizations & Hierarchical Rules (`SKILL.md` & `docs/rules.md`)**:
    > "**Workspace Customizations** (Project-Specific): Path: `.agents/` (or `.agent/`, `_agents/`, `_agent/`) at the root of your project."
    > "**Directory & Project Rules** (Hierarchical): Paths: `GEMINI.md`, `AGENTS.md`, `.agents/rules/*.md`. As you open or edit files, the agent walks up from the file's directory to the repository root, loading all rules it finds."
    > "**Per-File Limit (`24 KB` / `24,000` bytes)**: Each rule file is capped at 24,000 bytes (after expanding `@[label](path)` includes) and truncated on line boundaries when over the cap."
    > "**Progressive Disclosure**: Keep the main `SKILL.md` concise. Use the `references/` subdirectory for bulky documentation and link to it from `SKILL.md`."
- **Architectural Decision on `.agents/` vs `.claude/` + `.gemini/` (B6 Requirement)**:
  - Antigravity documents `.agents/` (or `.agent/`) for workspace customizations alongside hierarchical `GEMINI.md` and `AGENTS.md`.
  - **Decision**: `scripts/sync-agent-config.mjs` intentionally does **NOT** generate a third physical mirror at `rikkei-jobs/.agents/`, for three documented reasons:
    1. **Binding Scope & Hard Rule**: The project's hard rule specifies `.claude/` and `.gemini/` as the two tracked mirrors inside `rikkei-jobs/`, while parent `D:\GitHub\Rikkei\.agents` is strictly READ-ONLY.
    2. **Precedence Collision Avoidance**: Official Gemini CLI documentation (`docs/cli/skills.md`) states: *"Within the same tier (user or workspace), the `.agents/skills/` alias takes precedence over the `.gemini/skills/` directory."* Generating `rikkei-jobs/.agents/` would duplicate `67` files (`90+` total) and shadow `.gemini/skills/`.
    3. **Full Antigravity Coverage Already Achieved**: Antigravity walks up and loads root `GEMINI.md` (`3,735` bytes, well under the `24,000`-byte cap) and `AGENTS.md`, while parent-workspace Teamwork harness state lives strictly in `D:\GitHub\Rikkei\.agents\teamwork/` (created by the Antigravity Teamwork harness for orchestration metadata only, zero product code).

---

## 3. Claude Code Discovery & Execution Flow

```text
[Claude Code Session Startup]
            │
            ▼
Reads root `CLAUDE.md` (<= 120 lines) ────► Establishes operational constraints & references
            │
            ▼
Discovers `.claude/rules/*.md` ───────────► Loads all 16 unconditional rules at launch
            │
            ▼
Indexes `.claude/skills/*/SKILL.md` ──────► Loads YAML frontmatter ("Use when ..."); body on demand
            │
            ▼
Enforces `.claude/settings.json` ─────────► Hard runtime `deny -> ask -> allow` tool filter
```

---

## 4. Gemini CLI Discovery & Execution Flow

```text
[Gemini CLI Session Startup]
            │
            ▼
Reads root `GEMINI.md` (61 lines) ────────► Processes 16 `@./.gemini/rules/01..16-*.md` imports
            │                                via Memory Import Processor (`memport.md`)
            ▼
Discovers `.gemini/skills/*/SKILL.md` ────► Injects name + description; activates via `activate_skill`
            │
            ▼ (Deterministic Slash Fallback)
Loads `.gemini/commands/*.toml` (28) ─────► Enables direct `/<skill-name>` slash invocation
            │
            ▼
Applies `.gemini/settings.json` + `.geminiignore` ──► Excludes `.env*`/`*.pem`/`*.key` & destructive git
```

### 4.1. Evidence-Based Decision to Keep Both `.claude/rules/` and `.gemini/rules/`

- **`.claude/rules/` (`VERIFIED-BY-DOC`)**: Claude Code natively recursively discovers `.claude/rules/*.md` and loads unconditional rules at session launch (`code.claude.com/docs/en/memory.md`).
- **`.gemini/rules/` (`VERIFIED-BY-DOC`)**: While Gemini CLI does NOT ambiently scan `.gemini/rules/` on its own, Section 4 of `GEMINI.md` contains `16` explicit `@./.gemini/rules/01-project-context.md` .. `@./.gemini/rules/16-backend-integrations.md` directives processed by Gemini CLI's Memory Import Processor (`docs/cli/gemini-md.md`, `docs/reference/memport.md`). Keeping `.gemini/rules/` as the physical target of those `@` imports preserves 100% byte-identical `.claude` <-> `.gemini` rule parity while making all 16 rules deterministically reachable in Gemini CLI.

---

## 5. Project-Level Security Settings Architecture (`settings.template.json`)

Both `.claude/settings.json` and `.gemini/settings.json` (plus `.geminiignore`) are generated from `agent-config/templates/settings.template.json` using **only options confirmed in official vendor schemas**:

| Security Dimension | Canonical Policy | Claude Code (`.claude/settings.json`) | Gemini CLI (`.gemini/settings.json` + `.geminiignore`) |
|---|---|---|---|
| **Secret File Exclusion** | Deny reading `.env*`, `*.pem`, `*.key` | `permissions.deny`: `Read(./.env)`, `Read(./.env.*)`, `Read(.env*)`, `Read(*.pem)`, `Read(*.key)`, `Read(**/.env*)`, `Read(**/*.pem)`, `Read(**/*.key)`, `Read(//**/.env)`, `Read(//**/*.pem)`, `Read(//**/*.key)` | `.geminiignore` (`.env*`, `!.env.example`, `*.pem`, `*.key`, `**/.env*`, `**/*.pem`, `**/*.key`) + `context.fileFiltering.respectGeminiIgnore: true` & `respectGitIgnore: true` |
| **Destructive & Git-Mutating Commands** | Block `commit`, `push`, `reset --hard`, `rebase`, `stash`, `clean -fd`, `rm -rf` | `permissions.deny`: `Bash(git commit *)`, `Bash(git push *)`, `Bash(git reset --hard *)`, `Bash(git rebase *)`, `Bash(git stash *)`, `Bash(git clean -fd *)`, `Bash(rm -rf *)` | `tools.exclude` (prefix match): `run_shell_command(git commit)`, `run_shell_command(git push)`, `run_shell_command(git reset --hard)`, `run_shell_command(git rebase)`, `run_shell_command(git stash)`, `run_shell_command(git clean -fd)`, `run_shell_command(rm -rf)` |
| **Interactive Confirmation (`ask`)** | Prompt before `checkout`, `restore`, `reset`, `clean` | `permissions.ask`: `Bash(git checkout *)`, `Bash(git restore *)`, `Bash(git reset *)`, `Bash(git clean *)` | `tools.confirmationRequired`: `run_shell_command(git checkout)`, `run_shell_command(git restore)`, `run_shell_command(git reset)`, `run_shell_command(git clean)` |
| **Read-Only Git Allowlist** | Allow `status`, `diff`, `log`, `show`, `ls-files`, `ls-tree`, `check-ignore`, `rev-parse` | `permissions.allow`: `Bash(git status *)`, `Bash(git diff *)`, ... | `tools.allowed`: `run_shell_command(git status)`, `run_shell_command(git diff)`, ... |
| **YOLO / Env Redaction** | Prevent unprompted bypass & redact secret env vars | Enforced via `permissions.deny` hard floor | `security.disableYoloMode: true`, `security.disableAlwaysAllow: true`, `security.environmentVariableRedaction: { enabled: true, blocked: [...] }` |

> **Why `.geminiignore` instead of `.gemini/policies/*.toml` or `security.fileAccess`?**
> Official `schemas/settings.schema.json` has **no** `security.fileAccess` property, and `docs/reference/policy-engine.md` documents that workspace-level `.gemini/policies/` is currently disabled upstream (`issue #18186`). Therefore, `.geminiignore` + `context.fileFiltering.respectGeminiIgnore: true` + `tools.exclude` is the exact, schema-valid workspace mechanism supported by Gemini CLI today.

---

## 6. Cross-Ecosystem Parity Matrix (`168` Synchronized Files)

| Component | Technical Specification | Claude Code | Gemini CLI / Antigravity | Parity / Validation |
|---|---|---|---|---|
| **Root Entrypoints** | `<= 120` lines, pure LF, 0 emoji | `CLAUDE.md` (52 lines) | `GEMINI.md` (61 lines), `AGENTS.md` (55 lines) | Check 2 (`validate-agent-config.mjs`) |
| **Enterprise Rules** | `16` files, `<= 150` lines, LF | `.claude/rules/*.md` | `.gemini/rules/*.md` (imported via `@` in `GEMINI.md`) | SHA-256 byte-identical (`16/16`, Check 5) |
| **Task Skills** | `28` `SKILL.md` files, `<= 500` body lines | `.claude/skills/<name>/SKILL.md` | `.gemini/skills/<name>/SKILL.md` | SHA-256 byte-identical (`28/28`, Check 1, 2, 5) |
| **Skill Assets** | `23` files under `references/*` + `.gitkeep` | `.claude/skills/<name>/references/**` | `.gemini/skills/<name>/references/**` | SHA-256 byte-identical (`23/23`, Check 7) |
| **Command Wrappers** | `28` TOML slash commands | Not needed (`.claude/skills/` creates `/skill`) | `.gemini/commands/*.toml` (`28` files) | Generated by `sync-agent-config.mjs` |
| **Security Settings** | Single template `settings.template.json` | `.claude/settings.json` | `.gemini/settings.json` + `.geminiignore` | Check 8 (`validate-agent-config.mjs`) |

---

## 7. Verification Commands

```bash
node scripts/sync-agent-config.mjs --check
node scripts/validate-agent-config.mjs
node scripts/check-gate-sync.mjs
```

---

## 8. Đánh Giá Khả Năng Tương Thích & Tính Đối Xứng Song Hành (Bản Tiếng Việt)

### 8.1. Cơ Chế Khám Phá Thực Tế Của Từng Công Cụ

- **Claude Code (`VERIFIED-BY-DOC`)**: Đọc `./CLAUDE.md`, quét đệ quy `.claude/rules/*.md` ngay khi khởi chạy phiên làm việc, nạp danh mục kỹ năng `.claude/skills/*/SKILL.md` theo cơ chế progressive disclosure, và áp đặt rào chắn cứng `deny -> ask -> allow` từ `.claude/settings.json`.
- **Gemini CLI (`VERIFIED-BY-DOC`, `/memory show` `NOT VERIFIED AT RUNTIME` do không cài CLI lên máy host theo R0)**: Đọc `GEMINI.md` (61 dòng) và nạp toàn bộ 16 quy tắc thông qua 16 chỉ thị `@./.gemini/rules/01-...md`..`16-...md` của Memory Import Processor (`memport.md`), tự động phát hiện `.gemini/skills/*/SKILL.md`, cung cấp 28 lệnh `/skill` dự phòng qua `.gemini/commands/*.toml`, và bảo vệ tệp nhạy cảm qua `.geminiignore` kết hợp `.gemini/settings.json` tuân thủ 100% `schemas/settings.schema.json`.
- **Google Antigravity (`VERIFIED-BY-DOC` & `VERIFIED-AT-RUNTIME`)**: Tự động nạp phân cấp `GEMINI.md` và `AGENTS.md` (giới hạn 24 KB/tệp, ngân sách 20.000 tokens). Dự án chủ đích không sinh bản sao thứ ba tại `rikkei-jobs/.agents/` để tuân thủ quy tắc cứng chỉ duy trì hai gương `.claude/` và `.gemini/`, đồng thời tránh xung đột độ ưu tiên của `.agents/skills/` đè lên `.gemini/skills/`. Thư mục `D:\GitHub\Rikkei\.agents\teamwork/` bên ngoài repo là thư mục trạng thái điều phối do chính Antigravity Teamwork harness tạo lập (không chứa mã nguồn hay tài sản sản phẩm).
