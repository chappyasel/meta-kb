---
entity_id: raptor
type: project
bucket: knowledge-bases
abstract: >-
  RAPTOR recursively clusters and summarizes document chunks into a multi-level
  tree, then indexes all levels for retrieval — letting RAG systems answer both
  detail and summary questions from the same corpus.
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - GraphRAG
  - Community Detection
last_compiled: '2026-04-05T20:34:30.924Z'
---
# RAPTOR

## What It Does

RAPTOR (Recursive Abstractive Processing for Tree-Organized Retrieval) addresses a core RAG limitation: standard chunk-based retrieval finds specific facts but cannot synthesize information spread across many documents. RAPTOR builds a hierarchical representation by clustering semantically related chunks, summarizing each cluster with an LLM, then repeating that process on the summaries themselves — producing a tree from leaves (original chunks) to a root (a high-level corpus summary). All nodes in the tree get indexed, so retrieval can find either specific passages or broad thematic summaries depending on the query.

The 2024 paper introduced the technique. [RAGFlow](../projects/ragflow.md) provides the most detailed open-source production implementation in `rag/raptor.py`.

## Core Mechanism

RAGFlow names its class `RecursiveAbstractiveProcessing4TreeOrganizedRetrieval`. The algorithm runs in five steps:

1. **Embed** — all document chunks are embedded using the configured embedding model (provider-agnostic via `LLMBundle`)
2. **Reduce** — UMAP reduces high-dimensional embeddings to a lower-dimensional space suitable for clustering
3. **Cluster** — Gaussian Mixture Models (GMM) identify natural groupings; optimal cluster count is selected via Bayesian Information Criterion (BIC)
4. **Summarize** — an LLM generates a summary for each cluster's combined text; the implementation includes LLM response caching (`get_llm_cache`/`set_llm_cache`), embedding caching, async execution with semaphores (`chat_limiter`), and retry logic (3 attempts with backoff)
5. **Recurse** — steps 2–4 repeat on the generated summaries until a single root summary or a depth limit is reached

RAGFlow flattens the resulting tree before indexing. Every node — original chunks and all generated summaries — goes into the same Elasticsearch/Infinity/OpenSearch index with full-text (BM25) and vector (dense) indices. This integrates naturally with the multi-recall pipeline (dense + sparse + RAPTOR + [GraphRAG](../concepts/graphrag.md)) rather than requiring a separate traversal-based retrieval path.

RAPTOR is disabled by default in RAGFlow because it consumes significant LLM token budget during ingestion. The implementation checks task cancellation signals throughout the recursive loop so long-running ingestion jobs can be interrupted cleanly.

[Source](../raw/deep/repos/infiniflow-ragflow.md)

## Key Numbers

- **Stars (RAGFlow, which implements RAPTOR)**: claimed large GitHub presence; the underlying RAPTOR paper was published in 2024 at a major ML venue
- **GMM cluster selection**: BIC-based automatic cluster count avoids the need to prespecify `k`
- **Indexing overhead**: O(N log N) in chunk count due to the recursive halving of nodes at each level; exact multiplier depends on LLM call latency
- **Default status**: off — the token cost during ingestion is the primary deterrent

Numbers on retrieval quality improvement from RAPTOR are self-reported in the original paper; independent replication results vary by domain and chunk quality. [HippoRAG](../projects/hipporag.md) benchmarks show GraphRAG-style approaches outperforming RAPTOR on multi-hop retrieval tasks, though HippoRAG's comparisons are also self-reported. [Source](../raw/repos/osu-nlp-group-hipporag.md)

## Strengths

**Summary-level retrieval** — standard chunk retrieval cannot answer "what is the main theme of these 200 documents?" RAPTOR's upper-tree nodes capture corpus-level abstractions that dense retrieval over raw chunks cannot reach.

**Flat-index compatibility** — by flattening the tree, RAGFlow avoids the need for traversal-time logic. The same retrieval pipeline handles chunk-level and summary-level queries without special casing.

**Complementary to other retrieval methods** — RAPTOR summaries and GraphRAG entity nodes and dense chunk embeddings can all coexist in the same index. Multi-recall fusion benefits from the different granularities.

**Automatic depth control** — the BIC criterion and recursion termination prevent the tree from growing arbitrarily deep on small corpora.

## Critical Limitations

**Clustering instability** — GMM with UMAP is sensitive to embedding quality and hyperparameters. Small shifts in the embedding model or dimensionality reduction settings can produce substantially different cluster assignments and therefore different summaries. There is no deterministic guarantee on what the tree looks like after a model upgrade or re-ingestion.

**LLM extraction reliability propagates upward** — summaries generated at level 1 become the input to level 2 clustering and summarization. Hallucinations or omissions in early summaries compound as they move toward the root. The retry logic catches API failures but not semantically incorrect summaries.

**Unspoken infrastructure assumption** — RAPTOR assumes the LLM used for summarization during ingestion will remain consistent with the LLM used at query time. If you build the tree with GPT-4o and later swap to a smaller model, the abstraction level of stored summaries may not match what the retrieval system expects, degrading summary-level results without any obvious error signal.

## When NOT to Use It

Skip RAPTOR when:

- **Token cost is constrained** — every cluster at every recursive level requires an LLM call. On a 10,000-chunk corpus with clusters of 10, expect roughly 1,000 summarization calls at level 1 alone, plus additional passes up the tree.
- **The corpus is flat and factual** — for corpora where every question has a specific retrievable answer (customer support FAQs, legal clauses, API documentation), the summary layer adds cost without improving recall. Template-based chunking and BM25 handle these well.
- **Documents change frequently** — RAPTOR's tree is built offline. Adding new documents does not automatically re-cluster or re-summarize higher tree levels. Frequent document updates require re-running the full pipeline.
- **Query latency matters more than recall breadth** — retrieving from a flat index is faster. The RAPTOR overhead lives at ingestion, not query time, but the storage overhead (all tree levels indexed) adds to index size and can slow dense search.

Use RAPTOR when queries require synthesizing themes across many documents — analyst-style questions, survey generation, or question-answering over large unstructured corpora where no single chunk contains a complete answer.

## Unresolved Questions

**Re-indexing semantics** — the documentation does not specify what happens to the existing tree when new documents are added to a knowledge base. Does the system re-run RAPTOR from scratch, append new summaries without re-clustering, or leave higher-level nodes stale? This matters for production systems with ongoing document ingestion.

**Cluster count sensitivity** — BIC selects cluster count automatically, but there is no published analysis of how RAPTOR's retrieval quality varies with corpus size or topic diversity. Practitioners have no guidance on whether a 500-chunk corpus needs the same settings as a 50,000-chunk one.

**Summary quality evaluation** — neither the original paper nor RAGFlow's implementation exposes metrics on summary quality during ingestion. There is no feedback loop from retrieval performance back to summarization parameters.

**Cost at scale** — RAGFlow documents the token overhead as "significant" and disables RAPTOR by default, but gives no concrete estimates. A team sizing their LLM API budget for a large document corpus cannot estimate RAPTOR ingestion cost from the available documentation.

[Source](../raw/deep/repos/infiniflow-ragflow.md)

## Relationship to Related Approaches

**GraphRAG** builds an explicit entity-relationship graph from documents and uses community detection ([Leiden algorithm](../concepts/community-detection.md)) to generate cluster summaries. RAPTOR clusters by embedding similarity without extracting entities. GraphRAG is better for multi-hop reasoning over named entities; RAPTOR is better for thematic summarization when entities are not the primary retrieval target. RAGFlow runs both in parallel. See [GraphRAG](../concepts/graphrag.md).

**HippoRAG 2** uses personalized PageRank over a knowledge graph to enable associative multi-hop retrieval. Its benchmarks on MuSiQue, 2WikiMultiHop, and HotpotQA show consistent improvement over RAPTOR on multi-hop tasks. HippoRAG also claims lower indexing cost than RAPTOR, though this is self-reported. [Source](../raw/repos/osu-nlp-group-hipporag.md)

**TreeRAG** (RAGFlow's 2025 extension) builds a strict hierarchical document outline (Chapter > Section > Subsection > Paragraph) during ingestion, then searches at the finest granularity and retrieves at a coarser level. This decoupling of search and retrieve granularities solves the same chunk-size dilemma as RAPTOR but through document structure rather than embedding clustering — more deterministic, less dependent on LLM summarization quality.

**Naive chunking with overlap** — for simple factual retrieval, a January 2026 analysis found chunk overlap provided no measurable recall benefit with SPLADE retrieval. RAPTOR's value proposition is in query types that naive chunking cannot serve, not as a general replacement.

## Alternatives

| Approach | Use when |
|---|---|
| GraphRAG | Multi-hop reasoning over named entities and relationships matters; you can pay higher ingestion cost for richer graph structure |
| HippoRAG 2 | You want associative retrieval with lower indexing cost than RAPTOR; multi-hop benchmarks are the priority |
| TreeRAG / hierarchical chunking | Document structure is well-defined (books, papers, manuals); you want deterministic hierarchy without LLM summarization at ingestion |
| Dense + BM25 hybrid only | Queries are factual and specific; corpus updates frequently; token budget is tight |

[Source](../raw/deep/repos/infiniflow-ragflow.md) [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)


## Related

- [GraphRAG](../concepts/graphrag.md) — alternative_to (0.6)
- [Community Detection](../concepts/community-detection.md) — implements (0.5)
