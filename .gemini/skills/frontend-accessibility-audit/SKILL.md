---
name: frontend-accessibility-audit
description: Use when auditing, verifying, or remediating web accessibility (a11y) to meet WCAG 2.2 AA standards in the frontend application.
---

# Frontend Accessibility (a11y) Audit & WCAG 2.2 AA Compliance

## 1. Overview

This skill establishes the engineering and verification methodology for ensuring web accessibility across the Rikkei Jobs platform in compliance with **WCAG 2.2 Level AA** standards. As a career development and vocational training system, Rikkei Jobs must guarantee equal, unimpeded access for all candidates and staff, including keyboard-only users, individuals with low vision, and assistive screen reader users.

Key auditing pillars:

- Mathematical color contrast validation ($L_1 + 0.05) / (L_2 + 0.05)$ for text and interface components in both light (`#F7F9FC` canvas) and dark (`#0A111E` canvas) themes.
- Touch target sizing meeting the 44x44 pixel minimum requirement for touch interfaces (WCAG 2.2 SC 2.5.8).
- Comprehensive keyboard operability with logical focus order and prominent focus indicators (`outline: 2px solid var(--rj-color-focus-ring); outline-offset: 2px;`).
- Robust focus trapping and focus restoration for modal dialogs and slide-over drawers.
- Semantic HTML5 document landmarks, proper heading hierarchy, and programmatic form labels.
- Structured verification checklist: see [a11y-checklist.md](references/a11y-checklist.md).

## 2. When to Use / When NOT to Use

### When to Use

- Auditing new or refactored UI views, forms, or navigation components prior to submitting a handoff.
- Authoring or reviewing modal dialogs, drawers, popovers, and disclosure widgets.
- Remediating color contrast failures, missing keyboard focus rings, or unreachable interactive elements.
- Verifying screen reader accessibility, error announcements, and form field relationships.

### When NOT to Use

- Optimizing GPU compositor frame rates or layout performance -> Use `frontend-motion-design`.
- Curating SVG stroke weights or icon registries -> Use `frontend-iconography`.
- Writing server state fetch hooks or pagination logic -> Use `frontend-feature-slice`.

## 3. Step-by-Step Process

### Step 1: Semantic Structure & Landmark Audit

- Verify appropriate HTML5 landmark elements: `<header>`, `<nav>`, `<main>`, `<aside>`, and `<footer>`.
- Validate heading hierarchy: ensure exactly one `<h1>` per page representing the view title, followed by sequentially nested `<h2>` and `<h3>` tags without skipping levels.
- Replace pseudo-buttons: convert any `<div onClick=...>` or `<span onClick=...>` elements into native `<button>` or `<a href="...">` tags to guarantee innate keyboard focus and screen reader semantics.

### Step 2: Compute Mathematical Color Contrast (WCAG 1.4.3 & 1.4.11)

- Calculate relative luminance ($L$) and contrast ratio:
  $$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$
- Verify strict threshold compliance:
  - Body text (< 18pt regular or < 14pt bold): minimum **4.5:1** against the background.
  - Large text (>= 18pt regular or >= 14pt bold): minimum **3.0:1**.
  - User Interface Components (form field borders, toggles, status indicator icons): minimum **3.0:1**.
- Verify contrast independently for both light mode (`#F7F9FC` canvas) and dark mode (`#0A111E` canvas).

### Step 3: Verify Touch Target Dimensions (WCAG 2.2 SC 2.5.8)

- Ensure all interactive tap targets (buttons, links, checkboxes, radio inputs, icon buttons) occupy at least **44 x 44 CSS pixels**.
- Where visual design requires a smaller icon (e.g., 20px), expand the hit target using transparent padding or an absolute pseudo-element (`::before`) extending to 44x44px.

### Step 4: Validate Keyboard Navigation & Focus Indicators

- Test Tab navigation: verify every interactive element can be reached sequentially using the `Tab` and `Shift+Tab` keys in a natural reading order.
- Verify standard keyboard triggers: `Enter` and `Space` activate buttons; `Escape` closes overlays and menus; arrow keys navigate listboxes and tab strips.
- Ensure prominent focus rings: strictly forbid `outline: none` without providing an immediate high-contrast replacement using `:focus-visible`:

```css
:focus-visible {
  outline: 2px solid var(--rj-color-focus-ring);
  outline-offset: 2px;
}
```

### Step 5: Implement Modal Focus Trapping & Focus Restoration

- **Focus Trapping**: When a modal or drawer opens, programmatically move focus to the first interactive element inside the dialog. Constrain `Tab` navigation so pressing `Tab` from the final element cycles back to the first element without leaking focus into the background document.
- **Background Isolation**: Apply `aria-modal="true"` and `role="dialog"` to the container. Suppress background interaction via `inert` or `aria-hidden="true"`.
- **Focus Restoration**: When the dialog closes, return focus automatically to the trigger element that originally opened it.

### Step 6: Form Accessibility & Dynamic Feedback

- Explicitly associate every input control with a `<label>` via matching `htmlFor` and `id` attributes. Never rely solely on placeholder text.
- When validation errors occur, link the error message to the input using `aria-describedby="field-error-id"` and set `aria-invalid="true"`.
- For asynchronous updates (e.g., application submitted successfully), announce the outcome via an `aria-live="polite"` live region.

### Step 7: Empirical Keyboard-Only Walkthrough

- Disconnect or ignore the mouse and touchpad.
- Navigate the full user journey using only the keyboard. Confirm that every action can be initiated, completed, and dismissed without visual traps or lost focus.
- Validate against the comprehensive checklist in [a11y-checklist.md](references/a11y-checklist.md).

## 4. Iron Laws

- **Law 1: Total Ban on Unstyled `outline: none`.** Stripping native browser focus outlines (`outline: none` or `outline: 0`) without providing an explicit, high-contrast `:focus-visible` replacement is strictly forbidden.
- **Law 2: Native Semantic Interactive Elements.** Divs and spans must never be repurposed as buttons or links without full ARIA keyboard parity (`role="button"`, `tabIndex={0}`, and key event listeners for Enter and Space). Native `<button>` and `<a>` elements are mandatory by default.
- **Law 3: Modal Focus Isolation and Restoration.** Every modal dialog and drawer must trap keyboard focus while active and restore focus to the initial triggering element upon dismissal.
- **Law 4: Mobile Touch Target Minimum.** All interactive touch targets must measure at least 44x44px on mobile devices.

## 5. Red Flags

- Using `outline: none` in CSS without defining `:focus-visible` styles.
- Form inputs lacking associated `<label>` elements, relying solely on placeholder strings.
- Interactive elements with tap target dimensions smaller than 44x44px on mobile devices.
- Color contrast ratios falling below 4.5:1 for body copy or 3.0:1 for input borders.
- Modal dialogs where pressing Tab allows focus to navigate into covered background elements.

## 6. Rationalization Table

| Excuse | Technical Reality |
|---|---|
| "Removing the focus outline makes the interface look cleaner." | Disabling focus outlines blinds keyboard-only users, leaving them unable to tell which button or link currently holds focus. Style an intentional 2px focus ring instead. |
| "Placeholders look cleaner than labels and save vertical space." | Placeholders disappear the moment a user begins typing, eliminating context and triggering input errors. Screen readers do not reliably parse placeholders as field names. |
| "A 44px touch target is too bulky for our compact desktop table design." | 44px touch targets can be achieved using transparent padding or pseudo-elements (`::before`) without altering the visible typography or icon dimensions. |

## 7. Verification Checklist

- [ ] Relative luminance contrast ratio >= 4.5:1 for body text and >= 3.0:1 for UI elements in both light and dark themes.
- [ ] Complete keyboard walkthrough accomplished using only `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape`.
- [ ] `:focus-visible` focus rings are clearly visible on all interactive elements.
- [ ] Modals correctly trap keyboard focus and restore focus to the trigger upon closing.
- [ ] Form controls are bound to `<label>` elements and utilize `aria-describedby` for error states.
- [ ] Touch targets measure at least 44x44px on mobile devices.
- [ ] Full compliance with [a11y-checklist.md](references/a11y-checklist.md) verified.

## 8. Rikkei Jobs Specifics

- Verification checklist: [references/a11y-checklist.md](references/a11y-checklist.md).
- Test setup: `frontend/src/setupTests.ts` (configures `@testing-library/jest-dom/vitest`).
- Layout primitives: `frontend/src/shared/components/Header.tsx`, `HealthBadge.tsx`.
- Verification commands:

```bash
cd frontend
npm run test
npm run lint
```
