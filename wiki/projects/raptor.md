---
entity_id: raptor
type: project
bucket: knowledge-substrate
abstract: >-
  RAPTOR recursively clusters and summarizes document chunks into a multi-level
  tree, enabling retrieval at any level of abstraction to answer both
  fine-grained and high-level questions that flat vector search misses.
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - graphrag
  - retrieval-augmented-generation
  - knowledge-graph
  - react
  - graphrag
last_compiled: '2026-04-08T02:55:57.276Z'
---
# RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval

## What It Does

RAPTOR (Recursive Abstractive Processing for Tree-Organized Retrieval) addresses a structural limitation in standard [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): flat vector search retrieves semantically similar chunks but cannot synthesize information dispersed across many documents. A question like "What is the overall argument of this report?" requires reading the whole document; a question like "What percentage of users churned in Q3?" requires a specific chunk. Standard RAG handles only the second case well.

RAPTOR builds a tree of progressively abstract summaries. Leaf nodes are original text chunks. Each parent node is an LLM-generated summary of a cluster of children. Retrieval queries the tree at every level simultaneously and returns the most relevant nodes regardless of their depth. A high-level question matches a top-level summary; a specific question matches a leaf chunk. The same index serves both.

The paper appeared at ICLR 2024 from Stanford NLP. The repository has approximately 4,100 stars as of mid-2025 (self-reported by observatory tools; independently observable on GitHub).

## Core Mechanism

### Tree Construction (Offline)

The indexing pipeline, implemented in `raptor/tree_builder.py` and `raptor/cluster_tree_builder.py`, runs as follows:

1. **Chunk** the source documents into leaf nodes at a fixed token limit (default 100 tokens).
2. **Embed** each chunk using a configured embedding model (`raptor/EmbeddingModels.py`).
3. **Reduce dimensionality** with UMAP (`umap.UMAP`) to 10 dimensions for global structure, then 2 dimensions for local clustering. The two-pass reduction prevents UMAP from collapsing distant clusters together.
4. **Cluster** using Gaussian Mixture Models (GMM via `sklearn.mixture.GaussianMixture`). The optimal cluster count is selected by minimizing Bayesian Information Criterion (BIC) over a search range (default 2–50 clusters). Crucially, GMM assigns soft cluster membership, so a chunk can belong to multiple clusters and appear in multiple parent summaries if it's genuinely relevant to both.
5. **Summarize** each cluster with an LLM (`raptor/SummarizationModels.py`). The summary becomes a new node at the next level up.
6. **Recurse** on the summary nodes. Repeat steps 2–5 until the number of remaining nodes falls below a threshold (default: when fewer than the minimum cluster count remain), producing typically 3–5 levels.
7. **Flatten** the entire tree — all nodes at all levels — into a single retrievable index.

The implementation supports two tree-building modes: `ClusterTreeBuilder` (the default, described above) and a simpler `TreeBuilder` that builds fixed-depth trees without GMM clustering.

### Retrieval (Online)

`raptor/retrieval_augmentation.py` handles query time. Two retrieval strategies:

- **Collapsed tree** (default): Treat all nodes at all levels as a single flat pool. Score each node against the query embedding, return the top-k. Fast and generally effective.
- **Tree traversal**: Start at the root, select the top-k nodes at each level, then descend only into the children of those nodes. Slower but useful when the tree structure itself matters (e.g., following a logical hierarchy). Implemented in `raptor/tree_retriever.py`.

Both strategies use cosine similarity over embeddings. The collapsed tree approach outperforms tree traversal on most benchmarks because it doesn't commit early to a subtree that might not contain the answer.

### Key Data Structures

- `raptor/tree_structures.py` defines `Node` (text, embedding, child indices, layer) and `Tree` (dict of nodes per layer, all-nodes dict, leaf-node set).
- The tree serializes to disk via pickle; the full tree for a large corpus can be large because every level's embeddings are stored.

## Key Numbers

**QuALITY benchmark** (long-form reading comprehension over 5,000+ word passages): RAPTOR + GPT-4 achieves **82.6%** accuracy versus BM25 + GPT-4 at **72.1%** and DPR at **70.6%**. This is self-reported in the RAPTOR paper (Sarthi et al., ICLR 2024) and not independently replicated in the sources reviewed here.

**QASPER** (scientific paper QA): RAPTOR + UnifiedQA achieves **36.6 F1**, surpassing the previous state-of-the-art by several points. Self-reported.

**NarrativeQA**: RAPTOR + GPT-4 achieves **55.3** on the challenging story-comprehension benchmark. Self-reported.

RAGFlow's production integration reports that RAPTOR is "disabled by default because it consumes significant additional token quotas during ingestion" — an implicit confirmation that the approach works but is expensive. This is an independent operational observation, not a benchmark result.

HippoRAG 2's paper (ICML 2025) compares against RAPTOR and reports that HippoRAG 2 uses "significantly fewer resources for offline indexing compared to other graph-based solutions such as GraphRAG, RAPTOR, and LightRAG." This is a competing team's self-reported characterization.

## Architectural Uniqueness

Three decisions distinguish RAPTOR from alternatives:

**Soft cluster membership via GMM.** Most clustering approaches (k-means, hierarchical) assign each chunk to exactly one cluster. GMM assigns probabilities. A chunk discussing both "climate policy" and "economic growth" can contribute to summaries of both clusters. This avoids the brittleness of hard assignment when documents cover multiple topics.

**Summaries as first-class retrievable units.** RAPTOR doesn't use the tree only for routing during retrieval. The summary nodes themselves are returned as context. This means the LLM receives a high-quality, pre-synthesized summary rather than a pile of fragments it must synthesize itself — exploiting the asymmetry noted in the context engineering literature: LLMs comprehend complex context better than they generate it from sparse input.

**Level-agnostic retrieval.** The system doesn't decide in advance which level of the hierarchy to search. By collapsing all levels into one pool and scoring everything, the query itself determines whether a summary or a leaf chunk is more relevant. A question about overall themes retrieves a top-level summary; a question about a specific fact retrieves a leaf.

## Integration in Production Systems

RAGFlow implements RAPTOR in `rag/raptor.py` as `RecursiveAbstractiveProcessing4TreeOrganizedRetrieval`. The production implementation adds:

- **LLM response caching** (`get_llm_cache`/`set_llm_cache`) to avoid re-summarizing identical clusters on re-indexing.
- **Embedding caching** for the same reason.
- **Async execution with semaphores** (`chat_limiter`) to control concurrent LLM calls during summarization.
- **Retry logic** (3 attempts with backoff) on LLM failures.
- **Task cancellation checking** between recursion levels.

The flattened tree structure was chosen specifically to integrate with RAGFlow's existing multi-recall pipeline (BM25 + dense + graph + RAPTOR all run in parallel, then results are fused and re-ranked).

[LlamaIndex](../projects/llamaindex.md) also ships a RAPTOR implementation as a retriever module, making it accessible without implementing the clustering pipeline from scratch.

## Strengths

**Multi-granularity queries from one index.** The same index handles "what does this entire corpus say about X" and "what specific figure appears in section 3.2." Flat RAG requires separate strategies for each.

**Synthesis without runtime cost.** Summarization happens at index time. The LLM at query time receives pre-synthesized context rather than being asked to synthesize 50 retrieved chunks on the fly. For corpora that are queried frequently, this amortizes the LLM cost effectively.

**Works on long documents.** Standard chunking followed by flat retrieval loses the document's overall structure. RAPTOR preserves hierarchical relationships. NarrativeQA results demonstrate this on book-length documents.

**Complementary to other retrieval methods.** RAGFlow's production experience shows RAPTOR works well alongside BM25 and dense retrieval in a fused multi-recall setup, not as a replacement.

## Critical Limitations

**Concrete failure mode: clustering instability on heterogeneous corpora.** UMAP + GMM is sensitive to embedding quality and corpus composition. On a corpus where documents span many unrelated domains (a common enterprise scenario — legal documents mixed with technical specs mixed with HR policies), UMAP can produce embeddings where the global structure is poorly defined. GMM then finds clusters that don't correspond to meaningful topic boundaries. The summaries generated for these spurious clusters are low-quality, and the tree misleads retrieval rather than improving it. There's no built-in diagnostic for this; the system produces a tree regardless of whether the clustering is meaningful.

**Unspoken infrastructure assumption: LLM quality at summarization time is fixed.** The tree is built once using whatever LLM is configured at indexing time. If the summarization model is weak (a small local model, or an older API version), the summaries are poor, and the entire upper tree is corrupted. Unlike leaf chunks — which are verbatim text — summaries cannot be verified against ground truth. Deployers often use a cheaper model for summarization to control cost, but this tradeoff isn't documented in the original paper and degrades performance in ways that are hard to attribute.

## When NOT to Use RAPTOR

**Small, well-structured corpora.** If your documents have explicit sections, headings, and tables of contents, a simple hierarchical chunking strategy that respects those boundaries (RAGFlow's "book" or "paper" templates, for example) will outperform RAPTOR at a fraction of the cost. RAPTOR's value is synthesizing structure that isn't explicit.

**Frequently updated corpora.** Tree construction is expensive. Adding new documents requires re-clustering and re-summarizing affected branches. For knowledge bases where content changes daily or hourly, the operational cost of keeping the tree current is prohibitive. Flat retrieval with a nightly re-index is more practical.

**Token-budget-constrained deployments.** The summarization pass at ingestion time can cost more in LLM tokens than the downstream query savings justify for low-query-volume applications. RAGFlow disables RAPTOR by default for this reason.

**Queries requiring verbatim attribution.** RAPTOR summaries paraphrase source text. If your use case requires exact quotes or traceable citations to specific sentences, retrieving a summary node is insufficient — you need the original chunk. The collapsed-tree approach can return either, but the system doesn't guarantee that a summary node's provenance is fully traceable to specific source sentences.

## Unresolved Questions

**Optimal recursion depth and cluster count.** The paper uses default hyperparameters (BIC for cluster count, recurse until fewer than min-clusters remain). No guidance exists on tuning these for specific corpus characteristics. BIC minimization works reasonably on balanced corpora but isn't validated on highly skewed ones.

**Cross-document graph integration.** RAGFlow's GraphRAG implementation is explicitly limited to per-document knowledge graphs — it cannot link graphs across documents. RAPTOR's tree is also built from a flat pool of chunks without explicit awareness of document boundaries. Neither approach fully solves multi-document synthesis for corpora where the key relationships span documents.

**Retrieval evaluation methodology.** The original benchmarks (QuALITY, QASPER, NarrativeQA) test question answering over single long documents or small corpora. Performance on large enterprise corpora (millions of documents, diverse topics) is not characterized in the literature. The HippoRAG 2 comparison suggests RAPTOR is more expensive than graph-based alternatives at scale, but the quality comparison at scale is not established.

**Summary quality degradation over recursion levels.** Each level summarizes summaries. Errors and omissions in level-1 summaries compound at level-2 and above. The paper doesn't characterize how retrieval quality degrades as a function of the number of hops from leaf nodes. Practitioners have no principled way to set a maximum tree depth.

## Alternatives and Selection Guidance

**Use [GraphRAG](../projects/graphrag.md) when** your corpus has explicit named entities and relationships (people, organizations, events) and your queries require multi-hop reasoning across those entities. GraphRAG's knowledge graph captures typed relationships; RAPTOR's tree captures thematic similarity. GraphRAG is more expensive at indexing time and harder to debug, but its retrieval is more interpretable.

**Use [HippoRAG](../projects/hipporag.md) when** you need continual knowledge integration — adding documents incrementally without full re-indexing. HippoRAG's Personalized PageRank over a knowledge graph is more update-friendly than RAPTOR's clustering tree. HippoRAG 2 reports lower indexing resource consumption than RAPTOR.

**Use flat [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) with hybrid search** when your queries are primarily fact-lookup (find the specific document containing this fact) and your documents have clear, consistent structure. [Hybrid Search](../concepts/hybrid-search.md) combining [BM25](../concepts/bm25.md) and dense retrieval handles most retrieval tasks without the indexing overhead.

**Use [LlamaIndex](../projects/llamaindex.md)'s RAPTOR integration** rather than the reference implementation when you need production-grade observability, configurable embedding models, and compatibility with the broader LlamaIndex retrieval ecosystem. The reference repository is research code.

**Use RAPTOR when** your corpus is large and static (or slowly changing), queries span multiple levels of abstraction, and you can afford the indexing token cost. The sweet spot is a corpus like a large technical manual, a collection of research papers on a single topic, or a company's historical report archive — documents with genuine hierarchical structure that isn't explicitly marked up.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): The base paradigm RAPTOR extends
- [Knowledge Graph](../concepts/knowledge-graph.md): An alternative structural approach to the same multi-document synthesis problem
- [Context Compression](../concepts/context-compression.md): RAPTOR's summaries function as a form of offline context compression
- [Semantic Search](../concepts/semantic-search.md): The retrieval mechanism operating over the flattened tree
- [Vector Database](../concepts/vector-database.md): Where the flattened node embeddings are stored
- [Community Detection](../concepts/community-detection.md): GraphRAG's analog to RAPTOR's GMM clustering
- [Progressive Disclosure](../concepts/progressive-disclosure.md): The tree structure enables retrieval at whatever granularity the query requires
