---
entity_id: zep
type: project
bucket: agent-memory
abstract: >-
  Zep is a managed agent memory platform built on Graphiti, an open-source
  temporal knowledge graph engine that tracks how facts change over time using
  bi-temporal indexing — achieving 18.5% accuracy gains and 90% latency
  reduction over full-context baselines on multi-session reasoning tasks.
sources:
  - repos/getzep-graphiti.md
  - repos/memorilabs-memori.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - Graphiti
last_compiled: '2026-04-05T20:27:53.445Z'
---
# Zep

## What It Is

Zep is a memory layer for AI agents with two distinct components: **Zep** (the managed cloud platform) and **Graphiti** (the open-source engine underneath it). Graphiti is available standalone under Apache-2.0 (24,473 GitHub stars). Zep adds managed infrastructure, sub-200ms retrieval SLAs, a developer dashboard, and enterprise support on top.

The core problem Zep solves: standard RAG retrieves static document snapshots. Agents operating across multiple sessions accumulate contradictory information — a user changes jobs, moves, updates preferences. Zep tracks those changes with explicit validity windows rather than silently overwriting or confusingly preserving stale facts alongside new ones.

## Architecture

Graphiti organizes knowledge into a three-tier hierarchical graph G = (N, E, phi):

**Tier 1 — Episode Subgraph (G_e):** Raw input storage. Every message, JSON document, or text fragment lands here as a non-lossy `EpisodicNode`. All derived entities and relationships trace provenance back to specific episodes, enabling source citation.

**Tier 2 — Semantic Entity Subgraph (G_s):** Extracted entities (`EntityNode`) with typed relationships (`EntityEdge`) between them. This is where the knowledge graph's semantic content lives. Entities carry 1024-dimensional embeddings and summaries that evolve as new information arrives.

**Tier 3 — Community Subgraph (G_t):** Clusters of strongly connected entities with LLM-generated summaries. Communities are named with key terms and embedded for similarity search, providing a high-level view of the semantic landscape.

The central class `Graphiti` in `graphiti_core/graphiti.py` orchestrates four subsystems: a graph driver layer (Neo4j, FalkorDB, Kuzu, Neptune), an LLM client layer (7 providers), an embedding layer (4 providers), and a configurable hybrid search layer.

## Core Mechanism: The Episode Ingestion Pipeline

`add_episode()` runs each new message through a multi-stage LLM pipeline:

1. **Entity Extraction** (`node_operations.py`): The LLM receives the current message plus the 4 preceding messages for context and returns structured `ExtractedEntity` objects. The extraction prompt includes extensive negative examples — it explicitly instructs the LLM not to extract pronouns, bare kinship terms ("dad"), or abstract concepts. Entity names must be specific and qualified ("Nisha's dad" rather than "dad").

2. **Node Deduplication**: Each extracted entity gets embedded and compared against existing nodes via hybrid matching: cosine similarity + BM25 fulltext. An LLM cross-encoder makes the final dedup decision, handling semantic equivalence ("NYC" = "New York City") and disambiguation ("Java language" vs "Java island").

3. **Edge Extraction** (`edge_operations.py`): The LLM extracts fact triples as `EntityEdge` objects carrying source entity, target entity, relation type (SCREAMING_SNAKE_CASE), a natural language fact description, and temporal bounds (`valid_at`, `invalid_at`). The `reference_time` parameter resolves relative temporal expressions like "last week."

4. **Edge Resolution**: New edges are compared against existing edges between the same entity pairs. The LLM produces `EdgeDuplicate` objects identifying duplicate facts and contradictions. Contradicted edges receive their `expired_at` timestamp set to the current time — they are not deleted. Newer facts consistently supersede older ones.

5. **Attribute Extraction**: Entity summaries update to incorporate information from new edges.

6. **Graph Persistence**: All mutations use predefined Cypher queries, never LLM-generated ones. The paper explicitly notes this design choice: "ensures consistent schema and reduces hallucinations."

## Bi-Temporal Data Model

The `EntityEdge` class implements a genuine bi-temporal model with four timestamps:

```python
class EntityEdge(Edge):
    expired_at: datetime | None   # When the record was invalidated (transaction time T')
    valid_at: datetime | None     # When the fact became true (event time T)
    invalid_at: datetime | None   # When the fact stopped being true (event time T)
    reference_time: datetime | None
```

Two parallel timelines:
- **Timeline T (event time):** When facts held true in reality
- **Timeline T' (transaction time):** When facts entered or left the system

This enables time-travel queries: "What did the system believe about Alice's employer in January 2023?" — answerable by filtering on both the event timeline and the transaction timeline. This design originates from database theory and is standard in financial audit systems. It is genuinely rare in LLM applications.

## Hybrid Search

The search layer (`search/search.py`) combines three complementary retrieval methods targeting different similarity types:

- **Cosine similarity** (phi_cos): Semantic search on 1024-dim fact embeddings via vector indices
- **BM25** (phi_bm25): Fulltext search on fact fields, entity names, and community names for word-level matching
- **BFS** (phi_bfs): Breadth-first graph traversal from specified origin nodes up to n-hops — captures contextual similarity, since nodes closer in the graph appear in more similar conversational contexts

Reranking strategies include Reciprocal Rank Fusion (RRF), Maximal Marginal Relevance (MMR), episode-mention frequency, graph distance from a center node, and neural cross-encoder reranking (highest quality, highest cost). Pre-built config recipes like `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` provide optimized defaults.

## Community Detection

Graphiti uses label propagation instead of the Leiden algorithm (used by Microsoft GraphRAG) specifically for its incremental extension. When a new entity arrives, it adopts the community held by the plurality of its neighbors — no full-graph recomputation. Each community gets an LLM-generated summary after clustering. The paper acknowledges: "incrementally updated communities gradually diverge from full label propagation results, requiring periodic refreshes."

## Benchmarks

From the Zep paper (arXiv:2501.13956) — self-reported, not independently validated:

**Deep Memory Retrieval (DMR):**
| System | Accuracy |
|--------|----------|
| MemGPT (prior state-of-art) | 93.4% |
| Zep (gpt-4-turbo) | 94.8% |
| Zep (gpt-4o-mini) | 98.2% |

The authors themselves criticize DMR as inadequate: conversations fit in modern context windows and questions test only single-turn fact retrieval.

**LongMemEval (LME) — 115K-token conversations:**
| Model | Baseline | Zep | Improvement |
|-------|----------|-----|-------------|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

**Latency:** ~3.2s (Zep + gpt-4o-mini) vs ~31.3s (full-context baseline) — a 90% reduction by retrieving ~1.6K relevant tokens instead of processing 115K. The temporal reasoning question type showed +48.2% improvement, directly validating the bi-temporal model. The single-session-assistant question type showed -17.7%, a notable regression.

## Strengths

**Temporal reasoning at depth.** The +48.2% improvement on temporal reasoning tasks is the strongest result for any agent memory system in this category. If your agent needs to answer "When did X change?" or "What was true about Y in March?", the bi-temporal model handles this directly.

**Non-lossy provenance.** Every entity and edge traces back to the specific episode that created it. Production debugging becomes tractable — you can answer "Why does the agent believe this?" by following edges back to source messages.

**Multi-session cross-synthesis.** The knowledge graph structure enables queries that flat memory systems cannot express: entity traversal across sessions, relationship chains, community-level summaries. The +30.7% improvement on multi-session questions validates this.

**Latency at retrieval.** Retrieving 1.6K tokens instead of 115K context reduces both cost and latency by ~90% at inference time — critical for real-time agent deployments.

## Critical Limitations

**Assistant-content retrieval gap.** The -17.7% regression on single-session-assistant questions reveals a systematic extraction bias. The pipeline extracts facts stated by users more reliably than facts in assistant outputs. For agentic use cases where the agent's own prior reasoning, recommendations, or calculations matter, this is a concrete failure mode with no documented workaround.

**Unspoken infrastructure assumption.** Graphiti assumes you run a graph database (Neo4j 5.26+, FalkorDB, Kuzu, or Amazon Neptune). Neo4j at production scale requires APOC plugins, careful memory configuration, and operational expertise that most application teams do not have. The quickstart uses Docker, which hides this complexity — but a production Neo4j cluster supporting graph traversal at scale is not trivial to operate.

## When NOT to Use It

**High-frequency ingestion at scale.** Each `add_episode()` call makes 4-5+ LLM calls minimum (extract nodes, dedupe nodes, extract edges, resolve edges, update attributes). At thousands of messages per minute, this creates significant latency and LLM cost. The README recommends running ingestion as a background task, not in the request path — but this means memory may lag behind actual conversation.

**Static document retrieval.** If your use case is traditional RAG over a fixed document corpus, Graphiti's temporal machinery adds overhead with no benefit. Standard vector search with BM25 is cheaper, simpler, and comparably accurate.

**Domains requiring authority-weighted contradiction resolution.** Graphiti always prioritizes newer facts over older ones. Medical records, legal documents, and regulatory filings often invert this — an older authoritative record may supersede a recent informal update. There is no confidence scoring or source-authority weighting.

**Bulk historical imports where temporal consistency matters.** The `add_episode_bulk` method skips edge invalidation and temporal date extraction for speed. Large historical imports processed in bulk will not have correct temporal consistency.

## Unresolved Questions

**Ingestion cost at scale.** The paper reports 90% latency reduction at retrieval time but does not report per-message ingestion cost or total system cost including ingestion-time LLM calls. For high-volume enterprise deployments, the ingestion-side economics are unclear.

**Community refresh cadence.** The paper acknowledges incremental label propagation diverges over time and "requires periodic refreshes" — but specifies no threshold for when divergence becomes problematic, no recommended refresh frequency, and no cost estimate for full recomputation.

**Entity extraction across LLM providers.** Extraction quality is model-dependent. The paper uses gpt-4o-mini. Switching to weaker models or models without structured output support may substantially degrade entity resolution and contradiction detection. No cross-provider extraction quality data is published.

**Governance for multi-tenant Graphiti deployments.** Graphiti uses `group_id` for namespace isolation within a single database instance. For enterprise deployments with thousands of users, the security isolation guarantees of `group_id` scoping versus separate database instances are not documented.

## Alternatives

**[mem0](../projects/mem0.md):** Two LLM calls per ingestion (cheaper), flat memory structure with optional graph layer. Use mem0 when ingestion volume is high, temporal reasoning is not a priority, and you want simpler infrastructure (no graph database required).

**[Letta/MemGPT](../projects/letta.md):** In-context memory with explicit core/archival storage. Use when you need the agent itself to control what gets stored and retrieved, rather than an automatic extraction pipeline.

**[A-MEM](../concepts/a-mem.md):** Zettelkasten-style autonomous memory organization. Use when multi-hop reasoning across memories is the primary requirement and you want schema-free link generation rather than predefined relationship types.

**GraphRAG (Microsoft):** Batch-oriented community summarization over static corpora. Use when your data changes infrequently and you need high-quality community summaries over a fixed document set — not for dynamic agent memory.

## Integration

Graph databases (4): Neo4j 5.26+ (default, requires APOC), FalkorDB 1.1.2+, Kuzu 0.11.2+ (embedded, good for development), Amazon Neptune with OpenSearch Serverless.

LLM providers (7): OpenAI (default, `gpt-4.1-mini`), Anthropic, Azure OpenAI, Gemini, Groq, OpenAI-generic (custom base URL), GLiNER2 (local NER). Structured output support required — not all providers work reliably.

Deployment options: Docker Compose, MCP server (`mcp_server/`) for Claude and Cursor integration, FastAPI REST server (`server/`), LangGraph integration for agentic workflows.

**Sources:** [Graphiti Repo](../raw/repos/getzep-graphiti.md), [Zep Paper](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md), [Graphiti Deep Analysis](../raw/deep/repos/getzep-graphiti.md)


## Related

- [Graphiti](../projects/graphiti.md) — part_of (0.7)
