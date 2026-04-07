---
entity_id: knowledge-graph
type: concept
bucket: knowledge-bases
abstract: >-
  A structured graph of entities and relationships used to store queryable
  factual knowledge; differentiates from vector stores by enabling multi-hop
  reasoning, temporal validity tracking, and relationship traversal over raw
  semantic similarity.
sources:
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - repos/getzep-graphiti.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/aiming-lab-simplemem.md
  - repos/topoteretes-cognee.md
  - repos/origintrail-dkg-v9.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
related:
  - rag
  - openai
  - cursor
  - mcp
  - graphiti
  - zep
  - entity-extraction
  - claude-code
  - openclaw
  - neo4j
  - agent-memory
  - hybrid-search
  - embedding-model
  - decision-traces
  - knowledge-base
  - graphrag
last_compiled: '2026-04-07T11:40:45.623Z'
---
# Knowledge Graph

## What It Is

A knowledge graph represents information as a network of entities (nodes) and typed relationships (edges) between them. A node might be "Alice". An edge connects her to "Google" via `WORKS_AT`. That edge can also carry metadata: when the relationship started, when it ended, which source established it.

This structure originated in database theory and semantic web research (think RDF, SPARQL, and early systems like Freebase and DBpedia). In the LLM agent context, the same structure solves a different problem: how does an agent remember facts across sessions, update beliefs when new information arrives, and answer questions that require connecting multiple pieces of information that no single document contains?

The alternative is flat retrieval: embed your documents, store vectors, query by cosine similarity. This works for single-hop factual lookup. It fails when the answer requires traversing relationships, reasoning across time, or combining information from separate sources.

## How It Works

### Basic Structure

Every knowledge graph has three components:
- **Nodes**: entities with types (Person, Organization, Location) and attributes
- **Edges**: typed relationships between nodes (WORKS_AT, LOCATED_IN, REPORTS_TO) with attributes
- **An index**: typically a combination of vector embeddings, full-text search, and graph traversal structures

The relationship type is the critical addition over plain vector stores. It lets you query "what organizations employ people who report to Alice?" without writing that question in natural language -- you traverse edges.

### Construction from Text

Raw text doesn't arrive as triples. A construction pipeline extracts them.

[HippoRAG](../projects/hipporag.md) runs a two-pass OpenIE pipeline: first a named entity recognition pass, then a triple extraction pass conditioned on the extracted entities. Conditioning the second pass on known entities reduces hallucinated relations. Results get cached to a JSON file (`openie_results_ner_{model_name}.json`) and the system skips previously processed chunks on re-indexing.

[Graphiti](../projects/graphiti.md) uses a five-stage LLM pipeline per episode: extract entities, deduplicate against existing nodes, extract edges, resolve contradictions, update summaries. Each stage uses a separate LLM call with Pydantic structured output. Stage 2 (deduplication) handles semantic equivalence -- "NYC" and "New York City" resolve to the same node via combined cosine similarity, full-text name matching, and an LLM cross-encoder judgment.

Both approaches suffer the same ceiling: the extraction pipeline is lossy. Research comparing RAG and GraphRAG found that only ~65.8% of answer-relevant entities end up in constructed knowledge graphs, meaning a hard 34% miss rate on entities before retrieval even begins. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

### Querying

Once built, a knowledge graph supports retrieval methods unavailable to flat vector search:

**Graph traversal (BFS/PPR)**: Start from query-relevant entity nodes and propagate relevance through edges. HippoRAG uses Personalized PageRank for this, starting from entities matching the query and walking the graph to discover transitively relevant documents. Graphiti implements breadth-first traversal up to n-hops as one of its three parallel search methods.

**Multi-hop reasoning**: A query about "the employer of Alice's manager" requires following two edges. Embedding similarity over text chunks may find neither document on its own. Graph traversal follows the edges explicitly.

**Temporal queries**: Edges with `valid_at` and `invalid_at` timestamps answer "what was Alice's employer in 2022?" -- something a vector store cannot express without document-level filtering.

**Synonymy edges**: HippoRAG adds a second class of edges connecting semantically similar entity nodes (above a cosine similarity threshold). This handles entity surface variation -- "Obama" and "Barack Obama" get connected, so retrieval starting from either finds the same documents.

### Storage

Common backends:
- **[Neo4j](../projects/neo4j.md)**: The dominant production choice. Supports Cypher, APOC procedures, vector indices for hybrid search, full-text Lucene indices. Graphiti defaults to Neo4j 5.26+.
- **In-memory graph (igraph/networkx)**: HippoRAG stores its graph as a Python Pickle file -- fast for development, not queryable externally, not portable across Python versions.
- **FalkorDB, Kuzu, Amazon Neptune**: Alternative backends in Graphiti with separate operation implementations for each.

The choice of backend determines whether you can query the graph externally, integrate it with existing data infrastructure, or run it without external services.

## Why It Matters for LLM Agents

Agents need memory that persists across sessions, updates when facts change, and supports queries that single-document retrieval cannot answer. Knowledge graphs address each:

**Cross-session information synthesis**: An agent managing a customer relationship needs to connect information from last month's support ticket, last week's sales call, and today's invoice dispute. The graph connects these through shared entity nodes (the customer, the product, the ticket) rather than requiring all three documents to appear in a single semantic similarity search result.

**Knowledge updates**: When Alice changes employers, a flat memory store requires deleting or overwriting the old fact. A knowledge graph with temporal edges can expire the old `WORKS_AT` edge and add a new one, preserving the historical record. Graphiti's bi-temporal model carries four timestamps per edge: transaction time (when the system learned it) and event time (when it was actually true). [Source](../raw/deep/repos/getzep-graphiti.md)

**Multi-hop reasoning**: Research on RAG vs. GraphRAG found a 23.33 F1-point advantage for graph-based retrieval on temporal queries and a consistent advantage on comparison and multi-hop questions. On single-hop factual lookups, plain RAG is slightly better. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

## Who Implements It

**[Graphiti](../projects/graphiti.md)**: The most architecturally complete implementation. Bi-temporal edges, community detection via label propagation, hybrid search (cosine + BM25 + BFS), Pydantic structured output throughout, four graph database backends. Powers [Zep](../projects/zep.md)'s memory layer. The Zep paper reports 18.5% accuracy improvement and 90% latency reduction on LongMemEval vs. full-context baseline.

**[HippoRAG](../projects/hipporag.md)**: Research-oriented, biologically inspired. Uses Personalized PageRank for retrieval, DSPy-optimized recognition memory filter, synonymy edges for entity normalization. Designed for multi-hop QA over document corpora rather than conversational memory. Targets MuSiQue, HotpotQA, 2WikiMultiHopQA benchmarks.

**[GraphRAG](../concepts/graphrag.md)**: Microsoft's batch-processing approach. Constructs hierarchical community summaries via Leiden algorithm. Strong on corpus-wide summarization queries; slow to update (requires full reprocessing). Research shows its "Global" search mode significantly underperforms on factual QA tasks (45-55% vs 60-68% F1).

**Cognee**: Combines vector search, graph databases, and cognitive science framing. Targets continuous learning -- knowledge evolves as data changes. 14,900 GitHub stars. [Source](../raw/repos/topoteretes-cognee.md)

**[LangChain](../projects/langchain.md)/[LlamaIndex](../projects/llamaindex.md)**: Both provide graph retrieval integrations and entity extraction tooling, but as higher-level abstractions over graph databases rather than purpose-built knowledge graph systems.

## Relationship to Other Retrieval Approaches

Knowledge graphs occupy a specific position relative to other retrieval architectures:

**vs. [Vector Database](../concepts/vector-database.md)**: Vector search finds documents semantically similar to a query. Knowledge graphs find entities and relationships reachable from query-relevant entities through typed edges. The approaches are complementary -- [Hybrid Search](../concepts/hybrid-search.md) over both consistently outperforms either alone. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**vs. [RAG](../concepts/rag.md)**: RAG retrieves document chunks. Knowledge graphs retrieve entities, relationships, and the documents that mention them. GraphRAG adds graph-based retrieval on top of traditional RAG, gaining multi-hop reasoning at the cost of extraction complexity and indexing latency.

**as [Agent Memory](../concepts/agent-memory.md)**: Knowledge graphs implement a form of [Semantic Memory](../concepts/semantic-memory.md) -- structured facts about the world rather than episodic memory (what happened in session 3) or procedural memory (how to do a task). Graphiti's three-tier architecture explicitly models this distinction: episodic nodes store raw data, semantic entity nodes store extracted facts, community nodes store higher-level summaries.

## Strengths

**Multi-hop reasoning**: Graph traversal finds answers requiring connections across multiple documents. Research confirms +1-6% improvement on multi-hop QA tasks over RAG alone, and +23 F1 points on temporal reasoning.

**Temporal consistency**: Bi-temporal models (valid_at, invalid_at, created_at, expired_at) enable precise time-travel queries and correct handling of conflicting information over time. This is a genuine advantage unavailable in flat memory systems.

**Relationship queries**: Typed edges support queries that natural language retrieval cannot express -- "find all entities two hops from X of type Y." 

**Explainability**: Graph retrieval produces an explicit reasoning path. You can show which entities and edges led to the retrieved facts, unlike embedding similarity which produces a score with no interpretable chain.

## Critical Limitations

**Entity extraction is the hard ceiling**: The ~34% entity miss rate from construction pipelines means graph-based retrieval cannot recover what the LLM failed to extract. Specialized domains (medical terminology, legal jargon, technical abbreviations) have worse extraction quality than general language. Extraction quality is model-dependent -- switching from GPT-4o-mini to a weaker model degrades graphs measurably.

**Infrastructure assumption**: Production knowledge graph systems require a dedicated graph database (Neo4j, FalkorDB, etc.) as a persistent service. This is not optional for non-trivial scale. In-memory graph storage (like HippoRAG's Pickle-based igraph) cannot survive process restarts and breaks for corpora producing millions of entity nodes. Anyone evaluating knowledge graphs from documentation alone may underestimate this operational dependency.

**Indexing cost at scale**: A single `add_episode` call in Graphiti makes 4-5 LLM API calls minimum. For high-volume ingestion, this translates to substantial cost and latency. Graphiti's README explicitly recommends running ingestion as a background task, not in a request path. For read-heavy workloads with rare updates, this is acceptable; for real-time ingestion at volume, it requires architecture work.

## When Not to Use It

**Single-hop factual lookup on static corpora**: Plain RAG with vector search is faster, simpler, and slightly more accurate (64.78 vs 63.01 F1 on NQ). If your queries mostly look like "what does document X say about Y?", the knowledge graph overhead delivers no benefit.

**Frequently updated corpora with strict latency requirements**: Knowledge graph construction is inherently more expensive than embedding-based indexing. If your knowledge base changes continuously and query latency must be under 100ms end-to-end, knowledge graphs add operational complexity without proportional retrieval gains.

**Teams without graph database expertise**: Neo4j requires Cypher, APOC configuration, index management, and operational knowledge that differs from relational or vector databases. Choosing a knowledge graph architecture commits you to this operational stack.

## Unresolved Questions

**Extraction quality at scale**: No published benchmark covers entity extraction recall across diverse enterprise domains. The 34% miss rate comes from general QA datasets (HotpotQA, NQ). The miss rate for specialized domains is unknown and likely worse.

**Community detection drift**: Graphiti's label propagation is incremental -- new entities join existing communities without full recomputation. The paper acknowledges this causes gradual divergence from optimal clustering but does not specify when or how to detect that a full refresh is needed.

**Cost at production scale**: Neither Graphiti nor HippoRAG publishes cost benchmarks for realistic enterprise ingestion volumes. The per-episode LLM call count for Graphiti (minimum 4-5, more with community updates) needs multiplication by actual ingestion volume to size infrastructure.

**Contradiction resolution reliability**: Edge invalidation in Graphiti relies on an LLM call to determine whether a new fact contradicts an existing edge. If the LLM misses a contradiction, stale edges persist as valid. There is no deterministic contradiction-checking layer; accuracy depends entirely on LLM consistency.

## Alternatives

**Use [RAG](../concepts/rag.md) when** queries are predominantly single-hop and the corpus is static. Simpler to operate, better performance on factual lookup.

**Use [Hybrid Search](../concepts/hybrid-search.md) (RAG + knowledge graph)** when you have multi-hop and single-hop queries in the same system. Research shows +4-6% improvement over either approach alone.

**Use [Graphiti](../projects/graphiti.md)** when you need conversational memory with temporal validity across sessions. Purpose-built for this, with the strongest production tooling.

**Use [HippoRAG](../projects/hipporag.md)** when you need multi-hop QA over a document corpus, with biologically-inspired retrieval. Research-oriented, good for benchmarking.

**Use [GraphRAG](../concepts/graphrag.md)** when you need corpus-wide summarization rather than factual QA. Its Global search mode is designed for synthesis, not lookup.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Entity Extraction](../concepts/entity-extraction.md)
- [Hybrid Search](../concepts/hybrid-search.md)
- [Vector Database](../concepts/vector-database.md)
- [GraphRAG](../concepts/graphrag.md)
- [Embedding Model](../concepts/embedding-model.md)
- [Decision Traces](../concepts/decision-traces.md)

## Related Projects

- [Graphiti](../projects/graphiti.md)
- [Zep](../projects/zep.md)
- [HippoRAG](../projects/hipporag.md)
- [Neo4j](../projects/neo4j.md)
- [LLM Knowledge Base](../concepts/knowledge-base.md)
