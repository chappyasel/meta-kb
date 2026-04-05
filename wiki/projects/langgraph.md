---
entity_id: langgraph
type: project
bucket: agent-systems
sources:
  - repos/memodb-io-acontext.md
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
  - repos/caviraoss-openmemory.md
  - repos/mem0ai-mem0.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/topoteretes-cognee.md
related:
  - OpenAI
last_compiled: '2026-04-05T05:24:28.833Z'
---
# LangGraph

**Category:** Agent Systems | **Language:** Python, JavaScript/TypeScript | **License:** MIT | **Maintainer:** LangChain, Inc.

LangGraph is a library for building stateful, multi-actor agent applications as directed graphs. It runs on top of [LangChain](https://github.com/langchain-ai/langchain) but can be used independently for graph execution. The core idea: represent agent logic as nodes (functions or LLMs) connected by edges (transitions), with shared state flowing through. Unlike linear chain abstractions, LangGraph supports cycles, which makes it possible to build agents that loop, retry, and branch conditionally.

---

## What It Does

LangGraph lets you define agent workflows where:

- **Nodes** are Python/JS functions that read from and write to a shared state object
- **Edges** are either fixed or conditional (functions that decide which node runs next)
- **State** is typed, persisted between steps, and can be checkpointed to storage
- **Subgraphs** can be nested, enabling modular agent composition

The typical use case is a ReAct-style agent loop: LLM calls a tool, result goes back into state, LLM decides whether to call another tool or finish. LangGraph makes that loop explicit in graph form, and adds checkpointing, streaming, and human-in-the-loop pause/resume on top.

---

## Architecture and Core Mechanisms

### Graph Definition

Graphs are defined with `StateGraph` (Python: `langgraph/graph/state.py`). You specify a typed state schema (usually a `TypedDict` or Pydantic model), add nodes with `.add_node()`, and connect them with `.add_edge()` or `.add_conditional_edges()`. Compilation via `.compile()` produces a runnable `CompiledGraph`.

State updates use a **reducer** pattern: each node returns a dict of partial updates, and reducers (defaulting to overwrite, or `operator.add` for lists) merge them into the global state. This is declared in the state schema using Python type annotations.

### Conditional Routing

`add_conditional_edges(source_node, routing_function, path_map)` enables branching. The routing function receives current state and returns a string key; the path map resolves that key to the next node. This is how tool-calling loops terminate: the routing function checks whether the last LLM message contains tool calls and routes to either the tool node or `END`.

### Checkpointing

LangGraph's most architecturally significant feature is its checkpointer system (`langgraph/checkpoint/`). Before each node executes, the framework serializes the full graph state to a backend (memory, SQLite, PostgreSQL via `langgraph-checkpoint-postgres`, Redis). Each state snapshot gets a unique `checkpoint_id`. This enables:

- **Resumability**: Restart a run from any prior checkpoint
- **Human-in-the-loop**: Interrupt before a node, let a human modify state, then resume
- **Time travel**: Re-run from an earlier checkpoint with different input

The checkpoint stores not just state but also the pending tasks queue and parent checkpoint references, forming a tree of execution history per `thread_id`.

### Streaming

`graph.stream()` yields individual node outputs as they complete. `graph.astream_events()` provides finer-grained events (LLM token streaming, tool call starts/ends). This is useful for building UIs that show intermediate reasoning.

### Prebuilt Abstractions

`langgraph.prebuilt` includes `create_react_agent()`, which assembles the standard tool-calling loop for you. For most tool-using agents, this is the entry point. `ToolNode` (also in prebuilt) handles tool execution, error catching, and result formatting back into the message list.

---

## Key Numbers

- **GitHub stars:** ~13,000+ (as of early 2025, self-reported via GitHub badge)
- **PyPI downloads:** Consistently in the millions per month across the LangChain ecosystem
- **LangGraph Platform** (hosted): Benchmarks not publicly available; latency and throughput claims are self-reported by LangChain, Inc.
- **Prebuilt agent accuracy:** No independent benchmarks comparing LangGraph agent performance to alternatives

Self-reported figures should be treated accordingly.

---

## Strengths

**Explicit control flow.** You can read a LangGraph application and trace every possible execution path. Compared to frameworks where the agent decides its own structure at runtime, LangGraph makes branching and looping auditable.

**Checkpointing is first-class.** Most agent frameworks treat persistence as an afterthought. LangGraph bakes it into the execution model, which makes human-in-the-loop workflows and long-running tasks genuinely practical rather than bolted on.

**Streaming is granular.** Token-level streaming from LLMs, combined with node-level streaming, gives frontend developers enough signal to build responsive UIs without custom instrumentation.

**Subgraph composition.** Large agent systems can be split into independently testable subgraphs, each with their own state schemas, connected at well-defined interfaces.

**Multi-agent support.** LangGraph supports passing control between graphs (via `Command` objects or subgraph invocation), enabling supervisor/worker patterns and parallel agent execution.

---

## Critical Limitations

**Concrete failure mode: state schema rigidity under concurrent branches.** When using `Send` to fan out work to parallel nodes, each branch writes back to the same state object. If two parallel branches both modify the same key and the reducer is a simple overwrite (the default), one branch silently loses its update. This is not surfaced as an error. You have to know to define a list-append reducer for keys that parallel branches write to, and this requirement is easy to miss during initial development. The bug only appears at runtime when branches actually run concurrently.

**Unspoken infrastructure assumption:** The checkpointer backends for production use (`langgraph-checkpoint-postgres`) require you to manage database schema migrations yourself when LangGraph updates its internal checkpoint format. There is no migration tooling. If you upgrade LangGraph and your existing checkpoint schema is incompatible, historical threads become unreadable. Teams running long-lived workflows (customer support threads, multi-day tasks) need to version and migrate checkpoint tables manually.

---

## When NOT to Use LangGraph

**Simple single-pass pipelines.** If your agent calls an LLM once, maybe runs one tool, and returns a result, LangGraph adds boilerplate with no benefit. Plain LangChain LCEL or a direct API call is simpler.

**Teams unfamiliar with graph abstractions.** The mental model requires thinking in nodes, edges, and reducers. Engineers comfortable with sequential code find the graph paradigm counterintuitive, and mistakes in reducer definitions cause subtle data corruption bugs.

**Latency-critical paths.** The checkpoint serialization/deserialization cycle adds overhead on every node transition. For agents where p99 latency matters, the checkpointing tax may be unacceptable, especially with remote checkpoint backends (Postgres, Redis).

**Highly dynamic agent topologies.** If the graph structure itself needs to change at runtime based on user input (not just which branch to take, but adding new nodes), LangGraph's compiled graph model is the wrong abstraction. The graph is fixed at compile time.

---

## Unresolved Questions

**Checkpoint format stability.** The internal checkpoint schema changes between releases without a public versioning contract or migration guide. There is no documented commitment to backward compatibility.

**Cost at scale on LangGraph Platform.** LangChain's hosted platform pricing is usage-based, but the pricing page does not publish how checkpoint storage, concurrent thread limits, or streaming costs scale. Teams with high thread volumes have no public data to estimate costs before committing.

**Conflict resolution semantics.** The documentation does not formally specify what happens when a reducer receives conflicting updates from parallel branches in the same superstep beyond "the reducer function you define determines the outcome." For teams building complex parallel workflows, this leaves error handling as an exercise in reading source code.

**Governance and LangSmith coupling.** LangGraph's observability story is tightly coupled to LangSmith (LangChain's tracing product). Running LangGraph in a fully air-gapped environment with alternative tracing (OpenTelemetry, Datadog) requires non-trivial instrumentation work, and the degree to which LangGraph telemetry can be fully redirected is not documented.

---

## Alternatives

| Situation | Use instead |
|---|---|
| You want minimal dependencies and explicit Python control flow | **Pydantic AI** or raw Python with an LLM SDK |
| You need production-grade orchestration with built-in retry, queuing, and observability | **Temporal** (workflow engine) with LLM calls as activities |
| Your team thinks in dataflows and wants type-safe composition | **Haystack** pipelines |
| You need agent memory that persists and evolves across sessions | Pair LangGraph with [Mem0](../projects/mem0.md) or [Graphiti](../projects/graphiti.md) for the memory layer |
| You want multi-agent coordination without the LangChain dependency | **CrewAI** or **AutoGen** |
| You're building a single research or coding agent and want minimal setup | `create_react_agent` from `langgraph.prebuilt` is fine; no need for a custom graph |


## Related

- [OpenAI](../projects/openai.md) — part_of (0.3)
