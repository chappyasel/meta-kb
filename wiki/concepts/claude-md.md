---
entity_id: claude-md
type: concept
bucket: context-engineering
abstract: >-
  CLAUDE.md is a markdown file convention for injecting persistent instructions,
  project context, and skill specifications into AI agent context windows
  automatically, enabling stateful agent configuration without runtime
  retrieval.
sources:
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/anthropics-skills.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/snarktank-compound-product.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/jmilinovich-goal-md.md
  - repos/kevin-hs-sohn-hipocampus.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
related:
  - claude-code
  - cursor
  - agent-skills
  - skill-book
  - retrieval-augmented-generation
  - anthropic
  - autoresearch
  - context-management
  - openclaw
  - andrej-karpathy
last_compiled: '2026-04-08T23:03:19.863Z'
---
# CLAUDE.md

## What It Is

CLAUDE.md is a markdown file convention for persistent agent configuration. Drop a `CLAUDE.md` file in a project directory and [Claude Code](../projects/claude-code.md) (and compatible tools like [Cursor](../projects/cursor.md)) automatically load it into the agent's context window at session start. No retrieval query, no embedding lookup, no explicit invocation. The file is always there.

The name is Claude Code-specific but the pattern is general. The same convention appears as `AGENTS.md` in autonomous agent frameworks, `MEMORY.md` in [OpenClaw](../projects/openclaw.md), `SKILL.md` in [Agent Skills](../concepts/agent-skills.md) marketplaces, `WORKING.md` in memory systems like Hipocampus, and effectively any named markdown file that a tool auto-loads. What unifies them is the mechanism: filesystem-resident text injected verbatim into the context window.

[Andrej Karpathy](../concepts/andrej-karpathy.md) identified this class of technique as "context engineering" in 2025 -- the craft of populating the context window with the right information rather than relying on model weights or runtime retrieval. CLAUDE.md files are a primary instrument of context engineering for coding agents.

## Why It Exists

LLMs have no memory between sessions. Every conversation starts blank. Agents working on a real codebase need to know the stack, the conventions, the gotchas, the team preferences -- information that would otherwise have to be re-specified every session or left implicit. CLAUDE.md solves this by externalizing that knowledge to the filesystem, where it persists across sessions and gets loaded automatically.

The alternative approaches each have costs:
- Prompting each session by hand is tedious and inconsistent
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) requires embedding infrastructure, introduces retrieval failures, and adds latency
- Model fine-tuning is expensive and slow to update
- System prompt configuration requires platform access and doesn't travel with the repo

CLAUDE.md requires none of that. It's a text file. Anyone with filesystem access can read or edit it. It commits to version control alongside the code it documents. It works offline.

## How It Works

### The Basic Mechanism

When Claude Code (or a compatible tool) starts a session, it scans a set of locations for CLAUDE.md files and loads their contents into the system prompt or conversation context. The exact injection point varies by tool, but the effect is the same: the model reads the file before seeing the user's first message.

Locations scanned by Claude Code, in priority order:
- `~/.claude/CLAUDE.md` (user-global configuration)
- `CLAUDE.md` at the project root
- `CLAUDE.md` in subdirectories (loaded when working in those directories)

This hierarchy enables layering: global preferences (coding style, preferred libraries) live in the user-level file, project-specific context lives in the project root, component-specific instructions live in subdirectories. A session working in `src/auth/` might load all three.

### What Goes Inside

CLAUDE.md files typically contain some combination of:

**Project context**: Tech stack, architecture overview, key directories, build commands, test commands. Anything an engineer joining the project would need to orient.

**Behavioral instructions**: "Always write TypeScript. Never use `any`. Prefer functional components. Run `npm test` before marking a task complete."

**Skill specifications**: Procedural knowledge for specific tasks. The [Agent Skills](../concepts/agent-skills.md) spec formalizes this with YAML frontmatter (`name`, `description`) and a three-tier progressive disclosure architecture, but informal skill docs work too.

**Memory and state**: Some systems use CLAUDE.md-adjacent files as working memory. Hipocampus's `ROOT.md` is a compressed topic index. [Compound Product](../projects/autoresearch.md)'s `AGENTS.md` accumulates institutional codebase knowledge. gstack's `WORKING.md` tracks in-progress tasks.

**Security and access boundaries**: What the agent is and is not allowed to do. What commands require confirmation. [Tobi Lütke](../concepts/tobi-lutke.md) published Shopify's internal CLAUDE.md, which includes explicit sections on scope boundaries.

### The Agent Skills Extension

The [Agent Skills](../concepts/agent-skills.md) spec from Anthropic extends CLAUDE.md into a formal plugin architecture. A skill is a directory containing a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: claude-api
description: Use when writing code that imports anthropic, @anthropic-ai/sdk, or claude_agent_sdk
---
```

This triggers a three-tier loading pattern:
1. **Metadata** (~100 tokens, always in context): Just `name` and `description`, used for routing
2. **SKILL.md body** (loaded when triggered, ideally under 500 lines): Full procedural instructions
3. **Bundled resources** (loaded on demand): Scripts, reference docs, assets

The routing is purely semantic -- the agent reads descriptions and decides whether a skill applies. The efficiency gain: an agent can "know about" hundreds of skills at trivial token cost (~dozen tokens per skill in tier 1) while only paying the full context cost for the 1-2 skills active in a given task.

The [SkillBook](../concepts/skill-book.md) concept generalizes this further -- a curated library of reusable skill specifications analogous to a package registry.

### File-Based Memory Systems

Several systems use CLAUDE.md-convention files as structured memory stores:

**Hipocampus** maintains a 5-level compaction hierarchy (raw logs → daily → weekly → monthly → ROOT.md) with ROOT.md always loaded at ~3K tokens. The `ROOT.md` format uses a typed topic index: `- topic-keyword [type, Nd]: sub-keywords -> knowledge/file.md`. On MemAware benchmarks, this approach achieved 17.3× improvement over no memory and 5.1× over vector search alone on implicit recall tasks. The hard tier (cross-domain, zero keyword overlap) showed 8.0% vs 0.7% for vector search -- evidence that always-loaded structured indexes solve a class of problems that retrieval structurally cannot.

**gstack** uses `AGENTS.md` for cross-session codebase knowledge accumulation and `progress.txt` for per-iteration learnings. The file format includes explicit "Codebase Patterns" sections designed for agent consumption. The system's "compounding" property derives from these files: each session enriches them, making future sessions more effective.

**Compound Product** generates `AGENTS.md` automatically through the autonomous improvement loop. After implementing each task, the agent updates `AGENTS.md` with discovered patterns, gotchas, and API conventions. This creates institutional memory that persists beyond any single run.

## Key Design Properties

### Locality

CLAUDE.md files live with the project they describe. A repo checked out on a new machine brings its CLAUDE.md. A developer joining the team gets the same agent configuration as everyone else. No separate knowledge base to provision, no embeddings to regenerate.

### Inspectability

Every instruction the agent receives from CLAUDE.md is visible to any human who can open the file. No black-box retrieval, no hidden system prompts. This is meaningful for debugging agent behavior and for auditing what context influences decisions.

### Composability

The directory hierarchy and `@import` syntax (Claude Code) allow CLAUDE.md content to compose. Global user preferences layer with project context, which layers with component-specific instructions. Agent Skills extends this to plugin-style composition across an entire skill library.

### [Progressive Disclosure](../concepts/progressive-disclosure.md)

The Agent Skills three-tier pattern is the formal expression of a principle that informal CLAUDE.md use embodies informally: load less, load it conditionally. Always-loaded metadata for routing, full content only when relevant. This keeps per-task token consumption manageable as the number of available skills grows.

## Strengths

**Zero infrastructure**: A text file. Requires nothing beyond a filesystem and a tool that reads it.

**Version controlled**: CLAUDE.md commits alongside the code it documents. Change history is automatic. Diffs are human-readable.

**Immediate reflection**: Edit the file, next session picks up the change. No retraining, no re-embedding, no cache invalidation.

**Portable across tools**: The same file works (with minor adaptation) in Claude Code, Cursor, Windsurf, OpenClaw, and compatible tools. gstack explicitly maintains host-specific generation from shared SKILL.md.tmpl templates.

**Supports diverse content**: Procedural instructions, factual context, memory state, skill definitions, access policies -- all plain text, all readable by humans and agents alike.

## Limitations

### Fixed Token Cost

Everything in a CLAUDE.md file occupies context on every request where it's loaded. A 2,000-token CLAUDE.md costs 2,000 tokens regardless of whether the session needs 10% of its content. This is acceptable for small files and manageable with prompt caching (Claude's API caches stable prompt prefixes, reducing effective cost by up to 90% on repeated sessions). For large knowledge bases, [RAG](../concepts/retrieval-augmented-generation.md) or the Agent Skills tiered loading approach become necessary.

### [Lost in the Middle](../concepts/lost-in-the-middle.md)

Research consistently shows LLMs perform better on content at the beginning and end of their context window than on content in the middle. A long CLAUDE.md file may have sections that are theoretically present but practically ignored. Critical instructions belong at the top.

### No Dynamic Updating

CLAUDE.md is read at session start. The agent cannot update it mid-session and have those updates affect the current session's context. Memory systems that want to persist new learnings (like Hipocampus and gstack) work around this by writing to separate files and loading them next session, or by dispatching writes to subagents.

### Maintenance Drift

Documentation drifts from implementation. A CLAUDE.md describing a stack that has changed becomes actively harmful -- the agent follows wrong instructions confidently. gstack addresses this with a SKILL.md.tmpl template system that generates SKILL.md from source code metadata, with CI validating freshness. Most teams use CLAUDE.md without this infrastructure.

### No Schema Validation

Plain markdown with optional YAML frontmatter. No type checking, no schema enforcement, no validation that instructions are well-formed. The Agent Skills spec provides a validation CLI (`skills-ref validate`), but informal CLAUDE.md files have no equivalent. Errors are invisible until they cause agent misbehavior.

### Security Risks in Shared Ecosystems

Research analyzing 42,447 community-contributed skills found 26.1% contain vulnerabilities, with 13.3% enabling data exfiltration and 11.8% enabling privilege escalation. Skills with executable scripts are 2.12× more vulnerable than instruction-only skills. Any ecosystem where CLAUDE.md-convention files are shared (marketplaces, third-party plugins) requires security review of file contents before loading.

## Concrete Failure Mode

A team maintains a CLAUDE.md specifying database migration conventions from when they used raw SQL. They migrate to an ORM. The CLAUDE.md is not updated. The agent generates raw SQL migrations for the next six months because CLAUDE.md says to. The error is silent -- no crash, no warning, just wrong conventions confidently followed. The file's authority is its failure mode: agents treat CLAUDE.md as authoritative, so stale content produces confidently wrong behavior.

## Unspoken Infrastructure Assumption

CLAUDE.md assumes a single-user, single-machine workflow. When multiple developers work on the same project with the same CLAUDE.md, the file describes a shared context -- but each developer's agent runs independently with no coordination. Conflicting changes to CLAUDE.md produce merge conflicts like any other file, but the semantic conflicts (two agents operating from inconsistent instructions after a bad merge) have no detection mechanism. Multi-agent systems that coordinate across machines need a shared memory layer beyond what CLAUDE.md provides.

## When NOT to Use It

**When the knowledge base is large and sparse**: If a project has 50,000 words of documentation but any single task needs only 500 words, loading all 50,000 words via CLAUDE.md wastes context and degrades performance. Use RAG or Agent Skills tiered loading.

**When instructions change frequently within sessions**: CLAUDE.md loads once at session start. Tasks requiring dynamic context that evolves based on intermediate results need a different mechanism -- in-context tool calls, scratchpad files, or explicit subagent handoffs.

**When cross-agent coordination is required**: CLAUDE.md gives one agent consistent context. It doesn't coordinate multiple agents. Multi-agent systems need shared state stores, message passing, or orchestration layers beyond what filesystem files provide.

**When untrusted content may influence the file**: Any workflow where external sources (user input, fetched content, third-party skills) can modify what gets loaded into CLAUDE.md is a prompt injection surface. The file's authority makes it a high-value target.

## Unresolved Questions

**Conflict resolution in team environments**: When two developers modify CLAUDE.md simultaneously and merge, git handles the text conflict but nothing handles the semantic conflict between the resulting instructions. No tooling exists for CLAUDE.md semantic diff or validation.

**Cost at scale for Agent Skills ecosystems**: The Agent Skills vulnerability survey analyzed 42,447 skills. If organizations build private skill libraries of comparable scale, the token cost of tier-1 metadata for hundreds of skills accumulates. The spec recommends hierarchical routing but leaves the architecture to implementers.

**Standardization across tools**: Claude Code, Cursor, Windsurf, and OpenClaw each implement variants of the CLAUDE.md convention with different loading rules, different `@import` syntax support, and different skill formats. No cross-tool standard exists. gstack's host-specific config files are a workaround, not a solution.

**Governance for shared skill ecosystems**: The Agent Skills marketplace at agentskills.io provides a distribution mechanism but no formal governance structure. Who decides what a skill can do, what tools it can pre-approve via `allowed-tools`, and what constitutes a safe skill? The four-tier trust model proposed in academic work is undeployed in production ecosystems.

## Relationship to Adjacent Concepts

CLAUDE.md sits at the intersection of several [Context Management](../concepts/context-management.md) patterns:

- **vs [RAG](../concepts/retrieval-augmented-generation.md)**: RAG retrieves relevant chunks on demand; CLAUDE.md loads everything upfront. RAG scales to larger knowledge bases; CLAUDE.md is simpler and more reliable for small, always-relevant context.

- **vs [Procedural Memory](../concepts/procedural-memory.md)**: Procedural memory in cognitive architectures stores how-to knowledge. CLAUDE.md is a filesystem implementation of procedural memory -- instructions for how to do things, persisted outside the model.

- **vs [Core Memory](../concepts/core-memory.md)**: [MemGPT](../projects/memgpt.md)'s core memory is an always-loaded context block the model can read and write. CLAUDE.md is the same idea without the programmatic read/write API -- humans edit it, agents read it.

- **vs [Agent Skills](../concepts/agent-skills.md)**: Agent Skills is a formalization of CLAUDE.md for procedural knowledge, adding YAML frontmatter, tiered loading, and marketplace distribution.

- **vs [Organizational Memory](../concepts/organizational-memory.md)**: CLAUDE.md externalizes institutional knowledge to a file. Organizational memory systems persist that knowledge in databases, knowledge graphs, or vector stores. The tradeoff is query flexibility vs. zero-infrastructure simplicity.

## Alternatives and Selection Guidance

**Use CLAUDE.md when**: Context is small (under ~2K tokens), always relevant, human-maintained, and changes infrequently. Project conventions, stack documentation, behavioral instructions.

**Use [Agent Skills](../concepts/agent-skills.md) / SKILL.md when**: You have deep procedural knowledge for specific domains (API usage, document formats, specialized workflows) that only applies to a subset of tasks. The three-tier loading keeps costs manageable.

**Use [RAG](../concepts/retrieval-augmented-generation.md) when**: Knowledge base exceeds what fits in context, relevance varies significantly by task, or content changes frequently enough that static files can't keep up.

**Use [Mem0](../projects/mem0.md) / [Zep](../projects/zep.md) / [Letta](../projects/letta.md) when**: You need programmatic memory management, semantic search over past interactions, or automatic memory extraction. These are databases, not files.

**Use [GraphRAG](../projects/graphrag.md) / [Graphiti](../projects/graphiti.md) when**: Knowledge has relational structure that benefits from graph traversal. CLAUDE.md is flat text.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.8)
- [Cursor](../projects/cursor.md) — implements (0.6)
- [Agent Skills](../concepts/agent-skills.md) — implements (0.7)
- [SkillBook](../concepts/skill-book.md) — implements (0.7)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — alternative_to (0.4)
- [Anthropic](../projects/anthropic.md) — created_by (0.8)
- [AutoResearch](../projects/autoresearch.md) — implements (0.5)
- [Context Management](../concepts/context-management.md) — implements (0.8)
- [OpenClaw](../projects/openclaw.md) — implements (0.5)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.3)
