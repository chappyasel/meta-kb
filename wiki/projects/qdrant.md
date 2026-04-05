---
entity_id: qdrant
type: project
bucket: knowledge-bases
sources:
  - repos/gepa-ai-gepa.md
  - repos/nemori-ai-nemori.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
related: []
last_compiled: '2026-04-05T05:31:46.369Z'
---
# Qdrant

## What It Does

Qdrant is an open-source vector database and similarity search engine written in Rust. It stores high-dimensional vectors alongside arbitrary JSON payloads and retrieves nearest neighbors efficiently, with the key design choice being that filters on payload fields are first-class citizens of the search operation rather than a post-processing step. That distinction matters when you need "find me the 10 most similar embeddings where `user_id == 42` and `created_at > 2024-01-01`" and expect it to run at milliseconds, not seconds.

The HTTP and gRPC APIs serve both local deployments and a managed cloud offering. Libraries exist for Python, JavaScript/TypeScript, Rust, Go, Java, and C#.

## Core Mechanism

**Collections and Points:** The fundamental unit is a "point" — a vector, an ID, and an optional JSON payload. Points live in collections, each configured with a vector size and distance metric (cosine, dot, Euclidean, or Manhattan).

**HNSW index:** Qdrant uses Hierarchical Navigable Small World graphs for approximate nearest neighbor search. The graph is built incrementally as points are upserted. On-disk HNSW (`on_disk: true`) lets you trade query latency for RAM when collections exceed available memory.

**Payload indexing:** This is where Qdrant differentiates from simpler ANN libraries. You can create a `payload_index` on any JSON field, and the query planner uses these indexes to pre-filter the candidate set before vector comparison. Without payload indexing, filtered search degrades to scanning filtered results from ANN, which defeats the purpose. With it, the engine can constrain the search space before traversing the HNSW graph.

**Quantization:** Scalar quantization and product quantization (PQ) reduce memory footprint by compressing vectors from float32 down to int8 or smaller. The rescore parameter lets you run quantized search first, then re-rank top candidates with original precision.

**Named vectors:** A single point can carry multiple named vectors (e.g., `text` and `image`), each with its own index and distance metric. This enables multi-modal search without denormalizing data across collections.

**Storage engine:** Wal (Write-Ahead Log) for durability, with segments as the internal storage unit. Qdrant supports both in-memory and memmap segment types.

**Sparse vectors:** As of recent versions, Qdrant supports sparse vectors natively, enabling hybrid dense+sparse search (BM25-style keyword retrieval combined with semantic similarity) within a single query.

## Key Numbers

- ~22,000 GitHub stars (self-reported from repository badge)
- Qdrant publishes benchmark results at [qdrant.tech/benchmarks](https://qdrant.tech/benchmarks/), comparing recall vs. throughput against Weaviate, Milvus, and Elasticsearch. These are **self-reported** — Qdrant runs its own benchmark suite, so treat the comparisons with appropriate skepticism. The ANN-Benchmarks project provides independent reference points but may not reflect recent Qdrant versions or production-realistic configurations.
- The managed cloud tier starts free and scales to enterprise; pricing is consumption-based and not publicly listed at granular levels.

## Strengths

**Filtered search performance.** When payload indexes are configured correctly, Qdrant handles filtered vector queries without degrading to brute force. This matters for multi-tenant applications where every query carries a `tenant_id` filter.

**Rust implementation.** Memory safety without garbage collection pauses makes latency more predictable under load than JVM-based alternatives.

**Sparse+dense hybrid in one query.** Native sparse vector support lets you implement hybrid retrieval without routing to a separate text search system.

**Local-first development.** The Docker image spins up quickly. The Python client (`qdrant-client`) works identically against local Docker, self-hosted cluster, and managed cloud, which simplifies development-to-production parity.

**Snapshot and recovery.** Collections can be snapshotted to disk and restored, useful for backup and migration between environments.

## Critical Limitations

**Concrete failure mode — filtering without payload indexes.** If you run filtered vector search on an unindexed payload field, Qdrant falls back to scanning the full result set and applying the filter afterward. At small scale this is invisible; at 10M+ points with a highly selective filter (e.g., `status == "active"` on a 95% inactive dataset), queries return in seconds rather than milliseconds and appear to "work" during development before failing in production. There is no warning in the query response that a full scan occurred — you need to check the Qdrant logs or monitor via the telemetry endpoint.

**Unspoken infrastructure assumption — RAM sizing.** Qdrant's HNSW index loads into memory by default. For a collection of 10M vectors at 1536 dimensions (float32), the raw vector data is ~60GB before index overhead. Without explicitly configuring `on_disk: true` for vectors or using quantization, you need that RAM available on the host. Managed cloud hides this until you hit resource limits; self-hosted deployments that didn't plan for memory will OOM silently under load.

## When Not to Use It

**Full-text search is your primary retrieval path.** Qdrant is not a text search engine. If most queries are keyword lookups with occasional semantic reranking, Elasticsearch or OpenSearch with a vector plugin is a better fit. Qdrant's sparse vector support helps but it's not a replacement for mature BM25 infrastructure with analyzers, synonyms, and relevance tuning.

**You need relational joins or complex aggregations.** Qdrant has no SQL interface and no aggregation pipeline. If your retrieval logic requires joining vector results against relational data at query time, you'll coordinate this in application code, which adds latency and complexity. A vector extension on Postgres (pgvector) keeps everything in one system.

**Your team operates mostly on managed Postgres.** pgvector at moderate scale (<5M vectors, cosine similarity, no complex filters) is simpler to operate if you already run Postgres. Adding Qdrant means another stateful service, another backup strategy, and another failure domain.

**Strict data residency requirements without dedicated cloud hosting budget.** Qdrant Cloud runs on major cloud providers. Self-hosting in a specific region is possible but requires Kubernetes expertise or comfort with the Docker deployment model; the managed offering's region selection is limited compared to hyperscaler-native services.

## Unresolved Questions

**Cluster coordination at large scale.** Qdrant's distributed mode uses a custom consensus protocol. Documentation on split-brain behavior, partition tolerance tradeoffs, and recovery procedures after leader loss is sparse. Production multi-node deployments are underspecified outside of the managed cloud offering.

**Cost at scale in managed cloud.** Qdrant Cloud pricing is not publicly itemized at the granularity needed to forecast costs for 50M+ vector workloads. You need to contact sales, which makes cost modeling opaque during architecture decisions.

**Governance and fork risk.** Qdrant is developed by a venture-backed company (Qdrant GmbH). The core engine is Apache 2.0 licensed, but the project roadmap, managed cloud features, and long-term open-source commitment depend on the company's commercial viability. No clear governance model exists for what happens to the open-source project if the company changes direction.

**Embedding model coupling.** Qdrant stores vectors but is agnostic to how they were produced. If you change embedding models (e.g., upgrading from `text-embedding-ada-002` to a newer model), you must re-embed and re-index the entire collection. There is no built-in migration tooling for this.

## Alternatives

**pgvector** — Use when you already run Postgres, your vector count is under 5M, and you want one fewer service to operate. Simpler operationally, worse performance at scale.

**Weaviate** — Use when you want a built-in GraphQL API, native BM25+vector hybrid search with more mature text search features, and a larger ecosystem of "modules" for embedding generation. More complex to self-host.

**Milvus** — Use when you need proven scale beyond 100M vectors and have the Kubernetes infrastructure to support it. Operationally heavier than Qdrant; better supported in enterprise data platform contexts.

**Chroma** — Use for local development and prototyping where persistence and production reliability are not yet requirements. Not designed for production multi-node deployments.

**Pinecone** — Use when you want fully managed infrastructure with no operational overhead and can accept vendor lock-in and per-query pricing. No self-hosting option.
