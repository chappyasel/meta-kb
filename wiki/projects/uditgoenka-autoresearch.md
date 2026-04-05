# Claude Autoresearch (uditgoenka)

> A Claude Code skill that generalizes Karpathy's autoresearch pattern to any domain -- not just ML -- by implementing the core modify-verify-keep/discard-repeat loop with git as episodic memory, metric-driven verification, and automatic rollback.

## What It Does

Claude Autoresearch turns Claude Code into a relentless improvement engine. Given a goal, a mechanical metric, and a verification command, the agent loops forever (or N times): reviewing current state and git history, picking the next change, making one focused modification, committing, verifying, and either keeping improvements or reverting failures. The key generalization beyond Karpathy's original is that it works for any domain with a measurable metric -- code coverage, API response time, documentation quality, marketing copy effectiveness, security posture. The system includes 10 commands covering the core loop, planning wizard, security audits, shipping workflows, bug hunting, error fixing, scenario exploration, multi-persona prediction, documentation generation, and adversarial refinement.

## Architecture

- **Core loop**: Review state + git history -> pick next change -> make ONE focused change -> git commit -> run mechanical verification -> keep or revert -> log result -> repeat
- **8 critical rules**: Loop until done, read before write, one change per iteration, mechanical verification only, automatic rollback, simplicity wins, git is memory, when stuck think harder
- **Results tracking**: TSV format logging every iteration with commit hash, metric, delta, status, and description
- **Guard system**: Optional safety net command (e.g., `npm test`) that must pass for changes to be kept, preventing regressions while optimizing a different metric
- **10 subcommands**: `/autoresearch`, `:plan`, `:security`, `:ship`, `:debug`, `:fix`, `:scenario`, `:predict`, `:learn`, `:reason`
- **Distribution**: Claude Code plugin marketplace (`/plugin marketplace add uditgoenka/autoresearch`) or manual skill/command copy

## Key Numbers

- 3,142 GitHub stars, 241 forks
- Shell, MIT license
- 10 subcommands covering autonomous iteration, planning, security, shipping, debugging, fixing, scenarios, prediction, documentation, and adversarial refinement
- v1.9.0 (active development)
- Installable as Claude Code plugin

## Strengths

- The generalization from ML-specific autoresearch to any domain with a metric is the crucial insight -- the pattern works for test coverage, documentation quality, API latency, and even subjective domains (via `/autoresearch:reason` with blind judge panels)
- Git-as-episodic-memory means every experiment is committed before verification, failed experiments are preserved in history via `git revert`, and the agent reads `git log` + `git diff` before each iteration

## Limitations

- Requires Claude Code specifically (hooks, skills, commands system), making it non-portable to other coding agents without significant adaptation
- The "mechanical verification only" rule means domains without easily scriptable metrics require upfront investment in building scoring infrastructure before the loop can run

## Alternatives

- [goal-md.md](goal-md.md) -- use when you need to construct the fitness function itself (dual-score pattern for domains without natural metrics) rather than just running the loop
- [coral.md](coral.md) -- use when you want multi-agent collaborative self-evolution rather than single-agent iteration
- [self-improving-coding-agent.md](self-improving-coding-agent.md) -- use when you want the agent to improve its own codebase rather than a target project

## Sources

- [uditgoenka-autoresearch.md](../../raw/repos/uditgoenka-autoresearch.md) -- "Claude Autoresearch generalizes these principles to ANY domain. Not just ML -- code, content, marketing, sales, HR, DevOps, or anything with a number you can measure"
