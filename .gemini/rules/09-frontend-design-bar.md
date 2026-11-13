# 09 — Frontend Design Bar and Anti-AI Visual Standards

## 1. Core Principles

Deliver human-crafted, distinctive, enterprise-grade user interfaces that reflect professional craftsmanship.
Eliminate all visual tropes and aesthetic patterns typical of generic AI-generated web templates.
Implement design tokens, typography, and motion calibrated specifically for the Rikkei Jobs platform.

## 2. Forbidden Visual Patterns (Anti-AI Prohibitions)

Strictly forbid the following patterns across all frontend components and stylesheets:

- FORBIDDEN Emojis in UI: Never use emojis as icons, avatars, status badges, section headers, or button labels. Emojis render inconsistently across operating systems and degrade enterprise credibility.
- FORBIDDEN Raw Stock Icon Packs: Never drop default Lucide, Heroicons, or FontAwesome SVG sets directly into pages without design alignment.
- FORBIDDEN Generic AI Visual Tropes:
  - Purple-to-blue gradient headers (`linear-gradient(135deg, #6366f1, #a855f7)`).
  - Frosted glass effects, heavily blurred backdrops, and uncontrolled `backdrop-filter: blur()`.
  - Symmetrical 3-column rounded card grids with exaggerated hover scales.
  - Heavy, saturated, glowing drop shadows (`box-shadow: 0 0 25px #000000`).
  - Default Tailwind/Material color scales (slate/indigo/sky); UI must use proprietary Technical Iron Cobalt & Cyber Persimmon palette.
- FORBIDDEN Motion Gimmicks:
  - Bouncing, jiggling, shaking animations (`@keyframes bounce`).
  - Arbitrary full-page fade-in-up transitions that disrupt reading flow.
  - Exceeding purpose-calibrated motion budgets or blocking user interaction.

## 3. Required Design System Standards

Adhere strictly to the design specifications in `docs/design/DESIGN_SYSTEM.md`:

- Curated Icon System: Implement a unified `<Icon name=... />` component based on a strict 24px grid (`viewBox="0 0 24 24"`), unified 2px stroke width (`stroke-width="2"`), rounded caps and joins (`stroke-linecap="round"`, `stroke-linejoin="round"`), `stroke="currentColor"`, `fill="none"`, zero emojis, and proper accessibility tagging (`aria-hidden="true"` or accessible `aria-label`).
- Deliberate Tripartite Typography:
  - Display & Section Headers: Plus Jakarta Sans (SIL OFL 1.1).
  - Body Copy & General UI: Be Vietnam Pro (SIL OFL 1.1).
  - Code & Data Tables: JetBrains Mono (SIL OFL 1.1).
  - Ensure zero diacritic clipping for stacked Vietnamese accents (bounding box up to +1050 UPM vs +700 cap height) by enforcing `line-height >= 1.5` and vertical padding >= 8px. Use self-hosted WOFF2 fonts with `tabular-nums` enabled for all quantitative metrics.
- Role-Density Differentiation:
  - Candidate Views: Airy Mode (spacious 56px row height, focused on readable progression and portfolio showcases).
  - Administrative Views (HR, Staff, Admin): Dense Mode (high information density, compact 36-38px table rows, precise filters, and efficient data entry matrices).
- Purpose-Based Motion Budgets:
  - Micro-interactions (hover, press, toggle, focus): <= 150ms (easing: ease-out).
  - Tooltip & Popover reveals: <= 200ms.
  - Contextual & Dialog (modals, drawers, accordion expansions): <= 300ms.
  - Route & Page Transitions (View Transitions API, hero block reveals): <= 400ms.
  - SVG Stroke Draw & Data-Viz Reveals: <= 600ms.
  - Admin Data-Dense Surfaces: <= 150ms (strict motion restraint; instant or rapid feedback).
  - Accessibility Requirement: Always wrap animations in `@media (prefers-reduced-motion: reduce)` with a gentle 100ms cross-fade and 0.001ms duration override. Support user pause/stop controls for any loop > 5s (WCAG 2.2.2).

## 4. Scored Anti-AI Review Rubric (Harmonized with Milestone 1)

Evaluate every page, view, and component against this 12-point rubric (6 independent criteria scored 0 to 2 points each). A score of 11/12 or higher is required for approval:

1. Criterion 1: Typography & Vietnamese Diacritics Support (0-2): Self-hosted Plus Jakarta Sans / Be Vietnam Pro / JetBrains Mono; deliberate vertical rhythm; `line-height >= 1.5` for body; zero accent clipping; 100% data metrics use `font-variant-numeric: tabular-nums`.
2. Criterion 2: Layout Asymmetry & Role Density Differentiation (0-2): Purposeful 65/35 editorial grid layout (8 primary columns / 4 sticky sidebar columns); clear density differentiation (Airy 56px rows for candidates vs Dense 36px rows for admin matrices); responsive container queries; zero horizontal overflow.
3. Criterion 3: Color Palette & Mathematical Contrast (WCAG 2.2 AA) (0-2): Proprietary Technical Iron Cobalt & Cyber Persimmon palette; 100% computed contrast ratios (text >= 4.5:1, UI >= 3.0:1); designed dark mode surfaces.
4. Criterion 4: Curated Iconography & Asset Discipline (0-2): 100% of icons rendered through typed `<Icon name=... />`; strict 24px grid with uniform 2px stroke width and round caps; zero emojis anywhere.
5. Criterion 5: Purposeful Motion & Restraint (0-2): Compositor-only properties (transform, opacity); physics-based springs; calibrated motion budgets; graceful 100ms cross-fade under `prefers-reduced-motion` with 0.001ms duration; zero layout shift (CLS = 0).
6. Criterion 6: Authentic Copywriting & AI-Tell Avoidance (0-2): Authentic bilingual domain copy (e.g., "Khoảng thiếu hụt kỹ năng", "Hồ sơ năng lực", "Matching Score"); distinct signature elements (Skill Radar, Hexagonal Badge); absence of placeholder fluff.

**Hard Veto Rule**: Any criterion receiving a score of 0 points results in an IMMEDIATE REJECTION of the pull request or delivery, regardless of the overall score.

## 5. Verification Commands

Verify visual styling and design token compliance:

```bash
# Verify component formatting and style rules
npm run lint --prefix frontend

# Verify production build asset bundling
npm run build --prefix frontend
```
