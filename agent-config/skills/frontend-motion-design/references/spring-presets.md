# Rikkei Jobs Spring Physics Presets & CSS linear() Approximations

This technical reference details the mathematical formulation of damped harmonic oscillations, parameter specifications for the 4 standard Rikkei Jobs spring presets, and numerical sampling algorithms for CSS Easing Level 2 `linear()` curves.

---

## 1. Mathematical Formulation

The physical motion of UI components in Rikkei Jobs is governed by the second-order linear ordinary differential equation for a damped harmonic oscillator:

$$m \frac{d^2 x}{dt^2} + c \frac{dx}{dt} + k x = 0$$

Where:

- $m$: Mass of the interface object, normalized to $m = 1.0\text{ kg}$.
- $k$: Spring stiffness ($N/m$), controlling the acceleration toward equilibrium.
- $c$: Damping coefficient ($N \cdot s/m$), dissipating mechanical energy.

From these parameters, the characteristic physical constants are derived:

- Natural undamped angular frequency: $\omega_0 = \sqrt{\frac{k}{m}}$
- Damping ratio: $\zeta = \frac{c}{2 \sqrt{k \cdot m}}$
- Damped angular frequency (for $\zeta < 1$): $\omega_d = \omega_0 \sqrt{1 - \zeta^2}$

### Analytical Position Equation (Underdamped: $\zeta < 1$)

For an initial displacement $x(0) = -1$ (starting offset) and release from rest $v(0) = 0$ toward target $x = 0$:

$$x(t) = 1 - e^{-\zeta \omega_0 t} \left( \cos(\omega_d t) + \frac{\zeta \omega_0}{\omega_d} \sin(\omega_d t) \right)$$

### Settling Time ($t_s$) and Overshoot ($M_p$)

- Settling time to within $2\%$ of target: $t_s \approx \frac{4}{\zeta \omega_0}$ (or numerically measured).
- Peak overshoot ratio: $M_p = e^{-\frac{\pi \zeta}{\sqrt{1 - \zeta^2}}}$

---

## 2. Standard Spring Presets Table

| Preset Name | Regime | Settling Feel | Primary UI Roles |
|---|---|---|---|
| **`snappy`** | Lightly Underdamped (~1% overshoot) | Crisp, immediate | Toggle switches, active buttons, tab indicators, Select chevron |
| **`gentle`** | Critically Damped (0% overshoot) | Smooth settle | Modal dialogs, slide-over drawers, sidebar expanders |
| **`stiff`** | Sub-critical (<0.5% overshoot) | Fast, firm | Tooltips, badge counters, focus indicators |

---

## 3. CSS linear() Function Approximations (Aligned with `design-tokens.css`)

CSS Easing Level 2 defines `linear()` as a piecewise linear interpolation function that approximates physical spring curves at zero runtime cost and zero JavaScript overhead. Always provide `cubic-bezier(...)` fallbacks on `:root` before `@supports (animation-timing-function: linear(0, 1))`.

### 3.1. Preset `snappy`

```css
--rj-ease-spring-snappy: linear(0, 0.04 3%, 0.56 17%, 0.92 32%, 1.01 55%, 1);
```

### 3.2. Preset `gentle`

```css
--rj-ease-spring-gentle: linear(0, 0.02 3%, 0.34 15%, 0.79 35%, 0.96 58%, 0.995 80%, 1);
```

### 3.3. Preset `stiff`

```css
--rj-ease-spring-stiff: linear(0, 0.04 3%, 0.64 16%, 0.95 31%, 1.003 53%, 1);
```

---

## 4. Sampling Algorithm: Semi-Implicit Euler Integrator

The following TypeScript reference implementation demonstrates how to generate CSS `linear()` point strings from arbitrary physical spring parameters:

```typescript
export interface SpringConfig {
  mass: number;
  stiffness: number;
  damping: number;
  threshold?: number;
}

export function generateLinearSpring(config: SpringConfig): string {
  const { mass, stiffness, damping, threshold = 0.001 } = config;
  const dt = 1 / 120; // 120Hz numerical integration step
  let x = 0;          // Initial normalized position
  let v = 0;          // Initial velocity
  const target = 1.0; // Target normalized position
  
  const points: { progress: number; value: number }[] = [];
  let t = 0;
  let settled = false;

  while (!settled && t < 2.0) { // Safety cap at 2 seconds
    const springForce = -stiffness * (x - target);
    const dampingForce = -damping * v;
    const a = (springForce + dampingForce) / mass;
    
    v += a * dt;
    x += v * dt;
    t += dt;

    if (Math.abs(x - target) < threshold && Math.abs(v) < threshold) {
      settled = true;
    }
    points.push({ progress: t, value: Number(x.toFixed(4)) });
  }

  const totalDuration = t;
  // Downsample to 12-16 significant keypoints
  const sampledPoints = downsampleKeypoints(points, totalDuration, 14);
  
  const tokens = sampledPoints.map(p => {
    const pct = ((p.progress / totalDuration) * 100).toFixed(1);
    return `${p.value} ${pct}%`;
  });

  return `linear(0, ${tokens.join(', ')}, 1)`;
}

function downsampleKeypoints(
  all: { progress: number; value: number }[],
  total: number,
  targetCount: number
): { progress: number; value: number }[] {
  const step = Math.floor(all.length / targetCount);
  const result: { progress: number; value: number }[] = [];
  for (let i = step; i < all.length - 1; i += step) {
    result.push(all[i]);
  }
  return result;
}
```
