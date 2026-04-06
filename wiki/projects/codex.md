---
entity_id: codex
type: project
bucket: agent-systems
abstract: >-
  OpenAI's code-focused AI system, spanning the foundational Codex model, code
  generation API, and Codex CLI agent — the first major coding agent to ship
  AGENTS.md as a cross-platform instruction standard.
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/affaan-m-everything-claude-code.md
  - repos/human-agent-society-coral.md
  - repos/karpathy-autoresearch.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/kepano-obsidian-skills.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - Claude Code
  - Cursor
  - OpenCode
  - Gemini
  - Andrej Karpathy
  - Claude
  - Agent Skills
  - skill.md
  - AutoResearch
  - Model Context Protocol
  - Anthropic
  - OpenClaw
last_compiled: '2026-04-05T23:01:52.429Z'
---
# OpenAI Codex

## What It Is

OpenAI Codex refers to three related but distinct things that share a name across different eras:

1. **The original Codex model (2021–2023)**: A GPT-3 fine-tune on 159GB of public GitHub code, released via API and used to power GitHub Copilot. Deprecated March 2023.

2. **The GPT-4o-based Codex system (2025)**: A cloud-hosted coding agent running inside OpenAI's infrastructure, announced May 2025. Tasks run in isolated containers with internet access and can operate for hours. Distinct from local execution.

3. **Codex CLI (2025)**: An open-source command-line agent wrapping the OpenAI API, enabling local agentic coding. Analogous to Claude Code's CLI, OpenCode, or Gemini CLI. Available at `github.com/openai/codex`.

This card primarily covers the CLI agent and its integration patterns, since that is the operationally relevant artifact for teams building with or against it. The cloud agent is relevant as the underlying inference substrate.

## Architectural Distinctives

### AGENTS.md as a Cross-Platform Standard

The most significant artifact Codex CLI introduced is the `AGENTS.md` convention. Where Claude Code reads `CLAUDE.md` and Gemini CLI reads `GEMINI.md`, Codex agents look for `AGENTS.md` at the repository root. This file serves as the primary instruction layer: task scope, codebase conventions, tool permissions, and agent directives.

What started as Codex's native instruction format has since been adopted as a cross-platform portable standard. The [Everything Claude Code](../projects/everything-claude-code.md) harness ships a unified `AGENTS.md` that works across Claude Code, Codex, OpenCode, and Gemini without modification. The CORAL multi-agent orchestrator writes `AGENTS.md` for Codex agents alongside `CLAUDE.md` for Claude Code agents within the same worktree. In practice, `AGENTS.md` has become the lowest-common-denominator instruction file across the agentic coding ecosystem.

### Approval Policy and Sandbox Controls

Codex CLI exposes `approval_policy` as a top-level runtime configuration, with values ranging from `"suggest"` (maximum human oversight) to `"never"` (fully autonomous). The `sandbox_mode` field accepts `"danger-full-access"` for environments where the operator trusts the agent with unrestricted filesystem and network access.

This explicit permission model contrasts with Claude Code's approach, which uses `.claude/settings.json` with per-tool allow/deny lists. Codex's model is coarser but clearer for operators who want simple on/off semantics rather than per-tool granularity.

The [CORAL orchestrator](../raw/deep/repos/human-agent-society-coral.md) uses `approval_policy = "never"` and `sandbox_mode = "danger-full-access"` for autonomous coding agents. This combination enables Codex to run inside git worktrees without human interruption, which is required for CORAL's multi-agent evolutionary search pattern.

### Instruction-Based Hooks (vs Event-Based Hooks)

Claude Code exposes `PreToolUse`, `PostToolUse`, `Stop`, and `UserPromptSubmit` hooks that fire on lifecycle events and can inject content or block execution. Codex CLI does not implement this hook system. Automation that requires lifecycle interception — re-reading a plan file before every tool call, running a security scanner after every edit, blocking the agent from stopping until a checklist passes — cannot be expressed natively in Codex.

The [Everything Claude Code](../raw/deep/repos/affaan-m-everything-claude-code.md) project acknowledges this gap directly: Codex support is described as "instruction-based support via AGENTS.md format with codex-specific installer (no hook execution yet)." This means the 38-agent orchestration system, the 20+ hook event types, and the continuous learning instinct system all degrade to static text instructions when deployed to Codex.

The [planning-with-files skill](../raw/deep/repos/othmanadi-planning-with-files.md) — which implements the Manus-style "filesystem as working memory" pattern — ships a Codex-specific branch (`ide/codex`) that adapts the hook logic into instruction text. The PreToolUse hook that re-reads `task_plan.md` before every tool call becomes a written instruction: "Before each tool call, re-read the first 30 lines of task_plan.md." The behavior depends entirely on model instruction-following rather than system enforcement.

## Key Numbers

**Original Codex model**: Fine-tuned on 159GB of public GitHub code. Scored 28.8% on HumanEval at release (2021), a self-reported OpenAI benchmark. GPT-4-class models later scored 85%+ on the same benchmark, making the original metric largely historical.

**Codex CLI**: Open source, Apache 2.0. GitHub star counts are not cited here because they fluctuate and do not reflect active usage.

**Cloud Codex agent (2025)**: Runs in OpenAI's infrastructure with multi-hour task horizons. No independent benchmark scores for this configuration have been published as of the knowledge cutoff. Performance claims in OpenAI blog posts are self-reported.

The original HumanEval scores are the most-cited Codex numbers in external literature and represent a moment when Codex was meaningfully ahead of alternatives. That gap no longer exists; current frontier models from Anthropic, Google, and OpenAI all score in similar ranges on standardized coding benchmarks.

## Strengths

**AGENTS.md portability**: Because multiple agent runtimes adopted this format, Codex-compatible instruction files work across the widest range of tools. A team writing `AGENTS.md` once can deploy it to Codex, Claude Code (via compatibility), OpenCode, and Gemini CLI with minimal adaptation.

**Simple permission semantics**: The `approval_policy` / `sandbox_mode` combination is easier to configure than Claude Code's per-tool allow/deny model for teams that want broad autonomy grants rather than fine-grained control.

**OpenAI ecosystem integration**: For teams already on the OpenAI API — paying for GPT-4o, using Assistants, building on OpenAI's infrastructure — Codex CLI integrates without adding a second vendor relationship.

**Research community familiarity**: The original Codex model is cited in thousands of papers. Teams working in AI research have existing intuitions about Codex behavior that do not transfer as directly to Claude Code or Gemini.

## Critical Limitations

**No native lifecycle hooks**: The absence of `PreToolUse`/`PostToolUse` event hooks is the most concrete operational gap. Any workflow that requires deterministic behavior injection at tool-call boundaries — context re-injection, security scanning, progress logging, completion verification — must be expressed as prompt instructions and depends on model compliance rather than system enforcement. Under long sessions or complex task chains, models drift from instructions. Hooks prevent drift by making compliance structural rather than aspirational.

**Unspoken infrastructure assumption**: Codex CLI assumes OpenAI API availability for every tool call. Unlike locally-run models (Ollama, llama.cpp) or Anthropic's Claude, there is no offline fallback. Teams in air-gapped environments, with strict data residency requirements, or operating in regions with unreliable API connectivity cannot use Codex CLI without architectural workarounds.

## When NOT to Use Codex CLI

**When you need deterministic lifecycle automation**: If your workflow requires pre-tool content injection, post-tool validation, or completion gating — patterns documented in planning-with-files, ECC, and the agentic researcher framework — Claude Code's native hook system is the better choice. Expressing these patterns as instructions in Codex degrades reliability under long sessions.

**When you need per-tool permission granularity**: Claude Code's allow/deny lists let you say "this agent can read any file but can only write to `/src`." Codex's approval model is coarser. For security-sensitive environments where tool scope isolation matters, Claude Code or OpenCode with explicit tool restrictions is more appropriate.

**When data cannot leave your infrastructure**: All Codex CLI inference goes to OpenAI's API. If your code contains trade secrets, regulated data, or IP that cannot transit third-party infrastructure, you need a locally-run alternative (Ollama + OpenCode, or a self-hosted inference endpoint) rather than Codex.

**When you need cross-agent orchestration with shared state**: The CORAL multi-agent system works with Codex, but Codex agents cannot write to shared directories the same way Claude Code agents can, and hook-based coordination is unavailable. For multi-agent workloads that require tight coordination, Claude Code's richer runtime model is preferable.

## Unresolved Questions

**Cost at scale for cloud Codex**: The cloud-hosted Codex agent (not the CLI) runs multi-hour tasks inside OpenAI infrastructure. Pricing for long autonomous sessions has not been published in a way that enables reliable cost modeling before committing to the platform.

**Hook roadmap**: OpenAI has not published a roadmap for lifecycle hooks in Codex CLI. The gap relative to Claude Code is documented but there is no public commitment to close it.

**AGENTS.md governance**: No formal specification body owns the AGENTS.md standard. Multiple projects have adopted it as a de facto cross-platform format, but what happens when OpenAI, Anthropic, and Google's implementations diverge is unresolved.

**Model identity**: The cloud Codex agent runs on "a version of o3 fine-tuned for coding tasks" according to May 2025 announcement materials. The exact model, fine-tuning approach, and how it differs from vanilla o3 are not publicly documented.

## Alternatives and Selection Guidance

**[Claude Code](../projects/claude-code.md)**: Use when you need lifecycle hooks, per-tool permissions, or multi-agent orchestration via the MCP ecosystem. The richer runtime model costs more complexity to configure.

**[OpenCode](../projects/opencode.md)**: Use when you want a model-agnostic CLI agent that can run against any OpenAI-compatible endpoint, including local models. OpenCode implements a similar hook system to Claude Code and is the most direct Codex alternative for teams that want local inference.

**[Cursor](../projects/cursor.md)**: Use when the primary interface is an IDE rather than a terminal. Cursor's inline diff and multi-file edit UX is better suited for interactive coding sessions than Codex CLI's terminal-centric model.

**[Gemini CLI](../projects/gemini.md)**: Use when you need the largest available context window (Gemini 1.5 Pro's 2M token limit exceeds what Codex exposes) or when integrating with Google Cloud infrastructure.

For teams building agent harnesses that need to support multiple runtimes: write your skill/agent definitions to the AGENTS.md format first, since it has the broadest cross-platform adoption, then add Claude Code hooks as an enhancement layer for platforms that support them.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md)
- [Model Context Protocol](../concepts/model-context-protocol.md)
