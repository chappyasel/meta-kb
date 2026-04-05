---
entity_id: qdrant
type: project
bucket: knowledge-bases
abstract: >-
  Qdrant is an open-source vector database written in Rust, offering
  high-performance similarity search with payload filtering — enabling combined
  semantic and structured queries in a single request.
sources:
  - repos/nemori-ai-nemori.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
related:
  - OpenAI
  - Vector Database
last_compiled: '2026-04-05T20:32:47.558Z'
---
# Qdrant

## What It Does

Qdrant is a vector similarity search engine and database, written in Rust, designed to store high-dimensional embedding vectors alongside arbitrary JSON payloads and execute filtered similarity searches in a single query. The defining capability is payload-conditioned search: you can retrieve vectors that are both semantically close to a query embedding AND match structural conditions (e.g., `user_id == "alice"` AND `created_at > 1700000000`). This eliminates the post-filtering step common in systems that treat vector search and metadata filtering as separate operations.

Qdrant is widely used as a memory backend for AI agents and RAG pipelines. [Mem0](../projects/mem0.md) defaults to Qdrant with local file storage at `~/.mem0/`. [Cognee](../projects/cognee.md) lists it as one of eight supported vector store options (`VECTOR_DB_PROVIDER=qdrant`). [Nemori](../projects/nemori.md) uses Qdrant alongside PostgreSQL in a dual-backend architecture, with Qdrant handling all vector storage and similarity search.

## Architecture

### Storage Engine

Qdrant organizes data into **collections**, each containing **points**. A point has three components: a numeric or UUID ID, a dense or sparse vector (or both), and an optional JSON payload. The core data structure for approximate nearest neighbor (ANN) search is HNSW (Hierarchical Navigable Small World graphs), implemented natively in Rust. Qdrant's HNSW implementation supports on-disk storage of graph layers, which matters for collections that exceed RAM capacity.

Vectors can be quantized to reduce memory footprint: scalar quantization (float32 → int8, ~4x compression), product quantization (higher compression, some accuracy loss), and binary quantization (1-bit, extreme compression, best for high-dimensional models like OpenAI's `text-embedding-3-large`). Quantization operates on stored vectors; the query vector is still processed in full precision, with a rescoring step against original vectors to recover accuracy.

### Payload Filtering

Payload indexing is what distinguishes Qdrant from simpler FAISS wrappers. You can define indexes on payload fields (`keyword`, `integer`, `float`, `geo`, `datetime`, `text`), which Qdrant then uses to pre-filter candidates before or during HNSW traversal. The filtering is HNSW-aware: rather than fetching the top-K results and filtering afterward, Qdrant pushes filter conditions into the graph traversal itself. For high-selectivity filters (e.g., retrieving only one user's vectors out of millions), Qdrant dynamically switches to payload-first retrieval — scanning the inverted index for matching IDs, then doing a flat similarity search over that candidate set. This avoids graph traversal over irrelevant regions entirely.

Mem0 relies on this for multi-tenant isolation. Each memory is stored with `user_id`, `agent_id`, `session_id`, and `run_id` as payload fields. A `search()` call filters by user_id (and optionally other fields) to scope retrieval to a single user's memories without maintaining separate collections per user.

### Sparse Vectors and Hybrid Search

Qdrant natively stores sparse vectors alongside dense vectors in the same point. This enables hybrid search: combine a dense semantic embedding with a sparse BM25/SPLADE vector in one request, using Reciprocal Rank Fusion (RRF) or a custom fusion formula to merge results. No external reranker or separate keyword index required.

### Distributed Mode

Qdrant shards collections across nodes. Each shard can be replicated for fault tolerance. The consensus protocol is Raft-based. Shards are assigned to nodes at collection creation; resharding (splitting a shard without downtime) was added in v1.7. The local deployment uses a single-node mode with all data on disk under a configurable `storage_path`.

## Deployment Options

Three modes:

1. **In-memory Python library** (`qdrant_client` with `:memory:` storage) — useful for tests and small experiments, no persistence.
2. **Local file-backed** — the default for Mem0 (`~/.mem0/`), persists to disk, single process.
3. **Qdrant server** (Docker or binary) — full REST and gRPC API, supports replication and distributed mode. `docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant`. gRPC runs on 6334, REST on 6333.

Qdrant Cloud is a managed hosted offering with free tier.

## Key Numbers

- **Stars**: ~22,000+ on GitHub (as of mid-2025; self-reported star counts fluctuate)
- **Language**: Rust (core engine), Python/Go/TypeScript/Rust clients
- **Default embedding support**: any dimension; no built-in embedding model — accepts pre-computed vectors
- **Quantization compression**: ~4x (scalar), up to 32x (binary)
- **HNSW parameters**: `m` (connectivity, default 16) and `ef_construct` (build-time search width, default 100) are tunable per collection

Benchmark numbers from Qdrant's own site and ANN-benchmarks comparisons show competitive recall and QPS, but these are self-reported or run on controlled hardware. Independent verification via [ann-benchmarks.com](https://ann-benchmarks.com/) exists for some configurations but not all claimed production scenarios.

## Strengths

**Filtered search accuracy.** The adaptive filtering strategy (graph traversal vs. flat scan based on filter selectivity) produces consistent recall across filter cardinalities where post-filtering approaches degrade badly on narrow filters.

**Rust performance and memory safety.** No garbage collector pauses. Memory usage is predictable. The Rust implementation also means no Python GIL concerns in the server process.

**Sparse + dense in one system.** Many teams run a separate Elasticsearch or BM25 index for keyword search and a vector DB for semantic search. Qdrant handles both in one query.

**Payload flexibility.** JSON payloads with nested fields, arrays, and geo coordinates are stored and indexed natively. No schema migration required to add new metadata fields.

**Client ecosystem.** First-party clients for Python, Go, TypeScript, Rust, and Java. The Python client handles connection pooling and supports both REST and gRPC backends.

## Critical Limitations

**Concrete failure mode: filter on unindexed payload field.** If you run a filtered search against a payload field without a created index, Qdrant falls back to full collection scan on every query. At 10M+ vectors, this makes filtered search unusably slow. The error message is not obvious — results come back, just slowly. Teams migrating from development (small collections, fast anyway) to production (large collections) routinely hit this. You must explicitly call `create_payload_index` for every field used in filters.

**Unspoken infrastructure assumption: embedding is your problem.** Qdrant stores and searches vectors but generates nothing. You need a separate embedding service (OpenAI API, a local model, etc.) for every insert and query. In a high-throughput pipeline, the embedding call is usually the bottleneck, not Qdrant. Systems that report sub-millisecond Qdrant latency often omit 50-200ms embedding latency from the total request time.

## When NOT to Use Qdrant

**You need full-text search as the primary retrieval mechanism.** Qdrant's sparse vector support works, but if keyword search dominates your workload, Elasticsearch or OpenSearch has better tokenization, analyzer customization, BM25 tuning, and operational tooling.

**Your graph structure matters more than vector similarity.** For knowledge graph traversal (multi-hop entity relationships, path queries), Qdrant provides no graph primitives. Cognee routes graph queries to Neo4j or Kuzu, using Qdrant only for semantic lookup. Using Qdrant alone for knowledge graph use cases requires exporting relationships to a separate system.

**You have a small, stable dataset.** For under ~10,000 vectors with no filtering requirements, a FAISS flat index loaded into memory is simpler, has no server overhead, and has essentially the same latency profile. Qdrant's operational complexity (server process, WAL management, collection configuration) adds friction without proportional benefit at small scale.

**You need ACID transactions across multiple collections.** Qdrant does not support cross-collection transactions. If you need to atomically update vectors and update a relational record together, you handle that in application logic with compensating writes and accept eventual consistency.

## Unresolved Questions

**Resharding at scale.** Qdrant added online resharding in v1.7, but production reports on resharding large collections (100M+ vectors) without search degradation are sparse. The documentation describes the mechanism but not the operational failure modes.

**gRPC vs. REST performance at high QPS.** Qdrant recommends gRPC for high-throughput workloads. The Python client supports both, but the switching threshold and performance delta are not published with reproducible methodology. Teams building high-QPS systems need to benchmark their specific access patterns.

**Storage cost at scale.** Quantization reduces in-memory footprint, but disk usage for the HNSW graph and WAL at hundreds of millions of vectors is not well-documented. The relationship between `m`, `ef_construct`, vector dimension, and total disk usage requires empirical measurement per workload.

**Governance and commercial licensing trajectory.** Qdrant is Apache 2.0 licensed. Qdrant Cloud is the commercial offering. There is no public statement about whether future enterprise features will remain open-source or move to a proprietary tier, as has happened with other vector databases.

## Alternatives

**Use Pinecone** when you want a fully managed vector database with no operational overhead and are comfortable with vendor lock-in. Pinecone handles sharding, replication, and scaling automatically. Qdrant requires you to manage those.

**Use PGVector** when your application already runs on PostgreSQL and your vector workload is modest (under a few million vectors). PGVector stores vectors in standard Postgres tables, enabling joins with existing relational data and eliminating a separate service dependency. Recall drops at scale compared to HNSW-native systems like Qdrant.

**Use Weaviate** when you want built-in embedding model invocation (Weaviate can call embedding APIs on insert) and a GraphQL query interface. Qdrant requires external embedding; Weaviate can manage that step.

**Use Chroma** when you want the simplest possible local setup for prototyping. Chroma's Python-native API requires no configuration. Switch to Qdrant when you need payload filtering, production-grade performance, or distributed deployment.

**Use Milvus** when you need proven distributed-scale performance with a large existing operational community. Milvus is more complex to deploy than Qdrant but has longer production history at hundreds of millions of vectors.

## Related Concepts

- [Vector Database](../concepts/vector-database.md)
- [Retrieval-Augmented Generation](../concepts/rag.md)
