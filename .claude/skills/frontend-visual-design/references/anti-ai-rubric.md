# Rikkei Jobs Anti-AI Scored Rubric

This rubric evaluates user interfaces and components to eliminate generic AI-generated aesthetic patterns and ensure human craftsmanship and enterprise discipline.

---

## Scoring Methodology

- 6 Independent Criteria scored from 0 to 2 points each.
- Total maximum score: 12 points.
- Passing Threshold: >= 11/12 points.
- **Hard Veto Rule**: Any criterion receiving a score of 0 points results in an IMMEDIATE REJECTION of the pull request or delivery, regardless of the overall score.

---

## The 6 Criteria

### Criterion 1: Typography & Vietnamese Diacritics Support

- **0 Points (FAIL - HARD VETO)**: Missing fonts falling back to generic OS defaults; clipped Vietnamese stacked accents (e.g. ệ, ổ, ự, ữ, ặ); quantitative data lacks `tabular-nums`.
- **1 Point (ACCEPTABLE)**: Fonts render without clipping, but hierarchy is loose; mixed line heights; tabular numbers used intermittently.
- **2 Points (EXEMPLARY)**: Self-hosted Plus Jakarta Sans / Be Vietnam Pro / JetBrains Mono; deliberate vertical rhythm; `line-height >= 1.5` for body; 100% data metrics use `font-variant-numeric: tabular-nums`.

### Criterion 2: Layout Asymmetry & Role Density Differentiation

- **0 Points (FAIL - HARD VETO)**: Centered hero above 3 identical rounded cards; identical padding for candidate views and dense admin tables; unhandled horizontal spill.
- **1 Point (ACCEPTABLE)**: Standard responsive grid, but layout lacks editorial tension; uniform density across all user personas.
- **2 Points (EXEMPLARY)**: Purposeful 65/35 editorial grid layout (8 primary columns / 4 sticky sidebar columns); clear density differentiation (Airy 56px rows for candidates vs Dense 36px rows for admin matrices); responsive container queries.

### Criterion 3: Color Palette & Mathematical Contrast (WCAG 2.2 AA)

- **0 Points (FAIL - HARD VETO)**: Default Tailwind scale (slate/indigo/sky); unreadable gray body text (< 4.5:1); purple-to-blue gradient headers; lack of dark mode design.
- **1 Point (ACCEPTABLE)**: Meets 4.5:1 contrast, but palette lacks proprietary brand character; dark mode is a naive luminance inversion.
- **2 Points (EXEMPLARY)**: Proprietary Technical Iron Cobalt & Cyber Persimmon palette; 100% computed contrast ratios (text >= 4.5:1, UI >= 3.0:1); designed dark mode surfaces.

### Criterion 4: Curated Iconography & Asset Discipline

- **0 Points (FAIL - HARD VETO)**: Raw emojis used in UI; mixed icon libraries with conflicting stroke weights (1px mixed with 2.5px); direct Lucide/FontAwesome imports bypassing registry.
- **1 Point (ACCEPTABLE)**: Centralized `<Icon />` used, but some icons have sub-pixel blurring or inconsistent optical padding.
- **2 Points (EXEMPLARY)**: 100% of icons rendered through typed `<Icon name=... />`; strict 24px grid with uniform 2px stroke width and round caps; zero emojis anywhere.

### Criterion 5: Purposeful Motion & Restraint

- **0 Points (FAIL - HARD VETO)**: Bouncing gimmicks (@keyframes bounce); blocking transitions > 300ms delaying user clicks; missing `prefers-reduced-motion` overrides.
- **1 Point (ACCEPTABLE)**: Motion is restrained, but relies on linear transitions or lacks spring physics; reduced-motion simply disables motion abruptly.
- **2 Points (EXEMPLARY)**: Compositor-only properties (transform, opacity); physics-based springs; graceful 100ms cross-fade under `prefers-reduced-motion` with 0.001ms duration; zero layout shift (CLS = 0).

### Criterion 6: Authentic Copywriting & AI-Tell Avoidance

- **0 Points (FAIL - HARD VETO)**: Placeholder copy ("Lorem ipsum", "Title here", "Welcome to Rikkei Jobs"); excessive uncalibrated frosted glass (backdrop-filter: blur); saturated glowing drop shadows.
- **1 Point (ACCEPTABLE)**: Realistic text, but contains corporate fluff; clean flat surfaces without distinctive signature elements.
- **2 Points (EXEMPLARY)**: Authentic bilingual domain copy (e.g. "Khoang thieu hut ky nang", "Ho so nang luc", "Matching Score"); distinct signature elements (Skill Radar, Hexagonal Badge).

---

## Evaluation Summary Table

| Criterion | Points (0-2) | Pass/Fail Assessment | Notes / Evidence |
|---|---|---|---|
| C1. Typography & Diacritics | [0-2] | PASS / FAIL | |
| C2. Layout Asymmetry & Density | [0-2] | PASS / FAIL | |
| C3. Color & WCAG 2.2 Contrast | [0-2] | PASS / FAIL | |
| C4. Curated Iconography | [0-2] | PASS / FAIL | |
| C5. Purposeful Motion | [0-2] | PASS / FAIL | |
| C6. Authentic Copy & Anti-AI | [0-2] | PASS / FAIL | |
| **Total Score** | **/12** | **PASS (>=11) / FAIL** | **Hard Veto: Any 0 = REJECT** |
