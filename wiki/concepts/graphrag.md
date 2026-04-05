---
entity_id: graphrag
type: approach
bucket: knowledge-bases
sources:
  - repos/osu-nlp-group-hipporag.md
  - repos/tirth8205-code-review-graph.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
related:
  - Retrieval-Augmented Generation
  - Knowledge Graphs
  - Hybrid Retrieval
last_compiled: '2026-04-04T21:16:49.204Z'
---
# GraphRAG

## What It Is

GraphRAG is a Retrieval-Augmented Generation approach that structures knowledge as a graph rather than a flat vector index. Instead of treating documents as isolated chunks, it extracts entities and relationships, builds a [knowledge graph](../concepts/knowledge-graphs.md), and uses graph traversal or community detection at query time to retrieve structured, relationship-aware context for an LLM.

The core motivation: standard RAG has a **local retrieval bias**. It finds semantically similar chunks but can't answer questions that require synthesizing information across many documents (e.g., "What are the main themes in this corpus?" or "How does concept A relate to concept C through B?"). GraphRAG addresses this by precomputing structure.

## Why It Matters

Standard vector RAG fails in two specific ways GraphRAG targets:

1. **Multi-hop reasoning**: "Who funded the organization that published this paper?" requires chaining relationships, not just semantic similarity.
2. **Global/sensemaking queries**: Corpus-level questions require holistic understanding that no single retrieved chunk can satisfy.

GraphRAG trades indexing cost for query-time capability—a meaningful architectural tradeoff.

## How It Works

### Indexing Phase
- Extract entities and relationships from documents (typically via LLM)
- Build a knowledge graph where nodes are entities and edges are relationships
- Optionally: cluster the graph into communities using algorithms like Leiden
- Generate **community summaries** via LLM for each cluster (this is Microsoft's key addition)

### Retrieval Phase
Two dominant strategies:

**Local search**: Start from entities relevant to the query, traverse the graph to find related entities and supporting text. Good for specific factual questions.

**Global search**: Use precomputed community summaries at multiple hierarchy levels. Map-reduce style: score summaries for relevance, aggregate answers. Good for sensemaking queries. Expensive.

### Notable Variants

**Microsoft GraphRAG** ([source paper](../../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)): The canonical academic formulation. Introduces hierarchical community detection (Leiden algorithm) with LLM-generated summaries at each level. Solves query-focused summarization at scale. The global search mode is the main differentiator—and the main cost driver.

**HippoRAG** ([source](../../raw/repos/osu-nlp-group-hipporag.md)): Frames GraphRAG as a memory system inspired by hippocampal memory consolidation. Uses **Personalized PageRank** over the knowledge graph to find contextually relevant nodes—mimicking how human associative memory spreads activation. 3.3k stars, NeurIPS'24 paper. Emphasizes continuous knowledge integration without fine-tuning.

**code-review-graph** ([source](../../raw/repos/tirth8205-code-review-graph.md)): Domain-specific GraphRAG for codebases. Uses Tree-sitter to build a persistent dependency graph, then computes blast-radius at review time. Reports 6.8–49× token reduction by reading only affected files. 4.2k stars. Demonstrates that GraphRAG principles generalize beyond text corpora.

## Strengths

- Handles multi-hop and relational queries that stump vector RAG
- Enables global/corpus-level question answering
- Retrieved context is interpretable (you can inspect the graph path)
- Can integrate new documents incrementally without full reindexing (HippoRAG's explicit design goal)
- Reduces irrelevant context in structured domains (codebase example: 6.8–49× fewer tokens)

## Limitations

- **Indexing is expensive**: Entity extraction and community summary generation requires many LLM calls. Not suitable for rapidly changing corpora.
- **Extraction quality ceiling**: The graph is only as good as the entity/relation extraction. LLM extraction introduces errors; schema design is non-trivial.
- **Global search cost**: Map-reduce over community summaries is significantly more expensive than a single vector search.
- **Overkill for simple queries**: For factual lookups, standard RAG is faster and cheaper. GraphRAG adds complexity without benefit.
- **Latency**: Graph traversal and multi-step retrieval adds latency compared to ANN vector search.
- **Tooling immaturity**: Production-grade GraphRAG pipelines are still nascent compared to the mature vector RAG ecosystem.

## Key Numbers

| System | Stars | Benchmark Highlight |
|--------|-------|---------------------|
| Microsoft GraphRAG | — | Superior on global sensemaking queries vs. naive RAG, per original paper |
| HippoRAG 2 | 3,332 | Multi-hop QA improvements over standard RAG baselines |
| code-review-graph | 4,176 | 6.8–49× token reduction on code review tasks |

## Alternatives

- **Standard vector RAG**: Simpler, cheaper, sufficient for most factual retrieval. See Retrieval-Augmented Generation.
- **[Hybrid Retrieval](../concepts/hybrid-retrieval.md)**: Combine sparse + dense retrieval without graph overhead.
- **Long-context LLMs**: As context windows grow (1M+ tokens), some multi-hop tasks can be handled by stuffing full documents—eliminating retrieval entirely at higher cost.
- **SQL/structured DBs**: If your data is already structured, a database with a text-to-SQL layer often outperforms graph extraction.

## When to Use It

Use GraphRAG when your queries require **explicit relationship traversal** or **corpus-level synthesis** and you can afford the indexing cost. Avoid it for simple Q&A over well-chunked documents, real-time ingestion requirements, or latency-sensitive applications.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — extends (0.7)
- [Knowledge Graphs](../concepts/knowledge-graphs.md) — implements (0.9)
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md) — part_of (0.6)
