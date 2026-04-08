---
entity_id: coral
type: project
bucket: multi-agent-systems
abstract: >-
  CORAL is a multi-agent optimization framework that spawns isolated coding
  agents in git worktrees sharing a common `.coral/public/` state directory,
  enabling evolutionary code improvement through filesystem-based knowledge
  exchange without synchronization overhead.
sources:
  - deep/repos/human-agent-society-coral.md
  - papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md
  - repos/human-agent-society-coral.md
related:
  - claude-code
last_compiled: '2026-04-08T23:24:26.224Z'
---
# CORAL

## What It Does

CORAL (Collaborative Optimization via Reinforcement and Agent Learning) orchestrates multiple autonomous coding agents to iteratively optimize code against a grader function. Each agent runs in its own git worktree branch, independently exploring solution strategies, while sharing discoveries through a filesystem-based coordination layer. The framework targets competitive optimization tasks: mathematical problems, ML competitions, kernel engineering, and algorithm challenges.

The core claim: replacing fixed evolutionary heuristics (crossover, mutation, selection) with autonomous LLM agents that can reflect, pivot, and share structured knowledge produces faster improvement with fewer evaluations. The paper reports 3-10x higher improvement rates than fixed evolutionary baselines across 10 benchmark tasks, including improving a kernel engineering score from 1363 to 1103 cycles using four co-evolving Claude Code agents. These are self-reported results from the CORAL paper (arXiv:2604.01658); no independent replication exists as of publication.

The project has 120 stars and 14 forks on GitHub (as of April 2026), consistent with a research release rather than production adoption.

## Architecture: Worktrees + Filesystem Coordination

### Isolation Model

`coral/workspace/worktree.py` handles agent isolation. For each agent, CORAL runs:

```
git branch coral/{agent_id} HEAD
git worktree add {agents_dir}/{agent_id} coral/{agent_id}
```

Each worktree gets its own `.venv` via `UV_PROJECT_ENVIRONMENT`, preventing concurrent agents from corrupting shared Python environments. Agents receive scoped filesystem permissions via Claude Code's `settings.json`: read access to other agents' worktrees (learning), write access only to their own, no git commands (agents call `coral eval` instead), no access to the private grader directory.

### Filesystem as Message Bus

The shared state directory `.coral/public/` contains three collaboration primitives, each symlinked into every agent's runtime-specific shared directory (`.claude/`, `.codex/`, `.opencode/`):

- **attempts/**: JSON records of every evaluation, containing `commit_hash`, `score`, `status`, `feedback`, and `parent_hash`. Agents search this with `coral log --search 'query'` before trying an approach.
- **notes/**: Free-form Markdown files where agents document discoveries, dead ends, and strategies.
- **skills/**: Directories containing a `SKILL.md` with YAML frontmatter plus supporting files. A bootstrap `skill-creator` skill teaches agents the skill format on startup.

No message queue, no database, no API. When Agent-1 writes `.claude/notes/finding.md`, that write lands in `.coral/public/notes/finding.md` via the symlink, immediately readable by Agent-2. The `fcntl.flock()` call in `coral/hub/checkpoint.py` serializes checkpoint commits but does not protect individual file writes.

### Eval Loop

`coral/hooks/post_commit.py` implements `run_eval()`. When an agent calls `coral eval -m "description"`:

1. Git stages and commits all changes
2. The grader runs in a separate `multiprocessing.Process` with configurable timeout, isolated to prevent segfaults or memory exhaustion from affecting the orchestrator
3. Score compares against the agent's personal best (improved/baseline/regressed)
4. `checkpoint()` commits `.coral/public/` changes to a nested git repo, recording a `shared_state_hash` that links each code attempt to the knowledge state at evaluation time
5. An `Attempt` JSON record is written

### Heartbeat System

`coral/agent/heartbeat.py` implements two trigger types:

**Interval triggers**: Fire every N evals. Used for reflect, consolidate (merge redundant notes), and cross-agent sharing prompts.

**Plateau triggers**: Fire when an agent's personal best hasn't improved for N consecutive evals. After firing, a cooldown prevents re-firing until improvement resets the counter. This is the primary mechanism against local optima convergence.

When a heartbeat fires, `AgentManager.monitor_loop()` sends SIGINT to the agent (Claude Code saves session on SIGINT), then resumes with `--resume {session_id}` plus the heartbeat prompt. The monitor loop polls every 5 seconds, watching for new attempt JSON files in `.coral/public/attempts/`.

### Multi-Runtime Support

CORAL supports Claude Code, OpenAI Codex, and OpenCode via the `AgentRuntime` protocol in `coral/agent/runtime.py`. Each runtime gets runtime-specific configuration: Claude Code uses `settings.json` with allow/deny rules; Codex uses `approval_policy = "never"` and `sandbox_mode = "danger-full-access"`; OpenCode uses `opencode.json`. A LiteLLM gateway (`coral/gateway/server.py`) assigns each agent a unique proxy key for per-agent cost tracking and model routing.

The CORAL.md template (`coral/template/coral_md.py`) generates the instruction file each agent reads at startup, adapting content for runtime, agent count, score direction, and whether web research is enabled.

## Key Numbers

| Metric | Value |
|--------|-------|
| GitHub stars | 120 |
| GitHub forks | 14 |
| License | MIT |
| Python version | 3.11+ |
| Benchmark tasks reported | 10 |
| Claimed improvement rate | 3-10x vs fixed evolutionary baselines |
| Kernel engineering improvement | 1363 → 1103 cycles (4 agents) |

All benchmarks are self-reported in arXiv:2604.01658. The paper was published April 2026; no independent validation exists.

## Strengths

**Zero-infrastructure coordination**: The symlink-based shared state requires no external services. Agents collaborate through files, which means the architecture works identically in local development, Docker containers, and remote machines.

**Evolutionary memory**: The `shared_state_hash` in each Attempt record enables causal analysis of whether specific knowledge contributions preceded score improvements. This is an unusual capability for multi-agent systems.

**Runtime-agnostic**: The `AgentRuntime` protocol means CORAL can run heterogeneous agent teams. The permission models differ per runtime but the coordination layer is identical.

**Observable**: The web dashboard (`coral/web/`) and 17+ CLI commands give full visibility into agent state, attempt history, and shared knowledge at any point during a run.

## Limitations

**Convergence herding**: All agents start from the same codebase and see the same leaderboard. Without strong diversity enforcement, agents may explore similar strategies. The plateau-triggered pivot mitigates but doesn't solve this.

**No merge mechanism**: Agent improvements stay isolated in separate branches. The best solution requires manual identification from the leaderboard and manual code extraction. CORAL optimizes for single-file or small-codebase tasks where this is acceptable; it does not suit collaborative development on larger codebases.

**Knowledge decay without pruning**: Notes and skills accumulate indefinitely. Over long runs, the shared knowledge directory fills with outdated or contradictory information. The "consolidate" heartbeat action asks agents to clean up, but there is no automated garbage collection. Agents must read through stale notes on every restart.

**Evaluation bottleneck**: Each eval spawns a `multiprocessing.Process`, imports the grader module, and runs it to completion. There is no partial feedback, no quick-check mode. For expensive graders (ML training, GPU kernel compilation), this caps iteration speed. The platform is designed for optimization tasks where grader speed is acceptable, not for tasks where feedback is intrinsically slow.

**Unspoken assumption: local filesystem**: The symlink and `fcntl.flock()` approach requires all agents to share a filesystem. Distributed execution across multiple machines is not supported. Session resumption additionally requires the session `.jsonl` files to exist on the same machine where the run started.

## When Not to Use CORAL

**Large, multi-file codebases**: CORAL's worktree isolation and lack of merge tooling makes it unsuitable for tasks where agents need to coordinate changes across many files. It works best for self-contained optimization problems.

**Tasks without clear scoring functions**: The entire system depends on a grader that returns a numeric score. Tasks requiring human judgment, qualitative assessment, or multi-objective tradeoffs without a combined scalar metric do not fit the eval loop.

**Budget-constrained single runs**: Each agent incurs its own LLM API costs running concurrently. A 4-agent run costs roughly 4x what a single-agent run costs. For problems where a single capable agent can find a good solution quickly, multi-agent coordination overhead is unjustified.

**Production-facing workflows**: CORAL uses `sandbox_mode = "danger-full-access"` for Codex agents. The permission model prevents cross-worktree writes but does not sandbox network access or system calls within a worktree. Do not run CORAL on tasks involving sensitive data or production infrastructure.

## Unresolved Questions

The documentation does not address:

- **Cost attribution at scale**: The LiteLLM gateway tracks per-agent requests, but there is no built-in budget enforcement. A misconfigured `max_turns` or a stuck agent can exhaust API budgets silently.
- **Conflict resolution for simultaneous note writes**: Two agents writing to the same notes file concurrently have no lock protection beyond the checkpoint's `fcntl.flock()`, which only serializes the git commit step. The file write itself is unprotected.
- **Grader security**: Grader code runs in a subprocess with access to the host filesystem outside the sandbox. User-provided graders could read or write arbitrary paths.
- **Long-run stability**: The paper evaluates multi-hour runs. The behavior of the heartbeat and monitor loop over multi-day runs (note accumulation, session file growth, checkpoint repo size) is not documented.

## Alternatives

| Alternative | When to choose it |
|-------------|-------------------|
| [AutoGen](../projects/autogen.md) | Agent-to-agent conversation workflows with explicit message passing rather than filesystem coordination |
| [CrewAI](../projects/crewai.md) | Structured role-based multi-agent pipelines with defined task delegation |
| [LangGraph](../projects/langgraph.md) | Stateful graph-based agent workflows with precise control over execution order |
| [MetaGPT](../projects/metagpt.md) | Software engineering workflows with specialized agent roles (PM, engineer, QA) |
| [EvoAgentX](../projects/evoagentx.md) | Automated workflow optimization where the agent graph itself evolves |

Use CORAL when the task is a well-defined optimization problem with a numeric grader, the codebase is small enough that branch isolation is practical, and parallel exploration is worth the API cost multiple. Use [LangGraph](../projects/langgraph.md) or [CrewAI](../projects/crewai.md) when you need structured coordination patterns rather than evolutionary search.

## Related Concepts

- [Multi-Agent Systems](../concepts/multi-agent-systems.md): The broader coordination paradigm CORAL instantiates
- [Self-Improving Agents](../concepts/self-improving-agents.md): CORAL's evolutionary optimization is one approach to runtime self-improvement
- [Agent Workflow Memory](../projects/agent-workflow-memory.md): Alternative approach to knowledge persistence across agent iterations
- [Context Engineering](../concepts/context-engineering.md): The CORAL.md template and heartbeat prompts are an instance of structured context management
- [Human-in-the-Loop](../concepts/human-in-the-loop.md): CORAL deliberately minimizes human intervention; the heartbeat system substitutes automated intervention for human oversight

## Sources

- [Deep Architecture Analysis](../raw/deep/repos/human-agent-society-coral.md)
- [Repository README](../raw/repos/human-agent-society-coral.md)
- [CORAL Paper (arXiv:2604.01658)](../raw/papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md)
