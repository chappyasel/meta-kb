---
entity_id: hipporag
type: project
bucket: knowledge-bases
sources:
  - repos/osu-nlp-group-hipporag.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-04T21:20:03.239Z'
---
# HippoRAG

## What It Is

HippoRAG is a RAG framework from OSU-NLP-Group that uses **knowledge graphs + personalized PageRank** to enable multi-hop retrieval across documents. The core idea is inspired by how the human hippocampus consolidates memories: instead of treating documents as isolated chunks, HippoRAG builds interconnected knowledge representations that can be traversed associatively. HippoRAG 2 is the current version, presented at NeurIPS 2024.

[Source](../../raw/repos/osu-nlp-group-hipporag.md)

## What Makes It Different

Standard Retrieval-Augmented Generation retrieves chunks by vector similarity—good for single-hop lookups, weak for questions requiring reasoning across multiple documents or entities. HippoRAG's key moves:

1. **Knowledge graph construction** — extracts entities and relations from documents, building a graph rather than a flat chunk store
2. **Personalized PageRank (PPR)** — at query time, seeds the graph with query-relevant nodes and runs PPR to surface contextually connected information, even when no single chunk contains the full answer
3. **Persistent memory semantics** — new documents integrate into the existing graph rather than sitting as isolated embeddings, approximating long-term memory accumulation

HippoRAG 2 extends this with improved sense-making and tighter integration between the dense retrieval layer and graph traversal.

## Architecture Summary

```
Documents → Entity/Relation Extraction (LLM) → Knowledge Graph
Query → Dense Retrieval → Seed Nodes → Personalized PageRank → Ranked Passages → LLM
```

The graph acts as an index overlay on top of standard passage storage. Retrieval is a two-stage process: find entry points via embedding similarity, then propagate through the graph to collect related context.

## Key Numbers

| Metric | Value |
|--------|-------|
| GitHub Stars | ~3,300 |
| License | MIT |
| Language | Python |
| Presented | NeurIPS 2024 |
| Paper (v2) | arXiv 2502.14802 |

## Strengths

- **Multi-hop retrieval** — meaningfully outperforms standard dense retrieval on questions requiring cross-document reasoning
- **No fine-tuning required** — works with off-the-shelf LLMs and embedding models
- **Incremental updates** — new documents extend the graph without rebuilding from scratch
- **Interpretable** — the knowledge graph provides an inspectable intermediate representation

## Limitations

- **Extraction cost** — building the knowledge graph requires LLM calls per document, making indexing substantially more expensive than embedding-only approaches
- **Extraction quality ceiling** — retrieval quality is bounded by how accurately entities and relations are extracted; errors propagate
- **Graph scale** — very large corpora may present scalability challenges for PPR computation
- **Latency** — two-stage retrieval (dense + graph traversal) is slower than single-stage vector search
- **Complexity** — more moving parts than naive RAG; harder to debug and tune

## Alternatives

| System | Approach |
|--------|----------|
| Standard RAG | Dense retrieval only; simpler, cheaper, weaker on multi-hop |
| GraphRAG (Microsoft) | Also uses knowledge graphs, but community detection + summarization rather than PPR |
| RAPTOR | Tree-based recursive summarization for multi-scale retrieval |
| LightRAG | Graph-based RAG with dual-level retrieval |

## Practical Implications

HippoRAG is a reasonable choice when your retrieval task involves **questions that span multiple documents or entities** and you can afford the indexing overhead. For simple single-document lookups or cost-sensitive deployments, standard dense retrieval is likely sufficient. The framework is open (MIT) and has Colab support, making it relatively accessible to evaluate.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — extends (0.8)
