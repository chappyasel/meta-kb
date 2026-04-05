---
entity_id: neo4j
type: project
bucket: knowledge-bases
abstract: >-
  Neo4j is a native graph database that stores data as nodes and relationships,
  used across agent memory, RAG, and knowledge graph pipelines as the persistent
  graph backend for tools like Graphiti, Cognee, and Mem0.
sources:
  - repos/topoteretes-cognee.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - OpenAI
  - Knowledge Graph
last_compiled: '2026-04-05T20:31:22.282Z'
---
# Neo4j

## What It Does and What's Architecturally Unique

Neo4j is a native graph database that stores data as nodes and typed, directed relationships rather than tables or documents. Its storage engine physically co-locates connected nodes and edges on disk, so traversing relationships avoids the join overhead of relational databases. This makes it the dominant persistent graph backend in the LLM knowledge graph space: [Graphiti](../projects/graphiti.md) uses it as the primary store for temporal entity graphs, [Cognee](../projects/cognee.md) supports it as one of six graph backends, and [Mem0](../projects/mem0.md) uses it as the optional graph layer via `langchain_neo4j`.

The database exposes two primary interfaces: Cypher (a declarative query language for graph traversal) and the Bolt wire protocol (a binary protocol for driver connections). Alongside the core database, Neo4j ships APOC (a procedure library required by Graphiti for index creation) and native vector index support via Lucene, enabling the hybrid semantic + BM25 + graph traversal search pattern that Graphiti's paper describes.

## Core Mechanism: How It Works

### Storage Model

Neo4j's native graph storage represents each node and each relationship as a fixed-length record on disk. Each node record holds a pointer to its first relationship. Each relationship record holds pointers to the previous and next relationship for both its source and target nodes, forming doubly-linked lists. Traversal from a node to its neighbors follows these pointers without a table scan.

This makes k-hop traversal O(degree^k) rather than O(n) for relational joins, which is why Graphiti's breadth-first search retrieval runs efficiently for typical agent memory graphs.

### Query Language (Cypher)

Cypher uses ASCII-art patterns to match graph structure:

```cypher
MATCH (a:EntityNode)-[r:RELATES_TO]->(b:EntityNode)
WHERE r.valid_at <= $reference_time AND (r.invalid_at IS NULL OR r.invalid_at > $reference_time)
RETURN a, r, b
ORDER BY r.valid_at DESC
LIMIT 10
```

Graphiti's driver implementation (`graphiti_core/driver/`) uses predefined Cypher queries for all mutations. The Zep paper [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) explicitly notes this choice: "using predefined queries ensures consistent schema and reduces hallucinations" compared to LLM-generated graph queries.

### Vector Indices

Neo4j 5.x added native vector index support backed by Lucene's HNSW implementation. Graphiti stores 1024-dimensional embeddings on both entity nodes and entity edges, querying them via `db.index.vector.queryNodes()`. This enables cosine similarity search without a separate vector database, keeping semantic search co-located with graph traversal.

The three-method hybrid search in Graphiti exploits all three Neo4j primitives simultaneously:
- `cosine_similarity` via the Lucene vector index
- `bm25` via the Lucene full-text index
- `bfs` via native Cypher traversal

### APOC Dependency

APOC (Awesome Procedures on Cypher) is a plugin library providing additional procedures for indexing, graph algorithms, and batch operations. Graphiti's `build_indices_and_constraints()` call requires APOC to create composite indices. This is a notable constraint: Neo4j deployments without APOC (e.g., some cloud-managed configurations) break Graphiti initialization.

## Key Numbers

Neo4j's self-reported figures: 30+ billion nodes in production deployments, sub-100ms traversal on multi-hop queries at scale. These are vendor claims without third-party methodology.

From published benchmarks using Neo4j as the backend:
- Graphiti on LongMemEval: 18.5% accuracy improvement over full-conversation baseline with gpt-4o; 91% query latency reduction [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). These are self-reported but use a reproducible benchmark methodology.
- Cognee reports ~90% accuracy vs ~60% for baseline RAG on HotPotQA. Self-reported, methodology limitations acknowledged by the authors themselves [Source](../raw/deep/repos/topoteretes-cognee.md).

Both sets of numbers reflect the performance of entire agent memory pipelines with Neo4j as the backend, not Neo4j in isolation.

## Strengths

**Native graph traversal.** Multi-hop queries that would require multiple self-joins in Postgres run as single Cypher statements following relationship pointers. Graphiti's BFS search over entity neighborhoods runs in this mode.

**Co-located vector + graph search.** The native vector index means an agent memory pipeline can run semantic search, full-text search, and graph traversal against a single database instance. Graphiti's parallel hybrid search exploits this directly.

**Bi-temporal query support.** Graphiti's temporal edge model (four timestamps per edge: `valid_at`, `invalid_at`, `expired_at`, `reference_time`) maps cleanly to Neo4j's flexible property model. Queries filtering on all four timestamps in a single Cypher statement work without schema changes.

**Schema flexibility.** Nodes and edges carry arbitrary properties without migrations. When Graphiti adds a new edge attribute (e.g., `source_task`), it writes immediately without ALTER TABLE overhead.

**Production ecosystem.** Native drivers exist for Python, Java, Go, .NET, and JavaScript. Kubernetes Helm charts, cloud-managed offerings (Aura), and enterprise support contracts exist. Cognee's and Graphiti's Docker Compose configurations ship pre-configured Neo4j services.

## Critical Limitations

**Concrete failure mode: APOC dependency breaks managed deployments.** Graphiti requires APOC for index creation. Neo4j Aura (the managed cloud offering) does not include APOC by default and restricts procedure installation. A team attempting to deploy Graphiti against Aura Free will hit `No procedure with the name 'apoc.schema.assert' registered` on `build_indices_and_constraints()`. This is undocumented in Graphiti's README. The workaround is using Aura Professional or AuraDB Enterprise with APOC enabled, or running self-hosted Neo4j.

**Unspoken infrastructure assumption: single-node write throughput.** Neo4j Community and a default self-hosted Neo4j Enterprise installation are single-writer. The Zep paper's benchmark [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) tests from a consumer laptop to AWS us-west-2, with per-episode latency dominated by LLM calls (4-5 per episode), not Neo4j write latency. At high ingestion throughput (thousands of episodes per hour), write contention on the single transaction log becomes the bottleneck. Neo4j Causal Clustering (read replicas + core members) addresses this but requires Enterprise licensing. The community edition has no horizontal write scaling.

## When NOT to Use It

**When your graph is small and rarely traversed.** If your knowledge graph has fewer than 10,000 nodes and queries primarily use semantic similarity rather than multi-hop traversal, a vector store with metadata filtering (Qdrant, pgvector) plus optional edge metadata will outperform Neo4j on operational simplicity while matching on latency. The graph traversal advantage only materializes at meaningful graph depth and density.

**When you need embedded/serverless operation for local development.** Neo4j requires a running JVM process. For local development, laptop demos, or CI environments without Docker, Kuzu (Graphiti's alternative backend) or DuckDB with edge tables are better options. Graphiti explicitly supports Kuzu for this reason [Source](../raw/deep/repos/getzep-graphiti.md).

**When your team has no Cypher experience and query patterns are simple.** If retrieval is always "find the top-k semantically similar facts for user X," a vector store with user_id metadata filtering handles it without the operational overhead of a graph database. Mem0's default configuration (Qdrant without Neo4j) covers most personalization use cases this way [Source](../raw/deep/repos/mem0ai-mem0.md).

**When cost is constrained.** Neo4j Enterprise licensing is expensive. The Community edition lacks certain indexing optimizations and has no commercial support. Neo4j Aura's free tier has node and relationship limits that production agent memory graphs will exceed quickly.

## Unresolved Questions

**Garbage collection of expired edges.** Graphiti's bi-temporal model never deletes contradicted edges; it sets `expired_at` and lets them accumulate. The Zep paper does not address compaction or how query performance degrades as the ratio of expired-to-active edges grows [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). At production scale (millions of edges, months of operation), this matters.

**Index behavior at soft-delete scale.** Mem0's graph layer uses soft deletion (`r.valid = false`) with a `WHERE r.valid IS NULL OR r.valid = true` filter on every query [Source](../raw/deep/repos/mem0ai-mem0.md). As invalidated relationships accumulate, this filter must scan them. The query plan behavior when the invalid:valid ratio inverts is not documented.

**Multi-tenant isolation cost.** Graphiti uses `group_id` to namespace graph data within a single Neo4j instance [Source](../raw/deep/repos/getzep-graphiti.md). This simplifies deployment but means all tenants share the same transaction log and write throughput. For enterprise multi-tenant deployments, whether separate databases (Neo4j supports multiple databases per instance in Enterprise) or separate instances are required is an architectural question the documentation doesn't address.

**Consistency guarantees during parallel writes.** Graphiti's `add_episode()` pipeline makes multiple graph writes across a single episode: entity nodes, entity edges, community nodes, community edges. These are not wrapped in a single transaction in the published codebase. What happens when one write succeeds and a later one fails within the same episode ingestion is not specified.

## Alternatives

| Alternative | When to Choose It |
|---|---|
| [Kuzu](https://kuzudb.com) | Embedded graph database, no separate process needed, good for local development and CI. Graphiti and Cognee both support it. Column-oriented storage requires modeling edges as intermediate nodes. |
| FalkorDB | Redis-based graph database with Cypher support. Lower operational complexity than Neo4j, active community development. Supported by Graphiti and Cognee. Trade-off: smaller ecosystem, fewer production case studies. |
| Amazon Neptune | Managed graph database for AWS deployments. Avoids self-hosting JVM. Graphiti supports it via NeptuneDriver but requires OpenSearch Serverless for full-text search, adding infrastructure complexity [Source](../raw/deep/repos/getzep-graphiti.md). |
| Memgraph | Neo4j-compatible graph database with stronger streaming/real-time ingestion story. Cognee supports it. MAGE (Memgraph's algorithm library) provides graph analytics Cypher doesn't cover natively. |
| pgvector + PostgreSQL | Use when your data is primarily tabular with occasional graph relationships. Loses native multi-hop traversal but gains transactional consistency, mature tooling, and no additional infrastructure. Mem0 supports pgvector as a vector backend. |

Use Neo4j when: your agent memory system requires multi-hop graph traversal at scale, you need native vector + graph hybrid search in a single query, your team will write non-trivial Cypher, and you can absorb the operational overhead of a JVM-based database. Use Kuzu for development and Neo4j-compatible alternatives for production when licensing cost or managed deployment constraints matter.

## Related Concepts and Projects

- [Knowledge Graph](../concepts/knowledge-graph.md)
- [Graphiti](../projects/graphiti.md) — uses Neo4j as default backend with APOC requirement
- [Cognee](../projects/cognee.md) — supports Neo4j as one of six graph backends
- [Mem0](../projects/mem0.md) — uses Neo4j for optional graph memory layer via langchain_neo4j
- [Graph RAG](../concepts/graph-rag.md)
