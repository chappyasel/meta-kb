---
entity_id: graphiti
type: project
bucket: agent-memory
abstract: >-
  Graphiti is the knowledge graph engine underlying Zep's agent memory: it
  ingests conversational and structured episodes, extracts typed
  entity-relationship triples with bi-temporal validity, and enables hybrid
  semantic/graph-traversal retrieval — achieving 18.5% accuracy gains and 90%
  latency reduction over full-context baselines on complex temporal tasks.
sources:
  - repos/getzep-graphiti.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - Retrieval-Augmented Generation
  - Zep
  - Letta
  - Knowledge Graph
  - Temporal Reasoning
last_compiled: '2026-04-05T20:27:59.092Z'
---
# Graphiti

**Type:** Open-source Python library (core engine for Zep)
**Repo:** `graphiti_core/` within the `getzep/graphiti` repository
**License:** Apache 2.0
**Maintained by:** Zep AI

## What It Does

Graphiti is a temporal knowledge graph engine built for agent memory. You feed it episodes (conversation turns, JSON payloads, text documents) and it extracts entities and typed relationships, deduplicates them against existing nodes, detects contradictions, and stores everything with bi-temporal timestamps. At query time, it runs hybrid retrieval combining vector similarity, BM25 full-text, and breadth-first graph traversal to surface relevant facts.

The core differentiator: edges carry four timestamps (`valid_at`, `invalid_at`, `expired_at`, `reference_time`) implementing a genuine bi-temporal model. When Alice changes jobs, the old employment edge is expired, not deleted. You can query "what did the system believe about Alice's employer in January 2023?" and get a correct answer. This is standard practice in financial systems for audit trails; it is rare in LLM memory tooling.

Graphiti is the open-source extraction and retrieval engine. [Zep](https://www.getzep.com) is the commercial managed service built on top of it.

## Architecture

The central class is `Graphiti` in `graphiti_core/graphiti.py`. It coordinates four subsystems:

**Graph driver layer** (`graphiti_core/driver/`): Abstracted via `GraphDriver` with four implementations — Neo4j, FalkorDB, Kuzu, and Amazon Neptune. Each driver has its own `operations/` directory with Cypher variants for each node and edge type.

**LLM client layer** (`graphiti_core/llm_client/`): Seven providers — OpenAI (default, `gpt-4.1-mini`), Anthropic, Azure OpenAI, Gemini, Groq, generic OpenAI-compatible, and GLiNER2 (local NER). All use Pydantic structured output. A `small_model` option (default `gpt-4.1-nano`) handles simpler prompts.

**Embedding layer** (`graphiti_core/embedder/`): OpenAI (default), Azure OpenAI, Gemini, Voyage AI.

**Search layer** (`graphiti_core/search/`): Configurable hybrid search combining cosine similarity, BM25, and BFS traversal with multiple reranking strategies. Pre-built configs like `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` provide optimized defaults.

### Formal graph structure

The graph G = (N, E, phi) has three tiers:

- **Episode subgraph (G_e)**: Raw input episodes with temporal metadata. Every derived entity and edge traces provenance back to these nodes.
- **Semantic entity subgraph (G_s)**: Extracted entities and typed relationships with 1024-dimensional embeddings.
- **Community subgraph (G_c)**: Auto-detected clusters with LLM-generated summaries. Mirrors the episodic/semantic memory distinction from cognitive science.

Node types: `EpisodicNode`, `EntityNode`, `CommunityNode`, `SagaNode`. Edge types: `EpisodicEdge` (MENTIONS), `EntityEdge` (RELATES_TO), `CommunityEdge` (HAS_MEMBER), `HasEpisodeEdge`, `NextEpisodeEdge`.

Graph namespacing uses `group_id` to isolate tenants within a single database instance.

## Core Mechanism: Episode Ingestion Pipeline

`add_episode()` in `graphiti.py` (lines 916–1163) runs a staged LLM pipeline:

**Stage 1 — Entity extraction** (`utils/maintenance/node_operations.py`): The LLM receives the current episode plus the preceding 4 messages for context. It returns `ExtractedEntity` objects with names and type classifications. The extraction prompt (`prompts/extract_nodes.py`) is unusually prescriptive about what *not* to extract: pronouns, abstract concepts, bare kinship terms, generic nouns. Entities must be specific and qualified ("Nisha's dad" not "dad").

**Stage 2 — Node deduplication** (`resolve_extracted_nodes`): Each extracted entity is embedded, then matched against existing entities using cosine similarity plus full-text search. An LLM cross-encoder makes the final deduplication decision, handling cases like "NYC" = "New York City". The prompt uses integer `candidate_id` mapping for reliable structured output.

**Stage 3 — Edge extraction** (`utils/maintenance/edge_operations.py`): The LLM extracts fact triples as `Edge` objects: `source_entity_name`, `target_entity_name`, `relation_type` (SCREAMING_SNAKE_CASE), a natural language description, and temporal bounds `valid_at`/`invalid_at`. The `reference_time` parameter lets the LLM resolve relative expressions like "last week" to absolute dates.

**Stage 4 — Edge resolution** (`resolve_extracted_edges`): New edges are compared against existing edges between the same entity pairs. The LLM identifies `duplicate_facts` (identical information) and `contradicted_facts` (superseded information). Contradicted edges get `expired_at` set to the current time. Newer information always wins — this is a hard design assumption.

**Stage 5 — Attribute extraction**: Entity summaries are updated to incorporate new information, but only for non-duplicate edges (avoiding redundant LLM calls).

**Stage 6 — Persistence**: All mutations go through predefined Cypher queries, never LLM-generated queries. This is a deliberate choice documented in the Zep paper: predefined queries ensure schema consistency and eliminate query hallucinations.

Minimum LLM calls per `add_episode`: 4–5. With community updates: add one per affected community node.

## Bi-Temporal Data Model

`EntityEdge` in `edges.py` carries:

```python
expired_at: datetime | None   # Transaction time: when this record was invalidated
valid_at: datetime | None     # Event time: when the fact became true
invalid_at: datetime | None   # Event time: when the fact stopped being true
reference_time: datetime | None
```

Two parallel timelines:
- **Timeline T**: When facts held true in the real world
- **Timeline T'**: When data entered or was invalidated in the system

This enables time-travel queries across either dimension. If Alice worked at Acme from 2020–2023 and the system learned this in 2024, the edge carries `valid_at=2020`, `invalid_at=2023`, `t'_created=2024`. If later information contradicts it, `expired_at` gets set, but the original record survives intact.

## Hybrid Search

The search layer (`search/search.py`) runs three complementary methods in parallel:

- **Cosine similarity** (phi_cos): Vector search on fact embeddings. Targets semantic similarity.
- **BM25** (phi_bm25): Native full-text search via the graph database. Targets word-level similarity.
- **BFS** (phi_bfs): Breadth-first traversal from origin nodes up to n hops. Targets contextual similarity — nodes closer in the graph appear in more similar conversational contexts.

Reranking options: Reciprocal Rank Fusion (RRF), node distance from a centroid, episode mention frequency, Maximal Marginal Relevance (MMR), and neural cross-encoder (most accurate, highest cost).

## Community Detection

`community_operations.py` implements label propagation for automatic clustering:

1. Each entity starts as its own community
2. Iteratively, each node adopts the plurality label among its neighbors (weighted by edge count)
3. Converges when no assignments change

Each community gets an LLM-generated summary via map-reduce iterative summarization over member entity summaries. Community names embed key terms, making them searchable via the same hybrid pipeline as individual entities.

Label propagation was chosen over the Leiden algorithm (used by [Microsoft GraphRAG](../projects/graphrag.md)) specifically for its incremental extension: new entities get assigned to communities without full recomputation. The acknowledged cost: incremental updates gradually diverge from optimal clustering, requiring periodic full refreshes.

## Key Numbers

From the Zep paper (arXiv:2501.13956) — self-reported, not independently validated:

**LongMemEval benchmark** (~115K token conversations):

| Model | Baseline | Zep | Improvement |
|-------|----------|-----|-------------|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

**Latency** (consumer laptop to AWS us-west-2):
- gpt-4o-mini: 31.3s → 3.20s (89.8% reduction)
- Context: 115K → ~1.6K tokens

**Per question type** (gpt-4o):
- Temporal reasoning: +38.4%
- Multi-session: +30.7%
- Single-session-assistant: **−17.7%** (regression, identified as an open research problem)

**Deep Memory Retrieval benchmark** (500 conversations, ~60 messages each):
- Zep (gpt-4-turbo): 94.8% vs MemGPT 93.4%

The authors themselves criticize DMR as too easy: conversations fit in modern context windows, and questions are single-turn fact retrieval. The LongMemEval numbers are more credible for production use cases. Both benchmarks are self-reported.

## Strengths

**Temporal fact tracking**: The bi-temporal model is the strongest demonstrated architecture for handling evolving information. It correctly handles "Alice used to work at Acme, now she works at Google" without losing the historical record.

**Structured retrieval without full-context stuffing**: 90% latency reduction by retrieving ~1.6K tokens instead of processing 115K is real and practically significant. The tradeoff is extraction quality during ingestion.

**Provenance tracing**: Every entity and edge traces back to the exact episode that produced it. In production, this matters for debugging extraction failures and auditing agent reasoning.

**Hybrid search coverage**: Combining semantic, lexical, and graph traversal retrieval covers complementary failure modes. A fact with unusual terminology that embedding search misses may still surface via BM25.

**Multi-tenant isolation**: `group_id` namespacing lets a single Neo4j instance serve multiple users or projects without cross-contamination.

## Limitations

**High LLM call volume per episode**: 4–5 minimum LLM calls per `add_episode`, with community updates adding more. At 1,000 episodes/day, ingestion costs are substantial. The Zep paper does not report per-episode cost or latency, which makes production sizing guesswork.

**Concrete failure mode — bulk ingestion**: `add_episode_bulk` explicitly skips edge invalidation and date extraction. For historical data imports, temporal consistency is not maintained. There is no warning in the output; the data simply lacks contradiction resolution.

**Infrastructure assumption — graph database**: Graphiti requires Neo4j (or FalkorDB/Kuzu/Neptune). Neo4j 5.26+ requires APOC plugins. This is a non-trivial operational dependency compared to vector-store-based memory systems like [mem0](../projects/mem0.md). Teams without existing graph database infrastructure need to provision and operate one.

**Entity extraction is model-dependent**: The extraction prompt is tuned for gpt-4o-mini class models. Switching to weaker models degrades entity resolution and contradiction detection. The structured output requirement further limits provider choice.

**Assistant-content gap**: The −17.7% regression on single-session-assistant questions reflects a systematic extraction bias toward user-stated facts over agent-generated outputs. For agentic pipelines where the agent's own prior reasoning is important context, this is a meaningful accuracy loss.

**No garbage collection**: The graph grows monotonically. Expired edges accumulate indefinitely. There is no compaction or archival mechanism.

## When Not to Use It

**Simple single-session applications**: If your agent handles isolated conversations without cross-session state, the infrastructure overhead (graph database, 4–5 LLM calls per ingestion) is not justified. A vector store with flat fact extraction (mem0) is cheaper and sufficient.

**High-throughput ingestion**: If you are ingesting thousands of messages per hour, the per-episode LLM call count becomes a bottleneck. Graphiti processes episodes sequentially with a default `SEMAPHORE_LIMIT = 10` for concurrency. The README recommends offloading `add_episode` to background tasks (FastAPI background tasks, Celery) — which means your application cannot assume the knowledge graph is up to date immediately after ingestion.

**Static corpus retrieval**: Graphiti is optimized for dynamic, evolving conversational data. For indexing a fixed document corpus for RAG, GraphRAG's batch processing approach may produce better community quality, and simpler vector stores require less operational overhead.

**Teams without graph database ops capacity**: Neo4j is a real database with real operational requirements (backup, monitoring, schema management, APOC plugin configuration). If your team has no existing graph database experience, the maintenance burden may outweigh the temporal reasoning benefits.

## Unresolved Questions

**Production ingestion cost**: The paper reports retrieval latency improvements but not ingestion cost per episode. For a system that makes 4–5 LLM calls per message in an active conversation, the cost at scale is unknown from published benchmarks.

**Community refresh scheduling**: The paper acknowledges incremental community updates diverge from optimal over time and require periodic full refreshes. It does not specify how to detect divergence, how often to refresh, or what the cost is. For long-running production graphs, this is an operational blindspot.

**Driver consistency**: The four graph backend drivers (Neo4j, FalkorDB, Kuzu, Neptune) each have their own `operations/` directory with 10+ files. Bugs fixed in one driver may not propagate to others. The paper focuses exclusively on Neo4j; parity with other drivers is undocumented.

**Contradiction resolution confidence**: Whether a new fact contradicts an existing edge is decided entirely by the LLM. There is no confidence score, no source-authority weighting, and no mechanism to flag low-confidence invalidations for human review.

## Alternatives

**[mem0](../projects/mem0.md)**: Use mem0 when you want drop-in memory with minimal infrastructure. It runs on vector stores (no graph database required), makes 2–3 LLM calls per operation, and integrates with LangGraph and CrewAI. Weaker temporal reasoning; no structured fact triples. Appropriate for single-user assistants and applications without cross-session temporal queries.

**[Letta](../projects/letta.md)**: Use Letta when you want agents to manage their own memory explicitly via tool calls. Letta stores memory as editable text blocks in the system prompt — the agent sees and controls its own state. Stronger for agent self-improvement; weaker for structured relational queries. Carries more operational weight as a full agent platform, not a memory library.

**[A-MEM](../projects/a-mem.md)**: Zettelkasten-inspired memory with LLM-driven link generation and memory evolution. Achieves 2.5× multi-hop improvement with 85% fewer tokens at retrieval time. No temporal mechanisms; no graph database requirement. Relevant when multi-hop reasoning across unstructured memories matters more than temporal tracking.

**[Microsoft GraphRAG](../projects/graphrag.md)**: Use GraphRAG for static document corpora. It produces higher-quality community structure (Leiden algorithm) but requires full recomputation when data changes. Query latency is seconds to tens of seconds; not designed for real-time conversational memory.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): Graphiti extends RAG with structured extraction and temporal validity tracking
- [Knowledge Graph](../concepts/knowledge-graph.md): Graphiti implements a property graph with typed edges and bi-temporal metadata
- [Temporal Reasoning](../concepts/temporal-reasoning.md): The bi-temporal data model is Graphiti's primary contribution to this problem

## Sources

- [Deep repo analysis: getzep-graphiti](../raw/deep/repos/getzep-graphiti.md)
- [Deep paper analysis: Zep temporal knowledge graph](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [Paper: Zep arXiv:2501.13956](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
