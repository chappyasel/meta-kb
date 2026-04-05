---
entity_id: hybrid-retrieval
type: approach
bucket: knowledge-bases
sources:
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/michaelliv-napkin.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
related:
  - Retrieval-Augmented Generation
  - GraphRAG
  - Knowledge Graphs
  - Vector Database
  - Temporal Reasoning
  - LongMemEval
last_compiled: '2026-04-04T21:18:35.025Z'
---
# Hybrid Retrieval

## What It Is

Hybrid retrieval combines two complementary search paradigms to find relevant documents in a knowledge base:

- **Dense (vector) search**: Embeds queries and documents into high-dimensional space; finds semantically similar content even when exact terms differ. Good at understanding intent and paraphrase.
- **Sparse (keyword) search**: Uses algorithms like BM25 to score documents by term frequency and inverse document frequency. Good at exact matches, rare terms, and proper nouns.

The combination is typically implemented by running both searches in parallel, then merging results via rank fusion (most commonly Reciprocal Rank Fusion, or RRF) or score normalization before passing the top-k results to a generator.

## Why It Matters

Neither approach dominates alone:

| Scenario | Dense Wins | Sparse Wins |
|---|---|---|
| Paraphrase | "car" → "automobile" | — |
| Exact term | — | API error code "ERR_4291" |
| Rare proper noun | — | "Graphiti", "BM25" |
| Semantic intent | "how do I reset?" → password flows | — |

In RAG systems, retrieval is the primary failure mode—if relevant context isn't retrieved, the generator can't compensate. Hybrid retrieval improves **recall** (finding more of the right documents) and **precision** (ranking them higher), which directly improves answer quality.

## How It Works

**Step 1 – Parallel retrieval**  
The query runs simultaneously against a vector index (e.g., FAISS, pgvector, Weaviate) and a sparse index (e.g., Elasticsearch BM25, Lucene).

**Step 2 – Score fusion**  
Results are merged. Reciprocal Rank Fusion is the standard: each document gets score `1 / (k + rank)` from each list, scores are summed, and the combined list is re-ranked. The constant `k` (often 60) controls how much top-rank dominance matters.

**Step 3 – Reranking (optional)**  
A cross-encoder reranker (e.g., Cohere Rerank, BGE-Reranker) can rescore the fused top-N before final selection.

## Who Implements It

Most production-grade vector databases now support hybrid retrieval natively or via integrations:

- **Weaviate**: Built-in BM25 + vector hybrid with configurable alpha weighting
- **Elasticsearch / OpenSearch**: `knn` + `match` query fusion
- **Qdrant**: Sparse + dense vector support
- **pgvector + pg_trgm**: Manual hybrid in Postgres

At the agent memory level, projects implement hybrid differently:

- **[Graphiti](../projects/graphiti.md)** uses hybrid retrieval over its temporal knowledge graph—combining semantic embeddings with BM25 on entity names/summaries, then applying recency and relevance weighting. This matters because graph nodes representing outdated facts need to be deprioritized even if semantically similar to a query. [Source](../../raw/repos/getzep-graphiti.md)
- **Hipocampus** explicitly labels its search as hybrid, combining vector search with keyword matching across its 3-tier memory structure. [Source](../../raw/repos/kevin-hs-sohn-hipocampus.md)
- **Napkin** is a deliberate counterpoint: it argues BM25 alone on structured markdown can match or exceed full hybrid RAG stacks, reducing infrastructure to zero. [Source](../../raw/repos/michaelliv-napkin.md)

## Practical Implications

**Tuning the alpha**: Most implementations expose a weight parameter controlling the dense/sparse balance. Dense-heavy (α → 1) suits open-domain semantic questions; sparse-heavy (α → 0) suits technical documentation with specific identifiers.

**Chunking matters**: Hybrid retrieval doesn't fix poor chunking. A document split mid-sentence will score poorly regardless of retrieval method.

**Latency cost**: Running two indices in parallel adds overhead. With a reranker, latency compounds. This is a real operational consideration for low-latency applications.

**Evaluation is non-trivial**: Benchmarks like [LongMemEval](../projects/longmemeval.md) expose retrieval failures across long conversation histories. Hybrid retrieval generally outperforms either method alone on these benchmarks, but gains vary significantly by domain and query type.

## Strengths

- Meaningfully improves recall over either method alone
- Handles diverse query types without per-query routing logic
- Relatively straightforward to implement on top of existing infrastructure
- Well-supported by major vector database vendors

## Limitations

- Adds infrastructure complexity: two indices to maintain, keep in sync, and tune
- Fusion hyperparameters (k, alpha) require domain-specific tuning
- Does not solve fundamental RAG failure modes: bad chunking, context window limits, hallucination from the generator
- Reranking adds latency that may be unacceptable in real-time applications
- Sparse indices over multilingual or code content need language-specific tokenization

## Alternatives

- **Pure BM25**: Lower infrastructure cost; competitive on structured technical content (napkin makes this argument)
- **Reranking only**: Use a cross-encoder over dense-only retrieval to improve precision without a second index
- **GraphRAG**: Retrieves over knowledge graph structure rather than document chunks—handles multi-hop reasoning that both dense and sparse struggle with. See [GraphRAG](graphrag.md)

## Related

- Retrieval-Augmented Generation
- Vector Database
- [Knowledge Graphs](../concepts/knowledge-graphs.md)
- [Temporal Reasoning](../concepts/temporal-reasoning.md)
