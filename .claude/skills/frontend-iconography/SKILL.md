---
name: frontend-iconography
description: Use when adding, curating, or rendering SVG icons, designing the unified icon system, or ensuring icon accessibility in the frontend.
---

# Frontend Iconography System & Accessibility

## 1. Overview

The Rikkei Jobs icon system establishes a unified, bespoke, and optically coherent iconography language compliant with the Anti-AI Look Bar. In contrast to haphazardly mixed third-party libraries (such as arbitrary default Lucide, Heroicons, or FontAwesome sets with inconsistent stroke weights and mismatched geometric styles), Rikkei Jobs enforces a single curated SVG icon registry.

Architectural highlights:

- Strict geometric alignment to a 24x24 pixel grid canvas (`viewBox="0 0 24 24"`), featuring a 20x20 pixel active live drawing area and 2px optical padding margins. See [icon-grid-template.svg](references/icon-grid-template.svg).
- Harmonized line geometry: uniform stroke thickness (`stroke-width="2"`), rounded endpoints (`stroke-linecap="round"`), and smooth joins (`stroke-linejoin="round"`).
- Dynamic theming via `stroke="currentColor"`, inheriting typography colors across hover states and light/dark modes.
- Centralized component abstraction via `<Icon name=... />` with strict TypeScript string literal union keys and zero runtime bundle bloat.
- Built-in accessibility semantics: automatic injection of `aria-hidden="true"` on decorative icons and mandatory `aria-label` enforcement for interactive icon-only buttons.
- Comprehensive 10-step mechanical verification checklist: see [icon-checklist.md](references/icon-checklist.md).
- Curated core starter set of 14 SVG icons located in [references/icons/](references/icons/).

## 2. When to Use / When NOT to Use

### When to Use

- Adding new curated icons representing recruitment and training domain concepts into the application icon registry.
- Rendering icons within components, buttons, navigation bars, table cells, or status badges.
- Standardizing SVG attributes, sizing props (16px, 20px, 24px, 32px), or color inheritance.
- Auditing and remediating icon accessibility labels for assistive technologies and screen readers.

### When NOT to Use

- Displaying large illustrative graphics, marketing banners, or empty-state feature illustrations -> Use dedicated illustration assets.
- Animating SVG micro-interactions or path morphing -> Use `frontend-motion-design`.
- Configuring typography, colors, or page layouts -> Use `frontend-visual-design`.

## 3. Step-by-Step Process

### Step 1: Verify Domain Concept & Prevent Icon Duplication

- Check the existing registry in `frontend/src/shared/components/Icon/iconRegistry.ts` before creating a new icon.
- Cross-reference with the 14 starter core icons in [references/icons/](references/icons/).
- Confirm the icon represents a distinct business concept (e.g., `briefcase` for jobs, `badge-check` for verified skills, `calendar` for interview schedules, `building` for enterprise employers).

### Step 2: Construct Standardized 24px SVG Geometry

- Build upon the geometry defined in [icon-grid-template.svg](references/icon-grid-template.svg).
- Ensure the root canvas is strictly:

```xml
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
```

- Center the artwork within the inner 20x20px live area, reserving a 2px outer margin for optical balancing across varying shapes (circles vs squares vs rectangles).
- Sanitize raw SVG paths: strip all XML metadata, `<defs>`, embedded styles, unique `id` attributes, hardcoded dimensions (`width`/`height`), and explicit fill/stroke colors.

### Step 3: Register Strongly Typed Icon Keys

- Define the icon name within the TypeScript string literal union in `frontend/src/shared/components/Icon/Icon.types.ts`:

```typescript
export type IconName =
  | 'search'
  | 'briefcase'
  | 'user'
  | 'building'
  | 'badge-check'
  | 'calendar'
  | 'bell'
  | 'upload'
  | 'check'
  | 'alert-circle'
  | 'arrow-right'
  | 'filter'
  | 'menu'
  | 'x';
```

### Step 4: Implement the `<Icon />` Component Architecture

- Structure the core component with strict prop contracts:

```typescript
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: 16 | 20 | 24 | 32;
  className?: string;
  'aria-label'?: string;
}
```

- Default `size` to 24px (`width={size || 24} height={size || 24}`).
- Bind `stroke="currentColor"` to inherit parent typographic styling across all states.

### Step 5: Enforce Screen Reader Accessibility Rules

- **Decorative Icons (Accompanying Visible Text)**: When no `aria-label` is provided, automatically inject `aria-hidden="true"` so screen readers ignore the decorative graphic.
- **Standalone Semantic Icons**: When an `aria-label` is provided, render `role="img"` and `aria-label={label}`.
- **Icon-Only Interactive Buttons**: When rendering an icon inside a button without visible text, the parent `<button>` element MUST include an explicit `aria-label="Action description"` or encapsulate an `<span className="sr-only">Action description</span>` helper.

### Step 6: Automated Vitest Suite

- Author tests in `frontend/src/shared/components/Icon/Icon.test.tsx`.
- Verify correct SVG path lookup by `name`.
- Verify accurate dimension binding for `size` props (16, 20, 24, 32).
- Verify `aria-hidden="true"` is rendered when `aria-label` is absent.
- Verify `role="img"` and `aria-label` are present when `aria-label` is provided.

## 4. Iron Laws

- **Law 1: All Icons Must Use `<Icon name=... />`.** Direct inline embedding of raw `<svg>` blocks inside business feature slices is strictly forbidden. All iconography must be centralized through the unified component.
- **Law 2: Universal 24px Grid & 2px Stroke Consistency.** All icons must be authored on a `viewBox="0 0 24 24"` grid with uniform `stroke-width="2"` and `stroke="currentColor"`. Hardcoded hex, rgb, or hsl color values in SVG paths are strictly prohibited.
- **Law 3: Mandatory Accessible Names for Icon Buttons.** Every interactive button containing only an icon without accompanying text must provide an accessible name via `aria-label` or visually hidden text.

## 5. Red Flags

- Mixing multiple icon libraries with conflicting stroke weights (e.g., 1px hairline or 1.75px next to 2px strokes).
- Hardcoding fill or stroke colors like `stroke="#000000"`, causing icons to disappear in Dark Mode.
- Copying lengthy multi-path SVG markup directly into feature page components.
- Omitting `aria-hidden="true"` on decorative icons positioned adjacent to text labels.
- Icon-only action buttons rendering an empty DOM label, rendering them unreadable by screen readers.

## 6. Rationalization Table

| Excuse | Technical Reality |
|---|---|
| "Installing `lucide-react` or `react-icons` directly saves time compared to maintaining a registry." | Direct third-party imports lead to bundle size inflation, styling inconsistencies, and break the cohesive Anti-AI visual identity of Rikkei Jobs. |
| "This icon is purely decorative, so accessibility properties do not matter." | Decorative icons without `aria-hidden="true"` cause screen readers to announce meaningless raw SVG coordinates or path tokens, creating auditory clutter for visually impaired users. |
| "Hardcoding `#132F52` ensures the brand color stays consistent everywhere." | Hardcoded colors break theme flexibility, failing when components invert into Dark Mode or render on active navigation states. |

## 7. Verification Checklist

- [ ] 100% of icons render through the `<Icon name="..." />` component.
- [ ] All icon vectors use `viewBox="0 0 24 24"`, `stroke-width="2"`, and `stroke="currentColor"`.
- [ ] No hardcoded color strings exist within SVG paths.
- [ ] Every icon-only button contains a descriptive `aria-label`.
- [ ] 10-step mechanical checklist in [icon-checklist.md](references/icon-checklist.md) passes.
- [ ] Vitest test suite (`frontend/src/shared/components/Icon/Icon.test.tsx`) passes cleanly.

## 8. Rikkei Jobs Specifics

- Component implementation: `frontend/src/shared/components/Icon/Icon.tsx`.
- Component contracts: `frontend/src/shared/components/Icon/Icon.types.ts`.
- Icon registry dictionary: `frontend/src/shared/components/Icon/iconRegistry.ts`.
- Supporting specifications:
  - Grid template: [references/icon-grid-template.svg](references/icon-grid-template.svg).
  - Compliance checklist: [references/icon-checklist.md](references/icon-checklist.md).
  - Core starter SVGs: [references/icons/](references/icons/).
- Test suite: `frontend/src/shared/components/Icon/Icon.test.tsx`.
- Verification commands:

```bash
cd frontend
npm run test
npm run typecheck
```
