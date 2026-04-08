---
entity_id: vector-database
type: concept
bucket: knowledge-substrate
abstract: >-
  Vector databases store high-dimensional embeddings and support approximate
  nearest neighbor search, enabling semantic retrieval that powers RAG systems,
  agent memory, and semantic search — differentiated from relational databases
  by geometry-aware indexing over floating-point vectors.
sources:
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/modelscope-agentevolver.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/topoteretes-cognee.md
  - repos/caviraoss-openmemory.md
  - repos/memvid-memvid.md
  - repos/nemori-ai-nemori.md
  - repos/thedotmack-claude-mem.md
  - repos/transformeroptimus-superagi.md
  - repos/wangziqi06-724-office.md
  - repos/yusufkaraaslan-skill-seekers.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - tweets/ashpreetbedi-dash-v2-the-multi-agent-data-system-every-company.md
related:
  - openai
  - chromadb
  - retrieval-augmented-generation
  - episodic-memory
  - anthropic
  - model-context-protocol
  - langchain
  - context-management
  - postgresql
  - claude-code
  - claude
  - semantic-memory
  - agent-memory
  - long-term-memory
  - semantic-search
  - openai-agents-sdk
  - pinatone
  - sqlalchemy
  - sqlite
  - faiss
  - qdrant
last_compiled: '2026-04-08T23:06:37.782Z'
---
# Vector Database

## What It Is

A vector database stores numerical embeddings — dense arrays of floating-point numbers produced by embedding models — and answers queries of the form "which stored vectors are most similar to this query vector?" rather than "which rows match this filter?" The similarity metric is usually cosine distance or Euclidean distance over high-dimensional spaces (typically 768 to 3072 dimensions for modern embedding models).

This geometric retrieval property is what distinguishes vector databases from relational databases. [PostgreSQL](../projects/postgresql.md) with [pgvector](../projects/postgresql.md) can answer SQL queries and vector queries in the same transaction. [SQLite](../projects/sqlite.md) handles structured records. But neither was built for the access pattern that dominates [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): "find the 10 most semantically relevant chunks to this user query," answered fast enough for interactive latency.

The core algorithmic problem is Approximate Nearest Neighbor (ANN) search. Exact nearest neighbor search in high dimensions requires comparing the query against every stored vector — O(n) per query. ANN algorithms sacrifice a bounded amount of recall for orders-of-magnitude faster search. The tradeoff parameter (recall vs. latency vs. memory) is what distinguishes HNSW, IVF, PQ, DiskANN, and other index types.

## Why It Matters for Agent Infrastructure

Agent memory systems have a retrieval problem. An agent accumulates facts, observations, conversation history, and procedural knowledge over time. When a new query arrives, the agent needs the relevant subset of that accumulated knowledge — not all of it (that would exhaust the context window) and not nothing (that would defeat the purpose of having memory). Semantic retrieval via vector similarity provides a principled way to select the relevant subset.

This shows up across every major memory architecture:

- **[Semantic Memory](../concepts/semantic-memory.md)**: facts about the world retrieved by conceptual similarity, not exact keyword match
- **[Episodic Memory](../concepts/episodic-memory.md)**: past interactions retrieved by relevance to current task
- **[Long-Term Memory](../concepts/long-term-memory.md)**: persistent knowledge stores queried at session start
- **[Agent Memory](../concepts/agent-memory.md)**: the general infrastructure backing all of the above

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is the most common deployment pattern: documents are chunked, embedded, and stored; at query time, a user question is embedded and the top-k similar chunks are retrieved and injected into the LLM context. Vector databases are the storage and retrieval layer for this pattern.

## How Vector Search Works

### Embedding

Before storage, content is converted to a vector by an embedding model. OpenAI's `text-embedding-3-large` produces 3072-dimensional vectors. `text-embedding-3-small` produces 1536. `all-MiniLM-L6-v2` produces 384. The embedding model determines the semantic space — two vectors are similar if and only if the embedding model encoded them as similar, which depends on its training data and objective.

Content chunking strategy matters here. A chunk that is too long loses specificity (the embedding averages over too many topics). A chunk too short loses context (the embedding lacks enough information to be meaningful). Standard practice is 256–1024 tokens per chunk with overlap.

### Index Structures

**HNSW (Hierarchical Navigable Small World)**: The dominant algorithm in production vector databases. Builds a multi-layer graph where higher layers contain sparse long-range connections and lower layers contain dense short-range connections. Search starts at the top layer, greedily navigates toward the query vector, then descends. Build cost is O(n log n), query cost is O(log n) in practice. Memory-intensive: HNSW typically requires storing the full vectors plus graph edges. [Qdrant](../projects/qdrant.md) and [FAISS](../projects/faiss.md) both implement HNSW. Configurable via `M` (number of connections per node, default 16) and `ef_construction` (search width during build, default 100).

**IVF (Inverted File Index)**: Clusters vectors via k-means, then searches only the nearest clusters at query time. More memory-efficient than HNSW but requires choosing cluster count `nlist` (typically `sqrt(n)`) and probe count `nprobe` at query time. IVF is the standard in [FAISS](../projects/faiss.md) for billion-scale workloads.

**Product Quantization (PQ)**: Compresses vectors by splitting them into subvectors and quantizing each independently. Reduces memory by 16–64x at the cost of recall. Usually combined with IVF as IVFPQ. [FAISS](../projects/faiss.md) supports this; [Pinecone](../projects/pinatone.md) uses it internally for cost efficiency at scale.

**DiskANN**: Microsoft's graph-based index designed for data too large to fit in RAM. Stores the graph on disk with an in-memory index for hot nodes. Powers Azure AI Search and some Qdrant configurations.

### Query Pipeline

A typical query:

1. Embed the query string using the same model used for storage
2. Issue a nearest-neighbor search against the index with top-k parameter
3. Apply metadata filters (user_id, date range, document type)
4. Return the top-k results with scores

Step 3 (metadata filtering) is architecturally significant. Pre-filtering (apply metadata filter before ANN search) is exact but may not find k results if the filtered subset is small. Post-filtering (ANN search, then filter) can return fewer than k results if many top-k candidates are filtered out. [Qdrant](../projects/qdrant.md) implements payload-indexed pre-filtering with inverted indexes, which avoids both problems for most workloads.

## Major Implementations

### FAISS

[FAISS](../projects/faiss.md) (Facebook AI Similarity Search) is a C++ library, not a database. It provides the algorithmic core — HNSW, IVF, PQ, and combinations thereof — without a server, persistence layer, or metadata store. You call it from Python via its C++ bindings. It stores everything in memory. Persistence requires serializing index files manually. No built-in filtering, no multi-tenant isolation, no HTTP API.

FAISS is the right choice when you control the full stack, need maximum performance, and are building your own infrastructure around it. It is what you use inside another system (your own server, your own persistence layer, your own metadata handling).

Many production vector databases use FAISS under the hood — [LangChain](../projects/langchain.md)'s `FAISS` vector store wrapper is just FAISS plus a docstore for metadata.

### ChromaDB

[ChromaDB](../projects/chromadb.md) targets the developer experience end of the spectrum. Zero-config Python setup: `chroma.Client()` runs entirely in-memory; `chroma.PersistentClient(path="./chroma")` persists to disk. Documents go in as strings; ChromaDB handles embedding via configurable embedding functions (OpenAI, Sentence Transformers, and others). Metadata filtering uses a simple `where` dict.

In the source analysis of [AgentEvolver](../projects/agentevolver.md), ChromaDB backs the `EmbeddingClient` for semantic deduplication during task generation — when a new task's embedding falls within the cosine similarity threshold of an existing task, the task is rejected. This is exactly the use case ChromaDB is designed for: low-friction integration of "is this semantically similar to something I've seen before?" checks.

[Mem0](../projects/mem0.md) lists ChromaDB as one of 23 supported vector backends. Its role there is identical: store memory embeddings, retrieve the top-5 similar memories before the reconciliation LLM call.

ChromaDB's server mode uses FastAPI and Clickhouse for production deployments. The embedded mode uses SQLite and a custom HNSW implementation. The gap between embedded and server mode is significant: embedded is single-process in-memory; server mode adds concurrency, persistence, and distributed coordination.

### Qdrant

[Qdrant](../projects/qdrant.md) is a production-grade Rust-based vector database with HNSW indexing, payload filtering via inverted indexes, scalar quantization, and binary quantization. It supports multiple vectors per point (useful when storing both dense and sparse vectors for [Hybrid Search](../concepts/hybrid-search.md)), filtering predicates that run efficiently against HNSW, and on-disk index storage for large collections.

Qdrant is the default in [Mem0](../projects/mem0.md) — `Memory()` with no configuration spins up Qdrant with local file storage at `~/.mem0/`. This is an unusual default for a production library (most default to in-memory), reflecting Qdrant's ability to run as an embedded local file store while still providing proper HNSW indexing.

Qdrant's Rust implementation gives it competitive query latency and memory usage benchmarks compared to Python-based alternatives, though independent benchmarks comparing at equal recall thresholds are sparse.

### Pinecone

[Pinecone](../projects/pinatone.md) is a managed cloud service, not an open-source library. The differentiation is operational: no infrastructure to run, automatic scaling, built-in redundancy, SLA-backed uptime. The API is simple — upsert vectors, query vectors, delete vectors. All index management happens on the backend.

The cost model is the critical consideration: Pinecone charges per vector stored and per query. At millions of vectors with frequent queries, costs can reach hundreds or thousands of dollars per month. The value proposition only holds if your infrastructure cost for running Qdrant or FAISS at scale would exceed Pinecone's pricing.

Pinecone pioneered several features now standard across the field: namespaces for multi-tenant isolation, sparse-dense hybrid indexes (combining BM25 sparse vectors with dense embeddings), and metadata filtering at scale.

### pgvector

[pgvector](../projects/postgresql.md) extends PostgreSQL with a `vector` column type and approximate nearest neighbor indexes (HNSW and IVF). The value proposition is adding vector search to an existing PostgreSQL database rather than running a separate vector database.

For applications already using PostgreSQL for structured data, pgvector enables transactional consistency between metadata (stored in regular tables) and vectors (stored in vector columns). A query can join vector similarity results with relational filters in a single SQL statement. This is architecturally cleaner than maintaining two separate systems with eventual consistency between them.

The performance tradeoff: pgvector's HNSW implementation is slower than Qdrant's for pure vector search workloads, because PostgreSQL's executor adds overhead. For mixed workloads where the application also issues complex SQL, the overhead may be acceptable.

In Cognee, pgvector is listed as an alternative vector backend to LanceDB, explicitly supporting PostgreSQL deployments that want vector search without a separate service.

## Hybrid Search

Pure vector similarity search misses exact matches. A user asking about "FAISS IVF nlist parameter" expects results about FAISS's specific IVF configuration options — not results that are semantically similar to FAISS but use different terminology. Keyword search via BM25 handles exact term matching better than vector similarity.

[Hybrid Search](../concepts/hybrid-search.md) combines both signals, typically by scoring with both methods and merging results via Reciprocal Rank Fusion (RRF) or weighted linear combination. Most production systems use hybrid search for anything where users might use specific technical terms, product names, or exact phrases.

Pinecone's sparse-dense indexes store BM25-derived sparse vectors alongside dense embeddings in the same system. Qdrant supports multiple vectors per point, allowing one dense and one sparse vector. [LlamaIndex](../projects/llamaindex.md) and [LangChain](../projects/langchain.md) both have hybrid search retrievers that combine vector store results with BM25 results from their `BM25Retriever` components.

## Chunking, Embedding, and Retrieval Quality

The most common source of poor retrieval is not the vector database — it is the chunking strategy or embedding model. A vector database finds the most similar stored vectors to a query. If the stored chunks are poorly formed (too long, too short, poorly delimited), or if the embedding model is mismatched to the domain, retrieval quality suffers regardless of index configuration.

Practical issues:

**Chunk boundary effects**: Splitting on fixed token counts cuts sentences mid-thought. Sentence-boundary splitting or paragraph-boundary splitting typically improves retrieval quality at the cost of variable chunk sizes.

**Embedding model mismatch**: An embedding model trained on general web text may perform poorly on code, legal text, or scientific literature. Domain-specific fine-tuning or using models trained on the target domain (code embedding models for code retrieval) improves results.

**Context window mismatch**: If the query is one sentence but stored chunks are 1024 tokens, the query embedding may not align well with chunk embeddings regardless of semantic similarity. Asymmetric embedding models (separate query and document encoders) help here.

**Cross-encoder reranking**: ANN retrieval with a bi-encoder embedding model is fast but approximate for relevance. Retrieving a larger top-k (top-50) and then reranking with a cross-encoder (which jointly encodes query and document) improves final precision at the cost of extra compute.

## Role in Agent Memory Systems

In the agent memory taxonomy, vector databases serve [Semantic Memory](../concepts/semantic-memory.md) and [Long-Term Memory](../concepts/long-term-memory.md) as the retrieval substrate. The pattern across systems analyzed here is consistent:

**[Mem0](../projects/mem0.md)**: After the first LLM pass extracts atomic facts from a conversation, each fact is embedded and the top-5 similar existing memories are retrieved via vector similarity. These retrieved memories feed the second LLM pass (the reconciliation step that decides ADD/UPDATE/DELETE). The vector database is the bridge between extraction and reconciliation.

**Cognee**: Stores both chunk embeddings and graph edge embeddings in the vector layer (LanceDB default). The `GRAPH_COMPLETION` search type uses triplet embeddings (subject-predicate-object) to retrieve contextual knowledge graph fragments for LLM generation.

**[AgentEvolver](../projects/agentevolver.md)**: Uses ChromaDB for task deduplication during synthetic task generation. The experience pool in the ReMe service uses vector similarity to retrieve relevant past experiences before new rollouts.

**Acontext**: Explicitly rejects vector-based retrieval. Agents navigate skill files via tool calls (list_skills → get_skill → get_skill_file) rather than semantic similarity. The argument: agent reasoning about which skills are relevant is more reliable than embedding similarity, and the result is debuggable. This is a genuine counterargument to the default assumption that vector search is necessary for memory retrieval.

## Strengths

**Fuzzy matching at scale**: Finds semantically similar content even when the query uses different terminology than the stored content. This is the fundamental property that keyword search lacks.

**Continuous embedding space**: Supports ranked retrieval with scores, not binary match/no-match. Applications can tune the recall/precision tradeoff via top-k and score thresholds.

**Backend flexibility**: The ecosystem has converged on similar APIs (insert vectors with metadata, query with filters). Switching from ChromaDB to Qdrant to pgvector typically requires minimal application code changes.

**Composability**: Vector search results compose naturally with other retrieval signals (BM25, graph traversal, metadata filters). Most production systems layer multiple retrieval methods.

## Limitations

**Recall degradation at scale**: ANN algorithms trade recall for speed. At billions of vectors, achieving 99% recall requires expensive index configurations or falling back to exact search. Most systems operate at 90–95% recall without noticing, but for applications where missing the most relevant result is costly, this matters.

**Infrastructure assumption — embeddings are stable**: Vector indexes built with one embedding model cannot be queried with another. Migrating embedding models (e.g., from OpenAI's ada-002 to text-embedding-3-large) requires re-embedding the entire corpus and rebuilding the index. For large corpora, this is expensive and disruptive.

**The chunking problem is unsolved**: No general-purpose chunking strategy works well across all document types. Code, legal text, scientific papers, chat logs, and web pages all have different natural structure. The chunking strategy is application-specific and requires iterative tuning.

**Concrete failure mode — positional bias in retrieval**: If documents in the corpus have uneven length distribution, short documents tend to get higher similarity scores than long ones because their embeddings are less "diluted" by averaging over many topics. A one-sentence fact will often outscore a detailed 500-token explanation of the same concept, even when the detailed explanation is more useful. This requires application-level mitigation (reranking, chunk normalization, or query expansion).

## When NOT to Use a Vector Database

**Exact match retrieval**: If users query by ID, exact phrase, or structured attribute (show me all events after 2024-01-01 for user X), a relational database with proper indexes is faster and more reliable.

**Small corpora**: Below ~10,000 documents, exact search is fast enough that ANN approximation costs more complexity than it saves. [FAISS](../projects/faiss.md)'s flat index (exact search) is appropriate here. Some teams add chromadb to a 500-document project and then debug retrieval failures that are really embedding quality problems — adding infrastructure before it's needed.

**When the retrieval problem is relational, not semantic**: If the key query is "what are all the events connected to entity X via these relationship types?", a [Knowledge Graph](../concepts/knowledge-graph.md) and graph traversal outperforms vector similarity. Cognee and [Graphiti](../projects/graphiti.md) both combine graph traversal with vector search because neither alone is sufficient.

**When transparency and debuggability matter more than automation**: The acontext source analysis shows a deliberate choice to reject vector retrieval in favor of agent-navigated markdown skill files. The argument: agents can reason about which files to read, producing retrieval that is inspectable, editable, and debuggable. If the memory system is for agents that need to explain their reasoning, opaque similarity scores may be the wrong foundation.

**When you need transactional consistency**: Vector databases are eventually consistent about what is searchable after a write. If an application needs "I just wrote this memory, now I can immediately retrieve it in the same transaction," pgvector within PostgreSQL is a better fit than a separate vector service.

## Unresolved Questions

**Optimal chunking for agentic workloads**: Most chunking research targets document retrieval for human reading. Agents have different needs — they may want to retrieve tool invocation details, decision rationale, or procedural steps. The right chunk structure for agent memory is not the same as the right chunk structure for document QA.

**Cost at scale with frequent updates**: Memory systems that update frequently (adding memories after every conversation, as [Mem0](../projects/mem0.md) does) generate continuous write load. Most vector database benchmarks focus on read performance. The write amplification from continuous HNSW updates at scale is not well characterized in public benchmarks.

**Multi-modal embedding alignment**: When agents need to retrieve across text, code, and structured data in the same collection, cross-modal embedding alignment is an open problem. Systems currently sidestep this by using separate collections with separate embedding models.

**Temporal validity**: Vector similarity has no notion of time. A memory stored two years ago and a memory stored yesterday are equidistant from a query if their content similarity is the same. Applications requiring temporal reasoning (what did the user prefer last month vs. now?) must implement staleness handling on top of the vector layer. Neither the vector database nor the embedding model provides this.

## Alternatives and Selection Guidance

**Use [BM25](../concepts/bm25.md) when**: Queries use specific technical terms, product names, or exact phrases. BM25 is fast, interpretable, and has no embedding cost.

**Use [Hybrid Search](../concepts/hybrid-search.md) when**: Queries mix semantic intent with specific terminology. Most production retrieval systems should be here.

**Use pgvector when**: You already run PostgreSQL, your workload is mixed SQL and vector, and you want transactional consistency. Operational simplicity wins.

**Use Qdrant when**: You need production HNSW with payload filtering, quantization, and on-disk index support. Open-source, Rust performance, flexible deployment.

**Use ChromaDB when**: You're prototyping or building a small-scale application and want zero-configuration startup. Not the choice for production multi-tenant scale.

**Use FAISS when**: You're building a system that manages its own infrastructure and needs the algorithmic core without database overhead. Research and specialized production systems.

**Use Pinecone when**: You have no infrastructure team and are willing to pay cloud pricing for operational simplicity and automatic scaling.

**Use a [Knowledge Graph](../concepts/knowledge-graph.md) instead when**: The retrieval problem is about relationships between entities rather than semantic similarity between documents. [Graphiti](../projects/graphiti.md) and Cognee combine both.

**Use neither when**: The corpus is small (< 10k items), the query is exact-match, or the memory system needs to be debuggable and agent-navigated rather than similarity-based.

## Related Concepts

- [Semantic Search](../concepts/semantic-search.md) — the application pattern built on top of vector databases
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the primary deployment context
- [Hybrid Search](../concepts/hybrid-search.md) — combining vector similarity with BM25
- [Semantic Memory](../concepts/semantic-memory.md) — cognitive memory type served by vector retrieval
- [Agent Memory](../concepts/agent-memory.md) — the broader memory architecture in which vector databases are one component
- [Context Management](../concepts/context-management.md) — managing what retrieved content actually enters the context window
- [BM25](../concepts/bm25.md) — the complementary keyword retrieval method
