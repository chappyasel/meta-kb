---
entity_id: claude-md
type: concept
bucket: context-engineering
abstract: >-
  CLAUDE.md is a persistent configuration file that injects project-specific
  instructions, constraints, and context into Claude-based agents across
  sessions; its key differentiator is loading automatically without explicit
  invocation, making it the primary mechanism for durable agent behavior
  shaping.
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/anthropics-skills.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/jmilinovich-goal-md.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/letta-ai-lettabot.md
  - articles/agent-skills-overview.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/anthropics-skills.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - claude
  - claude-code
  - agent-skills
  - cursor
  - anthropic
  - andrej-karpathy
  - openclaw
  - mcp
  - autoresearch
  - episodic-memory
  - opencode
  - bm25
  - vector-database
  - context-engineering
last_compiled: '2026-04-07T11:49:14.414Z'
---
# CLAUDE.md

## What It Is

CLAUDE.md is a markdown file that [Claude Code](../projects/claude-code.md) reads automatically at the start of every session. It sits at the project root (or in parent directories, user home, or subdirectories) and provides instructions, constraints, project context, and behavioral guidelines that persist across conversations without requiring the user to re-explain them.

The file is not a feature unique to Claude. [Cursor](../projects/cursor.md) uses `.cursorrules`, [Windsurf](../projects/windsurf.md) uses `.windsurfrules`, and [OpenCode](../projects/opencode.md) follows a similar pattern. But CLAUDE.md is the most actively discussed instance because [Claude Code](../projects/claude-code.md)'s agentic capabilities make persistent instructions both more powerful and more consequential than in a simple autocomplete context.

The name is literal: it is a markdown file named CLAUDE.md, and [Claude](../projects/claude.md) reads it.

## How It Works

Claude Code scans for CLAUDE.md files in a specific order: the current directory, then parent directories up to the filesystem root, then the user's home directory. This creates a layered instruction hierarchy where repository-level rules override or extend user-level defaults.

When loaded, CLAUDE.md content enters the system prompt before the conversation begins. This means its instructions influence every response in the session, including tool use decisions, file modification behavior, which commands Claude will run autonomously, and how Claude communicates.

A typical CLAUDE.md contains:

- **Project architecture summary**: directory layout, key files, naming conventions
- **Behavioral constraints**: what Claude should never do (e.g., "do not modify migrations without confirmation")
- **Command references**: how to run tests, lint, build
- **Code style**: patterns to follow or avoid
- **Agent permissions**: which tools and shell commands are pre-approved

The file also supports `@import` syntax to pull in additional files on load. This is how projects like Hipocampus structure their memory system: CLAUDE.md imports `memory/ROOT.md`, `SCRATCHPAD.md`, `WORKING.md`, and `TASK-QUEUE.md` at session start, making the agent's accumulated knowledge available immediately without explicit invocation. [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md)

## CLAUDE.md as Context Engineering

CLAUDE.md is the simplest implementation of [Context Engineering](../concepts/context-engineering.md): structured text placed in a predictable location that shapes agent behavior by controlling what information enters the context window.

Its relationship to [Agent Skills](../concepts/agent-skills.md) illustrates a broader architectural pattern. The Agent Skills specification uses a three-tier progressive disclosure model where metadata (~100 tokens) loads always, instructions (~5000 tokens) load on trigger, and resources load on demand. [Source](../raw/deep/repos/anthropics-skills.md) CLAUDE.md sits at the top of this hierarchy: it is the always-loaded tier. When Claude Code integrates with skills, CLAUDE.md contains the imports or configuration that makes those skills available.

[Andrej Karpathy](../concepts/andrej-karpathy.md) identified this pattern as part of what he calls "context engineering" — the deliberate construction of what an agent sees at each step of reasoning. CLAUDE.md is the static, persistent layer of that construction. Dynamic layers (tool outputs, retrieved memories, task state) build on top of it.

## AGENTS.md: The Persistent Memory Variant

A related file pattern that appears across the ecosystem is AGENTS.md. Where CLAUDE.md is a human-authored configuration file that engineers maintain deliberately, AGENTS.md accumulates knowledge the agent discovers during work: codebase patterns, API gotchas, architectural decisions, things to avoid.

The Compound Product system writes to AGENTS.md after each iteration: "update AGENTS.md with discovered patterns" is a step in the execution loop. [Source](../raw/deep/repos/snarktank-compound-product.md) This makes AGENTS.md a form of [Episodic Memory](../concepts/episodic-memory.md) encoded as a static file — knowledge gained from prior sessions that re-enters context at the start of new ones.

The distinction matters for agent system design:

| File | Author | Content | Update pattern |
|------|--------|---------|----------------|
| CLAUDE.md | Human engineer | Project setup, constraints, permissions | Manual, infrequent |
| AGENTS.md | Agent | Discovered patterns, codebase knowledge | Automatic, each session |
| SKILL.md | Human or meta-skill | Procedural instructions for a specific capability | Curated |

All three share the same loading mechanism — they are markdown files read into context — but serve different memory functions. CLAUDE.md is closer to [Procedural Memory](../concepts/procedural-memory.md) (how to work in this repo), AGENTS.md closer to [Semantic Memory](../concepts/semantic-memory.md) (facts about the codebase), and session logs closer to [Episodic Memory](../concepts/episodic-memory.md).

## The `allowed-tools` Pattern

The Agent Skills specification includes an experimental `allowed-tools` field in SKILL.md frontmatter (e.g., `Bash(git:*) Read`) that pre-approves specific tool invocations. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) CLAUDE.md serves an analogous role at the project level: by listing approved shell commands or specifying `--dangerously-skip-permissions` contexts, it controls what the agent can do autonomously.

Compound Product's `compound.config.json` specifies `qualityChecks` (commands the agent runs without confirmation), and its prompt template reads this configuration. But the actual permission grants live in CLAUDE.md, which tells Claude Code which tools and commands require confirmation. [Source](../raw/deep/repos/snarktank-compound-product.md) This makes CLAUDE.md a security boundary as much as an instruction file.

## Failure Modes

**Instructions the agent ignores under pressure.** Long CLAUDE.md files with many constraints tend to have some constraints violated when task complexity is high. The agent's attention distributes across all context, and a constraint buried in line 300 of a 400-line CLAUDE.md file competes with active tool outputs and conversation history. Critical constraints belong near the top; comprehensive documentation belongs in imported reference files.

**Conflicting instructions across layers.** When a user-level CLAUDE.md sets `always use TypeScript` and a project-level CLAUDE.md says nothing about language, Claude must resolve the ambiguity. Claude Code's resolution is generally "more specific wins," but the behavior is not guaranteed when instructions conflict substantively rather than merely extend each other.

**Stale instructions.** CLAUDE.md is a static file. If the project's test command changes from `npm test` to `vitest run`, CLAUDE.md keeps pointing to the old command until a human updates it. AGENTS.md has the same problem. Neither file has a mechanism for detecting when its contents are outdated, and the agent will follow stale instructions confidently.

**Security boundary assumption.** CLAUDE.md is text. An agent reading a compromised CLAUDE.md file executes the compromised instructions with the same confidence as a legitimate one. The 26.1% vulnerability rate in community-contributed skill files applies equally to CLAUDE.md files shared across teams or pulled from templates. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) Organizations treating CLAUDE.md as a security control surface should treat it with the same review discipline as code.

**Context budget pressure.** A CLAUDE.md that imports ROOT.md (3K tokens), SCRATCHPAD.md, WORKING.md, and TASK-QUEUE.md alongside inline project documentation can consume 5–10K tokens before the first user message. On models with prompt caching this cost is partially offset (stable content gets cached), but for cost-sensitive deployments, CLAUDE.md size has direct token cost implications every session.

## When NOT to Use It

**When instructions need to vary by task.** CLAUDE.md applies to every conversation in the session. If you need different behavior for code review versus greenfield development, CLAUDE.md is the wrong layer. Use skills with explicit trigger conditions, or invoke different instruction files per task.

**When the project has multiple agents with different roles.** A single CLAUDE.md cannot serve both a "strict code reviewer" agent and a "exploratory brainstorming" agent well. Multi-agent systems with distinct roles need per-agent configuration, not a shared file.

**When you want the agent to discover its own operating constraints.** CLAUDE.md front-loads all constraints. For domains where the agent should learn what constraints are appropriate (early-stage, poorly-specified projects), pre-loading constraints can be counterproductive. [goal-md's](../raw/deep/repos/jmilinovich-goal-md.md) "open mode" explicitly avoids prescribing measurement criteria upfront for this reason.

## Relationship to Other Projects

- **[Claude Code](../projects/claude-code.md)**: Primary consumer. Claude Code's auto-loading of CLAUDE.md from project root and parent directories is what makes the file useful.
- **[Context Engineering](../concepts/context-engineering.md)**: CLAUDE.md is the simplest, most widely deployed instance of the broader practice.
- **[Agent Skills](../concepts/agent-skills.md)**: CLAUDE.md configures which skills are available; skills implement specific capabilities via SKILL.md. The two are complementary layers.
- **[Skill Files](../concepts/skill-md.md)**: SKILL.md is the per-skill analog to CLAUDE.md's project-level role. CLAUDE.md can import or reference SKILL.md files.
- **[OpenClaw](../projects/openclaw.md)**: Uses CLAUDE.md alongside MEMORY.md and USER.md as the always-loaded tier of its memory architecture.
- **[OpenCode](../projects/opencode.md)**: Implements the same pattern under the same filename.
- **[AutoResearch](../projects/autoresearch.md)**: Uses CLAUDE.md as the agent's persistent instruction file in its autonomous optimization loop.
- **[Episodic Memory](../concepts/episodic-memory.md)**: AGENTS.md (the agent-maintained sibling of CLAUDE.md) implements a form of episodic memory as a static file.
- **[Procedural Memory](../concepts/procedural-memory.md)**: CLAUDE.md's primary function is procedural — it encodes how to work in this specific repository.
- **[Context Management](../concepts/context-management.md)**: CLAUDE.md is a concrete tool within the broader context management problem.

## Unresolved Questions

**No standardized schema.** CLAUDE.md is free-form markdown. Two projects using the same file name may have completely different structures, making it impossible to programmatically analyze or validate CLAUDE.md files across a codebase portfolio.

**No versioning or migration.** When Claude's behavior changes across model versions, instructions in CLAUDE.md that relied on specific model behaviors may silently stop working. There is no mechanism to flag or migrate stale behavioral assumptions.

**Governance in multi-contributor repos.** In open-source projects or large engineering teams, who owns CLAUDE.md? What review process applies to changes? An instruction like `pre-approve all git push commands` in CLAUDE.md has meaningful security implications but may not receive code review attention proportionate to its risk.

**Interaction with agentic memory systems.** When projects use memory systems like Mem0, Letta, or Hipocampus alongside CLAUDE.md, the agent receives instructions from multiple sources with different update cadences and authority levels. The resolution order when these sources conflict is not specified.


## Related

- [Claude](../projects/claude.md) — implements (0.8)
- [Claude Code](../projects/claude-code.md) — implements (0.9)
- [Agent Skills](../concepts/agent-skills.md) — part_of (0.8)
- [Cursor](../projects/cursor.md) — implements (0.6)
- [Anthropic](../projects/anthropic.md) — created_by (0.8)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.4)
- [OpenClaw](../projects/openclaw.md) — implements (0.5)
- [Model Context Protocol](../concepts/mcp.md) — part_of (0.6)
- [AutoResearch](../projects/autoresearch.md) — implements (0.5)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.4)
- [OpenCode](../projects/opencode.md) — implements (0.5)
- [BM25](../concepts/bm25.md) — part_of (0.3)
- [Vector Database](../concepts/vector-database.md) — part_of (0.3)
- [Context Engineering](../concepts/context-engineering.md) — implements (0.7)
