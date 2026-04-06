---
entity_id: context-database
type: concept
bucket: context-engineering
abstract: >-
  A persistent store purpose-built for LLM agent context: structured retrieval
  over agent history, memories, and knowledge with tiered loading to control
  token consumption.
sources:
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - repos/volcengine-openviking.md
  - deep/repos/volcengine-openviking.md
related: []
last_compiled: '2026-04-06T02:18:15.072Z'
---
# Context Database

A context database is a persistent storage system purpose-built for LLM agents. It organizes, retrieves, and delivers contextual information across agent sessions, managing the full lifecycle of agent memory: what the agent knows, what it has done, and what it needs next.

The term covers a range of implementations, from simple vector stores with metadata filters to sophisticated hierarchical systems with tiered content loading. What distinguishes a context database from a general-purpose database or a standard [Vector Database](../concepts/vector-database.md) is its orientation toward agent cognition: it answers not just "find similar documents" but "what context does this agent need right now, and how much of it can fit in the available token budget?"

## Why Agents Need Purpose-Built Context Storage

A standard [Retrieval-Augmented Generation](../concepts/rag.md) pipeline treats retrieval as a one-shot operation: embed the query, find similar chunks, stuff them into the prompt. This works for single-turn document QA. It breaks down for agents with extended task horizons.

Agents accumulate state across tool calls, sub-tasks, and sessions. A coding agent needs its prior decisions about architecture. A customer support agent needs the history of this user's escalations. A research agent needs what it tried last session and why it failed. None of these fit the flat "bag of chunks" model.

The concrete failure modes of naive RAG for agents:

- **Token waste**: Retrieving full documents when only a summary was needed. A 50,000-token codebase costs the same to load whether you needed one function or all of it.
- **Structural blindness**: Flat vector search finds semantically similar chunks but loses the relationship between them. "Authentication handler" and "authentication middleware" may be adjacent in the codebase but unrelated in the embedding space.
- **Session amnesia**: Each new conversation starts cold. Prior decisions, user preferences, and learned patterns disappear.
- **Unobservable retrieval**: When the agent makes a bad decision, you cannot inspect which context it had or why the retrieval returned what it returned.

[Context Engineering](../concepts/context-engineering.md) treats the construction of agent context as a first-class problem. A context database is the infrastructure layer that makes systematic context engineering possible.

## Core Mechanisms

### Tiered Content Loading

The most direct way to control token consumption is to load content at different levels of detail depending on what the agent actually needs. Most context databases that implement this use three tiers:

**Abstract (L0)**: A sentence-level summary. Enough for the agent to decide whether a piece of content is relevant without reading it. Token cost under 100.

**Overview (L1)**: Structure, key points, usage patterns. Enough for the agent to plan actions. Token cost in the low thousands.

**Detail (L2)**: Full content. Loaded only when the agent needs to read or modify the specific artifact.

OpenViking (built by ByteDance's Volcengine team) implements this explicitly as `ContextLevel.ABSTRACT`, `ContextLevel.OVERVIEW`, and `ContextLevel.DETAIL` in `openviking/core/context.py`. The `Summarizer` class processes every ingested resource through a VLM pipeline to generate `.abstract.md` and `.overview.md` files alongside the full content. On the LoCoMo10 benchmark (1,540 long-range dialogue cases), this tiered approach reduced input tokens by 83% while improving task completion by 49% over baseline. These numbers are self-reported by the OpenViking team with a published evaluation script, not independently verified.

The tradeoff is front-loaded cost: VLM summarization at ingestion time is expensive. You pay once to generate the summaries and save repeatedly on retrieval.

### Hierarchical Organization and Structured Retrieval

Flat vector search has a ceiling: it finds chunks that match the query but loses the structural relationships between chunks. A context database designed for agents often imposes structure on top of vector retrieval.

The filesystem paradigm, used by OpenViking, maps all agent context to a virtual directory tree under a `viking://` protocol:

```
viking://
├── resources/       # Ingested documents, code, web pages
├── user/            # User preferences and interaction history
└── agent/           # Agent skills and operational memory
```

Retrieval is then a two-phase operation: first locate the relevant directory using vector search, then recursively refine within that directory. The agent can also navigate deterministically with `ls` and `read` operations, bypassing semantic search entirely for known paths.

[Knowledge Graph](../concepts/knowledge-graph.md) systems like [Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md) take a different approach: rather than a hierarchy, they represent context as entities and relationships in a graph. This handles many-to-many relationships that hierarchies cannot (a document about "authentication performance" naturally belongs under both topics), but requires more complex query patterns.

[Hybrid Retrieval](../concepts/hybrid-retrieval.md) systems like [HippoRAG](../projects/hipporag.md) combine dense vector search with sparse keyword matching ([BM25](../concepts/bm25.md)) and graph traversal. The intuition: different query types need different retrieval strategies, and the optimal context database routes to the right strategy based on the query.

### Memory Type Segregation

Agent context is not homogeneous. A context database that treats all content the same will retrieve the wrong content for the wrong task.

Most mature context databases distinguish at least:

**[Episodic Memory](../concepts/episodic-memory.md)**: Records of what happened in past sessions. User asked about billing on March 3rd. Agent executed a file rename that broke the build. Episodic memory is time-indexed and specific.

**[Semantic Memory](../concepts/semantic-memory.md)**: General knowledge about the domain. How the authentication module works. What the company's refund policy is. Semantic memory is timeless and relational.

**[Procedural Memory](../concepts/procedural-memory.md)**: Learned patterns for how to do things. The sequence of steps to set up a dev environment. Which tools to call in which order for database migrations. Procedural memory is action-oriented.

**[Core Memory](../concepts/core-memory.md)**: High-priority facts that always enter the context. User's name and preferences. Current project. Core memory is small and always-on.

[Letta](../projects/letta.md) (formerly MemGPT) pioneered explicit memory type management for agents, with different storage backends and retrieval strategies for each type. [Mem0](../projects/mem0.md) takes a lighter approach, extracting facts from conversations and storing them in a hybrid vector-graph store without requiring the developer to categorize memory types explicitly.

### Session Memory and Self-Evolution

A context database that only stores what you explicitly write to it will not improve over time. Self-evolving context databases extract durable memories from agent interactions automatically.

The pattern: at session end (or continuously in the background), a summarization pipeline analyzes the conversation, extracts persistent facts, and writes them to the appropriate memory store. User mentioned they prefer TypeScript goes into user preferences. Agent discovered that the database migration must run before the schema update goes into procedural memory.

OpenViking's `Summarizer` class handles this through a `SemanticQueue` that processes sessions asynchronously. The system writes extracted memories to `viking://user/memories/` and `viking://agent/skills/`, making them available in subsequent sessions without any developer intervention.

The risk is noise: automatic extraction can preserve irrelevant fragments and there is no quality gate by default. Over time, the memory store accumulates low-quality content that degrades retrieval precision. Systems like [Mem0](../projects/mem0.md) address this with conflict detection (new memories that contradict existing ones trigger a merge or replace operation), but this adds latency and requires careful tuning.

### Decision Trace Storage

Beyond document and conversation memory, a category of context database stores the reasoning traces of agent decisions: what context was available, what policy was applied, what exception was granted, and who approved it.

This pattern, sometimes called a [Context Graph](../concepts/context-graphs.md), is most relevant for enterprise agent deployments where auditability and precedent matter. A support agent that escalated a ticket to Tier 3 should record not just the outcome but the inputs: the customer's ARR, the two open incidents, the SLA terms, and the prior escalation thread. The next time a similar case appears, the agent can retrieve that precedent rather than re-deriving the logic from scratch.

[Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md) implement variants of this: entities connected by typed edges that record temporal relationships and decision context. The value compounds over time: each agent decision adds another trace, and the accumulated graph becomes organizational memory that persists across agent versions and team changes.

## Implementation Approaches

### When to Use a Vector Database Directly

For single-session RAG, a general-purpose [Vector Database](../concepts/vector-database.md) like [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), or [Pinecone](../projects/pinecone.md) with metadata filters is sufficient. Add a field for `session_id` or `user_id`, filter on it at query time, and you have basic context isolation. This works when:

- The agent does not need to persist state across sessions
- All context is the same type (no need for episodic vs. semantic distinction)
- Token budget is not a constraint (no need for tiered loading)
- The retrieval pipeline is simple enough that a black box is acceptable

### When to Use a Purpose-Built Context Database

Purpose-built systems earn their complexity when:

- The agent runs across multiple sessions and needs persistent memory
- Token budgets are tight and tiered loading would reduce costs meaningfully
- Debugging retrieval failures is important (observability into the retrieval trajectory)
- The agent needs to learn from experience rather than starting fresh each session
- Multiple agents share a knowledge base and need namespace isolation

[LangChain](../projects/langchain.md) and [LlamaIndex](../projects/llamaindex.md) provide retrieval abstractions that sit above individual vector stores, adding metadata filtering, re-ranking, and multi-index routing. These are composition layers rather than context databases, but they can approximate some context database functionality when combined with the right storage backends.

[LangGraph](../projects/langgraph.md) adds state persistence to agent graphs, storing intermediate results and enabling checkpoint-based recovery. This is closer to session state management than a context database, but it addresses the session amnesia problem for agents that run inside LangGraph's framework.

### The URI / Path Model

Organizing agent context under a path-based addressing scheme (like OpenViking's `viking://` protocol) has practical consequences for agent behavior. Agents can request specific URIs deterministically rather than relying entirely on semantic search. This matters when the agent knows it needs the authentication module documentation specifically, not just something about authentication.

The downside: URI design is difficult. Content with multiple relevant categories forces an arbitrary hierarchy decision. Renaming or reorganizing content invalidates existing URIs and any references to them. The filename-as-URI collision problem (two files with the same name in different directories) can cause data corruption if not handled carefully.

Graph-based addressing (entity ID + relationship type) handles polyhierarchy better but requires graph query syntax rather than simple path strings.

## Failure Modes

**Summarization drift**: VLM-generated summaries at L0 and L1 may not accurately represent L2 content. Over many summarization cycles (or for highly technical content), the abstract diverges from the detail. There is no standard mechanism to detect or correct this.

**Embedding model lock-in**: Vector indexes are tied to the embedding model used at ingestion. Switching models requires re-indexing all content. For large deployments, this is expensive enough to prevent migration even when a better model is available.

**Retrieval precision degradation**: Automatic session memory extraction adds content to the store with no quality gate. Over time, irrelevant or low-quality memories accumulate and reduce precision. This requires either periodic curation (manual or agent-driven) or aggressive conflict detection.

**Cold start cost**: The front-loaded cost of ingestion and summarization delays time-to-value for new users. For large codebases or document collections, this can take hours and significant LLM tokens before the system returns useful context.

**Structural mismatch for cross-cutting concerns**: Hierarchical organization forces content into a single parent. A document relevant to multiple topics either gets duplicated or placed arbitrarily. Graph-based systems handle this better, but at the cost of query complexity.

## Relationship to Adjacent Concepts

A context database implements [Agent Memory](../concepts/agent-memory.md) at the infrastructure level. Where agent memory is the conceptual framework (what should persist and why), a context database is the storage and retrieval system that makes it work in practice.

[Memory Consolidation](../concepts/memory-consolidation.md) describes the process of compressing, merging, and prioritizing memories over time. A context database provides the substrate; consolidation is the process that keeps it useful as it grows.

[Agentic RAG](../concepts/agentic-rag.md) describes retrieval pipelines where the agent controls the retrieval strategy rather than executing a fixed query. A context database with hierarchical navigation enables agentic RAG: the agent can `ls` a directory, decide which subtree is relevant, then fetch specific documents rather than issuing a single semantic query and taking what comes back.

[Progressive Disclosure](../concepts/progressive-disclosure.md) is the context management strategy that tiered loading implements: present less information by default and allow the agent to request more when needed.

## When Not to Use a Purpose-Built Context Database

A purpose-built context database adds complexity: installation, configuration, a running server, an embedding model, and often a VLM for summarization. This overhead is not justified when:

- The agent is a single-session tool with no persistence requirement
- The knowledge base is small enough to fit in context directly
- The team does not have the infrastructure capacity to run and maintain an additional service
- The retrieval task is simple enough that a vector database with metadata filters handles it

Installation complexity is a real barrier. OpenViking, for example, requires Python 3.10+, Go 1.22+, a C++ compiler, and optionally Rust for the CLI. Community feedback identifies this as the primary adoption obstacle despite strong benchmark results.

## Representative Implementations

| System | Approach | Strength | License |
|--------|----------|----------|---------|
| [OpenViking](../projects/openclaw.md) | Filesystem hierarchy, L0/L1/L2 tiering | Token efficiency, observability | AGPL-3.0 |
| [Graphiti](../projects/graphiti.md) | Temporal knowledge graph | Relationship queries, episodic accuracy | Apache-2.0 |
| [Zep](../projects/zep.md) | Graph + vector hybrid | Long-term user memory | Apache-2.0 |
| [Mem0](../projects/mem0.md) | Automatic fact extraction | Low setup friction | Apache-2.0 |
| [Letta](../projects/letta.md) | Explicit memory types + pagination | Multi-agent, fine-grained control | Apache-2.0 |

Use Graphiti or Zep when relationship queries and temporal reasoning matter. Use Mem0 when you want automatic memory extraction with minimal configuration. Use Letta when you need explicit control over memory types and multi-agent memory sharing. Use OpenViking when token efficiency across large document collections is the primary concern and you can tolerate installation complexity.
