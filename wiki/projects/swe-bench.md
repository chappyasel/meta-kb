---
entity_id: swe-bench
type: project
bucket: agent-architecture
abstract: >-
  SWE-bench is a benchmark of 2,294 real GitHub issues from popular Python
  repositories, where agents must generate patches that pass the issue's
  associated test suite; SWE-bench Verified (500 human-validated tasks) is the
  de facto evaluation standard for coding agents.
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - repos/ayanami1314-swe-pruner.md
  - repos/maximerobeyns-self-improving-coding-agent.md
related: []
last_compiled: '2026-04-08T23:05:48.274Z'
---
# SWE-bench

## What It Does

SWE-bench evaluates software engineering agents on tasks derived from real-world GitHub repositories. Each task presents an agent with a repository at a specific commit, a natural-language issue description, and a test suite. The agent must produce a code patch that makes the failing tests pass without breaking existing ones. No scaffolding is prescribed — agents can search files, run commands, write and test code however they choose.

The benchmark contains 2,294 tasks drawn from 12 popular Python repositories (Django, Flask, scikit-learn, sympy, pytest, and others). A curated subset of 500 tasks, SWE-bench Verified, was validated by human annotators at Anthropic to confirm that each issue is well-specified, the test harness is correct, and the task is solvable. Most serious agent evaluations now use the Verified subset.

The key differentiator from synthetic coding benchmarks like [HumanEval](../projects/humaneval.md) is ecological validity: these are issues that real developers opened, real tests that passed after real patches. The agent must navigate large, messy codebases, understand implicit context, and produce patches that integrate cleanly with existing code conventions.

## Core Mechanism

Each SWE-bench instance consists of:

- **Repository snapshot**: the codebase at the commit before the fix
- **Issue text**: the natural-language bug report or feature request
- **Test patch**: a set of tests that the correct fix must pass (held out from the agent)
- **Gold patch**: the human-written fix (used only for reference, not given to the agent)

Evaluation proceeds by applying the agent's generated patch to the repository, running the full test suite, and checking whether the target tests now pass and no previously-passing tests fail. This is a binary pass/fail per instance; the benchmark score is the percentage of instances resolved.

The `harness/` directory in the SWE-bench repository handles environment setup, patch application, and test execution. Each task runs in a Docker container with the correct Python version and dependencies. Task instances are defined in JSON files specifying the repo, base commit, issue text, and test identifiers.

SWE-bench Lite (300 tasks) is a further subset designed for faster iteration during development. SWE-bench Verified is the current standard for published results.

## Key Numbers

**Benchmark scale:**
- Full SWE-bench: 2,294 tasks across 12 repositories
- SWE-bench Verified: 500 human-validated tasks
- SWE-bench Lite: 300 tasks

**Representative scores (as of mid-2025):**
- Claude Opus 4 (Anthropic): 79.2% on SWE-bench Verified — cited in [Agent Skills survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) as state-of-the-art
- SICA after 14 self-improvement iterations: 53% on SWE-bench Verified (17% seed) — from [SICA deep analysis](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md)
- Darwin Gödel Machine best agent: 50% on SWE-bench Verified (20% seed) — from [DGM paper analysis](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

**Credibility assessment:** The benchmark scores for frontier models are largely self-reported by labs or by agent developers. The evaluation harness is public and reproducible, so in principle any score can be verified. Independent reproductions do occur but are not routine. The Verified subset's human validation adds credibility to the task quality, not to the reported scores.

GitHub stars: ~14,000 (SWE-bench/SWE-bench repository). This reflects adoption as the field's primary coding agent benchmark.

## What Makes It Architecturally Significant

SWE-bench operationalizes something most benchmarks avoid: open-ended code navigation in realistic repositories. An agent solving a SWE-bench task must:

1. Locate relevant files across a codebase that may have hundreds of modules
2. Understand the issue well enough to identify root cause, not just symptoms
3. Produce a patch that is syntactically correct, semantically appropriate, and consistent with the codebase's style and dependencies
4. Avoid regressions — changes that fix the target test while breaking others are scored as failures

This means retrieval, reasoning, planning, and editing must all work together. Agents that excel on narrow coding tasks (generate a function from a docstring) often struggle here because the hard part is understanding what to change, not how to write the change.

The benchmark has become the primary driver of investment in [agent harness](../concepts/agent-harness.md) design. The meta-agent work ([meta-agent article](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)) explicitly lists SWE-bench as a planned evaluation target for harness optimization. [SICA](../projects/darwin-godel-machine.md) and [Darwin Gödel Machine](../projects/darwin-godel-machine.md) both use it as the primary fitness signal for self-improvement loops.

## Strengths

**Ecological validity.** Tasks come from real repositories, real issues, real test suites. Passing a SWE-bench task means the patch would plausibly satisfy the original issue reporter.

**Objective evaluation.** Pass/fail against a deterministic test harness removes LLM-as-judge subjectivity. Given the same patch, any evaluation run produces the same result.

**Broad repository coverage.** Twelve repositories span web frameworks, scientific computing, parsing, testing, and more. A system that scores well across all of them has demonstrated generalization.

**Self-improvement signal.** Because evaluation is automated and cheap to run, SWE-bench works well as the fitness function for agent self-improvement loops. Both SICA and DGM use it this way.

**Verified subset quality.** Human annotation of the 500-task Verified subset caught tasks with ambiguous issues, flawed test harnesses, and under-specified requirements that the original 2,294-task set contained. For serious evaluation, Verified is substantially more reliable.

## Critical Limitations

**Concrete failure mode: test suite as proxy for correctness.** A patch that passes the associated tests is not necessarily correct. Tests may be incomplete, testing surface behavior rather than the underlying fix. An agent can pass SWE-bench Verified at 79% while producing patches that a code review would reject — they satisfy the test oracle but introduce subtle bugs, ignore edge cases, or use approaches inconsistent with the codebase's design. This is structural to any test-based benchmark and applies with particular force to software tasks where correctness has many dimensions beyond test passage.

**Unspoken infrastructure assumption: Python-centric evaluation.** SWE-bench covers only Python repositories. Agents and tools optimized for SWE-bench performance have strong incentives to optimize Python-specific retrieval, parsing, and editing. [Tree-sitter](../projects/tree-sitter.md) integrations and AST-based tools that show up in SICA's self-discovered improvements reflect this. An agent scoring 79% on SWE-bench Verified may perform substantially worse on equivalent tasks in Go, Rust, or Java repositories. The Polyglot benchmark (separate from SWE-bench) addresses this, but SWE-bench itself does not.

## When NOT to Use It

**Evaluating non-Python agents.** If your system targets languages other than Python, SWE-bench scores are a poor proxy for expected performance.

**Rapid iteration during early development.** Full SWE-bench evaluation requires Docker infrastructure, per-task environment setup, and meaningful compute. The Lite subset (300 tasks) helps, but even that is slower than unit tests or synthetic benchmarks. For daily iteration, SWE-bench is an end-of-sprint check, not a development loop signal.

**Tasks requiring human judgment beyond test passage.** If you care whether patches are readable, maintainable, or architecturally sound — qualities a code review would assess — SWE-bench's binary metric will not capture that. You need [LLM-as-Judge](../concepts/llm-as-judge.md) evaluation or human review on top of it.

**Comparing agents on non-coding capabilities.** SWE-bench measures one thing: resolving GitHub issues in Python repositories. Using it to rank general agent capability conflates performance on this specific task distribution with broader intelligence.

## Unresolved Questions

**Score inflation from benchmark contamination.** The repositories in SWE-bench are public, their issues and patches are public, and frontier models are trained on web data that likely includes GitHub content. How much of the performance improvement from GPT-3.5-era baselines (~5%) to current frontier scores (~79%) reflects genuine agent capability versus memorization of patches the model has seen in training is not known. The Verified subset's human annotation addressed task quality, not this concern.

**Cost at scale.** Running a full agent evaluation on SWE-bench Verified at frontier model prices is expensive. Labs with API pricing at $15-75 per million tokens, with agents making dozens of tool calls per task, can spend hundreds of dollars per evaluation run. This creates selection pressure: only well-funded labs and projects can afford frequent full evaluations, which may bias the field toward optimizing for the benchmark rather than exploring diverse approaches.

**Governance of the leaderboard.** The SWE-bench leaderboard aggregates self-reported scores from many teams. Verification that a submission follows the rules (no test leakage, no human assistance, correct Docker environment) is voluntary. There is no independent audit mechanism for leaderboard entries.

**Transfer to production software engineering.** SWE-bench tasks are well-scoped (single issue, associated tests, bounded repository). Real software engineering involves multi-issue projects, unclear requirements, coordination with other developers, and no test suite that perfectly specifies the correct behavior. The relationship between SWE-bench performance and performance on real-world software engineering tasks is asserted but not systematically measured.

## Alternatives

**[HumanEval](../projects/humaneval.md):** Synthetic function-completion tasks with docstrings and tests. Faster and cheaper to evaluate, no environment setup required. Use it when you need a quick capability check on code generation. SWE-bench is better when you need to measure real-world issue resolution.

**SWE-bench Lite:** 300-task subset of the full benchmark. Use it for faster development iteration when the full Verified evaluation is too expensive for your iteration cycle.

**[AppWorld](../projects/appworld.md):** Multi-app agent evaluation covering calendar, email, shopping, and other domains. Use it when you care about tool-use across APIs and structured interfaces rather than code editing. AppWorld tests broader agent capability; SWE-bench tests coding specifically.

**[GAIA](../projects/gaia.md):** General agent benchmark across diverse task types. Use it when you want to measure a wider capability profile. SWE-bench and GAIA measure different things and are not substitutes.

**[Tau-bench](../projects/tau-bench.md):** Customer service agent benchmark with policy compliance evaluation. Use it when your agent targets conversational workflows rather than code editing.

**TerminalBench:** Terminal-based agent tasks. Closer to SWE-bench in style but with broader task types. Use it when you want SWE-bench-style evaluation that extends beyond issue resolution.

## Relationship to Agent Infrastructure

SWE-bench is the implicit target of much current agent infrastructure work. The [Agent Harness](../concepts/agent-harness.md) concept is defined partly by what it takes to score well here. [Self-Improving Agents](../concepts/self-improving-agents.md) systems like SICA and [Darwin Gödel Machine](../projects/darwin-godel-machine.md) use it as the primary fitness function. [Agent Skills](../concepts/agent-skills.md) research tracks SWE-bench Verified scores as evidence that skill acquisition improves coding capability. [Reinforcement Learning](../concepts/reinforcement-learning.md) fine-tuning for coding agents trains on SWE-bench-style tasks.

The benchmark has shaped the field's tooling preferences: retrieval over code, AST-aware editing, precise diff generation, and test execution all receive outsized investment because they move SWE-bench numbers. Practitioners should account for this when interpreting the literature — improvements attributed to general agent capability advances may be partially benchmark-specific optimizations.
