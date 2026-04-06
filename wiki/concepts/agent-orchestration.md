---
entity_id: agent-orchestration
type: concept
bucket: agent-systems
abstract: >-
  Agent orchestration coordinates multiple AI agents across pipelines or
  networks, handling task routing, state management, and inter-agent
  communication; its key differentiator is enabling parallelism and
  specialization beyond what a single LLM context can handle.
sources:
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/transformeroptimus-superagi.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
related: []
last_compiled: '2026-04-06T02:15:42.461Z'
---
# Agent Orchestration

## What It Is

Agent orchestration is the set of patterns and mechanisms for coordinating multiple AI agents working toward shared goals. A single agent with a single context window has hard limits: finite token budget, no parallelism, one cognitive "style" applied to every sub-problem. Orchestration breaks those limits by routing subtasks to specialized agents, running them in parallel, and combining their outputs.

The term covers a broad territory: a simple two-node pipeline where one agent searches and another synthesizes is orchestration, and so is a 10-agent swarm with a supervisor, a compiler, and a knowledge review gate. The common thread is that no single agent sees or controls everything. Responsibility is distributed, and something must manage that distribution.

## Why It Matters

Three pressures drive adoption:

**Token budget pressure.** Long tasks (research, software projects, competitive analysis) exceed what fits in a single context. Distributing subtasks across agents sidesteps the limit.

**Specialization.** A code-execution agent, a retrieval agent, and a synthesis agent each perform better on their slice of a task than a generalist handling all three. [Agentic RAG](../concepts/agentic-rag.md) is the canonical example: a retrieval-specialized agent queries a [vector database](../concepts/vector-database.md) or [knowledge graph](../concepts/knowledge-graph.md), while a separate agent synthesizes the retrieved passages into a final answer.

**Verification.** A single agent has no external check on its own outputs. A second agent reviewing the first's work catches compounding errors before they propagate. This pattern appears in SICA's review committee (which must approve proposed self-modifications before implementation) and in multi-agent knowledge base pipelines that gate articles through a blind evaluator before promoting them to a permanent store.

## How It Works

### Topology Patterns

**Pipeline (linear).** Agent A produces output, agent B consumes it, agent C produces the final result. Simple to reason about, but each stage blocks on the previous one. Good for tasks with strict sequential dependencies.

**Fan-out/fan-in.** An orchestrator decomposes a task into parallel subtasks, dispatches them to worker agents simultaneously, then aggregates results. This is the dominant pattern for research and analysis workloads where subtasks are independent. Karpathy's autoresearch loop ran approximately 700 experiments autonomously using this structure, with the orchestrator analyzing sequences of results to plan the next batch of experiments.

**Hierarchical (supervisor/worker).** A supervisor agent holds the high-level plan and delegates execution to worker agents. The supervisor does not run tools itself; it routes, monitors, and decides when to escalate or retry. [LangGraph](../projects/langgraph.md) and [CrewAI](../projects/crewai.md) both expose this topology as a first-class primitive.

**Swarm with shared memory.** Agents operate semi-independently, writing outputs to shared state (a wiki, a folder of raw files, a database). A separate compiler or integrator periodically reorganizes the shared state into structured form. A supervisor then validates entries before they become permanent. This pattern scales well but requires explicit conflict resolution when two agents write contradictory conclusions to the same knowledge base.

**Self-modifying loop.** The meta-agent and target-agent are the same system. SICA's architecture is the clearest implementation: a coding agent evaluates its own benchmark performance, modifies its own Python source (tools, reasoning structures, sub-agents), then re-evaluates. The runner selects which prior iteration to use as the next base, using a multi-objective utility function that weights performance (0.5), cost efficiency (0.25), and execution time (0.25) to avoid regressing on lucky-but-fragile iterations.

### Task Routing

Routing determines which agent receives which input. The mechanisms range from static (hardcoded conditions) to dynamic (an LLM decides at runtime).

**Static routing** uses rule-based dispatch: if the task contains a code block, route to the code-execution agent; otherwise route to the synthesis agent. Zero latency overhead, but brittle when task types don't cleanly separate.

**LLM-based routing** has the orchestrator classify incoming tasks before dispatch. More flexible, but adds a full inference call per routing decision. [LangChain](../projects/langchain.md) uses this pattern for its agent router.

**Capability-based routing** tags each agent with declared capabilities and matches tasks to agents by capability intersection. SuperAGI exposes this through its tool registration system, where agents advertise available tools and the orchestrator dispatches based on tool requirements.

**Hierarchical delegation** passes routing decisions to the most local agent with sufficient context. The supervisor delegates to a middle-tier agent, which further delegates to specialists. SICA's `MainOrchestratorAgent` delegates to `Coder`, `Reasoner`, `ProblemSolver`, and `ArchiveExplorer` sub-agents based on the step currently executing in the meta-improvement workflow.

### State and Memory Management

Inter-agent communication requires shared state. The three main approaches:

**Shared context injection.** The orchestrator holds a central state object and injects relevant slices into each agent's context at invocation. Clean but creates a bottleneck at the orchestrator, which must track what each agent needs to know.

**Shared storage (files, databases).** Agents read and write to a common store. The swarm wiki pattern (raw folder → compiler → review gate → permanent knowledge base) is a file-based implementation. [LangGraph](../projects/langgraph.md) uses a graph state object that all nodes can read and write. This scales horizontally but requires explicit locking or conflict resolution when agents write concurrently.

**Message passing.** Agents communicate through structured messages on a bus or queue. Decouples agents, enables async execution, but adds architectural complexity and makes debugging harder because the full execution trace is distributed across the message log.

[Agent Memory](../concepts/agent-memory.md) is a related concern: orchestration determines what context flows between agents at task time, while memory systems determine what persists across sessions. These interact — an agent's [episodic memory](../concepts/episodic-memory.md) of past tasks shapes how it handles new ones, and an orchestrator that doesn't account for agent memory state will generate inconsistent results.

### Verification and Quality Gates

A single agent generating output has no external check. Orchestration enables verification patterns:

**Blind review.** A reviewer agent evaluates output without access to how it was produced, preventing bias toward keeping work the executing agent generated. The multi-agent wiki architecture described by @jumperz uses this: Hermes (the supervisor) evaluates articles with no context about which swarm agent produced them, scoring each before promoting to the permanent knowledge base.

**Committee review.** Multiple reviewer agents independently score a proposal; the orchestrator aggregates scores before proceeding. SICA's `meta_improvement_review_committee` requires the improving agent to iterate with reviewers until no significant concerns remain before any code modification is implemented.

**Benchmark-gated promotion.** Changes or outputs are only adopted if they meet measurable performance thresholds across a benchmark suite. SICA's runner implements this: a modified agent version must demonstrate improvement on benchmark problems before being selected as the base for the next iteration. The confidence-interval-aware selection (`select_base_agent()`) prevents adopting a version that got lucky on a few problems.

**[Iterative self-verification](../concepts/iterative-self-verification.md).** An agent generates a candidate output, then re-evaluates it against explicit criteria before submitting. This is single-agent but frequently appears as a sub-pattern inside orchestrated pipelines.

## Implementation: Key Design Decisions

### Synchronous vs. Asynchronous Execution

Synchronous pipelines are easier to debug but serialize everything. Async execution (parallel tool calls, parallel agent invocations) cuts wall-clock time but complicates error handling. Most production orchestration frameworks default to synchronous and expose async as an opt-in. SICA uses parallel Docker workers (`--workers`, default 8) for benchmark evaluation specifically because benchmarks are embarrassingly parallel.

### Sandboxing

When agents execute code or modify files, sandboxing prevents runaway processes from affecting the host. SICA runs each benchmark problem in a fresh Docker container with `network_mode='none'`, `mem_limit='2g'`, and `cpu_quota=50000`. The tradeoff: sandboxing prevents inter-problem learning within a benchmark run, sacrificing adaptability for evaluation integrity. For orchestration systems that write to shared knowledge bases, equivalent isolation at the write layer (transactions, staging areas) serves the same function.

### Observability

Distributed agent execution is opaque by default. Useful orchestration systems expose: per-agent execution traces, message logs, cost tracking per agent invocation, and retry/failure records. SICA's callgraph module tracks execution as a DAG of agent calls, and the web server module renders this as an interactive browser visualization. [LangGraph](../projects/langgraph.md) surfaces execution as a graph traversal log. Without this visibility, debugging a 10-agent pipeline failure requires reconstructing causality from scattered outputs.

### [Context Engineering](../concepts/context-engineering.md) for Multi-Agent Systems

Each agent in a pipeline operates from its own context window. What the orchestrator injects into that window determines whether the agent has enough information to act well. Too little context and the agent makes uninformed decisions; too much and you burn tokens on irrelevant history or hit the context limit. The per-agent briefing pattern (generating agent-specific context summaries rather than injecting raw shared state) addresses this: each agent starts with exactly the context relevant to its role, not the full swarm output.

[Context collapse](../concepts/context-collapse.md) is the failure mode here: critical information drops out of an agent's context between steps, forcing it to operate on incomplete state. Good orchestrators track which information each agent has seen and re-inject when necessary.

## Failure Modes

**Hallucination compounding.** One agent produces a plausible-but-wrong connection. A downstream agent treats it as established fact and builds on it. By the time a third agent references the original error, it appears multiply corroborated. Knowledge base systems are especially vulnerable because errors persist. Blind review gates and benchmark-based validation exist specifically to break this chain before bad outputs become permanent.

**Path dependence.** In self-modifying systems, early modifications constrain later ones. SICA's authors note that "poor quality initial feature suggestions (e.g. fixating on caching open files) often lower the quality of subsequent feature suggestions." There is no mechanism for global restart without manually reverting to iteration 0. Different runs from the same starting point diverge significantly due to stochastic modification sequences.

**Cost explosion.** Each additional agent adds inference cost. A 10-agent pipeline with parallel execution can burn through budget fast, especially when each agent makes multiple LLM calls. SICA's cost monitor alerts at 50%, 80%, 90%, and 95% of per-problem budget thresholds. Without cost controls, a self-directing orchestration system can incur hundreds of dollars per improvement iteration.

**Coordination overhead outweighing benefit.** Small tasks don't benefit from multi-agent orchestration. The overhead of routing, state management, and result aggregation can exceed the gain from parallelism or specialization. A single capable agent with good tools often outperforms an orchestrated pipeline on narrowly scoped tasks.

**Change log accumulation.** In systems that maintain a running log of modifications or decisions, the log grows linearly with iterations. Past a certain length, the LLM's effective attention on the full history degrades, and later decisions reference the log less accurately. SICA's `agent_change_log.md` faces this problem after many self-improvement iterations.

**Cascading failures.** If agent B depends on agent A's output and agent A fails silently (returning a plausible but empty result), agent B proceeds with bad input and produces bad output. Without explicit health checks and failure propagation between agents, orchestrated pipelines can deliver confident-seeming wrong answers.

## When Not to Use Orchestration

Orchestration adds overhead in the wrong context:

- **Short, bounded tasks** where a single agent with good tools finishes faster than an orchestrated pipeline can set up inter-agent communication.
- **Low-latency requirements** where multiple sequential agent calls exceed response time budgets.
- **Constrained debugging capacity**: distributed multi-agent systems are harder to trace than single-agent ones. If your team doesn't have observability infrastructure, a single capable agent is easier to operate correctly.
- **Token budgets are not the bottleneck**: if the task fits comfortably in a single context, the complexity of orchestration provides no benefit.

## Key Frameworks

[LangGraph](../projects/langgraph.md) exposes orchestration as explicit graph traversal with typed state, suitable for pipelines where you want precise control over what each node sees. [CrewAI](../projects/crewai.md) provides role-based orchestration with built-in crew management primitives. [LangChain](../projects/langchain.md) offers agent chains and routers but lacks LangGraph's graph-level state management. [SuperAGI](../projects/superagi.md) targets developer ergonomics with built-in tool registration and agent management UI. [OpenClaw](../projects/openclaw.md) handles execution-layer routing (running agents, dispatching crons, managing channels) separate from evaluation — the swarm wiki architecture uses it for execution while a separate supervisor handles judgment.

For self-improving orchestration specifically, SICA and [EvoAgentX](../projects/evoagentx.md) represent different approaches: SICA unifies the meta-agent and target-agent into a single self-modifying system; EvoAgentX evolves agent populations across generations.

## Related Concepts

- [Task Decomposition](../concepts/task-decomposition.md): how to break a goal into subtasks suitable for distribution
- [Agent Memory](../concepts/agent-memory.md): what persists across agent invocations and how orchestrators manage state between sessions
- [Context Engineering](../concepts/context-engineering.md): what to inject into each agent's context window at invocation
- [Agentic RAG](../concepts/agentic-rag.md): retrieval as an orchestrated sub-workflow rather than a static lookup
- [Self-Improving Agents](../concepts/self-improving-agents.md): the recursive case where the orchestrated system modifies its own orchestration
- [ReAct](../concepts/react.md): the reasoning-and-acting loop that most individual agents within an orchestrated system run internally
- [Execution Traces](../concepts/execution-traces.md): observability artifacts that make multi-agent pipelines debuggable
- [Model Context Protocol](../concepts/mcp.md): a standardized interface for agents to call tools, relevant when orchestrating agents across different tool environments
