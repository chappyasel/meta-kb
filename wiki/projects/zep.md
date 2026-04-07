---
entity_id: zep
type: project
bucket: agent-memory
abstract: >-
  Zep is a managed agent memory service (with open-source Graphiti core) using a
  temporal knowledge graph to track facts across time, achieving 18.5% accuracy
  gains and 90% latency reduction over full-context baselines on LongMemEval.
sources:
  - repos/getzep-graphiti.md
  - repos/memorilabs-memori.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - graphiti
  - knowledge-graph
  - hybrid-search
  - openai
  - mcp
  - bm25
  - mem0
  - letta
last_compiled: '2026-04-07T11:42:25.460Z'
---
# Zep

## What It Does

Zep is a memory layer for AI agents built around [Graphiti](../projects/graphiti.md), a temporal [knowledge graph](../concepts/knowledge-graph.md) engine. It solves a specific problem: agents that operate across many sessions need memory that tracks how facts change, not just a list of things that were said. Standard [RAG](../concepts/rag.md) returns static document chunks. Zep stores facts with validity windows, so "Alice works at Google" can be marked invalid when Alice changes jobs, while preserving the historical record of what was believed and when.

The project has two layers. Graphiti is the open-source core (24,473 GitHub stars, Apache-2.0 license). Zep is the managed service built on Graphiti, adding multi-tenant user management, a developer dashboard, sub-200ms latency guarantees at scale, and SDKs for Python, TypeScript, and Go.

## Architecture

Graphiti organizes knowledge into a three-tier graph G = (N, E, phi):

**Tier 1 — Episodes:** Raw input data stored without loss. Every message, document, or JSON object ingested becomes an episode node. All derived knowledge traces back to the episode that produced it, enabling source citation in production.

**Tier 2 — Semantic entities and relationships:** Entities extracted from episodes (people, organizations, concepts) with typed relationships between them. Relationships are fact triples: `(Entity) -[WORKS_AT {valid_at, invalid_at}]-> (Entity)`. Each edge carries four timestamps — when the fact became true, when it stopped being true, when the system learned it, and when the system stopped believing it. This is a genuine bi-temporal model from database theory, rarely implemented in LLM applications.

**Tier 3 — Communities:** Clusters of strongly connected entities with LLM-generated summaries. Named with key terms and embedded for search. Communities make high-level queries ("what do we know about this company?") fast without traversing individual edges.

The storage backend is [Neo4j](../projects/neo4j.md) by default, with FalkorDB, Kuzu, and Amazon Neptune also supported. All graph mutations use predefined Cypher queries — never LLM-generated queries. This is an explicit design choice to prevent schema hallucinations and ensure consistency.

## Core Mechanism: Episode Ingestion

Calling `add_episode()` triggers a multi-stage LLM pipeline:

1. **Entity extraction** (`utils/maintenance/node_operations.py`): The LLM receives the current message plus the 4 preceding messages for context. It returns structured `ExtractedEntity` objects with names and type classifications. The extraction prompt is unusually detailed — it specifies what not to extract (pronouns, bare kinship terms, abstract concepts) and requires entity names to be specific and qualified.

2. **Node deduplication** (`resolve_extracted_nodes`): Each extracted entity is embedded to 1024 dimensions, compared against existing entities via cosine similarity and BM25 full-text search, then an LLM makes the final merge decision. "NYC" and "New York City" collapse to the same node; "Java (programming language)" and "Java (island)" stay separate.

3. **Edge extraction** (`utils/maintenance/edge_operations.py`): The LLM extracts fact triples with `valid_at` and `invalid_at` temporal bounds. Relative temporal expressions ("last week") are resolved against the episode's `reference_time`.

4. **Edge resolution** (`resolve_extracted_edges`): New edges are compared against existing edges between the same entity pairs. The LLM identifies duplicates and contradictions. Contradicted edges get their `expired_at` set — they are not deleted. The system consistently prioritizes newer information.

5. **Attribute extraction**: Entity summaries are updated to incorporate information from new edges.

The minimum LLM call count per episode is 4–5. With community updates enabled, add more per affected community node. All operations are async, using `semaphore_gather` with a configurable concurrency limit (default `SEMAPHORE_LIMIT=10`) to prevent provider rate limit errors.

## Hybrid Search

Retrieval combines three complementary methods run in parallel:

- **Cosine similarity** on 1024-dimensional fact embeddings — semantic similarity
- **[BM25](../concepts/bm25.md)** via Neo4j's Lucene integration — word-level matching
- **Breadth-first traversal** from seed nodes — contextual similarity (nodes closer in the graph appear in more similar conversational contexts)

Results are reranked via [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md), MMR, episode-mention frequency, graph distance, or a neural cross-encoder. The `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` preset provides the highest-quality results at higher cost.

This architecture implements [Hybrid Search](../concepts/hybrid-search.md) across four scopes simultaneously: semantic edges (fact text), entity nodes (names), community nodes (summary key terms), and raw episodes (source content).

## Key Numbers

From the Zep paper (arXiv:2501.13956, authors at Zep Inc. — **self-reported**):

**LongMemEval** (~115k token conversations, the more meaningful benchmark):

| Model | Full-context baseline | Zep | Improvement |
|-------|----------------------|-----|-------------|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

Response latency: ~3.2s (Zep + gpt-4o-mini) vs ~31.3s (full-context baseline) — a 90% reduction. Context tokens drop from 115k to ~1.6k.

**Per question type (gpt-4o-mini), where the architecture makes or breaks performance:**
- Temporal reasoning: +48.2% — validates the bi-temporal model
- Multi-session synthesis: +30.7%
- Single-session assistant recall: **−17.7%** — a real regression, discussed below

**Deep Memory Retrieval** (500 conversations, 60 messages each): Zep 94.8% vs MemGPT 93.4% with gpt-4-turbo. The paper itself criticizes DMR as inadequate — these conversations fit in modern context windows, making the benchmark unrepresentative of enterprise use cases.

Graphiti repo: 24,473 stars, Apache-2.0 license. These numbers are from the repo README.

## Strengths

**Temporal reasoning.** The bi-temporal data model is implemented correctly: separate timelines for when facts were true vs. when the system learned them. This enables queries like "what did we believe about Alice's employer in January 2023?" The +48.2% improvement on temporal reasoning tasks is the architecture's clearest validation.

**Evolving knowledge.** When facts contradict, old edges expire rather than get deleted. This is the right model for enterprise applications where people change jobs, policies update, and preferences shift. A system that just overwrites loses the audit trail.

**Integration surface.** [MCP](../concepts/mcp.md) server for Claude and Cursor. [LangGraph](../projects/langgraph.md) integration for agentic workflows. FastAPI REST service for programmatic access. Supports OpenAI, Anthropic, Gemini, Groq, Azure OpenAI, and local models via Ollama with `OpenAIGenericClient`.

**Provenance.** Every fact traces back to the episode that produced it. Production systems need this — when an agent makes a surprising decision, you need to trace which conversation turn caused the belief that drove the action.

## Critical Limitations

**The assistant-content gap.** The −17.7% regression on single-session-assistant tasks is a structural weakness. The entity extraction pipeline pulls facts stated by users far more reliably than it captures content generated by the assistant — recommendations, calculations, analyses, creative outputs. For agentic deployments where the agent's own prior outputs are critical context (a coding agent that needs to remember what solution it proposed last week), this is a meaningful failure mode.

**Infrastructure assumption.** Graphiti requires a running graph database — Neo4j 5.26+ minimum, with APOC installed. This is not a drop-in replacement for a vector database. Kuzu runs embedded (good for development), but production deployments need Neo4j or FalkorDB running as separate services with their own operational overhead.

**Ingestion cost is opaque.** The paper reports 90% latency reduction at query time but does not report per-episode ingestion cost or latency. A single `add_episode` call makes 4–5 LLM calls minimum. At high message volume, ingestion cost can dominate. The README explicitly recommends running `add_episode` as a background task rather than in the request path.

## When NOT to Use Zep

**Static document retrieval.** If your use case is "search a corpus of PDFs that doesn't change," standard RAG with a vector database is simpler, cheaper, and sufficient. Graphiti's value is in tracking change over time.

**Low-infrastructure tolerance.** If you can't operate a graph database, or your team has no familiarity with Neo4j, the operational complexity of Graphiti self-hosted will cause problems. Use the managed Zep service instead, or consider [Mem0](../projects/mem0.md) which runs on [PostgreSQL](../projects/postgresql.md).

**High-frequency, low-latency writes.** 4–5 LLM calls per message ingested will hit rate limits quickly at scale. The `SEMAPHORE_LIMIT` parameter helps, but a chatbot handling thousands of concurrent users will find Graphiti's ingestion pipeline a bottleneck.

**Adversarial query environments.** The richer contextual representations that help on multi-hop reasoning also amplify misleading signals from adversarial queries. A-MEM's benchmark showed a −28% regression on adversarial tasks with similar enriched-memory approaches.

## Unresolved Questions

**Community refresh scheduling.** The paper acknowledges that incremental label propagation diverges from optimal community structure over time and requires periodic full recomputation. It does not specify when to trigger refreshes, how to detect divergence, or what the cost of a full refresh is on a large graph.

**Production ingestion cost.** No published data on cost per episode at scale. The paper benchmarks use gpt-4o-mini for graph construction, which helps, but the total cost for a production agent handling thousands of conversations per day is not characterized.

**Contradiction authority.** The system always prioritizes newer information when detecting contradictions. For medical records, legal documents, or any domain where older information may be more authoritative, this assumption is wrong. There is no confidence scoring or source-authority weighting mechanism.

**Cross-driver parity.** Neo4j, FalkorDB, Kuzu, and Neptune each have separate operation implementations with significant code duplication. Bugs fixed in one driver may not propagate to others. The paper focuses entirely on Neo4j; other drivers are community contributions.

## Alternatives

**[Mem0](../projects/mem0.md):** Runs on PostgreSQL + a vector store. Lower infrastructure requirements. Better choice when you need simple fact persistence without bi-temporal tracking and want easier deployment.

**[Letta](../projects/letta.md):** Full agent runtime with memory as a first-class primitive. Better choice when you want the memory system tightly coupled to the agent execution model rather than as a separate service.

**[Graphiti](../projects/graphiti.md):** The open-source core of Zep. Choose Graphiti when you want to self-host and build the surrounding infrastructure yourself. Choose managed Zep when you need production SLAs, sub-200ms latency guarantees, and a developer dashboard without operational work.

**Plain vector database ([ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinecone.md)):** Choose when your memory is append-only and you don't need to track how facts change. Dramatically simpler to operate.

Use Zep/Graphiti when your agents operate across many sessions, facts in your domain evolve over time, and you need to answer temporal queries about what was true when. The 90% latency reduction over full-context approaches is real, but you are trading that for a graph database dependency and multi-LLM-call ingestion overhead.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader problem space
- [Knowledge Graph](../concepts/knowledge-graph.md) — the core data structure
- [Episodic Memory](../concepts/episodic-memory.md) — what the episode tier implements
- [Semantic Memory](../concepts/semantic-memory.md) — what the entity tier implements
- [Hybrid Search](../concepts/hybrid-search.md) — the retrieval approach
- [BM25](../concepts/bm25.md) — one of the three search methods
- [GraphRAG](../concepts/graphrag.md) — the batch-oriented alternative Graphiti explicitly contrasts against
- [Retrieval-Augmented Generation](../concepts/rag.md) — the paradigm Zep extends
