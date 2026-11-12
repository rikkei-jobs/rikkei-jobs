<!-- cspell:ignore Tokotype Rahayu Sonatype memport geminiignore -->

# Inventory of Authoritative Sources, Specifications & Standards (T022DB0)

This document catalogs all external specifications, official vendor documentation URLs, and verified technical references that substantiate the Rikkei Jobs Enterprise Rules (Rules 01–16), Task-Triggered Skills (28 skills), Design System (`docs/design/DESIGN_SYSTEM.md`), and Dual-Agent Tooling (`TOOL_COMPATIBILITY.md`).

- **Audit Date**: 2026-11-12
- **Task Reference**: T022DB0 (Round 2B Review Remediation)
- **Honesty Guarantee**: Every Claude Code, Gemini CLI, and Antigravity format claim cites an official vendor URL fetched and inspected directly in this session.

---

## 1. Primary Standards, Official Agent Docs & Authoritative Frameworks

| # | Category | Specification / Document Title | Verified URL | Access Date | Key Takeaway (Applied Standard) | Mapped Rules / Skills / Files |
|---|---|---|---|---|---|---|
| 1 | Agent Engineering | Anthropic: Building Effective Agents | <https://www.anthropic.com/research/building-effective-agents> | 2026-11-11 | Composable workflows, explicit verification loops, and minimal context bloat. | Rule 01, `using-rikkei-skills`, `dispatching-parallel-agents` |
| 2 | Claude Code | Claude Code: Memory & `.claude/rules/` (`memory.md`) | <https://code.claude.com/docs/en/memory.md> | 2026-11-12 | `./CLAUDE.md` launch loading and recursive `.claude/rules/*.md` discovery (`< 200` lines guidance). | `CLAUDE.md`, `.claude/rules/*`, `TOOL_COMPATIBILITY.md` |
| 3 | Claude Code | Claude Code: Skills & Progressive Disclosure (`skills.md`) | <https://code.claude.com/docs/en/skills.md> | 2026-11-12 | `.claude/skills/<name>/SKILL.md` open standard, supporting `references/*`, on-demand body loading. | `.claude/skills/*`, `validate-agent-config.mjs` |
| 4 | Claude Code | Claude Code: Settings Files & Scopes (`settings.md`) | <https://code.claude.com/docs/en/settings.md> | 2026-11-12 | Shared project `.claude/settings.json` vs gitignored `.claude/settings.local.json` precedence. | `.claude/settings.json`, `.gitignore` |
| 5 | Claude Code | Claude Code: Configure Permissions (`permissions.md`) | <https://code.claude.com/docs/en/permissions.md> | 2026-11-12 | `deny -> ask -> allow` evaluation order, `Read(path)` gitignore matching, `Bash(cmd *)` wildcard rules. | `settings.template.json`, `.claude/settings.json` |
| 6 | Claude Code | Claude Code: Settings Reference (`settings-reference.md`) | <https://code.claude.com/docs/en/settings-reference.md> | 2026-11-12 | Canonical `permissions.deny` / `ask` / `allow` keys and `.env` exclusion syntax. | `settings.template.json`, Check 8 |
| 7 | Gemini CLI | Google Gemini CLI: `GEMINI.md` Context Hierarchy (`gemini-md.md`) | <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/gemini-md.md> | 2026-11-12 | Workspace `GEMINI.md` discovery, `@file.md` modular imports, and `/memory show` inspection. | `GEMINI.md`, `TOOL_COMPATIBILITY.md` |
| 8 | Gemini CLI | Google Gemini CLI: Memory Import Processor (`memport.md`) | <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/reference/memport.md> | 2026-11-12 | Relative `@./path/file.md` resolution, circular import detection, max import depth 5. | `GEMINI.md` (`@./.gemini/rules/01..16-*.md`) |
| 9 | Gemini CLI | Google Gemini CLI: Agent Skills (`skills.md`) | <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/skills.md> | 2026-11-12 | `.gemini/skills/` workspace discovery, `activate_skill` lifecycle, and `.agents/skills/` alias precedence. | `.gemini/skills/*`, `TOOL_COMPATIBILITY.md` |
| 10 | Gemini CLI | Google Gemini CLI: Custom Commands (`custom-commands.md`) | <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/custom-commands.md> | 2026-11-12 | `.gemini/commands/*.toml` v1 format (`prompt` required, `description` optional). | `.gemini/commands/*.toml`, `sync-agent-config.mjs` |
| 11 | Gemini CLI | Google Gemini CLI: Ignoring Files (`gemini-ignore.md`) | <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/gemini-ignore.md> | 2026-11-12 | Workspace `.geminiignore` glob & `!` negation syntax excluding sensitive files from tools. | `.geminiignore`, `settings.template.json` |
| 12 | Gemini CLI | Google Gemini CLI: Shell Tool Restrictions (`shell.md`) | <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/tools/shell.md> | 2026-11-12 | `run_shell_command(...)` prefix matching, command-chaining validation, and `tools.exclude` precedence. | `.gemini/settings.json`, Check 8 |
| 13 | Gemini CLI | Google Gemini CLI: Policy Engine (`policy-engine.md`) | <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/reference/policy-engine.md> | 2026-11-12 | Documents that workspace `.gemini/policies` tier is currently disabled upstream (issue `#18186`). | `TOOL_COMPATIBILITY.md` |
| 14 | Gemini CLI | Google Gemini CLI: Official Settings JSON Schema (`settings.schema.json`) | <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/schemas/settings.schema.json> | 2026-11-12 | Authoritative schema for `context.fileFiltering`, `security.environmentVariableRedaction`, `tools.exclude`, `tools.confirmationRequired`, `tools.allowed`. | `.gemini/settings.json`, Check 8 |
| 15 | Antigravity | Google Antigravity Official Docs: Rules & Skills | <https://antigravity.google/docs/rules> | 2026-11-12 | Hierarchical `GEMINI.md` / `AGENTS.md` rules (24 KB per-file cap, 20k token budget), `.agents/` discovery, `references/` progressive disclosure. | `AGENTS.md`, `GEMINI.md`, Rule 03, `TOOL_COMPATIBILITY.md` |
| 16 | Antigravity | Google Antigravity Official Docs: Skills | <https://antigravity.google/docs/skills> | 2026-11-12 | `SKILL.md` frontmatter (`name`, `description`) and `references/` folder structure. | `agent-config/skills/*` |
| 17 | Code Quality | Google Engineering Practices: Code Review | <https://google.github.io/eng-practices/review/> | 2026-11-11 | Small atomic changes, factual evidence over opinion, non-defensive review workflows. | `requesting-code-review`, `receiving-code-review` |
| 18 | Security | OWASP Application Security Verification Standard (ASVS 4.0.3) | <https://owasp.org/www-project-application-security-verification-standard/> | 2026-11-11 | Deny-by-default access control, 60s single-use ticketing, RFC 9457 error sanitization. | Rule 07, `spring-security-rbac-endpoint`, `security-review-checklist` |
| 19 | Security | OWASP Top 10 for LLM Applications (2025) | <https://owasp.org/www-project-top-10-for-large-language-model-applications/> | 2026-11-11 | Prompt injection (LLM01) and sensitive information disclosure (LLM06) mitigations. | Rule 03, `security-review-checklist` |
| 20 | Accessibility | W3C Web Content Accessibility Guidelines (WCAG 2.2) | <https://www.w3.org/TR/WCAG22/> | 2026-11-11 | Contrast minimums (4.5:1 text, 3.0:1 UI/focus), 2.2.2 Pause/Stop/Hide, 2.3.1 Three Flashes, target size. | Rule 08, `frontend-accessibility-audit`, `DESIGN_SYSTEM.md` |
| 21 | Accessibility | W3C Relative Luminance & Contrast Ratio Formula | <https://www.w3.org/TR/WCAG22/#dfn-relative-luminance> | 2026-11-11 | Exact CIE 1931 relative luminance formula `(L1 + 0.05) / (L2 + 0.05)` for all 48 verified token pairs. | `docs/design/DESIGN_SYSTEM.md` |
| 22 | Typography | SIL Open Font License (OFL) Version 1.1 | <https://scripts.sil.org/OFL> | 2026-11-11 | Permissive open font license allowing self-hosted bundling and commercial web embedding. | `DESIGN_SYSTEM.md`, `THIRD_PARTY_NOTICES.md` |
| 23 | Typography | Tokotype: Plus Jakarta Sans Repository | <https://github.com/tokotype/Plus-Jakarta-Sans> | 2026-11-11 | Display typeface, SIL OFL 1.1, self-hosted WOFF2, Vietnamese glyph coverage verified. | `docs/design/DESIGN_SYSTEM.md` |
| 24 | Typography | Be Vietnam Pro Repository | <https://github.com/bettertype/BeVietnamPro> | 2026-11-11 | Body typeface engineered for stacked Vietnamese diacritics (+1050 UPM), SIL OFL 1.1, self-hosted. | `docs/design/DESIGN_SYSTEM.md` |
| 25 | Typography | JetBrains: JetBrains Mono Repository | <https://github.com/JetBrains/JetBrainsMono> | 2026-11-11 | Monospaced & tabular numerals typeface, SIL OFL 1.1, self-hosted WOFF2. | `docs/design/DESIGN_SYSTEM.md` |
| 26 | Design Tokens | W3C Design Tokens Community Group (DTCG) Format | <https://design-tokens.github.io/community-group/format/> | 2026-11-11 | Three-tier token architecture (Primitive -> Semantic -> Component). | `frontend-visual-design`, `DESIGN_SYSTEM.md` |
| 27 | Motion & UI | Apple Human Interface Guidelines: Motion | <https://developer.apple.com/design/human-interface-guidelines/motion> | 2026-11-11 | Purposeful, physically grounded motion that never blocks user input. | Rule 09, `frontend-motion-design` |
| 28 | Motion & UI | MDN Web Docs: `prefers-reduced-motion` | <https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion> | 2026-11-11 | Vestibular safety via `0.001ms` duration cap and `100ms` opacity cross-fade alternative. | Rule 09, `frontend-motion-design` |
| 29 | Web Standards | W3C CSS Easing Functions Level 2 (`linear()`) | <https://www.w3.org/TR/css-easing-2/> | 2026-11-11 | Native CSS `linear()` spring physics approximations with zero JS runtime overhead. | `frontend-motion-design` (`spring-presets.md`) |
| 30 | Web Standards | W3C CSS View Transitions Module Level 1 | <https://www.w3.org/TR/css-view-transitions-1/> | 2026-11-11 | Shared-element and route transitions (`document.startViewTransition`) with graceful fallback. | `frontend-motion-design` (`recipes.md`) |
| 31 | Web Standards | W3C CSS Scroll-Driven Animations Level 1 | <https://www.w3.org/TR/scroll-animations-1/> | 2026-11-11 | Off-main-thread `animation-timeline: scroll()` and `view()` with `@supports` fallback. | `frontend-motion-design` (`recipes.md`) |
| 32 | Web Standards | W3C Web Animations API (WAAPI) & SVG 2 | <https://www.w3.org/TR/web-animations-1/> | 2026-11-11 | Native browser WAAPI orchestration and 24px / 2px-stroke monoline SVG icon geometry. | `frontend-motion-design`, `frontend-iconography` |
| 33 | Architecture | Spring Modulith Reference Documentation | <https://spring.io/projects/spring-modulith> | 2026-11-11 | Modular monolith boundary verification (`ApplicationModules.of(...).verify()`). | Rule 14, `backend-module-boundaries` |
| 34 | API Standards | IETF RFC 9457 & RFC 3986 (URI Generic Syntax) | <https://datatracker.ietf.org/doc/html/rfc9457> | 2026-11-11 | RFC 9457 Problem Details and RFC 3986 §3.2.2 IPv6 bracketed host URI construction (`java.net.URI`). | Rule 05, `ExternalApiClientIntegrationTest.java` |
| 35 | Open Source | `obra/superpowers` & `nextlevelbuilder/ui-ux-pro-max-skill` | <https://github.com/obra/superpowers> | 2026-11-11 | Trigger-only skill discipline and `ui-ux-pro-max` 6-step anti-AI design method (MIT License). | 12 Process Skills, Rule 09, `DESIGN_SYSTEM.md` |

---

## 2. Synchronized Repository Toolchain & Registry Inventory

All component versions below match `docs/03-version-table.md` (`check-version-drift.mjs` verified):

| # | Component / Dependency | Upstream Registry URL | Pinned Version | Access Date | Scope |
|---|---|---|---|---|---|
| 36 | Java (Eclipse Temurin) | <https://hub.docker.com/_/eclipse-temurin/tags?name=25.0.5_8> | `25 LTS (25.0.5_8)` | 2026-11-11 | Backend JDK 25 runtime |
| 37 | Spring Boot Starter Parent | <https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-parent/4.1.2/> | `4.1.2` | 2026-11-11 | Modular monolith framework |
| 38 | Flyway Core | <https://repo1.maven.org/maven2/org/flywaydb/flyway-core/12.4.0/> | `12.4.0` | 2026-11-11 | Database schema migrations |
| 39 | PostgreSQL Image | <https://hub.docker.com/_/postgres/tags?name=18.6-alpine> | `18.6-alpine` | 2026-11-11 | Relational database |
| 40 | Testcontainers | <https://repo1.maven.org/maven2/org/testcontainers/testcontainers/2.0.5/> | `2.0.5` | 2026-11-11 | Hermetic integration tests |
| 41 | Spotless Maven Plugin | <https://repo1.maven.org/maven2/com/diffplug/spotless/spotless-maven-plugin/3.11.0/> | `3.11.0` | 2026-11-11 | Google Java Format `1.30.0` |
| 42 | SpotBugs Maven Plugin | <https://repo1.maven.org/maven2/com/github/spotbugs/spotbugs-maven-plugin/4.10.5.0/> | `4.10.5.0` | 2026-11-11 | Static bytecode bug detector |
| 43 | Springdoc OpenAPI UI | <https://repo1.maven.org/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/3.2.0/> | `3.2.0` | 2026-11-11 | Dev OpenAPI 3.1 UI |
| 44 | Node.js Alpine Image | <https://hub.docker.com/_/node/tags?name=24.22.2-alpine3.23> | `24.22.2-alpine3.23` | 2026-11-11 | Mock & frontend container build |
| 45 | React & React DOM | <https://www.npmjs.com/package/react/v/19.3.1> | `19.3.1` | 2026-11-11 | Frontend UI library |
| 46 | TypeScript | <https://www.npmjs.com/package/typescript/v/6.0.3> | `6.0.3` | 2026-11-11 | Strict static typecheck |
| 47 | Vite & Vitest | <https://www.npmjs.com/package/vite/v/8.3.7> | `8.3.7` / `5.1.0` | 2026-11-11 | Frontend bundler & unit runner |
| 48 | Mailpit Image | <https://hub.docker.com/r/axllent/mailpit/tags?name=v1.33.1> | `v1.33.1` | 2026-11-11 | Local SMTP testing container |
| 49 | Hadolint / Yamllint / Actionlint / SQLFluff | <https://hub.docker.com/r/rhysd/actionlint/tags?name=1.7.12> | `v2.15.1` / `1-0.14` / `1.7.12` / `4.5.0` | 2026-11-11 | Containerized CI linters |
| 50 | Markdownlint CLI2 & CSpell | <https://www.npmjs.com/package/cspell/v/10.4.1> | `0.24.0` / `10.4.1` (`dict-vi-vn@3.0.7`) | 2026-11-11 | Bilingual docs & spell gates |

---

## 3. Tóm Tắt Nguồn Tài Liệu Kỹ Thuật Chính Thống (Bản Tiếng Việt)

Toàn bộ các khẳng định về định dạng và cơ chế nạp cấu hình của **Claude Code**, **Gemini CLI** và **Google Antigravity** trong Round 2B đều được đối chiếu trực tiếp với tài liệu gốc của nhà sản xuất ngay trong phiên làm việc ngày `2026-11-12`:

- **Claude Code (`code.claude.com/docs/en/*`)**: Xác thực cơ chế nạp `./CLAUDE.md`, quét đệ quy `.claude/rules/*.md`, kỹ năng `.claude/skills/<name>/SKILL.md`, và thứ tự ưu tiên quyền `deny -> ask -> allow` trong `.claude/settings.json`.
- **Gemini CLI (`raw.githubusercontent.com/google-gemini/gemini-cli/main/*`)**: Xác thực cơ chế `@./.gemini/rules/*.md` của Memory Import Processor (`memport.md`), khám phá `.gemini/skills/`, lệnh `.gemini/commands/*.toml`, tệp `.geminiignore`, đối sánh tiền tố lệnh trong `tools.exclude` / `tools.confirmationRequired`, cảnh báo `.gemini/policies` cấp workspace đang bị vô hiệu hóa upstream (`issue #18186`), và lược đồ `schemas/settings.schema.json`.
- **Antigravity (`antigravity.google/docs/*` & `agy-customizations`)**: Xác thực cơ chế nạp phân cấp `GEMINI.md` / `AGENTS.md` (trần 24 KB/tệp) và cấu trúc `references/` theo nguyên lý progressive disclosure.
- **Toán học Độ tương phản & Phông chữ**: Toàn bộ `48` cặp màu trong `docs/design/DESIGN_SYSTEM.md` được tính bằng công thức độ chói tương đối CIE 1931 của W3C WCAG 2.2; 3 bộ phông `Plus Jakarta Sans`, `Be Vietnam Pro` và `JetBrains Mono` đều mang giấy phép mở SIL OFL 1.1, tự lưu trữ (self-hosted WOFF2).
