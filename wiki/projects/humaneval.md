---
entity_id: humaneval
type: project
bucket: agent-systems
abstract: >-
  HumanEval is OpenAI's benchmark of 164 Python programming problems used to
  measure code generation accuracy via pass@k; its key differentiator is
  executable unit tests that provide ground-truth functional correctness rather
  than string matching.
sources:
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - SWE-bench
  - OpenAI Codex
last_compiled: '2026-04-05T20:37:56.296Z'
---
# HumanEval

## What It Is

HumanEval is a benchmark released by OpenAI alongside the Codex paper (2021) to evaluate code generation models on functional Python programming problems. It contains 164 hand-written problems, each specifying a function signature, docstring, and a set of unit tests. A model's generated code is executed against those tests; if it passes, the problem is considered solved. The primary metric is **pass@k**: the probability that at least one of k generated samples passes all tests.

The benchmark was designed to address a specific gap: prior code benchmarks used string-matching or BLEU scores against reference solutions, which failed to capture functional correctness. Two programs can solve the same problem through completely different implementations, and BLEU cannot distinguish a correct solution from a wrong one that shares surface tokens with the reference.

## Core Mechanism

Each HumanEval problem is structured as:

- **Prompt:** A Python function signature plus a docstring describing the task, sometimes with examples
- **Canonical solution:** A reference implementation (used to verify the tests, not shown to the model)
- **Unit tests:** A `check` function with `assert` statements covering edge cases

The evaluation procedure:

1. Sample k completions per problem from the model
2. Execute each completion against the unit tests in a sandboxed environment
3. A problem is "solved" if any of the k completions passes all assertions
4. Report pass@1 (greedy/single sample), pass@10, or pass@100 depending on the evaluation budget

The unbiased pass@k estimator from the paper uses n total samples and c correct ones:

```
pass@k = 1 - C(n-c, k) / C(n, k)
```

This estimator reduces variance compared to naively sampling exactly k times.

Problems span topics including string manipulation, list operations, math utilities, simple algorithms, and basic data structure operations. Difficulty skews toward undergraduate-level introductory programming. There are no multi-file problems, no library installation requirements, and no problems requiring network access or external state.

## Key Numbers

| Metric | Value |
|---|---|
| Total problems | 164 |
| Language | Python only |
| Release | July 2021 (alongside Codex paper) |
| Original Codex pass@1 (12B params) | 28.8% |
| GPT-4 pass@1 (2023, OpenAI-reported) | ~80% |
| Reflexion + GPT-3.5 pass@1 | 91% (self-reported, [Shinn et al. 2023](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)) |
| SICA baseline pass@1 | Not primary benchmark for SICA |

The 91% Reflexion result is self-reported and represents a system result (model + iterative self-reflection loop), not raw model capability. GPT-4's 80% is OpenAI-reported. Independent reproduction of top results varies; the benchmark is saturated enough that small methodology differences (temperature, sampling budget, prompt formatting) produce meaningful score swings.

## Strengths

**Executable evaluation:** Pass/fail from unit tests is unambiguous. There is no rubric to debate, no judge to calibrate, no reference solution to overfit to stylistically.

**Widespread adoption:** HumanEval has become the de facto baseline for code generation papers. Cross-paper comparison is possible, though methodology differences (number of samples, temperature) complicate direct comparisons.

**Clean problem structure:** Each problem is self-contained, single-function, and runnable without dependencies beyond Python's standard library. This makes evaluation infrastructure simple to build and reproduce.

**Sensitivity to iterative improvement:** The benchmark captures gains from self-reflection loops well. The Reflexion paper demonstrates a measurable 10+ percentage point improvement over raw GPT-4 through verbal self-reflection, with the self-generated unit tests providing a reliable feedback signal (1.4% false-positive rate on HumanEval, versus 16.3% on MBPP). This makes HumanEval a valid testbed for agent scaffolding experiments.

## Critical Limitations

**Benchmark saturation:** Top models and agent systems now score 85-95%+. The remaining 5-15% consists of problems where failure reflects edge cases in test coverage or unusual problem phrasing, not genuine capability gaps. Differences between strong systems are often within noise at this range.

**Narrow scope hides real-world complexity:** HumanEval assumes single-function, single-file, dependency-free Python. Real software engineering involves multi-file codebases, library integration, understanding existing code, writing tests (not just passing them), and debugging across system boundaries. A system scoring 91% on HumanEval may struggle on tasks requiring any of these. The SICA paper demonstrates this directly: SWE-Bench Verified (real GitHub issues) started at 17% for the same class of systems that comfortably solve HumanEval problems.

**Infrastructure assumption:** Evaluation requires a Python execution environment with sandboxing. Running generated code requires trusting that the sandbox prevents malicious or destructive outputs. Many reported results use simple subprocess execution without strong isolation; reproducing results safely requires additional infrastructure investment.

## When NOT to Use It

Do not use HumanEval as the primary evaluation if:

- You are measuring an agent's ability to work in existing codebases (use [SWE-bench](../projects/swe-bench.md) instead)
- You need multi-language coverage (HumanEval is Python-only; HumanEval-X extends it but loses the canonical status)
- Your system is already at 85%+ and you need to differentiate between strong models (ceiling effects make the benchmark uninformative)
- You are evaluating code understanding, refactoring, or debugging rather than generation from scratch
- You need problems that reflect production software complexity (library calls, async code, database queries, API integration)

## Unresolved Questions

**Test coverage quality:** The unit tests for each problem were written by hand. Coverage depth varies. Some problems have three assertions; others have fifteen. A model can game low-coverage problems by returning hardcoded values that satisfy the visible test cases. The benchmark provides no information about test coverage depth per problem.

**Contamination:** HumanEval problems have been public since 2021. Most training corpora for current models almost certainly include HumanEval problems or solutions. There is no standard decontamination procedure, and model developers report results inconsistently on this point. Scores from models trained after 2022 are difficult to interpret as measuring generalization.

**Governance:** OpenAI released HumanEval under an MIT-style license, but the benchmark has no active maintainers doing systematic updates. There is no process for retiring saturated problems, adding harder ones, or extending to new languages through an official channel. LiveCodeBench and other successors have emerged to fill this gap, but HumanEval remains the dominant citation baseline despite these limitations.

**Pass@k vs. deployment reality:** Pass@1 with greedy decoding measures something different from pass@10 with sampling. Many papers report the metric most favorable to their system without stating their temperature or sampling budget clearly. Comparing pass@1 numbers across papers requires verifying that they used the same sampling configuration.

## Alternatives

- **[SWE-bench](../projects/swe-bench.md):** Use when measuring real-world software engineering capability. Problems are real GitHub issues against actual codebases. Much harder (5-50% range for current systems), less saturated, and more representative of production tasks.
- **MBPP (Mostly Basic Python Problems):** 374 problems sourced from programming contests and exercises. Broader than HumanEval but has a 16.3% false-positive rate in self-generated unit tests, making it less reliable as a feedback signal for agent loops ([Shinn et al.](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)).
- **LiveCodeBench:** Problems sourced from competitive programming contests after a cutoff date, reducing contamination risk. SICA uses it alongside HumanEval for this reason.
- **EvalPlus:** An augmented version of HumanEval with more unit tests per problem (HumanEval+). Reduces the hardcoded-value gaming problem and is generally more conservative in scoring.

Use HumanEval when you need a well-understood baseline for comparison with published work and your system is not already saturating the benchmark. Use EvalPlus for a more rigorous version of the same problems. Use SWE-bench or LiveCodeBench when you need results that transfer to real-world coding capability claims.


## Related

- [SWE-bench](../projects/swe-bench.md) — alternative_to (0.6)
- [OpenAI Codex](../projects/codex.md) — implements (0.7)
