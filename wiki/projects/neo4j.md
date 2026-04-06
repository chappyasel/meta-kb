---
entity_id: neo4j
type: project
bucket: knowledge-bases
abstract: >-
  Neo4j is a property graph database used as the primary backend for knowledge
  graph storage in agent memory systems and RAG pipelines, offering native graph
  queries, vector search integration, and ACID compliance at scale.
sources:
  - repos/topoteretes-cognee.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - OpenAI
  - Semantic Memory
  - Episodic Memory
last_compiled: '2026-04-05T23:08:00.852Z'
---
# Neo4j

## What It Does

Neo4j stores data as nodes, relationships, and properties — the native graph structure that makes it the default backend in most production knowledge graph systems for LLM agents. When Graphiti, Cognee, Mem0, and similar agent memory frameworks need to store entity relationships, temporal edges, and community structures, they reach for Neo4j first.

The key architectural distinction from relational and vector databases: queries traverse relationships without joins. A Cypher query that walks five hops through a knowledge graph is one operation, not five sequential index lookups. This matters for [Semantic Memory](../concepts/semantic-memory.md) and [Episodic Memory](../concepts/episodic-memory.md) workloads where the answer to a question lives in how entities connect, not in the text of any single document.

## How It Works

### Property Graph Model

Neo4j stores data as:
- **Nodes** with labels (`EntityNode`, `EpisodicNode`, `CommunityNode`) and arbitrary properties
- **Relationships** with types (`MENTIONS`, `RELATES_TO`, `HAS_MEMBER`) and properties including timestamps
- **Properties** on both nodes and relationships (strings, numbers, datetimes, lists)

Every node and relationship carries a unique internal ID. Cypher queries pattern-match over this structure: `MATCH (a:Entity)-[r:RELATES_TO]->(b:Entity) WHERE a.name = 'Alice' RETURN r, b`.

### Storage Internals

Neo4j uses a custom page-cached store format, not a general-purpose B-tree. Each node record contains a pointer to its first relationship. Each relationship record contains pointers to the previous and next relationship for both the source and target nodes — a doubly-linked list per node. Traversal hops directly follow these pointers without touching any index.

Indexes support both lookup and vector similarity search. Since Neo4j 5.x, native vector indexes (backed by Lucene's HNSW implementation) allow cosine similarity queries inside Cypher:

```cypher
CALL db.index.vector.queryNodes('entity_embeddings', 10, $queryVector)
YIELD node, score
RETURN node.name, score
```

Full-text indexes use Lucene's BM25 for keyword search. Combining both in one query implements the hybrid retrieval that Graphiti, Cognee, and similar frameworks depend on.

### APOC Plugin

Most agent memory frameworks require Neo4j with APOC (Awesome Procedures on Cypher). APOC adds:
- `apoc.merge.node` and `apoc.merge.relationship` for upsert operations without race conditions
- Batch operations for bulk node/edge creation
- Graph algorithms (path finding, centrality) beyond what native Cypher provides
- Utility functions for datetime handling, JSON parsing, and string operations

Graphiti's `Neo4jDriver` explicitly requires APOC for its `operations/` directory — the `build_indices_and_constraints()` call will fail on Neo4j without it.

### Cypher Query Language

Cypher is declarative and pattern-based. A query that retrieves bi-temporal edges between entities:

```cypher
MATCH (a:Entity {name: $source})-[r:RELATES_TO]->(b:Entity)
WHERE (r.valid_at IS NULL OR r.valid_at <= $queryTime)
AND (r.invalid_at IS NULL OR r.invalid_at > $queryTime)
AND (r.expired_at IS NULL)
RETURN a, r, b
ORDER BY r.valid_at DESC
LIMIT 10
```

This pattern — filtering on `valid_at`, `invalid_at`, and `expired_at` — implements the bi-temporal model that Graphiti uses to track how facts change over time. The query planner determines index usage automatically; explicit index hints are available when needed.

## Role in Agent Memory Systems

Neo4j appears in three distinct roles across the LLM knowledge base ecosystem:

**Graph backend for temporal knowledge graphs (Graphiti/Zep):** Graphiti uses `Neo4jDriver` as its primary backend. All entity nodes, episodic edges, and community nodes live in Neo4j. The bi-temporal edge model — with `valid_at`, `invalid_at`, `expired_at`, and `reference_time` on every `EntityEdge` — requires a database that can store arbitrary properties on relationships. Neo4j's relationship property support is a hard requirement here; many graph databases treat edges as property-less. The Graphiti `Neo4jDriver` implements 10+ operation files with predefined Cypher queries (never LLM-generated) for node creation, edge updates, temporal invalidation, and community management. The Zep paper's benchmarks showing +18.5% accuracy on LongMemEval and 90% latency reduction all ran on Neo4j 5.x with APOC. [Source](../raw/deep/repos/getzep-graphiti.md)

**Optional graph layer for vector-primary systems (Mem0):** Mem0's default storage is a vector store (Qdrant). Neo4j activates only when `graph_store.config` is provided. In this mode, `MemoryGraph` in `mem0/memory/graph_memory.py` stores entity-relationship triples alongside the main vector memories. Nodes are merged with Cypher `MERGE` statements; relationships use soft deletion (`r.valid = false`, `r.invalidated_at = datetime()`). The graph layer adds 3+ LLM calls per `add()` operation for entity extraction, relation establishment, and deletion checking. [Source](../raw/deep/repos/mem0ai-mem0.md)

**One of several graph backends (Cognee):** Cognee abstracts graph storage behind a `GraphDBInterface`, supporting Neo4j, Kuzu, AWS Neptune, Memgraph, and Kuzu-remote. Neo4j is a production option but not the default (Kuzu is). Cognee's `TripletSearchContextProvider` runs brute-force triplet search over whatever graph backend is configured — the traversal strategy does not change between backends. [Source](../raw/deep/repos/topoteretes-cognee.md)

## Key Numbers

- **Stars:** Not a GitHub repo — commercial product with open-source Community Edition
- **Neo4j Community Edition:** Free, single-instance, limited cluster support
- **Neo4j Enterprise:** Licensed, full clustering (causal cluster), multi-database, security features
- **AuraDB:** Managed cloud service with free tier (limited storage and memory), Professional tier, and Enterprise tier
- **Vector index limit:** Up to ~10M vectors in a single index before performance degrades (reported by practitioners; not officially benchmarked at this scale)
- **Graphiti benchmark on Neo4j:** 94.8% accuracy on DMR, 71.2% on LongMemEval (gpt-4o), 3.2s query latency vs 28.9s baseline — self-reported in the Zep paper but methodology is detailed and reproducible [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Strengths

**Relationship properties:** Neo4j stores arbitrary key-value properties on edges, not just on nodes. This is non-trivial — many graph databases (including some NewSQL systems) treat edges as property-less pointers. Temporal agent memory requires timestamps, scores, and provenance fields on relationships. Neo4j supports this natively.

**Hybrid search in one query:** Combining vector similarity, BM25 full-text, and graph traversal inside a single Cypher query reduces round trips. Graphiti's search pipeline runs all three in parallel against Neo4j without coordinating across separate services.

**ACID transactions:** Multi-node, multi-edge writes commit atomically. When Graphiti saves an episode's extracted entities, relationships, and community updates, they either all commit or none do. This matters for knowledge graph consistency — a partial write that creates a node without its edges corrupts the graph structure.

**APOC ecosystem:** The plugin provides upsert primitives (`apoc.merge.node`) that eliminate write-write race conditions in concurrent ingestion pipelines. Without upsert support, concurrent entity extraction can create duplicate nodes.

**Mature Cypher tooling:** Query profiling (`EXPLAIN`, `PROFILE`), index management, and schema constraints are production-grade. Adding a uniqueness constraint on entity names is one Cypher statement; adding a vector index is another.

## Critical Limitations

**Infrastructure requirement for development:** Running Neo4j locally requires either Docker or a JVM installation. The APOC plugin adds another configuration step. Frameworks that default to Neo4j (Graphiti) produce confusing errors when APOC is absent. Compare to Kuzu (Cognee's default), which runs embedded with no external process. For local development, this is a meaningful friction point.

**Unspoken assumption — write scaling:** Neo4j Community Edition is single-instance. The Enterprise clustering model (causal cluster) requires at least three nodes for write consensus. Systems that use Neo4j as a knowledge graph backend typically assume single-writer, single-reader topology. Graphiti's `add_episode()` does not implement sharding or distributed write coordination — it assumes one Neo4j instance per `group_id` namespace. At high ingestion rates (hundreds of episodes per minute), a single Neo4j instance becomes a bottleneck before vector stores do.

**Concrete failure mode — community detection at scale:** Graphiti's `get_community_clusters()` issues one Cypher query per entity node to count edge weights before running label propagation. On a graph with 50,000 entity nodes, this is 50,000 sequential queries. Neo4j does not parallelize these internally; the Python driver must await each. Community detection becomes unusable at this scale without batching the edge-count queries, which Graphiti does not do. This is documented nowhere in Graphiti's README or Neo4j's documentation.

## When NOT to Use Neo4j

**When the graph is a thin wrapper over vectors:** If your retrieval is 95% vector similarity and 5% relationship traversal, Neo4j's operational overhead (process management, APOC, Cypher learning curve) does not pay off. Use Qdrant or PGVector with a flat metadata schema instead.

**When you need sub-10ms write latency at high throughput:** Neo4j's ACID transactions add latency per write. For event-streaming workloads ingesting thousands of agent events per second, a purpose-built time-series store or a message queue with async Neo4j writes is the right pattern. Synchronous Graphiti ingestion (4-5 LLM calls + Neo4j writes per episode) is already slow; adding write contention makes it worse.

**When the deployment environment is resource-constrained:** Neo4j requires at least 1-2 GB RAM in practice, more for large graphs. Edge deployments, embedded mobile applications, and serverless environments with memory limits under 512 MB cannot run Neo4j. Kuzu (embedded, column-oriented) is the correct choice in these environments.

**When your team lacks Cypher expertise:** LLM-generated Cypher is unreliable — Graphiti explicitly chose predefined queries over LLM-generated ones for this reason. If no one on the team can read and debug Cypher, query performance issues and schema problems will be opaque.

## Unresolved Questions

**Cost at scale for AuraDB:** AuraDB pricing scales with memory allocation, not query count. A knowledge graph with 10M entity nodes and 50M relationships requires substantial memory allocation. Published pricing is available for small tiers; enterprise contracts are negotiated privately. Teams building on managed Neo4j without understanding the memory-to-cost curve can see unexpected bills as graphs grow.

**Conflict resolution across group_id namespaces:** Graphiti uses `group_id` to create isolated graph namespaces within one Neo4j instance. If two namespaces contain conflicting information about the same real-world entity (e.g., two users have different records for the same company), there is no cross-namespace reconciliation mechanism. The documentation does not address this.

**Neo4j 5.x vs 4.x compatibility:** Graphiti requires Neo4j 5.26+. The vector index API, APOC version compatibility, and some Cypher syntax changed between major versions. Existing Neo4j 4.x deployments cannot use Graphiti without upgrading. The migration path is documented by Neo4j but not by Graphiti.

**Graph compaction and garbage collection:** Graphiti's bi-temporal model marks contradicted edges as expired but never deletes them. Neo4j's storage grows monotonically with the number of invalidated edges. There is no built-in compaction; periodic `MATCH (r:RELATES_TO) WHERE r.expired_at IS NOT NULL AND r.expired_at < $cutoff DELETE r` queries must be scheduled manually. No framework documents this maintenance requirement.

## Alternatives

**[Kuzu](https://kuzudb.com):** Embedded, column-oriented graph database. Cognee defaults to it. No external process, no Docker, no APOC. Kuzu edges cannot carry arbitrary properties the same way Neo4j can — Graphiti models this by treating edges as intermediate nodes in Kuzu. Use Kuzu when you need embedded graph storage for development or single-process deployments.

**FalkorDB:** Redis-compatible graph database supporting a subset of Cypher (openCypher). Graphiti supports it as an alternative backend. Lower operational overhead than Neo4j; less mature ecosystem and tooling. Use FalkorDB when you want lower infrastructure footprint and can accept a smaller feature surface.

**AWS Neptune:** Managed graph database supporting both Gremlin and SPARQL. Graphiti and Cognee both support it. No JVM management, native AWS IAM integration. Requires OpenSearch Serverless for full-text search (separate service). Use Neptune when you're on AWS and need managed infrastructure; expect higher per-query latency than self-hosted Neo4j.

**Memgraph:** In-memory graph database with full Cypher support and MAGE (algorithm library, analogous to APOC). Cognee supports it. Faster query performance than Neo4j for in-memory workloads; data durability requires explicit snapshot configuration. Use Memgraph when query latency matters more than durability guarantees.

**PostgreSQL with AGE or pgvector:** Apache AGE adds graph query support to PostgreSQL via Cypher. pgvector adds vector similarity. Running both in one Postgres instance eliminates the separate graph database process. Use this when your team already runs Postgres and the graph is not the primary query pattern.

## Related Concepts

- [Semantic Memory](../concepts/semantic-memory.md)
- [Episodic Memory](../concepts/episodic-memory.md)
