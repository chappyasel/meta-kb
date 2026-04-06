---
entity_id: crewai
type: project
bucket: agent-systems
abstract: >-
  CrewAI is an open-source Python framework for orchestrating multiple LLM
  agents through role-based crews, where agents collaborate on tasks via
  sequential or hierarchical process flows with shared tool access.
sources:
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/caviraoss-openmemory.md
  - repos/mem0ai-mem0.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - agent-memory
last_compiled: '2026-04-06T02:07:20.562Z'
---
# CrewAI

**Type:** Project | **Bucket:** Agent Systems | **License:** MIT (core) / Commercial (Enterprise)

## What It Does

CrewAI lets you define named agent "roles" (e.g., Researcher, Writer, Analyst), group them into a `Crew`, assign tasks, and run them through a defined process. The framework handles inter-agent communication, task sequencing, context passing, and tool sharing. It targets developers who want multi-agent pipelines without building orchestration logic from scratch.

The key architectural bet: agents work better when given explicit role identities, goals, and backstories rather than generic system prompts. A `Researcher` agent with a defined goal produces different (reportedly better) output than a generic agent asked to do research.

## Core Mechanism

**The four primitives:**

1. `Agent` — an LLM wrapper with `role`, `goal`, `backstory`, `tools`, and optional memory configuration
2. `Task` — a unit of work with a `description`, `expected_output`, assigned `agent`, and optional `context` (outputs from other tasks)
3. `Crew` — the container holding agents and tasks, with a configured `process`
4. `Process` — either `sequential` (tasks run in order, each receiving prior outputs) or `hierarchical` (a manager agent delegates to worker agents)

**Execution flow in `crewai/crew.py`:**

Sequential process: tasks execute in list order. Each task's output becomes available as `context` to downstream tasks via the `context` parameter. The framework serializes prior task outputs into the agent's prompt.

Hierarchical process: a designated `manager_llm` or `manager_agent` receives the full task list, decides which agent handles which task, and routes accordingly. This is CrewAI's answer to dynamic task allocation, though the manager is itself an LLM call and adds latency plus failure surface.

**Memory integration** (`crewai/memory/`): CrewAI implements all four memory types — short-term (recent conversation), long-term (cross-crew persistence via SQLite), entity memory (named entity extraction), and contextual memory (assembled from the others). Short-term and entity memory default to ChromaDB for vector storage. Long-term memory persists to a local SQLite database. Memory is per-agent and optional; disabling it speeds execution significantly.

**Tool sharing** (`crewai/tools/`): Tools are Python functions or LangChain-compatible tools decorated with `@tool`. Any agent in a crew can receive any tool, and tools can be shared across agents. The framework wraps tool calls in a structured ReAct-style loop, though it does not expose the raw ReAct trace — it abstracts this into the agent's `_execute_task` method.

**RAG integration**: CrewAI integrates with [Retrieval-Augmented Generation](../concepts/rag.md) through its knowledge sources layer (`crewai/knowledge/`). You can attach PDF, CSV, JSON, or string sources to an agent or crew; these get chunked and embedded into a vector store that agents query during task execution.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub stars | ~28,000 | Self-reported via repo (as of mid-2025) |
| PyPI downloads | Millions/month | Self-reported |
| Supported LLMs | 100+ via LiteLLM | Self-reported |

Benchmarks are not independently validated. CrewAI's website cites enterprise customer outcomes (productivity gains, automation rates) without methodology. No published comparisons against [LangGraph](../projects/langgraph.md) or [AutoGen](equivalent) on standard agentic benchmarks like [SWE-Bench](../projects/swe-bench.md) or [GAIA](../projects/gaia.md).

## Strengths

**Low setup friction for role-based workflows.** A functional two-agent crew with tool use takes under 50 lines of Python. The `role/goal/backstory` pattern produces more consistent agent behavior than unstructured system prompts in workflows where persona-consistency matters (e.g., report generation, content pipelines).

**LLM-agnostic via LiteLLM.** [LiteLLM](../projects/litellm.md) integration means you can swap OpenAI for [Ollama](../projects/ollama.md), [Gemini](../projects/gemini.md), or Anthropic's [Claude](../projects/claude.md) by changing one parameter. This matters for teams with model-switching requirements or cost constraints.

**Built-in memory without custom plumbing.** Unlike raw [LangChain](../projects/langchain.md), you don't wire ChromaDB yourself. The memory architecture handles entity extraction and cross-session persistence out of the box. [Mem0](../projects/mem0.md) integration is documented for teams needing more sophisticated memory.

**Structured output support.** Tasks can define `output_pydantic` or `output_json` to coerce agent responses into typed structures, reducing downstream parsing failures.

## Critical Limitations

**Concrete failure mode — hierarchical process manager instability.** The manager agent in hierarchical mode is an LLM call that must parse the task list, select the right worker agent, and format the delegation correctly. In practice, with 5+ agents or ambiguous task descriptions, the manager misroutes tasks, repeats them, or enters delegation loops. There is no built-in circuit breaker; you must detect loops yourself via `max_iter` on the manager agent. Sequential process is substantially more reliable.

**Unspoken infrastructure assumption — local state.** CrewAI's long-term memory defaults to SQLite on the local filesystem (`~/.crewai/`). In containerized or serverless deployments, this state does not persist across instances. Teams deploying to Kubernetes or AWS Lambda discover this after building; migrating to a shared database requires custom `Storage` implementation against underdocumented internal APIs.

## When NOT to Use It

**Don't use CrewAI when:**

- You need fine-grained control over agent state transitions and retry logic. [LangGraph](../projects/langgraph.md)'s explicit graph structure lets you define exactly what happens on failure; CrewAI's abstractions make this hard to customize without monkey-patching.
- Your workflow requires streaming intermediate outputs to end users. CrewAI's task execution is blocking by default; streaming requires additional configuration and partial framework internals exposure.
- You're building production systems where you need full observability into token usage per agent, per task. CrewAI's built-in logging is coarse; integration with LangSmith or similar tools requires manual instrumentation.
- Task interdependencies are dynamic (determined at runtime based on prior results). Sequential process assumes a fixed task list; hierarchical process handles dynamic routing poorly at scale.

## Unresolved Questions

**Governance and licensing ambiguity.** CrewAI's core is MIT licensed, but CrewAI Enterprise (with additional orchestration features, a UI, and support) is commercial. The boundary between what's in the open-source core versus Enterprise is not cleanly documented in the repository. Teams building on open-source CrewAI should audit which features they depend on before scaling.

**Cost at scale.** Memory operations (entity extraction, embedding) add LLM calls beyond the primary task execution. A crew with 5 agents running 10 tasks with full memory enabled can generate 2-3x the expected token usage. No official documentation quantifies this overhead, and it varies by memory configuration.

**Conflict resolution between agents.** When Agent A and Agent B produce contradictory outputs that Agent C must reconcile, there is no conflict resolution protocol. Agent C receives both outputs as context and must resolve them via its LLM call. This is undocumented, inconsistent, and the failure mode is silent — Agent C picks one answer without flagging the contradiction.

**Long-term maintenance trajectory.** CrewAI moved fast through breaking API changes in its first 18 months. Upgrade paths between minor versions have broken existing crews without deprecation warnings. Enterprise customers have reportedly pinned to specific versions, which raises questions about security patch adoption.

## Relationship to Related Concepts

CrewAI implements [Agent Memory](../concepts/agent-memory.md) across all four memory types. Its task-passing mechanism is a practical form of [Task Decomposition](../concepts/task-decomposition.md). The hierarchical process approximates [Agent Orchestration](../concepts/agent-orchestration.md) patterns. Tool use follows [ReAct](../concepts/react.md) conventions internally.

## Alternatives

| Alternative | When to choose it |
|-------------|-------------------|
| [LangGraph](../projects/langgraph.md) | You need explicit state machines, fine-grained error handling, or streaming. More verbose but far more controllable. |
| [LangChain](../projects/langchain.md) | You want composable primitives without crew abstractions. Better for single-agent pipelines with custom memory. |
| [Letta](../projects/letta.md) | Your primary requirement is long-term memory and stateful agents across sessions, not multi-agent collaboration. |
| AutoGen (Microsoft) | You need conversational multi-agent patterns where agents debate or critique each other's outputs. |
| Raw LLM API calls | Your workflow is simple enough that a framework adds more complexity than it removes. |

Choose CrewAI when the role-based mental model maps cleanly to your domain (research → writing → editing pipelines), you value rapid prototyping over operational control, and your deployment environment supports persistent local state.
