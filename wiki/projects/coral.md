# CORAL

> Robust, lightweight infrastructure for multi-agent self-evolution built for autoresearch -- agents run experiments, share knowledge through persistent shared state, and continuously improve solutions with zero sync overhead between agents.

## What It Does

CORAL is an infrastructure for building organizations of autonomous AI agents that run experiments, share knowledge, and continuously improve solutions. You provide a codebase and a grading script, and CORAL handles isolated workspaces (git worktrees), safe evaluation, persistent shared knowledge, and multi-agent collaboration. Each agent runs in its own git worktree branch while shared state (attempts, notes, skills) lives in `.coral/public/` and is symlinked into every worktree -- agents see each other's work in real time with zero sync overhead. A manager watches for new attempts and can interrupt agents with heartbeat-triggered prompts (e.g., "reflect", "consolidate skills"). Natively integrated with Claude Code, OpenCode, and Codex.

## Architecture

- **Agents as optimizers**: Claude Code / Codex / OpenCode subprocesses, each in its own git worktree
- **Shared state**: `.coral/` directory with attempts, notes, and skills symlinked into every worktree
- **Eval loop**: Agents call `uv run coral eval -m "..."` to stage, commit, and grade in one shot
- **Manager**: Watches for new attempts, triggers heartbeat prompts for reflection and skill consolidation
- **Knowledge artifacts**: Attempts (scored commit snapshots), notes (markdown with YAML frontmatter), skills (directories with SKILL.md)
- **CLI**: 17+ commands covering start, stop, resume, status, eval, log, ui, notes, skills, runs, show, diff, revert, checkout, heartbeat
- **Web dashboard**: Real-time leaderboard, attempt diffs, agent monitoring
- **Gateway**: Built-in LiteLLM proxy for custom model routing and per-agent tracking

## Key Numbers

- 120 GitHub stars, 14 forks
- Python 3.11+, MIT license
- Supports Claude Code, Codex, and OpenCode runtimes
- 17+ CLI commands
- 7 example tasks (circle packing, Erdos conjecture, kernel optimization, MNIST, Kaggle, mRNA)
- Paper: arxiv 2604.01658

## Strengths

- The symlinked shared state design eliminates sync overhead between agents -- each agent sees all other agents' attempts, notes, and skills in real time through the filesystem, which is both simpler and faster than message-passing architectures
- The grading script abstraction (subclass `TaskGrader`, implement `evaluate()`) makes it trivial to define new optimization tasks, and the git worktree isolation means agents cannot interfere with each other's work

## Limitations

- Each agent requires its own LLM context/session, so running multiple agents means proportionally higher API costs, with no built-in cost controls beyond limiting agent count
- The shared skill directory approach assumes skills generalize across agents, which may not hold when agents specialize in different strategies

## Alternatives

- [uditgoenka-autoresearch.md](uditgoenka-autoresearch.md) -- use when you want single-agent autonomous iteration rather than multi-agent collaboration
- [self-improving-coding-agent.md](self-improving-coding-agent.md) -- use when you want the agent to improve its own codebase rather than a target project
- [hyperagents.md](hyperagents.md) -- use when you want the self-improvement process itself to evolve (metacognitive self-modification)

## Sources

- [human-agent-society-coral.md](../../raw/repos/human-agent-society-coral.md) -- "CORAL is an infrastructure for building organizations of autonomous AI agents that run experiments, share knowledge, and continuously improve solutions... Shared state lives in .coral/public/ and is symlinked into every worktree -- agents see each other's work in real time with zero sync overhead"
