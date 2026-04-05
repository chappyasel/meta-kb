---
entity_id: weaviate
type: project
bucket: knowledge-bases
sources:
  - repos/gepa-ai-gepa.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
related: []
last_compiled: '2026-04-05T05:32:51.656Z'
---
# Weaviate

## What It Is

Weaviate is an open-source vector database built to run machine learning models alongside data storage. Where most vector databases treat embedding generation as an external concern, Weaviate integrates ML inference directly into the database layer. You configure vectorizers, rerankers, and generative modules as part of the schema, and Weaviate calls them automatically during indexing and retrieval. The practical effect: your application sends raw text or images, and the database handles the rest.

The project targets three primary workloads: semantic search (finding conceptually similar content without keyword matching), retrieval-augmented generation (providing grounded context to LLMs), and graph-style queries that combine vector similarity with object relationships. Weaviate is available as a managed cloud service (Weaviate Cloud), a Docker-composed self-hosted deployment, and an embedded mode for development.

## Core Architecture

Weaviate organizes data into **Collections** (formerly Classes) — strongly typed schemas that declare the object properties, the vectorizer to use, and any generative or reranking modules. Each Collection maintains its own HNSW index by default. The schema is enforced at write time; auto-schema can infer types from incoming data during development.

**Indexing layer.** Weaviate uses HNSW (Hierarchical Navigable Small World graphs) as its primary ANN algorithm, with a flat bruteforce option for small collections and a dynamic index that switches between flat and HNSW based on collection size. HNSW parameters (`ef`, `efConstruction`, `maxConnections`) are configurable per collection. A separate inverted index handles BM25 keyword search. Objects are persisted in LSM (Log-Structured Merge) trees on disk.

**Module system.** The module architecture is the architectural differentiator. Modules run as separate inference containers alongside the core database and communicate via internal HTTP. Built-in modules include:

- Vectorizers: `text2vec-openai`, `text2vec-cohere`, `text2vec-transformers` (self-hosted HuggingFace models), `multi2vec-clip` (text and images), `text2vec-ollama`, and others.
- Generative modules: `generative-openai`, `generative-anthropic`, `generative-cohere` for RAG queries.
- Reranker modules: `reranker-cohere`, `reranker-transformers` for post-retrieval ranking.

When you execute a `nearText` query, Weaviate calls the configured vectorizer module to embed the query string, then runs ANN search. The database and the inference model stay synchronized — vectors in the index are always produced by the same model as query vectors.

**Query modes.** Weaviate supports four retrieval strategies that can be combined:

1. `nearVector` / `nearText` / `nearImage` — vector similarity search
2. `bm25` — keyword search using BM25F
3. `hybrid` — weighted combination of vector and BM25 scores (configurable alpha parameter)
4. `nearObject` — use an existing stored object as the query vector

**Multi-tenancy.** Each tenant gets its own isolated vector index and storage shard within a collection. Tenants can be activated or deactivated individually, which allows inactive tenant data to be offloaded to cold storage and reactivated on demand. This is the primary mechanism for large-scale SaaS applications where thousands of tenants share the same Weaviate deployment without data bleed.

**Cross-references.** Collections can declare typed references to objects in other collections, similar to foreign keys. Queries can traverse these references in a single request, enabling graph-style retrieval. This is distinct from explicit knowledge graph storage — it is relational linking between vector-indexed objects.

**Replication.** Weaviate supports multi-node replication with configurable replication factors and consistency levels (`ONE`, `QUORUM`, `ALL`) per operation. Leader-based replication with async propagation; not strongly consistent by default.

## Key Numbers

GitHub stars are not published in the provided sources. The managed service (Weaviate Cloud) and self-hosted deployment are both in production use — Cognee lists Weaviate as one of its supported vector backends alongside Qdrant, ChromaDB, Milvus, Redis, and others, and GEPA's Generic RAG Adapter explicitly supports Weaviate. Cognee's production benchmark (1 GB in 40 minutes using 100+ containers) suggests Weaviate and peer databases can handle data engineering workloads at that scale, but no Weaviate-specific throughput benchmarks appear in the source material. Performance claims in Weaviate's own materials are self-reported; independent head-to-head benchmarks against Qdrant and Pinecone appear in third-party engineering blogs but are not included in the provided sources.

## Strengths

**Integrated vectorization.** The module system eliminates a class of operational bugs where query embeddings and stored embeddings come from different model versions. If you upgrade your vectorizer module, you re-index; the consistency guarantee is structural, not procedural.

**Hybrid search with single API call.** Combining BM25 and ANN in one query without external orchestration is a practical advantage for production search applications. The alpha parameter is tunable without schema changes.

**Multi-tenancy design.** Tenant-level index isolation with activation/deactivation is well-suited for SaaS products that need data isolation at scale without deploying separate database instances per customer. Cold storage offloading for inactive tenants is uncommon in the vector database category.

**Schema flexibility.** You can mix property types — text, numbers, booleans, dates, geo-coordinates, cross-references — within a single object, and all properties participate in filtering. Filters apply before or after ANN search and leverage the inverted index, not post-processing in memory.

**Multiple query paths.** `nearVector`, `nearText`, `nearObject`, and `hybrid` cover most retrieval patterns without requiring external query logic.

## Critical Limitations

**Concrete failure mode — module availability dependency.** If a vectorizer module container crashes or becomes unreachable, write operations that require embedding (any insert without a pre-computed vector) fail at the database layer. Unlike pure vector databases where embedding is external and the database only stores vectors, Weaviate's integrated model creates a coupling: database availability for writes depends on inference service availability. In a self-hosted deployment under load, the `text2vec-transformers` container is a single point of failure unless separately scaled and health-checked. Production deployments require treating the inference modules as first-class services with their own resource limits, health probes, and scaling policies — not as sidecars.

**Unspoken infrastructure assumption.** The HNSW index lives in memory during operation. Weaviate's documentation recommends allocating memory proportional to the number of vectors times the number of dimensions times 4 bytes (for float32), plus HNSW overhead which depends on `maxConnections`. For a collection with 10 million 1536-dimensional vectors (OpenAI ada-002 dimensions), the raw vector data alone is approximately 58 GB before HNSW graph overhead. Many teams deploy Weaviate on instances sized for storage without accounting for this, then encounter OOM kills during index rebuilds or when activating cold-stored multi-tenancy shards. The documentation covers this, but the default configuration does not enforce memory limits that would surface the constraint early.

## When Not to Use It

**You control embedding quality and model iteration.** If your team treats the embedding model as a first-class ML artifact — experimenting with fine-tuned models, comparing embedding architectures, or using embeddings produced by a bespoke training pipeline — Weaviate's integrated module system becomes friction rather than convenience. You will spend time working around the module interface to inject pre-computed vectors, and the schema-level module configuration will not reflect your actual model governance. Use Qdrant or a database that treats vector ingestion as the primary interface.

**You need strong consistency.** Weaviate's default replication is async with eventual consistency. If your application requires read-your-own-writes guarantees across nodes (medical records, financial data, audit logs), the consistency model requires `ALL` quorum reads and writes, which degrades throughput significantly. A relational database with a pgvector extension provides stronger consistency semantics with acceptable vector search performance at moderate scale.

**You are running at very large scale without Weaviate Cloud.** Self-hosted Weaviate cluster operations — rolling upgrades, resharding, cross-region replication — are not well-documented for large multi-node topologies. If you are operating hundreds of nodes, the operational surface of a database with both vector indices and inference modules is substantial. Managed services (Weaviate Cloud, or competitors like Pinecone and Zilliz Cloud) offload this.

**Your workload is pure keyword search with occasional semantic augmentation.** The complexity of deploying Weaviate is not justified if BM25 retrieval handles 95% of queries and vector search is an edge case. Elasticsearch with a vector search plugin is operationally simpler for this pattern.

## Unresolved Questions

**Governance and fork risk.** Weaviate (the company) controls the schema definition and module interface. If the company changes licensing (as has happened with MongoDB, Elasticsearch, and Redis), self-hosted users face a hard migration or a locked-in version. The project is Apache 2.0 licensed as of the available sources, but the managed cloud service and enterprise features represent a business model that creates future licensing pressure.

**Module API stability.** The module interface between the core database and inference containers is internal. Third-party or custom modules must implement Weaviate's specific HTTP API contract. When Weaviate releases breaking changes to the module protocol, all custom modules break. The version coupling between core releases and module releases is not visibly governed by a stability guarantee.

**Cost at scale on Weaviate Cloud.** Weaviate Cloud pricing for multi-tenant deployments with hot/warm/cold tier management is not publicly documented at the tier-boundary detail needed to estimate costs for applications with millions of tenants and variable activation patterns.

**Conflict resolution in cross-reference traversal.** When a query traverses cross-references across collections with different vectorizers, it is not documented how Weaviate handles cases where the same object might be reached through multiple reference paths with conflicting relevance signals.

## Alternatives

**Use Qdrant** when your embedding pipeline is external and you want the highest query-per-second performance with fine-grained filtering. Qdrant's Rust implementation is faster under load than Weaviate's Go implementation for pure vector workloads, and its payload filtering is more expressive.

**Use pgvector** when you are already on PostgreSQL and your vector collection fits in a few hundred million rows. The operational simplicity of one database system outweighs Weaviate's feature set for moderate workloads.

**Use Pinecone** when you want zero operational overhead and acceptable cost for straightforward vector search without the graph/cross-reference features. No inference modules to manage, no HNSW memory tuning.

**Use Cognee on top of Weaviate** (as one of its supported backends) when you need the full ECL pipeline — entity extraction, graph construction, and multi-store memory — and want Weaviate handling the vector layer specifically. The [Cognee architecture](../projects/cognee.md) treats Weaviate as one of seven interchangeable vector backends; you get Weaviate's hybrid search and multi-tenancy while Cognee handles the knowledge graph layer above it.

**Use Elasticsearch with vector search** when your team already operates Elasticsearch and needs to add semantic search to an existing BM25-heavy application without introducing a new database system.
