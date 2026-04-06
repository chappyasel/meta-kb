---
entity_id: vector-database
type: concept
bucket: knowledge-bases
abstract: >-
  A database system storing and querying high-dimensional vectors via
  approximate nearest neighbor search, enabling semantic similarity retrieval
  for RAG pipelines and agent memory — differentiated from traditional databases
  by indexing geometry rather than exact values.
sources:
  - repos/natebjones-projects-ob1.md
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
related:
  - rag
  - mcp
  - claude-code
last_compiled: '2026-04-06T02:07:58.983Z'
---
# Vector Database

## What It Is

A vector database stores numeric arrays (embeddings) of hundreds to thousands of dimensions and retrieves records by geometric proximity rather than exact match. Ask for the 10 most similar vectors to a query vector, and the database returns them ranked by cosine similarity, dot product, or Euclidean distance. The embeddings themselves come from models like OpenAI's `text-embedding-3-small` or local alternatives via Ollama — the database stores and indexes what the embedding model produces.

This matters because meaning lives in geometry. Two sentences with zero words in common can sit close together in embedding space if they describe the same idea. A traditional SQL `WHERE content LIKE '%refund%'` misses "I want my money back." A vector search finds it.

## Why It Matters for LLM Systems

LLMs have no persistent memory. Every session starts blank. Vector databases are the primary mechanism for giving agents and RAG pipelines access to knowledge that exceeds the context window or persists across sessions.

The core pattern in [Retrieval-Augmented Generation](../concepts/rag.md): embed a corpus of documents at index time, embed a user query at runtime, retrieve the top-K closest document chunks, inject them into the prompt. The model answers with grounding it couldn't have from training alone.

[Agent Memory](../concepts/agent-memory.md) systems build on this further. Projects like [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), and [Letta](../projects/letta.md) use vector databases as the retrieval layer for [Semantic Memory](../concepts/semantic-memory.md) and [Episodic Memory](../concepts/episodic-memory.md) — storing facts, preferences, and past interactions that agents need across conversations.

## How It Works

### Indexing

When a document arrives, the pipeline calls an embedding model and stores the resulting float array alongside the original content and metadata. A naive implementation would compare every query vector against every stored vector — which works at thousands of records but breaks at millions. Production systems use Approximate Nearest Neighbor (ANN) algorithms:

**HNSW (Hierarchical Navigable Small World):** Builds a multi-layer graph where each node connects to its neighbors at progressively coarser resolutions. At query time, the search starts at the top layer, greedy-descends toward the query region, then refines at lower layers. [Qdrant](../projects/qdrant.md) implements HNSW in Rust with configurable `m` (connections per node) and `ef_construction` (search width during build) parameters. Higher values improve recall at the cost of memory and build time.

**IVF (Inverted File Index):** Clusters vectors using k-means, then at query time searches only nearby clusters. Faster to build than HNSW, but recall drops if the query's nearest neighbors span multiple clusters.

**Product Quantization (PQ):** Compresses vectors by splitting them into subvectors and replacing each with a centroid ID. Dramatically reduces memory — a 1536-dim float32 vector drops from 6KB to ~128 bytes — at the cost of some accuracy.

### Querying

A query vector arrives. The index narrows candidate space using ANN, scores candidates by similarity metric, and returns top-K results with their associated payloads (original text, metadata, timestamps). This typically runs in single-digit milliseconds for collections up to tens of millions of vectors.

The similarity metric choice matters:

- **Cosine similarity:** Measures angle between vectors, ignoring magnitude. Standard for text embeddings.
- **Dot product:** Equivalent to cosine when vectors are normalized. Faster to compute.
- **Euclidean (L2):** Measures absolute distance. Used for image embeddings and spatial data.

### Metadata Filtering

Pure vector similarity is insufficient for most agent systems. You also need to filter by user ID, timestamp range, document type, or access level. Most vector databases support pre-filtering or post-filtering on structured metadata fields stored alongside vectors.

The Elasticsearch article in the sources demonstrates this with document-level security: an agent querying as user "Peter" automatically receives only memories tagged `memory_type: outie`, because Elasticsearch's role-based filters apply before vector scoring. [Qdrant](../projects/qdrant.md) handles this via payload filters in the query request. [ChromaDB](../projects/chromadb.md) supports `where` clause filtering on metadata.

## The Hybrid Retrieval Gap

Vector search alone fails on queries requiring exact matches. Searching for an invoice number, a specific function name, or a technical identifier produces poor results because these strings have no meaningful semantic neighborhood — similar-sounding strings aren't semantically related.

Production RAG systems combine dense retrieval (vector search) with sparse retrieval ([BM25](../concepts/bm25.md) keyword matching) and merge results using Reciprocal Rank Fusion or learned rankers. This is [Hybrid Retrieval](../concepts/hybrid-retrieval.md). Elasticsearch and Qdrant both support hybrid natively. Systems using [ChromaDB](../projects/chromadb.md) or [Pinecone](../projects/pinecone.md) alone typically miss this.

The claude-mem project (44,950 stars) implements exactly this: SQLite with FTS5 full-text search combined with ChromaDB for semantic search, merged through its three-layer MCP workflow (`search` → `timeline` → `get_observations`).

## Major Implementations

**[Qdrant](../projects/qdrant.md):** Rust-native, self-hostable, strong filtering, supports named vectors per document (useful for storing multiple embedding types per record). Active development, good performance benchmarks.

**[ChromaDB](../projects/chromadb.md):** Python-first, embedded or server mode, minimal setup. Common in prototypes and local agent systems. Used in claude-mem for its lightweight footprint.

**[Pinecone](../projects/pinecone.md):** Fully managed cloud service. Handles scaling automatically. No self-hosting option. Introduces vendor lock-in and per-query costs at scale.

**pgvector:** PostgreSQL extension adding vector column types and HNSW/IVF indexes. Lets teams add vector search to an existing Postgres database without running a separate service. Open Brain (OB1) uses Supabase (Postgres + pgvector) as its foundation — one database handles both relational data and vector search.

**Elasticsearch:** Full-featured search engine with vector support added via the `dense_vector` field type and HNSW indexing. Strongest option when you need hybrid retrieval, complex metadata filters, and document-level security in one system. Higher operational complexity.

**Weaviate, Milvus, LanceDB:** Each targets different tradeoffs between managed/self-hosted, write throughput, and multimodal support.

## Strengths

**Semantic recall at scale.** Once documents are indexed, retrieving semantically relevant chunks takes milliseconds regardless of collection size (at ANN accuracy levels).

**Decouples storage from inference.** Embed once, query many times with different models or prompts. The Open Brain architecture stores memories once and lets any AI tool query them via MCP — Claude, Cursor, ChatGPT share the same vector backend.

**Metadata-aware filtering.** Modern vector databases support filtering on structured fields before or after vector scoring, enabling user-scoped, time-bounded, and type-restricted retrieval critical for multi-user agent systems.

**Composable with other memory types.** [Graphiti](../projects/graphiti.md) and [HippoRAG](../projects/hipporag.md) layer knowledge graph structures on top of vector retrieval. [RAPTOR](../projects/raptor.md) uses vector databases to retrieve hierarchically summarized document trees.

## Critical Limitations

**Concrete failure mode — the exact match problem:** A developer asks an agent "what does function `calculate_adjusted_basis` do?" The vector search returns chunks about tax basis calculation in general, missing the specific function definition because similar-sounding code elsewhere scores higher than exact string matches. This failure is silent — the agent confidently answers from wrong context. BM25 or code-aware indexing would have caught it. Teams that ship vector-only systems discover this in production when users report confident wrong answers, not retrieval errors.

**Unspoken infrastructure assumption:** Embedding models must remain consistent. If you index 2 million documents with `text-embedding-ada-002` and later switch to `text-embedding-3-large` for new documents, your index is now split across incompatible embedding spaces. Queries return inconsistent results because the geometric relationships don't hold across models. Re-embedding the entire corpus is expensive and creates a downtime window or dual-index complexity. Most documentation glosses over embedding model lifecycle management.

## When NOT to Use a Vector Database

**Exact lookup requirements.** If users query by ID, exact phrase, or structured filter, a relational database with proper indexes is faster and more reliable.

**Relationship-heavy data.** When the answer requires traversing connections between entities ("who worked with Alice on projects that touched module X?"), a [Knowledge Graph](../concepts/knowledge-graph.md) outperforms vector similarity. [GraphRAG](../projects/graphrag.md) specifically addresses the multi-hop reasoning gap.

**Tiny corpora.** Under ~1,000 documents, full-text search with BM25 is simpler, faster, and requires no embedding infrastructure. Vector databases add operational overhead without meaningful benefit at this scale.

**Strict latency SLAs under load.** ANN search time grows with collection size and concurrent queries. At very high QPS with millions of vectors, managing HNSW index memory and search parallelism requires non-trivial tuning. Managed services like Pinecone abstract this at cost; self-hosted requires engineering investment.

**Highly structured tabular data.** Finance, inventory, and scheduling data with precise numeric and categorical attributes belongs in SQL. Embedding structured rows loses the precision that makes the data useful.

## Unresolved Questions

**Chunking strategy is underdetermined.** Every RAG guide recommends "chunk by meaning, not length," but there's no standard method for doing this. Fixed-size with overlap, sentence boundaries, semantic clustering, document section hierarchy — each choice affects retrieval quality substantially and interacts with the embedding model in ways that require empirical testing per domain.

**Retrieval quality measurement is absent in most deployments.** Teams typically measure end-to-end answer quality but not retrieval precision/recall separately. Silent retrieval failures (returning wrong context confidently) go undetected until user complaints accumulate.

**Cost at scale is underspecified.** Embedding 10 million documents with OpenAI's API costs real money. Re-embedding after a model change multiplies that cost. Self-hosted embedding models (via Ollama) eliminate per-token charges but introduce GPU infrastructure requirements. Most vendor documentation avoids explicit cost projections at realistic production scales.

**Stale index management lacks standard patterns.** When source documents change, how do you update embeddings? Delete-and-reinsert works for single documents but gets complex when chunking produces multiple records per source. No established pattern exists for incremental index updates with consistency guarantees.

## Alternatives and Selection Guidance

| Use Case | Better Choice |
|----------|--------------|
| Multi-hop reasoning over connected entities | [Knowledge Graph](../concepts/knowledge-graph.md) + [GraphRAG](../projects/graphrag.md) |
| Exact keyword and phrase matching | [BM25](../concepts/bm25.md) full-text search |
| Combined semantic + keyword | [Hybrid Retrieval](../concepts/hybrid-retrieval.md) with vector + BM25 |
| Agent long-term memory with relationships | [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md) |
| Small corpus, simple setup | SQLite FTS5 or Elasticsearch without vector |
| Existing Postgres infrastructure | pgvector extension |
| Managed, zero-ops | [Pinecone](../projects/pinecone.md) |
| Self-hosted, high performance | [Qdrant](../projects/qdrant.md) |
| Local dev, Python-first | [ChromaDB](../projects/chromadb.md) |

## Connections

Vector databases are the retrieval substrate for [Retrieval-Augmented Generation](../concepts/rag.md), [Agentic RAG](../concepts/agentic-rag.md), and most implementations of [Agent Memory](../concepts/agent-memory.md). [Context Engineering](../concepts/context-engineering.md) decisions about what to retrieve and inject build on top of what vector search makes available. [Memory Consolidation](../concepts/memory-consolidation.md) systems write compressed memories back into vector stores for future retrieval. [Progressive Disclosure](../concepts/progressive-disclosure.md) patterns, as implemented in claude-mem, use vector databases as the first layer of a tiered retrieval strategy that fetches full content only for filtered results.
