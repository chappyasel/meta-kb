---
entity_id: opencode
type: project
bucket: agent-systems
abstract: >-
  OpenCode is an open-source terminal-based AI coding agent that runs any LLM
  via OpenRouter/LiteLLM, distinguished by its Go backend, multi-runtime
  support, and native integration with the emerging Agent Skills ecosystem.
sources:
  - repos/human-agent-society-coral.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/alirezarezvani-claude-skills.md
  - repos/volcengine-openviking.md
  - repos/kepano-obsidian-skills.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - claude-code
  - codex
  - openclaw
  - gemini
  - rag
  - cursor
  - agent-skills
  - obsidian
  - bm25
  - vector-database
  - claude-md
  - context-management
  - github-copilot
  - antigravity
  - unknown-unknowns
last_compiled: '2026-04-07T11:37:27.514Z'
---
# OpenCode

## What It Is

OpenCode is an open-source terminal coding agent, broadly analogous to [Claude Code](../projects/claude-code.md) and [Cursor](../projects/cursor.md) but model-agnostic and self-hostable. It runs in the terminal, executes tools (bash, file read/write, search), and accepts the same `AGENTS.md` / `opencode.json` instruction file conventions that have emerged across the CLI agent ecosystem.

The project targets developers who want full control over their LLM backend, don't want to depend on Anthropic's billing, or are running agents inside automated pipelines where a GUI IDE is impractical. It competes directly with [Claude Code](../projects/claude-code.md), [OpenAI Codex](../projects/codex.md), [GitHub Copilot](../projects/github-copilot.md), and [Cursor](../projects/cursor.md) in the terminal/headless segment.

## Architectural Characteristics

OpenCode's distinguishing architectural choice is model agnosticism backed by [LiteLLM](../projects/litellm.md) and [OpenRouter](../projects/openrouter.md). Any model reachable through those proxies (Claude, GPT-4, Gemini, local models via [Ollama](../projects/ollama.md), [DeepSeek](../projects/deepseek.md)) runs through the same agent loop without code changes.

The configuration surface lives in `opencode.json` at the project root, which defines:
- Model and provider routing
- Tool permissions (what the agent can run)
- Custom tools (shell scripts exposed as agent capabilities)
- Hook plugins (pre/post tool event handlers)

The `.opencode/` directory convention houses `prompts/agents/` (subagent definitions), `commands/` (slash commands), `tools/` (custom tool scripts like `security-audit`, `run-tests`), and `plugins/` (hook plugins). This mirrors the `.claude/` layout closely enough that cross-harness skill collections like Everything Claude Code maintain a parallel `.opencode/` directory with equivalent content.

From the CORAL multi-agent system's source, OpenCode is explicitly supported as a first-class agent runtime alongside Claude Code and Codex. CORAL's `AgentRuntime` protocol abstracts the three runtimes uniformly, with OpenCode mapping its permissions to `opencode.json` format. Its instruction file is `opencode.json` rather than `CLAUDE.md` or `AGENTS.md`.

## How It Plugs Into the Broader Ecosystem

OpenCode participates in the [Agent Skills](../concepts/agent-skills.md) standard (`SKILL.md` files, as documented in the Obsidian-skills analysis). The agentskills.io specification names OpenCode as a compatible runtime alongside Claude Code, Codex, Cursor, Gemini CLI, and GitHub Copilot. Skills written to the SKILL.md standard are placed in `~/.opencode/skills/` and auto-discovered.

The Everything Claude Code project (a 156-skill, 38-agent configuration collection) explicitly maintains OpenCode parity with 11 hook event types and 6 native custom tools under `.opencode/`, making it the most feature-complete publicly available OpenCode configuration reference. This means practitioners can draw heavily on the ECC library as a starting point.

For [context management](../concepts/context-management.md), OpenCode integrates with the Hipocampus memory system (the file-based proactive memory architecture that uses a 3K-token compressed topic index). The Hipocampus repo explicitly lists OpenCode as a supported platform alongside Claude Code and OpenClaw.

[CORAL](../projects/openclaw.md) uses OpenCode as one of three agent runtimes in its multi-agent coding optimization system, running multiple OpenCode instances in parallel git worktrees with shared filesystem state.

## Context Management Approach

OpenCode follows the same [context management](../concepts/context-management.md) patterns as the broader CLI agent ecosystem. The `opencode.json` permission model scopes what tools agents can access. Like Claude Code, it reads instruction files from the project root and `.opencode/` directory.

The [CLAUDE.md](../concepts/claude-md.md) pattern applies here too, though the file is `opencode.json` for structured configuration and `AGENTS.md` for prose instructions. The same [progressive disclosure](../concepts/progressive-disclosure.md) approach used in SKILL.md files works in OpenCode: metadata loads at startup, full skill content loads on activation.

## Key Numbers

GitHub star counts and benchmark numbers for OpenCode specifically were not available in the source material. The project is newer than Claude Code and Codex, and independently validated performance benchmarks (e.g., [SWE-bench](../projects/swe-bench.md) scores) are not documented in available sources.

What is documented: OpenCode appears in multiple independent multi-platform projects (CORAL, Everything Claude Code, Hipocampus, Obsidian-skills) as a supported runtime, which suggests real adoption beyond the maintainer's own usage. The agentskills.io standard listing it alongside Anthropic and OpenAI products indicates it has enough traction to warrant ecosystem inclusion.

All adoption signals here are qualitative, not independently validated benchmark data.

## Strengths

**Model flexibility.** Swapping from Claude to Gemini to a local DeepSeek model requires changing a config value, not rewriting agent scaffolding. For teams with model procurement constraints, cost sensitivity, or air-gapped environments, this is the primary reason to choose OpenCode over Claude Code.

**Custom tool integration.** The `.opencode/tools/` convention lets teams expose arbitrary shell scripts as agent capabilities without writing plugin code. A `run-tests` tool or `security-audit` tool becomes a first-class agent action.

**Ecosystem portability.** Because OpenCode follows the Agent Skills standard and AGENTS.md conventions, the growing library of cross-platform skills (ECC's 156 skills, Hipocampus memory, Obsidian skills) works without modification.

**Multi-agent compatibility.** CORAL treats OpenCode as an equal runtime to Claude Code for spawning parallel autonomous coding agents in isolated worktrees.

## Limitations

**Concrete failure mode: Hook execution maturity.** The Everything Claude Code analysis explicitly notes that Codex gets "instruction-based support with no hook execution yet," and OpenCode gets 11 hook event types vs. Claude Code's 20+. Cross-harness parity is real but incomplete. Hooks that work in Claude Code (particularly complex pre/post tool chains) may not have OpenCode equivalents, meaning any configuration library built primarily for Claude Code degrades when ported.

**Unspoken infrastructure assumption.** OpenCode's model-agnostic positioning assumes you have stable API access to your chosen backend. In practice, this means either paying for OpenRouter/LiteLLM routing (adding a dependency and latency) or running a local model server (adding operational overhead). Teams expecting "just works" parity with Claude Code's hosted backend will hit setup friction.

**Documentation depth.** The available source material references OpenCode's configuration format and ecosystem integrations extensively but provides less implementation-level detail (no equivalent of Claude Code's deep architecture analysis). This makes it harder to reason about edge cases or failure modes without hands-on testing.

## When NOT to Use OpenCode

**When you need maximum benchmark-validated performance.** Claude Code and Codex both have published SWE-bench scores and external evaluations. OpenCode's performance is currently unverified by independent sources. If your use case requires documented task completion rates, pick a runtime with published benchmarks.

**When your team is on Anthropic's ecosystem already.** If you're using Claude models, paying Anthropic directly, and relying on Claude Code's session resumption, `CLAUDE.md` auto-loading, and hook ecosystem, switching to OpenCode introduces friction for limited gain. Claude Code's native integration with its own models is tighter than anything OpenCode can replicate via LiteLLM routing.

**When you need the richest hook ecosystem.** With 20+ event types vs. OpenCode's 11, Claude Code provides more granular automation surfaces. Complex pre-commit quality gates, per-tool-call monitoring, and session lifecycle hooks are better supported in Claude Code.

**When running long autonomous sessions requiring session resumption.** CORAL's session resumption mechanism uses Claude Code's `--resume` flag and session ID persistence. OpenCode's equivalent (if any) is not documented in available sources.

## Unresolved Questions

**Governance and maintenance trajectory.** Who maintains OpenCode, what the release cadence is, and how breaking changes in the agent skills ecosystem get adopted are not addressed in available documentation. For a project that multiple ecosystem tools depend on as a runtime, this matters.

**Cost at scale in multi-agent configurations.** Running OpenCode inside CORAL-style multi-agent systems routes all LLM traffic through the OpenRouter/LiteLLM proxy. Per-agent cost attribution, rate limiting behavior, and failure modes when the proxy is unavailable are undocumented.

**Context window behavior under pressure.** How OpenCode handles context exhaustion in long sessions, whether it has equivalent compaction behavior to Claude Code's `/compact` command, and how it interacts with the Hipocampus memory system's ROOT.md injection are not detailed in available sources.

**Conflict resolution in opencode.json.** When project-level `opencode.json` conflicts with user-level configuration, which takes precedence and how the agent signals the conflict is unclear.

## Alternatives: Selection Guidance

| When... | Use... |
|---|---|
| You need documented benchmark performance on coding tasks | [Claude Code](../projects/claude-code.md) or [Codex](../projects/codex.md) |
| You want model-agnostic routing with any backend | OpenCode |
| You need a full IDE with GUI, codebase indexing, and tab completion | [Cursor](../projects/cursor.md) or [Windsurf](../projects/windsurf.md) |
| You're building multi-agent coding optimization pipelines | [Claude Code](../projects/claude-code.md) via CORAL (better documented runtime support) |
| You need the richest hook/automation ecosystem | [Claude Code](../projects/claude-code.md) |
| You want proactive memory across sessions in a file-based system | Any runtime + Hipocampus (works with OpenCode, Claude Code, OpenClaw) |
| You're running completely local models | OpenCode via [Ollama](../projects/ollama.md) backend |

The clearest selection signal: if you know which model you're using and it's Claude, use Claude Code. If you need to swap models frequently, run local models, or avoid vendor lock-in, OpenCode is the natural choice given its explicit design for that use case.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md): The SKILL.md standard OpenCode participates in
- [CLAUDE.md](../concepts/claude-md.md): The instruction file pattern OpenCode adapts as `opencode.json`/`AGENTS.md`
- [Context Management](../concepts/context-management.md): How OpenCode manages context within sessions
- [Context Engineering](../concepts/context-engineering.md): Techniques applicable across all CLI agents including OpenCode
