---
entity_id: langgraph
type: project
bucket: agent-architecture
abstract: >-
  LangGraph is LangChain's graph-based agent orchestration library enabling
  stateful, cyclical workflows with first-class checkpointing, human-in-the-loop
  interrupts, and multi-agent coordination — differentiating from LangChain's
  deprecated AgentExecutor by making control flow explicit.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - repos/memodb-io-acontext.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - repos/mem0ai-mem0.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
related:
  - openai
  - agent-memory
  - claude-code
  - retrieval-augmented-generation
  - context-engineering
  - react
  - langchain
  - agent-memory
last_compiled: '2026-04-08T02:51:43.945Z'
---
# LangGraph

## What It Does

LangGraph is a Python and JavaScript library for building stateful agent workflows as explicit directed graphs. Nodes represent computation steps (LLM calls, tool execution, routing logic). Edges represent transitions between steps, including conditional branching. Crucially, the graph can contain cycles — a node can route back to an earlier node, enabling the iterative Thought-Action-Observation loop that [ReAct](../concepts/react.md) requires.

LangGraph was created by LangChain as a direct replacement for `AgentExecutor`, which was deprecated in LangChain v0.2. `AgentExecutor` was a black box: hard to extend, impossible to inspect mid-run, and fundamentally unable to support multi-agent coordination. LangGraph makes the control flow visible and modifiable.

The library sits within the broader [LangChain](../projects/langchain.md) ecosystem but can be used independently. Its design acknowledges a core problem stated explicitly in LangChain's own deprecation docs: when agents fail in production, you need to see exactly where and why — and a black-box executor prevents that.

## Core Mechanism

### State as Typed Dictionaries with Reducers

The fundamental data structure is a `StateGraph` — a graph where every node receives and returns a typed `TypedDict` called the state. When multiple nodes write to the same state key, a reducer function merges the updates. The default reducer replaces values; the `add_messages` reducer appends to message lists. This append-by-default behavior for message history is what enables conversation memory without explicit management.

```python
from langgraph.graph import StateGraph, MessagesState

graph = StateGraph(MessagesState)
graph.add_node("llm_call", call_model)
graph.add_node("tool_node", execute_tools)
graph.add_conditional_edges("llm_call", route_tools)
graph.add_edge("tool_node", "llm_call")
```

The compiled graph is a `CompiledGraph` object that exposes `.invoke()`, `.stream()`, and `.astream()` interfaces.

### Checkpointing at Super-Step Boundaries

LangGraph checkpoints state after every "super-step" (a full round of node executions). A checkpointer backend — `MemorySaver` for in-process development, `PostgresSaver` or `RedisSaver` for production — persists these snapshots. This enables three things: resuming a run after interruption, time-travel debugging (restoring any prior checkpoint and re-running from that point), and human-in-the-loop patterns where the graph pauses for user approval before continuing.

The `thread_id` concept separates concurrent runs. Each thread maintains its own checkpoint history, making multi-user deployments possible without state leakage.

### Conditional Edges and the Two-Node Pattern

The canonical agentic loop in LangGraph uses exactly two nodes and one conditional edge:

1. `llm_call` — assembles context, calls the model, returns the response
2. `tool_node` — executes tool calls from the model response

The conditional edge after `llm_call` inspects the last message: if it contains tool calls, route to `tool_node`; otherwise, route to `END`. This is the entire ReAct loop, made explicit. LangGraph's own tutorial documentation previously shipped this loop without a `rewrite_count` cap, which produced infinite retrieval loops in [Agentic RAG](../concepts/retrieval-augmented-generation.md) setups — a concrete production failure noted in the [TDS agentic RAG piece](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md).

### Multi-Agent Patterns

LangGraph supports three multi-agent topologies:

- **Subgraphs**: a `StateGraph` nested inside another graph node, with its own internal state
- **Agents as tools**: a specialist graph is wrapped as a tool callable by the supervisor agent
- **Handoffs**: full control transfer via `Command(goto="other_agent")`, changing which agent owns the current execution thread

LangGraph Platform (the hosted offering) adds persistent storage, streaming APIs, and a Studio UI for visualizing graph execution in real time.

## Key Numbers

| Metric | Value | Source |
|---|---|---|
| GitHub stars (langchain-ai/langgraph) | ~15,000+ | Self-reported on GitHub |
| LangChain ecosystem (umbrella) | ~100,000+ stars | Self-reported |
| TerminalBench ranking improvement | Top 5 from outside top 30 | Self-reported by LangChain |

The TerminalBench claim — that changing only harness infrastructure while keeping the same model moved LangChain from outside the top 30 to rank 5 — is self-reported and not independently validated. Treat it as directionally interesting, not a controlled benchmark. The claim appears in LangChain's own content and is cited in [Akshay Pachaar's agent harness analysis](../raw/tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md).

## Strengths

**Explicit control flow**: the graph structure makes branching and looping visible in code, not hidden in framework internals. When a run fails at node 7 of 12, you know it.

**Checkpointing and time-travel**: the ability to restore any prior state snapshot and re-run is rare among agent frameworks. This makes debugging multi-step agent failures tractable rather than requiring full reruns.

**Human-in-the-loop interrupts**: `interrupt_before` and `interrupt_after` parameters on edges pause execution at defined points. The graph serializes its state, waits for external input (user approval, form submission, webhook), then resumes. This is a first-class design pattern, not an afterthought.

**Multi-agent coordination**: subgraphs and handoffs enable genuine separation of agent concerns. A supervisor can route to specialist agents without those specialists needing to know about each other.

**[Context Engineering](../concepts/context-engineering.md) composability**: state reducers and checkpointing provide the plumbing for memory systems. [Mem0](../projects/mem0.md), for example, lists LangGraph as a supported integration for building customer bots with persistent memory.

## Critical Limitations

**Concrete failure mode — infinite loops without hard caps**: LangGraph's flexibility in allowing cycles means nothing prevents an agent from looping forever if the stopping condition is weak. The official agentic RAG tutorial shipped with exactly this bug — an infinite retrieval loop fixed only after adding a `rewrite_count` cap. In production, retrieval thrash (the agent re-querying without converging) requires explicit iteration budgets in application code, not framework defaults. LangGraph provides the mechanism to implement caps but enforces nothing by default.

**Unspoken infrastructure assumption**: checkpointing for anything beyond local development requires you to deploy and manage a persistent backend (Postgres, Redis). `MemorySaver` lives in-process and vanishes when the process dies. Teams building production systems must provision, connect, and maintain this backend independently. The documentation covers this but frames it as a minor configuration step rather than a deployment dependency.

## When NOT to Use LangGraph

**Simple single-pass pipelines**: if the agent retrieves context once and generates a response — no loops, no tool calls, no branching — LangGraph adds graph modeling overhead with no benefit. Plain LangChain expression language or a direct API call is faster to write and easier to reason about.

**Teams without Python/JavaScript expertise**: LangGraph's graph DSL is Python-native and reasonably idiomatic, but it requires understanding reducers, state typing, and edge routing before anything runs correctly. Teams expecting a low-code or configuration-driven experience should look elsewhere.

**Latency-critical paths with many nodes**: each super-step involves serialization, reducer execution, and optional checkpoint I/O. For high-throughput, low-latency inference paths where every millisecond matters, the overhead accumulates.

**When you need model-agnostic deployment without LangChain dependencies**: LangGraph pulls in LangChain as a dependency. If you're building a framework-agnostic harness or using a non-LangChain model client, [OpenAI Agents SDK](../projects/openai-agents-sdk.md) or [AutoGen](../projects/autogen.md) may be cleaner choices.

## Unresolved Questions

**Cost at scale with LangGraph Platform**: the hosted platform pricing is opaque for high-volume production workloads. Checkpoint storage, streaming, and Studio usage costs are not publicly documented at the granularity needed to model total cost for an agent processing thousands of tasks per day.

**Conflict resolution in parallel subgraphs**: when multiple subgraphs write to overlapping state keys concurrently, the reducer determines merge behavior. The documentation specifies default reducers but does not fully address deadlock scenarios or ordering guarantees when concurrent branches produce conflicting writes to non-list state keys.

**Long-term maintenance of deprecated primitives**: LangGraph replaced `AgentExecutor` but the broader LangChain ecosystem has a history of deprecated-but-not-removed APIs. How long checkpointer APIs, edge routing patterns, and state schema conventions remain stable is unclear from public roadmap documents.

**Multi-tenant isolation guarantees**: `thread_id` separates state per conversation, but the isolation model for LangGraph Platform (shared infrastructure) is not publicly documented. Self-hosted deployments require implementing isolation at the Postgres/Redis level independently.

## Alternatives

| Alternative | Use When |
|---|---|
| [OpenAI Agents SDK](../projects/openai-agents-sdk.md) | You want code-first orchestration without a graph DSL, are already on the OpenAI stack, and prefer Python-native control flow over explicit graph modeling |
| [CrewAI](../projects/crewai.md) | You're building role-based multi-agent crews where agents have defined personas and tasks, and prefer declarative agent definitions over graph wiring |
| [AutoGen](../projects/autogen.md) | You need conversation-driven orchestration with flexible group chat patterns or are building research/evaluation systems that benefit from AutoGen's trajectory logging |
| [Letta](../projects/letta.md) | Memory persistence is the primary concern and you want a framework designed around [MemGPT](../projects/memgpt.md)-style memory management rather than graph control flow |
| Direct API calls | The task is a single-pass LLM call with no loops, branching, or state persistence requirements |

## Relationships

LangGraph implements [ReAct](../concepts/react.md) as a graph pattern and provides infrastructure for [Agent Memory](../concepts/agent-memory.md) via checkpointing. It is a natural host for [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines and [Human-in-the-Loop](../concepts/human-in-the-loop.md) workflows. It belongs to the [LangChain](../projects/langchain.md) ecosystem and is used as an integration target by [Mem0](../projects/mem0.md). Its explicit graph structure addresses the [Context Engineering](../concepts/context-engineering.md) and [Context Management](../concepts/context-management.md) problems that black-box agent executors obscure. The [Multi-Agent Systems](../concepts/multi-agent-systems.md) patterns it supports — subgraphs, handoffs, agents-as-tools — cover the main coordination topologies the field has converged on.


## Related

- [OpenAI](../projects/openai.md) — part_of (0.6)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.6)
- [Claude Code](../projects/claude-code.md) — alternative_to (0.5)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — implements (0.6)
- [Context Engineering](../concepts/context-engineering.md) — implements (0.6)
- [ReAct](../concepts/react.md) — implements (0.6)
- [LangChain](../projects/langchain.md) — part_of (0.8)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.6)
