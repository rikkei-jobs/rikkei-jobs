---
name: writing-skills
description: Use when authoring, modifying, testing, or pressure-testing agent skills within this repository.
---

# Writing Skills

## 1. Overview

The Writing Skills meta-skill establishes the technical criteria, architectural conventions, structural requirements, and empirical verification methods for authoring and maintaining agent skills in the Rikkei Jobs monorepo. It codifies lessons from state-of-the-art agent engineering (including the `superpowers` methodology) into strict, enforceable repository standards.

Skills in Rikkei Jobs are task-triggered operational playbooks designed to govern AI agent behavior with enterprise-grade rigor. Every skill must feature a trigger-only description, conform to a strict 8-section layout, respect line limits, cite verified repository paths and commands, and pass behavioural pressure testing to prove that it withstands prompt adversarial pressure in production.

## 2. When to Use and When NOT to Use

### When to Use

- When creating a new task-triggered process skill, domain skill, or backend skill.
- When updating, refactoring, or optimizing any existing `SKILL.md` file within `agent-config/skills/`.
- When designing, executing, or documenting behavioural pressure tests (Baseline vs. Green) for skills.
- When validating skill formatting, line caps, frontmatter compliance, or mirror parity.

### When NOT to Use

- When simply invoking or executing an existing skill during regular feature development or debugging.
- When authoring repository documentation outside the agent configuration framework (e.g., standard architectural docs in `docs/`).
- When authoring core enterprise rules in `agent-config/rules/` (which follow distinct <=150-line single-topic constraints).

## 3. Step-by-Step Process

### Step 1: Define Precise Trigger Conditions (Frontmatter Design)

1. Determine the exact operational context in which the skill must activate.
2. Formulate the YAML frontmatter adhering strictly to these rules:
   - `name`: Must match the directory name exactly in kebab-case (e.g., `writing-skills`).
   - `description`: Must begin strictly with `"Use when ..."` and specify ONLY the triggering circumstances.
   - **CRITICAL**: The description must NEVER contain a summary of the workflow, numbered steps, or rules. Summaries in the description allow LLMs to bypass reading the full body of the skill, undermining compliance with Iron Laws and Red Flags.

### Step 2: Structure the Skill Body (Mandatory 8 Sections)

Author the skill content adhering to the standard 8-section hierarchy:

1. `## 1. Overview`: High-level purpose, architectural philosophy, and context within Rikkei Jobs.
2. `## 2. When to Use and When NOT to Use`: Clear, unambiguous triggers and explicit anti-triggers.
3. `## 3. Step-by-Step Process`: Concrete, numbered execution steps guiding the agent from start to finish.
4. `## 4. Iron Laws`: Absolute, non-negotiable prohibitions and imperatives that must never be broken.
5. `## 5. Red Flags`: Manifestations of non-compliance, bad habits, and anti-patterns to avoid.
6. `## 6. Rationalization Table`: Markdown table contrasting deceptive agent excuses against engineering reality (`| Agent Rationalization | Engineering Reality |`).
7. `## 7. Verification Checklist`: Self-audit checklist with checkbox items `[ ]` covering all mandatory criteria.
8. `## 8. Rikkei Jobs Specifics`: Concrete paths, real stack versions, and exact command lines valid in this repository.

### Step 3: Apply Technical Constraints and Formatting Standards

1. Enforce line limit: The total line count of `SKILL.md` must not exceed 500 lines. If supplementary technical data (e.g., comprehensive tables, large schemas) is needed, place it in reference markdown files within the same skill folder.
2. Zero emoji policy: Strip all Unicode emojis and decorative graphical glyphs.
3. Normalization: Ensure LF line endings (`\n`) and UTF-8 encoding without Byte Order Mark (BOM).
4. Concrete references: Every file path cited in backticks or markdown links must exist in the repository. Every command must match real project tooling.

### Step 4: Synchronize Mirrors and Run Static Validation

1. Execute the synchronizer script to generate mirrors for Claude Code and Gemini CLI:
   `node scripts/sync-agent-config.mjs`
2. Run the validator script to verify structural integrity across all rules and skills:
   `node scripts/validate-agent-config.mjs`
3. Run markdown and spelling linters:
   - Markdown structure: `npx markdownlint-cli2 "agent-config/skills/**/*.md"`
   - Spelling validation: `npx cspell "agent-config/skills/**/*.md"`

### Step 5: Execute Behavioural Pressure Testing (Red-Green Verification)

1. Design a pressure test scenario in `docs/agent-config/tests/<skill-name>.md`:
   - Formulate an adversarial or urgency-inducing prompt that tempts an agent to take shortcuts (e.g., urging it to skip verification or commit directly).
   - Define the expected compliant behavior and the failure signature.
2. Run the Baseline (Red) Test:
   - Execute the prompt against an agent session operating without the skill loaded.
   - Record the baseline failure transcript (e.g., the agent attempts `git commit` or claims an unverified PASS).
3. Run the Green Test:
   - Execute the prompt with the authored skill active.
   - Confirm that the agent cites the skill's Iron Laws, refuses the shortcut, and adheres to repository discipline.
4. Document the observed findings and raw transcript excerpts honestly. If testing cannot be executed, explicitly mark as "Behaviour not verified; static validation only".

## 4. Iron Laws

- **Iron Law 1 (Trigger-Only Description)**: The YAML frontmatter `description` must NEVER summarize the skill's workflow or rules. It must contain only the triggering condition starting with `"Use when ..."`.
- **Iron Law 2 (Strict Line Cap)**: The skill body must never exceed 500 lines. Monolithic documentation must be split into referenced supporting files.
- **Iron Law 3 (Verified Real Paths and Commands)**: An agent authoring a skill must mechanically verify that every single file path and CLI command cited in the skill exists and functions in the real repository. Inventing fictitious paths or tools is an integrity violation.

## 5. Red Flags

- Writing descriptions like `Use when testing. Steps: 1. Run test 2. Fix bugs 3. Commit`.
- Using Unicode emojis (e.g., checkmarks, warning triangles, rockets) anywhere in the file.
- Including placeholder strings such as `TODO`, `FIXME`, or `<insert details here>`.
- Authoring a skill that contradicts enterprise rules (Rules 01 through 16).
- Omitting any of the 8 mandatory sections.

## 6. Rationalization Table

| Agent Rationalization | Engineering Reality |
|---|---|
| "Summarizing the workflow in the description helps models understand faster without loading the file." | Experience from the `superpowers` project proves that workflow summaries in descriptions cause LLMs to hallucinate steps and ignore the body, violating Iron Laws. |
| "This domain skill is too complex to fit within 500 lines; 800 lines is fine." | The 500-line limit forces concise, high-signal writing. Detailed schemas, token tables, and examples belong in co-located reference files loaded on demand. |
| "Adding emojis makes the documentation friendlier and easier to skim." | Emojis consume token bandwidth, violate corporate style guidelines, and trigger lint errors in strict CI environments. |
| "I can invent an example path like `/app/config/settings.json` to illustrate a point." | Fictitious paths confuse coding agents. All examples in Rikkei Jobs skills must reference actual repository paths (e.g., `backend/src/main/resources/application.yml`). |

## 7. Verification Checklist

- [ ] Directory name and frontmatter `name` match 100% in kebab-case.
- [ ] Description starts with `"Use when ..."` with zero workflow summaries.
- [ ] Exactly 8 mandatory sections present in standard sequence.
- [ ] Total line count verified <= 500 lines.
- [ ] Zero emoji characters present in the entire file.
- [ ] LF line endings and UTF-8 encoding verified.
- [ ] All cited file paths and command strings verified against actual repository files.
- [ ] Synchronized via `scripts/sync-agent-config.mjs` and verified with `scripts/validate-agent-config.mjs`.

## 8. Rikkei Jobs Specifics

- Canonical skill repository: `agent-config/skills/<skill-name>/SKILL.md`.
- Synchronized mirror targets:
  - Claude Code: `.claude/skills/<skill-name>/SKILL.md`
  - Gemini CLI: `.gemini/skills/<skill-name>/SKILL.md`
- Core tooling scripts:
  - Mirror synchronizer: `node scripts/sync-agent-config.mjs`
  - Agent config validator: `node scripts/validate-agent-config.mjs`
  - Gate synchronization checker: `node scripts/check-gate-sync.mjs`
- Test documentation directory: `docs/agent-config/tests/`.
- Linters:
  - `npx markdownlint-cli2 "agent-config/skills/**/*.md"`
  - `npx cspell "agent-config/skills/**/*.md"`
