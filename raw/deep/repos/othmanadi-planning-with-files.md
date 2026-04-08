---
url: 'https://github.com/othmanadi/planning-with-files'
type: repo
author: othmanadi
date: '2026-04-04'
tags:
  - context-engineering
  - knowledge-bases
  - agentic-skills
key_insight: >-
  Codifies the Manus-style "filesystem as working memory" pattern into a
  portable agent skill: three persistent markdown files (plan, findings,
  progress) replace volatile context-window state, with lifecycle hooks that
  force re-reading the plan before every tool call -- turning context
  engineering from a manual discipline into an automated guardrail.
stars: 18000
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - skills/planning-with-files/SKILL.md
    - skills/planning-with-files/examples.md
    - skills/planning-with-files/reference.md
    - skills/planning-with-files/templates/task_plan.md
    - skills/planning-with-files/templates/findings.md
    - skills/planning-with-files/templates/progress.md
    - skills/planning-with-files/scripts/init-session.sh
    - skills/planning-with-files/scripts/check-complete.sh
    - skills/planning-with-files/scripts/session-catchup.py
    - commands/plan.md
    - commands/start.md
    - commands/status.md
    - .claude-plugin/plugin.json
    - templates/task_plan.md
    - templates/findings.md
    - templates/progress.md
    - scripts/init-session.sh
    - scripts/check-complete.sh
    - scripts/session-catchup.py
    - tests/test_session_catchup.py
    - tests/test_path_fix.py
  analyzed_at: '2026-04-04'
  original_source: repos/othmanadi-planning-with-files.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 7
  signal_quality: 9
  composite: 8.7
  reason: >-
    Directly implements and codifies the filesystem-as-working-memory pattern
    with SKILL.md lifecycle hooks, session recovery, and multi-platform
    distribution — a concrete, production-ready context engineering tool with
    strong architectural detail.
---

## Architecture Overview

Planning-with-files is an agent skill that implements the "filesystem as working memory" pattern popularized by Manus AI (the company Meta acquired for $2B). The core idea is simple but powerful: LLM coding agents have volatile context windows that degrade over long sessions, so anything important should be persisted to disk in structured markdown files and re-read into context when needed.

The architecture consists of four layers:

**1. The 3-File Pattern.** Every complex task produces three files in the project directory:
- `task_plan.md` -- Phase definitions, progress checkboxes, decision log, error tracking
- `findings.md` -- Research results, discoveries, external content (kept separate from plan for security)
- `progress.md` -- Session log, test results, chronological activity record

**2. Lifecycle Hooks.** The SKILL.md declares four hook types that automate the "read before decide, write after act" discipline:
- `UserPromptSubmit` -- On new user input, reads the current plan and recent progress, injecting them into context
- `PreToolUse` -- Before every tool call (Write, Edit, Bash, Read, Glob, Grep), reads the first 30 lines of task_plan.md to refresh goals in the attention window
- `PostToolUse` -- After every Write/Edit, reminds the agent to update progress.md
- `Stop` -- Before the agent can stop, runs check-complete.sh to verify all phases are marked complete

**3. Session Recovery.** A Python script (`session-catchup.py`) handles context loss after `/clear` commands by scanning `~/.claude/projects/` for conversation history that occurred after the planning files were last updated, producing a catchup report so the agent can resynchronize.

**4. Multi-IDE Distribution.** The skill is packaged for 16+ IDE/agent platforms via dedicated branches (`ide/cursor`, `ide/copilot`, `ide/gemini`, `ide/codex`, etc.), each adapting the hook format for that platform's lifecycle system. The master branch contains the core skill in the Agent Skills specification format.

The directory structure reflects this multi-platform strategy:

```
skills/
  planning-with-files/
    SKILL.md              # Core skill definition with hooks
    examples.md           # Usage examples
    reference.md          # Manus principles deep-dive
    templates/            # Plan, findings, progress templates
    scripts/              # Shell/Python helper scripts
  planning-with-files-zh/ # Chinese (Simplified) variant
  planning-with-files-zht/# Chinese (Traditional) variant
commands/                 # Plugin commands (/plan, /start, /status)
.claude-plugin/           # Claude Code plugin manifest
```

## Core Mechanism

The mechanism that makes planning-with-files effective is the **attention manipulation loop** created by the PreToolUse hook. Here is the exact hook definition from SKILL.md:

```yaml
PreToolUse:
  - matcher: "Write|Edit|Bash|Read|Glob|Grep"
    hooks:
      - type: command
        command: "cat task_plan.md 2>/dev/null | head -30 || true"
```

This means that before every single tool invocation, the first 30 lines of the task plan are re-injected into the agent's context. This is the equivalent of a human re-reading their todo list before every action. The effect is that the agent's goals remain in the most recent part of the context window (where attention is highest), preventing the goal drift that occurs during long multi-step tasks.

The PostToolUse hook creates the complementary write pressure:

```yaml
PostToolUse:
  - matcher: "Write|Edit"
    hooks:
      - type: command
        command: "if [ -f task_plan.md ]; then echo '[planning-with-files] Update progress.md...'; fi"
```

This creates a persistent reminder to log progress after every file modification, building an audit trail the agent can refer to.

The Stop hook enforces completion verification:

```bash
# check-complete.sh (simplified)
if [ -f task_plan.md ]; then
  # Check if all phases are marked complete
  incomplete=$(grep -c "in_progress\|not_started" task_plan.md)
  if [ "$incomplete" -gt 0 ]; then
    echo "INCOMPLETE: $incomplete phases not done"
    exit 1  # Prevents agent from stopping
  fi
fi
```

The session recovery mechanism in session-catchup.py works by:
1. Finding the most recent conversation in `~/.claude/projects/`
2. Comparing file modification times of planning files against conversation timestamps
3. Extracting any conversation turns that happened after the planning files were last updated
4. Producing a summary of "lost context" that the agent can read to catch up

**The Core Principle is explicitly stated:**

```
Context Window = RAM (volatile, limited)
Filesystem = Disk (persistent, unlimited)
--> Anything important gets written to disk.
```

## Design Tradeoffs

**Hook overhead vs. context freshness.** The PreToolUse hook fires on every tool call, reading 30 lines of task_plan.md each time. For a task involving 100+ tool calls, this adds significant token overhead -- roughly 30 lines x 100 calls = 3000 lines of repeated plan content injected into context. The tradeoff: this repetition keeps goals fresh in attention, but consumes context budget that could be used for actual work content.

**Security boundary between plan and findings.** The skill explicitly separates external/untrusted content (web results, API responses) into `findings.md` and keeps `task_plan.md` for trusted, agent-generated content only. This is because the PreToolUse hook auto-injects task_plan.md content repeatedly -- making it a high-value target for indirect prompt injection. If an attacker's text lands in task_plan.md, it gets amplified on every tool call.

**Fixed 3-file structure vs. flexible knowledge organization.** The skill prescribes exactly three files with fixed names and purposes. This simplicity aids adoption (easy to understand, easy to automate) but lacks flexibility. A project with multiple parallel research threads, or a task requiring different types of knowledge artifacts, must flatten everything into the 3-file structure or extend it informally.

**The 2-Action Rule.** The skill prescribes saving findings after every 2 view/browser operations to prevent information loss. This is conservative -- many simple operations do not produce findings worth saving. But the rule's simplicity makes it easy for the agent to follow consistently, trading some unnecessary writes for reliability.

**Template-based initialization vs. dynamic plan generation.** The skill provides static markdown templates that the agent fills in. An alternative approach would be to have the agent generate the plan structure dynamically based on task complexity. The static template approach ensures consistency but may produce overly structured plans for simple tasks.

**Cross-platform portability vs. platform-specific optimization.** The skill maintains separate branches for 12+ IDE platforms, each with slightly different hook implementations. This maximizes reach but creates a maintenance burden -- every feature change must be propagated across all branches.

## Failure Modes & Limitations

**Plan file corruption.** If the agent writes malformed markdown to task_plan.md (e.g., breaking the YAML frontmatter or phase status markers), the hook scripts may fail silently or misparse the plan state. There is no schema validation for the planning files.

**Hook race conditions.** The PreToolUse hook reads task_plan.md before every tool call, but the PostToolUse hook only reminds the agent to update -- it does not force an update. If the agent ignores the reminder (which happens), the plan becomes stale and the pre-tool reads inject outdated information.

**Context window domination.** For very long sessions, the accumulated hook injections can consume a significant fraction of the context window. The UserPromptSubmit hook reads the first 50 lines of the plan plus the last 20 lines of progress, adding ~70 lines to every user turn. Combined with the PreToolUse injection, context overhead can exceed the actual useful content.

**Session recovery limitations.** The catchup script relies on `~/.claude/projects/` directory structure, which is specific to Claude Code. It does not work with other agent runtimes. The script also depends on file modification timestamps, which can be unreliable (e.g., if the system clock is wrong, or if files are modified by non-agent processes).

**No plan revision mechanism.** The skill does not include guidance for when and how to revise the plan itself. If initial assumptions prove wrong and the plan needs restructuring, the agent must improvise. There is no "plan review" phase or mechanism for plan self-critique.

**Single-task assumption.** The skill assumes one active task at a time. If the user wants to pause Task A and work on Task B, the planning files for Task A would be overwritten. The experimental isolated-planning branch addresses this with UUID-based session directories, but it is not in the main branch.

## Integration Patterns

**Plugin + Skill dual distribution.** The repo publishes both as an Agent Skills spec skill (portable across 16+ agents) and as a Claude Code plugin (with /plan and /status slash commands). This dual-distribution pattern maximizes reach while providing enhanced UX on the primary platform.

**Hook-based behavior injection.** The PreToolUse/PostToolUse/Stop hook pattern is the key integration mechanism. Rather than modifying the agent's system prompt (which is read-only in most platforms), hooks inject behavior at tool-call boundaries. This is a powerful pattern because it works without any changes to the agent's core logic -- it is purely additive.

**Fork ecosystem.** The README documents 5 community forks that extend the pattern: multi-project support, interview-first workflows, multi-level task orchestration, crowdfunding escrow, and GitHub repo auditing. This suggests the 3-file pattern is general enough to serve as a foundation for diverse workflow patterns.

**The Manus principle encoding.** The skill explicitly codifies principles from Manus AI's context engineering approach: filesystem as memory, attention manipulation via hooks, error persistence, goal tracking via checkboxes, and completion verification. This makes the skill not just a tool, but a pedagogical artifact that teaches the agent (and the human user) context engineering best practices.

## Benchmarks & Performance

The repo includes formal evaluation results using Anthropic's skill-creator framework:

| Metric | With Skill | Without Skill |
|--------|-----------|---------------|
| Pass rate (30 assertions) | 96.7% (29/30) | 6.7% (2/30) |
| 3-file pattern followed | 5/5 evals | 0/5 evals |
| Blind A/B wins | 3/3 (100%) | 0/3 |
| Avg rubric score | 10.0/10 | 6.8/10 |

These results are striking: a 90-percentage-point improvement in pass rate simply by adding a structured planning discipline. The evaluation used 10 parallel subagents, 5 task types, and 30 objectively verifiable assertions.

The key insight from these benchmarks is that the performance improvement comes not from giving the agent more information, but from giving it better process structure. The skill does not add domain knowledge -- it adds working-memory management discipline. This suggests that context engineering (how information flows through the agent's attention) matters more than the information itself.

**Adoption velocity.** The repo went from 0 to 18K stars in a short period, with 16+ platform integrations. The v2.30.0 version number and detailed CHANGELOG indicate rapid iteration with community contribution. The Chinese-language skill variants indicate international adoption.

**Practical overhead.** The session-catchup mechanism adds a cold-start cost of ~2-5 seconds per session recovery (running Python to scan conversation history). The PreToolUse hook adds ~0.5-1 second per tool call (reading and displaying 30 lines of markdown). These are acceptable latencies for most workflows.

**The Manus Principles reference document** (`reference.md`) within the skill encodes six specific engineering principles from Manus AI's architecture:

1. **Design Around KV-Cache**: Keep prompt prefixes stable (single-token changes invalidate cache). The skill's hook structure is intentionally append-only compatible. Manus reports a 10x cost difference between cached ($0.30/MTok) and uncached ($3/MTok) tokens.

2. **Mask, Don't Remove**: Rather than dynamically removing tools (which breaks KV-cache), use logit masking with consistent action prefixes (browser_, shell_, file_).

3. **Filesystem as External Memory**: The foundational principle -- context window is RAM, filesystem is disk. The reference emphasizes "compression must be restorable": keep URLs even if content is dropped, keep file paths when dropping document contents.

4. **Manipulate Attention Through Recitation**: After ~50 tool calls, models forget original goals ("lost in the middle" effect). The solution is re-reading task_plan.md to push goals into the model's recent attention span. This is directly implemented by the PreToolUse hook.

5. **Keep the Wrong Stuff In**: Failed actions with stack traces let models implicitly update beliefs. Error recovery is described as "one of the clearest signals of TRUE agentic behavior." The skill implements this through mandatory error logging.

6. **Don't Get Few-Shotted**: Repetitive action-observation pairs cause drift and hallucination. The skill recommends varying phrasings and recalibrating on repetitive tasks.

The reference also documents Manus's three context engineering strategies: context reduction (compaction + summarization), context isolation (multi-agent with planner/executor separation), and context offloading (filesystem storage with progressive disclosure). Notably, Manus found ~33% of agent actions were spent updating todo.md, which motivated their shift to a dedicated planner agent -- a tradeoff the skill accepts because the planning overhead is more manageable for single-agent systems.

The planning-with-files pattern represents a broader shift in how agent capabilities are composed: rather than training models to plan better, you engineer the environment to enforce better planning discipline through lifecycle hooks and persistent state files. This environment-centric approach to capability improvement is a core principle of context engineering.
