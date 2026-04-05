---
entity_id: openclaw
type: project
bucket: agent-systems
abstract: >-
  OpenClaw is an open-source agentic coding framework (Claude Code alternative)
  that introduced a plugin system enabling third-party context engines, memory
  layers, and workflow extensions.
sources:
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/memorilabs-memori.md
  - repos/martian-engineering-lossless-claw.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/alirezarezvani-claude-skills.md
  - repos/thedotmack-claude-mem.md
  - repos/greyhaven-ai-autocontext.md
  - repos/garrytan-gstack.md
  - repos/volcengine-openviking.md
  - repos/topoteretes-cognee.md
  - repos/infiniflow-ragflow.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/martian-engineering-lossless-claw.md
  - deep/repos/volcengine-openviking.md
related:
  - Claude Code
  - Anthropic
  - OpenAI
  - Claude
  - Retrieval-Augmented Generation
  - Cursor
  - Model Context Protocol
  - OpenAI Codex
  - OpenCode
  - Agent Memory
  - claude.md
  - A-MEM
last_compiled: '2026-04-05T20:22:47.809Z'
---
# OpenClaw

## What It Is

OpenClaw is an open-source terminal-based agentic coding framework, positioned as a community alternative to proprietary agents like Claude Code, Cursor, and OpenAI Codex. It runs in the terminal, executes code, reads and writes files, calls tools, and orchestrates multi-step programming tasks. Its primary architectural differentiator is a slot-based plugin system introduced in v2026.3.7 (via PR #22201, authored by Josh Lehman, who is also a core OpenClaw maintainer) that allows third parties to replace or extend core subsystems — most notably context management.

The framework gained significant ecosystem traction as the runtime target for several memory and context projects: [OpenViking](../projects/openviking.md) (ByteDance's context database), [lossless-claw](../projects/lossless-claw.md) (DAG-based summarization), [Hipocampus](../projects/hipocampus.md) (file-based proactive memory), [Memori](../projects/memori.md) (LLM call interception), and [Cognee](../projects/cognee.md) (graph-vector knowledge engine). This plugin ecosystem is what distinguishes OpenClaw from similar agents.

## Core Architecture

### The ContextEngine Plugin System

The central architectural contribution is the `ContextEngine` interface, a slot-based registry resolved from config that provides seven lifecycle hooks:

1. **bootstrap** — Engine initialization, DB connections, session reconciliation
2. **ingest** — New message arrival, preprocessing, classification
3. **assemble** — Before each prompt is sent to the model; decides what goes into the context window
4. **compact** — Token limit approaching; compress or summarize conversations
5. **afterTurn** — Post-processing after each model response
6. **prepareSubagentSpawn** — Before a subagent launches; prepare isolated context scope
7. **onSubagentEnded** — After a subagent completes; collect output, merge back

The `ownsCompaction` flag is the key toggle: when a plugin sets it `true`, OpenClaw's built-in sliding-window compaction is fully disabled and the plugin takes over. Without any plugin configured, OpenClaw loads a `LegacyContextEngine` for backward compatibility.

The `systemPromptAddition` feature in the assembly response enables plugins to inject dynamic content into the system prompt at runtime, without static configuration files. Lossless-claw uses this to calibrate agent confidence when operating from compressed context.

### Subagent System

OpenClaw spawns subagents for delegated tasks. The plugin interface exposes `prepareSubagentSpawn` and `onSubagentEnded` hooks so context plugins can scope subagents to relevant memory (via delegation grants with TTLs and token caps) and collect results back into the parent session. The `statelessSessionPatterns` configuration allows temporary subagent sessions to read from existing context without polluting it.

### Session Management

Sessions have explicit lifecycle commands: `/new` keeps the conversation but prunes context items, `/reset` archives and creates a new session. Plugins control how much summary structure survives `/new` via `newSessionRetainDepth`. The session state persists to JSONL files on disk, enabling crash recovery via bootstrap reconciliation.

### Configuration

OpenClaw uses JSON configuration files to specify plugin slots. Community experience notes the config file is not stable across restarts — it may be silently modified or damaged on reload. This is a known production reliability issue.

## Plugin Ecosystem

The plugin system is the reason multiple major memory projects target OpenClaw specifically:

| Plugin | What It Adds |
|--------|-------------|
| [lossless-claw](../projects/lossless-claw.md) | DAG-based hierarchical summarization, SQLite immutable store, expansion tools |
| [OpenViking](../projects/openviking.md) | Filesystem-paradigm context database with L0/L1/L2 tiered loading |
| [Hipocampus](../projects/hipocampus.md) | File-based proactive memory with compaction tree and ROOT.md index |
| [Memori](../projects/memori.md) | LLM call interception for transparent persistent memory |
| [Cognee](../projects/cognee.md) | Graph-vector knowledge engine with continuous learning |

Each plugin registers into the `contextEngine` slot via `openclaw.plugin.json` and implements the lifecycle interface. Install via `openclaw plugins install @vendor/plugin-name`.

The plugin system was architected and first exercised by the same person (Lehman), which explains its tight fit with lossless-claw's requirements. This dual-authorship pattern means the plugin interface reflects real production needs rather than speculative API design.

## Key Numbers

- Minimum version for plugin system: **v2026.3.7**
- Seven lifecycle hooks in the ContextEngine interface
- Node.js >= 22 required for most plugins
- Python >= 3.10 required for OpenViking integration

Star counts and download figures for OpenClaw itself are not directly cited in the source material. OpenViking reached 20,800+ stars partly through OpenClaw ecosystem association. These figures are self-reported by project maintainers.

## Strengths

**Extensible context management.** The ContextEngine plugin system is genuinely novel among open-source coding agents. No comparable agent framework exposes this level of composable context control. Plugins can intercept every lifecycle stage, own compaction entirely, inject dynamic prompts, and scope subagent memory.

**Ecosystem gravity.** Multiple well-resourced teams (ByteDance/Volcengine, Martian Engineering) built production systems targeting OpenClaw specifically. This creates compounding value: users get access to battle-tested memory plugins without building them.

**MCP compatibility.** OpenClaw integrates with [Model Context Protocol](../concepts/model-context-protocol.md) tooling, enabling connection to external MCP servers (Memori's `api.memorilabs.ai/mcp/`, Cursor-compatible tools, etc.).

**Subagent isolation.** The delegation grant model with TTLs and token caps gives memory plugins a principled way to spawn bounded subagents for retrieval tasks without exposing the full agent context.

## Critical Limitations

**Configuration fragility.** Community reports consistently identify JSON config instability as a production issue — the configuration file may be modified or damaged on restart. For systems that depend on plugin slot configuration, this creates silent failures where the plugin silently deregisters, falling back to `LegacyContextEngine` without error. Teams running OpenClaw in unattended workflows need config validation and version control on the JSON file.

**Infrastructure assumption.** OpenClaw assumes a local development environment: filesystem access, persistent process state, Node.js runtime, and (for most useful plugins) a running database (SQLite at minimum, PostgreSQL for production memory plugins). It is not designed for ephemeral, containerized, or serverless runtimes where filesystem state disappears between invocations. Deploying it in a CI/CD environment or cloud function requires explicit volume mounts and state management that the framework itself does not provide.

## When Not to Use It

**Skip OpenClaw when you need a managed, zero-infrastructure coding agent.** The plugin ecosystem's power requires installing and operating multiple components (Node.js 22+, Go 1.22+ for some plugins, C++ compilers, database backends). Community feedback describes the setup as requiring developer familiarity with JSON config troubleshooting, build toolchains, and willingness to debug across multiple layers. If your team wants a coding agent that works out of the box, Claude Code or Cursor are operationally simpler.

**Skip OpenClaw for short-lived or stateless sessions.** The memory plugins that differentiate OpenClaw (Hipocampus, lossless-claw, OpenViking) deliver compounding value over many sessions. For one-off tasks or ephemeral CI runs, the setup cost exceeds the benefit.

**Skip OpenClaw when your primary language is not JavaScript/TypeScript or Python.** The plugin interface is TypeScript. While Python memory backends (Memori, Cognee, OpenViking) integrate through API or SDK adapters, the extension surface itself is Node.js. Teams in Go, Rust, or JVM ecosystems will find the extension model awkward.

## Unresolved Questions

**Governance and release cadence.** The v2026.3.7 plugin system was introduced via a PR authored by a plugin developer who also maintains OpenClaw. The governance structure — who controls breaking changes to the ContextEngine interface, how plugin compatibility is versioned — is not documented in the source material. If the interface changes between minor versions, all third-party plugins break simultaneously.

**Cost at scale.** Every plugin that performs LLM calls during compaction (lossless-claw, OpenViking's VLM summarization) adds token cost to every session. The framework has no built-in metering, rate limiting, or cost reporting across plugins. Teams running many parallel sessions have no visibility into aggregate plugin-generated token spend.

**Conflict resolution between plugins.** The slot system allows one `contextEngine` plugin at a time, which prevents direct conflicts. But plugins can also inject into other surfaces (MCP tools, system prompt additions, session lifecycle). How two plugins that both want to modify the system prompt interact — or whether the slot system prevents this composition entirely — is not documented.

## Alternatives

| Alternative | When to Choose It |
|-------------|------------------|
| [Claude Code](../projects/claude-code.md) | Need a production-grade managed coding agent with Anthropic support; accept proprietary constraints |
| Cursor | Need IDE integration rather than terminal-first workflow |
| OpenCode | Lighter weight terminal agent without the plugin ecosystem overhead |
| [OpenAI Codex](../projects/openai-codex.md) | Need tight OpenAI API integration and prefer OpenAI's orchestration model |

Use OpenClaw when you need to replace or extend context management with a custom memory strategy, and you have the engineering capacity to operate the plugin ecosystem. The framework's value is proportional to how much of the plugin ecosystem you can actually run and maintain.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Model Context Protocol](../concepts/model-context-protocol.md)
- [A-MEM](../concepts/a-mem.md)
- [claude.md](../concepts/claude-md.md)

## Sources

- [Memori deep analysis](../raw/deep/repos/memorilabs-memori.md)
- [lossless-claw deep analysis](../raw/deep/repos/martian-engineering-lossless-claw.md)
- [Hipocampus deep analysis](../raw/deep/repos/kevin-hs-sohn-hipocampus.md)
- [OpenViking deep analysis](../raw/deep/repos/volcengine-openviking.md)
- [Cognee repository](../raw/repos/topoteretes-cognee.md)
