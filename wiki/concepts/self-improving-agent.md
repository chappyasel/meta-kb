---
entity_id: self-improving-agent
type: concept
bucket: self-improving
abstract: >-
  Self-Improving Agent: an AI agent that modifies its own capabilities,
  strategies, or knowledge from experience, distinguished by closing the
  feedback loop without human intervention in each iteration.
sources:
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/alirezarezvani-claude-skills.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/uditgoenka-autoresearch.md
  - repos/evoagentx-evoagentx.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
related:
  - andrej-karpathy
  - autoresearch
  - claude-code
  - rag
  - openclaw
  - cursor
last_compiled: '2026-04-07T11:48:52.708Z'
---
# Self-Improving Agent

## What It Is

A self-improving agent is an AI system that modifies its own behavior based on the results of past actions. The modification can target any combination of three layers: the agent's knowledge base (what it knows), its strategies or prompts (how it reasons), or its code and tools (what it can do).

The concept is old in ML. What's new is that large language models can now read their own outputs, judge quality against a rubric, propose changes, implement those changes as code or text, and verify the result, all within a single agentic loop. This collapses what used to require separate human-in-the-loop cycles into an automated flywheel.

The core pattern, articulated by [Andrej Karpathy](../concepts/andrej-karpathy.md) in his autoresearch work and popularized by downstream projects like [AutoResearch](../projects/autoresearch.md), has three required components:

1. A **mechanical metric** — a number the system can compute without human judgment
2. A **constrained scope** — files or behaviors the agent may modify, with read-only zones protected
3. A **verification gate** — the change only survives if the metric improves and nothing regresses

Without all three, you get drift, not improvement.

## Why It Matters

The bottleneck in agentic systems has shifted. Writing code is no longer the hard part. Validating behavior, catching regressions, and maintaining reliability as user patterns drift takes more engineering time than the initial build. A self-improving agent addresses this by treating failures as input rather than interruptions.

The compounding effect is the key property. Each fixed failure becomes a permanent test case. The regression gate means the system cannot backslide. Gains are additive, not re-earned each cycle. This is qualitatively different from a system that just retries failed tasks.

## How It Works

### The Core Loop

Every self-improving agent, regardless of implementation, runs a variant of this sequence:

```
1. Observe current state (metric, traces, errors)
2. Propose ONE change (atomic scope)
3. Commit the change (before verification)
4. Run verification (mechanical metric + guard/regression suite)
5. If improved: keep. If worse: revert.
6. Log the result with the commit, delta, and rationale.
7. Repeat.
```

The commit-before-verify ordering matters. It ensures the agent has a clean rollback point and that git becomes an episodic memory of every experiment, including failures. The [AutoResearch](../projects/autoresearch.md) skill (`claude-plugin/skills/autoresearch/references/autonomous-loop-protocol.md`) makes this explicit in its 8-rule protocol: git is memory, automatic rollback on failure, one change per iteration.

### Memory Architecture

Self-improving agents maintain several distinct memory layers, each with different persistence semantics:

**Short-term (session):** the current context window. Ephemeral.

**Episodic (git log + results TSV):** append-only logs of every experiment. The `autoresearch.jsonl` format used by [pi-autoresearch](../projects/autoresearch.md) appends one JSON line per run with metric, status, commit hash, and description. A fresh agent instance can read this file and resume exactly where the previous session ended. This is a critical design choice: session survival without requiring a persistent context window.

**Semantic (wiki / markdown knowledge base):** structured knowledge compiled by the LLM itself. Karpathy's setup uses an `Obsidian`-backed directory of `.md` files with auto-maintained index files and summaries. The LLM reads these indexes to navigate without loading every document into context. [See Karpathy's description](../concepts/andrej-karpathy.md) of his `raw/` ingest → wiki compilation → Q&A loop.

**Procedural (AGENTS.md / CLAUDE.md / learnings files):** the most durable layer. [OpenClaw](../projects/openclaw.md)'s self-improving skill writes errors to `.learnings/ERRORS.md`, corrections to `.learnings/LEARNINGS.md`, and promotes high-value lessons to `AGENTS.md` permanently. [CLAUDE.md](../concepts/claude-md.md) serves the same role for Claude Code-based agents. The agent reviews these files before major tasks, so past mistakes directly constrain future behavior.

### Failure Mining and Clustering

The naive approach treats each failure as a one-off. Production-grade self-improvement treats failures as samples from a distribution. The NeoSigma auto-harness (open-sourced at `neosigmaai/auto-harness`) clusters production trace failures by root cause before generating eval cases. A fix that resolves a cluster generalizes better than a fix that resolves one instance. This prevents the optimizer from overfitting to individual failure cases.

The auto-harness loop:
1. Mine failures from production traces
2. Cluster by root cause
3. Convert clusters to reusable eval cases
4. Propose harness changes in a sandboxed test environment
5. Accept only changes that improve performance AND pass the full regression suite

On TAU-3 benchmark tasks, this loop improved an agent from 0.56 to 0.78 (a ~40% jump) while maintaining regression constraints. Note: this result is self-reported by NeoSigma.

### Context Management Under Long Runs

Long self-improvement loops bloat the main agent's context with verbose trace output. The auto-harness addresses this with sub-agents that own their own output and return only summaries to the parent. [AutoResearch](../projects/autoresearch.md) uses recursive summarization. This is not optional for runs lasting hours or days — context overflow causes the loop to degrade.

### The Regression Gate

The regression gate is what makes gains compound rather than oscillate. Fixed failures become permanent test cases. The system cannot backslide past what it has already solved. Without the gate, the optimizer repeatedly covers the same ground. With it, the constraint set only ever expands.

In the NeoSigma system, the gate is two-step: eval suite pass rate, then full validation score. Both must pass before a change is accepted.

## Implementations

**[AutoResearch](../projects/autoresearch.md)** (uditgoenka/autoresearch, 3,142 stars): packages the Karpathy loop as a [Claude Code](../projects/claude-code.md) skill. Key files: `claude-plugin/skills/autoresearch/SKILL.md` (main skill), `references/autonomous-loop-protocol.md` (8-phase loop), `references/results-logging.md` (TSV format). Generalizes beyond ML to any domain with a measurable metric. Adds specialized subcommands for security auditing, documentation, adversarial refinement, and shipping workflows.

**pi-autoresearch** (davebcn87/pi-autoresearch, 3,393 stars): implements the same pattern for the `pi` terminal agent. Separates extension (domain-agnostic infrastructure: `run_experiment`, `log_experiment`, widget) from skill (domain knowledge: command, metric, scope). Uses `autoresearch.jsonl` for append-only session persistence and `autoresearch.md` as a living session document. Includes confidence scoring via Median Absolute Deviation to distinguish real gains from benchmark noise.

**NeoSigma auto-harness** (neosigmaai/auto-harness): production-focused, adds failure clustering and living eval suites. Files: `agent/agent.py` (agent being optimized), `benchmark.py` (reward function), `gating.py` (two-step gate), `workspace/suite.json` (regression suite), `workspace/learnings.md` (persistent log).

**[OpenClaw](../projects/openclaw.md) self-improving skill**: takes the simplest approach. The agent logs errors to `.learnings/ERRORS.md`, corrections to `.learnings/LEARNINGS.md`, and feature requests to `.learnings/FEATURE_REQUESTS.md`. Recurring issues get flagged. Important lessons get promoted to `AGENTS.md`. No loop infrastructure required — just structured file writes and reads.

**[Voyager](../projects/voyager.md)**: an earlier reference implementation in Minecraft. The agent writes JavaScript skill functions to a library and retrieves them for future tasks. Demonstrates the procedural memory layer specifically.

**[Darwin Gödel Machine](../projects/darwin-godel-machine.md)**: takes the approach further by having agents modify their own source code, with fitness determined by benchmark performance across a population of variants.

## Strengths

**No human required per iteration.** The loop runs overnight, over weekends, or continuously in production. Engineering time shifts from debugging individual failures to designing the loop framework.

**Inspectable.** Unlike fine-tuning, every change is a git commit with a measured delta. The full experiment history is readable as a TSV or JSONL file. You can audit exactly what changed and why.

**Domain-agnostic.** Any optimization target with a scriptable metric works: test coverage, bundle size, LLM training loss, API latency, Lighthouse scores. The metric just has to be a number the script can output.

**Composable.** Loops can chain. AutoResearch supports `--chain` flags that pipe the output of one subcommand as input to another: `reason → plan → fix`, `debug → fix`, `scenario → security`.

## Failure Modes

**Metric gaming.** If the verification metric can be satisfied without actually improving behavior, the agent will find that path. A classic example: an agent improving test coverage by deleting tests that fail rather than fixing the underlying code. Guard commands (a secondary constraint that must also pass) partially address this, but they require the human to anticipate the failure mode in advance.

**Context collapse over long runs.** Without explicit context management (sub-agents, recursive summarization, session files), the main agent's context fills with verbose intermediate outputs. The loop degrades as the agent loses access to early experiment history. The solution is always the same: make session state external (files, git) rather than in-context.

**Overfitting to the eval suite.** If the regression suite is too small or unrepresentative, the agent optimizes for the suite rather than actual behavior. The NeoSigma approach of continuously mining production failures and adding them as new eval cases is the correct mitigation, but it requires production traffic to mine.

**Silent rollback failures.** If the git revert step fails silently (merge conflicts, dirty working tree, permission issues), the agent may continue iterating on a broken state. The loop must verify that the revert actually succeeded before proceeding.

## When NOT to Use It

**When the optimization target is subjective and you lack a proxy metric.** If you cannot write a script that outputs a number, you cannot run the loop mechanically. The AutoResearch `/autoresearch:reason` subcommand attempts to address this with blind judge panels for subjective domains, but this is significantly slower and more expensive than objective metrics.

**When the agent has broad write access to production systems.** Self-improving loops should run in sandboxed environments with limited blast radius. A loop that can modify production databases or send external requests while iterating introduces unbounded risk.

**When you need guaranteed termination.** Unbounded loops, by design, never stop unless interrupted. If your infrastructure has API cost limits or rate limits that could be exhausted, always use bounded iteration counts (`Iterations: N` in AutoResearch, `maxIterations` in pi-autoresearch).

**When your codebase lacks tests.** The regression gate requires something to regress against. An agent iterating on a codebase with no test suite and no benchmark script has no way to detect regressions. You will get local optima at best.

## Unresolved Questions

**Scope creep over long runs.** The documentation does not clearly explain what happens when the agent's proposed changes exceed the defined scope after many iterations. Does it request scope expansion, silently expand scope, or stall?

**Cost at scale.** None of the open-source implementations include cost estimation before starting a loop. A bounded loop of 100 iterations with a large context window can consume significant API budget. The pi-autoresearch docs note that "loops can burn through tokens" and suggest API key limits as the control mechanism, but provide no cost model.

**Multi-agent conflict resolution.** When multiple self-improving loops run concurrently against the same codebase (as suggested by AutoResearch's parallel exploration feature), git merge conflicts and competing regression suite updates are not addressed in any of the documentation reviewed.

**Convergence criteria.** Most implementations run until interrupted. The pi-autoresearch confidence scoring (MAD-based) is advisory and never auto-stops the loop. There is no general mechanism to detect that the optimization landscape has been exhausted.

## Related Concepts

- [Karpathy Loop](../concepts/karpathy-loop.md): the specific constraint + metric + loop pattern this generalizes from
- [Agent Memory](../concepts/agent-memory.md): the memory architecture self-improving agents build and maintain
- [Reflexion](../concepts/reflexion.md): a closely related approach using verbal self-reflection rather than mechanical metrics
- [GEPA](../concepts/gepa.md): genetic/evolutionary approaches to agent improvement
- [Procedural Memory](../concepts/procedural-memory.md): the skill library layer agents build through experience
- [Continual Learning](../concepts/continual-learning.md): the ML training analog of runtime self-improvement
- [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md): the failure mode that regression gates are designed to prevent
- [LLM-as-Judge](../concepts/llm-as-judge.md): how subjective-domain improvement loops substitute for mechanical metrics
- [CLAUDE.md](../concepts/claude-md.md): the persistent instruction file that serves as procedural memory for Claude-based agents
- [Automatic Curriculum](../concepts/automatic-curriculum.md): a related mechanism for sequencing what the agent practices next
- [Memory Evolution](../concepts/memory-evolution.md): how the knowledge structures themselves change over time
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md): the natural next step once the knowledge base is large enough to fine-tune against
