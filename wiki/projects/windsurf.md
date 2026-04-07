---
entity_id: windsurf
type: project
bucket: agent-systems
abstract: >-
  Windsurf is an AI-powered IDE by Codeium built around agentic "flow" coding,
  differentiating itself from Cursor with deeper agent autonomy and native
  cascade-style multi-step task execution.
sources:
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - repos/alirezarezvani-claude-skills.md
  - repos/jmilinovich-goal-md.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/tirth8205-code-review-graph.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/tirth8205-code-review-graph.md
related:
  - cursor
  - claude-code
  - mcp
  - github-copilot
  - andrej-karpathy
  - autoresearch
  - codex
  - tree-sitter
  - openclaw
  - claude
  - agent-skills
last_compiled: '2026-04-07T11:38:15.669Z'
---
# Windsurf

## What It Does

Windsurf is a standalone IDE built by Codeium, positioned as an agentic coding environment rather than a copilot overlay on an existing editor. Where [GitHub Copilot](../projects/github-copilot.md) autocompletes and [Cursor](../projects/cursor.md) offers chat-plus-edit, Windsurf's core bet is that the AI should sustain multi-step coding tasks autonomously — reading files, running terminals, making edits, iterating on errors — without the user directing each step.

Codeium rebranded this product line around a "flow" metaphor: the idea that productive coding involves uninterrupted state, and that AI assistance should extend that state rather than interrupt it. The agent component is called **Cascade**, and it is the primary differentiator. Cascade can hold context across an entire task, chain tool calls (file edits, shell commands, web search), and surface progress without requiring constant prompting.

In May 2025, OpenAI acquired Codeium for a reported $3 billion. As of this writing, Windsurf continues to operate as a product under that acquisition, with its roadmap and model access now tied to OpenAI's infrastructure. The acquisition raised immediate questions about model partnerships (Windsurf had been model-agnostic, supporting Claude, GPT-4, and others) that remain partially unresolved.

## Architecture and Core Mechanisms

### Cascade: The Agentic Layer

Cascade is Windsurf's agentic execution engine. Unlike Cursor's Composer (which executes a planned set of edits on user confirmation), Cascade operates in a more continuous loop: it can observe tool outputs, decide next steps, and proceed without a human checkpoint at each action.

The mechanism follows a [ReAct](../concepts/react.md)-style loop: reason about the current state, select a tool, execute, observe the result, repeat. Tools available to Cascade include:

- File read/write/create
- Terminal command execution
- Browser/web search
- Codebase search (semantic and exact)
- [MCP](../concepts/mcp.md) tool calls (external integrations)

Cascade tracks its own action history within a session, which gives it rudimentary short-term [episodic memory](../concepts/episodic-memory.md) — it knows what it tried, what failed, and can adjust. This history does not persist across sessions by default.

### Context Management

Windsurf uses [Tree-sitter](../projects/tree-sitter.md) for structural code parsing, enabling AST-aware context construction. Rather than feeding raw file contents, the system can extract relevant functions, class definitions, and dependency chains to populate the model's context window more efficiently.

This is similar to what [code-review-graph](../projects/tree-sitter.md) does for blast-radius analysis: structural awareness reduces token waste. Windsurf applies this at the context-filling stage — when Cascade needs to understand a codebase, it selects structurally relevant nodes rather than concatenating entire files.

Context also draws on a persistent `.windsurfrules` file (analogous to [CLAUDE.md](../concepts/claude-md.md)), which project teams use to encode conventions, file structure guidance, and agent behavior constraints. Third-party tools like [Skill Seekers](../projects/autoresearch.md) generate `.windsurfrules` content automatically from documentation sources.

### Memory System

Windsurf introduced a **Memories** feature that extracts facts from conversations and stores them for use across sessions. This addresses the statelessness problem that affects most coding agents: the agent forgets project context between sessions.

The memory system operates as a form of [semantic memory](../concepts/semantic-memory.md) — it stores extracted preferences, project facts, and user patterns. The extraction happens automatically, not through explicit user tagging. What gets remembered, and how it influences future context, is not publicly documented in detail. This is one of the significant unresolved questions about the system.

### Model Access

Windsurf is model-agnostic at the API level. Users can direct Cascade at Claude (Anthropic), GPT-4o, and Windsurf's own "SWE-1" model family, which Codeium trained specifically for software engineering tasks. SWE-1 is claimed to outperform Claude Sonnet and GPT-4o on agentic coding benchmarks, though these benchmarks are self-reported. Post-OpenAI acquisition, the trajectory of Claude and non-OpenAI model support is unclear.

### Flow State and Editor Design

The IDE base is a Visual Studio Code fork, giving it access to the VS Code extension ecosystem. Windsurf's additions sit on top: the Cascade panel, the Memories UI, and modified keybindings and UX aimed at minimizing context-switching. The "flow" framing is partly marketing, partly a genuine UX principle — the default configuration tries to surface Cascade's progress inline rather than in a separate chat panel.

## Key Numbers

- **Acquisition price**: ~$3 billion (OpenAI, May 2025) — reported by multiple outlets, unconfirmed by either party officially
- **User base**: Codeium claimed millions of developers before the acquisition; Windsurf-specific MAU figures are not public
- **SWE-bench performance**: Windsurf's SWE-1 model was reported at competitive performance with Claude Sonnet on SWE-bench Verified — self-reported, not independently validated at time of writing
- **MCP tools**: Supports the full [MCP](../concepts/mcp.md) protocol, enabling integration with external tool servers

These numbers require skepticism. SWE-bench scores from vendors consistently outpace third-party reproductions, and Codeium had financial incentive to publish favorable benchmarks ahead of acquisition.

## Strengths

**Autonomous multi-step execution**: Cascade handles longer task chains than most comparable tools without requiring human re-prompting at each step. For tasks like "refactor this module to use the new API and fix any resulting test failures," this reduces back-and-forth significantly.

**Structural code understanding**: Tree-sitter integration means Cascade reasons about code structure, not just text. This improves its ability to find relevant context without reading entire codebases.

**MCP ecosystem**: Full MCP support means Windsurf agents can call external tools (databases, APIs, custom servers) using the same protocol as [Claude Code](../projects/claude-code.md), enabling integration into broader agent workflows.

**VS Code compatibility**: The VS Code fork base means existing extensions, themes, and keybindings transfer with minimal friction for developers already in that ecosystem.

## Critical Limitations

**Failure mode — agent drift on long tasks**: Cascade's autonomy is also its main failure mode. On tasks that require more than 10-15 tool calls, the agent can drift from the original intent — making decisions that locally seem reasonable but globally accumulate into the wrong outcome. Unlike Claude Code (which surfaces tool calls for approval by default), Cascade's default is to proceed. Users who don't monitor the terminal output may return to a codebase significantly altered in unintended ways. There is no built-in "dry run" or "plan first, execute second" mode that surfaces the full intended action sequence before any changes are made.

**Infrastructure assumption**: Windsurf assumes a local development environment with shell access. The terminal execution tools require a machine where the agent can run arbitrary commands. Teams using cloud-based or containerized dev environments (Codespaces, Gitpod) hit friction — the agent's terminal context may not match the actual execution environment, causing tool calls to silently fail or produce misleading output.

## When NOT to Use Windsurf

**Regulated or audited codebases**: Cascade's default autonomy means it may make changes without explicit user confirmation. In environments requiring change traceability (SOC2-audited systems, medical software, financial infrastructure), the lack of an approvals-before-execution model is a structural problem.

**Teams with strong IDE diversity**: If your team splits across Vim, JetBrains, and VS Code, Windsurf's standalone IDE model fragments tooling. Copilot or Cline (as an extension) may be better fits for heterogeneous environments.

**Tasks requiring precise context control**: When you need to be exact about what the model sees — no more, no less — Windsurf's automatic context construction works against you. Claude Code's more explicit `--include`/`--exclude` patterns give more control over what enters the context window.

**Post-acquisition model-lock concerns**: Organizations with existing Anthropic contracts or Claude-specific compliance requirements should evaluate whether OpenAI's acquisition will restrict Claude access in Windsurf. This is unresolved as of this writing.

## Unresolved Questions

**Memory governance**: What data does the Memories system send to Codeium/OpenAI servers? How long is it retained? Can it be audited or deleted? The feature is useful enough that many teams will use it without clear answers to these questions.

**Model access post-acquisition**: OpenAI's acquisition creates an obvious incentive to favor GPT-family models. Whether Claude and other third-party models remain first-class options, or become gradually degraded, is an open question with significant implications for teams that have chosen Windsurf partly because of Claude's coding capabilities.

**SWE-1 training data**: Codeium trained SWE-1 on software engineering data but has not disclosed the composition of that dataset or the evaluation methodology in detail. Independent [SWE-bench](../projects/swe-bench.md) validation has not been published.

**Cascade's context window management at scale**: On large monorepos (100k+ files), how Cascade selects and prioritizes context is not documented. The Tree-sitter-based approach helps, but the decision logic for what gets included versus excluded in the model's window is a black box.

**Cost at scale**: Windsurf's pricing tiers are usage-based for Pro features. At team scale, the per-seat costs for heavy Cascade usage (which consumes significant tokens per session) are not benchmarked publicly. Teams scaling from individual to 50-person usage should model costs before committing.

## Alternatives and Selection Guidance

**Use [Cursor](../projects/cursor.md) when** you want more control over the agent's execution — Cursor's Composer requires explicit confirmation for larger changes, which reduces drift risk. Cursor also has a longer track record and a more established third-party extension ecosystem.

**Use [Claude Code](../projects/claude-code.md) when** you want CLI-first agentic coding with explicit tool approval, strong context control, and Anthropic's model quality without IDE lock-in. Claude Code's `--dangerously-skip-permissions` flag gives Windsurf-style autonomy when you want it, while the default is more conservative.

**Use [GitHub Copilot](../projects/github-copilot.md) when** your team is standardized on VS Code or JetBrains and you need an enterprise-grade tool with Microsoft/GitHub's compliance story. Copilot's agentic features (Copilot Workspace) are less capable than Cascade but more auditable.

**Use [OpenAI Codex](../projects/codex.md) when** you want a cloud-based agentic coding environment that doesn't require a local IDE. Codex runs tasks asynchronously in isolated containers, which is structurally different from Windsurf's local execution model.

---

*Related: [Agent Skills](../concepts/agent-skills.md) | [Model Context Protocol](../concepts/mcp.md) | [CLAUDE.md](../concepts/claude-md.md) | [Context Engineering](../concepts/context-engineering.md) | [Tree-sitter](../projects/tree-sitter.md)*


## Related

- [Cursor](../projects/cursor.md) — competes_with (0.8)
- [Claude Code](../projects/claude-code.md) — competes_with (0.7)
- [Model Context Protocol](../concepts/mcp.md) — implements (0.6)
- [GitHub Copilot](../projects/github-copilot.md) — competes_with (0.7)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.3)
- [AutoResearch](../projects/autoresearch.md) — part_of (0.3)
- [OpenAI Codex](../projects/codex.md) — competes_with (0.6)
- [Tree-sitter](../projects/tree-sitter.md) — part_of (0.4)
- [OpenClaw](../projects/openclaw.md) — competes_with (0.4)
- [Claude](../projects/claude.md) — competes_with (0.4)
- [Agent Skills](../concepts/agent-skills.md) — part_of (0.4)
