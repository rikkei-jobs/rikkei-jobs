# Rikkei Jobs Design System Token Reference Tables

This reference document provides concrete CSS Custom Properties for typography, colors, spatial rhythm, and role-based layout density in the Rikkei Jobs platform.

---

## 1. Color System (Bespoke Palette)

### 1.1 Neutral Palette (Technical Iron Charcoal)

| Token Name | Light Mode Value | Dark Mode Value | Usage / Semantic Role |
|---|---|---|---|
| `--rj-color-bg-canvas` | `#F7F9FC` | `#0A111E` | Primary page canvas background |
| `--rj-color-bg-subtle` | `#EEF2F6` | `#111C2E` | Table header, subtle card surface |
| `--rj-color-surface-card` | `#FFFFFF` | `#111C2E` | Primary card surface |
| `--rj-color-border-subtle` | `#E2E7ED` | `#1E2C3F` | Dividers, row borders |
| `--rj-color-border-default` | `#C5D0DC` | `#334155` | Card outlines, container borders |
| `--rj-color-border-interactive` | `#6F8094` | `#5B7083` | Form inputs, interactive borders (CR >= 3.0:1) |
| `--rj-color-text-primary` | `#0C1A30` | `#EDF2F7` | Headings, primary body text (CR >= 15:1) |
| `--rj-color-text-secondary` | `#334E68` | `#CBD5E1` | Secondary labels, descriptions (CR >= 8:1) |
| `--rj-color-text-muted` | `#5B7083` | `#94A3B8` | Timestamps, metadata (CR >= 5:1) |

### 1.2 Brand Palette (Technical Iron Cobalt)

| Token Name | Light Mode Value | Dark Mode Value | Usage / Semantic Role |
|---|---|---|---|
| `--rj-color-brand-primary` | `#132F52` | `#4C85DE` | Primary buttons, brand anchors |
| `--rj-color-brand-anchor` | `#0A2540` | `#246EB9` | Hover/active states, header background |
| `--rj-color-brand-subtle` | `#EBF3FA` | `#132F52` | Selected row highlight, active navigation pill |

### 1.3 Accent Palette (Cyber Persimmon / Terracotta)

| Token Name | Light Mode Value | Dark Mode Value | Usage / Semantic Role |
|---|---|---|---|
| `--rj-color-accent` | `#D9480F` | `#F08C65` | Match percentage highlight, verified badges |
| `--rj-color-accent-hover` | `#BF3A0A` | `#FA9D78` | Hover state for accent buttons |
| `--rj-color-accent-subtle` | `#FEF2ED` | `#2A160F` | Badge background, warning notification chip |

### 1.4 Semantic Status Palette

| Token Name | Text / Icon Color | Background Surface | Border Color |
|---|---|---|---|
| Status Success (Deep Pine) | `#0E6251` (CR 6.65:1) | `#E8F8F5` | `#A2D9CE` |
| Status Warning (Honey Amber) | `#7A4305` (CR 7.57:1) | `#FEF9E7` | `#F9E79F` |
| Status Danger (Crimson Brick)| `#9B1C2A` (CR 7.40:1) | `#FDF2F4` | `#F5B7B1` |
| Status Info (Cerulean) | `#134B5E` (CR 8.65:1) | `#EBF5FB` | `#A9CCE3` |

### 1.5 Categorical Data Visualization Set (6 Colors)

- `--rj-dataviz-1`: `#1B4F72` (Tech Navy)
- `--rj-dataviz-2`: `#B03A2E` (Rust Red)
- `--rj-dataviz-3`: `#117864` (Pine Green)
- `--rj-dataviz-4`: `#9C7D08` (Dark Ochre)
- `--rj-dataviz-5`: `#6C3483` (Royal Plum)
- `--rj-dataviz-6`: `#B9770E` (Tawny Bronze)

---

## 2. Typography Tokens

```css
/* Font Families */
--rj-font-display: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
--rj-font-body: 'Be Vietnam Pro', system-ui, -apple-system, sans-serif;
--rj-font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Typography Scale (with Vietnamese Line-Height Buffer) */
--rj-text-xs: 0.75rem;    /* 12px - Line height: 1.50 */
--rj-text-sm: 0.875rem;   /* 14px - Line height: 1.50 */
--rj-text-base: 1rem;     /* 16px - Line height: 1.50 */
--rj-text-lg: 1.125rem;   /* 18px - Line height: 1.45 */
--rj-text-xl: 1.25rem;    /* 20px - Line height: 1.40 */
--rj-text-2xl: 1.5rem;    /* 24px - Line height: 1.33 */
--rj-text-3xl: 1.875rem;  /* 30px - Line height: 1.27 */
--rj-text-4xl: 2.25rem;   /* 36px - Line height: 1.22 */

/* Tabular Numerics for Metrics and Data */
--rj-font-tabular: tabular-nums;
```

---

## 3. Spatial Rhythm Scale (Base 4px)

```css
--rj-space-1: 0.25rem;  /* 4px */
--rj-space-2: 0.5rem;   /* 8px */
--rj-space-3: 0.75rem;  /* 12px */
--rj-space-4: 1rem;     /* 16px */
--rj-space-5: 1.25rem;  /* 20px */
--rj-space-6: 1.5rem;   /* 24px */
--rj-space-8: 2rem;     /* 32px */
--rj-space-10: 2.5rem;  /* 40px */
--rj-space-12: 3rem;    /* 48px */
--rj-space-16: 4rem;    /* 64px */
```

---

## 4. Role-Based Density Tokens

| Property | Airy Mode (Candidate / Student) | Dense Mode (Admin / HR / Staff) |
|---|---|---|
| `--rj-density-row-height` | `56px` | `36px - 38px` |
| `--rj-density-table-py` | `16px` | `6px` |
| `--rj-density-table-px` | `20px` | `12px` |
| `--rj-density-card-padding` | `24px` | `12px` |
| `--rj-density-font-size` | `16px` (`--rj-text-base`) | `13px - 14px` |
| `--rj-density-input-height` | `44px` (touch target) | `34px` |
| `--rj-density-button-height`| `44px` (touch target) | `34px` |
