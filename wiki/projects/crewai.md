---
entity_id: crewai
type: project
bucket: agent-systems
abstract: >-
  CrewAI is a Python framework for orchestrating role-based multi-agent
  pipelines, distinguishing itself with explicit crew/agent/task abstractions
  and a commercial cloud platform alongside the open-source core.
sources:
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/caviraoss-openmemory.md
  - repos/mem0ai-mem0.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - agent-memory
  - rag
  - openai
  - mcp
  - mem0
  - langchain
last_compiled: '2026-04-07T11:46:13.577Z'
---
# CrewAI

## What It Does

CrewAI lets you define a set of AI agents with distinct roles, backstories, and tool access, then wire them together to complete multi-step tasks through delegation and handoffs. The framework models agentic work as a "crew" executing a project: each agent has a role (e.g., "Researcher", "Writer"), a goal, and optionally a set of tools. Tasks get assigned to agents, and agents can delegate subtasks to each other.

The core abstraction is deliberately close to how software teams think about work. You define agents declaratively, assign tasks, specify a process (sequential or hierarchical), and let the framework handle LLM calls, tool invocations, and inter-agent communication.

CrewAI runs as an open-source Python package (`crewai` on PyPI) and also offers CrewAI Enterprise, a hosted platform with a visual workflow builder, observability dashboards, and deployment infrastructure.

## Core Mechanism

The framework's primary abstractions live in a few key classes:

**`Agent`** holds the role definition, goal, backstory, LLM binding, tool list, and behavioral parameters like `allow_delegation` and `verbose`. Backstory text gets injected into system prompts, shaping how the underlying model responds.

**`Task`** defines a unit of work with a description, expected output format, assigned agent, and optional context dependencies on other tasks. Context dependencies control the DAG: if Task B depends on Task A, Task A's output gets passed into Task B's prompt.

**`Crew`** assembles agents and tasks, selects a process type, and runs execution. Two process types exist:
- `Process.sequential` — tasks run in declared order, each receiving prior task outputs
- `Process.hierarchical` — a designated manager agent (or LLM-as-manager) decides task assignments and can spawn delegation

Under the hood, the execution loop calls each agent's `execute_task` method, which builds a prompt from the agent's role context plus the task description plus any tool schemas, sends it to the configured LLM, parses tool calls, executes tools, and iterates until the agent produces a final answer. This is a standard [ReAct](../concepts/react.md)-style loop: the framework does not use a custom reasoning algorithm.

**Tools** are Python callables wrapped with a `@tool` decorator or imported from `crewai_tools`. Tool schemas get passed to the LLM as function definitions. CrewAI ships integrations with search APIs, web scraping, file I/O, and others, and supports any LangChain-compatible tool.

**Memory** integration follows the taxonomy from [Agent Memory](../concepts/agent-memory.md): short-term memory (in-session conversation history), long-term memory (persistent storage via embeddings), entity memory (extracted entities stored separately), and contextual memory that blends the three at retrieval time. [Mem0](../projects/mem0.md) is a documented integration target. Memory is optional and disabled by default.

**[Model Context Protocol](../concepts/mcp.md)** support lets agents expose or consume MCP-compatible tool servers, making CrewAI crews interoperable with other MCP-enabled systems.

## Key Numbers

- GitHub stars: ~30K+ (self-reported growth, verified directionally by Trendshift data)
- The framework is actively maintained with frequent releases; the PyPI package sees substantial download volume
- No independently verified benchmark results comparing CrewAI crew performance to alternative frameworks on standard benchmarks like [SWE-bench](../projects/swe-bench.md) or [GAIA](../projects/gaia.md)
- The enterprise platform pricing is not public

Treat all performance claims from CrewAI's own documentation as self-reported until third-party evaluations appear.

## Strengths

**Low conceptual overhead for role-based workflows.** The crew/agent/task model maps directly onto how people describe knowledge-work pipelines. A new user can build a research-then-summarize crew in under 50 lines of Python. This reduces the design translation layer between "what I want" and "what I code."

**Flexible LLM binding.** Agents can each use a different LLM. You can put a cheap model on a high-volume classification agent and a capable model on a synthesis agent, without any framework-level friction. [LiteLLM](../projects/litellm.md) integration handles routing to [OpenAI](../projects/openai.md), [Anthropic](../projects/anthropic.md), [DeepSeek](../projects/deepseek.md), [Gemini](../projects/gemini.md), and local models via [Ollama](../projects/ollama.md).

**Hierarchical process for dynamic task allocation.** When you cannot fully specify the task graph upfront, a manager agent (typically a more capable LLM) decides at runtime which agent handles which subtask. This enables light forms of [Meta-Agent](../concepts/meta-agent.md) behavior without building a custom orchestrator.

**Active ecosystem.** The `crewai_tools` package and documented integrations with [Mem0](../projects/mem0.md), [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), and MCP mean you rarely need to write tool wrappers from scratch.

## Critical Limitations

**Concrete failure mode — delegation loops.** When `allow_delegation=True` and a manager agent coordinates multiple workers, agents can enter delegation cycles: Agent A delegates to Agent B, Agent B's output is unsatisfactory, Agent A re-delegates, and the crew burns token budget without terminating. The framework provides `max_iter` and `max_rpm` parameters to cap this, but the defaults are generous and the failure mode is silent — you get a result, just an expensive one. Production deployments require explicit budget configuration.

**Unspoken infrastructure assumption — synchronous execution.** CrewAI's default execution is synchronous and single-process. The `sequential` process runs tasks one at a time in a single Python thread. The `hierarchical` process also blocks on each LLM call. At any meaningful scale (parallel crews, high-throughput pipelines), you need to manage async execution, process pools, or task queues yourself. The framework does not provide a production-grade job scheduler or distributed execution layer; the Enterprise platform addresses some of this, but the open-source version leaves that to you.

## When NOT to Use It

**Don't use CrewAI when your workflow needs tight feedback loops between agents.** The task/process model assumes relatively coarse-grained handoffs. If your agents need to negotiate, jointly edit artifacts, or run tightly-coupled iterative loops, [LangGraph](../projects/langgraph.md)'s explicit graph with conditional edges and state machines handles this better.

**Don't use CrewAI for high-throughput, low-latency pipelines.** If you're processing thousands of requests per minute or need sub-second agent responses, the synchronous execution model and per-agent LLM call overhead make this the wrong choice. Build a direct [RAG](../concepts/rag.md) pipeline or a lightweight function-calling wrapper instead.

**Don't use CrewAI when you need rigorous task decomposition with learned optimization.** [DSPy](../projects/dspy.md) with its compilation approach, or [EvoAgentX](../projects/evoagentx.md) with evolutionary workflow search, will outperform hand-written agent role definitions for complex, well-specified tasks where you can invest in optimization.

**Don't use it when reproducibility and auditability are hard requirements.** The backstory-in-system-prompt approach to agent identity is prompt-sensitive: small wording changes in role descriptions can meaningfully change behavior. The framework does not provide built-in [Decision Traces](../concepts/decision-traces.md) or structured logging of agent reasoning steps at a granularity that satisfies compliance or audit needs.

## Unresolved Questions

**Conflict resolution in hierarchical mode.** The documentation does not specify what happens when a manager agent's task allocation conflicts with a worker agent's capabilities or tool access. The framework's behavior when a manager assigns a task requiring Tool X to an agent that does not have Tool X is unclear from public documentation.

**Cost at scale.** Each agent's backstory, role, and goal get injected into every LLM call for that agent. In a crew with long backstories and many tool schemas, per-call token counts grow quickly. There is no published analysis of effective cost per crew run as a function of agent count, task complexity, or delegation depth.

**Memory consistency across runs.** When long-term memory is enabled, there is no documented mechanism for invalidating or updating stale memories. An agent that stored a false belief in session N will retrieve it in session N+100. The framework defers this problem to whatever storage backend you configure.

**Governance of the Enterprise platform.** CrewAI Inc. controls the hosted platform. The open-source license (MIT for the core package) does not guarantee API stability or that open-source features will not migrate to paid tiers over time.

## Alternatives

**Use [LangGraph](../projects/langgraph.md) when** you need explicit control flow, conditional branching between agent steps, or streaming intermediate state. LangGraph's graph model is more verbose but more predictable for complex workflows.

**Use [LangChain](../projects/langchain.md) when** you want a lower-level agent construction API with maximum flexibility and don't need the crew/task abstraction. LangChain's LCEL lets you compose chains without committing to a role-based model.

**Use [Letta](../projects/letta.md) when** persistent, structured memory with transparent state management is the primary requirement, not multi-agent coordination.

**Use [AutoResearch](../projects/autoresearch.md) or similar domain-specific frameworks when** your use case is narrow and well-defined — a purpose-built pipeline will outperform a general-purpose multi-agent framework on constrained tasks.

**Use [DSPy](../projects/dspy.md) when** you want to optimize agent prompts and pipelines systematically rather than hand-tuning role descriptions.

## Related Concepts

- [Task Decomposition](../concepts/task-decomposition.md) — the cognitive strategy CrewAI's task model operationalizes
- [Agent Memory](../concepts/agent-memory.md) — the memory taxonomy CrewAI's optional memory layer implements
- [ReAct](../concepts/react.md) — the reasoning loop each CrewAI agent runs internally
- [Model Context Protocol](../concepts/mcp.md) — the tool interoperability standard CrewAI supports
- [Context Engineering](../concepts/context-engineering.md) — the broader discipline governing how agent prompts are constructed and optimized
