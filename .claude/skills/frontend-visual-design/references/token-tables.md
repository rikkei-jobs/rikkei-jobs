# Rikkei Jobs Design System Token Reference Tables

This reference document provides concrete CSS Custom Properties for typography, colors, spatial rhythm, and role-based layout density in the Rikkei Jobs platform.

---

## 1. Color System (Bespoke Palette)

### 1.1 Neutral Palette (5-Level Surface Ladder & Iron Obsidian)

| Token Name | Light Mode Value | Dark Mode Value | Usage / Semantic Role |
|---|---|---|---|
| `--rj-color-bg-canvas` | `#EEF2F8` | `#0B1019` | Primary page canvas background (Level 1) |
| `--rj-color-bg-subtle` | `#E1E8F2` | `#101724` | Hero section panel, subtle surface (Level 2) |
| `--rj-color-surface-card` | `#FFFFFF` | `#162030` | Primary card surface (Level 3) |
| `--rj-color-surface-input` | `#F8FAFD` | `#0D1420` | Form input field inset (Level 4) |
| `--rj-color-surface-elevated` | `#FFFFFF` | `#1E2C42` | Popovers, elevated dropdowns (Level 5) |
| `--rj-color-border-subtle` | `#BACAD9` | `#1E2C42` | Dividers, row borders (CR >= 3.0:1) |
| `--rj-color-border-default` | `#879BB0` | `#2D3F59` | Card outlines, container borders |
| `--rj-color-border-interactive` | `#6F8094` | `#49627D` | Form inputs, interactive borders (CR >= 3.0:1) |
| `--rj-color-text-primary` | `#0B1A2C` | `#EDF2F7` | Headings, primary body text (CR >= 16.8:1) |
| `--rj-color-text-secondary` | `#25394E` | `#BACAD9` | Secondary labels, descriptions (CR >= 10.4:1) |
| `--rj-color-text-muted` | `#49627D` | `#879BB0` | Timestamps, metadata (CR >= 4.5:1) |

### 1.2 Brand Palette (Confident Royal Cobalt & Dedicated Brand Mark)

| Token Name | Light Mode Value | Dark Mode Value | Usage / Semantic Role |
|---|---|---|---|
| `--rj-color-brand-primary` | `#0D55B8` | `#508CEE` | Primary buttons, brand anchors (CR >= 5.0:1) |
| `--rj-color-brand-anchor` | `#0A4596` | `#70A5FA` | Hover/active states, header background |
| `--rj-color-brand-subtle` | `#E1E8F2` | `rgba(80, 140, 238, 0.15)` | Selected row highlight, active navigation pill |
| `--rj-brand-mark` | `#C8161D` | `#C8161D` | Official Brand Mark Logo Red (isolated asset) |

### 1.3 Accent Palette (Cyber Persimmon / Terracotta)

| Token Name | Light Mode Value | Dark Mode Value | Usage / Semantic Role |
|---|---|---|---|
| `--rj-color-accent` | `#C8531D` | `#E66A35` | Match percentage highlight, verified badges |
| `--rj-color-accent-hover` | `#A33F12` | `#F7A889` | Hover state for accent buttons |
| `--rj-color-accent-subtle` | `#FFF6F0` | `rgba(230, 106, 53, 0.15)` | Badge background, warning notification chip |

### 1.4 Semantic Status Palette (Quarantined Danger & Clear Roles)

| Token Name | Text / Icon Color | Background Surface | Border Color |
|---|---|---|---|
| Status Success (Forest Mint) | `#0E6251` (CR 6.63:1) | `#E8F8F0` | `#A3E4C8` |
| Status Warning (Deep Amber) | `#7A4305` (CR 7.43:1) | `#FEF6E8` | `#FDE68A` |
| Status Danger (Quarantined Red) | `#9B1C2A` (CR 8.10:1) | `#FDF2F4` | `#F1707A` |
| Status Info (Deep Ocean) | `#134B5E` (CR 8.65:1) | `#EBF5FB` | `#AED6F1` |

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
