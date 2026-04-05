---
entity_id: cursor
type: project
bucket: agent-systems
abstract: >-
  AI-powered code editor forked from VS Code that embeds LLM assistance at the
  editor level — tab completion, inline edits, multi-file chat, and agentic code
  runs — distinguishing itself from plugin-based tools through deep IDE
  integration and a proprietary retrieval layer.
sources:
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/aiming-lab-simplemem.md
  - repos/affaan-m-everything-claude-code.md
  - repos/supermemoryai-supermemory.md
  - repos/memorilabs-memori.md
  - repos/natebjones-projects-ob1.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/caviraoss-openmemory.md
  - repos/jmilinovich-goal-md.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/tirth8205-code-review-graph.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/repos/kepano-obsidian-skills.md
related:
  - Claude Code
  - Anthropic
  - OpenAI
  - Claude
  - Andrej Karpathy
  - Retrieval-Augmented Generation
  - Windsurf
  - Model Context Protocol
  - OpenAI Codex
  - Google Gemini
  - OpenClaw
  - OpenCode
  - LangChain
  - Agent Skills
  - skill.md
  - Procedural Memory
  - GitHub Copilot
  - A-MEM
  - AutoResearch
last_compiled: '2026-04-05T20:21:45.168Z'
---
# Cursor

## What It Is

Cursor is a code editor built by Anysphere as a fork of VS Code. It adds LLM-powered features at the application layer rather than through an extension: tab completion that predicts multi-line edits, inline diff generation triggered by natural language instructions, a chat panel with codebase-aware retrieval, and an agentic mode ("Agent") that can read files, run terminal commands, and iterate on code autonomously.

The key differentiator from GitHub Copilot, Windsurf, and similar tools is that Cursor ships its own editor binary rather than distributing an IDE plugin. This lets the team control the full rendering pipeline, keybindings, diff views, and context retrieval without operating inside extension API constraints. The cost is that VS Code extensions mostly still work, but Cursor-specific features cannot be redistributed as a Copilot-style plugin.

Cursor reached roughly 500,000 monthly active users and $100M ARR by late 2024 (self-reported by Anysphere), faster than any developer tools company in history by that metric. The $2.5B valuation in its January 2025 funding round was independently reported by Bloomberg and WSJ, so the headline number has external verification, though the underlying ARR figure remains self-reported.

## Architecture

### The Retrieval Layer

Cursor's most architecturally distinctive component is its codebase indexing and retrieval system, marketed as "codebase context." When you open a project, Cursor indexes the repository using a combination of embedding-based semantic search and tree-sitter AST parsing, storing vectors in a local index. When you invoke chat or Agent mode, it runs retrieval against this index to pull relevant file chunks into the context window rather than sending the entire codebase.

This is essentially a proprietary [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) implementation tuned for code. The index updates incrementally as files change. Cursor sends embedding computation to Anysphere's servers by default (with an option for local processing), which means your code leaves your machine for indexing unless you configure otherwise. This is the primary infrastructure assumption that enterprise users consistently underestimate.

The retrieval quality determines how well the multi-file chat features work. For well-structured codebases with clear module boundaries, the retrieval tends to surface relevant files. For monorepos with complex cross-cutting concerns, the system often misses implicit dependencies that a developer would know to include manually. The `@codebase` symbol in chat triggers a broader retrieval sweep; individual `@file` and `@symbol` references allow precise manual scoping.

### Agent Mode

Agent mode (previously called "Composer" in earlier versions) lets Cursor autonomously perform multi-step tasks: reading files, editing code, running terminal commands, and iterating based on output. The agent loop runs on the configured model (Claude, GPT-4o, Gemini, or Cursor's own fine-tuned models) and uses [Model Context Protocol](../concepts/model-context-protocol.md) for tool integration.

Agent mode integrates with the broader skill ecosystem. Tools like [Everything Claude Code](../projects/everything-claude-code.md) maintain `.cursor/` directories with `hooks.json`, rules, and skill files adapted for Cursor's agent runtime. The `hooks.json` format supports 15+ event types, fewer than Claude Code's native support but sufficient for pre/post tool-use automation.

Cursor's agent runs inside the editor process, which means it has direct access to file watchers, terminal panes, and the diff renderer. This is the concrete advantage of the forked-editor approach: agent edits show as inline diffs that the user can accept or reject with keyboard shortcuts, integrated into the normal editing flow rather than appearing in a separate chat interface.

### Tab Completion

Tab completion ("Cursor Tab") is a fine-tuned model that predicts the next edit given cursor position and recent edit history. Unlike Copilot's ghost text (which suggests new code), Cursor Tab also suggests modifications to existing code based on inferred intent from prior edits in the session. Anysphere claims this is trained on patterns of edit sequences rather than just next-token prediction from static code, though the training methodology is not publicly documented.

### Model Routing

Cursor supports multiple model backends and routes requests based on feature and configuration:
- Claude 3.5 Sonnet / Claude 3.7 Sonnet (Anthropic)
- GPT-4o / o1 / o3 (OpenAI)
- Gemini 1.5 Pro / 2.0 Flash (Google)
- Cursor's own fine-tuned models for tab completion

Premium plans include "fast" requests (priority queuing on large models) and "slow" requests (standard queuing). The model selection UI is per-feature, so you can use Sonnet for agent runs and a faster model for tab completion.

Cursor also supports the [Model Context Protocol](../concepts/model-context-protocol.md), meaning MCP servers providing database access, browser control, or custom tools can plug into the agent runtime directly.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| Monthly active users | ~500K | Self-reported (late 2024) |
| ARR | ~$100M | Self-reported (late 2024) |
| Valuation | $2.5B | Bloomberg/WSJ (Jan 2025) — independently verified |
| GitHub stars (cursor-history repos/forks) | N/A — closed source | — |

The product itself is closed source. Most benchmark comparisons (e.g., SWE-bench task completion) are run by the underlying model providers, not Cursor-specific. Cursor's competitive claims about retrieval quality and tab completion accuracy are self-reported without independent reproduction.

## Strengths

**VS Code compatibility.** Most VS Code extensions work without modification. Teams already using VS Code can adopt Cursor with minimal workflow disruption.

**Agentic multi-file editing.** The diff-in-editor rendering for agent changes is meaningfully better than the "apply to file" flow in chat-only tools. Reviewing, accepting, and rejecting individual changes from an agent run is fast.

**Configurable context scoping.** The `@` symbol system for attaching files, symbols, docs, and web results to prompts gives precise control over what enters the context window. This reduces retrieval noise for queries where the relevant files are already known.

**Active third-party skill ecosystem.** The `.cursor/` directory convention is supported by major skill collections like [Everything Claude Code](../projects/everything-claude-code.md), which maintains Cursor-specific hooks, rules, and skill files alongside its primary Claude Code support.

**Rules persistence.** Cursor rules (`.cursor/rules/` or `.cursorrules`) persist across sessions and scope context deterministically, solving the "agent forgets project conventions" problem.

## Critical Limitations

**Concrete failure mode — retrieval misses on implicit dependencies.** Cursor's vector-based retrieval finds files semantically similar to the query. It does not perform full call-graph analysis. If a change in module A implicitly affects behavior in module C through a shared mutable singleton in module B, and module B doesn't appear in the semantic neighborhood of the query, the retrieval will miss it. Tools like [code-review-graph](../projects/code-review-graph.md) solve this with blast-radius BFS on an explicit dependency graph; Cursor's retrieval has no equivalent. The failure is silent — the model produces confident, incorrect code because it was missing context it didn't know to ask for.

**Unspoken infrastructure assumption — code leaves the machine.** By default, Cursor sends file contents to Anysphere's servers for embedding computation, sends prompts and code snippets to model providers (Anthropic, OpenAI, Google) for inference, and stores project metadata in Anysphere's indexing infrastructure. The "Privacy Mode" option disables training data use but does not keep code local — requests still route through Anysphere's proxy. Teams working under SOC 2, HIPAA, or strict IP confidentiality requirements need to audit the data flow carefully. The "local" option for embedding is available but requires additional configuration and is not the default.

## When NOT to Use Cursor

**Regulated environments where code must stay on-premises.** Cursor's architecture requires external network calls for core functionality. If your security policy prohibits sending source code to third-party servers, Cursor's defaults violate that policy and the workarounds are incomplete.

**Teams needing verifiable agent behavior audit trails.** Cursor's agent runs are visible in the editor session but are not logged to a persistent, queryable audit log. If you need to reconstruct what an agent did and why for compliance or debugging, the session history is insufficient.

**Projects requiring tree-sitter-level structural analysis as context.** For multi-file refactors on large codebases where the correctness of changes depends on blast-radius accuracy, Cursor's retrieval is not a substitute for structural dependency analysis. Consider pairing with a tool like code-review-graph via MCP, or using an agent that performs explicit `git diff` analysis before editing.

**Developers who prefer the standard VS Code extension model.** If your team has invested in VS Code extension automation, custom task runners, or devcontainer configurations that interact with the editor process, Cursor's fork introduces a maintenance surface: Cursor updates can lag behind VS Code releases, and some extensions expose APIs that behave slightly differently in the fork.

## Unresolved Questions

**Retrieval quality on private codebases at scale.** Anysphere publishes no benchmarks for retrieval precision/recall on large private codebases. The performance on public repos used in demos may not generalize to sprawling enterprise monorepos with 50K+ files, circular dependencies, and inconsistent naming.

**Model routing and cost at scale.** The "fast" vs. "slow" request distinction on the Pro plan is opaque. There is no documented SLA for fast request latency, no clear explanation of how requests get prioritized across users, and no per-request cost breakdown. Teams running heavy agent workloads cannot easily predict monthly spend.

**Conflict resolution between rules and model behavior.** When a `.cursor/rules/` file instructs the agent to follow a specific pattern and the model's training strongly suggests a different approach, the outcome is non-deterministic. There is no documented priority system for rule enforcement vs. model judgment.

**Governance of the retrieval index.** What happens to your embedded code vectors if you cancel a subscription? The privacy policy governs training data use but is less explicit about vector retention timelines for cancelled accounts.

## Alternatives

| Tool | Use when |
|------|----------|
| [GitHub Copilot](../projects/github-copilot.md) | Your team is already on GitHub Enterprise and needs IT-approved, Microsoft-contracted data handling. Plugin model limits agentic depth but simplifies procurement. |
| [Windsurf](../projects/windsurf.md) | You want an agentic editor similar to Cursor with a different model partnership (Codeium). Feature parity is close; choose based on pricing or model preference. |
| [Claude Code](../projects/claude-code.md) | You prefer a terminal-based agentic workflow over an IDE. Better for teams running agents in CI pipelines or headless environments. Lacks the inline diff UI but has deeper hook and skill ecosystem support. |
| [VS Code + Copilot/Continue](../projects/github-copilot.md) | You need to stay on the official VS Code release track and accept that agentic features will be shallower. Avoids the fork maintenance risk. |
| Cursor + [code-review-graph](../projects/code-review-graph.md) via MCP | You need Cursor's UI but want structural blast-radius analysis. Pair Cursor's retrieval with code-review-graph's MCP server to cover the implicit dependency gap. |

## Related Concepts and Projects

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the underlying retrieval mechanism
- [Model Context Protocol](../concepts/model-context-protocol.md) — Cursor's tool integration standard
- [Agent Skills / SKILL.md](../concepts/agent-skills.md) — the skill format Cursor's agent runtime consumes
- [Procedural Memory](../concepts/procedural-memory.md) — what `.cursor/rules/` files implement
- [Everything Claude Code](../projects/everything-claude-code.md) — maintains `.cursor/` adapters for cross-platform skill deployment
