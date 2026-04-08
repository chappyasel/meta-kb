---
url: 'https://github.com/davebcn87/pi-autoresearch'
type: repo
author: davebcn87
date: '2026-04-04'
tags:
  - self-improving
  - agentic-skills
  - agent-memory
  - autonomous-loops
  - benchmark-driven-iteration
  - skill-composition
  - git-branching-strategy
key_insight: >-
  Pi-autoresearch decouples domain-agnostic experiment infrastructure (tools,
  persistence, confidence scoring) from domain-specific knowledge (skills),
  enabling any measurable metric to become an autonomous optimization target
  through a try/measure/keep/revert loop with MAD-based statistical confidence,
  append-only session persistence, and automatic context-window exhaustion
  detection.
stars: 3393
deep_research:
  method: source-code-analysis-plus-web
  files_analyzed:
    - extensions/pi-autoresearch/index.ts
    - skills/autoresearch-create/SKILL.md
    - skills/autoresearch-finalize/SKILL.md
    - skills/autoresearch-finalize/finalize.sh
    - tests/finalize_test.sh
    - package.json
    - README.md
  analyzed_at: '2026-04-04'
  original_source: repos/davebcn87-pi-autoresearch.md
relevance_scores:
  topic_relevance: 10
  practitioner_value: 9
  novelty: 9
  signal_quality: 9
  composite: 9.4
  reason: >-
    Pi-autoresearch is a production-tested, open-sourced implementation of
    Karpathy's autonomous experiment loop with MAD-based confidence scoring,
    append-only persistence, skill/infrastructure separation, and context-window
    exhaustion detection—directly exemplifying the self-improving systems pillar
    with transferable patterns for any measurable optimization target.
---

## Architecture Overview

Pi-autoresearch is a TypeScript extension for pi (an AI coding agent by Mario Zechner) that implements Andrej Karpathy's autonomous experiment loop pattern as a general-purpose optimization framework. The project was open-sourced by Shopify CEO Tobi Lutke and is maintained by David Cortes (davebcn87). It gained significant traction after Lutke used it to achieve a 53% parse+render speedup and 61% fewer allocations on Shopify's Liquid template engine across ~120 automated experiments.

The architecture enforces a strict separation between **infrastructure** (the extension) and **domain knowledge** (the skills):

```
Extension (global, domain-agnostic)        Skill (per-domain, encodes knowledge)
  init_experiment                             command: pnpm test
  run_experiment                              metric: seconds (lower)
  log_experiment                              scope: vitest configs
  widget + dashboard                          ideas: pool, parallel...
  persistence + confidence scoring
```

The extension itself is a single ~2,575-line TypeScript file (`extensions/pi-autoresearch/index.ts`) that registers three tools, two keyboard shortcuts, one slash command, and a suite of event handlers with the pi extension API. It depends on four pi peer packages (`@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`, `@sinclair/typebox`) and uses Node.js built-ins for process spawning, filesystem operations, and crypto.

Two skills ship alongside the extension: `autoresearch-create` (sets up a new session: asks or infers goal/command/metric/scope, creates a branch, writes session files, runs baseline, starts looping) and `autoresearch-finalize` (turns a noisy experiment branch into clean, independently-mergeable branches, one per logical change).

## Core Mechanism

### The Experiment Loop

The fundamental cycle is: **edit -> commit -> run_experiment -> log_experiment -> keep or revert -> repeat forever**. The agent is explicitly instructed to never stop ("LOOP FOREVER. Never ask 'should I continue?'").

**`init_experiment`** configures the session by writing a JSON config header to `autoresearch.jsonl` with the experiment name, primary metric name, unit, and optimization direction (lower/higher). It increments a segment counter on re-initialization, allowing the same session to track multiple optimization targets over time while preserving full history.

**`run_experiment`** spawns a child process via `bash -c` with a detached process group, implements wall-clock timing, rolling buffer output capture (keeps last 2x the display limit to avoid UTF-8 boundary corruption), and structured metric parsing. Output is truncated to 10 lines / 4KB for the LLM context window while full output streams to a temp file. A guardrail ensures that if `autoresearch.sh` exists, only that script can be executed -- preventing the agent from bypassing the benchmark. After a passing benchmark, if `autoresearch.checks.sh` exists, it runs backpressure checks (tests, types, lint) with a separate timeout (default 300s). The checks execution time does not contaminate the primary metric.

**`log_experiment`** records the result with one of four statuses: `keep` (auto-commits via `git add -A && git commit`), `discard` (auto-reverts code changes while preserving session files), `crash` (same as discard), or `checks_failed` (benchmark passed but correctness checks failed). A hard gate prevents `keep` when the last run's checks failed. Each result is appended to `autoresearch.jsonl` as a single JSON line containing the metric value, secondary metrics, status, description, timestamp, segment index, confidence score, iteration token cost, and optional ASI (Actionable Side Information -- free-form structured diagnostics).

### Structured Metric Parsing

The benchmark script outputs structured lines in the format `METRIC name=value` which `run_experiment` parses via regex. Names must be word chars, dots, or the mu character; values must be finite numbers. Prototype pollution is guarded against by denying `__proto__`, `constructor`, and `prototype` as metric names. Duplicate names use last-occurrence-wins semantics to allow scripts to refine values. The parsed primary metric is surfaced directly to the agent with machine-ready values for `log_experiment`, eliminating manual extraction from output.

### Session Persistence

State persists across restarts and context resets through two files:

- **`autoresearch.jsonl`** -- Append-only log of every experiment run plus config headers. This is the source of truth. On session start, `reconstructState()` replays the entire JSONL file to rebuild `ExperimentState` including segment tracking, secondary metric registration, and confidence computation.
- **`autoresearch.md`** -- A living document describing the objective, metrics, files in scope, constraints, and what has been tried. A fresh agent with no memory reads this file and can continue exactly where the previous session left off.

A fallback reconstruction path reads from the pi session history (iterating `toolResult` messages for `log_experiment`) for backward compatibility, but the JSONL path is primary.

Auto-revert on discard/crash/checks_failed is carefully implemented to preserve session files: the five protected files (`autoresearch.jsonl`, `autoresearch.md`, `autoresearch.ideas.md`, `autoresearch.sh`, `autoresearch.checks.sh`) are staged before running `git checkout -- .; git clean -fd`.

### Context Window Management

The extension tracks token consumption per iteration via `advanceIterationTracking()` and `recordIterationTokens()`. After each iteration, it estimates tokens-per-iteration as `max(mean, median)` of the history (conservative estimate that handles both outlier-heavy and skewed distributions). Before each `run_experiment`, `isContextExhausted()` checks whether `currentTokens + estimated * 1.2` would exceed the context window. If so, it disables autoresearch mode and calls `ctx.abort()`, allowing the auto-resume mechanism to restart in a fresh session.

Auto-resume is triggered by the `agent_end` event: if autoresearch mode is active and at least one experiment ran this session, it sends a user message instructing the agent to resume the loop by reading `autoresearch.md` and git log. This is rate-limited to once per 5 minutes and capped at 20 auto-resume turns total.

## Design Tradeoffs

### Domain-Agnostic Infrastructure vs. Domain-Specific Skills

The central design decision is the clean split between extension and skill. The extension provides tools, persistence, UI, and statistical analysis -- it has zero knowledge of what is being optimized. The skill encodes what command to run, what metric to track, what files are in scope, and what optimization strategies to try. This means one extension serves unlimited domains: test speed, bundle size, ML training loss, Lighthouse scores, build times. The tradeoff is that the extension cannot provide domain-specific guidance or heuristics -- all intelligence comes from the agent's general reasoning plus the skill's prompt.

### Append-Only JSONL vs. Structured Database

Choosing append-only JSONL over SQLite or any structured store keeps the implementation dead simple: `fs.appendFileSync` for writes, line-by-line replay for reads. The file is human-readable, trivially diffable, and works with standard Unix tools. The tradeoff is O(n) reconstruction on session start (replaying every line), but since experiment counts are typically in the hundreds, not millions, this is negligible. The segment system (incrementing on each `init_experiment`) enables multi-phase sessions within a single file.

### MAD-Based Confidence vs. Standard Deviation

Using Median Absolute Deviation rather than standard deviation for noise estimation is a deliberate choice for robustness. Standard deviation is sensitive to outliers -- a single crashed run with metric=0 would dramatically inflate the noise estimate, making all improvements look falsely confident. MAD, being median-based, is resistant to this. The confidence formula `|best_improvement| / MAD` gives an intuitive "signal to noise" ratio. The 2.0x / 1.0x thresholds are advisory only -- the system never auto-discards based on confidence, preserving agent autonomy.

### Git-Based State Management

Every `keep` creates a real git commit with structured metadata in the commit body (`Result: {"status":"keep","total_us":15200,...}`). Every `discard`/`crash`/`checks_failed` triggers a real git revert. This means the full experiment history is visible in `git log`, diffs are reviewable, and the finalization skill can decompose the branch into independent PRs. The tradeoff is that the git history becomes noisy during experimentation -- which is exactly what the finalize skill addresses.

### LLM Output Truncation Strategy

Two truncation levels coexist: a wider one (default max bytes/lines from pi) for TUI display, and a tight one (10 lines / 4KB) for LLM context. This acknowledges that the LLM's context window is the scarce resource -- benchmark output often contains hundreds of lines of test results, but the agent only needs the tail to decide keep/discard. Full output is always preserved in temp files for manual inspection.

### Benchmark Guardrail

When `autoresearch.sh` exists, `run_experiment` refuses to execute any other command. The `isAutoresearchShCommand()` function strips env vars, harmless wrappers (env, time, nice, nohup), and validates that the core command is `autoresearch.sh` via a known invocation pattern. This prevents the agent from "cheating" by running a simplified or modified benchmark. The system prompt also injects an explicit guardrail message: "Be careful not to overfit to the benchmarks and do not cheat on the benchmarks."

## Failure Modes & Limitations

### Context Window Exhaustion

The primary failure mode. Each iteration consumes tokens for the edit, commit, run_experiment output, and log_experiment recording. The extension mitigates this with proactive detection (`isContextExhausted`) and auto-resume, but there is inherent information loss on context reset -- the agent loses its in-memory reasoning about what approaches have been tried. The `autoresearch.md` file and ASI annotations in the JSONL are the only bridges across context boundaries, making their quality critical.

### Benchmark Noise vs. Confidence Threshold

For fast benchmarks (under 5 seconds), individual runs can vary significantly due to system load, caching, or GC. The SKILL.md instructs agents to run the workload multiple times inside the script and report the median, but this is advisory -- nothing enforces it. Low-confidence improvements (below 1.0x MAD) can accumulate if the agent keeps them despite the warning, leading to a branch full of noise mistaken for signal.

### Crash Recovery Gaps

When `log_experiment` auto-reverts on discard/crash, it runs `git checkout -- .; git clean -fd`. If the agent's code changes created new files outside the git-tracked set, those are cleaned. However, if external side effects occurred (database modifications, network requests, file writes outside the working directory), these are not reverted. The system assumes experiments are purely file-level changes within the repository.

### No Parallel Experimentation

The loop is strictly sequential: one experiment at a time. There is no mechanism for running multiple variants in parallel (e.g., on different branches) and comparing results. For computationally expensive benchmarks (ML training, large builds), this means wall-clock time scales linearly with the number of experiments.

### Finalization Constraint: No Overlapping Files

The `autoresearch-finalize` skill creates independent branches from the merge-base, one per logical change group. The hard constraint is that no two groups can touch the same file. If two optimizations both modify `vitest.config.ts`, they must be merged into a single group, losing the ability to review them independently. The `finalize.sh` script validates this and fails with an explicit error naming the conflicting file.

### Auto-Resume Rate Limiting

The 5-minute cooldown and 20-turn cap on auto-resume mean that rapid context exhaustion (e.g., a very large benchmark output filling context in 2-3 iterations) can stall the loop until a human intervenes. The rate limit exists to prevent runaway token consumption, but it also limits recovery speed.

## Integration Patterns

### Extension API Surface

Pi-autoresearch uses the pi extension API extensively:

- **Tools**: `pi.registerTool()` for `init_experiment`, `run_experiment`, `log_experiment` with Typebox schemas for parameter validation.
- **Shortcuts**: `pi.registerShortcut()` for Ctrl+X (toggle dashboard) and Ctrl+Shift+X (fullscreen overlay).
- **Commands**: `pi.registerCommand("autoresearch")` for the slash command with subcommands (off, clear, or free text to start/resume).
- **Events**: `pi.on()` for `session_start`, `session_switch`, `session_fork`, `session_tree`, `session_before_switch`, `session_shutdown`, `agent_start`, `agent_end`, and `before_agent_start`.
- **System Prompt Injection**: The `before_agent_start` handler appends autoresearch mode instructions to the system prompt when active, including pointers to `autoresearch.md` and `autoresearch.checks.sh`.
- **UI**: `ctx.ui.setWidget()` for the persistent status widget, `ctx.ui.custom()` for the fullscreen overlay with vim-style navigation.
- **Process Execution**: `pi.exec()` for git commands and checks, raw `spawn()` for the benchmark process (with streaming output and process group management).

### Working Directory Override

The `autoresearch.config.json` supports a `workingDir` field that redirects all file I/O and command execution to a different directory. This enables monorepo workflows where the pi session CWD is the repo root but the optimization target is a subdirectory. The config file itself always stays in the session CWD.

### Finalization as Independent Branches

The finalization workflow is designed for team review: each group of kept experiments becomes an independent branch starting from the merge-base. The `finalize.sh` script (443 lines of bash) creates branches, verifies the union matches the original, checks for session artifact leaks and empty commits, and prints cleanup commands. A rollback mechanism deletes created branches and restores the original state on creation failure. Verification failures leave branches intact for inspection.

### Session Files as Agent Memory

The `autoresearch.md` file functions as a structured external memory for the agent. The SKILL.md prescribes a specific format with sections for Objective, Metrics, How to Run, Files in Scope, Off Limits, Constraints, and What's Been Tried. The "What's Been Tried" section is the critical memory: agents are instructed to update it periodically so resuming agents do not repeat failed approaches. The `autoresearch.ideas.md` file serves as a secondary backlog for promising but deferred optimizations.

ASI (Actionable Side Information) in each JSONL entry provides per-experiment structured memory. The SKILL.md is emphatic about annotating failures heavily: "Discarded and crashed runs are reverted -- the code changes are gone. The only record that survives is the description and ASI in autoresearch.jsonl."

## Benchmarks & Performance

### Shopify Liquid Case Study

The most prominent real-world validation: Tobi Lutke ran pi-autoresearch against Shopify's Liquid template engine (Ruby, 20+ years old, powers every Shopify store). Across ~120 automated experiments producing 93 commits:

- Parse+render time: 7,469 us to 3,534 us (**-53%**)
- Object allocations: 62,620 to 24,530 (**-61%**)
- Zero test regressions (all 974 unit tests pass)

This demonstrated the pattern's effectiveness beyond ML hyperparameter tuning -- its original domain in Karpathy's autoresearch. The PR became a reference case for the autoresearch pattern's applicability to general software engineering: Lutke was among the first to apply it outside ML, showing that any CI pipeline with a measurable metric is an autoresearch target. Notably, the agent discovered micro-optimizations in a 20-year-old codebase that human maintainers had missed for two decades, lending weight to the "breadth of exploration" advantage that autonomous loops provide over manual optimization.

### Karpathy's Original Autoresearch

Pi-autoresearch was directly inspired by Karpathy's `karpathy/autoresearch`, a 630-line Python script that ran 50 experiments overnight on single-GPU nanochat training without human intervention. The key generalization pi-autoresearch makes is removing the ML-specific assumptions: where Karpathy's version was tied to training loss and hyperparameter sweeps, pi-autoresearch abstracts the loop to any command + metric + direction triple. The separation of extension from skill is the mechanism that enables this generalization -- the extension knows nothing about the domain, and the skill encodes all domain-specific knowledge.

### Broader Adoption

The repository has accumulated 3,393 stars and 185 forks. Reports from practitioners include a 10x improvement on canvas rendering engine performance (Kaspars Dancis), ported versions for Claude Code (Kyle Boddy, using it with Driveline's OpenBiomechanics data for fastball velocity prediction), and multiple forks adapting the pattern for other AI coding agents (gianfrancopiana/openclaw-autoresearch, proyecto26/autoresearch-ai-plugin for Claude Code, uditgoenka/autoresearch). The ecosystem of autoresearch tools now includes 13+ implementations across different agent platforms, cataloged in repositories like WecoAI/awesome-autoresearch and alvinreal/awesome-autoresearch. A companion project, jhochenbaum/pi-autoresearch-studio, adds a dashboard, plan editor, and PR workflow on top of pi-autoresearch sessions.

### Performance Characteristics of the Extension Itself

The extension's overhead is minimal: state reconstruction replays the JSONL file once on session start (linear in experiment count), confidence computation iterates current-segment results (typically tens to low hundreds), and the dashboard renderer is called on widget updates. The benchmark process itself runs as a detached child process with a rolling buffer capped at 2x the display limit, avoiding unbounded memory growth on large outputs. The temp file streaming threshold is the default max bytes from pi (not the tighter experiment limit), so output overflows to disk early.

Token consumption tracking adds negligible overhead -- it reads `ctx.getContextUsage()` at iteration boundaries and maintains a simple array of historical costs. The context exhaustion check is a single arithmetic comparison.
