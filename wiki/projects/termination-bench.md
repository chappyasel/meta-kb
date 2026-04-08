---
entity_id: termination-bench
type: project
bucket: agent-architecture
abstract: >-
  TerminalBench is a benchmark for evaluating LLM agents on real command-line
  tasks; its key differentiator is measuring full end-to-end agentic capability
  in a live terminal environment, not code generation in isolation.
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/repos/gepa-ai-gepa.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
related:
  - agent-harness
  - retrieval-augmented-generation
  - claude
  - prompt-optimization
last_compiled: '2026-04-08T23:22:53.180Z'
---
# TerminalBench

## What It Is

TerminalBench is a benchmark for measuring how well LLM agents perform on complex, real-world command-line tasks. Where benchmarks like [SWE-bench](../projects/swe-bench.md) focus on repository-level code changes evaluated against test suites, TerminalBench puts agents in a live terminal environment and scores them on whether they complete tasks end-to-end: running commands, navigating filesystems, managing dependencies, debugging failures, and recovering from errors.

TerminalBench-2 is the updated version referenced across recent harness optimization research. The benchmark has 89 tasks covering software engineering workflows that require multi-step tool use, environment awareness, and error recovery.

The benchmark gained prominence as a stress test for [agent harness](../concepts/agent-harness.md) engineering. A widely-cited finding: vanilla Claude Code with Claude Haiku 4.5 scores 27.5% on TerminalBench-2, while a hand-engineered harness on the same model reaches 35.5%, with no fine-tuning. Automated harness optimization (Meta-Harness) reached 76.4% with Claude Opus 4.6 and 37.6% with Haiku 4.5. [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)

## Core Mechanism: What Gets Measured

Tasks in TerminalBench-2 are evaluated against pass/fail criteria, though the exact evaluation harness internals are not fully documented in available sources. Tasks span dependency management, compilation and build failures, filesystem operations, shell scripting, and multi-step debugging workflows.

The benchmark functions as an open leaderboard. Published scores come from multiple agent systems:

| Agent | Model | Score |
|---|---|---|
| ForgeCode | Claude Opus 4.6 | 81.8% |
| Meta-Harness | Claude Opus 4.6 | 76.4% |
| Terminus-KIRA | Claude Opus 4.6 | 74.7% |
| Goose | Haiku 4.5 | 35.5% |
| Meta-Harness | Haiku 4.5 | 37.6% |
| Terminus-KIRA | Haiku 4.5 | 33.7% |
| Vanilla Claude Code | Haiku 4.5 | 27.5% |

These numbers come from Meta-Harness paper (Lee et al. 2026) and the meta-agent Twitter thread, both of which are self-reported. Independent validation of the full leaderboard is not confirmed in available sources.

## Architectural Significance for Agent Research

TerminalBench-2 has become the canonical stress test for [agent harness](../concepts/agent-harness.md) optimization work because its tasks expose the full stack of harness decisions: what to put in the system prompt, how to bootstrap environment state, when to stop, and how to handle cascading failures.

The Meta-Harness paper ran 89 tasks, with search and evaluation on the same set (no held-out split). This limits what can be concluded about generalization. The specific improvement they found was environment bootstrapping: injecting an OS snapshot (available tools, languages, package managers, memory state) before the agent loop begins, which reduced 3-5 wasted exploration turns on dependency-heavy tasks. [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)

LangChain's jump "from outside the top 30 to rank 5" on TerminalBench-2 by changing only harness infrastructure (same model, same weights) is cited repeatedly in harness engineering discourse. [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)

The meta-agent project (canvas-org) lists TerminalBench-2 as a planned future evaluation target alongside [SWE-bench](../projects/swe-bench.md). [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)

[GEPA](../concepts/gepa.md) includes a TerminalBench adapter in its `adapters/` directory, used as one of the optimization targets in published experiments. [Source](../raw/deep/repos/gepa-ai-gepa.md)

## Key Numbers

- **89 tasks** in TerminalBench-2 (per Meta-Harness paper)
- **27.5% → 35.5%** gap between vanilla Claude Code and best hand-engineered harness, Haiku 4.5 (self-reported)
- **27.5% → 37.6%** gap between vanilla Claude Code and Meta-Harness automated optimization, Haiku 4.5 (self-reported)
- LangChain ranking jump (top 30 → rank 5) is cited without a specific date or run configuration

All performance numbers across the leaderboard are self-reported by the teams running evaluations. The benchmark provides a shared evaluation surface but does not appear to have independent auditing infrastructure documented in available sources.

## Strengths

**Terminal-native task coverage.** Most coding benchmarks evaluate code generation divorced from execution. TerminalBench-2 requires agents to actually run commands, recover from failures, and complete tasks in a real shell environment. This makes it sensitive to harness decisions that standard benchmarks ignore: environment bootstrapping, error handling hooks, stop conditions.

**Model-harness sensitivity.** The 27.5% → 37.6% range across different harnesses on the same model is a useful signal. It quantifies what harness engineering is worth on tasks that require multi-step terminal operation.

**Leaderboard traction.** Multiple agent frameworks (LangChain, Goose, ForgeCode, Terminus-KIRA) publish results, giving practitioners a cross-framework comparison that self-contained evaluations cannot provide.

## Critical Limitations

**No train/test split in published optimization work.** The Meta-Harness experiments optimized and evaluated on the same 89 tasks. The discovered improvement (environment bootstrapping) is likely general, but the evaluation design cannot rule out task-specific overfitting. This is the most important caveat when interpreting the reported numbers.

**Infrastructure dependency.** TerminalBench-2 requires running agents in a real terminal environment, which means evaluation cost scales with task complexity. Agents that hit long-running commands, large dependency installs, or recursive loops are expensive to evaluate. Teams with limited compute may run fewer iterations or truncate long-running tasks, which would not show up in reported scores.

**Leaderboard governance is opaque.** Available sources do not explain who maintains the leaderboard, what submission requirements exist, how task descriptions are versioned, or whether score normalization is applied across different execution environments. This matters because terminal task performance is environment-sensitive: available packages, OS version, and network access all affect what passes.

## When NOT to Use It

Do not use TerminalBench-2 as the primary signal for pure code generation capability. Its tasks require terminal-native reasoning, environment awareness, and error recovery. A model that generates correct code but cannot navigate a real shell environment will score poorly even if its code quality is high. For code generation, [SWE-bench](../projects/swe-bench.md) or [HumanEval](../projects/humaneval.md) are better fits.

Do not treat single-run TerminalBench-2 scores as stable estimates. The meta-agent paper notes explicitly that their tau-bench results are single-run with no variance estimates. TerminalBench-2 tasks likely have similar variance, especially at the 27-40% range where small absolute changes span many tasks.

## Unresolved Questions

**Evaluation environment standardization.** What does the execution environment look like? Available sources do not document the container or VM configuration, pre-installed packages, network access, or time limits. Score portability across different execution setups is unknown.

**Task versioning.** TerminalBench-2 is an update to an earlier TerminalBench. The sources do not document what changed between versions, making it difficult to compare scores across the two versions or assess whether improvements reflect genuine capability gains or task set changes.

**Leaderboard submission process.** No sources describe submission requirements, reproducibility standards, or who validates entries before they appear on the leaderboard.

**Cost at scale.** Running 89 terminal tasks with a capable agent and full execution traces (as Meta-Harness does) is expensive. The paper does not report total API spend for a TerminalBench-2 optimization run. For teams considering automated harness search on this benchmark, cost is a real constraint with no published estimate.

## Alternatives

**[SWE-bench](../projects/swe-bench.md)** — Use when you want to evaluate repository-level code editing with test-validated correctness. Better-documented evaluation infrastructure and independent validation. Does not test terminal navigation or environment bootstrapping.

**[AppWorld](../projects/appworld.md)** — Use when the target domain involves API-mediated workflows and multi-app coordination rather than low-level terminal operations.

**[Tau-bench](../projects/tau-bench.md)** — Use when the target domain is conversational customer service agents following policy constraints. The meta-agent project uses this as its primary evaluation target.

**[GAIA](../projects/gaia.md)** — Use when the goal is general-purpose tool-using capability across a broader task distribution, with independently audited evaluation.

## Related Concepts and Projects

- [Agent Harness](../concepts/agent-harness.md) — TerminalBench-2 is the primary benchmark driving harness optimization research
- [Prompt Optimization](../concepts/prompt-optimization.md) — [GEPA](../concepts/gepa.md) includes a TerminalBench adapter as an optimization target
- [Claude](../projects/claude.md) — Most published TerminalBench-2 results use Claude models as the base
- [Claude Code](../projects/claude-code.md) — The baseline agent whose vanilla score (27.5% Haiku 4.5) sets the floor for harness engineering comparisons
- [AutoResearch](../projects/autoresearch.md) — Cited alongside Meta-Harness as a system demonstrating iterative harness improvement
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — Relevant because harness design choices (what context to inject) directly affect TerminalBench performance
- [Context Engineering](../concepts/context-engineering.md) — Environment bootstrapping (the key TerminalBench-2 discovery) is a context engineering intervention
