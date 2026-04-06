---
entity_id: raptor
type: project
bucket: knowledge-bases
abstract: >-
  RAPTOR builds hierarchical tree structures over document corpora by
  recursively clustering and summarizing chunks, enabling retrieval at multiple
  levels of abstraction from raw text to global summaries.
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - graphrag
last_compiled: '2026-04-06T02:11:09.820Z'
---
# RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval

## What It Does

RAPTOR (introduced in a 2024 Stanford paper) addresses a fundamental limitation of standard [Retrieval-Augmented Generation](../concepts/rag.md): flat retrieval over fixed-size chunks cannot answer questions requiring synthesis across multiple documents or sections. A question like "what is the overall thesis of this book?" has no single chunk that answers it — the answer lives at a higher level of abstraction than any individual passage.

RAPTOR solves this by building a tree over the corpus. Original chunks form the leaves. The system clusters them, summarizes each cluster with an LLM, then recurses: the summaries become a new layer of documents, which get clustered and summarized again. This continues until the entire corpus collapses into a single root summary. At query time, retrieval can operate at any level of this tree — from precise leaf chunks to broad root summaries — depending on what the query requires.

The architectural differentiator is that RAPTOR stores both the original chunks and every generated summary in the same retrieval index. Queries that need precise detail retrieve leaves; queries that need synthesis retrieve higher nodes. No separate routing logic decides which level to search — dense retrieval naturally surfaces the most relevant nodes regardless of tree depth.

## Core Mechanism

### Indexing Pipeline

The `RecursiveAbstractiveProcessing4TreeOrganizedRetrieval` class in RAGFlow's `rag/raptor.py` implements the algorithm:

1. **Embed all chunks** using the configured embedding model (provider-agnostic via `LLMBundle`)
2. **Dimensionality reduction** via UMAP — high-dimensional embeddings collapse to a lower-dimensional space where geometric clustering becomes meaningful
3. **Cluster with Gaussian Mixture Models (GMM)** — optimal cluster count selected via Bayesian Information Criterion (BIC), which penalizes model complexity to prevent over-clustering
4. **Summarize each cluster** via LLM call — each cluster's member chunks get concatenated and passed to the LLM as input; the output summary represents the cluster at the next tree level
5. **Recurse** — treat summaries as new documents, re-embed, re-cluster, re-summarize
6. **Flatten and index** — every node at every tree level (original chunks plus all generated summaries) gets written to the same vector and full-text index

The flattened tree approach is a deliberate design choice. An alternative is hierarchical traversal (start at root, descend toward relevant subtrees). Flattening integrates naturally with existing hybrid retrieval pipelines: the retrieval system treats all nodes identically and lets embedding similarity sort out which level answers the query.

RAGFlow's implementation adds several production concerns around this core algorithm: LLM response caching via `get_llm_cache`/`set_llm_cache`, embedding caching to avoid re-computing unchanged chunks, async execution with semaphores (`chat_limiter`) to control API concurrency, retry logic (3 attempts with backoff), and task cancellation checking so long ingestion jobs can be interrupted.

### Retrieval

No special retrieval logic is needed. Because all tree nodes live in the same index alongside regular chunks, standard dense retrieval (cosine similarity over embeddings) or hybrid retrieval (dense + BM25) surfaces RAPTOR nodes when they score highest for a query. A question spanning the whole document tends to match high-level summary nodes; a factual question about a specific paragraph tends to match leaf chunks.

### Complexity

Indexing is roughly O(N log N) where N is the number of initial chunks — each recursive layer processes a fraction of the documents from the layer below, and the number of layers scales logarithmically with corpus size. The dominant cost is LLM calls for summarization, which makes RAPTOR expensive per token relative to pure embedding approaches.

## Key Numbers

- **RAPTOR paper**: Published 2024 (Stanford). Reported improvements of 20%+ over standard RAG on question-answering benchmarks requiring cross-document synthesis, including QASPER and QuALITY. Self-reported, not independently replicated at scale.
- **HippoRAG comparison**: HippoRAG 2 (ICML '25) positions itself as "significantly fewer resources for offline indexing compared to other graph-based solutions such as GraphRAG, RAPTOR, and LightRAG" — treating RAPTOR as a resource-intensive baseline. This is a competitive claim from the HippoRAG authors.
- **RAGFlow integration**: RAPTOR is disabled by default in RAGFlow specifically because it "consumes significant additional token quotas during ingestion." No published latency numbers for the RAGFlow implementation. [Source](../raw/deep/repos/infiniflow-ragflow.md)

All performance numbers from the original paper are self-reported on the authors' chosen benchmarks. Independent evaluation on production corpora with domain-specific documents is not available in the published literature.

## Strengths

**Multi-granularity retrieval without routing logic.** Standard RAG forces a choice: small chunks (good precision, poor synthesis) or large chunks (poor precision, better context). RAPTOR sidesteps this by indexing both and letting retrieval sort it out. Questions about specific facts find leaf chunks; questions about themes or summaries find internal nodes.

**Handles long-document synthesis.** For corpora like books, lengthy reports, or document collections where no individual chunk contains the answer, the tree structure creates nodes that explicitly represent higher-level content. This is the use case where RAPTOR most clearly outperforms flat RAG.

**Composable with existing pipelines.** Because the output is just additional documents in the same index, RAPTOR requires no changes to the retrieval or generation components. RAGFlow's integration demonstrates this: RAPTOR runs as an optional post-processing step during ingestion, and the retrieval pipeline is unchanged.

**Works with any embedding model and LLM.** The algorithm has no model-specific dependencies. Swap the embedder or the summarization LLM without changing the clustering logic.

## Critical Limitations

**Concrete failure mode — clustering instability.** GMM with UMAP dimensionality reduction is sensitive to hyperparameters. Small differences in embedding model quality, cluster count selection, or UMAP configuration can produce substantially different tree structures from the same corpus. If the embeddings cluster poorly (because the corpus has uniform density in embedding space, or because domain-specific vocabulary isn't well-represented in the embedding model), the summaries will group unrelated content together. Those summaries then propagate misleading abstractions up the tree and get indexed as if they were coherent. Queries against a corrupted tree can surface confidently wrong summaries rather than no result.

**Unspoken infrastructure assumption.** RAPTOR assumes reliable, low-latency access to an LLM for summarization during ingestion. In practice this means a cloud API (GPT-4, Claude) or a self-hosted model capable of producing coherent multi-document summaries. Small local models (7B parameters) produce summaries that lose critical detail or hallucinate connections between clustered documents. The algorithm's quality ceiling is the summarization LLM's quality ceiling. RAGFlow's implementation includes retry logic and caching, but a systematically weak summarization model degrades every level of the tree.

## When NOT to Use RAPTOR

**Short, uniform document collections.** If your corpus is 50 one-page product specs of similar structure, clustering will be arbitrary and summaries will add noise rather than signal. Flat retrieval over the original chunks performs better.

**Latency-sensitive or cost-constrained ingestion.** RAPTOR consumes LLM tokens proportional to corpus size for every summarization pass, plus embedding costs for every generated summary. For a 10,000-chunk corpus with two recursive levels, you might generate 2,000-3,000 summaries, each requiring an LLM call. At cloud API pricing, this adds meaningfully to ingestion cost. RAGFlow disables RAPTOR by default for this reason.

**Rapidly changing corpora.** RAPTOR builds its tree at ingestion time. If documents change frequently, the tree goes stale and summaries may no longer reflect current content. Incremental updates to the tree are not straightforward — adding new documents may shift cluster assignments for existing nodes, requiring partial or full reprocessing.

**When queries are primarily factual lookups.** For "what is the capital of France" style retrieval over a document set, RAPTOR's hierarchical structure adds cost with no retrieval benefit. Standard flat RAG is faster, cheaper, and equally accurate.

**Multi-document cross-referencing needs.** RAPTOR clusters and summarizes within a corpus but does not explicitly model relationships between named entities or concepts across documents. For questions requiring multi-hop reasoning across entities (person A worked at company B, which merged with company C...), [GraphRAG](../projects/graphrag.md) or [HippoRAG](../projects/hipporag.md) are better fits. RAPTOR summaries capture thematic co-occurrence, not structural entity relationships.

## Unresolved Questions

**Optimal tree depth.** The algorithm recurses until it can't reduce further, but there's no principled guidance on how many levels produce best retrieval. Published benchmarks test specific corpora; behavior on enterprise document collections with different density and topic distributions is unstudied.

**Summary quality validation.** RAGFlow includes retry logic but no mechanism to detect when a generated summary is hallucinated or incoherent. A bad summary gets indexed like any other node. There's no published approach to auditing tree quality post-ingestion.

**Incremental update semantics.** What happens when you add 500 new documents to a 10,000-document RAPTOR-indexed corpus? Full reprocessing is expensive. Partial updates (only re-cluster affected branches) are complex and may produce inconsistent trees. Neither the paper nor RAGFlow's documentation addresses this.

**Interaction with other retrieval layers.** In RAGFlow's hybrid retrieval pipeline, RAPTOR nodes compete with GraphRAG nodes, BM25 matches, and dense retrieval results. How re-ranking weights these differently-sourced candidates, and whether RAPTOR nodes consistently contribute or mostly get outranked, is not documented.

## Alternatives

**[GraphRAG](../projects/graphrag.md):** Use when your queries require explicit multi-hop reasoning over named entities and relationships ("what companies did person X work for, and which of those were acquired?"). GraphRAG builds a knowledge graph with entity resolution; RAPTOR builds thematic summaries. GraphRAG is more expensive to index but handles structured relational queries that RAPTOR cannot. Prefer RAPTOR when you need synthesis over thematic content; prefer GraphRAG when you need traversal over factual relationships.

**[HippoRAG](../projects/hipporag.md):** Use when you need the associativity benefits of graph-based retrieval with lower indexing cost than RAPTOR or GraphRAG. HippoRAG 2 (ICML '25) reports better performance on multi-hop tasks than RAPTOR while using fewer resources for offline indexing. The tradeoff: HippoRAG is less proven in production and the codebase is younger.

**Flat [RAG](../concepts/rag.md) with larger chunks:** For most factual retrieval tasks, standard RAG with 512-1024 token chunks and hybrid retrieval ([BM25](../concepts/bm25.md) + dense) matches or exceeds RAPTOR's performance at a fraction of the indexing cost. Only reach for RAPTOR when benchmark evidence or production observation confirms that synthesis-requiring queries are a significant fraction of your traffic.

**[Agentic RAG](../concepts/agentic-rag.md):** For queries that require synthesis, an agent that iteratively retrieves and reasons over multiple chunks can approximate what RAPTOR's tree provides, without the upfront indexing cost. The tradeoff is query-time latency and cost rather than ingestion-time cost.

**TreeRAG (RAGFlow evolution):** RAGFlow's own 2025 TreeRAG extension decouples search (fine-grained chunks) from retrieve (coarse, contextual aggregation) in a two-phase approach. This solves the same chunk-size dilemma as RAPTOR but uses offline hierarchical tree construction with online fine-to-coarse retrieval rather than GMM clustering. If you're already using RAGFlow, TreeRAG is the more actively developed successor to RAPTOR within that system.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md) — the base paradigm RAPTOR extends
- [Knowledge Base](../concepts/knowledge-base.md) — the storage layer RAPTOR populates
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md) — the retrieval strategy RAPTOR nodes participate in
- [Memory Consolidation](../concepts/memory-consolidation.md) — the cognitive process RAPTOR structurally resembles
- [GraphRAG](../projects/graphrag.md) — primary alternative for relational multi-hop queries
- [HippoRAG](../projects/hipporag.md) — alternative optimized for associative multi-hop retrieval
- [LlamaIndex](../projects/llamaindex.md) — framework with its own RAPTOR implementation
- [Context Engineering](../concepts/context-engineering.md) — broader discipline RAPTOR contributes to
