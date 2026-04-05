---
entity_id: codex
type: project
bucket: agent-systems
abstract: >-
  OpenAI's cloud-based agentic coding system that executes multi-step software
  tasks in isolated sandboxes, now positioned as a cloud agent runtime rather
  than just a code-generation model.
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/affaan-m-everything-claude-code.md
  - repos/memorilabs-memori.md
  - repos/human-agent-society-coral.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/caviraoss-openmemory.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/kepano-obsidian-skills.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - Claude Code
  - Anthropic
  - OpenAI
  - Claude
  - Andrej Karpathy
  - Retrieval-Augmented Generation
  - Cursor
  - Model Context Protocol
  - AutoResearch
  - OpenClaw
  - OpenCode
  - Google Gemini
  - Windsurf
  - Agent Skills
  - skill.md
  - Procedural Memory
  - GitHub Copilot
  - HumanEval
  - GitHub Copilot
last_compiled: '2026-04-05T20:23:25.557Z'
---
# OpenAI Codex

## What It Is

OpenAI Codex originally referred to the code-generation model (based on GPT-3) that powered GitHub Copilot starting in 2021. By 2025-2026, "Codex" had been relaunched as a cloud-based coding agent: a hosted service where you describe a task, and Codex autonomously writes code, runs tests, navigates codebases, and opens pull requests in isolated cloud environments. The model behind it is a version of o3/o4-mini optimized for code and agentic tasks.

The architectural shift matters. Earlier Codex was a completion API. Current Codex is an agent runtime: it spins up sandboxed containers with your repository checked out, executes shell commands, reads file trees, runs test suites, and produces commits. Users interact through a web UI or CLI (`openai codex`), not through a raw API completion endpoint.

## Core Mechanism

### Sandbox Execution Model

Each Codex task runs in an isolated cloud container with:
- The target repository cloned in
- Network access configurable (off by default for security)
- A task description injected as the agent's goal
- Tool access: file read/write, bash execution, git operations

The agent loop mirrors what Claude Code and similar tools do locally, but runs entirely in OpenAI's infrastructure. This is the key differentiator from Copilot (which suggests completions) and from local agents (which run on the developer's machine). Codex runs asynchronously: you submit a task, it works for minutes to hours, then returns results.

### AGENTS.md Configuration

Codex uses an `AGENTS.md` file at the repository root as its primary configuration surface. This file tells the agent how the codebase is structured, which commands to run for tests, and any project-specific conventions. The format is unstructured markdown, intentionally similar to how Claude Code uses `CLAUDE.md`.

Multiple agent skill frameworks have built explicit Codex support around `AGENTS.md`. Everything Claude Code's cross-platform installer writes platform-appropriate instruction files (CLAUDE.md, AGENTS.md, GEMINI.md) from a shared canonical skill set. The CORAL multi-agent orchestration system treats Codex as a first-class runtime alongside Claude Code and OpenCode, spinning up Codex agents in git worktrees via `approval_policy = "never"` and `sandbox_mode = "danger-full-access"` for autonomous operation.

### Skill Ecosystem Integration

The broader agent skill ecosystem treats Codex as a supported but secondary target. From the cross-platform skill registries analyzed:

- **Everything Claude Code**: Provides Codex support via `AGENTS.md` format with a codex-specific installer. Coverage is instruction-based only — no hook execution, no runtime automations. Claude Code gets 38 agents, 8 hook event types, and 72 commands; Codex gets a configuration file.
- **gstack**: Includes a `/codex` skill that submits code to OpenAI's Codex CLI for independent review, then produces a cross-model analysis comparing Claude's findings with Codex's. This positions Codex as a second-opinion reviewer rather than a primary agent.
- **CORAL**: Supports Codex as an `AgentRuntime` protocol implementation alongside Claude Code and OpenCode. Codex agents run in isolated git worktrees, share state through `.coral/public/` filesystem primitives, and participate in the same heartbeat/plateau-detection system as other runtimes.
- **planning-with-files**: Ships an `ide/codex` branch adapting its planning skill to Codex's hook conventions.

## Key Numbers

**Historical benchmark (HumanEval)**: The original 2021 Codex model achieved ~72% pass@1 on HumanEval, a benchmark it partly influenced (OpenAI created HumanEval). Self-reported. More recent agentic Codex variants are not evaluated on HumanEval specifically — the benchmark is too simple for current capabilities.

**GitHub Copilot**: Codex powered Copilot from 2021 onward. Copilot reached 1.3 million paid subscribers by early 2023 (GitHub-reported). Current Copilot uses newer GPT-4-class models, not the original Codex model.

**Adoption**: OpenAI has not published task completion rates or agent success benchmarks for the current cloud Codex agent. Community comparisons with Claude Code are anecdotal.

## Strengths

**Asynchronous, zero-infrastructure execution**: Tasks run in OpenAI's cloud without the developer maintaining local agent infrastructure, managing tool permissions, or keeping a terminal open. This matters for long-running tasks (refactors, large test suites) where a local agent would require an uninterrupted session.

**Parallel task execution**: Multiple Codex tasks can run simultaneously on the same codebase. This mirrors gstack's parallel sprint pattern but without the developer managing multiple terminal sessions.

**Model quality on code**: o3/o4-mini variants show strong performance on reasoning-heavy coding tasks — particularly debugging, algorithm implementation, and code explanation. Independent evaluations (SWE-bench) rank OpenAI models competitively with Anthropic models on software engineering tasks.

**Copilot ecosystem integration**: For teams already using GitHub Copilot, Codex operates within the same platform and authentication model.

## Critical Limitations

**Concrete failure mode — hook system gap**: The most significant practical limitation is that Codex has no hook execution system equivalent to Claude Code's PreToolUse/PostToolUse/Stop hooks. Every quality gate, security check, progress tracker, and learning system in the agent skill ecosystem depends on hooks. Codex agents receive instructions but cannot be interrupted, redirected, or quality-gated by external scripts during execution. The planning-with-files skill's core mechanism — re-reading the task plan before every tool call via PreToolUse hook — simply does not work in Codex. You get a static instruction file, not a dynamic automation layer.

**Unspoken infrastructure assumption**: Codex assumes your codebase is on GitHub (or accessible to OpenAI's infrastructure). Teams with air-gapped repositories, self-hosted GitLab, or strict data residency requirements cannot use the cloud agent. Local Codex CLI exists but lacks the asynchronous execution model.

## When NOT to Use It

**Don't use Codex when you need runtime behavior control.** If your workflow depends on hooks — quality gates that block bad commits, security scanners that intercept dangerous operations, learning systems that capture patterns across sessions — Codex cannot support them. Claude Code's hook system is architecturally incompatible with Codex's instruction-only model.

**Don't use Codex for data-sensitive codebases.** The cloud execution model sends your source code to OpenAI's infrastructure. Enterprise teams with compliance requirements (SOC 2, HIPAA, financial data) need to evaluate whether this is acceptable. Claude Code (local) and OpenCode give you agent execution on your own hardware.

**Don't use Codex as your primary agent if you've invested in cross-session learning systems.** The instinct/learning systems in ECC, gstack's JSONL learnings store, and CORAL's shared state primitives all assume an agent that persists state across sessions on a local filesystem. Codex's cloud execution model lacks a persistent per-developer state layer.

**Don't use Codex if you need fine-grained task orchestration.** CORAL's multi-agent system treats Codex as one possible runtime, but the platform coverage asymmetry is real. Claude Code gets 8 hook event types and session resumption; Codex gets instruction files. For coordinated multi-agent workflows with plateau detection, knowledge sharing, and heartbeat intervention, Claude Code is the better-supported target.

## Unresolved Questions

**Cost at scale**: OpenAI has published pricing for API access but not clear pricing for the cloud Codex agent's async task execution. For teams running dozens of parallel tasks, the cost model is opaque.

**Data handling and training**: OpenAI's terms permit using API inputs to train models unless you opt out. Whether code submitted through the Codex cloud agent is subject to training use (and how to opt out) is not clearly documented for the agent product specifically.

**Governance of AGENTS.md format**: The `AGENTS.md` format is de facto standard across Codex, but OpenAI has not published a formal specification comparable to Anthropic's Agent Skills spec (`agentskills.io`). Community skill authors write Codex support as an afterthought with no official validation tooling.

**Session state and resumption**: When a Codex cloud task fails partway through (model error, timeout, task too large), the recovery path is unclear. Claude Code's `--resume` flag and CORAL's session ID-based restart depend on persistent session files that cloud Codex may not expose.

## Alternatives

- **[Claude Code](../projects/claude-code.md)**: Use when you need hook-based automation, local execution, or integration with the richer agent skill ecosystem. The default choice for teams building custom workflows.
- **GitHub Copilot**: Use when you want inline autocomplete and chat within the editor without agentic task execution. Codex extends rather than replaces Copilot.
- **Cursor / Windsurf**: Use when you want agentic capabilities embedded in a full IDE UI with persistent project context.
- **[OpenCode](../projects/opencode.md)**: Use when you want a Claude Code-comparable local agent with strong cross-platform skill support and OpenAI model options.
- **CORAL (multi-agent)**: Use when you need parallel agent optimization across multiple runtimes simultaneously — CORAL can mix Codex, Claude Code, and OpenCode agents on the same task.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md): The SKILL.md standard that cross-platform skill registries use to target Codex alongside other runtimes
- [Procedural Memory](../concepts/procedural-memory.md): The learning/instinct systems that Codex cannot support due to the hook execution gap
- [Model Context Protocol](../concepts/model-context-protocol.md): The tool-access layer that Codex implements for file and shell operations
