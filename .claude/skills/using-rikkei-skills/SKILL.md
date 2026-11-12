---
name: using-rikkei-skills
description: Use when starting any new task, subtask, or user request to discover, evaluate, and invoke relevant project skills.
---

# Using Rikkei Skills

## 1. Overview

The `using-rikkei-skills` skill serves as the bootstrap and navigation gateway for all AI coding agents operating within the Rikkei Jobs repository. It establishes the discovery mechanism for skills, enforces strict precedence rules among instructions, and dictates on-demand progressive disclosure so that agents load only the context necessary for the task at hand.

## 2. When to Use / When NOT to Use

### When to Use

- At the start of any new user prompt, task, or assigned milestone.
- When transitioning between major lifecycle phases (e.g., from architecture exploration to planning, from plan execution to verification).
- When uncertain about repository-specific conventions, domain boundaries, or testing workflows.

### When NOT to Use

- In the middle of an active execution cycle governed by another skill (for example, inside the tight Red-Green-Refactor loop of `test-driven-development`).
- While running low-level atomic shell commands or inspecting individual read-only files.

## 3. Step-by-Step Process

1. **Analyze Task Intent and Scope**:
   - Parse the prompt to identify primary objectives, affected directories (`backend/`, `frontend/`, `mock/`, `docs/`, `scripts/`), and technical domain.
   - Determine whether the task is a new feature, bug fix, architectural refactoring, database migration, or security audit.

2. **Discover Candidate Skills**:
   - Inspect the canonical skill registry at `agent-config/skills/` (mirrored to `.claude/skills/` and `.gemini/skills/`).
   - Match the current task intent against the YAML frontmatter `description` field (strictly phrased as `Use when ...`) of available skills.

3. **Apply Precedence Hierarchy**:
   - Evaluate governing authority in strict descending order:
     1. **Direct User Prompt**: Explicit user directives take immediate precedence, provided they do not breach security hygiene or the Git no-commit invariant.
     2. **Enterprise Rules (01 to 16)**: Located in `agent-config/rules/`. Rules are non-negotiable repository laws (e.g., Rule 02 Git read-only, Rule 07 RBAC, Rule 09 Anti-AI UI).
     3. **Task-Triggered Skills**: Process and domain skills in `agent-config/skills/`.
   - *Conflict Resolution Rule*: If a skill suggests an action that conflicts with an Enterprise Rule, the Rule always prevails.

4. **Load Skills Progressively (On-Demand)**:
   - Read only the specific `SKILL.md` file required for the active phase.
   - Do not bulk-load all 28 skills into working context simultaneously; preserve context window fidelity for implementation details.

5. **Execute Under Skill Governance**:
   - Follow the numbered step-by-step workflow of the loaded skill.
   - Strictly honor all Iron Laws, avoid documented Red Flags, and consult the Rationalization Table when tempted to take shortcuts.

6. **Manage Phase Transitions**:
   - When the active skill concludes its scope, evaluate whether downstream skills must be triggered.
   - Standard execution chain: `brainstorming-before-building` -> `writing-implementation-plans` -> `executing-plans` -> `verification-before-completion` -> `handoff-to-team-lead`.

## 4. Iron Laws

- **Law 1: Rules Supersede Skills**: Enterprise Rules 01-16 always outrank skills. No skill workflow may authorize git commits, secret exposure, unpaginated API queries, or disabling quality gates.
- **Law 2: Progressive Disclosure Only**: Never inject unneeded skill definitions into active working memory. Load skills on demand per task phase.

## 5. Red Flags

- Beginning code modifications without verifying which enterprise rules and skills apply to the target component.
- Triggering a skill when the prompt context contradicts its `Use when ...` activation condition.
- Applying generic third-party development habits that violate Rikkei Jobs project constraints (e.g., executing git commit commands or creating unpaginated endpoints).

## 6. Rationalization Table

| Excuse (Agent Rationalization) | Reality (Engineering Discipline) |
|---|---|
| "This is a trivial one-line edit; I do not need to check any skills." | Trivial edits frequently violate strict conventions: leaking credentials, adding forbidden UI emojis, or skipping quality gate checks. Always check applicable skills. |
| "I have broad software engineering training; reading repository skills is redundant." | Generic training does not know Rikkei Jobs specific invariants: Agent Git no-commit, 5-role RBAC, PostgreSQL 18.6 identity syntax, and anti-AI design rubrics. |
| "Loading skill files wastes precious context window." | Reading a 150-line skill costs minimal tokens and prevents multi-hour rework, broken CI gates, and rejected pull requests. |

## 7. Verification Checklist

- [ ] Inspected `agent-config/skills/` prior to modifying code.
- [ ] Confirmed that the selected skill trigger matches the immediate task phase.
- [ ] Verified that proposed changes do not violate Enterprise Rules 01 through 16.
- [ ] Loaded only the relevant skill file into active context without bulk pollution.

## 8. Rikkei Jobs Specifics

- Canonical skill source: `agent-config/skills/`.
- Target synchronization paths: `.claude/skills/` and `.gemini/skills/`.
- Synchronizer script: `node scripts/sync-agent-config.mjs`.
- Validator script: `node scripts/validate-agent-config.mjs`.
- Repository entrypoints: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`.
