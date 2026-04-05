---
entity_id: knowledge-graph
type: concept
bucket: knowledge-bases
abstract: >-
  Knowledge Graph: a graph data structure of entities (nodes) and typed
  relationships (edges) used to represent domain knowledge for querying,
  multi-hop reasoning, and retrieval augmentation — differentiated from flat
  document stores by its ability to traverse transitive relationships across
  documents.
sources:
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/getzep-graphiti.md
  - repos/aiming-lab-simplemem.md
  - repos/osu-nlp-group-hipporag.md
  - repos/topoteretes-cognee.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/topoteretes-cognee.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
  - Model Context Protocol
  - GraphRAG
  - Agent Memory
  - Neo4j
  - Graphiti
  - Cognee
  - Community Detection
  - Personalized PageRank
last_compiled: '2026-04-05T20:31:09.031Z'
---
# Knowledge Graph

## What It Is

A knowledge graph is a directed, labeled graph where nodes represent entities (people, places, concepts, events) and edges represent typed relationships between them. A triple `(Barack Obama, born_in, Hawaii)` is the atomic unit. Query a knowledge graph and you can traverse chains: `Obama -> born_in -> Hawaii -> part_of -> United States` rather than having to locate a single document that mentions all three in proximity.

The structure predates LLMs by decades. Google's Knowledge Graph (2012), Wikidata (2012), and Freebase (before its acquisition by Google in 2010) established the pattern. What changed is how knowledge graphs get built (LLMs now extract triples from unstructured text instead of manual curation), and how they get used (as retrieval substrate for agents rather than as static encyclopedia backends).

Three constructs define any knowledge graph:

- **Node** (entity): a distinct thing with an identifier and optional properties. `Person:Obama`, `City:Honolulu`, `Concept:machine_learning`.
- **Edge** (relationship): a typed, directed connection between two nodes. `(Obama) --born_in--> (Honolulu)`. Edges may carry properties: weight, timestamp, source document, confidence score.
- **Triple**: the subject-predicate-object unit. RDF formalizes this as `(subject, predicate, object)`. A knowledge graph is a set of triples plus indexes for efficient traversal.

## Why It Matters for LLM Systems

Standard dense retrieval (embedding similarity search) finds documents whose vectors are close to the query vector. This works well for single-hop lookups: "Who is Barack Obama?" retrieves a passage about Obama, done. It fails for multi-hop queries: "Who governed the birthplace of the first US president who won a Nobel Prize?" requires chaining `Nobel Prize winner -> Barack Obama -> born in -> Hawaii -> governed by -> David Ige`. No single passage embeds close to this query unless it happens to mention all those facts together.

The paper [RAG vs GraphRAG](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) quantifies this gap. On temporal reasoning queries, GraphRAG outperforms RAG by 23.33 F1 points (49.06 vs 25.73). On multi-hop queries, the gap narrows to 0.72–1.62 F1 points — meaningful but not decisive. On single-hop factual queries, RAG wins. The practical conclusion: knowledge graphs provide the largest return when queries require chaining across entities or tracking how facts change over time.

The same paper identifies a hard ceiling: only ~65% of answer-relevant entities survive LLM-based extraction into the graph. When an entity never gets extracted, graph traversal cannot recover it. This caps the ceiling on graph-only retrieval regardless of how sophisticated the traversal algorithm is.

## How Knowledge Graphs Get Built

### Manual Curation

Wikidata and DBpedia are human-curated at scale. Contributors write triples directly, with editorial processes to resolve conflicts. Quality is high; coverage is broad; maintenance is labor-intensive. Viable for domain ontologies and reference knowledge, not for dynamic enterprise data or frequently updated corpora.

### LLM-Based Triple Extraction

The dominant pattern for building knowledge graphs from unstructured text feeds documents through two LLM passes:

1. **Named Entity Recognition (NER)**: Extract entity mentions from text.
2. **Relation extraction**: Given the document and extracted entities, produce subject-predicate-object triples.

[HippoRAG](../raw/deep/repos/osu-nlp-group-hipporag.md) implements this as `OpenIE` in `information_extraction/openie_openai.py`. The NER pass uses a prompt template (`prompts/templates/ner.py`) to extract entities as a JSON list. The triple extraction pass conditions on those entities to generate triples. Conditioning the second pass on the first reduces hallucinated entities in relations, but errors compound: missed entities in NER mean missed triples downstream.

[Cognee](../raw/deep/repos/topoteretes-cognee.md) implements this through `extract_graph_from_data()` in `cognee/tasks/graph/extract_graph_from_data.py`, using Instructor/litellm for structured output against a `KnowledgeGraph` Pydantic model. Each document chunk generates entities and relations concurrently via `asyncio.gather()`. Cognee optionally validates extracted entities against OWL ontologies with fuzzy matching at 80% threshold — an unusual step that reduces noisy entities in specialized domains.

### Hybrid Deterministic + LLM Construction

For structured data (database rows, CSV files, schemas with foreign keys), deterministic edge construction is more reliable than LLM extraction. Cognee has a special path for DLT row documents that skips LLM extraction entirely and builds edges from foreign key relationships. This avoids the quality ceiling problem for structured sources while retaining LLM extraction for unstructured text.

## How Knowledge Graphs Get Queried

### Cypher / SPARQL Query Languages

Neo4j uses Cypher; RDF systems use SPARQL. Both let you write explicit graph traversal queries:

```cypher
MATCH (p:Person)-[:BORN_IN]->(c:City)<-[:GOVERNS]-(g:Governor)
WHERE p.name = 'Barack Obama'
RETURN g.name
```

This is precise and fast but requires the query to be pre-formulated or generated by an LLM. [Cognee](../raw/deep/repos/topoteretes-cognee.md) exposes a `CYPHER` search type for power users who want this control.

### Personalized PageRank (PPR)

PPR starts traversal from a set of "seed" nodes (those semantically relevant to the query) and propagates relevance scores through the graph structure, naturally amplifying nodes that connect many relevant entities. Nodes connected to multiple seeds rank higher than nodes connected to only one.

HippoRAG uses PPR as its core retrieval mechanism. After extracting and filtering relevant triples from the query, `graph_search_with_fact_entities()` runs PPR from the entity nodes found in those triples. Document nodes reachable through entity connections accumulate PPR scores that combine with direct embedding similarity. The `passage_node_weight` parameter controls the blend. The implementation uses [igraph](../raw/deep/repos/osu-nlp-group-hipporag.md)'s PPR function directly on an in-memory graph.

PPR is computationally expensive on large graphs. HippoRAG tracks `self.ppr_time` per query; at scale, PPR latency can exceed acceptable bounds for real-time applications.

### Community Detection

[GraphRAG](../projects/graphrag.md) (Microsoft's implementation) builds a hierarchy of communities using algorithms like Leiden or Louvain. Communities group densely connected entity clusters. At query time, community summaries provide compressed representations of topic clusters, enabling broad "what does this corpus say about X" queries without traversing individual entity neighborhoods.

The [RAG vs GraphRAG evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) shows community-based global search consistently underperforms local search on factual QA (45–55% vs 63–65% F1). Community search suits corpus-wide sensemaking, not targeted factual retrieval.

### Vector + Graph Hybrid

Most production systems combine embedding similarity with graph traversal rather than choosing one. The pattern:

1. Retrieve top-k entities or facts by embedding similarity to the query.
2. Use those as seed nodes for graph traversal (PPR, neighborhood expansion, or shortest path).
3. Score retrieved documents by combining embedding similarity and graph traversal score.

This handles the case where the query semantics don't exactly match the graph's entity vocabulary. The embedding step finds approximate anchors; the graph step follows structural connections the embedding step would miss. Integration of both retrieval paths yields +6.4% improvement on multi-hop tasks over RAG alone and +4–6% over GraphRAG alone, per the benchmark study.

## Graph Data Structures and Storage

Knowledge graphs require a property graph model or an RDF triplestore. The choice affects query expressiveness, schema flexibility, and ecosystem tooling.

**Property graphs** (Neo4j, Kuzu, Memgraph, FalkorDB): Nodes and edges carry arbitrary key-value properties. Rich query language (Cypher). No requirement for formal ontology. Better for application-layer knowledge graphs where schema evolves frequently.

**RDF triplestores** (Virtuoso, GraphDB, Amazon Neptune): Store triples as `(subject, predicate, object)` with URI-based identifiers. SPARQL query language. OWL ontology support for formal inference. Better for interoperability with public linked data (Wikidata, DBpedia) and when ontological reasoning matters.

**In-memory graph libraries** (igraph, NetworkX, rustworkx): Fast graph algorithms (PageRank, community detection, shortest path) without a database server. HippoRAG uses igraph persisted as a Pickle file. Simple to deploy; poor operability (no external queries, no versioning, not portable across Python versions).

For persistence in production, [Neo4j](../projects/neo4j.md) is the most widely deployed property graph database, with native Cypher support and an established driver ecosystem. [Cognee](../projects/cognee.md) supports Neo4j, Kuzu (embedded), AWS Neptune, and Memgraph as swappable backends behind a `GraphDBInterface` adapter.

## Synonymy and Entity Resolution

Entity extraction from natural language produces multiple surface forms for the same entity: "United States," "US," "U.S.A.," "America." Without resolution, these become separate nodes with no edges between them, breaking multi-hop traversal.

Three resolution strategies appear across implementations:

**Synonymy edges (HippoRAG)**: After initial graph construction, compute KNN over all entity embeddings. Entity pairs above a similarity threshold get connected with weighted edges. PPR then propagates relevance across synonym clusters naturally. Cost: all-pairs KNN over entity embeddings, which becomes expensive for large corpora. The cap at 100 nearest neighbors per entity prevents combinatorial explosion but may miss distant synonyms.

**Ontology grounding (Cognee)**: Validate extracted entities against OWL ontologies with fuzzy matching. Entities that match canonical ontology terms inherit the ontology's class hierarchy and object properties, reducing fragmentation from the start. Works well in domains with authoritative ontologies (biomedical, legal, financial); requires upfront ontology curation for custom domains.

**LLM deduplication (Cognee)**: Multi-pass extraction with cross-checking against source documents. Different extraction runs are compared and reconciled. More expensive than a single-pass extraction but improves consistency across large corpora.

## Temporal Knowledge Graphs

Standard knowledge graphs treat facts as timeless. Enterprise applications need to track how facts change: an employee's role in 2022 differs from their role today; a regulation that changed in 2024 must not contaminate queries about the regulatory state in 2023.

[Graphiti](../projects/graphiti.md) (Zep's core engine) addresses this by adding temporal metadata to edges. Each edge carries `valid_from` and `valid_to` timestamps, with `invalid_at` recording when a fact was superseded. The [Zep paper](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) reports 18.5% accuracy improvement on LongMemEval and 90% latency reduction versus baseline MemGPT on tasks requiring cross-session synthesis and long-term context maintenance.

Cognee notes temporal reasoning as an active development area. Most other knowledge graph systems (HippoRAG, basic GraphRAG) treat the graph as static snapshots without temporal awareness.

## Key Numbers and Benchmarks

From the [RAG vs GraphRAG evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) (self-reported in the paper):

| Task type | RAG F1 (Llama 70B) | GraphRAG Local F1 | Gap |
|---|---|---|---|
| Single-hop (NQ) | 68.18 | 65.44 | RAG +2.74 |
| Multi-hop (HotPotQA) | 63.88 | 64.60 | GraphRAG +0.72 |
| Temporal (MultiHop-RAG) | 25.73 | 49.06 | GraphRAG +23.33 |

Hybrid integration (both retrieval paths): +6.4% over RAG baseline on multi-hop tasks.

Entity extraction coverage: ~65.8% of answer-relevant entities survive into constructed knowledge graphs (HotPotQA). This is the hard ceiling for graph-only retrieval.

Zep/Graphiti vs MemGPT on Deep Memory Retrieval: 94.8% vs 93.4% (self-reported).

Cognee vs RAG on standard benchmarks: ~90% vs ~60% accuracy (self-reported, on unspecified benchmarks; exact scores not published with methodology).

None of these numbers have been independently replicated outside the reporting teams. Treat them as directional evidence, not production guarantees.

## Who Implements Knowledge Graphs

- [HippoRAG](../projects/hipporag.md): In-memory igraph with PPR retrieval, OpenIE extraction, synonymy edges for multi-hop QA.
- [GraphRAG](../projects/graphrag.md): Community detection hierarchy with local/global search modes.
- [Cognee](../projects/cognee.md): ECL pipeline, three-store architecture (relational + vector + graph), optional OWL ontology grounding.
- [Graphiti](../projects/graphiti.md): Temporal knowledge graph engine underlying Zep, tracks fact validity over time.
- [Neo4j](../projects/neo4j.md): Primary production-grade property graph database for knowledge graph storage and querying.
- [Agent Memory](../concepts/agent-memory.md): Knowledge graphs serve as the long-term relational memory layer in agent architectures.
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): Knowledge graphs augment standard dense retrieval for multi-hop queries.
- [Model Context Protocol](../concepts/model-context-protocol.md): Knowledge graphs can expose structured retrieval tools via MCP for agent consumption.

## Practical Failure Modes

**Entity extraction ceiling**: ~34% of answer-relevant entities don't survive extraction. In specialized domains (biomedical, legal, technical), this miss rate is likely higher. Measure extraction recall on domain-representative samples before committing to a graph-based architecture.

**Graph scale**: In-memory graphs (igraph, NetworkX) become a bottleneck when entity counts exceed a few million. PPR on graphs this large requires either approximation algorithms or persistent graph databases with native traversal.

**Entity fragmentation**: Without deliberate resolution, "US," "U.S.A.," and "United States" become isolated nodes. This silently breaks multi-hop traversal — queries that should chain through "United States" find nothing when the entity was extracted as "US."

**Cold start**: A newly constructed knowledge graph with sparse entity coverage retrieves nothing useful until the extraction pipeline has processed sufficient corpus. During this ramp-up period, pure dense retrieval outperforms the hybrid.

**Static snapshots**: Most graph implementations don't track temporal changes. A knowledge graph built from a corpus in 2023 will silently return stale facts for queries about 2025 state. Only temporal-aware systems (Graphiti, Zep) handle this by design.

## When NOT to Use a Knowledge Graph

**Single-hop factual retrieval**: Dense passage retrieval outperforms graph retrieval on simple lookups (RAG +2.74 F1 on NQ). The indexing overhead of graph construction is not justified.

**Small, stable corpora**: If your knowledge base contains fewer than a few thousand documents and updates infrequently, embedding similarity search is simpler to operate and maintain. The multi-hop benefit only materializes when the corpus has enough interconnected entities to form useful graph structure.

**Real-time ingestion with latency constraints**: LLM-based triple extraction is slow (multiple LLM calls per document). Systems requiring sub-second ingestion of new documents cannot use extraction-based graph construction.

**Unstructured, narrative-heavy content**: Novels, transcripts, forum threads, and similar content have low entity density. The extraction pipeline produces sparse, noisy graphs. Dense retrieval handles these better.

**When extraction quality can't be validated**: If you can't evaluate whether your extraction pipeline achieves adequate entity recall on your domain, you risk building an architecture with a hidden quality ceiling that's hard to diagnose.

## Unresolved Questions

**Extraction quality feedback loops**: How do you detect when the ~34% entity miss rate is degrading retrieval in production? No standard tooling exists for monitoring extraction coverage against incoming queries.

**Incremental graph updates at scale**: Most systems support incremental document ingestion for embeddings but require full re-computation of all-pairs entity similarity (HippoRAG) or community detection (GraphRAG) when the corpus grows. At what scale does this become untenable, and what architectures handle it gracefully?

**Optimal chunking for graph extraction**: The extraction pipeline's entity recall depends on chunk size. Smaller chunks contain fewer entities but make relationship extraction harder. Larger chunks have more context but exceed LLM context windows. No consensus exists on the right tradeoff.

**Evaluation methodology**: The [context engineering survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) notes that memory system benchmarks mostly test single-session recall, not the cross-session synthesis and temporal reasoning that production systems require. LLM-as-judge evaluations have documented position bias that can invert preference judgments. Standard QA benchmarks (NQ, HotPotQA) don't cover the distribution of queries in enterprise deployments.

## Alternatives and Selection Guidance

| Situation | Recommendation |
|---|---|
| Single-hop factual retrieval, low latency | Dense vector search (no knowledge graph) |
| Multi-hop reasoning across documents | Knowledge graph + PPR traversal (HippoRAG, GraphRAG Local) |
| Corpus-wide sensemaking and summarization | Community detection (GraphRAG Global) |
| Temporal fact tracking across sessions | Temporal knowledge graph (Graphiti/Zep) |
| Domain with formal ontology (biomedical, legal) | Property graph + OWL ontology grounding (Cognee) |
| Structured data with explicit relationships | Deterministic edge construction from schema (no LLM extraction needed) |
| Best of both worlds, cost not a constraint | Hybrid RAG + Knowledge Graph retrieval (+6.4% on multi-hop) |


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.6)
- [Model Context Protocol](../concepts/mcp.md) — implements (0.5)
- [GraphRAG](../concepts/graphrag.md) — implements (0.9)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.6)
- [Neo4j](../projects/neo4j.md) — implements (0.8)
- [Graphiti](../projects/graphiti.md) — implements (0.8)
- [Cognee](../projects/cognee.md) — implements (0.7)
- [Community Detection](../concepts/community-detection.md) — implements (0.6)
- [Personalized PageRank](../concepts/personalized-pagerank.md) — implements (0.6)
