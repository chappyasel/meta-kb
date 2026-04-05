---
entity_id: vector-database
type: concept
bucket: knowledge-bases
abstract: >-
  A database optimized for storing and querying high-dimensional vector
  embeddings via approximate nearest neighbor algorithms, enabling semantic
  similarity search for RAG pipelines, agent memory, and knowledge retrieval at
  scale.
sources:
  - repos/natebjones-projects-ob1.md
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - repos/topoteretes-cognee.md
  - repos/michaelliv-napkin.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/caviraoss-openmemory.md
related:
  - Retrieval-Augmented Generation
  - Model Context Protocol
  - Episodic Memory
  - Semantic Memory
  - Mem0
  - Procedural Memory
  - ChromaDB
  - Qdrant
  - pgvector
  - Pinecone
  - Weaviate
  - Milvus
  - FAISS
  - LanceDB
last_compiled: '2026-04-05T20:26:26.865Z'
---
# Vector Database

## What It Is

A vector database stores and retrieves high-dimensional numerical arrays (embeddings) that encode semantic meaning. Unlike relational databases that match exact values or text databases that match keywords, vector databases find items by geometric proximity in embedding space. A query embedding representing "machine that learns from data" will retrieve documents about neural networks even if they never use those exact words, because the embeddings cluster near each other in high-dimensional space.

This is the foundational infrastructure for [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md), [Semantic Memory](../concepts/semantic-memory.md), [Episodic Memory](../concepts/episodic-memory.md), and most [Procedural Memory](../concepts/procedural-memory.md) systems. When an agent needs to recall relevant past context, or a RAG system needs to surface relevant documents, a vector database handles the retrieval step.

## Core Mechanism: Approximate Nearest Neighbor Search

The defining algorithm is **Approximate Nearest Neighbor (ANN) search**. Exact nearest neighbor search requires comparing a query vector against every stored vector, which scales as O(n) per query. At millions of documents, this becomes untenable. ANN algorithms trade exact accuracy for orders-of-magnitude speedup.

### HNSW (Hierarchical Navigable Small World)

The dominant index type across Qdrant, Weaviate, Milvus, and others. HNSW builds a layered graph where each layer is progressively sparser:

- The bottom layer contains all vectors with short-range edges
- Upper layers contain sampled nodes with long-range edges
- Search starts at the top (few nodes, fast traversal) then descends to the bottom (dense, precise)

Insert time is O(log n). Search time is approximately O(log n) in practice. Memory usage is the tradeoff: HNSW indexes are typically 1.5-3x the size of the raw vectors.

**Key parameters:**
- `M`: Number of edges per node (higher = better recall, more memory)
- `ef_construction`: Search depth during index build (higher = better quality, slower build)
- `ef`: Search depth at query time (higher = better recall, slower query)

### IVF (Inverted File Index)

Used by FAISS as its primary index type. Clusters vectors into Voronoi cells, then searches only nearby clusters for a query:

1. During build: k-means clusters the dataset into `nlist` centroids
2. During query: find the `nprobe` nearest centroids, then search within those clusters

IVF indexes are smaller than HNSW but require a training step and degrade for small datasets. IVF is typically combined with Product Quantization (IVF-PQ) to compress vectors to fractions of their original size, reducing memory at the cost of recall.

### Product Quantization (PQ)

Splits each vector into `m` sub-vectors, quantizes each to one of `k` codewords. A 1536-dimensional float32 vector (6144 bytes) can compress to 96 bytes with PQ at moderate recall loss. LanceDB uses a variant called IVF-PQ as its default. This is what makes billion-scale vector search feasible on commodity hardware.

### Similarity Metrics

**Cosine similarity**: Measures angle between vectors, ignoring magnitude. Standard for text embeddings from OpenAI, Cohere, etc., where vector magnitude is not semantically meaningful.

**Dot product**: Measures both angle and magnitude. Used with embeddings trained with dot product objectives (some bi-encoders). Computationally cheaper than cosine but sensitive to embedding scale.

**Euclidean distance (L2)**: Measures geometric distance. Less common for text, more common for image embeddings or when training explicitly optimized for L2.

Most systems default to cosine similarity for text. Choosing the wrong metric for an embedding model's training objective degrades retrieval quality.

## Embedding Generation

Vector databases store vectors but typically do not generate them. The embedding model is a separate component:

1. Text chunks pass through an embedding model (e.g., `text-embedding-3-small`, `nomic-embed-text`, `bge-m3`)
2. The model outputs a fixed-dimensional vector (commonly 768, 1536, or 3072 dimensions)
3. That vector is stored in the database alongside metadata and the original text

Model choice determines the semantic quality of search. An embedding from `text-embedding-ada-002` and one from `nomic-embed-text` are not interchangeable — they occupy different geometric spaces with different clustering properties. Switching embedding models mid-deployment requires reindexing every stored vector.

## Filtered Search

Real applications rarely want to search all vectors. A customer support system might search only tickets from the last 30 days for one customer. Metadata filtering adds structured predicates to ANN search:

- **Pre-filtering**: Apply metadata filter first, then ANN search within the filtered set. Precise but slow for sparse filters (small result sets).
- **Post-filtering**: Run ANN search first, then filter results. Fast but may return fewer results than requested if many top-k candidates fail the filter.
- **ACORN (Qdrant's approach)**: Interleaves filter checks during graph traversal. Balances speed and accuracy for arbitrary filters.

Weaviate, Qdrant, and Milvus all implement some form of interleaved filtering. pgvector's filtering performance depends on PostgreSQL query planning and tends to degrade for small filtered subsets.

## Major Implementations

### Purpose-Built Vector Databases

**Qdrant** (Rust): Payload filtering during HNSW traversal, named vectors for multi-modal search, sparse+dense hybrid search in a single query. Strong performance benchmarks on the ANN-Benchmarks suite (self-reported; independently reproducible). Suited for production workloads needing fine-grained payload filtering.

**Weaviate** (Go): GraphQL and REST APIs, built-in support for BM25 hybrid search, multi-tenancy at the collection level. Larger operational footprint than Qdrant. Suited for teams that need hybrid search and structured querying in one system.

**Milvus** (Go/C++): Designed for billions of vectors, distributed architecture with separate storage and compute layers. Complex to operate — requires etcd, MinIO or S3, and multiple service components. Suited for large-scale production deployments where operational complexity is acceptable.

**Pinecone** (managed): Serverless and pod-based deployment options, no infrastructure to manage. Proprietary; no self-hosted option. Suited for teams that want to avoid vector database operations entirely, at cloud pricing.

**LanceDB** (Rust): Columnar storage using the Lance format, IVF-PQ indexing, embedded or serverless deployment. No separate server process needed — the library reads and writes directly to local or object storage. Suited for local-first applications and embedded deployments. Used as the storage layer by some memory systems including [Mem0](../projects/mem0.md).

### Library (Not a Database)

**FAISS** (Facebook AI Similarity Search, C++/Python): A library of ANN algorithms, not a standalone database. No persistence layer, no metadata filtering, no client-server protocol. You build the index, save it to disk, load it back, and manage everything yourself. The fastest option for in-process search when you control the surrounding infrastructure. Used as a component inside higher-level systems. [ChromaDB](../projects/chromadb.md) originally used FAISS internally.

**ChromaDB**: Embeds in Python (or runs as a server), stores vectors and metadata together, handles embedding generation optionally. Designed for rapid prototyping. Production use at scale is less established than Qdrant or Weaviate.

### Relational Extension

**pgvector** (PostgreSQL extension): Adds a `vector` column type and IVF and HNSW indexes to PostgreSQL. Lets you run vector search alongside relational queries in one database. Strong for applications already on Postgres where unified transactions and SQL joins matter more than maximum ANN throughput. Performance at scale is lower than purpose-built systems — pgvector HNSW at 10M vectors is slower than Qdrant at the same scale (ANN-Benchmarks results, independently reproducible). [Open Brain](../projects/ob1.md) uses pgvector via Supabase as its primary storage.

## Strengths

**Semantic recall without keyword matching**: The defining capability. Documents that describe the same concept with different vocabulary cluster together in embedding space. BM25 misses documents that use synonyms; ANN search finds them.

**Sub-linear query time at scale**: HNSW delivers ~1ms queries at millions of vectors on commodity hardware. Exact search at that scale would take seconds.

**Flexible metadata coexistence**: Modern vector databases store payloads (JSON metadata) alongside vectors, enabling hybrid queries that combine semantic similarity with structured predicates.

**Multi-modal support**: Vectors are model-agnostic — you can store text, image, audio, and code embeddings in the same infrastructure if the embeddings share a space or you use separate named vector collections.

## Critical Limitations

**Concrete failure mode — embedding model lock-in**: Switching embedding models invalidates every stored vector. A team that starts with `text-embedding-ada-002`, decides to migrate to a newer model for cost or quality reasons, must re-embed their entire corpus and rebuild all indexes. At 10 million documents, that reindexing job takes hours and costs real money. There is no migration path that preserves existing indexes across model changes.

**Unspoken infrastructure assumption**: Vector databases assume that the embedding model's training distribution matches your retrieval domain. An embedding model trained on general web text will underperform on specialized technical documents (clinical notes, legal contracts, source code) because the semantic neighborhoods in embedding space do not reflect domain-specific similarity. This shows up as recall failures that are invisible unless you measure retrieval quality against ground truth.

**Recall is approximate, not guaranteed**: ANN search by definition trades exact recall for speed. An index configured for 0.95 recall will miss 5% of the true nearest neighbors on every query. For most applications this is acceptable; for applications where missing a specific document is a critical failure (compliance, legal discovery), you need exact search or a hybrid approach.

## When NOT to Use It

**When the corpus is small** (under ~10,000 documents): The overhead of managing embeddings, indexes, and an additional database does not pay off. BM25 full-text search — as demonstrated by [napkin](../projects/napkin.md) achieving 91% on LongMemEval with zero embeddings — matches or beats vector retrieval on many benchmarks at this scale, with no embedding API costs and no additional infrastructure.

**When you need exact matching**: Vector search finds semantically similar items. If you need to find the exact document with ID "invoice-2024-0042", use a key-value lookup. If you need to find all documents with `status = "pending"` created last week, use a relational database. Vector search answers "what is semantically similar to this query?", not "what matches these exact criteria?"

**When your queries are out-of-distribution**: If user queries consistently fall outside the embedding model's training domain, vector search will return plausible-looking but wrong results. Legal or medical deployments often discover this after deployment when recall metrics reveal systematic gaps. Evaluate retrieval quality on domain-specific queries before committing to vector infrastructure.

**When you need full transaction semantics**: Updating a document in a vector database typically requires deleting the old vector and inserting a new one. Transactional consistency across metadata updates and vector updates is not guaranteed in most implementations.

## Architecture in Agent Memory Systems

In agent memory architectures, vector databases handle one or two specific retrieval tasks:

**[Semantic Memory](../concepts/semantic-memory.md)**: Facts, concepts, and declarative knowledge. Stored as embeddings, retrieved by semantic similarity. The vector database finds the most relevant facts for a given context.

**[Episodic Memory](../concepts/episodic-memory.md)**: Past events and interactions. Embeddings capture the semantic content of episodes; metadata fields store timestamps, session IDs, participants. Hybrid search (vector similarity + time filter) retrieves relevant past episodes.

Systems like [Mem0](../projects/mem0.md) use vector databases as one layer in a larger architecture. [Cognee](../projects/cognee.md) combines vector search with graph databases, using ANN retrieval to identify entry points and then graph traversal to surface relationships. [OpenMemory](../projects/openmemory.md) uses vector embeddings inside an HNSW-backed store but adds sector classification, decay scoring, and composite ranking on top of raw cosine similarity.

The [Model Context Protocol](../concepts/model-context-protocol.md) does not specify a storage mechanism, but MCP memory servers (like OpenMemory's MCP server) typically use a vector database for retrieval and expose the results as MCP tool responses.

## Benchmarks and Performance Claims

The [ANN-Benchmarks](http://ann-benchmarks.com) project provides independently reproducible comparisons of ANN algorithms across multiple datasets (GLUE, SIFT, GIST, Yandex T2I). Key findings:

- HNSW consistently achieves the best recall-throughput tradeoff across datasets
- The gap between algorithms narrows when recall targets are set at 0.90 vs. 0.99
- Hardware matters as much as algorithm choice: NVMe SSDs change the calculus for disk-based indexes

Vendor-published benchmarks (Qdrant's benchmark suite, Weaviate's performance claims, Pinecone's latency numbers) are self-reported. They are generally reproducible but tested under conditions favorable to the vendor (single-tenant, no concurrent writes, pre-warmed caches). Production workloads with mixed read/write patterns will see different numbers.

napkin's LongMemEval benchmark (91% at ~500 sessions with BM25, self-reported) is a meaningful challenge to the assumption that vector search is necessary for good retrieval, though the result has not been independently validated across diverse corpora.

## Unresolved Questions

**Cost at scale**: At 100 million vectors at 1536 dimensions, an HNSW index consumes roughly 500GB of RAM in a purpose-built system. Moving to disk-based HNSW (Qdrant's memory map mode, DiskANN) reduces RAM but increases latency. The tradeoff curves are not well-documented for mixed workloads.

**Embedding model versioning in production**: No standard practice exists for managing embedding model versioning across a live vector database. Some teams maintain multiple parallel indexes during transitions; others accept a brief degradation window during reindexing. The operational playbook is underdeveloped.

**Hybrid search calibration**: Systems that combine BM25 keyword scores with vector similarity scores (reciprocal rank fusion or learned fusion) require tuning the relative weights. The optimal balance is dataset-dependent and typically requires a labeled evaluation set that most teams do not have.

## Alternatives and Selection Guidance

Use **pgvector** when you are already on PostgreSQL and need vector search alongside relational queries, and your scale is under ~5M vectors with moderate query throughput.

Use **Qdrant** when you need production-grade performance with payload filtering, are running self-hosted, and want strong operational documentation.

Use **Weaviate** when you need hybrid BM25+vector search in one system and are comfortable with a larger operational footprint.

Use **Milvus** when you need distributed vector search at billion-scale and have the engineering capacity to operate a multi-component system.

Use **FAISS** when you need the fastest possible in-process ANN search and are building your own persistence and metadata layer around it.

Use **LanceDB** when you need an embedded vector store with no server process, particularly for local-first or serverless deployments.

Use **Pinecone** when you want managed infrastructure and acceptable cloud pricing, and self-hosting is not a requirement.

Use **BM25 full-text search (no vector database)** when your corpus is small, your queries are keyword-oriented, or you want to avoid embedding costs and infrastructure complexity, particularly for [RAG](../concepts/retrieval-augmented-generation.md) systems with well-structured documents.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.8)
- [Model Context Protocol](../concepts/mcp.md) — implements (0.5)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.6)
- [Semantic Memory](../concepts/semantic-memory.md) — implements (0.6)
- [Mem0](../projects/mem0.md) — implements (0.5)
- [Procedural Memory](../concepts/procedural-memory.md) — implements (0.4)
- [ChromaDB](../projects/chromadb.md) — implements (0.9)
- [Qdrant](../projects/qdrant.md) — implements (0.9)
- [pgvector](../projects/pgvector.md) — implements (0.8)
- [Pinecone](../projects/pinecone.md) — implements (0.9)
- [Weaviate](../projects/weaviate.md) — implements (0.9)
- [Milvus](../projects/milvus.md) — implements (0.9)
- [FAISS](../projects/faiss.md) — implements (0.9)
- [LanceDB](../projects/lancedb.md) — implements (0.9)
