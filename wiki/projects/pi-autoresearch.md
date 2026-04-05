# Pi Autoresearch

> Autonomous experiment loop extension for the Pi coding agent that implements try/measure/keep/revert cycles with benchmark-driven decisions. Key differentiator: decouples measurement from agent decision-making, letting the agent propose freely while hard metrics decide what stays.

## What It Does

Pi-autoresearch gives the Pi coding agent tools and workflow to run autonomous optimization loops on any measurable target: test speed, bundle size, LLM training loss, build times, Lighthouse scores. The agent edits code, commits, runs a benchmark via `run_experiment`, records results via `log_experiment`, then keeps improvements or reverts regressions. This cycle repeats indefinitely until interrupted. Two session files survive restarts and context resets: `autoresearch.jsonl` (append-only log of every run) and `autoresearch.md` (living document of objectives, wins, and dead ends). A fresh agent with no memory can read these files and continue exactly where the previous session left off.

## Architecture

TypeScript extension for Pi with clean separation between infrastructure and domain. The extension provides three tools (`init_experiment`, `run_experiment`, `log_experiment`), a live status widget, and a dashboard. The skill layer (`autoresearch-create`) captures domain knowledge: optimization target, benchmark command, metric direction, files in scope. A finalize skill (`autoresearch-finalize`) groups kept experiments into independent branches for review. Confidence scoring uses Median Absolute Deviation (MAD) after 3+ experiments to distinguish real gains from benchmark noise. Optional backpressure checks (`autoresearch.checks.sh`) run correctness tests after every passing benchmark.

## Key Numbers

- 3,393 GitHub stars, 185 forks
- Confidence scoring: >=2.0x green (likely real), 1.0-2.0x yellow (marginal), <1.0x red (noise)
- Configurable `maxIterations` cap for cost control
- MIT license
- Inspired by karpathy/autoresearch

## Strengths

- The separation of extension (domain-agnostic infrastructure) from skill (domain knowledge) means one extension serves unlimited optimization domains
- Session files as the persistence mechanism are simple, human-readable, and framework-independent
- Confidence scoring with MAD provides statistical rigor that prevents keeping benchmark-noise improvements

## Limitations

- Tightly coupled to the Pi coding agent; not usable with Claude Code, Cursor, or other agents without porting
- No multi-objective optimization; each session tracks a single metric with a single direction
- Autonomous loops can burn through API tokens quickly; cost control depends on external API key limits or manual `maxIterations` caps

## Alternatives

- [gepa.md](gepa.md) — use when optimizing text artifacts (prompts, configs) with Pareto-aware multi-objective search
- [autocontext.md](autocontext.md) — use when the improvement loop should validate and persist knowledge across scenarios, not just optimize a metric
- [adas.md](adas.md) — use when searching for novel agent architectures rather than optimizing within a known codebase

## Sources

- [../../raw/repos/davebcn87-pi-autoresearch.md](../../raw/repos/davebcn87-pi-autoresearch.md) — "try an idea, measure it, keep what works, discard what doesn't, repeat forever"
