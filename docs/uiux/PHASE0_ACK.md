# Phase 0 Acknowledgement — Round UIUX-polish

Document Path: `docs/uiux/PHASE0_ACK.md`
Task Code: None (Documented Exception: commit prefix `"UIUX: "`, PR title prefix `` `"[UIUX]"` ``)
Round: `UIUX-polish` — Icon-Only Sidebar Toggle, Switch-Style Theme Toggle, Research-Driven Motion and Visual Upgrade, Role-Centered Content Rewrite
Branch: `feature/uiux-motion-polish`
Base: `feature/T022BB1-phan-quyen-5-vai-tro @ 143fe53` (7 committed `NT-02` commits)
Working Directory: `D:\GitHub\Rikkei\rikkei-jobs`
Timestamp: `2026-11-19T16:28:00Z`
Status: Completed Prior to Any Code, Skill, Rule, `.gitignore`, Config, or Other Documentation Modification
Zero Emoji Compliance: Verified (0 emoji characters)

---

## Documented Task-Code Commit-Prefix Exception and Precedence

**Explicit Task-Code Commit-Prefix Exception**: This `UIUX-polish` round has **NO separate task code** (unlike `T022DB0:` in `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, and Rules `01`, `02`, `11`, or `T022BB1:` in Round `NT-02`). Pursuant to the explicit Team Lead brief (`D:\GitHub\Rikkei\.agents\PROMPT_UIUX_EN.txt` line 2) and `<teamwork-state>/ORIGINAL_REQUEST.md` line 3, the repository rule requiring a task-code prefix is satisfied by this documented exception:

- Every proposed commit message in the final handoff uses the English prefix `"UIUX: "`.
- The pull request title starts with `` `"[UIUX]"` ``.

**Binding Precedence Hierarchy**:
`D:\GitHub\Rikkei\.agents\PROMPT_UIUX_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` > Enterprise Rules (`01`–`16` in `.claude/rules/`) > Repository Skills (`28` in `agent-config/skills/`).

---

## 1. Inventory of Authoritative Files Read and Inspected

### 1.1 Prompts, Root Configurations, and Phase 0 Survey

1. **Task and Base Prompts**:
   - `<teamwork-state>/ORIGINAL_REQUEST.md` (lines 1–50)
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (lines 1–45)
   - `D:\GitHub\Rikkei\.agents\PROMPT_UIUX_EN.txt` (lines 1–49)
   - `<teamwork-state>/teamwork_explorer_survey_1/handoff.md` (lines 1–319)
2. **Root Agent Configurations**:
   - `CLAUDE.md` (lines 1–47)
   - `GEMINI.md` (lines 1–61)
   - `AGENTS.md` (lines 1–44)

### 1.2 All 16 Enterprise Rules (`.claude/rules/`)

1. `.claude/rules/01-project-context.md` (lines 1–94)
2. `.claude/rules/02-git-and-delivery.md` (lines 1–90)
3. `.claude/rules/03-safety-and-secrets.md` (lines 1–70)
4. `.claude/rules/04-honest-verification.md` (lines 1–59)
5. `.claude/rules/05-backend-java.md` (lines 1–83)
6. `.claude/rules/06-database-flyway.md` (lines 1–73)
7. `.claude/rules/07-security-rbac.md` (lines 1–78)
8. `.claude/rules/08-frontend-engineering.md` (lines 1–79)
9. `.claude/rules/09-frontend-design-bar.md` (lines 1–73)
10. `.claude/rules/10-testing-strategy.md` (lines 1–66)
11. `.claude/rules/11-docs-and-bilingual.md` (lines 1–53)
12. `.claude/rules/12-ci-and-quality-gates.md` (lines 1–85)
13. `.claude/rules/13-backend-data-access-performance.md` (lines 1–79)
14. `.claude/rules/14-backend-module-boundaries.md` (lines 1–66)
15. `.claude/rules/15-backend-observability-ops.md` (lines 1–80)
16. `.claude/rules/16-backend-integrations.md` (lines 1–93)

### 1.3 Applicable Repository Skills (`agent-config/skills/*/SKILL.md`)

Read in full directly from canonical `agent-config/skills/` (all 28 skill directories inventoried; 20 applicable/reference skills read in full):

1. `agent-config/skills/using-rikkei-skills/SKILL.md` (lines 1–86)
2. `agent-config/skills/frontend-visual-design/SKILL.md` (lines 1–145)
3. `agent-config/skills/frontend-motion-design/SKILL.md` (lines 1–234)
4. `agent-config/skills/frontend-iconography/SKILL.md` (lines 1–156)
5. `agent-config/skills/frontend-accessibility-audit/SKILL.md` (lines 1–134)
6. `agent-config/skills/frontend-feature-slice/SKILL.md` (lines 1–152)
7. `agent-config/skills/docs-bilingual-update/SKILL.md` (lines 1–137)
8. `agent-config/skills/writing-skills/SKILL.md` (lines 1–129)
9. `agent-config/skills/brainstorming-before-building/SKILL.md` (lines 1–89)
10. `agent-config/skills/writing-implementation-plans/SKILL.md` (lines 1–100)
11. `agent-config/skills/executing-plans/SKILL.md` (lines 1–95)
12. `agent-config/skills/dispatching-parallel-agents/SKILL.md` (lines 1–127)
13. `agent-config/skills/test-driven-development/SKILL.md` (lines 1–89)
14. `agent-config/skills/systematic-debugging/SKILL.md` (lines 1–90)
15. `agent-config/skills/ci-local-and-debug/SKILL.md` (lines 1–178)
16. `agent-config/skills/verification-before-completion/SKILL.md` (lines 1–125)
17. `agent-config/skills/requesting-code-review/SKILL.md` (lines 1–113)
18. `agent-config/skills/receiving-code-review/SKILL.md` (lines 1–129)
19. `agent-config/skills/handoff-to-team-lead/SKILL.md` (lines 1–121)
20. `agent-config/skills/module-domain-knowledge/SKILL.md` (lines 1–236)

Remaining 8 non-applicable skill directories verified present in `agent-config/skills/`: `api-contract-and-errors`, `backend-module-boundaries`, `backend-module-feature`, `backend-persistence-performance`, `external-system-integration-and-mock`, `flyway-migration-authoring`, `security-review-checklist`, `spring-security-rbac-endpoint`.

### 1.4 Project Reference Documents (`Tài liệu dự án` and `docs/`)

1. **Read-Only Project PDFs (`D:\GitHub\Rikkei\Tài liệu dự án\`)**:
   - `Rikkei Jobs — Rikkei Project.pdf` (7 pages: product overview, 7 modules, 5 roles, 3 core workflows, evidence sources, privacy, roadmap)
   - `Rikkei Jobs — Rikkei Project1.pdf` (3 pages: `1. Vai trò và quyền`)
   - `Rikkei Jobs — Rikkei Project2.pdf` (2 pages: `2. Luồng nghiệp vụ và trạng thái`)
   - `Rikkei Jobs — Rikkei Project3.pdf` (2 pages: `3. Bằng chứng, chỉ số và khoảng thiếu hụt`)
   - `Rikkei Jobs — Rikkei Project4.pdf` (2 pages: `4. Kiến trúc và tích hợp`)
   - `Rikkei Jobs — Rikkei Project5.pdf` (1 page: `5. Quyền riêng tư và an toàn dữ liệu`)
   - `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (16 pages: mock contract, shared seed profiles, 20 skill codes, 0–100 bands)
2. **Repository Documentation (`docs/`) and Tooling Configs**:
   - `docs/01-architecture-overview.md` (lines 1–111)
   - `docs/02-local-development-troubleshooting.md` (lines 1–247)
   - `docs/03-version-table.md` (lines 1–97)
   - `docs/04-security-secrets-policy.md` (lines 1–123)
   - `docs/05-open-business-questions.md` (lines 1–293)
   - `docs/conventions.md` (lines 1–338)
   - `docs/mock-contract.md` (lines 1–713)
   - `docs/design/DESIGN_SYSTEM.md` (lines 1–120 inspected)
   - `docs/nt01/PHASE0_ACK.md` (lines 1–120 inspected)
   - `docs/nt02/PHASE0_ACK.md` (lines 1–418) and `docs/nt02/README.md` (lines 1–178)
   - `.gitignore` (lines 1–122), `check.sh` (lines 1–60, 250–488), `.markdownlint-cli2.jsonc` (lines 1–11), `cspell.json` (lines 1–273), `scripts/validate-agent-config.mjs` (lines 250–450, 700–920)

---

## 2. Concrete Constraints and Proof Methods for All 16 Enterprise Rules

| Rule | Rule File | Concrete Actionable Constraint for Round `UIUX-polish` | Proof Method |
|---|---|---|---|
| Rule 01 | `01-project-context.md` | Keep all 9 domains, 5 canonical roles (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`), 20 standard skill codes, and pinned stack versions unchanged; apply documented `"UIUX: "` commit prefix exception instead of `T022DB0`. | `git diff` confirms zero stack/role/module drift; `node scripts/check-version-drift.mjs` exits `0`. |
| Rule 02 | `02-git-and-delivery.md` | Keep Git strictly READ-ONLY on branch `feature/uiux-motion-polish` (never run `commit`, `push`, `add`, `stage`, `amend`, `rebase`, `reset`, `stash`, `tag`, `switch`, `restore`); leave all edits uncommitted and unstaged; use OS temp + SHA-256 backups if needed; propose `"UIUX: "` English commits. | `git branch --show-current` shows `feature/uiux-motion-polish`, `git diff --cached --name-only` is empty, and `git status` lists uncommitted working-tree changes only. |
| Rule 03 | `03-safety-and-secrets.md` | Write only inside `D:\GitHub\Rikkei\rikkei-jobs` (and external Teamwork scratch state); keep `Tài liệu dự án`, `.agents`, and `.vscode` strictly read-only; never open/read/print `.env`, `*.pem`, `*.key`, or `first-key.pem`; never add `.agents/teamwork/` inside the repo; keep `X-Service-Key` out of `VITE_*`; tear down Docker and delete temp files. | `check.sh` / `check.ps1` secret scan and path scan pass; `git status` shows no `.env`, `*.pem`, or `.agents/` inside repo; `docker ps -a` / `docker volume ls` show `0` `rikkei` leftovers after teardown. |
| Rule 04 | `04-honest-verification.md` | Report `PASS` only for commands actually executed against the final workspace state with raw stdout/stderr and exit code `0`; zero `console.log`/`System.out.println`, zero `TODO`/`FIXME`, zero personal machine paths; report `/browser` sandbox limitations honestly without guessing. | Raw command outputs in `docs/uiux/BROWSER_OBSERVATIONS.md` and handoff; `check.sh` / `check.ps1` Gates 8.1, 8.2, 8.3 pass with exit code `0`. |
| Rule 05 | `05-backend-java.md` | Keep backend Java code untouched unless an unavoidable UI/content defect requires it (no `backend/pom.xml` edits). If any backend file changes, preserve Java 25 immutable records, `ErrorResponse`, `-Xlint:all -Werror`, Spotless AOSP, SpotBugs, and `641` tests / `59` classes. | `git diff --name-only backend/` empty (or full `./mvnw clean test spotless:check spotbugs:check` under JDK 25 if touched). |
| Rule 06 | `06-database-flyway.md` | Keep Flyway migrations `V1..V14` immutable and add zero new migrations (`V15`/`V16`). | `git diff --name-only backend/src/main/resources/db/` is empty and SQLFluff gate in `check.sh` passes. |
| Rule 07 | `07-security-rbac.md` | Preserve all verified `NT-02` security and RBAC behaviors intact: `RoutePolicyRegistry`, `OwnershipGuard`, 5-role menu isolation, 403 inside `SharedAppLayout`, post-logout redirect fix, `MustChangePasswordFilter`, `/api/docs` dev-only, and `GET /companies/{id}`. Do not turn `TARGET` rules into `EXISTS`. | Existing `guards.test.tsx`, `adversarial_security.test.tsx`, `postLoginRedirect.test.tsx`, `e2e/run-all.mjs` (26 suites), and `validate-agent-config.mjs` Check 6 pass. |
| Rule 08 | `08-frontend-engineering.md` | Enforce React 19.3.1 + TypeScript 6.0.3 strict mode (`0` `any`, `0` `@ts-ignore`, `noUnusedLocals`/`Parameters`), 100% HTTP via `httpClient.ts`, JWT strictly in memory (`AuthContext`), `localStorage` restricted to `rj_sidebar_collapsed` + theme preference, feature barrel `index.ts` exports, and WCAG 2.2 AA (`role="switch"`, `aria-expanded`, `aria-controls`, `aria-label`, `Escape`, Space/Enter, `:focus-visible`). | `npm run lint --prefix frontend`, `npm run typecheck --prefix frontend`, `npm test --prefix frontend -- --run`, and live `/browser` keyboard/screen-reader audit pass. |
| Rule 09 | `09-frontend-design-bar.md` | Enforce zero emoji, zero external stock icon packs, 100% CSS custom properties via `design-tokens.css` (Check 9), `<Icon name=... />` (24px, 2px stroke, `currentColor`), `<BrandMark />` exclusive for `#C8161D`, self-hosted fonts (`Plus Jakarta Sans`, `Be Vietnam Pro`, `JetBrains Mono`, `line-height >= 1.5`, `tabular-nums`), Airy vs Dense role density, exact motion budgets (`<= 150ms` micro/admin, `<= 200ms` tooltip, `<= 300ms` drawer/dialog, `<= 400ms` route/stagger, `<= 600ms` SVG/data-viz, `prefers-reduced-motion` `0.001ms`/`100ms` cross-fade), and evidence-based Anti-AI rubric `>= 11/12` with zero `0` scores. Never alter Rule 09 budgets without stopping to ask Team Lead with evidence. | `node scripts/validate-agent-config.mjs` (Check 9), `node scripts/compute-contrast.mjs`, bundle growth check (`CSS gzip <= +20%`, `JS gzip <= +8 kB`), and `/browser` measurements (`CLS = 0`, `scrollWidth <= requestedWidth`, computed durations/easings). |
| Rule 10 | `10-testing-strategy.md` | Follow Red-Green-Refactor TDD for M1 controls, motion utilities, and M5a copy updates; use `waitFor` (zero arbitrary `setTimeout`); update affected Vitest and E2E assertions cleanly when copy changes and list every changed test assertion in `PR_DESCRIPTION.md`; re-measure and update test counts in `agent-config/rules/10-testing-strategy.md` and `README.md` at M8 if counts change. | `npm test --prefix frontend -- --run`, `node mock/test-runner.js`, and fresh Docker Compose `node e2e/run-all.mjs` exit `0`; updated counts match raw test output. |
| Rule 11 | `11-docs-and-bilingual.md` | Keep `docs/` primary English and author symmetrical EN + VI sections (with full Vietnamese diacritics) for `RESEARCH.md`, `CONTENT.md`, `README.md`, `PR_DESCRIPTION.md`, and `DESIGN_SYSTEM.md` additions; keep `agent-config/` in English and reports/handoffs in Vietnamese; zero `markdownlint-cli2` issues, zero `cspell` (`en,vi`) issues with zero inline directives; pass `check-version-drift.mjs`. | `npx --yes markdownlint-cli2@0.24.0 ...`, `npx --yes --package cspell@10.4.1 --package @cspell/dict-vi-vn@3.0.7 cspell ...`, and `node scripts/check-version-drift.mjs` all exit `0`. |
| Rule 12 | `12-ci-and-quality-gates.md` | Add zero new quality gates; preserve exact parity of `29` gate definitions (`26` active runtime gates + `3` fallbacks) in `check.sh` and `check.ps1`, `23` CI checks in `ci.yml`, and `25` Docker harness gates in `run-ci-in-docker.sh`. Never execute `scripts/run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs`, `./check.sh`, and `.\check.ps1` all pass (`26/26` active gates, exit code `0`). |
| Rule 13 | `13-backend-data-access-performance.md` | No backend persistence changes planned; keep `open-in-view: false`, `ddl-auto: none`, Hikari settings, indexes, pagination, and `@Transactional` boundaries untouched. | `git diff --name-only backend/` empty on persistence/config paths. |
| Rule 14 | `14-backend-module-boundaries.md` | Keep all 9 backend module packages, `package-info.java`, `OwnershipGuard`, and DAG boundaries untouched. | `git diff --name-only backend/src/main/java/` empty (or verified unchanged). |
| Rule 15 | `15-backend-observability-ops.md` | Never expose secrets, tokens, passwords, or PII in UI copy, tests, or `docs/uiux/pr-screenshots/`; visually separate/collapse any dev health or dev-ticket UI helper so primary UX does not expose internal status while keeping `/actuator/health` and `/api/v1/health` intact. | Visual + DOM inspection of `docs/uiux/pr-screenshots/` and `git diff` confirms zero secret/PII leakage and untouched backend health endpoints. |
| Rule 16 | `16-backend-integrations.md` | Add **zero new dependencies** to `backend/pom.xml`, `frontend/package.json`, or `mock/package.json`; build all motion solely with CSS, WAAPI, View Transitions API, and helpers in `frontend/src/shared/utils/motion.ts`; preserve mock port `9000` and `/api/docs` dev-only behavior. | `git diff --name-only backend/pom.xml frontend/package.json mock/package.json` empty; `node mock/test-runner.js` passes `8/8`. |

---

## 3. Applicable Skills, Non-Applicable Skills, and Proof Methods

### 3.1 Directly Applicable Skills (19 Active + 1 Conditional/Reference = 20 Skills)

| # | Skill Name | Why It Applies to Round `UIUX-polish` | Concrete Constraint & Proof Method |
|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory governance entrypoint for every round and milestone transition. | Enforce precedence (`PROMPT_UIUX_EN.txt` > `PROMPT_BASE_RULES_EN.txt` > Rules `01`–`16` > Skills) and progressive loading across `M0`–`M8`. *Proof*: `PHASE0_ACK.md` created prior to any edit and milestone gates checked in sequence. |
| 2 | `frontend-visual-design` | Governs the visual upgrade (elevation/shadow scale, radii/spacing rhythm, typography hierarchy, Light/Dark polish, Anti-AI compliance) and M8 skill/doc upgrade. | Preserve Royal Cobalt & Iron Obsidian palette, Airy vs Dense density, 0 emoji, Check 9 tokens, and score Anti-AI rubric (`>= 11/12`, no `0`) strictly from `/browser` evidence; upgrade `agent-config/skills/frontend-visual-design` at M8 without adding new skills. *Proof*: `compute-contrast.mjs`, `validate-agent-config.mjs` Check 9, `/browser` measurements. |
| 3 | `frontend-motion-design` | Core skill for M1 animated controls, M2 research-driven motion language (`linear()` spring curves + `cubic-bezier` fallbacks, View Transitions, `@starting-style`, WAAPI, `motion.ts`), M6 performance, and M8 upgrade. | 0 KB external animation libraries; compositor-only (`transform`, `opacity`), `CLS = 0`, `will-change` only on active hover/focus, Rule 09 budgets respected, `prefers-reduced-motion` (`0.001ms` + `100ms` cross-fade); upgrade `agent-config/skills/frontend-motion-design` at M8. *Proof*: `frontend/package.json` unchanged, CSS/JS gzip bundle measurement, `/browser` computed durations/easings/`getAnimations()`. |
| 4 | `frontend-iconography` | M1 requires icon-only sidebar toggle and icon-based sun/moon theme switch using `<Icon name=... />`; M8 allows updating this skill only if research truly requires it. | Render 100% icons via `<Icon name=... />` on `24x24` grid with `stroke-width="2"` and `currentColor`; `aria-hidden="true"` on decorative icons and dynamic Vietnamese `aria-label` on icon-only controls. *Proof*: `Icon.test.tsx`, `grep` confirming zero raw stock SVG packs or emojis. |
| 5 | `frontend-accessibility-audit` | M1 controls (`<button type="button">`, `aria-expanded`, `aria-controls`, `role="switch"`, `aria-checked`, Space/Enter, Escape-dismissible tooltip `<= 200ms`, `>= 44px` hit target, `>= 3:1` switch contrast), M3 audit, M6/M7 verification, and M8 conditional upgrade. | Full keyboard walkthrough (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`), visible `:focus-visible`, `>= 44x44px` hit targets, `>= 4.5:1` text / `>= 3.0:1` UI contrast in Light and Dark. *Proof*: Vitest a11y/interaction tests, `compute-contrast.mjs`, `/browser` R2 keyboard & contrast inspection. |
| 6 | `frontend-feature-slice` | M5a/M5 apply token, shared component, and role-centered copy updates across slices while preserving `NT-02` behavior and 4 async states. | Upgrade primarily via `design-tokens.css` and `shared/components/`; keep `index.ts` barrels intact, 0 `any`, and minimal diff on teammates' feature files (listed in `PR_DESCRIPTION.md`). *Proof*: `npm run typecheck --prefix frontend`, `npm run lint --prefix frontend`, `git diff --stat`. |
| 7 | `docs-bilingual-update` | M2 (`RESEARCH.md`), M3b (`CONTENT.md`), and M8 (`README.md`, `PR_DESCRIPTION.md`, `DESIGN_SYSTEM.md`, `AUDIT.md`, `BROWSER_OBSERVATIONS.md`) require bilingual EN + VI standards, UTF-8 no BOM, LF, and clean linters. | Maintain full Vietnamese diacritics, zero inline `cspell:` disables, zero version drift, UTF-8 without BOM, LF. *Proof*: `markdownlint-cli2`, `cspell`, `check-version-drift.mjs` exit `0`. |
| 8 | `writing-skills` | M8 upgrades `agent-config/skills/frontend-motion-design`, `frontend-visual-design` (and `frontend-iconography` or `frontend-accessibility-audit` only if research requires it) without adding new skills. | Keep `"Use when ..."` trigger-only frontmatter, 8-section structure, `<= 500` lines per `SKILL.md`, 0 emoji, verified repo paths only, and preserve **28 skills / 168 mirror files**. *Proof*: `node scripts/sync-agent-config.mjs` + `node scripts/validate-agent-config.mjs` pass. |
| 9 | `brainstorming-before-building` | M2 deep parallel research (`RESEARCH.md`) and M4 mandatory Team Lead pilot checkpoint before full roll-out. | Evaluate motion/elevation/copy options from credible sources (`RESEARCH.md`), avoid guessing owner aesthetic calls (e.g., Skill Radar and visual tone), and stop at M4 for approval. *Proof*: `docs/uiux/RESEARCH.md`, M4 review package sent to Parent, explicit Team Lead approval recorded before M5a/M5. |
| 10 | `writing-implementation-plans` | Structures `M1` -> `M2` -> `M3` -> `M3b` -> `M4 (STOP)` -> `M5a` -> `M5` -> `M6` -> `M7` -> `M8` into small, verifiable steps. | Define exact target files, verification commands per step, and OS temp + SHA-256 backup strategy (no `git` rollback). *Proof*: Orchestrator/worker plans and step verification logs. |
| 11 | `executing-plans` | Governs sequential milestone execution with liveness heartbeats and drift/gate halts. | Update `progress.md` after each step, halt immediately on any failing gate or unexpected overflow/threshold breach, and respect the M4 stop gate. *Proof*: `progress.md` timestamps and sequential milestone completion logs. |
| 12 | `dispatching-parallel-agents` | Governs multi-agent orchestration (disjoint write boundaries, external Teamwork state folder, independent verification). | Zero overlapping file writes across parallel workers; zero `.agents/teamwork/` inside `rikkei-jobs`; verify all subagent outputs directly. *Proof*: Disjoint file manifest and independent verification commands in handoffs. |
| 13 | `test-driven-development` | M1 controls, `motion.ts` helpers, and M5a copy-affected tests require Red-Green-Refactor Vitest coverage. | Write/update failing Vitest specs for sidebar toggle (`aria-expanded`, tooltip `<= 200ms`, Escape), theme switch (`role="switch"`, Space/Enter, OS fallback), and copy changes; use `waitFor` (zero `setTimeout`). *Proof*: `npm test --prefix frontend -- --run` passes with new/updated test cases documented. |
| 14 | `systematic-debugging` | Triggered whenever a Vitest suite, E2E selector, `cspell`/`markdownlint`, or `375px` layout overflows or fails. | Reproduce deterministically -> localize -> isolate hypothesis -> fix root cause cleanly (no band-aids). *Proof*: Documented root cause and green re-run in `BROWSER_OBSERVATIONS.md` / handoffs. |
| 15 | `ci-local-and-debug` | Governs M7/M8 local CI reproduction (`./check.sh`, `.\check.ps1`, Docker Compose E2E, clean teardown). | Run `node mock/test-runner.js`, fresh `docker compose up -d --build --wait` -> `node e2e/run-all.mjs` -> `docker compose down -v`, and both `./check.sh` and `.\check.ps1` (`26/26`); never run `scripts/run-ci-in-docker.*`. *Proof*: Raw gate logs and `0` leftover Docker containers/volumes/networks. |
| 16 | `verification-before-completion` | Mandatory before declaring M4 pilot or final M8 completion. | Measure raw CSS/JS gzip bundle sizes before/after, verify `scrollWidth <= requestedWidth` at `375/768/1024/1440px` via `/browser`, run all 26 gates, and report any sandbox limits honestly. *Proof*: Raw terminal outputs and `/browser` evidence in `docs/uiux/BROWSER_OBSERVATIONS.md`. |
| 17 | `requesting-code-review` | Governs M4 review package and M8 `docs/uiux/PR_DESCRIPTION.md`. | Inspect full `git diff`, list every teammate file touched and every updated test assertion, and score the Anti-AI rubric strictly from measured evidence. *Proof*: `docs/uiux/PR_DESCRIPTION.md` (EN + VI) and M4 review dossier. |
| 18 | `handoff-to-team-lead` | Governs final uncommitted delivery, directory-verified file paths, and `"UIUX: "` commit proposals. | Verify every cited repo path exists on disk, ensure `git diff --cached --name-only` is empty, confirm `0` Docker/temp leftovers, and propose ordered English `"UIUX: "` commits. *Proof*: `git status`, `git diff --cached --name-only`, and directory listing check. |
| 19 | `receiving-code-review` | Activated when Team Lead returns feedback at the **M4 checkpoint** or during final PR review. | Triage feedback by Tier 1–4, reproduce/verify before changing code, and re-run affected gates after fixes. *Proof*: Recorded M4/post-review response and re-verification output. |
| 20 | `module-domain-knowledge` | Read-only reference during M3b (`CONTENT.md`) and M5a copy rewrite so all 5-role narratives and domain claims match verified specs. | Ground every copy claim in project PDFs, `docs/`, or real logged-in user data; never invent metrics, testimonials, or unimplemented features (`"Sắp ra mắt"`). *Proof*: Traceability matrix in `docs/uiux/CONTENT.md`. |

### 3.2 Non-Applicable Skills (Omitted Unless Triggered — 8 Skills)

| # | Skill Name | Rationale for Omission in Round `UIUX-polish` |
|---|---|---|
| 21 | `backend-module-feature` | No new Java backend business features, controllers, services, or DTOs are added (`PROMPT_UIUX_EN.txt:5` focuses on frontend CSS/WAAPI/View Transitions, copy, skills, and docs). |
| 22 | `backend-module-boundaries` | No backend Java packages, module interfaces, or table ownership boundaries are modified. |
| 23 | `backend-persistence-performance` | No JPA queries, entities, Hikari settings, or repository methods are added or altered. |
| 24 | `flyway-migration-authoring` | Flyway migrations `V1..V14` are immutable and no schema/seed changes (`V15`/`V16`) are needed. |
| 25 | `spring-security-rbac-endpoint` | Backend RBAC policies (`RoutePolicyRegistry`, `OwnershipGuard`) were completed and verified in `NT-02` and must remain untouched. |
| 26 | `api-contract-and-errors` | No REST endpoints, OpenAPI paths, or backend `ErrorResponse` payloads are modified in this UIUX round. |
| 27 | `external-system-integration-and-mock` | No changes to `ExternalApiClient` or `mock/server.js`; existing LMS SSO mock (`http://127.0.0.1:9000/lms/sso/tickets`) is used read-only for E2E and `/browser` verification. |
| 28 | `security-review-checklist` | No backend auth/IDOR code changes; frontend token-in-memory, non-auth `localStorage`, and secret-free screenshot rules are covered via Rules `03`, `07`, `08`, and `check.sh` secret scan (re-activated immediately if any auth/redirect code is touched). |

---

## 4. Start-of-Round Baseline Measurements and Thresholds

All start-of-round baseline measurements were verified on `feature/uiux-motion-polish` (`143fe53`) prior to any edit:

| Metric / Gate | Verified Start-of-Round Baseline | Round `UIUX-polish` Threshold / Cap |
|---|---|---|
| **Frontend CSS Bundle** (`npm run build --prefix frontend`) | `dist/assets/index-7APS4y1C.css`: **`116.17 kB`** / gzip: **`17.28 kB`** | Max `+20%` CSS gzip growth (`<= +3.456 kB`, ceiling **`<= 20.736 kB`**); stop & ask Team Lead with raw numbers if exceeded. |
| **Frontend JS Bundle** (`npm run build --prefix frontend`) | `dist/assets/index-bvlZtaHC.js`: **`415.90 kB`** / gzip: **`120.81 kB`** | Max `+8.00 kB` JS gzip growth (ceiling **`<= 128.81 kB`**); stop & ask Team Lead with raw numbers if exceeded. |
| **Frontend HTML Entry** (`npm run build --prefix frontend`) | `dist/index.html`: `1.24 kB` / gzip: `0.57 kB` (`113` modules transformed) | Zero build errors (`tsc -b && vite build`). |
| **Frontend Lint & Typecheck** | `0` errors, `0` warnings (`eslint` & `tsc --noEmit`) | Must stay `0` errors / `0` warnings. |
| **Frontend Vitest Suite** (`npm test --prefix frontend -- --run`) | **`32` Vitest files / `342` tests PASS** | All tests green; add/update behavioral tests for M1, motion, and M5a copy updates. |
| **Mock Server Tests** (`node mock/test-runner.js`) | **`8/8`** criteria + Cloudinary mock PASS | Must remain `8/8` PASS. |
| **Contrast Audit** (`node scripts/compute-contrast.mjs`) | **`120/120` contrast pairs PASS** (`9` CIELAB surface + `10` UI boundary border invariants, `0` violations) | `0` violations; register any new Light/Dark tokens (e.g., switch track/thumb) in `DESIGN_SYSTEM.md`. |
| **Agent Config Parity** (`sync-agent-config --check` & `validate-agent-config`) | **`28` skills / `168` mirror artifacts** (`47` canonical + `168` mirror = `215` artifacts; Checks `1`–`10` ALL GREEN) | Preserve `28` skills / `168` mirrors (no new skills added); Checks `1`–`10` ALL GREEN. |
| **Quality Gate Sync** (`node scripts/check-gate-sync.mjs`) | **`29` gate definitions = `26` active runtime gates + `3` missing-file fallbacks** (`23` CI checks, `25` Docker harness gates) | Add zero new quality gates; `check.sh` & `check.ps1` `26/26` PASS. |

**Rule 09 Motion Budget Caps (Binding Unless Explicitly Revised by Team Lead)**:

- Micro-interactions (hover, press, toggle, focus): **`<= 150ms`**
- Tooltips & Popovers: **`<= 200ms`**
- Context Panels, Dialogs, Drawers & Accordions: **`<= 300ms`**
- Route / Page Transitions & Hero Block Reveals: **`<= 400ms`** (total stagger reveal **`<= 400ms`**)
- SVG Stroke Draw & Data-Viz Reveals: **`<= 600ms`**
- Admin Data-Dense Surfaces (`HR`, `STAFF`, `ADMIN`): **`<= 150ms`** (strict restraint, zero vertical shift)
- Reduced Motion (`@media (prefers-reduced-motion: reduce)`): **`0.001ms`** duration safeguard + **`100ms`** gentle opacity cross-fade

---

## 5. Mandatory Milestone M4 Pilot Stop Gate

Pursuant to `ORIGINAL_REQUEST.md` (R5) and `D:\GitHub\Rikkei\.agents\PROMPT_UIUX_EN.txt` (Milestone M4), the team **MUST STOP at Milestone M4** before rolling out visual, motion, or copy changes across remaining pages (`M5a`/`M5+`):

1. **Scope of the 3 Pilot Screens**:
   - Screen 1: The Login page (`/login`, both tabs + side panel).
   - Screen 2: The Candidate role home (`/candidate`) including the collapsible left sidebar and M1 controls.
   - Screen 3: The HR company profile page (`/hr/company`).
2. **Required M4 Verification & Review Package**:
   - Run the prototype on the live Docker Compose stack and inspect all 3 screens using Antigravity `/browser` (base rules R2: click, right-click, double-click, scroll, keyboard Tab/Enter/Space/Escape, hover, form input, back/forward/reload, `375/768/1024/1440px`, Light & Dark; report any sandbox constraint honestly).
   - Store screenshots in git-ignored `docs/uiux/pr-screenshots/` with `ORDER.txt` (zero secrets or real personal data).
   - Send the M4 review package (screenshots, raw measurements including `scrollWidth` vs requested width and computed durations/easings, written design brief with before/after and motion token table, and the Skill Radar decision question) to the Team Lead via Parent and **WAIT for explicit Team Lead approval** before executing `M5a`/`M5+` full roll-out.

---

## 6. Operational Checklist and Verbatim Working Method

Mandatory working method (kept verbatim from `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` line 30):

> "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

Binding operational invariants for Round `UIUX-polish`:

- **Strict Order**: This `docs/uiux/PHASE0_ACK.md` file is authored **first**, before adding `docs/uiux/pr-screenshots/` to `.gitignore` or editing any other file in `D:\GitHub\Rikkei\rikkei-jobs`.
- **Git Read-Only**: Never execute mutating Git commands; leave all changes uncommitted and unstaged (`git diff --cached --name-only` empty); propose ordered English commits prefixed with `"UIUX: "`.
- **Zero New Dependencies & Zero New Gates**: Keep `backend/pom.xml`, `frontend/package.json`, and `mock/package.json` unchanged, and keep `check.sh` / `check.ps1` at `26` active gates / `29` definitions (`28` skills / `168` mirror files).
- **Formatter, Path, & Secret Hygiene**: UTF-8 without BOM, LF line endings, zero emoji, zero inline `cspell` directives, zero personal machine paths, zero access to `.env` or `*.pem`, and zero unverified claims.

---

## Phase 0 Acknowledgement — Round UIUX-radar

Document Path: `docs/uiux/PHASE0_ACK.md`
Task Code: None (Documented Exception: commit prefix `"UIUX: "`, PR title prefix `` `"[UIUX]"` ``)
Round: `UIUX-radar` — Follow-Up to `UIUX-polish` (`CompetencyRadarVisual` Bounded Auto-Cycle, Removal of Visible Pause Control, Bounded 1-Shot Ambient Arcs, Minimal `/login` Layout Balance, Docs & Skills Sync)
Branch: `feature/uiux-motion-polish`
Base: `feature/T022BB1-phan-quyen-5-vai-tro @ 143fe53` (+ uncommitted `UIUX-polish` working tree)
Working Directory: `D:\GitHub\Rikkei\rikkei-jobs`
Timestamp: `2026-11-20T10:38:00Z`
Status: Completed Prior to Any Code, Skill, Rule, Config, or Other Documentation Modification for Round `UIUX-radar`
Zero Emoji Compliance: Verified (0 emoji characters)

### Documented Task-Code Commit-Prefix Exception and Precedence (UIUX-radar)

**Explicit Task-Code Commit-Prefix Exception**: Like `UIUX-polish`, the follow-up `UIUX-radar` round has **NO separate task code**. Pursuant to `D:\GitHub\Rikkei\.agents\PROMPT_UIUX_RADAR_EN.txt` (line 1) and `<teamwork-state>/ORIGINAL_REQUEST.md` (line 3), every proposed commit message uses the English prefix `"UIUX: "` and the pull request title starts with `` `"[UIUX]"` ``.

**Binding Precedence Hierarchy**:
`D:\GitHub\Rikkei\.agents\PROMPT_UIUX_RADAR_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` > Enterprise Rules (`01`–`16` in `.claude/rules/`) > Repository Skills (`28` in `agent-config/skills/`).

### 1. Inventory of Authoritative Files Read and Inspected (UIUX-radar)

#### 1.1 Prompts, Root Configurations, and Survey Reports

1. **Task and Base Prompts**:
   - `<teamwork-state>/ORIGINAL_REQUEST.md` (lines 1–60)
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (lines 1–45)
   - `D:\GitHub\Rikkei\.agents\PROMPT_UIUX_RADAR_EN.txt` (lines 1–31)
   - `<teamwork-state>/teamwork_orchestrator_r1/PROJECT.md` (lines 1–29)
   - `<teamwork-state>/teamwork_explorer_survey_1/handoff.md` (lines 1–204)
   - `<teamwork-state>/teamwork_explorer_survey_2/handoff.md` (lines 1–258)
   - `<teamwork-state>/teamwork_explorer_survey_3/handoff.md` (lines 1–137)
2. **Root Agent Configurations**:
   - `CLAUDE.md` (lines 1–47)
   - `GEMINI.md` (lines 1–61)
   - `AGENTS.md` (lines 1–44)

#### 1.2 All 16 Enterprise Rules (`.claude/rules/`)

1. `.claude/rules/01-project-context.md` (lines 1–94)
2. `.claude/rules/02-git-and-delivery.md` (lines 1–90)
3. `.claude/rules/03-safety-and-secrets.md` (lines 1–70)
4. `.claude/rules/04-honest-verification.md` (lines 1–59)
5. `.claude/rules/05-backend-java.md` (lines 1–83)
6. `.claude/rules/06-database-flyway.md` (lines 1–73)
7. `.claude/rules/07-security-rbac.md` (lines 1–78)
8. `.claude/rules/08-frontend-engineering.md` (lines 1–79)
9. `.claude/rules/09-frontend-design-bar.md` (lines 1–79)
10. `.claude/rules/10-testing-strategy.md` (lines 1–66)
11. `.claude/rules/11-docs-and-bilingual.md` (lines 1–53)
12. `.claude/rules/12-ci-and-quality-gates.md` (lines 1–85)
13. `.claude/rules/13-backend-data-access-performance.md` (lines 1–79)
14. `.claude/rules/14-backend-module-boundaries.md` (lines 1–66)
15. `.claude/rules/15-backend-observability-ops.md` (lines 1–80)
16. `.claude/rules/16-backend-integrations.md` (lines 1–93)

#### 1.3 Applicable and Non-Applicable Skills (`.claude/skills/*/SKILL.md`)

Directly invoked and read in full prior to any edit for `UIUX-radar`:

1. `.claude/skills/using-rikkei-skills/SKILL.md` (lines 1–86)
2. `.claude/skills/frontend-motion-design/SKILL.md` (lines 1–248)
3. `.claude/skills/frontend-accessibility-audit/SKILL.md` (lines 1–138)
4. `.claude/skills/frontend-visual-design/SKILL.md` (lines 1–146)
5. `.claude/skills/test-driven-development/SKILL.md` (lines 1–89)
6. `.claude/skills/systematic-debugging/SKILL.md` (lines 1–90)
7. `.claude/skills/docs-bilingual-update/SKILL.md` (lines 1–137)
8. `.claude/skills/writing-skills/SKILL.md` (lines 1–129)
9. `.claude/skills/verification-before-completion/SKILL.md` (lines 1–125)

Supporting operational/UIUX skills already established in this branch and referenced as needed: `frontend-feature-slice`, `frontend-iconography`, `ci-local-and-debug`, `requesting-code-review`, `receiving-code-review`, `handoff-to-team-lead`, `brainstorming-before-building`, `writing-implementation-plans`, `executing-plans`, `dispatching-parallel-agents`, `module-domain-knowledge`.

Non-applicable skills (8 backend/integration/migration skills, untouched unless triggered): `api-contract-and-errors`, `backend-module-boundaries`, `backend-module-feature`, `backend-persistence-performance`, `external-system-integration-and-mock`, `flyway-migration-authoring`, `security-review-checklist`, `spring-security-rbac-endpoint`.

### 2. Concrete Constraints and Proof Methods for All 16 Enterprise Rules (UIUX-radar)

| Rule | Rule File | Concrete Actionable Constraint for Round `UIUX-radar` | Proof Method |
|---|---|---|---|
| Rule 01 | `01-project-context.md` | Keep all 9 domains, 5 roles, 20 standard skill codes, and stack versions unchanged; apply `"UIUX: "` commit prefix exception. | `git diff` confirms zero stack/role/module drift; `node scripts/check-version-drift.mjs` exits `0`. |
| Rule 02 | `02-git-and-delivery.md` | Stay on `feature/uiux-motion-polish`; keep Git strictly READ-ONLY (no `commit`, `push`, `add`, `stage`, `stash`, `checkout`, `restore`); leave all changes uncommitted and unstaged. | `git branch --show-current` = `feature/uiux-motion-polish`; `git diff --cached --name-only` is empty. |
| Rule 03 | `03-safety-and-secrets.md` | Write only inside `D:\GitHub\Rikkei\rikkei-jobs` (and external Teamwork scratch folder); never touch `.env`, `*.pem`, `first-key.pem`, `Tài liệu dự án`, `.agents`, or `.vscode`; tear down Docker after E2E (`docker compose down -v`). | `check.ps1` / `check.sh` secret and path scans pass; `docker ps -a` / `docker volume ls` show 0 `rikkei` leftovers after final teardown. |
| Rule 04 | `04-honest-verification.md` | Report `PASS` only with verbatim raw command output and exit code `0`; zero `console.log`/`TODO`/`FIXME`/personal machine paths; disclose `/browser` sandbox limits honestly. | Raw outputs recorded in handoff and `docs/uiux/BROWSER_OBSERVATIONS.md`; `check.ps1` / `check.sh` pass. |
| Rule 05 | `05-backend-java.md` | Zero Java backend edits in `UIUX-radar` (`backend/` untouched). | `git diff --name-only backend/` empty. |
| Rule 06 | `06-database-flyway.md` | Flyway `V1..V14` immutable; zero new migrations. | `git diff --name-only backend/src/main/resources/db/` empty; SQLFluff gate passes. |
| Rule 07 | `07-security-rbac.md` | Preserve all auth/RBAC routes, `RoutePolicyRegistry`, `OwnershipGuard`, and `MustChangePasswordFilter` untouched. | Existing security Vitest suites and `e2e/run-all.mjs` (26 suites) pass. |
| Rule 08 | `08-frontend-engineering.md` | TypeScript strict (`0 any`, `0 @ts-ignore`), single `httpClient.ts`, memory-only JWT, dynamic `aria-live` (`"off"` during auto-cycle, `"polite"` on user action), keyboard `Tab`/`Enter`/`Space`/`Escape` with zero focus stealing. | `npm --prefix frontend run lint`, `typecheck`, `test -- --run`, and live `/browser` keyboard/a11y checks pass. |
| Rule 09 | `09-frontend-design-bar.md` | Zero emoji, 100% `design-tokens.css` variables (Check 9), `CLS = 0`, highlight transition `<= 400ms` compositor/stroke-dashoffset only; update Rule 09 to document the Owner-approved `/login` hero exception (omitted visible pause button, 1-shot ambient arcs `<= 5s`, interaction pause, 3-round auto-stop). | `node scripts/validate-agent-config.mjs` (Check 9), `node scripts/compute-contrast.mjs` (`120/120`), bundle budgets (`Entry JS <= 128.81 kB`, `Combined CSS <= 20.736 kB`). |
| Rule 10 | `10-testing-strategy.md` | Remove obsolete `"Tạm dừng nền"` / `"Phát nền"` button assertions; add deterministic `vi.useFakeTimers()` tests for all R2/R3 states and unmount cleanup; update Rule 10 exact Vitest test/file counts if changed. | `npm --prefix frontend run test -- --run` passes all 396+ tests with 0 warnings/leaks; Rule 10 counts synced. |
| Rule 11 | `11-docs-and-bilingual.md` | Maintain symmetrical EN/VI updates in `DESIGN_SYSTEM.md` and `docs/uiux/*` with full Vietnamese diacritics, UTF-8 no BOM, LF, zero inline `cspell:` disables, and clean `markdownlint-cli2` / `cspell`. | `markdownlint-cli2`, `cspell`, and `node scripts/check-version-drift.mjs` exit `0`. |
| Rule 12 | `12-ci-and-quality-gates.md` | Add zero new quality gates (`29` definitions = `26` active + `3` fallbacks); never execute `scripts/run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs`, `.\check.ps1`, and `./check.sh` exit `0`. |
| Rule 13 | `13-backend-data-access-performance.md` | Keep persistence config (`open-in-view: false`, `ddl-auto: none`, Hikari) untouched. | `git diff --name-only backend/` empty. |
| Rule 14 | `14-backend-module-boundaries.md` | Keep all 9 backend module packages and DAG boundaries untouched. | `git diff --name-only backend/src/main/java/` empty. |
| Rule 15 | `15-backend-observability-ops.md` | Zero secrets/PII in UI copy, tests, or `docs/uiux/pr-screenshots/`. | Security scan and screenshot inspection pass. |
| Rule 16 | `16-backend-integrations.md` | Add zero new dependencies to `frontend/package.json`, `mock/package.json`, or `backend/pom.xml`; keep mock port `9000` untouched. | `git diff --name-only backend/pom.xml frontend/package.json mock/package.json` empty. |

### 3. Applicable Skills, Non-Applicable Skills, and Proof Methods (UIUX-radar)

| # | Skill Name | Why It Applies to Round `UIUX-radar` | Concrete Constraint & Proof Method |
|---|---|---|---|
| 1 | `using-rikkei-skills` | Governs skill precedence and Phase 0 enforcement. | `docs/uiux/PHASE0_ACK.md` updated prior to any edit; precedence rules honored. |
| 2 | `frontend-motion-design` | Governs R2 (`.rj-story-ambient` 1-shot `<= 5s`, `document.hidden`, `prefers-reduced-motion`), R3 (`--rj-radar-cycle: 4000ms`, `<= 400ms` highlight, 1 timer/step, zero `setInterval`), and R5 skill + `motion-tokens.css` sync. | CSS tokens & keyframes verified; fake-timer tests verify timer lifecycle; `validate-agent-config.mjs` passes. |
| 3 | `frontend-accessibility-audit` | Governs WCAG 2.2.2 compliance without a visible pause button (interaction pause, 1-shot ambient, 3-round stop), `focusedAxis` vs `selectedAxis`, `Escape` without focus stealing, and dynamic `aria-live`. | Unit tests verify `aria-live="off"` vs `"polite"`, `aria-pressed`, `Tab`/`Enter`/`Space`/`Escape`, and `prefers-reduced-motion`. |
| 4 | `frontend-visual-design` | Governs R4 minimal `/login` wide-screen (`1600–1920px`) & `1280x800` layout balance, `CLS = 0`, zero horizontal overflow, design-token colors only, and R5 `DESIGN_SYSTEM.md` sync. | Before/after bounding boxes measured at `375/1280/1440/1600/1660/1920`; `compute-contrast.mjs` `120/120` PASS; Check 9 PASS. |
| 5 | `test-driven-development` | Governs R2/R3 Vitest fake-timer behavioral coverage. | Comprehensive `vi.useFakeTimers()` tests cover advance, hover, focus, 8s click hold, re-click, Escape, 3-round stop, visibility, reduced motion, unmount cleanup. |
| 6 | `systematic-debugging` | Governs R4 root-cause isolation (`owner-report-login-left-clipped.png` vs live viewport measurements) and layout fix verification. | Empirical bounding boxes recorded before/after at all target widths (`375–1920px`). |
| 7 | `docs-bilingual-update` | Governs R5 bilingual updates to `DESIGN_SYSTEM.md` and `docs/uiux/*`. | `markdownlint-cli2`, `cspell`, and `check-version-drift.mjs` exit `0`. |
| 8 | `writing-skills` | Governs R5 updates to `agent-config/skills/frontend-motion-design/SKILL.md` (`<= 500` lines, trigger-only description, 8 sections, 0 emoji) + `sync-agent-config.mjs`. | `node scripts/sync-agent-config.mjs` + `node scripts/validate-agent-config.mjs` (`168` mirrors, `10/10` pass). |
| 9 | `verification-before-completion` | Governs bundle checks, local gates, Docker rebuild, and raw proof capture. | Raw lint, typecheck, Vitest, Vite + gz6 bundle sizes, contrast, and Docker E2E outputs recorded. |

Non-applicable skills (8 backend/integration/migration skills): `api-contract-and-errors`, `backend-module-boundaries`, `backend-module-feature`, `backend-persistence-performance`, `external-system-integration-and-mock`, `flyway-migration-authoring`, `security-review-checklist`, `spring-security-rbac-endpoint`.

### 4. Start-of-Round Baseline Measurements and Thresholds (UIUX-radar)

Verified start-of-round baseline on `feature/uiux-motion-polish` after `UIUX-polish`:

| Metric / Gate | Verified Start-of-Round Baseline | Round `UIUX-radar` Threshold / Cap |
|---|---|---|
| **Entry JS Bundle** (`frontend/dist/assets/index-*.js`) | **`97.80 kB`** (`97,796 B` gz6) / **`97.61 kB`** (`97,605 B` gz9 Vite CLI) | **`<= 128.81 kB`** (report both Vite CLI gz9 and Node `zlib.gzipSync` level-6 gz6). |
| **Total JS Bundle** (`30` chunks) | **`149.91 kB`** (`149,905 B` gz6) / **`149.61 kB`** (`149,607 B` gz9) | Tracked and reported with zero external runtime dependencies added. |
| **Entry CSS Bundle** (`frontend/dist/assets/index-*.css`) | **`13.94 kB`** (`13,943 B` gz6) / **`13.76 kB`** (`13,760 B` gz9) | Reported alongside Combined Single-Stream CSS. |
| **Combined Single-Stream CSS** (`7` CSS assets concatenated) | **`20.44 kB`** (`20,442 B` gz6) / **`20.17 kB`** (`20,167 B` gz9) | **`<= 20.736 kB`** ceiling (`CLS = 0`). |
| **Frontend Vitest Suite** (`npm --prefix frontend run test -- --run`) | **`34` files / `396` tests PASS** | All 396+ tests pass (old pause-button test removed, comprehensive fake-timer radar suite added). |
| **PR Screenshots** (`docs/uiux/pr-screenshots/`) | **`67` indexed PNGs** in `ORDER.txt` + **`1` owner defect screenshot** (`owner-report-login-left-clipped.png`) | Updated `ORDER.txt` indexing new `UIUX-radar` `/browser` proof screenshots. |
| **Agent Config Parity** (`validate-agent-config.mjs`) | **`28` skills / `168` mirror files / `10/10` Checks PASS** | Preserve `28` skills / `168` mirrors / `10/10` PASS after Rule 09/10 & skill updates. |
| **Contrast Audit** (`compute-contrast.mjs`) | **`120/120` contrast pairs PASS** | Maintain `120/120` PASS (`0` violations). |

### 5. Team Lead Binding Confirmations and Mandatory `/browser` Gate (UIUX-radar)

1. **R4 Owner Screenshot Finding (`owner-report-login-left-clipped.png`, `1662x862`)**: Left-edge clipping is **not reproducible** in the browser at `1280/1440/1600/1660/1662/1920/375` (`scrollWidth === innerWidth`, `.rj-brand-lockup` consistently starts at `x = 40px` on desktop and `x = 16px` on `375px`). The Owner confirmed the image was a personal laptop screenshot crop/shift of a `1920px` render (`88px` cropped on the left). Accordingly, apply ONLY a minimal, low-risk layout refinement (no redesign): constrain `max-width` and balance story content, footer, and detail box at `1600–1920px` so no large empty gap appears next to the login card, add defensive `min-width: 0` and `overflow-x: clip`, fix the `6.9px` vertical overflow at `1280x800`, and measure/report before-and-after bounding boxes.
2. **R2 Ambient Duration Token**: Set `--rj-duration-ambient: 4500ms` (arc 1 `4500ms`, arc 2 `4800ms`) with `animation-iteration-count: 1` and `forwards` fill mode (total `<= 5s` then static), keeping `document.hidden` pause and `prefers-reduced-motion: reduce` static, and sync `design-tokens.css` and `DESIGN_SYSTEM.md`.
3. **R3 `CompetencyRadarVisual` Semantics & Copy**: Separate `focusedAxis` from `selectedAxis`; `Escape` keeps keyboard focus (no focus stealing / `.blur()`) while clearing selection and resuming auto-cycle immediately; `autoCycle?: boolean` defaults to `false` and is enabled ONLY on `LoginPage.tsx` (`/login`); approved Vietnamese caption verbatim: `"Hình minh họa 6 nhóm kỹ năng: di chuột hoặc dùng Tab để tạm dừng, chọn để giữ 8 giây, nhấn Escape để tiếp tục."`
4. **R5 Rule 09 Owner-Approved Deviation**: Removal of the visible `"Tạm dừng nền"` / `"Phát nền"` toggle on `/login` hero is an **Owner-approved knowing deviation from Rule 09's visible-pause clause**, compensated by: (a) interaction-based pause/hold/resume documented in the radar caption, (b) 1-shot ambient arcs `<= 5s`, and (c) 3-round (18-step, ~72s) auto-stop returning to overview.
5. **Mandatory `/browser` Verification (R6)**: Live `/browser` checks (including timed auto-advance frames, hover hold, 8s click hold + resume, keyboard `Tab`/`Enter`/`Space`/`Escape`, `1280/1440/1600/1660/1920` light+dark and `375` px, and `scrollWidth <= requestedWidth`) will run via Parent relay against `http://127.0.0.1:3000` after Docker rebuild, with all `webview_browser` sandbox limits disclosed honestly.

### 6. Operational Checklist and Verbatim Working Method (UIUX-radar)

Mandatory working method (kept verbatim from `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` line 30):

> "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

Binding operational invariants for Round `UIUX-radar`:

- **Strict Order**: This `UIUX-radar` Phase 0 section is appended **first** to `docs/uiux/PHASE0_ACK.md` prior to any code, CSS, test, rule, skill, or other documentation edit (`docs/nt01/PHASE0_ACK.md` remains untouched).
- **Git Read-Only**: Never stage, commit, push, reset, stash, or switch branches; keep all modifications uncommitted on `feature/uiux-motion-polish`.
- **Zero New Dependencies & Zero New Gates**: Keep `frontend/package.json`, `mock/package.json`, `backend/pom.xml`, and `check.sh`/`check.ps1` gate counts unchanged.
- **Token, Emoji & Path Hygiene**: Zero emojis anywhere, zero raw color literals outside `design-tokens.css`, UTF-8 no BOM, LF endings, full Vietnamese diacritics, and zero personal machine paths.

---

## Phase 0 Acknowledgement — Round UIUX-align

Document Path: `docs/uiux/PHASE0_ACK.md`
Task Code: None (Documented Exception: commit prefix `"UIUX: "`, PR title prefix `` `"[UIUX]"` ``)
Round: `UIUX-align` — Visual, Structural, Motion, State, Accessibility, and CSS-Diet Alignment of `/candidate/internships` (`TT-01`) with Polished Candidate Pages (`/candidate`, `/candidate/jobs`, `/candidate/skills`)
Branch: `feature/uiux-motion-polish`
Base: `HEAD 5f817fe` (clean merge of `develop` PR #17 `TT-01` internships onto `UIUX-polish` + `UIUX-radar`)
Working Directory: `D:\GitHub\Rikkei\rikkei-jobs`
Timestamp: `2026-11-21T02:00:00Z`
Status: Completed Prior to Any Source Code, CSS, Test, Rule, Skill, Config, or Other Documentation Modification for Round `UIUX-align`
Zero Emoji Compliance: Verified (0 emoji characters)

### Documented Task-Code Commit-Prefix Exception and Precedence (UIUX-align)

**Explicit Task-Code Commit-Prefix Exception**: Like `UIUX-polish` and `UIUX-radar`, Round `UIUX-align` has **NO separate task code** (unlike `T022DB0:` in `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, and Rules `01`, `02`, `11`). Pursuant to `D:\GitHub\Rikkei\.agents\PROMPT_UIUX_ALIGN_EN.txt` (line 1) and `<teamwork-state>/ORIGINAL_REQUEST.md` (line 3), every proposed commit message uses the English prefix `"UIUX: "` and the pull request title starts with `` `"[UIUX]"` ``.

**Binding Precedence Hierarchy**:
`D:\GitHub\Rikkei\.agents\PROMPT_UIUX_ALIGN_EN.txt` > `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` > Enterprise Rules (`01`–`16` in `.claude/rules/`) > Repository Skills (`28` in `agent-config/skills/`).

### 1. Inventory of Authoritative Files Read and Inspected (UIUX-align)

#### 1.1 Prompts, Root Configurations, and Survey Reports (UIUX-align)

1. **Task and Base Prompts**:
   - `<teamwork-state>/ORIGINAL_REQUEST.md` (lines 1–87)
   - `<teamwork-state>/PROJECT.md` (lines 1–46)
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (lines 1–53)
   - `D:\GitHub\Rikkei\.agents\PROMPT_UIUX_ALIGN_EN.txt` (lines 1–42)
   - `<teamwork-state>/teamwork_explorer_survey_1/handoff.md` (lines 1–287)
   - `<teamwork-state>/teamwork_explorer_survey_3/handoff.md` (lines 1–291)
2. **Root Agent Configurations**:
   - `CLAUDE.md` (lines 1–47)
   - `GEMINI.md` (lines 1–61)
   - `AGENTS.md` (lines 1–44)

#### 1.2 All 16 Enterprise Rules (`.claude/rules/`) (UIUX-align)

1. `.claude/rules/01-project-context.md` (lines 1–94)
2. `.claude/rules/02-git-and-delivery.md` (lines 1–90)
3. `.claude/rules/03-safety-and-secrets.md` (lines 1–70)
4. `.claude/rules/04-honest-verification.md` (lines 1–59)
5. `.claude/rules/05-backend-java.md` (lines 1–83)
6. `.claude/rules/06-database-flyway.md` (lines 1–73)
7. `.claude/rules/07-security-rbac.md` (lines 1–78)
8. `.claude/rules/08-frontend-engineering.md` (lines 1–79)
9. `.claude/rules/09-frontend-design-bar.md` (lines 1–79)
10. `.claude/rules/10-testing-strategy.md` (lines 1–66)
11. `.claude/rules/11-docs-and-bilingual.md` (lines 1–53)
12. `.claude/rules/12-ci-and-quality-gates.md` (lines 1–85)
13. `.claude/rules/13-backend-data-access-performance.md` (lines 1–79)
14. `.claude/rules/14-backend-module-boundaries.md` (lines 1–66)
15. `.claude/rules/15-backend-observability-ops.md` (lines 1–80)
16. `.claude/rules/16-backend-integrations.md` (lines 1–93)

#### 1.3 Design System, UIUX Docs, and Infrastructure Specs (UIUX-align)

1. `docs/design/DESIGN_SYSTEM.md` (lines 1–1817)
2. `docs/uiux/CONTENT.md` (lines 1–344)
3. `docs/uiux/RESEARCH.md` (lines 1–427)
4. `docs/uiux/PHASE0_ACK.md` (lines 1–379)
5. `docker-compose.yml` (lines 1–168)
6. `.markdownlint-cli2.jsonc` (lines 1–11)

#### 1.4 Applicable and Non-Applicable Skills (`.claude/skills/*/SKILL.md`) (UIUX-align)

Directly read in full prior to any edit for Round `UIUX-align`:

1. `.claude/skills/using-rikkei-skills/SKILL.md` (lines 1–86)
2. `.claude/skills/frontend-visual-design/SKILL.md` (lines 1–146)
3. `.claude/skills/frontend-motion-design/SKILL.md` (lines 1–254)
4. `.claude/skills/frontend-accessibility-audit/SKILL.md` (lines 1–138)
5. `.claude/skills/frontend-iconography/SKILL.md` (lines 1–154)
6. `.claude/skills/frontend-feature-slice/SKILL.md` (lines 1–152)
7. `.claude/skills/test-driven-development/SKILL.md` (lines 1–89)
8. `.claude/skills/docs-bilingual-update/SKILL.md` (lines 1–137)
9. `.claude/skills/verification-before-completion/SKILL.md` (lines 1–125)
10. `.claude/skills/ci-local-and-debug/SKILL.md` (lines 1–178)
11. `.claude/skills/handoff-to-team-lead/SKILL.md` (lines 1–121)

Additional repository process skills remain available if triggered during execution (`brainstorming-before-building`, `writing-implementation-plans`, `executing-plans`, `dispatching-parallel-agents`, `systematic-debugging`, `requesting-code-review`, `receiving-code-review`, `module-domain-knowledge`). Eight backend/integration/migration skills (`api-contract-and-errors`, `backend-module-boundaries`, `backend-module-feature`, `backend-persistence-performance`, `external-system-integration-and-mock`, `flyway-migration-authoring`, `security-review-checklist`, `spring-security-rbac-endpoint`) and `writing-skills` are omitted as non-applicable unless triggered (see Section 3).

### 2. Concrete Constraints and Proof Methods for All 16 Enterprise Rules (UIUX-align)

| Rule | Rule File | Concrete Actionable Constraint for Round `UIUX-align` | Proof Method |
|---|---|---|---|
| Rule 01 | `01-project-context.md` | Keep all 9 modules/domains, 5 canonical roles (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`), 20 standard skill codes, and pinned stack versions unchanged; apply documented `"UIUX: "` commit prefix exception. | `git diff` confirms zero stack/role/module drift; `node scripts/check-version-drift.mjs` exits `0`. |
| Rule 02 | `02-git-and-delivery.md` | Stay on `feature/uiux-motion-polish`; keep Git strictly READ-ONLY (never run `commit`, `push`, `add`, `stage`, `amend`, `rebase`, `reset`, `stash`, `tag`, `switch`, `restore`); leave all changes uncommitted and unstaged; propose `"UIUX: "` English commits matching `git status --porcelain -uall` excluding git-ignored files under `docs/uiux/pr-screenshots/`. | `git branch --show-current` = `feature/uiux-motion-polish`; `git diff --cached --name-only` is empty; `git status --porcelain -uall` matches `PR_DESCRIPTION.md` file list. |
| Rule 03 | `03-safety-and-secrets.md` | Write only inside `D:\GitHub\Rikkei\rikkei-jobs` (and external Teamwork scratch state); keep `Tài liệu dự án`, `.agents`, and `.vscode` read-only; never open, read, or print `.env`, `*.pem`, `first-key.pem`, or credentials; never add `.agents/teamwork/` inside the repo; tear down Docker via `docker compose down -v` and clean OS temp files. | Secret scan and personal-path scan in `check.sh` / `check.ps1` pass; `docker ps -a` and `docker volume ls` show `0` `rikkei` leftovers after final teardown. |
| Rule 04 | `04-honest-verification.md` | Claim `PASS` only for commands actually executed on the final state with verbatim raw stdout/stderr and exit code `0`; zero `console.log`/`TODO`/`FIXME`/personal machine paths; disclose `webview_browser` sandbox limits honestly. | Raw outputs recorded in `docs/uiux/BROWSER_OBSERVATIONS.md` and handoff; `check.sh` & `check.ps1` (`26/26`) exit `0`. |
| Rule 05 | `05-backend-java.md` | Keep Java backend code completely untouched (`backend/` unchanged beyond running read-only gates). | `git diff --name-only backend/` is empty. |
| Rule 06 | `06-database-flyway.md` | Keep Flyway migrations `V1..V15` immutable and add zero new migrations. | `git diff --name-only backend/src/main/resources/db/` is empty and SQLFluff gate passes. |
| Rule 07 | `07-security-rbac.md` | Preserve `routePolicies.ts`, `roleMenuConfig.ts`, `RoutePolicyRegistry`, `OwnershipGuard`, `MustChangePasswordFilter`, and `/candidate/internships` `CANDIDATE`-only guard unchanged. | `git diff` on `routePolicies.ts` & `roleMenuConfig.ts` empty; security Vitest specs & `e2e/run-all.mjs` (`27` suites) pass. |
| Rule 08 | `08-frontend-engineering.md` | Enforce TypeScript strict mode (`0 any`, `0 @ts-ignore`), keep `httpClient.ts` & `candidateInternships.ts` API contract and `CandidateInternshipsProps` intact, use single `<h1>` (`rj-page-title`), semantic `<dl>`/`<dt>`/`<dd>`, `role="status"`/`aria-live="polite"` only for loading, `role="alert"` for errors, no focus stealing, `>= 44px` `"Thử lại"` target with `:focus-visible`, and `vi-VN` (`dd/MM/yyyy`) en dash dates. | `npm --prefix frontend run lint`, `typecheck`, `test -- --run`, and `/browser` keyboard walkthrough (`Tab`, `Enter`, `Space`) pass. |
| Rule 09 | `09-frontend-design-bar.md` | Zero emoji, `<Icon name=... />` on `24px` grid (`aria-hidden`), zero raw color literals outside `design-tokens.css` (Check 9), no inline style objects, no `!important`, `rj-surface-card` / `rj-stack-lg` / metric hierarchy matching candidate pages, Rule 09 Showcase & Micro motion budgets (`<= 150ms` card hover/press, entrance once per navigation, `useCountUp <= 800ms` with `.rj-metric-slot` if used, `CLS = 0`, no new keyframes or ambient loops, `prefers-reduced-motion` immediate final values), and Anti-AI rubric `>= 11/12`. | `validate-agent-config.mjs` (Check 9), `compute-contrast.mjs` (`120/120`), bundle caps (`Entry JS <= 128.81 kB`, `Combined CSS <= 20.736 kB`), `/browser` parity table & `CLS = 0` measurement. |
| Rule 10 | `10-testing-strategy.md` | Update `CandidateInternships.test.tsx` (Vitest + Testing Library, `0 act()` warnings) asserting `rj-page-title`, `rj-surface-card`, single `h1`, loading skeleton, `rj-empty-state`, error alert + retry, null-safe fallbacks, reduced-motion immediate values, and `vi-VN` date format while keeping all `36` files / `427+` tests green and E2E `27/329/2020` green. | `npm --prefix frontend run test -- --run` and fresh Docker `node e2e/run-all.mjs` exit `0`. |
| Rule 11 | `11-docs-and-bilingual.md` | Update `docs/uiux/PHASE0_ACK.md`, `README.md`, `BROWSER_OBSERVATIONS.md`, `PR_DESCRIPTION.md`, and `pr-screenshots/ORDER.txt` (`DESIGN_SYSTEM.md` only if a shared class is added) with English doc bodies, full Vietnamese diacritics where Vietnamese copy/reports appear, UTF-8 no BOM, LF, zero inline `cspell` ignores. | `markdownlint-cli2`, `cspell` (`en,vi`), and `node scripts/check-version-drift.mjs` exit `0`. |
| Rule 12 | `12-ci-and-quality-gates.md` | Add zero new quality gates (`29` definitions = `26` active + `3` fallbacks); never execute `scripts/run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs`, `./check.sh`, and `.\check.ps1` (`26/26`) exit `0`. |
| Rule 13 | `13-backend-data-access-performance.md` | Keep backend persistence config (`open-in-view: false`, `ddl-auto: none`, Hikari) untouched. | `git diff --name-only backend/` empty. |
| Rule 14 | `14-backend-module-boundaries.md` | Keep all 9 backend module boundaries and `App.tsx` structure untouched. | `git diff --name-only backend/ frontend/src/App.tsx` empty. |
| Rule 15 | `15-backend-observability-ops.md` | Never expose secrets, tokens, passwords, or real personal data in UI copy, tests, or `docs/uiux/pr-screenshots/`. | Secret scan and screenshot audit pass cleanly. |
| Rule 16 | `16-backend-integrations.md` | Add zero new dependencies (`backend/pom.xml`, `frontend/package.json`, `mock/package.json` unchanged); keep mock port `9000` untouched. | `git diff` on all 3 manifests empty; `node mock/test-runner.js` passes. |

### 3. Applicable Skills, Non-Applicable Skills, and Proof Methods (UIUX-align)

#### 3.1 Applicable Skills (11 Core Skills + Supporting Process Skills)

| # | Skill Name | Why It Applies to Round `UIUX-align` | Concrete Constraint & Proof Method |
|---|---|---|---|
| 1 | `using-rikkei-skills` | Mandatory governance entrypoint required by R1 (`PROMPT_BASE_RULES_EN.txt:9-10`). | Enforce precedence (`PROMPT_UIUX_ALIGN_EN.txt` > `PROMPT_BASE_RULES_EN.txt` > Rules `01`–`16` > Skills) and progressive loading. *Proof*: This `UIUX-align` Phase 0 ACK appended prior to any edit. |
| 2 | `frontend-visual-design` | Required by R1/prompt; governs alignment of `/candidate/internships` with `/candidate`, `/candidate/jobs`, and `/candidate/skills`. | Use `rj-page-header`/`rj-page-title`/`rj-page-subtitle`, `rj-stack-lg`, `rj-surface-card`, shared metric hierarchy, Airy mode (`375/768/1024/1440px`, `scrollWidth <= requestedWidth`), tokens only (Check 9), 0 emoji, authentic Vietnamese, Anti-AI `>= 11/12`. *Proof*: `validate-agent-config.mjs` Check 9, `compute-contrast.mjs`, `/browser` parity table. |
| 3 | `frontend-motion-design` | Required by R5/prompt; governs entrance, hover/press, and optional `useCountUp` under Rule 09. | Use shared entrance/stagger and `.rj-interactive-card` (`<= 150ms`, border/shadow tokens, no scale-jiggle), optional `useCountUp` (`<= 800ms`, 1x/nav, `.rj-metric-slot`), `CLS = 0`, zero new keyframes or ambient loops, `prefers-reduced-motion` instant final values. *Proof*: CSS inspection, `CandidateInternships.test.tsx`, `/browser` `CLS = 0` check. |
| 4 | `frontend-accessibility-audit` | Required by R4/prompt; governs semantic markup, live regions, keyboard focus, and target sizes. | Single `<h1>`, semantic `<dl>`/`<dt>`/`<dd>`, `role="status"`/`aria-live="polite"` only for loading, `role="alert"` for errors, no focus stealing, `"Thử lại"` button `>= 44x44px` with `:focus-visible`, full `Tab`/`Enter`/`Space` walkthrough. *Proof*: `CandidateInternships.test.tsx` + `/browser` keyboard audit. |
| 5 | `frontend-iconography` | Required by R3/prompt; governs all icons on `/candidate/internships`. | Render 100% icons via existing `<Icon name=... />` (`24x24` grid, `stroke-width="2"`, `currentColor`, `aria-hidden="true"`), zero emoji, zero raw inline `<svg>`. *Proof*: JSX inspection + Check 3 zero-emoji gate. |
| 6 | `frontend-feature-slice` | Edits reside inside `frontend/src/features/internship/**`. | Preserve all 4 async states (Loading skeleton, Error alert + retry, Empty state, Data cards), `types.ts`, `api/candidateInternships.ts`, `index.ts` barrel, and `CandidateInternshipsProps`. *Proof*: `git diff` on `types.ts`/`api/`/`index.ts` empty; `typecheck` & `lint` pass. |
| 7 | `test-driven-development` | Required by R7 for updating `CandidateInternships.test.tsx`. | Keep existing `17` internship tests green with `0 act()` warnings; assert shared classes, single `h1`, skeleton loading, `rj-empty-state`, error alert + retry, null-safe fallbacks, reduced-motion immediate render, and `vi-VN` dates without `setTimeout`. *Proof*: `npm --prefix frontend run test -- --run` passes `0` warnings. |
| 8 | `docs-bilingual-update` | Required by R8 for `docs/uiux/*` updates. | Update `PHASE0_ACK.md`, `README.md`, `BROWSER_OBSERVATIONS.md`, `PR_DESCRIPTION.md`, and `pr-screenshots/ORDER.txt`; UTF-8 no BOM, LF, zero inline `cspell` ignores. *Proof*: `markdownlint-cli2`, `cspell`, `check-version-drift.mjs` exit `0`. |
| 9 | `verification-before-completion` | Mandatory before declaring completion on `UIUX-align`. | Measure and report raw before/after `candidateInternships.css` lines, Entry JS gzip (`<= 128.81 kB`), Combined CSS gzip (`<= 20.736 kB`), `120/120` contrast, `10/10` agent-config checks, and `26/26` local gates. *Proof*: Verbatim raw outputs in `BROWSER_OBSERVATIONS.md` and handoff. |
| 10 | `ci-local-and-debug` | Governs running `./check.sh`, `.\check.ps1`, and Docker Compose E2E. | Run both `./check.sh` and `.\check.ps1` (`26/26`) and fresh `docker compose up -d --build --wait` -> `node e2e/run-all.mjs` -> `docker compose down -v` (`0` leftovers); never run `scripts/run-ci-in-docker.*`. *Proof*: Raw gate logs and `docker ps -a` / `docker volume ls` empty. |
| 11 | `handoff-to-team-lead` | Governs final uncommitted delivery and `"UIUX: "` commit proposals. | Leave all edits uncommitted/unstaged; verify `PR_DESCRIPTION.md` commit proposal (`"UIUX: "`) matches `git status --porcelain -uall` excluding git-ignored files under `docs/uiux/pr-screenshots/`. *Proof*: `git status --porcelain -uall` & `git diff --cached --name-only` empty. |

Supporting process skills (`brainstorming-before-building`, `writing-implementation-plans`, `executing-plans`, `dispatching-parallel-agents`, `systematic-debugging`, `requesting-code-review`, `receiving-code-review`, `module-domain-knowledge`) are applied as workflow discipline where triggered.

#### 3.2 Non-Applicable Skills (Omitted Unless Triggered — 9 Skills)

| # | Skill Name | Rationale for Omission in Round `UIUX-align` |
|---|---|---|
| 1 | `backend-module-feature` | Frontend-only UI/UX alignment round; zero Java backend controllers, services, or DTOs are modified. |
| 2 | `backend-module-boundaries` | Zero Java packages or module boundaries under `backend/src/main/java/` are touched. |
| 3 | `backend-persistence-performance` | Zero JPA entities, queries, or Hikari/persistence settings are changed. |
| 4 | `flyway-migration-authoring` | Flyway migrations `V1..V15` are immutable; zero schema/seed changes needed. |
| 5 | `spring-security-rbac-endpoint` | Backend RBAC policies (`InternshipProfileController`, `RoutePolicyRegistry`, `OwnershipGuard`) remain untouched. |
| 6 | `api-contract-and-errors` | Backend REST endpoints and `InternshipResponse` JSON contracts remain unchanged. |
| 7 | `external-system-integration-and-mock` | Mock server (`mock/server.js`) is untouched and used read-only for LMS SSO tickets and E2E. |
| 8 | `security-review-checklist` | No backend auth/IDOR or token-storage logic changes; frontend secret/PII/RBAC invariants remain enforced via Rules `03`, `07`, `08` and E2E/gate scans. |
| 9 | `writing-skills` | No files in `agent-config/skills/` or `agent-config/rules/` are targeted unless an unexpected skill defect is discovered. |

### 4. Start-of-Round Baseline Measurements and Thresholds (UIUX-align)

Measured directly on clean `HEAD` (`5f817fe`) on branch `feature/uiux-motion-polish` prior to any modification:

| Metric / Gate | Verified Start-of-Round Baseline (`5f817fe`) | Round `UIUX-align` Threshold / Target |
|---|---|---|
| **Frontend Lint** (`npm --prefix frontend run lint`) | `0` errors, `0` warnings (`eslint .`, exit `0`) | Must remain `0` errors / `0` warnings. |
| **Frontend Typecheck** (`npm --prefix frontend run typecheck`) | `0` diagnostics (`tsc --noEmit`, exit `0`) | Must remain `0` diagnostics. |
| **Frontend Vitest Suite** (`npm --prefix frontend run test -- --run`) | **`36` files / `427` tests PASS** (`CandidateInternships.test.tsx`: `17` tests; `0` `act()` warnings; exit `0`) | All existing `427` tests + new R7 assertions PASS with `0` `act()` warnings. |
| **Entry JS Bundle** (`dist/assets/index-*.js`) | **`320,267 B`** (`320.26 kB` Vite CLI) raw / **`98,732 B`** (`98.73 kB`) gz6 / **`98,538 B`** (`98.54 kB`) gz9 / **`99.75 kB`** Vite CLI gzip | **`<= 128.81 kB`** ceiling. |
| **`CandidateInternshipsPage` CSS** (`dist/assets/CandidateInternshipsPage-*.css`) | **`6,486 B`** (`6.48 kB` Vite CLI) raw / **`1,468 B`** (`1.46 kB` Vite CLI) gz6 / **`1,462 B`** gz9 | Shrink substantially by removing duplicated rules. |
| **`candidateInternships.css` Source Lines** | **`511` lines** (`9,256` bytes) | Substantial line-count reduction (target ~70–120 lines of feature-specific layout). |
| **Combined Single-Stream CSS** (all `8` `.css` files in `dist/assets/`) | **`136,843 B`** raw / **`21,292 B` (`21.29 kB`) gz6** / **`21,009 B` (`21.01 kB`) gz9** (`556 B` over cap at gz6) | **`<= 20.736 kB` (`20,736 B`)** ceiling (trimming `candidateInternships.css` must restore compliance). |
| **Contrast Audit** (`node scripts/compute-contrast.mjs`) | **`120/120` contrast pairs PASS** (`9` CIELAB surface + `10` UI boundary invariants, `0` violations, exit `0`) | Maintain **`120/120` PASS** (`0` violations). |
| **Version Drift** (`node scripts/check-version-drift.mjs`) | **`32/32` manifest tokens PASS** (exit `0`) | Maintain exit `0`. |
| **Quality Gate Sync** (`node scripts/check-gate-sync.mjs`) | **`29` gate definitions = `26` active + `3` fallbacks** (`23` CI checks, `25` Docker harness gates, exit `0`) | Zero new gates; `./check.sh` & `.\check.ps1` `26/26` PASS. |
| **Agent Config Parity & Validation** (`sync-agent-config.mjs --check` & `validate-agent-config.mjs`) | **`168` mirror files, `28` skills, `215` artifacts, Checks `1–10` PASS** (exit `0`) | Maintain `168` mirrors, `28` skills, `10/10` PASS. |
| **E2E Suite Baseline** (`ORIGINAL_REQUEST.md` / `5f817fe`) | **`27` suites / `329` cases / `2,020` assertions** | Re-run fresh on Docker Compose stack in M2; `docker compose down -v` afterwards. |

### 5. Operational Checklist and Verbatim Working Method (UIUX-align)

Mandatory working method (kept verbatim from `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` line 30):

> "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

Binding operational invariants for Round `UIUX-align`:

- **Strict Order**: This `UIUX-align` Phase 0 section is appended **first** to `docs/uiux/PHASE0_ACK.md` prior to any code, CSS, test, or other documentation edit (`docs/nt01/PHASE0_ACK.md` and prior `UIUX-polish`/`UIUX-radar` sections remain verbatim).
- **Showcase Motion & R3 Gate Discipline**: Rule 09 Showcase Tier explicitly permits `(b) data-viz and number reveals (radar, counters, progress)` up to `<= 800ms` (`useCountUp` runs once per navigation in `<= 760ms`, reserves space via `.rj-metric-slot` for `CLS = 0`, and renders the final number immediately under `prefers-reduced-motion`). Any deviation requiring a shared stylesheet change affecting `/candidate`, `/candidate/jobs`, or `/candidate/skills`, any missed bundle/gate threshold after CSS diet, or any out-of-scope defect triggers an immediate stop of sub-agents/Docker and a single `[CAN DUYET - DOI TEAM LEAD]` request per R3.
- **Git Read-Only**: Never stage, commit, push, reset, stash, or switch branches; keep all modifications uncommitted on `feature/uiux-motion-polish`.
- **Zero New Dependencies & Zero New Gates**: Keep `frontend/package.json`, `mock/package.json`, `backend/pom.xml`, and `check.sh`/`check.ps1` gate counts unchanged.
- **Token, Emoji & Path Hygiene**: Zero emojis anywhere, zero raw color literals outside `design-tokens.css`, no inline style objects, no `!important`, UTF-8 no BOM, LF endings, full Vietnamese diacritics in UI/VI sections, zero inline `cspell` ignores, and zero personal machine paths.
