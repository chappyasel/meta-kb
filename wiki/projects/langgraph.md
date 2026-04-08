---
entity_id: langgraph
type: project
bucket: agent-architecture
abstract: >-
  LangGraph is a Python/JS library for building stateful LLM agent workflows as
  explicit directed graphs with cycles, persistence, and interruption —
  differentiating itself from linear chain frameworks by treating control flow
  as a first-class programming primitive.
sources:
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - repos/mem0ai-mem0.md
  - repos/memodb-io-acontext.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
related:
  - retrieval-augmented-generation
  - openai
  - context-engineering
  - agent-memory
  - claude-code
last_compiled: '2026-04-08T23:08:41.762Z'
---
# LangGraph

## What It Does

LangGraph is a graph-based orchestration framework for LLM agents, built by the [LangChain](../projects/langchain.md) team. Where LangChain's original `AgentExecutor` treated agent execution as an opaque loop, LangGraph exposes control flow explicitly: you define nodes (Python functions or LLM calls), edges (transitions), and conditional edges (routing logic), then compile them into a runnable graph. The compiled graph manages state, handles interruptions, and supports full checkpointing at each step boundary.

The core architectural bet: make the agent's decision structure visible and editable rather than hiding it inside a framework abstraction. A developer building a RAG agent doesn't configure options on a generic executor — they write nodes called `retrieve`, `grade_documents`, `generate`, `transform_query` and wire them together with explicit conditional edges. Every branching decision is code they wrote.

LangGraph also introduced the infrastructure for [multi-agent systems](../concepts/multi-agent-systems.md): one graph can spawn subgraphs, pass state between agents via shared channels, or implement handoff patterns where one agent transfers control to a specialist.

## Core Mechanism

**State as typed dictionary.** Each graph operates on a `StateGraph` where state is a typed `TypedDict`. Nodes receive the current state, return partial updates, and reducers merge those updates back. The default reducer for list fields is append-only; developers can override with custom merge logic. This means two parallel nodes can both write to the same field without a race condition — the reducer handles the merge.

**Graph compilation.** `graph.compile()` validates the graph structure, wires interruption points, and attaches a checkpointer. The compiled object is a `CompiledGraph` implementing the `Runnable` interface, so it composes with any other LangChain component.

**Checkpointing at super-step boundaries.** After each complete round of node execution (a "super-step"), LangGraph serializes the full state to the configured checkpointer — `MemorySaver` for in-process testing, `SqliteSaver`/`PostgresSaver` for persistence across restarts. This enables three things: resume after failure without re-running completed steps, time-travel debugging (rewind to any checkpoint and re-run from there), and [human-in-the-loop](../concepts/human-in-the-loop.md) patterns where execution pauses for approval before continuing.

**Interruptions.** `compile(interrupt_before=["node_name"])` or `interrupt_after` causes the graph to pause execution at that node, serialize state, and return control to the caller. The caller can inspect state, modify it, and call `graph.invoke(None, config)` to resume from exactly that point. This is the mechanism [Claude Code](../projects/claude-code.md) and similar tools use to ask users to confirm destructive operations mid-workflow.

**Conditional edges.** A conditional edge is a Python function that takes state and returns a string node name (or `END`). This is where the actual routing logic lives. The [ReAct](../concepts/react.md) pattern in LangGraph is typically just: if the LLM's output contains tool calls, route to `tool_node`; if not, route to `END`.

**Multi-agent primitives.** LangGraph supports two patterns: agents-as-nodes (subgraphs embedded as nodes in a parent graph, sharing a parent's state channel), and handoffs (an agent transfers full control to another agent by returning a special routing value). The `langgraph-supervisor` package implements a supervisor agent that routes between specialist subagents.

## Key Numbers

- GitHub stars: ~15,000+ (as of early 2025; self-reported by LangChain team in various posts, not independently audited)
- LangChain's own benchmark test: changing only the harness wrapping the same model moved them from outside the top 30 to rank 5 on TerminalBench 2.0 (self-reported, cited in [agent harness analysis](../raw/tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md))
- The official agentic RAG tutorial shipped with an infinite retrieval loop bug that required a `rewrite_count` cap to fix — documented in the LangGraph GitHub pull requests, confirming that even reference implementations fall into retrieval thrash

## Strengths

**Explicit control flow that survives debugging.** When an agent misbehaves, you have a graph to inspect. Every branch is a named node with a Python function you can test in isolation. This is the right property for production systems where "the model decided to loop forever" needs a root cause.

**Checkpointing as a first-class feature.** The persistence model — attach a checkpointer, get resumability and time-travel for free — is genuinely well-designed. It maps naturally onto the problems that break production agents: partial failures mid-workflow, human approval gates, long-running tasks that span multiple sessions.

**[Human-in-the-loop](../concepts/human-in-the-loop.md) patterns.** The interrupt mechanism is one of the cleanest implementations of human-in-the-loop in any agent framework. Pause, inspect, edit state, resume is a first-class workflow rather than a workaround.

**Multi-agent composition.** The subgraph embedding model is more principled than most frameworks. State channels provide a typed contract between parent and child agents. This matters for [multi-agent collaboration](../concepts/multi-agent-collaboration.md) patterns where you need predictable data flow.

**LangGraph Platform.** The hosted deployment offering (LangGraph Cloud, now LangGraph Platform) handles the infrastructure for persistent agents: built-in checkpointing, streaming, long-running task queues, and a Studio UI for visual graph debugging. Useful if you're already in the LangChain ecosystem and don't want to self-manage Postgres checkpointing.

## Critical Limitations

**Concrete failure mode — retrieval thrash with no budgets.** LangGraph's graph model makes cycles easy to build. A standard agentic RAG graph routes back to the retriever when the grader node rejects chunks. Nothing in the framework prevents this from looping indefinitely. The official tutorial had exactly this bug. You have to add the `rewrite_count` cap yourself, and it's not surfaced as a pattern to follow — it was discovered and fixed after the fact. Production deployments without explicit iteration budgets will loop until the token limit or API timeout.

**Unspoken infrastructure assumption.** Persistent agents require you to run and maintain a PostgreSQL instance (or pay for LangGraph Platform). The `MemorySaver` works in demos but dies with the process. The `SqliteSaver` works for single-process deployments but doesn't support concurrent workers. If you're building a production multi-tenant application, you need Postgres, connection pooling, and a migration strategy for schema changes when LangGraph updates its checkpoint format. None of this is surfaced prominently in the getting-started documentation.

## When NOT to Use It

**Simple, single-pass pipelines.** If your agent retrieves once and answers, LangGraph adds graph definition overhead with no benefit. A LangChain LCEL chain or a direct API call is simpler to write, test, and maintain.

**Teams unfamiliar with LangChain.** LangGraph's abstractions assume familiarity with LangChain's `Runnable` interface, `BaseMessage` types, and tool calling conventions. Developers coming from a clean-Python background often find it faster to build a direct `while` loop around the OpenAI or Anthropic SDK than to learn LangGraph's graph DSL first.

**Latency-critical applications.** Each super-step involves serialization to the checkpointer. For agents where every millisecond matters (real-time voice, sub-second response requirements), the checkpointing overhead is non-trivial and hard to eliminate without losing the persistence guarantees.

**When you need fine-grained harness control.** LangGraph's graph model works well for discrete-node workflows but becomes awkward for agents that need dynamic tool selection at runtime, variable-length parallel fan-outs, or complex state merge logic. The [OpenAI Agents SDK](../projects/openai-agents-sdk.md)'s code-first approach — workflow logic in native Python — gives more flexibility for these cases.

## Unresolved Questions

**Checkpoint schema versioning.** LangGraph's checkpoint format has changed across versions. When you upgrade LangGraph, existing checkpoints in Postgres may be incompatible with the new schema. The migration path is underdocumented. For long-running persistent agents in production, this is a real operational risk.

**Cost at scale.** LangGraph Platform pricing is not public for high-volume deployments. The self-hosted path requires Postgres at scale, which is manageable, but the hosted path introduces vendor dependency at a layer (checkpoint storage + API) that's hard to swap out later.

**Multi-agent state conflict resolution.** When two subagents write to the same state channel, the reducer controls merging. For simple fields (last-write-wins, append-only lists), this is clear. For complex nested objects or conflicting tool outputs, the reducer logic is the developer's problem, and LangGraph provides no guidance on common conflict patterns.

**Tight coupling with post-trained models.** The [agent harness analysis](../raw/tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md) notes that models post-trained with a specific harness in the loop degrade when the harness changes. LangGraph's tool calling patterns and state conventions may be baked into the behavior of models fine-tuned against LangGraph-based agents. Swapping frameworks mid-project may degrade performance for non-obvious reasons.

## Alternatives

**[OpenAI Agents SDK](../projects/openai-agents-sdk.md)** — Use when you want code-first orchestration (native Python `if/else` instead of graph edges), are building on OpenAI models, and want simpler abstractions at the cost of less explicit state management.

**[CrewAI](../projects/crewai.md)** — Use when your use case maps cleanly to role-based agent teams with defined tasks. CrewAI's role/goal/backstory model is higher-level than LangGraph's graph nodes, which speeds up prototyping for common multi-agent patterns at the cost of control.

**[AutoGen](../projects/autogen.md)** — Use when you need conversation-driven multi-agent orchestration where agents communicate via messages and the orchestration pattern is dynamic. LangGraph has more explicit control flow; AutoGen handles more open-ended agent-to-agent negotiation.

**Direct SDK + custom loop** — Use when your agent logic is straightforward enough that a 50-line `while` loop around the Anthropic or OpenAI SDK is more readable than LangGraph's graph definition. The [agent harness analysis](../raw/tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md) notes that both Anthropic and OpenAI describe their production harnesses as fundamentally "dumb loops" — the complexity is in the components (memory, context management, tools), not the loop itself.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — LangGraph is commonly used to build agentic RAG workflows with self-correction loops
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — LangGraph's interrupt mechanism is its cleanest implementation in any current framework
- [Agent Memory](../concepts/agent-memory.md) — LangGraph's `Store` provides namespace-organized persistent memory across sessions
- [Context Engineering](../concepts/context-engineering.md) — LangGraph's state management is a context engineering problem; the checkpointer determines what survives across turns
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — LangGraph's subgraph and handoff primitives are the structural foundation for most LangChain-ecosystem multi-agent deployments
- [Agentic RAG](../concepts/agentic-rag.md) — The canonical LangGraph agentic RAG pattern (retrieve, grade, transform, generate) is where the retrieval thrash failure mode is most likely to appear
