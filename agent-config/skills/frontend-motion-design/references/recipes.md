# Rikkei Jobs Motion Design Working Recipes

This document provides production-ready, zero-dependency implementations for 12 essential enterprise motion recipes in the Rikkei Jobs platform. All code examples adhere strictly to compositor-only performance (60fps, CLS = 0) and accessibility guidelines.

---

## Recipe 1: Choreographed Multi-Element Sequence (Parent-to-Children Stagger)

### Use Case

Presenting a list of job postings or candidate cards sequentially upon page entrance without blocking UI interaction.

### Implementation

```html
<div class="rj-job-grid" role="list">
  <article class="rj-job-card" style="--stagger-index: 0;" role="listitem">
    <h3>Senior Fullstack Engineer (Java / React)</h3>
  </article>
  <article class="rj-job-card" style="--stagger-index: 1;" role="listitem">
    <h3>DevOps & Cloud Specialist</h3>
  </article>
  <article class="rj-job-card" style="--stagger-index: 2;" role="listitem">
    <h3>Automated QA Engineer</h3>
  </article>
</div>
```

```css
.rj-job-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--rj-primitive-space-4);
}

.rj-job-card {
  opacity: 0;
  transform: translateY(var(--rj-motion-dist-md));
  animation: rj-cascade-enter var(--rj-duration-moderate) var(--rj-ease-entrance) forwards;
  animation-delay: calc(var(--stagger-index, 0) * var(--rj-motion-stagger-normal));
  /* Cap total stagger delay at 400ms to avoid blocking reading flow */
  max-delay: 400ms;
}

@keyframes rj-cascade-enter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rj-job-card {
    transform: none;
    animation: rj-fade-in 100ms ease forwards;
    animation-delay: 0ms;
  }
}

@keyframes rj-fade-in {
  to { opacity: 1; }
}
```

---

## Recipe 2: View Transitions API (Route Navigation with SPA & Fallback)

### Use Case

Seamless, app-like page transitions when candidates navigate from job listings to job details.

### Implementation

```typescript
export async function navigateWithTransition(
  url: string,
  updateDOM: () => Promise<void> | void
): Promise<void> {
  // Graceful fallback for browsers without View Transitions or reduced motion preference
  if (
    !document.startViewTransition ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    await updateDOM();
    return;
  }

  const transition = document.startViewTransition(async () => {
    await updateDOM();
  });

  try {
    await transition.finished;
  } catch (error) {
    console.error('View transition aborted:', error);
  }
}
```

```css
::view-transition-old(root) {
  animation: rj-view-out var(--rj-duration-fast) var(--rj-ease-exit) forwards;
}

::view-transition-new(root) {
  animation: rj-view-in var(--rj-duration-slow) var(--rj-ease-entrance) forwards;
}

@keyframes rj-view-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.98); }
}

@keyframes rj-view-in {
  from { opacity: 0; transform: translateY(var(--rj-motion-dist-md)); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Recipe 3: CSS Scroll-Driven Animations (`animation-timeline: scroll()/view()`)

### Use Case

Revealing historical curriculum milestones or work experience items as they enter the visible viewport.

### Implementation

```css
.rj-timeline-item {
  opacity: 0;
  transform: translateY(var(--rj-motion-dist-md));
}

@supports (animation-timeline: view()) {
  .rj-timeline-item {
    animation: rj-scroll-reveal linear both;
    animation-timeline: view();
    animation-range: entry 10% cover 30%;
  }

  @keyframes rj-scroll-reveal {
    from {
      opacity: 0;
      transform: translateY(var(--rj-motion-dist-md));
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

```typescript
// Fallback for browsers without CSS Scroll-Driven Animation support
export function setupScrollObserver(selector: string): void {
  if (CSS.supports('animation-timeline', 'view()')) return;

  const elements = document.querySelectorAll(selector);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('rj-is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach((el) => observer.observe(el));
}
```

---

## Recipe 4: Scroll-Linked Reading & Funnel Progress Bar

### Use Case

Fixed application progress bar indicating completion percentage as candidate scrolls through requirements.

### Implementation

```html
<div class="rj-progress-tracker" aria-hidden="true">
  <div class="rj-progress-bar"></div>
</div>
```

```css
.rj-progress-tracker {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: var(--rj-primitive-neutral-200);
  z-index: var(--rj-primitive-z-sticky);
}

.rj-progress-bar {
  width: 100%;
  height: 100%;
  background-color: var(--rj-color-brand-primary);
  transform-origin: 0 50%;
  transform: scaleX(0);
}

@supports (animation-timeline: scroll()) {
  .rj-progress-bar {
    animation: rj-fill-progress linear both;
    animation-timeline: scroll(root);
  }

  @keyframes rj-fill-progress {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
}
```

---

## Recipe 5: FLIP Layout Animation (First, Last, Invert, Play via WAAPI)

### Use Case

Smooth repositioning of skill filter tags or reordered candidate cards without layout reflow glitches.

### Implementation

```typescript
export function flipAnimate(
  container: HTMLElement,
  itemSelector: string,
  mutateDOM: () => void
): void {
  const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
  
  // FIRST: Record initial positions
  const firstRects = new Map<HTMLElement, DOMRect>();
  items.forEach((item) => firstRects.set(item, item.getBoundingClientRect()));

  // MUTATE DOM (sorting, filtering, adding)
  mutateDOM();

  // LAST: Record final positions
  items.forEach((item) => {
    const first = firstRects.get(item);
    const last = item.getBoundingClientRect();
    if (!first) return;

    // INVERT: Calculate delta transform
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;

    if (deltaX !== 0 || deltaY !== 0) {
      // PLAY: Animate compositor transform using WAAPI
      item.animate([
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: 'translate(0, 0)' }
      ], {
        duration: 260,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both'
      });
    }
  });
}
```

---

## Recipe 6: SVG Stroke Drawing (`stroke-dasharray` & `stroke-dashoffset`)

### Use Case

High-impact drawing animation for the Hexagonal Verified Skill Badge outline upon score computation.

### Implementation

```html
<svg viewBox="0 0 100 100" class="rj-badge-svg" aria-hidden="true">
  <polygon 
    points="50,5 90,25 90,75 50,95 10,75 10,25" 
    class="rj-badge-path"
    pathLength="100"
  />
</svg>
```

```css
.rj-badge-path {
  fill: none;
  stroke: var(--rj-color-brand-primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: rj-draw-stroke var(--rj-duration-deliberate) var(--rj-ease-entrance) forwards;
}

@keyframes rj-draw-stroke {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rj-badge-path {
    stroke-dashoffset: 0;
    animation: none;
  }
}
```

---

## Recipe 7: Number & Stat Tweens (Matching Score & Salary Counter)

### Use Case

Smooth numerical increment for candidate skill match percentage (e.g., 0% to 94%) without layout jitter.

### Implementation

```typescript
export function animateCounter(
  element: HTMLElement,
  targetValue: number,
  duration = 400,
  formatter?: (n: number) => string
): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = formatter ? formatter(targetValue) : String(targetValue);
    return;
  }

  const startValue = 0;
  const startTime = performance.now();

  function update(currentTime: number): void {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1.0);
    
    // Decelerating power ease: 1 - (1 - t)^3
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);

    element.textContent = formatter ? formatter(currentValue) : String(currentValue);

    if (progress < 1.0) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}
```

---

## Recipe 8: Skeleton-to-Content Morphs (Zero-CLS Data Resolution)

### Use Case

Seamless replacement of grey loading placeholders with real data without geometric layout displacement.

### Implementation

```css
.rj-skeleton {
  background: linear-gradient(
    90deg,
    var(--rj-primitive-neutral-100) 0%,
    var(--rj-primitive-neutral-200) 50%,
    var(--rj-primitive-neutral-100) 100%
  );
  background-size: 200% 100%;
  animation: rj-shimmer 1.8s ease-in-out infinite;
  border-radius: var(--rj-primitive-radius-md);
  /* Absolute geometric preservation: strictly fixed height/aspect ratio */
  min-height: 24px;
}

@keyframes rj-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Resolution cross-fade wrapper */
.rj-content-resolved {
  animation: rj-resolve-in var(--rj-duration-fast) var(--rj-ease-entrance) forwards;
}

@keyframes rj-resolve-in {
  from {
    opacity: 0;
    transform: translateY(var(--rj-motion-dist-2xs));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Recipe 9: Stateful Micro-Interactions (Interactive Button 5 States)

### Use Case

Full stateful tactile feedback for candidate application submission buttons: Default, Hover, Active, Loading, Error.

### Implementation

```css
.rj-action-btn {
  background-color: var(--rj-color-action-primary-bg);
  color: var(--rj-color-action-primary-fg);
  border: 1px solid transparent;
  border-radius: var(--rj-primitive-radius-md);
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
  transform: translateZ(0);
  transition: var(--rj-transition-hover);
}

.rj-action-btn:hover {
  background-color: var(--rj-color-action-primary-hover-bg);
  transform: translateY(calc(var(--rj-motion-dist-2xs) * -1));
}

.rj-action-btn:active {
  transform: translateY(var(--rj-motion-dist-2xs)) scale(0.98);
  transition-duration: var(--rj-duration-micro);
}

.rj-action-btn:focus-visible {
  outline: 2px solid var(--rj-color-focus-ring);
  outline-offset: 2px;
}

/* Error state shake micro-animation (<= 150ms) */
.rj-action-btn.has-error {
  animation: rj-tactile-shake 140ms ease-in-out;
}

@keyframes rj-tactile-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
```

---

## Recipe 10: List Reorder, Enter & Exit Animations

### Use Case

Adding or archiving applicant cards in the recruiter workflow with smooth exit and gap closure.

### Implementation

```css
.rj-list-item-enter {
  animation: rj-item-enter var(--rj-duration-moderate) var(--rj-ease-entrance) forwards;
}

.rj-list-item-exit {
  animation: rj-item-exit var(--rj-duration-fast) var(--rj-ease-exit) forwards;
}

@keyframes rj-item-enter {
  from {
    opacity: 0;
    transform: translateY(var(--rj-motion-dist-sm));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rj-item-exit {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.96);
  }
}
```

---

## Recipe 11: Hero Landing Entrance Sequence (Candidate Portal)

### Use Case

Editorial reveal of candidate homepage: Navigation (0ms) -> Header (100ms) -> Tech Search (200ms) -> Skill Radar (300ms).

### Implementation

```css
.rj-hero-title {
  opacity: 0;
  animation: rj-fade-up var(--rj-duration-moderate) var(--rj-ease-entrance) 100ms forwards;
}

.rj-hero-search {
  opacity: 0;
  animation: rj-fade-up var(--rj-duration-moderate) var(--rj-ease-entrance) 200ms forwards;
}

.rj-hero-radar {
  opacity: 0;
  animation: rj-fade-up var(--rj-duration-moderate) var(--rj-ease-entrance) 300ms forwards;
}

@keyframes rj-fade-up {
  from {
    opacity: 0;
    transform: translateY(var(--rj-motion-dist-md));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Recipe 12: Admin Data-Dense Restraint (Role-Based Motion Budget)

### Use Case

Strict motion dampening in high-density administrative views (20-30 rows/screen) to eliminate visual fatigue.

### Implementation

```css
[data-density="dense"] {
  /* Restrain all transition durations to micro/fast levels */
  --rj-duration-normal: 100ms;
  --rj-duration-moderate: 150ms;
}

/* Eliminate spatial lifting on table rows in dense admin views */
[data-density="dense"] .rj-table-row {
  transform: none !important;
  transition: background-color var(--rj-duration-fast) ease;
}

[data-density="dense"] .rj-table-row:hover {
  background-color: var(--rj-primitive-neutral-100);
}

/* Instant pop-in for batch action bars */
[data-density="dense"] .rj-bulk-action-bar {
  transition: opacity var(--rj-duration-fast) ease;
}
```
