---
entity_id: codex
type: project
bucket: agent-architecture
abstract: >-
  OpenAI's Codex covers two distinct things: a code-generation model family
  (2021) that powered GitHub Copilot, and a 2025 cloud-based coding agent that
  operates in sandboxed environments using o3/o4-mini. The differentiator is the
  agent's asynchronous, parallelizable task execution model.
sources:
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/kepano-obsidian-skills.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - repos/affaan-m-everything-claude-code.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/human-agent-society-coral.md
  - repos/kepano-obsidian-skills.md
  - repos/matrixorigin-memoria.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
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
  - autoresearch
  - windsurf
  - multi-agent-systems
  - antigravity
last_compiled: '2026-04-08T22:58:28.250Z'
---
# OpenAI Codex

## What It Is

OpenAI Codex refers to two related but distinct things that share a name and lineage.

**Codex (2021 model):** A GPT-3-based model fine-tuned on ~54 million public GitHub repositories, introduced in the paper *Evaluating Large Language Models Trained on Code* (Chen et al., 2021). It powered GitHub Copilot at launch and established the benchmark ([HumanEval](../projects/humaneval.md)) that the field still uses. The API was deprecated in March 2023 as GPT-3.5/4 surpassed it.

**Codex (2025 agent):** A cloud-based [multi-agent](../concepts/multi-agent-systems.md) coding assistant released in April 2025, built on o3/o4-mini reasoning models. It runs tasks in isolated cloud sandboxes, operates asynchronously (multiple tasks in parallel), and integrates directly with GitHub repositories. This is the active product as of 2026.

This card covers both, with emphasis on the 2025 agent since that is what users encounter today.

---

## The 2021 Model: Foundation and Architecture

The original Codex fine-tuned GPT-3 on a filtered corpus of public GitHub code. The paper reported two primary variants: `code-cushman-001` (12B parameters) and `code-davinci-002` (believed ~175B). Key results:

- `code-davinci-002` solved 72% of HumanEval problems (pass@1 with temperature 0) — self-reported in the original paper, later independently reproduced across the community in benchmark comparisons
- The dataset filtering removed files over 1MB, files with >90% non-alphanumeric characters, and auto-generated code

The HumanEval benchmark was published alongside the model: 164 hand-written Python problems with unit tests. It became the de facto standard for evaluating code generation, used in comparisons for [Claude](../projects/claude.md), [Gemini](../projects/gemini.md), and every subsequent code model.

GitHub Copilot launched June 2021 using this model. At peak, Copilot had ~1.8 million paid subscribers (GitHub's reported figures, 2023). The underlying model was replaced incrementally with GPT-4 Turbo derivatives by 2023.

---

## The 2025 Agent: Architecture

### Core Mechanism

The 2025 Codex agent runs inside ephemeral cloud containers provisioned per task. Each container gets a fresh clone of the user's GitHub repository, an internet-disconnected execution environment (configurable), and preinstalled dependencies from the `setup.sh` pattern documented in the agent's AGENTS.md specification.

The execution model is fundamentally different from [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), or [Gemini CLI](../projects/gemini-cli.md): Codex runs **asynchronously**. Users submit tasks and receive results — often 15-30 minutes later for complex requests. Multiple tasks run in parallel. This suits batch workflows but is a poor fit for interactive sessions.

The agent uses `o3` by default with `o4-mini` available for faster/cheaper tasks. The reasoning models provide more reliable multi-step planning than earlier GPT-4 variants.

### AGENTS.md

Codex reads `AGENTS.md` from the repository root, analogous to [CLAUDE.md](../concepts/claude-md.md) for Claude Code. This file encodes:

- Repository structure orientation
- Build/test commands
- Constraints on what the agent should and shouldn't modify
- Style conventions

AGENTS.md became the instruction format adopted by [CORAL](../projects/coral.md) and [Everything Claude Code](../projects/antigravity.md) for multi-runtime compatibility — when systems need to support both Claude Code and Codex, AGENTS.md provides a common denominator. [OpenCode](../projects/opencode.md) also supports this format.

### Sandboxing Model

Each task runs in a container with:
- Full read/write access to the cloned repository
- Configurable network access (default: restricted)
- Shell execution with no interactive prompts

The container persists for the duration of a task, then is destroyed. There is no persistent filesystem across tasks — state lives entirely in git commits. Codex outputs a pull request or diff that the user reviews.

This is an explicit design choice: the agent produces code changes for human review rather than deploying autonomously. It sits in a different trust tier than fully autonomous agents.

### Multi-Agent Coordination

Codex supports parallel task dispatch. A user can submit 5-10 coding tasks simultaneously, and they run in separate containers concurrently. This is the clearest operational difference from Claude Code, which operates in a single session. For large refactors decomposed into independent subtasks, the parallel model can reduce wall-clock time substantially.

CORAL explicitly supports Codex as a runtime alongside Claude Code and OpenCode. In CORAL's architecture (`coral/agent/runtime.py`), the `AgentRuntime` protocol abstracts across runtimes, with Codex's configuration using `approval_policy = "never"` and `sandbox_mode = "danger-full-access"` for autonomous operation in CORAL's own sandboxed worktrees.

---

## Benchmarks

**2021 model (HumanEval, self-reported in Chen et al. 2021):**
- `code-cushman-001`: 33% pass@1
- `code-davinci-002`: 72% pass@1 (with repeated sampling)

These numbers are from OpenAI's own paper. Third-party evaluations at the time largely confirmed the relative ranking but often measured different temperature/sampling settings.

**2025 agent (SWE-bench Verified):**
OpenAI reported ~49.2% on [SWE-bench](../projects/swe-bench.md) Verified with o3 in April 2025. This is self-reported. Independent evaluations on SWE-bench from the community have generally placed Codex in the competitive range with Claude Code (which Anthropic reported at ~72% on SWE-bench Verified in mid-2025), but direct head-to-head comparisons on identical task sets under controlled conditions are sparse. Treat all SWE-bench numbers with appropriate skepticism — benchmark conditions (harness version, problem selection, temperature) vary enough that comparisons across organizations are unreliable.

---

## Strengths

**Asynchronous batch execution.** For workflows where a developer wants to parallelize 10 independent tasks — writing tests, adding type annotations, refactoring a module, updating documentation — Codex's model fits naturally. Submitting tasks and reviewing PRs later matches existing code review workflows.

**GitHub-native integration.** Codex connects directly to GitHub repos and outputs pull requests. No local installation. For teams already centered on GitHub, this is genuinely lower friction than running a local agent.

**Reasoning model backbone.** o3/o4-mini provide more reliable multi-step task decomposition than earlier models. Complex refactors that require consistent edits across 20+ files perform better with reasoning models.

**Broad agent ecosystem compatibility.** AGENTS.md is now read by Claude Code, OpenCode, Gemini CLI, and CORAL. Code written to the AGENTS.md convention works across runtimes.

---

## Limitations

**Concrete failure mode: context loss on large repositories.** Codex clones the full repository into the container, but the model's context window does not scale with repository size. On large codebases (>100k LOC), the agent frequently misses relevant files — it does not retrieve semantically related code, it reads files it explicitly navigates to. A refactor touching 30 files in a 500-file codebase will miss dependencies the agent didn't explicitly seek out. Claude Code with MCP-based semantic search ([Model Context Protocol](../concepts/model-context-protocol.md)) handles this more gracefully because it can query the codebase rather than only browsing it.

**Unspoken infrastructure assumption: GitHub as the source of truth.** Codex is designed for GitHub-hosted repositories. GitLab, Bitbucket, self-hosted git, or monorepos with non-standard CI pipelines are second-class. The pull request workflow assumes GitHub's PR model. Teams using other systems can work around this with manual setup, but the integrations are not maintained.

**Asynchronous model as a limitation.** Interactive debugging, exploratory sessions ("what's wrong with this test, let's figure it out together"), and tasks requiring multiple rounds of clarification are ill-suited to Codex's async model. You submit, wait, review — you can't steer mid-task. Claude Code, Cursor, and Gemini CLI all support interactive back-and-forth.

**No persistent memory across tasks.** Each container starts fresh. Unlike [Mem0](../projects/mem0.md) integrations or CLAUDE.md approaches that accumulate preferences, Codex has no mechanism to learn user conventions over time beyond what's in AGENTS.md.

**Cost at scale is unresolved.** OpenAI prices Codex per task rather than per token in the agent interface. For high task volume (CI-integrated automatic PR generation, large teams using parallel tasks), the cost structure is not transparently documented. Teams scaling to hundreds of tasks per day should model costs carefully before committing.

---

## When NOT to Use Codex

**Interactive debugging sessions.** If you need to explore a bug with a model — running a test, seeing the failure, asking follow-up questions, adjusting — use Claude Code or Gemini CLI. Async task submission doesn't support this pattern.

**Non-GitHub environments.** GitLab, Bitbucket, or self-hosted git requires custom integration work that isn't officially supported.

**Tasks requiring real-time tool access.** If the task needs web search, database queries, or live API calls during execution, Codex's sandboxed containers restrict this by default. [Claude Code](../projects/claude-code.md) with MCP tool integrations handles this better.

**Workflows requiring continuous agent memory.** If you want the agent to remember preferences, past decisions, and project conventions across many sessions, you need either a system that maintains explicit memory (AGENTS.md updated manually, or systems like [Letta](../projects/letta.md) with managed memory) or a local agent with context persistence.

---

## Unresolved Questions

**Governance of training data.** The 2021 model was trained on ~54M public GitHub repositories, raising copyright questions that remain in litigation (GitHub Copilot lawsuits). It's unresolved whether output from models trained on public code creates derivative works obligations.

**Conflict resolution in parallel tasks.** When multiple parallel Codex tasks modify overlapping files, the output is multiple PRs with potentially conflicting diffs. Codex does not coordinate across parallel tasks — the user resolves conflicts during review. For tasks that touch the same modules, this is a significant operational overhead that isn't documented prominently.

**SWE-bench benchmark conditions.** OpenAI's self-reported SWE-bench Verified numbers don't fully specify the harness configuration, temperature, retry budget, or whether the model received additional scaffolding. Comparing against Anthropic's Claude Code or Google's Gemini numbers requires knowing these parameters. They aren't published.

**Container resource limits.** The documentation doesn't specify container CPU/memory limits or what happens when a task exceeds them. Long-running builds (Rust, C++, ML training) that require substantial compute may hit undocumented limits.

---

## Alternatives

**[Claude Code](../projects/claude-code.md)** — Use when you need interactive sessions, semantic codebase search, MCP tool integrations, or higher SWE-bench performance on complex tasks. Claude Code's 72% SWE-bench Verified (Anthropic self-reported, mid-2025) vs. Codex's ~49% reflects substantive capability difference on real repository tasks.

**[Cursor](../projects/cursor.md)** — Use when you want IDE-integrated assistance with real-time completions and inline edits. Cursor's advantage is the tight editor loop; Codex's is batch parallelism.

**[Gemini CLI](../projects/gemini-cli.md)** — Use when you need large context windows (Gemini 2.5's 1M token context handles large codebase ingestion better than Codex's container-browse approach) or Google ecosystem integration.

**[OpenCode](../projects/opencode.md)** — Use when you want a self-hosted, open-source terminal agent compatible with AGENTS.md. Lower cost, more control, less polish.

**[CORAL](../projects/coral.md)** — Use when you want multi-agent parallel optimization against a scoring function. CORAL can run Codex as one of its agent runtimes alongside Claude Code and OpenCode, giving you the parallel exploration benefit with shared knowledge across agents.

---

## Relationship to Broader Ecosystem

The 2021 Codex model is the direct ancestor of [GitHub Copilot](../projects/github-copilot.md), which branched off as a Microsoft/GitHub product. The HumanEval benchmark it introduced remains the standard reference for code generation capability comparisons.

The 2025 agent implements [agent skills](../concepts/agent-skills.md) via the AGENTS.md format and operates as a node in [multi-agent systems](../concepts/multi-agent-systems.md) when composed with orchestrators like CORAL. Its sandbox model reflects a specific point in the [human-in-the-loop](../concepts/human-in-the-loop.md) design space: autonomous execution, human review of outputs.

[Context engineering](../concepts/context-engineering.md) in Codex is primarily managed through AGENTS.md rather than dynamic retrieval. The agent reads static instructions rather than constructing context from semantic search — a simpler but less adaptive approach than RAG-augmented alternatives.


## Related

- [Claude Code](../projects/claude-code.md) — competes_with (0.8)
- [Cursor](../projects/cursor.md) — competes_with (0.8)
- [OpenCode](../projects/opencode.md) — competes_with (0.7)
- [Agent Skills](../concepts/agent-skills.md) — implements (0.6)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.5)
- [OpenClaw](../projects/openclaw.md) — competes_with (0.5)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.6)
- [Gemini CLI](../projects/gemini-cli.md) — competes_with (0.8)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.5)
- [Anthropic](../projects/anthropic.md) — competes_with (0.7)
- [AutoResearch](../projects/autoresearch.md) — implements (0.4)
- [Windsurf](../projects/windsurf.md) — competes_with (0.7)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — implements (0.4)
- [Antigravity](../projects/antigravity.md) — part_of (0.4)
