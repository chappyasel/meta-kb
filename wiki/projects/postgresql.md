---
entity_id: postgresql
type: project
bucket: knowledge-bases
abstract: >-
  PostgreSQL is an open-source relational database that serves as the dominant
  backend for agent memory systems, providing structured storage, full-text
  search, and vector similarity via pgvector — often replacing dedicated vector
  databases in production stacks.
sources:
  - repos/natebjones-projects-ob1.md
  - repos/caviraoss-openmemory.md
  - repos/nemori-ai-nemori.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/infiniflow-ragflow.md
related:
  - OpenAI
  - Qdrant
  - Episodic Memory
last_compiled: '2026-04-05T23:05:54.037Z'
---
# PostgreSQL

## What It Does

PostgreSQL is a relational database system that stores structured data with ACID guarantees, full-text search, and — via the pgvector extension — approximate nearest-neighbor vector search. In AI agent and knowledge base systems, it typically handles three distinct jobs: relational metadata (users, documents, sessions, permissions), vector embeddings for semantic retrieval, and structured memory storage for long-term agent memory.

It is not a dedicated vector database or graph store, but its flexibility means it displaces both in many production stacks. Across the source material, PostgreSQL appears as a dependency in nearly every system reviewed: Acontext, Nemori, Cognee, and RAGFlow all list it as a production-required component.

## Core Mechanism

PostgreSQL stores rows in heap files on disk, indexed via B-tree (default), GIN, GiST, BRIN, and hash structures. Queries plan through a cost-based optimizer (`pg_plan_hints`, statistics via `ANALYZE`), execute via a process-per-connection model, and write through a WAL (write-ahead log) for crash recovery.

The pgvector extension (`CREATE EXTENSION vector`) adds a `vector(n)` column type and two index types:

- **IVFFlat** — Inverted file index with flat quantization. Partitions vector space into `lists` cells, searches `probes` cells at query time. Fast to build, approximate. Set `ivfflat.probes` higher for better recall at latency cost.
- **HNSW** — Hierarchical Navigable Small World graph. Builds a multi-layer graph during insert, traverses it at query time. Better recall than IVFFlat for most workloads, slower to build, higher memory usage.

Distance operators: `<->` (L2), `<#>` (negative inner product), `<=>` (cosine). Queries like `ORDER BY embedding <=> query_vec LIMIT 10` combine with standard `WHERE` clauses for filtered vector search.

Full-text search runs through `tsvector` (preprocessed token vectors) and `tsquery` (query expressions), indexed with GIN. Combined with pgvector, this enables hybrid search — keyword match plus semantic similarity — in a single query, without a separate search backend.

## How It Appears in Agent Memory Systems

### Acontext
[Acontext](../projects/acontext.md) uses PostgreSQL as shared storage between its Go API layer (GORM ORM) and Python AI core (SQLAlchemy). The two ORMs must stay in sync — a documented operational risk. PostgreSQL holds session metadata, organization/project records, and artifact references, while pgvector stores the embeddings used by the Skill Learner Agent when searching existing skills.

### Nemori
[Nemori](../projects/nemori.md) uses PostgreSQL 16 with GIN-indexed `tsvector` columns for text search and message buffering, paired with Qdrant for vector storage. The `docker/init-extensions.sql` file initializes the extensions. Nemori's choice to keep vectors in Qdrant rather than pgvector reflects a common pattern: PostgreSQL handles structured metadata and full-text, a dedicated vector store handles embedding search, each doing what it does best.

### Cognee
[Cognee](../projects/cognee.md) defaults to SQLite in development but recommends PostgreSQL for production via `DB_PROVIDER=postgres`. It also supports pgvector as a vector backend (`VECTOR_DB_PROVIDER=pgvector`), making PostgreSQL capable of replacing both the relational and vector tiers. SQLAlchemy + Alembic migrations manage the schema. The three-store architecture (relational + vector + graph) can collapse to two stores — or even one — when pgvector handles embedding search.

### RAGFlow
[RAGFlow](../projects/ragflow.md) lists PostgreSQL as an alternative to MySQL for its relational tier, handling document metadata, task state, and user/tenant management. The primary search backend remains Elasticsearch for its distributed capabilities, but PostgreSQL absorbs the structured side of the stack.

### Mem0
[Mem0](../projects/mem0.md) supports pgvector as one of 23 vector store backends via `VectorStoreFactory`. Configuration: `vector_store=VectorStoreConfig(provider="pgvector", config={...})`. For teams already running PostgreSQL, this eliminates a separate vector database deployment.

## Key Numbers

PostgreSQL is mature software with well-characterized performance:

- **pgvector HNSW** benchmarks (pgvector GitHub, 2024): 98%+ recall at ~1ms query latency for 1M 1536-dimensional vectors on modern hardware with appropriate `ef_search` settings. IVFFlat achieves similar recall at lower memory cost but requires a build phase after initial data load.
- **Concurrent connections**: Process-per-connection model means connection pooling (PgBouncer, pgpool-II) is required above ~100 concurrent clients. Without pooling, connection overhead dominates at scale.
- **Star count**: 17k+ on GitHub for pgvector extension (independently measured). PostgreSQL core repository is a mirror with no meaningful star count.

Self-reported benchmarks from pgvector's own README show favorable comparisons to Qdrant and Pinecone on accuracy/latency tradeoffs — treat as directional rather than definitive. Independent ANN Benchmarks (ann-benchmarks.com) include pgvector and show it competitive but not leading on pure throughput.

## Strengths

**Transactional correctness.** ACID guarantees mean agent memory writes either succeed or fail atomically. No partial updates, no inconsistent reads. For systems tracking user permissions alongside memory data (Cognee's ACL model, Acontext's organization structure), this matters — a failed permission check shouldn't leave half-written state.

**Single-system simplification.** pgvector eliminates the operational burden of running a separate vector database for many production workloads. One connection string, one backup target, one monitoring system. The mem0, Cognee, and Acontext stacks all allow this collapse.

**Hybrid search in one query.** Combining `tsvector` full-text with `vector` similarity in a single SQL query avoids the retrieval fusion complexity that systems using separate backends must manage. Nemori uses exactly this pattern.

**Ecosystem maturity.** Every major ORM (SQLAlchemy, GORM, Prisma, Django ORM) supports PostgreSQL. Connection poolers, backup tools, monitoring integrations, managed cloud offerings (AWS RDS, Supabase, Neon, Google Cloud SQL) are all production-proven.

## Critical Limitations

**Concrete failure mode — write amplification under concurrent embedding inserts.** HNSW index maintenance during INSERT operations is expensive. Each new vector modifies the graph structure, acquiring write locks. Under concurrent ingestion (multiple agent sessions writing memories simultaneously), this creates lock contention that degrades throughput significantly. The Acontext architecture uses Redis-based distributed locks to serialize Skill Learner Agent runs per learning space — a workaround for exactly this problem. Systems that allow parallel embedding inserts without coordination will see this in production.

**Unspoken infrastructure assumption — connection pooling is mandatory.** PostgreSQL's process-per-connection model breaks down above ~100 concurrent connections. Every source system reviewed assumes a pooler (PgBouncer is standard) is in place for production deployments, but none explicitly document this requirement. A system that works in development with 5 connections will fail unexpectedly under production load without pooling.

## When NOT to Use It

**High-throughput vector-only workloads.** When the primary access pattern is ANN search over hundreds of millions of vectors with strict latency SLAs, purpose-built systems (Qdrant, Weaviate, Milvus) outperform pgvector. These systems implement HNSW in optimized C++ with SIMD acceleration and memory-mapped index files; pgvector runs inside PostgreSQL's general execution model. The gap matters at scale — Qdrant's filtered vector search at 10M+ vectors runs measurably faster than pgvector's equivalent.

**Graph-heavy workloads.** PostgreSQL with pgvector handles relational + vector storage well. It does not handle graph traversal. Systems needing multi-hop entity relationships — Cognee's knowledge graph, RAGFlow's GraphRAG — route those queries to Neo4j, Kuzu, or Memgraph. Using PostgreSQL as a graph store via recursive CTEs is possible but painful.

**Serverless / ephemeral environments.** PostgreSQL requires persistent connections and stateful process management. Cold-start latency in AWS Lambda or Cloudflare Workers makes it a poor fit for truly serverless deployments. Serverless-native alternatives (Neon for PostgreSQL-compatible serverless, DynamoDB with pgvector-equivalent libraries) fit these environments better.

**Team unfamiliar with SQL.** The LLM memory space has developed document-store and key-value APIs that abstract away SQL entirely. Mem0's API (`memory.add()`, `memory.search()`) works identically against pgvector or Qdrant backends. If the team finds SQL mental overhead burdensome, a pure vector database with a higher-level SDK may deliver faster iteration.

## Unresolved Questions

**Cost at scale with pgvector.** The pgvector documentation does not address HNSW index memory usage at scale clearly. A 1536-dimensional float32 vector uses 6KB of storage; 10M vectors require ~60GB for storage alone before HNSW graph overhead. Production cost modeling requires empirical testing, not documentation review.

**Conflict resolution in multi-ORM stacks.** Acontext uses both GORM (Go) and SQLAlchemy (Python) against the same PostgreSQL instance, with the explicit note that "ORMs must be kept in sync." The documentation does not explain what happens when they diverge — which migrations take precedence, how schema conflicts are detected, or what the recovery path is.

**Managed vs. self-hosted tradeoffs for pgvector.** Neon, Supabase, and AWS RDS all offer pgvector support, but with different version lag and configuration limits. Which managed offerings support current pgvector features (HNSW was added in 0.5.0) is not consistently documented. Teams adopting pgvector in managed environments should verify extension version before committing.

## Alternatives

**[Qdrant](../projects/qdrant.md)** — Purpose-built vector database with filtered search, payload indexing, and snapshot-based backups. Use when vector search is the primary workload and you want best-in-class ANN performance without PostgreSQL overhead. Nemori uses Qdrant alongside PostgreSQL for exactly this split.

**SQLite + sqlite-vec** — Zero-dependency local-first alternative for development and single-user deployments. Cognee defaults to SQLite. No networking, no connection management, no Docker required. Unsuitable for concurrent multi-user production workloads.

**Neo4j / Kuzu** — Graph databases for entity relationship storage. Use when the access pattern requires multi-hop traversal (GraphRAG, knowledge graph queries) rather than relational or vector lookup. Cognee supports both as optional graph store backends alongside PostgreSQL for relational storage.

**Elasticsearch / OpenSearch** — Distributed search engines with vector capabilities. RAGFlow defaults to Elasticsearch for its ability to handle large-scale distributed deployments and its mature BM25 implementation. Use when the primary requirement is full-text search at scale across millions of documents rather than transactional storage.

**Pinecone / Weaviate** — Fully managed vector databases. Use when operational simplicity outweighs cost, or when the team lacks PostgreSQL expertise. No infrastructure to manage, but vendor lock-in and egress costs apply.

---

*Related: [Episodic Memory](../concepts/episodic-memory.md) | [Cognee](../projects/cognee.md) | [Mem0](../projects/mem0.md)*


## Related

- [OpenAI](../projects/openai.md) — part_of (0.3)
- [Qdrant](../projects/qdrant.md) — alternative_to (0.5)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.4)
