---
entity_id: cursor
type: project
bucket: agent-systems
abstract: >-
  Cursor is an AI-first code editor (VS Code fork) that embeds LLMs directly
  into the editing workflow for autocomplete, chat, and autonomous multi-file
  editing. Differentiator: tighter model integration and agentic editing than VS
  Code extensions like GitHub Copilot.
sources:
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/aiming-lab-simplemem.md
  - repos/affaan-m-everything-claude-code.md
  - repos/natebjones-projects-ob1.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/jmilinovich-goal-md.md
  - repos/caviraoss-openmemory.md
  - repos/tirth8205-code-review-graph.md
  - repos/yusufkaraaslan-skill-seekers.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/repos/kepano-obsidian-skills.md
related:
  - claude-code
  - mcp
  - windsurf
  - openai-codex
  - gemini
  - andrej-karpathy
  - claude
  - anthropic
  - rag
  - openai
  - autoresearch
  - langchain
  - knowledge-graph
  - skill-md
  - self-improving-agents
last_compiled: '2026-04-06T01:58:07.025Z'
---
# Cursor

## What It Is

Cursor is a code editor built as a hard fork of VS Code that ships LLM capabilities as first-class editor features rather than extensions. Founded in 2022 by Anysphere (Michael Terrell, Sualeh Asif, Arvid Lunnemark, Aman Sanger), it reached broad adoption in 2024-2025 as AI coding tools moved from novelty to daily workflow. The editor runs all VS Code extensions natively, so switching from VS Code costs little beyond learning Cursor's AI features.

The core proposition: rather than piping code to a chat sidebar as text, Cursor maintains a persistent model of your codebase and integrates generation, editing, and agentic task execution directly into the buffer. The editor knows which file you are in, what symbols are in scope, and what changed recently without you describing any of that.

## Architecture

Cursor's architecture sits in three layers:

**Editor layer**: The VS Code fork provides the development environment. Cursor patches the extension host and adds proprietary UI surfaces: an inline edit panel (Cmd+K), a chat sidebar, and the Agent panel. The fork diverges minimally from upstream VS Code, allowing VS Code extensions to run unmodified.

**Context layer**: Cursor maintains a codebase index using [Retrieval-Augmented Generation](../concepts/rag.md) over your local repository. At index time, it chunks source files and builds vector embeddings for semantic search. At query time, it retrieves relevant chunks to populate model context. This index is what enables `@codebase` queries that find relevant code across thousands of files without the user specifying file paths. The indexing runs locally with embeddings sent to Cursor's servers.

**Model layer**: Cursor calls frontier models (Claude 3.5/3.7 Sonnet, GPT-4o, and others) via its own API proxy. Users can also configure Cursor to hit their own API keys or use local models via Ollama. The model choice is configurable per-request. Cursor has published proprietary fine-tuned models (cursor-small, earlier tab completion models) trained on code editing tasks, though frontier models handle most chat and agent work.

**Agent mode** (Cursor's most differentiated feature): The agent can read and write arbitrary files, run shell commands, search the web, and call tools in a loop. It receives a task description and autonomously plans and executes multi-step edits across the codebase. This is closer to what [Claude Code](../projects/claude-code.md) does in a terminal than what a standard Copilot autocomplete does. The agent mode implements a [ReAct](../concepts/react.md)-style loop: reason about the task, select a tool, observe the result, repeat.

**MCP support**: Cursor implements [Model Context Protocol](../concepts/mcp.md), allowing external tools (databases, APIs, internal services) to expose capabilities the model can call during agent tasks. This extensibility means teams can wire their own infrastructure into Cursor's agent loop.

**Rules and skill files**: Cursor supports `.cursor/rules/` directories and SKILL.md files compatible with the emerging [Agent Skills](../concepts/agent-skills.md) standard. Projects like Everything Claude Code include explicit Cursor integration via `.cursor/hooks.json`, 20+ event hooks, and per-language rule files that mirror Claude Code's rule structure. Cursor's rules system is less mature than Claude Code's hook system but covers the common case of injecting persistent instructions into context.

## Key Numbers

- **$20/month** (Pro tier) for 500 fast premium requests per month; additional fast requests available at per-request pricing. Unlimited slow premium requests and cursor-small requests included.
- **Reported ARR**: ~$100M as of late 2024, ~$200-400M by mid-2025 (multiple press reports). *Self-reported or investor-cited, not independently audited.*
- **[SWE-Bench](../projects/swe-bench.md) performance**: Cursor's agent mode using Claude 3.7 Sonnet achieves competitive scores on SWE-Bench Verified, though Cursor itself has not published a canonical benchmark number. Third-party evaluations place it in the same tier as Claude Code on standard software engineering tasks. *Independent assessments, methodology varies.*
- **GitHub stars (Cursor-related tooling)**: Not applicable — Cursor is closed-source. Community ecosystems like Everything Claude Code explicitly add `.cursor/` integration as a supported platform.

## Strengths

**VS Code compatibility**: Every VS Code extension works. Teams already invested in VS Code's ecosystem (language servers, debuggers, test runners, theme libraries) face near-zero migration cost for the editor itself.

**Inline editing with context**: Cmd+K opens an inline prompt that understands the surrounding code without copy-pasting. The model sees the file, the selection, and relevant codebase context automatically. For quick edits this beats switching to a chat window.

**Codebase-aware retrieval**: The `@codebase` and `@file` references let the model answer questions about code spread across many files. The retrieval quality is generally good on well-structured codebases; it degrades on very large monorepos or codebases with poor naming conventions.

**Agent task execution**: Multi-step tasks (add a feature, refactor a module, fix a failing test) run autonomously with the agent reading files, making edits, running tests, and iterating. This is the feature that separates Cursor from Copilot-style autocomplete tools.

**Model flexibility**: Users can bring their own API keys for Anthropic, OpenAI, or Azure OpenAI. Local models via [Ollama](../projects/ollama.md) are supported for completions. Teams with data residency requirements can route to their own deployments.

## Limitations

**Concrete failure mode — large monorepos**: Cursor's codebase index uses embedding-based retrieval over chunked files. On large monorepos (50K+ files, multiple languages, complex cross-package dependencies), retrieval precision drops because the vector index cannot capture structural relationships between files. The agent will miss relevant files, especially for tasks that span module boundaries or require understanding the call graph. Tools like code-review-graph (which builds a Tree-sitter AST graph and computes blast radius via BFS) exist specifically to address this gap — Cursor's retrieval does not do structural analysis.

**Unspoken infrastructure assumption**: Cursor indexes your code on its servers (or via its API proxy). The privacy model is that code is not used for training by default and is deleted after a period, but code does leave your machine. Teams in regulated industries (healthcare, finance, government) or with IP-sensitive codebases need to verify this is acceptable or use the Business tier with privacy mode, which has different guarantees. This is rarely surfaced prominently in adoption discussions.

**Context window economics at agent scale**: Agent tasks that touch many files quickly saturate context. Cursor does not expose explicit context window management controls to users. When the agent's working context fills, it truncates or summarizes — and the truncation behavior is not transparent. Users discover this when the agent "forgets" earlier work in a long task.

**Hook system maturity gap**: Cursor's `.cursor/hooks.json` supports 20+ event types, but the hook runtime is less capable than Claude Code's. Hooks that work in Claude Code's PreToolUse/PostToolUse system may need to be downgraded to advisory prose for Cursor. Cross-platform skill collections like Everything Claude Code explicitly note this asymmetry.

## When NOT to Use Cursor

**Terminal-first workflows**: Developers who live in the terminal, use tmux heavily, or prefer Neovim/Emacs will find Cursor's GUI overhead an impediment. [Claude Code](../projects/claude-code.md) runs in the terminal, integrates with existing shell workflows, and supports the same agentic multi-file editing without requiring a GUI editor.

**Air-gapped or strict data-residency environments**: Cursor's inference runs through its servers by default. Even with Business tier privacy mode, the architecture assumes outbound API calls. Fully air-gapped environments need Claude Code with a local model or a self-hosted alternative.

**Teams needing reproducible, auditable agent workflows**: Cursor's agent operates interactively. For CI/CD integration, scheduled autonomous agents, or workflows requiring full audit logs of every action, a programmatic agent framework ([LangGraph](../projects/langgraph.md), [CrewAI](../projects/crewai.md)) or Claude Code's headless mode is more appropriate.

**Projects requiring deep structural code analysis**: If the core need is impact analysis, dependency graph reasoning, or architecture-aware refactoring at scale, Cursor's embedding-based retrieval is insufficient. Pair it with a structural analysis tool or use a system that builds explicit call graphs.

## Unresolved Questions

**Pricing at team scale**: The per-seat pricing is clear for individuals, but the cost model for large engineering teams doing heavy agent use (hundreds of API calls per developer per day) is less transparent. Fast request limits and overage pricing can make costs unpredictable.

**Index freshness and conflict resolution**: When multiple developers edit the same codebase simultaneously, how does Cursor's index stay current? The documentation does not explain index invalidation strategies or how stale context affects agent behavior.

**Fine-tuned model quality**: Cursor ships cursor-small and has trained other proprietary models, but there is no public evaluation of these models against benchmarks. Users cannot assess whether cursor-small is better or worse than a frontier model for specific task types.

**Data retention under Business tier**: The privacy mode documentation states code is not used for training and is deleted, but retention periods, deletion verification, and subprocessor access are not publicly detailed.

## Alternatives and Selection Guidance

**Use [Claude Code](../projects/claude-code.md) when** you prefer terminal-based workflows, need headless/CI integration, or want tighter control over tool permissions and hook behavior. Claude Code's hook system is more capable; its agent loop is more auditable.

**Use [Windsurf](../projects/windsurf.md) when** you want a comparable GUI AI editor with different model defaults or find Cursor's pricing unfavorable. Windsurf and Cursor are functionally similar for most coding tasks.

**Use GitHub Copilot when** your organization is already standardized on VS Code with Copilot Enterprise and does not need agentic multi-file editing — Copilot is simpler, cheaper, and the Enterprise tier includes IP indemnification that Cursor lacks.

**Use a framework ([LangGraph](../projects/langgraph.md), [CrewAI](../projects/crewai.md)) when** you need to build custom agent workflows rather than use a pre-built coding assistant. These are different tools for different problems.

**Use Cursor with structural analysis tooling** (like code-review-graph or similar) when working on large codebases where embedding retrieval alone is insufficient for precise context delivery.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md): Cursor's codebase index is a RAG system over source files
- [Model Context Protocol](../concepts/mcp.md): Cursor implements MCP for external tool integration
- [Agent Skills](../concepts/agent-skills.md): `.cursor/rules/` and SKILL.md files extend Cursor's behavior
- [Context Engineering](../concepts/context-engineering.md): Managing what goes into Cursor's context window is the key operational skill for power users
- [skill.md](../concepts/skill-md.md): The emerging standard Cursor is converging toward for rule and skill definitions
