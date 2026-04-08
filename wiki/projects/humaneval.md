---
entity_id: humaneval
type: project
bucket: agent-architecture
abstract: >-
  HumanEval is OpenAI's 164-problem Python benchmark for measuring code
  generation pass@k accuracy; its hand-verified test suites and straightforward
  pass@1 metric made it the default leaderboard for coding LLMs but its small
  size and static problems limit discrimination among frontier models.
sources:
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - episodic-memory
last_compiled: '2026-04-08T03:04:54.100Z'
---
# HumanEval

## What It Is

HumanEval is a code generation benchmark released by [OpenAI](../projects/openai.md) in 2021 alongside the [OpenAI Codex](../projects/codex.md) paper. It contains 164 hand-written Python programming problems, each consisting of a function signature, a docstring describing the task, a partial implementation body, and a set of unit tests. Models must complete the function; correctness is measured by whether the completion passes all unit tests for that problem.

The primary metric is **pass@k**: the probability that at least one of k generated samples passes the tests. Most leaderboard comparisons use pass@1 (single sample, no retries), which tests whether a model can produce a correct solution in one shot.

HumanEval problems span basic algorithmic tasks: string manipulation, number theory, list operations, sorting variants, and simple mathematical functions. The problems are solvable for an intermediate programmer in minutes and were designed so that docstrings fully specify the required behavior.

## Why It Became the Default

Before HumanEval, code generation benchmarks were mostly competitive programming datasets or natural language-to-SQL tasks, neither of which matched the "autocomplete a utility function" use case that Codex targeted. HumanEval provided:

- A compact, deterministic test suite with no annotation ambiguity
- Functional correctness as the ground truth (no n-gram similarity heuristics like BLEU)
- Problems short enough that 2021-era context windows could handle them
- Human-verified problem-answer pairs, not scraped from training corpora

Those properties made it the default leaderboard for every coding LLM that followed. [GitHub Copilot](../projects/github-copilot.md), [Claude](../projects/claude.md), [GPT-4](../projects/gpt-4.md), and dozens of open-weight models publish HumanEval scores.

## Core Mechanism

The evaluation pipeline is simple:

1. For each of 164 problems, feed the function signature and docstring as a prompt.
2. Generate k completions per problem.
3. Execute each completion against the hidden test cases.
4. Compute pass@k using the unbiased estimator from the Codex paper: for n samples with c correct, pass@k = 1 - C(n-c, k) / C(n, k).

The test cases are embedded in the dataset file (`HumanEval.jsonl.gz`). Each entry has a `task_id`, `prompt`, `canonical_solution`, `test`, and an `entry_point` function name. The reference implementation runs `exec()` on the completion concatenated with the test string and catches exceptions.

No tool use, no multi-turn interaction, no context beyond the single function stub. The entire evaluation state fits in a few hundred tokens.

## Key Numbers

Landmark pass@1 scores (single sample, no retries, self-reported by each organization unless noted):

| Model | pass@1 | Year |
|---|---|---|
| Codex (12B) | 28.8% | 2021 |
| GPT-4 | 67% | 2023 |
| Reflexion (GPT-4 + verbal self-reflection) | 91% | 2023 |
| Claude 3.5 Sonnet | ~90%+ | 2024 |
| GPT-4o | ~90%+ | 2024 |

Reflexion's 91% (from [Reflexion](../concepts/reflexion.md)) is notable because it exceeds base GPT-4 by ~10 percentage points through iterative self-correction with test feedback, demonstrating that the benchmark measures a capability ceiling that can be raised with scaffolding rather than just raw model capability.

All figures above are self-reported by the publishing organizations. No independent third-party evaluation body runs HumanEval under controlled conditions. Scores can vary based on sampling temperature, stop sequences, and whether the prompt includes few-shot examples.

## Strengths

**Fast, cheap evaluation.** 164 problems with deterministic test execution takes minutes and costs pennies. This makes HumanEval practical for ablation studies, nightly CI runs during model development, and rapid iteration on prompting strategies.

**Unambiguous ground truth.** Pass/fail on unit tests eliminates the inter-annotator disagreement that plagues open-ended benchmarks. Two researchers running the same model get the same score.

**Broad adoption enables comparison.** Because every major coding model publishes HumanEval scores, it functions as a common vocabulary. Saying "our model reaches 85% pass@1" communicates something concrete to the field, regardless of whether that number fully characterizes the model.

**Standard in agent evaluation scaffolding.** Self-improving coding agents like the system in [SWE-bench](../projects/swe-bench.md)'s ecosystem and [SICA](../concepts/self-improving-agents.md) use HumanEval as a fast inner-loop signal during optimization iterations, precisely because its low cost lets them run hundreds of evaluation rounds. EvoAgentX's AFlow and SEW optimizers default to HumanEval for the same reason.

## Critical Limitations

**Benchmark saturation.** Frontier models now score 85-91% on a 164-problem set. Differences between top models fall within sampling variance at that scale. A 2-point difference on 164 problems is statistically meaningless, yet leaderboards report and rank by such differences. The benchmark no longer discriminates among the models practitioners actually care about comparing.

**Unspoken infrastructure assumption: code execution environment.** HumanEval assumes a Python interpreter is available, that the standard library is accessible, and that no network calls or filesystem side effects are needed. This is true in controlled evaluation but hides the gap between "generates code that passes a docstring-driven unit test" and "writes code that works in a real codebase with dependencies, state, and ambiguous requirements." Models that score well here may still fail on [SWE-bench](../projects/swe-bench.md)-style repository-level tasks by a wide margin.

**Concrete failure mode: memorization.** The 164 problems and their solutions are public and have been on the internet since 2021. Every major model's training data almost certainly includes the canonical solutions. A model can achieve high pass@1 by pattern-matching against memorized solutions rather than by generalizing code generation capabilities. There is no published methodology for detecting or controlling this contamination.

## When NOT to Use It

**Evaluating repository-level or multi-file coding agents.** HumanEval tests single-function completion with no codebase context. If you are building or comparing agents that edit existing code, navigate large repositories, or perform multi-step refactoring, HumanEval scores tell you almost nothing. Use [SWE-bench](../projects/swe-bench.md) instead.

**Discriminating between frontier models.** If you need to choose between two top-tier models for a production coding task and both score above 85%, HumanEval will not help you choose. The signal-to-noise ratio at the high end is too low, especially with only 164 problems.

**Evaluating agentic capabilities.** HumanEval measures one-shot function generation. It says nothing about a model's ability to use tools, maintain context across turns, recover from errors, or coordinate with other agents. For agentic coding evaluation, consider [Tau-bench](../projects/tau-bench.md) or [AppWorld](../projects/appworld.md).

**Benchmarking languages other than Python.** The benchmark is Python-only. Multilingual code generation requires separate benchmarks.

## Relationship to Agent Evaluation

HumanEval sits in a specific niche within the broader agent evaluation stack. As a benchmark for [Agent Skills](../concepts/agent-skills.md), it measures a narrow slice: can the agent produce syntactically valid Python that satisfies a functional specification? It does not measure planning, tool use, memory, or multi-step reasoning.

Its role in self-improving agent research ([Self-Improving Agents](../concepts/self-improving-agents.md)) is primarily as a cheap fitness function. SICA uses it as one of several benchmarks to measure whether a scaffold modification improved the agent's coding capability. EvoAgentX uses it as the default optimization target for AFlow and SEW. In both cases, HumanEval functions as a quick sanity check, not a comprehensive evaluation. The actual capability researchers care about is SWE-bench or LiveCodeBench performance; HumanEval is the cheap proxy they run 500 times during optimization to avoid burning budget on expensive benchmarks.

[Episodic Memory](../concepts/episodic-memory.md) connects to HumanEval through Reflexion: the framework achieves 91% by storing verbal self-reflections about failed test runs and conditioning subsequent generation attempts on those reflections. This is the clearest demonstration that HumanEval's ceiling is not a hard model capability limit but a function of the inference-time scaffolding around the model.

## Alternatives

- **[SWE-bench](../projects/swe-bench.md)**: Repository-level bug fixing on real GitHub issues. Use when you need to evaluate agents on realistic software engineering tasks rather than isolated function completion. Much harder to evaluate cheaply due to execution complexity.
- **MBPP**: 374 crowd-sourced Python problems. Similar format to HumanEval, larger sample size, but higher false-positive rate on self-generated tests (16.3% vs 1.4% for HumanEval) which complicates agent-based iteration.
- **LiveCodeBench**: Problems drawn from recent competitive programming contests, updated continuously to reduce contamination risk. Use when you need a benchmark with lower likelihood of training data overlap.
- **[Tau-bench](../projects/tau-bench.md)**: Agent-centric benchmark including tool use and multi-turn interaction. Use when the target capability is agentic behavior, not raw code generation.

## Unresolved Questions

**Contamination at scale.** No published methodology exists for determining how much of a model's HumanEval score reflects memorized solutions versus generalized capability. As the problems are permanently public, this problem only worsens over time with each new training run.

**Score comparability across evaluation setups.** Different organizations use different temperatures, stop sequences, prompt formats, and numbers of samples. A "pass@1" score from organization A and a "pass@1" score from organization B may not be directly comparable. No standard evaluation harness with locked hyperparameters exists that all organizations commit to using.

**What happens above 91%.** Reflexion reached 91% with GPT-4 in 2023. What does 95%+ require, and does it represent meaningful capability improvement or benchmark gaming? The benchmark may already be measuring noise at the high end.


## Related

- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.3)
