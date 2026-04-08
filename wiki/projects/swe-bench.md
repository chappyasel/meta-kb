---
entity_id: swe-bench
type: project
bucket: agent-architecture
abstract: >-
  SWE-bench evaluates LLM coding agents on real GitHub issues by measuring
  whether agents can produce patches that pass the original test suite; its
  Verified subset filters to 500 human-validated instances for higher signal.
sources:
  - repos/ayanami1314-swe-pruner.md
  - repos/maximerobeyns-self-improving-coding-agent.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related:
  - model-context-protocol
last_compiled: '2026-04-08T02:48:19.799Z'
---
# SWE-bench

## What It Is

SWE-bench is a benchmark for measuring whether LLM-powered coding agents can resolve real software engineering problems. Each instance starts from a GitHub issue and the repository state at the time the issue was filed. The agent must produce a code patch. Success means the patch causes previously failing tests to pass without breaking existing ones — the same bar the original human contributor had to meet.

The benchmark draws from 12 popular Python repositories including Django, Flask, scikit-learn, and pytest. The full dataset contains 2,294 instances. SWE-bench Verified is a curated subset of 500 instances that human annotators confirmed are unambiguous, have adequate test coverage, and describe genuine bugs rather than feature requests or documentation tasks.

## Core Mechanism

Each benchmark instance packages:

- A repository at a specific commit
- The GitHub issue text as the problem statement
- A set of "fail-to-pass" tests (failing before the fix, passing after)
- A set of "pass-to-pass" tests (must remain passing throughout)

Evaluation runs the agent against the repository, applies whatever patch it produces, then executes the test suite. The metric is resolved rate: the fraction of instances where the patch causes fail-to-pass tests to succeed and no pass-to-pass tests regress.

No partial credit. A patch either resolves the issue or it doesn't.

SWE-bench Lite is a 300-instance subset designed for faster iteration during agent development. SWE-bench Verified is the higher-signal subset for publication-grade results.

## Key Numbers

State-of-the-art resolved rates on SWE-bench Verified as of mid-2025:

- Claude Opus 4.6: 79.2% (self-reported by Anthropic)
- SICA after 14 self-improvement iterations: 53% on a 50-instance subset (self-reported, research paper)
- Darwin Gödel Machine: 50% on SWE-bench Verified (self-reported)
- Seed agent before self-improvement: 17-20% across systems

The jump from seed agents (~17-20%) to top performers (~79%) reflects how much the evaluation surface rewards agent scaffolding quality: file editing tools, codebase navigation, test execution feedback loops. This is both the benchmark's strength and a limitation — scores measure agent-plus-scaffold, not model reasoning in isolation.

All published numbers are self-reported. The SWE-bench team does not run a centralized leaderboard with independent evaluation infrastructure. Some teams submit patches for independent test execution, but methodology varies across submissions.

## Strengths

**Ecological validity.** Issues come from real repositories with real test suites written by the original developers. There is no benchmark construction bias in what counts as a correct answer — the tests existed before the benchmark.

**No reward hacking through test generation.** The agent cannot write its own tests to pass. Evaluation runs the repository's pre-existing test suite.

**Sensitivity to scaffold quality.** SWE-bench distinguishes between agents with good codebase navigation and file editing tools versus agents that can only write code in context. This makes it useful for measuring agent infrastructure improvements, not just model capability.

**Verified subset.** The 500-instance Verified subset filters out ambiguous problems and instances with inadequate test coverage. This makes Verified the right target for research claims.

## Critical Limitations

**Infrastructure assumption: Python-centric.** All 12 source repositories are Python projects. Agents built primarily for Python development will score better than general-purpose agents, and scores do not transfer predictably to codebases in other languages. A team evaluating an agent for TypeScript or Rust development is extrapolating from an out-of-domain benchmark.

**Concrete failure mode: scaffold conflation.** SWE-bench Verified measures resolved rate, which is a joint property of the base model and the agent harness. Two systems using the same model but different file editing tools, context strategies, or test execution loops can produce resolved rates that differ by 15-20 percentage points. This makes cross-system comparisons difficult to interpret: you are comparing agent architectures, not models. The SICA self-improvement work demonstrated this directly — the same underlying model went from 17% to 53% through scaffold-only changes, with no weight updates.

**No partial credit.** An agent that identifies the correct file, writes a nearly-correct fix, but misses one edge case gets zero credit — same as an agent that produces a nonsensical patch. This creates a ceiling effect for evaluating where agents fail, since partial progress is invisible in the metric.

## When NOT to Use It

Do not use SWE-bench as your primary evaluation when:

- Your agent targets non-Python codebases. The benchmark will not tell you how your agent handles TypeScript generics, Rust lifetimes, or Go interfaces.
- You need to compare base models rather than agent systems. The benchmark rewards scaffolding quality too heavily for clean model comparisons.
- You need low-variance signals for rapid iteration. Running 500 instances per evaluation cycle is expensive. Use SWE-bench Lite (300 instances) or a smaller fixed subset for development, then validate on Verified for publication.
- You are evaluating agents on tasks other than bug fixing: feature development, refactoring, documentation, or multi-repository coordination are not represented.

## Unresolved Questions

**Independent validation.** There is no centralized independent evaluation infrastructure. Researchers run their own evaluation harnesses and report results. It is not clear whether different teams' harness implementations are equivalent, and there is no auditing process for submitted patches.

**Data contamination.** The source repositories are public and the issues are public. Models trained after the benchmark release may have seen both the issues and the ground-truth patches in pretraining data. The benchmark does not provide contamination analysis or separate splits by issue date versus model training cutoff.

**Test suite adequacy.** The Verified subset filters for instances with adequate test coverage, but "adequate" is a human judgment. Some resolved patches may fix the failing tests while leaving related behavior broken. The benchmark has no mechanism to catch fixes that are too narrow.

**Governance of the leaderboard.** The public leaderboard accepts self-reported results. There is no process for challenging or retracting entries, and methodology disclosures vary across submissions.

## Alternatives

**[HumanEval](../projects/humaneval.md)**: Function-level code generation from docstrings. Use when you want to evaluate raw code synthesis capability on isolated problems, not agent-level repository navigation. Much faster to run, but poor ecological validity for real engineering tasks.

**[Tau-bench](../projects/tau-bench.md)**: Conversational agent evaluation on customer service workflows. Use when your agent operates in multi-turn dialogue with tool use, not code editing.

**[AppWorld](../projects/appworld.md)**: Multi-app task completion in a simulated environment. Use when your agent needs to coordinate across multiple software systems rather than fix bugs in one repository.

**[GAIA](../projects/gaia.md)**: General assistant tasks requiring web search, file manipulation, and multi-step reasoning. Use when you want breadth across task types rather than depth in one domain.

**TerminalBench**: Shell-level agent evaluation. Use when your agent operates primarily through terminal commands rather than structured code editing.

For coding agent development specifically, SWE-bench Verified is the right target for publication-grade results. For rapid iteration, SWE-bench Lite on a fixed random subset is more practical. No alternative benchmark currently matches SWE-bench's ecological validity for Python software engineering.

## Related Concepts and Projects

- [Agent Harness](../concepts/agent-harness.md) — the scaffold layer that SWE-bench scores are most sensitive to
- [Self-Improving Agents](../concepts/self-improving-agents.md) — SICA and DGM both use SWE-bench as their primary evaluation target
- [Darwin Gödel Machine](../projects/darwin-godel-machine.md) — 20% to 50% on SWE-bench Verified through population-based self-modification
- [Context Engineering](../concepts/context-engineering.md) — codebase navigation and context management heavily influence resolved rate
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — test pass/fail provides a binary reward signal suitable for RL-based agent training
- [Model Context Protocol](../concepts/model-context-protocol.md) — some agent harnesses use MCP for tool connectivity during evaluation
