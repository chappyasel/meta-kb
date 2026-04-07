---
entity_id: raptor
type: project
bucket: knowledge-bases
abstract: >-
  RAPTOR builds a hierarchical tree of LLM-generated summaries over document
  chunks via UMAP+GMM clustering, enabling retrieval at multiple abstraction
  levels — distinguishing it from flat-chunk RAG by supporting both specific
  lookups and broad thematic queries.
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - graphrag
  - react
last_compiled: '2026-04-07T11:50:26.783Z'
---
# RAPTOR

**Recursive Abstractive Processing for Tree-Organized Retrieval**

## What It Is

RAPTOR is a RAG indexing technique published in a 2024 Stanford paper (Sarthi et al.) that addresses a structural weakness in standard [Retrieval-Augmented Generation](../concepts/rag.md): flat-chunk retrieval returns passages that answer narrow factual questions well but fails on queries requiring synthesis across a document or corpus. RAPTOR solves this by building a tree of progressively more abstract summaries, then making all tree levels available for retrieval simultaneously.

The key architectural insight: a question like "what is this paper's main argument?" needs a high-level summary, while "what did the authors find in experiment 3?" needs a specific chunk. Flat RAG forces you to pick one granularity. RAPTOR gives you both.

## Core Mechanism

The indexing pipeline runs in three repeated stages until the cluster count reaches one:

1. **Embed** all text chunks using a dense embedding model
2. **Reduce dimensionality** with UMAP, projecting from the embedding dimension down to a lower-dimensional space suitable for clustering
3. **Cluster** with Gaussian Mixture Models (GMM), selecting the optimal cluster count via BIC (Bayesian Information Criterion)
4. **Summarize** each cluster with an LLM, generating a new text node representing that cluster's content
5. **Recurse** on the summaries, repeating embed → cluster → summarize until no further clustering is possible

The result is a tree where leaf nodes are original document chunks and internal nodes are increasingly abstract LLM-generated summaries.

At retrieval time, RAPTOR supports two strategies:

- **Tree traversal**: Start at the root, descend through the most relevant nodes at each level — useful for focused queries
- **Collapsed tree** (flat retrieval over all nodes): Embed the query and run similarity search across all nodes simultaneously, regardless of tree level — more robust in practice

Most production implementations, including RAGFlow's `rag/raptor.py`, use the collapsed tree approach because it integrates cleanly with existing hybrid retrieval pipelines. RAGFlow's `RecursiveAbstractiveProcessing4TreeOrganizedRetrieval` class stores all nodes (original chunks plus generated summaries) in the same vector index, embedding and BM25 indexing them alongside standard chunks.

## Integration in Production Systems

RAGFlow's implementation in `rag/raptor.py` illustrates the engineering overhead RAPTOR adds:

- LLM response caching (`get_llm_cache`/`set_llm_cache`) to avoid re-generating summaries on re-indexing
- Embedding caching for the same reason
- Async execution with semaphores (`chat_limiter`) to manage LLM concurrency
- Retry logic (3 attempts with backoff) for LLM failures during summarization
- Task cancellation checking so long indexing jobs can be interrupted

RAPTOR is **disabled by default** in RAGFlow because it consumes significant token quota during ingestion. Every cluster at every tree level requires an LLM call. For a 500-chunk document, a two-level tree might add 50-100 additional LLM summarization calls.

[LlamaIndex](../projects/llamaindex.md) provides a `RaptorPack` integration. [LangChain](../projects/langchain.md) users typically implement it manually or via community packages.

## Key Numbers

- **GitHub stars (original paper repo):** ~7,000 (self-reported, not independently verified for retrieval quality claims)
- **Reported improvement:** The original paper reports RAPTOR outperforms standard RAG on QASPER and QuALITY benchmarks, with gains in the 5–15% range on multi-hop and synthesis questions — **self-reported** in the paper, not independently replicated at scale
- **Token overhead:** Roughly 10–20% additional tokens over the base corpus for a two-level tree, scaling with corpus size and desired tree depth
- **HippoRAG 2 comparison** (independently published, ICML '25): HippoRAG 2 claims to outperform RAPTOR on associativity benchmarks (MuSiQue, 2WikiMultiHopQA, HotpotQA) while using fewer offline indexing resources — this is an external comparison but from authors with an interest in showing superiority

## Strengths

**Multi-granularity retrieval without query reformulation.** A single query hits both specific chunks and abstract summaries. You get detailed passages for factual questions and broad overviews for synthesis questions from the same index.

**Corpus-level understanding.** Standard RAG with 512-token chunks cannot answer "what are the three main themes of this document?" RAPTOR's summaries encode cross-chunk meaning that no individual chunk contains.

**Flat retrieval compatibility.** The collapsed-tree variant slots into any vector retrieval pipeline without changing the query-time architecture. You add nodes at indexing time; retrieval stays identical.

**Complements sparse retrieval.** Because RAPTOR generates natural language summaries, those summaries get BM25-indexed alongside chunks. A keyword search that would miss a specific chunk might hit an abstractive summary that paraphrases the concept.

## Critical Limitations

**Concrete failure mode — clustering instability.** GMM clustering with UMAP dimensionality reduction is sensitive to the embedding quality and the chosen hyperparameters (UMAP `n_components`, `n_neighbors`; GMM covariance type). Small changes in either can produce structurally different trees. Two corpora that differ only in document ordering may produce meaningfully different summary trees. There is no deterministic guarantee that similar content clusters together. In practice, this means RAPTOR trees built from the same corpus with different embedding models or hyperparameters are not comparable, and debugging retrieval failures requires inspecting which tree level the relevant information landed on.

**Unspoken infrastructure assumption.** RAPTOR assumes LLM summarization calls are cheap relative to the value of improved retrieval. For corpus sizes in the thousands of documents, ingestion costs can run into hundreds of dollars with GPT-4-class models. The technique was developed and benchmarked on academic papers where corpus sizes are modest. Large enterprise document collections (millions of pages) make RAPTOR's O(N) LLM calls during indexing economically prohibitive unless you use smaller summarization models, which degrades summary quality.

## When NOT to Use RAPTOR

**Real-time or frequent re-indexing.** Every new document or document update triggers re-clustering and re-summarization across potentially the entire tree. If your corpus changes daily, RAPTOR's indexing cost compounds. Standard chunking with incremental index updates is far more practical.

**Short documents or homogeneous corpora.** RAPTOR adds value when documents are long enough that no single chunk captures the full meaning, or when queries require cross-document synthesis. For a corpus of single-page FAQs or product specs, a flat chunk index retrieves just as well at a fraction of the cost.

**Latency-sensitive applications.** If you need sub-100ms retrieval, running similarity search across a tree that's 2–3x larger than the original chunk count adds measurable overhead, particularly with re-ranking.

**Teams without LLM cost controls.** The token consumption during indexing is non-trivial and not bounded by document count alone — it scales with corpus structure, cluster counts at each level, and summary length. Without careful cost monitoring, RAPTOR indexing jobs can run unexpectedly expensive.

## Unresolved Questions

**Optimal tree depth is undocumented.** The original paper does not give clear guidance on when to stop recursing. RAGFlow's implementation recurses until cluster count reaches one, but whether two levels or five levels is better for a given corpus type remains empirically unclear.

**Summary quality degradation at higher levels.** High-level summaries in the tree are summaries of summaries. LLM hallucination and information loss compound across levels. Neither the original paper nor production implementations publish metrics on how much information each tree level loses relative to source chunks.

**Cross-document graph integration.** RAGFlow's GraphRAG operates per-document and cannot yet link graphs across documents. RAPTOR summaries, in contrast, do aggregate across documents within a knowledge base. Whether combining RAPTOR's cross-document summaries with GraphRAG's intra-document entity graphs is beneficial remains untested.

**Governance of stale summaries.** When a source document changes, which summary nodes in the tree are invalidated? The original paper addresses static corpora. Production deployments need explicit logic for cascade invalidation up the tree, and most implementations do not provide this.

## Alternatives and Selection Guidance

| Alternative | When to choose it |
|---|---|
| [GraphRAG](../concepts/graphrag.md) | Need explicit entity relationships and multi-hop reasoning across entities (e.g., "what companies did person X work for before joining company Y?"). GraphRAG extracts a knowledge graph; RAPTOR extracts abstractions. Use GraphRAG for entity-centric queries, RAPTOR for thematic synthesis. |
| [HippoRAG](../projects/hipporag.md) | Need multi-hop associativity with lower offline indexing cost. HippoRAG 2 (ICML '25) claims better performance on multi-hop benchmarks than RAPTOR with fewer LLM calls during indexing. Still requires a graph construction step. |
| Flat chunk RAG with [Hybrid Search](../concepts/hybrid-search.md) | Corpus changes frequently, or documents are short and homogeneous. BM25 + dense retrieval covers most single-hop factual queries without RAPTOR's overhead. |
| [Agentic RAG](../concepts/agentic-rag.md) | Query complexity is unpredictable. An agent that iteratively retrieves and refines handles both narrow and broad questions without requiring pre-built tree structures. Higher latency per query, but no indexing overhead. |

Use RAPTOR when: your corpus is large and relatively static, documents are long enough that individual chunks lose context, and users ask a mix of specific and synthesis questions against the same index.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md) — RAPTOR extends standard RAG by adding hierarchical indexing
- [GraphRAG](../concepts/graphrag.md) — Alternative graph-based approach for multi-document reasoning
- [Vector Database](../concepts/vector-database.md) — RAPTOR tree nodes are stored and queried like standard vector embeddings
- [Embedding Model](../concepts/embedding-model.md) — Embedding quality directly affects clustering quality and therefore tree structure
- [Context Compression](../concepts/context-compression.md) — RAPTOR summaries are a form of lossy compression applied at indexing time rather than query time
- [Hybrid Search](../concepts/hybrid-search.md) — RAPTOR nodes benefit from BM25 indexing alongside dense retrieval
- [ReAct](../concepts/react.md) — Agentic retrieval pattern that can query RAPTOR-indexed corpora
