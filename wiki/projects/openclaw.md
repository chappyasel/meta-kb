---
entity_id: openclaw
type: project
bucket: context-engineering
abstract: >-
  OpenClaw is an open-source terminal AI coding agent framework competing with
  Claude Code and Cursor, distinguished by its ContextEngine plugin system that
  enables third-party context management strategies including DAG-based
  summarization and proactive memory.
sources:
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/martian-engineering-lossless-claw.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/origintrail-dkg-v9.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/greyhaven-ai-autocontext.md
  - repos/gustycube-membrane.md
  - repos/infiniflow-ragflow.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/martian-engineering-lossless-claw.md
  - repos/matrixorigin-memoria.md
  - repos/memodb-io-acontext.md
  - repos/memorilabs-memori.md
  - repos/origintrail-dkg-v9.md
  - repos/supermemoryai-supermemory.md
  - repos/topoteretes-cognee.md
  - repos/volcengine-openviking.md
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
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
  - hipporag
  - reinforcement-learning
  - elizaos
  - observability
  - markdown-wiki
  - lossless-context-management
  - hipocampus
  - memori
last_compiled: '2026-04-08T22:53:51.202Z'
---
# OpenClaw

## What It Does

OpenClaw is an open-source terminal-based AI coding agent framework. It provides a CLI for running LLM-powered coding sessions with file editing, shell execution, and tool use. Its primary architectural differentiator is the ContextEngine plugin system, introduced in v2026.3.7 via PR #22201, which allows third-party developers to replace OpenClaw's built-in sliding-window context compaction with custom context management strategies.

The project sits in the same category as [Claude Code](../projects/claude-code.md), [OpenCode](../projects/opencode.md), [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), [Gemini CLI](../projects/gemini-cli.md), and [OpenAI Codex](../projects/codex.md). Its open-source nature and extensible plugin architecture distinguish it from the closed alternatives.

## Architectural Uniqueness: The ContextEngine Plugin System

Most coding agent frameworks treat context management as internal plumbing. OpenClaw exposes it as a first-class extension point.

The ContextEngine interface defines seven lifecycle hooks that plugins can implement:

- **bootstrap** — Session initialization, DB setup, state reconciliation after crashes
- **ingest** — New message arrival, preprocessing and classification
- **assemble** — Pre-prompt construction, decides what enters the final message array
- **compact** — Token budget pressure response
- **afterTurn** — Post-model-response processing
- **prepareSubagentSpawn** — Context scoping before subagent launch
- **onSubagentEnded** — Output collection and merge after subagent completes

The `ownsCompaction` flag on the engine declaration is key: when set to `true`, the plugin fully owns compaction and OpenClaw disables its default sliding-window auto-compaction. Plugins can also return `systemPromptAddition` from the assemble hook, enabling dynamic system prompt injection based on context state.

Without a plugin enabled, OpenClaw loads `LegacyContextEngine`, preserving backward compatibility.

This system made OpenClaw the host framework for lossless-claw, a DAG-based hierarchical summarization plugin. Josh Lehman, who authored the ContextEngine PR and maintains OpenClaw itself, co-founded Martian Engineering and built lossless-claw on top of the system he designed. That dual authorship explains the tight integration.

## Ecosystem: Plugins That Run on OpenClaw

Three external memory and context projects treat OpenClaw as their primary integration target, which gives a clearer picture of what the framework enables:

**Hipocampus** ([Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md)) uses OpenClaw's `MEMORY.md` and `USER.md` integration. It embeds its ROOT.md content (a ~3K token topic index covering all past conversation history) into OpenClaw's MEMORY.md, since OpenClaw cannot auto-load separate files the way Claude Code does via `@import`. Session lifecycle follows an explicit Task Start/End protocol.

**Lossless-claw** ([Source](../raw/deep/repos/martian-engineering-lossless-claw.md)) is the reference ContextEngine plugin. It replaces sliding-window compaction with a DAG of SQLite-persisted messages organized into leaf summaries (depth 0, compressing raw messages) and condensed summaries (depth 1+, compressing summaries). Three expansion tools (`lcm_grep`, `lcm_describe`, `lcm_expand_query`) let agents drill back to original detail. Published benchmarks on OOLONG (`trec_coarse`) show Volt, Martian Engineering's standalone agent using the same LCM architecture, scoring 74.8 vs Claude Code's 70.3, with the gap widening at longer context lengths (+10.0 at 256K tokens, +12.6 at 512K). These are self-reported by Martian Engineering; independent replication has not been published.

**Memori** ([Source](../raw/deep/repos/memorilabs-memori.md)) provides an `@memorilabs/openclaw-memori` plugin that hooks into OpenClaw's lifecycle for persistent cross-session memory, extracting semantic triples and facts from conversations.

**OriginTrail DKG v9** ([Source](../raw/deep/repos/origintrail-dkg-v9.md)) includes a dedicated `@origintrail-official/dkg-adapter-openclaw` adapter package with three plugins: `DkgNodePlugin` (daemon lifecycle), `DkgMemoryPlugin` (knowledge graph search and import tools), and `DkgChannelPlugin` (DKG messaging as a communication channel).

## Core Mechanism: How Context Management Works

OpenClaw's default behavior is sliding-window compaction: when the context approaches the token limit, older messages drop off. The ContextEngine system replaces this.

A plugin registers by declaring `contextEngine` in its plugin manifest and setting the slot in config:

```
plugins.slots.contextEngine: "lossless-claw"
```

On each turn, OpenClaw calls the plugin's lifecycle hooks in sequence. The assemble hook returns a message array plus optional system prompt additions. The plugin controls exactly what the model sees.

For lossless-claw specifically: every message persists to SQLite via ingest. After each turn, afterTurn evaluates whether the fresh tail (last 64 raw messages by default) plus summary DAG fits within the token budget. If not, compaction runs: leaf summaries (summarizing raw messages) followed by potential condensation (summarizing summaries). A three-level escalation guarantees progress: normal LLM summarization → aggressive prompt → deterministic 512-token truncation. The fallback is lossy but bounded, preventing infinite stalls.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| Hipocampus stars | 145 | GitHub, self-reported |
| Hipocampus MemAware benchmark (vs. no memory) | 21.6x improvement | Self-reported by author |
| Lossless-claw / Volt vs Claude Code on OOLONG | +4.5 average, +12.6 at 512K | Self-reported by Martian Engineering |
| DKG multi-agent wall time reduction | 47% | Self-reported benchmark, small N |
| Memori LoCoMo accuracy | 81.95% at 4.97% token footprint | Self-reported by MemoriLabs |

None of these benchmarks have been independently validated. All are self-reported by the respective project authors. The DKG experiment used N=1-2 per arm across 8 tasks, which is too small for statistical confidence.

## Strengths

**Extensible context management.** No other open-source coding agent exposes context management as a plugin slot. This makes OpenClaw the natural host for experimental context architectures.

**Multi-model support via provider abstraction.** OpenClaw supports multiple LLM providers and can be configured to use different models for different tasks (main session model vs. summary model, for example). The [Ollama](../projects/ollama.md) integration enables fully local deployments.

**[CLAUDE.md](../concepts/claude-md.md) compatibility.** OpenClaw supports CLAUDE.md-style skill files, enabling agents to load domain-specific instructions and documentation.

**Ecosystem gravity.** Memory projects targeting OpenClaw (Hipocampus, lossless-claw, Memori, DKG) create a compounding ecosystem effect. Users get access to a growing library of context management strategies without switching agents.

**Plugin marketplace.** The `/plugin marketplace` command and `/plugin install` flow lower friction for adding third-party extensions.

## Critical Limitations

**Concrete failure mode — subagent context inheritance.** Subagents spawned by OpenClaw inherit context from the parent session, but the ContextEngine's `prepareSubagentSpawn` / `onSubagentEnded` hooks require explicit plugin implementation to manage this correctly. Plugins that don't implement these hooks leave subagents with either stale context or no memory of parent session state. The lossless-claw expansion system works around this by creating scoped delegation grants with TTLs and token caps, but plugins that omit this logic produce subagents that behave inconsistently across sessions.

**Unspoken infrastructure assumption.** OpenClaw assumes a persistent local filesystem for plugin state. Cloud or containerized deployments where the working directory resets between sessions (CI/CD environments, serverless, ephemeral containers) silently break all file-based plugin state. Hipocampus loses its ROOT.md and compaction tree. Lossless-claw loses its SQLite database. There is no explicit documentation of this assumption, and the failure mode is silent — the agent continues running but without memory.

## When NOT to Use It

**Collaborative or web-based environments.** OpenClaw is a terminal-first agent. If your workflow requires a GUI, browser-based access, or real-time collaboration features (inline diffs, visual context, shared sessions), Cursor or Windsurf are more appropriate.

**Teams requiring audit trails or enterprise access controls.** OpenClaw has no built-in audit logging, RBAC, or organizational policy enforcement. [Claude Code](../projects/claude-code.md) and [GitHub Copilot](../projects/github-copilot.md) have organizational management features.

**Environments where model provider contracts matter.** OpenClaw routes requests directly to LLM APIs. If your organization requires requests to flow through approved proxies or has data residency requirements, the direct API integration creates compliance risk.

**Projects with tight context budgets that need production reliability.** The ContextEngine plugin system is powerful but immature. Lossless-claw's OOLONG benchmarks are self-reported and the plugin is beta-quality. For production workloads where context management failure is costly, the built-in compaction of Claude Code or similar mature systems is safer.

## Unresolved Questions

**Governance and maintenance continuity.** It's not clear who maintains OpenClaw, what the release cadence is, or whether there is organizational backing. Josh Lehman's dual role as OpenClaw maintainer and lossless-claw author creates potential for the plugin system to evolve in ways that favor Martian Engineering's commercial interests.

**Plugin conflict resolution.** The ContextEngine system uses a single slot (`contextEngine`). What happens when two plugins both want to intercept context management is undocumented. There is no arbitration mechanism or priority system described.

**Cost at scale.** The lossless-claw plugin makes one LLM call per leaf compaction pass and potentially more for condensation. For long sessions with a cheap main model but expensive summary model, the compaction overhead cost relative to total session cost is not benchmarked. The default summary model configuration may silently default to an expensive model.

**ContextEngine API stability.** The plugin interface was introduced in v2026.3.7. No stability guarantees or versioning policy for the ContextEngine API surface are documented. Breaking changes would silently break all installed plugins.

**Multi-agent coordination primitives.** The framework lacks native primitives for coordinating multiple OpenClaw instances. The DKG adapter works around this, but at significant setup complexity.

## Alternatives

| Use case | Alternative | Reason |
|----------|-------------|--------|
| GUI-based editing with inline AI | [Cursor](../projects/cursor.md) or [Windsurf](../projects/windsurf.md) | Terminal-only is a hard constraint for many developers |
| Maximum model capability with enterprise support | [Claude Code](../projects/claude-code.md) | Anthropic backing, better subagent orchestration, CLAUDE.md native |
| Open-source with strong community | [OpenCode](../projects/opencode.md) | Actively maintained, broader contributor base |
| Multi-agent coordination | [AutoGen](../projects/autogen.md) or [LangGraph](../projects/langgraph.md) | Purpose-built for agent coordination, not bolted on |
| Persistent cross-session memory without framework lock-in | [Mem0](../projects/mem0.md) or [Letta](../projects/letta.md) | Framework-agnostic, production-ready memory layers |

Use OpenClaw when you want a hackable, open-source coding agent with a genuine extension point for custom context management strategies. Use it particularly if you want to experiment with lossless-claw's DAG summarization or Hipocampus's proactive memory, which have no equivalents on other platforms.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — the practice OpenClaw's plugin system makes configurable
- [Context Management](../concepts/context-management.md) — what the ContextEngine slot controls
- [Agent Memory](../concepts/agent-memory.md) — what Hipocampus, Memori, and lossless-claw build on top of OpenClaw
- [Context Graphs](../concepts/context-graphs.md) — the DAG structure lossless-claw implements
- Lossless Context Management — the LCM paper that motivates lossless-claw
- [CLAUDE.md](../concepts/claude-md.md) — skill file format OpenClaw adopts
- [Model Context Protocol](../concepts/model-context-protocol.md) — the tool protocol OpenClaw implements for MCP-compatible integrations
- [Episodic Memory](../concepts/episodic-memory.md) — what session-scoped plugins like Hipocampus implement
- [Observability](../concepts/observability.md) — a gap in OpenClaw's current tooling
