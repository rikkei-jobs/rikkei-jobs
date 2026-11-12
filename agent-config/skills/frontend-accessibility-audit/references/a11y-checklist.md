# Rikkei Jobs Accessibility (a11y) Verification Checklist

Compliant with WCAG 2.2 Level AA Standards.

---

## 1. Contrast Ratios (WCAG 1.4.3 & 1.4.11)

- [ ] Regular body text (< 18pt or < 14pt bold) achieves minimum **4.5:1** contrast ratio against its background.
- [ ] Large headings (>= 18pt or >= 14pt bold) achieve minimum **3.0:1** contrast ratio.
- [ ] Essential UI controls (form borders, active tabs, toggle switches) achieve minimum **3.0:1** contrast ratio.
- [ ] Contrast compliance is independently verified in both Light Mode (`#F7F9FC` canvas) and Dark Mode (`#0A111E` canvas).

## 2. Touch Target Size (WCAG 2.2 SC 2.5.8)

- [ ] All interactive buttons, icon buttons, checkboxes, and links measure at least **44 x 44 CSS pixels** on mobile displays.
- [ ] Icons smaller than 44px utilize transparent padding or pseudo-elements (`::before`) to satisfy the hit area.

## 3. Keyboard Navigation & Tab Order (WCAG 2.1.1 & 2.4.3)

- [ ] 100% of interactive elements can be navigated sequentially using `Tab` and `Shift+Tab`.
- [ ] Logical DOM order matches the visual reading order.
- [ ] Standard keyboard triggers work properly: `Enter` and `Space` activate buttons; `Escape` dismisses modals and popovers.

## 4. Prominent Focus Indicators (WCAG 2.4.7 & 2.4.11)

- [ ] `outline: none` or `outline: 0` is strictly forbidden without an immediate `:focus-visible` replacement.
- [ ] High-contrast focus ring implemented: `outline: 2px solid var(--rj-color-focus-ring); outline-offset: 2px;`.
- [ ] Focus indicator contrast achieves >= 3.0:1 against adjacent backgrounds.

## 5. Modal Focus Trapping & Restoration (WCAG 2.4.3)

- [ ] When a modal or drawer opens, focus is programmatically transferred to the first interactive element.
- [ ] Pressing `Tab` from the last element cycles back to the first element (focus does not leak into the covered page).
- [ ] Background content receives `aria-hidden="true"` or `inert`.
- [ ] Dismissing the modal restores focus directly to the trigger element that initiated it.

## 6. Form Field Accessibility (WCAG 1.3.1 & 4.1.2)

- [ ] Every `<input>`, `<select>`, and `<textarea>` is explicitly paired with a `<label>` via `htmlFor` and `id`.
- [ ] Placeholder text is NEVER used as a replacement for visible labels.
- [ ] Validation errors are programmatically linked to fields via `aria-describedby="error-id"` and set `aria-invalid="true"`.

## 7. Iconography & Non-Text Content (WCAG 1.1.1)

- [ ] Decorative icons define `aria-hidden="true"`.
- [ ] Standalone semantic icons define `role="img"` and a descriptive `aria-label`.
- [ ] Icon-only buttons provide an accessible name via `aria-label` or `<span className="sr-only">`.

## 8. Motion & Flashing Safety (WCAG 2.2.2 & 2.3.1)

- [ ] All non-essential animations respect `@media (prefers-reduced-motion: reduce)` with a 100ms cross-fade and 0.001ms duration.
- [ ] Animations lasting longer than 5 seconds provide an accessible Pause or Stop control.
- [ ] Zero animations flash more than 3 times per second (> 3Hz).
