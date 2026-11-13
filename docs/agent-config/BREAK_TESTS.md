# Empirical Deliberate Break Test Suite & Falsifiability Report (T022DB0)

This report documents the empirical execution of 22 deliberate break tests covering all 8 mechanical verification passes implemented in `scripts/validate-agent-config.mjs` and gate synchronization tooling.

In accordance with scientific software engineering and project mandate R6, automated validation tooling must be proven **falsifiable**: every check must fail with Exit Code 1 when presented with a targeted defect, and must return to a clean green state (Exit Code 0) when restored.

- **Task Reference**: T022DB0 (Sprint 1 Milestone 5)
- **Execution Date**: 2026-11-11
- **Validator Script**: `scripts/validate-agent-config.mjs`
- **Operational Mode**: Non-destructive, Git Strictly Read-Only (OS Temp Backup with SHA-256 Hash Verification)

---

## 1. Safe 7-Step Execution Protocol

To adhere strictly to the non-negotiable **Git Strictly Read-Only** constraint, every break test was executed using an automated 7-step isolated staging procedure:

```text
[Step 1: Compute Initial SHA-256]
               │
               ▼
[Step 2: Backup to OS Temp] ────────► Target file copied to <TEMP_DIR>/rj-break-test-<ID>-<Filename>
               │
               ▼
[Step 3: Inject Deliberate Defect] ──► Target file modified with specific violation
               │
               ▼
[Step 4: Execute Validator] ────────► Bounded verification: Asserts Exit Code 1 & specific diagnostic
               │
               ▼
[Step 5: Restore from OS Temp] ─────► Clean original file copied back over target
               │
               ▼
[Step 6: Cryptographic Match] ──────► Asserts restored SHA-256 matches initial SHA-256 100%
               │
               ▼
[Step 7: Final Green Verification] ─► Validator re-run: Asserts Exit Code 0 & 100% PASS
```

---

## 2. Master Break Test Results Matrix

| Test ID | Check Group | Target File | Injected Defect | Broken Exit Code | Restored Hash Match | Restored Exit Code | Result |
|---|---|---|---|---|---|---|---|
| **BT-01A** | Check 1 (YAML Frontmatter) | `agent-config/skills/verification-before-completion/SKILL.md` | Skill name does not match directory name | 1 | 100% Match | 0 | **PASS** |
| **BT-01B** | Check 1 (YAML Frontmatter) | `agent-config/skills/handoff-to-team-lead/SKILL.md` | Skill description missing trigger phrase 'Use when ...' | 1 | 100% Match | 0 | **PASS** |
| **BT-01C** | Check 1 (YAML Frontmatter) | `agent-config/skills/systematic-debugging/SKILL.md` | Skill description contains forbidden workflow summary heuristic | 1 | 100% Match | 0 | **PASS** |
| **BT-02A** | Check 2 (Line Limits & LF) | `agent-config/rules/01-project-context.md` | Rule file exceeds 150 lines cap | 1 | 100% Match | 0 | **PASS** |
| **BT-02B** | Check 2 (Line Limits & LF) | `agent-config/skills/test-driven-development/SKILL.md` | Skill body exceeds 500 lines cap | 1 | 100% Match | 0 | **PASS** |
| **BT-02C** | Check 2 (Line Limits & LF) | `CLAUDE.md` | Root entrypoint exceeds 120 lines cap | 1 | 100% Match | 0 | **PASS** |
| **BT-03A** | Check 3 (Forbidden Patterns) | `agent-config/rules/04-honest-verification.md` | Prohibited emoji detected in rule file | 1 | 100% Match | 0 | **PASS** |
| **BT-03B** | Check 3 (Forbidden Patterns) | `agent-config/rules/03-safety-and-secrets.md` | Hardcoded secret pattern detected | 1 | 100% Match | 0 | **PASS** |
| **BT-03C** | Check 3 (Forbidden Patterns) | `agent-config/skills/handoff-to-team-lead/SKILL.md` | Forbidden unapproved git mutation instruction | 1 | 100% Match | 0 | **PASS** |
| **BT-03D** | Check 3 (Forbidden Patterns) | `agent-config/rules/05-backend-java.md` | Lingering unfinished TODO/FIXME placeholder | 1 | 100% Match | 0 | **PASS** |
| **BT-03E** | Check 3 (Forbidden Patterns) | `docs/design/DESIGN_SYSTEM.md` | Extended emoji scanner violation in design documentation | 1 | 100% Match | 0 | **PASS** |
| **BT-04A** | Check 4 (Links & Anchors) | `agent-config/rules/01-project-context.md` | Broken relative markdown link to non-existent file | 1 | 100% Match | 0 | **PASS** |
| **BT-05A** | Check 5 (Mirror Parity) | `.claude/rules/02-git-and-delivery.md` | Cryptographic parity drift between .claude and canonical source | 1 | 100% Match | 0 | **PASS** |
| **BT-05B** | Check 5 (Mirror Parity) | `.claude/skills/orphan-dummy-skill/SKILL.md` | Orphan file present in mirror directory | 1 | Clean Delete | 0 | **PASS** |
| **BT-06A** | Check 6 (Asset Citations) | `agent-config/rules/05-backend-java.md` | Citation of non-existent Java source file | 1 | 100% Match | 0 | **PASS** |
| **BT-06B** | Check 6 (Asset Citations) | `agent-config/skills/ci-local-and-debug/SKILL.md` | Citation of invalid build tool command | 1 | 100% Match | 0 | **PASS** |
| **BT-06C** | Check 6 ([EXISTS] vs [TARGET]) | `agent-config/rules/07-security-rbac.md` | False `[EXISTS]` claim on unimplemented `@PreAuthorize` construct | 1 | 100% Match | 0 | **PASS** |
| **BT-07A** | Gate Sync (Mechanical Drift Guard) | `scripts/run-ci-in-docker.sh` | Missing validate-agent-config.mjs in Docker CI runner harness | 1 | 100% Match | 0 | **PASS** |
| **BT-07B** | Check 7 (Supporting Files Parity) | `agent-config/skills/frontend-iconography/SKILL.md` | Broken supporting file link in SKILL.md references/* | 1 | 100% Match | 0 | **PASS** |
| **BT-07C** | Check 7 (Supporting Files Parity) | `.gemini/skills/frontend-motion-design/references/recipes.md` | Mirror parity tampering in references/* supporting file | 1 | 100% Match | 0 | **PASS** |
| **BT-08A** | Check 8 (Settings Enforcement) | `.claude/settings.json` | Missing required security permission in .claude/settings.json | 1 | 100% Match | 0 | **PASS** |
| **BT-08B** | Check 8 (Gemini Schema Enforcement) | `.gemini/settings.json` | Undocumented `security.fileAccess` key injected into .gemini/settings.json | 1 | 100% Match | 0 | **PASS** |

---

## 3. Detailed Raw Execution Records & Cryptographic Proofs

### BT-01A: Skill name does not match directory name

- **Check Group**: Check 1 (YAML Frontmatter)
- **Target File**: `agent-config/skills/verification-before-completion/SKILL.md`
- **Initial SHA-256**: `8969cdd6fc3e562b32b9112c18e4041aecd0f59f57b3ba12f1055a2712b9cb0d`
- **Restored SHA-256**: `8969cdd6fc3e562b32b9112c18e4041aecd0f59f57b3ba12f1055a2712b9cb0d`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 1: Found 1 frontmatter violation(s).
    - Skill name 'invalid-skill-name' does not match directory name 'verification-before-completion'
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical skills/verification-before-completion differs from .claude/skills/verification-before-completion
    - Parity mismatch: canonical skills/verification-before-completion differs from .gemini/skills/verification-before-completion
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-01B: Skill description missing trigger phrase 'Use when ...'

- **Check Group**: Check 1 (YAML Frontmatter)
- **Target File**: `agent-config/skills/handoff-to-team-lead/SKILL.md`
- **Initial SHA-256**: `b9b71379a8e3438eeeed890ac5cab4e0195adf68b5de0a53328dcb3e8cae5a65`
- **Restored SHA-256**: `b9b71379a8e3438eeeed890ac5cab4e0195adf68b5de0a53328dcb3e8cae5a65`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 1: Found 1 frontmatter violation(s).
    - Skill description must start with trigger phrase 'Use when ...' (found: 'This skill manages project handoffs to l...')
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical skills/handoff-to-team-lead differs from .claude/skills/handoff-to-team-lead
    - Parity mismatch: canonical skills/handoff-to-team-lead differs from .gemini/skills/handoff-to-team-lead
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-01C: Skill description contains forbidden workflow summary heuristic

- **Check Group**: Check 1 (YAML Frontmatter)
- **Target File**: `agent-config/skills/systematic-debugging/SKILL.md`
- **Initial SHA-256**: `dbefd5b85c4c4dd1997223bf3c5b93bece6a564ba191c80173c1f87c3883a5fc`
- **Restored SHA-256**: `dbefd5b85c4c4dd1997223bf3c5b93bece6a564ba191c80173c1f87c3883a5fc`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 1: Found 1 frontmatter violation(s).
    - Skill description contains forbidden workflow summary heuristic in 'systematic-debugging'
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical skills/systematic-debugging differs from .claude/skills/systematic-debugging
    - Parity mismatch: canonical skills/systematic-debugging differs from .gemini/skills/systematic-debugging
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-02A: Rule file exceeds 150 lines cap

- **Check Group**: Check 2 (Line Limits & LF)
- **Target File**: `agent-config/rules/01-project-context.md`
- **Initial SHA-256**: `78fe98714ad1fc4c914cf6c9752ae4f79e4a985de97b0f3d5045eea8d4736310`
- **Restored SHA-256**: `78fe98714ad1fc4c914cf6c9752ae4f79e4a985de97b0f3d5045eea8d4736310`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 2: Found 1 line cap/encoding violation(s).
    - Rule file '01-project-context.md' exceeds 150 lines cap (current: 175 lines)
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical rules/01-project-context.md differs from .claude/rules/01-project-context.md
    - Parity mismatch: canonical rules/01-project-context.md differs from .gemini/rules/01-project-context.md
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-02B: Skill body exceeds 500 lines cap

- **Check Group**: Check 2 (Line Limits & LF)
- **Target File**: `agent-config/skills/test-driven-development/SKILL.md`
- **Initial SHA-256**: `8f1ae4c9b12f3b9b7fc654f56b37ed1aec85e452bf152218a383ec3db91d5cb5`
- **Restored SHA-256**: `8f1ae4c9b12f3b9b7fc654f56b37ed1aec85e452bf152218a383ec3db91d5cb5`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 2: Found 1 line cap/encoding violation(s).
    - Skill body 'test-driven-development' exceeds 500 lines cap (current: 536 lines)
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical skills/test-driven-development differs from .claude/skills/test-driven-development
    - Parity mismatch: canonical skills/test-driven-development differs from .gemini/skills/test-driven-development
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-02C: Root entrypoint exceeds 120 lines cap

- **Check Group**: Check 2 (Line Limits & LF)
- **Target File**: `CLAUDE.md`
- **Initial SHA-256**: `bb97554a838777d7588f1536db3ecec1a6ed0681b92ae1879ac50f62b696da89`
- **Restored SHA-256**: `bb97554a838777d7588f1536db3ecec1a6ed0681b92ae1879ac50f62b696da89`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 2: Found 1 line cap/encoding violation(s).
    - Root entrypoint 'CLAUDE.md' exceeds 120 lines cap (current: 133 lines)
  [FAIL] Agent Configuration Validation Detected Violations!
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-03A: Prohibited emoji detected in rule file

- **Check Group**: Check 3 (Forbidden Patterns)
- **Target File**: `agent-config/rules/04-honest-verification.md`
- **Initial SHA-256**: `981b8d7c38ef7a9d7f587fede46b55d25a39569e343aa96e3dd33add8f4a04b4`
- **Restored SHA-256**: `981b8d7c38ef7a9d7f587fede46b55d25a39569e343aa96e3dd33add8f4a04b4`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 3: Found 1 forbidden pattern violation(s).
    - Forbidden emoji character detected: '# 04 — Honest Verification [EMOJI: ROCKET], Evidence Before Claims & Quality Gates' at 04-honest-verification.md:1
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical rules/04-honest-verification.md differs from .claude/rules/04-honest-verification.md
    - Parity mismatch: canonical rules/04-honest-verification.md differs from .gemini/rules/04-honest-verification.md
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-03B: Hardcoded secret pattern detected

- **Check Group**: Check 3 (Forbidden Patterns)
- **Target File**: `agent-config/rules/03-safety-and-secrets.md`
- **Initial SHA-256**: `b8a7adedacc341fd3f438b0fcc126bb205f14c3204b6ae363bc58312a6c4a55d`
- **Restored SHA-256**: `b8a7adedacc341fd3f438b0fcc126bb205f14c3204b6ae363bc58312a6c4a55d`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 3: Found 1 forbidden pattern violation(s).
    - Hardcoded secret pattern detected: 'ghp_<SIMULATED_TOKEN_REDACTED>' at 03-safety-and-secrets.md:4
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical rules/03-safety-and-secrets.md differs from .claude/rules/03-safety-and-secrets.md
    - Parity mismatch: canonical rules/03-safety-and-secrets.md differs from .gemini/rules/03-safety-and-secrets.md
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-03C: Forbidden unapproved git mutation instruction

- **Check Group**: Check 3 (Forbidden Patterns)
- **Target File**: `agent-config/skills/handoff-to-team-lead/SKILL.md`
- **Initial SHA-256**: `b9b71379a8e3438eeeed890ac5cab4e0195adf68b5de0a53328dcb3e8cae5a65`
- **Restored SHA-256**: `b9b71379a8e3438eeeed890ac5cab4e0195adf68b5de0a53328dcb3e8cae5a65`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 3: Found 1 forbidden pattern violation(s).
    - Forbidden mutating git command instruction detected: 'git commit -m "T022DB0: direct commit by agent"' at handoff-to-team-lead/SKILL.md:9
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical skills/handoff-to-team-lead differs from .claude/skills/handoff-to-team-lead
    - Parity mismatch: canonical skills/handoff-to-team-lead differs from .gemini/skills/handoff-to-team-lead
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-03D: Lingering unfinished TODO/FIXME placeholder

- **Check Group**: Check 3 (Forbidden Patterns)
- **Target File**: `agent-config/rules/05-backend-java.md`
- **Initial SHA-256**: `e3c0e1355909bb8d619b057bf6ddec3ecbf842e7de234558e9f84cdcac7f91bb`
- **Restored SHA-256**: `e3c0e1355909bb8d619b057bf6ddec3ecbf842e7de234558e9f84cdcac7f91bb`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 3: Found 1 forbidden pattern violation(s).
    - Forbidden placeholder/comment pattern detected: '// TODO: unfinished implementation task' at 05-backend-java.md:4
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical rules/05-backend-java.md differs from .claude/rules/05-backend-java.md
    - Parity mismatch: canonical rules/05-backend-java.md differs from .gemini/rules/05-backend-java.md
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-04A: Broken relative markdown link to non-existent file

- **Check Group**: Check 4 (Links & Anchors)
- **Target File**: `agent-config/rules/01-project-context.md`
- **Initial SHA-256**: `78fe98714ad1fc4c914cf6c9752ae4f79e4a985de97b0f3d5045eea8d4736310`
- **Restored SHA-256**: `78fe98714ad1fc4c914cf6c9752ae4f79e4a985de97b0f3d5045eea8d4736310`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 4: Found 1 broken link/anchor violation(s).
    - Broken markdown link detected: target 'docs/non-existent-architecture.md' does not exist (in 01-project-context.md)
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical rules/01-project-context.md differs from .claude/rules/01-project-context.md
    - Parity mismatch: canonical rules/01-project-context.md differs from .gemini/rules/01-project-context.md
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-05A: Cryptographic parity drift between .claude and canonical source

- **Check Group**: Check 5 (Mirror Parity)
- **Target File**: `.claude/rules/02-git-and-delivery.md`
- **Initial SHA-256**: `8970e5ef30b84a04b71897c0e3385e792b0fef87c7d1c7c9ee5a883f47464b72`
- **Restored SHA-256**: `8970e5ef30b84a04b71897c0e3385e792b0fef87c7d1c7c9ee5a883f47464b72`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical rules/02-git-and-delivery.md differs from .claude/rules/02-git-and-delivery.md
    - Parity mismatch: .claude/rules/02-git-and-delivery.md differs from .gemini/rules/02-git-and-delivery.md
  [FAIL] Agent Configuration Validation Detected Violations!
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-05B: Orphan file present in mirror directory

- **Check Group**: Check 5 (Mirror Parity)
- **Target File**: `.claude/skills/orphan-dummy-skill/SKILL.md`
- **Initial SHA-256**: `N/A (ORPHAN CREATED)`
- **Restored SHA-256**: `DELETED (CLEAN)`
- **Integrity Verification**: Verified Deleted

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 5: Found 1 mirror parity violation(s).
    - Orphan file detected in mirror: .claude/skills/orphan-dummy-skill/SKILL.md
  [FAIL] Agent Configuration Validation Detected Violations!
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-06A: Citation of non-existent Java source file

- **Check Group**: Check 6 (Asset Citations)
- **Target File**: `agent-config/rules/05-backend-java.md`
- **Initial SHA-256**: `e3c0e1355909bb8d619b057bf6ddec3ecbf842e7de234558e9f84cdcac7f91bb`
- **Restored SHA-256**: `e3c0e1355909bb8d619b057bf6ddec3ecbf842e7de234558e9f84cdcac7f91bb`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical rules/05-backend-java.md differs from .claude/rules/05-backend-java.md
    - Parity mismatch: canonical rules/05-backend-java.md differs from .gemini/rules/05-backend-java.md
  [FAIL] Check 6: Found 1 asset/command citation violation(s).
    - Cited file path does not exist in repository: 'backend/src/main/java/com/rikkei/jobs/fake/NonExistentService.java' (in 05-backend-java.md)
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-06B: Citation of invalid build tool command

- **Check Group**: Check 6 (Asset Citations)
- **Target File**: `agent-config/skills/ci-local-and-debug/SKILL.md`
- **Initial SHA-256**: `0165851b75442fea42df88051d2ba1d347be285a5208d4a533d5c3ab3125b104`
- **Restored SHA-256**: `0165851b75442fea42df88051d2ba1d347be285a5208d4a533d5c3ab3125b104`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical skills/ci-local-and-debug differs from .claude/skills/ci-local-and-debug
    - Parity mismatch: canonical skills/ci-local-and-debug differs from .gemini/skills/ci-local-and-debug
  [FAIL] Check 6: Found 1 asset/command citation violation(s).
    - Cited command './gradlew' is not a valid project build/test tool (in ci-local-and-debug/SKILL.md)
```

#### Restoration Confirmation (Exit Code: 0)

```text
[PASS] 100% Agent Configuration Validation Passed Successfully!
Total canonical & mirror artifacts checked: 47
Checks 1 through 6: ALL GREEN.
```

---

### BT-06C: False [EXISTS] claim for unimplemented construct (@PreAuthorize)

- **Check Group**: Check 6 (Asset Citations & `[EXISTS]`/`[TARGET]` Markers)
- **Target File**: `agent-config/rules/07-security-rbac.md`
- **Initial SHA-256**: `696f12482f3a2a67d4748bebffe17902d02bd0e31b51f25a459fd5af170dc82b`
- **Restored SHA-256**: `696f12482f3a2a67d4748bebffe17902d02bd0e31b51f25a459fd5af170dc82b`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 5: Found 2 mirror parity violation(s).
    - Parity mismatch: canonical rules/07-security-rbac.md differs from .claude/rules/07-security-rbac.md
    - Parity mismatch: canonical rules/07-security-rbac.md differs from .gemini/rules/07-security-rbac.md
  [FAIL] Check 6: Found 1 asset/command citation violation(s).
    - False [EXISTS] claim for unimplemented construct '@PreAuthorize' at 07-security-rbac.md:57 (must be marked [TARGET])
  [FAIL] Agent Configuration Validation Detected Violations!
```

#### Restoration Confirmation (Exit Code: 0)

```text
[Check 6/8] Verifying Repository Asset Citations & [EXISTS]/[TARGET] Markers...
  [PASS] Check 6: All cited repository assets/commands verified (91 [EXISTS] verified, 69 [TARGET] distinguished).
```

---

### BT-07A: Missing validate-agent-config.mjs in Docker CI runner harness

- **Check Group**: Gate Synchronization & Mechanical Drift Guard
- **Target File**: `scripts/run-ci-in-docker.sh`
- **Initial SHA-256**: `0B8A6196B0C11D7608AC9DBF0124B5F72EC9790E1C68CDB1ACFE2D65CFFDE13C`
- **Restored SHA-256**: `0B8A6196B0C11D7608AC9DBF0124B5F72EC9790E1C68CDB1ACFE2D65CFFDE13C`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
================================================================================
  QUALITY GATES SYNCHRONIZATION CHECK & MECHANICAL DRIFT GUARD
================================================================================
[DRIFT] Step 'validate-agent-config.mjs' present in .github/workflows/ci.yml but missing in scripts/run-ci-in-docker.sh
[FAIL] Detected 1 gate synchronization mismatch(es)!
```

#### Restoration Confirmation (Exit Code: 0)

```text
================================================================================
  QUALITY GATES SYNCHRONIZATION CHECK & MECHANICAL DRIFT GUARD
================================================================================
[PASS] Quality Gates are 100% synchronized: 28 unique gate definitions (25 active runtime gates + 3 missing-file fallbacks) in check.sh & check.ps1, matching 22 CI pipeline checks and 24 Docker CI harness gates!
```

---

### BT-03E: Extended Emoji Scanner Violation in Design Docs

- **Check Group**: Check 3 (Forbidden Patterns - Extended Scope)
- **Target File**: `docs/design/DESIGN_SYSTEM.md`
- **Initial SHA-256**: `ac008f68cd5ba508ee4a7c746649f50bc0f143e8ee52b5da873367fac3715c75`
- **Restored SHA-256**: `ac008f68cd5ba508ee4a7c746649f50bc0f143e8ee52b5da873367fac3715c75`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 3: Found 1 forbidden pattern violation(s).
    - Forbidden emoji character detected: '# Design System [EMOJI_SPARKLES]' at docs/design/DESIGN_SYSTEM.md:1
  [FAIL] Agent Configuration Validation Detected Violations!
```

#### Restoration Confirmation (Exit Code: 0)

```text
[Check 3/8] Scanning for Forbidden Patterns across Extended Scope (Emoji, Secrets, Git Mutations, TODOs)...
  Scope: Inspected 172 Markdown files across docs/design, docs/agent-config, agent-config, .claude, .gemini, and root.
  [PASS] Check 3: Zero prohibited emojis across all 172 files, and zero secrets/mutations/TODOs in agent config.
```

---

### BT-07B: Broken Supporting File Link in SKILL.md references/*

- **Check Group**: Check 7 (Supporting Files Link Validity & Parity)
- **Target File**: `agent-config/skills/frontend-iconography/SKILL.md`
- **Initial SHA-256**: `e2cc3cc5284267653721c5d861e4d6bb59fc3e640630bfd2f8acee565041e897`
- **Restored SHA-256**: `e2cc3cc5284267653721c5d861e4d6bb59fc3e640630bfd2f8acee565041e897`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 7: Found 1 supporting file violation(s).
    - Skill 'frontend-iconography/SKILL.md' references non-existent supporting path: 'references/non-existent-template.svg'
  [FAIL] Agent Configuration Validation Detected Violations!
```

#### Restoration Confirmation (Exit Code: 0)

```text
[Check 7/8] Validating Skill Supporting Files (references/*) Link Validity & Mirror Parity...
  [PASS] Check 7: All skill references/* links valid and 100% cryptographic parity verified across mirrors.
```

---

### BT-07C: Mirror Parity Tampering in references/* Supporting File

- **Check Group**: Check 7 (Supporting Files Link Validity & Parity)
- **Target File**: `.gemini/skills/frontend-motion-design/references/recipes.md`
- **Initial SHA-256**: `e4203fbaf8853227ba2471c1d5e73bebc42e3d6018d93b7998e85b9252f44769`
- **Restored SHA-256**: `e4203fbaf8853227ba2471c1d5e73bebc42e3d6018d93b7998e85b9252f44769`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 7: Found 1 supporting file violation(s).
    - Parity mismatch: canonical skills/frontend-motion-design/references/recipes.md differs from .gemini mirror
  [FAIL] Agent Configuration Validation Detected Violations!
```

#### Restoration Confirmation (Exit Code: 0)

```text
[Check 7/8] Validating Skill Supporting Files (references/*) Link Validity & Mirror Parity...
  [PASS] Check 7: All skill references/* links valid and 100% cryptographic parity verified across mirrors.
```

---

### BT-08A: Missing Required Security Permission in .claude/settings.json

- **Check Group**: Check 8 (settings.json & .geminiignore Mapping & Security Enforcement)
- **Target File**: `.claude/settings.json`
- **Initial SHA-256**: `d6cbfd2a4822ff545565d19299e9a89ae4dfd923e7c4061f4ece790349533199`
- **Restored SHA-256**: `d6cbfd2a4822ff545565d19299e9a89ae4dfd923e7c4061f4ece790349533199`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 8: Found 2 settings configuration violation(s).
    - .claude/settings.json drifted from 'claude' block in settings.template.json
    - Missing required Claude deny permission: 'Bash(git commit *)'
  [FAIL] Agent Configuration Validation Detected Violations!
```

#### Restoration Confirmation (Exit Code: 0)

```text
[Check 8/8] Validating settings.json & .geminiignore Mapping & Security Enforcement...
  [PASS] Check 8: Both settings.json match template mapping and enforce mandatory security policies.
```

---

### BT-08B: Undocumented Key Injected into .gemini/settings.json

- **Check Group**: Check 8 (settings.json & .geminiignore Mapping & Security Enforcement)
- **Target File**: `.gemini/settings.json`
- **Initial SHA-256**: `03e3e2382281c4194a56d72e6a14c65519170754bf4169f04c21995f8d1b89ba`
- **Restored SHA-256**: `03e3e2382281c4194a56d72e6a14c65519170754bf4169f04c21995f8d1b89ba`
- **Integrity Verification**: Identical (0 byte drift)

#### Diagnostic Failure Output (Exit Code: 1)

```text
  [FAIL] Check 8: Found 2 settings configuration violation(s).
    - .gemini/settings.json drifted from 'gemini' block in settings.template.json
    - Undocumented key 'security.fileAccess' in .gemini/settings.json (not in official settings.schema.json)
  [FAIL] Agent Configuration Validation Detected Violations!
```

#### Restoration Confirmation (Exit Code: 0)

```text
[Check 8/8] Validating settings.json & .geminiignore Mapping & Security Enforcement...
  [PASS] Check 8: Both settings.json match template mapping and enforce mandatory security policies.
```

---

## 4. Tóm Tắt Kết Quả Kiểm Thử Phá Vỡ Thực Nghiệm (Bản Tiếng Việt)

Phần này tóm lược phương pháp luận khoa học, quy trình thực thi và kết quả thực nghiệm của bộ 22 bài kiểm thử phá vỡ (Break Tests) đối với bộ công cụ kiểm định chất lượng cấu hình agent (`scripts/validate-agent-config.mjs` - Quality Gate 25):

### 4.1. Nguyên Lý Khoa Học Về Tính Có Thể Giả Sai (Falsifiability)

Theo nguyên lý kiểm thử phần mềm chuyên nghiệp và yêu cầu bắt buộc của dự án, một công cụ kiểm định tự động chỉ thực sự đáng tin cậy khi được chứng minh là **có thể giả sai (falsifiable)**. Điều này đồng nghĩa với việc: khi mã nguồn hoặc cấu hình bị cố tình đưa vào một lỗi sai cụ thể, công cụ kiểm định bắt buộc phải phát hiện chính xác, in thông báo lỗi rõ ràng và kết thúc với mã lỗi `Exit Code: 1` (trạng thái Red). Khi lỗi được khắc phục và khôi phục nguyên trạng, công cụ phải trở về trạng thái vượt qua hoàn toàn với `Exit Code: 0` (trạng thái Green).

### 4.2. Quy Trình 7 Bước An Toàn Tuyệt Đối (Git Read-Only)

Để tuân thủ nghiêm ngặt nguyên tắc **Git Strictly Read-Only** và bảo toàn 100% tính toàn vẹn của kho lưu trữ, Toàn bộ 22 bài kiểm thử phá vỡ được thực thi theo quy trình 7 bước cô lập thông qua thư mục tạm của hệ điều hành (`$env:TEMP` / `/tmp`):

1. **Bước 1 (Tính Mã Băm Ban Đầu)**: Tính toán mã băm mật mã SHA-256 ban đầu của tệp tin mục tiêu trước khi can thiệp.
2. **Bước 2 (Sao Lưu An Toàn Ra OS Temp)**: Sao chép tệp tin mục tiêu sang thư mục tạm của hệ điều hành, nằm hoàn toàn bên ngoài kho lưu trữ Git.
3. **Bước 3 (Cấy Lỗi Có Chủ Đích)**: Sửa đổi tệp tin mục tiêu với một vi phạm quy tắc cụ thể (ví dụ: chèn emoji, sửa frontmatter, tạo liên kết hỏng, sửa cài đặt bảo mật).
4. **Bước 4 (Thực Thi Kiểm Định)**: Chạy công cụ `validate-agent-config.mjs` hoặc kiểm tra đồng bộ, xác nhận tiến trình thất bại với mã lỗi `Exit Code: 1` và in đúng thông báo chẩn đoán lỗi mục tiêu.
5. **Bước 5 (Khôi Phục Nguyên Trạng)**: Sao chép tệp tin sạch từ thư mục tạm OS trở lại vị trí ban đầu trong kho lưu trữ.
6. **Bước 6 (Đối Soát Mã Băm Mật Mã)**: Tính lại mã băm SHA-256 của tệp vừa khôi phục và so sánh với mã băm ban đầu, bảo đảm tỷ lệ trùng khớp 100% từng byte (0 byte drift).
7. **Bước 7 (Xác Nhận Toàn Diện)**: Chạy lại toàn bộ bộ kiểm định để bảo đảm hệ thống trở lại trạng thái 100% ALL GREEN (`Exit Code: 0`).

### 4.3. Bảng Tổng Kết Kết Quả 22 Bài Break Tests

| Nhóm Kiểm Tra | Số Lượng Bài Test | Mã Kiểm Thử | Tỷ Lệ Phát Hiện Lỗi (Exit Code 1) | Tỷ Lệ Khôi Phục SHA-256 | Kết Quả Chung |
|---|---|---|---|---|---|
| **Check 1**: YAML Frontmatter | 3 bài | BT-01A, BT-01B, BT-01C | 100% (3/3) | 100% trùng khớp mã băm | PASS |
| **Check 2**: Giới Hạn Dòng & Mã Hóa | 3 bài | BT-02A, BT-02B, BT-02C | 100% (3/3) | 100% trùng khớp mã băm | PASS |
| **Check 3**: Quét Mẫu Cấm (Emoji, Secrets, Git) | 5 bài | BT-03A, BT-03B, BT-03C, BT-03D, BT-03E | 100% (5/5) | 100% trùng khớp mã băm | PASS |
| **Check 4**: Liên Kết & Anchor Markdown | 1 bài | BT-04A | 100% (1/1) | 100% trùng khớp mã băm | PASS |
| **Check 5**: Đối Xứng Phản Chiếu Mirror | 2 bài | BT-05A, BT-05B | 100% (2/2) | 100% trùng khớp mã băm | PASS |
| **Check 6**: Dẫn Chứng Tài Nguyên & `[EXISTS]`/`[TARGET]` | 3 bài | BT-06A, BT-06B, BT-06C | 100% (3/3) | 100% trùng khớp mã băm | PASS |
| **Check 7 & Gate Sync**: Tệp Bổ Trợ & CI Sync | 3 bài | BT-07A, BT-07B, BT-07C | 100% (3/3) | 100% trùng khớp mã băm | PASS |
| **Check 8**: Ánh Xạ Bảo Mật Settings & Schema | 2 bài | BT-08A, BT-08B | 100% (2/2) | 100% trùng khớp mã băm | PASS |
| **TỔNG CỘNG** | **22 bài** | **BT-01A đến BT-08B** | **100% (22/22)** | **100% trùng khớp mã băm** | **PASS TOÀN DIỆN** |
