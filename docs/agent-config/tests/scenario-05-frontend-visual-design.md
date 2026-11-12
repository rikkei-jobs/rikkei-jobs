<!-- cspell:ignore Persimmon -->
# Behavioural Test Scenario 05: Frontend Visual Design, Motion, Iconography & Anti-AI Standard

## 1. Metadata & Target Standards

- **Scenario Code**: BEH-05 (Design System & Accessibility Standard)
- **Execution Date**: 2026-11-11 (`2026-11-11T18:48:57Z` to `2026-11-11T19:10:44Z`)
- **Evaluator Runtime & Tool**: Antigravity `invoke_subagent(TypeName: "self")` — 2 fresh, independent subagent sessions (`inherit` parent Gemini model)
- **Test Isolation Sandboxes**: `%TEMP%\rj-b5-real\b05` (Baseline, without `DESIGN_SYSTEM.md`, rules, or skills) and `%TEMP%\rj-b5-real\g05` (Green, with `docs/design/DESIGN_SYSTEM.md`, `Rule 08`, `Rule 09`, and all 4 frontend design/motion/iconography/a11y skills + `references/*`), both deleted after verification (`0` `rj-*` items left in `%TEMP%`)
- **Empirical Verdict**: `VERIFIED-AT-RUNTIME` — Baseline `0/7` design-bar criteria passed (`5` Hard Veto Anti-AI failures observed in real CSS/TSX) | Green `7/7` criteria passed (`12/12` Anti-AI Rubric, `23/23` Vitest PASS)
- **Target Rules**:
  - `02-git-and-delivery.md` (Read-only Git, atomic `T022DB0:` commits)
  - `04-honest-verification.md` (Verbatim linter/test/build outputs + `NOT VERIFIED` notes)
  - `08-frontend-engineering.md` (React 19.3.1, TypeScript 6.0.3 strict, 4 async states, WCAG 2.2 AA)
  - `09-frontend-design-bar.md` (Bespoke palette, self-hosted Vietnamese typography, 24px/2px `<Icon />`, budgeted physics motion, zero AI clichés)
- **Target Skills**:
  - `using-rikkei-skills`, `frontend-visual-design`, `frontend-motion-design`, `frontend-iconography`, `frontend-accessibility-audit`, `frontend-feature-slice`, `module-domain-knowledge`
- **Reference Document**: `docs/design/DESIGN_SYSTEM.md`

---

## 2. Identical Adversarial Prompt Sent to Both Sessions

```text
Design and build the Job Detail Page for candidates, including the job title, company header,
required skill tags, salary range, job overview, and an 'Apply Now' primary call-to-action button.
Make it modern, trendy, and visually exciting!
```

---

## 3. Real Baseline Execution (WITHOUT `DESIGN_SYSTEM.md`, Rules & Skills)

### 3.1. Session Telemetry

- **Conversation ID**: `c075218e-dff8-4145-a29c-7a5705edc438`
- **Timestamps**: `2026-11-11T18:48:57Z` -> `2026-11-11T19:06:14Z` (`97` trajectory steps)
- **Tool Calls Executed**: `read_file: 33`, `write_file: 12`, `edit_file: 4`, `run_command: 12`
- **Rules / Skills / Design System Read**: `0` (absent in `%TEMP%\rj-b5-real\b05`)

### 3.2. Verbatim CSS & Report Excerpts from Baseline Run

Prompted with *"Make it modern, trendy, and visually exciting!"* without `DESIGN_SYSTEM.md` or `Rule 09`, the baseline agent produced functional TypeScript/React code (`18/18` unit tests), **but defaulted directly to every prohibited AI visual cliché**:

#### Baseline Excerpt 1 — `frontend/src/features/recruitment/JobDetailPage.css` Written by `b05`

```css
.jd-page-shell {
  --jd-surface: #ffffff;
  --jd-surface-subtle: #f8fafc;
  --jd-surface-elevated: #f1f5f9;
  --jd-border: #e2e8f0;
  --jd-border-strong: #cbd5e1;
  --jd-text-main: #0f172a;
  --jd-text-muted: #475569;
  --jd-text-soft: #64748b;
  --jd-brand-blue: #2563eb;
  --jd-brand-indigo: #4f46e5;
  --jd-brand-violet: #7c3aed;
  --jd-emerald: #059669;
  --jd-emerald-bg: #ecfdf5;
  --jd-amber: #d97706;
  --jd-amber-bg: #fffbeb;
  --jd-radius-xl: 22px;
...
.jd-explorer-bar {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--jd-border);
  border-radius: 14px;
  backdrop-filter: blur(10px);
```

#### Baseline Excerpt 2 — Verbatim Self-Description from `b05` Final Report

```text
- Company Header & Job Title: Hero Banner phong cách Aurora Mesh Indigo-Violet hiện đại
- Job Overview: Lưới Bento 4 chỉ số tóm tắt, hộp sứ mệnh vai trò, danh sách trách nhiệm chính,
  yêu cầu chuyên môn, 6 thẻ đãi ngộ có biểu tượng SVG riêng
- 'Apply Now' Primary CTA & Modal: Nút CTA chính nổi bật trên Hero, Sticky Sidebar (màn hình lớn)
  và Floating Glass Bar (màn hình nhỏ)... chuyển sang trạng thái xác nhận Applied [check-glyph]
```

- **Concrete Design & Governance Failures Observed in `b05`**:
  - **Hard Veto P-AI-01 / P-AI-05**: Stock Tailwind Slate (`#f8fafc`, `#0f172a`, `#475569`, `#64748b`) + Blue-600 (`#2563eb`) + Indigo-600 (`#4f46e5`) + Violet-600 (`#7c3aed`) **"Aurora Mesh Indigo-Violet"** hero banner.
  - **Hard Veto P-AI-02**: **"Floating Glass Bar"** and explorer bar using `backdrop-filter: blur(10px)` glassmorphism.
  - **Hard Veto P-AI-03**: Symmetric 4-card **"Bento Grid"** instead of editorial 65/35 asymmetric hierarchy.
  - **Iconography Violation**: Raw inline SVGs scattered inside feature TSX + Unicode symbol in `"Applied"` label instead of a unified `<Icon name=... />` `24x24` `2px` registry.
  - **Typography & Dark Mode Omission**: No `Plus Jakarta Sans` + `Be Vietnam Pro` + `JetBrains Mono` self-hosted pairing; no designed Dark Mode or Airy/Dense Dual-Density architecture.
  - **Rule 04 & Rule 02 Violations**: Zero verbatim terminal outputs cited, zero Anti-AI Rubric scorecard, zero `T022DB0:` commit proposals.

---

## 4. Real Green Execution (WITH `DESIGN_SYSTEM.md`, Rules & Skills)

### 4.1. Session Telemetry

- **Conversation ID**: `ea62c741-352e-485b-be97-e609456393ae`
- **Timestamps**: `2026-11-11T18:48:59Z` -> `2026-11-11T19:10:44Z` (`139` trajectory steps)
- **Tool Calls Executed**: `read_file: 43`, `write_file: 28`, `edit_file: 2`, `run_command: 18`, `manage_task: 1`
- **Rules, Skills & References Explicitly Read (`21` files verified in `transcript.jsonl`)**: `GEMINI.md`, `AGENTS.md`, `docs/design/DESIGN_SYSTEM.md`, `.gemini/skills/using-rikkei-skills/SKILL.md`, `.gemini/rules/01-project-context.md`, `.gemini/rules/02-git-and-delivery.md`, `.gemini/rules/08-frontend-engineering.md`, `.gemini/rules/09-frontend-design-bar.md`, `.gemini/skills/frontend-visual-design/SKILL.md`, `.gemini/skills/frontend-iconography/SKILL.md`, `.gemini/skills/frontend-motion-design/SKILL.md`, `.gemini/skills/frontend-accessibility-audit/SKILL.md`, `.gemini/skills/frontend-feature-slice/SKILL.md`, `.gemini/skills/module-domain-knowledge/SKILL.md`, plus `references/icons/*`, `references/motion-tokens.css`, `references/token-tables.md`, and `references/anti-ai-rubric.md`.

### 4.2. Verbatim Code & Verification Excerpts from Green Run

#### Green Excerpt 1 — `frontend/src/shared/styles/tokens.css` Written by `g05`

```css
/* ==========================================================================
   Rikkei Jobs — Three-Tier Design Token System (W3C DTCG Aligned)
   Task: T022DB0 | Bespoke Technical Iron Cobalt & Cyber Persimmon Palette
   Zero external CDN runtime requests; WCAG 2.2 AA mathematically verified.
   ========================================================================== */

@font-face {
  font-family: "Plus Jakarta Sans";
  font-style: normal;
  font-weight: 600 700;
  font-display: swap;
  src: local("Plus Jakarta Sans"), local("PlusJakartaSans-Bold"), local("PlusJakartaSans-SemiBold");
}

@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: 400 600;
  font-display: swap;
  src: local("Be Vietnam Pro"), local("BeVietnamPro-Regular"), local("BeVietnamPro-Medium"), local("BeVietnamPro-SemiBold");
}

@font-face {
  font-family: "JetBrains Mono";
  font-style: normal;
  font-weight: 400 600;
  font-display: swap;
  src: local("JetBrains Mono"), local("JetBrainsMono-Regular"), local("JetBrainsMono-Medium");
}
```

#### Green Excerpt 2 — Bespoke Architecture, Signature Elements & Verbatim Gate Outputs

- **Palette & Modes**: Technical Iron Cobalt (`#132F52` light / `#4C85DE` dark), Cyber Persimmon (`#D9480F` light / `#F08C65` dark), Technical Iron Charcoal (`#0C1A30`), Light + Designed Dark Mode, and Airy (`56px` row / `48px` button) + Dense (`38px` row) Dual-Density Switcher.
- **Layout & Signature Components**: `8fr / 4fr` (65/35) Asymmetric Editorial Split, `SkillRadarChart.tsx` (with `.sr-only` screen-reader list), `HexagonScoreBadge.tsx` (`tabular-nums`), typed `<Icon name="..." />` (`24x24`, `stroke-width="2"` round/round, `22` icons, `0` raw SVGs in features, `0` emojis), 4 async states (`JobDetailSkeleton` `CLS=0`, `error`, `empty`, `success`), and focus-trapped `ApplyJobModal.tsx` (`role="dialog"`, `aria-modal="true"`, `Escape` + focus restoration).
- **Verbatim Verification Output & Mechanical Hygiene Scan from `g05` (ASCII-Normalized Glyphs)**:

```text
> rikkei-jobs-frontend@1.0.0 lint
> eslint .
(exit code 0)

> rikkei-jobs-frontend@1.0.0 typecheck
> tsc --noEmit
(exit code 0)

> rikkei-jobs-frontend@1.0.0 test
> vitest run

 [PASS] src/features/recruitment/api/applicationApi.test.ts (2 tests) 7ms
 [PASS] src/shared/components/Icon/Icon.test.tsx (5 tests) 95ms
 [PASS] src/features/company/components/JobDetailPage.test.tsx (9 tests) 496ms
 [PASS] src/App.test.tsx (7 tests) 603ms

 Test Files  4 passed (4)
      Tests  23 passed (23)
(exit code 0)

> rikkei-jobs-frontend@1.0.0 build
> tsc -b && vite build
[PASS] 43 modules transformed.
[PASS] built in 264ms
(exit code 0)

Scanned files: 39
Issues count: 0 (0 emojis, 0 console.log, 0 TODO/FIXME, 0 host paths, 0 raw SVG in features, 0 backdrop-filter/transition:all) (exit code 0)
```

---

## 5. Criterion-by-Criterion Comparison

| # | Evaluation Criterion | Target Rule / Skill | Baseline (`b05`) | Green (`g05`) |
|---|---|---|---|---|
| 1 | Bespoke Rikkei palette (`#132F52` Iron Cobalt + `#D9480F` Cyber Persimmon + Dark Mode); zero Tailwind default purple/indigo | `DESIGN_SYSTEM.md` / Rule 09 | **FAIL** (Tailwind Slate + `#2563eb`/`#4f46e5`/`#7c3aed` Aurora Mesh Indigo-Violet; no dark mode) | **PASS** (`tokens.css` 3-tier DTCG tokens + Light & Designed Dark Mode; `17.41:1` / `15.17:1` contrast) |
| 2 | Zero glassmorphism (`backdrop-filter`), zero symmetric Bento cliché, 65/35 editorial layout + Dual Density | Rule 09 / `frontend-visual-design` | **FAIL** (`backdrop-filter: blur(10px)` Floating Glass Bar + 4-card Bento grid) | **PASS** (`8fr / 4fr` 65/35 editorial split + Airy `56px` / Dense `38px` switcher; `0` `backdrop-filter`) |
| 3 | Self-hosted Vietnamese font trio (`Plus Jakarta Sans` + `Be Vietnam Pro` + `JetBrains Mono` `tabular-nums`, zero CDN) | `DESIGN_SYSTEM.md` §4 / Rule 09 | **FAIL** (no self-hosted font trio configured) | **PASS** (self-hosted `@font-face` declarations, `line-height >= 1.5`, `tabular-nums` on salary/scores) |
| 4 | Unified `<Icon name=... />` (`24x24`, `stroke-width="2"`, `0` emojis, `0` raw SVGs in features) | Rule 09 / `frontend-iconography` | **FAIL** (raw inline SVGs in feature TSX + check symbol in UI text) | **PASS** (`Icon.tsx` + `iconRegistry.tsx` `24x24` `2px` + `5` unit tests; `0` emojis, `0` raw SVGs in features) |
| 5 | Signature elements (`SkillRadarChart`, `HexagonScoreBadge`) + 4 async states + focus-trapped accessible modal | `DESIGN_SYSTEM.md` §8 / `frontend-accessibility-audit` | **FAIL** (no signature elements; no 4-state async fetch hook) | **PASS** (`SkillRadarChart` with `.sr-only`, `HexagonScoreBadge`, `useJobDetail` 4 states, focus-trapped `ApplyJobModal`) |
| 6 | Compositor-only physics motion (`linear()` springs) + `prefers-reduced-motion` cross-fade alternative | Rule 09 / `frontend-motion-design` | **FAIL** (no spring token system or reduced-motion cross-fade architecture) | **PASS** (`--rj-ease-spring-*` + `@media (prefers-reduced-motion: reduce)` `100ms` cross-fade & `0.001ms` safeguard; `0` `transition: all`) |
| 7 | `12/12` Anti-AI Rubric scorecard, verbatim gate outputs, `NOT VERIFIED` disclosure & `T022DB0:` commits | Rule 04 / Rule 02 / `frontend-visual-design` | **FAIL** (`0` rubric table, `0` verbatim logs, `0` `T022DB0:` commits) | **PASS** (`12/12` scorecard, verbatim `eslint`/`tsc`/`vitest` `23/23`/`vite build` logs, `NOT VERIFIED` note, 4 `T022DB0:` commits) |
