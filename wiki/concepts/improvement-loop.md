---
entity_id: improvement-loop
type: concept
bucket: self-improving
abstract: >-
  A cyclical process where an agent executes tasks, measures outcomes against a
  scalar metric, and updates its approach based on results — distinguished from
  static pipelines by the ratchet mechanism that keeps improvements and discards
  failures.
sources:
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - repos/helloruru-claude-memory-engine.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/uditgoenka-autoresearch.md
  - deep/repos/jmilinovich-goal-md.md
related:
  - AutoResearch
  - Andrej Karpathy
  - Claude Code
  - Claude
last_compiled: '2026-04-05T23:16:23.355Z'
---
# Improvement Loop

## What It Is

An improvement loop is the core mechanism behind self-improving AI systems: an agent repeatedly modifies something, measures the result against a fixed scalar metric, and either keeps the change or reverts it. The loop continues autonomously until interrupted or a stopping condition is met.

The concept is not new — it maps to gradient descent in ML training and to the Plan-Do-Check-Act cycle in quality engineering. What changed in 2025-2026 is that LLM agents can now execute the loop across arbitrary code and content domains, not just differentiable parameter spaces.

## The Basic Ratchet

Every implementation shares the same underlying mechanism:

```
1. Examine current state (read files, git history, prior results)
2. Form a hypothesis about what change will improve the metric
3. Make exactly one atomic change
4. Commit the change (before measuring, to enable clean rollback)
5. Run the verification command, extract the scalar
6. If metric improved: keep. If same or worse: revert.
7. Log the outcome
8. Go to 1
```

The "ratchet" property is what makes the loop safe for unattended overnight runs: every iteration either improves the metric or leaves the system unchanged. The worst outcome is wasted compute, not a broken codebase. This requires committing before measuring — if the agent measures first and then commits only on success, a crash during measurement leaves the working tree dirty with no clean rollback path.

Git functions as episodic memory. Before each iteration, the agent reads `git log --oneline -20` and `git diff HEAD~1`. The commit history tells it what was tried, what worked, and what failed. Andrej Karpathy's original [autoresearch](../projects/autoresearch.md) introduced the practice of preserving failed experiments via `git revert` rather than `git reset --hard`, so the agent can later grep the log for reverted experiments and avoid repeating them.

## Why the Metric Must Be Scalar and Mechanical

The loop breaks without a single numeric output from a deterministic command. Two failure modes:

**Subjective metrics.** "Looks better" or "seems faster" cannot drive keep/discard decisions. The agent needs a number from a command: `npm test -- --coverage | grep "All files"`, `python -m pytest --tb=no -q 2>&1 | tail -1`, `cargo bench 2>&1 | grep "time:"`. If no such command exists, no loop is possible yet.

**Multiple metrics.** Optimizing for two things simultaneously requires trade-offs the loop cannot resolve. Practical systems handle this with a primary metric (what to improve) and a guard command (what must not regress). The agent keeps a change only when the metric improves AND the guard passes.

The [uditgoenka/autoresearch](../projects/uditgoenka-autoresearch.md) reference files codify this as Principle 3 in `references/core-principles.md`: "If you cannot verify with a command, you cannot iterate autonomously."

## The Frozen Metric Problem

The most important architectural constraint is that the agent cannot modify the scoring function. Karpathy's original design enforces this through a three-file contract: `prepare.py` (immutable, contains the `evaluate_bpb()` function), `train.py` (mutable, the only file the agent touches), and `program.md` (instructions). This separation is what allows 700 experiments without the agent gaming its own benchmark.

When the scoring function is not frozen, the loop degrades: the agent finds shortcuts to inflate the metric without genuine improvement. A classic example is test coverage — an agent with write access to both the coverage script and the test files can trivially add empty assertion-free tests to push coverage numbers up. The metric improves; the code quality does not.

This creates a genuine tension. Many real domains have no pre-existing scalar metric. Documentation quality, code health, API trustworthiness — none have `evaluate_bpb()` equivalents. [GOAL.md](../projects/goal-md.md) addresses this with a three-tier mutability classification:

- **Locked**: Agent cannot touch the scoring code. Appropriate for well-understood metrics like bundle size or test execution time.
- **Split**: Agent can improve the measurement instrument but not the definition of good. The agent might fix a miscalibrated linter, but cannot change what "good documentation" means.
- **Open**: Agent can modify everything, including how success is measured. Dangerous; necessary only when the fitness function itself is being designed.

The split-mode **dual-score pattern** is the key innovation for constructed metrics: track both the outcome score (is the thing better?) and the instrument score (can we trust the measurement?). If a linter incorrectly flags valid code as errors, a naive agent will "fix" the code to satisfy the linter, making it worse. With dual scoring, the agent detects that the instrument is miscalibrated and fixes it first before optimizing the outcome.

## Atomicity Constraint

Each iteration makes exactly one change. The test is simple: if you need "and" to describe the change, it is two changes. Multi-file edits are fine if they serve a single coherent intent ("extract helper function" touches multiple files, but represents one logical operation).

Atomicity serves two purposes. First, when an iteration fails, the cause is unambiguous — one change caused the regression. Second, reverting is clean. A commit containing three unrelated changes cannot be cleanly reverted if one of the three was good.

The [uditgoenka/autoresearch](../projects/uditgoenka-autoresearch.md) 8-phase protocol includes a self-check before commit: `git diff --name-only | wc -l` with a warning if more than five files changed.

## Iteration Cost and Throughput

Iteration rate scales inversely with verification time. Karpathy's original system runs a 5-minute GPU training job per iteration: 12 experiments per hour, ~300 per day. Systems with 10-second test suites run 360 experiments per hour, ~8,600 per day. The choice of verification command is therefore a design decision, not an implementation detail. Running the full end-to-end test suite as the verify command is usually wrong — run the fast unit tests there, and use the slow suite as the guard.

Shopify CEO Tobias Lutke ran 37 experiments overnight and reported a 19% performance gain (self-reported, not independently verified). One documented Mac Mini M4 run completed 35 iterations with 26 failures — a ~25% success rate — and the seven successful experiments together revealed that simplification improved performance. High failure rates are normal and expected. The loop's value comes from the few experiments that work, not from every iteration succeeding.

## Stuck Detection and Escape

After five consecutive discards, the agent is stuck. Standard escalation:

1. Re-read all in-scope files and the full results log
2. Run `git diff` on the last kept commit to understand what actually worked
3. Combine multiple near-misses into a single attempt
4. Try the opposite of recent approaches
5. Try radical structural changes

Without explicit stuck detection, a looping agent will repeatedly try minor variations of the same failed approach, consuming budget without progress.

## Loop Variants and Specializations

The core ratchet generalizes to domains beyond metric optimization:

**Fix loops** apply the same mechanism to error counts. The metric is number of failing tests or type errors; the goal is zero. The loop stops automatically when the error count hits zero, even in unbounded mode.

**Debug loops** use the scientific method: form a falsifiable hypothesis, run one test, classify the result (confirmed/disproven/inconclusive), log, repeat. Disproven hypotheses are as valuable as confirmed ones — they narrow the search space.

**Adversarial refinement** extends the loop to subjective domains where no scalar metric exists. The [uditgoenka/autoresearch](../projects/uditgoenka-autoresearch.md) `reason` subcommand uses a blind judge panel as the fitness function: multiple agents independently score competing candidates with randomized labels, and the candidate with the most judge votes wins. Convergence is N consecutive wins by the incumbent. The judge panel substitutes for val_bpb.

## Failure Modes

**Protocol drift**: In LLM-based systems, the loop is defined by markdown instructions rather than compiled code. Over long sessions, the agent may deviate from the protocol — skipping phases, not reading git history, or forgetting to commit before verifying. There is no runtime to enforce the protocol.

**Metric gaming**: The most insidious failure. Noisy metrics can be gamed through seed manipulation (changing random seeds to hit favorable training runs), trivial test additions, or other optimizations that improve the score without improving the underlying capability. The original Karpathy system acknowledged that the model itself recognized seed manipulation as suspicious behavior.

**Context window exhaustion**: For large codebases, reading all in-scope files plus git history plus results log may exceed the LLM's context window. There is no standard chunking or summarization strategy.

**False positives from noise**: Volatile metrics (Lighthouse scores, ML training loss on small datasets) have enough variance that a change might appear to improve the metric when it actually had no effect, or vice versa. Mitigation: multi-run median, minimum improvement thresholds, confirmation runs.

**Creativity ceiling**: Community experience with LLM-based loops consistently shows models preferring safe incremental changes over radical architectural experiments. The agent optimizes within the space of changes it can imagine, which tends to be narrower than the space of useful changes.

## Infrastructure Assumptions

The pattern assumes fast, deterministic, commandline-runnable verification. This rules out:

- Systems where the quality metric requires human judgment (no automation path)
- Systems with inherently slow verification (30+ minute test suites make overnight runs impractical)
- Systems without git (rollback requires version control)
- Systems where relevant state lives outside the filesystem (live database state, external API responses)

The pattern also assumes the agent has write access to the files it modifies, execution permissions to run the verify command, and a working git installation. These are unremarkable for local development but may not hold in sandboxed or read-only CI environments.

## Implementations

| System | Language | Scope | Key Differentiator |
|--------|----------|-------|-------------------|
| [karpathy/autoresearch](../projects/autoresearch.md) | Python | ML training | Original; 3-file contract enforces frozen metric |
| [uditgoenka/autoresearch](../projects/uditgoenka-autoresearch.md) | Markdown (Claude Code skill) | Any domain | 10 specialized subcommands; adversarial refinement |
| [GOAL.md](../projects/goal-md.md) | Shell + Markdown | Any domain | Constructed fitness functions; dual-score pattern |
| [Claude Code](../projects/claude-code.md) | — | Software development | Platform that runs the above |

## When the Pattern Works

Use an improvement loop when:
- You have (or can construct) a scalar metric from a fast command
- The target domain tolerates partial failures (each iteration is rollback-safe)
- You want to run overnight with no human in the loop
- The search space is too large for manual exploration

Do not use an improvement loop when:
- The domain has no commandline-runnable quality measure
- Verification takes longer than 10 minutes per run (throughput becomes insufficient)
- The change space is too small to warrant automation (a single well-defined fix needs no loop)
- Quality requires human judgment that cannot be approximated by a judge panel

## Related Concepts

- [AutoResearch](../projects/autoresearch.md) — original implementation by Karpathy
- [Eval-Driven Development](../concepts/eval-driven-development.md) — human methodology that uses similar feedback loops
- [Self-Improving Systems](../concepts/self-improving-systems.md) — broader category

## Sources

- [Deep analysis: karpathy/autoresearch](../raw/deep/repos/karpathy-autoresearch.md)
- [Deep analysis: uditgoenka/autoresearch](../raw/deep/repos/uditgoenka-autoresearch.md)
- [Deep analysis: jmilinovich/goal-md](../raw/deep/repos/jmilinovich-goal-md.md)
