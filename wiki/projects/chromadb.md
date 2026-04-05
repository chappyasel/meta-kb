---
entity_id: chromadb
type: project
bucket: knowledge-bases
abstract: >-
  ChromaDB is an open-source embedding database for AI applications,
  differentiated by its developer-first API, built-in embedding generation, and
  single-package installation from localhost to cloud.
sources:
  - repos/thedotmack-claude-mem.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/topoteretes-cognee.md
related:
  - Vector Database
last_compiled: '2026-04-05T20:32:36.325Z'
---
# ChromaDB

## What It Is

ChromaDB is an open-source vector database built for AI applications that need semantic search and retrieval-augmented generation. It stores embeddings alongside documents and metadata, handles embedding generation internally (via configurable embedding functions), and exposes a Python/JavaScript API designed to minimize setup friction.

Its core differentiator: you can go from `pip install chromadb` to storing and querying embeddings in under ten lines of Python, with no separate infrastructure required for development. The same client API works against an in-process ephemeral store, a local persistent store, and a remote ChromaDB server.

ChromaDB appears as a supported vector backend in Cognee ([topoteretes-cognee](../raw/deep/repos/topoteretes-cognee.md)), a vector search option in claude-mem ([thedotmack-claude-mem](../raw/deep/repos/thedotmack-claude-mem.md)), and a supported output format in Skill Seekers ([yusufkaraaslan-skill-seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)), which reflects its position as a de facto default for local vector storage in Python AI tooling.

## Core Mechanism

### Storage Architecture

ChromaDB organizes data into **collections**, each containing:
- **Documents** — raw text strings
- **Embeddings** — float vectors (generated on add, or supplied by caller)
- **Metadata** — arbitrary key-value pairs for filtering
- **IDs** — caller-supplied string identifiers

Collections use HNSW (Hierarchical Navigable Small World) graphs for approximate nearest-neighbor search, implemented via `hnswlib`. HNSW trades index build time and memory for fast query performance that scales sub-linearly with collection size.

### Embedding Functions

ChromaDB wraps embedding model calls behind an `EmbeddingFunction` interface. The default uses `all-MiniLM-L6-v2` via the `sentence-transformers` library — runs locally, no API key required. Callers can swap in OpenAI, Cohere, HuggingFace, Google, or any custom implementation conforming to the interface. This abstraction means the same `collection.add()` / `collection.query()` calls work regardless of which model backs them.

### Query Path

`collection.query(query_texts=["..."], n_results=10)` runs:
1. Embed the query text using the collection's embedding function
2. Search the HNSW index for approximate nearest neighbors
3. Apply metadata `where` filters (post-hoc filtering, not pre-filtering)
4. Return documents, distances, metadata, and embeddings

The `where` filter uses a MongoDB-style query syntax: `{"category": {"$in": ["finance", "legal"]}}`. Filters apply after vector retrieval, which matters for performance at scale — a highly selective metadata filter doesn't reduce the number of vectors scanned.

### Client Modes

Three deployment modes share one API:

```python
# Ephemeral (in-memory, lost on process exit)
client = chromadb.Client()

# Persistent (local SQLite + HNSW files)
client = chromadb.PersistentClient(path="./chroma_db")

# HTTP client (connects to running ChromaDB server)
client = chromadb.HttpClient(host="localhost", port=8000)
```

The server itself runs via `chroma run --path ./db`. Docker images are published for containerized deployment.

### Data Persistence

Persistent mode stores embeddings in `hnswlib` binary files and document/metadata in SQLite via `duckdb` (earlier versions) or direct SQLite (current versions). The storage layout is a directory of files, making it portable but not suitable for concurrent writes from multiple processes.

## Key Numbers

- **GitHub stars**: ~16,000 (as of early 2025, self-reported growth figures vary)
- **Default embedding model**: `all-MiniLM-L6-v2` — 384 dimensions, ~80MB download on first use
- **HNSW parameters**: configurable `M` (connectivity) and `ef_construction` (build accuracy), defaulting to values tuned for recall/speed balance
- **Metadata filter operators**: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$and`, `$or`

No independently validated latency benchmarks are publicly available. ChromaDB's own documentation does not publish throughput numbers.

## Strengths

**Zero-friction local development.** No Docker required for getting started. The in-process client means tests and notebooks work without any server setup. This is why it appears as the default or first-listed vector backend in projects like Cognee and Skill Seekers.

**Multimodal metadata filtering.** The `where` and `where_document` filters let callers combine vector similarity with structured filters in a single query call, without writing SQL or a separate filtering step.

**Embedding function abstraction.** Swapping from local sentence-transformers to OpenAI embeddings requires changing one parameter, not rewriting ingestion or query code.

**Python-native API.** Collections accept plain Python lists; no schema definition, no migration files. This matches how LLM application developers actually iterate.

## Critical Limitations

**Concurrent write failure.** ChromaDB's persistent mode uses file-based HNSW and SQLite without multi-process locking. Running two processes that both write to the same persistent directory will corrupt the index. The HTTP server mode serializes writes, but adds the operational burden of managing a separate server process. Production deployments that need concurrent writes from multiple workers — say, a FastAPI application with multiple Gunicorn workers — require the HTTP server, not the embedded persistent client. This surprises developers who tested with the simple persistent client and then scaled horizontally.

**Metadata filter performance assumption.** The system assumes most queries are primarily vector similarity searches with light metadata filtering. For workloads that filter on high-cardinality metadata fields and expect the filter to reduce scan cost, ChromaDB's post-hoc filtering does the opposite — it scans the full HNSW neighborhood first, then discards results. Pinecone and Weaviate implement pre-filtering via inverted indexes that run before vector search.

## When NOT to Use It

**Multi-tenant SaaS with strict data isolation.** ChromaDB has no built-in access control, namespace isolation, or authentication beyond what you wrap around it. Collections are not isolated by user. Any caller with HTTP access to the server can read or modify any collection.

**Large-scale production with horizontal write scaling.** If your ingestion pipeline runs on multiple workers and needs to write to the same collection concurrently, ChromaDB's architecture forces you through a single HTTP server bottleneck. Qdrant, Weaviate, and Pinecone are designed for distributed ingestion.

**When filtering is your primary query pattern.** If most queries look like "find all documents matching these 10 metadata conditions, optionally ranked by similarity," a traditional database with vector extension (pgvector) or a database-native vector store (Weaviate with inverted indexes) will outperform ChromaDB's post-filter approach.

**Teams that need schema enforcement.** ChromaDB accepts any metadata shape on any document in a collection. There is no way to enforce that all documents in a collection have a `created_at` field. Applications that depend on consistent metadata structure must enforce this in application code.

## Unresolved Questions

**Governance and roadmap.** Chroma (the company) raised a seed round and has a managed cloud product (Chroma Cloud). The relationship between the open-source library's roadmap and the commercial product's development priorities is not publicly documented. Features that benefit the hosted product may land in the open-source version faster than those that don't.

**Index rebuild cost at scale.** The documentation does not explain what happens to query performance while a large collection is being updated. HNSW indexes require periodic rebuilds for optimal recall when the collection grows significantly. Whether ChromaDB triggers this automatically, how long it takes, and what the performance degradation looks like during rebuild is not covered in public documentation.

**Embedding dimension mismatch handling.** If you add documents with one embedding function and later query with a different one (different dimensions), the behavior is an error, but the error message and recovery path are not clearly documented. Collections do not store which embedding function was used to generate their vectors.

## Alternatives

| When to use instead | Alternative |
|---|---|
| Production workloads with horizontal scaling and distributed ingestion | [Qdrant](../projects/qdrant.md) — Rust-based, designed for concurrent writes, supports filtering before vector search |
| Metadata filtering as primary query pattern | pgvector — SQL-native, filters use the full PostgreSQL query planner |
| Multi-tenant applications with access control | Weaviate — has RBAC, multi-tenancy at the schema level |
| Fully managed, no infrastructure management | Pinecone — serverless pricing, no server to run |
| When already using LanceDB for other storage | LanceDB — also embeds locally, columnar format better for analytical queries over embeddings |
| Temporal reasoning or graph-augmented retrieval | Cognee's default Kuzu + LanceDB stack — purpose-built for knowledge graph + vector hybrid search ([topoteretes-cognee](../concepts/cognee.md)) |

ChromaDB is the right choice when the priority is fast local iteration, the deployment target is a single-server application, and the team values API simplicity over operational capability. For anything requiring horizontal write scaling, strong data isolation, or filter-first query patterns, a different store fits better.

## Related Concepts

- [Vector Database](../concepts/vector-database.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
