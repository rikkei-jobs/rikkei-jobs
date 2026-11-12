#!/usr/bin/env node
/**
 * Rikkei Jobs — Enterprise Agent Configuration Validator
 * Task: T022DB0 — Sprint 1 Quality Gate (Milestone 5)
 *
 * Mechanically validates agent configuration rules, skills, entrypoints, and mirrors.
 * Implements 8 comprehensive validation passes with zero external npm dependencies:
 *   - Check 1: YAML Frontmatter Integrity (trigger-only, kebab-case, name matching)
 *   - Check 2: Strict Line Cap Limits & Line Ending Hygiene (LF, no BOM, caps)
 *   - Check 3: Forbidden Patterns Detection (recursive emoji scan across all docs, secrets, commit mutations, TODOs)
 *   - Check 4: Markdown Links & Anchor Validity (internal relative links and anchors)
 *   - Check 5: Cryptographic Mirror Parity (.claude <-> .gemini 1:1 SHA-256 hash match)
 *   - Check 6: Repository Asset Citation & Command Existence (real repo assets/commands)
 *   - Check 7: Skill Supporting Files (references/*) Link Validity & Mirror Parity
 *   - Check 8: Project-Level Settings (settings.json) Mapping & Security Enforcement
 *
 * CLI Flags:
 *   --check      Runs in verification mode. Exits 0 on clean pass, 1 on any violation.
 *   --verbose    Prints granular file-by-file inspection details and cryptographic hashes.
 *   --help       Displays CLI usage manual.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// --- Terminal Colors ---
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// --- Repo Root Resolution ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveRepoRoot() {
  let cur = process.cwd();
  if (fs.existsSync(path.join(cur, 'check.sh')) && fs.existsSync(path.join(cur, 'scripts'))) {
    return cur;
  }
  if (fs.existsSync(path.join(cur, 'rikkei-jobs', 'check.sh'))) {
    return path.join(cur, 'rikkei-jobs');
  }
  cur = __dirname;
  while (cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, 'check.sh')) && fs.existsSync(path.join(cur, 'scripts'))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return path.resolve(__dirname, '..');
}

export const REPO_ROOT = resolveRepoRoot();
export const CANONICAL_DIR = path.join(REPO_ROOT, 'agent-config');
export const CLAUDE_DIR = path.join(REPO_ROOT, '.claude');
export const GEMINI_DIR = path.join(REPO_ROOT, '.gemini');

// --- Inventory Constants ---
export const RULE_NAMES = Object.freeze([
  '01-project-context.md',
  '02-git-and-delivery.md',
  '03-safety-and-secrets.md',
  '04-honest-verification.md',
  '05-backend-java.md',
  '06-database-flyway.md',
  '07-security-rbac.md',
  '08-frontend-engineering.md',
  '09-frontend-design-bar.md',
  '10-testing-strategy.md',
  '11-docs-and-bilingual.md',
  '12-ci-and-quality-gates.md',
  '13-backend-data-access-performance.md',
  '14-backend-module-boundaries.md',
  '15-backend-observability-ops.md',
  '16-backend-integrations.md'
]);

export const SKILL_NAMES = Object.freeze([
  'using-rikkei-skills', 'brainstorming-before-building', 'writing-implementation-plans',
  'executing-plans', 'test-driven-development', 'systematic-debugging',
  'verification-before-completion', 'requesting-code-review', 'receiving-code-review',
  'handoff-to-team-lead', 'dispatching-parallel-agents', 'writing-skills',
  'backend-module-feature', 'flyway-migration-authoring', 'spring-security-rbac-endpoint',
  'api-contract-and-errors', 'external-system-integration-and-mock', 'frontend-feature-slice',
  'frontend-visual-design', 'frontend-motion-design', 'frontend-iconography',
  'frontend-accessibility-audit', 'docs-bilingual-update', 'ci-local-and-debug',
  'security-review-checklist', 'backend-persistence-performance',
  'backend-module-boundaries', 'module-domain-knowledge'
]);

export const ROOT_ENTRYPOINTS = Object.freeze(['CLAUDE.md', 'GEMINI.md', 'AGENTS.md']);

// --- Line Inspection Utility ---
export function inspectLines(bufOrStr) {
  const buf = Buffer.isBuffer(bufOrStr) ? bufOrStr : Buffer.from(bufOrStr, 'utf8');
  const hasBOM = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const content = (hasBOM ? buf.subarray(3) : buf).toString('utf8');
  const hasCRLF = content.includes('\r\n');
  const hasCR = content.replace(/\r\n/g, '').includes('\r');
  let lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return {
    content,
    lines,
    lineCount: lines.length,
    hasBOM,
    hasCRLF,
    hasCR,
    isPureLF: !hasCRLF && !hasCR && !hasBOM
  };
}

// --- Hash and File Utilities (T022DB0) ---
export function calcHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function scanDirRecursive(dir, baseDir = dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      files.push(...scanDirRecursive(full, baseDir));
    } else if (ent.isFile()) {
      files.push(path.relative(baseDir, full).replace(/\\/g, '/'));
    }
  }
  return files;
}

export function findMarkdownFiles(dirPath) {
  const mdFiles = [];
  if (!fs.existsSync(dirPath)) return mdFiles;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dirPath, ent.name);
    if (ent.isDirectory()) {
      mdFiles.push(...findMarkdownFiles(full));
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
      mdFiles.push(full);
    }
  }
  return mdFiles;
}

// --- Frontmatter Parser ---
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { hasFrontmatter: false, metadata: {}, body: content };
  const rawYaml = match[1];
  const body = match[2];
  const metadata = {};
  let currentKey = null;
  for (const line of rawYaml.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      let val = kv[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      metadata[currentKey] = val;
    } else if (currentKey && (line.startsWith('  ') || line.startsWith('\t'))) {
      metadata[currentKey] += ' ' + trimmed;
    }
  }
  return { hasFrontmatter: true, metadata, body };
}

// --- Forbidden Patterns Scanner with Smart Exemptions ---
export function scanForbiddenPatterns(content, filePath = '') {
  const violations = [];
  const lines = content.split(/\r?\n/);
  const isHandoffSkill = filePath.includes('handoff-to-team-lead');
  let inForbiddenSection = false;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const lower = line.toLowerCase();
    const normalized = lower.replace(/[`'"]/g, ' ').replace(/\s+/g, ' ');

    if (/^#{1,6}\s+/.test(line)) {
      inForbiddenSection = /prohibition|destructive|forbidden|ban\b|anti-pattern|red flag/i.test(line);
    }

    // 1. Emoji check (zero exceptions)
    const isEmoji =
      /\p{Extended_Pictographic}/u.test(line) ||
      /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(line) ||
      /[0-9#*]\uFE0F?\u20E3/u.test(line);

    if (isEmoji) {
      violations.push({ type: 'emoji', line: lineNum, detail: 'Forbidden emoji character detected', content: line.trim() });
    }

    // 2. Secret check
    /* cspell:disable */
    const hasSecretPattern =
      /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(line) ||
      /\bAKIA[0-9A-Z]{16}\b/.test(line) ||
      /\bghp_[A-Za-z0-9]{36}\b/.test(line) ||
      /\bxox[baprs]-[0-9]{12}\b/.test(line) ||
      /\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/.test(line) ||
      /((api[_-]?key|secret|password|bearer|auth[_-]?token|authToken)\s*[:=]\s*(["'][^"'\r\n]{8,}["']|[^\s#"']{8,}))/i.test(line);
    /* cspell:enable */

    if (hasSecretPattern) {
      const isExemptSecret =
        lower.includes('dev-key') || lower.includes('example') || lower.includes('your-key-here') ||
        lower.includes('dummy') || lower.includes('test-token') || lower.includes('<secret>') ||
        lower.includes('placeholder');
      if (!isExemptSecret) {
        violations.push({ type: 'secret', line: lineNum, detail: 'Hardcoded secret pattern detected', content: line.trim() });
      }
    }

    // 3. Git mutation check
    if (/\b(git\s+(commit|push|pull|rebase|reset|merge|tag|stash|cherry-pick|checkout|switch|restore|revert|branch|clean|add|stage))\b/i.test(normalized)) {
      const isNegation =
        inForbiddenSection ||
        normalized.includes('never') || normalized.includes('do not') || normalized.includes('forbid') ||
        normalized.includes('prohibit') || normalized.includes('read-only') || normalized.includes('cấm') ||
        normalized.includes('reserved for') || normalized.includes('under no circumstance') ||
        normalized.includes('under any circumstance') || normalized.includes('violation') ||
        normalized.includes('violate') || normalized.includes('violating') || normalized.includes('must not') ||
        normalized.includes('disqualification') || normalized.includes('never run') || normalized.includes('destructive') ||
        normalized.includes('anti-pattern') || normalized.includes('red flag') || normalized.includes('attempts git') ||
        normalized.includes('instead of') || normalized.includes('rollback') || normalized.includes('asking the user') ||
        normalized.includes('forced branch') || normalized.includes('forbidden shell') ||
        normalized.includes('without running') || normalized.includes('without mutating');

      const isReadOnlyQuery =
        /git\s+branch\s+(--show-current|-a|-r|--list)\b/i.test(normalized) ||
        /git\s+(status|log|diff)\b/i.test(normalized);

      const isCommitMessageDoc =
        normalized.includes('commit message') || normalized.includes('commit messages');

      const isTeamLeadProposal = isHandoffSkill && (normalized.includes('team lead') || normalized.includes('tailored for'));

      if (!isNegation && !isReadOnlyQuery && !isCommitMessageDoc && !isTeamLeadProposal) {
        violations.push({ type: 'gitMutation', line: lineNum, detail: 'Forbidden mutating git command instruction detected', content: line.trim() });
      }
    }

    // 4. TODO/FIXME check
    if (/\b(TODO|FIXME|XXX|HACK|PLACEHOLDER|TBD|WIP)\b/i.test(line)) {
      const isRuleExplanation =
        normalized.includes('zero lingering') || normalized.includes('lingering todo') ||
        normalized.includes('lingering fixme') || normalized.includes('todo/fixme scan') ||
        normalized.includes('no unfinished placeholder comments') || normalized.includes('clean-code-and-linters') ||
        normalized.includes('such as todo') || normalized.includes('no lingering todo') || normalized.includes('without an associated tracking issue') ||
        normalized.includes('comments in production code') || normalized.includes('gate 26');

      const isHtmlPlaceholderAttr =
        normalized.includes('placeholder text') || normalized.includes('form placeholder') ||
        normalized.includes('placeholder strings') || normalized.includes('placeholder slop') ||
        normalized.includes('rely solely on placeholder') || normalized.includes('placeholder fluff') ||
        normalized.includes('absence of placeholder');

      if (!isRuleExplanation && !isHtmlPlaceholderAttr) {
        violations.push({ type: 'placeholder', line: lineNum, detail: 'Forbidden placeholder/comment pattern detected', content: line.trim() });
      }
    }
  });

  return violations;
}

// --- Slug Utility for Anchor Resolution ---
export function githubSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

// --- Smart Bare File Resolver ---
export function resolveRepoAssetPath(citedPath) {
  const clean = citedPath.trim().replace(/^['"`]/, '').replace(/['"`]$/, '');
  const normalized = clean.replace(/\\/g, '/');

  // 1. Direct path from repo root
  const directPath = path.join(REPO_ROOT, normalized);
  if (fs.existsSync(directPath)) return directPath;

  // 2. Smart bare file mappings
  const bareMappings = {
    'pom.xml': 'backend/pom.xml',
    'package.json': 'frontend/package.json',
    'tsconfig.json': 'frontend/tsconfig.json',
    'vite.config.ts': 'frontend/vite.config.ts',
    'eslint.config.js': 'frontend/eslint.config.js',
    'application.yml': 'backend/src/main/resources/application.yml',
    'application-dev.yml': 'backend/src/main/resources/application-dev.yml',
    'application-prod.yml': 'backend/src/main/resources/application-prod.yml',
    'ci.yml': '.github/workflows/ci.yml',
    'tool-versions.env': 'scripts/tool-versions.env',
    'docker-compose.yml': 'docker-compose.yml',
    'check.sh': 'check.sh',
    'check.ps1': 'check.ps1',
    './check.sh': 'check.sh',
    './check.ps1': 'check.ps1',
    '.\\check.ps1': 'check.ps1',
    'docs/05': 'docs/05-open-business-questions.md',
    'ProdEnvironmentValidator.java': 'backend/src/main/java/com/rikkei/jobs/common/config/ProdEnvironmentValidator.java',
    'GlobalExceptionHandler.java': 'backend/src/main/java/com/rikkei/jobs/common/exception/GlobalExceptionHandler.java',
    'SecurityConfig.java': 'backend/src/main/java/com/rikkei/jobs/common/security/SecurityConfig.java',
    'HealthBadge.tsx': 'frontend/src/shared/components/HealthBadge.tsx',
    'ModuleCard.tsx': 'frontend/src/shared/components/ModuleCard.tsx',
    'V1__init_schema.sql': 'backend/src/main/resources/db/migration/V1__init_schema.sql',
    'Role.java': 'backend/src/main/java/com/rikkei/jobs/identity/model/Role.java',
    'User.java': 'backend/src/main/java/com/rikkei/jobs/identity/model/User.java',
    'Skill.java': 'backend/src/main/java/com/rikkei/jobs/assessment/model/Skill.java',
    'HealthController.java': 'backend/src/main/java/com/rikkei/jobs/common/health/HealthController.java'
  };

  const basename = path.basename(normalized);
  if (bareMappings[clean]) {
    const mapped = path.join(REPO_ROOT, bareMappings[clean]);
    if (fs.existsSync(mapped)) return mapped;
  }
  if (bareMappings[normalized]) {
    const mapped = path.join(REPO_ROOT, bareMappings[normalized]);
    if (fs.existsSync(mapped)) return mapped;
  }
  if (bareMappings[basename]) {
    const mapped = path.join(REPO_ROOT, bareMappings[basename]);
    if (fs.existsSync(mapped)) return mapped;
  }

  // 3. Search common subdirectories
  const searchDirs = [
    'backend/src/main/java/com/rikkei/jobs',
    'backend/src/test/java/com/rikkei/jobs',
    'backend/src/main/resources',
    'frontend/src',
    'frontend',
    'scripts',
    'docs',
    'agent-config'
  ];

  for (const sDir of searchDirs) {
    const candidate = path.join(REPO_ROOT, sDir, normalized);
    if (fs.existsSync(candidate)) return candidate;
    const candidateBase = path.join(REPO_ROOT, sDir, basename);
    if (fs.existsSync(candidateBase)) return candidateBase;
    const absSearch = path.join(REPO_ROOT, sDir);
    if (fs.existsSync(absSearch)) {
      for (const rel of scanDirRecursive(absSearch)) {
        if (rel === normalized || path.basename(rel) === basename) {
          return path.join(absSearch, rel);
        }
      }
    }
  }

  return null;
}

// --- Main Validator Implementation ---
export async function validateAgentConfig(options = {}) {
  const isVerbose = Boolean(options.verbose);
  const results = {
    pass: true,
    totalFilesChecked: 0,
    check1Violations: [],
    check2Violations: [],
    check3Violations: [],
    check4Violations: [],
    check5Violations: [],
    check6Violations: [],
    check7Violations: [],
    check8Violations: []
  };

  const logVerbose = (msg) => {
    if (isVerbose) console.log(`  ${msg}`);
  };

  console.log(`\n${BOLD}================================================================================${RESET}`);
  console.log(`  ${BOLD}${CYAN}RIKKEI JOBS — ENTERPRISE AGENT CONFIGURATION VALIDATOR${RESET}`);
  console.log(`  Task: T022DB0 | Repo Root: ${REPO_ROOT}`);
  console.log(`${BOLD}================================================================================${RESET}\n`);

  // ---------------------------------------------------------------------------
  // Check 1: YAML Frontmatter Integrity (Skills)
  // ---------------------------------------------------------------------------
  console.log(`${BOLD}[Check 1/8] Validating YAML Frontmatter Integrity in Skills...${RESET}`);
  for (const skillName of SKILL_NAMES) {
    const skillPath = path.join(CANONICAL_DIR, 'skills', skillName, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      results.check1Violations.push(`Missing canonical skill file: ${skillPath}`);
      continue;
    }
    const raw = fs.readFileSync(skillPath, 'utf8');
    const { hasFrontmatter, metadata } = parseFrontmatter(raw);

    if (!hasFrontmatter) {
      results.check1Violations.push(`Skill '${skillName}/SKILL.md' is missing YAML frontmatter`);
      continue;
    }

    if (metadata.name !== skillName) {
      results.check1Violations.push(`Skill name '${metadata.name || ''}' does not match directory name '${skillName}'`);
    }

    const desc = metadata.description || '';
    if (!desc.startsWith('Use when')) {
      results.check1Violations.push(`Skill description must start with trigger phrase 'Use when ...' (found: '${desc.slice(0, 40)}...')`);
    }

    // Workflow summary heuristic check in description
    if (/\b(first do step|then step|and finally step|step 1.*step 2)\b/i.test(desc)) {
      results.check1Violations.push(`Skill description contains forbidden workflow summary heuristic in '${skillName}'`);
    }
  }

  if (results.check1Violations.length === 0) {
    console.log(`  ${GREEN}[PASS] Check 1: All 28 skills have valid trigger-only YAML frontmatter.${RESET}`);
  } else {
    console.log(`  ${RED}[FAIL] Check 1: Found ${results.check1Violations.length} frontmatter violation(s).${RESET}`);
    results.check1Violations.forEach(v => console.log(`    ${RED}- ${v}${RESET}`));
    results.pass = false;
  }

  // ---------------------------------------------------------------------------
  // Check 2: Strict Line Cap Limits & Line Ending Hygiene
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}[Check 2/8] Validating Line Caps & Line Ending Hygiene (LF, UTF-8 no BOM)...${RESET}`);

  // 2.1 Rules <= 150 lines
  for (const ruleName of RULE_NAMES) {
    const rulePath = path.join(CANONICAL_DIR, 'rules', ruleName);
    if (!fs.existsSync(rulePath)) {
      results.check2Violations.push(`Missing canonical rule: ${ruleName}`);
      continue;
    }
    results.totalFilesChecked++;
    const buf = fs.readFileSync(rulePath);
    const info = inspectLines(buf);
    if (info.hasBOM) {
      results.check2Violations.push(`Rule '${ruleName}' contains prohibited UTF-8 BOM marker`);
    }
    if (info.hasCRLF || info.hasCR) {
      results.check2Violations.push(`Rule '${ruleName}' contains non-LF line endings (CRLF/CR)`);
    }
    if (info.lineCount > 150) {
      results.check2Violations.push(`Rule file '${ruleName}' exceeds 150 lines cap (current: ${info.lineCount} lines)`);
    }
    logVerbose(`Rule ${ruleName}: ${info.lineCount} lines (LF: ${info.isPureLF})`);
  }

  // 2.2 Skills body <= 500 lines
  for (const skillName of SKILL_NAMES) {
    const skillPath = path.join(CANONICAL_DIR, 'skills', skillName, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    results.totalFilesChecked++;
    const buf = fs.readFileSync(skillPath);
    const info = inspectLines(buf);
    if (info.hasBOM) {
      results.check2Violations.push(`Skill '${skillName}/SKILL.md' contains prohibited UTF-8 BOM marker`);
    }
    if (info.hasCRLF || info.hasCR) {
      results.check2Violations.push(`Skill '${skillName}/SKILL.md' contains non-LF line endings (CRLF/CR)`);
    }
    const { body } = parseFrontmatter(info.content);
    const bodyInfo = inspectLines(body);
    if (bodyInfo.lineCount > 500) {
      results.check2Violations.push(`Skill body '${skillName}' exceeds 500 lines cap (current: ${bodyInfo.lineCount} lines)`);
    }
    logVerbose(`Skill ${skillName}: ${info.lineCount} total lines, ${bodyInfo.lineCount} body lines`);
  }

  // 2.3 Root entrypoints <= 120 lines
  for (const epName of ROOT_ENTRYPOINTS) {
    const epPath = path.join(REPO_ROOT, epName);
    if (fs.existsSync(epPath)) {
      results.totalFilesChecked++;
      const buf = fs.readFileSync(epPath);
      const info = inspectLines(buf);
      if (info.hasBOM) {
        results.check2Violations.push(`Root entrypoint '${epName}' contains prohibited UTF-8 BOM marker`);
      }
      if (info.hasCRLF || info.hasCR) {
        results.check2Violations.push(`Root entrypoint '${epName}' contains non-LF line endings`);
      }
      if (info.lineCount > 120) {
        results.check2Violations.push(`Root entrypoint '${epName}' exceeds 120 lines cap (current: ${info.lineCount} lines)`);
      }
      logVerbose(`Entrypoint ${epName}: ${info.lineCount} lines`);
    }
  }

  if (results.check2Violations.length === 0) {
    console.log(`  ${GREEN}[PASS] Check 2: Line caps and LF line-ending hygiene verified across all files.${RESET}`);
  } else {
    console.log(`  ${RED}[FAIL] Check 2: Found ${results.check2Violations.length} line cap/encoding violation(s).${RESET}`);
    results.check2Violations.forEach(v => console.log(`    ${RED}- ${v}${RESET}`));
    results.pass = false;
  }

  // ---------------------------------------------------------------------------
  // Check 3: Forbidden Patterns Detection (Extended Scope) (T022DB0)
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}[Check 3/8] Scanning for Forbidden Patterns across Extended Scope (Emoji, Secrets, Git Mutations, TODOs)...${RESET}`);
  const scanTargets = [];
  RULE_NAMES.forEach(r => scanTargets.push({ file: r, fullPath: path.join(CANONICAL_DIR, 'rules', r) }));
  SKILL_NAMES.forEach(s => scanTargets.push({ file: `${s}/SKILL.md`, fullPath: path.join(CANONICAL_DIR, 'skills', s, 'SKILL.md') }));
  ROOT_ENTRYPOINTS.forEach(e => scanTargets.push({ file: e, fullPath: path.join(REPO_ROOT, e) }));

  const extendedScanTargets = new Map(); // Map<fullPath, relPath>

  // 1. Root entrypoints
  ROOT_ENTRYPOINTS.forEach(e => {
    const fp = path.join(REPO_ROOT, e);
    if (fs.existsSync(fp)) extendedScanTargets.set(fp, e);
  });

  // 2. Canonical agent-config
  findMarkdownFiles(CANONICAL_DIR).forEach(fp => {
    extendedScanTargets.set(fp, path.relative(REPO_ROOT, fp).replace(/\\/g, '/'));
  });

  // 3. Active mirrors .claude and .gemini
  findMarkdownFiles(CLAUDE_DIR).forEach(fp => {
    extendedScanTargets.set(fp, path.relative(REPO_ROOT, fp).replace(/\\/g, '/'));
  });
  findMarkdownFiles(GEMINI_DIR).forEach(fp => {
    extendedScanTargets.set(fp, path.relative(REPO_ROOT, fp).replace(/\\/g, '/'));
  });

  // 4. Docs in scope: docs/design and docs/agent-config
  findMarkdownFiles(path.join(REPO_ROOT, 'docs', 'design')).forEach(fp => {
    extendedScanTargets.set(fp, path.relative(REPO_ROOT, fp).replace(/\\/g, '/'));
  });
  findMarkdownFiles(path.join(REPO_ROOT, 'docs', 'agent-config')).forEach(fp => {
    extendedScanTargets.set(fp, path.relative(REPO_ROOT, fp).replace(/\\/g, '/'));
  });

  console.log(`  Scope: Inspected ${extendedScanTargets.size} Markdown files across docs/design, docs/agent-config, agent-config, .claude, .gemini, and root.`);

  // Recursive emoji scan across ALL extended markdown targets
  for (const [fullPath, relPath] of extendedScanTargets.entries()) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      const isEmoji =
        /\p{Extended_Pictographic}/u.test(line) ||
        /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(line) ||
        /[0-9#*]\uFE0F?\u20E3/u.test(line);
      if (isEmoji) {
        results.check3Violations.push(`Forbidden emoji character detected: '${line.trim()}' at ${relPath}:${idx + 1}`);
      }
    });
  }

  // Secrets, git mutations, and TODOs scan across executable agent config entrypoints & rules/skills
  for (const target of scanTargets) {
    if (!fs.existsSync(target.fullPath)) continue;
    const content = fs.readFileSync(target.fullPath, 'utf8');
    const violations = scanForbiddenPatterns(content, target.file);
    for (const v of violations) {
      if (v.type !== 'emoji') {
        results.check3Violations.push(`${v.detail}: '${v.content}' at ${target.file}:${v.line}`);
      }
    }
  }

  if (results.check3Violations.length === 0) {
    console.log(`  ${GREEN}[PASS] Check 3: Zero prohibited emojis across all ${extendedScanTargets.size} files, and zero secrets/mutations/TODOs in agent config.${RESET}`);
  } else {
    console.log(`  ${RED}[FAIL] Check 3: Found ${results.check3Violations.length} forbidden pattern violation(s).${RESET}`);
    results.check3Violations.forEach(v => console.log(`    ${RED}- ${v}${RESET}`));
    results.pass = false;
  }

  // ---------------------------------------------------------------------------
  // Check 4: Markdown Links & Internal Anchor Validity
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}[Check 4/8] Validating Markdown Relative Links & Internal Anchors...${RESET}`);
  for (const target of scanTargets) {
    if (!fs.existsSync(target.fullPath)) continue;
    const content = fs.readFileSync(target.fullPath, 'utf8');
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    // Collect all heading slugs in this file for anchor checking
    const headingSlugs = new Set();
    const headingRegex = /^#{1,6}\s+(.+)$/gm;
    let hMatch;
    while ((hMatch = headingRegex.exec(content)) !== null) {
      headingSlugs.add(githubSlug(hMatch[1]));
    }

    while ((match = linkRegex.exec(content)) !== null) {
      const linkTarget = match[2].trim();
      // Skip external links, mailto, or placeholders
      if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://') || linkTarget.startsWith('mailto:')) {
        continue;
      }
      if (linkTarget.startsWith('#')) {
        const anchor = linkTarget.substring(1);
        if (anchor && !headingSlugs.has(anchor)) {
          results.check4Violations.push(`Anchor '#${anchor}' does not exist in ${target.file}`);
        }
        continue;
      }

      // Handle relative file link with optional anchor
      const [filePathOnly, anchor] = linkTarget.split('#');
      let resolvedTarget = null;
      if (path.isAbsolute(filePathOnly)) {
        resolvedTarget = path.join(REPO_ROOT, filePathOnly);
      } else {
        const targetRel = path.resolve(path.dirname(target.fullPath), filePathOnly);
        if (fs.existsSync(targetRel)) {
          resolvedTarget = targetRel;
        } else {
          const fromRepo = path.join(REPO_ROOT, filePathOnly);
          if (fs.existsSync(fromRepo)) {
            resolvedTarget = fromRepo;
          }
        }
      }

      if (!resolvedTarget || !fs.existsSync(resolvedTarget)) {
        results.check4Violations.push(`Broken markdown link detected: target '${filePathOnly}' does not exist (in ${target.file})`);
      } else if (anchor) {
        const targetContent = fs.readFileSync(resolvedTarget, 'utf8');
        const targetHeadings = new Set();
        let thMatch;
        const thRegex = /^#{1,6}\s+(.+)$/gm;
        while ((thMatch = thRegex.exec(targetContent)) !== null) {
          targetHeadings.add(githubSlug(thMatch[1]));
        }
        if (!targetHeadings.has(anchor)) {
          results.check4Violations.push(`Target anchor '#${anchor}' does not exist in target file '${filePathOnly}' (in ${target.file})`);
        }
      }
    }
  }

  if (results.check4Violations.length === 0) {
    console.log(`  ${GREEN}[PASS] Check 4: All markdown relative links and anchors are strictly valid.${RESET}`);
  } else {
    console.log(`  ${RED}[FAIL] Check 4: Found ${results.check4Violations.length} broken link/anchor violation(s).${RESET}`);
    results.check4Violations.forEach(v => console.log(`    ${RED}- ${v}${RESET}`));
    results.pass = false;
  }

  // ---------------------------------------------------------------------------
  // Check 5: Cryptographic Mirror Parity (.claude <-> .gemini 1:1 SHA-256 match)
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}[Check 5/8] Verifying Mirror Parity & SHA-256 Cryptographic Hashes...${RESET}`);

  // 5.1 Rules parity
  for (const ruleName of RULE_NAMES) {
    const canonHash = calcHash(path.join(CANONICAL_DIR, 'rules', ruleName));
    const claudeHash = calcHash(path.join(CLAUDE_DIR, 'rules', ruleName));
    const geminiHash = calcHash(path.join(GEMINI_DIR, 'rules', ruleName));

    if (!claudeHash) {
      results.check5Violations.push(`Missing rule file in .claude: ${ruleName}`);
    } else if (canonHash !== claudeHash) {
      results.check5Violations.push(`Parity mismatch: canonical rules/${ruleName} differs from .claude/rules/${ruleName}`);
    }

    if (!geminiHash) {
      results.check5Violations.push(`Missing rule file in .gemini: ${ruleName}`);
    } else if (canonHash !== geminiHash) {
      results.check5Violations.push(`Parity mismatch: canonical rules/${ruleName} differs from .gemini/rules/${ruleName}`);
    }

    if (claudeHash && geminiHash && claudeHash !== geminiHash) {
      results.check5Violations.push(`Parity mismatch: .claude/rules/${ruleName} differs from .gemini/rules/${ruleName}`);
    }

    logVerbose(`Rule parity ${ruleName}: ${canonHash?.slice(0, 8)}`);
  }

  // 5.2 Skills parity
  for (const skillName of SKILL_NAMES) {
    const canonHash = calcHash(path.join(CANONICAL_DIR, 'skills', skillName, 'SKILL.md'));
    const claudeHash = calcHash(path.join(CLAUDE_DIR, 'skills', skillName, 'SKILL.md'));
    const geminiHash = calcHash(path.join(GEMINI_DIR, 'skills', skillName, 'SKILL.md'));

    if (!claudeHash) {
      results.check5Violations.push(`Missing skill in .claude: ${skillName}`);
    } else if (canonHash !== claudeHash) {
      results.check5Violations.push(`Parity mismatch: canonical skills/${skillName} differs from .claude/skills/${skillName}`);
    }

    if (!geminiHash) {
      results.check5Violations.push(`Missing skill in .gemini: ${skillName}`);
    } else if (canonHash !== geminiHash) {
      results.check5Violations.push(`Parity mismatch: canonical skills/${skillName} differs from .gemini/skills/${skillName}`);
    }

    if (claudeHash && geminiHash && claudeHash !== geminiHash) {
      results.check5Violations.push(`Parity mismatch: .claude/skills/${skillName}/SKILL.md differs from .gemini/skills/${skillName}/SKILL.md`);
    }

    logVerbose(`Skill parity ${skillName}: ${canonHash?.slice(0, 8)}`);
  }

  // 5.3 Orphan detection in mirrors
  const claudeFiles = scanDirRecursive(CLAUDE_DIR);
  for (const cFile of claudeFiles) {
    if (cFile.startsWith('rules/')) {
      const bName = path.basename(cFile);
      if (!RULE_NAMES.includes(bName)) {
        results.check5Violations.push(`Orphan file detected in mirror: .claude/${cFile}`);
      }
    } else if (cFile.startsWith('skills/')) {
      const parts = cFile.split('/');
      const skillName = parts[1];
      if (!SKILL_NAMES.includes(skillName)) {
        results.check5Violations.push(`Orphan file detected in mirror: .claude/${cFile}`);
      }
    }
  }

  const geminiFiles = scanDirRecursive(GEMINI_DIR);
  for (const gFile of geminiFiles) {
    if (gFile.startsWith('commands/')) {
      // Ignore .gemini/commands/ (which holds the 28 TOML fallback commands)
      continue;
    }
    if (gFile.endsWith('.json') || gFile.endsWith('.toml') || gFile.startsWith('settings/') || gFile === 'settings.json') {
      // Ignore config/settings files
      continue;
    }
    if (gFile.startsWith('rules/')) {
      const bName = path.basename(gFile);
      if (!RULE_NAMES.includes(bName)) {
        results.check5Violations.push(`Orphan file detected in mirror: .gemini/${gFile}`);
      }
    } else if (gFile.startsWith('skills/')) {
      const parts = gFile.split('/');
      const skillName = parts[1];
      if (!SKILL_NAMES.includes(skillName)) {
        results.check5Violations.push(`Orphan file detected in mirror: .gemini/${gFile}`);
      }
    } else {
      results.check5Violations.push(`Orphan file detected in mirror: .gemini/${gFile}`);
    }
  }

  if (results.check5Violations.length === 0) {
    console.log(`  ${GREEN}[PASS] Check 5: 100% cryptographic parity (.claude <-> .gemini) verified with zero orphans.${RESET}`);
  } else {
    console.log(`  ${RED}[FAIL] Check 5: Found ${results.check5Violations.length} mirror parity violation(s).${RESET}`);
    results.check5Violations.forEach(v => console.log(`    ${RED}- ${v}${RESET}`));
    results.pass = false;
  }

  // ---------------------------------------------------------------------------
  // Check 6: Repository Asset Citation & Command Existence ([EXISTS] vs [TARGET])
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}[Check 6/8] Verifying Repository Asset Citations & [EXISTS]/[TARGET] Markers...${RESET}`);
  let existsMarkerCount = 0;
  let targetMarkerCount = 0;
  const UNIMPLEMENTED_CONSTRUCTS = [
    { label: '@PreAuthorize', regex: /@PreAuthorize\b/, checkDir: 'backend/src/main/java' },
    { label: '@EnableScheduling', regex: /@EnableScheduling\b/, checkDir: 'backend/src/main/java' },
    { label: 'ObjectOptimisticLockingFailureException', regex: /\bObjectOptimisticLockingFailureException\b/, checkDir: 'backend/src/main/java' },
    { label: 'X-Request-ID', regex: /\bX-Request-ID\b/, checkDir: 'backend/src/main/java' },
    { label: 'X-Correlation-ID', regex: /\bX-Correlation-ID\b/, checkDir: 'backend/src/main/java' },
    { label: 'used_sso_tickets', regex: /\bused_sso_tickets\b/, checkDir: 'backend/src/main/resources/db/migration' },
    { label: '@Version', regex: /@Version\b/, checkDir: 'backend/src/main/java' }
  ];

  function constructExistsInDir(regex, relDir) {
    const absDir = path.join(REPO_ROOT, relDir);
    if (!fs.existsSync(absDir)) return false;
    for (const rel of scanDirRecursive(absDir)) {
      const text = fs.readFileSync(path.join(absDir, rel), 'utf8');
      if (regex.test(text)) return true;
    }
    return false;
  }

  for (const target of scanTargets) {
    if (!fs.existsSync(target.fullPath)) continue;
    const content = fs.readFileSync(target.fullPath, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, idx) => {
      const hasExists = line.includes('[EXISTS]');
      const hasTarget = line.includes('[TARGET]');
      if (hasExists) existsMarkerCount++;
      if (hasTarget) targetMarkerCount++;

      // Verify [EXISTS] never claims unimplemented backend constructs as already implemented
      if (hasExists && !hasTarget) {
        const isNegatedStatement = /\b(do not currently|does not currently|not yet|without)\b/i.test(line);
        if (!isNegatedStatement) {
          for (const item of UNIMPLEMENTED_CONSTRUCTS) {
            if (item.regex.test(line) && !constructExistsInDir(item.regex, item.checkDir)) {
              results.check6Violations.push(
                `False [EXISTS] claim for unimplemented construct '${item.label}' at ${target.file}:${idx + 1} (must be marked [TARGET])`
              );
            }
          }
        }
      }

      // Verify Maven test class citations (-D "test=ClassName" or -Dtest=ClassName) on non-[TARGET] lines
      if (!hasTarget || hasExists) {
        const testMatch = line.match(/-D\s*"?test=([A-Za-z0-9_]+)"?/);
        if (testMatch && !/^(ClassName|TargetTestClass|PackageName|MyServiceTest)$/.test(testMatch[1])) {
          const testClassFile = `${testMatch[1]}.java`;
          if (!resolveRepoAssetPath(testClassFile)) {
            results.check6Violations.push(`Cited test class '${testMatch[1]}' does not exist in repository (in ${target.file}:${idx + 1})`);
          }
        }
      }

      // Extract all inline backtick tokens on this line
      const backtickRegex = /`([^`\n]+)`/g;
      let bMatch;
      while ((bMatch = backtickRegex.exec(line)) !== null) {
        const token = bMatch[1].trim();

        // Check command validity: catch invalid tools like './gradlew' even on [TARGET] lines
        if (/^\.\/gradlew(\s+.*)?$/.test(token)) {
          results.check6Violations.push(`Cited command './gradlew' is not a valid project build/test tool (in ${target.file})`);
          continue;
        }

        // Planned paths explicitly marked [TARGET] (without [EXISTS]) are target-state designs, not existing files
        if (hasTarget && !hasExists) {
          continue;
        }

        // Filter out command invocations starting with known runners
        if (/^(npm|node|mvn|\.\/mvnw|mvnw|git|docker|docker-compose|powershell|bash|curl|sh|npx)\s+/i.test(token)) {
          continue;
        }
        // Filter out endpoints/URL paths starting with /
        if (/^\/(swagger-ui\.html|api\/|actuator|health|meet\/)/.test(token)) {
          continue;
        }
        // Filter out container paths
        if (/^\/app\//.test(token)) {
          continue;
        }
        // Filter out template markers or wildcards
        if (token.includes('<') || token.includes('>') || token.includes('*') || token.includes('{') || token.includes('}')) {
          continue;
        }
        // Filter out dummy/placeholder paths with '...' or 'path/to/'
        if (token.includes('...') || token.includes('path/to/')) {
          continue;
        }
        // Filter out schema migrations like V2__..., V3__... unless explicitly marked [EXISTS]
        if (!hasExists && /^V[0-9]+__.*\.sql$/.test(token)) {
          continue;
        }
        // Filter out CLI flags or options
        if (token.startsWith('-') || token.startsWith('--')) {
          continue;
        }
        // Filter out code fragments or common keywords
        if (/^(true|false|null|undefined|void|return|const|let|var|class|interface|record|import|export|public|private|package|@\w+)/.test(token)) {
          continue;
        }
        // Filter out JSON, SQL or HTTP fragments
        if (/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|SELECT|INSERT|UPDATE|WHERE|JOIN|FROM|200|201|400|401|403|404|500)/i.test(token)) {
          continue;
        }
        // Filter out URLs
        if (token.startsWith('http://') || token.startsWith('https://')) {
          continue;
        }
        // Filter out abstract agent state files or lifecycle names
        if (/^(SKILL\.md|progress\.md|handoff\.md|DISPATCH\.md|BRIEFING\.md|PROJECT\.md|SCOPE\.md)$/.test(token)) {
          continue;
        }
        // Filter out generic barrel export name 'index.ts'
        if (token === 'index.ts') {
          continue;
        }
        // Filter out proposed Icon components specifically noted in design specifications unless marked [EXISTS]
        if (!hasExists && token.includes('Icon') && token.includes('frontend/src/shared/components/Icon/')) {
          continue;
        }

        // Check if token represents a file path (has extension or contains /)
        const hasFileExtension = /\.(java|ts|tsx|js|mjs|cjs|sql|xml|yml|yaml|json|jsonc|env|md|sh|ps1|toml|txt|html|css)$/i.test(token);
        const isPathLike = token.includes('/') || token.includes('\\') || hasFileExtension;

        if (isPathLike) {
          const resolved = resolveRepoAssetPath(token);
          if (!resolved) {
            if (/^(backend|frontend|mock|scripts|docs|agent-config|\.claude|\.gemini)\//.test(token) || hasFileExtension) {
              results.check6Violations.push(`Cited file path does not exist in repository: '${token}' (in ${target.file})`);
            }
          }
        }
      }
    });
  }

  if (results.check6Violations.length === 0) {
    console.log(`  ${GREEN}[PASS] Check 6: All cited repository assets/commands verified (${existsMarkerCount} [EXISTS] verified, ${targetMarkerCount} [TARGET] distinguished).${RESET}`);
  } else {
    console.log(`  ${RED}[FAIL] Check 6: Found ${results.check6Violations.length} asset/command citation violation(s).${RESET}`);
    results.check6Violations.forEach(v => console.log(`    ${RED}- ${v}${RESET}`));
    results.pass = false;
  }

  // ---------------------------------------------------------------------------
  // Check 7: Skill Supporting Files (references/*) Link Target Validity & Mirror Parity (T022DB0)
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}[Check 7/8] Validating Skill Supporting Files (references/*) Link Validity & Mirror Parity...${RESET}`);

  // 7.1 Link Target Validity
  for (const skillName of SKILL_NAMES) {
    const skillPath = path.join(CANONICAL_DIR, 'skills', skillName, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    const content = fs.readFileSync(skillPath, 'utf8');
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const linkTarget = match[2].trim();
      if (linkTarget.startsWith('references/')) {
        const cleanTarget = linkTarget.split('#')[0];
        const resolvedPath = path.join(CANONICAL_DIR, 'skills', skillName, cleanTarget);
        if (!fs.existsSync(resolvedPath)) {
          results.check7Violations.push(`Skill '${skillName}/SKILL.md' references non-existent supporting path: '${linkTarget}'`);
        }
      }
    }
  }

  // 7.2 Supporting Files Parity (SHA-256)
  for (const skillName of SKILL_NAMES) {
    const canonRefDir = path.join(CANONICAL_DIR, 'skills', skillName, 'references');
    if (!fs.existsSync(canonRefDir)) continue;

    const refFiles = scanDirRecursive(canonRefDir);
    for (const relFile of refFiles) {
      const canonFilePath = path.join(canonRefDir, relFile);
      const claudeFilePath = path.join(CLAUDE_DIR, 'skills', skillName, 'references', relFile);
      const geminiFilePath = path.join(GEMINI_DIR, 'skills', skillName, 'references', relFile);

      const canonHash = calcHash(canonFilePath);
      const claudeHash = calcHash(claudeFilePath);
      const geminiHash = calcHash(geminiFilePath);

      if (!claudeHash) {
        results.check7Violations.push(`Missing supporting file in .claude: skills/${skillName}/references/${relFile}`);
      } else if (canonHash !== claudeHash) {
        results.check7Violations.push(`Parity mismatch: canonical skills/${skillName}/references/${relFile} differs from .claude mirror`);
      }

      if (!geminiHash) {
        results.check7Violations.push(`Missing supporting file in .gemini: skills/${skillName}/references/${relFile}`);
      } else if (canonHash !== geminiHash) {
        results.check7Violations.push(`Parity mismatch: canonical skills/${skillName}/references/${relFile} differs from .gemini mirror`);
      }
    }

    // Check orphan supporting files in mirrors
    const claudeRefDir = path.join(CLAUDE_DIR, 'skills', skillName, 'references');
    if (fs.existsSync(claudeRefDir)) {
      const claudeRefFiles = scanDirRecursive(claudeRefDir);
      for (const relFile of claudeRefFiles) {
        if (!fs.existsSync(path.join(canonRefDir, relFile))) {
          results.check7Violations.push(`Orphan supporting file in .claude: skills/${skillName}/references/${relFile}`);
        }
      }
    }

    const geminiRefDir = path.join(GEMINI_DIR, 'skills', skillName, 'references');
    if (fs.existsSync(geminiRefDir)) {
      const geminiRefFiles = scanDirRecursive(geminiRefDir);
      for (const relFile of geminiRefFiles) {
        if (!fs.existsSync(path.join(canonRefDir, relFile))) {
          results.check7Violations.push(`Orphan supporting file in .gemini: skills/${skillName}/references/${relFile}`);
        }
      }
    }
  }

  if (results.check7Violations.length === 0) {
    console.log(`  ${GREEN}[PASS] Check 7: All skill references/* links valid and 100% cryptographic parity verified across mirrors.${RESET}`);
  } else {
    console.log(`  ${RED}[FAIL] Check 7: Found ${results.check7Violations.length} supporting file violation(s).${RESET}`);
    results.check7Violations.forEach(v => console.log(`    ${RED}- ${v}${RESET}`));
    results.pass = false;
  }

  // ---------------------------------------------------------------------------
  // Check 8: Project-Level Settings (settings.json + .geminiignore) Mapping & Security Enforcement (T022DB0)
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}[Check 8/8] Validating settings.json & .geminiignore Mapping & Security Enforcement...${RESET}`);
  const settingsTemplatePath = path.join(CANONICAL_DIR, 'templates', 'settings.template.json');
  const claudeSettingsPath = path.join(CLAUDE_DIR, 'settings.json');
  const geminiSettingsPath = path.join(GEMINI_DIR, 'settings.json');
  const geminiIgnorePath = path.join(REPO_ROOT, '.geminiignore');

  if (!fs.existsSync(settingsTemplatePath)) {
    results.check8Violations.push(`Missing canonical settings template: agent-config/templates/settings.template.json`);
  } else {
    let tpl = null;
    try {
      tpl = JSON.parse(fs.readFileSync(settingsTemplatePath, 'utf8'));
    } catch (e) {
      results.check8Violations.push(`Invalid JSON syntax in settings.template.json: ${e.message}`);
    }

    if (tpl) {
      // 8.1 Claude Settings Mapping & Permissions
      if (!fs.existsSync(claudeSettingsPath)) {
        results.check8Violations.push(`Missing generated settings file: .claude/settings.json`);
      } else {
        try {
          const claudeActual = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
          const claudeExpected = tpl.claude || {};
          if (JSON.stringify(claudeActual) !== JSON.stringify(claudeExpected)) {
            results.check8Violations.push(`.claude/settings.json drifted from 'claude' block in settings.template.json`);
          }

          const deny = claudeActual?.permissions?.deny || [];
          const requiredDeny = [
            'Read(.env*)', 'Read(*.pem)', 'Read(*.key)',
            'Read(**/.env*)', 'Read(**/*.pem)', 'Read(**/*.key)',
            'Bash(git commit *)', 'Bash(git push *)', 'Bash(git reset --hard *)',
            'Bash(git rebase *)', 'Bash(git stash *)', 'Bash(git clean -fd *)'
          ];
          for (const req of requiredDeny) {
            if (!deny.includes(req)) {
              results.check8Violations.push(`Missing required Claude deny permission: '${req}'`);
            }
          }

          const ask = claudeActual?.permissions?.ask || [];
          for (const reqAsk of ['Bash(git checkout *)', 'Bash(git restore *)']) {
            if (!ask.includes(reqAsk)) {
              results.check8Violations.push(`Missing required Claude ask permission: '${reqAsk}'`);
            }
          }
        } catch (e) {
          results.check8Violations.push(`Invalid JSON syntax in .claude/settings.json: ${e.message}`);
        }
      }

      // 8.2 Gemini Settings Mapping, Official Schema Compliance & .geminiignore
      if (!fs.existsSync(geminiSettingsPath)) {
        results.check8Violations.push(`Missing generated settings file: .gemini/settings.json`);
      } else {
        try {
          const geminiActual = JSON.parse(fs.readFileSync(geminiSettingsPath, 'utf8'));
          const geminiExpected = tpl.gemini || {};
          if (JSON.stringify(geminiActual) !== JSON.stringify(geminiExpected)) {
            results.check8Violations.push(`.gemini/settings.json drifted from 'gemini' block in settings.template.json`);
          }

          // Reject undocumented/invented keys not in schemas/settings.schema.json
          const allowedTopKeys = new Set(['$schema', 'context', 'security', 'tools', 'general']);
          for (const k of Object.keys(geminiActual)) {
            if (!allowedTopKeys.has(k)) {
              results.check8Violations.push(`Unsupported top-level key '${k}' in .gemini/settings.json`);
            }
          }
          if (geminiActual?.security && 'fileAccess' in geminiActual.security) {
            results.check8Violations.push(`Undocumented key 'security.fileAccess' in .gemini/settings.json (not in official settings.schema.json)`);
          }

          if (geminiActual?.context?.fileFiltering?.respectGeminiIgnore !== true) {
            results.check8Violations.push(`Gemini 'context.fileFiltering.respectGeminiIgnore' must be true`);
          }
          if (geminiActual?.context?.fileFiltering?.respectGitIgnore !== true) {
            results.check8Violations.push(`Gemini 'context.fileFiltering.respectGitIgnore' must be true`);
          }

          const excludes = geminiActual?.tools?.exclude || [];
          const requiredExcludes = [
            'run_shell_command(git commit)', 'run_shell_command(git push)',
            'run_shell_command(git reset --hard)', 'run_shell_command(git rebase)',
            'run_shell_command(git stash)', 'run_shell_command(git clean -fd)'
          ];
          for (const req of requiredExcludes) {
            if (!excludes.includes(req)) {
              results.check8Violations.push(`Missing required Gemini tools.exclude prefix: '${req}'`);
            }
          }

          const confirmations = geminiActual?.tools?.confirmationRequired || [];
          for (const req of ['run_shell_command(git checkout)', 'run_shell_command(git restore)']) {
            if (!confirmations.includes(req)) {
              results.check8Violations.push(`Missing required Gemini tools.confirmationRequired prefix: '${req}'`);
            }
          }

          const redaction = geminiActual?.security?.environmentVariableRedaction;
          if (!redaction || typeof redaction !== 'object' || Array.isArray(redaction) || redaction.enabled !== true || !Array.isArray(redaction.blocked) || redaction.blocked.length === 0) {
            results.check8Violations.push(`Gemini 'security.environmentVariableRedaction' must be an object with enabled:true and non-empty blocked array per settings.schema.json`);
          }
        } catch (e) {
          results.check8Violations.push(`Invalid JSON syntax in .gemini/settings.json: ${e.message}`);
        }
      }

      if (!fs.existsSync(geminiIgnorePath)) {
        results.check8Violations.push(`Missing generated workspace ignore file: .geminiignore`);
      } else {
        const giRaw = fs.readFileSync(geminiIgnorePath, 'utf8');
        const expectedGi = (tpl.geminiIgnore || []).join('\n') + '\n';
        if (giRaw !== expectedGi) {
          results.check8Violations.push(`.geminiignore drifted from 'geminiIgnore' block in settings.template.json`);
        }
        const giLines = giRaw.split(/\r?\n/).map(l => l.trim());
        for (const reqPattern of ['.env*', '*.pem', '*.key', '**/.env*', '**/*.pem', '**/*.key']) {
          if (!giLines.includes(reqPattern)) {
            results.check8Violations.push(`Missing required secret exclusion pattern in .geminiignore: '${reqPattern}'`);
          }
        }
      }
    }
  }

  if (results.check8Violations.length === 0) {
    console.log(`  ${GREEN}[PASS] Check 8: Both settings.json match template mapping and enforce mandatory security policies.${RESET}`);
  } else {
    console.log(`  ${RED}[FAIL] Check 8: Found ${results.check8Violations.length} settings configuration violation(s).${RESET}`);
    results.check8Violations.forEach(v => console.log(`    ${RED}- ${v}${RESET}`));
    results.pass = false;
  }

  // ---------------------------------------------------------------------------
  // Summary & Exit Code
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}================================================================================${RESET}`);
  if (results.pass) {
    console.log(`  ${GREEN}${BOLD}[PASS] 100% Agent Configuration Validation Passed Successfully!${RESET}`);
    console.log(`  Total canonical & mirror artifacts checked: ${results.totalFilesChecked}`);
    console.log(`  Checks 1 through 8: ALL GREEN.`);
    console.log(`${BOLD}================================================================================${RESET}\n`);
    return 0;
  } else {
    console.log(`  ${RED}${BOLD}[FAIL] Agent Configuration Validation Detected Violations!${RESET}`);
    console.log(`  Please review the detailed logs above and remediate canonical sources.`);
    console.log(`${BOLD}================================================================================${RESET}\n`);
    return 1;
  }
}

// --- CLI Execution Entrypoint ---
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node scripts/validate-agent-config.mjs [options]

Options:
  --check      Runs in verification mode. Exits 0 on clean pass, 1 on any violation.
  --verbose    Prints granular file-by-file inspection details and cryptographic hashes.
  --help, -h   Displays this help manual.
`);
    process.exit(0);
  }

  const isVerbose = args.includes('--verbose');
  validateAgentConfig({ verbose: isVerbose })
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(err => {
      console.error(`${RED}[ERROR] Validator execution failed with unexpected exception:${RESET}`, err);
      process.exit(1);
    });
}
