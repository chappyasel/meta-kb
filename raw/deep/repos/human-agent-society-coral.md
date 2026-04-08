---
url: 'https://github.com/Human-Agent-Society/CORAL'
type: repo
author: Human-Agent-Society
date: '2026-04-04'
tags:
  - agentic-skills
  - self-improving
  - agent-memory
  - context-engineering
key_insight: >-
  CORAL orchestrates parallel autonomous coding agents in isolated git worktrees
  with a shared .coral/ state directory (attempts/notes/skills) symlinked into
  each worktree, using a heartbeat system with plateau detection to interrupt
  stalled agents with reflection prompts -- creating an evolutionary multi-agent
  optimization loop where agents independently explore, evaluate via graders,
  and share knowledge through filesystem-based collaboration primitives.
stars: 120
deep_research:
  method: source-code-analysis
  files_analyzed:
    - coral/types.py
    - coral/config.py
    - coral/workspace/worktree.py
    - coral/workspace/project.py
    - coral/agent/manager.py
    - coral/agent/runtime.py
    - coral/agent/heartbeat.py
    - coral/hooks/post_commit.py
    - coral/hub/attempts.py
    - coral/hub/notes.py
    - coral/hub/skills.py
    - coral/hub/checkpoint.py
    - coral/template/coral_md.py
    - coral/template/coral.md.template
    - coral/gateway/server.py
    - coral/grader/protocol.py
    - coral/grader/base.py
    - coral/agent/builtin/claude_code.py
  analyzed_at: '2026-04-04'
  original_source: repos/human-agent-society-coral.md
relevance_scores:
  topic_relevance: 10
  practitioner_value: 9
  novelty: 8
  signal_quality: 9
  composite: 9.3
  reason: >-
    CORAL is a direct implementation of the multi-agent coordination, shared
    state management, and evolutionary self-improvement patterns that are core
    pillars of this knowledge base, with detailed architecture documentation
    covering worktree isolation, filesystem-based collaboration primitives,
    heartbeat/plateau detection, and SKILL.md-based knowledge sharing.
---

## Architecture Overview

CORAL (Collaborative Optimization via Reinforcement and Agent Learning) is a multi-agent orchestration system that spawns autonomous coding agents -- each running in its own git worktree -- to iteratively optimize code against a grader function. The architecture is built around a key insight: if you give multiple AI agents isolated codebases, shared state, and a scoring function, they naturally form an evolutionary search process where agents independently explore, evaluate, and share discoveries.

The system's directory layout reveals its fundamental design:

```
results/
└── <task-slug>/
    └── <timestamp>/
        ├─�� .coral/
        │   ├── public/          # Symlinked into each agent's worktree
        │   │   ├── attempts/    # JSON records of every eval (commit_hash, score, feedback)
        │   │   ├── notes/       # Markdown findings from agents
        │   │   ├── skills/      # Reusable tools/techniques as SKILL.md directories
        │   │   ├── logs/        # Agent process logs
        │   │   ├── heartbeat/   # Per-agent and global heartbeat configs
        │   │   └── sessions.json# Claude Code session IDs for resume
        │   ├── private/         # Grader data, answer keys (agents can't read)
        │   └── config.yaml      # Task config (copied from user's task.yaml)
        ├── repo/                # Cloned source repo
        └── agents/              # One git worktree per agent
            ├── agent-1/         # coral/agent-1 branch
            ├── agent-2/         # coral/agent-2 branch
            └── agent-3/         # coral/agent-3 branch
```

The system supports multiple agent runtimes via the `AgentRuntime` protocol (`coral/agent/runtime.py`): Claude Code, OpenAI Codex, and OpenCode. Each runtime provides its own instruction filename (CLAUDE.md, AGENTS.md, etc.) and shared directory convention (.claude/, .codex/, .opencode/). The `AgentManager` handles setup and lifecycle for all runtimes uniformly.

## Core Mechanism: Git Worktree Isolation

The worktree system (`coral/workspace/worktree.py`) is the foundation of CORAL's multi-agent isolation model. The `create_agent_worktree()` function executes:

1. **Branch creation**: `git branch coral/{agent_id} HEAD` -- each agent gets its own branch off the current HEAD
2. **Worktree creation**: `git worktree add {agents_dir}/{agent_id} coral/{agent_id}` -- creates an isolated working copy
3. **State injection**: Writes `.coral_agent_id`, `.coral_dir` breadcrumb files, and `.gitignore` entries

The critical detail is how shared state is connected. The `setup_shared_state()` function creates symlinks from the agent's shared directory (e.g., `.claude/notes/`) to the corresponding directories in `.coral/public/`. These are relative symlinks computed via `os.path.relpath()`, making them portable within the project tree. The symlinked items are: `notes`, `skills`, `attempts`, `logs`, and `heartbeat`.

This means when Agent-1 writes a file to `.claude/notes/finding.md`, it actually writes to `.coral/public/notes/finding.md`, which is immediately visible to Agent-2 reading `.claude/notes/finding.md` in its own worktree. No synchronization protocol is needed -- the filesystem is the message bus.

### Permission Isolation

Each runtime gets scoped permissions. For Claude Code (`setup_claude_settings()`), the agent receives:

**Allow rules**: `Bash`, `Read(/{worktree_pattern})`, `Read(/{agents_pattern})`, `Edit(/{worktree_pattern})`, `Write(/{worktree_pattern})`, plus optional `WebSearch`/`WebFetch`.

**Deny rules**: `Bash(git *)` (CORAL owns git), `Read(/{private_pattern})` (no reading answer keys).

This means agents can read other agents' worktrees (to learn from their code) but can only write to their own. They cannot run git commands directly -- all version control goes through `coral eval`. They cannot read the private grader data. This permission model creates a controlled sandbox where agents have enough freedom to experiment but cannot corrupt each other's state or cheat on evaluations.

### Worktree Environment Setup

Each worktree gets its own isolated `.venv` via `UV_PROJECT_ENVIRONMENT`, preventing concurrent agents from corrupting a shared Python environment. The `setup_worktree_env()` function runs user-specified setup commands (e.g., `uv sync`) and then installs CORAL itself into each worktree's venv so agents can use `uv run coral eval`.

## The Eval Loop

The eval loop is implemented in `coral/hooks/post_commit.py` via the `run_eval()` function. When an agent calls `coral eval -m "description"`, the following sequence executes:

1. **Git add + commit**: `_git_add_and_commit()` stages all changes and creates a commit with the agent's message
2. **Grader execution**: The grader runs in a separate `multiprocessing.Process` with a configurable timeout (`config.grader.timeout`). This process isolation is essential -- graders execute arbitrary user code (numpy, torch, etc.) that might block the event loop or consume excessive memory. The child process re-loads the grader from config to avoid pickle issues with dynamically imported modules.
3. **Score comparison**: The score is compared against the agent's previous personal best to determine status (`improved`, `baseline`, `regressed`)
4. **Shared state checkpoint**: `checkpoint()` in `coral/hub/checkpoint.py` commits all changes in `.coral/public/` to a local git repo inside that directory, using `fcntl.flock()` for concurrency safety. This creates a version history of shared state, separate from the code repository.
5. **Attempt record**: The `Attempt` dataclass is written as JSON to `.coral/public/attempts/{commit_hash}.json`

The `Attempt` record contains: `commit_hash`, `agent_id`, `title` (the eval message), `score`, `status`, `parent_hash`, `timestamp`, `feedback`, `shared_state_hash`, and `parent_shared_state_hash`. The shared state hash links each code commit to the shared knowledge state at the time of evaluation, enabling later analysis of how knowledge sharing affected performance.

## The Heartbeat System

The heartbeat system (`coral/agent/heartbeat.py`) is CORAL's mechanism for external intervention in the agent loop. It supports two trigger types:

**Interval triggers**: Fire every N evals (local or global). Used for periodic reflection ("reflect"), note consolidation ("consolidate"), and cross-agent knowledge sharing.

**Plateau triggers**: Fire when an agent hasn't improved its personal best for N consecutive evals. The `_check_plateau()` method implements cooldown logic: after firing, the action won't re-fire until either the agent improves (resetting the counter) or another N non-improving evals pass. This prevents spamming stuck agents with repeated reflection prompts.

Built-in heartbeat actions include:
- **reflect**: Triggered on interval, interrupts agent with eval results and prompts for strategic reflection
- **consolidate**: Merges redundant notes, updates skills
- **pivot**: Triggered on plateau, forces the agent to abandon its current approach and try something fundamentally different

When a heartbeat action triggers, the `AgentManager.monitor_loop()` interrupts the agent via SIGINT (which Claude Code handles gracefully, saving its session), then resumes with a combined prompt containing the eval header and all triggered action prompts. The session resumption mechanism uses Claude Code's `--resume` flag with the saved session ID.

### Monitor Loop Implementation

The `monitor_loop()` in `AgentManager` runs a tight poll loop (default: 5-second intervals) that:

1. **Watches for new attempts**: Compares the set of JSON files in `.coral/public/attempts/` against a seen set
2. **Tracks per-agent metrics**: eval counts, best scores, evals since improvement
3. **Checks heartbeat conditions**: Merges local and global heartbeat configs, evaluates trigger conditions
4. **Handles dead agents**: Detects exited processes (max-turns reached, crashes) and auto-restarts with a score summary prompt

The dead agent detection is essential for long-running experiments. When an agent hits its max-turns limit, it exits normally. The monitor loop detects this, extracts the session ID from the agent's log file, and restarts with `--resume` plus a prompt summarizing the latest eval results.

## Shared Knowledge Primitives

### Attempts

Attempt records (`coral/hub/attempts.py`) are the primary coordination mechanism. Every agent can see every other agent's eval history through `coral log`, `coral show`, and `coral log --search`. The leaderboard sorts by score and shows rank, score, agent ID, title, time, and commit hash.

The `search_attempts()` function does case-insensitive full-text search over titles, feedback, and status -- enabling agents to check "has anyone tried X?" before duplicating effort. This is explicitly mentioned in the CORAL.md template: "Before implementing, search: `coral log --search 'your idea'`."

### Notes

Notes (`coral/hub/notes.py`) are individual Markdown files with optional YAML frontmatter (creator, created date). They support a legacy format (single `notes.md` with `## [date] title` headings) for backward compatibility. Notes are sorted by frontmatter date, falling back to file mtime.

The notes system is deliberately simple -- there's no structured schema, no tagging, no linking. Agents write free-form markdown about their discoveries. The simplicity is the point: agents can write notes in any format without learning a schema, and the search function handles discoverability.

### Skills

Skills (`coral/hub/skills.py`) are directories containing a `SKILL.md` file with YAML frontmatter (name, description, creator, created) and any number of supporting files (scripts, examples, reference data). The `read_skill()` function returns the SKILL.md content plus a list of all files in the directory.

CORAL seeds each project with a `skill-creator` skill (`coral/template/skills/skill-creator/SKILL.md`) that teaches agents how to create, test, and optimize skills. This bootstraps the skill creation loop -- agents read the meta-skill to learn the skill format, then create their own skills.

### Checkpointing

The checkpoint system (`coral/hub/checkpoint.py`) maintains a separate git repository inside `.coral/public/` that tracks all shared state changes. Each eval triggers a checkpoint commit with the message `"checkpoint: {agent_id} - {message}"`. The file lock (`fcntl.flock()`) prevents concurrent agents from corrupting the checkpoint history.

This enables `checkpoint_diff()` to show exactly what shared state changed at each eval, and `checkpoint_history()` to list recent changes. The shared state hash stored in each `Attempt` record links code changes to knowledge state, enabling causal analysis of knowledge sharing's effect on performance.

## Design Tradeoffs

### Filesystem as Message Bus

CORAL uses the filesystem for all inter-agent communication rather than a database, message queue, or API. Agents read and write markdown files, JSON records, and SKILL.md directories. This has major implications:

**Advantages**: Zero infrastructure dependencies, works with any agent runtime, naturally persistent, human-readable, git-trackable. Agents don't need to learn an API -- they just read and write files.

**Disadvantages**: No transactional guarantees (two agents writing the same note simultaneously could corrupt it), no real-time notifications (agents must poll), no structured queries (search is brute-force string matching). The `fcntl.flock()` on checkpoints only serializes the checkpoint operation, not individual file writes.

### Process Isolation for Grading

Graders run in separate `multiprocessing.Process` instances with hard timeouts. This is necessary because graders execute arbitrary user code that might segfault, hang on I/O, or consume all available memory. The child process re-loads the grader from config to avoid pickle issues.

The tradeoff is startup overhead: each eval spawns a new process, imports the grader module, and initializes it from scratch. For lightweight graders this is negligible; for heavy ones (ML model evaluation) it adds significant latency.

### Session Resumption vs. Fresh Start

When restarting agents, CORAL attempts to resume the previous Claude Code session via `--resume {session_id}`. This preserves the agent's conversation history and context. However, session validation checks if the `.jsonl` session file exists on the local machine -- if the run was started on a different machine, sessions won't be found and agents start fresh.

The fallback prompt for fresh starts is comprehensive: it instructs the agent to review the leaderboard, recent activity, notes, skills, and top attempts before writing any code. This ensures even a fresh-started agent can bootstrap from the shared knowledge.

### Multi-Runtime Support

CORAL supports Claude Code, Codex, and OpenCode as agent runtimes. Each has different permission models, configuration formats, and instruction file conventions. The `AgentRuntime` protocol abstracts these differences, but the `setup_*_settings()` functions in `worktree.py` contain substantial runtime-specific logic.

The Codex runtime uses `approval_policy = "never"` and `sandbox_mode = "danger-full-access"` for autonomous operation. The OpenCode runtime maps permissions to its own `opencode.json` format. This multi-runtime support means CORAL can run heterogeneous agent teams -- mixing Claude Code and Codex agents, for example -- though the practical value of this is limited since agents communicate through filesystem primitives that work the same regardless of runtime.

## Failure Modes & Limitations

### Convergence to Local Optima

Without strong pivot mechanisms, multiple agents may converge on the same approach. The plateau-triggered pivot action mitigates this, but there's no mechanism to ensure agents explore different regions of the solution space. All agents start from the same codebase and see the same leaderboard, which creates herding behavior.

### Knowledge Decay

Notes and skills accumulate without pruning. Over a long run, the shared knowledge directory may contain outdated or contradictory information. The "consolidate" heartbeat action asks agents to merge redundant notes, but there's no automated garbage collection for obsolete knowledge.

### Evaluation Bottleneck

Every eval requires a full grader execution. For expensive graders (ML training, complex simulations), this limits the agent's iteration speed. Agents can't get partial feedback -- they must commit and run the full evaluation pipeline. There's no concept of quick-check vs. full-eval.

### No Merge Strategy

Agents work on independent branches but there's no automated merge mechanism. Each agent's improvements are isolated to its worktree. The best approach must be manually identified from the leaderboard and the code diff extracted via `coral show`. This is by design (CORAL optimizes single-file or small-codebase tasks where merge conflicts aren't the primary concern), but limits applicability to larger projects.

### Agent Process Management

CORAL relies on process signals (SIGINT, SIGTERM, SIGKILL) for agent lifecycle management. This works well for Claude Code (which saves sessions on SIGINT) but is fragile -- processes that don't handle signals cleanly can leave zombie children. The `start_new_session=True` flag on subprocess creation and the `os.killpg()` calls handle process groups, but edge cases exist when agent runtimes spawn their own child processes.

## Integration Patterns

### Gateway Pattern

The `GatewayManager` (`coral/gateway/server.py`) embeds a LiteLLM proxy with CORAL-specific middleware. Each agent gets a unique proxy API key, enabling per-agent request tracking and cost attribution. The gateway routes all agent LLM traffic through a central proxy, which enables model switching, rate limiting, and request logging without modifying agent configurations.

The middleware intercepts every LLM request, associates it with an agent via the API key, and tracks the agent's current commit hash. This enables correlating LLM usage with specific code changes -- a powerful debugging tool for understanding why an agent made particular decisions.

### CORAL.md Template System

The `generate_coral_md()` function (`coral/template/coral_md.py`) produces the instruction file each agent reads at startup. The template includes the task description, workflow instructions (plan -> edit -> eval -> repeat), shared state conventions, and ground rules. The template adapts based on configuration:

- **Single vs. multi-agent**: Single-agent mode uses a simplified template without sharing references
- **Research enabled**: Adds a research step before planning, with instructions to use web search
- **Score direction**: Explains whether higher or lower scores are better, with type-specific descriptions
- **Shared dir name**: Adapts paths for the active runtime (.claude/, .codex/, .opencode/)

The template explicitly instructs agents to "Write notes and skills there directly -- do NOT git add or git commit anything under {shared_dir}/ or .coral/. Just write the files." This is a critical design constraint: shared state lives outside git to prevent agents from accidentally committing symlinks or breaking the evaluation system.

## Benchmarks & Performance

The `examples/` directory contains benchmark tasks: MNIST classification, Stanford COVID vaccine prediction, Kernel Builder optimization, and kernel engineering challenges. Each example includes a `task.yaml` config, seed code, and a grader script.

The blog directory includes benchmark comparisons showing CORAL's performance on the Erdos Minimum Overlap Problem and kernel builder tasks against individual agent baselines. The `stages.png` image in the blog suggests a multi-stage optimization process where scores improve over time through agent collaboration.

CORAL's effectiveness depends heavily on the task characteristics: it works best for optimization problems with clear scoring functions, small-to-medium codebases, and solution spaces that benefit from parallel exploration. For tasks where a single expert agent can find the solution quickly, the overhead of multi-agent coordination may not justify the cost.
