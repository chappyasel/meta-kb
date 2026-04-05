---
entity_id: swe-bench
type: project
bucket: agent-systems
abstract: >-
  SWE-bench evaluates AI agents on real GitHub issues requiring code changes,
  using pass/fail test suites as ground truth. Distinct from synthetic
  benchmarks by using unmodified production repositories.
sources:
  - repos/maximerobeyns-self-improving-coding-agent.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related:
  - HumanEval
  - Claude Code
last_compiled: '2026-04-05T20:33:36.749Z'
---
# SWE-bench

## What It Is

SWE-bench is a benchmark that measures how well AI agents fix real software bugs. Each task instance is a GitHub issue paired with a pull request that resolves it, drawn from 12 popular Python repositories including Django, Flask, NumPy, and scikit-learn. The agent receives the repository and an issue description, then must produce a patch. Correctness is judged by running the repository's existing test suite against the patch.

Two variants exist in common use: the original **SWE-bench** (~2,294 instances), and **SWE-bench Verified** (~500 instances), a subset filtered by human annotators at OpenAI to remove tasks with ambiguous specifications or broken tests. Verified is now the standard citation target for agent papers.

The benchmark is maintained by researchers at Princeton NLP.

## Why It Matters

Most code benchmarks before SWE-bench used synthetic problems with known solutions (HumanEval, MBPP, APPS). SWE-bench changed the evaluation regime by grounding assessment in production code: real repositories, real bug reports, real test suites. Passing a SWE-bench task requires the agent to understand an unfamiliar codebase, locate the relevant files, produce a semantically correct patch, and avoid breaking unrelated tests. This is closer to what a software engineer actually does.

The benchmark arrived at a moment when multi-step agents were replacing single-turn code completion, and it became the primary leaderboard for measuring agentic software engineering capability.

## How It Works

### Task Construction

Each instance was constructed by identifying GitHub PRs that:
1. Closed an open issue
2. Modified source files (not just docs or tests)
3. Added or modified tests that specifically exercise the changed behavior

The issue text becomes the agent's problem statement. The diff from the PR defines the reference solution, and the tests added by the PR serve as the pass/fail oracle.

This construction methodology has a notable implication: the benchmark tests whether an agent can reproduce the human contributor's specific fix, not whether it can find *any* valid fix. A patch that correctly solves the issue via a different approach may still fail if it does not satisfy the test oracle the contributor wrote.

### Evaluation

The agent receives:
- The repository at the pre-PR commit
- The issue text
- No gold-standard tests (those would be cheating)

The evaluation harness applies the agent's patch, then runs the PR's test suite. Tests that previously failed must now pass; tests that previously passed must continue to pass.

Infrastructure: evaluation runs inside Docker containers per the [princeton-nlp/SWE-bench](https://github.com/princeton-nlp/SWE-bench) repo. The harness handles environment setup, test execution, and scoring automatically.

## Benchmark Numbers and Credibility

Progress on SWE-bench Verified has been rapid:

| System | Score | Source |
|---|---|---|
| Seed agent (DGM) | 20% | Self-reported (Zhang et al. 2025) |
| DGM best agent after 80 self-improvement iterations | 50% | Self-reported |
| SICA after 14 self-improvement iterations | 53% (50-task subset) | Self-reported |
| Claude Opus 4.6 (scaffolded) | 79.2% | Self-reported via Xu et al. survey |

**Credibility caveat:** Most published numbers are self-reported by the teams building the systems. The [official SWE-bench leaderboard](https://www.swebench.com) tracks submissions, but verification is limited to running evaluation on held infrastructure rather than independent auditing of methodology. Numbers above 50% warrant scrutiny of evaluation details: whether the agent had access to any post-PR repository state, whether the Docker environment matched the harness specification, and whether test selection was consistent.

The 50-task subset used in SICA's results is notably smaller than the full 500-task Verified set, which inflates variance. The DGM's 50% on the full Verified set is a more reliable signal than SICA's 53% on a subset.

## Strengths

**Real code, real judgment.** The evaluation oracle comes from the original repository maintainers, not from benchmark authors. This avoids the calibration problems that afflict manually constructed benchmarks.

**Codebase diversity.** Twelve repositories spanning web frameworks, scientific computing, testing tools, and data libraries. An agent that only knows how to navigate Django's codebase will not generalize.

**Resistance to superficial solutions.** Because tests must both newly pass and not newly fail, a patch cannot just append code that satisfies new tests while breaking existing behavior.

**Measurable progress.** Self-improving systems like the Darwin Godel Machine ([DGM paper](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)) use SWE-bench as the signal guiding their evolutionary loop, demonstrating that the benchmark provides a stable enough gradient to drive actual capability improvement.

## Critical Limitations

**Construct validity gap.** The benchmark tests whether an agent matches one human contributor's approach, not whether it can solve the underlying problem. A patch that fixes the bug via a different mechanism may fail if the contributor's tests encode their specific implementation choices. This makes SWE-bench a more conservative evaluator than it appears, but also means scores are partly a function of test specificity, not just agent quality.

**Infrastructure assumption.** Running evaluation correctly requires matching the exact Docker environment, Python version, and dependency state for each repository. The harness is complex. Teams that misconfigure environments get artificially low scores; teams that relax constraints get artificially high ones. There is no independent audit of published numbers that verifies environment fidelity.

## When Not to Use It

**Multilingual benchmarks.** SWE-bench is Python-only. If you need to evaluate agents on Rust, Go, C++, or Java codebases, use the Polyglot benchmark instead. DGM's results show SWE-bench training transfers to other languages, but direct multilingual evaluation requires Polyglot.

**Measuring specific engineering subtasks.** SWE-bench is an end-to-end benchmark. If you want to measure code navigation, fault localization, test generation, or patch synthesis in isolation, you need task-specific benchmarks. SWE-bench scores conflate all of these.

**Small-scale ablations.** Running full evaluations on 500 tasks is expensive in API calls and wall-clock time. Each evaluation requires spawning Docker containers and running test suites. Systems like SICA run smaller 50-task subsets to manage iteration cost, which substantially increases variance.

## Unresolved Questions

**Score inflation at the frontier.** As agents approach 70-80% on SWE-bench Verified, it becomes unclear whether remaining failures reflect genuine capability limits or benchmark artifacts (poorly written test oracles, ambiguous issue descriptions). The benchmark was not designed with high-performance agents in mind, and no public analysis characterizes what the remaining 20-30% of tasks require.

**Data contamination.** The GitHub repositories and issues are public. Foundation models trained after 2022 may have seen both the issue text and the PR solution in pretraining. No published analysis of the top-performing systems quantifies contamination risk, despite scores now exceeding 70%.

**Cost and reproducibility.** A full DGM run using SWE-bench as its fitness signal takes two weeks and substantial API costs. What counts as a valid submission -- must evaluation use the standard Docker harness, or are alternative setups acceptable? The official leaderboard does not enforce a cost or time budget.

## Alternatives

| Benchmark | Use When |
|---|---|
| **HumanEval** | Measuring single-function code generation; fast iteration; no agent infrastructure needed |
| **Polyglot** | Evaluating multilingual agents or testing generalization across languages |
| **LiveCodeBench** | Measuring competitive programming ability with contamination controls (problems scraped after training cutoffs) |
| **OSWorld / AndroidWorld** | Evaluating computer-use agents on GUI tasks rather than repository-level code changes |

For self-improving agent systems specifically, the Darwin Godel Machine ([DGM](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)) and SICA ([SICA](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md)) both use SWE-bench Verified as their primary fitness signal, confirming its role as the field's standard for agentic software engineering evaluation.

## Related Concepts

- [Claude Code](../projects/claude-code.md): Anthropic's coding agent, a top performer on SWE-bench
- [SICA (Self-Improving Coding Agent)](../projects/sica.md): Uses SWE-bench as an improvement signal for scaffold-level self-modification
- [Darwin Godel Machine](../projects/darwin-godel-machine.md): Demonstrates 2.5x performance gain (20% to 50%) through evolutionary self-improvement measured on SWE-bench
