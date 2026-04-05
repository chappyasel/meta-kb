---
entity_id: raptor
type: project
bucket: knowledge-bases
sources:
  - repos/osu-nlp-group-hipporag.md
  - repos/vectifyai-pageindex.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-04T21:20:19.881Z'
---
# RAPTOR

**Recursive Abstractive Processing for Tree-Organized Retrieval** — a RAG architecture that builds hierarchical tree indexes over document collections, enabling retrieval at multiple levels of abstraction rather than only at the chunk level.

## What It Does

Standard RAG retrieves flat, similarly-sized chunks ranked by vector similarity. RAPTOR addresses a fundamental limitation of this approach: questions requiring synthesis across many documents, or understanding at a high level of abstraction, are poorly served by chunk-level retrieval alone.

RAPTOR works by:
1. **Chunking** source documents as usual
2. **Clustering** chunks using embedding similarity (typically Gaussian Mixture Models)
3. **Summarizing** each cluster with an LLM to produce an abstract node
4. **Repeating recursively** — clusters of summaries are themselves summarized — until a single root node represents the entire corpus
5. **Indexing all levels** of the resulting tree, then retrieving from multiple levels at query time

This means a query about a specific detail can match a leaf node; a query requiring broad synthesis can match a high-level summary node. Both are available in the same retrieval step.

## What's Unique

Most RAG improvements focus on better chunking, reranking, or query expansion — all operating at the same semantic level. RAPTOR's tree structure explicitly represents the document corpus at multiple granularities. It's one of the few retrieval approaches that systematically addresses "thematic" or "cross-document" queries without requiring a separate summarization pipeline to be invoked at query time.

The recursive abstraction also acts as a form of lossy compression: low-signal details are dropped at higher levels, leaving only what the LLM deems structurally important.

## Architecture Summary

```
Root Summary (entire corpus)
    ├── Cluster Summary A
    │     ├── Chunk 1
    │     ├── Chunk 2
    └── Cluster Summary B
          ├── Chunk 3
          └── Chunk 4
```

- **Clustering**: Soft clustering (GMM) so chunks can belong to multiple clusters
- **Summarization**: Any capable LLM (GPT-4, Claude, etc.)
- **Retrieval**: Collapsed tree (flatten all nodes, retrieve top-k by similarity) or tree traversal (top-down beam search from root)
- **Embedding**: Standard dense embeddings at every node level

## Key Numbers

The original RAPTOR paper (Sarthi et al., 2024, Stanford) reported gains on QASPER, NarrativeQA, and QuALITY benchmarks, with the most pronounced improvements on questions requiring multi-document synthesis. Collapsed tree retrieval generally outperformed tree traversal in their ablations.

## Strengths

- Handles multi-hop and thematic queries better than flat chunk retrieval
- Retrieval cost at inference time is comparable to standard RAG (no extra LLM calls needed)
- Composable — can sit on top of most existing RAG pipelines
- Particularly useful for long documents and large corpora where chunk-level retrieval misses forest-for-trees patterns

## Limitations

- **Index build cost is high**: Requires LLM calls proportional to corpus size during indexing. Not suitable for rapidly changing corpora.
- **Summarization quality matters enormously**: Bad summaries at intermediate levels propagate and can hurt retrieval. Quality depends heavily on the LLM used for summarization.
- **Cluster quality is approximate**: GMM clustering on embeddings is heuristic; semantically related but lexically distant content may not cluster together.
- **No structured reasoning**: Unlike graph-based approaches, RAPTOR doesn't capture explicit relationships between entities — just thematic proximity. Multi-hop reasoning over named entities is not a strength.
- **Hyperparameter sensitivity**: Number of clustering levels, cluster size, and summarization prompt all affect index quality, with limited principled guidance on tuning.

## Alternatives and Context

| Approach | Key difference |
|---|---|
| [HippoRAG](../projects/hipporag.md) | Knowledge graph + PageRank for associative multi-hop retrieval; better for entity-relationship queries |
| PageIndex | Tree indexing via LLM reasoning rather than embedding clustering; claims semantic over similarity-based relevance |
| Standard RAG | Flat chunk retrieval; simpler but misses cross-document synthesis |
| GraphRAG (Microsoft) | Community summarization on knowledge graphs; similar hierarchical intuition, different structure |

RAPTOR is best understood as an improvement to Retrieval-Augmented Generation specifically for corpora where queries span multiple documents or require understanding at different levels of abstraction. It doesn't replace chunk-level retrieval — it augments it with additional index layers.

## Practical Guidance

RAPTOR is worth the added complexity when: (1) your corpus is large and relatively stable, (2) a significant fraction of user queries are thematic or cross-document, and (3) you can afford the index build cost. For frequently updated corpora or primarily factual lookup queries, standard RAG or HippoRAG will likely perform comparably at lower cost.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — extends (0.8)
