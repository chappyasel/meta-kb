---
entity_id: termination-bench
type: project
bucket: agent-architecture
abstract: >-
  TerminalBench is a benchmark suite for evaluating LLM agents on real
  terminal/command-line tasks; its key differentiator is that harness
  engineering alone (not model weights) moves scores by 20+ ranking positions.
sources:
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/gepa-ai-gepa.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
related:
  - agent-harness
  - prompt-optimization
  - retrieval-augmented-generation
  - claude
  - model-context-protocol
last_compiled: '2026-04-08T03:05:37.337Z'
---
# TerminalBench

## What It Is

TerminalBench is a benchmark for measuring LLM agent performance on terminal-based task completion. The core version tests general command-line competence; TerminalBench-2 targets harder challenges. The benchmark gained traction in early 2026 as a proving ground for agent harness engineering, after LangChain's team showed that changing only the infrastructure wrapping their model (same weights, same API) moved them from outside the top 30 to rank 5.

The benchmark is listed on an active leaderboard, and published scores are self-reported by teams submitting harnesses. No independent replication authority validates the numbers. Treat comparisons between teams carefully.

## Why It Matters

TerminalBench sits at the intersection of two debates: whether harness engineering matters as much as model selection, and whether automated harness search can beat hand-tuned systems. The evidence from 2026 results is strong on both counts.

The key finding across multiple papers: harness changes alone produce up to 6x performance gaps on the same benchmark with identical model weights. This makes TerminalBench-2 one of the few benchmarks where the experimental variable is explicitly the infrastructure surrounding the model, not the model itself.

## Benchmark Structure

TerminalBench-2 contains 89 tasks grounded in real command-line workflows. Tasks require agents to complete dependency-heavy operations, navigate file systems, run scripts, and recover from failures. The harness receives a task description and terminal access; success is measured by a verifiable outcome (file state, command output, test pass/fail).

The benchmark is used in two modes: as a competitive leaderboard where teams submit harnesses, and as a research evaluation suite where papers report pass rates on the 89-task set. Several papers that use TerminalBench-2 as a research benchmark search on the same 89 tasks they evaluate on, without a held-out split, which creates an overfitting risk.

## Reported Numbers (Self-Reported, Not Independently Validated)

| Agent / Harness | Model | Score |
|---|---|---|
| ForgeCode | Claude Opus 4.6 | 81.8% |
| Meta-Harness | Claude Opus 4.6 | 76.4% |
| Terminus-KIRA | Claude Opus 4.6 | 74.7% |
| meta-agent (LLM-judge search) | Claude Haiku 4.5 | 37.6% |
| Goose (best Haiku-class) | Claude Haiku 4.5 | 35.5% |
| Vanilla Claude Code (baseline) | Claude Haiku 4.5 | 27.5% |

The 27.5% to 37.6% gap (Haiku 4.5, baseline vs. best harness) is harness-only; no fine-tuning is involved. The gap from 27.5% to 35.5% (vanilla to Goose) is roughly 8 points from hand-engineered infrastructure changes.

All numbers above come from team self-reports in papers and blog posts. The benchmark leaderboard does not describe a third-party evaluation protocol.

## How Harness Optimization Works Here

Three published systems used TerminalBench-2 as their primary agentic coding evaluation. Each reveals something different about what the benchmark actually tests.

**Meta-Harness** ([Lee et al., 2026](../raw/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)) ran 89 tasks through an automated search loop. The key discovery: adding an environment bootstrapping step before the agent loop (collect OS info, available languages, package managers, memory state) eliminated 3-5 wasted exploration turns on dependency-heavy tasks. The proposer (Claude Code with Opus 4.6) identified this pattern by reading raw execution traces from failed runs, observing that agents repeatedly failed first tool calls because they had no knowledge of the environment. Meta-Harness reached 76.4% on Opus 4.6 (ranked #2) and 37.6% on Haiku 4.5 (ranked #1).

**meta-agent** ([canvas-org](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)) focused on tau-bench but cites TerminalBench-2 as planned evaluation territory. Its approach uses an LLM judge to score unlabeled traces, enabling harness optimization without ground-truth labels.

**GEPA** ([gepa-ai](../raw/deep/repos/gepa-ai-gepa.md)) provides a TerminalBench adapter in `src/gepa/adapters/`. It treats the benchmark as a multi-task search problem where Pareto-frontier management prevents single-task overfitting.

## What the Benchmark Is Actually Testing

Terminal task completion rewards three specific capabilities:

1. **Environment awareness** — knowing what tools, languages, and packages are available before starting
2. **Error recovery** — reading command output and adjusting rather than retrying blindly
3. **Context management** — not filling the context window with stale terminal output before the task completes

The Meta-Harness paper's analysis of TerminalBench-2 failures documents a concrete regression pattern: the proposer tried combining structural changes with prompt changes, saw two consecutive regressions, eventually diagnosed that "prompt template changes caused the agent to delete necessary state before task completion," and pivoted to purely additive modifications. This is useful evidence about what makes the benchmark hard: it penalizes agents that corrupt or prematurely drop state.

## Connection to [Agent Harness](../concepts/agent-harness.md)

TerminalBench-2 became the canonical demonstration that harness engineering produces measurable outcomes. The [Agent Harness](../concepts/agent-harness.md) concept formalizes this: the harness is everything around the model (orchestration loop, tools, memory, context management, error handling). TerminalBench-2 is where harness claims get tested.

LangChain's jump from outside top 30 to rank 5 by changing only infrastructure is the most-cited single data point in harness engineering discussions. That example originates from TerminalBench-2 results.

## Key Limitation: Same-Set Evaluation

Several teams using TerminalBench-2 as a research benchmark (including Meta-Harness on its coding results) optimize on the same 89 tasks they evaluate on. This creates real overfitting risk. The environment bootstrapping pattern discovered by Meta-Harness is plausibly general, but the benchmark doesn't provide the statistical separation needed to verify transfer. Contrast this with the Meta-Harness math results, which explicitly used held-out models to validate that the discovered harness generalized.

The benchmark's 89-task size is also small enough that single-run variance matters. Teams publishing results without variance estimates should be read cautiously.

## Unresolved Questions

- **Who maintains the leaderboard and validates submissions?** The submission protocol is not publicly documented. There is no clear description of whether submitted harnesses are re-evaluated by an independent party or self-reported.
- **How are tasks updated?** If TerminalBench-2's 89 tasks are static, future systems can implicitly overfit to them through the published failure analyses that now exist in papers.
- **Correlation with production performance.** It is unclear how well TerminalBench-2 scores predict real-world terminal agent performance, given its 89-task scope and the fact that most high-scoring systems were specifically optimized against it.

## When NOT to Use It

- As the sole evaluation for a production agent: 89 tasks with self-reported numbers and no held-out test split is not a substitute for task-specific evaluation on your actual workload.
- To compare models rather than harnesses: the benchmark was designed to isolate harness effects. Model comparisons require controlling for harness quality, which is hard to do.
- As a proxy for general coding ability: [SWE-bench](../projects/swe-bench.md) tests repository-level code changes; TerminalBench-2 tests command-line task execution. These are related but distinct capabilities.

## Alternatives

- **[SWE-bench](../projects/swe-bench.md)**: Use when evaluating agents on real GitHub issues requiring code changes. More established, independently validated, larger task set.
- **[AppWorld](../projects/appworld.md)**: Use when evaluating agents on multi-app task completion with APIs rather than terminal access.
- **[tau-bench](../projects/tau-bench.md)**: Use when evaluating conversational task completion with verifiable outcomes in specific domains (airline, retail).

Use TerminalBench-2 when the specific question is: how much does harness engineering affect terminal agent performance on a known task distribution?

## Related Concepts

- [Agent Harness](../concepts/agent-harness.md) — the infrastructure TerminalBench measures
- [Prompt Optimization](../concepts/prompt-optimization.md) — one mechanism for improving harness performance
- [Context Engineering](../concepts/context-engineering.md) — context management is one of the three capabilities the benchmark tests
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — relevant for harnesses that retrieve environment state or documentation
- [Model Context Protocol](../concepts/model-context-protocol.md) — standardized tool interfaces tested by the benchmark's tool execution tasks
