---
entity_id: chromadb
type: project
bucket: knowledge-bases
abstract: >-
  ChromaDB is an open-source embedded vector database for storing and querying
  embeddings; its differentiator is zero-config local operation (SQLite-backed)
  that scales to a hosted API without code changes.
sources:
  - repos/thedotmack-claude-mem.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/topoteretes-cognee.md
related:
  - sqlite
  - claude-code
last_compiled: '2026-04-07T11:47:47.462Z'
---
# ChromaDB

## What It Does

ChromaDB stores vector embeddings alongside metadata and provides similarity search over them. You embed text (or images) with a model, store the vectors in Chroma, then retrieve the nearest neighbors by semantic distance. The primary use case is [Retrieval-Augmented Generation](../concepts/rag.md): a pipeline embeds documents into Chroma at index time, then at query time retrieves relevant chunks to stuff into an LLM's context window.

The architectural differentiator is the developer experience on the low end. Most vector databases require a running server before you write a single line of code. Chroma starts as an in-process Python library backed by [SQLite](../projects/sqlite.md), with the same API scaling to a persistent local store, a Docker-hosted server, or Chroma Cloud. No configuration changes between modes — only the client constructor differs.

Chroma is also opinionated about embedding: it will call an embedding function on your raw text automatically if you pass one at collection creation time, removing the explicit embed-then-store step that most vector databases require.

## Core Mechanism

### Storage Layer

Chroma's persistence uses two engines in tandem. Metadata, document text, and collection definitions live in SQLite via SQLAlchemy. The actual vector index runs on HNSW (Hierarchical Navigable Small World) through the `hnswlib` C++ library, wrapped in Python. The HNSW index files sit on disk alongside the SQLite database under the `persist_directory` path.

HNSW is an approximate nearest-neighbor algorithm. It builds a multi-layer proximity graph during insert, then traverses that graph during query. The tradeoff: inserts and queries are fast even at millions of vectors, but results are approximate — the index can miss the true nearest neighbor when graph connectivity is suboptimal. Chroma exposes `hnsw:space` (cosine, l2, ip), `hnsw:construction_ef`, and `hnsw:M` as collection-level metadata parameters for tuning this tradeoff.

### Collections

The primary abstraction is a `Collection`. Each collection holds:
- Embeddings (float32 vectors)
- Documents (raw strings, optional)
- Metadatas (dicts, optional)
- IDs (required, user-supplied strings)

```python
collection = client.create_collection(
    name="my_docs",
    embedding_function=OpenAIEmbeddingFunction(api_key="..."),
    metadata={"hnsw:space": "cosine"}
)
collection.add(documents=["text chunk"], ids=["doc1"])
results = collection.query(query_texts=["search query"], n_results=5)
```

When an `embedding_function` is attached, `add()` calls it on the documents before storage, and `query()` calls it on the query text before search. If you skip the embedding function, you manage embeddings yourself and pass them directly.

### Where-Filtering

Chroma supports metadata filtering via a `where` dict using MongoDB-style operators (`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$and`, `$or`). Filters apply before the ANN search, restricting the candidate set. This enables filtered retrieval — "find the 5 most similar chunks from documents tagged `source: legal`" — without a separate post-processing step.

`where_document` filters on the document text itself using `$contains` or `$not_contains`.

### Client Modes

```python
# In-memory (tests, ephemeral)
client = chromadb.EphemeralClient()

# Persistent local (development)
client = chromadb.PersistentClient(path="./chroma_db")

# HTTP server (production, Docker)
client = chromadb.HttpClient(host="localhost", port=8000)

# Chroma Cloud
client = chromadb.CloudClient(tenant="...", database="...", api_key="...")
```

The API surface is identical across all four modes. This is the primary reason Chroma appears as an optional enhancement in projects like Claude-mem ([source](../raw/deep/repos/thedotmack-claude-mem.md)) — teams start local and promote to hosted without code changes.

### Multimodal Support

Chroma includes embedding functions for images (`OpenCLIPEmbeddingFunction`) and supports storing `uris` (file paths or URLs) alongside vectors. Cross-modal queries — find images similar to a text query — work through a shared embedding space.

## Key Numbers

| Metric | Value | Notes |
|---|---|---|
| GitHub Stars | ~17,000 (as of mid-2025) | Self-reported via GitHub badge |
| License | Apache 2.0 | |
| Language | Python (core), C++ (HNSW) | |
| Default backend | SQLite + hnswlib | |
| Max practical in-process scale | ~1–5M vectors | Community reports; not formally benchmarked by maintainers |

No independent benchmark from a neutral third party exists for Chroma at scale. The maintainers publish no formal throughput or latency numbers. Claims about scale limits come from community reports on GitHub and Discord, which vary widely by hardware, embedding dimension, and query load. Treat any specific numbers as anecdotal until replicated.

## Strengths

**Zero-friction startup.** `pip install chromadb` and three lines of Python get you a working vector store. No Docker, no server process, no schema definition. For prototypes and notebooks, this removes a class of setup errors entirely.

**Embedded function management.** Attaching an embedding function to a collection centralizes the embed-search loop. Chroma ships built-in functions for OpenAI, Cohere, HuggingFace, Sentence Transformers, Google Generative AI, and others. Teams don't write glue code to embed queries before search.

**Metadata filtering.** The `where` filter integrates cleanly with ANN search. Filtering by metadata before ANN is standard in modern vector databases, but Chroma's implementation covers most production use cases without requiring a separate vector DB with stronger filter support.

**Framework integration.** [LangChain](../projects/langchain.md), [LlamaIndex](../projects/llamaindex.md), and most RAG frameworks ship Chroma connectors. Cognee lists ChromaDB as one of seven supported vector backends ([source](../raw/deep/repos/topoteretes-cognee.md)). Claude-mem uses `ChromaSync.ts` for optional semantic search on top of its SQLite primary store ([source](../raw/deep/repos/thedotmack-claude-mem.md)).

## Critical Limitations

**Concrete failure mode: HNSW memory footprint at scale.** HNSW loads the entire index into memory during operation. At 1M vectors with 1536 dimensions (OpenAI `text-embedding-3-small`), the index alone requires roughly 6–12 GB of RAM depending on `M` and `ef_construction` settings. In-process use on a standard developer machine becomes infeasible before reaching production dataset sizes. Users who start with the embedded client and scale up without switching to the HTTP server or a purpose-built database will hit OOM errors without a clear error message that explains the root cause.

**Unspoken infrastructure assumption: single-writer concurrency.** The local persistent client uses SQLite, which has writer-level locking. Concurrent writes from multiple processes — common in multi-worker web servers or parallel ingestion pipelines — will either serialize (reducing throughput) or raise lock errors. Chroma's documentation addresses this by recommending the HTTP server for production, but teams that deploy the `PersistentClient` inside a multi-worker FastAPI or Django application will encounter this unexpectedly. The HTTP server mode serializes writes internally and is safe for concurrent access, but requires a separate process and a Docker container or equivalent.

## When NOT to Use It

**High-throughput production workloads.** If you need sub-10ms P99 query latency at millions of vectors with high write concurrency, use [Qdrant](../projects/qdrant.md) or [Pinecone](../projects/pinecone.md). Both are purpose-engineered for production load profiles and have published benchmarks from ANN-benchmarks.com.

**Hybrid search as a first-class requirement.** Chroma does not natively support BM25 or TF-IDF alongside vector search. If your retrieval quality depends on [hybrid search](../concepts/hybrid-search.md) — combining keyword and semantic signals via [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md) — you will need to run a separate keyword index ([Elasticsearch](../projects/elasticsearch.md) or a database with full-text search) and merge results in application code. Qdrant and [PostgreSQL](../projects/postgresql.md) with pgvector both support hybrid search natively.

**Existing Postgres infrastructure.** If your application already runs PostgreSQL, `pgvector` adds vector search without a new service dependency, operational overhead, or data synchronization complexity. Adding Chroma introduces a second database to back up, monitor, and keep in sync with your relational data.

**Multi-tenancy at scale.** Chroma's multi-tenancy model (one collection per tenant, or one database per tenant in Cloud) works for small tenant counts but lacks the namespace isolation, per-tenant quotas, and administrative tooling that [Pinecone](../projects/pinecone.md) or Qdrant namespaces provide for SaaS applications.

## Unresolved Questions

**Conflict resolution in distributed writes.** The HTTP server serializes writes, but there is no documented conflict resolution strategy for cases where two clients delete and recreate the same collection concurrently, or where a collection is modified during a long query operation.

**Cost model at Chroma Cloud scale.** Chroma Cloud pricing (as of mid-2025) is not publicly documented in detail. Teams evaluating the managed offering cannot model costs before migrating from local development.

**Persistence guarantees.** The SQLite + HNSW dual-write architecture has an edge case: a crash between a successful SQLite write and the corresponding HNSW index update leaves the two stores inconsistent. Chroma does not document its crash recovery behavior or whether it performs WAL-style recovery.

**Long-term maintenance trajectory.** Chroma raised a Series A and is building a hosted product. The open-source embedded library is the acquisition funnel. It is unclear what feature investment the embedded library receives relative to the hosted product, or whether the hosted API will diverge from the open-source interface over time.

## Alternatives

**Use [Qdrant](../projects/qdrant.md) when** you need production-grade performance with filtering, hybrid search, and payload indexing. Qdrant has independent benchmarks and a mature Rust implementation. The local mode also supports embedded use without a server.

**Use [FAISS](../projects/faiss.md) when** you need maximum raw ANN throughput with GPU acceleration and are comfortable managing the metadata store yourself. FAISS has no metadata storage — it's a pure vector index library.

**Use [Pinecone](../projects/pinecone.md) when** you want zero operational overhead, managed scaling, and production SLAs. Pinecone is fully hosted with no self-hosted option.

**Use pgvector (PostgreSQL extension) when** your application already runs PostgreSQL and you want to avoid a second database. pgvector supports hybrid search via PostgreSQL's full-text indexing and keeps vector search inside your existing transaction boundary.

**Use [Elasticsearch](../projects/elasticsearch.md) when** your retrieval requirement is primarily keyword-based with semantic reranking as a secondary signal, and you need mature operational tooling for a large corpus.

## Ecosystem Position

ChromaDB appears as an optional component in several knowledge-base and agent memory architectures rather than a primary store. In Claude-mem, ChromaDB provides semantic search on top of SQLite's FTS5 keyword search — SQLite handles primary storage and full-text search; ChromaDB adds approximate semantic retrieval when installed ([source](../raw/deep/repos/thedotmack-claude-mem.md)). In Cognee, it is one of seven swappable vector backends behind the `VectorDBInterface` abstraction ([source](../raw/deep/repos/topoteretes-cognee.md)). This pattern — Chroma as a pluggable semantic search layer rather than the authoritative store — reflects its practical deployment profile: accessible enough to adopt quickly, replaceable enough that teams swap it out as requirements harden.

## Related Concepts

- [Vector Database](../concepts/vector-database.md) — the broader category
- [Retrieval-Augmented Generation](../concepts/rag.md) — primary use case
- [Embedding Model](../concepts/embedding-model.md) — prerequisite for storing anything in Chroma
- [Hybrid Search](../concepts/hybrid-search.md) — what Chroma lacks natively
- [Semantic Memory](../concepts/semantic-memory.md) — agent memory layer Chroma commonly implements
- [Agent Memory](../concepts/agent-memory.md) — broader context for how vector stores fit in agent architectures
