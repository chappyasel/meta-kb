---
entity_id: knowledge-graph
type: concept
bucket: knowledge-substrate
abstract: >-
  A structured graph of entities and relationships used as a knowledge
  substrate, enabling agents to reason across interconnected information with
  multi-hop traversal that flat vector retrieval cannot match.
sources:
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/tirth8205-code-review-graph.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/aiming-lab-simplemem.md
  - repos/kepano-obsidian-skills.md
  - repos/memvid-memvid.md
  - repos/origintrail-dkg-v9.md
  - repos/osu-nlp-group-hipporag.md
  - repos/safishamsi-graphify.md
  - repos/supermemoryai-supermemory.md
  - repos/tirth8205-code-review-graph.md
  - repos/topoteretes-cognee.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
related:
  - retrieval-augmented-generation
  - model-context-protocol
  - claude-code
  - cursor
  - context-engineering
  - windsurf
  - graphrag
  - tree-sitter
  - community-detection
  - hybrid-search
  - openclaw
  - agent-memory
  - semantic-search
  - hipporag
  - episodic-memory
last_compiled: '2026-04-08T22:56:53.985Z'
---
# Knowledge Graph

## What It Is

A knowledge graph is a data structure representing entities (nodes) and the relationships between them (edges), where both nodes and edges carry typed attributes. In agent infrastructure, knowledge graphs serve as the primary mechanism for storing and retrieving structured knowledge that requires relational reasoning — situations where "what is true" depends not just on individual facts but on how facts connect to each other.

The formal definition from graph theory: **G = (N, E, φ)** where N is a set of nodes, E is a set of edges, and φ is an incidence function mapping edges to node pairs. In practice, most agent-facing implementations extend this with typed nodes, typed edges, attribute bags on both, and temporal metadata on edges.

This is distinct from a plain vector store. A vector store answers "what is similar to this query?" by cosine distance. A knowledge graph answers "what is connected to this entity?" by traversal. The two retrieval paradigms are complementary, not substitutable — a benchmark study of RAG vs. GraphRAG found RAG leads on single-hop factual queries (64.78 vs. 63.01 F1) while knowledge graph approaches lead on multi-hop reasoning (64.60 vs. 63.88 F1) and temporal queries (49.06 vs. 25.73). [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

## Why It Matters for Agents

Standard [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) retrieves documents whose embeddings are similar to the query. This works for single-hop lookup: "What did Alice say in the last session?" It fails for multi-hop reasoning: "What is the relationship between Alice's employer and her expressed interest in relocating?" Answering the second question requires traversing from Alice → employer → employer's location policies AND from Alice → stated preferences — then synthesizing across both paths. A flat embedding store cannot do this in a single retrieval step.

Knowledge graphs support three capabilities that flat retrieval cannot:

1. **Multi-hop traversal.** Follow relationship chains across arbitrary depth. Personalized PageRank, BFS, and Leiden community detection all operate on graph topology.

2. **Contradiction detection.** Two edges between the same entity pair can be compared for semantic conflict. When "Alice WORKS_AT Acme" and "Alice WORKS_AT Google" coexist, a resolution step can determine which is current.

3. **Temporal reasoning.** Edges carry validity timestamps (`valid_at`, `invalid_at`), enabling queries like "What was true about Alice's employer in January 2023?" [Graphiti](../projects/graphiti.md)'s bi-temporal model adds transaction-time tracking alongside event-time validity, enabling queries like "What did the system *believe* in January 2023?"

The LongMemEval benchmark validates these advantages empirically: [Graphiti](../projects/graphiti.md)'s knowledge graph approach improves temporal reasoning queries by +38.4% over full-context baselines, and multi-session synthesis by +30.7%. [Source](../raw/deep/repos/getzep-graphiti.md)

## How It Works

### The Extraction Pipeline

Raw input — conversation turns, documents, JSON — enters a knowledge graph through an extraction pipeline. The pipeline varies by implementation, but the standard multi-stage approach used by [Graphiti](../projects/graphiti.md) illustrates the pattern:

1. **Named Entity Recognition.** An LLM (or classical NER model) identifies entity spans in the text. Entities must be specific and qualified — "Nisha's dad" not "dad," "New York City" not "the city." The Graphiti extraction prompt includes extensive negative examples specifying what *not* to extract: pronouns, abstract concepts, generic nouns, bare kinship terms.

2. **Triple extraction.** For each passage, extract subject-predicate-object triples. Output is structured: `{source_entity, relation_type, target_entity, fact_description, valid_at, invalid_at}`. The relation type uses SCREAMING_SNAKE_CASE (e.g., WORKS_AT, LIVES_IN, MARRIED_TO).

3. **Node deduplication.** Each new entity is compared against existing graph nodes using hybrid matching: embedding cosine similarity, full-text name search, and LLM cross-encoder evaluation. This resolves "NYC" = "New York City" while keeping "Java programming language" distinct from "Java island."

4. **Edge resolution.** New edges between the same entity pairs are compared against existing edges. The LLM identifies duplicates and contradictions. Contradicted edges receive an `expired_at` timestamp rather than being deleted, preserving temporal history.

5. **Graph persistence.** Nodes and edges write to a graph database via predefined queries — not LLM-generated queries. This design choice ensures consistent schema and predictable behavior. [Source](../raw/deep/repos/getzep-graphiti.md)

[HippoRAG](../projects/hipporag.md) uses a slightly different approach: it runs OpenIE extraction (NER followed by triple extraction in two passes), then adds **synonymy edges** between semantically similar entities (connecting "Barack Obama" to "Obama" via KNN similarity above a threshold). This addresses entity normalization fragility without requiring explicit deduplication — the graph structure itself bridges variant forms. [Source](../raw/deep/repos/osu-nlp-group-hipporag.md)

### Storage

Knowledge graphs require a backend that supports efficient traversal. Common choices:

- **[Neo4j](../projects/neo4j.md)** — Property graph model, native Cypher query language, strong production tooling. Requires external service.
- **[NetworkX](../projects/networkx.md)** — In-memory Python graph library. Excellent for prototyping and medium-scale graphs (up to ~50K nodes); not persistent without additional serialization.
- **SQLite with WAL mode** — Used by [OpenClaw](../projects/openclaw.md) for structural code graphs. Embeds graph topology in a relational schema with NetworkX loaded for traversal algorithms. Zero infrastructure.
- **igraph** — Used by HippoRAG. Efficient for Personalized PageRank computation.
- **FalkorDB, KuzuDB, Amazon Neptune** — Alternative backends supported by Graphiti.

The choice affects traversal cost, operational complexity, and query expressiveness. SQLite + NetworkX works for graphs under 50K nodes with infrequent updates; Neo4j handles millions of nodes and concurrent queries.

### Retrieval

Given a query, knowledge graph retrieval combines multiple signals:

**Semantic search** finds nodes and edges whose embedding similarity exceeds a threshold. This identifies starting points for traversal.

**BFS/Personalized PageRank** from those starting points propagates relevance through the graph. Nodes closer (in hops) to the query entities receive higher scores. PPR specifically accounts for graph density — edges in dense subgraphs contribute less than edges in sparse regions.

**Community summaries** provide coarse navigation. The Leiden algorithm (used by [GraphRAG](../projects/graphrag.md)) and label propagation (used by Graphiti) both cluster tightly connected entities into communities with generated summaries. A query can match a community summary, then zoom in to constituent entities.

**Hybrid scoring** merges graph traversal scores with BM25 fulltext scores and embedding similarity using Reciprocal Rank Fusion (RRF). Code-review-graph's search implementation demonstrates this: FTS5 BM25 handles exact matches, embeddings handle semantic similarity, RRF combines them. [Source](../raw/deep/repos/tirth8205-code-review-graph.md)

### Temporal Representation

Standard knowledge graphs represent static facts. Agent memory requires temporal knowledge — facts that become true and later become false. Two temporal models are in use:

**Single-timestamp invalidation:** When a contradicting fact arrives, mark the old edge as expired. Simpler, but loses the historical record.

**Bi-temporal model:** Each edge carries two timelines — event time (when the fact was true in the world) and transaction time (when the system recorded the fact). This enables time-travel queries: "What did the system believe about Alice's employer on January 15, 2024?" The answer combines event-time filtering (`valid_at <= Jan 15, invalid_at > Jan 15`) with transaction-time filtering (`created_at <= Jan 15, expired_at > Jan 15`). This originates from database theory and is standard in financial audit systems; Graphiti brings it to conversational memory. [Source](../raw/deep/repos/getzep-graphiti.md)

## Entity Types and Schema

Knowledge graphs can operate with **prescribed ontology** (developer-defined entity and edge types) or **emergent schema** (types inferred by the extraction pipeline). In practice, agent implementations combine both.

Prescribed ontology uses typed node classes: `PersonNode`, `CompanyNode`, `LocationNode` — each with specific required attributes. This enforces domain constraints and enables type-specific queries. Graphiti supports custom entity types via Pydantic models:

```python
class PersonModel(BaseModel):
    name: str
    role: str | None = None

class CompanyModel(BaseModel):
    name: str
    industry: str | None = None

await graphiti.add_episode(
    ...
    entity_types={"Person": PersonModel, "Company": CompanyModel},
)
```

Emergent schema allows the LLM to generate relation types from text, producing triples like `MENTORS`, `COMPETES_WITH`, or `AUTHORED_BY` without pre-specification. This is more flexible but produces noisier graphs — the relation type namespace expands unboundedly and synonymous relations (WORKS_FOR, EMPLOYED_BY, WORKS_AT) proliferate.

The tradeoff is expressiveness vs. consistency. Prescribed ontologies produce clean, queryable graphs but require upfront schema design. Emergent schemas adapt to novel domains but require post-hoc normalization.

## Who Implements This

**[Graphiti](../projects/graphiti.md)** (Zep) — The most architecturally sophisticated agent-memory knowledge graph implementation. Bi-temporal data model, multi-stage LLM pipeline with Pydantic structured output, label-propagation community detection, hybrid search with cross-encoder reranking. Requires a graph database backend. [Source](../raw/deep/repos/getzep-graphiti.md)

**[GraphRAG](../projects/graphrag.md)** (Microsoft) — Batch-oriented knowledge graph construction from document corpora. Uses Leiden community detection, generates community summaries, supports local search (entity neighborhoods) and global search (map-reduce over community summaries). Designed for corpus-level sensemaking, not conversational memory. Global search significantly underperforms local search on QA tasks (45-55% vs. 63-65% F1). [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**[HippoRAG](../projects/hipporag.md)** — Biologically-inspired retrieval using OpenIE-extracted triples, synonymy edges, Personalized PageRank, and DSPy-optimized recognition memory filtering. Optimized for multi-hop QA over static corpora. igraph backend, Parquet embedding stores. [Source](../raw/deep/repos/osu-nlp-group-hipporag.md)

**[OpenClaw](../projects/openclaw.md)** — Structural code knowledge graph via Tree-sitter AST parsing. Entities are code symbols (files, classes, functions); edges are structural relationships (CALLS, IMPORTS_FROM, INHERITS, TESTED_BY). BFS computes blast radius for impact analysis. Achieves 8.2x average token reduction with 100% recall. SQLite + NetworkX backend. [Source](../raw/deep/repos/tirth8205-code-review-graph.md)

**[Neo4j](../projects/neo4j.md)** — The dominant production graph database. Supports Cypher query language, APOC plugin library, vector indices for embedding search, and full-text indices for BM25. Used as the default backend by Graphiti.

**[LlamaIndex](../projects/llamaindex.md)** — Provides knowledge graph construction and retrieval as part of its broader RAG framework.

**[Mem0](../projects/mem0.md)** — Optionally integrates a graph layer (via Neo4j) alongside its primary vector store for user memory, with relationship extraction between entities in stored memories.

The [Model Context Protocol](../concepts/model-context-protocol.md) enables knowledge graphs to expose their retrieval capabilities as tools that LLM-powered agents can call. Graphiti ships an MCP server, and OpenClaw's MCP server registers 22 tools for graph querying, blast radius analysis, and architecture overview generation.

## Practical Implications

### When to use a knowledge graph

Use a knowledge graph when your retrieval requirements include any of these:

- **Multi-hop reasoning.** "What company employs the person who mentors Alice?" requires graph traversal.
- **Temporal queries.** "What was true about X six months ago?" requires validity timestamps.
- **Entity relationship analysis.** "What are all relationships involving entity X?" requires adjacency queries.
- **Contradiction detection.** "Has Alice's employer changed?" requires comparing edges on the same entity pair.
- **Community-level summarization.** "Give me an overview of topics related to Alice" requires community detection.

For single-hop factual lookups ("What did Alice say in session 4?"), a vector store is sufficient and cheaper.

### When NOT to use a knowledge graph

**High write throughput with low query complexity.** Knowledge graph construction requires 4-5 LLM calls per ingested episode (entity extraction, deduplication, triple extraction, contradiction resolution, attribute updates). At scale, this is expensive. If your retrieval is primarily "find similar documents," skip the graph overhead.

**Small corpora.** For under 100 documents, full-context retrieval or simple dense retrieval beats the complexity of knowledge graph construction and maintenance. The extraction pipeline introduces errors (~34% entity miss rate observed in benchmark studies) that compound when the graph is small.

**Real-time ingestion with strict latency budgets.** The multi-stage extraction pipeline adds hundreds of milliseconds to seconds per episode. The Graphiti documentation recommends background task execution for ingestion rather than blocking the request path.

**Dynamic, rapidly changing facts.** Incremental graph updates can lag behind high-velocity changes. Stale edges persist until contradiction detection runs, which only fires on new ingestion.

**Domains with sparse relational structure.** Knowledge graphs add the most value when entities have many relationships. For domains where information is mostly self-contained (individual documents with few cross-references), the graph structure adds overhead without proportional retrieval benefit.

## Failure Modes

**Entity extraction ceiling.** LLM-based extraction misses approximately 34% of answer-relevant entities in benchmark datasets. This is a hard ceiling: if an entity was not extracted during indexing, graph traversal cannot surface it. Specialized domains (technical terms, domain jargon, ambiguous abbreviations) likely have higher miss rates than general text. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**Entity normalization fragility.** "US," "U.S.," "United States," and "the United States of America" may appear as separate nodes if embedding similarity is below the synonymy threshold. Downstream queries that start from "US" will not traverse edges attached to "United States."

**Edge invalidation is LLM-dependent.** Whether a new fact contradicts an existing edge is decided by the LLM in a resolution prompt. If the model fails to recognize a contradiction, stale edges persist as valid. There is no deterministic contradiction checking.

**Assistant-side reasoning regression.** Graphiti's LongMemEval evaluation showed a 17.7% *decrease* on single-session-assistant tasks. By extracting entities and relationships from conversations, the system loses assistant-side reasoning chains and meta-commentary. This is a fundamental limitation of extraction-based knowledge graphs: they capture facts but not the reasoning process that produced them. [Source](../raw/deep/repos/getzep-graphiti.md)

**Community drift.** Incrementally updated community summaries diverge from what a full recomputation would produce. For long-running graphs with thousands of episodes, community quality degrades silently without periodic full refreshes.

**Scale limits on in-memory traversal.** NetworkX and igraph require the full graph in memory for traversal algorithms. For graphs exceeding ~50K nodes, RAM consumption becomes a constraint. Production deployments at scale require dedicated graph databases.

## Related Concepts

Knowledge graphs intersect with several adjacent concepts in agent infrastructure:

- [Semantic Search](../concepts/semantic-search.md) — Embedding-based retrieval that serves as the starting point for graph traversal in hybrid approaches.
- [Hybrid Search](../concepts/hybrid-search.md) — Combining BM25, embeddings, and graph traversal via RRF is the dominant retrieval pattern in knowledge graph systems.
- [Community Detection](../concepts/community-detection.md) — Leiden algorithm and label propagation cluster graph entities into summarizable communities.
- [Agent Memory](../concepts/agent-memory.md) — Knowledge graphs serve as the semantic memory tier in multi-tier memory architectures.
- [Episodic Memory](../concepts/episodic-memory.md) — Raw conversation episodes are the input to knowledge graph construction; the graph itself is the semantic distillation.
- [Temporal Reasoning](../concepts/temporal-reasoning.md) — Bi-temporal data models enable the class of temporal queries that knowledge graphs uniquely support.
- [Context Engineering](../concepts/context-engineering.md) — Knowledge graphs are one component of the six-component context assembly model: specifically the `c_know` (external knowledge) component. [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — Vector-based retrieval that is complementary to graph traversal. Hybrid integration (concatenating both results) yields +4-6% improvement on multi-hop tasks over either method alone.
- [Vector Database](../concepts/vector-database.md) — Stores entity and fact embeddings that seed graph traversal in hybrid retrieval pipelines.

## Unresolved Questions

**Optimal extraction granularity.** Should entities be extracted at the sentence level, paragraph level, or document level? Finer granularity produces more precise edges but increases extraction cost and graph density. No consensus benchmark exists.

**Evaluation methodology.** LLM-as-judge evaluations exhibit position bias that can invert preference judgments between RAG and knowledge graph approaches. ROUGE/BERTScore and LLM judges disagree systematically. The field lacks agreed evaluation protocols for knowledge graph retrieval quality. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**Garbage collection.** Graphiti grows monotonically — expired edges are retained indefinitely. No compaction mechanism exists. For long-running production deployments, storage growth and query slowdown from scanning expired edges are unaddressed.

**Cost at scale.** 4-5 LLM calls per ingested episode means knowledge graph construction costs scale linearly with data volume. Published benchmarks cover dozens to hundreds of episodes. Costs for millions of episodes are not documented anywhere.

**Cross-language knowledge graphs.** Code knowledge graphs handle cross-language references (Python calling C extensions, TypeScript importing JavaScript) only partially. For multilingual text knowledge graphs, entity resolution across languages is an open problem.

**Schema evolution.** When entity type definitions change (adding required attributes, renaming relation types), existing graph data becomes incompatible. No migration tooling or versioning strategy is documented in any major implementation.
