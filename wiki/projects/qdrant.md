---
entity_id: qdrant
type: project
bucket: knowledge-bases
abstract: >-
  Qdrant is an open-source vector database written in Rust, optimized for
  high-throughput similarity search over dense embeddings with built-in payload
  filtering, named vectors, and a Rust-native HNSW implementation that
  prioritizes search speed over ingestion flexibility.
sources:
  - repos/nemori-ai-nemori.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
last_compiled: '2026-04-06T02:08:37.624Z'
---
# Qdrant

**Type:** Project — Vector Database / Similarity Search Engine
**Bucket:** Knowledge Bases
**GitHub:** [qdrant/qdrant](https://github.com/qdrant/qdrant)
**Stars:** ~22,000 (as of mid-2025, self-reported growth metrics)
**Language:** Rust
**License:** Apache 2.0
**Cloud offering:** Qdrant Cloud (managed), self-hosted free

---

## What It Does

Qdrant stores high-dimensional vectors (embeddings) and retrieves the nearest neighbors to a query vector, fast. It runs as a standalone HTTP/gRPC service, so your application calls it over a network connection rather than embedding it in-process.

The primary use case is [Retrieval-Augmented Generation](../concepts/rag.md): you embed your documents, store the vectors in Qdrant with attached metadata (the "payload"), and at query time you embed the question, run a nearest-neighbor search, and inject the retrieved chunks into an LLM prompt. Qdrant also fits agent memory architectures where [semantic memory](../concepts/semantic-memory.md) needs fast approximate retrieval at scale.

---

## Architectural Differentiators

**Rust core.** Qdrant is written entirely in Rust. This eliminates Python's GIL, gives tight control over memory layout, and enables the team to hand-tune their HNSW graph implementation rather than wrapping a C library like hnswlib. The tradeoff: the codebase is harder to fork or patch for users without Rust experience.

**Named vectors.** A single point (document chunk) can carry multiple named vector fields — e.g., `{"dense": [...], "sparse": [...], "colbert": [...]}`. This enables [hybrid retrieval](../concepts/hybrid-retrieval.md) within a single collection without managing multiple indexes externally. You query each named vector separately and combine scores client-side or via Qdrant's built-in fusion operators.

**Payload filtering during HNSW traversal.** Most vector databases filter after search: retrieve top-K candidates, then filter by metadata. Qdrant filters *during* graph traversal, pruning branches that can't satisfy the filter condition. For high-selectivity filters (e.g., "only documents from tenant X" in a multi-tenant setup), this substantially reduces scanned vectors. The implementation lives in `src/segment/src/index/hnsw_index/` — specifically the `HNSWIndex` struct's `search_with_graph` method which accepts a `Filter` at traversal time.

**Sparse vector support (SPLADE/BM25).** Qdrant natively indexes sparse vectors as a separate index type (`SparseVectorConfig`), enabling [BM25](../concepts/bm25.md)-style keyword retrieval alongside dense semantic search. This makes true hybrid search possible without a separate Elasticsearch or OpenSearch instance.

**Segment architecture.** Collections are divided into segments, each an independent HNSW index. Segments are sealed (immutable, memory-mapped) or appendable (in-memory buffer). New writes go to the appendable segment; background optimization merges and seals them. This design means writes don't degrade search on the sealed segments, but it also means freshly inserted vectors may live in a less-optimized structure until the next optimizer cycle.

---

## Core Mechanism

**Collection → Points → Vectors + Payload.** The fundamental data model: a *collection* holds *points*, each with a UUID, one or more named vectors, and a JSON *payload* (arbitrary metadata for filtering and return). No schemas required.

**HNSW indexing.** Qdrant builds a Hierarchical Navigable Small World graph per named vector per segment. The relevant source directory is `lib/segment/src/index/hnsw_index/`. The `HnswGraphLayersBuilder` constructs the multi-layer graph during indexing. At search time, `HNSWIndex::search_with_graph` enters at the top layer, greedily descends toward the query, and at the bottom layer collects candidates — all while respecting the filter predicate on each candidate point's payload.

**Quantization.** Qdrant supports scalar quantization (SQ8), product quantization (PQ), and binary quantization. Quantized vectors live in a compressed on-disk format; a rescore step uses original vectors for final ranking. Quantization reduces RAM requirements and increases throughput at the cost of recall — the `hnsw_config.ef` parameter controls the recall-speed tradeoff during search.

**WAL + snapshots.** Writes first go to a Write-Ahead Log, then apply to the appendable segment. Snapshots serialize a collection to a portable archive for backup or migration. The optimizer runs background merges asynchronously.

**Distributed mode.** Qdrant shards collections across nodes. Each shard is a self-contained set of segments. A leader node routes queries to the appropriate shards and merges results. Replication factor is configurable per collection.

---

## Key Numbers

| Metric | Value | Credibility |
|---|---|---|
| GitHub stars | ~22,000 | Public, independently verifiable |
| ANN Benchmarks (recall@10, 1M vectors, 768-dim) | 0.95+ recall at ~2,000 QPS on single node | Self-reported in Qdrant blog posts; independently benchmarked at [ann-benchmarks.com](https://ann-benchmarks.com) — results vary by hardware |
| Qdrant Cloud free tier | 1GB RAM, 1 node | Self-reported |
| Max vector dimensions | 65,535 | From source code (`src/common/src/types.rs`) |

ANN Benchmarks (ann-benchmarks.com) includes Qdrant in standard test suites — this is one of the few vector databases with independent third-party benchmark coverage. Results confirm competitive recall/speed tradeoffs, though exact numbers depend on the dataset, ef_construction settings, and hardware.

---

## Strengths

**Filtering performance at high selectivity.** When your query needs both semantic similarity *and* a tight metadata condition (user ID, date range, language code), Qdrant's filtered HNSW traversal consistently outperforms post-filter approaches. This is the clearest architectural advantage over systems that bolt filtering onto a standard HNSW library.

**Multi-tenant isolation without multiple collections.** Payload filtering plus named tenant fields lets you serve thousands of tenants from a single collection. Alternatives often push you toward per-tenant collections, which creates collection proliferation and management overhead.

**Hybrid retrieval without external systems.** Named vectors + sparse vector support means you can run dense semantic search and sparse keyword search in the same query, with Qdrant's reciprocal rank fusion combining scores. Competitors like [ChromaDB](../projects/chromadb.md) lack native sparse vector support and require external keyword indexes.

**Stable REST and gRPC APIs.** The OpenAPI spec is comprehensive and versioned. Client libraries exist for Python, JavaScript/TypeScript, Go, Rust, Java, and .NET. The Python client (`qdrant-client`) is the most actively maintained and covers the full API surface.

**Production operational model.** Qdrant runs as a Docker container or binary, persists data to disk by default, and supports multi-node replication. It behaves like a database, not a library — appropriate for production deployments where the service needs to survive restarts.

---

## Critical Limitations

**Concrete failure mode — optimizer lag during bulk ingestion.** Qdrant's segment optimizer runs asynchronously. When you bulk-insert a large corpus (hundreds of thousands of vectors), newly inserted points sit in unoptimized appendable segments until the optimizer catches up. During this window, search recall can drop measurably because HNSW quality on the appendable segment is lower. Workaround: wait for `optimizers_status.ok` in the collection info endpoint before running production queries. Many teams hit this when loading initial datasets and see poor results, not realizing the index isn't fully built.

**Unspoken infrastructure assumption — memory sizing.** HNSW graphs are stored in RAM for active segments. At 768-dimensional float32 vectors, rough estimate: 1M vectors ≈ 3-4GB RAM for the index alone, before payload. Qdrant Cloud's free tier (1GB RAM) handles roughly 200K-300K vectors at this dimension. Teams that start on the free tier and scale without re-planning RAM hit OOM restarts. The documentation mentions this but doesn't provide explicit sizing calculators, so teams discover it at scale.

---

## When NOT to Use It

**Very small datasets (under ~50K vectors).** The HNSW index has a build cost and memory floor. For small datasets, brute-force exact search is faster to implement, zero infrastructure overhead, and competitive on latency. [ChromaDB](../projects/chromadb.md) running in-process is simpler and adequate.

**Embedded/in-process use.** Qdrant runs as a service. If your application needs to ship a single binary or run in environments where a separate network service is impossible (edge devices, serverless with tight cold-start budgets), Qdrant is wrong. Use [ChromaDB](../projects/chromadb.md)'s ephemeral in-memory mode or a library like `usearch`.

**Teams that need a Python-native extensibility model.** Qdrant's Rust core means you cannot extend it in Python. You cannot add custom distance functions, custom index types, or custom scoring logic without forking the Rust codebase. Systems like Weaviate or LanceDB offer more accessible extensibility points.

**Workloads requiring SQL joins.** Qdrant has no relational query capability. If your retrieval needs involve complex multi-collection joins or aggregations, you need a vector extension on a relational DB (pgvector on PostgreSQL) rather than a pure vector database.

**Heavy write throughput with low read latency simultaneously.** The segment/optimizer architecture optimizes for read-heavy workloads. Systems that require both continuous high-volume writes *and* sub-millisecond search latency on the freshest data will experience tension between the two, because fresh vectors live in less-optimized segments.

---

## Unresolved Questions

**Cost at scale on Qdrant Cloud.** Qdrant Cloud pricing is consumption-based, but the public pricing page uses resource units (RAM, CPU) rather than simple per-vector fees. Teams running multi-tenant workloads with variable load patterns have reported difficulty predicting monthly costs before observing actual usage.

**Conflict resolution in distributed mode.** The documentation describes replication but does not specify the consistency model precisely. Is it eventual consistency or does a write require acknowledgment from N replicas? The source code suggests configurable write consistency (`WriteOrdering`), but the default behavior and failure semantics during network partitions are underdocumented.

**Long-term governance.** Qdrant GmbH controls the project. The Apache 2.0 license is permissive, but the company could relicense future versions or move features to a proprietary cloud tier (a pattern seen with other infrastructure companies). No community governance structure is documented.

**HNSW parameter guidance at scale.** The `ef_construction` and `m` parameters in `hnsw_config` significantly affect index quality, build time, and RAM usage. Qdrant provides defaults but minimal guidance on how to tune these for specific recall/throughput targets. Users typically discover optimal settings through experimentation.

---

## Alternatives — Selection Guidance

| Alternative | Choose when... |
|---|---|
| [ChromaDB](../projects/chromadb.md) | You need in-process simplicity, prototyping, or small datasets without a separate service |
| [Pinecone](../projects/pinecone.md) | You want fully managed serverless with zero operational overhead and are willing to pay for it |
| pgvector (PostgreSQL extension) | Your data already lives in Postgres and you want SQL joins + vector search in the same query |
| Weaviate | You need a GraphQL interface, built-in vectorization modules, or richer object schema support |
| LanceDB | You need columnar storage, multi-modal data, or in-process embedding without a separate service |
| Milvus | You need the highest write throughput at very large scale (billions of vectors) with multi-node parallelism |

Qdrant is the right choice when you need filtered HNSW performance on hundreds of millions of vectors, hybrid dense+sparse retrieval, a stable production service model, and don't want vendor lock-in.

---

## Ecosystem Integration

Qdrant appears as the default vector store backend in several adjacent systems:

- **[Mem0](../projects/mem0.md)** uses Qdrant as its default vector store (`~/.mem0/` local file storage via `qdrant-client`'s local mode)
- **Cognee** lists Qdrant as one of seven supported vector backends (`VECTOR_DB_PROVIDER=qdrant`)
- **[LangChain](../projects/langchain.md)** and **[LlamaIndex](../projects/llamaindex.md)** both ship Qdrant integrations as first-class vector store options
- **Skill Seekers** exposes an `export_to_qdrant` MCP tool for packaging documentation into Qdrant-ready format
- **[Graphiti](../projects/graphiti.md)** and **[Zep](../projects/zep.md)** support Qdrant as an alternative vector backend

This breadth of ecosystem adoption reflects Qdrant's stable API and active Python client maintenance — the `qdrant-client` library is consistently referenced as the most complete integration path.

---

## Related Concepts

- [Vector Database](../concepts/vector-database.md) — the broader category
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md) — dense + sparse search patterns Qdrant enables natively
- [Retrieval-Augmented Generation](../concepts/rag.md) — primary application pattern
- [Semantic Memory](../concepts/semantic-memory.md) — agent memory systems built on top of vector retrieval
- [BM25](../concepts/bm25.md) — sparse retrieval that Qdrant's sparse vectors approximate
