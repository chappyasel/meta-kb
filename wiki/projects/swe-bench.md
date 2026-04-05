---
entity_id: swe-bench
type: project
bucket: agent-systems
sources:
  - repos/ayanami1314-swe-pruner.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Claude Code
  - OpenAI
last_compiled: '2026-04-05T05:35:18.616Z'
---
# SWE-Bench

## What It Is

SWE-Bench is a benchmark for evaluating AI agents on real-world software engineering work. Given a GitHub issue description and the repository it came from, an agent must produce a patch that makes the failing tests pass. The dataset draws from actual merged pull requests across popular Python repositories, so ground-truth patches exist and automated verification is straightforward: run the repo's test suite against the agent's patch.

There are two main variants: the full SWE-Bench (2,294 issues) and SWE-Bench Verified (a 500-issue subset with human-validated problem statements, released to reduce noise from ambiguous or misleading issue descriptions).

## Core Mechanism

Each task instance packages a repository state, an issue description, a set of failing tests, and a passing threshold. An agent receives the issue text and repo contents, then writes a patch. The evaluation harness applies the patch to the pinned repo state and runs the associated tests. Pass rate (fraction of instances where all specified tests pass after patching) is the primary metric.

The difficulty distribution skews hard. Many instances require understanding multiple files, tracing function call chains, and writing nontrivial edits rather than single-line fixes. Agents typically need file search, code navigation, and iterative edit-and-verify loops to score well.

SWE-Bench Verified filters out instances where the original problem statement was misleading enough that human annotators couldn't agree on what the fix should look like. This makes scores on Verified more comparable across systems, since variance from bad prompts is reduced.

## Key Numbers

Scores have climbed fast. Early LLM-only baselines (no tools, no scaffolding) scored under 5% on the full benchmark. With agentic scaffolding, top systems reached 12-20% by mid-2024. By 2025, self-improving agent research reported 50% on SWE-Bench Verified as a result of automated architecture evolution (Darwin Gödel Machine, self-reported in [Zhang et al.](../../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)), up from a 20% baseline.

**Credibility note:** Most published scores are self-reported by the teams building the systems being evaluated. The test set is public, which creates pressure to overfit or cherry-pick. The Verified subset mitigates some instance-quality noise but does not prevent training on similar distributions. Treat leaderboard numbers as rough orderings rather than absolute capability measures.

## Strengths

SWE-Bench captures something real. Issues and patches come from actual development work, not synthetic construction. The automated verification loop (run tests, check pass/fail) removes human judgment from evaluation, making scores reproducible. Compared to benchmarks that test code generation on toy problems, SWE-Bench forces agents to navigate existing codebases, read documentation, and handle the kind of underspecification common in real bug reports.

The Verified subset specifically addressed a known problem: some original instances had ambiguous or incorrect problem statements, making it impossible to tell whether a failing agent was wrong or just interpreting a bad prompt differently than the ground-truth author. Human annotation of those 500 instances makes Verified more trustworthy for comparing agent systems.

SWE-Pruner ([ayanami1314](../../raw/repos/ayanami1314-swe-pruner.md)) uses SWE-Bench Verified as a multi-turn evaluation target precisely because it stress-tests context management: real repositories generate long interaction histories, and the benchmark exposes agents that can't selectively attend to relevant code.

## Critical Limitations

**Concrete failure mode:** An agent that learns to pattern-match on common Python library fix patterns (null checks, off-by-one corrections, missing import statements) can score reasonably well without developing transferable reasoning about unfamiliar codebases. The benchmark is heavily skewed toward popular Python repositories (Django, scikit-learn, sympy, etc.), so agents trained or tuned on adjacent data from those same repos get unacknowledged distributional lift. A system scoring 40% on SWE-Bench Verified may perform significantly worse on internal enterprise codebases with different conventions, languages, or documentation quality.

**Unspoken infrastructure assumption:** Running SWE-Bench at scale requires spinning up isolated, reproducible Python environments for each of thousands of repository states. The evaluation harness assumes Docker availability and the ability to install pinned dependencies from historical package versions. Teams without reliable container infrastructure or with corporate network restrictions on package registries will find the setup substantially harder than the documentation implies. This also makes cost-per-evaluation non-trivial; full benchmark runs at high agent query counts are expensive.

## When Not to Use It

SWE-Bench is the wrong evaluation if your actual problem involves non-Python codebases. The benchmark has near-zero coverage of JavaScript, Go, Rust, or Java at meaningful scale. Scores on SWE-Bench tell you almost nothing about whether an agent handles multi-language monorepos, infrastructure-as-code, or database migrations.

It's also the wrong choice if you need to evaluate agents on proactive development tasks rather than reactive bug-fixing. SWE-Bench always provides an issue description and failing tests; it doesn't test whether an agent can design a new feature from a vague product requirement, refactor for maintainability without a specific bug to fix, or write tests for untested code. Agents optimized for SWE-Bench are optimized for a specific task shape.

## Unresolved Questions

The benchmark maintainers haven't published clear policies on what happens when agents are trained on data that includes SWE-Bench repository history. PyPI and GitHub are public; any model trained on large code crawls has likely seen commits that represent or resemble benchmark solutions. There's no agreed methodology for measuring or controlling this contamination.

Leaderboard governance is informal. There's no independent body verifying that submitted scores used the official harness without modification. The gap between self-reported scores and independently reproduced scores is unknown for most top entries.

At high pass rates, the marginal value of the benchmark decreases. If frontier systems approach 70-80% on Verified, the remaining instances will be the hardest and most unusual bugs, and score improvements there may reflect benchmark-specific tuning more than general capability gains.

## Alternatives

- **[OpenAI SWE-Bench](../projects/)** variants and agent-specific leaderboards: use when you want head-to-head comparison with published systems under controlled conditions
- **LiveCodeBench:** updated continuously with new competitive programming problems; use when you want a contamination-resistant coding benchmark
- **HumanEval / MBPP:** use for fast, cheap evaluation of basic code generation quality, not agentic multi-step repair
- **Internal regression suites:** use when your deployment target is a specific codebase; SWE-Bench scores won't predict performance on your repo

## Related

- [Claude Code](../projects/claude-code.md)
- [Agent Systems](../agent-systems.md)
