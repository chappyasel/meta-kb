---
entity_id: codex
type: project
bucket: agent-architecture
abstract: >-
  OpenAI Codex: code-generation model family (underlying GitHub Copilot) plus a
  CLI coding agent for terminal-based autonomous development; unique for tight
  integration with OpenAI's model ecosystem and AGENTS.md-based permission
  model.
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/affaan-m-everything-claude-code.md
  - repos/human-agent-society-coral.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/kepano-obsidian-skills.md
  - repos/matrixorigin-memoria.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - claude-code
  - cursor
  - opencode
  - agent-skills
  - andrej-karpathy
  - openclaw
  - model-context-protocol
  - gemini-cli
  - context-engineering
  - anthropic
  - claude
  - windsurf
  - multi-agent-systems
  - antigravity
  - autoresearch
  - langchain
  - windsurf
  - multi-agent-systems
  - antigravity
last_compiled: '2026-04-08T02:41:15.055Z'
---
# OpenAI Codex

## What It Is

OpenAI Codex refers to two distinct but related things that share a name. The original Codex was a code-generation model family (2021–2023) that powered GitHub Copilot and dominated HumanEval benchmarks before being deprecated in favor of GPT-3.5 and GPT-4. The current Codex is a CLI coding agent released in 2025, analogous to [Claude Code](../projects/claude-code.md) but built on OpenAI's model stack, designed for autonomous terminal-based software development.

This reference covers the CLI agent, which is the active product. The original model is historical context.

The CLI agent runs as a subprocess in the user's terminal, reads an `AGENTS.md` instruction file (analogous to [CLAUDE.md](../concepts/claude-md.md)), executes shell commands, reads and writes files, and iterates on code toward a stated goal. It targets the same use case as Claude Code: a developer describes a task, the agent handles implementation across multiple tool calls without continuous human oversight.

[OpenAI](../projects/openai.md) positions Codex as the coding-specific surface of its agent platform, sitting alongside the [OpenAI Agents SDK](../projects/openai-agents-sdk.md) for orchestration.

## Core Mechanism

### AGENTS.md Instruction System

Codex reads `AGENTS.md` at startup, which serves the same role as CLAUDE.md: persistent instructions encoding project conventions, coding standards, testing requirements, and behavioral constraints. The file is project-local (or user-global at `~/.codex/AGENTS.md`) and gets injected into every session.

Unlike Claude Code's `settings.json` permission model, Codex uses a simpler configuration:

```json
{
  "approval_policy": "never",
  "sandbox_mode": "danger-full-access"
}
```

For autonomous operation, `approval_policy: "never"` disables confirmation prompts. `sandbox_mode: "danger-full-access"` grants unrestricted filesystem and shell access. This is the configuration [CORAL](../projects/autoresearch.md) uses when spawning Codex agents in multi-agent optimization runs.

### Sandbox Architecture

Codex supports multiple sandbox configurations ranging from interactive approval on each tool call to fully autonomous execution. The sandbox model is coarser than Claude Code's per-tool `Allow`/`Deny` lists but simpler to configure for automated pipelines.

In CORAL's multi-agent system, Codex runs with full access inside isolated git worktrees, with the orchestrator owning git operations (agents cannot run `git *` directly). The permission model is enforced at the orchestrator level rather than within Codex itself.

### Multi-Runtime Compatibility

The AGENTS.md format has become a de facto standard for agent instruction files across multiple runtimes. CORAL's `AgentRuntime` protocol abstracts over Claude Code, Codex, and OpenCode, with each runtime providing its own instruction filename:

- Claude Code: `CLAUDE.md`
- Codex: `AGENTS.md`
- OpenCode: per its own convention

This means AGENTS.md-compatible skills and instructions written for Codex work in contexts that understand the format, though hook execution (pre/post tool triggers) is not supported in Codex the way it is in Claude Code.

### Agent Skills Integration

Codex participates in the emerging [Agent Skills](../concepts/agent-skills.md) ecosystem. The `agentskills.io` specification (SKILL.md format with YAML frontmatter) is supported by Codex alongside Claude Code, Cursor, Gemini CLI, and GitHub Copilot. Skills deploy to `~/.codex/skills/` following standard agent path conventions.

[Everything Claude Code](https://github.com/affaan-m/everything-claude-code) includes Codex support via AGENTS.md format with a codex-specific installer, though with reduced capability: no hook execution, instruction-based support only. This creates a capability gap relative to Claude Code's 38 agents, 8 hook event types, and runtime permission controls.

## Key Numbers

**HumanEval (original Codex model, 2021):** 28.8% pass@1 at the time of release, improving to 72% with nucleus sampling (self-reported by OpenAI). This was the benchmark that established HumanEval as the standard evaluation for code generation. Numbers are from OpenAI's own paper and have not been independently replicated under identical conditions since the model was deprecated.

**Current CLI agent:** No published benchmark numbers for the CLI agent specifically on [SWE-bench](../projects/swe-bench.md) or [HumanEval](../projects/humaneval.md) as of this writing. OpenAI's benchmark reporting focuses on model-level scores (GPT-4o, o3) rather than agent-level scores for Codex CLI specifically.

**GitHub Stars (CLI repo):** 47,000+ stars. This reflects the OpenAI brand and the pent-up demand for an open CLI alternative to GitHub Copilot, not necessarily active daily usage.

## Strengths

**OpenAI ecosystem integration.** Codex connects directly to OpenAI's model stack, including o1/o3 reasoning models. For teams already using OpenAI APIs, Codex adds no new authentication or vendor relationships.

**AGENTS.md portability.** The instruction file format is simple enough that it has been adopted as a cross-runtime standard. Instructions written for Codex transfer to other runtimes that read AGENTS.md.

**Multi-agent pipeline participation.** CORAL's benchmarks show Codex functioning as a drop-in alternative to Claude Code within multi-agent optimization loops. The `AgentRuntime` protocol makes runtime substitution trivial for automated research pipelines.

**LiteLLM gateway compatibility.** Through CORAL's gateway pattern and LiteLLM's proxy, Codex can be routed through custom model endpoints, enabling model substitution without changing agent configuration. This is valuable for cost management across long autonomous runs.

## Critical Limitations

**No hook execution.** Claude Code supports six hook event types (PreToolUse, PostToolUse, UserPromptSubmit, Stop, PreCompact, Notification) enabling deterministic automation of quality gates, session persistence, and continuous learning. Codex has no equivalent hook system. Everything Claude Code's 20+ hook automations, AgentShield security scanning, and the instinct-based continuous learning system are unavailable in Codex. This is the single largest capability gap.

**Unspoken infrastructure assumption.** Codex in autonomous mode (`approval_policy: "never"`, `sandbox_mode: "danger-full-access"`) assumes the execution environment is already isolated. The agent will execute arbitrary shell commands without confirmation. Teams running Codex inside production environments, shared systems, or without container isolation face real risk. CORAL addresses this by running agents in git worktrees with explicit filesystem restrictions, but Codex itself provides no containment.

## When NOT to Use It

**When you need deterministic quality gates.** If your workflow requires automated security scanning, test enforcement before commits, or session-state persistence between runs, Claude Code's hook system gives you this. Codex does not.

**When you need per-tool permission scoping.** Claude Code allows rules like `Bash(git *)` as deny patterns and `Edit(/path/*)` as allow patterns per agent. Codex's sandbox model is binary: approve everything or approve nothing. For multi-agent systems where agents should have read access to sibling worktrees but write access only to their own, Codex requires external enforcement.

**When cross-platform skill compatibility matters more than OpenAI model access.** The Agent Skills ecosystem and SKILL.md format work across Claude Code, Cursor, Copilot, and Gemini CLI with richer runtime support. If your workflow depends on skills with hook triggers, resource loading, or progressive disclosure, Claude Code has deeper integration.

**When you need session resumption across machines.** CORAL's session resumption mechanism uses Claude Code's `--resume {session_id}` flag with saved session IDs. Codex has no equivalent documented session recovery mechanism. Long-running multi-agent experiments that may need to resume after failure work more reliably with Claude Code.

## Unresolved Questions

**Benchmark parity with Claude Code.** OpenAI has not published SWE-bench results for Codex CLI comparable to Anthropic's Claude Code numbers. Without independent evaluation under identical conditions, claims about relative coding agent capability are marketing, not engineering guidance.

**Cost at scale.** Autonomous multi-agent runs with Codex on premium models (o1, o3) accumulate costs faster than Claude Code on Sonnet. CORAL's gateway enables per-agent cost tracking, but there is no published analysis of Codex cost profiles for long-running research optimization tasks.

**Hook roadmap.** Whether OpenAI plans to add hook execution to Codex CLI is undocumented. The capability gap is significant enough that teams building automated pipelines must either use Claude Code or build hook-equivalent logic externally.

**AGENTS.md governance.** The format is used by multiple projects but has no formal specification body. Anthropic publishes CLAUDE.md conventions; OpenAI uses AGENTS.md; the agentskills.io spec covers SKILL.md. Behavior when all three are present in the same directory is not formally specified.

## Alternatives

**[Claude Code](../projects/claude-code.md)** — Use when you need hook execution, granular per-tool permissions, marketplace skill distribution, or Anthropic model access. The more mature ecosystem for automated agent pipelines.

**[Cursor](../projects/cursor.md)** — Use when your workflow is IDE-centric rather than terminal-centric. Cursor's inline editing and multi-file diff UI is better for interactive development; Codex CLI is better for autonomous scripted runs.

**[OpenCode](../projects/opencode.md)** — Use when you want an open-source terminal agent with no vendor lock-in. OpenCode supports SKILL.md, AGENTS.md, and custom tools via `opencode.json`, and integrates with CORAL's multi-agent system.

**[Gemini CLI](../projects/gemini-cli.md)** — Use when you need Google model access or Gemini's longer context windows for large-codebase tasks.

**[GitHub Copilot](../projects/github-copilot.md)** — Use when you want code completion integrated into VS Code or JetBrains without leaving the IDE. Copilot is the production surface for the original Codex model's capabilities, now running on GPT-4o.

**[CORAL](../projects/autoresearch.md)** — Use when you want to run Codex (or Claude Code, or OpenCode) inside a multi-agent optimization loop with shared knowledge, graded evaluation, and evolutionary search. CORAL is the orchestration layer above any individual coding agent.

## Relationship to Adjacent Concepts

Codex implements [Agent Skills](../concepts/agent-skills.md) via the SKILL.md format and contributes to [Multi-Agent Systems](../concepts/multi-agent-systems.md) as one of three supported runtimes in CORAL. The AGENTS.md instruction system is a form of [Context Engineering](../concepts/context-engineering.md): encoding project knowledge, constraints, and workflow procedures into persistent context that shapes agent behavior across sessions.

The original Codex model's contribution to [Agent Memory](../concepts/agent-memory.md) research was indirect: by establishing HumanEval as a benchmark and demonstrating that large-scale code pretraining produced qualitatively different code generation capabilities, it set the empirical baseline that subsequent work on coding agents has tried to exceed.


## Related

- [Claude Code](../projects/claude-code.md) — competes_with (0.8)
- [Cursor](../projects/cursor.md) — competes_with (0.8)
- [OpenCode](../projects/opencode.md) — competes_with (0.7)
- [Agent Skills](../concepts/agent-skills.md) — implements (0.6)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.5)
- [OpenClaw](../projects/openclaw.md) — alternative_to (0.6)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.7)
- [Gemini CLI](../projects/gemini-cli.md) — competes_with (0.8)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.5)
- [Anthropic](../projects/anthropic.md) — competes_with (0.7)
- [Claude](../projects/claude.md) — competes_with (0.8)
- [Windsurf](../projects/windsurf.md) — competes_with (0.7)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — part_of (0.5)
- [Antigravity](../projects/antigravity.md) — alternative_to (0.5)
- [AutoResearch](../projects/autoresearch.md) — implements (0.5)
- [LangChain](../projects/langchain.md) — part_of (0.5)
- [Windsurf](../projects/windsurf.md) — competes_with (0.7)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — part_of (0.5)
- [Antigravity](../projects/antigravity.md) — alternative_to (0.5)
