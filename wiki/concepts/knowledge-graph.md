---
entity_id: knowledge-graph
type: concept
bucket: knowledge-substrate
abstract: >-
  Knowledge graphs store entities and relationships as typed, traversable
  structures; their key differentiator over vector databases is supporting
  multi-hop reasoning and temporal queries that flat similarity search cannot
  address.
sources:
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - repos/aiming-lab-simplemem.md
  - repos/supermemoryai-supermemory.md
  - repos/osu-nlp-group-hipporag.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/safishamsi-graphify.md
  - repos/topoteretes-cognee.md
  - repos/memvid-memvid.md
  - repos/kepano-obsidian-skills.md
  - repos/origintrail-dkg-v9.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - retrieval-augmented-generation
  - model-context-protocol
  - claude-code
  - context-engineering
  - community-detection
  - hybrid-search
  - openclaw
  - cursor
  - openai
  - windsurf
  - agent-memory
  - graphrag
  - semantic-search
  - tree-sitter
  - hipporag
  - opencode
  - locomo
  - context-management
  - multi-agent-systems
  - vector-database
  - longmemeval
  - neo4j
  - raptor
  - cognitive-architecture
  - lightrag
  - personalized-pagerank
  - entity-extraction
  - markdown-wiki
last_compiled: '2026-04-08T02:40:04.693Z'
---
# Knowledge Graph

## What It Is

A knowledge graph represents information as a set of typed nodes (entities) connected by typed edges (relationships). The minimal unit is a triple: `(subject, predicate, object)` — "Alice WORKS_AT Acme", "Acme LOCATED_IN Chicago". Collections of triples form a graph where traversal enables reasoning that document retrieval cannot: "Who works at companies in cities where Alice has connections?"

The structure contrasts with two common alternatives:
- [Vector Database](../concepts/vector-database.md): stores content as dense vectors; retrieval is nearest-neighbor search; cannot follow relationship chains
- [Markdown Wiki](../concepts/markdown-wiki.md): stores knowledge as human-readable prose; retrieval requires parsing or embedding; relationships are implicit

Knowledge graphs make relationships explicit, typed, and traversable. This matters when queries require connecting information across multiple nodes — a path that neither vector similarity nor keyword search can reliably follow.

## Why It Matters for Agent Systems

LLM-based agents need structured access to knowledge that persists across sessions, evolves over time, and supports complex queries. Three concrete capabilities that knowledge graphs provide and alternatives struggle with:

**Multi-hop reasoning.** "Find all colleagues of people who reported to Bob last year" requires traversing three edge types. A vector database returns documents semantically similar to the query — it cannot follow edges. Research on [HippoRAG](../projects/hipporag.md) and [GraphRAG](../projects/graphrag.md) consistently shows 10-30% improvement on multi-hop QA tasks versus flat retrieval. The [RAG vs GraphRAG systematic evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) found GraphRAG outperforms RAG on temporal reasoning by 23.33 F1 points and multi-hop tasks by 0.72-1.62 F1 points, while RAG outperforms on single-hop factual queries (64.78 vs 63.01 F1).

**Temporal validity.** Facts change. "Alice works at Acme" may have been true in 2022 and false in 2024. A vector store updated with new facts cannot easily answer "what was true as of January 2023?" A knowledge graph with temporal edges — carrying `valid_at` and `invalid_at` timestamps — can answer point-in-time queries exactly. [Graphiti](../projects/graphiti.md) implements this as a full bitemporal model on `EntityEdge` objects, with two separate timelines: when facts held true in the world (event time) and when the system learned about them (transaction time).

**Structural provenance.** In a graph, every fact traces back to its source episode. This enables queries like "what evidence supports the claim that Alice manages Bob?" that are impossible against flat fact lists.

## How It Works

### Core Data Structures

A knowledge graph for agent memory typically contains three node categories and multiple edge types:

**Episode nodes** store raw input (messages, documents, JSON). Every derived fact traces back to an episode, preserving full lineage.

**Entity nodes** store extracted concepts with names, types, and summary text. Entities are deduplicated — "NYC" and "New York City" resolve to the same node. Deduplication uses a combination of embedding similarity and LLM judgment; [Graphiti](../projects/graphiti.md) runs this as a dedicated pipeline stage (`resolve_extracted_nodes` in `utils/maintenance/node_operations.py`).

**Relationship edges** encode typed connections between entities with natural-language fact descriptions, temporal bounds, and provenance links to source episodes.

Optional structure: **community nodes** cluster strongly connected entities using graph algorithms. [Graphiti](../projects/graphiti.md) uses label propagation; [GraphRAG](../projects/graphrag.md) uses the Leiden algorithm. Communities enable summarization at multiple scales and improve retrieval by making clusters searchable.

### Construction Pipeline

Building a knowledge graph from raw text requires several sequential LLM calls:

1. **Entity extraction**: Identify named entities and their types from source text. Effective prompts include extensive negative examples — [Graphiti's extraction prompt](../raw/deep/repos/getzep-graphiti.md) explicitly instructs the LLM not to extract pronouns, abstract concepts, generic nouns, or bare kinship terms, requiring entity names to be specific and qualified ("Nisha's dad" not "dad").

2. **Entity resolution**: Deduplicate extracted entities against the existing graph. An LLM receives candidate matches (retrieved via embedding similarity and text search) and decides whether "Apple Inc." and "Apple" refer to the same node. This is the most error-prone stage — resolution quality determines graph coherence.

3. **Relationship extraction**: For each pair of entities in the source text, extract typed relationship triples with temporal bounds. The LLM produces structured output: `{subject, predicate, object, valid_at, invalid_at, fact_description}`.

4. **Contradiction resolution**: New facts may contradict existing ones. An LLM compares incoming edges against existing edges between the same entity pairs and marks contradicted edges as expired. [Graphiti](../projects/graphiti.md) formalizes this: newer facts supersede older ones, and invalidated edges get `expired_at` set rather than being deleted — preserving the temporal record.

5. **Persistence**: Nodes and edges are written to the graph database using predefined queries, not LLM-generated ones. This design choice in [Graphiti](../projects/graphiti.md) is deliberate: predefined Cypher queries prevent schema drift and hallucinated mutations.

A single episode ingestion in [Graphiti](../projects/graphiti.md) requires 4-5 LLM calls minimum. [HippoRAG](../projects/hipporag.md) uses a two-pass OpenIE approach (NER, then triple extraction conditioned on extracted entities), caching results to JSON to avoid redundant calls on reindexing.

### Retrieval

Knowledge graph retrieval combines multiple signals that complement each other:

**Vector similarity** finds semantically related entities and facts using embeddings. Fails on multi-hop queries but handles fuzziness well.

**Full-text / BM25 search** finds exact term matches across entity names and fact descriptions. Handles proper nouns and technical terms better than pure semantic search.

**Graph traversal** follows edges from seed nodes. [HippoRAG](../projects/hipporag.md) implements Personalized PageRank (PPR) from query-relevant entities, propagating relevance through the graph structure and across synonymy edges that connect semantically similar entities. [Graphiti](../projects/graphiti.md)'s BFS traversal reaches nodes within n hops of anchor entities, capturing contextually related facts that share no semantic similarity with the query text.

Combining these signals via Reciprocal Rank Fusion (RRF) consistently outperforms any single method. [Graphiti](../projects/graphiti.md)'s `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` config runs all three in parallel and applies a neural cross-encoder reranker, yielding the best retrieval quality at the highest cost.

[HippoRAG](../projects/hipporag.md) adds a DSPy-optimized recognition memory filter between fact retrieval and graph traversal — an LLM step that removes irrelevant facts before PPR, reducing graph noise at the cost of an additional LLM call per query.

## Key Implementations

**[GraphRAG](../projects/graphrag.md)** (Microsoft): Batch-oriented. Processes entire document corpora, extracts entity and relationship triples, builds a hierarchical community structure using the Leiden algorithm, and generates community summaries via map-reduce. Optimized for corpus-wide sensemaking queries. Requires full reprocessing when source data changes. Strong on global synthesis; weaker on specific factual lookups.

**[Graphiti](../projects/graphiti.md)** (Zep): Incremental, event-driven, bitemporal. Processes episodes as they arrive, maintaining full temporal history through edge expiration rather than deletion. Supports multi-tenant namespacing via `group_id`. Requires a graph database backend (Neo4j, FalkorDB, Kuzu, or Neptune). The [Zep paper (arXiv:2501.13956)](../raw/deep/repos/getzep-graphiti.md) reports 91% latency reduction (28.9s → 2.58s) and +18.5% accuracy improvement on LongMemEval versus full-context baseline using gpt-4o — these are self-reported on the paper's own benchmark.

**[HippoRAG](../projects/hipporag.md)**: Research system modeling the hippocampal memory indexing theory. Uses OpenIE for triple extraction, igraph for the knowledge graph, and Personalized PageRank for retrieval. Self-contained (SQLite + pickle storage, no external graph database required). Optimized for multi-hop QA on static corpora; lacks [Graphiti](../projects/graphiti.md)'s temporal model.

**LightRAG**: Integrates knowledge graph construction with RAG retrieval, supporting both local (entity-neighborhood) and global (community summary) search modes.

**[Neo4j](../projects/neo4j.md)**: The dominant graph database for production deployments. Provides the Cypher query language, native vector indexes, full-text search via Lucene, and APOC procedures. Most LLM agent frameworks with graph memory support Neo4j as a backend.

**[Community Detection](../concepts/community-detection.md)**: Both Leiden (GraphRAG) and label propagation ([Graphiti](../projects/graphiti.md)) are used for automatic clustering. Leiden produces higher-quality communities but requires full recomputation on updates. Label propagation supports incremental addition of new nodes without full recomputation — important for live agent memory systems.

## Integration in Agent Architectures

Knowledge graphs appear in agent systems as components of broader architectures:

**As memory substrate**: [Agent Memory](../concepts/agent-memory.md) systems like [Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md) use knowledge graphs to store cross-session facts about users, entities, and their relationships. The agent writes new facts after each interaction and reads relevant context before generating responses.

**As retrieval layer in RAG**: [Hybrid Search](../concepts/hybrid-search.md) pipelines combine graph traversal with vector search. The [Context Engineering](../concepts/context-engineering.md) survey formalizes this as maximizing I(Y*; c_know | c_query) — the mutual information between retrieved context and correct output given the query.

**In multi-agent coordination**: [Multi-Agent Systems](../concepts/multi-agent-systems.md) use shared knowledge graphs as coordination memory — agents write observations, other agents read them. [Graphiti](../projects/graphiti.md)'s group_id namespacing enables isolated graph instances within a shared database.

**As code structure representation**: [OpenClaw](../projects/openclaw.md) and similar tools use knowledge graphs of code entities (functions, classes, imports) to compute blast radius for code review. The [code-review-graph analysis](../raw/deep/repos/tirth8205-code-review-graph.md) demonstrates 8.2x average token reduction by restricting context to graph-connected affected files.

**With MCP**: [Model Context Protocol](../concepts/model-context-protocol.md) enables AI assistants to query knowledge graphs as tools. [Graphiti](../projects/graphiti.md) ships an MCP server (`mcp_server/`); [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [Windsurf](../projects/windsurf.md) all support MCP-connected graph tools.

## Strengths

**Multi-hop queries.** Following relationship chains across multiple nodes is the primary reason to use a knowledge graph over a vector database. The traversal is deterministic, interpretable, and does not degrade with query complexity the way nearest-neighbor search does.

**Temporal reasoning.** Bitemporal models (event time + transaction time) enable point-in-time queries. No other common retrieval architecture answers "what did the system believe about X as of date Y?"

**Provenance.** Every fact traces to source episodes. Agents can explain their claims and detect when stored facts conflict.

**Structured queries.** Entity-relationship-entity triples support structured filters — "find all WORKS_AT edges where the company is in the healthcare industry" — without the imprecision of semantic search.

## Critical Limitations

**The entity extraction ceiling.** The [RAG vs GraphRAG evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) found that only 65.8% of answer-relevant entities appear in constructed knowledge graphs (HotPotQA dataset). This ~34% miss rate is a hard ceiling: if an entity was not extracted during indexing, graph retrieval cannot find it. LLM extraction quality, prompt design, and chunking strategy all affect this number, but it is never zero.

**Infrastructure assumption.** Production knowledge graph systems assume access to a graph database (Neo4j, FalkorDB, etc.) with appropriate schemas, indexes, and query capabilities. Systems like [Graphiti](../projects/graphiti.md) require Neo4j 5.26+ with APOC plugins, properly configured vector and full-text indexes, and network access to the database from the agent runtime. This is not the stateless, serverless-compatible infrastructure that vector stores like ChromaDB or Pinecone provide.

**Single-session regression.** [Graphiti](../projects/graphiti.md)'s LongMemEval results show a 17.7% accuracy decrease on single-session-assistant tasks — cases where the full conversation context would serve better than graph-extracted facts. Extracting entities and relationships from conversations loses assistant-side reasoning chains and meta-commentary.

**Cost per ingestion.** A single episode write requires 4-5 LLM calls in [Graphiti](../projects/graphiti.md). For high-volume systems (hundreds of messages per minute), this creates significant latency and API cost. Bulk ingestion modes skip edge invalidation to reduce costs, trading temporal consistency for throughput.

## When Not to Use a Knowledge Graph

**Single-hop factual retrieval at scale.** If most queries are "find the document that answers X," a vector database retrieves the answer in one embedding search. Knowledge graph construction costs are not recovered when queries don't exploit the graph structure. The [comparative evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) shows RAG outperforms GraphRAG on single-hop NQ queries (64.78 vs 63.01 F1).

**Rapidly changing unstructured content.** Document corpora where content changes frequently (news, social media, real-time data) don't benefit from expensive graph construction pipelines. Vector databases handle incremental updates more cheaply.

**Low-latency requirements with simple queries.** Knowledge graph retrieval involves graph traversal, which adds latency over pure vector similarity search. If your queries are simple and latency is critical, skip the graph.

**Domains without stable entities.** Knowledge graphs work best when the domain has identifiable, stable entities (people, companies, places, products). Creative writing, abstract reasoning, or domains without clear named entities produce sparse, unreliable graphs.

**Small, well-bounded corpora.** For corpora small enough to fit in a context window, sending the full context often outperforms retrieval. [Graphiti](../projects/graphiti.md)'s LongMemEval regression on single-session tasks illustrates this: extraction introduces errors that the raw text would not.

## Unresolved Questions

**Conflict resolution policy.** When two sources assert contradictory facts without clear temporal ordering, what should the graph believe? [Graphiti](../projects/graphiti.md) states it "consistently prioritizes new information," but this is an LLM judgment call, not a deterministic rule. No major implementation documents failure rates on contradiction detection or provides guidance on tuning this behavior.

**Community freshness.** [Graphiti](../projects/graphiti.md)'s incrementally updated community summaries "gradually diverge from full label propagation results, requiring periodic refreshes" — but the documentation does not specify when divergence becomes problematic, how to detect it, or how to schedule refreshes without disrupting live systems.

**Extraction quality across domains.** Entity extraction quality varies significantly across domains. Medical notes, legal text, and technical documentation have different entity types and relationship patterns than conversational text. No published evaluation compares extraction quality across domain types with the same pipeline.

**Cost at scale.** Publishing a benchmark on LongMemEval with 115K-token conversations at 4-5 LLM calls per episode is different from maintaining a graph for a production system processing millions of messages. No major implementation provides cost-per-million-facts numbers or analysis of how graph query complexity scales with node count.

## Alternatives and Selection Guidance

| Use this | When |
|----------|------|
| [Vector Database](../concepts/vector-database.md) | Single-hop semantic retrieval, no relationship traversal needed, minimal infrastructure |
| [Hybrid Search](../concepts/hybrid-search.md) combining vector + BM25 | Most production RAG use cases without explicit multi-hop requirements |
| [RAPTOR](../projects/raptor.md) | Hierarchical summarization of long documents without graph structure |
| Knowledge graph | Multi-hop queries, temporal reasoning, entity relationship tracking across sessions |
| Both (integrated) | The [comparative evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) shows concatenating RAG + GraphRAG retrieval yields +6.4% on multi-hop tasks — use both when query distribution is mixed |

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): primary alternative retrieval architecture
- [Agent Memory](../concepts/agent-memory.md): broader memory taxonomy that knowledge graphs implement
- [Semantic Search](../concepts/semantic-search.md): complementary retrieval method combined in hybrid pipelines
- [Community Detection](../concepts/community-detection.md): graph clustering algorithm used for knowledge organization
- Entity Extraction: prerequisite pipeline stage for graph construction
- [Hybrid Search](../concepts/hybrid-search.md): combined retrieval using graph traversal + vector + BM25
- Personalized PageRank: graph traversal algorithm used in [HippoRAG](../projects/hipporag.md)
- [Context Engineering](../concepts/context-engineering.md): discipline governing how retrieved graph facts enter model context
- [Temporal Reasoning](../concepts/temporal-reasoning.md): capability enabled by bitemporal edge models
- [Cognitive Architecture](../concepts/cognitive-architecture.md): system designs that use knowledge graphs as memory components
