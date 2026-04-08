---
entity_id: graphiti
type: project
bucket: knowledge-substrate
abstract: >-
  Graphiti is a Python async library that builds temporal knowledge graphs for
  agent memory, distinguishing itself through bi-temporal edge indexing
  (valid_at/invalid_at + created/expired transaction times) and a multi-stage
  LLM extraction pipeline that incrementally resolves contradictions rather than
  overwriting them.
sources:
  - repos/getzep-graphiti.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - zep
  - retrieval-augmented-generation
  - letta
  - memgpt
  - episodic-memory
  - semantic-memory
  - letta
  - memgpt
last_compiled: '2026-04-08T02:44:41.787Z'
---
# Graphiti

**Type:** Project | **Bucket:** Knowledge Substrate
**Repository:** `graphiti_core/` | **Part of:** [Zep](../projects/zep.md)
**Related:** [Episodic Memory](../concepts/episodic-memory.md) · [Semantic Memory](../concepts/semantic-memory.md) · [Knowledge Graph](../concepts/knowledge-graph.md) · [Temporal Reasoning](../concepts/temporal-reasoning.md) · [Hybrid Search](../concepts/hybrid-search.md) · [Agent Memory](../concepts/agent-memory.md) · [Community Detection](../concepts/community-detection.md)

---

## What It Does

Graphiti converts raw conversational and structured data into a queryable knowledge graph where facts carry timestamps indicating when they were true, not just when they were recorded. An agent feeding conversation turns into Graphiti gets back a graph of typed entities (Person, Company, etc.) connected by relationships (WORKS_AT, LIVES_IN) each with four timestamps: when the fact became true, when it stopped being true, when the system first recorded it, and when the system invalidated it. Querying "where does Alice work?" returns the current employer with expired historical edges preserved for audit.

The core differentiator against flat memory stores ([Mem0](../projects/mem0.md), [Letta](../projects/letta.md)) is that Graphiti treats facts as first-class citizens with temporal scope, not strings to retrieve. Against batch graph systems like [GraphRAG](../projects/graphrag.md), Graphiti processes data incrementally — one episode at a time — enabling sub-second query latency without full corpus reprocessing.

---

## Architecture

### Three-Tier Graph Model

The formal model, described in arXiv:2501.13956, defines **G = (N, E, phi)** with three subgraphs:

**Episode Subgraph (G_e):** Raw input data stored as `EpisodicNode` objects — messages, text, JSON. Every derived entity and relationship traces provenance back to a specific episode. This non-lossy ground truth layer prevents information from disappearing when extraction fails.

**Semantic Entity Subgraph (G_s):** `EntityNode` objects with names, types, summaries, and 1024-dimensional embeddings. Connected by `EntityEdge` objects carrying typed predicates (SCREAMING_SNAKE_CASE) and bi-temporal bounds. This is where actual knowledge lives.

**Community Subgraph (G_c):** `CommunityNode` objects auto-detected via label propagation, each with an LLM-generated summary. Community names embed key terms for similarity search, making high-level topics findable without retrieving individual entities.

### Bi-Temporal Data Model

Each `EntityEdge` (defined in `graphiti_core/edges.py`) carries four temporal fields:

```python
valid_at: datetime | None      # When fact became true (event time)
invalid_at: datetime | None    # When fact stopped being true (event time)
expired_at: datetime | None    # When system invalidated this record (transaction time)
reference_time: datetime | None  # Reference for resolving relative dates
```

This dual-timeline design originates from database theory and is standard in financial audit systems. It enables queries like "what did the system believe about Alice's employer in January 2023?" — filtering on both the event timeline (what was true then) and the transaction timeline (what the system knew then). Contradicted edges receive an `expired_at` timestamp rather than deletion, preserving the full belief history.

### Graph Driver Abstraction

`graphiti_core/driver/` implements a `GraphDriver` base class with four backends: **Neo4jDriver** (default, requires APOC, Neo4j 5.26+), **FalkorDBDriver** (1.1.2+), **KuzuDriver** (0.11.2+, embedded, good for development), **NeptuneDriver** (AWS, requires OpenSearch Serverless for full-text). Each backend has its own `operations/` directory with 10+ files implementing node/edge CRUD in the appropriate Cypher dialect. Kuzu requires modeling edges as intermediate nodes due to its column-oriented storage.

### LLM and Embedding Clients

Seven LLM providers: OpenAI (default, `gpt-4.1-mini`), Anthropic, Azure OpenAI, Gemini, Groq, OpenAI-generic (custom base URL), GLiNER2 (local NER). A `small_model` option (`gpt-4.1-nano` by default) handles simpler prompts to reduce cost. All use Pydantic structured output — a hard requirement that limits provider choice but ensures reliable parsing.

Four embedding providers: OpenAI (default), Azure OpenAI, Gemini, Voyage AI.

---

## Core Mechanism: Episode Ingestion Pipeline

The `add_episode()` method in `graphiti_core/graphiti.py` (lines 916–1163) runs five sequential LLM stages per episode:

**Stage 1 — Entity Extraction** (`utils/maintenance/node_operations.py`)
The LLM receives the current message plus the four preceding messages for context. It returns `ExtractedEntity` objects with names and type labels. The extraction prompt in `prompts/extract_nodes.py` includes extensive negative examples — what NOT to extract: pronouns, generic nouns, bare kinship terms like "dad," abstract concepts. Entity names must be specific and qualified ("Nisha's dad," not "dad"). A reflection pass reviews extractions before committing, reducing hallucinated entities.

**Stage 2 — Node Deduplication** (`resolve_extracted_nodes`)
Each extracted entity is embedded and compared against existing entities via cosine similarity plus BM25 full-text search on names and summaries. An LLM cross-encoder makes the final dedup decision. The prompt handles semantic equivalence ("NYC" = "New York City") and disambiguation ("Java programming language" vs "Java island"). Merged entities receive updated names and summaries incorporating both old and new information.

**Stage 3 — Edge Extraction** (`utils/maintenance/edge_operations.py`)
The LLM extracts fact triples as `Edge` objects: source entity, target entity, relation type, natural language description, and `valid_at`/`invalid_at` bounds. The `reference_time` parameter lets the LLM resolve relative temporal expressions ("last week"). The paper formalizes these as structured triples with temporal validity windows.

**Stage 4 — Edge Resolution**
New edges are compared against existing edges between the same entity pairs only — this constraint reduces computational complexity while preventing spurious combinations. The LLM identifies `duplicate_facts` (identical information) and `contradicted_facts` (edges the new fact supersedes). Contradicted edges receive `expired_at` set to now. The system consistently prioritizes newer information.

**Stage 5 — Attribute Extraction**
Entity nodes receive updated summaries from newly established edges. Only applied to new (non-duplicate) edges to avoid redundant updates.

After all stages, nodes and edges are saved via **predefined Cypher queries** — never LLM-generated. The paper makes this explicit: predefined queries "ensure consistent schema and reduce hallucinations." This is a deliberate engineering constraint that trades query flexibility for production reliability.

### Hybrid Search

`graphiti_core/search/search.py` runs three complementary search methods in parallel, configurable via `SearchConfig`:

- **cosine_similarity** — vector similarity on fact embeddings; catches semantic equivalence
- **bm25** — native BM25 full-text via the graph database's Lucene integration; catches word-level matches
- **bfs** — breadth-first traversal from origin nodes up to n-hops; catches contextually related facts (nodes closer in the graph appear in more similar conversational contexts)

Results merge via configurable reranking: reciprocal rank fusion (RRF), Maximal Marginal Relevance (MMR), node distance from a center, episode mention frequency, or cross-encoder neural reranking. `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` is the recommended preset.

### Community Detection

Graphiti implements label propagation rather than Leiden (which [GraphRAG](../projects/graphrag.md) uses). The choice is deliberate: label propagation supports incremental extension. When a new entity arrives, it adopts the community label of the plurality of its neighbors without rerunning the full algorithm. Each community receives an LLM-generated summary via iterative map-reduce over member entity summaries. Community names contain searchable key terms, making high-level topics discoverable through the same hybrid search pipeline.

The acknowledged tradeoff: incrementally updated communities gradually diverge from what a full recomputation would produce. Periodic full refreshes are needed, but the paper does not specify when divergence becomes problematic.

### Concurrency Control

All operations use `semaphore_gather` with a configurable `SEMAPHORE_LIMIT` (default 10) to prevent 429 rate-limit errors. The library is async-first throughout — `add_episode`, `search`, and all internal operations are coroutines.

---

## Key Numbers

**GitHub stars:** ~12k (as of mid-2025) — not independently verified.

**Benchmarks** (from arXiv:2501.13956, self-reported by Zep):

**Deep Memory Retrieval (DMR)** — 500 conversations, ~60 messages each:

| System | Accuracy |
|--------|----------|
| MemGPT (gpt-4-turbo) | 93.4% |
| Zep/Graphiti (gpt-4-turbo) | 94.8% |
| Zep/Graphiti (gpt-4o-mini) | 98.2% |
| Full-conversation baseline (gpt-4o-mini) | 98.0% |

The authors themselves note DMR is inadequate: conversations fit in modern context windows, questions are single-turn fact retrieval, and the benchmark "poorly represents real-world enterprise use cases."

**LongMemEval (LME)** — ~115k token conversations:

| Model | Baseline | Zep | Improvement |
|-------|----------|-----|-------------|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

**Latency reduction:** 115k tokens → ~1.6k tokens per query. Baseline latency 31.3s → 3.2s with Zep (+gpt-4o-mini) — a 90% reduction.

**Per-question-type breakdown (gpt-4o-mini):**
- Single-session-preference: +77.7%
- Temporal-reasoning: +48.2%
- Multi-session: modest gains
- Single-session-assistant: **−17.7%** (documented regression)

These benchmarks are self-reported by the Zep team and use their own system as test subject. No independent replication is documented.

---

## Strengths

**Temporal reasoning at the data model level.** The +48.2% gain on temporal reasoning tasks validates the bi-temporal indexing design. Facts that were true at different points in time are retrievable as such, not just as the latest known state.

**Incremental ingestion with full history.** Unlike GraphRAG's batch processing, Graphiti handles one episode at a time with sub-second query latency. The expired-edge model preserves history without deletions, enabling audit trails and time-travel queries.

**Provenance tracing.** Every entity and relationship traces back to the specific episode that produced it. You can always find the source conversation turn for any fact in the graph.

**Configurable retrieval.** The three-dimensional hybrid search (semantic + lexical + graph traversal) with multiple reranking strategies covers complementary retrieval dimensions. The cross-encoder preset provides highest quality for complex queries.

**Multi-tenant support.** `group_id` namespacing isolates graph instances within a single database, enabling multi-user or multi-project deployments without separate database instances.

**Custom ontologies.** Developers define entity and edge types as Pydantic models, enforcing domain-specific schemas. Without custom types, entities use a default schema with name, summary, and type fields.

---

## Critical Limitations

**Concrete failure mode — assistant content retrieval gap:** The −17.7% regression on single-session-assistant questions reveals a systematic extraction bias. The entity extraction pipeline captures user-stated facts well but misses information generated by the assistant: recommendations, calculations, creative outputs, reasoning chains. In agentic contexts where the agent's prior outputs are important future context — plans it made, analyses it ran, decisions it justified — this is a substantial gap. A fact stated by the user ("I work at Google") gets extracted; a recommendation made by the agent ("I suggested switching to PostgreSQL because...") may not.

**Unspoken infrastructure assumption:** Graphiti requires a running graph database. The default path assumes Neo4j 5.26+ with APOC installed — not a trivial operational dependency. Neo4j's community edition license restricts commercial use; the enterprise license is expensive. FalkorDB and Kuzu reduce this burden (Kuzu is embedded), but the production-recommended Neo4j path implies meaningful infrastructure overhead that the documentation does not foreground.

---

## When NOT to Use Graphiti

**High-volume real-time ingestion with cost constraints.** Each `add_episode` call makes 4–5+ LLM API calls. At scale, this becomes expensive and slow. The README recommends running ingestion as a background task (FastAPI background tasks, Celery), not in the request path. If you need to ingest thousands of messages per minute with tight latency budgets, the per-episode LLM pipeline is the wrong architecture.

**Simple single-session or short-context applications.** If your conversations fit in a context window and you don't need cross-session entity tracking or temporal reasoning, the infrastructure cost (graph database + LLM pipeline) outweighs the benefit. [RAG](../concepts/retrieval-augmented-generation.md) with a vector store, or even Letta's in-context memory blocks, will be cheaper and simpler.

**Domains where older information is authoritative.** Graphiti consistently prioritizes newer facts when resolving contradictions. For medical records, legal documents, or audit trails where the original recorded fact may be more authoritative than a later claim, this hardcoded assumption is wrong. There is no confidence scoring or source-authority weighting in contradiction resolution.

**Static corpus retrieval.** Graphiti is optimized for conversational memory with evolving information. For indexing a fixed document corpus for question answering, batch approaches like GraphRAG or standard [RAG](../concepts/retrieval-augmented-generation.md) pipelines will produce higher-quality entity resolution (one pass over all data) and require no ongoing LLM calls for ingestion.

---

## Unresolved Questions

**Bulk ingestion and temporal consistency.** The `add_episode_bulk` method explicitly skips edge invalidation and date extraction. For importing historical data, temporal consistency is not maintained. There is no documented migration path from bulk import to full temporal accuracy.

**Cost at production scale.** The paper uses gpt-4o-mini for graph construction but does not report per-message ingestion cost, total tokens consumed per conversation, or how cost scales with graph size. With community updates enabled, each episode triggers additional LLM calls per affected community node.

**Community divergence detection.** The documentation acknowledges that incrementally updated communities gradually diverge from optimal clustering but does not specify when divergence becomes problematic, how to detect it, or the cost of a full refresh at graph sizes of 10k+ entities.

**Edge deduplication at scale.** Edge resolution searches existing edges between the same entity pairs — computationally reasonable for small graphs, but the scaling behavior for entity pairs with hundreds of edges (e.g., a frequently-discussed organization) is not analyzed.

**Entity extraction across LLM providers.** The structured output requirement limits provider choice. The quality of entity extraction and contradiction detection varies across models, but the paper only validates gpt-4o-mini for construction. Switching to open-weight models may substantially degrade extraction quality in unpredictable ways.

**No evaluation against standard RAG benchmarks.** The paper acknowledges no testing against BEIR or FinanceBench. Performance on static corpus retrieval compared to standard RAG is unknown.

---

## Alternatives

| Alternative | When to Choose It |
|-------------|-------------------|
| [Mem0](../projects/mem0.md) | You want managed agent memory with simpler infrastructure — Mem0 uses a vector store as primary with optional graph layer, requiring no graph database. Lower per-operation cost. |
| [Letta / MemGPT](../projects/letta.md) | You want the agent to manage its own memory via tool calls (core_memory_replace, rethink_memory). Better for self-modifying persona/instruction memory; worse for relational queries across many entities. |
| [GraphRAG](../projects/graphrag.md) | You have a static corpus and want highest-quality community structure. GraphRAG's Leiden algorithm produces better communities than label propagation, but requires full reprocessing when data changes. |
| [HippoRAG](../projects/hipporag.md) | You want graph-augmented retrieval without managing a graph database — HippoRAG uses a graph index over existing vector stores. |
| Standard [RAG](../concepts/retrieval-augmented-generation.md) | Your use case is single-session or static-corpus retrieval without cross-session entity tracking. Far lower complexity and cost. |

**Selection guidance:** Use Graphiti when you need (a) cross-session entity tracking, (b) temporal reasoning about when facts changed, (c) provenance from answer back to source, and (d) you can absorb the Neo4j dependency and per-episode LLM cost. Use anything else if one of those requirements is absent.

---

## Sources

- [Deep repo analysis: getzep/graphiti](../raw/deep/repos/getzep-graphiti.md)
- [Deep paper analysis: Zep temporal knowledge graph (arXiv:2501.13956)](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [Paper summary: Zep temporal knowledge graph](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)


## Related

- [Zep](../projects/zep.md) — part_of (0.7)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — alternative_to (0.6)
- [Letta](../projects/letta.md) — part_of (0.7)
- [MemGPT](../projects/memgpt.md) — part_of (0.6)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.7)
- [Semantic Memory](../concepts/semantic-memory.md) — implements (0.7)
- [Letta](../projects/letta.md) — part_of (0.7)
- [MemGPT](../projects/memgpt.md) — part_of (0.6)
