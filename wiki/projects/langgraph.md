---
entity_id: langgraph
type: project
bucket: agent-systems
abstract: >-
  LangGraph is a graph-based framework for building stateful, multi-actor LLM
  agent workflows with built-in support for cycles, conditional logic, and
  human-in-the-loop interrupts — differentiated by treating agent state as an
  explicit, persistent graph rather than a linear chain.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - repos/memodb-io-acontext.md
  - repos/caviraoss-openmemory.md
  - repos/langchain-ai-langgraph-reflection.md
  - repos/mem0ai-mem0.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/caviraoss-openmemory.md
related:
  - rag
  - openai
  - episodic-memory
  - semantic-memory
  - langchain
  - mem0
  - claude
  - mcp
  - vector-database
  - letta
  - letta
last_compiled: '2026-04-07T11:42:24.224Z'
---
# LangGraph

## What It Does

LangGraph is a Python and JavaScript library from [LangChain](../projects/langchain.md) for building agent applications as directed graphs. Each node in the graph is a function or LLM call; edges encode transitions between nodes, including conditional branches and cycles. State passes between nodes through a typed schema that persists across the graph's execution.

The core architectural bet: agent workflows are fundamentally stateful graphs with cycles, not chains. Where LangChain's LCEL treats execution as a DAG, LangGraph allows loops, which matters for agents that retry, reflect, or wait for human input. This design handles patterns that break pipeline-style frameworks: a retriever that re-queries when evidence is insufficient, a code generator that loops on test failures, or a multi-agent system where a supervisor routes work back to a subagent.

## Core Mechanism

### State as a Typed Schema

Every graph defines a state object, typically a `TypedDict`, that all nodes read from and write to. Nodes return partial updates, not full state replacements. The framework merges updates using a reducer function per field — the default reducer overwrites, but list fields can append. This means the full conversation history, tool call results, and any intermediate data all live in one inspectable object at every step.

```python
from langgraph.graph import StateGraph, MessagesState

def call_llm(state: MessagesState):
    response = model.invoke(state["messages"])
    return {"messages": [response]}

graph = StateGraph(MessagesState)
graph.add_node("llm", call_llm)
graph.add_edge(START, "llm")
graph.add_edge("llm", END)
app = graph.compile()
```

### Conditional Edges and Cycles

Cycles come from `add_conditional_edges`, where a router function inspects state and returns the name of the next node. The [agentic RAG article](../articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md) notes that LangGraph's own official agentic RAG tutorial shipped with an infinite retrieval loop bug that required adding a `rewrite_count` cap. That failure mode is inherent to the architecture: cycles only stop when an edge routes to `END`, so every conditional loop needs an explicit stopping condition.

### Checkpointing and Persistence

LangGraph's persistence model uses a `Checkpointer` that serializes graph state after every node execution. The default checkpointer is in-memory; production deployments use `SqliteSaver` or `PostgresSaver`. Each checkpoint carries a `thread_id` and a `checkpoint_id`, enabling time-travel debugging (resume from any prior checkpoint) and human-in-the-loop interrupts (pause before a node, wait for approval, then resume).

The checkpoint store is also the integration point for external memory systems. [Mem0](../projects/mem0.md) documents a LangGraph integration; the [OpenMemory deep dive](../raw/deep/repos/caviraoss-openmemory.md) shows `src/server/routes/langgraph.ts` exposing store/retrieve/context/reflection endpoints specifically for LangGraph agents.

### Multi-Actor Patterns

LangGraph supports multiple actors through subgraphs. A supervisor node calls worker subgraphs as tools, routes their outputs, and decides whether to call another worker or return to the user. Each subgraph is itself a compiled graph with its own state schema. Shared state lives in the parent graph; private state lives in each subgraph. This mirrors how a human team works: shared project state, but each person has their own working memory.

[Model Context Protocol](../concepts/mcp.md) tools plug in as standard LangGraph tools — any MCP server becomes a callable node, which means LangGraph agents can invoke file systems, external APIs, and other agents through a uniform interface.

### LangGraph Platform (LangSmith Integration)

Beyond the open-source library, LangChain offers LangGraph Platform: a hosted runtime for deploying LangGraph agents with built-in streaming, background task execution, and a Studio UI for visual graph inspection. LangSmith traces every node execution with inputs, outputs, and latency. This observability layer matters because agentic graphs fail in ways that pipeline logs don't expose — a node that runs 12 times instead of 3 is invisible without per-node traces.

## Key Numbers

- **GitHub stars:** ~14,000 (as of early 2025, self-reported via repository) — not independently audited
- **LOCOMO benchmark:** Mem0's research paper reports +26% accuracy over OpenAI Memory for agents using their memory layer on top of LangGraph-style agent loops — this is Mem0's own benchmark, not independently reproduced
- **Agentic RAG latency:** The [agentic RAG failure modes article](../articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md) cites production teams reporting 40% cost reduction and 35% latency improvement from intent-based routing that routes simple queries away from full agentic loops — self-reported by unnamed teams

## Strengths

**Cycles and conditional logic** are the primary reason to pick LangGraph over simpler orchestrators. Workflows where an agent needs to retry, self-critique, or wait for external input require a graph with cycles. The [LangGraph Reflection pattern](../articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md) — a critique agent that evaluates output and loops back if issues are found — is a native pattern here, whereas it requires awkward workarounds in chain-based frameworks.

**Stateful persistence** across sessions is handled at the infrastructure level. The checkpointer means you don't build session management — you get it. For agents that need to resume after a human approval step, this is significant engineering removed from the application layer.

**Debugging surface** is wider than most alternatives. State is inspectable at every node boundary. Time-travel debugging via checkpoint IDs lets developers replay executions with modified state. LangSmith traces show exactly which node ran how many times and what it returned.

**Ecosystem depth** matters for practical integration. LangChain's 600+ integrations (LLM providers, vector stores, tools) are available as LangGraph nodes without adaptation. If your stack already uses LangChain components, the migration surface is small.

## Critical Limitations

**Concrete failure mode — retrieval thrash in cycles:** LangGraph's own reference implementation for agentic RAG shipped with an infinite loop bug. The conditional edge that routes between "retrieve more" and "answer" fired a loop without a hard exit condition. The fix required adding a `rewrite_count` variable to state and checking it at the routing function. This is not a one-off bug — it reflects the fundamental challenge of conditional cycles: the stopping condition is always the developer's responsibility, and there is no framework-level default that prevents infinite loops. Every cycle in a LangGraph application is a potential runaway without explicit budgets.

**Unspoken infrastructure assumption:** The checkpointer is not optional for stateful agents in practice. In-memory checkpoints vanish on process restart, which means any agent designed for multi-session persistence requires a database. `PostgresSaver` needs a PostgreSQL instance; `SqliteSaver` works locally but doesn't scale horizontally. Teams deploying LangGraph at scale inherit a database infrastructure requirement that the quickstart docs don't emphasize. The LangGraph Platform hosted offering sidesteps this, but adds vendor dependency.

## When NOT to Use LangGraph

**Simple RAG pipelines** don't need a graph. If your workflow is retrieve-once, generate-once, the overhead of defining a state schema, compiling a graph, and managing checkpoints adds complexity with no benefit. LangChain's LCEL or direct LLM API calls are simpler and faster to iterate on.

**High-throughput stateless inference** is a poor fit. LangGraph's checkpointing writes to a database after every node. For applications serving thousands of short, stateless requests per minute, this adds latency and database load. Use it for complex, long-running agent sessions — not as a general LLM request handler.

**Teams new to agent orchestration** who need a working system quickly may find the graph abstraction steep. Defining state schemas, wiring edges, handling conditional routing, and setting up checkpointing all require understanding the framework's mental model before writing application logic. [CrewAI](../projects/crewai.md) and similar frameworks trade flexibility for faster initial setup.

**Latency-sensitive applications** should route simple queries away from agentic loops entirely. The [failure modes article](../articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md) documents that intent-based routing — classifying query complexity before entering the agent loop — produces 35% latency improvements. If most of your queries are simple, wrapping them in LangGraph's graph execution overhead is unnecessary.

## Unresolved Questions

**Cost at scale for multi-agent graphs** is underspecified. Multi-actor graphs with supervisor/worker patterns can generate dozens of LLM calls per user request. The framework provides no built-in token budget enforcement — that logic lives in application code. Teams hitting the $50-200 single-run cost spikes documented by production users built their own caps after the fact.

**Conflict resolution in shared state** across concurrent subgraphs is not clearly specified in the core documentation. When two worker agents update the same state field simultaneously, the reducer function determines which value wins. For list fields with append reducers, both values persist; for scalar fields with overwrite reducers, the last write wins. In parallel subgraph execution, "last write" is nondeterministic. The documentation doesn't address this concurrency hazard directly.

**Long-term memory integration** is left to the developer. LangGraph provides short-term state (within a session via state schema) and medium-term persistence (across sessions via checkpointing), but no native long-term memory system. Teams that need agents to remember across hundreds of sessions must integrate external systems like [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), or [Letta](../projects/letta.md) manually. The checkpointer is not a substitute for a memory system — it stores full state snapshots, not distilled knowledge.

**Governance of the LangGraph Platform** vs. the open-source library is blurring. Some features (Studio UI, deployment infrastructure, certain streaming capabilities) are only available in the hosted platform. The boundary between what's free/open and what requires a LangChain commercial agreement is not clearly documented in the library's own README.

## Alternatives with Selection Guidance

**Use [Letta](../projects/letta.md) when** your agents need built-in persistent memory across sessions, structured memory types (core, archival, recall), and don't want to build memory integration from scratch. Letta's memory-first architecture handles what LangGraph leaves to the developer. Tradeoff: less flexibility in graph topology.

**Use [CrewAI](../projects/crewai.md) when** you need multi-agent role assignment and a team-based mental model (researcher, writer, reviewer) rather than graph topology. Faster to get a working multi-agent system; harder to customize control flow. LangGraph gives more control; CrewAI gives faster scaffolding.

**Use [DSPy](../projects/dspy.md) when** the problem is optimizing prompts and reasoning chains, not orchestrating complex multi-step workflows. DSPy compiles and optimizes LLM programs; LangGraph orchestrates them. They address different layers of the stack.

**Use direct LLM APIs or LangChain LCEL when** the workflow is a DAG (no cycles needed) and the team values simplicity over features. Every abstraction layer added to LLM applications is a debugging surface. If you don't need cycles or stateful persistence, don't pay for them.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md) — The retrieval pattern that LangGraph's agentic loops extend and complicate
- [Agentic RAG](../concepts/agentic-rag.md) — The specific pattern where LangGraph's cycle support enables retrieval loops
- [Agent Memory](../concepts/agent-memory.md) — What LangGraph's checkpointer provides at the session level, but not the long-term layer
- [Task Decomposition](../concepts/task-decomposition.md) — The supervisor/worker subgraph pattern in LangGraph
- [Model Context Protocol](../concepts/mcp.md) — Tool protocol that plugs into LangGraph as standard callable nodes
- [Episodic Memory](../concepts/episodic-memory.md) and [Semantic Memory](../concepts/semantic-memory.md) — Memory types that external systems like Mem0 add on top of LangGraph's base persistence
