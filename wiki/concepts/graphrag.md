---
entity_id: graphrag
type: approach
bucket: knowledge-bases
abstract: >-
  GraphRAG combines knowledge graphs with retrieval-augmented generation to
  enable multi-hop and temporal reasoning that flat vector search cannot
  support; its main tradeoff is high indexing cost for ~34% entity extraction
  miss rate.
sources:
  - repos/osu-nlp-group-hipporag.md
  - repos/tirth8205-code-review-graph.md
  - repos/infiniflow-ragflow.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
  - Model Context Protocol
  - Knowledge Graph
  - Community Detection
  - RAPTOR
  - HippoRAG
  - LightRAG
  - Multi-Hop Reasoning
last_compiled: '2026-04-05T20:23:44.690Z'
---
# GraphRAG

## What It Is

GraphRAG is a retrieval strategy that builds an explicit knowledge graph from source documents, then queries that graph at retrieval time rather than performing pure embedding similarity search over text chunks. The name was popularized by Microsoft Research's 2024 paper ([Edge et al.](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)) but the term now covers a broader family of approaches that couple [knowledge graphs](../concepts/knowledge-graph.md) with [RAG](../concepts/retrieval-augmented-generation.md).

The core problem it addresses: standard RAG retrieves text passages that are semantically similar to a query. This works for localized factual lookup but fails on two important query classes:

- **Multi-hop reasoning**: "What company does the person who founded Acme now lead?" requires connecting entity A to entity B to entity C across documents.
- **Global sensemaking**: "What are the main themes in this corpus?" requires synthesizing across the entire document collection, not finding the best-matching passage.

Neither query type has a single matching chunk. GraphRAG handles both by encoding entity relationships explicitly so they can be traversed at query time.

## How It Works

### Indexing Pipeline

The standard GraphRAG indexing pipeline runs offline before any queries:

1. **Chunking**: Source documents are split into 600-2400 token chunks. Smaller chunks (600 tokens) extract approximately 2x more entity references than larger chunks but require proportionally more LLM calls. [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)

2. **Entity and relationship extraction**: An LLM reads each chunk and outputs typed entities (people, organizations, locations, events) plus named relationships between them. Multiple "gleaning" passes re-prompt the LLM to catch missed entities. This is the pipeline's most expensive step and its biggest quality bottleneck — only 65.8% of answer-relevant entities end up in the constructed graph on standard benchmarks, a ~34% miss rate that creates a hard ceiling for graph-only retrieval. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

3. **Entity resolution**: Duplicate entities (e.g., "2024" vs. "Year 2024") are merged using embedding similarity and LLM comparison. RAGFlow's implementation adds an explicit entity resolution step using embedding similarity that Microsoft's original implementation lacked. [Source](../raw/deep/repos/infiniflow-ragflow.md)

4. **Community detection**: The entity-relationship graph is partitioned into hierarchical communities using the Leiden algorithm. This produces a tree: root communities (C0) capture broad themes; leaf communities (C3) capture tight entity clusters. Each community gets an LLM-generated summary.

5. **Hierarchical summaries**: Community summaries are generated bottom-up — leaf communities first, then intermediate, then root. Root-level summaries achieve 9-43x token compression versus source text while maintaining competitive answer quality.

### Query Pipeline

GraphRAG exposes two retrieval modes with different use cases:

**Local search** (entity neighborhood retrieval): Given a query, identify relevant entities via embedding similarity, then retrieve the local neighborhood of those entities from the graph. Best for specific, entity-centric questions. On multi-hop QA benchmarks, this is 0.72-1.62 F1 points better than RAG baseline ([source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)), and +23.33 points better on temporal reasoning queries.

**Global search** (map-reduce over community summaries): Shuffle all community summaries at the chosen level into fixed-size chunks, run parallel LLM calls to generate partial answers with 0-100 helpfulness scores, then reduce to a final synthesized answer. Designed for corpus-wide sensemaking. Achieves 72-83% comprehensiveness win rate versus naive RAG on global queries, but consistently underperforms local search on factual QA (45-55% vs. 63-65% F1). [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)

### Temporal GraphRAG (Zep/Graphiti pattern)

Zep's Graphiti engine extends the basic pattern with **bi-temporal indexing**: each graph edge carries four timestamps tracking both when facts were true in reality (event time) and when they entered the system (transaction time). When new information contradicts existing facts, old edges are invalidated rather than deleted. This enables queries like "What did we believe about X on date Y?" as distinct from "What was actually true about X on date Y?"

On LongMemEval benchmarks with 115,000-token conversations, this temporal graph approach achieves 18.5% accuracy gains and 90% latency reduction over full-conversation baselines. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Strengths

**Multi-hop reasoning**: Graph traversal follows entity chains that embedding similarity cannot discover. A query requiring three entity hops produces no good matching passage, but graph traversal handles it directly.

**Temporal reasoning**: The largest single finding in benchmark comparisons: GraphRAG outperforms RAG by +23.33 F1 points on temporal queries. Graph structure captures chronological relationships that flat retrieval misses entirely.

**Token efficiency at scale**: Root-level community summaries achieve 9-43x token compression over source text summarization while maintaining quality. This matters for corpora too large to process in a single context window.

**Corpus-wide synthesis**: The map-reduce pattern over community summaries handles "What are the main themes in this collection?" — a query class that standard RAG cannot support.

**Complementarity with vector retrieval**: Integration (concatenating results from both RAG and GraphRAG retrieval) yields +6.4% improvement on multi-hop tasks over RAG alone. The systems have non-overlapping strengths: 13.6% of questions are answered correctly only by GraphRAG, 11.6% only by RAG. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**Lightweight implementation possible**: Wikilinks in markdown files achieve graph-traversable knowledge without vector databases or graph stores — BM25/ripgrep provides initial entry points and the agent follows links. [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md)

## Critical Limitations

**Concrete failure mode — the 34% entity extraction ceiling**: On HotPotQA and NQ benchmarks, only 65.8% and 65.5% of answer-relevant entities appear in constructed graphs. This is not a parameter tuning problem — it is a fundamental consequence of LLM extraction being lossy. For specialized domains with technical terms, acronyms, or domain jargon, the miss rate is likely worse. Any query whose answer depends on a missing entity returns nothing from graph search.

**Unspoken infrastructure assumption — static corpora**: The standard Leiden algorithm for community detection requires full graph recomputation when documents change. The paper does not address incremental updates. Production deployments with continuously ingested documents either accept stale communities, pay full recomputation costs on update, or switch to weaker algorithms like label propagation (Zep's approach) that support incremental updates but drift from optimal structure over time.

**Additional limitations**:
- Global search performs poorly on factual QA (10-20 F1 points below local search and RAG). Using global search for specific questions is an architecture mismatch.
- Indexing cost scales with corpus size and chunk count. 1M tokens at 600-token chunks means ~1,667 extraction calls, each with multiple gleaning passes.
- LLM-as-judge evaluations exhibit significant position bias — reversing presentation order can invert preference judgments. Single-run benchmark comparisons are unreliable. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- RAGFlow's GraphRAG implementation operates per-document only and cannot link graphs across documents in a knowledge base. [Source](../raw/deep/repos/infiniflow-ragflow.md)

## When NOT to Use It

**Single-hop factual lookup**: On NQ (single-hop), RAG scores 64.78 F1 vs. GraphRAG Local at 63.01 — RAG wins by 1.77 points. Flat vector retrieval is simpler, cheaper, and more accurate for "When did X happen?" style queries.

**Small, simple corpora**: Graph indexing cost is a fixed investment amortized over queries. For corpora that will receive few queries, the indexing cost likely exceeds the retrieval quality benefit. A graph-free map-reduce baseline over source text chunks performs competitively with GraphRAG on the Microsoft paper's own evaluation.

**Continuously updated documents**: The standard Leiden-based pipeline requires full recomputation when documents change. Systems with high-frequency document updates need either incremental algorithms (with quality tradeoffs) or scheduled full rebuilds (with staleness windows).

**Resource-constrained environments**: Production GraphRAG requires a graph database (Neo4j or equivalent), an embedding store, and substantial LLM budgets for extraction. Zep uses Neo4j with predefined Cypher queries to prevent schema hallucinations — LLM-generated graph queries are unreliable in production. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

**When retrieval latency cannot be predicted**: Map-reduce over community summaries is parallelizable but involves many LLM calls. Query latency depends on corpus size and community count in ways that are harder to bound than vector similarity search.

## Unresolved Questions

**Optimal chunk size**: The Microsoft paper shows 600-token chunks extract 2x more entities than 2400-token chunks, but does not provide a principled recommendation. The tradeoff between extraction quality and cost is workload-dependent and not well characterized.

**Cross-document graph merging**: RAGFlow explicitly acknowledges it cannot link graphs across documents due to memory and computational constraints. No published solution exists for production multi-document GraphRAG that maintains a unified entity namespace across a large, heterogeneous corpus.

**Hallucination compounding**: Community summaries are LLM-generated abstractions of LLM-extracted entities — two sequential LLM steps that can each introduce errors. Neither the Microsoft paper nor Zep's paper applies hallucination detection. The compounding risk is acknowledged but unquantified.

**Evaluation methodology validity**: LLM-as-judge evaluations systematically favor longer, more structured responses (favoring GraphRAG over RAG). ROUGE/BERTScore and LLM judges give contradictory results. The field lacks agreement on evaluation methodology, which means published benchmark comparisons are hard to interpret. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**Cost-benefit at scale**: None of the evaluated papers test corpora larger than ~1-2M tokens or provide cost-per-query analysis. How GraphRAG's quality advantage scales with corpus size (and how its cost scales) is uncharacterized.

## Benchmarks

All numbers below are from the Han et al. systematic evaluation unless noted. Self-reported by paper authors; not independently replicated.

| Query Type | RAG F1 | GraphRAG Local F1 | Winner |
|---|---|---|---|
| Single-hop (NQ) | 64.78 | 63.01 | RAG +1.77 |
| Multi-hop (HotPotQA) | 63.88 | 64.60 | GraphRAG +0.72 |
| Temporal (MultiHop-RAG) | 25.73 | 49.06 | GraphRAG +23.33 |
| Global sensemaking | — | 72-83% win rate vs. naive RAG | GraphRAG (Edge et al.) |

Hybrid integration (both systems, concatenated): +6.4% over RAG alone on multi-hop tasks.

Zep LongMemEval: +18.5% accuracy, 90% latency reduction vs. full-conversation baseline.

## Implementations

**Microsoft GraphRAG** ([aka.ms/graphrag](https://aka.ms/graphrag)): Reference implementation covering both global (community map-reduce) and local (entity neighborhood) retrieval. The canonical system described in Edge et al.

**RAGFlow** ([infiniflow/ragflow](https://github.com/infiniflow/ragflow)): Full-stack RAG engine with GraphRAG as one of several retrieval strategies alongside RAPTOR and TreeRAG. Adds entity resolution and single-pass extraction (vs. Microsoft's multi-pass). Operates per-document only. [Source](../raw/deep/repos/infiniflow-ragflow.md)

**Zep / Graphiti**: Temporal GraphRAG for agent memory with bi-temporal indexing and incremental community updates via label propagation. Production-oriented with Neo4j backend and predefined Cypher queries. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

**Lightweight (wikilink-based)**: Ars Contexta demonstrates that markdown wikilinks can implement graph-traversable knowledge without graph databases — the agent follows links using BM25/ripgrep for entry points. Viable for smaller knowledge bases where zero infrastructure matters more than retrieval optimization. [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md)

## Alternatives

- **[Standard RAG](../concepts/retrieval-augmented-generation.md)**: Use when queries are single-hop factual lookups, corpus is small-to-medium, or indexing cost cannot be justified. Simpler, faster, and more accurate on exact-match retrieval.
- **[RAPTOR](../concepts/raptor.md)**: Hierarchical summarization via recursive clustering. Solves the multi-granularity problem (search small, retrieve large) without explicit entity extraction. Lower miss rate risk than GraphRAG but no relational traversal.
- **[HippoRAG](../concepts/hipporag.md)**: Integrates graph structure with vector retrieval using a different graph construction strategy. Use when the 34% entity extraction miss rate in standard GraphRAG is unacceptable and you need higher graph recall.
- **[LightRAG](../concepts/lightrag.md)**: Lighter-weight GraphRAG variant designed to reduce indexing cost. Use when GraphRAG's full extraction pipeline is too expensive but graph structure is still needed.
- **Graph-free text summarization**: Before investing in graph indexing, try map-reduce over source text chunks. The Microsoft paper itself shows this baseline competes with GraphRAG at lower community levels. Add graph structure only when hierarchical exploration or multi-hop traversal is specifically required.

## Related Concepts

- [Community Detection](../concepts/community-detection.md) — the Leiden/label propagation algorithms that create the community hierarchy
- [Multi-Hop Reasoning](../concepts/multi-hop-reasoning.md) — the primary query class GraphRAG outperforms flat retrieval on
- [Knowledge Graph](../concepts/knowledge-graph.md) — the underlying data structure
- [Model Context Protocol](../concepts/model-context-protocol.md) — one deployment pattern for exposing graph retrieval to agents
