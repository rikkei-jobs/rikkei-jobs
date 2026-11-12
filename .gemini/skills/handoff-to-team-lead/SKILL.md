---
name: handoff-to-team-lead
description: Use when preparing completed work for handoff to the human Team Lead for review, staging, and commit.
---

# Handoff to Team Lead

## 1. Overview

The Handoff to Team Lead skill completely supersedes traditional automated branch finishing and commit workflows (such as `finishing-a-development-branch` in superpowers) within the Rikkei Jobs repository. It enforces the project's highest operational constraint: **AI coding agents are strictly forbidden from executing any mutating Git commands.**

In this repository, only the human Team Lead possesses the authority to stage, commit, tag, branch, merge, or push changes. The role of the AI agent upon task completion is to thoroughly verify the workspace, leave a clean and uncommitted working directory, compile a comprehensive Handoff Dossier, and propose a structured sequence of small, atomic commits prefixed with `T022DB0:` for the Team Lead to execute.

## 2. When to Use and When NOT to Use

### When to Use

- When all code modifications, unit tests, and documentation updates for an assigned task are 100% complete.
- After all 25 active quality gates have executed and returned exit code 0 via `verification-before-completion`.
- When an agent has concluded its implementation plan and is preparing to yield execution to the human supervisor or parent orchestrator.

### When NOT to Use

- While tasks or implementation phases are still in progress.
- When any quality gate or test suite is failing or unverified.
- When delegating subtasks between parallel agents (use `dispatching-parallel-agents` instead).
- Under any circumstance as a prelude to running `git commit`, `git add`, or `git push`.

## 3. Step-by-Step Process

### Step 1: Verify Git Status and Read-Only Compliance

1. Run `git status --short` to inspect the exact working tree state.
2. Confirm that Git remains on the designated development branch (`develop`).
3. Verify that zero commits were created, zero files were staged (`Changes to be committed` must be empty), and no branch was created or switched.
4. Ensure all modified files reside strictly within permitted paths (`rikkei-jobs/` and the assigned agent state folder under `.agents/teamwork/`).

### Step 2: Final Quality Gate Certification

1. Re-run the full repository quality gate suite:
   - On Windows: `powershell -File .\check.ps1`
   - On Linux/macOS: `./check.sh`
2. Confirm that all 25 active runtime gates (compilation, Spotless, linters, Vitest, documentation, gate parity) report clean passes with exit code 0.
3. Capture the exact timestamp and terminal output summary to include in the handoff.

### Step 3: Architect Atomic Commit Sequence Proposals

1. Analyze the complete set of modified and newly created files.
2. Decompose the changes into logical, cohesive, self-contained atomic commit units.
3. Formulate each commit proposal adhering strictly to enterprise commit conventions:
   - Prefix: `T022DB0:` (mandatory sprint task code).
   - Language: English only.
   - Format: `T022DB0: <imperative verb> <concise description>`
   - Detailed body: explain the rationale, list key files included, and cite related tickets or design documents.
   - Example sequence:
     1. `T022DB0: add agent-config canonical source and sync script`
     2. `T022DB0: add 16 enterprise rules for claude and gemini mirrors`
     3. `T022DB0: add task-triggered process skills and validation tooling`

### Step 4: Author the Handoff Dossier

Compile a structured handoff document (or include in `handoff.md` within the agent state directory) containing:

1. **Executive Summary**: Brief statement of accomplishments against assigned dispatch requirements.
2. **File Modification Manifest**: Exhaustive list of created, modified, or deleted files with concise descriptions of changes.
3. **Verification Evidence**: Verbatim command strings, exit codes, and raw output excerpts from `check.ps1` or `check.sh`.
4. **Proposed Git Commit Sequence**: Ordered list of copy-pasteable Git commands (`git add <files>`, `git commit -m "T022DB0: ..."`) tailored for the Team Lead.
5. **Rollback Guidance**: Location of any safety backups in OS temp (`$env:TEMP` or `/tmp`) with SHA256 checksums, if applicable.
6. **Outstanding Observations or Risks**: Non-blocking technical notes, potential future optimizations, or items requiring human decision-making.

### Step 5: Clean Up Environment and Yield Control

1. Stop any background processes, test containers, or local servers started during verification.
2. Remove any scratch files or temporary scripts outside the designated state directory.
3. Do NOT revert, discard, or stash the working tree modifications. Leave them intact in the working directory for the Team Lead.
4. Transmit the completion message with the path to the Handoff Dossier to the Team Lead or parent orchestrator.

## 4. Iron Laws

- **Iron Law 1 (THE SUPREME GIT LAW - ZERO AGENT COMMITS)**: Under NO circumstance may an AI agent execute `git commit`, `git push`, `git add`, `git checkout`, `git restore`, `git rebase`, `git reset`, `git merge`, `git stash`, `git branch`, or `git tag`. All mutating Git operations are strictly reserved for the human Team Lead. Any violation of this law constitutes an immediate disqualification.
- **Iron Law 2 (Mandatory Task Prefix)**: Every proposed commit message must start with the exact task identifier `T022DB0:` and be written in English.
- **Iron Law 3 (Certified Gate Pass)**: A handoff dossier must never be submitted unless all active quality gates have executed and returned exit code 0 on the exact working tree state being handed off.

## 5. Red Flags

- Executing `git commit -m "..."` directly or asking the user "May I commit these changes for you?".
- Using `git stash` or `git checkout -- .` to clean the workspace instead of explicit OS file operations.
- Proposing monolithic commit messages like "T022DB0: update various files and fix bugs".
- Presenting a handoff report without raw gate verification output.
- Leaving orphan containers or background servers running after completing work.

## 6. Rationalization Table

| Agent Rationalization | Engineering Reality |
|---|---|
| "I can run git commit locally to save progress, as long as I do not push to origin." | Local commits alter git history, create detached states, and violate project rule C-GIT-01. The Team Lead reviews the uncommitted working tree and controls git history. |
| "Using git stash is the fastest way to save work before checking another file." | `git stash` is a mutating git command forbidden to agents. Use explicit OS temporary copies with SHA256 verification if state backup is needed. |
| "Writing commit messages in Vietnamese would be easier for the local team." | Operational rules mandate English for all Git commits and PR descriptions (prefixed with `T022DB0:`). Reports and communication are in Vietnamese; repository artifacts are in English. |
| "The changes are simple, so one single giant commit is sufficient." | Clean commit history requires atomic commits. Separating infrastructure, business logic, tests, and documentation enables clean bisecting and code auditing. |

## 7. Verification Checklist

- [ ] Working tree status verified with `git status --short`; no staged changes, no rogue files.
- [ ] Working branch confirmed as `develop`.
- [ ] Full quality gate runner (`check.ps1` or `check.sh`) executed cleanly with exit code 0.
- [ ] Proposed commit sequence authored with `T022DB0:` prefix and written in English.
- [ ] Handoff dossier includes complete file manifest, verification logs, and proposed commit sequence.
- [ ] Background processes, test containers, and temporary scratch files cleaned up.
- [ ] Modified files left intact in working tree for Team Lead review.

## 8. Rikkei Jobs Specifics

- Sprint task identifier: `T022DB0` (mandatory prefix for all commit proposals: `T022DB0: <description>`).
- Canonical working branch: `develop`.
- Git operational rule: `agent-config/rules/02-git-and-delivery.md`.
- Quality verification runner:
  - Windows: `powershell -File .\check.ps1`
  - Linux/CI: `./check.sh`
- Agent teamwork state location: `.agents/teamwork/`.
- Safe temporary directory: `$env:TEMP` (Windows) or `/tmp` (Linux).
- Final authority: Human Team Lead.
