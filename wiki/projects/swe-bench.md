---
entity_id: swe-bench
type: project
bucket: agent-systems
abstract: >-
  SWE-Bench is a benchmark measuring LLM agent performance on real GitHub
  issues, requiring agents to produce patches that pass the repository's
  existing test suite across 2,294 tasks drawn from 12 Python repositories.
sources:
  - repos/ayanami1314-swe-pruner.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related: []
last_compiled: '2026-04-06T02:10:23.024Z'
---
# SWE-Bench

## What It Does

SWE-Bench evaluates whether LLM agents can resolve real software engineering issues. Each task presents the agent with a GitHub repository at a specific commit and a natural-language issue description. The agent must produce a code patch. Success is binary: the patch either passes the repository's hidden test suite or it does not.

The benchmark draws from 12 popular Python repositories including Django, Flask, scikit-learn, and sympy. Tasks were collected by mining GitHub issues that have associated merged pull requests with tests — meaning each task has a ground-truth human solution and a functional test that validates it.

**SWE-Bench Verified** is a 500-task subset that human annotators screened for quality and solvability. Most serious evaluations use this subset rather than the full 2,294-task set, because several full-set tasks are ambiguous or require information not available in the provided context.

## Core Mechanism

Each benchmark instance contains:
- The repository state at the issue-filing commit
- The issue text as the task description
- A set of "fail-to-pass" tests: tests that fail before the fix and must pass after
- A set of "pass-to-pass" tests: existing tests that must continue to pass

Evaluation runs the agent's patch against both sets. The reported metric is `%Resolved`: the fraction of instances where all fail-to-pass tests pass and no pass-to-pass tests break.

The dataset construction pipeline involves `inference.py` and `evaluation.py` scripts. Evaluation runs inside Docker containers, pulling the target repository at the exact commit specified in the instance. This means results depend on the Docker environment and can vary based on dependency resolution — a practical source of variance that independent replication sometimes surfaces.

## Performance Numbers

The benchmark has seen rapid progress. Numbers as of mid-2025:

| System | SWE-Bench Verified (%) |
|---|---|
| Claude Opus 4.6 (Anthropic) | 79.2 |
| OpenAI Codex (SWE-agent scaffold) | ~50 (range varies by scaffold) |
| Darwin Godel Machine (DGM, seed→best) | 50.0 |
| SICA (self-improving, 14 iterations) | 53.0 |
| Baseline LLM without agent scaffold | ~5–15 |

The 79.2% figure for Claude Opus 4.6 comes from Anthropic's self-reported evaluation. The DGM's 50.0% and SICA's 53.0% figures are self-reported in their respective papers. No third-party organization continuously audits leaderboard submissions. [Self-Improving Agents](../concepts/self-improving-agents.md) systems like [Darwin Gödel Machine](../projects/darwin-godel-machine.md) and SICA both use SWE-Bench Verified as their primary evaluation target, which is part of why scores have risen quickly.

The baseline-to-best gap (roughly 5x over two years) is large enough to be meaningful despite measurement uncertainty. The top scores are almost certainly self-reported.

## Architectural Significance

SWE-Bench has shaped how agent systems are designed, not just measured. Because it requires:

1. Navigating a codebase to find the relevant file(s)
2. Understanding the bug described in natural language
3. Writing a minimal, correct patch
4. Avoiding breaking existing tests

...it pushed the field toward agents with code navigation tools (file search, symbol lookup, grep), iterative self-verification loops, and diff-based editing rather than whole-file replacement. Systems like SICA autonomously discovered that granular file editing (line-range viewing, string replacement) outperforms whole-file rewrites — a result the benchmark itself drove them toward.

The [ReAct](../concepts/react.md) loop — observe, reason, act — appears in most competitive agents. [Retrieval-Augmented Generation](../concepts/rag.md) over the repository's file tree handles the navigation step. [Execution Traces](../concepts/execution-traces.md) and [Iterative Self-Verification](../concepts/iterative-self-verification.md) handle the correctness step.

## Strengths

**Ecological validity.** Tasks come from real repositories with real users filing real bugs. Unlike synthetic benchmarks, there is no question of whether the tasks resemble actual software engineering work — they are actual software engineering work.

**Clear pass/fail signal.** Test suite outcomes eliminate subjective scoring. An agent either fixed the bug or it did not. This clean signal makes SWE-Bench useful for automated self-improvement loops: the [Darwin Gödel Machine](../projects/darwin-godel-machine.md) uses it directly as the fitness function driving evolution.

**Difficulty stratification.** The Verified subset's 500 tasks span trivial one-line fixes to multi-file architectural changes, giving the benchmark a wide dynamic range. Current top systems score ~79% on Verified but struggle significantly on harder tasks requiring cross-file reasoning.

## Critical Limitations

**Concrete failure mode — test coverage gaps.** A patch can pass all fail-to-pass tests while being subtly wrong. If the human-written tests don't cover edge cases the bug manifests in, the agent gets credit for an incorrect fix. This is not a benchmark design flaw so much as an inherent property of test-based validation — but it means `%Resolved` overstates actual correctness for any agent that learns to game minimal test suites.

**Unspoken infrastructure assumption.** Evaluation requires Docker, the correct Python version for each repository, and reproducible dependency installs from pinned commits. Repositories with complex build systems or system-level dependencies (C extensions, database connections) can fail to evaluate correctly due to environment issues unrelated to patch quality. This creates silent failures that inflate `%Resolved` for systems that happen to get skipped on broken instances.

## When NOT to Use It

**Multilingual projects.** SWE-Bench covers Python only. Agents optimized on it may not generalize to JavaScript, Rust, or Go codebases. The Polyglot variant addresses this but has far less adoption and fewer agent results to compare against.

**Measuring agent reasoning in isolation.** SWE-Bench conflates code navigation ability, fault localization, patch generation, and test awareness. If you want to isolate one of these capabilities, you need a purpose-built benchmark. An agent that scores 50% on SWE-Bench may still fail on basic reasoning tasks if it compensates with strong retrieval.

**Evaluating non-coding agent capabilities.** If your agent does document summarization, question answering, or multi-step planning outside of code, SWE-Bench tells you nothing. Use [GAIA](../projects/gaia.md) or [LongMemEval](../projects/longmemeval.md) instead.

**Very small evaluation budgets.** Running SWE-Bench Verified (500 tasks) with current top agents requires meaningful API spend — multiple LLM calls per task, Docker overhead, and retries on failures. Teams evaluating weekly or more frequently often subsample, which introduces variance. Below roughly 100 tasks, confidence intervals are wide enough to mask real differences between systems.

## Unresolved Questions

**Who controls the leaderboard?** The official leaderboard at swebench.com accepts self-reported results. There is no mandated independent reproduction step. Given that scores now directly influence commercial marketing claims, the absence of third-party auditing is a real governance gap.

**Benchmark saturation timeline.** Current top scores on Verified approach 80%. If scores reach 95%+ within a year, the benchmark loses discriminative power for top-tier systems. The full 2,294-task set has more headroom, but many of those tasks have known quality issues. A harder follow-on benchmark (SWE-Bench++, or a multilingual version with stricter test quality) is not yet established.

**Cost at scale.** No public figures exist for what it costs to run a competitive SWE-Bench evaluation end-to-end with a frontier model. Estimates from SICA and DGM papers suggest hundreds of dollars per evaluation run, but these use smaller task subsets. Organizations claiming top leaderboard spots likely spend thousands of dollars per submission — which creates an uneven playing field for academic groups.

**Test leakage.** Several repositories included in SWE-Bench appear in the training data of frontier models. The benchmark attempts to mitigate this by using post-cutoff issues, but exact cutoff dates for each model are rarely disclosed. How much memorization contributes to high scores is unquantified.

## Alternatives

**[GAIA](../projects/gaia.md):** Use when you want to measure general agent reasoning across diverse tasks including web search, file processing, and multi-step planning. GAIA covers non-coding domains SWE-Bench ignores.

**[AppWorld](../projects/appworld.md):** Use when your agent interacts with software applications through APIs and GUIs rather than editing source code. AppWorld tests a different execution modality.

**[LongMemEval](../projects/longmemeval.md):** Use when you specifically care about long-term memory and multi-session recall rather than code editing.

**HumanEval / LiveCodeBench:** Use when you want pure code generation ability without the repository navigation and fault localization components. These are faster and cheaper to run.

**Polyglot variant:** Use when you need multilingual coverage. Far fewer published agent results exist, so comparison is harder.

SWE-Bench remains the field's consensus measure of agentic software engineering capability. Its ecological validity and clean evaluation signal make it irreplaceable for that specific question. Its Python-only scope and test-coverage assumptions make it insufficient as a sole evaluation target for any agent system expected to work in production environments.
