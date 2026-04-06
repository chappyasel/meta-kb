---
entity_id: cognitive-architecture
type: concept
bucket: agent-systems
abstract: >-
  Cognitive architecture defines how an AI agent structures memory, reasoning,
  planning, and action into coordinated subsystems — analogous to how cognitive
  science models the human mind's functional organization.
sources:
  - repos/agenticnotetaking-arscontexta.md
  - repos/topoteretes-cognee.md
  - repos/caviraoss-openmemory.md
related: []
last_compiled: '2026-04-05T23:11:58.955Z'
---
# Cognitive Architecture

## What It Is

Cognitive architecture is the structural blueprint for an intelligent agent's mental capabilities. It specifies which components exist (memory, perception, reasoning, planning, action), how they interact, and what constraints govern their coordination. The term originates from cognitive science, where researchers like Allen Newell and John Anderson developed models such as SOAR and ACT-R to explain human cognition. In AI agent systems, cognitive architecture has become the dominant design vocabulary for agents that must maintain state, reason across sessions, and act in dynamic environments.

A cognitive architecture is not a single algorithm or module. It is a system of systems, each handling a distinct cognitive function, integrated through defined interfaces. When builders talk about an agent "having memory" or "being able to plan," they are implicitly describing architectural choices about which cognitive subsystems the agent has and how those subsystems communicate.

## Why It Matters

Stateless LLM calls produce agents that forget everything between turns. A user mentions an allergy in one session; the agent acts oblivious in the next. A coding assistant learns a codebase's conventions; they vanish when the context window clears. Cognitive architecture is the answer to this problem at a structural level.

Beyond persistence, cognitive architecture determines an agent's ceiling. An agent without a planning subsystem can react but not strategize. An agent without episodic memory can answer questions but cannot learn from its own history. An agent without a reflective component cannot detect when its own beliefs are inconsistent. The architecture sets what is even possible before any specific capability is implemented.

## Core Components

### Memory Systems

Most cognitive architectures distinguish several memory types, borrowed from cognitive science:

**Episodic memory** stores specific past events and their context: "On March 5, the user asked for a refund and was escalated to tier 2." It is sequential and contextually rich.

**Semantic memory** stores general facts and knowledge structures: "The user prefers TypeScript. The codebase uses PostgreSQL." It is declarative and topic-indexed.

**Procedural memory** stores learned routines and skills: "To analyze a SQL query, first check the FROM clause, then joins, then WHERE conditions." It is action-oriented and often implicit.

**Working memory** is the agent's active context window: what it currently holds in attention. This is the most constrained resource, bounded by context length.

Some systems add **emotional memory** (valence-tagged events that shape future responses) and **reflective memory** (meta-cognitive insights the agent has developed about its own patterns). OpenMemory's architecture, for instance, implements all five sectors with separate classification, scoring, and decay logic for each.

### Reasoning

Reasoning components process inputs against current knowledge to produce conclusions or inferences. In practice, this is often the LLM itself, but architecturally distinct from memory retrieval. A reasoning component might perform:

- **Deductive reasoning**: applying rules to facts to derive new facts
- **Analogical reasoning**: mapping a current problem to a solved prior problem
- **Abductive reasoning**: inferring the most likely cause of observed evidence

The Cognee system grounds reasoning in a hybrid graph/vector structure, where queries traverse relationship edges rather than operating purely on semantic similarity. This forces the reasoning component to consider how concepts connect, not just how similar they are.

### Planning

Planning generates a sequence of actions to achieve a goal. It requires the agent to model future states, not just current ones. Planning architectures vary along several dimensions:

- **Depth**: single-step (reactive) vs. multi-step (deliberative)
- **Revision**: fixed plans vs. re-planning when the environment changes
- **Representation**: symbolic plans (steps listed explicitly) vs. latent plans (encoded in model weights or prompts)

The Ars Contexta plugin implements a 6-phase processing pipeline (Record → Reduce → Reflect → Reweave → Verify → Rethink) that functions as a procedural plan for knowledge management. Each phase runs in its own context window via subagent spawning, addressing a real constraint: LLM attention degrades as context fills, so fresh contexts per phase maintain reasoning quality.

### Action

Action components translate plans into effects: API calls, file writes, database queries, tool invocations. In agent systems, the action component must handle:

- **Tool selection**: which tool achieves the current sub-goal
- **Error handling**: what to do when an action fails
- **Side effects**: tracking what changed in the world after acting

### Perception

Perception is the interface between the agent and its environment. For LLM agents, this includes text inputs, tool call results, retrieved memories, and structured data from external systems. Perception components may perform filtering, summarization, or classification before passing information to reasoning.

## How Components Interact

The interaction topology matters as much as the components themselves. Two major patterns:

**Sequential pipelines** pass information through components in fixed order: perceive → remember → reason → plan → act. Ars Contexta's `/ralph` orchestrator exemplifies this: read queue, spawn subagent for each phase, parse handoff, advance. The structure is predictable and debuggable, but struggles with tasks that require cycling back.

**Blackboard architectures** have components read from and write to a shared working memory. Any component can trigger any other based on what appears in the shared space. SOAR, the classic cognitive architecture, uses a variant of this. It is more flexible but harder to trace.

Modern LLM agent frameworks tend toward a hybrid: a primary reasoning loop with access to memory retrieval and tool execution, plus hooks that fire on specific events. The hooks in Ars Contexta (Session Orient, Write Validate, Auto Commit, Session Capture) implement this pattern: components that react to specific events rather than running in every cycle.

## Memory Retrieval Mechanisms

The retrieval strategy is where most cognitive architecture implementations differ in practice.

**Vector similarity search** embeds memories and queries in the same space, then retrieves by cosine distance. Fast and general, but retrieves by semantic surface similarity rather than structural relevance. Two facts that sound similar retrieve together even if their relationship is irrelevant to the query.

**Graph traversal** retrieves by relationship structure. Cognee combines vector search with graph databases so queries can follow edges: "what entities is this concept connected to, and how?" This captures relational reasoning that pure embedding retrieval misses.

**Composite scoring** weights multiple signals: recency, salience, co-activation frequency, embedding similarity. OpenMemory's recall engine computes composite scores across these dimensions rather than relying on any single signal. This mimics the human memory observation that we recall things that are recent, emotionally salient, and frequently associated with current context.

**Temporal indexing** is a less common but important mechanism. OpenMemory's temporal knowledge graph tracks `valid_from` and `valid_to` for facts, supports point-in-time queries, and handles contradictions by closing old validity windows when new facts arrive. This lets an agent reason about what was true at a specific time, not just what is currently known.

## Memory Decay and Reinforcement

Cognitive systems do not treat all memories as equally persistent. Human memory strengthens with use and fades with disuse. Architecturally, decay mechanisms prevent memory stores from accumulating noise indefinitely. Reinforcement mechanisms strengthen memories that prove relevant.

OpenMemory implements adaptive forgetting per sector: episodic memories decay faster than semantic ones, matching the cognitive science observation that event details fade faster than general knowledge. The `reinforce` operation strengthens a memory's salience weight when it proves useful. This is not cosmetic — without decay, retrieval quality degrades as stores grow, because low-quality memories dilute high-quality results.

## Grounding in Cognitive Science

Several cognitive architectures in active AI research trace directly to human cognitive models:

**ACT-R** (Adaptive Control of Thought-Rational) separates declarative memory (facts) from procedural memory (production rules) and simulates how each is retrieved and fired. Modern LLM agent systems often implement this split implicitly.

**SOAR** uses a single universal learning mechanism: impasse-driven chunking. When SOAR cannot resolve a problem with existing knowledge, it explores sub-goals until it finds a solution, then compiles that solution into a new production rule. This is a model for how agents can learn from failure.

**Global Workspace Theory** proposes that consciousness corresponds to information being broadcast to many specialized modules simultaneously. Some agent architectures implement this as a shared context that all reasoning modules can read, with competitive selection determining what gets broadcast.

Ars Contexta's 249 research claims include cognitive science grounding for specific design choices: context-switching cost research (Leroy 2009) justifies the MOC hierarchy, spreading activation theory justifies wiki-link structures, progressive disclosure principles justify the description field architecture.

## Implementation Decisions and Tradeoffs

**Context window as working memory**: The LLM's context window is not infinite. Every architectural choice about what to load into context is a working memory decision. Systems that naively load everything degrade at scale. Ars Contexta addresses this by spawning fresh subagents per pipeline phase, preventing context saturation from degrading reasoning quality.

**Separation of spaces**: Ars Contexta's three-space architecture (self/, notes/, ops/) implements a functional separation between identity/methodology, knowledge, and operational state. This maps to the architectural principle that different memory types require different access patterns and update frequencies.

**Distributed vs. centralized memory**: OpenMemory supports both embedded local memory (SQLite) and a central server for multi-user scenarios. The architectural tradeoff: local memory has no latency and no privacy risk, but cannot be shared across agents. Central memory enables cross-agent knowledge sharing but introduces coordination overhead.

**Graph vs. vector retrieval**: Pure vector retrieval is simpler to implement but misses relational structure. Cognee's graph-RAG approach adds complexity but enables queries like "what concepts are adjacent to this one, and through what relationships?" The tradeoff is operational: graph databases require more infrastructure than vector stores.

## Failure Modes

**Memory store degradation**: Without decay mechanisms, memory stores accumulate low-quality entries. Retrieval quality falls as noise accumulates. This is the cognitive equivalent of a cluttered desk: technically everything is there, but finding what matters gets harder.

**Context window overflow**: Naively designed pipelines load all relevant memories into a single context, which eventually exceeds the window or degrades quality before the limit. Systems without fresh-context strategies per task suffer from this silently — the agent produces outputs but reasoning quality has degraded.

**Retrieval mismatch**: Vector similarity retrieves semantically similar content, not contextually relevant content. An agent asked about a user's preference for dark mode may retrieve all their aesthetic preferences, diluting the specific fact with tangentially related material. Composite scoring partially addresses this; graph traversal addresses it more directly.

**Architectural drift**: In systems with reflective memory or self-modifying architectures, the agent's behavior can drift from its intended design over time. Ars Contexta's `/reseed` command exists specifically for this: re-deriving the architecture from first principles when accumulated drift makes the system unreliable.

**Memory isolation failures**: In multi-agent or multi-user systems, improper isolation can leak memories across users or agents. This is both a security failure and a cognitive architecture failure — the agent's episodic memory becomes contaminated with events that belong to a different identity.

## Who Implements It

The major frameworks approach cognitive architecture differently:

**Cognee** builds around a graph/vector hybrid knowledge engine, emphasizing the relational structure of memory. Its architecture treats knowledge as a dynamic graph that evolves as data changes. [Source](../raw/repos/topoteretes-cognee.md)

**OpenMemory** implements a multi-sector memory model with temporal indexing, decay, and composite scoring, prioritizing biological plausibility and explainability. Its architecture separates memory sectors by type and handles time as a first-class dimension. [Source](../raw/repos/caviraoss-openmemory.md)

**Ars Contexta** implements cognitive architecture at the level of the agent's persistent thinking system — the folder structure, processing pipeline, hooks, and navigation maps that constitute how an agent reasons about a specific domain over time. Its architecture derives from research claims rather than templates. [Source](../raw/repos/agenticnotetaking-arscontexta.md)

## Practical Implications

When designing or evaluating an agent system, cognitive architecture questions translate directly into product decisions:

- Does the agent need to remember user preferences across sessions? Semantic memory with persistence.
- Does the agent need to learn from its own mistakes? Episodic memory plus reflective memory.
- Does the agent coordinate with other agents? Shared semantic memory with isolation guarantees.
- Does the agent work in a domain where facts change over time? Temporal knowledge graph.
- Does the agent run long, complex tasks? Fresh-context planning with working memory management.

The architecture is not separable from the product. An agent without a planning component cannot reliably complete multi-step tasks. An agent without memory decay will degrade over time. An agent without episodic memory cannot adapt to individual users. These are not implementation details — they determine what the agent can and cannot do, regardless of the model quality underneath.
