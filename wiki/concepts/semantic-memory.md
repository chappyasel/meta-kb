---
entity_id: semantic-memory
type: concept
bucket: agent-memory
abstract: >-
  Semantic memory stores factual knowledge and general concepts in AI agents,
  distinct from event memories or skill memories, implemented via vector
  databases, knowledge graphs, and RAG pipelines to give agents persistent,
  queryable world knowledge.
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/gustycube-membrane.md
  - repos/caviraoss-openmemory.md
  - repos/letta-ai-lettabot.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - episodic-memory
  - retrieval-augmented-generation
  - procedural-memory
  - openai
  - long-term-memory
  - letta
  - vector-database
  - core-memory
  - model-context-protocol
  - graphiti
  - zep
  - gemini
  - neo4j
  - community-detection
  - openmemory
  - hybrid-search
last_compiled: '2026-04-08T02:40:10.676Z'
---
# Semantic Memory

## What It Is

Semantic memory is the component of an agent's [Long-Term Memory](../concepts/long-term-memory.md) that holds general factual knowledge, concepts, and world information — things an agent "knows" rather than things it "experienced" or "knows how to do." The term comes directly from cognitive psychology, where Endel Tulving's 1972 distinction separates semantic memory (general knowledge: "Paris is the capital of France") from [Episodic Memory](../concepts/episodic-memory.md) (event-specific: "I visited Paris in 2019") and [Procedural Memory](../concepts/procedural-memory.md) (skills: "how to navigate a city").

In agent systems, this maps to a concrete architectural split. Semantic memory holds facts, relationships, and concepts that persist across sessions and are independent of when or how they were learned. An agent that knows a user's job title, the structure of a codebase, or the rules of a domain holds that knowledge in semantic memory. An agent that remembers the conversation where it learned those facts holds that in episodic memory.

## Why It Matters

Most LLM agents have a fundamental mismatch: the model's parametric knowledge (trained weights) is static, while the world and user context change continuously. Semantic memory bridges this gap by providing a dynamic, updateable store of facts that the agent can query at runtime.

Without semantic memory, agents either hallucinate outdated facts, lose context between sessions, or require increasingly large context windows stuffed with raw conversation history. With semantic memory, agents can answer "What does Alice do for work?" correctly even after hundreds of sessions, without re-reading every prior conversation.

The practical stakes are high for enterprise applications: product knowledge bases, customer profiles, evolving technical documentation, and organizational knowledge all require semantic memory to stay current. A customer support agent without semantic memory that can update its knowledge of the product will confidently give wrong answers about features that changed six months ago.

## How It Works

### Storage Layer

Semantic memory in agent systems is almost universally stored in one of three backing technologies:

**[Vector Database](../concepts/vector-database.md)**: Facts are encoded as dense vector embeddings, enabling semantic similarity search. Querying "where does Alice work?" retrieves "Alice is an engineer at Google" even without keyword overlap. Common backends include [ChromaDB](../projects/chromadb.md), [Pinecone](../projects/pinatone.md), and pgvector. The search quality depends on embedding model quality and the granularity of stored chunks.

**[Knowledge Graph](../concepts/knowledge-graph.md)**: Facts are stored as typed triples (Entity → Relationship → Entity) with relational queries. [Neo4j](../projects/neo4j.md), [Graphiti](../projects/graphiti.md), and [Zep](../projects/zep.md) use this approach. Graph storage enables structured queries ("What entities are connected to Alice within 2 hops?") that flat vector stores cannot express. [Graphiti](../projects/graphiti.md) stores facts as `EntityEdge` objects with fields like `source_node`, `target_node`, `relation_type` (SCREAMING_SNAKE_CASE), a natural language description, and temporal validity bounds.

**Hybrid**: [Hybrid Search](../concepts/hybrid-search.md) combines vector similarity with BM25 keyword search and graph traversal. [Graphiti](../projects/graphiti.md) runs three complementary methods in parallel — cosine similarity (semantic), BM25 (lexical), and breadth-first graph traversal (contextual) — targeting different similarity dimensions that no single method covers.

### Extraction Pipeline

Raw text does not enter semantic memory directly. Systems run extraction pipelines to identify and structure facts:

1. **Entity extraction**: Identify named entities (people, places, organizations, concepts) with type classification
2. **Relationship extraction**: Identify typed relationships between entities as fact triples
3. **Deduplication**: Compare new entities and facts against existing entries, merging duplicates ("NYC" = "New York City")
4. **Contradiction resolution**: Detect when new facts conflict with stored facts, then either update or invalidate the old fact

[Graphiti](../projects/graphiti.md) runs this as a four-stage LLM pipeline per episode (`add_episode()` in `graphiti_core/graphiti.py`): extract entities, resolve against existing entities, extract edges as typed triples, resolve edge contradictions with invalidation. Each stage uses Pydantic structured output for reliability.

[Mem0](../projects/mem0.md) takes a flatter approach, extracting atomic fact strings rather than typed triples, with LLM-based deduplication using integer candidate ID mapping.

[OpenMemory](../projects/openmemory.md) classifies memories into cognitive sectors (semantic, episodic, procedural, emotional, reflective) using regex pattern matching at ingest time, applying different decay rates per sector.

### Retrieval

At inference time, the agent queries semantic memory to retrieve relevant facts for the current context. Query patterns vary:

- **Similarity search**: Embed the query, find nearest-neighbor facts by cosine distance
- **Keyword search**: BM25 over fact text for exact term matching
- **Graph traversal**: Breadth-first search from anchor entities to surface contextually related facts
- **Hybrid with reranking**: Combine results from multiple methods, then rerank with cross-encoder models (e.g., [Graphiti](../projects/graphiti.md)'s `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` config)

The retrieved facts inject into the agent's context window, giving the model access to relevant knowledge without requiring the full knowledge base in context.

### Temporal Handling

A core engineering problem: facts change. "Alice works at Google" becomes false when Alice changes jobs. Systems handle this differently:

**Soft invalidation** ([Graphiti](../projects/graphiti.md)/[Zep](../projects/zep.md)): Expired facts get an `invalid_at` timestamp set but are not deleted. The bi-temporal model tracks both when a fact was true in the world (`valid_at`/`invalid_at`) and when the system knew about it (`created_at`/`expired_at`). This enables time-travel queries: "what did the system believe about Alice's employer as of January 2023?" The Zep paper (arXiv:2501.13956) reports +38.4% improvement on temporal reasoning tasks from this mechanism.

**Overwrite** (simpler systems): New facts replace old ones. Fast, but loses history.

**Decay** ([OpenMemory](../projects/openmemory.md)): Facts lose salience over time via exponential decay with sector-specific lambda rates. Semantic memory gets `decay_lambda=0.005` (slowest decay, reflecting that factual knowledge persists). Cold memories get vector-compressed from 1536 to as few as 64 dimensions.

## Who Implements It

**[Graphiti](../projects/graphiti.md)**: The most architecturally complete semantic memory system. Implements a full bi-temporal knowledge graph with typed entity/relationship extraction, label-propagation community detection, and hybrid search with cross-encoder reranking. Requires Neo4j, FalkorDB, Kuzu, or Neptune. Each fact triple carries temporal validity bounds. The Zep paper benchmarks show 18.5% accuracy improvement over full-context baselines on LongMemEval and 90% latency reduction (115k tokens → ~1.6k tokens).

**[Zep](../projects/zep.md)**: The hosted service built on Graphiti. Provides the same three-tier architecture (episodes → semantic entities → communities) via a managed API. Positions as the operational layer for the Graphiti engine.

**[Letta](../projects/letta.md)**: Implements semantic memory within an archival storage system, accessible via memory search tools. The agent controls its own memory reads and writes through tool calls, following the MemGPT architecture.

**[OpenMemory](../projects/openmemory.md)**: Cognitive sector classification routes facts to semantic, episodic, procedural, emotional, or reflective stores at ingest. Semantic sector gets the slowest decay (lambda=0.005). Uses regex-based classification rather than LLM classification.

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)**: The most common implementation pattern. Documents or facts are chunked, embedded, stored in a vector database, and retrieved at inference time. RAG treats this as a retrieval problem rather than a memory management problem — no deduplication, contradiction handling, or temporal tracking by default.

**[Graphiti](../projects/graphiti.md) via [Model Context Protocol](../concepts/model-context-protocol.md)**: An MCP server in `mcp_server/` exposes the knowledge graph to Claude, Cursor, and other MCP-compatible assistants, making semantic memory queryable from any tool that speaks MCP.

**Mem-alpha** (academic): Uses GRPO reinforcement learning to train a 4B model to autonomously decide what to store in semantic vs. episodic vs. core memory. Trains on 30K-token contexts but generalizes to 400K+ tokens. Treats memory encoding as a learnable skill rather than a hand-crafted heuristic.

## Relationship to Other Memory Types

Semantic memory sits within a broader [Agent Memory](../concepts/agent-memory.md) taxonomy:

- **[Core Memory](../concepts/core-memory.md)**: A small, always-present context block (Letta caps it at ~512 tokens). Typically holds the most critical semantic facts: the user's name, key preferences, current task. Semantic memory is larger and queryable; core memory is always injected without querying.

- **[Episodic Memory](../concepts/episodic-memory.md)**: Event-specific memories with temporal context. Semantic memory holds the extracted facts *from* episodic events but without the event framing. Graphiti explicitly models both as graph subgraphs: the episode subgraph (G_e) traces sources; the semantic entity subgraph (G_s) holds the derived knowledge.

- **[Procedural Memory](../concepts/procedural-memory.md)**: Skills and how-to knowledge. In agent systems this often manifests as stored tool usage patterns, workflow templates, or [SkillBook](../concepts/skill-book.md) entries. The boundary with semantic memory blurs — "Python uses indentation for block structure" is semantic; "how to write a Python function" is procedural.

## Practical Failure Modes

**Semantic drift from incremental updates**: Systems that update entity summaries incrementally (each new fact refines the summary) can drift from the original meaning. Graphiti's community detection exhibits this — incremental label propagation gradually diverges from optimal community structure and requires periodic full recomputation.

**Entity resolution failures**: "Apple" the company and "apple" the fruit must not merge. The extraction prompt in Graphiti includes extensive negative examples to prevent this, but edge cases persist, especially with ambiguous names across domains.

**Assistant-content blindspot**: Zep's LongMemEval evaluation found a -17.7% regression on tasks requiring recall of what the *assistant* said (as opposed to what the user said). Extraction pipelines are biased toward user-stated facts; agent-generated reasoning, recommendations, and calculations often escape the semantic memory index. This is a concrete failure mode for agentic use cases where the agent's prior outputs matter.

**Staleness without contradiction detection**: Systems without explicit contradiction resolution accumulate outdated facts. If no new fact explicitly contradicts "Alice works at Google," the old fact persists as valid even if Alice left. Only systems with temporal invalidation (Graphiti/Zep) detect this; flat vector stores do not.

**Extraction quality degrades with weaker models**: Graphiti's entity and relationship extraction quality varies significantly across LLM providers. The extraction prompt requires structured output (Pydantic schema validation), which further limits provider choice. Switching from gpt-4o-mini to a weaker model may substantially reduce entity resolution accuracy without visible errors.

## When NOT to Use It

**Short-lived, single-session tasks**: If the agent handles discrete, independent requests with no need for cross-session continuity, semantic memory adds latency and infrastructure cost for no benefit. A code explanation tool that handles one-off questions does not need persistent fact storage.

**Static knowledge bases**: If the knowledge the agent needs is fixed (product documentation, API references), RAG over indexed documents is simpler and more reliable than a dynamic semantic memory system. Semantic memory adds value specifically when facts evolve or when user-specific knowledge accumulates over time.

**Low-latency, high-throughput pipelines**: Every agent turn that uses semantic memory requires at minimum one embedding call and a vector search. Graphiti's full hybrid search adds BM25, graph traversal, and optional cross-encoder reranking. For pipelines requiring sub-100ms response times at high volume, this overhead is prohibitive.

**When you lack the infrastructure to maintain it**: Graphiti requires a graph database (Neo4j minimum), an embedding provider, and a capable LLM for extraction. OpenMemory requires SQLite plus a vector store. These are not drop-in additions. If the team cannot operate and maintain these dependencies, simpler session-level context management is more reliable.

## Unresolved Questions

**Optimal granularity of fact extraction**: Should "Alice is a senior software engineer at Google working on the search infrastructure team" be stored as one fact, three facts, or a graph of entity relationships? The answer affects retrieval precision and storage cost. No consensus exists, and different systems make different choices without clear empirical validation for specific use cases.

**Contradiction detection reliability**: Whether two facts contradict each other is an LLM judgment call in current systems. There is no deterministic contradiction checking. How often do production systems produce false contradictions (invalidating valid facts) or miss real ones? None of the major implementations publish these error rates.

**Cost at scale**: Graphiti's `add_episode()` makes 4-5 LLM calls per message. For a system handling thousands of messages per day, this is significant. The community update path adds more calls. None of the implementations publish total ingestion cost per message at production volume.

**Memory consolidation timing**: When should an agent consolidate accumulated semantic memories into higher-level abstractions (e.g., Graphiti's communities, Mem-alpha's reflection)? Too frequent wastes compute; too infrequent lets noise accumulate. The answer likely depends on domain and data velocity, but practical guidance is absent from the literature.

## Alternatives and Selection Guidance

- **Use [RAG](../concepts/retrieval-augmented-generation.md)** when knowledge is static and document-structured. Simpler, well-understood, no contradiction handling needed.
- **Use [Graphiti](../projects/graphiti.md)/[Zep](../projects/zep.md)** when facts evolve over time, temporal reasoning matters, or cross-session entity tracking is required. Accepts the infrastructure cost of a graph database.
- **Use [Letta](../projects/letta.md)** when the agent should manage its own memory through tool calls, following the MemGPT pattern of agent-controlled archival search.
- **Use [OpenMemory](../projects/openmemory.md)** when self-hosted, privacy-first deployment matters and the cognitive sector classification (with sector-specific decay) fits the use case.
- **Use [Hybrid Search](../concepts/hybrid-search.md)** within any of the above when retrieval precision matters: pure vector search misses keyword-critical queries; pure BM25 misses semantic paraphrases.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Procedural Memory](../concepts/procedural-memory.md)
- [Core Memory](../concepts/core-memory.md)
- [Long-Term Memory](../concepts/long-term-memory.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Vector Database](../concepts/vector-database.md)
- [Hybrid Search](../concepts/hybrid-search.md)
- [Knowledge Graph](../concepts/knowledge-graph.md)
- [Community Detection](../concepts/community-detection.md)
- [Temporal Reasoning](../concepts/temporal-reasoning.md)
