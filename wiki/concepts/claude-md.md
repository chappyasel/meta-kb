---
entity_id: claude-md
type: concept
bucket: context-engineering
abstract: >-
  A markdown file convention for providing persistent instructions and context
  to Claude agents, functioning as a disk-resident system prompt that survives
  across sessions and configures agent behavior at the project level.
sources:
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/kevin-hs-sohn-hipocampus.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/jmilinovich-goal-md.md
related:
  - Claude Code
  - Claude
  - OpenClaw
last_compiled: '2026-04-05T20:28:57.297Z'
---
# claude.md

## What It Is

`CLAUDE.md` is a markdown file that Claude agents read automatically at session start, loading its contents as persistent context before any user message. The convention extends the system prompt concept to the filesystem: instructions, project context, memory, and behavioral rules live in a checked-in file rather than an API parameter.

The file has no schema. A `CLAUDE.md` can contain anything from a two-line project description to hundreds of lines of coding conventions, memory imports, skill references, and workflow rules. The agent treats the file's contents as authoritative configuration for the session.

## Why It Exists

Agents run in sessions. Each session starts cold. Without a persistence mechanism, a developer must re-explain project conventions, preferred patterns, and behavioral constraints on every interaction. `CLAUDE.md` solves this by giving agents a stable configuration surface that survives context windows.

Harrison Chase's framing of [continual learning at three layers](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) positions this clearly: the model layer (weights), the harness layer (Claude Code itself), and the context layer (CLAUDE.md, skills, memory files). `CLAUDE.md` is context-layer configuration. It does not modify the model or the harness -- it configures a specific instance for a specific project or user.

This matters because context-layer changes are the lowest-friction path to improving agent behavior. No retraining, no harness deployment, no API call changes. Edit a file, the agent behaves differently next session.

## How It Works

Claude Code (and other Claude-based agents) automatically load `CLAUDE.md` files from the working directory at session start. The file contents are injected before the first user turn, effectively prepending a project-specific system prompt.

Two loading patterns appear in practice:

**Direct file load**: The agent reads the file content and treats it as context. This is the baseline behavior -- one file, one project.

**`@import` chaining**: Claude Code's `@import` directive in `CLAUDE.md` allows the file to pull in additional files. The [hipocampus system](../projects/hipocampus.md) uses this to auto-load `memory/ROOT.md`, `SCRATCHPAD.md`, `WORKING.md`, and `TASK-QUEUE.md` into every session. A single `CLAUDE.md` becomes an orchestrator that assembles a full context package from multiple files.

```markdown
@import memory/ROOT.md
@import SCRATCHPAD.md
@import WORKING.md
```

This transforms `CLAUDE.md` from a static config file into a dynamic context assembly point.

## What Gets Stored in It

Common patterns from production usage:

**Project context**: Repository structure, key files, architecture decisions, dependencies the agent should know about.

**Behavioral rules**: Coding conventions, preferred patterns, things the agent should always or never do. ("Always use `sql` template for aggregations. Never modify schema files directly.")

**Memory imports** (via `@import`): Long-term memory summaries, active task state, knowledge bases.

**Skill references**: Pointers to skill files that define capabilities the agent can invoke. Compound Product stores PRD generation and task decomposition skills this way.

**Bootstrap instructions**: In the [goal-md pattern](../raw/deep/repos/jmilinovich-goal-md.md), `CLAUDE.md` tells the agent: "If someone asks you to write a GOAL.md, read the template, read 2-3 examples, scan the codebase, construct the fitness function, and start the loop." The file teaches agents to instantiate other patterns.

**Quality gates**: Commands the agent must run before committing. CI integration points. Test execution instructions.

## Relationship to Other Memory Files

`CLAUDE.md` sits at the top of a file-based memory hierarchy used by most Claude agent frameworks:

| File | Role |
|------|------|
| `CLAUDE.md` | Primary session config; auto-loaded |
| `AGENTS.md` | Long-term codebase knowledge; updated by agents as they work |
| `memory/ROOT.md` | Compressed topic index in hipocampus |
| `progress.txt` | Cross-iteration learnings in Compound Product |
| `SCRATCHPAD.md` | Active working state |

The compound-product system stores long-term codebase knowledge in `AGENTS.md` (updated per feature) and imports it through `CLAUDE.md`. The [hipocampus system](../projects/hipocampus.md) builds a five-level compaction tree (raw logs → daily → weekly → monthly → ROOT.md) and surfaces the compressed top via `@import` in `CLAUDE.md`. Both treat `CLAUDE.md` as the assembly point, not the storage layer.

## Platform Variants

Different agent platforms use the same concept under different filenames:

| Platform | Filename |
|----------|----------|
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursorrules` |
| OpenClaw | `SOUL.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Windsurf | `.windsurfrules` |

The semantics are identical: a markdown file loaded at session start that configures agent behavior. [Compound Product](../raw/deep/repos/snarktank-compound-product.md) explicitly notes this parallel -- its prompt template is nearly identical for both Amp and Claude Code, with `prompt.md` serving for Amp and `CLAUDE.md` serving for Claude Code.

## Strengths

**Zero infrastructure**: No server, no database, no API keys. A text file in a repository. Portable, auditable, version-controlled.

**Composable via imports**: The `@import` directive turns simple files into complex context assembly pipelines without code changes.

**Human-readable**: Both humans and agents can read, edit, and reason about the file. This matters for debugging -- when an agent behaves unexpectedly, you read the file.

**Works with version control**: `CLAUDE.md` committed to a repo means every contributor's agent sessions start with the same project context. Conventions are encoded once, not re-explained per developer.

**Gradual adoption**: Start with three lines of project context. Add behavioral rules as you identify gaps. Integrate memory imports when scale demands it. No migration required.

## Critical Limitations

**No conflict resolution**: When `CLAUDE.md` imports multiple files that contain contradictory instructions, the agent resolves conflicts using its own judgment. There is no declared precedence mechanism. A `CLAUDE.md` that imports a six-month-old `AGENTS.md` alongside a freshly updated `progress.txt` may produce inconsistent behavior without warning.

**Implicit infrastructure assumption**: The `@import` pattern assumes all referenced files exist at the paths specified. In fresh repository clones, CI environments, or after file renames, missing imports fail silently or cause cryptic errors. Systems built on `CLAUDE.md` + imports have hidden dependencies that aren't declared anywhere in the file itself.

**Token budget pressure**: Everything loaded via `CLAUDE.md` costs tokens on every API call. The [hipocampus deep analysis](../raw/deep/repos/kevin-hs-sohn-hipocampus.md) reports ROOT.md at ~3K tokens; with prompt caching this drops to ~300 effective tokens. Without caching, a heavily loaded `CLAUDE.md` imposes real per-call cost that compounds in long agentic runs.

## When Not to Use It

**Multi-tenant deployments**: `CLAUDE.md` operates at the project level. Serving many users with per-user customization requires a different layer -- either per-user memory files with programmatic assembly, or a harness-level injection mechanism. A single `CLAUDE.md` cannot express per-user variation.

**Secrets and credentials**: The file is typically version-controlled and human-readable. Storing API keys, tokens, or sensitive configuration here exposes them to anyone with repository access. Use environment variables or secret management for anything sensitive.

**Frequently-changing instructions**: If behavioral rules change multiple times per day, a file-based mechanism creates coordination overhead. Hot-path instruction updates work better through programmatic system prompt injection.

## Unresolved Questions

**Governance at scale**: In large engineering organizations, who owns `CLAUDE.md`? What process governs changes? A file that defines how agents behave across an entire codebase carries organizational weight, but there is no established governance model for it.

**Import depth limits**: The `@import` mechanism has no documented recursion depth limit. Systems that chain imports (A imports B imports C) may hit token limits or circular dependency issues. The boundary conditions are not documented.

**Conflict between project and user configuration**: Claude Code supports both project-level `CLAUDE.md` (in the repo) and user-level configuration. When they conflict, the resolution order is not clearly specified in public documentation.

**Cross-agent compatibility**: As the convention spreads to other agents (Cursor, Windsurf, OpenClaw), each platform parses the same files differently. A `CLAUDE.md` written for Claude Code may load correctly in Claude Code but fail silently in another agent that does not support `@import`. There is no compatibility declaration mechanism.

## Alternatives and When to Choose Each

**Environment variable system prompts**: Use when deploying agents programmatically via API and the operator controls the deployment environment. More reliable than file-based injection but requires code changes to update.

**MCP (Model Context Protocol) servers**: Use when context comes from dynamic sources (databases, APIs, live data). `CLAUDE.md` is static; MCP handles dynamic context.

**`AGENTS.md` / `SOUL.md`**: Use for long-term codebase knowledge that agents update autonomously as they work. `CLAUDE.md` is the session config; `AGENTS.md` is the knowledge base the agent builds. They complement rather than replace each other.

**Harness-level instructions**: Use when behavior rules should apply universally across all projects, not just one. Rules about safety, output format, or organizational policy belong in the harness, not per-project files.

## Related

- [Claude Code](../projects/claude-code.md)
- [Hipocampus](../projects/hipocampus.md) -- builds a full memory system on top of CLAUDE.md imports
- [Compound Product](../projects/compound-product.md) -- uses CLAUDE.md to load skills and task context for autonomous agents
- [Goal MD](../projects/goal-md.md) -- uses CLAUDE.md as bootstrap instructions for autonomous optimization
