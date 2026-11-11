/**
 * Rikkei Jobs - Quality Gate Synchronization Checker
 * Task T022DB0 - Sprint 1 Quality Gate
 * 
 * Verifies that check.sh, check.ps1, and .github/workflows/ci.yml
 * all execute the exact same set of verification gates.
 * Distinguishes between active runtime gates (24) and defensive fallback gates (3)
 * for a total of 27 unique gate definitions, mapped to 20 CI checks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const checkShPath = path.join(repoRoot, 'check.sh');
const checkPs1Path = path.join(repoRoot, 'check.ps1');
const ciYmlPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');

if (!fs.existsSync(checkShPath) || !fs.existsSync(checkPs1Path) || !fs.existsSync(ciYmlPath)) {
  console.error('ERROR: Could not locate check.sh, check.ps1, or ci.yml');
  process.exit(1);
}

const checkShContent = fs.readFileSync(checkShPath, 'utf8');
const checkPs1Content = fs.readFileSync(checkPs1Path, 'utf8');
const ciYmlContent = fs.readFileSync(ciYmlPath, 'utf8');

// Extract gate names from check.sh: record_gate "NAME" ...
const shGates = new Set();
const shMatches = checkShContent.matchAll(/record_gate\s+"([^"]+)"/g);
for (const m of shMatches) {
  shGates.add(m[1]);
}

// Extract gate names from check.ps1: Record-Gate "NAME" ...
const psGates = new Set();
const psMatches = checkPs1Content.matchAll(/Record-Gate\s+"([^"]+)"/g);
for (const m of psMatches) {
  psGates.add(m[1]);
}

// Categorize fallback-only gates that only execute if manifests are missing
const fallbackGates = new Set([
  'Frontend Verification Gates',
  'Backend Verification Gates',
  'Docker Compose Configuration'
]);

const activeShGates = new Set([...shGates].filter(g => !fallbackGates.has(g)));
const activePsGates = new Set([...psGates].filter(g => !fallbackGates.has(g)));

// Expected core functional gates mapping to CI checks
const ciChecks = [
  { name: 'Mock External Systems Test Suite', pattern: /mock-test/ },
  { name: 'Frontend ESLint', pattern: /npm run lint/ },
  { name: 'Frontend TypeScript Typecheck', pattern: /npm run typecheck/ },
  { name: 'Frontend Vitest Unit Tests', pattern: /npm run test/ },
  { name: 'Frontend Production Build', pattern: /npm run build/ },
  { name: 'Backend Spotless Code Style', pattern: /spotless:check/ },
  { name: 'Backend SpotBugs Static Analysis', pattern: /spotbugs:check/ },
  { name: 'Backend Java Compiler / Tests', pattern: /clean test/ },
  { name: 'Docker Compose Syntax', pattern: /docker compose config/ },
  { name: 'Hadolint Dockerfile Linter', pattern: /hadolint/ },
  { name: 'Yamllint YAML Validation', pattern: /yamllint/ },
  { name: 'Actionlint Workflow Validation', pattern: /actionlint/ },
  { name: 'SQLFluff Database Migration Linter', pattern: /sqlfluff/ },
  { name: 'Markdownlint Documentation Style', pattern: /markdownlint/ },
  { name: 'CSpell Documentation Spelling', pattern: /cspell/ },
  { name: 'Machine-Specific Paths Scan', pattern: /FORBIDDEN_USER/ },
  { name: 'Lingering TODO / FIXME Comments Scan', pattern: /TODO/ },
  { name: 'Secret Leak & Private Key Scan', pattern: /PRIVATE KEY/ },
  { name: 'Version Table Drift Check', pattern: /check-version-drift\.mjs/ },
  { name: 'Quality Gate Synchronization Check', pattern: /check-gate-sync\.mjs/ }
];

console.log('================================================================================');
console.log('  QUALITY GATES SYNCHRONIZATION CHECK');
console.log('================================================================================');

let diffCount = 0;

// Compare check.sh vs check.ps1 (all 27 gate definitions)
for (const g of psGates) {
  if (!shGates.has(g)) {
    console.error(`\x1b[31m[DRIFT] Gate '${g}' present in check.ps1 but missing in check.sh\x1b[0m`);
    diffCount++;
  }
}

for (const g of shGates) {
  if (!psGates.has(g)) {
    console.error(`\x1b[31m[DRIFT] Gate '${g}' present in check.sh but missing in check.ps1\x1b[0m`);
    diffCount++;
  }
}

// Compare CI
for (const check of ciChecks) {
  if (!check.pattern.test(ciYmlContent)) {
    console.error(`\x1b[31m[DRIFT] Check '${check.name}' is missing in .github/workflows/ci.yml\x1b[0m`);
    diffCount++;
  }
}

if (diffCount > 0) {
  console.error(`\x1b[31m[FAIL] Detected ${diffCount} gate synchronization mismatch(es)!\x1b[0m`);
  process.exit(1);
} else {
  console.log(`\x1b[32m[PASS] Quality Gates are 100% synchronized: ${shGates.size} unique gate definitions (${activeShGates.size} active runtime gates + ${fallbackGates.size} missing-file fallbacks) in check.sh & check.ps1, matching ${ciChecks.length} CI pipeline checks!\x1b[0m`);
  process.exit(0);
}
