---
entity_id: cognitive-architecture
type: concept
bucket: agent-architecture
abstract: >-
  Cognitive architecture defines how an AI agent perceives, remembers, reasons,
  and acts — distinguishing modern LLM-based agents from pure prompt chains
  through structured, persistent, and composable mental subsystems.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/topoteretes-cognee.md
  - repos/caviraoss-openmemory.md
related:
  - retrieval-augmented-generation
  - openai
  - context-engineering
  - knowledge-graph
last_compiled: '2026-04-08T02:56:29.327Z'
---
# Cognitive Architecture

## What It Is

Cognitive architecture is the structural blueprint governing how an intelligent agent processes information across perception, memory, reasoning, and action. The term originates in cognitive science, where researchers like Allen Newell and John Anderson built computational models of human cognition (SOAR, ACT-R) to explain how memory retrieval, attention, and goal-directed behavior compose into general intelligence.

Applied to LLM agents, cognitive architecture answers a concrete engineering question: given that a language model is stateless and amnesiac by default, what persistent structures and processing loops make it capable of purposeful, coherent behavior across time?

The distinction matters. A single prompt-response cycle is not an architecture. An architecture specifies *how* information flows between subsystems, *what* gets persisted, *when* reasoning strategies switch, and *who* coordinates multiple agents working in parallel.

## Why It Matters

Without deliberate cognitive architecture, LLM agents hit a ceiling fast. They forget prior context, repeat mistakes, cannot plan beyond what fits in a context window, and fail to accumulate skill over time. Every session starts blank.

The core problem: language models are powerful reasoning engines but terrible memories. Cognitive architecture is the scaffolding that compensates for this, layering durable storage, retrieval logic, and coordination mechanisms on top of raw model capability. Projects like [MemGPT](../projects/memgpt.md) and [Letta](../projects/letta.md) were built precisely because prompt-stuffing context windows does not scale.

## Core Components

### Perception

Perception is the intake layer: parsing raw inputs (text, tool outputs, API responses, file contents) into representations the agent can reason about. In LLM agents this is less complex than in robotics, but preprocessing decisions matter. Chunking strategies, embedding quality, and modality handling all happen here. Poor perception degrades every downstream component.

### Memory Systems

Memory is where most cognitive architecture engineering happens, and where the field borrows most directly from cognitive science. Four types appear consistently across frameworks:

**Working / Short-Term Memory** is the active context window. Information here is immediately accessible but strictly bounded and ephemeral. The [Lost in the Middle](../concepts/lost-in-the-middle.md) problem is a working memory failure mode: models attend less to information placed in the middle of long contexts, regardless of relevance. [Context Engineering](../concepts/context-engineering.md) addresses this by controlling what enters and where.

**Episodic Memory** stores specific past events: conversation turns, actions taken, outcomes observed. [Episodic Memory](../concepts/episodic-memory.md) enables agents to say "last Tuesday I tried X and it failed." OpenMemory implements this as time-indexed entries with `valid_from`/`valid_to` fields on a temporal knowledge graph, allowing point-in-time queries. Without episodic memory, agents repeat the same errors.

**Semantic Memory** stores general knowledge: facts, concepts, relationships. [Semantic Memory](../concepts/semantic-memory.md) is typically encoded in vector stores or knowledge graphs and retrieved via similarity search. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is the dominant implementation pattern: embed documents, retrieve relevant chunks at query time, inject into context. The limitation is that pure vector retrieval is semantic similarity, not logical reasoning over relationships.

**Procedural Memory** encodes how to do things: skills, workflows, tool-use patterns. [Procedural Memory](../concepts/procedural-memory.md) manifests as saved prompts, workflow templates, or function libraries the agent can invoke. [Voyager](../projects/voyager.md) maintains a skill library that grows as the agent successfully completes new tasks in Minecraft, representing procedural memory accumulation in practice.

Projects like [Cognee](../projects/graphiti.md) attempt to unify these by combining vector search with graph databases, capturing not just what things mean but how they relate. The `cognee.cognify()` pipeline ingests documents and builds relationship structures that evolve as knowledge changes, rather than treating memory as a static embedding index.

[Agent Memory](../concepts/agent-memory.md), [Core Memory](../concepts/core-memory.md), and [Long-Term Memory](../concepts/long-term-memory.md) represent increasingly persistent tiers: core memory is always in context, long-term memory requires retrieval.

### Reasoning

Reasoning is where the model applies its intelligence to current context. Several patterns structure this:

**[Chain-of-Thought](../concepts/chain-of-thought.md)** prompts the model to reason step-by-step before answering, improving performance on complex tasks by externalizing intermediate reasoning into the context window.

**[ReAct](../concepts/react.md)** (Reason + Act) interleaves reasoning traces with tool calls: the agent thinks, acts, observes, thinks again. This loop is the backbone of most tool-using agents.

**[Reflexion](../concepts/reflexion.md)** adds a self-evaluation loop: after acting, the agent reflects on outcomes and stores verbal self-feedback as episodic memory, enabling learning from failure without gradient updates.

**Planning** extends reasoning across multiple future steps. Tree-of-Thought, MCTS-based planners, and hierarchical task decomposition all fall here.

The distinction between these patterns matters for architecture: Chain-of-Thought happens inside a single inference call. ReAct spans multiple calls with tool interleaving. Reflexion requires persistent memory between episodes. Each demands different infrastructure.

### Action

Action is the output layer: the agent's interface with the world. This includes tool calls (APIs, web browsers, code execution), file operations, spawning subagents, and producing final responses. Action capability defines an agent's surface area.

[Agent Skills](../concepts/agent-skills.md) are reusable action patterns. [Tool Registry](../concepts/tool-registry.md) is the cataloguing mechanism. Action without robust error handling and [Loop Detection](../concepts/loop-detection.md) produces agents that spin indefinitely or corrupt state.

### Metacognition

Metacognition is the agent's capacity to monitor and adjust its own processing. This includes uncertainty estimation, recognizing when to ask for help versus proceed, detecting when a strategy is failing, and updating beliefs about its own capabilities. [Human-in-the-Loop](../concepts/human-in-the-loop.md) is a metacognitive checkpoint. [Self-Improving Agents](../concepts/self-improving-agents.md) formalize this: the agent's architecture includes mechanisms to modify its own components based on performance.

The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) pushes this to its limit, attempting genuine self-modification of code. [EvoAgentX](../projects/evoagentx.md) and [AgentEvolver](../projects/agentevolver.md) explore evolutionary approaches. The critical unsolved problem: tracking which self-modifications succeed, and preventing degenerate feedback loops. Memory architecture becomes the bottleneck for self-improvement.

## Multi-Agent Coordination

When multiple agents collaborate, cognitive architecture scales into [Multi-Agent Systems](../concepts/multi-agent-systems.md). Each agent has its own cognitive architecture, but the system needs coordination primitives: shared memory, message passing, role assignment, and conflict resolution.

[MetaGPT](../projects/metagpt.md) assigns software development roles (PM, engineer, QA) to distinct agents, each with specialized reasoning patterns. [CrewAI](../projects/crewai.md) formalizes agent crews with explicit role definitions. [LangGraph](../projects/langgraph.md) models agent workflows as directed graphs, making coordination structure explicit and debuggable.

[Organizational Memory](../concepts/organizational-memory.md) is the shared-memory problem at the multi-agent level: how do agents pool what they learn without interfering with each other's working memory?

## Implementation Patterns

**Context Management** decides what enters working memory at each step. [Context Compression](../concepts/context-compression.md) reduces token cost. [Progressive Disclosure](../concepts/progressive-disclosure.md) injects detail progressively rather than dumping everything upfront. [Context Engineering](../concepts/context-engineering.md) is the discipline of doing this well.

**Knowledge Graphs** add relational structure to memory. [Knowledge Graph](../concepts/knowledge-graph.md) nodes represent entities; edges represent relationships. [GraphRAG](../projects/graphrag.md) and [HippoRAG](../projects/hipporag.md) use graph traversal to retrieve more coherent context than flat vector search. The tradeoff: graph construction and maintenance costs are significant.

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)** is the dominant pattern for semantic memory access. [Hybrid Search](../concepts/hybrid-search.md) combines dense vector search with sparse keyword matching (BM25) to improve retrieval recall. [Vector Database](../concepts/vector-database.md) systems like [ChromaDB](../projects/chromadb.md) and [Pinecone](../projects/pinatone.md) provide the storage layer.

**[Continual Learning](../concepts/continual-learning.md)** updates the agent's knowledge without full retraining. [Memory Evolution](../concepts/memory-evolution.md) handles how stored memories should change as new information arrives, including conflict resolution and temporal reasoning.

## Concrete Implementations

Several projects demonstrate how these components assemble into working architectures:

[Letta](../projects/letta.md) (MemGPT's evolution) implements explicit memory tiers: core memory always in context, archival memory retrieved on demand. The OS-inspired metaphor treats the context window as RAM and external storage as disk, with explicit read/write operations.

The [Ars Contexta](../repos/agenticnotetaking-arscontexta.md) plugin generates domain-specific cognitive architectures through conversation, producing folder structure, processing pipelines, templates, and hooks calibrated to how a user actually thinks. Its three-space architecture (self/, notes/, ops/) separates agent identity, knowledge, and operational state. The `/ralph` command runs phases in isolated context windows via subagent spawning, preventing attention degradation across the processing pipeline.

OpenMemory distinguishes itself by typing memory into sectors (episodic, semantic, procedural, emotional, reflective) rather than treating all memories as undifferentiated embeddings, and adding a temporal knowledge graph with `valid_from`/`valid_to` timestamps. This supports queries like "what did the agent know on a specific date."

[ACE](../projects/ace.md) (Autonomous Cognitive Entity) implements a layered model directly inspired by cognitive science, with explicit aspiration, global strategy, agent model, executive function, cognitive control, and task prosecution layers.

## Failure Modes

**Memory-Reasoning Mismatch**: The agent retrieves plausible memories but reasons incorrectly from them. Vector similarity retrieves semantically similar content, not necessarily relevant content. A query about "project deadline" retrieves everything mentioning deadlines, not specifically the current project's.

**Context Window Saturation**: Aggressive memory injection fills the context window, degrading reasoning quality. The [Lost in the Middle](../concepts/lost-in-the-middle.md) effect worsens with longer contexts. Architectures that inject too many retrieved memories without compression hit this ceiling quickly.

**Degenerate Self-Improvement Loops**: Self-improving architectures that modify their own prompts or skill libraries based on performance feedback can enter feedback loops where a bad modification produces worse outputs, which the evaluation loop misinterprets as good. Tracking modification history and maintaining rollback capability is essential infrastructure most frameworks do not provide out of the box.

**Cross-Agent Memory Pollution**: In multi-agent systems, shared memory stores allow agents to overwrite each other's memories. Without isolation or versioning, a specialized agent's domain-specific writes corrupt generalizable memory.

## Unresolved Questions

How memory conflicts get resolved remains underspecified across frameworks. When two episodic memories contradict each other, most systems either overwrite (last-write-wins) or accumulate (both stored, retrieval returns both). Neither is principled.

Evaluation methodology for cognitive architectures is immature. [SWE-bench](../projects/swe-bench.md), [GAIA](../projects/gaia.md), and [Tau-bench](../projects/tau-bench.md) test agent capabilities but not specific architectural choices. It is difficult to isolate the contribution of a particular memory design versus a better base model.

The cost of maintaining rich cognitive architectures at scale is rarely discussed in framework documentation. Graph databases, vector stores, temporal knowledge graphs, and multi-sector memory classifiers each add latency and cost. Real-world deployments often collapse sophisticated architectures back to simpler patterns under production constraints.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [ReAct](../concepts/react.md)
- [Reflexion](../concepts/reflexion.md)
- [Self-Improving Agents](../concepts/self-improving-agents.md)
- [Knowledge Graph](../concepts/knowledge-graph.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Procedural Memory](../concepts/procedural-memory.md)
- [Context Management](../concepts/context-management.md)
- [Human-in-the-Loop](../concepts/human-in-the-loop.md)
