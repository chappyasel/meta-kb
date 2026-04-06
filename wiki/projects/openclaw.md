---
entity_id: openclaw
type: project
bucket: agent-systems
abstract: >-
  OpenClaw is an open-source agentic coding framework that serves as the runtime
  host for context management plugins (ContextEngine API) and persistent memory
  systems, positioned as the community-developed alternative to Claude Code.
sources:
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/memorilabs-memori.md
  - repos/martian-engineering-lossless-claw.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/greyhaven-ai-autocontext.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/volcengine-openviking.md
  - repos/infiniflow-ragflow.md
  - repos/origintrail-dkg-v9.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/martian-engineering-lossless-claw.md
  - deep/repos/volcengine-openviking.md
related:
  - claude-code
  - rag
  - openai
  - mcp
  - gemini
last_compiled: '2026-04-06T01:58:12.702Z'
---
# OpenClaw

## What It Is

OpenClaw is an open-source agent framework for coding tasks, built around a plugin architecture that lets developers swap out core subsystems — most notably context management. It functions as the runtime environment that Claude Code-style workflows run inside, but with extension points that proprietary tools lack.

The project's defining feature is the `ContextEngine` plugin interface, introduced in v2026.3.7 via PR #22201. That interface gave third-party developers the ability to replace OpenClaw's built-in sliding-window compaction with their own context management systems. [Lossless-claw](../raw/deep/repos/martian-engineering-lossless-claw.md) was the first plugin to use it; [OpenViking](../raw/deep/repos/volcengine-openviking.md) and [Hipocampus](../raw/deep/repos/kevin-hs-sohn-hipocampus.md) followed as persistent memory layers.

OpenClaw is frequently cited as the integration target for memory and context tools that work alongside Claude Code workflows. It is not a direct clone of Claude Code — it is an alternative runtime that the same LLMs (Claude, Gemini, GPT-4) can drive.

## Architectural Role in the Ecosystem

OpenClaw's significance in the agent memory space comes primarily from what it enables rather than what it does itself. Three documented systems build directly on it:

**[Lossless-claw](../projects/graphiti.md)** replaces the default context window management with a DAG-based summarization system. The `ContextEngine` interface provides seven lifecycle hooks: `bootstrap`, `ingest`, `assemble`, `compact`, `afterTurn`, `prepareSubagentSpawn`, `onSubagentEnded`. Plugins set `ownsCompaction: true` to disable OpenClaw's built-in auto-compaction entirely. Josh Lehman, a core OpenClaw maintainer, authored both the ContextEngine PR and the lossless-claw plugin — which explains the tight fit between the two.

**[OpenViking](../projects/graphiti.md)** (Volcengine/ByteDance) integrates as the persistent memory layer, handling long-term storage under the `viking://` protocol while OpenClaw owns agent runtime and tool execution. OpenViking requires OpenClaw >= 2026.3.7.

**[Hipocampus](../raw/repos/kevin-hs-sohn-hipocampus.md)** installs as an OpenClaw plugin alongside Claude Code support. On OpenClaw, `MEMORY.md` and `USER.md` go into the hot tier (always-loaded), and `ROOT.md` content is embedded as a "Compaction Root" section within `MEMORY.md` — a workaround for OpenClaw's inability to auto-load arbitrary files the way Claude Code's `@import` mechanism in `CLAUDE.md` does.

## Core Mechanism

The plugin slot registry uses config-driven resolution. Setting `plugins.slots.contextEngine: "lossless-claw"` in the OpenClaw configuration points to the installed plugin. Without a plugin registered, the system falls back to `LegacyContextEngine`, preserving backward compatibility.

The `systemPromptAddition` feature in the assembly response allows plugins to inject dynamic content into the system prompt at runtime — used by lossless-claw to calibrate agent confidence based on compression depth, without requiring static configuration files.

Session lifecycle integrates with memory systems through explicit commands: `/new` prunes context items while retaining summary structure at configurable depth; `/reset` archives the conversation and starts fresh.

MCP tool support is present. Memori exposes a server at `api.memorilabs.ai/mcp/` for integration with OpenClaw (alongside Claude Code, Cursor, Codex, Warp). The `@memorilabs/openclaw-memori` package is a dedicated OpenClaw plugin for drop-in persistent memory via Memori's middleware pattern.

## Configuration Instability (Known Issue)

Community reports consistently identify OpenClaw's configuration file as a reliability problem: once the system restarts, the JSON configuration may be automatically modified or overwritten. Production deployments that rely on plugin configuration need external configuration management to work around this. This is not a theoretical concern — it appears frequently enough in setup guides to be treated as a known operational characteristic rather than an edge case.

## Key Numbers

- OpenViking reached 20,800+ GitHub stars and ~1,000 forks after release, driven primarily by its OpenClaw integration
- OpenClaw ContextEngine plugin system: v2026.3.7+, PR #22201
- Hipocampus: 145 stars, 11 forks, JavaScript, MIT license
- Lossless-claw (Volt agent using LCM on OOLONG benchmark): 74.8 average vs Claude Code's 70.3 (+4.5 delta), gap widening to +10.0 at 256K and +12.6 at 512K context (self-reported by Martian Engineering; not independently validated)

## Strengths

**Plugin extensibility.** The ContextEngine interface is architecturally clean enough that three independent teams built production systems on it within the same release cycle. The `ownsCompaction` flag and `systemPromptAddition` API are thoughtful extension points that avoid requiring forks.

**Memory system compatibility.** OpenClaw is the common runtime across the most sophisticated open-source memory systems currently documented: lossless DAG summarization (lossless-claw), hierarchical filesystem memory (OpenViking), and proactive topic indexing (Hipocampus). This ecosystem density makes it a useful test bed for memory architecture research.

**Subagent delegation.** The `prepareSubagentSpawn` and `onSubagentEnded` hooks let plugins scope context for sub-tasks. Lossless-claw uses this for expansion retrieval (recovering detail from compressed summaries) with security controls: delegation grants carry TTLs, token caps, and conversation scoping.

## Limitations

**Configuration fragility.** The JSON configuration being modified on restart is a production blocker for teams that manage infrastructure as code. Until this is resolved, OpenClaw requires more operational overhead than tools with stable configuration.

**Platform parity gap with Claude Code.** Hipocampus's OpenClaw integration requires embedding ROOT.md content inside MEMORY.md because OpenClaw cannot auto-load separate files the way Claude Code's `@import` in `CLAUDE.md` does. This means memory system authors must maintain separate integration paths for OpenClaw vs Claude Code, and the OpenClaw path involves workarounds that can break if MEMORY.md format assumptions change.

**Documentation quality.** Community feedback describes OpenClaw/OpenViking as "not low-threshold" — requiring familiarity with JSON configuration, debugging tolerance, and ongoing skill optimization. The installation process for the full stack (OpenClaw + OpenViking + Rust CLI) requires Go 1.22+, C++, and manual PYTHONPATH configuration.

**Governance opacity.** The project's maintenance structure, release cadence, and decision-making process are not publicly documented. PR #22201 was authored by a maintainer who also wrote the first major plugin — useful for initial quality, but raises questions about how third-party plugin PRs are evaluated and what the bar is for merging plugin API changes.

## When Not to Use OpenClaw

**When you need configuration stability.** If your deployment pipeline treats configuration as code and cannot tolerate runtime modification, OpenClaw's current configuration handling is a risk.

**When your team is new to agent frameworks.** The documentation gap and installation complexity mean OpenClaw has a steeper ramp than alternatives. Teams without experience debugging agent frameworks will spend significant time on setup rather than building.

**When Claude Code's native tooling is sufficient.** If you don't need to swap out the context management system, Claude Code's tighter integration with Anthropic's models and more stable configuration story is likely the better choice. OpenClaw's extensibility is only valuable if you intend to use it.

**For regulated environments.** No documentation exists on OpenClaw's data handling, audit logging, or compliance posture. Environments that require these guarantees should not assume they are present.

## Unresolved Questions

**What does the governance model look like?** Who controls the plugin API, how are breaking changes to the ContextEngine interface managed, and what is the process for deprecating hooks?

**How does the configuration mutation bug manifest?** The community reports describe it happening on restart, but the mechanism — whether it is a migration step, a defaults-writing routine, or something else — is not documented. The severity varies by report.

**What is the performance overhead of the plugin lifecycle?** The seven `ContextEngine` hooks add call overhead on every turn. No benchmarks exist for this overhead across different plugin implementations.

**Is there a compatibility matrix?** OpenViking requires OpenClaw >= 2026.3.7; lossless-claw was introduced in the same version. It is unclear whether older OpenClaw versions remain supported or what the upgrade path looks like for teams on earlier versions.

## Alternatives

**[Claude Code](../projects/claude-code.md)** — Use when you want tighter Anthropic model integration, stable configuration management, and a lower operational burden. Lacks the ContextEngine plugin API, so context management cannot be replaced.

**[Cursor](../projects/cursor.md) / [Windsurf](../projects/windsurf.md)** — Use for IDE-integrated coding workflows where the plugin runtime model is less important than editor integration quality.

**[LangGraph](../projects/langgraph.md)** — Use when you need a code-first graph-based orchestration framework with explicit control over agent state and transitions. More expressive for complex multi-agent pipelines; less batteries-included for coding-specific workflows.

**[CrewAI](../projects/crewai.md)** — Use for multi-agent role-based task delegation where the framework's opinionated structure matches your workflow design.

## Related Concepts

- [Model Context Protocol](../concepts/mcp.md) — OpenClaw integrates with MCP servers for tool access
- [Agent Memory](../concepts/agent-memory.md) — The primary motivation for OpenClaw's plugin architecture
- [Context Engineering](../concepts/context-engineering.md) — What the ContextEngine interface enables
- [Procedural Memory](../concepts/procedural-memory.md) — How skill systems (Hipocampus, OpenViking) store agent capabilities
- [skill.md](../concepts/skill-md.md) — Convention used by memory plugins to teach OpenClaw agents about installed systems
