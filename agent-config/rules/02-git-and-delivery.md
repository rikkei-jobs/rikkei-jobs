# 02 — Git Workflow, Delivery Discipline & Agent Read-Only Mandate

<!-- cspell:ignore toplevel -->

## 1. Branching Strategy

Follow the Git Flow branching model centered on active integration into `develop`:

- `main`: Production-ready branch. Only release tags and approved merges from `develop` are placed here. Never commit directly to `main`.
- `develop`: Primary integration branch. All feature development converges into `develop`.
- `feature/<task-code>-<short-name>`: Working feature branches branched from `develop` (e.g., `feature/t022db0-project-skeleton`, `feature/nt01-sso-login`).
- Target Branch: Every pull request must target `develop`. Merging directly to `main` is strictly prohibited as specified in `CONTRIBUTING.md`.

## 2. Commit Message Conventions

Formulate commit messages exclusively in English and prefix every commit with the task code `T022DB0`:

- Format: `T022DB0: <type>(<scope>): <short summary>`
- Allowed types:
  - `feat`: New user-facing or technical feature.
  - `fix`: Bug fix.
  - `docs`: Documentation updates only.
  - `style`: Formatting, whitespace adjustments without logic alteration.
  - `refactor`: Code restructuring without bug fixes or new features.
  - `test`: Adding or correcting tests.
  - `chore`: Tooling, build system, or dependency maintenance.
- Concrete examples:
  - `T022DB0: feat(backend): initialize modular monolith skeleton with Spring Boot 4`
  - `T022DB0: docs(conventions): specify API error formats and 20 skills catalogue`
  - `T022DB0: test(backend): add Testcontainers migration mutation check`

## 3. Agent Strict Read-Only Git Mandate (HIGHEST PRIORITY)

AI coding agents (Claude Code, Gemini CLI, Antigravity) are strictly READ-ONLY regarding Git state modifications:

- Never execute modifying git commands under any circumstances:
  - Prohibited commands: `git commit`, `git push`, `git add`, `git stage`, `git commit --amend`, `git rebase`, `git reset`, `git stash`, `git tag`, `git branch -d`, `git checkout -b`, `git switch`, `git restore`.
- Leave all modified files uncommitted in the working tree for human review.
- Only the human Team Lead or repository owner commits and pushes changes to git branches.
- When finishing an implementation, propose the exact English commit message with prefix `T022DB0:` in the handoff report, but never commit it yourself.

## 4. Read-Only Git Command Whitelist

AI agents must restrict Git executions strictly to the following read-only commands:

- `git status`: Inspect current working directory status and uncommitted files.
- `git diff`: Review unstaged modifications against working copy.
- `git diff --stat`: Summarize file change statistics and line delta counts without listing full diffs.
- `git diff --staged`: Review staged changes (if any prior staging was performed by human).
- `git log -n <limit> --pretty=short`: Inspect recent commit history.
- `git branch --show-current`: Check active branch name.
- `git branch -a`: List available branches.
- `git show <commit-hash>`: Inspect specific commit details.
- `git show HEAD:<path>`: Read authoritative HEAD file contents for inspection, parity checks, or clean recovery without running mutating git restore/checkout.
- `git ls-files` and `git ls-files -s`: List tracked repository files, verify ignore patterns, and inspect staging index hashes without mutating tree.
- `git ls-tree <tree-ish>`: Traverse commit or directory tree hierarchy without checking out working copies.
- `git check-ignore -v <path>`: Debug and verify gitignore rules applied to target paths.
- `git rev-parse`: Resolve object names and repository root (`git rev-parse HEAD`, `git rev-parse --show-toplevel`, `git rev-parse --show-prefix`).
- `gh run list` and `gh run view` (read-only): Inspect GitHub Actions CI workflow execution runs and check statuses.

## 5. Deliberate Break Testing & File Preservation

When conducting negative test proofs or deliberate break validations:

- Never use git stash or git reset to revert changes.
- Always back up the target file to the operating system temporary directory (`$env:TEMP` or `/tmp`) with an accompanying SHA-256 hash before applying mutations.
- Perform the deliberate break, execute the validation script, and capture failure output.
- Restore the original file from the OS temporary directory copy.
- Compute the restored file's SHA-256 hash and verify it exactly matches the pre-mutation hash.
- Delete the temporary backup file immediately following restoration.

## 6. Delivery & Pull Request Verification Checklist

Before declaring any task or milestone ready for delivery, complete these mandatory verification steps:

- Verify that working tree modifications exist only in approved writable locations via `git status`.
- Verify mirror parity between `.claude/` and `.gemini/` via `node scripts/sync-agent-config.mjs --check`.
- Execute the repository health verification script:
  - Windows: `.\check.ps1`
  - Linux / macOS: `./check.sh`
- Ensure zero uncommitted secrets, lingering debug statements, or unwanted temporary files.
- Formulate the proposed pull request title and English commit message following `CONTRIBUTING.md`.

## 7. Verification Commands

- Check git working copy status: `git status`
- Inspect working diff summary: `git diff --stat`
- Inspect working diff content: `git diff`
- Inspect tracked files and stage index: `git ls-files -s`
- Read authoritative HEAD file content: `git show HEAD:<path>`
- Inspect last 5 commits: `git log -n 5 --pretty=short`
- Check agent configuration synchronization: `node scripts/sync-agent-config.mjs --check`
