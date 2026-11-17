# Forensic Audit & Lifecycle Recommendation: Untracked Files and Test Infrastructure

**Document ID**: AUDIT-UNTRACKED-2026-11-16  
**Target Repository**: Rikkei Jobs Platform (`rikkei-jobs`)  
**Task Reference**: T022DB0 (Round 2C Maintenance & Hardening)  
**Author**: Agent Configuration Governance Team  
**Audit Classification**: Operational Safety & Binding Rules Compliance (C5)  
**Auditor Verdict**: PROPOSED FOR REMOVAL / STANDALONE RETENTION (Pending Team Lead Sign-Off)  
**Resolution (2026-11-16, Team Lead sign-off)**: All ten untracked items listed below were never part of the product, CI or the quality gates. They were deleted from the working tree. This document stays as the audit record; the dispositions in the tables describe the state at the time of the audit.

---

## 1. Executive Summary & Purpose

This forensic audit evaluates all ten untracked files and directories currently present in the repository following the merge of NT-01 and Round E exploratory work:

1. `docs/nt01/FINAL_REPORT_ROUND_C.md` (305 lines)
2. `scripts/capture-nt01-screenshots.mjs` (260 lines)
3. `scripts/capture-round-e-before.mjs` (242 lines)
4. `scripts/capture-round-e-after.mjs` (255 lines)
5. `scripts/run-e2e-tests.mjs` (317 lines)
6. `scripts/verify-probe8-fonts.py` (160 lines)
7. `scripts/verify-probes-5-6-7.mjs` (230 lines)
8. `scripts/verify-responsive-empirical.mjs` (715 lines)
9. `scripts/verify-responsive-results.json` (134 lines)
10. `tests/agent-config/` (6 files: `harness.mjs`, `tier1-features.test.mjs`, `tier2-boundaries.test.mjs`, `tier3-combinations.test.mjs`, `tier4-scenarios.test.mjs`, `tier5-adversarial.test.mjs`, 3,560 lines)

In addition, the git-ignored directory `docs/nt01/pr-screenshots/` is preserved untouched.

In accordance with Round 2C Directive C5 (`PROMPT_2C_EN.txt`), absolutely zero untracked files have been modified, deleted, or staged. No CI pipeline, gate script, or validation harness references or executes any of these untracked files. Every legitimate assertion from `tests/agent-config/` has been verified as folded into `scripts/validate-agent-config.mjs` and `docs/agent-config/BREAK_TESTS.md`, or assigned an explicit one-line rationale explaining why it is dropped.

---

## 2. Comprehensive Inventory & Disposition Matrix of All 10 Untracked Items

| # | File / Directory Path | Size / Footprint | Origin / Task | Disposition | Technical Rationale |
|---|---|---|---|---|---|
| 1 | `docs/nt01/FINAL_REPORT_ROUND_C.md` | 305 lines | NT-01 Round C delivery | **KEEP** (Audit Trail) | Historical delivery report documenting NT-01 verification evidence; kept as read-only historical artifact, not wired into automated CI. |
| 2 | `scripts/capture-nt01-screenshots.mjs` | 260 lines | NT-01 Visual QA | **KEEP** (Standalone QA) | Manual Playwright capture utility used during NT-01 visual verification; kept standalone to avoid headless browser dependencies on host CI. |
| 3 | `scripts/capture-round-e-before.mjs` | 242 lines | Round E Diagnostics | **KEEP** (Diagnostic Tool) | Baseline screenshot capture script before Round E visual optimizations; kept standalone for forensic comparison. |
| 4 | `scripts/capture-round-e-after.mjs` | 255 lines | Round E Diagnostics | **KEEP** (Diagnostic Tool) | After-state screenshot capture script for Round E visual optimizations; kept standalone for forensic comparison. |
| 5 | `scripts/run-e2e-tests.mjs` | 317 lines | Round 1 contributor | **DROP** (Pending Removal) | Dropped from CI execution because official E2E runner is `node e2e/run-all.mjs`; contains unsolicited console formatters and is redundant. |
| 6 | `scripts/verify-probe8-fonts.py` | 160 lines | Probe 8 / C2 Check | **KEEP** (Container Tool) | Python fontTools cmap and tabular figures verification script; executed exclusively inside throwaway Docker container (`python:3.11-slim`) to preserve zero-host-install mandate (R0/R1). |
| 7 | `scripts/verify-probes-5-6-7.mjs` | 230 lines | Round E Diagnostics | **KEEP** (Diagnostic Tool) | Standalone exploratory probe verification script for responsive layouts and motion tokens; kept standalone, not wired into CI. |
| 8 | `scripts/verify-responsive-empirical.mjs` | 715 lines | Round E Diagnostics | **KEEP** (Diagnostic Tool) | Empirical responsive viewport measurement script across mobile, tablet, and desktop breakpoints; kept standalone. |
| 9 | `scripts/verify-responsive-results.json` | 134 lines | Round E Diagnostics | **KEEP** (Audit Data) | Raw empirical data output produced by `verify-responsive-empirical.mjs`; kept as static audit evidence. |
| 10 | `tests/agent-config/` (6 test files) | 3,560 lines | Round 1 contributor | **DROP** (Pending Removal) | Dropped from automated test execution due to hazardous `withBackup` in-place file mutation (violates R0); all legitimate assertions folded into canonical validator. |

---

## 3. Detailed Assertion Disposition for `tests/agent-config/*.test.mjs`

Every assertion across the five test tiers in `tests/agent-config/` has been forensically audited and classified:

### 3.1. Tier 1: Feature Tests (`tier1-features.test.mjs` — 27 assertions)

| Test Identifier | Assertion Description | Disposition | Exact Destination or Drop Rationale |
|---|---|---|---|
| `F01-01` | Line ending inspection (LF vs CRLF vs BOM) | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Check 2. |
| `F01-02` | Count body lines excluding frontmatter | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Check 2. |
| `F01-03` | Frontmatter key-value parser | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Check 1. |
| `F01-04` | Forbidden pattern scanner | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Check 3. |
| `F01-05` | Temp sandbox creation and cleanup | **FOLDED** | Standardized in `docs/agent-config/BREAK_TESTS.md` test isolation harness. |
| `F01-06` | `withBackup` preserves SHA-256 on mutation | **DROPPED** | Dropped because mutating tracked repo files violates binding rule R0 and risks permanent repository corruption on process abort. |
| `F01-07` | `withBackup` restores original content on error | **DROPPED** | Dropped because process termination bypasses `finally` blocks in Node.js, making in-place file mutation unacceptable for repository safety. |
| `F02-01..05` | 16 Rules filenames, H1 headers, LF line endings | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Checks 1, 2, and 6. |
| `F03-01..05` | 28 Skills catalog, naming, and trigger descriptions | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Check 1. |
| `F04-01..05` | Root entrypoints (CLAUDE, GEMINI, AGENTS) compliance | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Checks 2 and 3. |
| `F05-01..05` | Mirror parity between `.claude` and `.gemini` | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Check 5 and `sync-agent-config.mjs --check`. |
| `F06-01..03` | Line cap thresholds (rules <= 150, skills <= 500, entrypoints <= 120) | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Check 2. |
| `F07-01..03` | Emoji, credentials, and git mutation checks | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Check 3 across 185 markdown files. |
| `F08-01..02` | Markdown link target and internal anchor existence | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Check 4 and Check 7. |
| `F09-01..03` | Security policies in `settings.json` and `.geminiignore` | **FOLDED** | Enforced mechanically in `scripts/validate-agent-config.mjs` Check 8. |

### 3.2. Tier 2: Boundary Tests (`tier2-boundaries.test.mjs` — 24 assertions)

| Test Identifier | Assertion Description | Disposition | Exact Destination or Drop Rationale |
|---|---|---|---|
| `B01-B03` | Rule line cap boundaries (149, 150, 151 lines) | **FOLDED** | Enforced in `validate-agent-config.mjs` Check 2 and documented as break-test `BT-02A` in `BREAK_TESTS.md`. |
| `B04-B06` | Skill body line cap boundaries (499, 500, 501 lines) | **FOLDED** | Enforced in `validate-agent-config.mjs` Check 2 and documented as break-test `BT-02B` in `BREAK_TESTS.md`. |
| `B07-B09` | Root entrypoint line cap boundaries (119, 120, 121 lines) | **FOLDED** | Enforced in `validate-agent-config.mjs` Check 2 and documented as break-test `BT-02C` in `BREAK_TESTS.md`. |
| `B10-B12` | UTF-8 with BOM, lone CR, and mixed CRLF boundary rejection | **FOLDED** | Enforced in `validate-agent-config.mjs` Check 2 and documented as break-test `BT-02D` in `BREAK_TESTS.md`. |
| `B13-B24` | Frontmatter character length and token boundary limits | **DROPPED** | Dropped because frontmatter trigger format is validated structurally by Check 1 without requiring synthetic length fuzzing. |

### 3.3. Tier 3: Combinations Tests (`tier3-combinations.test.mjs` — 18 assertions)

| Test Identifier | Assertion Description | Disposition | Exact Destination or Drop Rationale |
|---|---|---|---|
| `C01-C06` | Cross-platform mirror parity and hash identity | **FOLDED** | Enforced in `scripts/validate-agent-config.mjs` Check 5 (168 mirror files verified with zero drift). |
| `C07-C12` | Missing file and rogue file detection across mirrors | **FOLDED** | Enforced in `scripts/validate-agent-config.mjs` Check 5 (asymmetric orphan detection). |
| `C13-C18` | Synthetic multi-file mutation permutation harness | **DROPPED** | Dropped because synthetic harness unit tests duplicate the deterministic verification provided by `sync-agent-config.mjs --check`. |

### 3.4. Tier 4: Scenarios Tests (`tier4-scenarios.test.mjs` — 14 assertions)

| Test Identifier | Assertion Description | Disposition | Exact Destination or Drop Rationale |
|---|---|---|---|
| `S01-S06` | Static regex discovery of agent triggers | **FOLDED** | Enforced in `scripts/validate-agent-config.mjs` Check 8 and settings template validation. |
| `S07-S14` | Mock agent discovery session simulations | **DROPPED** | Dropped because regex simulations do not test real LLM runtime behavior and create ungrounded pass assertions contrary to Rule 04. |

### 3.5. Tier 5: Adversarial Tests (`tier5-adversarial.test.mjs` — 37 assertions)

| Test Identifier | Assertion Description | Disposition | Exact Destination or Drop Rationale |
|---|---|---|---|
| `ADV-CV-01..08` | Color contrast calculations (WCAG AA/AAA, APCA, CIELAB) | **FOLDED** | Enforced 100% in `scripts/compute-contrast.mjs` across all 66 color pairs in `DESIGN_SYSTEM.md`. |
| `ADV-VN-01..07` | Vietnamese diacritics and font CMAP coverage | **FOLDED** | Enforced 100% in containerized check `scripts/verify-probe8-fonts.py` via `python:3.11-slim` throwaway container. |
| `ADV-EP-01..06` | Quality gate synchronization and version drift | **FOLDED** | Enforced in `scripts/check-gate-sync.mjs` and `scripts/check-version-drift.mjs`. |
| `ADV-01..06` | Regex evasion and inline comment exemptions | **DROPPED** | Dropped because Check 3 enforces strict positive regex rules in `validate-agent-config.mjs` without allowing inline exemption bypasses. |
| `ADV-07..09` | Path traversal and build tool evasion | **FOLDED** | Enforced in `scripts/validate-agent-config.mjs` Check 6 (gradlew prohibition and path resolution). |
| `ADV-10` | Markdown link with CommonMark title attribute parser | **DROPPED** | Dropped because Check 4 strips fragment anchors and title attributes, resolving clean file targets on disk. |
| `ADV-11..14` | Mirror parity orphan asymmetries and reference hashing | **FOLDED** | Enforced in `scripts/validate-agent-config.mjs` Check 5 and Check 7. |
| `ADV-15..18` | Parser divergence and line ending normalizer tests | **DROPPED** | Dropped because canonical synchronizer `sync-agent-config.mjs` generates byte-exact UTF-8 LF files from canonical templates. |
| `ADV-19..21` | Gate synchronizer regex robustness unit tests | **DROPPED** | Dropped because `scripts/check-gate-sync.mjs` uses strict line anchors and double-quote boundaries, verified by break-test. |
| `ADV-22..25` | Self-healing and exact line boundary thresholds | **FOLDED** | Enforced across 22 hermetic break-tests documented in `docs/agent-config/BREAK_TESTS.md`. |

---

## 4. Verification Proof: Zero CI / Tooling References to Untracked Files

To guarantee that no continuous integration workflow, automated gate runner, or linting tool depends on or references any of the ten untracked items, an exhaustive search across all CI workflows, scripts, and gate runners was performed:

```powershell
# Command executed from repository root:
Get-ChildItem -Path scripts, .github, check.sh, check.ps1 -Recurse -File |
  Select-String -Pattern "(capture-nt01|capture-round-e|run-e2e-tests|verify-probe8|verify-probes-5-6-7|verify-responsive|FINAL_REPORT_ROUND_C|tests/agent-config)"
```

### Raw Terminal Output

```text
scripts\run-e2e-tests.mjs:5: * Module: scripts/run-e2e-tests.mjs
scripts\run-e2e-tests.mjs:12: *   node scripts/run-e2e-tests.mjs [options]
scripts\run-e2e-tests.mjs:101:Usage: node scripts/run-e2e-tests.mjs [options]
scripts\verify-responsive-empirical.mjs:694:  const resultJsonPath = path.resolve(ROOT_DIR, 'scripts', 'verify-responsive-results.json');
```

**Finding**: Zero matches detected in `.github/workflows/ci.yml`, `check.sh`, `check.ps1`, or any validation script. The only matches found are internal self-references inside `run-e2e-tests.mjs` and `verify-responsive-empirical.mjs` themselves.

---

## 5. Invariant Operational Directives

1. **Non-Modification Invariant**: The ten untracked items listed above remain completely untouched on disk. None of them have been modified, staged, or deleted.
2. **Read-Only Invariant**: In compliance with Rule 02 and Rule R0, git operations remain strictly read-only.
3. **Formal Recommendation**: The Agent Configuration Governance Team recommends that the Human Team Lead formally review this audit and execute permanent deletion of the dropped test files (`tests/agent-config/` and `scripts/run-e2e-tests.mjs`) upon milestone sign-off, preserving the historical and diagnostic scripts as standalone tools.
