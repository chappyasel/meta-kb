---
entity_id: qdrant
type: project
bucket: knowledge-substrate
abstract: >-
  Qdrant is a Rust-built open-source vector database optimized for
  high-throughput similarity search, distinguished from alternatives by its
  HNSW-based quantization, named vector support, and production-grade filtering
  that doesn't sacrifice recall.
sources:
  - deep/repos/mem0ai-mem0.md
  - repos/nemori-ai-nemori.md
  - repos/yusufkaraaslan-skill-seekers.md
related:
  - openai
  - vector-database
last_compiled: '2026-04-08T23:26:53.027Z'
---
# Qdrant

## What It Is

Qdrant is an open-source vector similarity search engine written in Rust, designed as dedicated infrastructure for production RAG pipelines, [Agent Memory](../concepts/agent-memory.md) systems, and [Semantic Search](../concepts/semantic-search.md) at scale. Where general-purpose databases bolt vector search onto existing architecture, Qdrant builds around it: every design decision treats vector operations as the primary workload, not an extension.

It serves as the default vector backend for [Mem0](../projects/mem0.md) (which uses Qdrant with local file storage at `~/.mem0/` out of the box) and ships as a pre-configured component in Nemori's dual-backend architecture alongside PostgreSQL. [LangChain](../projects/langchain.md), [LlamaIndex](../projects/llamaindex.md), and [AutoGen](../projects/autogen.md) all provide native Qdrant integrations.

GitHub stars: ~23k (as of mid-2025). Actively maintained with frequent releases.

## Core Mechanism

### Storage and Indexing

Qdrant organizes vectors into **collections**, each with configurable distance metrics (Cosine, Euclidean, Dot Product, Manhattan). Collections contain **points**: a vector (or multiple named vectors), a numeric or UUID ID, and an optional JSON payload.

The index is **HNSW** (Hierarchical Navigable Small World), a graph-based ANN algorithm that trades exact recall for sub-linear query time. Key HNSW parameters exposed per-collection:

- `m`: number of bi-directional links per element (default 16). Higher values improve recall but increase memory and build time.
- `ef_construct`: size of the dynamic candidate list during index construction (default 100). Larger values improve quality at the cost of slower ingestion.
- `ef`: search-time candidate list size. Tunable per-query via `search_params`.

The critical architectural choice: Qdrant applies **payload filters during HNSW graph traversal**, not as a post-processing step. This matters because naive post-filtering on ANN results can silently miss relevant vectors that were never retrieved. Qdrant's pre-filtering keeps recall stable even with selective filters, though it requires proper payload indexing (`create_field_index`) to perform well. Without an index on the filtered field, Qdrant falls back to full-scan behavior.

### Quantization

Qdrant supports three quantization schemes for memory reduction:

- **Scalar quantization**: compresses float32 to int8, ~4x memory reduction
- **Product quantization (PQ)**: compresses vectors into encoded segments, higher compression ratios at some recall cost
- **Binary quantization**: compresses to single bits, extreme compression for compatible embedding models (works well with OpenAI `text-embedding-3-large` and similar models trained for it)

Quantization is configured per-collection and can be combined with `oversampling` and `rescore` parameters that retrieve more candidates than needed then re-rank with original vectors, recovering much of the recall loss.

### Named Vectors and Sparse Vectors

A single point can carry multiple named vector fields with different dimensions and distance metrics. This enables storing dense embeddings alongside sparse vectors (BM25-style) in the same record, which is the foundation for [Hybrid Search](../concepts/hybrid-search.md) without a separate BM25 index. Sparse vectors use an inverted index representation. Query-time fusion combines dense and sparse scores via reciprocal rank fusion or custom weights.

### Payload and Filtering

Payloads are arbitrary JSON. Qdrant supports nested structures and typed field indexes (keyword, integer, float, geo, datetime, text with full-text indexing). The filtering DSL is rich: `must`, `should`, `must_not`, `min_should`, nested conditions, geo radius/bounding box, value ranges, is_empty/is_null checks, has_id.

This filtering capability is what makes Qdrant practical for multi-tenant agent memory. Mem0's scoping by `user_id`, `agent_id`, `session_id` runs entirely through payload filters, not separate collections.

### Collections API

Core operations:
- `upsert`: insert or overwrite points by ID
- `search`: ANN query with optional filter, returns scored results
- `recommend`: find similar points to a set of positive/negative examples, without requiring a query vector
- `scroll`: paginate through all points matching a filter
- `delete`: remove points by ID or filter
- `update_vectors`: partially update named vectors on existing points

Batch operations accept up to 1000 points per request. The REST API and gRPC interface expose identical capabilities; gRPC is preferred for throughput-sensitive workloads.

## Deployment Modes

**In-memory (ephemeral)**: no persistence, fastest, for testing.

**Local file storage**: Qdrant persists to disk using its own binary format (`storage/`). The `~/.mem0/` default in Mem0 uses this mode. Suitable for single-process workloads and development.

**Standalone server**: Docker image (`qdrant/qdrant`), runs on port 6333 (REST) and 6334 (gRPC). Configures via `config.yaml` or environment variables. Nemori's `docker-compose.yml` uses this.

**Distributed (Qdrant Cloud or self-hosted cluster)**: Collections shard across nodes. Each shard can have multiple replicas. Write consistency and read preference are configurable per-request. The open-source distributed mode requires manual cluster management; Qdrant Cloud handles orchestration.

## Key Numbers

Qdrant's published benchmarks (self-reported, available at qdrant.tech/benchmarks) compare against Weaviate, Milvus, Elasticsearch, and [Pinecone](../projects/pinatone.md) across datasets ranging from 100k to 100M vectors. Qdrant consistently shows high RPS at >95% recall thresholds, with the Rust implementation giving it an advantage in latency variance.

The benchmarks are reproducible via the open-source [vector-db-benchmark](https://github.com/qdrant/vector-db-benchmark) repo, so they are more credible than typical vendor-published numbers. However, the benchmark configurations favor Qdrant's strengths (filtered search, high recall), and real-world performance depends heavily on quantization settings, shard count, and hardware.

Memory formula for a rough estimate: `num_vectors × vector_dimensions × 4 bytes` for raw float32 storage, divided by 3-4x with scalar quantization.

## Strengths

**Filtered search recall**: The graph traversal with inline filtering is Qdrant's most defensible technical differentiator. Systems that post-filter ANN results silently degrade precision when filters are selective. Qdrant's approach maintains recall, which matters for agent memory where queries like "find memories for user X about topic Y" apply tight filters.

**Rust performance characteristics**: Low memory overhead per connection, predictable latency, no garbage collection pauses. This matters for real-time agent inference loops where latency spikes are costly.

**Named multi-vector support**: Storing dense + sparse vectors per document in one record simplifies hybrid search pipelines considerably. No need to maintain parallel indexes and join results.

**Snapshot and recovery**: Qdrant supports collection-level snapshots via REST (`POST /collections/{name}/snapshots`), enabling straightforward backup and migration without external tooling.

**Payload schema flexibility**: No schema migration required when adding new metadata fields to points. Agent systems that evolve their memory schemas over time can add new payload fields to new points without touching existing data.

## Critical Limitations

**Concrete failure mode — filter without payload index**: If you filter on a high-cardinality payload field (like `user_id` in a multi-tenant system) without first calling `create_field_index`, Qdrant scans the entire collection for every filtered query. A Mem0 deployment with 10M memories across 100k users, running searches without a `user_id` keyword index, will exhibit linear scan behavior that degrades badly under load. The documentation mentions payload indexing but does not make the performance cliff obvious enough. The fix is one API call, but the symptom (slow queries) doesn't immediately suggest the cause.

**Unspoken infrastructure assumption**: Qdrant's distributed mode assumes homogeneous hardware and persistent network connectivity between nodes. Cloud environments with variable instance types or spot instances cause shard rebalancing and replication lag that can produce inconsistent search results during rebalancing windows. The documentation covers distributed configuration but doesn't address the operational complexity of running clusters on preemptible instances, which is how many cost-conscious teams deploy.

## When NOT to Use It

**If you already have PostgreSQL with pgvector**: For workloads under ~10M vectors with moderate QPS, pgvector with an HNSW index delivers acceptable performance while eliminating a separate service to operate. The operational overhead of Qdrant is not justified unless you need quantization, named vectors, or Qdrant-specific filtering semantics.

**If your primary query pattern is exact match, not similarity**: Qdrant is ANN infrastructure. If most queries filter to a small candidate set by payload and only need similarity within that set, a database with a vector extension handles this better with lower operational cost.

**If you need full ACID transactions**: Qdrant provides eventual consistency in distributed mode and does not support multi-point atomic transactions. Financial or compliance workloads requiring strict transactional guarantees belong in a proper relational or document database.

**If your team can't run an additional service**: For single-developer projects or early-stage agents, [ChromaDB](../projects/chromadb.md) runs in-process with no network hop. The default Mem0 setup uses Qdrant precisely because it can run as a local file store, but teams that don't want to manage Docker at all should use Chroma or FAISS.

## Unresolved Questions

**Conflict resolution in distributed writes**: The documentation describes write consistency levels (`all`, `majority`, `quorum`, `one`) but doesn't specify what happens to a point that gets partially written when a node fails mid-upsert with `consistency=all`. Whether the write is rolled back, left partial, or requires manual reconciliation isn't spelled out in operational documentation.

**Cost at scale on Qdrant Cloud**: Pricing is usage-based (RAM + disk + compute), but the formula for estimating costs of a 100M-vector deployment with quantization across multiple collections is not straightforward. The billing model rewards memory optimization (quantization), but the break-even point against self-hosting isn't published.

**Long-term HNSW degradation**: HNSW graphs degrade in recall quality as data is deleted and re-inserted at high rates, because deleted points leave "holes" in the graph. Qdrant handles this via periodic **optimizer** runs (configurable `optimizers_config`) that rebuild segments, but the documentation doesn't specify at what deletion rate recall noticeably degrades before the optimizer runs, or how to tune optimizer frequency for high-churn agent memory workloads.

**Tenant isolation in shared collections**: Qdrant has no built-in access control below the collection level. A multi-tenant application must enforce `user_id` filters in application code. There is no server-side guarantee that a misconfigured query won't return another tenant's data.

## Alternatives

**[ChromaDB](../projects/chromadb.md)**: Use when you want zero-dependency embedded operation for development or low-scale production. Simpler API, slower at scale, no quantization. Correct choice for single-developer agents or prototypes.

**[FAISS](../projects/faiss.md)**: Use when you need maximum raw throughput on a single machine with GPU support, are building batch retrieval rather than a live service, and don't need filtering or persistence. FAISS is a library, not a server; you manage all persistence and metadata yourself.

**[Pinecone](../projects/pinatone.md)**: Use when you want fully managed infrastructure with no operational burden and are willing to pay the cost premium. Pinecone's serverless tier is simpler to start with, but Qdrant's self-hosted option is substantially cheaper at volume.

**pgvector (PostgreSQL extension)**: Use when you're already running [PostgreSQL](../projects/postgresql.md) and your vector workload doesn't justify a separate service. Under 5M vectors with moderate concurrency, pgvector with HNSW is adequate and eliminates operational complexity.

**Weaviate**: Use when you need a knowledge graph layer integrated with vector search, or GraphQL-based querying. More opinionated about schema than Qdrant, but richer semantic data modeling.

**[Milvus](../concepts/vector-database.md)**: Use when you need distributed vector search at Alibaba/hyperscaler scale with GPU-accelerated indexing. More complex to operate than Qdrant, higher throughput ceiling.

## Related Concepts

- [Vector Database](../concepts/vector-database.md)
- [Hybrid Search](../concepts/hybrid-search.md)
- [Semantic Search](../concepts/semantic-search.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Semantic Memory](../concepts/semantic-memory.md)
- [BM25](../concepts/bm25.md)

## Related Projects

- [Mem0](../projects/mem0.md) — uses Qdrant as default vector backend
- [LangChain](../projects/langchain.md) — native Qdrant integration via `langchain-qdrant`
- [LlamaIndex](../projects/llamaindex.md) — `QdrantVectorStore` integration
- [ChromaDB](../projects/chromadb.md) — simpler alternative for development
- [Pinecone](../projects/pinatone.md) — managed alternative
- [Graphiti](../projects/graphiti.md) — uses Qdrant for node embedding storage in temporal knowledge graphs
- [HippoRAG](../projects/hipporag.md) — graph-based RAG that can use Qdrant for retrieval
