---
entity_id: opencode
type: project
bucket: agent-architecture
abstract: >-
  OpenCode is an open-source, terminal-based AI coding agent built in Go with a
  TUI interface, supporting any LLM via OpenAI-compatible APIs — primarily
  differentiated by full transparency, self-hostability, and freedom from vendor
  lock-in.
sources:
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - repos/alirezarezvani-claude-skills.md
  - repos/human-agent-society-coral.md
  - repos/kepano-obsidian-skills.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/supermemoryai-supermemory.md
related:
  - claude-code
  - codex
  - openclaw
  - cursor
  - agent-skills
  - gemini-cli
last_compiled: '2026-04-08T22:57:15.540Z'
---
# OpenCode

## What It Is

OpenCode is an open-source terminal coding agent written in Go. It runs in the terminal with a text-based UI (TUI), connects to any LLM through OpenAI-compatible APIs, and executes code tasks autonomously — reading files, running shell commands, editing code, and reasoning through multi-step problems. It positions itself as the self-hostable, auditable alternative to proprietary tools like [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [Gemini CLI](../projects/gemini-cli.md).

The core differentiator is architectural transparency. Where Claude Code is a closed binary and Cursor is a proprietary IDE extension, OpenCode ships its entire implementation — agent loop, tool definitions, prompt construction, context management — as readable Go source. Users can fork it, audit it, and run it against local models via [Ollama](../projects/ollama.md) or remote APIs.

## Architecture

OpenCode is structured around four main subsystems:

**Agent Loop.** The agent receives a user prompt, selects from a registered tool set, executes tools, observes results, and iterates until it reaches a terminal state or token budget. The loop follows a [ReAct](../concepts/react.md)-style think-act-observe pattern. Tool calls are parsed from model output and dispatched to Go functions that interact with the filesystem and shell.

**Tool Registry.** Tools are registered as typed Go structs with JSON Schema definitions for their parameters. The standard set includes file read/write, shell execution, web search, and directory listing. Because the registry is in-process Go code, adding a custom tool means writing a Go struct and registering it — no plugin API, no subprocess boundary.

**TUI Layer.** Built on [Bubble Tea](https://github.com/charmbracelet/bubbletea), OpenCode renders a split-pane terminal interface: conversation history on one side, active tool calls and output on the other. The TUI is the primary interaction surface; there is no GUI or web interface.

**Context Management.** OpenCode tracks token counts against model limits and applies truncation when approaching context ceilings. It does not implement sophisticated [context compression](../concepts/context-compression.md) or hierarchical memory — conversations are managed as linear message arrays. See the [Agent Skills](../concepts/agent-skills.md) ecosystem around OpenCode for layered memory extensions like Hipocampus.

## Multi-Runtime Positioning

OpenCode appears as a supported runtime in multiple third-party projects, which is the clearest evidence of its adoption footprint. [CORAL](../projects/coral.md) (the multi-agent optimization system described in source material) lists OpenCode alongside Claude Code and [OpenAI Codex](../projects/codex.md) as a first-class agent runtime via its `AgentRuntime` protocol. CORAL generates `opencode.json` permission configs for OpenCode agents, maps its shared directory to `.opencode/`, and uses `AGENTS.md` as its instruction file convention.

The [Everything Claude Code](../concepts/agent-harness.md) harness (ECC) maintains a full `.opencode/` directory with 28 agent prompts, 30+ commands, custom tools, and hook plugins — giving OpenCode near-parity with its Claude Code coverage. ECC treats OpenCode as one of six supported platforms and provides an `opencode.json`-based configuration system.

OpenCode also supports the [Agent Skills](../concepts/agent-skills.md) specification (`SKILL.md` format), making skills authored for any compatible runtime portable to OpenCode.

## Key Numbers

- **GitHub stars**: Reported in the mid-to-high thousands range (exact count fluctuates; verification against live GitHub is required — treat any specific number here as potentially stale).
- **Language**: Go, single binary distribution.
- **Model support**: Any OpenAI-compatible endpoint. Tested configurations include Anthropic Claude (via API), OpenAI models, and local models via Ollama.
- **Benchmark performance**: No independently published benchmark results (e.g., [SWE-bench](../projects/swe-bench.md)) specific to OpenCode. Performance on coding tasks is a function of the underlying model, not OpenCode's scaffolding. This is self-reported positioning, not verified by third parties.

## Strengths

**Auditability.** Every prompt, tool call, and agent decision is visible in Go source. Teams with security or compliance requirements can verify exactly what the agent sends to external APIs.

**Model agnosticism.** Switching from Claude to GPT-4 to a local Qwen model requires changing one config value. No vendor SDK dependencies in the agent loop.

**Composability with multi-agent frameworks.** CORAL's support for OpenCode as a runtime demonstrates that it integrates cleanly into orchestration systems that treat coding agents as interchangeable compute units.

**Skill ecosystem portability.** The `SKILL.md` standard adoption means the growing corpus of agent skills (from ECC's 156 skills, Obsidian's official skills package, etc.) works with OpenCode without modification.

**Zero IDE dependency.** Works in any terminal, on remote machines over SSH, inside Docker containers, or in CI pipelines where a GUI is unavailable.

## Critical Limitations

**Concrete failure mode — context management under long sessions.** OpenCode's linear message array approach to context means that long coding sessions — those involving many file reads, shell outputs, and iterative edits — fill the context window with low-signal history. Unlike systems with hierarchical compression (Hipocampus's compaction tree, MemGPT's paged memory), OpenCode truncates from the bottom. In practice, this means the agent loses access to early-session decisions precisely when it needs them to maintain consistency. A task that refactors a module referenced in the first ten messages may contradict those early decisions by message 50.

**Unspoken infrastructure assumption.** OpenCode assumes a stable, low-latency connection to an LLM API for every agent turn. The tool call loop makes multiple sequential API calls during a single task. In environments with rate limits, API instability, or high latency (common with local Ollama deployments on underpowered hardware), the agent loop stalls or produces degraded outputs. There is no retry logic with exponential backoff exposed at the configuration level, and no offline-capable execution mode.

## When NOT to Use OpenCode

- **Teams wanting zero-config onboarding.** Claude Code's managed setup, built-in permissions model, and Anthropic-hosted context are faster to start with. OpenCode requires configuring API keys, model endpoints, and potentially building from source.
- **Tasks requiring deep IDE integration.** Cursor and Windsurf have semantic understanding of the full project via language server integration. OpenCode reads files as text. For tasks where jump-to-definition, type inference, or refactoring across large codebases matters, OpenCode's file-level view is a handicap.
- **Non-technical users.** The TUI interface and Go-binary distribution assume comfort with terminals. There is no GUI fallback.
- **Regulated environments where all LLM traffic must stay on-premises.** While OpenCode supports local models, configuring and validating a fully air-gapped setup requires engineering work that commercial solutions with on-premises tiers handle out of the box.
- **Teams that need out-of-the-box [Human-in-the-Loop](../concepts/human-in-the-loop.md) workflows.** OpenCode's approval mechanisms are basic compared to Claude Code's granular permission model (which scopes tools per agent and supports allow/deny lists per file path).

## Unresolved Questions

**Governance and contribution velocity.** The documentation does not clearly state who maintains OpenCode, how breaking changes are handled, or what the release cadence is. For a project used as a dependency in systems like CORAL, these governance questions matter — a breaking change in tool call format could silently break orchestration integrations.

**Cost attribution at scale.** When running OpenCode inside a multi-agent system (CORAL spawns multiple OpenCode agents against different worktrees), there is no built-in mechanism for per-agent token tracking or cost attribution. CORAL addresses this with its gateway LiteLLM proxy, but OpenCode itself provides no observability hooks. Teams running many agents simultaneously have no native way to understand which agent consumed how much budget.

**Conflict resolution in shared skill environments.** When ECC's 156 skills are installed for OpenCode and multiple skills match a given context, the resolution order is undocumented. Unlike Claude Code's plugin system (which has explicit loading order semantics), OpenCode's skill activation behavior under conflicts is not specified.

**Long-term session persistence.** OpenCode does not document a session persistence model equivalent to Claude Code's `--resume` flag and session ID system. CORAL explicitly notes that session resumption for OpenCode agents falls back to a fresh-start prompt with a knowledge summary, because the resume mechanism is unavailable. Extended autonomous operation (20+ hour research sessions as described in the Agentic Researcher framework) is harder to architect around this gap.

## Alternatives

- **[Claude Code](../projects/claude-code.md)**: Use when you want deep Anthropic model integration, a polished permission system, and official enterprise support. Better for teams where setup friction matters more than auditability.
- **[Cursor](../projects/cursor.md)**: Use when semantic IDE features (type inference, cross-file refactoring, GUI) are more important than model agnosticism or terminal-native operation.
- **[Gemini CLI](../projects/gemini-cli.md)**: Use when you're already in the Google ecosystem or need large context windows (Gemini 1.5 Pro's 1M context) as a default.
- **[OpenClaw](../projects/openclaw.md)**: Use when you need tighter integration with Claude models specifically and want community forks that track Claude Code's feature set more closely.
- **OpenCode**: Use when auditability, model agnosticism, and composability with external orchestration systems (CORAL, multi-agent harnesses) are the primary requirements, and your team can absorb the configuration overhead.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md) — The SKILL.md standard OpenCode adopts for portable skill definitions
- [Context Management](../concepts/context-management.md) — OpenCode's primary architectural constraint
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — CORAL's use of OpenCode as a swappable runtime
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — Where OpenCode's current approval mechanisms fall short
- [Model Context Protocol](../concepts/model-context-protocol.md) — An adjacent standard for tool/resource exposure that OpenCode may integrate with
