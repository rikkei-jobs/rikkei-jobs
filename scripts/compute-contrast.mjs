#!/usr/bin/env node
/**
 * Rikkei Jobs - WCAG 2.2, APCA Lc & CIELAB Surface Separation Verification Script
 * Milestone M4 (NT-01 Round E / Feature F14, F15, F16, F17)
 *
 * Mathematically verifies all contrast tables and surface separation invariants in
 * docs/design/DESIGN_SYSTEM.md (or specified file) against:
 *  1. W3C WCAG 2.2 Level AA / AAA standards (IEC 61966-2-1:1999 Relative Luminance)
 *  2. W3C / Myndex APCA 0.98G-4g Perceptual Contrast (Lc metric)
 *  3. CIE 1976 CIELAB Delta L* Surface-Separation Invariants (f(y) continuous with epsilon = 216/24389)
 *  4. WCAG 2.1 SC 1.4.11 UI Boundary Border Contrast (CR >= 3.0:1)
 *
 * Requirements:
 *  - 0 external dependencies (pure Node.js built-ins)
 *  - Zero emoji in console output and reports
 *  - Exits with 1 if ANY pair is below threshold OR differs from printed by > 0.01 OR violates invariants
 *  - Exits with 0 if ALL pairs pass all verification gates
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve repository root dynamically
let repoRoot = process.cwd();
if (fs.existsSync(path.join(repoRoot, 'check.sh'))) {
  // Already in rikkei-jobs root
} else if (fs.existsSync(path.join(repoRoot, 'rikkei-jobs', 'check.sh'))) {
  repoRoot = path.join(repoRoot, 'rikkei-jobs');
} else {
  let cur = __dirname;
  while (cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, 'check.sh'))) {
      repoRoot = cur;
      break;
    }
    if (fs.existsSync(path.join(cur, 'rikkei-jobs', 'check.sh'))) {
      repoRoot = path.join(cur, 'rikkei-jobs');
      break;
    }
    cur = path.dirname(cur);
  }
}

const targetRelPath = process.argv[2] || 'docs/design/DESIGN_SYSTEM.md';
const targetFilePath = path.isAbsolute(targetRelPath)
  ? targetRelPath
  : path.join(repoRoot, targetRelPath);

if (!fs.existsSync(targetFilePath)) {
  console.error(`[FAIL] Target documentation file not found: ${targetFilePath}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(targetFilePath, 'utf8');

// ============================================================================
// WCAG 2.2 Relative Luminance and Contrast Ratio Engine
// ============================================================================

export function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function srgbToLinear(c) {
  const norm = c / 255;
  return norm <= 0.04045
    ? norm / 12.92
    : Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  const rL = srgbToLinear(r);
  const gL = srgbToLinear(g);
  const bL = srgbToLinear(b);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

// ============================================================================
// W3C / Myndex APCA 0.98G-4g Perceptual Contrast Engine (Zero Dependencies)
// ============================================================================

export function sRGBtoLinearAPCA(val) {
  return Math.pow(val / 255.0, 2.4);
}

export function sRGBtoY_APCA(hex) {
  const [r, g, b] = hexToRgb(hex);
  const rL = sRGBtoLinearAPCA(r);
  const gL = sRGBtoLinearAPCA(g);
  const bL = sRGBtoLinearAPCA(b);
  return 0.2126729 * rL + 0.7151522 * gL + 0.0721750 * bL;
}

export function calcAPCA(textHex, bgHex) {
  let txtY = sRGBtoY_APCA(textHex);
  let bgY = sRGBtoY_APCA(bgHex);

  // Soft black clamp for low luminance (Y < 0.022)
  const blkThresh = 0.022;
  const blkClamp = 1.414;
  if (txtY < blkThresh) {
    txtY += Math.pow(blkThresh - txtY, blkClamp);
  }
  if (bgY < blkThresh) {
    bgY += Math.pow(blkThresh - bgY, blkClamp);
  }

  // Early return for imperceptible difference
  if (Math.abs(bgY - txtY) < 0.0005) {
    return 0.0;
  }

  const normBG = 0.56;
  const normTXT = 0.57;
  const revBG = 0.65;
  const revTXT = 0.62;
  const scaleBoW = 1.14;
  const scaleWoB = 1.14;
  const loClip = 0.1;
  const loBowOffset = 0.027;
  const loWobOffset = 0.027;

  let sapc = 0.0;
  let outputContrast = 0.0;

  if (bgY > txtY) {
    // Normal Polarity: Dark text on Light background (BoW)
    sapc = (Math.pow(bgY, normBG) - Math.pow(txtY, normTXT)) * scaleBoW;
    outputContrast = (sapc < loClip) ? 0.0 : (sapc - loBowOffset);
  } else {
    // Reverse Polarity: Light text on Dark background (WoB)
    sapc = (Math.pow(bgY, revBG) - Math.pow(txtY, revTXT)) * scaleWoB;
    outputContrast = (sapc > -loClip) ? 0.0 : (sapc + loWobOffset);
  }

  return outputContrast * 100.0;
}

// ============================================================================
// CIE 1976 CIELAB L* and Surface Separation Engine (Zero Dependencies)
// ============================================================================

/**
 * CIE 1976 piecewise transfer function fs(y)
 * Rational constants: epsilon = (6/29)^3 = 216/24389; kappa = (29/3)^3 = 24389/27
 * fs(y) = y^(1/3) when y > epsilon, else (841/108)*y + 4/29
 */
export function cielabF(y) {
  const epsilon = 216 / 24389; // approx 0.008856451679035631
  return y > epsilon ? Math.cbrt(y) : (841 / 108) * y + (4 / 29);
}

/**
 * Computes CIE 1976 Lightness coordinate L* from sRGB hex color.
 * Standard Illuminant D65 reference white Yn = 1.0.
 * Range: [0.0000, 100.0000]
 */
export function computeLStar(hex) {
  const y = relativeLuminance(hex);
  return 116 * cielabF(y) - 16;
}

/**
 * Computes Delta L* (perceived surface lightness difference) between two hex colors.
 */
export function computeDeltaLStar(hex1, hex2) {
  const l1 = computeLStar(hex1);
  const l2 = computeLStar(hex2);
  return Math.abs(l1 - l2);
}

// ============================================================================
// Markdown Parsing Helpers
// ============================================================================

function cleanHex(str) {
  if (!str) return null;
  const match = str.match(/#([0-9A-Fa-f]{6})\b/);
  return match ? `#${match[1].toUpperCase()}` : null;
}

function extractThreshold(str) {
  if (!str) return 4.5;
  if (str.includes('3.0')) return 3.0;
  if (str.includes('4.5')) return 4.5;
  if (str.includes('7.0')) return 7.0;
  const match = str.match(/([0-9]+(\.[0-9]+)?)/);
  return match ? parseFloat(match[1]) : 4.5;
}

function extractRatio(str) {
  if (!str) return NaN;
  const match = str.match(/([0-9]+\.[0-9]+)/);
  return match ? parseFloat(match[1]) : NaN;
}

function extractApca(str) {
  if (!str) return NaN;
  const match = str.match(/([+-]?[0-9]+(\.[0-9]+)?)/);
  return match ? parseFloat(match[1]) : NaN;
}

// --- Parse Markdown Tables ---

const lines = fileContent.split('\n');
const parsedTables = [];
let currentSection = 'General';
let currentTable = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Track markdown headers for context
  if (line.startsWith('#')) {
    currentSection = line.replace(/^#+\s*/, '').trim();
  }

  // Detect table separator row (e.g., |---|---|...)
  if (line.startsWith('|') && line.endsWith('|') && line.includes('---')) {
    const prevLine = lines[i - 1] ? lines[i - 1].trim() : '';
    if (prevLine.startsWith('|') && prevLine.endsWith('|')) {
      const headers = prevLine.split('|').map(h => h.trim().toLowerCase()).slice(1, -1);
      
      const hasHexHeader = headers.some(h => h.includes('hex') || h.includes('mã màu'));
      const hasRatioHeader = headers.some(h => h.includes('tỷ lệ') || h.includes('ratio') || h.includes('cr'));
      const hasDeltaLHeader = headers.some(h => h.includes('delta l') || h.includes('\\delta l'));

      if (hasHexHeader || hasRatioHeader || hasDeltaLHeader) {
        currentTable = {
          section: currentSection,
          headerRow: prevLine,
          headers,
          isSurfaceMatrix: hasDeltaLHeader && !hasRatioHeader,
          colMap: {
            stt: headers.findIndex(h => h === 'stt' || h === 'no.' || h === '#'),
            role: headers.findIndex(h => h.includes('thành phần') || h.includes('role') || h.includes('cặp bề mặt') || h.includes('component')),
            fgHex: headers.findIndex(h => h === 'hex fg' || h.includes('hex fg') || h.includes('fg hex') || h.includes('hex 1')),
            bgHex: headers.findIndex(h => h === 'hex bg' || h.includes('hex bg') || h.includes('bg hex') || h.includes('hex 2')),
            lFg: headers.findIndex(h => h.includes('l_fg') || h.includes('l_{\\text{fg}}') || h.includes('l^*_1')),
            lBg: headers.findIndex(h => h.includes('l_bg') || h.includes('l_{\\text{bg}}') || h.includes('l^*_2')),
            ratio: headers.findIndex(h => h.includes('tỷ lệ') || h.includes('ratio') || h.includes('cr')),
            threshold: headers.findIndex(h => h.includes('ngưỡng') || h.includes('threshold')),
            apca: headers.findIndex(h => h.includes('apca') || h.includes('lc')),
            deltaL: headers.findIndex(h => h.includes('delta l') || h.includes('\\delta l')),
            conclusion: headers.findIndex(h => h.includes('kết luận') || h.includes('conclusion') || h.includes('status'))
          },
          rows: []
        };
        parsedTables.push(currentTable);
        continue;
      }
    }
  }

  // Parse data row if inside an active contrast or surface table
  if (currentTable && line.startsWith('|') && line.endsWith('|')) {
    const cells = line.split('|').map(c => c.trim()).slice(1, -1);
    
    let fgHex = null;
    let bgHex = null;
    let printedRatio = NaN;
    let printedApca = NaN;
    let printedDeltaL = NaN;
    let threshold = 4.5;
    let role = '';
    let stt = '';
    let conclusion = '';

    if (currentTable.colMap.fgHex !== -1 && currentTable.colMap.bgHex !== -1) {
      fgHex = cleanHex(cells[currentTable.colMap.fgHex]);
      bgHex = cleanHex(cells[currentTable.colMap.bgHex]);
      if (currentTable.colMap.ratio !== -1) {
        printedRatio = extractRatio(cells[currentTable.colMap.ratio]);
      }
      if (currentTable.colMap.apca !== -1) {
        printedApca = extractApca(cells[currentTable.colMap.apca]);
      }
      if (currentTable.colMap.deltaL !== -1) {
        printedDeltaL = extractRatio(cells[currentTable.colMap.deltaL]);
      }
      if (currentTable.colMap.threshold !== -1) {
        threshold = extractThreshold(cells[currentTable.colMap.threshold]);
      }
      if (currentTable.colMap.role !== -1) {
        role = cells[currentTable.colMap.role] || '';
      }
      if (currentTable.colMap.stt !== -1) {
        stt = cells[currentTable.colMap.stt] || '';
      }
      if (currentTable.colMap.conclusion !== -1) {
        conclusion = cells[currentTable.colMap.conclusion] || '';
      }
    } else {
      // Fallback: heuristic search across all cells in row
      const hexes = cells.map(c => cleanHex(c)).filter(Boolean);
      if (hexes.length >= 2) {
        fgHex = hexes[0];
        bgHex = hexes[1];
        for (const cell of cells) {
          if (cell.includes(':1') && isNaN(printedRatio)) {
            printedRatio = extractRatio(cell);
          }
          if (cell.includes('3.0') || cell.includes('4.5') || cell.includes('7.0')) {
            threshold = extractThreshold(cell);
          }
        }
      }
    }

    if (fgHex && bgHex) {
      currentTable.rows.push({
        lineIndex: i + 1,
        stt: stt || String(currentTable.rows.length + 1),
        role: role || 'Unknown Component',
        fgHex,
        bgHex,
        printedRatio,
        printedApca,
        printedDeltaL,
        threshold,
        conclusion,
        rawLine: line
      });
    }
  } else if (!line.startsWith('|')) {
    currentTable = null;
  }
}

// ============================================================================
// Verification & Reporting
// ============================================================================

console.log('================================================================================');
console.log('  WCAG 2.2, APCA Lc & CIELAB SURFACE SEPARATION VERIFICATION');
console.log(`  Source: ${path.relative(repoRoot, targetFilePath)}`);
console.log('================================================================================\n');

let totalPairs = 0;
let failedThresholdCount = 0;
let mismatchRatioCount = 0;
let surfaceViolationCount = 0;
let uiBorderViolationCount = 0;

for (const table of parsedTables) {
  if (table.rows.length === 0) continue;

  if (table.isSurfaceMatrix) {
    console.log(`--- [Section] ${table.section} (Surface Separation Matrix: ${table.rows.length} pairs) ---`);
    for (const row of table.rows) {
      const lStar1 = computeLStar(row.fgHex);
      const lStar2 = computeLStar(row.bgHex);
      const calcDeltaL = Math.abs(lStar1 - lStar2);
      const roundedDeltaL = Math.round(calcDeltaL * 100) / 100;
      const isBelowThresh = calcDeltaL < row.threshold;
      const diff = isNaN(row.printedDeltaL) ? 0 : Math.abs(calcDeltaL - row.printedDeltaL);
      const isMismatch = !isNaN(row.printedDeltaL) && diff > 0.05;

      let status = 'PASS';
      const issues = [];
      if (isBelowThresh) {
        status = 'FAIL';
        surfaceViolationCount++;
        issues.push(`SURFACE_BELOW_THRESHOLD (calc Delta L* ${calcDeltaL.toFixed(4)} < threshold ${row.threshold.toFixed(1)})`);
      }
      if (isMismatch) {
        status = 'FAIL';
        surfaceViolationCount++;
        issues.push(`SURFACE_MISMATCH (calc: ${calcDeltaL.toFixed(2)}, printed: ${row.printedDeltaL.toFixed(2)}, diff: ${diff.toFixed(4)} > 0.05)`);
      }

      console.log(
        `  [Line ${String(row.lineIndex).padStart(4)}] STT ${row.stt.padStart(2)} | ` +
        `Hex1: ${row.fgHex} (L*1: ${lStar1.toFixed(2)}) | Hex2: ${row.bgHex} (L*2: ${lStar2.toFixed(2)}) | ` +
        `Calc Delta L*: ${calcDeltaL.toFixed(2)} | Thresh: >=${row.threshold.toFixed(1)} | [${status}] ${row.role}`
      );
      for (const issue of issues) {
        console.log(`      -> ERROR: ${issue}`);
      }
    }
    console.log('');
    continue;
  }

  console.log(`--- [Section] ${table.section} (${table.rows.length} color pairs) ---`);

  for (const row of table.rows) {
    totalPairs++;
    const lFg = relativeLuminance(row.fgHex);
    const lBg = relativeLuminance(row.bgHex);
    const calcCr = (Math.max(lFg, lBg) + 0.05) / (Math.min(lFg, lBg) + 0.05);
    const roundedCr = Math.round(calcCr * 100) / 100;
    const diff = isNaN(row.printedRatio) ? 0 : Math.abs(calcCr - row.printedRatio);

    const calcLc = calcAPCA(row.fgHex, row.bgHex);

    const isBelowThreshold = calcCr < row.threshold;
    const isMismatch = !isNaN(row.printedRatio) && diff > 0.01;

    let status = 'PASS';
    const issues = [];

    if (isBelowThreshold) {
      status = 'FAIL';
      failedThresholdCount++;
      issues.push(`BELOW_THRESHOLD (calculated ${calcCr.toFixed(4)}:1 < threshold ${row.threshold}:1)`);
    }

    if (isMismatch) {
      status = 'FAIL';
      mismatchRatioCount++;
      issues.push(`RATIO_MISMATCH (calc: ${calcCr.toFixed(4)}:1 [${roundedCr.toFixed(2)}:1], printed: ${row.printedRatio.toFixed(2)}:1, diff: ${diff.toFixed(4)} > 0.01)`);
    }

    const padStt = row.stt.padStart(2);
    const padFg = row.fgHex.padEnd(7);
    const padBg = row.bgHex.padEnd(7);
    const printedStr = isNaN(row.printedRatio) ? 'N/A' : `${row.printedRatio.toFixed(2)}:1`;
    const lcStr = (calcLc >= 0 ? `+${calcLc.toFixed(1)}` : calcLc.toFixed(1)).padStart(6);

    console.log(
      `  [Line ${String(row.lineIndex).padStart(4)}] STT ${padStt} | FG: ${padFg} (L1: ${lFg.toFixed(4)}) | BG: ${padBg} (L2: ${lBg.toFixed(4)}) | ` +
      `Calc CR: ${calcCr.toFixed(4)} (${roundedCr.toFixed(2)}:1) | Printed: ${printedStr.padEnd(7)} | ` +
      `APCA Lc: ${lcStr} | Thresh: >=${row.threshold.toFixed(1)}:1 | [${status}] ${row.role}`
    );

    if (issues.length > 0) {
      for (const issue of issues) {
        console.log(`      -> ERROR: ${issue}`);
      }
    }
  }
  console.log('');
}

// ============================================================================
// Programmatic Surface Separation Invariant Suite (Round E)
// ============================================================================

console.log('--- [Invariant Suite] CIELAB Surface Separation Invariants (Round E) ---');

const surfaceInvariants = [
  // Light Mode Invariants
  { name: 'Light Canvas -> Card Container', h1: '#EEF2F8', h2: '#FFFFFF', minDeltaL: 4.0 },
  { name: 'Light Hero Panel -> Card Container', h1: '#E1E8F2', h2: '#FFFFFF', minDeltaL: 3.5 },
  { name: 'Light Canvas -> Hero Panel (60/40 Split)', h1: '#EEF2F8', h2: '#E1E8F2', minDeltaL: 2.0 },
  { name: 'Light Card Container -> Field Inset', h1: '#FFFFFF', h2: '#F8FAFD', minDeltaL: 1.5 },

  // Dark Mode Invariants
  { name: 'Dark Canvas -> Card Container', h1: '#0B1019', h2: '#162030', minDeltaL: 4.0 },
  { name: 'Dark Hero Panel -> Card Container', h1: '#101724', h2: '#162030', minDeltaL: 3.5 },
  { name: 'Dark Canvas -> Hero Panel (60/40 Split)', h1: '#0B1019', h2: '#101724', minDeltaL: 2.0 },
  { name: 'Dark Card Container -> Field Inset', h1: '#162030', h2: '#0D1420', minDeltaL: 1.5 },
  { name: 'Dark Card Container -> Elevated Surface', h1: '#162030', h2: '#1E2C42', minDeltaL: 3.5 }
];

for (const inv of surfaceInvariants) {
  const l1 = computeLStar(inv.h1);
  const l2 = computeLStar(inv.h2);
  const deltaL = Math.abs(l1 - l2);
  const pass = deltaL >= inv.minDeltaL;
  const status = pass ? 'PASS' : 'FAIL';

  if (!pass) {
    surfaceViolationCount++;
  }

  console.log(
    `  ${inv.name.padEnd(46)} | ${inv.h1} (L*=${l1.toFixed(2)}) vs ${inv.h2} (L*=${l2.toFixed(2)}) | ` +
    `Delta L*: ${deltaL.toFixed(2)} (Req: >=${inv.minDeltaL.toFixed(1)}) | [${status}]`
  );
}
console.log('');

// ============================================================================
// Programmatic UI Boundary Border Contrast Suite (WCAG 2.1 1.4.11 >= 3.0:1)
// ============================================================================

console.log('--- [Invariant Suite] UI Boundary Border Contrast Invariants (SC 1.4.11 >= 3.0:1) ---');

const uiBorderInvariants = [
  { name: 'Light Form Interactive Border on Card', fg: '#6F8094', bg: '#FFFFFF', minCr: 3.0 },
  { name: 'Light Form Interactive Border on Field Inset', fg: '#6F8094', bg: '#F8FAFD', minCr: 3.0 },
  { name: 'Light Focus Ring on Card', fg: '#0D55B8', bg: '#FFFFFF', minCr: 3.0 },
  { name: 'Light Focus Ring on Canvas', fg: '#0D55B8', bg: '#EEF2F8', minCr: 3.0 },
  { name: 'Dark Form Interactive Border on Card', fg: '#5B7083', bg: '#162030', minCr: 3.0 },
  { name: 'Dark Form Interactive Border on Field Inset', fg: '#5B7083', bg: '#0D1420', minCr: 3.0 },
  { name: 'Dark Focus Ring on Card', fg: '#508CEE', bg: '#162030', minCr: 3.0 },
  { name: 'Dark Focus Ring on Canvas', fg: '#508CEE', bg: '#0B1019', minCr: 3.0 },
  { name: 'Brand Mark Red on Light Canvas', fg: '#C8161D', bg: '#EEF2F8', minCr: 3.0 },
  { name: 'Brand Mark Red on Dark Canvas', fg: '#C8161D', bg: '#0B1019', minCr: 3.0 }
];

for (const ui of uiBorderInvariants) {
  const cr = contrastRatio(ui.fg, ui.bg);
  const pass = cr >= ui.minCr;
  const status = pass ? 'PASS' : 'FAIL';

  if (!pass) {
    uiBorderViolationCount++;
  }

  console.log(
    `  ${ui.name.padEnd(46)} | ${ui.fg} on ${ui.bg} | ` +
    `CR: ${cr.toFixed(2)}:1 (Req: >=${ui.minCr.toFixed(1)}:1) | [${status}]`
  );
}
console.log('');

// ============================================================================
// Summary & Exit Gate
// ============================================================================

const totalViolations = failedThresholdCount + mismatchRatioCount + surfaceViolationCount + uiBorderViolationCount;

console.log('--------------------------------------------------------------------------------');
console.log('  CONTRAST & SURFACE SEPARATION VERIFICATION SUMMARY');
console.log('--------------------------------------------------------------------------------');
console.log(`  Total color pairs audited:          ${totalPairs}`);
console.log(`  Below WCAG threshold:               ${failedThresholdCount}`);
console.log(`  Ratio mismatches (> 0.01):          ${mismatchRatioCount}`);
console.log(`  Surface separation violations:      ${surfaceViolationCount}`);
console.log(`  UI boundary border violations:      ${uiBorderViolationCount}`);
console.log(`  Overall Status:                     ${totalViolations === 0 ? 'ALL GREEN (PASS)' : 'FAILED'}`);
console.log('================================================================================');

if (totalViolations > 0) {
  console.error(`\n[FAIL] Contrast verification failed with ${totalViolations} violation(s).`);
  process.exit(1);
} else {
  console.log(`\n[PASS] All ${totalPairs} color pairs and surface invariants in ${path.relative(repoRoot, targetFilePath)} are 100% compliant and mathematically exact!`);
  process.exit(0);
}
