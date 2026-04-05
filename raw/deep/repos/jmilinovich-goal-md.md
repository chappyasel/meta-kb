---
url: 'https://github.com/jmilinovich/goal-md'
type: repo
author: jmilinovich
date: '2026-04-04'
tags: [self-improving, knowledge-bases, context-engineering]
key_insight: >-
  Introduces constructed fitness functions as the key generalization of autoresearch -- when your domain has no natural scalar metric (documentation quality, test infrastructure trustworthiness, code health), you must build the ruler before you can measure, leading to a dual-score pattern where the agent simultaneously improves the measurement instrument and the thing being measured, with three operating modes (converge/continuous/supervised) and an action catalog for prioritized optimization.
stars: 112
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - GOAL.md
    - CLAUDE.md
    - template/GOAL.md
    - scripts/score.sh
    - examples/perf-optimization.md
    - examples/docs-quality.md
    - examples/browser-grid.md
    - examples/api-test-coverage.md
    - STYLE.md
  analyzed_at: '2026-04-04'
  original_source: repos/jmilinovich-goal-md.md
---

## Architecture Overview

goal-md is not a tool or library -- it is a file format specification and pattern for autonomous agent optimization. The entire system is a single markdown file (`GOAL.md`) that you drop into a repository, accompanied by a scoring script. The file turns any coding agent (Claude, Cursor, Windsurf, or any other) into an autonomous improver by providing five essential elements:

1. **Fitness function** -- a runnable shell command that outputs a number
2. **Improvement loop** -- measure, diagnose, act, verify, keep-or-revert, log
3. **Action catalog** -- concrete moves ranked by estimated point impact
4. **Operating mode** -- converge (stop when done), continuous (run forever), supervised (pause at gates)
5. **Constraints** -- hard rules the agent must never break

The repo itself dogfoods the pattern: it has its own `GOAL.md` with a `scripts/score.sh` fitness function that measures how well the pattern documentation itself achieves clarity, resonance, examples, integrity, and distribution. The template (`template/GOAL.md`) is a fill-in-the-blanks prompt designed to be consumed by agents, and the examples directory provides few-shot training data across different domains and modes.

The CLAUDE.md file serves as agent bootstrapping instructions: "If someone asks you to write a GOAL.md for their project, read the template, read 2-3 examples, scan the user's codebase, construct the fitness function, and start the loop." This is a meta-pattern -- the repo itself teaches agents how to create instances of the pattern for other repos.

## Origin and Intellectual Lineage

The README explicitly traces its lineage: autoresearch (Karpathy, Mar 2026) -> autoresearch-anything (zkarimi22) -> GOAL.md. It credits Eval-Driven Development, AGENTS.md, Ralph Wiggum, GOAP (Goal-Oriented Action Planning), and GEPA as related patterns. John Milinovich (jmilinovich) also maintains agents.json, a complementary project for structured agent capability declarations.

The project's origin story crystallizes the fundamental limitation of Karpathy's autoresearch: "autoresearch proved the formula: agent + fitness function + loop = overnight breakthroughs. But autoresearch only works when you already have a scalar metric. Most software isn't like that -- you have to construct the metric before you can optimize it." This observation -- that metric construction is the hard problem, not metric optimization -- is goal-md's foundational insight and its primary intellectual contribution to the self-improving agent ecosystem.

The awesome-autoresearch curated list (alvinreal/awesome-autoresearch) positions goal-md in the "goal specification" category alongside AGENTS.md and agents.json, distinguishing it from "loop implementations" (pi-autoresearch, uditgoenka/autoresearch) and "domain-specific" adaptations. This taxonomy validates goal-md's claim to be solving a different layer of the problem: not *how* to loop, but *what* to loop toward.

## Core Mechanism

The central innovation is **constructed fitness functions** -- the insight that most software optimization targets have no natural scalar metric, so you must BUILD the ruler before you can measure with it. This is the key generalization beyond Karpathy's autoresearch, where `evaluate_bpb()` exists as a well-defined, immutable evaluation function.

The construction process works as follows:

1. **Decompose the quality dimension** into measurable components (e.g., documentation quality = prop accuracy + example compilation + calibrated linting)
2. **Assign weights** to each component based on their relative importance
3. **Write a scoring script** that mechanically evaluates each component and produces a composite number
4. **Classify metric mutability** into one of three modes:
   - **Locked** -- Agent cannot touch the scoring code (autoresearch default)
   - **Split** -- Agent can improve the measurement instrument but not the definition of good
   - **Open** -- Agent can modify everything, including how success is measured

The **dual-score pattern** is the most architecturally significant contribution. When the agent is constructing its own measurement tools (adding tests, fixing linters, calibrating checks), there's a risk of gaming the metric. The dual-score separates:
- **Outcome score**: Is the thing being improved actually better?
- **Instrument score**: Can we trust the measurement?

The project's own framing makes this vivid: "You need a dual-score setup when the agent is building its own telescope." In split mode, the agent has two scores -- "is the routing working?" (the outcome) and "can we trust the tests?" (the instrument). The agent can "sharpen the instrument without gaming the outcome."

The improvement loop includes a decision point: "If instrument_score < threshold, fix the instrument first. If instrument_score >= threshold, work on outcome_score." This prevents a failure mode where a naive agent "fixes" documentation to satisfy a broken linter, making docs worse while the score goes up.

The `scripts/score.sh` in the dogfooding GOAL.md demonstrates the pattern concretely. It's a 456-line bash script (no dependencies beyond bash and basic Unix tools) that evaluates:
- **Clarity (25pts)**: Five elements defined? Prior art section? All modes defined? When-to-use section?
- **Resonance (30pts)**: Has visuals (3+ images)? Anchor story (first-person voice + before/after numbers + named project)? Score output block? Personality/voice?
- **Examples (25pts)**: 3+ examples? Mode variety (converge + continuous + checklist)? Real projects (30+ lines)?
- **Integrity (20pts)**: No broken links? Dogfoods itself? Template covers all 5 sections? Score script documented?
- **Distribution (30pts)**: Video explainer (rendered mp4, 4+ scenes, real audio, design system, render script, transitions + human quality signoff)? Social images (2+ PNG with generation script)? Blog-ready assets?

Each check is a concrete, mechanically-verifiable test. The script outputs both human-readable formatted text and machine-readable JSON (via `--json` flag).

The **iteration log** (`iterations.jsonl`) provides cross-session memory. Each iteration appends one JSON line with before/after scores, the action taken, the result (kept/reverted), and a one-sentence note. Future agent sessions read this log to avoid repeating failed experiments and build on what worked.

## The Frozen Metric Problem and goal-md's Response

The broader autoresearch discourse has identified the "frozen metric" as both the pattern's essential feature and its deepest limitation. The Hybrid Horizons analysis argues that without freezing, "optimization becomes drift rather than progress." But freezing creates overfitting risk and metric imprisonment.

goal-md's response to this tension is the three-tier mutability classification:

**Locked mode** adopts the frozen metric wholesale -- the agent optimizes but cannot question the measurement. This is appropriate when the metric is well-understood and trusted (test execution time, bundle size).

**Split mode** allows the agent to improve the measurement instrument while keeping the definition of "good" frozen. This is goal-md's most distinctive innovation. The agent can add tests, fix linters, calibrate checks -- sharpen the telescope -- without changing what counts as a good observation. The dual-score pattern ensures that instrument improvements are tracked separately from outcome improvements, preventing gaming.

**Open mode** acknowledges that early-stage projects sometimes need the agent to help design the fitness function itself. This is the most dangerous mode but sometimes necessary -- the docs-quality example demonstrates an agent that had to build three measurement tools (prop-accuracy checker, example compiler, calibrated linter) before it could even start optimizing documentation.

This three-tier approach is more sophisticated than any other autoresearch implementation's treatment of metric mutability. pi-autoresearch implicitly assumes locked mode (the benchmark script is user-provided and immutable). uditgoenka/autoresearch allows guard modifications but has no formal framework for it. goal-md turns metric mutability from an implicit assumption into an explicit architectural decision.

## Design Tradeoffs

**File format vs tool**: By defining GOAL.md as a markdown file rather than a software tool, the pattern achieves maximum portability. Any agent that can read files can use it. No installation, no dependencies, no API keys. The tradeoff is that the agent must interpret the markdown instructions correctly -- there's no runtime to enforce the loop protocol.

**Constructed metrics vs natural metrics**: Natural metrics (test coverage, bundle size) are unambiguous but limited to domains that already have measurement tools. Constructed metrics extend autonomous optimization to any domain but introduce the risk of measuring the wrong thing. The dual-score pattern mitigates this but adds complexity.

**Action catalog with point estimates**: Estimated point impacts (+5 pts, +3 pts) provide prioritization signals without being exact predictions. The estimates guide the agent toward high-impact actions first. The tradeoff is that inaccurate estimates may lead to suboptimal ordering, but since actions are attempted iteratively with keep/revert, bad estimates waste time rather than causing harm.

**Three operating modes**: Converge mode has a clear stopping condition (score target, no-improvement plateau, max iterations). Continuous mode runs forever with an oscillation between "optimize" and "monitor" states. Supervised mode pauses at human-defined gates. This flexibility means GOAL.md can serve diverse contexts -- from a quick quality push to a perpetual optimization agent.

**Open metric mutability**: Allowing the agent to modify the scoring code itself is dangerous but sometimes necessary. Early-stage projects where the fitness function is being designed alongside the system need open mode. The docs-quality example demonstrates this: the agent had to build three measurement tools (prop-accuracy checker, example compiler, calibrated linter) that didn't exist before it could even start optimizing documentation.

**Agent-agnostic design**: Unlike pi-autoresearch (Pi-specific) or uditgoenka/autoresearch (Claude Code-specific), GOAL.md works with any agent that reads markdown. The project explicitly names Claude, Cursor, and Windsurf as supported agents. This universality is both a strength (maximum reach) and a limitation (no platform-specific optimizations like TUI dashboards or plugin marketplace distribution).

## Failure Modes & Limitations

**Metric gaming in open mode**: When the agent can modify both the thing being measured and the measurement instrument, it may find shortcuts that inflate the score without genuine improvement. The dual-score pattern helps but doesn't eliminate this risk -- a sophisticated agent could optimize both scores jointly in a degenerate way.

**Scoring script fragility**: The bash-based scoring scripts use grep, regex matching, and file existence checks. These are brittle to formatting changes -- adding a markdown heading in an unexpected format might break detection. The scripts lack error handling for edge cases like empty files, binary content, or unusual encodings.

**Action catalog staleness**: The action catalog is static -- written once in the GOAL.md and not updated as the optimization progresses. Completed actions are manually marked "Done" but the catalog doesn't grow with new discovered opportunities. In continuous mode, the agent may exhaust the catalog and need to discover actions independently. This is a significant gap for long-running optimization sessions.

**No cross-session state beyond JSONL**: The iteration log captures what was tried, but there's no structured representation of what the agent has learned about the codebase. Two sessions might independently discover the same dead end if the JSONL note is insufficiently descriptive.

**Small community**: At 112 stars, the pattern hasn't achieved broad adoption yet. The few-shot examples are from the author's projects, limiting the diversity of domains demonstrated. More community-contributed examples would strengthen the pattern's claim to universality. The awesome-autoresearch list includes goal-md but its positioning in the "goal specification" category (rather than "loop implementation") may limit discoverability among practitioners looking for ready-to-use tools.

**No statistical noise handling**: Like uditgoenka/autoresearch and unlike pi-autoresearch, goal-md has no built-in noise detection or confidence scoring. The keep/revert decision is binary based on score delta. For noisy metrics (Lighthouse scores, flaky tests), this can lead to false keeps and false discards.

## Integration Patterns

**Universal agent integration**: The prompt "Read github.com/jmilinovich/goal-md -- read the template and examples. Then write me a GOAL.md for this repo and start working on it" works with any agent that can fetch URLs. The CLAUDE.md provides specific bootstrapping instructions for Claude agents.

**Dogfooding integration**: The repo's own GOAL.md + score.sh demonstrate the complete pattern working end-to-end. The score script serves as both a test (is the pattern documented correctly?) and a template (how to write scoring scripts for other domains).

**Remotion video integration**: The `video/` directory contains a Remotion project that generates an explainer video from React components. The GOAL.md scores video quality both programmatically (rendered output exists? 4+ scenes? real audio? design system? render script?) and via human gate (`video/QUALITY.md` must contain "APPROVED"). This is an example of the supervised mode where some evaluations require human judgment.

**agents.json complementarity**: Milinovich's agents.json project provides structured capability declarations for agents. Used together, agents.json describes what an agent *can do* while GOAL.md describes what it *should optimize*. This pairing addresses both the capability and objective layers of agent configuration.

**Lineage from autoresearch**: The README explicitly traces lineage: autoresearch (Karpathy, Mar 2026) -> autoresearch-anything (zkarimi22) -> GOAL.md. It also credits Eval-Driven Development, AGENTS.md, Ralph Wiggum, GOAP, and GEPA as related patterns, positioning GOAL.md within a broader ecosystem of agent directive files.

## Benchmarks & Performance

The repo's own score provides the primary benchmark: the GOAL.md itself achieves approximately 100/130 (77%) according to `scripts/score.sh`. The documented history shows the score rising from an initial state through iterative improvement.

The perf-optimization example (`examples/perf-optimization.md`) provides the most detailed performance scenario: optimizing a Fastify API with wrk (throughput), hyperfine (cold-start latency), and k6 (scripted scenarios). The composite metric spans latency (30pts), throughput (30pts), cold start (15pts), and profile cleanliness (25pts). The example describes the typical discovery pattern: the action catalog gets you to 75-80/100, and the last 20 points come from flamegraph discoveries the agent makes independently (hidden serialization costs, DNS resolution overhead, ORM hydration tax).

The docs-quality example demonstrates the dual-score pattern working: the agent first fixed its own measurement tools (Vale linter was flagging `onChange` as a spelling error), then used the corrected instruments to improve documentation quality. This "build the ruler, then measure" sequence is the pattern's most distinctive capability and its most convincing demonstration.

## Position in the Ecosystem

goal-md occupies a unique position in the autoresearch landscape: it is the only project that treats metric *construction* as a first-class problem rather than an assumed prerequisite. Where pi-autoresearch and uditgoenka/autoresearch both assume the user provides a working benchmark command, goal-md provides a framework for building the benchmark itself.

This makes goal-md the most intellectually ambitious project in the space, but also the most demanding to use. The user must understand their domain well enough to decompose quality into measurable components, assign meaningful weights, and write a scoring script -- all before the optimization loop begins. For domains with natural metrics (test speed, bundle size), this overhead is unnecessary. For domains without them (documentation quality, code health, architectural fitness), goal-md is the only autoresearch-family tool that can help.

The dual-score pattern has implications beyond goal-md itself. Any system where an agent builds or modifies its own evaluation infrastructure faces the same trust problem. MemEvolve's four-phase pipeline (where the agent generates entirely new memory provider code) is implicitly operating in goal-md's "open mode" -- evolving both the system and the criteria by which the system is evaluated. Recognizing this parallel suggests that the dual-score pattern may be a general requirement for any self-improving system with mutable evaluation criteria.
