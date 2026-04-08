---
entity_id: multi-agent-collaboration
type: concept
bucket: multi-agent-systems
abstract: >-
  Multi-agent collaboration: patterns for coordinating multiple AI agents toward
  shared goals via task decomposition, message passing, and shared memory —
  distinguished from single-agent approaches by parallel execution and
  specialization.
sources:
  - papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md
  - repos/jackchen-me-open-multi-agent.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
related:
  - multi-agent-systems
last_compiled: '2026-04-08T23:29:25.524Z'
---
# Multi-Agent Collaboration

## What It Is

Multi-agent collaboration describes the set of patterns, protocols, and architectural choices that let multiple AI agents divide work, share information, and produce outputs no single agent could achieve alone. The core idea is simple: some tasks benefit from parallelism, specialization, or checks between independent reasoners. The implementation details are where things get complicated.

This is distinct from [Multi-Agent Systems](../concepts/multi-agent-systems.md) as a field — collaboration is the runtime behavior, not the infrastructure. It sits at the intersection of [Context Engineering](../concepts/context-engineering.md), [Agent Memory](../concepts/agent-memory.md), and [Cognitive Architecture](../concepts/cognitive-architecture.md).

## Why It Matters

Single agents face a hard ceiling: context length limits what they can hold, sequential reasoning limits throughput, and a single model's knowledge limits quality on specialized tasks. Multi-agent collaboration breaks each of these constraints differently.

Parallelism helps throughput. A fan-out pattern sends three research agents to gather information simultaneously, then a synthesis agent combines results — the wall-clock time is bounded by the slowest parallel branch, not the sum of all branches.

Specialization helps quality. An architect agent that only designs API contracts develops (via its system prompt and tool restrictions) a different behavioral profile than a developer agent that only implements. Both outperform a generalist agent doing both jobs sequentially.

Independent verification helps correctness. When two agents reach the same conclusion without sharing intermediate reasoning, the agreement carries more evidential weight than one agent checking its own work.

The CORAL paper demonstrates a concrete case: replacing fixed evolutionary heuristics with autonomous agents that maintain shared memory produced 3-10x higher improvement rates on optimization tasks, with fewer evaluations than fixed search strategies. The paper attributes this to knowledge reuse — agents compound on each other's findings rather than starting each iteration cold. This is self-reported from the CORAL authors but the mechanism is mechanistically plausible.

## Core Patterns

### Coordinator-Worker (Hierarchical)

A coordinator agent decomposes a goal into a task directed acyclic graph, assigns tasks to workers, and synthesizes results. Workers execute independently and report back.

Open Multi-Agent implements this as `runTeam()`: the user passes a goal string, and a coordinator agent calls an LLM to produce a task DAG with dependency edges and agent assignments. Independent tasks execute in parallel via a semaphore-bounded `AgentPool`. The `TaskQueue` tracks dependency resolution and unblocks downstream tasks as upstream tasks complete. [Source](../raw/repos/jackchen-me-open-multi-agent.md)

The coordinator pattern concentrates planning risk: if the coordinator misdecomposes the goal, every downstream task inherits that error. Over-decomposition (splitting a simple task into unnecessary subtasks) wastes tokens. Under-decomposition (treating a complex task as atomic) fails to capture parallelism benefits. Coordinator prompt quality is load-bearing.

[CrewAI](../projects/crewai.md) and [AutoGen](../projects/autogen.md) both implement coordinator-worker hierarchies with different tradeoffs: CrewAI emphasizes role-based agent personas, AutoGen emphasizes conversational flexibility.

### Peer-to-Peer (Flat Collaboration)

Agents share a message bus and a shared memory store. Any agent can publish findings that any other agent can query. There's no central planner — agents self-schedule based on what information becomes available.

CORAL uses this pattern for open-ended discovery tasks. Agents run asynchronously with heartbeat-based health checks. They publish intermediate results to a shared persistent memory, and other agents query that memory to build on prior findings. The paper reports that this knowledge reuse is the primary driver of improvement over fixed search baselines. [Source](../raw/papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md)

Flat collaboration is harder to debug than hierarchical coordination because there's no single point tracking overall state. It scales better under uncertainty — when the optimal task decomposition isn't known upfront, letting agents self-organize avoids committing to a bad plan early.

### Pipeline (Sequential)

Agents form a chain where each agent's output becomes the next agent's input. Design → implement → review is a common example. This is the simplest topology and the easiest to reason about: failures localize, outputs are deterministic in structure, and each stage can have strict input/output contracts.

Open Multi-Agent exposes this as `runTasks()` with explicit dependency edges. [LangGraph](../projects/langgraph.md) models pipelines as graphs where nodes are agents and edges are state transitions, which generalizes sequential pipelines to arbitrary DAGs.

The limitation: latency is the sum of all stages, not the maximum. Pipelines don't help throughput unless you add parallelism at individual stages.

### Fan-Out / Aggregate (MapReduce)

A coordinator dispatches the same task to multiple agents with different perspectives or data partitions, then aggregates results. Open Multi-Agent exposes `runParallel()` for this pattern, explicitly comparing it to MapReduce.

This is the canonical pattern for tasks that decompose by data rather than by function: three research agents each search different sources, a synthesis agent merges findings. The aggregate step requires judgment — a simple concatenation produces incoherent output, so the aggregating agent needs enough context to resolve contradictions.

## Shared Memory and Context

Collaboration requires shared state. The design choices here matter enormously.

**Message bus**: Agents publish and subscribe to events. Low coupling — agents don't need to know about each other's internal state, only the messages they emit. The downside is that message ordering and delivery guarantees become infrastructure problems.

**Shared memory store**: A single writable store all agents can read and write. Open Multi-Agent's `sharedMemory: true` flag on `createTeam()` enables this. CORAL uses persistent shared memory as the primary coordination mechanism.

The tweet-thread by @BranaRakic articulates a more ambitious vision: shared context graphs with cryptographic provenance, where agents publish structured knowledge assets (decisions, rationale, code relationships) rather than raw text. Trust levels filter what agents consume — "verified memory" requires consensus from multiple independent agents, "working memory" is private scratch space. The analogy to software branching (local → PR → main → release) maps naturally to agent knowledge states. This is a design proposal, not a deployed system, but it names the real problem: shared memory without trust levels means hallucinations from one agent propagate to all others. [Source](../raw/tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md)

[Graphiti](../projects/graphiti.md) and [Letta](../projects/letta.md) address parts of this: Graphiti maintains temporal knowledge graphs that multiple agents can query; Letta's [Core Memory](../concepts/core-memory.md) and [Long-Term Memory](../concepts/long-term-memory.md) architecture partitions memory by scope.

## Coordination Protocols

### Task Dependency Resolution

Task DAGs require resolving which tasks can run given which tasks have completed. Naive implementations poll for completion; better implementations maintain a dependency counter per task and decrement it when upstream tasks finish, unblocking tasks whose counter reaches zero. Open Multi-Agent's `TaskQueue` does this, with cascade failure — if a required upstream task fails, all downstream tasks fail immediately rather than waiting. [Source](../raw/repos/jackchen-me-open-multi-agent.md)

### Agent Health and Loop Detection

Long-running agents can get stuck. Open Multi-Agent's `loopDetection` config on `AgentConfig` detects agents repeating identical tool calls or text output, with configurable response: warn, terminate, or invoke a callback. CORAL uses heartbeat-based interventions for asynchronous agents. Both address the same failure mode: an agent that isn't progressing but isn't erroring either. See also [Loop Detection](../concepts/loop-detection.md).

### Human-in-the-Loop Checkpoints

[Human-in-the-Loop](../concepts/human-in-the-loop.md) integration in multi-agent systems typically occurs at task batch boundaries. Open Multi-Agent's `onApproval` callback fires after each batch of parallel tasks completes, giving a human the opportunity to abort before the next batch begins. This is coarser-grained than per-task approval but avoids the latency of blocking each individual task.

## Tool Access and Isolation

Agents in a team often need different capabilities. Giving every agent `bash` access when only one agent needs it violates least-privilege and creates risk.

Open Multi-Agent's tool access model layers presets (readonly, readwrite, full), allowlists, and denylists with an explicit resolution order: preset → allowlist → denylist → framework safety rails. [Source](../raw/repos/jackchen-me-open-multi-agent.md)

CORAL uses isolated workspaces per agent — each agent's file system operations are sandboxed — plus evaluator separation, ensuring the agent evaluating solutions is distinct from the agent generating them. This separation prevents reward hacking where a generating agent learns to satisfy its own evaluator rather than the ground truth objective. [Source](../raw/papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md)

## Observability

Multi-agent systems are harder to debug than single agents because errors compound across agent boundaries. The same wrong output that would produce one wrong answer in a single agent can propagate through a DAG and corrupt multiple downstream results before anyone notices.

Structured tracing across agent boundaries is the primary tool. Open Multi-Agent's `onTrace` callback emits structured spans for every LLM call, tool execution, task, and agent run, with a shared `runId` for correlation across the entire team's execution. Zero overhead when not subscribed. See [Observability](../concepts/observability.md) and [Execution Traces](../concepts/execution-traces.md).

At scale, per-agent traces need to be correlated against the task DAG to identify which failure caused which downstream cascades. This is an unsolved tooling problem — most observability products handle single agents well but don't natively model task dependency graphs.

## Failure Modes

**Coordinator over-decomposes**: A coordinator given a simple goal breaks it into 15 subtasks, burning tokens on coordination overhead that exceeds the cost of the task itself. Mitigations: constrain coordinator prompts with task count limits, benchmark coordinator decomposition quality on representative goals before deploying.

**Hallucination propagation**: Agent A outputs a plausible-sounding but incorrect fact. Agent B treats it as ground truth and builds on it. By the time a reviewer agent sees the combined output, the error is load-bearing and hard to isolate. Without trust-level filtering on shared memory, there's no structural defense. The @BranaRakic proposal addresses this, but most current frameworks don't implement trust levels.

**Deadlock via circular dependencies**: In peer-to-peer collaboration without a central planner, Agent A waits for Agent B's output while Agent B waits for Agent A's. Hierarchical systems with explicit DAGs avoid this; flat systems need cycle detection.

**Context explosion in aggregation**: When a synthesis agent receives the combined output of five parallel agents, the context may exceed its window. [Context Compression](../concepts/context-compression.md) or [Progressive Disclosure](../concepts/progressive-disclosure.md) strategies help, but require anticipating which information the synthesis agent actually needs.

## When Not to Use It

Multi-agent collaboration adds coordination overhead that only pays off when the task genuinely benefits from parallelism or specialization.

Don't use it when the task is sequential by nature — if each step requires the previous step's output to proceed, parallelism doesn't help and you've added a coordinator's latency and token cost for nothing.

Don't use it when the context required for coordination exceeds what agents can hold. If the task DAG requires passing large documents between agents, you may spend more on context than you save on specialization.

Don't use it when correctness requirements demand tight coupling. Multi-agent systems with shared memory require careful attention to write ordering, race conditions, and hallucination propagation. If you need deterministic, auditable outputs, a single-agent pipeline with explicit checkpoints is easier to verify.

Don't use it when you're prototyping. The debugging overhead of multi-agent systems is substantial. Start with a single agent, identify the bottlenecks, then introduce agents to address specific constraints.

## Unresolved Questions

**Optimal decomposition**: How does a coordinator decide the right granularity for task decomposition? Current implementations rely on the LLM's judgment, which is prompt-sensitive and not well-characterized. There's no established benchmark for coordinator decomposition quality.

**Cost accounting at scale**: Token usage accumulates across all agents, plus coordinator calls, plus retries. Open Multi-Agent tracks `totalTokenUsage` per run, but there's no standard for multi-agent cost attribution — which agent's tokens caused which output quality.

**Conflict resolution in shared memory**: When two agents write conflicting facts to shared memory, which wins? Current systems typically use last-write-wins or ignore the conflict. The trust-level approach from @BranaRakic requires consensus mechanisms that add latency.

**Model heterogeneity and capability mismatch**: A team with one Claude Sonnet agent and one small local model may produce outputs where the small model's failures corrupt the larger model's work. Capability-aware task assignment is not a solved problem.

## Related Concepts and Projects

- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — The broader field this pattern operates within
- [Context Engineering](../concepts/context-engineering.md) — Managing what each agent knows at each point
- [Agent Memory](../concepts/agent-memory.md) — Shared memory implementations
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — Approval checkpoints within agent pipelines
- [Loop Detection](../concepts/loop-detection.md) — Detecting stuck agents
- [Observability](../concepts/observability.md) — Tracing across agent boundaries
- [MetaGPT](../projects/metagpt.md) — Role-based multi-agent collaboration with software engineering focus
- [AutoGen](../projects/autogen.md) — Conversational multi-agent framework from Microsoft
- [CrewAI](../projects/crewai.md) — Role-based crews with hierarchical or sequential execution
- [LangGraph](../projects/langgraph.md) — Graph-based agent orchestration
- [Coral](../projects/coral.md) — Autonomous multi-agent evolution with shared persistent memory
- [Meta-Agent](../concepts/meta-agent.md) — Agents that create and manage other agents
