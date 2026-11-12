# Multi-Breakpoint Screenshot Review Protocol

This protocol defines the verification procedure for inspecting visual fidelity and responsive integrity across 4 standardized viewports:

- 375 x 667 px (Mobile Portrait)
- 768 x 1024 px (Tablet Portrait)
- 1024 x 768 px (Desktop)
- 1440 x 900 px (Wide Screen)

---

## 1. Mechanical Horizontal Overflow Invalidation Check

A view FAILS immediately if horizontal scrolling is detected at any breakpoint.

Verification script assertion:

```javascript
const scrollWidth = document.documentElement.scrollWidth;
const clientWidth = document.documentElement.clientWidth;
if (scrollWidth > clientWidth) {
  throw new Error(`FAIL: Horizontal scroll detected! scrollWidth (${scrollWidth}px) > clientWidth (${clientWidth}px)`);
}
```

---

## 2. Automated Inspection via Playwright Script

Create and execute `scripts/verify-screenshots.mjs`:

```javascript
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1024, height: 768 },
  { name: 'widescreen', width: 1440, height: 900 }
];

const TARGET_URL = process.env.TEST_URL || 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('docs/visual-proofs');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    console.log(`Auditing viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

    // Assert zero horizontal overflow
    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasSpill: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    });

    if (overflow.hasSpill) {
      console.error(`[FAIL] ${vp.name}: Horizontal spill detected (${overflow.scrollWidth} > ${overflow.clientWidth})`);
      process.exitCode = 1;
    } else {
      console.log(`[PASS] ${vp.name}: Clean layout with 0 horizontal spill.`);
    }

    // Capture visual proof
    const screenshotPath = path.join(OUTPUT_DIR, `${vp.name}-${vp.width}x${vp.height}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }

  await browser.close();
})();
```

---

## 3. Manual Inspection via Chrome DevTools

1. Open target view in Google Chrome.
2. Press `Ctrl + Shift + I` (or `F12`), then press `Ctrl + Shift + M` to toggle Device Toolbar.
3. In the dimension dropdown, test sequentially:
   - **375px**: Verify mobile navigation collapses into hamburger menu; verify touch target padding >= 44x44px; verify `window.scrollX === 0`.
   - **768px**: Verify 2-column card wrapping; verify tablet header adapts cleanly.
   - **1024px**: Verify 12-column asymmetric layout engages (65/35 ratio).
   - **1440px**: Verify max-width container centers content with balanced margins (`max-width: 1360px`).
4. In DevTools Console, paste:

   ```javascript
   console.log('Horizontal Spill:', document.documentElement.scrollWidth > document.documentElement.clientWidth ? 'FAIL' : 'PASS');
   ```
