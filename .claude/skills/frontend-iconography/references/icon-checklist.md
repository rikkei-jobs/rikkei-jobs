# Rikkei Jobs Icon Quality & Compliance Checklist

Use this 10-step mechanical verification checklist before adding any icon to the Rikkei Jobs registry.

## 1. Domain Concept Integrity

- [ ] Represents a distinct, authentic concept in recruitment or vocational IT training.
- [ ] Does not duplicate existing icons in `frontend/src/shared/components/Icon/iconRegistry.ts`.

## 2. Canvas Geometry

- [ ] Root `<svg>` tag defines strictly `viewBox="0 0 24 24"`.
- [ ] No hardcoded `width` or `height` attributes present on the root `<svg>` tag.

## 3. Live Area Boundaries

- [ ] Artwork is strictly positioned within the 20x20px live area (`x="2"` to `x="22"`, `y="2"` to `y="22"`).
- [ ] 2px optical margin around the perimeter is preserved to avoid clipping on rounded caps.

## 4. Optical Center & Weight

- [ ] Visual weight is balanced around the optical center `(12, 12)`.
- [ ] Geometric shapes follow keyline guides (circle d=20, square 18x18, horizontal rect 20x16, vertical rect 16x20).

## 5. Unified Stroke Width

- [ ] All line segments strictly define `stroke-width="2"`.
- [ ] No mixed stroke thicknesses (e.g. 1px, 1.5px, or 1.75px) exist within the icon.

## 6. Stroke Endpoints and Joins

- [ ] All strokes define `stroke-linecap="round"`.
- [ ] All intersecting vertices define `stroke-linejoin="round"`.

## 7. Dynamic Color Inheritance

- [ ] Root `<svg>` specifies `stroke="currentColor"` and `fill="none"`.
- [ ] Zero hardcoded hex, rgb, hsl, or named color literals in `<path>`, `<circle>`, `<line>`, or `<rect>` tags.

## 8. SVG Sanitization & Hygiene

- [ ] Zero `<defs>`, `<style>`, `<clipPath>`, `<linearGradient>`, or `<filter>` tags.
- [ ] Zero `id`, `class`, or inline `style="..."` attributes.
- [ ] Zero vector editor metadata (Adobe Illustrator, Inkscape, Figma export tags).

## 9. TypeScript Type Safety

- [ ] Icon key registered in `IconName` string literal union type in `Icon.types.ts`.
- [ ] SVG path dictionary registered in `iconRegistry.ts`.

## 10. Accessibility Compliance

- [ ] When rendered without `aria-label`, `<Icon />` automatically receives `aria-hidden="true"`.
- [ ] When used inside an interactive button without visible text, parent `<button>` provides an `aria-label`.
