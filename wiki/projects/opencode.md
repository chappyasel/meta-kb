---
entity_id: opencode
type: project
bucket: agent-architecture
abstract: >-
  OpenCode is a terminal-based AI coding agent supporting multiple LLM providers
  (OpenAI, Anthropic, Google, local models) with a TUI built on Bubble Tea,
  competing with Claude Code and Gemini CLI through provider flexibility and
  open-source hackability.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/human-agent-society-coral.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/alirezarezvani-claude-skills.md
  - repos/kepano-obsidian-skills.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - claude-code
  - codex
  - openclaw
  - cursor
  - agent-skills
  - retrieval-augmented-generation
  - gemini-cli
  - model-context-protocol
  - knowledge-graph
  - gemini-cli
last_compiled: '2026-04-08T02:40:43.113Z'
---
# OpenCode

## What It Is

OpenCode is an open-source terminal coding agent written in Go. You run it in a terminal, it opens a TUI built on [Charm's Bubble Tea framework](https://github.com/charmbracelet/bubbletea), and you interact with LLMs to write, edit, and debug code in your current directory. It supports OpenAI, Anthropic, Google Gemini, and local models via [Ollama](../projects/ollama.md), plus any [OpenAI-compatible endpoint](https://github.com/opencodefeed/opencode).

The differentiator is provider flexibility combined with an open plugin surface. [Claude Code](../projects/claude-code.md) locks you to Anthropic's API. [Gemini CLI](../projects/gemini-cli.md) defaults to Google. OpenCode lets you swap models mid-session or route to a local Ollama instance. The codebase is also a runtime that other projects explicitly build on: CORAL (multi-agent coding optimizer), Hipocampus (proactive memory system), and Everything Claude Code all list OpenCode as a supported runtime alongside Claude Code and Codex.

## Architecture

OpenCode is a Go binary with three main layers: the TUI, the agent loop, and tool execution.

**TUI (Bubble Tea):** The terminal interface handles input, renders conversation history, and manages session state. Bubble Tea's message-passing model means the UI updates are driven by events from the agent loop, not polling.

**Agent loop:** On each user message, OpenCode constructs a prompt (system context + conversation history + tool results), calls the configured LLM provider, and parses the response for tool calls. The loop continues until the model stops calling tools. This is a standard [ReAct](../concepts/react.md)-style loop: reason, act, observe, repeat.

**Tool execution:** OpenCode ships built-in tools for file read/write, bash execution, and search. The tool surface is what differentiates coding agents in practice. The `opencode.json` config file controls which tools are available and their permissions. Everything Claude Code's `.opencode/tools/` directory adds custom tools (security-audit, run-tests) by dropping tool definitions into the config path.

**Configuration:** `opencode.json` at project root or `~/.config/opencode/opencode.json` globally. The config maps to provider credentials, model selection, tool permissions, and plugin directories. The format is documented but the schema is evolving.

**Plugin surface:** OpenCode discovers `SKILL.md` files from directories listed in config, following the [Agent Skills](../concepts/agent-skills.md) specification. Skills, agents, and commands from third-party packages (like Hipocampus or Everything Claude Code) drop files into `~/.opencode/` subdirectories and OpenCode auto-loads them. This mirrors Claude Code's plugin architecture.

**Session files:** Conversations are stored as JSONL files locally. Hipocampus's compaction system reads these files directly to build its memory hierarchy, extracting tool calls and model outputs without any OpenCode-specific API.

## Where OpenCode Fits in the Ecosystem

Three projects in this wiki explicitly implement OpenCode support, which tells you something about its adoption:

**CORAL** treats OpenCode as a first-class agent runtime alongside Claude Code and Codex. CORAL's `AgentRuntime` protocol abstracts runtime differences: instruction filename (`opencode.json`), shared directory (`.opencode/`), permission model. CORAL spawns OpenCode processes in isolated git worktrees and monitors them via filesystem events, the same way it manages Claude Code agents.

**Hipocampus** ships OpenCode-specific plugin files. Its memory system works by reading session JSONL files and injecting context via the plugin mechanism, not a proprietary API. This means Hipocampus's proactive memory (the system that scored 21x better than no-memory on implicit recall benchmarks) works with OpenCode out of the box.

**Everything Claude Code** maintains a `.opencode/` directory with 28 agent prompts, 30+ commands, and 6 custom tools. The project maps its 156 skills to OpenCode's plugin format, giving OpenCode users access to the same skill library as Claude Code users.

This third-party ecosystem is the strongest evidence that OpenCode has genuine adoption. Projects invest in compatibility when users ask for it.

## Key Numbers

GitHub stars: the OpenCode repository at `opencodefeed/opencode` has accumulated significant community interest, though independent verification of active daily user counts is unavailable. Stars in this category frequently reflect curiosity over production use.

[SWE-bench](../projects/swe-bench.md) scores: OpenCode does not publish independent benchmark results. Agent performance in practice depends heavily on which underlying LLM you configure, making single-number benchmarks less meaningful than for closed products.

Everything Claude Code's 136K stars and 20K forks (self-reported, viral growth via X thread) include OpenCode support, suggesting meaningful OpenCode usage within that community. Hipocampus's MemAware benchmark results (21x improvement over no-memory) apply to OpenCode when the plugin is installed, but this measures the memory system, not OpenCode itself.

All metrics here are either self-reported or inferred from ecosystem adoption, not independently validated.

## Strengths

**Provider flexibility at session time.** You can run a session on Claude Sonnet, hit a rate limit, and continue on GPT-4o or a local Llama model without losing conversation history. This matters for teams with varied API access or cost constraints.

**First-class ecosystem citizenship.** Because OpenCode follows the Agent Skills spec and uses JSONL session files with a documented config format, it integrates with the same skill libraries, memory systems, and orchestration frameworks as Claude Code. You get Hipocampus memory and Everything Claude Code's skill library without building separate integrations.

**Local model support.** Via Ollama, OpenCode runs against models that never leave your machine. For code involving proprietary algorithms or regulated data, this is a hard requirement that eliminates Claude Code and Gemini CLI entirely.

**Hackability.** The Go codebase is readable and the plugin system is file-based. CORAL's multi-agent orchestration, for example, works by writing config files and spawning processes, with no OpenCode-internal API access required.

## Limitations

**Concrete failure mode: permission model immaturity.** CORAL's `setup_*_settings()` functions include substantial runtime-specific logic for Claude Code (complex allow/deny rules with path patterns, bash command filtering) but note that OpenCode "maps permissions to its own `opencode.json` format." This suggests OpenCode's permission model is less granular. In multi-agent orchestration, this means you cannot as precisely restrict what agents can modify, increasing the blast radius of a confused or misbehaving agent.

**Unspoken infrastructure assumption: local filesystem.** OpenCode assumes you are running on a machine with direct filesystem access to your code. It does not support remote workspaces, containerized development environments where the filesystem is virtualized, or cloud-based IDEs natively. Claude Code has the same assumption, but it is more commonly acknowledged in OpenCode's documentation gaps.

**Upstream model quality ceiling.** OpenCode's outputs are bounded by whichever LLM you configure. Unlike Claude Code, which can tune prompts and context construction specifically for Claude's behavior, OpenCode's prompt engineering must work across diverse models. In practice, Claude Code tends to perform better on Anthropic models because Anthropic optimizes the agent prompting for their own models.

**Governance and maintenance.** OpenCode is community-maintained. There is no published roadmap, SLA, or funding disclosure. Breaking changes in the Agent Skills spec, LiteLLM routing, or provider APIs could break functionality without a commercial entity to respond. Compare this to [Cursor](../projects/cursor.md) (VC-backed) or Claude Code (Anthropic internal).

## When NOT to Use OpenCode

**When you need Anthropic-specific capabilities.** Claude Code has privileged access to Claude's extended thinking, tool-use optimizations, and context caching that OpenCode cannot replicate even when configured against the same Anthropic API. If you are doing complex multi-step reasoning tasks and Claude is your required model, Claude Code will perform better.

**When your organization requires audited tools.** OpenCode has no SOC 2 certification, no enterprise support tier, no documented security review process. For regulated industries (healthcare, finance, legal), this rules it out regardless of technical merit.

**When you want a GUI.** OpenCode is terminal-only. [Cursor](../projects/cursor.md) and Windsurf provide IDE experiences with inline diffs, visual context selection, and settings UIs. If your team is not comfortable in terminals, the friction will exceed the benefits.

**When you need predictable performance.** Without published benchmarks tied to specific model configurations, you cannot know in advance what quality to expect. For automated pipelines where agent output quality needs to be above a threshold, you need either benchmarks or extensive internal testing. Claude Code at least has SWE-bench numbers from Anthropic (self-reported but present).

## Unresolved Questions

**Cost at scale.** There is no published guidance on token costs when running OpenCode in multi-agent frameworks like CORAL. When five OpenCode agents run in parallel for 20+ hours, each making LLM calls through a gateway, costs accumulate fast. CORAL's `GatewayManager` tracks per-agent costs via LiteLLM, but OpenCode itself has no cost reporting.

**Context management strategy.** How OpenCode handles context window overflow is not clearly documented. Does it truncate, summarize, or fail? For long coding sessions, the answer matters. Claude Code has documented behavior here; OpenCode's behavior appears configuration-dependent and model-dependent.

**Skill conflict resolution.** When two installed skill packages define skills with the same name or overlapping trigger conditions, how does OpenCode resolve the conflict? The Agent Skills spec does not fully address this, and OpenCode's implementation details are not publicly documented.

**Session portability across versions.** JSONL session files are the persistence layer. If OpenCode changes the session format between versions, older sessions may become unreadable. There is no documented migration path.

## Alternatives

**[Claude Code](../projects/claude-code.md):** Use when Anthropic's models are your primary choice and you want the highest-performance agent on Claude, with Anthropic-backed maintenance and benchmarks. The tradeoff is vendor lock-in and higher API costs.

**[Gemini CLI](../projects/gemini-cli.md):** Use when you want Google's models (Gemini 2.5 Pro's large context window is genuinely useful for large codebase tasks) and are comfortable with Google's ecosystem. Similar open-source positioning to OpenCode.

**[Cursor](../projects/cursor.md):** Use when your team wants an IDE experience rather than a terminal agent, or when you need features like inline diffs, multi-file context selection, and a GUI settings panel.

**[OpenClaw](../projects/openclaw.md):** Use when you want a Claude Code fork with community modifications and are specifically targeting Claude models. OpenClaw extends Claude Code rather than providing an alternative runtime.

**[LangGraph](../projects/langgraph.md) / [LangChain](../projects/langchain.md):** Use when you need a programmable agent framework rather than an interactive terminal assistant. LangGraph gives you explicit control over the agent loop, branching logic, and multi-agent coordination at the cost of more setup.

**Local-only option:** If air-gapped or fully local operation is the requirement, OpenCode with Ollama is the only production-ready option in this list. The others require cloud API access.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md): The SKILL.md specification OpenCode implements for plugin discovery
- [Model Context Protocol](../concepts/model-context-protocol.md): The protocol layer for tool definitions that OpenCode-compatible tools can implement
- [Context Engineering](../concepts/context-engineering.md): The practice of constructing effective context windows that shapes OpenCode session quality
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): Pattern used in memory plugins (Hipocampus) that extend OpenCode
- [Knowledge Graph](../concepts/knowledge-graph.md): Used by memory systems that integrate with OpenCode for structured knowledge storage
- [Multi-Agent Systems](../concepts/multi-agent-systems.md): The coordination pattern CORAL uses when running multiple OpenCode agents in parallel
