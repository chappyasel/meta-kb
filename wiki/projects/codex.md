---
entity_id: codex
type: project
bucket: agent-systems
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - repos/human-agent-society-coral.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/kepano-obsidian-skills.md
  - repos/othmanadi-planning-with-files.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - repos/affaan-m-everything-claude-code.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/human-agent-society-coral.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - Claude Code
  - OpenAI
last_compiled: '2026-04-05T05:25:44.405Z'
---
# OpenAI Codex

## What It Is

OpenAI Codex is both a code-generation model and a CLI-based coding agent. The model, released in 2021, powered GitHub Copilot's initial autocomplete. The current product, released as open-source in 2025, is a terminal agent that takes natural language tasks, writes and runs code in a sandboxed environment, reads files, and proposes changes for human review.

The model side descends from GPT-3 fine-tuned on public GitHub repositories, roughly 54 million public repos as of the original paper. The agent side is the more relevant artifact today: a Node.js CLI that wraps the OpenAI API (defaulting to `o3` or `o4-mini`), manages a working directory context, and executes shell commands with configurable approval policies.

## Core Mechanism

The CLI (`openai/codex`) operates in three approval modes: `suggest` (shows all changes for review), `auto-edit` (applies file edits automatically, asks before running commands), and `full-auto` (runs everything in a sandboxed environment without prompting). Sandboxing on macOS uses Apple Seatbelt; on Linux it uses network-disabled containers.

The agent receives a task prompt, reads relevant files from the working directory, produces edits via the Responses API with tool calls, and executes those tools. It maintains conversation history across turns within a session. There is no persistent memory between sessions by default, though third-party frameworks like CORAL wire in shared state via symlinked `.coral/public/` directories so multiple Codex agents can read each other's prior attempts.

The skills system (compatible with Claude Code's agent skills format) lets users drop `SKILL.md` files into `~/.codex/skills/` to give the agent domain-specific instructions. The [obsidian-skills](../../raw/repos/kepano-obsidian-skills.md) project uses this to teach agents Obsidian-flavored markdown and canvas formats.

## Key Numbers

- GitHub stars for the `openai/codex` CLI repository: ~85,000 (self-reported by repository metrics, not independently audited)
- Original Codex model benchmark (HumanEval): 28.8% pass@1 for the 12B parameter model (OpenAI-reported, 2021 paper)
- A community autoresearch run using Codex as the harness-building environment ran 49 optimization experiments for $24.10 across 2.3M input tokens, reducing p95 latency from 339ms to 34ms (self-reported by one practitioner, [Cameron Westland](../../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md))

These benchmarks are self-reported. HumanEval performance for current models accessed via the Codex CLI (o3, o4-mini) is tracked separately under those model names and is substantially higher, but attributing those numbers to "Codex" conflates the model with the agent wrapper.

## Strengths

The CLI's sandboxing is practical: `full-auto` mode on macOS uses Seatbelt profiles that restrict filesystem writes and disable network access, making it safer to let the agent run unsupervised than most alternatives. The three-tier approval policy maps cleanly to actual risk tolerance.

Codex functions well as a subprocess target in multi-agent frameworks. CORAL's `agent/runtime.py` lists Codex alongside Claude Code and OpenCode as supported runtimes, treating it as an interchangeable subprocess. This composability is useful for autoresearch workflows where you want parallel agents each in isolated git worktrees.

The agent skills specification (`~/.codex/skills/`) is compatible with Claude Code's skill format, so skill libraries transfer between the two agents without modification.

## Critical Limitations

**Concrete failure mode:** No persistent memory across sessions means the agent cannot learn from prior runs without external scaffolding. In autoresearch workflows, this requires explicit infrastructure (CORAL's shared `.coral/public/` directory, or pi-autoresearch's "What's Been Tried" section in the spec) to avoid re-attempting failed experiments. Without that, the agent will re-explore the same dead ends. One practitioner reported Codex proactively filling the "What's Been Tried" section with invented attempts before the autoresearch loop even started, manufacturing history to satisfy the resume protocol.

**Unspoken infrastructure assumption:** `full-auto` sandboxing assumes you are running on macOS (Seatbelt) or a Linux environment where you can provision Docker containers. On shared CI systems, restricted cloud environments, or Windows, the sandbox either does not apply or requires significant configuration. The documentation does not surface this constraint prominently.

## When Not to Use It

Avoid Codex CLI when the task requires persistent state across multi-session workflows without adding an external orchestration layer. The agent's context resets between invocations, so long-running iterative tasks (refactoring a large codebase over multiple days) need explicit scaffolding that you must build and maintain.

Avoid it for tasks requiring real-time web access in full-auto mode. The sandbox disables network access, so any task that needs to fetch documentation, check package registries, or call external APIs during execution will silently fail or require dropping to a less sandboxed mode.

Avoid it when your team needs audit trails or governance over agent actions at the organizational level. Codex logs actions within a session but provides no built-in centralized logging, access control, or policy enforcement across multiple developers running agents against shared codebases.

## Unresolved Questions

- **Cost at scale:** The CLI routes directly to the OpenAI API with no built-in cost caps per invocation or per project. Teams running multiple agents in parallel on large codebases have no native guardrails. CORAL exposes this by warning "beware of your budget" in agent count configuration.
- **Conflict resolution in multi-agent use:** When multiple Codex agents run against the same repository in parallel (as CORAL enables via git worktrees), the infrastructure for merging competing edits is not part of Codex itself. CORAL handles this with worktrees and a manager process, but Codex provides no primitives for it.
- **Model versioning:** The CLI defaults change as OpenAI releases new models. There is no pinning mechanism in the CLI configuration, so behavior can shift between runs without any change to your setup.
- **Governance:** OpenAI controls the API the CLI depends on. Rate limits, pricing changes, and model deprecations are entirely at OpenAI's discretion.

## Alternatives

- **[Claude Code](../projects/claude-code.md):** Use when you want deeper integration with Anthropic's model strengths in long-context reasoning or when your team already uses Anthropic's API. The agent skills format is compatible. Claude Code is more tested as the default runtime in CORAL's multi-agent autoresearch workflows.
- **OpenCode:** Use when you want an open-source agent with no dependency on proprietary APIs and full control over model routing via LiteLLM gateway configuration.
- **GitHub Copilot (IDE extension):** Use when the primary workflow is inline autocomplete inside an IDE rather than terminal-based agentic task execution. Copilot is not a general-purpose agent.
- **CORAL + Codex:** Use when you need multiple parallel Codex agents sharing knowledge across runs. CORAL adds the persistence, orchestration, and evaluation loop that Codex lacks on its own.


## Related

- [Claude Code](../projects/claude-code.md) — competes_with (0.8)
- [OpenAI](../projects/openai.md) — created_by (0.9)
