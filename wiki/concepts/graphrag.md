---
entity_id: graphrag
type: approach
bucket: knowledge-bases
abstract: >-
  GraphRAG structures a document corpus as a knowledge graph with hierarchical
  community summaries, enabling global sensemaking queries that flat vector
  search cannot answer; its core advantage over standard RAG is multi-hop and
  temporal reasoning (+23 F1 points on temporal queries), at the cost of
  expensive offline graph construction.
sources:
  - repos/osu-nlp-group-hipporag.md
  - repos/topoteretes-cognee.md
  - repos/tirth8205-code-review-graph.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - raptor
  - openai
  - mcp
  - react
  - context-engineering
  - knowledge-graph
  - reflexion
  - letta
  - neo4j
  - agent-memory
  - hipporag
  - lightrag
last_compiled: '2026-04-07T11:39:39.208Z'
---
# GraphRAG

## What It Is

GraphRAG is a retrieval-augmented generation approach that builds a structured knowledge graph from a document corpus during indexing, then uses that graph at query time to answer questions requiring synthesis across many documents. Microsoft Research published the foundational paper in 2024 and released an open-source implementation at `aka.ms/graphrag`.

The central problem it solves: standard RAG retrieves chunks that are semantically similar to a query. That works for questions whose answers live in one chunk. It fails for questions like "What are the main themes across this corpus?" or "How have these entities' relationships evolved over time?" Those questions require synthesizing information distributed across hundreds of chunks, and similarity search cannot produce that synthesis.

GraphRAG's answer is to do the synthesis work offline, during indexing, and store the results in a graph with hierarchical community structure. At query time, the system uses precomputed community summaries rather than raw chunks, enabling corpus-wide answers with a fraction of the token cost.

## Core Mechanism

### Offline Indexing Pipeline

The indexing process runs in five stages:

**1. Chunking.** Documents split into 600-2400 token chunks. Smaller chunks (600 tokens) extract approximately 2x more entity references than larger chunks but require 4x more LLM calls. This tradeoff is configurable and workload-dependent.

**2. Entity and relationship extraction.** An LLM processes each chunk to identify typed entities (people, organizations, locations, events) and their relationships. A "gleaning" mechanism re-prompts the LLM on each chunk to improve recall — single-pass extraction misses a substantial fraction of entities.

**3. Element summarization.** Individual LLM-generated summaries for each entity and relationship.

**4. Leiden community detection.** The entity-relationship graph is partitioned using the Leiden algorithm, producing a hierarchy of communities:
- Level 0 (C0): Root communities — fewest, broadest scope
- Level 1 (C1): High-level sub-communities
- Level 2 (C2): Intermediate
- Level 3 (C3): Leaf communities — most numerous, most specific

**5. Community summarization.** Each community at every level receives an LLM-generated summary. Leaf summaries are built from member entities and relationships; parent summaries incorporate child summaries. This recursive process produces the hierarchical structure that enables multi-scale answers.

A 1M-token corpus produces a graph with ~8,000-15,000 entity nodes and ~19,000-20,000 edges (from the paper's two test datasets).

### Online Query: Map-Reduce Over Communities

At query time, GraphRAG does not traverse the graph. Instead:

1. Community summaries at the chosen hierarchy level are collected.
2. Shuffled and packed into fixed-size chunks (~8K tokens, which the paper identifies as optimal — larger windows do not improve answer quality).
3. Each chunk sent to the LLM with the query, producing a partial answer and a 0-100 helpfulness score.
4. Partial answers sorted by score, assembled into a final context window.
5. LLM generates the final answer.

This map-reduce pattern parallelizes across community chunks and provides cost control — you can cap how many community summaries you process. Root-level (C0) queries use 9-43x fewer tokens than processing raw source text, making iterative corpus exploration practical.

### Local vs. Global Search

Microsoft's implementation ships two retrieval modes:

**Global search** (the map-reduce approach above): For corpus-wide sensemaking — themes, patterns, entity prevalence across the whole corpus. This is what the paper's benchmarks primarily evaluate.

**Local search**: Entity neighborhood retrieval for specific factual queries. Finds entities relevant to the query, then retrieves their neighbors and associated source text. Better for "Tell me about entity X" than for "What are the main themes?"

## Key Numbers

The paper's benchmark uses two ~1M-token datasets (podcast transcripts, news articles) with 125 sensemaking questions per dataset. Evaluation uses LLM-as-judge with head-to-head comparisons.

**GraphRAG vs. naive RAG (semantic search):**
- Comprehensiveness win rate: 72-83% in favor of GraphRAG
- Diversity win rate: 62-82% in favor of GraphRAG
- Directness: naive RAG wins (GraphRAG produces longer, more synthesized answers)

**GraphRAG vs. source text summarization (map-reduce without a graph):**
- Comprehensiveness win rate: 53-64% in favor of GraphRAG
- This is the paper's most important finding: the graph provides only modest quality gains over running map-reduce on raw text chunks without any graph structure.

[Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)

**From the comparative benchmark (RAG vs. GraphRAG systematic evaluation):**

Single-hop factual queries (NQ dataset, Llama 70B F1):
- RAG: 68.18
- GraphRAG (Local): 65.44 — RAG wins by 2.74 points

Multi-hop reasoning (HotPotQA, Llama 70B F1):
- RAG: 63.88
- GraphRAG (Local): 64.60 — GraphRAG wins by 0.72 points

Temporal reasoning queries (MultiHop-RAG):
- RAG: 25.73
- GraphRAG (Local): 49.06 — GraphRAG wins by 23.33 points

Hybrid (concatenating both retrieval results): +6.4% over RAG baseline on multi-hop tasks.

[Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**Credibility note:** The LLM-as-judge evaluation used in the original paper has a documented position bias problem — reversing the presentation order of outputs can invert preference judgments. Results favoring comprehensiveness and diversity should be treated as indicative rather than definitive. F1 scores from the second paper use ground-truth labels, which are more reliable.

## Strengths

**Multi-hop and temporal reasoning.** Graph structure captures entity relationships that flat text retrieval misses. The 23-point F1 gap on temporal reasoning queries is the most reliable finding across evaluations. If your knowledge base needs to answer "What changed between X and Y?" or "How are entities A and B related through C?", GraphRAG provides gains that are hard to replicate with retrieval over flat chunks.

**Corpus-scale sensemaking.** No other retrieval paradigm answers "What are the main themes in this 500-document corpus?" efficiently. The hierarchical community structure makes this tractable at multiple levels of granularity.

**Token efficiency at root level.** C0 community queries use 9-43x fewer tokens than processing raw source text. For iterative corpus exploration — where you start broad and drill into specifics — this efficiency is significant.

**Source traceability.** Graph edges link back to the source chunks from which entities and relationships were extracted. Answers can cite specific passages.

## Critical Limitations

**The entity extraction ceiling.** Only 65.8% of answer-relevant entities end up in constructed knowledge graphs (HotPotQA benchmark). This ~34% miss rate is a hard architectural ceiling: if an entity was not extracted during indexing, graph retrieval cannot find it. This miss rate is likely worse for specialized domains with technical terminology, domain jargon, or non-standard entity types.

**The graph-free baseline is surprisingly strong.** Running map-reduce over raw text chunks without any graph achieves 53-64% win rates against the full GraphRAG approach — not 0%. The graph's primary contribution is enabling hierarchical exploration and multi-scale querying, not dramatically better raw answer quality. Before building and maintaining a graph index, test whether simple map-reduce over your corpus already meets your quality bar.

## When NOT to Use It

**Single-hop factual retrieval.** Standard RAG outperforms GraphRAG on single-hop factual queries by 2-3 F1 points. If your users primarily ask "What does document X say about Y?", the graph adds indexing cost and maintenance complexity without improving answers.

**Frequently updated corpora.** The Leiden community detection algorithm requires recomputing communities when the graph changes significantly. For corpora updated daily or in real time, incremental graph updates are complex and the community structure drifts from optimal without periodic full recomputation. [Graphiti](../projects/graphiti.md) (used by [Zep](../projects/zep.md)) addresses this with label propagation for dynamic updates, at some community quality cost.

**Resource-constrained deployments.** Graph indexing requires many LLM calls per chunk (extraction plus gleanings plus summarization). For a 1M-token corpus at GPT-4 pricing, indexing costs are non-trivial. If your corpus will receive few queries, indexing cost may exceed the lifetime value of improved retrieval.

**When you need specific, direct answers.** GraphRAG's synthesized community summaries produce comprehensive but verbose answers. Queries expecting a specific date, number, or name are better served by RAG.

## Unresolved Questions

**Hallucination compounding.** The indexing pipeline runs two LLM stages: entity extraction from chunks, then community summarization from entities. Errors compound across stages. The original paper explicitly does not apply hallucination detection (SelfCheckGPT or similar). Nobody has published systematic analysis of how entity extraction hallucination rates affect downstream answer accuracy.

**Cost at scale.** The paper tests corpora up to ~1M tokens. For 10-100M token corpora (a reasonable enterprise knowledge base), community structure, extraction costs, and graph properties are unstudied. The token efficiency advantage may diminish or the community structure may become too coarse to be useful at large scale.

**Optimal chunk size.** Smaller chunks (600 tokens) extract 2x more entities but at 4x more LLM cost. The paper does not provide a recommendation on where to land in this tradeoff for different domain types.

**Community refresh scheduling.** Dynamic corpus updates degrade community structure over time. Neither the paper nor the open-source implementation specifies how often full recomputation is needed, or what signal to use to detect that communities have drifted.

**Domain-specific extraction quality.** The ~34% entity miss rate is measured on general-domain corpora (news, podcasts). Technical domains (code repositories, legal documents, medical literature) likely have higher miss rates and may require custom extraction prompts or fine-tuned models.

## Implementations

**Microsoft GraphRAG** (`aka.ms/graphrag`): The original open-source implementation. Supports both global and local search. Python-based, integrates with Azure OpenAI and OpenAI APIs.

**RAGFlow** (`infiniflow/ragflow`): Production RAG engine that incorporates GraphRAG as one of several retrieval modes alongside RAPTOR hierarchical summarization and hybrid dense/sparse search. Adds entity resolution via LLM-based deduplication (addresses the duplicate entity problem in the original GraphRAG), reduces extraction LLM calls (documents submitted once rather than multiple times), and stores graphs in Elasticsearch alongside chunks. GraphRAG in RAGFlow currently operates per-document only — cross-document graph merging is not yet implemented. [Source](../raw/deep/repos/infiniflow-ragflow.md)

**HippoRAG** ([HippoRAG](../projects/hipporag.md)): Graph-based RAG approach that models retrieval after the hippocampal memory indexing theory, using knowledge graphs differently than Microsoft's community-based approach.

**LightRAG** ([LightRAG](../concepts/graphrag.md)): Lighter-weight graph RAG implementation focused on reducing indexing cost.

**Graphiti / Zep** ([Zep](../projects/zep.md)): A temporally-aware knowledge graph specifically designed for agent memory rather than document corpus search. Uses bi-temporal indexing (event time and transaction time) to track how facts change over time. Achieves 18.5% accuracy improvement and 90% latency reduction on complex temporal queries versus full-conversation baselines. Label propagation instead of Leiden enables incremental updates for streaming data. The architecture overlaps with GraphRAG's entity-relationship graph but solves a different problem: evolving conversational memory versus static corpus indexing. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Alternatives

| Scenario | Better Choice |
|----------|--------------|
| Single-hop factual retrieval | Standard [RAG](../concepts/rag.md) with [hybrid search](../concepts/hybrid-search.md) (dense + BM25) |
| Dynamic/streaming knowledge base | [Graphiti](../projects/graphiti.md) with label propagation for incremental updates |
| Global corpus synthesis on a budget | Map-reduce over raw text chunks (graph-free baseline from the paper) |
| Long conversational memory with temporal evolution | [Zep](../projects/zep.md) / Graphiti architecture |
| Hierarchical document retrieval over static corpora | [RAPTOR](../projects/raptor.md) (recursive abstractive summarization without a graph) |
| Hybrid approach | Concatenate RAG + GraphRAG results — +6.4% on multi-hop with predictable cost |

## Relationship to Adjacent Concepts

GraphRAG implements [Knowledge Graph](../concepts/knowledge-graph.md) construction and querying as part of a [RAG](../concepts/rag.md) pipeline. It extends standard RAG with graph structure and complements [Agentic RAG](../concepts/agentic-rag.md) by providing richer context for agent reasoning steps. The community summary approach enables a form of [Progressive Disclosure](../concepts/progressive-disclosure.md) — answering at broad granularity first (C0), then drilling to specifics (C3). The entity extraction step relies on [Entity Extraction](../concepts/entity-extraction.md) techniques and interfaces with [Agent Memory](../concepts/agent-memory.md) systems when used in agentic pipelines. [Neo4j](../projects/neo4j.md) is a common storage backend for the graph structure.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — extends (0.8)
- [RAPTOR](../projects/raptor.md) — alternative_to (0.6)
- [OpenAI](../projects/openai.md) — created_by (0.7)
- [Model Context Protocol](../concepts/mcp.md) — part_of (0.4)
- [ReAct](../concepts/react.md) — part_of (0.4)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.5)
- [Knowledge Graph](../concepts/knowledge-graph.md) — implements (0.9)
- [Reflexion](../concepts/reflexion.md) — part_of (0.3)
- [Letta](../projects/letta.md) — part_of (0.3)
- [Neo4j](../projects/neo4j.md) — part_of (0.6)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.5)
- [HippoRAG](../projects/hipporag.md) — competes_with (0.6)
- LightRAG — competes_with (0.6)
