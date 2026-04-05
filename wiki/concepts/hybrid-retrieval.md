---
entity_id: hybrid-retrieval
type: approach
bucket: knowledge-bases
abstract: >-
  Hybrid retrieval combines dense vector search with sparse BM25 keyword
  matching to improve both recall (finding relevant documents) and precision
  (ranking them correctly) in RAG pipelines, outperforming either method alone
  across most query types.
sources:
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - Retrieval-Augmented Generation
  - BM25
  - BM25
last_compiled: '2026-04-05T20:34:41.780Z'
---
# Hybrid Retrieval

## What It Is

Hybrid retrieval runs two complementary search algorithms simultaneously against a document corpus, then merges their results before passing context to an LLM. The two components are:

**Dense retrieval** embeds queries and documents as high-dimensional vectors (typically 768 or 1024 dimensions), then finds candidates by cosine similarity. It captures semantic relationships: a query about "vehicle registration" can match a document discussing "car licensing" even with no shared keywords.

**Sparse retrieval (BM25)** scores documents by term frequency and inverse document frequency. BM25 excels at exact matches: model numbers, legal clause identifiers, proper nouns, and technical jargon where semantic approximation introduces error rather than value.

Neither method alone is reliable in production. Dense search misses exact terms. BM25 misses paraphrase and synonymy. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) systems that use only vector search degrade quietly when users query specific identifiers, and systems that use only BM25 degrade when users rephrase naturally.

## Why It Matters

A RAG system's output quality is bounded by its retrieval recall. If the relevant chunk is not retrieved, no amount of prompt engineering or model capability recovers it. The LLM cannot cite what it never saw.

The failure mode is silent: the model produces a fluent, confident response grounded in the wrong or incomplete context. This is harder to detect than an outright retrieval failure. Production RAG systems that worked in demos degrade precisely because demo queries tend to be clean and keyword-rich while real user queries vary widely in phrasing. [Source](../raw/articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md)

Hybrid retrieval increases the probability that the correct chunk appears in the candidate set regardless of query style.

## How It Works

### The Two Retrieval Paths

**Dense path:** The query is encoded by an embedding model (e.g., BGE-m3, text-embedding-3-small) into a vector. The index stores pre-computed document vectors. Retrieval is approximate nearest neighbor search, typically via HNSW (Hierarchical Navigable Small World) graphs.

**Sparse path:** BM25 tokenizes the query, looks up a standard inverted index, and scores documents by:

```
BM25(q, d) = Σ IDF(qi) · (f(qi, d) · (k1 + 1)) / (f(qi, d) + k1 · (1 - b + b · |d|/avgdl))
```

where `f(qi, d)` is term frequency in the document, `|d|` is document length, `avgdl` is average document length, and `k1`/`b` are tunable saturation parameters (typically 1.2 and 0.75).

Both paths return ranked candidate lists independently.

### Score Fusion

The two ranked lists must be merged before reranking. The dominant approach is **Reciprocal Rank Fusion (RRF)**:

```
RRF_score(d) = Σ 1 / (k + rank(d))
```

where `k` is a constant (typically 60) and `rank(d)` is the document's position in each ranked list. RRF is robust because it does not require normalizing scores across different scales — a BM25 score of 12.4 and a cosine similarity of 0.87 cannot be directly added, but their rank positions can be combined.

Alternative fusion strategies include linear score interpolation with a tunable alpha weight (`α · dense_score + (1-α) · sparse_score`), which requires careful calibration per corpus.

### Reranking

The merged candidate set (typically top 20–100) is passed to a cross-encoder reranker. Unlike bi-encoder embedding models that score query and document independently, cross-encoders attend over both simultaneously, producing more accurate relevance scores at higher compute cost. Common cross-encoders: `cross-encoder/ms-marco-MiniLM-L-6-v2`, Cohere Rerank, or LLM-based rerankers.

Zep's Graphiti implementation names several reranking strategies explicitly: RRF, MMR (Maximal Marginal Relevance for diversity), episode-mention frequency, graph distance from centroid, and cross-encoder LLMs. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

### Third Signal: Graph Traversal

Some architectures add a third retrieval path via graph traversal. Graphiti's pipeline runs three signals in parallel:

1. Cosine semantic similarity on facts, entity names, community names
2. BM25 full-text search via Lucene integration
3. Breadth-first traversal within n-hop neighborhoods seeded from recent episodes

The paper frames these signals cleanly: BM25 captures word similarities, cosine captures semantic similarities, and BFS captures contextual similarities (nodes closer in the graph appear in more similar conversational contexts). [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Implementation Patterns

### Elasticsearch

Elasticsearch supports hybrid retrieval natively through `semantic_text` multi-field mappings combined with full-text fields, then fusing via RRF. Document-level security lets implementations filter retrieval by user role before the semantic search runs — reducing both the candidate set size and context pollution. [Source](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md)

### Dedicated Vector Databases

Pinecone, Qdrant, and Weaviate expose sparse-dense hybrid search APIs. Qdrant supports both HNSW (dense) and sparse vectors in a single collection with native RRF. These reduce operational complexity when you do not already run Elasticsearch.

### Custom Implementation

Run dense retrieval with FAISS or ChromaDB, BM25 with rank-bm25 or Whoosh, then merge with RRF in application code. More flexible but requires maintaining two index types and the fusion logic.

## Strengths

**Query-type robustness.** A user asking "what does section 14.3.2 say?" benefits from BM25's exact match. A user asking "what are the rules around late payments?" benefits from semantic search. Hybrid retrieval handles both without query classification.

**Failure mode complementarity.** Dense search fails on rare terms and out-of-distribution vocabulary (product codes, acronyms). BM25 fails on synonymy and paraphrase. Their failure modes are largely orthogonal, so the combined system is more robust than either alone.

**Production reliability.** Silent degradation — the dominant failure mode in single-method RAG — is reduced because the second retrieval path frequently recovers documents the first missed.

## Limitations

**Latency.** Two retrieval operations run where one previously ran. With efficient indexing and parallel execution, the overhead is often under 50ms, but it is nonzero. Systems with strict sub-100ms latency budgets need to measure carefully.

**Index management.** Two indexes to build, maintain, and keep synchronized. If the document corpus updates frequently, both the vector index and the inverted index must be refreshed.

**Fusion weight calibration.** Linear interpolation requires alpha tuning per corpus. A weight optimized for a technical documentation corpus may not transfer to a customer support dataset. RRF sidesteps this but cannot express domain-specific priorities.

**Concrete failure mode:** Hybrid retrieval does not help when the relevant information was never indexed. A chunk that was dropped during parsing, or a document that was not crawled, cannot be retrieved by any method. Retrieval strategy is bounded by index completeness. The production article is direct on this: parsing failures corrupt retrieval before it even begins. [Source](../raw/articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md)

**Unspoken infrastructure assumption:** BM25 implementations assume a stable, tokenizable text corpus. Code, structured data, and multilingual content require language-specific tokenizers and index configurations that many tutorials omit. Deploying BM25 against multilingual customer data without configuring appropriate analyzers produces poor sparse recall.

## When NOT to Use It

**Simple FAQ retrieval with consistent query phrasing.** If your users query using the same vocabulary as your documents (e.g., internal tooling where users know the exact terminology), BM25 alone is sufficient and simpler to operate.

**Latency-critical paths under 50ms end-to-end.** The dual retrieval plus fusion adds wall-clock time. Measure before committing.

**Very small corpora (under ~500 documents).** With a small enough corpus, full embedding comparison is fast, BM25 advantages diminish, and the operational overhead of maintaining two indexes is not justified.

**Streaming or real-time ingestion without incremental index support.** If documents arrive continuously and your infrastructure cannot update both the vector and inverted indexes atomically, query-time consistency becomes a problem.

## Unresolved Questions

**Optimal fusion strategy per domain.** RRF is the default because it requires no calibration, but whether it outperforms tuned linear interpolation on specific domains is not well-established in public benchmarks. Most published results show relative comparisons within a single system rather than cross-method comparisons.

**Cross-encoder cost at scale.** Reranking 50 candidates per query with a cross-encoder costs roughly 50 inference calls. At high query volume, this becomes expensive or introduces latency. Production deployments often cache reranker scores for repeated queries, but cache hit rates depend heavily on query distribution.

**Embedding model selection impact.** Most hybrid retrieval guidance treats the embedding model as a given. The relative improvement of hybrid over dense-only varies with embedding model quality: a stronger dense model may reduce the marginal value of the sparse component.

## Alternatives

**Dense-only retrieval:** Use when queries are consistently natural language, corpus vocabulary is consistent, and operational simplicity is valued. Tooling: ChromaDB, Pinecone, Qdrant, pgvector.

**Sparse-only (BM25):** Use when queries are keyword-rich and exact match matters, corpus is technical or structured (legal, code, medical records), and embedding compute cost is a constraint.

**GraphRAG / Knowledge Graph Retrieval:** Use when the corpus contains highly relational data and queries require multi-hop reasoning (e.g., "who reported to whom during the merger?"). Adds significant infrastructure complexity. See [Graphiti](../projects/getzep-graphiti.md) for a temporal knowledge graph implementation that combines hybrid retrieval with graph traversal.

**ColBERT / late interaction models:** An emerging alternative that computes token-level interactions between query and document. Achieves dense model quality with better exact-match handling than standard bi-encoders, without running a separate BM25 index. Requires specialized infrastructure (Stanford's PLAID index).

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [BM25](../concepts/bm25.md)
