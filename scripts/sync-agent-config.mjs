#!/usr/bin/env node
/**
 * Rikkei Jobs - Agent Configuration Synchronizer & Drift Checker
 * Task T022DB0 - Sprint 1 Quality Gate (Milestone 1)
 *
 * Synchronizes agent configuration from the canonical single source of truth
 * `agent-config/` to `.claude/`, `.gemini/`, and repository root entrypoints.
 *
 * Supported flags:
 *   --check      Runs in verification mode. Exits 0 if 100% in sync, exits 1 if drift detected.
 *   --dry-run    Simulates synchronization without writing any files to disk.
 *   --no-clean   Skips removing orphaned files from destination directories.
 *   --help       Displays usage information.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

// ANSI escape sequences for clean terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================================================================
// 1. REPOSITORY ROOT RESOLVER
// ==============================================================================
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
  throw new Error('Could not locate repository root of rikkei-jobs.');
}

const REPO_ROOT = resolveRepoRoot();
const AGENT_CONFIG_DIR = path.join(REPO_ROOT, 'agent-config');

// Managed destination directories and files
const MANAGED_DIRS = [
  path.join(REPO_ROOT, '.claude', 'rules'),
  path.join(REPO_ROOT, '.claude', 'skills'),
  path.join(REPO_ROOT, '.gemini', 'rules'),
  path.join(REPO_ROOT, '.gemini', 'skills'),
  path.join(REPO_ROOT, '.gemini', 'commands')
];

const MANAGED_ROOT_FILES = [
  path.join(REPO_ROOT, 'CLAUDE.md'),
  path.join(REPO_ROOT, 'GEMINI.md'),
  path.join(REPO_ROOT, 'AGENTS.md'),
  path.join(REPO_ROOT, '.geminiignore')
];

const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.toml', '.yaml', '.yml', '.js', '.mjs', '.ts', '.sh', '.ps1', '.geminiignore'
]);

// ==============================================================================
// 2. HELPER FUNCTIONS: FILE SCANNING & NORMALIZATION
// ==============================================================================
export function isTextFile(filePath, buffer) {
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  const checkLen = Math.min(buffer.length, 512);
  for (let i = 0; i < checkLen; i++) {
    if (buffer[i] === 0) return false;
  }
  return true;
}

export function normalizeContent(rawBuffer, filePath) {
  let buf = rawBuffer;
  // Strip UTF-8 BOM if present (0xEF, 0xBB, 0xBF)
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    buf = buf.subarray(3);
  }

  // If binary file, return clean buffer without newline transformation
  if (!isTextFile(filePath, buf)) {
    return buf;
  }

  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Normalize all line breaks to standard LF (\n)
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Enforce trailing newline if not empty
  if (text.length > 0 && !text.endsWith('\n')) {
    text += '\n';
  }

  return Buffer.from(text, 'utf8');
}

export function scanDirectoryRecursive(dirPath, baseDir = dirPath) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    // Skip OS junk and editor temporary files
    if (
      entry.name === '.DS_Store' ||
      entry.name === 'Thumbs.db' ||
      entry.name.endsWith('~') ||
      entry.name.endsWith('.tmp') ||
      entry.name.startsWith('.git')
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...scanDirectoryRecursive(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push({ fullPath, relPath, name: entry.name });
    }
  }
  return results;
}

export function parseSkillFrontmatter(contentStr) {
  const match = contentStr.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { name: '', description: '' };
  const lines = match[1].split(/\r?\n/);
  let name = '';
  let description = '';
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key === 'name') name = val;
      if (key === 'description') description = val;
    }
  }
  return { name, description };
}

// ==============================================================================
// 3. DESIRED FILES GENERATION ENGINE
// ==============================================================================
export function buildDesiredFilesMap(agentConfigDir, repoRoot) {
  const desired = new Map(); // Map<absoluteDestPath, Buffer>

  if (!fs.existsSync(agentConfigDir)) {
    throw new Error(`Canonical source directory does not exist: ${agentConfigDir}`);
  }

  // 3.1. Rules distribution: agent-config/rules/ -> .claude/rules/ & .gemini/rules/
  const rulesDir = path.join(agentConfigDir, 'rules');
  if (fs.existsSync(rulesDir)) {
    const ruleFiles = scanDirectoryRecursive(rulesDir);
    for (const file of ruleFiles) {
      const rawBuf = fs.readFileSync(file.fullPath);
      const normalized = normalizeContent(rawBuf, file.fullPath);

      const claudeDest = path.join(repoRoot, '.claude', 'rules', file.relPath);
      const geminiDest = path.join(repoRoot, '.gemini', 'rules', file.relPath);

      desired.set(claudeDest, normalized);
      desired.set(geminiDest, normalized);
    }
  }

  // 3.2. Skills distribution: agent-config/skills/ -> .claude/skills/ & .gemini/skills/
  const skillsDir = path.join(agentConfigDir, 'skills');
  const discoveredSkills = []; // For Gemini command generation
  if (fs.existsSync(skillsDir)) {
    const skillFiles = scanDirectoryRecursive(skillsDir);
    for (const file of skillFiles) {
      const rawBuf = fs.readFileSync(file.fullPath);
      const normalized = normalizeContent(rawBuf, file.fullPath);

      const claudeDest = path.join(repoRoot, '.claude', 'skills', file.relPath);
      const geminiDest = path.join(repoRoot, '.gemini', 'skills', file.relPath);

      desired.set(claudeDest, normalized);
      desired.set(geminiDest, normalized);

      if (file.name === 'SKILL.md') {
        const skillName = path.basename(path.dirname(file.fullPath));
        discoveredSkills.push({
          name: skillName,
          content: normalized.toString('utf8'),
          fullPath: file.fullPath
        });
      }
    }
  }

  // 3.3. Entrypoints distribution: agent-config/templates/{CLAUDE.md, GEMINI.md, AGENTS.md}
  const templatesDir = path.join(agentConfigDir, 'templates');
  if (fs.existsSync(templatesDir)) {
    const entrypoints = [
      { template: 'CLAUDE.md', dest: 'CLAUDE.md' },
      { template: 'GEMINI.md', dest: 'GEMINI.md' },
      { template: 'AGENTS.md', dest: 'AGENTS.md' }
    ];

    for (const ep of entrypoints) {
      const tplPath = path.join(templatesDir, ep.template);
      if (fs.existsSync(tplPath)) {
        const rawBuf = fs.readFileSync(tplPath);
        const normalized = normalizeContent(rawBuf, tplPath);
        const destPath = path.join(repoRoot, ep.dest);
        desired.set(destPath, normalized);
      }
    }

    // 3.4. Custom Gemini Commands from templates/gemini-commands/*.toml
    const customCommandsDir = path.join(templatesDir, 'gemini-commands');
    const customCommandsSet = new Set();
    if (fs.existsSync(customCommandsDir)) {
      const cmdFiles = scanDirectoryRecursive(customCommandsDir);
      for (const cmd of cmdFiles) {
        if (cmd.name.endsWith('.toml')) {
          const rawBuf = fs.readFileSync(cmd.fullPath);
          const normalized = normalizeContent(rawBuf, cmd.fullPath);
          const destPath = path.join(repoRoot, '.gemini', 'commands', cmd.relPath);
          desired.set(destPath, normalized);
          customCommandsSet.add(path.basename(cmd.name, '.toml'));
        }
      }
    }

    // 3.5. Auto-generate Gemini fallback commands for skills if no custom template exists
    for (const skill of discoveredSkills) {
      if (!customCommandsSet.has(skill.name)) {
        const fm = parseSkillFrontmatter(skill.content);
        const desc = fm.description || `Use when executing ${skill.name} workflow`;
        const tomlContent = [
          `# Auto-generated fallback command for Gemini CLI / Antigravity`,
          `# Skill: ${skill.name}`,
          `description = "${desc.replace(/"/g, '\\"')}"`,
          `prompt = """`,
          `You are activating the '${skill.name}' skill.`,
          `Follow all instructions and rules defined in:`,
          `.gemini/skills/${skill.name}/SKILL.md`,
          `"""`,
          ``
        ].join('\n');

        const destPath = path.join(repoRoot, '.gemini', 'commands', `${skill.name}.toml`);
        desired.set(destPath, Buffer.from(tomlContent, 'utf8'));
      }
    }

    // 3.6. Project-level settings generator from settings.template.json (T022DB0)
    const settingsTemplatePath = path.join(templatesDir, 'settings.template.json');
    if (fs.existsSync(settingsTemplatePath)) {
      const tplContent = fs.readFileSync(settingsTemplatePath, 'utf8');
      const tpl = JSON.parse(tplContent);

      // Generate .claude/settings.json
      const claudeSettings = tpl.claude || {};
      const claudeNormalized = normalizeContent(
        Buffer.from(JSON.stringify(claudeSettings, null, 2) + '\n', 'utf8'),
        path.join(repoRoot, '.claude', 'settings.json')
      );
      desired.set(path.join(repoRoot, '.claude', 'settings.json'), claudeNormalized);

      // Generate .gemini/settings.json
      const geminiSettings = tpl.gemini || {};
      const geminiNormalized = normalizeContent(
        Buffer.from(JSON.stringify(geminiSettings, null, 2) + '\n', 'utf8'),
        path.join(repoRoot, '.gemini', 'settings.json')
      );
      desired.set(path.join(repoRoot, '.gemini', 'settings.json'), geminiNormalized);

      // Generate .geminiignore (workspace file-access exclusion for Gemini CLI)
      if (Array.isArray(tpl.geminiIgnore)) {
        const geminiIgnoreNormalized = normalizeContent(
          Buffer.from(tpl.geminiIgnore.join('\n') + '\n', 'utf8'),
          path.join(repoRoot, '.geminiignore')
        );
        desired.set(path.join(repoRoot, '.geminiignore'), geminiIgnoreNormalized);
      }
    }
  }

  return desired;
}

// ==============================================================================
// 4. ORPHAN SCANNING
// ==============================================================================
export function scanExistingManagedFiles(repoRoot) {
  const existingFiles = [];

  for (const dir of MANAGED_DIRS) {
    if (fs.existsSync(dir)) {
      const files = scanDirectoryRecursive(dir);
      for (const f of files) {
        // Protect user-local overrides
        if (f.name.includes('.local.')) continue;
        existingFiles.push(f.fullPath);
      }
    }
  }

  for (const rootFile of MANAGED_ROOT_FILES) {
    if (fs.existsSync(rootFile)) {
      existingFiles.push(rootFile);
    }
  }

  // Check managed settings files if present
  const claudeSettings = path.join(repoRoot, '.claude', 'settings.json');
  if (fs.existsSync(claudeSettings)) existingFiles.push(claudeSettings);

  const geminiSettings = path.join(repoRoot, '.gemini', 'settings.json');
  if (fs.existsSync(geminiSettings)) existingFiles.push(geminiSettings);

  return existingFiles;
}

// ==============================================================================
// 5. MAIN EXECUTION CONTROLLER
// ==============================================================================
export function main() {
  const args = process.argv.slice(2);
  const isCheckMode = args.includes('--check');
  const isDryRun = args.includes('--dry-run');
  const isNoClean = args.includes('--no-clean');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${BOLD}Rikkei Jobs - Agent Configuration Synchronizer & Parity Checker${RESET}
Usage:
  node scripts/sync-agent-config.mjs [options]

Options:
  --check      Verify parity and detect drift. Returns exit code 1 if mismatch found.
  --dry-run    Simulate synchronization without modifying any files.
  --no-clean   Do not remove orphaned files from target directories.
  --help, -h   Show this help message.
`);
    process.exit(0);
  }

  console.log('================================================================================');
  console.log(`  ${BOLD}AGENT CONFIGURATION SYNCHRONIZATION & DRIFT CHECK${RESET}`);
  console.log(`  Mode: ${isCheckMode ? `${YELLOW}--check (Verification Only)${RESET}` : `${CYAN}Sync & Distribution${RESET}`}`);
  console.log(`  Repo Root: ${REPO_ROOT}`);
  console.log('================================================================================');

  if (!fs.existsSync(AGENT_CONFIG_DIR)) {
    console.error(`${RED}[ERROR] Canonical source folder does not exist: ${AGENT_CONFIG_DIR}${RESET}`);
    console.error(`Please ensure 'agent-config/' with rules/, skills/, and templates/ is created.`);
    process.exit(1);
  }

  let desiredMap;
  try {
    desiredMap = buildDesiredFilesMap(AGENT_CONFIG_DIR, REPO_ROOT);
  } catch (err) {
    console.error(`${RED}[ERROR] Failed to build desired files map: ${err.message}${RESET}`);
    process.exit(1);
  }

  const existingFiles = scanExistingManagedFiles(REPO_ROOT);
  const existingSet = new Set(existingFiles.map(p => path.resolve(p)));

  const missingFiles = [];
  const driftedFiles = [];
  const synchronizedFiles = [];
  const orphanFiles = [];

  // Check desired files against disk
  for (const [destPath, desiredBuf] of desiredMap.entries()) {
    const resolvedDest = path.resolve(destPath);
    const relDest = path.relative(REPO_ROOT, destPath).replace(/\\/g, '/');

    if (!fs.existsSync(destPath)) {
      missingFiles.push({ path: destPath, relPath: relDest, desiredBuf });
    } else {
      const actualBuf = fs.readFileSync(destPath);
      const expectedHash = crypto.createHash('sha256').update(desiredBuf).digest('hex');
      const actualHash = crypto.createHash('sha256').update(actualBuf).digest('hex');

      if (expectedHash !== actualHash) {
        // Diagnose drift cause
        let reason = 'Content mismatch';
        if (actualBuf.includes('\r\n') && !desiredBuf.includes('\r\n')) {
          reason = 'CRLF line ending detected';
        } else if (actualBuf.length >= 3 && actualBuf[0] === 0xef && actualBuf[1] === 0xbb && actualBuf[2] === 0xbf) {
          reason = 'UTF-8 BOM detected';
        }
        driftedFiles.push({ path: destPath, relPath: relDest, reason, desiredBuf });
      } else {
        synchronizedFiles.push({ path: destPath, relPath: relDest });
      }
    }
  }

  // Find orphaned files
  for (const existing of existingFiles) {
    const resolvedExisting = path.resolve(existing);
    if (!desiredMap.has(resolvedExisting)) {
      orphanFiles.push({
        path: existing,
        relPath: path.relative(REPO_ROOT, existing).replace(/\\/g, '/')
      });
    }
  }

  // ==============================================================================
  // 6. MODE HANDLING: --check vs sync
  // ==============================================================================
  if (isCheckMode) {
    let driftCount = missingFiles.length + driftedFiles.length + orphanFiles.length;

    if (missingFiles.length > 0) {
      console.log(`\n${RED}${BOLD}[MISSING FILES] (${missingFiles.length})${RESET}`);
      for (const item of missingFiles) {
        console.log(`  ${RED}[X] [MISSING]${RESET} ${item.relPath}`);
      }
    }

    if (driftedFiles.length > 0) {
      console.log(`\n${RED}${BOLD}[DRIFTED FILES] (${driftedFiles.length})${RESET}`);
      for (const item of driftedFiles) {
        console.log(`  ${RED}[X] [DRIFT]${RESET} ${item.relPath} (${YELLOW}${item.reason}${RESET})`);
      }
    }

    if (orphanFiles.length > 0) {
      console.log(`\n${YELLOW}${BOLD}[ORPHANED FILES] (${orphanFiles.length})${RESET}`);
      for (const item of orphanFiles) {
        console.log(`  ${YELLOW}[!] [ORPHAN]${RESET} ${item.relPath}`);
      }
    }

    if (driftCount > 0) {
      console.log('\n--------------------------------------------------------------------------------');
      console.error(`${RED}${BOLD}[FAIL] Detected ${driftCount} configuration drift(s)!${RESET}`);
      console.error(`Please run the following command to synchronize:`);
      console.error(`  ${BOLD}node scripts/sync-agent-config.mjs${RESET}\n`);
      process.exit(1);
    } else {
      console.log(`\n${GREEN}${BOLD}[PASS] Agent configuration is 100% synchronized!${RESET}`);
      console.log(`Verified ${synchronizedFiles.length} files across .claude, .gemini, and root entrypoints.`);
      console.log(`Zero missing, zero drift, zero orphans.\n`);
      process.exit(0);
    }
  }

  // ==============================================================================
  // 7. SYNC EXECUTION MODE
  // ==============================================================================
  let writtenCount = 0;
  let cleanedCount = 0;

  // Write / overwrite missing and drifted files
  const filesToWrite = [...missingFiles, ...driftedFiles];
  for (const item of filesToWrite) {
    if (!isDryRun) {
      fs.mkdirSync(path.dirname(item.path), { recursive: true });
      fs.writeFileSync(item.path, item.desiredBuf);
    }
    console.log(`  ${GREEN}[OK] [SYNCED]${RESET} ${item.relPath}`);
    writtenCount++;
  }

  // Clean orphaned files
  if (!isNoClean && orphanFiles.length > 0) {
    for (const item of orphanFiles) {
      if (!isDryRun) {
        fs.unlinkSync(item.path);
        // Clean empty parent directory if needed
        let parentDir = path.dirname(item.path);
        while (parentDir !== REPO_ROOT && fs.existsSync(parentDir)) {
          const remaining = fs.readdirSync(parentDir);
          if (remaining.length === 0) {
            fs.rmdirSync(parentDir);
            parentDir = path.dirname(parentDir);
          } else {
            break;
          }
        }
      }
      console.log(`  ${YELLOW}[X] [REMOVED ORPHAN]${RESET} ${item.relPath}`);
      cleanedCount++;
    }
  }

  console.log('\n--------------------------------------------------------------------------------');
  if (isDryRun) {
    console.log(`${YELLOW}${BOLD}[DRY RUN] Simulation complete.${RESET}`);
    console.log(`Would sync ${writtenCount} file(s) and remove ${cleanedCount} orphan(s).`);
  } else {
    console.log(`${GREEN}${BOLD}[SUCCESS] Agent configuration synchronized successfully!${RESET}`);
    console.log(`Updated/Created: ${writtenCount} file(s)`);
    console.log(`Removed Orphans: ${cleanedCount} file(s)`);
    console.log(`Unchanged:       ${synchronizedFiles.length} file(s)`);
    console.log(`Total Desired:   ${desiredMap.size} file(s)`);
  }
  console.log('================================================================================\n');
  process.exit(0);
}

// Run when executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
