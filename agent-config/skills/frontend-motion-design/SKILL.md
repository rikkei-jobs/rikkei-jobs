---
name: frontend-motion-design
description: Use when adding, animating, or optimizing transitions, micro-interactions, page route transitions, or motion accessibility in the frontend UI.
---

# Frontend Motion Design Skill & Engineering Standard

This skill governs the design, implementation, and quality verification of animations, micro-interactions, spring physics, and spatial transitions across the Rikkei Jobs platform.

---

## 1. Overview & Philosophy

Motion in Rikkei Jobs is **purposeful, physical, and restrained**. It exists to clarify spatial orientation, provide tactile feedback, and reinforce high-tech enterprise discipline. It rejects decorative AI clichés (gratuitous bouncing, uncurated fade-up cascades, and blocking transitions).

All motion implementations adhere to three core principles:

1. **Zero Runtime Footprint**: Leverage 100% Native CSS and the Web Animations API (WAAPI) for 0 KB bundle overhead.
2. **Strict Compositor Performance**: Animate only GPU-composited properties (`transform`, `opacity`) to guarantee 60fps and zero layout shifts (`CLS = 0`).
3. **Inclusive Vestibular Accessibility**: Comprehensive `@media (prefers-reduced-motion: reduce)` support providing genuine 100ms cross-fade alternatives and preserving WebKit event loop integrity with `0.001ms` durations.

---

## 2. When to Use & When NOT to Use

### When to Use

- Implementing stateful micro-interactions (button press, hover lifts, toggle switches).
- Choreographing page route transitions via the View Transitions API.
- Creating physical spring animations using CSS `linear()` approximations.
- Building scroll-linked indicators, skeleton loading morphs, and SVG stroke drawing.
- Auditing motion performance, frame rates, and vestibular accessibility compliance.

### When NOT to Use

- Modifying static typography or layout colors (use `frontend-visual-design`).
- Creating or editing vector icon assets (use `frontend-iconography`).
- Implementing complex business logic or API contracts (use `frontend-feature-slice`).

---

## 3. Motion Token System Architecture

Rikkei Jobs provides a unified design token system for durations, easings, spring approximations, translation distances, and stagger intervals.

See the complete token stylesheet in [motion-tokens.css](references/motion-tokens.css).

### Summary Token Reference

| Category | Token Variable | Value | Purpose / Usage |
|---|---|---|---|
| **Duration** | `--rj-duration-micro` | `100ms` | Button active press, badge count bump |
| | `--rj-duration-fast` | `150ms` | Tooltip reveal, hover lift, admin transitions |
| | `--rj-duration-normal` | `200ms` | Dropdowns, popovers, segmented controls |
| | `--rj-duration-moderate`| `300ms` | Modal dialogs, slide drawers |
| | `--rj-duration-slow` | `400ms` | Page route transitions, hero reveals |
| | `--rj-duration-deliberate`| `600ms` | SVG stroke drawing, chart reveals |
| **Cubic-Bezier**| `--rj-ease-entrance` | `(0.16, 1, 0.3, 1)` | Decelerating entrance curve |
| | `--rj-ease-exit` | `(0.7, 0, 0.84, 0)` | Rapid accelerating exit curve |
| | `--rj-ease-hover` | `(0.2, 0, 0, 1)` | Immediate interactive cursor response |
| **Spring linear()**| `--rj-ease-spring-snappy` | `linear(...)` | Toggles, switches, tab indicator (260ms) |
| | `--rj-ease-spring-gentle`| `linear(...)` | Modal sheets, drawers, expanders (400ms) |
| | `--rj-ease-spring-stiff` | `linear(...)` | Tooltips, focus rings, counters (250ms) |
| | `--rj-ease-spring-bouncy`| `linear(...)` | Verified badge completion, bookmarking |
| **Distance** | `--rj-motion-dist-2xs` | `2px` | Micro button depression |
| | `--rj-motion-dist-xs` | `4px` | Card hover elevation |
| | `--rj-motion-dist-sm` | `8px` | Dropdown descent, tooltip pop-up |
| | `--rj-motion-dist-md` | `16px` | Toast notifications, modal reveals |
| **Stagger** | `--rj-motion-stagger-normal`| `35ms` | Grid item cascade interval |

Detailed mathematical derivations and spring physics formulas are documented in [spring-presets.md](references/spring-presets.md).

---

## 4. The 12 Enterprise Motion Recipes

Rikkei Jobs maintains 12 verified, production-ready motion recipes with complete source code in [recipes.md](references/recipes.md):

1. **Recipe 1: Choreographed Multi-Element Sequence**: Staggered card entrance via CSS custom properties and `calc()`.
2. **Recipe 2: View Transitions API**: SPA and cross-document route transitions with instantaneous fallback.
3. **Recipe 3: CSS Scroll-Driven Animations**: Declarative viewport-linked reveals using `@supports (animation-timeline: view())`.
4. **Recipe 4: Scroll-Linked Reading Progress Bar**: Real-time application funnel progress using `animation-timeline: scroll(root)`.
5. **Recipe 5: FLIP Layout Animation**: Zero-reflow DOM reordering using `getBoundingClientRect()` and WAAPI.
6. **Recipe 6: SVG Stroke Drawing**: Hexagonal badge vector drawing via `stroke-dasharray` and `pathLength="100"`.
7. **Recipe 7: Number & Stat Tweens**: Decelerated counter tweens for matching scores and salary estimates.
8. **Recipe 8: Skeleton-to-Content Morphs**: Shimmer loading transitions with zero Cumulative Layout Shift (`CLS = 0`).
9. **Recipe 9: Stateful Micro-Interactions**: Tactile button feedback covering Default, Hover, Active, Loading, and Shake Error.
10. **Recipe 10: List Reorder, Enter & Exit**: Smooth insertion, removal, and FLIP space closing.
11. **Recipe 11: Hero Landing Entrance Sequence**: Curated 4-stage candidate portal reveal within 400ms.
12. **Recipe 12: Admin Data-Dense Restraint**: Strict motion dampening (<= 150ms) and zero vertical shift for dense tables.

---

## 5. Library Decision Matrix

| Solution | Bundle Impact | React 19 Compatibility | License Status | Recommendation Status |
|---|---|---|---|---|
| **Native CSS & WAAPI** | **0 KB** | 100% Compatible (RSC Safe) | Open Web Standard | **Primary Recommendation** |
| **Motion v12 (`motion.dev`)** | ~30-34 KB (gzip) | Official React 19 Support | MIT Permissive | Future Roadmap (Sprint 2+) |
| **GSAP (GreenSock)** | ~60+ KB (gzip) | Requires DOM Wrappers | Proprietary / Commercial | **Strictly Forbidden** |

### Rationale

- **GSAP is Forbidden**: GSAP uses a custom commercial license with royalty restrictions and is not standard OSI open-source. It introduces legal compliance risks for enterprise deployments.
- **Native CSS / WAAPI**: Completely avoids third-party dependencies, leverages hardware GPU acceleration natively, and incurs zero runtime cost.
- **No Dependencies Added in Current Sprint**: Per project constraint R0, no new runtime packages may be added to `package.json` in this milestone.

---

## 6. Performance Engineering & GPU Discipline

### The 60fps Budget (16.6ms per frame)

To guarantee smooth rendering and eliminate jank, the browser main thread must never be blocked by layout recalculations during motion.

### Compositor-Only Rules

- **ALLOWED Properties**: `transform` (`translate3d`, `scale`, `rotate`) and `opacity`.
- **FORBIDDEN Properties**: `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`, `border-width`. Modifying these triggers costly Reflow (Layout) and Paint cycles.
- **Cumulative Layout Shift (CLS)**: Must equal strictly `0` during all animations.

### `will-change` Discipline

- Never declare `will-change` statically in general CSS utility classes (causes GPU VRAM memory exhaustion).
- Apply `will-change: transform, opacity` only on active hover or focus interactions.
- Release immediately back to `auto` upon transition completion:

  ```css
  .rj-interactive-card:hover {
    will-change: transform;
  }
  ```

---

## 7. Accessibility & Vestibular Protection

### 1. Prefers-Reduced-Motion Parity

Do not abruptly strip away all visual cues when reduced motion is requested. Replace spatial translation with an elegant **100ms opacity cross-fade**:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 2. The WebKit 0.001ms Event Loop Safeguard

Using `transition-duration: 0s` in Safari/WebKit fails to fire the `transitionend` event, causing asynchronous state promises (e.g., dialog unmounting) to hang indefinitely. Setting `0.001ms` executes instantaneously to human perception while reliably firing the event loop callback.

### 3. WCAG 2.2.2 (Pause, Stop, Hide)

Any auto-playing or looped motion lasting longer than 5 seconds (such as partner logo carousels or applicant tickers) must provide an accessible keyboard-operable Pause / Play toggle.

### 4. WCAG 2.3.1 (Three Flashes or Below Threshold)

Zero elements may flash, strobe, or oscillate more than 3 times per second (> 3Hz). Loading skeleton shimmer pulses must have a period of $\ge 1.5$ seconds.

---

## 8. Purpose-Based Motion Budgets (Rule 09 Alignment)

Blanket duration limits are replaced with purpose-based budgets categorized by user interaction context and persona:

| Interaction Type | Maximum Budget | Permitted Curves | Role / Context |
|---|---|---|---|
| **Micro-interactions** | `<= 150ms` | `--rj-ease-spring-snappy`, `--rj-ease-hover` | Button clicks, toggles, checkmarks |
| **Menus & Tooltips** | `<= 200ms` | `--rj-ease-spring-stiff`, `--rj-ease-entrance`| Popovers, tooltips, dropdowns |
| **Dialogs & Drawers** | `<= 300ms` | `--rj-ease-spring-gentle`, `--rj-ease-entrance`| Modal sheets, slide drawers |
| **Route Transitions** | `<= 400ms` | `--rj-ease-entrance`, `--rj-ease-exit` | View Transitions, page reveals |
| **Admin Dense Views** | `<= 150ms` | Background color only, zero vertical shift | High-density data matrices |

### Non-Blocking Constraint

No animation may intercept, delay, or block user input. User clicks, keystrokes, and focus shifts must register immediately regardless of ongoing motion.

---

## 9. Iron Laws of Motion

```text
================================================================================
                           IRON LAWS OF MOTION
================================================================================
1. MANDATORY REDUCED MOTION: Every animation must support prefers-reduced-motion
   with a 100ms cross-fade and 0.001ms duration reset.
2. COMPOSITOR-ONLY: Animate strictly transform and opacity. Zero layout reflows.
3. PURPOSE BUDGETS: Adhere strictly to the purpose-based duration caps.
4. ZERO BLOCKING: Never intercept or delay user interactions during motion.
5. NO COMMERCIALLY RESTRICTED LIBS: GSAP is forbidden. Use Native CSS / WAAPI.
================================================================================
```

---

## 10. Anti-Patterns & Red Flags

- **The Jiggle Trap**: Adding bouncing or shaking keyframes to buttons (`@keyframes bounce`).
- **The Cascade Wall**: Staggering 20+ list items with unbounded delays, forcing users to wait seconds for data.
- **The Layout Thrash**: Animating `height: 0` to `height: auto` directly in CSS transitions.
- **The Abrupt Freeze**: Disabling all CSS transitions completely under reduced motion without providing an opacity cross-fade.
- **The Parallax Illusion**: Moving multi-layer backgrounds at different speeds during page scroll.

---

## 11. Rationalization Table

| Excuse | Counter-Argument |
|---|---|
| *"GSAP is standard in the industry, why can't we use it?"* | GSAP is proprietary and restricted by commercial licensing. Native CSS and WAAPI deliver 60fps with zero bundle footprint and zero legal risk. |
| *"Users with reduced-motion don't want any transitions at all."* | Total abruptness causes disorientation and spatial confusion. A gentle 100ms opacity cross-fade maintains spatial coherence without vestibular strain. |
| *"Setting transition-duration: 0s is cleaner than 0.001ms."* | `0s` breaks `transitionend` event dispatching in WebKit/Safari, freezing async modals. `0.001ms` guarantees event loop execution. |
| *"We need bouncy physics on our buttons to make them feel modern."* | Gratuitous bouncing looks amateurish and violates enterprise dignity. Rikkei Jobs uses controlled, lightly underdamped springs (`snappy`: 2.8% overshoot). |

---

## 12. Verification Checklist

Before finalizing any motion implementation, verify the following:

- [ ] All animated properties are restricted to `transform` and `opacity`.
- [ ] No layout shifts occur (`CLS = 0` in Chrome DevTools Performance panel).
- [ ] Motion completes within its designated purpose-based budget (Micro <= 150ms, Modal <= 300ms, Route <= 400ms).
- [ ] `@media (prefers-reduced-motion: reduce)` is tested and replaces spatial motion with a 100ms opacity cross-fade.
- [ ] WebKit `transitionend` listeners fire reliably under reduced motion.
- [ ] Skeleton loaders pulse at $\ge 1.5$s cycle time (no flash > 3Hz).
- [ ] High-density admin views damp motion to <= 150ms with zero card translation.
- [ ] Zero external animation libraries are imported.
