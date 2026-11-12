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

| Preset Name | Mass ($m$) | Stiffness ($k$) | Damping ($c$) | Damping Ratio ($\zeta$) | Regime | Settling Time ($t_s \pm 2\%$) | Overshoot ($M_p$) | Primary UI Roles |
|---|---|---|---|---|---|---|---|---|
| **`snappy`** | 1.0 | 400 | 30 | 0.750 | Lightly Underdamped | ~260ms | ~2.8% | Button clicks, toggle switches, tab indicators, dropdown lists |
| **`gentle`** | 1.0 | 170 | 26 | 0.997 | Critically Damped | ~400ms | 0.0% | Modal dialogs, slide-over drawers, expanding panels |
| **`stiff`** | 1.0 | 380 | 32 | 0.821 | Sub-critical Underdamped | ~250ms | ~1.2% | Tooltips, badge counters, focus rings |
| **`bouncy-subtle`** | 1.0 | 220 | 18 | 0.607 | Underdamped Resonant | ~440ms | ~8.9% | Verified skill checkmark, bookmark saved confirmation |

---

## 3. CSS linear() Function Approximations

CSS Easing Level 2 defines `linear()` as a piecewise linear interpolation function that approximates complex spring curves at zero runtime cost and zero JavaScript overhead.

### 3.1. Preset `snappy`

```css
/* Stiffness: 400, Damping: 30, Mass: 1.0, Duration: 260ms */
--rj-ease-spring-snappy: linear(
  0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 24.4%, 
  0.852 30.2%, 0.941 37%, 0.985 44.5%, 1.006 52.8%, 1.011 59.8%, 
  1 76.5%, 1
);
```

### 3.2. Preset `gentle`

```css
/* Stiffness: 170, Damping: 26, Mass: 1.0, Duration: 400ms */
--rj-ease-spring-gentle: linear(
  0, 0.003, 0.012 2.1%, 0.05 4.6%, 0.287 14.8%, 0.548 24.4%, 
  0.738 34.1%, 0.865 44.2%, 0.938 54.7%, 0.976 65.6%, 0.993 77.2%, 
  1
);
```

### 3.3. Preset `stiff`

```css
/* Stiffness: 380, Damping: 32, Mass: 1.0, Duration: 250ms */
--rj-ease-spring-stiff: linear(
  0, 0.009, 0.038 2.5%, 0.156 5.8%, 0.652 16.5%, 0.835 21.8%, 
  0.938 27.2%, 0.987 33.5%, 1.007 41.2%, 1.008 48.5%, 1 65%, 1
);
```

### 3.4. Preset `bouncy-subtle`

```css
/* Stiffness: 220, Damping: 18, Mass: 1.0, Duration: 440ms */
--rj-ease-spring-bouncy: linear(
  0, 0.005, 0.021 2.3%, 0.084 5.1%, 0.462 16.2%, 0.655 21.3%, 
  0.814 27%, 0.929 33.3%, 0.998 40.5%, 1.034 48.2%, 1.042 55.6%, 
  1.03 63.8%, 1.009 73.1%, 0.998 83.2%, 1
);
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
