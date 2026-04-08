---
url: 'https://github.com/greyhaven-ai/autocontext'
type: repo
author: greyhaven-ai
date: '2026-04-04'
tags:
  - self-improving
  - agentic-skills
  - agent-memory
  - context-engineering
  - knowledge-bases
key_insight: >-
  Autocontext implements a full multi-agent self-improvement harness with credit
  assignment: a competitor proposes strategies, an analyst explains outcomes, a
  coach updates playbooks, an architect proposes tooling changes, and a curator
  gates what knowledge persists -- with GEPA-inspired Pareto optimization,
  Elo-based progression gating, and frontier-to-local distillation to turn
  repeated frontier-model work into cheaper local runtimes.
stars: 695
deep_research:
  method: source-code-analysis-plus-web
  files_analyzed:
    - README.md
    - CLAUDE.md
    - CHANGELOG.md
    - autocontext/src/autocontext/loop/generation_runner.py
    - autocontext/src/autocontext/loop/controller.py
    - autocontext/src/autocontext/agents/competitor.py
    - autocontext/src/autocontext/agents/analyst.py
    - autocontext/src/autocontext/agents/coach.py
    - autocontext/src/autocontext/agents/architect.py
    - autocontext/src/autocontext/execution/improvement_loop.py
    - autocontext/src/autocontext/knowledge/trajectory_builder.py
    - autocontext/src/autocontext/knowledge/weakness.py
    - autocontext/src/autocontext/harness/pipeline/gate.py
    - autocontext/src/autocontext/harness/pipeline/trend_gate.py
    - autocontext/src/autocontext/harness/meta_optimizer.py
    - autocontext/src/autocontext/harness/optimizer/pareto.py
    - autocontext/src/autocontext/harness/scoring/backends.py
    - autocontext/src/autocontext/training/runner.py
    - autocontext/src/autocontext/training/export.py
    - autocontext/src/autocontext/config/settings.py
    - autocontext/src/autocontext/config/presets.py
    - autocontext/src/autocontext/scenarios/base.py
    - autocontext/src/autocontext/storage/sqlite.py
    - autocontext/src/autocontext/analytics/credit_assignment.py
    - autocontext/tests/test_improvement_loop.py
  web_sources:
    - 'https://github.com/greyhaven-ai/autocontext'
    - >-
      https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents
    - 'https://github.com/alvinreal/awesome-autoresearch'
    - 'https://openreview.net/pdf?id=g9rEYVNn5T'
  analyzed_at: '2026-04-04'
  original_source: repos/greyhaven-ai-autocontext.md
relevance_scores:
  topic_relevance: 10
  practitioner_value: 9
  novelty: 9
  signal_quality: 9
  composite: 9.4
  reason: >-
    Autocontext is a textbook example of all three primary pillars
    simultaneously: a multi-agent orchestration system with specialized roles, a
    self-improving loop with credit assignment and Pareto optimization, and a
    knowledge substrate with versioned playbooks, hints, and curator-gated
    persistence — implemented end-to-end with distillation, scoring backends,
    and ~4,400 tests.
---

## Architecture Overview

Autocontext is the most architecturally ambitious self-improvement system in this analysis. It is a full multi-agent orchestration platform that runs scenarios, evaluates outcomes, persists validated knowledge, and optionally distills stable behavior into cheaper local models. Described by its creators as "a recursive self-improving harness designed to help your agents (and future iterations of those agents) succeed on any task," the intended use is mostly hands-off: point the harness at a real task in plain language, let it work the problem, and then inspect the traces, reports, artifacts, datasets, playbooks, and optional distilled model it produces.

The codebase spans two packages: a Python control plane (`autocontext/`) with ~2,800 tests and a TypeScript operator surface (`ts/`) with ~1,600 tests.

The Python package (`autocontext/src/autocontext/`) is organized into major subsystems:

- **`loop/`** -- The generation runner (`generation_runner.py`) and loop controller that orchestrate the core improve cycle. Each generation: load scenario + knowledge, build score trajectory, orchestrate agents, run tournament matches, apply backpressure gating, persist to SQLite + artifacts.
- **`agents/`** -- Five specialized agent roles: `CompetitorRunner` (proposes strategies), `Analyst` (explains what happened), `Coach` (updates playbooks with hints and lessons), `Architect` (proposes tooling improvements), `Curator` (quality-gates what knowledge persists).
- **`execution/`** -- Execution supervisors and executors: `LocalExecutor`, `PrimeIntellectExecutor` (remote sandbox), `MontyExecutor` (pydantic-monty interpreter), `SSHExecutor`. Also contains `ImprovementLoop` for multi-round evaluate-revise cycles and `LLMJudge` for scoring.
- **`knowledge/`** -- Per-scenario knowledge storage: playbooks (versioned markdown with rollback), hints (coach-generated), tools (architect-generated), analysis per generation, cross-run snapshots, skill export, weakness analysis, and score trajectory building.
- **`harness/`** -- The meta-optimization layer: `MetaOptimizer`, `BackpressureGate`/`TrendAwareGate` for progression control, Pareto frontier tracking, scoring backends (Elo, Glicko), and component sensitivity profiling.
- **`scenarios/`** -- Pluggable scenarios: game scenarios (`grid_ctf`, `othello`) evaluated through tournament matches, and agent task scenarios evaluated by LLM judge. Custom scenario creation via natural language to generated code.
- **`training/`** -- Frontier-to-local distillation: export training data from successful runs, train local models via MLX (Apple Silicon) or CUDA backends, model registry, and promotion pipeline.
- **`analytics/`** -- Credit assignment, correlation tracking, rubric drift calibration, regression fixture generation, pattern clustering, facet extraction, timeline inspection, and trace reporting.
- **`providers/`** -- Multi-model LLM abstraction: Anthropic, OpenAI-compatible, Ollama, vLLM, MLX, callable wrappers, with retry and scenario-based routing.
- **`storage/`** -- SQLiteStore (15 migration files for schema evolution), ArtifactStore (filesystem), buffered writer.
- **`config/`** -- Pydantic settings from `AUTOCONTEXT_*` environment variables, named presets, tuning bounds.

## Core Mechanism

### The Generation Loop

The `GenerationRunner` class in `loop/generation_runner.py` implements the core self-improvement cycle. Each "generation" proceeds through these stages:

**1. Load Scenario + Knowledge** -- The runner loads the target scenario from `SCENARIO_REGISTRY` and all persisted knowledge for that scenario: playbook (markdown with `<!-- PLAYBOOK_START/END -->` delimiters), accumulated hints, architect-generated tools, analysis from prior generations, and cross-run snapshots.

**2. Build Score Trajectory** -- `ScoreTrajectoryBuilder` assembles the history of scores across all prior generations. This trajectory is injected into every agent prompt, giving each agent awareness of how performance has evolved. This is the equivalent of git history in autoresearch -- but structured, quantified, and agent-readable.

**3. Orchestrate Agents** -- The `AgentOrchestrator` coordinates the five agent roles:

- **Competitor** (`agents/competitor.py`) -- Produces a JSON strategy (or executable Python code when `AUTOCONTEXT_CODE_STRATEGIES_ENABLED=true`). The `CompetitorRunner.run()` method sends a prompt with tool context and available hints, receiving a strategy proposal. It can also `revise()` based on feedback and `refine_strategy()` during tree search.

- **Analyst** -- Produces markdown analysis with Findings, Root Causes, and Recommendations sections. Runs in parallel with Coach and Architect after the Competitor. The analyst's role is pure diagnosis -- understanding what happened and why, without proposing solutions.

- **Coach** -- Updates the accumulated playbook. Output is delimited by `<!-- PLAYBOOK_START/END -->`, `<!-- LESSONS_START/END -->`, and `<!-- COMPETITOR_HINTS_START/END -->` markers. The coach sees the full score trajectory and analyst output, then decides what lessons to add, modify, or remove from the playbook. This is the knowledge synthesis agent -- it distills raw experience into reusable guidance.

- **Architect** -- Proposes tooling improvements and generates executable tool code. Tools are persisted to `knowledge/<scenario>/tools/` with old versions archived. The architect runs every N generations (controlled by `AUTOCONTEXT_ARCHITECT_EVERY_N_GENS`), not every generation, because tooling changes are higher-risk and should be less frequent than strategy changes.

- **Curator** -- Quality gate for playbook updates and lesson consolidation. Uses `<!-- CURATOR_DECISION: accept|reject|merge -->` markers. The curator prevents knowledge pollution by rejecting low-quality or contradictory lessons. Periodically consolidates lessons (controlled by `AUTOCONTEXT_CURATOR_CONSOLIDATE_EVERY_N_GENS`).

**4. Tournament/Evaluation** -- For game scenarios, strategies compete in tournament matches with Elo-based rating. For agent task scenarios, the `ImprovementLoop` orchestrates multi-round evaluate-revise cycles with an `LLMJudge`.

**5. Backpressure Gating** -- The `BackpressureGate` or `TrendAwareGate` decides whether to `advance` (accept the generation's improvements), `retry` (re-run with different parameters), or `rollback` (revert to the previous playbook version). The `TrendAwareGate` adds plateau detection: if scores have been flat for `plateau_window` generations, it relaxes the minimum delta threshold by `plateau_relaxation_factor`.

**6. Curator Quality Gate** -- If enabled (`AUTOCONTEXT_CURATOR_ENABLED`), the curator evaluates proposed playbook changes and decides `accept`, `reject`, or `merge`.

**7. Persist** -- Accepted changes are written to SQLite (runs, generations, matches, feedback) and the filesystem (playbooks, tools, snapshots). The playbook is versioned with rollback capability (`AUTOCONTEXT_PLAYBOOK_MAX_VERSIONS`).

**8. Consolidation** -- Periodically, the curator consolidates accumulated lessons, removing redundant entries and capping total lessons at `AUTOCONTEXT_SKILL_MAX_LESSONS`.

### Why Five Agents Instead of One

The five-agent architecture is autocontext's most distinctive design choice. Each agent has a narrow responsibility, and this separation creates cleaner feedback signals than a single agent trying to do everything:

- The **competitor** does not need to analyze its own failures -- the analyst does that.
- The **coach** does not need to propose strategies -- it only synthesizes lessons from what worked and what failed.
- The **architect** proposes structural changes (tools) separately from tactical changes (strategies).
- The **curator** provides an independent quality gate that prevents knowledge pollution.

This mirrors how effective human teams work: specialists who excel at one thing rather than generalists who do everything adequately. The tradeoff is ~5x the LLM calls per generation, but the quality of each component's output is higher because its context is focused.

### The Improvement Loop (Agent Tasks)

The `ImprovementLoop` class in `execution/improvement_loop.py` orchestrates multi-round evaluate-revise cycles for agent task scenarios. Each round:

1. **Evaluate** -- The current output is scored by the `LLMJudge`, which uses multi-sample evaluation with a 4-tier fallback parser for score extraction. Scores include per-dimension breakdown (e.g., accuracy, completeness, relevance).
2. **Threshold Check** -- If score >= `quality_threshold` and `min_rounds` met, stop.
3. **Revise** -- Call `task.revise_output()` with judge feedback, producing a new output.
4. **Plateau Detection** -- If scores plateau (< `PLATEAU_EPSILON` change for `PLATEAU_PATIENCE` rounds), trigger early termination.
5. **Dimension Tracking** -- `dimension_trajectory` tracks per-dimension scores across rounds, enabling targeted revision (revise the worst dimension).

The `ImprovementResult` dataclass tracks: all rounds, best output/score/round, judge failures, termination reason (threshold_met/max_rounds/plateau_stall/unchanged_output/consecutive_failures), dimension trajectory, and critically, `pareto_frontier` and `actionable_side_info` (GEPA-inspired ASI tracking integrated at AC-266).

### GEPA-Inspired Optimization

Autocontext directly incorporates ideas from GEPA. The `harness/optimizer/pareto.py` module implements `ActionableSideInfo` tracking, maintaining a Pareto frontier across evaluation dimensions. Instead of collapsing scores into a single scalar, autocontext tracks per-dimension performance and maintains non-dominated candidates.

This integration means autocontext can preserve strategies that excel in specific dimensions (e.g., a strategy with perfect accuracy but slow execution time coexists with a fast-but-less-accurate strategy). The Pareto frontier prevents the common failure mode where optimizing for one dimension regresses another.

### Credit Assignment

The `analytics/credit_assignment.py` module implements component sensitivity profiling -- one of autocontext's most sophisticated features. When the system makes changes across multiple components (playbook, tools, hints, strategy), credit assignment determines which changes actually drove score improvements.

The challenge: when a generation improves the playbook AND adds a new tool AND changes the strategy, which change was responsible for the score increase? Without credit assignment, the system might attribute success to a flashy new tool when the real driver was a subtle playbook lesson.

`summarize_credit_patterns()` aggregates credit signals across runs, enabling the system to identify which types of changes are consistently effective. This feedback loop allows the meta-optimizer to allocate resources toward the most impactful types of changes.

### Scoring Backends

Pluggable scoring backends (`harness/scoring/backends.py`) support:
- **Elo** -- Classic Elo rating for tournament-based scenarios. Accounts for opponent strength in relative rankings.
- **Glicko** -- Glicko rating with uncertainty tracking. Accounts for both opponent strength and rating confidence.
- **Direct Score** -- Raw score comparison for judge-based evaluation.

The backend is selected via `get_backend()` factory function, and scores feed into the backpressure gate's advance/retry/rollback decision. Elo and Glicko are used for game scenarios (grid_ctf, othello) where opponent adaptation matters; Direct Score is used for judge-based tasks where absolute quality matters.

### Frontier-to-Local Distillation

The `training/` subsystem enables distilling frontier model behavior into cheaper local models. This is autocontext's answer to the cost problem -- frontier models are expensive, so after the system learns what works, it transfers that knowledge to cheaper runtimes:

1. **Export** (`training/export.py`) -- Extract training data from successful runs: input-output pairs from high-scoring generations, with rubric alignment.
2. **Train** (`training/runner.py`) -- Fine-tune a local model using exported data. Backends: MLX (Apple Silicon, host-only) and CUDA. MLX training is host-only on macOS, with sandboxed agents able to trigger training via a file-based host watcher flow.
3. **Model Registry** (`training/model_registry.py`) -- Track trained models with metadata (scenario, training data, validation scores).
4. **Promotion** -- When a distilled model meets quality thresholds, it can replace the frontier model for that scenario, reducing ongoing costs.

This creates a complete self-improvement lifecycle: frontier model runs scenarios -> successful patterns are exported -> local model is trained -> local model handles future runs at lower cost. The North Star is to move from one-off frontier-model exploration toward workflows that become more reliable, more auditable, and cheaper to run over time.

### MetaOptimizer

The `harness/meta_optimizer.py` implements `MetaOptimizer.from_settings()`, which coordinates the optimization strategy across generations. It integrates:

- **Component sensitivity profiling** -- Which types of changes (playbook, tools, hints, strategy) drive the most improvement?
- **Novelty exploration** -- Multi-basin playbook branching to explore fundamentally different approaches rather than hill-climbing within one strategy space.
- **Cost-aware loop control** -- Budget allocation across generations, with long-run presets optimized for different cost/quality tradeoffs.

The long-run presets (`config/presets.py`) provide named configurations optimized for different use cases: quick experiments (minimize cost, few generations) vs deep optimization (many generations, larger budgets, more architect interventions).

### Harness Engineering Philosophy

Autocontext embodies a specific philosophy about agent improvement that aligns with the broader "harness engineering" movement: **it is not a model problem, it is a configuration problem.** The insight (articulated in the HumanLayer blog): "anytime you find an agent makes a mistake, you take the time to engineer a solution such that the agent never makes that mistake again."

The equation is: `coding agent = AI model(s) + harness`. The harness comprises the runtime peripherals -- system prompts, tools, skills, sub-agents, hooks, back-pressure mechanisms. Autocontext automates this harness engineering process: the competitor proposes, the analyst diagnoses, the coach codifies lessons, the architect builds tools, and the curator quality-gates. Each generation of the loop is one iteration of automated harness engineering.

This is fundamentally different from approaches like SICA (which modifies the agent's own source code) or autoresearch (which modifies a target artifact). Autocontext modifies the *knowledge and tooling* around the agent, keeping the agent's code stable while evolving its context.

## Design Tradeoffs

### Five-Agent Architecture vs Single-Loop
Autocontext uses 5 specialized agents per generation rather than a single agent loop. This adds ~5x the LLM calls per generation but enables separation of concerns. The tradeoff: higher per-generation cost but cleaner feedback signals and better knowledge quality. The analyst does not pollute its diagnosis with solution proposals; the coach does not dilute its lesson synthesis with strategy generation. Each agent's context window is focused on its specialty.

### Curator as Knowledge Gate
The curator agent acts as a gatekeeper for all knowledge changes. This prevents the "knowledge pollution" failure mode where bad lessons accumulate and degrade future performance. But it also introduces a potential bottleneck: if the curator is too conservative, good lessons may be rejected; if too liberal, bad lessons slip through. The consolidation mechanism (periodic, with lesson cap at `AUTOCONTEXT_SKILL_MAX_LESSONS`) provides a secondary defense.

### Elo/Glicko vs Raw Scores
Using Elo/Glicko for tournament scenarios provides relative ranking that accounts for opponent strength, but adds complexity and requires multiple matches per generation. Raw scores are simpler but do not account for opponent adaptation. The choice of backend depends on the scenario type -- game scenarios benefit from relative ranking, while agent tasks with LLM judges use direct scores.

### Cross-Run Inheritance
`AUTOCONTEXT_CROSS_RUN_INHERITANCE` enables sharing knowledge between runs (via snapshots). This accelerates learning on repeated tasks but risks contamination between unrelated runs if the scenario scope is too broad. The design choice: opt-in, not default, with explicit scenario-level scoping.

### Knowledge Persistence vs Knowledge Freshness
Autocontext persists knowledge across generations and runs, creating a growing knowledge base. The risk: stale knowledge from early generations may conflict with lessons from later generations. The curator's consolidation and the playbook versioning with rollback capability mitigate this, but long-running systems need explicit knowledge pruning strategies.

### Monty Sandboxing vs Docker
Autocontext supports multiple execution backends: `LocalExecutor` (no isolation), `MontyExecutor` (pydantic-monty sandbox), `PrimeIntellectExecutor` (cloud sandbox), `SSHExecutor` (remote). The MontyExecutor provides lightweight sandboxing without Docker overhead, but with less isolation. Docker (via PrimeIntellect) provides strong isolation at higher latency. The multi-backend approach lets users choose their isolation/performance tradeoff.

### Playbook vs Code Modification
Unlike SICA (which modifies Python code) or autoresearch (which modifies target artifacts), autocontext modifies knowledge artifacts: playbooks, hints, tools, and strategies. This is lower-risk than code modification (a bad lesson can be rolled back without breaking the system) but also lower-leverage (it cannot restructure the agent's architecture). The frontier-to-local distillation bridges this gap by eventually encoding learned behavior into model weights.

### Ecosystem Mode for Provider Comparison
`loop/ecosystem_runner.py` alternates provider modes across cycles: `--provider-a anthropic --provider-b agent_sdk`. This enables A/B testing of different LLM configurations with shared knowledge, allowing the system to identify which provider produces better improvements. This is a unique capability -- most self-improvement systems assume a fixed LLM provider.

## Failure Modes & Limitations

1. **Agent Coordination Failure** -- With 5 agents per generation, miscommunication is possible. The analyst might misdiagnose a failure, leading the coach to encode a bad lesson in the playbook, which then persists through the curator if it seems plausible. The chain of trust (analyst -> coach -> curator) means a single misdiagnosis can propagate.

2. **Playbook Drift** -- Over many generations, the playbook can accumulate contradictory lessons (especially if the curator's consolidation is infrequent). The `AUTOCONTEXT_SKILL_MAX_LESSONS` cap helps but may discard useful older lessons via FIFO rather than quality-based pruning.

3. **Backpressure Oscillation** -- The trend gate's plateau relaxation can cause oscillation: relax threshold -> accept marginal improvement -> tighten threshold -> reject similar improvements -> plateau detected -> relax again. This creates a cycle that wastes generations without genuine progress.

4. **Credit Misattribution** -- Component sensitivity profiling correlates changes with score improvements but cannot establish causation. A playbook change and a tool change in the same generation make attribution ambiguous. The system can identify patterns across many generations but may be fooled by correlated-but-non-causal changes.

5. **Distillation Data Quality** -- Training data exported from frontier model runs may include successful-but-lucky strategies that do not generalize. The distilled model might overfit to specific scenario instances rather than learning transferable capabilities.

6. **Scenario Coupling** -- Knowledge is stored per-scenario. If two scenarios share underlying patterns, the system cannot transfer learning between them (unless cross-run inheritance is enabled with a shared knowledge directory). This limits knowledge reuse.

7. **Judge Reliability** -- The LLM judge has a 4-tier fallback parser but can still produce parse failures. The improvement loop's `_is_parse_failure()` function detects common failure markers, but novel failure modes may go undetected. Judge inconsistency introduces noise into the score trajectory.

8. **Cost at Scale** -- Five agents per generation, each making LLM calls, plus tournament matches or judge evaluations, plus periodic architect interventions creates substantial per-generation cost. The long-run presets help with budget allocation, but deep optimization runs are expensive.

## Integration Patterns

### CLI-First Design
Autocontext is designed for CLI-first usage: `autoctx solve`, `autoctx run`, `autoctx simulate`, `autoctx investigate`, `autoctx analyze`, `autoctx mission`, `autoctx train`. Each surface is a different entry point to the same underlying engine. The CLI-first approach means the system is scriptable and composable with other tools.

### MCP Server
The MCP server (`mcp/server.py`) exposes autocontext's capabilities to external agents. Tools prefixed with `autocontext_*` provide knowledge search, scenario execution, skill export, and more. This enables other agent systems to leverage autocontext's accumulated knowledge.

### OpenClaw Integration
The `openclaw/` module provides adapters for integrating with external agent frameworks. `agent_adapter.py` translates between autocontext's internal protocol and external agent APIs. `skill.py` exports knowledge as portable skill packages. `distill.py` handles the distillation pipeline for external models.

### Ecosystem Mode
`loop/ecosystem_runner.py` alternates provider modes across cycles: `--provider-a anthropic --provider-b agent_sdk`. This enables A/B testing of different LLM configurations with shared knowledge, allowing the system to identify which provider produces better improvements.

### Named Presets
`config/presets.py` provides named configurations: long-run presets optimize for many generations with appropriate budget allocation, while quick presets minimize cost for short experiments. The presets encode production-learned tradeoffs between exploration depth and cost.

### Relationship to Other Systems

Autocontext occupies a unique position in the self-improvement landscape:

- **vs Autoresearch**: Autoresearch modifies a target artifact (code, prompts) directly. Autocontext modifies the knowledge and tooling around an agent. Autoresearch is simpler and cheaper per iteration; autocontext captures richer feedback through its multi-agent architecture.
- **vs GEPA**: GEPA optimizes text artifacts through evolutionary search with ASI. Autocontext incorporates GEPA's Pareto optimization and ASI concepts but adds persistent knowledge (playbooks), credit assignment, and frontier-to-local distillation.
- **vs SICA**: SICA modifies the agent's own Python code. Autocontext modifies knowledge artifacts (playbooks, tools, hints). SICA's changes are higher-risk/higher-reward; autocontext's changes are safer and more easily rolled back.

## Benchmarks & Performance

Autocontext's performance depends heavily on the scenario and provider configuration. The key metrics tracked internally:

- **Elo progression** -- For game scenarios, Elo rating tracks improvement over generations.
- **Quality threshold** -- For agent tasks, the percentage of outputs meeting the quality threshold.
- **Knowledge accumulation** -- Number of validated lessons, tools, and hints persisted.
- **Distillation success rate** -- Percentage of frontier model behavior successfully captured in local models.
- **Credit assignment accuracy** -- How well the system attributes improvements to specific changes.

Recent capability additions (from CHANGELOG):
- GEPA-inspired ASI/Pareto optimizer wired into improvement loop
- Component sensitivity profiling and credit assignment
- Pluggable scoring backends with Elo and Glicko support
- Novelty exploration and multi-basin playbook branching
- Cost-aware loop control and long-run presets
- Frontier-to-local distillation via MLX (Apple Silicon) and CUDA
- Ecosystem mode for A/B provider comparison
- Curator agent with consolidation for knowledge quality gating

The 695 stars position autocontext as a niche but sophisticated system, appealing to teams building production agent workflows that need to improve over time rather than starting cold each run. The system's test suite (2,800 Python + 1,600 TypeScript tests) suggests production-grade engineering quality.
