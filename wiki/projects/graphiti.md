---
entity_id: graphiti
type: project
bucket: knowledge-substrate
abstract: >-
  Graphiti is a temporal knowledge graph engine for agent memory that stores
  relational knowledge as bi-temporal edge triples, enabling agents to track how
  facts change over time while tracing any belief back to its source episode.
sources:
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/letta-ai-letta.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - repos/getzep-graphiti.md
related:
  - zep
  - letta
  - memgpt
  - episodic-memory
last_compiled: '2026-04-08T23:01:29.874Z'
---
# Graphiti

## What It Does

Graphiti is the knowledge graph engine at the core of [Zep](../projects/zep.md), built to solve a specific problem: agents that operate across many sessions need memory that handles contradictory and evolving information, not just memory that accumulates it. Most agent memory systems treat new information as additive. Graphiti treats it as potentially invalidating.

The system organizes knowledge into three layers: raw episodes (conversations, JSON, documents), extracted entity-relationship triples with temporal validity bounds, and auto-detected communities of related entities with LLM-generated summaries. When a user says "I changed jobs last month," Graphiti extracts this as an edge (`Alice → WORKS_AT → NewCo, valid_at=2025-05`), finds the previous employment edge (`Alice → WORKS_AT → OldCo`), and expires it. The old edge is not deleted — it receives an `expired_at` timestamp, preserving the history of what was believed and when.

The architecture comes from [Zep](../projects/zep.md) but ships as a standalone Python library (`graphiti_core/`) that any agent framework can use. [Letta](../projects/letta.md) and [MemGPT](../projects/memgpt.md) are separate systems with different memory philosophies; Graphiti is specifically the graph-based engine.

**GitHub stars:** ~7k (as of mid-2025, self-reported by Zep documentation). The underlying paper (arXiv:2501.13956) provides independently described but not externally audited benchmarks.

## Core Mechanism

### Bi-Temporal Edge Model

Every fact in Graphiti is an `EntityEdge` with four timestamps:

```python
class EntityEdge(Edge):
    valid_at: datetime | None      # When the fact became true (event time)
    invalid_at: datetime | None    # When the fact stopped being true (event time)
    expired_at: datetime | None    # When the system invalidated this record (transaction time)
    reference_time: datetime | None  # Reference timestamp for resolving relative dates
```

This dual-timeline model, described formally in the Zep paper as timelines T (event time) and T' (transaction time), answers two distinct questions: "What was true at date X?" and "What did the system believe at date X?" Standard databases conflate these. Financial and medical systems have handled them separately for decades; Graphiti brings this to [agent memory](../concepts/agent-memory.md).

### Episode Ingestion Pipeline

The `add_episode()` method in `graphiti_core/graphiti.py` runs a multi-stage LLM pipeline on each incoming message:

1. **Entity extraction** — An LLM call with the current message plus the four preceding messages extracts named entities with type classifications. The extraction prompt (`prompts/extract_nodes.py`) explicitly lists what NOT to extract: pronouns, bare kinship terms ("dad" vs. "Alice's dad"), abstract concepts, generic nouns. This reduces noise at the cost of potentially missing domain-specific abstractions.

2. **Node deduplication** — Each extracted entity is embedded (1024-dim by default), compared against existing nodes via cosine similarity and BM25 full-text search, then an LLM cross-encoder determines whether a match exists. "NYC" and "New York City" resolve to the same node.

3. **Edge extraction** — A second LLM call extracts fact triples in `SCREAMING_SNAKE_CASE` relation format (e.g., `WORKS_AT`, `MARRIED_TO`) with natural-language descriptions and temporal bounds. The `valid_at` field is populated from the episode's `reference_time`, allowing relative expressions like "last Thursday" to resolve to absolute dates.

4. **Edge resolution** — New edges are compared against existing edges *between the same entity pairs only* — a deliberate constraint that limits computational scope while preventing cross-entity contamination. When contradiction is detected, the old edge receives an `expired_at` timestamp. Newer information always wins; there is no confidence weighting or source-authority mechanism.

5. **Attribute extraction** — Entity summaries are updated to reflect new information from non-duplicate edges.

6. **Persistence** — All mutations go through predefined Cypher queries, never LLM-generated ones. This was a deliberate engineering decision: LLM-generated graph queries produce inconsistent schemas. The tradeoff is less query flexibility for substantially better reliability.

All operations are async, using `semaphore_gather` with a configurable `SEMAPHORE_LIMIT` (default 10) to prevent LLM provider rate-limit errors.

### Hybrid Search

The search layer (`graphiti_core/search/search.py`) combines three complementary retrieval methods in parallel:

- **Cosine similarity** on fact field embeddings — captures semantic similarity
- **BM25 full-text search** via the graph database's Lucene integration — captures word-level matches
- **Breadth-first graph traversal** up to n hops from recent episode nodes — captures contextual proximity (nodes that appear together in conversations sit close in the graph)

The Zep paper describes this as targeting "word similarities, semantic similarities, and contextual similarities" respectively. No single method covers all three.

Results feed into configurable reranking: RRF (reciprocal rank fusion), MMR (maximal marginal relevance for diversity), episode-mention frequency, node distance from a centroid, or a cross-encoder neural reranker. The `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` preset gives the highest quality at the highest cost.

### Community Detection

Graphiti uses label propagation for community clustering rather than the Leiden algorithm used by [GraphRAG](../projects/graphrag.md). The choice is explicit: label propagation supports incremental updates. When a new entity arrives, it joins the plurality community of its neighbors without rerunning the full algorithm. Leiden produces better communities but requires full recomputation — a non-starter for systems ingesting data continuously.

The acknowledged cost: incremental updates accumulate drift from the optimal partition. Periodic full refreshes are necessary but the documentation does not specify when or how to detect degradation.

Communities receive LLM-generated summaries whose names are embedded and searched via the same hybrid pipeline as individual entities.

### Graph Namespacing

The `group_id` parameter scopes all queries to isolated subgraphs within a single database instance. This enables multi-tenant deployments without separate databases per user or project.

## Key Numbers

**Benchmarks from the Zep paper (arXiv:2501.13956) — self-reported by the Zep team, not independently validated:**

**Deep Memory Retrieval (DMR), 500 multi-session conversations:**

| System | Model | Accuracy |
|--------|-------|----------|
| MemGPT | gpt-4-turbo | 93.4% |
| Zep/Graphiti | gpt-4-turbo | 94.8% |
| Full-context baseline | gpt-4o-mini | 98.0% |
| Zep/Graphiti | gpt-4o-mini | 98.2% |

The 94.8% vs 93.4% comparison is the valid one — same model. The 98.2% figure uses a stronger model and is not a fair comparison to the 93.4% MemGPT result. The paper itself criticizes DMR as inadequate: conversations are short enough that modern context windows can hold them all, and questions are simple single-hop fact retrieval.

**LongMemEval (LME), ~115k-token conversations:**

| Model | Full-context | Graphiti | Improvement |
|-------|-------------|---------|-------------|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

**Latency (consumer laptop → AWS us-west-2):**
- gpt-4o-mini: 31.3s baseline → 3.2s with Graphiti (89.8% reduction)
- Context token reduction: ~115k → ~1.6k (98.6% reduction)

**LME question-type breakdown (gpt-4o):**
- Single-session-preference: +184%
- Temporal reasoning: +38.4%
- Multi-session: +30.7%
- Knowledge-update: +6.5%
- Single-session-assistant: **−17.7%** (regression)

The temporal reasoning and multi-session gains validate the core bi-temporal and graph traversal design. The −17.7% on assistant-generated content is a real weakness discussed below.

## Strengths

**Temporal fact invalidation.** No other open-source agent memory system implements proper bi-temporal edge expiry. For any domain where facts change — user preferences, employment, project status — this is the right data model. Flat memory systems silently accumulate contradictions; Graphiti surfaces and timestamps them.

**Full provenance tracing.** Every entity and edge traces back to the specific episode that produced it. Production systems that need to audit why an agent believed something have a path to the source.

**Hybrid retrieval covering three similarity types.** The combination of cosine + BM25 + graph BFS is more robust than any single method. BFS in particular has no equivalent in vector-only memory systems.

**Production-oriented storage design.** Predefined Cypher queries, four graph backend choices (Neo4j, FalkorDB, Kuzu, Amazon Neptune), seven LLM providers, structured Pydantic output throughout — the library is built for deployment, not just research.

**Structured fact triples.** Unlike [Letta's](../projects/letta.md) unstructured text blocks or [Mem0's](../projects/mem0.md) flat fact strings, Graphiti stores `EntityNode → RELATION → EntityNode` triples. This enables queries that flat systems cannot express: "What relationships changed between January and March?" or "What is Alice connected to within 2 hops?"

## Critical Limitations

**Concrete failure mode — assistant-content retrieval.** On LongMemEval's single-session-assistant task type, Graphiti scores 17.7% *below* the full-context baseline. The entity extraction pipeline is systematically biased toward extracting facts about users and external entities; the assistant's own reasoning, recommendations, and generated content get dropped. For agents whose prior outputs matter as context — coding agents reviewing their own suggestions, planning agents building on previous plans — this is a structural gap, not an edge case.

**Unspoken infrastructure assumption.** Graphiti requires a graph database as primary storage. [Neo4j](../projects/neo4j.md) with APOC is the recommended backend, which means running a separate stateful service with its own operational overhead. [Kuzu](../projects/sqlite.md) (embedded) works for development but its column-oriented storage requires modeling edges as intermediate nodes — a non-trivial schema difference. Teams that expect to drop in a memory library alongside a [vector database](../concepts/vector-database.md) will find the graph database requirement a significant infrastructure addition.

## When NOT to Use Graphiti

**Short-lived or single-session agents.** The multi-stage LLM pipeline (4–5 calls per episode minimum) makes ingestion expensive. For agents that do not need to remember across sessions, a simpler RAG approach or even full-context prompting is cheaper and often comparable in accuracy.

**Bulk document ingestion as primary use case.** The `add_episode_bulk` method explicitly skips edge invalidation and temporal date extraction. Graphiti is optimized for streaming conversational data, not batch corpus indexing. [GraphRAG](../projects/graphrag.md) or [LlamaIndex](../projects/llamaindex.md) are better choices for static document collections.

**Domains requiring source-authority weighting.** Graphiti always prioritizes newer information when resolving contradictions. Legal documents, medical records, and regulatory filings often require the opposite — older authoritative sources may supersede newer informal inputs. There is no confidence scoring, no source-trust mechanism.

**Teams without graph database expertise.** If nobody on the team has operated a Neo4j instance, the operational surface (schema migrations, APOC configuration, index management, community drift monitoring) adds meaningful maintenance burden.

**Applications requiring multi-modal memory.** Graphiti handles text, JSON, and conversational messages. Screenshots, images, and audio are not supported.

## Unresolved Questions

**Ingestion cost at production scale.** The paper reports per-query latency reductions but not per-episode ingestion costs. A single `add_episode` call makes 4–5 LLM API calls (more when community updates run). For a system ingesting 10,000 messages per day using gpt-4o-mini, the cumulative cost and latency are unknown. The paper does not report these figures.

**Community drift threshold.** The documentation acknowledges that incremental label propagation drifts from optimal community structure over time, requiring periodic full refreshes. It does not specify: how often, how to detect when drift becomes problematic, or what a full refresh costs at scale.

**Bulk ingestion and temporal integrity.** The `add_episode_bulk` method skips edge invalidation. For migrating existing conversation histories into Graphiti, temporal consistency breaks. There is no documented migration path that preserves temporal integrity.

**Governance of the "newer wins" rule.** Every contradiction resolution prioritizes newer information. This works for personal preferences and current job titles. It fails for cases where an earlier document is authoritative. The codebase has no hooks for overriding this policy.

**Performance at large entity counts.** All benchmarks use conversations of hundreds of messages. Graphs with millions of entities — plausible for enterprise deployments — may exhibit different performance characteristics in community detection, BFS traversal, and deduplication search. No scale benchmarks exist.

## Alternatives

- **[Mem0](../projects/mem0.md)** — Use when you want lightweight fact extraction without a graph database dependency. Mem0 stores flat fact strings with vector search. Lower infrastructure cost, no temporal invalidation, simpler operational model.

- **[GraphRAG](../projects/graphrag.md)** — Use when your primary use case is batch corpus analysis rather than streaming conversational memory. GraphRAG uses the Leiden algorithm for higher-quality communities but requires full recomputation on updates — wrong for continuously arriving data.

- **[Letta](../projects/letta.md)** — Use when you want memory as an explicit part of the agent's context window that the agent itself edits. Letta's block-based memory is more transparent and inspectable; Graphiti's graph-based memory supports richer relational queries. Letta is a full agent platform; Graphiti is a memory library.

- **[HippoRAG](../projects/hipporag.md)** — Use for static document retrieval with graph-based indexing. HippoRAG draws on cognitive memory models but does not implement bi-temporal fact tracking.

- **Full-context baseline** — Use when conversations fit in the model's context window and latency is not a constraint. LongMemEval shows that for short conversations, stuffing the full context into the prompt is competitive with Graphiti on most task types (and better on assistant-content recall).

## Related Concepts

- [Knowledge Graph](../concepts/knowledge-graph.md) — The underlying data model
- [Temporal Reasoning](../concepts/temporal-reasoning.md) — The problem Graphiti's bi-temporal model addresses
- [Agent Memory](../concepts/agent-memory.md) — The broader capability Graphiti implements
- [Episodic Memory](../concepts/episodic-memory.md) — The cognitive science analog for Graphiti's episode tier
- [Semantic Memory](../concepts/semantic-memory.md) — The cognitive science analog for Graphiti's entity tier
- [Hybrid Search](../concepts/hybrid-search.md) — The retrieval approach combining cosine, BM25, and graph traversal
- [Community Detection](../concepts/community-detection.md) — The clustering mechanism for the community tier
- [Long-Term Memory](../concepts/long-term-memory.md) — The persistence requirement Graphiti addresses

## Sources

- [Zep paper (arXiv:2501.13956)](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [Graphiti repository analysis](../raw/deep/repos/getzep-graphiti.md)
- [Letta repository analysis](../raw/deep/repos/letta-ai-letta.md)
- [A-MEM paper](../raw/deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md)
