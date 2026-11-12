/**
 * Rikkei Jobs - Quality Gate Synchronization Checker & Mechanical Drift Guard
 * Task T022DB0 - Sprint 1 Quality Gate (Milestone 2 - B10)
 * 
 * Verifies 100% synchronization across 4 core execution artifacts:
 *   1. check.sh (Bash quality gate runner)
 *   2. check.ps1 (PowerShell quality gate runner)
 *   3. .github/workflows/ci.yml (GitHub Actions remote CI pipeline)
 *   4. scripts/run-ci-in-docker.sh (Clean isolated Docker CI runner harness)
 * 
 * Enforces:
 *   - Parity between check.sh and check.ps1 across 28 gate definitions (25 active + 3 fallback)
 *   - Coverage of 22 core functional verification gates in ci.yml
 *   - Bidirectional mechanical drift guard across 24 synchronized gates between ci.yml and Docker harness
 *   - Strict ZERO EMOJI compliance with plain text PASS/FAIL/DRIFT strings
 *   - Exit Code 1 on any detected drift, Exit Code 0 on 100% synchronization
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve repository root dynamically across direct and parent invocation contexts
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
const dockerHarnessShPath = path.join(repoRoot, 'scripts', 'run-ci-in-docker.sh');
const dockerHarnessPs1Path = path.join(repoRoot, 'scripts', 'run-ci-in-docker.ps1');

if (!fs.existsSync(checkShPath) || !fs.existsSync(checkPs1Path) || !fs.existsSync(ciYmlPath) || !fs.existsSync(dockerHarnessShPath)) {
  console.error('[FAIL] Could not locate check.sh, check.ps1, ci.yml, or scripts/run-ci-in-docker.sh');
  process.exit(1);
}

const checkShContent = fs.readFileSync(checkShPath, 'utf8');
const checkPs1Content = fs.readFileSync(checkPs1Path, 'utf8');
const ciYmlContent = fs.readFileSync(ciYmlPath, 'utf8');
const dockerHarnessShContent = fs.readFileSync(dockerHarnessShPath, 'utf8');

console.log('================================================================================');
console.log('  QUALITY GATES SYNCHRONIZATION CHECK & MECHANICAL DRIFT GUARD');
console.log('================================================================================');

let diffCount = 0;

// -----------------------------------------------------------------------------
// PHASE 1: Parity Check between check.sh and check.ps1
// -----------------------------------------------------------------------------
const shGates = new Set();
const shMatches = checkShContent.matchAll(/record_gate\s+"([^"]+)"/g);
for (const m of shMatches) {
  shGates.add(m[1]);
}

const psGates = new Set();
const psMatches = checkPs1Content.matchAll(/Record-Gate\s+"([^"]+)"/g);
for (const m of psMatches) {
  psGates.add(m[1]);
}

// Defensive fallback-only gates that only execute if manifests are missing
const fallbackGates = new Set([
  'Frontend Verification Gates',
  'Backend Verification Gates',
  'Docker Compose Configuration'
]);

const activeShGates = new Set([...shGates].filter(g => !fallbackGates.has(g)));
const activePsGates = new Set([...psGates].filter(g => !fallbackGates.has(g)));

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

// -----------------------------------------------------------------------------
// PHASE 2: Core Functional Verification Gates in .github/workflows/ci.yml
// -----------------------------------------------------------------------------
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
  { name: 'Quality Gate Synchronization Check', pattern: /check-gate-sync\.mjs/ },
  { name: 'Agent Configuration Sync Check', pattern: /sync-agent-config\.mjs\s+--check/ },
  { name: 'Agent Configuration Validation', pattern: /validate-agent-config\.mjs/ }
];

for (const check of ciChecks) {
  if (!check.pattern.test(ciYmlContent)) {
    console.error(`\x1b[31m[DRIFT] Check '${check.name}' is missing in .github/workflows/ci.yml\x1b[0m`);
    diffCount++;
  }
}

// -----------------------------------------------------------------------------
// PHASE 3: Mechanical Drift Guard (ci.yml vs scripts/run-ci-in-docker.sh)
// -----------------------------------------------------------------------------
// Strip single-line comments (#...) so commented-out gates are correctly detected as drift
const stripComments = (str) => str.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
const activeCiContent = stripComments(ciYmlContent);
const activeHarnessContent = stripComments(dockerHarnessShContent);

const dockerHarnessSyncList = [
  { name: 'sync-agent-config.mjs --check', pattern: /sync-agent-config\.mjs\s+--check/ },
  { name: 'validate-agent-config.mjs', pattern: /validate-agent-config\.mjs/ },
  { name: 'check-version-drift.mjs', pattern: /check-version-drift\.mjs/ },
  { name: 'check-gate-sync.mjs', pattern: /check-gate-sync\.mjs/ },
  { name: 'markdownlint-cli2', pattern: /markdownlint-cli2/ },
  { name: 'cspell', pattern: /cspell/ },
  { name: 'yamllint', pattern: /yamllint/ },
  { name: 'hadolint', pattern: /hadolint/ },
  { name: 'actionlint', pattern: /actionlint/ },
  { name: 'sqlfluff', pattern: /sqlfluff/ },
  { name: 'spotless:check', pattern: /spotless:check/ },
  { name: 'spotbugs:check', pattern: /spotbugs:check/ },
  { name: 'mvnw clean test', pattern: /clean test/ },
  { name: 'npm run lint', pattern: /npm run lint/ },
  { name: 'npm run typecheck', pattern: /npm run typecheck/ },
  { name: 'npm run test', pattern: /npm run test/ },
  { name: 'npm run build', pattern: /npm run build/ },
  { name: 'docker compose config', pattern: /docker compose config/ },
  { name: 'docker compose build', pattern: /docker compose build/ },
  { name: 'mock service tests (npm test)', pattern: /npm test/ },
  { name: 'node e2e/run-all.mjs', pattern: /e2e\/run-all\.mjs/ },
  { name: 'machine-specific path leak scan', pattern: /FORBIDDEN_USER/ },
  { name: 'lingering TODO/FIXME scan', pattern: /TODO/ },
  { name: 'secret leak scan', pattern: /PRIVATE KEY/ }
];

for (const gate of dockerHarnessSyncList) {
  const inCi = gate.pattern.test(activeCiContent);
  const inHarness = gate.pattern.test(activeHarnessContent);

  if (inCi && !inHarness) {
    console.error(`\x1b[31m[DRIFT] Step '${gate.name}' present in .github/workflows/ci.yml but missing in scripts/run-ci-in-docker.sh\x1b[0m`);
    diffCount++;
  } else if (!inCi && inHarness) {
    console.error(`\x1b[31m[DRIFT] Step '${gate.name}' present in scripts/run-ci-in-docker.sh but missing in .github/workflows/ci.yml\x1b[0m`);
    diffCount++;
  } else if (!inCi && !inHarness) {
    console.error(`\x1b[31m[DRIFT] Required sync gate '${gate.name}' is missing in BOTH ci.yml and scripts/run-ci-in-docker.sh\x1b[0m`);
    diffCount++;
  }
}

// -----------------------------------------------------------------------------
// FINAL VERIFICATION REPORT & EXIT STATUS
// -----------------------------------------------------------------------------
if (diffCount > 0) {
  console.error(`\x1b[31m[FAIL] Detected ${diffCount} gate synchronization mismatch(es)!\x1b[0m`);
  process.exit(1);
} else {
  console.log(`\x1b[32m[PASS] Quality Gates are 100% synchronized: ${shGates.size} unique gate definitions (${activeShGates.size} active runtime gates + ${fallbackGates.size} missing-file fallbacks) in check.sh & check.ps1, matching ${ciChecks.length} CI pipeline checks and ${dockerHarnessSyncList.length} Docker CI harness gates!\x1b[0m`);
  process.exit(0);
}
