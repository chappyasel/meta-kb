---
entity_id: humaneval
type: project
bucket: agent-architecture
abstract: >-
  HumanEval is OpenAI's 164-problem Python code generation benchmark measuring
  pass@k accuracy via unit tests; primary differentiator is its
  function-signature-plus-docstring format with hand-written test cases and
  focus on standalone algorithmic correctness rather than repository-scale
  tasks.
sources:
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - episodic-memory
last_compiled: '2026-04-08T23:21:58.395Z'
---
# HumanEval

## What It Is

HumanEval is a code generation benchmark released by OpenAI in 2021 alongside the [OpenAI Codex](../projects/codex.md) paper. It contains 164 hand-written Python programming problems. Each problem provides a function signature, a docstring describing the task, and a partial implementation stub. The model must complete the function body. Correctness is measured by executing the completed function against a set of hidden unit tests. The primary metric is **pass@k**: the probability that at least one of k generated samples passes all unit tests.

The benchmark targets standalone, self-contained algorithmic problems: string manipulation, list operations, simple math, sorting variants, basic parsing. Problems do not require file I/O, external libraries, or multi-file context. This scope is deliberate — HumanEval measures a model's ability to translate a precise natural language specification into correct code, isolated from software engineering concerns like repository navigation or tool use.

## How It Works

Each of the 164 problems (`HumanEval/data/HumanEval.jsonl.gz`) is a JSON object with these fields:
- `task_id`: identifier string (e.g., `HumanEval/42`)
- `prompt`: the function signature plus docstring that the model receives as input
- `canonical_solution`: the reference implementation (not provided to the model)
- `test`: a string containing assert-based unit tests
- `entry_point`: the function name to call during testing

Evaluation loads each problem, appends the model's completion to the prompt, then executes `exec(prompt + completion + test)` in a sandboxed Python environment. A problem is "solved" if execution completes without raising an exception. The `evaluate_functional_correctness` function in the original `human_eval` package handles this, running each sample with a timeout.

Pass@k is computed without generating exactly k samples per problem. The paper introduces an unbiased estimator: generate n samples per problem (n ≥ k), count c correct samples, then compute:

```
pass@k = 1 - C(n-c, k) / C(n, k)
```

This estimator reduces variance compared to naively generating k samples and checking if any pass. In practice, most benchmark comparisons report pass@1 (a single greedy or temperature-0 sample).

## Key Numbers

**Benchmark composition:** 164 problems, Python only, unit test execution.

**Model scores (pass@1, selected):**
- GPT-4 (2023): ~80% — self-reported by OpenAI
- Reflexion + GPT-4 (2023): 91% — from [Reflexion](../concepts/reflexion.md) paper, self-reported
- OpenAI Codex (original, 2021): 28.8% at pass@1, 72.3% at pass@100 — self-reported

These figures are self-reported by model developers or researchers using their own API access. No independent third party re-runs all models on identical hardware with identical sampling parameters. Numbers reported in papers may use different temperatures, sampling budgets, or prompt formatting than what other papers use for "the same model."

[SWE-bench](../projects/swe-bench.md) eventually emerged partly because HumanEval's numbers had become saturated and concerns about contamination grew — current frontier models score above 90% pass@1 on it.

## Architectural Role in Agent Systems

HumanEval functions as the standard unit test for coding agent self-improvement loops. In [SICA](../projects/darwin-godel-machine.md)'s architecture (`src/benchmarks/`), it appears alongside LiveCodeBench, MBPP, GSM8K, and SWE-bench as one of the default evaluation targets. The improvement loop selects base agent versions by their HumanEval performance, and self-modifications are evaluated partly by whether they move this score.

[EvoAgentX](../projects/evoagentx.md) uses HumanEval as the default benchmark in both its AFlow and SEW optimizer tutorials (`AFlowHumanEval` and standard `HumanEval` classes in `evoagentx/benchmark/`). The benchmark's clean pass/fail signal — no partial credit, no fuzzy matching — makes it particularly useful as an optimization target: gradient-like feedback flows directly from test execution.

[Reflexion](../concepts/reflexion.md) uses HumanEval to demonstrate that verbal self-reflection improves code generation. The 91% pass@1 result depends on the agent generating its own unit tests before submitting solutions. HumanEval's false-positive rate for self-generated tests is 1.4% — low enough that this strategy works reliably. MBPP's 16.3% false-positive rate makes the same strategy backfire there.

## Strengths

**Clean, objective evaluation.** Unit test execution is binary and reproducible. There is no LLM judge, no rubric subjectivity, no ambiguity about what counts as correct. This makes HumanEval scores across papers more comparable than most benchmark categories.

**Fast to run.** 164 problems with simple Python execution takes minutes on a laptop. For self-improving agent systems that evaluate dozens of agent iterations, the low overhead matters. SWE-bench Verified's multi-hour Docker-based evaluation cycle is prohibitive for this use case.

**Well-understood problem distribution.** The problems are simple enough that researchers can manually inspect why a model fails. This interpretability supports debugging agent architectures rather than just ranking them.

**Pass@k flexibility.** The unbiased estimator lets researchers report pass@k for any k from a single set of samples, enabling comparisons across different sampling budgets without re-running the benchmark.

## Critical Limitations

**Saturation.** Frontier models now score above 90% pass@1. At that level, the benchmark has low discriminating power between strong models — differences of 1-2% may reflect sampling variance rather than capability differences. The benchmark was designed in 2021 for a generation of models that scored under 30%. For current frontier model comparisons, it provides weak signal.

**Contamination is unverifiable.** HumanEval problems are public. Models trained on GitHub or Stack Overflow may have seen near-identical problems during pretraining. There is no held-out test set or versioning mechanism to detect or control this. A model scoring 92% may have memorized solutions rather than generalizing.

**Narrow task scope.** Problems are self-contained, require no external context, and test algorithmic correctness on toy-scale inputs. This scope excludes the skills that matter for software engineering agents: reading existing codebases, using APIs, navigating file systems, fixing bugs in unfamiliar code, writing tests for code you did not write. [SWE-bench](../projects/swe-bench.md) was created specifically because HumanEval does not measure these.

**Python only.** The benchmark measures Python generation. The [Reflexion](../concepts/reflexion.md) paper runs separate Rust evaluations by translating HumanEval problems, but the original benchmark has no multilingual coverage. Agents that primarily work in other languages cannot be fairly evaluated.

## When NOT to Use It

Do not use HumanEval as your primary evaluation target when:

- Your agent operates on real repositories (use SWE-bench instead)
- You are comparing two models that both score above 85% (differences are noise)
- Your agent uses tools, file systems, or external APIs (problems do not test these)
- You care about languages other than Python
- You need evidence of generalization rather than benchmark performance (contamination risk is real)

HumanEval remains useful as a fast sanity check during iterative development — to confirm that a self-modification did not break basic code generation capability — not as the primary measure of agent quality.

## Unresolved Questions

**Contamination measurement.** There is no published methodology for quantifying how much of a model's HumanEval score comes from memorization versus generalization. The benchmark authors did not design an evaluation protocol for this.

**Relationship between pass@1 and real task performance.** High HumanEval pass@1 correlates with good chat-based code suggestions, but the correlation with agentic coding task completion (as measured by SWE-bench) is loose. Models that score similarly on HumanEval can differ substantially on SWE-bench, suggesting the benchmarks measure different skills.

**Optimal sampling temperature.** Pass@1 scores are temperature-sensitive. Papers differ on whether to use greedy decoding (temperature=0) or a low nonzero temperature. This is rarely disclosed consistently, making exact comparisons across papers unreliable.

## Alternatives

**[SWE-bench](../projects/swe-bench.md)** — Use when evaluating agents on real software engineering tasks: fixing bugs in GitHub repositories, working with existing codebases, using shell tools. Much harder to run (Docker, multi-hour evaluation) but measures skills HumanEval misses. The current standard for coding agent comparison.

**MBPP** — Similar scope to HumanEval (crowd-sourced Python problems), commonly reported alongside it. Higher false-positive rate for self-generated tests (16.3% vs 1.4%) makes it worse for self-reflection-based improvement loops. Use when you want a second data point alongside HumanEval.

**LiveCodeBench** — Problems drawn from competitive programming sites with rolling updates, reducing contamination risk. Use when you suspect contamination is affecting HumanEval results or need a benchmark that models cannot have memorized during pretraining.

**[AppWorld](../projects/appworld.md)** — Use when evaluating agents on multi-step API interaction tasks rather than algorithmic correctness. Measures a different capability axis entirely.

## Related Concepts

- [Episodic Memory](../concepts/episodic-memory.md) — Self-improving agents store HumanEval failure traces as episodic memories to inform future code generation attempts
- [Reflexion](../concepts/reflexion.md) — Demonstrated 91% pass@1 on HumanEval via verbal self-reflection over execution results
- [Self-Improving Agents](../concepts/self-improving-agents.md) — HumanEval is the standard benchmark for measuring scaffold-level self-improvement in coding agents
- [SWE-bench](../projects/swe-bench.md) — The repository-scale successor benchmark for more realistic coding agent evaluation
- [Agent Skills](../concepts/agent-skills.md) — Code generation as measured by HumanEval is one component of a broader coding agent skill set
