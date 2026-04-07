---
entity_id: qdrant
type: project
bucket: knowledge-bases
abstract: >-
  Qdrant is a Rust-built vector database offering filtered ANN search with
  payload-based conditions, targeting production RAG and AI systems where hybrid
  search and deployment flexibility matter.
sources:
  - repos/nemori-ai-nemori.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/topoteretes-cognee.md
related:
  - postgresql
  - openai
last_compiled: '2026-04-07T11:48:07.429Z'
---
# Qdrant

**Type:** Project — Knowledge Base Infrastructure
**Category:** Vector Database
**Repository:** [qdrant/qdrant](https://github.com/qdrant/qdrant)
**License:** Apache 2.0
**Stars:** ~22,000 (GitHub, as of mid-2025)

## What It Does

Qdrant stores high-dimensional vectors alongside arbitrary JSON payloads and serves approximate nearest-neighbor (ANN) queries against both simultaneously. The defining capability is **filtered search**: a query can restrict results to vectors whose payload fields satisfy conditions (range, match, geo-radius, null check) without post-filtering — the filter gets applied inside the HNSW traversal, so result counts are guaranteed.

Built in Rust, Qdrant ships as a single binary or Docker image. It runs embedded (in-process via the Python `qdrant-client` local mode), as a self-hosted server, or as a managed cloud service. This deployment spectrum is the most complete of the major vector databases — [FAISS](../projects/faiss.md) is library-only, [Pinecone](../projects/pinecone.md) is cloud-only, and [ChromaDB](../projects/chromadb.md) targets local/dev more than production scale.

## Core Mechanism

### Data Model

The top-level unit is a **collection** — a named set of points sharing a vector configuration. Each **point** contains:

- `id`: UUID or unsigned integer
- `vector`: one or more named dense vectors, sparse vectors, or multi-vectors
- `payload`: arbitrary JSON document, indexable

Collections support multiple named vectors per point (e.g., `title_embedding` and `body_embedding` on the same document), enabling separate embedding spaces queried independently or together.

### Indexing

Qdrant uses **HNSW** (Hierarchical Navigable Small World graphs) as its primary ANN structure, with two complementary indexes:

- **Vector index**: HNSW built incrementally as points are inserted. Key parameters: `m` (number of edges per node, default 16) and `ef_construct` (search width during construction, default 100). Higher values increase recall at the cost of memory and build time.
- **Payload index**: Per-field indexes (keyword, integer, float, geo, datetime, text with BM25) created explicitly via `create_payload_index`. Without these, payload filtering works via brute-force scan of HNSW candidates.

The HNSW-with-filter combination is Qdrant's core technical contribution versus libraries like FAISS. FAISS performs ANN then post-filters, meaning a query for "top 10 results where category=X" may require fetching thousands of candidates to find 10 that pass the filter. Qdrant's filtered HNSW integrates payload conditions into graph traversal, providing accurate top-k with guaranteed count.

### Storage

Qdrant separates vector storage from payload storage:

- Vectors: stored in memory-mapped files (`*.bin`) or in RAM, configurable per collection
- Payloads: stored in RocksDB or in-memory
- **On-disk storage**: collections can be configured with `on_disk: true` for vectors, reducing RAM requirements at the cost of latency

Vectors support quantization (scalar, binary, product) to reduce memory footprint. Scalar quantization to int8 cuts memory 4x with ~1% recall loss in typical benchmarks.

### Hybrid Search

Qdrant supports [hybrid search](../concepts/hybrid-search.md) combining dense and sparse vectors. Sparse vectors (compatible with BM25-style representations like SPLADE) live alongside dense vectors in the same collection. [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md) or weighted sum merges the result sets. This is the primary mechanism for combining semantic similarity with keyword matching in [RAG](../concepts/rag.md) pipelines.

### Distributed Mode

For scale, Qdrant runs as a cluster. Collections are sharded across nodes; each shard can have replicas. Writes go to a leader shard; reads can fan out to replicas. The distributed mode requires explicit setup — it is not automatic with Docker Compose.

### Versioning and Snapshots

Collections support snapshots (point-in-time exports to `.snapshot` files) for backup and migration. The REST and gRPC APIs expose full CRUD plus bulk operations (`upsert`, `delete`, `update_vectors`).

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub stars | ~22,000 | GitHub (independently verifiable) |
| Default HNSW `m` | 16 | Source code / docs |
| Default `ef_construct` | 100 | Source code / docs |
| Scalar quantization memory reduction | ~4x | Self-reported, plausible from int8 math |
| Cloud regions | 3 (AWS, GCP, Azure) | Qdrant docs |

Qdrant publishes ANN benchmarks at [ann-benchmarks.com](https://ann-benchmarks.com) entries and their own benchmark site. These are self-reported or run by the Qdrant team on their infrastructure. Independent reproduction by third parties (e.g., Zilliz's benchmark comparisons) shows Qdrant competitive with Weaviate and Milvus on filtered search, typically 10-30ms P95 at 1M vectors with in-memory storage. Treat any specific number as directional, not a guarantee for your hardware and access pattern.

## Strengths

**Filtered ANN is genuinely better.** For [RAG](../concepts/rag.md) use cases that filter by metadata — user ID, document date, category, tenant — Qdrant's integrated filtering avoids the candidate-bloat problem. This is measurable: at 90% selectivity (10% of points match a filter), post-filter ANN requires ~10x more candidates to return k valid results. Qdrant's approach does not.

**Deployment flexibility.** The same API works for an embedded Python process (local development, testing), a single Docker container (small production), and a multi-node cluster (high-volume). This means development code runs in production without adapter changes. Most alternatives force a choice between local library and cloud service.

**Rust performance characteristics.** Memory usage is predictable; there are no JVM pauses or Python GIL constraints in the hot path. Cold-start times are fast.

**Named vector support.** Multi-vector per point, with separate index parameters per vector, handles architectures like ColBERT-style late interaction or separate title/body embedding without duplicating points.

**Client ecosystem.** Official clients for Python, JavaScript/TypeScript, Rust, Go, and .NET. The Python client supports both HTTP and gRPC transports.

## Critical Limitations

**Concrete failure mode — large payload writes under load.** Qdrant batches payload updates through RocksDB. Under high concurrent write rates with large payloads (>10KB JSON per point), write amplification can cause P99 write latency spikes that do not appear in benchmarks run at lower concurrency. This is a known RocksDB compaction behavior, not Qdrant-specific, but Qdrant's architecture does not expose tuning knobs for RocksDB compaction at the collection level — you get the defaults. Workloads that update payloads frequently (e.g., updating user session state on every interaction) should benchmark this specific pattern before committing to Qdrant.

**Unspoken infrastructure assumption — RAM for in-memory collections.** Qdrant's default collection configuration stores vectors in memory-mapped files, but production recommendations and benchmark configurations often use `on_disk: false` (full in-memory) for best latency. At 1536 dimensions (OpenAI `text-embedding-3-small`) and float32, 1 million vectors require ~6GB RAM for vectors alone, before payload, HNSW graph, or OS overhead. Many teams undersize initial deployments because they test with smaller vector counts or use disk storage, then hit latency cliffs at scale. The documentation mentions on-disk storage but does not prominently surface the RAM math.

## When NOT to Use It

**Heavy relational queries with vector as secondary.** If your application primarily queries by structured attributes (user ID, date range, category) and uses vector similarity as a tiebreaker or optional enhancement, a database with pgvector ([PostgreSQL](../projects/postgresql.md)) gives you SQL joins, transactions, and full ACID semantics with acceptable vector search performance. Qdrant forces you to maintain payload synchronization with a source-of-truth database, adding a consistency surface.

**Sub-10ms SLA at 10M+ vectors without hardware budget.** At very large scale with strict latency requirements, Qdrant's single-process architecture hits limits that dedicated systems like Milvus (which separates storage, indexing, and query into independent scalable components) handle more gracefully. If you need horizontal read scaling without resharding, Milvus or Pinecone's architecture fits better.

**Transactional workloads.** Qdrant has no multi-point transactions. Writes are eventually consistent in distributed mode. Applications that need "upsert vectors and update relational record atomically" will implement compensating logic or accept failure windows.

**Prototype with budget constraints on API keys.** The embedded local mode is convenient for development, but the Qdrant Cloud free tier (1 cluster, limited storage) is less generous than Pinecone's free tier for early validation. For budget-constrained prototyping, [ChromaDB](../projects/chromadb.md) or an in-memory FAISS index is simpler.

## Unresolved Questions

**Collection-level access control.** Qdrant supports API keys at the instance level and read-only keys, but not per-collection authorization. Multi-tenant deployments must either run separate Qdrant instances per tenant (expensive) or implement tenant isolation via payload filters (requires trusting the application layer to always apply the filter). The roadmap has mentioned collection-level permissions but this was not shipped as of mid-2025.

**Cost at scale on managed cloud.** Qdrant Cloud pricing is compute-plus-storage, but the cost model for a 50M-vector corpus with 10K QPS is not transparently documented without contacting sales. The free tier and small-cluster pricing are public; enterprise pricing is not. Teams scaling past ~5M vectors should request quotes before architectural commitment.

**Conflict resolution in distributed writes.** The documentation describes shard leadership and replication but does not specify behavior when a network partition occurs mid-write. Is the write acknowledged as failed, retried, or silently dropped? The `consistency` parameter on search (`all`, `majority`, `quorum`, `factor`) is documented, but write consistency guarantees during partition are not explicitly specified.

**Long-term compatibility of snapshot format.** Qdrant snapshots are the primary migration and backup mechanism. Whether snapshot files from version N can be restored into version N+2 is not documented with a clear policy. Given Qdrant's rapid version cadence (multiple minor releases per month), teams relying on snapshots for disaster recovery should test restoration across version upgrades.

## Alternatives and Selection Guidance

| Alternative | Use when |
|-------------|----------|
| [PostgreSQL](../projects/postgresql.md) + pgvector | You need SQL joins, existing PG infrastructure, or <5M vectors with moderate QPS |
| [ChromaDB](../projects/chromadb.md) | Local development, prototyping, or embedded use in a Python process without production SLA |
| [FAISS](../projects/faiss.md) | Maximum raw ANN throughput, no metadata filtering, research or batch processing contexts |
| [Pinecone](../projects/pinecone.md) | Fully managed, no ops burden, willing to pay for scale, no self-hosting requirement |
| Weaviate | GraphQL query interface matters, or you want built-in object-level authorization |
| Milvus | 100M+ vectors, horizontal read scaling, dedicated indexing/query separation needed |

Qdrant is the right choice when: you need filtered ANN with guaranteed result counts, you want deployment flexibility from laptop to cluster, your team can manage a Rust service, and you are building a [RAG](../concepts/rag.md) or [semantic memory](../concepts/semantic-memory.md) system where metadata filtering is a first-class query requirement rather than an afterthought.

## Ecosystem Position

Qdrant functions as the default vector backend in several adjacent projects. [Mem0](../projects/mem0.md) defaults to Qdrant with local file storage (`~/.mem0/`). The Skill Seekers MCP server exposes an `export_to_qdrant` tool. [LangChain](../projects/langchain.md) and [LlamaIndex](../projects/llamaindex.md) both maintain Qdrant integrations in their vector store modules. In [agentic RAG](../concepts/agentic-rag.md) architectures, Qdrant's named-vector support maps cleanly to multi-hop retrieval where different embedding models index different content types.

The [vector database](../concepts/vector-database.md) space treats Qdrant as the open-source reference implementation for filtered ANN search, in the same way FAISS is the reference for raw similarity search without filters.


## Related

- [PostgreSQL](../projects/postgresql.md) — alternative_to (0.5)
- [OpenAI](../projects/openai.md) — part_of (0.4)
