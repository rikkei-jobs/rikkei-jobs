---
name: frontend-taste-anti-slop
description: Use when auditing, crafting, or polishing frontend copy, visual hierarchy, micro-interactions, layout restraint, or anti-slop discipline across Rikkei Jobs screens.
---

# Frontend Taste & Anti-Slop Discipline

## 1. Overview

This skill vendors and adapts the anti-slop frontend craft principles of `Leonxlnx/taste-skill` (`v2.5.1`) for the **Rikkei Jobs** enterprise competency-verified recruitment platform. Unlike greenfield marketing sites, Rikkei Jobs is a stateful React 19 + TypeScript application serving five authenticated roles (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`) across Airy and Dense workspace tiers.

### Naming Rationale

All existing frontend domain skills in this repository follow the kebab-case `frontend-<domain>` convention (`frontend-visual-design`, `frontend-motion-design`, `frontend-iconography`, `frontend-accessibility-audit`, `frontend-feature-slice`). The upstream identifier `design-taste-frontend` breaks that prefix convention, while `taste-skill` is ambiguous. Naming this skill `frontend-taste-anti-slop` aligns with the existing `frontend-*` family, prevents name collisions, and defines its distinct focus on anti-slop copy, surface restraint, and micro-interaction polish.

### Pinned Provenance & Precedence

- **Upstream Source**: `https://github.com/leonxlnx/taste-skill` (MIT License, Copyright (c) 2026 Leonxlnx), pinned at commit `f6b76575f949707b4e3c37cd86cb44b0b98643e8` (`2026-11-07T12:33:21Z`, version `2.5.1`). Full provenance, excluded upstream scripts/hooks/manifests, and the verbatim MIT License are preserved in [provenance-and-license.md](references/provenance-and-license.md).
- **Mandatory Precedence Order**:
  1. Enterprise Rules (`08-frontend-engineering.md`, `09-frontend-design-bar.md`)
  2. `docs/design/DESIGN_SYSTEM.md`, `--rj-*` design tokens, Role-Density specs, Motion Budgets, Showcase Motion Tier, and Owner-approved UIUX exceptions (including the `/login` radar auto-cycle)
  3. `docs/uiux/CONTENT.md` and `frontend/src/shared/i18n/enumLabels.ts`
  4. **`frontend-taste-anti-slop` (this skill)** — applies only where compatible with items 1–3.
- **Complete 17-Item Conflict Resolution Table**: See [conflict-table.md](references/conflict-table.md). Upstream installers, Stop hooks, Node gate scripts, CDN font loaders, stock icon fetchers, WebGL shaders, and marketing palette dealers are strictly excluded.

## 2. When to Use and When NOT to Use

### When to Use

- Auditing routed pages or new components for AI-generated visual or copy slop ("AI tells").
- Writing or reviewing Vietnamese/English UI headings, CTA labels, empty states, form errors, and card summaries.
- Polishing fine-pointer hover/press micro-interactions, box-nesting depth, image/SVG rendering integrity, and mobile (`375px`) overflow/target hygiene.
- Checking single visible `<h1>` hierarchy and authentic, non-invented content across screens.

### When NOT to Use

- Changing brand colors, typography families, or `--rj-*` design tokens -> Follow `docs/design/DESIGN_SYSTEM.md` and `frontend-visual-design`.
- Defining spring curves, View Transitions, or Showcase Tier budgets -> Follow `frontend-motion-design`.
- Creating SVG icons -> Follow `frontend-iconography` (`frontend/src/shared/components/Icon.tsx`).
- Performing full WCAG 2.2 AA focus-trap or contrast calculations -> Follow `frontend-accessibility-audit`.

## 3. Step-by-Step Process

### Step 1: Enforce Project Precedence Before Any Polish

1. Verify every proposed change against [conflict-table.md](references/conflict-table.md) so upstream marketing heuristics never override Rikkei Jobs rules:
   - Use only `--rj-*` semantic tokens from `frontend/src/shared/styles/design-tokens.css` (Confident Royal Cobalt & Iron Obsidian; never swap palettes or ban Mentor purple badges).
   - Keep self-hosted WOFF2 fonts (`Plus Jakarta Sans`, `Be Vietnam Pro`, `JetBrains Mono`) with `font-display: optional` and `line-height >= 1.5` (never load Google Fonts CDN).
   - Keep Showcase Motion Tier, `/login` `CompetencyRadarVisual` auto-cycle + explanatory caption, and `0.001ms` reduced-motion cross-fade intact.
   - Keep Dense mode (`36-38px` rows, `13-14px` body text) on `HR`, `STAFF`, and `ADMIN` tables while keeping Airy mode (`56px` rows, `>= 44px` controls) on `CANDIDATE` and `MENTOR` views.

### Step 2: Audit Copy for Anti-Slop Discipline & Honest Content

1. **Concrete Domain Language**: Replace vague marketing fluff, English buzzwords (`seamless`, `effortless`, `elevate`, `unlock`, `harness`, `cutting-edge`, `next-generation`), stock openings, and meta commentary ("This section shows...") with direct Vietnamese copy bearing full diacritics per `docs/uiux/CONTENT.md`.
2. **Verb + Object CTAs & Noun Headings**:
   - Ensure headings name real entities (e.g., `Hồ sơ năng lực`, `Phân tích khoảng thiếu hụt năng lực`) rather than bare imperatives or generic slogans.
   - Ensure buttons express a concrete verb + object (`Lưu hồ sơ`, `Cập nhật mục tiêu`, `Tìm việc phù hợp`), avoiding vague labels (`Tìm hiểu thêm`, `Khám phá ngay`).
   - Use consistent terminology per role via `frontend/src/shared/i18n/enumLabels.ts` (e.g., do not label `STAFF`/`MENTOR`/`ADMIN` IDs as student IDs).
3. **Zero Invented Proof or Filler**:
   - Never fabricate testimonials, partner counts, customer logos, or unbacked statistics (`3x faster`, `98% satisfied`).
   - Eliminate dead `href="#"` links, leftover sample tags, and unimplemented fake widgets; mark genuine roadmap items honestly with `Sắp ra mắt`.

### Step 3: Enforce Visual Restraint, Box Depth & Render Integrity

1. **Maximum Two Box Nesting Levels**: Keep container hierarchy shallow (page ground -> card -> inner panel at most). Avoid triple-nested bordered boxes, heavy resting drop shadows where tonal contrast suffices, or uncalibrated glassmorphism.
2. **One Moment Per Page & Section Rhythm**: Preserve one primary focal interaction or visual anchor per screen (e.g., `CompetencyRadarVisual` on `/login`, match breakdown on candidate home) without repeating identical card structures back-to-back.
3. **Every Visual Must Render**: Verify zero empty frames, zero broken `<img>` or `<svg>` elements, explicit `width`/`height` or `aspect-ratio` to maintain `CLS = 0`, and zero text baked into images.
4. **Caption Restraint**: Do not place explanatory captions under decorative logos or company marks (the `/login` `CompetencyRadarVisual` explanatory caption is an explicit Owner-approved WCAG 2.2.2 exception and must remain intact).

### Step 4: Calibrate Micro-Interactions & Pointer Precision

1. **Fine-Pointer Hover Guard**: Wrap hover-only lift or highlight transforms in `@media (hover: hover) and (pointer: fine)` so touch devices do not get stuck in hover states, and pair hover styles with keyboard `:focus-visible` parity.
2. **Tactile Press & Restraint**:
   - Interactive Airy cards may lift up to `translateY(-2px)` within `<= 150ms` (`--rj-duration-fast`); Dense operational cards/rows remain spatially static (background/border/opacity feedback only).
   - Buttons provide crisp `:active` feedback (`scale(0.985)` within `<= 100ms` `--rj-duration-micro`) without bounce, tilt, or layout reflow (`transform` and `opacity` only).
3. **No Arbitrary Scroll Fade-Ups on Dense Views**: Do not add scroll-triggered reveal fades to `HR`, `STAFF`, or `ADMIN` tables/rows; keep Showcase scroll reveals restricted to approved long candidate views with static fallback.

### Step 5: Verify Heading Hierarchy, Forms & 375px Mobile Hygiene

1. **Single Visible `<h1>`**: Confirm every routed page renders exactly one visible `<h1>` describing the page purpose, followed by sequential `<h2>`/`<h3>` levels without skipped heading tiers.
2. **Form Clarity & Mobile Input Sizing**: Ensure every form field has a visible `<label htmlFor>`, `aria-invalid`/`aria-describedby` error wiring, confirmation only after real API success, and `>= 16px` input font size on mobile where zoom prevention applies.
3. **375px Zero-Overflow & Touch Targets**: Verify across `375px`, `768px`, `1024px`, and `1440px` (Light & Dark modes) that `scrollWidth <= innerWidth` (`0px` sideways bleed), equal left/right content edges align cleanly, and interactive controls meet `>= 44x44px` on touch/Airy breakpoints.

## 4. Iron Laws

- **Law 1 (Project Precedence Wins)**: Whenever an upstream taste-skill rule conflicts with Enterprise Rules `08`/`09`, `docs/design/DESIGN_SYSTEM.md`, `docs/uiux/CONTENT.md`, or Owner-approved exceptions, the project rule wins unconditionally.
- **Law 2 (Honest Non-Invented Content)**: Never invent metrics, reviews, partner counts, customer names, or fake UI data to make a screen look fuller.
- **Law 3 (Every Visual Renders)**: Never ship empty visual containers, broken images, or unrendered frames; enforce explicit dimensions and `CLS = 0`.
- **Law 4 (No Upstream Executables or Network Calls)**: Never vendor, invoke, or document upstream Stop hooks, install scripts, CLI gate runners, or runtime CDN asset/font/photo fetchers.

## 5. Red Flags

- Replacing `--rj-*` tokens, `Be Vietnam Pro`, or `Plus Jakarta Sans` with external Google Fonts or upstream palettes.
- Adding `backdrop-filter` frosted glass, purple-blue gradients, WebGL shaders, or `100svh` marketing hero sections to dashboards.
- Missing `<h1>` on a routed page (or multiple competing `<h1>` tags).
- Triple-nested bordered card boxes or low-contrast muted gray body copy (`< 4.5:1`).
- Unbounded `href="#"` links, English AI buzzword clichés, or Vietnamese text stripped of diacritics.
- Sideways overflow at `375px` (`scrollWidth > innerWidth`) or interactive buttons below `44x44px` on mobile.

## 6. Rationalization Table

| Agent Rationalization | Engineering Reality |
|---|---|
| "The upstream skill bans scroll reveals and auto-cycles everywhere, so I should strip `/login` radar auto-cycle and candidate reveals." | Enterprise Rule `09` and `docs/design/DESIGN_SYSTEM.md` define an Owner-approved Showcase Motion Tier and `/login` WCAG 2.2.2 exception. Project rules outrank upstream heuristics. |
| "Adding a few sample company logos and a '98% match satisfaction' badge makes the dashboard feel richer." | Invented proof and unbacked figures are strictly forbidden by both this skill and `docs/uiux/CONTENT.md`. Real state or honest `Sắp ra mắt` badges are mandatory. |
| "Skipping `<h1>` on a sub-page is fine because the sidebar logo already has text." | Every routed page requires one visible `<h1>` landmark inside `<main>` for screen readers and heading-order checks. |
| "Upstream's `1440/1024/768/390` check passed, so `375px` is close enough." | Rikkei Jobs enforces `375px` mobile width (`15px` narrower than `390px`), plus `768px`, `1024px`, and `1440px`. Always test at `375px`. |

## 7. Verification Checklist

- [ ] Checked [conflict-table.md](references/conflict-table.md) before applying any upstream visual or copy rule.
- [ ] Every routed page has exactly one visible `<h1>` and sequential `<h2>`/`<h3>` hierarchy.
- [ ] Copy is authentic Vietnamese with full diacritics, verb + object CTAs, zero AI buzzwords, and zero invented claims.
- [ ] Role labels match `frontend/src/shared/i18n/enumLabels.ts` and never mislabel non-candidate roles.
- [ ] Box nesting is `<= 2` levels; every visual/image/SVG renders cleanly with `CLS = 0`.
- [ ] Hover animations use `@media (hover: hover) and (pointer: fine)` with `:focus-visible` parity and stay within Rule `09` motion budgets (`<= 150ms` micro, `0.001ms` reduced-motion fallback).
- [ ] Zero horizontal overflow (`scrollWidth <= innerWidth`) and `>= 44x44px` touch targets verified at `375px`, `768px`, `1024px`, and `1440px` in Light and Dark modes.
- [ ] Zero upstream hooks, scripts, or network fetch steps exist in the repository.

## 8. Rikkei Jobs Specifics

- Conflict resolution matrix: [references/conflict-table.md](references/conflict-table.md)
- Provenance and MIT License: [references/provenance-and-license.md](references/provenance-and-license.md)
- Authoritative design & content specs: `docs/design/DESIGN_SYSTEM.md`, `docs/uiux/CONTENT.md`
- Key frontend primitives: `frontend/src/shared/styles/design-tokens.css`, `frontend/src/shared/components/Icon.tsx`, `frontend/src/shared/components/BrandMark.tsx`, `frontend/src/shared/i18n/enumLabels.ts`
- Verification commands:

```bash
npm run lint --prefix frontend
npm run typecheck --prefix frontend
npm run test --prefix frontend
npm run build --prefix frontend
node scripts/compute-contrast.mjs
node scripts/validate-agent-config.mjs
```
