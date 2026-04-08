---
entity_id: cursor
type: project
bucket: agent-architecture
abstract: >-
  AI code editor built on VS Code that embeds LLM-powered editing, codebase-wide
  context retrieval, and agentic task execution directly in the IDE;
  differentiates via native multi-file context assembly and Cursor Tab
  autocomplete.
sources:
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/tirth8205-code-review-graph.md
  - repos/affaan-m-everything-claude-code.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/jmilinovich-goal-md.md
  - repos/matrixorigin-memoria.md
  - repos/memorilabs-memori.md
  - repos/supermemoryai-supermemory.md
  - repos/tirth8205-code-review-graph.md
  - repos/yusufkaraaslan-skill-seekers.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
related:
  - claude-code
  - windsurf
  - codex
  - model-context-protocol
  - andrej-karpathy
  - openclaw
  - claude
  - agent-skills
  - context-engineering
  - knowledge-graph
  - opencode
  - gemini-cli
  - claude-md
  - langchain
  - agent-memory
  - github-copilot
  - hybrid-search
  - gstack
  - garry-tan
  - chatgpt
  - token-efficiency
  - anthropic
  - autoresearch
  - gemini
  - multi-agent-systems
  - tree-sitter
  - antigravity
last_compiled: '2026-04-08T22:54:17.045Z'
---
# Cursor

## What It Does

Cursor is an AI-native code editor built as a fork of VS Code. Every editing surface, from autocomplete to inline diffs to terminal commands, routes through LLM backends. Users switch between [Claude](../projects/claude.md), [GPT-4o](../projects/gpt-4o.md), and [Gemini](../projects/gemini.md) without leaving the editor. The commercial bet is that deep IDE integration beats bolt-on plugins: Cursor assembles codebase context at the source rather than asking the model to guess.

Cursor launched in 2023 from Anysphere, a startup backed by [Garry Tan](../projects/gstack.md)'s Y Combinator and others. It competes directly with [GitHub Copilot](../projects/github-copilot.md), [Claude Code](../projects/claude-code.md), [Windsurf](../projects/windsurf.md), [Gemini CLI](../projects/gemini-cli.md), and [OpenCode](../projects/opencode.md).

## Architecture

### Core Components

**Cursor Tab** is the primary autocomplete engine. It predicts multi-line completions, not just single tokens, by passing recent edits and surrounding context through a fine-tuned model. The diff-based rendering shows proposed changes inline before the user accepts.

**Composer / Agent mode** handles multi-file tasks. The user describes a goal; Cursor breaks it into file reads, edits, and terminal commands, executing them in sequence. This maps to standard [ReAct](../concepts/react.md) loop mechanics: tool call, observe, next tool call. Human-approval checkpoints before destructive operations implement a basic [Human-in-the-Loop](../concepts/human-in-the-loop.md) pattern.

**Context assembly** is where Cursor's VS Code fork pays off. The editor has live access to:
- Open files and recent edit history
- File tree and directory structure parsed via [Tree-sitter](../projects/tree-sitter.md) for symbol extraction
- `@codebase` retrieval using embeddings over the full repo
- `@docs`, `@web`, and `@git` context fetchers
- Manually pinned files and symbols via `@` references

Context gets assembled before each model call, not retrieved on demand from an external service. This reduces round-trip latency and lets the editor apply project-specific heuristics (recently edited files weight higher).

**[CLAUDE.md](../concepts/claude-md.md) and `.cursorrules`** are the agent instruction layer. Cursor reads `.cursorrules` files from the project root, equivalent to CLAUDE.md for Claude Code, injecting standing instructions about style, architecture, and workflow into every request context. This is [Context Engineering](../concepts/context-engineering.md) at the file level: rules persist across sessions without the user re-explaining them.

**[Model Context Protocol](../concepts/model-context-protocol.md) integration** allows external tools (databases, APIs, custom data sources) to inject context via standardized MCP servers. Cursor functions as an MCP host, enabling the same server a Claude Code user writes to work in Cursor with minimal changes.

### Context Retrieval

Codebase search uses [Hybrid Search](../concepts/hybrid-search.md): semantic embeddings identify conceptually related files; keyword matching catches exact symbol names. Results merge via a ranking step before entering the context window. Cursor indexes codebases locally, avoiding round-trips to external vector databases for most queries.

For large repos, Cursor applies [Context Compression](../concepts/context-compression.md): file summaries replace full file content when the direct content would exceed the model's practical working range. [Token Efficiency](../concepts/token-efficiency.md) concerns drive this directly, since billing correlates with token consumption.

### Agent Skills and Multi-Agent Patterns

Cursor supports [Agent Skills](../concepts/agent-skills.md) via the SKILL.md format (compatible with the Agent Skills specification), meaning skill libraries like [gstack](../projects/gstack.md)'s 23-skill sprint pipeline or the [Everything Claude Code](../projects/antigravity.md) collection's Cursor-specific `.cursor/` directory work without modification. GStack's multi-host support explicitly targets Cursor alongside Claude Code and OpenCode.

For [Multi-Agent Systems](../concepts/multi-agent-systems.md) workflows, Cursor participates as one agent in a broader setup: users run multiple Cursor instances in parallel on different tasks, coordinate via shared branches, and hand off context through commit messages or shared files. There is no native orchestration layer; parallelism is manual.

## Key Numbers

**Claimed**: Anysphere reported $100M ARR in late 2024, ~$500M ARR by early 2025. Raised at a $9B valuation in 2025. User base numbers not publicly disclosed.

**Benchmarks**: Cursor does not publish standardized coding benchmark scores for its proprietary autocomplete model. Agent-mode performance depends heavily on which underlying model the user selects. SWE-bench scores for underlying models (Claude, GPT-4o) apply indirectly but are not Cursor-specific. All financial and growth figures are self-reported or from journalist interviews with founders; no independent audit.

## Strengths

**Tight VS Code integration** means Cursor inherits the full extension ecosystem (debuggers, linters, Git tooling) while adding AI capabilities. Users who already live in VS Code face near-zero migration cost.

**Model flexibility** lets teams adopt whatever performs best for their stack. A team running Python backend with TypeScript frontend can route Python questions to Claude (strong on reasoning), TypeScript to GPT-4o, without switching tools.

**Context assembly quality** is above the plugin baseline. Because Cursor controls the editor, it can assemble context from open files, recent edits, and codebase search simultaneously rather than relying on whatever a plugin API exposes.

**Ecosystem compatibility** with SKILL.md, MCP, and `.cursorrules` means Cursor benefits from tooling built for other agents. A developer who uses gstack skills on Claude Code can port the Cursor-specific adapter (`/.cursor/` directory) from the existing cross-platform skill libraries.

## Critical Limitations

**Concrete failure mode: context coherence at scale.** On monorepos exceeding ~50K files, codebase indexing becomes unreliable. The `@codebase` retrieval returns plausible-sounding but wrong file references for cross-module dependencies. Structural graph tools like [code-review-graph](../projects/tree-sitter.md) exist precisely because embedding-based retrieval misses import chains and blast radius. Cursor does not build an explicit dependency graph; it retrieves by similarity, which breaks for structural queries ("what calls this function from outside the module?").

**Unspoken infrastructure assumption**: Cursor requires persistent local indexing. On ephemeral CI environments, remote development containers, or shared cloud workstations, the index does not persist across sessions. Agent mode performance degrades to the baseline model quality without local context augmentation. Teams relying on cloud-based dev environments (GitHub Codespaces, Gitpod) get a substantially worse experience than the marketing implies.

## When NOT to Use Cursor

- **Terminal-first or headless workflows.** If your team uses SSH into remote servers and you want AI help without a GUI, [Claude Code](../projects/claude-code.md) or [OpenCode](../projects/opencode.md) fit better.
- **Strict data residency requirements.** Cursor sends code to model provider APIs. Even with enterprise agreements, code leaves the local machine. For air-gapped or regulated environments, a self-hosted solution with local models via [Ollama](../projects/ollama.md) or [vLLM](../projects/vllm.md) is the correct path.
- **Teams that need reproducible, audited agent runs.** Cursor's agent mode does not produce execution traces suitable for audit. If you need to replay exactly what the agent did on a production incident, or require [Observability](../concepts/observability.md) over agent actions, a framework like [LangGraph](../projects/langgraph.md) with explicit tracing is more appropriate.
- **Cost-sensitive high-volume usage.** Cursor's subscription pricing covers a token budget. Teams generating large volumes of agent requests (CI integration, batch processing) quickly exceed the quota and pay per-token rates on top. Purpose-built pipelines with direct API access are cheaper at scale.

## Unresolved Questions

**Conflict resolution in agent mode.** Cursor's agent will overwrite files. When agent mode runs on a branch that has concurrent changes from teammates, merge conflict resolution is undefined. The documentation does not specify what happens when a tool-use edit conflicts with a remote change mid-session.

**Index freshness guarantees.** There is no published specification for how quickly the codebase index reflects file changes. For fast-moving monorepos, the index may lag by minutes, causing agent mode to make decisions based on stale symbol data.

**Cost at scale.** Enterprise pricing is not public. The token costs for agent-mode sessions, particularly with large context windows and multi-model routing, accumulate quickly and the per-seat pricing does not obviously cover unbounded API usage.

**Model routing logic.** When a user enables multiple models, Cursor does not publish how it selects which model for which request type. The routing is opaque, making it difficult to predict cost or performance for a given workflow.

## Alternatives

| Scenario | Use Instead |
|---|---|
| Terminal-first developer, Linux/SSH workflow | [Claude Code](../projects/claude-code.md) or [OpenCode](../projects/opencode.md) |
| Need full process discipline (plan, review, test, ship pipeline) | [gstack](../projects/gstack.md) on Claude Code |
| Already in JetBrains IDE | [GitHub Copilot](../projects/github-copilot.md) with JetBrains plugin |
| Require local model, no cloud API calls | [Continue](https://continue.dev/) with Ollama backend |
| Need auditable agent execution traces | [LangGraph](../projects/langgraph.md) or [OpenAI Agents SDK](../projects/openai-agents-sdk.md) |
| Browser/web agent tasks, not code editing | Separate agentic tool entirely |
| Cost-critical batch processing of code changes | Direct API calls with [LiteLLM](../projects/litellm.md) routing |

[Windsurf](../projects/windsurf.md) is the closest direct competitor: also a VS Code fork, similar feature surface, acquired by OpenAI in 2025. Windsurf's Cascade feature attempts deeper multi-file reasoning; Cursor's Tab autocomplete is more polished for line-by-line editing. Choice between them reduces to model preference and UI feel rather than architectural difference.

[GitHub Copilot](../projects/github-copilot.md) remains dominant by install count due to its VS Code extension distribution. It does not require switching editors, which lowers the adoption barrier for teams already standardized on VS Code. Cursor wins on context assembly quality and agent capabilities; Copilot wins on zero switching cost and enterprise procurement familiarity.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): Cursor implements context assembly as a core competency
- [Agent Memory](../concepts/agent-memory.md): `.cursorrules` as persistent procedural memory across sessions
- [Token Efficiency](../concepts/token-efficiency.md): Context compression and selective file inclusion manage model costs
- [Multi-Agent Systems](../concepts/multi-agent-systems.md): Cursor participates in multi-agent workflows as one node among several parallel sessions
- [CLAUDE.md](../concepts/claude-md.md): Analogous pattern for standing project instructions
- [Model Context Protocol](../concepts/model-context-protocol.md): Cursor implements MCP as a host for external tool integration
- [Tree-sitter](../projects/tree-sitter.md): Used for symbol extraction and structural code parsing within the editor
