#!/usr/bin/env node
// Rikkei Jobs Opaque-Box E2E Test Suite Runner
// Executes all 4 Tiers of integration and end-to-end tests

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
};

console.log(`${c.bold}${c.bgBlue}${c.white} ============================================================== ${c.reset}`);
console.log(`${c.bold}${c.cyan}   RIKKEI JOBS — OPAQUE-BOX E2E TEST SUITE RUNNER (4 TIERS)    ${c.reset}`);
console.log(`${c.bold}${c.bgBlue}${c.white} ============================================================== ${c.reset}\n`);

const testTiers = [
  {
    tier: 'Tier 1 — Feature Coverage (Base Happy Path)',
    dir: path.join(__dirname, 'tier1-features'),
    files: [
      'test_mock_11_endpoints.test.mjs',
      'test_mock_4_tools.test.mjs',
      'test_backend_health_errors.test.mjs',
      'test_frontend_stack.test.mjs',
      'test_auth_features.test.mjs',
      'test_round_b_features.test.mjs'
    ]
  },
  {
    tier: 'Tier 2 — Boundary, Corner Cases & Security',
    dir: path.join(__dirname, 'tier2-boundaries'),
    files: [
      'test_mock_auth_boundaries.test.mjs',
      'test_mock_business_boundaries.test.mjs',
      'test_backend_error_boundaries.test.mjs',
      'test_auth_boundaries.test.mjs',
      'test_round_b_boundaries.test.mjs'
    ]
  },
  {
    tier: 'Tier 3 — Pairwise Combinations & Cross-Feature',
    dir: path.join(__dirname, 'tier3-combinations'),
    files: [
      'test_cross_feature_combinations.test.mjs',
      'test_auth_lifecycles.test.mjs',
      'test_round_b_combinations.test.mjs'
    ]
  },
  {
    tier: 'Tier 4 — Real-World Application Scenarios',
    dir: path.join(__dirname, 'tier4-scenarios'),
    files: [
      'test_real_world_scenarios.test.mjs',
      'test_auth_security_audit.test.mjs',
      'test_round_b_scenarios.test.mjs'
    ]
  }
];

// Collect all test files with strict missing-file detection
const allFilesToRun = [];
const missingFiles = [];
let totalExpectedSuites = 0;
let totalStaticCases = 0;
let totalStaticAsserts = 0;
let totalStaticLines = 0;

for (const tier of testTiers) {
  for (const file of tier.files) {
    totalExpectedSuites++;
    const fullPath = path.join(tier.dir, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const caseCount = (content.match(/\bit\s*\(/g) || []).length;
      const assertCount = (content.match(/\bassert\.[a-zA-Z]+/g) || []).length;
      const lineCount = content.split('\n').length;
      totalStaticCases += caseCount;
      totalStaticAsserts += assertCount;
      totalStaticLines += lineCount;
      allFilesToRun.push({ tier: tier.tier, file, fullPath, caseCount, assertCount, lineCount });
    } else {
      console.error(`${c.red}[ERROR] Required test suite file missing: ${fullPath}${c.reset}`);
      missingFiles.push({ tier: tier.tier, file, fullPath });
    }
  }
}

console.log(`${c.bold}Discovered ${allFilesToRun.length}/${totalExpectedSuites} test suites across 4 Tiers (${totalStaticCases} test cases, ${totalStaticAsserts} assertions, ${totalStaticLines} lines).${c.reset}\n`);

if (missingFiles.length > 0) {
  console.error(`${c.red}${c.bold}❌ Fatal: ${missingFiles.length} required test suite file(s) are missing from disk!${c.reset}`);
}

async function runTestSuite(testItem) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const proc = spawn(process.execPath, ['--test', testItem.fullPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      resolve({
        ...testItem,
        code,
        durationMs,
        stdout,
        stderr
      });
    });
  });
}

async function main() {
  const overallStart = Date.now();
  let currentTier = '';
  let totalPass = 0;
  let totalFail = missingFiles.length;
  const results = [];

  for (const item of allFilesToRun) {
    if (item.tier !== currentTier) {
      currentTier = item.tier;
      console.log(`\n${c.bold}${c.cyan}▶ ${currentTier}${c.reset}`);
    }

    process.stdout.write(`  • Running ${item.file} (${item.caseCount} tests, ${item.assertCount} asserts) ... `);
    const res = await runTestSuite(item);
    results.push(res);

    if (res.code === 0) {
      console.log(`${c.green}✔ PASS${c.reset} ${c.gray}(${res.durationMs}ms)${c.reset}`);
      totalPass++;
    } else {
      console.log(`${c.red}✘ FAIL${c.reset} ${c.gray}(${res.durationMs}ms)${c.reset}`);
      totalFail++;
      // Print stderr or failure output indented
      if (res.stderr) {
        console.error(`${c.red}${res.stderr.trim().split('\n').map(l => '    ' + l).join('\n')}${c.reset}`);
      }
      if (res.stdout && (res.stdout.includes('fail') || res.stdout.includes('not ok'))) {
        console.log(`${c.gray}${res.stdout.trim().split('\n').filter(l => l.includes('not ok') || l.includes('fail') || l.includes('AssertionError')).map(l => '    ' + l).join('\n')}${c.reset}`);
      }
    }
  }

  const overallDuration = ((Date.now() - overallStart) / 1000).toFixed(2);

  console.log(`\n${c.bold}==============================================================${c.reset}`);
  console.log(`${c.bold}                      TEST SUMMARY                            ${c.reset}`);
  console.log(`${c.bold}==============================================================${c.reset}`);
  console.log(`  Expected Suites : ${totalExpectedSuites}`);
  console.log(`  Executed Suites : ${results.length}`);
  console.log(`  Passed Suites   : ${c.green}${totalPass}${c.reset}`);
  console.log(`  Failed Suites   : ${totalFail > 0 ? c.red : c.green}${totalFail}${c.reset}`);
  if (missingFiles.length > 0) {
    console.log(`  Missing Suites  : ${c.red}${missingFiles.length}${c.reset}`);
  }
  console.log(`  Total Cases     : ${totalStaticCases}`);
  console.log(`  Total Asserts   : ${totalStaticAsserts}`);
  console.log(`  Total Lines     : ${totalStaticLines}`);
  console.log(`  Duration        : ${overallDuration}s`);
  console.log(`${c.bold}==============================================================${c.reset}\n`);

  if (totalFail > 0 || missingFiles.length > 0) {
    console.log(`${c.red}${c.bold}❌ Test suite finished with ${totalFail} failing or missing suite(s).${c.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${c.green}${c.bold}✅ ALL E2E TEST SUITES PASSED CLEANLY!${c.reset}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`Fatal runner error: ${err.message}`);
  process.exit(1);
});
