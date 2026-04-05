---
entity_id: raptor
type: project
bucket: knowledge-bases
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/michaelliv-napkin.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:29:30.920Z'
---
# RAPTOR

**Recursive Abstractive Processing for Tree-Organized Retrieval** — a hierarchical RAG preprocessing technique that clusters document chunks, summarizes each cluster, then clusters and summarizes the summaries, producing a multi-level tree of abstractions over a corpus.

## What It Does

Standard RAG retrieves short, similar-sounding chunks. This works for factual lookups but fails on questions that require synthesizing information spread across many documents — thematic analysis, cross-document comparisons, multi-hop reasoning. RAPTOR addresses this by building a tree where leaf nodes are original chunks and internal nodes are LLM-generated summaries of clustered content. At query time, retrieval can draw from any level of the tree, matching both specific facts (leaves) and thematic abstractions (upper nodes).

## Core Mechanism

The algorithm runs as an offline indexing pipeline:

1. **Chunk the corpus** into fixed-size leaf nodes (typically ~100 tokens with overlap).
2. **Embed all nodes** using a dense encoder (the original paper uses SBERT).
3. **Cluster embeddings** using Gaussian Mixture Models with soft assignment — a node can belong to multiple clusters, which is crucial for text that spans multiple topics. The number of clusters is selected via BIC (Bayesian Information Criterion).
4. **Summarize each cluster** with an LLM, producing a new node at the next tree level.
5. **Repeat** steps 2–4 on the summary nodes until a single root summary represents the entire corpus.

The resulting tree has 3–5 levels for typical document corpora. Each node stores its text, embedding, and level.

At retrieval time, RAPTOR supports two strategies. **Tree traversal** starts at the root, selects the most relevant child at each level (greedy beam search), and descends toward specific content. **Collapsed tree retrieval** flattens all nodes from all levels into a single pool and runs standard top-K similarity search over the whole set. The paper finds collapsed tree retrieval generally outperforms traversal because it avoids early errors propagating down the beam.

The original paper's code (Stanford NLP group) structures this across a small set of core abstractions: a `ClusteringAlgorithm` that wraps GMM fitting, a `Summarizer` that calls an LLM API, and a `RaptorRetriever` that handles both retrieval modes. LlamaIndex and LangChain both ship RAPTOR integrations that wrap this same pipeline.

## Key Numbers

The original paper ([arxiv 2401.18059](https://arxiv.org/abs/2401.18059)) reports:

- On **QuALITY** (long-form comprehension): RAPTOR with GPT-4 achieves **82.6%** accuracy vs. 72.9% for the best DPR baseline — a ~10 point improvement.
- On **QASPER** and **NarrativeQA**, improvements of 2–5 points over chunk-only RAG baselines.
- The HippoRAG paper lists RAPTOR as a comparison system and shows it underperforms on multi-hop retrieval (MuSiQue, 2WikiMultihopQA) relative to graph-based methods, though the comparison uses different configurations.

All benchmark results are **self-reported by paper authors**. Independent reproductions are limited, and results are sensitive to the choice of embedding model, LLM summarizer quality, and chunk size.

## Strengths

**Thematic and cross-document queries.** The tree structure genuinely helps when an answer requires synthesizing multiple sections. Upper-level nodes contain abstractions that no single chunk contains — a summary node covering "the company's risk factors" will match a question about risk even if no single chunk uses that exact framing.

**Compatibility with existing RAG stacks.** RAPTOR is a preprocessing step that produces nodes, not a retrieval system. Any vector store and retriever works downstream. LlamaIndex's `RaptorPack` slots into an existing index with minimal changes.

**Works with arbitrary corpora.** No schema, entity extraction, or structured data required — just text. This gives it broader applicability than graph-based methods like HippoRAG or GraphRAG that require entity and relation extraction.

## Limitations

**Concrete failure mode: summarization loss.** When the LLM summarizes a cluster, it compresses ~20 source chunks into a paragraph. Specific figures, dates, and named entities regularly disappear. A user asking "what was the Q3 revenue?" against a financial corpus will get a worse result if the relevant chunk was absorbed into a high-level summary and the specific number was dropped. The collapsed tree retrieval mitigates this by also searching leaf nodes, but the failure mode is real and hard to detect without ground-truth evaluation.

**Unspoken infrastructure assumption: LLM API access during indexing.** RAPTOR requires calling an LLM (GPT-4 in the reference implementation, though any model works) for every summary node — roughly N/cluster_size calls per level, times the number of levels. For a 10,000-chunk corpus with clusters of 10 and 3 levels, that is ~1,500 LLM calls to build the index. This is a one-time cost, but it means the index is expensive to rebuild when documents change, and the cost scales with corpus size in a way that plain embedding-based indexing does not.

**Clustering quality depends on embedding quality.** GMM clustering on embeddings works well when the embedding space captures the semantic structure of the corpus. For highly technical domains (legal, medical, code), a general-purpose encoder may cluster content in ways that produce incoherent summaries. The BIC-selected cluster count can also be wrong for corpora with uneven topic density.

## When NOT to Use RAPTOR

**Frequently updated corpora.** The tree must be rebuilt (or partially rebuilt) whenever the corpus changes. With daily document ingestion, the indexing cost becomes ongoing infrastructure, not a one-time setup.

**Precise fact retrieval.** For question types where the answer is a specific number, date, or entity, leaf-node retrieval is sufficient and RAPTOR's extra tree structure adds cost without benefit. Standard chunked RAG with good reranking performs comparably on factoid QA benchmarks.

**Multi-hop reasoning across documents.** Experiments in the HippoRAG paper show RAPTOR underperforms graph-based retrieval on multi-hop benchmarks. If queries require chaining facts across entities (e.g., "who founded the company that acquired X?"), a knowledge graph approach handles this better because it preserves entity-level connectivity that summarization discards.

**Small corpora or single documents.** The tree adds value when there is enough content for multiple abstraction levels. For a single long document (under ~50 pages), the tree has one or two levels and provides minimal benefit over page-level chunking with a sliding window.

## Unresolved Questions

**Summary quality is unvalidated by default.** Nothing in the standard pipeline checks whether generated summaries are accurate, complete, or coherent. A hallucinating summarizer poisons every query that retrieves upper-level nodes. No published work provides a good answer for how to detect or mitigate this at scale.

**Cluster stability across updates.** When new documents are added, clusters at all levels can shift. There is no published incremental update strategy — the reference implementation rebuilds from scratch. For production use, this means either accepting stale summaries or paying full rebuild costs on each update cycle.

**Cost at scale.** The paper evaluates on corpora of tens to hundreds of documents. Behavior on corpora of millions of documents — where clustering may produce very different tree shapes, and rebuilding costs become prohibitive — is not characterized.

**Which level to retrieve from.** The paper recommends collapsed tree retrieval over traversal, but gives limited guidance on when upper-level nodes should be preferred over leaf nodes, or how to weight results from different levels in a ranking function.

## Alternatives

**Use [HippoRAG](../projects/hipporag.md) when** queries require multi-hop reasoning across named entities. It preserves entity-level connectivity that RAPTOR's summarization discards, and outperforms RAPTOR on MuSiQue and 2WikiMultihopQA benchmarks.

**Use GraphRAG (Microsoft) when** the goal is community-level summarization across a large corpus and queries are primarily thematic ("what are the main themes?"). GraphRAG's community detection produces more structured abstractions than RAPTOR's GMM clustering, at higher indexing cost.

**Use plain chunked RAG with cross-encoder reranking when** queries are factoid, the corpus is updated frequently, or the indexing budget is limited. A BGE-reranker or Cohere Rerank step recovers much of RAPTOR's quality improvement on single-hop retrieval tasks without tree construction cost.

**Use PageIndex when** the corpus consists of structured documents (financial reports, legal filings) with natural table-of-contents structure. Reasoning-based tree traversal over the document's existing structure avoids the summarization loss problem entirely.

## Relationship to Retrieval-Augmented Generation

RAPTOR is a preprocessing extension to standard RAG, not a replacement. It produces a richer node pool (multi-level summaries plus original chunks) that feeds into the same embedding-and-retrieve pattern. Its main contribution is solving the coverage problem: standard RAG cannot retrieve something that no single chunk contains, but RAPTOR creates nodes (summary nodes) that represent synthesized content explicitly.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.7)
