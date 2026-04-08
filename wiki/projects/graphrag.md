---
entity_id: graphrag
type: project
bucket: knowledge-substrate
abstract: >-
  Microsoft's GraphRAG builds knowledge graphs from documents using LLM-based
  entity extraction and hierarchical community detection, enabling multi-hop
  reasoning and global summarization that flat vector search cannot support.
sources:
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/infiniflow-ragflow.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - repos/osu-nlp-group-hipporag.md
  - repos/tirth8205-code-review-graph.md
related:
  - retrieval-augmented-generation
  - knowledge-graph
  - community-detection
  - raptor
  - claude-code
  - episodic-memory
last_compiled: '2026-04-08T22:58:52.291Z'
---
# GraphRAG

## What It Does

GraphRAG is Microsoft Research's retrieval-augmented generation system that converts document corpora into knowledge graphs, then queries those graphs rather than raw text chunks. The core bet: for questions requiring synthesis across multiple documents ("What are the major themes in this corpus?" or "How did company X's strategy evolve over three years?"), flat vector search returns locally relevant chunks that lack the cross-document connective tissue needed for a coherent answer. Graph structure captures that connective tissue.

The system has two retrieval modes with distinct use cases:

- **Local search**: Entity-neighborhood traversal for specific, targeted questions ("What do we know about person X?")
- **Global search**: Map-reduce over community summaries for corpus-wide questions ("What are the main themes across all these documents?")

This distinction is the architecture's most important design choice. Most RAG systems optimize for one query type. GraphRAG explicitly accommodates both, with different pipelines.

[Source: RAG vs GraphRAG systematic evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

## Architectural Mechanism

### Indexing Pipeline

GraphRAG's indexing runs in `graphrag/index/` and proceeds in roughly five stages:

**1. Text extraction and chunking.** Source documents get split into chunks (configurable, but the original paper tested 600-token chunks vs 2400-token chunks). Smaller chunks extract 2x more entities but require 4x more LLM calls — a direct cost-quality tradeoff with no free lunch.

**2. Entity and relationship extraction.** Each chunk gets passed to an LLM with a prompt asking it to identify named entities (people, organizations, locations, events) and the relationships between them. Output: `(entity, relationship, entity)` triplets plus text descriptions. This is the most expensive step and the pipeline's primary bottleneck.

**3. Entity resolution.** Duplicate entities get merged — "Microsoft Corp." and "Microsoft" should be the same node. The original GraphRAG implementation handled this through LLM-based deduplication. Third-party implementations (RAGFlow, HippoRAG) improve on this using embedding similarity, since the base implementation treats synonyms as distinct nodes.

**4. Community detection.** NetworkX runs the Leiden algorithm over the entity graph to find clusters of densely connected entities. The Leiden algorithm produces hierarchical community structure — communities of communities — at configurable resolutions. Each community gets an LLM-generated summary describing the key entities and relationships within it.

**5. Index storage.** Entities, relationships, community assignments, and community reports get written to Parquet files (or a configurable graph store). The community summaries are embedded for vector retrieval during global search.

Key files: `graphrag/index/pipeline/run.py` (pipeline orchestration), `graphrag/index/graph/extractors/` (entity/relationship extraction), `graphrag/index/graph/community_reports/` (summary generation).

### Query Pipeline

**Local search** (`graphrag/query/structured_search/local_search/`): Takes a query, finds the most relevant entities via vector similarity, then expands outward through the graph to collect neighboring entities, relationships, and the community reports covering those entities. Assembles this neighborhood into context for generation. Works well for specific entity-centric questions.

**Global search** (`graphrag/query/structured_search/global_search/`): Map-reduce architecture. The map phase generates partial answers from each community report in parallel. The reduce phase synthesizes those partial answers into a final response. This is designed for questions with no single correct location in the graph — questions about themes, patterns, or corpus-wide trends. It is also the most expensive retrieval mode: O(communities) LLM calls per query.

[Source: RAG vs GraphRAG systematic evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

## Key Numbers

**GitHub**: ~25,000 stars (as of mid-2025). Credibility: independently observable.

**Benchmark performance** (from Han et al. systematic evaluation, independently run, not Microsoft self-reported):

| Query Type | RAG F1 | GraphRAG Local F1 | Winner |
|---|---|---|---|
| Single-hop (NQ) | 64.78 | 63.01 | RAG (+1.77) |
| Multi-hop (HotPotQA) | 63.88 | 64.60 | GraphRAG (+0.72) |
| Temporal reasoning | 25.73 | 49.06 | GraphRAG (+23.33) |
| Comparison | 56.31 | 60.16 | GraphRAG (+3.85) |

The temporal reasoning gap is the most striking: +23.33 F1 points. Graph structure captures temporal relationships that text chunk similarity misses entirely.

**Entity extraction miss rate**: ~34% of answer-relevant entities are not present in constructed knowledge graphs (measured on HotPotQA and NQ). This is a hard ceiling — if the entity was not extracted, graph retrieval cannot find it. This figure is from the Han et al. evaluation, not Microsoft's own reporting.

**Hybrid integration**: Concatenating RAG + GraphRAG retrieval yields +6.4% over RAG baseline on multi-hop tasks. The simplest combination strategy consistently outperforms either alone.

[Source: RAG vs GraphRAG systematic evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

## Strengths

**Multi-hop reasoning.** When answering a question requires connecting information across documents — "Companies that supply to X and also partner with Y" — graph traversal finds these connections directly. Vector search returns chunks about X and chunks about Y but provides no machinery for combining them.

**Global sensemaking.** The community-summary map-reduce pipeline handles "what are the main themes?" questions that have no correct retrieval location. This is a genuinely new capability that flat RAG systems cannot replicate.

**Temporal reasoning.** The +23-point F1 advantage on temporal queries suggests graph structure captures event sequences and time-bounded relationships in ways that embedding similarity does not. For knowledge bases tracking how situations evolve over time, this matters.

**Traceability.** Every entity and relationship traces back to source text chunks. Answers include citations to the exact document passages that support them.

**Composability with flat RAG.** The systems are complementary, not mutually exclusive. Running both and concatenating results yields consistent improvements with predictable cost (2x retrieval calls).

## Critical Limitations

**The ~34% entity extraction ceiling is structural, not fixable by tuning.** If the LLM-based extraction pipeline misses an entity — due to ambiguous phrasing, unusual formatting, domain-specific jargon, or simply LLM inconsistency — that entity does not exist in the graph. No retrieval strategy can find what the index does not contain. For specialized domains (medical, legal, technical), the miss rate is likely higher than the 34% measured on general-purpose QA benchmarks.

**Unstated infrastructure assumption: indexing cost scales with corpus × chunk size, not just corpus size.** The 600-token vs 2400-token chunk comparison (2x entities, 4x LLM calls) illustrates that every indexing decision multiplies LLM costs. A 10,000-document corpus with 600-token chunks at GPT-4 prices can easily exceed $500-1000 in indexing costs before a single query runs. The original Microsoft paper and most documentation do not foreground this. Teams expecting "run it on our document collection" without a cost estimate get surprised.

## When NOT to Use It

**Single-hop factual retrieval.** RAG outperforms GraphRAG on NQ-style single-hop questions. If your queries are primarily "find the document that contains the answer to this specific question," the graph construction overhead buys nothing and the ~34% extraction miss rate actively hurts recall.

**Real-time or frequently updated corpora.** Rebuilding community structure when documents are added or modified requires rerunning the Leiden algorithm and regenerating community reports — expensive operations that do not support incremental updates gracefully. For knowledge bases where documents change weekly or more often, the indexing overhead makes GraphRAG impractical without significant engineering to support partial rebuilds.

**Resource-constrained deployments.** The indexing pipeline requires many LLM calls (entity extraction per chunk + community report generation), substantial storage (entities, relationships, community reports, embeddings of all of the above), and NetworkX graph operations that are memory-intensive for large corpora. Not suitable for local-first, low-resource setups.

**Short documents or small corpora.** GraphRAG's advantages emerge from cross-document synthesis. For corpora under ~100 documents or for documents short enough that a single chunk captures complete context, the overhead of graph construction yields minimal benefit.

**Questions about what an AI assistant said previously.** One benchmark measured -17.7% performance on retrieving assistant-generated content (vs user-stated facts). Entity extraction pipelines are systematically biased toward extracting facts stated by users, not content generated by the system. If your use case requires agents to reference their own prior outputs, GraphRAG's extraction pipeline will underserve that retrieval need.

[Source: RAG vs GraphRAG systematic evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

## Unresolved Questions

**Community drift in dynamic graphs.** The Leiden algorithm produces a static partition. When new entities are added incrementally (using label propagation as in [Zep](../projects/zep.md)/[Graphiti](../projects/graphiti.md)), communities drift from the optimal partition over time. Microsoft's documentation does not specify when full recomputation is needed or what drift rate is acceptable before retrieval quality degrades.

**Cost at scale with production query volumes.** Global search runs O(communities) LLM calls per query. For a large corpus with thousands of communities, global search on every user query becomes expensive. The documentation does not provide guidance on community count ceilings, query cost estimation, or caching strategies for community summaries.

**Cross-document entity resolution quality.** The base implementation handles within-document entity resolution. Whether "Microsoft" in document A and "Microsoft Corporation" in document B get merged depends on the LLM deduplication step, which is known to be brittle for synonyms and aliases. RAGFlow and HippoRAG have improved on this with embedding-similarity-based resolution, but the base GraphRAG package has not published a systematic evaluation of resolution accuracy.

**Evaluation methodology sensitivity.** The Han et al. evaluation found that LLM-as-judge evaluations show strong position bias — reversing the presentation order of RAG vs GraphRAG outputs can invert preference judgments. ROUGE/BERTScore favor RAG; LLM judges favor GraphRAG's diversity. This means the choice of evaluation metric predetermines which system wins. GraphRAG's reported advantages on qualitative assessments may partially reflect evaluation methodology rather than answer quality.

## Alternatives and Selection Guidance

**Use [RAPTOR](../projects/raptor.md) when** you want hierarchical summarization without graph construction overhead. RAPTOR clusters chunks via UMAP + GMM and recursively summarizes them, producing a tree structure that enables multi-resolution retrieval. No entity extraction, no relationship graph, substantially cheaper indexing. RAGFlow integrates both RAPTOR and GraphRAG, allowing you to compare them on your corpus.

**Use [HippoRAG](../projects/hipporag.md) when** you want GraphRAG-style entity graphs with better entity resolution. HippoRAG's implementation uses embedding similarity for entity deduplication, directly addressing the synonym-as-distinct-nodes failure mode in base GraphRAG.

**Use [Zep](../projects/zep.md)/[Graphiti](../projects/graphiti.md) when** your use case is agent memory with temporal reasoning over conversation history rather than document corpus indexing. Zep's three-tier architecture (episodes → semantic entities → communities) with bi-temporal indexing is designed for continuously updated agent memory, supporting incremental updates via label propagation. GraphRAG is designed for static or infrequently updated document corpora. See [Episodic Memory](../concepts/episodic-memory.md) and [Knowledge Graph](../concepts/knowledge-graph.md).

**Use [LlamaIndex](../projects/llamaindex.md) when** you need maximum flexibility in retrieval strategy composition and want to implement hybrid RAG + graph retrieval with custom components. LlamaIndex provides the building blocks; GraphRAG provides an opinionated end-to-end pipeline.

**Use flat [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) with [Hybrid Search](../concepts/hybrid-search.md) when** your queries are primarily single-hop factual lookups. The simpler system outperforms GraphRAG on this query type and costs far less to index and maintain.

**Use both (integrated)** when query type is mixed and latency tolerates 2x retrieval calls. Concatenating RAG and GraphRAG retrieval results before generation is the simplest strategy and yields consistent +4-6% gains on multi-hop tasks.

[Source: RAG vs GraphRAG systematic evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) | [Source: Context Engineering survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) | [Source: RAGFlow architecture](../raw/deep/repos/infiniflow-ragflow.md)

---

*Related: [Knowledge Graph](../concepts/knowledge-graph.md) · [Community Detection](../concepts/community-detection.md) · [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) · [RAPTOR](../projects/raptor.md) · [HippoRAG](../projects/hipporag.md) · [Graphiti](../projects/graphiti.md) · [Zep](../projects/zep.md) · [Hybrid Search](../concepts/hybrid-search.md) · [Agentic RAG](../concepts/agentic-rag.md)*


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — extends (0.8)
- [Knowledge Graph](../concepts/knowledge-graph.md) — implements (0.8)
- [Community Detection](../concepts/community-detection.md) — implements (0.8)
- [RAPTOR](../projects/raptor.md) — competes_with (0.6)
- [Claude Code](../projects/claude-code.md) — implements (0.4)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.4)
