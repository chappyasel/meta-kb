---
entity_id: cognitive-architecture
type: concept
bucket: agent-architecture
abstract: >-
  Cognitive architecture defines how AI agents organize perception, memory,
  reasoning, and action into a unified system; its key differentiator from
  ad-hoc LLM chaining is principled decomposition of cognitive functions
  enabling persistent state, structured reasoning, and coordinated multi-agent
  behavior.
sources:
  - repos/agenticnotetaking-arscontexta.md
  - repos/caviraoss-openmemory.md
  - repos/topoteretes-cognee.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
related:
  - retrieval-augmented-generation
  - openai
  - context-engineering
last_compiled: '2026-04-08T23:14:10.404Z'
---
# Cognitive Architecture

## What It Is

Cognitive architecture is the structural blueprint governing how an AI agent processes information, maintains state, reasons about problems, and produces actions. The term comes from cognitive science, where architectures like ACT-R and SOAR described human cognition as interacting modules with distinct memory types and reasoning mechanisms. Applied to LLM-based agents, cognitive architecture answers a design question that ad-hoc prompt engineering leaves open: how should perception, memory, reasoning, and action be organized so the system behaves reliably across sessions, tasks, and contexts?

The architecture distinguishes agents from raw LLM calls. A single LLM query has no persistent state, no structured memory retrieval, and no loop for acting and observing. A cognitive architecture imposes structure on all of these, making it possible to build agents that accumulate knowledge, recover from errors, and coordinate with other agents.

## Why It Matters

LLMs are stateless by design. Every API call starts from a blank context window. Cognitive architecture solves this by defining what gets stored, in what form, how it gets retrieved, and how retrieved information influences the next action. Without this structure, you get agents that repeat mistakes, lose track of long tasks, and cannot build on prior experience.

The second pressure driving the field is context length. Even with 200k-token windows, filling the context with raw history is expensive, slow, and degrades reasoning quality through [Lost in the Middle](../concepts/lost-in-the-middle.md) effects. A cognitive architecture decides what to compress, what to retrieve selectively, and what to discard, rather than passing everything forward.

The third pressure is multi-agent coordination. When multiple agents share a task, they need shared state management, defined communication protocols, and conflict resolution. Architecture provides the contracts for all of this.

## Core Components

### Perception

Perception handles incoming information — user messages, tool outputs, document chunks, API responses, sensor data. Architecturally, this involves parsing heterogeneous input into a canonical representation the reasoning module can process. In practice, this maps to document loaders, image encoders, and structured extraction pipelines. The Ars Contexta plugin formalizes this with a six-phase pipeline called the "6 Rs," where `Record` captures raw input and `Reduce` extracts structured insights before anything reaches the knowledge graph [Source](../raw/repos/agenticnotetaking-arscontexta.md).

### Memory

Memory is the most actively developed component. Most architectures distinguish at least four types:

**[Episodic Memory](../concepts/episodic-memory.md)** stores specific past events — conversation turns, actions taken, outcomes observed. It answers "what happened?" and supports trajectory-based reasoning like [Reflexion](../concepts/reflexion.md).

**[Semantic Memory](../concepts/semantic-memory.md)** stores general facts and conceptual knowledge — entity properties, domain rules, user preferences. It answers "what is true?" OpenMemory implements this as a distinct "sector" alongside episodic, procedural, emotional, and reflective memory [Source](../raw/repos/caviraoss-openmemory.md).

**[Procedural Memory](../concepts/procedural-memory.md)** stores how to perform tasks — sequences of tool calls, workflow patterns, API usage. Voyager's skill library and [SkillBook](../concepts/skill-book.md) implement this explicitly.

**[Core Memory](../concepts/core-memory.md)** holds identity-level facts that persist across all sessions — the agent's name, its operating constraints, key user facts. [Letta](../projects/letta.md) (formerly MemGPT) treats this as always-in-context, never evicted.

Memory systems use different storage backends. [Vector databases](../concepts/vector-database.md) like [ChromaDB](../projects/chromadb.md), [Pinecone](../projects/pinatone.md), [FAISS](../projects/faiss.md), and [Qdrant](../projects/qdrant.md) support semantic retrieval. Graph databases like [Neo4j](../projects/neo4j.md) store relationship structures that vector search misses. Relational stores like [SQLite](../projects/sqlite.md) and [PostgreSQL](../projects/postgresql.md) handle structured facts and temporal data. Most mature architectures use all three.

### Reasoning

Reasoning is where the LLM does its work, but architecture determines how that work is structured. The dominant patterns:

**[ReAct](../concepts/react.md)** alternates Thought, Action, and Observation steps in a loop. The agent generates reasoning text, selects a tool call, observes the result, and continues. This is the most widely deployed pattern because it works within a single context window and requires no external state.

**[Chain-of-Thought](../concepts/chain-of-thought.md)** structures intermediate reasoning steps before producing an answer. It improves accuracy on multi-step problems but lives entirely in the context window with no persistent memory.

**Tree-of-thought and Monte Carlo Tree Search variants** explore multiple reasoning paths simultaneously, selecting branches based on intermediate evaluations. These are computationally expensive but improve performance on tasks where the first approach is often wrong.

**Reflection loops** — exemplified by [Reflexion](../concepts/reflexion.md) — add a separate evaluation step where the agent critiques its own output and generates corrective guidance stored as episodic memory for the next attempt.

### Action

Action modules translate reasoning outputs into effects: tool calls, API requests, code execution, file writes, messages to other agents. Architecture determines the tool registry, permission model, and error handling. The [Model Context Protocol](../concepts/model-context-protocol.md) is emerging as a standard interface for tool discovery and invocation. The [Tool Registry](../concepts/tool-registry.md) concept formalizes tool availability, versioning, and capability description.

## How It Works: Implementation Patterns

### The Perceive-Remember-Reason-Act Loop

The canonical loop in most LLM agent implementations:

1. Receive input from environment or user
2. Retrieve relevant memories (semantic search, graph traversal, or rule-based lookup)
3. Construct a working context from retrieved memories plus current input
4. Generate reasoning and select an action
5. Execute the action and observe results
6. Store outcomes back to memory with appropriate indexing

[Context Engineering](../concepts/context-engineering.md) sits at step 3 — deciding exactly what to put in the context window to maximize reasoning quality within token constraints.

### Memory Storage and Retrieval

Cognee's implementation shows the state of the art. It runs `cognee.add()` to ingest documents, `cognee.cognify()` to build a knowledge graph from them, and `cognee.search()` to query via combined vector and graph traversal. The key mechanism is continuous learning: as new documents come in, the graph updates to reflect changed relationships, not just append new vectors [Source](../raw/repos/topoteretes-cognee.md).

OpenMemory's architecture adds temporal reasoning. Each fact stores `valid_from` and `valid_to` fields. When a new fact contradicts an old one, the system closes the old fact's validity window rather than storing conflicting embeddings. Point-in-time queries become possible: "what did the system believe about CompanyX's CEO on January 1, 2023?" [Source](../raw/repos/caviraoss-openmemory.md).

### Context Construction

The [Agent Memory](../concepts/agent-memory.md) taxonomy maps storage types to context assembly. [Short-Term Memory](../concepts/short-term-memory.md) is the context window itself. [Long-Term Memory](../concepts/long-term-memory.md) requires retrieval decisions — what to pull from external stores and in what form. [Context Compression](../concepts/context-compression.md) summarizes or prunes lower-priority content to make room for higher-priority retrievals.

Ars Contexta implements a specific mechanism: spawning fresh subagents per processing phase to avoid context degradation. Each phase — Reduce, Reflect, Reweave — runs in a clean context window via the `/ralph` command, which reads the task queue, spawns a subagent, and parses a structured handoff document before advancing to the next phase [Source](../raw/repos/agenticnotetaking-arscontexta.md). This trades latency for reasoning quality.

### Multi-Agent Coordination

When multiple agents share a task, cognitive architecture must define how they share memory and coordinate. [Multi-Agent Systems](../concepts/multi-agent-systems.md) typically implement one of three patterns:

**Shared memory store**: agents read and write a common knowledge base. OpenMemory's server mode supports this with user-scoped and org-wide memory namespaces.

**Message passing**: agents communicate through structured messages, with no shared state. [AutoGen](../projects/autogen.md), [CrewAI](../projects/crewai.md), and [LangGraph](../projects/langgraph.md) all implement variations.

**Hierarchical orchestration**: a [Meta-Agent](../concepts/meta-agent.md) decomposes tasks and routes subtasks to specialist agents, then aggregates results. [MetaGPT](../projects/metagpt.md) formalizes this with role-based agents in a software engineering workflow.

### Self-Improvement

Self-improving architectures add a feedback loop where agents modify their own procedures based on outcome evaluations. The critical memory problem this creates: tracking which self-modifications succeed or fail across sessions, to prevent degenerate loops where the agent repeatedly applies the same broken fix [Source](../raw/tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md). [EvoAgentX](../projects/evoagentx.md), [AgentEvolver](../projects/agentevolver.md), and [Darwin Gödel Machine](../projects/darwin-godel-machine.md) address this with persistent modification logs and evaluation registries.

## Implementations

**[Letta](../projects/letta.md)** (formerly MemGPT): pioneered explicit [Core Memory](../concepts/core-memory.md) plus [Archival Memory](../concepts/long-term-memory.md) architecture, with the agent calling memory tools to read and write external storage within its context.

**[LangGraph](../projects/langgraph.md)**: implements cognitive architecture as a stateful graph where nodes are processing steps and edges are transitions. State persists across the graph, enabling loops and branches.

**[ACE](../projects/ace.md)** (Autonomous Cognitive Entity): implements a layered architecture with six levels from hardware interaction up to aspirational values, directly mapping to cognitive science models.

**[OpenAI](../projects/openai.md)**: GPT-4 and GPT-4o with function calling and the [Assistants API](../projects/openai-agents-sdk.md) implement a perceive-reason-act loop with persistent thread-level memory.

**[Anthropic](../projects/anthropic.md)**: [Claude](../projects/claude.md) with tool use and [CLAUDE.md](../concepts/claude-md.md) for procedural context implements lightweight cognitive architecture within the coding agent domain.

**[DSPy](../projects/dspy.md)**: treats the reasoning module as a learnable program, optimizing prompts for each module based on end-to-end task performance rather than hand-engineering them.

## Failure Modes

**Memory staleness**: semantic memory filled at time T contains facts that contradict current reality. Without explicit temporal reasoning, the agent retrieves stale information with high confidence. The fix requires either temporal validity fields (OpenMemory's approach) or periodic memory consolidation with conflict resolution.

**Context pollution**: poor retrieval precision fills the context window with low-relevance memories, degrading reasoning quality. This is the [Lost in the Middle](../concepts/lost-in-the-middle.md) problem applied to memory retrieval. Composite scoring — combining vector similarity with recency and salience — partially mitigates this.

**Action-memory coupling failure**: the agent takes an action, stores the outcome incorrectly, and retrieves that incorrect outcome on the next similar task. This compounds across sessions. [Execution Traces](../concepts/execution-traces.md) stored alongside outcomes help diagnose this, but require additional storage and retrieval infrastructure.

**Degenerate self-improvement loops**: self-modifying agents that store modifications without tracking outcomes can repeatedly apply the same failing patch. Architecturally, this requires a separate evaluation memory that tracks modification history independently from the modification itself.

## Infrastructure Assumptions

Two assumptions embedded in most cognitive architecture implementations that documentation doesn't surface:

First, most implementations assume low-latency access to external memory stores. Graph traversal on [Neo4j](../projects/neo4j.md) and vector search on [Qdrant](../projects/qdrant.md) can add 50-500ms per retrieval step. Architectures with multiple retrieval steps per reasoning cycle accumulate this latency. At scale with concurrent users, this becomes a database contention problem that requires read replicas and caching layers not mentioned in any of the README-level documentation.

Second, multi-agent shared memory assumes consistent serialization semantics. When two agents write to the same memory store concurrently, the merge behavior is implementation-defined and often undocumented. Most systems silently last-write-wins, which causes correctness failures in parallel agent workflows.

## When Not to Use a Full Cognitive Architecture

Single-turn tasks with no need for persistent state don't benefit from architectural overhead. If your agent answers a question, returns a result, and is done, a RAG pipeline or direct LLM call with retrieval is simpler and faster.

Tasks where context fits comfortably in one window don't need external memory retrieval. Adding retrieval steps introduces latency and retrieval errors for no benefit.

High-throughput, low-latency applications find architectural overhead from memory retrieval, context assembly, and multi-step reasoning loops incompatible with response time requirements.

## Unresolved Questions

Memory conflict resolution protocols are underdocumented across all major implementations. When two facts contradict, who decides which is true and by what rule? OpenMemory's temporal approach handles the "same fact changes over time" case but not "two sources disagree about the same time."

Cost accounting at scale remains opaque. Architectures with multiple retrieval and reasoning steps per user turn multiply LLM API costs nonlinearly. None of the implementations surveyed publish cost-per-session numbers or provide guidance on cost ceilings.

The governance question for shared memory in multi-tenant systems — who can read whose memories, how isolation is enforced, what audit trails exist — is treated as an infrastructure problem in most documentation but is actually an architectural decision with security implications.

## Alternatives and Selection Guidance

Use **direct [RAG](../concepts/retrieval-augmented-generation.md)** when your task is question answering over a fixed corpus with no need for state persistence or multi-step action.

Use **[ReAct](../concepts/react.md) without external memory** when your task fits in a single context window and requires tool use but not persistent learning.

Use **[Letta](../projects/letta.md)** when you need production-ready persistent memory with explicit memory management tools and tenant isolation.

Use **[LangGraph](../projects/langgraph.md)** when you need fine-grained control over agent state transitions and want to compose complex workflows from reusable nodes.

Use **[DSPy](../projects/dspy.md)** when prompt engineering is your bottleneck and you want to optimize reasoning module performance systematically.

Use a **full cognitive architecture with multiple memory types and graph storage** when your agent operates across long time horizons, accumulates domain-specific knowledge, coordinates with other agents, or needs to explain why it recalled specific information.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- [ReAct](../concepts/react.md)
- [Reflexion](../concepts/reflexion.md)
- [Self-Improving Agents](../concepts/self-improving-agents.md)
- [Core Memory](../concepts/core-memory.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Semantic Memory](../concepts/semantic-memory.md)
- [Procedural Memory](../concepts/procedural-memory.md)
