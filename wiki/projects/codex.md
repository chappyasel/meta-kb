---
entity_id: codex
type: project
bucket: agent-systems
abstract: >-
  OpenAI Codex is an agentic coding system available as a cloud-based agent
  (codex.openai.com) and CLI tool, competing with Claude Code and Cursor for
  autonomous software engineering tasks with a sandboxed, multi-agent capable
  architecture.
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/affaan-m-everything-claude-code.md
  - repos/memorilabs-memori.md
  - repos/human-agent-society-coral.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/kepano-obsidian-skills.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - claude-code
  - cursor
  - opencode
  - gemini
  - andrej-karpathy
  - openclaw
  - antigravity
  - rag
  - anthropic
  - claude
  - mcp
  - agent-skills
  - windsurf
  - openai
  - autoresearch
last_compiled: '2026-04-07T11:38:22.005Z'
---
# OpenAI Codex

## What It Is

OpenAI Codex is OpenAI's code generation and agentic coding system. The name covers two related things: the original Codex language model (a fine-tune of GPT-3 on code, released 2021, deprecated March 2023), and the current product — a cloud-based coding agent available at codex.openai.com plus an open-source CLI tool (`openai/codex` on GitHub).

The current Codex agent runs software engineering tasks autonomously: writing code, running tests, fixing bugs, navigating existing codebases, and executing multi-step plans. It competes directly with [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), and [OpenCode](../projects/opencode.md).

[OpenAI](../projects/openai.md) launched the cloud agent in May 2025, positioning it as a parallel-task coding system where multiple Codex instances can run concurrently on separate branches, each in an isolated cloud sandbox.

## Architecture

### Cloud Agent

The cloud agent (codex.openai.com) runs inside OpenAI's infrastructure with:

- **Sandboxed execution**: Each task runs in an isolated container with internet access disabled by default. Code executes, tests run, and the agent iterates — all inside the sandbox.
- **Git-native workflow**: Codex clones the user's repository into the sandbox, works on a branch, then opens a pull request or patch for human review. The human approves before anything merges.
- **Parallel execution**: Multiple tasks run simultaneously in separate sandboxes. Unlike IDE-embedded tools that block on one task, the cloud model lets you queue several independent tasks and review results later.
- **Model**: Runs on `codex-1`, a model OpenAI trained specifically for software engineering tasks using reinforcement learning on real coding environments.

### CLI Tool

The open-source `openai/codex` CLI (TypeScript, ~60k GitHub stars as of mid-2025) provides a local, terminal-based interface to OpenAI models. Key characteristics:

- Runs in the terminal alongside existing tools
- Configurable approval policies: `suggest` (shows diffs, user approves each change), `auto-edit` (auto-approves file edits, asks for shell commands), `full-auto` (runs without interruption in a sandbox)
- Sandbox via macOS Seatbelt or Linux network namespace depending on platform
- Reads `AGENTS.md` files for repository-level instructions — the Codex equivalent of [CLAUDE.md](../concepts/claude-md.md)
- Supports [Model Context Protocol](../concepts/mcp.md) for external tool integration

### AGENTS.md

Codex reads `AGENTS.md` files placed at the repository root or in subdirectories. This file provides repo-specific context: build commands, testing conventions, which directories to avoid, code style requirements. The format mirrors CLAUDE.md and the emerging [Agent Skills](../concepts/agent-skills.md) convention. Multi-agent orchestration systems like CORAL (see CORAL deep analysis in source material) explicitly support Codex as a runtime, reading its `AGENTS.md` convention alongside Claude Code's `CLAUDE.md`.

## Key Numbers

- CLI GitHub stars: ~60k (self-reported by project page; independently observable via GitHub)
- Cloud agent launch: May 2025
- Model: `codex-1`, trained with RL on coding tasks (OpenAI's claim; no independent benchmark audit available)
- [SWE-bench](../projects/swe-bench.md) performance: OpenAI reported high scores for `codex-1` on SWE-bench Verified at launch — self-reported, not independently validated at time of writing

## Core Strengths

**Parallel async workflows.** The cloud agent's design for simultaneous isolated tasks suits teams that want to queue work and review results batch-style, rather than supervising one agent session interactively.

**Git-native safety.** Every cloud task produces a reviewable diff or pull request before any code merges. This matches existing engineering review workflows without requiring new tooling.

**Ecosystem integration.** MCP support in the CLI, AGENTS.md convention compatibility with multi-agent frameworks (CORAL supports Codex alongside Claude Code and OpenCode as interchangeable runtimes), and alignment with the emerging cross-platform [Agent Skills](../concepts/agent-skills.md) standard means Codex runs inside larger orchestration systems without special casing.

**CLI flexibility.** The open-source CLI supports multiple approval modes, letting teams dial autonomy from fully supervised to fully automatic based on their risk tolerance.

## Critical Limitations

**Concrete failure mode — hook execution gap.** Multi-agent systems that rely on event hooks for coordination (pre/post tool, session lifecycle) face a limitation with Codex: the CLI currently lacks the hook execution infrastructure that Claude Code provides. In CORAL, for example, Codex gets "instruction-based support via AGENTS.md format with a codex-specific installer (no hook execution yet)." Systems built around hook-triggered behaviors — quality gates that fire on file edits, heartbeat-driven reflection prompts, session persistence via PostToolUse — cannot rely on those mechanisms when Codex is the runtime.

**Unspoken infrastructure assumption.** The cloud agent's sandbox isolation, while a safety feature, assumes the repository and its dependencies can be cloned and built inside OpenAI's infrastructure. Private dependencies, on-premise services, or codebases that require VPN access to build are not supported in the default cloud model. Teams with strict data residency requirements or air-gapped environments cannot use the cloud agent at all.

## When NOT to Use It

**Don't use Codex cloud when you need real-time interactive collaboration.** The cloud agent runs asynchronously and returns results for review. If your workflow requires watching the agent work, redirecting mid-task, or tightly coupling agent output to an interactive IDE session, Claude Code (terminal-embedded, synchronous) or Cursor (IDE-embedded) fit better.

**Don't use it for orchestration-heavy multi-agent systems that require hooks.** If you're building a system like CORAL where coordination depends on PreToolUse/PostToolUse hooks, plateau detection, or session-resumable heartbeats, Codex lacks the hook runtime to participate as a first-class agent. Claude Code is better supported in those frameworks today.

**Don't use it for tasks requiring persistent local state.** The cloud sandbox is ephemeral. Each task starts fresh. Work requiring access to a running local database, a live dev server, or files outside the repository will not transfer.

## Unresolved Questions

**Cost at scale.** OpenAI has not published per-task pricing for the cloud agent in a form that allows easy cost modeling for teams running many parallel tasks. The relationship between sandbox compute time, model inference costs, and parallel task limits is unclear from public documentation.

**Conflict resolution in multi-agent scenarios.** When multiple Codex cloud instances work on the same repository simultaneously (different branches), there is no documented mechanism for knowledge sharing between agents — no equivalent to CORAL's `.coral/public/` shared attempts/notes/skills directory. Each agent works independently. How teams synthesize results from parallel agents is left entirely to the human review step.

**`codex-1` training details.** OpenAI describes `codex-1` as trained with RL on real coding environments but has published no technical report on the training process, dataset, or the specific RL formulation used. SWE-bench numbers are self-reported.

**Long-term CLI direction.** The CLI (`openai/codex`) is open-source with active community contributions, but its relationship to the cloud product and future development priorities is not formally documented. It's unclear whether the CLI is a feature OpenAI actively develops or primarily a community artifact.

## Alternatives and Selection Guidance

| Situation | Better choice |
|-----------|---------------|
| Async parallel tasks, PR-review workflow | Codex cloud |
| Interactive terminal coding session | [Claude Code](../projects/claude-code.md) |
| IDE-embedded assistance (VS Code, JetBrains) | [Cursor](../projects/cursor.md) or [Windsurf](../projects/windsurf.md) |
| Open-source, self-hosted, model-agnostic | [OpenCode](../projects/opencode.md) |
| Multi-agent orchestration with hooks | Claude Code (better hook support in frameworks like CORAL) |
| Maximum model flexibility (any provider) | [OpenCode](../projects/opencode.md) via [LiteLLM](../projects/litellm.md) gateway |

Use Codex cloud when your team's natural workflow is async task delegation and pull request review — the product fits engineers who want to queue work, step away, and review diffs rather than supervise agent sessions. Use the CLI when you want terminal-native OpenAI model access with configurable autonomy controls.

## Related Concepts and Projects

- [Model Context Protocol](../concepts/mcp.md) — Codex CLI implements MCP for tool integration
- [Agent Skills](../concepts/agent-skills.md) — AGENTS.md aligns with the cross-platform skill/instruction convention
- [CLAUDE.md](../concepts/claude-md.md) — Claude Code's equivalent of AGENTS.md; same pattern, different filename
- [SWE-bench](../projects/swe-bench.md) — Primary benchmark OpenAI cites for `codex-1`
- [Claude Code](../projects/claude-code.md) — Primary competitor; stronger hook support in multi-agent frameworks
- [Retrieval-Augmented Generation](../concepts/rag.md) — Relevant for codebase understanding at scale, though Codex's retrieval approach is not publicly documented
