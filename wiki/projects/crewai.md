---
entity_id: crewai
type: project
bucket: multi-agent-systems
abstract: >-
  CrewAI orchestrates role-playing AI agents as structured crews with explicit
  role/goal/backstory assignments, sequential or hierarchical task pipelines,
  and built-in memory and tool integration — differentiating from generic
  frameworks through its opinionated crew metaphor and process management layer.
sources:
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - repos/caviraoss-openmemory.md
  - repos/mem0ai-mem0.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
related:
  - openai
  - agent-memory
last_compiled: '2026-04-08T23:07:54.688Z'
---
# CrewAI

## What It Does

CrewAI is a Python framework for building multi-agent systems where each agent has an assigned role, goal, backstory, and toolset. Agents collaborate on structured tasks within a "crew," executing work through either a sequential pipeline (tasks run one after another) or a hierarchical process (a manager agent delegates to workers). The crew metaphor is not just aesthetic: it encodes assumptions about agent coordination that shape how you design systems.

Unlike [LangGraph](../projects/langgraph.md), which treats agent coordination as a programmable graph, or [AutoGen](../projects/autogen.md), which models agents as conversational participants, CrewAI sits between these: it provides more structure than AutoGen's freeform chat while staying more declarative and less code-intensive than LangGraph's explicit state machines.

## Core Mechanism

### Agent Definition

Each agent is instantiated with four fields: `role`, `goal`, `backstory`, and an optional list of tools. These are injected into the LLM's system prompt at task execution time. The backstory field is CrewAI's distinctive touch — it primes the LLM with a persona that influences response style and apparent expertise. In `crewai/agent.py`, the `Agent` class builds this prompt template and manages tool invocation via a [ReAct](../concepts/react.md)-style loop.

Agents carry a `memory` flag. When enabled, CrewAI connects to a configurable memory backend supporting three tiers:
- **Short-term memory**: embeddings of recent conversation context (default: in-process vector store)
- **Long-term memory**: persistent storage across crew runs via SQLite by default
- **Entity memory**: tracked mentions of people, places, and concepts across the session

This maps directly to the [Agent Memory](../concepts/agent-memory.md) model of tiered storage, though CrewAI's implementation delegates heavily to external backends (it integrates with [Mem0](../projects/mem0.md) for managed memory).

### Task and Process Layer

Tasks are explicit objects with a `description`, `expected_output`, and assigned `agent`. The `Crew` class ties agents and tasks together with a `process` parameter:

- `Process.sequential`: tasks execute in order, each agent receiving the output of the previous task in its context
- `Process.hierarchical`: a manager LLM (either specified or auto-created) reads all tasks, delegates to agents, and synthesizes results

The sequential pipeline is simple and predictable. The hierarchical process is more powerful but introduces a manager agent whose quality depends entirely on the LLM powering it — if the manager misroutes a task, there is no built-in retry or re-delegation logic beyond what the LLM itself attempts.

### Tool Integration

Tools follow a Pydantic-based schema (using [Pydantic](../projects/pydantic.md) for validation). CrewAI ships built-in tools covering web search, file I/O, code execution, and scraping, plus a `BaseTool` class for custom tools. The [Model Context Protocol](../concepts/model-context-protocol.md) is supported via an MCP adapter, allowing agents to call MCP-compatible tool servers.

Tool calls go through the agent's internal ReAct loop. The agent reasons about which tool to use, calls it, gets a result, and decides whether to continue reasoning or return a final answer. This loop runs synchronously by default.

### Flow API

CrewAI 0.70+ added a `Flow` abstraction (in `crewai/flow/`) that lets you chain crews and Python functions using `@start`, `@listen`, and `@router` decorators. This bridges the gap with LangGraph-style explicit control flow, letting you build pipelines where a crew's output conditionally triggers different downstream crews. It is the framework's clearest acknowledgment that the original crew-centric model alone is insufficient for complex workflows.

## Key Numbers

- GitHub stars: ~30k+ (as of mid-2025, self-reported trending data; independently visible via GitHub)
- Pip installs: consistently in top multi-agent frameworks by download volume on PyPI (publicly verifiable)
- Benchmarks: CrewAI does not publish task benchmark results against other frameworks. Claims about real-world deployment counts come from their website and are unverified

## Strengths

**Fast prototyping of role-based workflows.** The role/goal/backstory pattern maps naturally to how humans describe work (e.g., "a research analyst who finds sources, a writer who drafts content"). This lets non-specialists design agent teams without understanding LLM internals.

**Integrated memory without boilerplate.** Setting `memory=True` on a crew activates all three memory tiers with sensible defaults. You get [Short-Term Memory](../concepts/short-term-memory.md), [Long-Term Memory](../concepts/long-term-memory.md), and entity tracking without wiring a vector database yourself.

**Active ecosystem and integrations.** Native integrations with [LangChain](../projects/langchain.md) tools, [LlamaIndex](../projects/llamaindex.md), [Mem0](../projects/mem0.md), [LiteLLM](../projects/litellm.md) (for model routing), and MCP. The Mem0 integration specifically enables persistent memory across crew sessions with the kind of selective retrieval that outperforms naive full-context approaches.

**Low LLM coupling.** Via LiteLLM, you can swap between OpenAI, Anthropic, local models via [Ollama](../projects/ollama.md), and others without changing agent code.

## Critical Limitations

**Concrete failure mode — hierarchical process brittleness:** When using `Process.hierarchical`, the manager agent receives all task descriptions and must reason about delegation order, which agent is appropriate for each task, and how to synthesize partial results. With five or more agents handling interdependent tasks, the manager's context window fills with task metadata and prior outputs. The manager LLM may lose track of task dependencies, skip agents, or produce a synthesis that ignores results from specific workers. There is no built-in mechanism to detect this. You discover it in output quality, not in an exception.

**Unspoken infrastructure assumption:** CrewAI assumes each crew run is a discrete, finite job. The framework has no native support for long-running crews that must pause, checkpoint state, and resume. Flows add some sequencing, but if an agent call fails mid-crew, you typically restart the whole crew. Production deployments requiring reliability against LLM API failures need external orchestration (Celery, Temporal, etc.) that the documentation does not address.

## When NOT to Use CrewAI

**Avoid CrewAI when your workflow requires precise state management.** If your multi-agent system needs to track complex shared state, handle conditional branching based on intermediate results, or implement retry logic with fine-grained control, use [LangGraph](../projects/langgraph.md) instead. LangGraph's explicit graph model gives you visibility and control that CrewAI's abstraction layer hides.

**Avoid CrewAI for real-time or streaming agent systems.** CrewAI's synchronous execution model (despite async support being added incrementally) is not designed for agents that must process streaming data, react to events, or maintain persistent connections. [AutoGen](../projects/autogen.md) or a custom [OpenAI Agents SDK](../projects/openai-agents-sdk.md) implementation fits better.

**Avoid CrewAI when debugging fidelity matters.** The framework's abstractions make it hard to inspect what the LLM actually saw at each decision point. For research workflows or systems where you need full [Observability](../concepts/observability.md) into every agent step, more explicit frameworks give you better tooling.

**Avoid CrewAI for single-agent tasks.** The crew overhead (multiple LLM calls for manager delegation, memory retrieval, etc.) adds latency and cost. A single well-prompted LLM call with tools, via the OpenAI Agents SDK or direct API, is faster and cheaper.

## Unresolved Questions

**Cost at scale.** CrewAI's documentation shows token counts per agent call but gives no guidance on total crew cost for non-trivial workflows. Hierarchical process crews with memory enabled can trigger five or more LLM calls per user task (manager delegation, each agent execution, memory retrieval, synthesis). There is no built-in cost estimation or budgeting mechanism.

**Conflict resolution.** When two agents in a crew produce contradictory outputs, the framework has no documented protocol for resolving the conflict. The manager agent in hierarchical mode may handle it, or may not. The behavior is LLM-dependent and non-deterministic.

**Memory governance.** Long-term memory persists across crew runs by default, but there is no built-in mechanism for memory auditing, expiration, or correction. If an agent stores incorrect information in long-term memory, it can influence all future runs. How to audit or reset this is not addressed in the documentation.

**Multi-tenancy.** CrewAI's memory system uses `user_id`-scoped storage when integrated with Mem0, but the base framework's SQLite-backed long-term memory does not have clear multi-tenant isolation. Production deployments serving multiple users need to implement this themselves.

## Alternatives

**[LangGraph](../projects/langgraph.md)** — Use when you need explicit, debuggable control flow. LangGraph encodes your agent coordination logic as a graph you define; CrewAI infers coordination from roles and process type. LangGraph has a steeper learning curve but far better observability.

**[AutoGen](../projects/autogen.md)** — Use when your task maps naturally to multi-agent conversation. AutoGen's conversational model handles back-and-forth between agents more gracefully than CrewAI's task-handoff model. Better for tasks requiring negotiation or iterative refinement between agents.

**[MetaGPT](../projects/metagpt.md)** — Use when your workflow mirrors a software engineering organization (PM, architect, engineer, QA). MetaGPT encodes software development roles and artifacts as first-class concepts, where CrewAI treats all roles generically.

**[OpenAI Agents SDK](../projects/openai-agents-sdk.md)** — Use when you want a minimal, well-documented foundation with tight OpenAI integration and handoff semantics. Less opinionated than CrewAI, gives you more control without requiring a full graph framework.

**[LangChain](../projects/langchain.md)** — Use when you need the broadest ecosystem of integrations and are building around retrieval pipelines rather than agent collaboration. CrewAI actually integrates with LangChain tools, so these are often complementary.

## Related Concepts

- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- [Multi-Agent Collaboration](../concepts/multi-agent-collaboration.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Human-in-the-Loop](../concepts/human-in-the-loop.md)
- [ReAct](../concepts/react.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Cognitive Architecture](../concepts/cognitive-architecture.md)
