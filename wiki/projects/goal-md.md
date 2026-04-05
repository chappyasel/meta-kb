# GOAL.md

> A goal-specification file pattern for autonomous coding agents that generalizes Karpathy's autoresearch to domains with constructed metrics -- solving the measurement problem that blocks autonomous improvement when no natural scalar metric exists.

## What It Does

GOAL.md is a file you drop into a repo that turns a coding agent into an autonomous improver. The key insight is that most software domains lack natural metrics like loss -- you have to construct the metric before you can optimize it. GOAL.md provides the pattern for doing that through five elements: (1) a fitness function (a computable definition of "better"), (2) an improvement loop (measure -> diagnose -> act -> verify -> keep or revert), (3) an action catalog (concrete moves ranked by impact), (4) an operating mode (converge/continuous/supervised), and (5) constraints (load-bearing rules the agent must not cross). The dual-score pattern is the critical innovation: one score for the thing being measured, another for the measurement instrument itself, preventing the agent from gaming its own evaluation.

## Architecture

- **Fitness function modes**: Locked (agent cannot touch scoring code), Split (agent improves measurement instrument but not success definition), Open (agent modifies everything including success criteria)
- **Improvement loop**: `measure -> diagnose -> act -> verify -> keep or revert`, with each iteration logged to `iterations.jsonl`
- **Action catalog**: Explicit menu of concrete moves ranked by estimated impact, preventing agents from burning cycles on low-value changes
- **Operating modes**: Converge (stop when criteria met), Continuous (run forever), Supervised (pause at gates)
- **Dual scoring**: Separate scores for the target quality and instrument quality, preventing the agent from "fixing" the docs to satisfy a broken linter

The repo is designed to be consumed by agents: the template is a prompt, examples are few-shot training data, and CLAUDE.md teaches agents how to write GOAL.md files.

## Key Numbers

- 112 GitHub stars, 8 forks
- Shell, MIT license (inferred)
- 4 real examples: docs-quality, browser-grid, api-test-coverage, perf-optimization
- Demonstrated improvement from 47 -> 83 routing confidence score overnight (12 autonomous commits)
- Works with Claude Code, Cursor, Windsurf, or any coding agent

## Strengths

- The dual-score pattern (instrument quality vs target quality) solves a real problem: agents that can modify their own evaluation will game it. The split-mode approach lets agents sharpen the telescope without moving the stars
- The repo dogfoods itself -- it has its own GOAL.md and scoring script, demonstrating the pattern is self-applicable

## Limitations

- Constructing meaningful fitness functions requires significant domain expertise upfront -- the pattern makes the loop easy but the hardest part (defining what "better" means) still requires human judgment
- The action catalog with point estimates is helpful for prioritization but may become stale as the agent makes progress, requiring periodic human review

## Alternatives

- [uditgoenka-autoresearch.md](uditgoenka-autoresearch.md) -- use when you already have a metric and want the full Claude Code skill system with 10 subcommands
- [autoresearch.md](autoresearch.md) -- use when you want Karpathy's original autoresearch for ML training loops with natural loss metrics
- [coral.md](coral.md) -- use when you want multi-agent optimization with a grading script rather than single-agent metric construction

## Sources

- [jmilinovich-goal-md.md](../../raw/repos/jmilinovich-goal-md.md) -- "Karpathy's autoresearch proved the formula: agent + fitness function + loop = overnight breakthroughs. But autoresearch only works when you already have a scalar metric... GOAL.md is the pattern for doing that"
