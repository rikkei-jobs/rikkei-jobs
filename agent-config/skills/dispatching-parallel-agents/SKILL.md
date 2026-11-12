---
name: dispatching-parallel-agents
description: Use when decomposing large tasks and coordinating multiple parallel subagents on orthogonal, decoupled subtasks.
---

# Dispatching Parallel Agents

## 1. Overview

The Dispatching Parallel Agents skill governs the decomposition, coordination, and synthesis of parallel subagents working across the Rikkei Jobs monorepo. It establishes strict operational boundaries to ensure that concurrency accelerates delivery without introducing race conditions, overwriting work, or confusing context.

Parallel agent coordination requires adherence to orthogonal partitioning: subtasks must have zero file write overlap, explicit state directory isolation, deterministic communication channels, and disciplined handoff synthesis. This skill also defines how coordination differs between tool environments, bridging Claude Code's native subagent architecture and Gemini CLI / Antigravity's file-based metadata and message-driven framework.

## 2. When to Use and When NOT to Use

### When to Use

- When decomposing large epics, milestones, or multi-faceted feature implementations into decoupled, independent streams of work.
- When performing concurrent read-only architectural investigations, multi-module research, or parallel exploration across domain boundaries.
- When authoring independent rule files, domain skills, or isolated feature slices that reside in mutually exclusive directory trees.
- When coordinating specialized archetypes (e.g., an explorer gathering evidence while a worker drafts specifications).

### When NOT to Use

- When subtasks have strict sequential dependencies where step B cannot begin without step A's output.
- When multiple subtasks require editing the same source files, database migrations, or configuration files (concurrent edits cause file corruption).
- For small, localized tasks that can be completed directly within a single agent session.
- To delegate simple shell execution or basic file reading that the current agent can perform immediately.

## 3. Step-by-Step Process

### Step 1: Orthogonal Task Decomposition (Zero Overlap Principle)

1. Decompose the overarching problem into strictly independent, disjoint subtasks.
2. Establish explicit file write ownership boundaries:
   - Verify that no two subagents are assigned write permissions to the same file or shared resource.
   - For exploration or audit tasks, designate agents as read-only.
3. Define the precise input contracts, required source references, and expected output deliverables for each subtask.

### Step 2: Select and Assign Agent Archetypes

Assign each parallel subagent a focused archetype matching its role:

- `teamwork_explorer`: Read-only investigation, architectural discovery, codebase mapping, and blueprint drafting.
- `teamwork_worker`: Focused implementation and modification strictly within assigned file boundaries.
- `teamwork_reviewer` / `teamwork_challenger`: Independent review, edge-case probing, adversarial evaluation, and compliance verification.
- `teamwork_auditor`: Forensic integrity auditing, rule adherence verification, and non-bypassable independent gate certification.

### Step 3: Configure Tool-Specific Coordination Channels

Adapt execution based on the underlying tool platform:

1. **Claude Code Environment**:
   - Utilize native subagents spawned via the Task execution mechanism.
   - Pass focused prompt instructions, operational boundaries, and task context directly via the invocation payload.
   - Collect structured completion reports from subagent output returns upon completion.
2. **Gemini CLI / Antigravity Environment**:
   - Allocate an isolated state folder for each subagent under `.agents/teamwork/<parent>/<subagent_id>/`.
   - Author a comprehensive `DISPATCH.md` within the subagent state folder containing:
     - Exact mission statement and immutable operational constraints.
     - Mandatory reading list (e.g., `PROJECT.md`, `SCOPE.md`, relevant architectural blueprints).
     - Explicit file write ownership whitelist.
     - Output requirements and handoff format.
   - Establish communication via `send_message` and reactive wakeup triggers.
   - Do NOT poll in a loop; avoid sleep commands; wait reactively for subagent completion notifications.

### Step 4: Monitor Liveness Heartbeat

1. Track subagent liveness through periodic checks of `progress.md` in each subagent's state folder.
2. Verify that each active subagent maintains a heartbeat with UTC timestamps (`Last visited: [timestamp]`).
3. If an agent remains silent or stalled beyond normal thresholds, inspect its latest log state, send a targeted inquiry message, or terminate and reassign the work.

### Step 5: Synthesize Handoffs and Reconcile Findings

1. Collect the self-contained `handoff.md` report from every completed subagent.
2. Conduct an empirical evidence reconciliation:
   - Verify that claimed observations reference real file paths and lines.
   - Validate that stated test results are accompanied by verbatim command outputs and exit codes.
   - When subagents present conflicting findings, resolve them by independently verifying the underlying code artifacts rather than choosing arbitrarily.
3. Synthesize the validated subagent deliverables into a unified milestone progress report or master plan.

## 4. Iron Laws

- **Iron Law 1 (The Orthogonality Law - Zero Write Overlap)**: Under NO circumstance may two parallel agents be granted write access to the same file or shared directory during the same timeframe. Overlapping write boundaries guarantee merge conflicts and state corruption.
- **Iron Law 2 (Teamwork Metadata Isolation)**: The `.agents/teamwork/` directory hierarchy is reserved strictly for coordination metadata (`DISPATCH.md`, `BRIEFING.md`, `progress.md`, `handoff.md`). Production source code, application tests, and database migrations must NEVER be written into `.agents/teamwork/`.
- **Iron Law 3 (Reactive Wakeup - No Polling Loops)**: Agents must never execute active sleep loops (e.g., shell sleep, looping timers) to poll for subagent completion. Agents must rely on platform reactive notification triggers.

## 5. Red Flags

- Assigning multiple workers to edit the same module or shared file concurrently.
- Dispatching subagents with vague, one-sentence instructions lacking file write boundaries or mandatory constraints.
- Mechanically concatenating subagent reports without cross-checking claims against the actual filesystem.
- Storing temporary application code or generated source files inside `.agents/teamwork/`.
- Polling `progress.md` in a tight loop with shell sleep commands.

## 6. Rationalization Table

| Agent Rationalization | Engineering Reality |
|---|---|
| "Assigning two agents to the same file will allow them to finish twice as fast." | Concurrent edits to the same file cause race conditions, overwrite each other's progress, and destroy data integrity. Concurrency requires strictly disjoint scopes. |
| "A brief prompt is enough; the subagent has the same LLM knowledge and will figure it out." | Subagents start with clean or minimal context. Without explicit constraints, read-only bounds, and references, subagents make wrong assumptions and violate project rules. |
| "I will write a quick bash sleep loop to check if the worker is done." | Polling loops waste compute resources, consume API rate limits, and risk being terminated by orchestrator watchdogs. Use native message-based reactive wakeups. |
| "One subagent reported a gate passed, so I can trust it without checking their raw log." | Trust requires verification. Upstream claims must be supported by raw command outputs, exit codes, and timestamps before being incorporated into parent handoffs. |

## 7. Verification Checklist

- [ ] All parallel subtasks have strictly non-overlapping file write boundaries.
- [ ] Each subagent assigned an isolated working/state directory under `.agents/teamwork/`.
- [ ] Dispatch instructions include mandatory constraints, read-only bounds, and output formats.
- [ ] Tool platform mechanics correctly applied (Claude native tasks vs Gemini file/message coordination).
- [ ] Liveness monitored via `progress.md` UTC timestamps without polling loops.
- [ ] Subagent handoffs independently reconciled against real filesystem evidence.
- [ ] Zero production source or test code written into `.agents/teamwork/`.

## 8. Rikkei Jobs Specifics

- Teamwork orchestration root: `.agents/teamwork/`.
- Current Milestone 3 coordination directory: `.agents/teamwork/sub_orch_m3/`.
- Permitted subagent state artifacts:
  - `DISPATCH.md`: task assignment, constraints, and reading list.
  - `BRIEFING.md`: persistent working memory and identity index.
  - `progress.md`: liveness heartbeat and step tracking.
  - `handoff.md`: self-contained completion dossier.
- Platform communication tools:
  - Antigravity / Gemini CLI: `send_message`, `manage_task`, `schedule`.
  - Claude Code: Task execution tool.
- Prohibited paths for subagent state: NEVER write source code into `.agents/teamwork/`. Production code belongs in `agent-config/`, `backend/`, `frontend/`, `mock/`, `scripts/`, or `docs/`.
