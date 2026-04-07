---
entity_id: neo4j
type: project
bucket: knowledge-bases
abstract: >-
  Neo4j is a native graph database used as the primary backend for knowledge
  graphs in agent memory systems, with the strongest Cypher query language and
  ecosystem support among graph databases.
sources:
  - repos/topoteretes-cognee.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/topoteretes-cognee.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - openai
  - anthropic
  - bm25
  - knowledge-graph
  - mem0
  - graphrag
last_compiled: '2026-04-07T11:45:28.869Z'
---
# Neo4j

## What It Does

Neo4j is a graph database management system that stores data as nodes, relationships, and properties rather than rows and tables. In AI agent systems, it serves as the storage layer for [knowledge graphs](../concepts/knowledge-graph.md) that enable [agent memory](../concepts/agent-memory.md) systems to persist facts, track entity relationships, and support multi-hop queries that flat vector stores cannot express.

The system's architectural differentiator is its native graph storage engine: relationships are stored as first-class objects with direct physical pointers between nodes, so graph traversal operations run in O(1) per relationship hop rather than requiring join operations across indexed tables. This property — called "index-free adjacency" — is what makes Neo4j genuinely fast for pattern matching queries that would be expensive in relational databases.

## How It Works

### Storage Model

Neo4j organizes data into:
- **Nodes**: entities with one or more labels and arbitrary key-value properties
- **Relationships**: directed, typed connections between two nodes, with their own properties
- **Labels**: categorical tags on nodes (e.g., `:Person`, `:Company`, `:Entity`)
- **Indexes**: B-tree indexes for property lookups, full-text Lucene indexes for text search, and vector indexes for embedding similarity

The physical storage uses doubly-linked lists of relationship records, allowing Neo4j to traverse from any node to its neighbors by following pointers rather than scanning indexes. This is the basis for the O(k) traversal complexity claim, where k is the number of nodes visited, not the size of the full database.

### Cypher Query Language

Neo4j's query language Cypher uses ASCII-art pattern syntax to describe graph shapes:

```cypher
MATCH (alice:Person {name: "Alice"})-[:WORKS_AT]->(company:Company)
RETURN company.name, company.industry
```

More complex patterns for agent memory queries:

```cypher
// Find all entities within 2 hops of Alice, excluding expired edges
MATCH path = (alice:Entity {name: "Alice"})-[r*1..2]->(n)
WHERE ALL(rel IN relationships(path) WHERE rel.valid IS NULL OR rel.valid = true)
RETURN n.name, n.summary, length(path) as distance
ORDER BY distance
```

Cypher also supports:
- `MERGE` for upsert semantics (create if not exists, return if exists)
- Full-text search via `db.index.fulltext.queryNodes()`
- Vector similarity via `db.index.vector.queryNodes()`
- Aggregation, path algorithms (shortest path, PageRank), and community detection via the Graph Data Science library

### Indexing for Hybrid Search

[GraphRAG](../concepts/graphrag.md) systems like [Graphiti](../projects/graphiti.md) use Neo4j's indexing capabilities for hybrid retrieval:

1. **Vector indexes** (available since Neo4j 5.11): Store high-dimensional embeddings on node or relationship properties and support cosine or Euclidean similarity queries
2. **Full-text indexes** via embedded Lucene: Support BM25 scoring for lexical search across text properties
3. **Property indexes**: B-tree lookups for exact matches on scalar properties

The combination enables search functions that run cosine similarity, BM25, and breadth-first graph traversal in parallel, then merge results with [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md) or cross-encoder reranking.

### APOC Plugin

The APOC (Awesome Procedures On Cypher) plugin adds over 450 utility procedures. Several agent memory systems require it:

- `apoc.create.uuids()`: Generates UUIDs for node IDs
- `apoc.do.when()`: Conditional execution within Cypher
- `apoc.text.*`: String manipulation utilities
- `apoc.periodic.iterate()`: Batch processing for large graph updates
- `apoc.schema.assert()`: Creates multiple constraints and indexes in one call

Graphiti's `build_indices_and_constraints()` call requires APOC, which is why it cannot run against Neo4j Aura Free (the cloud tier) without explicitly enabling the plugin.

### Graph Data Science Library

The GDS library adds graph algorithms including:
- **Label propagation**: Community detection used by Cognee and Graphiti
- **Leiden algorithm**: Higher-quality but more expensive community detection used by [GraphRAG](../concepts/graphrag.md)
- **PageRank, Betweenness Centrality**: Node importance scoring for retrieval reranking
- **Node similarity, Cosine similarity**: Similarity-based relationship inference

## Usage in Agent Memory Systems

### Graphiti / Zep

[Graphiti](../projects/graphiti.md) uses Neo4j as its default and primary-tested backend. The `Neo4jDriver` class in `graphiti_core/driver/neo4j_driver.py` implements the `GraphDriver` interface with operations in `graphiti_core/driver/neo4j_driver/operations/`. Key operations:

- **Bulk node creation**: Uses `UNWIND` + `MERGE` to create or update multiple nodes in one round-trip
- **Edge invalidation**: Sets `expired_at` on edges without deleting them, using `MATCH ... SET r.expired_at = $timestamp`
- **Bi-temporal queries**: Filters on both `valid_at`/`invalid_at` (event time) and `expired_at` (transaction time)
- **Community detection**: Calls GDS label propagation procedures

The Zep paper (arXiv:2501.13956) reports that using predefined Cypher queries rather than LLM-generated ones "ensures consistent schema and reduces hallucinations." All write paths use parameterized Cypher, never string interpolation.

Connection requirements: Neo4j 5.26+ with APOC plugin and vector index support.

### Mem0

[Mem0](../projects/mem0.md)'s graph layer (`mem0/memory/graph_memory.py`) uses Neo4j via `langchain_neo4j`. The integration is optional — activated only when `graph_store.config` is provided. It stores entity nodes and typed relationships, using `MERGE` for upsert and soft deletion (`SET r.valid = false, r.invalidated_at = datetime()`) for contradicted relationships.

Mem0's graph queries are generated with the help of LangChain's Neo4j integration rather than raw Cypher, introducing a layer of abstraction that Graphiti explicitly avoids.

### Cognee

[Cognee](../projects/graphiti.md) supports Neo4j as one of six graph backends (Kuzu is the default for development; Neo4j for production). Its `GraphDBInterface` implementation handles node and edge CRUD with relationship type inference from DataPoint field names. The integration supports the APOC plugin for batch operations and uses Neo4j's vector indexes for `feedback_weight`-weighted retrieval.

## Key Numbers

- **Stars**: ~14,000 (GitHub, self-reported; not independently validated)
- **Supported since Neo4j 5.x**: Native vector indexes, eliminating need for a separate vector database for embedding search
- **Concurrent connections**: Configurable connection pool, recommended 50-100 for typical agent workloads
- **Query language**: Cypher (proprietary, adopted as part of ISO GQL standard in 2024)

Benchmarks from agent memory papers:
- Graphiti on LongMemEval: 63.8-71.2% accuracy with Neo4j backend vs 55.4-60.2% full-context baseline (independently validated in the Zep paper; Neo4j-specific contribution is not isolated)
- Latency reduction: 90% reduction in response latency (115k → ~1.6k tokens) using Neo4j-backed graph retrieval vs full-context approach

These numbers reflect the full Graphiti/Zep stack, not Neo4j in isolation.

## Strengths

**Index-free adjacency**: Traversal from a node to its neighbors does not require index lookups. For 2-3 hop graph traversals typical in agent memory retrieval, this is meaningfully faster than equivalent SQL joins on large datasets.

**Cypher expressiveness**: Writing queries like "find all facts about Alice and her direct relationships, excluding expired edges, sorted by recency" requires one Cypher statement. The equivalent SQL across multiple tables is substantially more complex.

**Hybrid indexing in one system**: Vector indexes (for embedding similarity), full-text Lucene indexes (for BM25), and property indexes (for exact lookups) coexist in one database. This eliminates the need to synchronize data across Neo4j + a separate vector database.

**Community detection via GDS**: The Graph Data Science library provides production-ready implementations of label propagation and Leiden, which community-detection features in Graphiti and GraphRAG use directly rather than re-implementing.

**Mature ecosystem**: Official drivers for Python, Java, JavaScript, Go, .NET. The `neo4j` Python driver is well-maintained and used by all three major agent memory libraries (Graphiti, Mem0, Cognee). The `langchain_neo4j` package handles LangChain integration.

## Critical Limitations

**Failure mode — Schema drift under concurrent writes**: Neo4j does not enforce relationship schema constraints (only node property constraints with `CREATE CONSTRAINT`). In multi-threaded agent systems, concurrent `add_episode()` calls for the same user can create duplicate nodes or inconsistent relationship states. Graphiti uses `semaphore_gather` with a configurable `SEMAPHORE_LIMIT` to control concurrency, but there is no database-level locking on the entity resolution step. Two concurrent episodes mentioning "Alice" may each independently merge to different node representations before the other's merge runs.

**Infrastructure assumption — APOC is not always available**: Graphiti explicitly requires APOC, which is disabled by default on Neo4j Aura Free. This assumption is not stated in top-level documentation and causes silent failures on cloud deployments. Teams moving from local development (where they control APOC installation) to managed cloud Neo4j need to explicitly enable APOC or switch to Aura Enterprise.

## When Not to Use It

**Small-scale or prototype workloads**: Neo4j requires a running server process with minimum ~1GB heap (2-4GB recommended). If your agent deployment stores fewer than ~100,000 nodes or doesn't need multi-hop traversal, Kuzu (embedded, zero-server) or SQLite with graph logic in application code is cheaper and simpler to operate.

**Pure embedding search workloads**: If your retrieval pattern is "find the top-k semantically similar facts to this query" without relationship traversal, a dedicated [vector database](../concepts/vector-database.md) like [Qdrant](../projects/qdrant.md) or [ChromaDB](../projects/chromadb.md) will outperform Neo4j on raw throughput and cost less to operate.

**Teams without Cypher expertise**: LLM-generated Cypher is unreliable (which is why Graphiti explicitly avoids it). If your team cannot write and debug Cypher queries directly, the abstraction layers in LangChain Neo4j or OGM libraries add complexity without the performance benefits.

**Cost-sensitive serverless deployments**: Neo4j Aura pricing is based on memory allocation, and the minimum production tier (~$65/month as of 2024) is significant compared to serverless alternatives. For intermittent or bursty agent workloads, the always-on server cost is inefficient.

## Unresolved Questions

**License ambiguity at scale**: Neo4j is dual-licensed: Community Edition (GPL v3, requires open-sourcing derivatives in some interpretations) and Enterprise Edition (commercial). The GPL v3 scope for server-side applications using the driver protocol (rather than embedding Neo4j code) is ambiguous. Production deployments typically use Enterprise via AuraDB, but cost and terms are not publicly published — you negotiate pricing.

**Vector index maturity vs. dedicated vector DBs**: Native vector indexes arrived in Neo4j 5.11 (late 2023). Performance benchmarks comparing Neo4j vector search against dedicated vector databases at scale are not published. The convenience of having both in one system may come at a retrieval throughput cost that matters at high query volumes.

**Community detection refresh scheduling**: Graphiti's documentation acknowledges that incrementally updated label propagation communities "gradually diverge from full recomputation results, requiring periodic refreshes," but does not specify when or how expensive a full GDS label propagation run is at scale. This is an operational gap for production deployments.

**Multi-tenant isolation overhead**: Neo4j's built-in multi-tenancy uses separate databases per tenant (Enterprise only). Graphiti's `group_id` approach uses query filters on shared storage, which is cheaper but means all tenant data shares the same indexes. At high tenant counts, index scan overhead and potential cross-tenant data leakage via mis-scoped queries are uncharacterized.

## Alternatives

**[Kuzu](../projects/graphiti.md)** (embedded, Apache 2.0): Zero-server graph database with Cypher-compatible query language. Graphiti supports it as an alternative backend. Use Kuzu when you want graph capabilities without a server process, or for single-developer deployments. Kuzu models edges as intermediate nodes, requiring schema adjustments, but the operational simplicity is significant.

**FalkorDB** (Redis-based graph database): Lower latency for simple pattern queries, Redis-compatible deployment. Graphiti supports it. Use FalkorDB when you're already running Redis and want graph queries on that infrastructure.

**[PostgreSQL](../projects/postgresql.md) with Apache AGE**: SQL + graph queries in one database using the AGE extension. Cognee supports Apache AGE. Use when your team is PostgreSQL-native and you want to avoid a separate graph database. AGE's Cypher support is partial and less mature than Neo4j's.

**AWS Neptune**: Managed graph database supporting both property graphs (Gremlin/openCypher) and RDF (SPARQL). Graphiti and Cognee both support it. Use Neptune when you're AWS-native and want a fully managed graph database with no infrastructure to operate. Cost is substantially higher than self-hosted Neo4j.

**[Elasticsearch](../projects/elasticsearch.md)**: Not a graph database, but relevant for the hybrid search case. Elasticsearch's `more_like_this` and graph explore API provide some graph-like query patterns on top of inverted indexes. Use Elasticsearch when your primary need is text search with lightweight relationship filtering, not structural graph traversal.

**Selection guidance**: Use Neo4j when you need production-grade graph traversal with Cypher expressiveness, have the infrastructure budget for a persistent server, and your team can write and maintain Cypher. Use Kuzu for development or single-deployment scenarios. Use Neptune when you need fully managed infrastructure on AWS. Use a vector database directly when multi-hop graph traversal is not in your query patterns.

## Related Concepts

- [Knowledge Graph](../concepts/knowledge-graph.md): The data model Neo4j implements
- [GraphRAG](../concepts/graphrag.md): Retrieval pattern that uses graph structure for multi-hop reasoning
- [Hybrid Search](../concepts/hybrid-search.md): Combining Neo4j's vector, full-text, and graph traversal indexes
- [Agent Memory](../concepts/agent-memory.md): The application layer that uses Neo4j for persistence
- [Entity Extraction](../concepts/entity-extraction.md): The pipeline stage that populates Neo4j with entities and relationships

## Related Projects

- [Graphiti](../projects/graphiti.md): Most sophisticated Neo4j consumer in agent memory; bi-temporal knowledge graph
- [Mem0](../projects/mem0.md): Uses Neo4j optionally for its graph memory layer
- [LangChain](../projects/langchain.md): Provides `langchain_neo4j` integration used by Mem0
- [LlamaIndex](../projects/llamaindex.md): Provides Neo4j graph store integration for document RAG pipelines
