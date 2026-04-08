---
entity_id: pi
type: project
bucket: agent-architecture
abstract: >-
  Pi-autoresearch is a TypeScript extension for the Pi coding agent that runs
  autonomous optimization loops: try a code change, benchmark it, keep
  improvements, revert regressions, repeat indefinitely with git-based
  persistence and MAD-based statistical confidence scoring.
sources:
  - repos/davebcn87-pi-autoresearch.md
  - repos/greyhaven-ai-autocontext.md
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - deep/repos/davebcn87-pi-autoresearch.md
related:
  - andrej-karpathy
  - autoresearch
last_compiled: '2026-04-08T03:01:34.216Z'
---
# Pi (pi-autoresearch)

## What It Is

Pi-autoresearch is a TypeScript extension for [Pi](https://pi.dev/), a terminal-based AI coding agent. It implements [Andrej Karpathy's](../concepts/andrej-karpathy.md) autonomous experiment loop as a general-purpose optimization framework: the agent proposes a code change, runs a benchmark, commits improvements, reverts regressions, and repeats indefinitely without human intervention.

The project was open-sourced by Shopify CEO Tobi Lutke, who used it to achieve a 53% latency reduction and 61% fewer object allocations on Shopify's Liquid template engine across ~120 automated experiments on a 20-year-old Ruby codebase. It is maintained by David Cortes (davebcn87) and has 3,393 stars and 185 forks (GitHub, as of early 2026).

The key architectural decision is a hard separation between infrastructure and domain knowledge. The extension itself knows nothing about what is being optimized. A skill file encodes the domain: what command to run, what metric to track, what files are in scope. This means one extension works for test speed, bundle size, ML training loss, Lighthouse scores, or anything else with a measurable numeric output.

## Core Mechanism

The entire implementation lives in `extensions/pi-autoresearch/index.ts` (~2,575 lines of TypeScript). It registers three tools, two keyboard shortcuts, one slash command, and event handlers via the Pi extension API.

**The loop** is: edit → commit → `run_experiment` → `log_experiment` → keep or revert → repeat. The agent is explicitly instructed to never stop and never ask "should I continue?"

**`init_experiment`** writes a JSON config header to `autoresearch.jsonl`, establishing the session name, metric name, unit, and optimization direction (lower/higher). Calling it again increments a segment counter, enabling multi-phase sessions in a single file.

**`run_experiment`** spawns the benchmark as a detached process group via `bash -c`, tracks wall-clock time, captures output in a rolling buffer (last 2x display limit to avoid UTF-8 boundary corruption), and parses structured metric lines in the format `METRIC name=value`. LLM context gets truncated output (10 lines / 4KB); full output streams to a temp file. If `autoresearch.sh` exists, `isAutoresearchShCommand()` enforces that only that script can run, blocking the agent from substituting simpler commands. After a passing benchmark, if `autoresearch.checks.sh` exists, it runs correctness checks (tests, lint, types) in a separate subprocess with a default 300-second timeout — the checks time does not contaminate the primary metric.

**`log_experiment`** records results with one of four statuses: `keep` (auto-commits via `git add -A && git commit`), `discard` (reverts code changes), `crash` (same as discard), or `checks_failed` (benchmark passed, correctness checks failed). A hard gate blocks `keep` when the last run failed checks. Each result is a single JSON line in `autoresearch.jsonl` containing metric value, secondary metrics, status, description, timestamp, segment index, confidence score, iteration token cost, and optional ASI (Actionable Side Information — free-form structured diagnostics).

**Confidence scoring** uses Median Absolute Deviation rather than standard deviation. MAD resists outliers: a single crashed run with metric=0 would inflate a standard deviation estimate and make real improvements look falsely confident. The formula is `|best_improvement| / MAD`. Thresholds are 2.0x (green, likely real), 1.0–2.0x (yellow, marginal), below 1.0x (red, within noise). This is advisory — the system never auto-discards based on confidence alone.

**Session persistence** uses two files. `autoresearch.jsonl` is the append-only source of truth; `reconstructState()` replays it on session start to rebuild `ExperimentState` including segment tracking and confidence history. `autoresearch.md` is a living document describing the objective, files in scope, constraints, and what has been tried. A fresh agent with no prior context can read these two files and resume exactly where the previous session ended.

**Context window management** tracks token consumption per iteration via `advanceIterationTracking()` and estimates tokens-per-iteration as `max(mean, median)` of the history. Before each `run_experiment`, `isContextExhausted()` checks whether `currentTokens + estimated * 1.2` would exceed the context window. If so, it aborts the current session. The `agent_end` event handler then triggers auto-resume: it sends a user message instructing the agent to restart the loop by reading `autoresearch.md` and git log. Auto-resume is rate-limited to once per 5 minutes and capped at 20 turns.

**Auto-revert** for discard/crash/checks_failed runs `git checkout -- .; git clean -fd` after staging the five protected session files (`autoresearch.jsonl`, `autoresearch.md`, `autoresearch.ideas.md`, `autoresearch.sh`, `autoresearch.checks.sh`).

Two skills ship alongside the extension. `autoresearch-create` asks about the goal/command/metric/scope, creates a branch, writes session files, runs baseline, and starts the loop. `autoresearch-finalize` reads the experiment history, groups kept changes into independent logical branches (one per change group, starting from the merge-base), verifies no two groups touch the same file, and creates clean PRs. A 443-line bash `finalize.sh` handles branch creation, union verification, and rollback on failure.

## Key Numbers

| Metric | Value | Source |
|---|---|---|
| GitHub stars | 3,393 | GitHub (April 2026) |
| Forks | 185 | GitHub (April 2026) |
| Shopify Liquid latency reduction | 53% | Self-reported by Lutke |
| Shopify allocation reduction | 61% | Self-reported by Lutke |
| Shopify experiment count | ~120 experiments, 93 commits | Self-reported |
| Test regressions | 0 (974 tests passing) | Self-reported |
| Cameron Westland case study | 339ms → 34ms p95, 49 experiments, $24 | Self-reported |

The Shopify result is the most prominent validation but is self-reported by the CEO. No independent reproduction exists in the public record. The Westland case study is independently documented and includes JSONL artifacts showing individual run details, lending it more credibility as a methodology reference than as a performance benchmark.

## Strengths

**Breadth of exploration.** The loop tries approaches human engineers would not prioritize for profiling. In the Shopify case, the agent found micro-optimizations in code that had been maintained for 20 years. In the Westland case, it identified "the hidden dominant local cost" from generic object-to-numeric coercion that a standard `cProfile` pass would have deprioritized. Sequential automated search covers more of the optimization space than human-directed profiling.

**Constraint-enforced correctness.** The combination of `autoresearch.checks.sh` (correctness checks), secondary metric monitoring (detecting reward hacking like `embedder_calls` dropping to zero), and the off-limits file list in `autoresearch.md` creates a structured reward function in prose. The agent learns constraint boundaries from the ASI annotations in the JSONL and stops repeating approaches that violated them.

**Domain-agnostic reuse.** Any command that outputs `METRIC name=value` becomes an optimization target. The ecosystem now includes 13+ ports of the pattern across Claude Code, OpenClaw, and other agents.

**Transparent history.** Every experiment produces a git commit (for keeps) or an ASI-annotated JSONL entry (for failures). The full history is human-readable and diffable.

## Critical Limitations

**Context window exhaustion degrades loop quality.** Each iteration consumes tokens. The extension detects approaching exhaustion and triggers auto-resume, but the resuming agent loses its in-memory reasoning about what approaches have been tried. The `autoresearch.md` "What's Been Tried" section is the only bridge — its quality determines how much context is preserved. If the agent fails to update it frequently, context resets cause repeated attempts at already-discarded approaches. The 5-minute rate limit and 20-turn cap on auto-resume also mean rapid exhaustion can stall the loop until a human intervenes.

**Infrastructure assumption: git-managed, file-scoped changes.** The revert mechanism runs `git checkout -- .; git clean -fd`. External side effects — database writes, API calls with side effects, file writes outside the repository — are not reverted. The system assumes every experiment is a pure file-level change within a git repository. Projects with external state mutations during benchmarking will produce unreliable discard behavior.

## When Not to Use It

**Non-deterministic or slow benchmarks.** For benchmarks with high variance (e.g., LLM evaluations, network-dependent tests, flaky test suites), individual runs produce noisy signals. The MAD-based confidence scoring helps but does not fix the underlying problem. The SKILL.md recommends running the workload multiple times inside the benchmark script and reporting the median, but this is advisory — nothing enforces it. A benchmark that takes 10+ minutes per run will also exhaust a context window in 5–10 iterations.

**Multi-file optimization with shared state.** The finalization step requires that no two change groups touch the same file. When optimizations interact (two changes both modify the same config file), they cannot be separated into independent PRs. If the goal is a clean, reviewable PR history rather than a single merged diff, shared-file optimizations create review friction.

**Problems without a single-number metric.** The loop optimizes one primary metric. Code quality, architecture, maintainability, and user experience do not map to `METRIC name=value` lines. Pointing the loop at "make this codebase better" without a concrete numeric target produces unpredictable results. The narrower and more measurable the problem, the more reliably the loop converges.

**Parallel experimentation needs.** The loop is strictly sequential. For computationally expensive benchmarks — ML training runs, large build pipelines — wall-clock time scales linearly with experiment count. There is no mechanism for branching and running multiple variants simultaneously.

## Unresolved Questions

**Cost at scale across a team.** The Westland case study ran 49 experiments for $24 using GPT 5.4 with max thinking. Shopify ran ~120 experiments. Neither case documents token cost per experiment in a way that generalizes across model choices, benchmark sizes, and codebases. There is no public guidance on cost-per-experiment estimators or model selection tradeoffs.

**Organizational memory.** The JSONL artifact documents what was tried and why across every run. Westland notes: "Imagine every autoresearch run across a team stored and indexed as an experiment log. That's an organizational memory about your codebase that doesn't exist today." Pi-autoresearch has no mechanism for this — the JSONL file stays in the working tree of a single session. No indexing, no cross-session search, no aggregation across multiple runs or developers exists in the project.

**Conflict resolution in multi-agent or concurrent sessions.** The project assumes one agent, one session, one repository at a time. Concurrent autoresearch sessions on the same codebase would produce conflicting git states. No coordination mechanism exists.

**Stopping criteria.** The system runs until `maxIterations` or manual interruption. There is no built-in "stop after N consecutive discards" heuristic. The Westland post explicitly notes this as a gap: "Next time I'll add a stopping condition." Without it, the agent continues burning compute on increasingly speculative ideas after the optimization space is exhausted.

## Alternatives

**[AutoResearch](../projects/autoresearch.md)** — the greyhaven-ai `autocontext` project extends the experiment loop pattern into a full multi-agent harness (competitor, analyst, coach, architect, curator roles) with frontier-to-local model distillation, scenario families, and MCP integration. Use autocontext when you need more than a single optimization target — scenario libraries, training data export, or multi-agent evaluation pipelines.

**[Karpathy's original autoresearch](https://github.com/karpathy/autoresearch)** — 630-line Python script, ML-specific (tied to training loss and hyperparameter sweeps), no git integration, no correctness checks. Use this when the target is specifically ML training and you want the minimal reference implementation.

**[Claude Code](../projects/claude-code.md) with autoresearch plugin** (proyecto26/autoresearch-ai-plugin) — port of the same pattern for Claude Code. Use when you are already working inside Claude Code rather than Pi.

**Manual profiling with [cProfile](https://docs.python.org/3/library/profile.html) / benchmark suites** — use when the optimization target is a well-understood hot path, the team has the time to build context in the codebase, and you need guarantees about what changed and why. Human-directed profiling produces more legible results for code review than an automated 120-experiment JSONL.

## Related Concepts

[Self-Improving Agents](../concepts/self-improving-agents.md) · [Agent Memory](../concepts/agent-memory.md) · [Execution Traces](../concepts/execution-traces.md) · [Human-in-the-Loop](../concepts/human-in-the-loop.md) · [Reinforcement Learning](../concepts/reinforcement-learning.md) · [Continual Learning](../concepts/continual-learning.md)

## Sources

[Deep analysis: pi-autoresearch architecture](../raw/deep/repos/davebcn87-pi-autoresearch.md) · [Repository README](../raw/repos/davebcn87-pi-autoresearch.md) · [Cameron Westland: Autoresearch Is Reward Function Design](../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md)
