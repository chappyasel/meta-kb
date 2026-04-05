---
entity_id: knowledge-graph
type: concept
bucket: knowledge-bases
sources:
  - repos/aiming-lab-simplemem.md
  - repos/osu-nlp-group-hipporag.md
  - repos/caviraoss-openmemory.md
  - repos/topoteretes-cognee.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/michaelliv-napkin.md
  - deep/repos/topoteretes-cognee.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T05:26:45.262Z'
---
# Knowledge Graph

## What It Is

A knowledge graph (KG) is a data structure that represents entities as nodes and relationships between them as typed, directed edges. Rather than storing facts as isolated records, a KG encodes the *connections* between facts. "Alice works at Acme Corp, which is headquartered in Berlin, which is in Germany" becomes a traversable path through a graph rather than three separate rows in a table.

The term gained traction when Google announced its Knowledge Graph in 2012, but the underlying formalism predates that by decades — semantic networks, RDF triples, and ontologies from the 1970s-2000s are conceptual predecessors. The current wave of interest comes from a specific problem: vector embeddings are good at similarity search but bad at structured reasoning. A knowledge graph provides the complement.

## Why It Matters for AI Systems

Large language models have two persistent failure modes: they hallucinate facts they don't know, and they struggle to chain reasoning steps reliably across long contexts. Knowledge graphs address both. A graph gives an agent a queryable, auditable external store where facts can be retrieved exactly, and multi-hop questions can be answered by traversing edges rather than prompting a model to "remember."

The contrast with vector RAG is concrete. A vector store retrieves chunks ranked by embedding similarity. Ask "Who does the person who manages the person who approved Project X report to?" and you're hoping the answer fell into a single chunk. A knowledge graph answers that by following three edges. The architecture shifts reasoning from the model's weights to a structured store.

## Core Data Model

The foundational unit is a triple: **(subject, predicate, object)** — or equivalently, a labeled directed edge between two nodes. Examples:

- `(Zep, implements, Graphiti)`
- `(Graphiti, is_a, temporal_knowledge_graph_engine)`
- `(Graphiti, maintains, historical_relationships)`

Typed edges carry semantics. An edge labeled `works_at` means something different from `acquired`, even if both connect two entities. This typing is what enables reasoning: you can ask for all entities connected by `reports_to` relationships without scanning every edge.

**Temporal extensions** add a validity interval to each triple: facts have a `valid_from` and optionally a `valid_until` timestamp. Without this, a graph can't distinguish "Alice works at Acme (current)" from "Alice worked at Acme (past)." The Zep paper's core architecture, Graphiti, handles this by storing temporal metadata on edges, enabling queries like "who was Alice's manager in Q3 2023?" [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

**Ontologies** define the schema: what entity types exist, what predicates are valid between which types, and what constraints apply. Without an ontology, graphs degrade into unstructured edge soup. Cognee explicitly supports ontology grounding as a product feature. [Source](../../raw/repos/topoteretes-cognee.md)

## How Information Gets In

Three main patterns:

**Manual curation** produces the highest-quality graphs but doesn't scale. Human experts define entities and relationships. Suitable for structured domains with stable schemas (medical ontologies, product catalogs).

**Information extraction from text** uses NLP pipelines — named entity recognition, relation extraction, coreference resolution — to parse documents into triples. Quality depends heavily on the extraction model. HippoRAG's indexing pipeline does this using an LLM to extract entity nodes and relationships from documents, then stores them as a graph before applying Personalized PageRank at retrieval time. [Source](../../raw/repos/osu-nlp-group-hipporag.md)

**Continuous ingestion** processes streams of new data as they arrive. Zep's Graphiti engine ingests conversational turns and business data in real time, extracting entities and relationships and merging them into the existing graph while preserving historical state. [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) This is architecturally distinct from batch extraction — the graph is always current rather than periodically refreshed.

## How Queries Work

**Graph traversal** follows edges from a starting node. Breadth-first search finds all entities within N hops. Depth-first search follows specific relationship chains. SPARQL is the standard query language for RDF graphs; Cypher is used for property graphs (Neo4j). Cognee supports Neo4j as a backend. [Source](../../raw/repos/topoteretes-cognee.md)

**Multi-hop reasoning** is the primary advantage over vector RAG. HippoRAG 2 uses Personalized PageRank (PPR) — an algorithm that propagates relevance scores from seed nodes through the graph, discounting by edge count. A query entity seeds the walk; PPR surfaces nodes that are structurally important relative to that seed, not just embedding-similar. This retrieves passage sets that span multiple hops without requiring the model to hold the chain in context. [Source](../../raw/repos/osu-nlp-group-hipporag.md)

**Hybrid search** combines graph traversal with vector similarity. Cognee runs vector search and graph traversal in parallel, merging results. This handles queries that are partly structural ("who reports to whom") and partly semantic ("find discussions about contract disputes"). [Source](../../raw/repos/topoteretes-cognee.md)

**Temporal queries** filter or sort by validity timestamps on edges. Zep reports 18.5% accuracy improvement on LongMemEval's temporal reasoning tasks compared to baseline implementations — tasks that require tracking how facts change over time across sessions. This benchmark result comes from the Zep paper itself, so treat it as self-reported. [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Implementation Patterns in Production

Current systems layer knowledge graphs over other retrieval mechanisms rather than replacing them:

- **Graph + vector**: Cognee and HippoRAG both maintain vector indexes alongside graph structures. Vector search handles broad semantic retrieval; graph traversal handles relational reasoning.
- **Graph as memory backend**: Zep positions its knowledge graph as a persistent memory layer for agents — facts extracted from conversations accumulate in the graph, and agents query it across sessions. This solves context-window overflow for long-running agent deployments.
- **Graph + LLM extraction**: All three systems use LLMs to extract graph content from unstructured text. This introduces extraction errors that propagate into the graph and are difficult to correct systematically.

## Failure Modes

**Extraction noise compounds.** When an LLM extracts entities and relationships from text, errors enter the graph. A misidentified entity creates wrong edges. Those edges then participate in multi-hop queries, amplifying the initial error across downstream reasoning. Vector RAG degrades gracefully — a bad chunk gets low similarity scores. A bad triple in a graph can route entire reasoning chains incorrectly, with no automatic signal that something went wrong.

**Schema drift breaks queries.** Ontologies assume the world has a stable structure. When business domains evolve — companies reorganize, products change categories, terminology shifts — graph schemas need updates. Temporal KGs partially address this by timestamping facts, but schema changes (a new predicate type, a renamed entity class) require manual migration. Systems without strong ontology governance accumulate inconsistent representations of the same real-world concepts.

**Graph sparsity undermines multi-hop reasoning.** Multi-hop retrieval only works if the relevant path exists in the graph. Sparse graphs — because extraction missed relationships, or certain document types weren't ingested — produce dead ends. An agent following a reasoning chain hits a node with no outgoing edges and returns incomplete answers, often without flagging the gap.

## When Not to Use a Knowledge Graph

**Small, stable corpora** don't justify the infrastructure. A company with 200 internal documents and no cross-document reasoning requirements gets more value from a well-tuned vector store with lower operational overhead.

**Domains where relationships don't drive the queries.** Semantic search ("find documents discussing climate risk") is a vector problem. Introducing a graph adds complexity without improving retrieval for similarity-based workloads.

**Teams without graph query expertise.** Debugging a SPARQL or Cypher query requires skills most ML teams lack. A misconfigured traversal that returns empty results looks identical to a correctly configured traversal on a sparse graph. The operational cost of maintaining graph infrastructure is real and often underestimated.

**High-velocity data with unstable entity definitions.** If your entity types and relationship schemas change weekly, maintaining graph consistency costs more than the reasoning benefits deliver.

## Open Questions

**Entity resolution at scale.** When the same real-world entity appears under different names across documents ("Apple Inc.," "Apple," "AAPL's parent company"), the graph needs to merge them into one node. None of the current open-source systems document their entity resolution approach in detail. Poor resolution fragments the graph; over-eager resolution merges distinct entities.

**Cost at ingestion scale.** LLM-based extraction is per-document. For large enterprise corpora, the extraction cost (API calls, latency) can exceed the cost of running the retrieval system. This is rarely discussed in documentation.

**Conflict resolution.** When two sources assert contradictory facts about the same entity, what happens? Temporal KGs can defer to recency, but that breaks when an older authoritative source conflicts with a newer unreliable one. HippoRAG, Cognee, and Zep don't specify conflict resolution policies in their public documentation.

## Implementations Worth Examining

- **HippoRAG** (NeurIPS 2024, ICML 2025): Research-grade, uses Personalized PageRank for retrieval. Best for understanding the academic foundations. [Source](../../raw/repos/osu-nlp-group-hipporag.md)
- **Cognee**: Open-source, supports Neo4j, designed for agent memory with continuous learning. [Source](../../raw/repos/topoteretes-cognee.md)
- **Zep / Graphiti**: Production-focused temporal KG with session-persistent agent memory. Strongest for enterprise deployments where conversational history matters. [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- **Microsoft GraphRAG**: Hierarchical community detection approach; not covered in source materials but widely deployed.

Use HippoRAG when you want to understand retrieval quality tradeoffs and have research flexibility. Use Cognee when you need an open-source system with broad database backend support. Use Zep when temporal reasoning across agent sessions is the primary requirement. Use a plain vector store when your queries are semantic similarity queries and your team has no graph expertise.
