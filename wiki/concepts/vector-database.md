---
entity_id: vector-database
type: concept
bucket: knowledge-bases
abstract: >-
  A database system storing high-dimensional vectors for semantic similarity
  search; core infrastructure for RAG and agent memory, distinguished from
  general databases by ANN indexing (HNSW, IVF) that trades exact precision for
  sub-millisecond query at scale.
sources:
  - repos/natebjones-projects-ob1.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/topoteretes-cognee.md
  - repos/caviraoss-openmemory.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/michaelliv-napkin.md
related:
  - rag
  - episodic-memory
  - semantic-memory
  - mcp
  - bm25
  - procedural-memory
  - context-management
  - claude-code
  - openclaw
  - openai
  - claude
  - opencode
  - mem0
  - langgraph
  - claude-md
  - hybrid-search
  - embedding-model
  - gemini
  - memory-evolution
  - emotional-memory
  - unknown-unknowns
last_compiled: '2026-04-07T11:41:18.454Z'
---
# Vector Database

## What It Is

A vector database stores numerical representations of data — embeddings — and answers the question "what is most similar to this query?" using approximate nearest neighbor (ANN) search. Every piece of content an embedding model encodes becomes a point in a high-dimensional space (typically 384 to 3072 dimensions), and the database finds the closest points by geometric distance, usually cosine similarity or Euclidean distance.

The term covers a spectrum. Dedicated systems like [Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinecone.md), and [ChromaDB](../projects/chromadb.md) are built exclusively for vector workloads. General-purpose databases like [PostgreSQL](../projects/postgresql.md) (via pgvector) and [Elasticsearch](../projects/elasticsearch.md) have added vector indexes as extensions. The difference matters at scale: dedicated systems optimize memory layout, quantization, and index construction specifically for ANN search, while extension-based approaches trade raw performance for operational simplicity.

## Why It Exists

Language model context windows can hold tens of thousands of tokens, but a knowledge base containing years of documents, conversations, and decisions holds far more. The retrieval problem is: given a user query, find the dozen most relevant chunks out of millions without reading all of them.

Keyword search (BM25) solves this for term overlap. "authentication" finds documents containing "authentication." But "how do I log in?" doesn't contain the word "authentication" — and BM25 misses it. Embedding models convert both the query and the documents into vectors where semantic proximity reflects meaning proximity. The vector database then finds which stored vectors sit closest to the query vector, returning semantically relevant results regardless of vocabulary overlap.

This makes vector databases the standard retrieval layer for [Retrieval-Augmented Generation](../concepts/rag.md), [Episodic Memory](../concepts/episodic-memory.md), [Semantic Memory](../concepts/semantic-memory.md), and most [Agent Memory](../concepts/agent-memory.md) architectures.

## Core Mechanism

### Embedding Generation

Before anything touches the database, an [Embedding Model](../concepts/embedding-model.md) converts content into vectors. The model takes text (or images, audio, code) and outputs a fixed-size numerical array. OpenAI's `text-embedding-3-large` produces 3072-dimensional vectors. Sentence transformers like `all-MiniLM-L6-v2` produce 384 dimensions. The dimensionality affects both storage cost and retrieval quality.

The key constraint: you must use the same model for indexing and querying. Vectors from different models occupy incompatible spaces — mixing them produces meaningless distances. Switching embedding models mid-deployment requires re-embedding everything already stored.

### Approximate Nearest Neighbor (ANN) Indexing

Exact nearest neighbor search requires comparing a query vector to every stored vector — O(n) per query. At a million vectors with 1536 dimensions each, that's 6GB of floating point operations per query. ANN indexes trade a small accuracy loss for orders-of-magnitude speed improvement.

**HNSW (Hierarchical Navigable Small World)** is the dominant algorithm. It builds a multi-layer graph where each node connects to its nearest neighbors. The top layers have few nodes and long-range connections; the bottom layer has all nodes with short-range connections. Search starts at the top layer, greedily navigates toward the query, then descends to find precise neighbors. HNSW achieves sub-millisecond queries at recall rates above 95% with appropriate parameters (`M` for graph connectivity, `efConstruction` for build quality, `ef` for search quality).

**IVF (Inverted File Index)** partitions vectors into Voronoi cells using k-means clustering. Queries search only the cells closest to the query vector, skipping the rest. IVF requires training on the data distribution and performs worse than HNSW on cold data but scales to larger datasets with lower memory overhead.

**Product Quantization (PQ)** compresses vectors by splitting them into subvectors and quantizing each subvector independently. A 1536-dimension float32 vector (6KB) compresses to 64 bytes or less. PQ dramatically reduces memory usage at the cost of recall accuracy. Most production systems combine IVF + PQ (IVF-PQ) for billion-scale datasets.

[FAISS](../projects/faiss.md), Meta's library, implements all three. Qdrant and Pinecone build on these primitives with additional infrastructure. ChromaDB uses HNSW via the `hnswlib` library.

### Metadata Filtering

Raw ANN search returns the globally closest vectors. Production systems need filtered search: "find the most similar documents written by user X after date Y." This requires metadata stored alongside vectors.

Pre-filtering evaluates the metadata condition first, then searches within the matching subset. Post-filtering searches all vectors, then applies metadata conditions to results. Pre-filtering is more precise but requires efficient metadata indexes; post-filtering can miss relevant results if the filter is highly selective. Qdrant supports both; Pinecone defaults to post-filtering with some pre-filter optimization.

### Chunking

Documents rarely embed as a whole. A 10,000-word report becomes dozens of chunks: fixed-size windows (512 tokens, 50-token overlap), paragraph boundaries, or semantic segments. The chunking strategy affects retrieval quality as much as the embedding model.

Small chunks (128 tokens) have precise boundaries but lose surrounding context. Large chunks (1024 tokens) preserve context but dilute the embedding signal with off-topic content. The "lost in the middle" problem means embedding models weight text near chunk boundaries more heavily — important content buried in the middle of a large chunk gets underweighted.

Parent-child chunking stores small chunks for precise retrieval but returns the parent chunk (larger) as context to the LLM. This separates the retrieval unit from the context unit, improving both precision and completeness.

## Strengths

**Semantic recall across vocabulary gaps.** A query about "user login" retrieves documents discussing "authentication," "credential verification," and "session management" without those exact terms appearing in the query. BM25 misses all of these.

**Multimodal retrieval.** Multimodal embedding models (CLIP, GPT-4V embeddings) encode both images and text into the same space, enabling cross-modal search. A text query can retrieve relevant images; an image query can retrieve relevant text.

**No schema requirement.** Any content that can be embedded can be stored and retrieved without predefined schema. This suits the unstructured nature of most knowledge bases.

**Sub-millisecond query latency at scale.** With HNSW indexes, production systems return results from millions of vectors in under 10 milliseconds. This is fast enough for interactive query/response loops.

## Critical Limitations

**Failure mode — vocabulary overlap with embedding quality degradation.** Embedding models degrade on out-of-distribution content. A model trained on general web text performs poorly on specialized technical jargon, code, or domain-specific notation. A query about `HNSW efConstruction parameter tuning` in a specialized engineering knowledge base may retrieve semantically unrelated results if the embedding model has never seen that terminology in context. The model converts the tokens to vectors, but the geometric distances no longer reflect semantic proximity. This failure is silent — the database returns results confidently, but they are wrong. Evaluating retrieval quality on domain-specific content before deployment is mandatory, not optional.

**Unspoken infrastructure assumption — embedding consistency.** Every system deploying a vector database implicitly assumes that the embedding model will remain available, affordable, and unchanged. In practice: OpenAI has deprecated embedding models (breaking existing indexes), local models require GPU memory that may not be available in all deployment environments, and switching models requires a full re-index. Teams underestimate re-indexing cost. A knowledge base with 50 million chunks at $0.02 per 1M tokens costs $1,000 to re-embed with OpenAI's current models. At an older deprecated rate, the same operation is impossible without migrating to a new model.

## When NOT to Use a Vector Database

**When keyword precision matters more than semantic recall.** Legal and compliance queries often need exact term matching. "Section 14(b)(ii)" must retrieve documents containing that exact phrase, not semantically similar legal passages. Use [BM25](../concepts/bm25.md) or a traditional search engine here.

**When the knowledge base is small.** Under 10,000 chunks, the operational overhead of running a vector database (memory footprint, index construction, query infrastructure) exceeds the benefit. A flat file with BM25 (MiniSearch, Whoosh) or even a simple cosine similarity scan over all vectors is sufficient and eliminates infrastructure complexity entirely. Napkin's benchmark on LongMemEval demonstrates that BM25 over well-structured markdown files achieves 91% accuracy on long-term conversational memory retrieval — competitive with embedding-based systems.

**When content changes rapidly.** ANN indexes optimize for static or slow-changing data. Frequent updates require either expensive index rebuilds or accepting degraded query quality. For high-write workloads (real-time event streams, live documents), the index staleness becomes a reliability problem.

**When you need exact match guarantees.** ANN search is approximate by design. When a query must return all documents meeting a criterion (compliance audit, exact duplicate detection), the recall-precision tradeoff in ANN indexes is unacceptable. Exact nearest neighbor search or relational filtering is required.

**When your team doesn't control the deployment environment.** Running a vector database adds operational dependencies: memory sizing for indexes (HNSW for 1M 1536-dim vectors requires ~6GB RAM), deployment configuration, backup procedures. For agents running in restricted environments (serverless functions, minimal containers), file-based alternatives (FAISS index on disk, SQLite with vector extensions) may be preferable.

## Hybrid Search

Vector search and keyword search are complementary, not competitive. [Hybrid Search](../concepts/hybrid-search.md) runs both simultaneously and combines results using [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md) or learned rerankers. The combination handles both the vocabulary gap (where BM25 fails) and the semantic drift (where vector search returns plausible-but-wrong results for specific terminology).

Most production RAG systems use hybrid search. Elasticsearch, Qdrant, and Azure Cognitive Search all support hybrid modes natively. The Hipocampus benchmark (self-reported) shows that hybrid BM25 + vector search scores 11.4% on implicit recall vs. 2.8% for BM25 alone and 3.4% for vector alone.

## Relationship to Agent Memory Systems

Vector databases serve as the retrieval layer for several memory types:

**Semantic Memory** stores general factual knowledge. Querying "what do we know about customer churn?" retrieves relevant encoded knowledge regardless of the exact phrasing used when the knowledge was stored.

**Episodic Memory** stores time-indexed experiences. Querying by semantic similarity surfaces past interactions relevant to a current situation even when exact terms don't match.

**[Mem0](../projects/mem0.md)** uses vector storage as its primary retrieval mechanism, storing user preferences and conversation history as embeddings. [Letta](../projects/letta.md) and [Zep](../projects/zep.md) both rely on vector databases as components in broader memory architectures.

However, vector databases alone are insufficient for complete agent memory. The "unknown unknowns" problem — surfacing context the agent doesn't know to search for — requires complementary mechanisms. The Hipocampus project addresses this through a hierarchical compaction tree and topic index (ROOT.md) that gives agents an always-loaded overview of their entire knowledge, enabling proactive context surfacing. Its benchmark shows vector search scores 3.4% on implicit recall while a compaction tree approach scores 9.2% — semantic similarity search structurally cannot find connections that require knowing what exists.

Similarly, [Hybrid Search](../concepts/hybrid-search.md) architectures and [Knowledge Graph](../concepts/knowledge-graph.md) approaches (like [Cognee](../projects/graphiti.md) with its graph + vector combination) address limitations that pure vector retrieval cannot solve alone.

## Unresolved Questions

**Index tuning guidance.** HNSW parameters (`M`, `efConstruction`, `ef`) significantly affect memory usage, index build time, and query recall. The documentation for most systems gives parameter descriptions but no guidance on tuning for specific workloads. A high-recall configuration can use 3-5x more memory than a default configuration.

**Cost at scale.** Hosted vector databases (Pinecone, Weaviate Cloud) publish per-vector pricing, but total cost of ownership at production scale is rarely documented. Memory-optimized instances for large HNSW indexes can cost more than the embedding API calls. Self-hosted deployments transfer this cost to engineering time and infrastructure management.

**Consistency guarantees during index updates.** Most ANN indexes don't offer strong consistency between writes and reads. A freshly inserted vector may not appear in query results for seconds to minutes. This is underdocumented and causes subtle bugs in systems that write and immediately query.

**Multi-tenant isolation.** Storing multiple users' data in one vector database requires either namespace partitioning (one collection per user) or metadata filtering (filter by user_id on every query). Neither approach is fully documented for security implications — can a metadata filter leak vectors across tenants under error conditions?

## Alternatives and Selection Guidance

**Use [BM25](../concepts/bm25.md) when:** Your content is well-structured (markdown headers, consistent terminology), your queries use domain-specific terminology, you need zero infrastructure, or you're under 10K documents. Napkin's LongMemEval results prove BM25 on structured markdown is competitive with vector search at a fraction of the complexity.

**Use [Hybrid Search](../concepts/hybrid-search.md) when:** You have both structured terminology (exact match needs) and semantic retrieval needs. This is the production default for most knowledge base applications.

**Use [Knowledge Graph](../concepts/knowledge-graph.md) when:** Your knowledge has strong relational structure (entities, relationships, temporal connections) and multi-hop reasoning matters. [Cognee](../repos/topoteretes-cognee.md) combines graph and vector storage for this case, showing 14,899 stars as evidence of demand for graph-augmented retrieval.

**Use a dedicated vector database (Qdrant, Pinecone) when:** You have over 1M chunks, need sub-10ms query latency, require sophisticated metadata filtering, or need built-in replication and monitoring. Qdrant is open-source and self-hostable; Pinecone is managed.

**Use pgvector (PostgreSQL extension) when:** You're already on PostgreSQL, your scale is under a few million vectors, and you want to avoid additional infrastructure. Slightly slower than dedicated systems but eliminates a separate service.

**Use FAISS when:** You need a library (not a service) for embedding-based retrieval in Python, or you're building a larger system that manages its own storage. FAISS provides the core ANN algorithms without the database layer.

## Related Concepts

- [Embedding Model](../concepts/embedding-model.md) — generates the vectors stored here
- [Retrieval-Augmented Generation](../concepts/rag.md) — primary use case
- [Hybrid Search](../concepts/hybrid-search.md) — combines vector and BM25 retrieval
- [BM25](../concepts/bm25.md) — keyword alternative with different tradeoffs
- [Semantic Memory](../concepts/semantic-memory.md) — memory type implemented via vector storage
- [Episodic Memory](../concepts/episodic-memory.md) — time-indexed memory with vector retrieval
- [Agent Memory](../concepts/agent-memory.md) — broader framework vector databases serve
- [Context Management](../concepts/context-management.md) — how retrieved vectors get used in context
