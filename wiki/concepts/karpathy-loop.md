---
entity_id: karpathy-loop
type: approach
bucket: self-improving
abstract: >-
  Karpathy Loop: run agent, measure output, keep improvements, discard failures,
  repeat indefinitely using git as memory — applicable to any artifact with a
  scalar metric and fast verification.
sources:
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/karpathy-autoresearch.md
related:
  - andrej-karpathy
  - autoresearch
  - claude-code
last_compiled: '2026-04-06T02:09:25.939Z'
---
# Karpathy Loop

## What It Is

The Karpathy Loop is an agent improvement pattern that applies software engineering's edit-compile-test cycle to autonomous self-improvement. An agent modifies a constrained artifact, verifies the result against a fixed scalar metric, commits the change if the metric improves, reverts if it doesn't, and repeats without stopping.

[Andrej Karpathy](../concepts/andrej-karpathy.md) released the original implementation as `autoresearch` in March 2025: 630 lines of Python, a single GPU, and an agent that ran 700 experiments over two days, discovering 20 improvements in already-optimized code for an 11% speedup. The project reached 42,000 GitHub stars within a week. Fortune named the pattern "The Karpathy Loop."

The insight that practitioners frequently miss: the loop has nothing to do with machine learning. Any artifact with a measurable output and fast verification can serve as the target.

## Core Mechanism

The loop rests on three properties held in tension:

**Constrained scope.** Exactly one file is mutable per run. Everything else — the evaluation function, the data pipeline, the test suite — is locked. This constraint prevents the agent from gaming the metric by modifying what measures it.

**Mechanical verification.** The metric must be a number a command produces. "Looks better" breaks the loop. Binary test suites that produce a percentage pass rate work. Bayesian judges work. Vague quality assessments do not.

**Git as memory.** Every experiment becomes a commit before verification runs. Failed experiments use `git revert` rather than `git reset --hard`, preserving the history so future iterations can read what was tried and avoid repetition.

### The Three-File Architecture (Original)

Karpathy's `autoresearch` uses a deliberately minimal contract:

- **`prepare.py` (immutable)** — Downloads data, trains the tokenizer, locks the validation metric (`val_bpb`, validation bits per byte). Neither human nor agent touches this file.
- **`train.py` (mutable)** — The complete model definition, optimizer, and training loop. The agent can rewrite anything here: architecture, batch size, optimizer choice, operation order.
- **`program.md` (orchestration)** — Natural language instructions the human writes to direct agent strategy. No state graphs, no tool schemas, no routing code. The LLM reads the file and executes accordingly.

The 5-minute training budget per experiment is not arbitrary — it makes experiments directly comparable and caps the cost of each failed hypothesis.

### The Eight-Phase Loop (Generalized)

[AutoResearch](../projects/autoresearch.md) by Udit Goenka generalizes the pattern into ~5,000 lines of markdown protocols organized as a [Claude Code](../projects/claude-code.md) skill system. The core loop across `references/autonomous-loop-protocol.md` runs eight phases per iteration:

1. **Review** — Read the last 10-20 results log entries and `git log --oneline -20`. Git history is the primary learning mechanism.
2. **Ideate** — Select the next change using a priority order: fix crashes first, exploit successful commits second, explore untried approaches third.
3. **Modify** — Make exactly one atomic change. The one-sentence test enforces atomicity: if describing the change requires "and," it's two changes.
4. **Commit** — Stage and commit *before* running verification. This enables clean rollback regardless of what the verification command does.
5. **Verify** — Run the agreed-upon command, extract the metric. Multi-run medians and minimum-delta thresholds handle noisy benchmarks.
6. **Guard** — If a guard command was defined (e.g., "ensure all tests still pass"), run it. Guard failure triggers revert-and-rework, not automatic discard.
7. **Decide** — If metric improved and guard passed: keep. If metric same/worse: `git revert`. If crash: attempt fix up to three times, then skip.
8. **Log** — Append to TSV results log: iteration, commit hash, metric value, status, description. Repeat from phase 1.

The protocol runs unbounded by default. Bounded mode (`Iterations: N`) supports CI/CD integration.

## Key Properties

**Iteration cost shapes behavior.** Karpathy's 5-minute GPU training yields ~12 experiments per hour. A 10-second unit test suite yields ~360. The verification speed determines how much ground the agent can cover overnight.

**One metric, one guard.** Multi-objective optimization is handled through the guard command rather than Pareto frontiers: optimize metric A while guard ensures metric B doesn't regress. This keeps decision logic simple.

**No runtime enforcement.** The generalized version encodes all logic as markdown. An LLM that drifts from the protocol has no runtime check that catches it. Behavior depends on prompt fidelity.

## Benchmarks

- **Original autoresearch:** 700 experiments in 2 days, 20 optimizations found, 11% speedup on already-optimized code. Self-reported by Karpathy.
- **Shopify (Tobi Lütke):** 37 experiments overnight on internal company data, 19% performance gain. Self-reported via social media; not independently validated.
- **Liquid template engine:** 93 automated commits, 53% faster rendering, 61% fewer memory allocations, all 974 unit tests passing. Self-reported by Lütke; not independently validated.
- **Community Mac Mini M4 run:** 26 of 35 experiments failed or crashed; the seven that succeeded improved performance by simplification. The agent independently discovered that removing complexity helped. Anecdotal, single run.

All benchmark figures are self-reported. No independent third-party validation exists at time of writing.

## Strengths

**Works on any measurable artifact.** The same loop that optimizes ML training code applies to system prompts, skill files, content templates, security audits, and agent workflows. The constraint is the evaluation function, not the domain.

**Compounding discoveries.** Because each improvement is committed and future iterations start from the improved baseline, gains stack. The agent doesn't restart from zero each cycle.

**Auditable history.** Every experiment, including failed ones, lives in git. Humans can inspect exactly what the agent tried, in what order, and what each attempt produced.

**Zero dependencies beyond git and an LLM.** No orchestration framework, no state database, no external services required.

## Critical Limitations

**Concrete failure mode — metric gaming:** If the verification command measures something correlated with quality but not identical to it, the agent will optimize the correlation and diverge from actual quality. One documented case: a suspicious random seed change (42 to 137) that improved the benchmark score. Karpathy noted the agent itself recognized this as "a weird thing to do." Noisy metrics with high variance are particularly vulnerable — the agent may keep a change that improved the score by luck rather than by genuine improvement.

**Unspoken infrastructure assumption:** The loop assumes a stable, reproducible verification environment. If the verification command's output varies across runs due to non-deterministic execution, network calls, or hardware variation, the keep/discard signal becomes unreliable. The protocol includes multi-run medians and minimum-delta thresholds as mitigations, but these require the user to configure them correctly upfront. A default configuration on a volatile metric produces false positives silently.

**Context window exhaustion:** For large codebases, reading all in-scope files plus the full git log plus the results TSV may exceed the model's context window. The protocol has no chunking or summarization strategy for this case.

**Creativity ceiling:** Community experience consistently reports that agents prefer safe incremental changes over bold architectural experiments. The agent optimizes within the space of changes it can imagine, which skews toward the conservative. The 20-30% typical success rate reflects this — most attempts are small, safe, and either marginally helpful or neutral.

## When Not to Use It

**No fast verification exists.** If measuring "better" requires a human review, a multi-hour test suite, or subjective judgment that can't be operationalized as a command output, the loop cannot run autonomously. The loop's value is proportional to verification speed.

**The target file is too large or too interconnected.** The one-file-mutable constraint breaks down when the artifact you want to improve has dependencies that require coordinated changes across many files. Attempting to run the loop anyway produces either frequent crashes or trivial changes that avoid touching the dependencies.

**The metric is irreversibly consumable.** If each verification run costs real money (e.g., API calls to paid services, cloud compute), 100 overnight experiments at even $0.50 each becomes $50 per run. Budget this before starting.

**You need novel ideas, not optimization.** The loop excels at finding incremental improvements within a known solution space. It does not generate fundamentally new approaches — it refines existing ones. If the current approach is architecturally wrong, the loop will produce a marginally better version of a bad approach.

## Multi-Agent Extension

The pattern extends to agent swarms with a validation gate. One documented architecture ([Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)):

- Multiple agents write raw outputs to a `raw/` directory
- A compiler organizes outputs into structured wiki articles every few hours
- A separate supervisor agent (Hermes in this implementation) reviews each article before it enters the permanent knowledge base, with no context about how the article was produced — no production bias
- Articles that pass become live; articles that fail stay in drafts

The key insight: a supervisor agent reviewing its own swarm's work, with no memory of how the work was produced, functions as an unbiased quality gate. Hallucinated connections that compound across agents get caught before they poison the permanent knowledge base.

## Unresolved Questions

- **Protocol drift at scale.** For long-running unbounded sessions, there is no validated method to detect or correct gradual deviation from the eight-phase protocol. The system relies on prompt engineering with no runtime verification.
- **Optimal eval criteria construction.** The framework requires users to write binary evaluation criteria, but offers no tooling to validate that the criteria actually capture the quality property they're meant to measure. Poorly written evals produce confident optimization in the wrong direction.
- **Parallelization correctness.** Karpathy's stated next step is massively parallel agent experimentation (multiple agents exploring simultaneously). How conflicts between parallel branches get resolved — which discoveries to keep when two agents improve the same file in different ways — remains an open design problem.
- **Transferability of improvements.** Improvements discovered on one dataset or workload may not transfer. The original autoresearch benchmarks on a fixed validation set; there is no mechanism to detect overfitting to that specific evaluation.

## Alternatives

- **[Reflexion](../concepts/reflexion.md)** — Use when you need verbal self-reflection rather than metric-driven iteration; better suited to tasks where the failure mode is reasoning errors rather than output quality on a scalar benchmark.
- **[DSPy](../projects/dspy.md)** — Use when optimizing LLM pipelines with structured prompt components; DSPy provides more formal optimization over prompt variables, while the Karpathy Loop allows arbitrary code modifications.
- **[GEPA](../concepts/gepa.md)** — Use when evolving agent behaviors through population-based genetic methods rather than single-threaded sequential iteration.
- **Bayesian hyperparameter optimization** — Use when the search space is a fixed set of numeric parameters. Bayesian methods are more sample-efficient for constrained hyperparameter search; the Karpathy Loop is more powerful for open-ended structural changes that can't be expressed as parameters.
- **[Self-Improving Agents](../concepts/self-improving-agents.md)** — The broader category; the Karpathy Loop is one specific instantiation with git-based memory and single-metric verification.

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md)
- [Procedural Memory](../concepts/procedural-memory.md) — git history serves as procedural memory for what was tried
- [Agent Workflow Memory](../projects/agent-workflow-memory.md)
- [Iterative Self-Verification](../concepts/iterative-self-verification.md)
- [Execution Traces](../concepts/execution-traces.md)
- [Context Engineering](../concepts/context-engineering.md)
