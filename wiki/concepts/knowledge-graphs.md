---
entity_id: knowledge-graphs
type: concept
bucket: knowledge-bases
sources:
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/osu-nlp-group-hipporag.md
  - repos/topoteretes-cognee.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
related:
  - Retrieval-Augmented Generation
  - GraphRAG
  - Agent Memory
  - Hybrid Retrieval
  - Temporal Reasoning
  - Memory Consolidation
  - Context Engineering
  - Graphiti
  - Zep
  - Memory Consolidation
  - Multi-Hop Retrieval
  - Mechanistic Interpretability
last_compiled: '2026-04-04T21:17:15.981Z'
---
# Knowledge Graphs

## What They Are

Knowledge graphs are structured data representations that encode entities (nodes) and relationships (edges) in a graph topology. Unlike flat document stores or relational tables, they make the *connections* between things first-class citizens. A knowledge graph might represent: `(Patient) --[has_condition]--> (Diabetes)` or `(Alice) --[reported_bug_on]--> (2024-03-15)`.

In the LLM/agent context, knowledge graphs serve as a structured substrate for memory, reasoning, and retrieval—a way to store *what things are* and *how they relate*, rather than just *what was said*.

## Why They Matter

Vector search (the dominant RAG paradigm) retrieves semantically similar chunks, but has no awareness of structure or relationships. A document saying "Alice manages Bob who works on Project X" stores that as an undifferentiated blob. A knowledge graph makes those three entities and two relationships individually queryable and traversable.

This matters in several concrete ways:

- **Multi-hop reasoning**: "Who is responsible for the component that broke?" requires traversing entity → component → owner, not just similarity search
- **Contradiction detection**: Two facts occupying the same graph position can be flagged; two similar embedding vectors cannot
- **Temporal validity**: Facts can carry `valid_from`/`valid_until` metadata; embeddings cannot represent "this was true then but not now"
- **Grounded answers**: Responses can cite specific entity relationships, not just source passages

## How They Work

A knowledge graph stores triples: `(subject, predicate, object)`. At scale, these triples form a directed graph traversable by graph query languages (SPARQL, Cypher for Neo4j, Gremlin).

In LLM systems, construction typically involves:

1. **Entity extraction**: LLM or NLP pipeline identifies named entities in text
2. **Relation extraction**: Relations between entity pairs are identified (also often LLM-driven)
3. **Schema alignment**: Entities and relations are mapped to ontology types
4. **Storage**: Triples are persisted in a graph database (Neo4j, Kuzu, Neptune, Weaviate with graph support)
5. **Retrieval**: Queries combine graph traversal with optional vector similarity on node embeddings

The hybrid approach—graph structure plus vector embeddings on nodes—has become standard. Pure graph traversal requires exact entity matches; pure vector search loses structure. Together, you get semantic entry points into a navigable relational structure.

## Temporal Knowledge Graphs

A significant extension for agent memory is tracking *when* facts were true. [Graphiti](../projects/graphiti.md) (~24K stars) implements this with explicit validity windows and episode provenance—each fact records which interaction established it and when it was superseded. This solves a real problem: standard RAG returns static snapshots, but agents operating across long time horizons need to know that "Bob's manager is Carol" replaced "Bob's manager is Alice" as of a specific date.

[Source](../../raw/repos/getzep-graphiti.md)

## Who Implements It

Several projects in this space use knowledge graphs as their core memory substrate:

- **[Graphiti](../projects/graphiti.md)**: Temporal context graphs for agents, built by Zep (~24K GitHub stars, Apache-2.0) [Source](../../raw/repos/getzep-graphiti.md)
- **Cognee**: Combines vector search with graph databases for dynamically evolving agent memory (~15K stars, Apache-2.0) [Source](../../raw/repos/topoteretes-cognee.md)
- **[Zep](../projects/zep.md)**: Agent memory platform using graph-backed session storage
- **[GraphRAG](../concepts/graphrag.md)**: Microsoft's approach using community detection on knowledge graphs to enable global synthesis queries
- **Ars Contexta**: Generates domain-specific cognitive architectures as structured knowledge systems from conversation [Source](../../raw/repos/agenticnotetaking-arscontexta.md)

## Strengths

- **Relationship traversal**: Natural fit for questions requiring multi-hop inference
- **Auditability**: Specific edges can be cited as sources; not a weighted average of embeddings
- **Incremental updates**: Adding or retracting individual facts is clean; re-indexing entire vector stores is expensive
- **Schema enforcement**: Ontologies constrain what relationships can exist, reducing hallucinated connections
- **Temporal reasoning**: Graph edges can carry validity metadata natively

## Limitations

- **Construction cost**: Reliable entity and relation extraction requires LLM calls per document, which is slow and expensive compared to chunking + embedding
- **Schema rigidity**: A predefined ontology may fail to capture unanticipated relation types; open-domain extraction produces noisy graphs
- **Query complexity**: Graph traversal queries require expertise; LLM-to-Cypher/SPARQL translation is unreliable
- **Coverage gaps**: Implicit knowledge (tone, context, uncertainty) doesn't map cleanly to triples
- **Cold start**: Graphs must be populated before they're useful; no retrieval works on an empty graph
- **Tooling fragmentation**: Multiple graph databases (Neo4j, Kuzu, Neptune, TigerGraph) with incompatible query languages

## Relationship to RAG

Knowledge graphs and vector retrieval are not mutually exclusive—they're increasingly used together in [Hybrid Retrieval](../concepts/hybrid-retrieval.md). The typical pattern: vector search identifies relevant entity neighborhoods, then graph traversal expands context by following edges. [GraphRAG](../concepts/graphrag.md) takes this further by pre-clustering graph communities and generating summaries, enabling queries that require synthesizing across large knowledge domains.

## Practical Implications

For agent memory specifically: a flat context window filled with conversation history doesn't scale. Knowledge graphs offer a path to [Memory Consolidation](../concepts/memory-consolidation.md)—distilling interactions into persistent, queryable facts rather than accumulating raw text. The trade-off is construction complexity; the benefit is that retrieved context is structured, non-redundant, and temporally coherent.

The field is still settling on best practices for automated graph construction quality. Extraction pipelines using LLMs introduce hallucinated relations, and most production deployments require significant human-in-the-loop validation or confidence thresholding.

## Related Concepts

- [GraphRAG](../concepts/graphrag.md) — retrieval architecture built on knowledge graphs
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md) — combining graph and vector retrieval
- [Agent Memory](../concepts/agent-memory.md) — broader memory architecture context
- [Multi-Hop Retrieval](../concepts/multi-hop-retrieval.md) — retrieval pattern enabled by graph traversal
- [Temporal Reasoning](../concepts/temporal-reasoning.md) — reasoning over time-stamped facts
- [Memory Consolidation](../concepts/memory-consolidation.md) — distilling experience into persistent knowledge
