---
entity_id: vector-database
type: concept
bucket: knowledge-bases
sources:
  - repos/natebjones-projects-ob1.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/caviraoss-openmemory.md
  - repos/topoteretes-cognee.md
  - repos/volcengine-openviking.md
  - repos/yusufkaraaslan-skill-seekers.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - repos/orchestra-research-ai-research-skills.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:27:55.748Z'
---
# Vector Database

## What It Is

A vector database stores numerical representations of data as high-dimensional vectors and retrieves them by geometric proximity rather than exact match. Feed it a query vector, get back the nearest neighbors. That's the core operation everything else builds on.

The term gets stretched to cover three distinct things: purpose-built vector databases (Pinecone, Weaviate, Qdrant, Milvus), general databases with vector extensions (pgvector, Redis, Elasticsearch), and in-memory libraries that aren't databases at all (FAISS, Annoy). They share the same retrieval primitive but differ substantially in operational characteristics.

The concept matters because LLMs encode meaning as geometry. Words, sentences, images, and code that mean similar things cluster together in embedding space. Vector retrieval lets you find semantically related content without knowing the exact words, which is why it became the backbone of Retrieval-Augmented Generation.

## How Embeddings Become Retrievable

### From Text to Vector

Before any retrieval happens, content must be embedded. An embedding model (text-embedding-3-large, all-MiniLM-L6-v2, BGE-M3, etc.) maps text to a fixed-length float array, typically 768 to 3072 dimensions. The geometric distance between two vectors approximates semantic distance between the original content.

Cosine similarity is the standard distance metric for text embeddings:

```
similarity = (A · B) / (||A|| × ||B||)
```

Ranges from -1 to 1, where 1 means identical direction. L2 (Euclidean) distance works for normalized vectors but behaves differently for unnormalized ones. The choice of metric must match how the embedding model was trained.

### Approximate Nearest Neighbor Search

Exact nearest neighbor search over millions of vectors requires comparing the query against every stored vector. At 1M vectors with 1536 dimensions, that's ~6GB of float comparisons per query. Too slow.

ANN algorithms trade a small accuracy loss for orders-of-magnitude speed improvement. The main families:

**HNSW (Hierarchical Navigable Small World)** builds a multi-layer graph where each node connects to nearby nodes. Search starts at the top layer (coarse, few nodes), finds approximate nearest neighbors, then descends to lower layers for refinement. Think of it as a highway system: enter at the highway level, navigate to the right neighborhood, then take local roads to the exact address. HNSW dominates production deployments because it offers strong recall with low latency and supports incremental inserts. Parameters `M` (connections per node) and `ef_construction` (search width during build) control the accuracy/speed/memory tradeoff.

**IVF (Inverted File Index)** clusters vectors using k-means, then at query time searches only the nearest clusters. IVF-PQ adds Product Quantization to compress vectors, fitting 10-100x more vectors in memory. Better for very large corpora where memory is the constraint.

**LSH (Locality Sensitive Hashing)** uses hash functions that map similar vectors to the same bucket. Simpler and faster to build than HNSW but lower recall. Mostly displaced by HNSW in production.

Most production systems use HNSW or IVF-PQ depending on dataset size and latency requirements. FAISS, the foundational library from Meta, implements all of these and underpins many higher-level databases.

### Metadata Filtering

Pure vector search returns the k geometrically nearest vectors regardless of any other properties. In practice you almost always want to filter: find the most similar support tickets from the last 30 days, or find code examples in Python, or find documents belonging to this user.

The implementation approach matters a lot:

**Pre-filtering**: Apply metadata filter first, then run ANN search on the subset. Accurate but slow if the filter is loose, since you're rebuilding the search space dynamically.

**Post-filtering**: Run ANN search, then discard results that fail the filter. Fast but can return fewer than k results if the filter is selective, requiring you to over-fetch.

**In-graph filtering**: Databases like Qdrant implement payload indexes that integrate metadata into the HNSW traversal, skipping non-matching nodes during graph search. Better precision than post-filtering, faster than pre-filtering for selective conditions.

This is an active area of engineering. No solution is universally optimal.

## The Embedding Model Layer

The vector database is only as good as the embeddings going into it. Two failure modes:

**Distribution mismatch**: The embedding model was trained on general text but you're storing specialized domain content (legal, medical, code). Semantic structure may not transfer. Fine-tuned or domain-specific models (code-specific embeddings, multilingual models like BGE-M3) often outperform general models on specialized corpora.

**Embedding drift**: You change the embedding model mid-deployment. Old and new embeddings live in incompatible spaces. Similarity scores between old and new vectors are meaningless. Re-embedding the entire corpus is expensive; many teams don't do it and get subtle, hard-to-diagnose retrieval degradation.

## Chunking: The Upstream Problem

Before embedding, documents must be split into chunks. Chunk size and strategy determine retrieval quality more than the choice of vector database. Common approaches:

- Fixed-size windows (e.g., 512 tokens with 50-token overlap)
- Sentence or paragraph boundaries
- Semantic chunking (split where topic shifts, using embeddings to detect shifts)
- Hierarchical chunking (store both sentence-level and document-level embeddings, retrieve at different granularities)

Too small: chunks lack enough context for the embedding to capture meaning. Too large: chunks mix multiple topics, the embedding represents an average of all of them, retrieval is imprecise.

The [Hipocampus](../projects/hipocampus.md) benchmark illustrates a concrete consequence: BM25 + vector search scores 3.4% on cross-domain implicit recall because chunked storage loses the relational structure between decisions made weeks apart. The embedding of a discussion about API rate limiting doesn't inherently connect to a later discussion about payment flows.

## Hybrid Search

Dense vector search misses exact keyword matches. If someone searches for a product SKU, model number, or proper noun, nearest-neighbor in embedding space may not retrieve the right document. BM25 (sparse keyword search) handles exact matches well but misses semantic variants.

Hybrid search runs both, then combines scores. The standard combination is Reciprocal Rank Fusion (RRF):

```
RRF_score = Σ 1/(k + rank_i)
```

where k is typically 60 and rank_i is each document's rank in each retrieval system. Results from both systems get re-ranked by their combined RRF score.

Most production RAG systems use hybrid search. The Hipocampus benchmark shows vector alone at 17.3% recall vs hybrid (BM25 + vector) at 11.4% for that particular benchmark, though results vary heavily by task. Generally, hybrid search is safer than either alone.

## Limitations in Practice

**The unknown unknowns problem**: Vector search requires a query. If the agent doesn't know to search for something, it won't find it. This is the core problem Hipocampus addresses with its ROOT.md topic index, which makes implicit context discoverable without issuing a search. Vector retrieval is a precision instrument for known unknowns.

**Embedding bottleneck at scale**: Re-embedding a 10M document corpus when switching models is a multi-day operation costing real money. Teams underestimate this when choosing embedding models early.

**Recall vs. precision tradeoff**: Increasing `top_k` improves recall but stuffs more (possibly irrelevant) context into the LLM prompt, degrading generation quality and increasing cost. There's no universal right value.

**Scalar metadata storage costs**: Vector databases store vectors efficiently but often store metadata as JSON blobs without compression. At scale, metadata storage can exceed vector storage costs.

## When NOT to Use a Vector Database

**You have fewer than ~100K documents**: SQLite with full-text search or postgres with trigram indexes will outperform a vector database on total system complexity. The operational overhead of a vector database isn't justified.

**Your queries are primarily structured lookups**: Filtering by user ID, date range, or category is a relational database problem. Adding vector search to a relational workload often means you need a hybrid system (pgvector is reasonable here), but starting with a pure vector database means bolting on a relational database later.

**You need sub-10ms P99 latency at high QPS**: HNSW is fast, but at high concurrency and large index sizes, latency climbs. In-memory FAISS indexes can hit <1ms but don't scale beyond RAM. Managed services add network overhead. Benchmark your specific workload; don't assume.

**Your embedding model will change frequently**: Teams doing active model experimentation accumulate technical debt as old embeddings and new embeddings coexist. Wait until the embedding model stabilizes before committing to a production vector database deployment.

## Architectural Patterns

**Graph-augmented retrieval**: Projects like [Cognee](../projects/cognee.md) combine vector search with graph databases. After retrieving semantically similar chunks, graph traversal follows explicit relationships (entity X is part of Y, decision Z depends on constraint W). This addresses the connectivity problem pure vector search can't solve: related information that shares no vocabulary.

**Tiered loading**: OpenViking's L0/L1/L2 approach stores abstracts, overviews, and full content at different levels, loading only as deep as needed. The vector index operates over L0 summaries for initial retrieval, with L2 detail fetched on demand. This cuts token consumption dramatically compared to embedding and retrieving raw chunks.

**Compaction trees**: Hipocampus uses a hierarchical summary tree (daily → weekly → monthly → root) where the root acts as an O(1) topic index loaded into every session. Vector search operates over the lower levels when specific content is needed.

## Unresolved Questions

**Embedding model standardization**: There's no standard for what a 1536-dimensional embedding means. Two models producing 1536-dimensional vectors live in incompatible spaces. The field hasn't converged on benchmarks that predict production retrieval quality from model evaluation scores.

**Recall measurement in production**: Standard retrieval benchmarks (BEIR, MTEB) measure recall on known QA pairs. Production retrieval failure is often invisible: the system returns something plausible, the LLM uses it, the answer is wrong, and no one traces it back to a retrieval miss.

**Cost at scale**: Managed vector database pricing is opaque. Pinecone, Weaviate Cloud, and similar services have published pricing, but costs under real write/read patterns are hard to estimate without running the actual workload.

## Alternatives and Selection Guidance

- **pgvector**: Use when you already run PostgreSQL and your vector dataset fits comfortably in Postgres storage. Simpler operations, worse performance at 10M+ vectors.
- **FAISS**: Use for offline batch processing or when you need maximum performance and will manage persistence yourself.
- **Qdrant**: Use when you need strong in-graph metadata filtering and prefer a self-hostable Rust-based system.
- **Weaviate**: Use when you want a full RAG stack (hybrid search, BM25, modules for auto-embedding) with managed hosting.
- **Milvus**: Use at very large scale (hundreds of millions of vectors) with complex ANN index requirements.

Related: Retrieval-Augmented Generation


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.6)
