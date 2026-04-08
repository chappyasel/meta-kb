---
entity_id: windsurf
type: project
bucket: agent-architecture
abstract: >-
  Windsurf is a VS Code-fork AI IDE by Codeium that introduced "Cascade," a deep
  agentic coding flow with codebase-wide context; competes with Cursor and
  Claude Code on autonomous multi-file editing and context window management.
sources:
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - repos/supermemoryai-supermemory.md
  - repos/alirezarezvani-claude-skills.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/tirth8205-code-review-graph.md
  - repos/jmilinovich-goal-md.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/tirth8205-code-review-graph.md
related:
  - cursor
  - claude-code
  - claude
  - model-context-protocol
  - andrej-karpathy
  - openclaw
  - autoresearch
  - knowledge-graph
  - codex
  - tree-sitter
  - codex
  - tree-sitter
last_compiled: '2026-04-08T02:41:20.856Z'
---
# Windsurf

## What It Does

Windsurf is an AI-native IDE built by Codeium, launched in November 2024. It forks VS Code and ships an opinionated agentic layer on top, centered on a feature called **Cascade** — a persistent AI flow that tracks what you and the AI are doing simultaneously ("co-evolution"), maintains awareness across the full codebase, and executes multi-file edits, terminal commands, and web search without requiring explicit instruction for each step.

The core pitch: where Cursor asks the AI to respond to your commands, Windsurf's Cascade attempts to follow intent across an entire work session. The agent observes your actions, reasons about what you're trying to do, and takes initiative accordingly.

In May 2025, OpenAI agreed to acquire Codeium for approximately $3 billion. The deal closed in June 2025. Post-acquisition, Windsurf has operated under OpenAI's umbrella, with implications for model availability and competitive positioning that remain partially unresolved.

## Architectural Differentiators

### Cascade: Session-Scoped Agentic Flow

Cascade is the architectural center. Unlike chat-in-panel approaches (GitHub Copilot) or slash-command agent modes (Cursor), Cascade runs as a continuous flow tied to the editor session. It maintains:

- A **session context** tracking files opened, edits made, errors encountered, and terminal output — not just the current query
- **Co-evolution state** — the agent observes both user edits and its own prior edits, updating its model of the task as the session progresses
- Multi-step autonomy: given a task like "add OAuth to this app," Cascade will read relevant files, write code, run the server, observe errors, and fix them across multiple tool calls without prompting

The practical effect is that Cascade handles mid-task pivots better than single-turn agents. If you edit a file manually while Cascade is running, it sees that edit and adjusts.

### Codeium's Context Engine

Codeium built a proprietary retrieval system they call the **Context Engine**, distinct from basic RAG. It combines:

- **Semantic search** over the codebase using embeddings
- **Structural analysis** — import graphs, call hierarchies — to understand what a file depends on, not just what it contains
- **Recency weighting** — files you've touched recently score higher in retrieval

This is competitive with Cursor's codebase indexing and is one reason Windsurf can handle large monorepos without requiring explicit file attachment.

### [Model Context Protocol](../concepts/model-context-protocol.md) Support

Windsurf implements MCP, allowing Cascade to call external tools — databases, APIs, internal services — via MCP servers. This is now table stakes among serious AI IDEs but Windsurf's implementation extends to multi-step tool chaining within a single Cascade flow.

### [Tree-sitter](../projects/tree-sitter.md) Integration

Windsurf uses Tree-sitter for structural code understanding — the same approach as code-review-graph and other context-precision tools. Tree-sitter provides language-aware parsing for accurate scope detection, symbol resolution, and function-boundary identification across 19+ languages.

### CLAUDE.md / Rules Support

Windsurf supports repository-level instruction files (analogous to [CLAUDE.md](../concepts/claude-md.md)) called **Windsurf Rules**, stored as `.windsurfrules` in the project root. These files persist instructions across sessions — coding conventions, architectural constraints, preferred libraries. The mechanism mirrors how other agents handle persistent procedural memory.

## Core Mechanisms

**Flow vs. Turn**: Most AI coding tools operate turn-by-turn — you prompt, the AI responds, done. Cascade maintains an open loop. It can take 20+ tool calls over several minutes to complete a task, observing results at each step and deciding whether to continue, backtrack, or ask.

**Write + Run + Observe**: Cascade can write code, execute it in the terminal, parse the output, and use the result to inform the next step — all without breaking out of the flow. This is meaningful for tasks like "make all tests pass" where the feedback loop requires multiple edit-run cycles.

**Codebase indexing**: On first open, Windsurf indexes the project. The index lives locally. Updates are incremental (similar in approach to code-review-graph's hash-based incremental updates). Search over the index powers Cascade's context retrieval.

## Key Numbers

- **Launch**: November 2024
- **Acquisition price**: ~$3 billion (OpenAI, closed June 2025) — reported by Bloomberg and The Information, not self-reported
- **User base at acquisition**: Codeium reported 1 million+ developers using its products (includes the broader Codeium suite, not Windsurf-specific) — self-reported
- **GitHub stars**: Not applicable — Windsurf is a closed-source commercial product

Benchmark claims on [SWE-bench](../projects/swe-bench.md) and HumanEval exist in Codeium's marketing materials but are self-reported and methodology details are not publicly disclosed. Independent head-to-head comparisons (e.g., against [Cursor](../projects/cursor.md) and [Claude Code](../projects/claude-code.md)) exist from developer community benchmarks but vary significantly by task type and model configuration.

## Strengths

**Long-horizon task execution**: Cascade handles multi-step agentic tasks — scaffold a feature, fix breaking tests, update documentation — in a single session without repeated re-prompting. Users report this is noticeably smoother than Cursor's agent mode for tasks requiring 10+ tool calls.

**VS Code compatibility**: Because Windsurf forks VS Code rather than building a custom editor, it inherits the full VS Code extension ecosystem. Extensions, keybindings, and workflows transfer. This lowers switching cost compared to JetBrains-native or custom-built editors.

**Codebase-wide awareness**: The Context Engine retrieves relevant code without requiring explicit file attachment. For developers working in large, unfamiliar codebases, this reduces the overhead of manually pointing the agent at the right context.

**MCP extensibility**: Integration with external tools via MCP makes Windsurf practical for tasks beyond pure coding — querying databases, checking deployment status, hitting internal APIs.

## Critical Limitations

**Failure mode — context drift in long sessions**: Cascade's session-scoped context is its differentiator, but it degrades over long sessions. After many edits and tool calls, the agent's model of the task can drift from the actual state of the codebase. It may re-introduce bugs it fixed, contradict earlier decisions, or lose track of which files it has modified. There is no explicit mechanism to "reset" the session context without starting a new Cascade flow. Users working on complex, multi-hour tasks report needing to periodically restart Cascade to avoid compounding errors.

**Infrastructure assumption**: Windsurf's agentic features assume a single-developer, single-machine workflow. The local codebase index and session context do not sync across machines or team members. Teams sharing a repo get no benefit from one developer's indexed context — each installation indexes independently. This is a fundamental architectural constraint inherited from the VS Code fork model, not a missing feature that a future update will add.

## When NOT to Use Windsurf

- **Team environments requiring shared AI context**: If your team wants consistent AI behavior across members — shared memory of architectural decisions, shared codebase understanding — Windsurf provides none of that. Each developer gets an independent instance.
- **Server/cloud development workflows**: Windsurf assumes local file access. Remote development via SSH is supported (VS Code SSH extension compatibility), but the Context Engine's performance degrades on remote filesystems with high latency.
- **Organizations with OpenAI vendor concerns**: Post-acquisition, Windsurf's backend runs on OpenAI infrastructure. Organizations with data residency requirements or OpenAI vendor restrictions face complications that do not apply to [Claude Code](../projects/claude-code.md) (Anthropic) or self-hosted alternatives.
- **Users who rely heavily on non-OpenAI models**: Prior to acquisition, Windsurf offered model choice including Claude models. Post-acquisition model availability has narrowed toward OpenAI models. Developers who prefer Claude or Gemini for specific tasks have less flexibility.
- **Lightweight or embedded development**: Windsurf is a full IDE fork. For developers who want AI assistance in an existing editor (Vim, Emacs, terminal), it's the wrong layer.

## Competitive Position

### vs. [Cursor](../projects/cursor.md)

Cursor and Windsurf are the two closest competitors in the AI IDE space. Cursor offers more explicit control — you choose when to invoke agent mode, which files to include, and which model to use. Windsurf's Cascade is more autonomous by default. The choice is largely about workflow preference: Cursor for developers who want to stay in control, Windsurf for developers who want the agent to figure it out. Cursor's multi-model support (Claude, GPT-4, Gemini) is currently broader than Windsurf's post-acquisition model lineup.

### vs. [Claude Code](../projects/claude-code.md)

Claude Code is terminal-native, not editor-native. It operates on the codebase from the command line rather than embedded in an IDE. Developers who think in files and commands often prefer Claude Code's directness; developers who think in editor UX prefer Windsurf. Claude Code also benefits from tighter integration with Claude's extended thinking and has no OpenAI dependency.

### vs. [GitHub Copilot](../projects/github-copilot.md)

Copilot is inline completion and chat; Windsurf is a full agentic IDE. Copilot's advantage is ubiquity (works in any VS Code-based editor) and GitHub integration. Windsurf's advantage is the depth of Cascade's autonomous execution.

**Use Windsurf when**: You want an autonomous, session-aware coding agent in a VS Code environment, work primarily on OpenAI-compatible infrastructure, and prefer the agent to take initiative over requiring explicit prompting.

**Use Cursor when**: You want model flexibility, explicit control over context, and a less opinionated agentic experience.

**Use Claude Code when**: You're comfortable in the terminal, want Anthropic's model quality, and need to run agents on remote servers or in CI pipelines.

## Unresolved Questions

**Model strategy post-acquisition**: OpenAI has not publicly committed to maintaining Windsurf's pre-acquisition model diversity (which included Claude). Whether Claude models remain available in Windsurf long-term is unclear, and the answer has direct implications for users who chose Windsurf partly for model flexibility.

**Data handling and training use**: Codeium's pre-acquisition privacy policy committed to not training on user code. Post-acquisition, the applicable policy is OpenAI's enterprise data terms. The mapping between the two, and whether enterprise agreements transfer, has not been publicly addressed in detail.

**Pricing at scale**: Windsurf's pricing tiers (free, Pro, Teams) existed pre-acquisition. How enterprise pricing evolves under OpenAI — particularly whether OpenAI Codex usage quotas or enterprise agreements supersede Windsurf-specific plans — is unresolved.

**Cascade context architecture**: Codeium has not published technical details on how Cascade maintains session state, how context is ranked and truncated, or what triggers context drift. The mechanism that makes Cascade work is also the mechanism that causes it to fail on long sessions, and there is no public explanation of why or how to mitigate it.

## Ecosystem Integration

Windsurf participates in the [Model Context Protocol](../concepts/model-context-protocol.md) ecosystem, making it compatible with MCP servers built for Claude Code, Cursor, and other MCP-compatible agents. Projects like code-review-graph explicitly list Windsurf as a supported platform — `code-review-graph install` auto-detects and configures Windsurf alongside Claude Code, Cursor, Zed, and Continue. Similarly, GOAL.md names Windsurf as a supported agent for autonomous improvement loops alongside Claude and Cursor.

The `.windsurfrules` file format parallels `.cursor-rules` and CLAUDE.md, and the same patterns for encoding agent instructions — coding conventions, architectural constraints, workflow preferences — apply across all three.

## Related

- [Cursor](../projects/cursor.md) — primary direct competitor, VS Code fork with more explicit agent control
- [Claude Code](../projects/claude-code.md) — terminal-native Anthropic agent, competes on autonomous coding capability
- [Model Context Protocol](../concepts/model-context-protocol.md) — standard Windsurf implements for external tool integration
- [Tree-sitter](../projects/tree-sitter.md) — parser Windsurf uses for structural code understanding
- [CLAUDE.md](../concepts/claude-md.md) — concept behind Windsurf's `.windsurfrules` persistent instruction system
- [OpenAI Codex](../projects/codex.md) — OpenAI's coding model, now backend infrastructure post-acquisition
- [Context Management](../concepts/context-management.md) — core challenge Cascade's session architecture attempts to solve
