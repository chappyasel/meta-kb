---
entity_id: graphiti
type: project
bucket: knowledge-bases
abstract: >-
  Graphiti is a Python library that builds temporal knowledge graphs for agent
  memory, storing facts as entity-relationship triples with bi-temporal
  timestamps that track both when facts were true and when the system learned
  them.
sources:
  - repos/getzep-graphiti.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - zep
  - rag
  - episodic-memory
  - letta
  - hybrid-retrieval
last_compiled: '2026-04-06T02:03:39.953Z'
---
# Graphiti

**Type:** Project — Knowledge Base / Agent Memory
**Repository:** [getzep/graphiti](https://github.com/getzep/graphiti)
**Paper:** arXiv:2501.13956 (Rasmussen et al., 2025)
**Related:** [Zep](../projects/zep.md) · [Knowledge Graph](../concepts/knowledge-graph.md) · [Episodic Memory](../concepts/episodic-memory.md) · [Hybrid Retrieval](../concepts/hybrid-retrieval.md) · [Retrieval-Augmented Generation](../concepts/rag.md) · [Letta](../projects/letta.md)

---

## What It Does

Graphiti is the core engine behind [Zep](../projects/zep.md), the commercial agent memory service. It stores agent memory as a property graph where edges are first-class facts with four timestamps: when the fact became true, when it stopped being true, when the system recorded it, and when the system invalidated it. This bi-temporal model lets you ask "what did the agent believe about Alice's employer on March 1st?" — a query that flat vector stores and append-only memories cannot answer.

The library is async-first Python that talks to Neo4j, FalkorDB, Kuzu, or Amazon Neptune. Every operation runs an LLM pipeline that extracts entities, deduplicates against existing graph state, extracts relationship triples, and resolves contradictions by expiring stale edges rather than deleting them.

---

## Architecturally Unique Properties

Most "graph memory" systems add vector similarity on top of a graph database. Graphiti inverts this: the graph is the primary store, and vector similarity is one of three search methods combined at query time.

Three design choices separate it from alternatives:

**Bi-temporal edges.** The `EntityEdge` class carries `valid_at`, `invalid_at`, `expired_at`, and `reference_time` fields. When a new fact contradicts an existing edge, the old edge gets `expired_at` stamped — it stays in the graph, permanently queryable, but excluded from current-state retrieval. This originates from database bitemporal theory (standard in financial audit systems) and is genuinely rare in LLM tooling.

**Predefined Cypher, not LLM-generated queries.** All graph mutations use static Cypher templates. The paper explicitly cites this as a reliability decision: LLM-generated graph queries produce inconsistent schemas and hallucinated property names in production. Every driver (Neo4j, FalkorDB, Kuzu, Neptune) has its own `operations/` directory with 10+ pre-written query files.

**Label propagation for incremental community detection.** Graphiti clusters related entities into communities using label propagation, not the Leiden algorithm that [GraphRAG](../projects/graphrag.md) uses. The reason: label propagation extends incrementally — a new entity gets assigned to the community held by the plurality of its neighbors, no full recomputation needed. Community nodes are embedded and searchable, providing high-level thematic context alongside individual entity and edge results.

[Source](../raw/deep/repos/getzep-graphiti.md)

---

## Core Mechanism

### Data Model

Five node types form the graph:
- `EpisodicNode` — raw input (message, JSON, text), the non-lossy source of truth
- `EntityNode` — extracted entities with 1024-dim embeddings and evolving summaries
- `CommunityNode` — auto-detected clusters with LLM-generated summaries
- `SagaNode` — named episode sequences with incremental summarization

Five edge types connect them, with `EntityEdge` (RELATES_TO) as the primary semantic carrier. Every `EntityEdge` carries the bi-temporal timestamps described above plus a natural-language fact description and a `SCREAMING_SNAKE_CASE` relation type.

The `group_id` field namespaces all nodes and edges, enabling multi-tenant deployments where different users share a database without cross-contamination.

### Episode Ingestion Pipeline (`graphiti.py`, `add_episode()`)

A single call triggers five sequential LLM stages:

1. **Entity extraction** (`extract_nodes` in `utils/maintenance/node_operations.py`) — LLM receives the current message plus the previous four messages as context. Structured output via Pydantic returns `ExtractedEntity` objects. The prompt is deliberately strict: it lists extensive examples of what NOT to extract (pronouns, bare kinship terms, generic nouns). A "reflection" step has the LLM review its own extractions before finalizing.

2. **Node deduplication** (`resolve_extracted_nodes`) — New entities are embedded and compared against existing nodes via cosine similarity + BM25 full-text search. An LLM cross-encoder makes the final merge decision ("NYC" = "New York City"). Merged entities receive updated summaries that incorporate the new information.

3. **Edge extraction** (`extract_edges` in `utils/maintenance/edge_operations.py`) — LLM extracts fact triples: source entity, target entity, relation type, natural-language fact, and temporal bounds. The `reference_time` parameter lets the LLM resolve relative expressions ("last week" → absolute date).

4. **Edge resolution** (`resolve_extracted_edges`) — New edges are compared against existing edges between the same entity pairs only, reducing scope and preventing erroneous cross-entity comparisons. The LLM identifies duplicates and contradictions. Contradicted edges get `expired_at` stamped. New information wins.

5. **Attribute extraction** — Entity summaries are updated to incorporate information from new edges. Only applied to non-duplicate edges to avoid redundant calls.

All stages use `semaphore_gather` for concurrent execution, capped at `SEMAPHORE_LIMIT = 10` by default to prevent rate-limit errors from LLM providers.

### Hybrid Search (`search/search.py`)

A `SearchConfig` combines three parallel search methods:

- **Cosine similarity** (`phi_cos`) — vector search on fact embeddings. Targets semantic similarity.
- **BM25** (`phi_bm25`) — full-text search via the graph database's native Lucene index. Targets word-level similarity.
- **BFS** (`phi_bfs`) — breadth-first traversal from origin nodes. Targets contextual similarity: nodes closer in the graph appeared in similar conversational contexts.

These three methods address orthogonal retrieval dimensions. A query about a project might surface semantically related work items (cosine), lexically matching task names (BM25), and contextually adjacent team members and deadlines (BFS).

Post-retrieval reranking options: RRF, node distance, episode mention frequency, MMR (diversity), and cross-encoder neural reranking. The built-in `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` config provides a production-ready default.

[Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

---

## Key Numbers

**Benchmarks from the Zep paper (arXiv:2501.13956) — self-reported:**

**LongMemEval** (~115k token conversations, 6 question types):

| Model | Baseline | Zep | Change |
|-------|----------|-----|--------|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

Response latency dropped ~90% (31s → 3.2s) because Zep retrieves ~1.6k tokens of relevant context instead of passing 115k tokens to the model.

**By question type (gpt-4o):**

| Task | Change |
|------|--------|
| Single-session-preference | +184% |
| Temporal-reasoning | +38.4% |
| Multi-session | +30.7% |
| Knowledge-update | +6.5% |
| Single-session-assistant | **−17.7%** |

The temporal reasoning improvement (+38.4%) validates bi-temporal indexing. The single-session-assistant regression (−17.7%) is the most significant failure mode reported.

**Deep Memory Retrieval (DMR)** — 500 shorter conversations:

| System | Accuracy |
|--------|----------|
| MemGPT | 93.4% |
| Zep (gpt-4-turbo) | 94.8% |
| Zep (gpt-4o-mini) | 98.2% |

The paper's authors criticize DMR as inadequate for enterprise use: conversations fit within modern context windows, and questions are single-turn fact retrievals. The LongMemEval numbers are more meaningful.

These benchmarks are self-reported by the Zep team. No independent replication is available.

[Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

---

## Strengths

**Temporal reasoning.** The bi-temporal edge model is the strongest demonstrated approach for answering questions about how facts changed over time. No other open-source agent memory library implements this at the same depth.

**Structured fact triples.** Unlike [Letta](../projects/letta.md)'s unstructured text blocks or [Mem0](../projects/mem0.md)'s flat memory strings, Graphiti stores knowledge as typed entity-relationship-entity triples. You can query "what changed between sessions?" or "who is connected to Alice within 2 hops?" and get deterministic graph traversal answers.

**Non-lossy provenance.** Every extracted entity and edge traces back to the `EpisodicNode` that produced it. You can always answer "where did this fact come from?" — important for enterprise audit trails.

**Incremental ingestion.** The system processes episodes as they arrive, sub-second retrieval latency. [GraphRAG](../projects/graphrag.md) requires full corpus reprocessing when data changes; Graphiti does not.

**Custom ontology support.** Developers can define custom entity types as Pydantic models, enforcing domain-specific schemas (e.g., `PersonModel` with `role` field, `CompanyModel` with `industry` field) while still using the full extraction pipeline.

---

## Critical Limitations

**One concrete failure mode:** The −17.7% regression on single-session-assistant tasks is real and documented. When an agent needs to recall something it said (a recommendation, a calculation, a creative output), Graphiti's extraction pipeline underperforms full-context baselines. The entity extraction prompts are tuned for user-stated facts; assistant-generated content is systematically under-indexed. For agentic applications where the agent's own prior reasoning matters — which is most of them — this is a meaningful gap.

**One unspoken infrastructure assumption:** Graphiti assumes you are running Neo4j (or one of three alternatives) as persistent infrastructure. The library requires `await graphiti.build_indices_and_constraints()` before first use, which creates vector indices, full-text indices, and uniqueness constraints in the graph database. For Neo4j, APOC plugins are required. This is a non-trivial operational dependency. Developers expecting a drop-in memory library will encounter a graph database administration problem instead.

---

## When NOT to Use It

**High-volume real-time ingestion.** Each `add_episode()` call makes 4–5 LLM calls minimum, more with community updates enabled. The README recommends running ingestion as a background task (FastAPI background tasks, Celery), not in the request path. If you need to ingest thousands of messages per minute, the per-episode LLM cost will dominate your budget before the graph database does.

**Simple single-session assistants.** For chatbots that don't need cross-session memory or temporal reasoning, the infrastructure overhead (graph database + LLM pipeline per message) is not justified. A vector store with a conversation buffer performs adequately at lower cost and complexity.

**Teams without graph database experience.** Supporting four graph backends (Neo4j, FalkorDB, Kuzu, Neptune) means each has its own Cypher dialect and operational quirks. Kuzu requires modeling edges as intermediate nodes due to its column-oriented storage. Neptune requires OpenSearch Serverless for full-text search. Bugs fixed in Neo4j's operation files may not propagate to FalkorDB's.

**Applications requiring adversarial robustness.** The A-MEM paper's −28% regression on adversarial tasks (using a related retrieval approach) suggests enriched semantic context can amplify misleading signals. Graphiti's detailed entity summaries and community context may exhibit similar vulnerability on adversarial queries.

---

## Unresolved Questions

**Edge storage growth.** The graph grows monotonically — invalidated edges are never deleted or compacted. The paper frames this as a feature (non-lossy history), but there is no documented garbage collection strategy, no benchmark showing how retrieval quality degrades as the ratio of expired to active edges grows, and no cost model for storage at scale.

**Community refresh scheduling.** The paper acknowledges incremental label propagation "gradually diverges from full label propagation results, requiring periodic refreshes" but does not specify when divergence becomes problematic, how to detect it, or the cost of a full refresh on large graphs. Production deployments need to solve this independently.

**Contradiction resolution authority.** New information always wins. There is no confidence scoring, no source-authority weighting, and no mechanism to mark certain facts as authoritative (e.g., official records vs. conversational statements). For domains where older authoritative data should override newer unverified claims — medical records, legal documents — this hardcoded priority is wrong.

**Multi-driver parity.** The paper focuses on Neo4j. FalkorDB, Kuzu, and Neptune are community additions. Which features work across all four drivers and which are Neo4j-only is not clearly documented.

---

## Alternatives

| Use Case | Better Choice |
|----------|---------------|
| Temporal reasoning is the primary requirement | Graphiti — no alternative matches its bi-temporal implementation |
| Agent needs to read and rewrite its own memory | [Letta](../projects/letta.md) — memory blocks in the prompt that the agent edits via tool calls |
| Drop-in memory with minimal infrastructure | [Mem0](../projects/mem0.md) — vector store primary, simpler ops, no graph database required |
| Static document corpus, batch processing acceptable | [GraphRAG](../projects/graphrag.md) — higher community quality, better for one-time corpus indexing |
| Multi-hop reasoning from conversational memory | A-MEM (Zettelkasten-style) — demonstrated 2.5x multi-hop improvement with simpler infrastructure |

Use Graphiti when your agent operates across sessions, facts change over time, and you need to answer temporal queries ("what did we believe last month?") or multi-hop relational queries ("who is connected to Alice's project?"). Use something else when your team lacks graph database experience or your ingestion volume makes per-episode LLM costs prohibitive.
