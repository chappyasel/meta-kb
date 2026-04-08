---
entity_id: tau-bench
type: project
bucket: agent-architecture
abstract: >-
  Tau-bench is a multi-turn conversational agent benchmark for realistic
  customer service tasks (retail, airline) that tests policy adherence and tool
  use under simulated human interaction, distinct from static Q&A evals.
sources:
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - repos/canvas-org-meta-agent.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
related:
  - claude
last_compiled: '2026-04-08T02:58:26.433Z'
---
# Tau-bench

## What It Is

Tau-bench (originally tau-bench, now on v3 as tau2-bench) is a benchmark for evaluating tool-augmented language agents on realistic, multi-turn customer service workflows. Unlike static benchmarks where an agent answers a question once, tau-bench wraps each task in a simulated conversation: the agent must use tools to look up account state, apply business policy rules, and satisfy a synthetic customer user, all within a single session.

The benchmark ships two domains: **retail** (product returns, exchanges, order modifications) and **airline** (flight cancellations, rebookings, refunds under policy constraints). Each domain defines a policy document the agent is expected to follow, a set of tools for querying and mutating state, and a simulated user that the agent converses with to complete the task. Scoring is pass/fail per task, verified by the official tau evaluator against ground-truth state changes.

The project comes from Sierra Research and is available at `github.com/sierra-research/tau2-bench`.

## Core Mechanism

Each task in tau-bench follows the same structure:

1. The agent receives a system prompt containing the domain policy and tool definitions.
2. A synthetic user (a separate LLM or scripted persona) opens a conversation with a customer request.
3. The agent must call tools to inspect and modify a shared workspace state — account records, reservations, inventory.
4. The task ends when the agent terminates the session. The evaluator compares final workspace state against expected state.

The difficulty is not pure reasoning. An agent that understands language but ignores the policy document (e.g., issues a refund without checking cancellation eligibility) fails. An agent that hallucinates account data rather than calling the lookup tool fails. The multi-turn loop also means early errors propagate: a wrong lookup leads to a wrong policy decision, which leads to an incorrect state mutation.

The benchmark is composable. Tasks specify `instruction`, `workspace`, and `verify` fields, where `verify` is a command that exits zero on success. This design makes it straightforward to add new domains or swap in custom evaluation scripts.

## Key Numbers

Observed pass rates vary significantly by model and harness configuration:

- Baseline Claude Haiku 4.5 on tau-bench v3 airline (50 tasks, 35-task search split): **67%** — reported by Canvas/meta-agent [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)
- Same model with optimized harness (meta-agent, judge-based search): **87%** holdout accuracy — self-reported, single run, no variance estimates
- NeoSigma auto-harness on tau3: **0.56 → 0.78** (~40% relative improvement) — self-reported [Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md)

These numbers are self-reported by third parties using tau-bench as a test bed for harness optimization systems, not official Sierra Research figures. The benchmark itself does not publish a canonical leaderboard. Treat all pass rates as provisional until independently replicated at scale.

## What It's Good At

**Policy adherence under realistic pressure.** Most benchmarks test whether a model can answer a question correctly in isolation. Tau-bench tests whether an agent follows a multi-page policy document across a live conversation, with a synthetic user pushing back or providing incomplete information. This catches a failure mode that static evals miss entirely.

**Harness sensitivity detection.** Tau-bench scores are measurably sensitive to system prompt changes, tool call ordering, and stop condition logic. This makes it a useful signal for [Prompt Optimization](../concepts/prompt-optimization.md) work and [Self-Improving Agents](../concepts/self-improving-agents.md) research. The meta-agent and auto-harness projects both use tau-bench specifically because small harness changes produce detectable score movement.

**Reproducible task definition.** The YAML task format and deterministic verifier allow researchers to reproduce a specific task set, split it into search/holdout subsets, and run ablations without re-specifying evaluation criteria each time.

## Critical Limitations

**Failure mode — synthetic user brittleness.** The simulated customer is itself an LLM. If the simulated user goes off-script, provides ambiguous information, or fails to respond as the task specifies, the agent's failure may reflect user simulation quality rather than agent capability. This introduces noise that is hard to separate from genuine agent errors without per-turn logging and manual inspection.

**Unspoken infrastructure assumption.** Tau-bench tasks assume stateful workspace management — each task needs a clean workspace directory, a working verify script, and a correctly initialized state file. Running tau-bench at scale (across many agents, many models, many iterations) requires a task orchestration layer that the benchmark does not provide. The canvas/meta-agent repo handles this with a `task_runner` and `eval_runner`, but users running their own harnesses must build this scaffolding themselves.

## When Not to Use It

Tau-bench is the wrong choice for:

- **Measuring code generation.** It has no coding tasks. Use [SWE-bench](../projects/swe-bench.md) or [HumanEval](../projects/humaneval.md) for that.
- **Open-domain QA or retrieval.** The benchmark is narrow: customer service in two domains. Scores don't transfer to [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) tasks or multi-hop reasoning. [HotpotQA](../projects/hotpotqa.md) covers that space.
- **Long-horizon memory evaluation.** Tasks are single-session. The agent doesn't need to remember anything across separate conversations. [LongMemEval](../projects/longmemeval.md) covers persistent memory scenarios.
- **Fast iteration cycles.** The 50-task airline domain with multi-turn simulation is slow to run. If you need a quick sanity check during development, the overhead is high relative to the feedback.

## Unresolved Questions

The documentation doesn't explain several things that matter operationally:

- **How the simulated user is implemented.** The benchmark description says tasks involve a synthetic customer, but the specific model, temperature, and persona configuration used for the user simulator are not publicly specified. This matters because user simulator quality directly affects score variance.
- **Domain coverage rationale.** Why retail and airline? These cover narrow B2C service patterns. Whether tau-bench scores correlate with performance on other enterprise domains (financial services, healthcare scheduling, internal IT helpdesk) is untested.
- **Score variance at small sample sizes.** Most published results use 50-task splits. A 67% → 87% improvement on 15 holdout tasks is 3 additional tasks. Single-run results at this scale have high variance, and neither Sierra Research nor the third-party users have published confidence intervals.
- **Official leaderboard governance.** There is no maintained public leaderboard. Comparisons across papers are difficult because researchers use different task splits, holdout sizes, and user simulator configurations.

## Relationship to Agent Infrastructure Work

Tau-bench has become a standard test bed for [Agent Harness](../concepts/agent-harness.md) optimization research. The meta-agent system ([AutoResearch](../projects/autoresearch.md)-style iterative harness refinement) uses tau-bench v3 airline as its primary benchmark. The auto-harness work from NeoSigma does the same. Both treat tau-bench scores as the optimization target for systems that modify system prompts, tool definitions, and lifecycle hooks.

This reflects a broader pattern: tau-bench is useful less as a definitive capability benchmark and more as a stable task environment where harness changes produce measurable, reproducible signal. The [ReAct](../concepts/react.md) pattern of tool-augmented reasoning is directly exercised by the benchmark structure.

## Alternatives

| Use case | Alternative |
|---|---|
| Code editing and software tasks | [SWE-bench](../projects/swe-bench.md) |
| General agent capability across diverse domains | [GAIA](../projects/gaia.md) |
| Long-context memory and retrieval | [LongMemEval](../projects/longmemeval.md) |
| Multi-app enterprise workflows | [AppWorld](../projects/appworld.md) |
| Terminal/system-level tasks | [TerminalBench](../projects/termination-bench.md) |

Use tau-bench when your agent involves multi-turn conversation with tool use under explicit policy constraints, and you need a benchmark where harness changes produce detectable score movement without requiring large task counts.


## Related

- [Claude](../projects/claude.md) — part_of (0.5)
