---
entity_id: windsurf
type: project
bucket: agent-systems
abstract: >-
  Windsurf is Codeium's AI-integrated code editor combining agentic coding
  (multi-file edits, terminal access, codebase search) with inline LLM
  assistance, differentiated from Cursor by its "Cascade" agentic mode and
  deeper IDE integration rather than a plugin layer.
sources:
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - repos/alirezarezvani-claude-skills.md
  - repos/jmilinovich-goal-md.md
  - repos/caviraoss-openmemory.md
  - repos/tirth8205-code-review-graph.md
  - repos/yusufkaraaslan-skill-seekers.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/tirth8205-code-review-graph.md
related:
  - cursor
  - claude-code
  - mcp
  - andrej-karpathy
  - claude
  - autoresearch
  - openai-codex
  - gemini
  - rag
last_compiled: '2026-04-06T02:00:21.254Z'
---
# Windsurf

## What It Is

Windsurf is a standalone code editor from [Codeium](https://codeium.com) — the AI coding infrastructure company — that embeds LLM-powered assistance at the IDE level rather than as an extension on top of VS Code. Released in late 2024, it competes directly with [Cursor](../projects/cursor.md) and [Claude Code](../projects/claude-code.md) for the "AI-native development environment" market.

The central product bet is that the IDE itself should be the agent loop, not a plugin mediating between VS Code and an LLM. This means Windsurf controls the full editing surface: it can read and write files, run terminal commands, search the codebase, and chain multi-step operations without relying on an extension API.

Codeium was acquired by OpenAI in May 2025 for a reported $3 billion. As of the card's writing date, Windsurf continued operating as its own product line under that umbrella.

## Core Mechanism: Cascade

The distinguishing feature is **Cascade**, Windsurf's agentic mode. Where Cursor's Composer and Claude Code operate as conversation threads that issue edits, Cascade models the entire coding session as a stateful workflow:

- **Context awareness**: Cascade indexes the active codebase and maintains a running representation of what files are relevant to the current task. This uses a combination of [RAG](../concepts/rag.md)-style retrieval over the repo and explicit tool calls to read specific files.
- **Action sequencing**: Cascade can chain terminal commands (run tests, build, lint), file edits, and search operations without requiring user confirmation at each step. The user sets an autonomy level — from "ask before each action" to "run until done."
- **Write-ahead context**: Before executing edits, Cascade builds an explicit plan shown to the user, allowing intervention before any file is touched.

The underlying model is configurable. Windsurf supports [Claude](../projects/claude.md) (Anthropic's family), [Gemini](../projects/gemini.md), and its own Codeium-tuned models. Post-acquisition, [OpenAI](../projects/openai.md) models are increasingly prominent. The model selector is explicit in the UI.

Windsurf implements [Model Context Protocol](../concepts/mcp.md), meaning it can connect to MCP servers for external context — documentation, databases, APIs — using the same interface as Claude Code and Cursor. Tools like Skill_Seekers explicitly document `.windsurfrules` file support, showing the ecosystem treating Windsurf as a first-class MCP client.

## Context Management

Windsurf uses `.windsurfrules` files (per-project) and a global rules configuration for persistent agent instructions — the same conceptual role as [claude.md](../concepts/claude-md.md) files in Claude Code. These files tell Cascade how to behave in a given codebase: coding standards, testing requirements, which directories to avoid.

Codebase indexing runs on first open and incrementally thereafter. The indexer builds a vector store of the project's code for semantic search, plus a symbol graph for precise navigation. The combination resembles what code-review-graph builds explicitly — Windsurf does this automatically as part of IDE initialization, though with less configurability.

Context window management follows a flow-state model: Cascade tracks which files it has touched in a session and keeps recent context in a sliding window, compressing older context to preserve space for active work. This is configurable but not fully transparent to the user.

## Key Numbers

- Codeium reported over 900,000 developer users before the Windsurf rebrand (self-reported, 2024)
- Windsurf-specific adoption numbers are not publicly disclosed
- The OpenAI acquisition valued the combined entity at approximately $3 billion (reported by Bloomberg, May 2025)
- [SWE-Bench](../projects/swe-bench.md) scores for Windsurf's agentic mode are not independently published; Codeium has cited internal benchmarks showing competitive performance with Cursor on coding tasks but these are self-reported

## Strengths

**Flow-state agent loop**: Cascade handles multi-step tasks without constant interruptions. For tasks like "add authentication to this API, write tests, and update the README," it chains the operations rather than requiring a new prompt per step.

**MCP ecosystem participation**: Full MCP client means Windsurf benefits from the growing ecosystem of context servers. Any MCP server built for Claude Code works in Windsurf.

**Model flexibility**: Unlike Claude Code (which is tied to Claude) or GitHub Copilot (GPT-based), Windsurf lets users switch models mid-session. Teams with enterprise agreements to specific providers can point Windsurf at those models.

**Per-project rules**: `.windsurfrules` files checked into source control mean the whole team shares the same agent context. This is a practical solution to the problem of each developer having different agent behavior.

**Offline and enterprise deployment**: Codeium has enterprise features for air-gapped environments and self-hosted model endpoints — relevant for organizations that cannot send code to external APIs.

## Critical Limitations

**Concrete failure mode — context collapse on large refactors**: Cascade can lose coherence when a task touches more files than its context window can hold. On large refactors (20+ files), it may complete edits in early files correctly but then apply contradictory changes to later files, having implicitly dropped context from the start of the session. Users report needing to break large tasks into smaller Cascade sessions manually. This is [Context Collapse](../concepts/context-collapse.md) in practice.

**Unspoken infrastructure assumption**: The vector index Windsurf builds assumes the codebase lives on the local machine. For developers working against remote development environments (GitHub Codespaces, cloud VMs, Docker containers via SSH), the indexing either doesn't work or degrades significantly. Windsurf's architecture assumes local file access in a way that Claude Code (which runs in the terminal and works natively in remote environments) does not.

## When NOT to Use It

**Remote development environments**: If your workflow is primarily SSH into a remote machine, Codespaces, or containers, Windsurf's indexing and agent capabilities are unreliable. Claude Code or a terminal-based approach fits better.

**Strict model governance requirements**: Organizations that must use a single approved LLM endpoint with audit logging will find Windsurf's multi-model flexibility becomes a governance liability rather than a feature. Claude Code through Anthropic's enterprise API provides more controlled provenance.

**Teams already standardized on VS Code extensions**: Windsurf requires switching editors. If a team has significant investment in VS Code extensions, workflows, and keybindings, the migration cost is real. Cursor is a closer drop-in since it's also VS Code-based; Windsurf is a different binary.

**Pure agentic / headless workloads**: For automated coding tasks in CI/CD pipelines or scripted environments with no human in the loop, Windsurf's GUI-centered design is the wrong abstraction. Claude Code or OpenAI Codex are built for terminal/API usage.

## Unresolved Questions

**Post-acquisition trajectory**: With OpenAI owning Codeium, it's unclear whether Windsurf will remain model-agnostic (its current differentiator) or gradually align with OpenAI models as the preferred backend. The competitive position against Claude Code shifts depending on this.

**Cost at scale**: Windsurf's pricing is credit-based for Cascade interactions. On large codebases with complex agentic tasks consuming many context tokens, costs are not predictable from published pricing. Teams running Cascade continuously have reported billing surprises, but Codeium has not published average cost-per-task data.

**Conflict resolution in team settings**: When multiple developers use Cascade on the same codebase simultaneously — each with their own `.windsurfrules` overrides — there's no documented policy for which rules take precedence or how conflicting agent actions (one dev's Cascade undoes another's edits) are surfaced.

**Indexing quality on polyglot repos**: The codebase indexer's quality varies by language. The retrieval accuracy on Python and TypeScript is demonstrably better than on Rust, Go, or C++ based on community reports. Codeium has not published per-language retrieval benchmarks.

## Relationship to Adjacent Concepts

Windsurf implements several patterns from this knowledge base in practice:

- **[Agentic RAG](../concepts/agentic-rag.md)**: Cascade's codebase search follows an agentic retrieval pattern — it issues multiple search queries, reads retrieved files, and decides whether to search again based on what it finds.
- **[Procedural Memory](../concepts/procedural-memory.md)**: `.windsurfrules` files serve as externalized procedural memory — the agent's learned preferences for how to operate in a given codebase, persisted across sessions.
- **[Task Decomposition](../concepts/task-decomposition.md)**: Cascade's write-ahead plan is a visible decomposition of the user's goal into atomic operations before execution begins.
- **[Context Engineering](../concepts/context-engineering.md)**: The model selector and rules configuration are user-facing [context engineering](../concepts/context-engineering.md) controls — explicit choices about what the model knows and how it should behave.

## Alternatives and Selection Guidance

| Tool | Use when |
|------|----------|
| [Cursor](../projects/cursor.md) | You want VS Code compatibility and don't want to switch editors; team is already on VS Code |
| [Claude Code](../projects/claude-code.md) | You need terminal-native, remote environment support, or strict Anthropic model provenance; headless/CI use cases |
| [OpenAI Codex](../projects/openai-codex.md) | OpenAI API integration is a hard requirement; scripted/API-driven workflows |
| Windsurf | You want an opinionated agentic loop with model flexibility and are willing to switch editors; local development on your own machine |

The core selection question between Windsurf and Cursor comes down to editor familiarity versus agent design philosophy. Cursor is more conservative — it stays closer to VS Code behavior and makes the AI assistance feel like an extension. Windsurf is more aggressive about letting Cascade run autonomously. Teams that want the agent to do more with less intervention will find Windsurf's defaults match their intent; teams that want to stay in control of each step will find Cursor less frustrating.
