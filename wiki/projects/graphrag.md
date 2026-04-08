---
entity_id: graphrag
type: project
bucket: knowledge-substrate
abstract: >-
  GraphRAG is Microsoft's graph-enhanced RAG system that builds hierarchical
  knowledge graphs with community detection to enable multi-hop reasoning over
  document corpora; its key differentiator is answering corpus-wide
  "sensemaking" queries that flat vector retrieval cannot handle.
sources:
  - repos/osu-nlp-group-hipporag.md
  - repos/tirth8205-code-review-graph.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - retrieval-augmented-generation
  - knowledge-graph
  - community-detection
  - raptor
  - claude-code
  - model-context-protocol
  - react
  - community-detection
  - raptor
last_compiled: '2026-04-08T02:41:58.087Z'
---
# GraphRAG

## What It Is

GraphRAG is a retrieval-augmented generation system from Microsoft Research that transforms document corpora into structured knowledge graphs before retrieval. Where standard RAG finds the most similar chunk to a query, GraphRAG can answer questions that require synthesizing information scattered across many documents — "what are the main themes in this corpus?" or "how do these organizations relate?" — because the graph structure captures entity relationships that embedding similarity over flat text misses.

The project lives at [microsoft/graphrag](https://github.com/microsoft/graphrag) with ~24,000 GitHub stars (as of mid-2025). The core paper is "From Local to Global: A Graph RAG Approach to Query-Focused Summarization" (Edge et al., 2024).

It extends [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) by adding a graph construction and [Community Detection](../concepts/community-detection.md) layer between ingestion and retrieval. The result is a two-mode retrieval system: Local Search (entity-neighborhood retrieval for specific queries) and Global Search (community summary map-reduce for corpus-wide queries).

## Architecture

GraphRAG operates in two phases: an offline indexing phase that builds the knowledge graph, and an online query phase that routes queries through Local or Global search.

### Indexing Pipeline

**Entity and relationship extraction** runs across every document chunk. An LLM receives each chunk (default 600 tokens) and extracts entities with types, descriptions, and relationships with predicates. This runs multiple passes — the system re-prompts to find additional entities the first pass missed, typically running 2-3 extraction rounds per chunk. This is where GraphRAG gets expensive: extracting a moderately-sized corpus requires hundreds to thousands of LLM calls.

**Entity resolution** merges duplicate entities across chunks. The same organization mentioned in 50 documents gets one node, with all relationships pointing to it. This consolidation is what enables multi-hop reasoning — a query about a company can traverse to all its mentioned relationships without scanning every source document.

**Community detection** runs the Leiden algorithm over the entity graph to cluster tightly connected entities. The Leiden algorithm produces hierarchical communities: communities contain sub-communities, which contain individual entities. This hierarchy gives GraphRAG multiple levels of abstraction.

**Community report generation** summarizes each community using an LLM. Every cluster of related entities gets a natural-language summary covering the key themes, entities, and relationships within it. These summaries are what Global Search operates over.

The core data structures — entities, relationships, community memberships, community reports — are stored as Parquet files by default, with optional output to graph databases.

### Query Modes

**Local Search** targets specific entities or narrow factual questions. Given a query, it:
1. Identifies query-relevant entities via embedding similarity
2. Expands to their n-hop neighborhoods in the graph
3. Pulls associated source text, entity descriptions, and relationship data
4. Assembles this as context for the LLM

**Global Search** targets corpus-wide questions. It runs a map-reduce over all community reports:
1. Each community report is sent to an LLM with the query (map phase)
2. Reports that contain relevant information generate partial answers with relevance scores
3. The highest-scoring partial answers are assembled and sent to a final LLM call (reduce phase)

The paper presents Global Search as the primary innovation: it enables "global sensemaking" queries that no single retrieved chunk could answer. In practice, this costs proportionally to corpus size — every community report participates in the map phase for every query.

### The Extraction Cost Problem

The standard configuration uses 600-token chunks and runs multiple extraction passes per chunk. A 2024 cost analysis on a 1M-token corpus found GraphRAG indexing costs roughly 0.5-2.0 USD per 1,000 tokens of input, versus near-zero for embedding-only RAG. This is not a bug — it reflects genuine work. But it means GraphRAG is not economically sensible for frequently changing corpora or for small knowledge bases.

Microsoft subsequently released **LightRAG** (separate project) and the community released variants specifically to address this. The RAGFlow implementation (RAGFlow) addresses it by submitting each document to the LLM only once for extraction rather than using GraphRAG's multi-pass approach, though at some extraction quality cost.

## Key Numbers

The [systematic benchmark by Han et al.](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) provides the most credible independent evaluation:

| Task | RAG F1 | GraphRAG Local F1 | Winner |
|------|--------|------------------|--------|
| Single-hop (NQ) | 64.78 | 63.01 | RAG (+1.77) |
| Multi-hop (HotPotQA) | 60.04 | 61.66 | GraphRAG (+1.62) |
| Temporal reasoning | 25.73 | 49.06 | GraphRAG (+23.33) |

Community-Global search scores 45-55% F1 on QA tasks versus 60-68% for Local — a consistent 10-20 point gap. Global is not a QA mechanism; it is a summarization mechanism.

**The entity extraction ceiling:** Only ~65% of answer-relevant entities exist in constructed knowledge graphs (tested on HotPotQA and NQ). This ~34% miss rate is a hard architectural limit — entities that were not extracted during indexing cannot be retrieved through graph traversal.

**Hybrid integration wins:** Concatenating both RAG and GraphRAG retrieval results yields +6.4% improvement on multi-hop tasks over RAG alone, at 2x retrieval cost. This is the most reliable strategy for mixed query types.

These benchmarks are independently validated on standard datasets. The temporal reasoning gap (+23 points) is the clearest demonstration of where graph structure provides irreplaceable value. Microsoft's internal evaluations on their benchmark datasets are self-reported.

## Strengths

**Multi-hop reasoning over large corpora.** When an answer requires connecting entities across many documents — a company's subsidiaries across 200 annual reports, a person's relationships across a news archive — the graph traversal finds connections that embedding similarity over text chunks cannot.

**Temporal and comparison queries.** The benchmark shows +23 F1 points on temporal reasoning. Graph structure represents when events occurred and how entities changed state in ways that flat retrieval cannot.

**Corpus-wide sensemaking.** Global Search addresses a genuinely underserved use case: "what are the major themes in this 500-document corpus?" No amount of retrieval-over-chunks answers this well. Community summaries provide the abstraction level needed.

**Grounded, citable answers.** The graph traces every claim back to source text through the entity-chunk relationship, enabling citation.

## Critical Limitations

**Concrete failure mode — static corpus assumption.** GraphRAG's indexing pipeline is designed for batch processing of a fixed corpus. When documents are added, removed, or updated, the entire graph must be rebuilt: entity re-extraction, re-resolution, community re-detection, community report regeneration. There is no incremental update path in the core implementation. For knowledge bases that update daily or continuously (news archives, chat history, product documentation), this makes GraphRAG operationally untenable. The [Graphiti](../projects/graphiti.md) project (used by [Zep](../projects/zep.md)) was built specifically to address this with temporal edge invalidation and incremental community updates, but it is a separate architecture.

**Unspoken infrastructure assumption — LLM budget.** GraphRAG implicitly assumes you have a substantial LLM budget for indexing. The community report generation step alone generates one LLM call per community, and the Leiden algorithm can produce hundreds of communities for large corpora. Operators frequently discover the cost structure only after starting a large indexing run. The system does not surface upfront cost estimates.

## When NOT to Use GraphRAG

**Single-hop factual retrieval.** If your users ask "what does the contract say about termination clauses?" — questions that a single retrieved chunk can answer — GraphRAG adds cost and latency with no accuracy benefit. RAG wins by 1.77 F1 on single-hop tasks.

**Frequently updated knowledge bases.** Any corpus that changes faster than a weekly batch rebuild cycle is poorly served by GraphRAG's static indexing. Use [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md)'s temporal graph architecture instead.

**Small knowledge bases.** For corpora under ~50 documents, the community detection step finds minimal structure to exploit. Standard RAG is cheaper, simpler, and comparably accurate.

**Latency-sensitive applications.** Global Search's map-reduce over all community reports scales with corpus size, not query complexity. A large corpus means every query touches hundreds of community summaries. Not suitable for sub-second response requirements.

**Domains with specialized entity types.** The ~34% entity miss rate is the average across general domains. In technical, legal, or scientific text with specialized terminology, extraction quality degrades further. Test your extraction recall before committing to GraphRAG for domain-specific corpora.

## Unresolved Questions

**Community refresh scheduling.** The documentation does not specify how to handle community drift over time as documents are added. Periodic full rebuilds are implied but their frequency and cost implications at scale are not addressed.

**Optimal chunk size for extraction.** The default 600-token chunks are presented as a practical choice, but the RAG vs GraphRAG benchmark notes that smaller chunks extract more entities at higher cost. No guidance exists on the accuracy-cost tradeoff at different chunk sizes for different domain types.

**Global Search vs. Local Search routing.** The system requires the user to select the search mode. No automatic routing mechanism exists in the core implementation to choose based on query type. The benchmark confirms these modes are not interchangeable, but practitioners must implement their own query classifier.

**Multi-document graph merging.** RAGFlow's GraphRAG implementation notes that knowledge graph generation operates per-document, and cross-document graph merging is an open problem. The Microsoft implementation handles this through entity resolution, but resolution quality at scale (millions of entities) is not benchmarked publicly.

**Governance for enterprise multi-tenant use.** GraphRAG stores extracted entities, relationships, and LLM-generated community summaries. In multi-tenant environments, the data boundaries between tenant graphs are not addressed by the core project. This matters when sensitive documents from different organizational units share an indexing pipeline.

## Alternatives

**[RAPTOR](../projects/raptor.md)** — Hierarchical summarization through recursive clustering, then flattening into a single retrieval index. Lower indexing cost than GraphRAG (no graph construction), effective for hierarchical document structure, but does not capture entity relationships across documents. Use RAPTOR when your documents have natural hierarchy (books, documentation, papers) and your queries need summary-level context rather than entity relationship traversal.

**Standard [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) with [Hybrid Search](../concepts/hybrid-search.md)** — BM25 + dense retrieval with re-ranking. Use when queries are predominantly single-hop factual lookups, the corpus changes frequently, or budget is constrained. Outperforms GraphRAG on single-hop by ~2 F1 points at a fraction of the indexing cost.

**[Graphiti](../projects/graphiti.md) / [Zep](../projects/zep.md)** — Temporal knowledge graph with incremental updates and bi-temporal indexing. Use when the knowledge base evolves continuously (agent conversation history, live document feeds) and you need temporal reasoning over changing facts. Zep achieves 18.5% improvement over full-conversation baselines on LongMemEval. The architectural tradeoff is label propagation (incremental, cheaper) versus Leiden algorithm (better community structure, batch-only).

**[HippoRAG](../projects/hipporag.md)** — Integrates graph traversal with a personalized PageRank mechanism inspired by human associative memory. More retrieval-focused than GraphRAG's sensemaking orientation. Use when you need associative, multi-hop retrieval without the full community-detection infrastructure.

**Hybrid integration** — As the benchmark confirms, concatenating GraphRAG and RAG results yields the best accuracy (+6.4% on multi-hop) at 2x retrieval cost. For applications where accuracy matters more than cost, running both is the pragmatic choice.

## Related Concepts

- [Knowledge Graph](../concepts/knowledge-graph.md) — The underlying data structure GraphRAG constructs
- [Community Detection](../concepts/community-detection.md) — The Leiden algorithm step that creates the hierarchy
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — The baseline this extends
- [Semantic Search](../concepts/semantic-search.md) — Used in Local Search for entity identification
- [Vector Database](../concepts/vector-database.md) — Stores entity and community embeddings
- [Context Engineering](../concepts/context-engineering.md) — Community summaries and entity neighborhoods as assembled context
- [RAPTOR](../projects/raptor.md) — Alternative hierarchical approach
- [Graphiti](../projects/graphiti.md) — Temporal variant solving the static corpus problem
