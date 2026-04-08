---
entity_id: pi
type: project
bucket: agent-architecture
abstract: >-
  Pi-autoresearch is an autonomous optimization loop for the pi coding agent
  that runs try/measure/keep/revert experiments indefinitely, validated by a 53%
  latency reduction on Shopify's Liquid engine across 120 automated runs.
sources:
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/greyhaven-ai-autocontext.md
related:
  - andrej-karpathy
  - autoresearch
last_compiled: '2026-04-08T23:18:58.493Z'
---
# Pi / Pi-autoresearch

## What It Is

Pi is a terminal-based AI coding agent by Mario Zechner. Pi-autoresearch is an extension for Pi, created by David Cortes (davebcn87) and open-sourced with significant push from [Tobi Lütke](../concepts/tobi-lutke.md), that implements [Andrej Karpathy](../concepts/andrej-karpathy.md)'s autonomous experiment loop pattern as a general-purpose optimization framework. The extension gained traction after Lütke used it to achieve a 53% parse+render speedup and 61% fewer allocations on Shopify's Liquid template engine across roughly 120 automated experiments.

The core idea: give an agent a measurable metric, a benchmark script, and a git repository, then let it edit code, run the benchmark, commit improvements, revert regressions, and repeat without stopping.

[AutoResearch](../projects/autoresearch.md) is a separate but related project (greyhaven-ai/autocontext) that wraps similar ideas into a Python control plane with scenario management, multi-agent roles, and frontier-to-local distillation.

## Architectural Design

The extension enforces a clean split between infrastructure and domain knowledge:

```
Extension (domain-agnostic)     Skill (per-domain)
  init_experiment                 command: pnpm test
  run_experiment                  metric: seconds (lower)
  log_experiment                  scope: vitest configs
  widget + dashboard              ideas: pool, parallel...
  persistence + confidence
```

The entire extension is a single TypeScript file (`extensions/pi-autoresearch/index.ts`, ~2,575 lines) that registers three tools, two keyboard shortcuts, one slash command, and event handlers against Pi's extension API. The domain knowledge lives in skill files (`autoresearch-create`, `autoresearch-finalize`), not in the extension itself. This separation means one extension installation serves any measurable optimization target: test speed, bundle size, ML training loss, Lighthouse scores.

## Core Mechanism

### The Experiment Loop

The loop is: edit → commit → `run_experiment` → `log_experiment` → keep or revert → repeat. The agent is explicitly instructed never to stop. Three tools drive this:

**`init_experiment`** writes a JSON config header to `autoresearch.jsonl` with experiment name, metric name, unit, and optimization direction. It increments a segment counter on re-initialization, enabling multi-phase sessions in a single file.

**`run_experiment`** spawns a child process via `bash -c` with wall-clock timing, rolling buffer output capture (capped at 2× the display limit to avoid UTF-8 boundary corruption), and structured metric parsing. Benchmark scripts output lines in the format `METRIC name=value`; the tool parses these via regex and surfaces the primary metric directly to the agent. Output truncates to 10 lines / 4KB for the LLM context while full output streams to a temp file. When `autoresearch.sh` exists, a guardrail (`isAutoresearchShCommand()`) prevents the agent from running any other command, blocking benchmark substitution. If `autoresearch.checks.sh` exists, correctness checks (tests, types, lint) run after each passing benchmark with a separate 300-second timeout; their execution time does not contaminate the primary metric.

**`log_experiment`** records each result as one JSON line in `autoresearch.jsonl` with status (`keep`, `discard`, `crash`, or `checks_failed`), metric value, secondary metrics, confidence score, token cost, and ASI (Actionable Side Information — free-form structured diagnostics). A `keep` auto-commits via `git add -A && git commit`. A `discard`/`crash`/`checks_failed` auto-reverts code changes while preserving the five session files (`autoresearch.jsonl`, `autoresearch.md`, `autoresearch.ideas.md`, `autoresearch.sh`, `autoresearch.checks.sh`).

### Persistence Architecture

Two files keep sessions alive across restarts and context resets:

- **`autoresearch.jsonl`** — append-only log of every run. On session start, `reconstructState()` replays this file line by line to rebuild full state including segment tracking and confidence computation. No database, no server.
- **`autoresearch.md`** — living document with objective, metrics, files in scope, constraints, and what has been tried. A fresh agent with no memory reads this and continues exactly where the previous session left off.

The auto-revert logic runs `git checkout -- .; git clean -fd` but stages the five protected files first.

### Confidence Scoring

After 3+ experiments, the extension computes a confidence score using Median Absolute Deviation (MAD) rather than standard deviation. MAD resists outliers — a crashed run with metric=0 won't inflate the noise estimate the way it would with standard deviation. Confidence = `|best_improvement| / MAD`. Thresholds: ≥2.0× (real signal), 1.0–2.0× (marginal), <1.0× (within noise). Advisory only — the system never auto-discards based on confidence.

### Context Window Management

The extension tracks token consumption per iteration via `advanceIterationTracking()` and estimates future consumption as `max(mean, median)` of historical costs. Before each `run_experiment`, `isContextExhausted()` checks whether `currentTokens + estimated * 1.2` would exceed the context window. If so, it disables autoresearch mode and calls `ctx.abort()`. The `agent_end` event handler then sends a resume message instructing a fresh agent to read `autoresearch.md` and git log. Auto-resume is rate-limited to once per 5 minutes and capped at 20 turns total.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub stars | 3,393 | Repository |
| GitHub forks | 185 | Repository |
| Liquid latency reduction | 53% (7,469 μs → 3,534 μs) | Self-reported (Lütke's PR) |
| Allocation reduction | 61% (62,620 → 24,530) | Self-reported (Lütke's PR) |
| Test regressions | 0 (974 tests) | Self-reported |
| Practitioner example (p95 latency) | 339ms → 34ms across 49 runs, $24 | Self-reported (Westland) |
| Extension size | ~2,575 lines TypeScript | Code |

The Shopify Liquid numbers are self-reported but come with a concrete PR and test count, making them more credible than most benchmark claims. No independent reproduction is documented.

## What It's Good At

**Exhaustive low-level optimization.** The loop explores a much larger space of micro-optimizations than a human engineer would profile for in a focused session. The Liquid case found improvements in a 20-year-old codebase that maintainers had not spotted.

**Constraint-aware exploration.** The reward function design (secondary metric controls, correctness harnesses, scoped file lists) prevents the agent from optimizing by cheating. When an agent at run 7 found that caching query embeddings reduced `embedder_calls` from 7 to 0, the checks caught it and the agent correctly identified why it was disqualified. The ASI mechanism means failures are documented with rollback rationale.

**Cross-session continuity.** The append-only JSONL plus the `autoresearch.md` living document enable genuine session resumption. A fresh agent with no conversational memory can pick up exactly where the previous agent left off.

**Domain generality.** Any CI pipeline with a single measurable metric is a valid target. The skill encodes domain knowledge; the extension knows nothing about what is being optimized.

## Critical Limitations

**Concrete failure mode — context exhaustion mid-session:** Each iteration consumes tokens for edits, commits, benchmark output, and logging. When context runs out, the agent loses its in-memory reasoning about what approaches have been tried. The `autoresearch.md` and ASI annotations are the only bridges, and their quality depends on how consistently the agent has been updating them. A rapid-feedback benchmark can exhaust context in 2–3 iterations, triggering the rate-limited auto-resume and stalling the loop until manual intervention.

**Unspoken infrastructure assumption — git as state machine:** The entire keep/discard/revert cycle assumes a clean git working directory within a single branch. Side effects outside the repository (database state, network requests, files written outside the working directory) are not reverted on discard. Any benchmark that produces external state will silently corrupt the experiment sequence.

**No parallel experimentation.** The loop is strictly sequential. For computationally expensive benchmarks, wall-clock time scales linearly with experiment count. There is no mechanism to run multiple variants simultaneously.

**Benchmark noise vs. confidence.** For fast benchmarks (under ~5 seconds), system load and GC can produce meaningful variance. The SKILL.md advises running the workload multiple times inside the script and reporting the median, but nothing enforces this. Low-confidence improvements can accumulate on a branch if the agent keeps them despite the advisory warning.

## When Not to Use It

**Multi-repository or distributed systems work.** The git-based state machine assumes a single repository. Optimizations that span services, require coordinated deployments, or touch infrastructure outside the repo are outside the loop's model.

**Qualitative or multi-dimensional goals.** Pi-autoresearch needs a single primary numeric metric and a clear optimization direction. "Make the codebase more maintainable" or "improve UX" cannot be expressed as `METRIC name=value`. Attempting to flatten multi-dimensional goals into a single proxy metric often produces Goodhart's Law failures — the agent optimizes the proxy and degrades the unmeasured dimensions.

**Benchmarks with runtime over several minutes.** At 5 minutes per experiment, 50 experiments takes 4+ hours of wall-clock time. The loop is designed for fast feedback (seconds to low minutes). Slow benchmarks also increase the probability of context exhaustion mid-session.

**Teams without existing test coverage.** The correctness harness (`autoresearch.checks.sh`) is what separates optimization from breakage. Without tests, the agent will keep changes that improve the metric while silently breaking behavior.

## Unresolved Questions

**Cost at scale across teams.** Individual practitioners report $24 for 49 runs. What does this look like across a team running parallel sessions on multiple codebases? No organizational cost data exists.

**Conflict resolution when multiple agents touch the same code.** The finalization skill requires that no two change groups touch the same file. For a monorepo with multiple ongoing autoresearch sessions, there is no coordination mechanism. Sessions are siloed to branches, but the constraint gets expensive to enforce at scale.

**What happens after the curve flattens.** The diminishing returns curve is well-documented in practitioner reports, but there is no guidance on when to stop. The `maxIterations` config caps experiments, but setting it requires knowing in advance how many experiments the domain needs. The current design continues indefinitely until the context window fills or a human interrupts.

**Memory across sessions on different domains.** Each session's knowledge (what worked, what failed, why) lives in that session's `autoresearch.jsonl`. There is no mechanism to share learnings across domains or to build organizational knowledge about which optimization patterns tend to work in which contexts. [AutoResearch](../projects/autoresearch.md) attempts to address this with persistent playbooks and knowledge curation, but the two projects are not integrated.

## Alternatives

| Tool | When to choose it |
|------|-------------------|
| [AutoResearch](../projects/autoresearch.md) (greyhaven-ai/autocontext) | Choose when you need multi-agent roles (competitor/analyst/coach), multi-generation scenario management, or frontier-to-local model distillation. More infrastructure overhead. |
| [DSPy](../projects/dspy.md) | Choose when optimizing LLM prompts and pipelines rather than code performance. DSPy compiles prompt programs rather than running free-form code edits. |
| [Voyager](../projects/voyager.md) | Choose when building an agent that accumulates skills in an open-ended environment rather than optimizing a fixed metric in a fixed codebase. |
| [Self-Improving Agents](../concepts/self-improving-agents.md) | The broader concept; pi-autoresearch is one concrete implementation of self-improvement through trial-and-error loops. |
| Manual profiling + `cProfile` | Choose when you need to understand *why* something is slow, not just find changes that make it faster. Pi-autoresearch explores the what; profiling explains the mechanism. |

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md) — the broader class this belongs to
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — the experiment loop parallels RL's try/measure/update cycle; the `autoresearch.md` spec functions as a reward function written in prose
- [Agent Memory](../concepts/agent-memory.md) — JSONL persistence and `autoresearch.md` are the memory layer that enables cross-session continuity
- [Execution Traces](../concepts/execution-traces.md) — the JSONL log is a structured trace of every experiment, including failures and their rationale
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — the harness design and constraint specification require careful human setup; the loop itself runs autonomously

[Source: deep analysis](../raw/deep/repos/davebcn87-pi-autoresearch.md) | [Source: repo metadata](../raw/repos/davebcn87-pi-autoresearch.md) | [Source: practitioner case study](../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md)
