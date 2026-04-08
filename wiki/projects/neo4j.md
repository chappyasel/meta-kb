---
entity_id: neo4j
type: project
bucket: knowledge-substrate
abstract: >-
  Neo4j is a native graph database that stores data as nodes, relationships, and
  properties, widely used as the backend for knowledge graphs in agent memory
  systems like Graphiti, Mem0, and Cognee.
sources:
  - repos/topoteretes-cognee.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - openai
  - episodic-memory
  - anthropic
  - knowledge-graph
  - semantic-memory
last_compiled: '2026-04-08T02:52:53.574Z'
---
# Neo4j

## What It Is

Neo4j is a native property graph database built on a labeled property graph model: data lives as nodes (entities), relationships (directed, named edges between nodes), and properties (key-value pairs on both nodes and relationships). Unlike relational databases that simulate graph traversal with JOIN chains, Neo4j's physical storage and index structures are designed for pointer-chasing traversal. Adding a new relationship is constant-time; traversing a 10-hop path does not degrade as the graph grows.

The query language is Cypher, a declarative, ASCII-art pattern-matching language. Where SQL describes sets, Cypher describes shapes:

```cypher
MATCH (p:Person)-[:WORKS_AT]->(c:Company {name: "Google"})
WHERE p.start_date >= date('2022-01-01')
RETURN p.name, p.role
```

In the agent memory and RAG space, Neo4j serves as the persistence layer for systems that need to store, retrieve, and reason over entity relationships, temporal facts, and community structures. It appears as the default or primary backend in [Graphiti](../projects/graphiti.md), [Mem0](../projects/mem0.md)'s graph memory tier, and [Cognee](../repos/topoteretes-cognee.md)'s knowledge engine.

---

## What's Architecturally Unique

Three design decisions separate Neo4j from general-purpose databases adapted to graph use:

**Native storage.** Relationships are stored as doubly-linked lists on disk, each node holding direct pointers to its relationship chains. A traversal from node A to its neighbors requires reading those relationship records directly, not scanning a relationship table. This "index-free adjacency" is why traversal latency stays flat as total graph size grows.

**Full-text and vector indexing in one system.** Neo4j 5.x embeds Apache Lucene for BM25 full-text search and supports approximate nearest neighbor vector search (HNSW) via the vector index API. For agent memory retrieval, this matters: Graphiti's hybrid search runs cosine similarity, BM25 full-text, and breadth-first graph traversal against a single Neo4j instance rather than requiring separate vector and search services.

**APOC procedures.** The APOC (Awesome Procedures on Cypher) plugin library extends Neo4j with graph algorithms, data import utilities, and meta-graph introspection. Graphiti's Neo4j driver requires APOC; label propagation community detection runs through it.

---

## Core Mechanism: How It Works in Agent Memory Systems

The three systems in the source material use Neo4j differently but follow a common pattern.

**Graphiti** (the most sophisticated use) stores five node types (`EpisodicNode`, `EntityNode`, `CommunityNode`, `SagaNode`) and five edge types (`EpisodicEdge`, `EntityEdge`, `CommunityEdge`, `HasEpisodeEdge`, `NextEpisodeEdge`). Entity edges carry four timestamp fields implementing a bi-temporal model: `valid_at`, `invalid_at` (when the fact was true in the world), `created_at`, and `expired_at` (when the record entered and left the system). Queries filter on both timelines independently.

All mutations use predefined Cypher, never LLM-generated queries. From the Graphiti deep analysis: "using predefined queries ensures consistent schema and reduces hallucinations." The `Neo4jDriver` in `graphiti_core/driver/neo4j_driver.py` has its own `operations/` directory with 10+ files, one per node/edge type. Hybrid search runs three methods in parallel: cosine similarity via the vector index, BM25 via Lucene full-text, and breadth-first traversal via Cypher `MATCH` with hop limits.

Namespace isolation uses `group_id` as a property filter on all queries, enabling multi-tenant graphs in a single database instance without schema partitioning.

**Mem0** uses Neo4j through `langchain_neo4j` for its optional graph memory tier. Entity nodes and relationship edges are stored with `MERGE` Cypher (upsert semantics). Soft deletion sets `r.valid = false` and `r.invalidated_at = datetime()` on relationships; retrieval filters with `WHERE r.valid IS NULL OR r.valid = true`. Node embeddings are stored as properties and queried for cosine similarity. Graph search results are reranked with BM25 at the application layer (not via Lucene), using simple word tokenization.

**Cognee** describes Neo4j as one of its graph database backends and combines it with vector search for its knowledge engine pipeline.

---

## Key Numbers

- **GitHub stars**: 14,900+ (Neo4j community edition). Self-reported by GitHub.
- **Graphiti benchmarks**: On LongMemEval, Graphiti + Neo4j achieved 71.2% accuracy (gpt-4o) vs 60.2% full-context baseline, with 90% latency reduction (115k to 1.6k tokens). Source: Zep paper arXiv:2501.13956. These are author-reported benchmarks from the Zep team; not independently replicated.
- **Version requirement**: Graphiti requires Neo4j 5.26+ with APOC for full functionality.
- **Alternative backends in Graphiti**: FalkorDB 1.1.2+, Kuzu 0.11.2+ (embedded, no server required), Amazon Neptune with OpenSearch Serverless.

---

## Strengths

**Relationship-native queries.** Multi-hop traversal ("find all entities within 2 hops of Alice that have changed status since last month") is idiomatic Cypher and executes efficiently. SQL equivalents require recursive CTEs or application-side graph walking.

**Single system for hybrid retrieval.** Combining vector similarity, BM25 lexical search, and graph traversal in one database removes the operational complexity of maintaining separate vector and search services. Graphiti's three-method hybrid search runs against one Neo4j instance.

**Bi-temporal storage.** The property graph model accommodates multi-timestamp edges without schema gymnastics. Storing `valid_at`, `invalid_at`, `created_at`, `expired_at` as edge properties is straightforward; querying them with Cypher range filters is readable.

**Mature operational tooling.** Neo4j has a browser-based query explorer, export utilities, backup tools, and monitoring integrations. For teams building agent memory systems, this means graph state is inspectable without writing custom tooling.

---

## Critical Limitations

**Concrete failure mode: soft-delete accumulation.** Both Mem0 and Graphiti never hard-delete invalidated edges -- they set temporal expiry fields or `valid = false`. Neo4j does not garbage-collect these records automatically. In a production system processing thousands of conversations over months, the graph accumulates a growing layer of dead relationships that every query must filter. Cypher's `WHERE r.valid IS NULL OR r.valid = true` scans all relationship records before filtering. At scale, this degrades query performance silently and requires manual compaction.

**Unspoken infrastructure assumption: APOC availability.** Graphiti requires APOC procedures for community detection and several graph operations. APOC is a separate plugin, not bundled with Neo4j Community Edition by default, and it requires explicit installation on the server. Docker images from Neo4j's official registry include APOC, but managed cloud databases (Neo4j Aura free tier) have restricted plugin access. Teams deploying on Aura or other managed services may find documented Graphiti functionality silently unavailable until they provision the correct tier.

---

## When NOT to Use It

**Simple preference or fact storage without relationships.** If the memory system stores flat user preferences ("prefers dark mode," "located in Berlin") and retrieves them by semantic similarity, a vector database is simpler and cheaper to operate. Neo4j's relational structure provides no benefit for workloads that never traverse edges.

**Embedded or serverless environments.** Neo4j requires a running server process. For local development, edge deployment, or serverless functions that need graph storage, Kuzu (an embedded column-oriented graph database supported by Graphiti) is a better fit. It runs in-process without a server.

**Teams without Cypher expertise.** Debugging a broken entity resolution pipeline requires reading Cypher query outputs. If the team has no one who can read and write Cypher, the debugging cycle for issues in the graph layer will be slow. FalkorDB (Redis-protocol compatible) or a vector-only approach may be operationally safer.

**Very high write throughput.** Neo4j's locking model can bottleneck under concurrent writes to the same nodes. Graphiti's concurrency is controlled at the application layer via `semaphore_gather` with `SEMAPHORE_LIMIT=10`. If the application needs to ingest episodes from many parallel sessions simultaneously, contention on shared entity nodes (a company node that many users reference) can cause write latency spikes.

---

## Unresolved Questions

**Cost at scale.** Neo4j Aura (managed cloud) pricing is based on graph size (GB). The Graphiti non-lossy model (keep all invalidated edges) means storage grows monotonically. Neither the Graphiti documentation nor the Zep paper provides storage growth projections or cost estimates for production deployments at thousands of users.

**Community detection refresh scheduling.** The Zep paper acknowledges that incrementally updated communities "gradually diverge from full label propagation results, requiring periodic refreshes." Neither the paper nor Graphiti's documentation specifies how to detect divergence, how often to refresh, or the cost of a full recomputation on a large graph. This is an open operational gap.

**Cross-driver behavior parity.** Graphiti maintains four graph driver implementations (Neo4j, FalkorDB, Kuzu, Neptune), each with its own `operations/` directory. Bug fixes in one driver's Cypher may not propagate to others. The paper and documentation focus on Neo4j; the behavior of the other drivers on edge cases (bi-temporal queries, community detection) is underdocumented.

**Neo4j Community vs Enterprise feature delta.** Some index types and clustering features are Enterprise-only. The documentation for agent memory systems (Graphiti, Mem0, Cognee) does not specify which Neo4j edition their implementations require. Teams on Community Edition may hit feature ceilings without clear warnings.

---

## Alternatives

**[Vector Database](../concepts/vector-database.md)** (Pinecone, Qdrant, ChromaDB): Use when the memory system stores facts as flat strings and retrieves by semantic similarity. No graph traversal, no relationship queries. Lower operational overhead, sufficient for preference tracking and simple RAG.

**[ChromaDB](../projects/chromadb.md)**: Use for local development or small-scale applications that need embedded vector storage without a server. No graph capability.

**FalkorDB**: Use when Neo4j's server overhead is a concern but graph structure is needed. Redis-protocol compatible, lower resource footprint. Supported as a Graphiti backend.

**Kuzu**: Use for embedded graph storage in development, CI, or edge environments. Runs in-process, no server required. Kuzu requires modeling edges as intermediate nodes due to its column-oriented storage, which adds schema complexity.

**[Graphiti](../projects/graphiti.md)** (as a layer over Neo4j): If the goal is agent memory rather than general graph storage, Graphiti provides the full extraction, deduplication, and retrieval pipeline. Neo4j is then an implementation detail, not the interface.

**[GraphRAG](../projects/graphrag.md)**: Microsoft's batch-processing system that also uses graph structure for RAG. Uses the Leiden community detection algorithm (higher quality but requires full recomputation on updates) rather than Graphiti's incremental label propagation. Better suited to static corpora than continuously updated agent memory.

---

## Related Concepts

- [Knowledge Graph](../concepts/knowledge-graph.md)
- [Semantic Memory](../concepts/semantic-memory.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Graphiti](../projects/graphiti.md)
- [Mem0](../projects/mem0.md)
- [GraphRAG](../projects/graphrag.md)
- [Hybrid Search](../concepts/hybrid-search.md)
- [Temporal Reasoning](../concepts/temporal-reasoning.md)
- [Community Detection](../concepts/community-detection.md)
- [Vector Database](../concepts/vector-database.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
