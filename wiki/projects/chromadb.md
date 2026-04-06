---
entity_id: chromadb
type: project
bucket: knowledge-bases
abstract: >-
  ChromaDB is an open-source embedding database for AI applications that stores
  and retrieves vector embeddings with metadata filtering, optimized for fast
  local development with a batteries-included Python API.
sources:
  - repos/thedotmack-claude-mem.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/topoteretes-cognee.md
related:
  - claude-code
  - rag
last_compiled: '2026-04-06T02:08:14.263Z'
---
# ChromaDB

## What It Does

ChromaDB is an open-source [vector database](../concepts/vector-database.md) purpose-built for AI applications. Developers use it to store text embeddings alongside metadata, then query by semantic similarity, metadata filters, or both. Its primary audience is people building [Retrieval-Augmented Generation](../concepts/rag.md) pipelines who want a local, dependency-light database they can start using in three lines of Python.

The core pitch: ChromaDB handles embedding storage, indexing, and retrieval so application developers do not need to manage FAISS indexes manually or stand up a separate vector infrastructure service. It ships with built-in embedding functions (wrapping OpenAI, Sentence Transformers, Cohere, and others) so you can insert raw text and let the database produce embeddings automatically.

## Core Mechanism

**Storage and Indexing.** ChromaDB stores collections of documents, embeddings, metadata, and IDs together. Under the hood it uses HNSW (Hierarchical Navigable Small World graphs) via the `hnswlib` library for approximate nearest-neighbor search. Metadata filtering runs through a separate in-memory or SQLite-backed filter layer before or after vector retrieval, depending on the query plan.

**Client Modes.** ChromaDB operates in three configurations:
- **In-memory (ephemeral):** `chromadb.Client()` — data lives in RAM, gone when the process ends. Standard for tests and notebooks.
- **Persistent local:** `chromadb.PersistentClient(path="./chroma_db")` — writes to disk using SQLite + HNSW files. The most common production-adjacent usage.
- **Client-server:** A running ChromaDB server (via `chroma run`) exposes an HTTP API; Python and JavaScript clients connect to it. Used when multiple processes need shared access.

**Query Interface.** The primary operations are `collection.add()`, `collection.query()`, and `collection.get()`. A query returns the `n_results` most similar documents, along with their distances, metadata, and optionally the raw embeddings. Metadata filters use a dictionary syntax (`{"source": {"$eq": "manual.pdf"}}`), which ChromaDB applies as a pre-filter or post-filter on the HNSW results.

**Embedding Functions.** Collections accept an embedding function at creation time. If you pass raw text to `add()` or `query()`, ChromaDB calls the embedding function automatically. The default function uses Sentence Transformers locally. Swapping to OpenAI embeddings requires only changing the `embedding_function` argument — the rest of the API stays identical.

ChromaDB appears as an optional semantic search enhancement in tools like claude-mem ([Source](../raw/deep/repos/thedotmack-claude-mem.md)), where it supplements SQLite+FTS5 keyword search with vector similarity. In that architecture, `ChromaSync.ts` manages embedding synchronization separately from the primary storage layer, meaning ChromaDB is additive rather than load-bearing.

Skill Seekers uses ChromaDB as one of several vector export targets (`--format chroma`), packaging scraped documentation as ChromaDB-compatible data for local RAG pipelines ([Source](../raw/repos/yusufkaraaslan-skill-seekers.md)).

## Key Numbers

- **GitHub stars:** ~17,000 (as of mid-2025; self-reported by the project)
- **License:** Apache 2.0
- **Language:** Python (core), with JavaScript/TypeScript client
- **Minimum Python:** 3.8+

No independent benchmarks on retrieval speed or accuracy at scale are published by the ChromaDB team. Performance comparisons circulating online are predominantly self-reported or produced by third parties with undisclosed hardware and dataset configurations. Take claimed QPS figures with skepticism unless you reproduce them on your own data size and shape.

## Strengths

**Near-zero setup.** `pip install chromadb` and three lines of Python produce a working vector store. No Docker, no configuration files, no external dependencies for the local path. This is ChromaDB's clearest competitive advantage over Qdrant, Weaviate, or Pinecone for early-stage development.

**Unified document+embedding storage.** Storing documents, embeddings, and metadata in one collection avoids the split-brain problem where your vector index and your document store drift out of sync. Every `add()` call keeps them together.

**Automatic embedding.** The built-in embedding function layer removes a common source of bugs — mismatches between the embedding model used at index time and query time. When you attach an embedding function to a collection, both paths use the same model.

**Framework adoption.** LangChain, LlamaIndex, and LlamaIndex-adjacent tools treat ChromaDB as a first-class integration. If you are following a tutorial or building on a framework template, ChromaDB will likely be the default vector store in the example code.

## Critical Limitations

**Concrete failure mode: performance degrades non-linearly at moderate scale.** ChromaDB's HNSW index loads entirely into memory. On a machine with 16 GB RAM, a collection with ~500K documents and 1536-dimensional embeddings (OpenAI `text-embedding-3-small` size) consumes roughly 3–4 GB of memory for the index alone, before accounting for document storage. Query latency stays acceptable under this load, but `add()` operations slow significantly as the index grows because HNSW rebalancing is expensive. Users who start with ChromaDB for a prototype and graduate to millions of documents routinely migrate to Qdrant or Weaviate rather than tune ChromaDB.

**Unspoken infrastructure assumption: single-writer.** ChromaDB's persistent local mode assumes one process writes to the database at a time. Concurrent writes from multiple processes corrupt the HNSW index. The client-server mode shifts this problem to the server process, but the server itself is single-threaded for write operations. Teams building multi-worker inference services — where several API workers might simultaneously add retrieved documents to a collection — discover this limitation after the fact.

## When NOT to Use ChromaDB

**Multi-tenant production services.** ChromaDB has no native access control, no per-collection authentication, and no tenant isolation. Running it as a shared service where different users should not see each other's data requires implementing all of this yourself at the application layer.

**High-throughput write workloads.** If your pipeline adds embeddings continuously — event streams, real-time document ingestion, agent trajectories — ChromaDB's single-writer constraint and HNSW rebalancing overhead will become bottlenecks. [Qdrant](../projects/qdrant.md) handles concurrent writes better and supports on-disk indexing for larger-than-memory collections.

**When you need hybrid retrieval natively.** ChromaDB supports metadata filtering but not BM25-style keyword search. Building [hybrid retrieval](../concepts/hybrid-retrieval.md) — combining dense vector search with sparse keyword search — requires adding a separate system (Elasticsearch, Typesense, or a custom BM25 implementation) and merging results yourself. Qdrant and Weaviate ship hybrid search natively.

**Regulated environments where data residency and auditability matter.** ChromaDB logs nothing, audits nothing, and offers no encryption at rest by default. The SQLite backing store is a plain file. For HIPAA or SOC 2 contexts, the operational surface you need to secure is large relative to alternatives with built-in encryption and access logging.

## Unresolved Questions

**Governance and long-term roadmap.** Chroma (the company) raised a seed round and has commercial ambitions around a hosted cloud product. The relationship between the open-source project's roadmap and the commercial product's priorities is not publicly documented. Contributors have noted that pull requests from the community sometimes sit unreviewed for months.

**Cost at scale in the cloud offering.** Pricing for Chroma Cloud (the hosted version) is not published in detail. Teams evaluating ChromaDB for production often find themselves unable to project costs before signing up and ingesting real data.

**Conflict resolution in multi-source ingestion.** When multiple sources add documents with the same ID, ChromaDB silently upserts. There is no merge strategy, no conflict detection, and no audit trail of which source wrote which version. Systems like Cognee that manage their own provenance tracking ([Source](../raw/deep/repos/topoteretes-cognee.md)) avoid this by treating ChromaDB as a dumb write target, not a source of truth.

**HNSW parameter tuning guidance.** ChromaDB exposes HNSW construction parameters (`M`, `ef_construction`, `ef_search`) but publishes no guidance on tuning them for different dataset sizes or query latency targets. The defaults work for small collections but are not optimal for anything above ~100K documents.

## Alternatives and Selection Guidance

**Use ChromaDB when** you are building a prototype, following a tutorial, or need a local vector store that requires zero infrastructure setup and will stay under ~100K documents.

**Use [Qdrant](../projects/qdrant.md) when** you need production-grade performance, concurrent writes, on-disk indexing for large collections, or native hybrid (dense + sparse) retrieval. Qdrant's Rust core handles memory pressure better and supports filtered HNSW natively.

**Use Pinecone ([Pinecone](../projects/pinecone.md)) when** you want a fully managed cloud service with SLAs, no infrastructure to operate, and are comfortable paying per vector rather than running your own instance.

**Use Weaviate when** your schema is richly structured, you need GraphQL querying across object relationships, or you want integrated BM25 + vector hybrid search without managing two separate systems.

**Use pgvector (PostgreSQL extension) when** your application already runs on PostgreSQL, your vector collection stays under a few million rows, and operational simplicity of one database outweighs vector-DB-specific features.

## Related Concepts

- [Vector Database](../concepts/vector-database.md)
- [Retrieval-Augmented Generation](../concepts/rag.md)
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md)
- [Semantic Memory](../concepts/semantic-memory.md)
- [Agentic RAG](../concepts/agentic-rag.md)

## Related Projects

- [Qdrant](../projects/qdrant.md) — production-grade alternative with concurrent write support
- [LangChain](../projects/langchain.md) — treats ChromaDB as a first-class vector store integration
- [LlamaIndex](../projects/llamaindex.md) — same
- [Mem0](../projects/mem0.md) — personal memory layer that can use ChromaDB as a backend
- [Graphiti](../projects/graphiti.md) — temporal knowledge graph system; orthogonal use case where ChromaDB handles semantic search and the graph handles relational structure
