---
entity_id: openclaw
type: project
bucket: agent-systems
abstract: >-
  OpenClaw is an open-source AI agent framework that serves as the host platform
  for a plugin ecosystem including context engines, memory layers, and skills —
  its key differentiator is the ContextEngine plugin API that lets third parties
  replace its built-in sliding-window compaction with custom memory
  architectures.
sources:
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/memodb-io-acontext.md
  - repos/memorilabs-memori.md
  - repos/martian-engineering-lossless-claw.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/alirezarezvani-claude-skills.md
  - repos/volcengine-openviking.md
  - repos/gustycube-membrane.md
  - repos/greyhaven-ai-autocontext.md
  - repos/thedotmack-claude-mem.md
  - repos/garrytan-gstack.md
  - repos/origintrail-dkg-v9.md
  - repos/infiniflow-ragflow.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/martian-engineering-lossless-claw.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/volcengine-openviking.md
related:
  - claude-code
  - rag
  - codex
  - openai
  - cursor
  - claude
  - opencode
  - anthropic
  - mcp
  - mem0
  - locomo
  - claude-md
  - sqlite
  - andrej-karpathy
  - episodic-memory
  - agent-skills
  - windsurf
  - bm25
  - knowledge-graph
  - progressive-disclosure
  - vector-database
  - self-improving-agent
  - gemini
  - catastrophic-forgetting
  - context-management
  - memorybank
  - antigravity
  - unknown-unknowns
last_compiled: '2026-04-07T11:35:11.419Z'
---
# OpenClaw

## What It Is

OpenClaw is an open-source agent framework that became prominent in 2026 as the runtime environment for a growing ecosystem of agent memory and context management plugins. It competes with [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), [OpenCode](../projects/opencode.md), and [Antigravity](../projects/antigravity.md) in the AI coding agent space.

Its architectural significance comes not from the base framework itself but from the **ContextEngine plugin system** introduced in v2026.3.7 (PR openclaw/openclaw#22201, authored by Josh Lehman). That PR created a formalized slot-based registry for replacing OpenClaw's built-in context handling, which spawned an entire ecosystem of third-party memory systems designed specifically as OpenClaw plugins: [lossless-claw](../raw/deep/repos/martian-engineering-lossless-claw.md), [OpenViking](../raw/deep/repos/volcengine-openviking.md), [Hipocampus](../raw/deep/repos/kevin-hs-sohn-hipocampus.md), and [Acontext](../raw/repos/memodb-io-acontext.md).

OpenClaw is also the platform that [Mem0](../projects/mem0.md) and [Memori](../raw/deep/repos/memorilabs-memori.md) target via their integration layers, and it implements [CLAUDE.md](../concepts/claude-md.md)-style project configuration, [Model Context Protocol](../concepts/mcp.md), and [Agent Skills](../concepts/agent-skills.md).

## Core Mechanism: The ContextEngine Plugin System

The ContextEngine interface provides seven lifecycle hooks that a plugin can implement:

1. **bootstrap** — Session initialization; load persisted state, establish connections
2. **ingest** — New message arrival; preprocess, classify, flag importance
3. **assemble** — Before prompt assembly; decide what enters the final prompt
4. **compact** — Token limit approaching; compress or summarize conversation
5. **afterTurn** — After each turn; post-processing, update statistics
6. **prepareSubagentSpawn** — Before subagent launch; prepare isolated context scope
7. **onSubagentEnded** — After subagent completes; merge output back

The `ownsCompaction` flag is the critical mechanism. When a plugin sets it to `true`, OpenClaw's built-in auto-compaction disables entirely, and the plugin takes full ownership. Without any plugin registered, the system falls back to `LegacyContextEngine`, preserving backward compatibility.

Plugins install via `openclaw plugins install <package>` and declare their slot type in an `openclaw.plugin.json` manifest. The configuration key `plugins.slots.contextEngine` points to the active plugin.

A `systemPromptAddition` field in assembly responses allows plugins to inject dynamic content into the system prompt per-turn without static configuration files — lossless-claw uses this to calibrate model confidence based on compression depth.

## Built-in Context Handling

Without a plugin, OpenClaw uses sliding-window compaction — it drops oldest messages when the context window fills. This is the standard approach across most agent frameworks, and it is the failure mode that motivated the plugin ecosystem. Lossless-claw's OOLONG benchmark (Volt vs. Claude Code at various context lengths) treats OpenClaw's default behavior as roughly equivalent to Claude Code's built-in approach, with both losing accuracy as conversation length grows.

## Key Numbers

- Minimum required version for ContextEngine plugins: **v2026.3.7**
- Plugin ecosystem includes at least four major context/memory plugins at time of writing
- Enterprise adoptions documented: Tencent (QClaw), ByteDance (ArkClaw), Alibaba (JVS Claw), Xiaomi (MiClaw)

No independent benchmark for the base OpenClaw framework exists in the source material. Performance figures in the ecosystem are plugin-specific and self-reported by plugin authors.

## What OpenClaw Is Genuinely Good At

**Plugin ecosystem hosting.** The ContextEngine API is well-designed — the `ownsCompaction` flag, `systemPromptAddition` injection, and subagent lifecycle hooks give plugins enough control to implement radically different memory architectures. lossless-claw's DAG summarization, OpenViking's filesystem-paradigm retrieval, and Hipocampus's compaction tree all work within this interface without modifying OpenClaw itself.

**Skills-based agent configuration.** OpenClaw uses `SKILL.md` files with YAML frontmatter to define reusable agent capabilities. Multiple plugins (OpenViking, Acontext, Hipocampus) ship their own SKILL.md files that teach the host agent about the plugin's capabilities. This creates a discoverable, human-readable capability registry.

**MCP integration.** OpenClaw implements [Model Context Protocol](../concepts/mcp.md), making it compatible with the growing MCP tool ecosystem. Memori's MCP endpoint at `api.memorilabs.ai/mcp/` targets OpenClaw directly.

**Framework for multi-agent patterns.** The `prepareSubagentSpawn` and `onSubagentEnded` hooks enable structured delegation with scope isolation. lossless-claw's expansion system uses these hooks to spawn temporary sub-agents with token-capped, time-limited grants for recovering detail from compressed summaries.

## Critical Limitations

**Configuration fragility.** Community experience consistently reports that OpenClaw's JSON configuration file modifies or corrupts itself on restart. This is not a minor inconvenience — it means production deployments need additional resilience around configuration management, and debugging sessions often start with configuration repair rather than the actual problem. One community post describes this as a known blocker for reliable deployment.

**Installation complexity.** Despite marketing positioning as accessible, getting OpenClaw with a full plugin stack running requires Go 1.22+, Rust (for some CLI components), C++ compiler, Node.js 22+, Python 3.10+, and correct PYTHONPATH configuration. Multiple community guides describe multi-hour setup processes with non-obvious failure modes.

## When NOT to Use OpenClaw

**When you need deployment stability today.** The configuration fragility issue is unresolved. If configuration corruption on restart is unacceptable for your deployment, OpenClaw is not ready. Use Claude Code or Cursor for production workloads until this is addressed.

**When your team lacks debugging tolerance.** Community feedback is consistent: OpenClaw rewards operators willing to continuously debug and optimize. If your team needs a "it just works" experience, the complexity of the plugin ecosystem, SKILL.md configuration, and provider compatibility will create ongoing friction.

**When you need cross-conversation retrieval.** OpenClaw's plugin system is session-scoped. No ContextEngine plugin in the ecosystem provides cross-session search or shared memory across conversations without additional infrastructure (like OpenViking running as a separate service).

**When token cost predictability matters.** Every plugin adds different overhead profiles. lossless-claw adds compaction LLM calls; OpenViking adds VLM summarization; Hipocampus adds compaction tree maintenance. The total cost of a single conversation turn is not predictable without profiling your specific plugin combination.

## Unresolved Questions

**Governance and maintenance.** Josh Lehman is both a core OpenClaw maintainer and the author of lossless-claw. This dual role creates an implicit conflict of interest — the plugin API may be shaped by lossless-claw's requirements rather than the general case. The documentation does not address this or describe how plugin API changes are proposed and approved.

**Plugin API stability.** The ContextEngine interface was introduced in v2026.3.7. There is no documentation on API versioning, deprecation policy, or backward compatibility guarantees. Plugin authors have no stated protection against breaking changes in future OpenClaw releases.

**Cost at scale.** No public data exists on OpenClaw's behavior with plugin stacks at production scale (thousands of concurrent sessions). The SQLite-backed plugins (lossless-claw, Hipocampus) have known write serialization constraints. OpenViking scales better with its PostgreSQL backend, but the base OpenClaw framework's own scalability characteristics are undocumented.

**Conflict resolution between plugins.** The slot system allows only one ContextEngine plugin at a time. There is no documented mechanism for composing multiple context engines or for a plugin to delegate to another plugin for specific operations.

## Ecosystem Map

| Plugin | Memory Approach | Infrastructure | Key Claim |
|--------|----------------|----------------|-----------|
| [lossless-claw](../raw/deep/repos/martian-engineering-lossless-claw.md) | DAG hierarchical summarization | SQLite | OOLONG benchmark +4.5 avg over Claude Code |
| [OpenViking](../raw/deep/repos/volcengine-openviking.md) | Filesystem-paradigm L0/L1/L2 tiering | Python+C++, optional PG | 83-91% token reduction on LoCoMo |
| [Hipocampus](../raw/deep/repos/kevin-hs-sohn-hipocampus.md) | Compaction tree + ROOT.md index | File-based, no DB | 21x better than no memory on MemAware |
| [Acontext](../raw/repos/memodb-io-acontext.md) | Skill files as memory | PostgreSQL+Redis+S3 | Human-readable, editable skill files |
| [Memori](../raw/deep/repos/memorilabs-memori.md) | MCP + SDK interception | Cloud or BYODB | 81.95% LoCoMo at 4.97% token footprint |

## Alternatives

**Use [Claude Code](../projects/claude-code.md)** when you need a stable, well-maintained coding agent without plugin configuration overhead. Claude Code's context management is less flexible but more reliable.

**Use [Cursor](../projects/cursor.md)** when your workflow centers on IDE-integrated development rather than terminal-based agentic sessions.

**Use [LangGraph](../projects/langgraph.md)** when you need programmatic control over agent graph structure rather than a conversation-based agent with plugin memory.

**Use [CrewAI](../projects/crewai.md)** when multi-agent coordination is the primary requirement rather than per-agent memory depth.

**Use OpenClaw** when you need a customizable context management architecture and are willing to invest in configuration and debugging. The ContextEngine plugin system has no equivalent in other frameworks — if your use case requires DAG summarization, filesystem-paradigm retrieval, or skill-based memory evolution, OpenClaw is currently the only framework that hosts these systems.

## Related Concepts

- [Context Management](../concepts/context-management.md) — The core problem OpenClaw's plugin system addresses
- [Agent Skills](../concepts/agent-skills.md) — OpenClaw's SKILL.md-based capability system
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — The retrieval pattern used by Hipocampus and Acontext within OpenClaw
- [Episodic Memory](../concepts/episodic-memory.md) — What lossless-claw's immutable store implements
- [Model Context Protocol](../concepts/mcp.md) — OpenClaw's tool integration standard
- [Self-Improving Agent](../concepts/self-improving-agent.md) — OpenViking and Acontext's session-based learning within OpenClaw
- [BM25](../concepts/bm25.md) — Used by Hipocampus's `lcm_grep` and `qmd` search within the platform
- [Knowledge Graph](../concepts/knowledge-graph.md) — The retrieval model OpenViking replaces with its filesystem paradigm
- [Vector Database](../concepts/vector-database.md) — The storage backend most OpenClaw memory plugins support optionally
- [SQLite](../projects/sqlite.md) — The default storage backend for lossless-claw and Hipocampus plugins
