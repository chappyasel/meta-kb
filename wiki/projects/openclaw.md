---
entity_id: openclaw
type: project
bucket: context-engineering
abstract: >-
  OpenClaw is an open-source terminal AI coding agent (Claude Code alternative)
  with a plugin-based ContextEngine system enabling swappable context management
  strategies, distinguishing itself through an extensible architecture that
  third-party memory systems like lossless-claw and Hipocampus target as a
  primary integration platform.
sources:
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/memodb-io-acontext.md
  - repos/supermemoryai-supermemory.md
  - repos/memorilabs-memori.md
  - repos/martian-engineering-lossless-claw.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/alirezarezvani-claude-skills.md
  - repos/gustycube-membrane.md
  - repos/topoteretes-cognee.md
  - repos/greyhaven-ai-autocontext.md
  - repos/garrytan-gstack.md
  - repos/volcengine-openviking.md
  - repos/origintrail-dkg-v9.md
  - repos/matrixorigin-memoria.md
  - repos/infiniflow-ragflow.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/martian-engineering-lossless-claw.md
  - deep/repos/origintrail-dkg-v9.md
related:
  - claude-code
  - cursor
  - retrieval-augmented-generation
  - openai
  - model-context-protocol
  - codex
  - opencode
  - claude
  - knowledge-graph
  - windsurf
  - gemini-cli
  - semantic-search
  - context-management
  - abductive-context
  - andrej-karpathy
  - episodic-memory
  - anthropic
  - context-engineering
  - agent-memory
  - agent-skills
  - locomo
  - ollama
  - claude-md
  - continual-learning
  - self-improving-agents
  - context-graphs
  - reinforcement-learning
  - elizaos
  - observability
  - markdown-wiki
last_compiled: '2026-04-08T02:37:00.480Z'
---
# OpenClaw

## What It Is

OpenClaw is an open-source terminal-based AI coding agent, positioned as an alternative to Claude Code, Cursor, Windsurf, and OpenAI Codex. Its defining architectural feature is a slot-based plugin system — introduced in v2026.3.7 — that allows context management strategies to be swapped out entirely. Multiple independent memory and context management projects (lossless-claw, Hipocampus, DKG v9, Memori) treat OpenClaw as a primary integration target, which suggests it occupies a real position in the agentic tooling ecosystem.

The project is closely associated with Josh Lehman (former Executive Director of Urbit Foundation, CTO/cofounder of Starcity YC S16), who authored both the ContextEngine plugin system (openclaw/openclaw#22201) and the lossless-claw plugin that first used it. This dual authorship — plugin system architect and first plugin developer — explains the tight integration between OpenClaw's extensibility layer and the ecosystem around it.

OpenClaw supports [Ollama](../projects/ollama.md) for local model inference and integrates with the [Model Context Protocol](../concepts/model-context-protocol.md) for tool exposure.

## Core Architecture

### ContextEngine Plugin System

The central mechanism is a slot-based registry with config-driven resolution. The `ContextEngine` interface defines seven lifecycle hooks:

1. **bootstrap** — Engine initialization, database connections, persisted state loading
2. **ingest** — New message arrival, preprocessing, importance flagging
3. **assemble** — Pre-prompt assembly, deciding what enters the final prompt
4. **compact** — Token limit handling, compression or summarization
5. **afterTurn** — Post-turn processing, statistics updates
6. **prepareSubagentSpawn** — Before subagent launch, context scope isolation
7. **onSubagentEnded** — After subagent completion, output collection and merge

The `ownsCompaction` flag is the critical control: when set to `true`, the plugin takes full ownership of context management and OpenClaw's built-in auto-compaction disables. Without a plugin, the system falls back to `LegacyContextEngine`, preserving backward compatibility.

Plugins are installed via `openclaw plugins install <package>` and activated through `plugins.slots.contextEngine` config. The `systemPromptAddition` field in assembly responses allows dynamic prompt injection without static configuration files.

### Built-in Context Management

Without a plugin, OpenClaw uses sliding-window compaction — the conventional approach of dropping older messages when the context window fills. This is what the ContextEngine system exists to replace.

### Subagent Architecture

OpenClaw supports spawning subagents with scoped context. Memory systems like lossless-claw use this for delegation: expensive operations (expansion queries, memory writes) get dispatched to subagents with TTL-bounded token budgets, protecting the main session's context window. The `statelessSessionPatterns` configuration lets temporary sub-agent sessions read from existing memory context without mutating it.

### CLAUDE.md Integration

OpenClaw uses [CLAUDE.md](../concepts/claude-md.md) for project-level configuration, with `@import` directives for auto-loading memory files. This is how Hipocampus loads its ROOT.md topic index into every session: files listed in CLAUDE.md get included in system context automatically.

## What Runs on OpenClaw

The clearest signal of OpenClaw's position in the ecosystem is the list of projects that have built dedicated integrations:

**[Lossless-claw](../projects/openclaw.md)** (by the same authors): A ContextEngine plugin implementing DAG-based hierarchical summarization. Replaces sliding-window compaction with a SQLite-backed message store and multi-level summary tree. On the OOLONG benchmark (`trec_coarse`), the standalone Volt agent using the same LCM architecture scores 74.8 vs Claude Code's 70.3, with the gap widening at longer context lengths (+10.0 at 256K, +12.6 at 512K). These numbers are self-reported in the Martian Engineering documentation.

**[Hipocampus](../projects/openclaw.md)**: A file-based proactive memory harness that lists OpenClaw as a supported platform alongside Claude Code and OpenCode. On OpenClaw, it creates MEMORY.md and USER.md at project root, embedding ROOT.md content as a "Compaction Root" section (because OpenClaw cannot auto-load separate files the way CLAUDE.md does for Claude Code).

**DKG v9** (`packages/adapter-openclaw`): The deepest third-party integration. Includes `DkgNodePlugin` (daemon lifecycle), `DkgMemoryPlugin` (knowledge graph search and import tools), `DkgChannelPlugin` (decentralized messaging), and a `write-capture.ts` module that watches for file writes and auto-imports them into a shared knowledge graph with LLM entity extraction.

**[Memori](../projects/openclaw.md)**: An OpenClaw plugin via the `@memorilabs/openclaw-memori` npm package, providing transparent LLM call interception and fact-based memory injection.

**[ElizaOS](../projects/openclaw.md)**: Listed as an alternative, implying some overlap in target use cases.

## Key Numbers

OpenClaw's own repository metrics are not reported in the available sources. The project is referenced across multiple independent codebases, which suggests genuine adoption rather than purely synthetic interest, but the scale is unclear.

The benchmark numbers associated with OpenClaw integrations:
- Lossless-claw/Volt OOLONG benchmark: self-reported by Martian Engineering
- DKG v9 collaboration benchmark: 47% wall time reduction and 27% cost reduction for multi-agent DKG collaboration vs. no-collaboration baseline; N=1-2 per arm, 8-task suite on testnet with beta software — directionally interesting but not statistically robust
- Hipocampus MemAware benchmark: 21.6x better than no memory, 5.1x better than search alone; methodology described as 900 questions across 3 months of history

None of these benchmarks are independently validated.

## Strengths

**Extensible context management**: The ContextEngine slot system is the feature that makes OpenClaw worth using over alternatives. If you want to run a custom memory strategy — DAG summarization, knowledge graph integration, file-based compaction trees — this is the only open-source terminal agent with a documented plugin interface for it.

**Multi-platform memory compatibility**: Tools built for OpenClaw (Hipocampus, lossless-claw) also target Claude Code and OpenCode, so investment in OpenClaw-compatible memory infrastructure isn't locked in.

**Local model support**: Ollama integration means OpenClaw runs without external API dependencies, which matters for privacy-sensitive or air-gapped deployments.

**Subagent delegation**: The `prepareSubagentSpawn`/`onSubagentEnded` lifecycle hooks enable memory architectures that delegate expensive operations to isolated subagents — a pattern that prevents context pollution during memory maintenance.

## Critical Limitations

**Unproven at scale**: The benchmark evidence for OpenClaw integrations comes from small-N experiments on test suites, beta software, and testnet deployments. The core platform itself has no published performance benchmarks.

**Plugin system maturity**: The ContextEngine system was introduced in v2026.3.7 and lossless-claw was the first plugin. The interface is young, and the lifecycle hooks may not cover all the cases that more complex memory architectures require. Breaking changes to the plugin API would cascade to all dependent integrations.

**CLAUDE.md loading constraint**: OpenClaw cannot auto-load arbitrary separate files the way Claude Code does via CLAUDE.md `@import` directives. Hipocampus works around this by embedding ROOT.md content directly into MEMORY.md. This workaround adds a maintenance step and means OpenClaw's memory loading is slightly less clean than Claude Code's.

**No cross-session memory built-in**: Without a ContextEngine plugin, OpenClaw has no persistence between sessions. All memory requires a plugin.

## When NOT to Use OpenClaw

If your workflow requires Claude Code's specific tooling, extensions, or Anthropic's hosted features, OpenClaw is not a drop-in replacement — it runs independently and differences in tool behavior will surface.

If you need a production-grade, battle-tested coding agent with vendor support and a known reliability track record, OpenClaw's open-source, community-maintained status means you own the operational burden. The DKG v9 adapter explicitly warns users to avoid production deployments of beta integrations.

If your team lacks the technical depth to configure and maintain ContextEngine plugins, the default sliding-window compaction provides no meaningful advantage over established alternatives like Claude Code.

## Unresolved Questions

**Governance and maintenance**: The connection between OpenClaw and Josh Lehman's consulting work at Martian Engineering raises questions about long-term maintenance. If the primary maintainer's commercial interests shift, the project's trajectory may shift with them.

**ContextEngine API stability**: There is no documented versioning policy for the plugin API. As the interface matures, breaking changes could require coordinated updates across the plugin ecosystem.

**Performance at scale**: No published data on how OpenClaw handles long-running sessions, large codebases, or concurrent subagent workloads without a ContextEngine plugin.

**Token economics without plugins**: The base sliding-window behavior presumably has the same token cost structure as other terminal agents, but no published comparison exists.

**Community size**: Stars and fork counts for OpenClaw itself are not reported in available sources, making it hard to assess adoption relative to alternatives.

## Alternatives

| Tool | When to prefer it |
|---|---|
| [Claude Code](../projects/claude-code.md) | Production use, Anthropic ecosystem, mature tooling, CLAUDE.md auto-import works more cleanly |
| [Cursor](../projects/cursor.md) | IDE-integrated workflow, GUI preferred over terminal |
| [Windsurf](../projects/windsurf.md) | IDE integration with different model support |
| [OpenAI Codex](../projects/codex.md) | OpenAI ecosystem, GPT-4 class models |
| [OpenCode](../projects/opencode.md) | Similar terminal agent positioning; Hipocampus supports both |
| [Gemini CLI](../projects/gemini-cli.md) | Google ecosystem, Gemini model access |

Use OpenClaw when: you need a customizable [context management](../concepts/context-management.md) strategy, want to integrate specialized memory systems (knowledge graphs, compaction trees, episodic memory), and have the technical depth to maintain plugin configuration. The ContextEngine plugin system is its primary differentiator — if you don't need it, the alternatives are more mature.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — The discipline OpenClaw's plugin system directly serves
- [Context Management](../concepts/context-management.md) — The problem the ContextEngine interface addresses
- [Agent Memory](../concepts/agent-memory.md) — What third-party plugins add to OpenClaw
- [CLAUDE.md](../concepts/claude-md.md) — Configuration mechanism OpenClaw uses
- [Episodic Memory](../concepts/episodic-memory.md) — Memory type Hipocampus implements on top of OpenClaw
- [Context Graphs](../concepts/context-graphs.md) — DKG v9's contribution to the OpenClaw ecosystem
- [Markdown Wiki](../concepts/markdown-wiki.md) — Hipocampus's file-based storage approach
- [Observability](../concepts/observability.md) — Relevant for monitoring subagent delegation patterns
- [Self-Improving Agents](../concepts/self-improving-agents.md) — The longer-term direction suggested by plugin-based extensibility
