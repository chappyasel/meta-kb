---
entity_id: langgraph
type: project
bucket: agent-systems
abstract: >-
  LangGraph is a graph-based agent orchestration library from LangChain for
  building stateful, cyclical multi-agent workflows with persistent state and
  human-in-the-loop controls.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - repos/memodb-io-acontext.md
  - repos/langchain-ai-langgraph-reflection.md
  - repos/mem0ai-mem0.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - deep/repos/caviraoss-openmemory.md
related:
  - rag
  - episodic-memory
  - self-improving-agents
last_compiled: '2026-04-06T02:06:01.144Z'
---
# LangGraph

## What It Does

LangGraph lets you build stateful agent workflows as directed graphs where nodes are Python or JavaScript functions (tools, LLM calls, decision logic) and edges are conditional transitions between them. The critical capability: it supports **cycles**, meaning an agent can call a tool, evaluate the result, and loop back to the same node. Most linear pipeline frameworks cannot express this without hacks. LangGraph is built on [LangChain](../projects/langchain.md) but is architecturally distinct from it, providing low-level graph primitives rather than high-level chains.

The framework has become the dominant choice for production multi-agent systems where you need durable execution, human review checkpoints, or parallel subagent coordination. [LangGraph Reflection](https://github.com/langchain-ai/langgraph-reflection) — the reference implementation for iterative self-critique loops — ships as an official pattern, and LangChain's own documentation routes users toward LangGraph for anything beyond single-pass inference.

## Core Mechanism

The fundamental abstraction is a `StateGraph`. You define a typed state schema (a Python `TypedDict` or Pydantic model), add nodes that read and write to that state, and wire them with edges.

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    iteration_count: int

graph = StateGraph(AgentState)
graph.add_node("agent", call_llm)
graph.add_node("tools", execute_tools)
graph.add_conditional_edges(
    "agent",
    should_continue,  # function returns "tools" or END
    {"tools": "tools", "end": END}
)
graph.add_edge("tools", "agent")  # the cycle
```

State updates use a reducer pattern: each node returns a partial dict, and reducers (by default, overwrite; with `Annotated[list, operator.add]`, append) merge updates into the shared state. This design lets multiple nodes modify overlapping state keys without race conditions in parallel subgraphs.

**Persistence** is implemented via checkpointers. At every node transition, LangGraph serializes the full state to a store (in-memory, SQLite, PostgreSQL via `langgraph-checkpoint-postgres`, or Redis). This enables:

- Resume after failure: if a node crashes, re-run from the last checkpoint
- Human-in-the-loop: interrupt execution, let a human modify state, resume
- Time-travel: replay from any prior checkpoint for debugging

The checkpointer interface is `get_tuple(config)` / `put(config, checkpoint, metadata)`, stored against a `thread_id` and `checkpoint_id`. The `thread_id` is how you associate a stateful conversation with a persistent user session.

**Subgraphs** compile separately and can be embedded as nodes in parent graphs. A parent graph does not see the subgraph's internal state unless explicitly passed. This is the mechanism for multi-agent hierarchies: an orchestrator graph delegates to specialist subgraphs, each with their own state schemas.

**Streaming** is first-class. `graph.stream(input, config)` yields `{"node_name": state_delta}` dicts after each node completes. `astream_events()` yields finer-grained events (LLM tokens, tool start/end) for latency-sensitive UIs.

The `langgraph-reflection` pattern wires a `Reflector` node that evaluates another node's output and routes back for revision if it finds issues, implementing the critique-loop described in [Reflexion](../concepts/reflexion.md).

## Key Numbers

**Stars**: ~12,000+ on GitHub (growing rapidly through 2025). LangChain reports LangGraph is deployed in hundreds of enterprise teams, though independent usage data is unavailable. Self-reported claim.

**Benchmarks**: LangGraph itself does not publish task benchmarks. The underlying patterns (ReAct loops, reflection) have been validated externally. The Agentic RAG failure mode analysis (from source material) notes that LangGraph's official agentic RAG tutorial had an infinite retrieval loop that required a `rewrite_count` cap — a concrete example of how the framework's cycle support can create production bugs if stopping rules are absent.

**Mem0 integration**: Mem0 reports a +26% accuracy gain over OpenAI Memory on the LoCoMo benchmark and 90% token reduction vs. full context when used as a LangGraph memory backend, though this is Mem0's self-reported result, not an independent evaluation of LangGraph itself.

## Strengths

**Explicit state over implicit context.** Every piece of state is named, typed, and inspectable. Contrast with raw LLM loops where intermediate reasoning lives only in the context window. When something breaks, you can inspect the checkpoint at the failing node.

**Cycles with conditional branching.** The `add_conditional_edges` call with a routing function is the right abstraction for agent decision-making. You can implement [ReAct](../concepts/react.md), reflection loops, and retry logic without abusing prompt engineering or manually managing recursion.

**Durable execution.** The checkpointer system means long-running workflows survive process restarts. This matters for multi-hour research agents or workflows with human review steps. Competitors like [CrewAI](../projects/crewai.md) did not have equivalent persistence primitives as of early 2025.

**Human-in-the-loop is a first-class concept.** `interrupt_before` and `interrupt_after` on node names pause execution at designated points, allowing a human to modify the state dict before resuming. This is not bolted on.

**Strong [Agent Orchestration](../concepts/agent-orchestration.md) primitives.** Parallel node execution (via `Send`), subgraph composition, and dynamic graph construction at runtime address real multi-agent coordination problems.

## Critical Limitations

**Cycle support requires explicit stopping rules, and the reference implementation got this wrong.** The LangGraph agentic RAG tutorial shipped with an infinite retrieval loop that only worked because test inputs happened to converge. In production, without a `max_iterations` guard or a "sufficient evidence" gate, the agent loops until token budget exhaustion. The framework gives you the rope; it does not stop you from hanging with it. For [Agentic RAG](../concepts/agentic-rag.md) patterns, you must budget retrieval iterations explicitly.

**Unspoken infrastructure assumption: you need a persistent checkpointer for anything stateful.** The default in-memory checkpointer loses all state on process restart. If you deploy on serverless infrastructure (Lambda, Cloud Run), you need `langgraph-checkpoint-postgres` or Redis, which adds operational overhead. Tutorials omit this. Teams that prototype locally and deploy serverless hit this wall at launch.

## When NOT to Use It

**Skip LangGraph when your workflow is a linear pipeline.** If you retrieve documents once, generate an answer, and return it, LangGraph's state machinery is overhead. Use [LangChain](../projects/langchain.md) LCEL, [LlamaIndex](../projects/llamaindex.md) workflows, or even a plain Python function.

**Skip it when your team cannot maintain graph topology.** LangGraph graphs are code. There is no visual editor for production use (LangSmith has a trace viewer, not a graph editor). Non-engineers cannot modify agent behavior without modifying Python. If your use case needs business-user-configurable workflows, a higher-level framework or a no-code platform is a better fit.

**Skip it when you need fast iteration on prompts without touching graph structure.** [DSPy](../projects/dspy.md) optimizes prompts systematically; LangGraph does not. If your primary iteration loop is "tune the LLM behavior," DSPy's compilation model is more productive.

**Skip it if you do not need cycles or persistent state.** The framework's value proposition collapses for single-pass tasks. The added complexity of state schemas, reducers, and checkpointers is not free.

## Unresolved Questions

**Conflict resolution in concurrent state writes.** When two parallel subgraph nodes write to the same state key, the reducer function merges them. For lists (append reducer), this works. For scalar values (last-write-wins), the behavior depends on execution order, which varies with async scheduling. The documentation does not specify what happens when two nodes simultaneously update a scalar with conflicting values in a parallel fan-out.

**Cost at scale with PostgreSQL checkpointing.** Every node transition writes a full state snapshot. For long-running agents with large state (accumulated tool outputs, message histories), this means large, frequent writes. There is no built-in state compression or incremental checkpointing. Teams with memory-heavy agents face either expensive storage or manual state pruning logic.

**Governance of the LangChain ecosystem dependency.** LangGraph ships inside the LangChain organization's release cycle. Breaking changes in `langchain-core` can cascade. The degree to which LangGraph's versioning is independent of LangChain's is unclear from the public roadmap.

**Multi-tenant isolation.** `thread_id` scopes state, but the checkpointer's database isolation between tenants is the caller's responsibility. There is no built-in access control on checkpoint retrieval. A misconfigured `thread_id` can expose another user's conversation state.

## Alternatives

**[CrewAI](../projects/crewai.md)** — Use when you want a role-based multi-agent abstraction with less boilerplate. CrewAI hides the graph topology behind "agents" and "tasks." You trade visibility for speed of setup. Better for teams that think in organizational metaphors rather than graph topology. Weaker persistence story.

**[Letta](../projects/letta.md)** — Use when persistent [Agent Memory](../concepts/agent-memory.md) is the primary concern and [Episodic Memory](../concepts/episodic-memory.md) across sessions matters more than workflow topology. Letta's MemGPT-style memory paging solves a different problem than LangGraph's stateful execution.

**[DSPy](../projects/dspy.md)** — Use when you need to optimize LLM behavior through automated prompt tuning rather than control flow. DSPy compiles programs; LangGraph orchestrates them.

**Raw Python with an LLM SDK** — Use for simple agents where the overhead of a framework is not justified. A `while` loop with a tool-call parser and a `max_iterations` counter handles most single-agent patterns without dependencies.

**[AutoResearch](../projects/autoresearch.md) / domain-specific frameworks** — Use when your domain has a specialized framework. LangGraph is general-purpose; for specific verticals (coding agents, research synthesis), vertical-specific tools often have better defaults.

## Related Concepts

LangGraph implements [Retrieval-Augmented Generation](../concepts/rag.md) workflows through its agentic RAG patterns, where retrieval nodes can loop based on sufficiency evaluation. Its persistence layer enables [Episodic Memory](../concepts/episodic-memory.md) across sessions via thread-scoped checkpoints. The reflection loop pattern (critique agent → revision → re-evaluation) is a direct implementation of [Self-Improving Agents](../concepts/self-improving-agents.md) within a bounded execution context. The conditional edge routing implements [ReAct](../concepts/react.md)-style plan-act-observe cycles, and the subgraph composition model addresses [Agent Orchestration](../concepts/agent-orchestration.md) for multi-agent hierarchies. The [Task Decomposition](../concepts/task-decomposition.md) problem maps directly to how LangGraph users split complex tasks across subgraphs.
