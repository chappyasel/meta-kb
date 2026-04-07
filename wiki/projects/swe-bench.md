---
entity_id: swe-bench
type: project
bucket: agent-systems
abstract: >-
  SWE-bench is a benchmark that tests AI systems on real GitHub issues,
  measuring whether an agent can patch actual Python repositories. It differs
  from synthetic coding tests by requiring end-to-end repo navigation, fault
  localization, and patch validation.
sources:
  - repos/ayanami1314-swe-pruner.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
related:
  - claude
  - mcp
last_compiled: '2026-04-07T11:48:00.255Z'
---
# SWE-bench

## What It Is

SWE-bench is a benchmark for software engineering agents. Each task is a real GitHub issue from a Python repository paired with the original failing tests. The agent receives the repository in its pre-fix state and the issue description, then must produce a patch. The evaluator applies the patch and runs the repository's actual test suite to determine success.

The original dataset (2024) covers 2,294 tasks from 12 Python repositories including Django, Flask, scikit-learn, and pandas. **SWE-bench Verified** is a human-validated subset of 500 tasks where annotators confirmed the issue descriptions are unambiguous and the tasks are solvable. SWE-bench Lite reduces to 300 tasks for faster iteration. These variants exist because the full benchmark has noise: some issues are underspecified, some require context outside the repository, and some have test suites that fail on the original code even before any patching attempt.

The benchmark originates from Princeton NLP (Jimenez et al., 2023) and is the de facto standard for coding agents as of 2025-2026.

## Why It Became the Standard

Most coding benchmarks test isolated function generation (HumanEval, MBPP) or algorithm problems (LeetCode-style). SWE-bench demands something harder: an agent must navigate a real codebase spanning thousands of files, identify which files are relevant to the reported bug, produce a patch that passes the existing tests without breaking others, and do all of this without knowing in advance where the bug lives.

This makes it a reasonable proxy for whether a coding agent can handle real engineering work, not just toy problems. The test suite is the ground truth, which avoids the subjectivity of LLM-based evaluation.

## Benchmarked Performance

Scores below are **self-reported by the submitting teams** unless noted. SWE-bench publishes a leaderboard at swebench.com, but does not independently verify runs — teams submit their own numbers.

| System | SWE-bench Verified | Notes |
|--------|-------------------|-------|
| Claude Opus 4.6 | 79.2% | Self-reported; cited in [Agent Skills survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) |
| Darwin Gödel Machine (best evolved agent) | 50.0% | Self-reported; [Zhang et al. 2025](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md), started from 20.0% seed |
| SICA (14 iterations of self-improvement) | 53% | Self-reported on 50-task subset; [Robeyns et al. ICLR 2025](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md) |
| SICA seed agent | 17% | Same 50-task subset; pre-self-improvement |

The 17% → 53% jump in SICA and the 20% → 50% jump in DGM both used SWE-bench Verified as the optimization target, which raises a question about overfitting to the benchmark. These numbers are on subsets (50 tasks for SICA) and should not be compared directly to full-benchmark scores.

The 79.2% for Claude Opus 4.6 is striking but unverified by independent evaluation. At these accuracy levels, the benchmark may be approaching saturation for state-of-the-art models.

## How Evaluation Works

The test harness:
1. Checks out the repository at the pre-fix commit
2. Applies the agent's patch via `git apply`
3. Runs the repository's test suite, filtered to the tests associated with the issue
4. Reports pass/fail per task

A key subtlety: the agent must pass the "fail-to-pass" tests (tests that failed before the fix) without breaking the "pass-to-pass" tests (tests that were already passing). Patches that fix the reported bug but break existing functionality count as failures.

This evaluation is deterministic given a patch, which is one of SWE-bench's main strengths over benchmarks that rely on [LLM-as-Judge](../concepts/llm-as-judge.md) evaluation.

## Architectural Patterns That Score Well

Based on what the self-improving systems discovered autonomously ([Darwin Gödel Machine](../projects/darwin-godel-machine.md), [SICA](../concepts/self-improving-agent.md)):

- **Granular file viewing and targeted editing** outperforms whole-file read/write. Agents that navigate by line ranges and use string-replacement patches perform better than those that rewrite entire files.
- **Multi-attempt with selection** — generating several candidate patches and using the model to pick the best — consistently improves scores over single-shot generation.
- **Fault localization before editing** — using search tools (ripgrep, AST-based symbol navigation) to identify relevant code before attempting edits.
- **Peer review / self-critique** of generated patches before submission.

The [Darwin Gödel Machine paper](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) is notable because agents discovered these patterns by analyzing their own SWE-bench failures, not by human design.

## Strengths

**Real evaluation signal.** The test suite is objective. An agent either makes the tests pass or it does not, which avoids the drift and inconsistency of model-based graders.

**Covers the full engineering task.** Fault localization, context retrieval, patch generation, and regression avoidance are all exercised in a single task. A system that scores well has to do all of them reasonably well.

**Widely adopted.** Essentially every serious coding agent (Claude Code, Cursor, Windsurf, GitHub Copilot) reports SWE-bench numbers. The shared benchmark enables direct comparison across systems and research papers.

**Multiple granularities.** Full (2,294 tasks), Verified (500), and Lite (300) let practitioners choose between statistical power and evaluation speed.

## Critical Limitations

**Benchmark optimization is the dominant failure mode.** Because SWE-bench Verified is public and fixed, agent developers tune their systems to it. Self-improving systems like DGM and SICA use it as the training signal. A 50% score on SWE-bench does not necessarily mean the agent can handle 50% of real engineering work — it may mean the agent has learned patterns specific to this repository set and issue style. The benchmark lacks a held-out test set that remains unseen during development.

**Python-only.** The benchmark covers 12 Python repositories. Agents optimized for SWE-bench have weak incentive to handle multi-language codebases, shell scripting, configuration management, or infrastructure work. The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) paper includes Polyglot benchmark results specifically because SWE-bench alone does not assess generalization across languages.

**Infrastructure assumption (unspoken):** Running SWE-bench requires docker or a sandboxed environment that can check out Python repositories and execute their test suites. Each task can take 5-20 minutes of wall clock time. Full benchmark evaluation of a single agent run costs meaningful compute and API spend. Teams running at 2,294 tasks with parallelism need significant infrastructure. This is why most published results use Verified or Lite subsets.

**Verification gap.** The leaderboard is self-reported. There is no independent organization that re-runs submissions. High-profile claims (79.2% for Claude Opus 4.6) should be treated as vendor numbers until independently replicated.

## When NOT to Use SWE-bench

**Do not use SWE-bench as a proxy for general software quality if your target environment differs from these 12 repositories.** If you are building agents for JavaScript, Java, Go, or infrastructure-as-code, SWE-bench performance tells you little.

**Do not treat SWE-bench scores as ceilings.** Scores above 70% may reflect benchmark saturation more than true capability. The gap between 70% and 90% on SWE-bench may not correspond to a comparable gap in real-world performance.

**Do not use SWE-bench to measure anything other than patch-generation capability.** It does not test code review, architecture design, test writing, or documentation — tasks that consume significant engineering time.

## Unresolved Questions

**Leaderboard governance.** No stated policy on what counts as a valid submission. Can a team evaluate on the full 500-task Verified set and report only the best 300? Can they run 10 seeds and report the best?

**Maintenance.** The 12 repositories evolve. Issues resolved years ago may have subtly different fix patterns than current issues. How SWE-bench handles version drift is undocumented.

**Cost normalization.** Scores do not account for API cost or wall-clock time. A system spending $500 per task to hit 79% and a system spending $5 to hit 60% are not directly comparable for deployment decisions, but the leaderboard treats them identically.

**Failure mode taxonomy.** SWE-bench reports pass/fail but does not categorize why agents fail — wrong file identified, correct file but wrong edit, correct edit but broken other tests, patch rejected by git. This limits diagnostic value.

## Alternatives

**[GAIA](../projects/gaia.md):** General AI assistant benchmark. Use when you want to test multi-step reasoning and tool use across diverse domains, not specifically code patching.

**[WebArena](../projects/webarena.md):** Browser-based task completion. Use when your agent needs to navigate web interfaces rather than codebases.

**[TAU-bench](../projects/tau-bench.md):** Conversational customer service agents. Use when evaluating agents that follow policies and handle user requests over multi-turn dialogue.

**Polyglot (from DGM paper):** Multi-language coding tasks. Use when SWE-bench's Python focus is too narrow for your target environment.

**LiveCodeBench:** Competitive programming problems with a regularly updated problem set. Use when you need a benchmark that is less susceptible to data contamination because problems are added continuously.

For coding agents specifically: SWE-bench Verified (500 tasks) is the right choice when you need comparability with published systems. Lite (300 tasks) is appropriate for rapid iteration during development. If you care about generalization beyond Python web frameworks, pair SWE-bench results with Polyglot or domain-specific evaluations.

## Related

- [Claude Code](../projects/claude-code.md) — Anthropic's coding agent, one of the highest-scoring systems on SWE-bench
- [Darwin Gödel Machine](../projects/darwin-godel-machine.md) — Used SWE-bench as the empirical validation signal for self-improving agents
- [Self-Improving Agent](../concepts/self-improving-agent.md) — Both DGM and SICA evolved their agents using SWE-bench as the training objective
- [Agent Skills](../concepts/agent-skills.md) — SWE-bench scores appear throughout skill-based agent research as the standard coding evaluation
- [LLM-as-Judge](../concepts/llm-as-judge.md) — What SWE-bench deliberately avoids by using test execution as the oracle
- [ReAct](../concepts/react.md) — The reasoning-then-acting pattern that most high-scoring SWE-bench agents implement
