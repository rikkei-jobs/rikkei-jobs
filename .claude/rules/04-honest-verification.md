# 04 — Honest Verification, Evidence Before Claims & Quality Gates

## 1. Core Principle: Evidence Before Claims

Adhere strictly to the foundational standard of honest engineering:

- Never claim a quality gate, test suite, or compilation passed without executing the command and observing the exit code in this active session.
- Award a PASS status exclusively to checks that actually ran, completed successfully, and exited with status code 0.
- State test results, compiler outputs, and linter warnings with absolute fidelity. Never conceal, downplay, or falsify errors.
- Never invent metrics, fake test counts, fabricate code coverage percentages, or claim imaginary green runs. If a test was not executed, report it candidly as "NOT VERIFIED".

## 2. Mandatory Raw Output Requirement

Support every assertion of system correctness with verifiable raw terminal evidence:

- Include verbatim excerpts of execution commands, stdout/stderr streams, and exit codes in handoff reports and documentation.
- When claiming a rule or skill is verified, reference the exact repository file path, line numbers, and the terminal command executed to prove it.
- Record the date, official URL, and key takeaways for any external documentation referenced during analysis.

## 3. Quality Gate Architecture & Synchronization

The repository enforces a synchronized quality gate matrix across local runners and CI pipelines:

- Local Runners: `check.sh` (Linux/macOS) and `check.ps1` (Windows PowerShell) execute exactly 28 gate definitions (25 active runtime gates and 3 fallback guards).
- CI Pipeline: `.github/workflows/ci.yml` maps these definitions to 21 automated validation steps across 6 CI jobs.
- Mechanical Verification: `scripts/check-gate-sync.mjs` verifies that `check.sh`, `check.ps1`, and `ci.yml` remain 100% synchronized with zero gate drift.
- Execute the full local verification script prior to completing any work package:
  - Linux / macOS / Git Bash: `./check.sh`
  - Windows PowerShell: `.\check.ps1`

## 4. Deliberate Break Verification (Falsifiability)

Prove that every validation script, lint rule, and quality gate actually detects violations through the deliberate break protocol:

1. Backup: Copy the target source or configuration file to OS temporary storage (`$env:TEMP` or `/tmp`) and compute its SHA-256 hash.
2. Mutation: Introduce a deliberate syntactic, semantic, or structural violation into the working copy.
3. Execution (Red): Run the verification script or gate runner. Verify that the check halts with a non-zero exit code and outputs the expected failure diagnostic. Capture the raw terminal output.
4. Restoration: Copy the pristine file back from OS temporary storage.
5. Hash Verification: Compute the SHA-256 hash of the restored file and confirm it matches the original pre-mutation hash exactly.
6. Execution (Green): Re-run the verification script. Confirm that the check exits with status code 0 and outputs clean PASS status.
7. Cleanup: Delete the temporary backup file from the OS temporary directory.

## 5. Zero Lingering Artifacts & Clean Code Standards

Before declaring any task or sprint deliverable complete, verify the repository remains immaculate:

- Zero Console Logging: No `console.log`, `System.out.println`, or ad-hoc print statements in production code. Use structured loggers.
- Zero Lingering TODO / FIXME: No unfinished placeholder comments (`TODO`, `FIXME`, `XXX`) left behind in committed files.
- Zero Absolute Paths: No user-specific or environment-dependent absolute paths hardcoded across any repository file.
- Clean Docker State: Stop all ephemeral containers and networks created during test runs using `docker compose down`.

## 6. Verification Commands

Execute these standard verification commands to prove repository integrity:

- Run full repository quality verification (Bash): `./check.sh`
- Run full repository quality verification (PowerShell): `.\check.ps1`
- Verify quality gate synchronization across runners: `node scripts/check-gate-sync.mjs`
- Verify version table alignment against manifests: `node scripts/check-version-drift.mjs`
