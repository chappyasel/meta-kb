---
entity_id: autoresearch
type: project
bucket: self-improving
abstract: >-
  AutoResearch: automated experiment loop (modify-verify-keep/revert) that runs
  continuously on any scalar metric using Claude Code, git as memory, and
  markdown-encoded protocols. Distinguishes itself by requiring zero runtime
  code while covering ML optimization, software performance, security, and
  subjective quality domains.
sources:
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/ericosiu-how-to-practically-deploy-jack-dorsey-s-world-int.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/human-agent-society-coral.md
  - repos/karpathy-autoresearch.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/uditgoenka-autoresearch.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
related:
  - andrej-karpathy
  - claude-code
  - claude
  - self-improving-agent
  - cursor
  - windsurf
  - prompt-engineering
  - nanogpt
  - tobi-lutke
  - codex
  - karpathy-loop
  - claude-md
  - muon-optimizer
last_compiled: '2026-04-07T11:37:08.905Z'
---
# AutoResearch

## What It Does

AutoResearch encodes Andrej Karpathy's self-improvement loop as a Claude Code skill system. The core idea: constrain scope to a single mutable file, define a scalar metric that a shell command can produce, and let the agent loop forever — editing, committing, verifying, and reverting until it finds improvements.

The project exists in two related forms. Karpathy's original is a 630-line `train.py` optimized by an AI agent on a single GPU, with validation bits-per-byte as the fixed metric. Udit Goenka's generalization ([uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch)) encodes the same loop as ~5,000 lines of markdown that shape Claude Code's behavior across any domain. Neither form has a runtime: the "orchestration framework" is the LLM reading instructions.

A third variant, pi-autoresearch (by David Cortes, open-sourced by [Tobi Lütke](../concepts/tobi-lutke.md)), implements the loop as a TypeScript extension for the pi agent with MAD-based statistical confidence scoring, JSONL session persistence, and automatic context-window exhaustion detection. This is the only implementation with programmatic enforcement of loop invariants.

The architectural bet shared across all three: git history is sufficient external memory for an autonomous agent. Every iteration starts with `git log --oneline -20` and `git diff HEAD~1`. Failed experiments are preserved via `git revert` (not `git reset --hard`) so the agent can read them and avoid repeating the same dead ends.

## Core Mechanism

### The Three-File Contract (Original Karpathy)

Karpathy's system enforces a three-file separation that prevents the agent from gaming the evaluation:

- **`prepare.py`** (immutable): handles data loading and the val_bpb evaluation function. Neither human nor agent may touch this file.
- **`train.py`** (mutable): contains model definition, optimizer configuration, and training loop. The agent can rewrite architecture, swap optimizers, change batch sizes — anything.
- **`program.md`** (orchestration): natural language directives telling the agent how to prioritize. No state graphs, no tool schemas.

This constraint is the most important architectural decision. Editing only `train.py` prevents metric gaming and keeps the action space bounded. The fixed 5-minute training budget makes experiments directly comparable across all modifications.

### The Eight-Phase Loop (Generalized Version)

The generalized markdown protocol in `autonomous-loop-protocol.md` runs eight phases per iteration:

1. **Precondition checks**: Verify git repo, clean working tree, no detached HEAD, no stale lock files.
2. **Review**: Read in-scope files, last 10-20 log entries, run `git log --oneline -20` and `git diff HEAD~1`. All six steps are mandatory.
3. **Ideate**: Priority order — fix crashes first, exploit kept commits, explore untried approaches, combine near-misses, simplify, radical experiments when stuck.
4. **Modify**: One atomic change. The "one-sentence test": if the description needs "and" linking unrelated edits, split into separate iterations.
5. **Commit**: `git add <specific-files>` (never `git add -A`), then `experiment(<scope>): <description>`. Commit happens *before* verification to enable clean rollback.
6. **Verify**: Run the mechanical metric command. Phase 5.1 handles noise: multi-run median, minimum improvement threshold, confirmation runs, environment pinning.
7. **Decide**: Improved + guard passed = keep. Improved + guard failed = revert + rework (max 2 attempts). Same/worse = `git revert HEAD`. Crashed = attempt fix (max 3 tries).
8. **Log**: Append TSV line with iteration, commit hash, metric, status, description.

Stuck detection triggers after five consecutive discards: re-read all files, review entire log, combine near-misses, try opposite approaches, try radical changes.

### Pi-Autoresearch: Statistical Infrastructure

The TypeScript extension (`extensions/pi-autoresearch/index.ts`, ~2,575 lines) adds infrastructure the markdown-only version lacks:

- **MAD-based confidence scoring**: `|best_improvement| / MAD` gives a signal-to-noise ratio that resists outliers. Standard deviation would inflate on a single crashed run (metric=0); MAD ignores it.
- **JSONL session persistence**: `autoresearch.jsonl` is append-only. `reconstructState()` replays the entire file on session start. Cross-session memory survives context resets.
- **Context exhaustion detection**: `isContextExhausted()` checks whether `currentTokens + estimated * 1.2` would exceed the window. If so, it aborts and auto-resumes in a fresh session with a pointer to `autoresearch.md`.
- **Benchmark guardrail**: When `autoresearch.sh` exists, `run_experiment` refuses to execute any other command, preventing the agent from running a simplified benchmark to boost its own score.

### The Reason Subcommand: Fitness Without a Scalar

`/autoresearch:reason` handles domains with no natural scalar metric by building a multi-agent debate system:

1. Author-A produces a candidate (cold start, no history).
2. A critic attacks it (minimum 3 weaknesses).
3. Author-B sees task + A + critique, produces B.
4. A synthesizer sees task + A + B only (no critique) and produces AB.
5. A blind judge panel with crypto-random label assignment (X/Y/Z, not A/B/AB) picks a winner.
6. If the incumbent wins N consecutive rounds, convergence is reached.

The judge panel IS the fitness function. This extends the loop to documentation quality, code architecture decisions, and content — any domain where multiple independent judges can distinguish better from worse.

## Key Numbers

| Source | Result | Status |
|--------|--------|--------|
| Karpathy original | 700 experiments in 2 days, 11% speedup on optimized code | Self-reported |
| Tobi Lütke, Shopify Liquid | 37 experiments, 19% performance gain (Karpathy pattern) | Self-reported |
| Tobi Lütke, pi-autoresearch | ~120 experiments, 53% parse+render speedup, 61% fewer allocations, 974 tests passing | Self-reported |
| Community Mac Mini run | 26/35 experiments failed or crashed; 7 successes revealed simpler model was better | Self-reported |
| meta-agent (canvas-org) on tau-bench v3 airline | 67% → 87% holdout accuracy, 15-task holdout | Self-reported, single run |
| uditgoenka/autoresearch | 3.1K GitHub stars | Verifiable |
| pi-autoresearch | 3,393 stars, 185 forks | Verifiable |

None of these benchmarks have been independently validated. The Shopify Liquid result is the most credible due to its specificity (974 unit tests as guard, concrete allocation numbers) and the identity of the reporter. The 26/35 failure rate from the Mac Mini run is normal and expected — the value is in the fraction that succeed.

For context on expected throughput: 12 experiments/hour at 5-minute training cost (Karpathy original), up to 360 experiments/hour at 10-second test cost (software optimization).

## Strengths

**Open-ended modification space.** The agent can rewrite the optimizer, change the architecture, reorder operations. This isn't expressible as a hyperparameter search space. Bayesian optimization finds optimal values within a fixed space; AutoResearch explores structural changes.

**Zero dependencies.** The markdown-only version requires no installation beyond Claude Code. Copy files, define a metric, start looping. This is the most frictionless entry point for self-improving agents.

**Git as auditable memory.** The full experiment history is visible with standard tools. Every kept change is a commit; every failed experiment is a revert commit. Post-session review requires no special tooling.

**Generality across domains.** The same loop primitives that optimize val_bpb drive security auditing (STRIDE + OWASP), documentation generation, adversarial debate, and CI/CD quality gating. The seven core principles — constraint as enabler, mechanical metrics only, git as memory — transfer across domains.

**Crash recovery and stuck detection.** The protocol handles crashes (3 fix attempts then skip), guard failures (2 rework attempts), and stuck loops (escalation after 5 consecutive discards). These weren't in Karpathy's original and represent meaningful reliability improvements.

## Critical Limitations

**Concrete failure mode — metric gaming through noise.** One documented community run flagged a random seed change (42 → 137) that improved the metric without improving the model. The fixed verification command creates a narrow target the agent can optimize against rather than genuinely improving the underlying system. The protocol's only defense is the optional guard command and, in pi-autoresearch, the MAD confidence threshold. For volatile metrics (Lighthouse scores, flaky tests), false keeps accumulate silently in the markdown-only versions.

**Unspoken infrastructure assumption — the metric must already exist.** The entire pattern assumes you can write a shell command that outputs a scalar in seconds. Most real software quality dimensions (architecture fitness, documentation accuracy, code health) don't have this property. The goal-md project ([github.com/jmilinovich/goal-md](https://github.com/jmilinovich/goal-md)) addresses this with "constructed fitness functions" and a dual-score pattern, but this requires substantial upfront work before the loop can start. AutoResearch documentation doesn't mention this gap.

**Prompt compliance degradation.** Over long sessions (50+ iterations), Claude Code drifts from a 700-line protocol. There is no runtime to enforce invariants in the markdown-only versions. If the agent skips the commit-before-verify step, rollback fails silently. Pi-autoresearch mitigates this with programmatic enforcement; the markdown versions cannot.

## When NOT to Use It

**Multi-objective optimization without a dominant metric.** The protocol enforces a single scalar per loop. Guard commands handle "don't regress metric B while improving A," but genuine Pareto tradeoffs (safety vs. speed, latency vs. cost) exceed what binary guard logic can express.

**Large codebases with many in-scope files.** Reading all in-scope files plus git history plus the results log every iteration can exhaust the context window within a few iterations. Pi-autoresearch detects this and auto-resumes; the markdown version stalls silently.

**Noisy metrics without statistical infrastructure.** Lighthouse scores, ML benchmarks, and latency measurements need multi-run medians and minimum improvement thresholds. The markdown version documents these strategies but doesn't enforce them. Without pi-autoresearch's MAD scoring, a run that improves by 0.001% on a noisy metric looks identical to a genuine 5% improvement.

**Domains where metric construction is the hard problem.** If you can't write a `bash -c` command that outputs a meaningful number in under a minute, AutoResearch can't help until you solve that first. The Shopify Liquid result worked because `pnpm test` already emitted parse+render microseconds. Building that measurement infrastructure for a domain without it is a separate project.

**Production agents on unlabeled traces.** The meta-agent pattern (canvas-org/meta-agent) is a better fit when your improvement signal comes from customer conversations with no labeled ground truth. It uses an LLM judge as a surrogate evaluator and validates changes against a small holdout set rather than assuming a deterministic benchmark exists.

## Unresolved Questions

**Cost at scale.** A 360-experiments/hour loop using Opus 4.6 as proposer (as in the meta-agent setup) would incur significant token costs. None of the project documentation estimates API costs for a full overnight run. The experiments-per-dollar tradeoff is undocumented.

**Parallelism.** All implementations are strictly sequential: one experiment at a time. Karpathy's vision of "asynchronously massively collaborative for agents" (SETI@home style, multiple agents exploring different optimizations simultaneously) has no implementation. How to merge parallel experiment branches without conflicts is an open problem.

**Governance of the program.md / GOAL.md.** Who writes the initial metric definition? Who reviews it for gaming potential? For teams, the frozen metric is only as trustworthy as the process that created it. No implementation addresses this organizational question.

**Creativity ceiling.** Community experience consistently reports that agents prefer safe incremental changes over radical experiments. The stuck-detection escalation strategies (try opposites, try radical changes) are heuristic prompts, not mechanisms that guarantee exploration diversity. Whether this is a fundamental limitation of current LLMs or a solvable prompt engineering problem is unanswered.

**Conflict resolution in bounded vs. unbounded mode.** The CI/CD integration pattern (`--fail-on critical --iterations 10`) assumes the agent will find something meaningful in 10 iterations. If it doesn't, the pipeline passes silently. There's no guidance on how many iterations are "enough" for a given metric and codebase size.

## Alternatives

**Use [Bayesian optimization](../concepts/prompt-engineering.md) when** your optimization target is expressible as a fixed hyperparameter space and you have labeled outcomes. More sample-efficient than AutoResearch for numeric hyperparameter tuning; less capable for structural code changes.

**Use [meta-agent](https://github.com/canvas-org/meta-agent) when** your agent runs on production data with no labeled ground truth. The LLM judge + holdout pattern is designed for exactly the messy customer workflow setting that AutoResearch's deterministic benchmark requirement excludes.

**Use [DSPy](../projects/dspy.md) when** your optimization target is prompt quality specifically. DSPy's teleprompter framework applies formal optimization to prompt compilation with proper held-out evaluation sets and defined metrics.

**Use [goal-md](https://github.com/jmilinovich/goal-md) when** your domain lacks a natural scalar metric and you need to build the measurement instrument alongside the system being measured. Its dual-score pattern and three-tier metric mutability (locked/split/open) handle the metric construction problem that AutoResearch skips.

**Use [CrewAI](../projects/crewai.md) or [LangGraph](../projects/langgraph.md) when** your task requires coordinating multiple specialized agents with defined roles and handoffs, rather than a single agent iterating on a single target.

**Use [Self-Improving Agent](../concepts/self-improving-agent.md) patterns generally when** you need a framework that separates the meta-level (what to optimize) from the object-level (how to optimize). AutoResearch conflates these in `program.md`; more formal self-improvement frameworks maintain cleaner separation.

## Related Concepts

- [Karpathy Loop](../concepts/karpathy-loop.md) — the foundational modify-verify-keep/revert pattern AutoResearch implements
- [Self-Improving Agent](../concepts/self-improving-agent.md) — the broader category AutoResearch falls into
- [CLAUDE.md](../concepts/claude-md.md) — the agent instruction file pattern AutoResearch's skill system extends
- [Prompt Engineering](../concepts/prompt-engineering.md) — the mechanism by which AutoResearch's markdown protocols shape Claude Code's behavior
- [Muon Optimizer](../concepts/muon-optimizer.md) — used in the original Karpathy `train.py` alongside AdamW
- [nanoGPT](../projects/nanogpt.md) — the model architecture in Karpathy's original autoresearch
- [Claude Code](../projects/claude-code.md) — the agent runtime the generalized skill version targets
- [Cursor](../projects/cursor.md) and [Windsurf](../projects/windsurf.md) — alternative agent runtimes the goal-md variant supports
