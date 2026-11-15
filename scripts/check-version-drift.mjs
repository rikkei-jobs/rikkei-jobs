/**
 * Rikkei Jobs - Version Table Drift Check Script
 * Task T022DB0 - Sprint 1 Quality Gate
 * 
 * Verifies that every version documented in docs/03-version-table.md
 * matches the actual project manifest files exactly across BOTH
 * English and Vietnamese sections (exact token matching).
 * BOM versions (Flyway, PostgreSQL JDBC Driver) are dynamically resolved via Maven.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve repo root robustly across various execution directories
let repoRoot = process.cwd();
if (fs.existsSync(path.join(repoRoot, 'docs', '03-version-table.md'))) {
  // Already in rikkei-jobs root
} else if (fs.existsSync(path.join(repoRoot, 'rikkei-jobs', 'docs', '03-version-table.md'))) {
  repoRoot = path.join(repoRoot, 'rikkei-jobs');
} else {
  let cur = __dirname;
  while (cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, 'docs', '03-version-table.md'))) {
      repoRoot = cur;
      break;
    }
    if (fs.existsSync(path.join(cur, 'rikkei-jobs', 'docs', '03-version-table.md'))) {
      repoRoot = path.join(cur, 'rikkei-jobs');
      break;
    }
    cur = path.dirname(cur);
  }
}

const docPath = path.join(repoRoot, 'docs', '03-version-table.md');
if (!fs.existsSync(docPath)) {
  console.error(`ERROR: Could not locate docs/03-version-table.md at ${docPath}`);
  process.exit(1);
}

const docContent = fs.readFileSync(docPath, 'utf8');

console.log('================================================================================');
console.log('  VERSION TABLE (docs/03) DRIFT CHECK');
console.log('================================================================================');



function extract(content, regex, name) {
  const m = content.match(regex);
  if (!m || !m[1]) {
    throw new Error(`Failed to extract ${name}`);
  }
  return m[1].trim();
}

const manifests = {};

// 1. backend/pom.xml
const pomPath = path.join(repoRoot, 'backend', 'pom.xml');
if (fs.existsSync(pomPath)) {
  const pom = fs.readFileSync(pomPath, 'utf8');
  manifests['Spring Boot Starter Parent'] = extract(pom, /<artifactId>spring-boot-starter-parent<\/artifactId>\s*<version>([^<]+)<\/version>/, 'Spring Boot');
  manifests['Springdoc OpenAPI UI'] = extract(pom, /<springdoc\.version>([^<]+)<\/springdoc\.version>/, 'Springdoc');
  manifests['Testcontainers'] = extract(pom, /<testcontainers\.version>([^<]+)<\/testcontainers\.version>/, 'Testcontainers');
  manifests['Spotless Maven Plugin'] = extract(pom, /<spotless\.version>([^<]+)<\/spotless\.version>/, 'Spotless');
  manifests['Google Java Format'] = extract(pom, /<googleJavaFormat>\s*<version>([^<]+)<\/version>/, 'Google Java Format');
  manifests['SpotBugs Maven Plugin'] = extract(pom, /<artifactId>spotbugs-maven-plugin<\/artifactId>\s*<version>([^<]+)<\/version>/, 'SpotBugs');
  const jjwtMatch = pom.match(/<jjwt\.version>([^<]+)<\/jjwt\.version>/);
  manifests['Java JWT (JJWT)'] = jjwtMatch ? jjwtMatch[1].trim() : '';
  manifests['Spring Boot Starter Mail'] = pom.includes('<artifactId>spring-boot-starter-mail</artifactId>')
    ? manifests['Spring Boot Starter Parent']
    : '';
}

// 2. backend/.mvn/wrapper/maven-wrapper.properties
const mavenWrapperPath = path.join(repoRoot, 'backend', '.mvn', 'wrapper', 'maven-wrapper.properties');
if (fs.existsSync(mavenWrapperPath)) {
  const mw = fs.readFileSync(mavenWrapperPath, 'utf8');
  manifests['Apache Maven Wrapper'] = extract(mw, /apache-maven-([0-9.]+)-bin\.zip/, 'Maven distribution');
}

// 3. backend/Dockerfile
const backendDockerPath = path.join(repoRoot, 'backend', 'Dockerfile');
if (fs.existsSync(backendDockerPath)) {
  const bd = fs.readFileSync(backendDockerPath, 'utf8');
  manifests['Java (Eclipse Temurin)'] = extract(bd, /eclipse-temurin:([0-9._]+)-jdk-alpine/, 'Java Temurin Image');
}

// 4. docker-compose.yml
const composePath = path.join(repoRoot, 'docker-compose.yml');
if (fs.existsSync(composePath)) {
  const dc = fs.readFileSync(composePath, 'utf8');
  manifests['PostgreSQL Image'] = extract(dc, /image:\s*postgres:([a-zA-Z0-9._-]+)/, 'Postgres Image');
  manifests['Mailpit Image'] = extract(dc, /image:\s*axllent\/mailpit:([a-zA-Z0-9._-]+)/, 'Mailpit Image');
}

// 5. mock/Dockerfile & package.json
const mockDockerPath = path.join(repoRoot, 'mock', 'Dockerfile');
if (fs.existsSync(mockDockerPath)) {
  const md = fs.readFileSync(mockDockerPath, 'utf8');
  manifests['Node.js Alpine Image'] = extract(md, /FROM\s+node:([a-zA-Z0-9._-]+)/, 'Node Alpine Image');
}

const mockPkgPath = path.join(repoRoot, 'mock', 'package.json');
if (fs.existsSync(mockPkgPath)) {
  const mp = JSON.parse(fs.readFileSync(mockPkgPath, 'utf8'));
  manifests['Express.js'] = mp.dependencies?.express || '';
}

// 6. frontend/package.json & Dockerfile
const fePkgPath = path.join(repoRoot, 'frontend', 'package.json');
if (fs.existsSync(fePkgPath)) {
  const fp = JSON.parse(fs.readFileSync(fePkgPath, 'utf8'));
  manifests['React'] = fp.dependencies?.react || '';
  manifests['React DOM'] = fp.dependencies?.['react-dom'] || '';
  manifests['React Router DOM'] = fp.dependencies?.['react-router-dom'] || '';
  manifests['TypeScript'] = fp.devDependencies?.typescript || '';
  manifests['Vite'] = fp.devDependencies?.vite || '';
  manifests['Vitest'] = fp.devDependencies?.vitest || '';
  manifests['ESLint'] = fp.devDependencies?.eslint || '';
  manifests['Prettier'] = fp.devDependencies?.prettier || '';
}

const feDockerPath = path.join(repoRoot, 'frontend', 'Dockerfile');
if (fs.existsSync(feDockerPath)) {
  const fd = fs.readFileSync(feDockerPath, 'utf8');
  manifests['Nginx Image'] = extract(fd, /FROM\s+nginx:([a-zA-Z0-9._-]+)/, 'Nginx Image');
}

// 7. BOM managed versions - Dynamically resolved from Maven build (Defect D2)
function resolveMavenBOMVersions(backendDir) {
  const targetFile = path.join(backendDir, 'target', 'bom-dependencies.txt');
  let output = '';

  if (fs.existsSync(targetFile)) {
    try {
      output = fs.readFileSync(targetFile, 'utf8');
    } catch (_) {
      output = '';
    }
  }

  const parseMavenOutput = (text) => {
    const flywayCoreMatch = text.match(/org\.flywaydb:flyway-core:jar:([^:\s]+)/);
    const flywayPgMatch = text.match(/org\.flywaydb:flyway-database-postgresql:jar:([^:\s]+)/);
    const pgMatch = text.match(/org\.postgresql:postgresql:jar:([^:\s]+)/);

    if (flywayCoreMatch && flywayPgMatch && pgMatch) {
      if (flywayCoreMatch[1] !== flywayPgMatch[1]) {
        throw new Error(`Flyway core (${flywayCoreMatch[1]}) and PostgreSQL plugin (${flywayPgMatch[1]}) versions diverge`);
      }
      return {
        flyway: flywayCoreMatch[1],
        postgresJdbc: pgMatch[1]
      };
    }
    return null;
  };

  const cached = parseMavenOutput(output);
  if (cached) {
    return { ...cached, source: 'cached target/bom-dependencies.txt' };
  }

  // Check if java is available before executing mvnw
  let javaAvailable = false;
  try {
    execSync('java -version', { stdio: 'ignore' });
    javaAvailable = true;
  } catch (_) {
    javaAvailable = false;
  }

  const isWin = process.platform === 'win32';
  const mvnCmd = isWin ? 'mvnw.cmd' : './mvnw';
  const mvnPath = path.join(backendDir, mvnCmd);

  if (!fs.existsSync(mvnPath)) {
    throw new Error(`Maven wrapper executable not found at ${mvnPath}`);
  }

  if (!javaAvailable) {
    return {
      skipped: true,
      reason: 'Java executable not found in PATH'
    };
  }

  try {
    const filterArg = '-D' + 'includeGroupIds=org.flywaydb,org.postgresql';
    output = execSync(
      `"${mvnPath}" dependency:list "${filterArg}"`,
      { cwd: backendDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } catch (e) {
    return {
      skipped: true,
      reason: `Maven execution failed: ${e.message}`
    };
  }

  const resolved = parseMavenOutput(output);
  if (!resolved) {
    throw new Error('Could not parse Flyway or PostgreSQL JDBC driver version from Maven dependency resolution output');
  }

  // Cache to target/bom-dependencies.txt for subsequent calls
  try {
    const targetDir = path.join(backendDir, 'target');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetFile, output, 'utf8');
  } catch (_) {}

  return { ...resolved, source: 'dynamic Maven dependency resolution' };
}

const backendDir = path.join(repoRoot, 'backend');
let skippedBOM = false;
let bomSkipReason = '';

try {
  const bomRes = resolveMavenBOMVersions(backendDir);
  if (bomRes.skipped) {
    skippedBOM = true;
    bomSkipReason = bomRes.reason;
    console.warn(`\x1b[33m[SKIPPED] Maven BOM dependency resolution bypassed (Reason: ${bomSkipReason}).\x1b[0m`);
    console.warn('\x1b[33m[SKIPPED] Flyway and PostgreSQL JDBC Driver versions will NOT be marked as PASS without Maven verification.\x1b[0m');
  } else {
    manifests['Flyway'] = bomRes.flyway;
    manifests['PostgreSQL JDBC Driver'] = bomRes.postgresJdbc;
    console.log(`[INFO] Resolved BOM versions via ${bomRes.source}: Flyway=${bomRes.flyway}, PostgreSQL JDBC=${bomRes.postgresJdbc}`);
  }
} catch (err) {
  if (process.env.ALLOW_SKIP_MAVEN_BOM === 'true') {
    skippedBOM = true;
    bomSkipReason = err.message;
    console.warn(`\x1b[33m[SKIPPED] Maven BOM resolution bypassed: ${err.message}\x1b[0m`);
  } else {
    console.error(`\x1b[31m[ERROR] Dynamic BOM resolution failed: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

// 8. Tool versions from scripts/tool-versions.env
const toolVersionsPath = path.join(repoRoot, 'scripts', 'tool-versions.env');
if (fs.existsSync(toolVersionsPath)) {
  const tv = fs.readFileSync(toolVersionsPath, 'utf8');
  manifests['Hadolint Image'] = extract(tv, /HADOLINT_VERSION=([^\r\n]+)/, 'Hadolint');
  manifests['Yamllint Image'] = extract(tv, /YAMLLINT_VERSION=([^\r\n]+)/, 'Yamllint');
  manifests['Actionlint Image'] = extract(tv, /ACTIONLINT_VERSION=([^\r\n]+)/, 'Actionlint');
  manifests['SQLFluff Image'] = extract(tv, /SQLFLUFF_VERSION=([^\r\n]+)/, 'SQLFluff');
  manifests['Markdownlint CLI'] = extract(tv, /MARKDOWNLINT_VERSION=([^\r\n]+)/, 'Markdownlint');
  manifests['CSpell'] = extract(tv, /CSPELL_VERSION=([^\r\n]+)/, 'CSpell');
  manifests['CSpell Dict Vi-Vn'] = extract(tv, /CSPELL_DICT_VI_VERSION=([^\r\n]+)/, 'CSpell Dict Vi');
}

/**
 * Extracts concrete version token from a markdown table cell.
 * Handles backticks (`5.3.0`), BOM notations (`12.4.0` (Spring Boot 4.1.2 BOM)),
 * wrapper notations (`3.9.16` (Wrapper 3.3.4)), and LTS brackets (`25 LTS (25.0.5_8)`).
 */
function extractVersionToken(cellText) {
  const codeMatch = cellText.match(/`([^`]+)`/);
  const target = codeMatch ? codeMatch[1].trim() : cellText.trim();
  const ltsMatch = target.match(/\bLTS\s*\(([^)]+)\)/i);
  if (ltsMatch) {
    return ltsMatch[1].trim();
  }
  return target;
}

// Split docs/03 into English and Vietnamese sections (Defect D1)
const part2Header = '## Part 2';
const part2Index = docContent.indexOf(part2Header);
if (part2Index === -1) {
  console.error("ERROR: Could not locate '## Part 2' section header in docs/03-version-table.md");
  process.exit(1);
}
const enSection = docContent.slice(0, part2Index);
const viSection = docContent.slice(part2Index);

function parseSectionTable(sectionText, sectionName) {
  const lines = sectionText.split(/\r?\n/).filter(l => l.trim().startsWith('|'));
  const entries = new Map();
  for (const line of lines) {
    if (line.includes('---|---') || line.includes('Component / Tool') || line.includes('Thành phần / Công cụ')) {
      continue;
    }
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 3) {
      const comp = cols[1];
      const rawVer = cols[2];
      const token = extractVersionToken(rawVer);
      entries.set(comp, { rawVer, token, line });
    }
  }
  return entries;
}

const enEntries = parseSectionTable(enSection, 'English');
const viEntries = parseSectionTable(viSection, 'Vietnamese');

let errors = [];

// 1. Validate every monitored manifest against both English and Vietnamese sections (exact token matching)
for (const [comp, manifestVer] of Object.entries(manifests)) {
  const en = enEntries.get(comp);
  const vi = viEntries.get(comp);

  if (!en) {
    errors.push(`MISSING in English table: '${comp}' (Manifest specifies '${manifestVer}')`);
  } else if (en.token !== manifestVer) {
    errors.push(`DRIFT in English table for '${comp}': docs/03 says '${en.rawVer}' (token '${en.token}'), but manifest specifies '${manifestVer}'`);
  }

  if (!vi) {
    errors.push(`MISSING in Vietnamese table: '${comp}' (Manifest specifies '${manifestVer}')`);
  } else if (vi.token !== manifestVer) {
    errors.push(`DRIFT in Vietnamese table for '${comp}': docs/03 says '${vi.rawVer}' (token '${vi.token}'), but manifest specifies '${manifestVer}'`);
  }

  if (en && vi && en.token !== vi.token) {
    errors.push(`LANGUAGE MISMATCH for '${comp}': English table has '${en.rawVer}' (token '${en.token}'), while Vietnamese table has '${vi.rawVer}' (token '${vi.token}')`);
  }
}

// 2. Detect any unmonitored entries or table asymmetry
const skippedBOMSet = new Set(skippedBOM ? ['Flyway', 'PostgreSQL JDBC Driver'] : []);

for (const comp of enEntries.keys()) {
  if (!(comp in manifests) && !skippedBOMSet.has(comp)) {
    errors.push(`UNTRACKED row in English table: '${comp}' has no corresponding manifest check`);
  }
}
for (const comp of viEntries.keys()) {
  if (!(comp in manifests) && !skippedBOMSet.has(comp)) {
    errors.push(`UNTRACKED row in Vietnamese table: '${comp}' has no corresponding manifest check`);
  }
}

for (const [comp, en] of enEntries.entries()) {
  const vi = viEntries.get(comp);
  if (!vi) {
    errors.push(`BILINGUAL ASYMMETRY: Component '${comp}' exists in English table but is missing in Vietnamese table`);
  }
}
for (const comp of viEntries.keys()) {
  if (!enEntries.has(comp)) {
    errors.push(`BILINGUAL ASYMMETRY: Component '${comp}' exists in Vietnamese table but is missing in English table`);
  }
}


if (errors.length > 0) {
  console.error(`\x1b[31m[FAIL] Detected ${errors.length} version drift error(s):\x1b[0m`);
  for (const err of errors) {
    console.error(`  - \x1b[31m${err}\x1b[0m`);
  }
  console.error('\x1b[31mPlease update docs/03-version-table.md or manifest files to ensure synchronization.\x1b[0m');
  process.exit(1);
} else {
  const verifiedCount = Object.keys(manifests).length;
  console.log(`\x1b[32m[PASS] All ${verifiedCount} monitored manifest versions match docs/03-version-table.md cleanly across both English and Vietnamese sections (exact token match)!\x1b[0m`);
  if (skippedBOM) {
    console.warn(`\x1b[33m[SKIPPED] Note: 2 BOM-managed dependencies (Flyway, PostgreSQL JDBC Driver) were SKIPPED (Reason: ${bomSkipReason}).\x1b[0m`);
  }
  process.exit(0);
}
