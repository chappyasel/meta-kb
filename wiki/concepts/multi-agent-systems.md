---
entity_id: multi-agent-systems
type: concept
bucket: agent-systems
abstract: >-
  Multi-agent systems coordinate multiple AI agents to decompose and execute
  complex tasks, with context management across agents as the primary unsolved
  engineering challenge.
sources:
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - repos/letta-ai-letta.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - CrewAI
  - AutoGen
  - LangGraph
  - Mobile-Agent-E
last_compiled: '2026-04-05T20:35:43.627Z'
---
# Multi-Agent Systems

## What They Are

A multi-agent system (MAS) distributes task execution across multiple LLM-driven agents that communicate, coordinate, and specialize. The core premise: some tasks exceed what a single agent can handle in one context window, benefit from parallel execution, or require specialized sub-agents with distinct capabilities and personas.

The architecture spans a spectrum from loosely coupled pipelines to tightly coupled swarms. At one end, a simple two-agent setup runs a coder and a reviewer in sequence. At the other, a dynamic swarm routes subtasks to specialized workers based on capability declarations, aggregates results, and synthesizes outputs through an orchestrator.

What distinguishes MAS from single-agent tools-plus-prompts is the introduction of inter-agent communication as a first-class design primitive. Agents maintain their own context windows, execute concurrently or sequentially, and pass structured messages rather than sharing a monolithic prompt.

## How They Work

### Agent Roles and Topology

Most implementations decompose into two layers:

**Orchestrators** hold the task plan, delegate to worker agents, aggregate outputs, and handle failures. They rarely call tools directly. Their primary job is decomposition and synthesis.

**Workers** specialize: a `web_researcher`, a `code_executor`, a `data_analyst`. Each carries role-specific instructions, tools, and a bounded context window tuned to its task.

Topology shapes behavior:
- **Sequential pipelines**: Agent A outputs feed Agent B's inputs. Simple, debuggable, slow.
- **Parallel fan-out**: Orchestrator dispatches identical or complementary subtasks to workers simultaneously. Faster, but output reconciliation adds complexity.
- **Hierarchical**: Orchestrators spawn sub-orchestrators. Used in [CrewAI](../projects/crewai.md) for complex multi-phase workflows.
- **Peer-to-peer**: Agents negotiate directly. Rare in production due to coordination overhead and loop risk.

### Communication Protocols

Inter-agent communication has no dominant standard, though the survey of context engineering [identifies KQML, FIPA ACL, and MCP (Model Context Protocol) as the leading candidates](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md). In practice, most frameworks pass structured JSON messages through an orchestrator rather than using formal agent communication languages.

The message payload typically carries:
- Task specification (what to do)
- Context from prior steps (what's been done)
- Constraints (format, tools available, budget)
- Role declaration (who this agent is supposed to be)

### Context as the Core Problem

Each agent has its own context window. Cross-agent coordination requires deciding what each agent needs to see and when. The survey formalizes this as a budget allocation problem: **C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)** subject to |C| ≤ L_max. Every token an orchestrator passes to a worker occupies that worker's finite window. [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

Three strategies for managing this:

1. **Full context passing**: Every agent receives the entire task history. Simple but wasteful. Breaks down when conversation length exceeds window size.

2. **Summarization at handoff**: Orchestrator compresses prior agent outputs before passing downstream. [Gauri Gupta's auto-harness work](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md) explicitly recommends sub-agents that own their verbose output and pass only summaries up. Reduces bloat but risks losing nuance.

3. **Persistent shared memory**: A memory store accessible to all agents. [Letta's `memory_blocks`](../raw/repos/letta-ai-letta.md) implements this as labeled, updateable state that survives across agent invocations. Expensive to maintain, but enables genuine cross-agent learning.

### State and Coordination

For agents to coordinate without a shared context, they need external state. Common patterns:

- **Shared database**: Agents read and write to a common store. Simple but requires conflict resolution logic.
- **Message queue**: Tasks dispatched as queue items, workers consume and post results. Enables parallelism and retry.
- **Blackboard architecture**: A shared workspace all agents can read and write. Expensive coordination overhead.

[LangGraph](../projects/langgraph.md) models this as a graph where nodes are agents and edges carry state. The `StateGraph` object acts as the shared blackboard. [AutoGen](../projects/autogen.md) uses conversation threads as the coordination primitive. [CrewAI](../projects/crewai.md) defines `Task` objects with explicit input/output contracts between agents.

### Self-Improving Agent Swarms

Karpathy's autoresearch experiment demonstrates a compelling MAS pattern: agents run parallel hyperparameter search on small models, validate promising changes, and cascade confirmed improvements to larger models. Running ~700 experiments autonomously over 48 hours, the swarm found a cumulative 11% speedup in "Time to GPT-2" that manual tuning had missed, including non-obvious issues like an unscaled QK normalizer and misconfigured AdamW betas. [Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)

This pattern generalizes to any metric that is cheap to evaluate. The key design elements:
- Small proxy models validate before testing at scale
- Agents track experiment sequences and use prior results to plan next experiments
- Human review stays optional, at the edges

Auto-harness extends this idea to agent behavior improvement: mine production failures, cluster by root cause, convert clusters into regression tests, propose fixes, gate acceptance on both improvement and non-regression. The regression gate prevents backsliding: every fixed failure becomes a permanent test case, so the bar only moves one direction. Tau3 benchmark performance moved from 0.56 to 0.78 with this loop. [Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md)

## Strengths

**Parallelism**: Tasks with independent subtasks (research + coding + review) complete faster when dispatched concurrently. A single-agent pipeline must serialize.

**Specialization**: Role-specific instructions and tool restrictions let each agent operate in a tighter problem space. A `web_researcher` agent can have search-optimized prompting and no code execution tools.

**Context budget efficiency**: Dividing a large task across multiple smaller contexts avoids the degradation that comes from stuffing everything into one long window. [The asymmetry finding from the context engineering survey applies](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md): LLMs understand complex contexts better than they generate sophisticated long outputs, so smaller, focused contexts per agent often outperform one massive prompt.

**Iterative self-improvement**: When evaluation is cheap, agent swarms can autonomously search for improvements humans would miss. The Karpathy autoresearch case demonstrates this at a concrete, measurable level.

## Limitations

**Coordination overhead compounds**: For simple tasks, agent setup and message-passing cost exceeds the benefit of parallelism. The context engineering survey explicitly notes that "multi-agent systems show coordination overhead that often negates the benefits of parallelization for simple tasks." [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) A task taking two LLM calls in a single-agent setup may require eight in a multi-agent pipeline (task decomposition, delegation, two worker calls, aggregation, review, synthesis).

**Concrete failure mode — context drift in long chains**: When an orchestrator summarizes agent output to pass downstream, semantic drift accumulates. By the fourth or fifth handoff, the downstream agent may be working from a summary-of-a-summary that has lost critical constraints from the original task specification. There is no automatic detection mechanism for this. The task completes but produces wrong output that matches the corrupted context, not the original request.

**Infrastructure assumption**: Most MAS frameworks assume each agent call is cheap and fast. If the underlying model has high latency or token cost, parallelism doesn't help much and the coordination overhead dominates. This assumption breaks badly on slower hosted endpoints or heavily throttled APIs.

**Debugging is hard**: A single-agent chain with a bug points to one context window. A multi-agent system with a bug requires tracing message provenance across agent boundaries, distinguishing orchestrator errors from worker errors from coordination errors. Frameworks provide varying levels of observability tooling.

**Shared memory is unsolved**: The survey identifies memory system isolation as a field-level failure mode. Most MAS implementations evaluate agents in isolation. Cross-agent memory that persists, remains consistent, and handles concurrent writes lacks settled best practice. [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

## When Not to Use Multi-Agent Systems

Avoid MAS when:

- The task fits comfortably in a single context window and doesn't decompose into parallel subtasks. The coordination overhead is pure cost.
- Debugging and explainability are critical. Multi-agent execution traces are significantly harder to interpret than single-agent traces.
- Latency matters more than throughput. Sequential agent chains add roundtrip latency at every step.
- The evaluation metric is expensive or slow. Self-improvement loops (autoresearch, auto-harness) only pay off when you can run many experiments cheaply.
- Your team lacks observability infrastructure. Without tracing across agent boundaries, failures are very hard to diagnose.

## Unresolved Questions

**Conflict resolution**: When two worker agents return contradictory outputs, no framework provides a principled resolution mechanism. Orchestrators typically pick one, summarize both, or re-prompt. The correct resolution depends on the task, and no general solution exists.

**Memory governance at scale**: Who owns the shared memory store? What happens when one agent writes malformed data that corrupts another agent's context? Letta's `memory_blocks` gives each agent labeled state, but doesn't address concurrent write conflicts across agents in the same session.

**Cost attribution**: In a production multi-agent system, token costs distribute across many LLM calls. Frameworks generally don't provide per-subtask cost visibility, making cost optimization difficult.

**Evaluation frameworks**: Existing benchmarks (WebArena, SWE-Bench) test single-agent task completion. There is no settled benchmark for evaluating coordination quality, failure recovery, or cross-agent consistency in multi-agent systems.

**When to spawn vs. when to reason**: No principled heuristic exists for deciding whether a subtask should be delegated to a sub-agent or handled with a tool call in the current agent. This is currently a design judgment call, not a computed decision.

## Framework Selection Guidance

- [CrewAI](../projects/crewai.md): Use for structured, role-based workflows with clear task contracts and output dependencies. Python-native, good for teams that want defined agent personas.
- [AutoGen](../projects/autogen.md): Use for conversational multi-agent setups where agents negotiate or debate. Strong for code generation and review loops.
- [LangGraph](../projects/langgraph.md): Use when you need fine-grained control over agent state, branching logic, and explicit graph topology. Higher setup cost, lower abstraction.
- [Letta / MemGPT](../projects/letta.md): Use when cross-session memory and agent self-improvement are requirements. The `memory_blocks` abstraction is the most mature persistent state solution.
- [Mobile-Agent-E](../projects/mobile-agent-e.md): Use for GUI automation tasks where agents interact with mobile interfaces.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md)
- [Agent Memory Systems](../concepts/agent-memory.md)
- [RAG (Retrieval-Augmented Generation)](../concepts/rag.md)
