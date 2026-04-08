---
entity_id: gemini-cli
type: project
bucket: agent-architecture
abstract: >-
  Gemini CLI is Google's open-source terminal agent that connects Gemini models
  to local code and tools; its primary differentiator is a 1M-token context
  window paired with the SKILL.md standard for portable, multi-agent capability
  loading.
sources:
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/repos/kepano-obsidian-skills.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/matrixorigin-memoria.md
related:
  - claude-code
  - codex
  - cursor
  - openclaw
  - opencode
  - agent-skills
last_compiled: '2026-04-08T23:01:51.794Z'
---
# Gemini CLI

## What It Does

Gemini CLI is Google's open-source command-line agent for Gemini models. It runs in the terminal, reads and writes local files, executes shell commands, browses the web, and follows structured skill packages to perform multi-step agentic tasks. Released in mid-2025, it quickly became one of the highest-starred AI CLI projects on GitHub.

The core pitch: a free-tier entry point (Gemini models via Google AI Studio have a generous free quota) with a 1M-token context window, capable of ingesting entire codebases in a single context load. Unlike most AI coding tools, which are IDE extensions, Gemini CLI is purely terminal-native and designed to run in CI pipelines, container environments, and headless automation setups.

## Architecture

Gemini CLI follows the same architectural pattern as [Claude Code](../projects/claude-code.md) and [OpenAI Codex](../projects/codex.md): a loop where the LLM reasons about what tools to call, calls them, observes results, and iterates. The key components:

**Core loop.** The agent receives a user prompt, sends it to Gemini with a tool manifest, executes whatever tools the model calls (file read/write, shell execution, web fetch), feeds results back, and continues until the model stops issuing tool calls or the user interrupts.

**Tool set.** Built-in tools include file operations (read, write, list, search), shell execution, web browsing, and [Model Context Protocol](../concepts/model-context-protocol.md) server connections. The MCP integration lets users extend the tool set without modifying Gemini CLI itself.

**SKILL.md compatibility.** Gemini CLI adopted the [Agent Skills](../concepts/agent-skills.md) standard, the same SKILL.md format used by Claude Code, OpenCode, Cursor, and GitHub Copilot. Skills live in `.gemini/skills/` or the user-global skills directory. The agent loads skill descriptions at startup (~100 tokens each), then activates full skill instructions when the task matches a skill's trigger condition. This enables projects like [gstack](../projects/gstack.md) and community skill registries to work across all compatible agents without platform-specific rewrites.

**Context engineering.** With a 1M-token window, Gemini CLI can load entire repositories into context. This matters for tasks like refactoring across many files or answering questions about a large codebase without needing retrieval. The tradeoff is cost and latency at the high end of that window.

**GEMINI.md.** Like CLAUDE.md in the Claude Code ecosystem, Gemini CLI reads a `GEMINI.md` file at the project root (and can also read `.gemini/*.md` files in the project directory) to load persistent project context, behavioral rules, and skill references. This is the primary mechanism for encoding project-specific knowledge the agent should always have available.

## Key Numbers

- **GitHub stars:** ~90K+ (self-reported at time of launch, verified by multiple external trackers as one of the fastest-growing AI tools repositories in 2025)
- **Context window:** 1M tokens for Gemini 1.5 Pro and Gemini 2.5 Pro models
- **Free tier:** Available through Google AI Studio with rate limits; Gemini 2.5 Pro free tier allows meaningful usage without a billing account
- **Model support:** Primarily Gemini family; some configurations support routing through [LiteLLM](../projects/litellm.md) for other providers

Note: Google's published benchmark numbers for Gemini models are self-reported. Independent evaluations on [SWE-bench](../projects/swe-bench.md) and [HumanEval](../projects/humaneval.md) show competitive but not uniformly superior performance versus Claude 3.5/3.7 Sonnet and GPT-4o.

## Strengths

**Large context, free entry.** For developers who want to load a full codebase into context without chunking, retrieval pipelines, or embedding infrastructure, the 1M-token window plus free tier is a meaningful advantage. RAG adds latency and retrieval errors; direct context loading avoids both.

**SKILL.md ecosystem.** Because Gemini CLI implements the same skill standard as Claude Code and OpenCode, the growing ecosystem of community skills (gstack's 23+ skills, the 248-skill claude-skills registry, obsidian-skills, etc.) all work without modification. A skill authored once deploys everywhere.

**Terminal-native.** Gemini CLI runs in any environment where a terminal runs — containers, CI/CD pipelines, SSH sessions, remote servers. No GUI, no IDE extension, no local desktop app requirement. The [Zimmer agentic researcher framework](../projects/autoresearch.md) explicitly supports Gemini CLI alongside Claude Code and Codex CLI for autonomous research sessions, treating all three as equivalent runtimes.

**MCP extensibility.** The Model Context Protocol integration means any MCP server (databases, APIs, file systems, custom tools) can extend what Gemini CLI can do without modifying the CLI itself.

## Critical Limitations

**Concrete failure mode: context window doesn't eliminate hallucination.** A common assumption is that loading everything into a 1M-token context eliminates the retrieval-miss failure mode of RAG. It reduces it but does not eliminate it. With very large contexts, Gemini models show the [Lost in the Middle](../concepts/lost-in-the-middle.md) degradation pattern — information in the middle of a long context is less reliably attended to than information at the beginning or end. For a 200-file codebase loaded flat into context, critical files near the middle of the token sequence may effectively be ignored. Projects using Gemini CLI for large-codebase tasks should structure GEMINI.md to put the most critical context at the start and end.

**Unspoken infrastructure assumption: Google authentication.** Gemini CLI assumes access to the Google ecosystem — a Google account, Google AI Studio API key or Google Cloud project with Vertex AI. For teams in environments with strict data residency requirements, organizations that block Google services, or users without Google accounts, this is a blocking dependency. Claude Code routes through Anthropic's API; OpenCode supports arbitrary backends via LiteLLM. Gemini CLI's primary path runs through Google infrastructure.

## When NOT to Use It

**Don't use Gemini CLI when the deployment environment blocks Google services.** Government, defense, and regulated enterprise environments often have network policies that prevent calls to external Google APIs. In these contexts, a self-hostable backend (Ollama, vLLM, or OpenCode with a local model) is the correct choice.

**Don't use Gemini CLI as your primary agent when you need model flexibility.** Gemini CLI is designed for Gemini models. If your workflow requires comparing outputs across providers, using different models for different tasks, or switching to a non-Google model when Gemini underperforms on a specific task, OpenCode with LiteLLM routing or a framework-based approach gives more flexibility.

**Don't rely on the free tier for production automation.** The Google AI Studio free tier has rate limits that can interrupt long agentic sessions. The Zimmer research framework notes that 20+ hour autonomous sessions can exhaust context and hit API limits — for production pipelines, a paid API key with billing controls is necessary.

**Don't use it as a substitute for a proper memory system on long-running tasks.** The large context window handles single-session breadth but not cross-session persistence. For agents that need to remember decisions, preferences, or state across many sessions, a dedicated memory layer ([Mem0](../projects/mem0.md), [Letta](../projects/letta.md), or Memoria's Git-versioned memory) is required. GEMINI.md provides static context, not dynamic memory.

## Relationship to Agent Skills Ecosystem

Gemini CLI's adoption of the SKILL.md standard is its most strategically significant architectural decision. The [Agent Skills](../concepts/agent-skills.md) specification, which Anthropic published and multiple platforms converged on, defines a portable skill format with YAML frontmatter triggers, progressive disclosure via `references/` subdirectories, and marketplace distribution. Because Gemini CLI implements this standard:

- gstack's role-based skills (CEO, designer, QA, security) deploy to Gemini CLI without modification
- The 248-skill claude-skills registry works via `./scripts/gemini-install.sh`
- Obsidian-skills' format documentation skills load in Gemini CLI sessions
- The INSTRUCTIONS.md pattern from the agentic researcher framework ports directly

This convergence on a shared skill standard means Gemini CLI is not just a Google-specific tool but a participant in a cross-vendor capability ecosystem. Skills authored for Claude Code work in Gemini CLI; skills authored for Gemini CLI work in Claude Code.

## Unresolved Questions

**Conflict resolution between GEMINI.md instructions and skill instructions.** When a project's GEMINI.md specifies behavioral rules that conflict with a loaded skill's instructions, the resolution order is not clearly documented. Claude Code has an explicit hierarchy (user memory > project memory > global memory); Gemini CLI's documentation does not specify equivalent precedence rules.

**Cost at scale for the 1M-token window.** Gemini CLI's free tier makes individual developer use accessible, but the economics of running 1M-token contexts in production automation are not transparent. At Gemini 1.5 Pro pricing, a single 1M-token context load costs meaningfully more than a typical RAG-augmented interaction. For teams running many parallel agentic sessions (the 10-15 parallel sprint pattern from gstack), the cost arithmetic at full context window usage is material and not prominently disclosed.

**Multi-agent coordination primitives.** Gemini CLI supports individual agentic sessions but has no native orchestration layer for spawning subagents, coordinating parallel sessions, or aggregating results across concurrent runs. Workarounds exist (running multiple Gemini CLI instances in separate terminal sessions or via tools like Conductor), but there is no official multi-agent coordination pattern equivalent to Claude Code's subagent spawning.

**Memory persistence.** GEMINI.md provides static context injection but no mechanism for the agent to write durable facts back to memory across sessions. A user who wants Gemini CLI to remember project decisions, debugging findings, or preferences must manually update GEMINI.md. Tools like Memoria add this capability via MCP, but it requires external setup.

## Alternatives

**Use [Claude Code](../projects/claude-code.md) when** you need the strongest coding benchmark performance on [SWE-bench](../projects/swe-bench.md), you want tightly integrated computer use, or your organization is standardized on Anthropic's API.

**Use [OpenAI Codex](../projects/codex.md) when** you need OpenAI model access from the terminal and want the reference implementation from OpenAI's own CLI tooling.

**Use [OpenCode](../projects/opencode.md) when** you need backend flexibility (any LLM provider via LiteLLM), want a fully open-source implementation with no vendor lock-in, or need to self-host the entire stack.

**Use [Cursor](../projects/cursor.md) or [Windsurf](../projects/windsurf.md) when** your workflow is IDE-centric and you want deep editor integration, inline suggestions, and visual diff review — Gemini CLI has no GUI.

**Use Gemini CLI when** you want the largest free-tier context window, you're working in terminal-only environments, you want to load full repositories into context without a retrieval pipeline, or you're building on the SKILL.md ecosystem and want Google model access as one of several interchangeable agent runtimes.

## Related

- [Agent Skills](../concepts/agent-skills.md) — the SKILL.md standard Gemini CLI implements
- [Claude Code](../projects/claude-code.md) — primary competitor; same skill format
- [OpenCode](../projects/opencode.md) — open-source alternative with LiteLLM backend flexibility
- [Model Context Protocol](../concepts/model-context-protocol.md) — Gemini CLI's extension mechanism
- [Context Management](../concepts/context-management.md) — relevant for understanding 1M-token context tradeoffs
- [CLAUDE.md](../concepts/claude-md.md) — the Claude equivalent of GEMINI.md
