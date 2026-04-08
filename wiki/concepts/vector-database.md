---
entity_id: vector-database
type: concept
bucket: knowledge-substrate
abstract: >-
  A database optimized for storing and querying high-dimensional embedding
  vectors via approximate nearest neighbor search, serving as the retrieval
  backbone for RAG pipelines and agent memory systems.
sources:
  - repos/transformeroptimus-superagi.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - repos/thedotmack-claude-mem.md
  - repos/wangziqi06-724-office.md
  - repos/caviraoss-openmemory.md
  - repos/nemori-ai-nemori.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/memvid-memvid.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/modelscope-agentevolver.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
  - chromadb
  - retrieval-augmented-generation
  - episodic-memory
  - anthropic
  - model-context-protocol
  - langchain
  - context-management
  - claude-code
  - semantic-memory
  - agent-memory
  - long-term-memory
  - semantic-search
  - openai-agents-sdk
  - pinatone
  - claude
  - knowledge-graph
  - react
  - agent-memory
  - long-term-memory
  - openai-agents-sdk
last_compiled: '2026-04-08T02:49:17.532Z'
---
# Vector Database

## What It Is

A vector database stores, indexes, and queries high-dimensional numerical vectors — the floating-point arrays that embedding models produce when they encode text, images, or other data. A sentence like "the capital of France" becomes a vector of 768 or 1536 numbers. Two semantically similar sentences produce vectors that sit close together in that high-dimensional space. Vector databases exploit this geometry to answer the query "what stored vectors are most similar to this query vector?" — faster than scanning every row.

This is the retrieval backbone of most [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) systems and persistent [Agent Memory](../concepts/agent-memory.md) implementations. When an agent needs to find relevant facts, past experiences, or related documents, it encodes the query as a vector and asks the database for nearest neighbors.

Vector databases differ from traditional databases in one fundamental way: queries are not exact matches. "SELECT * WHERE content = 'Paris'" returns zero or one results. A vector query for "capital of France" returns the top-k most similar documents regardless of whether any document contains that exact phrase. Similarity, not equality, is the primitive.

## Core Mechanism: Approximate Nearest Neighbor Search

Brute-force nearest neighbor search — computing the distance from a query vector to every stored vector — scales as O(n) in the number of vectors and O(d) in the embedding dimension. At a million documents with 1536-dimensional embeddings, that's 1.5 billion floating-point operations per query. Practical systems need something faster.

Vector databases solve this with **Approximate Nearest Neighbor (ANN)** indexing — data structures that sacrifice a small amount of recall to gain large query speed improvements.

### HNSW (Hierarchical Navigable Small World)

The dominant ANN algorithm in production systems. HNSW builds a multi-layer graph where each node represents a vector and edges connect nearby vectors. The top layers are sparse (long-range connections), the bottom layers are dense (short-range connections). At query time, the algorithm starts at a random entry point in the top layer, greedily navigates toward the query by following edges that reduce distance, then descends to denser layers and repeats.

Key parameters:
- **M**: number of bidirectional edges per node. Higher M → better recall, more memory. Typical range: 8-64.
- **ef_construction**: search depth during index construction. Higher → better quality index, slower builds.
- **ef_search** (runtime): search depth during queries. Higher → better recall, slower queries. Typical tuning: 50-200.

HNSW achieves sub-10ms queries on million-scale collections with 95%+ recall at ef_search=100. The tradeoff is memory: each stored vector requires O(M) additional pointers, roughly 4-8x the raw vector storage.

Implementations: Pinecone, Weaviate, Qdrant, ChromaDB (via hnswlib), and pgvector (v0.5+) all use HNSW as their default or primary index.

### IVF (Inverted File Index)

Older than HNSW but still widely used in FAISS and cloud-scale deployments. IVF divides the vector space into k clusters (via k-means) and assigns each vector to its nearest centroid. At query time, the algorithm probes the nprobe nearest clusters and searches only those vectors.

Key parameters:
- **nlist**: number of clusters. More clusters → faster queries, lower recall at fixed nprobe.
- **nprobe**: clusters to probe at query time. More probes → better recall, slower queries.

IVF is more memory-efficient than HNSW for very large collections but requires a training phase on a representative sample of vectors.

### Product Quantization (PQ) and Scalar Quantization (SQ)

Applied on top of HNSW or IVF to compress vectors and reduce memory footprint. PQ divides each vector into m sub-vectors and quantizes each to one of k centroids, encoding each sub-vector as an integer. This compresses a 1536-dim float32 vector (6144 bytes) to ~192 bytes at 4-bit quantization — a 32x reduction in memory.

The cost: some recall loss (typically 2-8% depending on quantization aggressiveness). Qdrant's "scalar quantization" and Pinecone's "pod types" both apply variants of this approach. Tools like `pgvector` support `halfvec` (float16) and `bit` types as lightweight alternatives.

### Distance Metrics

The similarity function used to compare vectors:

- **Cosine similarity**: angle between vectors, independent of magnitude. Standard for text embeddings from models trained with cosine objectives (OpenAI, Cohere, most sentence-transformers). `1 - cosine_similarity` gives cosine distance for nearest-neighbor queries.
- **Euclidean (L2)**: geometric distance. Used for some image embeddings and audio models.
- **Dot product (inner product)**: equivalent to cosine similarity for unit-normalized vectors. Required for models trained with inner-product objectives (some dense retrieval models, ColBERT variants).
- **Hamming**: edit distance for binary vectors. Efficient for hashing-based approaches.

Choosing the wrong metric for a given embedding model produces incorrect results — cosine and inner product produce identical rankings only if all vectors are unit-normalized.

## Distance Metric, Embedding Model, and Index: The Three-Way Dependency

These three components must be matched. A common failure: storing OpenAI text-embedding-3-large vectors (1536 dims, trained for cosine similarity) in a pgvector column configured with `vector_ip_ops` (inner product), or building an IVF index and forgetting to call `train()` before inserting vectors.

Additionally, **vector databases do not understand embedding models**. Switching from `text-embedding-3-small` to `text-embedding-3-large` — or from OpenAI to Cohere — requires re-embedding every stored document and rebuilding the index. The stored vectors are meaningless outside the specific model that produced them. This is the most underappreciated operational cost of deploying vector databases in production: the embedding model becomes a long-term dependency that is expensive to change.

## Filtering and Metadata

Pure ANN search returns the k nearest vectors globally. Practical systems need filtered search: "find the 10 most relevant chunks about authentication, but only from documents uploaded by user_id='alice' after 2024-01-01."

Two approaches:

**Pre-filtering** (filter then search): apply metadata filters first to narrow the candidate set, then run ANN on the filtered subset. Accurate but slow when the filtered subset is small — it may fall back to brute force.

**Post-filtering** (search then filter): run ANN on the full collection, return top-k results, filter by metadata, stop when enough pass. Fast when the filter is loose, but may return fewer than k results when the filter is strict.

Qdrant uses a hybrid approach with payload indexes and a filtering planner that estimates selectivity and switches strategies. Pinecone uses server-side metadata filters built into the index structure. pgvector relies on PostgreSQL's query planner, which handles filtering naturally but may not efficiently combine it with ANN index scans for highly selective filters.

## The Role of Vector Databases in Agent Memory

Vector databases appear in three agent memory patterns:

**[Semantic Memory](../concepts/semantic-memory.md) and RAG**: The canonical use case. Documents are chunked, embedded, and stored. At inference time, the agent embeds the query and retrieves the top-k most relevant chunks, injecting them into context. This is how most production RAG systems work, including the default retrieval backend in [LangChain](../projects/langchain.md) and [LlamaIndex](../projects/llamaindex.md).

**[Episodic Memory](../concepts/episodic-memory.md)**: Past agent interactions, stored as embeddings, retrieved by semantic similarity. [Mem0](../projects/mem0.md) stores extracted facts as vectors in Qdrant (default) or any of 23 supported backends. [Zep](../projects/zep.md) and [Letta](../projects/letta.md) use vector stores for episode retrieval alongside graph and relational layers.

**[Long-Term Memory](../concepts/long-term-memory.md) with hybrid approaches**: Production memory systems rarely use vector databases alone. [MemGPT](../projects/memgpt.md) uses vector stores as one tier in a hierarchical memory architecture. Cognee ([Source](../raw/deep/repos/topoteretes-cognee.md)) combines LanceDB (vectors) + Kuzu (graph) + SQLite (relational) explicitly because "no single database can handle all aspects of memory." Graphiti / [Zep](../projects/zep.md) builds temporal knowledge graphs with vector embeddings on top. [HippoRAG](../projects/hipporag.md) and [GraphRAG](../projects/graphrag.md) augment vector retrieval with graph traversal to capture multi-hop relationships that pure embedding similarity misses.

A key design choice in [AgentEvolver](../projects/agentevolver.md) is worth noting as a negative example: it uses ChromaDB for semantic deduplication during task generation ([Source](../raw/deep/repos/modelscope-agentevolver.md)), but the primary memory mechanism is a separate experience pool (ReMe) that stores summarized trajectories — not raw embeddings. This reflects a broader trend: vector databases handle retrieval, but higher-level abstractions handle memory management.

## Hybrid Search

Pure vector search has a known failure mode: exact keyword matches. If a user asks about a specific function name, product code, or proper noun that appears verbatim in documents, semantic similarity may rank it lower than a phrase-matched result would. [Hybrid Search](../concepts/hybrid-search.md) combines dense vector retrieval with sparse keyword retrieval (typically [BM25](../concepts/bm25.md)) and merges results via Reciprocal Rank Fusion (RRF) or a learned reranker.

Most production vector databases now support this: Qdrant has native sparse vector support (for SPLADE or BM25-style sparse encoders), Weaviate has BM25 + vector hybrid out of the box, Pinecone supports sparse-dense hybrid. pgvector delegates sparse search to PostgreSQL's full-text search (`tsvector` columns), combined at query time. [Mem0](../projects/mem0.md) applies BM25 reranking over graph search results as a post-retrieval step ([Source](../raw/deep/repos/mem0ai-mem0.md)).

## Major Implementations

| System | Default Index | Notable Characteristic | Deployment |
|--------|--------------|----------------------|------------|
| [Pinecone](../projects/pinatone.md) | HNSW (pods), streaming on serverless | Fully managed, serverless tier | Cloud only |
| [ChromaDB](../projects/chromadb.md) | HNSW via hnswlib | Zero-config embedded mode, popular for prototyping | Embedded or server |
| Qdrant | HNSW + payload indexes | Native sparse vectors, filtering planner, quantization | Self-hosted or cloud |
| Weaviate | HNSW | Hybrid search, multi-tenancy, GraphQL interface | Self-hosted or cloud |
| pgvector | HNSW (v0.5+), IVF | Runs inside PostgreSQL, no separate service | Self-hosted |
| LanceDB | DiskANN variant | Columnar format (Arrow), embedded, very fast disk-based | Embedded or server |
| FAISS | IVF + PQ | Library, not a database — no persistence or API | Embedded library |
| Milvus | HNSW, IVF, DiskANN | Distributed, high-throughput, complex to operate | Self-hosted |

ChromaDB is the default vector backend for many agent frameworks because it requires zero infrastructure. Qdrant is the default for [Mem0](../projects/mem0.md) because of its filtering performance and quantization support. LanceDB is the default for [Cognee](https://github.com/topoteretes/cognee) because its columnar format handles mixed vector + metadata workloads efficiently. pgvector is the right choice when the rest of the stack already runs PostgreSQL and the collection stays under ~10M vectors.

## Strengths

**Fast semantic similarity at scale**: HNSW provides sub-10ms queries on million-scale collections with high recall. No other query pattern — SQL joins, graph traversal, full-text search — matches this speed for "find things similar to this query."

**Framework ubiquity**: Every major agent framework (LangChain, LlamaIndex, LangGraph, CrewAI, AutoGen, OpenAI Agents SDK) ships with vector database integrations. The retrieval primitive is standardized.

**Operationally mature**: Pinecone, Qdrant, Weaviate, and pgvector are production-tested. Failure modes are well-documented. Monitoring, backup, and scaling patterns exist.

**Works well for dense retrieval over homogeneous corpora**: When documents are all roughly the same type (chunks of documentation, customer support tickets, research abstracts) and queries are natural language, vector search reliably returns useful results with minimal configuration.

## Critical Limitations

**Concrete failure mode — embedding model lock-in**: Once a collection of a million documents is embedded with `text-embedding-ada-002`, switching to a better model requires re-embedding all documents and rebuilding the index. At $0.00002 per 1K tokens and 500 tokens per chunk, 1M chunks costs $10 to re-embed — but the engineering time to orchestrate the migration, validate quality, handle dual-index transitions, and update all clients is the real cost. Teams underestimate this at design time.

**Unspoken infrastructure assumption — chunk quality determines retrieval quality**: Vector databases retrieve what was stored. If chunking strategy produced bad boundaries (splitting a code function mid-definition, splitting a table from its caption), the stored vectors poorly represent the information, and no amount of index tuning recovers this. The operational assumption is that someone has already solved chunking, which is a harder problem than setting up the database.

**Semantic similarity ≠ relevance**: Embedding similarity captures topical proximity but not logical entailment, causality, or temporal ordering. "Paris is the capital of France" and "France is not the capital of Paris" produce similar vectors. Systems that require precise factual accuracy, temporal reasoning, or multi-hop inference cannot rely on vector search alone — this is why [Knowledge Graph](../concepts/knowledge-graph.md) augmentation exists.

**No native temporal awareness**: Stored vectors carry metadata timestamps but the index has no notion of recency weighting. An outdated fact from three years ago and a current fact produce the same similarity score if their content is similar. Temporal reasoning requires explicit filtering or separate indexing, not a built-in capability. Graphiti/Zep's temporal knowledge graph directly addresses this gap.

## When NOT to Use a Vector Database

**The corpus is small** (< 10K documents): SQLite full-text search with BM25 will be faster to set up, cheaper to operate, and only slightly worse at retrieval. A separate vector database service is operational overhead without meaningful benefit below this scale.

**Queries require exact matches or structured filtering as the primary predicate**: If users search by product SKU, date ranges, exact usernames, or foreign key relationships, a relational database with proper indexes handles these better. Vector search as the primary filter for structured queries is the wrong tool.

**Debuggability and auditability are critical**: Vector similarity scores are not explainable. An agent retrieved chunk X with score 0.87 — why? The score tells you nothing about which tokens drove the similarity. Systems that require audit trails of why a specific piece of evidence was used need alternatives or supplements. This is precisely why some systems (like Acontext) explicitly reject vector-based retrieval in favor of structured skill files with progressive disclosure ([Source](../raw/deep/repos/memodb-io-acontext.md)).

**The information structure is inherently relational**: Codebases, organizational hierarchies, citation graphs, and knowledge ontologies have structure that embeddings collapse. GraphRAG, Neo4j, and purpose-built code search tools (Tree-sitter + AST indexing) outperform vector databases on these domains.

**Memory needs to be human-editable or auditable**: Vector embeddings are opaque. You cannot open a Qdrant collection in a text editor and correct a wrong fact. Systems where humans need to inspect, correct, or version the stored knowledge (Acontext's markdown skill files, Cognee's structured graph nodes) treat vector databases as an index layer over human-readable storage, not as the source of truth.

## Unresolved Questions

**What is the right chunk size?** No consensus exists. 256 tokens, 512 tokens, 1024 tokens, and sentence-level chunking all appear in production systems. The answer depends on the embedding model, the query patterns, and the document structure — but most documentation presents a default without justification. Hierarchical chunking (small retrieval units indexed under larger semantic parents, as in [RAPTOR](../projects/raptor.md)) partially addresses this but adds complexity.

**How do you handle stale or contradictory information?** Most vector databases have no built-in mechanism for detecting when a stored vector becomes outdated or conflicts with a newly added vector. [Mem0](../projects/mem0.md) addresses this with an LLM-based reconciliation pass that issues ADD/UPDATE/DELETE operations ([Source](../raw/deep/repos/mem0ai-mem0.md)), but this adds two LLM calls per ingestion and introduces non-determinism. There is no standard pattern.

**Cost at scale with frequent updates**: Vector index structures (HNSW especially) are expensive to update incrementally. Some implementations rebuild segments on update; others use log-structured approaches. For agent memory systems with high write rates (capturing every tool invocation, as claude-mem does ([Source](../raw/deep/repos/thedotmack-claude-mem.md))), the index maintenance cost at scale is not well-documented by any vendor.

**Recall verification in production**: How do you know your vector search is actually finding the right documents? ANN recall is measured against ground-truth nearest neighbors on static benchmarks, but in production, ground truth is unknown. Most teams deploy without ongoing recall monitoring. This gap is unaddressed by every major vector database vendor.

## Alternatives and Selection Guidance

**Use a [Knowledge Graph](../concepts/knowledge-graph.md)** when relationships between entities matter as much as the content of individual nodes. If your questions are "how does X relate to Y?" rather than "what documents discuss X?", graph traversal provides better answers. Use both when the questions are mixed — Cognee, Zep/Graphiti, and HippoRAG all do this.

**Use BM25 / full-text search** when keyword precision matters (legal documents, code search, product catalogs with specific identifiers) or when the corpus is small enough that exact search is fast.

**Use [Hybrid Search](../concepts/hybrid-search.md)** for most production RAG systems. Pure vector search underperforms on queries with proper nouns, identifiers, or exact phrases. RRF combining HNSW and BM25 is the current best practice for general-purpose retrieval.

**Use structured files + progressive disclosure** (Acontext's approach) when the memory needs to be human-readable, editable, and framework-portable, and when an LLM agent can reason about which memory files to retrieve rather than relying on similarity scores.

**Use pgvector** when you already run PostgreSQL, the collection is under ~5M vectors, and operational simplicity outweighs raw query performance.

**Use Qdrant or Weaviate** for self-hosted production systems above that scale, where filtering performance and quantization matter.

**Use Pinecone** for teams that want zero operational burden and are comfortable with a managed service dependency.

**Use [Continual RAG](../concepts/continual-rag.md)** patterns when the document corpus changes frequently and index staleness is a first-class concern.

## Related Concepts

- [Semantic Search](../concepts/semantic-search.md) — the query pattern vector databases enable
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the primary application
- [Hybrid Search](../concepts/hybrid-search.md) — combining vector with sparse retrieval
- [Semantic Memory](../concepts/semantic-memory.md) — agent memory tier that vector databases typically back
- [Episodic Memory](../concepts/episodic-memory.md) — per-session or per-interaction memory stored as vectors
- [Long-Term Memory](../concepts/long-term-memory.md) — persistent memory architectures
- [Context Management](../concepts/context-management.md) — how retrieved vectors get injected into agent context
- [Knowledge Graph](../concepts/knowledge-graph.md) — structural alternative/complement for relational information
- [BM25](../concepts/bm25.md) — sparse retrieval counterpart in hybrid search systems
