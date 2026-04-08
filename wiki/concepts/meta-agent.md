---
entity_id: meta-agent
type: concept
bucket: multi-agent-systems
abstract: >-
  A meta-agent orchestrates, evaluates, or modifies other agents in a hierarchy
  — distinct from peer agents by having authority over their configuration,
  routing, or behavior, not just their outputs.
sources:
  - repos/canvas-org-meta-agent.md
  - repos/greyhaven-ai-autocontext.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/foundationagents-metagpt.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
related:
  - claude
  - gepa
  - openai
  - anthropic
  - react
  - gepa
last_compiled: '2026-04-08T03:04:22.700Z'
---
# Meta-Agent

## What It Is

A meta-agent is an LLM-powered agent whose primary domain is other agents. Where a base agent executes tasks — writing code, calling APIs, browsing the web — a meta-agent observes, coordinates, evaluates, or modifies the agents doing that work. The distinction is structural: a meta-agent operates on agents as its objects, not on the world directly.

The term covers three distinct functional roles that often overlap in practice:

**Orchestrators** route tasks to sub-agents, manage execution order, and synthesize outputs. MetaGPT's `TeamLeader` ([MetaGPT](../projects/metagpt.md)) intercepts every message in the team bus, decides which role should handle it, and delegates via explicit task assignment. [OpenAI Agents SDK](../projects/openai-agents-sdk.md) formalizes this as a first-class handoff primitive.

**Evaluators** score sub-agent outputs and decide whether to accept, retry, or rollback. Autocontext's `Curator` agent quality-gates every proposed playbook mutation before it persists. The `LLMJudge` in its `ImprovementLoop` scores outputs across multiple dimensions and drives the advance/retry/rollback decision in the `BackpressureGate`.

**Improvers** analyze sub-agent behavior and modify the harness around them — prompts, tools, hooks, skills — to change future behavior. This is the most architecturally ambitious role: meta-agents that not only observe performance but change the system that produces it.

These roles compose. GEPA ([GEPA](../concepts/gepa.md)) acts as both evaluator and improver. Autocontext's five-agent architecture (Competitor, Analyst, Coach, Architect, Curator) splits these responsibilities across specialized agents, each with a narrow function, coordinated by a generation runner.

## Why It Matters

Harness optimization is a meaningful lever on agent performance. On TerminalBench-2, hand-engineered harness changes lift vanilla Claude Code + Haiku 4.5 from 27.5% to 35.5% with no fine-tuning. Meta-agent (canvas-org) improved tau-bench airline accuracy from 67% to 87% through automated harness optimization over 4-10 iterations. These gains come not from better base models but from better configuration of the agents already in use.

This matters because the gap between a base agent and a well-configured agent is often larger than the gap between two different base models. A meta-agent can close that gap continuously, on production data, without labeled training sets.

## How It Works

### The Core Loop

Every meta-agent implementation runs some variant of:

```
observe sub-agent behavior →
evaluate quality →
identify failure patterns →
propose harness change →
validate on holdout →
apply or reject
```

The variation is in which steps involve LLMs, how validation works, and what constitutes a "harness change."

**meta-agent** (canvas-org): reads unlabeled production traces, runs an LLM judge to score them, has a proposer identify recurring failure patterns and write one targeted change (prompt, hook, tool, stop condition), validates on a small labeled holdout, keeps the change only if holdout accuracy improves. Filesystem memory stores all prior candidates, traces, and scores so the proposer can search history before proposing — avoiding repeated failed attempts.

**Autocontext**: runs scenarios with a Competitor agent that proposes strategies, scores results via tournament (Elo/Glicko for game scenarios) or LLM judge (for task scenarios), passes outcomes to an Analyst that diagnoses failures, a Coach that updates the playbook (markdown with versioning and rollback), an Architect that generates new tools, and a Curator that quality-gates all changes. The `GenerationRunner` orchestrates this loop; `BackpressureGate` decides advance/retry/rollback based on score trajectory. [Source](../raw/deep/repos/greyhaven-ai-autocontext.md)

**ACE** (Agentic Context Engine): uses a Generator (runs the agent), Reflector (critiques execution traces), and Curator (synthesizes delta bullets that merge deterministically into the evolving context). The non-LLM merge is the critical design choice — by appending bullets rather than rewriting the full context, ACE prevents the information loss that occurs when LLMs iteratively summarize their own context ("context collapse"). [Source](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

**MetaGPT TeamLeader**: coordinates a team of specialized agents by intercepting all messages, routing them to the appropriate role, managing a task `Plan` DAG with explicit assignees, and delegating via `publish_team_message`. Complexity routing is explicit in the prompt: XS/S tasks skip PRD and design, M+ tasks get the full PM → Architect → Engineer pipeline. [Source](../raw/deep/repos/foundationagents-metagpt.md)

### What Meta-Agents Can Modify

The harness is everything around the model: system prompts, tools, hooks, memory, sub-agents, stop conditions, routing logic. Meta-agents differ by which layer they target:

| Layer | Example | Mechanism |
|-------|---------|-----------|
| System prompt | meta-agent rewrites prompt with policy rules | Direct file write |
| Skills/playbook | Autocontext Coach updates markdown playbook | Delimited block replacement |
| Tools | Autocontext Architect generates new tool code | Code generation + archive |
| Context bullets | ACE Curator appends delta bullets | Deterministic merge |
| Routing | MetaGPT TeamLeader delegates tasks | Message `send_to` targeting |
| Model weights | Autocontext distillation (frontier → local) | MLX/CUDA fine-tuning |

Prompt and skill changes are low-risk and reversible. Code generation (tool creation, subagent modification) is higher-risk. Weight updates (distillation) are the highest-leverage but most expensive.

### Validation as the Gating Mechanism

Without validation, a meta-agent is a prompt-mutation machine that may accumulate garbage. Every credible implementation uses a holdout or equivalency check:

- meta-agent: small labeled holdout set evaluated with the official task evaluator, not the LLM judge used during search
- Autocontext: `BackpressureGate` compares generation scores against a moving threshold; `TrendAwareGate` detects plateaus and relaxes thresholds to escape local optima
- ACE: helpful/harmful counters on each bullet track association with successful vs failed executions over time
- MetaGPT: no explicit validation loop for harness changes (the TeamLeader routes, not improves)

Holdout separation is the key discipline. meta-agent found its judge-based search run reached 87% holdout accuracy vs 80% for labeled-search — possibly because LLM judge critiques ("the agent refunded without checking the cancellation policy") provide richer signal than binary pass/fail labels.

### Credit Assignment

When multiple harness components change simultaneously, which change drove the improvement? Autocontext's `analytics/credit_assignment.py` implements component sensitivity profiling — correlating specific types of changes (playbook, tools, hints, strategy) with score improvements across many generations. This is hard to get right: playbook change and tool addition in the same generation make attribution ambiguous. The system identifies patterns over many runs rather than per-generation.

ACE's helpful/harmful counters are a simpler approach — each bullet tracks its own association with outcomes, providing per-item rather than per-component attribution.

## Concrete Architecture Patterns

### The Five-Role Architecture (Autocontext)

Autocontext's most distinctive design: five agents with narrow responsibilities rather than one generalist.

```
CompetitorRunner → proposes strategy
Analyst → diagnoses what happened and why
Coach → updates playbook with lessons
Architect → generates tools (runs every N generations)
Curator → quality-gates all knowledge changes
```

The separation is not cosmetic. The Analyst does not propose solutions; the Coach does not diagnose failures. Each agent's context window stays focused on its specialty, producing higher-quality outputs per role than a single agent doing everything. The cost is ~5x LLM calls per generation.

The Curator provides independent quality gating. Without it, bad lessons accumulate — a plausible-sounding but wrong lesson passes through the Coach and persists indefinitely. With the Curator, each proposed change faces a second LLM evaluation before it touches the knowledge store.

### Subscription-Based Coordination (MetaGPT)

MetaGPT's `_watch()` mechanism encodes the SOP as message routing topology. Each role subscribes to the output types of its upstream roles:

```python
Architect._watch([WritePRD])
ProjectManager._watch([WriteDesign])
Engineer._watch([WriteTasks, SummarizeCode, WriteCode])
```

No orchestrator directs traffic. The SOP is topology, not code. Adding a role requires only defining what it watches — zero changes to existing roles. The TeamLeader layer adds dynamic routing on top: it intercepts all messages and can override the static subscription graph with explicit delegation.

### Incremental Delta Context (ACE)

ACE's curator merges new knowledge as small bullets via deterministic logic, not LLM rewriting. Each bullet carries a unique ID and helpful/harmful counters. Semantic deduplication (embedding-based) prunes redundant bullets.

The non-LLM merge is the architectural key. LLMs applying brevity bias to context rewriting will compress "When parsing European XBRL filings, check decimals before scale" into "Parse filings carefully." The deterministic merge never makes this compression — it appends the specific bullet and lets deduplication handle exact redundancy separately. [Source](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

### Filesystem Memory (meta-agent)

meta-agent stores every harness candidate, its scores, and its traces on disk. The proposer searches this history before proposing changes — finding what has already been tried, which changes improved performance, and which trace patterns recur. This prevents the proposer from repeatedly attempting the same failed fix.

## Failure Modes

**Overfitting to visible traces.** meta-agent's proposer initially fixed specific traces rather than writing general behavioral rules, improving search accuracy while hurting holdout. Their mitigation: "State your change as a rule about agent behavior. If you can only justify it by pointing to specific traces, it's too narrow."

**Knowledge pollution.** Without a quality gate, every bad lesson from a misdiagnosed failure accumulates in the playbook. The Analyst misdiagnoses → Coach encodes bad lesson → Curator misses it → lesson persists and degrades future performance. The chain of trust means a single early error propagates.

**Backpressure oscillation.** Autocontext's TrendAwareGate can cycle: plateau detected → relax threshold → accept marginal improvement → tighten → reject similar improvements → plateau again. This wastes generations without genuine progress.

**Context collapse.** Meta-agents that evolve prompts through LLM rewriting — asking an LLM to incorporate new lessons into the current system prompt — experience progressive information loss. Each rewrite applies brevity bias. ACE's incremental delta approach prevents this; systems without it should treat it as an unresolved risk.

**Credit misattribution.** When multiple components change simultaneously, correlation is not causation. A tool addition and a playbook change in the same generation both correlate with improvement. The system may reinforce the wrong component, wasting subsequent generations on less effective change types.

**Cost at scale.** Autocontext: 5 agents × N LLM calls per generation × tournament matches × architect interventions = substantial per-generation cost. meta-agent: proposer uses Opus 4.6 per iteration. These costs are justified for systems with long production lifespans, not for one-off tasks.

## When NOT to Use a Meta-Agent

**Simple tasks.** ACE's paper explicitly notes that "simpler tasks often benefit more from concise instructions than lengthy contexts." A meta-agent adds overhead — extra LLM calls, validation cycles, memory management — that is not justified when the base agent already performs well and the task is predictable.

**No feedback signal.** Meta-agents that improve behavior need to evaluate behavior. Without execution feedback (test results, API outcomes, human labels, or a holdout set), the meta-agent cannot distinguish helpful from harmful changes. Deploying a meta-agent that optimizes on noisy or unavailable feedback will degrade the system.

**Single-run tasks.** Meta-agent improvement compounds over many iterations. For a task run once, the overhead of improvement cycles exceeds any benefit. The value is in recurring tasks where learned harness improvements transfer.

**Safety-critical applications without human-in-the-loop.** A meta-agent that can modify prompts, tools, or subagents can modify behavior in unexpected directions. Autocontext's playbook rollback and the Curator quality gate help, but they do not catch all failure modes. For high-stakes deployments, [Human-in-the-Loop](../concepts/human-in-the-loop.md) review of proposed harness changes is a prerequisite.

**When you need structural changes.** Meta-agents that modify prompts and tools cannot restructure the agent's architecture — add a new agent role, change the memory system, switch inference backends. Those changes require human engineering.

## Unresolved Questions

**Governance of harness changes.** Who controls what a meta-agent is allowed to modify? Autocontext archives old tool versions and supports playbook rollback, but there is no access control framework for saying "the meta-agent can update prompts but cannot create new subagents." This is an open design problem.

**Conflict resolution between concurrent meta-agents.** What happens when two meta-agents propose conflicting harness changes simultaneously? None of the implementations address multi-meta-agent coordination. Autocontext's single-threaded generation loop sidesteps this; MetaGPT's TeamLeader is a singleton. Production deployments with multiple improvement loops will need explicit conflict resolution.

**Knowledge transfer between tasks.** Autocontext stores knowledge per-scenario. ACE bullets are task-specific. Neither provides a mechanism for transferring lessons learned on task A to related task B. Cross-task knowledge transfer is mentioned (Autocontext's cross-run inheritance) but not architected.

**Distillation quality at scale.** Autocontext's frontier-to-local distillation trains local models on successful run data. Whether distilled models generalize to novel task instances rather than overfitting to training scenarios is not validated in available benchmarks.

**Judge reliability as improvement signal.** meta-agent's judge-based search outperformed labeled search in one run on 50 tasks. This is a single-run result with no variance estimates. Whether LLM judge critique ("the agent refunded without checking policy") is systematically better than binary labels, or whether this was noise in a small experiment, is not established.

## Alternatives

**[ReAct](../concepts/react.md)**: Use when you need a single agent with tool use, not coordination of multiple agents. ReAct adds no improvement loop.

**[LangGraph](../projects/langgraph.md)**: Use when you need deterministic multi-agent workflows with explicit state machines. Suitable for production pipelines where the workflow is known and stable, not for self-improving systems.

**[CrewAI](../projects/crewai.md)**: Use when you want role-based multi-agent coordination with minimal setup. No meta-level improvement; roles are fixed.

**[AutoGen](../projects/autogen.md)**: Use when you need flexible agent conversation patterns with code execution. Closer to peer coordination than hierarchical meta-agent.

**[DSPy](../projects/dspy.md)**: Use when your optimization target is a prompt or chain, you have labeled data, and you want gradient-based or discrete optimization over prompt parameters. DSPy optimizes prompts systematically; meta-agents optimize harnesses holistically including tools and routing logic.

**[GEPA](../concepts/gepa.md)**: Use when optimizing a specific text artifact (prompt, rubric, playbook) through evolutionary search with Pareto multi-objective tracking. GEPA is narrower than a full meta-agent loop but more principled for artifact-level optimization.

**[Self-Improving Agents](../concepts/self-improving-agents.md)**: The broader concept of which meta-agents are one implementation pattern. Includes approaches based on weight updates, skill synthesis, and memory evolution that do not use a dedicated meta-agent.

## Related Concepts

- [Multi-Agent Systems](../concepts/multi-agent-systems.md): The coordination layer meta-agents sit above
- [Agent Harness](../concepts/agent-harness.md): What meta-agents modify
- [Prompt Optimization](../concepts/prompt-optimization.md): One specific target of meta-agent improvement
- [LLM-as-Judge](../concepts/llm-as-judge.md): The evaluation primitive most meta-agents depend on
- [Reflexion](../concepts/reflexion.md): Self-improvement through verbal reflection, an early meta-agent precursor
- [Execution Traces](../concepts/execution-traces.md): The primary input to meta-agent evaluation
- [Human-in-the-Loop](../concepts/human-in-the-loop.md): The governance layer missing from most meta-agent implementations
- [Continual Learning](../concepts/continual-learning.md): The learning-theoretic framing of what meta-agents do operationally
- [GEPA](../concepts/gepa.md): Evolutionary artifact optimization, directly integrated into Autocontext
- [SkillBook](../concepts/skill-book.md): One form of harness that meta-agents maintain and evolve
