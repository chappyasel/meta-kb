---
entity_id: eval-driven-iteration
type: approach
bucket: self-improving
abstract: >-
  Eval-Driven Iteration is a development methodology that uses automated test
  suites and measurable metrics to guide iterative improvement of agent
  capabilities, replacing subjective review with mechanical verification loops.
sources:
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - repos/uditgoenka-autoresearch.md
  - deep/repos/anthropics-skills.md
  - deep/repos/uditgoenka-autoresearch.md
related:
  - claude-code
  - andrej-karpathy
  - autoresearch
  - agent-skills
last_compiled: '2026-04-07T01:02:33.042Z'
---
# Eval-Driven Iteration

## What It Is

Eval-Driven Iteration is a development methodology where automated evaluations replace human judgment as the primary signal driving improvement of agent capabilities, prompts, and skills. The core claim: if you cannot measure it mechanically, you cannot improve it reliably.

The methodology has three components. First, a frozen metric — a number produced by running a real command, not self-assessment. Second, an evaluation harness — deterministic tests plus LLM-as-judge for qualitative checks. Third, an iteration loop — propose change, verify metric, keep if improved, revert if not, repeat.

This stands apart from conventional agent development, where developers eyeball outputs and manually tweak prompts. Eval-Driven Iteration forces every change through a gate that cannot be rationalized away.

## Why It Matters

Agent development has a measurement problem. Prompts are opaque, agent behavior varies across runs, and "it looks better" is not reproducible. Without mechanical evaluation, prompt engineering becomes superstition: practitioners accumulate changes that feel right without knowing whether any individual change actually helped.

The methodology matters most in three situations:

1. **Agent skills development**, where AI-generated skills often lack the rigor of hand-crafted implementations. As Philipp Schmid notes, skills are "powerful but often AI-generated and not tested" — without systematic evaluation, you cannot detect capability drift after edits.

2. **Autonomous improvement loops**, where an agent modifies its own code or prompts overnight. Without a frozen metric and reversion mechanism, the agent has no signal for distinguishing progress from drift.

3. **Production agent maintenance**, where user behavior changes over time and static evaluation sets become stale. The auto-harness approach treats this by continuously mining production failures and converting them into new test cases.

## How It Works

### The Core Loop

The loop appears across every implementation in slightly different forms, but the structure is consistent:

```
1. Establish baseline metric (run verification on current state)
2. Propose ONE focused change
3. Commit before verifying (enables clean rollback)
4. Run mechanical verification
5. If improved → keep; if worse → revert
6. Log result with metadata
7. Repeat
```

The "commit before verify" requirement is non-obvious but critical: it ensures every state is recoverable. Without it, a verification failure may leave the repository in an intermediate state that is hard to reason about.

### Evaluation Layers

Practical implementations use two evaluation layers:

**Deterministic checks**: assertions about specific outputs, format compliance, keyword presence, or test suite pass rates. These are cheap, fast, and unambiguous. The [Agent Skills](../concepts/agent-skills.md) documentation recommends 10-12 prompts with deterministic assertions as the foundation of any skill evaluation.

**LLM-as-judge**: a separate model evaluates qualitative properties — correctness, coherence, style — that resist reduction to assertions. The [LLM-as-Judge](../concepts/llm-as-judge.md) pattern introduces its own failure modes (positional bias, sycophancy), so implementations use multiple judges, blind evaluation (judges see candidate X/Y not A/B), and independent invocations to reduce correlation.

The [skill-creator meta-skill](../concepts/agent-skills.md) in Anthropic's official skills repository implements both layers: programmatic assertions for structural checks plus a "comparator" sub-agent that evaluates paired outputs without knowing which used the skill.

### The Regression Gate

The regression gate distinguishes improvement from degradation. Fixed failures become permanent test cases. As Gauri Gupta's auto-harness work demonstrates, "fixes become tested constraints, making future improvements harder but more reliable." Without a gate, the optimizer re-discovers the same ground.

The implementation pattern:

- **Verify command**: "did the target metric improve?"
- **Guard command**: "did anything else break?"

A change passes only if the metric improves AND the guard passes. The [autoresearch skill](../projects/autoresearch.md) implements this as an optional `Guard:` parameter, where the guard command runs unchanged tests that must maintain their pass rate.

### Metric Selection

Metric quality determines loop quality. The [Karpathy Loop](../concepts/karpathy-loop.md) formalization identifies three properties a good metric must have:

- **Mechanical**: produced by running a command, not human assessment
- **Fast**: verification should complete in seconds, not minutes
- **Correlated**: improvement in the metric must predict improvement in the actual capability

Common failure: choosing a metric that is easy to measure but weakly correlated with the target capability. An agent that optimizes test coverage can improve the number from 72% to 90% while leaving critical paths untested if the tests were auto-generated to cover lines rather than behaviors.

### Noise Handling

Metrics with inherent variance (LLM outputs, network latency, Lighthouse scores) produce false signals. Implementations handle this through:

- **Multi-run median**: run verification 3x, take the median
- **Minimum improvement threshold**: require improvements above noise floor (e.g., +2pp) before accepting
- **Confirmation run**: verify a second time before committing to keep

The [autoresearch skill](../projects/autoresearch.md) documents these as Phase 5.1 noise mitigation strategies but leaves configuration to the user. The [auto-harness](../projects/autoresearch.md) approach from NeoSigma addresses this more systematically by clustering failures before attempting fixes — a change that resolves a cluster generalizes better than one that resolves an individual case.

## Who Implements It

Several distinct implementations exist, each making different tradeoffs:

**[Claude Code](../projects/claude-code.md)** implements the methodology at the skill level through the skill-creator meta-skill. The evaluation framework in `skills/skill-creator/scripts/` runs three tiers: static validation (~free), full end-to-end via `claude -p` (~$3.85), and LLM-as-judge scoring (~$0.15). Description optimization runs 3x per query to measure trigger rates, splits 60/40 train/test, and iterates up to 5 times.

**[AutoResearch](../projects/autoresearch.md)** generalizes the loop from ML training to any measurable domain. Its seven core principles codify the methodology: mechanical metrics only, fast verification, cheap iteration, git as memory. The `autonomous-loop-protocol.md` defines an 8-phase loop with explicit crash recovery, stuck detection (>5 consecutive discards triggers re-read and radical change), and TSV logging.

**auto-harness** (NeoSigma) extends the pattern to production systems by mining failure traces, clustering by root cause, and converting failure clusters into evolving regression suites. Their reported result on Tau3 benchmark tasks: 0.56 to 0.78 (~40% improvement). This figure is self-reported and not independently validated.

**[Agent Skills](../concepts/agent-skills.md)** evaluation per Philipp Schmid's approach: define success criteria across outcome, style, and efficiency dimensions; create 10-12 test prompts with deterministic checks; add LLM-as-judge for qualitative assessment; iterate on skill using eval failures. This is the practical minimum for any skill deployment.

**[DSPy](../projects/dspy.md)** operationalizes the methodology for prompt optimization specifically, treating prompts as parameters to be optimized against a metric rather than artifacts to be manually crafted.

## The Frozen Metric Problem

The methodology contains a structural tension that practitioners consistently underestimate. The frozen metric is necessary — without it, the agent cannot distinguish progress from drift. But the frozen metric can also become a trap.

Running hundreds of experiments against identical test cases risks producing "flukes of that particular exam." An agent that achieves 90% on a fixed test suite may have overfit to that suite's quirks rather than learned the underlying capability. The metric improves; the actual behavior may not generalize.

The auto-harness approach partially addresses this by growing the evaluation set with each resolved failure cluster, ensuring the metric reflects an expanding set of real failure modes rather than a fixed test bank. But it does not fully resolve the problem — the new cases are still drawn from the same distribution as past failures, not from future edge cases.

A second failure mode: optimizing the wrong proxy. An agent that minimizes build time might remove tests. An agent that improves code coverage might generate tautological tests. The guard mechanism addresses regression but cannot detect these forms of metric gaming.

## Practical Implementation

### Minimum Viable Eval Loop

For a new agent skill:

1. Write 10-12 realistic prompts spanning success cases, edge cases, and failure cases
2. For each prompt, write at least one deterministic assertion (format check, key phrase present, no forbidden content)
3. Add one LLM-as-judge call per prompt for qualitative assessment
4. Establish a baseline score before any changes
5. Make one change at a time
6. Re-run evaluations after each change
7. Keep only changes that improve the score without regressing existing assertions

### Description Optimization for Skills

The skill-creator implements a specific pattern for optimizing skill trigger descriptions:

1. Generate 20 test queries (realistic user prompts)
2. For each query, run 3x to get stable trigger rates
3. Split 60/40 into train/test sets
4. Iteratively rewrite the description to improve trigger rate on train set
5. Validate on test set to avoid overfitting
6. Accept only if train AND test show improvement

This addresses the undertriggering failure mode: Claude tends not to invoke skills when they would be useful. A description that scores well on both sets is more likely to trigger in production than one optimized only on a single batch.

### Production Failure Mining

For deployed agents, the eval set should evolve with the system:

1. Log all agent traces with per-task outcomes
2. Periodically cluster failures by root cause (not individual error messages)
3. Convert each resolved cluster into permanent regression test cases
4. Treat new failure clusters as the next optimization target

This creates a compounding effect: the evaluation set becomes a historical record of every failure mode the system has encountered, and the guard ensures none recur.

## When NOT to Use This Approach

Eval-Driven Iteration is the wrong tool when:

- **No mechanical metric exists**: if the capability resists quantification, you cannot close the loop. The `/autoresearch:reason` adversarial debate pattern handles subjective domains by substituting blind judge consensus for a scalar metric, but this introduces its own complexity and cost.

- **Metric development time exceeds optimization time**: for one-off tasks, writing a reliable evaluation harness costs more than manual iteration. The methodology pays off over many iterations.

- **The metric lags the actual capability**: if verification takes 20 minutes, iteration rate drops to a few per day and the approach loses its advantage over manual development.

- **The evaluation set is too small or too narrow**: fewer than 10 test cases makes statistical significance meaningless. A test set drawn entirely from one domain will produce a skill that overfits to that domain.

## Unresolved Questions

**Cost at scale**: systematic eval loops are expensive. The skill-creator's full eval cycle (20 queries × 3 runs × 5 iterations = 300 LLM calls) is reasonable for a one-time skill creation. Running this continuously in production against an evolving skill set would be prohibitive for most teams. No published guidance on when to re-evaluate vs. when to ship.

**Conflict between metrics**: a change that improves task completion rate may degrade latency. A change that reduces hallucinations may increase refusals. The methodology handles single-metric optimization well but provides no principled way to navigate tradeoffs between competing metrics beyond adding guard commands.

**Eval set governance**: who decides what goes in the evaluation set? The auto-harness approach automates this via failure clustering, but the clustering algorithm introduces its own biases. Failures that are rare but high-impact may be underrepresented. Failures that are frequent but low-impact may dominate.

**Transfer across model versions**: an evaluation set calibrated against Claude 3.5 may not transfer cleanly to Claude 3.7. Optimized prompts may regress when the base model changes. No established practice for managing eval set validity across model upgrades.

## Related Concepts

- [Karpathy Loop](../concepts/karpathy-loop.md) — the original formalization of the constraint-metric-loop pattern
- [Agent Skills](../concepts/agent-skills.md) — the primary context where eval-driven iteration applies to skill development
- [LLM-as-Judge](../concepts/llm-as-judge.md) — the pattern used for qualitative evaluation within the harness
- [Self-Improving Agent](../concepts/self-improving-agent.md) — the broader class of systems where this methodology enables autonomous improvement
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — the theoretical framework that eval-driven iteration approximates with discrete trial-and-error
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — used to bootstrap evaluation sets when real failure data is sparse
- [GRPO](../concepts/grpo.md) — a specific RL training method that applies a related principle (reward-driven update, reject poor samples) at the model training level
