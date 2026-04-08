---
entity_id: neo4j
type: project
bucket: knowledge-substrate
abstract: >-
  Neo4j is a native graph database storing data as nodes and relationships
  rather than tables or documents, used in agent systems for knowledge graphs,
  memory, and multi-hop reasoning where relational structure matters for
  retrieval quality.
sources:
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/mem0ai-mem0.md
  - repos/topoteretes-cognee.md
related:
  - openai
  - anthropic
  - episodic-memory
last_compiled: '2026-04-08T23:10:13.153Z'
---
# Neo4j

## What It Does

Neo4j stores data as a property graph: nodes (entities) connected by typed, directed relationships, each carrying key-value properties. Unlike relational databases where relationships are inferred at query time via joins, or document stores where relationships require denormalization, Neo4j persists the relationship itself as a first-class data structure. A traversal from one node to another along a relationship is O(1) per hop, independent of graph size.

In agent and LLM infrastructure, Neo4j serves as the persistence layer for [Knowledge Graph](../concepts/knowledge-graph.md) systems. [Graphiti](../projects/graphiti.md) uses Neo4j as its default backend. [Mem0](../projects/mem0.md) uses Neo4j via `langchain_neo4j` for its optional graph memory layer. [Cognee](../repos/topoteretes-cognee.md) lists Neo4j as a primary storage option. The core appeal: agents need to ask "what entities are connected to X, through what relationships, and over what time period?" These queries are natural in Cypher; they are expensive and awkward in SQL or vector search.

## Core Mechanism

### Property Graph Model

Every element carries properties:
- **Nodes**: typed with labels (e.g., `:Person`, `:Company`, `:Episode`), carrying arbitrary key-value properties
- **Relationships**: typed, directed, named (e.g., `[:WORKS_AT]`, `[:MENTIONS]`, `[:RELATES_TO]`), carrying their own properties including temporal metadata like `valid_at`, `invalid_at`, `created_at`

This structure maps directly to how [Graphiti](../projects/graphiti.md) models agent memory. In `graphiti_core/`, `EntityEdge` objects become Neo4j relationships with four temporal fields: `expired_at`, `valid_at`, `invalid_at`, `reference_time`. The Cypher `MERGE` pattern handles deduplication on write.

### Cypher Query Language

Neo4j's query language expresses graph patterns declaratively:

```cypher
MATCH (person:EntityNode {name: 'Alice'})-[r:RELATES_TO]->(company:EntityNode)
WHERE (r.valid IS NULL OR r.valid = true) 
  AND r.invalid_at IS NULL
RETURN person, r, company
```

Multi-hop traversal — finding entities within N hops of a given node — is Cypher's native strength:

```cypher
MATCH (start:EntityNode {name: $name})-[*1..3]-(related:EntityNode)
WHERE start.group_id = $group_id
RETURN related, count(*) as hops
ORDER BY hops ASC
```

This BFS traversal pattern is exactly what Graphiti's search layer uses for its "contextual similarity" retrieval arm — nodes closer in the graph tend to appear in similar conversational contexts.

### Indexing

Neo4j maintains several index types relevant to agent workloads:

- **Full-text indexes** (backed by Apache Lucene): Power BM25 keyword search over node/relationship properties. Graphiti uses these for its lexical search arm, searching entity names, fact descriptions, and community names simultaneously.
- **Vector indexes**: Store and query high-dimensional embeddings (1024-dim in Graphiti's case using BGE-m3). Enable cosine similarity search natively in Neo4j 5.x without a separate vector database.
- **Range/composite indexes**: Support filtered queries combining metadata (group_id, user_id) with property conditions.

The combination of full-text and vector indexes in a single database means Graphiti can run its three-arm hybrid retrieval (BM25 + cosine + BFS) against Neo4j without sharding queries across multiple systems.

### APOC and Extensions

Neo4j's APOC (Awesome Procedures on Cypher) library provides utility procedures that Graphiti depends on for bulk operations and advanced graph functions. Graphiti's Neo4j driver requires APOC explicitly — the `build_indices_and_constraints()` initialization call creates the necessary index structures that APOC procedures then operate on. This is a non-optional dependency for production Graphiti deployments.

### Predefined Queries vs. LLM-Generated Queries

Graphiti's design documentation makes a pointed choice: all graph mutations go through predefined Cypher queries, never LLM-generated ones. The Zep paper states this "ensures consistent schema and reduces hallucinations." LLM-generated Cypher is unreliable in production — models hallucinate property names, invent relationship types that don't exist in the schema, and generate syntactically valid but semantically wrong traversals. Neo4j's schema enforcement (constraints on node properties, required relationship types) provides a hard boundary that predefined queries respect.

This contrasts with text-to-Cypher systems that advertise natural language graph querying — viable for exploration, problematic for production agent pipelines where query correctness must be deterministic.

## Architecture in Agent Systems

### Multi-Tenant Namespacing

Neo4j supports multiple named databases within a single server instance. Agent systems using `group_id` or `user_id` as graph namespace identifiers (Graphiti's pattern) run everything in a single database with metadata filtering. This is simpler operationally but means all tenants' data shares a single schema and index space.

Alternative: separate Neo4j databases per tenant, which provides harder isolation but multiplies database management overhead. Graphiti's driver supports configuring the target database name at instantiation.

### Bi-Temporal Storage Pattern

The most sophisticated use of Neo4j in agent memory is Graphiti/Zep's bi-temporal edge model. Each `EntityEdge` relationship stores four timestamps:
- `valid_at` / `invalid_at`: When the fact held true in the real world (event time)
- `created_at` / `expired_at`: When the system recorded/invalidated the fact (transaction time)

Querying "what did the system believe about Alice's employer as of January 2024?" requires filtering on both timelines simultaneously:

```cypher
MATCH (p:EntityNode {name: 'Alice'})-[r:RELATES_TO]->(company:EntityNode)
WHERE r.created_at <= datetime('2024-01-01')
  AND (r.expired_at IS NULL OR r.expired_at > datetime('2024-01-01'))
  AND (r.valid_at IS NULL OR r.valid_at <= datetime('2024-01-01'))
  AND (r.invalid_at IS NULL OR r.invalid_at > datetime('2024-01-01'))
RETURN company, r
```

No other database in the agent memory ecosystem implements this four-timestamp model natively. The pattern requires Neo4j's datetime indexing to avoid full-graph scans.

### Community Detection Integration

Graphiti uses Neo4j to store community membership (`CommunityNode` and `HAS_MEMBER` relationships) after running label propagation in Python. The algorithm itself runs outside Neo4j — reading entity-entity edge counts via Cypher, computing community assignments in Python, then writing results back. Neo4j stores the result; it does not run the community detection algorithm. This matters for scale: very large graphs may hit memory limits when pulling all edge counts into Python for local computation.

## Key Numbers

- **~75,000+ GitHub stars** (Neo4j repository, open-source edition) — independently observable
- **Production deployments**: Neo4j has been in production since 2007; the graph database market leader by adoption
- **Graphiti benchmark**: The Zep paper reports 90% query latency reduction (115k tokens → ~1.6k tokens) using Neo4j-backed Graphiti vs. full-conversation baseline. This is self-reported by Zep. The 18.5% accuracy improvement on LongMemEval is from the same paper and has not been independently replicated.
- **Vector index**: Neo4j's native vector indexing supports up to 4096 dimensions; Graphiti uses 1024-dim BGE-m3 embeddings

## Strengths

**Relationship traversal as a first-class operation.** When an agent needs to find all entities connected to a concept within 2-3 hops, Neo4j returns results in milliseconds. A relational database executing equivalent JOINs degrades exponentially with hop count.

**Hybrid retrieval in one system.** Neo4j's combination of Lucene-backed full-text search and native vector indexes means Graphiti's three-arm retrieval (BM25 + cosine + BFS) runs against a single database. This simplifies infrastructure and removes cross-system consistency problems.

**Schema flexibility with optional constraints.** Neo4j accepts heterogeneous node shapes (different entity types carrying different properties) while allowing constraints where needed. Agent memory systems need this: a `Person` entity and a `Location` entity coexist in the same graph without forcing a common schema.

**Temporal query support.** Neo4j's datetime type and indexing support the bi-temporal patterns that sophisticated agent memory requires. This is not unique to Neo4j (PostgreSQL handles it too) but the combination with graph traversal is.

**Mature tooling.** Neo4j Browser for visual graph exploration, APOC for bulk operations, Bloom for business-user graph visualization, and extensive driver support (Python, Java, JavaScript, Go, .NET) with well-maintained async clients.

## Critical Limitations

**Concrete failure mode — write amplification at ingestion scale.** Graphiti's `add_episode` pipeline executes multiple Cypher write transactions per episode: create episode node, merge entity nodes, create episodic edges, create entity edges, update community membership. Each transaction hits Neo4j. At 100+ episodes/second (realistic for batch historical import), Neo4j's single-writer lock contention degrades throughput significantly. The Graphiti documentation acknowledges this by recommending background task processing and noting that `add_episode_bulk` skips edge invalidation for throughput — a correctness tradeoff, not a performance optimization. The actual write throughput limit is not documented and depends heavily on graph size, index count, and hardware.

**Unspoken infrastructure assumption — APOC installation.** Graphiti's Neo4j driver requires APOC, which is not bundled with Neo4j Community Edition by default. Managed Neo4j Aura includes APOC; self-hosted Docker deployments require explicit APOC plugin configuration. This is a silent dependency: `build_indices_and_constraints()` fails non-obviously if APOC is missing, and the error message does not clearly identify APOC as the cause.

## When NOT to Use Neo4j

**Simple key-value memory lookup.** If an agent needs to retrieve "what does Alice prefer?" and the answer is a single fact, a vector database ([ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [FAISS](../projects/faiss.md)) with embedding similarity search returns results faster with less infrastructure overhead. Graph traversal adds latency when the query doesn't actually need multi-hop reasoning.

**Purely document-based RAG without relational queries.** If the retrieval pattern is "find chunks semantically similar to this query," a [Vector Database](../concepts/vector-database.md) is the right tool. Adding Neo4j for [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) where the documents don't have meaningful entity-relationship structure adds complexity without retrieval quality gains.

**Latency-critical inference paths.** Neo4j's query planner adds overhead compared to in-memory indexes like FAISS. If the memory lookup must complete in under 10ms to stay within a response time budget, Neo4j (typically returning results in 20-100ms for mid-size graphs) may not fit. [FAISS](../projects/faiss.md) or [Redis](../projects/redis.md) vector search will be faster.

**Teams without Cypher expertise.** Cypher is expressive but non-trivial to debug when query plans are suboptimal. Agents that produce dynamic queries (rather than using predefined templates as Graphiti does) will generate incorrect Cypher regularly. If the team cannot read and diagnose Cypher query plans, operational problems will be hard to resolve.

**Small, bounded knowledge sets.** For a knowledge base under ~10,000 nodes, [NetworkX](../projects/networkx.md) in-process (or [SQLite](../projects/sqlite.md) with adjacency tables) handles graph operations without running a separate database server. Neo4j's operational overhead (JVM process, ~512MB minimum heap, separate server management) is not justified at small scale.

## Unresolved Questions

**Community refresh cost at scale.** Graphiti's community detection runs label propagation in Python, reads edge counts from Neo4j, then writes community assignments back. For graphs with 100,000+ entities, the memory footprint of pulling all edge counts into Python and the latency of writing back community assignments are undocumented. Neither the Zep paper nor Graphiti's documentation specifies when periodic full community recomputation becomes necessary or how to detect community drift.

**Multi-database vs. single-database multi-tenancy tradeoffs.** Agent platforms serving many users face a choice: one Neo4j database with `group_id` filtering, or separate databases per user. Neo4j supports both, but the performance characteristics (index efficiency, query isolation, vacuum behavior) at scale (thousands of users, millions of nodes) are not documented in any of the agent memory papers or repositories.

**Cost at production scale.** Neo4j Aura (managed cloud) pricing is not published on the main page and requires a sales conversation for enterprise tiers. Self-hosted Neo4j Enterprise requires a commercial license. The open-source Community Edition lacks certain clustering and security features. Production agent deployments at scale face unclear cost trajectories that are not addressed in any of the framework documentation.

**Conflict resolution in concurrent writes.** Multiple agents writing to the same graph namespace simultaneously can produce race conditions on entity node merges and edge invalidation. Graphiti's documentation recommends serializing `add_episode` calls through background queues, but the behavior when concurrent writes do occur (and the Cypher `MERGE` patterns used to mitigate it) is not formally analyzed.

## Alternatives

- **[NetworkX](../projects/networkx.md)**: In-process Python graph library. Use when the graph fits in memory, no persistence is needed, and operational simplicity matters more than query performance.
- **[PostgreSQL](../projects/postgresql.md)** with `pgvector` and adjacency tables: Use when the team already runs Postgres, the graph is relatively shallow (few hops), and unified relational + vector querying is preferred over specialized graph traversal.
- **[FalkorDB](https://www.falkordb.com/)**: Redis-based graph database with Cypher support. Graphiti supports it as an alternative backend. Lower memory footprint than Neo4j, faster for some workloads. Use when Neo4j's JVM overhead is prohibitive or Redis-style deployment is preferred.
- **[Kuzu](https://kuzudb.com/)**: Embedded column-oriented graph database (no separate server process). Graphiti supports it. Use for development environments or single-process deployments where running a server is undesirable. Notably requires modeling edges as intermediate nodes due to its storage model.
- **[Amazon Neptune](https://aws.amazon.com/neptune/)**: Managed graph database service. Graphiti supports it via Neptune driver + OpenSearch Serverless for full-text search. Use when the deployment is AWS-native and managed infrastructure is required.

For most agent memory use cases integrating with [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md), Neo4j is the path of least resistance: the most complete driver support, the most documentation, and the configuration that production deployments have actually validated.

## Related Concepts and Projects

- [Knowledge Graph](../concepts/knowledge-graph.md) — the data model Neo4j implements
- [Graphiti](../projects/graphiti.md) — primary open-source consumer of Neo4j in agent memory
- [Zep](../projects/zep.md) — managed agent memory service built on Graphiti/Neo4j
- [Mem0](../projects/mem0.md) — uses Neo4j for optional graph memory layer
- [GraphRAG](../projects/graphrag.md) — Microsoft's graph-augmented RAG, uses different graph backends
- [Agent Memory](../concepts/agent-memory.md) — the broader category Neo4j serves
- [Semantic Memory](../concepts/semantic-memory.md) — the memory type graph databases are best suited for
- [Hybrid Search](../concepts/hybrid-search.md) — Neo4j's BM25 + vector indexes enable this retrieval pattern
- [Temporal Reasoning](../concepts/temporal-reasoning.md) — bi-temporal edge models require Neo4j's datetime indexing
- [Community Detection](../concepts/community-detection.md) — label propagation results stored in Neo4j
