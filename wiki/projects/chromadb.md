---
entity_id: chromadb
type: project
bucket: knowledge-substrate
abstract: >-
  ChromaDB is an open-source embedding database that stores, indexes, and
  queries vector embeddings with metadata filtering; its differentiator is
  zero-infrastructure local startup via a Python import with SQLite-backed
  persistence.
sources:
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - repos/thedotmack-claude-mem.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/modelscope-agentevolver.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/mem0ai-mem0.md
related:
  - vector-database
  - claude-code
  - openai
  - anthropic
  - langchain
  - openai-agents-sdk
  - model-context-protocol
  - react
last_compiled: '2026-04-08T02:52:53.730Z'
---
# ChromaDB

## What It Does

ChromaDB is an embedding database built for AI applications. You give it text (or pre-computed embeddings), it stores them with associated metadata and IDs, and you query by semantic similarity. The canonical use case is [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): chunk documents, embed them, store in Chroma, retrieve the top-k most relevant chunks at query time, inject into the LLM context.

What distinguishes Chroma from Pinecone, Weaviate, and Qdrant at the design level: it starts with a Python import and no external process. `import chromadb; client = chromadb.Client()` gives you a working in-memory vector store in milliseconds. For local development and testing, this is genuinely useful. For production, it runs as a standalone server with a Python or JavaScript client.

Chroma appears throughout the LLM tooling ecosystem not because it is the most capable [vector database](../concepts/vector-database.md) but because it has the lowest adoption friction. The source material confirms this: claude-mem lists ChromaDB as optional semantic search enhancement over its primary SQLite storage; [Skill Seekers](../projects/agent-workflow-memory.md) references `--format chroma/faiss/qdrant` as one of three local vector DB targets; [AgentEvolver](../projects/agentevolver.md) uses ChromaDB's cosine similarity for semantic deduplication of generated tasks.

## Architecture

### Storage Backends

Chroma has shipped multiple storage backends across versions:

- **In-memory** (`chromadb.Client()`): No persistence. Fast. Useful for tests.
- **Persistent** (`chromadb.PersistentClient(path="./chroma")`): SQLite for metadata and document storage, HNSW index (via `hnswlib`) for vector search. Data survives process restarts.
- **HTTP client** (`chromadb.HttpClient(host=..., port=...)`): Connects to a Chroma server. The server itself uses the same SQLite + HNSW stack.

The HNSW index is built on `hnswlib`, a C++ library with Python bindings. HNSW (Hierarchical Navigable Small World) provides approximate nearest neighbor search with configurable accuracy/speed tradeoffs via `M` (connections per node) and `ef_construction` (build-time search breadth) parameters.

### Collections

The primary abstraction is a **collection**: a named namespace holding embeddings, documents (optional raw text), and metadata (arbitrary key-value pairs). Operations:

```python
collection = client.get_or_create_collection("my-docs")

# Add: documents auto-embedded via configured embedding function
collection.add(
    documents=["text chunk one", "text chunk two"],
    metadatas=[{"source": "doc_a"}, {"source": "doc_b"}],
    ids=["id1", "id2"]
)

# Query: returns top-k by cosine similarity
results = collection.query(
    query_texts=["what is X?"],
    n_results=5,
    where={"source": "doc_a"}  # metadata filter
)
```

The `where` clause applies before vector search — it filters by metadata first, then ranks the filtered subset by similarity. For small filtered sets, this degrades to brute-force over the survivors rather than HNSW traversal.

### Embedding Functions

Chroma ships built-in embedding functions for OpenAI, Cohere, HuggingFace, Sentence Transformers, Google Generative AI, and others. The default is `DefaultEmbeddingFunction`, which downloads a small sentence-transformer model (`all-MiniLM-L6-v2`) on first use. You can pass pre-computed embeddings directly via the `embeddings` parameter, bypassing the embedding function entirely.

### Multitenancy

The HTTP server supports multiple databases per tenant, accessible via `HttpClient(tenant=..., database=...)`. This is relevant for SaaS applications sharing a single Chroma deployment across users. The local persistent client uses a single default database.

## Key Numbers

- **GitHub stars**: ~18,000 (self-reported from GitHub; verified by multiple third-party ecosystem maps)
- **PyPI downloads**: High (top-50 AI/ML packages by download count in most measurement periods)
- **HNSW query latency**: Sub-millisecond for collections under ~100k vectors on commodity hardware; degrades at scale compared to purpose-built distributed systems like Pinecone
- **Maximum practical collection size**: Undocumented by Chroma. Community reports suggest degradation above ~1M vectors on single-node deployments due to SQLite write lock contention and HNSW index rebuild costs

No independent benchmarks comparing Chroma's query accuracy or latency against other vector databases exist in peer-reviewed form. The Chroma team has published internal benchmarks but these are self-reported.

## Strengths

**Zero-infrastructure local development.** No Docker, no cloud account, no API key. `pip install chromadb` and you have a working vector store. This matters for prototyping RAG pipelines, running tests in CI without mocking, and building demos that need to work offline.

**Framework integration breadth.** [LangChain](../projects/langchain.md), [LlamaIndex](../projects/llamaindex.md), [Mem0](../projects/mem0.md), and most other LLM frameworks ship first-class Chroma integrations. The `Chroma` vector store class in LangChain requires two lines to configure. This reduces integration friction to near zero.

**Metadata filtering.** The `where` and `where_document` filter syntax covers most practical retrieval filtering needs without requiring a separate relational database for pre-filtering. For [semantic search](../concepts/semantic-search.md) use cases where you want "documents similar to X, from source Y, created after date Z," this works well on collections up to hundreds of thousands of vectors.

**[Hybrid search](../concepts/hybrid-search.md) support.** Collections can be queried with both vector similarity and keyword filters simultaneously. This is not full BM25-style [BM25](../concepts/bm25.md) hybrid search, but metadata-scoped similarity search covers many of the same retrieval scenarios.

## Critical Limitations

**Failure mode — write contention at scale.** SQLite serializes writes. If you have multiple threads or processes adding embeddings simultaneously (common in production ingestion pipelines), writes queue behind a single lock. At high ingestion rates, this becomes a bottleneck that does not improve with hardware. The HNSW index also requires periodic rebuilds that block queries. Users who start with Chroma in development and scale to production ingestion pipelines frequently report this as the forcing function to migrate to Qdrant or Weaviate.

**Unspoken infrastructure assumption.** The persistent client assumes the process that writes vectors is the same process (or same machine) that reads them. This works for single-server deployments. It breaks for multi-replica deployments where multiple application servers need to share vector state — Chroma's HTTP server solves this, but now you have a single-point-of-failure vector database with no built-in replication or sharding. Most documentation examples omit this detail.

**No built-in replication or horizontal scaling.** The Chroma server is a single process. There is a hosted cloud offering (Chroma Cloud) but no open-source distributed mode. This means Chroma cannot scale reads or writes horizontally without external load balancing or sharding implemented by the application layer.

**HNSW index accuracy degrades with deletes.** HNSW does not remove deleted vectors from the graph immediately. Deleted vectors are marked as deleted but remain in the traversal graph, consuming memory and potentially affecting result quality until the index is compacted. Chroma handles some of this automatically, but heavy delete workloads (common in agent memory systems that prune stale memories) can cause index bloat.

## When NOT to Use It

**High-volume production systems.** If your ingestion pipeline processes thousands of documents per hour or your query load exceeds a few hundred requests per second, start with Qdrant or Weaviate instead. Both support horizontal scaling and have more mature production operational stories.

**Multi-tenant SaaS with strict isolation requirements.** Chroma's tenant/database model provides logical separation but shares the same process and underlying storage. For regulatory isolation requirements, a managed service like Pinecone or a separate Qdrant instance per tenant is safer.

**Agent memory systems with frequent updates.** [Mem0](../projects/mem0.md) uses Chroma as an optional backend but defaults to Qdrant precisely because memory systems perform frequent small writes (one embedding per extracted fact), updates (replacing outdated facts), and deletes (pruning contradicted memories). SQLite write serialization and HNSW delete handling make Chroma suboptimal for this pattern.

**When you need [hybrid search](../concepts/hybrid-search.md) with keyword ranking.** Chroma's metadata filtering is not BM25. If your retrieval quality depends on exact keyword matching combined with semantic similarity (common in technical documentation retrieval), use Qdrant (which supports both natively) or Elasticsearch + vector plugin.

## Alternatives with Selection Guidance

- **Qdrant**: Use when you need production-grade performance, filtering, and horizontal scaling. Better HNSW implementation with proper delete handling. Good Rust-native performance. Docker or cloud-hosted.
- **[Pinecone](../projects/pinatone.md)**: Use when you want zero operational overhead and can accept vendor lock-in and per-vector pricing. Fully managed. No self-hosting option.
- **FAISS**: Use when you need raw ANN performance for offline batch retrieval without metadata filtering. No server, no persistence, no metadata — pure embedding search. Better for research and batch pipelines than application development.
- **pgvector**: Use when you already run PostgreSQL and want vectors without a separate service. Good for small-to-medium collections where join semantics with relational data matter.
- **Weaviate**: Use when you need multi-modal embeddings (text + images), built-in BM25 hybrid search, and GraphQL querying in one system.

## Unresolved Questions

**Cost at scale for Chroma Cloud.** The hosted offering exists but pricing is not detailed in documentation. For teams evaluating managed Chroma versus managed Qdrant or Pinecone, the comparison is opaque.

**Migration path from local to server.** The documentation does not clearly explain how to migrate an existing `PersistentClient` database to a `HttpClient` deployment without re-ingesting all documents. For applications that start local and grow to need a server, this migration is a practical concern.

**Conflict resolution in concurrent writes.** When two processes write embeddings with the same ID simultaneously, the behavior is undocumented. SQLite will serialize the writes, but which write wins and whether the HNSW index stays consistent is unclear from public documentation.

**Versioning guarantees for the persistent format.** Chroma has changed its internal storage format across major versions. Whether a collection created with Chroma 0.4.x is readable by 0.5.x, or 0.6.x, is not clearly guaranteed in the documentation, which matters for long-running production deployments.

## Ecosystem Position

Chroma appears as a dependency or optional integration in: [LangChain](../projects/langchain.md) (first-class `Chroma` vector store), [LlamaIndex](../projects/llamaindex.md), [Mem0](../projects/mem0.md) (one of 23 supported backends), claude-mem (optional semantic enhancement over SQLite), [AgentEvolver](../projects/agentevolver.md) (task deduplication), and Skill Seekers (one of three local vector DB export targets).

This breadth of integration reflects Chroma's position as the default choice for getting vector search working quickly, not as the best choice for any particular production workload. It is the SQLite of vector databases: excellent for development, adequate for small-scale production, replaced by more capable alternatives as requirements grow.

Related concepts: [Vector Database](../concepts/vector-database.md), [Semantic Memory](../concepts/semantic-memory.md), [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md), [Semantic Search](../concepts/semantic-search.md), [Hybrid Search](../concepts/hybrid-search.md), [Agent Memory](../concepts/agent-memory.md).


## Related

- [Vector Database](../concepts/vector-database.md) — implements (0.8)
- [Claude Code](../projects/claude-code.md) — part_of (0.4)
- [OpenAI](../projects/openai.md) — part_of (0.5)
- [Anthropic](../projects/anthropic.md) — part_of (0.4)
- [LangChain](../projects/langchain.md) — part_of (0.7)
- [OpenAI Agents SDK](../projects/openai-agents-sdk.md) — part_of (0.6)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.5)
- [ReAct](../concepts/react.md) — part_of (0.4)
