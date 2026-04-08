---
entity_id: autoresearch
type: project
bucket: self-improving
abstract: >-
  AutoResearch (Pi-AutoResearch) is a TypeScript extension for the Pi AI coding
  agent that implements Karpathy's autonomous experiment loop as a
  domain-agnostic optimization framework: any measurable metric becomes an
  optimization target through a commit-verify-keep/revert ratchet with MAD-based
  confidence scoring and JSONL session persistence.
sources:
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/uditgoenka-autoresearch.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/human-agent-society-coral.md
  - repos/jmilinovich-goal-md.md
  - repos/karpathy-autoresearch.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/uditgoenka-autoresearch.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/ericosiu-how-to-practically-deploy-jack-dorsey-s-world-int.md
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
related:
  - andrej-karpathy
  - claude-code
  - claude
  - context-engineering
  - codex
  - claude-md
  - multi-agent-systems
  - self-improving-agents
  - reinforcement-learning
  - cursor
  - windsurf
  - pi
  - udit-goenka
last_compiled: '2026-04-08T22:55:49.585Z'
---
# AutoResearch (Pi-AutoResearch)

## What It Does

AutoResearch implements [Andrej Karpathy](../concepts/andrej-karpathy.md)'s autonomous experiment loop as a general-purpose optimization framework for the Pi AI coding agent. You point it at any measurable metric, and it runs forever: edit code, commit, run benchmark, keep or revert, repeat.

The core claim, validated by Shopify's [Tobi Lütke](../concepts/tobi-lutke.md), is that any CI pipeline with a scalar metric can become an autoresearch target. Lütke ran it on Shopify's Liquid template engine (Ruby, 20+ years old) and got a 53% parse+render speedup and 61% fewer allocations across ~120 automated experiments. Zero test regressions across 974 unit tests. That result, in a mature codebase where human engineers had already optimized heavily, is the project's most credible benchmark. It is self-reported.

The project was open-sourced by Lütke and is maintained by David Cortes (davebcn87). It has accumulated 3,393 stars and 185 forks, with a growing ecosystem of forks for other agent platforms including [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [Windsurf](../projects/windsurf.md).

[Source](../raw/deep/repos/davebcn87-pi-autoresearch.md), [Source](../raw/deep/repos/karpathy-autoresearch.md)

## Architectural Differentiator

The central design decision is a strict separation between infrastructure and domain knowledge. The extension (`extensions/pi-autoresearch/index.ts`, ~2,575 lines of TypeScript) knows nothing about what is being optimized. Two skills encode everything domain-specific: `autoresearch-create` (sets up a session) and `autoresearch-finalize` (decomposes an experiment branch into independently-reviewable PRs).

This means one extension serves unlimited domains without modification: test speed, bundle size, ML training loss, Lighthouse scores, build times. Contrast with Karpathy's original `train.py`-based autoresearch, which hardwired `val_bpb` as the metric and assumed GPU training as the verification step.

## Core Mechanism

### The Experiment Loop

The loop runs forever until context exhaustion or human interruption: **edit → commit → `run_experiment` → `log_experiment` → keep or revert → repeat**. The agent receives explicit instructions: "LOOP FOREVER. Never ask 'should I continue?'"

Three tools drive the loop:

**`init_experiment`** writes a JSON config header to `autoresearch.jsonl` with the experiment name, metric name, unit, and optimization direction. A segment counter increments on re-initialization, allowing the same session to track multiple targets over time.

**`run_experiment`** spawns a child process via `bash -c` with a detached process group. It implements wall-clock timing, rolling output buffer capture (capped at 2x display limit to avoid UTF-8 boundary corruption), and structured metric parsing. The LLM sees at most 10 lines / 4KB of output; full output streams to a temp file. The guardrail: when `autoresearch.sh` exists, the tool refuses to execute any other command — the `isAutoresearchShCommand()` function strips env vars and harmless wrappers, then validates the core command matches a known invocation pattern. After a passing benchmark, if `autoresearch.checks.sh` exists, it runs correctness checks (tests, types, lint) with a separate timeout so check time does not contaminate the primary metric.

**`log_experiment`** records results with one of four statuses: `keep` (auto-commits via `git add -A && git commit`), `discard` (reverts code changes, preserves session files), `crash` (same as discard), or `checks_failed` (benchmark passed but correctness checks failed). A hard gate blocks `keep` if the last run's checks failed. Each result appends a single JSON line to `autoresearch.jsonl`.

### Statistical Confidence: MAD-Based Scoring

After each logged result, the extension computes a confidence score using Median Absolute Deviation: `|best_improvement| / MAD`. MAD is used rather than standard deviation because it is resistant to outliers — a single crashed run with metric=0 would inflate standard deviation and make all improvements look falsely confident. Thresholds are advisory: 2.0x signals high confidence, 1.0x signals marginal. The system never auto-discards based on confidence, preserving agent autonomy over the decision.

### Session Persistence Across Context Resets

Two files maintain state across restarts:

**`autoresearch.jsonl`** is append-only and is the source of truth. On session start, `reconstructState()` replays the entire file to rebuild `ExperimentState`, including segment tracking, secondary metric registration, and confidence computation.

**`autoresearch.md`** is a living document describing the objective, metrics, files in scope, constraints, and what has been tried. A fresh agent with no memory reads this file and continues where the previous session left off.

The five session files (`autoresearch.jsonl`, `autoresearch.md`, `autoresearch.ideas.md`, `autoresearch.sh`, `autoresearch.checks.sh`) are protected during auto-revert: they are staged before `git checkout -- .; git clean -fd` runs.

### Context Window Management

The extension tracks token consumption per iteration and estimates tokens-per-iteration as `max(mean, median)` of the history — a conservative estimate that handles both outlier-heavy and skewed distributions. Before each `run_experiment`, `isContextExhausted()` checks whether `currentTokens + estimated * 1.2` exceeds the context window. If so, it disables autoresearch mode and calls `ctx.abort()`.

Auto-resume triggers on the `agent_end` event: if autoresearch was active and at least one experiment ran, it sends the agent instructions to resume by reading `autoresearch.md` and `git log`. Rate-limited to once per 5 minutes, capped at 20 auto-resume turns total.

### Finalization

The `autoresearch-finalize` skill decomposes the experiment branch into independent, reviewable branches — one per logical change group. Hard constraint: no two groups can touch the same file. If two optimizations both modify `vitest.config.ts`, they merge into one group. The `finalize.sh` script (443 lines of bash) creates branches, verifies the union matches the original diff, checks for session artifact leaks and empty commits, and prints cleanup commands.

## Key Numbers

- **Stars / forks**: 3,393 stars, 185 forks (self-reported at time of source)
- **Shopify Liquid benchmark**: 53% parse+render speedup, 61% fewer allocations, ~120 experiments, 93 commits, 0 test regressions — self-reported by Lütke
- **Karpathy's original nanochat run**: 700 experiments in 2 days, 20 optimizations, 11% speedup on already-optimized code — self-reported
- **Typical success rate**: community reports suggest 20–30% of experiments succeed; one documented run showed 26/35 experiments failing or crashing, which the project treats as normal
- **Ecosystem**: 13+ implementations across platforms, cataloged in WecoAI/awesome-autoresearch

No independent third-party benchmarks exist. All performance claims are self-reported.

## Strengths

**Domain-agnostic by architecture.** The extension-skill separation genuinely delivers: one installation serves test speed, bundle size, Lighthouse scores, ML training loss, or any other scalar metric. No code changes required.

**Robust persistence.** Append-only JSONL with full replay on session start is simple, human-readable, and git-diffable. The auto-revert logic protects session files through code reversions, so long-running sessions survive crashes without manual recovery.

**Statistical noise awareness.** MAD-based confidence scoring is methodologically sound — more robust to outlier contamination than standard deviation. No other pure-markdown autoresearch implementation has equivalent programmatic noise handling.

**Git as memory and rollback.** Every kept experiment is a real commit. Every discard is a `git revert`, preserving failed experiments in history so the agent can read `git log` and avoid repeating them. The finalization workflow turns a noisy experiment branch into reviewable PRs.

**Context exhaustion handling.** The proactive detection + auto-resume system handles long sessions gracefully. The `autoresearch.md` external memory document enables cross-session continuity.

## Critical Limitations

**Concrete failure mode — context window exhaustion with information loss.** Each iteration consumes tokens for the edit, commit, benchmark output, and log recording. On context reset, the agent loses its in-memory reasoning about what has been tried. The `autoresearch.md` file and ASI annotations in JSONL are the only bridges, making their quality critical. If the agent writes vague descriptions ("tried optimization, no improvement"), future sessions have nothing to learn from. The rate limit on auto-resume (5 minutes, 20-turn cap) can stall the loop entirely if context exhausts rapidly.

**Unspoken infrastructure assumption — the benchmark is the bottleneck.** The loop is strictly sequential: one experiment at a time. For computationally expensive benchmarks (ML training, large builds), wall-clock time scales linearly with experiment count. The Shopify Liquid case study succeeded partly because the Ruby benchmark runs fast. For 5-minute GPU training runs (Karpathy's original domain), autoresearch produces 12 experiments per hour. Users with slow benchmarks face a hard throughput ceiling with no parallel experimentation path.

## When Not to Use It

**If you need parallel experimentation.** The sequential loop architecture means every hour of benchmark time equals one experiment. Teams with expensive benchmarks needing high iteration velocity should look at multi-agent coordination frameworks like [AutoGen](../projects/autogen.md) or [MetaGPT](../projects/metagpt.md) that can parallelize across branches.

**If your metric does not yet exist.** AutoResearch assumes you provide a working benchmark command. It cannot help you construct the measurement instrument. If your optimization target is documentation quality, code health, or any domain without a natural scalar metric, use the GOAL.md pattern (by jmilinovich) which treats metric construction as a first-class problem, or [uditgoenka/autoresearch](../concepts/udit-goenka.md)'s markdown-only skill system with its dual-score pattern.

**If you are not using the Pi agent.** AutoResearch is a Pi extension and depends on four Pi peer packages (`@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`, `@sinclair/typebox`). Forks exist for [Claude Code](../projects/claude-code.md) (`proyecto26/autoresearch-ai-plugin`) and other agents, but they are community ports, not official implementations. The programmatic guarantees (MAD scoring, JSONL persistence, TUI dashboard) may not transfer.

**If your experiments have non-file-system side effects.** The auto-revert mechanism runs `git checkout -- .; git clean -fd`. Database modifications, network requests, or file writes outside the working directory are not reverted on discard or crash. The system assumes experiments are purely file-level changes within the repository.

## Unresolved Questions

**Cost at scale.** No published data on token consumption per experiment or total API cost for a 120-experiment session like the Shopify run. For teams considering overnight runs on expensive models, cost estimation is opaque.

**Governance of the benchmark guardrail.** The `isAutoresearchShCommand()` validation logic prevents the agent from bypassing the benchmark. But the user writes `autoresearch.sh`, meaning the user controls what counts as the benchmark. There is no independent validation that the benchmark measures what the user claims, or that it is not itself optimizable in ways that game the metric.

**Confidence thresholds are advisory only.** The 2.0x / 1.0x MAD thresholds are documented as advisory with no enforcement. Over a long session, accumulated low-confidence "keeps" (below 1.0x) can fill the branch with noise mistaken for signal. There is no session-level audit of how many kept results had weak confidence.

**The finalize constraint at scale.** The no-overlapping-files constraint for independent PR creation becomes more restrictive as the experiment count grows — more experiments means more chance of two keepers touching the same file and being forced into the same PR. No data on how often this constraint is binding in practice.

**Auto-resume and context quality tradeoff.** The 20-turn auto-resume cap is arbitrary. Sessions that exhaust context frequently (large codebases, verbose benchmarks) hit the cap before meaningful progress. The cap exists to limit runaway token consumption but its calibration is undocumented.

## Alternatives

**Use [uditgoenka/autoresearch](../concepts/udit-goenka.md)** when you want the same loop pattern without Pi dependency — pure markdown skills for Claude Code, zero installation friction, 10 specialized subcommands (security, debugging, adversarial debate). Trade: no programmatic confidence scoring, no JSONL persistence, no TUI dashboard.

**Use GOAL.md (jmilinovich)** when your optimization domain lacks a natural scalar metric and you need to construct the measurement instrument first. The dual-score pattern (outcome score + instrument score) addresses domains like documentation quality or code health that AutoResearch cannot serve.

**Use [Darwin Gödel Machine](../projects/darwin-godel-machine.md)** when the goal is self-modifying agent code rather than optimization within a fixed codebase. DGM targets agent architecture itself; AutoResearch targets project-level performance metrics.

**Use [EvoAgentX](../projects/evoagentx.md) or [AFlow](../projects/aflow.md)** when the optimization target is multi-agent workflow structure rather than code-level performance. These systems evolve agent graphs and prompt pipelines; AutoResearch evolves source code within a repository.

**Use [meta-agent](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)** when you need continuous improvement from unlabeled production traces rather than offline benchmark optimization. Meta-agent's LLM-judge-as-surrogate approach operates where most real agents live — in production with sparse labels.

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md) — the broader pattern AutoResearch instantiates
- [Context Engineering](../concepts/context-engineering.md) — the `autoresearch.md` external memory document is a form of context engineering across agent sessions
- [CLAUDE.md](../concepts/claude-md.md) — analogous persistent instruction file pattern for Claude Code agents
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — the keep/revert ratchet is a discrete analogue of a reward signal with policy update
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — AutoResearch is explicitly single-agent sequential; parallel experimentation requires multi-agent coordination
- [Pi](../projects/pi.md) — the AI coding agent AutoResearch extends
