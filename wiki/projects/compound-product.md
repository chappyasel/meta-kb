# Compound Product

> A self-improving product system that reads daily reports, identifies the highest-priority actionable item, and autonomously implements fixes -- shipping a PR ready for human review while you sleep.

## What It Does

Compound Product automates the observe-correct-improve loop for software products. Your system generates daily performance reports (metrics, errors, user feedback). An LLM analyzes the report, picks the single most impactful fix, creates a plan decomposed into granular tasks, then implements each task in a quality-gated loop. The result: a pull request containing tested, committed changes ready for human review.

## Architecture

The system operates in three phases, implemented as shell scripts orchestrating AI agents:

- **Phase 1 -- Analysis**: `analyze-report.sh` sends the latest report to an LLM API, which returns a JSON priority item with acceptance criteria and a branch name
- **Phase 2 -- Planning**: AI agents load a PRD skill to create a requirements doc, then a tasks skill to decompose it into 8-15 granular, machine-verifiable tasks stored in `prd.json`
- **Phase 3 -- Execution Loop**: `loop.sh` iterates up to N times, picking the next incomplete task, implementing it, running quality checks (typecheck, lint, test), committing on pass, and updating task status

Memory persists between iterations via git history, `progress.txt` (learnings), `prd.json` (task status), and `AGENTS.md` (long-term codebase knowledge). Each iteration runs with fresh LLM context but reads these artifacts to maintain continuity.

## Key Numbers

- **503 GitHub stars**, 52 forks
- Written in Shell (orchestration) with SKILL.md files for agent capabilities
- Supports Amp CLI and Claude Code as agent backends
- Configurable quality checks, max iterations, and branch prefixes
- Schedulable via macOS launchd for nightly runs

## Strengths

- The separation of analysis, planning, and execution phases creates natural checkpoints where human oversight can be inserted without breaking the autonomous flow
- Each improvement compounds: agents update AGENTS.md with discovered patterns, so future iterations start with more codebase knowledge

## Limitations

- Requires well-structured daily reports as input -- the system cannot generate its own performance data
- Uses `--dangerously-allow-all` flags for autonomous operation, meaning the agent bypasses confirmation prompts and requires trust in its decisions

## Alternatives

- [awesome-autoresearch.md](awesome-autoresearch.md) -- broader ecosystem of self-improving loops, including domain-specific and research-oriented variants
- [agentic-context-engine.md](agentic-context-engine.md) -- persistent learning without the full product improvement pipeline

## Sources

- [snarktank-compound-product.md](../../raw/repos/snarktank-compound-product.md) -- "Your product generates reports about its performance. An AI agent analyzes those reports, picks the most impactful fix, creates a plan, and implements it -- all while you sleep."
