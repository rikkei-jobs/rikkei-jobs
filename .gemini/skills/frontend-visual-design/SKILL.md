---
name: frontend-visual-design
description: Use when styling frontend components, designing page layouts, defining design tokens, or ensuring UI conforms to the project design system and anti-AI look bar.
---

# Frontend Visual Design Standards & Anti-AI Bar

## 1. Overview

This skill establishes the production-grade visual design standards and strict Anti-AI Look Bar for the Rikkei Jobs platform. The application serves five distinct user personas across vocational training and job placement: Candidates (`CANDIDATE`), Employers (`HR`), Instructors (`MENTOR`), Operational Staff (`STAFF`), and Administrators (`ADMIN`).

Core design tenets:

- Implementation of semantic design tokens: Bespoke Confident Royal Cobalt & Iron Obsidian brand anchors (Core #0D55B8, Deep Hover #0A4596, Electric #508CEE, Brand Mark #C8161D), quarantined semantic error (#9B1C2A / #F1707A) with non-color cues, 5-level surface ladder in light mode (Canvas #EEF2F8, Panel #E1E8F2, Card #FFFFFF, Field #F8FAFD) and tonal elevation in dark mode (Canvas #0B1019, Panel #101724, Card #162030, Field #0D1420, Elevated #1E2C42), and mathematically calculated contrast ratios.
- Comprehensive Vietnamese typography support utilizing deliberate pairing (Plus Jakarta Sans + Be Vietnam Pro + JetBrains Mono), validated diacritics rendering, and tabular numeric alignment for skill metrics.
- Role Density segregation: Airy density for candidate discovery vs dense tabular density for administration and verification workflows.
- Asymmetrical 65/35 editorial layouts with deliberate visual rhythm, eliminating generic symmetrical AI slop templates.
- Rigorous Anti-AI Visual Review Rubric scored across six criteria (0 to 2 points each, requiring a minimum of 11/12 points for completion with Hard Veto on any 0 score).
- Concrete token reference tables: see [token-tables.md](references/token-tables.md).
- Scored Anti-AI Rubric checklist: see [anti-ai-rubric.md](references/anti-ai-rubric.md).
- Multi-breakpoint screenshot inspection protocol: see [screenshot-protocol.md](references/screenshot-protocol.md).

## 2. When to Use / When NOT to Use

### When to Use

- Styling new or existing React components, page templates, and navigation shells.
- Establishing or updating CSS custom properties (color roles, typography scales, elevation shadows, spatial rhythm).
- Implementing responsive adaptations across four standardized breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop), and 1440px (wide-screen).
- Performing pre-delivery visual design audits using the Anti-AI Scored Rubric.

### When NOT to Use

- Implementing micro-interactions, page route transitions, or spring physics -> Use `frontend-motion-design`.
- Designing geometric SVG paths or icon components -> Use `frontend-iconography`.
- Auditing keyboard tab order, focus restoration, or ARIA tree structure -> Use `frontend-accessibility-audit`.

## 3. Step-by-Step Process

### Step 1: Establish Persona Context & Role Density

1. Identify the target audience for the view:
   - **Candidate Views (`CANDIDATE`)**: Apply **Airy Density**. Use generous padding and margins (16px to 32px), spacious card padding (24px), row height 56px, touch targets >= 44px, clear visual hierarchy, and an encouraging, editorial atmosphere.
   - **Operational Views (`ADMIN`, `HR`, `STAFF`, `MENTOR`)**: Apply **Dense Density**. Use compact spacing (6px to 12px), condensed table rows (36px to 38px), right-aligned tabular numbers, and streamlined toolbars to maximize audit efficiency on large monitors.
2. Cross-reference density properties in [token-tables.md](references/token-tables.md).

### Step 2: Bind Bespoke Semantic Design Tokens & Calculate Contrast

1. Reference semantic tokens from `docs/design/DESIGN_SYSTEM.md` and [token-tables.md](references/token-tables.md):
   - Brand Primary: Confident Royal Cobalt (`#0D55B8` Core Light / `#0A4596` Deep Light / `#508CEE` Electric Dark) with dedicated Brand Mark (`#C8161D`).
   - Error State: Quarantined Danger (`#9B1C2A` Light / `#F1707A` Dark) with mandatory non-color cues (Icon alert-circle, border, text).
   - Light Surfaces: Background canvas `#EEF2F8`, hero panel `#E1E8F2`, card surface `#FFFFFF`, field inset `#F8FAFD`, primary text `#0B1A2C` (CR 17.5:1), secondary text `#25394E` (CR 11.2:1).
   - Dark Surfaces: Background canvas `#0B1019`, hero panel `#101724`, card surface `#162030`, field inset `#0D1420`, elevated `#1E2C42`, primary text `#EDF2F7` (CR 16.8:1), secondary text `#BACAD9` (CR 10.4:1).
2. Compute mathematical contrast ratios ($L_1 + 0.05) / (L_2 + 0.05)$:
   - Regular body text (< 18pt or < 14pt bold): minimum **4.5:1** contrast ratio against background.
   - Large headings (>= 18pt or >= 14pt bold) and essential UI controls: minimum **3.0:1** contrast ratio.
   - Never use low-contrast muted gray text failing the 4.5:1 threshold.

### Step 3: Configure Vietnamese Typography & Tabular Numerics

1. Rely on self-hosted fonts (Plus Jakarta Sans, Be Vietnam Pro, JetBrains Mono); never load remote Google Fonts CDN endpoints during runtime to maintain hermetic privacy and performance.
2. Verify complex Vietnamese tone marks and diacritics (`ắ`, `ằ`, `ặ`, `ể`, `ễ`, `ệ`, `ộ`, `ở`, `ỹ`, `đ`, `ệ`, `ổ`, `ự`, `ữ`, `ặ`) across all heading levels with `line-height >= 1.5` to prevent line-height clipping and font fallback glitches.
3. For all quantitative data (0-100 skill scores, salaries, student counters, timestamps), enforce tabular numeric rendering:

```css
font-variant-numeric: tabular-nums;
```

### Step 4: Construct Asymmetrical Layouts & Spatial Rhythm

1. Reject generic layouts: avoid centered hero blocks sitting above three identical rounded cards.
2. Build asymmetrical compositions pairing structured data tables with context panels or interactive previews using an editorial 65/35 ratio (8 primary columns / 4 sticky sidebar columns).
3. Constrain all spacing to the 4px base rhythm scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px, 64px.

### Step 5: Draft Authentic Production Copy

1. Replace all "Lorem ipsum", "Title here", or empty placeholder text with realistic domain terminology in Vietnamese and English.
2. Mirror authentic recruitment terminology (e.g., "Hồ sơ năng lực", "Khoảng thiếu hụt kỹ năng", "Assessment Form", "Matching Score").

### Step 6: Verify Multi-Breakpoint Responsiveness

1. Validate layouts at 375px (mobile portrait), 768px (tablet portrait), 1024px (desktop), and 1440px (wide canvas) following [screenshot-protocol.md](references/screenshot-protocol.md).
2. Ensure zero unwanted horizontal scrolling at 375px: assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.

### Step 7: Score Against the Anti-AI Review Rubric

Evaluate the view against the 6 criteria in [anti-ai-rubric.md](references/anti-ai-rubric.md). Each criterion is scored from 0 to 2.

- Passing threshold: **>= 11/12 points**.
- **Hard Veto Rule**: Any criterion receiving a score of 0 points results in an IMMEDIATE REJECTION of the delivery, regardless of overall score.

1. **Typography & Diacritics**: 0 = fallback fonts / clipped diacritics; 1 = functional font but loose hierarchy; 2 = deliberate font pairing, flawless Vietnamese diacritics, tabular numbers active.
2. **Layout Asymmetry & Density**: 0 = 3 symmetrical cards under centered hero / unhandled scroll; 1 = standard grid; 2 = purposeful 65/35 asymmetry with Airy vs Dense differentiation.
3. **Color & Contrast**: 0 = low contrast / purple-blue gradient clichés; 1 = passes 4.5:1 but generic palette; 2 = bespoke palette with computed WCAG 2.2 AA contrast in light and dark modes.
4. **Curated Iconography**: 0 = raw stock icons or emojis present; 1 = unified SVG but inconsistent weights; 2 = bespoke 24px icon system with 2px stroke and automatic a11y.
5. **Purposeful Motion**: 0 = bouncing gimmicks / blocking transitions; 1 = restrained but linear transitions; 2 = compositor-only, spring physics, 100ms cross-fade under reduced motion.
6. **Copywriting Authenticity**: 0 = placeholder slop or lorem ipsum; 1 = generic English tech terms; 2 = authentic Vietnamese/English professional domain language with signature elements.

## 4. Iron Laws

- **Law 1: Total Ban on Emojis.** Emojis are strictly forbidden in UI components, display text, docs-in-UI, test IDs, and form placeholder strings. Every visual glyph must be an SVG icon rendered through `<Icon />`.
- **Law 2: Prohibition of AI Clichés.** Purple-to-blue gradient heroes (`linear-gradient(135deg, #667eea, #764ba2)`), pervasive uncalibrated frosted glass styling, three identical rounded cards in a symmetrical row, and muted unreadable gray text are strictly forbidden.
- **Law 3: Mathematical Contrast Compliance.** Color contrast must be verified using exact relative luminance formulas meeting WCAG 2.2 AA standards (>= 4.5:1 text, >= 3.0:1 UI controls). Subjective visual estimation is never accepted.
- **Law 4: Hard Veto Compliance.** Deliveries with any 0 score on the Anti-AI Rubric are rejected immediately.

## 5. Red Flags

- Any presence of emoji characters in JSX code or CSS content.
- Unintentional horizontal overflow causing horizontal scrollbars on mobile display (375px).
- Gray secondary text failing the 4.5:1 contrast threshold.
- Diacritic accents on uppercase Vietnamese characters truncated by tight `line-height` or `overflow: hidden`.
- Anti-AI Scored Rubric tallying below 11 out of 12 points or containing any 0 score.

## 6. Rationalization Table

| Excuse | Technical Reality |
|---|---|
| "Adding an emoji to the button makes it friendlier and more engaging." | Emojis degrade enterprise credibility, signal low-effort AI generation, and vary wildly across client operating systems. Rikkei Jobs requires curated SVG iconography. |
| "Light gray text provides a sleek, modern, minimalist aesthetic." | Sub-4.5:1 contrast violates WCAG 2.2 AA and renders the application illegible for visually impaired users and under bright sunlight. Legibility precedes minimalism. |
| "A 3-card layout is standard and fastest to build." | Symmetrical 3-card grids are the hallmark of generic template generators. Professional enterprise engineering demands layouts adapted to information hierarchy. |

## 7. Verification Checklist

- [ ] Scan codebase to verify zero emoji glyphs: `grep -rnP "[\x{1F300}-\x{1F9FF}]" frontend/src/`.
- [ ] Mathematical contrast verified >= 4.5:1 for body copy and >= 3.0:1 for UI elements in both light and dark themes.
- [ ] Vietnamese tone marks render cleanly without clipping or font replacement across all headings.
- [ ] Responsive design verified clean across 375px, 768px, 1024px, and 1440px displays without horizontal scrollbars (`scrollWidth <= clientWidth`).
- [ ] Quantitative data columns utilize `font-variant-numeric: tabular-nums`.
- [ ] Anti-AI Scored Rubric achieves at least 11/12 points with zero 0 scores.

## 8. Rikkei Jobs Specifics

- Design system reference document: `docs/design/DESIGN_SYSTEM.md`.
- Token tables: [references/token-tables.md](references/token-tables.md).
- Anti-AI review rubric: [references/anti-ai-rubric.md](references/anti-ai-rubric.md).
- Screenshot review protocol: [references/screenshot-protocol.md](references/screenshot-protocol.md).
- Global stylesheet assets: `frontend/src/index.css`, `frontend/src/App.css`.
- Shared layout primitives: `frontend/src/shared/components/Header.tsx`, `ModuleCard.tsx`.
- Verification commands:

```bash
cd frontend
npm run lint
npm run build
```
