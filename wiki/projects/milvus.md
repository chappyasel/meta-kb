---
entity_id: milvus
type: project
bucket: knowledge-bases
abstract: >-
  Milvus: open-source vector database for billion-scale similarity search,
  differentiated by cloud-native distributed architecture (separate
  storage/compute layers) and hardware-accelerated SIMD/GPU indexing.
sources:
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
related:
  - Qdrant
  - OpenAI
last_compiled: '2026-04-05T23:15:55.632Z'
---
# Milvus

## What It Does

Milvus is an open-source vector database purpose-built for similarity search over large embedding collections. Given a query vector (from text, images, audio, or any modality), Milvus returns the K nearest neighbors from a stored collection using approximate nearest neighbor (ANN) algorithms. It sits at the core of RAG pipelines, semantic search systems, recommendation engines, and agent memory backends.

Its architectural differentiator is a cloud-native disaggregated design: compute (query nodes, index nodes) and storage (object storage via S3/MinIO) scale independently. Most alternative vector databases tightly couple these layers.

## Architecture

### Storage-Compute Separation

Milvus divides responsibility across four node types:

- **Root Coord**: cluster metadata, collection schemas, segment allocation
- **Data Nodes**: ingestion, WAL writes, compaction
- **Index Nodes**: offline index construction (IVF, HNSW, DiskANN)
- **Query Nodes**: online search, segment loading, incremental data handling

All persistent data (raw vectors, indexes, deletion logs) lives in object storage. Query nodes stream segments from S3/MinIO on demand and cache them in local SSDs. This means adding query capacity requires no data migration — nodes pull what they need.

The message broker (Pulsar or Kafka, swappable via config) decouples writes from reads. Data nodes write to the log; query nodes consume from it for real-time segments. Sealed segments get indexed and flushed to object storage, transitioning from streaming to batch retrieval paths.

### Index Types

Milvus exposes multiple ANN index algorithms per collection:

| Index | Build Speed | Search Speed | Memory | Use Case |
|-------|-------------|--------------|--------|----------|
| HNSW | Slow | Fast | High | Low-latency in-memory |
| IVF_FLAT | Fast | Medium | High | Balanced recall/speed |
| IVF_SQ8 | Fast | Fast | Low | Memory-constrained |
| IVF_PQ | Fast | Fast | Very Low | Billion-scale compressed |
| DiskANN | Medium | Medium | Low | Larger-than-RAM datasets |
| SCANN | Medium | Fast | Medium | Google-origin, strong recall |
| GPU_IVF_FLAT | Fast | Very Fast | GPU VRAM | GPU-accelerated search |

Index construction happens asynchronously on Index Nodes — ingestion does not block. Queries against un-indexed (growing) segments fall back to brute-force scan.

### Milvus Lite

For development and small-scale use, `pip install milvus` provides Milvus Lite — a single-process embedded mode with no external dependencies. The same Python SDK works against Lite and the full distributed cluster, enabling local development without Docker.

### Key Data Structures

- **Collection**: schema-defined table of vectors + scalar fields
- **Partition**: logical subdivision within a collection for filtered search
- **Segment**: unit of storage (growing = in-memory write buffer; sealed = immutable, indexed)
- **Shard**: horizontal scaling unit; each shard maps to one WAL channel

The segment model is central to performance. Growing segments accumulate writes; at a configurable size threshold, they seal and trigger async index construction on Index Nodes.

## Key Numbers

GitHub stars: ~34,000 (as of mid-2025, self-reported on README badges — not independently verified here).

Benchmark claims from Milvus documentation and the VectorDBBench project (which Zilliz, Milvus's commercial backer, contributed to): on 100M-vector LAION datasets, Milvus with IVF_PQ achieves ~95% recall at ~5,000 QPS on standard cloud hardware. These numbers come from Zilliz-affiliated benchmarks. Independent reproducibility varies with hardware and ef_search parameters.

The ANN Benchmarks project (ann-benchmarks.com) provides independently validated comparisons. Milvus HNSW performance there is competitive with Qdrant and Weaviate, though exact rankings shift with ef_construction tuning.

## Strengths

**True billion-scale operation.** The disaggregated architecture, DiskANN support, and segment-based storage let Milvus operate on datasets that exceed available RAM — a constraint that eliminates most alternatives at this scale.

**Multi-tenancy and isolation.** Partition keys enable logical tenant separation within a single collection, reducing cluster count for SaaS deployments.

**Hybrid search.** Milvus supports combining vector similarity with scalar attribute filtering in a single query. The filtering uses Knowhere (Milvus's internal vector engine) to prune candidate sets before ANN search rather than post-filtering, preserving recall.

**Hardware acceleration.** SIMD (AVX2, AVX-512) on CPU and native GPU index support (GPU_IVF_FLAT, GPU_CAGRA) via CUDA give Milvus throughput headroom that pure-CPU databases lack.

## Critical Limitations

**Failure mode — compaction storms.** At high ingest rates, Milvus triggers background compaction to merge small segments and reduce query fan-out. Under sustained write load, compaction jobs can consume Index Node resources and cause query latency spikes of 3-10x baseline. The `dataCoord.compaction.levelzero.forceTrigger.minSize` and related parameters control this, but the defaults are not tuned for write-heavy workloads. Teams discovering this in production typically find it only after load testing.

**Unspoken infrastructure assumption.** The distributed mode requires a functioning message broker (Pulsar or Kafka) and object storage. Pulsar in particular is a heavy dependency — it runs its own ZooKeeper ensemble and BookKeeper cluster. A "simple" Milvus deployment pulls in ~15 containers before the database itself runs. Teams expecting a single-binary deployment encounter this only after reading past the Docker Compose quickstart.

## When NOT to Use Milvus

**Small collections (under ~1M vectors).** The operational overhead of the distributed system — Pulsar, etcd, MinIO, multiple node types — is not justified. Qdrant running in single-node mode, Chroma, or LanceDB handle this range with far less infrastructure.

**Single-developer or prototyping contexts.** Even Milvus Lite requires understanding collection schemas, index creation as a separate step, and the segment lifecycle. Chroma's zero-config in-memory mode or pgvector as a Postgres extension have lower time-to-first-query.

**Strict serverless cost models.** Milvus always-on node processes incur baseline costs even at zero query load. Pinecone's serverless or Turbopuffer's object-storage-native model better fit pay-per-query budgets.

**Teams without Kubernetes expertise.** The Helm chart is the recommended production deployment path. Without K8s operational experience, upgrades, node failures, and disk pressure events are difficult to manage.

## Unresolved Questions

**Governance and Zilliz influence.** Milvus is a CNCF (Cloud Native Computing Foundation) incubating project, but Zilliz employs the majority of core contributors and makes most architectural decisions. The line between Milvus (open-source) and Zilliz Cloud (commercial) feature roadmaps is not publicly documented. Features sometimes appear in Zilliz Cloud before reaching upstream.

**Cost at scale for self-hosted.** Milvus's documentation covers deployment but not total cost of ownership. At 1B vectors with DiskANN, the SSD and object storage costs, plus Pulsar's BookKeeper disk usage, can significantly exceed the compute cost. No published guidance exists on storage cost modeling.

**Consistency guarantees under partition.** The documentation describes eventual consistency for the streaming-to-sealed segment transition but does not specify behavior during network partitions between message broker and query nodes — specifically whether queries can return stale or missing vectors during broker unavailability.

**Deletion latency.** Vector deletion in Milvus is implemented as bitset masking (soft delete) rather than immediate removal. Deleted vectors consume storage and can appear in intermediate ANN candidate sets until compaction runs. The time-to-physical-deletion is non-deterministic and depends on compaction scheduling.

## Alternatives and Selection Guidance

| Use Case | Recommendation |
|----------|---------------|
| Under 5M vectors, single service | [Qdrant](../projects/qdrant.md) single-node — simpler ops, strong Rust performance |
| Postgres-first stack | pgvector or pgvectorscale — keeps vector search in existing DB |
| Serverless / per-query pricing | Pinecone serverless or Turbopuffer |
| Agent memory with graph traversal | [Cognee](../projects/cognee.md) or Weaviate (built-in graph support) |
| Billion-scale with GPU budget | Milvus with GPU_CAGRA index or Weaviate with NVIDIA module |
| Memory-constrained edge | LanceDB (columnar format, sub-100MB binary) |
| RAG with metadata-heavy filtering | Qdrant (payload indexing more mature than Milvus partition keys for small-medium scale) |

Use Milvus when: dataset exceeds 100M vectors, you need DiskANN for larger-than-RAM indexes, GPU acceleration is available, or independent scaling of query and index capacity justifies the operational complexity.

## Integration Surface

Milvus appears as a supported vector backend across the major RAG and memory frameworks. In the Cognee ECL pipeline, it is one of eight vector store options (`VECTOR_DB_PROVIDER=milvus`). In Mem0, it is one of 23 vector store backends via the `VectorStoreFactory`. In LangChain and LlamaIndex, first-party integrations exist as `langchain-milvus` and `llama-index-vector-stores-milvus` packages.

The Python SDK (`pymilvus`) follows a resource-oriented pattern: create Collection → insert vectors → create index (async) → load collection into query node memory → search. The explicit load step surprises developers coming from Qdrant or Chroma, where data is queryable immediately after insert.

gRPC is the wire protocol for all node-to-node and SDK-to-proxy communication. The RESTful HTTP API is a translation layer on top and has lower throughput for batch operations.


## Related

- [Qdrant](../projects/qdrant.md) — alternative_to (0.8)
- [OpenAI](../projects/openai.md) — part_of (0.3)
