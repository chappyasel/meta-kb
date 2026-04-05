---
entity_id: opencode
type: project
bucket: agent-systems
sources:
  - repos/supermemoryai-supermemory.md
  - repos/human-agent-society-coral.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/alirezarezvani-claude-skills.md
  - repos/volcengine-openviking.md
  - repos/tirth8205-code-review-graph.md
  - repos/kepano-obsidian-skills.md
  - repos/othmanadi-planning-with-files.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/affaan-m-everything-claude-code.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - Claude Code
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:21:48.266Z'
---
# OpenCode

## What It Is

OpenCode is an open-source, terminal-based AI coding agent. It runs as a subprocess you invoke from the command line, reads and edits files in your working directory, executes shell commands, and uses an LLM backend to reason about code changes. The project sits in the same category as [Claude Code](../projects/claude-code.md) and Codex: tools you point at a codebase and instruct to make changes autonomously.

Beyond solo use, OpenCode appears as a first-class supported runtime in orchestration frameworks. The CORAL multi-agent autoresearch system, for example, lists OpenCode alongside Claude Code and Codex as interchangeable agent backends you configure with a single line: `runtime: opencode`. [Source](../../raw/repos/human-agent-society-coral.md)

## Core Mechanism

OpenCode communicates via terminal stdin/stdout, which is what makes it subprocess-composable. Orchestrators like CORAL treat it as a black box: spawn it, pipe in a prompt, read its output when it calls an eval command. This design is deliberately minimal. It doesn't expose a programmatic API; it behaves like a user typing at a terminal.

Configuration lives in `opencode.json` placed in the seed/working directory. This file controls two things: permissions (which tool categories the agent may use without asking) and the provider/model routing. A typical autonomous setup sets `bash`, `edit`, `read`, `write`, `codesearch`, and `lsp` to `"allow"`, while setting `question` and `webfetch` to `"deny"` so the agent never blocks waiting for user input. [Source](../../raw/repos/human-agent-society-coral.md)

Model routing goes through a `provider` block in `opencode.json`. The provider section points at an endpoint URL and API key. When used behind a LiteLLM gateway, `baseURL` points at `http://localhost:<port>/v1` instead of the upstream provider directly. This is how CORAL injects per-agent proxy keys for request tracking.

## Key Numbers

Star counts and benchmarks for OpenCode specifically are not present in the available source material. What's documented is its role as one of three supported runtimes in CORAL (the others being Claude Code and Codex), and that the hipocampus memory harness lists it as a supported platform alongside Claude Code and OpenClaw. [Source](../../raw/repos/kevin-hs-sohn-hipocampus.md) No independent benchmark comparisons between OpenCode and competing agents appear in the source material.

## Strengths

**Subprocess composability.** Because OpenCode runs purely through terminal I/O, any orchestrator that can spawn subprocesses and manage stdout can use it. This is not true of all coding agents.

**Permission granularity.** The `opencode.json` permission model lets you lock down exactly which tool categories the agent may invoke. Denying `question` makes it non-interactive; denying `webfetch` and `websearch` keeps it offline. This matters for reproducible, budget-controlled batch runs.

**Provider flexibility.** The provider block supports arbitrary OpenAI-compatible endpoints. You can route through a LiteLLM proxy, point at a self-hosted model, or switch providers without changing agent code.

**Memory harness integration.** Tools like hipocampus detect OpenCode as a supported platform and automatically install their session memory protocols. The 3-tier memory system (ROOT.md topic index, daily logs, compaction tree) works with OpenCode out of the box. [Source](../../raw/repos/kevin-hs-sohn-hipocampus.md)

## Critical Limitations

**Concrete failure mode: authentication is your problem.** CORAL's documentation states plainly that if the underlying agent cannot start or authenticate, "the infrastructure will fail to function." OpenCode requires a working `opencode.json` with valid credentials before any orchestration layer can use it. In multi-agent setups where each agent runs in its own git worktree, each worktree needs a copy of this config. CORAL handles the copy via seed directory replication, but any credential expiry or misconfiguration silently breaks agents mid-run. [Source](../../raw/repos/human-agent-society-coral.md)

**Unspoken infrastructure assumption: local filesystem access.** OpenCode reads and writes files in its working directory. This assumes the agent and the files it edits share a local filesystem. Cloud-native setups where code lives in object storage, or distributed environments where agents run on separate machines, require additional mounting or sync infrastructure that OpenCode does not provide.

## When Not to Use It

Don't use OpenCode when you need programmatic control over agent behavior mid-execution. Because it communicates through terminal I/O, you cannot inject structured messages, inspect intermediate state, or pause and redirect it the way you can with an agent framework that exposes a Python API. If your workflow requires dynamic task modification, tool injection, or structured output parsing, a framework with a proper programmatic interface fits better.

Don't use it when you need a managed cloud environment. OpenCode is a local tool. If your team needs audit logs, centralized credential management, or browser-based UI, hosted alternatives like Cursor or Claude Code's managed offering are more appropriate starting points.

## Unresolved Questions

**Governance and maintenance.** The source material references OpenCode's GitHub at `github.com/opencode-ai/opencode` but provides no information about who maintains it, release cadence, or what happens when upstream LLM APIs change. For a terminal agent that relies entirely on external API endpoints, this matters.

**Conflict resolution in multi-agent runs.** When multiple OpenCode instances run in parallel worktrees (as in CORAL), each agent edits its own branch. The source material describes how CORAL's eval loop commits and grades attempts, but does not explain what happens when two agents converge on similar solutions or when one agent's skill update conflicts with another's ongoing work.

**Cost at scale.** CORAL's docs note "beware of your budget" when setting agent count. No per-task cost estimates appear for OpenCode specifically. Token consumption depends heavily on the model routed through the provider block, and the gateway proxy gives per-agent tracking, but there is no documented cost floor or ceiling for typical OpenCode runs.

## Alternatives

**[Claude Code](../projects/claude-code.md)** when you want the most tested and documented coding agent with direct Anthropic support. CORAL lists it as "the default and most tested runtime." Use it when reliability and documentation matter more than open-source flexibility.

**Codex (OpenAI)** when your infrastructure is already OpenAI-centric and you want a supported open-source agent from that ecosystem.

**OpenCode** when you need an open-source terminal agent with flexible provider routing and you're willing to configure credentials and permissions manually. Its primary advantage over Claude Code is that it isn't tied to Anthropic's infrastructure.

## Related Concepts

- Retrieval-Augmented Generation — used by memory harnesses like hipocampus that integrate with OpenCode sessions
- [Agent Memory](../concepts/agent-memory.md) — the problem OpenCode-compatible tools like hipocampus and OpenViking address
